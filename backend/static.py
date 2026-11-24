"""Phục vụ frontend tĩnh theo DANH SÁCH TRẮNG.

Chỉ các đường dẫn sau được phục vụ: "/", "/index.html", "/manifest.json", "/sw.js"
và các thư mục css/, js/, data/, assets/, vendor/, docs/. Mọi thứ khác (vcode_edu.db, .env,
backend/, archive/, .venv/, .git/, tools/, tests/...) đều trả về 404.
"""
from __future__ import annotations

import mimetypes
import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import FileResponse, JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.staticfiles import StaticFiles

STATIC_DIRS = ("css", "js", "data", "assets", "vendor", "docs")

# Windows có thể đọc MIME sai từ registry (ví dụ .js → text/plain) làm hỏng ES modules.
_MIME_OVERRIDES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".webmanifest": "application/manifest+json",
    ".wasm": "application/wasm",
    ".svg": "image/svg+xml",
    ".md": "text/markdown",
    ".woff2": "font/woff2",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".html": "text/html",
}


def register_mime_types() -> None:
    for ext, mime in _MIME_OVERRIDES.items():
        mimetypes.add_type(mime, ext)


class SafeStaticFiles(StaticFiles):
    """StaticFiles từ chối mọi đoạn đường dẫn bắt đầu bằng dấu chấm (tệp/thư mục ẩn).

    Thư mục chưa tồn tại → 404 (và kiểm tra lại ở yêu cầu sau) thay vì lỗi 500.
    """

    async def check_config(self) -> None:
        if self.directory is not None and not os.path.isdir(self.directory):
            raise StarletteHTTPException(status_code=404)
        await super().check_config()

    async def get_response(self, path: str, scope):  # noqa: ANN001
        parts = [p for p in path.replace("\\", "/").split("/") if p]
        if any(p.startswith(".") for p in parts):
            raise StarletteHTTPException(status_code=404)
        return await super().get_response(path, scope)


def _not_found() -> JSONResponse:
    return JSONResponse(status_code=404, content={"detail": "Not Found"})


def mount_frontend(app: FastAPI, root: Path) -> None:
    register_mime_types()
    root = root.resolve()

    def _file(name: str, media_type: str, extra_headers: dict | None = None):
        path = root / name
        if not path.is_file():
            return _not_found()
        headers = {"Cache-Control": "no-cache"}
        headers.update(extra_headers or {})
        return FileResponse(path, media_type=media_type, headers=headers)

    @app.get("/", include_in_schema=False)
    async def index_root():
        return _file("index.html", "text/html; charset=utf-8")

    @app.get("/index.html", include_in_schema=False)
    async def index_html():
        return _file("index.html", "text/html; charset=utf-8")

    @app.get("/manifest.json", include_in_schema=False)
    async def manifest():
        return _file("manifest.json", "application/manifest+json")

    @app.get("/sw.js", include_in_schema=False)
    async def service_worker():
        return _file("sw.js", "text/javascript; charset=utf-8", {"Service-Worker-Allowed": "/"})

    for directory in STATIC_DIRS:
        app.mount(f"/{directory}", SafeStaticFiles(directory=root / directory, check_dir=False), name=f"static-{directory}")
