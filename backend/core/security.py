"""Xác minh Firebase ID token (RS256) không cần firebase-admin.

Quy trình chuẩn của Firebase:
  - header.alg == RS256, header.kid trùng một khóa công khai của Google (securetoken)
  - chữ ký RSA PKCS#1 v1.5 + SHA-256 hợp lệ
  - aud == <project id>, iss == https://securetoken.google.com/<project id>
  - exp > now, iat <= now, auth_time <= now (cho phép lệch đồng hồ 60 giây)
  - sub (uid) là chuỗi không rỗng, tối đa 128 ký tự
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import re
import time
from dataclasses import dataclass
from typing import Awaitable, Callable

import httpx
from cryptography import x509
from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from fastapi import Request

from backend.core.errors import ApiError

log = logging.getLogger("vcode.security")

GOOGLE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
CLOCK_SKEW_SECONDS = 60
DEFAULT_CERT_MAX_AGE = 3600

CertFetcher = Callable[[], Awaitable[tuple[dict[str, str], int]]]


class TokenError(Exception):
    """Token không hợp lệ (chữ ký, hạn dùng, aud, iss...)."""

    def __init__(self, message: str, code: str = "invalid_token"):
        super().__init__(message)
        self.code = code


class CertsUnavailable(Exception):
    """Không tải được khóa công khai của Google (ví dụ: máy chủ đang offline)."""


def _b64url_decode(segment: str) -> bytes:
    padding_len = (-len(segment)) % 4
    return base64.urlsafe_b64decode(segment + ("=" * padding_len))


def _parse_max_age(cache_control: str | None) -> int:
    if not cache_control:
        return DEFAULT_CERT_MAX_AGE
    match = re.search(r"max-age=(\d+)", cache_control)
    return int(match.group(1)) if match else DEFAULT_CERT_MAX_AGE


async def fetch_google_certs() -> tuple[dict[str, str], int]:
    async with httpx.AsyncClient(timeout=httpx.Timeout(5.0)) as client:
        resp = await client.get(GOOGLE_CERTS_URL)
        resp.raise_for_status()
        return resp.json(), _parse_max_age(resp.headers.get("cache-control"))


class FirebaseTokenVerifier:
    def __init__(self, project_id: str, fetch_certs: CertFetcher | None = None, clock: Callable[[], float] = time.time):
        self.project_id = project_id
        self._fetch = fetch_certs or fetch_google_certs
        self._clock = clock
        self._keys: dict[str, rsa.RSAPublicKey] = {}
        self._expires_at = 0.0
        self._lock = asyncio.Lock()

    async def _load_keys(self, force: bool = False) -> dict[str, rsa.RSAPublicKey]:
        async with self._lock:
            now = self._clock()
            if self._keys and not force and now < self._expires_at:
                return self._keys
            try:
                certs, max_age = await self._fetch()
            except Exception as exc:  # mạng lỗi, DNS, timeout...
                if self._keys:
                    log.warning("Không làm mới được khóa Firebase, dùng bản đệm cũ: %s", exc)
                    return self._keys
                raise CertsUnavailable(str(exc)) from exc
            keys: dict[str, rsa.RSAPublicKey] = {}
            for kid, pem in (certs or {}).items():
                try:
                    public_key = x509.load_pem_x509_certificate(pem.encode("utf-8")).public_key()
                except ValueError:
                    continue
                if isinstance(public_key, rsa.RSAPublicKey):
                    keys[kid] = public_key
            self._keys = keys
            self._expires_at = now + max(60, int(max_age))
            return self._keys

    async def verify(self, token: str) -> dict:
        if not token or token.count(".") != 2:
            raise TokenError("Token không đúng định dạng.")
        header_b64, payload_b64, sig_b64 = token.split(".")
        try:
            header = json.loads(_b64url_decode(header_b64))
            claims = json.loads(_b64url_decode(payload_b64))
            signature = _b64url_decode(sig_b64)
        except (ValueError, json.JSONDecodeError) as exc:
            raise TokenError("Token không giải mã được.") from exc
        if not isinstance(header, dict) or not isinstance(claims, dict):
            raise TokenError("Token không giải mã được.")
        if header.get("alg") != "RS256":
            raise TokenError("Thuật toán ký không được chấp nhận.")
        kid = header.get("kid")
        if not kid or not isinstance(kid, str):
            raise TokenError("Token thiếu kid.")

        keys = await self._load_keys()
        key = keys.get(kid)
        if key is None:
            keys = await self._load_keys(force=True)  # Google xoay khóa
            key = keys.get(kid)
        if key is None:
            raise TokenError("Khóa ký của token không xác định (kid).")

        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        try:
            key.verify(signature, signing_input, padding.PKCS1v15(), hashes.SHA256())
        except InvalidSignature as exc:
            raise TokenError("Chữ ký token không hợp lệ.") from exc

        now = self._clock()
        expected_iss = f"https://securetoken.google.com/{self.project_id}"
        if claims.get("aud") != self.project_id:
            raise TokenError("Token không dành cho dự án này (aud).")
        if claims.get("iss") != expected_iss:
            raise TokenError("Nguồn phát hành token không hợp lệ (iss).")
        exp = claims.get("exp")
        iat = claims.get("iat")
        auth_time = claims.get("auth_time")
        if not isinstance(exp, (int, float)) or exp + CLOCK_SKEW_SECONDS <= now:
            raise TokenError("Phiên đăng nhập đã hết hạn, vui lòng làm mới token.", code="token_expired")
        if not isinstance(iat, (int, float)) or iat - CLOCK_SKEW_SECONDS > now:
            raise TokenError("Thời điểm phát hành token không hợp lệ (iat).")
        if not isinstance(auth_time, (int, float)) or auth_time - CLOCK_SKEW_SECONDS > now:
            raise TokenError("Thời điểm xác thực không hợp lệ (auth_time).")
        sub = claims.get("sub")
        if not isinstance(sub, str) or not sub or len(sub) > 128:
            raise TokenError("Token thiếu mã người dùng (sub).")
        return claims


@dataclass(frozen=True)
class Principal:
    kind: str  # "user" | "guest"
    ip: str
    uid: str | None = None
    email: str | None = None
    verified: bool = True  # False nếu có token nhưng không xác minh được do mất mạng

    @property
    def subject(self) -> str:
        return f"user:{self.uid}" if self.kind == "user" and self.uid else f"ip:{self.ip}"


def client_ip(request: Request, trust_proxy: bool) -> str:
    if trust_proxy:
        forwarded = request.headers.get("x-forwarded-for", "")
        first = forwarded.split(",")[0].strip()
        if first:
            return first[:64]
        real_ip = request.headers.get("x-real-ip", "").strip()
        if real_ip:
            return real_ip[:64]
    return (request.client.host if request.client else "unknown")[:64]


async def get_principal(request: Request) -> Principal:
    """Phụ thuộc xác thực tùy chọn: không có token → khách; token sai → 401."""
    settings = request.app.state.settings
    ip = client_ip(request, settings.trust_proxy)
    auth = request.headers.get("authorization")
    if not auth:
        return Principal(kind="guest", ip=ip)
    scheme, _, token = auth.partition(" ")
    if scheme.lower() != "bearer" or not token.strip():
        raise ApiError(401, "invalid_token", "Header Authorization phải có dạng 'Bearer <Firebase ID token>'.")
    verifier: FirebaseTokenVerifier = request.app.state.token_verifier
    try:
        claims = await verifier.verify(token.strip())
    except TokenError as exc:
        raise ApiError(401, exc.code, str(exc)) from exc
    except CertsUnavailable:
        # Máy chủ không truy cập được Google (ví dụ: mạng LAN offline) → coi như khách, không nâng quyền.
        log.warning("Không tải được khóa Firebase; xử lý yêu cầu như khách.")
        return Principal(kind="guest", ip=ip, verified=False)
    return Principal(kind="user", ip=ip, uid=claims["sub"], email=claims.get("email"))
