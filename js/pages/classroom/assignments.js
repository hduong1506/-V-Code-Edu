// V-Code Edu — classroom assignments: teacher list / detail / grading queue / editor / grading view,
// student list with statuses and the solve view (workbench + auto-grading + submission).
import { h, mount, raw } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { toast, openModal, confirmDialog } from '../../core/ui.js';
import { markdown, enhanceMarkdown } from '../../components/markdown.js';
import { highlight } from '../../components/highlight.js';
import { createWorkbench } from '../../components/ide.js';
import { gradeCode } from '../../runtime/runner.js';
import { formatDateTime, formatDate, combineDateTime, splitDateTime } from '../../core/format.js';
import * as C from '../../services/classroom.js';
import {
  LANG_OPTIONS, langLabel, errMsg, DAY, effScore, isGraded, avg, pct, round1, scoreText, scoreBand,
  studentStatus, statusPill, deadlineChip, deadlineState, sectionHead, kpi, panel, donut, histogram, emptyBlock,
  avatar, progressBar, chipFilter, searchBox, sortableTable,
} from './util.js';

function prose(md) {
  const el = h('div', { class: 'prose cr-prose' });
  el.innerHTML = markdown(md || '');
  try { enhanceMarkdown(el); } catch { /* optional */ }
  return el;
}
const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// ===========================================================================
export function assignmentsSection(S) {
  if (S.isTeacher && S.ui.assignmentId) {
    if (!S.assignments.some((a) => a.id === S.ui.assignmentId) && S.loaded.assignments && S.ui.pendingAssignment !== S.ui.assignmentId) S.ui.assignmentId = null;
    else return teacherDetail(S);
  }
  if (S.isTeacher) return teacherList(S);
  return studentList(S);
}

// ---------------------------------------------------------------------------
// Teacher: list + grading queue
function teacherList(S) {
  const content = h('div', { class: 'cr-asg-content' });
  const tabsHost = h('div');
  const filterHost = h('div', { class: 'cr-toolbar__filters' });
  const el = h('div', { class: 'cr-sec' },
    sectionHead({ title: 'Bài tập', sub: 'Giao bài có bộ test, theo dõi bài nộp và chấm điểm.', actions: h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openAssignmentEditor(S, null) }, icon('plus'), 'Giao bài mới') }),
    h('div', { class: 'cr-toolbar' }, tabsHost, h('div', { class: 'grow' }), searchBox('Tìm bài tập…', S.ui.search.asg, (v) => { S.ui.search.asg = v; renderContent(); })),
    filterHost, content);

  function pendingSubs() {
    const emails = new Set(S.roster().map((r) => r.email));
    return S.submissions.filter((s) => !isGraded(s) && emails.has(s.email) && S.assignments.some((a) => a.id === s.assignment_id));
  }

  function renderTabs() {
    const n = pendingSubs().length;
    mount(tabsHost, h('div', { class: 'segmented cr-seg', role: 'tablist' },
      h('button', { type: 'button', role: 'tab', 'aria-pressed': String(S.ui.view !== 'queue'), onClick: () => { S.ui.view = 'list'; S.go('assignments', { view: 'list', noScroll: true }); } }, icon('list'), 'Danh sách', h('span', { class: 'cr-seg__n' }, String(S.assignments.length))),
      h('button', { type: 'button', role: 'tab', 'aria-pressed': String(S.ui.view === 'queue'), onClick: () => { S.go('assignments', { view: 'queue', noScroll: true }); } }, icon('edit'), 'Chờ chấm', n ? h('span', { class: 'cr-seg__n is-warn' }, String(n)) : null)));
  }

  function renderContent() {
    renderTabs();
    if (S.ui.view === 'queue') { mount(filterHost); mount(content, gradingQueue(S, pendingSubs())); return; }
    const now = Date.now();
    const f = S.ui.filters.asg || 'all';
    const q = norm(S.ui.search.asg);
    const counts = { all: S.assignments.length, open: 0, soon: 0, closed: 0, none: 0 };
    S.assignments.forEach((a) => { counts[deadlineState(a, now)]++; });
    counts.open += counts.soon;
    mount(filterHost, chipFilter([['all', 'Tất cả', counts.all], ['open', 'Đang mở', counts.open], ['soon', 'Sắp hết hạn', counts.soon], ['closed', 'Đã hết hạn', counts.closed], ['none', 'Không hạn', counts.none]], f, (v) => { S.ui.filters.asg = v; renderContent(); }));
    const list = S.assignments.filter((a) => {
      const st = deadlineState(a, now);
      if (f === 'open' && !(st === 'open' || st === 'soon')) return false;
      if (f !== 'all' && f !== 'open' && st !== f) return false;
      return !q || norm(a.title).includes(q);
    });
    if (!S.assignments.length) {
      mount(content, emptyBlock({ art: 'assignments', title: 'Chưa có bài tập', text: 'Giao bài đầu tiên cho lớp: đề bài, mã khởi tạo, bộ test (có thể ẩn) và hạn nộp. Học sinh nhận bài ngay lập tức.', action: h('button', { class: 'btn btn--primary', type: 'button', onClick: () => openAssignmentEditor(S, null) }, icon('plus'), 'Giao bài mới') }));
      return;
    }
    if (!list.length) { mount(content, h('div', { class: 'cr-ok-note is-muted' }, icon('search'), 'Không có bài tập phù hợp bộ lọc.')); return; }
    const roster = S.roster();
    const emails = new Set(roster.map((r) => r.email));
    mount(content, h('div', { class: 'cr-asg-list' }, list.map((a) => {
      const subs = S.subsFor(a.id).filter((s) => emails.has(s.email));
      const pend = subs.filter((s) => !isGraded(s)).length;
      const sc = subs.map(effScore).filter((v) => v !== null);
      const st = deadlineState(a, now);
      const hidden = (a.test_cases || []).filter((t) => t.hidden).length;
      return h('article', { class: `cr-asg st-${st}`, tabindex: '0', onClick: (e) => { if (!e.target.closest('button')) S.go('assignments', { assignmentId: a.id }); }, onKeydown: (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) S.go('assignments', { assignmentId: a.id }); } },
        h('span', { class: 'cr-asg__icon' }, icon('code')),
        h('div', { class: 'cr-asg__main' },
          h('h3', { class: 'cr-asg__title' }, a.title),
          h('div', { class: 'cr-asg__meta' }, deadlineChip(a, now), h('span', { class: 'cr-tag' }, langLabel(a.language)), h('span', { class: 'cr-tag' }, `${(a.test_cases || []).length} test${hidden ? ` · ${hidden} ẩn` : ''}`), a.legacy ? h('span', { class: 'cr-tag tone-amber' }, 'Dữ liệu cũ') : null)),
        h('div', { class: 'cr-asg__progress' },
          h('div', { class: 'cr-asg__progress-row' }, h('span', null, 'Đã nộp'), h('strong', null, `${subs.length}/${roster.length}`)),
          progressBar(subs.length, roster.length, { tone: pct(subs.length, roster.length) >= 80 ? 'green' : 'blue' })),
        h('div', { class: 'cr-asg__stats' },
          h('div', null, h('span', null, 'Điểm TB'), h('strong', null, sc.length ? scoreText(round1(avg(sc))) : '—')),
          h('div', { class: pend ? 'is-warn' : '' }, h('span', null, 'Chờ chấm'), h('strong', null, String(pend)))),
        h('div', { class: 'cr-asg__actions' },
          h('button', { class: 'btn btn--soft btn--sm', type: 'button', onClick: () => S.go('assignments', { assignmentId: a.id }) }, icon('check'), 'Chấm'),
          h('button', { class: 'btn btn--ghost btn--sm btn--icon', type: 'button', 'aria-label': 'Sửa bài tập', title: 'Sửa', onClick: () => openAssignmentEditor(S, a) }, icon('edit')),
          h('button', { class: 'btn btn--ghost btn--sm btn--icon', type: 'button', 'aria-label': 'Nhân bản bài tập', title: 'Nhân bản', onClick: () => duplicate(S, a) }, icon('copy')),
          h('button', { class: 'btn btn--ghost btn--sm btn--icon cr-danger-ghost', type: 'button', 'aria-label': 'Xóa bài tập', title: 'Xóa', onClick: () => removeAssignment(S, a) }, icon('trash'))));
    })));
  }
  renderContent();
  return { el, update: renderContent };
}

function gradingQueue(S, pending) {
  if (!pending.length) return emptyBlock({ art: 'inbox', title: 'Không còn bài chờ chấm', text: 'Bài nộp mới của học sinh sẽ xuất hiện ở đây theo thời gian thực. Điểm tự động đã được ghi nhận ngay khi nộp.' });
  const rows = pending.slice().sort((a, b) => (a.submitted_at || 0) - (b.submitted_at || 0));
  const aOf = (s) => S.assignments.find((a) => a.id === s.assignment_id);
  const order = rows.map((r) => r.id);
  return h('div', { class: 'stack' },
    h('div', { class: 'cr-callout tone-amber' }, icon('edit'), h('div', { class: 'grow' }, h('strong', null, `${rows.length} bài nộp chờ chấm. `), 'Bài nộp sớm nhất ở trên cùng.'),
      h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => openGrade(S, rows[0], { order }) }, icon('play'), 'Chấm lần lượt')),
    sortableTable({
      caption: 'Hàng chờ chấm',
      rows,
      initial: S.ui.sorts.queue || { key: 'time', dir: 1 },
      rowKey: (s) => s.id,
      onRowClick: (s) => openGrade(S, s, { order }),
      columns: [
        { key: 'name', label: 'Học sinh', sort: (s) => s.full_name || s.email, render: (s) => h('div', { class: 'cr-cell-user' }, avatar(s.full_name || s.email, s.email, { size: 30 }), h('div', null, h('strong', null, s.full_name || s.email), h('span', null, s.email))) },
        { key: 'asg', label: 'Bài tập', sort: (s) => aOf(s)?.title || '', render: (s) => h('span', { class: 'cr-cell-strong' }, aOf(s)?.title || s.assignment_id) },
        { key: 'auto', label: 'Tự động', align: 'right', sort: (s) => s.score, render: (s) => autoCell(s) },
        { key: 'time', label: 'Nộp lúc', sort: (s) => s.submitted_at, render: (s) => submittedCell(s, aOf(s)) },
        { key: 'act', label: '', align: 'right', render: (s) => h('button', { class: 'btn btn--soft btn--sm', type: 'button', onClick: () => openGrade(S, s, { order }) }, icon('edit'), 'Chấm') },
      ],
    }));
}

function autoCell(s) {
  return h('span', { class: 'cr-auto' }, h('strong', null, `${scoreText(s.score)}`), h('span', null, `${s.passed ?? 0}/${s.total ?? 0} test`));
}
function submittedCell(s, a) {
  const late = a?.deadline_ts && s.submitted_at > a.deadline_ts;
  return h('span', { class: 'cr-when' }, h('span', null, formatDateTime(s.submitted_at)), late ? h('span', { class: 'cr-tag tone-red' }, 'Nộp trễ') : null);
}
function teacherScoreCell(s) {
  if (!s) return h('span', { class: 'muted' }, '—');
  return isGraded(s) ? h('span', { class: `cr-score-badge band-${scoreBand(s.teacher_score)}` }, scoreText(s.teacher_score)) : h('span', { class: 'cr-tag tone-amber' }, 'Chưa chấm');
}

async function duplicate(S, a) {
  try {
    const deadline = a.deadline_ts && a.deadline_ts < Date.now() ? Date.now() + 7 * DAY : a.deadline_ts;
    const copy = await C.duplicateAssignment(S.code, a, { deadline_ts: deadline });
    toast(`Đã nhân bản thành “${copy.title}”.`, { type: 'success', action: { label: 'Sửa', onClick: () => openAssignmentEditor(S, copy) } });
  } catch (err) { toast(errMsg(err), { type: 'error' }); }
}

async function removeAssignment(S, a) {
  const n = S.subsFor(a.id).length;
  if (!(await confirmDialog({ title: 'Xóa bài tập?', message: `“${a.title}”${n ? ` và ${n} bài nộp của học sinh` : ''} sẽ bị xóa vĩnh viễn.`, confirmLabel: 'Xóa bài tập', danger: true }))) return;
  try {
    await C.deleteAssignment(S.code, a.id);
    toast('Đã xóa bài tập.');
    if (S.ui.assignmentId === a.id) S.go('assignments');
  } catch (err) { toast(errMsg(err), { type: 'error' }); }
}

// ---------------------------------------------------------------------------
// Teacher: assignment detail
function teacherDetail(S) {
  const el = h('div', { class: 'cr-sec cr-asg-detail' });
  let showBrief = false;
  function update() {
    const a = S.assignments.find((x) => x.id === S.ui.assignmentId);
    if (!a) {
      if (S.loaded.assignments && S.ui.pendingAssignment !== S.ui.assignmentId) { setTimeout(() => S.go('assignments', { noScroll: true }), 0); return; } // deleted meanwhile
      mount(el, h('div', { class: 'cr-skel' }, h('div', { class: 'skeleton', style: 'height:220px;border-radius:14px' })));
      return;
    }
    if (S.ui.pendingAssignment === a.id) S.ui.pendingAssignment = null;
    const now = Date.now();
    const roster = S.roster();
    const emails = new Set(roster.map((r) => r.email));
    const subs = S.subsFor(a.id);
    const inRoster = subs.filter((s) => emails.has(s.email));
    const graded = inRoster.filter(isGraded).length;
    const late = inRoster.filter((s) => a.deadline_ts && s.submitted_at > a.deadline_ts).length;
    const scores = inRoster.map(effScore).filter((v) => v !== null);
    const closed = a.deadline_ts && now > a.deadline_ts;
    const missing = roster.length - inRoster.length;
    const rows = [
      ...roster.map((r) => ({ r, s: subs.find((x) => x.email === r.email) || null, former: false })),
      ...subs.filter((s) => !emails.has(s.email)).map((s) => ({ r: { email: s.email, full_name: s.full_name || s.email }, s, former: true })),
    ];
    const order = rows.filter((x) => x.s).sort((x, y) => (x.r.full_name || '').localeCompare(y.r.full_name || '', 'vi')).map((x) => x.s.id);
    const rowStatus = (x) => (x.s ? (isGraded(x.s) ? 'graded' : 'submitted') : closed ? 'overdue' : 'todo');
    const hidden = (a.test_cases || []).filter((t) => t.hidden).length;

    mount(el,
      sectionHead({
        back: { label: 'Tất cả bài tập', onClick: () => S.go('assignments') },
        title: a.title,
        sub: h('span', { class: 'cr-detail-meta' }, deadlineChip(a, now), h('span', { class: 'cr-tag' }, langLabel(a.language)), h('span', { class: 'cr-tag' }, `${(a.test_cases || []).length} test${hidden ? ` · ${hidden} ẩn` : ''}`), a.deadline_ts ? h('span', { class: 'muted' }, `Hạn ${formatDateTime(a.deadline_ts)}`) : null),
        actions: [
          h('button', { class: 'btn', type: 'button', onClick: () => openAssignmentEditor(S, a) }, icon('edit'), 'Sửa'),
          h('button', { class: 'btn btn--ghost btn--icon', type: 'button', title: 'Nhân bản', 'aria-label': 'Nhân bản', onClick: () => duplicate(S, a) }, icon('copy')),
          h('button', { class: 'btn btn--ghost btn--icon cr-danger-ghost', type: 'button', title: 'Xóa', 'aria-label': 'Xóa bài tập', onClick: () => removeAssignment(S, a) }, icon('trash')),
        ],
      }),
      h('div', { class: 'cr-kpis' },
        kpi({ label: 'Đã nộp', value: `${inRoster.length}/${roster.length}`, hint: roster.length ? `${pct(inRoster.length, roster.length)}% học sinh` : 'Lớp chưa có học sinh', tone: 'blue', iconName: 'upload' }),
        kpi({ label: 'Chờ chấm', value: String(inRoster.length - graded), hint: `${graded} bài đã chấm`, tone: inRoster.length - graded ? 'amber' : 'green', iconName: 'edit' }),
        kpi({ label: 'Điểm trung bình', value: scores.length ? scoreText(round1(avg(scores))) : '—', hint: scores.length ? `Cao nhất ${scoreText(Math.max(...scores))} · thấp nhất ${scoreText(Math.min(...scores))}` : 'Chưa có bài nộp', tone: 'green', iconName: 'gauge' }),
        kpi({ label: closed ? 'Thiếu bài' : 'Chưa nộp', value: String(missing), hint: late ? `${late} bài nộp trễ` : closed ? 'Đã hết hạn nộp' : deadlineChip(a, now).textContent, tone: closed && missing ? 'red' : 'ink', iconName: closed ? 'alert' : 'clock' })),
      h('div', { class: 'cr-grid-2' },
        panel({ title: 'Tình trạng nộp bài', body: roster.length ? donut([
          { label: 'Đã chấm', value: graded, tone: 'green' },
          { label: 'Chờ chấm', value: inRoster.length - graded, tone: 'blue' },
          { label: closed ? 'Thiếu (quá hạn)' : 'Chưa nộp', value: missing, tone: closed ? 'red' : 'gray' },
        ], { centerValue: `${pct(inRoster.length, roster.length)}%`, centerLabel: 'đã nộp' }) : emptyBlock({ art: 'students', title: 'Chưa có học sinh', compact: true }) }),
        panel({ title: 'Phân bố điểm', body: scores.length ? h('div', { class: 'cr-hist-wrap' }, histogram(scores)) : emptyBlock({ art: 'grades', title: 'Chưa có điểm', text: 'Biểu đồ hiển thị khi có bài nộp.', compact: true }) })),
      panel({
        title: 'Bài làm của học sinh', sub: `${rows.length} học sinh`,
        actions: order.length ? h('button', { class: 'btn btn--primary btn--sm', type: 'button', onClick: () => { const firstPending = rows.find((x) => x.s && !isGraded(x.s)); openGrade(S, (firstPending || rows.find((x) => x.s)).s, { order }); } }, icon('play'), 'Chấm lần lượt') : null,
        className: 'cr-panel--flush',
        body: rows.length ? sortableTable({
          caption: `Bài làm cho ${a.title}`,
          rows,
          initial: S.ui.sorts.detail || { key: 'status', dir: 1 },
          rowKey: (x) => x.r.email,
          onRowClick: (x) => { if (x.s) openGrade(S, x.s, { order }); },
          rowClass: (x) => (x.s ? '' : 'is-dim'),
          columns: [
            { key: 'name', label: 'Học sinh', sort: (x) => x.r.full_name, render: (x) => h('div', { class: 'cr-cell-user' }, avatar(x.r.full_name, x.r.email, { size: 30 }), h('div', null, h('strong', null, x.r.full_name), h('span', null, x.former ? 'Đã rời lớp' : x.r.email))) },
            { key: 'status', label: 'Trạng thái', sort: (x) => ({ submitted: 0, overdue: 1, todo: 2, graded: 3 })[rowStatus(x)], render: (x) => statusPill(rowStatus(x)) },
            { key: 'auto', label: 'Tự động', align: 'right', sort: (x) => x.s?.score ?? null, render: (x) => (x.s ? autoCell(x.s) : h('span', { class: 'muted' }, '—')) },
            { key: 'teacher', label: 'Điểm GV', align: 'right', sort: (x) => x.s?.teacher_score ?? null, render: (x) => teacherScoreCell(x.s) },
            { key: 'time', label: 'Nộp lúc', sort: (x) => x.s?.submitted_at ?? null, render: (x) => (x.s ? submittedCell(x.s, a) : h('span', { class: 'muted' }, '—')) },
            { key: 'act', label: '', align: 'right', render: (x) => (x.s ? h('button', { class: `btn btn--sm ${isGraded(x.s) ? 'btn--ghost' : 'btn--soft'}`, type: 'button', onClick: () => openGrade(S, x.s, { order }) }, icon(isGraded(x.s) ? 'eye' : 'edit'), isGraded(x.s) ? 'Xem lại' : 'Chấm') : null) },
          ],
        }) : emptyBlock({ art: 'students', title: 'Lớp chưa có học sinh', compact: true }),
      }),
      h('details', { class: 'cr-brief', open: showBrief || undefined, onToggle: (e) => { showBrief = e.currentTarget.open; } },
        h('summary', null, icon('file'), 'Đề bài & bộ test', h('span', { class: 'muted' }, `Tạo ${formatDate(a.created_at)}`)),
        h('div', { class: 'cr-brief__body' },
          prose(a.description || '_Không có mô tả._'),
          testList(a.test_cases || [], { showHidden: true }),
          a.starter_code ? h('div', { class: 'code-block' }, h('div', { class: 'code-block__head' }, h('span', null, 'Mã khởi tạo')), h('pre', null, h('code', null, raw(highlight(a.starter_code, a.language))))) : null)));
  }
  update();
  return { el, update };
}

function testList(tests, { showHidden = false } = {}) {
  const shown = showHidden ? tests : tests.filter((t) => !t.hidden);
  const hiddenN = tests.length - shown.length;
  if (!tests.length) return null;
  return h('div', { class: 'cr-tests' },
    h('div', { class: 'cr-tests__head' }, h('strong', null, showHidden ? `Bộ test (${tests.length})` : 'Ví dụ'), hiddenN ? h('span', { class: 'muted' }, `+ ${hiddenN} test ẩn`) : null),
    shown.map((t, i) => h('div', { class: 'cr-test' },
      h('div', { class: 'cr-test__n' }, `#${i + 1}`, t.hidden ? h('span', { class: 'cr-tag' }, icon('eye-off'), 'Ẩn') : null),
      h('div', { class: 'cr-test__io' },
        h('div', null, h('span', null, 'Dữ liệu vào'), h('pre', null, t.input || '(trống)')),
        h('div', null, h('span', null, 'Kết quả mong đợi'), h('pre', null, t.expected))))));
}

// ---------------------------------------------------------------------------
// Grading view (modal)
export function openGrade(S, sub, { order = [] } = {}) {
  let current = sub;
  const body = h('div', { class: 'cr-grade' });
  const m = openModal({ title: 'Chấm bài', size: 'xl', className: 'cr-modal cr-grade-modal', content: body });
  const titleEl = m.el.querySelector('.modal__title');

  function render() {
    const s = S.submissions.find((x) => x.id === current.id) || current;
    const a = S.assignments.find((x) => x.id === s.assignment_id);
    const lang = a?.language || 'python';
    const idx = order.indexOf(s.id);
    const prevId = idx > 0 ? order[idx - 1] : null;
    const nextId = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : null;
    const late = a?.deadline_ts && s.submitted_at > a.deadline_ts;
    titleEl.textContent = `Chấm bài · ${s.full_name || s.email}`;

    const lines = String(s.code || '').split('\n').length;
    const codeView = h('div', { class: 'cr-codeview' },
      h('div', { class: 'cr-codeview__gutter', 'aria-hidden': 'true' }, Array.from({ length: lines }, (_, i) => h('span', null, String(i + 1)))),
      h('pre', { class: 'cr-codeview__pre' }, h('code', null, raw(highlight(s.code || '', lang)))));
    const rerunBox = h('div', { class: 'cr-rerun' });
    const rerunBtn = a?.test_cases?.length ? h('button', { class: 'btn btn--soft btn--sm', type: 'button', onClick: async () => {
      rerunBtn.classList.add('is-loading');
      mount(rerunBox, h('div', { class: 'cr-rerun__loading' }, h('div', { class: 'spinner' }), 'Đang chạy lại bộ test…'));
      try {
        const r = await gradeCode({ lang, code: s.code || '', tests: a.test_cases, onProgress: (i, n) => mount(rerunBox, h('div', { class: 'cr-rerun__loading' }, h('div', { class: 'spinner' }), `Đang chạy test ${i + 1}/${n}…`)) });
        mount(rerunBox, rerunResult(r));
      } catch (err) { mount(rerunBox, h('div', { class: 'cr-callout tone-red' }, icon('alert'), errMsg(err))); }
      rerunBtn.classList.remove('is-loading');
    } }, icon('play'), 'Chạy lại test') : null;

    const initial = s.teacher_score ?? s.score ?? 0;
    const scoreIn = h('input', { class: 'input cr-score-input', type: 'number', min: 0, max: 10, step: 0.25, value: initial, 'aria-label': 'Điểm giáo viên (thang 10)' });
    const range = h('input', { class: 'cr-range', type: 'range', min: 0, max: 10, step: 0.25, value: initial, 'aria-label': 'Kéo để chọn điểm' });
    const bandEl = h('span', { class: 'cr-score-preview' });
    const syncBand = () => { const v = Number(scoreIn.value); bandEl.className = `cr-score-preview band-${scoreBand(Number.isNaN(v) ? null : v)}`; bandEl.textContent = Number.isNaN(v) ? '—' : `${scoreText(v)}/10`; range.style.setProperty('--fill', `${Math.max(0, Math.min(100, v * 10))}%`); };
    scoreIn.addEventListener('input', () => { range.value = scoreIn.value; syncBand(); });
    range.addEventListener('input', () => { scoreIn.value = range.value; syncBand(); });
    syncBand();
    const note = h('textarea', { class: 'textarea cr-note', maxlength: 2000, placeholder: 'Nhận xét cho học sinh: điểm tốt, chỗ cần sửa, gợi ý cải thiện…', 'aria-label': 'Nhận xét' });
    note.value = s.teacher_note || '';
    const quick = ['Làm tốt lắm! 👏', 'Cần xử lý thêm các trường hợp đặc biệt.', 'Đặt tên biến rõ nghĩa hơn.', 'Hãy thêm chú thích cho các bước chính.', 'Kiểm tra lại định dạng kết quả in ra.'];
    const passRatio = s.total ? s.passed / s.total : 0;

    const save = async (goNext) => {
      const v = Number(scoreIn.value);
      if (Number.isNaN(v) || v < 0 || v > 10) { toast('Điểm phải từ 0 đến 10.', { type: 'warning' }); scoreIn.focus(); return; }
      const btn = goNext ? saveNextBtn : saveBtn;
      btn.classList.add('is-loading');
      try {
        await C.gradeSubmission(S.code, s.id, { teacher_score: v, teacher_note: note.value });
        toast(`Đã lưu điểm ${scoreText(v)} cho ${s.full_name || s.email}.`, { type: 'success', duration: 2200 });
        if (goNext && nextId) { current = S.submissions.find((x) => x.id === nextId) || { id: nextId }; render(); } else m.close();
      } catch (err) { toast(errMsg(err), { type: 'error' }); } finally { btn.classList.remove('is-loading'); }
    };
    const saveBtn = h('button', { class: `btn ${nextId ? '' : 'btn--primary'}`, type: 'button', onClick: () => save(false) }, icon('check'), 'Lưu điểm');
    const saveNextBtn = nextId ? h('button', { class: 'btn btn--primary', type: 'button', onClick: () => save(true) }, 'Lưu & bài tiếp', icon('arrow-right')) : null;

    mount(body,
      h('div', { class: 'cr-grade__code' },
        h('div', { class: 'cr-grade__codehead' },
          h('div', { class: 'grow' }, h('strong', null, a?.title || s.assignment_id), h('span', null, `${langLabel(lang)} · ${lines} dòng`)),
          rerunBtn),
        h('div', { class: 'cr-grade__codebody scroll-y' }, s.code ? codeView : h('div', { class: 'cr-ok-note is-muted' }, 'Bài nộp không có mã nguồn.')),
        rerunBox),
      h('aside', { class: 'cr-grade__side scroll-y' },
        h('div', { class: 'cr-grade__student' }, avatar(s.full_name || s.email, s.email, { size: 44 }),
          h('div', { class: 'grow' }, h('strong', null, s.full_name || s.email), h('span', null, s.email))),
        h('dl', { class: 'cr-grade__facts' },
          h('div', null, h('dt', null, 'Nộp lúc'), h('dd', null, formatDateTime(s.submitted_at), late ? h('span', { class: 'cr-tag tone-red' }, 'Nộp trễ') : null)),
          a?.deadline_ts ? h('div', null, h('dt', null, 'Hạn nộp'), h('dd', null, formatDateTime(a.deadline_ts))) : null,
          isGraded(s) ? h('div', null, h('dt', null, 'Đã chấm'), h('dd', null, formatDateTime(s.graded_at))) : null),
        h('div', { class: 'cr-autocard' },
          h('div', { class: 'cr-autocard__top' }, h('span', null, 'Chấm tự động'), h('strong', null, `${scoreText(s.score)}/10`)),
          h('div', { class: 'cr-testbar', 'aria-label': `Đạt ${s.passed}/${s.total} test` }, Array.from({ length: Math.min(20, s.total || 0) }, (_, i) => h('span', { class: i < (s.passed || 0) ? 'is-ok' : 'is-bad' }))),
          h('p', null, s.total ? `Đạt ${s.passed}/${s.total} test (${Math.round(passRatio * 100)}%)` : 'Không có test nào được chạy.')),
        h('div', { class: 'cr-grade__form' },
          h('label', { class: 'field__label', for: 'cr-grade-score' }, 'Điểm giáo viên'),
          h('div', { class: 'cr-score-row' }, scoreIn, bandEl),
          range,
          h('div', { class: 'cr-score-quick' },
            h('button', { type: 'button', class: 'cr-chip', onClick: () => { scoreIn.value = s.score ?? 0; range.value = scoreIn.value; syncBand(); } }, 'Theo điểm tự động'),
            [5, 7, 8, 9, 10].map((v) => h('button', { type: 'button', class: 'cr-chip', onClick: () => { scoreIn.value = v; range.value = v; syncBand(); } }, String(v)))),
          h('label', { class: 'field__label', style: 'margin-top:14px' }, 'Nhận xét'),
          note,
          h('div', { class: 'cr-score-quick' }, quick.map((q) => h('button', { type: 'button', class: 'cr-chip cr-chip--soft', onClick: () => { note.value = note.value ? `${note.value.trim()} ${q}` : q; note.focus(); } }, q)))),
        h('div', { class: 'cr-grade__foot' },
          order.length > 1 ? h('div', { class: 'cr-grade__nav' },
            h('button', { class: 'btn btn--ghost btn--sm btn--icon', type: 'button', disabled: !prevId, 'aria-label': 'Bài trước', onClick: () => { current = S.submissions.find((x) => x.id === prevId) || { id: prevId }; render(); } }, icon('chevron-left')),
            h('span', null, `${idx + 1}/${order.length}`),
            h('button', { class: 'btn btn--ghost btn--sm btn--icon', type: 'button', disabled: !nextId, 'aria-label': 'Bài sau', onClick: () => { current = S.submissions.find((x) => x.id === nextId) || { id: nextId }; render(); } }, icon('chevron-right'))) : h('span'),
          h('div', { class: 'cr-grade__save' }, saveBtn, saveNextBtn))));
    scoreIn.id = 'cr-grade-score';
  }
  render();
}

function rerunResult(r) {
  const ok = r.passed === r.total && r.total > 0;
  return h('div', { class: 'cr-rerun__result' },
    h('div', { class: `cr-callout ${ok ? 'tone-green' : 'tone-amber'}` }, icon(ok ? 'check-circle' : 'alert'), h('div', null, h('strong', null, `Chạy lại: đạt ${r.passed}/${r.total} test`), ` → ${scoreText(r.score10)}/10`)),
    h('ul', { class: 'cr-rerun__list' }, (r.results || []).map((t, i) => h('li', { class: t.ok ? 'is-ok' : 'is-bad' },
      icon(t.ok ? 'check' : 'x'), h('span', { class: 'grow' }, t.label || `Test ${i + 1}`, t.hidden ? ' (ẩn)' : ''),
      !t.ok && (t.actual !== undefined || t.error) ? h('code', { class: 'truncate', title: t.error || t.actual }, (t.error || t.actual || '(trống)').slice(0, 80)) : null))));
}

// ---------------------------------------------------------------------------
// Student list
function studentList(S) {
  const filterHost = h('div', { class: 'cr-toolbar__filters' });
  const content = h('div');
  const el = h('div', { class: 'cr-sec' },
    sectionHead({ title: 'Bài tập', sub: 'Làm bài ngay trên trình duyệt, nộp bài để được chấm tự động.' }),
    h('div', { class: 'cr-toolbar' }, filterHost, h('div', { class: 'grow' }), searchBox('Tìm bài tập…', S.ui.search.asg, (v) => { S.ui.search.asg = v; update(); })),
    content);
  let autoOpened = false;
  function update() {
    const now = Date.now();
    const items = S.assignments.map((a) => { const sub = S.submissions.find((x) => x.assignment_id === a.id); return { a, sub, status: studentStatus(a, sub, now) }; });
    const counts = { all: items.length, todo: 0, submitted: 0, graded: 0, overdue: 0 };
    items.forEach((x) => { counts[x.status]++; });
    const f = S.ui.filters.sasg || 'all';
    const q = norm(S.ui.search.asg);
    mount(filterHost, chipFilter([['all', 'Tất cả', counts.all], ['todo', 'Chưa làm', counts.todo], ['submitted', 'Đã nộp', counts.submitted], ['graded', 'Đã chấm', counts.graded], ['overdue', 'Quá hạn', counts.overdue]], f, (v) => { S.ui.filters.sasg = v; update(); }));
    const rank = { todo: 0, overdue: 1, submitted: 2, graded: 3 };
    const list = items.filter((x) => (f === 'all' || x.status === f) && (!q || norm(x.a.title).includes(q)))
      .sort((x, y) => rank[x.status] - rank[y.status] || (x.status === 'todo' ? (x.a.deadline_ts || Infinity) - (y.a.deadline_ts || Infinity) : (y.a.deadline_ts || 0) - (x.a.deadline_ts || 0)));
    if (!items.length) {
      mount(content, emptyBlock({ art: 'assignments', title: 'Chưa có bài tập', text: 'Khi thầy/cô giao bài, bài tập sẽ hiện ở đây ngay lập tức — kèm hạn nộp và bộ test chấm tự động.' }));
    } else if (!list.length) {
      mount(content, h('div', { class: 'cr-ok-note is-muted' }, icon('search'), 'Không có bài tập phù hợp bộ lọc.'));
    } else {
      mount(content, h('div', { class: 'cr-asg-list' }, list.map(({ a, sub, status }) => {
        const soon = status === 'todo' && a.deadline_ts && a.deadline_ts - now < 2 * DAY;
        const score = effScore(sub);
        const expired = a.deadline_ts && now > a.deadline_ts;
        return h('article', { class: `cr-asg is-student st-${soon ? 'soon' : status}`, tabindex: '0', onClick: (e) => { if (!e.target.closest('button')) openSolve(S, a); }, onKeydown: (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) openSolve(S, a); } },
          h('span', { class: 'cr-asg__icon' }, icon(status === 'graded' ? 'check-circle' : status === 'submitted' ? 'check' : status === 'overdue' ? 'alert' : 'code')),
          h('div', { class: 'cr-asg__main' },
            h('h3', { class: 'cr-asg__title' }, a.title),
            h('div', { class: 'cr-asg__meta' }, statusPill(soon ? 'soon' : status), deadlineChip(a, now), h('span', { class: 'cr-tag' }, langLabel(a.language)), h('span', { class: 'cr-tag' }, `${(a.test_cases || []).length} test`)),
            sub?.teacher_note ? h('p', { class: 'cr-asg__note' }, icon('message'), h('span', { class: 'truncate' }, `Nhận xét: ${sub.teacher_note}`)) : null),
          h('div', { class: 'cr-asg__score' }, score !== null
            ? [h('span', { class: `cr-score-badge band-${scoreBand(score)}` }, scoreText(score)), h('span', null, isGraded(sub) ? 'điểm GV' : 'tự động')]
            : h('span', { class: 'muted' }, '—')),
          h('div', { class: 'cr-asg__actions' }, h('button', { class: `btn btn--sm ${status === 'todo' ? 'btn--primary' : ''}`, type: 'button', onClick: () => openSolve(S, a) }, icon(expired ? 'eye' : 'code'), expired ? 'Xem' : sub ? 'Làm lại' : 'Làm bài')));
      })));
    }
    if (!autoOpened && S.ui.assignmentId) {
      const a = S.assignments.find((x) => x.id === S.ui.assignmentId);
      if (a) { autoOpened = true; setTimeout(() => openSolve(S, a), 60); }
    }
  }
  update();
  return { el, update };
}

// ---------------------------------------------------------------------------
// Student solve view (workbench)
export function openSolve(S, a) {
  if (S.isTeacher) { S.go('assignments', { assignmentId: a.id }); return; }
  const sub = S.submissions.find((x) => x.assignment_id === a.id);
  const expired = Boolean(a.deadline_ts && Date.now() > a.deadline_ts);
  const ac = new AbortController();
  S.solving = true;
  S.presenceBeat?.beat('coding', a.title);
  const statusBox = h('div', { class: 'cr-solve__status' });
  const renderStatus = (s, lastResult) => {
    const st = studentStatus(a, s);
    mount(statusBox,
      h('div', { class: 'cr-solve__chips' }, statusPill(st), deadlineChip(a)),
      s ? h('div', { class: 'cr-solve__sub' },
        h('div', null, h('span', null, 'Lần nộp gần nhất'), h('strong', null, formatDateTime(s.submitted_at))),
        h('div', null, h('span', null, 'Tự động'), h('strong', null, `${scoreText(s.score)}/10 · ${s.passed}/${s.total} test`)),
        isGraded(s) ? h('div', null, h('span', null, 'Điểm GV'), h('strong', { class: `cr-text-band band-${scoreBand(s.teacher_score)}` }, `${scoreText(s.teacher_score)}/10`)) : null) : null,
      lastResult ? h('div', { class: `cr-callout ${lastResult.ok ? 'tone-green' : 'tone-amber'}` }, icon(lastResult.ok ? 'check-circle' : 'info'), h('div', null, lastResult.text)) : null,
      isGraded(s) ? h('div', { class: 'cr-feedback' }, h('div', { class: 'cr-feedback__head' }, icon('message'), h('strong', null, 'Nhận xét của thầy/cô')), h('p', null, s.teacher_note || 'Không có nhận xét.')) : null,
      expired ? h('div', { class: 'cr-callout tone-amber' }, icon('lock'), h('div', null, 'Bài đã hết hạn nộp. Em vẫn xem và chấm thử được nhưng không thể nộp.')) : null);
  };
  renderStatus(sub);

  let wb;
  try {
    wb = createWorkbench({
      lang: a.language || 'python',
      code: sub?.code || a.starter_code || '',
      starter: a.starter_code || '',
      tests: a.test_cases || [],
      draftKey: `class:${S.code}:${a.id}`,
      signal: ac.signal,
      submitLabel: expired ? 'Chấm thử' : 'Nộp bài',
      onSubmitted: async (result, src) => {
        S.presenceBeat?.beat(result.passed === result.total ? 'done' : 'error', a.title);
        if (expired) { toast('Đã quá hạn nộp — kết quả chỉ để tham khảo, không được lưu.', { type: 'warning' }); renderStatus(sub, { ok: false, text: `Chấm thử: đạt ${result.passed}/${result.total} test (${scoreText(result.score10)}/10). Không được lưu vì đã hết hạn.` }); return; }
        try {
          await C.submitAssignment(S.code, a, { source: src, score: result.score10, passed: result.passed, total: result.total });
          toast(`Đã nộp bài · điểm tự động ${scoreText(result.score10)}/10`, { type: 'success' });
          const fresh = { ...(sub || {}), assignment_id: a.id, email: S.user.key, code: src, score: result.score10, passed: result.passed, total: result.total, submitted_at: Date.now() };
          renderStatus(fresh, { ok: result.passed === result.total, text: result.passed === result.total ? 'Đã nộp — chính xác tất cả test! Thầy/cô có thể chấm lại và nhận xét.' : `Đã nộp — đạt ${result.passed}/${result.total} test. Em có thể sửa và nộp lại trước hạn.` });
        } catch (err) { toast(`Chưa lưu được bài nộp: ${errMsg(err)}`, { type: 'error', duration: 7000 }); }
      },
    });
  } catch (err) {
    S.solving = false;
    toast(`Không mở được trình làm bài: ${errMsg(err)}`, { type: 'error' });
    return;
  }
  const beat = () => S.presenceBeat?.beat('coding', a.title);
  wb.el.addEventListener('input', beat, { signal: ac.signal });
  wb.el.addEventListener('keydown', beat, { signal: ac.signal });
  const wbHost = h('div', { class: 'cr-solve__wb' }, wb.el);
  wbHost.__wb = wb; // handle for automated tests

  const info = h('div', { class: 'cr-solve__info scroll-y' },
    statusBox,
    h('h3', { class: 'cr-solve__h' }, 'Đề bài'),
    prose(a.description || '_Không có mô tả._'),
    testList(a.test_cases || []),
    !(a.test_cases || []).length ? h('div', { class: 'cr-callout tone-amber' }, icon('info'), h('div', null, 'Bài này chưa có bộ test nên chưa thể nộp. Hãy báo thầy/cô.')) : null);
  openModal({
    title: a.title, size: 'xl', className: 'cr-modal cr-solve-modal',
    content: h('div', { class: 'cr-solve' }, info, wbHost),
    onClose: () => { ac.abort(); S.solving = false; S.presenceBeat?.beat('online', ''); },
  });
  setTimeout(() => { try { wb.focus(); } catch { /* noop */ } }, 80);
}

// ---------------------------------------------------------------------------
// Assignment editor (teacher)
async function codeInput(value, lang) {
  try {
    const mod = await import('../../components/editor.js');
    const ed = mod.createEditor?.({ value, lang, minLines: 8 });
    if (ed?.el && typeof ed.getValue === 'function') return { el: ed.el, getValue: () => ed.getValue(), setLang: (l) => { try { ed.setLang?.(l); } catch { /* noop */ } }, destroy: () => { try { ed.destroy?.(); } catch { /* noop */ } } };
  } catch (err) { console.warn('[classroom] editor unavailable, using textarea', err); }
  const ta = h('textarea', { class: 'textarea textarea--code', spellcheck: 'false', style: 'min-height:180px' });
  ta.value = value;
  return { el: ta, getValue: () => ta.value, setLang: () => {}, destroy: () => {} };
}

export function openAssignmentEditor(S, existing) {
  const a = existing || { title: '', description: '', language: 'python', starter_code: '', test_cases: [{ input: '', expected: '', hidden: false }], deadline_ts: endOfDay(Date.now() + 7 * DAY) };
  const title = h('input', { class: 'input input--lg', id: 'cr-asg-title', value: a.title, maxlength: 160, placeholder: 'VD: Tính tổng các số chẵn' });
  const desc = h('textarea', { class: 'textarea cr-md-input', id: 'cr-asg-desc', placeholder: 'Đề bài (hỗ trợ Markdown): yêu cầu, dữ liệu vào, kết quả ra, ví dụ…' });
  desc.value = a.description || '';
  const preview = h('div', { class: 'cr-md-preview', hidden: true });
  let previewOn = false;
  const previewBtn = h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => { previewOn = !previewOn; desc.hidden = previewOn; preview.hidden = !previewOn; if (previewOn) mount(preview, prose(desc.value || '_Chưa có nội dung._')); previewBtn.lastChild.textContent = previewOn ? 'Soạn thảo' : 'Xem trước'; } }, icon('eye'), h('span', null, 'Xem trước'));
  const lang = h('select', { class: 'select', id: 'cr-asg-lang' }, LANG_OPTIONS.map(([v, l]) => h('option', { value: v, selected: v === a.language }, l)));

  // starter code
  const starterHost = h('div', { class: 'cr-mini-editor' }, h('div', { class: 'skeleton', style: 'height:180px' }));
  let starter = { getValue: () => a.starter_code || '', setLang: () => {}, destroy: () => {} };
  codeInput(a.starter_code || '', a.language || 'python').then((ed) => { starter = ed; mount(starterHost, ed.el); });
  lang.addEventListener('change', () => starter.setLang(lang.value));

  // deadline
  const { date, hour, minute } = splitDateTime(a.deadline_ts || endOfDay(Date.now() + 7 * DAY));
  const noDeadline = h('input', { type: 'checkbox', checked: !a.deadline_ts && Boolean(existing) });
  const dateIn = h('input', { class: 'input', type: 'date', value: date, 'aria-label': 'Ngày hạn nộp' });
  const hourSel = h('select', { class: 'select', 'aria-label': 'Giờ (24h)' }, Array.from({ length: 24 }, (_, i) => h('option', { value: i, selected: i === hour }, String(i).padStart(2, '0'))));
  const mins = Array.from({ length: 12 }, (_, i) => i * 5).concat([59]);
  if (!mins.includes(minute)) mins.push(minute);
  const minSel = h('select', { class: 'select', 'aria-label': 'Phút' }, mins.sort((x, y) => x - y).map((m) => h('option', { value: m, selected: m === minute }, String(m).padStart(2, '0'))));
  const dlPreview = h('p', { class: 'cr-dl-preview' });
  const syncDl = () => {
    [dateIn, hourSel, minSel].forEach((el) => { el.disabled = noDeadline.checked; });
    dlBox.classList.toggle('is-disabled', noDeadline.checked);
    if (noDeadline.checked) { dlPreview.textContent = 'Học sinh có thể nộp bất cứ lúc nào.'; return; }
    const ts = combineDateTime(dateIn.value, hourSel.value, minSel.value);
    dlPreview.textContent = ts ? `Hạn nộp: ${formatDateTime(ts)} (${ts > Date.now() ? `còn ${Math.max(1, Math.round((ts - Date.now()) / 3600000))} giờ` : 'đã qua'})` : 'Chọn ngày hạn nộp.';
  };
  const setDl = (ts) => { const p = splitDateTime(ts); dateIn.value = p.date; hourSel.value = String(p.hour); if (![...minSel.options].some((o) => o.value === String(p.minute))) minSel.appendChild(h('option', { value: p.minute }, String(p.minute).padStart(2, '0'))); minSel.value = String(p.minute); noDeadline.checked = false; syncDl(); };
  const quickDl = h('div', { class: 'cr-score-quick' },
    [['+1 ngày', 1], ['+3 ngày', 3], ['+1 tuần', 7], ['+2 tuần', 14]].map(([l, d]) => h('button', { type: 'button', class: 'cr-chip', onClick: () => setDl(endOfDay(Date.now() + d * DAY)) }, l)));
  const dlBox = h('div', { class: 'cr-dl' }, dateIn, hourSel, h('span', { class: 'cr-dl__sep' }, ':'), minSel);
  [dateIn, hourSel, minSel].forEach((el) => el.addEventListener('change', syncDl));
  noDeadline.addEventListener('change', syncDl);

  // tests
  const tests = (a.test_cases?.length ? a.test_cases : [{ input: '', expected: '', hidden: false }]).map((t) => ({ ...t }));
  const testsBox = h('div', { class: 'cr-test-edit-list' });
  const testSummary = h('span', { class: 'cr-test-summary' });
  const renderTests = () => {
    testSummary.textContent = `${tests.length} test · ${tests.filter((t) => t.hidden).length} ẩn`;
    mount(testsBox, tests.map((t, i) => {
      const inp = h('textarea', { class: 'textarea textarea--code', rows: 2, placeholder: '(để trống nếu không có dữ liệu vào)', 'aria-label': `Dữ liệu vào test ${i + 1}`, onInput: (e) => { t.input = e.target.value; } });
      inp.value = t.input || '';
      const exp = h('textarea', { class: 'textarea textarea--code', rows: 2, placeholder: 'Kết quả chương trình phải in ra', 'aria-label': `Kết quả mong đợi test ${i + 1}`, onInput: (e) => { t.expected = e.target.value; } });
      exp.value = t.expected || '';
      return h('div', { class: 'cr-test-edit' },
        h('div', { class: 'cr-test-edit__head' },
          h('span', { class: 'cr-test-edit__n' }, `Test ${i + 1}`),
          h('label', { class: 'switch cr-switch-sm' }, h('input', { type: 'checkbox', checked: Boolean(t.hidden), onChange: (e) => { t.hidden = e.target.checked; testSummary.textContent = `${tests.length} test · ${tests.filter((x) => x.hidden).length} ẩn`; } }), 'Test ẩn'),
          h('div', { class: 'grow' }),
          tests.length > 1 ? h('button', { class: 'btn btn--ghost btn--sm btn--icon', type: 'button', 'aria-label': `Xóa test ${i + 1}`, onClick: () => { tests.splice(i, 1); renderTests(); } }, icon('trash')) : null),
        h('div', { class: 'cr-test-edit__io' },
          h('div', null, h('span', { class: 'cr-io-label' }, 'Dữ liệu vào (stdin)'), inp),
          h('div', null, h('span', { class: 'cr-io-label' }, 'Kết quả mong đợi'), exp)));
    }));
  };
  renderTests();

  const sec = (n, t, hint, ...children) => h('section', { class: 'cr-form-sec' }, h('header', null, h('span', { class: 'cr-form-sec__n' }, String(n)), h('div', null, h('h3', null, t), hint ? h('p', null, hint) : null)), h('div', { class: 'cr-form-sec__body' }, children));

  openModal({
    title: existing ? 'Sửa bài tập' : 'Giao bài tập mới',
    size: 'lg',
    className: 'cr-modal cr-editor-modal',
    content: h('div', { class: 'cr-form' },
      sec(1, 'Thông tin bài', 'Tiêu đề ngắn gọn và đề bài rõ ràng.',
        h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-asg-title' }, 'Tiêu đề ', h('span', { class: 'cr-req' }, '*')), title),
        h('div', { class: 'field' }, h('div', { class: 'cluster cluster--between' }, h('label', { class: 'field__label', for: 'cr-asg-desc' }, 'Đề bài'), previewBtn), desc, preview, h('span', { class: 'field__hint' }, 'Hỗ trợ Markdown: **đậm**, `mã`, danh sách, bảng, khối mã ```.'))),
      sec(2, 'Ngôn ngữ & hạn nộp', 'Giờ theo định dạng 24h. Sau hạn, học sinh chỉ chấm thử được.',
        h('div', { class: 'cr-form-row' },
          h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-asg-lang' }, 'Ngôn ngữ'), lang),
          h('div', { class: 'field cr-form-row__wide' }, h('span', { class: 'field__label' }, 'Hạn nộp'), dlBox, quickDl,
            h('label', { class: 'switch', style: 'margin-top:8px' }, noDeadline, 'Không giới hạn thời gian'))),
        dlPreview),
      sec(3, 'Mã khởi tạo', 'Đoạn mã học sinh nhận được khi mở bài (không bắt buộc).', starterHost),
      sec(4, 'Bộ test chấm tự động', 'Điểm tự động = tỉ lệ test đạt × 10. Test ẩn không hiện nội dung cho học sinh.',
        h('div', { class: 'cluster cluster--between' }, testSummary, h('button', { class: 'btn btn--soft btn--sm', type: 'button', onClick: () => { tests.push({ input: '', expected: '', hidden: tests.length > 0 }); renderTests(); testsBox.lastElementChild?.querySelector('textarea')?.focus(); } }, icon('plus'), 'Thêm test')),
        testsBox)),
    actions: [{ label: 'Hủy', variant: 'ghost' }, { label: existing ? 'Lưu thay đổi' : 'Giao bài', variant: 'primary', icon: existing ? 'check' : 'send', onClick: async () => {
      if (!title.value.trim()) { toast('Vui lòng nhập tiêu đề.', { type: 'warning' }); title.setAttribute('aria-invalid', 'true'); title.focus(); return false; }
      const deadline = noDeadline.checked ? 0 : combineDateTime(dateIn.value, hourSel.value, minSel.value);
      if (!noDeadline.checked && !dateIn.value) { toast('Chọn ngày hạn nộp hoặc bật “Không giới hạn thời gian”.', { type: 'warning' }); return false; }
      if (!noDeadline.checked && deadline < Date.now() - 60000 && (!existing || deadline !== existing.deadline_ts)) { toast('Hạn nộp phải ở tương lai.', { type: 'warning' }); return false; }
      const validTests = tests.filter((t) => String(t.expected).trim() !== '');
      if (!validTests.length) { toast('Cần ít nhất 1 test có “Kết quả mong đợi” để học sinh nộp và được chấm tự động.', { type: 'warning', duration: 6000 }); testsBox.querySelector('textarea:nth-of-type(1)')?.focus(); return false; }
      try {
        const saved = await C.saveAssignment(S.code, { ...a, title: title.value, description: desc.value, language: lang.value, starter_code: starter.getValue(), test_cases: validTests, deadline_ts: deadline });
        toast(existing ? 'Đã cập nhật bài tập.' : 'Đã giao bài cho lớp.', { type: 'success' });
        if (!existing && S.ui.section === 'assignments' && !S.ui.assignmentId) { S.ui.pendingAssignment = saved.id; S.go('assignments', { assignmentId: saved.id, noScroll: true }); }
        return true;
      } catch (err) { toast(errMsg(err), { type: 'error' }); return false; }
    } }],
    onClose: () => starter.destroy(),
  });
  syncDl();
  setTimeout(() => title.focus(), 60);
}

function endOfDay(ts) { const d = new Date(ts); d.setHours(23, 59, 0, 0); return d.getTime(); }
