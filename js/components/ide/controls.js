// V-Code Edu — editor controls shared by the IDE and the lesson workbench:
// keyboard-shortcut help, editor settings popover, editor theme switch, local SVG icons not in icons.js.
import { h } from '../../core/dom.js';
import { openModal } from '../../core/ui.js';
import { getEditorTheme, setEditorTheme, onEditorTheme, EDITOR_THEMES, resolvedEditorTheme } from './editor-theme.js';
import { getEditorSettings, setEditorSettings, onEditorSettings } from './settings.js';

const PATHS = {
  format: '<path d="M4 6h16"/><path d="M8 10h12"/><path d="M8 14h12"/><path d="M4 18h16"/><path d="m4 10 2 2-2 2"/>',
  keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.6-.8 1.6-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.7-1.6 1.6-1.6H16a5 5 0 0 0 5-5c0-4.1-4-7.3-9-7.3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  half: '<circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/>',
  wrap: '<path d="M3 6h18"/><path d="M3 12h15a3 3 0 0 1 0 6h-4"/><path d="m16 16-2 2 2 2"/><path d="M3 18h7"/>',
  flow: '<rect x="8" y="2.5" width="8" height="5" rx="2.5"/><path d="M12 7.5v3"/><path d="M12 10.5 17 14l-5 3.5L7 14z"/><path d="M12 17.5v4"/>',
  blocks: '<path d="M4 5h6l1 1.5h3L15 5h5v5H4z"/><path d="M4 13h9l1 1.5h3l1-1.5h2v5H4z"/>',
  split: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
  collapseLeft: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="m16 10-2 2 2 2"/>',
  expandLeft: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/><path d="m14 10 2 2-2 2"/>',
  fileAdd: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14h6"/>',
  files: '<path d="M15 3H8a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7z"/><path d="M15 3v4h4"/><path d="M4 7v12a2 2 0 0 0 2 2h9"/>',
  input: '<path d="M4 17V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M8 12h5"/><path d="m11 9 3 3-3 3"/>',
  output: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="m7 9 3 3-3 3"/><path d="M12 15h5"/>',
  eraser: '<path d="m7 21-4-4a1.4 1.4 0 0 1 0-2L14 4a1.4 1.4 0 0 1 2 0l5 5a1.4 1.4 0 0 1 0 2L11 21z"/><path d="M22 21H7"/><path d="m5 11 9 9"/>',
  goto: '<path d="M4 6h10M4 12h7M4 18h10"/><path d="m16 9 4 3-4 3"/>',
  findIcon: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  dup: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
};

/** Local SVG icon (for glyphs not in components/icons.js). */
export function xicon(name, cls = '') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('class', `icon ${cls}`.trim());
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = PATHS[name] || '';
  return el;
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform || '');
const MOD = isMac ? '⌘' : 'Ctrl';

export const SHORTCUTS = [
  ['Chạy chương trình', `${MOD}+Enter`],
  ['Lưu (tự động lưu trên thiết bị)', `${MOD}+S`],
  ['Định dạng mã', 'Shift+Alt+F'],
  ['Tìm', `${MOD}+F`],
  ['Tìm và thay thế', `${MOD}+H`],
  ['Đi tới dòng', `${MOD}+G`],
  ['Gợi ý code', `${MOD}+Space`],
  ['Chấp nhận gợi ý', 'Enter / Tab'],
  ['Nhân đôi dòng', `${MOD}+D`],
  ['Xóa dòng', `${MOD}+Shift+K`],
  ['Di chuyển dòng lên / xuống', 'Alt+↑ / Alt+↓'],
  ['Bật/tắt chú thích', `${MOD}+/`],
  ['Thụt lề / bỏ thụt lề', 'Tab / Shift+Tab'],
  ['Thoát khỏi trình soạn thảo (bàn phím)', 'Esc rồi Tab'],
  ['Bảng phím tắt này', 'F1'],
];

export function openShortcutsModal() {
  const kbd = (s) => s.split(/( \/ |\+)/).map((part) => (part === '+' || part === ' / ' ? h('span', { class: 'sc-sep' }, part.trim() || '+') : h('kbd', { class: 'kbd' }, part)));
  openModal({
    title: 'Phím tắt trình soạn thảo',
    size: 'md',
    content: h('div', { class: 'sc-table', role: 'table', 'aria-label': 'Phím tắt' },
      SHORTCUTS.map(([label, keys]) => h('div', { class: 'sc-row', role: 'row' }, h('span', { role: 'cell' }, label), h('span', { class: 'sc-keys', role: 'cell' }, kbd(keys))))),
    actions: [{ label: 'Đóng', variant: 'primary' }],
  });
}

/** Floating popover anchored to `anchor`; closes on outside click / Escape. Returns close(). */
export function openPopover(anchor, content, { className = '', align = 'end' } = {}) {
  document.querySelectorAll('.ide-pop').forEach((p) => p.__close?.());
  const pop = h('div', { class: `ide-pop ${className}`.trim(), role: 'dialog' }, content);
  document.body.appendChild(pop);
  const place = () => {
    const r = anchor.getBoundingClientRect();
    const pw = pop.offsetWidth;
    const ph = pop.offsetHeight;
    let left = align === 'end' ? r.right - pw : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    pop.style.left = `${Math.round(left)}px`;
    pop.style.top = `${Math.round(top)}px`;
  };
  place();
  anchor.setAttribute('aria-expanded', 'true');
  const onDoc = (e) => { if (!pop.contains(e.target) && !anchor.contains(e.target)) close(); };
  const onKey = (e) => { if (e.key === 'Escape') { close(); anchor.focus(); } };
  setTimeout(() => { document.addEventListener('pointerdown', onDoc, true); }, 0);
  document.addEventListener('keydown', onKey);
  window.addEventListener('resize', close);
  function close() {
    pop.remove();
    anchor.setAttribute('aria-expanded', 'false');
    document.removeEventListener('pointerdown', onDoc, true);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', close);
  }
  pop.__close = close;
  return close;
}

function seg(options, value, onPick, label) {
  const wrap = h('div', { class: 'segmented ide-seg', role: 'radiogroup', 'aria-label': label });
  const paint = (v) => wrap.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === String(v))));
  options.forEach(([v, text]) => wrap.appendChild(h('button', { type: 'button', dataset: { v: String(v) }, onClick: () => { onPick(v); paint(v); } }, text)));
  paint(value);
  return wrap;
}

function switchRow(label, key, hint) {
  const input = h('input', { type: 'checkbox', class: 'ide-switch__input', checked: getEditorSettings()[key] });
  input.addEventListener('change', () => setEditorSettings({ [key]: input.checked }));
  return h('label', { class: 'ide-switch' }, h('span', { class: 'ide-switch__text' }, h('span', null, label), hint ? h('small', null, hint) : null), input, h('span', { class: 'ide-switch__track', 'aria-hidden': 'true' }));
}

/** Editor settings popover content. */
export function openEditorSettings(anchor) {
  const s = getEditorSettings();
  const size = h('output', { class: 'ide-set__val' }, `${s.fontSize}px`);
  const range = h('input', { type: 'range', min: 11, max: 22, step: 1, value: s.fontSize, class: 'ide-range', 'aria-label': 'Cỡ chữ' });
  range.addEventListener('input', () => { size.textContent = `${range.value}px`; setEditorSettings({ fontSize: Number(range.value) }); });
  const content = h('div', { class: 'ide-set' },
    h('div', { class: 'ide-set__title' }, 'Cài đặt trình soạn thảo'),
    h('div', { class: 'ide-set__row' }, h('span', null, 'Giao diện editor'), seg(EDITOR_THEMES.map((t) => [t.id, t.short]), getEditorTheme(), (v) => setEditorTheme(v), 'Giao diện editor')),
    h('div', { class: 'ide-set__row' }, h('span', null, 'Cỡ chữ'), h('div', { class: 'ide-set__range' }, range, size)),
    h('div', { class: 'ide-set__row' }, h('span', null, 'Độ rộng thụt lề'), seg([['auto', 'Tự động'], [2, '2'], [4, '4']], s.tabSize, (v) => setEditorSettings({ tabSize: v }), 'Độ rộng thụt lề')),
    switchRow('Tự xuống dòng', 'wordWrap', 'Dòng dài được ngắt theo bề rộng khung'),
    switchRow('Tự đóng ngoặc và dấu nháy', 'autoClose'),
    switchRow('Gợi ý code khi gõ', 'autocomplete', `${MOD}+Space để mở thủ công`),
    switchRow('Kiểm tra lỗi khi gõ', 'diagnostics', 'Đánh dấu lỗi thường gặp ở lề trái'),
    h('button', { class: 'btn btn--ghost btn--sm ide-set__link', type: 'button', onClick: () => { close(); openShortcutsModal(); } }, xicon('keyboard'), 'Xem tất cả phím tắt (F1)'));
  const close = openPopover(anchor, content, { className: 'ide-pop--settings' });
  return close;
}

/** A compact button that cycles the editor theme (auto → light → dark) and shows the current state. */
export function createEditorThemeButton({ signal, compact = false } = {}) {
  const label = h('span', { class: 'ide-theme-btn__label' });
  const btn = h('button', { class: `btn btn--ghost btn--sm ide-theme-btn${compact ? ' btn--icon' : ''}`, type: 'button' }, xicon('half'), compact ? null : label);
  const paint = () => {
    const pref = getEditorTheme();
    const t = EDITOR_THEMES.find((x) => x.id === pref);
    label.textContent = `Editor: ${t.short}`;
    const tip = `Giao diện editor: ${t.label}${pref === 'auto' ? ` (đang ${resolvedEditorTheme() === 'dark' ? 'tối' : 'sáng'})` : ''} — bấm để đổi`;
    btn.title = tip;
    btn.setAttribute('aria-label', tip);
    btn.dataset.pref = pref;
  };
  btn.addEventListener('click', () => {
    const order = ['auto', 'light', 'dark'];
    setEditorTheme(order[(order.indexOf(getEditorTheme()) + 1) % order.length]);
  });
  paint();
  onEditorTheme(paint, { signal });
  return btn;
}

export { onEditorSettings };
