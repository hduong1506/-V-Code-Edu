// V-Code Edu — classroom: overview (teacher dashboard / student dashboard) built from live class data.
import { h, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { banner } from './art.js';
import { openInvite } from './settings.js';
import { openAssignmentEditor, openSolve } from './assignments.js';
import { buildEvents, eventItem } from './feed.js';
import {
  kpi, panel, donut, barList, histogram, deadlineStrip, emptyBlock, avatar, statusPill, deadlineChip,
  effScore, isGraded, avg, pct, scoreText, studentStatus, onlineOf, presenceText, langLabel, DAY, round1,
} from './util.js';

function hero(S, actions) {
  const { cls, code, isTeacher } = S;
  return h('section', { class: 'cr-class-hero' },
    banner(code, 'cr-class-hero__bg'),
    h('div', { class: 'cr-class-hero__inner' },
      h('div', { class: 'cr-class-hero__text' },
        h('div', { class: 'cr-class-hero__chips' }, h('span', { class: 'cr-glass-chip mono' }, icon('hash'), code), cls.grade_subject ? h('span', { class: 'cr-glass-chip' }, cls.grade_subject) : null),
        h('h1', { class: 'cr-class-hero__title' }, cls.name),
        h('p', { class: 'cr-class-hero__sub' }, isTeacher ? `${S.roster().length} học sinh · ${S.assignments.length} bài tập` : `Giáo viên: ${cls.teacher_name || cls.teacher_email}`),
        cls.description ? h('p', { class: 'cr-class-hero__desc' }, cls.description) : null),
      actions ? h('div', { class: 'cr-class-hero__actions' }, actions) : null));
}

export function overviewSection(S) {
  const el = h('div', { class: 'cr-sec cr-overview' });
  const update = () => mount(el, S.isTeacher ? teacherOverview(S) : studentOverview(S));
  update();
  return { el, update, deps: ['cls', 'assignments', 'submissions', 'presence', 'messages'] };
}

// ---------------------------------------------------------------------------
function teacherOverview(S) {
  const now = Date.now();
  const roster = S.roster();
  const emails = new Set(roster.map((r) => r.email));
  const asg = S.assignments;
  const subs = S.submissions.filter((s) => emails.has(s.email) && asg.some((a) => a.id === s.assignment_id));
  const online = roster.filter((r) => onlineOf(S.presence, r.email, now).online);
  const pending = subs.filter((s) => !isGraded(s));
  const scores = subs.map(effScore).filter((v) => v !== null);
  const slots = asg.length * roster.length;
  const openAsg = asg.filter((a) => !a.deadline_ts || a.deadline_ts > now);

  // status of every (student × assignment) slot
  let graded = 0; let waiting = 0; let notYet = 0; let missing = 0;
  for (const a of asg) for (const r of roster) {
    const s = subs.find((x) => x.assignment_id === a.id && x.email === r.email);
    if (s) { if (isGraded(s)) graded++; else waiting++; } else if (a.deadline_ts && now > a.deadline_ts) missing++; else notYet++;
  }

  const actions = [
    h('button', { class: 'btn cr-btn-light', type: 'button', onClick: () => openAssignmentEditor(S, null) }, icon('plus'), 'Giao bài mới'),
    h('button', { class: 'btn cr-btn-glass', type: 'button', onClick: () => openInvite(S) }, icon('qr'), 'Mời học sinh'),
  ];

  const attention = roster.map((r) => {
    const mine = subs.filter((x) => x.email === r.email);
    const overdue = asg.filter((a) => a.deadline_ts && now > a.deadline_ts && !mine.some((x) => x.assignment_id === a.id)).length;
    const sc = mine.map(effScore).filter((v) => v !== null);
    const av = sc.length ? avg(sc) : null;
    return { r, overdue, av };
  }).filter((x) => x.overdue > 0 || (x.av !== null && x.av < 5)).sort((a, b) => b.overdue - a.overdue || (a.av ?? 10) - (b.av ?? 10)).slice(0, 6);

  const events = buildEvents(S).slice(0, 7);
  const recentAsg = asg.slice(0, 6);

  return [
    hero(S, actions),
    !roster.length ? h('div', { class: 'cr-callout tone-blue' }, icon('users'),
      h('div', { class: 'grow' }, h('strong', null, 'Lớp chưa có học sinh. '), `Gửi mã lớp `, h('strong', { class: 'mono' }, S.code), ' hoặc liên kết mời để các em tham gia.'),
      h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => openInvite(S) }, icon('qr'), 'Mời ngay')) : null,
    h('div', { class: 'cr-kpis cr-kpis--5' },
      kpi({ label: 'Học sinh', value: String(roster.length), hint: online.length ? `${online.length} đang trực tuyến` : 'Không ai trực tuyến', tone: 'blue', iconName: 'users', trend: online.length ? 'live' : null }),
      kpi({ label: 'Bài tập', value: String(asg.length), hint: `${openAsg.length} bài đang mở`, tone: 'ink', iconName: 'calendar' }),
      kpi({ label: 'Chờ chấm', value: String(pending.length), hint: pending.length ? 'Bài nộp chưa có điểm GV' : 'Đã chấm hết', tone: pending.length ? 'amber' : 'green', iconName: 'edit' }),
      kpi({ label: 'Tỉ lệ nộp bài', value: slots ? `${pct(subs.length, slots)}%` : '—', hint: slots ? `${subs.length}/${slots} lượt nộp` : 'Cần có bài tập và học sinh', tone: 'green', iconName: 'check-circle' }),
      kpi({ label: 'Điểm trung bình', value: scores.length ? scoreText(round1(avg(scores))) : '—', hint: scores.length ? `Từ ${scores.length} bài nộp` : 'Chưa có bài nộp', tone: 'ink', iconName: 'gauge' })),
    panel({ title: 'Lịch hạn nộp', sub: '14 ngày tới', className: 'cr-panel--strip', actions: h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => S.go('assignments') }, 'Tất cả bài tập', icon('arrow-right')),
      body: deadlineStrip(asg, { now, onPick: (a) => S.go('assignments', { assignmentId: a.id }), statusOf: (a) => (a.deadline_ts < now ? 'overdue' : a.deadline_ts - now < 2 * DAY ? 'soon' : 'todo') }) }),
    h('div', { class: 'cr-grid-2' },
      panel({ title: 'Tỉ lệ nộp theo bài tập', sub: recentAsg.length ? `${recentAsg.length} bài gần nhất · ${roster.length} học sinh` : null,
        body: recentAsg.length && roster.length ? barList(recentAsg.map((a) => {
          const n = subs.filter((s) => s.assignment_id === a.id).length;
          return { label: a.title, value: n, total: roster.length, sub: a.deadline_ts ? (now > a.deadline_ts ? 'Đã hết hạn' : `Hạn ${new Date(a.deadline_ts).getDate()}/${new Date(a.deadline_ts).getMonth() + 1}`) : 'Không hạn', tone: pct(n, roster.length) >= 80 ? 'green' : 'blue', onClick: () => S.go('assignments', { assignmentId: a.id }) };
        }), { valueText: (r) => `${r.value}/${r.total}` }) : emptyBlock({ art: 'assignments', title: asg.length ? 'Chưa có học sinh' : 'Chưa có bài tập', text: asg.length ? 'Tỉ lệ nộp sẽ hiển thị khi lớp có học sinh.' : 'Giao bài đầu tiên để theo dõi tỉ lệ nộp.', compact: true, action: !asg.length ? h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => openAssignmentEditor(S, null) }, icon('plus'), 'Giao bài') : null }) }),
      panel({ title: 'Tình trạng bài làm', sub: slots ? 'Mọi lượt học sinh × bài tập' : null,
        body: slots ? donut([
          { label: 'Đã chấm', value: graded, tone: 'green' },
          { label: 'Chờ chấm', value: waiting, tone: 'blue' },
          { label: 'Chưa nộp (còn hạn)', value: notYet, tone: 'gray' },
          { label: 'Thiếu (quá hạn)', value: missing, tone: 'red' },
        ], { centerValue: `${pct(graded + waiting, slots)}%`, centerLabel: 'đã nộp' }) : emptyBlock({ art: 'inbox', title: 'Chưa có dữ liệu', text: 'Biểu đồ xuất hiện khi lớp có học sinh và bài tập.', compact: true }) })),
    h('div', { class: 'cr-grid-2' },
      panel({ title: 'Phân bố điểm', sub: scores.length ? `${scores.length} bài nộp · điểm GV, nếu chưa chấm dùng điểm tự động` : null,
        body: scores.length ? h('div', { class: 'cr-hist-wrap' }, histogram(scores), h('div', { class: 'cr-hist-legend' }, ['low', 'mid', 'good', 'high'].map((b, i) => h('span', null, h('i', { class: `band-${b}` }), ['Dưới 5', '5 – 6', '6 – 8', '8 – 10'][i])))) : emptyBlock({ art: 'grades', title: 'Chưa có điểm', text: 'Phân bố điểm hiển thị khi có bài nộp.', compact: true }) }),
      panel({ title: 'Cần chú ý', sub: 'Thiếu bài quá hạn hoặc điểm TB dưới 5',
        actions: roster.length ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => S.go('students') }, 'Học sinh', icon('arrow-right')) : null,
        body: attention.length ? h('ul', { class: 'cr-people-list' }, attention.map((x) => h('li', null,
          avatar(x.r.full_name, x.r.email, { size: 32 }),
          h('div', { class: 'grow' }, h('strong', { class: 'truncate' }, x.r.full_name), h('span', { class: 'truncate' }, x.r.email)),
          x.overdue ? h('span', { class: 'cr-tag tone-red' }, `Thiếu ${x.overdue} bài`) : null,
          x.av !== null ? h('span', { class: `cr-score-badge band-${x.av >= 8 ? 'high' : x.av >= 6.5 ? 'good' : x.av >= 5 ? 'mid' : 'low'}` }, scoreText(round1(x.av))) : null))) : h('div', { class: 'cr-ok-note' }, icon('check-circle'), roster.length ? 'Không có học sinh nào cần chú ý.' : 'Chưa có học sinh.') })),
    h('div', { class: 'cr-grid-2' },
      panel({ title: 'Đang trực tuyến', sub: 'Cập nhật trực tiếp',
        body: online.length ? h('ul', { class: 'cr-people-list' }, online.map((r) => { const { p } = onlineOf(S.presence, r.email, now); return h('li', null, avatar(r.full_name, r.email, { size: 32, online: true }), h('div', { class: 'grow' }, h('strong', { class: 'truncate' }, r.full_name), h('span', { class: 'truncate' }, [presenceText(p, true), p?.task].filter(Boolean).join(' · '))), h('span', { class: `cr-live-dot ${p?.status === 'error' ? 'is-warn' : ''}` })); }))
          : h('div', { class: 'cr-ok-note is-muted' }, icon('wifi'), 'Hiện chưa có học sinh nào trực tuyến.') }),
      panel({ title: 'Hoạt động gần đây', actions: h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => S.go('activity') }, 'Xem tất cả', icon('arrow-right')),
        body: events.length ? h('ol', { class: 'cr-timeline is-compact' }, events.map((e) => eventItem(S, e, { compact: true }))) : h('div', { class: 'cr-ok-note is-muted' }, icon('history'), 'Chưa có hoạt động.') })),
  ];
}

// ---------------------------------------------------------------------------
function studentOverview(S) {
  const now = Date.now();
  const asg = S.assignments;
  const items = asg.map((a) => { const sub = S.submissions.find((x) => x.assignment_id === a.id); return { a, sub, status: studentStatus(a, sub, now) }; });
  const count = (st) => items.filter((x) => x.status === st).length;
  const todo = items.filter((x) => x.status === 'todo').sort((x, y) => (x.a.deadline_ts || Infinity) - (y.a.deadline_ts || Infinity));
  const soon = todo.filter((x) => x.a.deadline_ts && x.a.deadline_ts - now < 2 * DAY);
  const scores = items.map((x) => effScore(x.sub)).filter((v) => v !== null);
  const done = count('submitted') + count('graded');
  const feedback = items.filter((x) => x.status === 'graded').sort((x, y) => (y.sub.graded_at || 0) - (x.sub.graded_at || 0)).slice(0, 4);
  const events = buildEvents(S).slice(0, 6);
  const next = todo[0];

  return [
    hero(S, next ? [h('button', { class: 'btn cr-btn-light', type: 'button', onClick: () => openSolve(S, next.a) }, icon('code'), 'Làm bài tiếp theo')] : null),
    h('div', { class: 'cr-kpis' },
      kpi({ label: 'Đã nộp', value: `${done}/${asg.length}`, hint: asg.length ? `${pct(done, asg.length)}% bài tập của lớp` : 'Lớp chưa có bài tập', tone: 'green', iconName: 'check-circle' }),
      kpi({ label: 'Điểm trung bình', value: scores.length ? scoreText(round1(avg(scores))) : '—', hint: count('graded') ? `${count('graded')} bài đã được chấm` : 'Chưa có bài được chấm', tone: 'blue', iconName: 'gauge' }),
      kpi({ label: 'Sắp đến hạn', value: String(soon.length), hint: 'Chưa nộp, hạn trong 48 giờ', tone: soon.length ? 'amber' : 'ink', iconName: 'clock' }),
      kpi({ label: 'Quá hạn', value: String(count('overdue')), hint: count('overdue') ? 'Hết hạn mà chưa nộp' : 'Không có bài quá hạn', tone: count('overdue') ? 'red' : 'ink', iconName: 'alert' })),
    panel({ title: 'Lịch hạn nộp', sub: '14 ngày tới', className: 'cr-panel--strip',
      body: deadlineStrip(asg, { now, onPick: (a) => S.go('assignments', { assignmentId: a.id }), statusOf: (a) => { const it = items.find((x) => x.a.id === a.id); if (it.status === 'graded' || it.status === 'submitted') return 'done'; return a.deadline_ts < now ? 'overdue' : a.deadline_ts - now < 2 * DAY ? 'soon' : 'todo'; } }) }),
    h('div', { class: 'cr-grid-2' },
      panel({ title: 'Việc cần làm', sub: todo.length ? `${todo.length} bài chưa nộp, sắp xếp theo hạn` : null, actions: h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => S.go('assignments') }, 'Tất cả', icon('arrow-right')),
        body: todo.length ? h('ul', { class: 'cr-task-list' }, todo.slice(0, 6).map((x) => h('li', null,
          h('button', { class: 'cr-task', type: 'button', onClick: () => openSolve(S, x.a) },
            h('span', { class: `cr-task__bar st-${x.a.deadline_ts && x.a.deadline_ts - now < 2 * DAY ? 'soon' : 'todo'}` }),
            h('span', { class: 'grow' }, h('strong', { class: 'truncate' }, x.a.title), h('span', { class: 'truncate' }, `${langLabel(x.a.language)} · ${(x.a.test_cases || []).length} test`)),
            deadlineChip(x.a, now), icon('chevron-right')))))
          : emptyBlock({ art: 'inbox', title: asg.length ? 'Em đã nộp hết bài đang mở' : 'Chưa có bài tập', text: asg.length ? 'Tuyệt vời! Bài mới sẽ hiện ở đây ngay khi thầy/cô giao.' : 'Khi thầy/cô giao bài, bài tập sẽ hiện ở đây ngay lập tức.', compact: true }) }),
      panel({ title: 'Tiến độ của em', body: asg.length ? donut([
        { label: 'Đã chấm', value: count('graded'), tone: 'green' },
        { label: 'Đã nộp, chờ chấm', value: count('submitted'), tone: 'blue' },
        { label: 'Chưa làm', value: count('todo'), tone: 'gray' },
        { label: 'Quá hạn', value: count('overdue'), tone: 'red' },
      ], { centerValue: `${pct(done, asg.length)}%`, centerLabel: 'hoàn thành' }) : emptyBlock({ art: 'grades', title: 'Chưa có dữ liệu', text: 'Tiến độ hiển thị khi lớp có bài tập.', compact: true }) })),
    h('div', { class: 'cr-grid-2' },
      panel({ title: 'Nhận xét của thầy/cô', body: feedback.length ? h('ul', { class: 'cr-feedback-list' }, feedback.map((x) => h('li', null,
        h('span', { class: `cr-score-badge band-${effScore(x.sub) >= 8 ? 'high' : effScore(x.sub) >= 6.5 ? 'good' : effScore(x.sub) >= 5 ? 'mid' : 'low'}` }, scoreText(x.sub.teacher_score)),
        h('div', { class: 'grow' }, h('strong', null, x.a.title), h('p', null, x.sub.teacher_note || 'Không có nhận xét.')),
        statusPill('graded'))))
        : h('div', { class: 'cr-ok-note is-muted' }, icon('message'), 'Chưa có bài nào được chấm.') }),
      panel({ title: 'Hoạt động gần đây', actions: h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => S.go('activity') }, 'Xem tất cả', icon('arrow-right')),
        body: events.length ? h('ol', { class: 'cr-timeline is-compact' }, events.map((e) => eventItem(S, e, { compact: true }))) : h('div', { class: 'cr-ok-note is-muted' }, icon('history'), 'Chưa có hoạt động.') })),
  ];
}
