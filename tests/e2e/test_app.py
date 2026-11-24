"""End-to-end smoke tests for the V-Code Edu frontend (real browser: system Microsoft Edge via Playwright).

Run (backend must serve the frontend on port 8000, or set VCODE_BASE_URL):
    .venv\\Scripts\\python.exe -m uvicorn backend.main:app --port 8000
    .venv\\Scripts\\python.exe -m pytest tests/e2e/test_app.py -q

Screenshots go to tests/e2e/screenshots/ (git-ignored).
These tests never sign in or write to Firebase.
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

IGNORED_CONSOLE = (
    "favicon", "ERR_INTERNET_DISCONNECTED", "net::ERR", "Failed to load resource", "[sw]", "WebGPU",
    "status of 503", "status of 404", "Download the React DevTools",
)


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        yield b
        b.close()


@pytest.fixture()
def page(browser):
    ctx = browser.new_context(viewport={"width": 1366, "height": 860}, locale="vi-VN")
    pg = ctx.new_page()
    pg.errors = []

    def on_console(msg):
        if msg.type == "error" and not any(s in msg.text for s in IGNORED_CONSOLE):
            pg.errors.append(f"console: {msg.text}")

    pg.on("console", on_console)
    pg.on("pageerror", lambda e: pg.errors.append(f"pageerror: {e}"))
    yield pg
    ctx.close()


def go(page, route, wait_for=None, timeout=20000):
    page.goto(f"{BASE}/#{route}")
    if wait_for:
        page.wait_for_selector(wait_for, timeout=timeout)
    page.wait_for_timeout(300)


def load_json(rel):
    return json.loads((ROOT / rel).read_text(encoding="utf-8"))


def set_editor(page, code, selector=".workbench .code-editor__input"):
    ta = page.locator(selector).first
    ta.click()
    page.evaluate("([sel, code]) => { const t = document.querySelector(sel); t.value = code; t.dispatchEvent(new Event('input', { bubbles: true })); }", [selector, code])


# ---------------------------------------------------------------- pages render
@pytest.mark.parametrize("route,selector", [
    ("/", ".home-title"),
    ("/learn", ".course-card"),
    ("/learn/python", ".chapter"),
    ("/challenges", ".stage-card"),
    ("/workspace", ".workspace .code-editor"),
    ("/prism", ".pz-topic-card"),
    ("/ai", ".chat"),
    ("/classroom", ".classroom-landing, .role-options, .page-header"),
    ("/account", ".account-layout"),
    ("/does-not-exist", ".empty-state"),
])
def test_routes_render_without_errors(page, route, selector):
    go(page, route, selector)
    name = route.strip("/").replace("/", "_") or "home"
    page.screenshot(path=str(SHOTS / f"route_{name}.png"), full_page=False)
    assert not page.errors, page.errors


def test_learn_lists_all_courses(page):
    go(page, "/learn", ".course-card")
    idx = load_json("data/courses/index.json")
    assert page.locator(".course-card").count() == len(idx["courses"])


def test_theme_toggle_switches_and_persists(page):
    go(page, "/", ".home-title")
    page.evaluate("localStorage.setItem('vc-theme', 'light')")
    page.reload()
    page.wait_for_selector(".home-title")
    assert page.evaluate("document.documentElement.dataset.theme") == "light"
    page.click("[data-theme-toggle]")  # light -> dark
    assert page.evaluate("document.documentElement.dataset.theme") == "dark"
    page.reload()
    page.wait_for_selector(".home-title")
    assert page.evaluate("document.documentElement.dataset.theme") == "dark"
    page.screenshot(path=str(SHOTS / "home_dark.png"))
    for route, sel in [("/prism/sorting", ".pz-bar"), ("/workspace", ".code-editor"), ("/ai", ".chat"), ("/learn", ".course-card")]:
        go(page, route, sel)
        page.screenshot(path=str(SHOTS / f"dark_{route.strip('/').replace('/', '_')}.png"))
    assert not page.errors, page.errors


# ---------------------------------------------------------------- real code execution + grading
def test_python_lesson_solution_passes(page):
    course = load_json("data/courses/python.json")
    lesson = course["chapters"][0]["lessons"][0]
    go(page, f"/learn/python/{lesson['id']}", ".workbench")
    set_editor(page, lesson["solution"])
    page.click(".wb-actions .btn--primary")
    page.wait_for_selector(".grade-summary", timeout=120000)
    expect(page.locator(".grade-summary")).to_have_class(re.compile("is-pass"), timeout=120000)
    page.screenshot(path=str(SHOTS / "lesson_python_pass.png"))
    assert not page.errors, page.errors


def test_python_starter_does_not_pass_and_run_works(page):
    course = load_json("data/courses/python.json")
    lesson = course["chapters"][1]["lessons"][0]
    go(page, f"/learn/python/{lesson['id']}", ".workbench")
    page.click(".wb-actions .btn--soft")  # run sample
    page.wait_for_selector(".terminal__badge", timeout=120000)
    page.wait_for_function("document.querySelector('.terminal__badge') && !/Đang chạy/.test(document.querySelector('.terminal__badge').textContent)", timeout=120000)
    page.click(".wb-actions .btn--primary")
    page.wait_for_selector(".grade-summary", timeout=120000)
    expect(page.locator(".grade-summary")).to_have_class(re.compile("is-fail"))


def test_pyvn_lesson_solution_passes(page):
    course = load_json("data/courses/pyvn.json")
    lesson = course["chapters"][1]["lessons"][0]
    go(page, f"/learn/pyvn/{lesson['id']}", ".workbench")
    set_editor(page, lesson["solution"])
    page.click(".wb-actions .btn--primary")
    expect(page.locator(".grade-summary")).to_have_class(re.compile("is-pass"), timeout=120000)


def test_cpp_lesson_and_c_challenge_pass_in_jscpp(page):
    cpp = load_json("data/courses/cpp.json")
    lesson = cpp["chapters"][2]["lessons"][1]
    go(page, f"/learn/cpp/{lesson['id']}", ".workbench")
    set_editor(page, lesson["solution"])
    page.click(".wb-actions .btn--primary")
    expect(page.locator(".grade-summary")).to_have_class(re.compile("is-pass"), timeout=60000)
    ch = next(c for c in load_json("data/challenges.json")["challenges"] if c["id"] == "stage-65")
    go(page, "/challenges/stage-65", ".workbench")
    set_editor(page, ch["solution"])
    page.click(".wb-actions .btn--primary")
    expect(page.locator(".grade-summary")).to_have_class(re.compile("is-pass"), timeout=60000)
    page.screenshot(path=str(SHOTS / "challenge_c_pass.png"))
    assert not page.errors, page.errors


def test_web_lesson_checks_pass(page):
    web = load_json("data/courses/web.json")
    lesson = web["chapters"][2]["lessons"][0]
    go(page, f"/learn/web/{lesson['id']}", ".workbench")
    set_editor(page, lesson["solution"])
    page.click(".wb-actions .btn--primary")
    expect(page.locator(".grade-summary")).to_have_class(re.compile("is-pass"), timeout=30000)
    page.screenshot(path=str(SHOTS / "lesson_web_pass.png"))


def test_progress_is_saved_locally(page):
    course = load_json("data/courses/python.json")
    lesson = course["chapters"][0]["lessons"][1]
    go(page, f"/learn/python/{lesson['id']}", ".workbench")
    set_editor(page, lesson["solution"])
    page.click(".wb-actions .btn--primary")
    expect(page.locator(".grade-summary")).to_have_class(re.compile("is-pass"), timeout=120000)
    go(page, "/learn/python", ".chapter")
    expect(page.locator(".lesson-row.is-done").first).to_be_visible()


# ---------------------------------------------------------------- workspace
@pytest.mark.parametrize("lang,code,stdin,expect_text", [
    ("javascript", "const n = Number(input());\nconsole.log('KQ', n * 2);", "21", "KQ 42"),
    ("sql", "SELECT COUNT(*) AS so_hs FROM hoc_sinh;", "", "so_hs"),
    ("cpp", "#include <iostream>\nusing namespace std;\nint main(){ int a,b; cin>>a>>b; cout<<a+b<<endl; return 0; }", "40 2", "42"),
    ("python", "print(sum(range(10)))", "", "45"),
])
def test_workspace_runs_languages(page, lang, code, stdin, expect_text):
    go(page, f"/workspace?lang={lang}", ".workspace .code-editor")
    set_editor(page, code, ".workspace__editor .code-editor__input")
    if lang not in ("sql",):
        page.fill(".workspace__stdin textarea", stdin)
    page.click(".workspace__bar .btn--primary")
    expect(page.locator(".terminal__body")).to_contain_text(expect_text, timeout=120000)
    assert not page.errors, page.errors


def test_workspace_infinite_loop_is_stopped(page):
    go(page, "/workspace?lang=javascript", ".workspace .code-editor")
    set_editor(page, "while (true) {}", ".workspace__editor .code-editor__input")
    page.click(".workspace__bar .btn--primary")
    expect(page.locator(".terminal__body")).to_contain_text("Hết thời gian", timeout=20000)


def test_workspace_share_link_roundtrip(page):
    go(page, "/workspace?lang=python", ".workspace .code-editor")
    set_editor(page, "print('chia se thanh cong')", ".workspace__editor .code-editor__input")
    page.click("text=Chia sẻ")
    url = page.locator(".modal input.input").input_value()
    assert "#/workspace?lang=python&code=" in url
    page.goto(url)
    page.wait_for_selector(".workspace .code-editor")
    page.wait_for_timeout(500)
    assert "chia se thanh cong" in page.locator(".workspace__editor .code-editor__input").input_value()


# ---------------------------------------------------------------- Prism
def test_prism_every_algorithm_runs(page):
    go(page, "/prism", ".pz-topic-card")
    topics = page.evaluate("import('/js/pages/prism/catalog.js').then(m => m.PRISM_TOPICS.map(t => [t.id, t.algorithms.map(a => a.id)]))")
    for tid, algos in topics:
        for aid in algos:
            go(page, f"/prism/{tid}/{aid}", ".pz-stage__canvas")
            counter = page.locator(".pz-counter").inner_text()
            total = int(counter.split("/")[1].strip())
            assert total >= 2, f"{tid}/{aid} has only {total} frames"
            page.keyboard.press("ArrowRight")
            page.keyboard.press("ArrowRight")
            assert page.locator(".pz-counter").inner_text().startswith("3 /"), f"{tid}/{aid} step failed"
            page.keyboard.press("ArrowLeft")
            assert page.locator(".pz-counter").inner_text().startswith("2 /")
            page.click("text=Ngẫu nhiên")
            page.wait_for_timeout(120)
    assert not page.errors, page.errors


def test_prism_custom_input_validation_and_controls(page):
    go(page, "/prism/sorting/bubble", ".pz-stage__canvas")
    page.fill("#pz-in-arr", "5 x 3")
    page.click("text=Áp dụng & chạy")
    expect(page.locator("[data-err='arr']")).to_contain_text("không phải")
    page.fill("#pz-in-arr", "9 1 8 2")
    page.click("text=Áp dụng & chạy")
    page.wait_for_timeout(1500)
    page.click(".pz-play")  # pause
    page.select_option(".pz-controls select", "4")
    page.click("[aria-label='Về đầu (R)']")
    assert page.locator(".pz-counter").inner_text().startswith("1 /")
    page.click("text=Mã nguồn")
    page.click(".segmented >> text=C++")
    expect(page.locator(".pz-detail-body pre")).to_contain_text("bubbleSort")
    page.screenshot(path=str(SHOTS / "prism_bubble.png"), full_page=True)


# ---------------------------------------------------------------- AI chat UI (no provider configured on test server)
def test_ai_chat_shows_clear_error_without_provider(page):
    go(page, "/ai", ".chat")
    page.fill(".chat-input", "Xin chào V-Mentor")
    page.keyboard.press("Enter")
    expect(page.locator(".msg--user")).to_contain_text("Xin chào V-Mentor")
    expect(page.locator(".msg--ai .callout--danger")).to_be_visible(timeout=20000)
    # conversation persisted in history sidebar
    expect(page.locator(".ai-conv")).to_have_count(1)
    page.reload()
    page.wait_for_selector(".ai-conv")
    expect(page.locator(".ai-conv").first).to_contain_text("Xin chào V-Mentor")
    page.screenshot(path=str(SHOTS / "ai_no_provider.png"))


def test_markdown_renderer_is_xss_safe(page):
    go(page, "/", ".home-title")
    html = page.evaluate("""import('/js/components/markdown.js').then(m => m.markdown(
        '# Tiêu đề\\n<img src=x onerror=alert(1)>\\n[bấm](javascript:alert(1))\\n\\n| a | b |\\n|---|---|\\n| 1 | 2 |\\n\\n```python\\nprint(\"<b>\")\\n```\\n\\n$x^2$'))""")
    assert "<img" not in html and "onerror" not in html.replace("&lt;img src=x onerror=alert(1)&gt;", "")
    assert "javascript:" not in html
    assert "<table>" in html and "code-block" in html and "math-inline" in html


# ---------------------------------------------------------------- responsive
def test_mobile_layouts(browser):
    ctx = browser.new_context(viewport={"width": 375, "height": 780}, device_scale_factor=2)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    for route, sel in [("/", ".home-title"), ("/learn", ".course-card"), ("/prism/graph/dijkstra", ".pz-stage__canvas"), ("/workspace", ".code-editor"), ("/ai", ".chat")]:
        pg.goto(f"{BASE}/#{route}")
        pg.wait_for_selector(sel, timeout=20000)
        pg.wait_for_timeout(400)
        overflow = pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        pg.screenshot(path=str(SHOTS / f"mobile_{route.strip('/').replace('/', '_') or 'home'}.png"))
        assert overflow <= 1, f"horizontal overflow {overflow}px on {route}"
    ctx.close()
    assert not errors, errors


# ---------------------------------------------------------------- offline (service worker)
def test_offline_after_first_visit(browser):
    ctx = browser.new_context(viewport={"width": 1280, "height": 800})
    pg = ctx.new_page()
    pg.goto(f"{BASE}/#/")
    pg.wait_for_selector(".home-title")
    pg.evaluate("navigator.serviceWorker.ready")
    pg.wait_for_timeout(3000)  # let the install step finish precaching
    pg.reload()
    pg.wait_for_selector(".home-title")
    assert pg.evaluate("!!navigator.serviceWorker.controller"), "service worker did not take control"
    # visit workspace once online so its modules are cached
    pg.goto(f"{BASE}/#/workspace?lang=javascript")
    pg.wait_for_selector(".workspace .code-editor")
    pg.wait_for_timeout(800)
    ctx.set_offline(True)
    pg.reload()
    pg.wait_for_selector(".workspace .code-editor", timeout=20000)
    assert pg.evaluate("navigator.onLine") is False
    expect(pg.locator("[data-net-pill]")).to_be_visible()
    pg.evaluate("""() => { const t = document.querySelector('.workspace__editor .code-editor__input'); t.value = 'console.log(6*7)'; t.dispatchEvent(new Event('input', {bubbles:true})); }""")
    pg.click(".workspace__bar .btn--primary")
    expect(pg.locator(".terminal__body")).to_contain_text("42", timeout=15000)
    pg.goto(f"{BASE}/#/prism/sorting/quick")
    pg.wait_for_selector(".pz-bar", timeout=20000)
    pg.screenshot(path=str(SHOTS / "offline_prism.png"))
    ctx.set_offline(False)
    ctx.close()
