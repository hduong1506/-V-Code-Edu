"""Điều phối hội thoại AI: kiểm tra hạn mức, chọn nhà cung cấp (có dự phòng), phát luồng SSE.

Luồng xử lý:
  1. Chuẩn hóa tin nhắn + dựng system prompt theo chế độ.
  2. Lấy danh sách nhà cung cấp phù hợp (503 no_provider nếu không có).
  3. Kiểm tra hạn mức ngày (DB) và theo phút (bộ nhớ) → 429 nếu vượt.
  4. Thử lần lượt từng nhà cung cấp; nếu lỗi TRƯỚC mẩu đầu tiên thì chuyển sang nhà cung cấp kế tiếp.
     Nếu tất cả thất bại → JSON 503 (chưa mở luồng).
  5. Khi đã bắt đầu: tính 1 lượt, mở luồng SSE: meta → delta… → done (hoặc error nếu đứt giữa chừng).
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from dataclasses import dataclass

import httpx
from fastapi import Request
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from backend.ai.prompts import build_system_prompt
from backend.ai.providers.base import Chunk, Provider, ProviderError, ProviderRequest
from backend.ai.registry import ProviderRegistry
from backend.ai.schemas import ChatRequest, prepare_messages
from backend.core.config import Settings
from backend.core.errors import ApiError
from backend.core.ratelimit import DailyQuota, MinuteRateLimiter, next_reset_iso
from backend.core.security import Principal

log = logging.getLogger("vcode.ai")

SSE_HEADERS = {"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}


def sse_event(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data, ensure_ascii=False)}\n\n"


@dataclass
class RunError:
    code: str  # "provider_error" | "timeout"
    message: str


class ProviderRun:
    """Chạy luồng của một nhà cung cấp trong một task riêng, đẩy kết quả vào hàng đợi.

    Task riêng giữ trọn vòng đời kết nối httpx (mở/đóng trong cùng một task) và cho phép
    hủy gọn khi client ngắt kết nối hoặc khi hết thời gian tổng.
    """

    def __init__(self, provider: Provider, request: ProviderRequest, total_timeout: float):
        self.provider = provider
        self.request = request
        self.total_timeout = total_timeout
        self.queue: asyncio.Queue = asyncio.Queue(maxsize=512)
        self.task = asyncio.create_task(self._run(), name=f"ai-run-{provider.id}")

    def _finish(self, item: tuple) -> None:
        try:
            self.queue.put_nowait(item)
        except asyncio.QueueFull:
            pass

    async def _run(self) -> None:
        label = self.provider.label
        try:
            async with asyncio.timeout(self.total_timeout):
                async for chunk in self.provider.stream(self.request):
                    await self.queue.put(("chunk", chunk))
            self._finish(("end", None))
        except asyncio.CancelledError:
            raise
        except (TimeoutError, httpx.TimeoutException):
            self._finish(("error", RunError("timeout", f"{label} phản hồi quá lâu (quá thời gian chờ). Vui lòng thử lại.")))
        except ProviderError as exc:
            self._finish(("error", RunError("provider_error", str(exc))))
        except httpx.HTTPError as exc:
            self._finish(("error", RunError("provider_error", f"Không kết nối được tới {label} ({type(exc).__name__}).")))
        except Exception as exc:  # phòng hờ lỗi phân tích dữ liệu bất ngờ
            log.exception("Provider %s failed unexpectedly", self.provider.id)
            self._finish(("error", RunError("provider_error", f"{label} gặp lỗi không mong muốn ({type(exc).__name__}).")))

    async def next(self) -> tuple:
        return await self.queue.get()

    def cancel(self) -> None:
        if not self.task.done():
            self.task.cancel()


class AIService:
    def __init__(self, settings: Settings, registry: ProviderRegistry, quota: DailyQuota, limiter: MinuteRateLimiter):
        self.settings = settings
        self.registry = registry
        self.quota = quota
        self.limiter = limiter

    def daily_limit(self, principal: Principal) -> int:
        return self.settings.ai_daily_limit_user if principal.kind == "user" else self.settings.ai_daily_limit_guest

    async def usage(self, principal: Principal) -> dict:
        limit = self.daily_limit(principal)
        used = await run_in_threadpool(self.quota.used, principal.subject)
        return {
            "limit": limit,
            "used": used,
            "remaining": max(0, limit - used),
            "subject": principal.kind,
            "reset_at": next_reset_iso(),
        }

    def _seconds_until_reset(self) -> int:
        now = time.time()
        return max(1, int(86400 - (now % 86400)))

    async def start_chat(self, payload: ChatRequest, principal: Principal, request: Request) -> StreamingResponse:
        messages = prepare_messages(payload.messages)
        if not messages:
            raise ApiError(400, "bad_request", "Hội thoại cần có ít nhất một tin nhắn của người dùng.")
        provider_request = ProviderRequest(
            system=build_system_prompt(payload.mode, payload.context),
            messages=messages,
            max_tokens=self.settings.ai_max_output_tokens,
            temperature=self.settings.ai_temperature,
        )
        candidates = await self.registry.candidates(payload.provider)

        subject = principal.subject
        limit = self.daily_limit(principal)
        used = await run_in_threadpool(self.quota.used, subject)
        if used >= limit:
            who = "tài khoản của bạn" if principal.kind == "user" else "khách (chưa đăng nhập)"
            hint = "" if principal.kind == "user" else " Đăng nhập để có hạn mức cao hơn."
            raise ApiError(
                429, "rate_limited",
                f"Đã dùng hết {limit} lượt hỏi AI hôm nay cho {who}.{hint} Hạn mức sẽ được làm mới lúc 0 giờ (UTC).",
                headers={"Retry-After": str(self._seconds_until_reset())},
                remaining=0, reset_at=next_reset_iso(),
            )
        ok, retry_after = self.limiter.acquire(subject)
        if not ok:
            raise ApiError(
                429, "rate_limited",
                f"Bạn gửi câu hỏi hơi nhanh. Vui lòng chờ khoảng {retry_after} giây rồi thử lại.",
                headers={"Retry-After": str(retry_after)}, retry_after=retry_after,
            )

        request_id = uuid.uuid4().hex[:12]
        errors: list[RunError] = []
        started_at = time.monotonic()
        for provider in candidates:
            run = ProviderRun(provider, provider_request, self.settings.ai_total_timeout)
            first = await run.next()
            if first[0] == "error":
                errors.append(first[1])
                log.warning("AI provider %s failed before first token (req=%s): %s", provider.id, request_id, first[1].message)
                continue
            new_used = await run_in_threadpool(self.quota.increment, subject)
            remaining = max(0, limit - new_used)
            log.info("AI chat started req=%s provider=%s mode=%s subject=%s", request_id, provider.id, payload.mode, principal.kind)
            meta = {"provider": provider.id, "model": provider.model, "mode": payload.mode, "request_id": request_id}
            return StreamingResponse(
                self._stream(run, first, meta, remaining, started_at),
                media_type="text/event-stream; charset=utf-8",
                headers=SSE_HEADERS,
            )

        self.limiter.release(subject)
        all_timeouts = bool(errors) and all(e.code == "timeout" for e in errors)
        last = errors[-1].message if errors else "Không rõ nguyên nhân."
        raise ApiError(
            503,
            "timeout" if all_timeouts else "provider_error",
            f"Không nhận được phản hồi từ dịch vụ AI. {last}",
        )

    async def _stream(self, run: ProviderRun, first: tuple, meta: dict, remaining: int, started_at: float):
        finish_reason: str | None = None
        usage: dict = {}
        out_chars = 0
        outcome = "ok"
        try:
            yield sse_event("meta", meta)
            item = first
            while True:
                kind, value = item
                if kind == "chunk":
                    chunk: Chunk = value
                    if chunk.text:
                        out_chars += len(chunk.text)
                        yield sse_event("delta", {"text": chunk.text})
                    if chunk.finish_reason:
                        finish_reason = chunk.finish_reason
                    if chunk.usage:
                        usage.update({k: v for k, v in chunk.usage.items() if v is not None})
                elif kind == "end":
                    yield sse_event("done", {"finish_reason": finish_reason or "stop", "usage": usage, "remaining": remaining})
                    return
                else:  # "error" sau khi đã bắt đầu phát
                    outcome = value.code
                    yield sse_event("error", {"code": value.code, "message": value.message})
                    return
                item = await run.next()
        except (asyncio.CancelledError, GeneratorExit):
            outcome = "client_disconnected"
            raise
        finally:
            run.cancel()
            log.info("AI chat finished req=%s provider=%s outcome=%s chars=%s duration=%.2fs",
                     meta["request_id"], meta["provider"], outcome, out_chars, time.monotonic() - started_at)
