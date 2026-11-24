import json
import sqlite3

from backend.scripts.export_legacy_sqlite import export_legacy


def test_export_excludes_secrets(tmp_path):
    db = tmp_path / "legacy.db"
    con = sqlite3.connect(db)
    con.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT, password_hash TEXT, api_key TEXT, full_name TEXT)")
    con.execute("INSERT INTO users VALUES (1, 'a@b.vn', 'salt$hash', 'k', 'An')")
    con.execute("CREATE TABLE classrooms (id INTEGER PRIMARY KEY, code TEXT)")
    con.execute("INSERT INTO classrooms VALUES (1, 'TIN10')")
    con.execute("CREATE TABLE unrelated (x TEXT)")
    con.commit()
    con.close()
    out = tmp_path / "out.json"
    counts = export_legacy(db, out)
    assert counts == {"users": 1, "classrooms": 1}
    data = json.loads(out.read_text(encoding="utf-8"))
    user = data["tables"]["users"]["rows"][0]
    assert user == {"id": 1, "email": "a@b.vn", "full_name": "An"}
    assert set(data["tables"]["users"]["excluded_columns"]) == {"password_hash", "api_key"}
    assert "salt$hash" not in out.read_text(encoding="utf-8")
    assert "unrelated" not in data["tables"]
