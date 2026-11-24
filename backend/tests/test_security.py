import asyncio
import base64
import datetime as dt
import json
import time

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.x509.oid import NameOID

from backend.core.security import CertsUnavailable, FirebaseTokenVerifier, TokenError, _parse_max_age

from .conftest import user_msg

PROJECT = "v-code-edu"


def _make_key_and_cert():
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    name = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, "securetoken.test")])
    now = dt.datetime.now(dt.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(name).issuer_name(name).public_key(key.public_key())
            .serial_number(x509.random_serial_number()).not_valid_before(now - dt.timedelta(days=1))
            .not_valid_after(now + dt.timedelta(days=1)).sign(key, hashes.SHA256()))
    return key, cert.public_bytes(serialization.Encoding.PEM).decode()


KEY, CERT_PEM = _make_key_and_cert()
OTHER_KEY, _ = _make_key_and_cert()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def make_token(key=KEY, kid="kid-1", alg="RS256", **claim_overrides) -> str:
    now = int(time.time())
    claims = {"aud": PROJECT, "iss": f"https://securetoken.google.com/{PROJECT}", "sub": "uid-123",
              "iat": now - 10, "exp": now + 3600, "auth_time": now - 20, "email": "hs@example.com"}
    claims.update(claim_overrides)
    claims = {k: v for k, v in claims.items() if v is not None}
    header = {"alg": alg, "kid": kid, "typ": "JWT"}
    signing_input = f"{_b64(json.dumps(header).encode())}.{_b64(json.dumps(claims).encode())}"
    sig = key.sign(signing_input.encode(), padding.PKCS1v15(), hashes.SHA256())
    return f"{signing_input}.{_b64(sig)}"


def make_verifier(certs=None, fail=False):
    calls = {"n": 0}

    async def fetch():
        calls["n"] += 1
        if fail:
            raise OSError("network down")
        return (certs if certs is not None else {"kid-1": CERT_PEM}), 3600

    return FirebaseTokenVerifier(PROJECT, fetch_certs=fetch), calls


def run(coro):
    return asyncio.run(coro)


def test_valid_token():
    verifier, _ = make_verifier()
    claims = run(verifier.verify(make_token()))
    assert claims["sub"] == "uid-123" and claims["email"] == "hs@example.com"


@pytest.mark.parametrize("token_kwargs, expected_code", [
    ({"exp": int(time.time()) - 3600, "iat": int(time.time()) - 7200, "auth_time": int(time.time()) - 7200}, "token_expired"),
    ({"aud": "other-project"}, "invalid_token"),
    ({"iss": "https://securetoken.google.com/other-project"}, "invalid_token"),
    ({"iat": int(time.time()) + 3600}, "invalid_token"),
    ({"auth_time": None}, "invalid_token"),
    ({"sub": ""}, "invalid_token"),
])
def test_invalid_claims(token_kwargs, expected_code):
    verifier, _ = make_verifier()
    with pytest.raises(TokenError) as exc:
        run(verifier.verify(make_token(**token_kwargs)))
    assert exc.value.code == expected_code


def test_bad_signature():
    verifier, _ = make_verifier()
    with pytest.raises(TokenError, match="Chữ ký"):
        run(verifier.verify(make_token(key=OTHER_KEY)))


def test_unknown_kid_triggers_refresh_then_fails():
    verifier, calls = make_verifier()
    with pytest.raises(TokenError, match="kid"):
        run(verifier.verify(make_token(kid="rotated-away")))
    assert calls["n"] == 2  # tải lần đầu + làm mới bắt buộc khi gặp kid lạ


def test_wrong_alg_and_malformed():
    verifier, _ = make_verifier()
    with pytest.raises(TokenError):
        run(verifier.verify(make_token(alg="HS256")))
    for bad in ["", "abc", "a.b", "a.b.c", "!!.??.##"]:
        with pytest.raises(TokenError):
            run(verifier.verify(bad))


def test_certs_are_cached():
    verifier, calls = make_verifier()
    run(verifier.verify(make_token()))
    run(verifier.verify(make_token()))
    assert calls["n"] == 1


def test_certs_unavailable_raises():
    verifier, _ = make_verifier(fail=True)
    with pytest.raises(CertsUnavailable):
        run(verifier.verify(make_token()))


def test_parse_max_age():
    assert _parse_max_age("public, max-age=19302, must-revalidate") == 19302
    assert _parse_max_age(None) == 3600


# ---- Mức endpoint ----

def test_authenticated_user_gets_user_quota(build_client):
    verifier, _ = make_verifier()
    client = build_client(token_verifier=verifier, ai_daily_limit_user=5, ai_daily_limit_guest=1)
    headers = {"Authorization": f"Bearer {make_token()}"}
    usage = client.get("/api/ai/usage", headers=headers).json()
    assert usage["subject"] == "user" and usage["limit"] == 5
    for _ in range(2):
        assert client.post("/api/ai/chat", json=user_msg(), headers=headers).status_code == 200
    assert client.get("/api/ai/usage", headers=headers).json()["used"] == 2
    # khách cùng IP vẫn có hạn mức riêng
    assert client.get("/api/ai/usage").json()["used"] == 0


def test_invalid_token_is_401_json(build_client):
    verifier, _ = make_verifier()
    client = build_client(token_verifier=verifier)
    r = client.post("/api/ai/chat", json=user_msg(), headers={"Authorization": f"Bearer {make_token(key=OTHER_KEY)}"})
    assert r.status_code == 401
    assert r.json()["detail"]["code"] == "invalid_token"
    expired = make_token(exp=int(time.time()) - 600, iat=int(time.time()) - 4000, auth_time=int(time.time()) - 4000)
    r = client.get("/api/ai/usage", headers={"Authorization": f"Bearer {expired}"})
    assert r.status_code == 401 and r.json()["detail"]["code"] == "token_expired"
    r = client.get("/api/ai/usage", headers={"Authorization": "Basic abc"})
    assert r.status_code == 401


def test_offline_server_treats_token_as_guest(build_client):
    verifier, _ = make_verifier(fail=True)
    client = build_client(token_verifier=verifier)
    r = client.get("/api/ai/usage", headers={"Authorization": f"Bearer {make_token()}"})
    assert r.status_code == 200 and r.json()["subject"] == "guest"
