"""Middleware ASGI thuần thêm header bảo mật (không dùng BaseHTTPMiddleware để không ảnh hưởng luồng SSE).

Lưu ý: KHÔNG đặt COOP/COEP vì sẽ làm hỏng đăng nhập Google bằng popup của Firebase.
"""
from __future__ import annotations

SECURITY_HEADERS = [
    (b"x-content-type-options", b"nosniff"),
    (b"referrer-policy", b"strict-origin-when-cross-origin"),
    (b"x-frame-options", b"SAMEORIGIN"),
    (b"permissions-policy", b"camera=(), geolocation=(), payment=(), usb=()"),
]


class SecurityHeadersMiddleware:
    def __init__(self, app):  # noqa: ANN001
        self.app = app

    async def __call__(self, scope, receive, send):  # noqa: ANN001
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):  # noqa: ANN001
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                existing = {name.lower() for name, _ in headers}
                for name, value in SECURITY_HEADERS:
                    if name not in existing:
                        headers.append((name, value))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)
