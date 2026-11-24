"""Giao diện chung cho nhà cung cấp AI + tiện ích phân tích luồng SSE/NDJSON."""
from __future__ import annotations

import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import AsyncIterator

import httpx


@dataclass
class Chunk:
    """Một mẩu kết quả từ nhà cung cấp."""

    text: str = ""
    finish_reason: str | None = None
    usage: dict | None = None


@dataclass
class ProviderRequest:
    system: str
    messages: list[dict]  # [{"role": "user"|"assistant", "content": str}]
    max_tokens: int = 2048
    temperature: float = 0.4
    extra: dict = field(default_factory=dict)


class ProviderError(Exception):
    def __init__(self, message: str, *, status: int | None = None, code: str = "provider_error"):
        super().__init__(message)
        self.status = status
        self.code = code


class HttpClientHolder:
    """Một httpx.AsyncClient dùng chung, tạo lười khi cần."""

    def __init__(self, timeout: httpx.Timeout):
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    @property
    def client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=self.timeout, follow_redirects=False)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()
        self._client = None


class Provider(ABC):
    id: str = "base"
    label: str = "AI"
    kind: str = "cloud"  # "cloud" | "local"

    def __init__(self, model: str):
        self.model = model

    @abstractmethod
    def is_configured(self) -> bool:
        ...

    async def is_available(self) -> bool:
        return self.is_configured()

    @abstractmethod
    def stream(self, request: ProviderRequest) -> AsyncIterator[Chunk]:
        """Trả về async iterator các Chunk. Ném ProviderError khi thất bại."""
        ...

    def describe_static(self) -> dict:
        return {"id": self.id, "label": self.label, "kind": self.kind, "model": self.model}


def _error_message_from_body(body: bytes) -> str:
    text = body.decode("utf-8", errors="replace").strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return text[:300]
    if isinstance(data, dict):
        err = data.get("error")
        if isinstance(err, dict):
            return str(err.get("message") or err.get("type") or err)[:300]
        if isinstance(err, str):
            return err[:300]
        if "message" in data:
            return str(data["message"])[:300]
    if isinstance(data, list) and data and isinstance(data[0], dict) and "error" in data[0]:
        inner = data[0]["error"]
        return str(inner.get("message") if isinstance(inner, dict) else inner)[:300]
    return text[:300]


async def ensure_ok(response: httpx.Response, provider_label: str) -> None:
    if response.status_code < 400:
        return
    body = await response.aread()
    message = _error_message_from_body(body)
    code = "rate_limited" if response.status_code == 429 else "provider_error"
    raise ProviderError(f"{provider_label} trả về lỗi HTTP {response.status_code}: {message}", status=response.status_code, code=code)


async def iter_sse(response: httpx.Response) -> AsyncIterator[tuple[str, str]]:
    """Phân tích luồng text/event-stream thành các cặp (event, data)."""
    event = "message"
    data_lines: list[str] = []
    async for line in response.aiter_lines():
        if line == "":
            if data_lines:
                yield event, "\n".join(data_lines)
            event, data_lines = "message", []
            continue
        if line.startswith(":"):
            continue
        name, _, value = line.partition(":")
        if value.startswith(" "):
            value = value[1:]
        if name == "event":
            event = value
        elif name == "data":
            data_lines.append(value)
    if data_lines:
        yield event, "\n".join(data_lines)


async def iter_ndjson(response: httpx.Response) -> AsyncIterator[dict]:
    async for line in response.aiter_lines():
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
        except json.JSONDecodeError:
            continue
        if isinstance(obj, dict):
            yield obj
