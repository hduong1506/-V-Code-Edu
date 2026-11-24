"""Lược đồ yêu cầu /api/ai/chat (xem docs/ARCHITECTURE.md §5.1)."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

MAX_MESSAGES = 40
MAX_MESSAGE_CHARS = 12_000
MAX_TOTAL_CHARS = 60_000

Mode = Literal["tutor", "reviewer", "debugger", "algorithm", "learning", "project", "knowledge"]


class ChatMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")

    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_CHARS)

    @field_validator("content")
    @classmethod
    def _not_blank(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("Nội dung tin nhắn không được để trống.")
        return value


class ChatContext(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: str | None = Field(default=None, max_length=20_000)
    language: str | None = Field(default=None, max_length=40)
    error: str | None = Field(default=None, max_length=8_000)
    lesson: str | None = Field(default=None, max_length=4_000)


class ChatRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    messages: list[ChatMessage] = Field(min_length=1, max_length=MAX_MESSAGES)
    mode: Mode = "tutor"
    provider: str = Field(default="auto", min_length=1, max_length=40, pattern=r"^[a-z0-9_-]+$")
    context: ChatContext | None = None

    @model_validator(mode="after")
    def _last_must_be_user(self) -> "ChatRequest":
        if self.messages[-1].role != "user":
            raise ValueError("Tin nhắn cuối cùng phải là của người dùng (role = 'user').")
        return self


def prepare_messages(messages: list[ChatMessage], budget: int = MAX_TOTAL_CHARS) -> list[dict]:
    """Cắt bớt tin nhắn cũ nhất khi vượt ngân sách ký tự, luôn giữ tin nhắn cuối của người dùng.

    Đồng thời gộp các tin nhắn liên tiếp cùng vai trò và bảo đảm hội thoại bắt đầu bằng 'user'
    (yêu cầu của một số nhà cung cấp như Anthropic/Gemini).
    """
    items = [{"role": m.role, "content": m.content} for m in messages]
    total = sum(len(m["content"]) for m in items)
    while len(items) > 1 and total > budget:
        removed = items.pop(0)
        total -= len(removed["content"])
    if total > budget:  # chỉ còn tin cuối nhưng vẫn quá dài (không thể xảy ra với giới hạn 12k, phòng hờ)
        items[-1]["content"] = items[-1]["content"][-budget:]
    while items and items[0]["role"] != "user":
        items.pop(0)
    merged: list[dict] = []
    for m in items:
        if merged and merged[-1]["role"] == m["role"]:
            merged[-1]["content"] += "\n\n" + m["content"]
        else:
            merged.append(dict(m))
    return merged
