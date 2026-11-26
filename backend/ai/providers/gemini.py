"""Google Gemini — streamGenerateContent (SSE). Khóa gửi qua header x-goog-api-key (không đặt trong URL)."""
from __future__ import annotations

import json
from typing import AsyncIterator

from backend.ai.providers.base import Chunk, HttpClientHolder, Provider, ProviderError, ProviderRequest, ensure_ok, iter_sse

_FINISH_MAP = {"STOP": "stop", "MAX_TOKENS": "length", "SAFETY": "content_filter", "RECITATION": "content_filter"}
# Overloaded / quota / retired model → try the next model before anything has been streamed.
_RETRYABLE_STATUS = {404, 429, 500, 503}


class GeminiProvider(Provider):
    id = "gemini"
    label = "Google Gemini"
    kind = "cloud"

    def __init__(self, api_key: str, model: str, base_url: str, http: HttpClientHolder, fallback_models: tuple[str, ...] = ()):
        super().__init__(model)
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.http = http
        self.fallback_models = tuple(m for m in fallback_models if m and m != model)

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _payload(self, request: ProviderRequest) -> dict:
        contents = [
            {"role": "model" if m["role"] == "assistant" else "user", "parts": [{"text": m["content"]}]}
            for m in request.messages
        ]
        return {
            "systemInstruction": {"parts": [{"text": request.system}]},
            "contents": contents,
            "generationConfig": {"temperature": request.temperature, "maxOutputTokens": request.max_tokens},
        }

    async def stream(self, request: ProviderRequest) -> AsyncIterator[Chunk]:
        models = (self.model, *self.fallback_models)
        for i, model in enumerate(models):
            started = False
            try:
                async for chunk in self._stream_model(model, request):
                    started = True
                    yield chunk
                return
            except ProviderError as err:
                if started or i == len(models) - 1 or err.status not in _RETRYABLE_STATUS:
                    raise

    async def _stream_model(self, model: str, request: ProviderRequest) -> AsyncIterator[Chunk]:
        url = f"{self.base_url}/models/{model}:streamGenerateContent"
        headers = {"x-goog-api-key": self.api_key, "Content-Type": "application/json"}
        async with self.http.client.stream("POST", url, params={"alt": "sse"}, headers=headers, json=self._payload(request)) as resp:
            await ensure_ok(resp, self.label)
            async for _event, data in iter_sse(resp):
                try:
                    obj = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if "error" in obj:
                    err = obj["error"]
                    raise ProviderError(f"{self.label}: {err.get('message', err) if isinstance(err, dict) else err}")
                feedback = obj.get("promptFeedback") or {}
                if feedback.get("blockReason"):
                    raise ProviderError(f"{self.label} từ chối yêu cầu ({feedback['blockReason']}).", code="content_filter")
                usage = None
                meta = obj.get("usageMetadata")
                if isinstance(meta, dict):
                    usage = {
                        "input_tokens": meta.get("promptTokenCount"),
                        "output_tokens": meta.get("candidatesTokenCount"),
                        "total_tokens": meta.get("totalTokenCount"),
                    }
                for cand in obj.get("candidates") or []:
                    parts = ((cand.get("content") or {}).get("parts")) or []
                    text = "".join(p.get("text", "") for p in parts if isinstance(p, dict) and not p.get("thought"))
                    finish = cand.get("finishReason")
                    finish_reason = _FINISH_MAP.get(finish, finish.lower() if isinstance(finish, str) else None) if finish else None
                    if text or finish_reason or usage:
                        yield Chunk(text=text, finish_reason=finish_reason, usage=usage)
                        usage = None
                if usage:
                    yield Chunk(usage=usage)
