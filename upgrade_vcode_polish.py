# -*- coding: utf-8 -*-
"""
V-CODE EDU — BẢN VÁ LỖI & HOÀN THIỆN TOÀN DIỆN
"""
import os
import re

SCRATCH_AND_DIAG_JS = r"""// V-CODE EDU — SCRATCH 3.0 SLEEK ENGINE + FLOWCHART SVG + REAL-TIME CODE DIAGNOSTICS
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
    if (m) return { kind: 'input', type: 'sensing', text: `Nhập ${m[1]}`, html: `Hỏi &amp; nhập số lưu vào <span class="sc-pill sc-pill-white">${esc(m[1])}</span>`, isBlock: false };

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
        return `
          <div class="sc-sleek-group">
            <div class="sc-sleek-pill sc-sleek-${n.type}">${n.html}</div>
            ${inner ? `<div class="sc-sleek-branch sc-branch-${n.type}">${inner}</div>` : ''}
          </div>`;
      }
      return `<div class="sc-sleek-pill sc-sleek-${n.type}">${n.html}</div>`;
    }).join('');
  }

  function renderScratchHTML(code) {
    const tree = buildTree(code);
    let html = `<div class="sc-sleek-stage"><div class="sc-sleek-hat">Khi bấm vào Chạy Chương Trình (V-Code Edu)</div>`;
    if (!tree.length) {
      html += `<div class="sc-sleek-empty">Gõ lệnh Python bên trái hoặc bấm nút ví dụ phía trên để xem khối Scratch Live.</div>`;
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
      return `<div class="sc-sleek-empty" style="margin:14px">Chưa có lệnh để vẽ Sơ đồ khối. Hãy gõ lệnh hoặc chọn ví dụ mẫu.</div>`;
    }
    const W = 500, CX = W / 2, stepY = 74, H = (nodes.length + 2) * stepY + 36;
    const clip = (s, max = 32) => s.length > max ? s.slice(0, max - 1) + '…' : s;
    const parts = [
      `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:520px;display:block;margin:8px auto">`,
      `<defs><marker id="fc-a" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1L10 5L0 9z" fill="#38BDF8"/></marker></defs>`,
      `<rect x="${CX - 70}" y="12" width="140" height="36" rx="18" fill="#059669" stroke="#34D399" stroke-width="1.6"/>`,
      `<text x="${CX}" y="34" text-anchor="middle" fill="#FFF" font-family="Inter,sans-serif" font-size="12.5" font-weight="700">BẮT ĐẦU</text>`
    ];
    let prevY = 48;
    nodes.forEach((n, idx) => {
      const y = 30 + (idx + 1) * stepY;
      parts.push(`<line x1="${CX}" y1="${prevY}" x2="${CX}" y2="${y - 24}" stroke="#38BDF8" stroke-width="1.6" marker-end="url(#fc-a)"/>`);
      const lbl = esc(clip(n.text));
      if (['if', 'elif', 'for', 'while'].includes(n.kind)) {
        const rx = 122, ry = 26;
        parts.push(
          `<polygon points="${CX},${y - ry} ${CX + rx},${y} ${CX},${y + ry} ${CX - rx},${y}" fill="#B45309" stroke="#FBBF24" stroke-width="1.6"/>`,
          `<text x="${CX}" y="${y + 4}" text-anchor="middle" fill="#FFF" font-family="JetBrains Mono,monospace" font-size="11" font-weight="700">${lbl}</text>`,
          `<text x="${CX + 10}" y="${y + ry + 12}" fill="#34D399" font-size="10" font-weight="700">Đúng</text>`,
          `<text x="${CX + rx + 6}" y="${y - 4}" fill="#F43F5E" font-size="10" font-weight="700">Sai</text>`
        );
        prevY = y + ry;
      } else if (n.kind === 'input' || n.kind === 'print') {
        const w = 130, h = 21, sk = 14;
        parts.push(
          `<polygon points="${CX - w + sk},${y - h} ${CX + w + sk},${y - h} ${CX + w - sk},${y + h} ${CX - w - sk},${y + h}" fill="${n.kind === 'input' ? '#0369A1' : '#6D28D9'}" stroke="${n.kind === 'input' ? '#38BDF8' : '#A78BFA'}" stroke-width="1.6"/>`,
          `<text x="${CX}" y="${y + 4}" text-anchor="middle" fill="#FFF" font-family="JetBrains Mono,monospace" font-size="11" font-weight="600">${lbl}</text>`
        );
        prevY = y + h;
      } else {
        const w = 132, h = 21;
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
      `<rect x="${CX - 70}" y="${endY - 18}" width="140" height="36" rx="18" fill="#BE123C" stroke="#FB7185" stroke-width="1.6"/>`,
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
    let expectIndentAfterLine = -1;
    let expectBaseIndent = 0;

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
            detail: `Dòng ${lineNo} nằm ngay sau khối ở dòng ${expectIndentAfterLine} nên phải nhấn phím Tab để thụt vào.`
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
      if (parenBal !== 0) issues.push({ line: lineNo, severity: 'error', title: 'Thiếu hoặc thừa dấu ngoặc tròn ()', detail: `Số lượng dấu '(' và ')' không khớp ở dòng ${lineNo}.` });
      if (sqBal !== 0) issues.push({ line: lineNo, severity: 'error', title: 'Thiếu hoặc thừa dấu ngoặc vuông []', detail: `Số lượng dấu '[' và ']' không khớp ở dòng ${lineNo}.` });

      if (/^else\s+if\b/.test(t)) {
        issues.push({ line: lineNo, severity: 'error', title: 'Sai cú pháp nhánh điều kiện', detail: `Trong Python viết "elif" thay vì "else if" ở dòng ${lineNo}.` });
      }

      if (/^(?:if|elif|else|for|while|def|neu|nguoc_lai_neu|nguoc_lai|lap_voi|khi_ma)\b/.test(t)) {
        if (!t.endsWith(':')) {
          issues.push({ line: lineNo, severity: 'error', title: 'Thiếu dấu hai chấm (:)', detail: `Câu lệnh "${t.split(/\s+/)[0]}" tại dòng ${lineNo} phải kết thúc bằng dấu ':'.` });
        } else {
          expectIndentAfterLine = lineNo;
          expectBaseIndent = indent;
        }
      }

      const condMatch = t.match(/^(?:if|elif|while|neu|nguoc_lai_neu|khi_ma)\s+(.+?):?$/);
      if (condMatch) {
        const cond = condMatch[1].replace(/(['"])(?:\\.|(?!\1).)*\1/g, '');
        if (/(?<![=!<>])=(?!=)/.test(cond)) {
          issues.push({ line: lineNo, severity: 'error', title: 'Dùng sai phép so sánh (= thay vì ==)', detail: `Trong điều kiện dòng ${lineNo}, hãy dùng "==" để so sánh bằng.` });
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
            line: lineNo, severity: 'warn', title: `Biến '${w}' chưa được khai báo`,
            detail: `Dòng ${lineNo} đang dùng '${w}' nhưng chưa gán giá trị trước đó (ví dụ: ${w} = int(input())).`
          });
        }
      }
    }

    if (expectIndentAfterLine !== -1) {
      issues.push({
        line: expectIndentAfterLine, severity: 'warn', title: 'Khối lệnh chưa có thân lệnh',
        detail: `Dòng ${expectIndentAfterLine} kết thúc bằng ':' nhưng chưa có câu lệnh thụt vào bên dưới.`
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

  function ensureDiagnosticsPanel(rightCol) {
    if (!rightCol) return null;
    rightCol.classList.add('v19-keep-dark-panel');
    let panel = document.getElementById('ide-diagnostics-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'ide-diagnostics-panel';
      panel.className = 'ide-diag-panel';
      panel.innerHTML = `
        <div class="ide-diag-header">
          <div class="ide-diag-title">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Kiểm tra lỗi mã nguồn</span>
            <span id="ide-diag-badge" class="ide-diag-badge ok">Không có lỗi</span>
          </div>
          <span class="ide-diag-sub">Bấm vào dòng để nhảy tới vị trí lỗi</span>
        </div>
        <div id="ide-diag-list" class="ide-diag-list"></div>
      `;
      rightCol.appendChild(panel);
    }
    return panel;
  }

  function renderDiagnostics(code, runtimeError) {
    const listEl = document.getElementById('ide-diag-list');
    const badgeEl = document.getElementById('ide-diag-badge');
    if (!listEl || !badgeEl) return;

    const issues = analyzePythonCode(code);
    if (runtimeError) {
      const mLine = String(runtimeError).match(/dòng\s+(\d+)/i);
      issues.unshift({ line: mLine ? Number(mLine[1]) : 1, severity: 'error', title: 'Lỗi khi chạy chương trình', detail: String(runtimeError) });
    }

    const errCount = issues.filter((x) => x.severity === 'error').length;
    const warnCount = issues.length - errCount;

    if (!issues.length) {
      badgeEl.className = 'ide-diag-badge ok';
      badgeEl.textContent = 'Không có lỗi';
      listEl.innerHTML = `<div class="ide-diag-clean">Cú pháp mã nguồn hợp lệ. Chương trình sẵn sàng chạy.</div>`;
      return;
    }

    badgeEl.className = `ide-diag-badge ${errCount > 0 ? 'err' : 'warn'}`;
    badgeEl.textContent = errCount > 0 ? `${errCount} lỗi${warnCount ? `, ${warnCount} cảnh báo` : ''}` : `${warnCount} cảnh báo`;

    listEl.innerHTML = issues.map((it) => `
      <div class="ide-diag-item ${it.severity}" onclick="jumpToEditorLine(${it.line})">
        <span class="ide-diag-line">Dòng ${it.line}</span>
        <div class="ide-diag-body">
          <strong>${esc(it.title)}</strong>
          <span>${esc(it.detail)}</span>
        </div>
      </div>`).join('');
  }

  function findRightPanes() {
    const ws = document.getElementById('view-workspace') || document.querySelector('[id*="workspace"]') || document.body;
    const btns = [...ws.querySelectorAll('button')];
    const scBtn = btns.find((b) => /Scratch Live/i.test(b.textContent || ''));
    const fcBtn = btns.find((b) => /Sơ đồ khối/i.test(b.textContent || ''));

    let scratchPane = document.getElementById('scratch-canvas')
      || document.getElementById('scratch-blocks-view')
      || document.getElementById('scratch-blocks')
      || document.getElementById('scratch-panel')
      || document.getElementById('scratch-view');

    let flowPane = document.getElementById('flowchart-canvas')
      || document.getElementById('flowchart-view')
      || document.getElementById('flowchart-panel')
      || document.getElementById('flowchart-output');

    let rightCol = null;
    if (scBtn) {
      const tabBar = scBtn.parentElement;
      rightCol = tabBar?.parentElement;
      if (rightCol) {
        const siblings = [...rightCol.children].filter((el) => el !== tabBar && el.id !== 'ide-diagnostics-panel' && el.tagName !== 'STYLE');
        if (!scratchPane && siblings[0]) scratchPane = siblings[0];
        if (!flowPane) flowPane = siblings.find((el) => /flow|chart/i.test(el.id + ' ' + el.className)) || siblings[2] || siblings[0];
      }
    }
    return { scratchPane, flowPane, scBtn, fcBtn, rightCol };
  }

  function syncAll(codeArg, runtimeError) {
    const ed = document.getElementById('code-editor');
    const code = codeArg !== undefined ? codeArg : (ed ? ed.value : '');
    const { scratchPane, flowPane, fcBtn, rightCol } = findRightPanes();

    ensureDiagnosticsPanel(rightCol);
    renderDiagnostics(code, runtimeError);

    if (scratchPane && flowPane && scratchPane === flowPane) {
      const isFlow = fcBtn && (fcBtn.classList.contains('active') || fcBtn.getAttribute('aria-selected') === 'true');
      scratchPane.innerHTML = isFlow ? renderFlowchartSVG(code) : renderScratchHTML(code);
    } else {
      if (scratchPane) scratchPane.innerHTML = renderScratchHTML(code);
      if (flowPane) flowPane.innerHTML = renderFlowchartSVG(code);
    }
  }

  const API = {
    parseLine, buildTree, renderScratchHTML, renderFlowchartSVG, analyzePythonCode, renderDiagnostics, syncAll,
    render(code, targetEl) {
      if (targetEl) {
        const el = typeof targetEl === 'string' ? document.getElementById(targetEl) : targetEl;
        if (el) el.innerHTML = renderScratchHTML(code);
      } else syncAll(code);
    },
    renderFlowchart(code, targetEl) {
      const el = typeof targetEl === 'string' ? document.getElementById(targetEl) : (targetEl || findRightPanes().flowPane);
      if (el) el.innerHTML = renderFlowchartSVG(code);
    }
  };

  window.VCodeScratchBridge = API;
  window.ScratchBridge = API;
  window.VCodeScratch = API;
  window.renderScratchFromPython = (c, t) => API.render(c, t);
  window.renderScratchLive = (c, t) => API.render(c, t);
  window.updateScratchLive = (c, t) => API.render(c, t);
  window.updateScratchBlocks = (c, t) => API.render(c, t);
  window.renderFlowchart = (c, t) => API.renderFlowchart(c, t);
  window.syncScratchAndFlowchart = (c) => API.syncAll(c);

  window.addEventListener('DOMContentLoaded', () => {
    const ed = document.getElementById('code-editor');
    if (ed) {
      const trigger = () => API.syncAll(ed.value);
      ed.addEventListener('input', trigger);
      ed.addEventListener('keyup', trigger);
      ed.addEventListener('change', trigger);
      setTimeout(trigger, 120);
      setTimeout(trigger, 550);
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const txt = (btn.textContent || '').trim();
      if (txt.startsWith('+') || /Scratch Live|Sơ đồ khối|IDE & Scratch/i.test(txt)) {
        setTimeout(() => API.syncAll(), 50);
      }
    });
  });
})();
"""

V19_POLISH_JS = r"""// V-CODE EDU — POLISH LAYER (HOME DEFAULT, EDITOR-ONLY LIGHT, OLM BLUE-WHITE, DD/MM/YYYY + TIME, GOOGLE CENTER)
(function () {
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function formatDateTimeVN(ts) {
    if (!ts) return 'Không giới hạn';
    const d = new Date(Number(ts));
    if (isNaN(d.getTime())) return String(ts);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(d.getHours())}:${pad(d.getMinutes())} • ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  function getDeadlineStatus(asg) {
    const ts = Number(asg?.deadline_ts || 0);
    if (!ts) return { expired: false, label: 'Đang mở', cls: 'open' };
    const diff = ts - Date.now();
    if (diff <= 0) return { expired: true, label: `Quá hạn • Đã khóa (${formatDateTimeVN(ts)})`, cls: 'expired' };
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const rem = days > 0 ? `Còn ${days} ngày ${hrs} giờ` : (hrs > 0 ? `Còn ${hrs} giờ ${mins} phút` : `Còn ${Math.max(1, mins)} phút`);
    return { expired: false, label: `Đang mở • ${rem} (Hạn: ${formatDateTimeVN(ts)})`, cls: 'open' };
  }

  function enforceHomeOnInitialLoad() {
    try {
      localStorage.removeItem('vcode_active_view');
      localStorage.removeItem('vcode_last_view');
    } catch {}
    const hash = (window.location.hash || '').replace('#', '').trim();
    if (hash && ['learning', 'workspace', 'classroom', 'challenges'].includes(hash)) return;
    if (typeof window.switchView === 'function') {
      window.switchView('home');
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
  }

  const GOOGLE_SVG = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" style="flex-shrink:0"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

  function polishHeaderAndAuthModal() {
    document.querySelectorAll('header span, nav span, .brand span, .version-badge, .ver-badge').forEach((el) => {
      if (/^v\d+(\.\d+)*$/i.test((el.textContent || '').trim())) el.remove();
    });

    document.querySelectorAll('#auth-modal p, .auth-modal p, .auth-subtitle').forEach((p) => {
      if (/Facebook|GitHub/i.test(p.textContent || '')) {
        p.textContent = 'Đăng nhập bằng tài khoản Google hoặc Email của bạn';
      }
    });

    document.querySelectorAll('button[onclick*="handleRealSocialLogin"]').forEach((btn) => {
      const oc = btn.getAttribute('onclick') || '';
      if (/facebook|github/i.test(oc)) { btn.remove(); return; }
      btn.classList.add('v19-google-btn-centered');
      btn.innerHTML = `${GOOGLE_SVG}<span>Tiếp tục với Google</span>`;
      if (btn.parentElement) btn.parentElement.classList.add('v19-social-center-wrap');
    });
  }

  const origRunInteractive = window.runPythonWithInteractiveInput;
  if (typeof origRunInteractive === 'function') {
    window.runPythonWithInteractiveInput = async function (editorId, stdinId, outputId) {
      const res = await origRunInteractive(editorId, stdinId, outputId);
      const code = document.getElementById(editorId)?.value || '';
      if (window.VCodeScratchBridge?.renderDiagnostics) {
        window.VCodeScratchBridge.renderDiagnostics(code, res && !res.ok ? res.error : null);
      }
      return res;
    };
  }

  function rebuildAssignmentModal() {
    const modal = document.getElementById('create-assignment-modal');
    if (!modal) return;
    const box = modal.querySelector('.modal-box') || modal.firstElementChild;
    if (!box) return;

    const tomorrow = new Date(Date.now() + 86400000);
    const pad = (n) => String(n).padStart(2, '0');
    const defaultDDMMYYYY = `${pad(tomorrow.getDate())}/${pad(tomorrow.getMonth() + 1)}/${tomorrow.getFullYear()}`;

    box.classList.add('v19-assign-modal-box');
    box.innerHTML = `
      <div class="v19-modal-head">
        <h3 style="margin:0;font-size:18px;font-weight:800">Giao bài tập mới <span id="v19-assign-cls-code" style="color:#2563EB"></span></h3>
        <button type="button" class="v19-close-x" onclick="document.getElementById('create-assignment-modal').classList.remove('open')">&times;</button>
      </div>
      <form id="v19-assign-form" class="v19-assign-form">
        <div class="v19-field">
          <label>Tên bài tập *</label>
          <input type="text" id="assign-title" class="v19-input" placeholder="Ví dụ: Bài 1 — Kiểm tra số chẵn lẻ" required />
        </div>

        <div class="v19-field">
          <label>Đề bài *</label>
          <textarea id="assign-desc" class="v19-textarea-square" rows="6" placeholder="Nhập đầy đủ yêu cầu đề bài, dữ liệu vào/ra và ví dụ minh họa..." required></textarea>
        </div>

        <div class="v19-grid-3">
          <div class="v19-field">
            <label>Mức độ</label>
            <select id="assign-lang" class="v19-input">
              <option value="Cơ bản">Cơ bản</option>
              <option value="Khá">Khá</option>
              <option value="Nâng cao">Nâng cao</option>
              <option value="Luyện thi HSG">Luyện thi HSG</option>
            </select>
          </div>
          <div class="v19-field">
            <label>Ngày hết hạn (DD/MM/YYYY) *</label>
            <div class="v19-date-wrap">
              <input type="text" id="assign-date-vn" class="v19-input" value="${defaultDDMMYYYY}" placeholder="DD/MM/YYYY" maxlength="10" required />
              <input type="date" id="assign-date-picker" class="v19-date-native" title="Chọn ngày từ lịch" />
            </div>
          </div>
          <div class="v19-field">
            <label>Giờ hết hạn (HH:MM) *</label>
            <input type="time" id="assign-time-vn" class="v19-input" value="23:59" required />
          </div>
        </div>

        <div class="v19-grid-2">
          <div class="v19-field">
            <label>Test Input *</label>
            <input type="text" id="assign-tc-in" class="v19-input mono" value="6" placeholder="Ví dụ: 6" />
          </div>
          <div class="v19-field">
            <label>Expected Output *</label>
            <input type="text" id="assign-tc-out" class="v19-input mono" value="12" placeholder="Ví dụ: 12" />
          </div>
        </div>

        <div class="v19-field">
          <label>Khung code ban đầu</label>
          <textarea id="assign-starter" class="v19-input mono" rows="3"># Học sinh tự viết mã nguồn bên dưới\n</textarea>
        </div>

        <div class="v19-modal-foot">
          <button type="button" class="v19-btn-cancel" onclick="document.getElementById('create-assignment-modal').classList.remove('open')">Hủy</button>
          <button type="submit" class="v19-btn-submit">Giao bài ngay</button>
        </div>
      </form>
    `;

    const txtDate = document.getElementById('assign-date-vn');
    const picker = document.getElementById('assign-date-picker');
    if (picker && txtDate) {
      picker.value = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
      picker.addEventListener('change', () => {
        if (!picker.value) return;
        const [y, m, d] = picker.value.split('-');
        txtDate.value = `${d}/${m}/${y}`;
      });
    }

    window.openCreateAssignmentModal = function () {
      const code = window.AppState?.activeClassroomCode || '';
      const span = document.getElementById('v19-assign-cls-code');
      if (span) span.textContent = code ? `• Lớp ${code}` : '';
      modal.classList.add('open');
    };

    document.getElementById('v19-assign-form').onsubmit = async (e) => {
      e.preventDefault();
      const code = window.AppState?.activeClassroomCode;
      const u = window.AppState?.user;
      if (!code) { alert('Bạn cần chọn hoặc tạo một lớp học trước khi giao bài.'); return; }

      const title = document.getElementById('assign-title').value.trim();
      const desc = document.getElementById('assign-desc').value.trim();
      const level = document.getElementById('assign-lang').value || 'Cơ bản';
      const dateStr = document.getElementById('assign-date-vn').value.trim();
      const timeStr = document.getElementById('assign-time-vn').value.trim() || '23:59';
      const tcIn = document.getElementById('assign-tc-in').value.trim();
      const tcOut = document.getElementById('assign-tc-out').value.trim();
      const starter = document.getElementById('assign-starter').value || '# Học sinh tự viết mã nguồn bên dưới\n';

      const dm = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
      if (!dm) { alert('Ngày hết hạn phải theo định dạng DD/MM/YYYY (ví dụ: 25/11/2026).'); return; }
      const [hh, mm] = timeStr.split(':').map((x) => parseInt(x, 10) || 0);
      const deadlineDate = new Date(Number(dm[3]), Number(dm[2]) - 1, Number(dm[1]), hh, mm, 0);
      if (isNaN(deadlineDate.getTime())) { alert('Ngày hoặc giờ không hợp lệ.'); return; }

      const asg = {
        id: 'asg_' + Date.now(),
        code: 'BT' + Math.floor(100 + Math.random() * 900),
        classroom_code: code,
        title,
        description: desc,
        language: level,
        deadline_ts: deadlineDate.getTime(),
        due_date: formatDateTimeVN(deadlineDate.getTime()),
        starter_code: starter,
        teacher_name: u?.full_name || 'Giáo viên',
        test_cases: tcOut ? [{ input: tcIn, expected: tcOut }] : [{ input: '6', expected: '12' }],
        created_at: Date.now()
      };

      let saved = false;
      if (window.VCodeCloudDB?.isReady()) {
        try { await window.VCodeCloudDB.addAssignment(code, asg); saved = true; } catch (err) { console.error(err); }
      }
      if (!saved && window.LocalClassDB) {
        const ldb = window.LocalClassDB.load();
        const cls = ldb.classes.find((c) => c.code === code);
        if (cls) { cls.assignments = cls.assignments || []; cls.assignments.unshift(asg); window.LocalClassDB.save(ldb); saved = true; }
      }

      if (saved) {
        modal.classList.remove('open');
        document.getElementById('assign-title').value = '';
        document.getElementById('assign-desc').value = '';
        if (typeof showToast === 'function') showToast(`Đã giao bài "${title}" vào lớp ${code}`);
        v19ClassTab = 'assignments';
        await window.renderV19Classroom();
      } else {
        alert('Không thể lưu bài tập. Vui lòng kiểm tra kết nối mạng.');
      }
    };
  }

  let v19ClassTab = 'assignments';
  let v19AsgFilter = 'all';

  window.setV19ClassTab = function (tab) { v19ClassTab = tab; window.renderV19Classroom(); };
  window.setV19AsgFilter = function (flt) { v19AsgFilter = flt; window.renderV19Classroom(); };
  window.toggleV19ClassDropdown = function () { document.getElementById('v19-class-dropdown')?.classList.toggle('open'); };
  window.copyV19ClassCode = function (code) {
    navigator.clipboard?.writeText(code).catch(() => {});
    if (typeof showToast === 'function') showToast(`Đã sao chép mã lớp: ${code}`);
  };

  window.renderV19Classroom = async function () {
    const view = document.getElementById('view-classroom');
    if (!view) return;
    const u = window.AppState?.user;

    let shell = document.getElementById('v19-olm-shell');
    if (!u || !u.role || u.role === 'none') {
      if (shell) shell.style.display = 'none';
      [...view.children].forEach((ch) => { if (ch.id !== 'v19-olm-shell') ch.style.display = ''; });
      return;
    }

    [...view.children].forEach((ch) => { if (ch.id !== 'v19-olm-shell') ch.style.display = 'none'; });

    if (!shell) {
      shell = document.createElement('div');
      shell.id = 'v19-olm-shell';
      shell.className = 'v19-olm-shell';
      view.appendChild(shell);
    }
    shell.style.display = 'block';

    const isTeacher = u.role === 'teacher' || u.role === 'admin';
    let classes = window.AppState.olmClasses || [];

    if (window.VCodeCloudDB?.isReady() && u.email) {
      try {
        const fetched = isTeacher
          ? await window.VCodeCloudDB.listTeacherClasses(u.email)
          : await window.VCodeCloudDB.listStudentClasses(u.email);
        if (Array.isArray(fetched)) {
          classes = fetched;
          window.AppState.olmClasses = classes;
        }
      } catch {}
    }

    let activeCode = window.AppState.activeClassroomCode;
    if (!activeCode || !classes.some((c) => c.code === activeCode)) {
      activeCode = classes[0]?.code || '';
      window.AppState.activeClassroomCode = activeCode;
    }

    let cls = classes.find((c) => c.code === activeCode) || null;
    if (cls && window.VCodeCloudDB?.isReady()) {
      try {
        const fresh = await window.VCodeCloudDB.getClass(cls.code);
        if (fresh) {
          cls = fresh;
          const idx = classes.findIndex((c) => c.code === cls.code);
          if (idx >= 0) classes[idx] = cls;
        }
      } catch {}
    }

    const students = cls?.students || [];
    const assignments = cls?.assignments || [];
    const submissions = cls?.submissions || [];

    let tabBodyHTML = '';
    if (!cls) {
      tabBodyHTML = `
        <div class="v19-olm-empty-state">
          <h3>${isTeacher ? 'Bạn chưa tạo lớp học nào' : 'Bạn chưa tham gia lớp học nào'}</h3>
          <p>${isTeacher ? 'Bấm nút <strong>+ Tạo lớp mới</strong> để bắt đầu quản lý lớp và giao bài tập.' : 'Nhập mã lớp do thầy/cô cung cấp để tham gia lớp học.'}</p>
          ${isTeacher
            ? `<button type="button" class="v19-btn-primary" onclick="document.getElementById('create-class-modal').classList.add('open')">+ Tạo lớp học đầu tiên</button>`
            : `<button type="button" class="v19-btn-primary" onclick="document.getElementById('join-class-modal')?.classList.add('open')">Nhập mã tham gia lớp</button>`}
        </div>`;
    } else if (v19ClassTab === 'assignments') {
      const filtered = assignments.filter((a) => {
        const st = getDeadlineStatus(a);
        if (v19AsgFilter === 'open') return !st.expired;
        if (v19AsgFilter === 'expired') return st.expired;
        return true;
      });

      const listHTML = filtered.length ? filtered.map((a) => {
        const st = getDeadlineStatus(a);
        const asgSubs = submissions.filter((s) => s.assignment_code === a.code || s.assignment_id === a.id);
        const subEmails = new Set(asgSubs.map((s) => (s.email || s.username || '').toLowerCase()));
        const totalStu = students.length;
        const doneCount = students.length ? students.filter((s) => subEmails.has((s.email || s.username || '').toLowerCase())).length : asgSubs.length;
        const pendingCount = Math.max(0, totalStu - doneCount);
        const avgScore = asgSubs.length ? Math.round(asgSubs.reduce((acc, s) => acc + Number(s.teacher_score ?? s.score ?? 0), 0) / asgSubs.length) : 0;
        const mySub = asgSubs.find((s) => (s.email || '').toLowerCase() === (u.email || '').toLowerCase() || s.username === u.username);

        return `
          <div class="v19-asg-row ${st.cls}">
            <div class="v19-asg-main">
              <div class="v19-asg-meta">
                <span class="v19-pill-blue">${esc(a.language || 'Cơ bản')}</span>
                <span class="v19-pill-status ${st.cls}">${esc(st.label)}</span>
              </div>
              <h4 class="v19-asg-title">${esc(a.title)}</h4>
              <p class="v19-asg-desc">${esc(a.description)}</p>
              <div class="v19-asg-stats">
                <span>Sĩ số: <strong>${totalStu}</strong></span>
                <span class="c-green">Đã nộp: <strong>${doneCount}</strong></span>
                <span class="${st.expired ? 'c-red' : 'c-amber'}">${st.expired ? 'Quá hạn chưa nộp' : 'Chưa làm'}: <strong>${pendingCount}</strong></span>
                <span>Điểm TB: <strong>${asgSubs.length ? avgScore + '/100' : '—'}</strong></span>
              </div>
            </div>
            <div class="v19-asg-btns">
              ${isTeacher ? `
                <button type="button" class="v19-btn-primary" onclick="openV18AssignmentReport('${esc(a.id || a.code)}')">Danh sách &amp; Chấm bài (${doneCount}/${totalStu})</button>
                <button type="button" class="v19-btn-danger-outline" onclick="deleteV19Assignment('${esc(a.id || a.code)}')">Xóa</button>
              ` : (
                mySub
                  ? `<button type="button" class="v19-btn-outline" onclick="openV18StudentSolve('${esc(a.id || a.code)}', true)">Đã nộp • ${mySub.teacher_score ?? mySub.score ?? 0}/100</button>`
                  : (st.expired
                      ? `<button type="button" class="v19-btn-disabled" disabled>Quá hạn • Đã khóa</button>`
                      : `<button type="button" class="v19-btn-primary" onclick="openV18StudentSolve('${esc(a.id || a.code)}', false)">Làm bài ngay</button>`)
              )}
            </div>
          </div>`;
      }).join('') : `<div class="v19-olm-empty-box">Chưa có bài tập nào trong mục này.${isTeacher ? ' Bấm nút <strong>+ Giao bài tập</strong> để giao bài mới.' : ''}</div>`;

      tabBodyHTML = `
        <div class="v19-subfilter-bar">
          <button type="button" class="v19-chip ${v19AsgFilter === 'all' ? 'active' : ''}" onclick="setV19AsgFilter('all')">Tất cả (${assignments.length})</button>
          <button type="button" class="v19-chip ${v19AsgFilter === 'open' ? 'active' : ''}" onclick="setV19AsgFilter('open')">Đang mở</button>
          <button type="button" class="v19-chip ${v19AsgFilter === 'expired' ? 'active' : ''}" onclick="setV19AsgFilter('expired')">Đã hết hạn</button>
        </div>
        ${listHTML}`;
    } else if (v19ClassTab === 'members') {
      tabBodyHTML = students.length ? `
        <div class="v19-table-wrap">
          <table class="v19-table">
            <thead>
              <tr><th style="width:64px">STT</th><th>Họ và tên</th><th>Email</th><th>Ngày tham gia</th><th style="width:120px">Điểm XP</th></tr>
            </thead>
            <tbody>
              ${students.map((s, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td><strong>${esc(s.full_name || s.username)}</strong></td>
                  <td class="muted">${esc(s.email || '—')}</td>
                  <td class="muted">${s.joined_at ? formatDateTimeVN(s.joined_at) : '—'}</td>
                  <td><span class="v19-xp-tag">${s.xp || 100} XP</span></td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>` : `<div class="v19-olm-empty-box">Chưa có học sinh nào tham gia lớp <strong>${esc(cls.name)}</strong>. Gửi mã lớp <strong>${esc(cls.code)}</strong> cho học sinh vào lớp.</div>`;
    } else if (v19ClassTab === 'realtime') {
      const activeMap = cls.live_sessions || {};
      const now = Date.now();
      tabBodyHTML = `
        <div class="v19-info-strip">Theo dõi trực tuyến hiển thị trạng thái hiện tại của học sinh: <strong>Đang làm bài</strong> hoặc <strong>Đang tắt (Off)</strong>. Bài đã nộp được quản lý và chấm điểm trong tab <strong>Bài tập</strong>.</div>
        ${students.length ? `
          <div class="v19-table-wrap">
            <table class="v19-table">
              <thead>
                <tr><th style="width:64px">STT</th><th>Học sinh</th><th>Email</th><th>Trạng thái</th><th>Hoạt động</th></tr>
              </thead>
              <tbody>
                ${students.map((s, i) => {
                  const key = (s.email || s.username || '').toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
                  const sess = activeMap[key];
                  const isWorking = Boolean(sess && (now - Number(sess.updated_at || 0)) < 90000);
                  return `
                    <tr>
                      <td>${i + 1}</td>
                      <td><strong>${esc(s.full_name || s.username)}</strong></td>
                      <td class="muted">${esc(s.email || '—')}</td>
                      <td><span class="v19-rt-pill ${isWorking ? 'on' : 'off'}"><i></i>${isWorking ? 'Đang làm bài' : 'Đang tắt (Off)'}</span></td>
                      <td class="muted">${isWorking ? esc(sess.task_title || 'Đang mở bài tập') : '—'}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>` : `<div class="v19-olm-empty-box">Chưa có học sinh nào trong lớp để theo dõi trực tuyến.</div>`}`;
    }

    shell.innerHTML = `
      <div class="v19-olm-topbar">
        <div class="v19-olm-top-left">
          <div class="v19-class-menu-box">
            <button type="button" class="v19-hamburger-btn" onclick="toggleV19ClassDropdown()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              <span>Lớp${cls ? ': ' + esc(cls.name) : ''}</span>
              <span class="v19-badge-count">${classes.length}</span>
            </button>
            <div id="v19-class-dropdown" class="v19-class-dropdown">
              <div class="v19-cd-top">
                <span>Danh sách lớp học (${classes.length})</span>
                ${isTeacher ? `<button type="button" class="v19-btn-mini" onclick="toggleV19ClassDropdown();document.getElementById('create-class-modal').classList.add('open')">+ Tạo lớp</button>` : ''}
              </div>
              <div class="v19-cd-items">
                ${classes.length ? classes.map((c) => `
                  <div class="v19-cd-row ${c.code === activeCode ? 'active' : ''}">
                    <div class="v19-cd-click" onclick="toggleV19ClassDropdown();selectV19Class('${esc(c.code)}')">
                      <strong>${esc(c.name)}</strong>
                      <small>Mã: ${esc(c.code)} • ${(c.students || []).length} học sinh</small>
                    </div>
                    ${isTeacher ? `
                      <div class="v19-cd-btns">
                        <button type="button" onclick="toggleV19ClassDropdown();renameClassAction('${esc(c.code)}','${esc(c.name).replace(/'/g, '')}')">Sửa</button>
                        <button type="button" class="del" onclick="toggleV19ClassDropdown();deleteClassAction('${esc(c.code)}')">Xóa</button>
                      </div>` : ''}
                  </div>`).join('') : `<div style="padding:14px;text-align:center;font-size:13px;color:#64748B">Chưa có lớp học nào.</div>`}
              </div>
            </div>
          </div>
        </div>

        <div class="v19-olm-top-right">
          ${isTeacher ? `
            <button type="button" class="v19-btn-outline" onclick="document.getElementById('create-class-modal').classList.add('open')">+ Tạo lớp mới</button>
            <button type="button" class="v19-btn-primary" onclick="openCreateAssignmentModal()">+ Giao bài tập</button>
          ` : `
            <button type="button" class="v19-btn-primary" onclick="document.getElementById('join-class-modal')?.classList.add('open')">+ Tham gia lớp bằng mã</button>
          `}
        </div>
      </div>

      ${cls ? `
        <div class="v19-olm-banner">
          <div class="v19-banner-left">
            <span class="v19-banner-kicker">LỚP HỌC TRỰC TUYẾN</span>
            <h2>${esc(cls.name)}</h2>
            <div class="v19-banner-meta">
              <span>Giáo viên: <strong>${esc(cls.teacher_name || 'Giáo viên')}</strong></span>
              <span>•</span>
              <span>Sĩ số: <strong>${students.length}</strong> học sinh</span>
              <span>•</span>
              <span>Bài tập: <strong>${assignments.length}</strong></span>
            </div>
          </div>
          <div class="v19-banner-right">
            <div class="v19-code-box">
              <small>Mã tham gia lớp</small>
              <strong>${esc(cls.code)}</strong>
            </div>
            <button type="button" class="v19-btn-white" onclick="copyV19ClassCode('${esc(cls.code)}')">Sao chép mã</button>
          </div>
        </div>

        <div class="v19-olm-card">
          <div class="v19-olm-tabs">
            <button type="button" class="v19-tab ${v19ClassTab === 'assignments' ? 'active' : ''}" onclick="setV19ClassTab('assignments')">Bài tập (${assignments.length})</button>
            <button type="button" class="v19-tab ${v19ClassTab === 'members' ? 'active' : ''}" onclick="setV19ClassTab('members')">Thành viên (${students.length})</button>
            <button type="button" class="v19-tab ${v19ClassTab === 'realtime' ? 'active' : ''}" onclick="setV19ClassTab('realtime')">Học trực tuyến (Real-time)</button>
          </div>
          <div class="v19-olm-body">
            ${tabBodyHTML}
          </div>
        </div>
      ` : tabBodyHTML}
    `;
  };

  window.selectV19Class = async function (code) { window.AppState.activeClassroomCode = code; await window.renderV19Classroom(); };
  window.deleteV19Assignment = async function (asgId) {
    const code = window.AppState?.activeClassroomCode;
    if (!code || !confirm('Bạn có chắc muốn xóa bài tập này?')) return;
    if (window.VCodeCloudDB?.isReady()) await window.VCodeCloudDB.deleteAssignment(code, asgId);
    await window.renderV19Classroom();
  };
  window.renderV18ClassroomState = window.renderV19Classroom;

  window.addEventListener('DOMContentLoaded', () => {
    polishHeaderAndAuthModal();
    rebuildAssignmentModal();

    setTimeout(enforceHomeOnInitialLoad, 40);
    setTimeout(enforceHomeOnInitialLoad, 240);

    document.addEventListener('click', (e) => {
      const box = document.querySelector('.v19-class-menu-box');
      const dd = document.getElementById('v19-class-dropdown');
      if (dd && dd.classList.contains('open') && box && !box.contains(e.target)) dd.classList.remove('open');
    });

    const origSwitch = window.switchView;
    if (typeof origSwitch === 'function') {
      window.switchView = function (viewName) {
        origSwitch(viewName);
        if (viewName === 'classroom') setTimeout(() => window.renderV19Classroom(), 50);
      };
    }

    const origInitCls = window.initClassroomPortalData;
    if (typeof origInitCls === 'function') {
      window.initClassroomPortalData = async function () {
        await origInitCls();
        await window.renderV19Classroom();
      };
    }
  });
})();
"""

V19_CSS = """
/* ==================== V19.0: SLEEK SCRATCH, IDE DIAGNOSTICS, EDITOR-ONLY LIGHT, OLM BLUE-WHITE ==================== */
.version-badge, .ver-badge, .brand-version { display: none !important; }

/* Căn giữa nút Đăng nhập Google */
.v19-social-center-wrap {
  display: flex !important; justify-content: center !important; align-items: center !important;
  width: 100% !important; grid-template-columns: 1fr !important;
}
.v19-google-btn-centered {
  display: inline-flex !important; align-items: center !important; justify-content: center !important;
  gap: 10px !important; width: 100% !important; max-width: 320px !important; margin: 0 auto !important;
  padding: 11px 18px !important; border-radius: 10px !important;
  background: #FFFFFF !important; color: #1E293B !important; border: 1.5px solid #CBD5E1 !important;
  font-weight: 700 !important; font-size: 14px !important; cursor: pointer;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06);
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.15s;
}
.v19-google-btn-centered:hover { border-color: #2563EB !important; box-shadow: 0 6px 16px rgba(37, 99, 235, 0.12); transform: translateY(-1px); }

/* Bật "Sáng IDE" CHỈ sáng khung gõ code bên trái — giữ khung kết quả bên phải luôn dịu mắt */
.v19-keep-dark-panel,
.v19-keep-dark-panel > div,
.v19-keep-dark-panel #scratch-canvas,
.v19-keep-dark-panel #scratch-blocks-view,
.v19-keep-dark-panel #console-output,
.v19-keep-dark-panel #flowchart-canvas {
  background-color: #0B1221 !important;
  color: #E2E8F0 !important;
  border-color: rgba(148, 163, 184, 0.2) !important;
}
.v19-keep-dark-panel button { color: #CBD5E1 !important; }

/* Giao diện Scratch 3.0 thanh mảnh, sắc nét như cũ */
.sc-sleek-stage {
  padding: 16px 18px; min-height: 240px; border-radius: 12px;
  background-color: #0B1221;
  background-image: radial-gradient(rgba(148, 163, 184, 0.14) 1px, transparent 1px);
  background-size: 18px 18px;
  display: flex; flex-direction: column; gap: 7px;
}
.sc-sleek-hat {
  display: inline-flex; align-items: center; gap: 8px; width: fit-content;
  background: linear-gradient(90deg, #F59E0B, #FBBF24);
  color: #1E293B; font-weight: 800; font-size: 12.5px;
  padding: 8px 16px; border-radius: 16px 16px 6px 6px;
  box-shadow: 0 3px 10px rgba(245, 158, 11, 0.25); margin-bottom: 4px;
}
.sc-sleek-group { display: flex; flex-direction: column; gap: 6px; }
.sc-sleek-branch {
  margin-left: 14px; padding-left: 14px; border-left: 3px solid #F59E0B;
  display: flex; flex-direction: column; gap: 6px;
}
.sc-branch-loop { border-left-color: #EA580C; }
.sc-branch-func { border-left-color: #DB2777; }
.sc-sleek-pill {
  display: inline-flex; align-items: center; flex-wrap: wrap; gap: 6px;
  width: fit-content; max-width: 100%; padding: 7px 14px; border-radius: 9px;
  font-size: 12.5px; font-weight: 700; color: #FFFFFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}
.sc-sleek-sensing { background: #38BDF8; color: #082F49; }
.sc-sleek-data { background: #F97316; }
.sc-sleek-loop { background: #F59E0B; color: #1E293B; }
.sc-sleek-control { background: #D97706; }
.sc-sleek-looks { background: #8B5CF6; }
.sc-sleek-func { background: #EC4899; }
.sc-sleek-stmt { background: #334155; }
.sc-pill { display: inline-flex; align-items: center; padding: 2px 9px; border-radius: 999px; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; font-weight: 700; }
.sc-pill-white { background: #FFFFFF; color: #0F172A; }
.sc-pill-cond { background: #10B981; color: #FFFFFF; }
.sc-sleek-empty { color: #94A3B8; font-size: 13px; padding: 14px; border: 1px dashed rgba(148, 163, 184, 0.25); border-radius: 10px; }

/* Bảng Kiểm tra lỗi mã nguồn ngay dưới khung Scratch/Console */
.ide-diag-panel {
  margin-top: 12px; border-radius: 12px; background: #0B1221 !important;
  border: 1px solid rgba(148, 163, 184, 0.22); overflow: hidden; color: #E2E8F0 !important;
}
.ide-diag-header {
  display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;
  padding: 9px 14px; background: rgba(15, 23, 42, 0.95); border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}
.ide-diag-title { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 700; color: #F8FAFC; }
.ide-diag-sub { font-size: 11px; color: #64748B; }
.ide-diag-badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }
.ide-diag-badge.ok { background: rgba(16, 185, 129, 0.16); color: #34D399; }
.ide-diag-badge.warn { background: rgba(245, 158, 11, 0.18); color: #FBBF24; }
.ide-diag-badge.err { background: rgba(244, 63, 94, 0.2); color: #FB7185; }
.ide-diag-list { max-height: 195px; overflow-y: auto; padding: 8px 10px; display: flex; flex-direction: column; gap: 6px; }
.ide-diag-clean { font-size: 12.5px; color: #34D399; padding: 6px 4px; }
.ide-diag-item {
  display: flex; align-items: flex-start; gap: 10px; padding: 8px 10px;
  border-radius: 8px; cursor: pointer; transition: background 0.15s;
  background: rgba(255, 255, 255, 0.03); border-left: 3px solid #F59E0B;
}
.ide-diag-item.error { border-left-color: #F43F5E; background: rgba(244, 63, 94, 0.08); }
.ide-diag-item:hover { background: rgba(56, 189, 248, 0.12); }
.ide-diag-line { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: rgba(148, 163, 184, 0.16); color: #E2E8F0; white-space: nowrap; }
.ide-diag-body { display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.ide-diag-body strong { color: #F8FAFC; }
.ide-diag-body span { color: #94A3B8; line-height: 1.45; }

/* Lớp học OLM xanh - trắng chuẩn chuyên nghiệp */
#view-classroom.active {
  background: #F1F5F9 !important; color: #0F172A !important;
  min-height: calc(100vh - 64px); padding: 20px clamp(14px, 3vw, 36px) 56px !important;
}
.v19-olm-shell { width: 100%; max-width: 1360px; margin: 0 auto; color: #0F172A; }
.v19-olm-topbar { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
.v19-olm-top-right { display: flex; gap: 10px; flex-wrap: wrap; }

.v19-class-menu-box { position: relative; }
.v19-hamburger-btn { display: inline-flex; align-items: center; gap: 9px; padding: 9px 15px; border-radius: 10px; cursor: pointer; background: #FFFFFF; color: #0F172A; border: 1.5px solid #CBD5E1; font-weight: 700; font-size: 14px; box-shadow: 0 2px 6px rgba(15,23,42,0.05); }
.v19-hamburger-btn:hover { border-color: #2563EB; color: #2563EB; }
.v19-badge-count { background: #DBEAFE; color: #1D4ED8; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; padding: 2px 8px; border-radius: 999px; }
.v19-class-dropdown { display: none; position: absolute; top: calc(100% + 8px); left: 0; z-index: 80; width: 330px; max-width: calc(100vw - 28px); background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.16); overflow: hidden; }
.v19-class-dropdown.open { display: block; }
.v19-cd-top { display: flex; justify-content: space-between; align-items: center; padding: 11px 14px; background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 12.5px; font-weight: 700; color: #334155; }
.v19-btn-mini { background: #2563EB; color: #FFF; border: none; border-radius: 6px; padding: 4px 10px; font-size: 11.5px; font-weight: 700; cursor: pointer; }
.v19-cd-items { max-height: 290px; overflow-y: auto; padding: 6px; }
.v19-cd-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 9px 10px; border-radius: 8px; cursor: pointer; }
.v19-cd-row:hover { background: #F1F5F9; }
.v19-cd-row.active { background: #EFF6FF; border: 1px solid #BFDBFE; }
.v19-cd-click { flex: 1; }
.v19-cd-click strong { display: block; font-size: 13.5px; color: #0F172A; }
.v19-cd-click small { font-size: 11.5px; color: #64748B; }
.v19-cd-btns { display: flex; gap: 4px; }
.v19-cd-btns button { background: #FFFFFF; border: 1px solid #CBD5E1; color: #334155; padding: 3px 8px; border-radius: 6px; font-size: 11.5px; font-weight: 600; cursor: pointer; }
.v19-cd-btns button.del { color: #DC2626; border-color: #FECACA; }

.v19-olm-banner {
  display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap;
  padding: 22px 26px; border-radius: 16px; margin-bottom: 18px;
  background: linear-gradient(120deg, #1D4ED8 0%, #2563EB 55%, #0EA5E9 100%);
  color: #FFFFFF; box-shadow: 0 12px 28px rgba(37, 99, 235, 0.22);
}
.v19-banner-kicker { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.1em; opacity: 0.85; font-weight: 700; }
.v19-olm-banner h2 { margin: 4px 0 8px; font-size: 24px; font-weight: 800; color: #FFFFFF; }
.v19-banner-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 13.5px; opacity: 0.95; }
.v19-banner-right { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.v19-code-box { background: rgba(255, 255, 255, 0.16); border: 1px solid rgba(255, 255, 255, 0.3); padding: 8px 14px; border-radius: 10px; text-align: center; }
.v19-code-box small { display: block; font-size: 10.5px; opacity: 0.88; }
.v19-code-box strong { font-family: 'JetBrains Mono', monospace; font-size: 17px; letter-spacing: 0.06em; }
.v19-btn-white { background: #FFFFFF; color: #1D4ED8; border: none; padding: 10px 16px; border-radius: 10px; font-weight: 700; font-size: 13px; cursor: pointer; }
.v19-btn-white:hover { background: #EFF6FF; }

.v19-olm-card { background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 16px; box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05); overflow: hidden; }
.v19-olm-tabs { display: flex; gap: 4px; padding: 0 20px; border-bottom: 1px solid #E2E8F0; background: #F8FAFC; overflow-x: auto; }
.v19-tab { padding: 14px 18px; border: none; background: transparent; cursor: pointer; font-size: 14px; font-weight: 700; color: #64748B; white-space: nowrap; border-bottom: 3px solid transparent; }
.v19-tab:hover { color: #2563EB; }
.v19-tab.active { color: #1D4ED8; border-bottom-color: #2563EB; background: #FFFFFF; }
.v19-olm-body { padding: 20px 22px; }

.v19-subfilter-bar { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px; }
.v19-chip { padding: 6px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 700; background: #F1F5F9; color: #475569; border: 1px solid #E2E8F0; cursor: pointer; }
.v19-chip.active { background: #EFF6FF; color: #1D4ED8; border-color: #93C5FD; }

.v19-asg-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 18px; flex-wrap: wrap; padding: 18px 20px; border-radius: 12px; margin-bottom: 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-left: 4px solid #2563EB; }
.v19-asg-row.expired { border-left-color: #DC2626; background: #FFFDFD; }
.v19-asg-main { flex: 1; min-width: 260px; }
.v19-asg-meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.v19-pill-blue { background: #DBEAFE; color: #1D4ED8; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.v19-pill-status { padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.v19-pill-status.open { background: #DCFCE7; color: #15803D; }
.v19-pill-status.expired { background: #FEE2E2; color: #B91C1C; }
.v19-asg-title { margin: 0 0 6px; font-size: 16.5px; font-weight: 800; color: #0F172A; }
.v19-asg-desc { margin: 0 0 12px; font-size: 13.5px; color: #475569; white-space: pre-line; line-height: 1.55; }
.v19-asg-stats { display: flex; gap: 20px; flex-wrap: wrap; font-size: 12.5px; color: #64748B; }
.v19-asg-stats .c-green { color: #15803D; } .v19-asg-stats .c-amber { color: #B45309; } .v19-asg-stats .c-red { color: #B91C1C; }
.v19-asg-btns { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }

.v19-btn-primary { background: #2563EB; color: #FFFFFF; border: none; padding: 9px 16px; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; }
.v19-btn-primary:hover { background: #1D4ED8; }
.v19-btn-outline { background: #FFFFFF; color: #1D4ED8; border: 1.5px solid #BFDBFE; padding: 8px 15px; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; }
.v19-btn-outline:hover { background: #EFF6FF; }
.v19-btn-danger-outline { background: #FFFFFF; color: #DC2626; border: 1.5px solid #FECACA; padding: 8px 13px; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: pointer; }
.v19-btn-danger-outline:hover { background: #FEF2F2; }
.v19-btn-disabled { background: #E2E8F0; color: #64748B; border: none; padding: 9px 15px; border-radius: 9px; font-size: 13px; font-weight: 700; cursor: not-allowed; }

.v19-table-wrap { width: 100%; overflow-x: auto; border: 1px solid #E2E8F0; border-radius: 10px; }
.v19-table { width: 100%; border-collapse: collapse; font-size: 13.5px; color: #0F172A; text-align: left; }
.v19-table th { background: #F8FAFC; color: #475569; font-size: 12px; font-weight: 700; text-transform: uppercase; padding: 12px 14px; border-bottom: 1px solid #E2E8F0; }
.v19-table td { padding: 12px 14px; border-bottom: 1px solid #F1F5F9; }
.v19-table td.muted { color: #64748B; }
.v19-xp-tag { background: #DCFCE7; color: #15803D; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; padding: 3px 9px; border-radius: 999px; }

.v19-info-strip { padding: 10px 14px; border-radius: 10px; background: #EFF6FF; border: 1px solid #BFDBFE; color: #1E40AF; font-size: 13px; margin-bottom: 14px; }
.v19-rt-pill { display: inline-flex; align-items: center; gap: 7px; padding: 4px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.v19-rt-pill i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.v19-rt-pill.on { background: #DCFCE7; color: #15803D; } .v19-rt-pill.on i { background: #16A34A; }
.v19-rt-pill.off { background: #F1F5F9; color: #64748B; } .v19-rt-pill.off i { background: #94A3B8; }
.v19-olm-empty-state, .v19-olm-empty-box { padding: 36px 20px; text-align: center; border-radius: 12px; border: 1.5px dashed #CBD5E1; background: #F8FAFC; color: #475569; font-size: 14px; }
.v19-olm-empty-state h3 { margin: 0 0 8px; color: #0F172A; }

/* Modal Giao bài tập + Modal Tổng hợp/Chấm bài sạch sẽ xanh-trắng */
.v19-assign-modal-box,
#v18-report-modal .modal-box,
#v18-grade-modal .modal-box,
#v18-solve-modal .modal-box {
  background: #FFFFFF !important; color: #0F172A !important;
  border: 1px solid #CBD5E1 !important; border-radius: 16px !important; padding: 22px 24px !important;
}
.v19-assign-modal-box { max-width: 680px !important; width: 95vw !important; }
.v19-modal-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #E2E8F0; }
.v19-close-x { background: transparent; border: none; font-size: 24px; color: #64748B; cursor: pointer; line-height: 1; }
.v19-field { margin-bottom: 14px; }
.v19-field label { display: block; font-size: 13px; font-weight: 700; color: #334155; margin-bottom: 6px; }
.v19-input, .v19-textarea-square { width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 9px; border: 1.5px solid #CBD5E1; background: #FFFFFF; color: #0F172A; font-size: 14px; font-family: inherit; }
.v19-input:focus, .v19-textarea-square:focus { outline: none; border-color: #2563EB; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14); }
.v19-textarea-square { min-height: 155px; resize: vertical; line-height: 1.6; }
.v19-grid-3 { display: grid; grid-template-columns: 1fr 1.2fr 0.9fr; gap: 12px; }
.v19-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.v19-date-wrap { position: relative; display: flex; align-items: center; }
.v19-date-native { position: absolute; right: 6px; width: 28px; height: 28px; opacity: 0.7; border: none; background: transparent; cursor: pointer; }
.v19-modal-foot { display: flex; justify-content: flex-end; gap: 10px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #E2E8F0; }
.v19-btn-cancel { background: #F1F5F9; color: #334155; border: 1px solid #CBD5E1; padding: 10px 18px; border-radius: 9px; font-weight: 700; cursor: pointer; }
.v19-btn-submit { background: #2563EB; color: #FFFFFF; border: none; padding: 10px 22px; border-radius: 9px; font-weight: 700; cursor: pointer; }
.v19-btn-submit:hover { background: #1D4ED8; }

@media (max-width: 720px) {
  .v19-grid-3, .v19-grid-2 { grid-template-columns: 1fr; }
}
"""

def apply_polish():
    with open("js/scratch-bridge.js", "w", encoding="utf-8") as f:
        f.write(SCRATCH_AND_DIAG_JS.strip() + "\n")
    print("✔ Đã khôi phục giao diện Scratch thanh mảnh + thêm khung Kiểm tra lỗi IDE trong js/scratch-bridge.js")

    with open("js/v19-polish.js", "w", encoding="utf-8") as f:
        f.write(V19_POLISH_JS.strip() + "\n")
    print("✔ Đã tạo js/v19-polish.js (Mở Trang chủ mặc định, Lớp học OLM xanh-trắng, Giao bài DD/MM/YYYY + Giờ, Google giữa)")

    css_path = "css/design-system.css"
    css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V19.0: SLEEK SCRATCH"
    if marker in css:
        css = css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css + "\n\n" + V19_CSS.strip() + "\n")
    print("✔ Đã cập nhật css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = re.sub(r'<span[^>]*>\s*v\d+(?:\.\d+)*\s*</span>', '', html, flags=re.IGNORECASE)
        html = html.replace("Đăng nhập bằng Google, Facebook, GitHub hoặc Email của bạn", "Đăng nhập bằng tài khoản Google hoặc Email của bạn")
        html = html.replace("100 Chặng Thử thách & AI", "100 Chặng Thử thách")
        for em in ["🎮 ", "📞 ", "👨‍🏫"]:
            html = html.replace(em, "")

        html = re.sub(r'(<section[^>]*id="view-(?:workspace|classroom|learning|challenges)"[^>]*class="[^"]*)\bactive\b([^"]*")', r'\1\2', html)

        if 'js/v19-polish.js' not in html:
            if '<script src="js/v18-engine.js"></script>' in html:
                html = html.replace('<script src="js/v18-engine.js"></script>', '<script src="js/v18-engine.js"></script>\n  <script src="js/v19-polish.js"></script>')
            else:
                html = html.replace('</body>', '  <script src="js/v19-polish.js"></script>\n</body>')

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã cập nhật index.html (xóa badge v..., xóa Facebook/GitHub, mở Trang chủ mặc định)")

    if os.path.exists("js/app.js"):
        app_js = open("js/app.js", "r", encoding="utf-8").read()
        app_js = app_js.replace("Đăng nhập bằng Google, Facebook, GitHub hoặc Email của bạn", "Đăng nhập bằng tài khoản Google hoặc Email của bạn")
        with open("js/app.js", "w", encoding="utf-8") as f:
            f.write(app_js)
        print("✔ Đã dọn chữ Facebook/GitHub trong js/app.js")

    print("\nHOÀN TẤT SỬA LỖI TOÀN DIỆN! Tải lại trình duyệt (Ctrl + Shift + R) để kiểm tra.")

if __name__ == "__main__":
    apply_polish()