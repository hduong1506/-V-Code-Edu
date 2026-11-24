from datetime import datetime, timezone

from fastapi import APIRouter, Request

router = APIRouter(prefix="/api", tags=["Hệ thống"])


@router.get("/health")
async def health(request: Request) -> dict:
    registry = request.app.state.registry
    providers = await registry.describe()
    return {
        "status": "ok",
        "service": "V-Code Edu API",
        "version": request.app.state.settings.app_version,
        "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "ai": {"providers": [{"id": p["id"], "kind": p["kind"], "available": p["available"]} for p in providers]},
    }
