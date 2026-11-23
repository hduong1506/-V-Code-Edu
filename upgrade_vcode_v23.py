# -*- coding: utf-8 -*-
"""
V-CODE EDU — BẢN NÂNG CẤP V23:
1. Gợi ý code bám sát ngay dưới con trỏ phím đang gõ (như VS Code).
2. Tối ưu chuyển ngôn ngữ & chạy kết quả tức thì: chặn tiến trình cũ, xóa sạch kết quả cũ trên Terminal khi đổi ngôn ngữ.
3. Nâng cấp Trang chủ nhiều hiệu ứng đẹp & mượt chuẩn 60fps (Canvas mạng mạch dữ liệu siêu nhẹ tự tắt khi rời trang,
   thanh tiến trình cuộn phát sáng, chiều sâu 3D đa lớp cho Bảng Logo, ánh sáng lướt & xuất hiện nối tiếp 6 khung Phân cảnh 04).
"""
import os

V23_JS = r"""// V-CODE EDU — V23 ENGINE (INSTANT RUNNER + CARET AUTOCOMPLETE + 60FPS RICH HOME FX)
(function () {
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // ===========================================================================
  // 1. GỢI Ý CODE HIỆN NGAY DƯỚI CON TRỎ PHÍM ĐANG GÕ (CHUẨN VS CODE)
  // ===========================================================================
  let measureSpan = null;
  function getCaretPixelCoords(textarea, pos) {
    const cs = window.getComputedStyle(textarea);
    if (!measureSpan) {
      measureSpan = document.createElement('span');
      measureSpan.style.position = 'fixed';
      measureSpan.style.top = '-9999px';
      measureSpan.style.left = '-9999px';
      measureSpan.style.visibility = 'hidden';
      measureSpan.style.whiteSpace = 'pre';
      measureSpan.style.pointerEvents = 'none';
      document.body.appendChild(measureSpan);
    }

    measureSpan.style.fontFamily = cs.fontFamily;
    measureSpan.style.fontSize = cs.fontSize;
    measureSpan.style.fontWeight = cs.fontWeight;
    measureSpan.style.letterSpacing = cs.letterSpacing;
    measureSpan.style.tabSize = cs.tabSize || '4';

    const before = textarea.value.slice(0, pos);
    const lines = before.split('\n');
    const lineIdx = lines.length - 1;
    const currentLineText = lines[lineIdx].replace(/\t/g, '    ');

    measureSpan.textContent = currentLineText || '';
    const textWidth = measureSpan.getBoundingClientRect().width;

    const lineHeight = parseFloat(cs.lineHeight) || (parseFloat(cs.fontSize) * 1.65) || 23;
    const padLeft = parseFloat(cs.paddingLeft) || 16;
    const padTop = parseFloat(cs.paddingTop) || 14;

    return {
      x: padLeft + textWidth - textarea.scrollLeft,
      y: padTop + (lineIdx + 1) * lineHeight - textarea.scrollTop,
      lineHeight
    };
  }

  function upgradeAutocompleteToCaretPosition() {
    const ed = document.getElementById('code-editor');
    const popup = document.getElementById('v22-ac-popup');
    if (!ed || !popup || popup.dataset.v23Caret === '1') return;
    popup.dataset.v23Caret = '1';
    popup.classList.add('v23-caret-popup');

    const positionNearCaret = () => {
      if (popup.style.display === 'none') return;
      const wrap = ed.parentElement;
      if (!wrap) return;
      const coords = getCaretPixelCoords(ed, ed.selectionStart);
      const wrapW = wrap.clientWidth || 600;
      const wrapH = wrap.clientHeight || 420;
      const popW = popup.offsetWidth || 295;
      const popH = popup.offsetHeight || 190;

      let left = Math.max(10, Math.min(coords.x, wrapW - popW - 12));
      let top = coords.y + 4;
      if (top + popH > wrapH - 8) {
        top = Math.max(8, coords.y - coords.lineHeight - popH - 6);
      }
      popup.style.left = `${Math.round(left)}px`;
      popup.style.top = `${Math.round(top)}px`;
      popup.style.right = 'auto';
    };

    const mo = new MutationObserver(() => requestAnimationFrame(positionNearCaret));
    mo.observe(popup, { attributes: true, attributeFilter: ['style'], childList: true });

    ed.addEventListener('input', () => requestAnimationFrame(positionNearCaret));
    ed.addEventListener('keyup', () => requestAnimationFrame(positionNearCaret));
    ed.addEventListener('scroll', () => requestAnimationFrame(positionNearCaret), { passive: true });
  }

  // ===========================================================================
  // 2. TĂNG TỐC CHUYỂN NGÔN NGỮ & CHẠY CHƯƠNG TRÌNH TỨC THÌ (KHÔNG ĐỘ TRỄ)
  // ===========================================================================
  function optimizeLanguageSwitchingAndSpeed() {
    const ws = document.getElementById('view-workspace');
    const ed = document.getElementById('code-editor');
    if (!ws || !ed) return;

    const runBtn = document.getElementById('btn-run-code') || [...ws.querySelectorAll('button')].find((b) => /Chạy Chương Trình/i.test(b.textContent || ''));
    if (runBtn && !runBtn.dataset.v23FastRun) {
      runBtn.dataset.v23FastRun = '1';
      runBtn.addEventListener('click', (e) => {
        if (typeof window.runMultiLanguageSmart === 'function') {
          e.preventDefault();
          e.stopImmediatePropagation();
          window.runMultiLanguageSmart();
        }
      }, true);
    }

    const langSel = ws.querySelector('select');
    if (langSel && !langSel.dataset.v23FastLang) {
      langSel.dataset.v23FastLang = '1';
      langSel.addEventListener('change', () => {
        const lang = window.VCodeMultiLang ? window.VCodeMultiLang.detectLang() : 'python';
        const langLabel = langSel.options[langSel.selectedIndex]?.text || lang.toUpperCase();

        const stopBtn = document.getElementById('v21-term-stop');
        if (stopBtn && stopBtn.style.display !== 'none') stopBtn.click();

        const scr = document.getElementById('v21-term-screen');
        if (scr) {
          scr.innerHTML = `<div class="v21-term-sys">Đã chuyển sang <strong>${esc(langLabel)}</strong>. Bấm <strong>Chạy Chương Trình</strong> để thực thi ngay.</div>`;
        }

        const badge = document.getElementById('v20-diag-badge');
        const diagBox = document.getElementById('v20-diag-console');
        if (badge) { badge.className = 'v20-diag-badge idle'; badge.textContent = 'Sẵn sàng'; }
        if (diagBox) {
          diagBox.innerHTML = `<div class="v20-diag-placeholder">Đang ở chế độ <strong>${esc(langLabel)}</strong>. Bấm <strong>Kiểm tra lỗi</strong> để rà soát cú pháp.</div>`;
        }

        requestAnimationFrame(() => {
          if (window.syncV22SyntaxHighlight) window.syncV22SyntaxHighlight();
          if ((lang === 'python' || lang === 'pyvn') && window.VCodeScratchBridge?.syncAll) {
            window.VCodeScratchBridge.syncAll(ed.value);
          }
        });
      });
    }

    if (window.VCodeScratchBridge && !window.VCodeScratchBridge.__v23Debounced) {
      const origSync = window.VCodeScratchBridge.syncAll.bind(window.VCodeScratchBridge);
      let scTimer = null;
      window.VCodeScratchBridge.syncAll = function (codeArg, runtimeErr) {
        if (runtimeErr) {
          clearTimeout(scTimer);
          origSync(codeArg, runtimeErr);
          return;
        }
        clearTimeout(scTimer);
        scTimer = setTimeout(() => {
          requestAnimationFrame(() => origSync(codeArg));
        }, 45);
      };
      window.VCodeScratchBridge.__v23Debounced = true;
    }
  }

  // ===========================================================================
  // 3. HIỆU ỨNG TRANG CHỦ ĐẸP & MƯỢT 60FPS (CANVAS MẠCH DỮ LIỆU + 3D PARALLAX + SHIMMER)
  // ===========================================================================
  function initHomepageV23Effects() {
    const home = document.getElementById('view-home');
    const bgStage = document.querySelector('.v18-bg-stage');
    if (!home || !bgStage) return;

    if (!document.getElementById('v23-scroll-progress')) {
      const bar = document.createElement('div');
      bar.id = 'v23-scroll-progress';
      bar.className = 'v23-scroll-progress';
      home.prepend(bar);

      let pTick = false;
      const updateBar = () => {
        pTick = false;
        if (!home.classList.contains('active')) return;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const pct = Math.min(100, Math.max(0, (window.scrollY / maxScroll) * 100));
        bar.style.transform = `scaleX(${(pct / 100).toFixed(4)})`;
      };
      window.addEventListener('scroll', () => {
        if (!pTick) { pTick = true; requestAnimationFrame(updateBar); }
      }, { passive: true });
      updateBar();
    }

    const board = home.querySelector('.v18-logo-board');
    if (board && !board.dataset.v23Parallax && !window.matchMedia('(pointer: coarse)').matches) {
      board.dataset.v23Parallax = '1';
      const logoFrame = board.querySelector('.v18-logo-frame');
      const tags = [...board.querySelectorAll('.v18-float-tag')];

      board.addEventListener('mousemove', (e) => {
        const r = board.getBoundingClientRect();
        const nx = (e.clientX - r.left) / r.width - 0.5;
        const ny = (e.clientY - r.top) / r.height - 0.5;
        board.style.setProperty('--gx', `${((nx + 0.5) * 100).toFixed(1)}%`);
        board.style.setProperty('--gy', `${((ny + 0.5) * 100).toFixed(1)}%`);
        if (logoFrame) {
          logoFrame.style.transform = `translate3d(${(nx * 18).toFixed(1)}px, ${(ny * 14).toFixed(1)}px, 32px)`;
        }
        tags.forEach((tg, i) => {
          const factor = i % 2 === 0 ? 26 : -22;
          tg.style.transform = `translate3d(${(nx * factor).toFixed(1)}px, ${(ny * (factor * 0.7)).toFixed(1)}px, 44px)`;
        });
      }, { passive: true });

      board.addEventListener('mouseleave', () => {
        if (logoFrame) logoFrame.style.transform = '';
        tags.forEach((tg) => { tg.style.transform = ''; });
      });
    }

    const cascadeItems = [...home.querySelectorAll('.v20-road-card, .v20-about-card')];
    if (cascadeItems.length) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('v23-in');
            io.unobserve(en.target);
          }
        });
      }, { threshold: 0.12 });
      cascadeItems.forEach((el, idx) => {
        el.style.setProperty('--stagger', `${(idx % 6) * 70}ms`);
        el.classList.add('v23-cascade');
        io.observe(el);
      });
    }

    if (document.getElementById('v23-home-fx-canvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'v23-home-fx-canvas';
    canvas.className = 'v23-home-fx-canvas';
    bgStage.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true });
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const NODE_COUNT = isMobile ? 16 : 34;
    const MAX_DIST = isMobile ? 130 : 175;
    let W = 0, H = 0, dpr = 1;
    let nodes = [], pulses = [];
    const mouse = { x: -9999, y: -9999, active: false };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const seedNodes = () => {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.36,
        vy: (Math.random() - 0.5) * 0.36,
        r: 1.6 + Math.random() * 1.8,
        hue: Math.random() > 0.5 ? 162 : 199
      }));
    };

    resize();
    seedNodes();
    window.addEventListener('resize', () => { resize(); if (!nodes.length) seedNodes(); }, { passive: true });

    if (!isMobile) {
      window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; }, { passive: true });
      window.addEventListener('mouseleave', () => { mouse.active = false; });
    }

    let rafId = null;
    const drawFrame = () => {
      if (document.hidden || !home.classList.contains('active')) {
        rafId = null;
        return;
      }

      const isLight = document.documentElement.getAttribute('data-theme') === 'light'
        || document.body.classList.contains('light-theme');

      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = W + 20;
        if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20;
        if (n.y > H + 20) n.y = -20;

        if (mouse.active) {
          const dx = mouse.x - n.x, dy = mouse.y - n.y, d2 = dx * dx + dy * dy;
          if (d2 < 28000 && d2 > 400) {
            n.x += dx * 0.0022;
            n.y += dy * 0.0022;
          }
        }
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * (isLight ? 0.2 : 0.28);
            ctx.strokeStyle = isLight ? `rgba(37, 99, 235, ${alpha.toFixed(3)})` : `rgba(56, 189, 248, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();

            if (pulses.length < 10 && Math.random() < 0.0008) {
              pulses.push({ a, b, t: 0, speed: 0.012 + Math.random() * 0.012 });
            }
          }
        }

        if (mouse.active) {
          const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
          if (md < 170) {
            const alpha = (1 - md / 170) * (isLight ? 0.26 : 0.36);
            ctx.strokeStyle = isLight ? `rgba(16, 185, 129, ${alpha.toFixed(3)})` : `rgba(52, 211, 153, ${alpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.stroke();
          }
        }
      }

      for (let k = pulses.length - 1; k >= 0; k--) {
        const p = pulses[k];
        p.t += p.speed;
        if (p.t >= 1) { pulses.splice(k, 1); continue; }
        const px = p.a.x + (p.b.x - p.a.x) * p.t;
        const py = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = isLight ? '#2563EB' : '#34D399';
        ctx.beginPath();
        ctx.arc(px, py, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        ctx.fillStyle = isLight
          ? (n.hue === 162 ? 'rgba(5, 150, 105, 0.48)' : 'rgba(37, 99, 235, 0.45)')
          : (n.hue === 162 ? 'rgba(52, 211, 153, 0.72)' : 'rgba(56, 189, 248, 0.72)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    const ensureRunning = () => {
      if (!rafId && !document.hidden && home.classList.contains('active')) {
        rafId = requestAnimationFrame(drawFrame);
      }
    };

    ensureRunning();
    document.addEventListener('visibilitychange', ensureRunning);
    const classObs = new MutationObserver(ensureRunning);
    classObs.observe(home, { attributes: true, attributeFilter: ['class'] });
  }

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      upgradeAutocompleteToCaretPosition();
      optimizeLanguageSwitchingAndSpeed();
      initHomepageV23Effects();
    }, 320);
    setTimeout(() => {
      upgradeAutocompleteToCaretPosition();
      optimizeLanguageSwitchingAndSpeed();
    }, 900);
  });
})();
"""

V23_CSS = """
/* ==================== V23.0: CARET AUTOCOMPLETE + RICH 60FPS HOME FX ==================== */
.v23-caret-popup {
  position: absolute !important;
  right: auto !important;
  width: 295px !important;
  max-width: calc(100% - 20px);
  z-index: 55 !important;
  background: rgba(11, 18, 33, 0.96) !important;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(56, 189, 248, 0.42) !important;
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(56, 189, 248, 0.12) !important;
  animation: v23PopIn 0.12s ease-out;
}
@keyframes v23PopIn {
  from { opacity: 0; transform: translateY(-4px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.v23-home-fx-canvas {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.v23-scroll-progress {
  position: fixed;
  top: 0; left: 0; right: 0;
  height: 3px;
  z-index: 120;
  transform-origin: left center;
  transform: scaleX(0);
  background: linear-gradient(90deg, #10B981 0%, #38BDF8 55%, #6366F1 100%);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.75);
  pointer-events: none;
  will-change: transform;
}

.v18-logo-board::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: radial-gradient(360px circle at var(--gx, 50%) var(--gy, 40%), rgba(56, 189, 248, 0.16), transparent 62%);
  opacity: 0;
  transition: opacity 0.25s ease;
}
.v18-logo-board:hover::before { opacity: 1; }
.v18-logo-frame, .v18-float-tag { transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1); will-change: transform; }

.v18-btn-primary, .v18-btn-blue { position: relative; overflow: hidden; }
.v18-btn-primary::after, .v18-btn-blue::after {
  content: "";
  position: absolute;
  top: 0; left: -120%; width: 70%; height: 100%;
  background: linear-gradient(110deg, transparent, rgba(255, 255, 255, 0.35), transparent);
  transform: skewX(-20deg);
  animation: v23Shimmer 4.8s ease-in-out infinite;
  pointer-events: none;
}
.v18-btn-blue::after { animation-delay: 2.2s; }
@keyframes v23Shimmer {
  0%, 72% { left: -120%; }
  100% { left: 150%; }
}

.v23-cascade {
  opacity: 0;
  transform: translateY(26px) scale(0.985);
  transition: opacity 0.55s cubic-bezier(0.22, 1, 0.36, 1) var(--stagger, 0ms),
              transform 0.55s cubic-bezier(0.22, 1, 0.36, 1) var(--stagger, 0ms),
              border-color 0.22s ease, box-shadow 0.22s ease;
}
.v23-cascade.v23-in { opacity: 1; transform: translateY(0) scale(1); }
.v20-road-card:hover {
  box-shadow: 0 18px 40px rgba(16, 185, 129, 0.14), 0 0 0 1px rgba(16, 185, 129, 0.35);
}
"""

def apply_v23():
    with open("js/v23-fx-caret.js", "w", encoding="utf-8") as f:
        f.write(V23_JS.strip() + "\n")
    print("✔ Đã tạo js/v23-fx-caret.js")

    css_path = "css/design-system.css"
    css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V23.0: CARET AUTOCOMPLETE"
    if marker in css:
        css = css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css + "\n\n" + V23_CSS.strip() + "\n")
    print("✔ Đã cập nhật css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        if "js/v23-fx-caret.js" not in html:
            if '<script src="js/v22-pro-ide.js"></script>' in html:
                html = html.replace('<script src="js/v22-pro-ide.js"></script>', '<script src="js/v22-pro-ide.js"></script>\n  <script src="js/v23-fx-caret.js"></script>')
            else:
                html = html.replace('</body>', '  <script src="js/v23-fx-caret.js"></script>\n</body>')
            with open("index.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("✔ Đã nhúng js/v23-fx-caret.js vào index.html")

    print("\nHOÀN TẤT NÂNG CẤP V23! Tải lại trình duyệt (Ctrl + Shift + R) để trải nghiệm.")

if __name__ == "__main__":
    apply_v23()