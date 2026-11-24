// V-CODE EDU — SCRATCH 3.0 SLEEK + FLOWCHART SVG + BOTTOM DIAGNOSTICS PANEL
(function () {
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function stripComment(line) {
    let inStr = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if ((ch === '"' || ch === "'") && line[i - 1] !== '\\') {
        inStr = inStr === ch ? null : (inStr || ch);
      } else if (ch === '#' && !inStr) {
        return line.slice(0, i).trim();
      }
    }
    return line.trim();
  }

  function parseLine(rawLine) {
    const t = stripComment(rawLine);
    if (!t) return null;

    let m = t.match(/^(?:if|neu)(?:\s+|\s*(?=\())(.+?):?$/i);
    if (m) return { kind: 'if', type: 'control', text: `Nếu ${m[1].trim()}?`, html: `Nếu <span class="sc-pill sc-pill-cond">${esc(m[1].trim())}</span> thì`, isBlock: true };

    m = t.match(/^(?:elif|nguoc_lai_neu)(?:\s+|\s*(?=\())(.+?):?$/i);
    if (m) return { kind: 'elif', type: 'control', text: `Ngược lại nếu ${m[1].trim()}?`, html: `Ngược lại nếu <span class="sc-pill sc-pill-cond">${esc(m[1].trim())}</span> thì`, isBlock: true };

    if (/^(?:else|nguoc_lai)\s*:?$/i.test(t)) return { kind: 'else', type: 'control', text: 'Ngược lại', html: `Ngược lại`, isBlock: true };

    m = t.match(/^(?:for|lap_voi)\s+([a-zA-Z_]\w*)\s+(?:in|trong_khoang)\s+(.+?):?$/i);
    if (m) {
      let rng = m[2].trim();
      const rm = rng.match(/^range\s*\((.*)\)$/);
      if (rm) rng = rm[1];
      return { kind: 'for', type: 'loop', text: `Lặp ${m[1]} trong (${rng})`, html: `Lặp biến <span class="sc-pill sc-pill-white">${esc(m[1])}</span> trong khoảng <span class="sc-pill sc-pill-white">${esc(rng)}</span>`, isBlock: true };
    }

    m = t.match(/^(?:while|khi_ma)(?:\s+|\s*(?=\())(.+?):?$/i);
    if (m) return { kind: 'while', type: 'loop', text: `Lặp khi ${m[1].trim()}?`, html: `Lặp trong khi <span class="sc-pill sc-pill-cond">${esc(m[1].trim())}</span>`, isBlock: true };

    m = t.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*:?$/i);
    if (m) return { kind: 'def', type: 'func', text: `Hàm ${m[1]}(${m[2]})`, html: `Định nghĩa hàm <span class="sc-pill sc-pill-white">${esc(m[1])}(${esc(m[2])})</span>`, isBlock: true };

    m = t.match(/^return\b(.*)$/i);
    if (m) return { kind: 'return', type: 'func', text: `Trả về ${m[1].trim() || 'None'}`, html: `Trả về <span class="sc-pill sc-pill-white">${esc(m[1].trim() || 'None')}</span>`, isBlock: false };

    m = t.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*=\s*(?:int|float|str|map)?\s*\(?.*(?:input|nhap_so|nhap_chuoi|nhap_so_thuc)\s*\(/i);
    if (m) return { kind: 'input', type: 'sensing', text: `Nhập ${m[1]}`, html: `Hỏi &amp; nhập dữ liệu lưu vào <span class="sc-pill sc-pill-white">${esc(m[1])}</span>`, isBlock: false };

    m = t.match(/^(?:print|in_ra)\s*\((.*)\)$/i);
    if (m) return { kind: 'print', type: 'looks', text: `In ${m[1].trim() || '""'}`, html: `Hiển thị ra màn hình <span class="sc-pill sc-pill-white">${esc(m[1].trim() || '""')}</span>`, isBlock: false };

    m = t.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/);
    if (m) {
      const op = { '+=': 'tăng thêm', '-=': 'giảm đi', '*=': 'nhân với', '/=': 'chia cho' }[m[2]];
      return { kind: 'assign', type: 'data', text: `${m[1]} ${m[2]} ${m[3].trim()}`, html: `Thay đổi biến <span class="sc-pill sc-pill-white">${esc(m[1])}</span> ${op} <span class="sc-pill sc-pill-white">${esc(m[3].trim())}</span>`, isBlock: false };
    }

    m = t.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*=\s*(.+)$/);
    if (m) return { kind: 'assign', type: 'data', text: `${m[1]} = ${m[2].trim()}`, html: `Đặt biến <span class="sc-pill sc-pill-white">${esc(m[1])}</span> thành <span class="sc-pill sc-pill-white">${esc(m[2].trim())}</span>`, isBlock: false };

    if (/^break$/i.test(t)) return { kind: 'break', type: 'control', text: 'Thoát vòng lặp', html: `Thoát vòng lặp`, isBlock: false };
    if (/^continue$/i.test(t)) return { kind: 'continue', type: 'control', text: 'Bỏ qua lượt lặp', html: `Chuyển lượt lặp tiếp theo`, isBlock: false };

    return { kind: 'stmt', type: 'stmt', text: t, html: `Lệnh <span class="sc-pill sc-pill-white">${esc(t)}</span>`, isBlock: false };
  }

  function buildTree(code) {
    const lines = String(code || '').replace(/\r\n/g, '\n').split('\n');
    const items = [];
    for (const raw of lines) {
      const p = parseLine(raw);
      if (!p) continue;
      const indent = (raw.match(/^[ \t]*/) || [''])[0].replace(/\t/g, '    ').length;
      items.push({ ...p, indent, children: [] });
    }
    const root = [];
    const stack = [];
    for (const item of items) {
      while (stack.length && stack[stack.length - 1].indent >= item.indent) stack.pop();
      if (stack.length && stack[stack.length - 1].isBlock) stack[stack.length - 1].children.push(item);
      else root.push(item);
      if (item.isBlock) stack.push(item);
    }
    return root;
  }

  function renderSleekNodes(nodes) {
    return nodes.map((n) => {
      if (n.isBlock) {
        const inner = n.children.length ? renderSleekNodes(n.children) : '';
        return `<div class="sc-sleek-group"><div class="sc-sleek-pill sc-sleek-${n.type}">${n.html}</div>${inner ? `<div class="sc-sleek-branch sc-branch-${n.type}">${inner}</div>` : ''}</div>`;
      }
      return `<div class="sc-sleek-pill sc-sleek-${n.type}">${n.html}</div>`;
    }).join('');
  }

  function renderScratchHTML(code) {
    const tree = buildTree(code);
    let html = `<div class="sc-sleek-stage"><div class="sc-sleek-hat">Khi bấm vào Chạy Chương Trình (V-Code Edu)</div>`;
    if (!tree.length) {
      html += `<div class="sc-sleek-empty">Bắt đầu gõ lệnh Python ở khung bên trái hoặc bấm nút ví dụ phía trên để xem khối Scratch Live.</div>`;
    } else {
      html += renderSleekNodes(tree);
    }
    return html + `</div>`;
  }

  function renderFlowchartSVG(code) {
    const lines = String(code || '').replace(/\r\n/g, '\n').split('\n');
    const nodes = [];
    for (const raw of lines) {
      const p = parseLine(raw);
      if (p) nodes.push(p);
    }
    if (!nodes.length) {
      return `<div class="sc-sleek-empty" style="margin:14px">Chưa có lệnh để vẽ Sơ đồ khối. Hãy gõ lệnh hoặc bấm nút ví dụ phía trên.</div>`;
    }
    const W = 520, CX = W / 2, stepY = 74, H = (nodes.length + 2) * stepY + 36;
    const clip = (s, max = 32) => s.length > max ? s.slice(0, max - 1) + '…' : s;
    const parts = [
      `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:540px;display:block;margin:8px auto">`,
      `<defs><marker id="fc-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" fill="#38BDF8"/></marker></defs>`,
      `<rect x="${CX - 72}" y="12" width="144" height="36" rx="18" fill="#059669" stroke="#34D399" stroke-width="1.6"/>`,
      `<text x="${CX}" y="34" text-anchor="middle" fill="#FFF" font-family="Inter,sans-serif" font-size="12.5" font-weight="700">BẮT ĐẦU</text>`
    ];
    let prevY = 48;
    nodes.forEach((n, idx) => {
      const y = 30 + (idx + 1) * stepY;
      parts.push(`<line x1="${CX}" y1="${prevY}" x2="${CX}" y2="${y - 24}" stroke="#38BDF8" stroke-width="1.6" marker-end="url(#fc-a)"/>`);
      const lbl = esc(clip(n.text));
      if (['if', 'elif', 'for', 'while'].includes(n.kind)) {
        const rx = 126, ry = 26;
        parts.push(
          `<polygon points="${CX},${y - ry} ${CX + rx},${y} ${CX},${y + ry} ${CX - rx},${y}" fill="#B45309" stroke="#FBBF24" stroke-width="1.6"/>`,
          `<text x="${CX}" y="${y + 4}" text-anchor="middle" fill="#FFF" font-family="JetBrains Mono,monospace" font-size="11" font-weight="700">${lbl}</text>`,
          `<text x="${CX + 12}" y="${y + ry + 12}" fill="#34D399" font-size="10.5" font-weight="700">Đúng</text>`,
          `<text x="${CX + rx + 8}" y="${y - 4}" fill="#F43F5E" font-size="10.5" font-weight="700">Sai</text>`,
          `<path d="M ${CX + rx} ${y} L ${CX + rx + 34} ${y} L ${CX + rx + 34} ${y + stepY - 10} L ${CX + 12} ${y + stepY - 10}" fill="none" stroke="#F43F5E" stroke-width="1.3" stroke-dasharray="4 3"/>`
        );
        prevY = y + ry;
      } else if (n.kind === 'input' || n.kind === 'print') {
        const w = 132, h = 21, sk = 14;
        parts.push(
          `<polygon points="${CX - w + sk},${y - h} ${CX + w + sk},${y - h} ${CX + w - sk},${y + h} ${CX - w - sk},${y + h}" fill="${n.kind === 'input' ? '#0369A1' : '#6D28D9'}" stroke="${n.kind === 'input' ? '#38BDF8' : '#A78BFA'}" stroke-width="1.6"/>`,
          `<text x="${CX}" y="${y + 4}" text-anchor="middle" fill="#FFF" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600">${lbl}</text>`
        );
        prevY = y + h;
      } else {
        const w = 134, h = 21;
        parts.push(
          `<rect x="${CX - w}" y="${y - h}" width="${w * 2}" height="${h * 2}" rx="6" fill="#1E293B" stroke="#60A5FA" stroke-width="1.6"/>`,
          `<text x="${CX}" y="${y + 4}" text-anchor="middle" fill="#F8FAFC" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600">${lbl}</text>`
        );
        prevY = y + h;
      }
    });
    const endY = 30 + (nodes.length + 1) * stepY;
    parts.push(
      `<line x1="${CX}" y1="${prevY}" x2="${CX}" y2="${endY - 20}" stroke="#38BDF8" stroke-width="1.6" marker-end="url(#fc-a)"/>`,
      `<rect x="${CX - 72}" y="${endY - 18}" width="144" height="36" rx="18" fill="#BE123C" stroke="#FB7185" stroke-width="1.6"/>`,
      `<text x="${CX}" y="${endY + 4}" text-anchor="middle" fill="#FFF" font-family="Inter,sans-serif" font-size="12.5" font-weight="700">KẾT THÚC</text></svg>`
    );
    return parts.join('');
  }

  const PY_BUILTINS = new Set([
    'if', 'elif', 'else', 'for', 'in', 'while', 'def', 'return', 'break', 'continue', 'pass', 'class',
    'and', 'or', 'not', 'True', 'False', 'None', 'import', 'from', 'as', 'try', 'except', 'finally', 'with',
    'print', 'input', 'int', 'float', 'str', 'bool', 'list', 'dict', 'set', 'tuple', 'range', 'len', 'abs',
    'max', 'min', 'sum', 'round', 'map', 'sorted', 'enumerate', 'zip', 'type', 'pow', 'chr', 'ord',
    'nhap_so', 'nhap_so_thuc', 'nhap_chuoi', 'in_ra', 'neu', 'nguoc_lai_neu', 'nguoc_lai', 'lap_voi', 'trong_khoang', 'khi_ma', 'va', 'hoac'
  ]);

  function analyzePythonCode(code) {
    const rawLines = String(code || '').replace(/\r\n/g, '\n').split('\n');
    const issues = [];
    const definedVars = new Set();
    let expectIndentAfterLine = -1, expectBaseIndent = 0;

    for (let i = 0; i < rawLines.length; i++) {
      const lineNo = i + 1;
      const raw = rawLines[i];
      const indent = (raw.match(/^[ \t]*/) || [''])[0].replace(/\t/g, '    ').length;
      const t = stripComment(raw);
      if (!t) continue;

      if (expectIndentAfterLine !== -1) {
        if (indent <= expectBaseIndent) {
          issues.push({
            line: lineNo, severity: 'error', title: 'Lỗi thụt lề (IndentationError)',
            detail: `Dòng ${lineNo} nằm sau khối ở dòng ${expectIndentAfterLine} nên cần nhấn phím Tab để thụt vào.`
          });
        }
        expectIndentAfterLine = -1;
      }

      let inStr = null, parenBal = 0, sqBal = 0;
      for (let c = 0; c < t.length; c++) {
        const ch = t[c];
        if ((ch === '"' || ch === "'") && t[c - 1] !== '\\') {
          if (!inStr) inStr = ch; else if (inStr === ch) inStr = null;
        } else if (!inStr) {
          if (ch === '(') parenBal++; else if (ch === ')') parenBal--;
          else if (ch === '[') sqBal++; else if (ch === ']') sqBal--;
        }
      }
      if (inStr) issues.push({ line: lineNo, severity: 'error', title: 'Chuỗi chưa đóng dấu nháy', detail: `Thiếu dấu đóng chuỗi ${inStr} tại dòng ${lineNo}.` });
      if (parenBal !== 0) issues.push({ line: lineNo, severity: 'error', title: 'Thiếu hoặc thừa dấu ngoặc tròn ()', detail: `Số dấu '(' và ')' không khớp tại dòng ${lineNo}.` });
      if (sqBal !== 0) issues.push({ line: lineNo, severity: 'error', title: 'Thiếu hoặc thừa dấu ngoặc vuông []', detail: `Số dấu '[' và ']' không khớp tại dòng ${lineNo}.` });

      if (/^else\s+if\b/.test(t)) {
        issues.push({ line: lineNo, severity: 'error', title: 'Sai cú pháp rẽ nhánh', detail: `Trong Python viết "elif" thay vì "else if" tại dòng ${lineNo}.` });
      }

      if (/^(?:if|elif|else|for|while|def|neu|nguoc_lai_neu|nguoc_lai|lap_voi|khi_ma)\b/.test(t)) {
        if (!t.endsWith(':')) {
          issues.push({ line: lineNo, severity: 'error', title: 'Thiếu dấu hai chấm (:)', detail: `Câu lệnh "${t.split(/\s+/)[0]}" ở dòng ${lineNo} bắt buộc kết thúc bằng dấu ':'.` });
        } else {
          expectIndentAfterLine = lineNo;
          expectBaseIndent = indent;
        }
      }

      const condMatch = t.match(/^(?:if|elif|while|neu|nguoc_lai_neu|khi_ma)\s+(.+?):?$/);
      if (condMatch) {
        const cond = condMatch[1].replace(/(['"])(?:\\.|(?!\1).)*\1/g, '');
        if (/(?<![=!<>])=(?!=)/.test(cond)) {
          issues.push({ line: lineNo, severity: 'error', title: 'Sai phép so sánh (= thay vì ==)', detail: `Trong điều kiện tại dòng ${lineNo}, cần dùng "==" thay vì "=".` });
        }
      }

      const forM = t.match(/^(?:for|lap_voi)\s+([a-zA-Z_]\w*)\s+(?:in|trong_khoang)\b/);
      if (forM) definedVars.add(forM[1]);

      const defM = t.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)/);
      if (defM) {
        definedVars.add(defM[1]);
        defM[2].split(',').forEach((p) => { const pn = p.trim().split('=')[0].trim(); if (pn) definedVars.add(pn); });
      }

      const assignM = t.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*=(?!=)\s*(.+)$/);
      let exprToCheck = t;
      if (assignM) {
        exprToCheck = assignM[2];
        assignM[1].split(',').forEach((v) => definedVars.add(v.trim()));
      }

      const cleanedExpr = exprToCheck.replace(/(['"])(?:\\.|(?!\1).)*\1/g, ' ').replace(/\.[a-zA-Z_]\w*/g, ' ');
      const words = cleanedExpr.match(/\b[a-zA-Z_]\w*\b/g) || [];
      const seenMissing = new Set();
      for (const w of words) {
        if (!PY_BUILTINS.has(w) && !definedVars.has(w) && !seenMissing.has(w)) {
          if (forM && w === forM[1]) continue;
          if (defM && w === defM[1]) continue;
          seenMissing.add(w);
          issues.push({
            line: lineNo, severity: 'error', title: `Biến '${w}' chưa được khai báo trước khi dùng`,
            detail: `Dòng ${lineNo} sử dụng biến '${w}' nhưng chưa có lệnh gán hoặc nhập trước đó (ví dụ: ${w} = int(input())).`
          });
        }
      }
    }

    if (expectIndentAfterLine !== -1) {
      issues.push({
        line: expectIndentAfterLine, severity: 'warn', title: 'Khối lệnh chưa có thân lệnh',
        detail: `Dòng ${expectIndentAfterLine} kết thúc bằng ':' nhưng chưa có dòng lệnh thụt vào bên dưới.`
      });
    }
    return issues;
  }

  window.jumpToEditorLine = function (lineNo) {
    const ed = document.getElementById('code-editor');
    if (!ed) return;
    const lines = ed.value.split('\n');
    let pos = 0;
    for (let i = 0; i < Math.min(lineNo - 1, lines.length); i++) pos += lines[i].length + 1;
    ed.focus();
    ed.setSelectionRange(pos, pos + (lines[lineNo - 1] || '').length);
  };

  let currentRightTab = 'scratch';

  function locateIDELayout() {
    const ws = document.getElementById('view-workspace') || document.querySelector('[id*="workspace"]') || document.body;
    const btns = [...ws.querySelectorAll('button')];
    const scBtn = btns.find((b) => /Scratch Live/i.test(b.textContent || ''));
    const conBtn = btns.find((b) => /Kết quả Console|Console/i.test(b.textContent || ''));
    const fcBtn = btns.find((b) => /Sơ đồ khối/i.test(b.textContent || ''));
    const consoleEl = document.getElementById('console-output') || ws.querySelector('[id*="console"]');

    let outerRight = null;
    if (consoleEl && scBtn) {
      let cur = consoleEl.parentElement;
      while (cur && cur !== ws && cur !== document.body) {
        if (cur.contains(scBtn)) { outerRight = cur; break; }
        cur = cur.parentElement;
      }
    }
    if (!outerRight && scBtn) {
      outerRight = scBtn.parentElement?.parentElement?.parentElement || scBtn.parentElement?.parentElement;
    }

    let tabHeaderBar = null;
    let outputBodyWrap = null;
    if (outerRight) {
      for (const ch of [...outerRight.children]) {
        if (ch.id === 'ide-diagnostics-panel') continue;
        if (scBtn && ch.contains(scBtn)) tabHeaderBar = ch;
        else if (consoleEl && ch.contains(consoleEl)) outputBodyWrap = ch;
      }
      if (!outputBodyWrap) {
        outputBodyWrap = [...outerRight.children].find((ch) => ch !== tabHeaderBar && ch.id !== 'ide-diagnostics-panel' && ch.tagName !== 'STYLE');
      }
    }
    return { ws, scBtn, conBtn, fcBtn, consoleEl, outerRight, tabHeaderBar, outputBodyWrap };
  }

  function setupRightColumnCleanly() {
    const { scBtn, conBtn, fcBtn, consoleEl, outerRight, outputBodyWrap } = locateIDELayout();
    if (!outerRight || !outputBodyWrap) return null;

    if (fcBtn) {
      fcBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><rect x="3" y="3" width="7" height="5" rx="1"/><rect x="14" y="16" width="7" height="5" rx="1"/><path d="M6.5 8v4a2 2 0 0 0 2 2h9v2"/></svg>Sơ đồ khối`;
    }

    const oldDiag = document.getElementById('ide-diagnostics-panel');
    if (oldDiag && oldDiag.parentElement !== outerRight) oldDiag.remove();

    outerRight.classList.add('v20-ide-right-col');
    outputBodyWrap.classList.add('v20-ide-upper-box');

    let scratchPane = outputBodyWrap.querySelector('#v20-scratch-pane')
      || outputBodyWrap.querySelector('#scratch-canvas, #scratch-blocks-view, #scratch-panel, [id*="scratch"]');
    if (!scratchPane || scratchPane === outputBodyWrap) {
      scratchPane = document.createElement('div');
      scratchPane.id = 'v20-scratch-pane';
      scratchPane.className = 'v20-pane-box';
      outputBodyWrap.prepend(scratchPane);
    }

    let flowPane = outputBodyWrap.querySelector('#v20-flow-pane')
      || outputBodyWrap.querySelector('#flowchart-canvas, #flowchart-view, #flowchart-panel, [id*="flow"]');
    if (!flowPane || flowPane === outputBodyWrap || flowPane === scratchPane) {
      flowPane = document.createElement('div');
      flowPane.id = 'v20-flow-pane';
      flowPane.className = 'v20-pane-box';
      outputBodyWrap.appendChild(flowPane);
    }

    let consolePane = consoleEl ? (consoleEl.parentElement === outputBodyWrap ? consoleEl : consoleEl.closest('[id*="console"], .console-pane') || consoleEl) : null;
    if (consolePane === outputBodyWrap) consolePane = consoleEl;

    let diagPanel = document.getElementById('ide-diagnostics-panel');
    if (!diagPanel) {
      diagPanel = document.createElement('div');
      diagPanel.id = 'ide-diagnostics-panel';
      diagPanel.className = 'v20-diag-box';
      diagPanel.innerHTML = `
        <div class="v20-diag-topbar">
          <div class="v20-diag-left">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
            <span>Kiểm tra lỗi mã nguồn</span>
            <span id="v20-diag-badge" class="v20-diag-badge idle">Chưa kiểm tra</span>
          </div>
          <button type="button" id="v20-btn-check-errors" class="v20-btn-check">Kiểm tra lỗi</button>
        </div>
        <div id="v20-diag-console" class="v20-diag-console">
          <div class="v20-diag-placeholder">Bấm nút <strong>Kiểm tra lỗi</strong> để quét cú pháp, thụt lề, ngoặc và biến chưa khai báo theo từng dòng.</div>
        </div>
      `;
      outerRight.appendChild(diagPanel);

      document.getElementById('v20-btn-check-errors').onclick = () => {
        const code = document.getElementById('code-editor')?.value || '';
        renderDiagnostics(code, null);
      };
    }

    const activateTab = (tabName) => {
      currentRightTab = tabName;
      const code = document.getElementById('code-editor')?.value || '';

      [scBtn, conBtn, fcBtn].forEach((b) => b && b.classList.remove('active'));
      if (tabName === 'scratch' && scBtn) scBtn.classList.add('active');
      if (tabName === 'console' && conBtn) conBtn.classList.add('active');
      if (tabName === 'flowchart' && fcBtn) fcBtn.classList.add('active');

      [...outputBodyWrap.children].forEach((ch) => { ch.style.display = 'none'; });

      if (tabName === 'scratch') {
        scratchPane.style.display = 'block';
        scratchPane.innerHTML = renderScratchHTML(code);
      } else if (tabName === 'flowchart') {
        flowPane.style.display = 'block';
        flowPane.innerHTML = renderFlowchartSVG(code);
      } else if (tabName === 'console' && consolePane) {
        consolePane.style.display = 'block';
        if (consoleEl) consoleEl.style.display = 'block';
      }
    };

    if (scBtn && !scBtn.dataset.v20Bound) {
      scBtn.dataset.v20Bound = '1';
      scBtn.onclick = (e) => { e.preventDefault(); activateTab('scratch'); };
    }
    if (conBtn && !conBtn.dataset.v20Bound) {
      conBtn.dataset.v20Bound = '1';
      conBtn.onclick = (e) => { e.preventDefault(); activateTab('console'); };
    }
    if (fcBtn && !fcBtn.dataset.v20Bound) {
      fcBtn.dataset.v20Bound = '1';
      fcBtn.onclick = (e) => { e.preventDefault(); activateTab('flowchart'); };
    }

    window.switchOutputTab = (t) => activateTab(t === 'flow' ? 'flowchart' : t);
    return { scratchPane, flowPane, consolePane, activateTab };
  }

  function renderDiagnostics(code, runtimeError) {
    const box = document.getElementById('v20-diag-console');
    const badge = document.getElementById('v20-diag-badge');
    if (!box || !badge) return;

    const issues = analyzePythonCode(code);
    if (runtimeError) {
      const mLine = String(runtimeError).match(/dòng\s+(\d+)/i);
      issues.unshift({ line: mLine ? Number(mLine[1]) : 1, severity: 'error', title: 'Lỗi khi thực thi chương trình', detail: String(runtimeError) });
    }

    if (!issues.length) {
      badge.className = 'v20-diag-badge ok';
      badge.textContent = '0 lỗi';
      box.innerHTML = `<div class="v20-diag-ok">Đã kiểm tra xong: Không phát hiện lỗi cú pháp hay lỗi biến. Chương trình hợp lệ!</div>`;
      return;
    }

    const errs = issues.filter((x) => x.severity === 'error').length;
    const warns = issues.length - errs;
    badge.className = `v20-diag-badge ${errs > 0 ? 'err' : 'warn'}`;
    badge.textContent = errs > 0 ? `${errs} lỗi${warns ? `, ${warns} cảnh báo` : ''}` : `${warns} cảnh báo`;

    box.innerHTML = issues.map((it) => `
      <div class="v20-diag-row ${it.severity}" onclick="jumpToEditorLine(${it.line})">
        <span class="v20-diag-ln">Dòng ${it.line}</span>
        <div class="v20-diag-txt">
          <strong>${esc(it.title)}</strong>
          <span>${esc(it.detail)}</span>
        </div>
      </div>`).join('');
  }

  function syncAll(codeArg, runtimeError) {
    const ui = setupRightColumnCleanly();
    const ed = document.getElementById('code-editor');
    const code = codeArg !== undefined ? codeArg : (ed ? ed.value : '');
    if (ui) {
      if (currentRightTab === 'scratch') {
        ui.scratchPane.style.display = 'block';
        ui.scratchPane.innerHTML = renderScratchHTML(code);
      } else if (currentRightTab === 'flowchart') {
        ui.flowPane.style.display = 'block';
        ui.flowPane.innerHTML = renderFlowchartSVG(code);
      }
    }
    if (runtimeError) renderDiagnostics(code, runtimeError);
  }

  const API = {
    parseLine, buildTree, renderScratchHTML, renderFlowchartSVG, analyzePythonCode, renderDiagnostics, syncAll,
    render(code) { syncAll(code); },
    renderFlowchart(code) { currentRightTab = 'flowchart'; syncAll(code); }
  };

  window.VCodeScratchBridge = API;
  window.ScratchBridge = API;
  window.VCodeScratch = API;
  window.renderScratchFromPython = (c) => API.render(c);
  window.renderScratchLive = (c) => API.render(c);
  window.updateScratchLive = (c) => API.render(c);
  window.updateScratchBlocks = (c) => API.render(c);
  window.renderFlowchart = (c) => API.renderFlowchart(c);

  window.addEventListener('DOMContentLoaded', () => {
    const ed = document.getElementById('code-editor');
    const boot = () => {
      const ui = setupRightColumnCleanly();
      if (ui) ui.activateTab('scratch');
    };
    setTimeout(boot, 80);
    setTimeout(boot, 450);

    if (ed) {
      ed.addEventListener('input', () => syncAll(ed.value));
      ed.addEventListener('keyup', () => syncAll(ed.value));
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const txt = (btn.textContent || '').trim();
      if (txt.startsWith('+') || /IDE & Scratch/i.test(txt)) {
        setTimeout(() => syncAll(), 50);
      }
    });
  });
})();
