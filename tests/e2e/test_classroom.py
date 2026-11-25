"""End-to-end tests for the Classroom section, run against an in-browser Firebase MOCK (tests/e2e/firebase_mock.py).

The real Firebase project is never contacted: the SDK module URLs are intercepted and replaced by small in-memory fakes.
All names / classes / scores below are fabricated test data that exist only inside the test browser.

Run (frontend served on port 8000):
    .venv\\Scripts\\python.exe -m pytest tests/e2e/test_classroom.py -q
"""
import os
import re
from pathlib import Path

import pytest
from playwright.sync_api import sync_playwright, expect

from firebase_mock import new_mock_context, profile, dump_db, email_key

BASE = os.environ.get("VCODE_BASE_URL", "http://localhost:8000")
SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(exist_ok=True)

TEACHER = {"email": "gv.test@example.test", "displayName": "Cô Giáo Thử"}
STUDENT = {"email": "hs.test@example.test", "displayName": "Học Sinh Thử"}
IGNORED = ("favicon", "net::ERR", "Failed to load resource", "[sw]", "Service Worker", "status of 404", "status of 503", "WebGPU")

JS_SOLUTION = "const [a, b] = input().split(' ').map(Number);\nconsole.log(a + b);\n"


@pytest.fixture(scope="module")
def browser():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="msedge", headless=True)
        yield b
        b.close()


def open_page(browser, user, db, **kw):
    ctx = new_mock_context(browser, user=user, db=db, **kw)
    page = ctx.new_page()
    page.errors = []
    page.on("console", lambda m: page.errors.append(f"console: {m.text}") if m.type == "error" and not any(s in m.text for s in IGNORED) else None)
    page.on("pageerror", lambda e: page.errors.append(f"pageerror: {e}"))
    return ctx, page


def go(page, route, selector, timeout=20000):
    page.goto(f"{BASE}/#{route}")
    page.wait_for_selector(selector, timeout=timeout)
    page.wait_for_timeout(300)


def modal(page):
    return page.locator("dialog.modal[open]").last


# ---------------------------------------------------------------- signed out
def test_signed_out_landing_and_invite(browser):
    ctx, page = open_page(browser, None, {})
    go(page, "/classroom", ".classroom-landing")
    expect(page.locator(".cr-hero__title")).to_contain_text("trong một lớp học")
    expect(page.locator(".cr-feature")).to_have_count(6)
    page.click("text=Đăng nhập để bắt đầu")
    expect(modal(page)).to_contain_text("Đăng nhập để vào lớp học.")  # auth dialog opened with our reason
    page.screenshot(path=str(SHOTS / "classroom_landing_signin.png"))
    page.keyboard.press("Escape")
    go(page, "/join/vcabc1", ".classroom-landing")
    expect(page.locator(".cr-invite-note")).to_contain_text("VCABC1")
    assert not page.errors, page.errors
    ctx.close()


# ---------------------------------------------------------------- role selection
def test_role_selection_teacher(browser):
    db = profile(TEACHER["email"], TEACHER["displayName"], "none")
    ctx, page = open_page(browser, TEACHER, db)
    go(page, "/classroom", ".role-options")
    page.click(".role-option >> text=Tôi là giáo viên")
    page.click("text=Tiếp tục")
    modal(page).locator("button:has-text('Xác nhận')").click()
    expect(page.locator(".cr-head__title")).to_contain_text("Chào", timeout=10000)
    expect(page.locator(".cr-role-chip")).to_contain_text("Giáo viên")
    assert dump_db(page)[f"users/{email_key(TEACHER['email'])}"]["role"] == "teacher"
    assert not page.errors, page.errors
    ctx.close()


# ---------------------------------------------------------------- full flow
def test_teacher_student_full_flow(browser):
    db = {**profile(TEACHER["email"], TEACHER["displayName"], "teacher"), **profile(STUDENT["email"], STUDENT["displayName"], "student")}

    # 1) Teacher creates a class and an assignment
    ctx, page = open_page(browser, TEACHER, db)
    go(page, "/classroom", ".cr-onboard")
    page.click(".cr-head__actions >> text=Tạo lớp mới")
    page.fill("#cr-new-name", "Lớp Kiểm Thử 10A")
    page.fill("#cr-new-subject", "Tin học · JavaScript")
    modal(page).locator(".modal__footer >> text=Tạo lớp").click()
    page.wait_for_url(re.compile(r"#/classroom/VC[A-Z0-9]+"), timeout=10000)
    code = re.search(r"#/classroom/(VC[A-Z0-9]+)", page.url).group(1)
    invite = modal(page)
    expect(invite.locator(".cr-invite__code")).to_have_attribute("aria-label", re.compile(" ".join(code)), timeout=10000)
    expect(invite.locator("input[aria-label='Liên kết mời']")).to_have_value(re.compile(f"#/join/{code}$"))
    page.screenshot(path=str(SHOTS / "classroom_invite.png"))
    invite.locator("text=Xong").click()

    page.click(".cr-nav__item[data-section=assignments]")
    page.click(".cr-sec-head >> text=Giao bài mới")
    page.fill("#cr-asg-title", "Tổng hai số (kiểm thử)")
    page.fill("#cr-asg-desc", "Đọc hai số nguyên `a b`, in ra tổng.")
    page.select_option("#cr-asg-lang", "javascript")
    page.fill("textarea[aria-label='Dữ liệu vào test 1']", "3 4")
    page.fill("textarea[aria-label='Kết quả mong đợi test 1']", "7")
    page.click("text=Thêm test")
    page.fill("textarea[aria-label='Dữ liệu vào test 2']", "10 5")
    page.fill("textarea[aria-label='Kết quả mong đợi test 2']", "15")
    page.screenshot(path=str(SHOTS / "classroom_assignment_editor.png"))
    modal(page).locator(".modal__footer >> text=Giao bài").click()
    expect(page.locator(".cr-sec-head__title")).to_have_text("Tổng hai số (kiểm thử)", timeout=10000)
    state = dump_db(page)
    asg = [v for k, v in state.items() if k.startswith(f"classrooms/{code}/assignments/")]
    assert len(asg) == 1 and asg[0]["language"] == "javascript" and len(asg[0]["test_cases"]) == 2 and asg[0]["deadline_ts"] > 0
    assert not page.errors, page.errors
    ctx.close()

    # 2) Student joins via invite link and submits through the workbench (auto-graded)
    ctx, page = open_page(browser, STUDENT, state)
    go(page, f"/join/{code}", ".cr-join__card")
    expect(page.locator(".cr-join__card h1")).to_have_text("Lớp Kiểm Thử 10A")
    page.click("text=Tham gia lớp")
    page.wait_for_url(re.compile(f"#/classroom/{code}"), timeout=10000)
    page.wait_for_selector(".cr-overview")
    page.click(".cr-nav__item[data-section=assignments]")
    expect(page.locator(".cr-asg")).to_have_count(1)
    expect(page.locator(".cr-asg .cr-status")).to_contain_text("Chưa làm")
    page.click(".cr-asg >> text=Làm bài")
    page.wait_for_selector(".cr-solve .cr-solve__wb", timeout=15000)
    page.evaluate("(src) => document.querySelector('.cr-solve__wb').__wb.setCode(src)", JS_SOLUTION)
    modal(page).locator("button:has-text('Nộp bài')").click()
    expect(page.locator(".cr-solve__status .cr-status")).to_contain_text("Đã nộp", timeout=90000)
    page.screenshot(path=str(SHOTS / "classroom_student_submitted.png"))
    page.keyboard.press("Escape")
    state = dump_db(page)
    subs = [v for k, v in state.items() if k.startswith(f"classrooms/{code}/submissions/")]
    assert len(subs) == 1 and subs[0]["passed"] == 2 and subs[0]["total"] == 2 and subs[0]["score"] == 10, subs
    assert STUDENT["email"] in state[f"classrooms/{code}"]["student_emails"]
    assert not page.errors, page.errors
    ctx.close()

    # 3) Teacher sees the submission in the grading queue and grades it
    ctx, page = open_page(browser, TEACHER, state)
    go(page, f"/classroom/{code}?tab=grading", ".cr-table")
    expect(page.locator(".cr-table tbody tr")).to_have_count(1)
    expect(page.locator(".cr-table tbody")).to_contain_text(STUDENT["displayName"])
    page.click("text=Chấm lần lượt")
    grade = modal(page)
    expect(grade.locator(".cr-autocard")).to_contain_text("2/2")
    expect(grade.locator(".cr-codeview__pre")).to_contain_text("console.log")
    grade.locator(".cr-score-input").fill("9")
    grade.locator(".cr-note").fill("Bài làm tốt, nhớ kiểm tra dữ liệu rỗng.")
    page.screenshot(path=str(SHOTS / "classroom_grading.png"))
    grade.locator("button:has-text('Lưu điểm')").click()
    expect(page.locator("dialog.cr-grade-modal")).to_have_count(0, timeout=10000)
    page.click(".cr-nav__item[data-section=gradebook]")
    cell = page.locator(".cr-gb tbody .cr-gb__v").first
    expect(cell).to_have_text("9")
    expect(cell).not_to_have_class(re.compile("is-pending"))
    page.screenshot(path=str(SHOTS / "classroom_gradebook.png"))
    state = dump_db(page)
    sub = next(v for k, v in state.items() if k.startswith(f"classrooms/{code}/submissions/"))
    assert sub["teacher_score"] == 9 and "dữ liệu rỗng" in sub["teacher_note"]
    assert not page.errors, page.errors
    ctx.close()

    # 4) Student sees grade + feedback
    ctx, page = open_page(browser, STUDENT, state)
    go(page, f"/classroom/{code}?tab=gradebook", ".cr-table")
    expect(page.locator(".cr-table tbody")).to_contain_text("Đã chấm")
    expect(page.locator(".cr-table tbody .cr-score-badge")).to_have_text("9")
    expect(page.locator(".cr-table tbody")).to_contain_text("dữ liệu rỗng")
    assert not page.errors, page.errors
    ctx.close()


# ---------------------------------------------------------------- delete from dashboard
def test_teacher_deletes_class_from_dashboard(browser):
    db = {**profile(TEACHER["email"], TEACHER["displayName"], "teacher")}
    for code, name in [("VCDEL1", "Lớp tạo nhầm"), ("VCKEEP", "Lớp giữ lại")]:
        db[f"classrooms/{code}"] = {"code": code, "name": name, "grade_subject": "", "description": "", "teacher_email": email_key(TEACHER["email"]), "teacher_name": TEACHER["displayName"], "student_emails": [], "students": [], "schema": 2}
    db["classrooms/VCDEL1/assignments/a1"] = {"title": "Bài thử", "language": "python", "created_at": 1}
    ctx, page = open_page(browser, TEACHER, db)
    go(page, "/classroom", ".cr-class-card__del")
    expect(page.locator(".cr-class-card")).to_have_count(2)
    btn = page.locator(".cr-class-card-wrap", has_text="Lớp tạo nhầm").locator(".cr-class-card__del")
    # cancel keeps the class
    btn.click()
    expect(modal(page)).to_contain_text("Bạn có chắc chắn muốn xóa lớp")
    page.keyboard.press("Escape")
    assert "classrooms/VCDEL1" in dump_db(page)
    assert page.url.endswith("#/classroom")
    # confirm deletes the class and its sub-collections
    btn.click()
    modal(page).locator("button:has-text('Xóa vĩnh viễn')").click()
    expect(page.locator(".cr-class-card")).to_have_count(1, timeout=10000)
    expect(page.locator(".cr-class-card")).to_contain_text("Lớp giữ lại")
    state = dump_db(page)
    assert not any(k.startswith("classrooms/VCDEL1") for k in state), [k for k in state if "VCDEL1" in k]
    assert "classrooms/VCKEEP" in state
    page.screenshot(path=str(SHOTS / "classroom_dashboard_delete.png"))
    assert not page.errors, page.errors
    ctx.close()


def test_student_dashboard_has_no_delete(browser):
    db = {**profile(STUDENT["email"], STUDENT["displayName"], "student")}
    db["classrooms/VCSTU1"] = {"code": "VCSTU1", "name": "Lớp của em", "grade_subject": "", "description": "", "teacher_email": "gv@x", "teacher_name": "GV", "student_emails": [STUDENT["email"]], "students": [], "schema": 2}
    ctx, page = open_page(browser, STUDENT, db)
    go(page, "/classroom", ".cr-class-card")
    expect(page.locator(".cr-class-card__del")).to_have_count(0)
    ctx.close()


# ---------------------------------------------------------------- responsive
def test_classroom_mobile_no_overflow(browser):
    db = {**profile(TEACHER["email"], TEACHER["displayName"], "teacher")}
    db["classrooms/VCMOB1"] = {"code": "VCMOB1", "name": "Lớp di động", "grade_subject": "", "description": "", "teacher_email": email_key(TEACHER["email"]), "teacher_name": TEACHER["displayName"], "student_emails": [], "students": [], "schema": 2}
    ctx, page = open_page(browser, TEACHER, db, viewport={"width": 390, "height": 844})
    for route, sel in [("/classroom", ".cr-class-card"), ("/classroom/VCMOB1?tab=overview", ".cr-class-hero"), ("/classroom/VCMOB1?tab=students", ".cr-empty"), ("/classroom/VCMOB1?tab=gradebook", ".cr-empty")]:
        go(page, route, sel)
        overflow = page.evaluate("document.documentElement.scrollWidth - document.documentElement.clientWidth")
        assert overflow <= 1, f"horizontal overflow {overflow}px on {route}"
    page.screenshot(path=str(SHOTS / "classroom_mobile.png"))
    assert not page.errors, page.errors
    ctx.close()
