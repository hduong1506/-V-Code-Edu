# -*- coding: utf-8 -*-
"""
V-CODE EDU v15.0 — NÂNG CẤP HOÀN THIỆN HỆ THỐNG CSDL CLOUD (FIRESTORE + BACKEND),
FIX LỖI ĐIỆN THOẠI (iOS Load failed), LỚP HỌC SẠCH KHÔNG LỚP MẪU, IDE ĐA ĐẦU VÀO (x, y...)
VÀ AI SẠCH CHUYÊN NGHIỆP.
"""
import os

BACKEND_INIT_DB = """from backend.database.base import Base
from backend.database.connection import engine

def init_database(reset_schema: bool = False):
    if reset_schema:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_database(reset_schema=False)
    print("✔ Đã khởi tạo CSDL sạch (không tạo lớp mẫu mặc định)!")
"""

def patch_backend():
    init_path = "backend/database/init_db.py"
    if os.path.exists(init_path):
        with open(init_path, "w", encoding="utf-8") as f:
            f.write(BACKEND_INIT_DB.strip() + "\n")
        print("✔ Đã làm sạch init_db.py (xóa lớp mặc định TIN10HP / Nguyễn Phi Hùng)")

    cls_router = "backend/routers/classrooms.py"
    if os.path.exists(cls_router):
        code = open(cls_router, "r", encoding="utf-8").read()
        if '@router.delete("/{code}")' not in code:
            extra_routes = """
@router.delete("/{code}")
def delete_classroom(code: str, db: Session = Depends(get_db)):
    c_code = code.strip().upper()
    cls = db.query(Classroom).filter(Classroom.code == c_code).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học để xóa.")
    db.query(ClassroomMember).filter(ClassroomMember.classroom_id == cls.id).delete()
    db.query(Assignment).filter(Assignment.classroom_code == c_code).delete()
    db.query(Submission).filter(Submission.classroom_code == c_code).delete()
    db.query(StudentLiveSession).filter(StudentLiveSession.class_code == c_code).delete()
    db.delete(cls)
    db.commit()
    return {"status": "deleted", "code": c_code}

@router.put("/{code}")
def rename_classroom(code: str, payload: dict, db: Session = Depends(get_db)):
    c_code = code.strip().upper()
    cls = db.query(Classroom).filter(Classroom.code == c_code).first()
    if not cls:
        raise HTTPException(status_code=404, detail="Không tìm thấy lớp học.")
    new_name = (payload.get("name") or "").strip()
    if new_name:
        cls.name = new_name
    db.commit()
    return {"status": "ok", "classroom": format_classroom(cls, db)}
"""
            with open(cls_router, "w", encoding="utf-8") as f:
                f.write(code.rstrip() + "\n" + extra_routes)
            print("✔ Đã thêm API Xóa & Đổi tên lớp vào backend/routers/classrooms.py")

CLOUD_DB_JS = """// V-CODE EDU v15.0 — CLOUD DATABASE ENGINE (FIREBASE FIRESTORE REAL-TIME + FASTAPI + LOCAL CACHE)
window.VCodeCloudDB = {
  _db: null,

  isReady() {
    const cfg = window.VCODE_FIREBASE_CONFIG;
    return Boolean(cfg && cfg.apiKey && cfg.projectId && typeof firebase !== 'undefined' && firebase.firestore);
  },

  db() {
    if (!this.isReady()) return null;
    if (!firebase.apps.length) firebase.initializeApp(window.VCODE_FIREBASE_CONFIG);
    if (!this._db) {
      this._db = firebase.firestore();
      try { this._db.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch {}
    }
    return this._db;
  },

  docKey(email) {
    return String(email || '').trim().toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  },

  async hashPass(str) {
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vcode_salt_2026_' + str));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    } catch {
      return btoa(unescape(encodeURIComponent('vc_' + str)));
    }
  },

  async getUser(email) {
    const fdb = this.db();
    if (!fdb) return null;
    const snap = await fdb.collection('users').doc(this.docKey(email)).get();
    return snap.exists ? snap.data() : null;
  },

  async saveUser(userObj) {
    const fdb = this.db();
    if (!fdb || !userObj?.email) return false;
    await fdb.collection('users').doc(this.docKey(userObj.email)).set({ ...userObj, updated_at: Date.now() }, { merge: true });
    return true;
  },

  async createClass(clsObj) {
    const fdb = this.db();
    if (!fdb) return false;
    await fdb.collection('classrooms').doc(clsObj.code).set({ ...clsObj, created_at: Date.now() });
    return true;
  },

  async getClass(code) {
    const fdb = this.db();
    if (!fdb) return null;
    const snap = await fdb.collection('classrooms').doc(code.trim().toUpperCase()).get();
    return snap.exists ? snap.data() : null;
  },

  async listTeacherClasses(teacherEmail) {
    const fdb = this.db();
    if (!fdb) return null;
    const snap = await fdb.collection('classrooms').where('teacher_email', '==', teacherEmail.toLowerCase()).get();
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  },

  async listStudentClasses(studentEmail) {
    const fdb = this.db();
    if (!fdb) return null;
    const snap = await fdb.collection('classrooms').where('student_emails', 'array-contains', studentEmail.toLowerCase()).get();
    return snap.docs.map((d) => d.data());
  },

  async joinClass(code, student) {
    const fdb = this.db();
    if (!fdb) return null;
    const ref = fdb.collection('classrooms').doc(code.trim().toUpperCase());
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Không tìm thấy lớp học với mã '${code}'. Hãy kiểm tra lại mã thầy/cô gửi!`);
    const data = snap.data();
    const emails = Array.isArray(data.student_emails) ? data.student_emails : [];
    const students = Array.isArray(data.students) ? data.students : [];
    const emailLow = student.email.toLowerCase();
    if (!emails.includes(emailLow)) {
      emails.push(emailLow);
      students.push({ username: student.username, full_name: student.full_name, email: emailLow, xp: student.xp || 100, joined_at: Date.now() });
      await ref.update({ student_emails: emails, students });
    }
    return { ...data, student_emails: emails, students };
  },

  async updateClass(code, patchObj) {
    const fdb = this.db();
    if (!fdb) return false;
    await fdb.collection('classrooms').doc(code.trim().toUpperCase()).update(patchObj);
    return true;
  },

  async deleteClass(code) {
    const fdb = this.db();
    if (!fdb) return false;
    await fdb.collection('classrooms').doc(code.trim().toUpperCase()).delete();
    return true;
  }
};
"""

IDE_ENGINE_V15_JS = """// V-CODE EDU v15.0 — PYTHON ENGINE HỖ TRỢ ĐA ĐẦU VÀO (x, y, z... NHIỀU DÒNG & input().split())
window.VCodeIDE = {
  translateVietnamesePython(code) {
    let out = code;
    const rules = [
      [/\\bnhap_so\\s*\\(\\s*\\)/g, 'int(input())'],
      [/\\bnhap_so_thuc\\s*\\(\\s*\\)/g, 'float(input())'],
      [/\\bnhap_chuoi\\s*\\(\\s*\\)/g, 'input()'],
      [/\\bin_ra\\s*\\(/g, 'print('],
      [/\\bneu\\b/g, 'if'],
      [/\\bnguoc_lai_neu\\b/g, 'elif'],
      [/\\bnguoc_lai\\b/g, 'else'],
      [/\\blap_voi\\b/g, 'for'],
      [/\\btrong_khoang\\b/g, 'in range'],
      [/\\bkhi_ma\\b/g, 'while'],
      [/\\bva\\b/g, 'and'],
      [/\\bhoac\\b/g, 'or']
    ];
    for (const [regex, rep] of rules) out = out.replace(regex, rep);
    return out;
  },

  buildInputQueue(stdinText) {
    const raw = Array.isArray(stdinText) ? stdinText.join('\\n') : String(stdinText ?? '');
    const lines = raw.replace(/\\r\\n/g, '\\n').split('\\n');
    while (lines.length > 1 && lines[lines.length - 1].trim() === '') lines.pop();
    const tokens = raw.trim() ? raw.trim().split(/\\s+/) : [];
    return { lines, lineIdx: 0, tokens, tokenIdx: 0 };
  },

  runPython(rawCode, stdinInput = '') {
    const code = this.translateVietnamesePython(rawCode);
    const q = this.buildInputQueue(stdinInput);
    const outputs = [];
    const env = {};
    let ops = 0;

    const nextLine = () => {
      if (q.lineIdx < q.lines.length) {
        const val = q.lines[q.lineIdx++];
        if (val !== '' || q.lineIdx < q.lines.length) return val;
      }
      return q.tokenIdx < q.tokens.length ? q.tokens[q.tokenIdx++] : '0';
    };

    const nextScalar = (caster) => {
      if (q.lines.length === 1 && q.tokens.length > 1 && q.tokenIdx < q.tokens.length) {
        return caster(q.tokens[q.tokenIdx++]);
      }
      return caster(nextLine());
    };

    const evalExpr = (expr) => {
      let s = expr.trim();
      if (!s) return undefined;
      if (/^map\\s*\\(\\s*int\\s*,\\s*input\\s*\\([^)]*\\)\\.split\\s*\\([^)]*\\)\\s*\\)$/.test(s)) {
        return nextLine().trim().split(/\\s+/).map((x) => parseInt(x, 10) || 0);
      }
      if (/^map\\s*\\(\\s*float\\s*,\\s*input\\s*\\([^)]*\\)\\.split\\s*\\([^)]*\\)\\s*\\)$/.test(s)) {
        return nextLine().trim().split(/\\s+/).map((x) => parseFloat(x) || 0);
      }
      if (/^input\\s*\\([^)]*\\)\\.split\\s*\\([^)]*\\)$/.test(s)) {
        return nextLine().trim().split(/\\s+/);
      }

      let jsExpr = s
        .replace(/\\bint\\s*\\(\\s*input\\s*\\([^)]*\\)\\s*\\)/g, '__inpInt()')
        .replace(/\\bfloat\\s*\\(\\s*input\\s*\\([^)]*\\)\\s*\\)/g, '__inpFloat()')
        .replace(/\\binput\\s*\\([^)]*\\)/g, '__inpStr()')
        .replace(/\\bTrue\\b/g, 'true')
        .replace(/\\bFalse\\b/g, 'false')
        .replace(/\\band\\b/g, '&&')
        .replace(/\\bor\\b/g, '||')
        .replace(/\\bnot\\s+/g, '!')
        .replace(/([^<>!=])\\/\\/([^=])/g, '$1/__floor__/$2');

      while (jsExpr.includes('/__floor__/')) {
        jsExpr = jsExpr.replace(/([\\w.\\)\\]]+)\\s*\\/__floor__\\/\\s*([\\w.\\(\\[]+)/, 'Math.floor(($1)/($2))');
      }

      const helpers = {
        __inpInt: () => nextScalar((v) => parseInt(v, 10) || 0),
        __inpFloat: () => nextScalar((v) => parseFloat(v) || 0),
        __inpStr: () => nextLine(),
        int: (v) => parseInt(v, 10) || 0,
        float: (v) => parseFloat(v) || 0,
        str: (v) => String(v),
        len: (v) => (v != null ? v.length : 0),
        abs: (v) => Math.abs(v),
        round: (v, d = 0) => Number(Number(v).toFixed(d)),
        max: (...a) => Math.max(...a.flat()),
        min: (...a) => Math.min(...a.flat()),
        sum: (a) => (Array.isArray(a) ? a.reduce((x, y) => x + y, 0) : Number(a) || 0),
        range: (a, b, step = 1) => {
          const start = b === undefined ? 0 : a, stop = b === undefined ? a : b, arr = [];
          for (let i = start; step > 0 ? i < stop : i > stop; i += step) arr.push(i);
          return arr;
        }
      };
      const keys = [...Object.keys(helpers), ...Object.keys(env)];
      const vals = [...Object.values(helpers), ...Object.values(env)];
      return new Function(...keys, `"use strict"; return (${jsExpr});`)(...vals);
    };

    const rawLines = code.replace(/\\r\\n/g, '\\n').split('\\n');
    const parsed = [];
    for (let idx = 0; idx < rawLines.length; idx++) {
      const raw = rawLines[idx], trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const indent = raw.match(/^\\s*/)[0].replace(/\\t/g, '    ').length;
      parsed.push({ lineNo: idx + 1, indent, text: trimmed });
    }

    const execBlock = (startIdx, baseIndent) => {
      let i = startIdx, lastIfTaken = false;
      while (i < parsed.length) {
        if (++ops > 15000) throw new Error('Infinite Loop: Chương trình vượt quá giới hạn vòng lặp.');
        const stmt = parsed[i];
        if (stmt.indent < baseIndent) break;
        if (stmt.indent > baseIndent) throw new Error(`IndentationError tại dòng ${stmt.lineNo}: Thụt lề không hợp lệ.`);
        const t = stmt.text;
        const collectChildEnd = (cur) => { let j = cur + 1; while (j < parsed.length && parsed[j].indent > baseIndent) j++; return j; };

        if (/^if\\b/.test(t)) {
          if (!t.endsWith(':')) throw new Error(`SyntaxError dòng ${stmt.lineNo}: Thiếu dấu ':' sau câu lệnh if.`);
          const cond = Boolean(evalExpr(t.slice(2, -1))), endJ = collectChildEnd(i);
          lastIfTaken = cond;
          if (cond && i + 1 < endJ) { if (execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') return 'BREAK'; }
          i = endJ;
        } else if (/^elif\\b/.test(t)) {
          const endJ = collectChildEnd(i);
          if (!lastIfTaken && Boolean(evalExpr(t.slice(4, -1)))) {
            lastIfTaken = true;
            if (i + 1 < endJ) { if (execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') return 'BREAK'; }
          }
          i = endJ;
        } else if (/^else\\s*:/.test(t)) {
          const endJ = collectChildEnd(i);
          if (!lastIfTaken && i + 1 < endJ) { if (execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') return 'BREAK'; }
          lastIfTaken = false; i = endJ;
        } else if (/^for\\s+([a-zA-Z_]\\w*)\\s+in\\s+(.+):$/.test(t)) {
          const m = t.match(/^for\\s+([a-zA-Z_]\\w*)\\s+in\\s+(.+):$/), iterable = evalExpr(m[2]), endJ = collectChildEnd(i);
          for (const val of (iterable || [])) {
            env[m[1]] = val;
            if (i + 1 < endJ && execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') break;
          }
          i = endJ;
        } else if (/^while\\s+(.+):$/.test(t)) {
          const m = t.match(/^while\\s+(.+):$/), endJ = collectChildEnd(i);
          while (Boolean(evalExpr(m[1]))) {
            if (++ops > 15000) throw new Error('Infinite Loop: Vòng lặp while chạy vô hạn.');
            if (i + 1 < endJ && execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') break;
          }
          i = endJ;
        } else if (t === 'break') {
          return 'BREAK';
        } else if (/^print\\s*\\((.*)\\)$/.test(t)) {
          const args = evalExpr(`[${t.match(/^print\\s*\\((.*)\\)$/)[1]}]`);
          outputs.push(args.map((x) => (x === true ? 'True' : (x === false ? 'False' : String(x)))).join(' '));
          i++;
        } else if (/^([a-zA-Z_]\\w*(?:\\s*,\\s*[a-zA-Z_]\\w*)+)\\s*=\\s*(.+)$/.test(t)) {
          const m = t.match(/^([a-zA-Z_]\\w*(?:\\s*,\\s*[a-zA-Z_]\\w*)+)\\s*=\\s*(.+)$/);
          const varNames = m[1].split(',').map((v) => v.trim());
          let rhsVal;
          try { rhsVal = evalExpr(m[2]); } catch { rhsVal = evalExpr(`[${m[2]}]`); }
          if (!Array.isArray(rhsVal)) rhsVal = evalExpr(`[${m[2]}]`);
          varNames.forEach((vn, k) => { env[vn] = rhsVal[k]; });
          i++;
        } else if (/^([a-zA-Z_]\\w*)\\s*(\\+=|-=|\\*=|\\/=)\\s*(.+)$/.test(t)) {
          const m = t.match(/^([a-zA-Z_]\\w*)\\s*(\\+=|-=|\\*=|\\/=)\\s*(.+)$/), v = evalExpr(m[3]);
          if (m[2] === '+=') env[m[1]] += v; else if (m[2] === '-=') env[m[1]] -= v; else if (m[2] === '*=') env[m[1]] *= v; else if (m[2] === '/=') env[m[1]] /= v;
          i++;
        } else if (/^([a-zA-Z_]\\w*)\\s*=\\s*(.+)$/.test(t)) {
          const m = t.match(/^([a-zA-Z_]\\w*)\\s*=\\s*(.+)$/);
          env[m[1]] = evalExpr(m[2]); i++;
        } else { evalExpr(t); i++; }
      }
    };

    try { execBlock(0, parsed[0] ? parsed[0].indent : 0); return { ok: true, output: outputs.join('\\n') }; }
    catch (err) { return { ok: false, error: err.message || String(err) }; }
  },

  gradeSubmission(code, testCases = []) {
    let passed = 0;
    const details = testCases.map((tc, idx) => {
      const res = this.runPython(code, tc.input);
      const actual = res.ok ? res.output.trim() : `LỖI: ${res.error}`;
      const ok = res.ok && actual === String(tc.expected).trim();
      if (ok) passed++;
      return { index: idx + 1, input: tc.input, expected: tc.expected, actual, passed: ok };
    });
    const total = Math.max(1, testCases.length);
    return { passed, total, score: Math.round((passed / total) * 100), details };
  }
};
"""

CLEAN_AI_TUTOR_JS = """// V-CODE EDU v15.0 — AI CHATBOX SẠCH (CHỈ TRẢ VỀ CÂU TRẢ LỜI TRỰC TIẾP, KHÔNG THÔNG TIN THỪA)
window.VCodeAI = {
  getConfig() {
    return {
      backendUrl: localStorage.getItem('vcode_backend_url') || 'http://localhost:8000',
      geminiKey: (localStorage.getItem('vcode_gemini_key') || '').trim(),
      openaiKey: (localStorage.getItem('vcode_openai_key') || '').trim()
    };
  },

  hasValidKey() {
    const cfg = this.getConfig();
    return Boolean((cfg.geminiKey && cfg.geminiKey.length >= 12) || (cfg.openaiKey && cfg.openaiKey.length >= 12));
  },

  formatMarkdown(text) {
    return String(text || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```[a-z]*\\n([\\s\\S]*?)```/g, '<pre style="background:#0F172A;color:#E2E8F0;padding:8px 10px;border-radius:8px;overflow-x:auto;margin:6px 0;font-size:12px"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(16,185,129,0.16);color:#059669;padding:1px 5px;border-radius:4px;font-weight:600">$1</code>')
      .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
      .replace(/\\n/g, '<br/>');
  },

  offlineSmartReply(question, code = '', errorText = '') {
    const q = (question || '').trim().toLowerCase();
    if (/^(hi|hello|hey|chào|chao|xin chào|alo)/.test(q)) return "Chào bạn! Bạn cần hỗ trợ câu hỏi hoặc đoạn code nào về Python, HTML, C, C++ hay SQL?";
    if (/SyntaxError/i.test(errorText) || q.includes('syntaxerror') || q.includes('lỗi cú pháp')) return "Kiểm tra dấu hai chấm `:` ở cuối dòng `if/elif/else/for/while/def`, cặp dấu ngoặc `()` và phép so sánh `==`.";
    if (/IndentationError/i.test(errorText) || q.includes('thụt lề')) return "Các lệnh nằm trong cùng khối `if/for/while` phải thụt lề đều nhau (4 khoảng trắng hoặc 1 phím Tab).";
    if (q.includes('nhập 2 số') || q.includes('x và y') || q.includes('nhiều dữ liệu')) return "Để nhập 2 số `x, y` trong Python:\\n```python\\nx = int(input())\\ny = int(input())\\n```\\nHoặc nhập trên 1 dòng cách nhau dấu cách:\\n```python\\nx, y = map(int, input().split())\\n```";
    if (q.includes('số nguyên tố') || q.includes('nguyen to')) return "```python\\nn = int(input())\\nla_nt = n > 1\\nfor i in range(2, int(n**0.5) + 1):\\n    if n % i == 0:\\n        la_nt = False\\n        break\\nprint('YES' if la_nt else 'NO')\\n```";
    if (q.includes('giai thừa') || q.includes('giai thua')) return "```python\\nn = int(input())\\ngt = 1\\nfor i in range(1, n + 1):\\n    gt *= i\\nprint(gt)\\n```";
    if (q.includes('for') || q.includes('vòng lặp') || q.includes('while')) return "```python\\nfor i in range(1, 6):\\n    print(i)\\n```";
    if (q.includes('if') || q.includes('rẽ nhánh') || q.includes('chẵn') || q.includes('lẻ')) return "```python\\nn = int(input())\\nif n % 2 == 0:\\n    print('Chan')\\nelse:\\n    print('Le')\\n```";
    if (q.includes('c++') || q.includes('cpp')) return "```cpp\\n#include <iostream>\\nusing namespace std;\\nint main() {\\n    int x, y;\\n    cin >> x >> y;\\n    cout << x + y;\\n    return 0;\\n}\\n```";
    return "Hãy mô tả cụ thể hơn bài toán hoặc dán đoạn code bạn đang gặp khó khăn để mình giải đáp ngay.";
  },

  async askHybrid(question, code = '', errorText = '') {
    const cfg = this.getConfig();
    const systemPrompt = "Bạn là trợ lý lập trình của V-Code Edu. Trả lời thẳng vào câu hỏi bằng tiếng Việt, ngắn gọn, chính xác, không thêm lời rào đón thừa.";
    const userContent = errorText ? `Câu hỏi: ${question}\\nLỗi: ${errorText}\\nCode:\\n${code}` : question;

    if (navigator.onLine) {
      if (cfg.openaiKey && cfg.openaiKey.startsWith('sk-')) {
        try {
          const r = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.openaiKey}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], max_tokens: 600 })
          });
          const d = await r.json();
          if (r.ok && d.choices?.[0]?.message?.content) return { mode: 'online-openai', text: d.choices[0].message.content.trim() };
        } catch {}
      }

      if (cfg.geminiKey && cfg.geminiKey.length >= 12) {
        for (const model of ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash']) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.geminiKey)}`;
            const r = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.geminiKey },
              body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\\n\\n${userContent}` }] }] })
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok && d.candidates?.[0]?.content?.parts?.[0]?.text) return { mode: 'online-gemini', text: d.candidates[0].content.parts[0].text.trim() };
          } catch {}
        }
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

V15_CSS = """
/* ==================== V15.0: MOBILE RESPONSIVE + PRO AI ICON + CLASS MANAGER + STDIN ==================== */
.robot-ai-fab {
  background: linear-gradient(145deg, #0F172A 0%, #1E293B 100%) !important;
  border: 2px solid #10B981 !important;
  box-shadow: 0 10px 28px rgba(16, 185, 129, 0.35), 0 0 0 4px rgba(16, 185, 129, 0.12) !important;
  padding: 11px !important;
}
.robot-ai-fab:hover { transform: scale(1.06); border-color: #38BDF8 !important; }

.vcode-stdin-area {
  width: 260px; min-height: 44px; max-height: 96px; resize: vertical;
  padding: 6px 10px; border-radius: 8px; border: 1px solid var(--border-strong);
  background: var(--bg-elevated); color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace; font-size: 12.5px; line-height: 1.45;
}
.workspace-shell[data-ide-theme="dark"] .vcode-stdin-area { background: #0F172A; color: #34D399; border-color: #334155; }

.vcode-class-manager-bar { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.vcode-class-select {
  min-width: 220px; padding: 8px 12px; border-radius: 10px; border: 1.5px solid #3B82F6;
  background: var(--bg-surface); color: var(--text-primary); font-weight: 700; font-size: 13.5px; cursor: pointer;
}
.home-terminal-card {
  background: #0B1120; border: 1px solid rgba(56, 189, 248, 0.3); border-radius: 12px;
  padding: 14px; text-align: left; font-family: 'JetBrains Mono', monospace;
  font-size: 12px; color: #E2E8F0; margin-top: 8px;
}

@media (max-width: 768px) {
  .topbar { padding: 0 10px !important; }
  .nav-segmented { display: none !important; }
  .status-pill { display: none !important; }
  .modal-box { width: calc(100vw - 24px) !important; max-height: 90vh; overflow-y: auto; }
  .olm-auth-right { padding: 22px 18px !important; }
  .vcode-stdin-area { width: 100% !important; }
  .ide-footer-bar { flex-direction: column; align-items: stretch !important; }
  .robot-ai-popup { width: calc(100vw - 20px) !important; right: 10px !important; bottom: 86px !important; }
}
"""

V15_APP_PATCH = """
// ==================== V15.0 PATCH: 100% CLOUD DB (FIRESTORE) + FIX iOS MOBILE + ZERO DEFAULT CLASS ====================
window.isNetworkFailure = function(err) {
  const m = String(err?.message || err || '').toLowerCase();
  return m.includes('offline') || m.includes('failed to fetch') || m.includes('load failed') || m.includes('networkerror') || m.includes('network request failed') || m.includes('aborted');
};

window.LocalClassDB = {
  KEY: 'vcode_local_classrooms_v15_clean',
  load() {
    try { const d = JSON.parse(localStorage.getItem(this.KEY) || 'null'); if (d && Array.isArray(d.classes)) return d; } catch {}
    const init = { classes: [] };
    this.save(init);
    return init;
  },
  save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); }
};

window.handleRegisterSubmit = async function(e) {
  e.preventDefault();
  const full_name = document.getElementById('reg-fullname').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;
  if (password.length < 6) { alert('Mật khẩu phải có ít nhất 6 ký tự.'); return; }

  if (window.VCodeCloudDB && window.VCodeCloudDB.isReady()) {
    try {
      const existing = await window.VCodeCloudDB.getUser(email);
      if (existing) { alert('Email này đã được đăng ký! Vui lòng chuyển sang Đăng nhập.'); return; }
      const passHash = await window.VCodeCloudDB.hashPass(password);
      const newUser = {
        username: email.split('@')[0].replace(/[^a-z0-9_]/g, '') + '_' + Math.floor(10 + Math.random() * 89),
        email, full_name, password_hash: passHash,
        role: 'none', auth_provider: 'local', school_name: '', class_name: '', xp: 100
      };
      await window.VCodeCloudDB.saveUser(newUser);
      saveLoggedInUser(newUser);
      closeModal('auth-modal');
      showToast(`🎉 Tạo tài khoản thành công cho <b>${full_name}</b>!`);
      return;
    } catch {}
  }

  try {
    const data = await apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify({ full_name, email, password }) });
    saveLoggedInUser(data.user);
    closeModal('auth-modal');
    showToast(`🎉 Tạo tài khoản thành công cho <b>${data.user.full_name}</b>!`);
  } catch (err) {
    if (window.isNetworkFailure(err)) {
      const db = window.VCodeOfflineDB.load();
      db.users = db.users || [];
      if (db.users.some((u) => u.email === email)) { alert('Email này đã được đăng ký trên thiết bị này. Vui lòng Đăng nhập!'); return; }
      const localUser = { username: email.split('@')[0], email, full_name, password, role: 'none', auth_provider: 'local', school_name: '', class_name: '', xp: 100 };
      db.users.push(localUser);
      window.VCodeOfflineDB.save(db);
      saveLoggedInUser(localUser);
      closeModal('auth-modal');
      showToast(`🎉 Đã tạo tài khoản cho <b>${full_name}</b>!`);
    } else { alert(err.message); }
  }
};

window.handleLoginSubmit = async function(e) {
  e.preventDefault();
  const ident = document.getElementById('login-identifier').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;

  if (window.VCodeCloudDB && window.VCodeCloudDB.isReady()) {
    try {
      const cloudUser = await window.VCodeCloudDB.getUser(ident);
      if (cloudUser) {
        const passHash = await window.VCodeCloudDB.hashPass(password);
        if (cloudUser.password_hash && cloudUser.password_hash !== passHash) { alert('Mật khẩu không chính xác.'); return; }
        saveLoggedInUser(cloudUser);
        closeModal('auth-modal');
        showToast(`👋 Xin chào <b>${cloudUser.full_name}</b>!`);
        return;
      }
    } catch {}
  }

  try {
    const data = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: ident, password }) });
    saveLoggedInUser(data.user);
    closeModal('auth-modal');
    showToast(`👋 Xin chào <b>${data.user.full_name}</b>!`);
  } catch (err) {
    if (window.isNetworkFailure(err)) {
      const db = window.VCodeOfflineDB.load();
      const found = (db.users || []).find((u) => (u.email === ident || u.username === ident) && (!u.password || u.password === password));
      if (found) {
        saveLoggedInUser(found);
        closeModal('auth-modal');
        showToast(`👋 Đăng nhập thành công: <b>${found.full_name}</b>!`);
      } else { alert('Sai email/mật khẩu hoặc tài khoản chưa được đăng ký.'); }
    } else { alert(err.message); }
  }
};

window.handleRealSocialLogin = async function(provider) {
  if (!window.VCodeOAuth || !window.VCodeOAuth.isConfigured()) {
    document.getElementById('oauth-config-modal').classList.add('open');
    return;
  }
  try {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (!firebase.apps.length) firebase.initializeApp(window.VCODE_FIREBASE_CONFIG);
    let authProv = provider === 'google' ? new firebase.auth.GoogleAuthProvider()
      : (provider === 'facebook' ? new firebase.auth.FacebookAuthProvider() : new firebase.auth.GithubAuthProvider());
    if (isMobile) { await firebase.auth().signInWithRedirect(authProv); return; }
    const result = await firebase.auth().signInWithPopup(authProv);
    await window.finalizeSocialFirebaseUser(result.user, provider);
  } catch (err) { alert(`Không thể đăng nhập bằng ${provider.toUpperCase()}: ${err.message}`); }
};

window.finalizeSocialFirebaseUser = async function(fbUser, provider = 'google') {
  if (!fbUser) return;
  const email = (fbUser.email || `${fbUser.uid}@${provider}.vcode.edu`).toLowerCase();
  let userObj = window.VCodeCloudDB?.isReady() ? await window.VCodeCloudDB.getUser(email) : null;
  if (!userObj) {
    userObj = {
      username: email.split('@')[0].replace(/[^a-z0-9_]/g, '') + '_' + Math.floor(10 + Math.random() * 89),
      email, full_name: fbUser.displayName || email.split('@')[0], avatar_url: fbUser.photoURL || '',
      role: 'none', auth_provider: provider, school_name: '', class_name: '', xp: 150
    };
    if (window.VCodeCloudDB?.isReady()) await window.VCodeCloudDB.saveUser(userObj);
  }
  saveLoggedInUser(userObj);
  closeModal('auth-modal');
  showToast(`✅ Đã đăng nhập: <b>${userObj.full_name}</b>!`);
};

window.lockRoleOnceAction = async function(role) {
  const label = role === 'teacher' ? 'GIÁO VIÊN' : 'HỌC SINH';
  if (!confirm(`Xác nhận đăng ký vai trò ${label}? Vai trò này chỉ được chọn 1 lần duy nhất.`)) return;
  const u = window.AppState.user;
  u.role = role;
  if (window.VCodeCloudDB?.isReady()) { try { await window.VCodeCloudDB.saveUser(u); } catch {} }
  else { try { await apiRequest('/api/auth/set-role', { method: 'POST', body: JSON.stringify({ email: u.email, role, school_name: '', class_name: '' }) }); } catch {} }
  const db = window.VCodeOfflineDB.load();
  db.users = (db.users || []).map((x) => x.email === u.email ? { ...x, role } : x);
  window.VCodeOfflineDB.save(db);
  saveLoggedInUser(u);
  showToast(`🔒 Đã kích hoạt vai trò <b>${label}</b>!`);
  initClassroomPortalData();
};

window.initClassroomPortalData = async function() {
  const u = window.AppState.user;
  const loginBox = document.getElementById('classroom-login-required');
  const roleBox = document.getElementById('classroom-role-once-picker');
  const ws = document.getElementById('olm-main-workspace');
  if (!loginBox || !roleBox || !ws) return;

  loginBox.style.display = 'none'; roleBox.style.display = 'none'; ws.style.display = 'none';
  if (!u) { loginBox.style.display = 'block'; return; }
  if (!u.role || u.role === 'none') { roleBox.style.display = 'block'; return; }

  ws.style.display = 'grid';
  const isTeacher = u.role === 'teacher' || u.role === 'admin';
  let classes = [];

  if (window.VCodeCloudDB?.isReady()) {
    try { classes = isTeacher ? await window.VCodeCloudDB.listTeacherClasses(u.email) : await window.VCodeCloudDB.listStudentClasses(u.email); } catch {}
  } else {
    try {
      const endpoint = isTeacher ? `/api/classes/teacher/${encodeURIComponent(u.email)}` : `/api/classes/student/${encodeURIComponent(u.email)}`;
      const res = await apiRequest(endpoint);
      classes = res.classes || [];
    } catch {
      const ldb = window.LocalClassDB.load();
      classes = isTeacher ? ldb.classes.filter((c) => c.teacher_email === u.email) : ldb.classes.filter((c) => (c.students || []).some((s) => s.email === u.email));
    }
  }

  window.AppState.olmClasses = classes || [];
  const actBox = document.getElementById('olm-role-actions');
  if (isTeacher) {
    actBox.innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('create-class-modal').classList.add('open')">+ Tạo lớp mới</button>
      <button class="btn btn-blue btn-sm" onclick="openCreateAssignmentModal()">📝 Giao bài tập</button>
      <button class="btn btn-sm" onclick="openClassManagerModal()">⚙️ Quản lý DS Lớp (${classes.length})</button>`;
  } else {
    actBox.innerHTML = `
      <input id="student-join-code-input" class="input-field mono" style="width:170px;padding:6px 10px;text-transform:uppercase;font-weight:700" placeholder="Nhập ID mã lớp..." />
      <button class="olm-hw-btn" style="padding:7px 14px;font-size:12.5px" onclick="joinClassByCodeAction()">+ Vào lớp</button>`;
  }

  const pills = document.getElementById('olm-class-pills');
  const infoCard = document.querySelector('#olm-main-workspace .olm-white-card');
  const tabsCard = document.querySelectorAll('#olm-main-workspace .olm-white-card')[1];

  if (!classes || classes.length === 0) {
    pills.innerHTML = `<span style="font-size:14px;font-weight:700;color:var(--text-secondary)">📂 Bạn chưa có lớp học nào</span>`;
    if (infoCard) infoCard.style.display = 'none';
    if (tabsCard) {
      tabsCard.style.display = 'block';
      document.getElementById('olm-hw-list').innerHTML = `
        <div style="text-align:center;padding:36px 16px">
          <div style="font-size:44px;margin-bottom:10px">${isTeacher ? '👨‍🏫' : '🎓'}</div>
          <h3 style="margin-bottom:6px">Bạn chưa có lớp học nào</h3>
          <p style="font-size:13.5px;color:#64748B;margin-bottom:18px">${isTeacher ? 'Hãy bấm "+ Tạo lớp mới" để tạo lớp học đầu tiên và nhận mã ID chia sẻ cho học sinh.' : 'Hãy nhập ID mã lớp mà thầy/cô đã gửi vào ô phía trên để tham gia lớp học.'}</p>
          ${isTeacher ? `<button class="btn btn-primary" onclick="document.getElementById('create-class-modal').classList.add('open')">+ Tạo lớp học đầu tiên</button>` : ''}
        </div>`;
    }
    return;
  }

  if (infoCard) infoCard.style.display = 'block';
  if (!window.AppState.activeClassroomCode || !classes.some((c) => c.code === window.AppState.activeClassroomCode)) {
    window.AppState.activeClassroomCode = classes[0].code;
  }

  pills.innerHTML = `
    <div class="vcode-class-manager-bar">
      <select class="vcode-class-select" onchange="selectOlmClass(this.value)">
        ${classes.map((c) => `<option value="${c.code}" ${c.code === window.AppState.activeClassroomCode ? 'selected' : ''}>🏫 ${c.name} (${c.code})</option>`).join('')}
      </select>
    </div>`;

  await selectOlmClass(window.AppState.activeClassroomCode);
};

window.handleCreateClassSubmit = async function(e) {
  e.preventDefault();
  const u = window.AppState.user;
  const customCode = (document.getElementById('new-class-code').value || '').trim().toUpperCase();
  const code = customCode || ('VC' + Math.floor(1000 + Math.random() * 9000));
  const clsObj = {
    code, name: document.getElementById('new-class-name').value.trim(),
    grade_subject: document.getElementById('new-class-subject').value.trim() || 'Tin học • Python',
    description: document.getElementById('new-class-desc').value.trim(),
    teacher_email: u.email.toLowerCase(), teacher_name: u.full_name,
    student_emails: [], students: [], assignments: [], submissions: []
  };

  if (window.VCodeCloudDB?.isReady()) { await window.VCodeCloudDB.createClass(clsObj); }
  else {
    try { const res = await apiRequest('/api/classes/create', { method: 'POST', body: JSON.stringify(clsObj) }); clsObj.code = res.classroom.code; }
    catch { const ldb = window.LocalClassDB.load(); ldb.classes.unshift(clsObj); window.LocalClassDB.save(ldb); }
  }
  closeModal('create-class-modal');
  e.target.reset();
  window.AppState.activeClassroomCode = clsObj.code;
  showToast(`🎉 Đã tạo lớp <b>${clsObj.name}</b> — Mã lớp: <b>${clsObj.code}</b>`);
  initClassroomPortalData();
};

window.joinClassByCodeAction = async function(explicitCode) {
  const inp = document.getElementById('student-join-code-input');
  const code = (explicitCode || inp?.value || '').trim().toUpperCase();
  if (!code) { alert('Vui lòng nhập ID mã lớp học!'); return; }
  const u = window.AppState.user;

  if (window.VCodeCloudDB?.isReady()) {
    try {
      const joined = await window.VCodeCloudDB.joinClass(code, u);
      if (inp) inp.value = '';
      window.AppState.activeClassroomCode = joined.code;
      showToast(`🎉 Đã vào lớp <b>${joined.name}</b> (GV: ${joined.teacher_name})!`);
      initClassroomPortalData();
      return;
    } catch (err) { alert(err.message); return; }
  }

  try {
    const res = await apiRequest('/api/classes/join', { method: 'POST', body: JSON.stringify({ code, student_email: u.email }) });
    if (inp) inp.value = '';
    window.AppState.activeClassroomCode = res.classroom.code;
    showToast(`🎉 Đã vào lớp <b>${res.classroom.name}</b>!`);
    initClassroomPortalData();
  } catch {
    const ldb = window.LocalClassDB.load();
    const cls = ldb.classes.find((c) => c.code === code);
    if (!cls) { alert(`Không tìm thấy lớp với mã '${code}'. Để nhiều thiết bị vào chung lớp qua mạng, hãy dán cấu hình Firebase Firestore vào file js/firebase-auth.js!`); return; }
    cls.students = cls.students || [];
    if (!cls.students.some((s) => s.email === u.email)) {
      cls.students.push({ username: u.username, full_name: u.full_name, email: u.email, xp: u.xp || 100 });
      window.LocalClassDB.save(ldb);
    }
    if (inp) inp.value = '';
    window.AppState.activeClassroomCode = cls.code;
    showToast(`🎉 Đã tham gia lớp <b>${cls.name}</b>!`);
    initClassroomPortalData();
  }
};

window.selectOlmClass = async function(code) {
  window.AppState.activeClassroomCode = code;
  let detail = null;
  if (window.VCodeCloudDB?.isReady()) {
    const cls = await window.VCodeCloudDB.getClass(code);
    if (cls) {
      detail = {
        classroom: cls,
        roster: (cls.students || []).map((st) => {
          const sub = (cls.submissions || []).find((x) => x.username === st.username);
          return {
            username: st.username, full_name: st.full_name, email: st.email, xp: st.xp || 100,
            status: sub ? 'completed' : 'not_started', problem: sub ? sub.assignment_code : 'Chưa làm bài',
            progress: sub ? 100 : 0, score: sub ? sub.score : null, code: sub ? sub.source_code : '', updated: sub ? sub.submitted_at : 'Chưa làm'
          };
        }),
        assignments: cls.assignments || [], submissions: cls.submissions || []
      };
    }
  } else {
    try { detail = await apiRequest(`/api/classes/${encodeURIComponent(code)}/detail`); }
    catch {
      const ldb = window.LocalClassDB.load();
      const cls = ldb.classes.find((c) => c.code === code);
      if (cls) {
        detail = {
          classroom: cls,
          roster: (cls.students || []).map((st) => ({ username: st.username, full_name: st.full_name, email: st.email, xp: st.xp || 100, status: 'not_started', problem: 'Chưa mở bài tập', progress: 0, score: null, code: '', updated: 'Chưa làm' })),
          assignments: cls.assignments || [], submissions: cls.submissions || []
        };
      }
    }
  }
  window.AppState.olmActiveDetail = detail;
  window.AppState.currentRoster = detail?.roster || [];
  window.__classAssignmentsCache = detail?.assignments || [];
  renderOlmActiveClass();
};

window.openClassManagerModal = function() {
  const list = window.AppState.olmClasses || [];
  const box = document.getElementById('class-manager-list');
  if (box) {
    box.innerHTML = list.length ? list.map((c) => `
      <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;padding:12px;border-radius:10px;background:var(--bg-elevated);margin-bottom:8px;flex-wrap:wrap">
        <div><strong>${c.name}</strong> <span class="olm-code-chip" style="font-size:11px;padding:2px 6px">${c.code}</span><div style="font-size:12px;color:var(--text-secondary)">${(c.students || []).length || c.students_count || 0} học sinh</div></div>
        <div style="display:flex;gap:6px"><button class="btn btn-sm" onclick="renameClassAction('${c.code}', '${c.name.replace(/'/g, '')}')">✏️ Đổi tên</button><button class="btn btn-sm" style="border-color:#E11D48;color:#E11D48" onclick="deleteClassAction('${c.code}')">🗑️ Xóa</button></div>
      </div>`).join('') : '<p style="color:var(--text-secondary)">Bạn chưa có lớp học nào.</p>';
  }
  document.getElementById('class-manager-modal')?.classList.add('open');
};

window.renameClassAction = async function(code, oldName) {
  const newName = prompt('Nhập tên lớp học mới:', oldName);
  if (!newName || !newName.trim()) return;
  if (window.VCodeCloudDB?.isReady()) { await window.VCodeCloudDB.updateClass(code, { name: newName.trim() }); }
  else {
    try { await apiRequest(`/api/classes/${code}`, { method: 'PUT', body: JSON.stringify({ name: newName.trim() }) }); }
    catch { const ldb = window.LocalClassDB.load(); const cls = ldb.classes.find((c) => c.code === code); if (cls) { cls.name = newName.trim(); window.LocalClassDB.save(ldb); } }
  }
  closeModal('class-manager-modal');
  showToast(`✅ Đã đổi tên lớp ${code}!`);
  initClassroomPortalData();
};

window.deleteClassAction = async function(code) {
  if (!confirm(`Bạn chắc chắn muốn XÓA vĩnh viễn lớp ${code}?`)) return;
  if (window.VCodeCloudDB?.isReady()) { await window.VCodeCloudDB.deleteClass(code); }
  else {
    try { await apiRequest(`/api/classes/${code}`, { method: 'DELETE' }); }
    catch { const ldb = window.LocalClassDB.load(); ldb.classes = ldb.classes.filter((c) => c.code !== code); window.LocalClassDB.save(ldb); }
  }
  if (window.AppState.activeClassroomCode === code) window.AppState.activeClassroomCode = '';
  closeModal('class-manager-modal');
  showToast(`🗑️ Đã xóa lớp ${code}!`);
  initClassroomPortalData();
};

window.sendRobotAIChat = async function() {
  const inp = document.getElementById('robot-chat-input');
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  const feed = document.getElementById('robot-chat-feed');
  feed.innerHTML += `<div class="chat-msg user">${q.replace(/</g, '&lt;')}</div>`;
  const code = document.getElementById('code-editor')?.value || '';
  const res = await window.VCodeAI.askHybrid(q, code);
  feed.innerHTML += `<div class="chat-msg ai">${window.VCodeAI.formatMarkdown(res.text)}</div>`;
  feed.scrollTop = feed.scrollHeight;
};

window.addEventListener('DOMContentLoaded', async () => {
  if (window.VCodeOAuth?.isConfigured() && typeof firebase !== 'undefined') {
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.VCODE_FIREBASE_CONFIG);
      const red = await firebase.auth().getRedirectResult();
      if (red && red.user) await window.finalizeSocialFirebaseUser(red.user, 'google');
    } catch {}
  }
});
"""

PRO_AI_SVG = """<svg width="32" height="32" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="8" width="28" height="22" rx="8" fill="#10B981" fill-opacity="0.18" stroke="#10B981" stroke-width="2.2"/><circle cx="13" cy="18" r="2.6" fill="#38BDF8"/><circle cx="23" cy="18" r="2.6" fill="#38BDF8"/><path d="M13 24.5H23" stroke="#10B981" stroke-width="2.2" stroke-linecap="round"/><path d="M18 3V8" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/><circle cx="18" cy="3" r="2" fill="#38BDF8"/></svg>"""

def apply_v15():
    patch_backend()

    with open("js/cloud-db.js", "w", encoding="utf-8") as f:
        f.write(CLOUD_DB_JS.strip() + "\n")
    print("✔ Đã tạo động cơ CSDL Đám mây Firestore chịu tải lớn: js/cloud-db.js")

    with open("js/ide-engine.js", "w", encoding="utf-8") as f:
        f.write(IDE_ENGINE_V15_JS.strip() + "\n")
    print("✔ Đã nâng cấp IDE hỗ trợ đa đầu vào (x, y, z nhiều dòng & split()): js/ide-engine.js")

    with open("js/ai-tutor.js", "w", encoding="utf-8") as f:
        f.write(CLEAN_AI_TUTOR_JS.strip() + "\n")
    print("✔ Đã làm sạch câu trả lời AI (chỉ trả lời trực tiếp, không thông tin thừa): js/ai-tutor.js")

    css_path = "css/design-system.css"
    old_css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V15.0: MOBILE RESPONSIVE"
    if marker in old_css:
        old_css = old_css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(old_css + "\n\n" + V15_CSS.strip() + "\n")
    print("✔ Đã tối ưu Mobile, giao diện AI Pro & ô nhập nhiều dữ liệu: css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v14.0", "v15.0")
        html = html.replace("Lớp học OLM", "Lớp học V-Code").replace("chuẩn OLM", "chuẩn V-Code").replace("(OLM)", "(V-Code)").replace("OLM.VN", "V-Code").replace(">OLM<", ">V-Code<")

        cube_start = html.find('<div class="home-3d-card" style="text-align:center">')
        cube_end = html.find('</div>\n\n        <div class="home-3d-card">', cube_start)
        if cube_start != -1 and cube_end != -1:
            terminal_card = """<div class="home-3d-card">
          <span class="bento-tag">Thực thi Thời gian thực</span>
          <h3 style="font-size:17px;margin-bottom:6px">Trình Biên dịch Đa Đầu Vào</h3>
          <div class="home-terminal-card">
            <div style="color:#64748B"># Nhập x, y tự do nhiều dòng</div>
            <div><span style="color:#38BDF8">x, y</span> = <span style="color:#10B981">map</span>(int, input().split())</div>
            <div><span style="color:#10B981">print</span>(<span style="color:#FBBF24">"Tổng ="</span>, x + y)</div>
            <div style="margin-top:8px;padding-top:6px;border-top:1px dashed #334155;color:#34D399">&gt;&gt;&gt; Tổng = 25 (0.01s • 100% PASS)</div>
          </div>"""
            html = html[:cube_start] + terminal_card + html[cube_end:]

        html = html.replace(
            '<div id="robot-ai-fab" class="robot-ai-fab" title="Kéo di chuyển hoặc bấm mở Trợ lý AI">🤖</div>',
            f'<div id="robot-ai-fab" class="robot-ai-fab" title="Trợ lý AI V-Code Edu">{PRO_AI_SVG}</div>'
        )
        html = html.replace('🤖 Trợ lý AI V-Code Edu', 'Trợ lý AI V-Code Edu')
        html = html.replace(
            '<input id="custom-stdin" class="input-field mono" style="width:140px;padding:4px 8px" value="6" />',
            '<textarea id="custom-stdin" class="vcode-stdin-area" rows="2" placeholder="Nhập nhiều dữ liệu (VD: mỗi số 1 dòng hoặc cách dấu cách)...">6</textarea>'
        )
        html = html.replace(
            '<input id="exam-stdin" class="input-field mono" style="width:130px;padding:4px 8px" value="6" />',
            '<textarea id="exam-stdin" class="vcode-stdin-area" rows="2" placeholder="Nhập x, y (mỗi giá trị 1 dòng hoặc cách dấu cách)...">6</textarea>'
        )

        if 'firebase-firestore-compat.js' not in html:
            html = html.replace(
                '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js" defer></script>',
                '<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js" defer></script>\n  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js" defer></script>'
            )
        if 'js/cloud-db.js' not in html:
            html = html.replace('<script src="js/firebase-auth.js"></script>', '<script src="js/firebase-auth.js"></script>\n  <script src="js/cloud-db.js"></script>')

        if 'id="class-manager-modal"' not in html:
            mgr_modal = """
  <div id="class-manager-modal" class="modal-overlay">
    <div class="modal-box" style="max-width:520px">
      <button class="modal-close" onclick="closeModal('class-manager-modal')">✕</button>
      <span class="bento-tag">Quản trị Lớp học</span>
      <h3 style="margin-bottom:12px">Danh sách Lớp học của bạn</h3>
      <div id="class-manager-list" style="max-height:360px;overflow-y:auto"></div>
    </div>
  </div>
"""
            html = html.replace('<div id="toast-banner"', mgr_modal + '\n  <div id="toast-banner"')

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã cập nhật toàn diện index.html")

    if os.path.exists("js/app.js"):
        app_js = open("js/app.js", "r", encoding="utf-8").read()
        marker = "// ==================== V15.0 PATCH:"
        if marker in app_js:
            app_js = app_js.split(marker)[0].rstrip()
        with open("js/app.js", "w", encoding="utf-8") as f:
            f.write(app_js + "\n\n" + V15_APP_PATCH.strip() + "\n")
        print("✔ Đã tích hợp CloudDB, fix iOS Safari, xóa lớp mẫu & QL nhiều lớp: js/app.js")

    print("\n🎉 HOÀN TẤT NÂNG CẤP V-CODE EDU v15.0!")

if __name__ == "__main__":
    apply_v15()