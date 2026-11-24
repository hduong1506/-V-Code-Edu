"""Lỗi API thống nhất: mọi lỗi trả về dạng {"detail": {"code": "...", "message": "..."}}."""
from __future__ import annotations

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

log = logging.getLogger("vcode.errors")


class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str, *, headers: dict | None = None, **extra):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = headers or {}
        self.extra = extra

    def to_response(self) -> JSONResponse:
        detail = {"code": self.code, "message": self.message, **self.extra}
        return JSONResponse(status_code=self.status_code, content={"detail": detail}, headers=self.headers)


def _simplify_validation_errors(exc: RequestValidationError) -> list[dict]:
    out = []
    for err in exc.errors()[:20]:
        loc = ".".join(str(p) for p in err.get("loc", ()) if p != "body")
        out.append({"field": loc or "body", "message": str(err.get("msg", ""))[:300], "type": err.get("type", "")})
    return out


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def _api_error(_: Request, exc: ApiError):  # noqa: ANN202
        return exc.to_response()

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):  # noqa: ANN202
        errors = _simplify_validation_errors(exc)
        first = errors[0]["message"] if errors else ""
        return JSONResponse(
            status_code=422,
            content={"detail": {
                "code": "bad_request",
                "message": f"Dữ liệu gửi lên không hợp lệ. {first}".strip(),
                "errors": errors,
            }},
        )

    @app.exception_handler(Exception)
    async def _unhandled(_: Request, exc: Exception):  # noqa: ANN202
        log.exception("Unhandled error: %s", exc)
        return JSONResponse(
            status_code=500,
            content={"detail": {"code": "internal_error", "message": "Máy chủ gặp lỗi không mong muốn. Vui lòng thử lại sau."}},
        )
