"""Cấu hình kiểm thử: luôn dùng CSDL tạm, không bao giờ chạm vào vcode_edu.db thật hay gọi API AI thật."""
from __future__ import annotations

import json
import os
import tempfile
from dataclasses import replace
from pathlib import Path

# Phải đặt TRƯỚC khi import backend.main (module tạo app mặc định lúc import).
_SESSION_DIR = Path(tempfile.mkdtemp(prefix="vcode_tests_"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_SESSION_DIR / 'import_default.db').as_posix()}"
for _key in ("GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"):
    os.environ[_key] = ""
os.environ["OLLAMA_ENABLED"] = "0"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from backend.ai.providers.base import Chunk, Provider, ProviderError, ProviderRequest  # noqa: E402
from backend.ai.registry import ProviderRegistry  # noqa: E402
from backend.core.config import Settings  # noqa: E402
from backend.main import create_app  # noqa: E402


class FakeProvider(Provider):
    def __init__(self, provider_id="fake", kind="cloud", chunks=("Xin ", "chào ", "bạn!"), *,
                 fail_before=False, fail_after=False, available=True, model="fake-model", label=None):
        super().__init__(model)
        self.id = provider_id
        self.kind = kind
        self.label = label or f"Fake {provider_id}"
        self.chunks = list(chunks)
        self.fail_before = fail_before
        self.fail_after = fail_after
        self.available = available
        self.calls: list[ProviderRequest] = []

    def is_configured(self) -> bool:
        return self.available

    async def stream(self, request: ProviderRequest):
        self.calls.append(request)
        if self.fail_before:
            raise ProviderError(f"{self.label} hỏng trước khi trả lời", status=500)
        for text in self.chunks:
            yield Chunk(text=text)
        if self.fail_after:
            raise ProviderError(f"{self.label} đứt giữa chừng")
        yield Chunk(finish_reason="stop", usage={"input_tokens": 5, "output_tokens": len(self.chunks)})


def make_settings(tmp_path: Path, **overrides) -> Settings:
    base = Settings(
        database_url=f"sqlite:///{(tmp_path / 'test.db').as_posix()}",
        serve_frontend=False,
        frontend_dir=tmp_path / "frontend",
        ollama_enabled=False,
        ai_rate_per_minute=100,
        ai_daily_limit_user=100,
        ai_daily_limit_guest=100,
    )
    return replace(base, **overrides)


@pytest.fixture
def build_client(tmp_path):
    """Tạo TestClient với các nhà cung cấp giả lập và cấu hình tùy biến."""
    clients: list[TestClient] = []

    def _build(providers=None, *, token_verifier=None, **overrides) -> TestClient:
        settings = make_settings(tmp_path, **overrides)
        registry = ProviderRegistry(providers if providers is not None else [FakeProvider()])
        app = create_app(settings, registry=registry, token_verifier=token_verifier)
        client = TestClient(app)
        client.__enter__()
        clients.append(client)
        return client

    yield _build
    for c in clients:
        c.__exit__(None, None, None)


def parse_sse(text: str) -> list[tuple[str, dict]]:
    events = []
    for block in text.split("\n\n"):
        block = block.strip("\n")
        if not block:
            continue
        name, data = "message", None
        for line in block.split("\n"):
            if line.startswith("event: "):
                name = line[len("event: "):]
            elif line.startswith("data: "):
                data = json.loads(line[len("data: "):])
        events.append((name, data))
    return events


def user_msg(text="Giải thích vòng lặp for"):
    return {"messages": [{"role": "user", "content": text}]}
