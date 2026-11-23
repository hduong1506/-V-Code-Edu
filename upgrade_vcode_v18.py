# -*- coding: utf-8 -*-
"""
V-CODE EDU v18.0 — ĐẠI TU TOÀN DIỆN (BẢN CHUẨN KHÔNG LỖI)
"""
import os
import re

SCRATCH_BRIDGE_V18_JS = r"""// V-CODE EDU v18.0 — SCRATCH 3.0 LIVE (NESTED C-BLOCKS) + FLOWCHART SVG ENGINE
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
    if (m) return { kind: 'if', type: 'control', text: `Nếu ${m[1].trim()}?`, html: `Nếu <span class="sc-cond">${esc(m[1].trim())}</span> thì`, isBlock: true };

    m = t.match(/^(?:elif|nguoc_lai_neu)(?:\s+|\s*(?=\())(.+?):?$/i);
    if (m) return { kind: 'elif', type: 'control', text: `Ngược lại nếu ${m[1].trim()}?`, html: `Ngược lại nếu <span class="sc-cond">${esc(m[1].trim())}</span> thì`, isBlock: true };

    if (/^(?:else|nguoc_lai)\s*:?$/i.test(t)) return { kind: 'else', type: 'control', text: 'Ngược lại', html: `Ngược lại`, isBlock: true };

    m = t.match(/^(?:for|lap_voi)\s+([a-zA-Z_]\w*)\s+(?:in|trong_khoang)\s+(.+?):?$/i);
    if (m) {
      let rng = m[2].trim();
      const rm = rng.match(/^range\s*\((.*)\)$/);
      if (rm) rng = rm[1];
      return { kind: 'for', type: 'loop', text: `Lặp ${m[1]} trong (${rng})`, html: `Lặp biến <span class="sc-var">${esc(m[1])}</span> trong khoảng <span class="sc-val">${esc(rng)}</span>`, isBlock: true };
    }

    m = t.match(/^(?:while|khi_ma)(?:\s+|\s*(?=\())(.+?):?$/i);
    if (m) return { kind: 'while', type: 'loop', text: `Lặp khi ${m[1].trim()}?`, html: `Lặp trong khi <span class="sc-cond">${esc(m[1].trim())}</span>`, isBlock: true };

    m = t.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*:?$/i);
    if (m) return { kind: 'def', type: 'func', text: `Hàm ${m[1]}(${m[2]})`, html: `Định nghĩa hàm <span class="sc-val">${esc(m[1])}(${esc(m[2])})</span>`, isBlock: true };

    m = t.match(/^return\b(.*)$/i);
    if (m) return { kind: 'return', type: 'func', text: `Trả về ${m[1].trim() || 'None'}`, html: `Trả về <span class="sc-val">${esc(m[1].trim() || 'None')}</span>`, isBlock: false };

    m = t.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*=\s*(?:int|float|str|map)?\s*\(?.*(?:input|nhap_so|nhap_chuoi|nhap_so_thuc)\s*\(/i);
    if (m) return { kind: 'input', type: 'sensing', text: `Nhập ${m[1]}`, html: `Hỏi &amp; nhập dữ liệu lưu vào <span class="sc-var">${esc(m[1])}</span>`, isBlock: false };

    m = t.match(/^(?:print|in_ra)\s*\((.*)\)$/i);
    if (m) return { kind: 'print', type: 'looks', text: `In ${m[1].trim() || '""'}`, html: `Hiển thị ra màn hình <span class="sc-val">${esc(m[1].trim() || '""')}</span>`, isBlock: false };

    m = t.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/);
    if (m) {
      const op = { '+=': 'tăng thêm', '-=': 'giảm đi', '*=': 'nhân với', '/=': 'chia cho' }[m[2]];
      return { kind: 'assign', type: 'data', text: `${m[1]} ${m[2]} ${m[3].trim()}`, html: `Thay đổi biến <span class="sc-var">${esc(m[1])}</span> ${op} <span class="sc-val">${esc(m[3].trim())}</span>`, isBlock: false };
    }

    m = t.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*=\s*(.+)$/);
    if (m) return { kind: 'assign', type: 'data', text: `${m[1]} = ${m[2].trim()}`, html: `Đặt biến <span class="sc-var">${esc(m[1])}</span> thành <span class="sc-val">${esc(m[2].trim())}</span>`, isBlock: false };

    if (/^break$/i.test(t)) return { kind: 'break', type: 'control', text: 'Thoát vòng lặp', html: `Thoát vòng lặp (break)`, isBlock: false };
    if (/^continue$/i.test(t)) return { kind: 'continue', type: 'control', text: 'Tiếp tục vòng lặp', html: `Bỏ qua lượt lặp tiếp theo`, isBlock: false };

    return { kind: 'stmt', type: 'stmt', text: t, html: `Lệnh: <span class="sc-val">${esc(t)}</span>`, isBlock: false };
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

  function renderNodesHTML(nodes) {
    return nodes.map((n) => {
      if (n.isBlock) {
        const inner = n.children.length
          ? renderNodesHTML(n.children)
          : `<div class="sc-c-placeholder">Nhấn Tab để thêm lệnh bên trong...</div>`;
        return `<div class="sc-c-wrap sc-c-${n.type}"><div class="sc-c-head">${n.html}</div><div class="sc-c-body">${inner}</div><div class="sc-c-foot"></div></div>`;
      }
      return `<div class="sc-block sc-${n.type}">${n.html}</div>`;
    }).join('');
  }

  function renderScratchHTML(code) {
    const tree = buildTree(code);
    let html = `<div class="sc-stack-root"><div class="sc-hat-block">Khi bấm vào Chạy Chương Trình (V-Code Edu)</div>`;
    if (!tree.length) {
      html += `<div class="sc-empty-hint">Bắt đầu gõ lệnh Python ở khung bên trái (hoặc bấm các nút ví dụ bên trên) để xem khối Scratch 3.0 lắp ghép trực tiếp.</div>`;
    } else {
      html += renderNodesHTML(tree);
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
      return `<div class="sc-empty-hint" style="margin:16px">Chưa có lệnh để vẽ Sơ đồ khối. Hãy gõ lệnh hoặc bấm nút ví dụ (+ Nhập số N, + Vòng lặp for, + Rẽ nhánh if/else).</div>`;
    }

    const W = 520, CX = W / 2, stepY = 78, H = (nodes.length + 2) * stepY + 40;
    const clip = (s, max = 34) => s.length > max ? s.slice(0, max - 1) + '…' : s;
    const parts = [
      `<svg class="v18-flowchart-svg" viewBox="0 0 ${W} ${H}" width="100%" style="max-width:560px;min-height:240px;display:block;margin:10px auto">`,
      `<defs><marker id="fc-arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 1 L 10 5 L 0 9 z" fill="#38BDF8"/></marker></defs>`,
      `<rect x="${CX - 76}" y="14" width="152" height="40" rx="20" fill="#059669" stroke="#34D399" stroke-width="1.8"/>`,
      `<text x="${CX}" y="39" text-anchor="middle" fill="#FFFFFF" font-family="Inter,sans-serif" font-size="13" font-weight="700">BẮT ĐẦU</text>`
    ];

    let prevY = 54;
    nodes.forEach((n, idx) => {
      const y = 34 + (idx + 1) * stepY;
      parts.push(`<line x1="${CX}" y1="${prevY}" x2="${CX}" y2="${y - 26}" stroke="#38BDF8" stroke-width="1.8" marker-end="url(#fc-arr)"/>`);
      const lbl = esc(clip(n.text, 34));

      if (n.kind === 'if' || n.kind === 'elif' || n.kind === 'while' || n.kind === 'for') {
        const rx = 128, ry = 28;
        const fill = (n.kind === 'for' || n.kind === 'while') ? '#C2410C' : '#B45309';
        const stroke = (n.kind === 'for' || n.kind === 'while') ? '#FB923C' : '#FBBF24';
        parts.push(
          `<polygon points="${CX},${y - ry} ${CX + rx},${y} ${CX},${y + ry} ${CX - rx},${y}" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>`,
          `<text x="${CX}" y="${y + 4}" text-anchor="middle" fill="#FFFFFF" font-family="JetBrains Mono,monospace" font-size="11.5" font-weight="700">${lbl}</text>`,
          `<text x="${CX + 12}" y="${y + ry + 13}" fill="#34D399" font-size="10.5" font-weight="700">Đúng</text>`,
          `<text x="${CX + rx + 8}" y="${y - 4}" fill="#F43F5E" font-size="10.5" font-weight="700">Sai</text>`,
          `<path d="M ${CX + rx} ${y} L ${CX + rx + 36} ${y} L ${CX + rx + 36} ${y + stepY - 12} L ${CX + 12} ${y + stepY - 12}" fill="none" stroke="#F43F5E" stroke-width="1.4" stroke-dasharray="4 3"/>`
        );
        prevY = y + ry;
      } else if (n.kind === 'input' || n.kind === 'print') {
        const w = 135, h = 23, sk = 16;
        const fill = n.kind === 'input' ? '#0369A1' : '#6D28D9';
        const stroke = n.kind === 'input' ? '#38BDF8' : '#A78BFA';
        parts.push(
          `<polygon points="${CX - w + sk},${y - h} ${CX + w + sk},${y - h} ${CX + w - sk},${y + h} ${CX - w - sk},${y + h}" fill="${fill}" stroke="${stroke}" stroke-width="1.8"/>`,
          `<text x="${CX}" y="${y + 4}" text-anchor="middle" fill="#FFFFFF" font-family="JetBrains Mono,monospace" font-size="11.5" font-weight="600">${lbl}</text>`
        );
        prevY = y + h;
      } else {
        const w = 136, h = 23;
        parts.push(
          `<rect x="${CX - w}" y="${y - h}" width="${w * 2}" height="${h * 2}" rx="7" fill="${n.kind === 'else' ? '#475569' : '#1E293B'}" stroke="${n.kind === 'else' ? '#94A3B8' : '#60A5FA'}" stroke-width="1.8"/>`,
          `<text x="${CX}" y="${y + 4}" text-anchor="middle" fill="#F8FAFC" font-family="JetBrains Mono,monospace" font-size="11.5" font-weight="600">${lbl}</text>`
        );
        prevY = y + h;
      }
    });

    const endY = 34 + (nodes.length + 1) * stepY;
    parts.push(
      `<line x1="${CX}" y1="${prevY}" x2="${CX}" y2="${endY - 22}" stroke="#38BDF8" stroke-width="1.8" marker-end="url(#fc-arr)"/>`,
      `<rect x="${CX - 76}" y="${endY - 20}" width="152" height="40" rx="20" fill="#BE123C" stroke="#FB7185" stroke-width="1.8"/>`,
      `<text x="${CX}" y="${endY + 5}" text-anchor="middle" fill="#FFFFFF" font-family="Inter,sans-serif" font-size="13" font-weight="700">KẾT THÚC</text>`,
      `</svg>`
    );
    return parts.join('');
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
      || document.getElementById('scratch-view')
      || ws.querySelector('[id*="scratch"][id*="panel"], [id*="scratch"][id*="canvas"], [id*="scratch"][id*="view"], [id*="scratch"][id*="block"], .scratch-canvas, .scratch-stage');

    let flowPane = document.getElementById('flowchart-canvas')
      || document.getElementById('flowchart-view')
      || document.getElementById('flowchart-panel')
      || document.getElementById('flowchart-output')
      || ws.querySelector('[id*="flow"][id*="panel"], [id*="flow"][id*="canvas"], [id*="flow"][id*="view"], [id*="flowchart"], .flowchart-canvas');

    if (scBtn) {
      const tabBar = scBtn.parentElement;
      const rightCol = tabBar?.parentElement;
      if (rightCol) {
        const siblings = [...rightCol.children].filter((el) => el !== tabBar && el.tagName !== 'STYLE');
        if (!scratchPane && siblings[0]) scratchPane = siblings[0];
        if (!flowPane) {
          flowPane = siblings.find((el) => /flow|chart/i.test(el.id + ' ' + el.className)) || siblings[2] || siblings[0];
        }
      }
    }
    return { scratchPane, flowPane, scBtn, fcBtn };
  }

  function syncAll(codeArg) {
    const ed = document.getElementById('code-editor');
    const code = codeArg !== undefined ? codeArg : (ed ? ed.value : '');
    const { scratchPane, flowPane, fcBtn } = findRightPanes();

    if (scratchPane && flowPane && scratchPane === flowPane) {
      const isFlowActive = fcBtn && (fcBtn.classList.contains('active') || fcBtn.getAttribute('aria-selected') === 'true');
      scratchPane.style.minHeight = '440px';
      scratchPane.style.overflow = 'auto';
      scratchPane.innerHTML = isFlowActive ? renderFlowchartSVG(code) : renderScratchHTML(code);
    } else {
      if (scratchPane) {
        scratchPane.style.minHeight = '440px';
        scratchPane.style.overflow = 'auto';
        scratchPane.innerHTML = renderScratchHTML(code);
      }
      if (flowPane) {
        flowPane.style.minHeight = '440px';
        flowPane.style.overflow = 'auto';
        flowPane.innerHTML = renderFlowchartSVG(code);
      }
    }
  }

  const API = {
    parseLine, buildTree, renderScratchHTML, renderFlowchartSVG, syncAll,
    render(code, targetEl) {
      if (targetEl) {
        const el = typeof targetEl === 'string' ? document.getElementById(targetEl) : targetEl;
        if (el) { el.style.minHeight = '420px'; el.innerHTML = renderScratchHTML(code); }
      } else syncAll(code);
    },
    renderFlowchart(code, targetEl) {
      const el = typeof targetEl === 'string' ? document.getElementById(targetEl) : (targetEl || findRightPanes().flowPane);
      if (el) { el.style.minHeight = '420px'; el.innerHTML = renderFlowchartSVG(code); }
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
      setTimeout(trigger, 600);
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

V18_ENGINE_JS = r"""// V-CODE EDU v18.0 — SCROLL SPLIT 3D + OLM CLASSROOM REAL DEADLINE & GRADING
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
    if (!ts) return { expired: false, label: 'Đang mở • Không giới hạn', cls: 'open' };
    const diff = ts - Date.now();
    if (diff <= 0) return { expired: true, label: `Quá hạn • Đã khóa (${formatDateTimeVN(ts)})`, cls: 'expired' };
    const days = Math.floor(diff / 86400000);
    const hrs = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const rem = days > 0 ? `Còn ${days} ngày ${hrs} giờ` : (hrs > 0 ? `Còn ${hrs} giờ ${mins} phút` : `Còn ${Math.max(1, mins)} phút`);
    return { expired: false, label: `Đang mở • ${rem} (Hạn: ${formatDateTimeVN(ts)})`, cls: 'open' };
  }

  function fixThemeToggleIcon() {
    const btn = document.getElementById('theme-toggle-btn') || document.querySelector('[onclick*="toggleTheme"]');
    if (!btn) return;
    const paint = () => {
      const isLight = document.body.classList.contains('light-theme');
      btn.innerHTML = isLight
        ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>'
        : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    };
    paint();
    btn.addEventListener('click', () => setTimeout(paint, 25));
  }

  function initV18ScrollScenes() {
    const scenes = [...document.querySelectorAll('.v18-scene')];
    const dots = [...document.querySelectorAll('.v18-dot-item')];
    if (!scenes.length) return;

    let ticking = false;
    const updateScenes = () => {
      ticking = false;
      const isMobile = window.matchMedia('(max-width: 900px)').matches;
      const vh = window.innerHeight || 800;
      let activeIdx = 0, bestDist = Infinity;

      scenes.forEach((sc, idx) => {
        const rect = sc.getBoundingClientRect();
        const dist = ((rect.top + rect.height / 2) - vh / 2) / vh;
        const absDist = Math.abs(dist);
        if (absDist < bestDist) { bestDist = absDist; activeIdx = idx; }

        const leftEl = sc.querySelector('.v18-split-left');
        const rightEl = sc.querySelector('.v18-split-right');
        const p = Math.min(1, Math.max(0, absDist * 1.15));
        const eased = p * p;

        if (!isMobile && leftEl && rightEl) {
          const sx = eased * 95, ry = eased * 12, scale = 1 - eased * 0.06, op = Math.max(0.18, 1 - eased * 0.85), dir = dist < 0 ? -1 : 1;
          leftEl.style.transform = `perspective(1200px) translate3d(${(-sx).toFixed(1)}px, ${(dir * eased * 22).toFixed(1)}px, 0) rotateY(${ry.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
          leftEl.style.opacity = op.toFixed(2);
          rightEl.style.transform = `perspective(1200px) translate3d(${sx.toFixed(1)}px, ${(dir * eased * 22).toFixed(1)}px, 0) rotateY(${(-ry).toFixed(1)}deg) scale(${scale.toFixed(3)})`;
          rightEl.style.opacity = op.toFixed(2);
        } else {
          if (leftEl) { leftEl.style.transform = ''; leftEl.style.opacity = '1'; }
          if (rightEl) { rightEl.style.transform = ''; rightEl.style.opacity = '1'; }
        }
      });
      dots.forEach((d, i) => d.classList.toggle('active', i === activeIdx));
    };

    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(updateScenes); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    updateScenes();

    window.scrollToV18Scene = (idx) => scenes[idx]?.scrollIntoView({ behavior: 'smooth', block: 'start' });

    if (!window.matchMedia('(pointer: coarse)').matches) {
      document.querySelectorAll('.v18-tilt').forEach((card) => {
        card.addEventListener('mousemove', (e) => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
          card.style.transform = `perspective(1000px) rotateX(${((0.5 - y) * 9).toFixed(2)}deg) rotateY(${((x - 0.5) * 11).toFixed(2)}deg) translateY(-3px)`;
        }, { passive: true });
        card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0)'; });
      });
    }
  }

  let activeOlmTab = 'assignments';

  function getActiveClassObj() {
    const code = window.AppState?.activeClassroomCode;
    return (window.AppState?.olmClasses || []).find((c) => c.code === code) || null;
  }

  function findClassroomDynamicTarget() {
    const clsView = document.getElementById('view-classroom');
    if (!clsView) return null;
    const known = document.getElementById('olm-tab-content')
      || document.getElementById('olm-assignments-list')
      || document.getElementById('classroom-tab-body');
    if (known) return known;

    const tabBtn = [...clsView.querySelectorAll('button')].find((b) => /Thành viên/i.test(b.textContent || ''));
    if (tabBtn) {
      const tabBar = tabBtn.parentElement;
      const card = tabBar?.parentElement;
      if (card) {
        let target = card.querySelector('.v18-olm-dynamic-host');
        if (!target) {
          [...card.children].forEach((ch) => {
            if (ch !== tabBar && !ch.contains(tabBar)) ch.style.display = 'none';
          });
          target = document.createElement('div');
          target.className = 'v18-olm-dynamic-host';
          target.style.marginTop = '16px';
          card.appendChild(target);
        }
        return target;
      }
    }
    return null;
  }

  function enhanceCreateAssignmentModal() {
    const modal = document.getElementById('create-assignment-modal');
    if (!modal) return;
    const form = modal.querySelector('form');
    if (!form) return;

    let dlInput = document.getElementById('assign-deadline');
    if (!dlInput) {
      const oldDue = document.getElementById('assign-due');
      const wrap = document.createElement('div');
      wrap.style.marginBottom = '12px';
      wrap.innerHTML = `
        <label style="display:block;font-size:12.5px;font-weight:700;margin-bottom:5px">Hạn nộp bài (Chọn Giờ : Ngày / Tháng / Năm lịch thật)</label>
        <input type="datetime-local" id="assign-deadline" class="input-field" required />
        <small style="color:var(--text-secondary);font-size:11.5px;display:block;margin-top:4px">Khi hết hạn, hệ thống tự động khóa nộp bài và tổng hợp toàn bộ học sinh đã làm / chưa làm.</small>
      `;
      if (oldDue && oldDue.parentElement) oldDue.parentElement.replaceWith(wrap);
      else {
        const sub = form.querySelector('button[type="submit"]');
        if (sub && sub.parentElement) form.insertBefore(wrap, sub.parentElement);
        else form.appendChild(wrap);
      }
      dlInput = document.getElementById('assign-deadline');
    }

    const setDefaultTomorrow = () => {
      if (!dlInput) return;
      const d = new Date(Date.now() + 86400000);
      const pad = (n) => String(n).padStart(2, '0');
      dlInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`;
    };
    setDefaultTomorrow();

    const origOpen = window.openCreateAssignmentModal;
    window.openCreateAssignmentModal = function () {
      setDefaultTomorrow();
      if (typeof origOpen === 'function') origOpen();
      else modal.classList.add('open');
    };

    form.onsubmit = async function (e) {
      e.preventDefault();
      const code = window.AppState?.activeClassroomCode;
      const u = window.AppState?.user;
      if (!code) { alert('Hãy chọn hoặc tạo một lớp học trước khi giao bài.'); return; }

      const allInputs = [...form.querySelectorAll('input:not([type="hidden"]):not([type="datetime-local"])')];
      const allAreas = [...form.querySelectorAll('textarea')];
      const title = (document.getElementById('assign-title')?.value || allInputs[0]?.value || '').trim();
      const desc = (document.getElementById('assign-desc')?.value || allAreas[0]?.value || '').trim();
      const lang = document.getElementById('assign-lang')?.value || form.querySelector('select')?.value || 'python';
      const starter = document.getElementById('assign-starter')?.value || allAreas[1]?.value || '# Viết lời giải tại đây\n';
      const tcIn = (document.getElementById('assign-tc-in')?.value || '').trim();
      const tcOut = (document.getElementById('assign-tc-out')?.value || '').trim();
      const dlVal = document.getElementById('assign-deadline')?.value || '';
      const deadlineTs = dlVal ? new Date(dlVal).getTime() : (Date.now() + 86400000);

      if (!title) { alert('Vui lòng nhập tiêu đề bài tập.'); return; }

      const asg = {
        id: 'asg_' + Date.now(),
        code: 'BT' + Math.floor(100 + Math.random() * 900),
        classroom_code: code,
        title,
        description: desc || 'Hoàn thành bài tập lập trình theo yêu cầu giáo viên.',
        language: lang,
        deadline_ts: deadlineTs,
        due_date: formatDateTimeVN(deadlineTs),
        starter_code: starter,
        teacher_name: u?.full_name || 'Giáo viên',
        test_cases: tcOut ? [{ input: tcIn, expected: tcOut }] : [{ input: '6', expected: '12' }],
        created_at: Date.now()
      };

      let ok = false;
      if (window.VCodeCloudDB?.isReady()) {
        try { await window.VCodeCloudDB.addAssignment(code, asg); ok = true; } catch (err) { console.error(err); }
      }
      if (!ok && window.LocalClassDB) {
        const ldb = window.LocalClassDB.load();
        const cls = ldb.classes.find((c) => c.code === code);
        if (cls) { cls.assignments = cls.assignments || []; cls.assignments.unshift(asg); window.LocalClassDB.save(ldb); ok = true; }
      }

      if (ok) {
        modal.classList.remove('open');
        form.reset();
        setDefaultTomorrow();
        if (typeof showToast === 'function') showToast(`Đã giao bài tập "${title}" (Hạn: ${asg.due_date})`);
        activeOlmTab = 'assignments';
        await window.renderV18ClassroomState();
      } else {
        alert('Không thể lưu bài tập. Vui lòng kiểm tra kết nối mạng.');
      }
    };
  }

  window.renderV18ClassroomState = async function () {
    const code = window.AppState?.activeClassroomCode;
    if (!code) return;

    let cls = null;
    if (window.VCodeCloudDB?.isReady()) {
      try { cls = await window.VCodeCloudDB.getClass(code); } catch {}
    }
    if (!cls) cls = getActiveClassObj();
    if (!cls) return;

    const list = window.AppState.olmClasses || [];
    const idx = list.findIndex((c) => c.code === code);
    if (idx >= 0) list[idx] = cls;
    else list.unshift(cls);

    if (activeOlmTab === 'discussion') return;

    const host = findClassroomDynamicTarget();
    if (!host) return;

    const u = window.AppState?.user || {};
    const isTeacher = u.role === 'teacher' || u.role === 'admin' || (cls.teacher_email && cls.teacher_email.toLowerCase() === (u.email || '').toLowerCase());
    const students = Array.isArray(cls.students) ? cls.students : [];
    const assignments = Array.isArray(cls.assignments) ? cls.assignments : [];
    const submissions = Array.isArray(cls.submissions) ? cls.submissions : [];

    if (activeOlmTab === 'assignments') {
      if (!assignments.length) {
        host.innerHTML = `<div class="v18-empty-box">Chưa có bài tập nào trong lớp <strong>${esc(cls.name)}</strong>.${isTeacher ? ' Bấm nút <strong>Giao bài tập</strong> ở góc trên bên phải để giao bài kèm hạn nộp lịch thật.' : ''}</div>`;
      } else {
        host.innerHTML = assignments.map((a) => {
          const st = getDeadlineStatus(a);
          const asgSubs = submissions.filter((s) => s.assignment_code === a.code || s.assignment_id === a.id);
          const subEmails = new Set(asgSubs.map((s) => (s.email || s.username || '').toLowerCase()));
          const totalStu = students.length;
          const doneCount = students.length ? students.filter((s) => subEmails.has((s.email || s.username || '').toLowerCase())).length : asgSubs.length;
          const pendingCount = Math.max(0, totalStu - doneCount);
          const avgScore = asgSubs.length ? Math.round(asgSubs.reduce((acc, s) => acc + Number(s.teacher_score ?? s.score ?? 0), 0) / asgSubs.length) : 0;
          const mySub = asgSubs.find((s) => (s.email || '').toLowerCase() === (u.email || '').toLowerCase() || s.username === u.username);

          return `
            <div class="v18-asg-card ${st.cls}">
              <div class="v18-asg-head">
                <div>
                  <div class="v18-asg-tags">
                    <span class="v18-badge lang">${esc((a.language || 'python').toUpperCase())}</span>
                    <span class="v18-badge ${st.cls}">${esc(st.label)}</span>
                  </div>
                  <h4 class="v18-asg-title">${esc(a.title)}</h4>
                  <p class="v18-asg-desc">${esc(a.description)}</p>
                </div>
                <div class="v18-asg-actions">
                  ${isTeacher ? `
                    <button type="button" class="btn btn-primary btn-sm" onclick="openV18AssignmentReport('${esc(a.id || a.code)}')">
                      Tổng hợp &amp; Chấm bài (${doneCount}/${totalStu})
                    </button>
                    <button type="button" class="btn btn-sm" style="color:#F43F5E;border-color:rgba(244,63,94,0.35)" onclick="deleteV18Assignment('${esc(a.id || a.code)}')">Xóa</button>
                  ` : (
                    mySub
                      ? `<button type="button" class="btn btn-sm" onclick="openV18StudentSolve('${esc(a.id || a.code)}', true)">Đã nộp • Điểm: ${mySub.teacher_score ?? mySub.score ?? 0}/100</button>`
                      : (st.expired
                          ? `<button type="button" class="btn btn-sm" disabled style="opacity:0.55;cursor:not-allowed">Quá hạn • Đã khóa</button>`
                          : `<button type="button" class="btn btn-primary btn-sm" onclick="openV18StudentSolve('${esc(a.id || a.code)}', false)">Làm bài ngay</button>`)
                  )}
                </div>
              </div>
              <div class="v18-asg-summary">
                <span>Sĩ số: <strong>${totalStu}</strong></span>
                <span style="color:#10B981">Đã nộp: <strong>${doneCount}</strong></span>
                <span style="color:${st.expired ? '#F43F5E' : '#F59E0B'}">${st.expired ? 'Quá hạn chưa nộp' : 'Chưa làm'}: <strong>${pendingCount}</strong></span>
                <span>Điểm TB: <strong>${asgSubs.length ? avgScore + '/100' : '—'}</strong></span>
              </div>
            </div>`;
        }).join('');
      }
      return;
    }

    if (activeOlmTab === 'members') {
      if (!students.length) {
        host.innerHTML = `<div class="v18-empty-box">Chưa có học sinh nào tham gia lớp <strong>${esc(cls.name)}</strong>. Gửi mã <strong>${esc(cls.code)}</strong> cho học sinh vào lớp.</div>`;
      } else {
        host.innerHTML = `
          <div class="v18-table-wrap">
            <table class="v18-table">
              <thead>
                <tr>
                  <th style="width:64px">STT</th>
                  <th>Họ và tên</th>
                  <th>Email</th>
                  <th>Thời gian tham gia</th>
                  <th style="width:120px">Điểm XP</th>
                </tr>
              </thead>
              <tbody>
                ${students.map((s, i) => `
                  <tr>
                    <td>${i + 1}</td>
                    <td><strong>${esc(s.full_name || s.username)}</strong></td>
                    <td style="color:var(--text-secondary)">${esc(s.email || '—')}</td>
                    <td style="color:var(--text-secondary)">${s.joined_at ? formatDateTimeVN(s.joined_at) : '—'}</td>
                    <td><span class="v18-xp-pill">${s.xp || 100} XP</span></td>
                  </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
      }
      return;
    }

    if (activeOlmTab === 'realtime') {
      const activeMap = cls.live_sessions || {};
      const now = Date.now();
      if (!students.length) {
        host.innerHTML = `<div class="v18-empty-box">Chưa có học sinh nào trong lớp để theo dõi trực tuyến.</div>`;
      } else {
        host.innerHTML = `
          <div class="v18-rt-note">Theo dõi trực tuyến chỉ hiển thị 2 trạng thái: <strong>Đang làm bài</strong> hoặc <strong>Đang tắt (Off)</strong>. Bài đã nộp được quản lý và chấm điểm tập trung tại mục <strong>Bài tập</strong>.</div>
          <div class="v18-table-wrap">
            <table class="v18-table">
              <thead>
                <tr>
                  <th style="width:64px">STT</th>
                  <th>Học sinh</th>
                  <th>Email</th>
                  <th>Trạng thái trực tuyến</th>
                  <th>Bài đang thực hiện</th>
                </tr>
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
                      <td style="color:var(--text-secondary)">${esc(s.email || '—')}</td>
                      <td>
                        <span class="v18-rt-badge ${isWorking ? 'working' : 'off'}">
                          <span class="rt-dot"></span>${isWorking ? 'Đang làm bài' : 'Đang tắt (Off)'}
                        </span>
                      </td>
                      <td style="color:var(--text-secondary)">${isWorking ? esc(sess.task_title || 'Đang mở bài tập') : '—'}</td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>`;
      }
    }
  };

  window.deleteV18Assignment = async function (asgId) {
    const code = window.AppState?.activeClassroomCode;
    if (!code || !confirm('Bạn có chắc muốn xóa bài tập này?')) return;
    if (window.VCodeCloudDB?.isReady()) await window.VCodeCloudDB.deleteAssignment(code, asgId);
    await window.renderV18ClassroomState();
  };

  window.openV18AssignmentReport = async function (asgId) {
    const code = window.AppState?.activeClassroomCode;
    const cls = (window.VCodeCloudDB?.isReady() ? await window.VCodeCloudDB.getClass(code) : null) || getActiveClassObj();
    if (!cls) return;
    const asg = (cls.assignments || []).find((a) => String(a.id) === String(asgId) || String(a.code) === String(asgId));
    if (!asg) return;

    const students = cls.students || [];
    const subs = (cls.submissions || []).filter((s) => s.assignment_code === asg.code || s.assignment_id === asg.id);
    const st = getDeadlineStatus(asg);

    const rows = students.map((stu, i) => {
      const sub = subs.find((x) => (x.email || '').toLowerCase() === (stu.email || '').toLowerCase() || x.username === stu.username);
      const badge = sub
        ? `<span class="v18-badge open">Đã nộp</span>`
        : (st.expired ? `<span class="v18-badge expired">Quá hạn • Chưa nộp</span>` : `<span class="v18-badge pending">Chưa làm</span>`);
      return `
        <tr>
          <td>${i + 1}</td>
          <td><strong>${esc(stu.full_name || stu.username)}</strong></td>
          <td style="color:var(--text-secondary)">${esc(stu.email || '—')}</td>
          <td>${badge}</td>
          <td style="color:var(--text-secondary)">${sub?.submitted_at ? formatDateTimeVN(sub.submitted_at) : '—'}</td>
          <td>${sub ? `<strong>${sub.teacher_score ?? sub.score ?? 0}/100</strong>` : '—'}</td>
          <td>${sub ? `<button type="button" class="btn btn-primary btn-sm" onclick="openV18GradeModal('${esc(asg.id || asg.code)}','${esc(stu.email || stu.username)}')">Xem bài &amp; Chấm</button>` : `<span style="color:var(--text-secondary);font-size:12px">Chưa nộp</span>`}</td>
        </tr>`;
    }).join('');

    const doneCount = students.filter((stu) => subs.some((x) => (x.email || '').toLowerCase() === (stu.email || '').toLowerCase() || x.username === stu.username)).length;
    const modal = document.getElementById('v18-report-modal');
    if (!modal) return;
    document.getElementById('v18-report-body').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap;margin-bottom:16px">
        <div>
          <span class="v18-badge ${st.cls}">${esc(st.label)}</span>
          <h3 style="margin:8px 0 4px">${esc(asg.title)}</h3>
          <p style="margin:0;font-size:13px;color:var(--text-secondary)">${esc(asg.description)}</p>
        </div>
        <button type="button" class="btn btn-sm" onclick="document.getElementById('v18-report-modal').classList.remove('open')">Đóng</button>
      </div>
      <div class="v18-report-stats">
        <div><span>Tổng sĩ số</span><strong>${students.length}</strong></div>
        <div><span>Đã nộp bài</span><strong style="color:#10B981">${doneCount}</strong></div>
        <div><span>Chưa làm</span><strong style="color:${st.expired ? '#F43F5E' : '#F59E0B'}">${Math.max(0, students.length - doneCount)}</strong></div>
      </div>
      <div class="v18-table-wrap">
        <table class="v18-table">
          <thead><tr><th>STT</th><th>Học sinh</th><th>Email</th><th>Trạng thái</th><th>Thời gian nộp</th><th>Điểm</th><th>Chấm bài</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:18px;color:var(--text-secondary)">Lớp chưa có học sinh.</td></tr>'}</tbody>
        </table>
      </div>`;
    modal.classList.add('open');
  };

  window.openV18GradeModal = async function (asgId, stuKey) {
    const code = window.AppState?.activeClassroomCode;
    const cls = (window.VCodeCloudDB?.isReady() ? await window.VCodeCloudDB.getClass(code) : null) || getActiveClassObj();
    if (!cls) return;
    const asg = (cls.assignments || []).find((a) => String(a.id) === String(asgId) || String(a.code) === String(asgId));
    const sub = (cls.submissions || []).find((s) =>
      (s.assignment_code === asg?.code || s.assignment_id === asg?.id) &&
      ((s.email || '').toLowerCase() === stuKey.toLowerCase() || s.username === stuKey)
    );
    if (!sub) return;

    const modal = document.getElementById('v18-grade-modal');
    if (!modal) return;
    document.getElementById('v18-grade-body').innerHTML = `
      <h3 style="margin:0 0 6px">Chấm bài: ${esc(sub.full_name || sub.username)}</h3>
      <p style="font-size:12.5px;color:var(--text-secondary);margin:0 0 12px">Bài tập: <strong>${esc(asg.title)}</strong> • Điểm tự động: <strong>${sub.score ?? 0}/100</strong></p>
      <pre class="v18-code-preview">${esc(sub.code || '# Không có mã nguồn')}</pre>
      <form id="v18-grade-form" style="margin-top:14px">
        <div style="display:grid;grid-template-columns:160px 1fr;gap:12px">
          <div>
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Điểm giáo viên (0-100)</label>
            <input type="number" id="v18-grade-score" class="input-field" min="0" max="100" value="${sub.teacher_score ?? sub.score ?? 0}" required />
          </div>
          <div>
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Nhận xét giáo viên</label>
            <input type="text" id="v18-grade-note" class="input-field" value="${esc(sub.teacher_note || '')}" placeholder="Nhập nhận xét cho học sinh..." />
          </div>
        </div>
        <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
          <button type="button" class="btn btn-sm" onclick="document.getElementById('v18-grade-modal').classList.remove('open')">Đóng</button>
          <button type="submit" class="btn btn-primary btn-sm">Lưu điểm &amp; Nhận xét</button>
        </div>
      </form>`;
    modal.classList.add('open');

    document.getElementById('v18-grade-form').onsubmit = async (e) => {
      e.preventDefault();
      sub.teacher_score = Number(document.getElementById('v18-grade-score').value || 0);
      sub.teacher_note = document.getElementById('v18-grade-note').value.trim();
      sub.graded_at = Date.now();
      if (window.VCodeCloudDB?.isReady()) await window.VCodeCloudDB.saveSubmission(code, sub);
      modal.classList.remove('open');
      if (typeof showToast === 'function') showToast('Đã lưu điểm chấm bài lên hệ thống!');
      await window.openV18AssignmentReport(asgId);
      await window.renderV18ClassroomState();
    };
  };

  window.openV18StudentSolve = async function (asgId, readOnly) {
    const code = window.AppState?.activeClassroomCode;
    const u = window.AppState?.user || {};
    const cls = (window.VCodeCloudDB?.isReady() ? await window.VCodeCloudDB.getClass(code) : null) || getActiveClassObj();
    if (!cls) return;
    const asg = (cls.assignments || []).find((a) => String(a.id) === String(asgId) || String(a.code) === String(asgId));
    if (!asg) return;
    const st = getDeadlineStatus(asg);
    const oldSub = (cls.submissions || []).find((s) =>
      (s.assignment_code === asg.code || s.assignment_id === asg.id) &&
      ((s.email || '').toLowerCase() === (u.email || '').toLowerCase() || s.username === u.username)
    );
    const locked = Boolean(readOnly || st.expired);

    if (!locked && window.VCodeCloudDB?.isReady() && u.email) {
      const key = u.email.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
      window.VCodeCloudDB.updateClass(code, { [`live_sessions.${key}`]: { updated_at: Date.now(), task_title: asg.title } }).catch(() => {});
    }

    const modal = document.getElementById('v18-solve-modal');
    if (!modal) return;
    document.getElementById('v18-solve-body').innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:12px">
        <div>
          <span class="v18-badge ${st.cls}">${esc(st.label)}</span>
          <h3 style="margin:6px 0 4px">${esc(asg.title)}</h3>
          <p style="margin:0;font-size:13px;color:var(--text-secondary)">${esc(asg.description)}</p>
        </div>
        <button type="button" class="btn btn-sm" onclick="document.getElementById('v18-solve-modal').classList.remove('open')">Đóng</button>
      </div>
      ${oldSub ? `<div class="v18-rt-note" style="margin-bottom:10px">Điểm của bạn: <strong>${oldSub.teacher_score ?? oldSub.score ?? 0}/100</strong>${oldSub.teacher_note ? ' • Nhận xét GV: <strong>' + esc(oldSub.teacher_note) + '</strong>' : ''}</div>` : ''}
      <textarea id="v18-solve-editor" class="input-field mono" rows="12" ${locked ? 'readonly' : ''} style="width:100%;font-family:'JetBrains Mono',monospace;font-size:13.5px;line-height:1.6">${esc(oldSub?.code || asg.starter_code || '# Viết lời giải tại đây\n')}</textarea>
      <div id="v18-solve-out" style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(0,0,0,0.3);font-family:'JetBrains Mono',monospace;font-size:12.5px;min-height:42px;color:#94A3B8">Bấm "Chạy thử" hoặc "Nộp bài" để chấm điểm tự động.</div>
      <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:14px">
        <button type="button" class="btn btn-sm" id="v18-solve-run">Chạy thử</button>
        ${locked ? '' : `<button type="button" class="btn btn-primary btn-sm" id="v18-solve-submit">Nộp bài &amp; Chấm điểm</button>`}
      </div>`;
    modal.classList.add('open');

    const ed = document.getElementById('v18-solve-editor');
    const out = document.getElementById('v18-solve-out');
    document.getElementById('v18-solve-run').onclick = () => {
      const tc = (asg.test_cases || [])[0] || { input: '' };
      const res = window.VCodeIDE.runPython(ed.value, tc.input);
      out.innerHTML = res.ok
        ? `<span style="color:#10B981">KẾT QUẢ CHẠY THỬ (input: ${esc(tc.input)}):</span>\n<pre style="margin:4px 0 0;color:#F8FAFC">${esc(res.output)}</pre>`
        : `<span style="color:#F43F5E">LỖI: ${esc(res.error)}</span>`;
    };

    const subBtn = document.getElementById('v18-solve-submit');
    if (subBtn) {
      subBtn.onclick = async () => {
        if (getDeadlineStatus(asg).expired) {
          alert('Đã quá hạn nộp bài! Hệ thống đã khóa nộp bài.');
          modal.classList.remove('open');
          await window.renderV18ClassroomState();
          return;
        }
        const graded = window.VCodeIDE.gradeSubmission(ed.value, asg.test_cases || []);
        const subObj = {
          assignment_id: asg.id, assignment_code: asg.code,
          username: u.username || u.email, email: (u.email || '').toLowerCase(),
          full_name: u.full_name || u.username || 'Học sinh',
          code: ed.value, score: graded.score, passed: graded.passed, total: graded.total,
          submitted_at: Date.now()
        };
        if (window.VCodeCloudDB?.isReady()) await window.VCodeCloudDB.saveSubmission(code, subObj);
        modal.classList.remove('open');
        if (typeof showToast === 'function') showToast(`Đã nộp bài thành công! Điểm tự động: ${graded.score}/100`);
        await window.renderV18ClassroomState();
      };
    }
  };

  window.addEventListener('DOMContentLoaded', () => {
    fixThemeToggleIcon();
    initV18ScrollScenes();
    enhanceCreateAssignmentModal();

    const clsView = document.getElementById('view-classroom');
    if (clsView) {
      clsView.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const txt = (btn.textContent || '').trim();
        if (/^Bài tập$/i.test(txt)) { activeOlmTab = 'assignments'; setTimeout(() => window.renderV18ClassroomState(), 40); }
        else if (/^Thành viên$/i.test(txt)) { activeOlmTab = 'members'; setTimeout(() => window.renderV18ClassroomState(), 40); }
        else if (/Học trực tuyến|Real-time/i.test(txt)) { activeOlmTab = 'realtime'; setTimeout(() => window.renderV18ClassroomState(), 40); }
        else if (/Thảo luận/i.test(txt)) { activeOlmTab = 'discussion'; }
      });
    }

    const origSelect = window.selectOlmClass;
    if (typeof origSelect === 'function') {
      window.selectOlmClass = async function (code) {
        await origSelect(code);
        setTimeout(() => window.renderV18ClassroomState(), 60);
      };
    }
    const origInit = window.initClassroomPortalData;
    if (typeof origInit === 'function') {
      window.initClassroomPortalData = async function () {
        await origInit();
        setTimeout(() => window.renderV18ClassroomState(), 80);
      };
    }

    setInterval(() => {
      if (clsView && clsView.classList.contains('active') && activeOlmTab !== 'discussion') {
        window.renderV18ClassroomState();
      }
    }, 30000);
  });
})();
"""

V18_HOME_INNER = """
      <div class="v18-bg-stage" aria-hidden="true">
        <div class="v18-grid-3d"></div>
        <div class="v18-glow-orb orb-1"></div>
        <div class="v18-glow-orb orb-2"></div>
      </div>

      <aside class="v18-scene-dots" aria-label="Điều hướng phân cảnh">
        <button type="button" class="v18-dot-item active" onclick="scrollToV18Scene(0)"><span>01. Khởi đầu</span><i></i></button>
        <button type="button" class="v18-dot-item" onclick="scrollToV18Scene(1)"><span>02. IDE &amp; Scratch</span><i></i></button>
        <button type="button" class="v18-dot-item" onclick="scrollToV18Scene(2)"><span>03. Lớp học Số</span><i></i></button>
        <button type="button" class="v18-dot-item" onclick="scrollToV18Scene(3)"><span>04. Lộ trình &amp; Thi</span><i></i></button>
      </aside>

      <!-- PHÂN CẢNH 01: TRÁI TIÊU ĐỀ - PHẢI BẢNG LOGO ANIMATION 3D -->
      <section class="v18-scene v18-scene-hero">
        <div class="v18-scene-inner">
          <div class="v18-split-left">
            <div class="v18-badge-top">
              <span class="v18-live-dot"></span>
              <span>V-CODE EDU • HỆ SINH THÁI GIÁO DỤC LẬP TRÌNH VIỆT NAM</span>
            </div>
            <h1 class="v18-hero-title">
              Khơi mở <span class="v18-accent-text">tư duy lập trình</span><br/>
              cho thế hệ trẻ Việt Nam.
            </h1>
            <p class="v18-hero-sub">
              Nền tảng học tập công nghệ toàn diện kết hợp lộ trình 250+ bài học chuẩn hóa, trình biên dịch đa ngôn ngữ gắn Scratch 3.0 &amp; Sơ đồ khối thời gian thực và lớp học số đồng bộ đám mây.
            </p>
            <div class="v18-lang-row">
              <span class="v18-lang-pill" onclick="switchView('workspace')">Python 3</span>
              <span class="v18-lang-pill" onclick="switchView('workspace')">Python Tiếng Việt</span>
              <span class="v18-lang-pill" onclick="switchView('learning')">HTML5 &amp; CSS3</span>
              <span class="v18-lang-pill" onclick="switchView('learning')">Ngôn ngữ C</span>
              <span class="v18-lang-pill" onclick="switchView('learning')">C++ HSG</span>
            </div>
            <div class="v18-cta-row">
              <button type="button" class="v18-btn-primary" onclick="switchView('learning')">Khám phá 250+ Bài học &rarr;</button>
              <button type="button" class="v18-btn-blue" onclick="switchView('classroom')">Vào Lớp học Trực tuyến</button>
              <button type="button" class="v18-btn-ghost" onclick="switchView('workspace')">Mở IDE thực hành</button>
            </div>
            <div class="v18-stats-strip">
              <div><strong>250+</strong><span>Bài học 5 khóa chuẩn</span></div>
              <div><strong>05</strong><span>Ngôn ngữ lập trình</span></div>
              <div><strong>100</strong><span>Chặng thử thách</span></div>
              <div><strong>Online/Offline</strong><span>Hoạt động mọi lúc</span></div>
            </div>
          </div>

          <div class="v18-split-right">
            <div class="v18-logo-board v18-tilt">
              <div class="v18-board-orbit orbit-a"></div>
              <div class="v18-board-orbit orbit-b"></div>

              <div class="v18-board-stage">
                <span class="v18-float-tag tag-tl">Scratch Live</span>
                <span class="v18-float-tag tag-tr">Sơ đồ khối SVG</span>
                <span class="v18-float-tag tag-bl">Lớp học V-Code</span>
                <span class="v18-float-tag tag-br">100 Chặng Game</span>

                <div class="v18-logo-frame">
                  <img src="assets/logo.jpg" alt="V-Code Edu Logo" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'" />
                  <div class="v18-logo-fallback" style="display:none">V</div>
                </div>
              </div>

              <div class="v18-board-caption">
                <h3>V-Code Edu Platform</h3>
                <p>Từ kéo-thả trực quan đến thuật toán chuyên sâu • Đồng bộ Cloud thời gian thực</p>
              </div>

              <div class="v18-board-tiles">
                <div class="v18-mini-tile" onclick="switchView('workspace')">
                  <strong style="color:#10B981">Live Sync</strong>
                  <span>Python &rarr; Scratch</span>
                </div>
                <div class="v18-mini-tile" onclick="switchView('classroom')">
                  <strong style="color:#38BDF8">Auto-Grade</strong>
                  <span>Chấm Test tự động</span>
                </div>
                <div class="v18-mini-tile" onclick="switchView('classroom')">
                  <strong style="color:#A78BFA">Real-Time</strong>
                  <span>Hạn nộp lịch thật</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- PHÂN CẢNH 02: IDE + SCRATCH LIVE + SƠ ĐỒ KHỐI -->
      <section class="v18-scene">
        <div class="v18-scene-inner">
          <div class="v18-split-left">
            <div class="v18-showcase-card v18-tilt">
              <div class="v18-sc-topbar"><span></span><span></span><span></span><small>main.py • Scratch 3.0 Live</small></div>
              <div class="v18-dual-preview">
                <pre class="v18-code-box"><code>n = int(input("Nhập N: "))
tong = 0
for i in range(1, n + 1):
    if i % 2 == 0:
        tong += i
print(tong)</code></pre>
                <div class="v18-blocks-demo">
                  <div class="sc-hat-block">Khi bấm Chạy Chương Trình</div>
                  <div class="sc-block sc-sensing">Nhập dữ liệu lưu vào <span class="sc-var">n</span></div>
                  <div class="sc-c-wrap sc-c-loop">
                    <div class="sc-c-head">Lặp <span class="sc-var">i</span> trong <span class="sc-val">1, n + 1</span></div>
                    <div class="sc-c-body">
                      <div class="sc-c-wrap sc-c-control">
                        <div class="sc-c-head">Nếu <span class="sc-cond">i % 2 == 0</span> thì</div>
                        <div class="sc-c-body">
                          <div class="sc-block sc-data">Tăng <span class="sc-var">tong</span> thêm <span class="sc-val">i</span></div>
                        </div>
                        <div class="sc-c-foot"></div>
                      </div>
                    </div>
                    <div class="sc-c-foot"></div>
                  </div>
                  <div class="sc-block sc-looks">Hiển thị <span class="sc-val">tong</span></div>
                </div>
              </div>
            </div>
          </div>

          <div class="v18-split-right">
            <span class="v18-scene-kicker">PHÂN CẢNH 02 • CẦU NỐI TƯ DUY TRỰC QUAN</span>
            <h2 class="v18-scene-title">Gõ Python tới đâu, khối Scratch &amp; Sơ đồ khối dựng tới đó</h2>
            <p class="v18-scene-desc">
              Trình soạn thảo hỗ trợ phím <code>Tab</code>, tự động thụt lề sau <code>if / for / while</code>, nhập dữ liệu <code>input()</code> trực tiếp bằng hộp thoại và tự động chuyển đổi sang khối lệnh Scratch 3.0 cùng Sơ đồ khối SVG sắc nét.
            </p>
            <div class="v18-feature-list">
              <div class="v18-fl-item"><strong>100% Chính xác cú pháp</strong><span>Hỗ trợ song song Python chuẩn và Python Tiếng Việt.</span></div>
              <div class="v18-fl-item"><strong>Sơ đồ khối tự động</strong><span>Trực quan hóa luồng điều kiện Đúng/Sai cho học sinh THCS &amp; THPT.</span></div>
            </div>
            <button type="button" class="v18-btn-primary" onclick="switchView('workspace')">Mở IDE &amp; Scratch Live &rarr;</button>
          </div>
        </div>
      </section>

      <!-- PHÂN CẢNH 03: LỚP HỌC SỐ CLOUD CHUẨN OLM -->
      <section class="v18-scene">
        <div class="v18-scene-inner">
          <div class="v18-split-left">
            <span class="v18-scene-kicker">PHÂN CẢNH 03 • QUẢN TRỊ LỚP HỌC SỐ</span>
            <h2 class="v18-scene-title">Giao bài hẹn lịch thật, tự khóa quá hạn &amp; tổng hợp như OLM</h2>
            <p class="v18-scene-desc">
              Giáo viên tạo nhiều lớp học, chọn chính xác Giờ / Ngày / Tháng / Năm hết hạn cho từng bài tập. Hết thời gian hệ thống tự khóa nộp bài, tổng hợp toàn bộ danh sách học sinh đã làm — chưa làm và cho chấm điểm ngay trên mã nguồn.
            </p>
            <div class="v18-feature-list">
              <div class="v18-fl-item"><strong>Đồng bộ Firebase Cloud</strong><span>Học sinh vào lớp bằng mã ID trên điện thoại hoặc máy tính.</span></div>
              <div class="v18-fl-item"><strong>Theo dõi trực tuyến sạch</strong><span>Phân tách rõ trạng thái Đang làm bài / Đang tắt và bảng điểm bài tập.</span></div>
            </div>
            <button type="button" class="v18-btn-blue" onclick="switchView('classroom')">Vào Không gian Lớp học &rarr;</button>
          </div>

          <div class="v18-split-right">
            <div class="v18-showcase-card v18-tilt">
              <div class="v18-sc-topbar"><span></span><span></span><span></span><small>Bảng tổng hợp bài tập • Cloud Sync</small></div>
              <div class="v18-olm-preview">
                <div class="v18-op-row head"><span>Học sinh</span><span>Trạng thái</span><span>Điểm</span></div>
                <div class="v18-op-row"><strong>Nguyễn Minh Anh</strong><span class="v18-badge open">Đã nộp</span><strong>100/100</strong></div>
                <div class="v18-op-row"><strong>Trần Hoàng Nam</strong><span class="v18-badge open">Đã nộp</span><strong>90/100</strong></div>
                <div class="v18-op-row"><strong>Lê Thảo Vy</strong><span class="v18-badge pending">Chưa làm</span><strong>—</strong></div>
                <div class="v18-op-row"><strong>Phạm Gia Huy</strong><span class="v18-badge expired">Quá hạn</span><strong>0/100</strong></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- PHÂN CẢNH 04: HỆ SINH THÁI -->
      <section class="v18-scene">
        <div class="v18-scene-inner v18-scene-stack">
          <div class="v18-split-left" style="width:100%">
            <span class="v18-scene-kicker">PHÂN CẢNH 04 • HỆ SINH THÁI TOÀN DIỆN</span>
            <h2 class="v18-scene-title">Sẵn sàng chinh phục mọi kỳ thi Tin học</h2>
          </div>
          <div class="v18-split-right" style="width:100%">
            <div class="v18-bento-4">
              <div class="v18-bento-card v18-tilt" onclick="switchView('learning')">
                <span class="v18-bc-num">01</span>
                <h4>Lộ trình 250+ Bài học</h4>
                <p>5 khóa học chuẩn hóa từ căn bản đến nâng cao cho học sinh THCS &amp; THPT.</p>
              </div>
              <div class="v18-bento-card v18-tilt" onclick="switchView('workspace')">
                <span class="v18-bc-num">02</span>
                <h4>IDE Đa ngôn ngữ</h4>
                <p>Chạy code trực tiếp không cần cài phần mềm, kèm Scratch Live &amp; Sơ đồ khối.</p>
              </div>
              <div class="v18-bento-card v18-tilt" onclick="switchView('classroom')">
                <span class="v18-bc-num">03</span>
                <h4>Lớp học Đám mây</h4>
                <p>Quản lý nhiều lớp, giao bài hẹn giờ thật, chấm tự động và lưu điểm bền vững.</p>
              </div>
              <div class="v18-bento-card v18-tilt" onclick="switchView('challenges')">
                <span class="v18-bc-num">04</span>
                <h4>100 Chặng Thử thách</h4>
                <p>Đấu trường thuật toán phân hạng từ Rank D đến BOSS luyện thi HSG.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
"""

V18_CSS = """
/* ==================== V18.0: FULLSCREEN 3D HOME + MENU ANIM + SCRATCH C-BLOCKS + OLM CLASSROOM ==================== */
.v18-home-root.active,
#view-home.active,
#home-view.active {
  display: block !important;
  width: 100% !important;
  max-width: none !important;
  grid-template-columns: none !important;
  padding: 0 !important;
  margin: 0 !important;
  position: relative;
  overflow-x: hidden;
  background: #050508 !important;
  color: #F8FAFC;
}
body.light-theme .v18-home-root.active,
body.light-theme #view-home.active,
body.light-theme #home-view.active {
  background: #F8FAFC !important;
  color: #0F172A;
}

.top-nav button, nav button, .nav-pills button, .nav-item, .drawer-nav-item {
  position: relative;
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), background-color 0.22s ease, color 0.22s ease, box-shadow 0.22s ease !important;
}
.top-nav button:hover, nav button:hover, .nav-pills button:hover { transform: translateY(-2px); }
.top-nav button:active, nav button:active, .nav-pills button:active { transform: scale(0.96); }
#left-drawer, .left-drawer { transition: transform 0.34s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.28s ease !important; }

.v18-bg-stage { position: fixed; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.v18-grid-3d {
  position: absolute; left: -20%; right: -20%; bottom: -160px; height: 62vh;
  background-image: linear-gradient(to right, rgba(16, 185, 129, 0.12) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(56, 189, 248, 0.12) 1px, transparent 1px);
  background-size: 64px 64px;
  transform: perspective(650px) rotateX(68deg);
  animation: v18GridSlide 18s linear infinite;
  mask-image: linear-gradient(to top, rgba(0,0,0,0.85), transparent 82%);
}
body.light-theme .v18-grid-3d {
  background-image: linear-gradient(to right, rgba(15, 23, 42, 0.08) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(15, 23, 42, 0.08) 1px, transparent 1px);
}
@keyframes v18GridSlide { from { background-position: 0 0; } to { background-position: 0 64px; } }
.v18-glow-orb { position: absolute; border-radius: 50%; filter: blur(90px); opacity: 0.26; }
.v18-glow-orb.orb-1 { width: 520px; height: 520px; top: -120px; left: -120px; background: #10B981; }
.v18-glow-orb.orb-2 { width: 560px; height: 560px; top: 18%; right: -160px; background: #2563EB; }
body.light-theme .v18-glow-orb { opacity: 0.11; }

.v18-scene-dots { position: fixed; right: 20px; top: 50%; transform: translateY(-50%); z-index: 30; display: flex; flex-direction: column; gap: 14px; }
.v18-dot-item { display: flex; align-items: center; justify-content: flex-end; gap: 10px; background: transparent; border: none; cursor: pointer; padding: 2px 0; color: rgba(148, 163, 184, 0.65); font-family: 'JetBrains Mono', monospace; font-size: 11px; transition: color 0.2s ease; }
.v18-dot-item i { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid rgba(148, 163, 184, 0.55); transition: transform 0.25s ease, background-color 0.25s ease, border-color 0.25s ease; }
.v18-dot-item.active { color: #10B981; font-weight: 700; }
.v18-dot-item.active i { background: #10B981; border-color: #10B981; transform: scale(1.35); box-shadow: 0 0 12px rgba(16, 185, 129, 0.7); }

.v18-scene { position: relative; z-index: 1; min-height: calc(100vh - 64px); width: 100%; display: flex; align-items: center; justify-content: center; padding: 48px clamp(24px, 5vw, 80px); border-bottom: 1px solid rgba(148, 163, 184, 0.1); }
.v18-scene-inner { width: 100%; max-width: 1440px; display: grid; grid-template-columns: 1.08fr 0.92fr; gap: clamp(28px, 4vw, 64px); align-items: center; }
.v18-scene-inner.v18-scene-stack { display: flex; flex-direction: column; align-items: stretch; gap: 32px; }
.v18-split-left, .v18-split-right { will-change: transform, opacity; transition: transform 0.08s linear, opacity 0.12s linear; }

.v18-badge-top { display: inline-flex; align-items: center; gap: 9px; padding: 7px 14px; border-radius: 999px; margin-bottom: 22px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700; color: #34D399; letter-spacing: 0.06em; }
.v18-live-dot { width: 8px; height: 8px; border-radius: 50%; background: #10B981; box-shadow: 0 0 10px #10B981; }
.v18-hero-title { font-size: clamp(34px, 4.4vw, 60px); line-height: 1.08; font-weight: 900; letter-spacing: -0.03em; margin: 0 0 18px; }
.v18-accent-text { background: linear-gradient(90deg, #10B981 0%, #38BDF8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.v18-hero-sub { font-size: 16px; line-height: 1.65; color: #94A3B8; max-width: 600px; margin: 0 0 22px; }
body.light-theme .v18-hero-sub { color: #475569; }

.v18-lang-row { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 26px; }
.v18-lang-pill { padding: 6px 13px; border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(148, 163, 184, 0.22); color: #E2E8F0; transition: border-color 0.2s, transform 0.2s; }
.v18-lang-pill:hover { border-color: #10B981; transform: translateY(-2px); }
body.light-theme .v18-lang-pill { background: #FFFFFF; color: #0F172A; border-color: #CBD5E1; }

.v18-cta-row { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 34px; }
.v18-btn-primary, .v18-btn-blue, .v18-btn-ghost { padding: 13px 22px; border-radius: 10px; font-size: 14px; font-weight: 700; cursor: pointer; border: none; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; }
.v18-btn-primary { background: linear-gradient(90deg, #10B981, #059669); color: #022C22; box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3); }
.v18-btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(16, 185, 129, 0.45); }
.v18-btn-blue { background: linear-gradient(90deg, #3B82F6, #2563EB); color: #FFFFFF; box-shadow: 0 8px 24px rgba(59, 130, 246, 0.3); }
.v18-btn-blue:hover { transform: translateY(-2px); box-shadow: 0 12px 30px rgba(59, 130, 246, 0.45); }
.v18-btn-ghost { background: rgba(255, 255, 255, 0.04); color: #F8FAFC; border: 1px solid rgba(148, 163, 184, 0.28); }
.v18-btn-ghost:hover { border-color: #38BDF8; transform: translateY(-2px); }
body.light-theme .v18-btn-ghost { background: #FFFFFF; color: #0F172A; border-color: #CBD5E1; }

.v18-stats-strip { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 18px; padding-top: 22px; border-top: 1px solid rgba(148, 163, 184, 0.16); }
.v18-stats-strip strong { display: block; font-family: 'JetBrains Mono', monospace; font-size: 22px; color: #34D399; margin-bottom: 3px; }
.v18-stats-strip span { font-size: 12px; color: #94A3B8; }

.v18-logo-board { position: relative; overflow: hidden; border-radius: 22px; padding: 30px 28px 26px; background: linear-gradient(155deg, rgba(16, 24, 42, 0.94), rgba(6, 9, 18, 0.98)); border: 1px solid rgba(56, 189, 248, 0.26); box-shadow: 0 32px 70px rgba(0, 0, 0, 0.6); transform-style: preserve-3d; transition: transform 0.2s ease-out; }
body.light-theme .v18-logo-board { background: linear-gradient(155deg, #FFFFFF, #F1F5F9); border-color: #CBD5E1; box-shadow: 0 24px 50px rgba(15, 23, 42, 0.1); }
.v18-board-orbit { position: absolute; border-radius: 50%; border: 1px dashed rgba(16, 185, 129, 0.24); pointer-events: none; left: 50%; top: 36%; transform: translate(-50%, -50%); }
.v18-board-orbit.orbit-a { width: 250px; height: 250px; animation: v18Spin 26s linear infinite; }
.v18-board-orbit.orbit-b { width: 340px; height: 340px; border-color: rgba(56, 189, 248, 0.18); animation: v18Spin 38s linear infinite reverse; }
@keyframes v18Spin { from { transform: translate(-50%, -50%) rotate(0deg); } to { transform: translate(-50%, -50%) rotate(360deg); } }

.v18-board-stage { position: relative; height: 220px; display: grid; place-items: center; margin-bottom: 18px; }
.v18-logo-frame { width: 124px; height: 124px; border-radius: 24px; padding: 10px; background: #FFFFFF; box-shadow: 0 0 42px rgba(16, 185, 129, 0.35), 0 16px 32px rgba(0, 0, 0, 0.45); display: grid; place-items: center; position: relative; z-index: 2; animation: v18FloatLogo 4.6s ease-in-out infinite; }
.v18-logo-frame img { width: 100%; height: 100%; object-fit: contain; border-radius: 16px; }
.v18-logo-fallback { width: 100%; height: 100%; place-items: center; font-size: 48px; font-weight: 900; color: #059669; }
@keyframes v18FloatLogo { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

.v18-float-tag { position: absolute; z-index: 3; padding: 6px 12px; border-radius: 8px; font-size: 11.5px; font-weight: 700; background: rgba(15, 23, 42, 0.92); color: #F8FAFC; border: 1px solid rgba(148, 163, 184, 0.3); box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35); animation: v18FloatLogo 5.4s ease-in-out infinite; }
body.light-theme .v18-float-tag { background: #FFFFFF; color: #0F172A; border-color: #CBD5E1; }
.v18-float-tag.tag-tl { top: 14px; left: 10%; border-color: rgba(16, 185, 129, 0.5); animation-delay: 0.2s; }
.v18-float-tag.tag-tr { top: 18px; right: 8%; border-color: rgba(56, 189, 248, 0.5); animation-delay: 1s; }
.v18-float-tag.tag-bl { bottom: 18px; left: 8%; border-color: rgba(167, 139, 250, 0.5); animation-delay: 1.6s; }
.v18-float-tag.tag-br { bottom: 14px; right: 10%; border-color: rgba(251, 191, 36, 0.5); animation-delay: 2.2s; }

.v18-board-caption { text-align: center; margin-bottom: 20px; }
.v18-board-caption h3 { margin: 0 0 4px; font-size: 19px; font-weight: 800; }
.v18-board-caption p { margin: 0; font-size: 12.5px; color: #94A3B8; }
.v18-board-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.v18-mini-tile { padding: 12px 10px; border-radius: 12px; text-align: center; cursor: pointer; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(148, 163, 184, 0.18); transition: transform 0.2s, border-color 0.2s; }
.v18-mini-tile:hover { transform: translateY(-3px); border-color: #10B981; }
body.light-theme .v18-mini-tile { background: #FFFFFF; border-color: #E2E8F0; }
.v18-mini-tile strong { display: block; font-family: 'JetBrains Mono', monospace; font-size: 13px; margin-bottom: 2px; }
.v18-mini-tile span { font-size: 11px; color: #94A3B8; }

.v18-scene-kicker { display: block; font-family: 'JetBrains Mono', monospace; font-size: 11.5px; font-weight: 700; letter-spacing: 0.1em; color: #10B981; margin-bottom: 10px; }
.v18-scene-title { font-size: clamp(26px, 3.2vw, 42px); line-height: 1.15; font-weight: 800; margin: 0 0 16px; letter-spacing: -0.02em; }
.v18-scene-desc { font-size: 15.5px; line-height: 1.7; color: #94A3B8; margin: 0 0 22px; }
body.light-theme .v18-scene-desc { color: #475569; }
.v18-feature-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px; }
.v18-fl-item { padding: 14px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(148,163,184,0.16); }
body.light-theme .v18-fl-item { background: #FFFFFF; border-color: #E2E8F0; }
.v18-fl-item strong { display: block; font-size: 13.5px; margin-bottom: 4px; }
.v18-fl-item span { font-size: 12.5px; color: #94A3B8; }

.v18-showcase-card { border-radius: 18px; overflow: hidden; background: #0B1120; border: 1px solid rgba(148, 163, 184, 0.22); box-shadow: 0 26px 56px rgba(0, 0, 0, 0.5); }
.v18-sc-topbar { display: flex; align-items: center; gap: 7px; padding: 12px 16px; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.08); }
.v18-sc-topbar span { width: 9px; height: 9px; border-radius: 50%; background: #334155; }
.v18-sc-topbar small { margin-left: 8px; font-family: 'JetBrains Mono', monospace; color: #94A3B8; font-size: 11.5px; }
.v18-dual-preview { display: grid; grid-template-columns: 1fr 1.15fr; gap: 14px; padding: 18px; align-items: start; }
.v18-code-box { margin: 0; padding: 14px; border-radius: 10px; background: #020617; color: #E2E8F0; font-family: 'JetBrains Mono', monospace; font-size: 12px; line-height: 1.7; overflow-x: auto; }
.v18-olm-preview { padding: 14px 18px; }
.v18-op-row { display: grid; grid-template-columns: 1.4fr 1fr 0.7fr; align-items: center; padding: 11px 10px; border-bottom: 1px solid rgba(148,163,184,0.12); font-size: 13px; color: #E2E8F0; }
.v18-op-row.head { font-size: 11.5px; text-transform: uppercase; color: #94A3B8; font-weight: 700; }

.v18-bento-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; width: 100%; }
.v18-bento-card { padding: 24px; border-radius: 16px; cursor: pointer; background: rgba(15, 23, 42, 0.78); border: 1px solid rgba(148, 163, 184, 0.2); transition: transform 0.2s ease, border-color 0.2s ease; }
body.light-theme .v18-bento-card { background: #FFFFFF; border-color: #E2E8F0; }
.v18-bento-card:hover { border-color: #10B981; }
.v18-bc-num { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 800; color: #10B981; display: block; margin-bottom: 10px; }
.v18-bento-card h4 { margin: 0 0 8px; font-size: 17px; }
.v18-bento-card p { margin: 0; font-size: 13.5px; color: #94A3B8; line-height: 1.6; }

/* SCRATCH 3.0 NESTED C-BLOCKS */
.sc-stack-root { padding: 14px; display: flex; flex-direction: column; gap: 4px; }
.sc-c-wrap { display: flex; flex-direction: column; width: fit-content; min-width: 240px; max-width: 100%; margin: 2px 0; }
.sc-c-head { padding: 8px 13px; border-radius: 8px 8px 8px 0; font-size: 12.5px; font-weight: 700; color: #FFFFFF; }
.sc-c-body { padding: 6px 0 6px 14px; border-left: 12px solid #D97706; display: flex; flex-direction: column; gap: 4px; }
.sc-c-foot { height: 14px; width: 140px; border-radius: 0 6px 8px 8px; }
.sc-c-control .sc-c-head, .sc-c-control .sc-c-foot { background: #D97706; }
.sc-c-control .sc-c-body { border-left-color: #D97706; }
.sc-c-loop .sc-c-head, .sc-c-loop .sc-c-foot { background: #EA580C; }
.sc-c-loop .sc-c-body { border-left-color: #EA580C; }
.sc-c-func .sc-c-head, .sc-c-func .sc-c-foot { background: #DB2777; }
.sc-c-func .sc-c-body { border-left-color: #DB2777; }
.sc-c-placeholder { font-size: 11.5px; color: #94A3B8; font-style: italic; padding: 4px 6px; }

/* LỚP HỌC FULL MÀN HÌNH + GIAO DIỆN OLM */
#view-classroom.active { width: 100% !important; max-width: 100% !important; padding: 18px 28px !important; }
#view-classroom .olm-layout, #view-classroom .olm-portal, #view-classroom .olm-container, #view-classroom .classroom-shell, #view-classroom .olm-main-content {
  width: 100% !important; max-width: 100% !important; margin: 0 !important;
}
body:not(.light-theme) #view-classroom .olm-info-card,
body:not(.light-theme) #view-classroom .olm-stat-card {
  background: rgba(15, 23, 42, 0.92) !important; color: #F8FAFC !important; border: 1px solid rgba(148, 163, 184, 0.22) !important;
}
body:not(.light-theme) #view-classroom .olm-tabs-bar {
  background: rgba(15, 23, 42, 0.85) !important; border: 1px solid rgba(148, 163, 184, 0.22) !important;
}

.v18-empty-box { padding: 28px; text-align: center; border-radius: 12px; border: 1px dashed rgba(148,163,184,0.28); color: var(--text-secondary); font-size: 13.5px; }
.v18-asg-card { padding: 18px 20px; border-radius: 14px; margin-bottom: 14px; background: var(--bg-surface); border: 1px solid var(--border-subtle); border-left: 4px solid #10B981; }
.v18-asg-card.expired { border-left-color: #F43F5E; }
.v18-asg-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.v18-asg-tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px; }
.v18-asg-title { margin: 0 0 6px; font-size: 16.5px; font-weight: 800; }
.v18-asg-desc { margin: 0; font-size: 13.5px; color: var(--text-secondary); }
.v18-asg-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.v18-asg-summary { display: flex; gap: 22px; flex-wrap: wrap; margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--border-subtle); font-size: 12.5px; color: var(--text-secondary); }

.v18-badge { display: inline-flex; align-items: center; padding: 3px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 700; }
.v18-badge.lang { background: rgba(56, 189, 248, 0.14); color: #38BDF8; }
.v18-badge.open { background: rgba(16, 185, 129, 0.16); color: #10B981; }
.v18-badge.pending { background: rgba(245, 158, 11, 0.16); color: #F59E0B; }
.v18-badge.expired { background: rgba(244, 63, 94, 0.16); color: #F43F5E; }

.v18-table-wrap { width: 100%; overflow-x: auto; border-radius: 12px; border: 1px solid var(--border-subtle); }
.v18-table { width: 100%; border-collapse: collapse; font-size: 13.5px; text-align: left; }
.v18-table th { padding: 12px 14px; background: rgba(148, 163, 184, 0.08); font-size: 12px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
.v18-table td { padding: 12px 14px; border-top: 1px solid var(--border-subtle); }
.v18-xp-pill { font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; color: #10B981; background: rgba(16,185,129,0.12); padding: 3px 9px; border-radius: 999px; }

.v18-rt-note { padding: 10px 14px; border-radius: 10px; background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.22); font-size: 12.5px; color: var(--text-secondary); margin-bottom: 12px; }
.v18-rt-badge { display: inline-flex; align-items: center; gap: 7px; padding: 4px 11px; border-radius: 999px; font-size: 12px; font-weight: 700; }
.v18-rt-badge .rt-dot { width: 8px; height: 8px; border-radius: 50%; }
.v18-rt-badge.working { background: rgba(16, 185, 129, 0.16); color: #10B981; }
.v18-rt-badge.working .rt-dot { background: #10B981; box-shadow: 0 0 8px #10B981; }
.v18-rt-badge.off { background: rgba(148, 163, 184, 0.14); color: #94A3B8; }
.v18-rt-badge.off .rt-dot { background: #64748B; }

.v18-report-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
.v18-report-stats div { padding: 14px; border-radius: 12px; background: var(--bg-elevated); border: 1px solid var(--border-subtle); }
.v18-report-stats span { display: block; font-size: 12px; color: var(--text-secondary); }
.v18-report-stats strong { font-family: 'JetBrains Mono', monospace; font-size: 24px; }
.v18-code-preview { margin: 0; padding: 14px; border-radius: 10px; background: #020617; color: #E2E8F0; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; max-height: 280px; overflow: auto; border: 1px solid rgba(148,163,184,0.2); }

@media (max-width: 1024px) {
  .v18-scene-inner { grid-template-columns: 1fr; }
  .v18-scene-dots { display: none; }
  .v18-bento-4 { grid-template-columns: repeat(2, 1fr); }
  .v18-dual-preview { grid-template-columns: 1fr; }
}
@media (max-width: 680px) {
  .v18-scene { padding: 28px 16px; min-height: auto; }
  .v18-stats-strip { grid-template-columns: repeat(2, 1fr); }
  .v18-feature-list, .v18-bento-4, .v18-report-stats { grid-template-columns: 1fr; }
  #view-classroom.active { padding: 12px !important; }
}
"""

V18_MODALS_HTML = """
  <div id="v18-report-modal" class="modal-overlay">
    <div class="modal-box" style="max-width:960px;width:96vw;max-height:88vh;overflow:auto">
      <div id="v18-report-body"></div>
    </div>
  </div>
  <div id="v18-grade-modal" class="modal-overlay">
    <div class="modal-box" style="max-width:720px;width:94vw;max-height:88vh;overflow:auto">
      <div id="v18-grade-body"></div>
    </div>
  </div>
  <div id="v18-solve-modal" class="modal-overlay">
    <div class="modal-box" style="max-width:820px;width:95vw;max-height:90vh;overflow:auto">
      <div id="v18-solve-body"></div>
    </div>
  </div>
"""

def detect_home_id_from_appjs():
    if not os.path.exists("js/app.js"):
        return None
    js = open("js/app.js", "r", encoding="utf-8").read()
    m = re.search(r"getElementById\s*\(\s*[`'\"]([a-zA-Z0-9_-]*)\$\{", js)
    if m:
        return m.group(1) + "home"
    return None

def replace_outermost_home(html, replacement_inner):
    detected = detect_home_id_from_appjs()
    patterns = []
    if detected:
        patterns.append(rf'<(section|div|main)\b[^>]*\bid=["\']{re.escape(detected)}["\'][^>]*>')
    patterns.extend([
        r'<(section|div)\b[^>]*\bid=["\']view-home["\'][^>]*>',
        r'<(section|div)\b[^>]*\bid=["\']home-view["\'][^>]*>',
        r'<(section|div)\b[^>]*\bid=["\']section-home["\'][^>]*>',
        r'<(section|div)\b[^>]*\bid=["\']page-home["\'][^>]*>',
    ])
    for pat in patterns:
        m = re.search(pat, html, re.IGNORECASE)
        if m:
            tag = m.group(1).lower()
            open_tag = m.group(0)
            depth = 1
            token_re = re.compile(rf'<(/?){tag}\b[^>]*>', re.IGNORECASE)
            for tm in token_re.finditer(html, m.end()):
                if tm.group(1) == '/':
                    depth -= 1
                    if depth == 0:
                        if 'v18-home-root' not in open_tag:
                            if 'class="' in open_tag:
                                open_tag = open_tag.replace('class="', 'class="v18-home-root ', 1)
                            else:
                                open_tag = open_tag[:-1] + ' class="v18-home-root">'
                        return html[:m.start()] + open_tag + '\n' + replacement_inner + '\n' + html[tm.start():], True, open_tag
                else:
                    if not tm.group(0).rstrip().endswith('/>'):
                        depth += 1
    return html, False, None

def apply_v18():
    with open("js/scratch-bridge.js", "w", encoding="utf-8") as f:
        f.write(SCRATCH_BRIDGE_V18_JS.strip() + "\n")
    print("✔ Đã khôi phục & nâng cấp js/scratch-bridge.js (Scratch 3.0 khối C + Sơ đồ khối SVG)")

    with open("js/v18-engine.js", "w", encoding="utf-8") as f:
        f.write(V18_ENGINE_JS.strip() + "\n")
    print("✔ Đã tạo js/v18-engine.js (Scroll Split 3D + OLM Hạn lịch thật + Bảng tổng hợp & Chấm điểm)")

    css_path = "css/design-system.css"
    css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    for mk in ["/* ==================== V17.0: HODL.SWISS 3D", "/* ==================== V18.0: FULLSCREEN 3D HOME"]:
        if mk in css:
            css = css.split(mk)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css + "\n\n" + V18_CSS.strip() + "\n")
    print("✔ Đã cập nhật css/design-system.css (Trang chủ Full 3D + Lớp học Full màn hình + Scratch C-blocks)")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v17.0", "v18.0").replace("v16.0", "v18.0").replace("v15.0", "v18.0")
        html = html.replace("Đăng nhập bằng Google, Facebook, GitHub hoặc Email của bạn", "Đăng nhập bằng Google hoặc tài khoản Email của bạn")
        html = html.replace("50 Chặng Thử thách & AI", "100 Chặng Thử thách")
        html = html.replace("50 Chặng Thử thách", "100 Chặng Thử thách")

        for em in ["📋 ", "👥 ", "📡 ", "💬 ", "👨‍🏫", "🟡 ", "🎮 "]:
            html = html.replace(em, "")

        html = re.sub(r'<div[^>]*class="[^"]*scene-nav[^"]*"[^>]*>[\s\S]*?</div>', '', html, flags=re.IGNORECASE)

        html, ok, matched = replace_outermost_home(html, V18_HOME_INNER.strip())
        if ok:
            print(f"✔ ĐÃ THAY THẾ TOÀN BỘ TRANG CHỦ v18.0 FULL MÀN HÌNH ({matched})")
        else:
            print("⚠ Chưa tìm thấy thẻ ngoài cùng của Trang chủ trong index.html.")

        if 'id="v18-report-modal"' not in html:
            if '<div id="toast-banner"' in html:
                html = html.replace('<div id="toast-banner"', V18_MODALS_HTML + '\n  <div id="toast-banner"')
            else:
                html = html.replace('</body>', V18_MODALS_HTML + '\n</body>')

        if 'js/v18-engine.js' not in html:
            if '<script src="js/v16-core.js"></script>' in html:
                html = html.replace('<script src="js/v16-core.js"></script>', '<script src="js/v16-core.js"></script>\n  <script src="js/v18-engine.js"></script>')
            else:
                html = html.replace('</body>', '  <script src="js/v18-engine.js"></script>\n</body>')

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã cập nhật toàn diện index.html lên v18.0")

    print("\nHOÀN TẤT ĐẠI TU V-CODE EDU v18.0! Tải lại trình duyệt (Ctrl + Shift + R) để kiểm tra.")

if __name__ == "__main__":
    apply_v18()