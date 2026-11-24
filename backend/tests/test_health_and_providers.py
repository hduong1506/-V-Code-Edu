from backend.ai.prompts import MODE_IDS
from backend.core.config import parse_dotenv, settings_from_env

from .conftest import FakeProvider


def test_health_reports_providers(build_client):
    client = build_client([FakeProvider("gemini"), FakeProvider("ollama", kind="local", available=False)])
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["version"]
    assert body["time"].endswith("Z")
    assert body["ai"]["providers"] == [
        {"id": "gemini", "kind": "cloud", "available": True},
        {"id": "ollama", "kind": "local", "available": False},
    ]


def test_providers_listing_and_modes(build_client):
    client = build_client([FakeProvider("openai", available=False), FakeProvider("anthropic"), FakeProvider("ollama", kind="local")])
    body = client.get("/api/ai/providers").json()
    assert [p["id"] for p in body["providers"]] == ["openai", "anthropic", "ollama"]
    assert body["default"] == "anthropic"
    for p in body["providers"]:
        assert set(p) == {"id", "label", "kind", "model", "available"}
    assert [m["id"] for m in body["modes"]] == list(MODE_IDS)
    assert set(MODE_IDS) == {"tutor", "reviewer", "debugger", "algorithm", "learning", "project", "knowledge"}
    assert all(m["label"] and m["description"] for m in body["modes"])


def test_providers_default_none_when_nothing_available(build_client):
    client = build_client([FakeProvider("gemini", available=False)])
    assert client.get("/api/ai/providers").json()["default"] is None


def test_security_headers_and_cors(build_client):
    client = build_client()
    r = client.get("/api/health")
    assert r.headers["x-content-type-options"] == "nosniff"
    assert r.headers["referrer-policy"] == "strict-origin-when-cross-origin"
    assert r.headers["x-frame-options"] == "SAMEORIGIN"
    assert "cross-origin-opener-policy" not in r.headers
    assert "cross-origin-embedder-policy" not in r.headers

    pre = client.options("/api/ai/chat", headers={
        "Origin": "http://localhost:5500", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type"})
    assert pre.status_code == 200
    assert pre.headers["access-control-allow-origin"] == "http://localhost:5500"
    assert "access-control-allow-credentials" not in pre.headers

    bad = client.options("/api/ai/chat", headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "POST"})
    assert "access-control-allow-origin" not in bad.headers


def test_dotenv_parser_and_settings():
    parsed = parse_dotenv('# c\nA=1\nexport B="two words"\nC=x # cmt\nBAD LINE\nD=\n')
    assert parsed == {"A": "1", "B": "two words", "C": "x", "D": ""}
    s = settings_from_env({"AI_PROVIDER_ORDER": "Ollama, gemini", "AI_DAILY_LIMIT_GUEST": "-5", "TRUST_PROXY": "yes",
                           "ALLOWED_ORIGINS": "https://a.vn,https://b.vn", "OPENAI_TOKEN_PARAM": "weird"})
    assert s.ai_provider_order == ("ollama", "gemini")
    assert s.ai_daily_limit_guest == 0
    assert s.trust_proxy is True
    assert s.allowed_origins == ("https://a.vn", "https://b.vn")
    assert s.openai_token_param == "max_tokens"
    d = settings_from_env({})
    assert d.firebase_project_id == "v-code-edu"
    assert d.anthropic_model == "claude-opus-5-5"
    assert d.gemini_model == "gemini-2.5-flash"
    assert "https://v-code-edu.web.app" in d.allowed_origins
