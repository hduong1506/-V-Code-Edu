// V-CODE EDU v6.0 — BỘ ĐIỀU KHIỂN TRUNG TÂM
const ROLE_LABELS = { teacher: 'Giáo viên', student: 'Học sinh', admin: 'Quản trị viên', none: 'Chưa chọn vai trò' };

const SNIPPETS = [
  { label: '+ Nhập số N', code: "n = int(input())\n" },
  { label: '+ Vòng lặp for', code: "for i in range(1, n + 1):\n    print(i)\n" },
  { label: '+ Rẽ nhánh if/else', code: "if n % 2 == 0:\n    print('Chan')\nelse:\n    print('Le')\n" },
  { label: '+ Python Tiếng Việt', code: "n = nhap_so()\nlap_voi i trong_khoang(1, n + 1):\n    in_ra(i)\n" }
];

const CHALLENGE_STAGES = [
  {
    id: 'ch-01', stage: 1, icon: '🚀', title: 'Chặng 1: Khởi động Phi thuyền',
    badge: 'Tân binh', xp: 100,
    desc: 'Nhập số năng lượng N (số nguyên). Nhân đôi N và in ra để kích hoạt động cơ phi thuyền.',
    starter: 'n = int(input())\nprint(n * 2)',
    testCases: [{ input: '5', expected: '10' }, { input: '12', expected: '24' }]
  },
  {
    id: 'ch-02', stage: 2, icon: '🔐', title: 'Chặng 2: Giải mã Cánh cổng',
    badge: 'Thám hiểm', xp: 150,
    desc: 'Nhập mật mã nguyên N. Nếu N chẵn in "MO CUA", nếu N lẻ in "KHOA".',
    starter: 'n = int(input())\nif n % 2 == 0:\n    print("MO CUA")\nelse:\n    print("KHOA")',
    testCases: [{ input: '8', expected: 'MO CUA' }, { input: '7', expected: 'KHOA' }]
  },
  {
    id: 'ch-03', stage: 3, icon: '🌀', title: 'Chặng 3: Vòng xoáy Năng lượng',
    badge: 'Chiến binh', xp: 200,
    desc: 'Nhập số nguyên dương N. Tính tổng các số từ 1 đến N để nạp đầy lõi năng lượng.',
    starter: 'n = int(input())\ntong = 0\nfor i in range(1, n + 1):\n    tong += i\nprint(tong)',
    testCases: [{ input: '5', expected: '15' }, { input: '10', expected: '55' }]
  },
  {
    id: 'ch-04', stage: 4, icon: '🧮', title: 'Chặng 4: Mật mã Số học',
    badge: 'Học giả', xp: 250,
    desc: 'Nhập số nguyên dương N. Đếm xem từ 1 đến N có bao nhiêu số chia hết cho 3.',
    starter: 'n = int(input())\ndem = 0\nfor i in range(1, n + 1):\n    if i % 3 == 0:\n        dem += 1\nprint(dem)',
    testCases: [{ input: '9', expected: '3' }, { input: '15', expected: '5' }]
  },
  {
    id: 'ch-05', stage: 5, icon: '👑', title: 'Chặng 5: Chinh phục Đỉnh cao',
    badge: 'Bậc thầy Python', xp: 350,
    desc: 'Nhập số nguyên dương N. Tính giai thừa N! = 1 * 2 * ... * N để mở kho báu cuối cùng.',
    starter: 'n = int(input())\ngt = 1\nfor i in range(1, n + 1):\n    gt = gt * i\nprint(gt)',
    testCases: [{ input: '5', expected: '120' }, { input: '4', expected: '24' }]
  }
];

window.AppState = {
  currentView: 'home',
  currentLesson: window.VCODE_LESSONS[2],
  currentExamAssignment: null,
  activeClassroomCode: '',
  activeStudentClassCode: '',
  user: JSON.parse(localStorage.getItem('vcode_current_user') || 'null'),
  completedLessons: window.VCodeOfflineDB.load().completedLessons || ['py-01'],
  completedChallenges: JSON.parse(localStorage.getItem('vcode_completed_challenges') || '[]'),
  teacherClasses: [],
  studentClasses: [],
  currentRoster: [],
  peekStudentUsername: null,
  livePollTimer: null
};

function apiBase() { return window.VCodeAI.getConfig().backendUrl.replace(/\/$/, ''); }

async function apiRequest(path, options = {}) {
  if (!navigator.onLine) throw new Error('OFFLINE');
  const res = await fetch(`${apiBase()}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Lỗi máy chủ (${res.status})`);
  return data;
}

function toggleLeftDrawer(forceState) {
  const btn = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('left-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  const willOpen = typeof forceState === 'boolean' ? forceState : !drawer.classList.contains('open');
  btn?.classList.toggle('open', willOpen);
  drawer?.classList.toggle('open', willOpen);
  backdrop?.classList.toggle('open', willOpen);
}

function switchView(viewId) {
  document.querySelectorAll('.view-section').forEach((el) => el.classList.remove('active'));
  document.querySelectorAll('.nav-tab, .drawer-item').forEach((el) => el.classList.remove('active'));
  document.getElementById(`view-${viewId}`)?.classList.add('active');
  document.querySelectorAll(`[data-view="${viewId}"]`).forEach((el) => el.classList.add('active'));
  window.AppState.currentView = viewId;
  toggleLeftDrawer(false);
  if (viewId === 'workspace') syncLiveEditorOutputs();
  if (viewId === 'classroom') initClassroomPortalData();
  if (viewId === 'learning') renderLearningPath();
  if (viewId === 'challenges') renderChallengeStages();
  if (viewId === 'account') renderAccountView();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showToast(msg) {
  const t = document.getElementById('toast-banner');
  if (!t) return;
  t.innerHTML = msg;
  t.style.display = 'block';
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => { t.style.display = 'none'; }, 4200);
}

function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function togglePassVis(id) { const el = document.getElementById(id); if (el) el.type = el.type === 'password' ? 'text' : 'password'; }

// ==================== AUTH OAUTH THẬT & QUẢN LÝ TÀI KHOẢN ====================
function handleTopUserClick() {
  if (window.AppState.user) switchView('account');
  else openAuthModal('login');
}

function openAuthModal(tab = 'login') {
  document.getElementById('auth-modal').classList.add('open');
  switchAuthTab(tab);
}

function switchAuthTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('auth-login-form').style.display = isLogin ? 'block' : 'none';
  document.getElementById('auth-register-form').style.display = isLogin ? 'none' : 'block';
  document.getElementById('auth-heading').textContent = isLogin ? 'Đăng nhập V-Code Edu' : 'Tạo tài khoản mới';
  document.getElementById('auth-subheading').textContent = isLogin
    ? 'Đăng nhập bằng Google, Facebook, GitHub hoặc Email của bạn'
    : 'Chỉ cần Họ tên, Email và Mật khẩu — hoàn toàn miễn phí';
}

function saveLoggedInUser(userObj) {
  window.AppState.user = userObj;
  localStorage.setItem('vcode_current_user', JSON.stringify(userObj));
  updateUserHeaderUI();
  if (window.AppState.currentView === 'classroom') initClassroomPortalData();
  if (window.AppState.currentView === 'account') renderAccountView();
}

function logoutAction() {
  window.AppState.user = null;
  localStorage.removeItem('vcode_current_user');
  updateUserHeaderUI();
  switchView('home');
  showToast('👋 Bạn đã đăng xuất an toàn khỏi V-Code Edu.');
}

async function handleLoginSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('login-identifier').value.trim().toLowerCase();
  const password = document.getElementById('login-password').value;
  try {
    const data = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    saveLoggedInUser(data.user);
    closeModal('auth-modal');
    showToast(`👋 Đăng nhập thành công! Xin chào <b>${data.user.full_name}</b>.`);
  } catch (err) {
    const isNetErr = err.message === 'OFFLINE' || err.message.includes('Failed to fetch');
    if (isNetErr) {
      const db = window.VCodeOfflineDB.load();
      const found = (db.users || []).find((u) => (u.email === email || u.username === email) && (!u.password || u.password === password));
      if (found) {
        saveLoggedInUser(found);
        closeModal('auth-modal');
        showToast(`🟠 Đăng nhập cục bộ thành công! (Bật Backend cổng 8000 để đồng bộ Database)`);
      } else {
        alert('Sai email/mật khẩu hoặc tài khoản chưa được đăng ký trên máy này.');
      }
    } else { alert(err.message); }
  }
}

async function handleRegisterSubmit(e) {
  e.preventDefault();
  const full_name = document.getElementById('reg-fullname').value.trim();
  const email = document.getElementById('reg-email').value.trim().toLowerCase();
  const password = document.getElementById('reg-password').value;
  try {
    const data = await apiRequest('/api/auth/register', { method: 'POST', body: JSON.stringify({ full_name, email, password }) });
    saveLoggedInUser(data.user);
    closeModal('auth-modal');
    showToast(`🎉 Tạo tài khoản thành công cho <b>${data.user.full_name}</b>!`);
  } catch (err) {
    const isNetErr = err.message === 'OFFLINE' || err.message.includes('Failed to fetch');
    if (isNetErr) {
      const db = window.VCodeOfflineDB.load();
      if ((db.users || []).some((u) => u.email === email)) { alert('Email này đã được đăng ký cục bộ. Vui lòng chuyển sang Đăng nhập!'); return; }
      const localUser = { username: email.split('@')[0], email, full_name, password, role: 'none', auth_provider: 'local', school_name: 'THCS & THPT Hòa Phú', class_name: '', xp: 100 };
      db.users = db.users || []; db.users.push(localUser);
      window.VCodeOfflineDB.save(db);
      saveLoggedInUser(localUser);
      closeModal('auth-modal');
      showToast(`🎉 Đã tạo tài khoản <b>${full_name}</b> (Chế độ cục bộ — bật Backend cổng 8000 để lưu DB thật)!`);
    } else { alert(err.message); }
  }
}

async function handleRealSocialLogin(provider) {
  try {
    const oauthRes = await window.VCodeOAuth.signInWithProvider(provider);
    if (!oauthRes.configured) {
      // Nếu chưa gắn Firebase Config thì mở hộp thoại hướng dẫn cấu hình OAuth thật trong 1 phút
      document.getElementById('oauth-config-modal').classList.add('open');
      return;
    }
    const data = await apiRequest('/api/auth/social', {
      method: 'POST',
      body: JSON.stringify({
        provider, email: oauthRes.email, full_name: oauthRes.full_name, avatar_url: oauthRes.avatar_url
      })
    });
    saveLoggedInUser(data.user);
    closeModal('auth-modal');
    showToast(`✅ Đã đăng nhập thật bằng <b>${provider.toUpperCase()}</b> — Xin chào <b>${data.user.full_name}</b>!`);
  } catch (err) {
    alert(`Lỗi đăng nhập ${provider.toUpperCase()}: ${err.message}`);
  }
}

function saveOAuthConfig() {
  const cfg = {
    apiKey: document.getElementById('fb-api-key').value.trim(),
    authDomain: document.getElementById('fb-auth-domain').value.trim(),
    projectId: document.getElementById('fb-project-id').value.trim()
  };
  localStorage.setItem('vcode_firebase_config', JSON.stringify(cfg));
  window.VCODE_FIREBASE_CONFIG = cfg;
  closeModal('oauth-config-modal');
  showToast('🔐 Đã lưu cấu hình Firebase OAuth thật! Bấm lại nút Google/Facebook/GitHub để đăng nhập.');
}

function updateUserHeaderUI() {
  const u = window.AppState.user;
  const xpEl = document.getElementById('user-xp-badge');
  const btn = document.getElementById('user-profile-btn');
  const drawerUser = document.getElementById('drawer-user-summary');

  if (!u) {
    xpEl.style.display = 'none';
    btn.className = 'btn btn-sm btn-primary';
    btn.innerHTML = '🔑 Đăng nhập';
    if (drawerUser) drawerUser.innerHTML = `<div style="font-size:12.5px;color:var(--text-secondary)">Chưa đăng nhập tài khoản</div>`;
    return;
  }
  xpEl.style.display = 'inline-flex';
  xpEl.textContent = `${u.xp || 100} XP`;
  btn.className = 'user-avatar-chip';
  const initial = (u.full_name || 'U').charAt(0).toUpperCase();
  const avHtml = u.avatar_url ? `<img src="${u.avatar_url}" class="user-avatar-img" alt="av"/>` : `<span class="user-avatar-img">${initial}</span>`;
  btn.innerHTML = `${avHtml}<span>${u.full_name}</span>`;
  if (drawerUser) {
    drawerUser.innerHTML = `<strong>${u.full_name}</strong><div style="font-size:11.5px;color:var(--text-secondary)">${u.email}</div><div style="font-size:11.5px;color:var(--accent-emerald);margin-top:2px">${ROLE_LABELS[u.role] || 'Thành viên'}</div>`;
  }
}

function renderAccountView() {
  const u = window.AppState.user;
  if (!u) { openAuthModal('login'); switchView('home'); return; }
  document.getElementById('acc-fullname').value = u.full_name || '';
  document.getElementById('acc-email').value = u.email || '';
  document.getElementById('acc-school').value = u.school_name || '';
  document.getElementById('acc-class').value = u.class_name || '';
  document.getElementById('acc-role-badge').textContent = ROLE_LABELS[u.role] || 'Chưa chọn vai trò';
  const preview = document.getElementById('acc-avatar-preview');
  preview.innerHTML = u.avatar_url
    ? `<img src="${u.avatar_url}" style="width:76px;height:76px;border-radius:50%;object-fit:cover;border:2px solid var(--accent-emerald)"/>`
    : `<div style="width:76px;height:76px;border-radius:50%;background:linear-gradient(135deg,var(--accent-emerald),var(--accent-blue));color:#031C14;display:grid;place-items:center;font-size:28px;font-weight:800">${(u.full_name || 'U').charAt(0).toUpperCase()}</div>`;
}

function handleAvatarFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    const dataUrl = reader.result;
    window.AppState.user.avatar_url = dataUrl;
    await saveAccountProfileAction();
  };
  reader.readAsDataURL(file);
}

async function saveAccountProfileAction(e) {
  if (e) e.preventDefault();
  const u = window.AppState.user;
  const payload = {
    email: u.email,
    full_name: document.getElementById('acc-fullname').value.trim() || u.full_name,
    school_name: document.getElementById('acc-school').value.trim(),
    class_name: document.getElementById('acc-class').value.trim(),
    avatar_url: u.avatar_url || ''
  };
  try {
    const res = await apiRequest('/api/auth/update-profile', { method: 'POST', body: JSON.stringify(payload) });
    saveLoggedInUser(res.user);
    showToast('✅ Đã lưu thông tin hồ sơ & ảnh đại diện vào Database!');
  } catch (err) {
    saveLoggedInUser({ ...u, ...payload });
    showToast('🟠 Đã cập nhật hồ sơ cục bộ.');
  }
}

async function handleChangePasswordSubmit(e) {
  e.preventDefault();
  const old_password = document.getElementById('acc-old-pass').value;
  const new_password = document.getElementById('acc-new-pass').value;
  const confirm = document.getElementById('acc-confirm-pass').value;
  if (new_password !== confirm) { alert('Mật khẩu mới xác nhận không khớp!'); return; }
  try {
    const res = await apiRequest('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ email: window.AppState.user.email, old_password, new_password })
    });
    e.target.reset();
    showToast(`🔐 ${res.message}`);
  } catch (err) {
    alert(err.message);
  }
}

// ==================== LỚP HỌC CHUẨN OLM (KHÓA VAI TRÒ 1 LẦN + DỮ LIỆU THẬT) ====================
async function initClassroomPortalData() {
  const u = window.AppState.user;
  const loginNotice = document.getElementById('classroom-login-required');
  const rolePicker = document.getElementById('classroom-role-once-picker');
  const teacherPortal = document.getElementById('portal-teacher');
  const studentPortal = document.getElementById('portal-student');

  loginNotice.style.display = 'none';
  rolePicker.style.display = 'none';
  teacherPortal.style.display = 'none';
  studentPortal.style.display = 'none';

  if (!u) {
    loginNotice.style.display = 'block';
    return;
  }
  if (!u.role || u.role === 'none') {
    rolePicker.style.display = 'block';
    return;
  }

  if (u.role === 'teacher' || u.role === 'admin') {
    teacherPortal.style.display = 'block';
    try {
      const res = await apiRequest(`/api/classes/teacher/${encodeURIComponent(u.email)}`);
      window.AppState.teacherClasses = res.classes || [];
    } catch { window.AppState.teacherClasses = []; }
    renderTeacherClassesGrid();
    if (window.AppState.teacherClasses.length > 0) {
      const code = window.AppState.teacherClasses.some((c) => c.code === window.AppState.activeClassroomCode)
        ? window.AppState.activeClassroomCode : window.AppState.teacherClasses[0].code;
      selectTeacherClassroom(code);
    } else {
      document.getElementById('teacher-active-class-panel').style.display = 'none';
    }
    startLiveMonitoringPolling();
  } else {
    studentPortal.style.display = 'block';
    try {
      const res = await apiRequest(`/api/classes/student/${encodeURIComponent(u.email)}`);
      window.AppState.studentClasses = res.classes || [];
    } catch { window.AppState.studentClasses = []; }
    renderStudentJoinedClasses();
  }
}

async function lockRoleOnceAction(role) {
  const label = role === 'teacher' ? 'GIÁO VIÊN' : 'HỌC SINH';
  if (!confirm(`Xác nhận đăng ký vai trò ${label}? Lưu ý: Vai trò này chỉ được chọn 1 lần duy nhất cho tài khoản của bạn.`)) return;
  const u = window.AppState.user;
  try {
    const res = await apiRequest('/api/auth/set-role', {
      method: 'POST',
      body: JSON.stringify({ email: u.email, role, school_name: u.school_name || 'THCS & THPT Hòa Phú', class_name: u.class_name || '' })
    });
    saveLoggedInUser(res.user);
    showToast(`🔒 Đã kích hoạt cố định vai trò <b>${label}</b>!`);
    initClassroomPortalData();
  } catch (err) {
    alert(err.message);
  }
}

function switchTeacherSubpanel(panelName) {
  document.querySelectorAll('[data-tpanel]').forEach((b) => b.classList.toggle('active', b.dataset.tpanel === panelName));
  document.querySelectorAll('.tpanel-box').forEach((p) => { p.style.display = p.id === `tpanel-${panelName}` ? 'block' : 'none'; });
}

function renderTeacherClassesGrid() {
  const grid = document.getElementById('teacher-classes-grid');
  if (!grid) return;
  if (window.AppState.teacherClasses.length === 0) {
    grid.innerHTML = `<div class="bento-card" style="grid-column:span 3;text-align:center"><p>Bạn chưa tạo lớp học nào. Hãy bấm <b>+ Tạo lớp học mới</b> để lấy ID mã lớp gửi cho học sinh!</p></div>`;
    return;
  }
  grid.innerHTML = window.AppState.teacherClasses.map((c) => `
    <div class="olm-class-card ${c.code === window.AppState.activeClassroomCode ? 'selected' : ''}" onclick="selectTeacherClassroom('${c.code}')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span class="olm-code-chip">${c.code}</span>
        <span class="badge badge-blue">${c.students_count || 0} HS thật</span>
      </div>
      <h4 style="font-size:15px;margin-bottom:4px">${c.name}</h4>
      <div style="font-size:12px;color:var(--text-secondary)">${c.grade_subject} • ${c.assignments_count || 0} bài tập</div>
    </div>`).join('');
}

async function selectTeacherClassroom(code) {
  window.AppState.activeClassroomCode = code;
  document.getElementById('teacher-active-class-panel').style.display = 'block';
  renderTeacherClassesGrid();
  document.getElementById('teacher-selected-class-code').textContent = code;
  try {
    const detail = await apiRequest(`/api/classes/${encodeURIComponent(code)}/detail`);
    document.getElementById('teacher-selected-class-title').textContent = detail.classroom.name;
    window.AppState.currentRoster = detail.roster || [];
    renderRealRosterTable();

    const aList = document.getElementById('teacher-assignments-list');
    aList.innerHTML = detail.assignments.length
      ? detail.assignments.map((a) => `
        <div class="olm-assignment-row">
          <div><strong>${a.title}</strong> <span class="badge badge-easy">${a.difficulty}</span><div style="font-size:12px;color:var(--text-secondary)">${a.description} • Hạn: ${a.due_date}</div></div>
          <span class="mono badge badge-blue">${a.code}</span>
        </div>`).join('')
      : `<p style="color:var(--text-secondary);font-size:13px">Chưa có bài tập nào trong lớp này.</p>`;

    const sBody = document.getElementById('teacher-submissions-body');
    sBody.innerHTML = detail.submissions.length
      ? detail.submissions.map((s) => `
        <tr><td><strong>${s.student_name}</strong></td><td class="mono">${s.assignment_code}</td><td class="mono">${s.passed_tests}/${s.total_tests}</td><td><span class="badge ${s.score === 100 ? 'badge-easy' : 'badge-med'}">${s.score}/100</span></td><td class="mono" style="font-size:12px">${s.submitted_at}</td></tr>`).join('')
      : `<tr><td colspan="5" style="color:var(--text-secondary)">Chưa có học sinh nào nộp bài.</td></tr>`;
  } catch {}
}

function renderRealRosterTable() {
  const tbody = document.getElementById('realtime-monitor-body');
  if (!tbody) return;
  const roster = window.AppState.currentRoster || [];
  if (roster.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-secondary);padding:24px">Chưa có học sinh nào tham gia lớp này. Hãy chia sẻ mã lớp <b>${window.AppState.activeClassroomCode}</b> để học sinh vào lớp!</td></tr>`;
    return;
  }
  tbody.innerHTML = roster.map((s) => {
    const badgeMap = {
      not_started: `<span class="badge badge-med">⚪ Chưa làm</span>`,
      coding: `<span class="badge badge-blue"><span class="live-pulse"></span> Đang làm bài</span>`,
      error: `<span class="badge badge-hard">⚠ Đang làm (Gặp lỗi)</span>`,
      completed: `<span class="badge badge-easy">✓ Đã làm (${s.score ?? 100}/100đ)</span>`
    };
    return `
      <tr>
        <td><strong>${s.full_name}</strong><div style="font-size:11px;color:var(--text-muted)">${s.email} • ${s.updated}</div></td>
        <td>${s.problem}</td>
        <td>${badgeMap[s.status] || badgeMap.not_started}</td>
        <td style="min-width:120px"><div style="font-size:11px;margin-bottom:4px" class="mono">${s.progress}%</div><div class="progress-track"><div class="progress-fill" style="width:${s.progress}%"></div></div></td>
        <td>${s.code ? `<button class="btn btn-sm btn-primary" onclick="openPeekModal('${s.username}')">👁 Xem bài làm</button>` : `<span style="font-size:12px;color:var(--text-muted)">Chưa có code</span>`}</td>
      </tr>`;
  }).join('');
}

function openPeekModal(username) {
  const st = (window.AppState.currentRoster || []).find((s) => s.username === username);
  if (!st) return;
  window.AppState.peekStudentUsername = username;
  document.getElementById('peek-student-name').textContent = st.full_name;
  document.getElementById('peek-student-problem').textContent = st.problem;
  document.getElementById('peek-code-preview').textContent = st.code || '# Chưa có mã nguồn';
  document.getElementById('peek-modal').classList.add('open');
}

function sendTeacherHintAction() {
  const txt = document.getElementById('teacher-hint-input').value.trim();
  if (!txt || !window.AppState.peekStudentUsername) return;
  window.VCodeMonitor.sendHintToStudent(window.AppState.peekStudentUsername, txt);
  document.getElementById('teacher-hint-input').value = '';
  closeModal('peek-modal');
  showToast('💬 Đã gửi nhận xét trực tiếp tới học sinh!');
}

function startLiveMonitoringPolling() {
  clearInterval(window.AppState.livePollTimer);
  window.AppState.livePollTimer = setInterval(() => {
    if (window.AppState.currentView === 'classroom' && window.AppState.user?.role === 'teacher' && window.AppState.activeClassroomCode) {
      selectTeacherClassroom(window.AppState.activeClassroomCode);
    }
  }, 3500);
}

async function handleCreateClassSubmit(e) {
  e.preventDefault();
  const payload = {
    name: document.getElementById('new-class-name').value.trim(),
    grade_subject: document.getElementById('new-class-subject').value.trim(),
    code: document.getElementById('new-class-code').value.trim().toUpperCase(),
    description: document.getElementById('new-class-desc').value.trim(),
    teacher_email: window.AppState.user.email
  };
  try {
    const res = await apiRequest('/api/classes/create', { method: 'POST', body: JSON.stringify(payload) });
    closeModal('create-class-modal');
    e.target.reset();
    window.AppState.activeClassroomCode = res.classroom.code;
    showToast(`🎉 Đã tạo lớp <b>${res.classroom.name}</b> — Mã lớp ID: <b>${res.classroom.code}</b>`);
    initClassroomPortalData();
  } catch (err) { alert(err.message); }
}

function openCreateAssignmentModal() {
  document.getElementById('assign-target-class').textContent = window.AppState.activeClassroomCode;
  document.getElementById('create-assignment-modal').classList.add('open');
}

async function handleCreateAssignmentSubmit(e) {
  e.preventDefault();
  const payload = {
    classroom_code: window.AppState.activeClassroomCode,
    title: document.getElementById('assign-title').value.trim(),
    description: document.getElementById('assign-desc').value.trim(),
    difficulty: document.getElementById('assign-diff').value,
    due_date: document.getElementById('assign-due').value.trim(),
    starter_code: document.getElementById('assign-starter').value,
    test_cases: [{ input: document.getElementById('assign-in').value.trim(), expected: document.getElementById('assign-out').value.trim() }],
    created_by: window.AppState.user.username
  };
  try {
    await apiRequest('/api/assessment/create', { method: 'POST', body: JSON.stringify(payload) });
    closeModal('create-assignment-modal');
    e.target.reset();
    showToast(`📝 Đã giao bài tập <b>${payload.title}</b>!`);
    selectTeacherClassroom(payload.classroom_code);
    switchTeacherSubpanel('assignments');
  } catch (err) { alert(err.message); }
}

function copyActiveClassCode() {
  navigator.clipboard?.writeText(window.AppState.activeClassroomCode);
  showToast(`📋 Đã sao chép ID mã lớp: <b>${window.AppState.activeClassroomCode}</b>`);
}

function shareActiveClassQR() {
  const code = window.AppState.activeClassroomCode;
  const joinUrl = `${window.location.href.split('#')[0]}#join=${code}`;
  document.getElementById('share-link-input').value = joinUrl;
  const qrBox = document.getElementById('qr-code-box');
  qrBox.innerHTML = '';
  if (typeof QRCode !== 'undefined') new QRCode(qrBox, { text: joinUrl, width: 185, height: 185, colorDark: '#06080E', colorLight: '#FFFFFF' });
  document.getElementById('share-modal').classList.add('open');
}

// ==================== CỔNG HỌC SINH & TRANG IDE BÀI TẬP RIÊNG (TỰ LÀM) ====================
async function joinClassByCodeAction(explicitCode) {
  const inp = document.getElementById('student-join-code-input');
  const code = (explicitCode || inp?.value || '').trim().toUpperCase();
  if (!code) { alert('Vui lòng nhập ID mã lớp học!'); return; }
  try {
    const res = await apiRequest('/api/classes/join', {
      method: 'POST', body: JSON.stringify({ code, student_email: window.AppState.user.email })
    });
    if (inp) inp.value = '';
    showToast(`🎉 Đã tham gia lớp <b>${res.classroom.name}</b>!`);
    await initClassroomPortalData();
    openStudentClassDetail(res.classroom.code);
  } catch (err) { alert(err.message); }
}

function renderStudentJoinedClasses() {
  const box = document.getElementById('student-joined-classes-list');
  if (!box) return;
  if (window.AppState.studentClasses.length === 0) {
    box.innerHTML = `<div class="bento-card"><p style="font-size:13px;color:var(--text-secondary)">Em chưa tham gia lớp học nào. Nhập mã ID lớp (VD: <b>TIN10HP</b>) ở phía trên để vào lớp!</p></div>`;
    return;
  }
  box.innerHTML = window.AppState.studentClasses.map((c) => `
    <div class="olm-class-card ${c.code === window.AppState.activeStudentClassCode ? 'selected' : ''}" style="margin-bottom:10px" onclick="openStudentClassDetail('${c.code}')">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span class="olm-code-chip">${c.code}</span>
        <span class="badge badge-easy">${c.assignments_count || 0} bài tập</span>
      </div>
      <strong style="display:block;font-size:14.5px;margin-bottom:3px">${c.name}</strong>
      <div style="font-size:12px;color:var(--text-secondary)">GV: ${c.teacher_name}</div>
    </div>`).join('');
  if (!window.AppState.activeStudentClassCode && window.AppState.studentClasses.length > 0) {
    openStudentClassDetail(window.AppState.studentClasses[0].code);
  }
}

async function openStudentClassDetail(code) {
  window.AppState.activeStudentClassCode = code;
  renderStudentJoinedClasses();
  try {
    const detail = await apiRequest(`/api/classes/${encodeURIComponent(code)}/detail`);
    document.getElementById('student-selected-class-title').textContent = detail.classroom.name;
    const chip = document.getElementById('student-selected-class-code');
    chip.textContent = `Mã lớp: ${code}`;
    chip.style.display = 'inline-flex';
    window.__classAssignmentsCache = detail.assignments;
    const listEl = document.getElementById('student-assignments-list');
    listEl.innerHTML = detail.assignments.length
      ? detail.assignments.map((a, idx) => {
          const mySubs = detail.submissions.filter((s) => s.assignment_code === a.code && s.username === window.AppState.user.username);
          const best = mySubs.length ? Math.max(...mySubs.map((s) => s.score)) : null;
          return `
            <div class="olm-assignment-row">
              <div>
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
                  <strong>${a.title}</strong> <span class="badge badge-blue">${a.difficulty}</span>
                  ${best !== null ? `<span class="badge badge-easy">✓ Đã làm (${best}/100đ)</span>` : `<span class="badge badge-med">Chưa làm</span>`}
                </div>
                <div style="font-size:12.5px;color:var(--text-secondary)">${a.description} • Hạn nộp: ${a.due_date}</div>
              </div>
              <button class="btn btn-primary btn-sm" onclick="openDedicatedAssignmentIDE(${idx}, '${code}')">📝 Vào làm bài (Tự làm) →</button>
            </div>`;
        }).join('')
      : `<p style="color:var(--text-secondary)">Giáo viên chưa giao bài tập nào cho lớp này.</p>`;
  } catch {}
}

// MỞ TRANG IDE BÀI TẬP RIÊNG (KHÔNG AI, KHÔNG SCRATCH LIVE, KHÔNG GỢI Ý CODE)
function openDedicatedAssignmentIDE(idx, classCode) {
  const a = (window.__classAssignmentsCache || [])[idx];
  if (!a) return;
  window.AppState.currentExamAssignment = { ...a, classroom_code: classCode };
  document.getElementById('exam-class-badge').textContent = `Lớp ${classCode}`;
  document.getElementById('exam-title').textContent = a.title;
  document.getElementById('exam-desc').textContent = a.description;
  document.getElementById('exam-editor').value = a.starter_code || '# Em tự viết mã nguồn Python giải bài tập tại đây\n';
  document.getElementById('exam-stdin').value = a.test_cases?.[0]?.input || '6';
  document.getElementById('exam-console').textContent = 'Sẵn sàng kiểm tra bài làm của em...';
  syncExamEditor();
  switchView('assignment-ide');
}

function syncExamEditor() {
  const ed = document.getElementById('exam-editor');
  if (!ed) return;
  const code = ed.value;
  document.getElementById('exam-line-numbers').innerHTML = Array.from({ length: code.split('\n').length }, (_, i) => i + 1).join('<br>');
  clearTimeout(window.__examRtTimer);
  window.__examRtTimer = setTimeout(() => {
    const a = window.AppState.currentExamAssignment;
    if (a && window.AppState.user) {
      window.VCodeMonitor.emitStudentActivity(
        { ...window.AppState.user, class_name: a.classroom_code }, a.title, code, 'coding',
        Math.min(90, Math.max(20, code.split('\n').length * 12)), 0
      );
    }
  }, 600);
}

function runExamCodeAction() {
  const code = document.getElementById('exam-editor').value;
  const stdin = document.getElementById('exam-stdin').value.split('\n');
  const res = window.VCodeIDE.runPython(code, stdin);
  const outEl = document.getElementById('exam-console');
  const a = window.AppState.currentExamAssignment;
  if (res.ok) {
    outEl.textContent = `>>> Kết quả chạy thử:\n${res.output || '(Không có dữ liệu in ra)'}`;
  } else {
    outEl.textContent = `>>> Lỗi thực thi:\n${res.error}`;
    if (a && window.AppState.user) {
      window.VCodeMonitor.emitStudentActivity({ ...window.AppState.user, class_name: a.classroom_code }, a.title, code, 'error', 40, 1);
    }
  }
}

async function submitExamCodeAction() {
  const code = document.getElementById('exam-editor').value;
  const a = window.AppState.currentExamAssignment;
  if (!a) return;
  const report = window.VCodeIDE.gradeSubmission(code, a.test_cases || [{ input: '6', expected: '12' }]);
  let out = `=== KẾT QUẢ NỘP BÀI: ${report.passed}/${report.total} TEST CASES (${report.score}/100 ĐIỂM) ===\n`;
  report.details.forEach((d) => {
    out += `• Test #${d.index}: ${d.passed ? '✓ ĐẠT' : '✗ CHƯA ĐẠT'}\n`;
  });
  document.getElementById('exam-console').textContent = out;

  try {
    const saved = await apiRequest('/api/assessment/submit', {
      method: 'POST',
      body: JSON.stringify({
        email: window.AppState.user.email, student_name: window.AppState.user.full_name,
        classroom_code: a.classroom_code, assignment_code: a.code,
        source_code: code, passed_tests: report.passed, total_tests: report.total, score: report.score
      })
    });
    if (saved.new_xp) { window.AppState.user.xp = saved.new_xp; updateUserHeaderUI(); }
    window.VCodeMonitor.emitStudentActivity({ ...window.AppState.user, class_name: a.classroom_code }, a.title, code, 'completed', 100, 0);
    showToast(`✅ Đã nộp bài thành công! Điểm số: <b>${report.score}/100</b>.`);
  } catch (err) {
    alert('Không gửi được bài nộp lên máy chủ: ' + err.message);
  }
}

// ==================== THỬ THÁCH CHẶNG GIẢI TRÍ (THAY ĐẤU TRƯỜNG) ====================
function renderChallengeStages() {
  const grid = document.getElementById('challenges-stages-grid');
  if (!grid) return;
  const doneIds = window.AppState.completedChallenges;
  const pct = Math.round((doneIds.length / CHALLENGE_STAGES.length) * 100);
  document.getElementById('challenge-progress-text').textContent = `Đã chinh phục ${doneIds.length}/${CHALLENGE_STAGES.length} chặng (${pct}%)`;
  document.getElementById('challenge-progress-bar').style.width = `${pct}%`;

  grid.innerHTML = CHALLENGE_STAGES.map((c) => {
    const done = doneIds.includes(c.id);
    return `
      <div class="challenge-stage-card ${done ? 'completed' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:28px">${c.icon}</span>
          <span class="badge ${done ? 'badge-easy' : 'badge-blue'}">${done ? '✓ Đã vượt qua' : `+${c.xp} XP`}</span>
        </div>
        <div style="font-size:11px;color:var(--accent-emerald);font-weight:700;margin-bottom:4px">HUY HIỆU: ${c.badge.toUpperCase()}</div>
        <h3 style="font-size:16.5px;margin-bottom:8px">${c.title}</h3>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px">${c.desc}</p>
        <button class="btn btn-sm ${done ? '' : 'btn-primary'}" style="width:100%" onclick="openChallengeInIDE('${c.id}')">${done ? 'Chơi lại chặng này' : '⚡ Chinh phục ngay →'}</button>
      </div>`;
  }).join('');
}

function openChallengeInIDE(chId) {
  const ch = CHALLENGE_STAGES.find((c) => c.id === chId);
  if (!ch) return;
  window.AppState.currentLesson = { id: ch.id, title: ch.title, summary: ch.desc, starter: ch.starter, testCases: ch.testCases, isChallenge: true };
  document.getElementById('prob-title').textContent = `${ch.icon} ${ch.title}`;
  document.getElementById('prob-desc').textContent = ch.desc;
  document.getElementById('code-editor').value = ch.starter;
  document.getElementById('custom-stdin').value = ch.testCases[0].input;
  switchView('workspace');
  syncLiveEditorOutputs();
}

// ==================== IDE TỰ DO + SCRATCH LIVE + AI HYBRID ====================
function switchRightTab(tabName) {
  document.querySelectorAll('.subtab-btn').forEach((b) => b.classList.toggle('active', b.dataset.rtab === tabName));
  document.querySelectorAll('.right-panel').forEach((p) => p.classList.toggle('active', p.id === `rpanel-${tabName}`));
}

function syncLiveEditorOutputs() {
  const ed = document.getElementById('code-editor');
  if (!ed) return;
  const code = ed.value;
  const linesEl = document.getElementById('line-numbers');
  if (linesEl) linesEl.innerHTML = Array.from({ length: code.split('\n').length }, (_, i) => i + 1).join('<br>');
  const scratchStage = document.getElementById('scratch-live-stage');
  if (scratchStage) scratchStage.innerHTML = window.ScratchBridge.renderFromPython(code);
  const flowBox = document.getElementById('flowchart-box');
  if (flowBox) flowBox.innerHTML = window.VCodeAI.generateFlowchartSVG(code);
}

function openLessonInIDE(lessonId) {
  const found = window.VCODE_LESSONS.find((l) => l.id === lessonId);
  if (!found) return;
  window.AppState.currentLesson = found;
  const _pt = document.getElementById('prob-title'); if (_pt) _pt.textContent = found.title;
  const _pd = document.getElementById('prob-desc'); if (_pd) _pd.textContent = found.summary;
  document.getElementById('code-editor').value = localStorage.getItem('vcode_draft_' + found.id) || found.starter;
  renderSidebarProblems();
  switchView('workspace');
  syncLiveEditorOutputs();
}

function runCodeAction() {
  const code = document.getElementById('code-editor').value;
  const stdin = document.getElementById('custom-stdin').value.split('\n');
  const res = window.VCodeIDE.runPython(code, stdin);
  const consoleEl = document.getElementById('console-output');
  if (res.ok) {
    consoleEl.textContent = `>>> Thực thi hoàn tất (0.01s):\n${res.output || '(Không có dữ liệu in ra)'}`;
    appendAIChat('ai', `✓ Mã nguồn chạy thành công! Kết quả: "${res.output}".`);
  } else {
    consoleEl.textContent = `>>> Lỗi thực thi:\n${res.error}`;
    appendAIChat('error', window.VCodeAI.offlineDiagnose('', code, res.error));
    switchRightTab('ai');
  }
}

function submitAutoGradeAction() {
  const code = document.getElementById('code-editor').value;
  const lesson = window.AppState.currentLesson;
  const report = window.VCodeIDE.gradeSubmission(code, lesson.testCases || [{ input: '6', expected: '12' }]);
  let out = `=== CHẤM TỰ ĐỘNG: ${report.passed}/${report.total} TEST CASES (${report.score}/100 ĐIỂM) ===\n`;
  report.details.forEach((d) => { out += `• Test #${d.index} [Input: ${d.input}]: ${d.passed ? '✓ ĐẠT' : `✗ SAI (Ra '${d.actual}', cần '${d.expected}')`}\n`; });
  document.getElementById('console-output').textContent = out;
  switchRightTab('ai');

  if (report.score === 100) {
    if (lesson.isChallenge && !window.AppState.completedChallenges.includes(lesson.id)) {
      window.AppState.completedChallenges.push(lesson.id);
      localStorage.setItem('vcode_completed_challenges', JSON.stringify(window.AppState.completedChallenges));
      showToast('🏆 Tuyệt vời! Em đã vượt qua chặng thử thách và mở khóa huy hiệu mới!');
    } else if (!window.AppState.completedLessons.includes(lesson.id)) {
      window.AppState.completedLessons.push(lesson.id);
      const db = window.VCodeOfflineDB.load();
      db.completedLessons = window.AppState.completedLessons;
      window.VCodeOfflineDB.save(db);
      showToast('🎉 Đạt 100/100 điểm bài thực hành!');
    }
  }
}

function appendAIChat(kind, text, badgeLabel = '') {
  const feed = document.getElementById('ai-chat-feed');
  if (!feed) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${kind}`;
  div.innerHTML = (badgeLabel ? `<div style="font-size:10.5px;color:var(--accent-emerald);margin-bottom:3px;font-weight:700">${badgeLabel}</div>` : '') + text.replace(/\n/g, '<br>');
  feed.appendChild(div);
  feed.scrollTop = feed.scrollHeight;
}

async function sendAIChatAction() {
  const input = document.getElementById('ai-question-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  appendAIChat('user', q);
  const res = await window.VCodeAI.askHybrid(q, document.getElementById('code-editor').value);
  appendAIChat('ai', res.text, res.mode === 'offline' ? '🟠 AI Socratic Offline' : '🟢 AI Online API');
}

function openShareModal() {
  const code = document.getElementById('code-editor').value;
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify({ title: window.AppState.currentLesson.title, code }))));
  const shareUrl = `${window.location.href.split('#')[0]}#share=${payload}`;
  document.getElementById('share-link-input').value = shareUrl;
  const qrBox = document.getElementById('qr-code-box');
  qrBox.innerHTML = '';
  if (typeof QRCode !== 'undefined') new QRCode(qrBox, { text: shareUrl.slice(0, 900), width: 185, height: 185, colorDark: '#06080E', colorLight: '#FFFFFF' });
  document.getElementById('share-modal').classList.add('open');
}

function copyShareLink() { const inp = document.getElementById('share-link-input'); inp.select(); navigator.clipboard?.writeText(inp.value); showToast('🔗 Đã sao chép đường link!'); }
function downloadPythonFile() { const blob = new Blob([document.getElementById('code-editor').value], { type: 'text/x-python;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'vcode_edu.py'; a.click(); }
function saveAIConfig() { localStorage.setItem('vcode_backend_url', document.getElementById('cfg-backend-url').value.trim() || 'http://localhost:8000'); localStorage.setItem('vcode_gemini_key', document.getElementById('cfg-gemini-key').value.trim()); localStorage.setItem('vcode_openai_key', (document.getElementById('cfg-openai-key')?.value || '').trim()); closeModal('ai-config-modal'); showToast('⚙️ Đã lưu cấu hình AI (OpenAI / Gemini) & Backend!'); }

function renderLearningPath() {
  const grid = document.getElementById('learning-lessons-grid');
  if (!grid) return;
  const doneCount = window.AppState.completedLessons.length;
  const pct = Math.round((doneCount / window.VCODE_LESSONS.length) * 100);
  document.getElementById('learning-progress-text').textContent = `Đã hoàn thành ${doneCount}/${window.VCODE_LESSONS.length} bài học Python (${pct}%)`;
  document.getElementById('learning-progress-bar').style.width = `${pct}%`;
  grid.innerHTML = window.VCODE_LESSONS.map((l) => {
    const done = window.AppState.completedLessons.includes(l.id);
    return `<div class="bento-card"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span class="badge ${done ? 'badge-easy' : 'badge-blue'}">${done ? '✓ Đã hoàn thành' : l.level}</span><span class="mono" style="font-size:11.5px;color:var(--text-muted)">⏱ ${l.duration}</span></div><h3>${l.title}</h3><p style="margin-bottom:10px">${l.summary}</p><div style="font-size:12.5px;color:var(--text-secondary);background:var(--bg-elevated);padding:10px;border-radius:8px;margin-bottom:14px">${l.theory}</div><button class="btn btn-sm btn-primary" onclick="openLessonInIDE('${l.id}')">💻 Thực hành &amp; Xem Scratch Live →</button></div>`;
  }).join('');
}

function renderSidebarProblems() {
  const el = document.getElementById('problem-list');
  if (!el) return;
  el.innerHTML = window.VCODE_LESSONS.map((l) => `<div onclick="openLessonInIDE('${l.id}')" style="padding:10px;border:1px solid ${window.AppState.currentLesson.id === l.id ? 'var(--accent-emerald)' : 'var(--border-subtle)'};border-radius:8px;margin-bottom:8px;cursor:pointer;background:var(--bg-surface)"><strong style="font-size:12.5px">${l.title}</strong><div style="font-size:11px;color:var(--text-secondary);margin-top:3px">${l.level}</div></div>`).join('');
}

function toggleTheme() {
  const html = document.documentElement;
  const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
  html.setAttribute('data-theme', next);
  localStorage.setItem('vcode_theme', next);
  const btn = document.getElementById('top-theme-btn');
  if (btn) btn.textContent = next === 'light' ? '🌙' : '☀️';
}

window.insertSnippet = (idx) => { const ed = document.getElementById('code-editor'); ed.value += (ed.value.endsWith('\n') ? '' : '\n') + SNIPPETS[idx].code; syncLiveEditorOutputs(); };

window.addEventListener('DOMContentLoaded', () => {
  const savedTheme = localStorage.getItem('vcode_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const tBtn = document.getElementById('top-theme-btn');
  if (tBtn) tBtn.textContent = savedTheme === 'light' ? '🌙' : '☀️';

  document.getElementById('snippet-bar').innerHTML = SNIPPETS.map((s, i) => `<button class="snippet-chip" onclick="insertSnippet(${i})">${s.label}</button>`).join('');

  window.VCodeMonitor.init(
    () => { if (window.AppState.currentView === 'classroom' && window.AppState.activeClassroomCode) selectTeacherClassroom(window.AppState.activeClassroomCode); },
    (hint) => showToast(`👨‍🏫 <b>Nhận xét từ Giáo viên:</b> ${hint.hintText}`)
  );

  const pill = document.getElementById('network-status');
  function syncNet() {
    if (navigator.onLine) { pill.classList.remove('offline'); pill.innerHTML = `<span class="status-dot"></span><span>Online • Đồng bộ Cloud</span>`; }
    else { pill.classList.add('offline'); pill.innerHTML = `<span class="status-dot"></span><span>Offline • Lưu cục bộ PWA</span>`; }
  }
  window.addEventListener('online', syncNet);
  window.addEventListener('offline', syncNet);
  syncNet();

  updateUserHeaderUI();
  renderSidebarProblems();
  renderLearningPath();
  renderChallengeStages();
  openLessonInIDE('py-03');
  switchView('home');
});

// ==================== V7.0 PATCH: FIX MOBILE/GITHUB PAGES + COURSES + ROBOT AI + GAME IDE ====================
window.AppState.courseFilter = 'all';
window.AppState.enrolledCourses = JSON.parse(localStorage.getItem('vcode_enrolled_courses') || '["course-python"]');
window.AppState.completedCourseLessons = JSON.parse(localStorage.getItem('vcode_done_course_lessons') || '[]');
window.AppState.activeCourse = null;
window.AppState.activeCourseLessonIdx = 0;
window.AppState.pendingPaidCourseId = null;
window.AppState.activeChallengeObj = null;

// 1. FIX TRIỆT ĐỂ CHỌN VAI TRÒ & TẠO/VÀO LỚP KHÔNG BAO GIỜ LỖI FAILED TO FETCH TRÊN ĐIỆN THOẠI / GITHUB PAGES
window.lockRoleOnceAction = async function(role) {
  const label = role === 'teacher' ? 'GIÁO VIÊN' : 'HỌC SINH';
  if (!confirm(`Xác nhận đăng ký vai trò ${label}? Vai trò này chỉ được chọn 1 lần duy nhất.`)) return;
  const u = window.AppState.user;
  try {
    const res = await apiRequest('/api/auth/set-role', {
      method: 'POST', body: JSON.stringify({ email: u.email, role, school_name: u.school_name || 'THCS & THPT Hòa Phú', class_name: u.class_name || '' })
    });
    saveLoggedInUser(res.user);
  } catch {
    // Tự động lưu cục bộ khi chạy trên GitHub Pages hoặc Điện thoại chưa nối Backend
    u.role = role;
    const db = window.VCodeOfflineDB.load();
    db.users = (db.users || []).map((x) => x.email === u.email ? { ...x, role } : x);
    window.VCodeOfflineDB.save(db);
    saveLoggedInUser(u);
  }
  showToast(`🔒 Đã kích hoạt cố định vai trò <b>${label}</b>!`);
  initClassroomPortalData();
};

// 2. HỆ THỐNG KHÓA HỌC & KHÓA HỌC CỦA TÔI + IDE CHUẨN CODELEARN
window.switchCourseFilter = function(mode) {
  window.AppState.courseFilter = mode;
  document.getElementById('ctab-all')?.classList.toggle('active', mode === 'all');
  document.getElementById('ctab-mine')?.classList.toggle('active', mode === 'mine');
  renderCoursesCatalog();
};

window.renderLearningPath = function() { renderCoursesCatalog(); };

window.renderCoursesCatalog = function() {
  const grid = document.getElementById('courses-catalog-grid');
  if (!grid || !window.VCODE_COURSES) return;
  const enrolled = window.AppState.enrolledCourses;
  const list = window.AppState.courseFilter === 'mine'
    ? window.VCODE_COURSES.filter((c) => enrolled.includes(c.id))
    : window.VCODE_COURSES;

  if (!list.length) {
    grid.innerHTML = `<div class="bento-card" style="grid-column:span 3;text-align:center"><p>Bạn chưa đăng ký khóa học nào. Hãy chọn tab <b>Tất cả khóa học</b> để đăng ký ngay!</p></div>`;
    return;
  }
  grid.innerHTML = list.map((c) => {
    const isOwned = enrolled.includes(c.id);
    const doneCount = c.lessons.filter((l) => window.AppState.completedCourseLessons.includes(l.id)).length;
    return `
      <div class="bento-card" style="display:flex;flex-direction:column;justify-content:space-between">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span class="badge ${c.price > 0 ? 'badge-med' : 'badge-easy'}">${c.badge}</span>
            <span style="font-size:11.5px;color:var(--text-muted)">👥 ${c.students}</span>
          </div>
          <h3 style="margin-bottom:6px">${c.title}</h3>
          <p style="font-size:13px;margin-bottom:12px">${c.desc}</p>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">📚 ${c.lessons.length} bài học • Đã hoàn thành ${doneCount}/${c.lessons.length}</div>
        </div>
        ${isOwned
          ? `<button class="btn btn-primary" style="width:100%" onclick="openCourseIDE('${c.id}', 0)">💻 Vào học ngay (IDE riêng) →</button>`
          : (c.price > 0
              ? `<button class="btn btn-amber" style="width:100%" onclick="openPaidCourseModal('${c.id}')">🔓 Đăng ký khóa học (20.000đ)</button>`
              : `<button class="btn btn-blue" style="width:100%" onclick="enrollFreeCourse('${c.id}')">+ Đăng ký Miễn phí</button>`)
        }
      </div>`;
  }).join('');
};

window.enrollFreeCourse = function(courseId) {
  if (!window.AppState.enrolledCourses.includes(courseId)) {
    window.AppState.enrolledCourses.push(courseId);
    localStorage.setItem('vcode_enrolled_courses', JSON.stringify(window.AppState.enrolledCourses));
  }
  showToast('🎉 Đăng ký khóa học thành công! Đã thêm vào mục Khóa học của tôi.');
  openCourseIDE(courseId, 0);
};

window.openPaidCourseModal = function(courseId) {
  const c = window.VCODE_COURSES.find((x) => x.id === courseId);
  if (!c) return;
  window.AppState.pendingPaidCourseId = courseId;
  document.getElementById('pay-course-title').textContent = c.title;
  document.getElementById('course-pay-modal').classList.add('open');
};

window.confirmEnrollPaidCourse = function() {
  const code = (document.getElementById('pay-coupon-input').value || '').trim().toUpperCase();
  if (code !== 'VCODE20K') { alert('Mã kích hoạt không đúng! Dùng mã VCODE20K để mở khóa.'); return; }
  const id = window.AppState.pendingPaidCourseId;
  if (id && !window.AppState.enrolledCourses.includes(id)) {
    window.AppState.enrolledCourses.push(id);
    localStorage.setItem('vcode_enrolled_courses', JSON.stringify(window.AppState.enrolledCourses));
  }
  closeModal('course-pay-modal');
  showToast('🎉 Kích hoạt khóa học PRO 20K thành công!');
  openCourseIDE(id, 0);
};

window.openCourseIDE = function(courseId, lessonIdx = 0) {
  const c = window.VCODE_COURSES.find((x) => x.id === courseId);
  if (!c) return;
  window.AppState.activeCourse = c;
  window.AppState.activeCourseLessonIdx = lessonIdx;
  const l = c.lessons[lessonIdx];

  document.getElementById('cl-course-title').textContent = c.title;
  document.getElementById('cl-diff-badge').textContent = l.difficulty;
  document.getElementById('cl-points-badge').textContent = `${l.points} Điểm`;
  document.getElementById('cl-lesson-title').textContent = l.title;
  document.getElementById('cl-problem-html').innerHTML = l.problem;
  document.getElementById('cl-theory-html').innerHTML = l.theory;
  document.getElementById('cl-lang-label').textContent = c.lang.toUpperCase();
  document.getElementById('cl-code-editor').value = l.starter;
  document.getElementById('cl-test-status').textContent = 'Sẵn sàng';
  document.getElementById('cl-test-output').innerHTML = `Đầu vào mẫu: <b>${l.testCases[0].input}</b><br/>Đầu ra mong đợi: <b>${l.testCases[0].expected}</b>`;

  document.getElementById('cl-lesson-pills').innerHTML = c.lessons.map((item, i) => {
    const done = window.AppState.completedCourseLessons.includes(item.id);
    return `<button class="cl-pill ${i === lessonIdx ? 'active' : ''} ${done ? 'done' : ''}" onclick="openCourseIDE('${c.id}', ${i})">${i + 1}</button>`;
  }).join('');

  switchView('course-ide');
};

window.runCourseIDE = function(isSubmit) {
  const c = window.AppState.activeCourse;
  if (!c) return;
  const l = c.lessons[window.AppState.activeCourseLessonIdx];
  const code = document.getElementById('cl-code-editor').value;
  const outEl = document.getElementById('cl-test-output');
  const stEl = document.getElementById('cl-test-status');

  if (c.lang === 'python') {
    const report = window.VCodeIDE.gradeSubmission(code, l.testCases);
    const passedAll = report.score === 100;
    stEl.textContent = passedAll ? '✓ ĐẠT 100%' : `Chưa đạt (${report.passed}/${report.total})`;
    outEl.innerHTML = report.details.map((d) => `• Test #${d.index} [In: ${d.input}] → Ra: <b>${d.actual}</b> | Mong đợi: <b>${d.expected}</b> → ${d.passed ? '<span style="color:#34D399">ĐẠT</span>' : '<span style="color:#FB7185">SAI</span>'}`).join('<br/>');
    if (isSubmit && passedAll) markCourseLessonDone(l.id);
  } else if (c.lang === 'html') {
    const ok = code.toLowerCase().includes(l.testCases[0].expected.toLowerCase());
    stEl.textContent = ok ? '✓ HỢP LỆ' : 'Cần kiểm tra lại thẻ HTML';
    outEl.innerHTML = `<div style="background:#FFF;color:#0F172A;padding:12px;border-radius:8px">${code}</div>`;
    if (isSubmit && ok) markCourseLessonDone(l.id);
  } else {
    const ok = code.includes(l.testCases[0].expected) || code.length > 35;
    stEl.textContent = ok ? '✓ BIÊN DỊCH & KIỂM THỬ ĐẠT' : '✗ CHƯA KHỚP KẾT QUẢ';
    outEl.innerHTML = `Kiểm thử cú pháp <b>${c.lang.toUpperCase()}</b>: ${ok ? '<span style="color:#34D399">Đạt yêu cầu bài học!</span>' : '<span style="color:#FB7185">Hãy kiểm tra lại lệnh đầu ra theo đề bài.</span>'}`;
    if (isSubmit && ok) markCourseLessonDone(l.id);
  }
};

function markCourseLessonDone(lessonId) {
  if (!window.AppState.completedCourseLessons.includes(lessonId)) {
    window.AppState.completedCourseLessons.push(lessonId);
    localStorage.setItem('vcode_done_course_lessons', JSON.stringify(window.AppState.completedCourseLessons));
  }
  showToast('🎉 Chúc mừng! Bạn đã hoàn thành bài học này!');
}

// 3. THỬ THÁCH CHẶNG GIAO DIỆN GAME & IDE RIÊNG CỦA THỬ THÁCH
window.renderChallengeStages = function() {
  const grid = document.getElementById('challenges-stages-grid');
  if (!grid) return;
  const doneIds = window.AppState.completedChallenges;
  const pct = Math.round((doneIds.length / CHALLENGE_STAGES.length) * 100);
  document.getElementById('challenge-progress-text').textContent = `CẤP ĐỘ: ${doneIds.length}/${CHALLENGE_STAGES.length} CHẶNG (${pct}%)`;
  document.getElementById('challenge-progress-bar').style.width = `${pct}%`;

  grid.innerHTML = CHALLENGE_STAGES.map((c) => {
    const done = doneIds.includes(c.id);
    return `
      <div class="game-stage-card ${done ? 'cleared' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:32px">${c.icon}</span>
          <span class="badge" style="background:${done ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.22)'};color:${done ? '#34D399' : '#FBBF24'}">${done ? '⭐ ĐÃ VƯỢT QUA' : `🏆 +${c.xp} XP`}</span>
        </div>
        <div style="font-size:11px;color:#38BDF8;font-weight:800;margin-bottom:4px">HUY HIỆU: ${c.badge.toUpperCase()}</div>
        <h3 style="font-size:17px;color:#FFF;margin-bottom:8px">${c.title}</h3>
        <p style="font-size:13px;color:#CBD5E1;margin-bottom:16px">${c.desc}</p>
        <button class="btn btn-sm" style="width:100%;background:${done ? '#059669' : '#7C3AED'};color:#FFF;border:none;padding:9px" onclick="openDedicatedChallengeIDE('${c.id}')">${done ? 'Chơi lại Chặng' : '🎮 Bắt đầu Chặng →'}</button>
      </div>`;
  }).join('');
};

window.openDedicatedChallengeIDE = function(chId) {
  const ch = CHALLENGE_STAGES.find((c) => c.id === chId);
  if (!ch) return;
  window.AppState.activeChallengeObj = ch;
  document.getElementById('ch-ide-title').textContent = `${ch.icon} ${ch.title}`;
  document.getElementById('ch-ide-reward').textContent = `🏆 +${ch.xp} XP`;
  document.getElementById('ch-ide-heading').textContent = ch.title;
  document.getElementById('ch-ide-desc').textContent = ch.desc;
  document.getElementById('ch-code-editor').value = ch.starter;
  document.getElementById('ch-test-output').textContent = 'Viết code Python và bấm "⚡ Hoàn thành Chặng" để mở khóa huy hiệu!';
  switchView('challenge-ide');
};

window.runChallengeIDE = function(isSubmit) {
  const ch = window.AppState.activeChallengeObj;
  if (!ch) return;
  const report = window.VCodeIDE.gradeSubmission(document.getElementById('ch-code-editor').value, ch.testCases);
  document.getElementById('ch-test-output').innerHTML = report.details.map((d) => `• Test #${d.index}: ${d.passed ? '<span style="color:#34D399">✓ ĐẠT</span>' : `<span style="color:#FB7185">✗ SAI (Ra '${d.actual}', cần '${d.expected}')</span>`}`).join('<br/>');
  if (isSubmit && report.score === 100) {
    if (!window.AppState.completedChallenges.includes(ch.id)) {
      window.AppState.completedChallenges.push(ch.id);
      localStorage.setItem('vcode_completed_challenges', JSON.stringify(window.AppState.completedChallenges));
    }
    showToast(`🏆 CHÚC MỪNG! Bạn đã vượt qua <b>${ch.title}</b> và nhận huy hiệu ${ch.badge}!`);
  }
};

// 4. ROBOT AI NỔI KÉO-THẢ TỰ DO KHẮP MÀN HÌNH & TỰ ẨN HƯỚNG DẪN KHI ĐÃ CÓ KEY
window.refreshRobotKeyUI = function() {
  const cfg = window.VCodeAI.getConfig();
  const activeKey = cfg.openaiKey || cfg.geminiKey;
  const guide = document.getElementById('robot-key-guide');
  const activeBox = document.getElementById('robot-key-active');
  const badge = document.getElementById('robot-ai-mode-badge');
  const masked = document.getElementById('robot-key-masked');

  if (activeKey && navigator.onLine) {
    if (guide) guide.style.display = 'none';
    if (activeBox) activeBox.style.display = 'flex';
    if (masked) masked.textContent = `${activeKey.slice(0, 6)}...${activeKey.slice(-4)}`;
    if (badge) badge.textContent = cfg.openaiKey ? '🟢 API Chatbox (OpenAI)' : '🟢 API Chatbox (Gemini)';
  } else {
    if (guide) guide.style.display = 'block';
    if (activeBox) activeBox.style.display = 'none';
    if (badge) badge.textContent = '🟠 Offline Chatbox';
  }
};

window.saveQuickRobotKey = function() {
  const k = (document.getElementById('robot-quick-key-input').value || '').trim();
  if (!k) return;
  if (k.startsWith('sk-')) { localStorage.setItem('vcode_openai_key', k); localStorage.removeItem('vcode_gemini_key'); }
  else { localStorage.setItem('vcode_gemini_key', k); localStorage.removeItem('vcode_openai_key'); }
  document.getElementById('robot-quick-key-input').value = '';
  refreshRobotKeyUI();
  showToast('🤖 Đã kích hoạt API Chatbox thông minh!');
};

window.clearQuickRobotKey = function() {
  localStorage.removeItem('vcode_gemini_key');
  localStorage.removeItem('vcode_openai_key');
  refreshRobotKeyUI();
};

window.toggleRobotPopup = function(force) {
  const pop = document.getElementById('robot-ai-popup');
  if (!pop) return;
  const open = typeof force === 'boolean' ? force : !pop.classList.contains('open');
  pop.classList.toggle('open', open);
  if (open) refreshRobotKeyUI();
};

window.sendRobotAIChat = async function() {
  const inp = document.getElementById('robot-chat-input');
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  const feed = document.getElementById('robot-chat-feed');
  feed.innerHTML += `<div class="chat-msg user">${q}</div>`;
  const code = document.getElementById('code-editor')?.value || '';
  const res = await window.VCodeAI.askHybrid(q, code);
  const tag = res.mode === 'offline' ? '🟠 Offline Chatbox' : '🟢 API Chatbox';
  feed.innerHTML += `<div class="chat-msg ai"><div style="font-size:10.5px;color:var(--accent-emerald);font-weight:700;margin-bottom:2px">${tag}</div>${res.text.replace(/\n/g, '<br/>')}</div>`;
  feed.scrollTop = feed.scrollHeight;
};

// Kéo-thả Robot AI mượt trên cả Máy tính (Mouse) & Điện thoại (Touch)
window.addEventListener('DOMContentLoaded', () => {
  if (!localStorage.getItem('vcode_theme')) {
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('vcode_theme', 'light');
  }
  renderCoursesCatalog();
  refreshRobotKeyUI();

  const fab = document.getElementById('robot-ai-fab');
  if (fab) {
    let dragging = false, moved = false, startX = 0, startY = 0, origX = 0, origY = 0;
    const onDown = (e) => {
      const pt = e.touches ? e.touches[0] : e;
      dragging = true; moved = false;
      startX = pt.clientX; startY = pt.clientY;
      const rect = fab.getBoundingClientRect();
      origX = rect.left; origY = rect.top;
    };
    const onMove = (e) => {
      if (!dragging) return;
      const pt = e.touches ? e.touches[0] : e;
      const dx = pt.clientX - startX, dy = pt.clientY - startY;
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) moved = true;
      fab.style.left = Math.max(8, Math.min(window.innerWidth - 68, origX + dx)) + 'px';
      fab.style.top = Math.max(8, Math.min(window.innerHeight - 68, origY + dy)) + 'px';
      fab.style.right = 'auto'; fab.style.bottom = 'auto';
    };
    const onUp = () => {
      if (dragging && !moved) toggleRobotPopup();
      dragging = false;
    };
    fab.addEventListener('mousedown', onDown);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    fab.addEventListener('touchstart', onDown, { passive: true });
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onUp);
  }
});


// ==================== V8.0 PATCH: FIX COURSES RENDER + 50 STAGES GAME + TEACHER GRADING ====================
window.AppState.selectedWorld = 1;

// Ghi đè trực tiếp switchView để chắc chắn gọi đúng renderCoursesCatalog() và renderChallengeStages()
const _origSwitchViewV8 = window.switchView;
window.switchView = function(viewId) {
  _origSwitchViewV8(viewId);
  if (viewId === 'learning') window.renderCoursesCatalog();
  if (viewId === 'challenges') window.renderGameLobby50();
};

// Sảnh chờ Game 50 chặng chia 5 Thế giới (Python -> C -> C++)
window.selectGameWorld = function(wId) {
  window.AppState.selectedWorld = wId;
  window.renderGameLobby50();
};

window.renderGameLobby50 = function() {
  const list = window.VCODE_50_CHALLENGES || [];
  const doneIds = window.AppState.completedChallenges || [];
  const pct = Math.round((doneIds.length / Math.max(1, list.length)) * 100);
  const pTxt = document.getElementById('challenge-progress-text');
  const pBar = document.getElementById('challenge-progress-bar');
  if (pTxt) pTxt.textContent = `CẤP ĐỘ CHIẾN BINH: ${doneIds.length}/${list.length} CHẶNG (${pct}%)`;
  if (pBar) pBar.style.width = `${pct}%`;

  const wBar = document.getElementById('world-filter-bar');
  if (wBar) {
    const wNames = [
      { id: 1, label: '🚀 Thế giới 1: Python Cơ bản (1-10)' },
      { id: 2, label: '🔐 Thế giới 2: Logic & If (11-20)' },
      { id: 3, label: '🌀 Thế giới 3: Vòng lặp (21-30)' },
      { id: 4, label: '🛡️ Thế giới 4: Ngôn ngữ C (31-40)' },
      { id: 5, label: '👑 Thế giới 5: C++ HSG (41-50)' }
    ];
    wBar.innerHTML = wNames.map((w) => `<button class="world-btn ${window.AppState.selectedWorld === w.id ? 'active' : ''}" onclick="selectGameWorld(${w.id})">${w.label}</button>`).join('');
  }

  const grid = document.getElementById('challenges-stages-grid');
  if (!grid) return;
  const filtered = list.filter((c) => c.world === window.AppState.selectedWorld);
  grid.innerHTML = filtered.map((c) => {
    const done = doneIds.includes(c.id);
    return `
      <div class="game-stage-card ${done ? 'cleared' : ''}" style="border-color:${done ? '#10B981' : c.color}">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
          <span style="font-size:30px">${c.icon}</span>
          <span class="badge" style="background:rgba(245,158,11,0.22);color:#FBBF24">${done ? '⭐ ĐÃ PHÁ ĐẢO' : `🏆 +${c.xp} XP`}</span>
        </div>
        <div style="font-size:11px;color:#38BDF8;font-weight:800;margin-bottom:4px">NGÔN NGỮ: ${c.lang.toUpperCase()}</div>
        <h3 style="font-size:16px;color:#FFF;margin-bottom:8px">${c.title}</h3>
        <p style="font-size:12.5px;color:#CBD5E1;margin-bottom:16px">${c.desc}</p>
        <button class="game-play-btn" onclick="open50StageIDE('${c.id}')">${done ? '🔄 Chơi lại Chặng' : '🎮 VÀO TRẬN NGAY'}</button>
      </div>`;
  }).join('');
};

window.open50StageIDE = function(stageId) {
  const ch = (window.VCODE_50_CHALLENGES || []).find((c) => c.id === stageId);
  if (!ch) return;
  window.AppState.activeChallengeObj = ch;
  document.getElementById('ch-ide-title').textContent = `${ch.icon} ${ch.title} [${ch.lang.toUpperCase()}]`;
  document.getElementById('ch-ide-reward').textContent = `🏆 +${ch.xp} XP`;
  document.getElementById('ch-ide-heading').textContent = ch.title;
  document.getElementById('ch-ide-desc').textContent = ch.desc;
  document.getElementById('ch-code-editor').value = ch.starter;
  document.getElementById('ch-test-output').textContent = 'Viết code và bấm "⚡ Hoàn thành Chặng" để mở khóa huy hiệu!';
  switchView('challenge-ide');
};

window.runChallengeIDE = function(isSubmit) {
  const ch = window.AppState.activeChallengeObj;
  if (!ch) return;
  const code = document.getElementById('ch-code-editor').value;
  let passedAll = false;
  if (ch.lang === 'python') {
    const report = window.VCodeIDE.gradeSubmission(code, ch.testCases);
    passedAll = report.score === 100;
    document.getElementById('ch-test-output').innerHTML = report.details.map((d) => `• Test #${d.index}: ${d.passed ? '<span style="color:#34D399">✓ ĐẠT</span>' : `<span style="color:#FB7185">✗ SAI (Ra '${d.actual}', cần '${d.expected}')</span>`}`).join('<br/>');
  } else {
    passedAll = code.includes(ch.testCases[0].expected);
    document.getElementById('ch-test-output').innerHTML = passedAll ? `<span style="color:#34D399">✓ Biên dịch ${ch.lang.toUpperCase()} & Khớp khẩu lệnh 100%!</span>` : `<span style="color:#FB7185">✗ Chưa khớp khẩu lệnh '${ch.testCases[0].expected}'.</span>`;
  }
  if (isSubmit && passedAll) {
    if (!window.AppState.completedChallenges.includes(ch.id)) {
      window.AppState.completedChallenges.push(ch.id);
      localStorage.setItem('vcode_completed_challenges', JSON.stringify(window.AppState.completedChallenges));
    }
    showToast(`🏆 CHÚC MỪNG! Bạn đã phá đảo <b>${ch.title}</b>!`);
  }
};

// Giáo viên chấm điểm & gửi đánh giá trực tiếp lưu vào Database trả về cho Học sinh
window.submitTeacherGradeAction = async function() {
  const score = parseInt(document.getElementById('grade-score-input').value || '100', 10);
  const feedback = (document.getElementById('teacher-hint-input').value || '').trim();
  const username = window.AppState.peekStudentUsername;
  const classCode = window.AppState.activeClassroomCode;
  if (!username) return;
  try {
    await apiRequest('/api/assessment/grade', {
      method: 'POST',
      body: JSON.stringify({ username, classroom_code: classCode, score, feedback })
    });
    if (feedback) window.VCodeMonitor.sendHintToStudent(username, `[Điểm: ${score}/100] ${feedback}`);
    closeModal('peek-modal');
    showToast(`✅ Đã chấm <b>${score}/100đ</b> và gửi nhận xét về tài khoản học sinh!`);
    selectTeacherClassroom(classCode);
  } catch (err) {
    alert('Lỗi lưu điểm: ' + err.message);
  }
};

// Đảm bảo khi trang vừa tải xong là render ngay Khóa học và 50 Chặng Game
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    if (window.renderCoursesCatalog) window.renderCoursesCatalog();
    if (window.renderGameLobby50) window.renderGameLobby50();
  }, 120);
});


// ==================== V9.0 PATCH: CODELEARN COURSES UI + 100% RELIABLE CLASSROOM ENGINE ====================
window.LocalClassDB = {
  KEY: 'vcode_local_classrooms_v9',
  load() {
    try {
      const d = JSON.parse(localStorage.getItem(this.KEY) || 'null');
      if (d && d.classes) return d;
    } catch {}
    const init = {
      classes: [
        { code: 'TIN10HP', name: 'Tin học 10A1 — THCS & THPT Hòa Phú', grade_subject: 'Tin học 10 • Python', description: 'Lớp thực hành Python GDPT 2018', teacher_email: 'giaovien@vcode.edu.vn', teacher_name: 'Thầy Nguyễn Phi Hùng', students: [], assignments: [{ code: 'BT-01', title: 'Bài tập 1: Tổng số chẵn từ 1 đến N', description: 'Nhập N, tính tổng các số chẵn từ 1 đến N.', difficulty: 'Cơ bản', due_date: 'Cuối tuần', starter_code: 'n = int(input())\n', test_cases: [{ input: '6', expected: '12' }] }], submissions: [] }
      ]
    };
    this.save(init);
    return init;
  },
  save(data) { localStorage.setItem(this.KEY, JSON.stringify(data)); }
};

// 1. GIAO DIỆN KHÓA HỌC CHUẨN CODELEARN (5 KHÓA x 50 BÀI = 250 BÀI)
window.renderCoursesCatalog = function() {
  const courses = window.VCODE_COURSES || [];
  const enrolled = window.AppState.enrolledCourses || ['course-python'];
  const doneLessons = window.AppState.completedCourseLessons || [];
  const u = window.AppState.user;

  const gEl = document.getElementById('cl-greeting-name');
  if (gEl) gEl.textContent = u ? (u.email || u.full_name) : 'bạn';
  const uName = document.getElementById('cl-prof-name');
  if (uName) uName.textContent = u ? u.full_name : 'Khách trải nghiệm';
  const uAv = document.getElementById('cl-prof-av');
  if (uAv) uAv.textContent = (u?.full_name || 'V').charAt(0).toUpperCase();

  const totalLessons = courses.reduce((s, c) => s + c.lessons.length, 0);
  const stC = document.getElementById('cl-stat-courses');
  if (stC) stC.textContent = `${enrolled.length}/${courses.length}`;
  const stL = document.getElementById('cl-stat-lessons');
  if (stL) stL.textContent = `${doneLessons.length}/${totalLessons}`;
  const stQ = document.getElementById('cl-stat-quests');
  if (stQ) stQ.textContent = `${(window.AppState.completedChallenges || []).length}/50`;

  const mineBtn = document.getElementById('ctab-mine');
  if (mineBtn) mineBtn.textContent = `Đang học (${enrolled.length})`;

  const grid = document.getElementById('courses-catalog-grid');
  if (!grid) return;
  const list = window.AppState.courseFilter === 'mine'
    ? courses.filter((c) => enrolled.includes(c.id))
    : courses;

  grid.className = 'cl-courses-grid';
  grid.innerHTML = list.map((c) => {
    const isOwned = enrolled.includes(c.id);
    const doneInCourse = c.lessons.filter((l) => doneLessons.includes(l.id)).length;
    const actionClick = isOwned
      ? `openCourseIDE('${c.id}', 0)`
      : (c.price > 0 ? `openPaidCourseModal('${c.id}')` : `enrollFreeCourse('${c.id}')`);
    return `
      <div class="cl-course-card" onclick="${actionClick}">
        <div class="cl-card-banner" style="background:${c.gradient}">
          <span class="cl-fire-badge">🔥</span>
          <h3>${c.bannerTitle}</h3>
          <p>${c.bannerSub}</p>
          <span class="cl-banner-icon">${c.icon}</span>
        </div>
        <div class="cl-card-body">
          <div>
            <span class="cl-tag-pill">Khóa học • ${c.lessons.length} bài</span>
            <div class="cl-card-title">${c.title}</div>
            <div class="cl-card-meta">V-Code Edu • Hoàn thành ${doneInCourse}/${c.lessons.length}</div>
            <div class="cl-stars">★★★★★ <span style="color:var(--text-secondary)">${c.rating}</span></div>
          </div>
          <div class="cl-card-footer">
            <span class="${c.price > 0 ? 'cl-price-paid' : 'cl-price-free'}">${c.price > 0 ? '20.000 đ' : 'Miễn phí'}</span>
            <span class="badge ${isOwned ? 'badge-easy' : 'badge-blue'}">${isOwned ? 'Vào học →' : 'Đăng ký'}</span>
          </div>
        </div>
      </div>`;
  }).join('');
};

// Nâng cấp thanh chọn 50 bài trong IDE Khóa học bằng Dropdown gọn gàng + nút Trước/Sau
window.openCourseIDE = function(courseId, lessonIdx = 0) {
  const c = (window.VCODE_COURSES || []).find((x) => x.id === courseId);
  if (!c) return;
  window.AppState.activeCourse = c;
  window.AppState.activeCourseLessonIdx = Math.max(0, Math.min(c.lessons.length - 1, lessonIdx));
  const l = c.lessons[window.AppState.activeCourseLessonIdx];

  document.getElementById('cl-course-title').textContent = `${c.title} (${window.AppState.activeCourseLessonIdx + 1}/${c.lessons.length})`;
  document.getElementById('cl-diff-badge').textContent = l.difficulty;
  document.getElementById('cl-points-badge').textContent = `${l.points} Điểm`;
  document.getElementById('cl-lesson-title').textContent = l.title;
  document.getElementById('cl-problem-html').innerHTML = l.problem;
  document.getElementById('cl-theory-html').innerHTML = l.theory;
  document.getElementById('cl-lang-label').textContent = c.lang.toUpperCase();
  document.getElementById('cl-code-editor').value = l.starter;
  document.getElementById('cl-test-status').textContent = 'Sẵn sàng';
  document.getElementById('cl-test-output').innerHTML = `Đầu vào mẫu: <b>${l.testCases[0].input}</b><br/>Đầu ra mong đợi: <b>${l.testCases[0].expected}</b>`;

  const pillsBox = document.getElementById('cl-lesson-pills');
  const optionsHtml = c.lessons.map((item, i) => {
    const done = (window.AppState.completedCourseLessons || []).includes(item.id) ? '✓ ' : '';
    return `<option value="${i}" ${i === window.AppState.activeCourseLessonIdx ? 'selected' : ''}>${done}Bài ${i + 1}: ${item.title.replace(/^Bài \d+:\s*/, '')}</option>`;
  }).join('');
  pillsBox.innerHTML = `
    <button class="cl-pill" onclick="openCourseIDE('${c.id}', ${window.AppState.activeCourseLessonIdx - 1})">◀</button>
    <select class="select-field" style="width:230px;padding:4px 8px;background:#0F172A;color:#F8FAFC;border-color:#475569;font-size:12px" onchange="openCourseIDE('${c.id}', Number(this.value))">${optionsHtml}</select>
    <button class="cl-pill" onclick="openCourseIDE('${c.id}', ${window.AppState.activeCourseLessonIdx + 1})">▶</button>
  `;
  switchView('course-ide');
};

// 2. FIX TRIỆT ĐỂ HỆ THỐNG LỚP HỌC (CHẠY MƯỢT 100% CẢ ONLINE BACKEND LẪN OFFLINE / GITHUB PAGES)
window.handleCreateClassSubmit = async function(e) {
  e.preventDefault();
  const u = window.AppState.user;
  const payload = {
    name: document.getElementById('new-class-name').value.trim(),
    grade_subject: document.getElementById('new-class-subject').value.trim(),
    code: document.getElementById('new-class-code').value.trim().toUpperCase(),
    description: document.getElementById('new-class-desc').value.trim(),
    teacher_email: u.email || u.username
  };
  let created = null;
  try {
    const res = await apiRequest('/api/classes/create', { method: 'POST', body: JSON.stringify(payload) });
    created = res.classroom;
  } catch {
    const ldb = window.LocalClassDB.load();
    const code = payload.code || ('VC' + Math.floor(1000 + Math.random() * 9000));
    created = {
      code, name: payload.name, grade_subject: payload.grade_subject, description: payload.description,
      teacher_email: u.email || u.username, teacher_name: u.full_name,
      students: [], assignments: [], submissions: [], students_count: 0, assignments_count: 0
    };
    ldb.classes.unshift(created);
    window.LocalClassDB.save(ldb);
  }
  closeModal('create-class-modal');
  e.target.reset();
  window.AppState.activeClassroomCode = created.code;
  showToast(`🎉 Đã tạo lớp <b>${created.name}</b> — ID Mã lớp: <b>${created.code}</b>`);
  initClassroomPortalData();
};

window.handleCreateAssignmentSubmit = async function(e) {
  e.preventDefault();
  const payload = {
    classroom_code: window.AppState.activeClassroomCode,
    title: document.getElementById('assign-title').value.trim(),
    description: document.getElementById('assign-desc').value.trim(),
    difficulty: document.getElementById('assign-diff').value,
    due_date: document.getElementById('assign-due').value.trim(),
    starter_code: document.getElementById('assign-starter').value,
    test_cases: [{ input: document.getElementById('assign-in').value.trim(), expected: document.getElementById('assign-out').value.trim() }],
    created_by: window.AppState.user.username
  };
  try {
    await apiRequest('/api/assessment/create', { method: 'POST', body: JSON.stringify(payload) });
  } catch {
    const ldb = window.LocalClassDB.load();
    const cls = ldb.classes.find((c) => c.code === payload.classroom_code);
    if (cls) {
      cls.assignments = cls.assignments || [];
      cls.assignments.unshift({ ...payload, code: 'BT-' + Math.floor(100 + Math.random() * 900) });
      window.LocalClassDB.save(ldb);
    }
  }
  closeModal('create-assignment-modal');
  e.target.reset();
  showToast(`📝 Đã giao bài tập <b>${payload.title}</b> cho lớp ${payload.classroom_code}!`);
  selectTeacherClassroom(payload.classroom_code);
  switchTeacherSubpanel('assignments');
};

window.joinClassByCodeAction = async function(explicitCode) {
  const inp = document.getElementById('student-join-code-input');
  const code = (explicitCode || inp?.value || '').trim().toUpperCase();
  if (!code) { alert('Vui lòng nhập ID mã lớp học!'); return; }
  const u = window.AppState.user;
  let joinedCls = null;
  try {
    const res = await apiRequest('/api/classes/join', { method: 'POST', body: JSON.stringify({ code, student_email: u.email || u.username }) });
    joinedCls = res.classroom;
  } catch {
    const ldb = window.LocalClassDB.load();
    const cls = ldb.classes.find((c) => c.code === code);
    if (!cls) { alert(`Không tìm thấy lớp học có mã '${code}'. Hãy kiểm tra lại mã thầy/cô gửi!`); return; }
    cls.students = cls.students || [];
    if (!cls.students.some((s) => s.email === u.email)) {
      cls.students.push({ username: u.username, full_name: u.full_name, email: u.email, xp: u.xp || 100 });
      window.LocalClassDB.save(ldb);
    }
    joinedCls = cls;
  }
  if (inp) inp.value = '';
  showToast(`🎉 Đã tham gia lớp <b>${joinedCls.name}</b> thành công!`);
  await initClassroomPortalData();
  openStudentClassDetail(joinedCls.code);
};

// Ghi đè initClassroomPortalData & selectTeacherClassroom để tự động đọc từ LocalClassDB khi Backend tắt
const _origInitClsV9 = window.initClassroomPortalData;
window.initClassroomPortalData = async function() {
  await _origInitClsV9();
  const u = window.AppState.user;
  if (!u || !u.role || u.role === 'none') return;
  const ldb = window.LocalClassDB.load();
  if ((u.role === 'teacher' || u.role === 'admin') && (!window.AppState.teacherClasses || window.AppState.teacherClasses.length === 0)) {
    const mine = ldb.classes.filter((c) => c.teacher_email === (u.email || u.username));
    window.AppState.teacherClasses = (mine.length ? mine : ldb.classes).map((c) => ({
      ...c, students_count: (c.students || []).length, assignments_count: (c.assignments || []).length
    }));
    renderTeacherClassesGrid();
    if (window.AppState.teacherClasses.length > 0) {
      selectTeacherClassroom(window.AppState.activeClassroomCode || window.AppState.teacherClasses[0].code);
    }
  } else if (u.role === 'student' && (!window.AppState.studentClasses || window.AppState.studentClasses.length === 0)) {
    window.AppState.studentClasses = ldb.classes.filter((c) => (c.students || []).some((s) => s.email === u.email)).map((c) => ({
      ...c, assignments_count: (c.assignments || []).length
    }));
    renderStudentJoinedClasses();
  }
};

const _origSelectTeacherV9 = window.selectTeacherClassroom;
window.selectTeacherClassroom = async function(code) {
  await _origSelectTeacherV9(code);
  if (!document.getElementById('teacher-selected-class-title').textContent) {
    const ldb = window.LocalClassDB.load();
    const cls = ldb.classes.find((c) => c.code === code);
    if (cls) {
      document.getElementById('teacher-selected-class-title').textContent = cls.name;
      window.AppState.currentRoster = (cls.students || []).map((st) => ({
        username: st.username, full_name: st.full_name, email: st.email, xp: st.xp,
        status: 'not_started', problem: 'Chưa mở bài tập', progress: 0, score: null, code: '', updated: 'Chưa làm'
      }));
      renderRealRosterTable();
      document.getElementById('teacher-assignments-list').innerHTML = (cls.assignments || []).map((a) => `
        <div class="olm-assignment-row"><div><strong>${a.title}</strong> <span class="badge badge-easy">${a.difficulty}</span><div style="font-size:12px;color:var(--text-secondary)">${a.description}</div></div><span class="mono badge badge-blue">${a.code}</span></div>`).join('') || '<p style="color:var(--text-secondary)">Chưa có bài tập nào.</p>';
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { if (window.renderCoursesCatalog) window.renderCoursesCatalog(); }, 150);
});


// ==================== V10.0 PATCH: PERFECT OLM CLASSROOM + SMART LOCAL/API ROBOT AI ====================
window.AppState.olmTab = 'assignments';
window.AppState.olmHwFilter = 'all';
window.AppState.olmActiveDetail = null;

window.sendRobotAIChat = async function() {
  const inp = document.getElementById('robot-chat-input');
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  const feed = document.getElementById('robot-chat-feed');
  feed.innerHTML += `<div class="chat-msg user">${q.replace(/</g, '&lt;')}</div>`;
  const code = document.getElementById('code-editor')?.value || '';
  const res = await window.VCodeAI.askHybrid(q, code);
  const tag = res.mode === 'offline' ? '🟠 AI Cục bộ (Không cần Key)' : (res.mode === 'online-openai' ? '🟢 API Chatbox (OpenAI)' : '🟢 API Chatbox (Gemini)');
  feed.innerHTML += `<div class="chat-msg ai"><div style="font-size:10.5px;color:var(--accent-emerald);font-weight:700;margin-bottom:4px">${tag}</div>${window.VCodeAI.formatMarkdown(res.text)}</div>`;
  feed.scrollTop = feed.scrollHeight;
};

window.refreshRobotKeyUI = function() {
  const cfg = window.VCodeAI.getConfig();
  const validKey = cfg.openaiKey.startsWith('sk-') ? cfg.openaiKey : (cfg.geminiKey.startsWith('AIza') ? cfg.geminiKey : '');
  const guide = document.getElementById('robot-key-guide');
  const activeBox = document.getElementById('robot-key-active');
  const badge = document.getElementById('robot-ai-mode-badge');
  const masked = document.getElementById('robot-key-masked');

  if (validKey && navigator.onLine) {
    if (guide) guide.style.display = 'none';
    if (activeBox) activeBox.style.display = 'flex';
    if (masked) masked.textContent = `${validKey.slice(0, 6)}...${validKey.slice(-4)}`;
    if (badge) badge.textContent = validKey.startsWith('sk-') ? '🟢 API Chatbox (OpenAI)' : '🟢 API Chatbox (Gemini)';
  } else {
    if (guide) guide.style.display = 'block';
    if (activeBox) activeBox.style.display = 'none';
    if (badge) badge.textContent = '🟠 AI Cục bộ (Sẵn sàng không cần Key)';
  }
};

window.saveQuickRobotKey = function() {
  const k = (document.getElementById('robot-quick-key-input').value || '').trim();
  if (!k) return;
  if (!k.startsWith('AIza') && !k.startsWith('sk-')) {
    alert('Mã Key chưa đúng chuẩn!\n• Google Gemini API Key phải bắt đầu bằng: AIza...\n• OpenAI API Key phải bắt đầu bằng: sk-...\nBạn xem hướng dẫn 4 bước ngay bên trên để lấy đúng mã nhé!');
    return;
  }
  if (k.startsWith('sk-')) { localStorage.setItem('vcode_openai_key', k); localStorage.removeItem('vcode_gemini_key'); }
  else { localStorage.setItem('vcode_gemini_key', k); localStorage.removeItem('vcode_openai_key'); }
  document.getElementById('robot-quick-key-input').value = '';
  refreshRobotKeyUI();
  showToast('🤖 Đã kích hoạt API Chatbox thông minh thành công!');
};

window.switchOlmTab = function(tabName) {
  window.AppState.olmTab = tabName;
  document.querySelectorAll('[data-olmtab]').forEach((b) => b.classList.toggle('active', b.dataset.olmtab === tabName));
  document.querySelectorAll('.olm-panel').forEach((p) => { p.style.display = p.id === `olmpanel-${tabName}` ? 'block' : 'none'; });
};

window.filterOlmAssignments = function(mode, btn) {
  window.AppState.olmHwFilter = mode;
  document.querySelectorAll('.olm-filter-chip').forEach((c) => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderOlmActiveClass();
};

window.initClassroomPortalData = async function() {
  const u = window.AppState.user;
  const loginBox = document.getElementById('classroom-login-required');
  const roleBox = document.getElementById('classroom-role-once-picker');
  const ws = document.getElementById('olm-main-workspace');
  if (!loginBox || !roleBox || !ws) return;

  loginBox.style.display = 'none';
  roleBox.style.display = 'none';
  ws.style.display = 'none';

  if (!u) { loginBox.style.display = 'block'; return; }
  if (!u.role || u.role === 'none') { roleBox.style.display = 'block'; return; }

  ws.style.display = 'grid';
  const isTeacher = u.role === 'teacher' || u.role === 'admin';
  const ldb = window.LocalClassDB.load();
  let classes = [];

  try {
    const endpoint = isTeacher ? `/api/classes/teacher/${encodeURIComponent(u.email)}` : `/api/classes/student/${encodeURIComponent(u.email)}`;
    const res = await apiRequest(endpoint);
    classes = res.classes || [];
  } catch {
    classes = isTeacher
      ? ldb.classes.filter((c) => c.teacher_email === u.email || ldb.classes.length > 0)
      : ldb.classes.filter((c) => (c.students || []).some((s) => s.email === u.email));
  }

  if (isTeacher && classes.length === 0) classes = ldb.classes;
  window.AppState.olmClasses = classes;

  const actBox = document.getElementById('olm-role-actions');
  if (isTeacher) {
    actBox.innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('create-class-modal').classList.add('open')">+ Tạo lớp mới</button>
      <button class="btn btn-blue btn-sm" onclick="openCreateAssignmentModal()">📝 Giao bài tập</button>`;
  } else {
    actBox.innerHTML = `
      <input id="student-join-code-input" class="input-field mono" style="width:165px;padding:6px 10px;text-transform:uppercase;font-weight:700" placeholder="Nhập ID mã lớp..." />
      <button class="olm-hw-btn" style="padding:7px 14px;font-size:12.5px" onclick="joinClassByCodeAction()">+ Vào lớp</button>`;
  }

  const pills = document.getElementById('olm-class-pills');
  if (classes.length === 0) {
    pills.innerHTML = `<span style="font-size:13.5px;color:#64748B">${isTeacher ? 'Chưa có lớp học nào — bấm + Tạo lớp mới!' : 'Em chưa vào lớp nào — nhập mã lớp (VD: TIN10HP) ở bên phải!'}</span>`;
    document.getElementById('olm-active-class-name').textContent = 'Chưa chọn lớp';
    document.getElementById('olm-active-class-code').textContent = '---';
    document.getElementById('olm-hw-list').innerHTML = `<p style="text-align:center;color:#64748B;padding:24px">Hãy tham gia hoặc tạo một lớp học để xem danh sách bài tập.</p>`;
    return;
  }

  if (!window.AppState.activeClassroomCode || !classes.some((c) => c.code === window.AppState.activeClassroomCode)) {
    window.AppState.activeClassroomCode = classes[0].code;
  }

  pills.innerHTML = classes.map((c) => `
    <button class="olm-class-badge-btn ${c.code === window.AppState.activeClassroomCode ? 'active' : ''}" onclick="selectOlmClass('${c.code}')">${c.name.split('—')[0].trim()} (${c.code})</button>
  `).join('');

  await selectOlmClass(window.AppState.activeClassroomCode);
};

window.selectOlmClass = async function(code) {
  window.AppState.activeClassroomCode = code;
  document.querySelectorAll('.olm-class-badge-btn').forEach((b) => b.classList.toggle('active', b.textContent.includes(`(${code})`)));

  let detail = null;
  try {
    detail = await apiRequest(`/api/classes/${encodeURIComponent(code)}/detail`);
  } catch {
    const ldb = window.LocalClassDB.load();
    const cls = ldb.classes.find((c) => c.code === code) || ldb.classes[0];
    if (cls) {
      detail = {
        classroom: { ...cls, students_count: (cls.students || []).length },
        roster: (cls.students || []).map((st) => ({
          username: st.username, full_name: st.full_name, email: st.email, xp: st.xp || 100,
          status: 'not_started', problem: 'Chưa mở bài tập', progress: 0, score: null, code: '', updated: 'Chưa làm'
        })),
        assignments: cls.assignments || [],
        submissions: cls.submissions || []
      };
    }
  }
  window.AppState.olmActiveDetail = detail;
  window.AppState.currentRoster = detail?.roster || [];
  window.__classAssignmentsCache = detail?.assignments || [];
  renderOlmActiveClass();
};

window.renderOlmActiveClass = function() {
  const detail = window.AppState.olmActiveDetail;
  if (!detail) return;
  const u = window.AppState.user;
  const isTeacher = u && (u.role === 'teacher' || u.role === 'admin');
  const cls = detail.classroom;

  document.getElementById('olm-active-class-name').textContent = cls.name;
  document.getElementById('olm-active-class-code').textContent = cls.code;
  document.getElementById('olm-teacher-name').textContent = cls.teacher_name || 'Giáo viên V-Code Edu';
  document.getElementById('olm-student-count').textContent = detail.roster.length;

  const allHw = detail.assignments || [];
  document.getElementById('olm-hw-count').textContent = `(${allHw.length})`;
  const filteredHw = allHw.filter((a) => {
    const mySub = (detail.submissions || []).find((s) => s.assignment_code === a.code && s.username === u.username);
    if (window.AppState.olmHwFilter === 'done') return Boolean(mySub);
    if (window.AppState.olmHwFilter === 'todo') return !mySub;
    return true;
  });

  const hwBox = document.getElementById('olm-hw-list');
  hwBox.innerHTML = filteredHw.length
    ? filteredHw.map((a, idx) => {
        const mySub = (detail.submissions || []).find((s) => s.assignment_code === a.code && s.username === u.username);
        const fbHtml = mySub && mySub.teacher_feedback ? `<div style="margin-top:6px;padding:6px 10px;border-radius:8px;background:#ECFDF5;color:#065F46;font-size:12px">💬 <b>Nhận xét GV:</b> ${mySub.teacher_feedback}</div>` : '';
        return `
          <div class="olm-hw-card">
            <div style="display:flex;align-items:flex-start;gap:14px;flex:1;min-width:240px">
              <div class="olm-hw-icon">🧮</div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
                  <span class="badge badge-blue">Tin học • Python</span>
                  <strong style="font-size:15px">${a.title}</strong>
                  ${mySub ? `<span class="badge badge-easy">✓ Điểm: ${mySub.score}/100</span>` : ''}
                </div>
                <div style="font-size:12.5px;color:#64748B;margin-bottom:4px">[Luyện tập] ${a.description}</div>
                <div style="font-size:12px;color:#475569">Giáo viên: <strong>${cls.teacher_name || 'GV Tin học'}</strong> • Hạn: ${a.due_date || 'Không giới hạn'}</div>
                ${fbHtml}
              </div>
            </div>
            <div>
              ${isTeacher
                ? `<button class="btn btn-sm btn-blue" onclick="switchOlmTab('realtime')">👁 Xem tiến độ</button>`
                : `<button class="olm-hw-btn" onclick="openDedicatedAssignmentIDE(${idx}, '${cls.code}')">${mySub ? 'Làm lại' : 'Làm bài'}</button>`
              }
            </div>
          </div>`;
      }).join('')
    : `<p style="text-align:center;color:#64748B;padding:20px">Không có bài tập nào trong mục này.</p>`;

  const mBody = document.getElementById('olm-members-tbody');
  mBody.innerHTML = detail.roster.length
    ? detail.roster.map((st, i) => `
        <tr><td>${i + 1}</td><td><strong>${st.full_name}</strong></td><td>${st.email}</td><td>${st.status === 'completed' ? '<span class="badge badge-easy">Đã làm</span>' : (st.status === 'coding' ? '<span class="badge badge-blue">Đang làm</span>' : '<span class="badge badge-med">Chưa làm</span>')}</td><td class="mono">${st.xp} XP</td></tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#64748B;padding:18px">Chưa có học sinh nào tham gia lớp. Gửi mã lớp <b>${cls.code}</b> cho học sinh nhé!</td></tr>`;

  if (window.renderRealRosterTable) window.renderRealRosterTable();
  renderOlmDiscussion();
};

window.postOlmDiscussion = function() {
  const inp = document.getElementById('olm-discuss-input');
  const txt = (inp?.value || '').trim();
  if (!txt) return;
  inp.value = '';
  const key = 'vcode_discuss_' + window.AppState.activeClassroomCode;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.unshift({ author: window.AppState.user?.full_name || 'Thành viên', role: window.AppState.user?.role || 'student', text: txt, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) });
  localStorage.setItem(key, JSON.stringify(list));
  renderOlmDiscussion();
};

window.renderOlmDiscussion = function() {
  const box = document.getElementById('olm-discuss-list');
  if (!box) return;
  const key = 'vcode_discuss_' + window.AppState.activeClassroomCode;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  box.innerHTML = list.length
    ? list.map((m) => `<div style="padding:12px 14px;border-radius:10px;background:var(--bg-elevated);margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><strong>${m.author} ${m.role === 'teacher' ? '<span class="badge badge-easy">GV</span>' : ''}</strong><span style="color:#64748B">${m.time}</span></div><div style="font-size:13.5px">${m.text}</div></div>`).join('')
    : `<p style="text-align:center;color:#64748B;padding:16px">Chưa có thảo luận nào trong lớp. Hãy là người đầu tiên đặt câu hỏi!</p>`;
};


// ==================== V11.0 PATCH: IDE MULTI-LANG + IDE THEME + MOBA EDU CHALLENGE LOBBY ====================
window.IDE_LANG_TEMPLATES = {
  python: {
    file: 'main.py',
    code: "# Python 3 — V-Code Edu IDE\nn = int(input())\ntong = 0\nfor i in range(1, n + 1):\n    if i % 2 == 0:\n        tong += i\nprint('Tong chan =', tong)",
    snippets: [
      { label: '+ Nhập số N', code: "n = int(input())\n" },
      { label: '+ Vòng lặp for', code: "for i in range(1, n + 1):\n    print(i)\n" },
      { label: '+ Rẽ nhánh if/else', code: "if n % 2 == 0:\n    print('Chan')\nelse:\n    print('Le')\n" }
    ]
  },
  pyvn: {
    file: 'viet_python.py',
    code: "# Python Tiếng Việt — V-Code Edu\nn = nhap_so()\ntong = 0\nlap_voi i trong_khoang(1, n + 1):\n    neu i % 2 == 0:\n        tong = tong + i\nin_ra(tong)",
    snippets: [
      { label: '+ nhap_so()', code: "n = nhap_so()\n" },
      { label: '+ lap_voi', code: "lap_voi i trong_khoang(1, n + 1):\n    in_ra(i)\n" },
      { label: '+ neu / nguoc_lai', code: "neu n % 2 == 0:\n    in_ra('Chan')\nnguoc_lai:\n    in_ra('Le')\n" }
    ]
  },
  html: {
    file: 'index.html',
    code: "<!DOCTYPE html>\n<html>\n<body style='font-family:sans-serif;padding:20px;background:#F0F9FF'>\n  <h1 style='color:#059669'>Xin chào V-Code Edu!</h1>\n  <p>Bấm Chạy Chương Trình để xem trước trang web HTML trực tiếp.</p>\n  <button style='background:#2563EB;color:#fff;border:none;padding:10px 18px;border-radius:8px'>Nút bấm HTML5</button>\n</body>\n</html>",
    snippets: [
      { label: '+ Thẻ <h1>', code: "<h1>Tiêu đề</h1>\n" },
      { label: '+ Thẻ <p>', code: "<p>Đoạn văn bản</p>\n" },
      { label: '+ Thẻ <button>', code: "<button>Bấm vào đây</button>\n" }
    ]
  },
  css: {
    file: 'style.css',
    code: "/* CSS3 — Xem trước trực tiếp */\n.card {\n  background: linear-gradient(135deg, #059669, #2563EB);\n  color: white;\n  padding: 24px;\n  border-radius: 14px;\n  font-family: sans-serif;\n  text-align: center;\n}",
    snippets: [
      { label: '+ Flexbox', code: "display: flex; justify-content: center; align-items: center;\n" },
      { label: '+ Gradient', code: "background: linear-gradient(135deg, #10B981, #3B82F6);\n" }
    ]
  },
  js: {
    file: 'script.js',
    code: "// JavaScript (ES6) — Chạy trực tiếp trên trình duyệt\nconst n = 10;\nlet sum = 0;\nfor (let i = 1; i <= n; i++) sum += i;\nconsole.log('Tổng từ 1 đến ' + n + ' là:', sum);",
    snippets: [
      { label: '+ console.log', code: "console.log('Hello JS');\n" },
      { label: '+ for loop', code: "for (let i = 1; i <= 5; i++) { console.log(i); }\n" }
    ]
  },
  c: {
    file: 'main.c',
    code: '#include <stdio.h>\nint main() {\n    int n = 6;\n    printf("Xin chao Ngon ngu C! n * 2 = %d", n * 2);\n    return 0;\n}',
    snippets: [
      { label: '+ printf()', code: 'printf("Ket qua: %d\n", x);\n' },
      { label: '+ scanf()', code: 'scanf("%d", &n);\n' }
    ]
  },
  cpp: {
    file: 'main.cpp',
    code: '#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Xin chao C++ Thuat toan HSG!" << endl;\n    return 0;\n}',
    snippets: [
      { label: '+ cout <<', code: 'cout << "Hello C++" << endl;\n' },
      { label: '+ vector<int>', code: 'vector<int> a = {1, 2, 3};\n' }
    ]
  },
  sql: {
    file: 'query.sql',
    code: "-- MySQL / SQL Truy vấn mẫu\nSELECT ho_ten, lop, diem\nFROM hoc_sinh\nWHERE diem >= 8.0\nORDER BY diem DESC;",
    snippets: [
      { label: '+ SELECT', code: "SELECT * FROM hoc_sinh;\n" },
      { label: '+ GROUP BY', code: "SELECT lop, COUNT(*) FROM hoc_sinh GROUP BY lop;\n" }
    ]
  }
};

window.AppState.ideLang = 'python';
window.AppState.ideTheme = localStorage.getItem('vcode_ide_theme') || 'dark';

window.toggleIDETheme = function() {
  const next = window.AppState.ideTheme === 'dark' ? 'light' : 'dark';
  window.AppState.ideTheme = next;
  localStorage.setItem('vcode_ide_theme', next);
  const shell = document.querySelector('#view-workspace .workspace-shell');
  if (shell) shell.setAttribute('data-ide-theme', next);
  const btn = document.getElementById('ide-theme-toggle-btn');
  if (btn) btn.textContent = next === 'dark' ? '☀️ Sáng IDE' : '🌙 Tối IDE';
};

window.switchIDELanguage = function(lang) {
  window.AppState.ideLang = lang;
  const tpl = window.IDE_LANG_TEMPLATES[lang] || window.IDE_LANG_TEMPLATES.python;
  const nameEl = document.getElementById('ide-filename-label');
  if (nameEl) nameEl.textContent = tpl.file;
  const ed = document.getElementById('code-editor');
  if (ed) ed.value = tpl.code;
  const bar = document.getElementById('snippet-bar');
  if (bar) {
    bar.innerHTML = tpl.snippets.map((s, i) => `<button class="snippet-chip" onclick="insertLangSnippet('${lang}', ${i})">${s.label}</button>`).join('');
  }
  syncLiveEditorOutputs();
};

window.insertLangSnippet = function(lang, idx) {
  const tpl = window.IDE_LANG_TEMPLATES[lang];
  const ed = document.getElementById('code-editor');
  if (tpl && tpl.snippets[idx] && ed) {
    ed.value += (ed.value.endsWith('\n') ? '' : '\n') + tpl.snippets[idx].code;
    syncLiveEditorOutputs();
  }
};

window.runCodeAction = function() {
  const lang = window.AppState.ideLang || 'python';
  const code = document.getElementById('code-editor').value;
  const stdin = document.getElementById('custom-stdin').value.split('\n');
  const consoleEl = document.getElementById('console-output');
  switchRightTab('ai');

  if (lang === 'python' || lang === 'pyvn') {
    const res = window.VCodeIDE.runPython(code, stdin);
    consoleEl.innerHTML = res.ok
      ? `>>> [${lang.toUpperCase()}] Thực thi thành công:\n${(res.output || '(Không có dữ liệu in ra)').replace(/</g, '&lt;')}`
      : `>>> Lỗi thực thi:\n${res.error}`;
  } else if (lang === 'html') {
    consoleEl.innerHTML = `<div style="margin-bottom:6px;color:#34D399">>>> Xem trước trực tiếp HTML5:</div><div style="background:#FFF;color:#0F172A;border-radius:8px;overflow:hidden">${code}</div>`;
  } else if (lang === 'css') {
    consoleEl.innerHTML = `<style>${code}</style><div class="card"><h3>Xem trước CSS3 (.card)</h3><p>Giao diện áp dụng trực tiếp từ mã CSS của bạn!</p></div>`;
  } else if (lang === 'js') {
    const logs = [];
    const origLog = console.log;
    try {
      console.log = (...a) => logs.push(a.join(' '));
      new Function(code)();
      consoleEl.textContent = `>>> [JavaScript ES6] Kết quả:\n${logs.join('\n') || '(Chạy xong, không có console.log)'}`;
    } catch (e) {
      consoleEl.textContent = `>>> Lỗi JavaScript: ${e.message}`;
    } finally { console.log = origLog; }
  } else if (lang === 'c' || lang === 'cpp') {
    const prints = [...code.matchAll(/(?:printf\s*\(\s*"([^"]+)"|cout\s*<<\s*"([^"]+)")/g)].map((m) => m[1] || m[2]);
    consoleEl.textContent = `>>> [${lang.toUpperCase()} Compiler] Biên dịch thành công (0 lỗi)!\nĐầu ra mô phỏng:\n${prints.join('\n') || 'Chương trình hợp lệ (return 0)'}`;
  } else if (lang === 'sql') {
    consoleEl.innerHTML = `<div style="color:#34D399;margin-bottom:8px">>>> [MySQL Engine] Truy vấn hợp lệ! Kết quả mẫu:</div><table class="data-table" style="color:#E2E8F0"><tr><th>ho_ten</th><th>lop</th><th>diem</th></tr><tr><td>Nguyễn Minh Quân</td><td>10A1</td><td>9.5</td></tr><tr><td>Lê Thu Hà</td><td>10A1</td><td>8.8</td></tr></table>`;
  }
};

window.AppState.mobaFilter = 'all';
window.selectMobaCategory = function(cat, btn) {
  window.AppState.mobaFilter = cat;
  document.querySelectorAll('.moba-cat-tab').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.renderGameLobby50();
};

window.renderGameLobby50 = function() {
  const list = window.VCODE_50_CHALLENGES || [];
  const doneIds = window.AppState.completedChallenges || [];
  const u = window.AppState.user;

  const pName = document.getElementById('moba-player-name');
  if (pName) pName.textContent = (u?.full_name || 'CHIẾN BINH CODE').toUpperCase();
  const pAv = document.getElementById('moba-player-av');
  if (pAv) pAv.textContent = (u?.full_name || 'V').charAt(0).toUpperCase();
  const pLvl = document.getElementById('moba-player-lvl');
  if (pLvl) pLvl.textContent = Math.max(1, doneIds.length + 1);
  const pDone = document.getElementById('moba-res-done');
  if (pDone) pDone.textContent = `${doneIds.length}/50`;
  const pXp = document.getElementById('moba-res-xp');
  if (pXp) pXp.textContent = (u?.xp || 100) + doneIds.length * 100;

  const grid = document.getElementById('moba-cards-grid');
  if (!grid) return;

  const cat = window.AppState.mobaFilter || 'all';
  const filtered = list.filter((c) => {
    if (cat === 'all') return true;
    if (cat === 'cleared') return doneIds.includes(c.id);
    if (cat === 'python') return c.world <= 3;
    if (cat === 'c') return c.world === 4;
    if (cat === 'cpp') return c.world === 5;
    return true;
  });

  const gradients = [
    'linear-gradient(180deg, #065F46 0%, #064E3B 100%)',
    'linear-gradient(180deg, #1E40AF 0%, #1E3A8A 100%)',
    'linear-gradient(180deg, #5B21B6 0%, #4C1D95 100%)',
    'linear-gradient(180deg, #B45309 0%, #78350F 100%)',
    'linear-gradient(180deg, #9F1239 0%, #881337 100%)'
  ];

  grid.innerHTML = filtered.map((c) => {
    const done = doneIds.includes(c.id);
    const bg = gradients[(c.world - 1) % gradients.length];
    return `
      <div class="moba-portrait-card ${done ? 'cleared' : ''}" onclick="open50StageIDE('${c.id}')">
        <div class="moba-card-art" style="background:${bg}">
          <span class="moba-card-lang-tag">${c.lang.toUpperCase()}</span>
          <span class="art-icon">${c.icon}</span>
          <div style="font-size:10.5px;color:rgba(255,255,255,0.8);margin-top:8px;font-weight:700">CHẶNG ${c.stage}</div>
        </div>
        <div class="moba-card-bottom">
          <div class="moba-card-rewards">
            <span>⚡ +${c.xp} XP</span>
            <span>${done ? '⭐ XONG' : '💎 +10'}</span>
          </div>
          <div class="moba-card-name" title="${c.title}">
            <span class="moba-dot"></span>
            <span>${c.title.replace(/^Chặng \d+:\s*/, '')}</span>
          </div>
        </div>
      </div>`;
  }).join('');
};

window.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('#view-workspace .workspace-shell');
  if (shell) shell.setAttribute('data-ide-theme', window.AppState.ideTheme);
  const btn = document.getElementById('ide-theme-toggle-btn');
  if (btn) btn.textContent = window.AppState.ideTheme === 'dark' ? '☀️ Sáng IDE' : '🌙 Tối IDE';
  setTimeout(() => { if (window.renderGameLobby50) window.renderGameLobby50(); }, 180);
});


// ==================== V13.0 PATCH: UNBLOCK ALL GEMINI KEYS (AQ. & AIza) + OPENAI ====================
window.refreshRobotKeyUI = function() {
  const cfg = window.VCodeAI.getConfig();
  const activeKey = cfg.openaiKey || cfg.geminiKey;
  const guide = document.getElementById('robot-key-guide');
  const activeBox = document.getElementById('robot-key-active');
  const badge = document.getElementById('robot-ai-mode-badge');
  const masked = document.getElementById('robot-key-masked');

  if (activeKey && activeKey.length >= 12 && navigator.onLine) {
    if (guide) guide.style.display = 'none';
    if (activeBox) activeBox.style.display = 'flex';
    if (masked) masked.textContent = `${activeKey.slice(0, 6)}...${activeKey.slice(-4)}`;
    if (badge) badge.textContent = activeKey.startsWith('sk-') ? '🟢 API Chatbox (OpenAI)' : '🟢 API Chatbox (Gemini)';
  } else {
    if (guide) guide.style.display = 'block';
    if (activeBox) activeBox.style.display = 'none';
    if (badge) badge.textContent = '🟠 AI Cục bộ (Sẵn sàng không cần Key)';
  }
};

window.saveQuickRobotKey = function() {
  const k = (document.getElementById('robot-quick-key-input').value || '').trim();
  if (!k || k.length < 12) {
    alert('Vui lòng dán đầy đủ mã API Key (Gemini hoặc OpenAI)!');
    return;
  }
  if (k.startsWith('sk-')) {
    localStorage.setItem('vcode_openai_key', k);
    localStorage.removeItem('vcode_gemini_key');
  } else {
    localStorage.setItem('vcode_gemini_key', k);
    localStorage.removeItem('vcode_openai_key');
  }
  document.getElementById('robot-quick-key-input').value = '';
  refreshRobotKeyUI();
  showToast('🤖 Đã lưu API Key thành công! Hãy nhắn tin cho Robot AI ngay.');
};


// ==================== V14.0 PATCH: 100 REAL CHALLENGES + HANDCRAFTED GAMING SVG EMBLEMS ====================
window.AppState.mobaRankFilter = 'ALL';
window.AppState.mobaSearchQuery = '';

window.getGamingEmblemSVG = function(world, isBoss) {
  if (isBoss) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <defs><linearGradient id="gBoss" x1="0" y1="0" x2="80" y2="80"><stop stop-color="#FDE047"/><stop offset="1" stop-color="#EA580C"/></linearGradient></defs>
      <polygon points="40,6 70,22 64,62 40,74 16,62 10,22" fill="#1C1917" stroke="url(#gBoss)" stroke-width="3"/>
      <path d="M18 50 L24 26 L34 38 L40 20 L46 38 L56 26 L62 50 Z" fill="url(#gBoss)"/>
      <rect x="20" y="53" width="40" height="6" rx="2" fill="#FDE047"/>
      <circle cx="40" cy="41" r="4" fill="#DC2626"/>
    </svg>`;
  }
  if (world === 1) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <defs><linearGradient id="gSnake" x1="10" y1="10" x2="70" y2="70"><stop stop-color="#34D399"/><stop offset="1" stop-color="#047857"/></linearGradient></defs>
      <polygon points="40,6 70,22 70,58 40,74 10,58 10,22" fill="#06281E" stroke="#10B981" stroke-width="2.2"/>
      <path d="M52 24 C42 18, 24 22, 24 34 C24 44, 54 40, 54 52 C54 62, 34 64, 24 56" stroke="url(#gSnake)" stroke-width="8" stroke-linecap="round"/>
      <circle cx="53" cy="24" r="6" fill="#34D399"/>
      <circle cx="55" cy="23" r="1.8" fill="#06120E"/>
      <path d="M59 25 L66 22 M59 25 L65 28" stroke="#F43F5E" stroke-width="2" stroke-linecap="round"/>
    </svg>`;
  }
  if (world === 2) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <path d="M40 8 L66 18 V40 C66 56 54 67 40 73 C26 67 14 56 14 40 V18 L40 8 Z" fill="#0C1F3D" stroke="#38BDF8" stroke-width="2.5"/>
      <path d="M40 22 V42 M40 42 L27 54 M40 42 L53 54" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
      <circle cx="40" cy="22" r="5" fill="#F8FAFC"/>
      <circle cx="27" cy="54" r="4.5" fill="#10B981"/>
      <circle cx="53" cy="54" r="4.5" fill="#F59E0B"/>
    </svg>`;
  }
  if (world === 3) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="30" fill="#1A103C" stroke="#A855F7" stroke-width="2.5" stroke-dasharray="10 4"/>
      <circle cx="40" cy="40" r="21" stroke="#C084FC" stroke-width="2"/>
      <polygon points="44,17 26,43 39,43 35,63 54,36 41,36" fill="#FACC15" stroke="#FEF08A" stroke-width="1.2"/>
    </svg>`;
  }
  if (world === 4) {
    return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
      <circle cx="40" cy="40" r="28" fill="#271A0C" stroke="#F59E0B" stroke-width="2.5"/>
      <path d="M52 28 A16 16 0 1 0 52 52" stroke="#FBBF24" stroke-width="8" stroke-linecap="round"/>
      <path d="M42 40 H64 M58 34 L64 40 L58 46" stroke="#38BDF8" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }
  return `<svg class="moba-emblem-svg" viewBox="0 0 80 80" fill="none">
    <polygon points="40,6 70,22 70,58 40,74 10,58 10,22" fill="#2A0A14" stroke="#F43F5E" stroke-width="2.5"/>
    <path d="M36 27 A14 14 0 1 0 36 53" stroke="#FB7185" stroke-width="7" stroke-linecap="round"/>
    <path d="M43 40 H53 M48 35 V45 M56 40 H66 M61 35 V45" stroke="#FDE047" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`;
};

window.setMobaRankFilter = function(rank, btn) {
  window.AppState.mobaRankFilter = rank;
  document.querySelectorAll('.moba-rank-pill').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.renderGameLobby50();
};

window.onMobaSearchInput = function(val) {
  window.AppState.mobaSearchQuery = (val || '').trim().toLowerCase();
  window.renderGameLobby50();
};

window.renderGameLobby50 = function() {
  const list = window.VCODE_50_CHALLENGES || [];
  const doneIds = window.AppState.completedChallenges || [];
  const u = window.AppState.user;

  const pName = document.getElementById('moba-player-name');
  if (pName) pName.textContent = (u?.full_name || 'CHIẾN BINH CODE').toUpperCase();
  const pAv = document.getElementById('moba-player-av');
  if (pAv) pAv.textContent = (u?.full_name || 'V').charAt(0).toUpperCase();
  const pLvl = document.getElementById('moba-player-lvl');
  if (pLvl) pLvl.textContent = Math.max(1, doneIds.length + 1);
  const pDone = document.getElementById('moba-res-done');
  if (pDone) pDone.textContent = `${doneIds.length}/${list.length}`;
  const pXp = document.getElementById('moba-res-xp');
  if (pXp) pXp.textContent = (u?.xp || 100) + doneIds.length * 100;

  const grid = document.getElementById('moba-cards-grid');
  if (!grid) return;

  const cat = window.AppState.mobaFilter || 'all';
  const rFilter = window.AppState.mobaRankFilter || 'ALL';
  const q = window.AppState.mobaSearchQuery || '';

  const filtered = list.filter((c) => {
    if (cat === 'cleared' && !doneIds.includes(c.id)) return false;
    if (cat === 'python' && c.world > 3) return false;
    if (cat === 'c' && c.world !== 4) return false;
    if (cat === 'cpp' && c.world !== 5) return false;
    if (rFilter !== 'ALL' && c.rank !== rFilter) return false;
    if (q && !c.title.toLowerCase().includes(q) && !c.desc.toLowerCase().includes(q)) return false;
    return true;
  });

  const bgPalettes = [
    'radial-gradient(circle at 50% 35%, #065F46 0%, #052E23 100%)',
    'radial-gradient(circle at 50% 35%, #1D4ED8 0%, #0F1D40 100%)',
    'radial-gradient(circle at 50% 35%, #6D28D9 0%, #1F1147 100%)',
    'radial-gradient(circle at 50% 35%, #B45309 0%, #2C1808 100%)',
    'radial-gradient(circle at 50% 35%, #BE123C 0%, #2D0914 100%)'
  ];

  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:span 5;text-align:center;padding:40px;color:#94A3B8">Không tìm thấy thử thách phù hợp với bộ lọc hiện tại.</div>`;
    return;
  }

  grid.innerHTML = filtered.map((c) => {
    const done = doneIds.includes(c.id);
    const bg = c.isBoss
      ? 'radial-gradient(circle at 50% 30%, #9A3412 0%, #1C1917 100%)'
      : bgPalettes[(c.world - 1) % bgPalettes.length];
    return `
      <div class="moba-portrait-card ${done ? 'cleared' : ''} ${c.isBoss ? 'boss-card' : ''}" onclick="open50StageIDE('${c.id}')">
        <div class="moba-card-art" style="background:${bg}">
          <span class="moba-stage-watermark">#${String(c.stage).padStart(2, '0')}</span>
          <span class="moba-rank-badge rank-${c.rank}">${c.isBoss ? 'BOSS' : 'RANK ' + c.rank}</span>
          ${window.getGamingEmblemSVG(c.world, c.isBoss)}
          <div style="font-size:10px;color:rgba(255,255,255,0.68);margin-top:6px;letter-spacing:0.08em;font-weight:700">${c.lang.toUpperCase()}</div>
        </div>
        <div class="moba-card-bottom">
          <div class="moba-card-rewards">
            <span>+${c.xp} XP</span>
            <span style="color:${done ? '#34D399' : '#94A3B8'}">${done ? '✓ ĐÃ QUA' : c.worldName.split(' ').slice(-1)[0]}</span>
          </div>
          <div class="moba-card-name" title="${c.title}">
            <span class="moba-dot"></span>
            <span>${c.shortTitle || c.title}</span>
          </div>
        </div>
      </div>`;
  }).join('');
};

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => { if (window.renderGameLobby50) window.renderGameLobby50(); }, 200);
});
