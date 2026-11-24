"""Bảo đảm backend mới KHÔNG làm thay đổi dữ liệu cũ trong vcode_edu.db.

Kiểm thử làm việc trên BẢN SAO tạm của vcode_edu.db (kèm tệp -wal nếu có); tệp thật chỉ được đọc để sao chép.
"""
import shutil
import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import inspect

from backend.core.config import BASE_DIR
from backend.database.connection import Database
from backend.database.migrations import LATEST_VERSION, LEGACY_TABLES, run_migrations

from .conftest import user_msg

REAL_DB = BASE_DIR / "vcode_edu.db"


def _snapshot(path: Path) -> dict:
    con = sqlite3.connect(path)
    try:
        tables = {name: sql for name, sql in con.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")}
        counts = {t: con.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0] for t in tables if t in LEGACY_TABLES}
        digests = {t: con.execute(f'SELECT * FROM "{t}" ORDER BY rowid').fetchall() for t in counts}
        return {"schemas": {t: tables[t] for t in counts}, "counts": counts, "rows": digests, "all_tables": set(tables)}
    finally:
        con.close()


@pytest.fixture
def legacy_copy(tmp_path):
    if not REAL_DB.is_file():
        pytest.skip("Không có vcode_edu.db để kiểm thử")
    dst = tmp_path / "legacy_copy.db"
    shutil.copy2(REAL_DB, dst)
    wal = REAL_DB.with_name(REAL_DB.name + "-wal")
    if wal.is_file():
        shutil.copy2(wal, dst.with_name(dst.name + "-wal"))
    return dst


def test_app_startup_does_not_touch_legacy_tables(build_client, legacy_copy):
    before = _snapshot(legacy_copy)
    assert before["counts"], "bản sao phải chứa bảng cũ"
    client = build_client(database_url=f"sqlite:///{legacy_copy.as_posix()}")
    # khởi động (migration) + một lượt chat ghi vào ai_usage
    assert client.post("/api/ai/chat", json=user_msg()).status_code == 200
    client.__exit__(None, None, None)
    after = _snapshot(legacy_copy)
    assert after["schemas"] == before["schemas"]
    assert after["counts"] == before["counts"]
    assert after["rows"] == before["rows"]
    assert {"ai_usage", "schema_meta"} <= after["all_tables"]
    assert before["all_tables"] - after["all_tables"] == set()  # không bảng nào bị xóa


def test_migrations_are_idempotent(legacy_copy):
    db = Database(f"sqlite:///{legacy_copy.as_posix()}")
    try:
        assert run_migrations(db.engine) == LATEST_VERSION
        assert run_migrations(db.engine) == LATEST_VERSION
        names = set(inspect(db.engine).get_table_names())
        assert set(LEGACY_TABLES) & names  # bảng cũ vẫn còn
        assert "ai_usage" in names
    finally:
        db.dispose()


def test_fresh_database_gets_only_new_tables(tmp_path):
    db = Database(f"sqlite:///{(tmp_path / 'fresh.db').as_posix()}")
    try:
        run_migrations(db.engine)
        assert set(inspect(db.engine).get_table_names()) == {"ai_usage", "schema_meta"}
    finally:
        db.dispose()
