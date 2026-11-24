// V-Code Edu — find / replace bar for the textarea editor (Ctrl+F / Ctrl+H).
import { h } from '../../core/dom.js';

const svg = (d) => {
  const ns = 'http://www.w3.org/2000/svg';
  const el = document.createElementNS(ns, 'svg');
  el.setAttribute('viewBox', '0 0 24 24');
  el.setAttribute('class', 'icon');
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML = d;
  return el;
};
const I = {
  up: '<path d="m18 15-6-6-6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  replace: '<path d="M4 7h11a4 4 0 0 1 0 8H8"/><path d="m11 18-3-3 3-3"/>',
  replaceAll: '<path d="M3 6h12a3 3 0 0 1 0 6H7"/><path d="m10 15-3-3 3-3"/><path d="M14 18h7"/><path d="M14 21h7"/>',
};

/**
 * createFindBar({ root, textarea, getValue, setMatches(ranges, currentIndex), reveal(start, end), replaceRange(start, end, text), replaceAll(text), focusEditor() })
 */
export function createFindBar(api) {
  const findIn = h('input', { class: 'fb__input', type: 'text', placeholder: 'Tìm', 'aria-label': 'Tìm trong mã', spellcheck: 'false' });
  const replIn = h('input', { class: 'fb__input', type: 'text', placeholder: 'Thay bằng', 'aria-label': 'Thay thế bằng', spellcheck: 'false' });
  const count = h('span', { class: 'fb__count', 'aria-live': 'polite' }, '');
  const optCase = h('button', { class: 'fb__opt', type: 'button', title: 'Phân biệt chữ hoa/thường', 'aria-pressed': 'false' }, 'Aa');
  const optWord = h('button', { class: 'fb__opt', type: 'button', title: 'Khớp nguyên từ', 'aria-pressed': 'false' }, h('u', null, 'ab'));
  const optRe = h('button', { class: 'fb__opt', type: 'button', title: 'Biểu thức chính quy', 'aria-pressed': 'false' }, '.*');
  const btn = (icon, title, onClick) => h('button', { class: 'fb__btn', type: 'button', title, 'aria-label': title, onClick }, svg(icon));
  const toggle = h('button', { class: 'fb__toggle', type: 'button', title: 'Hiện/ẩn thay thế (Ctrl+H)', 'aria-label': 'Hiện hoặc ẩn ô thay thế', 'aria-expanded': 'false', onClick: () => setReplace(!replaceMode) }, svg(I.chevron));
  const rowFind = h('div', { class: 'fb__row' }, h('div', { class: 'fb__field' }, findIn, optCase, optWord, optRe), count,
    btn(I.up, 'Kết quả trước (Shift+Enter)', () => go(-1)), btn(I.down, 'Kết quả tiếp (Enter)', () => go(1)), btn(I.close, 'Đóng (Esc)', () => close()));
  const rowRepl = h('div', { class: 'fb__row fb__row--replace', hidden: true }, h('div', { class: 'fb__field' }, replIn),
    btn(I.replace, 'Thay thế (Enter)', () => replaceOne()), btn(I.replaceAll, 'Thay tất cả (Ctrl+Alt+Enter)', () => replaceEvery()));
  const el = h('div', { class: 'fb', role: 'search', hidden: true }, toggle, h('div', { class: 'fb__rows' }, rowFind, rowRepl));
  api.root.appendChild(el);

  let matches = [];
  let current = -1;
  let replaceMode = false;
  let isOpen = false;
  const opts = { cs: false, word: false, re: false };
  [[optCase, 'cs'], [optWord, 'word'], [optRe, 're']].forEach(([b, k]) => b.addEventListener('click', () => { opts[k] = !opts[k]; b.setAttribute('aria-pressed', String(opts[k])); search(true); findIn.focus(); }));

  function regex() {
    const q = findIn.value;
    if (!q) return null;
    let src = opts.re ? q : q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (opts.word) src = `\\b${src}\\b`;
    try { return new RegExp(src, opts.cs ? 'g' : 'gi'); } catch { return 'invalid'; }
  }

  function search(keepPos = false) {
    const re = regex();
    matches = [];
    findIn.classList.toggle('is-invalid', re === 'invalid');
    if (re && re !== 'invalid') {
      const v = api.getValue();
      let m;
      let guard = 0;
      while ((m = re.exec(v)) && guard++ < 5000) {
        if (!m[0].length) { re.lastIndex += 1; continue; }
        matches.push([m.index, m.index + m[0].length]);
      }
    }
    if (!matches.length) current = -1;
    else if (!keepPos || current < 0 || current >= matches.length) {
      const caret = api.textarea.selectionStart;
      current = matches.findIndex(([s]) => s >= caret);
      if (current < 0) current = 0;
    }
    paint();
  }

  function paint() {
    count.textContent = findIn.value ? (matches.length ? `${current + 1}/${matches.length}` : 'Không có kết quả') : '';
    count.classList.toggle('is-empty', Boolean(findIn.value) && !matches.length);
    api.setMatches(matches, current);
    if (current >= 0) api.reveal(...matches[current]);
  }

  function go(dir) {
    if (!matches.length) return;
    current = (current + dir + matches.length) % matches.length;
    paint();
  }

  function replaceOne() {
    if (current < 0 || !matches[current]) return;
    const [s, e] = matches[current];
    let text = replIn.value;
    if (opts.re) { const re = regex(); if (re && re !== 'invalid') text = api.getValue().slice(s, e).replace(new RegExp(re.source, re.flags.replace('g', '')), replIn.value); }
    api.replaceRange(s, e, text);
    search(true);
    replIn.focus();
  }

  function replaceEvery() {
    const re = regex();
    if (!re || re === 'invalid' || !matches.length) return;
    const n = matches.length;
    api.replaceAll(api.getValue().replace(re, opts.re ? replIn.value : () => replIn.value));
    search();
    count.textContent = `Đã thay ${n}`;
    replIn.focus();
  }

  function setReplace(on) {
    replaceMode = on;
    rowRepl.hidden = !on;
    toggle.setAttribute('aria-expanded', String(on));
    el.classList.toggle('is-replace', on);
  }

  function open({ replace = false } = {}) {
    const ta = api.textarea;
    const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    if (sel && !sel.includes('\n') && sel.length < 200) findIn.value = sel;
    setReplace(replace || replaceMode && isOpen);
    el.hidden = false;
    isOpen = true;
    search();
    (replace && findIn.value ? replIn : findIn).focus();
    findIn.select();
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    el.hidden = true;
    matches = [];
    api.setMatches([], -1);
    api.focusEditor();
  }

  findIn.addEventListener('input', () => search());
  const keys = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); findIn.select(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); setReplace(!replaceMode); return; }
  };
  findIn.addEventListener('keydown', (e) => {
    keys(e);
    if (e.key === 'Enter') { e.preventDefault(); go(e.shiftKey ? -1 : 1); }
  });
  replIn.addEventListener('keydown', (e) => {
    keys(e);
    if (e.key === 'Enter') { e.preventDefault(); if ((e.ctrlKey || e.metaKey) && e.altKey) replaceEvery(); else replaceOne(); }
  });

  return { el, open, close, isOpen: () => isOpen, refresh: () => { if (isOpen) search(true); } };
}
