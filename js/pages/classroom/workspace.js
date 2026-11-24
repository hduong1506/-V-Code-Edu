// V-Code Edu — one class (#/classroom/:code): live subscriptions + app shell + section routing.
import { h, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { toast } from '../../core/ui.js';
import * as C from '../../services/classroom.js';
import { createShell, invalidateClasses } from './shell.js';
import { errMsg, rosterOf, emptyBlock, isGraded, deadlineState } from './util.js';
import { overviewSection } from './overview.js';
import { assignmentsSection } from './assignments.js';
import { peopleSection } from './people.js';
import { gradebookSection } from './gradebook.js';
import { discussionSection, activitySection } from './feed.js';
import { settingsSection, openInvite } from './settings.js';

const TEACHER_SECTIONS = [
  { id: 'overview', label: 'Tổng quan', icon: 'grid' },
  { id: 'assignments', label: 'Bài tập', icon: 'calendar', badgeTone: 'amber' },
  { id: 'students', label: 'Học sinh', icon: 'users' },
  { id: 'gradebook', label: 'Bảng điểm', icon: 'table' },
  { id: 'discussion', label: 'Thảo luận', icon: 'messages' },
  { id: 'activity', label: 'Hoạt động', icon: 'history' },
  { id: 'settings', label: 'Cài đặt lớp', icon: 'settings' },
];
const STUDENT_SECTIONS = [
  { id: 'overview', label: 'Tổng quan', icon: 'grid' },
  { id: 'assignments', label: 'Bài tập', icon: 'calendar', badgeTone: 'blue' },
  { id: 'students', label: 'Thành viên', icon: 'users' },
  { id: 'gradebook', label: 'Điểm số', icon: 'table' },
  { id: 'discussion', label: 'Thảo luận', icon: 'messages' },
  { id: 'activity', label: 'Hoạt động', icon: 'history' },
  { id: 'settings', label: 'Thông tin lớp', icon: 'info' },
];
const FACTORIES = { overview: overviewSection, assignments: assignmentsSection, students: peopleSection, gradebook: gradebookSection, discussion: discussionSection, activity: activitySection, settings: settingsSection };
const ALIASES = { grading: ['assignments', { view: 'queue' }], grades: ['gradebook', {}], members: ['students', {}], info: ['settings', {}] };

export async function classView(container, ctx, user, isTeacher) {
  const { signal } = ctx;
  const code = C.normCode(ctx.params.code);
  const unsubs = [];
  signal.addEventListener('abort', () => unsubs.splice(0).forEach((u) => { try { u(); } catch { /* noop */ } }));

  let [section, extraUi] = ALIASES[ctx.query.tab] || [ctx.query.tab, {}];
  const sections = isTeacher ? TEACHER_SECTIONS : STUDENT_SECTIONS;
  if (!sections.some((x) => x.id === section)) section = ctx.query.a ? 'assignments' : 'overview';

  const S = {
    code, user, isTeacher, ctx, signal,
    cls: null, assignments: [], submissions: [], presence: [], messages: [],
    loaded: { cls: false, assignments: false, submissions: false, messages: false },
    ui: { section, assignmentId: ctx.query.a || null, view: extraUi.view || 'list', sorts: {}, filters: {}, search: {} },
    presenceBeat: !isTeacher ? C.createPresence(code) : null,
    solving: false,
    roster: () => rosterOf(S.cls),
    subsFor: (aid) => S.submissions.filter((x) => x.assignment_id === aid),
    subOf: (aid, email) => S.submissions.find((x) => x.assignment_id === aid && x.email === email),
    go, refresh: () => schedule('all'),
  };

  const shell = createShell({ ctx, user, isTeacher, currentCode: code, sections, active: section, onSelect: (id) => go(id) });
  const host = h('div', { class: 'cr-section-host' });
  mount(container, h('div', { class: 'cr-page cr-page--app' }, shell.el));
  mount(shell.main, host);
  mount(host, loadingSkeleton());

  // side extra: invite / teacher card
  function renderExtra() {
    if (!S.cls) { mount(shell.extra); return; }
    mount(shell.extra, isTeacher
      ? h('button', { class: 'cr-side-invite', type: 'button', onClick: () => openInvite(S) },
        h('span', { class: 'cr-side-invite__k' }, 'Mã lớp'), h('strong', { class: 'cr-side-invite__code' }, code),
        h('span', { class: 'cr-side-invite__cta' }, icon('qr'), 'Mời học sinh'))
      : h('div', { class: 'cr-side-teacher' }, h('span', { class: 'cr-side-invite__k' }, 'Giáo viên'), h('strong', { class: 'truncate' }, S.cls.teacher_name || S.cls.teacher_email), h('span', { class: 'cr-side-invite__k mono' }, `Mã lớp ${code}`)));
  }

  function updateBadges() {
    if (!S.cls) return;
    if (isTeacher) {
      const roster = new Set(S.roster().map((r) => r.email));
      const pending = S.submissions.filter((s) => !isGraded(s) && roster.has(s.email) && S.assignments.some((a) => a.id === s.assignment_id)).length;
      shell.setBadges({ assignments: pending || null, students: roster.size || null });
    } else {
      const todo = S.assignments.filter((a) => !S.submissions.some((s) => s.assignment_id === a.id) && deadlineState(a) !== 'closed').length;
      shell.setBadges({ assignments: todo || null });
    }
  }

  function syncUrl() {
    const q = new URLSearchParams();
    q.set('tab', S.ui.section === 'assignments' && S.ui.view === 'queue' ? 'grading' : S.ui.section);
    if (S.ui.section === 'assignments' && S.ui.assignmentId) q.set('a', S.ui.assignmentId);
    const target = `#/classroom/${code}?${q.toString()}`;
    if (location.hash !== target) history.replaceState(null, '', target);
  }

  let inst = null;
  function renderSection() {
    if (!S.cls) return;
    const factory = FACTORIES[S.ui.section] || overviewSection;
    try {
      inst = factory(S);
      mount(host, inst.el);
      host.classList.remove('is-entering'); void host.offsetWidth; host.classList.add('is-entering');
    } catch (err) {
      console.error('[classroom] section failed', err);
      mount(host, emptyBlock({ art: 'lock', title: 'Không hiển thị được mục này', text: errMsg(err) }));
    }
  }

  function go(id, extra = {}) {
    S.ui.section = id;
    S.ui.assignmentId = extra.assignmentId ?? (id === 'assignments' ? (extra.keepAssignment ? S.ui.assignmentId : null) : null);
    S.ui.view = extra.view || (id === 'assignments' ? 'list' : S.ui.view);
    shell.setActive(id);
    syncUrl();
    renderSection();
    if (!extra.noScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // batch updates from several listeners into one frame
  const pending = new Set();
  let raf = 0;
  function schedule(kind) {
    pending.add(kind);
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = 0;
      const kinds = new Set(pending); pending.clear();
      if (!S.cls) return;
      updateBadges();
      if (!inst) { renderSection(); return; }
      const deps = inst.deps || ['cls', 'assignments', 'submissions'];
      if (!kinds.has('all') && !deps.some((d) => kinds.has(d))) return;
      if (inst.update) { try { inst.update(kinds); } catch (err) { console.error('[classroom] update failed', err); renderSection(); } } else renderSection();
    });
  }
  signal.addEventListener('abort', () => cancelAnimationFrame(raf));

  const onErr = (err) => {
    console.warn('[classroom]', err);
    if (err?.code === 'permission-denied') {
      inst = null;
      mount(host, emptyBlock({ art: 'lock', title: 'Bạn không có quyền xem lớp này', text: 'Hãy tham gia lớp bằng mã trước, hoặc kiểm tra bạn đang đăng nhập đúng tài khoản.', action: h('a', { class: 'btn btn--primary', href: '#/classroom' }, 'Về lớp học của tôi') }));
    }
  };

  let migrated = false;
  let first = true;
  try {
    unsubs.push(await C.watchClass(code, async (data) => {
      if (!data) {
        inst = null; S.cls = null;
        mount(host, emptyBlock({ art: 'lock', title: 'Lớp không tồn tại hoặc đã bị xóa', text: `Không tìm thấy lớp có mã ${code}.`, action: h('a', { class: 'btn btn--primary', href: '#/classroom' }, 'Về danh sách lớp') }));
        mount(shell.extra);
        return;
      }
      if (!isTeacher && !(data.student_emails || []).includes(user.key) && data.teacher_email !== user.key) {
        // removed from the class (or never joined) — offer to (re)join
        inst = null; S.cls = null;
        mount(host, emptyBlock({ art: 'join', title: 'Em chưa ở trong lớp này', text: `Lớp “${data.name}” của ${data.teacher_name || data.teacher_email}. Tham gia để xem bài tập và thảo luận.`, action: h('a', { class: 'btn btn--primary', href: `#/join/${code}` }, icon('plus'), 'Tham gia lớp') }));
        return;
      }
      S.cls = data;
      S.loaded.cls = true;
      shell.setClass(data);
      renderExtra();
      if (isTeacher && !migrated && (Array.isArray(data.assignments) || Array.isArray(data.submissions))) {
        migrated = true;
        try { if (await C.migrateLegacyClass(data)) toast('Đã chuyển dữ liệu lớp từ phiên bản cũ sang cấu trúc mới.', { type: 'success' }); } catch (err) { console.warn('[classroom] legacy migration failed', err); }
      }
      if (!isTeacher && Array.isArray(data.assignments) && !S.assignments.length) {
        S.assignments = data.assignments.map((a) => ({ ...a, id: String(a.id || a.code) })); // legacy fallback until the teacher opens the class
      }
      if (first) {
        first = false;
        renderSection();
        if (ctx.query.welcome && isTeacher) { history.replaceState(null, '', `#/classroom/${code}?tab=overview`); setTimeout(() => openInvite(S, { welcome: true }), 250); }
      }
      schedule('cls');
    }, onErr));
    unsubs.push(await C.watchAssignments(code, (list) => { if (list.length || !Array.isArray(S.cls?.assignments)) S.assignments = list; S.loaded.assignments = true; schedule('assignments'); }, onErr));
    unsubs.push(await C.watchSubmissions(code, { mine: !isTeacher }, (list) => { S.submissions = list; S.loaded.submissions = true; schedule('submissions'); }, onErr));
    unsubs.push(await C.watchMessages(code, (list) => { S.messages = list; S.loaded.messages = true; schedule('messages'); }, () => {}));
    if (isTeacher) {
      unsubs.push(await C.watchPresence(code, (list) => { S.presence = list; schedule('presence'); }, () => {}));
      const t = setInterval(() => schedule('presence'), 30000);
      unsubs.push(() => clearInterval(t));
    } else {
      S.presenceBeat.beat('online', '');
      const t = setInterval(() => { if (!S.solving && document.visibilityState === 'visible') S.presenceBeat.beat('online', ''); }, 60000);
      unsubs.push(() => { clearInterval(t); S.presenceBeat.beat('idle', ''); });
    }
  } catch (err) {
    mount(host, emptyBlock({ art: 'offline', title: 'Không tải được lớp học', text: errMsg(err), action: h('button', { class: 'btn btn--primary', type: 'button', onClick: () => location.reload() }, icon('refresh'), 'Thử lại') }));
  }

  // keep the class cache fresh for the switcher when membership changes
  signal.addEventListener('abort', () => { if (S.cls && (S.cls.student_emails || []).length !== undefined) invalidateClasses(); });
}

function loadingSkeleton() {
  return h('div', { class: 'cr-skel' },
    h('div', { class: 'skeleton', style: 'height:150px;border-radius:18px' }),
    h('div', { class: 'cr-kpis' }, [1, 2, 3, 4].map(() => h('div', { class: 'skeleton', style: 'height:104px;border-radius:14px' }))),
    h('div', { class: 'skeleton', style: 'height:260px;border-radius:14px' }));
}
