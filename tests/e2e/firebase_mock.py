"""TEST-ONLY Firebase mock for Playwright.

Intercepts the Firebase SDK module URLs (js/config.js → FIREBASE_SDK_BASE) and serves small in-memory fakes from
tests/e2e/fixtures/firebase-mock/. Nothing ever reaches the real Firebase project.

    ctx = new_mock_context(browser, user=teacher("gv@test.local", "Cô Lan"), db=seed)
    page = ctx.new_page(); ...; state = dump_db(page)   # hand the database to the next simulated user

Data written here is fabricated test data that lives only inside the browser page.
"""
import json
from pathlib import Path

FIXTURES = Path(__file__).parent / "fixtures" / "firebase-mock"
SDK_GLOB = "https://www.gstatic.com/firebasejs/**"


def email_key(email):
    import re
    return re.sub(r"[^a-z0-9@._-]", "_", email.strip().lower())


def profile(email, name, role):
    """users/{key} document entry for a fake profile."""
    key = email_key(email)
    return {f"users/{key}": {"email": email.lower(), "full_name": name, "role": role, "school_name": "", "class_name": ""}}


def install_firebase_mock(context, user=None, db=None):
    """user: {"email", "displayName"} or None (signed out). db: {"path/to/doc": {...}}."""
    payload = json.dumps({"user": user, "db": db or {}}, ensure_ascii=False)
    context.add_init_script(f"window.__FBMOCK__ = {payload};")

    def handler(route):
        name = route.request.url.split("?")[0].rsplit("/", 1)[-1]
        f = FIXTURES / name
        if f.exists():
            route.fulfill(status=200, content_type="text/javascript; charset=utf-8", body=f.read_text("utf-8"),
                          headers={"Access-Control-Allow-Origin": "*", "Cache-Control": "no-store"})
        else:
            route.abort()

    context.route(SDK_GLOB, handler)
    return context


def new_mock_context(browser, user=None, db=None, viewport=None, color_scheme="light", **kw):
    ctx = browser.new_context(
        viewport=viewport or {"width": 1440, "height": 900}, locale="vi-VN", service_workers="block",
        color_scheme=color_scheme, **kw,
    )
    install_firebase_mock(ctx, user=user, db=db)
    theme = "dark" if color_scheme == "dark" else "light"
    ctx.add_init_script(f"try {{ localStorage.setItem('vc-theme', '{theme}'); }} catch (e) {{}}")
    return ctx


def dump_db(page):
    return page.evaluate("window.__fbmock.dump()")
