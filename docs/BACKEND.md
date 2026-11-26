# V-Code Edu — Backend (FastAPI)

Backend đảm nhận hai việc:

1. **Cổng AI an toàn (V-Mentor)**: nhận câu hỏi từ trình duyệt, gọi nhà cung cấp AI (Gemini, OpenAI, Anthropic Claude hoặc Ollama cục bộ) và trả lời dạng luồng (SSE). **Khóa API chỉ nằm trên máy chủ**, không bao giờ xuất hiện trong mã frontend.
2. **Phục vụ frontend tĩnh** (tùy chọn): chỉ một lệnh `uvicorn` là chạy được toàn bộ nền tảng tại `http://localhost:8000`.

Dữ liệu người dùng, lớp học, tiến độ… nằm trên **Firebase (Auth + Firestore)**. Backend không lưu mật khẩu và không có API quản lý tài khoản; các API lớp học cũ (không có xác thực) đã được gỡ bỏ — bản lưu trữ ở `archive/legacy-v25/backend/`.

## 1. Cài đặt & chạy

```bash
# từ thư mục gốc dự án
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS / Linux
source .venv/bin/activate

pip install -r backend/requirements.txt
copy .env.example .env        # macOS/Linux: cp .env.example .env  → rồi điền khóa API

uvicorn backend.main:app --reload --port 8000
```

- Ứng dụng: http://localhost:8000
- Kiểm tra sức khỏe: http://localhost:8000/api/health
- Tài liệu API tương tác: http://localhost:8000/api/docs

Nếu chạy frontend riêng bằng Live Server (cổng 5500), backend vẫn chạy ở cổng 8000; origin `http://localhost:5500` đã được cho phép CORS sẵn.

### Kiểm thử

```bash
pip install -r backend/requirements-dev.txt
python -m pytest backend/tests -q
```

Kiểm thử luôn dùng CSDL SQLite tạm và nhà cung cấp AI giả lập — không chạm vào `vcode_edu.db` thật, không gọi API AI thật.

## 2. API

| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| GET | `/api/health` | `{ status, version, time, ai: { providers: [{ id, kind, available }] } }` |
| GET | `/api/ai/providers` | `{ providers: [{ id, label, kind, model, available }], default, modes: [{ id, label, description }] }` |
| GET | `/api/ai/usage` | `{ limit, used, remaining, subject: "user"|"guest", reset_at }` |
| POST | `/api/ai/chat` | Luồng Server-Sent Events (xem `docs/ARCHITECTURE.md` §5.1) |

- Header tùy chọn `Authorization: Bearer <Firebase ID token>`: người dùng đã đăng nhập được tính hạn mức theo tài khoản (cao hơn khách). Token sai → `401 invalid_token`; token hết hạn → `401 token_expired` (frontend nên làm mới token rồi gửi lại).
- Luồng SSE: `meta` → `delta` (nhiều lần) → `done`; nếu nhà cung cấp lỗi giữa chừng → `error`.
- Lỗi trước khi mở luồng trả JSON `{ "detail": { "code", "message" } }`: `422 bad_request`, `400 bad_request` (nhà cung cấp không tồn tại), `401`, `429 rate_limited` (kèm header `Retry-After`), `503 no_provider | provider_error | timeout`.
- Chế độ (`mode`): `tutor`, `reviewer`, `debugger`, `algorithm`, `learning`, `project`, `knowledge` — system prompt tiếng Việt nằm ở `backend/ai/prompts.py`.
- `provider`: `auto` (theo `AI_PROVIDER_ORDER`, tự chuyển sang nhà cung cấp kế tiếp nếu lỗi **trước** khi bắt đầu trả lời), `cloud`, `local` (Ollama) hoặc mã cụ thể (`gemini`, `openai`, `anthropic`, `ollama`).
- Không có câu trả lời "giả": nếu chưa cấu hình nhà cung cấp nào, API trả `503 no_provider` kèm hướng dẫn.

## 3. Biến môi trường

Đặt trong `.env` ở thư mục gốc dự án (xem `.env.example`) hoặc biến môi trường của máy chủ (được ưu tiên hơn `.env`).

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `APP_ENV` | `development` | Tên môi trường (thông tin) |
| `LOG_LEVEL` | `INFO` | Mức log (`DEBUG`, `INFO`, `WARNING`…) |
| `DATABASE_URL` | `sqlite:///<gốc>/vcode_edu.db` | SQLite / `mysql+pymysql://…` / `postgresql://…` (`postgres://`, `mysql://` được tự chuẩn hóa) |
| `FIREBASE_PROJECT_ID` | `v-code-edu` | Dự án Firebase dùng để xác minh ID token |
| `ALLOWED_ORIGINS` | localhost:5500, 127.0.0.1:5500, localhost:8000, 127.0.0.1:8000, v-code-edu.web.app, v-code-edu.firebaseapp.com | Origin được gọi API (phân tách bằng dấu phẩy) |
| `SERVE_FRONTEND` | `1` | Phục vụ frontend tĩnh |
| `FRONTEND_DIR` | thư mục gốc dự án | Nơi chứa `index.html` |
| `TRUST_PROXY` | `0` | `1` khi chạy sau reverse proxy tin cậy (đọc `X-Forwarded-For`) |
| `AI_PROVIDER_ORDER` | `gemini,openai,anthropic,ollama` | Thứ tự ưu tiên cho `auto` |
| `AI_RATE_PER_MINUTE` | `12` | Số câu hỏi tối đa mỗi phút / người dùng hoặc IP (mỗi tiến trình) |
| `AI_DAILY_LIMIT_USER` | `200` | Hạn mức/ngày cho người đã đăng nhập (theo Firebase uid) |
| `AI_DAILY_LIMIT_GUEST` | `30` | Hạn mức/ngày cho khách (theo IP); `0` = chặn khách |
| `AI_MAX_OUTPUT_TOKENS` | `2048` | Độ dài tối đa câu trả lời |
| `AI_TEMPERATURE` | `0.4` | Độ sáng tạo (Gemini/OpenAI/Ollama) |
| `AI_CONNECT_TIMEOUT` / `AI_READ_TIMEOUT` / `AI_TOTAL_TIMEOUT` | `10` / `60` / `120` | Thời gian chờ (giây) |
| `GEMINI_API_KEY` | _(trống)_ | Khóa Google AI Studio |
| `GEMINI_MODEL` | `gemini-3.5-flash` | Mô hình Gemini |
| `GEMINI_FALLBACK_MODELS` | `gemini-3.5-flash-lite,gemini-3.1-flash-lite` | Mô hình dự phòng khi mô hình chính quá tải (503), hết hạn mức (429) hoặc bị ngừng (404) |
| `GEMINI_BASE_URL` | `https://generativelanguage.googleapis.com/v1beta` | |
| `OPENAI_API_KEY` | _(trống)_ | Khóa OpenAI (hoặc máy chủ tương thích) |
| `OPENAI_MODEL` | `gpt-4o-mini` | |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | Đổi sang LM Studio/vLLM… nếu dùng máy chủ tương thích OpenAI |
| `OPENAI_TOKEN_PARAM` | `max_tokens` | `max_completion_tokens` cho các mô hình OpenAI mới yêu cầu |
| `ANTHROPIC_API_KEY` | _(trống)_ | Khóa Anthropic |
| `ANTHROPIC_MODEL` | `claude-opus-5-5` | Mạnh nhất; tiết kiệm chi phí hơn: `claude-sonnet-5-5`, `claude-haiku-5-5` |
| `ANTHROPIC_BASE_URL` | `https://api.anthropic.com` | |
| `OLLAMA_ENABLED` | `1` | Bật AI cục bộ |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Địa chỉ máy chạy Ollama |
| `OLLAMA_MODEL` | `qwen2.5:3b` | Mô hình cục bộ (hỗ trợ tiếng Việt khá tốt, chạy được trên máy không có GPU mạnh) |

## 4. Cấu hình nhà cung cấp AI

Chỉ cần **một** nhà cung cấp là trợ lý hoạt động. Có thể cấu hình nhiều để dự phòng.

- **Gemini**: tạo khóa tại Google AI Studio → `GEMINI_API_KEY=...`. Khóa được gửi qua header `x-goog-api-key` (không nằm trong URL nên không lộ vào log).
- **OpenAI**: `OPENAI_API_KEY=...`. Có thể trỏ `OPENAI_BASE_URL` tới máy chủ tương thích OpenAI.
- **Anthropic Claude**: `ANTHROPIC_API_KEY=...`; chọn mô hình bằng `ANTHROPIC_MODEL`.
- **Ollama (AI cục bộ / offline)** — phù hợp phòng máy trường học không có Internet:
  1. Cài Ollama trên máy chủ: https://ollama.com
  2. Tải mô hình (cần Internet một lần): `ollama pull qwen2.5:3b`
  3. Chạy backend trên cùng máy (hoặc đặt `OLLAMA_BASE_URL=http://<ip-máy-ollama>:11434`).
  4. Học sinh trong mạng LAN mở `http://<ip-máy-chủ>:8000` → chọn chế độ "AI cục bộ".

  Backend kiểm tra Ollama (`GET /api/tags`, chờ tối đa 1,5 giây, lưu kết quả 30 giây) và chỉ báo "sẵn sàng" khi mô hình đã được tải về.

> Lưu ý: AI đám mây (Gemini/OpenAI/Claude) **cần Internet**. Khi mất mạng, chỉ Ollama (trên máy chủ LAN) hoặc AI chạy ngay trong trình duyệt (tùy chọn ở frontend) còn hoạt động.

## 5. Triển khai

- **Render / Railway / Fly.io**: lệnh khởi động `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`. Đặt các biến môi trường trong bảng điều khiển của dịch vụ, đặt `TRUST_PROXY=1`, thêm tên miền frontend vào `ALLOWED_ORIGINS`.
- **VPS**: chạy `uvicorn backend.main:app --host 127.0.0.1 --port 8000 --workers 2` sau Nginx/Caddy có HTTPS. Bật `TRUST_PROXY=1`. Với nhiều worker, hạn mức theo phút tính riêng cho từng worker; hạn mức theo ngày dùng chung (lưu trong CSDL).
- **Frontend trên Firebase Hosting** (`v-code-edu.web.app`) + backend ở nơi khác: đã có sẵn trong `ALLOWED_ORIGINS` mặc định; cấu hình địa chỉ backend trong phần cài đặt của frontend.
- Luôn dùng **HTTPS** khi triển khai thật (token đăng nhập đi kèm mỗi yêu cầu).
- SQLite phù hợp cho một máy chủ; khi mở rộng nhiều máy, dùng PostgreSQL/MySQL qua `DATABASE_URL`.

## 6. Mô hình bảo mật

- **Khóa API**: chỉ đọc từ biến môi trường/`.env` trên máy chủ; không trả về trong bất kỳ API nào; không ghi vào log; thông báo lỗi của nhà cung cấp không chứa khóa.
- **Xác thực**: xác minh Firebase ID token theo chuẩn RS256 (khóa công khai của Google, lưu đệm theo `Cache-Control`), kiểm tra `aud`, `iss`, `exp`, `iat`, `auth_time`, `sub` (lệch đồng hồ tối đa 60 giây). Không có token → khách. Nếu máy chủ không tải được khóa của Google (mạng LAN offline), yêu cầu được xử lý như khách — không bao giờ nâng quyền.
- **Giới hạn sử dụng**: theo phút (bộ nhớ) + theo ngày (CSDL, bảng `ai_usage`). Chỉ tính khi nhà cung cấp thực sự bắt đầu trả lời.
- **Kiểm tra dữ liệu vào**: tối đa 40 tin nhắn, mỗi tin ≤ 12 000 ký tự, tổng ≤ 60 000 ký tự (tự cắt tin cũ nhất), chỉ vai trò `user`/`assistant`, tin cuối phải là `user`. Ngữ cảnh code/lỗi được đưa vào system prompt trong khối `<ngu_canh>` và được đánh dấu là dữ liệu, không phải mệnh lệnh.
- **Phục vụ tệp tĩnh theo danh sách trắng**: chỉ `/`, `/index.html`, `/manifest.json`, `/sw.js` và thư mục `css/ js/ data/ assets/ vendor/ docs/`. `vcode_edu.db`, `.env`, `backend/`, `archive/`, `.git/`, `.venv/`, `tools/`, `tests/` và mọi tệp ẩn đều trả 404.
- **Header bảo mật**: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: SAMEORIGIN`, `Permissions-Policy`. Không đặt COOP/COEP vì sẽ làm hỏng đăng nhập Google bằng popup.
- **CORS**: chỉ các origin trong `ALLOWED_ORIGINS`, không gửi cookie (`allow_credentials=false`).

## 7. Cơ sở dữ liệu & dữ liệu cũ

- Migration có đánh số phiên bản (`backend/database/migrations.py`, bảng `schema_meta`). Chỉ **thêm** bảng mới (`ai_usage`); các bảng cũ (`users`, `classrooms`, `assignments`, `submissions`…) **không bao giờ bị xóa hay sửa** — có kiểm thử tự động xác nhận điều này trên bản sao của `vcode_edu.db`.
- Xuất dữ liệu cũ ra JSON (đã loại bỏ mật khẩu băm và cột bí mật):

  ```bash
  python -m backend.scripts.export_legacy_sqlite
  # → archive/legacy-v25/sqlite-export.json
  ```

  Tệp này chứa email và họ tên người dùng (dữ liệu cá nhân): không commit lên Git, không chia sẻ công khai.

## 8. Cấu trúc thư mục

```
backend/
├── main.py                 # create_app(): middleware, router, lifespan (migration), phục vụ frontend
├── static.py               # phục vụ tệp tĩnh theo danh sách trắng + MIME chuẩn
├── core/
│   ├── config.py           # Settings từ biến môi trường + .env
│   ├── security.py         # xác minh Firebase ID token, Principal (user/guest)
│   ├── ratelimit.py        # giới hạn theo phút + hạn mức ngày
│   ├── errors.py           # định dạng lỗi thống nhất
│   ├── middleware.py       # header bảo mật (ASGI thuần, không cản luồng SSE)
│   └── logging.py
├── database/
│   ├── connection.py       # engine SQLite/MySQL/PostgreSQL, phiên làm việc
│   ├── base.py
│   └── migrations.py       # migration có đánh số, chỉ thêm bảng
├── models/ai_usage.py
├── ai/
│   ├── schemas.py          # kiểm tra & chuẩn hóa yêu cầu chat
│   ├── prompts.py          # 7 chế độ + system prompt tiếng Việt
│   ├── registry.py         # thứ tự ưu tiên, trạng thái sẵn sàng, chọn nhà cung cấp
│   ├── service.py          # hạn mức, dự phòng, phát luồng SSE
│   └── providers/          # base, gemini, openai, anthropic, ollama
├── routers/                # health.py, ai.py
├── scripts/export_legacy_sqlite.py
└── tests/                  # pytest (không gọi API thật)
```

Thêm nhà cung cấp mới: tạo lớp kế thừa `Provider` trong `backend/ai/providers/` (cài đặt `is_configured()` và `stream()` trả về các `Chunk`), rồi đăng ký trong `ProviderRegistry.from_settings()`.
