"""Kiểm thử định dạng giao tiếp của từng nhà cung cấp bằng httpx.MockTransport (không gọi API thật)."""
import asyncio
import json

import httpx
import pytest

from backend.ai.providers.anthropic import AnthropicProvider
from backend.ai.providers.base import HttpClientHolder, Provider, ProviderError, ProviderRequest
from backend.ai.providers.gemini import GeminiProvider
from backend.ai.providers.ollama import OllamaProvider
from backend.ai.providers.openai import OpenAIProvider
from backend.ai.service import ProviderRun

REQ = ProviderRequest(system="SYS", messages=[{"role": "user", "content": "hỏi"}, {"role": "assistant", "content": "đáp"}, {"role": "user", "content": "tiếp"}],
                      max_tokens=100, temperature=0.3)


def holder(handler):
    h = HttpClientHolder(httpx.Timeout(5.0))
    h._client = httpx.AsyncClient(transport=httpx.MockTransport(handler))
    return h


def sse_body(events):
    out = ""
    for event, data in events:
        if event:
            out += f"event: {event}\n"
        out += f"data: {data if isinstance(data, str) else json.dumps(data)}\n\n"
    return out.encode()


async def collect(provider):
    return [c async for c in provider.stream(REQ)]


def test_gemini_wire_format():
    seen = {}

    def handler(request: httpx.Request):
        seen["url"] = str(request.url)
        seen["headers"] = request.headers
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, content=sse_body([
            (None, {"candidates": [{"content": {"parts": [{"text": "Xin "}]}}]}),
            (None, {"candidates": [{"content": {"parts": [{"text": "chào"}]}, "finishReason": "STOP"}],
                    "usageMetadata": {"promptTokenCount": 3, "candidatesTokenCount": 2, "totalTokenCount": 5}}),
        ]), headers={"content-type": "text/event-stream"})

    p = GeminiProvider("SECRET-KEY", "gemini-2.5-flash", "https://g.test/v1beta", holder(handler))
    chunks = asyncio.run(collect(p))
    assert "".join(c.text for c in chunks) == "Xin chào"
    assert chunks[-1].finish_reason == "stop" and chunks[-1].usage["total_tokens"] == 5
    assert seen["url"].startswith("https://g.test/v1beta/models/gemini-2.5-flash:streamGenerateContent")
    assert "alt=sse" in seen["url"] and "SECRET-KEY" not in seen["url"]
    assert seen["headers"]["x-goog-api-key"] == "SECRET-KEY"
    assert seen["body"]["systemInstruction"]["parts"][0]["text"] == "SYS"
    assert [c["role"] for c in seen["body"]["contents"]] == ["user", "model", "user"]
    assert seen["body"]["generationConfig"] == {"temperature": 0.3, "maxOutputTokens": 100}


def test_openai_wire_format():
    seen = {}

    def handler(request):
        seen["url"] = str(request.url)
        seen["auth"] = request.headers["authorization"]
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, content=sse_body([
            (None, {"choices": [{"delta": {"role": "assistant", "content": ""}}]}),
            (None, {"choices": [{"delta": {"content": "Chào"}}]}),
            (None, {"choices": [{"delta": {}, "finish_reason": "stop"}]}),
            (None, {"choices": [], "usage": {"prompt_tokens": 4, "completion_tokens": 1, "total_tokens": 5}}),
            (None, "[DONE]"),
        ]))

    p = OpenAIProvider("sk-test", "gpt-4o-mini", "https://api.openai.com/v1", holder(handler))
    chunks = asyncio.run(collect(p))
    assert "".join(c.text for c in chunks) == "Chào"
    assert any(c.finish_reason == "stop" for c in chunks)
    assert any(c.usage and c.usage["total_tokens"] == 5 for c in chunks)
    assert seen["url"] == "https://api.openai.com/v1/chat/completions"
    assert seen["auth"] == "Bearer sk-test"
    body = seen["body"]
    assert body["messages"][0] == {"role": "system", "content": "SYS"} and body["stream"] is True
    assert body["max_tokens"] == 100 and body["stream_options"] == {"include_usage": True}


def test_openai_compatible_server_and_token_param():
    seen = {}

    def handler(request):
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, content=sse_body([(None, {"choices": [{"delta": {"content": "x"}}]}), (None, "[DONE]")]))

    p = OpenAIProvider("k", "local-model", "http://lan:1234/v1", holder(handler), token_param="max_completion_tokens")
    asyncio.run(collect(p))
    assert "stream_options" not in seen["body"]
    assert seen["body"]["max_completion_tokens"] == 100 and "max_tokens" not in seen["body"]


def test_anthropic_wire_format():
    seen = {}

    def handler(request):
        seen["url"] = str(request.url)
        seen["headers"] = request.headers
        seen["body"] = json.loads(request.content)
        return httpx.Response(200, content=sse_body([
            ("message_start", {"type": "message_start", "message": {"usage": {"input_tokens": 7}}}),
            ("content_block_start", {"type": "content_block_start", "index": 0, "content_block": {"type": "text", "text": ""}}),
            ("ping", {"type": "ping"}),
            ("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "Xin "}}),
            ("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": "chào"}}),
            ("content_block_stop", {"type": "content_block_stop", "index": 0}),
            ("message_delta", {"type": "message_delta", "delta": {"stop_reason": "end_turn"}, "usage": {"output_tokens": 2}}),
            ("message_stop", {"type": "message_stop"}),
        ]))

    p = AnthropicProvider("ak-test", "claude-opus-5-5", "https://api.anthropic.com", holder(handler))
    chunks = asyncio.run(collect(p))
    assert "".join(c.text for c in chunks) == "Xin chào"
    assert chunks[-1].finish_reason == "stop" and chunks[-1].usage == {"input_tokens": 7, "output_tokens": 2, "total_tokens": 9}
    assert seen["url"] == "https://api.anthropic.com/v1/messages"
    assert seen["headers"]["x-api-key"] == "ak-test" and seen["headers"]["anthropic-version"] == "2023-06-01"
    body = seen["body"]
    assert body["system"] == "SYS" and body["model"] == "claude-opus-5-5" and body["stream"] is True
    assert body["max_tokens"] == 100 and all(m["role"] in ("user", "assistant") for m in body["messages"])


def test_anthropic_stream_error_event():
    def handler(request):
        return httpx.Response(200, content=sse_body([("error", {"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}})]))

    p = AnthropicProvider("k", "m", "https://a.test", holder(handler))
    with pytest.raises(ProviderError, match="Overloaded"):
        asyncio.run(collect(p))


def test_http_error_status_raises_provider_error_without_leaking_key():
    def handler(request):
        return httpx.Response(401, json={"error": {"message": "invalid x-api-key"}})

    p = AnthropicProvider("SUPER-SECRET", "m", "https://a.test", holder(handler))
    with pytest.raises(ProviderError) as exc:
        asyncio.run(collect(p))
    assert exc.value.status == 401 and "SUPER-SECRET" not in str(exc.value)


def test_ollama_stream_and_probe():
    def handler(request):
        if request.url.path == "/api/tags":
            return httpx.Response(200, json={"models": [{"name": "qwen2.5:3b"}]})
        body = json.loads(request.content)
        assert body["messages"][0] == {"role": "system", "content": "SYS"}
        assert body["options"]["num_predict"] == 100
        lines = [{"message": {"content": "Chào"}, "done": False}, {"message": {"content": " bạn"}, "done": False},
                 {"message": {"content": ""}, "done": True, "done_reason": "stop", "prompt_eval_count": 9, "eval_count": 3}]
        return httpx.Response(200, content="\n".join(json.dumps(x) for x in lines).encode())

    p = OllamaProvider("http://ollama.test:11434", "qwen2.5:3b", holder(handler))
    assert asyncio.run(p.is_available()) is True
    chunks = asyncio.run(collect(p))
    assert "".join(c.text for c in chunks) == "Chào bạn"
    assert chunks[-1].finish_reason == "stop" and chunks[-1].usage["total_tokens"] == 12


def test_ollama_unavailable_when_model_missing_or_server_down():
    def handler(request):
        return httpx.Response(200, json={"models": [{"name": "llama3:latest"}]})

    assert asyncio.run(OllamaProvider("http://o.test", "qwen2.5:3b", holder(handler)).is_available()) is False

    def down(request):
        raise httpx.ConnectError("refused")

    assert asyncio.run(OllamaProvider("http://o.test", "qwen2.5:3b", holder(down)).is_available()) is False
    assert asyncio.run(OllamaProvider("http://o.test", "qwen2.5:3b", holder(down), enabled=False).is_available()) is False


class _Slow(Provider):
    id, label, kind = "slow", "Slow", "cloud"

    def is_configured(self):
        return True

    async def stream(self, request):
        await asyncio.sleep(10)
        yield  # pragma: no cover


def test_provider_run_total_timeout_and_cancel():
    async def scenario():
        run = ProviderRun(_Slow("m"), REQ, total_timeout=0.2)
        kind, err = await run.next()
        assert kind == "error" and err.code == "timeout"
        run2 = ProviderRun(_Slow("m"), REQ, total_timeout=30)
        await asyncio.sleep(0.05)
        run2.cancel()
        await asyncio.sleep(0.05)
        assert run2.task.cancelled()

    asyncio.run(scenario())
