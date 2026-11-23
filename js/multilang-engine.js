// V-CODE EDU — MULTI-LANGUAGE RUNNER ENGINE (PYTHON, HTML5, CSS, C, C++, JS, SQL)
window.VCodeMultiLang = {
  detectLang() {
    const sel = document.querySelector('#view-workspace select, #lang-select, #ide-lang-select, #language-select');
    const raw = (sel ? (sel.value + ' ' + (sel.options[sel.selectedIndex]?.text || '')) : 'python').toLowerCase();
    if (raw.includes('html')) return 'html';
    if (raw.includes('c++') || raw.includes('cpp')) return 'cpp';
    if (/\bc\b/.test(raw) && !raw.includes('css')) return 'c';
    if (raw.includes('css')) return 'css';
    if (raw.includes('javascript') || /\bjs\b/.test(raw)) return 'js';
    if (raw.includes('sql')) return 'sql';
    if (raw.includes('việt') || raw.includes('viet') || raw.includes('vn')) return 'pyvn';
    return 'python';
  },

  async runJavaScript(code, { onPrint, onInput }) {
    try {
      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const customConsole = {
        log: (...args) => onPrint(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
        error: (...args) => onPrint('ERR: ' + args.join(' ')),
        warn: (...args) => onPrint('WARN: ' + args.join(' '))
      };
      const asyncPrompt = async (msg = '') => await onInput(msg);
      const wrapped = code.replace(/\bprompt\s*\(/g, '(await __prompt(');
      const fn = new AsyncFunction('console', '__prompt', `"use strict";\n${wrapped}`);
      await fn(customConsole, asyncPrompt);
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  },

  async runSQL(code, { onPrint }) {
    try {
      const tables = {
        hocsinh: {
          cols: ['id', 'ho_ten', 'lop', 'diem'],
          rows: [
            { id: 1, ho_ten: 'Nguyễn Minh Anh', lop: '11A1', diem: 9.5 },
            { id: 2, ho_ten: 'Trần Hoàng Nam', lop: '11A1', diem: 8.2 },
            { id: 3, ho_ten: 'Lê Thảo Vy', lop: '11B1', diem: 9.0 }
          ]
        }
      };

      const stmts = code.replace(/--.*$/gm, '').split(';').map((s) => s.trim()).filter(Boolean);
      if (!stmts.length) { onPrint('(Chưa có câu lệnh SQL nào)'); return { ok: true }; }

      for (const st of stmts) {
        let m;
        if ((m = st.match(/^CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)\s*\(([\s\S]+)\)$/i))) {
          const name = m[1].toLowerCase();
          const cols = m[2].split(',').map((c) => c.trim().split(/\s+/)[0]).filter(Boolean);
          tables[name] = { cols, rows: [] };
          onPrint(`Đã tạo bảng '${m[1]}' (${cols.join(', ')})`);
        } else if ((m = st.match(/^INSERT\s+INTO\s+(\w+)(?:\s*\(([^)]+)\))?\s+VALUES\s*\(([\s\S]+)\)$/i))) {
          const name = m[1].toLowerCase();
          if (!tables[name]) throw new Error(`Bảng '${m[1]}' chưa tồn tại.`);
          const cols = m[2] ? m[2].split(',').map((c) => c.trim()) : tables[name].cols;
          const vals = m[3].split(',').map((v) => {
            const tv = v.trim();
            if (/^['"].*['"]$/.test(tv)) return tv.slice(1, -1);
            return isNaN(Number(tv)) ? tv : Number(tv);
          });
          const row = {};
          cols.forEach((c, idx) => { row[c] = vals[idx] ?? null; });
          tables[name].rows.push(row);
          onPrint(`Đã thêm 1 dòng vào '${m[1]}'`);
        } else if ((m = st.match(/^SELECT\s+([\s\S]+?)\s+FROM\s+(\w+)(?:\s+WHERE\s+([\s\S]+?))?(?:\s+ORDER\s+BY\s+(\w+)(?:\s+(ASC|DESC))?)?$/i))) {
          const selCols = m[1].trim(), tName = m[2].toLowerCase(), whereClause = m[3], orderCol = m[4], orderDir = (m[5] || 'ASC').toUpperCase();
          const tbl = tables[tName];
          if (!tbl) throw new Error(`Không tìm thấy bảng '${m[2]}'. (Có sẵn bảng mẫu: hocsinh)`);

          let rows = [...tbl.rows];
          if (whereClause) {
            const condJS = whereClause.replace(/\bAND\b/gi, '&&').replace(/\bOR\b/gi, '||').replace(/(?<![=!<>])=(?!=)/g, '==');
            rows = rows.filter((r) => {
              try { return Boolean(new Function(...Object.keys(r), `return (${condJS});`)(...Object.values(r))); }
              catch { return true; }
            });
          }
          if (orderCol) rows.sort((a, b) => (a[orderCol] > b[orderCol] ? 1 : -1) * (orderDir === 'DESC' ? -1 : 1));
          const cols = selCols === '*' ? tbl.cols : selCols.split(',').map((c) => c.trim());
          const header = cols.join(' | ');
          onPrint(header);
          onPrint('-'.repeat(Math.max(header.length, 24)));
          if (!rows.length) onPrint('(0 dòng kết quả)');
          rows.forEach((r) => onPrint(cols.map((c) => String(r[c] ?? 'NULL')).join(' | ')));
        } else {
          onPrint(`Đã thực thi: ${st.slice(0, 60)}`);
        }
      }
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  },

  async runCppOrC(rawCode, { onPrint, onInput, signal }) {
    try {
      let code = rawCode
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*$/gm, '')
        .replace(/^\s*#.*$/gm, '')
        .replace(/\busing\s+namespace\s+std\s*;/g, '')
        .trim();

      const mainMatch = code.match(/\b(?:int|void)\s+main\s*\([^)]*\)\s*\{([\s\S]*)\}\s*$/);
      const body = mainMatch ? mainMatch[1] : code;

      const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
      const inputTokens = [];

      const readToken = async () => {
        while (!inputTokens.length) {
          if (signal?.aborted) throw new Error('__ABORTED__');
          const line = await onInput('');
          if (signal?.aborted) throw new Error('__ABORTED__');
          const parts = String(line || '').trim().split(/\s+/).filter(Boolean);
          if (parts.length) inputTokens.push(...parts);
        }
        return inputTokens.shift();
      };

      let printBuf = '';
      const flushPrint = (force = false) => {
        if (printBuf.includes('\n')) {
          const parts = printBuf.split('\n');
          for (let i = 0; i < parts.length - 1; i++) onPrint(parts[i]);
          printBuf = parts[parts.length - 1];
        }
        if (force && printBuf.length) { onPrint(printBuf); printBuf = ''; }
      };

      const __cout = (...items) => { for (const it of items) printBuf += String(it); flushPrint(false); };
      const __printf = (fmt, ...args) => {
        let idx = 0;
        const out = String(fmt).replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/%(?:\.\d+)?[dfscllu]+/g, (spec) => {
          const val = args[idx++];
          if (val === undefined) return '';
          const dec = spec.match(/\.(\d+)f/);
          if (dec) return Number(val).toFixed(Number(dec[1]));
          return String(val);
        });
        printBuf += out;
        flushPrint(false);
      };
      const __cinNum = async () => { const t = await readToken(); const n = Number(t); return isNaN(n) ? t : n; };
      const __cinStr = async () => await readToken();

      let js = body;
      js = js.replace(/\b(?:unsigned\s+)?(?:long\s+long|long|int|short|float|double)\s+([a-zA-Z_]\w*)\s*\[\s*([^\]]+)\s*\]\s*;/g, 'let $1 = new Array($2).fill(0);');
      js = js.replace(/\b(?:const\s+)?(?:unsigned\s+)?(?:long\s+long|long\s+double|long|int|short|float|double|char|bool|string|std::string)\s+/g, 'let ');

      js = js.replace(/\b(?:std::)?cin\s*>>\s*([^;]+);/g, (_, varsPart) => {
        const vars = varsPart.split('>>').map((v) => v.trim()).filter(Boolean);
        return vars.map((v) => `${v} = await __cinNum();`).join(' ');
      });

      js = js.replace(/\bscanf\s*\(\s*"([^"]*)"\s*,\s*([^)]+)\)\s*;/g, (_, fmt, argsPart) => {
        const specs = fmt.match(/%[a-zA-Z]+/g) || [];
        const vars = argsPart.split(',').map((v) => v.trim().replace(/^&/, '')).filter(Boolean);
        return vars.map((v, i) => `${v} = await ${(specs[i] || '').includes('s') ? '__cinStr' : '__cinNum'}();`).join(' ');
      });

      js = js.replace(/\b(?:std::)?cout\s*<<\s*([^;]+);/g, (_, exprPart) => {
        const parts = [];
        let cur = '', inStr = null, depth = 0;
        for (let i = 0; i < exprPart.length; i++) {
          const ch = exprPart[i];
          if ((ch === '"' || ch === "'") && exprPart[i - 1] !== '\\') { inStr = inStr === ch ? null : (inStr || ch); cur += ch; }
          else if (!inStr && ch === '(') { depth++; cur += ch; }
          else if (!inStr && ch === ')') { depth--; cur += ch; }
          else if (!inStr && depth === 0 && exprPart.slice(i, i + 2) === '<<') { parts.push(cur.trim()); cur = ''; i++; }
          else { cur += ch; }
        }
        if (cur.trim()) parts.push(cur.trim());
        const mapped = parts.map((p) => (p === 'endl' || p === 'std::endl') ? '"\\n"' : p);
        return `__cout(${mapped.join(', ')});`;
      });

      js = js.replace(/\bprintf\s*\(/g, '__printf(');
      js = js.replace(/\breturn\s+0\s*;/g, 'return;');

      let ops = 0;
      const __tick = () => {
        if (signal?.aborted) throw new Error('__ABORTED__');
        if (++ops > 20000) throw new Error('Infinite Loop: Vượt quá giới hạn vòng lặp.');
      };
      js = js.replace(/\b(for|while)\s*\(([^)]*)\)\s*\{/g, '$1 ($2) { __tick(); ');

      const mathHelpers = { sqrt: Math.sqrt, pow: Math.pow, abs: Math.abs, fabs: Math.abs, max: Math.max, min: Math.min, floor: Math.floor, ceil: Math.ceil, round: Math.round, endl: '\n' };
      const fn = new AsyncFunction('__cout', '__printf', '__cinNum', '__cinStr', '__tick', ...Object.keys(mathHelpers), `"use strict";\n${js}`);
      await fn(__cout, __printf, __cinNum, __cinStr, __tick, ...Object.values(mathHelpers));
      flushPrint(true);
      return { ok: true };
    } catch (err) {
      if (err && err.message === '__ABORTED__') return { ok: false, aborted: true };
      return { ok: false, error: err.message || String(err) };
    }
  }
};
