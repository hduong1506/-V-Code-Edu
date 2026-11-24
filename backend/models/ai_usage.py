from datetime import datetime, timezone

from sqlalchemy import DateTime, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from backend.database.base import Base


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


class AIUsage(Base):
    """Số lượt gọi AI mỗi ngày (UTC) theo chủ thể: 'user:<firebase uid>' hoặc 'ip:<địa chỉ>'."""

    __tablename__ = "ai_usage"
    __table_args__ = (UniqueConstraint("day", "subject", name="uq_ai_usage_day_subject"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    day: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    subject: Mapped[str] = mapped_column(String(160), nullable=False)
    count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=_utcnow)
