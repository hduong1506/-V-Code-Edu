"""Ollama — mô hình AI chạy CỤC BỘ (máy chủ trường/LAN), hoạt động không cần Internet."""
from __future__ import annotations

import time
from typing import AsyncIterator

import httpx

from backend.ai.providers.base import Chunk, HttpClientHolder, Provider, ProviderError, ProviderRequest, ensure_ok, iter_ndjson

PROBE_TIMEOUT = 1.5
PROBE_CACHE_SECONDS = 30.0


class OllamaProvider(Provider):
    id = "ollama"
    label = "Ollama (AI cục bộ)"
    kind = "local"

    def __init__(self, base_url: str, model: str, http: HttpClientHolder, enabled: bool = True, clock=time.monotonic):
        super().__init__(model)
        self.base_url = base_url.rstrip("/")
        self.http = http
        self.enabled = enabled
        self._clock = clock
        self._probe_at = -1e9
        self._probe_result = False

    def is_configured(self) -> bool:
        return self.enabled and bool(self.base_url) and bool(self.model)

    def _model_present(self, tags: dict) -> bool:
        names = set()
        for item in tags.get("models") or []:
            for key in ("name", "model"):
                if item.get(key):
                    names.add(str(item[key]))
        wanted = self.model if ":" in self.model else f"{self.model}:latest"
        return self.model in names or wanted in names

    async def is_available(self) -> bool:
        if not self.is_configured():
            return False
        now = self._clock()
        if now - self._probe_at < PROBE_CACHE_SECONDS:
            return self._probe_result
        ok = False
        try:
            resp = await self.http.client.get(f"{self.base_url}/api/tags", timeout=httpx.Timeout(PROBE_TIMEOUT))
            ok = resp.status_code == 200 and self._model_present(resp.json())
        except (httpx.HTTPError, ValueError):
            ok = False
        self._probe_at = now
        self._probe_result = ok
        return ok

    async def stream(self, request: ProviderRequest) -> AsyncIterator[Chunk]:
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": request.system}, *request.messages],
            "stream": True,
            "options": {"temperature": request.temperature, "num_predict": request.max_tokens},
        }
        async with self.http.client.stream("POST", f"{self.base_url}/api/chat", json=payload) as resp:
            await ensure_ok(resp, self.label)
            async for obj in iter_ndjson(resp):
                if obj.get("error"):
                    raise ProviderError(f"{self.label}: {obj['error']}")
                text = ((obj.get("message") or {}).get("content")) or ""
                if obj.get("done"):
                    prompt_tokens = obj.get("prompt_eval_count")
                    out_tokens = obj.get("eval_count")
                    yield Chunk(
                        text=text,
                        finish_reason="length" if obj.get("done_reason") == "length" else "stop",
                        usage={"input_tokens": prompt_tokens, "output_tokens": out_tokens,
                               "total_tokens": (prompt_tokens or 0) + (out_tokens or 0) if out_tokens is not None else None},
                    )
                    break
                if text:
                    yield Chunk(text=text)
