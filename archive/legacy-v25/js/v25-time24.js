// V-CODE EDU — CLEAN 24-HOUR TIME PICKER (SELF-STYLED, FIXED POPOVER)
(function () {
  function pad(n) { return String(n).padStart(2, '0'); }

  function injectStyles() {
    if (document.getElementById('v25-time24-inline-style')) return;
    const style = document.createElement('style');
    style.id = 'v25-time24-inline-style';
    style.textContent = `
      .v25-time24-wrap {
        position: relative !important;
        display: flex !important;
        align-items: center !important;
        width: 100% !important;
      }
      .v25-time24-input {
        width: 100% !important;
        padding-right: 40px !important;
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 14px !important;
        font-weight: 600 !important;
        letter-spacing: 0.05em !important;
        box-sizing: border-box !important;
      }
      .v25-time24-btn {
        position: absolute !important;
        right: 6px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        width: 30px !important;
        height: 30px !important;
        padding: 0 !important;
        margin: 0 !important;
        display: grid !important;
        place-items: center !important;
        border-radius: 7px !important;
        background: #EFF6FF !important;
        color: #2563EB !important;
        border: 1px solid #BFDBFE !important;
        cursor: pointer !important;
        transition: background 0.15s ease !important;
      }
      .v25-time24-btn:hover { background: #DBEAFE !important; }
      .v25-time24-pop {
        display: none !important;
        position: fixed !important;
        z-index: 99999 !important;
        width: 216px !important;
        background: #FFFFFF !important;
        border: 1px solid #CBD5E1 !important;
        border-radius: 12px !important;
        box-shadow: 0 18px 40px rgba(15, 23, 42, 0.24) !important;
        overflow: hidden !important;
        flex-direction: column !important;
      }
      .v25-time24-pop.open { display: flex !important; }
      .v25-t-head {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        text-align: center !important;
        padding: 8px 6px !important;
        font-size: 11.5px !important;
        font-weight: 700 !important;
        color: #334155 !important;
        background: #F8FAFC !important;
        border-bottom: 1px solid #E2E8F0 !important;
      }
      .v25-t-cols {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        height: 210px !important;
        background: #FFFFFF !important;
      }
      .v25-t-col {
        overflow-y: auto !important;
        padding: 6px !important;
        display: flex !important;
        flex-direction: column !important;
        gap: 3px !important;
        scrollbar-width: thin !important;
      }
      .v25-col-h { border-right: 1px solid #E2E8F0 !important; }
      .v25-t-opt {
        width: 100% !important;
        border: none !important;
        background: transparent !important;
        color: #0F172A !important;
        padding: 6px 0 !important;
        border-radius: 7px !important;
        font-family: 'JetBrains Mono', monospace !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        text-align: center !important;
        flex-shrink: 0 !important;
      }
      .v25-t-opt:hover { background: #EFF6FF !important; color: #1D4ED8 !important; }
      .v25-t-opt.active { background: #2563EB !important; color: #FFFFFF !important; font-weight: 800 !important; }
      .v25-t-foot {
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        padding: 7px 10px !important;
        background: #F8FAFC !important;
        border-top: 1px solid #E2E8F0 !important;
      }
      .v25-t-now {
        border: none !important;
        background: transparent !important;
        color: #2563EB !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        cursor: pointer !important;
        padding: 3px 6px !important;
      }
      .v25-t-done {
        border: none !important;
        background: #2563EB !important;
        color: #FFFFFF !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        padding: 4px 12px !important;
        border-radius: 6px !important;
        cursor: pointer !important;
      }
      .v25-t-done:hover { background: #1D4ED8 !important; }
    `;
    document.head.appendChild(style);
  }

  function upgradeTo24hPicker() {
    injectStyles();
    const oldInp = document.getElementById('assign-time-vn');
    if (!oldInp || oldInp.dataset.v25Clean === '1') return;

    const currentVal = /^\d{2}:\d{2}$/.test(oldInp.value) ? oldInp.value : '23:59';
    const oldWrap = oldInp.closest('.v25-time24-wrap');

    document.querySelectorAll('.v25-time24-pop').forEach((el) => el.remove());

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
    inp.dataset.v25Clean = '1';

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
      <div class="v25-t-foot">
        <button type="button" class="v25-t-now">23:59</button>
        <button type="button" class="v25-t-done">Xong</button>
      </div>
    `;

    wrap.appendChild(inp);
    wrap.appendChild(btn);
    if (oldWrap) oldWrap.replaceWith(wrap);
    else oldInp.replaceWith(wrap);
    document.body.appendChild(pop);

    const parseHM = () => {
      const m = inp.value.match(/^(\d{1,2}):(\d{1,2})$/);
      const h = m ? Math.min(23, Math.max(0, parseInt(m[1], 10) || 0)) : 23;
      const mi = m ? Math.min(59, Math.max(0, parseInt(m[2], 10) || 0)) : 59;
      return { h: pad(h), m: pad(mi) };
    };

    const positionPopup = () => {
      const r = wrap.getBoundingClientRect();
      const popW = 216, popH = 290;
      let left = Math.max(10, Math.min(r.right - popW, window.innerWidth - popW - 10));
      let top = r.bottom + 6;
      if (top + popH > window.innerHeight - 10) {
        top = Math.max(10, r.top - popH - 6);
      }
      pop.style.left = `${Math.round(left)}px`;
      pop.style.top = `${Math.round(top)}px`;
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
      if (willOpen) {
        positionPopup();
        setTimeout(syncHighlight, 10);
      }
    };

    btn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); togglePop(); };
    inp.addEventListener('click', (e) => { e.stopPropagation(); togglePop(true); });

    inp.addEventListener('input', () => {
      const digits = inp.value.replace(/\D/g, '').slice(0, 4);
      inp.value = digits.length <= 2 ? digits : `${digits.slice(0, 2)}:${digits.slice(2)}`;
    });

    inp.addEventListener('blur', () => {
      const { h, m } = parseHM();
      inp.value = `${h}:${m}`;
    });

    pop.addEventListener('click', (e) => {
      e.stopPropagation();
      if (e.target.closest('.v25-t-done')) { togglePop(false); return; }
      if (e.target.closest('.v25-t-now')) {
        inp.value = '23:59';
        syncHighlight();
        return;
      }
      const b = e.target.closest('.v25-t-opt');
      if (!b) return;
      const cur = parseHM();
      const nh = b.dataset.h ?? cur.h;
      const nm = b.dataset.m ?? cur.m;
      inp.value = `${nh}:${nm}`;
      syncHighlight();
    });

    document.addEventListener('click', (e) => {
      if (!wrap.contains(e.target) && !pop.contains(e.target)) togglePop(false);
    });
    window.addEventListener('resize', () => { if (pop.classList.contains('open')) positionPopup(); }, { passive: true });
  }

  window.addEventListener('DOMContentLoaded', () => {
    injectStyles();
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
