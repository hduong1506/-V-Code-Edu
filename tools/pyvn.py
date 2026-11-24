"""Python port of js/runtime/pyvn.js — "Python Tiếng Việt" -> Python.

Replaces Vietnamese keywords (data/pyvn-keywords.json) ONLY outside string literals and
comments, using the same ordering and word-boundary rules as the browser runtime
(ASCII \\w semantics, like JavaScript regular expressions).

Usage:
    from pyvn import translate
    python tools/pyvn.py file.py      # prints translated source
"""
from __future__ import annotations

import json
import re
import sys
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MAPPING_PATH = ROOT / "data" / "pyvn-keywords.json"


@lru_cache(maxsize=1)
def load_mapping() -> dict:
    return json.loads(MAPPING_PATH.read_text(encoding="utf-8"))


def _segments(src: str) -> list[tuple[bool, str]]:
    """Split source into (is_code, text) segments; strings and comments are not code."""
    out: list[tuple[bool, str]] = []
    buf: list[str] = []
    i, n = 0, len(src)

    def push(code: bool, text: str) -> None:
        if text:
            out.append((code, text))

    while i < n:
        ch = src[i]
        if ch == "#":
            push(True, "".join(buf)); buf = []
            end = src.find("\n", i)
            stop = n if end == -1 else end
            push(False, src[i:stop])
            i = stop
            continue
        if ch in ("'", '"'):
            triple = src[i:i + 3] == ch * 3
            quote = ch * 3 if triple else ch
            j = i + len(quote)
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src.startswith(quote, j):
                    j += len(quote)
                    break
                if not triple and src[j] == "\n":
                    break
                j += 1
            push(True, "".join(buf)); buf = []
            push(False, src[i:j])
            i = j
            continue
        buf.append(ch)
        i += 1
    push(True, "".join(buf))
    return out


def translate_with(mapping: dict, src: str) -> str:
    phrases = sorted(mapping.get("phrases", []), key=lambda p: len(p["vn"]), reverse=True)
    words: dict[str, str] = mapping.get("words", {})
    word_re = None
    if words:
        alts = "|".join(re.escape(k) for k in sorted(words, key=len, reverse=True))
        word_re = re.compile(rf"(?<![\w.])({alts})(?!\w)", re.ASCII)
    phrase_res = []
    for p in phrases:
        vn = p["vn"]
        pat = re.escape(vn)
        if vn.endswith("()"):
            pat = re.escape(vn[:-2]) + r"\s*\(\s*\)"
        tail = r"(?!\w)" if re.search(r"\w$", vn, re.ASCII) else ""
        phrase_res.append((re.compile(rf"(?<![\w.]){pat}{tail}", re.ASCII), p["py"]))

    parts = []
    for is_code, text in _segments(str(src or "")):
        if not is_code:
            parts.append(text)
            continue
        t = text
        for rx, py in phrase_res:
            t = rx.sub(lambda _m, py=py: py, t)
        if word_re is not None:
            t = word_re.sub(lambda m: words[m.group(1)], t)
        parts.append(t)
    return "".join(parts)


def translate(src: str) -> str:
    return translate_with(load_mapping(), src)


if __name__ == "__main__":
    if len(sys.argv) > 1:
        print(translate(Path(sys.argv[1]).read_text(encoding="utf-8")), end="")
    else:
        print(translate(sys.stdin.read()), end="")
