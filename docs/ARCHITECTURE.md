# V-Code Edu — Kiến trúc & hợp đồng giữa các module

> Tài liệu này là "hợp đồng" giữa các phần của hệ thống. Khi thêm module mới, hãy tuân theo các quy ước dưới đây.

## 1. Tổng quan

```
┌──────────────────────────── Trình duyệt (PWA, không cần build) ────────────────────────────┐
│ index.html → js/main.js (bootstrap) → js/core/router.js (hash router, lazy-load trang)       │
│                                                                                              │
│  Trang (js/pages/*)        Dịch vụ (js/services/*)          Runtime (js/runtime/*)           │
│  home, learn, lesson,      firebase (Auth+Firestore),       Python  → Pyodide (Web Worker)   │
│  workspace, challenges,    auth, profile, progress,         Py TV   → pyvn.js → Pyodide      │
│  classroom, ai, prism,     classroom, conversations,        JS      → Web Worker             │
│  account                   ai-client, local-ai, sync        C/C++   → JSCPP (Web Worker)     │
│                                                              SQL     → sql.js (Web Worker)    │
│                                                              HTML/CSS→ iframe sandbox         │
│  Lưu trữ cục bộ: IndexedDB (js/core/idb.js) · Service Worker (sw.js) cache app + runtime    │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
            │ Firebase Auth + Firestore (giữ nguyên project v-code-edu)
            │ HTTPS + Bearer <Firebase ID token>
            ▼
┌──────────────── Backend FastAPI (backend/) ────────────────┐
│ /api/health · /api/ai/providers · /api/ai/chat (SSE)        │
│ /api/ai/usage · phục vụ luôn frontend tĩnh (tùy chọn)       │
│ Nhà cung cấp AI: Gemini · OpenAI · Anthropic · Ollama (cục bộ)│
│ Khóa API chỉ nằm trong biến môi trường của máy chủ.          │
└─────────────────────────────────────────────────────────────┘
```

## 2. Quy ước frontend

- **Không framework, không bước build.** ES modules gốc (`<script type="module">`). Chạy được bằng Live Server, `python -m http.server`, hoặc backend FastAPI.
- **Design tokens**: `css/tokens.css`. Mọi màu sắc phải dùng biến CSS (`var(--text)`, `var(--brand)`, `var(--viz-*)`…). Không viết mã màu cứng trong component → Light/Dark tự động đúng.
- **Theme**: `<html data-theme="light|dark">`. Lựa chọn lưu ở `localStorage['vc-theme']` = `light | dark | system`.
- **Component CSS dùng chung**: `css/components.css` — `.btn(--primary|--ai|--soft|--ghost|--danger|--sm|--lg|--icon)`, `.input .select .textarea .field`, `.card(--interactive|--flat)`, `.badge(--brand|--ai|--live|--success|--warning|--danger|--amber)`, `.chip`, `.tabs .tab`, `.segmented`, `.modal`, `.toast`, `.callout(--info|--ai|--warning|--danger|--success)`, `.table`, `.code-block`, `.prose`, `.progress`, `.empty-state`, `.kbd`.
- **CSS theo trang**: `css/pages/<page>.css`, được router nạp khi vào trang.
- **DOM**: dùng `h()` / `s()` trong `js/core/dom.js`. Chuỗi con luôn là text (an toàn XSS). Chỉ dùng `raw(html)` cho HTML do chính `highlight()` / `markdown()` tạo ra.
- **Icon**: `icon(name)` từ `js/components/icons.js`.
- **Tô màu cú pháp**: `highlight(code, lang)` từ `js/components/highlight.js` (trả về HTML đã escape).
- **UI**: `toast()`, `openModal()`, `confirmDialog()`, `promptDialog()`, `copyText()`, `bindMenu()`, `downloadFile()`, `emptyState()` từ `js/core/ui.js`.
- **Trạng thái**: `appState` (store) và `bus` (sự kiện) trong `js/core/store.js`.

### 2.1 Hợp đồng trang (page module)

```js
// js/pages/example.js
export default {
  title: 'Tiêu đề',                         // hoặc (ctx) => string
  async mount(container, ctx) {             // ctx = { params, query, path, signal, navigate }
    container.append(/* ... */);
    window.addEventListener('resize', onResize, { signal: ctx.signal }); // tự gỡ khi rời trang
    return () => { /* cleanup tùy chọn */ };
  },
};
```

### 2.2 Bảng định tuyến

| Đường dẫn | Trang | Ghi chú |
|---|---|---|
| `#/` | home | Trang chủ |
| `#/learn` | learn | Hệ sinh thái lộ trình & khóa học |
| `#/learn/:course` | course | Tổng quan khóa học |
| `#/learn/:course/:lesson` | lesson | Học + làm bài (IDE, chấm tự động) |
| `#/challenges` · `#/challenges/:id` | challenges | 100 chặng thử thách |
| `#/workspace` | workspace | IDE tự do đa ngôn ngữ (`?lang=python`) |
| `#/prism` · `#/prism/:topic` · `#/prism/:topic/:algo` | prism | Lăng kính thuật toán (trực quan hóa) |
| `#/ai` · `#/ai/:conversation` | ai | Trợ lý AI V-Mentor |
| `#/classroom` · `#/classroom/:code` · `#/join/:code` | classroom | Lớp học (giáo viên / học sinh) |
| `#/account` | account | Hồ sơ, bảo mật, cài đặt, offline |

## 3. Dữ liệu nội dung (data/)

### 3.1 Khóa học — `data/courses/<id>.json`

```jsonc
{
  "id": "python", "version": 2, "lang": "python",          // lang: python | pyvn | web | c | cpp
  "title": "Python cơ bản", "subtitle": "…", "level": "Cơ bản", "description": "…",
  "track": "programming",                                    // programming | web | algorithms | ai
  "accent": "blue",                                          // blue | violet | cyan | amber | green | rose
  "tags": ["python", "nhập môn"],
  "chapters": [
    { "id": "ch1", "title": "Nhập xuất & biến", "summary": "…",
      "lessons": [
        { "id": "python-1-1", "title": "…", "difficulty": "easy",   // easy | medium | hard
          "xp": 10,                                                 // easy 10 · medium 20 · hard 30
          "theory": "markdown", "task": "markdown",
          "starter": "…", "solution": "…", "hints": ["…", "…"],
          "tests": [ { "input": "5\n", "expected": "10", "hidden": false } ],
          "checks": [ /* chỉ cho bài web — xem js/runtime/html-checks.js */ ],
          "prism": "sorting"                                         // (tùy chọn) liên kết tới chủ đề trực quan hóa
        } ] } ]
}
```

`data/courses/index.json` được sinh tự động bởi `tools/build_catalog.py` (danh sách khóa học + metadata + lộ trình tương lai).

### 3.2 Thử thách — `data/challenges.json`

```jsonc
{ "version": 2,
  "worlds": [ { "id": 1, "name": "Python Khởi Hành", "lang": "python", "description": "…" } ],
  "challenges": [ { "id": "stage-1", "stage": 1, "world": 1, "lang": "python", "rank": "D", "boss": false, "xp": 100,
                    "title": "…", "task": "markdown", "starter": "…", "solution": "…", "hints": [], "tests": [ … ], "tags": [] } ] }
```

ID `stage-1 … stage-100` được giữ nguyên để tương thích tiến độ cũ.

### 3.3 Chấm bài

- So sánh stdout: chuẩn hóa `\r\n → \n`, bỏ khoảng trắng cuối mỗi dòng, bỏ dòng trống cuối. Phải khớp chính xác.
- Bài web: chạy trong iframe `sandbox="allow-scripts"` và đánh giá `checks` bằng `runChecks()`.
- Python Tiếng Việt: dịch bằng `js/runtime/pyvn.js` theo `data/pyvn-keywords.json` (bỏ qua chuỗi & chú thích).
- C/C++ chạy bằng JSCPP (tập con C++: không có STL `vector/map/string`; có `iostream`, `cstdio`, `cmath`, `cstring`, `iomanip`, mảng, con trỏ, struct, hàm, đệ quy).

## 4. Firebase (giữ nguyên project `v-code-edu`)

- **Auth**: Email/Mật khẩu + Google. Trạng thái đăng nhập lưu bền (IndexedDB của Firebase).
- **Firestore** (khóa tài liệu người dùng = email viết thường, như dữ liệu cũ):

| Đường dẫn | Nội dung | Quyền (firestore.rules) |
|---|---|---|
| `users/{email}` | hồ sơ, vai trò (khóa 1 lần), tiến độ học | chỉ chủ sở hữu |
| `users/{email}/conversations/{id}` | lịch sử chat AI (đồng bộ) | chỉ chủ sở hữu |
| `leaderboard/{email}` | tên + XP công khai | đọc công khai, chủ sở hữu ghi |
| `classrooms/{CODE}` | thông tin lớp + `student_emails` | GV chủ lớp sửa; HS chỉ tự tham gia/rời |
| `classrooms/{CODE}/assignments/{id}` | bài tập | GV ghi, thành viên đọc |
| `classrooms/{CODE}/submissions/{asgId}__{email}` | bài nộp | HS ghi bài của mình (trước hạn), GV chấm |
| `classrooms/{CODE}/presence/{email}` | trạng thái đang làm bài | HS ghi của mình, GV đọc |
| `classrooms/{CODE}/messages/{id}` | thảo luận lớp | thành viên |

- **Di trú dữ liệu cũ**: tài khoản cũ (mật khẩu băm SHA-256 trong Firestore) được chuyển sang Firebase Auth ở lần đăng nhập đầu tiên — rules xác minh `legacy_proof == password_hash` phía máy chủ, mã băm không bao giờ bị đọc ra trình duyệt. Mảng `assignments/submissions` nhúng trong tài liệu lớp cũ được giáo viên chủ lớp tự động chuyển sang subcollection khi mở lớp.

## 5. API Backend (FastAPI)

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/health` | `{ status, version, time, ai: { providers: [...] } }` |
| GET | `/api/ai/providers` | `{ providers: [{ id, label, kind: "cloud"|"local", model, available }], default, modes: [{ id, label, description }] }` |
| GET | `/api/ai/usage` | `{ limit, used, remaining, subject: "user"|"guest", reset_at }` |
| POST | `/api/ai/chat` | Server-Sent Events (xem 5.1) |

Header tùy chọn `Authorization: Bearer <Firebase ID token>` (người dùng đã đăng nhập có hạn mức cao hơn khách).

### 5.1 `/api/ai/chat` — yêu cầu & luồng SSE

```jsonc
// Request
{ "messages": [ { "role": "user"|"assistant", "content": "…" } ],   // ≤ 40 tin, mỗi tin ≤ 12 000 ký tự
  "mode": "tutor",            // tutor | reviewer | debugger | algorithm | learning | project | knowledge
  "provider": "auto",         // auto | cloud | local | <provider id>
  "context": { "code": "…", "language": "python", "error": "…", "lesson": "…" } }   // tùy chọn
```

```
event: meta     data: {"provider":"gemini","model":"…","mode":"tutor","request_id":"…"}
event: delta    data: {"text":"…"}                     (lặp lại)
event: done     data: {"finish_reason":"stop","usage":{…},"remaining":42}
event: error    data: {"code":"provider_error|rate_limited|no_provider|bad_request|timeout","message":"…"}
```

Lỗi trước khi mở luồng trả JSON `{ "detail": { "code": "…", "message": "…" } }` với mã 400/401/429/503.
