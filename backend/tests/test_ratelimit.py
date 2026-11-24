from backend.core.ratelimit import MinuteRateLimiter

from .conftest import FakeProvider, user_msg


def test_minute_limit_returns_429_with_retry_after(build_client):
    client = build_client(ai_rate_per_minute=2)
    assert client.post("/api/ai/chat", json=user_msg()).status_code == 200
    assert client.post("/api/ai/chat", json=user_msg()).status_code == 200
    r = client.post("/api/ai/chat", json=user_msg())
    assert r.status_code == 429
    assert r.json()["detail"]["code"] == "rate_limited"
    assert int(r.headers["retry-after"]) >= 1
    assert r.json()["detail"]["retry_after"] >= 1


def test_minute_slot_released_when_no_provider_starts(build_client):
    client = build_client([FakeProvider("gemini", fail_before=True)], ai_rate_per_minute=1)
    assert client.post("/api/ai/chat", json=user_msg()).status_code == 503
    assert client.post("/api/ai/chat", json=user_msg()).status_code == 503  # không phải 429


def test_guest_daily_quota(build_client):
    client = build_client(ai_daily_limit_guest=2)
    assert client.post("/api/ai/chat", json=user_msg()).status_code == 200
    usage = client.get("/api/ai/usage").json()
    assert usage == {**usage, "limit": 2, "used": 1, "remaining": 1, "subject": "guest"}
    assert usage["reset_at"].endswith("T00:00:00Z")
    assert client.post("/api/ai/chat", json=user_msg()).status_code == 200
    r = client.post("/api/ai/chat", json=user_msg())
    assert r.status_code == 429
    detail = r.json()["detail"]
    assert detail["code"] == "rate_limited" and detail["remaining"] == 0
    assert "Đăng nhập" in detail["message"]
    assert int(r.headers["retry-after"]) > 0
    assert client.get("/api/ai/usage").json()["remaining"] == 0


def test_daily_quota_persists_across_app_restart(build_client):
    first = build_client(ai_daily_limit_guest=1)
    assert first.post("/api/ai/chat", json=user_msg()).status_code == 200
    second = build_client(ai_daily_limit_guest=1)  # cùng tệp CSDL tạm
    assert second.post("/api/ai/chat", json=user_msg()).status_code == 429


def test_zero_guest_limit_blocks_guests(build_client):
    client = build_client(ai_daily_limit_guest=0)
    assert client.post("/api/ai/chat", json=user_msg()).status_code == 429


def test_forwarded_for_only_trusted_when_enabled(build_client):
    untrusted = build_client(ai_daily_limit_guest=1)
    assert untrusted.post("/api/ai/chat", json=user_msg(), headers={"X-Forwarded-For": "1.1.1.1"}).status_code == 200
    # cùng IP thật (testclient) → bị chặn dù đổi X-Forwarded-For
    assert untrusted.post("/api/ai/chat", json=user_msg(), headers={"X-Forwarded-For": "2.2.2.2"}).status_code == 429


def test_forwarded_for_trusted_proxy(build_client):
    trusted = build_client(ai_daily_limit_guest=1, trust_proxy=True)
    assert trusted.post("/api/ai/chat", json=user_msg(), headers={"X-Forwarded-For": "3.3.3.3, 10.0.0.1"}).status_code == 200
    assert trusted.post("/api/ai/chat", json=user_msg(), headers={"X-Forwarded-For": "4.4.4.4"}).status_code == 200
    assert trusted.post("/api/ai/chat", json=user_msg(), headers={"X-Forwarded-For": "3.3.3.3"}).status_code == 429


def test_minute_limiter_window_and_release():
    now = [0.0]
    limiter = MinuteRateLimiter(2, clock=lambda: now[0])
    assert limiter.acquire("a") == (True, 0)
    assert limiter.acquire("a") == (True, 0)
    ok, retry = limiter.acquire("a")
    assert not ok and 1 <= retry <= 61
    assert limiter.acquire("b")[0]
    limiter.release("a")
    assert limiter.acquire("a")[0]
    now[0] = 61.0
    assert limiter.acquire("a")[0] and limiter.acquire("a")[0]
