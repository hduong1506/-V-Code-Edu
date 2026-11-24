"""Giới hạn tần suất gọi AI.

- Theo phút: cửa sổ trượt trong bộ nhớ (mỗi tiến trình).
- Theo ngày: lưu trong bảng ai_usage (bền vững qua khởi động lại, dùng chung cho nhiều worker).
Một yêu cầu chỉ bị tính khi nhà cung cấp AI thực sự bắt đầu trả lời.
"""
from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError

from backend.database.connection import Database
from backend.models.ai_usage import AIUsage


class MinuteRateLimiter:
    def __init__(self, limit_per_minute: int, window_seconds: float = 60.0, clock=time.monotonic):
        self.limit = limit_per_minute
        self.window = window_seconds
        self._clock = clock
        self._hits: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def _prune(self, subject: str, now: float) -> deque[float]:
        hits = self._hits[subject]
        while hits and now - hits[0] >= self.window:
            hits.popleft()
        return hits

    def acquire(self, subject: str) -> tuple[bool, int]:
        """Giữ chỗ một yêu cầu. Trả về (thành công, số giây nên chờ nếu thất bại)."""
        with self._lock:
            now = self._clock()
            hits = self._prune(subject, now)
            if len(hits) >= self.limit:
                retry = max(1, int(self.window - (now - hits[0])) + 1)
                return False, retry
            hits.append(now)
            return True, 0

    def release(self, subject: str) -> None:
        """Hoàn lại chỗ đã giữ (khi không nhà cung cấp nào bắt đầu trả lời)."""
        with self._lock:
            hits = self._hits.get(subject)
            if hits:
                hits.pop()
                if not hits:
                    self._hits.pop(subject, None)


def utc_day(now: datetime | None = None) -> str:
    return (now or datetime.now(timezone.utc)).strftime("%Y-%m-%d")


def next_reset_iso(now: datetime | None = None) -> str:
    current = now or datetime.now(timezone.utc)
    tomorrow = (current + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return tomorrow.isoformat().replace("+00:00", "Z")


class DailyQuota:
    def __init__(self, database: Database):
        self.db = database

    def used(self, subject: str, day: str | None = None) -> int:
        day = day or utc_day()
        with self.db.session() as s:
            value = s.execute(select(AIUsage.count).where(AIUsage.day == day, AIUsage.subject == subject)).scalar_one_or_none()
            return int(value or 0)

    def increment(self, subject: str, day: str | None = None) -> int:
        day = day or utc_day()
        for _ in range(3):
            with self.db.session() as s:
                result = s.execute(
                    update(AIUsage)
                    .where(AIUsage.day == day, AIUsage.subject == subject)
                    .values(count=AIUsage.count + 1, updated_at=datetime.now(timezone.utc).replace(tzinfo=None))
                )
                if result.rowcount:
                    s.commit()
                    return self.used(subject, day)
                try:
                    s.add(AIUsage(day=day, subject=subject, count=1))
                    s.commit()
                    return 1
                except IntegrityError:
                    s.rollback()  # tiến trình khác vừa chèn cùng khóa → thử lại bằng UPDATE
        return self.used(subject, day)
