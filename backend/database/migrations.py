"""Bộ chạy migration tối giản, có đánh số phiên bản (không dùng Alembic).

Nguyên tắc AN TOÀN DỮ LIỆU:
  - Chỉ THÊM bảng/cột mới. Không bao giờ DROP hay ALTER các bảng cũ
    (users, classrooms, classroom_members, student_live_sessions, lessons, lesson_progress,
     assignments, submissions, shared_snippets, course_enrollments).
  - Phiên bản hiện tại lưu trong bảng schema_meta (key='schema_version').
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Callable

from sqlalchemy import Column, MetaData, String, Table, select
from sqlalchemy.engine import Connection, Engine

from backend.models.ai_usage import AIUsage

log = logging.getLogger("vcode.migrations")

LEGACY_TABLES = (
    "users", "classrooms", "classroom_members", "student_live_sessions", "lessons",
    "lesson_progress", "assignments", "submissions", "shared_snippets", "course_enrollments",
)

_meta = MetaData()
schema_meta = Table(
    "schema_meta",
    _meta,
    Column("key", String(64), primary_key=True),
    Column("value", String(255), nullable=False),
)


def _m001_ai_usage(conn: Connection) -> None:
    AIUsage.__table__.create(conn, checkfirst=True)


MIGRATIONS: list[tuple[int, str, Callable[[Connection], None]]] = [
    (1, "Tạo bảng ai_usage (hạn mức AI theo ngày)", _m001_ai_usage),
]

LATEST_VERSION = MIGRATIONS[-1][0]


def get_schema_version(conn: Connection) -> int:
    schema_meta.create(conn, checkfirst=True)
    value = conn.execute(select(schema_meta.c.value).where(schema_meta.c.key == "schema_version")).scalar_one_or_none()
    try:
        return int(value) if value is not None else 0
    except ValueError:
        return 0


def _set_version(conn: Connection, version: int) -> None:
    exists = conn.execute(select(schema_meta.c.key).where(schema_meta.c.key == "schema_version")).first()
    if exists:
        conn.execute(schema_meta.update().where(schema_meta.c.key == "schema_version").values(value=str(version)))
    else:
        conn.execute(schema_meta.insert().values(key="schema_version", value=str(version)))
    stamp = datetime.now(timezone.utc).isoformat()
    has_stamp = conn.execute(select(schema_meta.c.key).where(schema_meta.c.key == "migrated_at")).first()
    if has_stamp:
        conn.execute(schema_meta.update().where(schema_meta.c.key == "migrated_at").values(value=stamp))
    else:
        conn.execute(schema_meta.insert().values(key="migrated_at", value=stamp))


def run_migrations(engine: Engine) -> int:
    """Áp dụng các migration còn thiếu. Trả về phiên bản lược đồ sau khi chạy."""
    with engine.begin() as conn:
        current = get_schema_version(conn)
        for version, description, migrate in MIGRATIONS:
            if version <= current:
                continue
            log.info("Áp dụng migration %s: %s", version, description)
            migrate(conn)
            _set_version(conn, version)
            current = version
    return current
