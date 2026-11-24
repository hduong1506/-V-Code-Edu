"""Validate the C / C++ courses and the challenge set of V-Code Edu.

What it checks
  * Schema of data/courses/c.json, data/courses/cpp.json and data/challenges.json (docs/ARCHITECTURE.md §3).
  * Every C/C++ solution passes all of its tests when executed by the in-browser JSCPP interpreter
    (vendor/jscpp, loaded through tests/harness/jscpp.html in a headless browser via Playwright).
  * Every Python challenge solution passes its tests with CPython.
  * No starter passes all tests (starters are scaffolds, not answers).

Usage
  .venv\\Scripts\\python.exe tools/validate_cpp_content.py [--only courses|challenges] [--browser msedge|chrome|chromium] [--skip-jscpp] [-v]

Exit code 0 when everything passes, 1 otherwise.
"""
from __future__ import annotations

import argparse
import functools
import http.server
import json
import re
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSE_FILES = [ROOT / "data" / "courses" / "c.json", ROOT / "data" / "courses" / "cpp.json"]
CHALLENGES_FILE = ROOT / "data" / "challenges.json"
HARNESS = "tests/harness/jscpp.html"

DIFFICULTY_XP = {"easy": 10, "medium": 20, "hard": 30}
ACCENTS = {"blue", "violet", "cyan", "amber", "green", "rose"}
TRACKS = {"programming", "web", "algorithms", "ai"}
PRISM_IDS = {"arrays", "linked-list", "stack-queue", "sorting", "searching", "binary-tree", "bst", "heap",
             "graph", "bfs", "dfs", "hash-table", "recursion", "dp"}
RANKS = {"D", "C", "B", "A", "S", "BOSS"}
WORLD_LANG = {1: "python", 2: "python", 3: "python", 4: "c", 5: "cpp"}


def normalize(text: str) -> str:
    """ARCHITECTURE §3.3: \r\n -> \n, strip trailing spaces per line, drop trailing blank lines."""
    text = str(text).replace("\r\n", "\n").replace("\r", "\n")
    return "\n".join(line.rstrip() for line in text.split("\n")).rstrip("\n")


class Report:
    def __init__(self, verbose: bool):
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.counts = {"runs": 0, "passed_solutions": 0, "starters_ok": 0}
        self.verbose = verbose

    def err(self, msg: str):
        self.errors.append(msg)
        print("  ✗", msg)

    def warn(self, msg: str):
        self.warnings.append(msg)
        if self.verbose:
            print("  !", msg)

    def info(self, msg: str):
        if self.verbose:
            print("   ", msg)


# --------------------------------------------------------------------------- schema
def words_outside_code(md: str) -> int:
    return len(re.sub(r"```.*?```", " ", md, flags=re.S).split())


def check_tests(where: str, tests, rep: Report, lo: int, hi: int):
    if not isinstance(tests, list) or not (lo <= len(tests) <= hi):
        rep.err(f"{where}: needs {lo}-{hi} tests, has {len(tests) if isinstance(tests, list) else 'none'}")
        return
    if not any(t.get("hidden") for t in tests):
        rep.err(f"{where}: needs at least one hidden test")
    if all(t.get("hidden") for t in tests):
        rep.err(f"{where}: needs at least one visible test")
    for i, t in enumerate(tests):
        if set(t) != {"input", "expected", "hidden"}:
            rep.err(f"{where}: test {i} keys {sorted(t)}")
        if not isinstance(t.get("input"), str) or not isinstance(t.get("expected"), str) or not t.get("expected"):
            rep.err(f"{where}: test {i} must have string input and non-empty expected")


def validate_course_schema(course: dict, rep: Report) -> list[dict]:
    cid = course.get("id")
    for key in ("id", "version", "lang", "title", "subtitle", "level", "description", "track", "accent", "tags", "chapters"):
        if key not in course:
            rep.err(f"course {cid}: missing '{key}'")
    if course.get("version") != 2:
        rep.err(f"course {cid}: version must be 2")
    if course.get("lang") not in ("c", "cpp"):
        rep.err(f"course {cid}: lang must be c or cpp for this validator")
    if course.get("track") not in TRACKS:
        rep.err(f"course {cid}: bad track {course.get('track')}")
    if course.get("accent") not in ACCENTS:
        rep.err(f"course {cid}: bad accent {course.get('accent')}")
    lessons = []
    seen = set()
    for ci, ch in enumerate(course.get("chapters", []), start=1):
        if ch.get("id") != f"ch{ci}":
            rep.err(f"course {cid}: chapter {ci} id should be ch{ci}, got {ch.get('id')}")
        for key in ("title", "summary", "lessons"):
            if not ch.get(key):
                rep.err(f"course {cid}/{ch.get('id')}: missing {key}")
        for li, les in enumerate(ch.get("lessons", []), start=1):
            lid = les.get("id")
            where = f"{cid}/{lid}"
            if lid != f"{cid}-{ci}-{li}":
                rep.err(f"{where}: id should be {cid}-{ci}-{li}")
            if lid in seen:
                rep.err(f"{where}: duplicate id")
            seen.add(lid)
            for key in ("title", "difficulty", "xp", "theory", "task", "starter", "solution", "hints", "tests"):
                if key not in les:
                    rep.err(f"{where}: missing {key}")
            if DIFFICULTY_XP.get(les.get("difficulty")) != les.get("xp"):
                rep.err(f"{where}: difficulty/xp mismatch ({les.get('difficulty')}, {les.get('xp')})")
            fence = "```" + course.get("lang", "")
            if fence + "\n" not in les.get("theory", ""):
                rep.err(f"{where}: theory needs a fenced {fence} example")
            wc = words_outside_code(les.get("theory", ""))
            if not 150 <= wc <= 350:
                rep.warn(f"{where}: theory has {wc} words outside code (target 150-350)")
            if "Ví dụ" not in les.get("task", ""):
                rep.err(f"{where}: task needs a 'Ví dụ' section")
            if "Viết" not in les.get("starter", "") and "Gọi" not in les.get("starter", ""):
                rep.err(f"{where}: starter should contain a 'Viết code của em ở đây' style placeholder")
            if not (2 <= len(les.get("hints", [])) <= 3):
                rep.err(f"{where}: needs 2-3 hints")
            if "prism" in les and les["prism"] not in PRISM_IDS:
                rep.err(f"{where}: unknown prism id {les['prism']}")
            check_tests(where, les.get("tests"), rep, 3, 5)
            lessons.append({"where": where, "lang": course.get("lang"), **les})
    return lessons


def validate_challenges_schema(data: dict, rep: Report) -> list[dict]:
    if data.get("version") != 2:
        rep.err("challenges: version must be 2")
    worlds = data.get("worlds", [])
    if [w.get("id") for w in worlds] != [1, 2, 3, 4, 5]:
        rep.err("challenges: worlds must be ids 1..5")
    for w in worlds:
        for key in ("id", "name", "lang", "description"):
            if not w.get(key):
                rep.err(f"world {w.get('id')}: missing {key}")
        if WORLD_LANG.get(w.get("id")) != w.get("lang"):
            rep.err(f"world {w.get('id')}: lang should be {WORLD_LANG.get(w.get('id'))}")
    items = data.get("challenges", [])
    if len(items) != 100:
        rep.err(f"challenges: expected 100 items, got {len(items)}")
    out = []
    for i, ch in enumerate(items, start=1):
        where = f"challenge {ch.get('id')}"
        if ch.get("id") != f"stage-{i}" or ch.get("stage") != i:
            rep.err(f"{where}: id/stage should be stage-{i}/{i}")
        for key in ("id", "stage", "world", "lang", "rank", "boss", "xp", "title", "task", "starter", "solution", "hints", "tests", "tags"):
            if key not in ch:
                rep.err(f"{where}: missing {key}")
        if WORLD_LANG.get(ch.get("world")) != ch.get("lang"):
            rep.err(f"{where}: lang {ch.get('lang')} does not match world {ch.get('world')}")
        if ch.get("rank") not in RANKS:
            rep.err(f"{where}: bad rank {ch.get('rank')}")
        if bool(ch.get("boss")) != (ch.get("rank") == "BOSS"):
            rep.err(f"{where}: boss flag must match rank BOSS")
        if not isinstance(ch.get("xp"), int) or ch["xp"] <= 0:
            rep.err(f"{where}: xp must be a positive int")
        if "Ví dụ" not in ch.get("task", ""):
            rep.err(f"{where}: task needs a 'Ví dụ' section")
        if not (1 <= len(ch.get("hints", [])) <= 3):
            rep.err(f"{where}: needs 1-3 hints")
        if not isinstance(ch.get("tags"), list) or not ch.get("tags"):
            rep.err(f"{where}: needs tags")
        check_tests(where, ch.get("tests"), rep, 2, 5)
        out.append({"where": where, **ch})
    return out


# --------------------------------------------------------------------------- runners
def run_python(code: str, stdin: str, timeout: float = 5.0) -> tuple[str, str | None]:
    try:
        r = subprocess.run([sys.executable, "-I", "-c", code], input=stdin, capture_output=True, text=True,
                           timeout=timeout, encoding="utf-8")
    except subprocess.TimeoutExpired:
        return "", "timeout"
    return r.stdout, (r.stderr.strip()[-300:] or f"exit {r.returncode}") if r.returncode != 0 else None


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):  # noqa: D401 - silence request logs
        pass


def start_server() -> tuple[http.server.ThreadingHTTPServer, str]:
    port = free_port()
    handler = functools.partial(QuietHandler, directory=str(ROOT))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd, f"http://127.0.0.1:{port}/{HARNESS}"


def launch_browser(p, preferred: str | None):
    order = [preferred] if preferred else ["msedge", "chrome", "chromium"]
    last = None
    for name in order:
        try:
            if name == "chromium":
                return p.chromium.launch()
            return p.chromium.launch(channel=name)
        except Exception as exc:  # pragma: no cover - depends on machine
            last = exc
    raise RuntimeError(f"No usable browser for Playwright: {last}")


def run_items(items: list[dict], page, rep: Report):
    for it in items:
        lang = it["lang"]
        tests = it["tests"]
        ok_all = True
        t0 = time.time()
        for idx, t in enumerate(tests):
            if lang == "python":
                out, error = run_python(it["solution"], t["input"])
            else:
                res = page.evaluate("([c, i]) => window.runCpp(c, i, 5000)", [it["solution"], t["input"]])
                out, error = res["stdout"], res["error"]
            rep.counts["runs"] += 1
            if error or normalize(out) != normalize(t["expected"]):
                ok_all = False
                rep.err(f"{it['where']}: solution fails test {idx} ({'hidden' if t['hidden'] else 'visible'})"
                        f" error={error!r} got={normalize(out)[:120]!r} expected={t['expected'][:120]!r}")
        if ok_all:
            rep.counts["passed_solutions"] += 1
        # starter must not pass every test
        starter_passes = True
        for t in tests:
            if lang == "python":
                out, error = run_python(it["starter"], t["input"])
            else:
                res = page.evaluate("([c, i]) => window.runCpp(c, i, 5000)", [it["starter"], t["input"]])
                out, error = res["stdout"], res["error"]
            rep.counts["runs"] += 1
            if error or normalize(out) != normalize(t["expected"]):
                starter_passes = False
                break
        if starter_passes:
            rep.err(f"{it['where']}: starter passes all tests (it must be a scaffold, not a solution)")
        else:
            rep.counts["starters_ok"] += 1
        rep.info(f"{it['where']}: {'OK' if ok_all else 'FAIL'} in {time.time() - t0:.1f}s")


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--only", choices=["courses", "challenges"])
    ap.add_argument("--browser", choices=["msedge", "chrome", "chromium"])
    ap.add_argument("--skip-jscpp", action="store_true", help="schema + CPython checks only (no browser)")
    ap.add_argument("-v", "--verbose", action="store_true")
    args = ap.parse_args()
    rep = Report(args.verbose)

    items: list[dict] = []
    if args.only in (None, "courses"):
        for f in COURSE_FILES:
            print(f"Schema: {f.relative_to(ROOT)}")
            items += validate_course_schema(json.loads(f.read_text(encoding="utf-8")), rep)
    if args.only in (None, "challenges"):
        print(f"Schema: {CHALLENGES_FILE.relative_to(ROOT)}")
        items += validate_challenges_schema(json.loads(CHALLENGES_FILE.read_text(encoding="utf-8")), rep)

    cpp_items = [i for i in items if i["lang"] in ("c", "cpp")]
    py_items = [i for i in items if i["lang"] == "python"]

    if py_items:
        print(f"CPython: {len(py_items)} Python challenge(s)")
        run_items(py_items, None, rep)

    if cpp_items and args.skip_jscpp:
        print(f"JSCPP: skipped {len(cpp_items)} C/C++ item(s) (--skip-jscpp)")
        items = [i for i in items if i["lang"] == "python"]
    elif cpp_items:
        from playwright.sync_api import sync_playwright

        httpd, url = start_server()
        try:
            with sync_playwright() as p:
                browser = launch_browser(p, args.browser)
                page = browser.new_page()
                page.goto(url)
                page.wait_for_function("window.harnessReady === true", timeout=30000)
                print(f"JSCPP: {len(cpp_items)} C/C++ item(s) via {url}")
                run_items(cpp_items, page, rep)
                browser.close()
        finally:
            httpd.shutdown()

    print()
    print(f"Items: {len(items)}  (C/C++: {0 if args.skip_jscpp else len(cpp_items)}, Python: {len(py_items)})")
    print(f"Program runs: {rep.counts['runs']}")
    print(f"Solutions passing all tests: {rep.counts['passed_solutions']}/{len(items)}")
    print(f"Starters correctly failing: {rep.counts['starters_ok']}/{len(items)}")
    if rep.warnings:
        print(f"Warnings: {len(rep.warnings)} (use -v to list)")
    if rep.errors:
        print(f"FAILED with {len(rep.errors)} error(s)")
        return 1
    print("ALL CHECKS PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
