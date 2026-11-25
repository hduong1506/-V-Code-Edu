# TỔNG HỢP DỰ ÁN V-CODE EDU — TƯ LIỆU VIẾT BÁO CÁO

> Tài liệu được tổng hợp trực tiếp từ mã nguồn và các file thật trong thư mục dự án (phiên bản 3.1, ngày 25/11/2026). Các thư mục rác/thư viện hệ thống (`.git`, `.venv`, `node_modules`, `__pycache__`, `.pytest_cache`, `test-results`, `tests/e2e/screenshots`) không được đưa vào. Mọi số liệu trong tài liệu đều được đếm từ file thật hoặc từ kết quả chạy kiểm thử thật.

**Mục lục**

- Phần 1. Tổng quan & kiến trúc hệ thống
- Phần 2. Cấu trúc thư mục & danh mục toàn bộ file/folder
- Phần 3. Đặc tả chi tiết tất cả các chức năng & cách hoạt động
- Phần 4. Dữ liệu, cơ sở dữ liệu & cơ chế lưu trữ
- Phần 5. Danh mục hình ảnh, icon & đồ họa
- Phần 6. Quy trình tạo ra sản phẩm, kiểm thử & triển khai
- Phần 7. Thống kê nhanh cho báo cáo

---

## PHẦN 1. TỔNG QUAN & KIẾN TRÚC HỆ THỐNG

### 1.1. Mục tiêu, đối tượng sử dụng và bài toán dự án giải quyết

**V-Code Edu** (khẩu hiệu: *Giáo dục · Công nghệ · Tương lai*) là nền tảng web học lập trình, thuật toán và trí tuệ nhân tạo dành cho học sinh Việt Nam (THCS, THPT), được xây dựng gắn với trường THCS & THPT Hòa Phú.

**Đối tượng sử dụng**

| Đối tượng | Nhu cầu chính | Không gian trên hệ thống |
|---|---|---|
| Học sinh mới bắt đầu | Học tư duy lập trình bằng tiếng mẹ đẻ, không phải cài đặt | Khóa *Python Tiếng Việt*, IDE, Lưu đồ, Scratch Live |
| Học sinh THPT | Học Python, C, C++, web; ôn thi học sinh giỏi | Lộ trình khóa học, Đấu trường 100 chặng, Lăng kính thuật toán |
| Học sinh quan tâm AI | Hiểu AI từ bên trong | Khóa *Nhập môn AI & Khoa học dữ liệu*, Trợ lý AI V-Mentor |
| Giáo viên | Quản lý lớp, giao bài, chấm điểm, theo dõi tiến độ | Lớp học trực tuyến (giáo viên) |
| Phòng máy không ổn định mạng | Học khi mất Internet | Chế độ ngoại tuyến (PWA), AI cục bộ (Ollama/WebLLM) |

**Bài toán dự án giải quyết**

1. **Rào cản cài đặt:** học sinh không cần cài trình biên dịch — Python, C/C++, JavaScript, SQL và HTML/CSS đều chạy ngay trong trình duyệt (WebAssembly, Web Worker).
2. **Rào cản ngôn ngữ:** có Python Tiếng Việt (từ khóa tiếng Việt được dịch sang Python thật), giao diện và thông báo lỗi giải thích bằng tiếng Việt.
3. **Thiếu phản hồi tức thì:** bài tập được chấm tự động bằng bộ test (kể cả test ẩn), chấm thang 10.
4. **Thuật toán khó hình dung:** Lăng kính (V-Prism) mô phỏng từng bước 14 chủ đề cấu trúc dữ liệu & giải thuật; Lưu đồ và Scratch Live biến mã thành sơ đồ/khối trực quan.
5. **Thiếu người hướng dẫn:** trợ lý AI V-Mentor dạy theo phương pháp gợi mở (7 chế độ), khóa API được giữ an toàn ở máy chủ.
6. **Quản lý lớp học:** giáo viên giao bài có hạn nộp, hệ thống chấm tự động, giáo viên chấm lại và nhận xét, theo dõi học sinh theo thời gian thực.
7. **Hạ tầng mạng yếu:** ứng dụng web tiến bộ (PWA) hoạt động ngoại tuyến sau lần truy cập đầu, dữ liệu tự đồng bộ khi có mạng.
8. **Tạo động lực:** XP, cấp bậc, bảng xếp hạng, huy hiệu, thử thách hằng ngày trong Đấu trường.

### 1.2. Công nghệ, thư viện và nền tảng sử dụng

| Nhóm | Công nghệ / thư viện | Phiên bản / nguồn | Vai trò trong dự án |
|---|---|---|---|
| Frontend | HTML5, CSS3, JavaScript ES Modules | Thuần, **không có bước build** | Toàn bộ giao diện, định tuyến hash, tải trang theo nhu cầu |
| Frontend | Font Be Vietnam Pro, JetBrains Mono, Barlow Condensed, Chakra Petch | Google Fonts | Kiểu chữ chung, mã nguồn, giao diện Đấu trường |
| Đồ họa 3D | Three.js | 0.160.0 (jsDelivr) | Cảnh 3D "V-Core" ở trang chủ |
| Xác thực & dữ liệu đám mây | Firebase Authentication + Cloud Firestore (SDK modular) | 10.12.2 (gstatic), dự án `v-code-edu` | Đăng nhập Email/Mật khẩu, Google; hồ sơ, tiến độ, lớp học, bảng xếp hạng, lịch sử chat |
| Chạy mã | Pyodide (CPython → WebAssembly) | 0.27.7 (jsDelivr) | Chạy & chấm Python, Python Tiếng Việt |
| Chạy mã | JSCPP | bản vendored `vendor/jscpp` | Thông dịch C/C++ giáo dục |
| Chạy mã | sql.js (SQLite → WebAssembly) | bản vendored `vendor/sqljs` | Chạy SQL |
| Chạy mã | Web Worker, iframe sandbox | Trình duyệt | Cô lập JavaScript, xem trước HTML/CSS |
| Hiển thị | KaTeX | 0.16.11 (cdnjs) | Công thức toán trong câu trả lời AI |
| Tiện ích | qrcodejs | 1.0.0 (cdnjs) | Mã QR chia sẻ code, mời vào lớp |
| AI ngoại tuyến (tùy chọn) | WebLLM (`@mlc-ai/web-llm`) | 0.2.79 (esm.run), cần WebGPU | Mô hình ngôn ngữ chạy ngay trong trình duyệt |
| Ngoại tuyến | Service Worker, Cache Storage, IndexedDB, Web App Manifest | Trình duyệt | PWA, bộ nhớ đệm, bản nháp, tiến độ, hội thoại |
| Backend | Python 3, FastAPI, Uvicorn | `fastapi>=0.111`, `uvicorn>=0.30` | Cổng AI (SSE), xác thực token, giới hạn lượt, phục vụ frontend |
| Backend | Pydantic, httpx, cryptography, SQLAlchemy | `pydantic>=2.7`, `httpx>=0.27`, `cryptography>=42`, `sqlalchemy>=2.0.30` | Kiểm tra dữ liệu, gọi nhà cung cấp AI, xác minh chữ ký RS256, CSDL |
| Cơ sở dữ liệu cục bộ | SQLite (`vcode_edu.db`) | — | Bảng ghi lượt dùng AI (giữ nguyên CSDL cũ) |
| Nhà cung cấp AI | Google Gemini, OpenAI, Anthropic Claude, Ollama (cục bộ) | Cấu hình qua biến môi trường | Sinh câu trả lời cho V-Mentor |
| Kiểm thử | pytest, Playwright (Microsoft Edge) | — | Kiểm thử backend và kiểm thử giao diện đầu-cuối |
| Triển khai | Firebase Console, hosting tĩnh (GitHub Pages…), máy chủ Python (Render/Railway…) | — | Đưa sản phẩm lên mạng |

### 1.3. Sơ đồ kiến trúc tổng thể

```mermaid
flowchart LR
  subgraph Client["Trình duyệt của học sinh / giáo viên"]
    UI["Vỏ ứng dụng index.html<br/>main.js · router.js"]
    Pages["Các trang (js/pages/*)<br/>Trang chủ 3D · Học · Thử thách · Lăng kính<br/>IDE · Trợ lý AI · Lớp học · Tài khoản"]
    Comp["Thành phần (js/components/*)<br/>Editor · Workbench · Lưu đồ · Scratch<br/>Chat · Robot V-Bot · Hộp thoại đăng nhập"]
    Svc["Dịch vụ (js/services/*)<br/>auth · progress · classroom<br/>conversations · ai-client · local-ai"]
    RT["Bộ chạy mã (js/runtime/*)<br/>Pyodide · JSCPP · sql.js · JS Worker · iframe"]
    Store[("IndexedDB · localStorage<br/>Cache Storage")]
    SW["Service Worker (sw.js)"]
  end
  subgraph Firebase["Firebase (dự án v-code-edu)"]
    Auth["Authentication<br/>Email/Password · Google"]
    FS[("Cloud Firestore<br/>users · leaderboard · classrooms")]
  end
  subgraph Server["Máy chủ FastAPI (backend/)"]
    API["/api/ai/chat (SSE)<br/>/api/ai/providers · /api/health"]
    Verify["Xác minh Firebase ID token<br/>Giới hạn lượt dùng"]
    DB[("SQLite vcode_edu.db<br/>ai_usage")]
  end
  LLM["Nhà cung cấp AI<br/>Gemini · OpenAI · Claude · Ollama"]
  CDN["CDN: Pyodide · Three.js<br/>KaTeX · Firebase SDK · Fonts"]

  UI --> Pages --> Comp --> Svc
  Comp --> RT
  Svc --> Store
  SW <--> Store
  SW -. bộ nhớ đệm .-> CDN
  Svc -- SDK --> Auth
  Svc -- SDK, cache offline --> FS
  Svc -- "fetch + Bearer ID token" --> API
  API --> Verify --> DB
  API -- httpx --> LLM
```

**Luồng hoạt động chính (dạng chữ)**

1. Người dùng mở `index.html` → `js/main.js` khởi tạo giao diện, mạng, xác thực, tiến độ và Service Worker → `router.js` tải module trang tương ứng với địa chỉ `#/...` cùng file CSS riêng của trang.
2. **Học & luyện tập:** mã nguồn được chạy trong Web Worker (Pyodide/JSCPP/sql.js) hoặc iframe; kết quả chấm được lưu vào IndexedDB rồi đồng bộ lên Firestore (`users/{emailKey}.progress`).
3. **Đăng nhập:** Firebase Authentication trả về phiên đăng nhập; hồ sơ đọc/ghi ở `users/{emailKey}` (cùng khóa với ứng dụng cũ nên dữ liệu cũ được giữ nguyên).
4. **Trợ lý AI:** trình duyệt gửi hội thoại kèm Firebase ID token tới backend → backend xác minh token, kiểm tra hạn mức, gọi nhà cung cấp AI và truyền câu trả lời từng phần về (Server-Sent Events). Khóa API chỉ nằm ở máy chủ.
5. **Lớp học:** giáo viên và học sinh đọc/ghi trực tiếp `classrooms/{CODE}` và các bộ sưu tập con trên Firestore; luật bảo mật `firestore.rules` kiểm soát quyền.
6. **Ngoại tuyến:** Service Worker phục vụ vỏ ứng dụng và module từ bộ nhớ đệm; Firestore dùng bộ nhớ đệm bền vững và tự gửi các thay đổi khi có mạng trở lại.

**Sơ đồ phân tầng frontend**

```text
index.html  (vỏ ứng dụng, intro logo, thanh điều hướng, trạng thái mạng)
  └─ js/main.js  (khởi động, định nghĩa route, điều hướng, trạng thái, robot V-Bot)
       ├─ js/core/      router · store (trạng thái + bus sự kiện) · dom · ui · theme · net · idb · crypto · format
       ├─ js/pages/     mỗi trang một module: { title, mount(container, ctx) }
       ├─ js/components/ thành phần dùng lại: editor, ide/workbench, flowchart/, scratch/, chat, markdown, vbot…
       ├─ js/services/  firebase, auth, progress, classroom, conversations, ai-client, ai-modes, local-ai, content
       └─ js/runtime/   runner + worker cho từng ngôn ngữ, pyvn, html-checks
css/  tokens (sáng/tối) → base → components → shell → vbot  +  css/pages/<trang>.css (tải theo trang)
```


## PHẦN 2. CẤU TRÚC THƯ MỤC & DANH MỤC TOÀN BỘ FILE/FOLDER

Dưới đây là cây thư mục của dự án và danh mục chi tiết tất cả file, folder, kèm vai trò và thành phần chính.

### 2.1. Cây thư mục

```text
V-Code Edu/
├── .vscode/
│   └── settings.json
├── archive/
│   └── legacy-v25/
│       ├── backend/
│       │   ├── database/
│       │   │   ├── __init__.py
│       │   │   ├── base.py
│       │   │   ├── connection.py
│       │   │   └── init_db.py
│       │   ├── models/
│       │   │   ├── __init__.py
│       │   │   ├── assessment.py
│       │   │   ├── classroom.py
│       │   │   ├── learning.py
│       │   │   ├── user.py
│       │   │   └── workspace.py
│       │   ├── routers/
│       │   │   ├── __init__.py
│       │   │   ├── ai.py
│       │   │   ├── assessment.py
│       │   │   ├── auth.py
│       │   │   ├── classrooms.py
│       │   │   ├── monitor.py
│       │   │   └── sync.py
│       │   ├── schemas/
│       │   │   ├── __init__.py
│       │   │   ├── ai_schema.py
│       │   │   ├── classroom_schema.py
│       │   │   └── user_schema.py
│       │   ├── services/
│       │   │   ├── __init__.py
│       │   │   ├── ai_service.py
│       │   │   └── auth_service.py
│       │   ├── __init__.py
│       │   ├── main.py
│       │   └── requirements.txt
│       ├── css/
│       │   └── design-system.css
│       ├── js/
│       │   ├── ai-tutor.js
│       │   ├── app.js
│       │   ├── challenges-50.js
│       │   ├── cloud-db.js
│       │   ├── courses-data.js
│       │   ├── firebase-auth.js
│       │   ├── ide-engine.js
│       │   ├── lessons-data.js
│       │   ├── multilang-engine.js
│       │   ├── offline-db.js
│       │   ├── realtime-monitor.js
│       │   ├── scratch-bridge.js
│       │   ├── three-hero.js
│       │   ├── v16-core.js
│       │   ├── v18-engine.js
│       │   ├── v19-polish.js
│       │   ├── v20-final.js
│       │   ├── v21-upgrade.js
│       │   ├── v22-pro-ide.js
│       │   ├── v23-fx-caret.js
│       │   ├── v24-fix-smooth.js
│       │   └── v25-time24.js
│       ├── fix_courses.py
│       ├── fix_score_10.py
│       ├── fix_time_24h.py
│       ├── fix_vcode_v6_1.py
│       ├── index.html
│       ├── manifest.json
│       ├── setup_vcode_backend.py
│       ├── setup_vcode_frontend.py
│       ├── sqlite-export.json
│       ├── sw.js
│       ├── test_project.py
│       ├── upgrade_auth_olm_classroom.py
│       ├── upgrade_challenges_v14.py
│       ├── upgrade_full_database.py
│       ├── upgrade_home_v12.py
│       ├── upgrade_scroll_3d_home.py
│       ├── upgrade_vcode_polish.py
│       ├── upgrade_vcode_v10_olm.py
│       ├── upgrade_vcode_v11.py
│       ├── upgrade_vcode_v13.py
│       ├── upgrade_vcode_v15_complete.py
│       ├── upgrade_vcode_v16.py
│       ├── upgrade_vcode_v16_fix.py
│       ├── upgrade_vcode_v17.py
│       ├── upgrade_vcode_v18.py
│       ├── upgrade_vcode_v20.py
│       ├── upgrade_vcode_v21.py
│       ├── upgrade_vcode_v22.py
│       ├── upgrade_vcode_v23.py
│       ├── upgrade_vcode_v24.py
│       ├── upgrade_vcode_v6.py
│       ├── upgrade_vcode_v7.py
│       ├── upgrade_vcode_v8.py
│       ├── upgrade_vcode_v9.py
│       └── vcode_edu.backup.db
├── assets/
│   ├── icons/
│   │   ├── apple-touch-icon.png
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── mark-192.png
│   │   ├── mark-96.png
│   │   └── maskable-512.png
│   ├── logo-640.jpg
│   └── logo.jpg
├── backend/
│   ├── ai/
│   │   ├── providers/
│   │   │   ├── __init__.py
│   │   │   ├── anthropic.py
│   │   │   ├── base.py
│   │   │   ├── gemini.py
│   │   │   ├── ollama.py
│   │   │   └── openai.py
│   │   ├── __init__.py
│   │   ├── prompts.py
│   │   ├── registry.py
│   │   ├── schemas.py
│   │   └── service.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── errors.py
│   │   ├── logging.py
│   │   ├── middleware.py
│   │   ├── ratelimit.py
│   │   └── security.py
│   ├── database/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── connection.py
│   │   └── migrations.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── ai_usage.py
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── ai.py
│   │   └── health.py
│   ├── scripts/
│   │   ├── __init__.py
│   │   └── export_legacy_sqlite.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_chat.py
│   │   ├── test_export_script.py
│   │   ├── test_health_and_providers.py
│   │   ├── test_legacy_db.py
│   │   ├── test_providers.py
│   │   ├── test_ratelimit.py
│   │   ├── test_security.py
│   │   └── test_static.py
│   ├── __init__.py
│   ├── main.py
│   ├── requirements-dev.txt
│   ├── requirements.txt
│   └── static.py
├── css/
│   ├── pages/
│   │   ├── account.css
│   │   ├── ai.css
│   │   ├── challenges.css
│   │   ├── classroom.css
│   │   ├── flowchart.css
│   │   ├── home.css
│   │   ├── ide.css
│   │   ├── learn.css
│   │   ├── prism.css
│   │   └── scratch.css
│   ├── auth.css
│   ├── base.css
│   ├── components.css
│   ├── shell.css
│   ├── tokens.css
│   └── vbot.css
├── data/
│   ├── courses/
│   │   ├── ai.json
│   │   ├── c.json
│   │   ├── cpp.json
│   │   ├── index.json
│   │   ├── python.json
│   │   ├── pyvn.json
│   │   └── web.json
│   ├── challenges.json
│   └── pyvn-keywords.json
├── docs/
│   ├── ARCHITECTURE.md
│   └── BACKEND.md
├── js/
│   ├── components/
│   │   ├── flowchart/
│   │   │   ├── codegen.js
│   │   │   ├── editor.js
│   │   │   ├── export.js
│   │   │   ├── expr.js
│   │   │   ├── icons-local.js
│   │   │   ├── index.js
│   │   │   ├── interpreter.js
│   │   │   ├── layout.js
│   │   │   ├── live.js
│   │   │   ├── model.js
│   │   │   ├── parse-code.js
│   │   │   ├── render.js
│   │   │   ├── semantics.js
│   │   │   ├── templates.js
│   │   │   └── viewport.js
│   │   ├── ide/
│   │   │   ├── autocomplete.js
│   │   │   ├── controls.js
│   │   │   ├── diagnostics.js
│   │   │   ├── editor-theme.js
│   │   │   ├── explain-errors.js
│   │   │   ├── files.js
│   │   │   ├── find.js
│   │   │   ├── formatter.js
│   │   │   ├── problems.js
│   │   │   └── settings.js
│   │   ├── scratch/
│   │   │   ├── blocks.js
│   │   │   ├── codegen.js
│   │   │   ├── frompy.js
│   │   │   ├── index.js
│   │   │   ├── live.js
│   │   │   ├── projects.js
│   │   │   ├── pyparse.js
│   │   │   ├── render.js
│   │   │   ├── runtime.js
│   │   │   ├── shapes.js
│   │   │   ├── sprites.js
│   │   │   ├── stage.js
│   │   │   ├── studio.js
│   │   │   └── workspace.js
│   │   ├── auth-dialog.js
│   │   ├── chat.js
│   │   ├── editor.js
│   │   ├── highlight.js
│   │   ├── icons.js
│   │   ├── ide.js
│   │   ├── markdown.js
│   │   ├── practice.js
│   │   └── vbot.js
│   ├── core/
│   │   ├── crypto.js
│   │   ├── dom.js
│   │   ├── format.js
│   │   ├── idb.js
│   │   ├── net.js
│   │   ├── router.js
│   │   ├── store.js
│   │   ├── theme.js
│   │   └── ui.js
│   ├── pages/
│   │   ├── arena/
│   │   │   ├── art.js
│   │   │   ├── core.js
│   │   │   └── overlay.js
│   │   ├── classroom/
│   │   │   ├── art.js
│   │   │   ├── assignments.js
│   │   │   ├── feed.js
│   │   │   ├── gradebook.js
│   │   │   ├── home.js
│   │   │   ├── landing.js
│   │   │   ├── overview.js
│   │   │   ├── people.js
│   │   │   ├── settings.js
│   │   │   ├── shell.js
│   │   │   ├── util.js
│   │   │   └── workspace.js
│   │   ├── home/
│   │   │   ├── hero3d.js
│   │   │   └── scenes.js
│   │   ├── learn/
│   │   │   ├── course-art.js
│   │   │   └── shared.js
│   │   ├── prism/
│   │   │   ├── topics/
│   │   │   │   ├── graphs.js
│   │   │   │   ├── linear.js
│   │   │   │   ├── recursion-dp.js
│   │   │   │   ├── sorting.js
│   │   │   │   └── trees.js
│   │   │   ├── catalog.js
│   │   │   ├── engine.js
│   │   │   ├── index.js
│   │   │   ├── mini.js
│   │   │   └── renderers.js
│   │   ├── account.js
│   │   ├── ai.js
│   │   ├── challenge.js
│   │   ├── challenges.js
│   │   ├── classroom.js
│   │   ├── course.js
│   │   ├── home.js
│   │   ├── learn.js
│   │   ├── lesson.js
│   │   ├── not-found.js
│   │   └── workspace.js
│   ├── runtime/
│   │   ├── cpp.worker.js
│   │   ├── html-checks.js
│   │   ├── js.worker.js
│   │   ├── python.worker.js
│   │   ├── pyvn.js
│   │   ├── runner.js
│   │   └── sql.worker.js
│   ├── services/
│   │   ├── ai-client.js
│   │   ├── ai-modes.js
│   │   ├── auth.js
│   │   ├── classroom.js
│   │   ├── content.js
│   │   ├── conversations.js
│   │   ├── firebase.js
│   │   ├── local-ai.js
│   │   └── progress.js
│   ├── config.js
│   └── main.js
├── tests/
│   ├── e2e/
│   │   ├── fixtures/
│   │   │   └── firebase-mock/
│   │   │       ├── firebase-app.js
│   │   │       ├── firebase-auth.js
│   │   │       └── firebase-firestore.js
│   │   ├── firebase_mock.py
│   │   ├── test_app.py
│   │   ├── test_challenges.py
│   │   ├── test_classroom.py
│   │   ├── test_cpp_content.py
│   │   ├── test_ide.py
│   │   └── test_web_lessons.py
│   └── harness/
│       ├── html-checks.html
│       └── jscpp.html
├── tools/
│   ├── build_catalog.py
│   ├── pyvn.py
│   ├── update_sw_precache.py
│   ├── validate_content.py
│   └── validate_cpp_content.py
├── vendor/
│   ├── jscpp/
│   │   └── JSCPP.es5.min.js
│   └── sqljs/
│       ├── sql-wasm.js
│       └── sql-wasm.wasm
├── .env.example
├── .gitignore
├── firebase.json
├── firestore.indexes.json
├── firestore.rules
├── index.html
├── manifest.json
├── README.md
├── sw.js
├── vcode_edu.db
├── vcode_edu.db-shm
└── vcode_edu.db-wal
```


### 2.2. Danh mục toàn bộ file và folder

| Đường dẫn | Vai trò | Thành phần chính |
|---|---|---|
| `backend/__init__.py` | Tệp rỗng, đánh dấu thư mục `backend` là gói Python (để chạy `uvicorn backend.main:app`, `python -m backend.scripts...`) | Không có nội dung |
| `backend/main.py` | Điểm vào của ứng dụng FastAPI: tạo app, gắn middleware, router, vòng đời (migration), phục vụ frontend | Hàm `create_app(settings, *, registry, token_verifier)`; hàm `lifespan` (gọi `run_migrations`, đóng `registry`, `database.dispose()`); `FastAPI(title="V-Code Edu API", docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json")`; gán `app.state.settings/database/registry/token_verifier/rate_limiter/daily_quota/ai_service`; `CORSMiddleware` (`allow_credentials=False`, phương thức `GET, POST, OPTIONS`, header `Authorization, Content-Type`, `expose_headers=["Retry-After"]`, `max_age=600`); `SecurityHeadersMiddleware`; `include_router(health_router.router)`, `include_router(ai_router.router)`; `mount_frontend` khi `serve_frontend`; biến toàn cục `app = create_app()` |
| `backend/static.py` | Phục vụ frontend tĩnh theo danh sách trắng, chuẩn hóa MIME | Hằng `STATIC_DIRS = ("css", "js", "data", "assets", "vendor", "docs")`; `_MIME_OVERRIDES` (.js→`text/javascript`, .wasm→`application/wasm`…); `register_mime_types()`; lớp `SafeStaticFiles(StaticFiles)` với `check_config()` (thư mục thiếu → 404) và `get_response()` (từ chối đoạn đường dẫn bắt đầu bằng dấu chấm); `_not_found()`; `mount_frontend(app, root)` khai báo route `GET /`, `/index.html`, `/manifest.json`, `/sw.js` (header `Cache-Control: no-cache`, `Service-Worker-Allowed: /` cho sw.js) và mount 6 thư mục |
| `backend/requirements.txt` | Danh sách thư viện chạy backend | `fastapi>=0.111.0`, `uvicorn>=0.30.0`, `sqlalchemy>=2.0.30`, `pydantic>=2.7.0`, `httpx>=0.27.0`, `cryptography>=42.0.0`; tùy chọn (chú thích): `pymysql>=1.1.1`, `psycopg2-binary>=2.9.9` |
| `backend/requirements-dev.txt` | Thư viện phục vụ kiểm thử backend | `-r requirements.txt`, `pytest>=8.0` |
| `backend/ai/__init__.py` | Tệp rỗng, khai báo gói `backend.ai` | Không có nội dung |
| `backend/ai/prompts.py` | Định nghĩa 7 chế độ trợ lý V-Mentor và dựng system prompt tiếng Việt | Hằng `PRISM_TOPICS` (14 chủ đề), `MODES` (tutor, reviewer, debugger, algorithm, learning, project, knowledge — mỗi mục có `id`, `label`, `description`), `MODE_IDS`, `BASE_PROMPT`, `MODE_PROMPTS`; hàm `_fence()` (thay ```` ``` ```` bằng `ʼʼʼ`), `build_context_block(context)` (khối `<ngu_canh>`), `build_system_prompt(mode, context)` |
| `backend/ai/schemas.py` | Lược đồ Pydantic kiểm tra yêu cầu `/api/ai/chat` và chuẩn hóa hội thoại | Hằng `MAX_MESSAGES = 40`, `MAX_MESSAGE_CHARS = 12_000`, `MAX_TOTAL_CHARS = 60_000`; kiểu `Mode`; lớp `ChatMessage` (validator `_not_blank`), `ChatContext` (`code` ≤20 000, `language` ≤40, `error` ≤8 000, `lesson` ≤4 000), `ChatRequest` (`messages`, `mode`, `provider` với pattern `^[a-z0-9_-]+$`, `context`; validator `_last_must_be_user`); hàm `prepare_messages(messages, budget)` |
| `backend/ai/registry.py` | Sổ đăng ký nhà cung cấp AI: thứ tự ưu tiên, kiểm tra sẵn sàng, chọn theo yêu cầu | Hằng `NO_PROVIDER_MESSAGES` (auto/cloud/local); lớp `ProviderRegistry` với `from_settings(settings)` (tạo `HttpClientHolder` + factory gemini/openai/anthropic/ollama theo `ai_provider_order`), thuộc tính `providers`, `get()`, `_availability()` (`asyncio.gather`), `describe()`, `default_id()`, `candidates(preference)` (400 nếu mã lạ, 503 `no_provider` nếu không có), `aclose()` |
| `backend/ai/service.py` | Điều phối hội thoại AI: hạn mức, chọn nhà cung cấp có dự phòng, phát luồng SSE | Hằng `SSE_HEADERS`; hàm `sse_event(event, data)`; dataclass `RunError`; lớp `ProviderRun` (task riêng, hàng đợi `asyncio.Queue(maxsize=512)`, `_run()` với `asyncio.timeout`, `next()`, `cancel()`); lớp `AIService` với `daily_limit()`, `usage()`, `_seconds_until_reset()`, `start_chat()` (429 khi vượt hạn mức, thử lần lượt nhà cung cấp, 503 khi tất cả lỗi), `_stream()` (sự kiện `meta` → `delta` → `done`/`error`) |
| `backend/ai/providers/__init__.py` | Tệp rỗng, khai báo gói nhà cung cấp | Không có nội dung |
| `backend/ai/providers/base.py` | Giao diện chung cho nhà cung cấp AI và tiện ích phân tích luồng | Dataclass `Chunk` (`text`, `finish_reason`, `usage`), `ProviderRequest` (`system`, `messages`, `max_tokens=2048`, `temperature=0.4`, `extra`); ngoại lệ `ProviderError` (`status`, `code`); lớp `HttpClientHolder` (một `httpx.AsyncClient` dùng chung, tạo lười, `follow_redirects=False`); lớp trừu tượng `Provider` (`is_configured()`, `is_available()`, `stream()`, `describe_static()`); hàm `_error_message_from_body()`, `ensure_ok()` (HTTP ≥400 → `ProviderError`, 429 → `rate_limited`), `iter_sse()`, `iter_ndjson()` |
| `backend/ai/providers/gemini.py` | Nhà cung cấp Google Gemini (`streamGenerateContent`, SSE) | Hằng `_FINISH_MAP`; lớp `GeminiProvider` (`id="gemini"`, `kind="cloud"`): `is_configured()`, `_payload()` (`systemInstruction`, `contents` đổi `assistant`→`model`, `generationConfig`), `stream()` (header `x-goog-api-key`, tham số `alt=sse`, xử lý `promptFeedback.blockReason`, `usageMetadata`, bỏ phần `thought`) |
| `backend/ai/providers/openai.py` | Nhà cung cấp OpenAI Chat Completions (stream), dùng được với máy chủ tương thích OpenAI | Lớp `OpenAIProvider` (`id="openai"`): tham số `token_param` (`max_tokens`/`max_completion_tokens`), `_payload()` (thêm `stream_options.include_usage` chỉ khi base URL là `api.openai.com`), `stream()` (header `Authorization: Bearer`, dừng ở `[DONE]`) |
| `backend/ai/providers/anthropic.py` | Nhà cung cấp Anthropic Claude (Messages API, stream) | Hằng `ANTHROPIC_VERSION = "2023-06-01"`, `_FINISH_MAP`; lớp `AnthropicProvider` (`id="anthropic"`): `_payload()` (trường `system` cấp cao nhất), `stream()` (header `x-api-key`, `anthropic-version`; xử lý sự kiện `error`, `message_start`, `content_block_delta`, `message_delta`, `message_stop`) |
| `backend/ai/providers/ollama.py` | Nhà cung cấp AI cục bộ Ollama (máy chủ trường/LAN, không cần Internet) | Hằng `PROBE_TIMEOUT = 1.5`, `PROBE_CACHE_SECONDS = 30.0`; lớp `OllamaProvider` (`id="ollama"`, `kind="local"`): `is_configured()`, `_model_present(tags)`, `is_available()` (gọi `GET /api/tags`, lưu đệm 30 giây), `stream()` (`POST /api/chat`, NDJSON, `options.num_predict`) |
| `backend/core/__init__.py` | Tệp rỗng, khai báo gói `backend.core` | Không có nội dung |
| `backend/core/config.py` | Đọc cấu hình từ biến môi trường và tệp `.env` | Hằng `BASE_DIR`, `APP_VERSION = "6.0.0"`, `DEFAULT_ALLOWED_ORIGINS`; hàm `parse_dotenv()`, `load_env()` (biến môi trường thật thắng `.env`), `_bool()`, `_int()`, `_float()`, `_list()`; dataclass bất biến `Settings` (toàn bộ giá trị mặc định, thuộc tính `is_sqlite`); `settings_from_env(env)`; `get_settings()` (`lru_cache`); `reload_settings()` |
| `backend/core/errors.py` | Định dạng lỗi API thống nhất `{"detail": {"code", "message"}}` | Lớp `ApiError(status_code, code, message, *, headers, **extra)` với `to_response()`; hàm `_simplify_validation_errors()`; `install_error_handlers(app)` đăng ký handler cho `ApiError`, `RequestValidationError` (422 `bad_request` kèm `errors`) và `Exception` (500 `internal_error`) |
| `backend/core/logging.py` | Cấu hình logging cho logger `vcode` | Hàm `configure_logging(level)`; định dạng `"%(asctime)s %(levelname)s [%(name)s] %(message)s"`; chú thích nguyên tắc không ghi nội dung tin nhắn/khóa API |
| `backend/core/middleware.py` | Middleware ASGI thuần thêm header bảo mật (không cản luồng SSE) | Hằng `SECURITY_HEADERS` (`x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `x-frame-options: SAMEORIGIN`, `permissions-policy: camera=(), geolocation=(), payment=(), usb=()`); lớp `SecurityHeadersMiddleware` (`__call__` bọc `send`); chủ ý không đặt COOP/COEP |
| `backend/core/ratelimit.py` | Giới hạn tần suất gọi AI theo phút (bộ nhớ) và theo ngày (CSDL) | Lớp `MinuteRateLimiter` (cửa sổ trượt 60 giây, `threading.Lock`, `acquire()`, `release()`, `_prune()`); hàm `utc_day()`, `next_reset_iso()`; lớp `DailyQuota` (`used()`, `increment()` với UPDATE/INSERT và thử lại 3 lần khi `IntegrityError`) |
| `backend/core/security.py` | Xác minh Firebase ID token (RS256) không cần firebase-admin; xác định chủ thể user/khách | Hằng `GOOGLE_CERTS_URL`, `CLOCK_SKEW_SECONDS = 60`, `DEFAULT_CERT_MAX_AGE = 3600`; ngoại lệ `TokenError`, `CertsUnavailable`; hàm `_b64url_decode()`, `_parse_max_age()`, `fetch_google_certs()`; lớp `FirebaseTokenVerifier` (`_load_keys()` lưu đệm theo `max-age`, `verify()` kiểm tra `alg`, `kid`, chữ ký, `aud`, `iss`, `exp`, `iat`, `auth_time`, `sub`); dataclass `Principal` (`kind`, `ip`, `uid`, `email`, `verified`, thuộc tính `subject`); hàm `client_ip(request, trust_proxy)`, phụ thuộc `get_principal(request)` |
| `backend/database/__init__.py` | Tệp rỗng, khai báo gói `backend.database` | Không có nội dung |
| `backend/database/base.py` | Lớp cơ sở khai báo mô hình SQLAlchemy | Lớp `Base(DeclarativeBase)` |
| `backend/database/connection.py` | Kết nối CSDL SQLite/MySQL/PostgreSQL và quản lý phiên | Hàm `normalize_database_url()` (`postgres://`→`postgresql://`, `mysql://`→`mysql+pymysql://`), `create_db_engine()` (SQLite: `check_same_thread=False`, `timeout=15`, PRAGMA `foreign_keys=ON`, `journal_mode=WAL`; MySQL/PostgreSQL: `pool_size=10`, `max_overflow=20`, `pool_pre_ping`, `pool_recycle=1800`); lớp `Database` (`session()` context manager, `dispose()`); phụ thuộc `get_db(request)` |
| `backend/database/migrations.py` | Bộ chạy migration tối giản có đánh số phiên bản, chỉ thêm bảng | Hằng `LEGACY_TABLES` (10 bảng cũ), bảng `schema_meta` (`key`, `value`), `MIGRATIONS = [(1, "Tạo bảng ai_usage…", _m001_ai_usage)]`, `LATEST_VERSION`; hàm `_m001_ai_usage()`, `get_schema_version()`, `_set_version()` (ghi `schema_version`, `migrated_at`), `run_migrations(engine)` |
| `backend/models/__init__.py` | Tệp rỗng, khai báo gói `backend.models` | Không có nội dung |
| `backend/models/ai_usage.py` | Mô hình ORM bảng `ai_usage` (đếm lượt gọi AI theo ngày UTC và chủ thể) | Hàm `_utcnow()`; lớp `AIUsage(Base)`: `__tablename__ = "ai_usage"`, ràng buộc `UniqueConstraint("day", "subject", name="uq_ai_usage_day_subject")`, cột `id`, `day` (String(10), index), `subject` (String(160)), `count`, `updated_at` |
| `backend/routers/__init__.py` | Tệp rỗng, khai báo gói `backend.routers` | Không có nội dung |
| `backend/routers/ai.py` | Router API trợ lý AI (`/api/ai`, tag "Trợ lý AI V-Mentor") | `router = APIRouter(prefix="/api/ai")`; endpoint `GET /providers` → `list_providers()`; `GET /usage` → `get_usage()` (phụ thuộc `get_principal`); `POST /chat` → `chat(payload: ChatRequest, …)` gọi `ai_service.start_chat` |
| `backend/routers/health.py` | Router kiểm tra sức khỏe hệ thống (`/api`, tag "Hệ thống") | Endpoint `GET /api/health` → `health()` trả `status`, `service`, `version`, `time` (UTC, hậu tố `Z`), `ai.providers[{id, kind, available}]` |
| `backend/scripts/__init__.py` | Tệp rỗng, khai báo gói `backend.scripts` | Không có nội dung |
| `backend/scripts/export_legacy_sqlite.py` | Công cụ dòng lệnh xuất dữ liệu bảng cũ trong `vcode_edu.db` ra JSON, loại bỏ cột bí mật | Hằng `LEGACY_TABLES`, `SECRET_COLUMN` (regex `password|secret|token|api_?key|salt`); hàm `_connect_readonly()` (mở `mode=ro`, nếu lỗi thì đọc bản sao tạm kèm `-wal`), `export_legacy(db_path, out_path)`, `main(argv)` (tham số `--db`, `--out`, mặc định `archive/legacy-v25/sqlite-export.json`) |
| `backend/tests/__init__.py` | Tệp rỗng, cho phép import tương đối `from .conftest import …` | Không có nội dung |
| `backend/tests/conftest.py` | Cấu hình pytest: CSDL tạm, tắt khóa AI thật, nhà cung cấp giả lập, công cụ dựng client | Đặt `DATABASE_URL` tạm, xóa `GEMINI/OPENAI/ANTHROPIC_API_KEY`, `OLLAMA_ENABLED=0` trước khi import; lớp `FakeProvider` (tùy chọn `fail_before`, `fail_after`, `available`); hàm `make_settings()`; fixture `build_client`; hàm `parse_sse()`, `user_msg()` |
| `backend/tests/test_chat.py` | Kiểm thử luồng chat SSE, dự phòng nhà cung cấp, kiểm tra dữ liệu vào | `test_chat_streams_meta_delta_done`, `test_context_is_injected_as_delimited_block`, `test_fallthrough_when_first_provider_fails_before_first_delta`, `test_all_providers_fail_returns_json_503_and_no_quota_used`, `test_error_after_stream_started_emits_error_event`, `test_no_provider_returns_503`, `test_no_providers_registered_returns_503`, `test_provider_preference_routing`, `test_local_preference_without_local_provider`, `test_unknown_provider_is_400`, `test_validation_errors_are_422_with_code`, `test_extra_fields_are_ignored`, `test_prepare_messages_trims_oldest_and_keeps_last_user`, `test_prepare_messages_merges_consecutive_roles` (14 hàm) |
| `backend/tests/test_export_script.py` | Kiểm thử script xuất dữ liệu cũ loại bỏ cột bí mật | `test_export_excludes_secrets` (1 hàm) |
| `backend/tests/test_health_and_providers.py` | Kiểm thử `/api/health`, `/api/ai/providers`, header bảo mật, CORS, bộ đọc `.env` | `test_health_reports_providers`, `test_providers_listing_and_modes`, `test_providers_default_none_when_nothing_available`, `test_security_headers_and_cors`, `test_dotenv_parser_and_settings` (5 hàm) |
| `backend/tests/test_legacy_db.py` | Bảo đảm backend không làm thay đổi dữ liệu cũ (làm việc trên bản sao `vcode_edu.db`) | Hàm `_snapshot()`, fixture `legacy_copy` (bỏ qua nếu không có `vcode_edu.db`); `test_app_startup_does_not_touch_legacy_tables`, `test_migrations_are_idempotent`, `test_fresh_database_gets_only_new_tables` (3 hàm) |
| `backend/tests/test_providers.py` | Kiểm thử định dạng giao tiếp từng nhà cung cấp bằng `httpx.MockTransport` | Hằng `REQ`; hàm `holder()`, `sse_body()`, `collect()`; lớp `_Slow`; `test_gemini_wire_format`, `test_openai_wire_format`, `test_openai_compatible_server_and_token_param`, `test_anthropic_wire_format`, `test_anthropic_stream_error_event`, `test_http_error_status_raises_provider_error_without_leaking_key`, `test_ollama_stream_and_probe`, `test_ollama_unavailable_when_model_missing_or_server_down`, `test_provider_run_total_timeout_and_cancel` (9 hàm) |
| `backend/tests/test_ratelimit.py` | Kiểm thử giới hạn theo phút, hạn mức ngày, xử lý `X-Forwarded-For` | `test_minute_limit_returns_429_with_retry_after`, `test_minute_slot_released_when_no_provider_starts`, `test_guest_daily_quota`, `test_daily_quota_persists_across_app_restart`, `test_zero_guest_limit_blocks_guests`, `test_forwarded_for_only_trusted_when_enabled`, `test_forwarded_for_trusted_proxy`, `test_minute_limiter_window_and_release` (8 hàm) |
| `backend/tests/test_security.py` | Kiểm thử xác minh Firebase ID token (khóa RSA tự sinh) và hành vi ở mức endpoint | Hàm `_make_key_and_cert()`, `make_token()`, `make_verifier()`, `run()`; `test_valid_token`, `test_invalid_claims` (parametrize 6 trường hợp), `test_bad_signature`, `test_unknown_kid_triggers_refresh_then_fails`, `test_wrong_alg_and_malformed`, `test_certs_are_cached`, `test_certs_unavailable_raises`, `test_parse_max_age`, `test_authenticated_user_gets_user_quota`, `test_invalid_token_is_401_json`, `test_offline_server_treats_token_as_guest` (11 hàm → 16 trường hợp) |
| `backend/tests/test_static.py` | Kiểm thử phục vụ tệp tĩnh theo danh sách trắng | Fixture `frontend`; `test_whitelisted_files_are_served`, `test_service_worker_headers`, `test_everything_else_is_404` (parametrize 13 đường dẫn), `test_api_takes_precedence_and_docs_moved`, `test_frontend_disabled`, `test_missing_index_is_404` (6 hàm → 18 trường hợp) |
| `index.html` | Vỏ ứng dụng (app shell) duy nhất của SPA: meta, manifest, intro, thanh điều hướng, vùng nội dung, footer | Script đầu trang áp dụng theme từ `localStorage['vc-theme']` và quyết định intro (`sessionStorage['vc-intro-seen']`, `?intro=1`, bỏ qua khi `navigator.webdriver`); khối intro `#vc-intro` (tự đóng sau 3000 ms hoặc 700 ms khi `prefers-reduced-motion`, phím Esc/Enter/Space); nạp CSS `tokens/base/components/shell/vbot`, `<script type="module" src="js/main.js">`; các điểm gắn `data-nav-links`, `data-net-pill`, `data-status-panel`, `data-xp-chip`, `data-theme-toggle`, `data-account-slot`, `data-burger`, `#mobile-drawer`, `#app-main`, `data-footer`, `#toast-region` |
| `sw.js` | Service Worker hỗ trợ ngoại tuyến (PWA) | Hằng `VERSION = 'v3.1.0'`, `SHELL_CACHE`, `ASSET_CACHE`, `RUNTIME_CACHE = 'vcode-runtime-v1'`, danh sách `SHELL` (tệp precache), `RUNTIME_HOSTS`; sự kiện `install` (precache từng tệp + các tệp khóa học từ `index.json`, `skipWaiting`), `activate` (xóa cache `vcode-` cũ, `clients.claim`), `fetch`, `message` (`'skip-waiting'`); hàm `staleWhileRevalidate()`, `cacheFirst()`, `networkFirstNavigation()` |
| `manifest.json` | Web App Manifest cho cài đặt PWA | `name`, `short_name: "V-Code Edu"`, `lang: "vi"`, `start_url: "./#/"`, `scope: "./"`, `display: "standalone"`, `background_color`, `theme_color: "#2f49d1"`, `categories`, 3 icon (192, 512, maskable 512), 3 `shortcuts` (Học tiếp `#/learn`, IDE `#/workspace`, Trợ lý AI `#/ai`) |
| `firebase.json` | Cấu hình Firebase CLI: Firestore rules/indexes và Firebase Hosting | `firestore.rules`, `firestore.indexes`; `hosting.public: "."`; `ignore` (`backend/**`, `archive/**`, `tools/**`, `tests/**`, `*.db`, `*.db-*`, `.env*`, tệp ẩn…); `headers`: `/sw.js` → `no-cache`, `**/*.@(js|css|json|wasm)` → `public, max-age=3600` |
| `firestore.rules` | Luật bảo mật Cloud Firestore (rules_version 2) | Hàm trợ giúp `signedIn()`, `myKey()`, `isGoogleVerified()`, `changed()`, `profile()`, `isTeacher()`, `classDoc()`, `isOwnerOf()`, `isMemberOf()`, `shortText()`; khối `users/{key}` (+ `legacyLocked()`, `roleOk()`, `noPrivilegedFields()`, subcollection `conversations/{cid}`), `leaderboard/{key}`, `classrooms/{code}` (+ `joiningSelf()`, `leavingSelf()`, subcollection `assignments`, `submissions` với `deadlineOpen()`, `presence`, `messages`) |
| `firestore.indexes.json` | Khai báo chỉ mục tổng hợp Firestore | `"indexes": []`, `"fieldOverrides": []` (chưa có chỉ mục tùy chỉnh) |
| `.env.example` | Mẫu cấu hình backend (sao chép thành `.env`) | 30 biến: `APP_ENV`, `LOG_LEVEL`, `DATABASE_URL`, `FIREBASE_PROJECT_ID`, `ALLOWED_ORIGINS`, `SERVE_FRONTEND`, `FRONTEND_DIR`, `TRUST_PROXY`, `AI_PROVIDER_ORDER`, `AI_RATE_PER_MINUTE`, `AI_DAILY_LIMIT_USER`, `AI_DAILY_LIMIT_GUEST`, `AI_MAX_OUTPUT_TOKENS`, `AI_TEMPERATURE`, `AI_CONNECT_TIMEOUT`, `AI_READ_TIMEOUT`, `AI_TOTAL_TIMEOUT`, `GEMINI_*` (3), `OPENAI_*` (4), `ANTHROPIC_*` (3), `OLLAMA_*` (3) |
| `.gitignore` | Loại trừ tệp khỏi Git | `.venv/`, `__pycache__/`, `*.pyc`, `.pytest_cache/`, `test-results/`; `.env`, `.env.*` (trừ `!.env.example`); `*.db`, `*.db-wal`, `*.db-shm`, `*.sqlite`, `archive/**/sqlite-export.json`, `archive/**/*.db`; `.DS_Store`, `Thumbs.db`; `tests/e2e/screenshots/` |
| `.vscode/settings.json` | Cấu hình VS Code cho dự án | `liveServer.settings.port: 5500`, `liveServer.settings.root: "/"`, `editor.formatOnSave: true`, `editor.tabSize: 2`, `livePreview.defaultPreviewPath: "/index.html"` |
| `README.md` | Tài liệu giới thiệu, chạy nhanh, cấu hình Firebase, biến môi trường, cấu trúc thư mục, kiểm thử, bảo mật dữ liệu cũ | Bảng công nghệ; lệnh tạo venv, cài `backend\requirements.txt`, chạy `uvicorn backend.main:app --port 8000`; 3 bước Firebase Console; lệnh kiểm thử (backend 74, e2e 119); lệnh `tools/update_sw_precache.py v3.1.0`; ghi chú `git rm --cached vcode_edu.db` |
| `docs/ARCHITECTURE.md` | Tài liệu kiến trúc & "hợp đồng" giữa các module | Sơ đồ tổng quan; quy ước frontend (không build, tokens, `h()`/`s()`, page module `{title, mount}`); bảng định tuyến hash; lược đồ JSON khóa học/thử thách; quy tắc chấm bài; bảng đường dẫn Firestore và quyền; API backend và định dạng sự kiện SSE |
| `docs/BACKEND.md` | Tài liệu backend FastAPI | Cài đặt & chạy, kiểm thử, bảng API, bảng biến môi trường 28 dòng (bao phủ 30 biến, có mặc định), cấu hình từng nhà cung cấp AI (kể cả Ollama), triển khai (Render/Railway/Fly.io, VPS, Firebase Hosting), mô hình bảo mật, CSDL & dữ liệu cũ, cấu trúc thư mục, cách thêm nhà cung cấp mới |
| `tools/build_catalog.py` | Sinh `data/courses/index.json` (danh mục khóa học cho trang Học) | Hằng `ROOT`, `COURSES_DIR`, `OUT`, `ORDER = ["pyvn", "python", "web", "c", "cpp", "ai"]`, `TRACKS` (4 lộ trình available), `ROADMAP` (5 lộ trình tương lai); hàm `load_courses()` (đếm chương/bài/XP), `build()` (thêm `cpp` vào lộ trình `algorithms`, `version: 2`, `generated_at`) |
| `tools/pyvn.py` | Bản Python của `js/runtime/pyvn.js`: dịch "Python Tiếng Việt" sang Python | Hằng `MAPPING_PATH` (`data/pyvn-keywords.json`); hàm `load_mapping()` (`lru_cache`), `_segments()` (tách code/chuỗi/chú thích), `translate_with(mapping, src)` (thay cụm từ dài trước, rồi từ khóa, regex `re.ASCII`), `translate(src)`; chạy CLI với tệp hoặc stdin |
| `tools/update_sw_precache.py` | Cập nhật danh sách `SHELL` trong `sw.js` theo tệp thực có, tùy chọn đổi `VERSION` | Hằng `STATIC` (13 mục cố định); hàm `collect()` (mọi `.js`/`.css` trong `css/`, `js/`, bỏ tệp bắt đầu bằng `_`), `main()` (báo lỗi nếu thiếu tệp, thay khối `const SHELL = [...]` bằng regex, thay `const VERSION = '...'` nếu có tham số) |
| `tools/validate_content.py` | Kiểm tra nội dung khóa học và thử thách (lược đồ, NFC, chạy lời giải Python) | Hằng `LANGS`, `RUNNABLE`, `TRACKS`, `ACCENTS`, `DIFFICULTY_XP`, `PRISM_TOPICS`, `CHECK_TYPES`, `CHALLENGE_LANGS`, `RANKS`, `TIMEOUT = 5`; lớp `Report`; hàm `normalize_output()`, `run_python()` (subprocess `-X utf8 -I`), `check_nfc()`, `validate_tests()`, `validate_checks()`, `validate_course()`, `validate_challenges()`, `execute()` (`ThreadPoolExecutor(max_workers=8)`), `main()` (cờ `--course`, `--run-challenges`, `--no-run`) |
| `tools/validate_cpp_content.py` | Kiểm tra khóa C/C++ và bộ 100 thử thách; chạy lời giải C/C++ bằng JSCPP trong trình duyệt headless | Hằng `COURSE_FILES`, `HARNESS = "tests/harness/jscpp.html"`, `WORLD_LANG`; lớp `Report`, `QuietHandler`; hàm `normalize()`, `words_outside_code()`, `check_tests()`, `validate_course_schema()`, `validate_challenges_schema()` (đúng 100 mục, thế giới 1..5), `run_python()`, `free_port()`, `start_server()`, `launch_browser()` (msedge → chrome → chromium), `run_items()`, `main()` (cờ `--only`, `--browser`, `--skip-jscpp`, `-v`) |
| `tests/e2e/firebase_mock.py` | Mô-đun hỗ trợ kiểm thử: giả lập Firebase trong Playwright (chặn URL SDK gstatic) | Hằng `FIXTURES`, `SDK_GLOB = "https://www.gstatic.com/firebasejs/**"`; hàm `email_key()`, `profile()`, `install_firebase_mock(context, user, db)` (đặt `window.__FBMOCK__`, `context.route`), `new_mock_context()` (`service_workers="block"`, locale `vi-VN`), `dump_db(page)` |
| `tests/e2e/fixtures/firebase-mock/firebase-app.js` | Bản giả `firebase-app.js` chỉ dùng trong kiểm thử | `initializeApp()`, `getApps()`, `getApp()`, `SDK_VERSION = 'mock'` |
| `tests/e2e/fixtures/firebase-mock/firebase-auth.js` | Bản giả `firebase-auth.js`; người dùng lấy từ `window.__FBMOCK__.user` | `makeUser()` (`getIdToken` trả `'mock-token'`), `getAuth()`, `onAuthStateChanged()`, `onIdTokenChanged()`, `getRedirectResult()`, `signOut()`, `GoogleAuthProvider`, `EmailAuthProvider`; các hàm đăng nhập/đổi mật khẩu ném lỗi `auth/operation-not-allowed`; `updateProfile()`, `sendEmailVerification()` |
| `tests/e2e/fixtures/firebase-mock/firebase-firestore.js` | Bản giả Firestore trong bộ nhớ (không mô phỏng security rules) | Lớp `Timestamp`, `FieldPath`; `globalThis.__fbmock` (`store`, `dump()`, `writes`); sentinel `serverTimestamp`, `deleteField`, `arrayUnion`, `arrayRemove`, `increment`; `getFirestore`, `initializeFirestore`, `doc`, `collection`, `where`, `orderBy`, `limit`, `query`, `getDoc`, `getDocs`, `onSnapshot`, `setDoc`, `updateDoc`, `deleteDoc`, `addDoc`, `writeBatch` |
| `tests/e2e/test_app.py` | Kiểm thử E2E giao diện chính bằng Microsoft Edge (Playwright) trên server cổng 8000 | Fixture `browser`, `page`; hàm `go()`, `load_json()`, `set_editor()`; `test_routes_render_without_errors` (parametrize 10 route), `test_learn_lists_all_courses`, `test_theme_toggle_switches_and_persists`, `test_python_lesson_solution_passes`, `test_python_starter_does_not_pass_and_run_works`, `test_pyvn_lesson_solution_passes`, `test_cpp_lesson_and_c_challenge_pass_in_jscpp`, `test_web_lesson_checks_pass`, `test_progress_is_saved_locally`, `test_workspace_runs_languages` (parametrize 4 ngôn ngữ), `test_workspace_infinite_loop_is_stopped`, `test_workspace_share_link_roundtrip`, `test_prism_every_algorithm_runs`, `test_prism_custom_input_validation_and_controls`, `test_ai_chat_shows_clear_error_without_provider`, `test_markdown_renderer_is_xss_safe`, `test_mobile_layouts`, `test_offline_after_first_visit` (18 hàm → 30 trường hợp) |
| `tests/e2e/test_challenges.py` | Kiểm thử E2E Đấu trường thử thách (sảnh + trận đấu) | `test_lobby_renders_all_cards_daily_and_player`, `test_lobby_filters`, `test_solve_first_challenge_shows_victory`, `test_wrong_answer_shows_defeat`, `test_mobile_lobby_and_match_no_overflow` (5 hàm) |
| `tests/e2e/test_classroom.py` | Kiểm thử E2E Lớp học với Firebase giả lập (giáo viên/học sinh) | Hằng `TEACHER`, `STUDENT`, `JS_SOLUTION`; hàm `open_page()`, `go()`, `modal()`; `test_signed_out_landing_and_invite`, `test_role_selection_teacher`, `test_teacher_student_full_flow`, `test_classroom_mobile_no_overflow` (4 hàm) |
| `tests/e2e/test_cpp_content.py` | Vỏ pytest gọi `tools/validate_cpp_content.py` | `test_cpp_courses_and_challenges_validate` (bỏ qua nếu chưa cài playwright; timeout 900 s), `test_schema_and_python_challenges_without_browser` (cờ `--skip-jscpp`) (2 hàm) |
| `tests/e2e/test_ide.py` | Kiểm thử E2E IDE chuyên nghiệp `#/workspace` và workbench | `test_editor_theme_toggle_persists_everywhere`, `test_errors_tab_explains_name_error_and_jumps_to_line`, `test_input_hint_and_eof_explanation`, `test_autocomplete_inserts_suggestion_and_snippet`, `test_format_document_reindents_c_and_keeps_python_semantics`, `test_find_replace_counts_and_replaces`, `test_line_shortcuts_duplicate_move_comment`, `test_multiple_files_import_and_persist`, `test_legacy_draft_record_is_migrated`, `test_mode_switching_shows_studio_or_graceful_state`, `test_splitter_resize_is_persisted`, `test_workbench_has_errors_tab`, `test_mobile_bottom_switcher` (13 hàm) |
| `tests/e2e/test_web_lessons.py` | Kiểm thử trong trình duyệt mọi bài khóa HTML & CSS (`data/courses/web.json`) | Hằng `PORT = 5602`, `LESSONS`; hàm `_wait_port()`, `evaluate()`; fixture `base_url` (chạy `python -m http.server`), `page`; `test_solution_passes_all_checks` và `test_starter_fails_some_check` (mỗi hàm parametrize theo bài × 2 chế độ `same-origin`/`sandbox`), `test_harness_has_no_page_errors` (3 hàm → 65 trường hợp khi thu thập) |
| `tests/harness/html-checks.html` | Trang khung thử nghiệm đánh giá `checks` bài web | Import `runChecks` từ `js/runtime/html-checks.js`; hàm `loadFrame()`, `evaluateSameOrigin()`, `evaluateSandbox()` (iframe `sandbox="allow-scripts"`, trả kết quả qua `postMessage` có token); `window.evaluateLesson(html, checks, mode)`, `window.harnessReady` |
| `tests/harness/jscpp.html` | Trang khung chạy C/C++ bằng JSCPP cho công cụ kiểm tra nội dung | Nạp `vendor/jscpp/JSCPP.es5.min.js`; `window.runCpp(code, input, maxTimeout)` trả `{exitCode, stdout, error, ms}`; `window.harnessReady` |
| `vcode_edu.db` | CSDL SQLite mặc định của backend: 10 bảng cũ (v25) được giữ nguyên + bảng mới `ai_usage`, `schema_meta` | 12 bảng: `ai_usage` (0 dòng), `assignments` (3), `classroom_members` (1), `classrooms` (4), `course_enrollments` (0), `lesson_progress` (0), `lessons` (0), `schema_meta` (2: `schema_version`=1, `migrated_at`), `shared_snippets` (0), `student_live_sessions` (1), `submissions` (2), `users` (5); bị `.gitignore` chặn |
| `vcode_edu.db-wal` | Tệp nhật ký ghi trước (WAL) của SQLite, sinh ra do `PRAGMA journal_mode=WAL` | Tệp nhị phân do SQLite quản lý; được sao chép kèm trong `test_legacy_db.py` và `export_legacy_sqlite.py` |
| `vcode_edu.db-shm` | Tệp bộ nhớ dùng chung của chế độ WAL SQLite | Tệp nhị phân do SQLite quản lý; bị `.gitignore` chặn (`*.db-shm`) |
| `js/config.js` | Cấu hình công khai lúc chạy (56 dòng): cấu hình Firebase web, phiên bản SDK, URL các thư viện CDN (Pyodide, KaTeX, QRCode, WebLLM, Three.js) và cơ chế xác định địa chỉ máy chủ AI (backend FastAPI). Ghi chú rõ: cấu hình Firebase không phải bí mật, khóa nhà cung cấp AI không bao giờ đặt ở đây. | Hằng số xuất: `FIREBASE_CONFIG` (`apiKey`, `authDomain: 'v-code-edu.firebaseapp.com'`, `projectId: 'v-code-edu'`), `FIREBASE_SDK_VERSION = '10.12.2'`, `FIREBASE_SDK_BASE`, `APP_VERSION = '3.0.0'`, `PYODIDE_VERSION = '0.27.7'`, `PYODIDE_BASE`, `KATEX_BASE` (KaTeX 0.16.11), `QRCODE_URL` (qrcodejs 1.0.0), `WEBLLM_URL` (`@mlc-ai/web-llm@0.2.79`), `THREE_URL` (three@0.160.0), `DEFAULT_API_BASE = ''`. Hàm xuất: `isStaticHost()` (so khớp regex `STATIC_HOSTS`: github.io, netlify.app, pages.dev, vercel.app, web.app, firebaseapp.com, gitlab.io), `getApiBase()` (thứ tự ưu tiên: localStorage `vc-api-base` → `window.VCODE_API_BASE` → `DEFAULT_API_BASE` → rỗng nếu hosting tĩnh → cùng origin nếu cổng 8000 hoặc đường dẫn `/app` hoặc HTTPS không phải localhost → `http://localhost:8000`), `setApiBase(url)`. Hằng nội bộ: `API_OVERRIDE_KEY = 'vc-api-base'`. |
| `js/main.js` | Điểm khởi động ứng dụng (358 dòng): khai báo bảng định tuyến, dựng thanh điều hướng desktop và ngăn kéo di động, nút đổi giao diện, khu vực tài khoản, viên trạng thái kết nối & bảng chi tiết, chip XP, hiệu ứng vi mô (ripple, trạng thái cuộn, thanh tiến trình chuyển trang), đăng ký Service Worker, khởi chạy Auth/Progress/Conversation sync và tải robot V-Bot. | Hằng: `NAV` (7 mục: home, learn, challenges, prism, workspace, ai, classroom kèm nhãn, `href`, biểu tượng), `IDE_CSS`, `ARENA_CSS`, `CLASS_CSS`, `DRAWER_ITEMS` (nhãn/phụ đề/badge `LIVE` cho ngăn kéo). Gọi `defineRoutes([...])` với 14 tuyến (`/`, `/learn`, `/learn/:course`, `/learn/:course/:lesson`, `/challenges`, `/challenges/:id`, `/workspace`, `/prism/:topic?/:algo?`, `/ai/:conversation?`, `/classroom`, `/classroom/:code`, `/join/:code`, `/account`, `/404`). Hàm nội bộ: `renderNav()`, `renderDrawerAccount()`, `moveIndicator()`, `setActiveNav(navId)`, `initBurger()`, `renderThemeToggle()`, `renderAccount()`, `statusInfo()`, `renderStatus()`, `renderStatusPanel()`, `syncAfterReconnect()`, `renderXp(progress)`, `initRipples()`, `initScrollState()`, `initRouteProgress()`, `registerServiceWorker()`, `boot()`. Gán `window.__vcode = { appState, navigate, version: '3.1.0' }` cho kiểm thử e2e. |
| `js/core/crypto.js` | Tiện ích băm chỉ dùng để di trú tài khoản cũ (58 dòng): tính SHA-256 (Web Crypto hoặc bản JS thuần khi không có `crypto.subtle`) và sinh mọi dạng "bằng chứng" mật khẩu mà ứng dụng cũ có thể đã lưu. | Hàm nội bộ `sha256Fallback(bytes)` (cài đặt SHA-256 thuần JS với bảng hằng `K`, `H`). Hàm xuất: `sha256Hex(text)`, `legacyPasswordProofs(password)` → mảng gồm `sha256Hex('vcode_salt_2026_' + password)` và `btoa('vc_' + password)` (mã hóa UTF-8). |
| `js/core/dom.js` | Bộ công cụ DOM tối giản không framework (149 dòng); `h()` tạo phần tử an toàn (chuỗi con thành text node, không bao giờ là HTML). | Hằng `SVG_NS`, ký hiệu nội bộ `RAW`. Hàm xuất: `raw(html)` (đánh dấu HTML tin cậy), `esc(value)` (thoát `& < > " '`), `h(tag, props, ...children)`, `s(tag, props, ...children)` (phần tử SVG có namespace), `$`, `$$`, `clear(el)`, `mount(el, ...children)`, `debounce(fn, ms=200)` (có `.cancel()`), `throttle(fn, ms=200)` (leading + trailing), `uid(prefix='id')` (dùng `crypto.getRandomValues`), `revealOnScroll(root, signal)` (IntersectionObserver thêm `.is-visible` cho `.reveal`). Nội bộ `applyProps` (xử lý `class`, `style`, `dataset`, `ref`, `on*`, cấm prop `html`), `appendChildren`. |
| `js/core/format.js` | Định dạng theo quy ước Việt Nam (57 dòng): DD/MM/YYYY, đồng hồ 24 giờ, dấu phẩy thập phân. | Hàm xuất: `toDate(v)` (Date, số, Firestore Timestamp có `toMillis`/`seconds`, chuỗi), `formatDate(v)`, `formatDateTime(v)` (`HH:MM · DD/MM/YYYY`), `formatRelative(v)` ("vừa xong", "x phút trước"…), `formatCountdown(ts)` ("Còn x ngày y giờ", "Đã hết hạn", "Không giới hạn"), `formatScore(v)` (1 chữ số thập phân, dấu phẩy), `combineDateTime(dateStr, hour, minute)`, `splitDateTime(ts)` (mặc định 23:59). |
| `js/core/idb.js` | Lớp bọc IndexedDB dạng Promise (82 dòng), lưu trữ cục bộ ưu tiên ngoại tuyến; tự rơi về bộ nhớ RAM khi IndexedDB không khả dụng. | Hằng `DB_NAME = 'vcode-edu'`, `DB_VERSION = 1`. Hàm nội bộ `open()` (tạo 4 store: `kv`, `conversations` keyPath `id` + chỉ mục `updatedAt`, `drafts` keyPath `key`, `outbox` keyPath `seq` autoIncrement), `reqToPromise`, `withStore`. Đối tượng xuất `idb` { `get`, `put`, `delete`, `all`, `clear` } và `kv` { `get(key, fallback)`, `set`, `del` }. Biến `memoryFallback` (Map cho từng store). |
| `js/core/net.js` | Phát hiện trực tuyến/ngoại tuyến và kiểm tra máy chủ AI còn truy cập được (44 dòng). | Hàm nội bộ `probeBackend()` (gọi `GET {apiBase}/api/health`, timeout 3,5 giây bằng `AbortController`, ghi `appState.backend = { reachable, checkedAt, providers, version, missing }`). Hàm xuất: `refreshBackendStatus()`, `initNetwork()` (lắng nghe `online`/`offline`, phát `net:online`/`net:offline`, thăm dò lại mỗi 60 giây khi tab hiển thị). |
| `js/core/router.js` | Bộ định tuyến hash (132 dòng) với module trang tải lười và CSS riêng từng trang; định nghĩa "hợp đồng" module trang (`title`, `mount(container, ctx)` trả về hàm dọn dẹp). | Biến nội bộ `routes`, `current`, `outlet`, `navToken`, `loadedCss`. Hàm nội bộ: `compile(pattern)` (chuyển `/:param` và `/:param?` thành regex), `ensureCss(hrefs)`, `match(path)`, `handleRoute()`. Hàm xuất: `defineRoutes(list)`, `parseHash(hash)`, `navigate(path, { replace })`, `currentPath()`, `startRouter(outletEl)`. Sự kiện phát: `route:change`, `route:mounted`. |
| `js/core/store.js` | Kho trạng thái phản ứng tối giản và bus sự kiện toàn cục (47 dòng). | Hàm xuất `createStore(initial)` → { `get`, `set(patch)`, `subscribe(fn, { signal, immediate })` }. Hằng xuất `appState` với các trường `user`, `authReady`, `online`, `backend`, `sync`, `theme`. Hằng xuất `bus` { `on(event, fn, { signal })`, `emit(event, data)` }. |
| `js/core/theme.js` | Quản lý giao diện Sáng/Tối toàn cục (33 dòng); lưu lựa chọn `light` / `dark` / `system` vào localStorage `vc-theme`. | Hằng `KEY = 'vc-theme'`, `media` (`prefers-color-scheme: dark`). Hàm xuất: `getThemePreference()`, `resolvedTheme(pref)`, `setTheme(pref)`, `cycleTheme()` (vòng light → dark → system), `initTheme()`. Nội bộ `apply(pref)` (đặt `data-theme` trên `<html>`, cập nhật `meta[name="theme-color"]` thành `#0a0f1f` hoặc `#f6f5f1`, phát `theme:change`). |
| `js/core/ui.js` | Các thành phần giao diện cơ bản (153 dòng): thông báo toast, hộp thoại modal (thẻ `<dialog>` gốc), xác nhận/nhập liệu, sao chép, menu thả xuống, tải tệp, trạng thái rỗng. | Hằng `TOAST_ICON`. Hàm xuất: `toast(message, { type, duration=4200, action })`, `openModal({ title, content, actions, size, onClose, dismissible, className })` → { `el`, `body`, `close` }, `confirmDialog({...})` → `Promise<boolean>`, `promptDialog({...})` → `Promise<string|null>`, `copyText(text)` (Clipboard API, dự phòng `execCommand('copy')`), `bindMenu(root, signal)`, `downloadFile(filename, content, type)`, `emptyState({ iconName, title, text, action })`. Nội bộ `toastRegion()`. |
| `js/services/ai-client.js` | Ứng dụng khách cho cổng AI của backend qua Server-Sent Events (116 dòng); khóa API không bao giờ đi qua trình duyệt. | Lớp xuất `AIError(code, message)`. Hằng nội bộ `MAX_MESSAGES = 40`, `MAX_TOTAL_CHARS = 56000`, `MAX_MESSAGE_CHARS = 12000`. Hằng xuất `NO_BACKEND_MESSAGE`. Hàm xuất: `trimHistory(messages)`, `fetchProviders({ force })` (bộ nhớ đệm 30 giây, `GET /api/ai/providers`), `fetchUsage()` (`GET /api/ai/usage`), `streamChat({ messages, mode, provider, context, signal })` (async generator, `POST /api/ai/chat`, trả các sự kiện `meta`/`delta`/`done`/`error`). Nội bộ `authHeaders()` (gắn `Authorization: Bearer <Firebase ID token>`), `requireBackend()`. |
| `js/services/ai-modes.js` | Danh mục 7 chế độ trợ lý AI dùng chung cho giao diện và lời nhắc hệ thống cho mô hình chạy cục bộ (35 dòng). | Hằng xuất `AI_MODES` (id: `tutor`, `debugger`, `reviewer`, `algorithm`, `learning`, `project`, `knowledge`; mỗi mục có `label`, `short`, `icon`, `description`, `suggestions`). Hàm xuất `modeById(id)`, `localSystemPrompt(modeId, context)` (ghép `COMMON` + `LOCAL_PROMPTS[mode]` + mã nguồn ≤ 6000 ký tự, lỗi ≤ 2000, bài học ≤ 1500). |
| `js/services/auth.js` | Dịch vụ xác thực Firebase Authentication (343 dòng): đăng nhập email/mật khẩu, Google, đăng ký, quên mật khẩu, đổi mật khẩu, ghi nhớ đăng nhập, hồ sơ Firestore `users/{emailKey}` và di trú trong suốt tài khoản cũ. | Biến nội bộ `fb`, `unsubProfile`, `initPromise`, `PROFILE_CACHE(key)` = `profile:<key>`. Hàm nội bộ: `baseProfile(user, extra)`, `toSessionUser(user, profile)`, `ensureProfile(user)`, `watchProfile(user)` (`onSnapshot`), `handleSignedIn(user)`, `requireFb()`, `migrateLegacyAccount(email, password)`. Hàm xuất: `initAuth()`, `authError(err)`, `setRememberMe(remember)`, `getRememberMe()`, `register({ fullName, email, password })`, `login({ email, password })`, `loginWithGoogle()` (popup, dự phòng redirect), `logout()`, `resetPassword(email)`, `changePassword(current, next)`, `getIdToken()`, `currentUser()`, `hasPasswordProvider()`, `firestore()`. Sự kiện phát: `auth:signed-in`, `auth:signed-out`, `auth:error`, `auth:migrated`, `auth:profile-denied`. |
| `js/services/classroom.js` | Dịch vụ lớp học trên Firestore (275 dòng), mô hình dữ liệu v2: `classrooms/{CODE}` cùng các collection con `assignments`, `submissions`, `presence`, `messages`; di trú lớp kiểu cũ. | Nội bộ: `me()`, `normCode(code)` (cũng được xuất), `randomCode()` (`VC` + 4 ký tự từ bảng chữ không gây nhầm), `toMs(v)`. Hàm xuất: `chooseRole(role, { school_name, class_name })`, `listMyClasses()`, `createClass({...})`, `getClass(code)`, `watchClass(code, cb, onError)`, `updateClass(code, patch)`, `deleteClass(code)` (xóa theo lô 400), `joinClass(code)`, `leaveClass(code)`, `removeStudent(code, studentKey)`, `migrateLegacyClass(cls)`, `watchAssignments`, `saveAssignment(code, a)` (tối đa 20 test, `points: 10`), `deleteAssignment`, `submitAssignment(code, assignment, { source, score, passed, total })`, `watchSubmissions(code, { mine }, cb, onError)`, `gradeSubmission(code, sid, { teacher_score, teacher_note })` (kẹp 0–10), `createPresence(code)` (throttle 15 giây), `watchPresence`, `watchMessages` (100 tin mới nhất), `postMessage`, `deleteMessage`, `listAssignments`, `listSubmissions`, `duplicateAssignment`. |
| `js/services/content.js` | Bộ nạp nội dung tĩnh JSON (48 dòng): danh mục khóa học, từng khóa, bài học, thử thách; có bộ nhớ đệm Promise theo đường dẫn. | Nội bộ `getJSON(path)`, `COURSE_ORDER = ['python','pyvn','web','c','cpp','ai']`. Hàm xuất: `loadCatalog()` (`data/courses/index.json`, sắp theo `COURSE_ORDER`), `loadCourse(id)` (kiểm tra regex `^[a-z0-9-]+$`), `findLesson(courseId, lessonId)` (trả `course, lesson, prev, next, index, total`), `loadChallenges()` (`data/challenges.json`), `runtimeLang(lang)` (`web` → `html`). Hằng xuất: `ACCENTS`, `DIFFICULTY_LABEL` (Cơ bản/Trung bình/Nâng cao), `DIFFICULTY_BADGE`. |
| `js/services/conversations.js` | Lịch sử hội thoại AI (146 dòng): lưu cục bộ trước (IndexedDB store `conversations`), đồng bộ Firestore cho người dùng đã đăng nhập; chính sách "ghi sau thắng" theo `updatedAt`, xóa dùng "bia mộ" (tombstone). | Hằng `MAX_CLOUD_MESSAGES = 80`, `MAX_CLOUD_CHARS = 16000`. Nội bộ: `owner()`, `notify()` (phát `conversations:change`), `scheduleSync(id)` (trễ 1,5 giây), `toCloud(c)`, `pushOne(id)`, `pushDelete(c)`. Hàm xuất: `listConversations({ query })`, `getConversation(id)`, `createConversation({ mode, title })`, `saveConversation(c, { sync })`, `renameConversation(id, title)`, `deleteConversation(id)`, `deriveTitle(text)`, `syncConversations` (debounce 800 ms), `initConversationSync()`. |
| `js/services/firebase.js` | Khởi tạo Firebase SDK modular tải lười từ CDN gstatic (67 dòng) và ánh xạ mã lỗi Firebase sang thông báo tiếng Việt. | Hàm xuất: `emailKey(email)` (chữ thường, thay ký tự ngoài `[a-z0-9@._-]` bằng `_`), `loadFirebase()` (import động `firebase-app.js`, `firebase-auth.js`, `firebase-firestore.js`; `auth.languageCode = 'vi'`; Firestore `persistentLocalCache` + `persistentMultipleTabManager`, dự phòng `getFirestore`), `firebaseErrorMessage(err)` (bảng 21 mã: 18 mã `auth/*` cùng `permission-denied`, `unavailable`, `not-found`; nhận diện thêm lỗi tải module/mạng). |
| `js/services/local-ai.js` | AI chạy hoàn toàn trên trình duyệt bằng WebLLM + WebGPU (86 dòng); sau lần tải mô hình đầu tiên có thể dùng không cần Internet. | Hằng `PREFERRED_MODELS` (Qwen2.5-1.5B, Qwen2.5-0.5B, Llama-3.2-1B, gemma-2-2b, Phi-3.5-mini; định dạng `q4f16_1-MLC`). Biến `engine`, `loading`, `modelId`, `status` (`idle`/`loading`/`ready`/`error`/`unsupported`). Hàm xuất: `onLocalStatus(fn)`, `localStatus()`, `isWebGPUAvailable()`, `wasDownloaded()`, `loadLocalModel()` (`webllm.CreateMLCEngine`, lưu `kv['local-ai:model']`), `localModelName()`, `streamLocal({ messages, system, signal })` (12 tin gần nhất, `temperature: 0.5`, `max_tokens: 1024`). |
| `js/services/progress.js` | Tiến độ học tập (168 dòng): lưu cục bộ trước, hợp nhất đám mây không xung đột ở mức trường (field-level), XP suy ra từ các mục đã hoàn thành, bảng xếp hạng. | Nội bộ: `KEY(owner)` = `progress:<owner>`, `empty()`, `owner()`, `load(ownerKey)`, `save()`, `pushLeaderboard` (debounce 2,5 giây, ghi `leaderboard/{key}`), `pushItem(kind, id, value)` (`updateDoc` với `FieldPath('progress', kind, id)`), `mergeInto(target, source)`, `importLegacyLocal(p)`, `reconcile()`. Hàm xuất: `getProgress()`, `isDone(progress, kind, id)`, `totalXp(progress, xpLegacy)`, `markComplete(kind, id, xp)` → `{ firstTime, xp }`, `initProgress()`, `loadLeaderboard(limitN=20)`. |
| `js/runtime/runner.js` | Bộ điều phối chạy mã (286 dòng): mỗi ngôn ngữ chạy trong Web Worker cô lập (HTML trong iframe sandbox), có giới hạn thời gian, chấm bài tự động và xem trước web. | Hằng xuất `LANGUAGES` (7 ngôn ngữ: python, pyvn, javascript, c, cpp, sql, html). Hằng nội bộ `WORKER_FILES`, `DEFAULT_TIMEOUT` (python 12000, javascript 6000, c/cpp 12000, sql 8000 ms), `MAX_OUTPUT = 200_000`, `CONSOLE_BRIDGE(nonce)`. Lớp nội bộ `WorkerHost` (`spawn`, `handle`, `kill`, `warmup`, `run` tuần tự hóa qua `queue`, `onStatus`, `setStatus`). Hàm nội bộ `host(lang)` (C và C++ dùng chung worker). Hàm xuất: `warmup(lang)`, `onRuntimeStatus(lang, fn)`, `runCode({ lang, code, stdin, grading, onOutput, timeoutMs, signal, files, mainName })`, `normalizeOutput(s)`, `buildWebDocument(parts, nonce)`, `renderPreview(iframe, parts, { onConsole })`, `evaluateHtmlChecks(parts, checks, { timeoutMs=6000 })`, `gradeCode({ lang, code, tests, checks, onProgress, signal })`. |
| `js/runtime/python.worker.js` | Worker cổ điển chạy Python bằng Pyodide (CPython biên dịch WebAssembly) (139 dòng). | Biến `pyodide`, `loading`, `currentId`. Hằng `PRELUDE` (thay `builtins.input` bằng `__vc_input` đọc từ stdin; ném `EOFError` tiếng Việt khi hết dữ liệu), `PROJECT_DIR = '/home/pyodide/vc_project'`. Hàm: `init(indexURL)` (`importScripts(pyodide.js)`, `loadPyodide`), `makeWriter(stream)`, `cleanTraceback(msg, mainName)`, `syncProjectFiles(py, files)`, `run({...})` (`loadPackagesFromImports`, `runPythonAsync`). Giao thức: vào `init`/`run`; ra `ready`, `status`, `stdout`, `stderr`, `done`, `error`. |
| `js/runtime/cpp.worker.js` | Worker chạy C/C++ bằng trình thông dịch JSCPP (vendored, hoạt động ngoại tuyến) (54 dòng); hỗ trợ tập con C++ dạy học, không có STL. | Hàm `ensureLoaded()` (giả lập `self.window`/`self.document` tạm thời để JSCPP đi nhánh trình duyệt, `importScripts('../../vendor/jscpp/JSCPP.es5.min.js')`), `friendlyError(err)` (gợi ý khi dùng vector/map/string…). `self.JSCPP.run(code, stdin, { stdio.write, maxTimeout: 15000, unsigned_overflow: 'warn' })`; đệm stdout xả khi > 4096 ký tự hoặc > 50 ms. |
| `js/runtime/js.worker.js` | Worker chạy JavaScript cô lập (không DOM, không truy cập ứng dụng/lưu trữ) (36 dòng). | Hàm `fmt(v)` (định dạng giá trị, hỗ trợ BigInt, Error, JSON). Trình xử lý `self.onmessage`: tạo `sandboxConsole` (log/info/debug/table → stdout; warn/error → stderr), `input`/`prompt`/`readline` đọc stdin theo dòng, thực thi bằng `AsyncFunction` với `"use strict"`, ánh xạ số dòng lỗi (dòng − 3). |
| `js/runtime/sql.worker.js` | Worker chạy SQLite thật (sql.js WebAssembly, vendored) (55 dòng); mỗi lần chạy bắt đầu từ cơ sở dữ liệu mẫu mới. | Hằng `SAMPLE_DB` (bảng `lop`, `hoc_sinh`, `mon_hoc`, `diem` với dữ liệu mẫu tiếng Việt: 3 lớp, 8 học sinh, 3 môn, 24 điểm). Hàm `ensure()` (`importScripts(sql-wasm.js)`, `initSqlJs`), `formatTable(res)` (bảng ASCII, cột tối đa 40 ký tự, dòng "(n dòng)"). Gửi `stdout`, `tables` (kết quả thô), `done`. |
| `js/runtime/pyvn.js` | Bộ dịch "Python Tiếng Việt" (75 dòng): chuyển từ khóa tiếng Việt (theo `data/pyvn-keywords.json`) sang Python chỉ ở ngoài chuỗi và chú thích, giữ nguyên số dòng. | Hàm xuất: `loadPyvnMapping()` (fetch có ghi nhớ Promise), `translatePyvnWith(mapping, src)` (thay `phrases` theo độ dài giảm dần trước, rồi `words` bằng regex có lookbehind `(?<![\w.])`), `translatePyvn(src)`. Nội bộ: `segments(src)` (tách đoạn mã / chuỗi (kể cả chuỗi ba nháy) / chú thích `#`), `escapeRegex(s)`. |
| `js/runtime/html-checks.js` | DSL kiểm tra bài HTML/CSS (75 dòng), đánh giá trên Document thật; mã nguồn hàm được nhúng vào iframe sandbox qua `runChecks.toString()` nên phải tự chứa. | Hàm xuất `runChecks(doc, checks)` → `[{ ok, message, check }]`. Hỗ trợ 6 loại kiểm tra: `exists`, `count` (`min`/`max`), `text` (`equals`/`includes`), `attr` (`name` + `equals`/`includes`/có mặt), `style` (computed style `equals`/`oneOf`), `js` (biểu thức boolean). Hàm con `norm`, `lower`, `describe(c)` sinh thông báo tiếng Việt mặc định. |
| `js/components/auth-dialog.js` | Hộp thoại Đăng nhập / Đăng ký / Khôi phục mật khẩu (322 dòng), phục dựng nhận diện "OLM" v2.5: thẻ hai cột, bảng chào mừng màu chàm có minh họa, biểu mẫu trắng, nút chính màu cam, nút Google, "Ghi nhớ đăng nhập". Xử lý lỗi mang tính chẩn đoán (hướng dẫn sửa cụ thể theo mã lỗi Firebase). | Hằng `CONSOLE` (URL Firebase Console của dự án), `COPY` (tiêu đề/phụ đề cho `login`, `register`, `reset`). Nội bộ: `ensureCss()` (nạp `css/auth.css` một lần), `loadStats()` (đếm khóa học, bài học, thử thách thật), `passwordStrength(pw)` (5 mức: Quá ngắn/Yếu/Trung bình/Mạnh/Rất mạnh), `artDecor()` (2 khối lập phương CSS 3D, 2 quả cầu, SVG quỹ đạo, ký hiệu `{ }`, `</>`, `def`). Trong `openAuthDialog`: `inputRow`, `googleButton`, `done`, `helpBlock`, `showMessage`, `go`, `submitButton`, `guard`, `shake`, `loginView`, `registerView`, `resetView`, `render`. Hàm xuất: `openAuthDialog({ mode, reason, redirectTo })`, `requireSignIn(reason)`. |
| `js/components/vbot.js` | Robot V-Mentor ("V-Bot") nổi trên mọi trang (425 dòng): kéo thả bằng chuột/cảm ứng/bút hoặc phím mũi tên, ghi nhớ vị trí theo tỉ lệ khung nhìn, mắt nhìn theo con trỏ, bong bóng chào một lần, mở khung trò chuyện nhanh với AI (cùng cổng backend, 7 chế độ, cùng lịch sử với trang Trợ lý AI), đính kèm mã đang mở, dùng AI trên trình duyệt khi ngoại tuyến. | Hằng `POS_KEY = 'vc-vbot-pos'`, `GREET_KEY = 'vc-vbot-greeted'`, `SIZE = 68`, `MARGIN = 10`. Nội bộ: `hasProvider(backend)`, `readPos()`, `writePos(p)`, `robotSvg(idPrefix)` (SVG viewBox 0 0 120 132 với 5 gradient). Trong `initVBot`: `place`, `placeFromSaved`, xử lý `pointerdown/move/up/cancel`, `keydown`, `positionBubble`, `showBubble`, `hideBubble`, `positionPanel`, `buildPanel` (gồm `editorCode`, `refreshStatus`, `msgEl`, `renderMessages`, `send`), `openPanel`, `closePanel`, `activate`. Hàm xuất: `initVBot()` → `{ open, close }`. |
| `js/components/icons.js` | Bộ biểu tượng SVG nét 24×24 dùng `currentColor` (131 dòng). | Đối tượng nội bộ `P` chứa 105 biểu tượng (chuỗi path SVG). Hằng xuất `ICON_NAMES = Object.keys(P)`. Hàm xuất: `icon(name, { size, className, title })` → phần tử `<svg class="icon">` (cảnh báo console nếu tên không tồn tại), `iconHTML(name, size)` → chuỗi HTML. |
| `js/components/markdown.js` | Trình hiển thị Markdown an toàn (227 dòng), không cho HTML thô đi qua (chống XSS); hỗ trợ tiêu đề, đoạn, đậm/nghiêng/gạch, mã inline, khối mã có tô màu + nút sao chép/mở trong IDE, danh sách (có/không thứ tự, task), trích dẫn, bảng, đường kẻ, liên kết (chỉ http/https/mailto/#), công thức toán KaTeX tải lười. | Nội bộ: `loadKatex()` (CSS + JS từ `KATEX_BASE`), `safeUrl(url)`, `inline(text, store)`, `protect(text, store)` (bảo vệ code span và công thức bằng token `\u0000n\u0000`), `codeBlock(code, lang)`, `renderTable(lines, store)`. Hàm xuất: `markdown(src)` (tiêu đề `#` hiển thị lùi một cấp: h1 → h2), `enhanceMarkdown(root, { onOpenCode })` (render KaTeX, gắn nút `copy`/`open`; mặc định ghi `kv['workspace:incoming']` rồi chuyển `#/workspace?lang=…&from=snippet`). |
| `js/components/highlight.js` | Bộ tô màu cú pháp nhẹ không phụ thuộc thư viện (208 dòng); trả HTML đã thoát với `<span class="tok-*">`. | Tập từ khóa: `PY_KEYWORDS`, `PY_BUILTINS`, `PYVN_KEYWORDS`, `PYVN_BUILTINS`, `JS_KEYWORDS`, `JS_BUILTINS`, `C_KEYWORDS`, `CPP_KEYWORDS`, `CPP_BUILTINS`, `JAVA_KEYWORDS`, `SQL_KEYWORDS`, `BASH_KEYWORDS`; `LANG_ALIASES`; quy tắc `NUM`, `OPS`, `PUNCT`; bảng `RULES` (python, pyvn, javascript, typescript, c, cpp, java, css, sql, json, bash). Nội bộ: `words`, `wrap`, `tokenize(code, rules)` (regex sticky `y`), `identClassifier(...)`, `highlightHTML(code)` (xử lý thẻ, thuộc tính, `<style>`/`<script>` nhúng). Hàm/hằng xuất: `normalizeLang(lang)`, `highlight(code, lang)`, `SUPPORTED_LANGS` (12 ngôn ngữ), `LANG_LABELS`. Lớp token: keyword, builtin, function, type, string, number, comment, operator, punct, meta, tag, attr. |
| `css/tokens.css` | Design tokens (201 dòng): bảng màu lấy từ logo (mực navy, xanh hoàng gia, quỹ đạo tím, tia lửa cyan); giao diện sáng "paper", giao diện tối "night ink". Mọi thành phần chỉ đọc các biến này. | `:root`: chữ (`--font-sans` "Be Vietnam Pro", `--font-mono` "JetBrains Mono", `--fs-xs` … `--fs-display`, `--lh-*`), khoảng cách `--sp-1` … `--sp-24` (cơ sở 4px), bo góc `--radius-xs` (6px) … `--radius-pill` (999px), bố cục `--nav-h: 64px`, `--container: 1200px`, `--container-wide: 1440px`, `--gutter`, chuyển động `--ease`, `--ease-out`, `--dur-fast/--dur/--dur-slow`; màu nền/viền/chữ (`--bg: #f6f5f1`, `--text: #0b1433`…), thương hiệu (`--brand: #2f49d1`), nhấn (`--accent-ai`, `--accent-live`, `--accent-amber`, `--accent-green`, `--accent-rose` + bản `-soft`), trạng thái (`--success`, `--warning`, `--danger`, `--info`), `--focus`, `--shadow-1/2/3`, trình soạn mã (`--code-*`, 11 biến `--tok-*`), terminal (`--term-*`), trực quan hóa Prism (`--viz-*`). `:root[data-theme="dark"]`: ghi đè toàn bộ bảng màu (`--bg: #0a0f1f`, `--brand: #6f86ff`…). |
| `css/base.css` | Nền tảng (170 dòng): reset, kiểu chữ, các khối bố cục cơ bản, khung ứng dụng, thanh điều hướng gốc, chân trang, màn hình chờ. | Reset `box-sizing`, `prefers-reduced-motion` (rút ngắn mọi animation/transition), `body`, tiêu đề h1–h4, `:focus-visible`, `.sr-only`, `.skip-link`; bố cục `.container(--wide/--narrow)`, `.stack`, `.cluster`, `.grow`, `.grid`, `.muted`, `.text-2`, `.mono`, `.truncate`, `[hidden]`; khung `.app-shell`, `.app-main.is-entering` (keyframes `page-in`), `.page`, `.page-header`, `.page-eyebrow`, `.section`; `.topnav` (sticky, blur), `.brand`, `.navlink`, `.net-pill`, `.nav-burger`, `.mobile-drawer` (ẩn liên kết khi ≤ 1080px); `.site-footer`; `.route-loading`, `.boot-splash` (keyframes `boot-pulse`). |
| `css/components.css` | Thành phần dùng chung mọi trang (295 dòng). | `.icon`; nút `.btn` và biến thể `--primary`, `--ai`, `--soft`, `--ghost`, `--danger`, `--danger-soft`, `--success`, `--sm`, `--lg`, `--block`, `--icon`, hiệu ứng nhấc/ấn/ánh sáng quét, `.ripple` (keyframes `ripple`), `.is-loading` (keyframes `spin`); biểu mẫu `.field`, `.input`, `.select`, `.textarea(--code)`, `.input-group`, `.check`, `.switch`; `.segmented`; `.tabs`/`.tab`; `.card` (`--flat`, `--tight`, `--interactive`), `.stat`; `.badge` (brand, ai, live, success, warning, danger, amber, dot), `.chip`, `.kbd`; `.progress`, `.spinner`, `.skeleton` (keyframes `shimmer`); `.empty-state`, `.callout` (info, warning, danger, success, ai); `.modal` (sm/lg/xl, keyframes `modal-in`); `.toast-region`, `.toast` (keyframes `toast-in`, `toast-out`); `.menu`, `.menu__panel`, `.menu__item`; `.avatar`; `.table-wrap`, `.table`; `.code-block` và 12 lớp `.tok-*`; `.prose`; `.ide-page__crumbs`; `.divider-label`, `.pill-tag`, `.scroll-y`, `.reveal`. |
| `css/shell.css` | Khung ứng dụng (365 dòng): điều hướng, trạng thái, intro, chuyển trang và "bản sắc từng khu vực" qua `html[data-section]`. | Biến `--section-accent`, `--section-accent-2`, `--nav-bg`, `--nav-fg`, `--nav-fg-strong`, `--nav-border`, `--nav-hover`; khối bản sắc cho `home`, `learn`, `challenges`, `prism`, `workspace`, `ai`, `classroom`, `account` (kèm biến thể tối); `.brand__tile` (keyframes `brand-spin`, viền conic-gradient), `.nav-indicator`; `.theme-btn.is-spinning`; `.status-pill` theo `data-state` online/syncing/offline/degraded (keyframes `status-ping`, `status-attn`), `.status-panel`, `.status-row`; `.xp-chip` (keyframes `xp-bump`); `.account-btn`, `.login-btn`, `.sync-dot`, `.role-chip`; skin riêng từng khu vực; `.route-progress`; `.app-main.is-entering` (keyframes `page-enter`); intro `.intro*` (keyframes `intro-draw`, `intro-logo`, `intro-shine`, `intro-letter`, `intro-fade-in`, `intro-bar`, `intro-grid`, `intro-out-bg`, `intro-out-fg`, `shell-reveal`); trợ giúp biểu mẫu cũ (`.auth-tabs`, `.form-error`, `.form-success`); ngăn kéo di động `.mobile-drawer`, `.drawer-backdrop`, `.drawer__*` (nền tối mặc định `#0f1626`, có biến thể sáng). |
| `css/auth.css` | Giao diện hộp thoại xác thực (348 dòng), nạp lười bởi `auth-dialog.js`: bảng chào mừng chàm + biểu mẫu trắng, nút chính gradient cam, nút Google; giao diện tối giữ bảng chàm, biểu mẫu thành thẻ mực đậm. | Biến `--auth-indigo-1/2/3` (`#4f46e5`, `#6366f1`, `#3730a3`), `--auth-orange-1/2` (`#ff9a2e`, `#ff5a1f`), `--auth-blue`, `--auth-surface`, `--auth-text(-2/-3)`, `--auth-line`, `--auth-field(-hover)`; `.modal.auth-modal` (keyframes `auth-pop`), `.auth-shell` (lưới 2 cột); `.auth-art*`, `.auth-mini` (keyframes `auth-card-in`), `.auth-art__brand img` (keyframes `auth-logo-float`); trang trí `.auth-orb`, `.auth-orbit`, `.auth-glyph`, `.auth-cube` + 6 mặt (keyframes `auth-spin`, `auth-drift`, `auth-dash`); `.auth-panel` (`.is-shake`, keyframes `auth-shake`), `.auth-close`, `.auth-view` (keyframes `auth-view-in`); `.auth-input*`, `.auth-meter` (4 mức màu), `.auth-check*`, `.auth-link`, `.auth-submit`, `.auth-divider`, `.auth-google`, `.auth-switch`, `.auth-legal`, `.auth-hint`, `.auth-back`, `.auth-reset-art`; thông báo `.auth-note--err/ok/info/warn/soft`, `.auth-help`, `.auth-btn`; responsive ≤ 820px (1 cột). |
| `css/vbot.css` | Giao diện robot V-Bot nổi kéo được và khung trò chuyện nhanh (168 dòng). | `.vbot` (fixed, 68×68, `--tilt`, drop-shadow), `.vbot__svg`, `.vbot__halo`, `.vbot__arm--l/r`, `.vbot__shadow`, `.vbot__eye(s)`, `.vbot__bulb`, `.vbot__heart`, `.vbot__badge`; trạng thái `.is-ready`, `.is-dragging`, `.is-landing`, `.is-hop`, `.is-thinking`, `.is-loading`, `.is-offline`, `.has-news`, `.is-wave`, `[aria-expanded="true"]`; 11 keyframes `vbot-float`, `vbot-shadow`, `vbot-blink`, `vbot-think`, `vbot-bulb`, `vbot-heart`, `vbot-wave`, `vbot-land`, `vbot-hop`, `vbot-pop`, `vbot-news`; `.vbot-bubble` (keyframes `vbot-bubble-in`); `.vbot-panel` (biến `--vp-bg`, `--vp-line`, `--vp-text(-2)`, `--vp-user`, `--vp-ai`; `.is-open`, `.is-sheet`), `.vbot-panel__head` (gradient `#4338ca → #6d28d9 → #a21caf`), `__status[data-state]`, `.vbot-icon-btn`, `__bar`, `__mode`, `.vbot-chip`, `__list`, `.vbot-welcome`, `.vbot-msg(--user/--ai)`, `.vbot-typing` (keyframes `vbot-dot`), `__composer`, `__input`, `__send(--stop)`, `__foot`, `.vbot-link`, `.is-vbot-focus`; ẩn khi in. |
| `js/components/editor.js` | Trình soạn thảo mã nhẹ, không phụ thuộc thư viện: một `textarea` trong suốt đặt chồng lên lớp `<pre><code>` đã tô màu cú pháp. Dùng chung cho IDE, workbench bài học/thử thách và bản demo trang chủ. | `createEditor({ value, lang, onChange, onRun, onSave, onCursor, onFormat, readOnly, minLines, ariaLabel, autocomplete, gutterClick })` → `{ el, textarea, getValue, setValue, replaceValue, setLang, getLang, focus, markLine, clearMarks, setDiagnostics, insertAtCursor, format, canFormat, openFind, jumpToLine, gotoLine, duplicateLines, moveLines, toggleComment, getCursor, getLineCount, refresh, destroy }`; hàm nội bộ `splitLines`, `decorate`, `render`, `computeBrackets`/`findMatch` (tô cặp ngoặc), `insert` (giữ lịch sử hoàn tác qua `execCommand('insertText')`), `replaceAll`, `deleteLines`, `revealPos`, `gotoLinePrompt`, `applySettings`; hằng `PAIRS`, `BRACKETS`, `CLOSERS`, `COMMENT`; `ensureIdeCss()`; hàm xuất `errorLine(message)` trích số dòng lỗi từ thông báo Python/JS/C/SQL; sự kiện cửa sổ `vc:editor-settings`. |
| `js/components/ide.js` | "Workbench" tái sử dụng: trình soạn thảo + thanh công cụ chạy/nộp + ô dữ liệu vào + terminal + bảng Lỗi + tab kiểm thử (+ xem trước web). Đồng thời cung cấp các khối dựng dùng chung cho trang IDE. | `RUNTIME_LABELS`; `createTerminal({ placeholder, toolbar, title })` → `{ el, clear, write, writeNode, status, meta, getText, isEmpty }`; `renderResults(container, result)` (hiển thị kết quả chấm); `attachDiagnostics({ editor, problems, getLang, getCode, signal, delay })` → `{ run, schedule, cancel }`; `inputNotice(onFocusInput)`; `createWorkbench(opts)` → `{ el, editor, run, grade, getCode, setCode, getStdin, focus }`; `loadDraft(key)` (đọc bản nháp IndexedDB). |
| `js/components/practice.js` | Bố cục "đọc + viết code" chia đôi, dùng chung cho bài học, thử thách và bài tập lớp học; kèm ngăn kéo trợ lý AI tải lười. | `createAIDrawer({ signal, getContext })` → `{ open(prompt), close() }`; `ensureAiCss()`; `prose(md, opts)`; `buildPracticePage(container, ctx, cfg)` → `{ wb, ai, markSolved }` (tab Lý thuyết/Đề bài/Gợi ý/Lời giải, mở khóa lời giải sau 3 lần nộp chưa đạt, công tắc giao diện di động). |
| `js/components/chat.js` | Thành phần trò chuyện AI dùng cho trang V-Mentor đầy đủ và ngăn kéo AI trong IDE/bài học: chọn chế độ, chọn nguồn AI, nhận câu trả lời dạng luồng (streaming), dừng, thử lại, đính kèm ngữ cảnh mã. | `PROVIDER_KEY = 'vc-ai-provider'`; `PROVIDER_CHOICES` (auto/cloud/local/browser); `mentorOrb(size)`; `createChat(container, { conversationId, mode, context, compact, onConversation, headerStart, initialPrompt, onOpenCode })` → `{ load, send, newConversation, setContext, setMode, focus, destroy }`; nội bộ `placeCaret`, `skeletonLines`, `renderContext`, `updateStatus`, `maybeOfferLocalDownload`, `renderEmpty`, `aiHead`, `messageEl`, `renderAll`, `ensureConversation`, `generate`, `send`, `regenerate`, `load`. |
| `js/components/ide/autocomplete.js` | Hộp gợi ý mã (autocomplete) cho editor dạng textarea: nguồn gồm đoạn mẫu (snippet), từ khóa, hàm có sẵn và định danh đã có trong tài liệu; định vị tại con trỏ bằng kỹ thuật phần tử "gương". | Hằng `KEYWORDS`, `BUILTINS`, `SNIPPETS` (theo 8 ngôn ngữ), `KIND_LABEL`; `caretCoords(ta, pos)`; `wordRe`, `inStringOrComment`; `expandSnippet(body, indent, unit)` (cú pháp `${1:text}`, `$0`, `\t`); `createAutocomplete({ textarea, root, getLang, getUnit, replaceRange, getWords })` → `{ el, isOpen, close, handleKey, onInput, reposition }`. |
| `js/components/ide/controls.js` | Các điều khiển editor dùng chung cho IDE và workbench: bảng phím tắt, popover cài đặt, nút đổi giao diện editor, biểu tượng SVG cục bộ. | `PATHS`; `xicon(name, cls)`; `SHORTCUTS` (15 mục); `openShortcutsModal()`; `openPopover(anchor, content, { className, align })`; `seg`, `switchRow`; `openEditorSettings(anchor)`; `createEditorThemeButton({ signal, compact })`; tái xuất `onEditorSettings`. |
| `js/components/ide/diagnostics.js` | Kiểm tra tĩnh mã nguồn ("Kiểm tra lỗi mã nguồn") cho Python/Python Tiếng Việt, C/C++, JavaScript, HTML, CSS, SQL; mọi kiểm tra đều thận trọng (chỉ phỏng đoán thì báo cảnh báo/gợi ý). | `levenshtein(a, b)`, `closest(name, candidates)` (gợi ý "Có phải ý em là…"); nội bộ `tokenizePython`, `analyzePython`, `scanBrackets`, `parenGroup`, `conditionChecks`, `missingSemicolons`, `analyzeCLike`, `analyzeJS`, `analyzeHTML`, `analyzeCSS`, `analyzeSQL`; hằng `PY_KEYWORDS`, `PY_BUILTINS`, `PY_BLOCK`, `SMART`, `C_STMT`, `JSCPP_LIBS`, `HTML_VOID`, `HTML_OPTIONAL`, `SQL_STATEMENTS`, `SQL_CLAUSES`; xuất `analyzeCode(code, lang)`, `analyzeCodeAsync(code, lang)` (dịch pyvn trước khi phân tích), `documentIdentifiers(code)`. |
| `js/components/ide/editor-theme.js` | Giao diện màu của editor độc lập với giao diện toàn trang: `dark` (Night), `light` (Paper), `auto` (theo `html[data-theme]`), lưu trong `localStorage['vc-editor-theme']`. | `EDITOR_THEMES`; `getEditorTheme()`, `resolvedEditorTheme(pref)`, `setEditorTheme(pref)`, `cycleEditorTheme()`, `onEditorTheme(fn, { signal })`; nội bộ `applyAll` (cập nhật mọi phần tử `[data-editor-theme]`, phát sự kiện `vc:editor-theme`); lắng nghe sự kiện `storage` (đồng bộ giữa các tab) và `MutationObserver` trên `data-theme`. |
| `js/components/ide/explain-errors.js` | Chuyển lỗi khi chạy (traceback Python, lỗi JS, thông báo JSCPP, lỗi SQLite, quá thời gian) thành đối tượng `{ type, title, line, col, file, message, explanation, hint }` với giải thích tiếng Việt cho học sinh. | Nội bộ `PY_BUILTIN_NAMES`, `identifiersOf`, `parsePython` (khung lỗi cuối của người dùng, bỏ qua shim `__vc_input`), `pyExplain(type, msg, ctx)`, `jsExplain(type, msg)`; xuất `explainError(res, { lang, code, stdin, mainName })`, `readsInput(code, lang)`. |
| `js/components/ide/files.js` | Dự án nhiều tệp cho IDE, mỗi ngôn ngữ một dự án, lưu trong kho IndexedDB `drafts` với khóa `workspace:<lang>`; tự chuyển đổi bản ghi cũ. | `MAIN_FILE`, `ALLOWED_EXT`, `MAX_FILES = 20`; `fileLang(name, projectLang)`, `isRunnable(name, projectLang)`, `validateName(name, lang, files, current)`, `suggestName(lang, files, base)`, `copyName(name, files)`, `filesFromWebParts(parts)`, `webParts(project)`, `normalizeProject(lang, rec)`, `loadProject(lang)`, `saveProject(lang, project)`. |
| `js/components/ide/find.js` | Thanh tìm / thay thế cho editor (Ctrl+F / Ctrl+H): phân biệt hoa thường, khớp nguyên từ, biểu thức chính quy, thay một / thay tất cả. | Hằng biểu tượng `I`, hàm `svg(d)`; `createFindBar({ root, textarea, getValue, setMatches, reveal, replaceRange, replaceAll, focusEditor })` → `{ el, open, close, isOpen, refresh }`; nội bộ `regex`, `search`, `paint`, `go`, `replaceOne`, `replaceEvery`, `setReplace`. |
| `js/components/ide/formatter.js` | "Định dạng mã" (Shift+Alt+F) thận trọng, không đổi ý nghĩa chương trình: thụt lề theo ngoặc nhọn (C/C++/Java/JS/CSS/JSON), Python chỉ đổi Tab → 4 dấu cách và xóa khoảng trắng cuối dòng, HTML thụt lề theo thẻ, SQL viết hoa từ khóa. | `VOID_TAGS`, `SQL_KW`, `SQL_FN`; nội bộ `lead`, `scanLine`, `codeOnly`, `netTags`; xuất `formatBraces(code, unit, { lang, base })`, `formatPython(code)`, `formatHTML(code, unit)`, `formatSQL(code)`, `formatCode(code, lang, { unit })`, `FORMATTABLE`. |
| `js/components/ide/problems.js` | Bảng "Lỗi & Gỡ lỗi": thẻ giải thích lỗi khi chạy + danh sách kết quả kiểm tra tĩnh có bộ lọc, dùng chung cho IDE và workbench. | `SEV`; `createProblemsPanel({ onJump, onAskAI, getLang, compact })` → `{ el, setStatic, setRuntime, clearRuntime, getRuntime, getStatic, counts, onChange }`; nội bộ `counts`, `jumpBtn`, `runtimeCard`, `row`, `render`; xuất `aiPromptForError(r)` (soạn câu hỏi gửi V-Mentor). |
| `js/components/ide/settings.js` | Tùy chọn editor dùng chung cho mọi editor trên trang, lưu ở `localStorage['vc-editor-settings']`. | `DEFAULT_SETTINGS` (`fontSize`, `tabSize`, `wordWrap`, `autoClose`, `autocomplete`, `diagnostics`); `sanitize`; `getEditorSettings()`, `setEditorSettings(patch)` (phát sự kiện `vc:editor-settings`), `onEditorSettings(fn, { signal })`, `indentFor(lang, settings)`. |
| `js/components/flowchart/index.js` | Điểm vào của studio Lưu đồ với hai chế độ "Từ mã nguồn" (lưu đồ sống theo editor) và "Thiết kế" (kéo thả + chạy thử); ghi nhớ chế độ trong `localStorage['vc-flowchart:mode']`. | `createFlowchartStudio({ signal, getCode, onSendToEditor, onJumpToLine })` → `{ el, onCodeChange, onShow, onHide, destroy, _live, _designer, setMode }`; nội bộ `importGraph` (hỏi xác nhận khi thay lưu đồ đang có), `setMode`, `refreshLive`, `destroy`; `ResizeObserver`. |
| `js/components/flowchart/model.js` | Định nghĩa loại khối, kích thước và đo chữ, dùng chung cho chế độ sống và trình thiết kế. | `KINDS` (10 loại: start, end, input, output, process, decision, call, fnstart, return, foreach), `DESIGNER_KINDS` (7), `DEFAULT_TEXT`, `PORT_LABEL`, `FONT_CODE`, `FONT_TERM`, `LINE_H`; `measure(text, font)` (đo bằng canvas 2D, có bộ đệm), `wrapText`, `nodeSize(kind, text)`, `portAnchor`, `cloneGraph`, `shortText`. |
| `js/components/flowchart/render.js` | Dựng hình SVG cho khối, mũi tên, nhãn cạnh. | `makeDefs()` (4 marker mũi tên: thường/active/sel/err), `shapeEl(shape, w, h)` (terminal, io, decision, prep, call, process), `textEl`, `nodeEl`, `roundedPath(pts, r)`, `curvedPath`, `labelPos`, `edgeLabelEl`, `labelKind`. |
| `js/components/flowchart/layout.js` | Bố trí có cấu trúc cho cây chương trình: mỗi cấu trúc thành một "fragment" quanh trục dọc; nhánh if/else đặt cạnh nhau rồi hợp lại; vòng lặp có ray quay lui bên trái và ray thoát bên phải. | Hằng `G`, `CG`, `RAIL`, `MG`, `CHART_GAP`; nội bộ `mk`, `emptyFrag`, `nodeFrag`, `shift`, `toEntry`, `append`, `seq`, `stmtFrag`, `ifFrag`, `loopFrag`, `doWhileFrag`, `simplify`, `expandForEach`, `chartFrag`; xuất `layoutProgram(program, { forDesigner })`, `arrange(charts, mode)`. |
| `js/components/flowchart/live.js` | Chế độ "Từ mã nguồn": vẽ lưu đồ trực tiếp từ mã trong editor, nhấp khối để nhảy tới dòng, xuất SVG/PNG, tạo lưu đồ chỉnh sửa được. | `LANG_NAMES`; `createLiveView({ signal, getCode, onJumpToLine, onConvert })` → `{ el, update, refresh, resize, buildDesignerGraph, getGraph, hasContent }`; nội bộ `activate`, `showEmpty`, `chooseArrangement` (xếp hàng ngang/dọc), `render`, `fitView`, `doExport`, `convert`. |
| `js/components/flowchart/parse-code.js` | Chuyển mã nguồn thành cây chương trình cho lưu đồ sống: Python/Python Tiếng Việt theo thụt lề; C/C++/JavaScript/TypeScript/Java bằng bộ phân tích ngoặc nhọn "best-effort". | `PY_LANGS`, `BRACE_LANGS`, `normalizeLangName`, `parseProgram(code, lang)` → `{ lang, main, functions, warnings, empty }` hoặc `{ unsupported: true }`; nội bộ `pyLogicalLines`, `classifyPySimple`, `parsePython`, `parsePyFor`, `stripC`, `printfToArgs`, `scanfTypes`, lớp `CParser`, `parseBrace`. |
| `js/components/flowchart/expr.js` | Bộ máy biểu thức an toàn (không dùng `eval`/`new Function`): tokenizer, bộ phân tích Pratt và bộ tính theo ngữ nghĩa Python (số nguyên BigInt, số thực Number), in ngược ra mã Python chuẩn. | Lớp `FcError`; `tokenize`, `parseExpression`, `parseExpressionList`, `parseArgList`, `splitStatements`, `parseStatement`; `evaluate`, `assignTarget`, `execStatement`; `BUILTINS` (12 hàm), `FN_ALIASES`; `truthy`, `pyEq`, `binop`, `pyRepr`, `pyStr`, `pyFloatRepr`, `typeName`, `isInt`, `isNum`; `toPython`, `statementToPython`, `namesIn`; nội bộ lớp `Parser`, `MAX_SEQ`, `MATH_FUNCS`, `MATH_CONSTS`, `PREC`. |
| `js/components/flowchart/semantics.js` | Diễn giải nội dung chữ của từng khối trong trình thiết kế (Nhập, Xuất, Xử lý, Điều kiện) thành mô tả có thể thực thi. | `parseInputText` (gợi ý kiểu "(số nguyên)", "(số thực)", "(chuỗi)"), `parseOutputText`, `parseDecisionText`, `parseProcessText`, `compileNode(node)`, `isIdentifier`; hằng `TYPE_HINTS`, `INPUT_PREFIX`, `OUTPUT_PREFIX`, `COND_PREFIX`. |
| `js/components/flowchart/interpreter.js` | Kiểm tra hợp lệ và thực thi từng bước một lưu đồ thiết kế. | `MAX_STEPS = 10000`, `MAX_OUTPUT`; `nodeName`, `outEdgeMap`, `validateGraph(graph)` → `{ ok, errors, compiled, startId }`; `readValue`; lớp `Runner` (`provideInput`, `fail`, `step`, `runToEnd`). |
| `js/components/flowchart/codegen.js` | Chuyển lưu đồ thiết kế thành Python: if/else theo điểm hợp (hậu thống trị trực tiếp), while theo cạnh quay lui (vòng lặp tự nhiên); đồ thị không cấu trúc thì dịch kiểu "máy trạng thái" với biến `buoc`. | `INVERT`, lớp `Unstructured`; nội bộ `negate`, `nodeLines`, `printStmts`, `makeIf`, `computeSets` (luồng dữ liệu kiểu dominator), `structured`, `stateMachine`; xuất `generatePython(graph, { forceStateMachine })` → `{ ok, code, mode, errors }`. |
| `js/components/flowchart/editor.js` | Trình thiết kế lưu đồ kéo thả ("Thiết kế"): bảng khối, vùng vẽ SVG, bảng bên (Chạy thử / Khối đang chọn), hoàn tác/làm lại, chạy thử từng bước, chuyển sang Python, mẫu, nhập/xuất, tự lưu vào `localStorage['vc-flowchart:designer:v1']`. | `STORE_KEY`, `GRID = 20`, `SPEEDS`, `SPEED_NAMES`, `HELP`; `storageGet`, `storageSet`, `snap`; xuất `sanitizeGraph(obj)`, `createDesigner({ signal, onSendToEditor, onImportFromCode })` → `{ el, onShow, loadGraph, getGraph, fit, destroy, _debug }`; nội bộ `commit`, `undo`, `redo`, `route`, `renderAll`, `addNode`, `setEdge`, `deleteSelection`, `loadTemplate`, `exportJson`, `exportImage`, `startEdit`, `renderInspector`, `startRun`, `schedule`, `doStep`, `showPrompt`, `renderWatch`, `showPython`, `init`. |
| `js/components/flowchart/export.js` | Xuất vùng vẽ lưu đồ thành tệp SVG độc lập hoặc ảnh PNG; vì biến CSS không tồn tại ngoài trang nên kiểu tính toán được nhúng thẳng vào bản sao. | `PROPS`; `inline(src, dst)`; `buildSvg(svg, layer, bbox, { padding })`; `exportSvg(svg, layer, bbox, filename)`; `exportPng(svg, layer, bbox, filename, scale)`. |
| `js/components/flowchart/viewport.js` | Kéo (pan) / phóng to thu nhỏ cho vùng vẽ SVG: bánh xe chuột, kéo, chụm hai ngón, nút bấm; đồng bộ lưới nền qua biến CSS. | `createViewport({ host, svg, layer, signal, minZoom, maxZoom, onChange })` → `{ state, apply, fit, zoomAt, zoomCenter, centerOn, ensureVisible, screenToWorld, worldToScreen, startPan, panMoved, isPanning, setZoom }`; nội bộ `animateTo` (easing bậc 3, 220 ms, tôn trọng `prefers-reduced-motion`). |
| `js/components/flowchart/templates.js` | Các lưu đồ mẫu dựng sẵn cho trình thiết kế (tọa độ tâm khối trên lưới 20px). | `TEMPLATES` (4 mẫu: `sum` "Tổng 1..n", `max3` "Số lớn nhất của 3 số", `parity` "Kiểm tra chẵn lẻ", `divisors` "Đếm ước số"), `templateById(id)`; trợ giúp `n(...)`, `e(...)`. |
| `js/components/flowchart/icons-local.js` | Biểu tượng bổ sung cho studio Lưu đồ (cùng phong cách nét 24×24 với `icons.js`) và hình thu nhỏ của khối trong bảng khối. | `FC_ICONS` (fit, image, flow, undo, redo, ortho, curve, json, template, python-out, cursor); `fcIcon(name, opts)`; `shapeIcon(shape)`. |
| `js/components/scratch/index.js` | Điểm vào của bảng Scratch với hai chế độ "Scratch Live" và "Xưởng khối"; ghi nhớ chế độ trong `localStorage['vc-scratch-mode']`; tạo Xưởng khối lười (khi cần). | `createScratchStudio({ signal, getCode, onSendToEditor, onJumpToLine })` → `{ el, onCodeChange, onShow, destroy }` (+ `_debug` không liệt kê được); `MODE_KEY`; nội bộ `logo()`, `modeIcon(kind)`, `ensureStudio()`, `setMode(m)`, `destroy()`. |
| `js/components/scratch/live.js` | Scratch Live: hiển thị mã Python / Python Tiếng Việt trong editor thành khối kiểu Scratch chỉ đọc, có thu phóng, chú giải và nhấp để nhảy tới dòng. | `exprEl(n, depth)`; `createLive({ onJumpToLine, onToStudio })` → `{ el, update(code, lang), relayout() }`; nội bộ `MAX_DEPTH = 5`, `BIN_LABEL`, `CMP_LABEL`, `BUILTIN_LABEL`, `stmtEl`, `bodyEls`, `cblock`, `rangeParts`, `AUG`, `LEGEND_ORDER`, `LEGEND_LABEL`, `render`, `setZoom`, `applySize`. |
| `js/components/scratch/pyparse.js` | Bộ phân tích Python nhỏ, khoan dung ("không bao giờ ném lỗi với mã người dùng"); dịch Python Tiếng Việt sang Python trước, rồi dựng cây biểu thức/câu lệnh có số dòng. | `ensurePyvn()`, `toPython(code, lang)`, `tokenize(src)`, `parseExpr(src)`, `exprText(n)`, `parseProgram(src)`; nội bộ `FALLBACK_PYVN`, `OPS`, `KW`, lớp `ExprParser`, `parseFString`, `logicalLines`, `COMPOUND` (16 từ khóa ghép), `splitSemicolons`, `parseSimple`, `parseHeader`, `findClauseOwner`. |
| `js/components/scratch/render.js` | Hàm dựng DOM dùng chung cho vỏ khối, hàng, "miệng" khối C, ô giá trị và glyph; bố cục khối bằng HTML/flexbox. | `CATS`, `glyph(name, cls)`, `blockEl({ cat, shape, top, cap, cls, props }, ...children)`, `rowEl`, `mouthEl`, `footEl(arrow)`, `lbl`, `litPill(text, { mono, title })`, `stackEl`, `textWidth(text, font)`; nội bộ `GLYPHS` (8 glyph). |
| `js/components/scratch/shapes.js` | Tạo đường SVG cho hình dạng khối và bước bố cục đo từng khối rồi vẽ đường viền phía sau. | `R=4`, `NX=12`, `NW=20`, `ND=5.2`, `ARM=16`, `HAT=16`; `stackPath`, `cPath`, `reporterPath`, `booleanPath`, `makeBg`, `layoutShapes(root)`; nội bộ `NOTCH_R`, `NOTCH_L`, `topEdge` (notch/hat/def), `bottomEdge`. |
| `js/components/scratch/blocks.js` | Định nghĩa khối, thứ tự bảng khối và tiện ích mô hình cho Xưởng khối ("mọi op liệt kê ở đây đều được runtime.js thực thi"). | `CATEGORY_ORDER`, `CATEGORY_NAMES`, `KEY_OPTIONS`, `EFFECT_OPTIONS`, `ROTATION_OPTIONS`, `INSTRUMENT_OPTIONS`, `MATH_OPTIONS`, `SPECS` (96 khối), `PALETTE`; `isHat`, `isReporter`, `isBoolean`, `isCap`, `mouthCount`, `newBlock(op, args)`, `B(op, args, s1, s2)`, `cloneBlocks`, `walkBlocks`, `walkBlock`, `sanitizeBlocks`, `sanitizeBlock`. |
| `js/components/scratch/workspace.js` | Trình soạn khối: danh sách nhóm, bảng khối (flyout), vùng làm việc cuộn được với kéo thả bằng pointer, hít (snap), lồng khối, ô giá trị, menu thả xuống, menu ngữ cảnh, thu phóng. | `closePopover()`, `openPopover(anchor, items, { x, y, minWidth })`, `createWorkspace({ signal, getProject, getSprite, runtime, onChange, onVarsChanged, onMessagesChanged })` → `{ el, renderAll, renderPalette, renderScripts, relayout, setRunning, selectCategory, createVariable, zoom, ... }`; nội bộ `SNAP=30`, `SNAP_SLOT=26`, `slotEl`, `renderBlock`, `renderPalette`, `onPointerDown`, `beginDrag`, `collectTargets`, `findSnap`, `onPointerUp`, `handleClick`, `showContextMenu`, `cleanUp`, `renameVariable`, `deleteVariable`. |
| `js/components/scratch/studio.js` | Vỏ Xưởng khối: thanh công cụ, trình soạn khối, sân khấu, thông tin và danh sách nhân vật, chọn phông nền, bàn phím, thao tác dự án, xem mã Python, "Tạo khối từ mã". | `createStudio({ signal, getCode, onSendToEditor })` → `{ el, show, hide, buildFromCode, showPython, project, loadProject, loadExample(id), runtime, stage, workspace, selectSprite, toPython }`; nội bộ `renderSprites`, `addSprite`, `removeSprite`, `syncInfo`, `syncBackdrop`, `fitStage`, `toggleFull`, `openExample`, `saveLocal`, `openSavedDialog`, `fileSafe`. |
| `js/components/scratch/stage.js` | Sân khấu: canvas logic 480×360 co giãn vừa khung, lớp bút vẽ, bóng thoại, bảng theo dõi biến, hộp "hỏi và đợi", kiểm tra va chạm, kéo nhân vật. | `W=480`, `H=360`, `formatValue`, `spriteBounds`, `spriteHit`, `spritesTouch`, `touchingEdge`, `createStage({ signal, onSpriteClick, onStageClick, onMouse, onSpriteMoved })` → `{ el, canvas, mouse, fit, render, renderMonitors, penLine, penDot, penClear, stamp, penPixel, ask, cancelAsk, asking, kinds }`; nội bộ `drawBubble`, `drawSprite`, `wrapText`, `toStage`. |
| `js/components/scratch/runtime.js` | Trình thông dịch theo khung hình với "luồng đồng thời kiểu Scratch"; mỗi kịch bản chạy như một generator. | `toNum`, `toBool`, `compare`, `KEY_FROM_EVENT`, `createRuntime({ getProject, stage, onThreads, onError, onDirty })` (API gồm `greenFlag`, `stopAll`, `keyDown`, `spriteClicked`, `runScript`, `runBlock`, `setActive`, `resetPen`, `render`…); nội bộ `TICK`, `STOP`, `TICK_MS = 1000/30`, `WORK_MS = 6`, `runStack`, `exec`, `makeThread`, `startHats`, `step`, `tick`, `frame`, `ensureLoop`, `tone`, `moveTo`, `bounce`. |
| `js/components/scratch/sprites.js` | Hình nhân vật và phông nền tự vẽ hoàn toàn bằng mã (Canvas 2D path); bộ đệm trang phục, alpha để kiểm tra va chạm, ảnh thu nhỏ. | `SPRITE_KINDS` (6 loại, 12 trang phục), `SPRITE_KIND_ORDER`, `costumeImage(kind, idx)`, `costumeHit(entry, lx, ly)`, `spriteThumb(kind, idx)`, `BACKDROPS` (6), `BACKDROP_ORDER`, `backdropImage(id)`; nội bộ `drawVBot`, `drawRocket`, `drawBall`, `drawStar`, `drawFish`, `drawTurtle`, `bdPlain`, `bdGrid`, `bdSky`, `bdSpace`, `bdOcean`, `bdMeadow`, `rng`, `INK`, `RES=2`. |
| `js/components/scratch/projects.js` | Dự án Xưởng khối: dự án mặc định, dự án mẫu, chuẩn hóa dữ liệu, lưu localStorage và tuần tự hóa JSON. | `FORMAT = 'vcode-scratch'`, `spriteId`, `makeSprite(kind, extra)`, `newProject()`, `EXAMPLES` (4), `normalizeProject(raw)`, `serializeProject(p)`, `loadAutosave`, `saveAutosave`, `listSaved`, `saveToLibrary`, `loadFromLibrary`, `deleteFromLibrary`; nội bộ `AUTOSAVE_KEY`, `LIBRARY_KEY`, `exGreeter`, `exPolygon`, `exCatchStars`, `exCounting`. |
| `js/components/scratch/codegen.js` | "Xem mã Python": sinh mã Python dễ đọc cho phần logic của dự án; khối chuyển động/hiển thị/âm thanh/bút vẽ thành chú thích. | `identifier(name, used)` (bỏ dấu, tránh từ khóa, tránh trùng), `projectToPython(project)`; nội bộ `PY_KEYWORDS`, `pyStr`, `isNumLit`, `numLit`, `E`, `wrap`, và trong `projectToPython`: `lit`, `arg`, `asNum`, `asStr`, `placeholder`, `exprRaw`, `describe`, `stmts`, `stmt`. |
| `js/components/scratch/frompy.js` | "Tạo khối từ mã": dựng khối Xưởng khối từ mã Python trong editor (chỉ tập con được hỗ trợ). | `pythonToBlocks(code, lang)` → `{ blocks, variables, skipped, approx }`; nội bộ `NUM`, `isInput`, `conv`, `isStrish`, `joinAll`, `condOf`, `usesName`, `stmtsOf`, `stmtOf`. |
| `js/pages/workspace.js` | Trang "IDE đa ngôn ngữ" (`#/workspace`, hoạt động ngoại tuyến sau lần tải đầu): ba chế độ "Mã nguồn" / "Lưu đồ" / "Scratch Live", dự án nhiều tệp, chạy/dừng, dữ liệu vào, bảng Lỗi & Gỡ lỗi, thanh trạng thái, chia sẻ liên kết/QR, tải về, ngăn kéo AI. | `EXAMPLES` (15 chương trình mẫu cho 7 ngôn ngữ), `MODES`, `STUDIO`, `LAYOUT_KEY = 'vc-ws-layout'`, `FILE_COLORS`; `readLayout`, `writeLayout`, `encodeShare` (nén `deflate-raw` + base64url), `decodeShare`, `ensureCss`, `fileIcon`; trang `default { title, mount(container, ctx) }` với các hàm nội bộ `renderFiles`, `openFile`, `newFile`, `renameFile`, `duplicateFile`, `deleteFile`, `openFileMenu`, `openExamples`, `openDownload`, `loadExample`, `applyLayout`, `setMode`, `showStudio`, `loadStudio`, `sendToEditor`, `jumpTo`, `updateStatus`, `switchLang`, `run`, `downloadOne`, `downloadAll`, `downloadBundled`, `share`. |
| `js/pages/ai.js` | Trang "Trợ lý AI V-Mentor" (`#/ai`): thanh lịch sử trò chuyện (nhóm theo thời gian, tìm kiếm, đổi tên, xóa, thu gọn) + khung chat. | `GROUPS` (Hôm nay / Hôm qua / 7 ngày trước / Cũ hơn), `COLLAPSE_KEY = 'vc-ai-sidebar-collapsed'`; `groupLabel(ts)`, `timeLabel(ts)`, `readCollapsed`, `writeCollapsed`; trang `default { title: 'Trợ lý AI V-Mentor', mount }` với nội bộ `syncToggle`, `closeDrawer`, `toggleSidebar`, `renderFoot`, `convItem`, `renderList`; nhận nội dung chuyển từ trang khác qua `kv 'ai:incoming'`. |
| `css/pages/ide.css` | Giao diện IDE: editor (+ hai giao diện Night / Paper độc lập với giao diện trang), terminal, bảng Lỗi, workbench, bố cục chia đôi, trang workspace. | Biến theme `[data-editor-theme]` (`--code-*`, `--ed-*`, `--tok-*`); `.code-editor*`, `.cl`, `.tok-*`, `.dg-err/.dg-warn/.dg-info`, `.fm`, `.bm`; `.ac*`; `.fb*`; `.terminal*`, `.term-notice`, `.term-link`; `.problems`, `.pb-*`; `.ide-pop`, `.ide-set*`, `.ide-switch*`; `.sc-table`; `.workbench`, `.wb-*`, `.grade-summary`, `.test-item*`; `.ide-page*`; `.ai-drawer`; `.workspace`, `.ws-*` (thanh, tab tệp, `.ws-ficon--*`, splitter, stdin, studio, thanh trạng thái, thanh di động); keyframes `term-pulse`, `ide-pop-in`; breakpoint 1320/1180/900/520px. |
| `css/pages/flowchart.css` | Giao diện studio Lưu đồ theo phong cách "bản vẽ kỹ thuật": lưới chấm, hình khối sắc nét tô theo nhóm; phạm vi `.fc-studio`, `.fc-dialog`, `.fc-ghost`. | Biến `--fc-*` (sáng/tối), `.fc-cat-*` (`--c-stroke/--c-fill/--c-ink`), `.fc-canvas` (lưới `--fc-grid`), `.fc-node`, `.fc-shape`, `.fc-edge`, `.fc-arrow*`, `.fc-elabel*`, `.fc-dnode`, `.fc-dedge`, `.fc-port*`, `.fc-palette*`, `.fc-side`, `.fc-watch*`, `.fc-console`, `.fc-menu*`, `.fc-dialog*`; container query `fcstudio` (980/760/560px); keyframes `fc-pulse`, `fc-flow`, `fc-in`, `fc-flash`. |
| `css/pages/scratch.css` | Giao diện Scratch Live + Xưởng khối, phạm vi `.sc-studio`: khối kiểu Scratch (nền SVG, hat/C/reporter/boolean, ô, menu thả), sân khấu, nhân vật, phông nền, popover, modal. | Màu nhóm `[data-cat="..."]` (`--c`, `--c2`, `--c3`, `--tc`, 11 nhóm); `.sc-b*`, `.sc-slot*`, `.sc-pill`, `.sc-dd*`, `.sc-script`, `.sc-live*`, `.sc-st*`, `.sc-cats`, `.sc-flyout*`, `.sc-ws*`, `.sc-stage*`, `.sc-monitor*`, `.sc-ask*`, `.sc-sprite*`, `.sc-bd__thumb[data-bd]`, `.sc-pop*`, `.sc-pymodal*`; container query `scstudio` (980/760/560/520px); keyframes `sc-pulse`, `sc-run`, `sc-pop-in`. |
| `css/pages/ai.css` | Giao diện trợ lý AI V-Mentor (bố cục trang + thành phần chat, dùng cả trong ngăn kéo IDE `.chat--compact`): nền cực quang tím/chàm, tấm kính mờ, ô soạn phát sáng, quả cầu avatar động. | Biến `--vm-*` (sáng/tối), `@property --vm-angle`; `.ai-page`, `.ai-aurora`, `.ai-history*`, `.ai-conv*`, `.vm-orb*` (xs/sm/lg/xl), `.vm-gradient-text`, `.chat*`, `.msg*`, `.caret`, `.typing`, `.chat-composer*`; breakpoint 861/860/640px; 11 keyframes (`vm-drift`, `vm-spin`, `vm-pulse`, `vm-ring`, `vm-breathe`, `vm-pop`, `vm-msg-in`, `vm-shine`, `caret-blink`, `typing`, `vm-angle`). |
| `js/pages/home.js` | Trang chủ (route `#/`): câu chuyện cuộn 7 cảnh (V-Core, Code thật, Lăng kính, V-Mentor, Hệ sinh thái, Tương lai, Bắt đầu). Mọi con số được tính từ tệp nội dung thật (`index.json`, `challenges.json`, danh mục V-Prism, danh sách chế độ AI). | Đối tượng trang `{ title, mount(container, ctx) }`; hằng `TRY_CODE`, `SNIPPETS`, `COURSE_LOOK`, `TRACK_ICON`, `NAVS`; hàm `sceneHead()`, `runTry()` (chạy Python thật qua `runCode` của `js/runtime/runner.js`); nạp động `content.js`, `prism/catalog.js`, `ai-modes.js`, `prism/mini.js`, `home/hero3d.js`; gửi câu hỏi V-Mentor qua `kv.set('ai:incoming', …)` rồi `ctx.navigate('/ai')`. |
| `js/pages/home/hero3d.js` | Cảnh WebGL "V-Core" ở phần Hero dựng bằng Three.js (nạp từ `THREE_URL`); trả về `null` nếu không có WebGL để giữ phương án CSS 3D. | `webglAvailable()`, `glowTexture()` (vân hào quang bằng canvas 2D), `glyphTexture()` (nhãn mã nguồn bằng canvas), `createHero3D(host, { signal, reduced })` → `{ setProgress(p), pulse(), dispose }`; vòng lặp `frame()`/`loop()`/`start()`/`stop()`; `ResizeObserver`, `IntersectionObserver`, `Raycaster` để bắt nhấp vào lõi. |
| `js/pages/home/scenes.js` | Bộ công cụ hiệu ứng cuộn cho trang chủ, không phụ thuộc thư viện; bỏ qua hiệu ứng khi người dùng bật giảm chuyển động. | `prefersReducedMotion()`, `initScrollScenes()` (đặt biến CSS `--p` 0..1, chế độ `data-scene="pin"`), `initCounters()` (đếm số tăng dần cho `[data-count]`), `initTilt()` (nghiêng 3D `--rx/--ry/--mx/--my`), `initMagnetic()` (nút "hút" theo con trỏ), `initSceneNav()` (tô sáng chấm điều hướng cảnh). |
| `js/pages/learn.js` | Bảng điều khiển học tập (route `#/learn`): dải chào với tiến độ thật, thẻ "Tiếp tục học", danh mục khóa học (tab, tìm kiếm, lọc theo lộ trình) và bản đồ lộ trình học. | `courseCard(course, progress, index)` (được export, dùng lại ở nơi khác); trong `mount`: `renderBand()`, `renderContinue()`, `renderTabs()`, `renderChips()`, `renderGrid()`, `renderPath()`, `stateOf()`; lắng nghe `bus.on('progress:change')` và `appState.subscribe`. |
| `js/pages/learn/course-art.js` | Bộ nhận diện hình ảnh theo từng khóa học: dải màu, tiêu đề banner, biểu tượng và minh họa SVG nội tuyến (viewBox 160×120). | Hằng `ART` (python, pyvn, web, c, cpp, ai, fallback), `THEMES`, `ACCENT_THEMES`, `TRACK_STYLE`; hàm `courseTheme()`, `themeVars()` (biến CSS `--c-from/--c-to/--c-deep/--c-ink/--c-ink-dark`), `courseArt()`, `courseEmblem()`. |
| `js/pages/learn/shared.js` | Các hàm dùng chung cho trang Học, Khóa học, Bài học. | `courseDoneCount()` (đếm bài xong theo tiền tố `<courseId>-`), `pct()`, `bar()` (thanh tiến độ), `ring()` (vòng tiến độ), `rememberLesson()` / `lastOpenedLesson()` (khóa `learn:last:<user.key hoặc guest>` trong kho `kv`), `enableTilt()` (nghiêng 3D thẻ khóa học). |
| `js/pages/course.js` | Trang khóa học (route `#/learn/:course`): hero màu theo khóa, dòng thời gian chương dạng accordion, thẻ bên "Tiếp tục" dính (sticky). | `lessonKinds(l)` (Lý thuyết / Chấm giao diện / Bài tập code / Có minh họa Lăng kính); trong `mount`: `render()` dựng hero, danh sách chương, thẻ bên, nút "Mở/Thu gọn tất cả"; tập `open` lưu chương đang mở; dùng `loadCourse`, `loadCatalog`, `getProgress`, `isDone`, `markdown`. |
| `js/pages/lesson.js` | Trang bài học (route `#/learn/:course/:lesson`): lý thuyết, đề bài, bàn làm việc chạy và chấm thật; thêm khung giao diện của mục Học (bản đồ bài, biểu ngữ hoàn thành). | `mount` gọi `findLesson()`, `buildPracticePage()` (từ `js/components/practice.js`) với `onPass` → `markComplete('lessons', …)`; `renderMap()` (bản đồ từng bài theo chương), `setSolvedFrame()`; `rememberLesson()`. |
| `js/pages/challenges.js` | Sảnh Đấu trường (route `#/challenges`): hero có parallax, nút "Vào trận", thử thách hôm nay, thẻ người chơi, bản đồ, trùm cuối, bộ lọc, lưới trận, gần hoàn thành, bảng xếp hạng, huy hiệu. | `fold()`, `initialsOf()`, `STATUS`, `openAuth()`, `createRevealer()`, `sectionHead()`; trong `mount`: `renderPlay()`, `renderDaily()`, `renderPlayer()`, `renderMaps()`, `renderBosses()`, `renderNear()`, `renderFilters()`, `filtered()`, `card()`, `renderGrid()`, `setFilter()`, `renderBoard()`, `renderAch()`, `renderAll()`; bộ đếm ngược tới nửa đêm `setInterval` 1 giây. |
| `js/pages/challenge.js` | Trang thi đấu một trận (route `#/challenges/:id`): HUD, dải vòng đấu, đề bài (Nhiệm vụ/Gợi ý/Lời giải), bàn làm việc IDE và lớp phủ kết quả. | `SOLUTION_AFTER = 3`, `loadDraft()`, `prose()`, `errorScreen()`; trong `mount`: đồng hồ trận, `renderXpChip()`, `navBtn()`, `renderRounds()`, `renderBriefTab()`, `IDE.createWorkbench({... onSubmitted })`, `setPane()` (tab di động), phím tắt Ctrl/⌘+Enter. |
| `js/pages/arena/core.js` | Hàm và hằng dùng chung cho sảnh và trận Đấu trường, đều tính từ dữ liệu thật. | `RANKS`, `RANK_META`, `LANG_LABEL`, `WORLD_HUE`, `TIERS`; `ensureArenaFonts()`, `ensureArenaCss()`, `fmt`, `pad3`, `cleanTitle`, `clock()`, `tierFor()`, `levelStart()`, `levelFor()`, `dayKey()`, `msToMidnight()`, `streaks()`, `computeStats()`, `dailyChallenge()` (khóa localStorage `vc-arena-daily`), `achievements()`, `rng()`, `prefersReducedMotion()`, `idleWhenHidden()`. |
| `js/pages/arena/overlay.js` | Lớp phủ cuối trận "CHIẾN THẮNG"/"THẤT BẠI" và các ô vòng kiểm thử. | `roundTiles(tests, results, { compact })`, `countUp()`, `showMatchResult(host, o)` → `{ el, close }` (bẫy tiêu điểm Tab, phím Escape, khối thăng hạng/lên cấp, nút Thử lại / Thử thách tiếp theo / Về sảnh). |
| `js/pages/arena/art.js` | Đồ họa SVG sinh bằng mã cho Đấu trường: huy hiệu hạng độ khó, huy hiệu bậc người chơi, huy chương thành tích, tranh bản đồ, đường chân trời hero, biểu tượng nhỏ. | `rankEmblem()`, `tierEmblem()`, `medal()`, `contours()`, `WORLD_SCENE` (5 cảnh), `worldArt()`, `skyline()`, `heroLayers()`, đối tượng `glyph` (crosshair, swords, medal, map, skull, hidden). |
| `js/pages/classroom.js` | Điểm vào route `#/classroom`, `#/classroom/:code`, `#/join/:code`; chờ xác thực rồi chọn khung nhìn phù hợp vai trò. | `waitForAuth()`; `mount` với `render()` chọn `offlineView` / `landingView` / `roleView` / `joinView` / `classView` / `homeView`; dựng lại khi `user.key` hoặc `user.role` thay đổi; dùng `AbortSignal.any` để hủy khung nhìn cũ. |
| `js/pages/classroom/landing.js` | Màn hình ngoại tuyến, trang giới thiệu khi chưa đăng nhập, chọn vai trò một lần và trang lời mời tham gia lớp. | `openSignIn()`, `offlineView()`, `landingView({ joinCode })`, `howCol()`, `roleView(user)` (gọi `C.chooseRole` sau `confirmDialog`), `joinView(container, ctx, user, isTeacher)` (gọi `C.getClass`, `C.joinClass`). |
| `js/pages/classroom/home.js` | Bảng điều khiển lớp học (`#/classroom`): mọi lớp của giáo viên/học sinh, KPI và danh sách bên. | `greeting()`, `loadSummaries()` (tối đa 16 lớp, đọc `listAssignments` + `listSubmissions`), `homeView()`, `scoreBandOf()`, `classCard()`; re-export `invalidateClasses`. |
| `js/pages/classroom/shell.js` | Khung ứng dụng lớp học: thanh bên (bộ chuyển lớp, mục điều hướng, huy hiệu đếm), bộ nhớ đệm danh sách lớp, hộp thoại tạo lớp/tham gia lớp. | Biến `cache`, `invalidateClasses()`, `getMyClasses()` (đệm 60 giây), `peekClasses()`, `createShell()` → `{ el, main, extra, setActive, setBadges, setClass }`, `openCreateClass()`, `joinByCode()`, `joinForm()`, `openJoinDialog()`. |
| `js/pages/classroom/workspace.js` | Một lớp cụ thể (`#/classroom/:code`): đăng ký nghe dữ liệu thời gian thực, khung ứng dụng, định tuyến các mục. | `TEACHER_SECTIONS` (7 mục), `STUDENT_SECTIONS` (7 mục), `FACTORIES`, `ALIASES`; `classView()` với đối tượng trạng thái `S`, `renderExtra()`, `updateBadges()`, `syncUrl()`, `renderSection()`, `go()`, `schedule()` (gộp cập nhật vào một khung hình), `onErr()`; `loadingSkeleton()`. |
| `js/pages/classroom/overview.js` | Mục "Tổng quan" của lớp: bảng điều khiển giáo viên và học sinh dựng từ dữ liệu trực tiếp. | `hero()`, `overviewSection(S)` (deps: cls, assignments, submissions, presence, messages), `teacherOverview()` (5 KPI, lịch hạn nộp, tỉ lệ nộp, donut tình trạng, phân bố điểm, cần chú ý, đang trực tuyến, hoạt động), `studentOverview()`. |
| `js/pages/classroom/assignments.js` | Bài tập: danh sách/chi tiết/hàng chờ chấm/trình soạn bài/khung chấm của giáo viên; danh sách có trạng thái và khung làm bài của học sinh. | `prose()`, `norm()`, `assignmentsSection()`, `teacherList()`, `gradingQueue()`, `autoCell()`, `submittedCell()`, `teacherScoreCell()`, `duplicate()`, `removeAssignment()`, `teacherDetail()`, `testList()`, `openGrade()` (export), `rerunResult()`, `studentList()`, `openSolve()` (export), `codeInput()`, `openAssignmentEditor()` (export), `endOfDay()`. |
| `js/pages/classroom/gradebook.js` | Bảng điểm: ma trận học sinh × bài tập (giáo viên, xuất CSV) và trang điểm số của học sinh. | `gradebookSection()`, `teacherGradebook()` (sắp xếp theo cột, dòng trung bình lớp), `exportCSV()` (tệp `bang-diem-<CODE>.csv`), `studentGrades()` (KPI, biểu đồ cột `columnSeries`, bảng chi tiết). |
| `js/pages/classroom/people.js` | Học sinh/Thành viên: danh sách lớp kèm trạng thái trực tuyến và tiến độ (giáo viên), lưới thành viên (học sinh). | `peopleSection()`, `studentStats()`, `teacherRoster()` (KPI, bộ lọc Tất cả/Đang trực tuyến/Cần chú ý, bảng sắp xếp), `removeStudent()`, `openStudent()` (export, hồ sơ học sinh), `memberList()`. |
| `js/pages/classroom/feed.js` | Dòng hoạt động suy ra từ dữ liệu lớp và mục thảo luận của lớp. | `buildEvents(S)` (các loại class, member, assignment, submission, grade, message), `eventItem()`, `activitySection()` (lọc theo loại, nhóm theo ngày, tối đa 300 sự kiện), `discussionSection()` (gửi bằng Enter, nhóm tin trong 5 phút, xóa tin). |
| `js/pages/classroom/settings.js` | Cài đặt lớp (giáo viên) / Thông tin lớp (học sinh) và hộp thoại mời (mã, liên kết, QR, trình chiếu). | `inviteLink()`, `loadQR()` (nạp `QRCODE_URL`), `renderQR()`, `openInvite()`, `presentCode()`, `settingsSection()`, `teacherSettings()` (sửa thông tin, xóa lớp), `studentInfo()` (rời lớp). |
| `js/pages/classroom/util.js` | Hàm dùng chung của lớp học: logic trạng thái, định dạng, ảnh đại diện, biểu đồ, bảng sắp xếp. | `LANG_OPTIONS`, `langLabel`, `errMsg`, `DAY`, `ONLINE_WINDOW` (120 000 ms), `effScore`, `isGraded`, `rosterOf()`, `deadlineState()`, `studentStatus()`, `STATUS_META`, `statusPill()`, `deadlineText()`, `deadlineChip()`, `scoreText()`, `scoreBand()`, `avatar()`, `emptyBlock()`, `panel()`, `kpi()`, `progressBar()`, `chipFilter()`, `searchBox()`, `donut()`, `barList()`, `histogram()`, `columnSeries()`, `deadlineStrip()`, `sortableTable()`, `toCSV()`, `sectionHead()`, `onlineOf()`, `presenceText()`. |
| `js/pages/classroom/art.js` | Đồ họa lớp học: banner lớp xác định theo mã lớp và các minh họa SVG cho trạng thái rỗng/trang giới thiệu. | `hashString()` (FNV-1a), `prng()` (mulberry32), `PALETTES` (8 bảng màu), `classTheme()`, `bannerSVG()` (6 mẫu họa tiết), `banner()`, `classMark()`, `ILLOS` (10 minh họa), `illo()`, `heroIllustration()`, `roleArt()`. |
| `js/pages/account.js` | Trang tài khoản (route `#/account`): 5 tab Hồ sơ, Bảo mật, Giao diện & AI, Ngoại tuyến, Dữ liệu. | `TABS`, `section()`, `resizeImage()` (thu ảnh còn 160 px, JPEG 0,82); trong `mount`: `renderNav()`, `needLogin()`, `profileTab()`, `securityTab()`, `settingsTab()`, `offlineTab()`, `dataTab()`, `render()`. |
| `js/pages/not-found.js` | Trang 404 "Không tìm thấy trang". | Đối tượng trang với `mount(container)` dựng `empty-state` và 2 nút "Về trang chủ", "Xem khóa học". |
| `js/pages/prism/catalog.js` | Danh mục siêu dữ liệu V-Prism (5 nhóm, 14 chủ đề, 41 thuật toán); mô-đun chủ đề nặng được nạp lười. | `PRISM_CATEGORIES`, `PRISM_TOPICS`, `loadTopic(id)` (import động `topics/*.js`). |
| `js/pages/prism/engine.js` | Bộ ghi khung hình và trình phát: thuật toán ghi ảnh chụp bất biến, trình phát chỉ dịch chỉ số nên lùi bước chính xác. | `MAX_FRAMES = 3000`, `snap()`, lớp `Recorder` (`add(state, line, msg, vars)`), lớp `Player` (`load`, `emit`, `delay`, `tick`, `play`, `pause`, `toggle`, `step`, `seek`, `restart`, `setSpeed`, `destroy`); `parseNumberList()`, `parseInteger()`, `randomInts()`, `randomDistinct()`. |
| `js/pages/prism/index.js` | Trang V-Prism "Lăng kính thuật toán": danh mục chủ đề (route `#/prism`) và trình phát mô phỏng một chủ đề (route `#/prism/:topic/:algo`). | `SPEEDS`, `CODE_LANGS`, `CAT_CODE`, `CX`, `cxClass()`, `cxIndex()`, `prose()`, `brandMark()`, `GLYPHS` + `topicGlyph()`, `cornerTicks()`, `renderCatalog()`, `renderTopic()` (gồm `moveHighlight()`, `validateField()`, `parseInputs()`, `runAlgo()`, `renderInputs()`, `renderAlgoTabs()`, `gauge()`, `renderCxStrip()`, `renderDetail()`, `renderPseudo()`, `selectAlgo()`, phím tắt). |
| `js/pages/prism/mini.js` | Bản demo sắp xếp tự lặp thu nhỏ (trang chủ và hero danh mục V-Prism). | Bộ sinh `insertionFrames()`, `quickFrames()`; `mountMiniSort(container, { signal, size, interval })` xen kẽ sắp xếp chèn và sắp xếp nhanh. |
| `js/pages/prism/renderers.js` | Các bộ vẽ trạng thái (mỗi hàm nhận `(host, state)` và vẽ lại); màu lấy từ lớp CSS nên theo chủ đề sáng/tối. | `renderBars()`, `renderCellsRow()`, `renderCells()`, `renderList()`, `renderStackQueue()`, `layoutTree()`, `renderTree()`, `renderSide()`, `renderGraph()`, `renderMatrix()`, `renderTable()`, `renderCallTree()`, `renderHash()`, `renderHanoi()`, bảng ánh xạ `RENDERERS` (10 loại). |
| `js/pages/prism/topics/sorting.js` | Định nghĩa chủ đề Sắp xếp (6 thuật toán) và Tìm kiếm (2 thuật toán). | `arrInput()`, `doneMarks()`; đối tượng `bubble`, `selection`, `insertion`, `merge`, `quick`, `counting`, `linear`, `binary` (mỗi đối tượng có `id`, `title`, `renderer`, `summary`, `complexity`, `inputs`, `pseudo`, `code` 3 ngôn ngữ, `run()`); export `sortingTopic`, `searchingTopic`, `doneMarks`. |
| `js/pages/prism/topics/linear.js` | Định nghĩa chủ đề cấu trúc tuyến tính: Mảng, Danh sách liên kết, Ngăn xếp & Hàng đợi, Bảng băm. | Đối tượng `arrAccess`, `arrInsert`, `arrDelete` (renderer `cells`), `llInsert`, `llDelete`, `llReverse` (renderer `list`), `stackOps`, `queueOps`, `brackets` (renderer `stackqueue`), `chaining`, `probing` (renderer `hash`), `llCode`, `mInput`; export `arraysTopic`, `linkedListTopic`, `stackQueueTopic`, `hashTopic`. |
| `js/pages/prism/topics/trees.js` | Định nghĩa chủ đề Cây nhị phân, Cây nhị phân tìm kiếm, Heap. | `parseLevelOrder()`, `treeFromLevel()`, `levelInput`, `travCode`, `traversal(kind)` (preorder/inorder/postorder/level), `bstBuildInput`, `bstCode`, `bstBuild`, `bstSearch`, `bstDelete`, `heapCode`, `buildHeap`, `heapInsert`, `heapSort` (renderer `tree`); export `binaryTreeTopic`, `bstTopic`, `heapTopic`. |
| `js/pages/prism/topics/graphs.js` | Định nghĩa chủ đề đồ thị: Biểu diễn, Dijkstra, BFS, DFS. | `DEFAULT_EDGES`, `PRESET_POS`, `parseGraph()` (cú pháp "A-B:4", đỉnh A–H, tối đa 16 cạnh), `adjacency()`, `graphInput()`, `sourceInput`, `checkSource()`; đối tượng `representation`, `dijkstra`, `bfs`, `dfs` (renderer `graph`); export `graphTopic`, `bfsTopic`, `dfsTopic`. |
| `js/pages/prism/topics/recursion-dp.js` | Định nghĩa chủ đề Đệ quy và Quy hoạch động. | Đối tượng `factorial`, `fibTree`, `fibMemo` (renderer `calltree`), `hanoi` (renderer `hanoi`), `fibTab`, `knapsack`, `lcs`, `coins` (renderer `table`); export `recursionTopic`, `dpTopic`. |
| `css/pages/home.css` | Kiểu trang chủ "premium 3D": 7 cảnh có chỉ đạo nghệ thuật, nhận tiến độ cuộn qua `--p`. | Lớp `.hero`, `.hero-fallback` (vòng CSS 3D), `.hero-hud`, `.scene-code`/`.code-window` (nghiêng theo `--k`), `.scene-prism`/`.lab-stage`, `.scene-ai`/`.mentor-carousel`, `.eco-card--arena/--ide/--class/--offline`, `.scene-future__floor`, `.start-card__glow`, `.scene-nav`, `.home-progress`; keyframes `ring-a/b/c`, `hero-*`, `marquee`, `aurora`, `future-floor`, `status-ping-s`; khối giảm chuyển động. |
| `css/pages/learn.css` | Kiểu mục Học (`#/learn`, `#/learn/:course`, khung bài học): dải bảng điều khiển màu navy, thẻ khóa học nhiều màu, bản đồ lộ trình, hero khóa học, dòng thời gian chương. | Phạm vi `.page-root--learn`; lớp `.lx-band`, `.lx-stat`, `.course-card` (nghiêng 3D), `.lx-path`/`.lx-node`, `.lx-hero`, `.chapter`, `.lesson-row`, `.lx-side-card`, `.lx-lesson__map`, `.lx-lesson__done`; keyframes `lx-rise`, `lx-pop`, `lx-float`, `lx-bob`. |
| `css/pages/challenges.css` | Kiểu Đấu trường (sảnh + trận): bản sắc tối, góc cạnh, độc lập với chủ đề trang; mọi bộ chọn nằm dưới `.page-root--challenges`. | Lớp `.ar-hero__layer--back/far/mid/near` (parallax theo `--mx/--my`), `.ar-play`, `.ar-daily`, `.ar-player`, `.ar-map`, `.ar-boss`, `.ar-card`, `.ar-board`, `.ar-medal`, `.ar-hud`, `.ar-rounds`, `.ar-round`, `.ar-result`; keyframes `ar-in`, `ar-spin`, `ar-blink`, `ar-beam`, `ar-ember`, `ar-sweep`, `ar-skel`, `ar-flip`, `ar-slash`, `ar-word`, `ar-pop`; `.is-idle` tạm dừng hoạt ảnh. |
| `css/pages/classroom.css` | Kiểu lớp học dạng SaaS giáo dục: khung, bảng điều khiển, bảng điểm, chấm bài; token màu riêng (xanh lá = đã xong/đã chấm, hổ phách = sắp hạn, đỏ = quá hạn, tím = AI). | Lớp `.cr-app`, `.cr-side`, `.cr-switch`, `.cr-kpi`, `.cr-panel`, `.cr-class-hero`, `.cr-class-card`, `.cr-asg`, `.cr-donut`, `.cr-barlist`, `.cr-hist`, `.cr-strip`, `.cr-table`, `.cr-gb`, `.cr-chat`/`.cr-msg`, `.cr-invite`, `.cr-grade`, `.cr-solve`; keyframes `cr-float`, `cr-rise`, `cr-pop`, `cr-pulse`, `cr-draw`, `cr-grow`, `cr-rise-bar`. |
| `css/pages/account.css` | Kiểu trang Tài khoản (17 dòng): bố cục hai cột và các dòng trạng thái ngoại tuyến. | `.account-layout`, `.account-nav` (sticky), `.account-nav__item.is-active`, `.account-body`, `.offline-row`, `.offline-row__icon.is-ok/.is-warn`; media query ≤ 820px chuyển thanh tab ngang. |
| `css/pages/prism.css` | Kiểu V-Prism: bản sắc phòng thí nghiệm khoa học (giấy kẻ ô blueprint, xanh lơ – mực, bảng mảnh có dấu góc, thước đo, số liệu monospace). | Token `--lab-*`, `--viz-*` (sáng/tối), màu nhóm và thang độ phức tạp; lớp `.pz-hero`, `.pz-scope`, `.pz-topic-card`, `.pz-stage`, `.pz-dock`, `.pz-timeline`, `.pz-pseudo`, `.pz-bar.is-compare/swap/done/pivot/active/dim`, `.pz-cell`, `.pz-ll-node`, `.pz-sq`, `.pz-node`, `.pz-table`, `.pz-bucket`, `.pz-hanoi`, `.pz-mini`; keyframes `pz-sweep`, `pz-card-in`, `pz-blink`, `pz-pop`, `pz-var-in`. |
| `data/courses/index.json` | Danh mục (catalog) khóa học và lộ trình, được trang Học tập đọc đầu tiên; sinh tự động bởi `tools/build_catalog.py`, đọc qua `js/services/content.js`, được `sw.js` precache | `version: 2`, `generated_at`, `courses[]` (6 khóa: id, title, subtitle, lang, level, track, accent, tags, description, chapters_count, lessons_count, xp_total), `tracks[]` (9 lộ trình: 4 `available`, 5 `roadmap` có `topics`) — 8.824 byte |
| `data/courses/pyvn.json` | Nội dung khóa "Python Tiếng Việt" (nhập môn, từ khóa tiếng Việt được dịch sang Python) | 3 chương, 12 bài, 180 XP, 41 test (12 ẩn), 24 gợi ý; lang `pyvn`, track `programming`, accent `green` — 27.354 byte |
| `data/courses/python.json` | Nội dung khóa "Python cơ bản" (chấm bằng Python thật trên trình duyệt) | 5 chương, 30 bài, 520 XP, 117 test (30 ẩn), 64 gợi ý, 4 bài có `prism`; level "Cơ bản" — 71.796 byte |
| `data/courses/web.json` | Nội dung khóa "HTML & CSS: Thiết kế web"; bài được chấm bằng cách phân tích DOM trang học sinh tạo | 4 chương, 16 bài, 280 XP, `tests` rỗng, 69 `checks` (6 loại: style 26, exists 14, count 12, attr 7, js 6, text 4) — 58.616 byte |
| `data/courses/c.json` | Nội dung khóa "Lập trình C" (chạy bằng JSCPP) | 4 chương, 16 bài, 270 XP, 67 test (32 ẩn), 43 gợi ý — 59.076 byte |
| `data/courses/cpp.json` | Nội dung khóa "C++ & Thuật toán" (định hướng thi học sinh giỏi, liên kết Lăng kính thuật toán) | 5 chương, 20 bài, 410 XP, 86 test (46 ẩn), 53 gợi ý, 16 bài có `prism`; level "Trung cấp", track `algorithms` — 80.108 byte |
| `data/courses/ai.json` | Nội dung khóa "Nhập môn AI & Khoa học dữ liệu" (tự cài đặt thuật toán bằng Python thuần) | 3 chương, 10 bài, 240 XP, 41 test (11 ẩn), 26 gợi ý, 2 bài có `prism`; lang `python`, track `ai` — 37.098 byte |
| `data/challenges.json` | Ngân hàng thử thách của Đấu trường (arena), đọc qua `js/services/content.js` và `js/pages/arena/core.js`; được precache | `version: 2`, `worlds[]` (5 thế giới), `challenges[]` (100 chặng, 60 Python + 20 C + 20 C++, 5 BOSS, 321 test trong đó 118 ẩn, tổng 21.000 XP) — 142.878 byte |
| `data/pyvn-keywords.json` | Bảng ánh xạ từ khóa Python Tiếng Việt → Python, dùng chung cho `js/runtime/pyvn.js`, `tools/pyvn.py`, `js/components/flowchart/expr.js` (bản dự phòng rút gọn ở `js/components/scratch/pyparse.js`) | `version: 2`, `description`, `phrases[]` 4 cụm (vd. `nhap_so()` → `int(input())`), `words{}` 22 từ (vd. `neu` → `if`, `in_ra` → `print`), `note` — 1.172 byte |
| `assets/logo.jpg` | Ảnh logo gốc độ phân giải cao; KHÔNG còn được mã nguồn hiện tại tham chiếu, chỉ được bản cũ `archive/legacy-v25/index.html` và các script `upgrade_*.py` dùng | Dữ liệu thực chất là PNG (chữ ký `\x89PNG`, dù đuôi `.jpg`), 1254×1254 px, RGB 8-bit — 1.183.133 byte (≈1.155,4 KB) |
| `assets/logo-640.jpg` | Logo bản thu nhỏ dùng trong giao diện hiện tại | JPEG (JFIF) 640×640 px, 36.099 byte; dùng ở `index.html` (màn hình intro, 132×132), `js/main.js` (đầu ngăn kéo menu, 72×72), `js/components/auth-dialog.js` (hộp đăng nhập, 64×64); precache trong `sw.js` |
| `assets/icons/apple-touch-icon.png` | Biểu tượng khi "Thêm vào màn hình chính" trên iOS | PNG RGBA 180×180 px, 25.720 byte; `<link rel="apple-touch-icon">` trong `index.html`; precache trong `sw.js` |
| `assets/icons/icon-192.png` | Biểu tượng PWA cỡ 192 | PNG RGBA 192×192 px, 29.283 byte; `manifest.json` (`purpose: any`); precache trong `sw.js` |
| `assets/icons/icon-512.png` | Biểu tượng PWA cỡ 512 (màn hình chờ / cài đặt ứng dụng) | PNG RGBA 512×512 px, 241.387 byte; `manifest.json` (`purpose: any`) |
| `assets/icons/maskable-512.png` | Biểu tượng PWA dạng "maskable" (Android cắt theo hình dạng launcher) | PNG RGBA 512×512 px, 174.480 byte; `manifest.json` (`purpose: maskable`) |
| `assets/icons/mark-96.png` | Dấu thương hiệu (brand mark) cỡ nhỏ: favicon, logo thanh điều hướng & chân trang, icon shortcut PWA | PNG RGBA 96×96 px, 7.365 byte; `index.html` (favicon + `.brand__mark` ở header và footer), `manifest.json` (3 shortcut: Học tiếp, IDE, Trợ lý AI); precache trong `sw.js` |
| `assets/icons/mark-192.png` | Dấu thương hiệu cỡ 192 (bản dự trữ) | PNG RGBA 192×192 px, 26.700 byte; không có tham chiếu nào trong `index.html`, `manifest.json`, `sw.js`, `js/`, `css/` |
| `vendor/jscpp/JSCPP.es5.min.js` | Trình thông dịch C/C++ giáo dục JSCPP (bản đóng gói ES5, nhúng sẵn để chạy ngoại tuyến) | 1 dòng, 619.555 byte; nạp bằng `importScripts` trong `js/runtime/cpp.worker.js` (Web Worker dùng chung cho C và C++), trong `tests/harness/jscpp.html` để kiểm định nội dung; precache trong `sw.js` |
| `vendor/sqljs/sql-wasm.js` | Bộ nạp sql.js (SQLite biên dịch Emscripten) | 48.863 byte; nạp trong `js/runtime/sql.worker.js` (`importScripts(base + 'sql-wasm.js')`); precache trong `sw.js` |
| `vendor/sqljs/sql-wasm.wasm` | Mã nhị phân WebAssembly của SQLite cho sql.js | WASM (chữ ký `\0asm`, phiên bản 1), 652.953 byte; tải từ thư mục `vendor/sqljs/` bởi `js/runtime/sql.worker.js`; backend trả `content-type: application/wasm` (có test trong `backend/tests/test_static.py`); precache trong `sw.js` |
| `archive/legacy-v25/index.html` | Trang đơn (SPA) của phiên bản cũ v25 — giữ để tham khảo | 1.028 dòng; nạp `css/design-system.css?v=26`, CDN qrcodejs và Firebase compat 10.12.2 (app/auth/firestore), 22 tệp `js/*.js` theo thứ tự từ `courses-data.js` đến `v25-time24.js?v=26`; 9 view: `view-home`, `view-learning`, `view-course-ide`, `view-workspace`, `view-challenges`, `view-challenge-ide`, `view-classroom`, `view-assignment-ide`, `view-account`; đăng ký `sw.js`; dùng `assets/logo.jpg` 5 lần |
| `archive/legacy-v25/manifest.json` | Web App Manifest cũ | `name` "V-Code Edu — Nền tảng Học lập trình Việt Nam", `start_url` `./index.html`, `background_color` `#06080D`, `theme_color` `#10B981`, `icons: []` (không có biểu tượng) |
| `archive/legacy-v25/sw.js` | Service Worker cũ, chiến lược Network-First | `CACHE_NAME = 'vcode-edu-v5'`, danh sách `CORE_ASSETS` (index, manifest, design-system.css, các js cốt lõi); 44 dòng |
| `archive/legacy-v25/css/design-system.css` | Toàn bộ CSS của bản cũ (một tệp duy nhất, được các script nâng cấp nối thêm qua nhiều phiên bản) | 3.358 dòng, 166.702 byte; import Google Fonts Be Vietnam Pro + JetBrains Mono; biến `:root`/`[data-theme="dark"]`; 23 khối chú thích đánh dấu phiên bản (V11, V12…) |
| `archive/legacy-v25/js/app.js` | Bộ điều khiển trung tâm của bản cũ ("v6.0 — BỘ ĐIỀU KHIỂN TRUNG TÂM") | 2.623 dòng; `ROLE_LABELS`, `SNIPPETS`; ~132 hàm: `apiRequest`, `switchView`, `openAuthModal`, `handleLoginSubmit`, `handleRegisterSubmit`, `handleRealSocialLogin`, `renderAccountView`, `lockRoleOnceAction`, `renderTeacherClassesGrid`, `startLiveMonitoringPolling`, `handleCreateAssignmentSubmit`, `shareActiveClassQR`, `joinClassByCodeAction`, `renderChallengeStages`, `openChallengeInIDE`… |
| `archive/legacy-v25/js/ai-tutor.js` | Trợ lý AI cũ (`window.VCodeAI`, bản v15 "AI chatbox sạch") | Đọc `vcode_backend_url`, `vcode_gemini_key`, `vcode_openai_key` từ localStorage; gọi Gemini/OpenAI hoặc trả lời cục bộ; 99 dòng |
| `archive/legacy-v25/js/challenges-50.js` | Dữ liệu thử thách cũ (`window.VCODE_50_CHALLENGES`, dù tên là 50 nhưng chứa 100 chặng) | 100 chặng (60 python, 20 c, 20 cpp; rank D/C/B/A 20 mỗi loại, S 15, BOSS 5); trường `id, stage, world, worldName, lang, rank, isBoss, xp, title, shortTitle, desc, starter, testCases`; 160 test case (`input`, `expected`) |
| `archive/legacy-v25/js/cloud-db.js` | Lớp CSDL đám mây cũ (`window.VCodeCloudDB`, v16) dùng Firebase Firestore + offline persistence | `isReady()` kiểm tra `VCODE_FIREBASE_CONFIG`, `db()`…; 160 dòng |
| `archive/legacy-v25/js/courses-data.js` | Dữ liệu khóa học cũ (`window.VCODE_COURSES`) do `upgrade_vcode_v9.py` sinh | 5 khóa × 50 bài = 250 bài (course-python, course-pyvn, course-html, course-c, course-cpp giá 20000); trường khóa `id, lang, title, bannerTitle, bannerSub, gradient, icon, price, rating, lessons`; bài `id, title, difficulty, points, problem, theory, starter, testCases`; 350 test case; 217.888 byte |
| `archive/legacy-v25/js/firebase-auth.js` | Cấu hình và tiện ích đăng nhập OAuth (Google/Facebook/GitHub) qua Firebase Authentication | `window.VCODE_FIREBASE_CONFIG` (apiKey, authDomain, projectId), `window.VCodeOAuth.isConfigured()`…; 35 dòng |
| `archive/legacy-v25/js/ide-engine.js` | Engine Python cũ (`window.VCodeIDE`): dịch Python Tiếng Việt bằng regex, terminal tương tác kiểu OnlineGDB, chấm tự động | `translateVietnamesePython`, `evalExprAsync`, `execBlockAsync`, `askTerminal`, `checkAbort`…; 353 dòng |
| `archive/legacy-v25/js/lessons-data.js` | Kho bài học Python mẫu đầu tiên (`window.VCODE_LESSONS`) | 4 bài `py-01`…`py-04` (trường id, order, title, level, duration, summary, theory…); 48 dòng |
| `archive/legacy-v25/js/multilang-engine.js` | Bộ chạy đa ngôn ngữ cũ (`window.VCodeMultiLang`): Python, HTML5, CSS, C, C++, JS, SQL | `detectLang`, `asyncPrompt`, giả lập `__cout`, `__printf`, `__cinNum`, `__cinStr`…; 204 dòng |
| `archive/legacy-v25/js/offline-db.js` | Lưu cục bộ local-first + hàng đợi đồng bộ (`window.VCodeOfflineDB`) | `STORAGE_KEY = 'vcode_edu_local_state_v5'`, cấu trúc `{ users, completedLessons, syncQueue }`; 42 dòng |
| `archive/legacy-v25/js/realtime-monitor.js` | Giám sát lớp học thời gian thực cũ (`window.VCodeMonitor`) qua `BroadcastChannel('vcode_edu_realtime')` | Thông điệp `STUDENT_HEARTBEAT`, `TEACHER_HINT`; 47 dòng |
| `archive/legacy-v25/js/scratch-bridge.js` | Scratch Live + sơ đồ khối SVG + bảng chẩn đoán lỗi phía dưới IDE | `parseLine`, `buildTree`, `renderScratchHTML`, `renderFlowchartSVG`, `analyzePythonCode`, `renderDiagnostics`, `updateScratchLive`…; 512 dòng |
| `archive/legacy-v25/js/three-hero.js` | Tệp còn lại sau khi tắt hiệu ứng Three.js cũ (v16.1) | Chỉ định nghĩa `window.initThreeHero = function () {}` rỗng; 3 dòng |
| `archive/legacy-v25/js/v16-core.js` | Lớp lõi v16: bộ icon SVG, editor thông minh, Scratch Live v16, nhập input tương tác, đăng nhập Firebase, hoạt ảnh trang chủ kiểu Swiss | `VCodeIcons`, `attachSmartCodeEditor`, `renderScratchLiveV16`, `runPythonWithInteractiveInput`, `initFirebaseAuthListener`, `initSwissAnimations`…; 531 dòng |
| `archive/legacy-v25/js/v18-engine.js` | Lớp v18: trang chủ cuộn 3D chia cảnh, lớp học kiểu OLM có hạn nộp thật, báo cáo và chấm điểm | `initV18ScrollScenes`, `getDeadlineStatus`, `renderV18ClassroomState`, `openV18AssignmentReport`, `openV18GradeModal`, `openV18StudentSolve`…; 607 dòng |
| `archive/legacy-v25/js/v19-polish.js` | Lớp v19 "polish": mở Trang chủ mặc định, lớp học xanh-trắng, giao bài định dạng DD/MM/YYYY + giờ | `enforceHomeOnInitialLoad`, `polishHeaderAndAuthModal`, `rebuildAssignmentModal`, `renderV19Classroom`, `setV19ClassTab`…; 526 dòng |
| `archive/legacy-v25/js/v20-final.js` | Lớp v20: đồng bộ giao diện Sáng/Tối (icon Mặt trăng/Mặt trời), theme riêng cho IDE | `applyGlobalTheme`, `toggleTheme`, `bindIsolatedIDETheme`, `refineFloatingHelperIcon`; 84 dòng |
| `archive/legacy-v25/js/v21-upgrade.js` | Lớp v21: terminal tương tác kiểu OnlineGDB, mục quản lý tài khoản ở menu trái, ô hạn nộp tự định dạng DD/MM/YYYY | `ensureOnlineGDBTerminal`, `runPythonInOnlineGDBTerminal`, `syncLeftDrawerAccountSections`, `enhanceDeadlineRealTimeInput`, `markQuickTopNavAlwaysDark`…; 376 dòng |
| `archive/legacy-v25/js/v22-pro-ide.js` | Lớp v22: nút Xóa code, autocomplete bằng Tab, tô màu cú pháp kiểu VS Code, chạy đa ngôn ngữ, nền trang chủ động | `highlightCode`, `setupSyntaxOverlay`, `setupAutocomplete`, `analyzeByLanguage`, `runMultiLanguageSmart`, `upgradeHomeDynamicBackdrop`…; 507 dòng |
| `archive/legacy-v25/js/v23-fx-caret.js` | Lớp v23: gợi ý code hiện ngay dưới con trỏ, đổi ngôn ngữ tức thì, hiệu ứng trang chủ 60fps | `getCaretPixelCoords`, `upgradeAutocompleteToCaretPosition`, `optimizeLanguageSwitchingAndSpeed`, `initHomepageV23Effects`…; 382 dòng |
| `archive/legacy-v25/js/v24-fix-smooth.js` | Bản vá v24: sửa lỗi chèn code nhanh bị ẩn chữ khi bật tô màu, tối ưu hiệu năng trang chủ | `hookEditorValueProperty` (bọc setter `value` của textarea), `optimizeHomepagePerformance`; 265 dòng |
| `archive/legacy-v25/js/v25-time24.js` | Lớp v25: ô chọn giờ 24h tự tạo kiểu với popup đồng hồ nổi (do `fix_time_24h.py` ghi ra) | `injectStyles`, `upgradeTo24hPicker`, `parseHM`, `positionPopup`, `togglePop`; 280 dòng |
| `archive/legacy-v25/backend/__init__.py` | Đánh dấu gói Python `backend` của bản cũ | Tệp rỗng (0 byte) |
| `archive/legacy-v25/backend/main.py` | Điểm vào máy chủ FastAPI cũ ("V-Code Edu API", version 5.1.0) | CORS mở `*`; `startup` gọi `init_database()`; `GET /api/health`; gắn 6 router: auth, classrooms, assessment, monitor, ai, sync |
| `archive/legacy-v25/backend/requirements.txt` | Danh sách thư viện của backend cũ | fastapi, uvicorn, sqlalchemy, pydantic, httpx, pymysql, cryptography, psycopg2-binary |
| `archive/legacy-v25/backend/database/__init__.py` | Đánh dấu gói `backend.database` | Tệp rỗng |
| `archive/legacy-v25/backend/database/base.py` | Lớp cơ sở ORM | `class Base(DeclarativeBase)` (SQLAlchemy 2.x) |
| `archive/legacy-v25/backend/database/connection.py` | Kết nối CSDL | `DATABASE_URL` từ biến môi trường, mặc định SQLite `vcode_edu.db`; chuẩn hóa tiền tố `postgres://`, `mysql://`; `engine`, pragma SQLite, `get_db()` |
| `archive/legacy-v25/backend/database/init_db.py` | Khởi tạo lược đồ CSDL | `init_database(reset_schema=False)` → `Base.metadata.create_all` (có tùy chọn `drop_all`) |
| `archive/legacy-v25/backend/models/__init__.py` | Đánh dấu gói `backend.models` | Tệp rỗng |
| `archive/legacy-v25/backend/models/user.py` | Mô hình người dùng | `User` → bảng `users` |
| `archive/legacy-v25/backend/models/classroom.py` | Mô hình lớp học | `Classroom` (`classrooms`), `ClassroomMember` (`classroom_members`), `StudentLiveSession` (`student_live_sessions`) |
| `archive/legacy-v25/backend/models/assessment.py` | Mô hình bài tập và bài nộp | `Assignment` (`assignments`), `Submission` (`submissions`) |
| `archive/legacy-v25/backend/models/learning.py` | Mô hình học tập | `Lesson` (`lessons`), `CourseEnrollment` (`course_enrollments`), `LessonProgress` (`lesson_progress`) |
| `archive/legacy-v25/backend/models/workspace.py` | Mô hình chia sẻ đoạn code | `SharedSnippet` (`shared_snippets`) |
| `archive/legacy-v25/backend/routers/__init__.py` | Đánh dấu gói `backend.routers` | Tệp rỗng |
| `archive/legacy-v25/backend/routers/auth.py` | API xác thực & tài khoản (prefix `/api/auth`) — không có cơ chế phân quyền | `POST /register`, `/login`, `/social`, `/set-role`, `/update-profile`, `/change-password`; `serialize_user`, `build_unique_username` |
| `archive/legacy-v25/backend/routers/classrooms.py` | API quản lý lớp học (prefix `/api/classes`) | `GET /teacher/{identifier}`, `GET /student/{identifier}`, `POST /create`, `POST /join`, `GET /{code}/detail`, `DELETE /{code}`, `PUT /{code}` |
| `archive/legacy-v25/backend/routers/assessment.py` | API giao bài, nộp bài, xếp hạng (prefix `/api/assessment`) | `POST /create`, `GET /assignments`, `POST /submit`, `GET /leaderboard`, `POST /grade` |
| `archive/legacy-v25/backend/routers/monitor.py` | API giám sát thời gian thực (prefix `/api/monitor`) | `POST /heartbeat`, `GET /live`, `POST /hint` |
| `archive/legacy-v25/backend/routers/ai.py` | API trợ lý AI (prefix `/api/ai`) | `POST /chat` nhận `AIChatSchema` |
| `archive/legacy-v25/backend/routers/sync.py` | API đồng bộ ngoại tuyến (prefix `/api/sync`) | `POST /push` nhận lô dữ liệu offline |
| `archive/legacy-v25/backend/schemas/__init__.py` | Đánh dấu gói `backend.schemas` | Tệp rỗng |
| `archive/legacy-v25/backend/schemas/ai_schema.py` | Lược đồ Pydantic cho AI | `AIChatSchema` |
| `archive/legacy-v25/backend/schemas/classroom_schema.py` | Lược đồ Pydantic cho lớp học | `CreateClassroomSchema`, `LiveHeartbeatSchema`, `TeacherHintSchema` |
| `archive/legacy-v25/backend/schemas/user_schema.py` | Lược đồ Pydantic cho người dùng | `RegisterSchema`, `LoginSchema`, `SocialAuthSchema`, `SetRoleSchema`, `UpdateProfileSchema`, `ChangePasswordSchema` |
| `archive/legacy-v25/backend/services/__init__.py` | Đánh dấu gói `backend.services` | Tệp rỗng |
| `archive/legacy-v25/backend/services/ai_service.py` | Dịch vụ AI lai online/offline | `offline_socratic_reply()` (trả lời gợi mở kiểu Socratic cục bộ), `ask_ai_hybrid()` gọi Gemini `gemini-2.0-flash` qua `GEMINI_API_KEY` |
| `archive/legacy-v25/backend/services/auth_service.py` | Dịch vụ mật khẩu & phiên | `hash_password`/`verify_password` dùng PBKDF2-HMAC-SHA256 120.000 vòng, `create_session_token` |
| `archive/legacy-v25/setup_vcode_backend.py` | Script khởi tạo ban đầu backend FastAPI + SQLAlchemy (User, Classroom, LiveSession, Lesson, Assignment, Submission, Share) | Từ điển `BACKEND_FILES` ghi ra 25 tệp: toàn bộ `backend/**` (bản đầu: router auth/monitor/ai/sync, SQLite `./vcode_edu.db`) và `test_project.py`; sau đó chạy `python test_project.py` (danh sách tệp frontend chỉ xuất hiện trong phần kiểm thử) |
| `archive/legacy-v25/setup_vcode_frontend.py` | Script khởi tạo toàn bộ frontend đầu tiên (3D animation, Scratch Live, chia sẻ QR, giám sát real-time, PWA offline) | `FRONTEND_FILES` ghi `.vscode/settings.json` (Live Server cổng 5500), `manifest.json`, `sw.js`, `index.html`, `css/design-system.css`, `js/ai-tutor.js`, `js/app.js`, `js/ide-engine.js`, `js/lessons-data.js`, `js/offline-db.js`, `js/realtime-monitor.js`, `js/scratch-bridge.js`, `js/three-hero.js`; 2.069 dòng |
| `archive/legacy-v25/test_project.py` | Kiểm thử tự động bản cũ | 4 bài: đủ tệp bắt buộc; manifest có "V-Code Edu"; băm/kiểm mật khẩu PBKDF2-SHA256; `offline_socratic_reply` trả `mode == "offline"` |
| `archive/legacy-v25/upgrade_vcode_v6.py` | Nâng cấp v6.0 "hoàn thiện toàn diện" | Backend: khóa vai trò một lần, đổi mật khẩu, avatar, real-time thật (ghi `backend/schemas/user_schema.py`, `routers/auth.py`, `routers/classrooms.py`, `database/init_db.py`); frontend: ghi lại `js/app.js`, `ide-engine.js`, `firebase-auth.js`, `offline-db.js`, `realtime-monitor.js`, `scratch-bridge.js`, `three-hero.js`, `ai-tutor.js`, `lessons-data.js`, CSS, `index.html`, `manifest.json`; làm sạch dữ liệu mô phỏng và khởi tạo CSDL thật |
| `archive/legacy-v25/fix_vcode_v6_1.py` | Bản vá v6.1 | Sửa lỗi "Failed to fetch" khi đăng ký/đăng nhập (`js/app.js`); viết lại `js/three-hero.js` thành engine cuộn 3D canvas 2D 60fps; nâng `js/ai-tutor.js` hỗ trợ OpenAI và Gemini; thêm ô OpenAI Key + hướng dẫn lấy key vào `index.html` |
| `archive/legacy-v25/upgrade_vcode_v7.py` | Nâng cấp v7.0 | Giao diện xanh-trắng + logo ảnh `assets/logo.jpg`; sửa đăng nhập/chọn vai trò trên điện thoại & GitHub Pages; tạo `js/courses-data.js` với 5 khóa học (miễn phí + 20K), IDE riêng kiểu CodeLearn; robot AI nổi kéo-thả; thử thách giao diện game; backend hỗ trợ MySQL/PostgreSQL/SQLite WAL (`requirements.txt`, `connection.py`, `models/learning.py`) |
| `archive/legacy-v25/upgrade_vcode_v8.py` | Nâng cấp v8.0 (6 phân hệ) | Thêm API `POST /grade` vào `backend/routers/assessment.py` (giáo viên chấm & nhận xét); IDE chính thành không gian code tự do 2 cột; sảnh game 50 chặng (`js/challenges-50.js`); lớp học phong cách mới; menu bỏ mục AI; robot AI online/offline |
| `archive/legacy-v25/upgrade_vcode_v9.py` | Nâng cấp v9.0 | `build_courses_50()` sinh 5 khóa × 50 bài = 250 bài vào `js/courses-data.js`; giao diện khóa học kiểu CodeLearn (banner, 3 chỉ số, 5 sao); vá lỗi "Failed to fetch" ở toàn bộ chức năng lớp học khi chạy không có backend |
| `archive/legacy-v25/upgrade_vcode_v10_olm.py` | Nâng cấp v10.0 "chuẩn OLM" | Viết lại `js/ai-tutor.js` (AI cục bộ không cần key + gọi Gemini/OpenAI thật, định dạng Markdown); giao diện đăng nhập/đăng ký 2 cột; lớp học kiểu OLM (thanh icon trái, 4 tab, thảo luận, chấm bài) trong CSS/`index.html`/`js/app.js` |
| `archive/legacy-v25/upgrade_vcode_v11.py` | Nâng cấp v11.0 | Dark mode lớp học tông be ấm; IDE tự do có nút Sáng/Tối riêng + bộ chọn 8 ngôn ngữ (Python, Python Tiếng Việt, HTML, CSS, JavaScript, C, C++, SQL); sảnh thử thách phong cách MOBA 50 chặng |
| `archive/legacy-v25/upgrade_home_v12.py` | Nâng cấp trang chủ v12.0 | Logo lớn với vòng hào quang 3D và thẻ công nghệ vệ tinh; thông điệp mới; nền lưới, thanh thẻ ngôn ngữ, dải 4 thẻ tính năng (CSS + `index.html`) |
| `archive/legacy-v25/upgrade_vcode_v13.py` | Nâng cấp v13.0 | Gỡ chặn định dạng API key Google AI Studio mới (`AQ.`, `AIza…`, `sk-…`), gửi header `x-goog-api-key`, thử lần lượt gemini-2.5/2.0/1.5-flash; bỏ khoảng trống trang chủ, thêm khối lập phương 3D xoay, thẻ lộ trình, biểu đồ cột động |
| `archive/legacy-v25/upgrade_challenges_v14.py` | Nâng cấp sảnh thử thách v14.0 | `build_100_challenges()` ghi 100 chặng (60 Python + 20 C + 20 C++) vào `js/challenges-50.js` với rank D → S → BOSS; bộ huy hiệu SVG theo ngôn ngữ; thẻ game cắt góc, bộ lọc rank và ô tìm kiếm |
| `archive/legacy-v25/upgrade_vcode_v15_complete.py` | Nâng cấp v15.0 | CSDL đám mây Firestore (`js/cloud-db.js`, `js/firebase-auth.js`); sửa lỗi "Load failed" trên iOS; `init_db.py` không còn tạo lớp mẫu; IDE nhận nhiều đầu vào (`split()`, nhiều dòng) trong `js/ide-engine.js`; AI chỉ trả lời trực tiếp |
| `archive/legacy-v25/upgrade_vcode_v16.py` | Nâng cấp v16.0 | Tạo `js/v16-core.js` và `js/cloud-db.js` v16; IDE hỗ trợ Tab/Shift+Tab, tự thụt lề, nhập `input()` trực tiếp; sửa Scratch Live; giao bài lưu Firestore; trang chủ 3D tối giản kiểu hodl.swiss; sửa đăng nhập Google trên điện thoại, bỏ nút Facebook/GitHub; thay emoji bằng SVG |
| `archive/legacy-v25/upgrade_vcode_v16_fix.py` | Bản vá v16.1 | Thay chính xác `#view-home` (xử lý thẻ lồng nhau) bằng trang chủ Swiss 3D và tắt Three.js cũ; IDE mặc định chỉ có chú thích hướng dẫn; ghi đè `js/scratch-bridge.js`; `ICON_MAP` thay emoji bằng icon SVG nét mảnh |
| `archive/legacy-v25/upgrade_vcode_v17.py` | Nâng cấp v17.0 | Gỡ các thẻ SVG `vc-ico` bị chèn sai vào chuỗi JS/thuộc tính HTML (lỗi "SVG hiện chữ"); thiết kế lại trang chủ phong cách HODL.swiss 3D (`find_and_replace_home_view`); thêm hoạt ảnh chuột vào `js/v16-core.js` |
| `archive/legacy-v25/upgrade_vcode_v18.py` | Đại tu v18.0 | Viết lại `js/scratch-bridge.js` (Scratch 3.0 có khối C lồng nhau + sơ đồ khối SVG); tạo `js/v18-engine.js` (cuộn chia cảnh 3D, hạn nộp kiểu OLM, bảng tổng hợp & chấm điểm); thay toàn bộ trang chủ full màn hình |
| `archive/legacy-v25/upgrade_vcode_polish.py` | Bản vá & hoàn thiện (giữa v18 và v20) | Khôi phục giao diện Scratch thanh mảnh + khung "Kiểm tra lỗi" IDE (`js/scratch-bridge.js`); tạo `js/v19-polish.js` (mở Trang chủ mặc định, lớp học xanh-trắng, giao bài DD/MM/YYYY + giờ, nút Google ở giữa); xóa badge phiên bản và chữ Facebook/GitHub |
| `archive/legacy-v25/upgrade_vcode_v20.py` | Bản hoàn thiện V20 | Tạo `js/v20-final.js` (Sáng/Tối đồng bộ mọi trang); đặt khung kiểm tra lỗi ở nửa dưới cột phải IDE; khôi phục Scratch Live & sơ đồ khối; xóa icon robot AI; mở rộng Phân cảnh 04 thành 6 khung và thêm Phân cảnh 05 (thông tin nhóm, trường) |
| `archive/legacy-v25/upgrade_vcode_v21.py` | Nâng cấp V21 | Ghi lại `js/ide-engine.js` (terminal tương tác kiểu OnlineGDB); tạo `js/v21-upgrade.js`; IDE sáng `#F4F6F9`; thanh menu nhanh luôn tối; menu trái "QUẢN LÍ TÀI KHOẢN"; modal chấm bài đồng nhất; ô hạn nộp tự định dạng DD/MM/YYYY + đồng hồ |
| `archive/legacy-v25/upgrade_vcode_v22.py` | Nâng cấp V22 | Tạo `js/multilang-engine.js` (chạy Python, HTML5/CSS, C, C++, JS, SQL) và `js/v22-pro-ide.js` (nút Xóa code, autocomplete Tab, tô màu kiểu VS Code, nền trang chủ GPU 60fps); kiểm tra lỗi theo từng ngôn ngữ |
| `archive/legacy-v25/upgrade_vcode_v23.py` | Nâng cấp V23 | Tạo `js/v23-fx-caret.js`: gợi ý code bám vị trí con trỏ, hủy tiến trình cũ và xóa terminal khi đổi ngôn ngữ, canvas "mạng mạch dữ liệu", thanh tiến trình cuộn phát sáng, chiều sâu 3D cho bảng logo |
| `archive/legacy-v25/upgrade_vcode_v24.py` | Bản vá V24 | Tạo `js/v24-fix-smooth.js`: sửa lỗi nút chèn code nhanh (+ …) bị ẩn chữ khi bật "Màu code"; tối ưu trang chủ 60–120fps (gom draw call, gỡ transition xung đột) |
| `archive/legacy-v25/fix_time_24h.py` | Bản vá ô chọn giờ (tạo lớp v25) | Ghi `js/v25-time24.js` (ô chọn giờ 24h gọn trong một ô + popup đồng hồ nổi, tự nạp CSS) và gắn tham số `?v=26` chống cache trong `index.html` |
| `archive/legacy-v25/fix_score_10.py` | Bản vá chuyển thang điểm 100 → 10 | Sửa công thức chấm trong `js/ide-engine.js` (`/ 10`); đổi hiển thị `/100` → `/10`, ô nhập `max="10" step="0.25"`, điểm trung bình 1 chữ số thập phân trong `js/v18-engine.js`, `js/v19-polish.js`; cập nhật bảng điểm minh họa trong `index.html` |
| `archive/legacy-v25/fix_courses.py` | Bản vá dữ liệu khóa học | Ghi lại `js/courses-data.js` từ danh sách `COURSES` chuẩn hóa (vd. `course-python` "Python Toàn tập cho Người mới", bài có `difficulty`, `points`, `problem`, `theory`, `starter`, test); vá lỗi null ở IDE tự do trong `js/app.js` |
| `archive/legacy-v25/upgrade_auth_olm_classroom.py` | Nâng cấp xác thực Google/Facebook + lớp học chuẩn OLM + CSDL thật | Ghi lại `backend/models/user.py`, `models/classroom.py`, `models/assessment.py`, `schemas/user_schema.py`, `routers/auth.py`, `routers/classrooms.py`, `routers/assessment.py`, `database/init_db.py`; cập nhật CSS, `js/app.js`, `index.html`/`index_2.html`; khởi tạo lại `vcode_edu.db` |
| `archive/legacy-v25/upgrade_full_database.py` | Hoàn thiện CSDL & API kết nối thật (SQLite/PostgreSQL + FastAPI) | Ghi `backend/database/base.py` (`DeclarativeBase`), `connection.py`, `init_db.py`, `backend/main.py`, `routers/assessment.py`, `routers/classrooms.py`; khởi tạo và nạp dữ liệu vào `vcode_edu.db` |
| `archive/legacy-v25/upgrade_scroll_3d_home.py` | Nâng cấp trang chủ hoạt ảnh 3D theo thanh cuộn | Ghi `js/three-hero.js` (morphing 4 hình khối theo cuộn 60fps), thêm CSS perspective/thanh tiến trình 3D, bố cục 4 phân cảnh trong `index.html` |
| `archive/legacy-v25/sqlite-export.json` | Bản xuất JSON các bảng cũ của `vcode_edu.db` (sinh bởi `backend/scripts/export_legacy_sqlite.py`); chứa dữ liệu cá nhân, bị `.gitignore` chặn | `exported_at`, `source: "vcode_edu.db"`, `note`, `counts{}` (10 bảng), `tables{}` mỗi bảng có `columns`, `excluded_columns`, `rows`; 16 bản ghi; cột `password_hash` của `users` đã bị loại — 49.336 byte |
| `archive/legacy-v25/vcode_edu.backup.db` | Bản sao lưu nhị phân CSDL SQLite cũ; bị `.gitignore` chặn (`archive/**/*.db`) | SQLite format 3, page_size 4096 × 50 trang = 204.800 byte; 10 bảng, 23 chỉ mục; 16 bản ghi |

## PHẦN 3. ĐẶC TẢ CHI TIẾT TẤT CẢ CÁC CHỨC NĂNG & CÁCH HOẠT ĐỘNG

### Cổng AI phía máy chủ (V-Mentor: SSE, đa nhà cung cấp, 7 chế độ)

**1. Mô tả & giao diện**

Backend FastAPI đóng vai trò "cổng AI an toàn": trình duyệt gửi hội thoại tới `POST /api/ai/chat`, máy chủ dựng system prompt tiếng Việt theo chế độ, chọn nhà cung cấp AI (Google Gemini, OpenAI hoặc máy chủ tương thích OpenAI, Anthropic Claude, Ollama cục bộ) và trả lời dạng luồng Server-Sent Events. Khóa API chỉ nằm trong biến môi trường/`.env` của máy chủ. Có 7 chế độ: `tutor` (Gia sư lập trình), `reviewer` (Nhận xét code), `debugger` (Gỡ lỗi), `algorithm` (Giải thích thuật toán), `learning` (Trợ lý học tập), `project` (Trợ lý dự án), `knowledge` (Hỏi đáp kiến thức). Trường `provider` nhận `auto`, `cloud`, `local` hoặc mã cụ thể (`gemini`, `openai`, `anthropic`, `ollama`). Danh sách nhà cung cấp và chế độ được công bố qua `GET /api/ai/providers`. Phía giao diện, trang `#/ai` (frontend, ngoài phạm vi tài liệu này) tiêu thụ API này; kiểm thử `test_ai_chat_shows_clear_error_without_provider` xác nhận giao diện hiển thị lỗi rõ ràng khi máy chủ chưa cấu hình nhà cung cấp.

**2. Các file tham gia**

`backend/routers/ai.py`, `backend/ai/schemas.py`, `backend/ai/prompts.py`, `backend/ai/registry.py`, `backend/ai/service.py`, `backend/ai/providers/base.py`, `backend/ai/providers/gemini.py`, `backend/ai/providers/openai.py`, `backend/ai/providers/anthropic.py`, `backend/ai/providers/ollama.py`, `backend/core/config.py`, `backend/core/errors.py`, `backend/main.py`; kiểm thử: `backend/tests/test_chat.py`, `backend/tests/test_providers.py`, `backend/tests/test_health_and_providers.py`.

**3. Luồng xử lý từng bước**

1. Trình duyệt gửi `POST /api/ai/chat` với JSON `{messages, mode, provider, context}` và (tùy chọn) header `Authorization: Bearer <Firebase ID token>`.
2. FastAPI kiểm tra thân yêu cầu bằng `ChatRequest`: 1–40 tin nhắn, vai trò chỉ `user`/`assistant`, mỗi tin 1–12 000 ký tự và không rỗng, tin cuối phải là `user`, `mode` thuộc 7 giá trị, `provider` khớp `^[a-z0-9_-]+$`, `context` giới hạn độ dài; trường thừa bị bỏ qua. Sai → 422 `bad_request`.
3. Phụ thuộc `get_principal` xác định người dùng (đã đăng nhập) hay khách (xem chức năng Xác thực).
4. `AIService.start_chat` gọi `prepare_messages`: cắt tin cũ nhất khi tổng vượt 60 000 ký tự, bỏ tin đầu không phải `user`, gộp các tin liên tiếp cùng vai trò.
5. `build_system_prompt(mode, context)` ghép `BASE_PROMPT` + `MODE_PROMPTS[mode]` + khối `<ngu_canh>` (code, lỗi, bài học; dấu ```` ``` ```` trong nội dung bị thay để không tự đóng khối).
6. `ProviderRegistry.candidates(provider)` kiểm tra đồng thời trạng thái sẵn sàng của các nhà cung cấp; mã lạ → 400, không có ứng viên → 503 `no_provider` kèm hướng dẫn cấu hình.
7. Kiểm tra hạn mức ngày và giới hạn theo phút (xem chức năng Giới hạn lượt dùng AI); vượt → 429.
8. Với từng ứng viên theo thứ tự: tạo `ProviderRun` (task riêng có `asyncio.timeout(ai_total_timeout)`), chờ mục đầu tiên. Nếu lỗi trước mẩu đầu tiên → ghi log, chuyển sang nhà cung cấp kế tiếp.
9. Khi có mẩu đầu tiên: tăng bộ đếm ngày (`DailyQuota.increment`), trả `StreamingResponse` kiểu `text/event-stream; charset=utf-8` với header `Cache-Control: no-cache`, `X-Accel-Buffering: no`.
10. `_stream` phát lần lượt: `event: meta` (provider, model, mode, request_id 12 ký tự) → nhiều `event: delta` (`{"text": …}`) → `event: done` (`finish_reason`, `usage`, `remaining`). Nếu nhà cung cấp lỗi sau khi đã phát → `event: error` (không chuyển nhà cung cấp nữa).
11. Nếu mọi ứng viên đều lỗi trước khi phát: hoàn lại suất theo phút (`limiter.release`) và trả JSON 503 (`timeout` nếu tất cả đều quá thời gian, ngược lại `provider_error`); không tính lượt.
12. Khi client ngắt kết nối hoặc luồng kết thúc, khối `finally` hủy task (`run.cancel()`) và ghi log kết quả (không ghi nội dung tin nhắn).

**4. Hàm/lớp/API cốt lõi**

- API: `GET /api/ai/providers` (`list_providers`), `POST /api/ai/chat` (`chat`).
- `ChatRequest`, `ChatMessage`, `ChatContext`, `prepare_messages()` (`backend/ai/schemas.py`).
- `MODES`, `MODE_IDS`, `BASE_PROMPT`, `MODE_PROMPTS`, `build_context_block()`, `build_system_prompt()` (`backend/ai/prompts.py`).
- `ProviderRegistry.from_settings()`, `.describe()`, `.candidates()` (`backend/ai/registry.py`).
- `AIService.start_chat()`, `AIService._stream()`, `ProviderRun`, `sse_event()` (`backend/ai/service.py`).
- `Provider`, `Chunk`, `ProviderRequest`, `ProviderError`, `HttpClientHolder`, `ensure_ok()`, `iter_sse()`, `iter_ndjson()` (`backend/ai/providers/base.py`).
- `GeminiProvider`, `OpenAIProvider`, `AnthropicProvider`, `OllamaProvider`.

**5. Trích đoạn code quan trọng**

Tệp `backend/ai/service.py` — vòng thử lần lượt nhà cung cấp, chỉ tính lượt khi đã có mẩu đầu tiên:

```python
        for provider in candidates:
            run = ProviderRun(provider, provider_request, self.settings.ai_total_timeout)
            first = await run.next()
            if first[0] == "error":
                errors.append(first[1])
                log.warning("AI provider %s failed before first token (req=%s): %s", provider.id, request_id, first[1].message)
                continue
            new_used = await run_in_threadpool(self.quota.increment, subject)
            remaining = max(0, limit - new_used)
            log.info("AI chat started req=%s provider=%s mode=%s subject=%s", request_id, provider.id, payload.mode, principal.kind)
            meta = {"provider": provider.id, "model": provider.model, "mode": payload.mode, "request_id": request_id}
            return StreamingResponse(
                self._stream(run, first, meta, remaining, started_at),
                media_type="text/event-stream; charset=utf-8",
                headers=SSE_HEADERS,
            )
```

Cơ chế dự phòng chỉ áp dụng khi nhà cung cấp lỗi trước mẩu dữ liệu đầu tiên; ngay khi có dữ liệu, máy chủ tăng bộ đếm ngày rồi mở luồng SSE với sự kiện `meta` chứa nhà cung cấp thực tế được dùng.

Tệp `backend/ai/registry.py` — chọn ứng viên theo yêu cầu `provider`:

```python
    async def candidates(self, preference: str) -> list[Provider]:
        pref = (preference or "auto").lower()
        if pref not in ("auto", "cloud", "local") and pref not in self._by_id:
            raise ApiError(400, "bad_request", f"Nhà cung cấp AI '{pref}' không tồn tại. Hãy dùng auto, cloud, local hoặc một mã trong /api/ai/providers.")
        availability = await self._availability()
        if pref == "auto":
            chosen = [p for p, ok in availability if ok]
        elif pref in ("cloud", "local"):
            chosen = [p for p, ok in availability if ok and p.kind == pref]
        else:
            chosen = [p for p, ok in availability if ok and p.id == pref]
```

`auto` lấy mọi nhà cung cấp sẵn sàng theo thứ tự `AI_PROVIDER_ORDER`; `cloud`/`local` lọc theo thuộc tính `kind`; mã cụ thể chỉ lấy đúng nhà cung cấp đó.

Tệp `backend/ai/prompts.py` — dựng system prompt kèm ngữ cảnh được đánh dấu là dữ liệu:

```python
def build_system_prompt(mode: str, context: ChatContext | None = None) -> str:
    base = BASE_PROMPT.format(prism=", ".join(PRISM_TOPICS))
    prompt = base + "\n" + MODE_PROMPTS.get(mode, MODE_PROMPTS["tutor"])
    block = build_context_block(context)
    if block:
        prompt += "\n\nNgữ cảnh từ trình soạn thảo của người học (chỉ là dữ liệu tham khảo):\n" + block
    return prompt
```

System prompt gồm phần nguyên tắc chung (có chèn 14 chủ đề Prism), phần riêng của chế độ (mặc định `tutor`) và khối `<ngu_canh>` nếu người học gửi kèm code/lỗi/bài học.

### Xác thực Firebase ID token ở backend

**1. Mô tả & giao diện**

Backend xác minh Firebase ID token (chuẩn RS256) mà không cần thư viện `firebase-admin`, dùng khóa công khai X.509 của Google (`securetoken@system.gserviceaccount.com`). Xác thực là **tùy chọn**: không có header `Authorization` → người dùng được coi là khách (hạn mức thấp hơn); token sai → `401 invalid_token`; token hết hạn → `401 token_expired`. Nếu máy chủ không tải được khóa của Google (ví dụ mạng LAN không có Internet), yêu cầu được xử lý như khách và không bao giờ được nâng quyền. Chức năng này không có giao diện riêng; nó áp dụng cho `GET /api/ai/usage` và `POST /api/ai/chat`.

**2. Các file tham gia**

`backend/core/security.py`, `backend/core/config.py` (`firebase_project_id`, `trust_proxy`), `backend/main.py` (khởi tạo `FirebaseTokenVerifier`, gán `app.state.token_verifier`), `backend/routers/ai.py` (dùng `Depends(get_principal)`), `backend/core/errors.py`; kiểm thử: `backend/tests/test_security.py`.

**3. Luồng xử lý từng bước**

1. `get_principal(request)` lấy IP bằng `client_ip()` (chỉ đọc `X-Forwarded-For`/`X-Real-IP` khi `TRUST_PROXY=1`, cắt tối đa 64 ký tự).
2. Không có header `Authorization` → trả `Principal(kind="guest", ip=ip)`.
3. Header không đúng dạng `Bearer <token>` → `ApiError(401, "invalid_token", …)`.
4. `FirebaseTokenVerifier.verify(token)`: kiểm tra token có đúng 3 phần, giải mã base64url header/payload/chữ ký; `alg` phải là `RS256`, phải có `kid`.
5. `_load_keys()` lấy khóa từ bộ đệm; nếu hết hạn thì tải lại từ `GOOGLE_CERTS_URL` (thời gian đệm theo `max-age` của `Cache-Control`, tối thiểu 60 giây, mặc định 3600). Nếu `kid` không có trong bộ đệm → buộc tải lại một lần (Google xoay khóa). Nếu tải lỗi mà đã có bản đệm cũ → dùng bản cũ; chưa có bản nào → ném `CertsUnavailable`.
6. Xác minh chữ ký RSA PKCS#1 v1.5 + SHA-256 trên chuỗi `header.payload`.
7. Kiểm tra claim: `aud == project_id`, `iss == https://securetoken.google.com/<project_id>`, `exp`, `iat`, `auth_time` hợp lệ với độ lệch đồng hồ 60 giây, `sub` là chuỗi không rỗng ≤128 ký tự.
8. Thành công → `Principal(kind="user", uid=claims["sub"], email=claims.get("email"))`; `TokenError` → 401 với mã `invalid_token` hoặc `token_expired`; `CertsUnavailable` → `Principal(kind="guest", verified=False)` và ghi cảnh báo.
9. Thuộc tính `Principal.subject` trả `user:<uid>` hoặc `ip:<địa chỉ>` — khóa dùng cho hạn mức.

**4. Hàm/lớp/API cốt lõi**

`FirebaseTokenVerifier` (`_load_keys`, `verify`), `fetch_google_certs()`, `_parse_max_age()`, `_b64url_decode()`, `TokenError`, `CertsUnavailable`, `Principal` (`subject`), `client_ip()`, `get_principal()`; hằng `GOOGLE_CERTS_URL`, `CLOCK_SKEW_SECONDS = 60`, `DEFAULT_CERT_MAX_AGE = 3600`.

**5. Trích đoạn code quan trọng**

Tệp `backend/core/security.py` — kiểm tra chữ ký và các claim bắt buộc:

```python
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        try:
            key.verify(signature, signing_input, padding.PKCS1v15(), hashes.SHA256())
        except InvalidSignature as exc:
            raise TokenError("Chữ ký token không hợp lệ.") from exc

        now = self._clock()
        expected_iss = f"https://securetoken.google.com/{self.project_id}"
        if claims.get("aud") != self.project_id:
            raise TokenError("Token không dành cho dự án này (aud).")
        if claims.get("iss") != expected_iss:
            raise TokenError("Nguồn phát hành token không hợp lệ (iss).")
        exp = claims.get("exp")
        iat = claims.get("iat")
        auth_time = claims.get("auth_time")
        if not isinstance(exp, (int, float)) or exp + CLOCK_SKEW_SECONDS <= now:
            raise TokenError("Phiên đăng nhập đã hết hạn, vui lòng làm mới token.", code="token_expired")
```

Chữ ký được xác minh bằng khóa công khai tương ứng `kid`, sau đó kiểm tra `aud`/`iss` theo mã dự án Firebase và hạn dùng có tính độ lệch đồng hồ; token hết hạn có mã lỗi riêng `token_expired` để frontend biết cần làm mới token.

Tệp `backend/core/security.py` — phụ thuộc xác thực tùy chọn:

```python
    verifier: FirebaseTokenVerifier = request.app.state.token_verifier
    try:
        claims = await verifier.verify(token.strip())
    except TokenError as exc:
        raise ApiError(401, exc.code, str(exc)) from exc
    except CertsUnavailable:
        # Máy chủ không truy cập được Google (ví dụ: mạng LAN offline) → coi như khách, không nâng quyền.
        log.warning("Không tải được khóa Firebase; xử lý yêu cầu như khách.")
        return Principal(kind="guest", ip=ip, verified=False)
    return Principal(kind="user", ip=ip, uid=claims["sub"], email=claims.get("email"))
```

Token sai luôn bị từ chối bằng 401; riêng trường hợp không tải được khóa Google thì yêu cầu vẫn được phục vụ nhưng với quyền khách, bảo đảm không ai được nâng quyền khi không xác minh được.

### Giới hạn lượt dùng AI (theo phút và theo ngày)

**1. Mô tả & giao diện**

Mỗi chủ thể (người dùng theo Firebase uid hoặc khách theo IP) bị giới hạn hai lớp: (a) số câu hỏi mỗi phút, cửa sổ trượt trong bộ nhớ tiến trình (mặc định 12); (b) hạn mức theo ngày UTC lưu trong bảng `ai_usage` của CSDL (mặc định 200 cho người dùng, 30 cho khách; `0` = chặn khách). Một yêu cầu chỉ bị tính khi nhà cung cấp AI thực sự bắt đầu trả lời. Vượt giới hạn → `429 rate_limited` kèm header `Retry-After`. `GET /api/ai/usage` trả `{limit, used, remaining, subject, reset_at}` để giao diện hiển thị số lượt còn lại; sự kiện `done` của luồng SSE cũng có trường `remaining`.

**2. Các file tham gia**

`backend/core/ratelimit.py`, `backend/models/ai_usage.py`, `backend/database/migrations.py`, `backend/database/connection.py`, `backend/ai/service.py` (`daily_limit`, `usage`, `start_chat`), `backend/routers/ai.py` (`/usage`), `backend/core/security.py` (`Principal.subject`), `backend/core/config.py`; kiểm thử: `backend/tests/test_ratelimit.py`, một phần `test_chat.py`, `test_security.py`.

**3. Luồng xử lý từng bước**

1. `AIService.daily_limit(principal)` chọn `ai_daily_limit_user` hoặc `ai_daily_limit_guest`.
2. `DailyQuota.used(subject)` đọc `count` trong `ai_usage` theo `day = utc_day()` và `subject` (chạy trong threadpool).
3. Nếu `used >= limit` → 429 với thông điệp tiếng Việt (khách được gợi ý đăng nhập), header `Retry-After` = số giây tới 0 giờ UTC, kèm `remaining=0`, `reset_at`.
4. `MinuteRateLimiter.acquire(subject)` loại các mốc cũ hơn 60 giây; nếu đã đủ `limit` mốc → trả `(False, retry)` → 429 kèm `retry_after`; ngược lại ghi mốc hiện tại.
5. Khi nhà cung cấp đầu tiên trả mẩu dữ liệu: `DailyQuota.increment(subject)` thực hiện `UPDATE … SET count = count + 1`; nếu chưa có dòng thì `INSERT` (ràng buộc duy nhất `day, subject`), gặp `IntegrityError` do tiến trình khác chèn trước thì thử lại (tối đa 3 lần).
6. Nếu không nhà cung cấp nào bắt đầu trả lời → `MinuteRateLimiter.release(subject)` hoàn lại suất vừa giữ, không tăng bộ đếm ngày.
7. `GET /api/ai/usage` tính `remaining = max(0, limit - used)` và `reset_at = next_reset_iso()` (dạng `YYYY-MM-DDT00:00:00Z`).

**4. Hàm/lớp/API cốt lõi**

`MinuteRateLimiter` (`acquire`, `release`, `_prune`), `DailyQuota` (`used`, `increment`), `utc_day()`, `next_reset_iso()`, mô hình `AIUsage`, `AIService.daily_limit()`, `AIService.usage()`, `AIService._seconds_until_reset()`, API `GET /api/ai/usage`.

**5. Trích đoạn code quan trọng**

Tệp `backend/core/ratelimit.py` — cửa sổ trượt theo phút:

```python
    def acquire(self, subject: str) -> tuple[bool, int]:
        """Giữ chỗ một yêu cầu. Trả về (thành công, số giây nên chờ nếu thất bại)."""
        with self._lock:
            now = self._clock()
            hits = self._prune(subject, now)
            if len(hits) >= self.limit:
                retry = max(1, int(self.window - (now - hits[0])) + 1)
                return False, retry
            hits.append(now)
            return True, 0
```

Mỗi chủ thể có một hàng đợi mốc thời gian; khi đầy, số giây cần chờ được tính từ mốc cũ nhất trong cửa sổ 60 giây. Cấu trúc này nằm trong bộ nhớ nên mỗi worker có bộ đếm riêng.

Tệp `backend/core/ratelimit.py` — tăng hạn mức ngày an toàn khi có nhiều tiến trình:

```python
    def increment(self, subject: str, day: str | None = None) -> int:
        day = day or utc_day()
        for _ in range(3):
            with self.db.session() as s:
                result = s.execute(
                    update(AIUsage)
                    .where(AIUsage.day == day, AIUsage.subject == subject)
                    .values(count=AIUsage.count + 1, updated_at=datetime.now(timezone.utc).replace(tzinfo=None))
                )
                if result.rowcount:
                    s.commit()
                    return self.used(subject, day)
                try:
                    s.add(AIUsage(day=day, subject=subject, count=1))
                    s.commit()
                    return 1
                except IntegrityError:
                    s.rollback()  # tiến trình khác vừa chèn cùng khóa → thử lại bằng UPDATE
        return self.used(subject, day)
```

Bộ đếm ngày được lưu bền trong CSDL nên dùng chung cho nhiều worker và không mất khi khởi động lại; ràng buộc duy nhất `(day, subject)` cộng vòng thử lại xử lý tranh chấp khi hai tiến trình cùng chèn.

### Phục vụ frontend tĩnh theo danh sách trắng

**1. Mô tả & giao diện**

Khi `SERVE_FRONTEND=1` (mặc định), một lệnh `uvicorn backend.main:app` phục vụ cả API lẫn giao diện tại `http://localhost:8000`. Chỉ các đường dẫn sau được phục vụ: `/`, `/index.html`, `/manifest.json`, `/sw.js` và các thư mục `css/`, `js/`, `data/`, `assets/`, `vendor/`, `docs/`. Mọi thứ khác (`vcode_edu.db`, `.env`, `backend/`, `archive/`, `.venv/`, `.git/`, `tools/`, `tests/`, `README.md`, tệp/thư mục ẩn, đường dẫn chứa `..`) đều trả 404. MIME được ép đúng chuẩn để tránh lỗi ES modules trên Windows.

**2. Các file tham gia**

`backend/static.py`, `backend/main.py`, `backend/core/config.py` (`serve_frontend`, `frontend_dir`); kiểm thử: `backend/tests/test_static.py`.

**3. Luồng xử lý từng bước**

1. `create_app` gọi `mount_frontend(app, settings.frontend_dir)` sau khi đã gắn router API (nên `/api/...` luôn được ưu tiên).
2. `register_mime_types()` thêm ánh xạ `_MIME_OVERRIDES` vào `mimetypes`.
3. Bốn route `GET /`, `/index.html`, `/manifest.json`, `/sw.js` trả `FileResponse` với `Cache-Control: no-cache`; riêng `sw.js` thêm `Service-Worker-Allowed: /`; tệp không tồn tại → JSON 404.
4. Mỗi thư mục trong `STATIC_DIRS` được mount bằng `SafeStaticFiles(check_dir=False)`.
5. `SafeStaticFiles.check_config()` trả 404 nếu thư mục chưa tồn tại (thay vì lỗi 500); `get_response()` tách đường dẫn theo `/` và từ chối mọi đoạn bắt đầu bằng `.` (chặn tệp ẩn và `..`).
6. Đường dẫn không khớp route/mount nào → 404 mặc định của FastAPI.

**4. Hàm/lớp/API cốt lõi**

`STATIC_DIRS`, `_MIME_OVERRIDES`, `register_mime_types()`, `SafeStaticFiles` (`check_config`, `get_response`), `_not_found()`, `mount_frontend()` với các hàm route `index_root`, `index_html`, `manifest`, `service_worker`.

**5. Trích đoạn code quan trọng**

Tệp `backend/static.py` — lớp StaticFiles an toàn:

```python
class SafeStaticFiles(StaticFiles):
    """StaticFiles từ chối mọi đoạn đường dẫn bắt đầu bằng dấu chấm (tệp/thư mục ẩn).

    Thư mục chưa tồn tại → 404 (và kiểm tra lại ở yêu cầu sau) thay vì lỗi 500.
    """

    async def check_config(self) -> None:
        if self.directory is not None and not os.path.isdir(self.directory):
            raise StarletteHTTPException(status_code=404)
        await super().check_config()

    async def get_response(self, path: str, scope):  # noqa: ANN001
        parts = [p for p in path.replace("\\", "/").split("/") if p]
        if any(p.startswith(".") for p in parts):
            raise StarletteHTTPException(status_code=404)
        return await super().get_response(path, scope)
```

Mọi đoạn đường dẫn bắt đầu bằng dấu chấm (bao gồm `.env`, `.git`, `..`) đều bị trả 404 trước khi Starlette tìm tệp, bổ sung cho cơ chế danh sách trắng thư mục.

Tệp `backend/static.py` — danh sách trắng các tệp gốc và thư mục:

```python
    @app.get("/sw.js", include_in_schema=False)
    async def service_worker():
        return _file("sw.js", "text/javascript; charset=utf-8", {"Service-Worker-Allowed": "/"})

    for directory in STATIC_DIRS:
        app.mount(f"/{directory}", SafeStaticFiles(directory=root / directory, check_dir=False), name=f"static-{directory}")
```

Service Worker được phục vụ với MIME JavaScript và header cho phép phạm vi `/`; ngoài ra chỉ 6 thư mục trong `STATIC_DIRS` được mount, nên các thư mục như `backend/` hay `archive/` không bao giờ lộ ra ngoài.

### Health check & tài liệu API (OpenAPI)

**1. Mô tả & giao diện**

`GET /api/health` cho biết dịch vụ đang chạy, phiên bản (`APP_VERSION = "6.0.0"`), thời gian UTC và trạng thái sẵn sàng của từng nhà cung cấp AI. Tài liệu API tương tác (Swagger UI) nằm ở `/api/docs`, lược đồ OpenAPI ở `/api/openapi.json`; ReDoc bị tắt (`redoc_url=None`). Các route phục vụ tệp tĩnh được ẩn khỏi lược đồ (`include_in_schema=False`).

**2. Các file tham gia**

`backend/routers/health.py`, `backend/main.py`, `backend/ai/registry.py` (`describe`), `backend/core/config.py` (`APP_VERSION`); kiểm thử: `backend/tests/test_health_and_providers.py`, `backend/tests/test_static.py` (`test_api_takes_precedence_and_docs_moved`).

**3. Luồng xử lý từng bước**

1. Client gọi `GET /api/health` (không cần xác thực).
2. `health()` gọi `registry.describe()` — kiểm tra đồng thời `is_available()` của mọi nhà cung cấp (Ollama thực sự gọi `GET /api/tags` với thời gian chờ 1,5 giây và lưu kết quả 30 giây; nhà cung cấp đám mây chỉ kiểm tra có khóa API).
3. Trả JSON `{status: "ok", service: "V-Code Edu API", version, time, ai: {providers: [{id, kind, available}]}}`.
4. FastAPI tự sinh tài liệu tại `/api/docs` và `/api/openapi.json` từ khai báo router (tag "Hệ thống", "Trợ lý AI V-Mentor").

**4. Hàm/lớp/API cốt lõi**

`health(request)`, `ProviderRegistry.describe()`, cấu hình `FastAPI(docs_url="/api/docs", redoc_url=None, openapi_url="/api/openapi.json")`.

**5. Trích đoạn code quan trọng**

Tệp `backend/routers/health.py`:

```python
@router.get("/health")
async def health(request: Request) -> dict:
    registry = request.app.state.registry
    providers = await registry.describe()
    return {
        "status": "ok",
        "service": "V-Code Edu API",
        "version": request.app.state.settings.app_version,
        "time": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "ai": {"providers": [{"id": p["id"], "kind": p["kind"], "available": p["available"]} for p in providers]},
    }
```

Endpoint chỉ công bố mã, loại và trạng thái sẵn sàng của nhà cung cấp, không lộ khóa API hay tên mô hình; thời gian trả về theo chuẩn ISO 8601 với hậu tố `Z`.

Tệp `backend/main.py` — vị trí tài liệu API:

```python
    app = FastAPI(
        title="V-Code Edu API",
        description="Cổng AI giáo dục (V-Mentor) và máy chủ frontend của nền tảng V-Code Edu.",
        version=settings.app_version,
        lifespan=lifespan,
        docs_url="/api/docs",
        redoc_url=None,
        openapi_url="/api/openapi.json",
    )
```

Tài liệu được chuyển vào tiền tố `/api` để không xung đột với các đường dẫn frontend, đồng thời không bị Service Worker lưu đệm (mọi đường dẫn `/api/*` là network-only).

### Lớp bảo vệ HTTP: CORS, header bảo mật và định dạng lỗi thống nhất

**1. Mô tả & giao diện**

Mọi phản hồi được gắn header bảo mật (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`) bằng middleware ASGI thuần để không cản luồng SSE; chủ ý không đặt COOP/COEP vì sẽ làm hỏng đăng nhập Google bằng popup của Firebase. CORS chỉ cho phép các origin trong `ALLOWED_ORIGINS`, không gửi cookie. Mọi lỗi API trả dạng `{"detail": {"code": "...", "message": "..."}}` với thông điệp tiếng Việt.

**2. Các file tham gia**

`backend/core/middleware.py`, `backend/core/errors.py`, `backend/core/logging.py`, `backend/core/config.py`, `backend/main.py`; kiểm thử: `test_security_headers_and_cors`, `test_validation_errors_are_422_with_code`.

**3. Luồng xử lý từng bước**

1. `create_app` gọi `install_error_handlers(app)`, rồi thêm `CORSMiddleware` và `SecurityHeadersMiddleware`.
2. Yêu cầu preflight `OPTIONS` từ origin hợp lệ nhận `access-control-allow-origin`; origin lạ không nhận header này.
3. Khi phản hồi bắt đầu (`http.response.start`), middleware thêm các header bảo mật chưa có.
4. `ApiError` → JSON với mã trạng thái, `code`, `message` và trường bổ sung (`remaining`, `reset_at`, `retry_after`…), kèm header (ví dụ `Retry-After`).
5. `RequestValidationError` → 422 `bad_request` với danh sách tối đa 20 lỗi `{field, message, type}`.
6. Ngoại lệ không lường trước → ghi log và trả 500 `internal_error` với thông điệp chung (không lộ chi tiết).

**4. Hàm/lớp/API cốt lõi**

`SecurityHeadersMiddleware`, `SECURITY_HEADERS`, `ApiError.to_response()`, `_simplify_validation_errors()`, `install_error_handlers()`, `configure_logging()`, `CORSMiddleware(allow_origins=…, allow_credentials=False, allow_methods=["GET","POST","OPTIONS"], allow_headers=["Authorization","Content-Type"], expose_headers=["Retry-After"], max_age=600)`.

**5. Trích đoạn code quan trọng**

Tệp `backend/core/middleware.py`:

```python
class SecurityHeadersMiddleware:
    def __init__(self, app):  # noqa: ANN001
        self.app = app

    async def __call__(self, scope, receive, send):  # noqa: ANN001
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def send_wrapper(message):  # noqa: ANN001
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                existing = {name.lower() for name, _ in headers}
                for name, value in SECURITY_HEADERS:
                    if name not in existing:
                        headers.append((name, value))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_wrapper)
```

Middleware chỉ can thiệp vào thông điệp bắt đầu phản hồi, không đọc hay đệm thân phản hồi, nên luồng SSE vẫn được đẩy tới client ngay lập tức.

Tệp `backend/core/errors.py`:

```python
class ApiError(Exception):
    def __init__(self, status_code: int, code: str, message: str, *, headers: dict | None = None, **extra):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = headers or {}
        self.extra = extra

    def to_response(self) -> JSONResponse:
        detail = {"code": self.code, "message": self.message, **self.extra}
        return JSONResponse(status_code=self.status_code, content={"detail": detail}, headers=self.headers)
```

Mọi lỗi nghiệp vụ dùng chung một lớp, cho frontend một định dạng duy nhất để hiển thị thông báo và xử lý theo `code`.

### Cơ sở dữ liệu, migration an toàn và xuất dữ liệu cũ

**1. Mô tả & giao diện**

Backend dùng SQLAlchemy với SQLite mặc định (`vcode_edu.db` ở thư mục gốc), có thể chuyển sang MySQL/PostgreSQL qua `DATABASE_URL`. Bộ migration có đánh số phiên bản (bảng `schema_meta`) chỉ **thêm** bảng mới (`ai_usage`) và không bao giờ sửa/xóa 10 bảng cũ của phiên bản v25. Script dòng lệnh `python -m backend.scripts.export_legacy_sqlite` xuất dữ liệu bảng cũ ra JSON sau khi loại bỏ các cột bí mật.

**2. Các file tham gia**

`backend/database/connection.py`, `backend/database/base.py`, `backend/database/migrations.py`, `backend/models/ai_usage.py`, `backend/scripts/export_legacy_sqlite.py`, `backend/main.py` (`lifespan`), `vcode_edu.db`; kiểm thử: `backend/tests/test_legacy_db.py`, `backend/tests/test_export_script.py`.

**3. Luồng xử lý từng bước**

1. `Database(settings.database_url)` chuẩn hóa URL và tạo engine; với SQLite bật `PRAGMA foreign_keys=ON` và `journal_mode=WAL` (trừ CSDL trong bộ nhớ).
2. Khi ứng dụng khởi động, `lifespan` gọi `run_migrations(database.engine)` trong một giao dịch.
3. `get_schema_version` tạo bảng `schema_meta` nếu chưa có và đọc `schema_version` (mặc định 0).
4. Với mỗi migration có số lớn hơn phiên bản hiện tại: chạy hàm (`_m001_ai_usage` tạo bảng `ai_usage` với `checkfirst=True`), rồi `_set_version` ghi `schema_version` và `migrated_at`.
5. Khi tắt ứng dụng: đóng HTTP client của registry và `database.dispose()`.
6. Script xuất: mở CSDL chế độ chỉ đọc (`mode=ro`), nếu lỗi thì sao chép sang thư mục tạm (kèm `-wal`); với từng bảng cũ có mặt, lấy danh sách cột, loại cột khớp regex `password|secret|token|api_?key|salt`, đọc toàn bộ dòng, ghi JSON (`exported_at`, `source`, `note`, `counts`, `tables`) và xóa thư mục tạm.

**4. Hàm/lớp/API cốt lõi**

`normalize_database_url()`, `create_db_engine()`, `Database.session()`, `get_db()`, `Base`, `AIUsage`, `schema_meta`, `MIGRATIONS`, `LATEST_VERSION`, `LEGACY_TABLES`, `get_schema_version()`, `_set_version()`, `run_migrations()`, `export_legacy()`, `_connect_readonly()`, `SECRET_COLUMN`.

**5. Trích đoạn code quan trọng**

Tệp `backend/database/migrations.py`:

```python
def run_migrations(engine: Engine) -> int:
    """Áp dụng các migration còn thiếu. Trả về phiên bản lược đồ sau khi chạy."""
    with engine.begin() as conn:
        current = get_schema_version(conn)
        for version, description, migrate in MIGRATIONS:
            if version <= current:
                continue
            log.info("Áp dụng migration %s: %s", version, description)
            migrate(conn)
            _set_version(conn, version)
            current = version
    return current
```

Migration chạy trong một giao dịch và bỏ qua các phiên bản đã áp dụng nên có tính lũy đẳng (kiểm thử `test_migrations_are_idempotent` xác nhận chạy hai lần vẫn cho cùng phiên bản).

Tệp `backend/scripts/export_legacy_sqlite.py`:

```python
        for table in LEGACY_TABLES:
            if table not in existing:
                continue
            columns = [r[1] for r in con.execute(f'PRAGMA table_info("{table}")')]
            kept = [c for c in columns if not SECRET_COLUMN.search(c)]
            excluded = [c for c in columns if c not in kept]
            col_sql = ", ".join(f'"{c}"' for c in kept)
            rows = [dict(r) for r in con.execute(f'SELECT {col_sql} FROM "{table}" ORDER BY rowid')]
            tables[table] = {"columns": kept, "excluded_columns": excluded, "rows": rows}
            counts[table] = len(rows)
```

Các cột như `password_hash` không bao giờ được SELECT nên không thể lọt vào tệp xuất; tên cột bị loại được ghi lại trong `excluded_columns` để minh bạch.

### Service Worker, PWA và chế độ ngoại tuyến

**1. Mô tả & giao diện**

Ứng dụng là PWA cài đặt được (manifest `display: standalone`, 3 icon, 3 lối tắt "Học tiếp", "IDE", "Trợ lý AI"). Service Worker `sw.js` (phiên bản `v3.1.0`) lưu đệm vỏ ứng dụng và toàn bộ module JS/CSS, dữ liệu khóa học, thử thách, runtime `vendor/` (JSCPP, sql.js) ngay khi cài đặt, nên sau lần truy cập đầu tiên ứng dụng chạy được khi mất mạng. Thanh trên cùng có viên trạng thái kết nối (`data-net-pill`, chữ "Online"); footer có liên kết "Chế độ ngoại tuyến" (`#/account?tab=offline`). README ghi chú Service Worker chỉ hoạt động trên `localhost` hoặc HTTPS.

**2. Các file tham gia**

`sw.js`, `manifest.json`, `index.html`, `backend/static.py` (phục vụ `sw.js` với `Service-Worker-Allowed: /`), `firebase.json` (header `no-cache` cho `/sw.js`), `tools/update_sw_precache.py`; việc đăng ký Service Worker nằm ở frontend `js/` (ngoài phạm vi tài liệu này — không xác định từ các tệp đã đọc); kiểm thử: `test_offline_after_first_visit` trong `tests/e2e/test_app.py`, `test_service_worker_headers` trong `backend/tests/test_static.py`.

**3. Luồng xử lý từng bước**

1. Sự kiện `install`: mở cache `vcode-shell-v3.1.0`, thêm từng URL trong `SHELL` với `cache: 'reload'` (một tệp lỗi chỉ bị bỏ qua, không làm hỏng cài đặt); đọc `data/courses/index.json` để thêm mọi tệp `data/courses/<id>.json`; gọi `skipWaiting()`.
2. Sự kiện `activate`: xóa mọi cache có tiền tố `vcode-` không thuộc tập giữ lại (`SHELL_CACHE`, `ASSET_CACHE`, `RUNTIME_CACHE`), rồi `clients.claim()`.
3. Sự kiện `fetch` chỉ xử lý yêu cầu `GET`; bỏ qua (network-only) `/api/*`, các host `*googleapis.com` (trừ `fonts.googleapis.com`), `firebaseio.com`, `identitytoolkit`, `securetoken` và giao thức không phải http.
4. Điều hướng trang (`mode === 'navigate'`): network-first, lưu bản mới vào `./index.html`; mất mạng → trả `index.html`/`./` đã đệm hoặc trang "Đang ngoại tuyến".
5. Tài nguyên cùng origin: stale-while-revalidate (đường dẫn chứa `/data/` vào `ASSET_CACHE`, còn lại vào `SHELL_CACHE`), dùng `ignoreVary: true` để khớp bản precache dù có header `Vary: Origin`.
6. Host thư viện bên ngoài trong `RUNTIME_HOSTS` (jsdelivr, cdnjs, Google Fonts, `www.gstatic.com/firebasejs/`, `esm.run`): cache-first vào `vcode-runtime-v1`; chấp nhận phản hồi opaque chỉ khi `request.destination === 'script'`.
7. Sự kiện `message` với dữ liệu `'skip-waiting'` kích hoạt ngay bản Service Worker mới.
8. Khi thêm tệp JS/CSS mới, nhà phát triển chạy `tools/update_sw_precache.py <phiên-bản>` để sinh lại danh sách `SHELL` và tăng `VERSION`.

**4. Hàm/lớp/API cốt lõi**

Hằng `VERSION`, `SHELL_CACHE`, `ASSET_CACHE`, `RUNTIME_CACHE`, `SHELL`, `RUNTIME_HOSTS`; hàm `staleWhileRevalidate()`, `cacheFirst()`, `networkFirstNavigation()`; trình xử lý `install`, `activate`, `fetch`, `message`; manifest (`start_url`, `scope`, `icons`, `shortcuts`).

**5. Trích đoạn code quan trọng**

Tệp `sw.js` — định tuyến yêu cầu theo chiến lược:

```javascript
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache API calls, auth/firestore channels or browser extensions.
  if (url.pathname.startsWith('/api/')) return;
  if (/googleapis\.com$/.test(url.hostname) && url.hostname !== 'fonts.googleapis.com') return;
  if (url.hostname.endsWith('firebaseio.com') || url.hostname.includes('identitytoolkit') || url.hostname.includes('securetoken')) return;
  if (!url.protocol.startsWith('http')) return;

  if (request.mode === 'navigate') { event.respondWith(networkFirstNavigation(request)); return; }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, url.pathname.startsWith('/data/') || url.pathname.includes('/data/') ? ASSET_CACHE : SHELL_CACHE));
    return;
  }
```

API AI, kênh xác thực và Firestore không bao giờ bị lưu đệm (tránh lộ dữ liệu cá nhân hoặc trả kết quả cũ); điều hướng ưu tiên mạng, còn tài nguyên tĩnh trả ngay từ cache và cập nhật nền.

Tệp `sw.js` — cài đặt bền vững với tệp thiếu:

```javascript
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Add individually so one missing file doesn't abort the whole install.
    await Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch((err) => console.warn('[sw] precache skip', url, err?.message))));
    // Course files are discovered from the catalog.
    try {
      const idx = await (await fetch('./data/courses/index.json', { cache: 'reload' })).json();
      await Promise.all((idx.courses || []).map((c) => cache.add(`./data/courses/${c.id}.json`).catch(() => {})));
    } catch { /* offline install */ }
  })());
  self.skipWaiting();
});
```

Mỗi tệp được thêm riêng lẻ nên một tệp lỗi không làm hỏng cả quá trình cài đặt; danh sách khóa học được phát hiện động từ danh mục `index.json`.

### Luật bảo mật Firestore

**1. Mô tả & giao diện**

Dữ liệu người dùng, bảng xếp hạng và lớp học nằm trên Cloud Firestore (dự án `v-code-edu`); `firestore.rules` là lớp bảo vệ phía máy chủ Firebase. Khóa tài liệu người dùng là email viết thường (giống dữ liệu cũ). Luật bao gồm: hồ sơ chỉ chủ sở hữu đọc/ghi, vai trò chọn một lần (không tự gán `admin`), di trú tài khoản cũ có mật khẩu băm, lịch sử hội thoại AI, bảng xếp hạng công khai có kiểm tra kiểu dữ liệu, lớp học (giáo viên tạo/sửa, học sinh chỉ tự tham gia/rời), bài tập, bài nộp có hạn chót, trạng thái hiện diện và thảo luận. Triển khai qua Firebase Console → Firestore → Rules hoặc `firebase deploy --only firestore:rules`.

**2. Các file tham gia**

`firestore.rules`, `firebase.json` (khai báo đường dẫn rules/indexes), `firestore.indexes.json` (rỗng), `README.md` mục 2, `docs/ARCHITECTURE.md` mục 4; kiểm thử E2E lớp học dùng Firestore giả lập (`tests/e2e/fixtures/firebase-mock/firebase-firestore.js`) **không** mô phỏng security rules (ghi rõ trong tệp).

**3. Luồng xử lý từng bước**

1. Mỗi yêu cầu đọc/ghi từ SDK Firebase phía trình duyệt được Firestore đối chiếu với khối `match` tương ứng.
2. `signedIn()` yêu cầu `request.auth` có email; `myKey()` chuẩn hóa email thành khóa tài liệu.
3. `users/{key}`: chỉ đọc tài liệu của chính mình (không cho `list`); tạo mới phải khớp email token, vai trò hợp lệ, không chứa `password_hash`/`is_admin`; không được xóa.
4. Tài khoản cũ còn `password_hash` (`legacyLocked()`) chỉ được cập nhật theo nhánh "claim": phải xóa `password_hash` trong cùng lần ghi và chứng minh `legacy_claim == password_hash` hoặc đăng nhập Google đã xác minh email, không đổi vai trò.
5. `users/{key}/conversations/{cid}`: chỉ chủ sở hữu; khi ghi, `messages` phải là list, `title` ≤200 ký tự.
6. `leaderboard/{key}`: ai cũng đọc; chỉ chủ sở hữu ghi, chỉ các trường `name, xp, school, updated_at`, `xp` là số nguyên 0…999 999, `name` ≤80 ký tự.
7. `classrooms/{code}`: người đã đăng nhập được `get` (biết mã lớp là quyền tra cứu để tham gia); `list` chỉ lớp mình dạy/học; tạo lớp chỉ giáo viên/admin, mã khớp `^[A-Z0-9-]{4,20}$`, tên ≤120 ký tự; cập nhật bởi giáo viên chủ lớp hoặc học sinh tự tham gia/rời (`joiningSelf`/`leavingSelf` chỉ đổi `student_emails`, `students` đúng một phần tử là chính mình); xóa chỉ chủ lớp.
8. Subcollection: `assignments` (chủ lớp ghi, thành viên đọc); `submissions` (học sinh tạo/sửa bài của mình trước hạn `deadline_ts`, mã tài liệu `<assignment_id>__<email>`, không được ghi trường chấm điểm; chủ lớp đọc/sửa/xóa); `presence` (học sinh ghi của mình, chủ lớp đọc); `messages` (thành viên đọc/tạo với `author_email` là mình, `text` ≤2000; xóa bởi chủ lớp hoặc tác giả).

**4. Hàm/lớp/API cốt lõi**

Hàm luật: `signedIn()`, `myKey()`, `isGoogleVerified()`, `changed()`, `profile()`, `isTeacher()`, `classDoc()`, `isOwnerOf()`, `isMemberOf()`, `shortText()`, `legacyLocked()`, `roleOk()`, `noPrivilegedFields()`, `joiningSelf()`, `leavingSelf()`, `deadlineOpen()`.

**5. Trích đoạn code quan trọng**

Tệp `firestore.rules` — di trú tài khoản cũ mà không lộ mật khẩu băm:

```
      // Legacy account claim: proves knowledge of the old password without revealing the stored hash,
      // or Google-verified ownership of the email. The hash must be removed in the same write.
      allow update: if signedIn() && key == myKey() && legacyLocked()
        && !('password_hash' in request.resource.data)
        && (request.resource.data.get('legacy_claim', '') == resource.data.password_hash || isGoogleVerified())
        && request.resource.data.get('role', 'none') == resource.data.get('role', 'none');
```

Trình duyệt không bao giờ đọc được tài liệu còn `password_hash` (luật `get` chặn khi `legacyLocked()`); việc so khớp `legacy_claim` diễn ra phía máy chủ Firestore và mã băm phải bị xóa ngay trong lần ghi đó. Lưu ý: tên trường trong luật là `legacy_claim`, trong khi `docs/ARCHITECTURE.md` ghi `legacy_proof`.

Tệp `firestore.rules` — bài nộp của học sinh có kiểm tra hạn chót:

```
        allow create: if isMemberOf(code)
          && request.resource.data.email == myKey()
          && sid == request.resource.data.assignment_id + '__' + myKey()
          && !request.resource.data.keys().hasAny(['teacher_score', 'teacher_note', 'graded_at', 'graded_by'])
          && deadlineOpen(request.resource.data.assignment_id);
```

Học sinh chỉ nộp được bài mang email của mình, mã tài liệu buộc theo quy ước `<bài>__<email>` (mỗi học sinh một bài nộp cho mỗi bài tập), không thể tự chấm điểm và không nộp được sau hạn chót.

### Công cụ kiểm tra nội dung học tập (tools)

**1. Mô tả & giao diện**

Bộ công cụ dòng lệnh Python bảo đảm chất lượng nội dung `data/`: `tools/validate_content.py` kiểm tra lược đồ mọi khóa học và thử thách, chuẩn Unicode NFC, tính nhất quán độ khó–XP, và **chạy thật** lời giải/khung bài Python & Python Tiếng Việt bằng CPython; `tools/validate_cpp_content.py` kiểm tra khóa C/C++ và đủ 100 thử thách, chạy lời giải C/C++ bằng trình thông dịch JSCPP trong trình duyệt headless (Playwright) qua trang `tests/harness/jscpp.html`; `tools/pyvn.py` là bản Python của bộ dịch Python Tiếng Việt. Kết quả in ra console bằng tiếng Việt/tiếng Anh với mã thoát 0 (đạt) hoặc 1 (lỗi).

**2. Các file tham gia**

`tools/validate_content.py`, `tools/validate_cpp_content.py`, `tools/pyvn.py`, `tests/harness/jscpp.html`, `vendor/jscpp/JSCPP.es5.min.js`, dữ liệu `data/courses/*.json`, `data/challenges.json`, `data/pyvn-keywords.json`; vỏ pytest: `tests/e2e/test_cpp_content.py`.

**3. Luồng xử lý từng bước**

1. `validate_content.py` đọc mọi `data/courses/*.json` (trừ `index.json`), kiểm tra `id` trùng tên tệp, `version == 2`, `lang`, `track`, `accent`, chương `ch1…`, mã bài `<khóa>-<chương>-<số>`, XP theo độ khó (easy 10, medium 20, hard 30), gợi ý, `prism` hợp lệ, starter khác solution.
2. Bài web phải có `tests: []` và `checks` chỉ dùng loại `exists, count, text, attr, style, js`; bài khác cần test `{input, expected, hidden}` và ít nhất một test ẩn.
3. Kiểm tra `challenges.json` (thế giới, `stage-<n>`, rank, boss, XP).
4. `execute()` dịch pyvn bằng `translate()`, chạy song song (8 luồng) mỗi lời giải và starter với từng test bằng `python -X utf8 -I -c` (timeout 5 giây), so sánh đầu ra đã chuẩn hóa; lời giải sai hoặc starter đạt mọi test → lỗi.
5. `validate_cpp_content.py` kiểm tra lược đồ chặt hơn (3–5 test/bài, phải có test hiện và ẩn, lý thuyết có ví dụ code, đề có mục "Ví dụ", 2–3 gợi ý, đúng 100 thử thách, thế giới 1..5 với ngôn ngữ cố định).
6. Chạy lời giải Python của thử thách bằng CPython; với C/C++: khởi động `http.server` ở cổng trống, mở trình duyệt (msedge → chrome → chromium), tải `jscpp.html`, chờ `window.harnessReady`, gọi `window.runCpp(code, input, 5000)` cho từng test.
7. In tổng kết ("Solutions passing all tests", "Starters correctly failing") và `ALL CHECKS PASSED` hoặc `FAILED`.

**4. Hàm/lớp/API cốt lõi**

`validate_content.py`: `Report`, `normalize_output()`, `run_python()`, `check_nfc()`, `validate_tests()`, `validate_checks()`, `validate_course()`, `validate_challenges()`, `execute()`, `main()`. `validate_cpp_content.py`: `normalize()`, `check_tests()`, `validate_course_schema()`, `validate_challenges_schema()`, `run_python()`, `start_server()`, `launch_browser()`, `run_items()`, `main()`. `pyvn.py`: `load_mapping()`, `_segments()`, `translate_with()`, `translate()`. Harness: `window.runCpp()`.

**5. Trích đoạn code quan trọng**

Tệp `tools/validate_content.py` — chạy lời giải bằng CPython cô lập:

```python
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
```

Mỗi lời giải chạy trong tiến trình Python riêng ở chế độ cô lập (`-I`), thư mục tạm, giới hạn 5 giây, nên một bài lặp vô hạn không làm treo công cụ.

Tệp `tests/harness/jscpp.html` — cầu nối chạy C++ trong trình duyệt:

```javascript
    window.runCpp = function (code, input, maxTimeout) {
      var out = '';
      var started = Date.now();
      try {
        var exitCode = JSCPP.run(code, input || '', {
          stdio: { write: function (s) { out += s; } },
          maxTimeout: maxTimeout || 5000
        });
        return { exitCode: exitCode, stdout: out, error: null, ms: Date.now() - started };
      } catch (err) {
        return { exitCode: null, stdout: out, error: String(err && err.message ? err.message : err), ms: Date.now() - started };
      }
    };
```

Lời giải C/C++ được kiểm tra bằng đúng trình thông dịch JSCPP mà học sinh dùng trong ứng dụng, bảo đảm bài chấm được trong môi trường thật chứ không chỉ với trình biên dịch gốc.

### Công cụ sinh danh mục khóa học và cập nhật precache Service Worker

**1. Mô tả & giao diện**

`tools/build_catalog.py` sinh `data/courses/index.json` — danh mục mà trang Học đọc — gồm metadata từng khóa (số chương, số bài, tổng XP), 4 lộ trình đang có (Lập trình nền tảng, Phát triển web, Thuật toán & CTDL, Trí tuệ nhân tạo) và 5 lộ trình tương lai (Học máy & Học sâu, Khoa học dữ liệu nâng cao, An toàn thông tin, Robotics & IoT, Tự động hóa). `tools/update_sw_precache.py` sinh lại danh sách `SHELL` trong `sw.js` từ các tệp thực có và (tùy chọn) đổi `VERSION`.

**2. Các file tham gia**

`tools/build_catalog.py`, `tools/update_sw_precache.py`, `data/courses/*.json`, `data/courses/index.json`, `sw.js`.

**3. Luồng xử lý từng bước**

1. `build_catalog.py`: duyệt `data/courses/*.json` (trừ `index.json`), đếm bài và XP từng khóa; sắp theo `ORDER = ["pyvn", "python", "web", "c", "cpp", "ai"]` (khóa lạ xếp sau theo chữ cái).
2. Gán khóa học vào lộ trình theo trường `track`; luôn thêm `cpp` vào lộ trình `algorithms`; nối các lộ trình `ROADMAP` với `courses: []`.
3. Ghi `index.json` (`version: 2`, `generated_at`, `courses`, `tracks`) và in tóm tắt.
4. `update_sw_precache.py`: ghép 13 mục cố định `STATIC` với mọi `.js`/`.css` trong `css/` và `js/` (bỏ tệp bắt đầu bằng `_`); nếu có mục không tồn tại → dừng với "Missing files".
5. Thay khối `const SHELL = [...]` trong `sw.js` bằng regex; nếu có tham số dòng lệnh thì thay `const VERSION = '...'`; ghi lại tệp và in số mục precache.

**4. Hàm/lớp/API cốt lõi**

`build_catalog.py`: `ORDER`, `TRACKS`, `ROADMAP`, `load_courses()`, `build()`. `update_sw_precache.py`: `STATIC`, `collect()`, `main()`.

**5. Trích đoạn code quan trọng**

Tệp `tools/update_sw_precache.py`:

```python
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
```

Danh sách precache luôn khớp với tệp thực tế; đổi `VERSION` làm tên cache thay đổi, khiến Service Worker mới xóa cache cũ khi kích hoạt.

Tệp `tools/build_catalog.py`:

```python
    for t in TRACKS:
        ids = [c["id"] for c in courses if c["track"] == t["id"]]
        # The C++ course is the backbone of the algorithms track whatever its own "track" field says.
        if t["id"] == "algorithms" and "cpp" in present and "cpp" not in ids:
            ids.append("cpp")
        tracks.append({**t, "courses": ids})
    tracks += [{**r, "courses": []} for r in ROADMAP]
```

Lộ trình được dựng từ trường `track` của từng khóa, với ngoại lệ khóa C++ luôn thuộc lộ trình thuật toán; các lộ trình tương lai được công bố trung thực với danh sách khóa học rỗng.

### Vỏ ứng dụng (index.html): theme trước khi vẽ và màn giới thiệu

**1. Mô tả & giao diện**

`index.html` là trang duy nhất của SPA (định tuyến bằng hash). Trước khi trình duyệt vẽ, một script nội tuyến áp dụng theme đã lưu (`light`/`dark`/`system`) để tránh nháy màu, và quyết định có chiếu màn giới thiệu (logo động, chữ "V-Code Edu", khẩu hiệu "GIÁO DỤC · CÔNG NGHỆ · TƯƠNG LAI", nút "Bỏ qua") hay không. Trang chứa thanh điều hướng (thương hiệu, liên kết, viên trạng thái kết nối, chip XP, nút đổi theme, khu tài khoản, nút menu di động), ngăn kéo di động, vùng `#app-main`, footer (Học tập, Công cụ, Hệ thống) và vùng thông báo `#toast-region`. Có liên kết "Bỏ qua tới nội dung chính" và thông báo `<noscript>`.

**2. Các file tham gia**

`index.html`, `manifest.json`, CSS `css/tokens.css`, `css/base.css`, `css/components.css`, `css/shell.css`, `css/vbot.css`, module `js/main.js` (logic gắn vào các điểm `data-*` nằm ở frontend, ngoài phạm vi).

**3. Luồng xử lý từng bước**

1. Script đầu trang đọc `localStorage['vc-theme']` (mặc định `system`), dùng `prefers-color-scheme` để đặt `data-theme` trên `<html>`.
2. Kiểm tra hash là trang chủ, chưa xem trong phiên (`sessionStorage['vc-intro-seen']`) và không phải trình duyệt tự động (`navigator.webdriver`), hoặc có `?intro=1` → thêm lớp `has-intro`; đánh dấu đã xem.
3. Nạp phông Google Fonts (Be Vietnam Pro, JetBrains Mono), CSS lõi, `modulepreload` và chạy `js/main.js`.
4. Script thứ hai: nếu không có `has-intro` thì gỡ khối intro; ngược lại tự đóng sau 3000 ms (700 ms nếu giảm chuyển động), hoặc khi bấm "Bỏ qua", bấm nền, nhấn Esc/Enter/Space; khi đóng thêm `is-leaving`, `intro-done` và gỡ phần tử sau 900 ms.

**4. Hàm/lớp/API cốt lõi**

Hàm nội tuyến `finish()`, `onKey()`; khóa lưu trữ `vc-theme`, `vc-intro-seen`; thuộc tính gắn kết `data-nav-links`, `data-net-pill`, `data-status-panel`, `data-xp-chip`, `data-theme-toggle`, `data-account-slot`, `data-burger`, `data-mobile-drawer`, `data-footer`, `data-year`, `data-intro-skip`.

**5. Trích đoạn code quan trọng**

Tệp `index.html`:

```javascript
    (function () {
      var d = document.documentElement;
      try {
        var p = localStorage.getItem('vc-theme') || 'system';
        var dark = p === 'dark' || (p === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        d.setAttribute('data-theme', dark ? 'dark' : 'light');
      } catch (e) {}
      try {
        var h = location.hash;
        var forced = /[?&]intro=1/.test(location.search);
        var home = h === '' || h === '#' || h === '#/';
        var seen = sessionStorage.getItem('vc-intro-seen');
        if (forced || (home && !seen && !navigator.webdriver)) d.classList.add('has-intro');
        sessionStorage.setItem('vc-intro-seen', '1');
      } catch (e) {}
    })();
```

Theme được đặt trước lần vẽ đầu tiên nên không có hiện tượng nháy sáng/tối; màn giới thiệu chỉ xuất hiện một lần mỗi phiên ở trang chủ và tự tắt khi chạy kiểm thử tự động (`navigator.webdriver`).

### Hệ thống kiểm thử tự động

**1. Mô tả & giao diện**

Dự án có hai bộ kiểm thử pytest: (a) **backend** (`backend/tests`, 57 hàm → 74 trường hợp) chạy hoàn toàn ngoại tuyến với CSDL SQLite tạm, nhà cung cấp AI giả lập (`FakeProvider`) và `httpx.MockTransport`, không chạm `vcode_edu.db` thật hay gọi API thật; (b) **E2E** (`tests/e2e`, 45 hàm → 119 trường hợp) điều khiển Microsoft Edge thật qua Playwright trên server cổng 8000 (hoặc `VCODE_BASE_URL`), dùng Firebase giả lập chặn URL SDK `www.gstatic.com/firebasejs/**` cho phần lớp học, và các trang harness cho nội dung web/C++. Ảnh chụp màn hình lưu ở `tests/e2e/screenshots/` (bị `.gitignore` chặn).

**2. Các file tham gia**

`backend/tests/conftest.py` và 8 tệp `test_*.py` của backend; `tests/e2e/firebase_mock.py`, `tests/e2e/fixtures/firebase-mock/*.js`, 6 tệp `tests/e2e/test_*.py`; `tests/harness/html-checks.html`, `tests/harness/jscpp.html`; `backend/requirements-dev.txt`.

**3. Luồng xử lý từng bước**

1. `conftest.py` đặt `DATABASE_URL` tạm, xóa khóa AI, tắt Ollama **trước** khi import `backend.main`.
2. Fixture `build_client` tạo `Settings` tạm (`serve_frontend=False`, hạn mức 100), `ProviderRegistry` chứa nhà cung cấp giả, gọi `create_app(...)` và mở `TestClient` (kích hoạt lifespan/migration); đóng tất cả client khi kết thúc.
3. Các bài backend gửi yêu cầu, phân tích SSE bằng `parse_sse()` và kiểm tra mã trạng thái, sự kiện, header, CSDL.
4. `test_legacy_db.py` sao chép `vcode_edu.db` (kèm `-wal`) sang thư mục tạm, chụp lược đồ/số dòng/dữ liệu bảng cũ trước và sau khi khởi động app + chat, khẳng định không thay đổi.
5. `test_security.py` tự sinh khóa RSA và chứng chỉ X.509, ký token giả để kiểm tra mọi nhánh xác minh.
6. E2E: fixture `browser` mở Edge headless (`channel="msedge"`), mỗi bài tạo context riêng, thu lỗi console/pageerror (bỏ qua danh sách `IGNORED`), điều hướng theo hash, thao tác và khẳng định bằng `expect`.
7. `test_classroom.py` mô phỏng nhiều người dùng tuần tự: giáo viên tạo lớp/bài → `dump_db()` → học sinh tham gia, nộp bài → giáo viên chấm → học sinh xem điểm, mỗi bước truyền trạng thái Firestore giả cho bước sau.
8. `test_web_lessons.py` tự chạy `python -m http.server 5602`, mở `html-checks.html`, đánh giá lời giải và starter của từng bài web ở 2 chế độ iframe.

**4. Hàm/lớp/API cốt lõi**

`FakeProvider`, `make_settings()`, `build_client`, `parse_sse()`, `user_msg()`, `make_token()`, `make_verifier()`, `_snapshot()`, `legacy_copy`, `holder()`, `sse_body()`, `install_firebase_mock()`, `new_mock_context()`, `dump_db()`, `window.evaluateLesson()`, `window.runCpp()`, `window.__fbmock.dump()`.

**5. Trích đoạn code quan trọng**

Tệp `backend/tests/conftest.py` — cô lập môi trường kiểm thử:

```python
# Phải đặt TRƯỚC khi import backend.main (module tạo app mặc định lúc import).
_SESSION_DIR = Path(tempfile.mkdtemp(prefix="vcode_tests_"))
os.environ["DATABASE_URL"] = f"sqlite:///{(_SESSION_DIR / 'import_default.db').as_posix()}"
for _key in ("GEMINI_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"):
    os.environ[_key] = ""
os.environ["OLLAMA_ENABLED"] = "0"
```

Vì `backend/main.py` tạo `app` ngay khi import, biến môi trường phải được ghi đè trước để ứng dụng mặc định cũng dùng CSDL tạm và không thể gọi nhà cung cấp AI thật.

Tệp `tests/e2e/firebase_mock.py` — chặn SDK Firebase thật:

```python
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
```

Mọi yêu cầu tới SDK Firebase được thay bằng bản giả trong bộ nhớ, nên kiểm thử lớp học không bao giờ chạm tới dự án Firebase thật; trạng thái khởi đầu (người dùng, tài liệu) được tiêm qua `window.__FBMOCK__`.

Tệp `backend/tests/test_static.py` — các đường dẫn bị cấm:

```python
@pytest.mark.parametrize("path", [
    "/vcode_edu.db", "/.env", "/backend/main.py", "/archive/legacy-v25/vcode_edu.backup.db",
    "/.venv/pyvenv.cfg", "/.git/config", "/tools/build.py", "/tests/x.py", "/js/.secret",
    "/js/../vcode_edu.db", "/js/%2e%2e/vcode_edu.db", "/css/..%2f.env", "/README.md",
])
def test_everything_else_is_404(build_client, frontend, path):
    client = build_client(serve_frontend=True, frontend_dir=frontend)
    r = client.get(path)
    assert r.status_code == 404, path
    assert "secret" not in r.text and "SQLite" not in r.text
```

13 đường dẫn nhạy cảm (kể cả biến thể mã hóa `%2e%2e`, `..%2f`) được kiểm tra đều trả 404 và không lộ nội dung tệp.

### Khung ứng dụng & định tuyến (router hash, lazy-load trang, CSS theo trang)

**1. Mô tả & giao diện**
Ứng dụng là một trang đơn (SPA) không có bước build: `index.html` chứa khung tĩnh gồm thanh tiến trình chuyển trang (`.route-progress`), thanh điều hướng trên cùng (`header.topnav`), ngăn kéo di động, vùng nội dung chính `<main id="app-main">`, chân trang (`footer[data-footer]`) và vùng thông báo (`#toast-region`). Mọi trang con được hiển thị bên trong `#app-main` dựa trên phần hash của URL (ví dụ `#/learn/python`). Khi chuyển trang, thanh tiến trình mảnh chạy trên đỉnh màn hình (gradient theo màu khu vực), nội dung mới xuất hiện bằng hiệu ứng mờ dần + trượt lên + bỏ nhòe (`page-enter`); nếu tải chậm hơn 160 ms sẽ hiện vòng quay "Đang tải". Khi lỗi, trang hiển thị khối trạng thái rỗng với thông báo phù hợp (ngoại tuyến hoặc lỗi cụ thể) và nút "Thử lại". Trang dạng ứng dụng toàn màn hình (IDE, AI, bài học, màn chơi thử thách) gắn lớp `body.is-app-page` để ẩn chân trang. Service Worker được đăng ký (chỉ trên HTTPS hoặc localhost) và khi có phiên bản mới sẽ hiện toast "Đã có phiên bản mới của V-Code Edu." kèm nút "Tải lại".

**2. Các file tham gia**
- `index.html` — khung HTML, nạp CSS nền và `js/main.js` dạng module.
- `js/main.js` — khai báo 14 tuyến, gọi `startRouter`, xử lý `route:change` (đặt `data-section`, `is-app-page`), thanh tiến trình, Service Worker.
- `js/core/router.js` — biên dịch mẫu tuyến, khớp hash, tải lười module trang và CSS, vòng đời mount/cleanup.
- `js/core/store.js` — `bus` phát `route:change`, `route:mounted`; `appState.online` cho thông báo lỗi ngoại tuyến.
- `js/core/dom.js` — `h`, `mount`.
- `css/base.css` (`.app-shell`, `.app-main`, `.route-loading`, `page-in`), `css/shell.css` (`.route-progress`, `page-enter`, `body.is-app-page .site-footer`).

**3. Luồng xử lý từng bước**
1. `main.js` gọi `defineRoutes([...])`; mỗi tuyến được `compile()` thành `regex` + danh sách tham số (`/:param` bắt buộc, `/:param?` tùy chọn).
2. `boot()` gọi `startRouter($('#app-main'))`: lưu `outlet`, đăng ký `hashchange` và gọi `handleRoute()` lần đầu.
3. `handleRoute()` tăng `navToken`, `parseHash()` tách đường dẫn và query (`URLSearchParams`), `match()` tìm tuyến (không thấy thì dùng `/404`).
4. Trang cũ bị hủy: `controller.abort()` (mọi listener đăng ký với `signal` tự gỡ) rồi gọi hàm `cleanup` trang trả về.
5. Phát `route:change` → `main.js` đặt lớp `is-active` cho liên kết, `document.documentElement.dataset.section`, bật/tắt `is-app-page`; thanh `.route-progress` thêm `is-active`.
6. Hẹn giờ 160 ms hiện spinner nếu chưa tải xong.
7. Tải song song `route.load()` (import động) và `ensureCss(route.css)` (chèn `<link>` một lần duy nhất nhờ `loadedCss`).
8. Nếu người dùng đã chuyển trang khác trong lúc chờ (`token !== navToken`) thì bỏ kết quả.
9. Tạo `div.page-root.page-root--{nav}`, kích hoạt lại animation `is-entering`, đặt `document.title` (`<tiêu đề> · V-Code Edu`), cuộn lên đầu (trừ khi query có `keepScroll`).
10. Gọi `page.mount(container, ctx)` với `ctx = { params, query, path, signal, navigate }`, lưu hàm dọn dẹp, focus `outlet`, phát `route:mounted` → thanh tiến trình hoàn tất và ẩn sau 600 ms.
11. Khi lỗi: phát `route:mounted` với `error: true`, hiển thị thông báo "Trang này chưa có trong bộ nhớ offline" (nếu ngoại tuyến) hoặc "Không tải được trang" và nút "Thử lại".

**4. Hàm/lớp/API cốt lõi**
`defineRoutes`, `parseHash`, `navigate(path, { replace })`, `currentPath`, `startRouter`, `compile`, `ensureCss`, `match`, `handleRoute` (router.js); `initRouteProgress`, `registerServiceWorker`, `boot` (main.js); API trình duyệt: `hashchange`, `history.replaceState`, `import()` động, `AbortController`, `navigator.serviceWorker.register('sw.js')`.

**5. Trích đoạn code quan trọng**
`js/core/router.js`:
```js
function compile(pattern) {
  const keys = [];
  const re = pattern
    .replace(/\/+$/, '')
    .replace(/\/:(\w+)(\?)?/g, (_, key, optional) => {
      keys.push(key);
      return optional ? '(?:/([^/]+))?' : '/([^/]+)';
    });
  return { regex: new RegExp(`^${re || ''}/?$`), keys };
}
```
Mỗi mẫu tuyến được chuyển thành biểu thức chính quy; tham số có dấu `?` trở thành nhóm không bắt buộc, nhờ vậy `/prism/:topic?/:algo?` khớp được cả `/prism`, `/prism/sorting` và `/prism/sorting/bubble`.

`js/core/router.js`:
```js
  try {
    const [mod] = await Promise.all([route.load(), ensureCss(route.css)]);
    if (token !== navToken) return; // user navigated again meanwhile
    clearTimeout(slowTimer);
    const page = mod.default;
    const ctx = { params, query, path, signal: controller.signal, navigate };
    const container = h('div', { class: `page-root page-root--${route.nav || 'default'}` });
    mountEl(outlet, container);
```
Module trang và CSS riêng được tải song song; cơ chế `navToken` chống "điều kiện tranh chấp" khi người dùng bấm chuyển trang liên tục, và `signal` trong `ctx` giúp trang tự gỡ sự kiện khi bị rời đi.

`js/main.js`:
```js
  { path: '/learn/:course/:lesson', nav: 'learn', app: true, load: () => import('./pages/lesson.js'), css: ['css/pages/ide.css', 'css/pages/learn.css'] },
  { path: '/challenges', nav: 'challenges', load: () => import('./pages/challenges.js'), css: ARENA_CSS },
```
Mỗi tuyến khai báo hàm `load` (import động → tải lười) và danh sách CSS cần cho trang, nên trình duyệt chỉ tải mã/CSS của trang khi người dùng thực sự mở trang đó.

### Thanh điều hướng & menu di động

**1. Mô tả & giao diện**
Thanh điều hướng trên cùng (cố định, nền mờ kính) gồm logo "V-Code Edu", 7 liên kết (Trang chủ, Học, Thử thách, Lăng kính, IDE, Trợ lý AI, Lớp học) với biểu tượng SVG, một "thanh chỉ báo" (`.nav-indicator`) trượt mượt tới liên kết đang hoạt động, và cụm hành động bên phải (viên trạng thái, chip XP, nút giao diện, tài khoản, nút burger). Khi đã đăng nhập, nút tài khoản hiện ảnh đại diện (hoặc chữ viết tắt) và mở menu thả xuống: tên, email, nhãn vai trò (Giáo viên/Học sinh/Quản trị), các mục "Hồ sơ & cài đặt", "Tiến độ học tập", "Lớp học của tôi", "Lịch sử trò chuyện AI", "Đăng xuất". Chưa đăng nhập thì hiện nút "Đăng nhập" (khi trạng thái xác thực chưa sẵn sàng hiện khung skeleton). Ở màn hình ≤ 1080px các liên kết ẩn đi, nút burger hiện ra và mở ngăn kéo bên trái (rộng tối đa 354px) gồm: phần đầu có logo, tên, khẩu hiệu "Nền tảng Học lập trình Việt Nam" và nút đóng; mục "Quản lí tài khoản"; mục "Không gian học tập" với 7 thẻ có tiêu đề + mô tả phụ (ví dụ "IDE · Lưu đồ · Scratch Live" có nhãn `LIVE`) xuất hiện lần lượt; chân ngăn kéo có nút "Đổi giao diện sáng / tối" và dòng "Phiên bản 3.1 · GIÁO DỤC · CÔNG NGHỆ · TƯƠNG LAI". Nút bấm có hiệu ứng gợn sóng (ripple) từ vị trí con trỏ; thanh điều hướng đổ bóng khi cuộn quá 24px.

**2. Các file tham gia**
- `index.html` — khung `header.topnav`, `nav[data-nav-links]`, `nav#mobile-drawer[data-mobile-drawer]`, `[data-account-slot]`, `[data-burger]`.
- `js/main.js` — `NAV`, `DRAWER_ITEMS`, `renderNav`, `renderDrawerAccount`, `moveIndicator`, `setActiveNav`, `initBurger`, `renderAccount`, `initRipples`, `initScrollState`.
- `js/core/ui.js` — `bindMenu`, `toast`.
- `js/components/icons.js` — `icon()`.
- `js/components/auth-dialog.js` — được import động khi bấm "Đăng nhập".
- `js/services/auth.js` — `logout`.
- `css/base.css`, `css/shell.css` (`.nav-indicator`, `.account-btn`, `.login-btn`, `.mobile-drawer`, `.drawer__*`, `.drawer-backdrop`), `css/components.css` (`.menu*`, `.avatar`, `.ripple`).

**3. Luồng xử lý từng bước**
1. `renderNav()` tạo các thẻ `a.navlink` từ `NAV` và chèn `span.nav-indicator` vào `[data-nav-links]`; dựng toàn bộ ngăn kéo di động.
2. `initBurger()` tạo lớp phủ `.drawer-backdrop`; bấm burger bật/tắt lớp `is-open`, khóa cuộn `body`, focus nút đóng sau 50 ms.
3. Ngăn kéo đóng khi bấm lớp phủ, bấm liên kết/nút trong ngăn kéo, nhấn Escape hoặc khi có `route:change`.
4. Mỗi `route:change`, `setActiveNav(nav)` gắn `is-active` + `aria-current="page"` cho mọi phần tử `[data-nav]` khớp, rồi `moveIndicator()` đặt biến CSS `--x` và độ rộng của chỉ báo theo `offsetLeft`/`offsetWidth` của liên kết hoạt động.
5. Chỉ báo được tính lại khi `resize` và khi phông chữ tải xong (`document.fonts.ready`).
6. `renderAccount()` chạy lại mỗi khi `appState.user` hoặc `authReady` thay đổi; dùng `AbortController` để gỡ listener của menu cũ và `bindMenu` để gắn menu mới.
7. Mục đăng xuất gọi `logout()` rồi hiện toast "Đã đăng xuất. Hẹn gặp lại!".
8. `initRipples()` lắng nghe `pointerdown` trên `.btn, .chip, .auth-submit, .auth-google`, chèn `span.ripple` kích thước 2,2 lần cạnh lớn, tự xóa khi `animationend` (bỏ qua nếu người dùng bật giảm chuyển động).
9. `initScrollState()` dùng `requestAnimationFrame` để bật lớp `is-scrolled` trên `<html>` khi `scrollY > 24`.

**4. Hàm/lớp/API cốt lõi**
`renderNav`, `renderDrawerAccount`, `moveIndicator`, `setActiveNav`, `initBurger`, `renderAccount`, `initRipples`, `initScrollState` (main.js); `bindMenu(root, signal)` (ui.js); `openAuthDialog` (auth-dialog.js); `logout` (auth.js).

**5. Trích đoạn code quan trọng**
`js/main.js`:
```js
function moveIndicator() {
  if (!indicator) return;
  const active = $('[data-nav-links] .navlink.is-active');
  if (!active || !active.offsetParent) { indicator.hidden = true; return; }
  indicator.hidden = false;
  indicator.style.setProperty('--x', `${active.offsetLeft}px`);
  indicator.style.width = `${active.offsetWidth}px`;
}
```
Chỉ báo chỉ là một phần tử duy nhất được dịch chuyển bằng biến CSS `--x`; CSS (`transition: transform 460ms`) lo phần chuyển động mượt.

`js/main.js`:
```js
  const set = (open) => {
    drawer.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) setTimeout(() => drawer.querySelector('[data-drawer-close]')?.focus(), 50);
  };
```
Hàm `set` đồng bộ trạng thái ngăn kéo, lớp phủ, thuộc tính trợ năng `aria-expanded` và khóa cuộn trang; focus được chuyển vào nút đóng để hỗ trợ bàn phím.

### Giao diện sáng/tối

**1. Mô tả & giao diện**
Nút tròn có biểu tượng (mặt trời / mặt trăng / màn hình) trên thanh điều hướng cho phép xoay vòng ba chế độ: "Giao diện sáng" → "Giao diện tối" → "Theo hệ thống". Mỗi lần bấm, biểu tượng xoay 360° và một toast ngắn (1,6 giây) báo chế độ mới. Giao diện sáng có tên "paper" (nền `#f6f5f1`, chữ `#0b1433`, thương hiệu `#2f49d1`); giao diện tối "night ink" (nền `#0a0f1f`, chữ `#e8ebf5`, thương hiệu `#6f86ff`). Màu thanh trình duyệt (`meta theme-color`) cũng đổi theo. Ngăn kéo di động có nút "Đổi giao diện sáng / tối" tương đương. Giao diện được áp dụng trước lần vẽ đầu tiên nên không bị nháy màu.

**2. Các file tham gia**
- `index.html` — script nội tuyến trong `<head>` đọc `localStorage['vc-theme']` và đặt `data-theme` trước khi vẽ.
- `js/core/theme.js` — `getThemePreference`, `resolvedTheme`, `setTheme`, `cycleTheme`, `initTheme`.
- `js/main.js` — `renderThemeToggle`, xử lý click nút `[data-theme-toggle]`, lắng nghe `theme:change`.
- `js/core/store.js` — `appState.theme`, `bus`.
- `css/tokens.css` — toàn bộ biến màu cho `:root` và `:root[data-theme="dark"]`; các CSS khác dùng `html[data-theme="dark"]` cho ngoại lệ.
- `css/shell.css` — `.theme-btn.is-spinning`.

**3. Luồng xử lý từng bước**
1. Script nội tuyến trong `index.html` đọc `vc-theme` (mặc định `system`), kiểm tra `prefers-color-scheme: dark` và đặt `data-theme` ngay lập tức.
2. `boot()` gọi `initTheme()`: `apply(getThemePreference())` đặt lại `data-theme`, cập nhật `meta[name="theme-color"]` (`#0a0f1f` hoặc `#f6f5f1`), ghi `appState.theme`, phát `theme:change`.
3. `initTheme` theo dõi thay đổi giao diện hệ điều hành (chỉ áp dụng khi lựa chọn là `system`) và sự kiện `storage` (đồng bộ giữa các tab).
4. Người dùng bấm nút → `cycleTheme()` tính chế độ kế tiếp theo thứ tự `['light', 'dark', 'system']`, `setTheme()` lưu vào localStorage và áp dụng.
5. `main.js` khởi động lại animation `is-spinning` của nút và hiện toast; `renderThemeToggle()` (gắn với `theme:change`) đổi biểu tượng, `title` và `aria-label`.

**4. Hàm/lớp/API cốt lõi**
`getThemePreference()`, `resolvedTheme(pref)`, `setTheme(pref)`, `cycleTheme()`, `initTheme()`, `apply(pref)` (theme.js); `renderThemeToggle()` (main.js); `window.matchMedia('(prefers-color-scheme: dark)')`, `localStorage`, sự kiện `storage`.

**5. Trích đoạn code quan trọng**
`js/core/theme.js`:
```js
function apply(pref) {
  const theme = resolvedTheme(pref);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0f1f' : '#f6f5f1');
  appState.set({ theme: pref });
  bus.emit('theme:change', { pref, theme });
}
```
Toàn bộ việc đổi giao diện chỉ là đặt thuộc tính `data-theme` trên `<html>`; vì mọi thành phần chỉ đọc biến CSS trong `tokens.css`, cả ứng dụng đổi màu cùng lúc.

`index.html`:
```js
      try {
        var p = localStorage.getItem('vc-theme') || 'system';
        var dark = p === 'dark' || (p === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
        d.setAttribute('data-theme', dark ? 'dark' : 'light');
      } catch (e) {}
```
Đoạn mã chạy đồng bộ trong `<head>` trước khi trình duyệt vẽ trang, tránh hiện tượng nháy nền sáng khi người dùng đã chọn giao diện tối.

### Hiệu ứng mở đầu (intro logo)

**1. Mô tả & giao diện**
Lần đầu mở trang chủ trong một phiên trình duyệt, một màn hình giới thiệu toàn màn hình (z-index 5000) xuất hiện trên nền gradient xanh đêm với lưới phối cảnh chuyển động: ba vòng quỹ đạo SVG được "vẽ" dần (stroke-dashoffset), một tia sáng cyan chạy theo quỹ đạo elip (`animateMotion`), logo bật vào với hiệu ứng xoay + phóng to rồi có vệt sáng quét qua, chữ "V-Code Edu" hiện lần lượt từng ký tự (phần "Edu" tô gradient), dòng khẩu hiệu "GIÁO DỤC · CÔNG NGHỆ · TƯƠNG LAI", thanh tiến trình chạy 2,7 giây và nút "Bỏ qua →". Khung ứng dụng bị ẩn trong lúc intro và hiện lại bằng hiệu ứng `shell-reveal`. Robot V-Bot cũng ẩn trong thời gian này.

**2. Các file tham gia**
- `index.html` — script đầu trang quyết định bật intro (lớp `has-intro`), khối HTML `#vc-intro` (SVG vòng quỹ đạo, logo, chữ, tag, thanh, nút bỏ qua) và script điều khiển kết thúc.
- `css/shell.css` — các lớp `.intro*` và 10 keyframes (`intro-draw`, `intro-logo`, `intro-shine`, `intro-letter`, `intro-fade-in`, `intro-bar`, `intro-grid`, `intro-out-bg`, `intro-out-fg`, `shell-reveal`).
- `css/vbot.css` — ẩn `.vbot` khi `html.has-intro:not(.intro-done)`.
- `js/components/vbot.js` — trì hoãn bong bóng chào 4200 ms nếu có intro (thay vì 1800 ms).

**3. Luồng xử lý từng bước**
1. Script trong `<head>` kiểm tra: URL có `?intro=1` (ép bật) hoặc (hash là trang chủ `''`, `#`, `#/` và `sessionStorage['vc-intro-seen']` chưa có và không phải trình duyệt tự động `navigator.webdriver`).
2. Nếu thỏa, thêm lớp `has-intro` vào `<html>`; luôn ghi `vc-intro-seen = '1'` vào sessionStorage.
3. Script sau khối intro: nếu không có `has-intro` thì xóa phần tử `#vc-intro` ngay.
4. Ngược lại đăng ký kết thúc bằng: nút "Bỏ qua", bấm vào nền, phím Escape/Enter/Space, hoặc tự động sau 3000 ms (700 ms nếu người dùng bật giảm chuyển động).
5. `finish()` thêm `is-leaving` (nền phóng to mờ dần, tiền cảnh phóng to + nhòe), thêm `intro-done` vào `<html>` để khung ứng dụng chạy `shell-reveal`, sau 900 ms xóa phần tử và lớp `has-intro`.

**4. Hàm/lớp/API cốt lõi**
Hàm nội tuyến `finish()`, `onKey(e)` (index.html); `sessionStorage`, `matchMedia('(prefers-reduced-motion: reduce)')`; SVG `<animateMotion>`; CSS `stroke-dasharray/stroke-dashoffset`, `perspective`, `mask-image`, `background-clip: text`.

**5. Trích đoạn code quan trọng**
`index.html`:
```js
      try {
        var h = location.hash;
        var forced = /[?&]intro=1/.test(location.search);
        var home = h === '' || h === '#' || h === '#/';
        var seen = sessionStorage.getItem('vc-intro-seen');
        if (forced || (home && !seen && !navigator.webdriver)) d.classList.add('has-intro');
        sessionStorage.setItem('vc-intro-seen', '1');
      } catch (e) {}
```
Intro chỉ chạy một lần mỗi phiên, chỉ ở trang chủ, và không chạy trong kiểm thử tự động; tham số `?intro=1` dùng để xem lại.

`css/shell.css`:
```css
.intro__ring { fill: none; stroke-width: 2; stroke-dasharray: 1200; stroke-dashoffset: 1200; animation: intro-draw 1.6s var(--ease-out) forwards; filter: drop-shadow(0 0 6px rgba(124, 140, 255, 0.8)); }
.intro__word span { display: inline-block; opacity: 0; transform: translateY(40%) rotateX(-80deg); transform-origin: 50% 100%; animation: intro-letter 0.7s calc(0.9s + var(--i) * 0.055s) cubic-bezier(0.2, 1.2, 0.3, 1) forwards; }
```
Vòng quỹ đạo được "vẽ" bằng kỹ thuật dịch chuyển nét đứt; từng chữ cái trễ thêm `var(--i) * 0.055s` (biến `--i` đặt inline trong HTML) để tạo hiệu ứng lật chữ lần lượt.

### Trạng thái Online/Ngoại tuyến & đồng bộ

**1. Mô tả & giao diện**
Trên thanh điều hướng có một "viên trạng thái" gồm chấm màu (có vòng sóng lan tỏa), chữ chính và chữ phụ: "Online · Đồng bộ Cloud" (đã đăng nhập), "Online · Chế độ khách" (chưa đăng nhập), "Đang đồng bộ …" (màu thương hiệu) hoặc "Ngoại tuyến · Lưu trên máy" (nền vàng, chấm hình thoi, rung nhẹ hai lần). Bấm vào viên mở bảng chi tiết: tiêu đề "Đang trực tuyến/Đang ngoại tuyến", đoạn giải thích, 4 dòng trạng thái (Internet, Đồng bộ đám mây, Máy chủ AI — "Sẵn sàng (n)", "Chưa cấu hình khóa" hoặc "Không kết nối được", Chế độ offline — dựa vào Service Worker đang điều khiển trang) có chấm xanh/vàng/xám, và hai nút "Kiểm tra lại", "Cài đặt offline". Khi mất mạng hiện toast cảnh báo; khi có mạng lại hiện toast "Đã kết nối lại. Dữ liệu đang được đồng bộ." và chờ Firestore đẩy hết các ghi đang chờ.

**2. Các file tham gia**
- `js/core/net.js` — `initNetwork`, `probeBackend`, `refreshBackendStatus`.
- `js/main.js` — `statusInfo`, `renderStatus`, `renderStatusPanel`, `syncAfterReconnect`, các handler `net:online`/`net:offline`.
- `js/core/store.js` — `appState.online`, `appState.backend`.
- `js/config.js` — `getApiBase()`.
- `js/services/auth.js` — `firestore()`, `initAuth()` (thử lại khi có mạng).
- `js/services/conversations.js` — `syncConversations` khi `net:online`.
- `index.html` — `.status.menu[data-status]`, `[data-net-pill]`, `[data-status-panel]`.
- `css/shell.css` — `.status-pill[data-state]`, `.status-panel`, `.status-row__val[data-ok]`.

**3. Luồng xử lý từng bước**
1. `initNetwork()` lắng nghe `online`/`offline` của `window`; khi giá trị `navigator.onLine` đổi, cập nhật `appState.online` và phát `net:online` hoặc `net:offline`.
2. `probeBackend()` chạy ngay, khi mạng đổi và mỗi 60 giây (chỉ khi tab hiển thị): nếu không có `getApiBase()` ghi `backend.missing = true`; nếu ngoại tuyến và máy chủ không phải mạng nội bộ (localhost, 127., 192.168., 10.) thì đánh dấu không truy cập được; ngược lại gọi `GET /api/health` với timeout 3,5 giây và lưu `reachable`, `providers`, `version`.
3. `appState.subscribe` trong `main.js` gọi `renderStatus()` mỗi khi `online`, `user` hoặc `backend` đổi; `statusInfo()` quyết định `state` (`offline`/`syncing`/`online`) và chữ hiển thị.
4. Bấm viên → `bindMenu` mở panel và `renderStatusPanel()` dựng nội dung; nút "Kiểm tra lại" gọi `refreshBackendStatus()` rồi vẽ lại.
5. Khi `net:online`: hiện toast, gọi lại `initAuth()` (nếu Firebase chưa tải được), `syncAfterReconnect()` đặt `syncing = true`, chờ `fs.waitForPendingWrites(db)` tối đa 15 giây rồi trở về "Online".
6. Song song, `conversations.js` gọi `syncConversations()` để hợp nhất lịch sử hội thoại.

**4. Hàm/lớp/API cốt lõi**
`initNetwork`, `probeBackend`, `refreshBackendStatus` (net.js); `statusInfo`, `renderStatus`, `renderStatusPanel`, `syncAfterReconnect` (main.js); Firestore `waitForPendingWrites`; `navigator.onLine`, `navigator.serviceWorker.controller`, `fetch` + `AbortController`.

**5. Trích đoạn code quan trọng**
`js/main.js`:
```js
function statusInfo() {
  const { online, user } = appState.get();
  if (!online) return { state: 'offline', text: 'Ngoại tuyến', sub: '· Lưu trên máy' };
  if (syncing) return { state: 'syncing', text: 'Đang đồng bộ', sub: '…' };
  return user ? { state: 'online', text: 'Online', sub: '· Đồng bộ Cloud' } : { state: 'online', text: 'Online', sub: '· Chế độ khách' };
}
```
Ba trạng thái hiển thị được suy ra trực tiếp từ kho trạng thái toàn cục; CSS đổi màu theo thuộc tính `data-state`.

`js/main.js`:
```js
async function syncAfterReconnect() {
  if (!appState.get().user) return;
  syncing = true;
  renderStatus();
  try {
    const { db, fs } = await firestore();
    await Promise.race([fs.waitForPendingWrites(db), new Promise((r) => setTimeout(r, 15000))]);
  } catch { /* offline again or Firebase unavailable — the pill shows the real network state */ }
  syncing = false;
  renderStatus();
}
```
Khi có mạng trở lại, ứng dụng chờ Firestore gửi hết các thao tác ghi đã xếp hàng trong lúc ngoại tuyến (giới hạn 15 giây) để trạng thái "Đang đồng bộ" phản ánh đúng thực tế.

`js/core/net.js`:
```js
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(`${getApiBase()}/api/health`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    const ok = res.ok;
    const data = ok ? await res.json().catch(() => ({})) : {};
    appState.set({ backend: { reachable: ok, checkedAt: Date.now(), providers: data?.ai?.providers || [], version: data?.version } });
```
Kiểm tra sức khỏe máy chủ AI có giới hạn thời gian 3,5 giây và không dùng bộ nhớ đệm; kết quả (danh sách nhà cung cấp AI) dùng cho bảng trạng thái và robot V-Bot.

### Chip XP

**1. Mô tả & giao diện**
Chip màu xanh lá (phông monospace) trên thanh điều hướng hiển thị tổng điểm kinh nghiệm, ví dụ "1.250 XP" kèm biểu tượng tia sét; định dạng số theo `vi-VN`. Chip ẩn khi XP bằng 0, ẩn trên màn hình ≤ 640px, và nảy lên (phóng 1,18 lần) mỗi khi XP tăng. Bấm vào chip chuyển tới `#/challenges`. Ở trang chủ khi chưa cuộn, chip dùng màu trong suốt hợp với nền tối.

**2. Các file tham gia**
- `index.html` — `a.xp-chip[data-xp-chip]`, `[data-xp-value]`, SVG tia sét nội tuyến.
- `js/main.js` — `renderXp(progress)`, `bus.on('progress:change', renderXp)`.
- `js/services/progress.js` — `totalXp`, phát `progress:change`.
- `css/shell.css` — `.xp-chip`, `.xp-chip.is-bump` (keyframes `xp-bump`), biến thể tối và trang chủ.

**3. Luồng xử lý từng bước**
1. Mỗi khi tiến độ thay đổi (hoàn thành bài/thử thách, đăng nhập, hợp nhất đám mây), `progress.js` phát `progress:change` kèm đối tượng tiến độ.
2. `renderXp()` tính `Math.round(totalXp(progress))` = XP kế thừa từ tài khoản cũ (`user.xpLegacy`) + tổng `xp` của mọi bài học và thử thách đã hoàn thành.
3. Đặt `chip.hidden = xp <= 0` và ghi giá trị định dạng `toLocaleString('vi-VN')`.
4. Nếu XP mới lớn hơn lần trước, gỡ lớp `is-bump`, ép reflow (`void chip.offsetWidth`) rồi gắn lại để chạy lại animation.

**4. Hàm/lớp/API cốt lõi**
`renderXp` (main.js), `totalXp(progress, xpLegacy)` (progress.js), sự kiện `progress:change`, `Number.prototype.toLocaleString('vi-VN')`.

**5. Trích đoạn code quan trọng**
`js/main.js`:
```js
function renderXp(progress) {
  const chip = $('[data-xp-chip]');
  const xp = Math.round(totalXp(progress));
  chip.hidden = xp <= 0;
  $('[data-xp-value]').textContent = xp.toLocaleString('vi-VN');
  if (lastXp !== null && xp > lastXp) { chip.classList.remove('is-bump'); void chip.offsetWidth; chip.classList.add('is-bump'); }
  lastXp = xp;
}
```
Kỹ thuật "gỡ lớp – ép reflow – gắn lại" cho phép chạy lại cùng một animation CSS mỗi lần XP tăng.

`js/services/progress.js`:
```js
export function totalXp(progress, xpLegacy = appState.get().user?.xpLegacy || 0) {
  let xp = Number(xpLegacy) || 0;
  for (const kind of ['lessons', 'challenges']) {
    for (const item of Object.values(progress?.[kind] || {})) xp += Number(item?.xp) || 0;
  }
  return xp;
}
```
XP không được lưu như một con số cộng dồn mà luôn được suy ra từ danh sách mục đã hoàn thành, nên hai thiết bị không bao giờ hiển thị XP khác nhau.

### Đăng nhập / Đăng ký / Quên mật khẩu / Google / Ghi nhớ đăng nhập

**1. Mô tả & giao diện**
Hộp thoại lớn (tối đa 960px) hai cột. Cột trái "Chào mừng bạn tới V-Code Edu": nền gradient chàm, họa tiết chấm, trang trí CSS 3D (2 khối lập phương xoay, 2 quả cầu trôi, quỹ đạo SVG nét đứt, ký hiệu `{ }`, `</>`), logo nổi bồng bềnh, 3 thẻ kính mờ ("n bài học chuẩn hóa", "Lớp học trực tuyến V-Code", "n chặng thử thách & AI" — số liệu thật tải từ nội dung), chân "THCS & THPT Hòa Phú" và "Bảo mật bởi Firebase". Cột phải là biểu mẫu với ba chế độ:
- Đăng nhập: Email, Mật khẩu (nút hiện/ẩn, cảnh báo Caps Lock), ô "Ghi nhớ đăng nhập", liên kết "Quên mật khẩu?", nút cam "Đăng nhập", nút "Tiếp tục với Google", liên kết "Đăng ký ngay".
- Đăng ký: Họ và tên, Email, Mật khẩu kèm thanh đo độ mạnh 4 vạch (Quá ngắn/Yếu/Trung bình/Mạnh/Rất mạnh), Nhập lại mật khẩu (kiểm tra khớp), ghi nhớ, nút "Tạo tài khoản miễn phí", "Đăng ký với Google", ghi chú bảo mật.
- Khôi phục mật khẩu: biểu tượng chìa khóa, Email, nút "Gửi liên kết đặt lại", gợi ý cho tài khoản Google, nút "Quay lại đăng nhập".
Lỗi hiển thị dạng chẩn đoán: chưa bật Email/Password trong Firebase → khối hướng dẫn 3 bước + nút mở Firebase Console; tên miền chưa được cho phép → hướng dẫn hoặc nút "Mở bằng localhost" khi đang dùng 127.0.0.1; sai mật khẩu → kèm liên kết "Quên mật khẩu?"; email đã tồn tại → "Chuyển sang đăng nhập". Biểu mẫu rung lắc khi lỗi; có cảnh báo khi ngoại tuyến. Trên màn hình ≤ 820px chuyển về một cột.

**2. Các file tham gia**
- `js/components/auth-dialog.js` — giao diện, kiểm tra biểu mẫu, xử lý lỗi, `openAuthDialog`, `requireSignIn`.
- `js/services/auth.js` — `login`, `register`, `loginWithGoogle`, `resetPassword`, `setRememberMe`, `getRememberMe`, `logout`, `changePassword`, `authError`.
- `js/services/firebase.js` — `loadFirebase`, `firebaseErrorMessage`, `emailKey`.
- `js/services/content.js` — `loadCatalog`, `loadChallenges` (số liệu thẻ).
- `js/core/ui.js` — `openModal` (kích thước `xl`, lớp `auth-modal`), `toast`.
- `js/config.js` — `FIREBASE_CONFIG.projectId` cho URL Console.
- `css/auth.css`; `js/main.js` (import động hộp thoại từ nút "Đăng nhập").

**3. Luồng xử lý từng bước**
1. Người dùng bấm "Đăng nhập" → `main.js` import động `auth-dialog.js` và gọi `openAuthDialog()`; `ensureCss()` chèn `css/auth.css` một lần.
2. `render()` dựng chế độ hiện tại, đặt tiêu đề/phụ đề từ `COPY`, hiển thị ghi chú lý do (`reason`) và cảnh báo ngoại tuyến nếu có; `go(next)` chuyển chế độ với hiệu ứng `is-switching`.
3. Khi gửi biểu mẫu, `guard()` chặn gửi lặp (`busy`), kiểm tra `form.reportValidity()`, bật trạng thái tải trên nút.
4. Đăng nhập: `setRememberMe(remember.checked)` lưu `vc-remember` và gọi `A.setPersistence` (`indexedDBLocalPersistence` hoặc `browserSessionPersistence`) → `login({ email, password })` chuẩn hóa email (bắt buộc có `@`) → `signInWithEmailAndPassword`; nếu lỗi thông tin đăng nhập thì thử `migrateLegacyAccount` (xem chức năng di trú).
5. Đăng ký: `register()` kiểm tra mật khẩu ≥ 6 ký tự → `createUserWithEmailAndPassword` → `updateProfile(displayName)` → đọc `users/{emailKey}`; nếu tài liệu cũ còn `password_hash` (hoặc bị từ chối quyền) thì xóa tài khoản vừa tạo và báo `app/legacy-account-exists`; nếu chưa có thì `setDoc` hồ sơ mới → `sendEmailVerification` → `handleSignedIn`.
6. Google: `loginWithGoogle()` dùng `GoogleAuthProvider` với `prompt: 'select_account'`, `signInWithPopup`; nếu popup bị chặn hoặc môi trường không hỗ trợ thì `signInWithRedirect` (kết quả được nhận trong `initAuth` qua `getRedirectResult`).
7. Quên mật khẩu: `resetPassword(email)` → `sendPasswordResetEmail`; hiển thị ghi chú thành công (kể cả nhắc kiểm tra thư rác).
8. Thành công: `done()` hiện toast, đóng hộp thoại (resolve với user) và chuyển tới `redirectTo` nếu có. Lỗi: `showMessage(err)` chọn khối hiển thị theo `err.code`, `shake()` rung biểu mẫu.
9. `onAuthStateChanged` trong `auth.js` cập nhật `appState.user` → thanh điều hướng, tiến độ, hội thoại tự phản ứng.

**4. Hàm/lớp/API cốt lõi**
`openAuthDialog({ mode, reason, redirectTo })`, `requireSignIn(reason)`, `passwordStrength`, `inputRow`, `googleButton`, `showMessage`, `helpBlock`, `guard` (auth-dialog.js); `login`, `register`, `loginWithGoogle`, `resetPassword`, `setRememberMe`, `getRememberMe`, `changePassword`, `authError` (auth.js); Firebase Auth: `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, `updateProfile`, `sendEmailVerification`, `GoogleAuthProvider`, `signInWithPopup`, `signInWithRedirect`, `getRedirectResult`, `sendPasswordResetEmail`, `setPersistence`, `reauthenticateWithCredential`, `updatePassword`.

**5. Trích đoạn code quan trọng**
`js/services/auth.js`:
```js
export async function setRememberMe(remember) {
  try { localStorage.setItem('vc-remember', remember ? '1' : '0'); } catch { /* storage unavailable */ }
  const { auth, A } = await requireFb();
  try {
    await A.setPersistence(auth, remember ? A.indexedDBLocalPersistence : A.browserSessionPersistence);
  } catch (err) {
    console.warn('[auth] persistence change failed', err?.code);
  }
}
```
"Ghi nhớ đăng nhập" ánh xạ trực tiếp sang chế độ lưu phiên của Firebase: lưu bền trong IndexedDB (giữ qua lần mở trình duyệt sau) hoặc chỉ trong phiên (đăng xuất khi đóng trình duyệt).

`js/services/auth.js`:
```js
  try {
    const cred = await A.signInWithPopup(auth, provider);
    return cred.user;
  } catch (err) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(err?.code)) {
      await A.signInWithRedirect(auth, provider);
      return null;
    }
    throw authError(err);
  }
```
Đăng nhập Google ưu tiên cửa sổ bật lên và tự chuyển sang phương thức chuyển hướng khi popup bị chặn.

`js/components/auth-dialog.js`:
```js
function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = pw.length < 6 ? 0 : Math.min(4, Math.max(1, score - 1));
  return { level, label: ['Quá ngắn', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][level] };
}
```
Độ mạnh mật khẩu được chấm theo độ dài, chữ hoa/thường, chữ số và ký tự đặc biệt; `level` gán vào `data-level` để CSS tô màu số vạch tương ứng.

### Di trú tài khoản cũ (legacy hash)

**1. Mô tả & giao diện**
Phiên bản cũ của V-Code Edu lưu mật khẩu dạng băm ngay trong tài liệu Firestore (`password_hash`). Phiên bản mới chuyển sang Firebase Authentication mà không bắt người dùng đăng ký lại: người dùng chỉ cần đăng nhập bằng email + mật khẩu cũ trong hộp thoại thông thường. Nếu thành công, một toast màu xanh hiện 6 giây: "Tài khoản cũ của bạn đã được nâng cấp lên Firebase Authentication an toàn." và mọi dữ liệu cũ (XP, hồ sơ) được giữ nguyên. Người dùng Google đã xác minh email trùng có thể "nhận" tài liệu cũ tự động. Khi đăng ký mới trùng email tài khoản cũ, hệ thống chặn và yêu cầu đăng nhập bằng mật khẩu cũ.

**2. Các file tham gia**
- `js/services/auth.js` — `login` (kích hoạt di trú), `migrateLegacyAccount`, `ensureProfile` (nhánh Google và dọn dẹp trường cũ), `register` (chặn chiếm tài khoản cũ).
- `js/core/crypto.js` — `legacyPasswordProofs`, `sha256Hex`, `sha256Fallback`.
- `js/services/firebase.js` — `emailKey` (khóa tài liệu giống hệt `docKey()` cũ).
- `js/main.js` — toast cho sự kiện `auth:migrated`.
- `firestore.rules` (ngoài phạm vi chi tiết) — quy tắc so khớp `legacy_claim` với `password_hash` phía máy chủ (được tham chiếu trong chú thích của `auth.js`).

**3. Luồng xử lý từng bước**
1. `login()` gọi `signInWithEmailAndPassword`; nếu lỗi thuộc nhóm `auth/invalid-credential`, `auth/user-not-found`, `auth/wrong-password`, `auth/invalid-login-credentials` thì gọi `migrateLegacyAccount(email, password)`.
2. Thử `createUserWithEmailAndPassword` với chính mật khẩu đó; nếu báo `auth/email-already-in-use` (đã có tài khoản Auth thật → mật khẩu sai) hoặc `auth/weak-password` thì trả `false`.
3. Tính các bằng chứng `legacyPasswordProofs(password)`: SHA-256 hex của `'vcode_salt_2026_' + password` và `btoa('vc_' + password)`.
4. Nếu quy tắc mở cho phép đọc tài liệu: kiểm tra cục bộ tài liệu tồn tại và `password_hash` khớp một bằng chứng; không khớp thì `rollback()` (xóa tài khoản Auth vừa tạo).
5. Với quy tắc nghiêm ngặt: lần lượt `updateDoc` với `legacy_claim: proof`, xóa `password_hash`, ghi `uid`, `auth_provider: 'password'`, `migrated_at`; máy chủ chỉ chấp nhận nếu `legacy_claim` bằng hash đã lưu. Gặp `permission-denied` thì thử bằng chứng tiếp theo, `not-found` thì dừng.
6. Không bằng chứng nào được chấp nhận → rollback, trả `false` → hộp thoại báo sai mật khẩu.
7. Thành công: xóa `legacy_claim`, cập nhật `displayName` từ `full_name` cũ, `handleSignedIn(user)`, phát `auth:migrated`.
8. Nhánh Google trong `ensureProfile`: nếu đọc hồ sơ bị `permission-denied` (vì còn hash cũ) và người dùng đăng nhập qua `google.com`, thực hiện `updateDoc` xóa `password_hash`, ghi `claimed_via: 'google'`, `migrated_at`.
9. Mỗi lần đăng nhập, `ensureProfile` còn xóa `password_hash`/`legacy_claim` nếu sót lại và chuyển `xp` cũ thành `xp_legacy`.

**4. Hàm/lớp/API cốt lõi**
`migrateLegacyAccount`, `login`, `ensureProfile`, `register` (auth.js); `legacyPasswordProofs`, `sha256Hex`, `sha256Fallback` (crypto.js); Firestore `updateDoc`, `deleteField`, `serverTimestamp`; Web Crypto `crypto.subtle.digest('SHA-256')`.

**5. Trích đoạn code quan trọng**
`js/services/auth.js`:
```js
    // Strict rules: the server compares legacy_claim with the stored hash.
    let claimed = false;
    for (const proof of proofs) {
      try {
        await fs.updateDoc(ref, { legacy_claim: proof, password_hash: fs.deleteField(), uid: user.uid, auth_provider: 'password', migrated_at: fs.serverTimestamp() });
        claimed = true;
        break;
      } catch (err) {
        if (err?.code === 'not-found') break;
        if (err?.code !== 'permission-denied') throw err;
      }
    }
    if (!claimed) { await rollback(); return false; }
```
Trình duyệt không cần đọc được hash cũ: nó gửi "bằng chứng" và để quy tắc bảo mật Firestore so khớp phía máy chủ; chỉ khi khớp thì việc xóa hash và gắn `uid` mới được chấp nhận.

`js/core/crypto.js`:
```js
export async function legacyPasswordProofs(password) {
  const proofs = [await sha256Hex(`vcode_salt_2026_${password}`)];
  try { proofs.push(btoa(unescape(encodeURIComponent(`vc_${password}`)))); } catch { /* ignore */ }
  return proofs;
}
```
Sinh cả hai dạng mà ứng dụng cũ từng lưu (SHA-256 có muối cố định, hoặc Base64 khi chạy trong ngữ cảnh không có `crypto.subtle`).

### Hồ sơ người dùng Firestore

**1. Mô tả & giao diện**
Sau khi đăng nhập, ứng dụng hiển thị ngay tên, email, ảnh đại diện, vai trò của người dùng trên thanh điều hướng và ngăn kéo — kể cả khi ngoại tuyến (dùng bản lưu đệm). Hồ sơ đầy đủ nằm tại tài liệu Firestore `users/{emailKey}` và được theo dõi theo thời gian thực: khi hồ sơ thay đổi (ví dụ chọn vai trò, đổi tên ở trang tài khoản, hoặc tiến độ được ghi từ thiết bị khác) giao diện tự cập nhật. Nếu quy tắc Firestore chưa được triển khai đúng, toast cảnh báo 8 giây "Không đọc được hồ sơ trên máy chủ (quyền truy cập)…".

**2. Các file tham gia**
- `js/services/auth.js` — `baseProfile`, `toSessionUser`, `ensureProfile`, `watchProfile`, `handleSignedIn`, `initAuth`.
- `js/services/firebase.js` — `emailKey`, `loadFirebase` (Firestore có bộ đệm bền).
- `js/core/idb.js` — `kv` lưu đệm `profile:<key>`.
- `js/core/store.js` — `appState.user`.
- `js/services/classroom.js` — `chooseRole` cập nhật `role`, `school_name`, `class_name`.
- `js/main.js` — hiển thị và toast `auth:profile-denied`.

**3. Luồng xử lý từng bước**
1. `initAuth()` tải Firebase (nếu thất bại đặt `firebaseUnavailable: true`, `authReady: true` và cho phép thử lại), xử lý `getRedirectResult`, đăng ký `onAuthStateChanged`.
2. Khi có người dùng có email → `handleSignedIn(user)`: đọc `kv['profile:<key>']` và đặt ngay `appState.user` (hoặc hồ sơ cơ bản), `authReady: true`.
3. `ensureProfile(user)`: đọc `users/{key}`; nếu chưa tồn tại thì `setDoc` hồ sơ cơ bản (`email`, `username`, `full_name`, `role: 'none'`, `auth_provider`, `school_name`, `class_name`, `avatar_url`, `uid`, `created_at`, `updated_at`).
4. Nếu đã tồn tại: lập bản vá bổ sung `uid`, `avatar_url`, `full_name` còn thiếu, `xp_legacy` từ `xp`, xóa `password_hash`/`legacy_claim`; gửi `updateDoc` không chờ.
5. Đặt lại `appState.user = toSessionUser(user, profile)`, lưu đệm vào `kv`, gọi `watchProfile(user)` (`onSnapshot`) để cập nhật liên tục (luôn loại bỏ `password_hash`, `legacy_claim`).
6. Phát `auth:signed-in`. Khi đăng xuất: hủy listener, `appState.user = null`, phát `auth:signed-out`.
7. `getIdToken()` cung cấp token cho backend; nếu token hết hạn/tài khoản bị khóa thì phát lỗi và tự đăng xuất.

**4. Hàm/lớp/API cốt lõi**
`initAuth`, `handleSignedIn`, `ensureProfile`, `watchProfile`, `toSessionUser`, `baseProfile`, `getIdToken`, `currentUser`, `hasPasswordProvider`, `firestore` (auth.js); `emailKey` (firebase.js); Firestore `doc`, `getDoc`, `setDoc`, `updateDoc`, `onSnapshot`, `deleteField`, `serverTimestamp`.

**5. Trích đoạn code quan trọng**
`js/services/auth.js`:
```js
async function handleSignedIn(user) {
  const key = emailKey(user.email);
  // 1) Instant UI from cache (works offline)
  const cached = await kv.get(PROFILE_CACHE(key), null);
  appState.set({ user: toSessionUser(user, cached || baseProfile(user)), authReady: true });
  // 2) Authoritative profile from Firestore (cached by Firestore offline persistence)
  try {
    const profile = await ensureProfile(user);
    appState.set({ user: toSessionUser(user, profile) });
    kv.set(PROFILE_CACHE(key), profile).catch(() => {});
    watchProfile(user);
```
Hai bước: hiển thị tức thì từ bộ đệm IndexedDB (chạy cả khi ngoại tuyến), sau đó thay bằng hồ sơ chính thức từ Firestore và theo dõi thời gian thực.

`js/services/firebase.js`:
```js
export function emailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
}
```
Khóa tài liệu suy ra từ email theo đúng công thức của ứng dụng cũ, nhờ đó dữ liệu cũ ánh xạ 1:1 sang phiên bản mới.

### Tiến độ học tập & đồng bộ đám mây & bảng xếp hạng

**1. Mô tả & giao diện**
Mỗi bài học hoặc chặng thử thách hoàn thành được ghi nhận kèm thời điểm và số XP. Khách (chưa đăng nhập) vẫn có tiến độ lưu trên máy; khi đăng nhập, tiến độ khách được chuyển vào tài khoản, hợp nhất với dữ liệu đám mây và đồng bộ giữa các thiết bị. Tiến độ cũ lưu trong localStorage của ứng dụng cũ (`vcode_completed_challenges`) được nhập một lần. Bảng xếp hạng (`leaderboard`) lưu tên, XP, trường của từng người dùng và được truy vấn theo XP giảm dần (mặc định 20 người). Các trang hiển thị (học, thử thách, tài khoản) nằm ngoài phạm vi tài liệu này.

**2. Các file tham gia**
- `js/services/progress.js` — toàn bộ logic.
- `js/core/idb.js` — `kv['progress:<owner>']`, `kv['legacy-import-done']`.
- `js/services/auth.js` — `firestore()`, `appState.user.profile.progress`, `xpLegacy`.
- `js/services/content.js` — `loadChallenges` (lấy XP chuẩn khi nhập dữ liệu cũ).
- `js/core/dom.js` — `debounce`.
- `js/main.js` — `initProgress()`, chip XP.

**3. Luồng xử lý từng bước**
1. `initProgress()` đăng ký theo dõi `appState`; mỗi khi khóa người dùng đổi hoặc `user.profile.progress` (từ `onSnapshot`) đổi thì gọi `reconcile()`.
2. `reconcile()` khi chưa đăng nhập: nạp `progress:guest` và phát `progress:change`.
3. Khi đã đăng nhập: nạp `progress:<key>`; nếu có tiến độ khách thì `mergeInto` vào tài khoản và đặt lại tiến độ khách rỗng.
4. `importLegacyLocal()` (chỉ một lần, đánh dấu `legacy-import-done`): đọc mảng id dạng `stage-<số>` từ localStorage, lấy XP từ `challenges.json` (mặc định 100), đánh dấu `legacy: true`.
5. Hợp nhất đám mây → cục bộ bằng `mergeInto(mine, remote)`: hợp (union) các mục, giữ thời điểm hoàn thành sớm nhất.
6. Nếu có thay đổi thì `save()` (ghi `kv`, phát `progress:change`).
7. Đẩy cục bộ → đám mây chỉ những mục mà đám mây còn thiếu, bằng `updateDoc` theo đường dẫn trường `progress.<kind>.<id>`.
8. `pushLeaderboard()` (debounce 2,5 giây) ghi `leaderboard/{key}` = `{ name, xp, school, updated_at }`.
9. Khi người học hoàn thành mục mới, trang gọi `markComplete(kind, id, xp)`: chỉ lần đầu mới ghi `{ at, xp }`, lưu, đẩy lên mây và cập nhật bảng xếp hạng; trả về `{ firstTime, xp }`.
10. Ghi Firestore khi ngoại tuyến được bộ đệm bền xếp hàng và tự gửi khi có mạng.

**4. Hàm/lớp/API cốt lõi**
`getProgress`, `isDone`, `totalXp`, `markComplete`, `initProgress`, `loadLeaderboard`, nội bộ `load`, `save`, `mergeInto`, `importLegacyLocal`, `reconcile`, `pushItem`, `pushLeaderboard` (progress.js); Firestore `FieldPath`, `updateDoc`, `setDoc`, `query`, `orderBy('xp', 'desc')`, `limit`.

**5. Trích đoạn code quan trọng**
`js/services/progress.js`:
```js
function mergeInto(target, source) {
  let changed = false;
  for (const kind of ['lessons', 'challenges']) {
    for (const [id, val] of Object.entries(source?.[kind] || {})) {
      const mine = target[kind][id];
      if (!mine || (val?.at && val.at < mine.at)) {
        target[kind][id] = { at: Number(val?.at) || Date.now(), xp: Number(val?.xp) || 0 };
        changed = true;
      }
    }
  }
  return changed;
}
```
Chiến lược hợp nhất không xung đột: một mục đã hoàn thành ở bất kỳ nơi nào đều được giữ lại, và nếu hai bên cùng có thì lấy thời điểm sớm hơn.

`js/services/progress.js`:
```js
    const { db, fs } = await firestore();
    // updateDoc is queued by Firestore's offline persistence and synced automatically when back online.
    await fs.updateDoc(fs.doc(db, 'users', user.key), new fs.FieldPath('progress', kind, id), value, 'updated_at', fs.serverTimestamp());
```
Ghi ở mức từng trường lồng nhau (`progress.lessons.<id>`) thay vì ghi đè cả đối tượng, nên hai thiết bị ghi đồng thời không làm mất dữ liệu của nhau.

### Lịch sử hội thoại AI & đồng bộ

**1. Mô tả & giao diện**
Mọi cuộc trò chuyện với V-Mentor (trên trang Trợ lý AI hoặc khung trò chuyện nhanh của robot) được lưu trên máy, có thể tìm kiếm theo tiêu đề/nội dung, ghim, đổi tên, xóa. Tiêu đề tự sinh từ câu hỏi đầu tiên (bỏ khối mã và ký tự Markdown, tối đa 60 ký tự). Khi đăng nhập, lịch sử đồng bộ lên Firestore để dùng trên nhiều thiết bị; các cuộc trò chuyện tạo khi còn là khách được "nhận nuôi" vào tài khoản. Giao diện danh sách nằm ở trang AI (ngoài phạm vi).

**2. Các file tham gia**
- `js/services/conversations.js` — toàn bộ logic.
- `js/core/idb.js` — store `conversations`.
- `js/core/dom.js` — `uid`, `debounce`.
- `js/services/auth.js` — `firestore()`.
- `js/components/vbot.js` — tạo/lưu hội thoại từ khung chat nhanh.
- `js/main.js` — `initConversationSync()`.

**3. Luồng xử lý từng bước**
1. `createConversation({ mode, title })` tạo bản ghi `{ id: uid('c'), owner, title, mode, messages: [], createdAt, updatedAt, autoTitle: true }` trong IndexedDB và phát `conversations:change`.
2. `saveConversation(c)` cập nhật `updatedAt`, lưu cục bộ, rồi `scheduleSync(id)` (gom thay đổi trong 1,5 giây).
3. `pushOne(id)`: nếu bản ghi đã xóa thì `deleteDoc`, ngược lại `setDoc(users/{key}/conversations/{id}, toCloud(c))` (tối đa 80 tin nhắn, mỗi tin ≤ 16000 ký tự, lỗi ≤ 500 ký tự); thành công thì ghi `syncedAt`. Lỗi chỉ ghi cảnh báo (đồng bộ sau).
4. `deleteConversation(id)` đánh dấu `deleted: true`, xóa tin nhắn (bia mộ cục bộ) rồi đẩy lệnh xóa.
5. `initConversationSync()`: khi khóa người dùng đổi → `syncConversations()`; khi `net:online` → `syncConversations()`.
6. `syncConversations()` (debounce 800 ms): nhận nuôi hội thoại khách có tin nhắn; tải toàn bộ `users/{key}/conversations`; với mỗi bản đám mây mới hơn (hoặc chưa có cục bộ, và cục bộ chưa bị xóa) thì ghi đè cục bộ; với mỗi bản cục bộ đã xóa, chưa có trên mây hoặc mới hơn thì đẩy lên.
7. `listConversations({ query })` lọc theo chủ sở hữu, bỏ bản đã xóa, tìm kiếm không phân biệt hoa thường, sắp xếp: ghim trước, rồi `updatedAt` giảm dần.

**4. Hàm/lớp/API cốt lõi**
`listConversations`, `getConversation`, `createConversation`, `saveConversation`, `renameConversation`, `deleteConversation`, `deriveTitle`, `syncConversations`, `initConversationSync`, nội bộ `scheduleSync`, `toCloud`, `pushOne`, `pushDelete` (conversations.js); Firestore `setDoc`, `deleteDoc`, `getDocs`, `collection`.

**5. Trích đoạn code quan trọng**
`js/services/conversations.js`:
```js
    for (const [id, r] of remote) {
      const l = localMap.get(id);
      if (!l || (!l.deleted && (r.updatedAt || 0) > (l.updatedAt || 0))) {
        await idb.put('conversations', { id, owner: user.key, title: r.title, mode: r.mode, pinned: r.pinned, messages: r.messages || [], createdAt: r.createdAt || Date.now(), updatedAt: r.updatedAt || Date.now(), syncedAt: Date.now() });
      }
    }
    for (const l of localAll) {
      const r = remote.get(l.id);
      if (l.deleted || !r || (l.updatedAt || 0) > (r.updatedAt || 0)) pushOne(l.id);
    }
```
Chính sách "ghi sau thắng" theo `updatedAt` cho từng cuộc trò chuyện; bản xóa cục bộ (bia mộ) luôn được ưu tiên đẩy lên để xóa trên mây.

`js/services/conversations.js`:
```js
export function deriveTitle(text) {
  const t = String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
  return t ? (t.length > 60 ? `${t.slice(0, 57)}…` : t) : 'Cuộc trò chuyện mới';
}
```
Tiêu đề tự động được làm sạch khỏi khối mã và ký hiệu Markdown, cắt còn 57 ký tự kèm dấu "…" nếu dài.

### Ứng dụng khách AI (SSE, xử lý lỗi, hosting tĩnh)

**1. Mô tả & giao diện**
Trợ lý AI V-Mentor gọi cổng AI của backend FastAPI (`/api/ai/chat`) và nhận câu trả lời dạng luồng (Server-Sent Events), nên chữ xuất hiện dần như đang gõ. Khóa API của nhà cung cấp AI chỉ nằm trên máy chủ; trình duyệt chỉ gửi Firebase ID token (nếu đã đăng nhập). Ứng dụng có 7 chế độ: Gia sư lập trình, Gỡ lỗi, Review code, Giải thích thuật toán, Trợ lý học tập, Phát triển dự án, Hỏi đáp kiến thức (mỗi chế độ có mô tả và 3 câu hỏi gợi ý). Lỗi được báo bằng tiếng Việt cụ thể: chưa có máy chủ (hosting tĩnh như GitHub Pages), ngoại tuyến, không kết nối được, địa chỉ không phải máy chủ V-Code (405/404), vượt giới hạn (429), chưa xác thực (401).

**2. Các file tham gia**
- `js/services/ai-client.js` — `streamChat`, `trimHistory`, `fetchProviders`, `fetchUsage`, `AIError`, `NO_BACKEND_MESSAGE`.
- `js/services/ai-modes.js` — `AI_MODES`, `modeById`, `localSystemPrompt`.
- `js/config.js` — `getApiBase`, `setApiBase`, `isStaticHost`, `DEFAULT_API_BASE`.
- `js/services/auth.js` — `getIdToken`.
- `js/core/store.js` — `appState.online`.
- `js/components/vbot.js` — người dùng của `streamChat` (trang `js/pages/ai.js` ngoài phạm vi).

**3. Luồng xử lý từng bước**
1. `getApiBase()` xác định địa chỉ máy chủ theo thứ tự ưu tiên (cài đặt người dùng `vc-api-base` → `window.VCODE_API_BASE` → `DEFAULT_API_BASE` → rỗng nếu là hosting tĩnh → cùng origin → `http://localhost:8000`).
2. `streamChat()` gọi `requireBackend()`; không có địa chỉ thì ném `AIError('no_backend', NO_BACKEND_MESSAGE)`.
3. Nếu ngoại tuyến và máy chủ không thuộc mạng nội bộ → ném lỗi `offline` gợi ý dùng "AI trên trình duyệt".
4. `trimHistory(messages)`: chỉ giữ tin `user`/`assistant` có nội dung và không lỗi, mỗi tin ≤ 12000 ký tự, tối đa 40 tin, tổng ≤ 56000 ký tự (lấy từ cuối), bỏ các tin đầu cho tới khi tin đầu tiên là của người dùng.
5. `fetch POST /api/ai/chat` với `authHeaders()` (Bearer token) và thân `{ messages, mode, provider, context }`; lỗi mạng → `AIError('network', …)`.
6. Phản hồi không OK: đọc `detail`; 405 hoặc 404 không có `detail` → `no_backend`; còn lại dùng `detail.code` hoặc suy từ mã HTTP (429 `rate_limited`, 401 `unauthorized`, khác `http_error`).
7. Đọc luồng bằng `res.body.getReader()` + `TextDecoder`, tách khối theo dòng trống, phân tích `event:` và `data:` (JSON, dự phòng văn bản), `yield { type, data }`; dừng khi gặp `done` hoặc `error`; luôn `releaseLock()` trong `finally`.
8. Phía gọi xử lý `meta` (provider, model), `delta` (nối `text`), `error` (ném `AIError`).

**4. Hàm/lớp/API cốt lõi**
`AIError`, `trimHistory`, `fetchProviders` (bộ đệm 30 giây), `fetchUsage`, `streamChat` (async generator), `authHeaders`, `requireBackend` (ai-client.js); `AI_MODES`, `modeById`, `localSystemPrompt` (ai-modes.js); `getApiBase`, `setApiBase`, `isStaticHost` (config.js); `ReadableStream.getReader`, `TextDecoder`.

**5. Trích đoạn code quan trọng**
`js/services/ai-client.js`:
```js
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.search(/\r?\n\r?\n/)) !== -1) {
        const block = buffer.slice(0, idx);
        buffer = buffer.slice(idx).replace(/^\r?\n\r?\n/, '');
        let event = 'message';
        const dataLines = [];
        for (const line of block.split(/\r?\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^ /, ''));
        }
        if (!dataLines.length) continue;
        let data;
        try { data = JSON.parse(dataLines.join('\n')); } catch { data = { text: dataLines.join('\n') }; }
        yield { type: event, data };
        if (event === 'done' || event === 'error') return;
      }
```
Bộ phân tích SSE tự viết trên `fetch` (thay vì `EventSource`) để có thể gửi POST kèm header xác thực; mỗi khối sự kiện được chuyển thành đối tượng `{ type, data }` cho giao diện.

`js/config.js`:
```js
export function getApiBase() {
  try {
    const saved = localStorage.getItem(API_OVERRIDE_KEY);
    if (saved) return saved.replace(/\/+$/, '');
  } catch { /* storage unavailable */ }
  if (typeof window !== 'undefined' && window.VCODE_API_BASE) return String(window.VCODE_API_BASE).replace(/\/+$/, '');
  if (DEFAULT_API_BASE) return DEFAULT_API_BASE.replace(/\/+$/, '');
  if (isStaticHost()) return ''; // no backend on static hosting
  if (location.port === '8000' || location.pathname.startsWith('/app')) return location.origin;
  if (location.protocol === 'https:' && !/^(localhost|127\.)/.test(location.hostname)) return location.origin;
  return 'http://localhost:8000';
}
```
Địa chỉ máy chủ AI có thể được nhà trường tùy chỉnh (ví dụ máy chủ LAN); trên hosting tĩnh trả chuỗi rỗng để giao diện báo rõ "chưa có máy chủ AI" thay vì gửi yêu cầu thất bại.

### AI ngoại tuyến trên trình duyệt (WebLLM)

**1. Mô tả & giao diện**
Tùy chọn "AI trên trình duyệt" chạy một mô hình ngôn ngữ nhỏ ngay trên máy người dùng bằng WebLLM và WebGPU. Sau lần tải mô hình đầu tiên (trình duyệt lưu đệm), AI hoạt động không cần Internet. Trạng thái được báo qua các mức: chưa tải, đang tải (có phần trăm và mô tả), sẵn sàng ("Sẵn sàng: <tên mô hình>"), lỗi, không hỗ trợ ("Trình duyệt này chưa hỗ trợ WebGPU (cần Chrome/Edge bản mới trên máy tính)."). Chất lượng thấp hơn mô hình đám mây. Robot V-Bot tự dùng mô hình này khi nó đã sẵn sàng và máy chủ AI không khả dụng.

**2. Các file tham gia**
- `js/services/local-ai.js` — tải mô hình, trạng thái, sinh luồng.
- `js/services/ai-modes.js` — `localSystemPrompt` (lời nhắc hệ thống tiếng Việt theo chế độ).
- `js/config.js` — `WEBLLM_URL`.
- `js/core/idb.js` — `kv['local-ai:model']`.
- `js/components/vbot.js` — lựa chọn dùng AI cục bộ.

**3. Luồng xử lý từng bước**
1. `isWebGPUAvailable()` kiểm tra `navigator.gpu`; không có → trạng thái `unsupported` và ném lỗi.
2. `loadLocalModel()` (chỉ một lần nhờ biến `loading`): trạng thái `loading` "Đang tải thư viện WebLLM…", import động `WEBLLM_URL`.
3. Lấy danh sách mô hình có sẵn `prebuiltAppConfig.model_list`; chọn mô hình theo thứ tự: mô hình đã lưu trong `kv`, rồi `PREFERRED_MODELS`, rồi mô hình đầu tiên có tên chứa 0.5B/1B/1.5B, cuối cùng là mô hình đầu danh sách.
4. `CreateMLCEngine(modelId, { initProgressCallback })` cập nhật phần trăm tải; xong thì lưu `kv['local-ai:model']` và đặt trạng thái `ready`.
5. Lỗi: đặt lại `loading`/`engine`, trạng thái `error`.
6. `streamLocal({ messages, system, signal })`: gửi lời nhắc hệ thống + 12 tin gần nhất, `stream: true`, `temperature: 0.5`, `max_tokens: 1024`; `yield` từng đoạn văn bản; nếu `signal` bị hủy thì gọi `interruptGenerate()`.
7. Các thành phần giao diện đăng ký `onLocalStatus(fn)` để nhận thông báo thay đổi trạng thái.

**4. Hàm/lớp/API cốt lõi**
`isWebGPUAvailable`, `wasDownloaded`, `loadLocalModel`, `localStatus`, `onLocalStatus`, `localModelName`, `streamLocal` (local-ai.js); `localSystemPrompt` (ai-modes.js); WebLLM `CreateMLCEngine`, `engine.chat.completions.create`, `interruptGenerate`; WebGPU `navigator.gpu`.

**5. Trích đoạn code quan trọng**
`js/services/local-ai.js`:
```js
      const available = (webllm.prebuiltAppConfig?.model_list || []).map((m) => m.model_id);
      const saved = await kv.get('local-ai:model', null);
      modelId = [saved, ...PREFERRED_MODELS].find((id) => id && available.includes(id)) || available.find((id) => /0\.5B|1B|1\.5B/i.test(id)) || available[0];
      if (!modelId) throw new Error('Không tìm thấy mô hình phù hợp trong WebLLM.');
      engine = await webllm.CreateMLCEngine(modelId, {
        initProgressCallback: (p) => setStatus({ state: 'loading', progress: Math.round((p.progress || 0) * 100), text: p.text || 'Đang tải mô hình…' }),
      });
```
Mô hình được chọn ưu tiên bản đã tải trước đó trên thiết bị (tránh tải lại), sau đó tới danh sách mô hình nhỏ phù hợp với máy học sinh.

`js/services/local-ai.js`:
```js
  for await (const chunk of chunks) {
    if (signal?.aborted) {
      try { await eng.interruptGenerate(); } catch { /* noop */ }
      return;
    }
    const text = chunk?.choices?.[0]?.delta?.content;
    if (text) yield text;
  }
```
Luồng trả lời theo định dạng tương thích OpenAI; nút "Dừng" trên giao diện hủy `signal` và mô hình được yêu cầu ngắt sinh văn bản ngay.

### Chạy mã đa ngôn ngữ (Python/Pyodide, C/C++/JSCPP, SQL/sql.js, JS worker, HTML iframe, timeout)

**1. Mô tả & giao diện**
Học sinh có thể viết và chạy mã trực tiếp trên trình duyệt với 7 ngôn ngữ: Python 3 (Pyodide, CPython 3.12 WebAssembly), Python Tiếng Việt, JavaScript (Web Worker), C và C++ (JSCPP, tập con không có STL), SQL (SQLite qua sql.js, có cơ sở dữ liệu mẫu tiếng Việt về lớp, học sinh, môn học, điểm) và HTML/CSS/JS (khung xem trước iframe sandbox). Kết quả xuất ra theo luồng; có ô "Dữ liệu vào" (stdin) cho `input()`; lỗi Python hiển thị traceback gọn với tên tệp của học sinh; lỗi JavaScript kèm số dòng/cột; SQL in bảng ASCII và số dòng. Chương trình bị dừng nếu chạy quá thời gian (Python/C/C++ 12 giây, JS 6 giây, SQL 8 giây) với thông báo có thể lặp vô hạn. Giao diện IDE nằm ngoài phạm vi; các thành phần trong phạm vi cung cấp động cơ chạy.

**2. Các file tham gia**
- `js/runtime/runner.js` — điều phối, `WorkerHost`, giới hạn thời gian, xem trước HTML.
- `js/runtime/python.worker.js`, `js/runtime/cpp.worker.js`, `js/runtime/js.worker.js`, `js/runtime/sql.worker.js` — các worker.
- `js/runtime/pyvn.js` — dịch Python Tiếng Việt trước khi chạy.
- `js/config.js` — `PYODIDE_BASE`.
- `js/core/dom.js` — `uid`.
- `vendor/jscpp/JSCPP.es5.min.js`, `vendor/sqljs/sql-wasm.js` + `.wasm` (thư viện vendored được worker nạp).

**3. Luồng xử lý từng bước**
1. Giao diện gọi `runCode({ lang, code, stdin, onOutput, signal, files, mainName })`. Với `pyvn`, mã được dịch bằng `translatePyvn` trước.
2. `host(lang)` lấy/tạo `WorkerHost` (pyvn dùng worker Python; C và C++ dùng chung một worker JSCPP).
3. Với Python trong IDE (không chấm bài), các tệp cùng dự án được gửi kèm để `import` hoạt động.
4. `WorkerHost.run()` xếp hàng tuần tự (`this.queue`), sinh `id` duy nhất, `spawn()` worker nếu chưa có (Python gửi `init` với `indexURL` của Pyodide và chuyển trạng thái `loading`).
5. Bộ hẹn giờ bắt đầu ngay, riêng Python khi đang tải thì chỉ bắt đầu sau khi worker báo `ready` (không tính thời gian tải Pyodide).
6. Worker gửi `stdout`/`stderr` (gom vào chuỗi, tối đa 200.000 ký tự mỗi luồng, đánh dấu `truncated`), `tables` (SQL) và `done` (ok, error, durationMs).
7. Hết thời gian → `kill()` (terminate worker để dừng vòng lặp vô hạn) và trả `{ ok: false, timedOut: true }`. Người dùng bấm dừng (`signal`) → `kill()` và trả `aborted: true`.
8. Python worker: thay `input()` bằng hàm đọc stdin, đồng bộ tệp dự án vào `/home/pyodide/vc_project`, `loadPackagesFromImports`, `runPythonAsync`, làm sạch traceback.
9. C/C++ worker: nạp JSCPP với "giả lập window", chạy `JSCPP.run` (`maxTimeout: 15000`), xả đệm stdout mỗi 4096 ký tự hoặc 50 ms, gợi ý khi dùng STL.
10. JS worker: thực thi mã trong `AsyncFunction` "use strict" với `console`, `input`, `prompt`, `readline` tự định nghĩa.
11. SQL worker: tạo `Database` mới, chạy `SAMPLE_DB`, thực thi mã, in bảng ASCII hoặc "Thực thi thành công. Số dòng bị thay đổi: n.".
12. HTML: `renderPreview(iframe, parts, { onConsole })` đặt `sandbox="allow-scripts allow-modals allow-forms"` (không có `allow-same-origin`), dựng `srcdoc` bằng `buildWebDocument` kèm cầu nối console dùng `nonce` và `postMessage`.

**4. Hàm/lớp/API cốt lõi**
`LANGUAGES`, `WorkerHost` (`spawn`, `handle`, `run`, `kill`, `warmup`, `onStatus`), `host`, `warmup`, `onRuntimeStatus`, `runCode`, `normalizeOutput`, `buildWebDocument`, `renderPreview` (runner.js); `init`, `run`, `cleanTraceback`, `syncProjectFiles`, `PRELUDE` (python.worker.js); `ensureLoaded`, `friendlyError` (cpp.worker.js); `fmt` (js.worker.js); `ensure`, `formatTable`, `SAMPLE_DB` (sql.worker.js); Web Worker, `importScripts`, iframe `sandbox`/`srcdoc`, `postMessage`.

**5. Trích đoạn code quan trọng**
`js/runtime/runner.js`:
```js
      const startTimer = () => {
        timer = setTimeout(() => {
          this.kill(); // stop infinite loops
          finish({ ok: false, timedOut: true, error: `Hết thời gian chạy (${Math.round(timeoutMs / 1000)} giây). Có thể chương trình bị lặp vô hạn hoặc đang chờ thêm dữ liệu vào.` });
        }, timeoutMs);
      };
      if (this.kind === 'python' && this.status === 'loading') {
        // Do not count Pyodide download time against the program's time limit.
        const off = this.onStatus((s) => { if (s === 'ready' || s === 'busy') { off(); startTimer(); } });
      } else {
        startTimer();
      }
```
Vì mã học sinh chạy trong worker riêng, cách duy nhất và chắc chắn để dừng vòng lặp vô hạn là `terminate()` worker; thời gian tải Pyodide lần đầu không bị tính vào giới hạn.

`js/runtime/python.worker.js`:
```js
def __vc_input(prompt=""):
    if prompt and not __vc_grading:
        sys.stdout.write(str(prompt))
    if __vc_pos[0] >= len(__vc_lines):
        raise EOFError("Chương trình cần thêm dữ liệu vào (input) nhưng ô Dữ liệu vào đã hết dòng.")
    line = __vc_lines[__vc_pos[0]]
    __vc_pos[0] += 1
    if not __vc_grading:
        sys.stdout.write(line + "\\n")
    return line
builtins.input = __vc_input
```
Đoạn Python khởi đầu thay thế `input()` để đọc từng dòng từ ô dữ liệu vào; khi chấm bài, lời nhắc và dòng nhập không được in ra để không làm sai kết quả so sánh.

`js/runtime/js.worker.js`:
```js
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    const fn = new AsyncFunction('console', 'input', 'prompt', 'readline', `"use strict";\n${code}`);
    await fn(sandboxConsole, input, input, input);
```
Mã JavaScript chạy trong worker không có DOM, với `console` và các hàm nhập liệu được truyền vào làm tham số; hỗ trợ cả `await` ở cấp cao nhất.

### Python Tiếng Việt (pyvn)

**1. Mô tả & giao diện**
"Python Tiếng Việt" cho phép học sinh viết Python bằng từ khóa tiếng Việt không dấu (ví dụ các từ được tô màu như `neu`, `nguoc_lai`, `lap_voi`, `trong_khoang`, `khi_ma`, `ham`, `tra_ve`, hàm `in_ra`, `nhap_so`…). Trước khi chạy, mã được dịch sang Python chuẩn rồi chạy bằng Pyodide. Việc dịch chỉ diễn ra ngoài chuỗi ký tự và chú thích, và giữ nguyên số dòng để thông báo lỗi chỉ đúng dòng học sinh viết. Bảng ánh xạ đầy đủ nằm trong `data/pyvn-keywords.json` (ngoài phạm vi; nội dung cụ thể không xác định từ mã nguồn trong phạm vi).

**2. Các file tham gia**
- `js/runtime/pyvn.js` — `loadPyvnMapping`, `translatePyvnWith`, `translatePyvn`, `segments`.
- `js/runtime/runner.js` — gọi dịch trong `runCode` (cả tệp phụ `.py` của dự án), `LANGUAGES.pyvn`.
- `js/components/highlight.js` — `PYVN_KEYWORDS`, `PYVN_BUILTINS`, `RULES.pyvn`, nhãn "Python Tiếng Việt".
- `data/pyvn-keywords.json` — dữ liệu ánh xạ (`phrases`, `words`).

**3. Luồng xử lý từng bước**
1. `runCode({ lang: 'pyvn' })` gọi `translatePyvn(src)`; nếu tải bảng ánh xạ lỗi thì trả lỗi "Không tải được bộ dịch Python Tiếng Việt: …".
2. `loadPyvnMapping()` fetch `data/pyvn-keywords.json` một lần (ghi nhớ Promise, xóa khi lỗi để thử lại).
3. `segments(src)` duyệt từng ký tự, tách mã thành các đoạn: mã (`code: true`), chú thích `#` tới cuối dòng và chuỗi (nháy đơn/kép/ba nháy, xử lý ký tự thoát) với `code: false`.
4. Với mỗi đoạn mã: thay các cụm từ (`phrases`, sắp theo độ dài giảm dần, cụm kết thúc `()` chấp nhận khoảng trắng bên trong ngoặc) bằng regex có ranh giới từ.
5. Thay các từ đơn (`words`) bằng một regex hợp nhất có lookbehind `(?<![\w.])` (không thay thuộc tính sau dấu chấm) và lookahead `(?![\w])`.
6. Ghép lại các đoạn; mã đã dịch được chạy bằng worker Python như bình thường.

**4. Hàm/lớp/API cốt lõi**
`loadPyvnMapping()`, `translatePyvnWith(mapping, src)`, `translatePyvn(src)`, nội bộ `segments(src)`, `escapeRegex(s)` (pyvn.js); `runCode` (runner.js); `RULES.pyvn` (highlight.js).

**5. Trích đoạn code quan trọng**
`js/runtime/pyvn.js`:
```js
export function translatePyvnWith(mapping, src) {
  const phrases = (mapping.phrases || []).slice().sort((a, b) => b.vn.length - a.vn.length);
  const words = mapping.words || {};
  const wordRe = new RegExp(`(?<![\\w.])(${Object.keys(words).sort((a, b) => b.length - a.length).map(escapeRegex).join('|')})(?![\\w])`, 'g');
  return segments(String(src ?? '')).map((seg) => {
    if (!seg.code) return seg.text;
    let t = seg.text;
    for (const p of phrases) {
      const re = new RegExp(`(?<![\\w.])${escapeRegex(p.vn).replace(/\\\(\\\)$/, '\\s*\\(\\s*\\)')}${/\w$/.test(p.vn) ? '(?![\\w])' : ''}`, 'g');
      t = t.replace(re, p.py);
    }
    if (Object.keys(words).length) t = t.replace(wordRe, (m) => words[m]);
    return t;
  }).join('');
}
```
Cụm từ dài được thay trước để tránh bị từ ngắn "ăn" mất; chuỗi và chú thích được trả nguyên văn nên câu chữ tiếng Việt học sinh in ra không bị biến đổi.

`js/components/highlight.js`:
```js
RULES.pyvn = RULES.python.map((rule) => (rule[1] && typeof rule[1] === 'function'
  ? [rule[0], (w, m) => (PYVN_KEYWORDS.has(w) ? 'keyword' : PYVN_BUILTINS.has(w) ? 'builtin' : rule[1](w, m))]
  : rule));
```
Bộ tô màu cho Python Tiếng Việt kế thừa toàn bộ quy tắc Python và bổ sung nhận diện từ khóa, hàm dựng sẵn tiếng Việt.

### Chấm bài tự động (gradeCode, kiểm tra HTML)

**1. Mô tả & giao diện**
Bài tập (bài học, thử thách, bài tập lớp học) được chấm tự động trên trình duyệt. Với các ngôn ngữ xuất ra màn hình, bài làm được chạy với từng test (đầu vào → đầu ra mong đợi); kết quả mỗi test gồm nhãn "Test n" (thêm "(ẩn)" với test ẩn), đạt/không đạt, đầu vào, kết quả mong đợi, kết quả thực tế và lỗi — với test ẩn các chi tiết bị che và lỗi chỉ báo "Chương trình gặp lỗi ở test ẩn.". Nếu một test quá thời gian, các test còn lại được đánh trượt nhanh ("Bỏ qua do test trước bị quá thời gian."). Với bài HTML/CSS, bài làm được đánh giá theo "tiêu chí" (ví dụ cần có thẻ `h1`, có ít nhất 3 `li`, màu chữ đúng…), mỗi tiêu chí có thông báo tiếng Việt. Điểm quy đổi thang 10 (làm tròn 1 chữ số thập phân).

**2. Các file tham gia**
- `js/runtime/runner.js` — `gradeCode`, `normalizeOutput`, `evaluateHtmlChecks`, `buildWebDocument`, `runCode`.
- `js/runtime/html-checks.js` — `runChecks` (DSL kiểm tra).
- `js/runtime/python.worker.js` — chế độ `grading` (không in lời nhắc, không nạp tệp dự án).
- `js/services/classroom.js` — `submitAssignment` lưu `score`, `passed`, `total` (trang gọi ngoài phạm vi).

**3. Luồng xử lý từng bước**
1. Trang gọi `gradeCode({ lang, code, tests, checks, onProgress, signal })`.
2. Nếu `lang` là `html` hoặc `web`: `evaluateHtmlChecks(code, checks)` tạo iframe ẩn (`sandbox="allow-scripts"`, đặt ngoài màn hình, 1024×768).
3. Mã nguồn hàm `runChecks` được nhúng nguyên văn vào iframe bằng `runChecks.toString()` cùng danh sách kiểm tra; chạy sau sự kiện `load` + 30 ms; kết quả gửi về bằng `postMessage` có `nonce`.
4. Hết 6 giây chưa có kết quả → mọi tiêu chí bị đánh trượt ("Hết thời gian kiểm tra"); iframe luôn bị xóa.
5. `runChecks` đánh giá từng kiểm tra (`exists`, `count`, `text`, `attr`, `style` qua `getComputedStyle`, `js`) và trả `{ ok, message }`.
6. Với ngôn ngữ khác: lần lượt chạy `runCode(... grading: true, stdin: t.input)` cho từng test, gọi `onProgress(i, total)`.
7. So sánh `normalizeOutput(actual) === normalizeOutput(expected)`: chuẩn hóa Unicode NFC, đổi CRLF/CR thành LF, bỏ khoảng trắng cuối mỗi dòng, bỏ dòng trống cuối.
8. Tính `passed`, `total`, `score10 = round(passed / total × 100) / 10`.

**4. Hàm/lớp/API cốt lõi**
`gradeCode`, `normalizeOutput`, `evaluateHtmlChecks`, `buildWebDocument`, `runCode` (runner.js); `runChecks(doc, checks)` (html-checks.js); `Function.prototype.toString`, iframe `srcdoc`, `postMessage`, `getComputedStyle`.

**5. Trích đoạn code quan trọng**
`js/runtime/runner.js`:
```js
export function normalizeOutput(s) {
  return String(s ?? '').normalize('NFC').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
}
```
Chuẩn hóa đầu ra giúp việc chấm không phạt học sinh vì khoảng trắng cuối dòng, kiểu xuống dòng hay cách mã hóa dấu tiếng Việt khác nhau.

`js/runtime/runner.js`:
```js
    const res = await runCode({ lang, code, stdin: t.input ?? '', grading: true, signal });
    const actual = res.stdout;
    const ok = res.ok && normalizeOutput(actual) === normalizeOutput(t.expected);
    results.push({
      ok,
      label: `Test ${i + 1}${t.hidden ? ' (ẩn)' : ''}`,
      hidden: Boolean(t.hidden),
      input: t.hidden ? null : t.input,
      expected: t.hidden ? null : t.expected,
      actual: t.hidden ? null : actual,
      error: res.ok ? null : (t.hidden ? 'Chương trình gặp lỗi ở test ẩn.' : res.error),
      timedOut: res.timedOut,
    });
```
Mỗi test được chạy độc lập; với test ẩn, đầu vào/đầu ra/lỗi chi tiết bị che để học sinh không thể "học tủ" theo test.

`js/runtime/html-checks.js`:
```js
        case 'style':
          ok = els.some((el) => {
            const v = norm(win.getComputedStyle(el).getPropertyValue(c.property));
            if (c.equals != null) return v === norm(c.equals);
            if (Array.isArray(c.oneOf)) return c.oneOf.map(norm).includes(v);
            return v !== '';
          });
          break;
```
Kiểm tra CSS dựa trên kiểu đã tính toán thực tế của trình duyệt, nên học sinh có thể đặt CSS theo nhiều cách (thẻ `<style>`, thuộc tính `style`, lớp) mà vẫn được chấm đúng.

### Robot V-Mentor nổi (kéo thả, khung chat nhanh)

**1. Mô tả & giao diện**
Một robot SVG dễ thương (68×68px) luôn nổi ở góc phải dưới trên mọi trang: thân tím gradient, đầu trắng với kính đen, hai mắt cyan biết chớp và nhìn theo con trỏ, ăng-ten có bóng đèn hồng nhấp nháy, trái tim xanh đập, má hồng, cánh tay vẫy khi rê chuột. Người dùng có thể kéo thả robot đi bất cứ đâu (chuột, cảm ứng, bút; phím mũi tên khi đang chọn, giữ Shift để bước 60px); robot nghiêng theo vận tốc kéo, "đáp đất" có hiệu ứng nảy, và ghi nhớ vị trí theo tỉ lệ màn hình. Lần đầu trên thiết bị, bong bóng chào "Chào bạn! Mình là V-Mentor…" xuất hiện 7 giây. Bấm robot mở khung trò chuyện nhanh (410×600px; dạng tấm trượt từ dưới lên khi màn hình < 560px): đầu khung gradient chàm–tím–hồng với avatar robot, trạng thái (Sẵn sàng trả lời / AI trên trình duyệt (ngoại tuyến) / Chưa cấu hình máy chủ AI / Ngoại tuyến…), nút cuộc trò chuyện mới, mở toàn màn hình, đóng; thanh chọn 7 chế độ và chip "Đính kèm code đang mở" (chỉ hiện khi trang có trình soạn mã chứa mã); màn chào với 3 câu hỏi gợi ý; tin nhắn hiển thị Markdown, chấm "đang gõ"; ô nhập tự giãn (Enter gửi, Shift+Enter xuống dòng, Esc dừng/đóng); nút Dừng; chân khung "Khóa API nằm an toàn trên máy chủ" và "Đưa robot về góc". Khi có trả lời mà khung đã đóng, robot hiện huy hiệu đỏ "1". Ở trang `/ai`, bấm robot sẽ focus ô soạn thảo chính thay vì mở khung thứ hai. Robot chuyển trái tim sang màu cam khi ngoại tuyến và nhảy lên mỗi lần chuyển trang.

**2. Các file tham gia**
- `js/components/vbot.js` — toàn bộ hành vi và SVG robot.
- `css/vbot.css` — giao diện, 13 keyframes.
- `js/main.js` — import động và gọi `initVBot()`.
- `js/services/ai-client.js`, `js/services/ai-modes.js`, `js/services/conversations.js`, `js/services/local-ai.js`, `js/components/markdown.js` — import động khi mở khung lần đầu.
- `js/core/router.js` (`navigate`), `js/core/store.js` (`appState`, `bus`), `js/components/icons.js`.

**3. Luồng xử lý từng bước**
1. `initVBot()` (bỏ qua nếu đã có `.vbot`) tạo nút robot (halo, SVG, huy hiệu) và bong bóng, chèn vào `body`.
2. `placeFromSaved()`: nếu có `vc-vbot-pos` thì đặt theo tỉ lệ đã lưu; nếu không đặt góc phải dưới, nâng lên trên ô soạn thảo chat (`[data-chat-input]`) nếu có để không che nút gửi; sau mỗi `route:mounted` tính lại khi chưa có vị trí lưu.
3. `place(x, y)` kẹp tọa độ trong màn hình (cách mép 10px, cách đỉnh 66px), đặt `transform: translate3d`, ghi `data-side` (left/right), lưu nếu `save`, định vị lại bong bóng và khung chat.
4. Kéo: `pointerdown` ghi điểm bắt đầu và `setPointerCapture`; `pointermove` chỉ coi là kéo khi di chuyển ≥ 6px, đặt `--tilt` theo vận tốc ngang (±18°); `pointerup` lưu vị trí, thêm `is-landing`, chặn sự kiện click kế tiếp.
5. Mắt theo con trỏ: trên `pointermove` toàn cửa sổ (gộp bằng `requestAnimationFrame`), tính góc và khoảng cách để dịch `.vbot__eyes` tối đa 4px/3px (tắt khi giảm chuyển động).
6. Bong bóng chào: nếu chưa có `vc-vbot-greeted` và không phải trình duyệt tự động, hiện sau 1800 ms (4200 ms nếu có intro) rồi ghi cờ.
7. Bấm robot → `activate()`: chạy hiệu ứng vẫy tay; nếu đang ở `#/ai` thì focus ô soạn thảo và hiện bong bóng hướng dẫn; ngược lại bật/tắt khung.
8. `openPanel()` lần đầu gọi `buildPanel()` (import động 5 module); lỗi thì chuyển sang `/ai`.
9. `send(text)`: tạo hội thoại nếu chưa có (`createConversation`), thêm tin người dùng, đặt tiêu đề tự động, thêm tin AI rỗng, bật trạng thái `is-thinking`/`is-streaming`.
10. Chọn nguồn: nếu AI trình duyệt sẵn sàng và máy chủ AI không có nhà cung cấp → `streamLocal` với `localSystemPrompt`; ngược lại `streamChat` (xử lý `meta`, `delta`, `error`). Mỗi đoạn văn bản được vẽ lại bằng `markdown()` gộp theo khung hình.
11. Lỗi/dừng: "_(Đã dừng)_" hoặc lưu `ai.error` hiển thị khối cảnh báo; nội dung rỗng → lỗi "Mô hình không trả về nội dung".
12. `finally`: lưu hội thoại (`saveConversation` → đồng bộ đám mây), vẽ lại, hiện huy hiệu nếu khung đang đóng.
13. Nút "Mở toàn màn hình" chuyển tới `/ai/<id>` để tiếp tục cùng cuộc trò chuyện.

**4. Hàm/lớp/API cốt lõi**
`initVBot()` → `{ open, close }`, `robotSvg(idPrefix)`, `hasProvider`, `readPos`, `writePos`, `place`, `placeFromSaved`, `activate`, `openPanel`, `closePanel`, `buildPanel` (`editorCode`, `refreshStatus`, `msgEl`, `renderMessages`, `send`) (vbot.js); `streamChat`, `AIError`, `streamLocal`, `localStatus`, `onLocalStatus`, `createConversation`, `saveConversation`, `deriveTitle`, `markdown`, `enhanceMarkdown`, `AI_MODES`, `modeById`, `localSystemPrompt`; Pointer Events (`setPointerCapture`), `requestAnimationFrame`, `localStorage`.

**5. Trích đoạn code quan trọng**
`js/components/vbot.js`:
```js
  const place = (x, y, { save = false } = {}) => {
    const maxX = window.innerWidth - SIZE - MARGIN;
    const maxY = window.innerHeight - SIZE - MARGIN;
    const cx = Math.max(MARGIN, Math.min(maxX, x));
    const cy = Math.max(MARGIN + 56, Math.min(maxY, y));
    btn.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    btn.dataset.side = cx + SIZE / 2 > window.innerWidth / 2 ? 'right' : 'left';
    current = { x: cx, y: cy };
    if (save) { pos = { x: cx / window.innerWidth, y: cy / window.innerHeight }; writePos(pos); }
    positionBubble();
    if (panelOpen) positionPanel();
  };
```
Vị trí được lưu dưới dạng tỉ lệ so với kích thước cửa sổ nên khi xoay màn hình hoặc đổi kích thước, robot vẫn ở vị trí tương ứng và luôn nằm trong màn hình (không đè lên thanh điều hướng).

`js/components/vbot.js`:
```js
      const useLocal = local.localStatus().state === 'ready' && !(backend.reachable && hasProvider(backend));
      try {
        if (useLocal) {
          ai.provider = 'browser';
          for await (const chunk of local.streamLocal({ messages: history.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })), system: localSystemPrompt(mode, context), signal: my.signal })) { ai.content += chunk; paint(); }
        } else {
          for await (const ev of streamChat({ messages: history, mode, context, signal: my.signal })) {
            if (ev.type === 'meta') { ai.provider = ev.data.provider; ai.model = ev.data.model; }
            else if (ev.type === 'delta') { ai.content += ev.data.text || ''; paint(); }
            else if (ev.type === 'error') throw new AIError(ev.data.code, ev.data.message);
          }
        }
```
Robot tự chọn nguồn trả lời: ưu tiên máy chủ AI khi có nhà cung cấp khả dụng, dùng mô hình trên trình duyệt khi máy chủ không sẵn sàng; nếu không có cả hai thì báo lỗi thật thay vì câu trả lời soạn sẵn.

### Hiển thị Markdown an toàn & tô màu cú pháp

**1. Mô tả & giao diện**
Câu trả lời của AI và nội dung bài học được hiển thị từ Markdown thành HTML đẹp: tiêu đề, đoạn văn, chữ đậm/nghiêng/gạch, mã inline, bảng (có căn lề), danh sách có/không thứ tự và danh sách công việc (ô đánh dấu), trích dẫn, đường kẻ ngang, liên kết (liên kết ngoài mở tab mới), công thức toán `$…$`, `$$…$$`, `\(…\)`, `\[…\]` hiển thị bằng KaTeX (khi ngoại tuyến hiện TeX thô bằng phông monospace). Khối mã có thanh đầu ghi tên ngôn ngữ, nút "Sao chép" (đổi thành "Đã chép" 1,4 giây) và — với 7 ngôn ngữ chạy được — nút "Mở trong IDE". Mã được tô màu theo 12 loại token, màu thay đổi theo giao diện sáng/tối. Trình hiển thị không cho phép HTML thô đi qua, chống tấn công XSS.

**2. Các file tham gia**
- `js/components/markdown.js` — `markdown`, `enhanceMarkdown`, `loadKatex`, `safeUrl`.
- `js/components/highlight.js` — `highlight`, `normalizeLang`, `LANG_LABELS`, `SUPPORTED_LANGS`.
- `js/core/dom.js` — `esc`, `raw`.
- `js/components/icons.js` — `iconHTML`.
- `js/core/ui.js` — `copyText`; `js/core/idb.js` — `kv['workspace:incoming']`.
- `js/config.js` — `KATEX_BASE`.
- `css/components.css` — `.code-block`, `.tok-*`, `.prose`; `css/tokens.css` — biến `--tok-*`.

**3. Luồng xử lý từng bước**
1. `markdown(src)` chuẩn hóa xuống dòng, duyệt từng dòng và nhận diện khối theo thứ tự: khối mã có rào (`` ``` `` hoặc `~~~`, chấp nhận rào chưa đóng khi đang streaming), công thức hiển thị, tiêu đề (lùi một cấp: `#` → `h2`), đường kẻ, bảng (dòng thứ hai là dòng phân cách), trích dẫn (đệ quy), danh sách (theo mức thụt lề, hỗ trợ lồng nhau và `[ ]`/`[x]`), dòng trống, đoạn văn.
2. Với nội dung inline: `protect()` thay mã inline và công thức bằng token `\u0000n\u0000` (nội dung đã được thoát), sau đó `inline()` thoát toàn bộ văn bản bằng `esc()`, rồi mới áp dụng định dạng liên kết, tự động liên kết, đậm, nghiêng, gạch, và khôi phục token.
3. Liên kết chỉ được chấp nhận nếu `safeUrl()` cho phép (`http:`, `https:`, `mailto:`, `#`, hoặc đường dẫn tương đối không chứa `..`); không hợp lệ thì chỉ giữ chữ.
4. `codeBlock()` gọi `highlight(code, lang)` để tô màu và sinh nút thao tác.
5. Sau khi chèn HTML vào DOM, `enhanceMarkdown(root)` tải KaTeX (CSS + JS) khi có `[data-math]` và render, gắn sự kiện cho `.code-block` (một lần nhờ `data-wired`).
6. Nút "Mở trong IDE": gọi `onOpenCode` nếu có, ngược lại lưu `{ code, lang, at }` vào `kv['workspace:incoming']` và chuyển tới `#/workspace?lang=…&from=snippet`.
7. `highlight(code, lang)`: `normalizeLang` (bí danh như `js`, `py`, `c++`, `sh`…), HTML dùng `highlightHTML` (thẻ, thuộc tính, chú thích, thực thể, `<style>`/`<script>` nhúng), ngôn ngữ khác dùng `tokenize` với regex sticky; lỗi thì trả văn bản đã thoát.

**4. Hàm/lớp/API cốt lõi**
`markdown`, `enhanceMarkdown`, `loadKatex`, `safeUrl`, `inline`, `protect`, `codeBlock`, `renderTable` (markdown.js); `highlight`, `normalizeLang`, `tokenize`, `identClassifier`, `highlightHTML`, `SUPPORTED_LANGS`, `LANG_LABELS` (highlight.js); `esc` (dom.js); KaTeX `katex.render`.

**5. Trích đoạn code quan trọng**
`js/components/markdown.js`:
```js
function safeUrl(url) {
  const u = String(url || '').trim();
  if (/^(https?:|mailto:|#\/|#)/i.test(u)) return u;
  if (/^[\w./-]+$/.test(u) && !u.includes('..')) return u; // relative app links
  return null;
}
```
Danh sách trắng giao thức liên kết chặn các URL nguy hiểm như `javascript:` hay `data:`.

`js/components/highlight.js`:
```js
function tokenize(code, rules) {
  let out = '';
  let i = 0;
  const n = code.length;
  let plain = '';
  outer: while (i < n) {
    for (const [re, cls] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m.index === i && m[0].length > 0) {
        if (plain) { out += esc(plain); plain = ''; }
        const c = typeof cls === 'function' ? cls(m[0], m) : cls;
        out += wrap(c, m[0]);
        i += m[0].length;
        continue outer;
      }
    }
    plain += code[i];
    i += 1;
  }
  if (plain) out += esc(plain);
  return out;
}
```
Bộ tách token thử lần lượt các quy tắc regex "dính" (`y`) tại vị trí hiện tại; mọi đoạn văn bản (kể cả token) đều đi qua `esc()` nên kết quả luôn an toàn khi chèn vào HTML.

### Thông báo / hộp thoại / menu (ui.js)

**1. Mô tả & giao diện**
Bộ thành phần giao diện dùng chung: thông báo toast xuất hiện ở góc phải dưới (rộng tối đa 380px), có 4 loại (thông tin, thành công, cảnh báo, lỗi) với biểu tượng tương ứng, nút đóng, nút hành động tùy chọn (ví dụ "Tải lại"), tự ẩn sau 4,2 giây (hoặc giữ nguyên nếu `duration: 0`), trượt vào/ra mềm mại; trong giao diện tối toast có nền sáng. Hộp thoại modal dùng thẻ `<dialog>` gốc với 4 kích thước (sm 420px, md 560px, lg 820px, xl 1100px), lớp phủ mờ, tiêu đề, nút đóng, chân hộp thoại chứa các nút (có trạng thái đang tải). Hộp xác nhận ("Xác nhận" — Hủy/Đồng ý, tùy chọn kiểu nguy hiểm) và hộp nhập văn bản. Menu thả xuống (tài khoản, trạng thái) đóng khi bấm ra ngoài hoặc nhấn Escape. Ngoài ra có tiện ích sao chép vào bộ nhớ tạm, tải tệp và khối "trạng thái rỗng".

**2. Các file tham gia**
- `js/core/ui.js` — toàn bộ hàm.
- `js/core/dom.js` — `h`, `$`.
- `js/components/icons.js` — `icon`.
- `css/components.css` — `.toast-region`, `.toast*`, `.modal*`, `.menu*`, `.empty-state*`.
- Được dùng bởi `js/main.js`, `js/components/auth-dialog.js`, `js/components/markdown.js` và các trang.

**3. Luồng xử lý từng bước**
1. `toast(message, opts)` tìm hoặc tạo `#toast-region` (`role="status"`, `aria-live="polite"`), tạo phần tử toast (`role="alert"` cho lỗi), gắn hẹn giờ tự đóng; `close()` thêm `is-leaving` và xóa sau 220 ms; trả về hàm `close`.
2. `openModal({...})` tạo `<dialog class="modal modal--{size}">`, phần đầu (khi có `title`), thân, chân với các nút; nút có `onClick` thì bật `is-loading`, chờ kết quả, đóng nếu kết quả khác `false`.
3. Hộp thoại đóng bằng Escape (sự kiện `cancel`) hoặc bấm vùng nền nếu `dismissible`; `close(result)` gọi `dialog.close()`, xóa phần tử và `onClose(result)`; hiển thị bằng `showModal()`.
4. `confirmDialog` bọc `openModal` cỡ `sm` thành `Promise<boolean>`; `promptDialog` thêm form có ô nhập, focus và chọn sẵn văn bản, trả `null` nếu rỗng hoặc hủy.
5. `bindMenu(root, signal)`: nút `[data-menu-trigger]` bật/tắt `is-open` và `aria-expanded`; bấm ngoài hoặc Escape thì đóng; chọn `.menu__item` cũng đóng; mọi listener gắn với `signal` để gỡ khi cần.
6. `copyText(text)` dùng `navigator.clipboard.writeText`, dự phòng `textarea` ẩn + `execCommand('copy')`.
7. `downloadFile(filename, content, type)` tạo Blob, `URL.createObjectURL`, bấm thẻ `<a download>` ẩn, thu hồi URL sau 1 giây.

**4. Hàm/lớp/API cốt lõi**
`toast`, `openModal`, `confirmDialog`, `promptDialog`, `copyText`, `bindMenu`, `downloadFile`, `emptyState`, nội bộ `toastRegion` (ui.js); `HTMLDialogElement.showModal`, Clipboard API, `Blob`, `URL.createObjectURL`.

**5. Trích đoạn code quan trọng**
`js/core/ui.js`:
```js
export function toast(message, { type = 'info', duration = 4200, action } = {}) {
  const close = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 220);
  };
  const el = h('div', { class: `toast toast--${type}`, role: type === 'error' ? 'alert' : 'status' },
    icon(TOAST_ICON[type] || 'info'),
    h('div', { class: 'grow' }, message),
    action ? h('button', { class: 'btn btn--sm btn--ghost', style: 'color:inherit', onClick: () => { action.onClick(); close(); } }, action.label) : null,
    h('button', { class: 'toast__close', 'aria-label': 'Đóng thông báo', onClick: close }, icon('x')),
  );
  toastRegion().appendChild(el);
  if (duration > 0) setTimeout(close, duration);
  return close;
}
```
Toast dùng vai trò ARIA phù hợp (lỗi là `alert` để trình đọc màn hình đọc ngay); nội dung được chèn bằng `h()` nên luôn là văn bản an toàn.

`js/core/ui.js`:
```js
export function bindMenu(root, signal) {
  const trigger = root.querySelector('[data-menu-trigger]');
  const setOpen = (open) => {
    root.classList.toggle('is-open', open);
    trigger?.setAttribute('aria-expanded', String(open));
  };
  trigger?.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!root.classList.contains('is-open')); }, { signal });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) setOpen(false); }, { signal });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); }, { signal });
```
Menu thả xuống dùng `AbortSignal` để gỡ toàn bộ listener toàn cục khi menu được dựng lại (ví dụ sau khi đăng nhập/đăng xuất), tránh rò rỉ bộ nhớ.

### Lưu trữ IndexedDB

**1. Mô tả & giao diện**
Lớp lưu trữ cục bộ "ưu tiên ngoại tuyến" giúp tiến độ, bản nháp mã, lịch sử hội thoại, bộ đệm hồ sơ và các cài đặt vẫn hoạt động khi không có mạng. Không có giao diện riêng; người dùng thấy hiệu quả qua việc dữ liệu vẫn còn sau khi tải lại trang hoặc mất mạng. Khi trình duyệt không hỗ trợ IndexedDB (ví dụ chế độ riêng tư ở một số trình duyệt), hệ thống tự chuyển sang lưu tạm trong bộ nhớ RAM để ứng dụng không bị lỗi.

**2. Các file tham gia**
- `js/core/idb.js` — `open`, `withStore`, `idb`, `kv`.
- Người dùng trong phạm vi: `js/services/auth.js` (`profile:*`), `js/services/progress.js` (`progress:*`, `legacy-import-done`), `js/services/conversations.js` (store `conversations`), `js/services/local-ai.js` (`local-ai:model`), `js/components/markdown.js` (`workspace:incoming`).
- Ngoài phạm vi (chỉ tham chiếu qua tìm kiếm): store `drafts` được dùng bởi `js/components/ide.js`, `js/components/ide/files.js`, `js/pages/challenge.js`, `js/pages/account.js`.

**3. Luồng xử lý từng bước**
1. Lần gọi đầu tiên `open()` mở cơ sở dữ liệu `vcode-edu` phiên bản 1; `onupgradeneeded` tạo các store còn thiếu: `kv` (khóa ngoài), `conversations` (keyPath `id`, chỉ mục `updatedAt`), `drafts` (keyPath `key`), `outbox` (keyPath `seq`, tự tăng).
2. Lỗi mở/bị chặn hoặc không có `indexedDB` → ghi cảnh báo, khởi tạo `memoryFallback` (mỗi store là một `Map`, biến `seq` cho outbox) và trả `null`.
3. `withStore(store, mode, fn)` mở transaction, chạy `fn(objectStore)` (hoặc `fn(null)` khi dùng bộ nhớ RAM), chờ `oncomplete` rồi trả kết quả.
4. `idb.get/put/delete/all/clear` bọc các thao tác tương ứng; `put` hỗ trợ cả store có keyPath (không truyền key) và store khóa ngoài (truyền key).
5. `kv.get(key, fallback)` trả `fallback` khi không có giá trị hoặc lỗi; `kv.set`, `kv.del`.

**4. Hàm/lớp/API cốt lõi**
`idb.get`, `idb.put`, `idb.delete`, `idb.all`, `idb.clear`, `kv.get`, `kv.set`, `kv.del`, nội bộ `open`, `reqToPromise`, `withStore` (idb.js); IndexedDB API `indexedDB.open`, `createObjectStore`, `createIndex`, `transaction`.

**5. Trích đoạn code quan trọng**
`js/core/idb.js`:
```js
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('conversations')) {
        const s = db.createObjectStore('conversations', { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
    };
```
Lược đồ cơ sở dữ liệu cục bộ gồm 4 kho; mỗi kho chỉ được tạo nếu chưa tồn tại, an toàn cho các lần nâng cấp sau.

`js/core/idb.js`:
```js
export const kv = {
  get: (key, fallback = undefined) => idb.get('kv', key).then((v) => (v === undefined ? fallback : v)).catch(() => fallback),
  set: (key, value) => idb.put('kv', value, key),
  del: (key) => idb.delete('kv', key),
};
```
API khóa–giá trị đơn giản không bao giờ ném lỗi khi đọc, giúp các dịch vụ khác viết mã ngắn gọn mà vẫn chịu lỗi tốt.

### Dịch vụ lớp học (Firestore)

**1. Mô tả & giao diện**
Cung cấp phần xử lý dữ liệu cho tính năng Lớp học trực tuyến (giao diện các trang lớp học nằm ngoài phạm vi): chọn vai trò giáo viên/học sinh, tạo lớp với mã ngẫu nhiên dạng `VCxxxx`, tham gia/rời lớp bằng mã, xóa học sinh, giao bài tập lập trình (tối đa 20 test, có test ẩn, hạn nộp, thang 10 điểm), nộp bài, chấm điểm thủ công của giáo viên (0–10, có nhận xét), theo dõi trạng thái hiện diện của học sinh (cập nhật tối đa mỗi 15 giây), thảo luận (100 tin gần nhất), nhân bản bài tập và di trú lớp kiểu cũ. Quyền truy cập được bảo đảm phía máy chủ bởi `firestore.rules`.

**2. Các file tham gia**
- `js/services/classroom.js` — toàn bộ API.
- `js/services/auth.js` — `firestore()`; `js/services/firebase.js` — `emailKey`.
- `js/core/store.js` — `appState.user`; `js/core/dom.js` — `throttle`.

**3. Luồng xử lý từng bước**
1. `chooseRole(role, {...})` cập nhật `users/{key}` với `role` (`teacher`/`student`), `school_name` (≤ 120 ký tự), `class_name` (≤ 40 ký tự).
2. `createClass()` sinh mã `VC` + 4 ký tự (bảng chữ bỏ I, O, 0, 1), thử tối đa 5 lần tránh trùng, `setDoc(classrooms/{code})` với `schema: 2`.
3. `listMyClasses()` truy vấn `teacher_email == key` (giáo viên/quản trị) hoặc `student_emails array-contains key` (học sinh), sắp theo `created_at` giảm dần.
4. `joinClass(code)` chuẩn hóa mã, kiểm tra tồn tại, không phải giáo viên của lớp, chưa là thành viên; `arrayUnion` vào `student_emails` và `students`.
5. Giáo viên mở lớp kiểu cũ → `migrateLegacyClass(cls)` chuyển mảng `assignments`/`submissions` nhúng trong tài liệu sang collection con bằng một `writeBatch`, xóa các trường cũ và đặt `schema: 2`.
6. `saveAssignment` / `submitAssignment` (khóa bài nộp `<assignmentId>__<emailKey>`, mã ≤ 50000 ký tự) / `gradeSubmission` (kẹp 0–10, làm tròn 2 chữ số).
7. `createPresence(code).beat(status, task)` ghi `presence/{key}` có throttle 15 giây, bỏ qua lỗi khi ngoại tuyến.
8. Các hàm `watch*` dùng `onSnapshot` để cập nhật thời gian thực; `deleteClass` xóa mọi collection con theo lô 400 rồi xóa tài liệu lớp.

**4. Hàm/lớp/API cốt lõi**
`chooseRole`, `listMyClasses`, `createClass`, `getClass`, `watchClass`, `updateClass`, `deleteClass`, `joinClass`, `leaveClass`, `removeStudent`, `migrateLegacyClass`, `watchAssignments`, `saveAssignment`, `deleteAssignment`, `submitAssignment`, `watchSubmissions`, `gradeSubmission`, `createPresence`, `watchPresence`, `watchMessages`, `postMessage`, `deleteMessage`, `listAssignments`, `listSubmissions`, `duplicateAssignment`, `normCode` (classroom.js); Firestore `query`, `where`, `orderBy`, `limit`, `arrayUnion`, `arrayRemove`, `writeBatch`, `addDoc`, `onSnapshot`.

**5. Trích đoạn code quan trọng**
`js/services/classroom.js`:
```js
function randomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  return `VC${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')}`;
}
```
Mã lớp sinh bằng bộ sinh số ngẫu nhiên mật mã, dùng bảng chữ đã loại các ký tự dễ nhầm (I/1, O/0) để học sinh nhập mã chính xác.

`js/services/classroom.js`:
```js
export async function gradeSubmission(code, sid, { teacher_score, teacher_note }) {
  const { db, fs } = await firestore();
  const score = Math.max(0, Math.min(10, Number(teacher_score)));
  await fs.updateDoc(fs.doc(db, 'classrooms', normCode(code), 'submissions', sid), {
    teacher_score: Math.round(score * 100) / 100, teacher_note: String(teacher_note || '').slice(0, 2000), graded_at: Date.now(), graded_by: me().key,
  });
}
```
Điểm giáo viên được kẹp trong thang 0–10 và ghi kèm người chấm, thời điểm chấm; nhận xét giới hạn 2000 ký tự.

### Nạp nội dung khóa học & thử thách

**1. Mô tả & giao diện**
Nội dung học (danh mục khóa học, từng khóa với chương và bài, danh sách thử thách) là các tệp JSON tĩnh, được Service Worker lưu đệm để dùng ngoại tuyến. Dịch vụ này nạp và sắp xếp chúng theo thứ tự Python → Python Tiếng Việt → Web → C → C++ → AI, tìm bài học kèm bài trước/bài sau, và cung cấp nhãn độ khó tiếng Việt (Cơ bản, Trung bình, Nâng cao) cùng bảng màu nhấn. Trong phạm vi, nó được hộp thoại đăng nhập dùng để hiển thị số bài học và số chặng thử thách thật, và được dịch vụ tiến độ dùng để lấy XP chuẩn khi nhập dữ liệu cũ.

**2. Các file tham gia**
- `js/services/content.js`.
- `data/courses/index.json`, `data/courses/<id>.json`, `data/challenges.json` (dữ liệu, ngoài phạm vi).
- Người dùng trong phạm vi: `js/components/auth-dialog.js` (`loadStats`), `js/services/progress.js` (`importLegacyLocal`).

**3. Luồng xử lý từng bước**
1. `getJSON(path)` trả Promise đã lưu trong `cache` nếu có; nếu không thì `fetch(new URL('../../' + path, import.meta.url))`, lỗi HTTP ném lỗi tiếng Việt và xóa khỏi bộ đệm để lần sau thử lại.
2. `loadCatalog()` nạp `data/courses/index.json` và sắp `courses` theo `COURSE_ORDER` (khóa lạ xếp cuối).
3. `loadCourse(id)` từ chối id không khớp `^[a-z0-9-]+$` (chống đường dẫn tùy ý), nạp `data/courses/<id>.json`.
4. `findLesson(courseId, lessonId)` làm phẳng các chương thành danh sách bài (mỗi bài kèm `chapter`), trả `{ course, lesson, prev, next, index, total }`.
5. `loadChallenges()` nạp `data/challenges.json`; `runtimeLang('web')` trả `html`.

**4. Hàm/lớp/API cốt lõi**
`loadCatalog`, `loadCourse`, `findLesson`, `loadChallenges`, `runtimeLang`, `ACCENTS`, `DIFFICULTY_LABEL`, `DIFFICULTY_BADGE`, nội bộ `getJSON` (content.js); `fetch`, `import.meta.url`.

**5. Trích đoạn code quan trọng**
`js/services/content.js`:
```js
async function getJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(new URL(`../../${path}`, import.meta.url))
    .then((r) => {
      if (!r.ok) throw new Error(`Không tải được ${path} (HTTP ${r.status})`);
      return r.json();
    })
    .catch((err) => { cache.delete(path); throw err; });
  cache.set(path, p);
  return p;
}
```
Bộ đệm lưu chính Promise nên nhiều thành phần cùng yêu cầu một tệp chỉ phát sinh một lần tải; đường dẫn tính theo vị trí module nên hoạt động cả khi ứng dụng được đặt trong thư mục con.

### Trang chủ 3D (cảnh WebGL Three.js, 7 cảnh cuộn, số liệu thật, mini IDE, điều hướng cảnh)

**1. Mô tả & giao diện**

Trang chủ (route `#/`) là một "câu chuyện cuộn" gồm 7 cảnh nối tiếp, mỗi cảnh là một `<section class="scene">` có `id` riêng:

| # | `id` | Tên trên thanh điều hướng | Nội dung chính |
|---|---|---|---|
| 1 | `s-hero` | V-Core | Tiêu đề "Học lập trình. Hiểu thuật toán. Làm chủ AI.", cảnh WebGL lõi pha lê (Three.js) kèm phương án CSS 3D (3 vòng + lõi), 4 thẻ HUD ("main.py · đã chạy", số chủ đề/thuật toán V-Prism, số chế độ V-Mentor, "Học cả khi mất mạng"), nút "Bắt đầu học miễn phí"/"Tiếp tục học" và "Khám phá Lăng kính", 4 chỉ số đếm tăng (khóa học, bài học chấm tự động, chặng thử thách, thuật toán trực quan), nút "Chạm vào lõi V-Core", nút "Cuộn để khám phá". |
| 2 | `s-code` | Code thật | Cảnh ghim (`data-scene="pin"`), cửa sổ mini IDE (`createEditor` + `createTerminal`) chạy Python thật, 3 bước Viết → Chạy → Chấm & sửa sáng dần theo tiến độ cuộn, dải 7 ngôn ngữ dẫn tới `#/workspace?lang=…`, hai đoạn mã "bóng ma" (Python, C++) được tô màu cú pháp. |
| 3 | `s-prism` | Lăng kính | Sân khấu 3D có demo sắp xếp tự chạy (`mountMiniSort`, 14 cột), 8 thẻ chủ đề đầu tiên của V-Prism, hai dải chữ chạy (marquee) liệt kê toàn bộ "Chủ đề · Thuật toán". |
| 4 | `s-ai` | V-Mentor | Nền cực quang, quả cầu AI với 3 vòng, băng chuyền 3D các thẻ chế độ AI (lấy từ `AI_MODES`), ô hỏi đáp; câu hỏi được lưu vào `kv` khóa `ai:incoming` rồi chuyển sang trang `#/ai`. |
| 5 | `s-eco` | Hệ sinh thái | Ô khóa học (dải màu theo `COURSE_LOOK`, số bài và XP thật) và 4 thẻ sản phẩm: Đấu trường, IDE · Lưu đồ · Scratch, Lớp học, Ngoại tuyến. |
| 6 | `s-future` | Tương lai | Mặt trời và sàn lưới phối cảnh, lộ trình (roadmap) lấy từ `tracks` của `index.json` với nhãn "Đang mở"/"Sắp ra mắt". |
| 7 | `s-start` | Bắt đầu | Thẻ kêu gọi hành động "Sẵn sàng viết dòng code đầu tiên?", nút "Học Python ngay", nút "Tạo tài khoản" (khi chưa đăng nhập). |

Ngoài ra có thanh tiến độ cuộn trên cùng (`.home-progress`, biến `--k`) và thanh điều hướng cảnh (`nav.scene-nav`) đổi tông sáng/tối theo cảnh đang xem.

**2. Các file tham gia**

- `js/pages/home.js` – dựng toàn bộ 7 cảnh, nạp số liệu, gắn hành vi.
- `js/pages/home/hero3d.js` – cảnh WebGL V-Core.
- `js/pages/home/scenes.js` – tiến độ cuộn, bộ đếm, nghiêng 3D, nút "nam châm", điều hướng cảnh.
- `js/pages/prism/mini.js`, `js/pages/prism/renderers.js` – demo sắp xếp trong cảnh 3.
- `js/pages/prism/catalog.js` – số chủ đề/thuật toán thật.
- `css/pages/home.css` – bố cục, hiệu ứng CSS 3D, keyframes.
- Phụ thuộc ngoài phạm vi: `js/services/content.js`, `js/services/ai-modes.js`, `js/components/editor.js`, `js/components/ide.js`, `js/runtime/runner.js`, `js/core/idb.js`, `js/config.js` (`THREE_URL` = three@0.160.0).

**3. Luồng xử lý từng bước**

1. Router gọi `mount(container, ctx)`; đọc `prefersReducedMotion()` và người dùng hiện tại từ `appState`.
2. Chạy song song bằng `Promise.allSettled`: `loadCatalog()` + `loadChallenges()` (tính số khóa học, tổng `lessons_count`, số thử thách, số trùm `boss`/`rank === 'BOSS'`, danh sách `tracks`), `prism/catalog.js` (số chủ đề và tổng thuật toán), `ai-modes.js` (danh sách chế độ). Nếu một nguồn lỗi, giá trị mặc định (6, 104, 100, 41, 14, 7) được dùng làm dự phòng hiển thị.
3. Dựng 7 phần tử `section`, thanh tiến độ và `scene-nav`, rồi `mount()` vào `container`.
4. `initScrollScenes()` tính `--p` cho từng `[data-scene]` mỗi khi cuộn/đổi kích thước (gói trong `requestAnimationFrame`); callback `onProgress` gọi `hero3d.setProgress(p * 2)` cho cảnh Hero và bật/tắt lớp `is-active`/`is-done` cho 3 bước ở cảnh Code.
5. Sự kiện `scroll` cập nhật biến `--k` của thanh tiến độ trang.
6. `initCounters()` đếm từ 0 lên giá trị `data-count` trong 1 400 ms (hàm làm mượt `1 - (1 - k)^4`) khi phần tử vào khung nhìn 40%.
7. `initTilt()`, `initMagnetic()` gắn nghiêng 3D cho phần tử `[data-tilt]` và hiệu ứng nam châm cho `[data-magnetic]` (chỉ khi con trỏ chính xác và không giảm chuyển động).
8. `initSceneNav()` dùng `IntersectionObserver` (`rootMargin: '-45% 0px -50% 0px'`) để đánh dấu cảnh đang xem và đổi `nav.dataset.tone`.
9. Nạp lười `prism/mini.js` và gọi `mountMiniSort(sortHost, { size: 14, interval: 150 })`.
10. Sau khung hình đầu tiên, nạp lười `home/hero3d.js` và gọi `createHero3D()`; nếu thành công thêm lớp `is-webgl` vào Hero (ẩn phương án CSS); nếu lỗi chỉ ghi cảnh báo và giữ phương án CSS.
11. Người dùng bấm "Chạy" ở mini IDE → `runTry()` nạp `runtime/runner.js`, gọi `runCode({ lang: 'python', … })`, ghi đầu ra vào terminal và trạng thái "Hoàn tất · N ms" hoặc "Có lỗi".
12. Người dùng nhấp vào lõi pha lê → raycaster phát hiện → `state.pulse = 1`, phát sự kiện `hero:pulse`; trang ẩn nút gợi ý "Chạm vào lõi V-Core".
13. Khi rời trang, `signal` bị hủy: mọi listener, observer, vòng `requestAnimationFrame` và tài nguyên WebGL được giải phóng; hàm trả về của `mount` gọi `tryEditor.destroy()`.

**4. Hàm/lớp/API cốt lõi**

- `createHero3D(host, { signal, reduced })` → `{ setProgress(p), pulse(), dispose }`.
- `initScrollScenes(root, { signal, onProgress })`, `initCounters()`, `initTilt()`, `initMagnetic()`, `initSceneNav()`, `prefersReducedMotion()`.
- `runCode({ lang, code, onOutput })` (runtime), `createEditor()`, `createTerminal()`, `highlight()`.
- `mountMiniSort(container, { signal, size, interval })`.
- `kv.set('ai:incoming', { prompt, mode, at })`, `ctx.navigate('/ai')`.
- Three.js: `WebGLRenderer`, `PerspectiveCamera`, `FogExp2`, `IcosahedronGeometry`, `OctahedronGeometry`, `EdgesGeometry`, `TorusGeometry`, `SphereGeometry`, `Sprite`, `CanvasTexture`, `Points`, `GridHelper`, `Raycaster`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/home.js` (số liệu thật):

```js
    const data = { courses: [], lessons: 0, challenges: 0, bosses: 0, topics: [], algos: 0, tracks: [], modes: [] };
    await Promise.allSettled([
      import('../services/content.js').then(async (m) => {
        const [cat, ch] = await Promise.all([m.loadCatalog(), m.loadChallenges()]);
        data.courses = cat.courses;
        data.tracks = cat.tracks || [];
        data.lessons = cat.courses.reduce((n, c) => n + (c.lessons_count || 0), 0);
        data.challenges = (ch.challenges || []).length;
        data.bosses = (ch.challenges || []).filter((c) => c.boss || c.rank === 'BOSS').length;
      }),
      import('./prism/catalog.js').then((m) => {
        data.topics = m.PRISM_TOPICS;
        data.algos = m.PRISM_TOPICS.reduce((n, t) => n + t.algorithms.length, 0);
      }),
      import('../services/ai-modes.js').then((m) => { data.modes = m.AI_MODES; }),
    ]);
```

Giải thích: các con số trên trang chủ được tổng hợp trực tiếp từ tệp nội dung và danh mục V-Prism; `Promise.allSettled` bảo đảm một nguồn lỗi không làm hỏng các nguồn còn lại.

Trích đoạn 2 – `js/pages/home/scenes.js` (tính tiến độ cuộn `--p`):

```js
export function initScrollScenes(root, { signal, onProgress } = {}) {
  const scenes = [...root.querySelectorAll('[data-scene]')];
  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = window.innerHeight || 1;
    for (const el of scenes) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
      let p;
      if (el.dataset.scene === 'pin') {
        const total = r.height - vh;
        p = total > 0 ? clamp(-r.top / total) : clamp((vh - r.top) / (vh + r.height));
      } else {
        p = clamp((vh - r.top) / (vh + r.height));
      }
      const prev = el._p;
      if (prev === undefined || Math.abs(prev - p) > 0.0005) {
        el._p = p;
        el.style.setProperty('--p', p.toFixed(4));
        onProgress?.(el, p);
      }
    }
  };
```

Giải thích: mỗi cảnh nhận biến CSS `--p` từ 0 đến 1; cảnh ghim tính theo phần chiều cao vượt quá khung nhìn, các cảnh khác tính theo quãng đi qua khung nhìn. CSS dùng `--p` (và `--k` suy ra) để xoay/nghiêng các phần tử.

Trích đoạn 3 – `js/pages/home/hero3d.js` (quỹ đạo và vệ tinh):

```js
  const ORBITS = [
    { r: 3.15, tiltX: 1.25, tiltZ: -0.35, color: 0x6f86ff, speed: 0.32, sats: [0x22d3ee, 0xa78bfa] },
    { r: 3.75, tiltX: 1.05, tiltZ: 0.55, color: 0x22d3ee, speed: -0.22, sats: [0x34d399] },
    { r: 2.55, tiltX: 1.7, tiltZ: 0.05, color: 0xa78bfa, speed: 0.45, sats: [0xfbbf24] },
  ];
  for (const o of ORBITS) {
    const group = new THREE.Group();
    group.rotation.set(o.tiltX, 0, o.tiltZ);
    const ringGeo = keep(new THREE.TorusGeometry(o.r, 0.012, 8, 220));
    const ringMat = keep(new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.55 }));
    group.add(new THREE.Mesh(ringGeo, ringMat));
```

Giải thích: ba vòng quỹ đạo nghiêng khác nhau (mô-típ logo thương hiệu) được dựng bằng `TorusGeometry`; mọi hình học/vật liệu đi qua `keep()` để được `dispose()` khi rời trang.

---

### Danh mục khóa học & bảng điều khiển học tập

**1. Mô tả & giao diện**

Trang `#/learn` gồm: (a) dải tổng quan màu navy với lời chào "Xin chào <tên>…", hồ sơ (ảnh đại diện/chữ cái đầu, phần trăm lộ trình, tổng XP), 3 ô thống kê "Khóa học", "Luyện tập (Bài học)", "Thử thách" kèm thanh tiến độ, nút "Đăng nhập để đồng bộ tiến độ" và ghi chú khi chưa đăng nhập; (b) thẻ "Tiếp tục học"/"Gợi ý bắt đầu"/"Ôn tập lại" trỏ tới bài phù hợp; (c) danh mục khóa học với 3 tab "Khóa học gợi ý", "Đang học (n)", "Đã hoàn thành (n)", ô tìm kiếm, chip lọc theo lộ trình đang mở, lưới thẻ khóa học có minh họa SVG và hiệu ứng nghiêng 3D; (d) "Bản đồ hành trình lập trình" gồm các chặng (lộ trình `available`) với vòng phần trăm và danh sách khóa, riêng chặng `algorithms` có thêm liên kết "Lăng kính thuật toán"; (e) khối "Sắp ra mắt" liệt kê lộ trình `roadmap`.

**2. Các file tham gia**

- `js/pages/learn.js` – trang và hàm `courseCard()`.
- `js/pages/learn/course-art.js` – màu, banner, minh họa, biểu tượng khóa học, `TRACK_STYLE`.
- `js/pages/learn/shared.js` – `courseDoneCount`, `pct`, `bar`, `lastOpenedLesson`, `enableTilt`.
- `css/pages/learn.css` – giao diện.
- Ngoài phạm vi: `js/services/content.js` (`loadCatalog`, `loadCourse`, `loadChallenges`), `js/services/progress.js` (`getProgress`, `isDone`, `totalXp`), `js/core/store.js` (`appState`, `bus`), `js/components/auth-dialog.js`.

**3. Luồng xử lý từng bước**

1. Gọi `loadCatalog()`; nếu lỗi hiển thị `emptyState` "Không tải được danh sách khóa học".
2. Song song lấy `getProgress()` và `loadChallenges()` (`Promise.allSettled`); nếu tiến độ lỗi dùng `{ lessons: {}, challenges: {} }`.
3. Tách lộ trình `available` và `roadmap`, tính `totalLessons`; đọc `ctx.query.tab` và `ctx.query.track` để khôi phục tab/bộ lọc.
4. `renderBand()`: với mỗi khóa đếm bài đã xong bằng `courseDoneCount()` (tiền tố `<courseId>-`), tính số khóa đã bắt đầu/hoàn thành, số bài xong, số thử thách đã giải, tổng XP, phần trăm lộ trình.
5. `renderContinue()`: lấy bài mở gần nhất (`lastOpenedLesson()` – khóa `learn:last:<user.key hoặc guest>`) và bài hoàn thành gần nhất (theo `progress.lessons[id].at`), chọn mốc mới hơn; nếu bài đó đã xong thì nhảy tới bài chưa xong kế tiếp; nếu không có dữ liệu thì gợi ý bài đầu của khóa đầu tiên.
6. `renderTabs()`/`renderChips()`/`renderGrid()`: lọc khóa theo lộ trình, theo trạng thái (`new`/`learning`/`done`) và theo từ khóa trên tiêu đề, phụ đề, mô tả, trình độ, thẻ; hiển thị trạng thái rỗng phù hợp từng tab.
7. `renderPath()`: với mỗi lộ trình mở, gộp số bài và số bài xong của các khóa thuộc lộ trình, gán lớp `is-done`/`is-active`.
8. `enableTilt(grid, signal)` bật nghiêng 3D cho `.course-card` khi rê chuột.
9. Khi `bus` phát `progress:change` thì vẽ lại toàn bộ; khi người dùng đổi tài khoản thì vẽ lại dải tổng quan và thẻ tiếp tục.

**4. Hàm/lớp/API cốt lõi**

`courseCard(course, progress, index)`, `courseTheme()`, `themeVars()`, `courseArt()`, `courseEmblem()`, `courseDoneCount()`, `pct()`, `bar()`, `lastOpenedLesson()`, `enableTilt()`, `loadCatalog()`, `loadCourse()`, `getProgress()`, `isDone()`, `totalXp()`, `bus.on('progress:change')`, `appState.subscribe()`, `openAuthDialog()`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/learn.js` (trạng thái và nút của thẻ khóa học):

```js
export function courseCard(course, progress, index = 0) {
  const theme = courseTheme(course);
  const total = course.lessons_count || 0;
  const done = courseDoneCount(progress, course.id);
  const p = pct(done, total);
  const state = total && done >= total ? 'done' : done ? 'learning' : 'new';
  const cta = { new: 'Đăng ký', learning: 'Vào học', done: 'Ôn tập' }[state];
```

Giải thích: trạng thái thẻ được suy ra từ số bài đã hoàn thành so với `lessons_count`; nhãn nút tương ứng là "Đăng ký", "Vào học" hoặc "Ôn tập".

Trích đoạn 2 – `js/pages/learn.js` (lọc lưới khóa học):

```js
    function renderGrid() {
      const ql = q.trim().toLowerCase();
      const courses = catalog.courses.filter((c) => (filter === 'all' || c.track === filter)
        && (tab === 'all' || stateOf(c) === tab)
        && (!ql || [c.title, c.subtitle, c.description, c.level, ...(c.tags || [])].join(' ').toLowerCase().includes(ql)));
```

Giải thích: ba điều kiện lọc (lộ trình, tab trạng thái, từ khóa) được kết hợp bằng phép AND trên dữ liệu `index.json`.

Trích đoạn 3 – `js/pages/learn/shared.js` (đếm bài đã xong):

```js
export function courseDoneCount(progress, courseId) {
  const prefix = `${courseId}-`;
  return Object.keys(progress?.lessons || {}).filter((id) => id.startsWith(prefix)).length;
}
```

Giải thích: mã bài học có tiền tố là mã khóa nên chỉ cần đếm khóa trong `progress.lessons` bắt đầu bằng `<courseId>-`.

---

### Trang khóa học (chương, bài, tiến độ)

**1. Mô tả & giao diện**

Trang `#/learn/:course` gồm: đường dẫn "Học › <tên khóa>"; hero màu theo khóa (biểu tượng lớn, trình độ, tên lộ trình, tiêu đề, phụ đề, mô tả Markdown, 4 số liệu: số chương, số bài, tổng XP, "Miễn phí – học cả offline"), nút "Bắt đầu học"/"Tiếp tục bài học"/"Ôn lại từ đầu", minh họa SVG và thanh "Tiến độ của bạn"; danh sách chương dạng accordion (số thứ tự hoặc dấu tích, số bài, thanh tiến độ chương, mũi tên), mỗi bài hiển thị trạng thái (đã xong/đang học/số thứ tự), độ khó, biểu tượng loại nội dung, nhãn "Đã xong"/"Học tiếp"/"Bắt đầu", XP; thẻ bên dính gồm vòng tiến độ, bài kế tiếp, nút học, thống kê (bài đã xong, XP đạt được, chương hoàn thành, trình độ) và liên kết nhanh tới Thử thách, Lăng kính, Trợ lý AI.

**2. Các file tham gia**

- `js/pages/course.js`.
- `js/pages/learn/course-art.js`, `js/pages/learn/shared.js` (`pct`, `bar`, `ring`).
- `css/pages/learn.css` (`.lx-hero`, `.chapter`, `.lesson-row`, `.lx-side-card`).
- Ngoài phạm vi: `js/services/content.js` (`loadCourse`, `loadCatalog`, `DIFFICULTY_LABEL`), `js/services/progress.js`, `js/components/markdown.js`.

**3. Luồng xử lý từng bước**

1. `loadCourse(ctx.params.course)`; lỗi → `emptyState` "Không tìm thấy khóa học" kèm nút về danh sách.
2. Đặt `document.title`; thử `loadCatalog()` để lấy tên lộ trình (bỏ qua nếu ngoại tuyến).
3. Làm phẳng danh sách bài, tính tổng XP; tạo tập `open` gồm mọi chương rồi đóng sẵn các chương đã hoàn thành (trừ khi cả khóa đã xong).
4. `render()`: đọc `getProgress()`, tìm bài chưa xong đầu tiên (`next`), chỉ số chương hiện tại, phần trăm, XP đạt, số chương hoàn thành, nhãn và liên kết nút chính.
5. Dựng hero, danh sách chương (mỗi bài gắn `lessonKinds()`), thẻ bên và nút "Mở tất cả"/"Thu gọn tất cả".
6. Bấm tiêu đề chương → bật/tắt lớp `is-open`, cập nhật `aria-expanded`, đặt `inert` cho thân chương, ghi vào tập `open`.
7. Lần vẽ đầu có lớp `is-first` để chạy hoạt ảnh xuất hiện; các lần sau thì không.
8. `bus.on('progress:change')` gọi lại `render()` để đồng bộ khi hoàn thành bài ở nơi khác.

**4. Hàm/lớp/API cốt lõi**

`lessonKinds(l)`, `render()`, `courseTheme()`, `courseArt()`, `courseEmblem()`, `pct()`, `bar()`, `ring()`, `loadCourse()`, `loadCatalog()`, `getProgress()`, `isDone()`, `markdown()`, `DIFFICULTY_LABEL`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/course.js` (phân loại nội dung bài):

```js
function lessonKinds(l) {
  const kinds = [];
  if (l.theory) kinds.push({ icon: 'book-open', label: 'Lý thuyết' });
  if (l.checks?.length) kinds.push({ icon: 'globe', label: `Chấm giao diện (${l.checks.length} tiêu chí)` });
  else if (l.tests?.length) kinds.push({ icon: 'terminal', label: `Bài tập code (${l.tests.length} bộ test)` });
  if (l.prism) kinds.push({ icon: 'prism', label: 'Có minh họa trong Lăng kính thuật toán' });
  return kinds;
}
```

Giải thích: biểu tượng của mỗi bài được suy ra từ dữ liệu bài: có lý thuyết, có tiêu chí chấm giao diện HTML (`checks`) hoặc bộ test code (`tests`), có liên kết V-Prism (`prism`).

Trích đoạn 2 – `js/pages/course.js` (thu gọn sẵn chương đã hoàn thành):

```js
    {
      // Start with fully-completed chapters collapsed (unless the whole course is done).
      const p0 = await getProgress();
      const complete = course.chapters.filter((ch) => ch.lessons.length && ch.lessons.every((l) => isDone(p0, 'lessons', l.id)));
      if (complete.length < course.chapters.length) complete.forEach((ch) => open.delete(ch.id));
    }
```

Giải thích: người học thấy ngay chương đang học vì các chương đã xong được đóng lại, trừ khi toàn bộ khóa đã hoàn thành.

---

### Trang bài học (lý thuyết, bài tập, chấm, hoàn thành, điều hướng)

**1. Mô tả & giao diện**

Trang `#/learn/:course/:lesson` dùng bố cục luyện tập chung (`buildPracticePage`): cột trái có đường dẫn, tiêu đề, huy hiệu (độ khó, XP, "Bài i/n", "Đã hoàn thành"), các tab "Lý thuyết", "Đề bài" (kèm tối đa 2 ví dụ kiểm thử công khai và liên kết V-Prism nếu có), "Gợi ý (n)" (mở dần từng gợi ý), "Lời giải" (khóa cho tới khi giải đúng hoặc nộp sai 3 lần), chân trang bài trước/bài sau; cột phải là bàn làm việc chạy code thật và nút "Nộp bài", kèm ngăn trợ lý AI. `lesson.js` phủ thêm khung mục Học: biểu tượng khóa học cạnh đường dẫn, "bản đồ bài" gồm một đoạn cho mỗi bài nhóm theo chương (trạng thái `is-current`/`is-done`), biểu ngữ "Bạn đã hoàn thành bài này" với nút "Bài tiếp"/"Về khóa học".

**2. Các file tham gia**

- `js/pages/lesson.js`.
- `js/pages/learn/course-art.js` (`courseTheme`, `themeVars`, `courseEmblem`), `js/pages/learn/shared.js` (`rememberLesson`).
- `css/pages/learn.css` (`.lx-lesson`, `.lx-lesson__map`, `.lx-lesson__seg`, `.lx-lesson__done`).
- Ngoài phạm vi: `js/components/practice.js` (`buildPracticePage`), `js/components/ide.js` (bàn làm việc, chấm), `js/services/content.js` (`findLesson`, `runtimeLang`), `js/services/progress.js` (`markComplete`).

**3. Luồng xử lý từng bước**

1. `findLesson(course, lesson)` trả về `{ course, lesson, prev, next, index, total }`; lỗi hoặc không có bài → `emptyState`.
2. Đặt tiêu đề tài liệu, đọc tiến độ, xác định ngôn ngữ chạy (`runtimeLang`: `web` → `html`), ghi nhớ bài đang mở (`rememberLesson`).
3. Gọi `buildPracticePage()` với lý thuyết, đề, gợi ý, lời giải, mã khởi tạo, `tests`/`checks`, `draftKey: lesson:<id>`, `attemptsKey: attempts:lesson:<id>`, liên kết trước/sau.
4. Người học chạy/nộp bài trong bàn làm việc; khi mọi test đạt (`result.passed === result.total`) `buildPracticePage` gọi `onPass`; nếu chưa đạt thì tăng số lần nộp sai, tới lần thứ 3 thông báo mở lời giải.
5. `onPass` gọi `markComplete('lessons', lesson.id, lesson.xp)`, bật khung "đã giải" và hiện toast "Xuất sắc! Hoàn thành bài học (+XP)" (lần đầu) hoặc "Chính xác! Bạn đã giải lại bài này", kèm hành động "Bài tiếp theo".
6. Sau khi dựng trang, áp biến màu khóa học vào `container`, chèn biểu tượng khóa cạnh đường dẫn, thêm bản đồ bài và biểu ngữ hoàn thành.
7. `bus.on('progress:change')` vẽ lại bản đồ bài.

**4. Hàm/lớp/API cốt lõi**

`findLesson()`, `runtimeLang()`, `buildPracticePage(container, ctx, cfg)`, `markComplete(kind, id, xp)` → `{ firstTime, xp }`, `getProgress()`, `isDone()`, `rememberLesson()`, `renderMap()`, `setSolvedFrame()`, `toast()`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/lesson.js` (xử lý khi đạt):

```js
      onPass: async () => {
        const { firstTime, xp } = await markComplete('lessons', lesson.id, lesson.xp);
        setSolvedFrame(true);
        toast(firstTime ? `Xuất sắc! Hoàn thành bài học (+${xp} XP).` : 'Chính xác! Bạn đã giải lại bài này.', {
          type: 'success',
          action: next ? { label: 'Bài tiếp theo', onClick: () => ctx.navigate(`/learn/${course.id}/${next.id}`) } : undefined,
        });
      },
```

Giải thích: hoàn thành bài ghi tiến độ và XP qua `markComplete`; XP chỉ cộng lần đầu (`firstTime`).

Trích đoạn 2 – `js/pages/lesson.js` (bản đồ bài theo chương):

```js
    function renderMap(p) {
      let n = 0;
      mount(map, course.chapters.map((ch, ci) => h('div', { class: 'lx-lesson__map-ch', title: `Chương ${ci + 1}: ${ch.title}`, style: { flexGrow: String(Math.max(1, ch.lessons.length)) } },
        ch.lessons.map((l) => {
          n += 1;
          const state = l.id === lesson.id ? 'is-current' : isDone(p, 'lessons', l.id) ? 'is-done' : '';
          return h('a', { class: `lx-lesson__seg ${state}`, href: `#/learn/${course.id}/${l.id}`, title: `Bài ${n}: ${l.title}`, 'aria-label': `Bài ${n}: ${l.title}${state === 'is-done' ? ' (đã xong)' : ''}`, 'aria-current': l.id === lesson.id ? 'page' : null });
        }))));
    }
```

Giải thích: mỗi chương chiếm độ rộng tỉ lệ với số bài; mỗi đoạn là một liên kết điều hướng nhanh tới bài tương ứng.

---

### Sảnh thử thách (thẻ người chơi/hạng, vào trận, thử thách hôm nay, bản đồ, bộ lọc, bảng xếp hạng, huy hiệu)

**1. Mô tả & giao diện**

Trang `#/challenges` ("Đấu trường") luôn có giao diện tối. Hero có 4 lớp SVG đường chân trời chuyển động parallax theo chuột, 3 tia sáng, 16 đốm lửa bay, tiêu đề "V-Code Đấu trường", mô tả "<n> trận đấu lập trình trên <m> bản đồ…", 4 số liệu (trận, bản đồ, ngôn ngữ, trùm cuối). Các khối:

- **Nút "Vào trận"/"Chơi lại"**: trỏ tới trận chưa hạ đầu tiên (`stats.nextUp`), nếu đã hạ hết thì trỏ tới thử thách hôm nay.
- **Thử thách hôm nay**: huy hiệu hạng, số chặng, tên, hạng · ngôn ngữ · bản đồ, XP hoặc nhãn "Đã hạ", đồng hồ "Làm mới sau HH:MM:SS".
- **Thẻ người chơi**: ảnh đại diện/chữ cái đầu, tên, trường/email, cấp độ, huy hiệu bậc (7 bậc từ Tân binh đến Huyền thoại, có phân hạng I/II/III), XP, thanh lên hạng, thanh cấp, thống kê "Trận đã hạ", "Trùm đã hạ", "Chuỗi ngày", nút đăng nhập khi là khách.
- **Bản đồ** (5 bản đồ): tranh SVG, ngôn ngữ, dấu "Đã chinh phục", mô tả, thanh tiến độ; bấm để lọc lưới.
- **Trùm cuối**: các trận `boss`/`BOSS` với nhãn "Thách đấu" hoặc "Đã hạ".
- **Bộ lọc & lưới**: chip theo 6 hạng (D, C, B, A, S, Trùm) kèm số lượng, phân đoạn trạng thái (Tất cả/Chưa hạ/Đã hạ), ô tìm kiếm (bỏ dấu tiếng Việt, hỗ trợ số chặng hoặc "#số"), chọn bản đồ, nút "Bỏ lọc", biểu ngữ bản đồ đang lọc, đếm "x/y trận"; thẻ trận có số chặng, huy hiệu hạng, tên, ngôn ngữ, XP, trạng thái.
- **Cột bên**: "Gần hoàn thành" (bản đồ đang chơi dở có tỉ lệ cao nhất và tối đa 4 trận còn lại), "Bảng xếp hạng" Top 10 (cần mạng; hàng của người dùng được tô; top 3 có lớp riêng), "Huy hiệu" (13 huy chương, có khóa và tiến độ value/goal).

**2. Các file tham gia**

- `js/pages/challenges.js`.
- `js/pages/arena/core.js` (hạng, bậc, cấp, chuỗi ngày, thống kê, thử thách hôm nay, huy hiệu).
- `js/pages/arena/art.js` (huy hiệu, huy chương, tranh bản đồ, hero).
- `css/pages/challenges.css`.
- Ngoài phạm vi: `js/services/content.js` (`loadChallenges` → `data/challenges.json`), `js/services/progress.js` (`getProgress`, `isDone`, `totalXp`, `loadLeaderboard` – đọc bộ sưu tập Firestore `leaderboard` sắp theo `xp` giảm dần), `js/core/store.js`.

**3. Luồng xử lý từng bước**

1. Song song `loadChallenges()` và `ensureArenaCss()` (nạp phông Barlow Condensed/Chakra Petch và `challenges.css` nếu thiếu); lỗi → màn hình "Không tải được thử thách" có nút "Thử lại".
2. Đọc tiến độ; khôi phục bộ lọc từ `ctx.query.world` và `ctx.query.rank`; `computeStats(data, progress)` tính tổng/đã hạ theo bản đồ, hạng, ngôn ngữ, trùm, XP, chuỗi ngày và trận kế tiếp.
3. Dựng hero (đốm lửa sinh bằng `rng('embers')` có hạt giống cố định); nếu con trỏ chính xác và không giảm chuyển động thì gắn parallax qua biến `--mx/--my`.
4. `renderAll()` lần lượt vẽ thẻ người chơi, nút vào trận, thử thách hôm nay, bản đồ, trùm, gần hoàn thành, bộ lọc, lưới, huy hiệu; `createRevealer()` cho các thẻ xuất hiện so le khi cuộn tới.
5. `dailyChallenge()` chọn trận cố định trong ngày: đọc `localStorage['vc-arena-daily']`; nếu cùng ngày và cùng chủ sở hữu thì giữ; nếu không, băm FNV `"<ngày>|vcode-arena"` để chọn trong các trận chưa hạ và lưu lại.
6. `setInterval` mỗi giây cập nhật đồng hồ đếm ngược tới nửa đêm; khi sang ngày mới thì vẽ lại thử thách hôm nay và nút vào trận.
7. Thay đổi bộ lọc → `setFilter(patch)` cập nhật trạng thái, chip, bản đồ đang chọn, lưới và `history.replaceState` với `?world=&rank=`; ô tìm kiếm dùng `debounce` 140 ms.
8. `renderBoard()`: hiện khung xương; nếu ngoại tuyến báo cần Internet; nếu có mạng gọi `loadLeaderboard(10)`, tô hàng của người dùng, nhắc đăng nhập hoặc báo "chưa vào Top 10"; lỗi có nút "Thử lại".
9. `idleWhenHidden(hero)` thêm lớp `is-idle` để tạm dừng hoạt ảnh CSS khi hero khuất hoặc tab ẩn.
10. `progress:change` → tính lại thống kê và vẽ lại (không hoạt ảnh); đổi người dùng → vẽ lại thẻ người chơi và bảng xếp hạng; có mạng trở lại → tải lại bảng xếp hạng.

**4. Hàm/lớp/API cốt lõi**

- `RANKS = ['D','C','B','A','S','BOSS']`, `RANK_META` (Tập sự, Chiến binh, Tinh nhuệ, Đột kích, Tối thượng, Trùm cuối), `TIERS` (7 bậc với ngưỡng 0, 300, 1 000, 2 500, 5 000, 9 000, 15 000 XP).
- `tierFor(xp)` → `{ index, tier, next, division, label, pct, toNext }`; `levelFor(xp)` (cấp L bắt đầu ở `50·L·(L−1)` XP).
- `streaks(progress)` → `{ current, best, activeToday }`; `computeStats()`; `dailyChallenge()`; `achievements(stats)` (13 huy hiệu); `msToMidnight()`, `clock()`.
- `rankEmblem()`, `tierEmblem()`, `medal()`, `worldArt()`, `heroLayers()`, `glyph`.
- `loadChallenges()`, `getProgress()`, `isDone()`, `loadLeaderboard(10)`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/arena/core.js` (tính bậc từ XP):

```js
export function tierFor(xp) {
  xp = Math.max(0, Number(xp) || 0);
  let index = 0;
  for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i].min) index = i;
  const tier = TIERS[index];
  const next = TIERS[index + 1] || null;
  let division = '';
  if (next && index > 0) {
    const span = (next.min - tier.min) / 3;
    division = ROMAN[Math.min(2, Math.floor((xp - tier.min) / span))];
  }
  const pct = next ? (xp - tier.min) / (next.min - tier.min) : 1;
  return { index, tier, next, division, label: division ? `${tier.name} ${division}` : tier.name, pct: Math.min(1, Math.max(0, pct)), toNext: next ? next.min - xp : 0 };
}
```

Giải thích: bậc được xác định theo ngưỡng XP; từ bậc Đồng trở lên (trừ bậc cao nhất) mỗi bậc chia ba phân hạng I, II, III.

Trích đoạn 2 – `js/pages/arena/core.js` (thử thách hôm nay):

```js
export function dailyChallenge(data, progress, owner = 'guest') {
  const today = dayKey();
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null'); } catch { saved = null; }
  if (saved && saved.date === today && saved.owner === owner) {
    const c = data.challenges.find((x) => x.id === saved.id);
    if (c) return c;
  }
  const pool = data.challenges.filter((c) => !isDone(progress, 'challenges', c.id));
  const from = pool.length ? pool : data.challenges;
  const c = from[hash(`${today}|vcode-arena`) % from.length];
  try { localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today, owner, id: c.id })); } catch { /* storage off */ }
  return c;
}
```

Giải thích: thử thách hôm nay mang tính xác định theo ngày (băm chuỗi ngày) và được ghi nhớ suốt ngày cho từng chủ sở hữu, nên không đổi khi người dùng hạ thêm trận.

Trích đoạn 3 – `js/pages/challenges.js` (bộ lọc lưới trận):

```js
    function filtered() {
      const ql = fold(state.q.trim().replace(/^#/, ''));
      return data.challenges.filter((c) => (!state.world || c.world === state.world)
        && (state.rank === 'all' || c.rank === state.rank)
        && (state.status === 'all' || (state.status === 'done') === isDone(progress, 'challenges', c.id))
        && (!ql || (/^\d+$/.test(ql) ? String(c.stage) === String(Number(ql)) || fold(c.title).includes(ql) : fold([c.title, c.task, ...(c.tags || []), LANG_LABEL[c.lang]].join(' ')).includes(ql))));
    }
```

Giải thích: từ khóa được bỏ dấu tiếng Việt bằng `fold()`; nếu là số thì so khớp số chặng, ngược lại tìm trong tiêu đề, đề bài, thẻ kỹ năng và tên ngôn ngữ.

---

### Trang thi đấu thử thách (HUD, vòng kiểm thử, lớp phủ chiến thắng/thất bại)

**1. Mô tả & giao diện**

Trang `#/challenges/:id` gồm:

- **HUD**: nút "Sảnh" (quay về sảnh, giữ bộ lọc bản đồ), số chặng `#NNN`, "Bản đồ i · tên", tiêu đề trận, huy hiệu hạng, ngôn ngữ, chip XP (`+XP` hoặc "Đã hạ"), đồng hồ trận (chỉ tính cục bộ, tạm dừng khi tab ẩn), nút trận trước/trận sau. Trận trùm có lớp `is-boss`.
- **Dải vòng đấu**: các ô "Vòng i" (chờ/đạt/chưa đạt, vòng ẩn có khóa và nhãn "Ẩn"), tóm tắt "N vòng · M vòng ẩn · Nộp bài để chấm" hoặc "Toàn thắng"/"x/y vòng đạt · Điểm a,b/10".
- **Đề bài** (tab): "Nhiệm vụ" (mục tiêu Markdown, các vòng công khai với dữ liệu vào và kết quả mong đợi, thông báo số vòng ẩn, thẻ kỹ năng, gợi ý phím Ctrl+Enter), "Gợi ý (n)" mở lần lượt, "Lời giải" khóa tới khi hạ trận hoặc sau 3 lần nộp chưa đạt.
- **Bàn làm việc**: `IDE.createWorkbench` với nút "Nộp bài", ngăn trợ lý AI.
- **Tab di động**: "Nhiệm vụ"/"Viết code".
- **Lớp phủ kết quả**: tiêu đề "Chiến thắng" hoặc "Thất bại — x/y bài kiểm tra", các ô vòng, thống kê (phần thưởng XP đếm tăng, thời gian, số vòng) hoặc (vòng đạt, thời gian, gợi ý xét trường hợp đặc biệt/lời giải đã mở), khối tiến độ hạng ("Thăng hạng! A → B", "lên cấp!"), các nút "Thử thách tiếp theo", "Thử lại", "Về sảnh".

**2. Các file tham gia**

- `js/pages/challenge.js`.
- `js/pages/arena/overlay.js` (`roundTiles`, `showMatchResult`).
- `js/pages/arena/core.js` (`RANK_META`, `LANG_LABEL`, `WORLD_HUE`, `ensureArenaCss`, `pad3`, `cleanTitle`, `clock`, `tierFor`, `levelFor`).
- `js/pages/arena/art.js` (`rankEmblem`, `tierEmblem`, `glyph`).
- `css/pages/challenges.css` (và `css/pages/ide.css` được nạp bổ sung).
- Ngoài phạm vi: `js/components/ide.js` (`createWorkbench`, `loadDraft`), `js/components/practice.js` (`createAIDrawer`), `js/services/progress.js` (`markComplete`, `totalXp`), `js/core/idb.js` (`kv`, `idb`).

**3. Luồng xử lý từng bước**

1. Tải `challenges.json` và CSS (`challenges.css`, `ide.css`); tìm trận theo `ctx.params.id`, không thấy → màn hình "Mất tín hiệu".
2. Xác định bản đồ, trận trước/sau, hạng, cờ trùm, danh sách test, số vòng ẩn, khóa nháp `challenge:<id>` và khóa số lần nộp `attempts:challenge:<id>`.
3. Song song đọc tiến độ, bản nháp, số lần nộp sai và nạp động `practice.js`.
4. Khởi động đồng hồ trận (`setInterval` 1 giây, bỏ qua khi tab ẩn).
5. Dựng HUD, dải vòng (`roundTiles(tests, null, { compact: true })`), tab đề bài, bàn làm việc với mã nháp hoặc mã khởi tạo.
6. Người chơi nộp bài → `onSubmitted(result)`: cập nhật dải vòng; nếu mọi test đạt thì lấy XP trước, gọi `markComplete('challenges', id, xp)`, lấy XP sau, dừng đồng hồ, đổi chip XP và thêm lớp `is-won`; nếu chưa đạt thì tăng `failCount` và lưu vào `kv`.
7. Nếu vừa đủ 3 lần sai hoặc đang ở tab Lời giải thì vẽ lại tab đề bài (mở khóa lời giải).
8. Gọi `showMatchResult()` với thắng/thua, số vòng đạt, thời gian, XP trước/sau, cờ lời giải đã mở, các hàm `onRetry` (đưa tiêu điểm về editor), `onNext`, `onLobby`.
9. Lớp phủ bẫy phím Tab trong hộp thoại, Escape đóng và quay lại thử; nếu thắng lần đầu XP đếm tăng sau 450 ms; thanh hạng chạy từ phần trăm cũ tới mới (từ 0 nếu thăng hạng).
10. Phím Ctrl/⌘+Enter ngoài editor chuyển sang tab code và chạy thử (`wb.run()`), trừ khi lớp phủ đang mở.

**4. Hàm/lớp/API cốt lõi**

`IDE.createWorkbench({ lang, code, starter, tests, draftKey, signal, submitLabel, onAskAI, onSubmitted })`, `markComplete()`, `totalXp()`, `getProgress()`, `kv.get/set(attemptsKey)`, `roundTiles()`, `showMatchResult(host, o)` → `{ el, close }`, `countUp()`, `tierFor()`, `levelFor()`, `clock()`, `renderRounds()`, `renderBriefTab()`, `setPane()`, `SOLUTION_AFTER = 3`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/challenge.js` (xử lý kết quả nộp bài):

```js
        const win = result.total > 0 && result.passed === result.total;
        let firstTime = false;
        let xpGained = 0;
        let xpBefore = 0;
        let xpAfter = 0;
        if (win) {
          const p0 = await getProgress();
          xpBefore = totalXp(p0);
          try {
            ({ firstTime, xp: xpGained } = await markComplete('challenges', c.id, c.xp));
          } catch (err) {
            toast(`Chưa lưu được tiến độ: ${err.message}`, { type: 'error' });
          }
          xpAfter = totalXp(await getProgress());
          solved = true;
          stoppedAt = stoppedAt || Date.now();
          timerEl.textContent = clock(elapsed());
          renderXpChip();
          root.classList.add('is-won');
        } else {
          failCount += 1;
          kv.set(attemptsKey, failCount).catch(() => {});
        }
```

Giải thích: chỉ "toàn thắng" mới ghi tiến độ; XP trước và sau được đo để lớp phủ hiển thị thăng hạng/lên cấp; trận thua làm tăng bộ đếm phục vụ mở khóa lời giải.

Trích đoạn 2 – `js/pages/arena/overlay.js` (ô vòng kiểm thử):

```js
export function roundTiles(tests, results = null, { compact = false } = {}) {
  return h('ol', { class: `ar-rounds__tiles ${compact ? 'is-compact' : ''}` }, tests.map((t, i) => {
    const r = results?.[i];
    const hidden = r ? r.hidden : t.hidden;
    const st = r ? (r.ok ? 'pass' : 'fail') : 'pending';
    const label = `Vòng ${i + 1}${hidden ? ' (ẩn)' : ''}: ${st === 'pass' ? 'đạt' : st === 'fail' ? (r.timedOut ? 'quá thời gian' : 'chưa đạt') : 'chưa chấm'}`;
    return h('li', { class: `ar-round is-${st} ${hidden ? 'is-hidden' : ''}`, title: label, 'aria-label': label, style: `--i:${i}` },
      h('span', { class: 'ar-round__n' }, String(i + 1)),
      h('span', { class: 'ar-round__ic' }, st === 'pass' ? icon('check') : st === 'fail' ? icon('x') : hidden ? glyph.hidden() : null),
      hidden ? h('span', { class: 'ar-round__tag' }, 'Ẩn') : null);
  }));
}
```

Giải thích: mỗi test là một "vòng" với ba trạng thái chờ/đạt/chưa đạt (phân biệt cả quá thời gian); biến `--i` được CSS dùng để lật ô so le (keyframes `ar-flip`).

---

### Lớp học – giáo viên (tạo lớp, mời, giao bài, chấm, bảng điểm, hoạt động, thảo luận…)

**1. Mô tả & giao diện**

Sau khi đăng nhập và chọn vai trò "Giáo viên" (một lần, được khóa trên máy chủ), giáo viên có:

- **Bảng điều khiển `#/classroom`**: lời chào theo buổi, nút "Tạo lớp mới", 4 KPI (Lớp đang dạy kèm số học sinh không trùng lặp, Bài tập đã giao/đang mở, Chờ chấm, Điểm trung bình), lưới thẻ lớp (banner sinh theo mã, mã lớp, nhãn "Dữ liệu cũ", số học sinh, số bài, tỉ lệ nộp, số chờ chấm), cột bên "Hạn nộp sắp tới" (14 ngày) và "Hàng chờ chấm"; trạng thái rỗng có 4 bước hướng dẫn.
- **Khung lớp `#/classroom/:code`** với thanh bên: chip vai trò, bộ chuyển lớp, 7 mục (Tổng quan, Bài tập có huy hiệu số chờ chấm, Học sinh có huy hiệu sĩ số, Bảng điểm, Thảo luận, Hoạt động, Cài đặt lớp) và thẻ "Mã lớp – Mời học sinh".
- **Tổng quan**: hero lớp, nút "Giao bài mới", "Mời học sinh", lời nhắc khi lớp chưa có học sinh, 5 KPI, lịch hạn nộp 14 ngày, biểu đồ thanh tỉ lệ nộp theo bài, donut tình trạng (Đã chấm/Chờ chấm/Chưa nộp còn hạn/Thiếu quá hạn), histogram phân bố điểm, "Cần chú ý" (thiếu bài quá hạn hoặc ĐTB < 5), "Đang trực tuyến", "Hoạt động gần đây".
- **Bài tập**: phân đoạn "Danh sách"/"Chờ chấm", tìm kiếm, chip lọc hạn (Tất cả/Đang mở/Sắp hết hạn/Đã hết hạn/Không hạn); mỗi bài có hạn, ngôn ngữ, số test (ẩn), tiến độ nộp, điểm TB, chờ chấm và các nút Chấm, Sửa, Nhân bản, Xóa. Trang chi tiết có 4 KPI, donut, histogram, bảng bài làm sắp xếp được, khối "Đề bài & bộ test", nút "Chấm lần lượt". Hàng chờ chấm sắp bài nộp sớm nhất lên đầu.
- **Trình soạn bài** (hộp thoại 4 phần): Thông tin bài (tiêu đề, đề Markdown có xem trước), Ngôn ngữ & hạn nộp (5 ngôn ngữ; ngày + giờ 24h + phút; nút nhanh +1 ngày/+3 ngày/+1 tuần/+2 tuần; "Không giới hạn thời gian"), Mã khởi tạo (editor), Bộ test chấm tự động (thêm/xóa test, công tắc "Test ẩn").
- **Khung chấm** (hộp thoại lớn): mã nguồn có số dòng và tô màu, nút "Chạy lại test", thông tin học sinh, thời điểm nộp/hạn/nhãn "Nộp trễ", thẻ chấm tự động (điểm, thanh test), ô điểm 0–10 bước 0,25 + thanh trượt + màu theo dải điểm, chip điểm nhanh (theo điểm tự động, 5, 7, 8, 9, 10), nhận xét với 5 câu mẫu, điều hướng bài trước/sau, "Lưu điểm", "Lưu & bài tiếp".
- **Học sinh**: 4 KPI (Sĩ số, Đang trực tuyến trong 2 phút, Hoàn thành tất cả, Cần chú ý), lọc, bảng (trạng thái trực tuyến và bài đang làm, tiến độ, điểm TB, quá hạn, ngày tham gia, xóa khỏi lớp), hồ sơ học sinh dạng hộp thoại.
- **Bảng điểm**: ma trận học sinh × bài tập, ô hiện điểm GV hoặc điểm tự động (in nghiêng, "chờ chấm"), "Thiếu" khi quá hạn, chú giải dải điểm, sắp xếp theo cột, dòng "Trung bình lớp", nút "Xuất CSV".
- **Thảo luận**, **Hoạt động** (dòng thời gian lọc theo loại, nhóm theo ngày), **Cài đặt lớp** (sửa tên/môn/mô tả, khối lời mời, thông tin, "Vùng nguy hiểm" xóa lớp).
- **Hộp thoại mời**: mã lớp hiển thị từng ký tự, nút chép mã, liên kết mời `…#/join/<CODE>` có nút chép và "Chia sẻ…" (Web Share API), mã QR, các bước hướng dẫn, nút "Trình chiếu mã lớp" (mã lớn + QR 280 px).

**2. Các file tham gia**

- `js/pages/classroom.js`, `js/pages/classroom/landing.js` (`roleView`), `home.js`, `shell.js`, `workspace.js`, `overview.js`, `assignments.js`, `people.js`, `gradebook.js`, `feed.js`, `settings.js`, `util.js`, `art.js`.
- `css/pages/classroom.css`.
- Dịch vụ dữ liệu: `js/services/classroom.js` (Firestore).
- Ngoài phạm vi: `js/components/ide.js`, `js/runtime/runner.js` (`gradeCode`), `js/components/editor.js`, `js/components/markdown.js`, `js/components/highlight.js`, `js/core/format.js`, `js/core/ui.js`, thư viện QR tại `QRCODE_URL` (qrcodejs 1.0.0).

**3. Luồng xử lý từng bước**

1. `classroom.js` chờ `authReady`; nếu Firebase không khả dụng → `offlineView()`; chưa đăng nhập → `landingView()`; chưa có vai trò → `roleView()`; vai trò `teacher`/`admin` → giáo viên.
2. Chọn vai trò: chọn thẻ "Tôi là giáo viên", nhập trường (không bắt buộc), xác nhận → `C.chooseRole('teacher', …)` cập nhật `users/{key}`.
3. Tạo lớp: `openCreateClass()` → kiểm tra tên → `C.createClass()` sinh mã `VC` + 4 ký tự ngẫu nhiên (thử lại tối đa 5 lần nếu trùng), ghi `classrooms/{CODE}` → xóa đệm danh sách lớp → điều hướng `?tab=overview&welcome=1` → tự mở hộp thoại mời.
4. Mở lớp: `classView()` đăng ký `watchClass`, `watchAssignments`, `watchSubmissions` (tất cả bài nộp), `watchMessages`, `watchPresence`; làm mới trạng thái trực tuyến mỗi 30 giây. Nếu tài liệu lớp còn mảng cũ thì gọi `C.migrateLegacyClass()` chuyển sang cấu trúc v2.
5. Mọi cập nhật được gộp vào một khung hình bằng `schedule(kind)`; chỉ mục có `deps` liên quan mới cập nhật; huy hiệu thanh bên được tính lại.
6. Giao bài: `openAssignmentEditor()` → kiểm tra tiêu đề, ngày hạn, hạn ở tương lai, ít nhất 1 test có kết quả mong đợi → `C.saveAssignment()` (tối đa 20 test, `points: 10`) → học sinh nhận ngay qua `onSnapshot`.
7. Nhân bản: `C.duplicateAssignment()` (nếu hạn cũ đã qua thì đặt hạn mới +7 ngày); xóa: `C.deleteAssignment()` xóa cả bài nộp liên quan trong một batch.
8. Chấm: `openGrade(S, sub, { order })` → (tùy chọn) "Chạy lại test" bằng `gradeCode()` → nhập điểm/nhận xét → `C.gradeSubmission()` (kẹp 0–10, làm tròn 2 chữ số, ghi `graded_at`, `graded_by`) → "Lưu & bài tiếp" chuyển sang bài kế trong `order`.
9. Bảng điểm: `teacherGradebook()` dựng ma trận; `exportCSV()` tạo tệp CSV có BOM UTF-8 (số thập phân dùng dấu phẩy).
10. Quản lý học sinh: `removeStudent()` → `C.removeStudent()` gỡ email khỏi `student_emails` và mục tương ứng trong `students` (bài nộp cũ được giữ).
11. Thảo luận: gửi bằng Enter → `C.postMessage()`; giáo viên xóa được mọi tin → `C.deleteMessage()`.
12. Cài đặt: `C.updateClass()` lưu tên/môn/mô tả; "Xóa lớp" → `C.deleteClass()` xóa lần lượt 4 bộ sưu tập con (batch 400 tài liệu) rồi xóa tài liệu lớp.

**4. Hàm/lớp/API cốt lõi**

- Dịch vụ: `chooseRole`, `listMyClasses`, `createClass`, `getClass`, `watchClass`, `updateClass`, `deleteClass`, `removeStudent`, `migrateLegacyClass`, `watchAssignments`, `saveAssignment`, `deleteAssignment`, `duplicateAssignment`, `listAssignments`, `watchSubmissions`, `listSubmissions`, `gradeSubmission`, `watchPresence`, `watchMessages`, `postMessage`, `deleteMessage`, `normCode`.
- Giao diện: `createShell`, `openCreateClass`, `classView`, `schedule`, `overviewSection`, `assignmentsSection`, `openAssignmentEditor`, `openGrade`, `gradingQueue`, `peopleSection`, `openStudent`, `gradebookSection`, `exportCSV`, `activitySection`, `buildEvents`, `discussionSection`, `settingsSection`, `openInvite`, `presentCode`.
- Tiện ích: `rosterOf`, `effScore`, `isGraded`, `deadlineState`, `kpi`, `donut`, `barList`, `histogram`, `deadlineStrip`, `sortableTable`, `toCSV`, `onlineOf` (cửa sổ 120 giây).

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/classroom/shell.js` (tạo lớp):

```js
  const submit = async () => {
    if (!name.value.trim()) { name.focus(); name.setAttribute('aria-invalid', 'true'); toast('Vui lòng nhập tên lớp.', { type: 'warning' }); return false; }
    try {
      const cls = await C.createClass({ name: name.value, grade_subject: subject.value, description: desc.value });
      invalidateClasses();
      toast(`Đã tạo lớp ${cls.name} — mã ${cls.code}`, { type: 'success' });
      ctx.navigate(`/classroom/${cls.code}?tab=overview&welcome=1`);
      return true;
    } catch (err) { toast(errMsg(err), { type: 'error' }); return false; }
  };
```

Giải thích: sau khi tạo lớp, bộ đệm danh sách lớp bị vô hiệu và tham số `welcome=1` khiến `workspace.js` tự mở hộp thoại mời học sinh.

Trích đoạn 2 – `js/pages/classroom/assignments.js` (kiểm tra và lưu bài tập):

```js
      if (!title.value.trim()) { toast('Vui lòng nhập tiêu đề.', { type: 'warning' }); title.setAttribute('aria-invalid', 'true'); title.focus(); return false; }
      const deadline = noDeadline.checked ? 0 : combineDateTime(dateIn.value, hourSel.value, minSel.value);
      if (!noDeadline.checked && !dateIn.value) { toast('Chọn ngày hạn nộp hoặc bật “Không giới hạn thời gian”.', { type: 'warning' }); return false; }
      if (!noDeadline.checked && deadline < Date.now() - 60000 && (!existing || deadline !== existing.deadline_ts)) { toast('Hạn nộp phải ở tương lai.', { type: 'warning' }); return false; }
      const validTests = tests.filter((t) => String(t.expected).trim() !== '');
      if (!validTests.length) { toast('Cần ít nhất 1 test có “Kết quả mong đợi” để học sinh nộp và được chấm tự động.', { type: 'warning', duration: 6000 }); testsBox.querySelector('textarea:nth-of-type(1)')?.focus(); return false; }
      try {
        const saved = await C.saveAssignment(S.code, { ...a, title: title.value, description: desc.value, language: lang.value, starter_code: starter.getValue(), test_cases: validTests, deadline_ts: deadline });
```

Giải thích: bài tập chỉ được lưu khi có tiêu đề, hạn hợp lệ (hoặc không giới hạn, lưu `deadline_ts = 0`) và ít nhất một test có kết quả mong đợi.

Trích đoạn 3 – `js/services/classroom.js` (ghi điểm giáo viên):

```js
export async function gradeSubmission(code, sid, { teacher_score, teacher_note }) {
  const { db, fs } = await firestore();
  const score = Math.max(0, Math.min(10, Number(teacher_score)));
  await fs.updateDoc(fs.doc(db, 'classrooms', normCode(code), 'submissions', sid), {
    teacher_score: Math.round(score * 100) / 100, teacher_note: String(teacher_note || '').slice(0, 2000), graded_at: Date.now(), graded_by: me().key,
  });
}
```

Giải thích: điểm giáo viên được kẹp trong thang 0–10, nhận xét giới hạn 2 000 ký tự; điểm này được ưu tiên hơn điểm tự động ở mọi nơi (`effScore`).

---

### Lớp học – học sinh (tham gia lớp, làm/nộp bài, điểm & nhận xét)

**1. Mô tả & giao diện**

- **Tham gia lớp**: nhập mã trong ô "Mã lớp, VD: VC7K2P" ở đầu bảng điều khiển hoặc hộp thoại "Tham gia lớp học" (tự chuyển chữ in hoa), hoặc mở liên kết `#/join/<CODE>` – trang lời mời hiển thị banner, mã lớp, tên lớp, môn, giáo viên, số thành viên, mô tả, nút "Tham gia lớp" và ghi chú quyền riêng tư.
- **Bảng điều khiển `#/classroom`**: 4 KPI (Cần làm, Sắp đến hạn trong 48 giờ, Quá hạn, Điểm trung bình), thẻ lớp (đã nộp x/y, ĐTB, bài sắp đến hạn), cột bên "Việc cần làm" (sắp theo hạn, chấm màu quá hạn/sắp hạn) và "Nhận xét mới".
- **Khung lớp** với 7 mục: Tổng quan, Bài tập (huy hiệu số bài cần làm), Thành viên, Điểm số, Thảo luận, Hoạt động, Thông tin lớp.
- **Tổng quan**: nút "Làm bài tiếp theo", 4 KPI, lịch hạn nộp (bài đã nộp hiển thị trạng thái `done`), "Việc cần làm", donut "Tiến độ của em", "Nhận xét của thầy/cô", "Hoạt động gần đây".
- **Bài tập**: chip lọc (Tất cả/Chưa làm/Đã nộp/Đã chấm/Quá hạn), tìm kiếm; mỗi bài có trạng thái (Chưa làm, Sắp đến hạn, Đã nộp, Đã chấm, Quá hạn), hạn, ngôn ngữ, số test, nhận xét, điểm (điểm GV hoặc tự động) và nút "Làm bài"/"Làm lại"/"Xem".
- **Khung làm bài** (hộp thoại lớn): trạng thái, lần nộp gần nhất, điểm tự động, điểm GV, thông báo kết quả, nhận xét của thầy/cô, cảnh báo hết hạn; đề bài Markdown, ví dụ (ẩn test ẩn, ghi "+ n test ẩn"); bàn làm việc với nút "Nộp bài" hoặc "Chấm thử" khi đã hết hạn.
- **Điểm số**: 3 KPI (Điểm trung bình, Đã chấm, Điểm cao nhất), biểu đồ cột điểm theo bài, bảng chi tiết (trạng thái, tự động, điểm GV, nhận xét).
- **Thông tin lớp**: mã lớp, giáo viên, sĩ số, ngày tạo, khối "Quyền riêng tư", nút "Rời lớp".

**2. Các file tham gia**

- `js/pages/classroom.js`, `js/pages/classroom/landing.js` (`joinView`, `roleView`), `home.js`, `shell.js` (`joinForm`, `openJoinDialog`, `joinByCode`), `workspace.js`, `overview.js`, `assignments.js` (`studentList`, `openSolve`), `gradebook.js` (`studentGrades`), `people.js` (`memberList`), `feed.js`, `settings.js` (`studentInfo`), `util.js`, `art.js`.
- `css/pages/classroom.css`.
- Dịch vụ: `js/services/classroom.js`; ngoài phạm vi: `js/components/ide.js` (`createWorkbench`).

**3. Luồng xử lý từng bước**

1. Chọn vai trò "Tôi là học sinh" (nhập trường, lớp) → `C.chooseRole('student', …)`.
2. Tham gia: `joinByCode()` chuẩn hóa mã (in hoa, chỉ A–Z, 0–9, `-`), yêu cầu ≥ 4 ký tự → `C.joinClass()` kiểm tra lớp tồn tại, không phải giáo viên của lớp, chưa là thành viên → `arrayUnion` email vào `student_emails` và `{ email, full_name, joined_at }` vào `students` → điều hướng tới lớp.
3. Trang `#/join/:code`: giáo viên được chuyển thẳng tới lớp; học sinh đã là thành viên cũng được chuyển; ngược lại hiển thị thẻ lời mời.
4. Mở lớp: đăng ký `watchClass`, `watchAssignments`, `watchSubmissions({ mine: true })` (chỉ bài của mình), `watchMessages`; gửi nhịp hiện diện `online` ngay và mỗi 60 giây (khi không đang làm bài và tab hiển thị); khi rời lớp gửi `idle`. Nếu học sinh không còn trong `student_emails` thì hiển thị "Em chưa ở trong lớp này" với nút tham gia lại.
5. Làm bài: `openSolve(S, a)` đặt `S.solving = true`, gửi nhịp `coding` kèm tên bài (cả khi gõ phím, có điều tiết 15 giây ở dịch vụ), mở bàn làm việc với mã đã nộp hoặc mã khởi tạo, khóa nháp `class:<CODE>:<assignmentId>`.
6. Nộp bài: bàn làm việc chấm bằng bộ test, trả về `score10`, `passed`, `total`; gửi nhịp `done` (đạt hết) hoặc `error`; nếu đã quá hạn chỉ hiển thị kết quả "Chấm thử" (không lưu); nếu còn hạn gọi `C.submitAssignment()` ghi `submissions/{assignmentId}__{email}` (ghi đè lần nộp trước).
7. Giáo viên chấm → `onSnapshot` cập nhật; trạng thái chuyển "Đã chấm", điểm GV và nhận xét xuất hiện trong danh sách bài, tổng quan, điểm số và hoạt động.
8. Rời lớp: `C.leaveClass()` gỡ email và mục `students` của mình; bài đã nộp vẫn được giữ cho giáo viên.

**4. Hàm/lớp/API cốt lõi**

`joinClass`, `leaveClass`, `getClass`, `submitAssignment`, `watchSubmissions(code, { mine: true })`, `createPresence(code)` → `{ beat(status, task) }`, `joinByCode`, `joinForm`, `openJoinDialog`, `joinView`, `studentList`, `openSolve`, `studentOverview`, `studentGrades`, `memberList`, `studentInfo`, `studentStatus`, `STATUS_META`, `deadlineChip`, `columnSeries`, `createWorkbench`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/classroom/assignments.js` (nộp bài của học sinh):

```js
      onSubmitted: async (result, src) => {
        S.presenceBeat?.beat(result.passed === result.total ? 'done' : 'error', a.title);
        if (expired) { toast('Đã quá hạn nộp — kết quả chỉ để tham khảo, không được lưu.', { type: 'warning' }); renderStatus(sub, { ok: false, text: `Chấm thử: đạt ${result.passed}/${result.total} test (${scoreText(result.score10)}/10). Không được lưu vì đã hết hạn.` }); return; }
        try {
          await C.submitAssignment(S.code, a, { source: src, score: result.score10, passed: result.passed, total: result.total });
          toast(`Đã nộp bài · điểm tự động ${scoreText(result.score10)}/10`, { type: 'success' });
```

Giải thích: kết quả chấm tự động (thang 10) được lưu cùng mã nguồn; sau hạn, học sinh vẫn chấm thử được nhưng không ghi dữ liệu; trạng thái hiện diện báo cho giáo viên biết học sinh vừa làm xong hay đang gặp lỗi.

Trích đoạn 2 – `js/pages/classroom/util.js` (trạng thái bài tập phía học sinh):

```js
export function studentStatus(a, sub, now = Date.now()) {
  if (isGraded(sub)) return 'graded';
  if (sub) return 'submitted';
  if (a?.deadline_ts && now > a.deadline_ts) return 'overdue';
  return 'todo';
}
```

Giải thích: thứ tự ưu tiên là đã chấm → đã nộp → quá hạn → chưa làm; nhãn "Sắp đến hạn" được thêm riêng khi bài chưa làm và còn dưới 48 giờ.

Trích đoạn 3 – `js/pages/classroom/workspace.js` (nhịp hiện diện của học sinh):

```js
    } else {
      S.presenceBeat.beat('online', '');
      const t = setInterval(() => { if (!S.solving && document.visibilityState === 'visible') S.presenceBeat.beat('online', ''); }, 60000);
      unsubs.push(() => { clearInterval(t); S.presenceBeat.beat('idle', ''); });
    }
```

Giải thích: học sinh định kỳ ghi tài liệu `presence/{email}`; giáo viên coi là trực tuyến nếu cập nhật trong 120 giây gần nhất và trạng thái khác `idle`.

---

### Trang tài khoản & cài đặt (hồ sơ, đổi mật khẩu, máy chủ AI, offline…)

**1. Mô tả & giao diện**

Trang `#/account` ("Hồ sơ & cài đặt") có thanh tab bên trái (sticky; nằm ngang khi màn hình ≤ 820 px) gồm 5 tab:

- **Hồ sơ**: ảnh đại diện (đổi ảnh tối đa 8 MB, tự thu về 160×160, xóa ảnh), họ tên, email (khóa), trường, lớp, vai trò (khóa, chọn ở mục Lớp học), nút "Lưu hồ sơ"; khối "Thành tích" (Tổng XP, Bài học xong, Thử thách đã vượt).
- **Bảo mật**: nếu đăng nhập bằng email/mật khẩu có form "Đổi mật khẩu" (mật khẩu hiện tại, mới, nhập lại); nếu đăng nhập Google có nút "Gửi email đặt mật khẩu"; khối "Phiên đăng nhập" và nút "Đăng xuất khỏi thiết bị này".
- **Giao diện & AI**: chọn chủ đề Sáng/Tối/Theo hệ thống; ô địa chỉ "Máy chủ V-Code (AI & dịch vụ)" với "Lưu & kiểm tra", "Mặc định" và thông báo trạng thái kết nối, phiên bản, nhà cung cấp AI khả dụng; khối "AI trên trình duyệt (tùy chọn)" kiểm tra WebGPU, thanh tiến độ tải, nút "Tải AI trên trình duyệt".
- **Ngoại tuyến**: 6 dòng trạng thái (ứng dụng/Service Worker, dữ liệu IndexedDB, chạy C/C++/JS/SQL/HTML, chạy Python, đăng nhập/lớp học/bảng xếp hạng, AI đám mây), nút "Tải gói học offline", dung lượng bộ nhớ đang dùng.
- **Dữ liệu**: "Tải dữ liệu (JSON)" (tiến độ, bản nháp, lịch sử trò chuyện của chính chủ) và "Xóa dữ liệu cục bộ" (bản nháp, lịch sử chat, bộ đệm runtime).

Các tab Hồ sơ và Bảo mật hiển thị khối "Bạn chưa đăng nhập" kèm nút mở hộp thoại đăng nhập khi là khách.

**2. Các file tham gia**

- `js/pages/account.js`, `css/pages/account.css`.
- Ngoài phạm vi: `js/services/auth.js` (`firestore`, `changePassword`, `resetPassword`, `logout`, `hasPasswordProvider`), `js/services/firebase.js`, `js/services/progress.js`, `js/services/local-ai.js` (`isWebGPUAvailable`, `onLocalStatus`, `loadLocalModel`), `js/runtime/runner.js` (`warmup`), `js/core/theme.js` (`setTheme`, `getThemePreference`), `js/config.js` (`getApiBase`, `setApiBase`, `PYODIDE_BASE`, `KATEX_BASE`), `js/core/net.js` (`refreshBackendStatus`), `js/core/idb.js`.

**3. Luồng xử lý từng bước**

1. Đọc `ctx.query.tab` (mặc định `profile`), dựng thanh tab và vùng nội dung; đổi tab cập nhật URL bằng `history.replaceState('#/account?tab=…')`.
2. Hồ sơ: đọc tiến độ; chọn ảnh → `resizeImage()` vẽ lên canvas và xuất JPEG chất lượng 0,82; "Lưu hồ sơ" → `fs.updateDoc(users/{key}, { full_name, school_name, class_name, avatar_url, updated_at })`.
3. Bảo mật: kiểm tra mật khẩu mới và nhập lại khớp nhau → `changePassword(cur, next)`; hoặc `resetPassword(email)` với tài khoản Google; "Đăng xuất" → `logout()` và về trang chủ.
4. Giao diện & AI: `setTheme(v)`; "Lưu & kiểm tra" → `setApiBase(url)` (lưu localStorage `vc-api-base`) rồi `refreshBackendStatus()`; trạng thái máy chủ tự vẽ lại khi `appState.backend` đổi; `onLocalStatus()` theo dõi tiến độ tải mô hình AI cục bộ.
5. Ngoại tuyến: đọc `caches.keys()`, `navigator.storage.estimate()`, `serviceWorker.controller`; "Tải gói học offline" → `warmup('python')` và tải trước các tệp Pyodide, KaTeX, `challenges.json`, `index.json` và từng `data/courses/<id>.json`, báo "Đã lưu x/y tài nguyên".
6. Dữ liệu: xuất JSON `vcode-edu-du-lieu-<ngày>.json`; xóa cục bộ sau `confirmDialog` → `idb.clear('drafts')`, `idb.clear('conversations')`, xóa bộ đệm có tên chứa `runtime`, phát `conversations:change`.
7. Khi người dùng đăng nhập/đăng xuất trong lúc ở tab Hồ sơ hoặc Bảo mật, tab được vẽ lại.

**4. Hàm/lớp/API cốt lõi**

`TABS`, `section()`, `resizeImage()`, `profileTab()`, `securityTab()`, `settingsTab()`, `offlineTab()`, `dataTab()`, `render()`; `firestore()`, `changePassword()`, `resetPassword()`, `logout()`, `hasPasswordProvider()`, `setTheme()`, `getApiBase()`, `setApiBase()`, `refreshBackendStatus()`, `isWebGPUAvailable()`, `loadLocalModel()`, `warmup()`, `downloadFile()`, `idb.all/clear()`, Cache API, Storage API.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/account.js` (thu nhỏ ảnh đại diện):

```js
async function resizeImage(file, max = 160) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}
```

Giải thích: ảnh được thu nhỏ phía trình duyệt thành chuỗi Data URL JPEG trước khi lưu vào trường `avatar_url`, tránh lưu ảnh gốc dung lượng lớn.

Trích đoạn 2 – `js/pages/account.js` (tải gói học offline):

```js
      const btn = h('button', { class: 'btn btn--primary', type: 'button', onClick: async () => {
        btn.classList.add('is-loading');
        try {
          warmup('python');
          const urls = [`${PYODIDE_BASE}pyodide.js`, `${PYODIDE_BASE}pyodide.asm.js`, `${PYODIDE_BASE}pyodide.asm.wasm`, `${PYODIDE_BASE}python_stdlib.zip`, `${PYODIDE_BASE}pyodide-lock.json`, `${KATEX_BASE}katex.min.js`, `${KATEX_BASE}katex.min.css`, 'data/challenges.json', 'data/courses/index.json'];
          try {
            const idx = await fetch('data/courses/index.json').then((r) => r.json());
            for (const c of idx.courses) urls.push(`data/courses/${c.id}.json`);
          } catch { /* offline */ }
          let ok = 0;
          await Promise.all(urls.map((u) => fetch(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' }).then((r) => { if (r.ok) ok += 1; }).catch(() => {})));
          toast(`Đã lưu ${ok}/${urls.length} tài nguyên để học offline.`, { type: ok ? 'success' : 'warning' });
          render();
        } finally { btn.classList.remove('is-loading'); }
      } }, icon('download'), 'Tải gói học offline');
```

Giải thích: nút này chủ động `fetch` các tài nguyên cần cho học ngoại tuyến (bộ chạy Python, KaTeX, dữ liệu khóa học và thử thách) để Service Worker lưu đệm.

---

### V-Prism – danh mục chủ đề

**1. Mô tả & giao diện**

Trang `#/prism` mang bản sắc "phòng thí nghiệm": hero có thương hiệu V-Prism (lăng kính 3 vạch), tiêu đề "Lăng kính thuật toán", lời dẫn, 3 chỉ số dạng đồng hồ đo (Chủ đề 14, Minh họa 41, Ngôn ngữ mã 03), nút "Bắt đầu với Sắp xếp" (`#/prism/sorting/bubble`) và "Thử Dijkstra" (`#/prism/graph/dijkstra`), khung "máy hiện sóng" có thước đo, đèn LED, nhãn "n = 16" và demo sắp xếp tự chạy. Phần công cụ gồm ô tìm kiếm, bộ đếm "NN / 14 chủ đề", chip lọc theo 5 nhóm (kèm số chủ đề), chú giải thang độ phức tạp (O(1), O(log n), O(n), O(n log n), O(n²), O(2ⁿ)). Kết quả nhóm theo nhóm (mã LIN/ALG/TRE/GRA/TEC, mô tả, số chủ đề); mỗi thẻ chủ đề có số thứ tự, mã nhóm, hình glyph SVG, tên, tóm tắt, tối đa 4 chip thuật toán (chấm màu theo độ phức tạp trung bình) và "+n", chân thẻ "NN minh họa · Mở".

**2. Các file tham gia**

- `js/pages/prism/index.js` (`renderCatalog`, `topicGlyph`, `cxClass`, `brandMark`).
- `js/pages/prism/catalog.js` (`PRISM_CATEGORIES`, `PRISM_TOPICS`, `loadTopic`).
- `js/pages/prism/mini.js`, `js/pages/prism/renderers.js` (`renderBars`).
- `js/pages/prism/topics/*.js` (được nạp lười để lấy độ phức tạp trung bình).
- `css/pages/prism.css`.

**3. Luồng xử lý từng bước**

1. Đọc `ctx.query.q` và `ctx.query.cat` để khôi phục từ khóa và nhóm.
2. `renderChips()` dựng chip "Tất cả" + 5 nhóm kèm số chủ đề.
3. `renderResults()` lọc chủ đề theo nhóm và từ khóa (so khớp tên, tóm tắt, mã, tên thuật toán), nhóm theo `PRISM_CATEGORIES`, cập nhật bộ đếm; không có kết quả → khối rỗng có nút "Xóa bộ lọc".
4. Ô tìm kiếm dùng `debounce` 120 ms.
5. Nạp lười `mini.js` và chạy `mountMiniSort(demo, { size: 16 })`.
6. Song song gọi `loadTopic()` cho cả 14 chủ đề để lấy `complexity.avg` của từng thuật toán, rồi vẽ lại để chip thuật toán có màu theo nhóm độ phức tạp (`cxClass`).

**4. Hàm/lớp/API cốt lõi**

`renderCatalog(container, ctx)`, `renderChips()`, `matches()`, `algoChip()`, `card()`, `renderResults()`, `cxClass()`, `CX`, `CAT_CODE`, `topicGlyph()`, `GLYPHS`, `cornerTicks()`, `brandMark()`, `PRISM_TOPICS`, `PRISM_CATEGORIES`, `loadTopic()`, `mountMiniSort()`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/prism/index.js` (phân loại chuỗi độ phức tạp):

```js
function cxClass(str) {
  const t = String(str || '').replace(/\s+/g, '');
  if (!t || t === '—' || !/O\(/.test(t)) return null;
  if (/φ|2ⁿ|\^n|n!/.test(t)) return 'cexp';
  if (/n²|V²|\^2|m·n|n·W|S·k/.test(t)) return 'cn2';
  if (/nlogn|\)logV/.test(t)) return 'cnlog';
  if (/O\(log/.test(t)) return 'clog';
  if (/O\(1/.test(t)) return 'c1';
  return 'cn';
}
```

Giải thích: chuỗi độ phức tạp tự do trong định nghĩa thuật toán (ví dụ "O((V + E) log V)", "O(φⁿ)") được quy về 6 nhóm tăng trưởng để tô màu chip, thẻ và thước đo.

Trích đoạn 2 – `js/pages/prism/index.js` (bổ sung độ phức tạp thật cho chip):

```js
  Promise.all(PRISM_TOPICS.map((t) => loadTopic(t.id).then((full) => [t.id, Object.fromEntries((full?.algorithms || []).map((a) => [a.id, a.complexity?.avg]))]).catch(() => [t.id, {}])))
    .then((entries) => { if (ctx.signal.aborted) return; complexity = Object.fromEntries(entries); renderResults(); })
    .catch(() => {});
```

Giải thích: danh mục ban đầu chỉ có siêu dữ liệu nhẹ; sau đó các mô-đun chủ đề được nạp lười để lấy độ phức tạp trung bình thực tế.

Trích đoạn 3 – `js/pages/prism/catalog.js` (nạp lười chủ đề):

```js
export async function loadTopic(id) {
  switch (id) {
    case 'sorting': return (await import('./topics/sorting.js')).sortingTopic;
    case 'searching': return (await import('./topics/sorting.js')).searchingTopic;
    case 'arrays': return (await import('./topics/linear.js')).arraysTopic;
    case 'linked-list': return (await import('./topics/linear.js')).linkedListTopic;
```

Giải thích: mỗi mã chủ đề ánh xạ tới một export trong 5 tệp `topics/*.js`, nhờ đó trang danh mục không phải tải toàn bộ mã minh họa ngay từ đầu.

---

### V-Prism – trình phát mô phỏng (play/pause/step, timeline, tốc độ, nhập dữ liệu, mã giả, mã nguồn 3 ngôn ngữ, độ phức tạp)

**1. Mô tả & giao diện**

Trang `#/prism/:topic` hoặc `#/prism/:topic/:algo` gồm: đường dẫn (Lăng kính › nhóm › chủ đề); đầu trang có glyph chủ đề, thẻ "MÃ · nhóm", "NN thuật toán", tiêu đề, phần giới thiệu Markdown (có công thức); hàng tab thuật toán đánh số; **sân khấu** (`pz-stage`) có đèn LED nhấp nháy khi chạy, tên thuật toán, "Bước i / n", nút phím tắt "?", màn hình có thước X/Y và vùng vẽ; **dock điều khiển**: Về đầu, Lùi một bước, Chạy/Tạm dừng/Chạy lại, Tiến một bước, thanh timeline (vạch chia tự động, tô theo `--pct`), hộp tốc độ (0,25× – 4×); khu "Giải thích bước" và "Biến" (các cặp tên–giá trị). Cột bên: "Dữ liệu vào" (ô nhập có kiểm tra tức thì, thông báo lỗi tiếng Việt, nút "Áp dụng & chạy", "Ngẫu nhiên", "Mặc định"), "Mã giả" (dòng đang chạy được tô bằng dải sáng trượt, nhãn "dòng NN"), "Độ phức tạp" (Trung bình, Xấu nhất, Bộ nhớ). Khu chi tiết có 3 tab: "Giải thích" (tóm tắt + liên kết "Hỏi V-Mentor về thuật toán này" mở `#/ai?mode=algorithm&q=…`), "Mã nguồn" (Python/C++/JavaScript, số dòng, Sao chép, "Mở trong IDE", lưu ý về tập con C++ của trình chạy), "Độ phức tạp" (4 thẻ Tốt nhất/Trung bình/Xấu nhất/Bộ nhớ có thước đo 6 nấc và nhóm, ghi chú, thang tăng trưởng). Cuối trang là "Cùng nhóm".

**2. Các file tham gia**

- `js/pages/prism/index.js` (`renderTopic`).
- `js/pages/prism/engine.js` (`Recorder`, `Player`, hàm phân tích dữ liệu vào).
- `js/pages/prism/renderers.js` (`RENDERERS`).
- `js/pages/prism/topics/sorting.js`, `linear.js`, `trees.js`, `graphs.js`, `recursion-dp.js` (định nghĩa thuật toán: `inputs`, `pseudo`, `code`, `complexity`, `run()`).
- `js/pages/prism/catalog.js`, `css/pages/prism.css`.
- Ngoài phạm vi: `js/components/highlight.js`, `js/components/markdown.js`, `js/core/idb.js` (`kv`), `js/core/ui.js`.

**3. Luồng xử lý từng bước**

1. Tìm siêu dữ liệu chủ đề; không có → khối "Không tìm thấy chủ đề".
2. `loadTopic()` nạp định nghĩa đầy đủ; chọn thuật toán theo `ctx.params.algo` hoặc thuật toán đầu tiên; đọc ngôn ngữ mã đã chọn từ `kv` (`prism:code-lang`, mặc định Python).
3. Tạo `Player({ onFrame, onState })`; `onFrame` gọi bộ vẽ `RENDERERS[algo.renderer]`, cập nhật lời giải thích, bộ đếm, timeline (`max`, `value`, `--pct`, vạch chia tối đa ~48), dòng mã giả đang chạy và dải sáng, bảng biến; `onState` đổi nút Chạy/Tạm dừng/Chạy lại và lớp `is-playing`.
4. `renderAlgoTabs()`, `renderInputs()`, `renderPseudo()`, `renderDetail()`, `renderCxStrip()`, rồi `runAlgo()`.
5. `runAlgo()`: `parseInputs()` kiểm tra từng ô bằng `def.parse` (ví dụ `parseNumberList`, `parseGraph`); lỗi → toast cảnh báo; hợp lệ → `algo.run(values)` chạy thuật toán thật, `Recorder.add()` ghi ảnh chụp trạng thái (sao chép sâu bằng `structuredClone`, tối đa 3 000 khung) kèm số dòng mã giả, lời giải thích và biến → `player.load(frames)`.
6. Phát: `play()` đặt hẹn giờ `delay = max(60, 900 / speed)` ms; `tick()` tăng chỉ số tới khung cuối rồi tự dừng; lùi/tiến bước gọi `step(±1)` (tạm dừng trước); kéo timeline gọi `seek()`; đổi tốc độ gọi `setSpeed()`.
7. Phím tắt: Space/K chạy–dừng, ←/J lùi, →/L tiến, Home/R về đầu, End tới cuối, ? mở bảng phím tắt, Esc đóng (bỏ qua khi đang gõ trong ô nhập).
8. "Ngẫu nhiên" điền giá trị từ `def.random()` và tự chạy; "Mặc định" khôi phục `def.default`.
9. Đổi thuật toán → `selectAlgo(id)` cập nhật URL bằng `history.replaceState`, tiêu đề tài liệu và toàn bộ khối liên quan, rồi chạy lại.
10. Tab Mã nguồn: đổi ngôn ngữ lưu vào `kv`; "Mở trong IDE" ghi `kv['workspace:incoming']` và điều hướng `/workspace?lang=…&from=snippet`.
11. Rời trang → `player.destroy()` và gỡ mọi listener qua `ctx.signal`.

**4. Hàm/lớp/API cốt lõi**

- `class Recorder { add(state, line, msg, vars) }`, `class Player { load, play, pause, toggle, step, seek, restart, setSpeed, destroy }`, `MAX_FRAMES = 3000`, `snap()`.
- `parseNumberList()`, `parseInteger()`, `randomInts()`, `randomDistinct()`.
- `RENDERERS = { bars, cells, list, stackqueue, tree, graph, table, calltree, hash, hanoi }`.
- `renderTopic()`, `runAlgo()`, `parseInputs()`, `validateField()`, `selectAlgo()`, `moveHighlight()`, `gauge()`, `renderCxStrip()`, `renderDetail()`, `SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3, 4]`, `CODE_LANGS`.
- Cấu trúc một thuật toán: `{ id, title, renderer, summary, complexity: { best, avg, worst, space, note }, inputs: [{ name, label, type, default, hint, random, parse }], pseudo: [...], code: { python, cpp, javascript }, run(values) → frames }`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/prism/engine.js` (trình phát dựa trên chỉ số khung):

```js
  delay() {
    return Math.max(60, 900 / this.speed);
  }

  tick() {
    if (!this.playing) return;
    if (this.index >= this.frames.length - 1) { this.pause(); return; }
    this.index += 1;
    this.emit();
    this.timer = setTimeout(() => this.tick(), this.delay());
  }

  play() {
    if (!this.frames.length) return;
    if (this.index >= this.frames.length - 1) this.index = 0;
    this.playing = true;
    this.onState?.(this);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), this.reduced ? 0 : this.delay() / 2);
  }
```

Giải thích: vì mọi khung đã được ghi sẵn dưới dạng ảnh chụp bất biến, trình phát chỉ cần dịch chỉ số; nhờ đó lùi bước và tua timeline luôn chính xác.

Trích đoạn 2 – `js/pages/prism/topics/sorting.js` (ghi khung trong sắp xếp nổi bọt):

```js
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      r.add(base(), 1, `Lượt ${i + 1}: đặt cờ đã_đổi = sai.`, { i });
      for (let j = 0; j < n - 1 - i; j++) {
        r.add({ ...base(), marks: { ...doneMarks(n, sortedFrom, n - 1), [j]: 'compare', [j + 1]: 'compare' } }, 3, `So sánh a[${j}] = ${a[j]} với a[${j + 1}] = ${a[j + 1]}.`, { i, j });
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swapped = true;
          r.add({ ...base(), marks: { ...doneMarks(n, sortedFrom, n - 1), [j]: 'swap', [j + 1]: 'swap' } }, 4, `${a[j + 1]} > ${a[j]} nên đổi chỗ.`, { i, j });
        }
      }
```

Giải thích: mỗi lần `r.add()` lưu trạng thái mảng, đánh dấu ô (`compare`, `swap`, `done`), chỉ số dòng mã giả (1, 3, 4) và lời giải thích tiếng Việt; bộ vẽ `bars` tô màu theo các dấu này.

Trích đoạn 3 – `js/pages/prism/index.js` (phím tắt của trình phát):

```js
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !helpPop.hidden) { setHelp(false); helpBtn.focus(); return; }
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); player.toggle(); }
    else if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); player.step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'j') { e.preventDefault(); player.step(-1); }
    else if (e.key === 'r' || e.key === 'R') { player.restart(); }
    else if (e.key === 'End') { e.preventDefault(); player.pause(); player.seek(player.frames.length - 1); }
    else if (e.key === 'Home') { e.preventDefault(); player.restart(); }
    else if (e.key === '?') { e.preventDefault(); setHelp(helpPop.hidden); }
  }, { signal: ctx.signal });
```

Giải thích: phím tắt chỉ hoạt động khi tiêu điểm không nằm trong ô nhập, và được gỡ tự động khi rời trang nhờ `ctx.signal`.

---

### Trang 404

**1. Mô tả & giao diện**

Khi route không khớp, trang "Không tìm thấy trang" hiển thị khối `empty-state` (đệm trên dưới 80 px) gồm biểu tượng la bàn, tiêu đề "Không tìm thấy trang này", lời giải thích "Liên kết có thể đã cũ hoặc bị gõ nhầm…" và hai nút: "Về trang chủ" (`#/`) và "Xem khóa học" (`#/learn`).

**2. Các file tham gia**

- `js/pages/not-found.js`.
- Ngoài phạm vi: `js/core/dom.js` (`h`, `mount`), `js/components/icons.js` (`icon`); kiểu `.empty-state`, `.btn` thuộc CSS dùng chung (không xác định cụ thể từ mã nguồn trong phạm vi).

**3. Luồng xử lý từng bước**

1. Mô-đun được dùng làm trang 404 (theo chú thích đầu tệp); cơ chế router chọn trang này nằm ngoài phạm vi và không xác định từ mã nguồn trong phạm vi. Mô-đun khai báo `title: 'Không tìm thấy trang'`.
2. `mount(container)` dựng khối nội dung tĩnh và gắn vào `container`.
3. Người dùng bấm một trong hai nút để quay lại trang chủ hoặc danh mục khóa học.

**4. Hàm/lớp/API cốt lõi**

Đối tượng mặc định `{ title, mount(container) }`; `h()`, `mount()`, `icon('compass')`, `icon('home')`, `icon('book-open')`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 – `js/pages/not-found.js`:

```js
export default {
  title: 'Không tìm thấy trang',
  mount(container) {
    mount(container, h('div', { class: 'container page' }, h('div', { class: 'empty-state', style: 'padding-block:80px' },
      h('div', { class: 'empty-state__icon' }, icon('compass')),
      h('h1', { class: 'page-title' }, 'Không tìm thấy trang này'),
      h('p', null, 'Liên kết có thể đã cũ hoặc bị gõ nhầm. Hãy quay về trang chủ hoặc chọn một mục trong thanh điều hướng.'),
      h('div', { class: 'cluster', style: 'justify-content:center' },
        h('a', { class: 'btn btn--primary', href: '#/' }, icon('home'), 'Về trang chủ'),
        h('a', { class: 'btn', href: '#/learn' }, icon('book-open'), 'Xem khóa học')))));
  },
};
```

Giải thích: trang 404 là một mô-đun trang tối giản theo cùng giao diện `{ title, mount }` như mọi trang khác, không tải dữ liệu và không có trạng thái.

### IDE đa ngôn ngữ

**1. Mô tả & giao diện**

Trang `#/workspace` (tiêu đề "IDE đa ngôn ngữ") là môi trường lập trình chính, hoạt động ngoại tuyến sau lần tải đầu. Bố cục gồm:

- **Thanh công cụ** (`.workspace__bar`, `role="toolbar"`, nhãn "Thanh công cụ IDE") chia ba nhóm:
  - Trái: logo terminal, ô chọn ngôn ngữ (`select.ws-lang`, lấy danh sách từ `LANGUAGES` của `runtime/runner.js`), huy hiệu trạng thái bộ chạy (`RUNTIME_LABELS`: "Chưa tải", "Đang tải…", "Sẵn sàng", "Đang chạy…").
  - Giữa: bộ chuyển chế độ "Mã nguồn" / "Lưu đồ" / "Scratch Live" và nút phóng to studio.
  - Phải: "Ví dụ", "Định dạng mã (Shift+Alt+F)", "Tìm / thay thế (Ctrl+F, Ctrl+H)", nút đổi giao diện editor, "Cài đặt trình soạn thảo", "Phím tắt (F1)", "Hỏi V-Mentor", "Chia sẻ", "Tải về", "Dừng", "Chạy".
- **Cột trình soạn thảo**: thanh tab tệp (`.ws-files`), editor, thanh "rail" để mở lại editor khi thu gọn.
- **Splitter** kéo được (`role="separator"`, phím ←/→ thay đổi 3%, nhấp đúp về mặc định 60% / 46%), giới hạn 20–80%.
- **Bảng kết quả**: tab "Kết quả" và "Lỗi & Gỡ lỗi" (với HTML: "Xem trước", "Console", "Lỗi & Gỡ lỗi"); ô "Dữ liệu vào" thu gọn được, có bộ đếm dòng và nhãn "Cần dữ liệu" (ẩn với HTML và SQL).
- **Thanh trạng thái** (`footer.ws-status`): ngôn ngữ tệp, "Dòng X, Cột Y (n đã chọn)", "Dấu cách: N · Xuống dòng", "UTF-8", số lỗi/cảnh báo, kết quả lần chạy gần nhất, trạng thái bộ chạy, giao diện editor ("Editor: Tự động (tối)" / "Night" / "Paper"), trạng thái mạng ("Trực tuyến" / "Ngoại tuyến").
- **Thanh di động** (`nav.ws-mobilebar`) để chuyển khung "Mã nguồn" / "Lưu đồ"/"Scratch" / "Kết quả" hoặc "Xem trước" / "Lỗi".

Ví dụ mẫu (`EXAMPLES`): Python 4 (Xin chào, Số nguyên tố, Sắp xếp nổi bọt, Fibonacci (đệ quy có nhớ)), Python Tiếng Việt 2 (Chẵn hay lẻ, Bảng cửu chương), JavaScript 2, C 2, C++ 2, SQL 2, HTML 1 (Thẻ giới thiệu), tổng 15. Với HTML, ví dụ thay ba tệp `index.html`, `style.css`, `script.js`; với ngôn ngữ khác, ví dụ thay nội dung tệp đang mở và giữ được Ctrl+Z.

**2. Các file tham gia**

`js/pages/workspace.js`, `js/components/editor.js`, `js/components/ide.js` (`createTerminal`, `attachDiagnostics`, `inputNotice`, `RUNTIME_LABELS`), `js/components/ide/files.js`, `js/components/ide/problems.js`, `js/components/ide/explain-errors.js`, `js/components/ide/controls.js`, `js/components/ide/settings.js`, `js/components/ide/editor-theme.js`, `js/components/practice.js` (`createAIDrawer`), `css/pages/ide.css`. Ngoài phạm vi nhưng được gọi: `js/runtime/runner.js` (`runCode`, `renderPreview`, `onRuntimeStatus`, `warmup`, `LANGUAGES`), `js/core/idb.js` (`kv`), `js/core/ui.js`.

**3. Luồng xử lý từng bước**

1. `mount()` xác định ngôn ngữ: ưu tiên `ctx.query.lang`, sau đó `kv.get('workspace:lang', 'python')`; xác định chế độ từ `ctx.query.view` hoặc `layout.mode` đọc bằng `readLayout()` (`localStorage['vc-ws-layout']`).
2. Nếu URL có `code=` thì giải mã bằng `decodeShare`; nếu `from=snippet` thì lấy `kv 'workspace:incoming'` (hạn 120 giây) rồi xóa.
3. Dựng thanh công cụ, editor (`createEditor` với `onChange: onEdit`, `onRun: run`, `onSave: saveNow`, `onCursor` cập nhật thanh trạng thái), terminal, console, iframe xem trước, bảng Lỗi, ô dữ liệu vào.
4. `switchLang(lang)`: lưu dự án cũ, hủy lần chạy, ghi `kv 'workspace:lang'`, đăng ký `onRuntimeStatus` để cập nhật huy hiệu, gọi `warmup(lang)` tải trước bộ chạy, nạp dự án (từ liên kết chia sẻ → `loadProject(lang)` → ví dụ đầu tiên nếu chưa có), cập nhật tab tệp, tab bảng kết quả, thanh trạng thái, chạy kiểm tra tĩnh, đặt `ready = true`.
5. Mỗi lần gõ (`onEdit`): xóa đánh dấu dòng, đồng bộ nội dung tệp, xem trước trực tiếp (HTML, trễ 450 ms), lên lịch kiểm tra tĩnh (450 ms), báo studio (300 ms), cập nhật nhãn "Cần dữ liệu", tự lưu (400 ms).
6. Bấm "Chạy" hoặc Ctrl+Enter → `run()`:
   - HTML: chuyển tab "Xem trước", dựng lại iframe bằng `renderPreview(preview, webParts(project))`.
   - Ngôn ngữ khác: nếu tệp đang mở là tệp dữ liệu thì chạy `MAIN_FILE`; ẩn "Chạy", hiện "Dừng"; nếu chương trình đọc dữ liệu mà ô trống thì in thông báo `inputNotice`; gọi `runCode({ lang, code, stdin, signal, onOutput, files, mainName })` (Python/pyvn gửi kèm toàn bộ tệp dự án để `import` được).
7. Kết quả lỗi: `explainError(...)` tạo giải thích, đánh dấu dòng lỗi (`editor.markLine`), đặt thẻ lỗi vào bảng Lỗi, terminal hiện nhãn "Quá thời gian" / "Đã dừng" / "Có lỗi" và nút "… — xem giải thích và cách sửa", chuyển sang tab "Lỗi & Gỡ lỗi".
8. Kết quả thành công: in "(Chương trình chạy xong nhưng không in ra gì…)" nếu không có đầu ra; trạng thái "Hoàn tất · N ms"; thanh trạng thái hiện "Chạy xong · N ms".
9. Bấm "Dừng" → `runCtrl.abort()` hủy tiến trình chạy.
10. Khi rời trang: `saveNow()`, hủy lần chạy, hủy xem trước, `destroy()` studio và editor; sự kiện `beforeunload` cũng gọi `saveNow()`.

**4. Hàm/lớp/API cốt lõi**

`default.mount(container, ctx)`, `switchLang(next, { fromIncoming })`, `run()`, `onEdit()`, `saveNow()`/`save` (debounce 400 ms), `renderWeb()`, `renderSideTabs()`, `showSideTab(id)`, `updateCounts(c)`, `updateStatus()`, `updateNet()`, `updateRunStatus()`, `updateStdinNeed()`, `setStdinOpen(open)`, `applyLayout()`, `setMode(next)`, `readLayout()`/`writeLayout()`, `loadExample(ex)`, `openExamples(anchor)`; API ngoài phạm vi: `runCode`, `renderPreview`, `onRuntimeStatus`, `warmup`, `LANGUAGES[lang].engine/.offline/.short/.label`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/pages/workspace.js` (đọc bố cục đã lưu):
```js
function readLayout() {
  const def = { mode: 'code', split: { code: 0.6, studio: 0.46 }, editorCollapsed: false, studioMax: false, stdinOpen: true, dockOpen: false };
  try { const v = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); return v && typeof v === 'object' ? { ...def, ...v, split: { ...def.split, ...(v.split || {}) } } : def; } catch { return def; }
}
function writeLayout(l) { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch { /* private mode */ } }
```
Giải thích: bố cục IDE (chế độ, tỉ lệ chia khung, trạng thái thu gọn editor/phóng to studio/ô dữ liệu vào/dock) được lưu dưới dạng JSON trong `localStorage['vc-ws-layout']`; giá trị đọc ra luôn được trộn với giá trị mặc định nên không lỗi khi thiếu trường.

Trích đoạn 2 — `js/pages/workspace.js` (lời gọi chạy chương trình trong `run()`):
```js
      const t0 = performance.now();
      const res = await runCode({
        lang, code: file.code, stdin: stdin.value, signal: runCtrl.signal,
        onOutput: (c, s) => terminal.write(c, s),
        files: lang === 'python' || lang === 'pyvn' ? project.files : null,
        mainName: file.name,
      });
      running = false;
      btnRun.hidden = false;
      btnStop.hidden = true;
      const ms = Math.round(res.durationMs || performance.now() - t0);
```
Giải thích: mã được gửi tới bộ chạy với `AbortController` để nút "Dừng" có thể hủy; đầu ra được đẩy dần vào terminal qua `onOutput`, và với Python toàn bộ tệp của dự án được truyền theo để hỗ trợ `import` giữa các tệp.

Trích đoạn 3 — `js/pages/workspace.js` (nạp dự án khi đổi ngôn ngữ):
```js
      if (!loaded) loaded = await loadProject(lang);
      if (!loaded) {
        const ex = EXAMPLES[lang]?.[0];
        loaded = lang === 'html'
          ? { files: filesFromWebParts(ex.files), active: 'index.html', stdin: '' }
          : { files: [{ name: MAIN_FILE[lang], code: ex?.code ?? '' }], active: MAIN_FILE[lang], stdin: ex?.stdin ?? '' };
      }
```
Giải thích: mỗi ngôn ngữ có một dự án riêng trong IndexedDB; nếu chưa từng lưu, IDE tạo dự án từ chương trình mẫu đầu tiên của ngôn ngữ đó (kèm dữ liệu vào mẫu).

### Trình soạn thảo mã

**1. Mô tả & giao diện**

Trình soạn thảo tự xây (không dùng thư viện) gồm lề số dòng (`.code-editor__gutter`), lớp tô màu `<pre class="code-editor__highlight">` và `textarea.code-editor__input` trong suốt chồng lên trên (chỉ hiện con trỏ). Tính năng:

- Tô màu cú pháp qua `highlight(text, lang)` (từ `highlight.js`), tách thành từng dòng `<div class="cl">`; dòng hiện tại có lớp `is-active`, dòng lỗi `is-error`/`is-warning`.
- Số dòng ở lề, có chấm màu khi có chẩn đoán; rê chuột vào số dòng hiện tooltip nội dung lỗi; nhấp số dòng để chọn cả dòng (`gutterClick`).
- Gạch chân lượn sóng cho lỗi/cảnh báo (`dg-err`, `dg-warn`, `dg-info`), tô kết quả tìm kiếm (`fm`, `fm--cur`), tô cặp ngoặc tương ứng (`bm`, `bm--bad` khi không khớp).
- Tự thụt lề khi Enter: giữ thụt lề dòng trên; thêm một cấp sau dấu `:` (Python/pyvn) hoặc sau `{ [ (`; tách cặp ngoặc thành 3 dòng; với HTML tách cặp thẻ mở/đóng; giảm một cấp sau `return/break/continue/pass/raise` (Python).
- Tự đóng ngoặc và dấu nháy (`PAIRS`), gõ đè dấu đóng, Backspace xóa cả cặp, xóa một cấp thụt lề bằng Backspace, gõ `}` trên dòng trống tự giảm thụt lề; không tự đóng dấu nháy đứng sau chữ (dấu nháy đơn trong từ) và chỉ tự đóng backtick với JavaScript.
- Phím tắt: Tab/Shift+Tab thụt/bỏ thụt, Ctrl/⌘+Enter chạy, Ctrl/⌘+/ bật/tắt chú thích, Ctrl/⌘+S lưu, Ctrl+F / Ctrl+H tìm & thay, Ctrl+D nhân đôi dòng, Alt+↑/↓ di chuyển dòng, Shift+Alt+F định dạng, Ctrl+Space gợi ý, Ctrl+G đi tới dòng, Ctrl+Shift+K xóa dòng, F1 bảng phím tắt, Esc rồi Tab để rời editor (hỗ trợ bàn phím).

**2. Các file tham gia**

`js/components/editor.js`, `js/components/ide/settings.js`, `js/components/ide/editor-theme.js`, `js/components/ide/autocomplete.js`, `js/components/ide/find.js`, `js/components/ide/formatter.js`, `js/components/ide/diagnostics.js` (`documentIdentifiers`), `js/components/ide/controls.js` (`openShortcutsModal`, tải động khi nhấn F1), `css/pages/ide.css`; ngoài phạm vi: `js/components/highlight.js`, `js/core/dom.js`, `js/core/ui.js` (`promptDialog` cho "Đi tới dòng").

**3. Luồng xử lý từng bước**

1. `createEditor(opts)` gọi `ensureIdeCss()` (tự chèn `css/pages/ide.css` nếu trang chưa nạp), chuẩn hóa ngôn ngữ, đọc cài đặt, dựng DOM và gắn `data-editor-theme`.
2. Sự kiện `input` → xóa bộ đệm định danh, mở/đóng gợi ý, `emit()` lên lịch `render()` bằng `requestAnimationFrame` và gọi `onChange`.
3. `render()` tính vị trí đầu dòng (`computeLineStarts`), tô màu toàn văn bản, tách dòng bằng `splitLines`, chèn các dải trang trí (chẩn đoán, kết quả tìm, cặp ngoặc) bằng `decorate`, dựng lại lề số dòng, đặt biến `--gutter-digits`, đồng bộ cuộn (`syncScroll` dùng `transform: translate`).
4. `selectionchange` → `onSelection()` chỉ vẽ lại các dòng bị ảnh hưởng (`refreshLine`) và phát `onCursor({ line, col, selected })`.
5. `keydown`: gợi ý được xử lý trước (`ac.handleKey`), sau đó lần lượt các phím tắt, Tab, Enter, Backspace, `}`, tự đóng ngoặc.
6. Mọi chỉnh sửa lập trình đi qua `insert()` dùng `document.execCommand('insertText')` để giữ lịch sử Ctrl+Z (dự phòng `setRangeText`).
7. Thay đổi cài đặt (sự kiện `vc:editor-settings`) → `applySettings()` cập nhật cỡ chữ (`--ed-font`), xuống dòng mềm, độ rộng Tab (`--ed-tab`) cho mọi editor trên trang.

**4. Hàm/lớp/API cốt lõi**

`createEditor(...)` và API trả về (`getValue`, `setValue`, `replaceValue`, `setLang`, `markLine(line, type)`, `clearMarks`, `setDiagnostics(list)`, `insertAtCursor`, `format`, `openFind`, `jumpToLine`, `gotoLine`, `duplicateLines`, `moveLines`, `toggleComment`, `getCursor`, `getLineCount`, `refresh`, `destroy`); nội bộ `splitLines`, `decorate`, `render`, `refreshLine`, `findMatch`, `computeBrackets`, `insert`, `replaceRange`, `replaceAll`, `transformLines`, `deleteLines`, `revealPos`; `errorLine(message)`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/editor.js` (hàm vẽ):
```js
  function render() {
    raf = 0;
    if (destroyed) return;
    const text = ta.value;
    computeLineStarts(text);
    lineHtml = splitLines(highlight(text, currentLang));
    activeLine = Math.min(lineOf(ta.selectionStart), lineHtml.length - 1);
    computeBrackets();
    let html = '';
    for (let i = 0; i < lineHtml.length; i++) html += `<div class="${lineClass(i)}">${decorate(lineHtml[i], lineRanges(i))}</div>`;
    code.innerHTML = html;
    let g = '';
    for (let i = 0; i < lineHtml.length; i++) {
      const t = gutterTitle(i);
      g += `<span class="${gutterClass(i)}"${t ? ` title="${t.replace(/"/g, '&quot;').replace(/</g, '&lt;')}"` : ''}>${i + 1}</span>`;
    }
    gutterInner.innerHTML = g;
    el.style.setProperty('--gutter-digits', String(Math.max(2, String(lineHtml.length).length)));
    syncWrap();
    syncScroll();
  }
```
Giải thích: mỗi khung hình, văn bản được tô màu rồi tách thành các dòng `<div>`; từng dòng được "trang trí" thêm các dải lỗi, kết quả tìm và cặp ngoặc; lề số dòng được dựng lại cùng tooltip lỗi.

Trích đoạn 2 — `js/components/editor.js` (tự thụt lề khi Enter):
```js
    if (e.key === 'Enter' && !e.shiftKey && !mod) {
      e.preventDefault();
      const v = ta.value;
      const pos = ta.selectionStart;
      const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
      const line = v.slice(lineStart, pos);
      let indent = line.match(/^[ \t]*/)[0];
      const trimmed = line.replace(/\s+(#|\/\/).*$/, '').trimEnd();
      const unit = indentUnit();
      const before = v[pos - 1];
      const after = v[pos];
      if (/[:]$/.test(trimmed) && (currentLang === 'python' || currentLang === 'pyvn')) indent += unit;
      if ((before === '{' && after === '}') || (before === '[' && after === ']') || (before === '(' && after === ')')) { insert(`\n${indent}${unit}\n${indent}`, indent.length + unit.length + 1); return; }
      if (currentLang === 'html' && /<([a-zA-Z][\w-]*)[^>]*>$/.test(v.slice(lineStart, pos)) && v.slice(pos).startsWith('</')) { insert(`\n${indent}${unit}\n${indent}`, indent.length + unit.length + 1); return; }
      if (/[{[(]$/.test(trimmed)) indent += unit;
      if ((currentLang === 'python' || currentLang === 'pyvn') && /^\s*(return|break|continue|pass|raise)\b/.test(line) && indent.length >= unit.length) indent = indent.slice(0, -unit.length);
      insert(`\n${indent}`);
      return;
    }
```
Giải thích: thụt lề dòng mới được suy ra từ dòng hiện tại (bỏ qua chú thích cuối dòng), cộng thêm một cấp sau `:` hoặc ngoặc mở và bớt một cấp sau các lệnh kết thúc khối của Python.

### Gợi ý mã (autocomplete)

**1. Mô tả & giao diện**

Hộp gợi ý `.ac` hiện ngay dưới con trỏ khi gõ từ 2 ký tự (hoặc nhấn Ctrl+Space để mở thủ công). Mỗi mục có biểu tượng loại (`{}` mẫu, `K` từ khóa, `ƒ` có sẵn, `ab` trong tệp), nhãn và mô tả; chân hộp ghi "↑↓ chọn", "Enter / Tab chèn", "Esc đóng". Nguồn gợi ý theo ngôn ngữ:

- Đoạn mẫu (`SNIPPETS`): Python 16, Python Tiếng Việt 7, C 8, C++ 9, JavaScript 9, HTML 10, CSS 4, SQL 7 (tổng 70), ví dụ `for`, `inputs`, `main`, `html5`, `sel`, `join`.
- Từ khóa (`KEYWORDS`) và hàm có sẵn (`BUILTINS`) cho 8 ngôn ngữ; với pyvn còn gợi ý thêm từ khóa Python; SQL có sẵn tên bảng/cột mẫu (`hoc_sinh`, `lop`, `diem`…).
- Định danh đã xuất hiện trong tài liệu (`documentIdentifiers`).

Không gợi ý khi con trỏ nằm trong chuỗi hoặc chú thích, hoặc tiền tố bắt đầu bằng chữ số. Chấp nhận hàm có sẵn dạng gọi được (ví dụ `print`, `len`, `printf`, `COUNT`) sẽ tự thêm `()` và đặt con trỏ giữa ngoặc.

**2. Các file tham gia**

`js/components/ide/autocomplete.js`, `js/components/editor.js` (tạo và nối sự kiện), `js/components/ide/diagnostics.js` (`documentIdentifiers`), `js/components/ide/settings.js` (công tắc `autocomplete`), `css/pages/ide.css` (`.ac*`).

**3. Luồng xử lý từng bước**

1. Editor tạo `createAutocomplete({ textarea, root, getLang, getUnit, replaceRange, getWords })` khi `autocomplete` bật và không ở chế độ chỉ đọc.
2. Sự kiện `input` của người dùng gọi `onInput(e)`: gõ ký tự chữ/số → `show(false)`; Backspace khi đang mở → lọc lại; thay đổi lập trình → đóng.
3. `show()` lấy phần dòng trước con trỏ, kiểm tra `inStringOrComment`, tách tiền tố bằng `wordRe(lang)`.
4. `candidates(lang, prefix)` chấm điểm: khớp đầu (đúng hoa/thường 0, khác 1) hoặc khớp dãy con (3, chỉ khi tiền tố ≥ 2 ký tự), cộng trọng số theo loại (mẫu 0, từ khóa 0,2, có sẵn 0,3, trong tệp 0,5) và độ dài nhãn; sắp xếp và lấy tối đa 40 mục.
5. `render()` dựng danh sách (`role="listbox"`, `aria-activedescendant`), `position()` đặt hộp tại tọa độ con trỏ tính bằng `caretCoords` (phần tử gương ẩn), lật lên trên nếu thiếu chỗ.
6. `handleKey`: ↑/↓/PageUp/PageDown di chuyển, Enter/Tab chấp nhận, Esc đóng; ←/→/Home/End đóng.
7. `accept()`: đoạn mẫu được mở rộng bằng `expandSnippet` (thay `\t` bằng đơn vị thụt lề, giữ thụt lề dòng, chọn sẵn chỗ giữ chỗ `${1:…}`, đặt con trỏ ở `$0`) rồi `replaceRange` vào editor.

**4. Hàm/lớp/API cốt lõi**

`createAutocomplete(...)` → `{ el, isOpen, close, handleKey, onInput, reposition }`; `caretCoords(ta, pos)`; `expandSnippet(body, indent, unit)`; nội bộ `candidates`, `render`, `position`, `show`, `accept`, `wordRe`, `inStringOrComment`; hằng `KEYWORDS`, `BUILTINS`, `SNIPPETS`, `KIND_LABEL`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/ide/autocomplete.js` (chấm điểm ứng viên):
```js
    const push = (label, kind, detail, insert) => {
      const key = `${kind}:${label}`;
      if (seen.has(key)) return;
      const l = label.toLowerCase();
      let score;
      if (l.startsWith(p)) score = label.startsWith(prefix) ? 0 : 1;
      else {
        // subsequence match (e.g. "prt" → print)
        let j = 0;
        for (const ch of l) if (ch === p[j]) j += 1;
        if (j < p.length || p.length < 2) return;
        score = 3;
      }
      if (kind !== 'snippet' && l === p) return; // nothing to complete
      seen.add(key);
      out.push({ label, kind, detail, insert, score: score + { snippet: 0, keyword: 0.2, builtin: 0.3, word: 0.5 }[kind] + label.length / 100 });
    };
```
Giải thích: ứng viên khớp đầu được ưu tiên hơn khớp dãy con (ví dụ gõ "prt" vẫn ra `print`); trong cùng mức, đoạn mẫu đứng trước từ khóa, hàm có sẵn và từ trong tệp, nhãn ngắn đứng trước.

Trích đoạn 2 — `js/components/ide/autocomplete.js` (mở rộng đoạn mẫu):
```js
export function expandSnippet(body, indent, unit) {
  let text = '';
  let selStart = -1;
  let selEnd = -1;
  let caret = -1;
  const src = body.replace(/\t/g, unit).replace(/\n/g, `\n${indent}`);
  const re = /\$\{(\d+):([^}]*)\}|\$(\d+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    text += src.slice(last, m.index);
    if (m[1] !== undefined) {
      if (m[1] === '1' && selStart < 0) { selStart = text.length; selEnd = text.length + m[2].length; }
      text += m[2];
    } else if (m[3] === '0') caret = text.length;
    last = m.index + m[0].length;
  }
  text += src.slice(last);
  if (selStart < 0) { selStart = selEnd = caret >= 0 ? caret : text.length; }
  return { text, selStart, selEnd };
}
```
Giải thích: thân mẫu dùng `\t` cho một cấp thụt lề, `${1:text}` cho chỗ giữ chỗ được bôi chọn sẵn và `$0` cho vị trí con trỏ cuối; hàm trả về văn bản đã thay cùng vùng cần chọn.

### Định dạng mã

**1. Mô tả & giao diện**

Nút "Định dạng mã (Shift+Alt+F)" trên thanh công cụ IDE/workbench và phím tắt Shift+Alt+F. Bộ định dạng thận trọng, "không bao giờ đổi ý nghĩa chương trình":

- C / C++ / Java / JavaScript / TypeScript / CSS / JSON: thụt lề lại theo độ sâu ngoặc `{ ( [` (tôn trọng chuỗi, chú thích, template literal); thân lệnh `if/for/while/else/do` không có ngoặc nhọn được thụt thêm một cấp.
- Python / Python Tiếng Việt: chỉ đổi Tab đầu dòng thành 4 dấu cách và xóa khoảng trắng cuối dòng, giữ nguyên chuỗi ba nháy.
- HTML: thụt lề theo thẻ; thân `<script>`/`<style>` được thụt bằng bộ định dạng ngoặc nhọn; giữ nguyên `<pre>`/`<textarea>`.
- SQL: viết hoa từ khóa (`SQL_KW`) và hàm (`SQL_FN`, chỉ khi theo sau là `(`) nằm ngoài chuỗi, định danh trong nháy và chú thích.

Thông báo: "Mã đã gọn gàng." khi không có thay đổi, "Tệp này không có bộ định dạng." khi ngôn ngữ không hỗ trợ. Việc thay toàn văn bản là một bước hoàn tác được (Ctrl+Z).

**2. Các file tham gia**

`js/components/ide/formatter.js`, `js/components/editor.js` (`format()`, `replaceAll`), `js/components/ide/settings.js` (`indentFor`), `js/pages/workspace.js` và `js/components/ide.js` (nút bấm).

**3. Luồng xử lý từng bước**

1. Người dùng bấm nút hoặc Shift+Alt+F → `editor.format()`.
2. Bỏ qua nếu chỉ đọc hoặc ngôn ngữ không thuộc `FORMATTABLE`.
3. Gọi `formatCode(before, currentLang, { unit })`; đơn vị thụt lề lấy từ cài đặt nếu không phải "Tự động".
4. `formatCode` chọn `formatPython` / `formatHTML` / `formatSQL` / `formatBraces`, sau đó xóa khoảng trắng cuối dòng (trừ Python) và bảo đảm kết thúc bằng một dòng mới.
5. Nếu kết quả khác, `replaceAll(after)` thay toàn bộ văn bản trong một bước hoàn tác, giữ con trỏ ở cùng dòng và vị trí cuộn; gọi `onFormat(changed)`.

**4. Hàm/lớp/API cốt lõi**

`formatCode`, `formatBraces`, `formatPython`, `formatHTML`, `formatSQL`, `FORMATTABLE`; nội bộ `scanLine` (trạng thái `{ depth, block, tpl }`), `codeOnly`, `netTags`; trong editor: `format()`, `canFormat()`, `replaceAll(text)`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/ide/formatter.js`:
```js
export function formatCode(code, lang, { unit } = {}) {
  const l = String(lang || '').toLowerCase();
  let res;
  if (l === 'python' || l === 'pyvn') res = formatPython(code);
  else if (l === 'html') res = formatHTML(code, unit || '  ');
  else if (l === 'sql') res = formatSQL(code);
  else if (['c', 'cpp', 'java', 'javascript', 'typescript', 'css', 'json'].includes(l)) res = formatBraces(code, unit || (l === 'javascript' || l === 'css' || l === 'json' ? '  ' : '    '), { lang: l });
  else return code;
  res = res.replace(/[ \t]+$/gm, (m, off, s) => (l === 'python' || l === 'pyvn' ? m : '')).replace(/\n*$/, '\n');
  return res;
}
```
Giải thích: hàm điều phối chọn bộ định dạng theo ngôn ngữ, mặc định thụt 2 dấu cách cho JavaScript/CSS/JSON và 4 dấu cách cho C/C++/Java.

Trích đoạn 2 — `js/components/editor.js`:
```js
  function format() {
    if (readOnly) return false;
    if (!FORMATTABLE.has(currentLang)) return false;
    const before = ta.value;
    const after = formatCode(before, currentLang, { unit: settings.tabSize === 'auto' ? undefined : indentUnit() });
    if (after !== before) replaceAll(after);
    onFormat?.(after !== before);
    return after !== before;
  }
```
Giải thích: editor chỉ thay văn bản khi kết quả thực sự khác và trả về `true/false` để thanh công cụ hiện thông báo "Mã đã gọn gàng."

### Tìm & thay thế

**1. Mô tả & giao diện**

Thanh tìm `.fb` (`role="search"`) nằm trong editor, mở bằng Ctrl+F (tìm) hoặc Ctrl+H (tìm và thay), hoặc nút "Tìm / thay thế". Gồm ô "Tìm", ba công tắc "Aa" (phân biệt chữ hoa/thường), "ab" gạch chân (khớp nguyên từ), ".*" (biểu thức chính quy), bộ đếm "i/n" hoặc "Không có kết quả", nút "Kết quả trước (Shift+Enter)", "Kết quả tiếp (Enter)", "Đóng (Esc)", nút mũi tên hiện/ẩn hàng thay thế; hàng thay thế có ô "Thay bằng", "Thay thế (Enter)", "Thay tất cả (Ctrl+Alt+Enter)". Kết quả được tô vàng trong editor, kết quả hiện tại tô đậm hơn. Ở chế độ chỉ đọc, chỉ tìm được, không thay.

**2. Các file tham gia**

`js/components/ide/find.js`, `js/components/editor.js` (`ensureFind`, `findRanges`, `findCurrent`, `revealPos`, `replaceRange`, `replaceAll`), `css/pages/ide.css` (`.fb*`, `.fm`, `.fm--cur`).

**3. Luồng xử lý từng bước**

1. `open({ replace })`: nếu đang bôi chọn một đoạn ngắn (< 200 ký tự, không xuống dòng) thì đưa vào ô tìm; hiện thanh; gọi `search()`.
2. `regex()` dựng `RegExp` từ chuỗi tìm (thoát ký tự đặc biệt nếu không bật ".*", bọc `\b` khi khớp nguyên từ, cờ `gi` hoặc `g`); biểu thức sai trả về `'invalid'` và ô tìm có lớp `is-invalid`.
3. `search()` duyệt tối đa 5000 kết quả, chọn kết quả đầu tiên sau con trỏ; `paint()` cập nhật bộ đếm, gọi `api.setMatches` (editor chỉ vẽ lại các dòng liên quan, hoặc vẽ lại toàn bộ khi > 400 kết quả) và `api.reveal` cuộn tới kết quả.
4. Enter / Shift+Enter (hoặc nút) → `go(±1)` xoay vòng.
5. `replaceOne()` thay kết quả hiện tại (hỗ trợ nhóm bắt `$1` khi dùng regex) rồi tìm lại; `replaceEvery()` thay tất cả trong một bước hoàn tác và báo "Đã thay N".
6. Esc → `close()` xóa tô màu và trả tiêu điểm về editor; khi văn bản thay đổi, editor gọi `find.refresh()`.

**4. Hàm/lớp/API cốt lõi**

`createFindBar(api)` → `{ el, open, close, isOpen, refresh }`; nội bộ `regex`, `search`, `paint`, `go`, `replaceOne`, `replaceEvery`, `setReplace`; phía editor: `openFind(replace)`, `setMatches` → `findRanges`/`findCurrent`, `lineRanges` thêm lớp `fm`/`fm fm--cur`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/ide/find.js`:
```js
  function regex() {
    const q = findIn.value;
    if (!q) return null;
    let src = opts.re ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (opts.word) src = `\\b${src}\\b`;
    try { return new RegExp(src, opts.cs ? 'g' : 'gi'); } catch { return 'invalid'; }
  }
```
Giải thích: ba tùy chọn tìm kiếm được quy về một biểu thức chính quy duy nhất; biểu thức người dùng nhập sai không làm hỏng editor mà chỉ đánh dấu ô tìm không hợp lệ.

Trích đoạn 2 — `js/components/ide/find.js`:
```js
  function replaceEvery() {
    const re = regex();
    if (!re || re === 'invalid' || !matches.length) return;
    const n = matches.length;
    api.replaceAll(api.getValue().replace(re, opts.re ? replIn.value : () => replIn.value));
    search();
    count.textContent = `Đã thay ${n}`;
    replIn.focus();
  }
```
Giải thích: khi không dùng regex, chuỗi thay được truyền qua hàm để các ký tự như `$` không bị hiểu là tham chiếu nhóm; toàn bộ thay thế đi qua `replaceAll` của editor nên hoàn tác được một lần.

### Giao diện editor sáng/tối độc lập

**1. Mô tả & giao diện**

Editor có giao diện màu riêng, không phụ thuộc giao diện toàn trang: "Theo giao diện" (`auto`, theo `html[data-theme]`), "Editor sáng (Paper)" (`light`), "Editor tối (Night)" (`dark`). Người dùng đổi bằng nút nửa hình tròn trên thanh công cụ (bấm để xoay vòng auto → light → dark, tooltip "Giao diện editor: … — bấm để đổi"), bằng nhóm nút "Giao diện editor" (Tự động / Sáng / Tối) trong popover cài đặt, hoặc nút trên thanh trạng thái. Lựa chọn được đồng bộ giữa các tab trình duyệt.

**2. Các file tham gia**

`js/components/ide/editor-theme.js`, `js/components/ide/controls.js` (`createEditorThemeButton`, `openEditorSettings`), `js/components/editor.js` (gắn `data-editor-theme` lên `.code-editor`), `js/pages/workspace.js` (cột editor cũng mang `data-editor-theme`, thanh trạng thái), `css/pages/ide.css` (bảng màu Night/Paper).

**3. Luồng xử lý từng bước**

1. `getEditorTheme()` đọc `localStorage['vc-editor-theme']`, giá trị không hợp lệ → `'auto'`.
2. Khi tạo editor, phần tử gốc nhận `data-editor-theme = getEditorTheme()`.
3. Người dùng đổi → `setEditorTheme(pref)` lưu vào localStorage, gọi `applyAll(pref)` cập nhật mọi phần tử có `[data-editor-theme]` và phát sự kiện `vc:editor-theme` với `{ pref, theme }`.
4. CSS áp bảng màu: Night cho `[data-editor-theme="dark"]` hoặc `auto` khi `:root[data-theme="dark"]`; Paper cho trường hợp còn lại.
5. Tab khác đổi giá trị → sự kiện `storage` → `applyAll`. Ở chế độ `auto`, `MutationObserver` theo dõi `data-theme` của `<html>` để báo các nhãn (thanh trạng thái, tooltip) cập nhật "đang tối/sáng".

**4. Hàm/lớp/API cốt lõi**

`EDITOR_THEMES`, `getEditorTheme`, `resolvedEditorTheme`, `setEditorTheme`, `cycleEditorTheme`, `onEditorTheme`; `createEditorThemeButton({ signal, compact })`; sự kiện `vc:editor-theme`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/ide/editor-theme.js`:
```js
/** The palette actually shown: 'dark' | 'light'. */
export function resolvedEditorTheme(pref = getEditorTheme()) {
  if (pref === 'auto') return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  return pref;
}

function applyAll(pref) {
  document.querySelectorAll('[data-editor-theme]').forEach((el) => { el.dataset.editorTheme = pref; });
  window.dispatchEvent(new CustomEvent('vc:editor-theme', { detail: { pref, theme: resolvedEditorTheme(pref) } }));
}

export function setEditorTheme(pref) {
  const v = VALID.has(pref) ? pref : 'auto';
  try { localStorage.setItem(KEY, v); } catch { /* private mode: still applies for this page */ }
  current = v;
  applyAll(v);
  return v;
}
```
Giải thích: lựa chọn chỉ là một thuộc tính dữ liệu trên các phần tử; CSS quyết định bảng màu, còn sự kiện tùy biến giúp các thành phần khác (nút, thanh trạng thái) cập nhật nhãn.

### Cài đặt editor

**1. Mô tả & giao diện**

Popover "Cài đặt trình soạn thảo" (mở từ nút bánh răng, từ ô "Dấu cách: N" hoặc ô giao diện ở thanh trạng thái) gồm: "Giao diện editor" (Tự động/Sáng/Tối), "Cỡ chữ" (thanh trượt 11–22 px), "Độ rộng thụt lề" (Tự động/2/4), các công tắc "Tự xuống dòng", "Tự đóng ngoặc và dấu nháy", "Gợi ý code khi gõ" (Ctrl+Space để mở thủ công), "Kiểm tra lỗi khi gõ" (đánh dấu lỗi thường gặp ở lề trái), và liên kết "Xem tất cả phím tắt (F1)". Bảng phím tắt "Phím tắt trình soạn thảo" liệt kê 15 tổ hợp (`SHORTCUTS`), hiển thị ⌘ trên máy Mac thay cho Ctrl. Cài đặt áp dụng ngay cho mọi editor trên trang và đồng bộ giữa các tab.

**2. Các file tham gia**

`js/components/ide/settings.js`, `js/components/ide/controls.js`, `js/components/editor.js` (`applySettings`), `js/components/ide.js` (`attachDiagnostics` theo dõi công tắc kiểm tra lỗi), `js/pages/workspace.js` (thanh trạng thái), `css/pages/ide.css` (`.ide-pop`, `.ide-set*`, `.ide-switch*`, `.sc-table`).

**3. Luồng xử lý từng bước**

1. `openEditorSettings(anchor)` đọc `getEditorSettings()` và dựng nội dung; `openPopover` đóng các popover khác, định vị theo nút neo, đóng khi nhấp ra ngoài, nhấn Esc hoặc đổi kích thước cửa sổ.
2. Mỗi thay đổi gọi `setEditorSettings({ key: value })` → `sanitize` (giới hạn cỡ chữ 11–22, `tabSize` ∈ {auto, 2, 4}, ép kiểu boolean) → lưu `localStorage['vc-editor-settings']` → phát `vc:editor-settings`.
3. Trình nghe toàn cục trong `editor.js` gọi `__vcApplySettings` của mọi `.code-editor`: đặt `--ed-font`, lớp `is-wrap`, thuộc tính `wrap`, `--ed-tab`, đóng gợi ý nếu tắt.
4. `attachDiagnostics` nghe sự kiện cài đặt: nếu tắt "Kiểm tra lỗi khi gõ" thì xóa chẩn đoán, nếu bật lại thì chạy lại.
5. `indentFor(lang, settings)` trả về đơn vị thụt lề: 2/4 dấu cách nếu chọn cố định, hoặc "Tự động" (2 cho HTML/CSS/JavaScript, 4 cho ngôn ngữ khác).

**4. Hàm/lớp/API cốt lõi**

`DEFAULT_SETTINGS`, `getEditorSettings`, `setEditorSettings`, `onEditorSettings`, `indentFor`; `openEditorSettings`, `openPopover`, `openShortcutsModal`, `SHORTCUTS`, `seg`, `switchRow`; `applySettings` trong editor.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/ide/settings.js`:
```js
function sanitize(s) {
  const out = { ...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {}) };
  out.fontSize = Math.min(22, Math.max(11, Math.round(Number(out.fontSize) || DEFAULT_SETTINGS.fontSize)));
  out.tabSize = out.tabSize === 2 || out.tabSize === '2' ? 2 : out.tabSize === 4 || out.tabSize === '4' ? 4 : 'auto';
  ['wordWrap', 'autoClose', 'autocomplete', 'diagnostics'].forEach((k) => { out[k] = Boolean(out[k]); });
  return out;
}

let cache = null;
export function getEditorSettings() {
  if (cache) return cache;
  try { cache = sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { cache = sanitize(null); }
  return cache;
}

export function setEditorSettings(patch) {
  cache = sanitize({ ...getEditorSettings(), ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('vc:editor-settings', { detail: cache }));
  return cache;
}
```
Giải thích: cài đặt luôn được làm sạch trước khi dùng, có bộ đệm trong bộ nhớ, và mọi thay đổi được phát thành sự kiện để tất cả editor cập nhật đồng thời.

Trích đoạn 2 — `js/components/editor.js`:
```js
  function applySettings() {
    settings = getEditorSettings();
    el.style.setProperty('--ed-font', `${settings.fontSize}px`);
    el.classList.toggle('is-wrap', settings.wordWrap);
    ta.setAttribute('wrap', settings.wordWrap ? 'soft' : 'off');
    el.style.setProperty('--ed-tab', String(indentUnit().length));
    if (!settings.autocomplete) ac?.close();
    schedule();
  }
```
Giải thích: cài đặt được chuyển thành biến CSS và thuộc tính của textarea, sau đó editor vẽ lại.

### Quản lý nhiều tệp

**1. Mô tả & giao diện**

Mỗi ngôn ngữ trong IDE có một dự án tối đa 20 tệp. Thanh tab tệp hiển thị biểu tượng màu theo phần mở rộng (`.ws-ficon--py/js/css/html/c/cpp/sql/txt`) và tên tệp; tooltip ghi "(tệp dữ liệu)" với tệp không chạy được và "nhấp đúp để đổi tên". Các thao tác: nút "+" "Tạo tệp mới"; menu "Thao tác với tệp" gồm "Tệp mới…", "Đổi tên “…”…" (F2), "Nhân bản tệp", "Xóa tệp", "Xóa toàn bộ nội dung tệp", "Tải tệp này", "Tải toàn bộ dự án (N tệp)"; nút × trên tab để xóa (khi có > 1 tệp); bàn phím trên tab: Enter/Space mở, F2 đổi tên, Delete xóa, ←/→ chuyển tab.

Tệp chính theo ngôn ngữ (`MAIN_FILE`): `main.py` (Python, pyvn), `main.js`, `main.c`, `main.cpp`, `main.sql`, `index.html`. Phần mở rộng cho phép (`ALLOWED_EXT`): Python `py, txt, csv, json`; pyvn `py, txt, csv`; JavaScript `js, json, txt`; C `c, h, txt`; C++ `cpp, h, hpp, txt`; SQL `sql`; HTML `html, css, js`.

**2. Các file tham gia**

`js/components/ide/files.js`, `js/pages/workspace.js`, `js/core/idb.js` (ngoài phạm vi, kho `drafts`), `css/pages/ide.css` (`.ws-files*`, `.ws-ftab*`, `.ws-ficon*`).

**3. Luồng xử lý từng bước**

1. Tạo tệp: `newFile()` gợi ý tên bằng `suggestName` (ví dụ `tien_ich.py`, `style2.css`, `tep_moi.<ext>`), hỏi tên bằng `promptDialog`, kiểm tra bằng `validateName`; tệp `.py` mới có sẵn hàm mẫu `xin_chao` và thông báo "Trong main.py viết: import …".
2. `validateName` kiểm tra: không trống, ≤ 48 ký tự, chỉ chữ không dấu/số/`_`/`-` và có phần mở rộng, phần mở rộng thuộc `ALLOWED_EXT`, tên tệp Python phải import được, không trùng (không phân biệt hoa thường), không vượt 20 tệp.
3. Mở tệp: `openFile(name)` đồng bộ nội dung tệp cũ, đổi ngôn ngữ tô màu theo `fileLang`, nạp nội dung, chạy lại kiểm tra tĩnh, báo studio, với HTML thì cập nhật xem trước.
4. Đổi tên / nhân bản (`copyName` → `<tên>_ban_sao.<ext>`) / xóa (hỏi xác nhận "Xóa …?", dự án cần ít nhất một tệp).
5. Lưu: `saveProject(lang, project)` ghi bản ghi v2 vào IndexedDB `drafts` (khóa `workspace:<lang>`), kèm trường `code` (tệp chính) hoặc `files: { html, css, js }` cho tương thích ngược.
6. Chạy: nếu tệp đang mở không chạy được (`isRunnable` sai) thì chạy tệp chính và báo "… là tệp dữ liệu — đang chạy …"; Python gửi toàn bộ tệp cho bộ chạy; HTML ghép tệp HTML đang mở (hoặc `index.html`) với mọi CSS và JS bằng `webParts`.
7. Nạp lại: `loadProject(lang)` → `normalizeProject` chấp nhận bản ghi mới và cũ (`{ code, stdin }` hoặc HTML `{ files: { html, css, js } }`).

**4. Hàm/lớp/API cốt lõi**

`MAIN_FILE`, `ALLOWED_EXT`, `fileLang`, `isRunnable`, `validateName`, `suggestName`, `copyName`, `filesFromWebParts`, `webParts`, `normalizeProject`, `loadProject`, `saveProject`; trong trang: `renderFiles`, `openFile`, `newFile`, `renameFile`, `duplicateFile`, `deleteFile`, `openFileMenu`, `fileIcon`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/ide/files.js`:
```js
export function saveProject(lang, project) {
  const active = project.files.find((f) => f.name === project.active) || project.files[0];
  const record = { key: `workspace:${lang}`, lang, v: 2, project: { files: project.files.map((f) => ({ name: f.name, code: f.code })), active: project.active }, stdin: project.stdin || '', updatedAt: Date.now() };
  if (lang === 'html') {
    const byName = (n) => project.files.find((f) => f.name === n)?.code ?? '';
    record.files = { html: byName('index.html'), css: byName('style.css'), js: byName('script.js') };
  } else {
    record.code = (project.files.find((f) => f.name === MAIN_FILE[lang]) || active)?.code ?? '';
  }
  return idb.put('drafts', record).catch(() => {});
}
```
Giải thích: bản ghi phiên bản 2 lưu đủ danh sách tệp, tệp đang mở và dữ liệu vào, đồng thời giữ các trường cũ (`code`, `files`) để mã đọc kiểu cũ vẫn hoạt động.

Trích đoạn 2 — `js/components/ide/files.js`:
```js
export function validateName(name, lang, files, current = null) {
  const n = String(name || '').trim();
  if (!n) return 'Tên tệp không được để trống.';
  if (n.length > 48) return 'Tên tệp tối đa 48 ký tự.';
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]*\.[A-Za-z0-9]+$/.test(n)) return 'Chỉ dùng chữ không dấu, số, dấu gạch dưới / gạch ngang, và có phần mở rộng (ví dụ: tien_ich.py).';
  const ext = n.split('.').pop().toLowerCase();
  if (!ALLOWED_EXT[lang].includes(ext)) return `Dự án ${lang === 'html' ? 'Web' : lang} chỉ nhận tệp: ${ALLOWED_EXT[lang].map((e) => `.${e}`).join(', ')}.`;
  if ((lang === 'python' || lang === 'pyvn') && ext === 'py' && !/^[A-Za-z_]\w*\.py$/.test(n)) return 'Tên tệp Python phải là tên hợp lệ để import được (chữ, số, _; không bắt đầu bằng số).';
  if (files.some((f) => f.name.toLowerCase() === n.toLowerCase() && f.name !== current)) return 'Đã có tệp trùng tên.';
  if (!current && files.length >= MAX_FILES) return `Mỗi dự án tối đa ${MAX_FILES} tệp.`;
  return '';
}
```
Giải thích: hàm trả về thông báo lỗi tiếng Việt (chuỗi rỗng nếu hợp lệ), được dùng cho cả tạo mới và đổi tên tệp.

### Bảng Lỗi & Gỡ lỗi (kiểm tra tĩnh + giải thích lỗi chạy tiếng Việt)

**1. Mô tả & giao diện**

Tab "Lỗi & Gỡ lỗi" (IDE) hoặc "Lỗi" (workbench) có huy hiệu đếm số lỗi/cảnh báo; thanh trạng thái IDE hiện số lỗi và cảnh báo, bấm để mở bảng. Bảng gồm hai phần:

- **Thẻ lỗi khi chạy** (`.pb-runtime`): nhãn "Lỗi khi chạy" kèm loại lỗi (ví dụ `NameError`), tiêu đề tiếng Việt, nút "Dòng N" (hoặc "tệp : dòng"), dòng mã gây lỗi đã tô màu, khối "Giải thích", khối "Cách sửa", mục mở rộng "Thông báo lỗi gốc", nút "Hỏi V-Mentor về lỗi này". Biểu tượng đồng hồ khi quá thời gian, nút dừng khi bị dừng ("Em đã dừng chương trình").
- **Kiểm tra mã nguồn** (kiểm tra tĩnh khi gõ): bộ lọc "Tất cả / Lỗi / Cảnh báo" có số đếm; mỗi dòng có biểu tượng mức độ (Lỗi/Cảnh báo/Gợi ý), tiêu đề, chi tiết, gợi ý và "Dòng N", bấm để nhảy tới dòng. Khi không có lỗi: "Không phát hiện lỗi thường gặp" hoặc "Chưa kiểm tra".

Trong editor, lỗi tĩnh hiện bằng chấm ở lề và gạch chân lượn sóng; lỗi khi chạy tô nền cả dòng.

Kiểm tra tĩnh (`diagnostics.js`) có 52 mẫu thông báo khác nhau (đếm theo tiêu đề): Python 19 (chuỗi chưa đóng, ngoặc thừa/không khớp/chưa đóng, ký tự nháy cong, trộn Tab và dấu cách, thiếu/thừa/không khớp thụt lề, "else if", thiếu `:`, `=` trong điều kiện, `print` kiểu Python 2, `return`/`break` sai chỗ, khối không có thân, tên chưa định nghĩa kèm "Có phải ý em là…", dùng trước khi gán); nhóm quét ngoặc dùng chung cho C/C++/JS/CSS 7; kiểm tra điều kiện/vòng lặp 4; thiếu `;` 1; riêng C/C++ 6 (thư viện JSCPP chưa hỗ trợ, thiếu `main()`, thiếu `using namespace std;`, thiếu `#include <iostream>`/`<stdio.h>`, `scanf` thiếu `&`); riêng JavaScript 2 (lỗi cú pháp qua phân tích không thực thi, gõ sai `console.log`); HTML 5; riêng CSS 2; SQL 6.

Giải thích lỗi khi chạy (`explain-errors.js`) xử lý: Python 16 nhóm lỗi (NameError, SyntaxError, IndentationError/TabError, TypeError, ValueError, ZeroDivisionError, IndexError, KeyError, AttributeError, RecursionError, EOFError, ModuleNotFoundError/ImportError, UnboundLocalError, OverflowError, FileNotFoundError, KeyboardInterrupt) cùng nhánh mặc định; JavaScript 4 (ReferenceError, TypeError, SyntaxError, RangeError); C/C++ (lỗi phân tích cú pháp JSCPP, đoán thiếu `;` ở dòng trên, biến chưa khai báo, thư viện chưa hỗ trợ, chia cho 0, truy cập ngoài mảng, hàm chưa định nghĩa, mã thoát khác 0); SQL (lỗi cú pháp gần từ, không có bảng/cột, câu lệnh chưa hoàn chỉnh, trùng khóa, NOT NULL, bảng đã tồn tại, số giá trị không khớp); cùng các trường hợp chung: bị dừng, quá thời gian, thiếu dữ liệu vào.

**2. Các file tham gia**

`js/components/ide/problems.js`, `js/components/ide/diagnostics.js`, `js/components/ide/explain-errors.js`, `js/components/ide.js` (`attachDiagnostics`, workbench), `js/pages/workspace.js`, `js/components/editor.js` (`setDiagnostics`, `markLine`, `errorLine`), `css/pages/ide.css` (`.problems`, `.pb-*`, `.dg-*`); ngoài phạm vi: `js/runtime/pyvn.js` (`translatePyvn`).

**3. Luồng xử lý từng bước**

1. Khi gõ, `attachDiagnostics` lên lịch `run()` (trễ 450 ms, dùng `token` để bỏ kết quả cũ); nếu tắt "Kiểm tra lỗi khi gõ" thì xóa hết.
2. `analyzeCodeAsync(code, lang)`: với pyvn, dịch sang Python bằng `translatePyvn` (giữ nguyên số dòng) rồi phân tích như Python; ngôn ngữ khác gọi `analyzeCode`.
3. `analyzeCode` chọn bộ phân tích theo ngôn ngữ, bắt mọi ngoại lệ, loại trùng theo `dòng|tiêu đề`, sắp xếp theo dòng rồi mức độ.
4. Kết quả đưa vào `editor.setDiagnostics(issues)` (chấm lề, gạch chân) và `problems.setStatic(issues)`.
5. Khi chạy lỗi: `explainError(res, { lang, code, stdin, mainName })` phân tích thông báo gốc, trả về đối tượng giải thích có `line`, `col`, `codeLine`, `raw`; trang gọi `problems.setRuntime(ex)`, đánh dấu dòng, gắn cờ tab.
6. `counts()` tính số lỗi, cảnh báo, gợi ý; lỗi chạy trùng dòng với lỗi tĩnh chỉ được đếm một lần; `onChange` cập nhật huy hiệu và thanh trạng thái.
7. Bấm "Hỏi V-Mentor về lỗi này" → `aiPromptForError(r)` soạn câu hỏi ("… Hãy giải thích vì sao lỗi xảy ra và gợi ý cách sửa từng bước (đừng viết hộ toàn bộ lời giải nhé).") rồi mở ngăn kéo AI.

**4. Hàm/lớp/API cốt lõi**

`createProblemsPanel` → `{ setStatic, setRuntime, clearRuntime, counts, onChange, ... }`, `aiPromptForError`; `analyzeCode`, `analyzeCodeAsync`, `levenshtein`, `closest`, `documentIdentifiers`; `explainError`, `readsInput`; `attachDiagnostics`; `editor.setDiagnostics`, `editor.markLine`, `errorLine`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/ide.js`:
```js
export function attachDiagnostics({ editor, problems, getLang, getCode = () => editor.getValue(), signal, delay = 450 }) {
  let token = 0;
  async function run() {
    const my = ++token;
    if (!getEditorSettings().diagnostics) { editor.setDiagnostics([]); problems?.setStatic([]); return []; }
    const issues = await analyzeCodeAsync(getCode(), getLang());
    if (my !== token || signal?.aborted) return issues;
    editor.setDiagnostics(issues);
    problems?.setStatic(issues);
    return issues;
  }
  const debounced = debounce(run, delay);
  onEditorSettings(() => debounced(), { signal });
  signal?.addEventListener('abort', () => debounced.cancel());
  return { run, schedule: debounced, cancel: () => debounced.cancel() };
}
```
Giải thích: kiểm tra tĩnh được trì hoãn 450 ms sau lần gõ cuối; biến `token` bảo đảm chỉ kết quả của lần phân tích mới nhất được hiển thị.

Trích đoạn 2 — `js/components/ide/explain-errors.js`:
```js
  if (r.aborted) return withLine({ type: 'Aborted', severity: 'info', title: 'Em đã dừng chương trình', line: 0, explanation: 'Chương trình bị dừng bằng nút Dừng trước khi chạy xong.', hint: '' });
  if (r.timedOut) {
    return withLine({
      type: 'Timeout', title: 'Quá thời gian chạy', line: 0,
      explanation: needsInput && !String(stdin).trim()
        ? 'Chương trình chạy quá lâu. Chương trình có đọc dữ liệu vào nhưng ô Dữ liệu vào đang trống, hoặc có vòng lặp không bao giờ dừng.'
        : 'Chương trình chạy quá thời gian cho phép — thường do vòng lặp vô hạn (điều kiện dừng không bao giờ sai) hoặc thuật toán quá chậm.',
      hint: 'Kiểm tra điều kiện của while và đảm bảo biến điều khiển thay đổi sau mỗi vòng. Thử in giá trị biến trong vòng lặp để theo dõi.',
    });
  }
```
Giải thích: trước khi phân tích thông báo theo ngôn ngữ, hàm xử lý các tình huống chung; với quá thời gian, lời giải thích thay đổi tùy chương trình có đọc dữ liệu mà ô dữ liệu vào đang trống hay không.

Trích đoạn 3 — `js/components/ide/diagnostics.js` (thiếu dấu hai chấm và `=` trong điều kiện, trích trong `analyzePython`):
```js
    if (kw === 'else' && toks[1]?.v === 'if') {
      issues.push({ line: ln, col: first.col, endCol: toks[1].col + 2, severity: 'error', title: 'Viết "else if" thay vì "elif"', detail: `Python không có "else if" trên cùng một dòng (dòng ${ln}).`, hint: 'Viết elif <điều kiện>:' });
    } else if (isBlock && !topColons.length) {
      issues.push({ line: ln, col: last.col, endCol: last.col + String(last.v).length, severity: 'error', title: 'Thiếu dấu hai chấm (:)', detail: `Câu lệnh "${kw2}" ở dòng ${ln} phải kết thúc bằng dấu ':'.`, hint: `Thêm dấu ':' vào cuối dòng ${ln}.` });
    }
```
Giải thích: bộ phân tích Python làm việc trên token theo dòng logic, nhờ đó định vị được cột chính xác để vẽ gạch chân và viết thông báo kèm cách sửa bằng tiếng Việt.


### Chia sẻ mã bằng liên kết & QR / tải về

**1. Mô tả & giao diện**

Nút "Chia sẻ" (tooltip "Chia sẻ bằng liên kết / mã QR") mở hộp thoại "Chia sẻ mã nguồn": đoạn mô tả "Mã nguồn (N tệp) được nén trực tiếp vào liên kết — không cần tải lên máy chủ…", ô liên kết chỉ đọc (tự bôi chọn), cảnh báo khi liên kết dài hơn 2000 ký tự, khung mã QR 200×200 (chỉ tạo khi liên kết < 2300 ký tự, ngược lại hiện "Mã nguồn quá dài để tạo mã QR."), nút "Đóng" và "Sao chép liên kết". Nút "Tải về" mở menu: "Tải tệp đang mở (…)", "Tải toàn bộ dự án (N tệp riêng)" (khi có > 1 tệp), "Tải trang web gộp (một tệp index.html)" (với HTML).

**2. Các file tham gia**

`js/pages/workspace.js` (`encodeShare`, `decodeShare`, `share`, `downloadOne`, `downloadAll`, `downloadBundled`, `openDownload`), `js/components/ide/files.js` (`webParts`, `normalizeProject`); ngoài phạm vi: `js/config.js` (`QRCODE_URL`), `js/core/ui.js` (`openModal`, `copyText`, `downloadFile`).

**3. Luồng xử lý từng bước**

1. `share()` đồng bộ tệp đang mở, tạo `payload = { lang, code, stdin }`; thêm `project: { files, active }` khi có nhiều tệp hoặc là HTML; với HTML thêm `files: { html, css, js }`.
2. `encodeShare(payload)`: chuyển JSON, nén `CompressionStream('deflate-raw')` nếu trình duyệt hỗ trợ rồi mã hóa base64url với tiền tố `z`; nếu không, mã hóa base64url UTF-8 với tiền tố `b`.
3. Liên kết có dạng `<origin><pathname>#/workspace?lang=<lang>&code=<chuỗi mã hóa>`; hộp thoại hiện ra, ô liên kết được bôi chọn sau 50 ms.
4. Mã QR: nếu chưa có `window.QRCode`, chèn thẻ `<script src=QRCODE_URL>`; tạo `new window.QRCode(qrBox, { text, width: 200, height: 200, correctLevel: L })`; lỗi tải → "Không tạo được mã QR (cần Internet lần đầu)."
5. Người nhận mở liên kết: `mount()` gọi `decodeShare` (tiền tố `z` → `DecompressionStream('deflate-raw')`), `switchLang(lang, { fromIncoming: true })` chuẩn hóa thành dự án, lưu vào thiết bị, thông báo "Đã mở mã nguồn được chia sẻ." và xóa tham số `code` khỏi URL bằng `history.replaceState`. Liên kết hỏng → "Liên kết chia sẻ không hợp lệ."
6. Tải về: `downloadOne()` tải tệp đang mở (MIME `text/html` cho `.html`, còn lại `text/plain`); `downloadAll()` tải lần lượt từng tệp cách nhau 350 ms (tránh trình duyệt chặn) và nhắc cho phép tải nhiều tệp; `downloadBundled()` ghép HTML + CSS (`<style>`) + JS (`<script>`) thành một `index.html` có tiêu đề "Dự án V-Code Edu".

**4. Hàm/lớp/API cốt lõi**

`encodeShare(payload)`, `decodeShare(s)`, `share()`, `downloadOne()`, `downloadAll()`, `downloadBundled()`, `openDownload(anchor)`; Web API `CompressionStream`/`DecompressionStream`, `btoa`/`atob`, thư viện QRCode nạp động.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/pages/workspace.js`:
```js
async function encodeShare(payload) {
  const json = JSON.stringify(payload);
  try {
    if ('CompressionStream' in window) {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const buf = new Uint8Array(await new Response(stream).arrayBuffer());
      let bin = '';
      buf.forEach((b) => { bin += String.fromCharCode(b); });
      return `z${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
    }
  } catch { /* fall through */ }
  return `b${btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}
```
Giải thích: toàn bộ mã nguồn được nén và mã hóa ngay trong URL nên chia sẻ không cần máy chủ; ký tự đầu (`z`/`b`) cho biết cách giải mã.

Trích đoạn 2 — `js/pages/workspace.js`:
```js
    async function share() {
      syncActive();
      const f = activeFile();
      const payload = { lang, code: f.code, stdin: stdin.value };
      if (project.files.length > 1 || lang === 'html') payload.project = { files: project.files, active: project.active };
      if (lang === 'html') payload.files = { html: project.files.find((x) => x.name === 'index.html')?.code ?? '', css: project.files.find((x) => x.name === 'style.css')?.code ?? '', js: project.files.find((x) => x.name === 'script.js')?.code ?? '' };
      const encoded = await encodeShare(payload);
      const url = `${location.origin}${location.pathname}#/workspace?lang=${lang}&code=${encoded}`;
```
Giải thích: gói chia sẻ chứa ngôn ngữ, mã tệp đang mở, dữ liệu vào và (khi cần) toàn bộ dự án, nên người nhận thấy đúng trạng thái của người gửi.

### Workbench dùng chung cho bài học/thử thách (chạy, nộp, chấm, tab kiểm thử)

**1. Mô tả & giao diện**

`createWorkbench` dựng khung lập trình gọn dùng trong trang bài học, thử thách và bài tập lớp học. Thanh trên: nhãn ngôn ngữ, huy hiệu bộ chạy, nhóm "Công cụ soạn thảo" (Định dạng, Tìm, đổi giao diện editor, Cài đặt), "Hỏi V-Mentor" (nếu có `onAskAI`), "Khôi phục mã ban đầu" (hỏi xác nhận). Giữa: editor. Dưới: các tab "Kết quả", "Dữ liệu vào", "Lỗi" (có huy hiệu đếm), "Kiểm thử" (chỉ khi có `tests`/`checks`); với web: "Xem trước", "Console", "Lỗi", "Kiểm thử". Nút "Chạy thử" (Ctrl+Enter) hoặc "Xem trước", "Dừng", "Nộp bài" (nhãn tùy chỉnh `submitLabel`). Kết quả chấm: "Chính xác! Bạn đã vượt qua tất cả kiểm thử." hoặc "Đạt x/y kiểm thử", "Điểm: 8,5/10", danh sách từng test có "Dữ liệu vào", "Kết quả mong đợi", "Kết quả của bạn", "Lỗi", nhãn "Quá thời gian"; test ẩn chỉ hiện "Test ẩn đã đạt." hoặc lời nhắc. Ô dữ liệu vào có gợi ý cảnh báo khi chương trình đọc dữ liệu mà ô trống. Bản nháp tự lưu trên thiết bị (Ctrl+S hiện "Bản nháp được lưu tự động trên thiết bị này.").

**2. Các file tham gia**

`js/components/ide.js`, `js/components/practice.js` (`buildPracticePage` gọi `createWorkbench`, `loadDraft`), `js/components/editor.js`, `js/components/ide/problems.js`, `js/components/ide/diagnostics.js`, `js/components/ide/explain-errors.js`, `js/components/ide/controls.js`, `js/components/ide/settings.js`, `css/pages/ide.css` (`.workbench`, `.wb-*`, `.grade-summary`, `.test-item*`, `.ide-page*`); ngoài phạm vi: `js/runtime/runner.js` (`runCode`, `gradeCode`, `renderPreview`), `js/core/idb.js`.

**3. Luồng xử lý từng bước**

1. `buildPracticePage` đọc bản nháp `loadDraft(cfg.draftKey)` và số lần nộp sai `kv.get(cfg.attemptsKey)`, dựng cột trái (tab "Lý thuyết", "Đề bài" kèm tối đa 2 "Ví dụ kiểm thử", "Gợi ý (n)" mở dần, "Lời giải" khóa đến khi giải đúng hoặc nộp sai 3 lần) và cột phải là workbench.
2. `createWorkbench(opts)` tạo editor với `onChange`: lưu nháp (500 ms) vào IndexedDB `drafts` `{ key, code, lang, updatedAt }`, xem trước trực tiếp (web, 400 ms), xóa đánh dấu, lên lịch kiểm tra tĩnh, cập nhật gợi ý dữ liệu vào; gọi `warmup` tải trước bộ chạy.
3. "Chạy thử": web thì dựng lại iframe; ngôn ngữ khác gọi `runCode` có `AbortController`, hiển thị đầu ra, giải thích lỗi (`explainError`), đánh dấu dòng, nút "… — xem giải thích", hoặc "Hoàn tất · N ms".
4. "Nộp bài" → `grade()`: chuyển tab "Kiểm thử", hiện "Đang chấm bài…" và "Đang chạy test i/n…", gọi `gradeCode({ lang, code, tests, checks, onProgress })`, hiển thị bằng `renderResults`.
5. Nếu test đầu tiên lỗi (và không ẩn) thì giải thích lỗi, đánh dấu dòng, gắn cờ tab "Lỗi"; sau đó gọi `onSubmitted(result, code)`.
6. Trong `buildPracticePage`, `onSubmitted` xác định đạt hết hay không: đạt → `cfg.onPass(result, code, firstSolve)`; chưa đạt → tăng `failCount`, ghi `kv` theo `attemptsKey`, khi đủ 3 lần thì thông báo "Lời giải tham khảo đã được mở trong tab "Lời giải"."; luôn gọi `cfg.onResult`.
7. Trên màn hình hẹp, công tắc "Đề bài" / "Viết code" chuyển khung hiển thị (`data-pane`).

**4. Hàm/lớp/API cốt lõi**

`createWorkbench(opts)` → `{ el, editor, run, grade, getCode, setCode, getStdin, focus }`; `createTerminal`, `renderResults`, `attachDiagnostics`, `inputNotice`, `loadDraft`, `RUNTIME_LABELS`; `buildPracticePage(container, ctx, cfg)` → `{ wb, ai, markSolved }`; API ngoài phạm vi `gradeCode`, `runCode`, `renderPreview`, `idb.put('drafts', …)`, `kv`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/ide.js` (chấm bài):
```js
  async function grade() {
    if (!btnSubmit) return null;
    btnSubmit.classList.add('is-loading');
    btnRun.disabled = true;
    showTab('tests');
    mount(results, h('div', { class: 'cluster', style: 'padding:16px' }, h('div', { class: 'spinner' }), h('span', { class: 'muted' }, 'Đang chấm bài…')));
    try {
      const result = await gradeCode({ lang: runtimeLang, code: editor.getValue(), tests, checks, onProgress: (i, n) => mount(results, h('div', { class: 'cluster', style: 'padding:16px' }, h('div', { class: 'spinner' }), h('span', { class: 'muted' }, `Đang chạy test ${i + 1}/${n}…`))) });
      renderResults(results, result);
      const firstErr = result.results.find((r) => !r.ok && r.error);
      lastError = firstErr?.error || '';
      if (firstErr?.error) {
        const visible = !firstErr.hidden;
        const ex = visible ? explainError({ ok: false, error: firstErr.error, timedOut: firstErr.timedOut }, { lang: runtimeLang, code: editor.getValue(), stdin: firstErr.input || '' }) : null;
        const line = ex?.line || errorLine(firstErr.error);
        if (line) editor.markLine(line, 'error');
        if (ex) { problems.setRuntime(ex); tabBtns.problems?.classList.add('is-flagged'); }
      }
      await onSubmitted?.(result, editor.getValue());
      return result;
```
Giải thích: workbench chạy toàn bộ bộ test qua `gradeCode`, cập nhật tiến độ từng test, rồi giải thích lỗi của test hiển thị đầu tiên; với test ẩn, nội dung test không bị lộ.

Trích đoạn 2 — `js/components/ide.js` (lưu bản nháp):
```js
  const saveDraft = debounce((code) => {
    if (draftKey) idb.put('drafts', { key: draftKey, code, lang, updatedAt: Date.now() }).catch(() => {});
  }, 500);
```
Giải thích: mỗi bài có khóa nháp riêng; nội dung được ghi vào IndexedDB sau 500 ms không gõ.

Trích đoạn 3 — `js/components/practice.js` (mở khóa lời giải):
```js
      } else {
        failCount += 1;
        if (cfg.attemptsKey) kv.set(cfg.attemptsKey, failCount).catch(() => {});
        if (failCount === 3 && cfg.sections.solution) toast('Lời giải tham khảo đã được mở trong tab "Lời giải".', { type: 'info' });
      }
```
Giải thích: số lần nộp chưa đạt được lưu bền vững theo bài; đến lần thứ ba, tab "Lời giải" được mở khóa.

### Ngăn kéo AI trong bài học (practice.js)

**1. Mô tả & giao diện**

Ngăn kéo bên `aside.ai-drawer` ("Trợ lý AI V-Mentor") trượt vào từ cạnh màn hình khi bấm "Hỏi V-Mentor" trong workbench/IDE hoặc "Hỏi V-Mentor về lỗi này" trong bảng Lỗi. Đầu ngăn kéo có huy hiệu "V-Mentor", tiêu đề "Hỏi trợ lý AI", nút mở trang AI đầy đủ (`#/ai`, "Mở trang trợ lý AI") và nút "Đóng". Thân là thành phần chat ở chế độ gọn (`compact: true`, chế độ mặc định `tutor`), có chip "Đính kèm: <bài> · N dòng <ngôn ngữ> · có thông báo lỗi" (bỏ được bằng ×). Khi có lỗi, ngăn kéo tự gửi câu "Em gặp lỗi khi chạy chương trình. Hãy giúp em hiểu lỗi và gợi ý cách sửa (đừng viết hộ toàn bộ lời giải nhé)."

**2. Các file tham gia**

`js/components/practice.js` (`createAIDrawer`, `ensureAiCss`), `js/components/chat.js` (tải động), `js/pages/workspace.js` (dùng lại `createAIDrawer` cho IDE), `js/components/ide/problems.js` (`aiPromptForError`), `css/pages/ai.css` (nạp động), `css/pages/ide.css` (`.ai-drawer`).

**3. Luồng xử lý từng bước**

1. Trang tạo `createAIDrawer({ signal, getContext })`; chưa tạo DOM.
2. Lần đầu `open(prompt)`: `import('./chat.js')`, dựng `aside`, gắn vào `document.body`, chờ `ensureAiCss()` (chèn `<link href="css/pages/ai.css">` một lần), rồi `createChat(body, { compact: true, mode: 'tutor', context: getContext() })`; đăng ký hủy chat và gỡ ngăn kéo khi `signal` hủy.
3. Mỗi lần mở: `chat.setContext(getContext())` cập nhật ngữ cảnh mới nhất — trong bài học gồm `{ code, language, error, lesson: tiêu đề + 1200 ký tự đề bài }`; trong IDE gồm `{ code, language, error }` (nhiều tệp được ghép với tiêu đề `# ===== tên =====`).
4. Thêm lớp `is-open` ở khung hình kế tiếp (hiệu ứng trượt); có `prompt` thì `chat.send(prompt)`, không thì đưa tiêu điểm vào ô nhập.
5. `close()` bỏ lớp `is-open`.

**4. Hàm/lớp/API cốt lõi**

`createAIDrawer({ signal, getContext })` → `{ open(prompt), close() }`; `ensureAiCss()`; `createChat(...).setContext/send/focus/destroy`; `aiPromptForError(r)`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/practice.js`:
```js
export function createAIDrawer({ signal, getContext }) {
  let drawer = null;
  let chat = null;
  async function open(prompt) {
    if (!drawer) {
      const { createChat } = await import('./chat.js');
      const body = h('div', { class: 'ai-drawer__body' });
      drawer = h('aside', { class: 'ai-drawer', 'aria-label': 'Trợ lý AI V-Mentor' },
        h('div', { class: 'ai-drawer__head' },
          h('span', { class: 'badge badge--ai' }, icon('sparkles'), 'V-Mentor'),
          h('strong', { class: 'grow' }, 'Hỏi trợ lý AI'),
          h('a', { class: 'btn btn--ghost btn--sm', href: '#/ai', title: 'Mở trang trợ lý AI' }, icon('maximize')),
          h('button', { class: 'btn btn--ghost btn--icon btn--sm', type: 'button', 'aria-label': 'Đóng', onClick: () => close() }, icon('x'))),
        body);
      document.body.appendChild(drawer);
      await ensureAiCss();
      chat = createChat(body, { compact: true, mode: 'tutor', context: getContext() });
      signal.addEventListener('abort', () => { chat?.destroy(); drawer?.remove(); });
    }
    chat.setContext(getContext());
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    if (prompt) chat.send(prompt); else chat.focus();
  }
```
Giải thích: mã chat và CSS AI chỉ được tải khi học sinh thật sự mở ngăn kéo (tải lười), và ngữ cảnh mã/lỗi luôn được làm mới trước mỗi lần hỏi.

### Lưu đồ – chế độ "Từ mã nguồn"

**1. Mô tả & giao diện**

Trong IDE, chế độ "Lưu đồ" mở studio với tiêu đề "Lưu đồ" và bộ chọn "Từ mã nguồn" / "Thiết kế". Chế độ "Từ mã nguồn" vẽ lưu đồ tự động theo mã trong editor và cập nhật khi gõ. Thanh công cụ: nhãn ngôn ngữ (Python, Python Tiếng Việt, C, C++, JavaScript, TypeScript, Java), trạng thái ("N khối · M hàm", "Chưa có mã nguồn", "Không phân tích được mã", "Ngôn ngữ chưa hỗ trợ"), "Thu nhỏ", mức phóng (bấm để về 100%), "Phóng to", "Vừa khung nhìn", "SVG", "PNG", "Tạo lưu đồ từ mã hiện tại". Chú giải màu: Bắt đầu/Kết thúc, Nhập/Xuất, Xử lý, Điều kiện, Chương trình con. Thanh cảnh báo hiện cảnh báo đầu tiên (kèm "(+n)"). Mỗi hàm được vẽ thành một lưu đồ riêng có khung tiêu đề "Hàm tên(tham số)"; chương trình chính có tiêu đề "Chương trình chính". Nhấp hoặc Enter trên khối để nhảy tới dòng tương ứng trong editor.

**2. Các file tham gia**

`js/components/flowchart/index.js`, `live.js`, `parse-code.js`, `layout.js`, `model.js`, `render.js`, `viewport.js`, `export.js`, `icons-local.js`, `css/pages/flowchart.css`; `js/pages/workspace.js` (`STUDIO.flowchart`, `notifyStudio`, `onJumpToLine`).

**3. Luồng xử lý từng bước**

1. IDE gọi `onCodeChange(code, lang)` (trễ 300 ms sau khi gõ); nếu studio đang ẩn hoặc ở chế độ "Thiết kế" thì giữ lại (`pending`) để vẽ khi hiện.
2. `live.update(code, lang)`: mã trống → trạng thái rỗng "Chưa có mã để vẽ lưu đồ".
3. `parseProgram(code, lang)` (parse-code.js): Python/pyvn phân tích theo thụt lề (if/elif/else, for range → `for` có init/cond/update, for khác → `foreach`, while, def, try, with, match/case…); C/C++/JS/TS/Java dùng `CParser` theo ngoặc nhọn (if/else, while, do-while, for, for-of/range-for, switch → chuỗi if…); nhận diện lệnh nhập/xuất theo ngôn ngữ (`input()`, `nhap_so`, `cin >>`, `scanf`, `prompt`, `Scanner.nextInt`, `print`, `printf`, `cout <<`, `console.log`, `System.out.println`…). Kết quả `{ main, functions, warnings, empty }` hoặc `unsupported`.
4. `layoutProgram(program)` dựng fragment cho từng câu lệnh: chuỗi xếp dọc, if/else đặt hai nhánh cạnh nhau rồi hợp tại chấm tròn, vòng lặp có ray quay lui bên trái và ray thoát bên phải, `break`/`continue` đi theo ray; thêm khối Kết thúc khi còn luồng.
5. `chooseArrangement()` so sánh xếp hàng ngang và hàng dọc, chọn cách cho tỉ lệ phóng lớn hơn (>8%); `arrange()` tính tọa độ tuyệt đối và khung bao.
6. `render()` vẽ SVG: khung nhóm, cạnh (`roundedPath` + marker mũi tên), nhãn "Đúng/Sai" hoặc "Còn/Hết", chấm hợp, khối (`nodeEl`) có `title` "Dòng N: …", `tabindex` và `role="button"`.
7. `fitView()` chỉ tự căn khi người dùng chưa tự kéo/phóng; `ResizeObserver` gọi `resize()` để xếp lại khi khung đổi kích thước.
8. Nhấp khối → `activate(id)` tô `is-active` và gọi `onJumpToLine(line)` (IDE mở editor nếu đang thu gọn và nhảy tới dòng).
9. "SVG"/"PNG" → `exportSvg`/`exportPng` với tên `luu-do-tu-ma.svg`/`luu-do-tu-ma.png`.
10. "Tạo lưu đồ từ mã hiện tại" → `buildDesignerGraph()` phân tích lại với `forDesigner: true` (vòng `foreach` được đổi thành vòng chỉ số `chi_so`), chỉ lấy chương trình chính, làm tròn tọa độ, chuyển sang chế độ "Thiết kế" (hỏi xác nhận nếu đang có lưu đồ > 2 khối).

**4. Hàm/lớp/API cốt lõi**

`createFlowchartStudio`, `createLiveView` → `{ update, refresh, resize, buildDesignerGraph }`, `parseProgram`, `normalizeLangName`, `layoutProgram`, `arrange`, `nodeSize`, `wrapText`, `measure`, `makeDefs`, `nodeEl`, `roundedPath`, `labelPos`, `edgeLabelEl`, `createViewport` (`fit`, `zoomCenter`, `setZoom`, `startPan`), `exportSvg`, `exportPng`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/flowchart/live.js`:
```js
    try {
      program = parseProgram(code, lang);
    } catch (err) {
      status.textContent = 'Không phân tích được mã';
      showEmpty('Không đọc được cấu trúc chương trình', String(err?.message || err), 'alert');
      return;
    }
    if (program.unsupported) {
      status.textContent = 'Ngôn ngữ chưa hỗ trợ';
      warnBar.hidden = true;
      showEmpty('Lưu đồ chưa hỗ trợ ngôn ngữ này', 'Hãy dùng Python, Python Tiếng Việt, C, C++, JavaScript hoặc Java.', 'alert');
      return;
    }
    if (program.empty) {
      status.textContent = 'Chưa có câu lệnh';
      showEmpty('Chưa có câu lệnh để vẽ', 'Chương trình hiện chỉ có chú thích hoặc khai báo.');
      return;
    }
    empty.hidden = true;
    const lay = layoutProgram(program);
    charts = lay.charts;
    arrangement = chooseArrangement();
    graph = arrange(charts, arrangement);
```
Giải thích: quy trình ba bước phân tích → bố trí → sắp xếp; mỗi tình huống không vẽ được đều có thông báo tiếng Việt rõ ràng.

Trích đoạn 2 — `js/components/flowchart/parse-code.js` (theo báo cáo đọc đầy đủ tệp):
```js
export function parseProgram(code, lang) {
  const l = normalizeLangName(lang);
  const warnings = [];
  const src = String(code ?? '').replace(/\r\n?/g, '\n');
  let res;
  if (PY_LANGS.has(l)) res = parsePython(src, warnings);
  else if (BRACE_LANGS.has(l)) res = parseBrace(src, l, warnings);
  else return { lang: l, unsupported: true, main: [], functions: [], warnings };
  const empty = !res.main.length && !res.functions.length;
  return { lang: l, ...res, warnings, empty };
}
```
Giải thích: hai họ bộ phân tích — theo thụt lề cho Python/pyvn và theo ngoặc nhọn cho C/C++/JavaScript/TypeScript/Java — cùng trả về một cấu trúc chương trình thống nhất.

### Lưu đồ – chế độ "Thiết kế"

**1. Mô tả & giao diện**

Trình thiết kế kéo thả gồm:

- **Thanh công cụ**: "Hoàn tác (Ctrl+Z)", "Làm lại (Ctrl+Y)", "Xóa phần đang chọn (Delete)", menu "Mẫu" ("Chọn lưu đồ mẫu"), menu "Tệp" ("Tạo lưu đồ từ mã hiện tại", "Mở tệp JSON…", "Lưu thành JSON", "Tải ảnh SVG", "Tải ảnh PNG", "Xóa toàn bộ lưu đồ"), nút kiểu mũi tên (gấp khúc / đường cong); thanh chạy "Chạy (F5)", "Chạy từng bước (F10)", "Tạm dừng", "Dừng", thanh trượt "Tốc độ chạy" 1–10 (Rất chậm … Tức thì); nút "Chuyển thành Python".
- **Bảng "Khối"** 7 loại: Bắt đầu, Kết thúc, Nhập, Xuất, Xử lý, Điều kiện, Chương trình con — kéo vào vùng vẽ hoặc nhấn để thêm vào giữa.
- **Vùng vẽ SVG** có lưới chấm 20px, hộp phóng (Thu nhỏ / % / Phóng to / Vừa khung nhìn), dòng gợi ý "Kéo khối từ bảng bên trái · kéo từ chấm tròn để nối · nháy đúp để sửa chữ · Shift + kéo để chọn nhiều", biểu ngữ khóa khi đang chạy.
- **Bảng bên**: tab "Chạy thử" (ô "Dữ liệu vào" mỗi dòng một giá trị, dòng trạng thái, hộp nhập khi hết dữ liệu, "Bảng biến" với cột Biến/Giá trị/Kiểu, "Kết quả" kèm nút "Xóa") và tab "Khối đang chọn" (ô "Nội dung", trợ giúp theo loại khối, chọn đích nối "Đi tới"/"Nhánh Đúng/Sai", "Xóa khối"/"Xóa mũi tên").
- **Phím tắt** (12 hành động): F5, F10, Ctrl+Z, Ctrl+Y / Ctrl+Shift+Z, Ctrl+A, Delete/Backspace, Enter/F2, Esc, +/=, -, 0, phím mũi tên (di chuyển khối 20px hoặc cuộn 60px); giữ Alt khi kéo để bỏ bám lưới.

Ngữ nghĩa chữ trong khối: Nhập "Nhập n", "Nhập a, b (số thực)", "Nhập ten (chuỗi)" (mặc định số nguyên); Xuất "In tong", "Xuất "Tổng:", tong", `print(a, b)`; Xử lý là phép gán, mỗi dòng một lệnh hoặc ngăn bằng `;` (chấp nhận `←`, `:=`, `+=`, `++`, khai báo kiểu C); Điều kiện là biểu thức đúng/sai ("a > b và b > c", "i <= n?").

Bộ tính biểu thức an toàn (`expr.js`): không dùng `eval`/`new Function`; số nguyên là BigInt, số thực là Number; toán tử `+ - * / // % **`, so sánh nối chuỗi, `and/or/not`, `&&/||/!`, từ tiếng Việt `va`/`và`, `hoac`/`hoặc`, `khong_phai`, `mod`, `div`; hằng `Đúng/Sai`; danh sách, tuple, chỉ số âm, f-string; chỉ gọi được 12 hàm `BUILTINS` (`int, float, str, bool, len, abs, min, max, round, sqrt, sum, print`), bí danh tiếng Việt (`do_dai`, `so_nguyen`, `so_thuc`, `lam_tron`, `in_ra`, `can_bac_hai`), `math.sqrt/floor/ceil/gcd`, hằng `pi`, `e` và một số phương thức danh sách/chuỗi; giới hạn độ dài chuỗi/danh sách 1.000.000 phần tử và lũy thừa nguyên ước tính tối đa 100.000 bit.

Mẫu dựng sẵn (4): "Tổng 1..n", "Số lớn nhất của 3 số", "Kiểm tra chẵn lẻ", "Đếm ước số" (mỗi mẫu kèm dữ liệu vào mẫu).

**2. Các file tham gia**

`js/components/flowchart/editor.js`, `interpreter.js`, `semantics.js`, `expr.js`, `codegen.js`, `templates.js`, `export.js`, `viewport.js`, `render.js`, `model.js`, `icons-local.js`, `index.js`, `css/pages/flowchart.css`; `js/pages/workspace.js` (`sendToEditor` khi bấm "Mở trong trình soạn thảo").

**3. Luồng xử lý từng bước**

1. `createDesigner` → `init()`: đọc `localStorage['vc-flowchart:designer:v1']`, làm sạch bằng `sanitizeGraph`, khôi phục dữ liệu vào, kiểu mũi tên, tốc độ; nếu chưa có thì nạp mẫu đầu tiên.
2. Kéo khối từ bảng: sau 5px tạo "bóng" `.fc-ghost`; thả trong vùng vẽ → `addNode` tại tọa độ thế giới, bám lưới 20px, tự dịch nếu chồng khối, mở ô sửa chữ ngay (trừ Bắt đầu/Kết thúc).
3. Nối khối: kéo từ chấm cổng (`out`, `yes`, `no`) tới khối đích → `setEdge` (mỗi cổng tối đa một mũi tên, không nối vào "Bắt đầu", "Kết thúc" không có mũi tên ra).
4. Mỗi thay đổi → `commit()`: chụp JSON, đẩy vào ngăn hoàn tác (tối đa 150), xóa ngăn làm lại, lưu ngay vào localStorage.
5. "Chạy" / "Từng bước" → `startRun()`: `validateGraph` (đúng một Bắt đầu, có Kết thúc, mọi khối có lối ra, khối Điều kiện đủ hai nhánh, không có khối không tới được, nội dung khối biên dịch được); lỗi → tô đỏ khối, liệt kê lỗi với nút "Xem khối".
6. Hợp lệ → `new Runner(graph, { inputs, maxSteps: MAX_STEPS })`; `schedule()` gọi `doStep()` theo độ trễ `SPEEDS` (1100 → 0 ms; mức "Tức thì" chạy theo lô 12 ms mỗi khung hình).
7. `Runner.step()` thực thi khối hiện tại: Nhập đọc từ hàng đợi (hết thì trả `need-input` → hộp nhập "Hết dữ liệu vào — nhập giá trị cho …"), Xuất định dạng như `print` (hỗ trợ `sep`, `end`), Xử lý chạy từng câu gán, Điều kiện chọn cổng `yes`/`no`; vượt 10.000 bước hoặc in quá dài → lỗi "lặp vô hạn".
8. Mỗi bước: tô khối `is-current`/`is-visited`, mũi tên `is-active` (nét đứt chuyển động), cập nhật "Bảng biến" (hàng thay đổi nhấp nháy), ghi kết quả; xong → "✔ Chương trình kết thúc sau N bước."; lỗi → khối `is-failed`.
9. "Chuyển thành Python" → `generatePython(graph)`: dịch có cấu trúc (if/elif/else, while, break/continue) hoặc "máy trạng thái" với biến `buoc`; hộp thoại "Mã Python từ lưu đồ" có "Sao chép" và "Mở trong trình soạn thảo".
10. "Lưu thành JSON" → `luu-do.json`; "Mở tệp JSON…" kiểm tra kích thước ≤ 2.000.000 byte, ≤ 500 khối, loại khối hợp lệ, mã khối không trùng; "Tải ảnh SVG/PNG" → `luu-do.svg`/`luu-do.png` (PNG nhân tỉ lệ 2, cạnh tối đa 8000px).

**4. Hàm/lớp/API cốt lõi**

`createDesigner`, `sanitizeGraph`, `commit`, `undo`, `redo`, `addNode`, `setEdge`, `deleteSelection`, `route`, `loadTemplate`, `loadGraph`, `exportJson`, `exportImage`, `startRun`, `schedule`, `doStep`, `showPrompt`, `renderWatch`, `showPython`; `validateGraph`, lớp `Runner` (`step`, `provideInput`, `runToEnd`), `MAX_STEPS`; `compileNode`, `parseInputText`, `parseOutputText`, `parseDecisionText`, `parseProcessText`; `parseExpression`, `evaluate`, `execStatement`, `BUILTINS`, `FcError`; `generatePython`; `TEMPLATES`, `templateById`; `buildSvg`, `exportSvg`, `exportPng`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/flowchart/interpreter.js` (thực thi một khối trong `Runner.step()`):
```js
        case 'output': {
          const args = [];
          const kw = {};
          for (const a of c.args) { if (a.kw) kw[a.kw] = evaluate(a.e, ctx); else args.push(evaluate(a.e, ctx)); }
          const sep = kw.sep !== undefined ? pyStr(kw.sep) : ' ';
          const end = kw.end !== undefined ? pyStr(kw.end) : '\n';
          write += args.map(pyStr).join(sep) + end;
          break;
        }
        case 'process':
          for (const st of c.stmts) execStatement(st, ctx);
          break;
        case 'decision':
          port = truthy(evaluate(c.cond, ctx)) ? 'yes' : 'no';
          break;
```
Giải thích: mỗi loại khối đã được biên dịch trước thành mô tả thực thi; khối Điều kiện quyết định đi theo cổng "Đúng" hay "Sai" dựa trên giá trị chân lý kiểu Python.

Trích đoạn 2 — `js/components/flowchart/editor.js` (lưu và lịch sử hoàn tác, theo báo cáo đọc đầy đủ tệp):
```js
  const snapshot = () => JSON.stringify(graph);

  const saveNow = () => storageSet(JSON.stringify({ format: 'vcode-flowchart', version: 1, graph, inputs: inputsArea.value, edgeStyle, speed: Number(speed.value) }));
  const save = debounce(saveNow, 350);
  window.addEventListener('pagehide', () => { save.cancel(); saveNow(); }, { signal });

  function commit() {
    const snap2 = snapshot();
    if (snap2 === current) return;
    undoStack.push(current);
    if (undoStack.length > 150) undoStack.shift();
    redoStack = [];
    current = snap2;
    save.cancel();
    saveNow();
    updateButtons();
  }
```
Giải thích: mỗi thao tác chỉnh sửa tạo một ảnh chụp JSON cho hoàn tác (giới hạn 150 bước) và được lưu ngay vào localStorage, kể cả khi đóng trang (`pagehide`).

Trích đoạn 3 — `js/components/flowchart/codegen.js` (dự phòng "máy trạng thái"):
```js
  const lines = [
    '# Lưu đồ có các đường nhảy chéo nhau (không tách được thành if/while lồng nhau),',
    '# nên được dịch theo kiểu "máy trạng thái": biến buoc cho biết khối nào chạy tiếp theo.',
    '# buoc = 0 nghĩa là đã tới khối Kết thúc.',
    `buoc = ${stepOf(startId)}`,
    'while buoc != 0:',
  ];
```
Giải thích: khi đồ thị không thể tách thành if/while lồng nhau (không khả quy hoặc vòng lặp nhiều lối ra), mã Python vẫn được sinh đúng nhờ biến trạng thái `buoc`.

### Scratch Live (mã → khối)

**1. Mô tả & giao diện**

Chế độ "Scratch Live" trong IDE hiển thị chương trình Python / Python Tiếng Việt dưới dạng khối kiểu Scratch chỉ đọc, đặt cạnh editor. Bảng có tiêu đề logo "Scratch" và hai nút "Scratch Live" / "Xưởng khối"; thanh trên có huy hiệu "Trực tiếp", thống kê "N khối lệnh · M hàm", nhóm "Thu phóng" (Thu nhỏ / % / Phóng to, 60–160%), nút "Mở trong Xưởng khối". Chương trình chính nằm dưới khối mũ "khi bấm ▶ Chạy chương trình"; mỗi `def` là một kịch bản riêng "định nghĩa <tên> <tham số>". Ví dụ ánh xạ: `print` → "in ra màn hình" (Hiển thị), `x = input()` → "hỏi … rồi lưu vào x" (Cảm biến), gán → "đặt … thành …" (Biến), `if` → "nếu … thì / ngược lại", `for` → "lặp lại N lần" hoặc "lặp với v từ a đến b", `while True` → "lặp lại mãi mãi", `break` → "thoát vòng lặp". Có bảng "Chú giải" theo nhóm màu. Ngôn ngữ khác hiển thị "Scratch Live dành cho Python".

**2. Các file tham gia**

`js/components/scratch/index.js`, `live.js`, `pyparse.js`, `render.js`, `shapes.js`, `css/pages/scratch.css`; `js/pages/workspace.js` (`STUDIO.scratch`); ngoài phạm vi: `js/runtime/pyvn.js` (`loadPyvnMapping`, `translatePyvnWith`).

**3. Luồng xử lý từng bước**

1. IDE gọi `onCodeChange(code, lang)` (trễ 300 ms) → `live.update(code, lang)` (bỏ qua nếu không đổi).
2. `toPython(code, lang)` dịch pyvn sang Python (giữ số dòng; dùng bảng dự phòng `FALLBACK_PYVN` cho tới khi `ensurePyvn()` tải bảng thật rồi vẽ lại).
3. `parseProgram(src)` (pyparse.js, không bao giờ ném lỗi): ghép dòng logic, theo dõi thụt lề, gắn `elif/else/except/finally` vào lệnh chủ, tách câu lệnh đơn theo `;`.
4. Tách `def` khỏi chương trình chính; dựng khối bằng `stmtEl`/`exprEl` (lồng tối đa 5 cấp, sâu hơn thì hiện chữ), mỗi khối mang `data-line`.
5. `layoutShapes(canvas)` đo từng khối rồi vẽ đường viền SVG (stack/hat/C/reporter/boolean) phía sau; `applySize()` áp thu phóng; giữ vị trí cuộn.
6. Nhấp khối → tô `is-picked`, gọi `onJumpToLine(line)` để editor nhảy tới dòng.
7. "Mở trong Xưởng khối" → `setMode('studio')` và `studio.buildFromCode()` tạo khối chạy được từ mã.

**4. Hàm/lớp/API cốt lõi**

`createScratchStudio` → `{ el, onCodeChange, onShow, destroy }`; `createLive({ onJumpToLine, onToStudio })` → `{ el, update, relayout }`; `exprEl`; `toPython`, `parseProgram`, `ensurePyvn`, `parseExpr`; `blockEl`, `rowEl`, `mouthEl`, `glyph`, `litPill`, `stackEl`; `layoutShapes`, `stackPath`, `cPath`, `reporterPath`, `booleanPath`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/scratch/live.js` (theo báo cáo đọc đầy đủ tệp):
```js
  function render(code, lang) {
    const isPy = lang === 'python' || lang === 'pyvn' || !lang;
    const scripts = [];
    let blockCount = 0;
    let fnCount = 0;
    if (!isPy) {
      scripts.push(h('div', { class: 'sc-live__empty' },
        h('strong', null, 'Scratch Live dành cho Python'),
        h('span', null, 'Hãy chọn ngôn ngữ Python hoặc Python Tiếng Việt trong trình soạn thảo để xem chương trình dưới dạng khối lệnh.')));
    } else {
      const tree = parseProgram(toPython(code, lang));
      const main = [];
      const defs = [];
      for (const st of tree) (st.kind === 'def' ? defs : main).push(st);
      const hat = blockEl({ cat: 'events', shape: 'stack', top: 'hat' }, rowEl(lbl('khi bấm'), glyph('play', 'sc-glyph--play'), lbl('Chạy chương trình')));
      hat.dataset.line = '1';
      const mainStack = stackEl(hat, ...bodyEls(main));
      scripts.push(h('div', { class: 'sc-script sc-script--live' }, mainStack));
```
Giải thích: mã được dịch, phân tích, tách định nghĩa hàm, rồi phần chính được đặt dưới khối mũ "Chạy chương trình" giống kịch bản Scratch.

Trích đoạn 2 — `js/components/scratch/live.js` (theo báo cáo đọc đầy đủ tệp):
```js
  scroll.addEventListener('click', (e) => {
    const t = e.target.closest('[data-line]');
    if (!t || !scroll.contains(t)) return;
    const line = Number(t.dataset.line);
    if (line) {
      scroll.querySelectorAll('.is-picked').forEach((x) => x.classList.remove('is-picked'));
      t.closest('.sc-b')?.classList.add('is-picked');
      onJumpToLine?.(line);
    }
  });
```
Giải thích: số dòng nguồn được gắn vào từng khối, nên nhấp vào khối sẽ đưa con trỏ editor về đúng dòng mã tương ứng.

### Xưởng khối Scratch (khối, sân khấu, nhân vật, runtime, dự án mẫu, sinh mã Python, tạo khối từ mã)

**1. Mô tả & giao diện**

Chế độ "Xưởng khối" là môi trường lập trình khối chạy được:

- **Thanh công cụ**: ô "Tên dự án" (≤ 60 ký tự), menu "Dự án" ("Lưu vào trình duyệt", "Mở dự án đã lưu…", "Xuất tệp JSON", "Nhập tệp JSON…", "Dự án mới"), "Ví dụ" ("Dự án mẫu (chạy được ngay)"), "Xem mã Python", "Tạo khối từ mã", "Ẩn/hiện sân khấu", thu phóng.
- **Trình soạn khối**: cột nhóm "Nhóm khối lệnh" (9 nhóm: Sự kiện, Chuyển động, Hiển thị, Âm thanh, Điều khiển, Cảm biến, Phép toán, Biến, Bút vẽ), bảng khối "Bảng khối lệnh" (96 định nghĩa khối trong `SPECS`), nút "Tạo biến" và ô "Hiện trên sân khấu"; vùng làm việc kéo thả có hít (snap), thả vào bảng khối để xóa ("Thả vào đây để xóa"), menu ngữ cảnh "Nhân bản", "Xóa khối", "Dọn dẹp khối", "Xóa tất cả khối của nhân vật này", "Đổi tên biến", "Xóa biến".
- **Sân khấu** 480×360 (tỉ lệ 4:3): cờ xanh "Bấm cờ xanh để chạy", "Dừng tất cả", tọa độ chuột `x: … y: …`, "Phóng to sân khấu" (toàn màn hình); bảng theo dõi biến; hộp "hỏi và đợi" (ô "Câu trả lời", "Gửi câu trả lời"); bóng thoại "nói"/"nghĩ".
- **Nhân vật**: ô thông tin "Nhân vật", `x`, `y`, `hướng`, `cỡ`, nút ẩn/hiện; danh sách nhân vật với ảnh thu nhỏ, "Thêm" (6 loại: V-Bot, Tên lửa, Quả bóng, Ngôi sao, Cá vàng, Rùa), "Xóa nhân vật"; nút "Phông nền" (6: Trắng, Lưới tọa độ, Bầu trời, Vũ trụ, Đại dương, Đồng cỏ).
- **Dự án mẫu** (4): "Rô-bốt chào hỏi", "Vẽ hình đa giác bằng bút", "Trò chơi bắt sao", "Đếm số với biến".

**2. Các file tham gia**

`js/components/scratch/studio.js`, `workspace.js`, `blocks.js`, `runtime.js`, `stage.js`, `sprites.js`, `projects.js`, `codegen.js`, `frompy.js`, `pyparse.js`, `render.js`, `shapes.js`, `index.js`, `css/pages/scratch.css`; `js/pages/workspace.js` (`sendToEditor`).

**3. Luồng xử lý từng bước**

1. `ensureStudio()` tạo `createStudio` lần đầu cần; dự án ban đầu là `loadAutosave() || newProject()` (dự án mới có biến "điểm", tin nhắn "bắt đầu", một V-Bot nói "Xin chào! Hãy kéo thêm khối để lập trình cho mình nhé.").
2. Kéo thả khối (workspace.js): `onPointerDown` → sau 5px `beginDrag` (sao chép từ bảng khối, tách khỏi ô giá trị hoặc tách từ khối đó trở xuống trong ngăn xếp) → `collectTargets` + `findSnap` (bán kính 30px, ô giá trị 26px, ô boolean chỉ nhận khối boolean) → `onPointerUp` chèn trước/sau, đặt vào ô, tạo kịch bản mới hoặc xóa nếu thả lên bảng khối → `onChange` tự lưu (500 ms).
3. Chạy (runtime.js): cờ xanh → `greenFlag()` khởi động âm thanh, dừng mọi luồng, đặt lại hiệu ứng/bóng thoại/bút, chạy các kịch bản "khi bấm cờ xanh"; phím (`KEY_FROM_EVENT` → `keyDown`), nhấp nhân vật (`spriteClicked`) và phát tin nhắn khởi động các khối mũ tương ứng; nhấp một kịch bản để chạy/dừng riêng nó, nhấp khối giá trị để xem kết quả (2,2 giây).
4. Mỗi kịch bản là một generator; vòng lặp `requestAnimationFrame` gọi `tick()` khoảng 30 lần/giây, mỗi tick bước các luồng tối đa 6 ms hoặc tới khi cần vẽ lại; `stage.render` vẽ phông nền → lớp bút → nhân vật → bóng thoại.
5. "Xem mã Python" → `projectToPython(project)` sinh mã (biến được đổi tên không dấu, trình xử lý sự kiện thành hàm `khi_nhan_…`, `khi_bam_vao_…`, khối chuyển động/hiển thị/âm thanh/bút vẽ thành chú thích); hộp thoại "Mã Python tương đương" có "Sao chép" và "Mở trong trình soạn thảo" (`onSendToEditor`).
6. "Tạo khối từ mã" → `pythonToBlocks(code, lang)` (chỉ Python/pyvn): `print` → nói trong 1,5 giây, `input` → hỏi và đợi, gán → đặt biến, `+=` → thay đổi, `if/elif/else`, `for … in range`, `while True`, `while cond`; thêm biến mới (hiện trên sân khấu), đặt kịch bản dưới các kịch bản cũ, báo số khối và các dòng bỏ qua/giữ dạng chữ.
7. Lưu/nạp: tự lưu `vc-scratch-autosave`; "Lưu vào trình duyệt" ghi thư viện `vc-scratch-library` theo tên dự án; "Xuất tệp JSON" tải `<tên-không-dấu>.json`; "Nhập tệp JSON…" (≤ 4.000.000 byte) qua `normalizeProject` (giới hạn 30 nhân vật, 200 kịch bản/nhân vật, 100 biến).

**4. Hàm/lớp/API cốt lõi**

`createStudio` → `{ show, hide, buildFromCode, showPython, loadProject, loadExample, ... }`; `createWorkspace`, `openPopover`, `closePopover`; `SPECS`, `PALETTE`, `CATEGORY_ORDER`, `CATEGORY_NAMES`, `B`, `newBlock`, `sanitizeBlocks`; `createRuntime` (`greenFlag`, `stopAll`, `keyDown`, `spriteClicked`, `runScript`, `runBlock`), `toNum`, `toBool`, `compare`; `createStage` (`fit`, `render`, `ask`, `penLine`, `stamp`), `W`, `H`; `SPRITE_KINDS`, `BACKDROPS`, `costumeImage`, `spriteThumb`, `backdropImage`; `newProject`, `EXAMPLES`, `normalizeProject`, `serializeProject`, `loadAutosave`, `saveAutosave`, `saveToLibrary`, `listSaved`; `projectToPython`, `identifier`; `pythonToBlocks`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/scratch/projects.js`:
```js
export function serializeProject(p) {
  return JSON.stringify(p, (k, val) => (k.startsWith('_') ? undefined : val), 1);
}

export function loadAutosave() {
  try { const t = localStorage.getItem(AUTOSAVE_KEY); return t ? normalizeProject(JSON.parse(t)) : null; } catch { return null; }
}
export function saveAutosave(p) {
  try { localStorage.setItem(AUTOSAVE_KEY, serializeProject(p)); return true; } catch { return false; }
}
```
Giải thích: khi tuần tự hóa, mọi khóa bắt đầu bằng `_` (trạng thái chạy như `_rt`) bị loại bỏ; dự án tự lưu luôn được chuẩn hóa lại khi đọc để chống dữ liệu hỏng.

Trích đoạn 2 — `js/components/scratch/runtime.js` (bộ lập lịch, theo báo cáo đọc đầy đủ tệp):
```js
  function tick() {
    now = performance.now();
    redraw = false;
    const t0 = now;
    for (;;) {
      let ran = false;
      for (const th of threads.slice()) {
        if (th.done || th.tickWait) continue;
        ran = true;
        step(th);
      }
      if (!ran || redraw || performance.now() - t0 > WORK_MS) break;
    }
    for (const th of threads) th.tickWait = false;
    threads = threads.filter((t) => !t.done);
    emitThreads();
  }
```
Giải thích: các kịch bản chạy "đồng thời" theo kiểu hợp tác — mỗi luồng tiến một bước, vòng lặp dừng khi hết việc, cần vẽ lại hoặc dùng quá 6 ms trong khung hình.

Trích đoạn 3 — `js/components/scratch/frompy.js` (vòng `for … in range`, theo báo cáo đọc đầy đủ tệp):
```js
        if (!usesName(st.body, v) && !a2) {
          const times = start === '0' ? end : (typeof start === 'string' && typeof end === 'string' && /^-?\d+$/.test(start) && /^-?\d+$/.test(end) ? String(Number(end) - Number(start)) : B('op_sub', { A: end, B: start }));
          return [B('ct_repeat', { TIMES: times }, body)];
        }
        vars.add(v);
        const negative = typeof step === 'string' && step.trim().startsWith('-');
        const cond = negative ? B('op_not', { A: B('op_gt', { A: B('va_get', { VAR: v }), B: end }) }) : B('op_not', { A: B('op_lt', { A: B('va_get', { VAR: v }), B: end }) });
        return [B('va_set', { VAR: v, VAL: start }), B('ct_repeat_until', { COND: cond }, [...body, B('va_change', { VAR: v, VAL: step })])];
```
Giải thích: nếu biến đếm không được dùng thì vòng lặp thành "lặp lại N lần"; ngược lại tạo biến đếm, khối "lặp lại đến khi" và khối tăng biến theo bước ở cuối thân.

### Trang Trợ lý AI V-Mentor

**1. Mô tả & giao diện**

Trang `#/ai` (tiêu đề "Trợ lý AI V-Mentor") gồm nền cực quang động (`.ai-aurora`), thanh lịch sử bên trái và khung chat.

- **Thanh lịch sử**: logo quả cầu + "V-Mentor · Trợ lý học lập trình", nút "Thu gọn lịch sử", nút "Cuộc trò chuyện mới", ô "Tìm trong lịch sử…" (Esc để xóa), danh sách nhóm theo "Hôm nay", "Hôm qua", "7 ngày trước", "Cũ hơn" kèm số lượng; mỗi mục hiện biểu tượng chế độ, tiêu đề, "<chế độ> · N câu hỏi · giờ/ngày", nút "Đổi tên" và "Xóa" (hỏi xác nhận "Xóa cuộc trò chuyện?… (cả trên các thiết bị đã đồng bộ)"); chân trang "Lịch sử được đồng bộ với tài khoản của bạn." hoặc "Lịch sử lưu trên thiết bị này. Đăng nhập để đồng bộ." Trên màn hình ≤ 860px thanh lịch sử thành ngăn kéo có lớp phủ.
- **Khung chat**: tiêu đề quả cầu "V-Mentor" + nhãn chế độ; ô chọn "Chế độ trợ lý" và "Nguồn AI"; chỉ báo trạng thái nguồn. Màn hình trống: "Xin chào, mình là V-Mentor", 7 thẻ chế độ và 3 câu hỏi gợi ý của chế độ đang chọn. Tin nhắn AI có avatar quả cầu, tên nguồn trả lời (`provider · model` hoặc "AI trên trình duyệt"), nội dung Markdown, nút "Sao chép", "Tạo lại" / "Thử lại". Ô soạn: Enter gửi, Shift+Enter xuống dòng, Esc dừng, tối đa 12.000 ký tự (hiện bộ đếm khi > 2000), dòng "AI có thể sai — hãy kiểm tra lại thông tin quan trọng.", nút "Dừng" thay nút gửi khi đang trả lời, nút "Mới nhất" khi cuộn lên.
- **7 chế độ** (`AI_MODES`): Gia sư lập trình (`tutor`), Gỡ lỗi (`debugger`), Review code (`reviewer`), Giải thích thuật toán (`algorithm`), Trợ lý học tập (`learning`), Phát triển dự án (`project`), Hỏi đáp kiến thức (`knowledge`).
- **4 nguồn AI** (`PROVIDER_CHOICES`): "Tự động" (đám mây, không có thì dùng cục bộ), "AI đám mây", "Máy chủ cục bộ" (Ollama của trường), "AI trên trình duyệt" (WebGPU, tải mô hình khoảng 0,4–1 GB một lần rồi dùng ngoại tuyến).

**2. Các file tham gia**

`js/pages/ai.js`, `js/components/chat.js`, `css/pages/ai.css`; ngoài phạm vi: `js/services/ai-modes.js` (`AI_MODES`, `modeById`, `localSystemPrompt`), `js/services/ai-client.js` (`streamChat`, `fetchProviders`, `AIError`), `js/services/local-ai.js` (`isWebGPUAvailable`, `streamLocal`, `loadLocalModel`, `localStatus`, `wasDownloaded`, `onLocalStatus`), `js/services/conversations.js` (`listConversations`, `createConversation`, `getConversation`, `saveConversation`, `renameConversation`, `deleteConversation`, `deriveTitle`), `js/core/store.js` (`appState`, `bus`), `js/components/markdown.js`.

**3. Luồng xử lý từng bước**

1. `mount()` đọc `ctx.params.conversation`, trạng thái thu gọn (`localStorage['vc-ai-sidebar-collapsed']`), nội dung chuyển từ trang khác `kv 'ai:incoming'` (hạn 60 giây, đọc xong thì xóa) hoặc tham số `?mode=`, `?q=`.
2. `createChat(chatHost, { conversationId, mode, context, initialPrompt, headerStart, onConversation })`; khi tạo cuộc trò chuyện mới, URL đổi thành `#/ai/<id>` bằng `history.replaceState`.
3. `renderList()` gọi `listConversations({ query })`, nhóm theo `groupLabel(updatedAt)`; ô tìm kiếm lọc với trễ 200 ms; sự kiện `bus 'conversations:change'` làm mới danh sách.
4. Gửi câu hỏi → `send()`: tạo cuộc trò chuyện nếu chưa có, thêm tin người dùng (kèm ghi chú "Kèm mã … (N dòng) và lỗi" nếu có ngữ cảnh), đặt tiêu đề tự động từ câu hỏi đầu (`deriveTitle`), thêm tin trợ lý rỗng, lưu, gọi `generate()`.
5. `generate()`: hiện "V-Mentor đang suy nghĩ…" với khung xương; chọn nguồn — "AI trên trình duyệt" (hoặc Tự động khi không tới được máy chủ và mô hình cục bộ đã sẵn sàng) thì `streamLocal` với `localSystemPrompt(mode, context)`; ngược lại `streamChat({ messages, mode, provider, context, signal })` nhận sự kiện `meta` (nhà cung cấp, mô hình), `delta` (văn bản), `error`, `done` (báo "Bạn còn N lượt hỏi AI hôm nay." khi còn ≤ 5).
6. Nội dung được vẽ lại Markdown theo nhịp 60 ms (`throttle`) kèm con trỏ nhấp nháy; tự cuộn theo trừ khi người dùng cuộn lên.
7. Dừng (nút "Dừng" hoặc Esc) → `AbortController.abort()`, nội dung được thêm "_(Đã dừng)_"; lỗi → khung "Không nhận được câu trả lời." kèm gợi ý đổi nguồn (và gợi ý "AI trên trình duyệt" khi ngoại tuyến nếu có WebGPU).
8. Kết thúc: lưu cuộc trò chuyện, thay phần tử đang chạy bằng tin nhắn hoàn chỉnh; "Tạo lại/Thử lại" (`regenerate`) xóa nội dung tin trợ lý cuối rồi gọi `generate()` lần nữa.
9. Chọn "AI trên trình duyệt" → `maybeOfferLocalDownload()`: kiểm tra WebGPU, báo kích thước tải lần đầu, gọi `loadLocalModel()`; chỉ báo trạng thái hiện tiến độ "Đang tải mô hình N%".

**4. Hàm/lớp/API cốt lõi**

`default.mount`, `groupLabel`, `timeLabel`, `renderList`, `convItem`, `toggleSidebar`; `createChat` → `{ load, send, newConversation, setContext, setMode, focus, destroy }`, `generate`, `regenerate`, `updateStatus`, `renderEmpty`, `messageEl`, `mentorOrb`, `PROVIDER_CHOICES`; dịch vụ `streamChat`, `streamLocal`, `fetchProviders`, `listConversations`, `saveConversation`, `renameConversation`, `deleteConversation`, `AI_MODES`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/components/chat.js` (chọn nguồn và nhận luồng):
```js
    const useBrowser = provider === 'browser' || (provider === 'auto' && !appState.get().backend.reachable && localStatus().state === 'ready');
    try {
      if (useBrowser) {
        assistantMsg.provider = 'browser';
        paint();
        const system = localSystemPrompt(mode, context);
        for await (const chunk of streamLocal({ messages: history.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })), system, signal: myStream.signal })) {
          assistantMsg.content += chunk;
          paint();
        }
      } else {
        for await (const ev of streamChat({ messages: history, mode, provider, context, signal: myStream.signal })) {
          if (ev.type === 'meta') { assistantMsg.provider = ev.data.provider; assistantMsg.model = ev.data.model; paint(); }
          else if (ev.type === 'delta') { assistantMsg.content += ev.data.text || ''; paint(); }
          else if (ev.type === 'error') throw new AIError(ev.data.code, ev.data.message);
          else if (ev.type === 'done' && typeof ev.data?.remaining === 'number' && ev.data.remaining <= 5) {
            toast(`Bạn còn ${ev.data.remaining} lượt hỏi AI hôm nay.`, { type: 'warning' });
          }
        }
      }
      if (!assistantMsg.content.trim()) throw new AIError('empty', 'Mô hình không trả về nội dung. Hãy thử lại.');
```
Giải thích: cùng một vòng `for await` xử lý cả mô hình chạy trên trình duyệt lẫn máy chủ; mỗi mẩu văn bản nhận được cập nhật tin nhắn và được vẽ lại có điều tiết.

Trích đoạn 2 — `js/pages/ai.js` (nhóm lịch sử theo thời gian):
```js
    async function renderList() {
      const items = await listConversations({ query });
      if (signal.aborted) return;
      if (!items.length) {
        mount(listEl, h('div', { class: 'ai-history__empty' },
          icon(query ? 'search' : 'messages'),
          h('p', null, query ? 'Không tìm thấy cuộc trò chuyện phù hợp.' : 'Chưa có cuộc trò chuyện nào. Hãy đặt câu hỏi đầu tiên!')));
        return;
      }
      const groups = new Map(GROUPS.map((g) => [g, []]));
      for (const c of items) groups.get(groupLabel(c.updatedAt)).push(c);
      mount(listEl, [...groups.entries()].filter(([, convs]) => convs.length).map(([label, convs]) => h('section', { class: 'ai-history__group', 'aria-label': label },
        h('h3', { class: 'ai-history__label' }, h('span', null, label), h('span', { class: 'ai-history__count' }, String(convs.length))),
        convs.map(convItem))));
    }
```
Giải thích: danh sách được lọc theo từ khóa tìm kiếm rồi chia vào bốn nhóm thời gian; nhóm rỗng không được hiển thị.

### Chế độ trực quan hóa trong IDE (studio Lưu đồ / Scratch tải lười)

**1. Mô tả & giao diện**

Bộ chọn chế độ "Mã nguồn" / "Lưu đồ" / "Scratch Live" trên thanh IDE. Ở chế độ studio, khung phải là studio (`.ws-studio`), bảng kết quả chuyển xuống dưới editor thành "dock" thu gọn được; có nút "Phóng to toàn bộ bề rộng" / "Thu nhỏ (hiện lại trình soạn thảo)", nút "Thu gọn trình soạn thảo" và thanh dọc "Mã nguồn" để mở lại. Khi đang tải hiện "Đang tải Lưu đồ thuật toán…"; lỗi tải hiện "Không tải được …" với lời giải thích (ngoại tuyến hoặc đang cập nhật) và nút "Thử lại", "Về chế độ Mã nguồn". Chế độ được ghi nhớ trong bố cục (`vc-ws-layout`) hoặc chọn qua `?view=`.

**2. Các file tham gia**

`js/pages/workspace.js` (`MODES`, `STUDIO`, `setMode`, `showStudio`, `loadStudio`, `sendToEditor`, `studioGetCode`), `js/components/flowchart/index.js`, `js/components/scratch/index.js`, `css/pages/flowchart.css`, `css/pages/scratch.css`, `css/pages/ide.css`.

**3. Luồng xử lý từng bước**

1. `setMode(next)` gọi `onHide()` của studio cũ (nếu có), ghi bố cục, di chuyển bảng kết quả vào cột editor, gắn khung studio vào cột phải, gọi `showStudio(kind)`.
2. `showStudio` tạo khe chứa và gọi `loadStudio` lần đầu; các lần sau chỉ hiện khe tương ứng và gọi `onShow()` + `onCodeChange(code, lang)`.
3. `loadStudio`: `ensureCss(cfg.css)`, `import(cfg.path)`, lấy hàm `createFlowchartStudio`/`createScratchStudio`, gọi với `{ signal, getCode, onSendToEditor, onJumpToLine }`, kiểm tra `inst.el` là `Node`.
4. Mã thay đổi → `notifyStudio` (300 ms) gửi `{ code, lang }` của tệp đang mở (`studioGetCode` xác định `python`/`pyvn` theo phần mở rộng).
5. Studio gửi mã về (`onSendToEditor`) → `sendToEditor` chuyển sang Python nếu cần, mở tệp `.py`, `replaceValue` (giữ Ctrl+Z), lưu, thông báo "Đã đưa mã vào trình soạn thảo (Ctrl+Z để hoàn tác)."
6. Studio yêu cầu nhảy dòng (`onJumpToLine`) → mở lại editor nếu đang thu gọn/phóng to studio, trên di động chuyển về khung editor, rồi `editor.jumpToLine(line)`.

**4. Hàm/lớp/API cốt lõi**

`setMode`, `showStudio`, `loadStudio`, `applyLayout`, `setCollapsed`, `setStudioMax`, `setDock`, `setMobilePane`, `sendToEditor`, `studioGetCode`, `notifyStudio`; giao kèo studio `{ el, onCodeChange, onShow, onHide?, destroy }`.

**5. Trích đoạn code quan trọng**

Trích đoạn 1 — `js/pages/workspace.js`:
```js
    async function loadStudio(kind, s) {
      const cfg = STUDIO[kind];
      ensureCss(cfg.css);
      try {
        const mod = await import(cfg.path);
        const factory = mod[cfg.factory] || mod.default?.[cfg.factory] || (typeof mod.default === 'function' ? mod.default : null);
        if (typeof factory !== 'function') throw new Error(`Thiếu hàm ${cfg.factory}`);
        if (signal.aborted) return;
        const inst = factory({
          signal,
          getCode: () => studioGetCode(),
          onSendToEditor: (code) => sendToEditor(code),
          onJumpToLine: (line) => { if (window.matchMedia('(max-width: 900px)').matches) setMobilePane('editor'); if (layout.editorCollapsed || layout.studioMax) { layout.editorCollapsed = false; layout.studioMax = false; applyLayout(); } editor.jumpToLine(line); },
        });
        if (!inst || !(inst.el instanceof Node)) throw new Error('Thành phần không trả về giao diện hợp lệ');
        s.inst = inst;
        s.state = 'ready';
        mount(s.el, inst.el);
        if (mode === kind) { inst.onShow?.(); const { code, lang: l } = studioGetCode(); inst.onCodeChange?.(code, l); }
```
Giải thích: mã và CSS của từng studio chỉ được tải khi người dùng chọn chế độ đó; IDE và studio giao tiếp qua một giao kèo nhỏ gồm lấy mã, gửi mã về editor và nhảy tới dòng.

## PHẦN 4. DỮ LIỆU, CƠ SỞ DỮ LIỆU & CƠ CHẾ LƯU TRỮ

> **Ghi chú:** Phần này chứa nội dung từ backend (A_p4), cốt lõi hệ thống (B_p4) và dữ liệu trang (D_p4). Dữ liệu chi tiết của các trang IDE/Lưu đồ/Scratch/AI và danh sách khóa học sẽ được bổ sung sau.

### Tổng quan nơi lưu trữ dữ liệu (phạm vi backend, gốc dự án, tools, tests)

| Nơi lưu trữ | Dữ liệu | Thành phần quản lý | Ghi chú |
|---|---|---|---|
| SQLite `vcode_edu.db` (mặc định; có thể thay bằng MySQL/PostgreSQL qua `DATABASE_URL`) | Bảng mới `ai_usage`, `schema_meta`; 10 bảng cũ v25 được giữ nguyên | `backend/database/*`, `backend/models/ai_usage.py`, `backend/core/ratelimit.py` | Chế độ WAL (tệp `vcode_edu.db-wal`, `vcode_edu.db-shm`); bị `.gitignore` chặn |
| Bộ nhớ tiến trình backend | Hàng đợi mốc thời gian giới hạn theo phút; bộ đệm khóa công khai Google; kết quả dò Ollama (30 giây) | `MinuteRateLimiter`, `FirebaseTokenVerifier`, `OllamaProvider` | Mất khi khởi động lại; riêng cho từng worker |
| Cloud Firestore (dự án `v-code-edu`) | Hồ sơ người dùng, hội thoại AI, bảng xếp hạng, lớp học và subcollection | SDK Firebase phía frontend; bảo vệ bởi `firestore.rules` | Không có chỉ mục tùy chỉnh (`firestore.indexes.json` rỗng) |
| Cache Storage của trình duyệt | Vỏ ứng dụng, module JS/CSS, dữ liệu khóa học, thư viện CDN | `sw.js` | 3 cache: `vcode-shell-v3.1.0`, `vcode-assets-v3.1.0`, `vcode-runtime-v1` |
| `localStorage` / `sessionStorage` (khóa đọc trong phạm vi) | `vc-theme` (theme), `vc-intro-seen` (đã xem intro trong phiên) | `index.html` | Các khóa khác (ví dụ `vc-editor-theme`, `vc-ws-layout` được kiểm thử E2E nhắc tới) do frontend `js/` quản lý |
| Biến môi trường / tệp `.env` | Cấu hình, khóa API AI | `backend/core/config.py` | `.env` bị `.gitignore` chặn; chỉ `.env.example` được commit |
| Tệp JSON xuất dữ liệu cũ | `archive/legacy-v25/sqlite-export.json` (mặc định) | `backend/scripts/export_legacy_sqlite.py` | Chứa dữ liệu cá nhân, bị `.gitignore` chặn (`archive/**/sqlite-export.json`) |

### Lược đồ SQLite `vcode_edu.db`

Kết quả kiểm tra chỉ đọc (`mode=ro`) bằng `sqlite3`: 12 bảng. Chỉ hai bảng `ai_usage` và `schema_meta` do mã nguồn backend hiện tại định nghĩa và sử dụng; 10 bảng còn lại thuộc phiên bản cũ v25 — backend hiện tại chỉ liệt kê tên chúng trong `LEGACY_TABLES` để bảo vệ (không đọc/ghi). Mục đích của các bảng cũ dưới đây được **suy ra từ tên bảng/tên cột**; mã định nghĩa gốc nằm trong `archive/legacy-v25/backend/models/` (ngoài phạm vi tài liệu này).

| Bảng | Số dòng | Cột (kiểu) | Khóa / chỉ mục | Mục đích |
|---|---|---|---|---|
| `ai_usage` | 0 | `id` INTEGER PK, `day` VARCHAR(10) NOT NULL, `subject` VARCHAR(160) NOT NULL, `count` INTEGER NOT NULL, `updated_at` DATETIME NOT NULL | PK `id`; UNIQUE (`day`, `subject`) tên `uq_ai_usage_day_subject`; index `ix_ai_usage_day` | Hạn mức AI theo ngày UTC; `subject` = `user:<firebase uid>` hoặc `ip:<địa chỉ>` (mô hình `AIUsage`, migration 1) |
| `schema_meta` | 2 | `key` VARCHAR(64) PK, `value` VARCHAR(255) NOT NULL | PK `key` | Lưu `schema_version` (hiện = `1`) và `migrated_at` (dấu thời gian migration gần nhất) |
| `users` | 5 | `id` INTEGER PK, `username` VARCHAR(80), `email` VARCHAR(120), `full_name` VARCHAR(120), `password_hash` VARCHAR(256), `role` VARCHAR(30), `auth_provider` VARCHAR(30), `avatar_url` VARCHAR(300), `school_name` VARCHAR(150), `class_name` VARCHAR(80), `xp_points` INTEGER, `is_active` BOOLEAN, `created_at` DATETIME | index `ix_users_id`, `ix_users_username`, `ix_users_email` | (Cũ) tài khoản người dùng v25; không còn được backend dùng; cột `password_hash` bị loại khi xuất |
| `classrooms` | 4 | `id` INTEGER PK, `code` VARCHAR(20), `name` VARCHAR(150), `grade_subject` VARCHAR(80), `description` TEXT, `teacher_id` INTEGER, `created_at` DATETIME | FK `teacher_id` → `users.id`; index `ix_classrooms_id`, `ix_classrooms_code` | (Cũ) lớp học |
| `classroom_members` | 1 | `id` INTEGER PK, `classroom_id` INTEGER, `student_id` INTEGER, `joined_at` DATETIME | FK `classroom_id` → `classrooms.id`, `student_id` → `users.id`; index `ix_classroom_members_id` | (Cũ) thành viên lớp |
| `student_live_sessions` | 1 | `id` INTEGER PK, `student_username` VARCHAR(80), `student_name` VARCHAR(120), `class_code` VARCHAR(20), `current_problem` VARCHAR(180), `status` VARCHAR(30), `progress_percent` INTEGER, `current_code` TEXT, `error_count` INTEGER, `teacher_hint` TEXT, `updated_at` DATETIME | index `ix_student_live_sessions_id`, `ix_student_live_sessions_student_username` | (Cũ) theo dõi trực tiếp học sinh đang làm bài |
| `lessons` | 0 | `id` INTEGER PK, `slug` VARCHAR(60), `course_name` VARCHAR(120), `order_index` INTEGER, `title` VARCHAR(180), `summary` TEXT, `content_html` TEXT, `starter_code` TEXT, `difficulty` VARCHAR(20) | index `ix_lessons_id`, `ix_lessons_slug` | (Cũ) bài học |
| `lesson_progress` | 0 | `id` INTEGER PK, `user_id` INTEGER, `lesson_slug` VARCHAR(60), `completed` BOOLEAN, `updated_at` DATETIME | FK `user_id` → `users.id`; index `ix_lesson_progress_id` | (Cũ) tiến độ bài học |
| `assignments` | 3 | `id` INTEGER PK, `code` VARCHAR(40), `title` VARCHAR(180), `description` TEXT, `classroom_code` VARCHAR(20), `difficulty` VARCHAR(20), `points` INTEGER, `due_date` VARCHAR(40), `starter_code` TEXT, `test_cases_json` TEXT, `created_by` VARCHAR(80), `created_at` DATETIME | index `ix_assignments_id`, `ix_assignments_code`, `ix_assignments_classroom_code` | (Cũ) bài tập lớp |
| `submissions` | 2 | `id` INTEGER PK, `username` VARCHAR(80), `student_name` VARCHAR(120), `classroom_code` VARCHAR(20), `assignment_code` VARCHAR(40), `source_code` TEXT, `passed_tests` INTEGER, `total_tests` INTEGER, `score` INTEGER, `teacher_feedback` TEXT, `submitted_at` DATETIME | index `ix_submissions_id`, `ix_submissions_username`, `ix_submissions_classroom_code`, `ix_submissions_assignment_code` | (Cũ) bài nộp |
| `shared_snippets` | 0 | `id` INTEGER PK, `share_code` VARCHAR(32), `author` VARCHAR(80), `title` VARCHAR(150), `code` TEXT, `created_at` DATETIME | index `ix_shared_snippets_id`, `ix_shared_snippets_share_code` | (Cũ) đoạn code chia sẻ |
| `course_enrollments` | 0 | `id` INTEGER PK, `user_email` VARCHAR(120), `course_id` VARCHAR(50), `paid_amount` INTEGER, `progress_json` TEXT, `enrolled_at` DATETIME | index `ix_course_enrollments_id`, `ix_course_enrollments_user_email`, `ix_course_enrollments_course_id` | (Cũ) ghi danh khóa học |

Ghi chú: số dòng phản ánh thời điểm kiểm tra (đọc kèm tệp WAL). Kiểm thử `test_fresh_database_gets_only_new_tables` xác nhận CSDL mới tạo chỉ có `ai_usage` và `schema_meta`; `test_app_startup_does_not_touch_legacy_tables` xác nhận lược đồ, số dòng và dữ liệu các bảng cũ không đổi sau khi khởi động backend.

### Cấu hình kết nối CSDL

| Loại | URL ví dụ (`.env.example`) | Cấu hình engine (`create_db_engine`) |
|---|---|---|
| SQLite (mặc định) | để trống → `sqlite:///<gốc dự án>/vcode_edu.db` | `check_same_thread=False`, `timeout=15`; PRAGMA `foreign_keys=ON`, `journal_mode=WAL` (trừ CSDL trong bộ nhớ) |
| MySQL | `mysql+pymysql://user:pass@host:3306/vcode` (cần `pip install pymysql`; `mysql://` tự đổi thành `mysql+pymysql://`) | `pool_size=10`, `max_overflow=20`, `pool_pre_ping=True`, `pool_recycle=1800` |
| PostgreSQL | `postgresql://user:pass@host:5432/vcode` (cần `pip install psycopg2-binary`; `postgres://` tự đổi thành `postgresql://`) | như MySQL |

### Biến môi trường (`.env.example`, đọc bởi `backend/core/config.py`)

Cơ chế: `load_env()` đọc tệp `.env` ở thư mục gốc (bộ phân tích tự viết, không dùng python-dotenv; hỗ trợ `export KEY=…`, giá trị trong nháy, chú thích cuối dòng ` #`), sau đó biến môi trường thật của hệ điều hành ghi đè. `get_settings()` được lưu đệm (`lru_cache`). "Mặc định" dưới đây là giá trị trong dataclass `Settings` khi biến trống/không có; cột "Giá trị trong .env.example" là giá trị mẫu.

| Biến | Giá trị trong `.env.example` | Mặc định trong mã | Ý nghĩa / xử lý |
|---|---|---|---|
| `APP_ENV` | `development` | `development` | Tên môi trường (thông tin) |
| `LOG_LEVEL` | `INFO` | `INFO` | Mức log của logger `vcode` (chuyển thành chữ hoa) |
| `DATABASE_URL` | (trống) | `sqlite:///<BASE_DIR>/vcode_edu.db` | Chuỗi kết nối SQLite/MySQL/PostgreSQL |
| `FIREBASE_PROJECT_ID` | `v-code-edu` | `v-code-edu` | Mã dự án Firebase dùng kiểm tra `aud`/`iss` của ID token |
| `ALLOWED_ORIGINS` | (trống) | `http://localhost:5500`, `http://127.0.0.1:5500`, `http://localhost:8000`, `http://127.0.0.1:8000`, `https://v-code-edu.web.app`, `https://v-code-edu.firebaseapp.com` | Danh sách origin CORS, phân tách bằng dấu phẩy |
| `SERVE_FRONTEND` | `1` | `True` | Backend phục vụ luôn frontend tĩnh |
| `FRONTEND_DIR` | (trống) | `BASE_DIR` (thư mục gốc dự án) | Thư mục chứa `index.html` (được `resolve()`) |
| `TRUST_PROXY` | `0` | `False` | `1` khi chạy sau reverse proxy tin cậy để đọc `X-Forwarded-For`/`X-Real-IP` |
| `AI_PROVIDER_ORDER` | `gemini,openai,anthropic,ollama` | `("gemini", "openai", "anthropic", "ollama")` | Thứ tự ưu tiên khi `provider = auto` (chuyển chữ thường; mã lạ bị bỏ qua) |
| `AI_RATE_PER_MINUTE` | `12` | `12` (tối thiểu 1) | Số câu hỏi tối đa mỗi phút cho mỗi chủ thể, mỗi tiến trình |
| `AI_DAILY_LIMIT_USER` | `200` | `200` (tối thiểu 0) | Hạn mức/ngày cho người đã đăng nhập (theo uid) |
| `AI_DAILY_LIMIT_GUEST` | `30` | `30` (tối thiểu 0) | Hạn mức/ngày cho khách (theo IP); `0` chặn khách |
| `AI_MAX_OUTPUT_TOKENS` | `2048` | `2048` (tối thiểu 64) | Độ dài tối đa câu trả lời |
| `AI_TEMPERATURE` | `0.4` | `0.4` | Độ sáng tạo (gửi tới Gemini/OpenAI/Ollama; payload Anthropic không gửi trường này) |
| `AI_CONNECT_TIMEOUT` | `10` | `10.0` giây | Thời gian chờ kết nối HTTP tới nhà cung cấp |
| `AI_READ_TIMEOUT` | `60` | `60.0` giây | Thời gian chờ đọc dữ liệu |
| `AI_TOTAL_TIMEOUT` | `120` | `120.0` giây | Thời gian tối đa cho toàn bộ một lượt trả lời (`asyncio.timeout`) |
| `GEMINI_API_KEY` | (trống) | `""` | Khóa Google AI Studio; trống → Gemini không sẵn sàng |
| `GEMINI_MODEL` | `gemini-2.5-flash` | `gemini-2.5-flash` | Mô hình Gemini |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta` | như bên trái | URL gốc API Gemini |
| `OPENAI_API_KEY` | (trống) | `""` | Khóa OpenAI hoặc máy chủ tương thích |
| `OPENAI_MODEL` | `gpt-4o-mini` | `gpt-4o-mini` | Mô hình OpenAI |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | như bên trái | Có thể trỏ tới LM Studio, vLLM… |
| `OPENAI_TOKEN_PARAM` | `max_tokens` | `max_tokens` | `max_tokens` hoặc `max_completion_tokens`; giá trị khác bị đưa về mặc định |
| `ANTHROPIC_API_KEY` | (trống) | `""` | Khóa Anthropic |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | `claude-opus-5-5` | Mô hình Claude (chú thích gợi ý `claude-sonnet-5-5`, `claude-haiku-5-5` tiết kiệm hơn) |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | như bên trái | URL gốc API Anthropic |
| `OLLAMA_ENABLED` | `1` | `True` | Bật nhà cung cấp AI cục bộ |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | như bên trái | Địa chỉ máy chạy Ollama |
| `OLLAMA_MODEL` | `qwen2.5:3b` | `qwen2.5:3b` | Mô hình cục bộ; chỉ "sẵn sàng" khi đã được tải (`/api/tags`) |

Biến dùng riêng cho kiểm thử E2E (không có trong `.env.example`): `VCODE_BASE_URL` (mặc định `http://localhost:8000`) trong `tests/e2e/test_app.py`, `test_challenges.py`, `test_classroom.py`, `test_ide.py`.

### Luật bảo mật Firestore theo từng collection

Hàm dùng chung: `signedIn()` — có `request.auth` và email; `myKey()` — email viết thường làm khóa tài liệu; `isGoogleVerified()` — email đã xác minh và đăng nhập bằng `google.com`; `isTeacher()` — hồ sơ có `role` là `teacher` hoặc `admin`; `isOwnerOf(code)` — `teacher_email` của lớp là mình; `isMemberOf(code)` — `student_emails` của lớp chứa mình; `shortText(v, max)` — chuỗi dài tối đa `max`.

| Đường dẫn | get / list (đọc) | create | update | delete | Ràng buộc dữ liệu |
|---|---|---|---|---|---|
| `users/{key}` | `get`: chủ sở hữu và tài liệu không còn `password_hash`; `list`: cấm | chủ sở hữu, `email` khớp email token | (a) chủ sở hữu, tài liệu không bị khóa legacy, không đổi `email`; (b) nhánh di trú legacy: phải xóa `password_hash`, `legacy_claim == password_hash` hoặc Google đã xác minh, không đổi `role` | cấm | `roleOk()`: chỉ chọn vai trò một lần từ `none` sang `none/teacher/student`, không bao giờ tự gán `admin`; `noPrivilegedFields()`: không được ghi `password_hash`, `is_admin` |
| `users/{key}/conversations/{cid}` | chủ sở hữu (`read`) | chủ sở hữu | chủ sở hữu | chủ sở hữu | `messages` là list; `title` ≤200 ký tự |
| `leaderboard/{key}` | công khai (`read: if true`) | chủ sở hữu (`write`) | chủ sở hữu (`write`) | chủ sở hữu (`write`) | chỉ các khóa `name, xp, school, updated_at`; `xp` số nguyên 0 ≤ xp < 1 000 000; `name` ≤80 ký tự |
| `classrooms/{code}` | `get`: mọi người đã đăng nhập (biết mã lớp = quyền tra cứu); `list`: lớp mình là `teacher_email` hoặc có trong `student_emails` | `isTeacher()`, `teacher_email` là mình, `code` trùng ID tài liệu và khớp `^[A-Z0-9-]{4,20}$`, `name` ≤120 | chủ lớp (giữ nguyên `teacher_email`, `code`) hoặc `joiningSelf()` / `leavingSelf()` (chỉ đổi `student_emails`, `students`; thêm/bớt đúng một phần tử là chính mình) | chủ lớp | — |
| `classrooms/{code}/assignments/{aid}` | chủ lớp hoặc thành viên | chủ lớp | chủ lớp | chủ lớp | — |
| `classrooms/{code}/submissions/{sid}` | chủ lớp; học sinh chỉ đọc bài có `email` là mình | thành viên, `email` là mình, `sid == assignment_id + '__' + myKey()`, không có `teacher_score/teacher_note/graded_at/graded_by`, còn hạn (`deadlineOpen`) | học sinh: bài của mình, không đổi trường chấm điểm/`email`/`assignment_id`, còn hạn; hoặc chủ lớp | chủ lớp | `deadlineOpen(aid)`: `deadline_ts` của bài tập bằng 0 hoặc `request.time ≤ deadline_ts` |
| `classrooms/{code}/presence/{key}` | chủ lớp | thành viên, `key` là mình (`write`) | như create | như create | — |
| `classrooms/{code}/messages/{mid}` | chủ lớp hoặc thành viên | chủ lớp hoặc thành viên, `author_email` là mình | không cho phép (không có luật `update`) | chủ lớp hoặc tác giả | `text` ≤2000 ký tự |

Lưu ý: `docs/ARCHITECTURE.md` mô tả trường chứng minh di trú là `legacy_proof`, còn `firestore.rules` thực tế dùng `legacy_claim`. Firestore giả lập trong kiểm thử E2E không mô phỏng các luật này.

### Bộ nhớ đệm Service Worker (`sw.js`)

| Tên cache | Hằng | Nội dung | Chiến lược | Vòng đời |
|---|---|---|---|---|
| `vcode-shell-v3.1.0` | `SHELL_CACHE` | Danh sách `SHELL`: `./`, `index.html`, `manifest.json`, `data/courses/index.json`, `data/challenges.json`, `data/pyvn-keywords.json`, `vendor/jscpp`, `vendor/sqljs` (js + wasm), logo, 3 icon, toàn bộ CSS và module JS; cộng mọi `data/courses/<id>.json` phát hiện từ danh mục; các tài nguyên cùng origin không thuộc `/data/` | Precache khi `install`; phục vụ stale-while-revalidate; điều hướng network-first và ghi đè `./index.html` | Đổi theo `VERSION`; cache cũ tiền tố `vcode-` bị xóa khi `activate` |
| `vcode-assets-v3.1.0` | `ASSET_CACHE` | Tài nguyên cùng origin có đường dẫn chứa `/data/` được nạp lúc chạy | Stale-while-revalidate | Đổi theo `VERSION` |
| `vcode-runtime-v1` | `RUNTIME_CACHE` | Tệp từ `cdn.jsdelivr.net`, `cdnjs.cloudflare.com`, `fonts.googleapis.com`, `fonts.gstatic.com`, `www.gstatic.com/firebasejs/…`, `esm.run` (Pyodide, KaTeX, Firebase SDK, phông, trình nạp WebLLM theo chú thích đầu tệp) | Cache-first; nhận phản hồi `basic`/`cors` thành công, hoặc opaque chỉ khi `destination === 'script'`; lỗi mạng → thử cache, không có thì `Response.error()` | Tên cố định — được giữ lại qua các lần cập nhật ứng dụng |
| (không cache) | — | `/api/*`, yêu cầu không phải GET, host `*googleapis.com` (trừ fonts), `firebaseio.com`, `identitytoolkit`, `securetoken`, giao thức không phải http | Network-only (Service Worker không gọi `respondWith`) | — |

Header liên quan: backend trả `sw.js` với `Cache-Control: no-cache` và `Service-Worker-Allowed: /`; Firebase Hosting (`firebase.json`) đặt `no-cache` cho `/sw.js` và `public, max-age=3600` cho `**/*.@(js|css|json|wasm)`.

### Lưu trữ giới hạn lượt dùng AI

| Lớp | Nơi lưu | Khóa | Giới hạn mặc định | Đặc tính |
|---|---|---|---|---|
| Theo phút (`MinuteRateLimiter`) | Bộ nhớ tiến trình: `dict[str, deque[float]]` (mốc `time.monotonic`), bảo vệ bằng `threading.Lock` | `Principal.subject` (`user:<uid>` / `ip:<địa chỉ>`) | 12 yêu cầu / cửa sổ trượt 60 giây | Mất khi khởi động lại; mỗi worker đếm riêng; suất được hoàn lại (`release`) nếu không nhà cung cấp nào bắt đầu trả lời |
| Theo ngày (`DailyQuota`) | Bảng `ai_usage` trong CSDL | (`day` UTC dạng `YYYY-MM-DD`, `subject`) — ràng buộc duy nhất | 200 (người dùng) / 30 (khách) | Bền vững, dùng chung giữa các worker; chỉ tăng khi đã có mẩu trả lời đầu tiên; làm mới lúc 0 giờ UTC (`next_reset_iso`) |

Phản hồi khi vượt: HTTP 429, `detail.code = "rate_limited"`, header `Retry-After`; hạn mức ngày kèm `remaining: 0`, `reset_at`; hạn mức phút kèm `retry_after`.

### Bộ đệm khác trong bộ nhớ backend

| Thành phần | Dữ liệu đệm | Thời hạn |
|---|---|---|
| `FirebaseTokenVerifier._keys` | Khóa công khai RSA của Google theo `kid` | Theo `max-age` trong `Cache-Control` (tối thiểu 60 giây, mặc định 3600); buộc làm mới khi gặp `kid` lạ; dùng bản cũ nếu làm mới thất bại |
| `OllamaProvider._probe_result` | Kết quả dò `GET /api/tags` (máy chủ sống và đã có mô hình) | 30 giây (`PROBE_CACHE_SECONDS`), thời gian chờ dò 1,5 giây |
| `HttpClientHolder._client` | Một `httpx.AsyncClient` dùng chung cho mọi nhà cung cấp | Đến khi ứng dụng tắt (`registry.aclose()`) |
| `get_settings()` | Đối tượng `Settings` | Suốt tiến trình (`lru_cache`), làm mới bằng `reload_settings()` |

#### 1. Cơ sở dữ liệu IndexedDB trên trình duyệt

Định nghĩa tại `js/core/idb.js`: cơ sở dữ liệu `vcode-edu`, phiên bản `1`. Khi IndexedDB không khả dụng hoặc bị chặn, mọi thao tác chuyển sang `memoryFallback` (mỗi store là một `Map` trong RAM, mất khi tải lại trang; outbox dùng bộ đếm `seq`).

| Object store | Khóa | Chỉ mục | Nội dung lưu (theo mã nguồn) | Ai đọc/ghi |
|---|---|---|---|---|
| `kv` | Khóa ngoài (out-of-line), chuỗi | — | Cặp khóa → giá trị tùy ý (xem bảng khóa `kv` bên dưới). | `auth.js`, `progress.js`, `local-ai.js`, `markdown.js` (qua đối tượng `kv`) |
| `conversations` | keyPath `id` | `updatedAt` | `{ id, owner, title, mode, messages[], createdAt, updatedAt, autoTitle, pinned, deleted, syncedAt }`; mỗi tin nhắn `{ id?, role, content, createdAt, provider?, model?, error? }`. `owner` là `emailKey` hoặc `'guest'`. | `conversations.js`, gián tiếp `vbot.js` |
| `drafts` | keyPath `key` | — | `{ key, code, lang, updatedAt }` — bản nháp tự lưu của trình soạn thảo theo bài học/không gian làm việc (theo chú thích trong `idb.js`). Không có mã nào trong phạm vi ghi vào store này; theo tìm kiếm, nó được dùng bởi `js/components/ide.js`, `js/components/ide/files.js` (khóa `workspace:<lang>`), `js/pages/challenge.js`, `js/pages/account.js`. | Ngoài phạm vi |
| `outbox` | keyPath `seq`, tự tăng | — | Theo chú thích: `{ type, payload, createdAt, attempts }` — các thao tác chờ đồng bộ. Không có mã nào trong phạm vi (và không có kết quả tìm kiếm trong `js/` ngoài `idb.js`) ghi vào store này; mục đích sử dụng thực tế không xác định từ mã nguồn. | Không xác định từ mã nguồn |

Các khóa trong store `kv`:

| Khóa | Ý nghĩa | File |
|---|---|---|
| `profile:<emailKey>` | Bản sao hồ sơ Firestore (đã loại `password_hash`, `legacy_claim`) để hiển thị tức thì/ngoại tuyến khi đăng nhập. | `js/services/auth.js` |
| `progress:<owner>` | Tiến độ học: `{ lessons: { <id>: { at, xp } }, challenges: { <id>: { at, xp, legacy? } }, updatedAt }`; `owner` là `emailKey` hoặc `guest`. | `js/services/progress.js` |
| `legacy-import-done` | Cờ `true` đánh dấu đã nhập một lần tiến độ thử thách từ localStorage của ứng dụng cũ. | `js/services/progress.js` |
| `local-ai:model` | Mã mô hình WebLLM đã tải thành công trên thiết bị (ưu tiên dùng lại). | `js/services/local-ai.js` |
| `workspace:incoming` | `{ code, lang, at }` — đoạn mã được chuyển từ khối mã Markdown sang IDE qua nút "Mở trong IDE". | `js/components/markdown.js` |

Ngoài ra, Firebase Authentication lưu phiên đăng nhập trong IndexedDB của chính SDK khi bật "Ghi nhớ đăng nhập" (`indexedDBLocalPersistence`), và Firestore dùng bộ đệm bền `persistentLocalCache` với `persistentMultipleTabManager` (đọc ngoại tuyến, xếp hàng ghi). Tên cơ sở dữ liệu nội bộ của SDK không xác định từ mã nguồn.

#### 2. Khóa localStorage / sessionStorage trong phạm vi

| Loại | Khóa | Giá trị / ý nghĩa | File |
|---|---|---|---|
| localStorage | `vc-theme` | `'light'` / `'dark'` / `'system'` (mặc định `system`) — lựa chọn giao diện; được đọc cả trong script nội tuyến của `index.html` trước lần vẽ đầu. | `js/core/theme.js`, `index.html` |
| localStorage | `vc-api-base` | Địa chỉ máy chủ AI do người dùng tự cấu hình (ví dụ máy chủ LAN của trường), đã bỏ dấu `/` cuối; xóa khi đặt rỗng. | `js/config.js` |
| localStorage | `vc-remember` | `'1'` / `'0'` — "Ghi nhớ đăng nhập" (mặc định coi là bật nếu khác `'0'`). | `js/services/auth.js` |
| localStorage | `vc-vbot-pos` | JSON `{ x, y }` — vị trí robot V-Bot dưới dạng tỉ lệ so với chiều rộng/chiều cao cửa sổ. | `js/components/vbot.js` |
| localStorage | `vc-vbot-greeted` | `'1'` khi bong bóng chào của robot đã hiển thị trên thiết bị. | `js/components/vbot.js` |
| localStorage (chỉ đọc) | `vcode_completed_challenges` | Mảng id thử thách đã hoàn thành của ứng dụng cũ; chỉ nhận các id dạng `stage-<số>` khi nhập một lần. | `js/services/progress.js` |
| sessionStorage | `vc-intro-seen` | `'1'` — đã xem hiệu ứng mở đầu trong phiên hiện tại. | `index.html` |

#### 3. Cấu trúc tài liệu Firestore được đọc/ghi bởi các dịch vụ trong phạm vi

**3.1. `users/{emailKey}` — hồ sơ người dùng** (`js/services/auth.js`, `js/services/classroom.js`, `js/services/progress.js`)

| Trường | Kiểu / nguồn | Ghi chú |
|---|---|---|
| `email` | chuỗi, chữ thường | Từ Firebase Auth. |
| `username` | chuỗi | Phần trước `@`, chỉ giữ `[a-z0-9_]`, mặc định `hocvien`. |
| `full_name` | chuỗi | `displayName` hoặc phần trước `@`, mặc định "Học viên V-Code". |
| `role` | `'none'` / `'teacher'` / `'student'` (giao diện còn nhận nhãn `'admin'`) | Mặc định `'none'`; đổi bằng `chooseRole`. |
| `auth_provider` | chuỗi | `providerId` đầu tiên bỏ hậu tố `.com` (ví dụ `password`, `google`). |
| `school_name`, `class_name` | chuỗi | ≤ 120 và ≤ 40 ký tự khi ghi qua `chooseRole`. |
| `avatar_url` | chuỗi | Ảnh đại diện (từ Google nếu có). |
| `uid` | chuỗi | UID Firebase Auth, được bổ sung nếu thiếu. |
| `created_at`, `updated_at` | `serverTimestamp()` | |
| `xp_legacy` | số | Sao chép từ trường `xp` của ứng dụng cũ (một lần); cộng vào tổng XP. |
| `xp` | số (cũ) | Chỉ được đọc để tạo `xp_legacy`. |
| `progress.lessons.<id>`, `progress.challenges.<id>` | `{ at: number(ms), xp: number }` | Ghi từng trường bằng `FieldPath('progress', kind, id)` kèm `updated_at`. |
| `password_hash` | chuỗi (cũ) | Hash mật khẩu của ứng dụng cũ; luôn bị xóa khi di trú hoặc khi đăng nhập (`deleteField`), không bao giờ đưa vào `appState`. |
| `legacy_claim` | chuỗi (tạm thời) | "Bằng chứng" mật khẩu gửi lên để quy tắc so khớp với `password_hash`; bị xóa ngay sau khi di trú thành công. |
| `migrated_at` | `serverTimestamp()` | Thời điểm di trú. |
| `claimed_via` | `'google'` | Khi tài liệu cũ được nhận bởi tài khoản Google đã xác minh. |

Collection con **`users/{emailKey}/conversations/{id}`** (`js/services/conversations.js`): `{ title, mode, pinned, createdAt, updatedAt, messages: [{ id, role, content (≤ 16000 ký tự), createdAt, provider, model, error (≤ 500 ký tự) }] }` — tối đa 80 tin nhắn cuối.

**3.2. `leaderboard/{emailKey}` — bảng xếp hạng** (`js/services/progress.js`): `{ name (≤ 80 ký tự), xp (số nguyên ≥ 0), school (≤ 120 ký tự), updated_at: serverTimestamp() }`. Đọc bằng `orderBy('xp', 'desc')` + `limit(20)` (mặc định), trả thêm `rank` và `key`.

**3.3. `classrooms/{CODE}` — lớp học** (`js/services/classroom.js`, mô hình `schema: 2`)

| Đường dẫn | Trường |
|---|---|
| `classrooms/{CODE}` | `code`, `name` (≤ 120), `grade_subject` (≤ 80), `description` (≤ 1000), `teacher_email` (emailKey), `teacher_name`, `student_emails` (mảng emailKey), `students` (mảng `{ email, full_name, joined_at }`), `schema: 2`, `created_at`. Lớp cũ có thể còn `assignments`, `submissions` (mảng nhúng), `live_sessions` — bị xóa khi di trú. |
| `.../assignments/{id}` | `id`, `title` (≤ 160), `description` (≤ 8000), `language` (mặc định `python`), `starter_code` (≤ 20000), `test_cases` (≤ 20 × `{ input, expected, hidden }`), `deadline_ts`, `points: 10`, `created_at`, `updated_at`, `legacy?`. |
| `.../submissions/{assignmentId}__{emailKey}` | `assignment_id`, `email`, `full_name`, `code` (≤ 50000), `score`, `passed`, `total`, `submitted_at`, và khi giáo viên chấm: `teacher_score` (0–10, 2 chữ số thập phân), `teacher_note` (≤ 2000), `graded_at`, `graded_by`; `legacy?`. |
| `.../presence/{emailKey}` | `name`, `status`, `task` (≤ 160), `updated_at` (ms). |
| `.../messages/{autoId}` | `author_email`, `author_name`, `role`, `text` (≤ 2000), `created_at` (ms); đọc 100 tin mới nhất theo `created_at`. |

#### 4. Chiến lược đồng bộ, hợp nhất và xử lý xung đột

| Dữ liệu | Chiến lược | Chi tiết theo mã |
|---|---|---|
| Hồ sơ | Bộ đệm trước, máy chủ sau, theo dõi thời gian thực | Hiển thị từ `kv['profile:*']`, sau đó `ensureProfile` + `onSnapshot`; bản vá chỉ bổ sung trường thiếu, không ghi đè dữ liệu cũ. |
| Tiến độ | Hợp (union) không xung đột, ghi mức trường | `mergeInto` giữ mọi mục đã hoàn thành, lấy `at` sớm nhất; chỉ đẩy lên mây những mục mây còn thiếu; XP luôn suy ra từ danh sách mục + `xp_legacy`; tiến độ khách nhập vào tài khoản khi đăng nhập. |
| Bảng xếp hạng | Ghi đè toàn tài liệu, debounce 2,5 giây | Tính lại `xp` từ tiến độ hiện tại mỗi lần. |
| Hội thoại AI | Ghi sau thắng theo `updatedAt`, bia mộ khi xóa | Gom thay đổi 1,5 giây/cuộc; hợp nhất đầy đủ khi đăng nhập hoặc có mạng lại (debounce 800 ms); hội thoại khách có tin nhắn được chuyển chủ sở hữu. |
| Ghi Firestore khi ngoại tuyến | Hàng đợi của SDK | Bộ đệm bền xếp hàng các `setDoc/updateDoc`; khi có mạng, `main.js` chờ `waitForPendingWrites` (≤ 15 giây) để hiển thị "Đang đồng bộ". |
| Hiện diện lớp học | Throttle 15 giây, bỏ qua lỗi | Không cần đồng bộ lại khi ngoại tuyến. |
| Lớp học kiểu cũ | Di trú một lần bởi giáo viên chủ lớp | `writeBatch` với `merge: true`, sau đó xóa trường mảng cũ. |

#### 5. Ghi chú bảo mật

- **Không có khóa AI ở frontend**: `js/config.js` ghi rõ "Never put AI provider keys here — they live only in the backend's environment variables."; `ai-client.js` chỉ gửi Firebase ID token (`Authorization: Bearer …`) tới backend; khung chat V-Bot hiển thị "Khóa API nằm an toàn trên máy chủ".
- **Cấu hình Firebase công khai**: `FIREBASE_CONFIG.apiKey` chỉ dùng để định danh dự án; quyền truy cập được bảo vệ bởi Firebase Auth và Firestore Security Rules (`firestore.rules`).
- **emailKey**: khóa tài liệu = email chữ thường, ký tự ngoài `[a-z0-9@._-]` thay bằng `_`; giống hệt hàm `docKey()` cũ để dữ liệu ánh xạ 1:1.
- **Di trú qua `legacy_claim`**: trình duyệt không đọc hash cũ (quy tắc ẩn tài liệu còn `password_hash`); nó gửi các bằng chứng SHA-256(`vcode_salt_2026_` + mật khẩu) / Base64(`vc_` + mật khẩu) và quy tắc phía máy chủ so khớp `legacy_claim` với `password_hash` (dòng 59–60 của `firestore.rules`: `request.resource.data.get('legacy_claim', '') == resource.data.password_hash || isGoogleVerified()`). Tài khoản Auth vừa tạo bị xóa (rollback) nếu không khớp. Mọi hash cũ được xóa sau khi di trú; mật khẩu mới do Firebase Authentication quản lý và không bao giờ được lưu trong cơ sở dữ liệu của ứng dụng.
- **Chống chiếm tài khoản cũ**: `register()` xóa tài khoản vừa tạo nếu email đã có tài liệu cũ còn `password_hash` (lỗi `app/legacy-account-exists`).
- **Cô lập mã học sinh**: mọi ngôn ngữ chạy trong Web Worker (không truy cập DOM/lưu trữ/phiên của ứng dụng); HTML chạy trong iframe `sandbox` không có `allow-same-origin`; thông điệp từ iframe được xác thực bằng `nonce` và `e.source`.
- **Chống XSS**: `h()` luôn tạo text node; `markdown()` thoát mọi văn bản và chỉ cho phép liên kết `http(s)`, `mailto`, `#` hoặc đường dẫn tương đối không chứa `..`; `highlight()` luôn trả HTML đã thoát.
- **Token**: `getIdToken()` tự đăng xuất khi token hết hạn (`auth/user-token-expired`) hoặc tài khoản bị vô hiệu hóa.
- **Kiểm tra đầu vào**: `loadCourse` chỉ chấp nhận id `^[a-z0-9-]+$`; tên tệp dự án Python phải khớp `^[\w-][\w.-]{0,63}$`; dữ liệu ghi vào Firestore được cắt độ dài (tiêu đề, mô tả, mã, nhận xét…).

### Cấu trúc dữ liệu Firestore của Lớp học

Nguồn: `js/services/classroom.js` (mô hình dữ liệu "v2"; quyền truy cập được kiểm tra phía máy chủ bằng `firestore.rules`, nằm ngoài phạm vi phần này). Mã lớp được chuẩn hóa bằng `normCode()` (cắt khoảng trắng, chuyển in hoa, chỉ giữ `A–Z`, `0–9`, `-`). Khóa người dùng (`u.key`, `emailKey`) là khóa email do `js/services/firebase.js` tạo.

**Sơ đồ tổng quát**

```
users/{userKey}                       (cập nhật vai trò, hồ sơ)
classrooms/{CODE}                     (tài liệu lớp)
├── assignments/{assignmentId}        (bài tập)
├── submissions/{assignmentId}__{emailKey}   (bài nộp: 1 tài liệu / học sinh / bài)
├── presence/{emailKey}               (trạng thái trực tuyến)
└── messages/{autoId}                 (thảo luận)
leaderboard/{…}                       (chỉ đọc ở sảnh Đấu trường, qua progress.js)
```

**Tài liệu `classrooms/{CODE}`** (tạo bởi `createClass()`)

| Trường | Kiểu | Ý nghĩa / ràng buộc |
|---|---|---|
| `code` | string | Mã lớp, dạng `VC` + 4 ký tự từ bảng `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sinh bằng `crypto.getRandomValues`, thử lại tối đa 5 lần nếu trùng). Cũng là ID tài liệu. |
| `name` | string | Tên lớp, tối đa 120 ký tự. |
| `grade_subject` | string | Môn/khối, tối đa 80 ký tự. |
| `description` | string | Mô tả, tối đa 1 000 ký tự. |
| `teacher_email` | string | Khóa người dùng của giáo viên (dùng để truy vấn lớp của giáo viên). |
| `teacher_name` | string | Tên hiển thị giáo viên. |
| `student_emails` | array<string> | Danh sách khóa học sinh (truy vấn `array-contains` cho học sinh; thêm bằng `arrayUnion`, gỡ bằng `arrayRemove`). |
| `students` | array<object> | Mỗi phần tử `{ email, full_name, joined_at }` (`joined_at` là mili giây). Danh sách lớp thực tế (`rosterOf`) chỉ lấy các mục có email còn nằm trong `student_emails`. |
| `schema` | number | `2` (cấu trúc mới). |
| `created_at` | timestamp | `serverTimestamp()`. |
| `assignments`, `submissions`, `live_sessions` | (cũ) | Chỉ có ở lớp dữ liệu cũ; `migrateLegacyClass()` (giáo viên chủ lớp) chuyển sang bộ sưu tập con rồi xóa các trường này bằng `deleteField()` và đặt `schema: 2`. |

`updateClass()` chỉ cho phép sửa `name`, `grade_subject`, `description`. `deleteClass()` xóa lần lượt 4 bộ sưu tập con (`assignments`, `submissions`, `presence`, `messages`, mỗi batch tối đa 400 tài liệu) rồi xóa tài liệu lớp.

**Bộ sưu tập con `assignments/{id}`** (ghi bởi `saveAssignment()`; ID mặc định `asg_<thời gian base36><4 ký tự ngẫu nhiên>`)

| Trường | Kiểu | Ý nghĩa / ràng buộc |
|---|---|---|
| `id` | string | Trùng ID tài liệu. |
| `title` | string | Tối đa 160 ký tự. |
| `description` | string | Đề bài Markdown, tối đa 8 000 ký tự. |
| `language` | string | Mặc định `python`; giao diện cho chọn `python`, `pyvn`, `cpp`, `c`, `javascript` (`LANG_OPTIONS`). |
| `starter_code` | string | Mã khởi tạo, tối đa 20 000 ký tự. |
| `test_cases` | array<object> | Tối đa 20 phần tử `{ input: string, expected: string, hidden: boolean }`. |
| `deadline_ts` | number | Hạn nộp (mili giây); `0` = không giới hạn. |
| `points` | number | Luôn `10` (thang điểm 10). |
| `created_at`, `updated_at` | number | Mili giây (`Date.now()`). |
| `legacy` | boolean | `true` với bài được chuyển từ dữ liệu cũ. |

`deleteAssignment()` xóa bài tập và mọi bài nộp có `assignment_id` tương ứng trong một batch. `duplicateAssignment()` tạo bản sao có tiêu đề "… (bản sao)".

**Bộ sưu tập con `submissions/{assignmentId}__{emailKey}`** (ghi bởi `submitAssignment()` với `merge: true`, nên mỗi học sinh chỉ có một bài nộp cho mỗi bài tập – lần nộp sau ghi đè)

| Trường | Kiểu | Ý nghĩa / ràng buộc |
|---|---|---|
| `assignment_id` | string | ID bài tập. |
| `email` | string | Khóa học sinh. |
| `full_name` | string | Tên học sinh. |
| `code` | string | Mã nguồn đã nộp, tối đa 50 000 ký tự. |
| `score` | number | Điểm tự động thang 10 (`score10` của bộ chấm; theo giao diện: tỉ lệ test đạt × 10). |
| `passed`, `total` | number | Số test đạt / tổng số test. |
| `submitted_at` | number | Mili giây. |
| `teacher_score` | number | Điểm giáo viên (ghi bởi `gradeSubmission()`, kẹp 0–10, làm tròn 2 chữ số thập phân). |
| `teacher_note` | string | Nhận xét, tối đa 2 000 ký tự. |
| `graded_at` | number | Thời điểm chấm (mili giây). |
| `graded_by` | string | Khóa giáo viên chấm. |
| `legacy` | boolean | Có ở bài nộp chuyển từ dữ liệu cũ. |

Điểm hiệu lực được dùng trên giao diện: `effScore = teacher_score ?? score`; bài "đã chấm" khi `teacher_score` khác `undefined`/`null` (`isGraded`). Giáo viên nghe toàn bộ bài nộp (`watchSubmissions`), học sinh chỉ nghe bài của mình (`where('email', '==', key)`).

**Bộ sưu tập con `presence/{emailKey}`** (ghi bởi `createPresence(code).beat(status, task)`, được điều tiết `throttle` 15 000 ms; lỗi ngoại tuyến được bỏ qua)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `name` | string | Tên học sinh. |
| `status` | string | `online`, `idle`, `coding`, `error`, `done` (giao diện hiển thị "Đang trực tuyến", "Đang làm bài", "Đang gặp lỗi", "Vừa làm xong"). |
| `task` | string | Tên bài đang làm, tối đa 160 ký tự. |
| `updated_at` | number | Mili giây; học sinh được coi là trực tuyến nếu `now − updated_at < 120 000` và `status ≠ 'idle'` (`ONLINE_WINDOW`). |

**Bộ sưu tập con `messages/{autoId}`** (ghi bởi `postMessage()` bằng `addDoc`; đọc bằng `orderBy('created_at', 'desc')` + `limit(100)` rồi đảo thứ tự)

| Trường | Kiểu | Ý nghĩa |
|---|---|---|
| `author_email` | string | Khóa người viết. |
| `author_name` | string | Tên người viết. |
| `role` | string | Vai trò người viết (`teacher`, `student`, `admin`…). |
| `text` | string | Nội dung (đã cắt khoảng trắng), tối đa 2 000 ký tự. |
| `created_at` | number | Mili giây. |

**Tài liệu `users/{userKey}`** (chỉ các trường được ghi trong phạm vi)

- `chooseRole()` (classroom service): `role` (`teacher` hoặc `student`), `school_name` (≤ 120), `class_name` (≤ 40), `updated_at` (`serverTimestamp`).
- `account.js` (Lưu hồ sơ): `full_name` (≤ 80), `school_name` (≤ 120), `class_name` (≤ 40), `avatar_url` (Data URL JPEG 160 px hoặc chuỗi rỗng), `updated_at`.

### Khóa lưu trữ cục bộ trong phạm vi

**localStorage**

| Khóa | Ghi/đọc tại | Nội dung |
|---|---|---|
| `vc-arena-daily` | `js/pages/arena/core.js` (`dailyChallenge`) | JSON `{ date: 'YYYY-MM-DD', owner: <userKey hoặc 'guest'>, id: <mã thử thách> }` – thử thách hôm nay đã chọn. |
| `vc-api-base` | Ghi gián tiếp từ tab "Giao diện & AI" của `account.js` qua `setApiBase()` (`js/config.js`) | Địa chỉ máy chủ V-Code tùy chỉnh; nút "Mặc định" xóa khóa. |
| `vc-theme` | Ghi gián tiếp từ `account.js` qua `setTheme()` (`js/core/theme.js`) | `light`, `dark` hoặc `system`. |

**IndexedDB – kho khóa–giá trị `kv`** (`js/core/idb.js`)

| Khóa | Nơi dùng | Nội dung |
|---|---|---|
| `learn:last:<userKey hoặc guest>` | `learn/shared.js` (`rememberLesson`, `lastOpenedLesson`) | `{ course, lesson, at }` – bài mở gần nhất cho thẻ "Tiếp tục học". |
| `ai:incoming` | `home.js` (ô hỏi V-Mentor) | `{ prompt, mode, at }` – câu hỏi chuyển sang trang Trợ lý AI. |
| `attempts:lesson:<lessonId>` | `lesson.js` → `buildPracticePage` | Số lần nộp chưa đạt của bài học (mở lời giải ở lần thứ 3). |
| `attempts:challenge:<challengeId>` | `challenge.js` | Số lần nộp chưa đạt của trận (`SOLUTION_AFTER = 3`). |
| `prism:code-lang` | `prism/index.js` | Ngôn ngữ mã nguồn đã chọn (`python`, `cpp`, `javascript`). |
| `workspace:incoming` | `prism/index.js` (nút "Mở trong IDE") | `{ code, lang, at }` – đoạn mã chuyển sang IDE. |

**IndexedDB – kho bản nháp** (khóa được truyền làm `draftKey` cho bàn làm việc; việc ghi nháp do `js/components/ide.js` đảm nhiệm, ngoài phạm vi): `lesson:<lessonId>`, `challenge:<challengeId>` (đọc lại bằng `IDE.loadDraft` hoặc `idb.get('drafts', key)`), `class:<CODE>:<assignmentId>`.

**Các kho khác được thao tác trong `account.js`**: `idb.all('drafts')`, `idb.all('conversations')` (xuất JSON), `idb.clear('drafts')`, `idb.clear('conversations')` (xóa cục bộ); Cache API – xóa các bộ đệm có tên chứa `runtime`.

**Bộ nhớ trong phiên**: `shell.js` giữ `cache = { key, list, at }` danh sách lớp trong 60 giây (`getMyClasses`), bị xóa khi tạo/tham gia/rời/xóa/sửa lớp (`invalidateClasses`).

### Cách sử dụng dữ liệu thử thách (`data/challenges.json`)

- Được nạp qua `loadChallenges()` (`js/services/content.js`, có đệm theo đường dẫn) ở `home.js`, `learn.js`, `challenges.js`, `challenge.js`.
- Cấu trúc gốc: `{ version, worlds, challenges }`. Tệp hiện có 5 bản đồ và 100 thử thách (60 Python, 20 C, 20 C++; theo hạng: D 20, C 20, B 20, A 20, S 15, BOSS 5).
- `worlds[]`: `{ id, name, lang, description, … }` – 1 "Python Khởi Hành", 2 "Python Chiến Thuật", 3 "Python Thuật Toán", 4 "Pháo Đài Ngôn Ngữ C", 5 "Đỉnh Cao C++ HSG". Màu mỗi bản đồ lấy từ `WORLD_HUE`, tranh từ `WORLD_SCENE[id]`.
- `challenges[]`: `{ id, stage, world, lang, rank, boss, xp, title, task, starter, solution, hints, tests, tags }`; `tests[]` gồm `{ input, expected, hidden }`.
- Sử dụng: trang chủ đếm tổng số và số trùm; trang Học đếm số thử thách đã giải; sảnh tính thống kê (`computeStats`), lọc, chọn thử thách hôm nay, hiển thị bản đồ/trùm/huy hiệu; trang trận lấy trận theo `id`, trận trước/sau theo thứ tự mảng, hiển thị test công khai và ẩn số liệu test ẩn, truyền `tests` cho bàn làm việc chấm, mở `solution` sau khi thắng hoặc 3 lần thua. Tiêu đề hiển thị bỏ tiền tố "Chặng N:" bằng `cleanTitle()`.
- Tiến độ thử thách lưu trong `progress.challenges[id] = { xp, at, … }` qua `markComplete('challenges', id, xp)` (ngoài phạm vi); bảng xếp hạng đọc bộ sưu tập Firestore `leaderboard` qua `loadLeaderboard(10)`.

### Cách sử dụng dữ liệu khóa học (`data/courses/*.json`)

- `loadCatalog()` đọc `data/courses/index.json` (`{ version, generated_at, courses, tracks }`) và sắp khóa theo thứ tự `python, pyvn, web, c, cpp, ai`.
- `courses[]`: `{ id, title, subtitle, lang, level, track, accent, tags, description, chapters_count, lessons_count, xp_total }`. Hiện có 6 khóa: Python cơ bản (30 bài, 5 chương), Python Tiếng Việt (12 bài, 3 chương), HTML & CSS: Thiết kế web (16 bài, 4 chương), Lập trình C (16 bài, 4 chương), C++ & Thuật toán (20 bài, 5 chương), Nhập môn AI & Khoa học dữ liệu (10 bài, 3 chương) – tổng 104 bài.
- `tracks[]`: `{ id, title, description, status, courses }`; 4 lộ trình `available` (programming, web, algorithms, ai) và 5 lộ trình `roadmap` (ml-dl, data-science, cybersecurity, robotics-iot, automation). `learn.js` dựng bản đồ lộ trình và khối "Sắp ra mắt"; `home.js` dựng roadmap cảnh 6; `course.js` lấy tên lộ trình.
- `loadCourse(id)` đọc `data/courses/<id>.json` (mã được kiểm tra bằng regex `^[a-z0-9-]+$`), gồm `chapters[]` → `{ id, title, summary, lessons[] }`; các trường bài học được dùng trong phạm vi: `id`, `title`, `theory`, `task`, `hints`, `solution`, `starter`, `tests`, `checks`, `prism`, `xp`, `difficulty` (`easy`/`medium`/`hard` → "Cơ bản"/"Trung bình"/"Nâng cao").
- `findLesson(course, lesson)` làm phẳng các bài để xác định bài trước/sau, chỉ số và tổng số bài.
- Tiến độ bài học lưu trong `progress.lessons[lessonId] = { xp, at, … }`; số bài xong của một khóa đếm bằng tiền tố `<courseId>-` của mã bài.

### Danh mục chủ đề/thuật toán V-Prism (`js/pages/prism/catalog.js`)

5 nhóm: `linear` – Cấu trúc tuyến tính (LIN), `algorithms` – Sắp xếp & tìm kiếm (ALG), `trees` – Cây (TRE), `graphs` – Đồ thị (GRA), `techniques` – Kỹ thuật thiết kế (TEC). Tổng cộng 14 chủ đề, 41 thuật toán. Cột "Bộ vẽ" lấy từ trường `renderer` trong các tệp `topics/*.js`.

| # | Chủ đề (`id`) | Nhóm | Thuật toán (`id` – tên trong danh mục) | Bộ vẽ |
|---|---|---|---|---|
| 1 | Mảng (`arrays`) | Cấu trúc tuyến tính | `access` – Truy cập & duyệt; `insert` – Chèn phần tử; `delete` – Xóa phần tử | `cells` |
| 2 | Danh sách liên kết (`linked-list`) | Cấu trúc tuyến tính | `insert` – Chèn nút; `delete` – Xóa & tìm kiếm; `reverse` – Đảo ngược | `list` |
| 3 | Ngăn xếp & Hàng đợi (`stack-queue`) | Cấu trúc tuyến tính | `stack` – Ngăn xếp (LIFO); `queue` – Hàng đợi (FIFO); `brackets` – Kiểm tra dấu ngoặc | `stackqueue` |
| 4 | Bảng băm (`hash-table`) | Cấu trúc tuyến tính | `chaining` – Xâu ngăn cách; `probing` – Dò tuyến tính | `hash` |
| 5 | Sắp xếp (`sorting`) | Sắp xếp & tìm kiếm | `bubble` – Nổi bọt; `selection` – Chọn; `insertion` – Chèn; `merge` – Trộn; `quick` – Nhanh; `counting` – Đếm | `bars` |
| 6 | Tìm kiếm (`searching`) | Sắp xếp & tìm kiếm | `linear` – Tuần tự; `binary` – Nhị phân | `cells` |
| 7 | Cây nhị phân (`binary-tree`) | Cây | `preorder` – Duyệt trước; `inorder` – Duyệt giữa; `postorder` – Duyệt sau; `level` – Theo tầng | `tree` |
| 8 | Cây nhị phân tìm kiếm (`bst`) | Cây | `insert` – Chèn; `search` – Tìm kiếm; `delete` – Xóa | `tree` |
| 9 | Heap & hàng đợi ưu tiên (`heap`) | Cây | `build` – Xây heap; `insert` – Chèn & lấy max; `heapsort` – Heap sort | `tree` |
| 10 | Đồ thị & đường đi ngắn nhất (`graph`) | Đồ thị | `representation` – Biểu diễn; `dijkstra` – Dijkstra | `graph` |
| 11 | Duyệt theo chiều rộng (`bfs`) | Đồ thị | `bfs` – BFS | `graph` |
| 12 | Duyệt theo chiều sâu (`dfs`) | Đồ thị | `dfs` – DFS | `graph` |
| 13 | Đệ quy (`recursion`) | Kỹ thuật thiết kế | `factorial` – Giai thừa; `fibonacci` – Fibonacci; `hanoi` – Tháp Hà Nội | `calltree` (giai thừa, Fibonacci), `hanoi` (Tháp Hà Nội) |
| 14 | Quy hoạch động (`dp`) | Kỹ thuật thiết kế | `fib-memo` – Fibonacci có nhớ; `fib-table` – Fibonacci lập bảng; `knapsack` – Cái túi 0/1; `lcs` – LCS; `coin-change` – Đổi tiền | `calltree` (Fibonacci có nhớ), `table` (4 thuật toán còn lại) |

Số thuật toán theo nhóm: Cấu trúc tuyến tính 11, Sắp xếp & tìm kiếm 8, Cây 10, Đồ thị 4, Kỹ thuật thiết kế 8.

**Độ phức tạp trung bình khai báo trong mã (trường `complexity.avg`)**

| Chủ đề | Thuật toán → `complexity.avg` |
|---|---|
| Mảng | Truy cập & duyệt: O(n) duyệt; Chèn: O(n); Xóa: O(n) |
| Danh sách liên kết | Chèn nút: O(n); Xóa & tìm kiếm: O(n); Đảo ngược: O(n) |
| Ngăn xếp & Hàng đợi | Ngăn xếp: O(1); Hàng đợi: O(1); Kiểm tra dấu ngoặc: O(n) |
| Bảng băm | Chaining: O(1 + α); Dò tuyến tính: O(1) khi α nhỏ |
| Sắp xếp | Nổi bọt, Chọn, Chèn: O(n²); Trộn, Nhanh: O(n log n); Đếm: O(n + k) |
| Tìm kiếm | Tuần tự: O(n); Nhị phân: O(log n) |
| Cây nhị phân | 4 cách duyệt: O(n) |
| Cây nhị phân tìm kiếm | Chèn, Tìm kiếm, Xóa: O(log n) |
| Heap | Xây heap: O(n); Chèn & lấy max: O(log n); Heap sort: O(n log n) |
| Đồ thị | Biểu diễn: "Ma trận kề: O(V²) bộ nhớ"; Dijkstra: O((V + E) log V) |
| BFS / DFS | O(V + E) |
| Đệ quy | Giai thừa: O(n); Fibonacci: O(φⁿ); Tháp Hà Nội: O(2ⁿ) |
| Quy hoạch động | Fibonacci có nhớ: O(n); Fibonacci lập bảng: O(n); Cái túi 0/1: O(n·W); LCS: O(m·n); Đổi tiền: O(S·k) |

**Định dạng dữ liệu vào chính của trình phát** (từ các tệp `topics/*.js` và `engine.js`)

- Mảng số: chuỗi số cách nhau bằng dấu cách/phẩy/chấm phẩy, kiểm tra bằng `parseNumberList()` (ví dụ sắp xếp: 2–14 số nguyên 1..99; sắp xếp đếm: 0..9; tìm kiếm: 2–16 số 0..999).
- Cây nhị phân: danh sách theo tầng, `null`/`x`/`-`/`_` là vị trí trống, tối đa 15 vị trí, gốc không được rỗng (`parseLevelOrder`).
- Cây nhị phân tìm kiếm: 1–12 khóa phân biệt 0..99.
- Đồ thị: danh sách cạnh vô hướng dạng `A-B:4` hoặc `A-B`, đỉnh A–H, trọng số 0..99, tối đa 16 cạnh, không cạnh lặp/khuyên (`parseGraph`); mặc định `A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, C-E:10, D-E:2, D-F:6, E-F:3`; đỉnh xuất phát là một chữ cái A–H.
- Bảng băm: số ô `m` từ 3 đến 13 (mặc định 7).
- Mỗi lần chạy sinh tối đa `MAX_FRAMES = 3000` khung `{ state, line, msg, vars }`.

## PHẦN 5. DANH MỤC HÌNH ẢNH, ICON & ĐỒ HỌA

> **Ghi chú:** Phần này chứa hình ảnh từ cốt lõi (B_p5) và dữ liệu trang (D_p5). Danh sách đầy đủ icon, logo và đồ họa sinh từ code của trang IDE/Chat/Prism sẽ được bổ sung sau. Xem chi tiết tại mục 2.2 (file E_p2.md) để xem danh sách assets.

#### 1. Bảng tổng hợp đồ họa sinh bằng mã

| Tên đồ họa | File tạo | Kỹ thuật | Vị trí hiển thị |
|---|---|---|---|
| Bộ biểu tượng giao diện (105 biểu tượng) | `js/components/icons.js` (kiểu nét trong `css/components.css` → `.icon`) | SVG nội tuyến 24×24, `viewBox="0 0 24 24"`, chỉ có path/shape dạng nét (`stroke: currentColor`, `stroke-width: 1.8`, đầu nét tròn) nên tự đổi màu theo chữ; tạo bằng `icon()` (phần tử DOM qua `s()`) hoặc `iconHTML()` (chuỗi HTML) | Toàn ứng dụng: thanh điều hướng, ngăn kéo, menu tài khoản, viên trạng thái, toast, modal, hộp thoại đăng nhập, khung chat V-Bot, khối mã Markdown |
| Biểu tượng Google nhiều màu | `js/components/icons.js` (mục `google`) | SVG 4 path tô màu cố định `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`, `stroke="none"` | Nút "Tiếp tục với Google" / "Đăng ký với Google" trong hộp thoại xác thực |
| Robot V-Mentor | `js/components/vbot.js` → `robotSvg(idPrefix)`; chuyển động trong `css/vbot.css` | SVG `viewBox="0 0 120 132"` dựng bằng `innerHTML`, 3 `linearGradient` (thân `#8b9cff → #5b5bf0 → #4338ca`, đầu `#ffffff → #dfe5ff`, kính `#1b2160 → #0b0f33`) + 2 `radialGradient` (mắt `#e0fbff → #5eead4 → #06b6d4`, bóng đèn `#fff → #f0abfc → #c026d3`); các nhóm riêng `vbot__antenna`, `vbot__arm--l/r`, `vbot__head`, `vbot__eyes`/`vbot__eye`, `vbot__mouth`, `vbot__heart`, `vbot__shadow`; tiền tố id riêng cho mỗi bản (`vbm`, `vbp`, `vbx…`) tránh trùng gradient; mắt dịch theo con trỏ bằng JS (`transform: translate`) | Nút robot nổi trên mọi trang, avatar ở đầu khung chat nhanh, avatar cạnh mỗi tin nhắn AI |
| Bong bóng chào / huy hiệu tin mới của robot | `js/components/vbot.js`, `css/vbot.css` | Phần tử HTML định vị `translate3d`, bo góc lệch theo phía (`data-side`), keyframes `vbot-bubble-in`, `vbot-pop`, `vbot-news` | Cạnh robot |
| Chỉ báo "đang gõ" | `js/components/vbot.js` (`span.vbot-typing` với 3 `<i>`), `css/vbot.css` | 3 chấm tròn `#8b5cf6` nảy lệch pha (keyframes `vbot-dot`, trễ 0,15 s / 0,3 s) | Tin nhắn AI đang chờ nội dung trong khung chat V-Bot |
| Hiệu ứng mở đầu: vòng quỹ đạo + tia sáng | `index.html` (SVG `.intro__rings`), `css/shell.css` | SVG `viewBox="0 0 400 400"` gồm 3 `ellipse` (2 quỹ đạo nghiêng −20° và 28°, 1 vòng tròn nét đứt) tô gradient `intro-g1` (`#7c8cff → #34d6f5`) và `intro-g2` (`#a78bfa → #6f86ff`); "vẽ dần" bằng `stroke-dasharray/stroke-dashoffset` (keyframes `intro-draw`); `circle.intro__spark` chạy theo quỹ đạo bằng SMIL `<animateMotion dur="2.4s">`; `drop-shadow` phát sáng | Màn hình intro toàn màn hình (lần đầu mở trang chủ trong phiên) |
| Hiệu ứng mở đầu: nền, lưới phối cảnh, logo, chữ, thanh tiến trình | `index.html`, `css/shell.css` | Nền `radial-gradient` (`#1b2a6b → #0b1026 → #05070f`); lưới 54px bằng hai `linear-gradient` + `perspective(600px) rotateX(62deg)` + `mask-image` (keyframes `intro-grid`); logo ảnh `assets/logo-640.jpg` bật vào (keyframes `intro-logo`) với vệt sáng `linear-gradient` quét (`intro-shine`); chữ "V-Code Edu" từng ký tự lật lên trễ theo biến `--i` (`intro-letter`), "Edu" tô `background-clip: text`; tag và thanh tiến trình (`intro-fade-in`, `intro-bar`); thoát bằng `intro-out-bg`, `intro-out-fg`; khung ứng dụng hiện bằng `shell-reveal` | Màn hình intro |
| Trang trí bảng chào mừng đăng nhập | `js/components/auth-dialog.js` → `artDecor()`, `css/auth.css` | 2 khối lập phương CSS 3D (6 mặt `span` với `translateZ`, `transform-style: preserve-3d`, keyframes `auth-spin`), 2 quả cầu `radial-gradient` trôi (`auth-drift`), SVG `viewBox="0 0 400 400"` 2 elip nét đứt chạy (`auth-dash`), 3 nhãn ký hiệu mã `{ }`, `</>`, `def` (nhãn thứ ba bị ẩn bằng CSS); nền gradient chàm nhiều lớp + họa tiết chấm `radial-gradient` 22px có `mask-image` | Cột trái hộp thoại Đăng nhập/Đăng ký/Khôi phục |
| Thẻ kính mờ và logo nổi trong hộp thoại xác thực | `js/components/auth-dialog.js`, `css/auth.css` | `backdrop-filter: blur(10px)`, nền trắng bán trong suốt, keyframes `auth-card-in` (trễ 90/180 ms), `auth-logo-float` | Cột trái hộp thoại xác thực; biểu tượng chìa khóa của chế độ khôi phục (`.auth-reset-art`) |
| Thanh đo độ mạnh mật khẩu | `js/components/auth-dialog.js`, `css/auth.css` | 4 vạch `<i>` đổi màu theo `data-level` (`#ef4444`, `#f59e0b`, `#22c55e`, `#10b981`) | Chế độ Đăng ký |
| Ô logo thương hiệu có vòng xoay | `index.html` (`.brand__tile` chứa `assets/icons/mark-96.png`), `css/shell.css` | Viền `conic-gradient` theo màu khu vực (`--section-accent`, `--section-accent-2`) xoay khi rê chuột (keyframes `brand-spin`), ô nghiêng −8° và phóng 1,06 | Góc trái thanh điều hướng và chân trang |
| Thanh chỉ báo điều hướng | `js/main.js` (`span.nav-indicator`), `css/shell.css` | Một phần tử dịch chuyển bằng biến `--x` + `transition` 460 ms; nền pha màu `color-mix`, gạch chân gradient; khu vực Thử thách dùng `clip-path` hình bình hành | Dưới liên kết đang hoạt động trên thanh điều hướng |
| Biểu tượng tia sét chip XP và biểu tượng burger | `index.html` | SVG nội tuyến 24×24 (`M13 2 3 14h9l-1 8 10-12h-9l1-8z`, `M3 6h18M3 12h18M3 18h18`) | Chip XP; nút mở menu di động |
| Chấm trạng thái kết nối | `index.html` (`.status-pill__dot`), `css/shell.css` | Chấm tròn có vòng sóng lan tỏa `::after` (keyframes `status-ping`); khi ngoại tuyến đổi thành hình thoi (xoay 45°) và viên rung (`status-attn`) | Viên trạng thái trên thanh điều hướng |
| Thanh tiến trình chuyển trang | `index.html` (`.route-progress`), `js/main.js`, `css/shell.css` | Thanh 3px gradient `--section-accent → --section-accent-2` có `box-shadow` phát sáng; chạy tới 78% trong 2,2 s rồi hoàn tất 100% và mờ dần | Đỉnh màn hình khi chuyển trang |
| Hiệu ứng gợn sóng (ripple) | `js/main.js` (`initRipples`), `css/components.css` | `span.ripple` hình tròn `currentColor` độ mờ 0,18 phóng từ điểm bấm (keyframes `ripple`, 620 ms) | Nút `.btn`, `.chip`, `.auth-submit`, `.auth-google` |
| Ánh sáng quét trên nút chính | `css/components.css`, `css/auth.css` | `linear-gradient` trắng bán trong suốt trên `::before`, dịch `background-position`/`left` khi rê chuột | `.btn--lg.btn--primary`; nút cam `.auth-submit` |
| Vòng quay tải / skeleton | `css/components.css`, `css/base.css` | Vòng viền hở một cạnh (keyframes `spin`); dải gradient chạy (`shimmer`); logo nhịp thở (`boot-pulse`) | `.spinner`, `.btn.is-loading`, `.skeleton` (ô tài khoản khi chưa sẵn sàng), `.boot-splash` |
| Mũi tên ô chọn | `css/components.css` (`.select`) | SVG mã hóa trong `data:` URI (`stroke='%236b7290'`) làm `background-image` | Các ô `<select class="select">` |
| Mũi tên ô chọn chế độ V-Bot | `css/vbot.css` (`.vbot-panel__mode`) | Hai `linear-gradient` 45°/135° tạo hình tam giác | Ô chọn chế độ trong khung chat V-Bot |
| Tô màu cú pháp | `js/components/highlight.js`, `css/components.css`, `css/tokens.css` | `span.tok-*` (12 loại) tô theo biến `--tok-*` riêng cho từng giao diện | Khối mã Markdown (`.code-block`), mã trong bài học/AI |
| Công thức toán | `js/components/markdown.js` | KaTeX tải lười từ CDN (`katex.render`, `output: 'html'`); ngoại tuyến hiện TeX thô monospace màu `--tok-number` | Nội dung Markdown (`.math-inline`, `.math-display`) |
| Bảng ASCII kết quả SQL | `js/runtime/sql.worker.js` → `formatTable` | Đồ họa văn bản bằng `+`, `-`, `|`, cột tối đa 40 ký tự | Khung kết quả chạy SQL |
| Ảnh logo dùng lại | `assets/logo-640.jpg`, `assets/icons/mark-96.png` (tệp raster có sẵn, không do mã sinh) | Thẻ `<img>` | Intro, ngăn kéo di động, hộp thoại xác thực, thanh điều hướng, chân trang |

#### 2. Danh sách 105 biểu tượng trong `js/components/icons.js`

`home`, `book`, `book-open`, `code`, `terminal`, `play`, `pause`, `stop`, `step-forward`, `step-back`, `restart`, `refresh`, `sparkles`, `message`, `messages`, `users`, `user`, `trophy`, `settings`, `sun`, `moon`, `monitor`, `search`, `plus`, `minus`, `trash`, `edit`, `copy`, `check`, `check-circle`, `x`, `x-circle`, `chevron-left`, `chevron-right`, `chevron-down`, `chevron-up`, `arrow-right`, `arrow-left`, `arrow-up`, `menu`, `external`, `download`, `upload`, `wifi`, `wifi-off`, `cloud`, `cloud-off`, `cpu`, `layers`, `graph`, `tree`, `list`, `stack`, `hash`, `zap`, `clock`, `calendar`, `flag`, `lock`, `unlock`, `logout`, `login`, `send`, `filter`, `info`, `alert`, `eye`, `eye-off`, `school`, `rocket`, `shield`, `robot`, `database`, `git-branch`, `grid`, `bars`, `link`, `share`, `qr`, `target`, `compass`, `bulb`, `bug`, `wand`, `scale`, `file`, `folder`, `history`, `maximize`, `minimize`, `sidebar`, `more-h`, `globe`, `key`, `mail`, `google`, `python`, `brain`, `gauge`, `prism`, `dot`, `speed`, `shuffle`, `table`, `wrench`.

Ghi chú: `dot` tô đặc bằng `currentColor`; `google` tô 4 màu cố định; các biểu tượng còn lại chỉ có nét. Tên không tồn tại sẽ tạo SVG rỗng và ghi cảnh báo console `[icon] unknown icon:`.

#### 3. Các keyframes CSS trong phạm vi (44)

| File | Keyframes | Công dụng |
|---|---|---|
| `css/base.css` | `page-in`, `boot-pulse` | Trang mới hiện mờ + trượt 6px; logo màn hình chờ nhịp thở (cũng dùng cho `.sync-dot.is-syncing`). |
| `css/components.css` | `ripple`, `spin`, `shimmer`, `modal-in`, `toast-in`, `toast-out` | Gợn sóng nút, vòng quay tải, skeleton, hộp thoại/menu bật lên, toast vào/ra. |
| `css/shell.css` | `brand-spin`, `status-ping`, `status-attn`, `xp-bump`, `page-enter`, `intro-draw`, `intro-logo`, `intro-shine`, `intro-letter`, `intro-fade-in`, `intro-bar`, `intro-grid`, `intro-out-bg`, `intro-out-fg`, `shell-reveal` | Viền logo xoay, chấm trạng thái, viên ngoại tuyến rung, chip XP nảy, chuyển trang (mờ + nhòe → rõ, ghi đè `page-in`), toàn bộ intro và lộ khung ứng dụng. |
| `css/auth.css` | `auth-pop`, `auth-logo-float`, `auth-card-in`, `auth-spin`, `auth-drift`, `auth-dash`, `auth-shake`, `auth-view-in` | Hộp thoại bật lên có nghiêng 3D, logo nổi, thẻ trượt vào, khối lập phương xoay, cầu/nhãn trôi, quỹ đạo nét đứt chạy, rung khi lỗi, chuyển chế độ/hiện thông báo. |
| `css/vbot.css` | `vbot-float`, `vbot-shadow`, `vbot-blink`, `vbot-think`, `vbot-bulb`, `vbot-heart`, `vbot-wave`, `vbot-land`, `vbot-hop`, `vbot-pop`, `vbot-news`, `vbot-bubble-in`, `vbot-dot` | Robot lơ lửng + bóng co giãn, chớp mắt (mỗi 5,5 s), mắt "suy nghĩ", bóng đèn nhấp nháy (nhanh hơn khi đang trả lời/tải), tim đập, vẫy tay, đáp đất co giãn, nhảy khi chuyển trang, huy hiệu bật, quầng sáng báo tin mới, bong bóng/tin nhắn hiện, chấm đang gõ. |

Mọi tệp đều tôn trọng `prefers-reduced-motion: reduce` (base.css rút mọi animation/transition xuống 0,01 ms; shell.css, auth.css, vbot.css tắt riêng các animation lặp; intro rút còn 700 ms; ripple và mắt robot theo con trỏ bị tắt trong JS).

#### 4. Design tokens — bảng màu theo giao diện (`css/tokens.css`)

| Nhóm | Biến | Sáng ("paper") | Tối ("night ink") |
|---|---|---|---|
| Nền | `--bg` / `--bg-elev` / `--bg-sunken` / `--surface-2` | `#f6f5f1` / `#ffffff` / `#efede7` / `#f1f0eb` | `#0a0f1f` / `#111a31` / `#0d1427` / `#16203b` |
| Lớp phủ | `--overlay` | `rgba(11, 20, 51, 0.42)` | `rgba(2, 5, 14, 0.66)` |
| Viền | `--border` / `--border-strong` | `#e3e0d7` / `#cfcbbf` | `#222d4d` / `#33406a` |
| Chữ | `--text` / `--text-2` / `--text-3` / `--text-inverse` | `#0b1433` / `#3d4566` / `#6b7290` / `#ffffff` | `#e8ebf5` / `#b4bbd3` / `#8790ad` / `#0a0f1f` |
| Thương hiệu | `--brand` / `--brand-hover` / `--brand-ink` / `--brand-soft` / `--brand-line` | `#2f49d1` / `#263db5` / `#ffffff` / `#e8ebfb` / `#c3cbf3` | `#6f86ff` / `#8a9cff` / `#0a0f1f` / `#1a2550` / `#2f3f85` |
| Nhấn AI (tím quỹ đạo) | `--accent-ai` / `-soft` | `#6a4ff0` / `#efebfe` | `#a593ff` / `#231d4d` |
| Nhấn Live/Prism (cyan) | `--accent-live` / `-soft` | `#0b9fc2` / `#e2f6fb` | `#45d3f2` / `#0f2c3d` |
| Nhấn Thử thách (hổ phách) | `--accent-amber` / `-soft` | `#c27a06` / `#fbf1dd` | `#f4b545` / `#33270f` |
| Nhấn Lớp học (xanh lá) | `--accent-green` / `-soft` | `#15835b` / `#e0f3ea` | `#4cd49a` / `#0f2e24` |
| Nhấn hồng | `--accent-rose` / `-soft` | `#c4325a` / `#fbe6ec` | `#ff7a9a` / `#3a1626` |
| Trạng thái | `--success` / `--warning` / `--danger` / `--info` | `#15835b` / `#b86e00` / `#c42b3c` / `#2f49d1` | `#4cd49a` / `#f4b545` / `#ff6b7d` / `#6f86ff` |
| Trạng thái (nền nhạt) | `--success-soft` / `--warning-soft` / `--danger-soft` / `--info-soft` | `#e0f3ea` / `#fbf0d9` / `#fbe5e8` / `#e8ebfb` | `#0f2e24` / `#33270f` / `#3a1520` / `#1a2550` |
| Trình soạn mã | `--code-bg` / `--code-gutter` / `--code-text` | `#fbfaf7` / `#f1efe9` / `#1c2340` | `#0c1326` / `#0f1730` / `#dfe4f3` |
| Token cú pháp | `--tok-keyword` / `string` / `number` / `comment` / `function` / `type` / `builtin` / `operator` / `tag` / `attr` / `punct` | `#6a2fd1` / `#0f7a4f` / `#b04a00` / `#8a8f9f` / `#1f50c8` / `#0a7f95` / `#a0337a` / `#4b5170` / `#b0254f` / `#8a5a00` / `#6b7290` | `#c3a6ff` / `#8be3b0` / `#ffb27a` / `#6c7695` / `#8fb3ff` / `#6fe0f0` / `#ff9bd2` / `#aab3cf` / `#ff8fa8` / `#ffd27a` / `#8790ad` |
| Terminal | `--term-bg` / `--term-text` / `--term-muted` / `--term-ok` / `--term-err` / `--term-warn` / `--term-in` | `#0d1428` / `#d8def0` / `#7f89a8` / `#4cd99a` / `#ff7b8a` / `#ffc566` / `#7fd3ff` | `--term-bg: #070b17` (các biến còn lại giữ như giao diện sáng) |
| Trực quan hóa (Prism) | `--viz-base` / `compare` / `swap` / `done` / `pivot` / `active` / `visited` / `path` / `edge` | `#c9cfe6` / `#f2b233` / `#e5484d` / `#22a06b` / `#6a4ff0` / `#2f49d1` / `#8fd6e8` / `#0b9fc2` / `#b7bdd4` | `#34416e` / `#f4b545` / `#ff6b7d` / `#4cd49a` / `#a593ff` / `#6f86ff` / `#1f6a80` / `#45d3f2` / `#3a4772` |
| Bóng & focus | `--shadow-1/2/3`, `--focus` | Bóng màu navy `rgba(11, 20, 51, …)`; focus `rgba(47, 73, 209, 0.35)` | Bóng đen `rgba(0, 0, 0, …)`; focus `rgba(111, 134, 255, 0.45)` |

Token không phụ thuộc giao diện: phông `"Be Vietnam Pro"` (chữ) và `"JetBrains Mono"` (mã), cỡ chữ `--fs-xs` 0,75rem → `--fs-display` `clamp(2.6rem, 6.4vw, 5.25rem)`, khoảng cách bội số 4px (`--sp-1` 4px → `--sp-24` 96px), bo góc 6/8/12/18/26/999px, `--nav-h: 64px`, container 1200/1440px, đường cong `--ease: cubic-bezier(0.2, 0.7, 0.2, 1)`, `--ease-out: cubic-bezier(0.16, 1, 0.3, 1)`, thời lượng 120/200/420 ms. Màu `meta theme-color`: `#f6f5f1` (sáng) / `#0a0f1f` (tối), mặc định trong HTML `#0b1026`.

#### 5. Bản sắc màu theo khu vực (`css/shell.css`, qua `html[data-section]`)

| Khu vực (`data-section`) | `--section-accent` | `--section-accent-2` | Biến thể tối | Skin thanh điều hướng |
|---|---|---|---|---|
| `home` | `#4f6bff` | `#22d3ee` | — | Trong suốt nổi trên hero 3D tối khi chưa cuộn (chữ `rgba(226, 232, 255, 0.78)`, không blur), trang kéo lên dưới thanh điều hướng |
| `learn` | `#10b981` | `#3b82f6` | — | Mặc định |
| `challenges` | `#ff4655` | `#ff8a3d` | — | Thanh tối "chiến thuật" `rgba(14, 15, 19, 0.86)`, chữ `#a9adb8`/`#f4f5f7`, viền đỏ mờ, chữ liên kết in hoa, chỉ báo và nút đăng nhập dạng góc vát (`clip-path`) |
| `prism` | `#0891b2` | `#14b8a6` | `#22d3ee` / `#2dd4bf` | Bỏ viền dưới, thay bằng vạch đo `repeating-linear-gradient` mỗi 12px |
| `workspace` | `#3b82f6` | `#22c55e` | — | Biến `--nav-h-local: 56px` |
| `ai` | `#7c5cff` | `#e879f9` | `#a78bfa` (accent) | Nền gradient ngang pha tím `#7c5cff` và hồng `#e879f9` |
| `classroom` | `#1d4ed8` | `#0f172a` | `#60a5fa` / `#e2e8f0` | Nền `--bg-elev` 92% kiểu SaaS, chỉ báo nhạt hơn |
| `account` | `var(--brand)` | (mặc định `var(--accent-live)`) | — | Mặc định |

Các biến `--section-accent`/`--section-accent-2` được dùng cho: màu chữ "Edu" trong logo, viền conic của ô logo, biểu tượng liên kết đang hoạt động, nền và gạch chân gradient của chỉ báo điều hướng, nút "Đăng nhập", viền rê chuột của nút tài khoản, thanh tiến trình chuyển trang và màu "eyebrow" của các trang (`.page-root--*`).

#### 6. Bảng màu riêng của các thành phần

| Thành phần | Màu chính (theo mã) |
|---|---|
| Hộp thoại xác thực (`css/auth.css`) | Chàm `#4f46e5`, `#6366f1`, `#3730a3`; cam nút chính `#ff9a2e → #ff5a1f`; xanh liên kết `#2563eb` (tối `#8ea2ff`); bề mặt biểu mẫu `#ffffff` (tối `#0f1629`); biểu tượng ô nhập tím `#7c3aed` (tối `#a78bfa`). |
| Khung chat V-Bot (`css/vbot.css`) | Đầu khung `#4338ca → #6d28d9 → #a21caf`; bong bóng người dùng `#6366f1 → #8b5cf6`; nút gửi `#6366f1 → #a855f7`; nút dừng/huy hiệu `#e11d48`; trạng thái sẵn sàng `#4ade80`, chờ `#fbbf24`, tắt `#fb7185`; nền khung `rgba(255,255,255,0.9)` (tối `rgba(17, 15, 46, 0.92)`). |
| Ngăn kéo di động (`css/shell.css`) | Mặc định tối `#0f1626`, chữ `#e2e8f0`/`#94a3b8`; mục đang hoạt động và nút chính gradient xanh ngọc `#10b981 → #0d9488`; viền logo `#10b981`; nút đăng xuất `#fb7185`; giao diện sáng nền `#ffffff`, chữ `#0f172a`/`#64748b`. |
| Viên trạng thái & chip XP (`css/shell.css`) | Online `#16a34a` (tối `#4ade80`), đang đồng bộ `var(--brand)`, ngoại tuyến `#f59e0b` trên nền `#fffbeb` chữ `#92400e`, suy giảm `#f97316`; chip XP chữ `#166534` nền `#dcfce7` viền `#bbf7d0` (tối `#86efac` trên `rgba(34, 197, 94, 0.12)`). |

### Đồ họa sinh bằng mã trong phạm vi

Toàn bộ đồ họa dưới đây được tạo bằng mã (Three.js/WebGL, Canvas 2D, SVG nội tuyến hoặc CSS); phần trong phạm vi không dùng tệp ảnh bitmap có sẵn.

#### 1. Cảnh WebGL "V-Core" (Three.js) – `js/pages/home/hero3d.js`

Thiết lập chung: `WebGLRenderer` (khử răng cưa, nền trong suốt, `powerPreference: 'high-performance'`, tỉ lệ điểm ảnh tối đa 1,75, `ACESFilmicToneMapping`, độ phơi sáng 1,15), `Scene` có sương mù `FogExp2(0x070b1d, 0.035)`, `PerspectiveCamera(38°, near 0.1, far 120)` đặt tại (0; 0,4; 11). Nhóm `world` chứa nhóm `rig` (lõi + quỹ đạo; dịch sang phải trên màn hình rộng, thu nhỏ 0,78 hoặc 0,62).

| Tên đồ họa | File tạo | Kỹ thuật | Vị trí hiển thị |
|---|---|---|---|
| Ánh sáng môi trường + 3 đèn điểm (key 0x8ea2ff, rim 0x22d3ee, top 0xd8b4fe) | `js/pages/home/hero3d.js` | `AmbientLight`, `PointLight` | Chiếu sáng toàn cảnh Hero trang chủ |
| Lõi pha lê | `js/pages/home/hero3d.js` | `IcosahedronGeometry(1.45, 0)` + `MeshStandardMaterial` (kim loại 0,55, nhám 0,28, `flatShading`, phát sáng 0x0d1450, trong suốt 0,92); xoay theo thời gian, con trỏ và tiến độ cuộn; phình khi "pulse" | Tâm cảnh Hero (`#s-hero`) |
| Vỏ lưới khung | `js/pages/home/hero3d.js` | `IcosahedronGeometry(1.95, 1)` → `EdgesGeometry` → `LineSegments` + `LineBasicMaterial` (0x7dd3fc, độ mờ 0,35, sáng hơn khi pulse) | Bao quanh lõi |
| Nhân bát diện bên trong | `js/pages/home/hero3d.js` | `OctahedronGeometry(0.55, 0)` + `MeshBasicMaterial` (0xa5f3fc), xoay nhanh | Trong lõi |
| Quầng sáng lõi | `js/pages/home/hero3d.js` | `Sprite` với `CanvasTexture` gradient tỏa tròn 128×128 (`glowTexture`), `AdditiveBlending`; độ mờ và kích thước dao động, tăng khi pulse | Phía sau lõi |
| 3 vòng quỹ đạo | `js/pages/home/hero3d.js` | `TorusGeometry(r, 0.012, 8, 220)` bán kính 3,15 / 3,75 / 2,55, nghiêng khác nhau, màu 0x6f86ff / 0x22d3ee / 0xa78bfa | Quanh lõi (mô-típ logo) |
| 4 vệ tinh | `js/pages/home/hero3d.js` | `SphereGeometry(0.085)` + quầng `Sprite` cộng sáng; chạy trên quỹ đạo theo `cos/sin` | Trên các vòng quỹ đạo |
| 12 nhãn mã nguồn nổi (`def`, `{ }`, `</>`, `for i in`, `AI`, `SELECT`, `if x:`, `cout <<`, `print()`, `O(log n)`, `while`, `01`) | `js/pages/home/hero3d.js` | `glyphTexture()` vẽ khung bo góc + chữ JetBrains Mono lên Canvas 2D → `CanvasTexture` → `Sprite`; dập dềnh và nhấp nháy độ mờ | Vòng cung phía phải/sau lõi |
| Trường sao 1 600 điểm | `js/pages/home/hero3d.js` | `BufferGeometry` (vị trí cầu ngẫu nhiên, màu đỉnh từ 4 màu) + `PointsMaterial` cộng sáng, xoay chậm | Nền không gian |
| Sàn lưới | `js/pages/home/hero3d.js` | `GridHelper(80, 80)` y = −3,4, độ mờ 0,35, trôi theo trục z | Phía dưới cảnh |
| Tương tác nhấp lõi | `js/pages/home/hero3d.js` | `Raycaster` + `Vector2` NDC; trúng lõi hoặc nhân → `pulse = 1`, phát sự kiện `hero:pulse` | Toàn vùng Hero |
| Thị sai chuột và dolly camera theo cuộn | `js/pages/home/hero3d.js` | Nội suy `tx/ty` 0,05 mỗi khung; `world.rotation`, `camera.position.z = 11 + p·5` | Hero |

Hiệu năng: một vòng `requestAnimationFrame` duy nhất, dừng khi Hero khuất (`IntersectionObserver`) hoặc tab ẩn; một khung tĩnh khi giảm chuyển động; giải phóng tài nguyên (`dispose`, `forceContextLoss`) khi rời trang.

#### 2. Minh họa khóa học – `js/pages/learn/course-art.js`

Mọi minh họa dùng `viewBox="0 0 160 120"`, chỉ tô màu đặc (không dùng `<defs>`/id) để chèn nhiều lần trên một trang; chia hai lớp `data-layer="back"` và `data-layer="front"` cho hiệu ứng thị sai khi nghiêng thẻ.

| Tên đồ họa | File tạo | Kỹ thuật | Vị trí hiển thị |
|---|---|---|---|
| Python – rắn vàng cuộn ra từ cửa sổ editor (chữ `def`, dòng mã, ngoặc `{ }`) | `js/pages/learn/course-art.js` (`ART.python`) | SVG nội tuyến (path cong nhiều nét, ellipse, text) | Banner thẻ khóa học, thẻ "Tiếp tục học", hero trang khóa học |
| Python VN – hoa sen, ngôi sao vàng trên nền đỏ, bong bóng `in_ra("Chào")`, chữ "nếu → if" | `js/pages/learn/course-art.js` (`ART.pyvn`) | SVG nội tuyến | Như trên |
| HTML & CSS – cửa sổ trình duyệt có bố cục, bong bóng `</>`, con trỏ chuột, mẫu màu | `js/pages/learn/course-art.js` (`ART.web`) | SVG nội tuyến | Như trên |
| Ngôn ngữ C – vi mạch có chữ "C", đường mạch điện, bánh răng | `js/pages/learn/course-art.js` (`ART.c`) | SVG nội tuyến | Như trên |
| C++ Pro – cây/đồ thị có đường đi tô vàng, tia sét, chữ `O(n)` | `js/pages/learn/course-art.js` (`ART.cpp`) | SVG nội tuyến | Như trên |
| AI & Data – mạng nơ-ron 3 lớp, đường kích hoạt sáng, lấp lánh | `js/pages/learn/course-art.js` (`ART.ai`) | SVG nội tuyến | Như trên |
| Dự phòng – khung mã có ngoặc `</>` | `js/pages/learn/course-art.js` (`ART.fallback`) | SVG nội tuyến | Khóa học có mã không nằm trong `THEMES` |
| Biểu tượng khóa học (Py, VN, `</>`, C, C++, AI) | `js/pages/learn/course-art.js` (`courseEmblem`) | Phần tử `span` nền gradient theo `themeVars` | Bản đồ lộ trình, hero và thẻ bên trang khóa học, đầu trang bài học |
| Dải màu khóa học (`--c-from`, `--c-to`, `--c-deep`, `--c-ink`, `--c-ink-dark`) | `js/pages/learn/course-art.js` (`THEMES`, `themeVars`) | Biến CSS áp vào phần tử | Thẻ khóa học, trang khóa học, khung bài học |
| Thanh và vòng tiến độ | `js/pages/learn/shared.js` (`bar`, `ring`) | Phần tử HTML, vòng dùng biến `--pct` | Trang Học, trang khóa học |
| Bản đồ bài học (mỗi bài một đoạn) | `js/pages/lesson.js` (`renderMap`) | Liên kết HTML, độ rộng chương theo `flexGrow` | Đầu trang bài học |

#### 3. Đồ họa Đấu trường – `js/pages/arena/art.js`

| Tên đồ họa | File tạo | Kỹ thuật | Vị trí hiển thị |
|---|---|---|---|
| Huy hiệu hạng độ khó D, C, B, A, S, BOSS (6 loại) | `js/pages/arena/art.js` (`rankEmblem`) | SVG 32×32: khung lục giác (khiên với BOSS), ký hiệu: D 1 chữ V, C 2 chữ V, B 3 chữ V, A hình thoi + V, S ngôi sao 4 cánh, BOSS vương miện; màu theo `RANK_META` | Thẻ trận, chip lọc hạng, thử thách hôm nay, nút vào trận, danh sách gần hoàn thành, thẻ trùm, HUD trận |
| Huy hiệu bậc người chơi (7 bậc: Tân binh, Đồng, Bạc, Vàng, Bạch kim, Kim cương, Huyền thoại) | `js/pages/arena/art.js` (`tierEmblem`) | SVG 120×120 với `linearGradient` theo màu bậc; khiên hai lớp, ký hiệu riêng từng bậc (vạch, chữ V xếp chồng, kim cương, ngôi sao), cánh từ bậc 5 trở lên (thêm cánh dưới ở bậc 7), vương miện từ bậc 6, 1–3 vạch "pip" | Thẻ người chơi (104 px), bảng xếp hạng (26 px), lớp phủ kết quả (84 px) |
| Huy chương thành tích (13 huy hiệu) | `js/pages/arena/art.js` (`medal`) | SVG 64×64 lục giác hai lớp; ký hiệu `bolt`, `crown`, `skull`, `flag`, `ranks`, `code`, `star`, `flame`, `flame2` hoặc chữ số `10`, `25`, `50`, `100`; 5 tông màu red/ember/teal/cyan/gold | Khối "Huy hiệu" ở cột bên sảnh |
| Tranh bản đồ 1 – đường băng phối cảnh hướng về mặt trời mọc, mũi tên phóng | `js/pages/arena/art.js` (`WORLD_SCENE[1]`) | SVG 400×220 sinh thủ tục (đường phối cảnh, `radialGradient`) | Thẻ bản đồ ở sảnh |
| Tranh bản đồ 2 – các nhánh rẽ `if` / `elif` / `else` với nút hình thoi | `js/pages/arena/art.js` (`WORLD_SCENE[2]`) | SVG path | Thẻ bản đồ |
| Tranh bản đồ 3 – vòng lặp: các ellipse quỹ đạo quanh lõi có nút "play" | `js/pages/arena/art.js` (`WORLD_SCENE[3]`) | SVG ellipse, vị trí chấm theo `rng` có hạt giống | Thẻ bản đồ |
| Tranh bản đồ 4 – pháo đài chữ "C" có tháp và cổng | `js/pages/arena/art.js` (`WORLD_SCENE[4]`) | SVG path | Thẻ bản đồ |
| Tranh bản đồ 5 – đỉnh núi kết hợp đồ thị BFS có cờ trên đỉnh | `js/pages/arena/art.js` (`WORLD_SCENE[5]`) | SVG line/circle | Thẻ bản đồ |
| Nền chung của tranh bản đồ – gradient, quầng màu, 7 đường đồng mức, số `0N` mờ | `js/pages/arena/art.js` (`worldArt`, `contours`) | SVG `linearGradient`, `radialGradient`, đường cong bậc hai ngẫu nhiên có hạt giống `world-<id>` | Thẻ bản đồ |
| Lớp hero "back" – mặt trời đỏ cam, vòng radar 72 vạch xoay, vòng nét đứt xoay ngược, lục giác | `js/pages/arena/art.js` (`heroLayers`) | SVG 1600×640, lớp `ar-spin`/`ar-spin--rev` | Nền hero sảnh Đấu trường |
| Lớp hero "far" – đường chân trời xa | `js/pages/arena/art.js` (`skyline`) | SVG sinh thủ tục: tòa nhà 4 kiểu mái, hạt giống `arena-hero` | Hero sảnh |
| Lớp hero "mid" – đường chân trời gần có cửa sổ sáng, 7 ăng-ten có đèn đỏ nhấp nháy, sàn lưới phối cảnh | `js/pages/arena/art.js` (`skyline`, `heroLayers`) | SVG, đèn có lớp `ar-blink` và `animation-delay` ngẫu nhiên | Hero sảnh |
| Lớp hero "near" – mặt đất tiền cảnh có vạch sọc cảnh báo | `js/pages/arena/art.js` (`heroLayers`) | SVG `pattern` sọc xoay 45° | Hero sảnh |
| Biểu tượng nhỏ: crosshair, swords, medal, map, skull, hidden | `js/pages/arena/art.js` (`glyph`) | SVG 24×24 | Nhãn hero, khối rỗng, dải vòng đấu, tiêu đề huy hiệu, thẻ trùm, ô vòng ẩn |
| 16 đốm lửa bay | `js/pages/challenges.js` (hero) + `css/pages/challenges.css` | Phần tử `i` với biến `--dur`, `--delay`, `--drift`, `--s` sinh bởi `rng('embers')`; keyframes `ar-ember` | Hero sảnh |
| 3 tia sáng | `js/pages/challenges.js` + `css/pages/challenges.css` | Phần tử `i`, keyframes `ar-beam`, `mix-blend-mode: screen` | Hero sảnh |
| Ô vòng kiểm thử | `js/pages/arena/overlay.js` (`roundTiles`) + CSS | Danh sách HTML, lật theo trục X (`ar-flip`) so le theo `--i` | Dải vòng đấu, lớp phủ kết quả |
| Lớp phủ "Chiến thắng"/"Thất bại" | `js/pages/arena/overlay.js` + CSS | Nền 3 vệt chéo (`ar-slash`), chữ giãn từ mờ sang rõ (`ar-word`, chữ viền qua `attr(data-text)`), huy hiệu bật (`ar-pop`), thanh hạng chạy, XP đếm tăng (`countUp`) | Trang thi đấu |

#### 4. Đồ họa Lớp học – `js/pages/classroom/art.js` và `js/pages/classroom/util.js`

| Tên đồ họa | File tạo | Kỹ thuật | Vị trí hiển thị |
|---|---|---|---|
| Banner lớp xác định theo mã lớp (8 bảng màu × 6 họa tiết: quỹ đạo, lưới chấm có ô nổi bật, sóng, ngoặc mã + khối, dải chéo, nút đồ thị) | `js/pages/classroom/art.js` (`bannerSVG`, `banner`, `classTheme`) | SVG 640×200 sinh thủ tục; hạt giống `hashString(code)` (FNV-1a) cho `prng` (mulberry32); `linearGradient` + lớp phủ tối | Thẻ lớp ở bảng điều khiển, hero lớp (Tổng quan), trang lời mời, khối lời mời trong Cài đặt |
| Logo vuông của lớp (chữ cái đầu tên lớp) | `js/pages/classroom/art.js` (`classMark`) | `span` nền `linear-gradient` từ bảng màu của banner | Bộ chuyển lớp, danh sách lớp ở thanh bên, hàng chờ chấm |
| Minh họa `classes` (hai cửa sổ lớp + dấu tích) | `js/pages/classroom/art.js` (`ILLOS`, `illo`) | SVG 240×160, màu qua lớp CSS `.i-*` (theo chủ đề) | Trạng thái rỗng bảng điều khiển giáo viên |
| Minh họa `assignments` (bảng kẹp danh sách việc + đồng hồ) | `js/pages/classroom/art.js` | SVG | Trạng thái rỗng bài tập |
| Minh họa `students` (ba người + nút thêm) | `js/pages/classroom/art.js` | SVG | Lớp chưa có học sinh |
| Minh họa `discussion` (hai bong bóng chat) | `js/pages/classroom/art.js` | SVG | Thảo luận rỗng |
| Minh họa `inbox` (khay thư + dấu tích) | `js/pages/classroom/art.js` | SVG | Không còn bài chờ chấm, chưa có dữ liệu |
| Minh họa `activity` (đường nhịp tim) | `js/pages/classroom/art.js` | SVG | Hoạt động rỗng |
| Minh họa `grades` (bảng ô điểm) | `js/pages/classroom/art.js` | SVG, các ô sinh bằng vòng lặp | Bảng điểm/điểm số rỗng |
| Minh họa `join` (thẻ nhập mã 6 ô + dấu cộng) | `js/pages/classroom/art.js` | SVG | Trang lời mời, học sinh chưa có lớp |
| Minh họa `lock` (ổ khóa) | `js/pages/classroom/art.js` | SVG | Lỗi quyền, lớp không tồn tại |
| Minh họa `offline` (đám mây gạch chéo) | `js/pages/classroom/art.js` | SVG | Màn hình ngoại tuyến, lỗi tải lớp |
| Minh họa hero trang giới thiệu (bảng điều khiển trừu tượng: KPI, biểu đồ cột, vòng tiến độ, cửa sổ mã, thẻ thông báo) | `js/pages/classroom/art.js` (`heroIllustration`) | SVG 560×440 với 4 nhóm `cr-float--1..4` trôi lên xuống (keyframes `cr-float`) | Trang giới thiệu Lớp học khi chưa đăng nhập |
| Minh họa vai trò giáo viên / học sinh | `js/pages/classroom/art.js` (`roleArt`) | SVG 120×90 | Thẻ chọn vai trò |
| Ảnh đại diện chữ cái đầu (8 màu theo băm khóa, chấm trực tuyến) | `js/pages/classroom/util.js` (`avatar`, `initials`) | `span` với biến `--av` | Danh sách học sinh, thảo luận, khung chấm, hồ sơ học sinh |
| Biểu đồ donut | `js/pages/classroom/util.js` (`donut`) | SVG `circle` với `stroke-dasharray`/`stroke-dashoffset`, khoảng hở 2,5 giữa đoạn, chú giải HTML; CSS `cr-draw` | Tình trạng bài làm, tiến độ của em, tình trạng nộp bài |
| Biểu đồ thanh ngang | `js/pages/classroom/util.js` (`barList`) | HTML, độ rộng theo phần trăm; CSS `cr-grow` | Tỉ lệ nộp theo bài tập |
| Histogram phân bố điểm (10 cột 0–10) | `js/pages/classroom/util.js` (`histogram`) | SVG 320×150, màu theo dải điểm low/mid/good/high; CSS `cr-rise-bar` | Tổng quan giáo viên, chi tiết bài tập |
| Biểu đồ cột điểm theo bài | `js/pages/classroom/util.js` (`columnSeries`) | SVG, cột "ma" cho bài chưa có điểm | Mục Điểm số của học sinh |
| Dải lịch hạn nộp 14 ngày | `js/pages/classroom/util.js` (`deadlineStrip`) | Lưới HTML, đánh dấu hôm nay/cuối tuần/có hạn, mục màu theo trạng thái | Tổng quan giáo viên và học sinh |
| Thanh tiến độ, thanh test đạt/không đạt | `js/pages/classroom/util.js` (`progressBar`), `assignments.js` (`.cr-testbar`) | HTML | Thẻ lớp, danh sách bài tập, khung chấm |
| Mã QR lời mời | `js/pages/classroom/settings.js` (`renderQR`) | Thư viện qrcodejs nạp từ `QRCODE_URL`, màu `#0a1630` trên trắng, mức sửa lỗi M, 184 px (280 px khi trình chiếu) | Hộp thoại mời, chế độ trình chiếu mã lớp |

#### 5. Bộ vẽ V-Prism – `js/pages/prism/renderers.js`, `js/pages/prism/index.js`, `js/pages/prism/mini.js`

| Tên đồ họa | File tạo | Kỹ thuật | Vị trí hiển thị |
|---|---|---|---|
| Cột (`bars`) – chiều cao theo giá trị (`--h`), nhãn giá trị và chỉ số, con trỏ, làm mờ ngoài đoạn `range`, hàng ô phụ `aux` | `js/pages/prism/renderers.js` (`renderBars`) | HTML + biến CSS; trạng thái `is-compare`, `is-swap`, `is-done`, `is-pivot`, `is-active`, `is-dim` (phát sáng ở chủ đề tối) | Sân khấu V-Prism cho 6 thuật toán sắp xếp; demo mini |
| Ô mảng (`cells`) – một hoặc nhiều hàng, con trỏ, chỉ số, ghi chú | `js/pages/prism/renderers.js` (`renderCells`, `renderCellsRow`) | HTML | Mảng (3), Tìm kiếm (2); hàng phụ trong các bộ vẽ khác |
| Danh sách liên kết (`list`) – nút giá trị + con trỏ "next", mũi tên → / ← khi đảo ngược, "head", "null" | `js/pages/prism/renderers.js` (`renderList`) | HTML | Danh sách liên kết (3) |
| Ngăn xếp/hàng đợi (`stackqueue`) – phần tử có nhãn "đỉnh", "đầu", "cuối", băng ký tự có con trỏ, chuỗi thao tác, kết quả | `js/pages/prism/renderers.js` (`renderStackQueue`) | HTML | Ngăn xếp, Hàng đợi, Kiểm tra dấu ngoặc |
| Cây nhị phân (`tree`) – bố trí x theo thứ tự giữa, y theo độ sâu (khoảng 52×62), nút tròn r = 19, cạnh tô màu, nhãn phụ, mảng kèm theo, thứ tự duyệt, khối bên | `js/pages/prism/renderers.js` (`layoutTree`, `renderTree`) | SVG tạo bằng `s()` | Cây nhị phân (4), BST (3), Heap (3) |
| Đồ thị (`graph`) – khung 640×360, cạnh có nhãn trọng số, nút r = 21, nhãn khoảng cách (∞), khối hàng đợi/ngăn xếp, thứ tự thăm, ma trận kề, danh sách kề | `js/pages/prism/renderers.js` (`renderGraph`, `renderMatrix`, `renderSide`) | SVG + bảng HTML; vị trí nút theo `PRESET_POS` hoặc vòng tròn (`graphs.js`) | Biểu diễn, Dijkstra, BFS, DFS |
| Bảng quy hoạch động (`table`) – nhãn hàng/cột, ô được đánh dấu, hàng phụ, ghi chú | `js/pages/prism/renderers.js` (`renderTable`) | Bảng HTML | Fibonacci lập bảng, Cái túi 0/1, LCS, Đổi tiền |
| Cây lời gọi đệ quy (`calltree`) – lá xếp tuần tự, nút cha căn giữa, hộp 62×28 có kết quả "= …", ngăn xếp lời gọi, bảng nhớ | `js/pages/prism/renderers.js` (`renderCallTree`) | SVG + HTML | Giai thừa, Fibonacci, Fibonacci có nhớ |
| Bảng băm (`hash`) – các ô chỉ số, chuỗi khóa (chaining) hoặc một khóa/ô "đã xóa"/∅ (dò tuyến tính) | `js/pages/prism/renderers.js` (`renderHash`) | HTML | Chaining, Dò tuyến tính |
| Tháp Hà Nội (`hanoi`) – 3 cọc A/B/C, đĩa rộng theo kích thước và màu `--hue = 200 + d·25`, cọc nguồn/đích, đếm bước `moves / 2ⁿ−1` | `js/pages/prism/renderers.js` (`renderHanoi`) | HTML + biến CSS | Tháp Hà Nội |
| Glyph chủ đề (14 hình đường nét: arrays, linked-list, stack-queue, hash-table, sorting, searching, binary-tree, bst, heap, graph, bfs, dfs, recursion, dp) | `js/pages/prism/index.js` (`GLYPHS`, `topicGlyph`, `treeGlyph`) | SVG 120×64 dựng bằng hàm `R`, `L`, `C`, `P`; lớp `g-l`, `g-n`, `g-a`, `g-af`… | Thẻ chủ đề, đầu trang chủ đề, mục "Cùng nhóm", khối rỗng |
| Thương hiệu V-Prism (lăng kính 3 vạch) | `js/pages/prism/index.js` (`brandMark`) | HTML + CSS | Hero danh mục |
| Dấu góc thiết bị đo | `js/pages/prism/index.js` (`cornerTicks`) | `span` trang trí bằng CSS | Thẻ chủ đề, khung scope, sân khấu, bảng bên, thẻ độ phức tạp |
| Thước đo độ phức tạp 6 nấc | `js/pages/prism/index.js` (`gauge`) | Chuỗi `i` bật/tắt theo nhóm `CX` | Thẻ độ phức tạp |
| Dải sáng dòng mã giả | `js/pages/prism/index.js` (`moveHighlight`) | `span` dịch bằng `translateY` tới `offsetTop` của dòng đang chạy | Bảng "Mã giả" |
| Timeline có vạch chia | `js/pages/prism/index.js` + `css/pages/prism.css` | `input[type=range]`, biến `--pct` (gradient track) và `--tick` (vạch lặp) | Dock điều khiển |
| Demo sắp xếp tự lặp | `js/pages/prism/mini.js` (`mountMiniSort`) | Bộ sinh khung `insertionFrames`/`quickFrames` + `renderBars`, nghỉ 1,4 giây giữa các vòng | Cảnh 3 trang chủ (14 cột), khung scope hero danh mục (16 cột) |

#### 6. Hiệu ứng CSS 3D và hoạt ảnh của các trang trong phạm vi

| Tên đồ họa | File tạo | Kỹ thuật | Vị trí hiển thị |
|---|---|---|---|
| Lõi CSS 3D dự phòng (3 vòng xoay quanh lõi) | `css/pages/home.css` (`.hero-fallback`) + `home.js` | `perspective: 900px`, `transform-style: preserve-3d`, keyframes `ring-a/b/c` (`rotateX/rotateY/rotateZ`), `hero-breathe` | Hero trang chủ khi chưa có/không có WebGL |
| Chữ tiêu đề và HUD xuất hiện | `css/pages/home.css` | keyframes `hero-line`, `hero-fade`, `hero-underline`, `hero-hud-in`, `hero-float`, `hero-wheel` (bánh xe chuột), `status-ping-s` | Hero trang chủ |
| Cửa sổ mini IDE nghiêng vào vị trí theo cuộn | `css/pages/home.css` (`.code-window`) | `--k = min(1, --p × 2,4)`; `rotateY`, `rotateX`, `translateZ`, `scale` nội suy theo `--k`; `perspective: 1600px` | Cảnh "Code thật" |
| Sân khấu thuật toán ngả về phía người xem | `css/pages/home.css` (`.lab-stage`) | `rotateX(--rx + (1 − --k)·32deg)`, `perspective: 1400px` | Cảnh "Lăng kính" |
| Dải chữ chạy | `css/pages/home.css` | keyframes `marquee` (`translateX(-50%)`) | Cảnh "Lăng kính" |
| Cực quang | `css/pages/home.css` | keyframes `aurora` (`translate3d`, `scale`, `rotate`) | Cảnh "V-Mentor" |
| Băng chuyền 3D chế độ AI | `css/pages/home.css` (`.mentor-carousel`, `.mentor-card`) | `preserve-3d`; mỗi thẻ `rotateY(360deg / --n × --i) translateZ(--r)`; cả băng chuyền xoay `rotateY` theo `--p` | Cảnh "V-Mentor" |
| Quả cầu AI | `css/pages/home.css` (`.mentor-orb`) | `preserve-3d`, 3 vòng | Cảnh "V-Mentor" |
| Thẻ nghiêng theo con trỏ | `home/scenes.js` (`initTilt`) + `css/pages/home.css` | Biến `--rx/--ry/--mx/--my`, `perspective(700–1200px)` | Thẻ chủ đề lab, thẻ khóa học/sản phẩm hệ sinh thái, thẻ bắt đầu |
| Sàn lưới phối cảnh chạy | `css/pages/home.css` (`.scene-future__floor`) | `perspective(500px) rotateX(70deg)`, keyframes `future-floor` (dịch `background-position`) | Cảnh "Tương lai" |
| Quầng xoay hình nón | `css/pages/home.css` (`.start-card__glow`) | `conic-gradient` + hoạt ảnh `brand-spin` 16 giây | Thẻ "Bắt đầu" |
| Thanh tiến độ cuộn trang | `home.js` + `css/pages/home.css` | Biến `--k` = `scrollY / (scrollHeight − innerHeight)` | Đầu trang chủ |
| Thẻ khóa học nghiêng 3D + thị sai minh họa | `learn/shared.js` (`enableTilt`) + `css/pages/learn.css` | `perspective(1000px) rotateX(--rx) rotateY(--ry)`, biến `--px/--py/--gx/--gy`; lưới `perspective: 1400px` | Lưới khóa học trang Học |
| Ký tự mã trôi nổi (`{ }`, `</>`, `=>`, `#`) | `learn.js` + `css/pages/learn.css` | keyframes `lx-float`, độ trễ `--d` | Dải tổng quan trang Học |
| Xuất hiện so le, nhấp nhô minh họa | `css/pages/learn.css` | keyframes `lx-rise` (trễ theo `--i`), `lx-pop`, `lx-bob` (minh họa hero khóa học) | Trang Học, trang khóa học (lần vẽ đầu `is-first`), biểu ngữ hoàn thành bài |
| Parallax 4 lớp hero Đấu trường | `challenges.js` + `css/pages/challenges.css` | `translate3d` theo `--mx/--my` với hệ số 10/18/30/48 px | Hero sảnh |
| Radar xoay, đèn nhấp nháy, tia sáng, đốm lửa, quét sáng nút | `css/pages/challenges.css` | keyframes `ar-spin` (90 giây), `ar-blink`, `ar-beam`, `ar-ember`, `ar-sweep` | Hero sảnh, nút "Vào trận" |
| Xuất hiện có cắt khung, khung xương bảng xếp hạng | `css/pages/challenges.css` | keyframes `ar-in` (kèm `clip-path: inset`), `ar-skel` | Thẻ bản đồ/trùm/trận, bảng xếp hạng đang tải |
| Hình khối góc cạnh | `css/pages/challenges.css` | Nhiều `clip-path: polygon(...)` (góc vát, lục giác) | Nút, thẻ, chip, ảnh đại diện bảng xếp hạng |
| Lật ô vòng, hoạt ảnh lớp phủ kết quả | `css/pages/challenges.css` | keyframes `ar-flip` (`rotateX(90deg)`), `ar-slash`, `ar-word`, `ar-pop` | Trang thi đấu |
| Tạm dừng hoạt ảnh khi khuất | `arena/core.js` (`idleWhenHidden`) + CSS `.is-idle` | `animation-play-state: paused` | Hero sảnh |
| Minh họa trôi, xuất hiện, nhịp "trực tuyến" | `css/pages/classroom.css` | keyframes `cr-float`, `cr-rise`, `cr-pop`, `cr-pulse` (vòng lan tỏa xanh lá) | Trang giới thiệu, chuyển mục, KPI trực tuyến, chấm trực tuyến, tin nhắn, mã mời |
| Hoạt ảnh biểu đồ | `css/pages/classroom.css` | keyframes `cr-draw` (donut), `cr-grow` (thanh ngang, `scaleX`), `cr-rise-bar` (cột histogram, `scaleY`) | Tổng quan, chi tiết bài tập |
| Nền giấy kẻ ô blueprint | `css/pages/prism.css` | Nhiều lớp `linear-gradient` 1px lặp (ô 120/24 px, 48/8 px, 32 px, 16/12 px) | Toàn trang V-Prism, màn hình scope, sân khấu, đĩa glyph |
| Vệt quét màn hình scope | `css/pages/prism.css` | keyframes `pz-sweep` | Khung scope hero danh mục |
| Thẻ chủ đề xuất hiện, LED chạy, popover, biến | `css/pages/prism.css` | keyframes `pz-card-in` (trễ theo `--i`), `pz-blink`, `pz-pop`, `pz-var-in` | Danh mục và trình phát V-Prism |
| Thước đo và dải quang phổ | `css/pages/prism.css` | `repeating-linear-gradient` (thước), `linear-gradient` 5 màu (`.pz-spectrum`) | Hero, đầu nhóm, khung màn hình |

Các trang có hoạt ảnh trong phạm vi (trang chủ, Học, Đấu trường, Lớp học, V-Prism) đều có nhánh giảm chuyển động: kiểm tra `prefers-reduced-motion` trong JS (`prefersReducedMotion`, `Player.reduced`, `mountMiniSort`, `createHero3D`) và khối `@media (prefers-reduced-motion: reduce)` trong CSS tắt hoạt ảnh.

## PHẦN 6. QUY TRÌNH TẠO RA SẢN PHẨM, KIỂM THỬ & TRIỂN KHAI

### 6.1. Các bước xây dựng hệ thống từ đầu đến khi hoàn thiện

Quá trình phát triển được ghi nhận qua mã nguồn hiện tại và thư mục lưu trữ `archive/legacy-v25/` (toàn bộ mã nguồn phiên bản cũ cùng các script nâng cấp `upgrade_vcode_v6.py` … `upgrade_vcode_v24.py`, `fix_*.py`).

| Giai đoạn | Nội dung chính | Kết quả / dấu vết trong dự án |
|---|---|---|
| 1. Phiên bản cũ (v2.5 trở về trước) | Ứng dụng một trang lớn (`index.html` ~77 KB, `js/app.js` ~138 KB) được vá dần bằng nhiều script Python sinh mã; mật khẩu email so khớp trực tiếp trong Firestore; backend FastAPI + SQLite có tài khoản mặc định yếu. | Giữ nguyên trong `archive/legacy-v25/` (kèm bản sao CSDL) để tham chiếu, không xóa. |
| 2. Phân tích & thiết kế lại kiến trúc | Đọc toàn bộ mã cũ, xác định chức năng cần giữ; chọn kiến trúc mô-đun ES Modules không cần build, giữ nguyên dự án Firebase `v-code-edu` và khóa tài liệu `users/{emailKey}` để không mất dữ liệu người dùng. | `docs/ARCHITECTURE.md`, cấu trúc `js/core`, `js/services`, `js/components`, `js/pages`, `js/runtime`. |
| 3. Xây dựng lõi frontend | Router hash tải trang theo nhu cầu, kho trạng thái + bus sự kiện, bộ công cụ DOM an toàn (chống XSS), hệ thống thiết kế (token sáng/tối). | `js/core/*`, `css/tokens.css`, `css/base.css`, `css/components.css`. |
| 4. Xác thực & dữ liệu | Firebase Authentication (Email/Mật khẩu, Google), di trú tài khoản cũ bằng bằng chứng băm mật khẩu kiểm tra phía máy chủ qua luật Firestore; tiến độ học "local-first" đồng bộ theo trường; luật bảo mật mới. | `js/services/auth.js`, `progress.js`, `firestore.rules`. |
| 5. Bộ chạy mã & chấm bài | Worker cho Python (Pyodide), C/C++ (JSCPP), SQL (sql.js), JavaScript; xem trước HTML; Python Tiếng Việt; chấm theo test có chuẩn hóa Unicode NFC, thang 10, giới hạn thời gian. | `js/runtime/*`, `tools/validate_content.py`. |
| 6. Nội dung học tập | Biên soạn lại 6 khóa học (104 bài) và 100 thử thách, kiểm tra tự động bằng cách chạy lời giải mẫu. | `data/`, `tools/build_catalog.py`, `tools/validate_*.py`. |
| 7. Backend AI an toàn | Cổng AI FastAPI truyền dữ liệu dạng SSE, nhiều nhà cung cấp, xác minh Firebase ID token (RS256), giới hạn lượt theo phút/ngày, phục vụ frontend theo danh sách trắng. | `backend/`, `.env.example`, `docs/BACKEND.md`. |
| 8. Lăng kính thuật toán | Bộ máy mô phỏng từng bước 14 chủ đề, mã nguồn Python/C++/JS, độ phức tạp, dữ liệu tự nhập. | `js/pages/prism/**`. |
| 9. Ngoại tuyến | Service Worker có chiến lược bộ nhớ đệm theo loại tài nguyên, IndexedDB, bộ nhớ đệm Firestore. | `sw.js`, `js/core/idb.js`, `tools/update_sw_precache.py`. |
| 10. Thiết kế lại giao diện toàn diện (v3.1) | Mỗi khu vực một bản sắc riêng: trang chủ 3D (Three.js) 7 cảnh; hộp thoại đăng nhập khôi phục phong cách cũ; khóa học dạng thẻ màu như bản cũ; IDE chuyên nghiệp có giao diện editor riêng, bảng lỗi, nhiều tệp; khôi phục **Lưu đồ** và **Scratch Live**; Đấu trường kiểu sảnh game; Lớp học kiểu SaaS; Lăng kính kiểu phòng thí nghiệm; Trợ lý AI kiểu cực quang; chỉ báo Online/Ngoại tuyến; robot V-Mentor nổi kéo thả. | `css/pages/*`, `js/pages/*`, `js/components/flowchart/`, `js/components/scratch/`, `js/components/vbot.js`. |
| 11. Kiểm thử & sửa lỗi | Kiểm thử backend (pytest) và kiểm thử giao diện thật trên Microsoft Edge (Playwright) cho từng khu vực; chụp ảnh màn hình sáng/tối, máy tính/điện thoại để rà soát. | `backend/tests/`, `tests/e2e/`. |
| 12. Chuẩn bị triển khai | Hỗ trợ hosting tĩnh (nhận diện GitHub Pages… và báo rõ khi thiếu máy chủ AI), cấu hình địa chỉ máy chủ AI, hướng dẫn bật Email/Password trên Firebase Console. | `js/config.js` (`DEFAULT_API_BASE`, `isStaticHost`), `README.md`. |

**Sự cố thực tế đã phát hiện và xử lý trong quá trình làm (tiêu biểu)**

- Đăng nhập email báo "chưa được bật": nguyên nhân là phiên bản cũ chưa từng dùng Firebase Authentication cho email (chỉ dùng cho Google) nên phương thức Email/Password chưa được bật trong Firebase Console. Hộp thoại đăng nhập được thiết kế để hiển thị hướng dẫn khắc phục cụ thể theo mã lỗi `auth/operation-not-allowed`.
- Firebase không chấp nhận tên miền `127.0.0.1` cho đăng nhập Google → hộp thoại gợi ý mở bằng `localhost`.
- Trợ lý AI trên GitHub Pages trả lỗi 405 vì hosting tĩnh không có máy chủ `/api` → bổ sung nhận diện hosting tĩnh và thông báo hướng dẫn triển khai backend.
- `Vary: Origin` làm Service Worker không khớp bộ nhớ đệm khi ngoại tuyến → dùng `ignoreVary: true`.
- JSCPP cần đối tượng `document` trong Worker → tạo đối tượng giả tạm thời; chấm bài lệch do dấu tiếng Việt → chuẩn hóa NFC.

### 1. Yêu cầu môi trường

| Thành phần | Yêu cầu (theo mã nguồn/tài liệu) |
|---|---|
| Python | Môi trường ảo `.venv` ở thư mục gốc. Phiên bản tối thiểu không được ghi rõ trong tài liệu; mã nguồn dùng cú pháp `str | None`, `dataclass`, `asyncio.timeout()` (có từ Python 3.11) nên cần Python ≥ 3.11. Các tệp `__pycache__` hiện có cho thấy máy phát triển dùng CPython 3.13 |
| Thư viện backend | `backend/requirements.txt`: `fastapi>=0.111.0`, `uvicorn>=0.30.0`, `sqlalchemy>=2.0.30`, `pydantic>=2.7.0`, `httpx>=0.27.0`, `cryptography>=42.0.0`; tùy chọn `pymysql>=1.1.1` (MySQL), `psycopg2-binary>=2.9.9` (PostgreSQL) |
| Thư viện kiểm thử | `backend/requirements-dev.txt`: `pytest>=8.0`; kiểm thử E2E và `tools/validate_cpp_content.py` cần thêm `playwright` (README: `pip install pytest playwright`) |
| Trình duyệt cho E2E | Microsoft Edge của hệ thống (`p.chromium.launch(channel="msedge")`); `validate_cpp_content.py` thử lần lượt msedge → chrome → chromium |
| Frontend | HTML/CSS/JS thuần, ES modules, **không có bước build** (README, `docs/ARCHITECTURE.md`) |
| Dịch vụ ngoài | Firebase Authentication + Firestore (dự án `v-code-edu`); tùy chọn: khóa API Gemini/OpenAI/Anthropic hoặc Ollama cục bộ |

### 2. Cài đặt và chạy cục bộ

Cách khuyến nghị (README §1 — một lệnh, một địa chỉ), chạy trong PowerShell từ thư mục gốc dự án:

```powershell
python -m venv .venv
.\.venv\Scripts\pip install -r backend\requirements.txt
copy .env.example .env          # rồi điền khóa AI (không bắt buộc)
.\.venv\Scripts\python -m uvicorn backend.main:app --port 8000
```

- Mở `http://localhost:8000`: backend phục vụ cả frontend lẫn API (`SERVE_FRONTEND=1` mặc định).
- Kiểm tra sức khỏe: `http://localhost:8000/api/health`; tài liệu API tương tác: `http://localhost:8000/api/docs`.
- Chế độ phát triển có tự nạp lại (docs/BACKEND.md): `uvicorn backend.main:app --reload --port 8000`.
- Khi khởi động, `lifespan` tự chạy migration (tạo `schema_meta`, `ai_usage` nếu chưa có) — không cần bước khởi tạo CSDL thủ công.

Cách chỉ chạy giao diện (không có AI đám mây): mở thư mục bằng VS Code Live Server (cổng 5500 theo `.vscode/settings.json`) hoặc `python -m http.server`. Theo README, frontend tự gọi backend tại `http://localhost:8000` và có thể đổi trong *Tài khoản → Giao diện & AI → Máy chủ V-Code*; origin `http://localhost:5500` đã có sẵn trong CORS mặc định.

Lưu ý từ README: Service Worker chỉ hoạt động trên `localhost` hoặc HTTPS; Firebase không cho phép `127.0.0.1` cho đăng nhập — hãy mở bằng `localhost`.

### 3. Cấu hình môi trường

1. Sao chép `.env.example` thành `.env` ở thư mục gốc (tệp `.env` bị `.gitignore` chặn, không commit).
2. Điền ít nhất một nhà cung cấp AI nếu muốn dùng V-Mentor: `GEMINI_API_KEY`, `OPENAI_API_KEY` (có thể kèm `OPENAI_BASE_URL` cho máy chủ tương thích), `ANTHROPIC_API_KEY`, hoặc cài Ollama (`ollama pull qwen2.5:3b`) với `OLLAMA_ENABLED=1`, `OLLAMA_BASE_URL`. Không có nhà cung cấp nào → API trả `503 no_provider` kèm hướng dẫn (không có câu trả lời giả).
3. Điều chỉnh hạn mức: `AI_RATE_PER_MINUTE`, `AI_DAILY_LIMIT_USER`, `AI_DAILY_LIMIT_GUEST`; thứ tự ưu tiên `AI_PROVIDER_ORDER`.
4. Khi frontend chạy ở tên miền khác backend: thêm origin đó vào `ALLOWED_ORIGINS` (phân tách bằng dấu phẩy; khi đặt biến này, danh sách mặc định bị thay thế hoàn toàn).
5. Khi chạy sau reverse proxy tin cậy: `TRUST_PROXY=1` để hạn mức khách tính theo IP thật trong `X-Forwarded-For`.
6. Biến môi trường thật của hệ điều hành/dịch vụ hosting luôn ghi đè giá trị trong `.env`.

Danh sách đầy đủ 30 biến xem phần dữ liệu & lưu trữ (A_p4) hoặc `docs/BACKEND.md` §3.

### 4. Cấu hình Firebase Console (làm một lần — README §2)

1. **Authentication → Sign-in method**: bật **Email/Password** và **Google**. (README: nếu đăng nhập email báo "chưa được bật" thì cần bật mục này; tài khoản cũ được nâng cấp tự động ở lần đăng nhập đầu.)
2. **Authentication → Settings → Authorized domains**: thêm tên miền triển khai frontend (`localhost` có sẵn).
3. **Firestore → Rules**: dán nội dung `firestore.rules` rồi **Publish**, hoặc dùng Firebase CLI `firebase deploy --only firestore:rules` (tệp `firebase.json` đã khai báo `firestore.rules` và `firestore.indexes.json`). README cảnh báo: nếu chưa triển khai rules mới, dữ liệu vẫn chạy với rules cũ nhưng không được bảo vệ.
4. Backend chỉ cần biết mã dự án (`FIREBASE_PROJECT_ID=v-code-edu`) để xác minh ID token; không cần tệp khóa dịch vụ (không dùng `firebase-admin`).

### 5. Danh sách kiểm thử tự động

Số liệu dưới đây được đếm trực tiếp từ mã nguồn (`def test_`) và đối chiếu bằng `pytest --collect-only` (chỉ thu thập, không chạy). "Trường hợp" là số mục pytest sinh ra sau khi mở rộng `@pytest.mark.parametrize`.

**5.1. Bộ kiểm thử backend (`backend/tests`) — không cần server, không cần mạng**

| Tệp | Số hàm `def test_` | Số trường hợp | Tham số hóa | Nội dung chính |
|---|---|---|---|---|
| `backend/tests/test_chat.py` | 14 | 14 | Không (một bài lặp 10 payload bên trong vòng `for`) | Luồng SSE, ngữ cảnh, dự phòng nhà cung cấp, 503/400/422, chuẩn hóa tin nhắn |
| `backend/tests/test_export_script.py` | 1 | 1 | Không | Xuất dữ liệu cũ loại bỏ cột bí mật |
| `backend/tests/test_health_and_providers.py` | 5 | 5 | Không | `/api/health`, `/api/ai/providers`, header bảo mật, CORS, `.env` |
| `backend/tests/test_legacy_db.py` | 3 | 3 | Không (2 bài tự `skip` nếu không có `vcode_edu.db`) | Không làm thay đổi bảng cũ, migration lũy đẳng |
| `backend/tests/test_providers.py` | 9 | 9 | Không | Định dạng giao tiếp Gemini/OpenAI/Anthropic/Ollama, timeout, hủy |
| `backend/tests/test_ratelimit.py` | 8 | 8 | Không | Giới hạn phút, hạn mức ngày, `X-Forwarded-For` |
| `backend/tests/test_security.py` | 11 | 16 | Có: `test_invalid_claims` × 6 | Xác minh token, 401, xử lý khi offline |
| `backend/tests/test_static.py` | 6 | 18 | Có: `test_everything_else_is_404` × 13 | Danh sách trắng tệp tĩnh, MIME, header Service Worker |
| **Tổng backend** | **57** | **74** | | Khớp con số "74 test backend" trong README |

`backend/tests/conftest.py` không chứa bài kiểm thử (chỉ fixture/tiện ích).

**5.2. Bộ kiểm thử E2E và nội dung (`tests/e2e`)**

| Tệp | Số hàm `def test_` | Số trường hợp | Tham số hóa | Điều kiện chạy |
|---|---|---|---|---|
| `tests/e2e/test_app.py` | 18 | 30 | Có: `test_routes_render_without_errors` × 10 route, `test_workspace_runs_languages` × 4 ngôn ngữ | Cần server ở `http://localhost:8000` (hoặc `VCODE_BASE_URL`), Edge |
| `tests/e2e/test_challenges.py` | 5 | 5 | Không | Cần server cổng 8000, Edge |
| `tests/e2e/test_classroom.py` | 4 | 4 | Không | Cần server cổng 8000, Edge; Firebase giả lập |
| `tests/e2e/test_ide.py` | 13 | 13 | Không | Cần server cổng 8000, Edge |
| `tests/e2e/test_cpp_content.py` | 2 | 2 | Không (bài thứ nhất `skipif` khi chưa cài playwright) | Tự chạy `tools/validate_cpp_content.py`; không cần server 8000 |
| `tests/e2e/test_web_lessons.py` | 3 | 65 | Có: 2 hàm × (số bài web × 2 chế độ `same-origin`/`sandbox`) + 1 hàm thường; với số trường hợp thu thập được là 65 thì khóa web hiện có 16 bài (2 × 16 × 2 + 1) | Tự chạy `python -m http.server 5602`; Edge; `importorskip` playwright |
| **Tổng E2E** | **45** | **119** | | Khớp con số "e2e 119/119" trong README |

**Tổng toàn dự án: 102 hàm kiểm thử, 193 trường hợp kiểm thử khi thu thập (74 backend + 119 E2E/nội dung).** README ghi kết quả lần chạy cuối (25/11/2026, bản 3.1): backend 74/74, e2e 119/119 (một test bị timeout tải trang do mạng ở lần chạy đầu, chạy lại đạt). Kết quả này được trích từ README; tài liệu này không chạy lại các bài kiểm thử.

**5.3. Công cụ kiểm tra không thuộc pytest**

| Công cụ | Lệnh | Kết quả |
|---|---|---|
| `tools/validate_content.py` | `.\.venv\Scripts\python tools/validate_content.py` (tùy chọn `--course <id>`, `--run-challenges`, `--no-run`) | In thống kê, lỗi/cảnh báo; mã thoát 1 nếu có lỗi |
| `tools/validate_cpp_content.py` | `.\.venv\Scripts\python.exe tools/validate_cpp_content.py [--only courses|challenges] [--browser msedge|chrome|chromium] [--skip-jscpp] [-v]` | `ALL CHECKS PASSED` hoặc `FAILED with N error(s)` |

### 6. Cách chạy từng bộ kiểm thử

```powershell
# Cài công cụ kiểm thử
.\.venv\Scripts\pip install -r backend\requirements-dev.txt
.\.venv\Scripts\pip install playwright

# 1) Backend (không cần server)
.\.venv\Scripts\python -m pytest backend/tests -q

# 2) E2E giao diện — chạy server trước ở cửa sổ khác:
.\.venv\Scripts\python -m uvicorn backend.main:app --port 8000
.\.venv\Scripts\python -m pytest tests/e2e/test_app.py -q
.\.venv\Scripts\python -m pytest tests/e2e/test_challenges.py -q
.\.venv\Scripts\python -m pytest tests/e2e/test_classroom.py -q
.\.venv\Scripts\python -m pytest tests/e2e/test_ide.py -q

# 3) Kiểm thử nội dung (tự dựng server tĩnh riêng)
.\.venv\Scripts\python -m pytest tests/e2e/test_web_lessons.py tests/e2e/test_cpp_content.py -q

# 4) Toàn bộ E2E
.\.venv\Scripts\python -m pytest tests/e2e -q

# 5) Kiểm tra nội dung Python (chạy lời giải mọi bài)
.\.venv\Scripts\python tools/validate_content.py
```

Ghi chú:
- Có thể trỏ E2E tới server khác bằng biến `VCODE_BASE_URL` (ví dụ `$env:VCODE_BASE_URL = 'http://localhost:8001'`).
- `test_classroom.py` import `firebase_mock` theo tên mô-đun trần; tệp `tests/e2e` không có `conftest.py` hay `__init__.py`, nên việc import dựa vào chế độ import mặc định (`prepend`) của pytest — chèn thư mục chứa tệp kiểm thử vào `sys.path`.
- Kiểm thử E2E không đăng nhập và không ghi vào Firebase thật (ghi rõ trong docstring các tệp); ảnh chụp lưu ở `tests/e2e/screenshots/`.
- Kiểm thử backend dùng CSDL tạm; `test_legacy_db.py` chỉ **sao chép** `vcode_edu.db` rồi làm việc trên bản sao.

### 7. Quy trình cập nhật nội dung và tài nguyên ngoại tuyến

1. Sửa/thêm khóa học trong `data/courses/<id>.json` theo lược đồ ở `docs/ARCHITECTURE.md` §3.
2. Chạy `python tools/build_catalog.py` để sinh lại `data/courses/index.json` (danh mục trang Học, đồng thời là nguồn để Service Worker precache các tệp khóa học).
3. Chạy `python tools/validate_content.py` và `python tools/validate_cpp_content.py` (hoặc các bài pytest tương ứng) để bảo đảm lời giải đạt và khung bài chưa đạt.
4. Khi thêm tệp JS/CSS mới: chạy `.\.venv\Scripts\python tools/update_sw_precache.py v3.1.0` (thay bằng số phiên bản mới) để cập nhật danh sách `SHELL` trong `sw.js`. Công cụ dừng với "Missing files" nếu danh sách trỏ tới tệp không tồn tại. Đổi `VERSION` làm đổi tên cache `vcode-shell-*`/`vcode-assets-*`, nên trình duyệt người dùng tải lại vỏ ứng dụng và xóa cache cũ khi Service Worker mới kích hoạt.

### 8. Triển khai

**8.1. Mô hình triển khai**

Hệ thống gồm hai phần có thể triển khai tách rời:
- **Frontend tĩnh** (không build): `index.html`, `sw.js`, `manifest.json`, `css/`, `js/`, `data/`, `assets/`, `vendor/`, `docs/`.
- **Backend FastAPI** (cổng AI + tùy chọn phục vụ frontend): cần môi trường Python, giữ khóa API và CSDL hạn mức.

**8.2. Phương án A — một máy chủ phục vụ cả hai**

- Lệnh (docs/BACKEND.md): VPS `uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 2` sau Nginx/Caddy có HTTPS, đặt `TRUST_PROXY=1`. Với nhiều worker, hạn mức theo phút tính riêng cho từng worker; hạn mức theo ngày dùng chung (lưu trong CSDL).
- Render / Railway / Fly.io: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`; đặt biến môi trường trong bảng điều khiển dịch vụ, `TRUST_PROXY=1`.
- Mạng LAN trường học (Ollama, không Internet): cài Ollama trên máy chủ, `ollama pull qwen2.5:3b` (cần Internet một lần), chạy backend; học sinh mở `http://<ip-máy-chủ>:8000` và chọn chế độ "AI cục bộ". Khi máy chủ không tải được khóa Google, người dùng đăng nhập được xử lý như khách.
- Backend tự chặn mọi tệp ngoài danh sách trắng (`vcode_edu.db`, `.env`, `backend/`, `archive/`, `tools/`, `tests/`…), nên có thể đặt nguyên thư mục dự án trên máy chủ.

**8.3. Phương án B — frontend trên hosting tĩnh, backend ở nơi khác**

- **Firebase Hosting** (có cấu hình sẵn trong `firebase.json`): `hosting.public: "."` và danh sách `ignore` loại `backend/**`, `archive/**`, `tools/**`, `tests/**`, `*.db`, `*.db-*`, `.env*`, tệp ẩn; header `no-cache` cho `/sw.js`, `public, max-age=3600` cho JS/CSS/JSON/WASM. Origin `https://v-code-edu.web.app` và `https://v-code-edu.firebaseapp.com` đã có trong `ALLOWED_ORIGINS` mặc định. Lệnh deploy hosting cụ thể không được ghi trong tài liệu (chỉ có lệnh `firebase deploy --only firestore:rules`); không xác định từ mã nguồn.
- **GitHub Pages hoặc hosting tĩnh khác**: mã nguồn và tài liệu **không** có cấu hình hay hướng dẫn GitHub Pages (không xác định từ mã nguồn). Các điểm cần lưu ý suy ra từ mã:
  1. Frontend dùng đường dẫn tương đối (`./`, `start_url: "./#/"`, `scope: "./"`) và định tuyến bằng hash, nên về nguyên tắc chạy được dưới đường dẫn con, không cần cấu hình rewrite.
  2. Hosting tĩnh không có cơ chế danh sách trắng như `backend/static.py`/`firebase.json`; khi xuất bản cần tự loại `vcode_edu.db*`, `.env`, `backend/`, `archive/`, `tools/`, `tests/` (`.gitignore` đã chặn `*.db`, `.env`, nhưng `README.md` lưu ý `vcode_edu.db` từng bị Git theo dõi — cần `git rm --cached vcode_edu.db`).
  3. Thêm origin của trang (ví dụ dạng `https://<tài-khoản>.github.io`) vào `ALLOWED_ORIGINS` của backend; nếu không, trình duyệt chặn lời gọi `/api/ai/*` do CORS.
  4. Thêm tên miền đó vào Firebase **Authorized domains**.
  5. Cấu hình địa chỉ backend trong phần cài đặt của frontend (README: *Tài khoản → Giao diện & AI → Máy chủ V-Code*). Backend nên chạy HTTPS (docs/BACKEND.md: "Luôn dùng HTTPS khi triển khai thật") vì trang HTTPS không thể gọi API HTTP.
  6. Sau mỗi lần thêm tệp JS/CSS, chạy `tools/update_sw_precache.py` trước khi xuất bản để bản ngoại tuyến đầy đủ.

**8.4. Danh mục kiểm tra trước khi đưa vào sử dụng**

| Hạng mục | Thao tác | Nguồn |
|---|---|---|
| Khóa API | Chỉ đặt trong biến môi trường/`.env` máy chủ; không bao giờ ở frontend | `.env.example`, docs/BACKEND.md §6 |
| CORS | `ALLOWED_ORIGINS` chứa đúng tên miền frontend | `backend/main.py`, `backend/core/config.py` |
| Proxy | `TRUST_PROXY=1` chỉ khi sau reverse proxy tin cậy | `.env.example` |
| HTTPS | Bắt buộc khi triển khai thật (token đi kèm mỗi yêu cầu; Service Worker cần HTTPS) | docs/BACKEND.md §5, README §1 |
| Firestore rules | Publish `firestore.rules` | README §2 |
| Firebase Auth | Bật Email/Password + Google, thêm Authorized domains | README §2 |
| CSDL | SQLite cho một máy chủ; nhiều máy dùng PostgreSQL/MySQL qua `DATABASE_URL` | docs/BACKEND.md §5 |
| Dữ liệu cũ | Không commit `vcode_edu.db`, tệp xuất JSON; đổi/xóa tài khoản mặc định yếu nếu khôi phục mã cũ | README §6, `.gitignore` |
| Service Worker | Chạy `tools/update_sw_precache.py <phiên-bản>` khi thêm tệp | README §5 |
| Kiểm thử | Backend 74/74, E2E 119/119 | README §5 |

### 9. Danh sách endpoint của backend

Xác thực trong backend là **tùy chọn**: header `Authorization: Bearer <Firebase ID token>`. Không có token → khách (hạn mức theo IP); token sai/hết hạn → 401; không endpoint nào **bắt buộc** đăng nhập.

| Phương thức | Đường dẫn | Mục đích | Yêu cầu xác thực |
|---|---|---|---|
| GET | `/api/health` | Trạng thái dịch vụ, phiên bản, thời gian UTC, trạng thái sẵn sàng từng nhà cung cấp AI | Không |
| GET | `/api/ai/providers` | Danh sách nhà cung cấp (`id, label, kind, model, available`), nhà cung cấp mặc định, 7 chế độ | Không |
| GET | `/api/ai/usage` | Hạn mức AI của người gọi: `limit, used, remaining, subject (user/guest), reset_at` | Tùy chọn (Bearer token → hạn mức người dùng; không có → khách; token sai → 401) |
| POST | `/api/ai/chat` | Gửi hội thoại, nhận câu trả lời dạng luồng SSE (`meta` → `delta` → `done`/`error`); lỗi trước khi mở luồng trả JSON 400/401/422/429/503 | Tùy chọn (như trên) |
| OPTIONS | `/api/...` (preflight CORS) | Do `CORSMiddleware` xử lý cho các origin trong `ALLOWED_ORIGINS` | Không |
| GET | `/api/docs` | Swagger UI tài liệu API tương tác | Không |
| GET | `/api/openapi.json` | Lược đồ OpenAPI | Không |
| GET | `/` | Trả `index.html` (khi `SERVE_FRONTEND=1`) | Không |
| GET | `/index.html` | Trả `index.html` | Không |
| GET | `/manifest.json` | Web App Manifest (`application/manifest+json`) | Không |
| GET | `/sw.js` | Service Worker (`Cache-Control: no-cache`, `Service-Worker-Allowed: /`) | Không |
| GET | `/css/{path}` | Tệp tĩnh thư mục `css/` | Không |
| GET | `/js/{path}` | Tệp tĩnh thư mục `js/` | Không |
| GET | `/data/{path}` | Dữ liệu khóa học, thử thách (JSON) | Không |
| GET | `/assets/{path}` | Hình ảnh, icon | Không |
| GET | `/vendor/{path}` | Thư viện chạy offline (JSCPP, sql.js) | Không |
| GET | `/docs/{path}` | Tài liệu Markdown (`text/markdown`) | Không |

Tổng: 4 endpoint API nghiệp vụ, 2 endpoint tài liệu, 4 route tệp gốc và 6 thư mục tĩnh được mount (16 mục, chưa tính preflight OPTIONS). Mọi đường dẫn khác trả 404.

## PHẦN 7. THỐNG KÊ NHANH CHO BÁO CÁO

### 7.1. Các con số chính

| Chỉ số | Giá trị |
|---|---|
| **Tổng số file** | 312 |
| Trong đó: JavaScript (.js) | 144 |
| Trong đó: Python (.py) | 110 |
| Trong đó: CSS (.css) | 17 |
| Trong đó: JSON (.json) | 15 |
| Trong đó: Markdown & khác | 26 |
| **Tổng dòng code** | ~38.737 (không tính test, build, cache) |
| **Khóa học** | 6 (Python Tiếng Việt, Python, Web, C, C++, AI) |
| **Bài học & thực hành** | 104 |
| **Thử thách Đấu trường** | 100 |
| **Chủ đề Prism** | 14 |
| **Kiểm thử backend** | 74 test cases |
| **Kiểm thử e2e** | 119 test cases |
| **Nhà cung cấp AI** | 4 (Gemini, OpenAI, Anthropic, Ollama) |
| **Chế độ hỏi đáp AI** | 7 (Giải thích, Chỉ gợi ý, Hướng dẫn, Code review, Debug, Bài học, Tính toán) |

### 7.2. Phân bổ file theo loại

| Loại file | Số lượng |
|---|---|
| .js (JavaScript) | 144 |
| .py (Python) | 110 |
| .css (Stylesheet) | 17 |
| .json (JSON config/data) | 15 |
| .md (Markdown) | 8 |
| .html (HTML) | 4 |
| .rules (Firestore rules) | 2 |
| Các file khác | 12 |
| **TỔNG** | **312** |

### 7.3. Phân bổ file theo thư mục cấp cao nhất

| Thư mục | Số file | Vai trò |
|---|---|---|
| js/ | 144 | Frontend, logic giao diện, dịch vụ, bộ chạy |
| css/ | 17 | Stylesheet toàn ứng dụng và từng trang |
| ackend/ | 110 | Server FastAPI, xác thực, giới hạn lượt, kết nối nhà cung cấp AI |
| data/ | 12 | Khóa học, bài học, thử thách, Prism, nội dung JSON |
| ssets/ | 18 | Icon, logo, hình ảnh, font, thư viện vendor |
| Gốc (root) | 11 | Config (Firebase, Firestore rules, .gitignore, README, etc.) |


---
**Ghi chú cuối:** Báo cáo này được tạo tự động từ mã nguồn thực tế ngày 25/11/2026. Các số liệu được kiểm chứng bằng công cụ glob, đếm dòng code thực và kết quả kiểm thử. Báo cáo không chứa bất kỳ thông tin nhạy cảm hoặc khóa API.