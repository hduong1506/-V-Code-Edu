"""Sổ đăng ký nhà cung cấp AI: thứ tự ưu tiên, trạng thái sẵn sàng và lựa chọn theo yêu cầu."""
from __future__ import annotations

import asyncio

import httpx

from backend.ai.providers.anthropic import AnthropicProvider
from backend.ai.providers.base import HttpClientHolder, Provider
from backend.ai.providers.gemini import GeminiProvider
from backend.ai.providers.ollama import OllamaProvider
from backend.ai.providers.openai import OpenAIProvider
from backend.core.config import Settings
from backend.core.errors import ApiError

NO_PROVIDER_MESSAGES = {
    "auto": (
        "Chưa có dịch vụ AI nào sẵn sàng. Quản trị viên cần cấu hình ít nhất một khóa API trên máy chủ "
        "(GEMINI_API_KEY, OPENAI_API_KEY hoặc ANTHROPIC_API_KEY) hoặc chạy Ollama cho AI cục bộ. "
        "Xem hướng dẫn trong docs/BACKEND.md."
    ),
    "cloud": (
        "Chưa có dịch vụ AI đám mây nào được cấu hình trên máy chủ (GEMINI_API_KEY, OPENAI_API_KEY hoặc ANTHROPIC_API_KEY). "
        "Bạn có thể thử chế độ AI cục bộ nếu máy chủ có Ollama."
    ),
    "local": (
        "AI cục bộ (Ollama) chưa sẵn sàng: hãy cài Ollama trên máy chủ, tải mô hình (ví dụ `ollama pull qwen2.5:3b`) "
        "và bảo đảm OLLAMA_BASE_URL đúng."
    ),
}


class ProviderRegistry:
    def __init__(self, providers: list[Provider], http: HttpClientHolder | None = None):
        self._providers = list(providers)
        self._by_id = {p.id: p for p in self._providers}
        self.http = http

    @classmethod
    def from_settings(cls, settings: Settings) -> "ProviderRegistry":
        http = HttpClientHolder(httpx.Timeout(
            connect=settings.ai_connect_timeout,
            read=settings.ai_read_timeout,
            write=15.0,
            pool=10.0,
        ))
        factories = {
            "gemini": lambda: GeminiProvider(settings.gemini_api_key, settings.gemini_model, settings.gemini_base_url, http, settings.gemini_fallback_models),
            "openai": lambda: OpenAIProvider(settings.openai_api_key, settings.openai_model, settings.openai_base_url, http, settings.openai_token_param),
            "anthropic": lambda: AnthropicProvider(settings.anthropic_api_key, settings.anthropic_model, settings.anthropic_base_url, http),
            "ollama": lambda: OllamaProvider(settings.ollama_base_url, settings.ollama_model, http, enabled=settings.ollama_enabled),
        }
        providers: list[Provider] = []
        seen = set()
        for pid in settings.ai_provider_order:
            if pid in factories and pid not in seen:
                providers.append(factories[pid]())
                seen.add(pid)
        return cls(providers, http)

    @property
    def providers(self) -> list[Provider]:
        return list(self._providers)

    def get(self, provider_id: str) -> Provider | None:
        return self._by_id.get(provider_id)

    async def _availability(self) -> list[tuple[Provider, bool]]:
        async def check(p: Provider) -> bool:
            try:
                return bool(await p.is_available())
            except Exception:
                return False
        results = await asyncio.gather(*(check(p) for p in self._providers))
        return list(zip(self._providers, results))

    async def describe(self) -> list[dict]:
        return [{**p.describe_static(), "available": ok} for p, ok in await self._availability()]

    async def default_id(self) -> str | None:
        for p, ok in await self._availability():
            if ok:
                return p.id
        return None

    async def candidates(self, preference: str) -> list[Provider]:
        pref = (preference or "auto").lower()
        if pref not in ("auto", "cloud", "local") and pref not in self._by_id:
            raise ApiError(400, "bad_request", f"Nhà cung cấp AI '{pref}' không tồn tại. Hãy dùng auto, cloud, local hoặc một mã trong /api/ai/providers.")
        availability = await self._availability()
        if pref == "auto":
            chosen = [p for p, ok in availability if ok]
        elif pref in ("cloud", "local"):
            chosen = [p for p, ok in availability if ok and p.kind == pref]
        else:
            chosen = [p for p, ok in availability if ok and p.id == pref]
        if not chosen:
            if pref in NO_PROVIDER_MESSAGES:
                message = NO_PROVIDER_MESSAGES[pref]
            else:
                provider = self._by_id[pref]
                message = (NO_PROVIDER_MESSAGES["local"] if provider.kind == "local"
                           else f"{provider.label} chưa được cấu hình trên máy chủ. Hãy chọn chế độ tự động hoặc nhà cung cấp khác.")
            raise ApiError(503, "no_provider", message)
        return chosen

    async def aclose(self) -> None:
        if self.http is not None:
            await self.http.aclose()
