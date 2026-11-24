"""Xuất dữ liệu các bảng CŨ trong vcode_edu.db ra JSON để lưu trữ (không mất dữ liệu khi chuyển kiến trúc).

- Chỉ ĐỌC cơ sở dữ liệu (mở ở chế độ read-only; nếu không được thì đọc từ bản sao tạm).
- LOẠI BỎ mọi cột bí mật: password_hash và các cột có tên chứa password/secret/token/api_key.
- Tệp kết quả chứa email & họ tên người dùng → là dữ liệu cá nhân, KHÔNG commit lên Git.

Cách dùng (từ thư mục gốc dự án):
    python -m backend.scripts.export_legacy_sqlite
    python -m backend.scripts.export_legacy_sqlite --db vcode_edu.db --out archive/legacy-v25/sqlite-export.json
"""
from __future__ import annotations

import argparse
import json
import re
import shutil
import sqlite3
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]
LEGACY_TABLES = (
    "users", "classrooms", "classroom_members", "student_live_sessions", "lessons",
    "lesson_progress", "assignments", "submissions", "shared_snippets", "course_enrollments",
)
SECRET_COLUMN = re.compile(r"(password|secret|token|api_?key|salt)", re.IGNORECASE)


def _connect_readonly(db_path: Path) -> tuple[sqlite3.Connection, Path | None]:
    try:
        con = sqlite3.connect(f"file:{db_path.as_posix()}?mode=ro", uri=True)
        con.execute("SELECT 1 FROM sqlite_master LIMIT 1").fetchone()
        return con, None
    except sqlite3.Error:
        tmp_dir = Path(tempfile.mkdtemp(prefix="vcode_export_"))
        copy = tmp_dir / db_path.name
        shutil.copy2(db_path, copy)
        wal = db_path.with_name(db_path.name + "-wal")
        if wal.is_file():
            shutil.copy2(wal, copy.with_name(copy.name + "-wal"))
        return sqlite3.connect(copy), tmp_dir


def export_legacy(db_path: Path, out_path: Path) -> dict[str, int]:
    if not db_path.is_file():
        raise FileNotFoundError(f"Không tìm thấy cơ sở dữ liệu: {db_path}")
    con, tmp_dir = _connect_readonly(db_path)
    con.row_factory = sqlite3.Row
    try:
        existing = {r[0] for r in con.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        tables: dict[str, dict] = {}
        counts: dict[str, int] = {}
        for table in LEGACY_TABLES:
            if table not in existing:
                continue
            columns = [r[1] for r in con.execute(f'PRAGMA table_info("{table}")')]
            kept = [c for c in columns if not SECRET_COLUMN.search(c)]
            excluded = [c for c in columns if c not in kept]
            col_sql = ", ".join(f'"{c}"' for c in kept)
            rows = [dict(r) for r in con.execute(f'SELECT {col_sql} FROM "{table}" ORDER BY rowid')]
            tables[table] = {"columns": kept, "excluded_columns": excluded, "rows": rows}
            counts[table] = len(rows)
    finally:
        con.close()
        if tmp_dir:
            shutil.rmtree(tmp_dir, ignore_errors=True)

    payload = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "source": db_path.name,
        "note": "Bản xuất dữ liệu cũ (V-Code Edu v25). Đã loại bỏ mật khẩu băm và cột bí mật. Chứa dữ liệu cá nhân — không chia sẻ công khai.",
        "counts": counts,
        "tables": tables,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    return counts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Xuất dữ liệu cũ từ vcode_edu.db ra JSON (không kèm mật khẩu).")
    parser.add_argument("--db", default=str(BASE_DIR / "vcode_edu.db"))
    parser.add_argument("--out", default=str(BASE_DIR / "archive" / "legacy-v25" / "sqlite-export.json"))
    args = parser.parse_args(argv)
    counts = export_legacy(Path(args.db).resolve(), Path(args.out).resolve())
    print(f"Đã xuất {sum(counts.values())} dòng vào {args.out}")
    for table, n in counts.items():
        print(f"  {table}: {n}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
