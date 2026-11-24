// V-CODE EDU v16.0 — CORE ENGINE
(function () {
  window.VCodeIcons = {
    menu: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
    plus: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    file: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
    edit: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
    trash: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>'
  };

  function escHtml(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // 1. SMART CODE EDITOR: TAB, SHIFT+TAB, AUTO-INDENT SAU DẤU ':'
  function attachSmartCodeEditor(el) {
    if (!el || el.dataset.v16SmartEditor === '1') return;
    el.dataset.v16SmartEditor = '1';

    el.addEventListener('keydown', function (e) {
      const start = this.selectionStart;
      const end = this.selectionEnd;
      const val = this.value;

      if (e.key === 'Tab') {
        e.preventDefault();
        if (start === end && !e.shiftKey) {
          this.value = val.slice(0, start) + '    ' + val.slice(end);
          this.selectionStart = this.selectionEnd = start + 4;
        } else {
          const lineStart = val.lastIndexOf('\n', start - 1) + 1;
          const lineEndIdx = val.indexOf('\n', end);
          const blockEnd = lineEndIdx === -1 ? val.length : lineEndIdx;
          const lines = val.slice(lineStart, blockEnd).split('\n');
          const transformed = lines.map((ln) => {
            if (e.shiftKey) return ln.startsWith('    ') ? ln.slice(4) : ln.replace(/^\s{1,3}/, '');
            return '    ' + ln;
          }).join('\n');
          this.value = val.slice(0, lineStart) + transformed + val.slice(blockEnd);
          this.selectionStart = lineStart;
          this.selectionEnd = lineStart + transformed.length;
        }
        this.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      if (e.key === 'Enter') {
        e.preventDefault();
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const currentLine = val.slice(lineStart, start);
        const baseIndent = (currentLine.match(/^[ \t]*/) || [''])[0].replace(/\t/g, '    ');
        const trimmed = currentLine.trim();
        const needsExtra = /:$/.test(trimmed);
        const nextIndent = baseIndent + (needsExtra ? '    ' : '');
        this.value = val.slice(0, start) + '\n' + nextIndent + val.slice(end);
        this.selectionStart = this.selectionEnd = start + 1 + nextIndent.length;
        this.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      if (e.key === 'Backspace' && start === end && start >= 4) {
        const lineStart = val.lastIndexOf('\n', start - 1) + 1;
        const beforeCursor = val.slice(lineStart, start);
        if (/^ +$/.test(beforeCursor) && beforeCursor.length % 4 === 0) {
          e.preventDefault();
          this.value = val.slice(0, start - 4) + val.slice(end);
          this.selectionStart = this.selectionEnd = start - 4;
          this.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });
  }

  // 2. SCRATCH LIVE PARSER CHUẨN 100%
  function stripInlineComment(line) {
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

  function parseLineToScratchBlock(rawLine) {
    const t = stripInlineComment(rawLine);
    if (!t) return null;

    let m = t.match(/^(?:if|neu)(?:\s+|\s*(?=\())(.+?):?$/i);
    if (m) return { type: 'control', label: `Nếu <span class="sc-cond">${escHtml(m[1].trim())}</span> thì` };

    m = t.match(/^(?:elif|nguoc_lai_neu)(?:\s+|\s*(?=\())(.+?):?$/i);
    if (m) return { type: 'control', label: `Ngược lại nếu <span class="sc-cond">${escHtml(m[1].trim())}</span> thì` };

    if (/^(?:else|nguoc_lai)\s*:?$/i.test(t)) return { type: 'control', label: `Ngược lại` };

    m = t.match(/^(?:for|lap_voi)\s+([a-zA-Z_]\w*)\s+(?:in|trong_khoang)\s+(.+?):?$/i);
    if (m) {
      let rangeExpr = m[2].trim();
      const rm = rangeExpr.match(/^range\s*\((.*)\)$/);
      if (rm) rangeExpr = rm[1];
      return { type: 'loop', label: `Lặp biến <span class="sc-var">${escHtml(m[1])}</span> trong <span class="sc-val">${escHtml(rangeExpr)}</span>` };
    }

    m = t.match(/^(?:while|khi_ma)(?:\s+|\s*(?=\())(.+?):?$/i);
    if (m) return { type: 'loop', label: `Lặp khi <span class="sc-cond">${escHtml(m[1].trim())}</span>` };

    m = t.match(/^def\s+([a-zA-Z_]\w*)\s*\(([^)]*)\)\s*:?$/i);
    if (m) return { type: 'func', label: `Định nghĩa hàm <span class="sc-val">${escHtml(m[1])}(${escHtml(m[2])})</span>` };

    m = t.match(/^return\b(.*)$/i);
    if (m) return { type: 'func', label: `Trả về <span class="sc-val">${escHtml(m[1].trim() || 'None')}</span>` };

    m = t.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*=\s*(?:int|float|str)?\s*\(?.*(?:input|nhap_so|nhap_chuoi|nhap_so_thuc)\s*\(/i);
    if (m) return { type: 'sensing', label: `Nhập dữ liệu lưu vào <span class="sc-var">${escHtml(m[1])}</span>` };

    m = t.match(/^(?:print|in_ra)\s*\((.*)\)$/i);
    if (m) return { type: 'looks', label: `Hiển thị ra màn hình <span class="sc-val">${escHtml(m[1].trim())}</span>` };

    m = t.match(/^([a-zA-Z_]\w*)\s*(\+=|-=|\*=|\/=)\s*(.+)$/);
    if (m) {
      const opText = { '+=': 'tăng thêm', '-=': 'giảm đi', '*=': 'nhân với', '/=': 'chia cho' }[m[2]];
      return { type: 'data', label: `Thay đổi biến <span class="sc-var">${escHtml(m[1])}</span> ${opText} <span class="sc-val">${escHtml(m[3].trim())}</span>` };
    }
    m = t.match(/^([a-zA-Z_]\w*(?:\s*,\s*[a-zA-Z_]\w*)*)\s*=\s*(.+)$/);
    if (m) return { type: 'data', label: `Đặt biến <span class="sc-var">${escHtml(m[1])}</span> thành <span class="sc-val">${escHtml(m[2].trim())}</span>` };

    if (/^break$/i.test(t)) return { type: 'control', label: `Thoát vòng lặp (break)` };
    if (/^continue$/i.test(t)) return { type: 'control', label: `Bỏ qua lượt lặp` };

    return { type: 'stmt', label: `Lệnh: <span class="sc-val">${escHtml(t)}</span>` };
  }

  window.renderScratchLiveV16 = function (codeText, targetId) {
    const container = document.getElementById(targetId || 'scratch-blocks-view') || document.querySelector('.scratch-canvas, #scratch-preview, #scratch-stage');
    if (!container) return;
    const rawCode = codeText !== undefined ? codeText : (document.getElementById('code-editor')?.value || '');
    const lines = rawCode.replace(/\r\n/g, '\n').split('\n');

    let html = `<div class="sc-hat-block">Khi bấm Chạy Chương Trình (V-Code Edu)</div>`;
    let hasBlock = false;
    for (const raw of lines) {
      const block = parseLineToScratchBlock(raw);
      if (!block) continue;
      hasBlock = true;
      const indentSpaces = (raw.match(/^[ \t]*/) || [''])[0].replace(/\t/g, '    ').length;
      const level = Math.min(5, Math.floor(indentSpaces / 4));
      html += `<div class="sc-block sc-${block.type}" style="margin-left:${level * 22}px">${block.label}</div>`;
    }
    if (!hasBlock) html += `<div style="color:#64748B;font-size:13px;padding:12px 4px">Gõ lệnh Python bên trái để xem khối Scratch 3.0 trực quan...</div>`;
    container.innerHTML = html;
  };
  window.renderScratchLive = (code) => window.renderScratchLiveV16(code);
  window.updateScratchLive = (code) => window.renderScratchLiveV16(code);
  window.updateScratchBlocks = (code) => window.renderScratchLiveV16(code);

  // 3. HỘP THOẠI NHẬP INPUT() TRỰC TIẾP KHI CHẠY PYTHON
  window.openInteractiveInputModal = function (prompts, preValues = []) {
    return new Promise((resolve) => {
      const modal = document.getElementById('ide-input-modal');
      const fields = document.getElementById('ide-input-fields');
      const form = document.getElementById('ide-input-form');
      const cancelBtn = document.getElementById('ide-input-cancel');
      if (!modal || !fields || !form) {
        resolve(prompts.map((p, i) => window.prompt(p, preValues[i] || '') ?? ''));
        return;
      }

      fields.innerHTML = prompts.map((p, i) => `
        <div style="margin-bottom:12px">
          <label style="display:block;font-size:12.5px;font-weight:600;margin-bottom:5px;color:var(--text-secondary)">${escHtml(p)}</label>
          <input class="input-field mono ide-prompt-val" data-idx="${i}" value="${escHtml(preValues[i] || '')}" placeholder="Nhập giá trị..." autocomplete="off" />
        </div>`).join('');

      modal.classList.add('open');
      setTimeout(() => fields.querySelector('input')?.focus(), 40);

      const cleanup = () => { modal.classList.remove('open'); form.onsubmit = null; if (cancelBtn) cancelBtn.onclick = null; };
      form.onsubmit = (e) => {
        e.preventDefault();
        const vals = [...fields.querySelectorAll('.ide-prompt-val')].map((inp) => inp.value);
        cleanup();
        resolve(vals);
      };
      if (cancelBtn) cancelBtn.onclick = () => { cleanup(); resolve(null); };
    });
  };

  window.runPythonWithInteractiveInput = async function (editorId, stdinId, outputId) {
    const code = document.getElementById(editorId)?.value || '';
    const stdinEl = document.getElementById(stdinId);
    let stdinVal = stdinEl ? stdinEl.value : '';

    if (/\b(?:input|nhap_so|nhap_chuoi|nhap_so_thuc)\s*\(/.test(code)) {
      window.__vcodeForceInteractiveInput = true;
      const collected = await window.VCodeIDE.promptMissingInputs(code, stdinVal);
      window.__vcodeForceInteractiveInput = false;
      if (collected === null) return;
      stdinVal = collected;
      if (stdinEl) stdinEl.value = collected;
    }

    const res = window.VCodeIDE.runPython(code, stdinVal);
    const outEl = document.getElementById(outputId);
    if (outEl) {
      if (res.ok) {
        outEl.innerHTML = `<div style="color:#10B981;font-size:11.5px;margin-bottom:6px;font-weight:700">THỰC THI THÀNH CÔNG</div><pre style="margin:0;white-space:pre-wrap;font-family:'JetBrains Mono',monospace">${escHtml(res.output || '(Không có dữ liệu in ra)')}</pre>`;
      } else {
        outEl.innerHTML = `<div style="color:#F43F5E;font-size:11.5px;margin-bottom:6px;font-weight:700">LỖI CHƯƠNG TRÌNH</div><pre style="margin:0;white-space:pre-wrap;color:#FDA4AF;font-family:'JetBrains Mono',monospace">${escHtml(res.error)}</pre>`;
      }
    }
    if (typeof window.switchOutputTab === 'function') {
      try { window.switchOutputTab('console'); } catch {}
    }
    return res;
  };

  // 4. FIX GOOGLE LOGIN TRÊN ĐIỆN THOẠI (POPUP FIRST + onAuthStateChanged)
  window.handleRealSocialLogin = async function () {
    if (!window.VCodeOAuth || !window.VCodeOAuth.isConfigured()) {
      document.getElementById('oauth-config-modal')?.classList.add('open');
      return;
    }
    try {
      if (!firebase.apps.length) firebase.initializeApp(window.VCODE_FIREBASE_CONFIG);
      const authProv = new firebase.auth.GoogleAuthProvider();
      authProv.setCustomParameters({ prompt: 'select_account' });
      try {
        const result = await firebase.auth().signInWithPopup(authProv);
        await window.finalizeSocialFirebaseUser(result.user, 'google');
      } catch (popupErr) {
        if (popupErr.code === 'auth/popup-blocked' || popupErr.code === 'auth/operation-not-supported-in-this-environment') {
          await firebase.auth().signInWithRedirect(authProv);
        } else if (popupErr.code !== 'auth/popup-closed-by-user' && popupErr.code !== 'auth/cancelled-popup-request') {
          throw popupErr;
        }
      }
    } catch (err) {
      alert(`Không thể đăng nhập bằng Google: ${err.message}`);
    }
  };

  function initFirebaseAuthListener() {
    if (!window.VCodeOAuth?.isConfigured() || typeof firebase === 'undefined' || !firebase.auth) return;
    if (!firebase.apps.length) firebase.initializeApp(window.VCODE_FIREBASE_CONFIG);
    firebase.auth().getRedirectResult().then(async (red) => {
      if (red && red.user) await window.finalizeSocialFirebaseUser(red.user, 'google');
    }).catch(() => {});

    firebase.auth().onAuthStateChanged(async (fbUser) => {
      if (fbUser && !window.AppState?.user) {
        await window.finalizeSocialFirebaseUser(fbUser, 'google');
      }
    });
  }

  // 5. MENU 3 THANH (LỚP) + FIX GIAO BÀI TẬP LÊN FIRESTORE
  window.toggleClassMenuDrawer = function () {
    document.getElementById('vcode-class-dropdown-panel')?.classList.toggle('open');
  };

  const _origInitClass = window.initClassroomPortalData;
  window.initClassroomPortalData = async function () {
    const tEl = document.getElementById('olm-teacher-name');
    const cEl = document.getElementById('olm-class-title');
    if (tEl && tEl.textContent.includes('Nguyễn Phi Hùng')) tEl.textContent = '—';
    if (cEl && cEl.textContent.includes('10A1')) cEl.textContent = 'Đang tải lớp học...';

    if (typeof _origInitClass === 'function') await _origInitClass();

    const u = window.AppState?.user;
    if (!u || !u.role || u.role === 'none') return;
    const isTeacher = u.role === 'teacher' || u.role === 'admin';
    const classes = window.AppState.olmClasses || [];
    const activeCode = window.AppState.activeClassroomCode || '';
    const activeCls = classes.find((c) => c.code === activeCode);
    const pills = document.getElementById('olm-class-pills');
    const actBox = document.getElementById('olm-role-actions');

    if (pills) {
      pills.innerHTML = `
        <div class="vcode-class-menu-wrap">
          <button type="button" class="vcode-hamburger-class-btn" onclick="toggleClassMenuDrawer()">
            ${window.VCodeIcons.menu}
            <span>Lớp${activeCls ? ': ' + escHtml(activeCls.name) : ''}</span>
            <span class="vcode-count-pill">${classes.length}</span>
          </button>
          <div id="vcode-class-dropdown-panel" class="vcode-class-dropdown-panel">
            <div class="vcode-cd-header">
              <span>Danh sách lớp (${classes.length})</span>
              ${isTeacher ? `<button type="button" class="btn btn-primary btn-sm" style="padding:4px 10px;font-size:11.5px" onclick="toggleClassMenuDrawer();document.getElementById('create-class-modal').classList.add('open')">+ Tạo lớp</button>` : ''}
            </div>
            <div class="vcode-cd-list">
              ${classes.length ? classes.map((c) => `
                <div class="vcode-cd-item ${c.code === activeCode ? 'active' : ''}">
                  <div class="vcode-cd-info" onclick="toggleClassMenuDrawer();selectOlmClass('${c.code}')">
                    <div class="vcode-cd-name">${escHtml(c.name)}</div>
                    <div class="vcode-cd-meta">Mã: <strong>${escHtml(c.code)}</strong> • ${(c.students || []).length} thành viên</div>
                  </div>
                  ${isTeacher ? `
                    <div class="vcode-cd-actions">
                      <button type="button" title="Đổi tên lớp" onclick="toggleClassMenuDrawer();renameClassAction('${c.code}','${escHtml(c.name).replace(/'/g, '')}')">${window.VCodeIcons.edit}</button>
                      <button type="button" title="Xóa lớp" class="danger" onclick="toggleClassMenuDrawer();deleteClassAction('${c.code}')">${window.VCodeIcons.trash}</button>
                    </div>` : ''}
                </div>`).join('') : `<div style="padding:16px;text-align:center;color:var(--text-secondary);font-size:13px">Bạn chưa có lớp học nào.</div>`}
            </div>
          </div>
        </div>`;
    }

    if (actBox && isTeacher) {
      actBox.innerHTML = `
        <button class="btn btn-primary btn-sm" onclick="document.getElementById('create-class-modal').classList.add('open')">${window.VCodeIcons.plus} Tạo lớp mới</button>
        <button class="btn btn-blue btn-sm" onclick="openCreateAssignmentModal()">${window.VCodeIcons.file} Giao bài tập</button>`;
    }
  };

  window.handleCreateAssignmentSubmit = async function (e) {
    e.preventDefault();
    const form = e.target;
    const code = window.AppState?.activeClassroomCode;
    const u = window.AppState?.user;
    if (!code) { alert('Bạn cần chọn hoặc tạo một lớp học trước khi giao bài tập.'); return; }

    const pick = (...ids) => {
      for (const id of ids) {
        const el = document.getElementById(id) || form?.querySelector(`[name="${id}"]`);
        if (el && el.value !== undefined) return el.value.trim();
      }
      return '';
    };
    const allInputs = [...(form ? form.querySelectorAll('input:not([type="hidden"])') : [])];
    const allAreas = [...(form ? form.querySelectorAll('textarea') : [])];

    const title = pick('assign-title', 'new-assign-title', 'hw-title') || (allInputs[0]?.value || '').trim();
    const desc = pick('assign-desc', 'new-assign-desc', 'hw-desc') || (allAreas[0]?.value || '').trim();
    const lang = pick('assign-lang', 'new-assign-lang', 'hw-lang') || (form?.querySelector('select')?.value || 'python');
    const due = pick('assign-due', 'new-assign-due', 'hw-due') || 'Không giới hạn';
    const starter = pick('assign-starter', 'new-assign-starter', 'hw-starter') || (allAreas[1]?.value || '# Viết lời giải tại đây\n');
    const tcInput = pick('assign-tc-in', 'assign-stdin', 'hw-tc-in');
    const tcExpected = pick('assign-tc-out', 'assign-expected', 'hw-tc-out');

    if (!title) { alert('Vui lòng nhập tiêu đề bài tập.'); return; }

    const assignmentObj = {
      id: 'asg_' + Date.now(),
      code: 'BT' + Math.floor(100 + Math.random() * 900),
      classroom_code: code,
      title,
      description: desc || 'Hoàn thành bài tập lập trình theo yêu cầu giáo viên.',
      language: lang,
      due_date: due,
      starter_code: starter,
      teacher_name: u?.full_name || 'Giáo viên',
      test_cases: tcExpected ? [{ input: tcInput, expected: tcExpected }] : [{ input: '6', expected: '12' }],
      created_at: Date.now()
    };

    let saved = false;
    if (window.VCodeCloudDB?.isReady()) {
      try { await window.VCodeCloudDB.addAssignment(code, assignmentObj); saved = true; }
      catch (err) { console.error('Firestore addAssignment error:', err); }
    }
    if (!saved) {
      try { await apiRequest('/api/classes/assign', { method: 'POST', body: JSON.stringify(assignmentObj) }); saved = true; }
      catch {
        const ldb = window.LocalClassDB.load();
        const cls = ldb.classes.find((c) => c.code === code);
        if (cls) { cls.assignments = cls.assignments || []; cls.assignments.unshift(assignmentObj); window.LocalClassDB.save(ldb); saved = true; }
      }
    }

    if (saved) {
      closeModal('create-assignment-modal');
      form?.reset();
      showToast(`Đã giao bài tập "${title}" vào lớp ${code}`);
      await window.selectOlmClass(code);
    } else {
      alert('Không thể lưu bài tập. Vui lòng kiểm tra kết nối mạng và thử lại.');
    }
  };

  // 6. ANIMATION CHUỘT & 3D MƯỢT 60FPS PHONG CÁCH HODL.SWISS
  function initSwissAnimations() {
    const isTouch = window.matchMedia('(pointer: coarse)').matches;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.swiss-reveal').forEach((el) => observer.observe(el));

    if (isTouch) return;

    const glow = document.getElementById('swiss-cursor-glow');
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, gx = mx, gy = my;
    if (glow) {
      window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
      const tick = () => {
        gx += (mx - gx) * 0.14; gy += (my - gy) * 0.14;
        glow.style.transform = `translate3d(${gx - 220}px, ${gy - 220}px, 0)`;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }

    document.querySelectorAll('.swiss-tilt-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 10).toFixed(2)}deg) rotateY(${((x - 0.5) * 12).toFixed(2)}deg) translateY(-3px)`;
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      }, { passive: true });
      card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)'; });
    });

    document.querySelectorAll('.swiss-magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate3d(${((e.clientX - (r.left + r.width / 2)) * 0.18).toFixed(1)}px, ${((e.clientY - (r.top + r.height / 2)) * 0.18).toFixed(1)}px, 0)`;
      }, { passive: true });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate3d(0, 0, 0)'; });
    });
  }

  window.addEventListener('DOMContentLoaded', () => {
    ['code-editor', 'exam-code-editor', 'challenge-code-editor', 'assign-starter'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) attachSmartCodeEditor(el);
    });

    const mainEditor = document.getElementById('code-editor');
    if (mainEditor) {
      const sync = () => window.renderScratchLiveV16(mainEditor.value);
      mainEditor.addEventListener('input', sync);
      mainEditor.addEventListener('keyup', sync);
      setTimeout(sync, 120);
    }

    const runBtn = document.getElementById('btn-run-code') || document.querySelector('[onclick*="runCode"], [onclick*="runMainIDE"]');
    if (runBtn) {
      runBtn.onclick = (e) => { e.preventDefault(); window.runPythonWithInteractiveInput('code-editor', 'custom-stdin', 'console-output'); };
    }

    const assignForm = document.querySelector('#create-assignment-modal form');
    if (assignForm) assignForm.onsubmit = window.handleCreateAssignmentSubmit;

    document.addEventListener('click', (e) => {
      const wrap = document.querySelector('.vcode-class-menu-wrap');
      const panel = document.getElementById('vcode-class-dropdown-panel');
      if (panel && panel.classList.contains('open') && wrap && !wrap.contains(e.target)) panel.classList.remove('open');
    });

    initFirebaseAuthListener();
    initSwissAnimations();
  });
})();

// V16.1: Đặt IDE mặc định chỉ gồm hướng dẫn ngắn, bấm nút ví dụ mới chèn code mẫu
window.addEventListener('DOMContentLoaded', () => {
  const ed = document.getElementById('code-editor');
  if (ed && (!ed.value.trim() || ed.value.includes('Bài 3: Tính tổng các số chẵn'))) {
    ed.value = `# Viết chương trình Python của bạn tại đây...\n# Mẹo: Dùng phím Tab để thụt lề, hoặc bấm các nút ví dụ bên trên (+ Nhập số N, + Vòng lặp for...) để chèn mẫu nhanh.\n`;
    if (window.VCodeScratchBridge) window.VCodeScratchBridge.render(ed.value);
  }
});
// V17.0: HODL.SWISS MOUSE ANIMATION + AUTO-FIND SCRATCH LIVE CONTAINER
(function () {
  function findScratchContainer() {
    const ids = ['scratch-blocks-view', 'scratch-blocks-container', 'scratch-canvas', 'scratch-stage', 'scratch-live-content', 'scratch-output', 'scratch-preview'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return document.querySelector('[id*="scratch"][id*="block"], [id*="scratch"][id*="view"], [id*="scratch"][id*="canvas"], .scratch-workspace, .scratch-canvas');
  }

  window.addEventListener('DOMContentLoaded', () => {
    const ed = document.getElementById('code-editor');
    const scBox = findScratchContainer();
    if (ed && scBox && window.VCodeScratchBridge) {
      const syncNow = () => window.VCodeScratchBridge.render(ed.value, scBox);
      ed.addEventListener('input', syncNow);
      ed.addEventListener('keyup', syncNow);
      setTimeout(syncNow, 150);
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); obs.unobserve(en.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('.hodl-reveal').forEach((el) => obs.observe(el));

    if (window.matchMedia('(pointer: coarse)').matches) return;

    const glow = document.getElementById('hodl-cursor-glow');
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, gx = mx, gy = my;
    if (glow) {
      window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
      const loop = () => {
        gx += (mx - gx) * 0.14; gy += (my - gy) * 0.14;
        glow.style.transform = `translate3d(${gx - 230}px, ${gy - 230}px, 0)`;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    document.querySelectorAll('.hodl-tilt-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 11).toFixed(2)}deg) rotateY(${((x - 0.5) * 13).toFixed(2)}deg) translateY(-4px)`;
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      }, { passive: true });
      card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)'; });
    });

    document.querySelectorAll('.hodl-magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate3d(${((e.clientX - (r.left + r.width / 2)) * 0.18).toFixed(1)}px, ${((e.clientY - (r.top + r.height / 2)) * 0.18).toFixed(1)}px, 0)`;
      }, { passive: true });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate3d(0, 0, 0)'; });
    });
  });
})();
