"""Anthropic Claude — Messages API (stream). System prompt đặt ở trường `system` cấp cao nhất."""
from __future__ import annotations

import json
from typing import AsyncIterator

from backend.ai.providers.base import Chunk, HttpClientHolder, Provider, ProviderError, ProviderRequest, ensure_ok, iter_sse

ANTHROPIC_VERSION = "2023-06-01"
_FINISH_MAP = {"end_turn": "stop", "stop_sequence": "stop", "max_tokens": "length", "refusal": "content_filter"}


class AnthropicProvider(Provider):
    id = "anthropic"
    label = "Anthropic Claude"
    kind = "cloud"

    def __init__(self, api_key: str, model: str, base_url: str, http: HttpClientHolder):
        super().__init__(model)
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.http = http

    def is_configured(self) -> bool:
        return bool(self.api_key)

    def _payload(self, request: ProviderRequest) -> dict:
        return {
            "model": self.model,
            "max_tokens": request.max_tokens,
            "system": request.system,
            "messages": [{"role": m["role"], "content": m["content"]} for m in request.messages],
            "stream": True,
        }

    async def stream(self, request: ProviderRequest) -> AsyncIterator[Chunk]:
        url = f"{self.base_url}/v1/messages"
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
        }
        input_tokens = None
        async with self.http.client.stream("POST", url, headers=headers, json=self._payload(request)) as resp:
            await ensure_ok(resp, self.label)
            async for event, data in iter_sse(resp):
                try:
                    obj = json.loads(data)
                except json.JSONDecodeError:
                    continue
                kind = obj.get("type") or event
                if kind == "error":
                    err = obj.get("error") or {}
                    raise ProviderError(f"{self.label}: {err.get('message') or err.get('type') or 'lỗi không xác định'}")
                if kind == "message_start":
                    usage = ((obj.get("message") or {}).get("usage")) or {}
                    input_tokens = usage.get("input_tokens")
                elif kind == "content_block_delta":
                    delta = obj.get("delta") or {}
                    if delta.get("type") == "text_delta" and delta.get("text"):
                        yield Chunk(text=delta["text"])
                elif kind == "message_delta":
                    delta = obj.get("delta") or {}
                    stop = delta.get("stop_reason")
                    usage = obj.get("usage") or {}
                    output_tokens = usage.get("output_tokens")
                    yield Chunk(
                        finish_reason=_FINISH_MAP.get(stop, stop) if stop else None,
                        usage={"input_tokens": input_tokens, "output_tokens": output_tokens,
                               "total_tokens": (input_tokens or 0) + (output_tokens or 0) if output_tokens is not None else None},
                    )
                elif kind == "message_stop":
                    break
