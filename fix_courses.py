# -*- coding: utf-8 -*-
import json, os

COURSES = [
    {
        "id": "course-python",
        "lang": "python",
        "title": "Python Toàn tập cho Người mới",
        "badge": "MIỄN PHÍ",
        "price": 0,
        "level": "Cơ bản → Nâng cao",
        "students": "1.580 học viên",
        "desc": "Làm chủ Python 3 từ con số 0: Biến, kiểu dữ liệu, rẽ nhánh if/else, vòng lặp for/while, hàm và danh sách chuẩn GDPT 2018.",
        "lessons": [
            {
                "id": "py-1",
                "title": "Bài 1: Nhập xuất & Tính chu vi hình tròn",
                "difficulty": "Đơn giản",
                "points": 100,
                "problem": "Nhập bán kính <code>r</code> (số thực) và in ra chu vi theo mẫu <code>Circumference = {P}</code> (với pi = 3.14).",
                "theory": "Dùng <code>float(input())</code> để đọc số thực. Công thức: <code>P = round(2 * 3.14 * r, 2)</code>.",
                "starter": "r = float(input())\np = round(2 * 3.14 * r, 2)\nprint('Circumference =', p)",
                "testCases": [{"input": "7.5", "expected": "Circumference = 47.1"}, {"input": "10", "expected": "Circumference = 62.8"}]
            },
            {
                "id": "py-2",
                "title": "Bài 2: Cấu trúc Rẽ nhánh if / elif / else",
                "difficulty": "Đơn giản",
                "points": 100,
                "problem": "Nhập điểm nguyên (0-10). >= 8 in <code>Gioi</code>, >= 6 in <code>Kha</code>, ngược lại in <code>Trung binh</code>.",
                "theory": "Khối lệnh sau dấu <code>:</code> trong Python bắt buộc thụt lề 4 khoảng trắng.",
                "starter": "d = int(input())\nif d >= 8:\n    print('Gioi')\nelif d >= 6:\n    print('Kha')\nelse:\n    print('Trung binh')",
                "testCases": [{"input": "9", "expected": "Gioi"}, {"input": "7", "expected": "Kha"}, {"input": "5", "expected": "Trung binh"}]
            },
            {
                "id": "py-3",
                "title": "Bài 3: Vòng lặp for & Tổng số chẵn",
                "difficulty": "Trung bình",
                "points": 150,
                "problem": "Nhập số nguyên dương <code>n</code>. Tính tổng các số chẵn từ 1 đến <code>n</code>.",
                "theory": "Kết hợp <code>for i in range(1, n + 1):</code> với điều kiện <code>if i % 2 == 0:</code>.",
                "starter": "n = int(input())\ntong = 0\nfor i in range(1, n + 1):\n    if i % 2 == 0:\n        tong += i\nprint(tong)",
                "testCases": [{"input": "6", "expected": "12"}, {"input": "10", "expected": "30"}]
            }
        ]
    },
    {
        "id": "course-pyvn",
        "lang": "python",
        "title": "Python Tiếng Việt (Cầu nối Tư duy)",
        "badge": "MIỄN PHÍ",
        "price": 0,
        "level": "Dành cho Học sinh mới",
        "students": "1.120 học viên",
        "desc": "Học tư duy lập trình hoàn toàn bằng từ khóa Tiếng Việt (nhap_so, in_ra, neu, nguoc_lai, lap_voi) trước khi chuyển sang Python chuẩn.",
        "lessons": [
            {
                "id": "pyvn-1",
                "title": "Bài 1: Nhập số & In kết quả Tiếng Việt",
                "difficulty": "Đơn giản",
                "points": 100,
                "problem": "Dùng lệnh <code>nhap_so()</code> để nhập cạnh hình vuông <code>a</code> và dùng <code>in_ra()</code> xuất chu vi <code>a * 4</code>.",
                "theory": "<code>nhap_so()</code> tương đương <code>int(input())</code>, <code>in_ra()</code> tương đương <code>print()</code>.",
                "starter": "a = nhap_so()\nin_ra(a * 4)",
                "testCases": [{"input": "5", "expected": "20"}, {"input": "9", "expected": "36"}]
            },
            {
                "id": "pyvn-2",
                "title": "Bài 2: Rẽ nhánh neu / nguoc_lai",
                "difficulty": "Đơn giản",
                "points": 120,
                "problem": "Nhập số nguyên <code>n</code> bằng <code>nhap_so()</code>. Nếu chẵn in <code>Chan</code>, ngược lại in <code>Le</code>.",
                "theory": "Cú pháp Tiếng Việt: <code>neu n % 2 == 0:</code> và <code>nguoc_lai:</code>.",
                "starter": "n = nhap_so()\nneu n % 2 == 0:\n    in_ra('Chan')\nnguoc_lai:\n    in_ra('Le')",
                "testCases": [{"input": "8", "expected": "Chan"}, {"input": "7", "expected": "Le"}]
            },
            {
                "id": "pyvn-3",
                "title": "Bài 3: Vòng lặp lap_voi ... trong_khoang",
                "difficulty": "Trung bình",
                "points": 150,
                "problem": "Dùng <code>lap_voi i trong_khoang(1, n + 1):</code> tính tổng các số từ 1 đến <code>n</code>.",
                "theory": "<code>lap_voi i trong_khoang(1, n + 1):</code> giúp hiểu ngay ý nghĩa vòng lặp mà không vướng rào cản tiếng Anh.",
                "starter": "n = nhap_so()\ntong = 0\nlap_voi i trong_khoang(1, n + 1):\n    tong = tong + i\nin_ra(tong)",
                "testCases": [{"input": "5", "expected": "15"}, {"input": "10", "expected": "55"}]
            }
        ]
    },
    {
        "id": "course-html",
        "lang": "html",
        "title": "HTML5 & CSS3 Thiết kế Web Hiện đại",
        "badge": "MIỄN PHÍ",
        "price": 0,
        "level": "Cơ bản → Thực hành",
        "students": "980 học viên",
        "desc": "Xây dựng trang web hoàn chỉnh với thẻ HTML5, màu sắc CSS3, bố cục Flexbox và xem trước giao diện trực tiếp ngay trong IDE khóa học.",
        "lessons": [
            {
                "id": "html-1",
                "title": "Bài 1: Thẻ Tiêu đề & Đoạn văn HTML5",
                "difficulty": "Đơn giản",
                "points": 100,
                "problem": "Tạo thẻ <code>&lt;h1&gt;</code> có nội dung <b>V-Code Edu</b> và thẻ <code>&lt;p&gt;</code> giới thiệu bản thân.",
                "theory": "HTML sử dụng cặp thẻ mở và đóng để định nghĩa cấu trúc trang web.",
                "starter": "<h1 style='color:#059669'>V-Code Edu</h1>\n<p>Chào mừng đến với khóa học HTML5!</p>",
                "testCases": [{"input": "Kiểm tra thẻ <h1>", "expected": "<h1"}]
            },
            {
                "id": "html-2",
                "title": "Bài 2: Thiết kế Nút bấm CSS3",
                "difficulty": "Đơn giản",
                "points": 120,
                "problem": "Tạo thẻ <code>&lt;button&gt;</code> có nền xanh, chữ trắng và bo tròn góc.",
                "theory": "Dùng thuộc tính <code>style='background:#2563EB;color:#fff;padding:10px 20px;border-radius:8px'</code>.",
                "starter": "<button style='background:#2563EB;color:#fff;border:none;padding:10px 20px;border-radius:8px'>Bắt đầu ngay</button>",
                "testCases": [{"input": "Kiểm tra thẻ <button>", "expected": "<button"}]
            }
        ]
    },
    {
        "id": "course-c",
        "lang": "c",
        "title": "Lập trình C Chuẩn hóa cho Người mới",
        "badge": "MIỄN PHÍ",
        "price": 0,
        "level": "Nền tảng Khoa học Máy tính",
        "students": "890 học viên",
        "desc": "Nắm chắc nền tảng ngôn ngữ C: thư viện stdio.h, hàm main(), scanf/printf, câu lệnh rẽ nhánh, vòng lặp và mảng.",
        "lessons": [
            {
                "id": "c-1",
                "title": "Bài 1: Chương trình C đầu tiên với printf",
                "difficulty": "Đơn giản",
                "points": 100,
                "problem": "Viết chương trình C dùng <code>printf</code> in ra <code>Hello V-Code Edu</code>.",
                "theory": "Mọi chương trình C đều cần <code>#include &lt;stdio.h&gt;</code> và hàm <code>int main()</code>.",
                "starter": '#include <stdio.h>\nint main() {\n    printf("Hello V-Code Edu");\n    return 0;\n}',
                "testCases": [{"input": "Không có đầu vào", "expected": "Hello V-Code Edu"}]
            },
            {
                "id": "c-2",
                "title": "Bài 2: Biến số nguyên & Toán tử trong C",
                "difficulty": "Trung bình",
                "points": 130,
                "problem": "Khai báo <code>int n = 10;</code> và dùng <code>printf(\"%d\", n * 2);</code>.",
                "theory": "Đặc tả <code>%d</code> dùng để in số nguyên kiểu <code>int</code> trong ngôn ngữ C.",
                "starter": '#include <stdio.h>\nint main() {\n    int n = 10;\n    printf("%d", n * 2);\n    return 0;\n}',
                "testCases": [{"input": "n = 10", "expected": "printf"}]
            }
        ]
    },
    {
        "id": "course-cpp",
        "lang": "cpp",
        "title": "C++ Thuật toán & Luyện thi HSG",
        "badge": "PRO • 20.000đ",
        "price": 20000,
        "level": "Chuyên sâu HSG",
        "students": "620 học viên",
        "desc": "Khóa học C++ chuyên sâu: cin/cout tốc độ cao, STL Vector, Sắp xếp, Quy hoạch động và giải đề thi Học sinh giỏi Tin học.",
        "lessons": [
            {
                "id": "cpp-1",
                "title": "Bài 1: Nhập xuất nhanh cin / cout trong C++",
                "difficulty": "Cơ bản",
                "points": 150,
                "problem": "Dùng <code>cout</code> in ra dòng chữ <code>Chinh phuc C++</code>.",
                "theory": "Khai báo <code>#include &lt;iostream&gt;</code> và <code>using namespace std;</code> để dùng <code>cin/cout</code>.",
                "starter": '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Chinh phuc C++";\n    return 0;\n}',
                "testCases": [{"input": "Không có đầu vào", "expected": "Chinh phuc C++"}]
            },
            {
                "id": "cpp-2",
                "title": "Bài 2: Thư viện STL Vector & Vòng lặp",
                "difficulty": "Nâng cao",
                "points": 200,
                "problem": "Khai báo <code>vector&lt;int&gt; a = {2, 4, 6};</code> và in tổng bằng <code>cout</code>.",
                "theory": "<code>vector</code> là cấu trúc mảng động quan trọng nhất khi thi HSG C++.",
                "starter": '#include <iostream>\n#include <vector>\nusing namespace std;\nint main() {\n    vector<int> a = {2, 4, 6};\n    cout << 12;\n    return 0;\n}',
                "testCases": [{"input": "a = {2, 4, 6}", "expected": "vector"}]
            }
        ]
    }
]

# Xuất bằng json.dumps để đảm bảo 100% chuẩn cú pháp JS, không bao giờ lỗi ngoặc kép
with open("js/courses-data.js", "w", encoding="utf-8") as f:
    f.write("window.VCODE_COURSES = " + json.dumps(COURSES, ensure_ascii=False, indent=2) + ";\n")
print("✔ Đã sửa chuẩn 100% file: js/courses-data.js")

# Vá thêm lỗi null khi IDE 2 cột không còn #prob-title / #prob-desc
if os.path.exists("js/app.js"):
    js = open("js/app.js", "r", encoding="utf-8").read()
    js = js.replace("document.getElementById('prob-title').textContent = found.title;", "const _pt = document.getElementById('prob-title'); if (_pt) _pt.textContent = found.title;")
    js = js.replace("document.getElementById('prob-desc').textContent = found.summary;", "const _pd = document.getElementById('prob-desc'); if (_pd) _pd.textContent = found.summary;")
    with open("js/app.js", "w", encoding="utf-8") as f:
        f.write(js)
    print("✔ Đã vá lỗi null ở IDE tự do trong: js/app.js")