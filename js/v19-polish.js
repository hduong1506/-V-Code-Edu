// V-CODE EDU — POLISH LAYER (HOME DEFAULT, EDITOR-ONLY LIGHT, OLM BLUE-WHITE, DD/MM/YYYY + TIME, GOOGLE CENTER)
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
        const avgScore = asgSubs.length ? Number((asgSubs.reduce((acc, s) => acc + Number(s.teacher_score ?? s.score ?? 0), 0) / asgSubs.length).toFixed(1)) : 0;
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
                <span>Điểm TB: <strong>${asgSubs.length ? avgScore + '/10' : '—'}</strong></span>
              </div>
            </div>
            <div class="v19-asg-btns">
              ${isTeacher ? `
                <button type="button" class="v19-btn-primary" onclick="openV18AssignmentReport('${esc(a.id || a.code)}')">Danh sách &amp; Chấm bài (${doneCount}/${totalStu})</button>
                <button type="button" class="v19-btn-danger-outline" onclick="deleteV19Assignment('${esc(a.id || a.code)}')">Xóa</button>
              ` : (
                mySub
                  ? `<button type="button" class="v19-btn-outline" onclick="openV18StudentSolve('${esc(a.id || a.code)}', true)">Đã nộp • ${mySub.teacher_score ?? mySub.score ?? 0}/10</button>`
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
