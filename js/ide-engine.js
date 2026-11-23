// V-CODE EDU — PYTHON ENGINE (ONLINEGDB INTERACTIVE TERMINAL + AUTO-GRADER)
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
