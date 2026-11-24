// V-Code Edu — classroom dashboard (#/classroom): all classes of the signed-in teacher / student.
import { h, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import * as C from '../../services/classroom.js';
import { banner, classMark } from './art.js';
import { createShell, getMyClasses, openCreateClass, openJoinDialog, joinForm } from './shell.js';
import {
  errMsg, rosterOf, kpi, panel, emptyBlock, progressBar, studentStatus, deadlineText,
  effScore, isGraded, avg, scoreText, round1, DAY, langLabel,
} from './util.js';

export { invalidateClasses } from './shell.js';

function greeting(name) {
  const hr = new Date().getHours();
  const part = hr < 11 ? 'Chào buổi sáng' : hr < 14 ? 'Chào buổi trưa' : hr < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
  const first = String(name || '').trim().split(/\s+/).pop();
  return `${part}, ${first || 'bạn'}`;
}

/** Load assignments + submissions for each class (one read each; legacy embedded arrays as fallback). */
async function loadSummaries(classes, isTeacher) {
  const out = new Map();
  await Promise.all(classes.slice(0, 16).map(async (c) => {
    const code = c.code || c.id;
    try {
      const [assignments, submissions] = await Promise.all([C.listAssignments(code), C.listSubmissions(code, { mine: !isTeacher })]);
      const asg = assignments.length || !Array.isArray(c.assignments) ? assignments : c.assignments.map((a) => ({ ...a, id: String(a.id || a.code) }));
      out.set(code, { assignments: asg, submissions });
    } catch (err) {
      console.warn('[classroom] summary failed', code, err?.code || err);
      out.set(code, { assignments: [], submissions: [], error: true });
    }
  }));
  return out;
}

export async function homeView(container, ctx, user, isTeacher) {
  const shell = createShell({ ctx, user, isTeacher, sections: [{ id: 'home', label: 'Bảng điều khiển', icon: 'grid' }], active: 'home' });
  mount(container, h('div', { class: 'cr-page cr-page--app' }, shell.el));

  const kpis = h('div', { class: 'cr-kpis' }, [1, 2, 3, 4].map(() => h('div', { class: 'cr-kpi is-skeleton' }, h('div', { class: 'skeleton', style: 'height:14px;width:60%' }), h('div', { class: 'skeleton', style: 'height:28px;width:40%;margin-top:14px' }))));
  const grid = h('div', { class: 'cr-class-grid' }, [1, 2, 3].map(() => h('div', { class: 'cr-class-card is-skeleton' }, h('div', { class: 'skeleton', style: 'height:96px;border-radius:0' }), h('div', { style: 'padding:16px' }, h('div', { class: 'skeleton', style: 'height:16px;width:70%' }), h('div', { class: 'skeleton', style: 'height:12px;width:40%;margin-top:10px' })))));
  const aside = h('div', { class: 'cr-home__aside' });
  const header = h('header', { class: 'page-header cr-head' },
    h('div', { class: 'cr-head__text' },
      h('span', { class: 'cr-eyebrow' }, h('span', { class: 'cr-eyebrow__dot' }), isTeacher ? 'Không gian giáo viên' : 'Lớp học của em'),
      h('h1', { class: 'cr-head__title' }, greeting(user.displayName)),
      h('p', { class: 'cr-head__sub' }, isTeacher ? 'Tổng quan các lớp bạn đang dạy, bài chờ chấm và hạn nộp sắp tới.' : 'Bài tập cần làm, hạn nộp và điểm số ở tất cả các lớp của em.')),
    h('div', { class: 'cr-head__actions' }, isTeacher
      ? h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openCreateClass(ctx) }, icon('plus'), 'Tạo lớp mới')
      : joinForm(ctx)));
  const homeEl = h('div', { class: 'cr-home' },
    h('div', { class: 'cr-home__main' }, h('div', { class: 'cr-section-bar' }, h('h2', null, isTeacher ? 'Lớp bạn đang dạy' : 'Lớp đã tham gia'), h('span', { class: 'cr-count', 'data-count': '' })), grid),
    aside);
  mount(shell.main, header, kpis, homeEl);

  let classes;
  try {
    classes = await getMyClasses(user, { force: true });
  } catch (err) {
    mount(kpis);
    mount(grid, emptyBlock({ art: 'lock', title: 'Không tải được danh sách lớp', text: errMsg(err), action: h('button', { class: 'btn btn--primary', type: 'button', onClick: () => homeView(container, ctx, user, isTeacher) }, icon('refresh'), 'Thử lại') }));
    return;
  }
  if (ctx.signal.aborted) return;
  shell.main.querySelector('[data-count]').textContent = classes.length ? String(classes.length) : '';

  // side list of classes
  mount(shell.extra, classes.length ? h('div', { class: 'cr-side__group' },
    h('div', { class: 'cr-side__label' }, isTeacher ? 'Lớp của tôi' : 'Lớp đã tham gia'),
    classes.slice(0, 12).map((c) => h('a', { class: 'cr-side__class', href: `#/classroom/${c.code || c.id}` }, classMark(c.code || c.id, c.name), h('span', { class: 'truncate' }, c.name)))) : null,
  h('button', { class: 'cr-side__cta', type: 'button', onClick: () => (isTeacher ? openCreateClass(ctx) : openJoinDialog(ctx)) }, icon('plus'), isTeacher ? 'Tạo lớp mới' : 'Tham gia lớp'));

  if (!classes.length) {
    mount(kpis);
    homeEl.classList.add('is-empty');
    grid.classList.add('is-empty');
    mount(grid, h('div', { class: 'cr-onboard' },
      emptyBlock({
        art: isTeacher ? 'classes' : 'join',
        title: isTeacher ? 'Tạo lớp học đầu tiên của bạn' : 'Em chưa tham gia lớp nào',
        text: isTeacher ? 'Sau khi tạo lớp, bạn sẽ có mã lớp, liên kết và mã QR để mời học sinh. Bài tập, bảng điểm và thảo luận nằm gọn trong từng lớp.' : 'Nhập mã lớp thầy/cô gửi ở ô phía trên, hoặc mở liên kết mời / quét mã QR của lớp.',
        action: isTeacher ? h('button', { class: 'btn btn--primary btn--lg', type: 'button', onClick: () => openCreateClass(ctx) }, icon('plus'), 'Tạo lớp mới') : h('button', { class: 'btn btn--primary btn--lg', type: 'button', onClick: () => openJoinDialog(ctx) }, icon('plus'), 'Nhập mã lớp'),
      }),
      h('ol', { class: 'cr-onboard__steps' }, (isTeacher
        ? [['school', 'Tạo lớp', 'Đặt tên lớp, môn học.'], ['qr', 'Mời học sinh', 'Gửi mã, liên kết hoặc QR.'], ['calendar', 'Giao bài', 'Kèm bộ test và hạn nộp.'], ['check-circle', 'Chấm & theo dõi', 'Bảng điểm, biểu đồ.']]
        : [['hash', 'Nhập mã lớp', 'Do thầy/cô cung cấp.'], ['code', 'Làm bài', 'Ngay trên trình duyệt.'], ['check', 'Nộp bài', 'Chấm tự động tức thì.'], ['message', 'Nhận nhận xét', 'Từ thầy/cô.']])
        .map(([ic, t, d], i) => h('li', null, h('span', { class: 'cr-onboard__n' }, String(i + 1)), h('span', { class: 'cr-onboard__ic' }, icon(ic)), h('strong', null, t), h('span', null, d))))));
    mount(aside);
    return;
  }

  // initial cards without stats, then enrich
  const renderCards = (sum) => mount(grid, classes.map((c) => classCard(c, sum?.get(c.code || c.id), isTeacher, user)));
  renderCards(null);
  const sum = await loadSummaries(classes, isTeacher);
  if (ctx.signal.aborted) return;
  renderCards(sum);

  const now = Date.now();
  const all = [];
  for (const c of classes) {
    const code = c.code || c.id;
    const s = sum.get(code) || { assignments: [], submissions: [] };
    for (const a of s.assignments) all.push({ a, c, code, subs: s.submissions.filter((x) => x.assignment_id === a.id) });
  }

  if (isTeacher) {
    const students = new Set(classes.flatMap((c) => c.student_emails || []));
    const pending = all.reduce((t, x) => t + x.subs.filter((s) => !isGraded(s)).length, 0);
    const open = all.filter((x) => !x.a.deadline_ts || x.a.deadline_ts > now).length;
    const scores = all.flatMap((x) => x.subs.map(effScore)).filter((v) => v !== null);
    mount(kpis,
      kpi({ label: 'Lớp đang dạy', value: String(classes.length), hint: `${students.size} học sinh (không trùng lặp)`, tone: 'blue', iconName: 'school' }),
      kpi({ label: 'Bài tập đã giao', value: String(all.length), hint: `${open} bài đang mở`, tone: 'ink', iconName: 'calendar' }),
      kpi({ label: 'Chờ chấm', value: String(pending), hint: pending ? 'Bài nộp chưa có điểm giáo viên' : 'Không còn bài chờ chấm', tone: pending ? 'amber' : 'green', iconName: 'edit' }),
      kpi({ label: 'Điểm trung bình', value: scores.length ? scoreText(avg(scores)) : '—', hint: scores.length ? `Từ ${scores.length} bài nộp` : 'Chưa có bài nộp', tone: 'green', iconName: 'gauge' }));
    const upcoming = all.filter((x) => x.a.deadline_ts && x.a.deadline_ts > now && x.a.deadline_ts < now + 14 * DAY).sort((x, y) => x.a.deadline_ts - y.a.deadline_ts).slice(0, 6);
    const queue = classes.map((c) => ({ c, n: all.filter((x) => x.code === (c.code || c.id)).reduce((t, x) => t + x.subs.filter((s) => !isGraded(s)).length, 0) })).filter((x) => x.n).sort((a, b) => b.n - a.n);
    mount(aside,
      panel({ title: 'Hạn nộp sắp tới', sub: '14 ngày tới, tất cả các lớp', body: upcoming.length ? h('ul', { class: 'cr-mini-list' }, upcoming.map((x) => h('li', null,
        h('a', { href: `#/classroom/${x.code}?tab=assignments&a=${encodeURIComponent(x.a.id)}`, class: 'cr-mini-item' },
          h('span', { class: 'cr-mini-item__date' }, h('strong', null, String(new Date(x.a.deadline_ts).getDate())), h('span', null, `Th${new Date(x.a.deadline_ts).getMonth() + 1}`)),
          h('span', { class: 'grow' }, h('strong', { class: 'truncate' }, x.a.title), h('span', { class: 'truncate' }, `${x.c.name} · ${x.subs.length}/${(x.c.student_emails || []).length} đã nộp`),
            h('span', { class: `cr-mini-item__due ${x.a.deadline_ts - now < 2 * DAY ? 'is-soon' : ''}` }, icon('clock'), deadlineText(x.a.deadline_ts, now))))))) : h('p', { class: 'cr-muted-note' }, 'Không có hạn nộp nào trong 14 ngày tới.') }),
      panel({ title: 'Hàng chờ chấm', sub: 'Bài nộp chưa có điểm giáo viên', body: queue.length ? h('ul', { class: 'cr-mini-list' }, queue.map((x) => h('li', null,
        h('a', { href: `#/classroom/${x.c.code || x.c.id}?tab=grading`, class: 'cr-mini-item' }, classMark(x.c.code || x.c.id, x.c.name), h('span', { class: 'grow' }, h('strong', { class: 'truncate' }, x.c.name), h('span', null, `${x.n} bài chờ chấm`)), icon('chevron-right'))))) : h('p', { class: 'cr-muted-note' }, icon('check-circle'), ' Bạn đã chấm hết bài nộp.') }));
  } else {
    const items = all.map((x) => ({ ...x, sub: x.subs[0], status: studentStatus(x.a, x.subs[0], now) }));
    const todo = items.filter((x) => x.status === 'todo');
    const soon = todo.filter((x) => x.a.deadline_ts && x.a.deadline_ts - now < 2 * DAY);
    const overdue = items.filter((x) => x.status === 'overdue');
    const scores = items.map((x) => effScore(x.sub)).filter((v) => v !== null);
    mount(kpis,
      kpi({ label: 'Cần làm', value: String(todo.length), hint: todo.length ? 'Bài chưa nộp, còn hạn' : 'Em đã nộp hết bài đang mở', tone: 'blue', iconName: 'code' }),
      kpi({ label: 'Sắp đến hạn', value: String(soon.length), hint: 'Trong 48 giờ tới', tone: soon.length ? 'amber' : 'ink', iconName: 'clock' }),
      kpi({ label: 'Quá hạn', value: String(overdue.length), hint: overdue.length ? 'Đã hết hạn mà chưa nộp' : 'Không có bài quá hạn', tone: overdue.length ? 'red' : 'green', iconName: 'alert' }),
      kpi({ label: 'Điểm trung bình', value: scores.length ? scoreText(avg(scores)) : '—', hint: scores.length ? `${items.filter((x) => x.status === 'graded').length} bài đã chấm` : 'Chưa có điểm', tone: 'green', iconName: 'gauge' }));
    const list = [...overdue.filter((x) => now - x.a.deadline_ts < 14 * DAY), ...todo.sort((x, y) => (x.a.deadline_ts || Infinity) - (y.a.deadline_ts || Infinity))].slice(0, 7);
    const feedback = items.filter((x) => x.status === 'graded').sort((x, y) => (y.sub.graded_at || 0) - (x.sub.graded_at || 0)).slice(0, 4);
    mount(aside,
      panel({ title: 'Việc cần làm', sub: 'Sắp xếp theo hạn nộp', body: list.length ? h('ul', { class: 'cr-mini-list' }, list.map((x) => h('li', null,
        h('a', { href: `#/classroom/${x.code}?tab=assignments&a=${encodeURIComponent(x.a.id)}`, class: 'cr-mini-item' },
          h('span', { class: `cr-mini-item__dot st-${x.status === 'overdue' ? 'overdue' : x.a.deadline_ts && x.a.deadline_ts - now < 2 * DAY ? 'soon' : 'todo'}` }),
          h('span', { class: 'grow' }, h('strong', { class: 'truncate' }, x.a.title), h('span', { class: 'truncate' }, `${x.c.name} · ${langLabel(x.a.language)}`),
            h('span', { class: `cr-mini-item__due ${x.status === 'overdue' ? 'is-overdue' : x.a.deadline_ts && x.a.deadline_ts - now < 2 * DAY ? 'is-soon' : ''}` }, icon('clock'), x.status === 'overdue' ? `Quá hạn · ${deadlineText(x.a.deadline_ts, now)}` : deadlineText(x.a.deadline_ts, now))))))) : h('p', { class: 'cr-muted-note' }, icon('check-circle'), ' Không có bài nào cần làm. Tuyệt vời!') }),
      feedback.length ? panel({ title: 'Nhận xét mới', body: h('ul', { class: 'cr-mini-list' }, feedback.map((x) => h('li', null,
        h('a', { href: `#/classroom/${x.code}?tab=gradebook`, class: 'cr-mini-item' },
          h('span', { class: `cr-score-badge band-${scoreBandOf(x.sub)}` }, scoreText(x.sub.teacher_score)),
          h('span', { class: 'grow' }, h('strong', { class: 'truncate' }, x.a.title), h('span', { class: 'truncate' }, x.sub.teacher_note || 'Không có nhận xét')))))) }) : null);
  }
}

function scoreBandOf(sub) { const v = effScore(sub); return v >= 8 ? 'high' : v >= 6.5 ? 'good' : v >= 5 ? 'mid' : 'low'; }

function classCard(c, sum, isTeacher, user) {
  const code = c.code || c.id;
  const roster = rosterOf(c);
  const now = Date.now();
  let stats = null;
  if (sum) {
    const asg = sum.assignments;
    if (isTeacher) {
      const pending = sum.submissions.filter((s) => !isGraded(s)).length;
      const rate = asg.length && roster.length ? Math.round((sum.submissions.filter((s) => roster.some((r) => r.email === s.email)).length / (asg.length * roster.length)) * 100) : null;
      stats = h('div', { class: 'cr-class-card__stats' },
        h('div', null, h('strong', null, String(asg.length)), h('span', null, 'bài tập')),
        h('div', null, h('strong', null, rate === null ? '—' : `${Math.min(100, rate)}%`), h('span', null, 'tỉ lệ nộp')),
        h('div', { class: pending ? 'is-warn' : '' }, h('strong', null, String(pending)), h('span', null, 'chờ chấm')));
    } else {
      const done = asg.filter((a) => sum.submissions.some((s) => s.assignment_id === a.id)).length;
      const next = asg.filter((a) => a.deadline_ts && a.deadline_ts > now && !sum.submissions.some((s) => s.assignment_id === a.id)).sort((a, b) => a.deadline_ts - b.deadline_ts)[0];
      const scores = sum.submissions.map(effScore).filter((v) => v !== null);
      stats = h('div', { class: 'cr-class-card__progress' },
        h('div', { class: 'cr-class-card__row' }, h('span', null, `Đã nộp ${done}/${asg.length} bài`), h('strong', null, scores.length ? `ĐTB ${scoreText(round1(avg(scores)))}` : '')),
        progressBar(done, asg.length || 0, { tone: 'green' }),
        h('div', { class: 'cr-class-card__next' }, next ? [icon('clock'), h('span', { class: 'truncate' }, `${next.title} · ${deadlineText(next.deadline_ts, now)}`)] : [icon('check'), h('span', null, asg.length ? 'Không có bài sắp đến hạn' : 'Chưa có bài tập')]));
    }
  } else {
    stats = h('div', { class: 'cr-class-card__stats is-loading' }, h('div', { class: 'skeleton', style: 'height:30px' }));
  }
  const legacy = Array.isArray(c.assignments) || Array.isArray(c.submissions);
  return h('a', { class: 'cr-class-card', href: `#/classroom/${code}` },
    h('div', { class: 'cr-class-card__banner' }, banner(code),
      h('span', { class: 'cr-class-card__code' }, code),
      legacy ? h('span', { class: 'cr-class-card__legacy' }, 'Dữ liệu cũ') : null),
    h('div', { class: 'cr-class-card__body' },
      h('h3', { class: 'cr-class-card__title' }, c.name),
      h('p', { class: 'cr-class-card__sub' }, c.grade_subject || c.description || (isTeacher ? 'Chưa có mô tả' : `GV: ${c.teacher_name || c.teacher_email}`)),
      h('div', { class: 'cr-class-card__meta' },
        h('span', null, icon('users'), `${roster.length} học sinh`),
        !isTeacher ? h('span', { class: 'truncate' }, icon('user'), c.teacher_name || c.teacher_email) : null,
        isTeacher && c.teacher_email !== user.key ? h('span', null, icon('shield'), 'Quản trị') : null),
      stats));
}
