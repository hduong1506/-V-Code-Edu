"""E2E tests for the Đấu trường (challenge lobby + match page). Never signs in or writes to Firebase.

Run (server on :8000):  .venv\\Scripts\\python -m pytest tests/e2e/test_challenges.py -q
"""
import json
import os
import re
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get("VCODE_BASE_URL", "http://localhost:8000")
ROOT = Path(__file__).resolve().parents[2]
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(exist_ok=True)
IGNORED = ("favicon", "net::ERR", "Failed to load resource", "[sw]", "WebGPU", "status of 503", "status of 404")
DATA = json.loads((ROOT / "data/challenges.json").read_text(encoding="utf-8"))


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        yield b
        b.close()


@pytest.fixture()
def page(browser):
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="vi-VN")
    pg = ctx.new_page()
    pg.errors = []
    pg.on("console", lambda m: pg.errors.append(m.text) if m.type == "error" and not any(s in m.text for s in IGNORED) else None)
    pg.on("pageerror", lambda e: pg.errors.append(f"pageerror: {e}"))
    yield pg
    ctx.close()


def go(page, route, sel):
    page.goto(f"{BASE}/#{route}", wait_until="domcontentloaded")
    page.wait_for_selector(sel, timeout=30000, state="attached")
    page.wait_for_timeout(300)


def test_lobby_renders_all_cards_daily_and_player(page):
    go(page, "/challenges", ".stage-card")
    assert page.locator(".stage-card").count() == len(DATA["challenges"]) == 100
    expect(page.locator("[data-arena-daily]")).to_be_visible()
    expect(page.locator(".ar-daily")).to_contain_text("Thử thách hôm nay")
    assert re.search(r"\d{2}:\d{2}:\d{2}", page.locator(".ar-daily__time").inner_text())
    daily_id = page.locator("[data-arena-daily]").get_attribute("data-arena-daily")
    assert daily_id in {c["id"] for c in DATA["challenges"]}
    # stable for the day: reload picks the same challenge
    page.reload(wait_until="domcontentloaded")
    page.wait_for_selector("[data-arena-daily]")
    assert page.locator("[data-arena-daily]").get_attribute("data-arena-daily") == daily_id
    expect(page.locator(".ar-player")).to_contain_text("Khách")
    expect(page.locator("[data-arena-play]")).to_have_attribute("href", "#/challenges/stage-1")
    assert page.locator(".ar-map").count() == len(DATA["worlds"])
    assert page.locator(".ar-boss").count() == sum(1 for c in DATA["challenges"] if c.get("boss") or c["rank"] == "BOSS")
    assert page.locator(".ar-medal").count() >= 10
    page.screenshot(path=str(SHOTS / "arena_lobby.png"))
    assert not page.errors, page.errors


def test_lobby_filters(page):
    go(page, "/challenges", ".stage-card")
    page.click(".ar-chip[data-rank='BOSS']")
    expect(page.locator(".stage-card")).to_have_count(5)
    assert page.locator(".stage-card.is-boss").count() == 5
    page.click(".ar-chip[data-rank='BOSS']")  # toggle off
    expect(page.locator(".stage-card")).to_have_count(100)
    page.click(".ar-map[data-world='4']")
    expect(page.locator(".stage-card")).to_have_count(20)
    assert all(c["lang"] == "c" for c in DATA["challenges"] if c["world"] == 4)
    expect(page.locator(".ar-world-banner")).to_contain_text("Pháo Đài")
    page.click(".ar-chip[data-rank='D']")
    expected = sum(1 for c in DATA["challenges"] if c["world"] == 4 and c["rank"] == "D")
    expect(page.locator(".stage-card")).to_have_count(expected)
    page.click(".ar-filters .ar-btn--ghost")  # reset
    expect(page.locator(".stage-card")).to_have_count(100)
    page.fill(".ar-search input", "khoi dong")  # accent-insensitive search
    expect(page.locator(".stage-card[data-id='stage-1']")).to_be_visible()
    page.fill(".ar-search input", "")
    page.click(".ar-seg button[data-status='done']")
    expect(page.locator(".stage-card")).to_have_count(0)
    expect(page.locator(".ar-grid .ar-empty")).to_be_visible()
    page.click(".ar-seg button[data-status='todo']")
    expect(page.locator(".stage-card")).to_have_count(100)
    assert not page.errors, page.errors


def test_solve_first_challenge_shows_victory(page):
    ch = next(c for c in DATA["challenges"] if c["id"] == "stage-1")
    go(page, "/challenges/stage-1", ".workbench .code-editor__input")
    expect(page.locator(".ar-hud__num")).to_have_text("#001")
    assert page.locator(".ar-round").count() == len(ch["tests"])
    page.evaluate("""(code) => { const t = document.querySelector('.workbench .code-editor__input');
        t.value = code; t.dispatchEvent(new Event('input', { bubbles: true })); }""", ch["solution"])
    page.click(".wb-actions .btn--primary")
    overlay = page.locator(".ar-result")
    expect(overlay).to_have_class(re.compile("is-win"), timeout=120000)
    expect(overlay).to_contain_text("Chiến thắng")
    expect(overlay.locator(".ar-result__stat.is-xp")).to_contain_text(str(ch["xp"]), timeout=5000)
    assert page.locator(".ar-result .ar-round.is-pass").count() == len(ch["tests"])
    page.screenshot(path=str(SHOTS / "arena_victory.png"))
    # progress recorded locally → lobby shows it
    page.click("[data-result-action='lobby']")
    page.wait_for_selector(".stage-card[data-id='stage-1'].is-done", timeout=15000)
    expect(page.locator("[data-arena-play]")).to_have_attribute("href", "#/challenges/stage-2")
    expect(page.locator(".ar-medal[data-ach='first']")).to_have_class(re.compile("is-on"))
    assert not page.errors, page.errors


def test_wrong_answer_shows_defeat(page):
    go(page, "/challenges/stage-1", ".workbench .code-editor__input")
    page.evaluate("""() => { const t = document.querySelector('.workbench .code-editor__input');
        t.value = "print('sai')\\n"; t.dispatchEvent(new Event('input', { bubbles: true })); }""")
    page.click(".wb-actions .btn--primary")
    overlay = page.locator(".ar-result")
    expect(overlay).to_have_class(re.compile("is-loss"), timeout=120000)
    expect(overlay).to_contain_text(re.compile(r"Thất bại.*0/\d+ bài kiểm tra", re.I | re.S))
    page.keyboard.press("Escape")
    expect(overlay).to_have_count(0)
    assert not page.errors, page.errors


def test_mobile_lobby_and_match_no_overflow(browser):
    ctx = browser.new_context(viewport={"width": 360, "height": 780}, device_scale_factor=2)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    for route, sel in [("/challenges", ".stage-card"), ("/challenges/stage-65", ".ar-mtabs")]:
        pg.goto(f"{BASE}/#{route}", wait_until="domcontentloaded")
        pg.wait_for_selector(sel, timeout=30000)
        pg.wait_for_timeout(500)
        if route != "/challenges":
            pg.click(".ar-mtabs button:nth-child(2)")
            expect(pg.locator(".workbench")).to_be_visible()
        # measured on the page root (the shared top nav is owned elsewhere)
        overflow = pg.evaluate("(() => { const r = document.querySelector('.page-root--challenges'); return r.scrollWidth - r.clientWidth; })()")
        assert overflow <= 1, f"horizontal overflow {overflow}px on {route}"
    ctx.close()
    assert not errors, errors
