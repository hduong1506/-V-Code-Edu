"""Validate V-Code Edu content (data/courses/*.json, data/challenges.json).

Checks (see docs/ARCHITECTURE.md §3):
  * schema of every course file (including ones written by other authors) and of challenges.json
  * unique lesson ids, id format, xp/difficulty consistency, at least one hidden test
  * Unicode NFC normalization of all text (expected outputs must be NFC)
  * for python / pyvn courses: every solution passes all its tests under CPython, every
    starter differs from its solution and does NOT pass all tests
  * for web courses: tests == [], checks use only the DSL types of js/runtime/html-checks.js
    (browser evaluation lives in tests/e2e/test_web_lessons.py)

Usage:
    python tools/validate_content.py                 # validate everything
    python tools/validate_content.py --course python # only one course
    python tools/validate_content.py --run-challenges  # also execute python challenge solutions
Exit code 0 when no errors (warnings allowed), 1 otherwise.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from pyvn import translate  # noqa: E402

COURSES_DIR = ROOT / "data" / "courses"
CHALLENGES = ROOT / "data" / "challenges.json"

LANGS = {"python", "pyvn", "web", "c", "cpp"}
RUNNABLE = {"python", "pyvn"}
TRACKS = {"programming", "web", "algorithms", "ai"}
ACCENTS = {"blue", "violet", "cyan", "amber", "green", "rose"}
DIFFICULTY_XP = {"easy": 10, "medium": 20, "hard": 30}
PRISM_TOPICS = {"arrays", "linked-list", "stack-queue", "sorting", "searching", "binary-tree", "bst",
                "heap", "graph", "bfs", "dfs", "hash-table", "recursion", "dp"}
CHECK_TYPES = {"exists", "count", "text", "attr", "style", "js"}
CHALLENGE_LANGS = {"python", "pyvn", "c", "cpp", "javascript"}
RANKS = {"D", "C", "B", "A", "S", "BOSS", "SS"}
TIMEOUT = 5


class Report:
    def __init__(self) -> None:
        self.errors: list[str] = []
        self.warnings: list[str] = []
        self.stats: dict[str, str] = {}

    def err(self, where: str, msg: str) -> None:
        self.errors.append(f"[LỖI] {where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"[CẢNH BÁO] {where}: {msg}")


def normalize_output(s: str) -> str:
    s = s.replace("\r\n", "\n").replace("\r", "\n")
    return "\n".join(line.rstrip() for line in s.split("\n")).rstrip("\n")


def run_python(code: str, stdin: str, workdir: str) -> tuple[bool, str]:
    try:
        r = subprocess.run(
            [sys.executable, "-X", "utf8", "-I", "-c", code],
            input=stdin.encode("utf-8"), capture_output=True, timeout=TIMEOUT, cwd=workdir,
        )
    except subprocess.TimeoutExpired:
        return False, "quá thời gian (timeout)"
    out = r.stdout.decode("utf-8", "replace")
    if r.returncode != 0:
        tail = r.stderr.decode("utf-8", "replace").strip().splitlines()[-1:] or ["?"]
        return False, f"lỗi chạy: {tail[0]}"
    return True, out


def is_str(v) -> bool:
    return isinstance(v, str) and v.strip() != ""


def check_nfc(rep: Report, where: str, obj) -> None:
    if isinstance(obj, str):
        if unicodedata.normalize("NFC", obj) != obj:
            rep.err(where, "văn bản chưa chuẩn hóa Unicode NFC")
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            check_nfc(rep, where, v)
    elif isinstance(obj, dict):
        for v in obj.values():
            check_nfc(rep, where, v)


def validate_tests(rep: Report, where: str, tests, require_hidden: bool = True) -> None:
    if not isinstance(tests, list) or not tests:
        rep.err(where, "cần ít nhất một test")
        return
    for i, t in enumerate(tests):
        if not isinstance(t, dict) or not isinstance(t.get("input"), str) or not isinstance(t.get("expected"), str) \
                or not isinstance(t.get("hidden"), bool):
            rep.err(where, f"test #{i + 1} phải có dạng {{input: str, expected: str, hidden: bool}}")
    if require_hidden and not any(isinstance(t, dict) and t.get("hidden") is True for t in tests):
        rep.err(where, "cần ít nhất một test ẩn (hidden: true)")


def validate_checks(rep: Report, where: str, checks) -> None:
    if not isinstance(checks, list) or not checks:
        rep.err(where, "bài web cần danh sách checks không rỗng")
        return
    for i, c in enumerate(checks):
        tag = f"{where} check #{i + 1}"
        if not isinstance(c, dict) or c.get("type") not in CHECK_TYPES:
            rep.err(tag, f"type không hợp lệ (chỉ dùng {sorted(CHECK_TYPES)})")
            continue
        t = c["type"]
        if t != "js" and not is_str(c.get("selector")):
            rep.err(tag, "thiếu selector")
        if t == "count" and c.get("min") is None and c.get("max") is None:
            rep.err(tag, "count cần min hoặc max")
        if t == "text" and c.get("equals") is None and c.get("includes") is None:
            rep.err(tag, "text cần equals hoặc includes")
        if t == "attr" and not is_str(c.get("name")):
            rep.err(tag, "attr cần name")
        if t == "style" and (not is_str(c.get("property")) or (c.get("equals") is None and not isinstance(c.get("oneOf"), list))):
            rep.err(tag, "style cần property và equals/oneOf")
        if t == "js" and not is_str(c.get("expr")):
            rep.err(tag, "js cần expr")
        if not is_str(c.get("message")):
            rep.warn(tag, "nên có message thân thiện cho học sinh")


def validate_course(rep: Report, path: Path, seen_ids: set[str]) -> list[dict]:
    """Validate schema; returns the runnable lessons (with lang) for execution checks."""
    name = path.name
    try:
        course = json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        rep.err(name, f"không đọc được JSON: {exc}")
        return []
    cid = course.get("id")
    if cid != path.stem:
        rep.err(name, f"id '{cid}' phải trùng tên tệp '{path.stem}'")
    if course.get("version") != 2:
        rep.err(name, "version phải là 2")
    lang = course.get("lang")
    if lang not in LANGS:
        rep.err(name, f"lang '{lang}' không hợp lệ")
    for key in ("title", "subtitle", "level", "description"):
        if not is_str(course.get(key)):
            rep.err(name, f"thiếu trường '{key}'")
    if course.get("track") not in TRACKS:
        rep.err(name, f"track '{course.get('track')}' không hợp lệ")
    if course.get("accent") not in ACCENTS:
        rep.err(name, f"accent '{course.get('accent')}' không hợp lệ")
    if not isinstance(course.get("tags"), list):
        rep.err(name, "tags phải là danh sách")
    chapters = course.get("chapters")
    if not isinstance(chapters, list) or not chapters:
        rep.err(name, "cần ít nhất một chương")
        return []
    check_nfc(rep, name, course)

    runnable = []
    lesson_count = 0
    for ci, ch in enumerate(chapters, start=1):
        cwhere = f"{name} › {ch.get('id', f'chương {ci}')}"
        if ch.get("id") != f"ch{ci}":
            rep.err(cwhere, f"id chương phải là 'ch{ci}'")
        if not is_str(ch.get("title")) or not is_str(ch.get("summary")):
            rep.err(cwhere, "chương cần title và summary")
        lessons = ch.get("lessons")
        if not isinstance(lessons, list) or not lessons:
            rep.err(cwhere, "chương cần ít nhất một bài")
            continue
        for li, les in enumerate(lessons, start=1):
            lesson_count += 1
            lid = les.get("id", f"?{ci}-{li}")
            where = f"{name} › {lid}"
            if not isinstance(lid, str) or not re.fullmatch(rf"{re.escape(str(cid))}-\d+-\d+", lid):
                rep.err(where, f"id phải có dạng '{cid}-<chương>-<số>'")
            elif lid != f"{cid}-{ci}-{li}":
                rep.warn(where, f"id nên là '{cid}-{ci}-{li}' theo vị trí")
            if lid in seen_ids:
                rep.err(where, "id bị trùng")
            seen_ids.add(lid)
            diff = les.get("difficulty")
            if diff not in DIFFICULTY_XP:
                rep.err(where, f"difficulty '{diff}' không hợp lệ")
            elif les.get("xp") != DIFFICULTY_XP[diff]:
                rep.err(where, f"xp phải là {DIFFICULTY_XP[diff]} với độ khó {diff}")
            for key in ("title", "theory", "task", "starter", "solution"):
                if not is_str(les.get(key)):
                    rep.err(where, f"thiếu '{key}'")
            hints = les.get("hints")
            if not isinstance(hints, list) or not all(is_str(h) for h in hints) or not hints:
                rep.err(where, "hints phải là danh sách chuỗi không rỗng")
            elif len(hints) < 2:
                rep.warn(where, "nên có 2–3 gợi ý")
            if les.get("starter", "").strip() == les.get("solution", "").strip():
                rep.err(where, "starter trùng với solution")
            if "prism" in les and les["prism"] not in PRISM_TOPICS:
                rep.err(where, f"prism '{les['prism']}' không thuộc danh sách chủ đề")
            if lang == "web":
                if les.get("tests") != []:
                    rep.err(where, "bài web phải có tests: []")
                validate_checks(rep, where, les.get("checks"))
            else:
                validate_tests(rep, where, les.get("tests"))
                if "checks" in les:
                    rep.warn(where, "checks chỉ dùng cho bài web")
                for t in les.get("tests") or []:
                    if isinstance(t, dict) and isinstance(t.get("expected"), str) and t["expected"] != normalize_output(t["expected"]):
                        rep.warn(where, "expected có khoảng trắng cuối dòng/dòng trống cuối (sẽ bị chuẩn hóa)")
                if lang in RUNNABLE:
                    runnable.append({"where": where, "lang": lang, "lesson": les})
    rep.stats[name] = f"{len(chapters)} chương, {lesson_count} bài"
    return runnable


def validate_challenges(rep: Report, seen_ids: set[str]) -> list[dict]:
    name = CHALLENGES.name
    try:
        data = json.loads(CHALLENGES.read_text(encoding="utf-8"))
    except Exception as exc:  # noqa: BLE001
        rep.err(name, f"không đọc được JSON: {exc}")
        return []
    if data.get("version") != 2:
        rep.err(name, "version phải là 2")
    worlds = data.get("worlds")
    world_ids = set()
    if not isinstance(worlds, list) or not worlds:
        rep.err(name, "cần danh sách worlds")
    else:
        for w in worlds:
            if not isinstance(w, dict) or not isinstance(w.get("id"), int) or not is_str(w.get("name")) \
                    or w.get("lang") not in CHALLENGE_LANGS or not is_str(w.get("description")):
                rep.err(name, f"world không hợp lệ: {str(w)[:80]}")
            else:
                world_ids.add(w["id"])
    items = data.get("challenges")
    if not isinstance(items, list) or not items:
        rep.err(name, "cần danh sách challenges")
        return []
    check_nfc(rep, name, data)
    runnable = []
    for c in items:
        cid = c.get("id", "?")
        where = f"{name} › {cid}"
        if not isinstance(c.get("stage"), int) or cid != f"stage-{c.get('stage')}":
            rep.err(where, "id phải là 'stage-<stage>'")
        if cid in seen_ids:
            rep.err(where, "id bị trùng")
        seen_ids.add(cid)
        if c.get("world") not in world_ids:
            rep.err(where, "world không tồn tại")
        if c.get("lang") not in CHALLENGE_LANGS:
            rep.err(where, f"lang '{c.get('lang')}' không hợp lệ")
        if c.get("rank") not in RANKS:
            rep.err(where, f"rank '{c.get('rank')}' không hợp lệ")
        if not isinstance(c.get("boss"), bool):
            rep.err(where, "boss phải là true/false")
        if not isinstance(c.get("xp"), int) or c.get("xp", 0) <= 0:
            rep.err(where, "xp phải là số nguyên dương")
        for key in ("title", "task", "starter", "solution"):
            if not is_str(c.get(key)):
                rep.err(where, f"thiếu '{key}'")
        if not isinstance(c.get("hints"), list):
            rep.err(where, "hints phải là danh sách")
        if not isinstance(c.get("tags"), list):
            rep.err(where, "tags phải là danh sách")
        if c.get("starter", "").strip() == c.get("solution", "").strip():
            rep.err(where, "starter trùng với solution")
        validate_tests(rep, where, c.get("tests"))
        if c.get("lang") in RUNNABLE:
            runnable.append({"where": where, "lang": c.get("lang"), "lesson": c})
    rep.stats[name] = f"{len(items)} thử thách, {len(world_ids)} thế giới"
    return runnable


def execute(rep: Report, items: list[dict]) -> int:
    """Run solutions (must pass) and starters (must fail ≥1 test). Returns number of test runs."""
    jobs = []
    for it in items:
        les = it["lesson"]
        tests = les.get("tests") or []
        for kind in ("solution", "starter"):
            src = les.get(kind) or ""
            code = translate(src) if it["lang"] == "pyvn" else src
            for ti, t in enumerate(tests):
                if isinstance(t, dict):
                    jobs.append((it["where"], kind, ti, code, t.get("input", ""), t.get("expected", "")))

    results: dict[tuple[str, str], list[bool]] = {}
    with tempfile.TemporaryDirectory() as tmp, ThreadPoolExecutor(max_workers=8) as pool:
        futures = [(job, pool.submit(run_python, job[3], job[4], tmp)) for job in jobs]
        for (where, kind, ti, _code, _inp, expected), fut in futures:
            ok, out = fut.result()
            passed = ok and normalize_output(out) == normalize_output(expected)
            results.setdefault((where, kind), []).append(passed)
            if kind == "solution" and not passed:
                detail = out if not ok else f"nhận {normalize_output(out)[:80]!r}, cần {normalize_output(expected)[:80]!r}"
                rep.err(where, f"lời giải sai ở test #{ti + 1}: {detail}")
    for (where, kind), passes in results.items():
        if kind == "starter" and passes and all(passes):
            rep.err(where, "starter đã vượt qua toàn bộ test — starter phải chưa giải xong bài")
    return len(jobs)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--course", action="append", help="chỉ kiểm tra khóa học này (có thể lặp lại)")
    ap.add_argument("--run-challenges", action="store_true", help="chạy cả lời giải thử thách Python")
    ap.add_argument("--no-run", action="store_true", help="chỉ kiểm tra cấu trúc, không chạy code")
    args = ap.parse_args()

    rep = Report()
    seen: set[str] = set()
    runnable: list[dict] = []
    files = sorted(p for p in COURSES_DIR.glob("*.json") if p.name != "index.json")
    if args.course:
        files = [p for p in files if p.stem in set(args.course)]
    if not files:
        rep.err("data/courses", "không tìm thấy tệp khóa học nào")
    for path in files:
        runnable += validate_course(rep, path, seen)
    if CHALLENGES.exists() and not args.course:
        ch_items = validate_challenges(rep, seen)
        if args.run_challenges:
            runnable += ch_items

    runs = 0
    if not args.no_run and runnable:
        runs = execute(rep, runnable)

    print("=== V-Code Edu · kiểm tra nội dung ===")
    for name, stat in rep.stats.items():
        print(f"  • {name}: {stat}")
    print(f"  • Đã chạy {runs} lượt test (lời giải + starter) bằng CPython {sys.version.split()[0]}")
    for w in rep.warnings:
        print(w)
    for e in rep.errors:
        print(e)
    print(f"Kết quả: {len(rep.errors)} lỗi, {len(rep.warnings)} cảnh báo")
    return 1 if rep.errors else 0


if __name__ == "__main__":
    sys.exit(main())
