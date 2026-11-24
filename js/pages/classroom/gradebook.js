// V-Code Edu — classroom gradebook: teacher matrix (students × assignments, CSV export) / student grades.
import { h, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { downloadFile } from '../../core/ui.js';
import { formatDateTime } from '../../core/format.js';
import { openGrade, openSolve } from './assignments.js';
import { openStudent } from './people.js';
import {
  sectionHead, kpi, panel, emptyBlock, avatar, effScore, isGraded, avg, round1, scoreText, scoreBand, studentStatus,
  statusPill, columnSeries, shortDate, toCSV, pct, sortableTable, searchBox,
} from './util.js';

const norm = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

export function gradebookSection(S) {
  return S.isTeacher ? teacherGradebook(S) : studentGrades(S);
}

function teacherGradebook(S) {
  const host = h('div');
  const el = h('div', { class: 'cr-sec' },
    sectionHead({
      title: 'Bảng điểm', sub: 'Điểm của từng học sinh theo bài tập. Ô hiển thị điểm giáo viên; nếu chưa chấm, hiển thị điểm tự động (in nghiêng).',
      actions: h('button', { class: 'btn', type: 'button', onClick: () => exportCSV(S) }, icon('download'), 'Xuất CSV'),
    }),
    h('div', { class: 'cr-toolbar' }, h('div', { class: 'cr-gb-legend' },
      h('span', null, h('i', { class: 'band-high' }), '8 – 10'), h('span', null, h('i', { class: 'band-good' }), '6,5 – 8'), h('span', null, h('i', { class: 'band-mid' }), '5 – 6,5'), h('span', null, h('i', { class: 'band-low' }), 'Dưới 5'),
      h('span', null, h('i', { class: 'is-pending' }), 'Chờ chấm'), h('span', null, h('i', { class: 'is-missing' }), 'Thiếu (quá hạn)')),
    h('div', { class: 'grow' }), searchBox('Tìm học sinh…', S.ui.search.gb, (v) => { S.ui.search.gb = v; update(); })),
    host);
  const sort = S.ui.sorts.gb || (S.ui.sorts.gb = { key: 'name', dir: 1 });

  function update() {
    const now = Date.now();
    const roster = S.roster();
    const asg = S.assignments.slice().sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
    el.classList.toggle('is-empty', !roster.length || !asg.length);
    if (!roster.length || !asg.length) {
      mount(host, emptyBlock({ art: 'grades', title: !asg.length ? 'Chưa có bài tập' : 'Lớp chưa có học sinh', text: 'Bảng điểm hiển thị khi lớp có cả học sinh và bài tập.' }));
      return;
    }
    const q = norm(S.ui.search.gb);
    const rows = roster.filter((r) => !q || norm(r.full_name).includes(q) || norm(r.email).includes(q)).map((r) => {
      const cells = asg.map((a) => S.subOf(a.id, r.email) || null);
      const sc = cells.map(effScore).filter((v) => v !== null);
      return { r, cells, avg: sc.length ? round1(avg(sc)) : null, done: cells.filter(Boolean).length };
    });
    const valueOf = (row) => {
      if (sort.key === 'name') return row.r.full_name;
      if (sort.key === 'avg') return row.avg;
      if (sort.key === 'done') return row.done;
      const i = asg.findIndex((a) => a.id === sort.key);
      return i >= 0 ? effScore(row.cells[i]) : null;
    };
    rows.sort((x, y) => {
      const a = valueOf(x); const b = valueOf(y);
      if (a === null && b === null) return 0;
      if (a === null) return 1;
      if (b === null) return -1;
      return (typeof a === 'string' ? a.localeCompare(b, 'vi') : a - b) * sort.dir;
    });
    const th = (key, label, extra = {}) => {
      const active = sort.key === key;
      return h('th', { class: extra.cls || '', scope: 'col', 'aria-sort': active ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none', title: extra.title },
        h('button', { type: 'button', class: `cr-th-btn ${active ? 'is-active' : ''}`, onClick: () => { if (sort.key === key) sort.dir = -sort.dir; else { sort.key = key; sort.dir = key === 'name' ? 1 : -1; } update(); } },
          label, h('span', { class: `cr-sort ${active ? (sort.dir > 0 ? 'is-asc' : 'is-desc') : ''}`, 'aria-hidden': 'true' })));
    };
    // per-assignment column averages (whole roster)
    const colAvg = asg.map((a) => { const v = roster.map((r) => effScore(S.subOf(a.id, r.email))).filter((x) => x !== null); return v.length ? round1(avg(v)) : null; });
    const order = S.submissions.map((x) => x.id);
    mount(host, h('div', { class: 'cr-gb-wrap' }, h('table', { class: 'cr-gb' },
      h('caption', { class: 'sr-only' }, 'Bảng điểm học sinh theo bài tập'),
      h('thead', null, h('tr', null,
        th('name', 'Học sinh', { cls: 'is-sticky' }),
        asg.map((a, i) => th(a.id, h('span', { class: 'cr-gb__ahead' }, h('span', { class: 'truncate' }, `${i + 1}. ${a.title}`), h('small', null, a.deadline_ts ? `Hạn ${shortDate(a.deadline_ts)}` : 'Không hạn')), { title: a.title, cls: 'cr-gb__col' })),
        th('done', 'Đã nộp', { cls: 'is-num' }),
        th('avg', 'ĐTB', { cls: 'is-num is-avg' }))),
      h('tbody', null, rows.map((row) => h('tr', null,
        h('th', { class: 'is-sticky', scope: 'row' }, h('button', { class: 'cr-cell-user cr-cell-user--btn', type: 'button', onClick: () => openStudent(S, row.r) }, avatar(row.r.full_name, row.r.email, { size: 28 }), h('div', null, h('strong', null, row.r.full_name), h('span', null, row.r.email)))),
        row.cells.map((s, i) => {
          const a = asg[i];
          if (!s) {
            const missing = a.deadline_ts && now > a.deadline_ts;
            return h('td', { class: 'cr-gb__cell' }, h('span', { class: `cr-gb__v ${missing ? 'is-missing' : 'is-empty'}`, title: missing ? `Thiếu bài — hạn ${formatDateTime(a.deadline_ts)}` : 'Chưa nộp' }, missing ? 'Thiếu' : '—'));
          }
          const v = effScore(s);
          return h('td', { class: 'cr-gb__cell' }, h('button', { type: 'button', class: `cr-gb__v band-${scoreBand(v)} ${isGraded(s) ? '' : 'is-pending'}`, title: `${a.title}: ${isGraded(s) ? `điểm GV ${scoreText(s.teacher_score)}` : `tự động ${scoreText(s.score)} — chờ chấm`} · nộp ${formatDateTime(s.submitted_at)}`, onClick: () => openGrade(S, s, { order }) }, scoreText(v)));
        }),
        h('td', { class: 'is-num' }, `${row.done}/${asg.length}`),
        h('td', { class: 'is-num is-avg' }, row.avg === null ? '—' : h('strong', { class: `cr-text-band band-${scoreBand(row.avg)}` }, scoreText(row.avg)))))),
      h('tfoot', null, h('tr', null,
        h('th', { class: 'is-sticky', scope: 'row' }, 'Trung bình lớp'),
        colAvg.map((v) => h('td', { class: 'cr-gb__cell' }, v === null ? '—' : h('strong', null, scoreText(v)))),
        h('td', { class: 'is-num' }, `${pct(S.submissions.filter((s) => roster.some((r) => r.email === s.email) && asg.some((a) => a.id === s.assignment_id)).length, roster.length * asg.length)}%`),
        h('td', { class: 'is-num is-avg' }, (() => { const v = rows.map((r) => r.avg).filter((x) => x !== null); return v.length ? scoreText(round1(avg(v))) : '—'; })()))))));
  }
  update();
  return { el, update };
}

function exportCSV(S) {
  const asg = S.assignments.slice().sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
  const rows = [['Họ tên', 'Email', ...asg.map((a) => a.title), 'Đã nộp', 'Điểm TB']];
  for (const r of S.roster()) {
    const cells = asg.map((a) => S.subOf(a.id, r.email));
    const sc = cells.map(effScore).filter((v) => v !== null);
    rows.push([r.full_name, r.email, ...cells.map((s) => (s ? String(round1(effScore(s))).replace('.', ',') : '')), `${cells.filter(Boolean).length}/${asg.length}`, sc.length ? String(round1(avg(sc))).replace('.', ',') : '']);
  }
  downloadFile(`bang-diem-${S.code}.csv`, toCSV(rows), 'text/csv;charset=utf-8');
}

// ---------------------------------------------------------------------------
function studentGrades(S) {
  const el = h('div', { class: 'cr-sec' });
  function update() {
    const now = Date.now();
    const asg = S.assignments.slice().sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
    const items = asg.map((a) => { const sub = S.submissions.find((x) => x.assignment_id === a.id); return { a, sub, status: studentStatus(a, sub, now) }; });
    const graded = items.filter((x) => x.status === 'graded');
    const scores = items.map((x) => effScore(x.sub)).filter((v) => v !== null);
    const best = scores.length ? Math.max(...scores) : null;
    mount(el,
      sectionHead({ title: 'Điểm số', sub: 'Điểm và nhận xét của em ở từng bài tập. Điểm giáo viên được ưu tiên hơn điểm tự động.' }),
      items.length ? [
        h('div', { class: 'cr-kpis' },
          kpi({ label: 'Điểm trung bình', value: scores.length ? scoreText(round1(avg(scores))) : '—', hint: scores.length ? `Từ ${scores.length} bài đã nộp` : 'Chưa nộp bài nào', tone: 'blue', iconName: 'gauge' }),
          kpi({ label: 'Đã chấm', value: `${graded.length}/${items.length}`, hint: 'Bài có điểm giáo viên', tone: 'green', iconName: 'check-circle' }),
          kpi({ label: 'Điểm cao nhất', value: best === null ? '—' : scoreText(best), hint: best === null ? '—' : items.find((x) => effScore(x.sub) === best)?.a.title, tone: 'ink', iconName: 'trophy' })),
        panel({ title: 'Điểm theo bài tập', sub: 'Theo thứ tự giao bài', body: h('div', { class: 'cr-hist-wrap cr-hist-wrap--scroll' }, columnSeries(items.map((x, i) => ({ label: String(i + 1), value: effScore(x.sub), title: x.a.title })))) }),
        panel({ title: 'Chi tiết', className: 'cr-panel--flush', body: sortableTable({
          caption: 'Điểm của em', rows: items, initial: { key: 'idx', dir: 1 },
          onRowClick: (x) => openSolve(S, x.a),
          columns: [
            { key: 'idx', label: 'Bài tập', sort: (x) => items.indexOf(x), render: (x) => h('div', { class: 'cr-cell-asg' }, h('strong', null, x.a.title), h('span', null, x.a.deadline_ts ? `Hạn ${formatDateTime(x.a.deadline_ts)}` : 'Không hạn')) },
            { key: 'status', label: 'Trạng thái', sort: (x) => x.status, render: (x) => statusPill(x.status) },
            { key: 'auto', label: 'Tự động', align: 'right', sort: (x) => x.sub?.score ?? null, render: (x) => (x.sub ? h('span', { class: 'cr-auto' }, h('strong', null, scoreText(x.sub.score)), h('span', null, `${x.sub.passed}/${x.sub.total} test`)) : h('span', { class: 'muted' }, '—')) },
            { key: 'teacher', label: 'Điểm GV', align: 'right', sort: (x) => x.sub?.teacher_score ?? null, render: (x) => (isGraded(x.sub) ? h('span', { class: `cr-score-badge band-${scoreBand(x.sub.teacher_score)}` }, scoreText(x.sub.teacher_score)) : h('span', { class: 'muted' }, x.sub ? 'Chờ chấm' : '—')) },
            { key: 'note', label: 'Nhận xét', render: (x) => (x.sub?.teacher_note ? h('span', { class: 'cr-note-cell' }, x.sub.teacher_note) : h('span', { class: 'muted' }, '—')) },
          ],
        }) }),
      ] : emptyBlock({ art: 'grades', title: 'Chưa có điểm', text: 'Khi em nộp bài và được chấm, điểm và nhận xét sẽ hiện ở đây.' }));
  }
  update();
  return { el, update };
}
