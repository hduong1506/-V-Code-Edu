# V-Code Edu 3.0 — Giáo dục · Công nghệ · Tương lai

Nền tảng học lập trình, thuật toán và trí tuệ nhân tạo cho học sinh Việt Nam. Ứng dụng web tiến bộ (PWA) chạy được **cả trực tuyến lẫn ngoại tuyến**.

| Thành phần | Công nghệ |
|---|---|
| Frontend | HTML/CSS/JS thuần, ES modules, **không cần bước build** |
| Đăng nhập & dữ liệu đám mây | **Firebase Authentication + Firestore** (giữ nguyên project `v-code-edu`) |
| Backend | FastAPI — cổng AI (Gemini / OpenAI / Anthropic / Ollama), xác thực Firebase ID token, giới hạn lượt dùng, phục vụ frontend |
| Chạy code | Python → Pyodide · C/C++ → JSCPP · SQL → sql.js (SQLite) · JS → Web Worker · HTML/CSS → iframe sandbox |
| Ngoại tuyến | Service Worker + IndexedDB + bộ nhớ đệm Firestore |

Kiến trúc chi tiết: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · Backend & biến môi trường: [docs/BACKEND.md](docs/BACKEND.md)

## 1. Chạy nhanh (khuyến nghị: một lệnh, một địa chỉ)

```powershell
cd "V-Code Edu"
python -m venv .venv
.\.venv\Scripts\pip install -r backend\requirements.txt
copy .env.example .env          # rồi điền khóa AI (không bắt buộc)
.\.venv\Scripts\python -m uvicorn backend.main:app --port 8000
```

Mở **http://localhost:8000** — backend phục vụ luôn frontend và API (`/api/...`, tài liệu API tại `/api/docs`).

Chỉ cần giao diện (không AI đám mây): mở thư mục bằng VS Code **Live Server** (cổng 5500) hoặc `python -m http.server`. Frontend tự gọi backend tại `http://localhost:8000`; có thể đổi trong *Tài khoản → Giao diện & AI → Máy chủ V-Code*.

> Service Worker (chế độ offline) chỉ hoạt động trên `localhost` hoặc HTTPS.

## 2. Cấu hình bắt buộc phía Firebase (làm một lần trong Firebase Console)

1. **Authentication → Sign-in method**: bật **Email/Password** và **Google**.
2. **Authentication → Settings → Authorized domains**: thêm tên miền triển khai (localhost có sẵn).
3. **Firestore → Rules**: dán nội dung [firestore.rules](firestore.rules) rồi **Publish** (hoặc `firebase deploy --only firestore:rules`). *Nếu chưa triển khai rules mới, dữ liệu vẫn chạy với rules cũ nhưng không được bảo vệ.*

## 3. Biến môi trường AI (file `.env`, chỉ nằm trên máy chủ)

| Biến | Ý nghĩa |
|---|---|
| `GEMINI_API_KEY` / `GEMINI_MODEL` | Google Gemini (mặc định `gemini-2.5-flash`) |
| `OPENAI_API_KEY` / `OPENAI_MODEL` / `OPENAI_BASE_URL` | OpenAI hoặc máy chủ tương thích |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Claude (mặc định `claude-opus-5-5`; rẻ hơn: `claude-sonnet-5-5`, `claude-haiku-5-5`) |
| `OLLAMA_ENABLED` / `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | AI cục bộ cho phòng máy không có Internet |
| `AI_PROVIDER_ORDER` | Thứ tự thử nhà cung cấp |
| `AI_DAILY_LIMIT_USER` / `AI_DAILY_LIMIT_GUEST` / `AI_RATE_PER_MINUTE` | Hạn mức sử dụng |
| `ALLOWED_ORIGINS` | Danh sách origin được gọi API |

Danh sách đầy đủ: [.env.example](.env.example), [docs/BACKEND.md](docs/BACKEND.md). Không có khóa nào thì AI báo lỗi rõ ràng — **không có câu trả lời giả**.

## 4. Cấu trúc thư mục

```
index.html, sw.js, manifest.json     Vỏ ứng dụng, Service Worker, PWA
css/                                  tokens (sáng/tối) · base · components · pages/*
js/core/                              router, store, dom, theme, idb, net, ui
js/services/                          firebase, auth (+ di trú tài khoản cũ), progress, classroom, conversations, ai-client, local-ai
js/runtime/                           runner + worker cho từng ngôn ngữ, pyvn, html-checks
js/components/                        editor, highlight, markdown, chat, ide (workbench), practice
js/pages/                             home, learn, course, lesson, challenges, workspace, ai, classroom, account, prism/*
data/                                 6 khóa học (104 bài), 100 thử thách, từ khóa Python Tiếng Việt
backend/                              FastAPI (core, ai/providers, routers, database, tests)
tools/                                build_catalog.py, validate_content.py, validate_cpp_content.py
tests/e2e/                            kiểm thử trình duyệt (Playwright + Edge)
vendor/                               JSCPP, sql.js (dùng offline)
archive/legacy-v25/                   Toàn bộ mã nguồn cũ + bản sao lưu CSDL (không xóa)
```

## 5. Kiểm thử

```powershell
.\.venv\Scripts\pip install pytest playwright
.\.venv\Scripts\python -m pytest backend/tests -q                       # 74 test backend
# chạy server ở cổng 8000 trước:
.\.venv\Scripts\python -m pytest tests/e2e/test_app.py -q                # 30 test giao diện (Edge)
.\.venv\Scripts\python -m pytest tests/e2e/test_web_lessons.py tests/e2e/test_cpp_content.py -q   # 67 test nội dung
.\.venv\Scripts\python tools/validate_content.py                         # chạy lời giải mọi bài Python
.\.venv\Scripts\python -m pytest tests/e2e -q                                 # toàn bộ e2e (app, IDE, thử thách, lớp học, nội dung)
.\.venv\Scripts\python tools/update_sw_precache.py v3.1.0                    # sau khi thêm file JS/CSS: cập nhật danh sách offline của Service Worker
```

Kết quả lần chạy cuối (25/11/2026, bản 3.1): **backend 74/74 · e2e 119/119** (1 test bị timeout tải trang do mạng ở lần chạy đầu, chạy lại đạt).

> Đăng nhập bằng email báo “chưa được bật”: phiên bản cũ chưa từng dùng Firebase Auth cho email. Vào **Firebase Console → Authentication → Sign-in method → bật Email/Password**; tài khoản cũ được nâng cấp tự động ở lần đăng nhập đầu, dữ liệu giữ nguyên. Firebase không cho phép `127.0.0.1` — hãy mở bằng `localhost`.

## 6. Bảo mật dữ liệu cũ

- `vcode_edu.db` được giữ nguyên (chỉ thêm bảng `ai_usage`, `schema_meta`); bản sao ở `archive/legacy-v25/`.
- File CSDL đã bị git theo dõi từ trước: chạy `git rm --cached vcode_edu.db` để gỡ khỏi repo (`.gitignore` đã chặn từ nay).
- Tài khoản `giaovien` trong CSDL cũ dùng mật khẩu mặc định yếu — backend mới không còn dùng bảng này, nhưng nên xóa/đổi nếu khôi phục mã cũ.
