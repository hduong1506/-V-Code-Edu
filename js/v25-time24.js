// V-CODE EDU — CUSTOM 24-HOUR TIME PICKER (00:00 - 23:59)
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
