"""Regenerate the SHELL precache list in sw.js from the files that actually exist.

Usage:  python tools/update_sw_precache.py [new-version]
Includes every .js/.css under js/ and css/ (files starting with "_" are skipped as dev harnesses),
the course catalogue, challenge data, vendor runtimes and app icons. Run it after adding front-end files
so the app keeps working offline from the first visit.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SW = ROOT / "sw.js"

STATIC = [
    "./", "./index.html", "./manifest.json",
    "./data/courses/index.json", "./data/challenges.json", "./data/pyvn-keywords.json",
    "./vendor/jscpp/JSCPP.es5.min.js", "./vendor/sqljs/sql-wasm.js", "./vendor/sqljs/sql-wasm.wasm",
    "./assets/logo-640.jpg", "./assets/icons/mark-96.png", "./assets/icons/icon-192.png", "./assets/icons/apple-touch-icon.png",
]


def collect() -> list[str]:
    files: list[str] = []
    for folder in ("css", "js"):
        for p in sorted((ROOT / folder).rglob("*")):
            if p.is_file() and p.suffix in {".js", ".css"} and not p.name.startswith("_"):
                files.append("./" + p.relative_to(ROOT).as_posix())
    return files


def main() -> None:
    src = SW.read_text(encoding="utf-8")
    entries = STATIC + collect()
    missing = [e for e in entries if e not in ("./",) and not (ROOT / e[2:]).exists()]
    if missing:
        raise SystemExit(f"Missing files: {missing}")
    lines = ",\n".join(f"  '{e}'" for e in entries)
    new_block = f"const SHELL = [\n{lines},\n];"
    src, n = re.subn(r"const SHELL = \[[\s\S]*?\];", new_block, src, count=1)
    if n != 1:
        raise SystemExit("SHELL block not found in sw.js")
    if len(sys.argv) > 1:
        src = re.sub(r"const VERSION = '[^']*';", f"const VERSION = '{sys.argv[1]}';", src, count=1)
    SW.write_text(src, encoding="utf-8")
    print(f"sw.js: {len(entries)} precache entries")


if __name__ == "__main__":
    main()
