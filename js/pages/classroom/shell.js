// V-Code Edu — classroom app shell: sidebar (class switcher + sections), class cache, create / join dialogs.
import { h, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { toast, openModal } from '../../core/ui.js';
import * as C from '../../services/classroom.js';
import { classMark } from './art.js';
import { errMsg } from './util.js';

// ---------------------------------------------------------------------------
// Class list cache (shared by dashboard + switcher; refreshed on create / join / leave / delete)
let cache = null;
export function invalidateClasses() { cache = null; }
export async function getMyClasses(user, { force = false } = {}) {
  if (!force && cache && cache.key === user.key && Date.now() - cache.at < 60000) return cache.list;
  const list = await C.listMyClasses();
  cache = { key: user.key, list, at: Date.now() };
  return list;
}
export function peekClasses(user) { return cache && cache.key === user.key ? cache.list : null; }

// ---------------------------------------------------------------------------
/**
 * createShell({ ctx, user, isTeacher, currentCode, sections: [{id,label,icon}], active, onSelect })
 * → { el, main, extra, setActive, setBadges, setClass }
 */
export function createShell({ ctx, user, isTeacher, currentCode = null, sections, active, onSelect }) {
  const { signal } = ctx;
  let current = null;
  const switchLabel = h('span', { class: 'cr-switch__text' });
  const switchMark = h('span', { class: 'cr-switch__mark' });
  const panel = h('div', { class: 'cr-switch__panel', role: 'menu', hidden: true });
  const trigger = h('button', { class: 'cr-switch__btn', type: 'button', 'aria-haspopup': 'menu', 'aria-expanded': 'false', onClick: (e) => { e.stopPropagation(); toggle(); } },
    switchMark, switchLabel, icon('chevron-down', { className: 'cr-switch__chev' }));
  const sw = h('div', { class: 'cr-switch' }, trigger, panel);

  function renderSwitchLabel() {
    if (currentCode) {
      mount(switchMark, classMark(currentCode, current?.name));
      mount(switchLabel, h('strong', { class: 'truncate' }, current?.name || currentCode), h('span', { class: 'truncate' }, current?.grade_subject || `Mã lớp ${currentCode}`));
    } else {
      mount(switchMark, h('span', { class: 'cr-mark cr-mark--all', 'aria-hidden': 'true' }, icon('grid')));
      mount(switchLabel, h('strong', null, 'Tất cả lớp học'), h('span', null, isTeacher ? 'Không gian giáo viên' : 'Lớp học của em'));
    }
  }

  async function fillPanel() {
    mount(panel, h('div', { class: 'cr-switch__loading' }, h('div', { class: 'spinner' })));
    let list = [];
    try { list = await getMyClasses(user); } catch (err) { mount(panel, h('p', { class: 'cr-switch__err' }, errMsg(err))); return; }
    mount(panel,
      h('a', { class: `cr-switch__item ${!currentCode ? 'is-active' : ''}`, href: '#/classroom', role: 'menuitem' }, h('span', { class: 'cr-mark cr-mark--all', 'aria-hidden': 'true' }, icon('grid')), h('span', { class: 'grow' }, h('strong', null, 'Tất cả lớp học'))),
      list.length ? h('div', { class: 'cr-switch__label' }, isTeacher ? 'Lớp bạn dạy' : 'Lớp đã tham gia') : null,
      h('div', { class: 'cr-switch__list' }, list.map((c) => {
        const code = c.code || c.id;
        return h('a', { class: `cr-switch__item ${code === currentCode ? 'is-active' : ''}`, href: `#/classroom/${code}`, role: 'menuitem' },
          classMark(code, c.name), h('span', { class: 'grow' }, h('strong', { class: 'truncate' }, c.name), h('span', { class: 'truncate' }, `${code} · ${(c.student_emails || []).length} học sinh`)),
          code === currentCode ? icon('check') : null);
      })),
      h('div', { class: 'cr-switch__sep' }),
      isTeacher
        ? h('button', { class: 'cr-switch__item cr-switch__action', type: 'button', role: 'menuitem', onClick: () => { toggle(false); openCreateClass(ctx); } }, h('span', { class: 'cr-mark cr-mark--add' }, icon('plus')), h('strong', null, 'Tạo lớp mới'))
        : h('button', { class: 'cr-switch__item cr-switch__action', type: 'button', role: 'menuitem', onClick: () => { toggle(false); openJoinDialog(ctx); } }, h('span', { class: 'cr-mark cr-mark--add' }, icon('plus')), h('strong', null, 'Tham gia lớp')));
  }

  function toggle(force) {
    const open = force ?? panel.hidden;
    panel.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
    sw.classList.toggle('is-open', open);
    if (open) fillPanel();
  }
  document.addEventListener('click', (e) => { if (!sw.contains(e.target)) toggle(false); }, { signal });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) { toggle(false); trigger.focus(); } }, { signal });

  const nav = h('nav', { class: 'cr-nav', 'aria-label': 'Mục của lớp học' });
  const badges = {};
  let activeId = active;
  function renderNav() {
    mount(nav, sections.map((sct) => h('button', {
      type: 'button', class: `cr-nav__item ${sct.id === activeId ? 'is-active' : ''}`, 'aria-current': sct.id === activeId ? 'page' : undefined, dataset: { section: sct.id },
      onClick: () => onSelect?.(sct.id),
    }, icon(sct.icon), h('span', { class: 'cr-nav__label' }, sct.label), badges[sct.id] ? h('span', { class: `cr-nav__badge ${sct.badgeTone ? `tone-${sct.badgeTone}` : ''}` }, String(badges[sct.id])) : null)));
  }
  renderNav();
  renderSwitchLabel();

  const extra = h('div', { class: 'cr-side__extra' });
  const roleChip = h('div', { class: 'cr-side__who' },
    h('span', { class: `cr-role-chip ${isTeacher ? 'is-teacher' : 'is-student'}` }, icon(isTeacher ? 'school' : 'user'), isTeacher ? 'Giáo viên' : 'Học sinh'),
    h('span', { class: 'truncate muted' }, user.displayName));
  const side = h('aside', { class: 'cr-side', 'aria-label': 'Điều hướng lớp học' }, roleChip, sw, nav, extra);
  const main = h('div', { class: 'cr-main' });
  const el = h('div', { class: 'cr-app' }, side, main);

  return {
    el, main, extra,
    setActive(id) { activeId = id; renderNav(); },
    setBadges(map) { Object.assign(badges, map); renderNav(); },
    setClass(cls) { current = cls; renderSwitchLabel(); },
  };
}

// ---------------------------------------------------------------------------
export function openCreateClass(ctx) {
  const name = h('input', { class: 'input', id: 'cr-new-name', required: true, maxlength: 120, placeholder: 'VD: Tin học 10A1' });
  const subject = h('input', { class: 'input', id: 'cr-new-subject', maxlength: 80, placeholder: 'VD: Tin học THPT · Python' });
  const desc = h('textarea', { class: 'textarea', id: 'cr-new-desc', maxlength: 1000, placeholder: 'Giới thiệu ngắn về lớp, nội quy nộp bài… (không bắt buộc)' });
  const submit = async () => {
    if (!name.value.trim()) { name.focus(); name.setAttribute('aria-invalid', 'true'); toast('Vui lòng nhập tên lớp.', { type: 'warning' }); return false; }
    try {
      const cls = await C.createClass({ name: name.value, grade_subject: subject.value, description: desc.value });
      invalidateClasses();
      toast(`Đã tạo lớp ${cls.name} — mã ${cls.code}`, { type: 'success' });
      ctx.navigate(`/classroom/${cls.code}?tab=overview&welcome=1`);
      return true;
    } catch (err) { toast(errMsg(err), { type: 'error' }); return false; }
  };
  const m = openModal({
    title: 'Tạo lớp mới',
    className: 'cr-modal',
    content: h('form', { class: 'cr-form', onSubmit: async (e) => { e.preventDefault(); if (await submit()) m.close(); } },
      h('div', { class: 'cr-modal-intro' }, h('span', { class: 'cr-modal-intro__icon tone-blue' }, icon('school')), h('p', null, 'Mã lớp được tạo tự động, không trùng lặp. Bạn có thể mời học sinh ngay sau khi tạo.')),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-new-name' }, 'Tên lớp ', h('span', { class: 'cr-req' }, '*')), name),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-new-subject' }, 'Môn / khối'), subject),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-new-desc' }, 'Mô tả'), desc),
      h('button', { type: 'submit', hidden: true })),
    actions: [{ label: 'Hủy', variant: 'ghost' }, { label: 'Tạo lớp', variant: 'primary', icon: 'plus', onClick: submit }],
  });
  setTimeout(() => name.focus(), 50);
}

export async function joinByCode(ctx, raw) {
  const code = C.normCode(raw);
  if (code.length < 4) { toast('Mã lớp chưa đúng — mã gồm chữ in hoa và số, VD: VC7K2P.', { type: 'warning' }); return false; }
  try {
    const cls = await C.joinClass(code);
    invalidateClasses();
    toast(cls.alreadyMember ? 'Em đã ở trong lớp này.' : `Đã tham gia lớp ${cls.name}.`, { type: 'success' });
    ctx.navigate(`/classroom/${code}`);
    return true;
  } catch (err) { toast(errMsg(err), { type: 'error' }); return false; }
}

export function joinForm(ctx, { compact = false } = {}) {
  const input = h('input', { class: 'input cr-code-input', placeholder: 'Mã lớp, VD: VC7K2P', maxlength: 20, 'aria-label': 'Mã lớp', autocomplete: 'off', spellcheck: 'false' });
  input.addEventListener('input', () => { const p = input.selectionStart; input.value = input.value.toUpperCase(); input.setSelectionRange(p, p); });
  const btn = h('button', { class: 'btn btn--primary', type: 'submit' }, icon('plus'), 'Tham gia');
  return h('form', { class: `cr-joinform ${compact ? 'is-compact' : ''}`, onSubmit: async (e) => {
    e.preventDefault();
    if (!input.value.trim()) { input.focus(); return; }
    btn.classList.add('is-loading');
    await joinByCode(ctx, input.value);
    btn.classList.remove('is-loading');
  } }, h('span', { class: 'cr-joinform__icon' }, icon('hash')), input, btn);
}

export function openJoinDialog(ctx) {
  const input = h('input', { class: 'input cr-code-input cr-code-input--lg', id: 'cr-join-code', placeholder: 'VC7K2P', maxlength: 20, autocomplete: 'off', spellcheck: 'false' });
  input.addEventListener('input', () => { input.value = input.value.toUpperCase(); });
  const m = openModal({
    title: 'Tham gia lớp học',
    size: 'sm',
    className: 'cr-modal',
    content: h('form', { class: 'cr-form', onSubmit: async (e) => { e.preventDefault(); if (await joinByCode(ctx, input.value)) m.close(); } },
      h('p', { class: 'text-2' }, 'Nhập mã lớp thầy/cô gửi cho em. Em cũng có thể mở trực tiếp liên kết mời hoặc quét mã QR.'),
      h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-join-code' }, 'Mã lớp'), input),
      h('button', { type: 'submit', hidden: true })),
    actions: [{ label: 'Hủy', variant: 'ghost' }, { label: 'Tham gia', variant: 'primary', icon: 'plus', onClick: () => joinByCode(ctx, input.value) }],
  });
  setTimeout(() => input.focus(), 50);
}
