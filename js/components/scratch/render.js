// V-Code Edu — Scratch DOM builders shared by Scratch Live and the block studio.
// Blocks are laid out with HTML/flexbox; shapes.js then draws the SVG outline behind each one.
import { h, s } from '../../core/dom.js';
import { makeBg } from './shapes.js';

/** Category palette (ids are stable; colours live in css/pages/scratch.css). */
export const CATS = {
  events: { name: 'Sự kiện' },
  motion: { name: 'Chuyển động' },
  looks: { name: 'Hiển thị' },
  sound: { name: 'Âm thanh' },
  control: { name: 'Điều khiển' },
  sensing: { name: 'Cảm biến' },
  operators: { name: 'Phép toán' },
  variables: { name: 'Biến' },
  pen: { name: 'Bút vẽ' },
  functions: { name: 'Hàm' },
  other: { name: 'Lệnh khác' },
};

/* Local glyphs (icons.js is shared and must not be edited). */
const GLYPHS = {
  flag: '<path d="M6 21V4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6 4.5c3-1.6 5.4 1.4 8.5 0S19 3.6 19 3.6v9c-1.6.9-3.2 1.7-4.6 1.1C11.4 12.5 9 15 6 13.4z" fill="#3fbf4f" stroke="#1f8a2e" stroke-width="1.3" stroke-linejoin="round"/>',
  'turn-right': '<path d="M18 9a7 7 0 1 0 1.7 6.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M19.5 3.5v6h-6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  'turn-left': '<path d="M6 9a7 7 0 1 1-1.7 6.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M4.5 3.5v6h6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  loop: '<path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="m15 3 3 3-3 3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="m9 21-3-3 3-3" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  play: '<path d="M8 5.5v13l10-6.5z" fill="currentColor"/>',
  note: '<path d="M9 18V6l10-2v12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="6.5" cy="18" r="2.6" fill="currentColor"/><circle cx="16.5" cy="16" r="2.6" fill="currentColor"/>',
  pen: '<path d="m4 20 1.2-4.6L15.6 5a2 2 0 0 1 2.8 0l.6.6a2 2 0 0 1 0 2.8L8.6 18.8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M4 20l4.6-1.2" stroke="currentColor" stroke-width="2"/>',
  stop: '<path d="M8.2 2.5h7.6l5.7 5.7v7.6l-5.7 5.7H8.2l-5.7-5.7V8.2z" fill="#e5484d" stroke="#b42b31" stroke-width="1.4"/>',
};

export function glyph(name, cls = '') {
  const el = s('svg', { class: `sc-glyph ${cls}`.trim(), viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' });
  el.innerHTML = GLYPHS[name] || '';
  return el;
}

/**
 * Block shell. shape: 'stack' | 'c' | 'reporter' | 'boolean'; top: 'notch' | 'hat' | 'def'; cap: no bottom tab.
 */
export function blockEl({ cat, shape = 'stack', top = 'notch', cap = false, cls = '', props = {} }, ...children) {
  const el = h('div', {
    class: `sc-b ${cls}`.trim(),
    dataset: { cat, shape, top: shape === 'reporter' || shape === 'boolean' ? undefined : top, cap: cap ? '1' : undefined },
    ...props,
  });
  el.appendChild(makeBg());
  for (const c of children.flat()) if (c) el.appendChild(c);
  return el;
}

export function rowEl(...parts) {
  return h('div', { class: 'sc-b__row' }, ...parts);
}

export function mouthEl(stack) {
  return h('div', { class: 'sc-b__mouth' }, stack);
}

export function footEl(arrow = false) {
  return h('div', { class: 'sc-b__row sc-b__row--foot' }, arrow ? glyph('loop', 'sc-foot-arrow') : null);
}

export function lbl(text) {
  return h('span', { class: 'sc-lbl' }, text);
}

/** Read-only literal pill (white rounded slot). */
export function litPill(text, { mono = false, title } = {}) {
  return h('span', { class: `sc-pill${mono ? ' sc-pill--mono' : ''}`, title }, text === '' ? ' ' : text);
}

export function stackEl(...blocks) {
  return h('div', { class: 'sc-stack' }, ...blocks);
}

/** Text width measurement for auto-sized inputs (canvas, no layout). */
let measureCtx = null;
export function textWidth(text, font = '600 12px "Be Vietnam Pro", system-ui, sans-serif') {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  measureCtx.font = font;
  return measureCtx.measureText(String(text)).width;
}
