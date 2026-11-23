# -*- coding: utf-8 -*-
"""
V-CODE EDU — BẢN NÂNG CẤP V22:
1. Nút Xóa code cạnh nút Chạy Chương Trình.
2. Khung Kiểm tra lỗi mặc định nền tối, cuộn mượt & kiểm tra lỗi đúng theo từng ngôn ngữ.
3. Gợi ý code (Autocomplete) ấn Tab như VS Code + Nút Màu code (tắt = trắng, bật = màu VS Code).
4. Sửa chạy ĐA NGÔN NGỮ: Python, Python VN, HTML5/CSS, C, C++, JavaScript, SQL (chạy Online & Offline).
5. Nền trang chủ đồng nhất, hiệu ứng động thuần GPU 60fps không lag (bỏ 2 đốm sáng loang cũ).
"""
import os

MULTILANG_ENGINE_JS = r"""// V-CODE EDU — MULTI-LANGUAGE RUNNER ENGINE (PYTHON, HTML5, CSS, C, C++, JS, SQL)
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
"""

V22_PRO_IDE_JS = r"""// V-CODE EDU — V22 PRO IDE (CLEAR BTN, AUTOCOMPLETE TAB, VS CODE SYNTAX COLOR, MULTILANG RUNNER, HOME FX)
(function () {
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let syntaxColorEnabled = true;

  function highlightCode(code, lang) {
    let html = esc(code);
    const tokens = [];
    const stash = (cls, text) => {
      const idx = tokens.length;
      tokens.push(`<span class="sy-${cls}">${text}</span>`);
      return `\u0000T${idx}\u0000`;
    };

    if (lang === 'html') {
      html = html.replace(/(&lt;!--[\s\S]*?--&gt;)/g, (m) => stash('cm', m));
      html = html.replace(/("[^"]*?"|'[^']*?')/g, (m) => stash('str', m));
      html = html.replace(/(&lt;\/?)([a-zA-Z0-9!-]+)/g, (_, br, tag) => `${br}${stash('kw', tag)}`);
      html = html.replace(/\b(style|class|id|href|src|onclick|type|value|placeholder)=/g, (_, attr) => `${stash('fn', attr)}=`);
    } else {
      if (lang === 'python' || lang === 'pyvn') html = html.replace(/(#.*$)/gm, (m) => stash('cm', m));
      else if (lang === 'sql') html = html.replace(/(--.*$)/gm, (m) => stash('cm', m));
      else html = html.replace(/(\/\*[\s\S]*?\*\/|\/\/.*$)/gm, (m) => stash('cm', m));

      html = html.replace(/("([^"\\]|\\.)*"|'([^'\\]|\\.)*')/g, (m) => stash('str', m));
      if (lang === 'c' || lang === 'cpp') html = html.replace(/(^|\n)(\s*#\s*\w+)/g, (_, p, dir) => p + stash('kw', dir));

      const kwMap = {
        python: /\b(if|elif|else|for|in|while|def|return|break|continue|class|import|from|as|try|except|pass|and|or|not|True|False|None|lambda|with)\b/g,
        pyvn: /\b(neu|nguoc_lai_neu|nguoc_lai|lap_voi|trong_khoang|khi_ma|va|hoac|if|elif|else|for|in|while|def|return|break|True|False)\b/g,
        c: /\b(int|float|double|char|void|long|short|unsigned|const|return|if|else|for|while|do|switch|case|break|continue|struct|sizeof)\b/g,
        cpp: /\b(int|float|double|char|void|long|bool|string|auto|const|using|namespace|std|return|if|else|for|while|do|break|continue|class|struct|vector|true|false)\b/g,
        js: /\b(const|let|var|function|async|await|return|if|else|for|while|break|continue|class|new|true|false|null|undefined|try|catch)\b/g,
        sql: /\b(SELECT|FROM|WHERE|INSERT|INTO|VALUES|CREATE|TABLE|UPDATE|SET|DELETE|ORDER|BY|ASC|DESC|AND|OR|LIMIT|JOIN|ON|AS|INT|VARCHAR|FLOAT)\b/gi
      };
      html = html.replace(kwMap[lang] || kwMap.python, (m) => stash('kw', m));
      html = html.replace(/\b(print|input|range|len|int|float|str|sum|max|min|abs|map|list|cout|cin|endl|printf|scanf|console|log|nhap_so|nhap_chuoi|in_ra)\b/g, (m) => stash('fn', m));
      html = html.replace(/\b(\d+(?:\.\d+)?)\b/g, (m) => stash('num', m));
    }

    html = html.replace(/\u0000T(\d+)\u0000/g, (_, i) => tokens[Number(i)]);
    return html + (code.endsWith('\n') ? ' ' : '');
  }

  function setupSyntaxOverlay() {
    const ed = document.getElementById('code-editor');
    if (!ed || ed.dataset.v22Syntax === '1') return;
    ed.dataset.v22Syntax = '1';

    const parent = ed.parentElement;
    if (!parent) return;

    const wrap = document.createElement('div');
    wrap.className = 'v22-code-layer-wrap';
    parent.insertBefore(wrap, ed);

    const pre = document.createElement('pre');
    pre.id = 'v22-syntax-pre';
    pre.className = 'v22-syntax-pre';
    pre.setAttribute('aria-hidden', 'true');

    wrap.appendChild(pre);
    wrap.appendChild(ed);
    ed.classList.add('v22-code-ta');

    const copyMetrics = () => {
      const cs = window.getComputedStyle(ed);
      ['fontFamily', 'fontSize', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'].forEach((k) => {
        pre.style[k] = cs[k];
      });
    };
    copyMetrics();
    window.addEventListener('resize', copyMetrics);

    const syncHighlight = () => {
      const lang = window.VCodeMultiLang ? window.VCodeMultiLang.detectLang() : 'python';
      wrap.classList.toggle('syntax-on', syntaxColorEnabled);
      wrap.classList.toggle('v20-editor-wrap-light', ed.classList.contains('v20-editor-light'));
      if (syntaxColorEnabled) {
        pre.innerHTML = highlightCode(ed.value, lang);
        pre.scrollTop = ed.scrollTop;
        pre.scrollLeft = ed.scrollLeft;
      }
    };

    ed.addEventListener('input', syncHighlight);
    ed.addEventListener('scroll', () => {
      pre.scrollTop = ed.scrollTop;
      pre.scrollLeft = ed.scrollLeft;
    });
    window.syncV22SyntaxHighlight = syncHighlight;
    syncHighlight();
  }

  const SUGGESTIONS = {
    python: [
      { key: 'print', insert: 'print()', cursorBack: 1, desc: 'In kết quả ra màn hình' },
      { key: 'input', insert: 'input()', cursorBack: 1, desc: 'Nhập chuỗi từ bàn phím' },
      { key: 'int(input())', insert: 'int(input())', cursorBack: 0, desc: 'Nhập số nguyên' },
      { key: 'float(input())', insert: 'float(input())', cursorBack: 0, desc: 'Nhập số thực' },
      { key: 'for', insert: 'for i in range(1, n + 1):\n    ', cursorBack: 0, desc: 'Vòng lặp for 1..n' },
      { key: 'while', insert: 'while :\n    ', cursorBack: 6, desc: 'Vòng lặp while' },
      { key: 'if', insert: 'if :\n    ', cursorBack: 6, desc: 'Câu lệnh điều kiện if' },
      { key: 'elif', insert: 'elif :\n    ', cursorBack: 6, desc: 'Nhánh điều kiện elif' },
      { key: 'else', insert: 'else:\n    ', cursorBack: 0, desc: 'Nhánh ngược lại else' },
      { key: 'def', insert: 'def ten_ham():\n    return ', cursorBack: 12, desc: 'Định nghĩa hàm' },
      { key: 'range', insert: 'range()', cursorBack: 1, desc: 'Tạo dãy số nguyên' },
      { key: 'len', insert: 'len()', cursorBack: 1, desc: 'Độ dài chuỗi / danh sách' },
      { key: 'sum', insert: 'sum()', cursorBack: 1, desc: 'Tính tổng danh sách' },
      { key: 'map(int, input().split())', insert: 'map(int, input().split())', cursorBack: 0, desc: 'Nhập nhiều số 1 dòng' },
      { key: 'return', insert: 'return ', cursorBack: 0, desc: 'Trả về giá trị hàm' },
      { key: 'break', insert: 'break', cursorBack: 0, desc: 'Thoát vòng lặp' },
      { key: 'continue', insert: 'continue', cursorBack: 0, desc: 'Bỏ qua lượt lặp hiện tại' }
    ],
    pyvn: [
      { key: 'nhap_so', insert: 'nhap_so()', cursorBack: 0, desc: 'Nhập số nguyên' },
      { key: 'nhap_chuoi', insert: 'nhap_chuoi()', cursorBack: 0, desc: 'Nhập chuỗi văn bản' },
      { key: 'in_ra', insert: 'in_ra()', cursorBack: 1, desc: 'Hiển thị ra màn hình' },
      { key: 'neu', insert: 'neu :\n    ', cursorBack: 6, desc: 'Câu lệnh điều kiện nếu' },
      { key: 'nguoc_lai', insert: 'nguoc_lai:\n    ', cursorBack: 0, desc: 'Nhánh ngược lại' },
      { key: 'lap_voi', insert: 'lap_voi i trong_khoang(1, n + 1):\n    ', cursorBack: 0, desc: 'Vòng lặp tiếng Việt' },
      { key: 'khi_ma', insert: 'khi_ma :\n    ', cursorBack: 6, desc: 'Vòng lặp khi mà' }
    ],
    cpp: [
      { key: '#include <iostream>', insert: '#include <iostream>\nusing namespace std;\n\nint main() {\n    \n    return 0;\n}', cursorBack: 17, desc: 'Khung chương trình C++' },
      { key: 'cout', insert: 'cout <<  << endl;', cursorBack: 9, desc: 'In kết quả ra màn hình' },
      { key: 'cin', insert: 'cin >> ;', cursorBack: 1, desc: 'Nhập dữ liệu từ bàn phím' },
      { key: 'for', insert: 'for (int i = 1; i <= n; i++) {\n    \n}', cursorBack: 2, desc: 'Vòng lặp for C++' },
      { key: 'while', insert: 'while () {\n    \n}', cursorBack: 9, desc: 'Vòng lặp while C++' },
      { key: 'if', insert: 'if () {\n    \n}', cursorBack: 9, desc: 'Điều kiện if C++' },
      { key: 'else', insert: 'else {\n    \n}', cursorBack: 2, desc: 'Nhánh else C++' },
      { key: 'int', insert: 'int ', cursorBack: 0, desc: 'Kiểu số nguyên' },
      { key: 'long long', insert: 'long long ', cursorBack: 0, desc: 'Số nguyên 64-bit' },
      { key: 'double', insert: 'double ', cursorBack: 0, desc: 'Kiểu số thực' },
      { key: 'string', insert: 'string ', cursorBack: 0, desc: 'Kiểu chuỗi ký tự' }
    ],
    c: [
      { key: '#include <stdio.h>', insert: '#include <stdio.h>\n\nint main() {\n    \n    return 0;\n}', cursorBack: 17, desc: 'Khung chương trình C' },
      { key: 'printf', insert: 'printf("\\n");', cursorBack: 5, desc: 'In dữ liệu ra màn hình' },
      { key: 'scanf', insert: 'scanf("%d", &);', cursorBack: 2, desc: 'Nhập số nguyên' },
      { key: 'for', insert: 'for (int i = 1; i <= n; i++) {\n    \n}', cursorBack: 2, desc: 'Vòng lặp for C' },
      { key: 'if', insert: 'if () {\n    \n}', cursorBack: 9, desc: 'Điều kiện if C' },
      { key: 'int', insert: 'int ', cursorBack: 0, desc: 'Kiểu số nguyên' }
    ],
    html: [
      { key: 'html5', insert: '<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="UTF-8">\n    <title>V-Code Web</title>\n</head>\n<body>\n    <h1>Xin chào!</h1>\n</body>\n</html>', cursorBack: 0, desc: 'Khung trang HTML5 chuẩn' },
      { key: 'div', insert: '<div></div>', cursorBack: 6, desc: 'Khối chứa div' },
      { key: 'h1', insert: '<h1></h1>', cursorBack: 5, desc: 'Tiêu đề lớn h1' },
      { key: 'p', insert: '<p></p>', cursorBack: 4, desc: 'Đoạn văn bản p' },
      { key: 'button', insert: '<button></button>', cursorBack: 9, desc: 'Nút bấm button' },
      { key: 'style', insert: '<style>\n    \n</style>', cursorBack: 9, desc: 'Thẻ định dạng CSS' },
      { key: 'script', insert: '<script>\n    \n</script>', cursorBack: 10, desc: 'Thẻ mã JavaScript' }
    ],
    js: [
      { key: 'console.log', insert: 'console.log();', cursorBack: 2, desc: 'In kết quả ra Console' },
      { key: 'function', insert: 'function tenHam() {\n    \n}', cursorBack: 2, desc: 'Khai báo hàm JS' },
      { key: 'for', insert: 'for (let i = 0; i < n; i++) {\n    \n}', cursorBack: 2, desc: 'Vòng lặp for JS' },
      { key: 'const', insert: 'const ', cursorBack: 0, desc: 'Khai báo hằng số' },
      { key: 'let', insert: 'let ', cursorBack: 0, desc: 'Khai báo biến' }
    ],
    sql: [
      { key: 'SELECT', insert: 'SELECT * FROM hocsinh;', cursorBack: 0, desc: 'Truy vấn dữ liệu bảng' },
      { key: 'CREATE TABLE', insert: 'CREATE TABLE ten_bang (id INT, ten VARCHAR(50));', cursorBack: 0, desc: 'Tạo bảng mới' },
      { key: 'INSERT INTO', insert: "INSERT INTO hocsinh VALUES (4, 'Tên HS', '11A1', 9.0);", cursorBack: 0, desc: 'Thêm bản ghi mới' },
      { key: 'WHERE', insert: 'WHERE ', cursorBack: 0, desc: 'Lọc theo điều kiện' },
      { key: 'ORDER BY', insert: 'ORDER BY  DESC', cursorBack: 5, desc: 'Sắp xếp kết quả' }
    ]
  };

  function setupAutocomplete() {
    const ed = document.getElementById('code-editor');
    if (!ed || ed.dataset.v22Auto === '1') return;
    ed.dataset.v22Auto = '1';

    const popup = document.createElement('div');
    popup.id = 'v22-ac-popup';
    popup.className = 'v22-ac-popup';
    popup.style.display = 'none';
    ed.parentElement.appendChild(popup);

    let activeItems = [], selectedIdx = 0, tokenStart = 0;
    const closePopup = () => { popup.style.display = 'none'; activeItems = []; };

    const applyItem = (item) => {
      if (!item) return;
      const curPos = ed.selectionStart, val = ed.value;
      const before = val.slice(0, tokenStart), after = val.slice(curPos);
      const lineStart = val.lastIndexOf('\n', tokenStart - 1) + 1;
      const indent = (val.slice(lineStart, tokenStart).match(/^[ \t]*/) || [''])[0];
      const textToInsert = item.insert.replace(/\n/g, '\n' + indent);

      ed.value = before + textToInsert + after;
      const newCursor = before.length + textToInsert.length - (item.cursorBack || 0);
      ed.selectionStart = ed.selectionEnd = Math.max(before.length, newCursor);
      closePopup();
      ed.focus();
      ed.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const renderPopup = () => {
      if (!activeItems.length) { closePopup(); return; }
      popup.innerHTML = `
        <div class="v22-ac-hint">Gợi ý lệnh • Nhấn <strong>Tab</strong> để chèn nhanh</div>
        ${activeItems.map((it, idx) => `
          <div class="v22-ac-item ${idx === selectedIdx ? 'selected' : ''}" data-idx="${idx}">
            <span class="v22-ac-key">${esc(it.key)}</span>
            <span class="v22-ac-desc">${esc(it.desc)}</span>
          </div>`).join('')}
      `;
      popup.style.display = 'block';
      popup.querySelectorAll('.v22-ac-item').forEach((row) => {
        row.onmousedown = (ev) => { ev.preventDefault(); applyItem(activeItems[Number(row.dataset.idx)]); };
      });
    };

    ed.addEventListener('input', () => {
      const pos = ed.selectionStart, val = ed.value.slice(0, pos);
      const m = val.match(/([#a-zA-Z_][\w.]*)$/);
      if (!m || m[1].length < 1) { closePopup(); return; }
      const word = m[1].toLowerCase();
      tokenStart = pos - m[1].length;

      const lang = window.VCodeMultiLang ? window.VCodeMultiLang.detectLang() : 'python';
      const pool = SUGGESTIONS[lang] || SUGGESTIONS.python;
      activeItems = pool.filter((it) => it.key.toLowerCase().startsWith(word) && it.key.toLowerCase() !== word).slice(0, 6);
      selectedIdx = 0;
      renderPopup();
    });

    ed.addEventListener('keydown', (e) => {
      if (popup.style.display === 'none' || !activeItems.length) return;
      if (e.key === 'Tab' || e.key === 'Enter') {
        e.preventDefault();
        e.stopImmediatePropagation();
        applyItem(activeItems[selectedIdx]);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedIdx = (selectedIdx + 1) % activeItems.length;
        renderPopup();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedIdx = (selectedIdx - 1 + activeItems.length) % activeItems.length;
        renderPopup();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closePopup();
      }
    }, true);

    ed.addEventListener('blur', () => setTimeout(closePopup, 140));
  }

  function analyzeByLanguage(code, lang) {
    if (lang === 'python' || lang === 'pyvn') {
      return window.VCodeScratchBridge?.analyzePythonCode ? window.VCodeScratchBridge.analyzePythonCode(code) : [];
    }
    const issues = [];
    const lines = String(code || '').replace(/\r\n/g, '\n').split('\n');
    if (lang === 'html') {
      lines.forEach((ln, idx) => {
        if ((ln.match(/</g) || []).length !== (ln.match(/>/g) || []).length) {
          issues.push({ line: idx + 1, severity: 'error', title: 'Thẻ HTML chưa đóng dấu >', detail: `Số dấu '<' và '>' không khớp ở dòng ${idx + 1}.` });
        }
      });
      return issues;
    }
    if (lang === 'c' || lang === 'cpp') {
      let brace = 0;
      lines.forEach((raw, idx) => {
        const t = raw.replace(/\/\/.*$/, '').trim();
        if (!t || t.startsWith('#') || t.startsWith('/*')) return;
        brace += (t.match(/\{/g) || []).length - (t.match(/\}/g) || []).length;
        if (!/[;{}]$/.test(t) && !/^(?:if|else|for|while|switch|case|int\s+main|void\s+main)\b/.test(t)) {
          issues.push({ line: idx + 1, severity: 'error', title: 'Thiếu dấu chấm phẩy (;)', detail: `Câu lệnh ở dòng ${idx + 1} cần kết thúc bằng dấu ';'.` });
        }
      });
      if (brace !== 0) issues.push({ line: lines.length, severity: 'error', title: 'Thiếu hoặc thừa dấu ngoặc nhọn { }', detail: 'Số lượng dấu mở "{" và đóng "}" không khớp.' });
      return issues;
    }
    if (lang === 'js') {
      try { new Function(code); }
      catch (e) { issues.push({ line: 1, severity: 'error', title: 'Lỗi cú pháp JavaScript', detail: e.message }); }
      return issues;
    }
    return issues;
  }

  function enhanceIDEToolbarAndRunner() {
    const ws = document.getElementById('view-workspace');
    if (!ws) return;

    const runBtn = document.getElementById('btn-run-code') || [...ws.querySelectorAll('button')].find((b) => /Chạy Chương Trình/i.test(b.textContent || ''));
    const ed = document.getElementById('code-editor');

    if (runBtn && !document.getElementById('v22-btn-clear-code')) {
      const clearBtn = document.createElement('button');
      clearBtn.id = 'v22-btn-clear-code';
      clearBtn.type = 'button';
      clearBtn.className = 'v22-btn-clear-code';
      clearBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg><span>Xóa code</span>`;
      clearBtn.title = 'Xóa sạch toàn bộ code cũ';
      clearBtn.onclick = () => {
        if (!ed) return;
        ed.value = '';
        ed.focus();
        ed.dispatchEvent(new Event('input', { bubbles: true }));
        if (window.syncV22SyntaxHighlight) window.syncV22SyntaxHighlight();
        if (window.VCodeScratchBridge?.syncAll) window.VCodeScratchBridge.syncAll('');
      };
      runBtn.parentElement.insertBefore(clearBtn, runBtn);
    }

    const ideThemeBtn = document.getElementById('ide-theme-btn') || [...ws.querySelectorAll('button')].find((b) => /Sáng IDE|Tối IDE/i.test(b.textContent || ''));
    if (ideThemeBtn) {
      ideThemeBtn.addEventListener('click', () => setTimeout(() => { if (window.syncV22SyntaxHighlight) window.syncV22SyntaxHighlight(); }, 30));
    }
    if (ideThemeBtn && !document.getElementById('v22-btn-syntax-toggle')) {
      const colBtn = document.createElement('button');
      colBtn.id = 'v22-btn-syntax-toggle';
      colBtn.type = 'button';
      colBtn.className = 'v22-btn-syntax active';
      const paintBtn = () => {
        colBtn.classList.toggle('active', syntaxColorEnabled);
        colBtn.innerHTML = `<span class="v22-color-dot"></span><span>Màu code: ${syntaxColorEnabled ? 'Bật' : 'Tắt'}</span>`;
      };
      paintBtn();
      colBtn.onclick = () => {
        syntaxColorEnabled = !syntaxColorEnabled;
        paintBtn();
        if (window.syncV22SyntaxHighlight) window.syncV22SyntaxHighlight();
      };
      ideThemeBtn.insertAdjacentElement('afterend', colBtn);
    }

    const checkBtn = document.getElementById('v20-btn-check-errors');
    if (checkBtn) {
      checkBtn.onclick = () => {
        const code = ed ? ed.value : '';
        const lang = window.VCodeMultiLang.detectLang();
        const issues = analyzeByLanguage(code, lang);
        const box = document.getElementById('v20-diag-console');
        const badge = document.getElementById('v20-diag-badge');
        if (!box || !badge) return;
        if (!issues.length) {
          badge.className = 'v20-diag-badge ok';
          badge.textContent = '0 lỗi';
          box.innerHTML = `<div class="v20-diag-ok">Đã kiểm tra xong (${lang.toUpperCase()}): Không phát hiện lỗi cú pháp!</div>`;
          return;
        }
        const errs = issues.filter((x) => x.severity === 'error').length;
        badge.className = `v20-diag-badge ${errs > 0 ? 'err' : 'warn'}`;
        badge.textContent = `${issues.length} lỗi`;
        box.innerHTML = issues.map((it) => `
          <div class="v20-diag-row ${it.severity}" onclick="jumpToEditorLine(${it.line})">
            <span class="v20-diag-ln">Dòng ${it.line}</span>
            <div class="v20-diag-txt"><strong>${esc(it.title)}</strong><span>${esc(it.detail)}</span></div>
          </div>`).join('');
      };
    }

    let multiAbort = null;
    window.runMultiLanguageSmart = async function () {
      const code = ed ? ed.value : '';
      const lang = window.VCodeMultiLang.detectLang();

      if (lang === 'python' || lang === 'pyvn') {
        if (typeof window.runPythonInOnlineGDBTerminal === 'function') await window.runPythonInOnlineGDBTerminal();
        return;
      }

      if (typeof window.switchOutputTab === 'function') window.switchOutputTab('console');
      const screen = document.getElementById('v21-term-screen');
      const stopBtn = document.getElementById('v21-term-stop');
      if (!screen) return;

      if (lang === 'html' || lang === 'css') {
        if (stopBtn) stopBtn.style.display = 'none';
        const htmlDoc = lang === 'css'
          ? `<!DOCTYPE html><html><head><style>${code}</style></head><body><h1>Xem trước CSS</h1><p>Đoạn văn bản mẫu.</p><button>Nút bấm mẫu</button></body></html>`
          : code;
        screen.innerHTML = `
          <div class="v22-html-preview-wrap">
            <div class="v22-html-bar">Xem trước trực tiếp (${lang.toUpperCase()})</div>
            <iframe id="v22-html-iframe" class="v22-html-iframe" sandbox="allow-scripts allow-modals"></iframe>
          </div>`;
        const ifr = document.getElementById('v22-html-iframe');
        if (ifr) ifr.srcdoc = htmlDoc;
        return;
      }

      if (multiAbort) multiAbort.abort();
      multiAbort = new AbortController();
      const signal = multiAbort.signal;
      screen.innerHTML = '';
      if (stopBtn) { stopBtn.style.display = 'inline-flex'; stopBtn.onclick = () => multiAbort.abort(); }

      const appendLine = (txt, cls = 'v21-term-out') => {
        const d = document.createElement('div');
        d.className = cls; d.textContent = txt;
        screen.appendChild(d); screen.scrollTop = screen.scrollHeight;
      };

      const waitInput = (promptTxt) => new Promise((resolve) => {
        const row = document.createElement('div');
        row.className = 'v21-term-input-row';
        const ps = document.createElement('span');
        ps.className = 'v21-term-prompt'; ps.textContent = promptTxt ? String(promptTxt) : '› ';
        const inp = document.createElement('input');
        inp.type = 'text'; inp.className = 'v21-term-inline-input'; inp.placeholder = 'Nhập dữ liệu rồi nhấn Enter...';
        row.appendChild(ps); row.appendChild(inp);
        screen.appendChild(row); screen.scrollTop = screen.scrollHeight;
        setTimeout(() => inp.focus(), 20);

        const done = (v, ab = false) => {
          inp.disabled = true;
          const sp = document.createElement('span');
          sp.className = 'v21-term-user-val'; sp.textContent = ab ? '^C' : v;
          inp.replaceWith(sp);
          resolve(v);
        };
        const onAb = () => done('', true);
        signal.addEventListener('abort', onAb, { once: true });
        inp.addEventListener('keydown', (ev) => {
          if (ev.key === 'Enter') { ev.preventDefault(); signal.removeEventListener('abort', onAb); done(inp.value, false); }
        });
      });

      const t0 = performance.now();
      let res;
      if (lang === 'c' || lang === 'cpp') res = await window.VCodeMultiLang.runCppOrC(code, { onPrint: appendLine, onInput: waitInput, signal });
      else if (lang === 'js') res = await window.VCodeMultiLang.runJavaScript(code, { onPrint: appendLine, onInput: waitInput });
      else if (lang === 'sql') res = await window.VCodeMultiLang.runSQL(code, { onPrint: appendLine });
      else res = { ok: false, error: 'Ngôn ngữ chưa được hỗ trợ.' };

      const ms = Math.max(1, Math.round(performance.now() - t0));
      if (stopBtn) stopBtn.style.display = 'none';
      if (res.aborted) appendLine('--- Đã dừng chương trình ---', 'v21-term-warn');
      else if (!res.ok) appendLine(`LỖI (${lang.toUpperCase()}): ${res.error}`, 'v21-term-err');
      else appendLine(`...Hoàn thành (${lang.toUpperCase()}) trong ${ms}ms.`, 'v21-term-done');
    };

    window.runPythonWithInteractiveInput = () => window.runMultiLanguageSmart();
    if (runBtn) {
      runBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); window.runMultiLanguageSmart(); };
    }

    const langSel = ws.querySelector('select');
    if (langSel && !langSel.dataset.v22Bound) {
      langSel.dataset.v22Bound = '1';
      langSel.addEventListener('change', () => {
        setTimeout(() => {
          if (window.syncV22SyntaxHighlight) window.syncV22SyntaxHighlight();
          const dlBtn = [...ws.querySelectorAll('button')].find((b) => /Tải \./i.test(b.textContent || ''));
          const extMap = { python: '.py', pyvn: '.py', html: '.html', css: '.css', c: '.c', cpp: '.cpp', js: '.js', sql: '.sql' };
          const ext = extMap[window.VCodeMultiLang.detectLang()] || '.txt';
          if (dlBtn) dlBtn.textContent = `Tải ${ext}`;
        }, 60);
      });
    }
  }

  function upgradeHomeDynamicBackdrop() {
    const bg = document.querySelector('.v18-bg-stage');
    if (!bg || bg.dataset.v22Dynamic === '1') return;
    bg.dataset.v22Dynamic = '1';

    bg.innerHTML = `
      <div class="v22-bg-grid-plane"></div>
      <div class="v22-bg-horizon"></div>
      <div class="v22-beam beam-1"></div>
      <div class="v22-beam beam-2"></div>
      <div class="v22-beam beam-3"></div>
      <div class="v22-beam beam-4"></div>
      <div class="v22-geo-ring ring-1"></div>
      <div class="v22-geo-ring ring-2"></div>
      <div class="v22-float-shard shard-1"></div>
      <div class="v22-float-shard shard-2"></div>
      <div class="v22-float-shard shard-3"></div>
      <div id="v22-home-spotlight" class="v22-home-spotlight"></div>
    `;

    if (!window.matchMedia('(pointer: coarse)').matches) {
      const spot = document.getElementById('v22-home-spotlight');
      let tx = window.innerWidth / 2, ty = window.innerHeight / 2, cx = tx, cy = ty;
      window.addEventListener('mousemove', (e) => { tx = e.clientX; ty = e.clientY; }, { passive: true });
      const anim = () => {
        const homeActive = document.getElementById('view-home')?.classList.contains('active');
        if (homeActive && spot) {
          cx += (tx - cx) * 0.1; cy += (ty - cy) * 0.1;
          spot.style.transform = `translate3d(${(cx - 260).toFixed(1)}px, ${(cy - 260).toFixed(1)}px, 0)`;
        }
        requestAnimationFrame(anim);
      };
      requestAnimationFrame(anim);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    upgradeHomeDynamicBackdrop();
    setTimeout(() => { setupSyntaxOverlay(); setupAutocomplete(); enhanceIDEToolbarAndRunner(); }, 240);
    setTimeout(() => { enhanceIDEToolbarAndRunner(); if (window.syncV22SyntaxHighlight) window.syncV22SyntaxHighlight(); }, 750);
  });
})();
"""

V22_CSS = """
/* ==================== V22.0: PRO IDE (SYNTAX, AUTOCOMPLETE, CLEAR, MULTILANG) + DYNAMIC 60FPS HOME BG ==================== */
.v22-btn-clear-code {
  display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 8px; margin-right: 8px;
  background: rgba(244, 63, 94, 0.12); color: #FB7185; border: 1px solid rgba(244, 63, 94, 0.35);
  font-size: 12.5px; font-weight: 700; cursor: pointer; transition: background 0.18s, color 0.18s;
}
.v22-btn-clear-code:hover { background: #E11D48; color: #FFFFFF; border-color: #E11D48; }

.v22-btn-syntax {
  display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; margin-left: 6px;
  background: #1E293B; color: #CBD5E1; border: 1px solid #334155; font-size: 12px; font-weight: 700; cursor: pointer;
}
.v22-btn-syntax .v22-color-dot { width: 8px; height: 8px; border-radius: 50%; background: #64748B; }
.v22-btn-syntax.active { border-color: #38BDF8; color: #F8FAFC; background: rgba(56, 189, 248, 0.14); }
.v22-btn-syntax.active .v22-color-dot { background: linear-gradient(135deg, #38BDF8, #C084FC, #34D399); }

/* Overlay tô màu cú pháp chuẩn VS Code đồng bộ 1:1 với Textarea */
.v22-code-layer-wrap { position: relative; flex: 1; width: 100%; height: 100%; min-height: 400px; overflow: hidden; }
.v22-syntax-pre,
.v22-code-layer-wrap textarea#code-editor {
  position: absolute !important; inset: 0 !important; width: 100% !important; height: 100% !important;
  margin: 0 !important; tab-size: 4 !important; white-space: pre !important;
  box-sizing: border-box !important; border: none !important; outline: none !important; overflow: auto !important;
}
.v22-syntax-pre { pointer-events: none; z-index: 1; color: #E2E8F0; background: transparent !important; display: none; }
.v22-code-layer-wrap.syntax-on .v22-syntax-pre { display: block; }
.v22-code-layer-wrap.syntax-on textarea#code-editor {
  color: transparent !important; -webkit-text-fill-color: transparent !important;
  background: transparent !important; caret-color: #38BDF8 !important; z-index: 2;
}
.v22-code-layer-wrap:not(.syntax-on) textarea#code-editor {
  color: #FFFFFF !important; -webkit-text-fill-color: #FFFFFF !important; z-index: 2;
}

.sy-kw { color: #C586C0; font-weight: 600; }
.sy-fn { color: #4EC9B0; }
.sy-str { color: #CE9178; }
.sy-num { color: #B5CEA8; }
.sy-cm { color: #6A9955; font-style: italic; }

.v20-editor-wrap-light.v22-code-layer-wrap,
.v20-editor-wrap-light .v22-code-layer-wrap { background: #F4F6F9 !important; }
.v20-editor-wrap-light .v22-syntax-pre { color: #1E293B !important; }
.v20-editor-wrap-light.v22-code-layer-wrap:not(.syntax-on) textarea#code-editor,
.v20-editor-wrap-light .v22-code-layer-wrap:not(.syntax-on) textarea#code-editor {
  color: #0F172A !important; -webkit-text-fill-color: #0F172A !important;
}
.v20-editor-wrap-light textarea#code-editor { caret-color: #1D4ED8 !important; }
.v20-editor-wrap-light .sy-kw { color: #AF00DB; }
.v20-editor-wrap-light .sy-fn { color: #0070C1; }
.v20-editor-wrap-light .sy-str { color: #A31515; }
.v20-editor-wrap-light .sy-num { color: #098658; }
.v20-editor-wrap-light .sy-cm { color: #008000; }

/* Hộp gợi ý lệnh (Autocomplete) */
.v22-ac-popup {
  position: absolute; top: 12px; right: 16px; z-index: 40; width: 310px; max-width: calc(100% - 24px);
  background: #0F172A; border: 1px solid #334155; border-radius: 10px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.5); overflow: hidden;
}
.v22-ac-hint { padding: 6px 10px; font-size: 11px; color: #94A3B8; background: #090E1A; border-bottom: 1px solid #1E293B; }
.v22-ac-hint strong { color: #38BDF8; }
.v22-ac-item { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 7px 11px; cursor: pointer; font-size: 12.5px; }
.v22-ac-item:hover, .v22-ac-item.selected { background: #1D4ED8; color: #FFFFFF; }
.v22-ac-key { font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #E2E8F0; }
.v22-ac-desc { font-size: 11px; color: #94A3B8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v22-ac-item.selected .v22-ac-key, .v22-ac-item.selected .v22-ac-desc { color: #FFFFFF; }

/* Khung Kiểm tra lỗi mặc định luôn màu tối như Terminal & cuộn mượt khi nhiều lỗi */
#ide-diagnostics-panel.v20-diag-box {
  background: #05070C !important; border: 1px solid #1E293B !important; color: #F8FAFC !important;
  min-height: 205px; max-height: 265px;
}
#ide-diagnostics-panel .v20-diag-topbar { background: #0F172A !important; border-bottom: 1px solid #1E293B !important; }
#ide-diagnostics-panel .v20-diag-left { color: #F8FAFC !important; }
#ide-diagnostics-panel .v20-diag-console {
  overflow-y: auto !important; -webkit-overflow-scrolling: touch;
  scrollbar-width: thin; scrollbar-color: #334155 #05070C;
}
#ide-diagnostics-panel .v20-diag-txt strong { color: #F8FAFC !important; }
#ide-diagnostics-panel .v20-diag-txt span { color: #94A3B8 !important; }
#ide-diagnostics-panel .v20-diag-ln { background: rgba(244, 63, 94, 0.24) !important; color: #FDA4AF !important; }

/* Xem trước HTML5 trực tiếp */
.v22-html-preview-wrap { display: flex; flex-direction: column; width: 100%; height: 100%; min-height: 270px; border-radius: 8px; overflow: hidden; background: #FFFFFF; }
.v22-html-bar { padding: 6px 12px; background: #E2E8F0; color: #1E293B; font-family: 'Inter', sans-serif; font-size: 11.5px; font-weight: 700; }
.v22-html-iframe { flex: 1; width: 100%; min-height: 245px; border: none; background: #FFFFFF; }

/* Nền Trang chủ đồng nhất + chuyển động GPU 60fps không lag (bỏ 2 đốm sáng loang xanh/vàng) */
#view-home.active, .v18-home-root.active { background: #060913 !important; }
:is(html[data-theme="light"], body.light-theme, body.light-mode) #view-home.active,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-home-root.active { background: #F4F7FB !important; }

.v22-bg-grid-plane {
  position: absolute; inset: -10%;
  background-image: linear-gradient(to right, rgba(56, 189, 248, 0.065) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(56, 189, 248, 0.065) 1px, transparent 1px);
  background-size: 72px 72px;
  mask-image: radial-gradient(ellipse at 50% 42%, rgba(0,0,0,0.85) 20%, transparent 78%);
  animation: v22GridDrift 22s linear infinite; will-change: transform;
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v22-bg-grid-plane {
  background-image: linear-gradient(to right, rgba(37, 99, 235, 0.07) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(37, 99, 235, 0.07) 1px, transparent 1px);
}
@keyframes v22GridDrift { from { transform: translate3d(0, 0, 0); } to { transform: translate3d(0, 72px, 0); } }

.v22-bg-horizon {
  position: absolute; left: 0; right: 0; top: 0; height: 55vh;
  background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(37, 99, 235, 0.16), transparent 72%);
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v22-bg-horizon {
  background: radial-gradient(ellipse 70% 50% at 50% 0%, rgba(37, 99, 235, 0.09), transparent 72%);
}

.v22-beam {
  position: absolute; top: -180px; width: 1.5px; height: 180px;
  background: linear-gradient(to bottom, transparent, rgba(56, 189, 248, 0.65), transparent);
  animation: v22BeamDrop 9s linear infinite; will-change: transform, opacity;
}
.v22-beam.beam-1 { left: 16%; animation-duration: 8.5s; animation-delay: 0s; }
.v22-beam.beam-2 { left: 38%; animation-duration: 11s; animation-delay: 2.4s; }
.v22-beam.beam-3 { left: 66%; animation-duration: 9.5s; animation-delay: 1.1s; }
.v22-beam.beam-4 { left: 86%; animation-duration: 12s; animation-delay: 3.8s; }
@keyframes v22BeamDrop {
  0% { transform: translate3d(0, -180px, 0); opacity: 0; }
  15%, 85% { opacity: 0.9; }
  100% { transform: translate3d(0, 115vh, 0); opacity: 0; }
}

.v22-geo-ring { position: absolute; border-radius: 50%; border: 1px solid rgba(56, 189, 248, 0.09); pointer-events: none; will-change: transform; }
.v22-geo-ring.ring-1 { width: 680px; height: 680px; top: -160px; right: -120px; border-style: dashed; animation: v22SlowSpin 60s linear infinite; }
.v22-geo-ring.ring-2 { width: 520px; height: 520px; bottom: -180px; left: -120px; animation: v22SlowSpin 48s linear infinite reverse; }
@keyframes v22SlowSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

.v22-float-shard {
  position: absolute; border-radius: 14px; border: 1px solid rgba(56, 189, 248, 0.14);
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.04), transparent);
  animation: v22FloatShard 10s ease-in-out infinite; will-change: transform;
}
.v22-float-shard.shard-1 { width: 110px; height: 110px; top: 18%; left: 6%; transform: rotate(12deg); animation-delay: 0s; }
.v22-float-shard.shard-2 { width: 140px; height: 84px; bottom: 16%; right: 9%; transform: rotate(-8deg); animation-delay: 2.5s; }
.v22-float-shard.shard-3 { width: 76px; height: 76px; top: 62%; left: 46%; transform: rotate(22deg); animation-delay: 5s; }
@keyframes v22FloatShard { 0%, 100% { translate: 0 0; } 50% { translate: 0 -18px; } }

.v22-home-spotlight {
  position: fixed; top: 0; left: 0; width: 520px; height: 520px; border-radius: 50%;
  background: radial-gradient(circle, rgba(56, 189, 248, 0.09) 0%, transparent 65%);
  pointer-events: none; will-change: transform;
}
@media (max-width: 768px) { .v22-home-spotlight, .v22-geo-ring { display: none !important; } }
"""

def apply_v22():
    with open("js/multilang-engine.js", "w", encoding="utf-8") as f:
        f.write(MULTILANG_ENGINE_JS.strip() + "\n")
    print("✔ Đã tạo js/multilang-engine.js (Chạy Python, HTML5/CSS, C, C++, JS, SQL trực tiếp)")

    with open("js/v22-pro-ide.js", "w", encoding="utf-8") as f:
        f.write(V22_PRO_IDE_JS.strip() + "\n")
    print("✔ Đã tạo js/v22-pro-ide.js (Nút Xóa code, Autocomplete Tab, Nút Màu code VS Code, Nền trang chủ động 60fps)")

    css_path = "css/design-system.css"
    css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V22.0: PRO IDE"
    if marker in css:
        css = css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css + "\n\n" + V22_CSS.strip() + "\n")
    print("✔ Đã cập nhật css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        scripts_to_add = ''
        if 'js/multilang-engine.js' not in html:
            scripts_to_add += '\n  <script src="js/multilang-engine.js"></script>'
        if 'js/v22-pro-ide.js' not in html:
            scripts_to_add += '\n  <script src="js/v22-pro-ide.js"></script>'

        if scripts_to_add:
            if '<script src="js/v21-upgrade.js"></script>' in html:
                html = html.replace('<script src="js/v21-upgrade.js"></script>', '<script src="js/v21-upgrade.js"></script>' + scripts_to_add)
            else:
                html = html.replace('</body>', scripts_to_add + '\n</body>')
            with open("index.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("✔ Đã nhúng js/multilang-engine.js và js/v22-pro-ide.js vào index.html")

    print("\nHOÀN TẤT NÂNG CẤP V22! Tải lại trình duyệt (Ctrl + Shift + R) để kiểm tra.")

if __name__ == "__main__":
    apply_v22()