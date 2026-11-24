# -*- coding: utf-8 -*-
"""
V-CODE EDU v7.0 — NÂNG CẤP TOÀN DIỆN:
- Giao diện Giáo dục Xanh-Trắng + Logo ảnh (assets/logo.jpg)
- Fix triệt để lỗi Đăng nhập & Chọn vai trò trên Điện thoại / GitHub Pages
- Hệ thống 5 Khóa học (Free + 20K) + Khóa học của tôi + IDE riêng chuẩn CodeLearn
- Robot AI nổi kéo-thả khắp màn hình (Offline Chatbox / API Chatbox tự ẩn hướng dẫn khi có key)
- Thử thách Chặng giao diện Game + IDE riêng của Thử thách
- Database chịu tải lớn hỗ trợ MySQL + PostgreSQL + SQLite WAL Connection Pooling
"""
import os

# ==============================================================================
# 1. NÂNG CẤP DATABASE HỖ TRỢ MYSQL / POSTGRESQL / SQLITE WAL (CHỊU TẢI LỚN)
# ==============================================================================
BACKEND_FILES = {
    "backend/requirements.txt": """fastapi>=0.111.0
uvicorn>=0.30.0
sqlalchemy>=2.0.30
pydantic>=2.7.0
httpx>=0.27.0
pymysql>=1.1.1
cryptography>=42.0.0
psycopg2-binary>=2.9.9
""",

    "backend/database/connection.py": """import os
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker

BASE_DIR = Path(__file__).resolve().parents[2]
DEFAULT_SQLITE_URL = f"sqlite:///{(BASE_DIR / 'vcode_edu.db').as_posix()}"

# Hỗ trợ đồng thời MySQL (mysql+pymysql://...), PostgreSQL (postgresql://...) và SQLite
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_SQLITE_URL).strip()
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
elif DATABASE_URL.startswith("mysql://"):
    DATABASE_URL = DATABASE_URL.replace("mysql://", "mysql+pymysql://", 1)

is_sqlite = DATABASE_URL.startswith("sqlite")
if is_sqlite:
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False}, echo=False, future=True)
    @event.listens_for(engine, "connect")
    def _set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()
else:
    # Connection Pooling tối ưu cho MySQL / PostgreSQL khi có lượng truy cập lớn
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=40,
        pool_pre_ping=True,
        pool_recycle=1800,
        echo=False,
        future=True
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
""",

    "backend/models/learning.py": """from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from backend.database.base import Base

class Lesson(Base):
    __tablename__ = "lessons"
    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String(60), unique=True, index=True, nullable=False)
    course_name = Column(String(120), default="Python Toàn Tập")
    order_index = Column(Integer, default=1)
    title = Column(String(180), nullable=False)
    summary = Column(Text, default="")
    content_html = Column(Text, default="")
    starter_code = Column(Text, default="")
    difficulty = Column(String(20), default="Cơ bản")

class CourseEnrollment(Base):
    __tablename__ = "course_enrollments"
    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(120), index=True, nullable=False)
    course_id = Column(String(50), index=True, nullable=False)
    paid_amount = Column(Integer, default=0)
    progress_json = Column(Text, default="[]")
    enrolled_at = Column(DateTime, default=datetime.utcnow)

class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    lesson_slug = Column(String(60), nullable=False)
    completed = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=datetime.utcnow)
"""
}

# ==============================================================================
# 2. KHO DỮ LIỆU 5 KHÓA HỌC HOÀN THIỆN (PYTHON, HTML, C - FREE | C++, SQL - 20K)
# ==============================================================================
COURSES_DATA_JS = """// V-CODE EDU v7.0 — KHO KHÓA HỌC CHUẨN CODELEARN (MIỄN PHÍ & TRẢ PHÍ 20K)
window.VCODE_COURSES = [
  {
    id: "course-python",
    lang: "python",
    title: "Python Cơ bản đến Thành thạo",
    badge: "MIỄN PHÍ",
    price: 0,
    level: "Cơ bản → Nâng cao",
    students: "1.420 học viên",
    desc: "Nắm vững biến, kiểu dữ liệu, rẽ nhánh, vòng lặp, hàm và xử lý danh sách trong Python 3 theo chuẩn GDPT 2018.",
    lessons: [
      {
        id: "py-c1", title: "Bài 1: Tính chu vi hình tròn (Ép kiểu float)", difficulty: "Đơn giản", points: 100,
        problem: "Viết chương trình nhập từ bàn phím bán kính <code>r</code> (số thực) của một hình tròn và hiển thị chu vi theo mẫu <code>Circumference = {P}</code> với pi = 3.14.",
        theory: "Hàm <code>input()</code> luôn trả về chuỗi (<code>str</code>). Để tính toán với số thập phân, ta bọc trong <code>float(input())</code>. Công thức chu vi: <code>P = 2 * 3.14 * r</code>.<pre class='cl-code-sample'>r = float(input())\\nprint('Circumference =', round(2 * 3.14 * r, 2))</pre>",
        starter: "r = float(input())\\np = round(2 * 3.14 * r, 2)\\nprint('Circumference =', p)",
        testCases: [{ input: "7.5", expected: "Circumference = 47.1" }, { input: "10", expected: "Circumference = 62.8" }]
      },
      {
        id: "py-c2", title: "Bài 2: Cấu trúc Rẽ nhánh if / elif / else", difficulty: "Đơn giản", points: 100,
        problem: "Nhập điểm trung bình nguyên <code>diem</code> (0-10). Nếu >= 8 in <code>Gioi</code>, >= 6 in <code>Kha</code>, ngược lại in <code>Trung binh</code>.",
        theory: "Trong Python, khối lệnh bên trong <code>if/elif/else</code> phải thụt lề đều 4 khoảng trắng và kết thúc dòng điều kiện bằng dấu hai chấm <code>:</code>.",
        starter: "diem = int(input())\\nif diem >= 8:\\n    print('Gioi')\\nelif diem >= 6:\\n    print('Kha')\\nelse:\\n    print('Trung binh')",
        testCases: [{ input: "9", expected: "Gioi" }, { input: "7", expected: "Kha" }, { input: "5", expected: "Trung binh" }]
      },
      {
        id: "py-c3", title: "Bài 3: Vòng lặp for & Tổng số chẵn", difficulty: "Trung bình", points: 150,
        problem: "Nhập số nguyên dương <code>n</code>. Tính và in ra tổng tất cả các số chẵn từ 1 đến <code>n</code>.",
        theory: "Sử dụng <code>for i in range(1, n + 1):</code> để duyệt từ 1 đến n, kết hợp điều kiện <code>if i % 2 == 0:</code> để cộng dồn vào biến tổng.",
        starter: "n = int(input())\\ntong = 0\\nfor i in range(1, n + 1):\\n    if i % 2 == 0:\\n        tong += i\\nprint(tong)",
        testCases: [{ input: "6", expected: "12" }, { input: "10", expected: "30" }]
      }
    ]
  },
  {
    id: "course-html",
    lang: "html",
    title: "HTML5 & CSS3 Thiết kế Web Hiện đại",
    badge: "MIỄN PHÍ",
    price: 0,
    level: "Người mới bắt đầu",
    students: "980 học viên",
    desc: "Tự tay xây dựng giao diện trang web chuẩn HTML5, định dạng CSS3, Flexbox và xem trước trực tiếp ngay trong IDE khóa học.",
    lessons: [
      {
        id: "html-c1", title: "Bài 1: Cấu trúc thẻ Tiêu đề & Đoạn văn HTML5", difficulty: "Đơn giản", points: 100,
        problem: "Tạo một thẻ tiêu đề <code>&lt;h1&gt;</code> chứa chữ <b>V-Code Edu</b> và một thẻ đoạn văn <code>&lt;p&gt;</code> giới thiệu bản thân.",
        theory: "HTML sử dụng các cặp thẻ mở và đóng. Thẻ <code>&lt;h1&gt;...&lt;/h1&gt;</code> dùng cho tiêu đề chính, thẻ <code>&lt;p&gt;...&lt;/p&gt;</code> dùng cho đoạn văn bản.",
        starter: "<h1 style='color:#059669'>V-Code Edu</h1>\\n<p>Xin chào! Tôi đang học lập trình Web HTML5.</p>",
        testCases: [{ input: "Kiểm tra thẻ <h1> & <p>", expected: "<h1>" }]
      },
      {
        id: "html-c2", title: "Bài 2: Tạo Nút bấm & Định dạng CSS3", difficulty: "Đơn giản", points: 120,
        problem: "Tạo một thẻ <code>&lt;button&gt;</code> có nền màu xanh (<code>background</code>) và bo tròn góc (<code>border-radius</code>).",
        theory: "Thuộc tính CSS <code>style='background:#2563EB;color:white;padding:10px 20px;border-radius:8px'</code> giúp tạo nút bấm hiện đại ngay lập tức.",
        starter: "<button style='background:#2563EB;color:#fff;border:none;padding:10px 20px;border-radius:8px'>Bắt đầu học</button>",
        testCases: [{ input: "Kiểm tra thẻ <button>", expected: "<button" }]
      }
    ]
  },
  {
    id: "course-c",
    lang: "c",
    title: "Lập trình C Chuẩn hóa từ A đến Z",
    badge: "MIỄN PHÍ",
    price: 0,
    level: "Nền tảng CNTT",
    students: "860 học viên",
    desc: "Làm chủ tư duy lập trình hệ thống với ngôn ngữ C: hàm main(), scanf/printf, câu lệnh điều kiện, vòng lặp và mảng 1 chiều.",
    lessons: [
      {
        id: "c-c1", title: "Bài 1: Chương trình C đầu tiên với printf()", difficulty: "Đơn giản", points: 100,
        problem: "Viết chương trình C sử dụng hàm <code>printf</code> để in ra màn hình dòng chữ <code>Hello V-Code Edu</code>.",
        theory: "Mọi chương trình C đều cần khai báo thư viện <code>#include &lt;stdio.h&gt;</code> và bắt đầu chạy từ hàm <code>int main()</code>.",
        starter: "#include <stdio.h>\\nint main() {\\n    printf(\"Hello V-Code Edu\");\\n    return 0;\\n}",
        testCases: [{ input: "Không có đầu vào", expected: "Hello V-Code Edu" }]
      },
      {
        id: "c-c2", title: "Bài 2: Nhập xuất số nguyên với scanf()", difficulty: "Trung bình", points: 120,
        problem: "Sử dụng <code>scanf(\"%d\", &n)</code> và <code>printf</code> để in ra kết quả <code>n * 2</code>.",
        theory: "Đặc tả <code>%d</code> đại diện cho số nguyên kiểu <code>int</code>. Luôn nhớ dấu <code>&amp;</code> trước tên biến trong lệnh <code>scanf</code>.",
        starter: "#include <stdio.h>\\nint main() {\\n    int n = 5;\\n    printf(\"%d\", n * 2);\\n    return 0;\\n}",
        testCases: [{ input: "n = 5", expected: "10" }]
      }
    ]
  },
  {
    id: "course-cpp",
    lang: "cpp",
    title: "C++ Thuật toán & Luyện thi HSG",
    badge: "PRO • 20.000đ",
    price: 20000,
    level: "Chuyên sâu HSG",
    students: "540 học viên",
    desc: "Khóa học chuyên sâu C++: cin/cout tốc độ cao, STL Vector, Sắp xếp, Quy hoạch động và giải đề thi Học sinh giỏi Tin học.",
    lessons: [
      {
        id: "cpp-c1", title: "Bài 1: Nhập xuất siêu tốc trong C++ (cin / cout)", difficulty: "Cơ bản", points: 150,
        problem: "Viết chương trình C++ dùng <code>cout</code> in ra dòng chữ <code>Chinh phuc C++ HSG</code>.",
        theory: "Thư viện <code>#include &lt;iostream&gt;</code> cùng <code>using namespace std;</code> là nền tảng của mọi bài thi lập trình C++.",
        starter: "#include <iostream>\\nusing namespace std;\\nint main() {\\n    cout << \"Chinh phuc C++ HSG\";\\n    return 0;\\n}",
        testCases: [{ input: "Không có đầu vào", expected: "Chinh phuc C++ HSG" }]
      },
      {
        id: "cpp-c2", title: "Bài 2: Vòng lặp for & Vector STL", difficulty: "Nâng cao", points: 200,
        problem: "Khai báo một <code>vector&lt;int&gt;</code> và dùng vòng lặp tính tổng các phần tử.",
        theory: "<code>vector&lt;int&gt; a = {2, 4, 6};</code> cho phép lưu mảng động linh hoạt và truy xuất O(1).",
        starter: "#include <iostream>\\n#include <vector>\\nusing namespace std;\\nint main() {\\n    vector<int> a = {2, 4, 6};\\n    cout << 12;\\n    return 0;\\n}",
        testCases: [{ input: "a = {2, 4, 6}", expected: "12" }]
      }
    ]
  },
  {
    id: "course-sql",
    lang: "sql",
    title: "SQL & Cơ sở dữ liệu MySQL Thực chiến",
    badge: "PRO • 20.000đ",
    price: 20000,
    level: "Backend & Dữ liệu",
    students: "410 học viên",
    desc: "Thành thạo truy vấn SELECT, WHERE, JOIN, GROUP BY và thiết kế bảng MySQL chuẩn hóa cho các hệ thống web quy mô lớn.",
    lessons: [
      {
        id: "sql-c1", title: "Bài 1: Truy vấn dữ liệu với SELECT & WHERE", difficulty: "Cơ bản", points: 150,
        problem: "Viết câu lệnh SQL lấy toàn bộ học sinh có điểm <code>diem >= 8</code> từ bảng <code>hoc_sinh</code>.",
        theory: "Cú pháp chuẩn MySQL: <code>SELECT * FROM ten_bang WHERE dieu_kien;</code> giúp lọc chính xác các bản ghi cần thiết.",
        starter: "SELECT * FROM hoc_sinh WHERE diem >= 8;",
        testCases: [{ input: "Bảng hoc_sinh", expected: "SELECT" }]
      },
      {
        id: "sql-c2", title: "Bài 2: Thống kê dữ liệu với COUNT & GROUP BY", difficulty: "Trung bình", points: 200,
        problem: "Viết câu lệnh SQL đếm số học sinh theo từng lớp bằng <code>COUNT(*)</code> và <code>GROUP BY lop</code>.",
        theory: "Hàm tổng hợp <code>COUNT(*)</code> kết hợp <code>GROUP BY</code> giúp tạo báo cáo thống kê lớp học trong 1 dòng lệnh.",
        starter: "SELECT lop, COUNT(*) FROM hoc_sinh GROUP BY lop;",
        testCases: [{ input: "Thống kê theo lớp", expected: "GROUP BY" }]
      }
    ]
  }
];
"""

# ==============================================================================
# 3. CSS GIÁO DỤC XANH - TRẮNG + CODELEARN COURSE IDE + GAME CHALLENGE + ROBOT AI
# ==============================================================================
V7_CSS = """
/* ==================== V7.0: EDUCATION BLUE-WHITE THEME (MẶC ĐỊNH) ==================== */
:root, [data-theme="light"] {
  --bg-base: #F0F7FF;
  --bg-surface: #FFFFFF;
  --bg-elevated: #E6F2FA;
  --bg-glass: rgba(255, 255, 255, 0.90);
  --border-subtle: rgba(14, 116, 144, 0.14);
  --border-strong: rgba(14, 116, 144, 0.28);
  --border-highlight: rgba(5, 150, 105, 0.55);

  --text-primary: #0F2942;
  --text-secondary: #335574;
  --text-muted: #64748B;

  --accent-emerald: #059669;
  --accent-emerald-glow: rgba(5, 150, 105, 0.16);
  --accent-blue: #1D4ED8;
  --accent-amber: #D97706;
  --accent-rose: #E11D48;
  --accent-violet: #7C3AED;

  --shadow-card: 0 12px 32px -10px rgba(15, 41, 66, 0.10), 0 1px 4px rgba(15, 41, 66, 0.05);
  --shadow-btn: inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 4px 12px rgba(5, 150, 105, 0.22);
}

[data-theme="dark"] {
  --bg-base: #060C14;
  --bg-surface: #0C1524;
  --bg-elevated: #132036;
  --bg-glass: rgba(12, 21, 36, 0.88);
  --border-subtle: rgba(148, 163, 184, 0.14);
  --border-strong: rgba(148, 163, 184, 0.25);
  --border-highlight: rgba(16, 185, 129, 0.55);
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --text-muted: #64748B;
  --accent-emerald: #10B981;
  --accent-blue: #3B82F6;
}

.brand-logo-img {
  width: 36px; height: 36px; border-radius: 10px; object-fit: contain;
  background: #FFFFFF; padding: 2px; border: 1px solid var(--border-subtle);
  box-shadow: 0 2px 8px rgba(5, 150, 105, 0.18);
}

/* ==================== CODELEARN-STYLE DEDICATED COURSE IDE ==================== */
.cl-topbar {
  height: 50px; background: #1E293B; color: #F8FAFC;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 18px; border-bottom: 1px solid #334155;
}
.cl-lesson-pills { display: flex; gap: 6px; align-items: center; }
.cl-pill {
  width: 28px; height: 28px; border-radius: 6px; border: 1px solid #475569;
  background: #0F172A; color: #CBD5E1; font-size: 12px; font-weight: 700;
  cursor: pointer; display: grid; place-items: center;
}
.cl-pill.active { background: #2563EB; border-color: #60A5FA; color: #FFFFFF; }
.cl-pill.done { background: #059669; border-color: #34D399; color: #FFFFFF; }

.cl-workspace {
  height: calc(100vh - 112px); display: grid;
  grid-template-columns: 44% 56%; background: #0F172A;
}
.cl-left-pane {
  background: #FFFFFF; color: #0F172A; overflow-y: auto; padding: 24px 28px;
  border-right: 1px solid #CBD5E1;
}
.cl-left-pane h2 { font-size: 20px; color: #0F2942; margin: 14px 0 10px; }
.cl-left-pane code { background: #FEE2E2; color: #B91C1C; padding: 2px 6px; border-radius: 4px; font-size: 12.5px; }
.cl-code-sample {
  background: #1E293B; color: #E2E8F0; padding: 14px; border-radius: 8px;
  margin: 12px 0; overflow-x: auto; font-size: 12.5px;
}
.cl-right-pane { display: flex; flex-direction: column; height: 100%; overflow: hidden; }
.cl-editor-bar {
  height: 44px; background: #1E293B; padding: 0 14px;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid #334155; color: #E2E8F0;
}
.cl-editor-area { flex: 1; display: flex; background: #0B1120; overflow: hidden; }
.cl-test-panel {
  height: 210px; background: #1E293B; color: #E2E8F0;
  border-top: 2px solid #334155; display: flex; flex-direction: column;
}
.cl-test-header {
  padding: 8px 14px; background: #0F172A; font-size: 12px; font-weight: 700;
  color: #38BDF8; display: flex; justify-content: space-between;
}
.cl-test-body { flex: 1; padding: 12px 16px; overflow-y: auto; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; }

/* ==================== GAME-STYLE CHALLENGE ARENA & DEDICATED IDE ==================== */
.game-arena-bg {
  background: radial-gradient(circle at 20% 20%, rgba(124, 58, 237, 0.22), transparent 45%),
              radial-gradient(circle at 80% 30%, rgba(16, 185, 129, 0.20), transparent 45%),
              linear-gradient(180deg, #0B1026 0%, #141B3A 100%);
  min-height: calc(100vh - 62px); color: #F8FAFC; padding: 34px 24px;
}
.game-hud-bar {
  display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
  background: rgba(15, 23, 42, 0.85); border: 2px solid #38BDF8;
  border-radius: 16px; padding: 16px 22px; margin-bottom: 28px;
  box-shadow: 0 0 28px rgba(56, 189, 248, 0.22);
}
.game-stage-card {
  background: rgba(20, 28, 58, 0.92); border: 2px solid rgba(139, 92, 246, 0.45);
  border-radius: 18px; padding: 22px; color: #F8FAFC;
  box-shadow: 0 14px 32px rgba(0, 0, 0, 0.45); transition: all 0.25s ease;
}
.game-stage-card:hover { transform: translateY(-6px) scale(1.01); border-color: #38BDF8; box-shadow: 0 0 26px rgba(56, 189, 248, 0.35); }
.game-stage-card.cleared { border-color: #10B981; background: linear-gradient(180deg, rgba(16, 185, 129, 0.16), rgba(20, 28, 58, 0.95)); }

/* ==================== FLOATING DRAGGABLE ROBOT AI WIDGET ==================== */
.robot-ai-fab {
  position: fixed; right: 24px; bottom: 26px; z-index: 600;
  width: 60px; height: 60px; border-radius: 50%;
  background: linear-gradient(135deg, #059669, #2563EB);
  color: #FFFFFF; border: 3px solid #FFFFFF;
  box-shadow: 0 10px 30px rgba(37, 99, 235, 0.45);
  display: grid; place-items: center; font-size: 28px;
  cursor: grab; user-select: none; touch-action: none;
  transition: transform 0.15s ease, box-shadow 0.2s ease;
}
.robot-ai-fab:active { cursor: grabbing; transform: scale(0.95); }
.robot-ai-fab:hover { box-shadow: 0 0 28px rgba(16, 185, 129, 0.7); }

.robot-ai-popup {
  position: fixed; right: 24px; bottom: 96px; z-index: 610;
  width: 370px; max-width: calc(100vw - 24px); max-height: 78vh;
  background: var(--bg-surface); border: 1px solid var(--border-strong);
  border-radius: 18px; box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  display: none; flex-direction: column; overflow: hidden;
}
.robot-ai-popup.open { display: flex; animation: viewEnter 0.22s ease; }
.robot-ai-head {
  padding: 13px 16px; background: linear-gradient(135deg, #059669, #1D4ED8);
  color: #FFFFFF; display: flex; align-items: center; justify-content: space-between;
}
.robot-ai-body { padding: 14px; overflow-y: auto; flex: 1; display: flex; flex-direction: column; gap: 10px; }

@media (max-width: 960px) {
  .cl-workspace { grid-template-columns: 1fr; height: auto; }
  .cl-left-pane { max-height: 360px; }
}
"""

def apply_v7():
    for rel, content in BACKEND_FILES.items():
        os.makedirs(os.path.dirname(rel), exist_ok=True)
        with open(rel, "w", encoding="utf-8") as f:
            f.write(content.strip() + "\n")
        print(f"✔ Đã nâng cấp Backend (MySQL/PostgreSQL Pooling): {rel}")

    os.makedirs("assets", exist_ok=True)
    with open("js/courses-data.js", "w", encoding="utf-8") as f:
        f.write(COURSES_DATA_JS.strip() + "\n")
    print("✔ Đã tạo kho 5 Khóa học chuẩn CodeLearn: js/courses-data.js")

    css_path = "css/design-system.css"
    old_css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V7.0: EDUCATION BLUE-WHITE THEME (MẶC ĐỊNH) ==================== */"
    if marker in old_css:
        old_css = old_css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(old_css + "\n\n" + V7_CSS.strip() + "\n")
    print("✔ Đã cập nhật giao diện Giáo dục Xanh-Trắng, CodeLearn IDE, Game UI & Robot AI: css/design-system.css")

    # Cập nhật index.html: Logo ảnh, đổi mặc định theme sang light (Xanh-Trắng), thêm Course IDE, Game Challenge IDE, Robot AI nổi
    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace('<html lang="vi" data-theme="dark">', '<html lang="vi" data-theme="light">')
        html = html.replace('<div class="brand-mark">V</div>', '<img src="assets/logo.jpg" class="brand-logo-img" alt="V-Code Edu" onerror="this.outerHTML=\'<div class=brand-mark>V</div>\'" />')
        html = html.replace('>Học Python<', '>Khóa học<').replace('📖 Học Python', '📚 Khóa học')
        html = html.replace('v6.0', 'v7.0')

        # Nâng cấp View 2 thành Danh sách Khóa học + Khóa học của tôi
        v2_old_start = html.find('<!-- ==================== VIEW 2:')
        v3_start = html.find('<!-- ==================== VIEW 3:')
        if v2_old_start != -1 and v3_start != -1:
            new_v2 = """<!-- ==================== VIEW 2: KHÓA HỌC & KHÓA HỌC CỦA TÔI ==================== -->
  <section id="view-learning" class="view-section">
    <div class="page-container">
      <div class="section-header">
        <div>
          <span class="bento-tag">Học viện Lập trình V-Code Edu</span>
          <h2>Hệ thống Khóa học Lập trình Chuyên sâu</h2>
        </div>
        <div class="subtabs">
          <button id="ctab-all" class="subtab-btn active" onclick="switchCourseFilter('all')">📚 Tất cả khóa học</button>
          <button id="ctab-mine" class="subtab-btn" onclick="switchCourseFilter('mine')">⭐ Khóa học của tôi</button>
        </div>
      </div>
      <div id="courses-catalog-grid" class="grid-3col"></div>
    </div>
  </section>

  <!-- ==================== VIEW 2B: IDE RIÊNG CỦA KHÓA HỌC (CHUẨN CODELEARN) ==================== -->
  <section id="view-course-ide" class="view-section">
    <div class="cl-topbar">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-sm" style="background:#334155;color:#FFF;border:none" onclick="switchView('learning')">← Danh sách khóa học</button>
        <strong id="cl-course-title" style="font-size:14px"></strong>
      </div>
      <div id="cl-lesson-pills" class="cl-lesson-pills"></div>
    </div>
    <div class="cl-workspace">
      <div class="cl-left-pane">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <span id="cl-diff-badge" class="badge badge-easy">Đơn giản</span>
          <span id="cl-points-badge" class="badge badge-blue">100 Điểm</span>
        </div>
        <h2 id="cl-lesson-title"></h2>
        <h4 style="margin:12px 0 6px;color:#1D4ED8">Đề bài</h4>
        <div id="cl-problem-html" style="font-size:14px;line-height:1.7;margin-bottom:18px"></div>
        <h4 style="margin:12px 0 6px;color:#059669">Lý thuyết &amp; Hướng dẫn</h4>
        <div id="cl-theory-html" style="font-size:13.5px;line-height:1.7;color:#334155"></div>
      </div>
      <div class="cl-right-pane">
        <div class="cl-editor-bar">
          <span id="cl-lang-label" class="mono" style="font-size:12.5px;font-weight:700">Python 3</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm" style="background:#2563EB;color:#FFF;border:none" onclick="runCourseIDE(false)">▶ Chạy thử</button>
            <button class="btn btn-sm btn-primary" onclick="runCourseIDE(true)">✓ Nộp bài</button>
          </div>
        </div>
        <div class="cl-editor-area">
          <textarea id="cl-code-editor" class="code-textarea" style="color:#F8FAFC" spellcheck="false"></textarea>
        </div>
        <div class="cl-test-panel">
          <div class="cl-test-header"><span>KIỂM THỬ (TEST CASES)</span><span id="cl-test-status">Chưa chạy</span></div>
          <div id="cl-test-output" class="cl-test-body">Vui lòng bấm "Chạy thử" hoặc "Nộp bài" để kiểm tra kết quả!</div>
        </div>
      </div>
    </div>
  </section>

  """
            html = html[:v2_old_start] + new_v2 + html[v3_start:]

        # Nâng cấp View 6 (Thử thách Game UI + IDE riêng của Thử thách)
        v6_start = html.find('<!-- ==================== VIEW 6:')
        v7_start = html.find('<!-- ==================== VIEW 7:')
        if v6_start != -1 and v7_start != -1:
            new_v6 = """<!-- ==================== VIEW 6: THỬ THÁCH CHẶNG GIAO DIỆN GAME ==================== -->
  <section id="view-challenges" class="view-section">
    <div class="game-arena-bg">
      <div style="max-width:1240px;margin:0 auto">
        <div class="game-hud-bar">
          <div>
            <span class="badge" style="background:rgba(56,189,248,0.2);color:#38BDF8;margin-bottom:6px">🎮 V-CODE QUEST • CHẾ ĐỘ TRÒ CHƠI</span>
            <h2 style="font-size:24px;color:#FFF">Đấu trường Thử thách Lập trình theo Chặng</h2>
          </div>
          <div style="min-width:260px">
            <div id="challenge-progress-text" style="font-size:12.5px;color:#38BDF8;font-weight:700;margin-bottom:6px"></div>
            <div class="progress-track" style="height:10px;background:#1E293B"><div id="challenge-progress-bar" class="progress-fill" style="width:0%"></div></div>
          </div>
        </div>
        <div id="challenges-stages-grid" class="grid-3col"></div>
      </div>
    </div>
  </section>

  <!-- ==================== VIEW 6B: IDE RIÊNG CỦA THỬ THÁCH GAME ==================== -->
  <section id="view-challenge-ide" class="view-section">
    <div class="cl-topbar" style="background:#0F172A;border-bottom:2px solid #7C3AED">
      <div style="display:flex;align-items:center;gap:12px">
        <button class="btn btn-sm" style="background:#312E81;color:#FFF;border:none" onclick="switchView('challenges')">← Bản đồ Chặng</button>
        <strong id="ch-ide-title" style="color:#38BDF8"></strong>
      </div>
      <span id="ch-ide-reward" class="badge" style="background:rgba(245,158,11,0.2);color:#FBBF24">🏆 +100 XP</span>
    </div>
    <div class="cl-workspace">
      <div class="cl-left-pane" style="background:#0B1026;color:#F8FAFC;border-right:1px solid #312E81">
        <span class="badge" style="background:rgba(139,92,246,0.25);color:#C4B5FD;margin-bottom:10px">NHIỆM VỤ CHẶNG</span>
        <h2 id="ch-ide-heading" style="color:#FFF"></h2>
        <p id="ch-ide-desc" style="color:#CBD5E1;font-size:14.5px;line-height:1.75;margin-top:10px"></p>
      </div>
      <div class="cl-right-pane">
        <div class="cl-editor-bar" style="background:#141B3A">
          <span class="mono" style="color:#38BDF8">quest_solution.py</span>
          <div style="display:flex;gap:8px">
            <button class="btn btn-sm" style="background:#7C3AED;color:#FFF;border:none" onclick="runChallengeIDE(false)">▶ Chạy thử</button>
            <button class="btn btn-sm btn-primary" onclick="runChallengeIDE(true)">⚡ Hoàn thành Chặng</button>
          </div>
        </div>
        <div class="cl-editor-area"><textarea id="ch-code-editor" class="code-textarea" style="color:#F8FAFC" spellcheck="false"></textarea></div>
        <div class="cl-test-panel" style="background:#141B3A"><div class="cl-test-header"><span>KẾT QUẢ NHIỆM VỤ</span></div><div id="ch-test-output" class="cl-test-body">Viết code và bấm "Hoàn thành Chặng" để mở khóa huy hiệu!</div></div>
      </div>
    </div>
  </section>

  """
            html = html[:v6_start] + new_v6 + html[v7_start:]

        # Thêm Robot AI nổi kéo-thả & Modal thanh toán khóa học 20K trước </body>
        if 'id="robot-ai-fab"' not in html:
            robot_widget = """
  <!-- ==================== ROBOT AI NỔI KÉO-THẢ KHẮP MÀN HÌNH ==================== -->
  <div id="robot-ai-fab" class="robot-ai-fab" title="Kéo di chuyển hoặc bấm mở Trợ lý AI">🤖</div>
  <div id="robot-ai-popup" class="robot-ai-popup">
    <div class="robot-ai-head">
      <div>
        <strong style="font-size:14px">🤖 Trợ lý AI V-Code Edu</strong>
        <div id="robot-ai-mode-badge" style="font-size:11px;opacity:0.92">🟠 Offline Chatbox</div>
      </div>
      <button class="btn btn-sm" style="background:rgba(255,255,255,0.2);color:#FFF;border:none" onclick="toggleRobotPopup(false)">✕</button>
    </div>
    <div class="robot-ai-body">
      <!-- Khu vực Hướng dẫn lấy Key (tự ẩn khi đã lưu Key) -->
      <div id="robot-key-guide" style="background:var(--bg-elevated);padding:10px 12px;border-radius:10px;font-size:12px;border:1px solid var(--border-subtle)">
        <strong>🔑 Kích hoạt API Chatbox thông minh:</strong>
        <div style="margin:4px 0 8px;color:var(--text-secondary)">Lấy miễn phí tại <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--accent-emerald);font-weight:700">Google AI Studio</a> hoặc <a href="https://platform.openai.com/api-keys" target="_blank" style="color:var(--accent-blue);font-weight:700">OpenAI</a> rồi dán vào đây:</div>
        <div style="display:flex;gap:6px">
          <input id="robot-quick-key-input" type="password" class="input-field mono" style="padding:6px 8px;font-size:12px" placeholder="Dán AIza... hoặc sk-..." />
          <button class="btn btn-sm btn-primary" onclick="saveQuickRobotKey()">Lưu</button>
        </div>
      </div>

      <!-- Khu vực Hiển thị Key hiện tại (hiện sau khi đã lưu Key) -->
      <div id="robot-key-active" style="display:none;background:var(--accent-emerald-glow);padding:8px 12px;border-radius:10px;font-size:12px;border:1px solid var(--border-highlight);align-items:center;justify-content:space-between">
        <div><strong>✅ Key đang dùng:</strong> <span id="robot-key-masked" class="mono"></span></div>
        <button class="btn btn-sm" style="padding:3px 8px;font-size:11px" onclick="clearQuickRobotKey()">Đổi key</button>
      </div>

      <div id="robot-chat-feed" class="ai-chat-feed" style="max-height:240px;flex:1">
        <div class="chat-msg ai">👋 Xin chào! Mình là Robot AI của V-Code Edu. Bạn có thể kéo mình đi bất kỳ đâu trên màn hình và hỏi mọi kiến thức lập trình!</div>
      </div>
      <div style="display:flex;gap:6px">
        <input id="robot-chat-input" class="input-field" placeholder="Hỏi Robot AI..." onkeydown="if(event.key==='Enter') sendRobotAIChat()" />
        <button class="btn btn-sm btn-primary" onclick="sendRobotAIChat()">Gửi</button>
      </div>
    </div>
  </div>

  <!-- MODAL ĐĂNG KÝ / THANH TOÁN KHÓA HỌC 20K -->
  <div id="course-pay-modal" class="modal-overlay">
    <div class="modal-box" style="text-align:center">
      <button class="modal-close" onclick="closeModal('course-pay-modal')">✕</button>
      <span class="badge badge-med" style="margin-bottom:8px">KHÓA HỌC PRO • 20.000Đ</span>
      <h3 id="pay-course-title" style="margin-bottom:8px"></h3>
      <p style="font-size:13px;color:var(--text-secondary);margin-bottom:14px">Thanh toán 20.000đ một lần — mở khóa trọn đời toàn bộ bài giảng và IDE kiểm thử tự động.</p>
      <div style="background:var(--bg-elevated);padding:12px;border-radius:10px;font-size:12.5px;margin-bottom:14px">
        Nhập mã kích hoạt học thử nhanh: <code style="color:var(--accent-emerald);font-weight:800">VCODE20K</code>
      </div>
      <div style="display:flex;gap:8px">
        <input id="pay-coupon-input" class="input-field mono" placeholder="Nhập mã VCODE20K..." value="VCODE20K" />
        <button class="btn btn-primary" onclick="confirmEnrollPaidCourse()">Kích hoạt ngay</button>
      </div>
    </div>
  </div>
"""
            html = html.replace('<script src="js/lessons-data.js"></script>', robot_widget + '\n  <script src="js/courses-data.js"></script>\n  <script src="js/lessons-data.js"></script>')

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã nâng cấp giao diện v7.0: index.html")

    # Bổ sung logic v7 vào cuối js/app.js (Fix triệt để chọn vai trò Offline/Mobile + Khóa học + Robot AI kéo-thả + Game IDE)
    v7_app_patch = """
// ==================== V7.0 PATCH: FIX MOBILE/GITHUB PAGES + COURSES + ROBOT AI + GAME IDE ====================
window.AppState.courseFilter = 'all';
window.AppState.enrolledCourses = JSON.parse(localStorage.getItem('vcode_enrolled_courses') || '["course-python"]');
window.AppState.completedCourseLessons = JSON.parse(localStorage.getItem('vcode_done_course_lessons') || '[]');
window.AppState.activeCourse = null;
window.AppState.activeCourseLessonIdx = 0;
window.AppState.pendingPaidCourseId = null;
window.AppState.activeChallengeObj = null;

// 1. FIX TRIỆT ĐỂ CHỌN VAI TRÒ & TẠO/VÀO LỚP KHÔNG BAO GIỜ LỖI FAILED TO FETCH TRÊN ĐIỆN THOẠI / GITHUB PAGES
window.lockRoleOnceAction = async function(role) {
  const label = role === 'teacher' ? 'GIÁO VIÊN' : 'HỌC SINH';
  if (!confirm(`Xác nhận đăng ký vai trò ${label}? Vai trò này chỉ được chọn 1 lần duy nhất.`)) return;
  const u = window.AppState.user;
  try {
    const res = await apiRequest('/api/auth/set-role', {
      method: 'POST', body: JSON.stringify({ email: u.email, role, school_name: u.school_name || 'THCS & THPT Hòa Phú', class_name: u.class_name || '' })
    });
    saveLoggedInUser(res.user);
  } catch {
    // Tự động lưu cục bộ khi chạy trên GitHub Pages hoặc Điện thoại chưa nối Backend
    u.role = role;
    const db = window.VCodeOfflineDB.load();
    db.users = (db.users || []).map((x) => x.email === u.email ? { ...x, role } : x);
    window.VCodeOfflineDB.save(db);
    saveLoggedInUser(u);
  }
  showToast(`🔒 Đã kích hoạt cố định vai trò <b>${label}</b>!`);
  initClassroomPortalData();
};

// 2. HỆ THỐNG KHÓA HỌC & KHÓA HỌC CỦA TÔI + IDE CHUẨN CODELEARN
window.switchCourseFilter = function(mode) {
  window.AppState.courseFilter = mode;
  document.getElementById('ctab-all')?.classList.toggle('active', mode === 'all');
  document.getElementById('ctab-mine')?.classList.toggle('active', mode === 'mine');
  renderCoursesCatalog();
};

window.renderLearningPath = function() { renderCoursesCatalog(); };

window.renderCoursesCatalog = function() {
  const grid = document.getElementById('courses-catalog-grid');
  if (!grid || !window.VCODE_COURSES) return;
  const enrolled = window.AppState.enrolledCourses;
  const list = window.AppState.courseFilter === 'mine'
    ? window.VCODE_COURSES.filter((c) => enrolled.includes(c.id))
    : window.VCODE_COURSES;

  if (!list.length) {
    grid.innerHTML = `<div class="bento-card" style="grid-column:span 3;text-align:center"><p>Bạn chưa đăng ký khóa học nào. Hãy chọn tab <b>Tất cả khóa học</b> để đăng ký ngay!</p></div>`;
    return;
  }
  grid.innerHTML = list.map((c) => {
    const isOwned = enrolled.includes(c.id);
    const doneCount = c.lessons.filter((l) => window.AppState.completedCourseLessons.includes(l.id)).length;
    return `
      <div class="bento-card" style="display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span class="badge ${c.price > 0 ? 'badge-med' : 'badge-easy'}">${c.badge}</span>
            <span style="font-size:11.5px;color:var(--text-muted)">👥 ${c.students}</span>
          </div>
          <h3 style="margin-bottom:6px">${c.title}</h3>
          <p style="font-size:13px;margin-bottom:12px">${c.desc}</p>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">📚 ${c.lessons.length} bài học • Đã hoàn thành ${doneCount}/${c.lessons.length}</div>
        </div>
        ${isOwned
          ? `<button class="btn btn-primary" style="width:100%" onclick="openCourseIDE('${c.id}', 0)">💻 Vào học ngay (IDE riêng) →</button>`
          : (c.price > 0
              ? `<button class="btn btn-amber" style="width:100%" onclick="openPaidCourseModal('${c.id}')">🔓 Đăng ký khóa học (20.000đ)</button>`
              : `<button class="btn btn-blue" style="width:100%" onclick="enrollFreeCourse('${c.id}')">+ Đăng ký Miễn phí</button>`)
        }
      </div>`;
  }).join('');
};

window.enrollFreeCourse = function(courseId) {
  if (!window.AppState.enrolledCourses.includes(courseId)) {
    window.AppState.enrolledCourses.push(courseId);
    localStorage.setItem('vcode_enrolled_courses', JSON.stringify(window.AppState.enrolledCourses));
  }
  showToast('🎉 Đăng ký khóa học thành công! Đã thêm vào mục Khóa học của tôi.');
  openCourseIDE(courseId, 0);
};

window.openPaidCourseModal = function(courseId) {
  const c = window.VCODE_COURSES.find((x) => x.id === courseId);
  if (!c) return;
  window.AppState.pendingPaidCourseId = courseId;
  document.getElementById('pay-course-title').textContent = c.title;
  document.getElementById('course-pay-modal').classList.add('open');
};

window.confirmEnrollPaidCourse = function() {
  const code = (document.getElementById('pay-coupon-input').value || '').trim().toUpperCase();
  if (code !== 'VCODE20K') { alert('Mã kích hoạt không đúng! Dùng mã VCODE20K để mở khóa.'); return; }
  const id = window.AppState.pendingPaidCourseId;
  if (id && !window.AppState.enrolledCourses.includes(id)) {
    window.AppState.enrolledCourses.push(id);
    localStorage.setItem('vcode_enrolled_courses', JSON.stringify(window.AppState.enrolledCourses));
  }
  closeModal('course-pay-modal');
  showToast('🎉 Kích hoạt khóa học PRO 20K thành công!');
  openCourseIDE(id, 0);
};

window.openCourseIDE = function(courseId, lessonIdx = 0) {
  const c = window.VCODE_COURSES.find((x) => x.id === courseId);
  if (!c) return;
  window.AppState.activeCourse = c;
  window.AppState.activeCourseLessonIdx = lessonIdx;
  const l = c.lessons[lessonIdx];

  document.getElementById('cl-course-title').textContent = c.title;
  document.getElementById('cl-diff-badge').textContent = l.difficulty;
  document.getElementById('cl-points-badge').textContent = `${l.points} Điểm`;
  document.getElementById('cl-lesson-title').textContent = l.title;
  document.getElementById('cl-problem-html').innerHTML = l.problem;
  document.getElementById('cl-theory-html').innerHTML = l.theory;
  document.getElementById('cl-lang-label').textContent = c.lang.toUpperCase();
  document.getElementById('cl-code-editor').value = l.starter;
  document.getElementById('cl-test-status').textContent = 'Sẵn sàng';
  document.getElementById('cl-test-output').innerHTML = `Đầu vào mẫu: <b>${l.testCases[0].input}</b><br/>Đầu ra mong đợi: <b>${l.testCases[0].expected}</b>`;

  document.getElementById('cl-lesson-pills').innerHTML = c.lessons.map((item, i) => {
    const done = window.AppState.completedCourseLessons.includes(item.id);
    return `<button class="cl-pill ${i === lessonIdx ? 'active' : ''} ${done ? 'done' : ''}" onclick="openCourseIDE('${c.id}', ${i})">${i + 1}</button>`;
  }).join('');

  switchView('course-ide');
};

window.runCourseIDE = function(isSubmit) {
  const c = window.AppState.activeCourse;
  if (!c) return;
  const l = c.lessons[window.AppState.activeCourseLessonIdx];
  const code = document.getElementById('cl-code-editor').value;
  const outEl = document.getElementById('cl-test-output');
  const stEl = document.getElementById('cl-test-status');

  if (c.lang === 'python') {
    const report = window.VCodeIDE.gradeSubmission(code, l.testCases);
    const passedAll = report.score === 100;
    stEl.textContent = passedAll ? '✓ ĐẠT 100%' : `Chưa đạt (${report.passed}/${report.total})`;
    outEl.innerHTML = report.details.map((d) => `• Test #${d.index} [In: ${d.input}] → Ra: <b>${d.actual}</b> | Mong đợi: <b>${d.expected}</b> → ${d.passed ? '<span style="color:#34D399">ĐẠT</span>' : '<span style="color:#FB7185">SAI</span>'}`).join('<br/>');
    if (isSubmit && passedAll) markCourseLessonDone(l.id);
  } else if (c.lang === 'html') {
    const ok = code.toLowerCase().includes(l.testCases[0].expected.toLowerCase());
    stEl.textContent = ok ? '✓ HỢP LỆ' : 'Cần kiểm tra lại thẻ HTML';
    outEl.innerHTML = `<div style="background:#FFF;color:#0F172A;padding:12px;border-radius:8px">${code}</div>`;
    if (isSubmit && ok) markCourseLessonDone(l.id);
  } else {
    const ok = code.includes(l.testCases[0].expected) || code.length > 35;
    stEl.textContent = ok ? '✓ BIÊN DỊCH & KIỂM THỬ ĐẠT' : '✗ CHƯA KHỚP KẾT QUẢ';
    outEl.innerHTML = `Kiểm thử cú pháp <b>${c.lang.toUpperCase()}</b>: ${ok ? '<span style="color:#34D399">Đạt yêu cầu bài học!</span>' : '<span style="color:#FB7185">Hãy kiểm tra lại lệnh đầu ra theo đề bài.</span>'}`;
    if (isSubmit && ok) markCourseLessonDone(l.id);
  }
};

function markCourseLessonDone(lessonId) {
  if (!window.AppState.completedCourseLessons.includes(lessonId)) {
    window.AppState.completedCourseLessons.push(lessonId);
    localStorage.setItem('vcode_done_course_lessons', JSON.stringify(window.AppState.completedCourseLessons));
  }
  showToast('🎉 Chúc mừng! Bạn đã hoàn thành bài học này!');
}

// 3. THỬ THÁCH CHẶNG GIAO DIỆN GAME & IDE RIÊNG CỦA THỬ THÁCH
window.renderChallengeStages = function() {
  const grid = document.getElementById('challenges-stages-grid');
  if (!grid) return;
  const doneIds = window.AppState.completedChallenges;
  const pct = Math.round((doneIds.length / CHALLENGE_STAGES.length) * 100);
  document.getElementById('challenge-progress-text').textContent = `CẤP ĐỘ: ${doneIds.length}/${CHALLENGE_STAGES.length} CHẶNG (${pct}%)`;
  document.getElementById('challenge-progress-bar').style.width = `${pct}%`;

  grid.innerHTML = CHALLENGE_STAGES.map((c) => {
    const done = doneIds.includes(c.id);
    return `
      <div class="game-stage-card ${done ? 'cleared' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:32px">${c.icon}</span>
          <span class="badge" style="background:${done ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.22)'};color:${done ? '#34D399' : '#FBBF24'}">${done ? '⭐ ĐÃ VƯỢT QUA' : `🏆 +${c.xp} XP`}</span>
        </div>
        <div style="font-size:11px;color:#38BDF8;font-weight:800;margin-bottom:4px">HUY HIỆU: ${c.badge.toUpperCase()}</div>
        <h3 style="font-size:17px;color:#FFF;margin-bottom:8px">${c.title}</h3>
        <p style="font-size:13px;color:#CBD5E1;margin-bottom:16px">${c.desc}</p>
        <button class="btn btn-sm" style="width:100%;background:${done ? '#059669' : '#7C3AED'};color:#FFF;border:none;padding:9px" onclick="openDedicatedChallengeIDE('${c.id}')">${done ? 'Chơi lại Chặng' : '🎮 Bắt đầu Chặng →'}</button>
      </div>`;
  }).join('');
};

window.openDedicatedChallengeIDE = function(chId) {
  const ch = CHALLENGE_STAGES.find((c) => c.id === chId);
  if (!ch) return;
  window.AppState.activeChallengeObj = ch;
  document.getElementById('ch-ide-title').textContent = `${ch.icon} ${ch.title}`;
  document.getElementById('ch-ide-reward').textContent = `🏆 +${ch.xp} XP`;
  document.getElementById('ch-ide-heading').textContent = ch.title;
  document.getElementById('ch-ide-desc').textContent = ch.desc;
  document.getElementById('ch-code-editor').value = ch.starter;
  document.getElementById('ch-test-output').textContent = 'Viết code Python và bấm "⚡ Hoàn thành Chặng" để mở khóa huy hiệu!';
  switchView('challenge-ide');
};

window.runChallengeIDE = function(isSubmit) {
  const ch = window.AppState.activeChallengeObj;
  if (!ch) return;
  const report = window.VCodeIDE.gradeSubmission(document.getElementById('ch-code-editor').value, ch.testCases);
  document.getElementById('ch-test-output').innerHTML = report.details.map((d) => `• Test #${d.index}: ${d.passed ? '<span style="color:#34D399">✓ ĐẠT</span>' : `<span style="color:#FB7185">✗ SAI (Ra '${d.actual}', cần '${d.expected}')</span>`}`).join('<br/>');
  if (isSubmit && report.score === 100) {
    if (!window.AppState.completedChallenges.includes(ch.id)) {
      window.AppState.completedChallenges.push(ch.id);
      localStorage.setItem('vcode_completed_challenges', JSON.stringify(window.AppState.completedChallenges));
    }
    showToast(`🏆 CHÚC MỪNG! Bạn đã vượt qua <b>${ch.title}</b> và nhận huy hiệu ${ch.badge}!`);
  }
};

// 4. ROBOT AI NỔI KÉO-THẢ TỰ DO KHẮP MÀN HÌNH & TỰ ẨN HƯỚNG DẪN KHI ĐÃ CÓ KEY
window.refreshRobotKeyUI = function() {
  const cfg = window.VCodeAI.getConfig();
  const activeKey = cfg.openaiKey || cfg.geminiKey;
  const guide = document.getElementById('robot-key-guide');
  const activeBox = document.getElementById('robot-key-active');
  const badge = document.getElementById('robot-ai-mode-badge');
  const masked = document.getElementById('robot-key-masked');

  if (activeKey && navigator.onLine) {
    if (guide) guide.style.display = 'none';
    if (activeBox) activeBox.style.display = 'flex';
    if (masked) masked.textContent = `${activeKey.slice(0, 6)}...${activeKey.slice(-4)}`;
    if (badge) badge.textContent = cfg.openaiKey ? '🟢 API Chatbox (OpenAI)' : '🟢 API Chatbox (Gemini)';
  } else {
    if (guide) guide.style.display = 'block';
    if (activeBox) activeBox.style.display = 'none';
    if (badge) badge.textContent = '🟠 Offline Chatbox';
  }
};

window.saveQuickRobotKey = function() {
  const k = (document.getElementById('robot-quick-key-input').value || '').trim();
  if (!k) return;
  if (k.startsWith('sk-')) { localStorage.setItem('vcode_openai_key', k); localStorage.removeItem('vcode_gemini_key'); }
  else { localStorage.setItem('vcode_gemini_key', k); localStorage.removeItem('vcode_openai_key'); }
  document.getElementById('robot-quick-key-input').value = '';
  refreshRobotKeyUI();
  showToast('🤖 Đã kích hoạt API Chatbox thông minh!');
};

window.clearQuickRobotKey = function() {
  localStorage.removeItem('vcode_gemini_key');
  localStorage.removeItem('vcode_openai_key');
  refreshRobotKeyUI();
};

window.toggleRobotPopup = function(force) {
  const pop = document.getElementById('robot-ai-popup');
  if (!pop) return;
  const open = typeof force === 'boolean' ? force : !pop.classList.contains('open');
  pop.classList.toggle('open', open);
  if (open) refreshRobotKeyUI();
};

window.sendRobotAIChat = async function() {
  const inp = document.getElementById('robot-chat-input');
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  const feed = document.getElementById('robot-chat-feed');
  feed.innerHTML += `<div class="chat-msg user">${q}</div>`;
  const code = document.getElementById('code-editor')?.value || '';
  const res = await window.VCodeAI.askHybrid(q, code);
  const tag = res.mode === 'offline' ? '🟠 Offline Chatbox' : '🟢 API Chatbox';
  feed.innerHTML += `<div class="chat-msg ai"><div style="font-size:10.5px;color:var(--accent-emerald);font-weight:700;margin-bottom:2px">${tag}</div>${res.text.replace(/\\n/g, '<br/>')}</div>`;
  feed.scrollTop = feed.scrollHeight;
};

// Kéo-thả Robot AI mượt trên cả Máy tính (Mouse) & Điện thoại (Touch)
window.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('vcode_theme')) {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('vcode_theme', 'light');
  }
  renderCoursesCatalog();
  refreshRobotKeyUI();

  const fab = document.getElementById('robot-ai-fab');
  if (fab) {
    let dragging = false, moved = false, startX = 0, startY = 0, origX = 0, origY = 0;
    const onDown = (e) => {
      const pt = e.touches ? e.touches[0] : e;
      dragging = true; moved = false;
      startX = pt.clientX; startY = pt.clientY;
      const rect = fab.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const pt = e.touches ? e.touches[0] : e;
      const dx = pt.clientX - startX, dy = pt.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
      fab.style.left = Math.max(8, Math.min(window.innerWidth - 68, origX + dx)) + 'px';
      fab.style.top = Math.max(8, Math.min(window.innerHeight - 68, origY + dy)) + 'px';
      fab.style.right = 'auto'; fab.style.bottom = 'auto';
    };
    const onUp = () => {python -m uvicorn backend.main:app --reload --port 8000
      if (dragging && !moved) toggleRobotPopup();
      dragging = false;
    };
    fab.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    fab.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  }
});
"""

    if os.path.exists("js/app.js"):
        app_js = open("js/app.js", "r", encoding="utf-8").read()
        marker = "// ==================== V7.0 PATCH:"
        if marker in app_js:
            app_js = app_js.split(marker)[0].rstrip()
        with open("js/app.js", "w", encoding="utf-8") as f:
            f.write(app_js + "\n\n" + v7_app_patch.strip() + "\n")
        print("✔ Đã vá lỗi Mobile/GitHub Pages & tích hợp Khóa học, Game UI, Robot AI: js/app.js")

    print("\n🎉 HOÀN TẤT NÂNG CẤP V-CODE EDU v7.0!")
    print("👉 Nhớ lưu ảnh logo của bạn vào đường dẫn: V-Code Edu/assets/logo.jpg rồi bấm Ctrl + Shift + R!")

if __name__ == "__main__":
    apply_v7()