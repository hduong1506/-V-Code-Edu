"""OpenAI Chat Completions (stream) — cũng dùng được với máy chủ tương thích OpenAI qua OPENAI_BASE_URL."""
from __future__ import annotations

import json
from typing import AsyncIterator

from backend.ai.providers.base import Chunk, HttpClientHolder, Provider, ProviderError, ProviderRequest, ensure_ok, iter_sse


class OpenAIProvider(Provider):
    id = "openai"
    label = "OpenAI"
    kind = "cloud"

    def __init__(self, api_key: str, model: str, base_url: str, http: HttpClientHolder, token_param: str = "max_tokens"):
        super().__init__(model)
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.http = http
        self.token_param = token_param

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _payload(self, request: ProviderRequest) -> dict:
        payload = {
            "model": self.model,
            "messages": [{"role": "system", "content": request.system}, *request.messages],
            "stream": True,
            "temperature": request.temperature,
            self.token_param: request.max_tokens,
        }
        if "api.openai.com" in self.base_url:
            payload["stream_options"] = {"include_usage": True}
        return payload

    async def stream(self, request: ProviderRequest) -> AsyncIterator[Chunk]:
        url = f"{self.base_url}/chat/completions"
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        async with self.http.client.stream("POST", url, headers=headers, json=self._payload(request)) as resp:
            await ensure_ok(resp, self.label)
            async for _event, data in iter_sse(resp):
                if data.strip() == "[DONE]":
                    break
                try:
                    obj = json.loads(data)
                except json.JSONDecodeError:
                    continue
                if "error" in obj:
                    err = obj["error"]
                    raise ProviderError(f"{self.label}: {err.get('message', err) if isinstance(err, dict) else err}")
                usage = None
                if isinstance(obj.get("usage"), dict):
                    u = obj["usage"]
                    usage = {"input_tokens": u.get("prompt_tokens"), "output_tokens": u.get("completion_tokens"), "total_tokens": u.get("total_tokens")}
                choices = obj.get("choices") or []
                if not choices and usage:
                    yield Chunk(usage=usage)
                    continue
                for choice in choices:
                    delta = choice.get("delta") or {}
                    text = delta.get("content") or ""
                    finish = choice.get("finish_reason")
                    if text or finish or usage:
                        yield Chunk(text=text, finish_reason=finish, usage=usage)
                        usage = None
