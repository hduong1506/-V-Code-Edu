# -*- coding: utf-8 -*-
"""
V-CODE EDU — CHUYỂN Ô CHỌN GIỜ HẾT HẠN SANG HỆ 24 GIỜ (00:00 - 23:59)
"""
import os

V25_TIME24_JS = r"""// V-CODE EDU — CUSTOM 24-HOUR TIME PICKER (00:00 - 23:59)
(function () {
  function pad(n) { return String(n).padStart(2, '0'); }

  function upgradeTo24hPicker() {
    const oldInp = document.getElementById('assign-time-vn');
    if (!oldInp || oldInp.dataset.v25Time24 === '1') return;

    const currentVal = /^\d{2}:\d{2}$/.test(oldInp.value) ? oldInp.value : '23:59';
    const parent = oldInp.parentElement;
    if (!parent) return;

    const wrap = document.createElement('div');
    wrap.className = 'v25-time24-wrap';

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.id = 'assign-time-vn';
    inp.className = 'v19-input mono v25-time24-input';
    inp.value = currentVal;
    inp.placeholder = 'HH:MM';
    inp.maxLength = 5;
    inp.required = true;
    inp.autocomplete = 'off';
    inp.dataset.v25Time24 = '1';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'v25-time24-btn';
    btn.title = 'Chọn giờ (hệ 24h)';
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;

    const pop = document.createElement('div');
    pop.className = 'v25-time24-pop';

    const hoursHTML = Array.from({ length: 24 }, (_, h) =>
      `<button type="button" class="v25-t-opt" data-h="${pad(h)}">${pad(h)}</button>`
    ).join('');
    const minsHTML = Array.from({ length: 60 }, (_, m) =>
      `<button type="button" class="v25-t-opt" data-m="${pad(m)}">${pad(m)}</button>`
    ).join('');

    pop.innerHTML = `
      <div class="v25-t-head"><span>Giờ (00–23)</span><span>Phút (00–59)</span></div>
      <div class="v25-t-cols">
        <div class="v25-t-col v25-col-h">${hoursHTML}</div>
        <div class="v25-t-col v25-col-m">${minsHTML}</div>
      </div>
    `;

    wrap.appendChild(inp);
    wrap.appendChild(btn);
    wrap.appendChild(pop);
    oldInp.replaceWith(wrap);

    const parseHM = () => {
      const m = inp.value.match(/^(\d{1,2}):(\d{1,2})$/);
      let h = m ? Math.min(23, Math.max(0, parseInt(m[1], 10) || 0)) : 23;
      let mi = m ? Math.min(59, Math.max(0, parseInt(m[2], 10) || 0)) : 59;
      return { h: pad(h), m: pad(mi) };
    };

    const syncHighlight = () => {
      const { h, m } = parseHM();
      pop.querySelectorAll('[data-h]').forEach((b) => {
        const active = b.dataset.h === h;
        b.classList.toggle('active', active);
        if (active) b.scrollIntoView({ block: 'center' });
      });
      pop.querySelectorAll('[data-m]').forEach((b) => {
        const active = b.dataset.m === m;
        b.classList.toggle('active', active);
        if (active) b.scrollIntoView({ block: 'center' });
      });
    };

    const togglePop = (open) => {
      const willOpen = open !== undefined ? open : !pop.classList.contains('open');
      pop.classList.toggle('open', willOpen);
      if (willOpen) setTimeout(syncHighlight, 10);
    };

    btn.onclick = (e) => { e.stopPropagation(); togglePop(); };
    inp.addEventListener('click', (e) => { e.stopPropagation(); togglePop(true); });

    inp.addEventListener('input', () => {
      const digits = inp.value.replace(/\D/g, '').slice(0, 4);
      if (digits.length <= 2) inp.value = digits;
      else inp.value = `${digits.slice(0, 2)}:${digits.slice(2)}`;
    });

    inp.addEventListener('blur', () => {
      const { h, m } = parseHM();
      inp.value = `${h}:${m}`;
    });

    pop.addEventListener('click', (e) => {
      e.stopPropagation();
      const b = e.target.closest('.v25-t-opt');
      if (!b) return;
      const cur = parseHM();
      const nh = b.dataset.h ?? cur.h;
      const nm = b.dataset.m ?? cur.m;
      inp.value = `${nh}:${nm}`;
      syncHighlight();
      if (b.dataset.m !== undefined) togglePop(false);
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target)) togglePop(false);
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(upgradeTo24hPicker, 250);
    setTimeout(upgradeTo24hPicker, 700);
    const origOpen = window.openCreateAssignmentModal;
    if (typeof origOpen === 'function') {
      window.openCreateAssignmentModal = function () {
        origOpen();
        setTimeout(upgradeTo24hPicker, 30);
      };
    }
  });
})();
"""

V25_CSS = """
/* ==================== V25.0: CUSTOM 24H TIME PICKER (00:00 - 23:59) ==================== */
.v25-time24-wrap { position: relative; display: flex; align-items: center; }
.v25-time24-input { padding-right: 38px !important; letter-spacing: 0.05em; font-weight: 600; }
.v25-time24-btn {
  position: absolute; right: 6px; width: 28px; height: 28px;
  display: grid; place-items: center; border-radius: 6px;
  background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; cursor: pointer;
}
.v25-time24-btn:hover { background: #DBEAFE; }

.v25-time24-pop {
  display: none; position: absolute; top: calc(100% + 6px); right: 0; z-index: 120;
  width: 196px; background: #FFFFFF; border: 1px solid #CBD5E1; border-radius: 12px;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.22); overflow: hidden;
}
.v25-time24-pop.open { display: block; }
.v25-t-head {
  display: grid; grid-template-columns: 1fr 1fr; text-align: center;
  padding: 7px 6px; font-size: 11px; font-weight: 700; color: #475569;
  background: #F8FAFC; border-bottom: 1px solid #E2E8F0;
}
.v25-t-cols { display: grid; grid-template-columns: 1fr 1fr; height: 210px; }
.v25-t-col {
  overflow-y: auto; padding: 4px; display: flex; flex-direction: column; gap: 2px;
  scrollbar-width: thin;
}
.v25-col-h { border-right: 1px solid #E2E8F0; }
.v25-t-opt {
  border: none; background: transparent; color: #0F172A;
  padding: 6px 0; border-radius: 7px; font-family: 'JetBrains Mono', monospace;
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.v25-t-opt:hover { background: #EFF6FF; color: #1D4ED8; }
.v25-t-opt.active { background: #2563EB; color: #FFFFFF; font-weight: 800; }
"""

def apply_24h():
    with open("js/v25-time24.js", "w", encoding="utf-8") as f:
        f.write(V25_TIME24_JS.strip() + "\n")
    print("✔ Đã tạo js/v25-time24.js (Hệ 24 giờ: 00–23 giờ, 00–59 phút)")

    css_path = "css/design-system.css"
    css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V25.0: CUSTOM 24H TIME PICKER"
    if marker in css:
        css = css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(css + "\n\n" + V25_CSS.strip() + "\n")
    print("✔ Đã cập nhật css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        if "js/v25-time24.js" not in html:
            if '<script src="js/v24-fix-smooth.js"></script>' in html:
                html = html.replace('<script src="js/v24-fix-smooth.js"></script>', '<script src="js/v24-fix-smooth.js"></script>\n  <script src="js/v25-time24.js"></script>')
            else:
                html = html.replace('</body>', '  <script src="js/v25-time24.js"></script>\n</body>')
            with open("index.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("✔ Đã nhúng js/v25-time24.js vào index.html")

    print("\nXONG! Hãy chạy git push để cập nhật lên GitHub.")

if __name__ == "__main__":
    apply_24h()