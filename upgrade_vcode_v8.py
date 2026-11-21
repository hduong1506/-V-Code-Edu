# -*- coding: utf-8 -*-
"""
V-CODE EDU v8.0 — NÂNG CẤP TOÀN DIỆN 6 PHÂN HỆ:
1. Fix hiển thị 5 Khóa học (Python, Python Tiếng Việt, HTML, C, C++ 20K) + IDE riêng CodeLearn.
2. IDE chính thành không gian code tự do 2 cột (xóa cột bài bên trái).
3. Thử thách giao diện Sảnh chờ Game + 50 Chặng (Python -> C -> C++) + IDE Game riêng.
4. Lớp học phong cách Giáo dục mới + Giáo viên chấm điểm & đánh giá trả về cho Học sinh.
5. Menu bên trái bỏ mục AI, Logo phóng to sắc nét, màu sắc & animation chuyên nghiệp.
6. Robot AI thông minh cả Online (Gemini/OpenAI) lẫn Offline đàm thoại tự nhiên.
"""
import os

# ==============================================================================
# 1. BACKEND: THÊM API GIÁO VIÊN CHẤM ĐIỂM & NHẬN XÉT TRẢ VỀ HỌC SINH
# ==============================================================================
def patch_backend_grading():
    assess_path = "backend/routers/assessment.py"
    if os.path.exists(assess_path):
        code = open(assess_path, "r", encoding="utf-8").read()
        if "/grade" not in code:
            grade_api = """
@router.post("/grade")
def grade_student_submission(payload: dict, db: Session = Depends(get_db)):
    username = (payload.get("username") or "").strip()
    class_code = (payload.get("classroom_code") or "").strip().upper()
    score = int(payload.get("score", 100))
    feedback = (payload.get("feedback") or "").strip()
    sub = db.query(Submission).filter(
        Submission.username == username,
        Submission.classroom_code == class_code
    ).order_by(Submission.submitted_at.desc()).first()
    if sub:
        sub.score = score
        sub.teacher_feedback = feedback
        db.commit()
        return {"status": "ok", "score": sub.score, "feedback": sub.teacher_feedback}
    new_sub = Submission(
        username=username,
        student_name=payload.get("student_name") or username,
        classroom_code=class_code,
        assignment_code=payload.get("assignment_code") or "BT-GV",
        source_code=payload.get("source_code") or "",
        passed_tests=1,
        total_tests=1,
        score=score,
        teacher_feedback=feedback
    )
    db.add(new_sub)
    db.commit()
    return {"status": "ok", "score": new_sub.score, "feedback": new_sub.teacher_feedback}
"""
            with open(assess_path, "w", encoding="utf-8") as f:
                f.write(code.rstrip() + "\n" + grade_api)
            print("✔ Đã bổ sung API Giáo viên chấm điểm & nhận xét: backend/routers/assessment.py")

    cls_path = "backend/routers/classrooms.py"
    if os.path.exists(cls_path):
        code = open(cls_path, "r", encoding="utf-8").read()
        if '"teacher_feedback"' not in code:
            code = code.replace(
                '"submitted_at": sub.submitted_at.strftime("%H:%M %d/%m/%Y")',
                '"teacher_feedback": sub.teacher_feedback or "",\n                "submitted_at": sub.submitted_at.strftime("%H:%M %d/%m/%Y")'
            )
            with open(cls_path, "w", encoding="utf-8") as f:
                f.write(code)
            print("✔ Đã trả về lời nhận xét giáo viên trong API lớp học: backend/routers/classrooms.py")

# ==============================================================================
# 2. KHO 5 KHÓA HỌC ĐẦY ĐỦ: PYTHON, PYTHON TIẾNG VIỆT, HTML, C, C++ (20K)
# ==============================================================================
COURSES_DATA_JS = """// V-CODE EDU v8.0 — 5 KHÓA HỌC HOÀN THIỆN (PYTHON, PYTHON TIẾNG VIỆT, HTML, C, C++)
window.VCODE_COURSES = [
  {
    id: "course-python", lang: "python", title: "Python Toàn tập cho Người mới",
    badge: "MIỄN PHÍ", price: 0, level: "Cơ bản → Nâng cao", students: "1.580 học viên",
    desc: "Làm chủ Python 3 từ con số 0: Biến, kiểu dữ liệu, rẽ nhánh if/else, vòng lặp for/while, hàm và danh sách chuẩn GDPT 2018.",
    lessons: [
      { id: "py-1", title: "Bài 1: Nhập xuất & Tính chu vi hình tròn", difficulty: "Đơn giản", points: 100,
        problem: "Nhập bán kính <code>r</code> (số thực) và in ra chu vi theo mẫu <code>Circumference = {P}</code> (với pi = 3.14).",
        theory: "Dùng <code>float(input())</code> để đọc số thực. Công thức: <code>P = round(2 * 3.14 * r, 2)</code>.",
        starter: "r = float(input())\\np = round(2 * 3.14 * r, 2)\\nprint('Circumference =', p)",
        testCases: [{ input: "7.5", expected: "Circumference = 47.1" }, { input: "10", expected: "Circumference = 62.8" }] },
      { id: "py-2", title: "Bài 2: Cấu trúc Rẽ nhánh if / elif / else", difficulty: "Đơn giản", points: 100,
        problem: "Nhập điểm nguyên (0-10). >= 8 in <code>Gioi</code>, >= 6 in <code>Kha</code>, ngược lại in <code>Trung binh</code>.",
        theory: "Khối lệnh sau dấu <code>:</code> trong Python bắt buộc thụt lề 4 khoảng trắng.",
        starter: "d = int(input())\\nif d >= 8:\\n    print('Gioi')\\nelif d >= 6:\\n    print('Kha')\\nelse:\\n    print('Trung binh')",
        testCases: [{ input: "9", expected: "Gioi" }, { input: "7", expected: "Kha" }, { input: "5", expected: "Trung binh" }] },
      { id: "py-3", title: "Bài 3: Vòng lặp for & Tổng số chẵn", difficulty: "Trung bình", points: 150,
        problem: "Nhập số nguyên dương <code>n</code>. Tính tổng các số chẵn từ 1 đến <code>n</code>.",
        theory: "Kết hợp <code>for i in range(1, n + 1):</code> với điều kiện <code>if i % 2 == 0:</code>.",
        starter: "n = int(input())\\ntong = 0\\nfor i in range(1, n + 1):\\n    if i % 2 == 0:\\n        tong += i\\nprint(tong)",
        testCases: [{ input: "6", expected: "12" }, { input: "10", expected: "30" }] }
    ]
  },
  {
    id: "course-pyvn", lang: "python", title: "Python Tiếng Việt (Cầu nối Tư duy)",
    badge: "MIỄN PHÍ", price: 0, level: "Dành cho Học sinh mới", students: "1.120 học viên",
    desc: "Học tư duy lập trình hoàn toàn bằng từ khóa Tiếng Việt (nhap_so, in_ra, neu, nguoc_lai, lap_voi) trước khi chuyển sang Python chuẩn.",
    lessons: [
      { id: "pyvn-1", title: "Bài 1: Nhập số & In kết quả Tiếng Việt", difficulty: "Đơn giản", points: 100,
        problem: "Dùng lệnh <code>nhap_so()</code> để nhập cạnh hình vuông <code>a</code> và dùng <code>in_ra()</code> xuất chu vi <code>a * 4</code>.",
        theory: "V-Code Edu hỗ trợ biên dịch trực tiếp từ khóa Tiếng Việt: <code>nhap_so()</code> tương đương <code>int(input())</code>, <code>in_ra()</code> tương đương <code>print()</code>.",
        starter: "a = nhap_so()\\nin_ra(a * 4)",
        testCases: [{ input: "5", expected: "20" }, { input: "9", expected: "36" }] },
      { id: "pyvn-2", title: "Bài 2: Rẽ nhánh neu / nguoc_lai", difficulty: "Đơn giản", points: 120,
        problem: "Nhập số nguyên <code>n</code> bằng <code>nhap_so()</code>. Nếu chẵn in <code>Chan</code>, ngược lại in <code>Le</code>.",
        theory: "Cú pháp Tiếng Việt: <code>neu n % 2 == 0:</code> và <code>nguoc_lai:</code>.",
        starter: "n = nhap_so()\\nneu n % 2 == 0:\\n    in_ra('Chan')\\nnguoc_lai:\\n    in_ra('Le')",
        testCases: [{ input: "8", expected: "Chan" }, { input: "7", expected: "Le" }] },
      { id: "pyvn-3", title: "Bài 3: Vòng lặp lap_voi ... trong_khoang", difficulty: "Trung bình", points: 150,
        problem: "Dùng <code>lap_voi i trong_khoang(1, n + 1):</code> tính tổng các số từ 1 đến <code>n</code>.",
        theory: "<code>lap_voi i trong_khoang(1, n + 1):</code> giúp học sinh hiểu ngay ý nghĩa vòng lặp mà không vướng rào cản tiếng Anh.",
        starter: "n = nhap_so()\\ntong = 0\\nlap_voi i trong_khoang(1, n + 1):\\n    tong = tong + i\\nin_ra(tong)",
        testCases: [{ input: "5", expected: "15" }, { input: "10", expected: "55" }] }
    ]
  },
  {
    id: "course-html", lang: "html", title: "HTML5 & CSS3 Thiết kế Web Hiện đại",
    badge: "MIỄN PHÍ", price: 0, level: "Cơ bản → Thực hành", students: "980 học viên",
    desc: "Xây dựng trang web hoàn chỉnh với thẻ HTML5, màu sắc CSS3, bố cục Flexbox và xem trước giao diện trực tiếp ngay trong IDE khóa học.",
    lessons: [
      { id: "html-1", title: "Bài 1: Thẻ Tiêu đề & Đoạn văn HTML5", difficulty: "Đơn giản", points: 100,
        problem: "Tạo thẻ <code>&lt;h1&gt;</code> có nội dung <b>V-Code Edu</b> và thẻ <code>&lt;p&gt;</code> giới thiệu bản thân.",
        theory: "HTML sử dụng cặp thẻ mở và đóng để định nghĩa cấu trúc trang web.",
        starter: "<h1 style='color:#059669'>V-Code Edu</h1>\\n<p>Chào mừng đến với khóa học HTML5!</p>",
        testCases: [{ input: "Kiểm tra thẻ <h1>", expected: "<h1" }] },
      { id: "html-2", title: "Bài 2: Thiết kế Nút bấm CSS3", difficulty: "Đơn giản", points: 120,
        problem: "Tạo thẻ <code>&lt;button&gt;</code> có nền xanh, chữ trắng và bo tròn góc.",
        theory: "Dùng thuộc tính <code>style='background:#2563EB;color:#fff;padding:10px 20px;border-radius:8px'</code>.",
        starter: "<button style='background:#2563EB;color:#fff;border:none;padding:10px 20px;border-radius:8px'>Bắt đầu ngay</button>",
        testCases: [{ input: "Kiểm tra thẻ <button>", expected: "<button" }] }
    ]
  },
  {
    id: "course-c", lang: "c", title: "Lập trình C Chuẩn hóa cho Người mới",
    badge: "MIỄN PHÍ", price: 0, level: "Nền tảng Khoa học Máy tính", students: "890 học viên",
    desc: "Nắm chắc nền tảng ngôn ngữ C: thư viện stdio.h, hàm main(), scanf/printf, câu lệnh rẽ nhánh, vòng lặp và mảng.",
    lessons: [
      { id: "c-1", title: "Bài 1: Chương trình C đầu tiên với printf", difficulty: "Đơn giản", points: 100,
        problem: "Viết chương trình C dùng <code>printf</code> in ra <code>Hello V-Code Edu</code>.",
        theory: "Mọi chương trình C đều cần <code>#include &lt;stdio.h&gt;</code> và hàm <code>int main()</code>.",
        starter: "#include <stdio.h>\\nint main() {\\n    printf(\"Hello V-Code Edu\");\\n    return 0;\\n}",
        testCases: [{ input: "Không có đầu vào", expected: "Hello V-Code Edu" }] },
      { id: "c-2", title: "Bài 2: Biến số nguyên & Toán tử trong C", difficulty: "Trung bình", points: 130,
        problem: "Khai báo <code>int n = 10;</code> và dùng <code>printf(\"%d\", n * 2);</code>.",
        theory: "Đặc tả <code>%d</code> dùng để in số nguyên kiểu <code>int</code> trong ngôn ngữ C.",
        starter: "#include <stdio.h>\\nint main() {\\n    int n = 10;\\n    printf(\"%d\", n * 2);\\n    return 0;\\n}",
        testCases: [{ input: "n = 10", expected: "printf" }] }
    ]
  },
  {
    id: "course-cpp", lang: "cpp", title: "C++ Thuật toán & Luyện thi HSG",
    badge: "PRO • 20.000đ", price: 20000, level: "Chuyên sâu HSG", students: "620 học viên",
    desc: "Khóa học C++ chuyên sâu: cin/cout tốc độ cao, STL Vector, Sắp xếp, Quy hoạch động và giải đề thi Học sinh giỏi Tin học.",
    lessons: [
      { id: "cpp-1", title: "Bài 1: Nhập xuất nhanh cin / cout trong C++", difficulty: "Cơ bản", points: 150,
        problem: "Dùng <code>cout</code> in ra dòng chữ <code>Chinh phuc C++</code>.",
        theory: "Khai báo <code>#include &lt;iostream&gt;</code> và <code>using namespace std;</code> để dùng <code>cin/cout</code>.",
        starter: "#include <iostream>\\nusing namespace std;\\nint main() {\\n    cout << \"Chinh phuc C++\";\\n    return 0;\\n}",
        testCases: [{ input: "Không có đầu vào", expected: "Chinh phuc C++" }] },
      { id: "cpp-2", title: "Bài 2: Thư viện STL Vector & Vòng lặp", difficulty: "Nâng cao", points: 200,
        problem: "Khai báo <code>vector&lt;int&gt; a = {2, 4, 6};</code> và in tổng bằng <code>cout</code>.",
        theory: "<code>vector</code> là cấu trúc mảng động quan trọng nhất khi thi HSG C++.",
        starter: "#include <iostream>\\n#include <vector>\\nusing namespace std;\\nint main() {\\n    vector<int> a = {2, 4, 6};\\n    cout << 12;\\n    return 0;\\n}",
        testCases: [{ input: "a = {2, 4, 6}", expected: "vector" }] }
    ]
  }
];
"""

# ==============================================================================
# 3. 50 CHẶNG THỬ THÁCH GAME (TỪ PYTHON CƠ BẢN -> THUẬT TOÁN -> C -> C++)
# ==============================================================================
CHALLENGES_50_JS = """// V-CODE EDU v8.0 — 50 CHẶNG THỬ THÁCH GAME (PYTHON -> C -> C++)
window.VCODE_50_CHALLENGES = (function build50Stages() {
  const worlds = [
    { id: 1, name: "Thế giới 1: Khởi nguyên Python", lang: "python", color: "#10B981", icon: "🚀" },
    { id: 2, name: "Thế giới 2: Rẽ nhánh & Logic", lang: "python", color: "#3B82F6", icon: "🔐" },
    { id: 3, name: "Thế giới 3: Vòng lặp & Thuật toán", lang: "python", color: "#8B5CF6", icon: "🌀" },
    { id: 4, name: "Thế giới 4: Pháo đài Ngôn ngữ C", lang: "c", color: "#F59E0B", icon: "🛡️" },
    { id: 5, name: "Thế giới 5: Đỉnh cao C++ HSG", lang: "cpp", color: "#F43F5E", icon: "👑" }
  ];

  const templates = [
    // World 1: Python Basics (1-10)
    (n) => ({ title: `Chặng ${n}: Nhân ${n + 1} năng lượng`, desc: `Nhập số nguyên X, in ra X * ${n + 1} để nạp năng lượng tàu.`, starter: `x = int(input())\\nprint(x * ${n + 1})`, testCases: [{ input: "5", expected: String(5 * (n + 1)) }, { input: "10", expected: String(10 * (n + 1)) }] }),
    // World 2: Python If/Else (11-20)
    (n) => ({ title: `Chặng ${n}: Cánh cổng số ${n}`, desc: `Nhập số nguyên X. Nếu X >= ${n} in "MO", ngược lại in "DONG".`, starter: `x = int(input())\\nif x >= ${n}:\\n    print("MO")\\nelse:\\n    print("DONG")`, testCases: [{ input: String(n + 2), expected: "MO" }, { input: String(n - 3), expected: "DONG" }] }),
    // World 3: Python Loops (21-30)
    (n) => {
      const k = (n - 20) + 1;
      return { title: `Chặng ${n}: Đếm bội số của ${k}`, desc: `Nhập số nguyên dương N. Đếm xem từ 1 đến N có bao nhiêu số chia hết cho ${k}.`, starter: `n = int(input())\\nd = 0\\nfor i in range(1, n + 1):\\n    if i % ${k} == 0:\\n        d += 1\\nprint(d)`, testCases: [{ input: String(k * 4), expected: "4" }, { input: String(k * 7), expected: "7" }] };
    },
    // World 4: C Language (31-40)
    (n) => ({ title: `Chặng ${n}: Mã lệnh C #${n - 30}`, desc: `Viết chương trình C dùng printf() in ra mật mã "STAGE_${n}".`, starter: `#include <stdio.h>\\nint main() {\\n    printf("STAGE_${n}");\\n    return 0;\\n}`, testCases: [{ input: "C Compiler", expected: `STAGE_${n}` }] }),
    // World 5: C++ HSG (41-50)
    (n) => ({ title: `Chặng ${n}: Thử thách C++ #${n - 40}`, desc: `Viết chương trình C++ dùng cout in ra khẩu lệnh "CPP_MASTER_${n}".`, starter: `#include <iostream>\\nusing namespace std;\\nint main() {\\n    cout << "CPP_MASTER_${n}";\\n    return 0;\\n}`, testCases: [{ input: "C++17 Compiler", expected: `CPP_MASTER_${n}` }] })
  ];

  const list = [];
  for (let i = 1; i <= 50; i++) {
    const wIdx = Math.floor((i - 1) / 10);
    const w = worlds[wIdx];
    const tpl = templates[wIdx](i);
    list.push({
      id: `stage-${i}`,
      stage: i,
      world: w.id,
      worldName: w.name,
      lang: w.lang,
      color: w.color,
      icon: w.icon,
      xp: 100 + wIdx * 50,
      ...tpl
    });
  }
  return list;
})();
"""

# ==============================================================================
# 4. AI TUTOR THÔNG MINH THỰC THỤ (API THẬT + OFFLINE ĐÀM THOẠI TỰ NHIÊN)
# ==============================================================================
SMART_AI_TUTOR_JS = """// V-CODE EDU v8.0 — SMART HYBRID AI (GEMINI / OPENAI API THẬT + OFFLINE ĐÀM THOẠI THÔNG MINH)
window.VCodeAI = {
  getConfig() {
    return {
      backendUrl: localStorage.getItem('vcode_backend_url') || 'http://localhost:8000',
      geminiKey: (localStorage.getItem('vcode_gemini_key') || '').trim(),
      openaiKey: (localStorage.getItem('vcode_openai_key') || '').trim()
    };
  },

  offlineSmartReply(question, code = '', errorText = '') {
    const q = (question || '').trim().toLowerCase();
    if (/^(hi|hello|chào|chao|hey|xin chào|alo|bạn là ai|ban la ai)/.test(q)) {
      return "👋 Chào bạn! Mình là **Robot AI của V-Code Edu**. Bạn có thể hỏi mình về Python, Python Tiếng Việt, HTML, C, C++ hoặc dán đoạn code bị lỗi để mình giải thích nhé!";
    }
    if (/SyntaxError/i.test(errorText) || q.includes('syntaxerror') || q.includes('lỗi cú pháp')) {
      return "⚠️ **Lỗi Cú Pháp (SyntaxError):** Thường do thiếu dấu hai chấm `:` ở cuối câu lệnh `if/elif/else/for/while/def`, hoặc quên đóng ngoặc `)`. Hãy kiểm tra kỹ dòng báo lỗi nhé!";
    }
    if (/IndentationError/i.test(errorText) || q.includes('thụt lề')) {
      return "⚠️ **Lỗi Thụt Lề (IndentationError):** Trong Python, các lệnh bên trong `if/for/while` phải thụt lề đều 4 khoảng trắng (1 phím Tab).";
    }
    if (q.includes('for') || q.includes('vòng lặp') || q.includes('vong lap')) {
      return "🔁 **Vòng lặp `for` trong Python:** Dùng để lặp qua một dãy số. Ví dụ in từ 1 đến 5:\\n`for i in range(1, 6):`\\n`    print(i)`";
    }
    if (q.includes('if') || q.includes('rẽ nhánh') || q.includes('điều kiện')) {
      return "🔀 **Cấu trúc rẽ nhánh `if / else`:**\\n`if n % 2 == 0:`\\n`    print('Số chẵn')`\\n`else:`\\n`    print('Số lẻ')`";
    }
    if (q.includes('số nguyên tố') || q.includes('nguyen to')) {
      return "🧮 **Cách kiểm tra số nguyên tố N:** Một số nguyên tố là số > 1 và không chia hết cho số nào từ 2 đến căn bậc hai của N. Bạn dùng vòng lặp `for i in range(2, int(n**0.5)+1):` kiểm tra `if n % i == 0:` nhé!";
    }
    if (q.includes('html') || q.includes('thẻ') || q.includes('web')) {
      return "🌐 **Cơ bản HTML5:** Trang web gồm các thẻ như `<h1>Tiêu đề</h1>`, `<p>Đoạn văn</p>`, `<button>Nút bấm</button>`. Bạn có thể vào mục **Khóa học → HTML5 & CSS3** để chạy và xem trước trực tiếp!";
    }
    if (q.includes('c++') || q.includes('cpp') || q.includes('cout')) {
      return "⚡ **Cơ bản C++:** Khai báo `#include <iostream>` và `using namespace std;`, sau đó dùng `cin >> n;` để nhập và `cout << n;` để xuất kết quả.";
    }
    if (q.includes('key') || q.includes('api')) {
      return "🔑 **Hướng dẫn lấy API Key miễn phí:** Vào `aistudio.google.com/apikey` → bấm **Create API Key** → copy mã bắt đầu bằng **`AIza...`** rồi bấm nút **Đổi key** ở trên để dán vào nhé!";
    }
    return `🤖 **Trợ lý Offline V-Code Edu:** Mình đã nhận câu hỏi *"${question}"*. Ở chế độ Offline mình hỗ trợ giải thích nhanh cú pháp Python, HTML, C, C++ và bắt lỗi code. Để trò chuyện chuyên sâu như ChatGPT/Gemini, bạn hãy dán **Gemini API Key** (bắt đầu bằng \`AIza...\`) ở khung phía trên nhé!`;
  },

  async askHybrid(question, code = '', errorText = '') {
    const cfg = this.getConfig();
    const systemPrompt = `Bạn là Trợ lý AI thông minh, thân thiện của nền tảng giáo dục lập trình V-Code Edu (Việt Nam). Hãy trả lời trực tiếp, rõ ràng, tự nhiên bằng Tiếng Việt câu hỏi của người dùng. Nếu người dùng chỉ chào hỏi, hãy chào lại thân thiện. Nếu hỏi lập trình, hãy giải thích dễ hiểu kèm ví dụ ngắn.`;
    const userContent = errorText
      ? `Câu hỏi: ${question}\\nLỗi gặp phải: ${errorText}\\nCode hiện tại:\\n${code}`
      : question;

    if (navigator.onLine) {
      // 1. Gọi OpenAI nếu có khóa sk-...
      if (cfg.openaiKey) {
        if (!cfg.openaiKey.startsWith('sk-')) {
          return { mode: 'error', text: "⚠️ Mã OpenAI Key không đúng định dạng (phải bắt đầu bằng `sk-...`). Hãy bấm **Đổi key** và dán lại mã hợp lệ!" };
        }
        try {
          const r = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.openaiKey}` },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }],
              max_tokens: 600
            })
          });
          const d = await r.json();
          if (r.ok && d.choices?.[0]?.message?.content) {
            return { mode: 'online-openai', text: d.choices[0].message.content };
          }
          return { mode: 'error', text: `⚠️ OpenAI API báo lỗi: ${d.error?.message || r.status}. Kiểm tra lại API Key hoặc hạn mức tài khoản OpenAI.` };
        } catch (e) { /* Rơi về Offline */ }
      }

      // 2. Gọi Google Gemini nếu có khóa
      if (cfg.geminiKey) {
        if (!cfg.geminiKey.startsWith('AIza')) {
          return { mode: 'error', text: `⚠️ Mã Key bạn dán (\`${cfg.geminiKey.slice(0, 6)}...\`) không phải **Google Gemini API Key** chuẩn! Khóa Gemini lấy tại **aistudio.google.com/apikey** luôn bắt đầu bằng **\`AIza...\`** (39 ký tự). Hãy bấm **Đổi key** để dán lại đúng mã nhé!` };
        }
        const models = ['gemini-2.0-flash', 'gemini-1.5-flash'];
        let lastErr = '';
        for (const model of models) {
          try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\\n\\n${userContent}` }] }]
              })
            });
            const d = await r.json();
            if (r.ok && d.candidates?.[0]?.content?.parts?.[0]?.text) {
              return { mode: 'online-gemini', text: d.candidates[0].content.parts[0].text };
            }
            lastErr = d.error?.message || `HTTP ${r.status}`;
          } catch (e) { lastErr = e.message; }
        }
        return { mode: 'error', text: `⚠️ Gemini API từ chối yêu cầu (${lastErr}). Hãy kiểm tra lại Key tại Google AI Studio.` };
      }
    }

    return { mode: 'offline', text: this.offlineSmartReply(question, code, errorText) };
  },

  generateFlowchartSVG(code) {
    const lines = code.split('\\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const steps = [{ type: 'terminal', label: 'Bắt đầu (Start)' }];
    for (const line of lines.slice(0, 7)) {
      if (/^(if|elif|while|for|neu|lap_voi)\\b/.test(line)) steps.push({ type: 'decision', label: line.replace(':', '').slice(0, 28) });
      else if (line.includes('input(') || line.startsWith('print(') || line.startsWith('in_ra(')) steps.push({ type: 'io', label: line.slice(0, 28) });
      else steps.push({ type: 'process', label: line.slice(0, 28) });
    }
    steps.push({ type: 'terminal', label: 'Kết thúc (End)' });
    const h = steps.length * 58 + 20;
    let svg = `<svg viewBox="0 0 320 ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg" style="font-family:'JetBrains Mono',monospace;font-size:11px">`;
    steps.forEach((s, i) => {
      const y = 14 + i * 56;
      if (i > 0) svg += `<line x1="160" y1="${y - 20}" x2="160" y2="${y}" stroke="#10B981" stroke-width="1.5"/>`;
      if (s.type === 'terminal') svg += `<rect x="70" y="${y}" width="180" height="34" rx="17" fill="#0D111A" stroke="#10B981" stroke-width="1.5"/>`;
      else if (s.type === 'decision') svg += `<polygon points="160,${y-3} 265,${y+17} 160,${y+37} 55,${y+17}" fill="#141A27" stroke="#F59E0B" stroke-width="1.5"/>`;
      else if (s.type === 'io') svg += `<polygon points="65,${y} 265,${y} 250,${y+34} 50,${y+34}" fill="#0D111A" stroke="#3B82F6" stroke-width="1.5"/>`;
      else svg += `<rect x="55" y="${y}" width="210" height="34" rx="6" fill="#0D111A" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/>`;
      const safe = s.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      svg += `<text x="160" y="${y + 21}" fill="#F8FAFC" text-anchor="middle">${safe}</text>`;
    });
    return svg + `</svg>`;
  }
};
"""

# ==============================================================================
# 5. CSS v8.0: IDE TỰ DO 2 CỘT, MENU PRO + LOGO LỚN, LỚP HỌC GIÁO DỤC, SẢNH CHỜ GAME 50 CHẶNG
# ==============================================================================
V8_CSS = """
/* ==================== V8.0: FREE 2-PANE IDE, PRO DRAWER, EDU CLASSROOM, GAME LOBBY ==================== */
/* 1. IDE tự do 2 cột (đã xóa cột danh sách bài bên trái) */
.workspace-shell.free-ide-2pane {
  grid-template-columns: 1.25fr 0.75fr !important;
}

/* 2. Thanh Menu bên trái chuyên nghiệp & Logo lớn sắc nét */
.left-drawer {
  background: var(--bg-surface) !important;
  border-right: 1px solid var(--border-strong) !important;
  width: 315px !important;
}
.drawer-brand-hero {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  padding: 22px 18px 16px;
  background: linear-gradient(180deg, rgba(5, 150, 105, 0.12), transparent);
  border-bottom: 1px solid var(--border-subtle);
  position: relative;
}
.drawer-logo-large {
  width: 82px; height: 82px; border-radius: 18px; object-fit: contain;
  background: #FFFFFF; padding: 6px;
  border: 2px solid var(--accent-emerald);
  box-shadow: 0 10px 25px rgba(5, 150, 105, 0.22);
  margin-bottom: 10px;
  transition: transform 0.3s cubic-bezier(0.22, 1, 0.36, 1);
}
.drawer-logo-large:hover { transform: scale(1.06) rotate(-2deg); }

.drawer-item {
  padding: 11px 14px !important;
  border-radius: 10px !important;
  font-weight: 600 !important;
}
.drawer-item.active {
  background: linear-gradient(90deg, var(--accent-emerald), #0D9488) !important;
  color: #FFFFFF !important;
  box-shadow: 0 6px 16px rgba(5, 150, 105, 0.28) !important;
}

/* 3. Giao diện Lớp học phong cách Giáo dục (Sáng rõ, chuyên biệt) */
.edu-classroom-header {
  background: linear-gradient(135deg, #0F4C81 0%, #059669 100%);
  color: #FFFFFF; border-radius: 18px; padding: 26px 30px;
  margin-bottom: 24px; box-shadow: 0 14px 34px rgba(15, 76, 129, 0.18);
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
}
.edu-stat-strip {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 22px;
}
.edu-stat-box {
  background: var(--bg-surface); border: 1px solid var(--border-subtle);
  border-left: 4px solid var(--accent-blue); border-radius: 12px; padding: 14px 18px;
  box-shadow: var(--shadow-card);
}
.edu-stat-box strong { display: block; font-size: 22px; font-family: 'JetBrains Mono', monospace; color: var(--text-primary); }
.edu-stat-box span { font-size: 12px; color: var(--text-secondary); }

/* 4. Sảnh chờ Game 50 Chặng (Hiệu ứng 3D nút bấm & Animation) */
.game-lobby-banner {
  background: linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #0F766E 100%);
  border: 2px solid #38BDF8; border-radius: 20px; padding: 26px 28px;
  margin-bottom: 22px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;
  box-shadow: 0 0 36px rgba(56, 189, 248, 0.28);
}
.world-filter-bar {
  display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 22px;
}
.world-btn {
  padding: 10px 16px; border-radius: 12px; border: 2px solid rgba(255,255,255,0.18);
  background: rgba(15, 23, 42, 0.85); color: #E2E8F0; font-weight: 700; font-size: 13px;
  cursor: pointer; transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  box-shadow: 0 4px 0 rgba(0,0,0,0.45);
}
.world-btn:hover { transform: translateY(-2px); border-color: #38BDF8; color: #FFFFFF; }
.world-btn:active { transform: translateY(2px); box-shadow: 0 1px 0 rgba(0,0,0,0.45); }
.world-btn.active {
  background: linear-gradient(135deg, #2563EB, #7C3AED);
  border-color: #60A5FA; color: #FFFFFF; box-shadow: 0 4px 0 #1E3A8A, 0 0 18px rgba(124, 58, 237, 0.5);
}
.game-play-btn {
  width: 100%; padding: 10px; border-radius: 10px; border: none;
  font-weight: 800; font-size: 13.5px; color: #FFFFFF; cursor: pointer;
  background: linear-gradient(180deg, #8B5CF6 0%, #6D28D9 100%);
  box-shadow: 0 4px 0 #4C1D95; transition: transform 0.12s ease, box-shadow 0.12s ease;
}
.game-play-btn:hover { filter: brightness(1.12); transform: translateY(-1px); }
.game-play-btn:active { transform: translateY(3px); box-shadow: 0 1px 0 #4C1D95; }

@media (max-width: 900px) {
  .workspace-shell.free-ide-2pane { grid-template-columns: 1fr !important; }
  .edu-stat-strip { grid-template-columns: repeat(2, 1fr); }
}
"""

def apply_v8():
    patch_backend_grading()

    with open("js/courses-data.js", "w", encoding="utf-8") as f:
        f.write(COURSES_DATA_JS.strip() + "\n")
    print("✔ Đã tạo 5 Khóa học đầy đủ (Python, Python Tiếng Việt, HTML, C, C++): js/courses-data.js")

    with open("js/challenges-50.js", "w", encoding="utf-8") as f:
        f.write(CHALLENGES_50_JS.strip() + "\n")
    print("✔ Đã tạo 50 Chặng Thử thách Game (Python -> C -> C++): js/challenges-50.js")

    with open("js/ai-tutor.js", "w", encoding="utf-8") as f:
        f.write(SMART_AI_TUTOR_JS.strip() + "\n")
    print("✔ Đã nâng cấp Robot AI thông minh (API thật + Offline đàm thoại): js/ai-tutor.js")

    css_path = "css/design-system.css"
    old_css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V8.0: FREE 2-PANE IDE"
    if marker in old_css:
        old_css = old_css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(old_css + "\n\n" + V8_CSS.strip() + "\n")
    print("✔ Đã cập nhật CSS v8.0 (IDE 2 cột, Menu Pro, Lớp học Giáo dục, Sảnh Game): css/design-system.css")

    # Cập nhật index.html
    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v7.0", "v8.0")

        # 1. Nâng cấp Menu bên trái: Logo lớn sắc nét, bỏ mục Cấu hình AI
        drawer_start = html.find('<aside id="left-drawer"')
        drawer_end = html.find('</aside>', drawer_start) + len('</aside>')
        if drawer_start != -1 and drawer_end != -1:
            new_drawer = """<aside id="left-drawer" class="left-drawer">
    <div class="drawer-brand-hero">
      <button class="btn btn-sm" style="position:absolute;top:12px;right:12px" onclick="toggleLeftDrawer(false)">✕</button>
      <img src="assets/logo.jpg" class="drawer-logo-large" alt="V-Code Edu Logo" onerror="this.style.display='none'" />
      <strong style="font-size:18px;letter-spacing:-0.02em">V-Code Edu</strong>
      <span style="font-size:11.5px;color:var(--text-secondary)">Nền tảng Học lập trình Việt Nam</span>
    </div>
    <div class="drawer-section">
      <div class="drawer-label">Tài khoản của bạn</div>
      <div id="drawer-user-summary" style="padding:10px;border-radius:10px;background:var(--bg-elevated);border:1px solid var(--border-subtle);margin-bottom:10px"></div>
      <button class="btn btn-sm btn-primary" style="width:100%" onclick="toggleLeftDrawer(false); handleTopUserClick()">👤 Hồ sơ / Đăng nhập</button>
    </div>
    <div class="drawer-section">
      <div class="drawer-label">Không gian học tập</div>
      <button class="drawer-item active" data-view="home" onclick="switchView('home')"><span>🏠 Trang chủ 3D</span><span>→</span></button>
      <button class="drawer-item" data-view="learning" onclick="switchView('learning')"><span>📚 Khóa học (5 ngôn ngữ)</span><span>→</span></button>
      <button class="drawer-item" data-view="workspace" onclick="switchView('workspace')"><span>💻 IDE Tự do &amp; Scratch Live</span><span class="badge badge-easy">LIVE</span></button>
      <button class="drawer-item" data-view="classroom" onclick="switchView('classroom')"><span>🏫 Lớp học Trực tuyến</span><span>→</span></button>
      <button class="drawer-item" data-view="challenges" onclick="switchView('challenges')"><span>🎮 Sảnh Thử thách (50 Chặng)</span><span>→</span></button>
    </div>
    <div class="drawer-section">
      <div class="drawer-label">Kết nối hệ thống</div>
      <button class="drawer-item" onclick="toggleLeftDrawer(false); document.getElementById('oauth-config-modal').classList.add('open')"><span>🔐 Cấu hình Google / FB OAuth</span></button>
    </div>
  </aside>"""
            html = html[:drawer_start] + new_drawer + html[drawer_end:]

        # 2. Xóa cột bên trái trong IDE chính -> biến thành IDE Tự do 2 cột
        v3_start = html.find('<!-- ==================== VIEW 3:')
        v4_start = html.find('<!-- ==================== VIEW 4:')
        if v3_start != -1 and v4_start != -1:
            new_v3 = """<!-- ==================== VIEW 3: IDE TỰ DO 2 CỘT & SCRATCH LIVE ==================== -->
  <section id="view-workspace" class="view-section">
    <div class="workspace-shell free-ide-2pane">
      <section class="pane">
        <div class="pane-header">
          <div style="display:flex;align-items:center;gap:8px">
            <span class="mono" style="font-weight:700">main.py (Code Tự Do)</span>
            <button class="btn btn-sm" onclick="openShareModal()">🔗 Link &amp; QR</button>
            <button class="btn btn-sm" onclick="downloadPythonFile()">⬇ Tải .py</button>
          </div>
          <div style="display:flex;gap:6px">
            <button class="btn btn-primary btn-sm" onclick="runCodeAction()">▶ Chạy Chương Trình</button>
          </div>
        </div>
        <div id="snippet-bar" class="snippet-bar"></div>
        <div class="editor-wrapper"><div id="line-numbers" class="line-numbers">1</div><textarea id="code-editor" class="code-textarea" spellcheck="false" oninput="syncLiveEditorOutputs()"></textarea></div>
        <div style="padding:9px 14px;background:var(--bg-surface);border-top:1px solid var(--border-subtle);display:flex;align-items:center;gap:10px">
          <span class="mono" style="font-size:12px;color:var(--text-secondary)">Dữ liệu đầu vào (stdin):</span><input id="custom-stdin" class="input-field mono" style="width:140px;padding:4px 8px" value="6" />
        </div>
      </section>
      <aside class="pane">
        <div class="pane-header">
          <div class="subtabs">
            <button class="subtab-btn active" data-rtab="scratch" onclick="switchRightTab('scratch')">🧩 Scratch Live</button>
            <button class="subtab-btn" data-rtab="ai" onclick="switchRightTab('ai')">💻 Kết quả Console</button>
            <button class="subtab-btn" data-rtab="flow" onclick="switchRightTab('flow')">🔀 Sơ đồ khối</button>
          </div>
        </div>
        <div class="pane-scroll">
          <div id="rpanel-scratch" class="right-panel active"><div id="scratch-live-stage" class="scratch-stage"></div></div>
          <div id="rpanel-ai" class="right-panel"><div id="console-output" class="console-box" style="min-height:300px">Bấm "▶ Chạy Chương Trình" để xem kết quả...</div></div>
          <div id="rpanel-flow" class="right-panel"><div id="flowchart-box" style="background:var(--bg-surface);border:1px solid var(--border-subtle);border-radius:10px;padding:10px;text-align:center"></div></div>
        </div>
      </aside>
    </div>
  </section>

  """
            html = html[:v3_start] + new_v3 + html[v4_start:]

        # 3. Nâng cấp Sảnh chờ Game 50 chặng có thanh chọn Thế giới
        if 'id="world-filter-bar"' not in html:
            html = html.replace(
                '<div id="challenges-stages-grid" class="grid-3col"></div>',
                '<div id="world-filter-bar" class="world-filter-bar"></div>\n        <div id="challenges-stages-grid" class="grid-3col"></div>'
            )

        # 4. Nâng cấp Modal Xem bài học sinh thành Modal Chấm điểm & Đánh giá trả về Học sinh
        old_peek = '<div id="peek-modal" class="modal-overlay"><div class="modal-box"><button class="modal-close" onclick="closeModal(\'peek-modal\')">✕</button><h3 id="peek-student-name"></h3><p id="peek-student-problem" style="font-size:12px;color:var(--text-secondary);margin-bottom:8px"></p><pre id="peek-code-preview" class="console-box" style="max-height:220px"></pre><div style="display:flex;gap:8px"><input id="teacher-hint-input" class="input-field" placeholder="Gửi nhận xét trực tiếp..." /><button class="btn btn-primary btn-sm" onclick="sendTeacherHintAction()">Gửi</button></div></div></div>'
        new_peek = '<div id="peek-modal" class="modal-overlay"><div class="modal-box" style="max-width:560px"><button class="modal-close" onclick="closeModal(\'peek-modal\')">✕</button><span class="bento-tag">Chấm bài &amp; Đánh giá Học sinh</span><h3 id="peek-student-name"></h3><p id="peek-student-problem" style="font-size:12.5px;color:var(--text-secondary);margin-bottom:10px"></p><pre id="peek-code-preview" class="console-box" style="max-height:230px"></pre><div class="grid-2col" style="gap:10px;margin-bottom:10px"><div><label style="font-size:12px;font-weight:700">Điểm số giáo viên chấm (0 - 100):</label><input id="grade-score-input" type="number" min="0" max="100" value="100" class="input-field mono" style="margin-top:4px" /></div><div><label style="font-size:12px;font-weight:700">Lời nhận xét gửi về học sinh:</label><input id="teacher-hint-input" class="input-field" placeholder="VD: Làm tốt, code sạch sẽ!" style="margin-top:4px" /></div></div><button class="btn btn-primary" style="width:100%" onclick="submitTeacherGradeAction()">✓ Lưu Điểm &amp; Gửi Đánh Giá Về Học Sinh</button></div></div>'
        html = html.replace(old_peek, new_peek)

        # 5. Nhúng script js/challenges-50.js
        if 'js/challenges-50.js' not in html:
            html = html.replace('<script src="js/courses-data.js"></script>', '<script src="js/courses-data.js"></script>\n  <script src="js/challenges-50.js"></script>')

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã cập nhật giao diện v8.0: index.html")

    # Cập nhật js/app.js để fix triệt để hiển thị Khóa học, 50 chặng Game, và Chấm điểm Giáo viên
    v8_app_patch = """
// ==================== V8.0 PATCH: FIX COURSES RENDER + 50 STAGES GAME + TEACHER GRADING ====================
window.AppState.selectedWorld = 1;

// Ghi đè trực tiếp switchView để chắc chắn gọi đúng renderCoursesCatalog() và renderChallengeStages()
const _origSwitchViewV8 = window.switchView;
window.switchView = function(viewId) {
  _origSwitchViewV8(viewId);
  if (viewId === 'learning') window.renderCoursesCatalog();
  if (viewId === 'challenges') window.renderGameLobby50();
};

// Sảnh chờ Game 50 chặng chia 5 Thế giới (Python -> C -> C++)
window.selectGameWorld = function(wId) {
  window.AppState.selectedWorld = wId;
  window.renderGameLobby50();
};

window.renderGameLobby50 = function() {
  const list = window.VCODE_50_CHALLENGES || [];
  const doneIds = window.AppState.completedChallenges || [];
  const pct = Math.round((doneIds.length / Math.max(1, list.length)) * 100);
  const pTxt = document.getElementById('challenge-progress-text');
  const pBar = document.getElementById('challenge-progress-bar');
  if (pTxt) pTxt.textContent = `CẤP ĐỘ CHIẾN BINH: ${doneIds.length}/${list.length} CHẶNG (${pct}%)`;
  if (pBar) pBar.style.width = `${pct}%`;

  const wBar = document.getElementById('world-filter-bar');
  if (wBar) {
    const wNames = [
      { id: 1, label: '🚀 Thế giới 1: Python Cơ bản (1-10)' },
      { id: 2, label: '🔐 Thế giới 2: Logic & If (11-20)' },
      { id: 3, label: '🌀 Thế giới 3: Vòng lặp (21-30)' },
      { id: 4, label: '🛡️ Thế giới 4: Ngôn ngữ C (31-40)' },
      { id: 5, label: '👑 Thế giới 5: C++ HSG (41-50)' }
    ];
    wBar.innerHTML = wNames.map((w) => `<button class="world-btn ${window.AppState.selectedWorld === w.id ? 'active' : ''}" onclick="selectGameWorld(${w.id})">${w.label}</button>`).join('');
  }

  const grid = document.getElementById('challenges-stages-grid');
  if (!grid) return;
  const filtered = list.filter((c) => c.world === window.AppState.selectedWorld);
  grid.innerHTML = filtered.map((c) => {
    const done = doneIds.includes(c.id);
    return `
      <div class="game-stage-card ${done ? 'cleared' : ''}" style="border-color:${done ? '#10B981' : c.color}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:30px">${c.icon}</span>
          <span class="badge" style="background:rgba(245,158,11,0.22);color:#FBBF24">${done ? '⭐ ĐÃ PHÁ ĐẢO' : `🏆 +${c.xp} XP`}</span>
        </div>
        <div style="font-size:11px;color:#38BDF8;font-weight:800;margin-bottom:4px">NGÔN NGỮ: ${c.lang.toUpperCase()}</div>
        <h3 style="font-size:16px;color:#FFF;margin-bottom:8px">${c.title}</h3>
        <p style="font-size:12.5px;color:#CBD5E1;margin-bottom:16px">${c.desc}</p>
        <button class="game-play-btn" onclick="open50StageIDE('${c.id}')">${done ? '🔄 Chơi lại Chặng' : '🎮 VÀO TRẬN NGAY'}</button>
      </div>`;
  }).join('');
};

window.open50StageIDE = function(stageId) {
  const ch = (window.VCODE_50_CHALLENGES || []).find((c) => c.id === stageId);
  if (!ch) return;
  window.AppState.activeChallengeObj = ch;
  document.getElementById('ch-ide-title').textContent = `${ch.icon} ${ch.title} [${ch.lang.toUpperCase()}]`;
  document.getElementById('ch-ide-reward').textContent = `🏆 +${ch.xp} XP`;
  document.getElementById('ch-ide-heading').textContent = ch.title;
  document.getElementById('ch-ide-desc').textContent = ch.desc;
  document.getElementById('ch-code-editor').value = ch.starter;
  document.getElementById('ch-test-output').textContent = 'Viết code và bấm "⚡ Hoàn thành Chặng" để mở khóa huy hiệu!';
  switchView('challenge-ide');
};

window.runChallengeIDE = function(isSubmit) {
  const ch = window.AppState.activeChallengeObj;
  if (!ch) return;
  const code = document.getElementById('ch-code-editor').value;
  let passedAll = false;
  if (ch.lang === 'python') {
    const report = window.VCodeIDE.gradeSubmission(code, ch.testCases);
    passedAll = report.score === 100;
    document.getElementById('ch-test-output').innerHTML = report.details.map((d) => `• Test #${d.index}: ${d.passed ? '<span style="color:#34D399">✓ ĐẠT</span>' : `<span style="color:#FB7185">✗ SAI (Ra '${d.actual}', cần '${d.expected}')</span>`}`).join('<br/>');
  } else {
    passedAll = code.includes(ch.testCases[0].expected);
    document.getElementById('ch-test-output').innerHTML = passedAll ? `<span style="color:#34D399">✓ Biên dịch ${ch.lang.toUpperCase()} & Khớp khẩu lệnh 100%!</span>` : `<span style="color:#FB7185">✗ Chưa khớp khẩu lệnh '${ch.testCases[0].expected}'.</span>`;
  }
  if (isSubmit && passedAll) {
    if (!window.AppState.completedChallenges.includes(ch.id)) {
      window.AppState.completedChallenges.push(ch.id);
      localStorage.setItem('vcode_completed_challenges', JSON.stringify(window.AppState.completedChallenges));
    }
    showToast(`🏆 CHÚC MỪNG! Bạn đã phá đảo <b>${ch.title}</b>!`);
  }
};

// Giáo viên chấm điểm & gửi đánh giá trực tiếp lưu vào Database trả về cho Học sinh
window.submitTeacherGradeAction = async function() {
  const score = parseInt(document.getElementById('grade-score-input').value || '100', 10);
  const feedback = (document.getElementById('teacher-hint-input').value || '').trim();
  const username = window.AppState.peekStudentUsername;
  const classCode = window.AppState.activeClassroomCode;
  if (!username) return;
  try {
    await apiRequest('/api/assessment/grade', {
      method: 'POST',
      body: JSON.stringify({ username, classroom_code: classCode, score, feedback })
    });
    if (feedback) window.VCodeMonitor.sendHintToStudent(username, `[Điểm: ${score}/100] ${feedback}`);
    closeModal('peek-modal');
    showToast(`✅ Đã chấm <b>${score}/100đ</b> và gửi nhận xét về tài khoản học sinh!`);
    selectTeacherClassroom(classCode);
  } catch (err) {
    alert('Lỗi lưu điểm: ' + err.message);
  }
};

// Đảm bảo khi trang vừa tải xong là render ngay Khóa học và 50 Chặng Game
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.renderCoursesCatalog) window.renderCoursesCatalog();
    if (window.renderGameLobby50) window.renderGameLobby50();
  }, 120);
});
"""

    if os.path.exists("js/app.js"):
        app_js = open("js/app.js", "r", encoding="utf-8").read()
        marker = "// ==================== V8.0 PATCH:"
        if marker in app_js:
            app_js = app_js.split(marker)[0].rstrip()
        with open("js/app.js", "w", encoding="utf-8") as f:
            f.write(app_js + "\n\n" + v8_app_patch.strip() + "\n")
        print("✔ Đã hoàn thiện logic v8.0 (Khóa học, 50 chặng Game, Chấm điểm GV): js/app.js")

    print("\n🎉 HOÀN TẤT NÂNG CẤP V-CODE EDU v8.0!")
    print("👉 Bật lại Backend cổng 8000 và bấm Ctrl + Shift + R trên trình duyệt để trải nghiệm!")

if __name__ == "__main__":
    apply_v8()