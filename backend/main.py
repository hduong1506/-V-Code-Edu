"""
V-Code Edu — Backend FastAPI: cổng AI an toàn + phục vụ frontend tĩnh.

Chạy (từ thư mục gốc dự án):
    uvicorn backend.main:app --reload --port 8000
Sau đó mở http://localhost:8000
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.ai.registry import ProviderRegistry
from backend.ai.service import AIService
from backend.core.config import Settings, get_settings
from backend.core.errors import install_error_handlers
from backend.core.logging import configure_logging
from backend.core.middleware import SecurityHeadersMiddleware
from backend.core.ratelimit import DailyQuota, MinuteRateLimiter
from backend.core.security import FirebaseTokenVerifier
from backend.database.connection import Database
from backend.database.migrations import run_migrations
from backend.routers import ai as ai_router
from backend.routers import health as health_router
from backend.static import mount_frontend


def create_app(
    settings: Settings | None = None,
    *,
    registry: ProviderRegistry | None = None,
    token_verifier: FirebaseTokenVerifier | None = None,
) -> FastAPI:
    settings = settings or get_settings()
    configure_logging(settings.log_level)

    database = Database(settings.database_url)
    registry = registry or ProviderRegistry.from_settings(settings)
    verifier = token_verifier or FirebaseTokenVerifier(settings.firebase_project_id)
    limiter = MinuteRateLimiter(settings.ai_rate_per_minute)
    quota = DailyQuota(database)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        run_migrations(database.engine)
        yield
        await registry.aclose()
        database.dispose()

    app = FastAPI(
        title="V-Code Edu API",
        description="Cổng AI giáo dục (V-Mentor) và máy chủ frontend của nền tảng V-Code Edu.",
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
    app.state.settings = settings
    app.state.database = database
    app.state.registry = registry
    app.state.token_verifier = verifier
    app.state.rate_limiter = limiter
    app.state.daily_quota = quota
    app.state.ai_service = AIService(settings, registry, quota, limiter)

    install_error_handlers(app)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins),
        allow_credentials=False,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"],
        expose_headers=["Retry-After"],
        max_age=600,
    )
    app.add_middleware(SecurityHeadersMiddleware)

    app.include_router(health_router.router)
    app.include_router(ai_router.router)

    if settings.serve_frontend:
        mount_frontend(app, settings.frontend_dir)
    return app


app = create_app()
