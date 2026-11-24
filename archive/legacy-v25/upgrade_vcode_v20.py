# -*- coding: utf-8 -*-
"""
V-CODE EDU — BẢN HOÀN THIỆN TOÀN DIỆN (V20):
1. Đồng bộ Sáng/Tối toàn bộ mọi trang (icon Mặt trăng / Mặt trời SVG; IDE có nút Sáng/Tối riêng cho khung gõ code).
2. Đặt khung Kiểm tra lỗi mã nguồn vào đúng nửa dưới cột phải IDE, kèm nút "Kiểm tra lỗi" báo lỗi theo số dòng.
3. Khôi phục hoàn thiện Scratch Live & Sơ đồ khối SVG (không đè thanh tab, chữ nút rõ nét).
4. Xóa icon robot AI, emoji thừa và cụm từ "tổng hợp như OLM".
5. Mở rộng Phân cảnh 04 thành 6 khung lớn chi tiết (Hướng đi, Thực tiễn, Phát triển) & thêm Phân cảnh 05 Thông tin Nhóm, Trường THCS và THPT Hòa Phú.
"""
import os
import re

SCRATCH_V20_JS = r"""// V-CODE EDU — SCRATCH 3.0 SLEEK + FLOWCHART SVG + BOTTOM DIAGNOSTICS PANEL
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
"""

V20_FINAL_JS = r"""// V-CODE EDU — UNIFIED THEME ENGINE (MOON/SUN) + ISOLATED IDE THEME + CLEAN HUMAN ICONS
(function () {
  const SUN_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  const MOON_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  const HELP_SVG = `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>`;

  function applyGlobalTheme(mode) {
    const isLight = mode === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
    document.body.setAttribute('data-theme', isLight ? 'light' : 'dark');
    document.documentElement.classList.toggle('light-theme', isLight);
    document.documentElement.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('light-theme', isLight);
    document.body.classList.toggle('light-mode', isLight);
    try { localStorage.setItem('vcode_theme', isLight ? 'light' : 'dark'); } catch {}

    const btn = document.getElementById('theme-toggle-btn') || document.querySelector('[onclick*="toggleTheme"]');
    if (btn) {
      btn.innerHTML = isLight ? MOON_SVG : SUN_SVG;
      btn.title = isLight ? 'Chuyển sang giao diện Tối' : 'Chuyển sang giao diện Sáng';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  window.toggleTheme = function () {
    const curLight = document.documentElement.getAttribute('data-theme') === 'light'
      || document.body.classList.contains('light-theme')
      || document.body.classList.contains('light-mode');
    applyGlobalTheme(curLight ? 'dark' : 'light');
  };

  function bindIsolatedIDETheme() {
    const btn = document.getElementById('ide-theme-btn') || [...document.querySelectorAll('#view-workspace button')].find((b) => /Sáng IDE|Tối IDE/i.test(b.textContent || ''));
    const ed = document.getElementById('code-editor');
    if (!btn || !ed) return;
    const editorWrap = ed.parentElement;

    const updateBtnLabel = (isLightEd) => {
      btn.innerHTML = isLightEd
        ? `${MOON_SVG.replace(/17/g, '14')}<span style="margin-left:5px">Tối IDE</span>`
        : `${SUN_SVG.replace(/17/g, '14')}<span style="margin-left:5px">Sáng IDE</span>`;
    };

    let ideLight = false;
    updateBtnLabel(false);

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      ideLight = !ideLight;
      document.getElementById('view-workspace')?.classList.remove('ide-light', 'light-ide');
      document.body.classList.remove('ide-light-mode');
      ed.classList.toggle('v20-editor-light', ideLight);
      if (editorWrap) editorWrap.classList.toggle('v20-editor-wrap-light', ideLight);
      updateBtnLabel(ideLight);
    };
  }

  function refineFloatingHelperIcon() {
    const fab = document.getElementById('ai-fab')
      || document.getElementById('ai-tutor-fab')
      || document.querySelector('.ai-fab, .chatbot-fab, button[onclick*="toggleAIChat"], button[onclick*="toggleTutor"]');
    if (fab) {
      fab.classList.add('v20-clean-fab');
      fab.innerHTML = HELP_SVG;
      fab.title = 'Trợ giúp lập trình';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    let saved = 'dark';
    try { saved = localStorage.getItem('vcode_theme') || 'dark'; } catch {}
    applyGlobalTheme(saved);

    const themeBtn = document.getElementById('theme-toggle-btn') || document.querySelector('[onclick*="toggleTheme"]');
    if (themeBtn) {
      themeBtn.onclick = (e) => { e.preventDefault(); window.toggleTheme(); };
    }

    bindIsolatedIDETheme();
    refineFloatingHelperIcon();
  });
})();
"""

SCENE4_AND_TEAM_HTML = """
      <!-- PHÂN CẢNH 04: HƯỚNG ĐI, ỨNG DỤNG THỰC TIỄN & LỘ TRÌNH PHÁT TRIỂN -->
      <section class="v18-scene v20-scene-roadmap">
        <div class="v18-scene-inner v18-scene-stack">
          <div class="v18-split-left" style="width:100%">
            <span class="v18-scene-kicker">PHÂN CẢNH 04 • HƯỚNG ĐI, THỰC TIỄN &amp; PHÁT TRIỂN</span>
            <h2 class="v18-scene-title">Từ bài học trên lớp đến năng lực công nghệ thực tiễn</h2>
            <p class="v18-scene-desc" style="max-width:780px;margin-bottom:0">
              V-Code Edu được xây dựng từ thực tế giảng dạy môn Tin học ở trường phổ thông, giải quyết đồng thời ba bài toán: chuyển tiếp tư duy kéo-thả sang viết mã, tối ưu phòng máy thực hành và quản lý bài tập tập trung.
            </p>
          </div>

          <div class="v18-split-right" style="width:100%">
            <div class="v20-roadmap-grid">
              <div class="v20-road-card v18-tilt">
                <div class="v20-rc-top">
                  <span class="v20-rc-tag">HƯỚNG ĐI SƯ PHẠM</span>
                  <span class="v20-rc-num">01</span>
                </div>
                <h4>Cầu nối tư duy từ Scratch sang Python &amp; C/C++</h4>
                <p>Học sinh THCS và THPT thường gặp khó khăn khi chuyển từ lập trình khối kéo-thả sang viết mã văn bản. Cơ chế đồng bộ mã lệnh song song khối Scratch và Sơ đồ khối SVG giúp học sinh nhìn rõ luồng rẽ nhánh, vòng lặp ngay trong lúc gõ.</p>
                <div class="v20-rc-foot">Áp dụng trực tiếp cho giảng dạy Tin học THCS &amp; THPT</div>
              </div>

              <div class="v20-road-card v18-tilt">
                <div class="v20-rc-top">
                  <span class="v20-rc-tag">ỨNG DỤNG THỰC TIỄN</span>
                  <span class="v20-rc-num">02</span>
                </div>
                <h4>Vận hành ổn định trên phòng máy &amp; thiết bị cá nhân</h4>
                <p>Không cần cài đặt trình biên dịch nặng hay cấu hình phức tạp trên từng máy phòng Tin học. Chỉ cần mở trình duyệt trên máy tính trường học hoặc điện thoại ở nhà là có thể viết code, kiểm tra lỗi và nộp bài ngay.</p>
                <div class="v20-rc-foot">Hỗ trợ lưu trữ đám mây kết hợp chế độ Offline dự phòng</div>
              </div>

              <div class="v20-road-card v18-tilt">
                <div class="v20-rc-top">
                  <span class="v20-rc-tag">QUẢN TRỊ DẠY HỌC</span>
                  <span class="v20-rc-num">03</span>
                </div>
                <h4>Chuẩn hóa quy trình giao bài, kiểm thử &amp; chấm điểm</h4>
                <p>Giáo viên tạo nhiều lớp học, thiết lập hạn nộp theo ngày giờ thực tế, tự động chấm bộ kiểm thử đầu vào/đầu ra và rà soát danh sách học sinh đã nộp — chưa làm chỉ trong một màn hình duy nhất.</p>
                <div class="v20-rc-foot">Giảm tải thời gian chấm bài thủ công cho giáo viên</div>
              </div>

              <div class="v20-road-card v18-tilt">
                <div class="v20-rc-top">
                  <span class="v20-rc-tag">PHÂN HÓA NĂNG LỰC</span>
                  <span class="v20-rc-num">04</span>
                </div>
                <h4>Lộ trình từ đại trà đến bồi dưỡng Học sinh giỏi</h4>
                <p>Kết hợp 250+ bài học cơ bản bám sát Chương trình GDPT 2018 cùng hệ thống 100 thử thách thuật toán phân cấp (số học, xử lý chuỗi, mảng, quy hoạch động, đồ thị) giúp phân hóa rõ nhóm học sinh đại trà và đội tuyển HSG.</p>
                <div class="v20-rc-foot">Cá nhân hóa tốc độ tự học cho từng học sinh</div>
              </div>

              <div class="v20-road-card v18-tilt">
                <div class="v20-rc-top">
                  <span class="v20-rc-tag">PHÁT TRIỂN TƯƠNG LAI</span>
                  <span class="v20-rc-num">05</span>
                </div>
                <h4>Mở rộng ngân hàng đề thi &amp; phân tích lỗ hổng kiến thức</h4>
                <p>Giai đoạn tiếp theo tập trung bổ sung kho đề luyện thi Tin học trẻ, kỳ thi chọn HSG các cấp và bảng thống kê các dạng lỗi cú pháp học sinh hay mắc phải để giáo viên kịp thời điều chỉnh bài giảng.</p>
                <div class="v20-rc-foot">Nâng cấp liên tục theo phản hồi thực tế từ lớp học</div>
              </div>

              <div class="v20-road-card v18-tilt">
                <div class="v20-rc-top">
                  <span class="v20-rc-tag">LAN TỎA CỘNG ĐỒNG</span>
                  <span class="v20-rc-num">06</span>
                </div>
                <h4>Học liệu số mở cho các trường phổ thông địa phương</h4>
                <p>Hướng tới mô hình nền tảng giáo dục miễn phí, dễ triển khai tại các trường THCS và THPT vùng còn hạn chế hạ tầng, khuyến khích giáo viên và học sinh cùng đóng góp bài tập và học liệu lập trình.</p>
                <div class="v20-rc-foot">Phục vụ chuyển đổi số giáo dục bền vững</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- PHÂN CẢNH 05: THÔNG TIN NHÓM PHÁT TRIỂN & ĐƠN VỊ TRƯỜNG HỌC -->
      <section class="v18-scene v20-scene-about">
        <div class="v18-scene-inner v18-scene-stack">
          <div class="v20-about-card">
            <div class="v20-about-grid">
              <div class="v20-about-brand">
                <div class="v20-about-logo-row">
                  <img src="assets/logo.jpg" alt="V-Code Edu" onerror="this.style.display='none'" />
                  <div>
                    <span class="v20-about-kicker">THÔNG TIN DỰ ÁN &amp; ĐƠN VỊ THỰC HIỆN</span>
                    <h3>V-Code Edu</h3>
                  </div>
                </div>
                <p class="v20-about-desc">
                  Sản phẩm nghiên cứu và ứng dụng công nghệ thông tin trong giảng dạy môn Tin học, hướng tới môi trường thực hành lập trình trực quan, hiện đại và dễ tiếp cận cho học sinh phổ thông.
                </p>
              </div>

              <div class="v20-about-cols">
                <div class="v20-about-col">
                  <h5>Đơn vị trường học</h5>
                  <ul>
                    <li><strong>Trường THCS và THPT Hòa Phú</strong></li>
                    <li>Chuyên môn: Tổ Tin học</li>
                    <li>Phạm vi: Giảng dạy Tin học THCS &amp; THPT</li>
                  </ul>
                </div>

                <div class="v20-about-col">
                  <h5>Nhóm thực hiện</h5>
                  <ul>
                    <li><strong>Nhóm phát triển V-Code Edu</strong></li>
                    <li>Tổ Tin học — Trường THCS và THPT Hòa Phú</li>
                    <li>Lĩnh vực: Phần mềm hệ thống &amp; Học liệu số</li>
                  </ul>
                </div>

                <div class="v20-about-col">
                  <h5>Công nghệ nền tảng</h5>
                  <ul>
                    <li>Web App chuẩn HTML5 / CSS3 / JavaScript</li>
                    <li>Biên dịch trực tiếp Python &amp; Scratch 3.0 SVG</li>
                    <li>Đồng bộ Cloud Firestore &amp; chế độ Offline</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="v20-about-bottom">
              <span>&copy; 2026 V-Code Edu • Trường THCS và THPT Hòa Phú</span>
              <span>Nền tảng Học và Dạy Lập trình Trực tuyến</span>
            </div>
          </div>
        </div>
      </section>
"""

V20_CSS = """
/* ==================== V20.0: UNIFIED LIGHT/DARK THEME + IDE BOTTOM DIAGNOSTICS + ROADMAP & ABOUT ==================== */
:is(html[data-theme="light"], body.light-theme, body.light-mode) {
  --bg-body: #F8FAFC;
  --bg-surface: #FFFFFF;
  --bg-elevated: #F1F5F9;
  --text-primary: #0F172A;
  --text-secondary: #475569;
  --border-subtle: #E2E8F0;
  --border-strong: #CBD5E1;
}

/* Trang chủ chế độ SÁNG */
:is(html[data-theme="light"], body.light-theme, body.light-mode) #view-home.active,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-home-root.active {
  background: #F8FAFC !important;
  color: #0F172A !important;
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-hero-title,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-scene-title,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-board-caption h3,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-fl-item strong,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-road-card h4,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-about-card h3,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-about-col h5,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-about-col strong {
  color: #0F172A !important;
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-hero-sub,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-scene-desc,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-stats-strip span,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-board-caption p,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-fl-item span,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-road-card p,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-about-desc,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-about-col li {
  color: #475569 !important;
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-logo-board,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-road-card,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-about-card,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-fl-item {
  background: #FFFFFF !important;
  border-color: #CBD5E1 !important;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06) !important;
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-lang-pill,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-btn-ghost,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-float-tag,
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-mini-tile {
  background: #FFFFFF !important;
  color: #0F172A !important;
  border-color: #CBD5E1 !important;
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-badge-top {
  background: #ECFDF5 !important; color: #047857 !important; border-color: #A7F3D0 !important;
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-stats-strip strong { color: #059669 !important; }
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-grid-3d {
  background-image: linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(15, 23, 42, 0.08) 1px, transparent 1px) !important;
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v18-glow-orb { opacity: 0.1 !important; }

/* Lớp học hỗ trợ CẢ CHẾ ĐỘ TỐI LẪN CHẾ ĐỘ SÁNG */
html[data-theme="dark"] #view-classroom.active,
body[data-theme="dark"] #view-classroom.active {
  background: #070B14 !important;
  color: #F8FAFC !important;
}
html[data-theme="dark"] .v19-olm-shell { color: #F8FAFC; }
html[data-theme="dark"] .v19-hamburger-btn,
html[data-theme="dark"] .v19-class-dropdown,
html[data-theme="dark"] .v19-olm-card,
html[data-theme="dark"] .v19-asg-row,
html[data-theme="dark"] .v19-btn-outline {
  background: #0F172A !important; color: #F8FAFC !important; border-color: #1E293B !important;
}
html[data-theme="dark"] .v19-cd-top,
html[data-theme="dark"] .v19-olm-tabs,
html[data-theme="dark"] .v19-table th,
html[data-theme="dark"] .v19-olm-empty-box,
html[data-theme="dark"] .v19-olm-empty-state {
  background: #0B1220 !important; color: #94A3B8 !important; border-color: #1E293B !important;
}
html[data-theme="dark"] .v19-tab { color: #94A3B8; }
html[data-theme="dark"] .v19-tab.active { background: #0F172A !important; color: #38BDF8 !important; border-bottom-color: #38BDF8 !important; }
html[data-theme="dark"] .v19-table,
html[data-theme="dark"] .v19-asg-title,
html[data-theme="dark"] .v19-cd-click strong,
html[data-theme="dark"] .v19-olm-empty-state h3 { color: #F8FAFC !important; }
html[data-theme="dark"] .v19-table td { border-bottom-color: #1E293B !important; }
html[data-theme="dark"] .v19-table-wrap { border-color: #1E293B !important; }
html[data-theme="dark"] .v19-asg-desc,
html[data-theme="dark"] .v19-table td.muted { color: #94A3B8 !important; }
html[data-theme="dark"] .v19-chip { background: #1E293B; color: #CBD5E1; border-color: #334155; }
html[data-theme="dark"] .v19-chip.active { background: rgba(56, 189, 248, 0.16); color: #38BDF8; border-color: #38BDF8; }
html[data-theme="dark"] .v19-info-strip { background: rgba(56, 189, 248, 0.1); border-color: rgba(56, 189, 248, 0.28); color: #BAE6FD; }
html[data-theme="dark"] .v19-cd-row:hover { background: #1E293B !important; }
html[data-theme="dark"] .v19-cd-row.active { background: rgba(37, 99, 235, 0.2) !important; border-color: #3B82F6 !important; }
html[data-theme="dark"] .v19-cd-btns button { background: #1E293B; color: #E2E8F0; border-color: #334155; }

/* IDE chế độ Sáng/Tối toàn cục & Sáng/Tối RIÊNG cho khung soạn thảo */
:is(html[data-theme="light"], body.light-theme, body.light-mode) #view-workspace.active {
  background: #F1F5F9 !important; color: #0F172A !important;
}
.v20-editor-light { background: #FFFFFF !important; color: #0F172A !important; caret-color: #2563EB !important; }
.v20-editor-wrap-light { background: #F8FAFC !important; color: #475569 !important; }

/* Sửa lỗi chữ mờ trên nút tab Scratch Live / Kết quả Console / Sơ đồ khối */
.v20-ide-right-col button.active {
  background: #2563EB !important;
  color: #FFFFFF !important;
  font-weight: 700 !important;
}
html[data-theme="dark"] .v20-ide-right-col button:not(.active):not(.v20-btn-check) { color: #CBD5E1 !important; }
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-ide-right-col button:not(.active):not(.v20-btn-check) { color: #334155 !important; }

/* IDE cột phải chia dọc 2 nửa: Trên = Scratch/Console/Flowchart, Dưới = Kiểm tra lỗi */
.v20-ide-right-col {
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  min-height: 0 !important;
}
.v20-ide-upper-box {
  flex: 1 1 56% !important;
  min-height: 270px !important;
  overflow: auto !important;
  display: block !important;
}
.v20-pane-box { width: 100%; min-height: 250px; }

.v20-diag-box {
  flex: 0 0 auto; display: flex; flex-direction: column;
  border-radius: 12px; background: #060A13;
  border: 1px solid rgba(148, 163, 184, 0.22); overflow: hidden;
  min-height: 200px; max-height: 260px;
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-diag-box {
  background: #FFFFFF; border-color: #CBD5E1;
}
.v20-diag-topbar {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 9px 14px; background: rgba(15, 23, 42, 0.92);
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-diag-topbar {
  background: #F8FAFC; border-bottom-color: #E2E8F0;
}
.v20-diag-left { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 700; color: #F8FAFC; }
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-diag-left { color: #0F172A; }
.v20-diag-badge { font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; }
.v20-diag-badge.idle { background: rgba(148, 163, 184, 0.18); color: #94A3B8; }
.v20-diag-badge.ok { background: rgba(16, 185, 129, 0.18); color: #10B981; }
.v20-diag-badge.warn { background: rgba(245, 158, 11, 0.18); color: #F59E0B; }
.v20-diag-badge.err { background: rgba(244, 63, 94, 0.2); color: #F43F5E; }

.v20-btn-check {
  background: #2563EB !important; color: #FFFFFF !important; border: none;
  padding: 6px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 700;
  cursor: pointer; transition: background 0.18s;
}
.v20-btn-check:hover { background: #1D4ED8 !important; }

.v20-diag-console {
  flex: 1; overflow-y: auto; padding: 10px 14px;
  font-family: 'JetBrains Mono', monospace; font-size: 12.5px;
  display: flex; flex-direction: column; gap: 7px;
}
.v20-diag-placeholder { color: #94A3B8; font-family: 'Inter', sans-serif; font-size: 13px; padding: 8px 2px; line-height: 1.55; }
.v20-diag-ok { color: #10B981; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; padding: 8px 2px; }
.v20-diag-row {
  display: flex; align-items: flex-start; gap: 10px; padding: 9px 11px;
  border-radius: 8px; cursor: pointer; font-family: 'Inter', sans-serif;
  background: rgba(244, 63, 94, 0.09); border-left: 3px solid #F43F5E; transition: background 0.15s;
}
.v20-diag-row.warn { background: rgba(245, 158, 11, 0.09); border-left-color: #F59E0B; }
.v20-diag-row:hover { background: rgba(56, 189, 248, 0.14); }
.v20-diag-ln { font-family: 'JetBrains Mono', monospace; font-size: 11.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; background: rgba(244, 63, 94, 0.22); color: #FDA4AF; white-space: nowrap; }
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-diag-ln { background: #FEE2E2; color: #B91C1C; }
.v20-diag-txt { display: flex; flex-direction: column; gap: 2px; font-size: 12.5px; }
.v20-diag-txt strong { color: #F8FAFC; }
.v20-diag-txt span { color: #94A3B8; line-height: 1.45; }
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-diag-txt strong { color: #0F172A; }
:is(html[data-theme="light"], body.light-theme, body.light-mode) .v20-diag-txt span { color: #475569; }

/* Nút trợ giúp tối giản (thay robot AI phát sáng) */
.v20-clean-fab {
  background: #1E293B !important; color: #F8FAFC !important;
  border: 1px solid #334155 !important; box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28) !important;
}
.v20-clean-fab:hover { background: #2563EB !important; border-color: #3B82F6 !important; }

/* Phân cảnh 04 (6 khung to chi tiết) & Phân cảnh 05 (Thông tin Nhóm & Trường) */
.v20-roadmap-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; width: 100%; }
.v20-road-card {
  display: flex; flex-direction: column; justify-content: space-between;
  padding: 26px 24px; border-radius: 16px; background: rgba(15, 23, 42, 0.84);
  border: 1px solid rgba(148, 163, 184, 0.2); min-height: 235px;
  transition: transform 0.22s ease, border-color 0.22s ease;
}
.v20-road-card:hover { border-color: #10B981; }
.v20-rc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.v20-rc-tag { font-family: 'JetBrains Mono', monospace; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; color: #10B981; padding: 4px 9px; border-radius: 6px; background: rgba(16, 185, 129, 0.12); }
.v20-rc-num { font-family: 'JetBrains Mono', monospace; font-size: 18px; font-weight: 800; color: rgba(148, 163, 184, 0.45); }
.v20-road-card h4 { margin: 0 0 10px; font-size: 18px; font-weight: 800; line-height: 1.35; }
.v20-road-card p { margin: 0 0 16px; font-size: 13.8px; line-height: 1.65; color: #94A3B8; flex: 1; }
.v20-rc-foot { padding-top: 12px; border-top: 1px solid rgba(148, 163, 184, 0.14); font-size: 12px; font-weight: 600; color: #38BDF8; }

.v20-scene-about { min-height: auto !important; padding-top: 36px !important; padding-bottom: 56px !important; border-bottom: none !important; }
.v20-about-card { width: 100%; border-radius: 18px; padding: 34px 36px 24px; background: rgba(15, 23, 42, 0.88); border: 1px solid rgba(148, 163, 184, 0.22); }
.v20-about-grid { display: grid; grid-template-columns: 1.05fr 1.65fr; gap: 36px; align-items: start; }
.v20-about-logo-row { display: flex; align-items: center; gap: 14px; margin-bottom: 14px; }
.v20-about-logo-row img { width: 48px; height: 48px; border-radius: 12px; object-fit: contain; background: #FFF; padding: 4px; }
.v20-about-kicker { display: block; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: 0.08em; color: #10B981; font-weight: 700; }
.v20-about-logo-row h3 { margin: 2px 0 0; font-size: 22px; font-weight: 800; }
.v20-about-desc { margin: 0; font-size: 14px; line-height: 1.65; color: #94A3B8; }
.v20-about-cols { display: grid; grid-template-columns: repeat(3, 1fr); gap: 22px; }
.v20-about-col h5 { margin: 0 0 10px; font-size: 14px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; }
.v20-about-col ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 7px; font-size: 13.5px; color: #94A3B8; }
.v20-about-bottom { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-top: 26px; padding-top: 18px; border-top: 1px solid rgba(148, 163, 184, 0.16); font-size: 12.5px; color: #64748B; }

@media (max-width: 1080px) {
  .v20-roadmap-grid { grid-template-columns: repeat(2, 1fr); }
  .v20-about-grid { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .v20-roadmap-grid, .v20-about-cols { grid-template-columns: 1fr; }
  .v20-about-card { padding: 22px 18px; }
}
"""

def replace_scene4_in_html(html):
    m = re.search(
        r'(?:<!--\s*PHÂN CẢNH 04[\s\S]*?)?<section class="v18-scene[^"]*">\s*<div class="v18-scene-inner v18-scene-stack">[\s\S]*?</section>(?:\s*<!--\s*PHÂN CẢNH 05[\s\S]*?</section>)?',
        html
    )
    if m:
        return html[:m.start()] + SCENE4_AND_TEAM_HTML.strip() + html[m.end():], True
    return html, False

def apply_v20():
    with open("js/scratch-bridge.js", "w", encoding="utf-8") as f:
        f.write(SCRATCH_V20_JS.strip() + "\n")
    print("✔ Đã sửa triệt để js/scratch-bridge.js (Scratch Live + Sơ đồ khối + Kiểm tra lỗi ở nửa dưới cột phải)")

    with open("js/v20-final.js", "w", encoding="utf-8") as f:
        f.write(V20_FINAL_JS.strip() + "\n")
    print("✔ Đã tạo js/v20-final.js (Sáng/Tối đồng bộ mọi trang, Mặt trăng/Mặt trời, IDE sáng riêng, xóa icon robot AI)")

    css_path = "css/design-system.css"
    css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V20.0: UNIFIED LIGHT/DARK THEME"
    if marker in css:
        css = css.split(marker)[0].rstrip()
    css = css.replace(".v19-keep-dark-panel button", ".v19-keep-dark-panel-disabled button")
    css = css.replace(".v19-keep-dark-panel,", ".v19-keep-dark-panel-disabled,")
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css + "\n\n" + V20_CSS.strip() + "\n")
    print("✔ Đã cập nhật css/design-system.css (Sáng/Tối toàn diện, IDE chia 2 nửa dọc, Phân cảnh 4 & Thông tin trường)")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()

        html = html.replace("Giao bài hẹn lịch thật, tự khóa quá hạn &amp; tổng hợp như OLM", "Giao bài hẹn lịch thật, tự khóa quá hạn &amp; chấm điểm tập trung")
        html = html.replace("Giao bài hẹn lịch thật, tự khóa quá hạn & tổng hợp như OLM", "Giao bài hẹn lịch thật, tự khóa quá hạn &amp; chấm điểm tập trung")
        html = html.replace("Lớp học Trực tuyến OLM", "Lớp học Trực tuyến V-Code")
        html = html.replace("Lớp học Chuẩn OLM", "Lớp học Số Đám mây")
        html = html.replace("như OLM", "")

        for em in ["🔀 ", "🔀", "🤖", "🎮", "📞", "📋", "👥", "📡", "💬", "✨", "🚀"]:
            html = html.replace(em, "")

        if "scrollToV18Scene(4)" not in html and "scrollToV18Scene(3)" in html:
            html = html.replace(
                '<button type="button" class="v18-dot-item" onclick="scrollToV18Scene(3)"><span>04. Lộ trình &amp; Thi</span><i></i></button>',
                '<button type="button" class="v18-dot-item" onclick="scrollToV18Scene(3)"><span>04. Hướng đi &amp; Phát triển</span><i></i></button>\n        <button type="button" class="v18-dot-item" onclick="scrollToV18Scene(4)"><span>05. Nhóm &amp; Trường</span><i></i></button>'
            )

        html, ok4 = replace_scene4_in_html(html)
        if ok4:
            print("✔ Đã nâng cấp Phân cảnh 04 (6 khung lớn chi tiết) & thêm Thông tin Nhóm, Trường THCS và THPT Hòa Phú")
        else:
            print("⚠ Chưa tìm thấy khối Phân cảnh 04 trong index.html")

        if 'js/v20-final.js' not in html:
            if '<script src="js/v19-polish.js"></script>' in html:
                html = html.replace('<script src="js/v19-polish.js"></script>', '<script src="js/v19-polish.js"></script>\n  <script src="js/v20-final.js"></script>')
            else:
                html = html.replace('</body>', '  <script src="js/v20-final.js"></script>\n</body>')

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã cập nhật sạch sẽ index.html")

    print("\nHOÀN TẤT BẢN V20! Tải lại trình duyệt (Ctrl + Shift + R) để kiểm tra.")

if __name__ == "__main__":
    apply_v20()