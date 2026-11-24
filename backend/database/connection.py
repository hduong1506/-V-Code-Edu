"""Kết nối CSDL: SQLite (mặc định, tệp vcode_edu.db), MySQL (mysql+pymysql://) hoặc PostgreSQL (postgresql://).

Engine được tạo theo cấu hình của từng ứng dụng (create_app) để kiểm thử có thể dùng CSDL tạm.
"""
from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

from fastapi import Request
from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker


def normalize_database_url(url: str) -> str:
    url = (url or "").strip()
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    if url.startswith("mysql://"):
        return url.replace("mysql://", "mysql+pymysql://", 1)
    return url


def create_db_engine(url: str) -> Engine:
    url = normalize_database_url(url)
    if url.startswith("sqlite"):
        engine = create_engine(url, connect_args={"check_same_thread": False, "timeout": 15}, future=True)
        in_memory = url in ("sqlite://", "sqlite:///:memory:")

        @event.listens_for(engine, "connect")
        def _sqlite_pragmas(dbapi_connection, _record):  # noqa: ANN001
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA foreign_keys=ON")
            if not in_memory:
                cursor.execute("PRAGMA journal_mode=WAL")
            cursor.close()

        return engine
    # MySQL / PostgreSQL: connection pool cho lượng truy cập lớn (cần cài driver tương ứng).
    return create_engine(url, pool_size=10, max_overflow=20, pool_pre_ping=True, pool_recycle=1800, future=True)


class Database:
    def __init__(self, url: str):
        self.url = normalize_database_url(url)
        self.engine = create_db_engine(self.url)
        self._sessionmaker = sessionmaker(bind=self.engine, autocommit=False, autoflush=False, expire_on_commit=False)

    @contextmanager
    def session(self) -> Iterator[Session]:
        s = self._sessionmaker()
        try:
            yield s
        except Exception:
            s.rollback()
            raise
        finally:
            s.close()

    def dispose(self) -> None:
        self.engine.dispose()


def get_db(request: Request) -> Iterator[Session]:
    """Phụ thuộc FastAPI: phiên CSDL của ứng dụng hiện tại."""
    database: Database = request.app.state.database
    with database.session() as s:
        yield s
