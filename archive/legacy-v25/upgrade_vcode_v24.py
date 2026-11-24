# -*- coding: utf-8 -*-
"""
V-CODE EDU — BẢN VÁ LỖI V24:
1. Vá triệt để lỗi bấm nút thêm code nhanh (+ ...) bị ẩn chữ khi đang bật "Màu code: Bật".
2. Tối ưu Trang chủ siêu mượt 60-120fps (gom GPU draw calls, gỡ transition xung đột cuộn, tắt lớp nặng).
"""
import os

V24_JS = r"""// V-CODE EDU — V24 PATCH (FIX QUICK-INSERT INVISIBLE TEXT + ULTRA-SMOOTH 60FPS HOMEPAGE)
(function () {
  // 1. VÁ TRIỆT ĐỂ LỖI CHÈN CODE NHANH (+ ...) KHÔNG HIỆN CHỮ KHI BẬT MÀU CODE
  function hookEditorValueProperty() {
    const ed = document.getElementById('code-editor');
    if (!ed || ed.dataset.v24ValHook === '1') return;
    ed.dataset.v24ValHook = '1';

    const protoDesc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
    if (protoDesc && protoDesc.get && protoDesc.set) {
      let rafSync = 0;
      const scheduleFullSync = () => {
        if (rafSync) cancelAnimationFrame(rafSync);
        rafSync = requestAnimationFrame(() => {
          rafSync = 0;
          if (typeof window.syncV22SyntaxHighlight === 'function') {
            window.syncV22SyntaxHighlight();
          }
          if (typeof window.updateLineNumbers === 'function') {
            try { window.updateLineNumbers(); } catch {}
          }
          if (window.VCodeScratchBridge?.syncAll) {
            window.VCodeScratchBridge.syncAll(ed.value);
          }
        });
      };

      Object.defineProperty(ed, 'value', {
        configurable: true,
        get() {
          return protoDesc.get.call(this);
        },
        set(newVal) {
          protoDesc.set.call(this, newVal);
          scheduleFullSync();
        }
      });

      const ws = document.getElementById('view-workspace');
      if (ws) {
        ws.addEventListener('click', (e) => {
          const btn = e.target.closest('button');
          if (!btn) return;
          const txt = (btn.textContent || '').trim();
          if (txt.startsWith('+') || /Xóa code|Màu code|Sáng IDE|Tối IDE/i.test(txt)) {
            scheduleFullSync();
            setTimeout(scheduleFullSync, 40);
          }
        });
      }

      scheduleFullSync();
    }
  }

  // 2. TỐI ƯU HIỆU NĂNG TRANG CHỦ SIÊU MƯỢT (GOM DRAW CALLS GPU, ZERO LAYOUT THRASHING)
  function optimizeHomepagePerformance() {
    const home = document.getElementById('view-home');
    const bgStage = document.querySelector('.v18-bg-stage');
    if (!home || !bgStage) return;

    bgStage.querySelectorAll('.v22-geo-ring, .v22-home-spotlight, #v23-home-fx-canvas').forEach((el) => el.remove());

    if (!window.matchMedia('(pointer: coarse)').matches) {
      document.querySelectorAll('.v18-logo-board').forEach((board) => {
        let cachedRect = null;
        let rafMove = 0;
        let lastX = 0, lastY = 0;
        const logoFrame = board.querySelector('.v18-logo-frame');
        const tags = [...board.querySelectorAll('.v18-float-tag')];

        board.addEventListener('mouseenter', () => {
          cachedRect = board.getBoundingClientRect();
        }, { passive: true });

        board.addEventListener('mousemove', (e) => {
          lastX = e.clientX;
          lastY = e.clientY;
          if (rafMove) return;
          rafMove = requestAnimationFrame(() => {
            rafMove = 0;
            const r = cachedRect || board.getBoundingClientRect();
            const nx = Math.max(-0.5, Math.min(0.5, (lastX - r.left) / r.width - 0.5));
            const ny = Math.max(-0.5, Math.min(0.5, (lastY - r.top) / r.height - 0.5));
            board.style.transform = `perspective(1000px) rotateX(${(-ny * 8).toFixed(2)}deg) rotateY(${(nx * 10).toFixed(2)}deg) translate3d(0, -2px, 0)`;
            if (logoFrame) logoFrame.style.transform = `translate3d(${(nx * 14).toFixed(1)}px, ${(ny * 10).toFixed(1)}px, 0)`;
            tags.forEach((tg, i) => {
              const f = i % 2 === 0 ? 18 : -15;
              tg.style.transform = `translate3d(${(nx * f).toFixed(1)}px, ${(ny * f * 0.65).toFixed(1)}px, 0)`;
            });
          });
        }, { passive: true });

        board.addEventListener('mouseleave', () => {
          cachedRect = null;
          if (rafMove) { cancelAnimationFrame(rafMove); rafMove = 0; }
          board.style.transform = '';
          if (logoFrame) logoFrame.style.transform = '';
          tags.forEach((tg) => { tg.style.transform = ''; });
        }, { passive: true });
      });
    }

    if (document.getElementById('v24-fast-canvas')) return;
    const canvas = document.createElement('canvas');
    canvas.id = 'v24-fast-canvas';
    canvas.className = 'v24-fast-canvas';
    bgStage.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    const COUNT = isMobile ? 12 : 26;
    const MAX_D = isMobile ? 120 : 165;
    const MAX_D2 = MAX_D * MAX_D;

    let W = window.innerWidth, H = window.innerHeight;
    let nodes = [], pulses = [];
    let isScrolling = false, scrollTimer = null;
    const mouse = { x: -9999, y: -9999, on: false };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W;
      canvas.height = H;
    };

    const seed = () => {
      nodes = Array.from({ length: COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34,
        r: 1.5 + Math.random() * 1.4,
        c: Math.random() > 0.5 ? 0 : 1
      }));
    };

    resize();
    seed();
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('scroll', () => {
      isScrolling = true;
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => { isScrolling = false; }, 110);
    }, { passive: true });

    if (!isMobile) {
      window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; }, { passive: true });
      window.addEventListener('mouseleave', () => { mouse.on = false; });
    }

    let rafId = null, frameSkip = 0;

    const tick = () => {
      if (document.hidden || !home.classList.contains('active')) {
        rafId = null;
        return;
      }

      if (isScrolling && (++frameSkip & 1)) {
        rafId = requestAnimationFrame(tick);
        return;
      }

      const isLight = document.documentElement.getAttribute('data-theme') === 'light'
        || document.body.classList.contains('light-theme');

      ctx.clearRect(0, 0, W, H);

      for (let i = 0; i < COUNT; i++) {
        const n = nodes[i];
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -16) n.x = W + 16;
        else if (n.x > W + 16) n.x = -16;
        if (n.y < -16) n.y = H + 16;
        else if (n.y > H + 16) n.y = -16;
      }

      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < COUNT; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < COUNT; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          if (dx * dx + dy * dy < MAX_D2) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            if (pulses.length < 7 && Math.random() < 0.0012) {
              pulses.push({ a, b, t: 0, s: 0.015 + Math.random() * 0.012 });
            }
          }
        }
      }
      ctx.strokeStyle = isLight ? 'rgba(37, 99, 235, 0.14)' : 'rgba(56, 189, 248, 0.17)';
      ctx.stroke();

      if (mouse.on && !isScrolling) {
        ctx.beginPath();
        for (let i = 0; i < COUNT; i++) {
          const a = nodes[i];
          const dx = a.x - mouse.x, dy = a.y - mouse.y;
          if (dx * dx + dy * dy < 25600) {
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(mouse.x, mouse.y);
          }
        }
        ctx.strokeStyle = isLight ? 'rgba(16, 185, 129, 0.24)' : 'rgba(52, 211, 153, 0.30)';
        ctx.stroke();
      }

      if (pulses.length) {
        ctx.beginPath();
        for (let k = pulses.length - 1; k >= 0; k--) {
          const p = pulses[k];
          p.t += p.s;
          if (p.t >= 1) { pulses.splice(k, 1); continue; }
          const px = p.a.x + (p.b.x - p.a.x) * p.t;
          const py = p.a.y + (p.b.y - p.a.y) * p.t;
          ctx.moveTo(px + 2.4, py);
          ctx.arc(px, py, 2.4, 0, Math.PI * 2);
        }
        ctx.fillStyle = isLight ? '#2563EB' : '#34D399';
        ctx.fill();
      }

      for (let colorIdx = 0; colorIdx < 2; colorIdx++) {
        ctx.beginPath();
        for (let i = 0; i < COUNT; i++) {
          const n = nodes[i];
          if (n.c !== colorIdx) continue;
          ctx.moveTo(n.x + n.r, n.y);
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        }
        ctx.fillStyle = isLight
          ? (colorIdx === 0 ? 'rgba(5, 150, 105, 0.45)' : 'rgba(37, 99, 235, 0.42)')
          : (colorIdx === 0 ? 'rgba(52, 211, 153, 0.72)' : 'rgba(56, 189, 248, 0.72)');
        ctx.fill();
      }

      rafId = requestAnimationFrame(tick);
    };

    const startIfVisible = () => {
      if (!rafId && !document.hidden && home.classList.contains('active')) {
        rafId = requestAnimationFrame(tick);
      }
    };

    startIfVisible();
    document.addEventListener('visibilitychange', startIfVisible);
    new MutationObserver(startIfVisible).observe(home, { attributes: true, attributeFilter: ['class'] });
  }

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
      hookEditorValueProperty();
      optimizeHomepagePerformance();
    }, 280);
    setTimeout(hookEditorValueProperty, 800);
  });
})();
"""

V24_CSS = """
/* ==================== V24.0: ULTRA-SMOOTH 60-120FPS HOMEPAGE & EDITOR SYNC ==================== */
.v18-scene { contain: layout style; }
.v18-split-left,
.v18-split-right {
  transition: none !important;
  will-change: transform, opacity;
  backface-visibility: hidden;
}

.v22-bg-grid-plane { animation: none !important; will-change: auto !important; }
.v22-geo-ring,
.v22-home-spotlight,
#v23-home-fx-canvas { display: none !important; }

.v24-fast-canvas {
  position: fixed; inset: 0; width: 100vw; height: 100vh;
  pointer-events: none; z-index: 0; contain: strict;
}

.v18-board-orbit { will-change: transform; }
.v18-logo-board,
.v20-road-card,
.v18-showcase-card {
  contain: layout paint style;
  backface-visibility: hidden;
}

.v22-code-layer-wrap.syntax-on .v22-syntax-pre {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}
"""

def apply_v24():
    with open("js/v24-fix-smooth.js", "w", encoding="utf-8") as f:
        f.write(V24_JS.strip() + "\n")
    print("✔ Đã tạo js/v24-fix-smooth.js")

    css_path = "css/design-system.css"
    css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V24.0: ULTRA-SMOOTH"
    if marker in css:
        css = css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css + "\n\n" + V24_CSS.strip() + "\n")
    print("✔ Đã cập nhật css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        if "js/v24-fix-smooth.js" not in html:
            if '<script src="js/v23-fx-caret.js"></script>' in html:
                html = html.replace('<script src="js/v23-fx-caret.js"></script>', '<script src="js/v23-fx-caret.js"></script>\n  <script src="js/v24-fix-smooth.js"></script>')
            else:
                html = html.replace('</body>', '  <script src="js/v24-fix-smooth.js"></script>\n</body>')
            with open("index.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("✔ Đã nhúng js/v24-fix-smooth.js vào index.html")

    print("\nHOÀN TẤT VÁ LỖI V24! Tải lại trình duyệt (Ctrl + Shift + R) để kiểm tra.")

if __name__ == "__main__":
    apply_v24()