# -*- coding: utf-8 -*-
"""
V-CODE EDU — BẢN NÂNG CẤP V21:
1. IDE chế độ sáng dịu mắt (#F4F6F9), chữ đậm rõ nét.
2. Thanh menu nhanh trên cùng luôn giữ màu tối ở cả chế độ Sáng và Tối.
3. Menu trái: Tài khoản của bạn chỉ hiện (Tên, Email, Chức vụ); thay "KẾT NỐI HỆ THỐNG" thành "QUẢN LÍ TÀI KHOẢN".
4. Khôi phục tab "Kết quả Console" thành Terminal tương tác trực tiếp giống OnlineGDB (nhập input() ngay trong Terminal).
5. Phối màu đồng nhất, dễ đọc cho modal "Danh sách & Chấm bài" lớp học.
6. Ô giao hạn bài tập có thanh chặn DD/MM/YYYY tự động + lịch & đồng hồ thời gian thực.
"""
import os

IDE_ENGINE_V21_JS = r"""// V-CODE EDU — PYTHON ENGINE (ONLINEGDB INTERACTIVE TERMINAL + AUTO-GRADER)
window.VCodeIDE = {
  translateVietnamesePython(code) {
    let out = code;
    const rules = [
      [/\bnhap_so\s*\(\s*\)/g, 'int(input())'],
      [/\bnhap_so_thuc\s*\(\s*\)/g, 'float(input())'],
      [/\bnhap_chuoi\s*\(\s*\)/g, 'input()'],
      [/\bin_ra\s*\(/g, 'print('],
      [/\bneu\b/g, 'if'],
      [/\bnguoc_lai_neu\b/g, 'elif'],
      [/\bnguoc_lai\b/g, 'else'],
      [/\blap_voi\b/g, 'for'],
      [/\btrong_khoang\b/g, 'in range'],
      [/\bkhi_ma\b/g, 'while'],
      [/\bva\b/g, 'and'],
      [/\bhoac\b/g, 'or']
    ];
    for (const [regex, rep] of rules) out = out.replace(regex, rep);
    return out;
  },

  buildInputQueue(stdinText) {
    const raw = Array.isArray(stdinText) ? stdinText.join('\n') : String(stdinText ?? '');
    const lines = raw.trim() === '' ? [] : raw.replace(/\r\n/g, '\n').split('\n');
    const tokens = raw.trim() ? raw.trim().split(/\s+/) : [];
    return { lines, lineIdx: 0, tokens, tokenIdx: 0 };
  },

  // CHẠY TƯƠNG TÁC ASYNC TRỰC TIẾP TRONG TERMINAL (KHÔNG POPUP)
  async runPythonInteractive(rawCode, { onPrint, onInput, signal } = {}) {
    const code = this.translateVietnamesePython(rawCode);
    const env = {};
    let ops = 0;

    const checkAbort = () => {
      if (signal && signal.aborted) throw new Error('__ABORTED__');
    };

    const askTerminal = async (promptText = '') => {
      checkAbort();
      if (typeof onInput === 'function') {
        const val = await onInput(String(promptText ?? ''));
        checkAbort();
        return val;
      }
      return '';
    };

    const evalExprAsync = async (expr) => {
      checkAbort();
      let s = expr.trim();
      if (!s) return undefined;

      let mMap = s.match(/^map\s*\(\s*(int|float)\s*,\s*input\s*\(([^)]*)\)\.split\s*\([^)]*\)\s*\)$/);
      if (mMap) {
        const pTxt = mMap[2].trim() ? await evalExprAsync(mMap[2]) : '';
        const line = await askTerminal(pTxt);
        const parts = line.trim() ? line.trim().split(/\s+/) : [];
        return parts.map((x) => (mMap[1] === 'int' ? (parseInt(x, 10) || 0) : (parseFloat(x) || 0)));
      }
      let mSplit = s.match(/^input\s*\(([^)]*)\)\.split\s*\([^)]*\)$/);
      if (mSplit) {
        const pTxt = mSplit[1].trim() ? await evalExprAsync(mSplit[1]) : '';
        const line = await askTerminal(pTxt);
        return line.trim() ? line.trim().split(/\s+/) : [];
      }

      let jsExpr = s
        .replace(/\bint\s*\(\s*input\s*\(([^)]*)\)\s*\)/g, '(await __inpInt($1))')
        .replace(/\bfloat\s*\(\s*input\s*\(([^)]*)\)\s*\)/g, '(await __inpFloat($1))')
        .replace(/\binput\s*\(([^)]*)\)/g, '(await __inpStr($1))')
        .replace(/\bTrue\b/g, 'true')
        .replace(/\bFalse\b/g, 'false')
        .replace(/\band\b/g, '&&')
        .replace(/\bor\b/g, '||')
        .replace(/\bnot\s+/g, '!')
        .replace(/([^<>!=])\/\/([^=])/g, '$1/__floor__/$2');

      while (jsExpr.includes('/__floor__/')) {
        jsExpr = jsExpr.replace(/([\w.\)\]]+)\s*\/__floor__\/\s*([\w.\(\[]+)/, 'Math.floor(($1)/($2))');
      }

      const helpers = {
        __inpInt: async (p = '') => {
          const raw = await askTerminal(p);
          const n = parseInt(raw.trim(), 10);
          if (isNaN(n)) throw new Error(`ValueError: Không thể chuyển '${raw}' thành số nguyên (int).`);
          return n;
        },
        __inpFloat: async (p = '') => {
          const raw = await askTerminal(p);
          const n = parseFloat(raw.trim());
          if (isNaN(n)) throw new Error(`ValueError: Không thể chuyển '${raw}' thành số thực (float).`);
          return n;
        },
        __inpStr: async (p = '') => await askTerminal(p),
        int: (v) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; },
        float: (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; },
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

      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const keys = [...Object.keys(helpers), ...Object.keys(env)];
      const vals = [...Object.values(helpers), ...Object.values(env)];
      return await new AsyncFunction(...keys, `"use strict"; return (${jsExpr});`)(...vals);
    };

    const rawLines = code.replace(/\r\n/g, '\n').split('\n');
    const parsed = [];
    for (let idx = 0; idx < rawLines.length; idx++) {
      const raw = rawLines[idx], trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const indent = raw.match(/^\s*/)[0].replace(/\t/g, '    ').length;
      parsed.push({ lineNo: idx + 1, indent, text: trimmed });
    }

    const execBlockAsync = async (startIdx, baseIndent) => {
      let i = startIdx, lastIfTaken = false;
      while (i < parsed.length) {
        checkAbort();
        if (++ops > 15000) throw new Error('Infinite Loop: Chương trình vượt quá giới hạn vòng lặp.');
        const stmt = parsed[i];
        if (stmt.indent < baseIndent) break;
        if (stmt.indent > baseIndent) throw new Error(`IndentationError tại dòng ${stmt.lineNo}: Thụt lề không hợp lệ.`);
        const t = stmt.text;
        const collectChildEnd = (cur) => { let j = cur + 1; while (j < parsed.length && parsed[j].indent > baseIndent) j++; return j; };

        if (/^if\b/.test(t)) {
          if (!t.endsWith(':')) throw new Error(`SyntaxError tại dòng ${stmt.lineNo}: Thiếu dấu ':' sau câu lệnh if.`);
          const cond = Boolean(await evalExprAsync(t.slice(2, -1))), endJ = collectChildEnd(i);
          lastIfTaken = cond;
          if (cond && i + 1 < endJ) { if (await execBlockAsync(i + 1, parsed[i + 1].indent) === 'BREAK') return 'BREAK'; }
          i = endJ;
        } else if (/^elif\b/.test(t)) {
          const endJ = collectChildEnd(i);
          if (!lastIfTaken && Boolean(await evalExprAsync(t.slice(4, -1)))) {
            lastIfTaken = true;
            if (i + 1 < endJ) { if (await execBlockAsync(i + 1, parsed[i + 1].indent) === 'BREAK') return 'BREAK'; }
          }
          i = endJ;
        } else if (/^else\s*:/.test(t)) {
          const endJ = collectChildEnd(i);
          if (!lastIfTaken && i + 1 < endJ) { if (await execBlockAsync(i + 1, parsed[i + 1].indent) === 'BREAK') return 'BREAK'; }
          lastIfTaken = false; i = endJ;
        } else if (/^for\s+([a-zA-Z_]\w*)\s+in\s+(.+):$/.test(t)) {
          const m = t.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+(.+):$/), iterable = await evalExprAsync(m[2]), endJ = collectChildEnd(i);
          for (const val of (iterable || [])) {
            env[m[1]] = val;
            if (i + 1 < endJ && await execBlockAsync(i + 1, parsed[i + 1].indent) === 'BREAK') break;
          }
          i = endJ;
        } else if (/^while\s+(.+):$/.test(t)) {
          const m = t.match(/^while\s+(.+):$/), endJ = collectChildEnd(i);
          while (Boolean(await evalExprAsync(m[1]))) {
            checkAbort();
            if (++ops > 15000) throw new Error('Infinite Loop: Vòng lặp while chạy vô hạn.');
            if (i + 1 < endJ && await execBlockAsync(i + 1, parsed[i + 1].indent) === 'BREAK') break;
          }
          i = endJ;
        } else if (t === 'break') {
          return 'BREAK';
        } else if (/^print\s*\((.*)\)$/.test(t)) {
          const inner = t.match(/^print\s*\((.*)\)$/)[1].trim();
          const args = inner ? await evalExprAsync(`[${inner}]`) : [];
          const lineOut = args.map((x) => (x === true ? 'True' : (x === false ? 'False' : String(x)))).join(' ');
          if (typeof onPrint === 'function') onPrint(lineOut);
          i++;
        } else if (/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)+)\s*=\s*(.+)$/.test(t)) {
          const m = t.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)+)\s*=\s*(.+)$/);
          const varNames = m[1].split(',').map((v) => v.trim());
          let rhsVal;
          try { rhsVal = await evalExprAsync(m[2]); } catch { rhsVal = await evalExprAsync(`[${m[2]}]`); }
          if (!Array.isArray(rhsVal)) rhsVal = await evalExprAsync(`[${m[2]}]`);
          varNames.forEach((vn, k) => { env[vn] = rhsVal[k]; });
          i++;
        } else if (/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/.test(t)) {
          const m = t.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/), v = await evalExprAsync(m[3]);
          if (m[2] === '+=') env[m[1]] += v; else if (m[2] === '-=') env[m[1]] -= v; else if (m[2] === '*=') env[m[1]] *= v; else if (m[2] === '/=') env[m[1]] /= v;
          i++;
        } else if (/^([a-zA-Z_]\w*)\s*=\s*(.+)$/.test(t)) {
          const m = t.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
          env[m[1]] = await evalExprAsync(m[2]); i++;
        } else {
          await evalExprAsync(t); i++;
        }
      }
    };

    try {
      await execBlockAsync(0, parsed[0] ? parsed[0].indent : 0);
      return { ok: true };
    } catch (err) {
      if (err && err.message === '__ABORTED__') return { ok: false, aborted: true };
      return { ok: false, error: err.message || String(err) };
    }
  },

  // CHẠY ĐỒNG BỘ CHO CHẤM TEST CASE TỰ ĐỘNG (LỚP HỌC & THỬ THÁCH)
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
      if (q.lines.length === 1 && q.tokens.length > 1 && q.tokenIdx < q.tokens.length) return caster(q.tokens[q.tokenIdx++]);
      return caster(nextLine());
    };

    const evalExpr = (expr) => {
      let s = expr.trim();
      if (!s) return undefined;
      if (/^map\s*\(\s*int\s*,\s*input\s*\([^)]*\)\.split\s*\([^)]*\)\s*\)$/.test(s)) return nextLine().trim().split(/\s+/).map((x) => parseInt(x, 10) || 0);
      if (/^map\s*\(\s*float\s*,\s*input\s*\([^)]*\)\.split\s*\([^)]*\)\s*\)$/.test(s)) return nextLine().trim().split(/\s+/).map((x) => parseFloat(x) || 0);
      if (/^input\s*\([^)]*\)\.split\s*\([^)]*\)$/.test(s)) return nextLine().trim().split(/\s+/);

      let jsExpr = s
        .replace(/\bint\s*\(\s*input\s*\([^)]*\)\s*\)/g, '__inpInt()')
        .replace(/\bfloat\s*\(\s*input\s*\([^)]*\)\s*\)/g, '__inpFloat()')
        .replace(/\binput\s*\([^)]*\)/g, '__inpStr()')
        .replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false')
        .replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\s+/g, '!')
        .replace(/([^<>!=])\/\/([^=])/g, '$1/__floor__/$2');
      while (jsExpr.includes('/__floor__/')) jsExpr = jsExpr.replace(/([\w.\)\]]+)\s*\/__floor__\/\s*([\w.\(\[]+)/, 'Math.floor(($1)/($2))');

      const helpers = {
        __inpInt: () => nextScalar((v) => parseInt(v, 10) || 0),
        __inpFloat: () => nextScalar((v) => parseFloat(v) || 0),
        __inpStr: () => nextLine(),
        int: (v) => parseInt(v, 10) || 0, float: (v) => parseFloat(v) || 0, str: (v) => String(v),
        len: (v) => (v != null ? v.length : 0), abs: (v) => Math.abs(v),
        round: (v, d = 0) => Number(Number(v).toFixed(d)),
        max: (...a) => Math.max(...a.flat()), min: (...a) => Math.min(...a.flat()),
        sum: (a) => (Array.isArray(a) ? a.reduce((x, y) => x + y, 0) : Number(a) || 0),
        range: (a, b, step = 1) => {
          const start = b === undefined ? 0 : a, stop = b === undefined ? a : b, arr = [];
          for (let i = start; step > 0 ? i < stop : i > stop; i += step) arr.push(i);
          return arr;
        }
      };
      return new Function(...Object.keys(helpers), ...Object.keys(env), `"use strict"; return (${jsExpr});`)(...Object.values(helpers), ...Object.values(env));
    };

    const rawLines = code.replace(/\r\n/g, '\n').split('\n');
    const parsed = [];
    for (let idx = 0; idx < rawLines.length; idx++) {
      const raw = rawLines[idx], trimmed = raw.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      parsed.push({ lineNo: idx + 1, indent: raw.match(/^\s*/)[0].replace(/\t/g, '    ').length, text: trimmed });
    }

    const execBlock = (startIdx, baseIndent) => {
      let i = startIdx, lastIfTaken = false;
      while (i < parsed.length) {
        if (++ops > 15000) throw new Error('Infinite Loop: Vượt quá giới hạn vòng lặp.');
        const stmt = parsed[i];
        if (stmt.indent < baseIndent) break;
        if (stmt.indent > baseIndent) throw new Error(`IndentationError tại dòng ${stmt.lineNo}: Thụt lề không hợp lệ.`);
        const t = stmt.text;
        const collectChildEnd = (cur) => { let j = cur + 1; while (j < parsed.length && parsed[j].indent > baseIndent) j++; return j; };

        if (/^if\b/.test(t)) {
          if (!t.endsWith(':')) throw new Error(`SyntaxError tại dòng ${stmt.lineNo}: Thiếu dấu ':' sau câu lệnh if.`);
          const cond = Boolean(evalExpr(t.slice(2, -1))), endJ = collectChildEnd(i);
          lastIfTaken = cond;
          if (cond && i + 1 < endJ) { if (execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') return 'BREAK'; }
          i = endJ;
        } else if (/^elif\b/.test(t)) {
          const endJ = collectChildEnd(i);
          if (!lastIfTaken && Boolean(evalExpr(t.slice(4, -1)))) {
            lastIfTaken = true;
            if (i + 1 < endJ) { if (execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') return 'BREAK'; }
          }
          i = endJ;
        } else if (/^else\s*:/.test(t)) {
          const endJ = collectChildEnd(i);
          if (!lastIfTaken && i + 1 < endJ) { if (execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') return 'BREAK'; }
          lastIfTaken = false; i = endJ;
        } else if (/^for\s+([a-zA-Z_]\w*)\s+in\s+(.+):$/.test(t)) {
          const m = t.match(/^for\s+([a-zA-Z_]\w*)\s+in\s+(.+):$/), iterable = evalExpr(m[2]), endJ = collectChildEnd(i);
          for (const val of (iterable || [])) {
            env[m[1]] = val;
            if (i + 1 < endJ && execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') break;
          }
          i = endJ;
        } else if (/^while\s+(.+):$/.test(t)) {
          const m = t.match(/^while\s+(.+):$/), endJ = collectChildEnd(i);
          while (Boolean(evalExpr(m[1]))) {
            if (++ops > 15000) throw new Error('Infinite Loop: Vòng lặp while chạy vô hạn.');
            if (i + 1 < endJ && execBlock(i + 1, parsed[i + 1].indent) === 'BREAK') break;
          }
          i = endJ;
        } else if (t === 'break') return 'BREAK';
        else if (/^print\s*\((.*)\)$/.test(t)) {
          const inner = t.match(/^print\s*\((.*)\)$/)[1].trim();
          const args = inner ? evalExpr(`[${inner}]`) : [];
          outputs.push(args.map((x) => (x === true ? 'True' : (x === false ? 'False' : String(x)))).join(' '));
          i++;
        } else if (/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)+)\s*=\s*(.+)$/.test(t)) {
          const m = t.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)+)\s*=\s*(.+)$/);
          const varNames = m[1].split(',').map((v) => v.trim());
          let rhsVal;
          try { rhsVal = evalExpr(m[2]); } catch { rhsVal = evalExpr(`[${m[2]}]`); }
          if (!Array.isArray(rhsVal)) rhsVal = evalExpr(`[${m[2]}]`);
          varNames.forEach((vn, k) => { env[vn] = rhsVal[k]; });
          i++;
        } else if (/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/.test(t)) {
          const m = t.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/), v = evalExpr(m[3]);
          if (m[2] === '+=') env[m[1]] += v; else if (m[2] === '-=') env[m[1]] -= v; else if (m[2] === '*=') env[m[1]] *= v; else if (m[2] === '/=') env[m[1]] /= v;
          i++;
        } else if (/^([a-zA-Z_]\w*)\s*=\s*(.+)$/.test(t)) {
          const m = t.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
          env[m[1]] = evalExpr(m[2]); i++;
        } else { evalExpr(t); i++; }
      }
    };

    try { execBlock(0, parsed[0] ? parsed[0].indent : 0); return { ok: true, output: outputs.join('\n') }; }
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

V21_UPGRADE_JS = r"""// V-CODE EDU — V21 ENGINE (ONLINEGDB TERMINAL, LEFT DRAWER ACCOUNT MGMT, DD/MM/YYYY AUTO-MASK)
(function () {
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let currentAbortCtrl = null;

  function ensureOnlineGDBTerminal() {
    const upperBox = document.querySelector('.v20-ide-upper-box');
    if (!upperBox) return null;

    let termPane = document.getElementById('v21-terminal-pane');
    if (!termPane) {
      termPane = document.createElement('div');
      termPane.id = 'v21-terminal-pane';
      termPane.className = 'v21-term-pane';
      termPane.style.display = 'none';
      termPane.innerHTML = `
        <div class="v21-term-bar">
          <div class="v21-term-title">
            <span class="v21-term-dot"></span>
            <span>Terminal thực thi trực tiếp</span>
          </div>
          <div class="v21-term-actions">
            <button type="button" id="v21-term-stop" class="v21-term-btn stop" style="display:none">Dừng</button>
            <button type="button" id="v21-term-clear" class="v21-term-btn">Xóa màn hình</button>
          </div>
        </div>
        <div id="v21-term-screen" class="v21-term-screen">
          <div class="v21-term-sys">Bấm <strong>Chạy Chương Trình</strong> để chạy code. Khi gặp lệnh <code>input()</code>, gõ trực tiếp giá trị tại đây và nhấn <strong>Enter</strong>.</div>
        </div>
      `;
      upperBox.appendChild(termPane);

      document.getElementById('v21-term-clear').onclick = () => {
        const scr = document.getElementById('v21-term-screen');
        if (scr) scr.innerHTML = `<div class="v21-term-sys">Đã xóa màn hình Terminal. Bấm <strong>Chạy Chương Trình</strong> để thực thi.</div>`;
      };
      document.getElementById('v21-term-stop').onclick = () => {
        if (currentAbortCtrl) currentAbortCtrl.abort();
      };
    }
    return termPane;
  }

  function showConsoleTerminalTab() {
    const ws = document.getElementById('view-workspace') || document.body;
    const upperBox = document.querySelector('.v20-ide-upper-box');
    const termPane = ensureOnlineGDBTerminal();
    if (!upperBox || !termPane) return null;

    const btns = [...ws.querySelectorAll('button')];
    const scBtn = btns.find((b) => /Scratch Live/i.test(b.textContent || ''));
    const conBtn = btns.find((b) => /Kết quả Console|Console/i.test(b.textContent || ''));
    const fcBtn = btns.find((b) => /Sơ đồ khối/i.test(b.textContent || ''));

    [scBtn, conBtn, fcBtn].forEach((b) => b && b.classList.remove('active'));
    if (conBtn) conBtn.classList.add('active');

    [...upperBox.children].forEach((ch) => { ch.style.display = 'none'; });
    termPane.style.display = 'flex';
    return termPane;
  }

  window.runPythonInOnlineGDBTerminal = async function () {
    const ed = document.getElementById('code-editor');
    const code = ed ? ed.value : '';

    if (currentAbortCtrl) currentAbortCtrl.abort();
    currentAbortCtrl = new AbortController();
    const signal = currentAbortCtrl.signal;

    showConsoleTerminalTab();
    const screen = document.getElementById('v21-term-screen');
    const stopBtn = document.getElementById('v21-term-stop');
    if (!screen) return;

    screen.innerHTML = '';
    if (stopBtn) stopBtn.style.display = 'inline-flex';

    const appendLine = (text, cls = 'v21-term-out') => {
      const div = document.createElement('div');
      div.className = cls;
      div.textContent = text;
      screen.appendChild(div);
      screen.scrollTop = screen.scrollHeight;
    };

    const waitForTerminalInput = (promptText) => new Promise((resolve) => {
      const row = document.createElement('div');
      row.className = 'v21-term-input-row';

      const promptSpan = document.createElement('span');
      promptSpan.className = 'v21-term-prompt';
      promptSpan.textContent = promptText ? String(promptText) : '› ';

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'v21-term-inline-input';
      inp.autocomplete = 'off';
      inp.spellcheck = false;
      inp.placeholder = 'Nhập giá trị rồi nhấn Enter...';

      row.appendChild(promptSpan);
      row.appendChild(inp);
      screen.appendChild(row);
      screen.scrollTop = screen.scrollHeight;
      setTimeout(() => inp.focus(), 20);

      const finish = (val, aborted = false) => {
        inp.disabled = true;
        const locked = document.createElement('span');
        locked.className = 'v21-term-user-val';
        locked.textContent = aborted ? '^C' : val;
        inp.replaceWith(locked);
        resolve(val);
      };

      const onAbort = () => finish('', true);
      signal.addEventListener('abort', onAbort, { once: true });

      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          signal.removeEventListener('abort', onAbort);
          finish(inp.value, false);
        }
      });

      screen.onclick = () => { if (!inp.disabled) inp.focus(); };
    });

    const t0 = performance.now();
    const res = await window.VCodeIDE.runPythonInteractive(code, {
      signal,
      onPrint: (line) => appendLine(line, 'v21-term-out'),
      onInput: waitForTerminalInput
    });
    const elapsed = Math.max(1, Math.round(performance.now() - t0));

    if (stopBtn) stopBtn.style.display = 'none';

    if (res.aborted) {
      appendLine('--- Đã dừng chương trình ---', 'v21-term-warn');
    } else if (!res.ok) {
      appendLine(`LỖI: ${res.error}`, 'v21-term-err');
      if (window.VCodeScratchBridge?.renderDiagnostics) {
        window.VCodeScratchBridge.renderDiagnostics(code, res.error);
      }
    } else {
      appendLine(`...Chương trình kết thúc trong ${elapsed}ms (mã thoát 0).`, 'v21-term-done');
    }
  };

  function bindIDEOnlineGDBControls() {
    const ws = document.getElementById('view-workspace');
    if (!ws) return;

    const stdinEl = document.getElementById('custom-stdin');
    if (stdinEl) {
      const wrap = stdinEl.closest('.stdin-bar, .ide-stdin, .ide-footer') || stdinEl.parentElement;
      if (wrap && wrap !== ws) wrap.style.display = 'none';
    }

    const runBtn = document.getElementById('btn-run-code') || [...ws.querySelectorAll('button')].find((b) => /Chạy Chương Trình/i.test(b.textContent || ''));
    if (runBtn) {
      runBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.runPythonInOnlineGDBTerminal();
      };
    }

    const conBtn = [...ws.querySelectorAll('button')].find((b) => /Kết quả Console|Console/i.test(b.textContent || ''));
    if (conBtn) {
      conBtn.dataset.v20Bound = '1';
      conBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showConsoleTerminalTab();
      };
    }

    window.runPythonWithInteractiveInput = () => window.runPythonInOnlineGDBTerminal();
    window.switchOutputTab = (t) => {
      if (t === 'console') { showConsoleTerminalTab(); return; }
      const btns = [...ws.querySelectorAll('button')];
      if (t === 'flowchart' || t === 'flow') btns.find((b) => /Sơ đồ khối/i.test(b.textContent || ''))?.click();
      else btns.find((b) => /Scratch Live/i.test(b.textContent || ''))?.click();
    };
  }

  function syncLeftDrawerAccountSections() {
    const drawer = document.getElementById('left-drawer') || document.querySelector('.left-drawer');
    if (!drawer) return;

    const u = window.AppState?.user || null;
    const roleLabel = u?.role === 'teacher' || u?.role === 'admin'
      ? 'Giáo viên'
      : (u?.role === 'student' ? 'Học sinh' : (u ? 'Chưa chọn vai trò' : 'Khách'));

    const sections = [...drawer.querySelectorAll('.drawer-section')];
    const accSec = sections.find((s) => /Tài khoản của bạn/i.test(s.textContent || ''));
    if (accSec) {
      let infoCard = accSec.querySelector('#v21-drawer-user-info');
      if (!infoCard) {
        const titleEl = accSec.firstElementChild;
        accSec.innerHTML = '';
        if (titleEl) accSec.appendChild(titleEl);
        infoCard = document.createElement('div');
        infoCard.id = 'v21-drawer-user-info';
        infoCard.className = 'v21-drawer-info-card';
        accSec.appendChild(infoCard);
      }
      if (u) {
        infoCard.innerHTML = `
          <div class="v21-du-name">${esc(u.full_name || u.username || 'Người dùng')}</div>
          <div class="v21-du-mail">${esc(u.email || 'Chưa cập nhật email')}</div>
          <div class="v21-du-role">Chức vụ: <strong>${esc(roleLabel)}</strong></div>
        `;
      } else {
        infoCard.innerHTML = `
          <div class="v21-du-name">Chưa đăng nhập</div>
          <div class="v21-du-mail">Đăng nhập ở mục Quản lí tài khoản bên dưới để đồng bộ dữ liệu.</div>
          <div class="v21-du-role">Chức vụ: <strong>Khách</strong></div>
        `;
      }
    }

    let sysSec = sections.find((s) => /Kết nối hệ thống|Quản lí tài khoản|OAuth/i.test(s.textContent || ''));
    if (!sysSec) {
      sysSec = document.createElement('div');
      sysSec.className = 'drawer-section';
      drawer.appendChild(sysSec);
    }

    sysSec.innerHTML = `
      <div class="drawer-section-title" style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:10px">QUẢN LÍ TÀI KHOẢN</div>
      <div class="v21-acct-mgmt-list">
        ${u ? `
          <button type="button" class="v21-drawer-action-btn" onclick="if(typeof toggleLeftDrawer==='function')toggleLeftDrawer(false); if(typeof handleTopUserClick==='function')handleTopUserClick();">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Hồ sơ &amp; Thông tin cá nhân</span>
          </button>
          <button type="button" class="v21-drawer-action-btn danger" onclick="if(typeof toggleLeftDrawer==='function')toggleLeftDrawer(false); if(typeof logoutUser==='function'){logoutUser();}else if(typeof handleLogout==='function'){handleLogout();}else{localStorage.removeItem('vcode_user');location.reload();}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Đăng xuất tài khoản</span>
          </button>
        ` : `
          <button type="button" class="v21-drawer-action-btn primary" onclick="if(typeof toggleLeftDrawer==='function')toggleLeftDrawer(false); if(typeof openAuthModal==='function'){openAuthModal('login');}else if(typeof handleTopUserClick==='function'){handleTopUserClick();}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <span>Đăng nhập / Đăng ký</span>
          </button>
        `}
      </div>
    `;
  }

  function enhanceDeadlineRealTimeInput() {
    const attachMask = () => {
      const txtDate = document.getElementById('assign-date-vn');
      const picker = document.getElementById('assign-date-picker');
      const timeInp = document.getElementById('assign-time-vn');
      if (!txtDate) return;

      const pad = (n) => String(n).padStart(2, '0');
      const now = new Date();
      const todayISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      if (picker) {
        picker.min = todayISO;
        if (!picker.value) {
          const tmr = new Date(Date.now() + 86400000);
          picker.value = `${tmr.getFullYear()}-${pad(tmr.getMonth() + 1)}-${pad(tmr.getDate())}`;
        }
      }

      if (txtDate.dataset.v21Masked === '1') return;
      txtDate.dataset.v21Masked = '1';

      const wrap = txtDate.parentElement;
      if (wrap && !wrap.querySelector('.v21-cal-btn')) {
        const calBtn = document.createElement('button');
        calBtn.type = 'button';
        calBtn.className = 'v21-cal-btn';
        calBtn.title = 'Chọn từ lịch thời gian thực';
        calBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
        calBtn.onclick = () => {
          if (picker) {
            if (typeof picker.showPicker === 'function') picker.showPicker();
            else picker.focus();
          }
        };
        wrap.appendChild(calBtn);
      }

      const field = txtDate.closest('.v19-field');
      if (field && !field.querySelector('.v21-realtime-clock')) {
        const clk = document.createElement('div');
        clk.className = 'v21-realtime-clock';
        const refreshClock = () => {
          const d = new Date();
          clk.textContent = `Hiện tại: ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        refreshClock();
        setInterval(refreshClock, 30000);
        field.appendChild(clk);
      }

      txtDate.placeholder = '__/__/____';
      txtDate.addEventListener('input', () => {
        const digits = txtDate.value.replace(/\D/g, '').slice(0, 8);
        let formatted = '';
        if (digits.length <= 2) formatted = digits;
        else if (digits.length <= 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        else formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        txtDate.value = formatted;

        if (digits.length === 8 && picker) {
          const dd = digits.slice(0, 2), mm = digits.slice(2, 4), yyyy = digits.slice(4, 8);
          picker.value = `${yyyy}-${mm}-${dd}`;
        }
      });

      txtDate.addEventListener('blur', () => {
        if (!txtDate.value.trim()) {
          const tmr = new Date(Date.now() + 86400000);
          txtDate.value = `${pad(tmr.getDate())}/${pad(tmr.getMonth() + 1)}/${tmr.getFullYear()}`;
        }
      });

      if (timeInp && !timeInp.value) timeInp.value = '23:59';
    };

    attachMask();
    setTimeout(attachMask, 400);
    const origOpen = window.openCreateAssignmentModal;
    if (typeof origOpen === 'function') {
      window.openCreateAssignmentModal = function () {
        origOpen();
        setTimeout(attachMask, 30);
      };
    }
  }

  function markQuickTopNavAlwaysDark() {
    const navBtn = [...document.querySelectorAll('header button, nav button')].find((b) => /IDE & Scratch Live/i.test(b.textContent || ''));
    if (navBtn && navBtn.parentElement) {
      navBtn.parentElement.classList.add('v21-always-dark-quicknav');
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    markQuickTopNavAlwaysDark();
    setTimeout(() => {
      bindIDEOnlineGDBControls();
      syncLeftDrawerAccountSections();
      enhanceDeadlineRealTimeInput();
    }, 180);
    setTimeout(() => {
      bindIDEOnlineGDBControls();
      syncLeftDrawerAccountSections();
    }, 650);

    const origDrawer = window.toggleLeftDrawer;
    if (typeof origDrawer === 'function') {
      window.toggleLeftDrawer = function (force) {
        origDrawer(force);
        syncLeftDrawerAccountSections();
      };
    }
    setInterval(syncLeftDrawerAccountSections, 2500);
  });
})();
"""

V21_CSS = """
/* ==================== V21.0: SOFT LIGHT IDE + ALWAYS-DARK QUICKNAV + ONLINEGDB TERMINAL + CLEAN GRADING MODAL ==================== */

/* 1. THANH MENU NHANH GÓC TRÊN LUÔN MÀU TỐI */
.v21-always-dark-quicknav {
  background: #0F172A !important;
  border: 1px solid #1E293B !important;
  border-radius: 999px !important;
  padding: 4px !important;
  box-shadow: 0 4px 14px rgba(2, 6, 23, 0.25) !important;
}
.v21-always-dark-quicknav button {
  color: #94A3B8 !important;
  background: transparent !important;
  border: none !important;
}
.v21-always-dark-quicknav button:hover {
  color: #F8FAFC !important;
  background: rgba(255, 255, 255, 0.06) !important;
}
.v21-always-dark-quicknav button.active {
  background: #1E293B !important;
  color: #FFFFFF !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35) !important;
}

/* 2. IDE CHẾ ĐỘ SÁNG DỊU MẮT (#F4F6F9) + CHỮ ĐẬM SẮC NÉT */
.v20-editor-wrap-light {
  background: #E8ECF2 !important;
  border-color: #CBD5E1 !important;
}
.v20-editor-wrap-light .line-numbers,
.v20-editor-wrap-light [id*="line-num"],
.v20-editor-wrap-light .gutter {
  background: #E2E8F0 !important;
  color: #475569 !important;
  border-right: 1px solid #CBD5E1 !important;
}
textarea#code-editor.v20-editor-light,
.v20-editor-light {
  background: #F4F6F9 !important;
  color: #0F172A !important;
  -webkit-text-fill-color: #0F172A !important;
  caret-color: #1D4ED8 !important;
  opacity: 1 !important;
  font-weight: 500 !important;
}
.v20-editor-light::placeholder { color: #64748B !important; }
.v20-editor-wrap-light pre,
.v20-editor-wrap-light code { color: #0F172A !important; }

/* 3. TERMINAL TƯƠNG TÁC TRỰC TIẾP GIỐNG ONLINEGDB */
.v21-term-pane {
  display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 290px;
  border-radius: 12px; background: #05070C; border: 1px solid #1E293B;
  overflow: hidden; font-family: 'JetBrains Mono', monospace;
}
.v21-term-bar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 8px 14px; background: #0F172A; border-bottom: 1px solid #1E293B;
}
.v21-term-title { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #E2E8F0; font-family: 'Inter', sans-serif; }
.v21-term-dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 8px #10B981; }
.v21-term-actions { display: flex; gap: 6px; }
.v21-term-btn {
  background: #1E293B; color: #CBD5E1; border: 1px solid #334155;
  padding: 4px 10px; border-radius: 6px; font-size: 11.5px; font-weight: 600;
  cursor: pointer; font-family: 'Inter', sans-serif;
}
.v21-term-btn:hover { background: #334155; color: #FFFFFF; }
.v21-term-btn.stop { background: #DC2626 !important; color: #FFFFFF !important; border-color: #EF4444 !important; }

.v21-term-screen {
  flex: 1; padding: 14px 16px; overflow-y: auto; cursor: text;
  background: #04060A; color: #F8FAFC; font-size: 13.5px; line-height: 1.65;
  display: flex; flex-direction: column; gap: 3px;
}
.v21-term-sys { color: #94A3B8; font-family: 'Inter', sans-serif; font-size: 13px; }
.v21-term-out { color: #F8FAFC; white-space: pre-wrap; word-break: break-word; }
.v21-term-err { color: #FB7185; white-space: pre-wrap; font-weight: 600; margin-top: 4px; }
.v21-term-warn { color: #FBBF24; margin-top: 6px; font-size: 12.5px; }
.v21-term-done { color: #34D399; margin-top: 10px; font-size: 12px; opacity: 0.9; border-top: 1px dashed rgba(148,163,184,0.2); padding-top: 8px; }

.v21-term-input-row { display: flex; align-items: center; gap: 6px; width: 100%; margin: 2px 0; }
.v21-term-prompt { color: #38BDF8; white-space: pre; font-weight: 600; }
.v21-term-inline-input {
  flex: 1; background: rgba(56, 189, 248, 0.08); color: #FFFFFF;
  border: none; border-bottom: 1.5px solid #38BDF8; outline: none;
  font-family: 'JetBrains Mono', monospace; font-size: 13.5px; padding: 2px 6px;
}
.v21-term-user-val { color: #FDE047; font-weight: 700; }

/* 4. MENU TRÁI: THÔNG TIN TÀI KHOẢN & QUẢN LÍ TÀI KHOẢN */
.v21-drawer-info-card {
  padding: 12px 14px; border-radius: 10px;
  background: rgba(148, 163, 184, 0.08); border: 1px solid rgba(148, 163, 184, 0.2);
}
.v21-du-name { font-size: 14.5px; font-weight: 800; color: var(--text-primary); margin-bottom: 3px; }
.v21-du-mail { font-size: 12px; color: var(--text-secondary); word-break: break-all; margin-bottom: 6px; }
.v21-du-role { font-size: 12px; color: var(--text-secondary); }
.v21-du-role strong { color: #10B981; }

.v21-acct-mgmt-list { display: flex; flex-direction: column; gap: 8px; }
.v21-drawer-action-btn {
  display: flex; align-items: center; gap: 9px; width: 100%;
  padding: 10px 12px; border-radius: 9px; font-size: 13px; font-weight: 700;
  background: rgba(148, 163, 184, 0.1); color: var(--text-primary);
  border: 1px solid rgba(148, 163, 184, 0.2); cursor: pointer; text-align: left;
  transition: background 0.18s, border-color 0.18s;
}
.v21-drawer-action-btn:hover { background: rgba(37, 99, 235, 0.14); border-color: #3B82F6; }
.v21-drawer-action-btn.primary { background: #2563EB; color: #FFFFFF; border-color: #2563EB; justify-content: center; }
.v21-drawer-action-btn.primary:hover { background: #1D4ED8; }
.v21-drawer-action-btn.danger { color: #F43F5E; border-color: rgba(244, 63, 94, 0.28); background: rgba(244, 63, 94, 0.06); }
.v21-drawer-action-btn.danger:hover { background: rgba(244, 63, 94, 0.14); }

/* 5. PHỐI MÀU ĐỒNG NHẤT, SIÊU DỄ NHÌN CHO MODAL DANH SÁCH & CHẤM BÀI LỚP */
#v18-report-modal .modal-box,
#v18-grade-modal .modal-box,
#v18-solve-modal .modal-box {
  background: #F4F7FB !important; color: #0F172A !important;
  border: 1px solid #CBD5E1 !important; border-radius: 18px !important;
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.35) !important;
}
#v18-report-modal h3, #v18-grade-modal h3, #v18-solve-modal h3 { color: #0F172A !important; font-weight: 800; }
#v18-report-modal p, #v18-grade-modal p, #v18-solve-modal p { color: #475569 !important; }

#v18-report-modal .v18-report-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
#v18-report-modal .v18-report-stats > div {
  border-radius: 14px !important; padding: 16px 18px !important;
  border: 1px solid #CBD5E1 !important; box-shadow: 0 2px 6px rgba(15, 23, 42, 0.04);
}
#v18-report-modal .v18-report-stats > div:nth-child(1) { background: #EEF2FF !important; border-color: #C7D2FE !important; }
#v18-report-modal .v18-report-stats > div:nth-child(1) span { color: #4338CA !important; font-weight: 700; }
#v18-report-modal .v18-report-stats > div:nth-child(1) strong { color: #1E1B4B !important; }

#v18-report-modal .v18-report-stats > div:nth-child(2) { background: #ECFDF5 !important; border-color: #A7F3D0 !important; }
#v18-report-modal .v18-report-stats > div:nth-child(2) span { color: #047857 !important; font-weight: 700; }
#v18-report-modal .v18-report-stats > div:nth-child(2) strong { color: #065F46 !important; }

#v18-report-modal .v18-report-stats > div:nth-child(3) { background: #FFFBEB !important; border-color: #FDE68A !important; }
#v18-report-modal .v18-report-stats > div:nth-child(3) span { color: #B45309 !important; font-weight: 700; }
#v18-report-modal .v18-report-stats > div:nth-child(3) strong { color: #92400E !important; }

#v18-report-modal .v18-table-wrap { background: #FFFFFF !important; border: 1px solid #E2E8F0 !important; border-radius: 12px !important; }
#v18-report-modal .v18-table th { background: #EFF4FA !important; color: #334155 !important; border-bottom: 1px solid #E2E8F0 !important; }
#v18-report-modal .v18-table td { color: #0F172A !important; border-top: 1px solid #F1F5F9 !important; }
#v18-report-modal .btn:not(.btn-primary),
#v18-grade-modal .btn:not(.btn-primary),
#v18-solve-modal .btn:not(.btn-primary) {
  background: #E2E8F0 !important; color: #1E293B !important; border: 1px solid #CBD5E1 !important;
}
#v18-report-modal .btn:not(.btn-primary):hover { background: #CBD5E1 !important; }

/* 6. Ô NGÀY HẾT HẠN DD/MM/YYYY KÈM ICON LỊCH THỜI GIAN THỰC */
.v19-date-wrap { position: relative; display: flex; align-items: center; }
.v19-date-wrap input#assign-date-vn { padding-right: 38px !important; font-family: 'JetBrains Mono', monospace; letter-spacing: 0.04em; }
.v19-date-native { position: absolute; right: 6px; width: 28px; height: 28px; opacity: 0; pointer-events: none; }
.v21-cal-btn {
  position: absolute; right: 6px; width: 28px; height: 28px;
  display: grid; place-items: center; border-radius: 6px;
  background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; cursor: pointer;
}
.v21-cal-btn:hover { background: #DBEAFE; }
.v21-realtime-clock { font-size: 11.5px; color: #2563EB; font-weight: 600; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }
"""

def apply_v21():
    with open("js/ide-engine.js", "w", encoding="utf-8") as f:
        f.write(IDE_ENGINE_V21_JS.strip() + "\n")
    print("✔ Đã nâng cấp js/ide-engine.js (chạy Python tương tác trực tiếp trong Terminal như OnlineGDB)")

    with open("js/v21-upgrade.js", "w", encoding="utf-8") as f:
        f.write(V21_UPGRADE_JS.strip() + "\n")
    print("✔ Đã tạo js/v21-upgrade.js (Terminal OnlineGDB, Quản lí tài khoản menu trái, Lịch DD/MM/YYYY thời gian thực)")

    css_path = "css/design-system.css"
    css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V21.0: SOFT LIGHT IDE"
    if marker in css:
        css = css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css + "\n\n" + V21_CSS.strip() + "\n")
    print("✔ Đã cập nhật css/design-system.css (IDE sáng dịu mắt, Menu nhanh luôn tối, Modal chấm bài đồng nhất)")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        if 'js/v21-upgrade.js' not in html:
            if '<script src="js/v20-final.js"></script>' in html:
                html = html.replace('<script src="js/v20-final.js"></script>', '<script src="js/v20-final.js"></script>\n  <script src="js/v21-upgrade.js"></script>')
            else:
                html = html.replace('</body>', '  <script src="js/v21-upgrade.js"></script>\n</body>')
        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã nhúng js/v21-upgrade.js vào index.html")

    print("\nHOÀN TẤT NÂNG CẤP V21! Hãy tải lại trình duyệt (Ctrl + Shift + R) để kiểm tra.")

if __name__ == "__main__":
    apply_v21()