"""Browser validation of the HTML & CSS course (data/courses/web.json).

For every web lesson:
  * the reference solution passes ALL checks, both in a same-origin iframe and in a
    sandboxed iframe (sandbox="allow-scripts", like the in-app grader);
  * the starter fails AT LEAST ONE check.

Runs a local static server on port 5602 and drives the system Microsoft Edge via Playwright:
    .venv\\Scripts\\python.exe -m pytest tests/e2e/test_web_lessons.py -q
"""
from __future__ import annotations

import json
import socket
import subprocess
import sys
import time
from pathlib import Path

import pytest

playwright_sync = pytest.importorskip("playwright.sync_api")

ROOT = Path(__file__).resolve().parents[2]
PORT = 5602
COURSE = json.loads((ROOT / "data" / "courses" / "web.json").read_text(encoding="utf-8"))
LESSONS = [les for ch in COURSE["chapters"] for les in ch["lessons"]]


def _wait_port(port: int, timeout: float = 15.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", port)) == 0:
                return
        time.sleep(0.15)
    raise RuntimeError(f"server on port {port} did not start")


@pytest.fixture(scope="session")
def base_url():
    proc = subprocess.Popen(
        [sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1"],
        cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )
    try:
        _wait_port(PORT)
        yield f"http://127.0.0.1:{PORT}"
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=5)
        except subprocess.TimeoutExpired:
            proc.kill()


@pytest.fixture(scope="session")
def page(base_url):
    with playwright_sync.sync_playwright() as p:
        browser = p.chromium.launch(channel="msedge", headless=True)
        pg = browser.new_page()
        errors: list[str] = []
        pg.on("pageerror", lambda exc: errors.append(str(exc)))
        pg.goto(f"{base_url}/tests/harness/html-checks.html")
        pg.wait_for_function("window.harnessReady === true", timeout=15000)
        pg.harness_errors = errors  # type: ignore[attr-defined]
        yield pg
        browser.close()


def evaluate(page, html: str, checks: list, mode: str) -> list[dict]:
    return page.evaluate("([h, c, m]) => window.evaluateLesson(h, c, m)", [html, checks, mode])


@pytest.mark.parametrize("lesson", LESSONS, ids=[les["id"] for les in LESSONS])
@pytest.mark.parametrize("mode", ["same-origin", "sandbox"])
def test_solution_passes_all_checks(page, lesson, mode):
    results = evaluate(page, lesson["solution"], lesson["checks"], mode)
    failed = [r["message"] for r in results if not r["ok"]]
    assert len(results) == len(lesson["checks"])
    assert not failed, f"{lesson['id']} ({mode}): lời giải không đạt: {failed}"


@pytest.mark.parametrize("lesson", LESSONS, ids=[les["id"] for les in LESSONS])
@pytest.mark.parametrize("mode", ["same-origin", "sandbox"])
def test_starter_fails_some_check(page, lesson, mode):
    results = evaluate(page, lesson["starter"], lesson["checks"], mode)
    assert any(not r["ok"] for r in results), f"{lesson['id']} ({mode}): starter đã đạt mọi kiểm tra"


def test_harness_has_no_page_errors(page):
    assert not page.harness_errors, page.harness_errors
