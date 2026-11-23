// V-CODE EDU — V21 ENGINE (ONLINEGDB TERMINAL, LEFT DRAWER ACCOUNT MGMT, DD/MM/YYYY AUTO-MASK)
(function () {
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let currentAbortCtrl = null;

  function ensureOnlineGDBTerminal() {
    const upperBox = document.querySelector('.v20-ide-upper-box');
    if (!upperBox) return null;

    let termPane = document.getElementById('v21-terminal-pane');
    if (!termPane) {
      termPane = document.createElement('div');
      termPane.id = 'v21-terminal-pane';
      termPane.className = 'v21-term-pane';
      termPane.style.display = 'none';
      termPane.innerHTML = `
        <div class="v21-term-bar">
          <div class="v21-term-title">
            <span class="v21-term-dot"></span>
            <span>Terminal thực thi trực tiếp</span>
          </div>
          <div class="v21-term-actions">
            <button type="button" id="v21-term-stop" class="v21-term-btn stop" style="display:none">Dừng</button>
            <button type="button" id="v21-term-clear" class="v21-term-btn">Xóa màn hình</button>
          </div>
        </div>
        <div id="v21-term-screen" class="v21-term-screen">
          <div class="v21-term-sys">Bấm <strong>Chạy Chương Trình</strong> để chạy code. Khi gặp lệnh <code>input()</code>, gõ trực tiếp giá trị tại đây và nhấn <strong>Enter</strong>.</div>
        </div>
      `;
      upperBox.appendChild(termPane);

      document.getElementById('v21-term-clear').onclick = () => {
        const scr = document.getElementById('v21-term-screen');
        if (scr) scr.innerHTML = `<div class="v21-term-sys">Đã xóa màn hình Terminal. Bấm <strong>Chạy Chương Trình</strong> để thực thi.</div>`;
      };
      document.getElementById('v21-term-stop').onclick = () => {
        if (currentAbortCtrl) currentAbortCtrl.abort();
      };
    }
    return termPane;
  }

  function showConsoleTerminalTab() {
    const ws = document.getElementById('view-workspace') || document.body;
    const upperBox = document.querySelector('.v20-ide-upper-box');
    const termPane = ensureOnlineGDBTerminal();
    if (!upperBox || !termPane) return null;

    const btns = [...ws.querySelectorAll('button')];
    const scBtn = btns.find((b) => /Scratch Live/i.test(b.textContent || ''));
    const conBtn = btns.find((b) => /Kết quả Console|Console/i.test(b.textContent || ''));
    const fcBtn = btns.find((b) => /Sơ đồ khối/i.test(b.textContent || ''));

    [scBtn, conBtn, fcBtn].forEach((b) => b && b.classList.remove('active'));
    if (conBtn) conBtn.classList.add('active');

    [...upperBox.children].forEach((ch) => { ch.style.display = 'none'; });
    termPane.style.display = 'flex';
    return termPane;
  }

  window.runPythonInOnlineGDBTerminal = async function () {
    const ed = document.getElementById('code-editor');
    const code = ed ? ed.value : '';

    if (currentAbortCtrl) currentAbortCtrl.abort();
    currentAbortCtrl = new AbortController();
    const signal = currentAbortCtrl.signal;

    showConsoleTerminalTab();
    const screen = document.getElementById('v21-term-screen');
    const stopBtn = document.getElementById('v21-term-stop');
    if (!screen) return;

    screen.innerHTML = '';
    if (stopBtn) stopBtn.style.display = 'inline-flex';

    const appendLine = (text, cls = 'v21-term-out') => {
      const div = document.createElement('div');
      div.className = cls;
      div.textContent = text;
      screen.appendChild(div);
      screen.scrollTop = screen.scrollHeight;
    };

    const waitForTerminalInput = (promptText) => new Promise((resolve) => {
      const row = document.createElement('div');
      row.className = 'v21-term-input-row';

      const promptSpan = document.createElement('span');
      promptSpan.className = 'v21-term-prompt';
      promptSpan.textContent = promptText ? String(promptText) : '› ';

      const inp = document.createElement('input');
      inp.type = 'text';
      inp.className = 'v21-term-inline-input';
      inp.autocomplete = 'off';
      inp.spellcheck = false;
      inp.placeholder = 'Nhập giá trị rồi nhấn Enter...';

      row.appendChild(promptSpan);
      row.appendChild(inp);
      screen.appendChild(row);
      screen.scrollTop = screen.scrollHeight;
      setTimeout(() => inp.focus(), 20);

      const finish = (val, aborted = false) => {
        inp.disabled = true;
        const locked = document.createElement('span');
        locked.className = 'v21-term-user-val';
        locked.textContent = aborted ? '^C' : val;
        inp.replaceWith(locked);
        resolve(val);
      };

      const onAbort = () => finish('', true);
      signal.addEventListener('abort', onAbort, { once: true });

      inp.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          signal.removeEventListener('abort', onAbort);
          finish(inp.value, false);
        }
      });

      screen.onclick = () => { if (!inp.disabled) inp.focus(); };
    });

    const t0 = performance.now();
    const res = await window.VCodeIDE.runPythonInteractive(code, {
      signal,
      onPrint: (line) => appendLine(line, 'v21-term-out'),
      onInput: waitForTerminalInput
    });
    const elapsed = Math.max(1, Math.round(performance.now() - t0));

    if (stopBtn) stopBtn.style.display = 'none';

    if (res.aborted) {
      appendLine('--- Đã dừng chương trình ---', 'v21-term-warn');
    } else if (!res.ok) {
      appendLine(`LỖI: ${res.error}`, 'v21-term-err');
      if (window.VCodeScratchBridge?.renderDiagnostics) {
        window.VCodeScratchBridge.renderDiagnostics(code, res.error);
      }
    } else {
      appendLine(`...Chương trình kết thúc trong ${elapsed}ms (mã thoát 0).`, 'v21-term-done');
    }
  };

  function bindIDEOnlineGDBControls() {
    const ws = document.getElementById('view-workspace');
    if (!ws) return;

    const stdinEl = document.getElementById('custom-stdin');
    if (stdinEl) {
      const wrap = stdinEl.closest('.stdin-bar, .ide-stdin, .ide-footer') || stdinEl.parentElement;
      if (wrap && wrap !== ws) wrap.style.display = 'none';
    }

    const runBtn = document.getElementById('btn-run-code') || [...ws.querySelectorAll('button')].find((b) => /Chạy Chương Trình/i.test(b.textContent || ''));
    if (runBtn) {
      runBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.runPythonInOnlineGDBTerminal();
      };
    }

    const conBtn = [...ws.querySelectorAll('button')].find((b) => /Kết quả Console|Console/i.test(b.textContent || ''));
    if (conBtn) {
      conBtn.dataset.v20Bound = '1';
      conBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        showConsoleTerminalTab();
      };
    }

    window.runPythonWithInteractiveInput = () => window.runPythonInOnlineGDBTerminal();
    window.switchOutputTab = (t) => {
      if (t === 'console') { showConsoleTerminalTab(); return; }
      const btns = [...ws.querySelectorAll('button')];
      if (t === 'flowchart' || t === 'flow') btns.find((b) => /Sơ đồ khối/i.test(b.textContent || ''))?.click();
      else btns.find((b) => /Scratch Live/i.test(b.textContent || ''))?.click();
    };
  }

  function syncLeftDrawerAccountSections() {
    const drawer = document.getElementById('left-drawer') || document.querySelector('.left-drawer');
    if (!drawer) return;

    const u = window.AppState?.user || null;
    const roleLabel = u?.role === 'teacher' || u?.role === 'admin'
      ? 'Giáo viên'
      : (u?.role === 'student' ? 'Học sinh' : (u ? 'Chưa chọn vai trò' : 'Khách'));

    const sections = [...drawer.querySelectorAll('.drawer-section')];
    const accSec = sections.find((s) => /Tài khoản của bạn/i.test(s.textContent || ''));
    if (accSec) {
      let infoCard = accSec.querySelector('#v21-drawer-user-info');
      if (!infoCard) {
        const titleEl = accSec.firstElementChild;
        accSec.innerHTML = '';
        if (titleEl) accSec.appendChild(titleEl);
        infoCard = document.createElement('div');
        infoCard.id = 'v21-drawer-user-info';
        infoCard.className = 'v21-drawer-info-card';
        accSec.appendChild(infoCard);
      }
      if (u) {
        infoCard.innerHTML = `
          <div class="v21-du-name">${esc(u.full_name || u.username || 'Người dùng')}</div>
          <div class="v21-du-mail">${esc(u.email || 'Chưa cập nhật email')}</div>
          <div class="v21-du-role">Chức vụ: <strong>${esc(roleLabel)}</strong></div>
        `;
      } else {
        infoCard.innerHTML = `
          <div class="v21-du-name">Chưa đăng nhập</div>
          <div class="v21-du-mail">Đăng nhập ở mục Quản lí tài khoản bên dưới để đồng bộ dữ liệu.</div>
          <div class="v21-du-role">Chức vụ: <strong>Khách</strong></div>
        `;
      }
    }

    let sysSec = sections.find((s) => /Kết nối hệ thống|Quản lí tài khoản|OAuth/i.test(s.textContent || ''));
    if (!sysSec) {
      sysSec = document.createElement('div');
      sysSec.className = 'drawer-section';
      drawer.appendChild(sysSec);
    }

    sysSec.innerHTML = `
      <div class="drawer-section-title" style="font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#94A3B8;margin-bottom:10px">QUẢN LÍ TÀI KHOẢN</div>
      <div class="v21-acct-mgmt-list">
        ${u ? `
          <button type="button" class="v21-drawer-action-btn" onclick="if(typeof toggleLeftDrawer==='function')toggleLeftDrawer(false); if(typeof handleTopUserClick==='function')handleTopUserClick();">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Hồ sơ &amp; Thông tin cá nhân</span>
          </button>
          <button type="button" class="v21-drawer-action-btn danger" onclick="if(typeof toggleLeftDrawer==='function')toggleLeftDrawer(false); if(typeof logoutUser==='function'){logoutUser();}else if(typeof handleLogout==='function'){handleLogout();}else{localStorage.removeItem('vcode_user');location.reload();}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Đăng xuất tài khoản</span>
          </button>
        ` : `
          <button type="button" class="v21-drawer-action-btn primary" onclick="if(typeof toggleLeftDrawer==='function')toggleLeftDrawer(false); if(typeof openAuthModal==='function'){openAuthModal('login');}else if(typeof handleTopUserClick==='function'){handleTopUserClick();}">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
            <span>Đăng nhập / Đăng ký</span>
          </button>
        `}
      </div>
    `;
  }

  function enhanceDeadlineRealTimeInput() {
    const attachMask = () => {
      const txtDate = document.getElementById('assign-date-vn');
      const picker = document.getElementById('assign-date-picker');
      const timeInp = document.getElementById('assign-time-vn');
      if (!txtDate) return;

      const pad = (n) => String(n).padStart(2, '0');
      const now = new Date();
      const todayISO = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

      if (picker) {
        picker.min = todayISO;
        if (!picker.value) {
          const tmr = new Date(Date.now() + 86400000);
          picker.value = `${tmr.getFullYear()}-${pad(tmr.getMonth() + 1)}-${pad(tmr.getDate())}`;
        }
      }

      if (txtDate.dataset.v21Masked === '1') return;
      txtDate.dataset.v21Masked = '1';

      const wrap = txtDate.parentElement;
      if (wrap && !wrap.querySelector('.v21-cal-btn')) {
        const calBtn = document.createElement('button');
        calBtn.type = 'button';
        calBtn.className = 'v21-cal-btn';
        calBtn.title = 'Chọn từ lịch thời gian thực';
        calBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
        calBtn.onclick = () => {
          if (picker) {
            if (typeof picker.showPicker === 'function') picker.showPicker();
            else picker.focus();
          }
        };
        wrap.appendChild(calBtn);
      }

      const field = txtDate.closest('.v19-field');
      if (field && !field.querySelector('.v21-realtime-clock')) {
        const clk = document.createElement('div');
        clk.className = 'v21-realtime-clock';
        const refreshClock = () => {
          const d = new Date();
          clk.textContent = `Hiện tại: ${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} • ${pad(d.getHours())}:${pad(d.getMinutes())}`;
        };
        refreshClock();
        setInterval(refreshClock, 30000);
        field.appendChild(clk);
      }

      txtDate.placeholder = '__/__/____';
      txtDate.addEventListener('input', () => {
        const digits = txtDate.value.replace(/\D/g, '').slice(0, 8);
        let formatted = '';
        if (digits.length <= 2) formatted = digits;
        else if (digits.length <= 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
        else formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
        txtDate.value = formatted;

        if (digits.length === 8 && picker) {
          const dd = digits.slice(0, 2), mm = digits.slice(2, 4), yyyy = digits.slice(4, 8);
          picker.value = `${yyyy}-${mm}-${dd}`;
        }
      });

      txtDate.addEventListener('blur', () => {
        if (!txtDate.value.trim()) {
          const tmr = new Date(Date.now() + 86400000);
          txtDate.value = `${pad(tmr.getDate())}/${pad(tmr.getMonth() + 1)}/${tmr.getFullYear()}`;
        }
      });

      if (timeInp && !timeInp.value) timeInp.value = '23:59';
    };

    attachMask();
    setTimeout(attachMask, 400);
    const origOpen = window.openCreateAssignmentModal;
    if (typeof origOpen === 'function') {
      window.openCreateAssignmentModal = function () {
        origOpen();
        setTimeout(attachMask, 30);
      };
    }
  }

  function markQuickTopNavAlwaysDark() {
    const navBtn = [...document.querySelectorAll('header button, nav button')].find((b) => /IDE & Scratch Live/i.test(b.textContent || ''));
    if (navBtn && navBtn.parentElement) {
      navBtn.parentElement.classList.add('v21-always-dark-quicknav');
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    markQuickTopNavAlwaysDark();
    setTimeout(() => {
      bindIDEOnlineGDBControls();
      syncLeftDrawerAccountSections();
      enhanceDeadlineRealTimeInput();
    }, 180);
    setTimeout(() => {
      bindIDEOnlineGDBControls();
      syncLeftDrawerAccountSections();
    }, 650);

    const origDrawer = window.toggleLeftDrawer;
    if (typeof origDrawer === 'function') {
      window.toggleLeftDrawer = function (force) {
        origDrawer(force);
        syncLeftDrawerAccountSections();
      };
    }
    setInterval(syncLeftDrawerAccountSections, 2500);
  });
})();
