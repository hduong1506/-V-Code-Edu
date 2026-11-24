// V-CODE EDU — V22 PRO IDE (CLEAR BTN, AUTOCOMPLETE TAB, VS CODE SYNTAX COLOR, MULTILANG RUNNER, HOME FX)
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
