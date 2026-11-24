// V-Code Edu — classroom: activity feed (derived from real class data) and class discussion.
import { h, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { toast, confirmDialog } from '../../core/ui.js';
import { formatRelative, formatDateTime } from '../../core/format.js';
import * as C from '../../services/classroom.js';
import { errMsg, ms, avatar, sectionHead, chipFilter, emptyBlock, dayLabel, timeOf, scoreText, isGraded } from './util.js';

/** Build the activity timeline from class doc, roster, assignments, submissions and messages. */
export function buildEvents(S) {
  const { cls, isTeacher } = S;
  const teacher = cls.teacher_name || cls.teacher_email;
  const titleOf = (aid) => S.assignments.find((a) => a.id === aid)?.title || 'bài tập';
  const ev = [];
  const created = ms(cls.created_at);
  if (created) ev.push({ type: 'class', ts: created, who: teacher, whoKey: cls.teacher_email, text: 'đã tạo lớp', target: cls.name, icon: 'school', tone: 'blue' });
  for (const st of S.roster()) if (st.joined_at) ev.push({ type: 'member', ts: st.joined_at, who: st.full_name, whoKey: st.email, text: 'đã tham gia lớp', icon: 'users', tone: 'ink' });
  for (const a of S.assignments) if (a.created_at) ev.push({ type: 'assignment', ts: ms(a.created_at), who: teacher, whoKey: cls.teacher_email, text: 'đã giao bài', target: a.title, icon: 'calendar', tone: 'blue', aid: a.id });
  for (const s of S.submissions) {
    if (s.submitted_at) ev.push({ type: 'submission', ts: ms(s.submitted_at), who: isTeacher ? (s.full_name || s.email) : 'Em', whoKey: s.email, text: 'đã nộp', target: titleOf(s.assignment_id), meta: `Tự động ${scoreText(s.score)}/10 · ${s.passed ?? 0}/${s.total ?? 0} test`, icon: 'upload', tone: 'ink', aid: s.assignment_id, sid: s.id });
    if (isGraded(s) && s.graded_at) ev.push({ type: 'grade', ts: ms(s.graded_at), who: teacher, whoKey: cls.teacher_email, text: isTeacher ? 'đã chấm bài' : 'đã chấm bài của em', target: isTeacher ? `${titleOf(s.assignment_id)} · ${s.full_name || s.email}` : titleOf(s.assignment_id), meta: `${scoreText(s.teacher_score)}/10${s.teacher_note ? ` — “${s.teacher_note.slice(0, 120)}”` : ''}`, icon: 'check-circle', tone: 'green', aid: s.assignment_id, sid: s.id });
  }
  for (const m of S.messages) ev.push({ type: 'message', ts: ms(m.created_at), who: m.author_name || m.author_email, whoKey: m.author_email, text: 'đã viết trong thảo luận', meta: String(m.text || '').slice(0, 140), icon: 'message', tone: 'ink' });
  return ev.filter((e) => e.ts).sort((a, b) => b.ts - a.ts);
}

export function eventItem(S, e, { compact = false } = {}) {
  const clickable = e.aid && S.assignments.some((a) => a.id === e.aid);
  return h('li', { class: `cr-event tone-${e.tone} ${compact ? 'is-compact' : ''}` },
    h('span', { class: 'cr-event__icon' }, icon(e.icon)),
    h('div', { class: 'cr-event__body' },
      h('p', { class: 'cr-event__text' }, h('strong', null, e.who), ` ${e.text} `,
        e.target ? (clickable ? h('button', { class: 'cr-link', type: 'button', onClick: () => S.go('assignments', { assignmentId: e.aid }) }, e.target) : h('strong', null, e.target)) : null),
      e.meta ? h('p', { class: 'cr-event__meta' }, e.meta) : null),
    h('time', { class: 'cr-event__time', title: formatDateTime(e.ts), datetime: new Date(e.ts).toISOString() }, compact ? formatRelative(e.ts) : timeOf(e.ts)));
}

export function activitySection(S) {
  const filters = [['all', 'Tất cả'], ['submission', 'Bài nộp'], ['grade', 'Chấm điểm'], ['assignment', 'Bài tập'], ['message', 'Thảo luận'], ['member', 'Thành viên']];
  const chipsHost = h('div');
  const list = h('div', { class: 'cr-activity' });
  const el = h('div', { class: 'cr-sec' },
    sectionHead({ title: 'Hoạt động', sub: S.isTeacher ? 'Dòng thời gian của lớp: bài được giao, bài nộp, điểm, thảo luận và thành viên mới.' : 'Dòng thời gian của lớp và các bài em đã nộp.' }),
    chipsHost, list);
  function update() {
    const f = S.ui.filters.activity || 'all';
    const events = buildEvents(S);
    const counts = Object.fromEntries(filters.map(([id]) => [id, id === 'all' ? events.length : events.filter((e) => e.type === id).length]));
    mount(chipsHost, chipFilter(filters.map(([id, l]) => [id, l, counts[id]]), f, (v) => { S.ui.filters.activity = v; update(); }));
    const shown = (f === 'all' ? events : events.filter((e) => e.type === f)).slice(0, 300);
    if (!shown.length) { mount(list, emptyBlock({ art: 'activity', title: 'Chưa có hoạt động', text: 'Khi giáo viên giao bài, học sinh nộp bài hoặc thảo luận, hoạt động sẽ xuất hiện ở đây theo thời gian thực.', compact: true })); return; }
    const groups = [];
    for (const e of shown) {
      const label = dayLabel(e.ts);
      if (!groups.length || groups[groups.length - 1].label !== label) groups.push({ label, items: [] });
      groups[groups.length - 1].items.push(e);
    }
    mount(list, groups.map((g) => h('section', { class: 'cr-activity__day' }, h('h3', { class: 'cr-activity__label' }, g.label), h('ol', { class: 'cr-timeline' }, g.items.map((e) => eventItem(S, e))))));
  }
  update();
  return { el, update, deps: ['cls', 'assignments', 'submissions', 'messages'] };
}

// ---------------------------------------------------------------------------
export function discussionSection(S) {
  const { user, isTeacher, code } = S;
  const list = h('div', { class: 'cr-chat__list scroll-y', 'aria-live': 'polite' });
  const input = h('textarea', { class: 'cr-chat__input', rows: 1, maxlength: 2000, placeholder: isTeacher ? 'Viết thông báo hoặc trả lời câu hỏi của lớp…' : 'Đặt câu hỏi cho thầy/cô và các bạn…', 'aria-label': 'Nội dung tin nhắn' });
  const counter = h('span', { class: 'cr-chat__count' });
  const send = h('button', { class: 'btn btn--primary cr-chat__send', type: 'submit', 'aria-label': 'Gửi', disabled: true }, icon('send'), h('span', null, 'Gửi'));
  const autosize = () => { input.style.height = 'auto'; input.style.height = `${Math.min(180, input.scrollHeight)}px`; send.disabled = !input.value.trim(); counter.textContent = input.value.length > 1500 ? `${input.value.length}/2000` : ''; };
  input.addEventListener('input', autosize);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit(); } });
  const form = h('form', { class: 'cr-chat__composer', onSubmit: async (e) => {
    e.preventDefault();
    const t = input.value.trim();
    if (!t) return;
    send.classList.add('is-loading');
    try { await C.postMessage(code, t); input.value = ''; autosize(); stick = true; } catch (err) { toast(errMsg(err), { type: 'error' }); } finally { send.classList.remove('is-loading'); input.focus(); }
  } }, avatar(user.displayName, user.key, { size: 36 }), h('div', { class: 'cr-chat__field' }, input, h('div', { class: 'cr-chat__hint' }, h('span', null, 'Enter để gửi · Shift + Enter xuống dòng'), counter)), send);
  const sub = h('p', { class: 'cr-sec-head__sub' });
  const el = h('div', { class: 'cr-sec cr-sec--chat' },
    sectionHead({ title: 'Thảo luận' }),
    h('div', { class: 'cr-chat' }, list, form));
  el.querySelector('.cr-sec-head .grow').appendChild(sub);
  let stick = true;
  list.addEventListener('scroll', () => { stick = list.scrollHeight - list.scrollTop - list.clientHeight < 80; });

  function update() {
    const msgs = S.messages;
    sub.textContent = msgs.length ? `${msgs.length} tin nhắn gần nhất · hỏi đáp và thông báo chung của lớp` : 'Hỏi đáp và thông báo chung của lớp';
    if (!msgs.length) {
      mount(list, emptyBlock({ art: 'discussion', title: 'Chưa có thảo luận', text: isTeacher ? 'Gửi lời chào hoặc thông báo đầu tiên cho lớp. Học sinh sẽ thấy ngay lập tức.' : 'Hãy là người đầu tiên đặt câu hỏi cho lớp.', compact: true }));
      return;
    }
    const nodes = [];
    let lastDay = '';
    let prev = null;
    for (const m of msgs) {
      const t = ms(m.created_at);
      const day = dayLabel(t);
      if (day !== lastDay) { nodes.push(h('div', { class: 'cr-chat__day' }, h('span', null, day))); lastDay = day; prev = null; }
      const mine = m.author_email === user.key;
      const grouped = prev && prev.author_email === m.author_email && t - ms(prev.created_at) < 5 * 60000;
      const isT = m.role === 'teacher' || m.role === 'admin' || m.author_email === S.cls.teacher_email;
      const canDelete = isTeacher || mine;
      nodes.push(h('div', { class: `cr-msg ${mine ? 'is-mine' : ''} ${isT ? 'is-teacher' : ''} ${grouped ? 'is-grouped' : ''}` },
        grouped ? h('span', { class: 'cr-msg__spacer' }) : avatar(m.author_name || m.author_email, m.author_email, { size: 34 }),
        h('div', { class: 'cr-msg__main' },
          grouped ? null : h('div', { class: 'cr-msg__head' }, h('strong', null, mine ? 'Bạn' : (m.author_name || m.author_email)), isT ? h('span', { class: 'cr-tag tone-blue' }, 'Giáo viên') : null, h('time', { title: formatDateTime(t) }, timeOf(t))),
          h('div', { class: 'cr-msg__bubble' }, h('p', null, m.text),
            canDelete ? h('button', { class: 'cr-msg__del', type: 'button', 'aria-label': 'Xóa tin nhắn', title: 'Xóa tin nhắn', onClick: async () => {
              if (!(await confirmDialog({ title: 'Xóa tin nhắn?', message: 'Tin nhắn sẽ bị xóa với tất cả thành viên.', confirmLabel: 'Xóa', danger: true }))) return;
              try { await C.deleteMessage(code, m.id); } catch (err) { toast(errMsg(err), { type: 'error' }); }
            } }, icon('trash')) : null))));
      prev = m;
    }
    mount(list, nodes);
    if (stick) requestAnimationFrame(() => { list.scrollTop = list.scrollHeight; });
  }
  update();
  return { el, update, deps: ['messages', 'cls'] };
}
