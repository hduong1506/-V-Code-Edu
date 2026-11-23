// V-CODE EDU v18.0 — SCROLL SPLIT 3D + OLM CLASSROOM REAL DEADLINE & GRADING
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
          const avgScore = asgSubs.length ? Number((asgSubs.reduce((acc, s) => acc + Number(s.teacher_score ?? s.score ?? 0), 0) / asgSubs.length).toFixed(1)) : 0;
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
                      ? `<button type="button" class="btn btn-sm" onclick="openV18StudentSolve('${esc(a.id || a.code)}', true)">Đã nộp • Điểm: ${mySub.teacher_score ?? mySub.score ?? 0}/10</button>`
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
                <span>Điểm TB: <strong>${asgSubs.length ? avgScore + '/10' : '—'}</strong></span>
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
          <td>${sub ? `<strong>${sub.teacher_score ?? sub.score ?? 0}/10</strong>` : '—'}</td>
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
      <p style="font-size:12.5px;color:var(--text-secondary);margin:0 0 12px">Bài tập: <strong>${esc(asg.title)}</strong> • Điểm tự động: <strong>${sub.score ?? 0}/10</strong></p>
      <pre class="v18-code-preview">${esc(sub.code || '# Không có mã nguồn')}</pre>
      <form id="v18-grade-form" style="margin-top:14px">
        <div style="display:grid;grid-template-columns:160px 1fr;gap:12px">
          <div>
            <label style="font-size:12px;font-weight:700;display:block;margin-bottom:4px">Điểm giáo viên (0-10)</label>
            <input type="number" id="v18-grade-score" class="input-field" min="0" max="10" step="0.25" value="${sub.teacher_score ?? sub.score ?? 0}" required />
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
      ${oldSub ? `<div class="v18-rt-note" style="margin-bottom:10px">Điểm của bạn: <strong>${oldSub.teacher_score ?? oldSub.score ?? 0}/10</strong>${oldSub.teacher_note ? ' • Nhận xét GV: <strong>' + esc(oldSub.teacher_note) + '</strong>' : ''}</div>` : ''}
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
        if (typeof showToast === 'function') showToast(`Đã nộp bài thành công! Điểm tự động: ${graded.score}/10`);
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
