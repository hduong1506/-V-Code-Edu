"""Generate data/courses/index.json — the catalog read by the Learn page.

Reads every data/courses/<id>.json (except index.json) and writes course metadata plus the
learning tracks (available + honest roadmap tracks). Run after editing any course:

    python tools/build_catalog.py
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
COURSES_DIR = ROOT / "data" / "courses"
OUT = COURSES_DIR / "index.json"

# Preferred display order inside the catalog; unknown courses are appended alphabetically.
ORDER = ["pyvn", "python", "web", "c", "cpp", "ai"]

TRACKS = [
    {
        "id": "programming",
        "title": "Lập trình nền tảng",
        "description": "Tư duy lập trình từ con số 0: bắt đầu bằng Python Tiếng Việt, tiến tới Python chuẩn và ngôn ngữ C.",
        "status": "available",
    },
    {
        "id": "web",
        "title": "Phát triển web",
        "description": "Tự xây dựng trang web với HTML ngữ nghĩa, CSS hiện đại, Flexbox và thiết kế responsive.",
        "status": "available",
    },
    {
        "id": "algorithms",
        "title": "Thuật toán & Cấu trúc dữ liệu",
        "description": "Rèn tư duy thuật toán với C++ cho kỳ thi học sinh giỏi, kết hợp Lăng kính để xem trực quan từng bước.",
        "status": "available",
    },
    {
        "id": "ai",
        "title": "Trí tuệ nhân tạo",
        "description": "Hiểu AI từ bên trong: thống kê, học máy cơ bản và xử lý ngôn ngữ — tự cài đặt bằng Python thuần.",
        "status": "available",
    },
]

ROADMAP = [
    {
        "id": "ml-dl",
        "title": "Học máy & Học sâu",
        "description": "Nối tiếp khóa Nhập môn AI: mạng nơ-ron nhiều lớp, lan truyền ngược và huấn luyện mô hình nhỏ ngay trên trình duyệt. Đang biên soạn.",
        "status": "roadmap",
        "topics": ["Mạng nơ-ron nhiều lớp", "Lan truyền ngược", "Gradient descent", "Phân loại ảnh chữ số", "Đạo đức AI"],
    },
    {
        "id": "data-science",
        "title": "Khoa học dữ liệu nâng cao",
        "description": "Thu thập, làm sạch và trực quan hóa dữ liệu thật, đặt câu hỏi và trả lời bằng số liệu. Đang lên kế hoạch.",
        "status": "roadmap",
        "topics": ["Làm sạch dữ liệu", "Trực quan hóa", "Thống kê suy luận", "Dự án dữ liệu trường học"],
    },
    {
        "id": "cybersecurity",
        "title": "An toàn thông tin",
        "description": "Hiểu cách tấn công và phòng thủ để dùng Internet an toàn: mật khẩu, mã hóa, lừa đảo trực tuyến và lập trình an toàn. Đang lên kế hoạch.",
        "status": "roadmap",
        "topics": ["Mật khẩu & xác thực", "Mã hóa cơ bản", "Nhận diện lừa đảo", "Lập trình an toàn", "CTF nhập môn"],
    },
    {
        "id": "robotics-iot",
        "title": "Robotics & IoT",
        "description": "Lập trình cảm biến và thiết bị kết nối, mô phỏng mạch và robot trước khi làm với phần cứng thật. Đang lên kế hoạch.",
        "status": "roadmap",
        "topics": ["Cảm biến & tín hiệu", "Vi điều khiển", "Giao thức IoT", "Robot dò đường"],
    },
    {
        "id": "automation",
        "title": "Tự động hóa",
        "description": "Dùng lập trình để tự động hóa công việc lặp lại: xử lý tệp, bảng tính, gửi thông báo. Đang lên kế hoạch.",
        "status": "roadmap",
        "topics": ["Xử lý tệp & thư mục", "Tự động hóa bảng tính", "Lập lịch tác vụ", "Gọi API"],
    },
]


def load_courses() -> list[dict]:
    courses = []
    for path in COURSES_DIR.glob("*.json"):
        if path.name == "index.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        lessons = [les for ch in data.get("chapters", []) for les in ch.get("lessons", [])]
        courses.append({
            "id": data["id"],
            "title": data.get("title", data["id"]),
            "subtitle": data.get("subtitle", ""),
            "lang": data.get("lang", ""),
            "level": data.get("level", ""),
            "track": data.get("track", "programming"),
            "accent": data.get("accent", "blue"),
            "tags": data.get("tags", []),
            "description": data.get("description", ""),
            "chapters_count": len(data.get("chapters", [])),
            "lessons_count": len(lessons),
            "xp_total": sum(int(les.get("xp", 0)) for les in lessons),
        })
    rank = {cid: i for i, cid in enumerate(ORDER)}
    courses.sort(key=lambda c: (rank.get(c["id"], len(ORDER)), c["id"]))
    return courses


def build() -> dict:
    courses = load_courses()
    tracks = []
    present = {c["id"] for c in courses}
    for t in TRACKS:
        ids = [c["id"] for c in courses if c["track"] == t["id"]]
        # The C++ course is the backbone of the algorithms track whatever its own "track" field says.
        if t["id"] == "algorithms" and "cpp" in present and "cpp" not in ids:
            ids.append("cpp")
        tracks.append({**t, "courses": ids})
    tracks += [{**r, "courses": []} for r in ROADMAP]
    return {
        "version": 2,
        "generated_at": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "courses": courses,
        "tracks": tracks,
    }


if __name__ == "__main__":
    catalog = build()
    OUT.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)}: {len(catalog['courses'])} courses, {len(catalog['tracks'])} tracks")
    for c in catalog["courses"]:
        print(f"  - {c['id']:<7} {c['track']:<12} {c['chapters_count']} chương / {c['lessons_count']} bài / {c['xp_total']} XP")
