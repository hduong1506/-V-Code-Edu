# -*- coding: utf-8 -*-
"""
V-CODE EDU v16.0 — BẢN NÂNG CẤP TOÀN DIỆN:
- IDE hỗ trợ Tab, Shift+Tab, tự động thụt lề sau if/for/while/def & nhập input() trực tiếp.
- Scratch Live chuẩn 100% (sửa triệt để lỗi if bị hiện thành Thực thi).
- Lớp học sạch (xóa nháy Nguyễn Phi Hùng 2-3s đầu), sửa Giao bài tập lưu Firestore, Menu 3 thanh (Lớp).
- Trang chủ 3D tối giản phong cách hodl.swiss, animation chuột 60fps không lag, chạy Online & Offline.
- Sửa lỗi Đăng nhập Google trên điện thoại & xóa nút Facebook, GitHub.
- Xóa sạch emoji/icon kiểu AI trên toàn bộ trang, thay bằng SVG tối giản.
"""
import os
import re

CLOUD_DB_V16_JS = """// V-CODE EDU v16.0 — CLOUD DATABASE ENGINE (FIREBASE FIRESTORE + OFFLINE PERSISTENCE)
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
    await fdb.collection('classrooms').doc(clsObj.code).set({
      ...clsObj,
      assignments: clsObj.assignments || [],
      submissions: clsObj.submissions || [],
      students: clsObj.students || [],
      student_emails: clsObj.student_emails || [],
      created_at: Date.now()
    });
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
    return snap.docs.map((d) => d.data()).sort((a, b) => (b.created_at || 0) - (a.created_at || 0));
  },

  async joinClass(code, student) {
    const fdb = this.db();
    if (!fdb) return null;
    const ref = fdb.collection('classrooms').doc(code.trim().toUpperCase());
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Không tìm thấy lớp học với mã '${code}'. Hãy kiểm tra lại mã thầy/cô gửi.`);
    const data = snap.data();
    const emails = Array.isArray(data.student_emails) ? data.student_emails : [];
    const students = Array.isArray(data.students) ? data.students : [];
    const emailLow = student.email.toLowerCase();
    if (!emails.includes(emailLow)) {
      emails.push(emailLow);
      students.push({
        username: student.username,
        full_name: student.full_name,
        email: emailLow,
        xp: student.xp || 100,
        joined_at: Date.now()
      });
      await ref.update({ student_emails: emails, students });
    }
    return { ...data, student_emails: emails, students };
  },

  async addAssignment(code, assignmentObj) {
    const fdb = this.db();
    if (!fdb) return false;
    const ref = fdb.collection('classrooms').doc(code.trim().toUpperCase());
    const snap = await ref.get();
    if (!snap.exists) throw new Error(`Không tìm thấy lớp '${code}'.`);
    const data = snap.data();
    const assignments = Array.isArray(data.assignments) ? data.assignments : [];
    assignments.unshift(assignmentObj);
    await ref.update({ assignments });
    return true;
  },

  async deleteAssignment(code, assignmentId) {
    const fdb = this.db();
    if (!fdb) return false;
    const ref = fdb.collection('classrooms').doc(code.trim().toUpperCase());
    const snap = await ref.get();
    if (!snap.exists) return false;
    const data = snap.data();
    const assignments = (data.assignments || []).filter((a) => String(a.id) !== String(assignmentId) && String(a.code) !== String(assignmentId));
    await ref.update({ assignments });
    return true;
  },

  async saveSubmission(code, subObj) {
    const fdb = this.db();
    if (!fdb) return false;
    const ref = fdb.collection('classrooms').doc(code.trim().toUpperCase());
    const snap = await ref.get();
    if (!snap.exists) return false;
    const data = snap.data();
    const submissions = Array.isArray(data.submissions) ? data.submissions : [];
    const idx = submissions.findIndex((s) => s.username === subObj.username && s.assignment_code === subObj.assignment_code);
    if (idx >= 0) submissions[idx] = subObj;
    else submissions.unshift(subObj);
    await ref.update({ submissions });
    return true;
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

IDE_ENGINE_V16_JS = """// V-CODE EDU v16.0 — PYTHON ENGINE (INPUT() TƯƠNG TÁC + ĐA ĐẦU VÀO + CHẤM TEST CASE)
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
    const lines = raw.trim() === '' ? [] : raw.replace(/\\r\\n/g, '\\n').split('\\n');
    const tokens = raw.trim() ? raw.trim().split(/\\s+/) : [];
    return { lines, lineIdx: 0, tokens, tokenIdx: 0 };
  },

  async promptMissingInputs(rawCode, currentStdin = '') {
    const code = this.translateVietnamesePython(rawCode);
    if (!/\\binput\\s*\\(/.test(code)) return currentStdin;

    const matches = [...code.matchAll(/input\\s*\\(([^)]*)\\)/g)];
    const prompts = matches.map((m, idx) => {
      const arg = (m[1] || '').trim().replace(/^['"]|['"]$/g, '');
      return arg || `Nhập giá trị đầu vào #${idx + 1}`;
    });

    const preLines = String(currentStdin || '').trim() ? String(currentStdin).replace(/\\r\\n/g, '\\n').split('\\n') : [];
    if (preLines.length >= prompts.length && prompts.length > 0 && !window.__vcodeForceInteractiveInput) {
      return currentStdin;
    }

    if (typeof window.openInteractiveInputModal === 'function') {
      const collected = await window.openInteractiveInputModal(prompts, preLines);
      if (collected === null) return null;
      return collected.join('\\n');
    }

    const fallback = [];
    for (let i = 0; i < prompts.length; i++) {
      const val = window.prompt(prompts[i], preLines[i] || '');
      if (val === null) return null;
      fallback.push(val);
    }
    return fallback.join('\\n');
  },

  runPython(rawCode, stdinInput = '') {
    const code = this.translateVietnamesePython(rawCode);
    const q = this.buildInputQueue(stdinInput);
    const outputs = [];
    const env = {};
    let ops = 0;

    const nextLine = () => {
      if (q.lineIdx < q.lines.length) return q.lines[q.lineIdx++];
      if (q.tokenIdx < q.tokens.length) return q.tokens[q.tokenIdx++];
      return '0';
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

V16_CORE_JS = """// V-CODE EDU v16.0 — CORE ENGINE
(function () {
  window.VCodeIcons = {
    menu: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    file: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'
  };

  function escHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 1. SMART CODE EDITOR: TAB, SHIFT+TAB, AUTO-INDENT SAU DẤU ':'
  function attachSmartCodeEditor(el) {
    if (!el || el.dataset.v16SmartEditor === '1') return;
    el.dataset.v16SmartEditor = '1';

    el.addEventListener('keydown', function (e) {
      const start = this.selectionStart;
      const end = this.selectionEnd;
      const val = this.value;

      if (e.key === 'Tab') {
        e.preventDefault();
        if (start === end && !e.shiftKey) {
          this.value = val.slice(0, start) + '    ' + val.slice(end);
          this.selectionStart = this.selectionEnd = start + 4;
        } else {
          const lineStart = val.lastIndexOf('\\n', start - 1) + 1;
          const lineEndIdx = val.indexOf('\\n', end);
          const blockEnd = lineEndIdx === -1 ? val.length : lineEndIdx;
          const lines = val.slice(lineStart, blockEnd).split('\\n');
          const transformed = lines.map((ln) => {
            if (e.shiftKey) return ln.startsWith('    ') ? ln.slice(4) : ln.replace(/^\\s{1,3}/, '');
            return '    ' + ln;
          }).join('\\n');
          this.value = val.slice(0, lineStart) + transformed + val.slice(blockEnd);
          this.selectionStart = lineStart;
          this.selectionEnd = lineStart + transformed.length;
        }
        this.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const lineStart = val.lastIndexOf('\\n', start - 1) + 1;
        const currentLine = val.slice(lineStart, start);
        const baseIndent = (currentLine.match(/^[ \\t]*/) || [''])[0].replace(/\\t/g, '    ');
        const trimmed = currentLine.trim();
        const needsExtra = /:$/.test(trimmed);
        const nextIndent = baseIndent + (needsExtra ? '    ' : '');
        this.value = val.slice(0, start) + '\\n' + nextIndent + val.slice(end);
        this.selectionStart = this.selectionEnd = start + 1 + nextIndent.length;
        this.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      if (e.key === 'Backspace' && start === end && start >= 4) {
        const lineStart = val.lastIndexOf('\\n', start - 1) + 1;
        const beforeCursor = val.slice(lineStart, start);
        if (/^ +$/.test(beforeCursor) && beforeCursor.length % 4 === 0) {
          e.preventDefault();
          this.value = val.slice(0, start - 4) + val.slice(end);
          this.selectionStart = this.selectionEnd = start - 4;
          this.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });
  }

  // 2. SCRATCH LIVE PARSER CHUẨN 100%
  function stripInlineComment(line) {
    let inStr = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if ((ch === '"' || ch === "'") && line[i - 1] !== '\\\\') {
        inStr = inStr === ch ? null : (inStr || ch);
      } else if (ch === '#' && !inStr) {
        return line.slice(0, i).trim();
      }
    }
    return line.trim();
  }

  function parseLineToScratchBlock(rawLine) {
    const t = stripInlineComment(rawLine);
    if (!t) return null;

    let m = t.match(/^(?:if|neu)(?:\\s+|\\s*(?=\\())(.+?):?$/i);
    if (m) return { type: 'control', label: `Nếu <span class="sc-cond">${escHtml(m[1].trim())}</span> thì` };

    m = t.match(/^(?:elif|nguoc_lai_neu)(?:\\s+|\\s*(?=\\())(.+?):?$/i);
    if (m) return { type: 'control', label: `Ngược lại nếu <span class="sc-cond">${escHtml(m[1].trim())}</span> thì` };

    if (/^(?:else|nguoc_lai)\\s*:?$/i.test(t)) return { type: 'control', label: `Ngược lại` };

    m = t.match(/^(?:for|lap_voi)\\s+([a-zA-Z_]\\w*)\\s+(?:in|trong_khoang)\\s+(.+?):?$/i);
    if (m) {
      let rangeExpr = m[2].trim();
      const rm = rangeExpr.match(/^range\\s*\\((.*)\\)$/);
      if (rm) rangeExpr = rm[1];
      return { type: 'loop', label: `Lặp biến <span class="sc-var">${escHtml(m[1])}</span> trong <span class="sc-val">${escHtml(rangeExpr)}</span>` };
    }

    m = t.match(/^(?:while|khi_ma)(?:\\s+|\\s*(?=\\())(.+?):?$/i);
    if (m) return { type: 'loop', label: `Lặp khi <span class="sc-cond">${escHtml(m[1].trim())}</span>` };

    m = t.match(/^def\\s+([a-zA-Z_]\\w*)\\s*\\(([^)]*)\\)\\s*:?$/i);
    if (m) return { type: 'func', label: `Định nghĩa hàm <span class="sc-val">${escHtml(m[1])}(${escHtml(m[2])})</span>` };

    m = t.match(/^return\\b(.*)$/i);
    if (m) return { type: 'func', label: `Trả về <span class="sc-val">${escHtml(m[1].trim() || 'None')}</span>` };

    m = t.match(/^([a-zA-Z_]\\w*(?:\\s*,\\s*[a-zA-Z_]\\w*)*)\\s*=\\s*(?:int|float|str)?\\s*\\(?.*(?:input|nhap_so|nhap_chuoi|nhap_so_thuc)\\s*\\(/i);
    if (m) return { type: 'sensing', label: `Nhập dữ liệu lưu vào <span class="sc-var">${escHtml(m[1])}</span>` };

    m = t.match(/^(?:print|in_ra)\\s*\\((.*)\\)$/i);
    if (m) return { type: 'looks', label: `Hiển thị ra màn hình <span class="sc-val">${escHtml(m[1].trim())}</span>` };

    m = t.match(/^([a-zA-Z_]\\w*)\\s*(\\+=|-=|\\*=|\\/=)\\s*(.+)$/);
    if (m) {
      const opText = { '+=': 'tăng thêm', '-=': 'giảm đi', '*=': 'nhân với', '/=': 'chia cho' }[m[2]];
      return { type: 'data', label: `Thay đổi biến <span class="sc-var">${escHtml(m[1])}</span> ${opText} <span class="sc-val">${escHtml(m[3].trim())}</span>` };
    }
    m = t.match(/^([a-zA-Z_]\\w*(?:\\s*,\\s*[a-zA-Z_]\\w*)*)\\s*=\\s*(.+)$/);
    if (m) return { type: 'data', label: `Đặt biến <span class="sc-var">${escHtml(m[1])}</span> thành <span class="sc-val">${escHtml(m[2].trim())}</span>` };

    if (/^break$/i.test(t)) return { type: 'control', label: `Thoát vòng lặp (break)` };
    if (/^continue$/i.test(t)) return { type: 'control', label: `Bỏ qua lượt lặp` };

    return { type: 'stmt', label: `Lệnh: <span class="sc-val">${escHtml(t)}</span>` };
  }

  window.renderScratchLiveV16 = function (codeText, targetId) {
    const container = document.getElementById(targetId || 'scratch-blocks-view') || document.querySelector('.scratch-canvas, #scratch-preview, #scratch-stage');
    if (!container) return;
    const rawCode = codeText !== undefined ? codeText : (document.getElementById('code-editor')?.value || '');
    const lines = rawCode.replace(/\\r\\n/g, '\\n').split('\\n');

    let html = `<div class="sc-hat-block">Khi bấm Chạy Chương Trình (V-Code Edu)</div>`;
    let hasBlock = false;
    for (const raw of lines) {
      const block = parseLineToScratchBlock(raw);
      if (!block) continue;
      hasBlock = true;
      const indentSpaces = (raw.match(/^[ \\t]*/) || [''])[0].replace(/\\t/g, '    ').length;
      const level = Math.min(5, Math.floor(indentSpaces / 4));
      html += `<div class="sc-block sc-${block.type}" style="margin-left:${level * 22}px">${block.label}</div>`;
    }
    if (!hasBlock) html += `<div style="color:#64748B;font-size:13px;padding:12px 4px">Gõ lệnh Python bên trái để xem khối Scratch 3.0 trực quan...</div>`;
    container.innerHTML = html;
  };
  window.renderScratchLive = (code) => window.renderScratchLiveV16(code);
  window.updateScratchLive = (code) => window.renderScratchLiveV16(code);
  window.updateScratchBlocks = (code) => window.renderScratchLiveV16(code);

  // 3. HỘP THOẠI NHẬP INPUT() TRỰC TIẾP KHI CHẠY PYTHON
  window.openInteractiveInputModal = function (prompts, preValues = []) {
    return new Promise((resolve) => {
      const modal = document.getElementById('ide-input-modal');
      const fields = document.getElementById('ide-input-fields');
      const form = document.getElementById('ide-input-form');
      const cancelBtn = document.getElementById('ide-input-cancel');
      if (!modal || !fields || !form) {
        resolve(prompts.map((p, i) => window.prompt(p, preValues[i] || '') ?? ''));
        return;
      }

      fields.innerHTML = prompts.map((p, i) => `
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:12.5px;font-weight:600;margin-bottom:5px;color:var(--text-secondary)">${escHtml(p)}</label>
          <input class="input-field mono ide-prompt-val" data-idx="${i}" value="${escHtml(preValues[i] || '')}" placeholder="Nhập giá trị..." autocomplete="off" />
        </div>`).join('');

      modal.classList.add('open');
      setTimeout(() => fields.querySelector('input')?.focus(), 40);

      const cleanup = () => { modal.classList.remove('open'); form.onsubmit = null; if (cancelBtn) cancelBtn.onclick = null; };
      form.onsubmit = (e) => {
        e.preventDefault();
        const vals = [...fields.querySelectorAll('.ide-prompt-val')].map((inp) => inp.value);
        cleanup();
        resolve(vals);
      };
      if (cancelBtn) cancelBtn.onclick = () => { cleanup(); resolve(null); };
    });
  };

  window.runPythonWithInteractiveInput = async function (editorId, stdinId, outputId) {
    const code = document.getElementById(editorId)?.value || '';
    const stdinEl = document.getElementById(stdinId);
    let stdinVal = stdinEl ? stdinEl.value : '';

    if (/\\b(?:input|nhap_so|nhap_chuoi|nhap_so_thuc)\\s*\\(/.test(code)) {
      window.__vcodeForceInteractiveInput = true;
      const collected = await window.VCodeIDE.promptMissingInputs(code, stdinVal);
      window.__vcodeForceInteractiveInput = false;
      if (collected === null) return;
      stdinVal = collected;
      if (stdinEl) stdinEl.value = collected;
    }

    const res = window.VCodeIDE.runPython(code, stdinVal);
    const outEl = document.getElementById(outputId);
    if (outEl) {
      if (res.ok) {
        outEl.innerHTML = `<div style="color:#10B981;font-size:11.5px;margin-bottom:6px;font-weight:700">THỰC THI THÀNH CÔNG</div><pre style="margin:0;white-space:pre-wrap;font-family:'JetBrains Mono',monospace">${escHtml(res.output || '(Không có dữ liệu in ra)')}</pre>`;
      } else {
        outEl.innerHTML = `<div style="color:#F43F5E;font-size:11.5px;margin-bottom:6px;font-weight:700">LỖI CHƯƠNG TRÌNH</div><pre style="margin:0;white-space:pre-wrap;color:#FDA4AF;font-family:'JetBrains Mono',monospace">${escHtml(res.error)}</pre>`;
      }
    }
    if (typeof window.switchOutputTab === 'function') {
      try { window.switchOutputTab('console'); } catch {}
    }
    return res;
  };

  // 4. FIX GOOGLE LOGIN TRÊN ĐIỆN THOẠI (POPUP FIRST + onAuthStateChanged)
  window.handleRealSocialLogin = async function () {
    if (!window.VCodeOAuth || !window.VCodeOAuth.isConfigured()) {
      document.getElementById('oauth-config-modal')?.classList.add('open');
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.VCODE_FIREBASE_CONFIG);
      const authProv = new firebase.auth.GoogleAuthProvider();
      authProv.setCustomParameters({ prompt: 'select_account' });
      try {
        const result = await firebase.auth().signInWithPopup(authProv);
        await window.finalizeSocialFirebaseUser(result.user, 'google');
      } catch (popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/operation-not-supported-in-this-environment') {
          await firebase.auth().signInWithRedirect(authProv);
        } else if (popupErr.code !== 'auth/popup-closed-by-user' && popupErr.code !== 'auth/cancelled-popup-request') {
          throw popupErr;
        }
      }
    } catch (err) {
      alert(`Không thể đăng nhập bằng Google: ${err.message}`);
    }
  };

  function initFirebaseAuthListener() {
    if (!window.VCodeOAuth?.isConfigured() || typeof firebase === 'undefined' || !firebase.auth) return;
    if (!firebase.apps.length) firebase.initializeApp(window.VCODE_FIREBASE_CONFIG);
    firebase.auth().getRedirectResult().then(async (red) => {
      if (red && red.user) await window.finalizeSocialFirebaseUser(red.user, 'google');
    }).catch(() => {});

    firebase.auth().onAuthStateChanged(async (fbUser) => {
      if (fbUser && !window.AppState?.user) {
        await window.finalizeSocialFirebaseUser(fbUser, 'google');
      }
    });
  }

  // 5. MENU 3 THANH (LỚP) + FIX GIAO BÀI TẬP LÊN FIRESTORE
  window.toggleClassMenuDrawer = function () {
    document.getElementById('vcode-class-dropdown-panel')?.classList.toggle('open');
  };

  const _origInitClass = window.initClassroomPortalData;
  window.initClassroomPortalData = async function () {
    const tEl = document.getElementById('olm-teacher-name');
    const cEl = document.getElementById('olm-class-title');
    if (tEl && tEl.textContent.includes('Nguyễn Phi Hùng')) tEl.textContent = '—';
    if (cEl && cEl.textContent.includes('10A1')) cEl.textContent = 'Đang tải lớp học...';

    if (typeof _origInitClass === 'function') await _origInitClass();

    const u = window.AppState?.user;
    if (!u || !u.role || u.role === 'none') return;
    const isTeacher = u.role === 'teacher' || u.role === 'admin';
    const classes = window.AppState.olmClasses || [];
    const activeCode = window.AppState.activeClassroomCode || '';
    const activeCls = classes.find((c) => c.code === activeCode);
    const pills = document.getElementById('olm-class-pills');
    const actBox = document.getElementById('olm-role-actions');

    if (pills) {
      pills.innerHTML = `
        <div class="vcode-class-menu-wrap">
          <button type="button" class="vcode-hamburger-class-btn" onclick="toggleClassMenuDrawer()">
            ${window.VCodeIcons.menu}
            <span>Lớp${activeCls ? ': ' + escHtml(activeCls.name) : ''}</span>
            <span class="vcode-count-pill">${classes.length}</span>
          </button>
          <div id="vcode-class-dropdown-panel" class="vcode-class-dropdown-panel">
            <div class="vcode-cd-header">
              <span>Danh sách lớp (${classes.length})</span>
              ${isTeacher ? `<button type="button" class="btn btn-primary btn-sm" style="padding:4px 10px;font-size:11.5px" onclick="toggleClassMenuDrawer();document.getElementById('create-class-modal').classList.add('open')">+ Tạo lớp</button>` : ''}
            </div>
            <div class="vcode-cd-list">
              ${classes.length ? classes.map((c) => `
                <div class="vcode-cd-item ${c.code === activeCode ? 'active' : ''}">
                  <div class="vcode-cd-info" onclick="toggleClassMenuDrawer();selectOlmClass('${c.code}')">
                    <div class="vcode-cd-name">${escHtml(c.name)}</div>
                    <div class="vcode-cd-meta">Mã: <strong>${escHtml(c.code)}</strong> • ${(c.students || []).length} thành viên</div>
                  </div>
                  ${isTeacher ? `
                    <div class="vcode-cd-actions">
                      <button type="button" title="Đổi tên lớp" onclick="toggleClassMenuDrawer();renameClassAction('${c.code}','${escHtml(c.name).replace(/'/g, '')}')">${window.VCodeIcons.edit}</button>
                      <button type="button" title="Xóa lớp" class="danger" onclick="toggleClassMenuDrawer();deleteClassAction('${c.code}')">${window.VCodeIcons.trash}</button>
                    </div>` : ''}
                </div>`).join('') : `<div style="padding:16px;text-align:center;color:var(--text-secondary);font-size:13px">Bạn chưa có lớp học nào.</div>`}
            </div>
          </div>
        </div>`;
    }

    if (actBox && isTeacher) {
      actBox.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('create-class-modal').classList.add('open')">${window.VCodeIcons.plus} Tạo lớp mới</button>
        <button class="btn btn-blue btn-sm" onclick="openCreateAssignmentModal()">${window.VCodeIcons.file} Giao bài tập</button>`;
    }
  };

  window.handleCreateAssignmentSubmit = async function (e) {
    e.preventDefault();
    const form = e.target;
    const code = window.AppState?.activeClassroomCode;
    const u = window.AppState?.user;
    if (!code) { alert('Bạn cần chọn hoặc tạo một lớp học trước khi giao bài tập.'); return; }

    const pick = (...ids) => {
      for (const id of ids) {
        const el = document.getElementById(id) || form?.querySelector(`[name="${id}"]`);
        if (el && el.value !== undefined) return el.value.trim();
      }
      return '';
    };
    const allInputs = [...(form ? form.querySelectorAll('input:not([type="hidden"])') : [])];
    const allAreas = [...(form ? form.querySelectorAll('textarea') : [])];

    const title = pick('assign-title', 'new-assign-title', 'hw-title') || (allInputs[0]?.value || '').trim();
    const desc = pick('assign-desc', 'new-assign-desc', 'hw-desc') || (allAreas[0]?.value || '').trim();
    const lang = pick('assign-lang', 'new-assign-lang', 'hw-lang') || (form?.querySelector('select')?.value || 'python');
    const due = pick('assign-due', 'new-assign-due', 'hw-due') || 'Không giới hạn';
    const starter = pick('assign-starter', 'new-assign-starter', 'hw-starter') || (allAreas[1]?.value || '# Viết lời giải tại đây\\n');
    const tcInput = pick('assign-tc-in', 'assign-stdin', 'hw-tc-in');
    const tcExpected = pick('assign-tc-out', 'assign-expected', 'hw-tc-out');

    if (!title) { alert('Vui lòng nhập tiêu đề bài tập.'); return; }

    const assignmentObj = {
      id: 'asg_' + Date.now(),
      code: 'BT' + Math.floor(100 + Math.random() * 900),
      classroom_code: code,
      title,
      description: desc || 'Hoàn thành bài tập lập trình theo yêu cầu giáo viên.',
      language: lang,
      due_date: due,
      starter_code: starter,
      teacher_name: u?.full_name || 'Giáo viên',
      test_cases: tcExpected ? [{ input: tcInput, expected: tcExpected }] : [{ input: '6', expected: '12' }],
      created_at: Date.now()
    };

    let saved = false;
    if (window.VCodeCloudDB?.isReady()) {
      try { await window.VCodeCloudDB.addAssignment(code, assignmentObj); saved = true; }
      catch (err) { console.error('Firestore addAssignment error:', err); }
    }
    if (!saved) {
      try { await apiRequest('/api/classes/assign', { method: 'POST', body: JSON.stringify(assignmentObj) }); saved = true; }
      catch {
        const ldb = window.LocalClassDB.load();
        const cls = ldb.classes.find((c) => c.code === code);
        if (cls) { cls.assignments = cls.assignments || []; cls.assignments.unshift(assignmentObj); window.LocalClassDB.save(ldb); saved = true; }
      }
    }

    if (saved) {
      closeModal('create-assignment-modal');
      form?.reset();
      showToast(`Đã giao bài tập "${title}" vào lớp ${code}`);
      await window.selectOlmClass(code);
    } else {
      alert('Không thể lưu bài tập. Vui lòng kiểm tra kết nối mạng và thử lại.');
    }
  };

  // 6. ANIMATION CHUỘT & 3D MƯỢT 60FPS PHONG CÁCH HODL.SWISS
  function initSwissAnimations() {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.swiss-reveal').forEach((el) => observer.observe(el));

    if (isTouch) return;

    const glow = document.getElementById('swiss-cursor-glow');
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, gx = mx, gy = my;
    if (glow) {
      window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
      const tick = () => {
        gx += (mx - gx) * 0.14; gy += (my - gy) * 0.14;
        glow.style.transform = `translate3d(${gx - 220}px, ${gy - 220}px, 0)`;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    document.querySelectorAll('.swiss-tilt-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 10).toFixed(2)}deg) rotateY(${((x - 0.5) * 12).toFixed(2)}deg) translateY(-3px)`;
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      }, { passive: true });
      card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)'; });
    });

    document.querySelectorAll('.swiss-magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate3d(${((e.clientX - (r.left + r.width / 2)) * 0.18).toFixed(1)}px, ${((e.clientY - (r.top + r.height / 2)) * 0.18).toFixed(1)}px, 0)`;
      }, { passive: true });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate3d(0, 0, 0)'; });
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    ['code-editor', 'exam-code-editor', 'challenge-code-editor', 'assign-starter'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) attachSmartCodeEditor(el);
    });

    const mainEditor = document.getElementById('code-editor');
    if (mainEditor) {
      const sync = () => window.renderScratchLiveV16(mainEditor.value);
      mainEditor.addEventListener('input', sync);
      mainEditor.addEventListener('keyup', sync);
      setTimeout(sync, 120);
    }

    const runBtn = document.getElementById('btn-run-code') || document.querySelector('[onclick*="runCode"], [onclick*="runMainIDE"]');
    if (runBtn) {
      runBtn.onclick = (e) => { e.preventDefault(); window.runPythonWithInteractiveInput('code-editor', 'custom-stdin', 'console-output'); };
    }

    const assignForm = document.querySelector('#create-assignment-modal form');
    if (assignForm) assignForm.onsubmit = window.handleCreateAssignmentSubmit;

    document.addEventListener('click', (e) => {
      const wrap = document.querySelector('.vcode-class-menu-wrap');
      const panel = document.getElementById('vcode-class-dropdown-panel');
      if (panel && panel.classList.contains('open') && wrap && !wrap.contains(e.target)) panel.classList.remove('open');
    });

    initFirebaseAuthListener();
    initSwissAnimations();
  });
})();
"""

SWISS_HOME_HTML = """
    <section id="view-home" class="view-section active swiss-home-root">
      <div id="swiss-cursor-glow" class="swiss-cursor-glow" aria-hidden="true"></div>
      <div class="swiss-grid-bg" aria-hidden="true"></div>

      <div class="swiss-hero swiss-reveal">
        <div class="swiss-hero-left">
          <div class="swiss-eyebrow">
            <span class="swiss-dot"></span>
            <span>V-CODE EDU • NỀN TẢNG GIÁO DỤC LẬP TRÌNH THẾ HỆ MỚI</span>
          </div>
          <h1 class="swiss-title">
            Tư duy Thuật toán.<br/>
            <span class="swiss-title-accent">Chính xác từ dòng lệnh đầu tiên.</span>
          </h1>
          <p class="swiss-subtitle">
            Môi trường học lập trình Python, HTML/CSS, C và C++ tích hợp biên dịch trực tiếp, chuyển hóa khối lệnh Scratch 3.0 theo thời gian thực và quản lý lớp học đồng bộ đám mây.
          </p>
          <div class="swiss-cta-row">
            <button class="btn btn-primary swiss-magnetic" onclick="switchView('ide')">Mở trình soạn thảo IDE</button>
            <button class="btn swiss-magnetic" onclick="switchView('classroom')">Vào không gian Lớp học</button>
          </div>
          <div class="swiss-metrics">
            <div><strong>05</strong><span>Ngôn ngữ cốt lõi</span></div>
            <div><strong>100</strong><span>Chặng thử thách</span></div>
            <div><strong>60fps</strong><span>Phản hồi tức thì</span></div>
          </div>
        </div>

        <div class="swiss-hero-right">
          <div class="swiss-3d-stage swiss-tilt-card">
            <div class="swiss-stage-bar">
              <span class="s-dot"></span><span class="s-dot"></span><span class="s-dot"></span>
              <span class="s-filename">main.py — V-Code Engine</span>
            </div>
            <pre class="swiss-stage-code"><code><span class="tk-cm"># Nhập hai số nguyên x, y</span>
<span class="tk-id">x</span> = <span class="tk-fn">int</span>(<span class="tk-fn">input</span>(<span class="tk-str">"Nhập x: "</span>))
<span class="tk-id">y</span> = <span class="tk-fn">int</span>(<span class="tk-fn">input</span>(<span class="tk-str">"Nhập y: "</span>))

<span class="tk-kw">if</span> x + y &gt; <span class="tk-num">0</span>:
    <span class="tk-fn">print</span>(<span class="tk-str">"Tổng dương:"</span>, x + y)
<span class="tk-kw">else</span>:
    <span class="tk-fn">print</span>(<span class="tk-str">"Tổng không dương"</span>)</code></pre>
            <div class="swiss-stage-floating-card">
              <div class="sf-label">SCRATCH LIVE SYNC</div>
              <div class="sf-block">Nếu <span>x + y &gt; 0</span> thì</div>
              <div class="sf-block sf-sub">Hiển thị <span>"Tổng dương:", x + y</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="swiss-section swiss-reveal">
        <div class="swiss-sec-head">
          <span class="swiss-sec-index">01 / KIẾN TRÚC HỌC TẬP</span>
          <h2>Thiết kế tối giản cho hiệu suất tối đa</h2>
        </div>
        <div class="swiss-bento">
          <div class="swiss-card swiss-tilt-card" onclick="switchView('ide')">
            <div class="swiss-card-num">01</div>
            <h3>IDE &amp; Scratch Live</h3>
            <p>Hỗ trợ đầy đủ phím Tab, tự động thụt lề sau <code>if/for/while</code>, nhập dữ liệu <code>input()</code> trực tiếp và chuyển đổi mã nguồn sang khối trực quan không lỗi.</p>
            <span class="swiss-card-link">Trải nghiệm IDE &rarr;</span>
          </div>
          <div class="swiss-card swiss-tilt-card" onclick="switchView('classroom')">
            <div class="swiss-card-num">02</div>
            <h3>Lớp học Số Đám mây</h3>
            <p>Quản trị nhiều lớp học gọn gàng trong một menu, giao bài tập kèm Test Case tự động, chấm điểm và đồng bộ danh sách 20–60 học sinh trên mọi thiết bị.</p>
            <span class="swiss-card-link">Mở Lớp học &rarr;</span>
          </div>
          <div class="swiss-card swiss-tilt-card" onclick="switchView('challenges')">
            <div class="swiss-card-num">03</div>
            <h3>100 Thử thách Phân hạng</h3>
            <p>Hệ thống 100 bài toán thực tế từ cơ bản đến bồi dưỡng HSG Python, C, C++ chia theo cấp bậc Rank D đến BOSS với bộ lọc tìm kiếm tức thì.</p>
            <span class="swiss-card-link">Chinh phục ngay &rarr;</span>
          </div>
        </div>
      </div>

      <div class="swiss-section swiss-reveal">
        <div class="swiss-sec-head">
          <span class="swiss-sec-index">02 / QUY TRÌNH KHÉP KÍN</span>
          <h2>Vận hành mượt mà trên cả Máy tính &amp; Điện thoại</h2>
        </div>
        <div class="swiss-process-grid">
          <div class="swiss-step swiss-tilt-card">
            <span class="step-code">STEP 01</span>
            <h4>Tạo lớp &amp; Giao bài</h4>
            <p>Giáo viên tạo lớp trong 5 giây, nhận mã lớp duy nhất và giao đề bài có sẵn bộ kiểm thử.</p>
          </div>
          <div class="swiss-step swiss-tilt-card">
            <span class="step-code">STEP 02</span>
            <h4>Thực hành &amp; Nộp bài</h4>
            <p>Học sinh nhập mã lớp, viết code trực tiếp trên trình duyệt và kiểm tra kết quả ngay lập tức.</p>
          </div>
          <div class="swiss-step swiss-tilt-card">
            <span class="step-code">STEP 03</span>
            <h4>Đồng bộ Online &amp; Offline</h4>
            <p>Lưu trữ bền vững trên Cloud Firestore, tự động đồng bộ lại khi có kết nối mạng trở lại.</p>
          </div>
        </div>
      </div>
    </section>
"""

V16_CSS = """
/* ==================== V16.0: SWISS 3D HOMEPAGE (HODL.SWISS INSPIRED) + PRO UI ==================== */
#hero-3d-canvas, .three-bg-canvas { display: none !important; }

.swiss-home-root { position: relative; overflow: hidden; padding: 28px 24px 80px !important; max-width: 1240px; margin: 0 auto; }
.swiss-grid-bg {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: linear-gradient(to right, rgba(148, 163, 184, 0.06) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(148, 163, 184, 0.06) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse at 50% 25%, black 35%, transparent 80%);
}
.swiss-cursor-glow {
  position: fixed; top: 0; left: 0; width: 440px; height: 440px; border-radius: 50%;
  pointer-events: none; z-index: 0; will-change: transform;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.14) 0%, rgba(56, 189, 248, 0.06) 40%, transparent 70%);
}
.swiss-reveal { opacity: 0; transform: translateY(22px); transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1), transform 0.65s cubic-bezier(0.22, 1, 0.36, 1); position: relative; z-index: 1; }
.swiss-reveal.is-visible { opacity: 1; transform: translateY(0); }

.swiss-hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 44px; align-items: center; padding: 36px 0 56px; }
.swiss-eyebrow {
  display: inline-flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace;
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em; color: #10B981;
  padding: 6px 12px; border: 1px solid rgba(16, 185, 129, 0.28); border-radius: 999px;
  background: rgba(16, 185, 129, 0.06); margin-bottom: 20px;
}
.swiss-dot { width: 7px; height: 7px; border-radius: 50%; background: #10B981; box-shadow: 0 0 10px #10B981; }
.swiss-title { font-size: clamp(32px, 4.4vw, 54px); line-height: 1.08; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 18px; }
.swiss-title-accent { background: linear-gradient(90deg, #10B981 0%, #38BDF8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.swiss-subtitle { font-size: 15.5px; line-height: 1.65; color: var(--text-secondary); max-width: 540px; margin-bottom: 26px; }
.swiss-cta-row { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 32px; }
.swiss-magnetic { transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1); will-change: transform; }

.swiss-metrics { display: flex; gap: 32px; padding-top: 20px; border-top: 1px solid var(--border-subtle); }
.swiss-metrics strong { display: block; font-family: 'JetBrains Mono', monospace; font-size: 22px; color: var(--text-primary); }
.swiss-metrics span { font-size: 12px; color: var(--text-secondary); }

.swiss-3d-stage {
  position: relative; background: #0B1120; border: 1px solid rgba(148, 163, 184, 0.22);
  border-radius: 16px; padding: 18px 20px 24px; box-shadow: 0 28px 60px rgba(0, 0, 0, 0.45);
  transform-style: preserve-3d; transition: transform 0.2s ease-out;
}
.swiss-tilt-card::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(360px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.08), transparent 60%);
  opacity: 0; transition: opacity 0.25s;
}
.swiss-tilt-card:hover::after { opacity: 1; }
.swiss-stage-bar { display: flex; align-items: center; gap: 6px; padding-bottom: 14px; border-bottom: 1px solid rgba(255,255,255,0.08); margin-bottom: 14px; }
.swiss-stage-bar .s-dot { width: 9px; height: 9px; border-radius: 50%; background: #334155; }
.swiss-stage-bar .s-filename { margin-left: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: #94A3B8; }
.swiss-stage-code { margin: 0; font-family: 'JetBrains Mono', monospace; font-size: 13px; line-height: 1.7; color: #E2E8F0; overflow-x: auto; }
.tk-cm { color: #64748B; } .tk-kw { color: #38BDF8; font-weight: 700; } .tk-fn { color: #34D399; } .tk-str { color: #FBBF24; } .tk-num { color: #C084FC; } .tk-id { color: #F8FAFC; }

.swiss-stage-floating-card { margin-top: 16px; padding: 12px 14px; border-radius: 10px; background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(16, 185, 129, 0.35); transform: translateZ(26px); }
.sf-label { font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.1em; color: #10B981; margin-bottom: 8px; }
.sf-block { background: #D97706; color: #FFF; padding: 6px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; margin-bottom: 6px; }
.sf-block span { background: rgba(0,0,0,0.28); padding: 1px 6px; border-radius: 4px; font-family: 'JetBrains Mono', monospace; }
.sf-block.sf-sub { background: #7C3AED; margin-left: 18px; margin-bottom: 0; }

.swiss-section { padding: 42px 0; border-top: 1px solid var(--border-subtle); }
.swiss-sec-head { margin-bottom: 24px; }
.swiss-sec-index { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.12em; color: #10B981; display: block; margin-bottom: 6px; }
.swiss-sec-head h2 { font-size: clamp(22px, 2.8vw, 32px); letter-spacing: -0.02em; }

.swiss-bento, .swiss-process-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 18px; }
.swiss-card, .swiss-step { position: relative; padding: 24px; border-radius: 14px; background: var(--bg-surface); border: 1px solid var(--border-subtle); cursor: pointer; transition: transform 0.2s ease-out, border-color 0.2s ease; }
.swiss-card:hover, .swiss-step:hover { border-color: rgba(16, 185, 129, 0.45); }
.swiss-card-num, .step-code { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #10B981; margin-bottom: 12px; display: block; }
.swiss-card h3, .swiss-step h4 { font-size: 17px; margin-bottom: 8px; }
.swiss-card p, .swiss-step p { font-size: 13.5px; color: var(--text-secondary); line-height: 1.6; }
.swiss-card-link { display: inline-block; margin-top: 14px; font-size: 12.5px; font-weight: 700; color: #10B981; }

.sc-hat-block { background: #EAB308; color: #111827; font-weight: 800; font-size: 12.5px; padding: 9px 14px; border-radius: 14px 14px 4px 4px; margin-bottom: 6px; display: inline-block; }
.sc-block { padding: 7px 12px; border-radius: 6px; font-size: 12.5px; font-weight: 600; color: #FFF; margin-bottom: 5px; width: fit-content; max-width: 100%; box-shadow: 0 2px 6px rgba(0,0,0,0.18); }
.sc-control { background: #D97706; } .sc-loop { background: #EA580C; } .sc-looks { background: #7C3AED; }
.sc-sensing { background: #0284C7; } .sc-data { background: #DC2626; } .sc-func { background: #DB2777; } .sc-stmt { background: #334155; }
.sc-cond, .sc-var, .sc-val { background: rgba(0, 0, 0, 0.28); padding: 1px 7px; border-radius: 999px; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; margin: 0 2px; }

.vcode-class-menu-wrap { position: relative; }
.vcode-hamburger-class-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; border-radius: 10px; background: var(--bg-surface); color: var(--text-primary); border: 1.5px solid var(--border-strong); font-weight: 700; font-size: 13.5px; cursor: pointer; }
.vcode-hamburger-class-btn:hover { border-color: #10B981; }
.vcode-count-pill { background: rgba(16, 185, 129, 0.16); color: #10B981; font-family: 'JetBrains Mono', monospace; font-size: 11px; padding: 1px 7px; border-radius: 999px; }
.vcode-class-dropdown-panel { display: none; position: absolute; top: calc(100% + 8px); left: 0; z-index: 60; width: 320px; max-width: calc(100vw - 32px); background: var(--bg-surface); border: 1px solid var(--border-strong); border-radius: 12px; box-shadow: 0 18px 40px rgba(0,0,0,0.35); overflow: hidden; }
.vcode-class-dropdown-panel.open { display: block; }
.vcode-cd-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid var(--border-subtle); font-size: 12.5px; font-weight: 700; }
.vcode-cd-list { max-height: 290px; overflow-y: auto; padding: 6px; }
.vcode-cd-item { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 10px; border-radius: 8px; cursor: pointer; }
.vcode-cd-item:hover { background: var(--bg-elevated); }
.vcode-cd-item.active { background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.35); }
.vcode-cd-name { font-size: 13px; font-weight: 700; }
.vcode-cd-meta { font-size: 11.5px; color: var(--text-secondary); }
.vcode-cd-actions { display: flex; gap: 4px; }
.vcode-cd-actions button { background: transparent; border: 1px solid var(--border-subtle); color: var(--text-secondary); width: 28px; height: 28px; border-radius: 6px; display: grid; place-items: center; cursor: pointer; }
.vcode-cd-actions button:hover { color: var(--text-primary); border-color: var(--border-strong); }
.vcode-cd-actions button.danger:hover { color: #F43F5E; border-color: #F43F5E; }

@media (max-width: 900px) {
  .swiss-hero { grid-template-columns: 1fr; padding: 18px 0 32px; gap: 28px; }
  .swiss-bento, .swiss-process-grid { grid-template-columns: 1fr; }
  .swiss-cursor-glow { display: none !important; }
}
"""

EMOJI_STRIP_LIST = [
    "🚀", "🤖", "🎉", "👋", "🔥", "📚", "🏫", "👨‍🏫", "🎓", "📝", "⚙️", "🗑️", "✏️",
    "🏆", "⚡", "💎", "✨", "🔒", "📂", "✅", "⚠️", "🟠", "🟢", "👑", "💻", "🧩", "📊", "🎯", "💡"
]

def strip_emojis(text):
    for em in EMOJI_STRIP_LIST:
        text = text.replace(em + " ", "").replace(em, "")
    return text

def apply_v16():
    with open("js/cloud-db.js", "w", encoding="utf-8") as f:
        f.write(CLOUD_DB_V16_JS.strip() + "\n")
    print("✔ Đã nâng cấp js/cloud-db.js")

    with open("js/ide-engine.js", "w", encoding="utf-8") as f:
        f.write(IDE_ENGINE_V16_JS.strip() + "\n")
    print("✔ Đã nâng cấp js/ide-engine.js")

    with open("js/v16-core.js", "w", encoding="utf-8") as f:
        f.write(V16_CORE_JS.strip() + "\n")
    print("✔ Đã tạo js/v16-core.js")

    for js_file in ["js/ai-tutor.js", "js/app.js"]:
        if os.path.exists(js_file):
            txt = strip_emojis(open(js_file, "r", encoding="utf-8").read())
            with open(js_file, "w", encoding="utf-8") as f:
                f.write(txt)
            print(f"✔ Đã dọn sạch biểu tượng AI trong: {js_file}")

    css_path = "css/design-system.css"
    old_css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V16.0: SWISS 3D HOMEPAGE"
    if marker in old_css:
        old_css = old_css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(old_css + "\n\n" + V16_CSS.strip() + "\n")
    print("✔ Đã cập nhật css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v15.0", "v16.0").replace("v14.0", "v16.0")
        html = html.replace("Thầy Nguyễn Phi Hùng", "—").replace("Nguyễn Phi Hùng", "—")
        html = html.replace("Tin học 10A1 — THCS & THPT Hòa Phú", "Chưa chọn lớp học").replace("Tin học 10A1", "Chưa chọn lớp").replace("TIN10HP", "—")

        html = re.sub(r'<button[^>]*handleRealSocialLogin\([\'"]facebook[\'"]\)[^>]*>[\s\S]*?</button>', '', html, flags=re.IGNORECASE)
        html = re.sub(r'<button[^>]*handleRealSocialLogin\([\'"]github[\'"]\)[^>]*>[\s\S]*?</button>', '', html, flags=re.IGNORECASE)

        m_home = re.search(r'<section[^>]*id="view-home"[^>]*>[\s\S]*?</section>', html)
        if m_home:
            html = html[:m_home.start()] + SWISS_HOME_HTML.strip() + html[m_home.end():]
            print("✔ Đã cập nhật Trang chủ Swiss 3D")

        if 'id="ide-input-modal"' not in html:
            inp_modal = """
  <div id="ide-input-modal" class="modal-overlay">
    <div class="modal-box" style="max-width:420px">
      <span class="bento-tag">Đầu vào chương trình (stdin)</span>
      <h3 style="margin-bottom:6px">Nhập dữ liệu cho lệnh input()</h3>
      <p style="font-size:12.5px;color:var(--text-secondary);margin-bottom:14px">Điền giá trị để chương trình thực thi ngay.</p>
      <form id="ide-input-form">
        <div id="ide-input-fields"></div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
          <button type="button" id="ide-input-cancel" class="btn btn-sm">Hủy</button>
          <button type="submit" class="btn btn-primary btn-sm">Chạy chương trình</button>
        </div>
      </form>
    </div>
  </div>python -m uvicorn backend.main:app --reload --por8000t 

"""
            html = html.replace('<div id="toast-banner"', inp_modal + '\n  <div id="toast-banner"')

        if 'js/v16-core.js' not in html:
            html = html.replace('<script src="js/app.js"></script>', '<script src="js/app.js"></script>\n  <script src="js/v16-core.js"></script>')

        html = strip_emojis(html)
        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã cập nhật toàn diện index.html")

    print("\nHOÀN TẤT NÂNG CẤP V-CODE EDU v16.0!")

if __name__ == "__main__":
    apply_v16()