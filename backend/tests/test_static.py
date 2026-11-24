import pytest


@pytest.fixture
def frontend(tmp_path):
    root = tmp_path / "frontend"
    files = {
        "index.html": "<!doctype html><title>V-Code</title>",
        "sw.js": "self.addEventListener('fetch',()=>{})",
        "manifest.json": '{"name":"V-Code Edu"}',
        "js/main.js": "export const x = 1;",
        "css/app.css": "body{}",
        "data/courses/index.json": "{}",
        "assets/logo.png": "png",
        "vendor/sqljs/sql-wasm.wasm": "wasm",
        "docs/ARCHITECTURE.md": "# doc",
        "js/.secret": "hidden",
        # Không bao giờ được phục vụ:
        "vcode_edu.db": "SQLite format 3",
        ".env": "GEMINI_API_KEY=secret",
        "backend/main.py": "print('x')",
        "archive/legacy-v25/vcode_edu.backup.db": "x",
        ".venv/pyvenv.cfg": "x",
        ".git/config": "x",
        "tools/build.py": "x",
        "tests/x.py": "x",
    }
    for rel, content in files.items():
        p = root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(content, encoding="utf-8")
    return root


def test_whitelisted_files_are_served(build_client, frontend):
    client = build_client(serve_frontend=True, frontend_dir=frontend)
    r = client.get("/")
    assert r.status_code == 200 and "V-Code" in r.text
    assert r.headers["content-type"].startswith("text/html")
    assert client.get("/index.html").status_code == 200
    js = client.get("/js/main.js")
    assert js.status_code == 200 and js.headers["content-type"].startswith("text/javascript")
    assert client.get("/css/app.css").headers["content-type"].startswith("text/css")
    assert client.get("/data/courses/index.json").headers["content-type"].startswith("application/json")
    assert client.get("/vendor/sqljs/sql-wasm.wasm").headers["content-type"] == "application/wasm"
    assert client.get("/docs/ARCHITECTURE.md").status_code == 200
    assert client.get("/assets/logo.png").status_code == 200
    m = client.get("/manifest.json")
    assert m.status_code == 200 and m.headers["content-type"].startswith("application/manifest+json")


def test_service_worker_headers(build_client, frontend):
    client = build_client(serve_frontend=True, frontend_dir=frontend)
    r = client.get("/sw.js")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-cache"
    assert r.headers["service-worker-allowed"] == "/"
    assert r.headers["content-type"].startswith("text/javascript")


@pytest.mark.parametrize("path", [
    "/vcode_edu.db", "/.env", "/backend/main.py", "/archive/legacy-v25/vcode_edu.backup.db",
    "/.venv/pyvenv.cfg", "/.git/config", "/tools/build.py", "/tests/x.py", "/js/.secret",
    "/js/../vcode_edu.db", "/js/%2e%2e/vcode_edu.db", "/css/..%2f.env", "/README.md",
])
def test_everything_else_is_404(build_client, frontend, path):
    client = build_client(serve_frontend=True, frontend_dir=frontend)
    r = client.get(path)
    assert r.status_code == 404, path
    assert "secret" not in r.text and "SQLite" not in r.text


def test_api_takes_precedence_and_docs_moved(build_client, frontend):
    client = build_client(serve_frontend=True, frontend_dir=frontend)
    assert client.get("/api/health").json()["status"] == "ok"
    assert client.get("/api/docs").status_code == 200
    assert client.get("/api/openapi.json").status_code == 200


def test_frontend_disabled(build_client, frontend):
    client = build_client(serve_frontend=False, frontend_dir=frontend)
    assert client.get("/").status_code == 404
    assert client.get("/js/main.js").status_code == 404


def test_missing_index_is_404(build_client, tmp_path):
    empty = tmp_path / "empty"
    empty.mkdir()
    client = build_client(serve_frontend=True, frontend_dir=empty)
    assert client.get("/").status_code == 404
    assert client.get("/js/anything.js").status_code == 404
