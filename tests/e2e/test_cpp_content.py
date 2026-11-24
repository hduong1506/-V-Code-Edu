"""pytest wrapper for tools/validate_cpp_content.py.

Runs the full C/C++ course + challenge validation (JSCPP in a headless browser via Playwright,
Python challenge solutions via CPython). Skipped automatically when Playwright is not installed.

    .venv\\Scripts\\python.exe -m pytest tests/e2e/test_cpp_content.py -q
"""
import importlib.util
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
TOOL = ROOT / "tools" / "validate_cpp_content.py"


@pytest.mark.skipif(importlib.util.find_spec("playwright") is None, reason="playwright is not installed")
def test_cpp_courses_and_challenges_validate():
    proc = subprocess.run([sys.executable, str(TOOL)], cwd=ROOT, capture_output=True, text=True,
                          encoding="utf-8", timeout=900)
    assert proc.returncode == 0, proc.stdout[-4000:] + proc.stderr[-2000:]
    assert "ALL CHECKS PASSED" in proc.stdout


def test_schema_and_python_challenges_without_browser():
    """Fast check that needs no browser: schema of all three files + CPython solutions of worlds 1-3."""
    proc = subprocess.run([sys.executable, str(TOOL), "--skip-jscpp"], cwd=ROOT, capture_output=True,
                          text=True, encoding="utf-8", timeout=300)
    assert proc.returncode == 0, proc.stdout[-2000:] + proc.stderr[-2000:]
    assert "ALL CHECKS PASSED" in proc.stdout
