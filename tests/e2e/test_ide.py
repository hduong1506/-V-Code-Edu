"""E2E tests for the professional IDE (#/workspace) and the shared editor / workbench features.

Run (frontend served on port 8000, or set VCODE_BASE_URL):
    .venv\\Scripts\\python.exe -m pytest tests/e2e/test_ide.py -q
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
TA = ".workspace__editor .code-editor__input"

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
    ctx = browser.new_context(viewport={"width": 1440, "height": 900}, locale="vi-VN")
    pg = ctx.new_page()
    pg.errors = []
    pg.on("console", lambda m: pg.errors.append(f"console: {m.text}") if m.type == "error" and not any(s in m.text for s in IGNORED_CONSOLE) else None)
    pg.on("pageerror", lambda e: pg.errors.append(f"pageerror: {e}"))
    yield pg
    ctx.close()


def open_ws(page, query="lang=python"):
    page.goto(f"{BASE}/#/workspace?{query}")
    page.wait_for_selector(".workspace .code-editor", timeout=20000)
    page.wait_for_timeout(400)


def set_code(page, code, selector=TA):
    page.evaluate("([sel, code]) => { const t = document.querySelector(sel); t.value = code; t.dispatchEvent(new Event('input', { bubbles: true })); }", [selector, code])


def value(page, selector=TA):
    return page.locator(selector).input_value()


def test_editor_theme_toggle_persists_everywhere(page):
    open_ws(page)
    page.evaluate("localStorage.removeItem('vc-editor-theme')")
    page.reload()
    page.wait_for_selector(".workspace .code-editor")
    assert page.get_attribute(".workspace .code-editor", "data-editor-theme") == "auto"
    btn = page.locator(".ide-theme-btn").first
    btn.click()  # auto -> light
    assert page.get_attribute(".workspace .code-editor", "data-editor-theme") == "light"
    btn.click()  # light -> dark
    assert page.get_attribute(".workspace .code-editor", "data-editor-theme") == "dark"
    assert page.evaluate("localStorage.getItem('vc-editor-theme')") == "dark"
    bg = page.evaluate("getComputedStyle(document.querySelector('.workspace .code-editor')).backgroundColor")
    assert bg == "rgb(14, 19, 34)", bg  # Night palette
    page.reload()
    page.wait_for_selector(".workspace .code-editor")
    assert page.get_attribute(".workspace .code-editor", "data-editor-theme") == "dark"
    # the same preference applies to lesson editors
    course = json.loads((ROOT / "data/courses/python.json").read_text(encoding="utf-8"))
    page.goto(f"{BASE}/#/learn/python/{course['chapters'][0]['lessons'][0]['id']}")
    page.wait_for_selector(".workbench .code-editor")
    assert page.get_attribute(".workbench .code-editor", "data-editor-theme") == "dark"
    assert not page.errors, page.errors


def test_errors_tab_explains_name_error_and_jumps_to_line(page):
    open_ws(page)
    set_code(page, "tong = 0\nfor i in range(3):\n    tong += i\nprint('Tong la', tongg)\n")
    page.fill(".workspace__stdin textarea", "")
    page.click(".workspace__bar .btn--primary")
    card = page.locator(".pb-runtime")
    expect(card).to_be_visible(timeout=120000)
    expect(card).to_contain_text("Không tìm thấy tên 'tongg'")
    expect(card).to_contain_text("Dòng 4")
    expect(card).to_contain_text("Có phải ý em là 'tong'?")
    expect(card.locator(".pb-code")).to_contain_text("print('Tong la', tongg)")
    expect(page.locator(".ws-ptab[aria-selected='true']")).to_contain_text("Lỗi & Gỡ lỗi")
    expect(page.locator(".terminal__body")).to_contain_text("NameError")
    expect(page.locator(".pb-runtime button:has-text('Hỏi V-Mentor về lỗi này')")).to_be_visible()
    # static check found the same problem and marks the gutter
    expect(page.locator(".code-editor__gutter span.is-error, .code-editor__gutter span.has-error").first).to_have_text("4")
    page.click(".pb-runtime .pb-goto")
    sel = page.evaluate(f"(() => {{ const t = document.querySelector('{TA}'); return t.value.slice(t.selectionStart, t.selectionEnd); }})()")
    assert sel == "print('Tong la', tongg)"
    page.screenshot(path=str(SHOTS / "ide_errors.png"))
    assert not page.errors, page.errors


def test_input_hint_and_eof_explanation(page):
    open_ws(page, "lang=python")
    set_code(page, "n = int(input())\nprint(n * 2)\n")
    page.fill(".workspace__stdin textarea", "")
    expect(page.locator(".ws-stdin__need")).to_be_visible()
    page.click(".workspace__bar .btn--primary")
    expect(page.locator(".pb-runtime")).to_contain_text("Thiếu dữ liệu vào", timeout=120000)
    expect(page.locator(".terminal__body")).to_contain_text("Chương trình cần dữ liệu vào")


def test_autocomplete_inserts_suggestion_and_snippet(page):
    open_ws(page)
    set_code(page, "")
    page.click(TA)
    page.keyboard.type("pri")
    expect(page.locator(".workspace .ac")).to_be_visible()
    expect(page.locator(".workspace .ac__item.is-active")).to_contain_text("print")
    page.keyboard.press("Enter")
    assert value(page) == "print()"
    expect(page.locator(".workspace .ac")).to_be_hidden()
    page.keyboard.type('"ok"')
    page.keyboard.press("End")
    page.keyboard.press("Enter")
    page.keyboard.type("for")
    expect(page.locator(".workspace .ac__item.is-active")).to_contain_text("for")
    page.keyboard.press("Tab")
    assert 'print("ok")\nfor i in range(n):\n    ' == value(page)
    # the placeholder "n" is selected so typing replaces it
    page.keyboard.type("5")
    assert "range(5)" in value(page)


def test_format_document_reindents_c_and_keeps_python_semantics(page):
    open_ws(page, "lang=c")
    set_code(page, "#include <stdio.h>\nint main(){\nint a=1;\nif(a){\nprintf(\"x\");\n}\nreturn 0;\n}\n")
    page.click(TA)
    page.keyboard.press("Shift+Alt+F")
    assert value(page) == "#include <stdio.h>\nint main(){\n    int a=1;\n    if(a){\n        printf(\"x\");\n    }\n    return 0;\n}\n"
    page.keyboard.press("Control+z")
    assert "\nint a=1;" in value(page)  # one undo step restores the original
    open_ws(page, "lang=python")
    set_code(page, "def f():\n\tif True:   \n\t\treturn 1  \nprint(f())\n")
    page.click(".ws-tool[aria-label^='Định dạng mã']")
    assert value(page) == "def f():\n    if True:\n        return 1\nprint(f())\n"


def test_find_replace_counts_and_replaces(page):
    open_ws(page)
    set_code(page, "a = 1\nb = a + a\nprint(a)\n")
    page.click(TA)
    page.keyboard.press("Control+h")
    page.keyboard.type("a")
    page.locator(".fb input[aria-label='Tìm trong mã']").fill("a")
    page.click(".fb button[aria-label='Phân biệt chữ hoa/thường'], .fb .fb__opt >> nth=1")  # whole word
    expect(page.locator(".fb__count")).to_have_text(re.compile(r"\d+/4"))
    page.locator(".fb input[aria-label='Thay thế bằng']").fill("x")
    page.click(".fb button[aria-label^='Thay tất cả']")
    assert value(page) == "x = 1\nb = x + x\nprint(x)\n"


def test_line_shortcuts_duplicate_move_comment(page):
    open_ws(page)
    set_code(page, "a = 1\nb = 2\n")
    page.click(TA)
    page.keyboard.press("Control+Home")
    page.keyboard.press("Control+d")
    assert value(page) == "a = 1\na = 1\nb = 2\n"
    page.keyboard.press("Alt+ArrowDown")  # the duplicate (caret line) moves below "b = 2"
    assert value(page) == "a = 1\nb = 2\na = 1\n"
    page.keyboard.press("Control+/")
    assert value(page) == "a = 1\nb = 2\n# a = 1\n"


def test_multiple_files_import_and_persist(page):
    open_ws(page, "lang=python")
    page.click(".ws-files__btn[aria-label='Tạo tệp mới']")
    page.locator(".modal input.input").fill("tien_ich.py")
    page.click(".modal .btn--primary")
    expect(page.locator(".ws-ftab.is-active")).to_contain_text("tien_ich.py")
    set_code(page, "def gap_doi(x):\n    return x * 2\n")
    page.click(".ws-ftab:has-text('main.py')")
    set_code(page, "import tien_ich\nprint('KQ', tien_ich.gap_doi(21))\n")
    page.click(".workspace__bar .btn--primary")
    expect(page.locator(".terminal__body")).to_contain_text("KQ 42", timeout=120000)
    page.wait_for_timeout(700)  # autosave debounce
    page.reload()
    page.wait_for_selector(".workspace .code-editor")
    expect(page.locator(".ws-ftab")).to_have_count(2)
    # rename + duplicate + delete via the file menu
    page.click(".ws-ftab:has-text('tien_ich.py')")
    page.click(".ws-files__btn[aria-label='Thao tác với tệp']")
    page.click(".ide-pop .menu__item:has-text('Nhân bản tệp')")
    expect(page.locator(".ws-ftab")).to_have_count(3)
    expect(page.locator(".ws-ftab.is-active")).to_contain_text("tien_ich_ban_sao.py")
    page.click(".ws-ftab.is-active .ws-ftab__close")
    page.click(".modal .btn--danger")
    expect(page.locator(".ws-ftab")).to_have_count(2)
    assert not page.errors, page.errors


def test_legacy_draft_record_is_migrated(page):
    open_ws(page, "lang=javascript")
    page.evaluate("""() => new Promise((res) => { const r = indexedDB.open('vcode-edu'); r.onsuccess = () => { const tx = r.result.transaction('drafts', 'readwrite');
        tx.objectStore('drafts').put({ key: 'workspace:sql', code: 'SELECT 42 AS cu;', stdin: '', lang: 'sql', updatedAt: Date.now() }); tx.oncomplete = res; }; })""")
    page.select_option(".ws-lang", "sql")
    expect(page.locator(".ws-ftab.is-active")).to_contain_text("main.sql")
    assert value(page) == "SELECT 42 AS cu;"


def test_mode_switching_shows_studio_or_graceful_state(page):
    open_ws(page)
    page.click(".ws-mode[data-mode='flowchart']")
    expect(page.locator(".workspace[data-mode='flowchart'] .ws-studio")).to_be_visible()
    expect(page.locator(".ws-studio__slot:not([hidden])")).not_to_be_empty()
    page.wait_for_timeout(1200)
    slot = page.locator(".ws-studio__slot:not([hidden])")
    assert slot.locator(".ws-studio__state.is-error").count() or slot.locator(":scope > *:not(.ws-studio__state)").count(), "studio neither loaded nor showed a message"
    # editor stays visible on the left
    expect(page.locator(".workspace__editor .code-editor")).to_be_visible()
    page.click(".ws-mode[data-mode='scratch']")
    expect(page.locator(".workspace[data-mode='scratch'] .ws-studio")).to_be_visible()
    # persisted mode + maximise
    page.click(".ws-max")
    expect(page.locator(".workspace.is-studio-max")).to_have_count(1)
    page.click(".ws-max")
    page.reload()
    page.wait_for_selector(".workspace .code-editor")
    expect(page.locator(".workspace")).to_have_attribute("data-mode", "scratch")
    # ?view= overrides the persisted mode
    page.goto(f"{BASE}/#/workspace?view=code")
    page.wait_for_timeout(500)
    expect(page.locator(".workspace")).to_have_attribute("data-mode", "code")
    page.screenshot(path=str(SHOTS / "ide_modes.png"))
    assert not page.errors, page.errors


def test_splitter_resize_is_persisted(page):
    open_ws(page, "lang=python&view=code")
    sp = page.locator(".ws-splitter").bounding_box()
    page.mouse.move(sp["x"] + 2, sp["y"] + 200)
    page.mouse.down()
    page.mouse.move(sp["x"] - 300, sp["y"] + 200, steps=5)
    page.mouse.up()
    frac = page.evaluate("JSON.parse(localStorage.getItem('vc-ws-layout')).split.code")
    assert 0.3 < frac < 0.5, frac


def test_workbench_has_errors_tab(page):
    course = json.loads((ROOT / "data/courses/python.json").read_text(encoding="utf-8"))
    lesson = course["chapters"][1]["lessons"][0]
    page.goto(f"{BASE}/#/learn/python/{lesson['id']}")
    page.wait_for_selector(".workbench")
    set_code(page, "print(10 / 0)\n", ".workbench .code-editor__input")
    page.click(".wb-actions .btn--soft")
    page.wait_for_selector(".terminal__badge.is-err", timeout=120000)
    page.click(".wb-tabs .tab:has-text('Lỗi')")
    expect(page.locator(".workbench .pb-runtime")).to_contain_text("Chia cho 0")
    assert not page.errors, page.errors


def test_mobile_bottom_switcher(browser):
    ctx = browser.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    pg = ctx.new_page()
    errors = []
    pg.on("pageerror", lambda e: errors.append(str(e)))
    pg.goto(f"{BASE}/#/workspace?lang=python&view=code")
    pg.wait_for_selector(".workspace .code-editor")
    expect(pg.locator(".ws-mobilebar")).to_be_visible()
    pg.click(".ws-mobilebar__btn:has-text('Kết quả')")
    expect(pg.locator(".workspace__side")).to_be_visible()
    expect(pg.locator(".workspace__editor .code-editor")).to_be_hidden()
    assert pg.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth") <= 1
    ctx.close()
    assert not errors, errors
