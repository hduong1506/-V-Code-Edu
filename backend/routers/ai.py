from fastapi import APIRouter, Depends, Request

from backend.ai.prompts import MODES
from backend.ai.schemas import ChatRequest
from backend.core.security import Principal, get_principal

router = APIRouter(prefix="/api/ai", tags=["Trợ lý AI V-Mentor"])


@router.get("/providers")
async def list_providers(request: Request) -> dict:
    registry = request.app.state.registry
    providers = await registry.describe()
    default = next((p["id"] for p in providers if p["available"]), None)
    return {"providers": providers, "default": default, "modes": MODES}


@router.get("/usage")
async def get_usage(request: Request, principal: Principal = Depends(get_principal)) -> dict:
    return await request.app.state.ai_service.usage(principal)


@router.post("/chat")
async def chat(payload: ChatRequest, request: Request, principal: Principal = Depends(get_principal)):
    return await request.app.state.ai_service.start_chat(payload, principal, request)
