// V-Code Edu — classroom people: teacher roster (live presence + per-student progress) / student member list.
import { h, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { toast, openModal, confirmDialog } from '../../core/ui.js';
import { formatDate, formatRelative, formatDateTime } from '../../core/format.js';
import * as C from '../../services/classroom.js';
import { openInvite } from './settings.js';
import { openGrade } from './assignments.js';
import {
  errMsg, sectionHead, kpi, emptyBlock, avatar, progressBar, chipFilter, searchBox, sortableTable, onlineOf, presenceText,
  effScore, isGraded, avg, round1, scoreText, scoreBand, studentStatus, statusPill, pct,
} from './util.js';

const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

export function peopleSection(S) {
  return S.isTeacher ? teacherRoster(S) : memberList(S);
}

function studentStats(S, r, now = Date.now()) {
  const subs = S.submissions.filter((x) => x.email === r.email && S.assignments.some((a) => a.id === x.assignment_id));
  const sc = subs.map(effScore).filter((v) => v !== null);
  const overdue = S.assignments.filter((a) => a.deadline_ts && now > a.deadline_ts && !subs.some((x) => x.assignment_id === a.id)).length;
  const { p, online } = onlineOf(S.presence, r.email, now);
  return { subs, done: subs.length, avg: sc.length ? round1(avg(sc)) : null, overdue, p, online, last: Math.max(p?.updated_at || 0, ...subs.map((x) => x.submitted_at || 0)) };
}

function teacherRoster(S) {
  const kpiHost = h('div');
  const filterHost = h('div', { class: 'cr-toolbar__filters' });
  const tableHost = h('div');
  const el = h('div', { class: 'cr-sec' },
    sectionHead({ title: 'Học sinh', sub: 'Danh sách lớp, trạng thái trực tuyến và tiến độ từng em — cập nhật trực tiếp.', actions: h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openInvite(S) }, icon('qr'), 'Mời học sinh') }),
    kpiHost,
    h('div', { class: 'cr-toolbar' }, filterHost, h('div', { class: 'grow' }), searchBox('Tìm theo tên hoặc email…', S.ui.search.people, (v) => { S.ui.search.people = v; renderTable(); })),
    tableHost);

  let rows = [];
  function compute() {
    const now = Date.now();
    rows = S.roster().map((r) => ({ r, ...studentStats(S, r, now) }));
  }
  function renderTop() {
    const online = rows.filter((x) => x.online).length;
    const attention = rows.filter((x) => x.overdue > 0 || (x.avg !== null && x.avg < 5)).length;
    const complete = S.assignments.length ? rows.filter((x) => x.done >= S.assignments.length).length : 0;
    mount(kpiHost, rows.length ? h('div', { class: 'cr-kpis' },
      kpi({ label: 'Sĩ số', value: String(rows.length), hint: 'Học sinh trong lớp', tone: 'blue', iconName: 'users' }),
      kpi({ label: 'Đang trực tuyến', value: String(online), hint: online ? 'Trong 2 phút gần nhất' : 'Không ai trực tuyến', tone: online ? 'green' : 'ink', iconName: 'wifi', trend: online ? 'live' : null }),
      kpi({ label: 'Hoàn thành tất cả', value: String(complete), hint: S.assignments.length ? `Đã nộp đủ ${S.assignments.length} bài` : 'Chưa có bài tập', tone: 'ink', iconName: 'check-circle' }),
      kpi({ label: 'Cần chú ý', value: String(attention), hint: 'Thiếu bài quá hạn hoặc ĐTB < 5', tone: attention ? 'red' : 'ink', iconName: 'alert' })) : null);
    const f = S.ui.filters.people || 'all';
    mount(filterHost, rows.length ? chipFilter([['all', 'Tất cả', rows.length], ['online', 'Đang trực tuyến', online], ['attention', 'Cần chú ý', attention]], f, (v) => { S.ui.filters.people = v; renderTable(); }) : null);
  }
  function renderTable() {
    if (!rows.length) {
      mount(tableHost, emptyBlock({ art: 'students', title: 'Lớp chưa có học sinh', text: `Gửi mã lớp ${S.code}, liên kết mời hoặc mã QR cho học sinh. Danh sách sẽ tự cập nhật khi các em tham gia.`, action: h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openInvite(S) }, icon('qr'), 'Mời học sinh') }));
      return;
    }
    const f = S.ui.filters.people || 'all';
    const q = norm(S.ui.search.people);
    const shown = rows.filter((x) => (f === 'all' || (f === 'online' && x.online) || (f === 'attention' && (x.overdue > 0 || (x.avg !== null && x.avg < 5)))) && (!q || norm(x.r.full_name).includes(q) || norm(x.r.email).includes(q)));
    const total = S.assignments.length;
    mount(tableHost, sortableTable({
      caption: 'Danh sách học sinh',
      rows: shown,
      emptyText: 'Không có học sinh phù hợp.',
      initial: S.ui.sorts.people || { key: 'name', dir: 1 },
      rowKey: (x) => x.r.email,
      onRowClick: (x) => openStudent(S, x.r),
      columns: [
        { key: 'name', label: 'Học sinh', sort: (x) => x.r.full_name, render: (x) => h('div', { class: 'cr-cell-user' }, avatar(x.r.full_name, x.r.email, { size: 34, online: x.online }), h('div', null, h('strong', null, x.r.full_name), h('span', null, x.r.email))) },
        { key: 'presence', label: 'Trạng thái', sort: (x) => (x.online ? 0 : 1) * 1e13 - (x.p?.updated_at || 0), render: (x) => (x.online
          ? h('span', { class: `cr-presence ${x.p.status === 'error' ? 'is-warn' : 'is-live'}` }, h('i'), presenceText(x.p, true), x.p.task ? h('span', { class: 'truncate' }, ` · ${x.p.task}`) : null)
          : h('span', { class: 'cr-presence' }, h('i'), x.p ? `Hoạt động ${formatRelative(x.p.updated_at)}` : 'Chưa hoạt động')) },
        { key: 'progress', label: 'Tiến độ', sort: (x) => x.done, render: (x) => h('div', { class: 'cr-cell-progress' }, h('span', null, `${x.done}/${total}`), progressBar(x.done, total, { tone: total && x.done >= total ? 'green' : 'blue' })) },
        { key: 'avg', label: 'Điểm TB', align: 'right', sort: (x) => x.avg, defaultDir: -1, render: (x) => (x.avg === null ? h('span', { class: 'muted' }, '—') : h('span', { class: `cr-score-badge band-${scoreBand(x.avg)}` }, scoreText(x.avg))) },
        { key: 'overdue', label: 'Quá hạn', align: 'right', sort: (x) => x.overdue, defaultDir: -1, render: (x) => (x.overdue ? h('span', { class: 'cr-tag tone-red' }, `${x.overdue} bài`) : h('span', { class: 'muted' }, '0')) },
        { key: 'joined', label: 'Tham gia', sort: (x) => x.r.joined_at || null, render: (x) => h('span', { class: 'muted nowrap' }, x.r.joined_at ? formatDate(x.r.joined_at) : '—') },
        { key: 'act', label: '', align: 'right', render: (x) => h('button', { class: 'btn btn--ghost btn--sm btn--icon cr-danger-ghost', type: 'button', 'aria-label': `Xóa ${x.r.full_name} khỏi lớp`, title: 'Xóa khỏi lớp', onClick: () => removeStudent(S, x.r) }, icon('x')) },
      ],
    }));
  }
  function update() { compute(); renderTop(); renderTable(); }
  update();
  return { el, update, deps: ['cls', 'assignments', 'submissions', 'presence'] };
}

async function removeStudent(S, r) {
  if (!(await confirmDialog({ title: 'Xóa học sinh khỏi lớp?', message: `${r.full_name || r.email} sẽ không còn truy cập lớp này. Bài nộp cũ vẫn được giữ.`, confirmLabel: 'Xóa khỏi lớp', danger: true }))) return;
  try { await C.removeStudent(S.code, r.email); toast('Đã xóa học sinh khỏi lớp.'); } catch (err) { toast(errMsg(err), { type: 'error' }); }
}

/** Student profile modal (teacher): per-assignment status, scores and feedback. */
export function openStudent(S, r) {
  const now = Date.now();
  const st = studentStats(S, r, now);
  const graded = st.subs.filter(isGraded).length;
  const order = st.subs.map((x) => x.id);
  const m = openModal({
    title: r.full_name || r.email,
    size: 'lg',
    className: 'cr-modal',
    content: h('div', { class: 'cr-student' },
      h('div', { class: 'cr-student__head' }, avatar(r.full_name, r.email, { size: 56, online: st.online }),
        h('div', { class: 'grow' }, h('strong', null, r.full_name), h('span', null, r.email),
          h('span', { class: 'muted' }, [r.joined_at ? `Tham gia ${formatDate(r.joined_at)}` : null, st.online ? presenceText(st.p, true) : st.p ? `Hoạt động ${formatRelative(st.p.updated_at)}` : null].filter(Boolean).join(' · ')))),
      h('div', { class: 'cr-kpis cr-kpis--mini' },
        kpi({ label: 'Đã nộp', value: `${st.done}/${S.assignments.length}`, hint: `${pct(st.done, S.assignments.length)}%`, tone: 'blue', iconName: 'upload' }),
        kpi({ label: 'Điểm TB', value: st.avg === null ? '—' : scoreText(st.avg), hint: `${graded} bài đã chấm`, tone: 'green', iconName: 'gauge' }),
        kpi({ label: 'Quá hạn', value: String(st.overdue), hint: 'Chưa nộp, đã hết hạn', tone: st.overdue ? 'red' : 'ink', iconName: 'alert' })),
      S.assignments.length ? h('ul', { class: 'cr-student__list' }, S.assignments.map((a) => {
        const sub = st.subs.find((x) => x.assignment_id === a.id);
        const status = studentStatus(a, sub, now);
        return h('li', null,
          h('div', { class: 'grow' }, h('strong', null, a.title), h('span', null, sub ? `Nộp ${formatDateTime(sub.submitted_at)}` : a.deadline_ts ? `Hạn ${formatDateTime(a.deadline_ts)}` : 'Không hạn'),
            sub?.teacher_note ? h('p', { class: 'cr-student__note' }, `“${sub.teacher_note}”`) : null),
          statusPill(status),
          sub ? h('span', { class: `cr-score-badge band-${scoreBand(effScore(sub))}` }, scoreText(effScore(sub))) : h('span', { class: 'cr-score-badge band-none' }, '—'),
          sub ? h('button', { class: 'btn btn--soft btn--sm', type: 'button', onClick: () => { m.close(); openGrade(S, sub, { order }); } }, isGraded(sub) ? 'Xem lại' : 'Chấm') : h('span', { class: 'cr-student__spacer' }));
      })) : emptyBlock({ art: 'assignments', title: 'Lớp chưa có bài tập', compact: true })),
    actions: [{ label: 'Xóa khỏi lớp', variant: 'danger-soft', onClick: async () => { await removeStudent(S, r); return true; } }, { label: 'Đóng', variant: 'primary' }],
  });
}

// ---------------------------------------------------------------------------
function memberList(S) {
  const el = h('div', { class: 'cr-sec' });
  function update() {
    const roster = S.roster().slice().sort((a, b) => a.full_name.localeCompare(b.full_name, 'vi'));
    mount(el,
      sectionHead({ title: 'Thành viên', sub: `${roster.length} học sinh và giáo viên của lớp.` }),
      h('div', { class: 'cr-teacher-card' }, avatar(S.cls.teacher_name || S.cls.teacher_email, S.cls.teacher_email, { size: 52 }),
        h('div', { class: 'grow' }, h('span', { class: 'cr-tag tone-blue' }, 'Giáo viên'), h('strong', null, S.cls.teacher_name || S.cls.teacher_email), h('span', null, S.cls.teacher_email)),
        h('button', { class: 'btn btn--soft btn--sm', type: 'button', onClick: () => S.go('discussion') }, icon('messages'), 'Nhắn trong thảo luận')),
      roster.length ? h('ul', { class: 'cr-member-grid' }, roster.map((r) => h('li', { class: r.email === S.user.key ? 'is-me' : '' },
        avatar(r.full_name, r.email, { size: 40 }),
        h('div', { class: 'grow' }, h('strong', { class: 'truncate' }, r.full_name, r.email === S.user.key ? ' (em)' : ''), h('span', null, r.joined_at ? `Tham gia ${formatDate(r.joined_at)}` : 'Thành viên')))))
        : emptyBlock({ art: 'students', title: 'Chưa có thành viên', compact: true }));
  }
  update();
  return { el, update, deps: ['cls'] };
}
