// V-Code Edu — Scratch component: "Scratch Live" (editor code as live blocks) + "Xưởng khối" (block studio).
//
//   createScratchStudio({ signal, getCode, onSendToEditor, onJumpToLine })
//     getCode(): { code, lang }   onSendToEditor(pythonCode)   onJumpToLine(line)
//   → { el, onCodeChange(code, lang), onShow(), destroy() }
import { h, s } from '../../core/dom.js';
import { createLive } from './live.js';
import { createStudio } from './studio.js';

const MODE_KEY = 'vc-scratch-mode';

function logo() {
  return s('svg', { class: 'sc-head__logo', viewBox: '0 0 32 32', 'aria-hidden': 'true' },
    s('rect', { x: 2, y: 3, width: 20, height: 11, rx: 3, fill: '#ffbe2e' }),
    s('rect', { x: 10, y: 12, width: 20, height: 9, rx: 3, fill: '#3f83f0' }),
    s('rect', { x: 4, y: 19, width: 18, height: 10, rx: 3, fill: '#3aa948' }),
    s('circle', { cx: 26, cy: 7, r: 3, fill: '#8458ee' }));
}
function modeIcon(kind) {
  const el = s('svg', { class: 'sc-mode-ico', viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  el.innerHTML = kind === 'live'
    ? '<path d="M4 6h7l1.5 1.5L14 6h6v4H4z"/><path d="M7 10v4h6v4H7"/><path d="M20 14h-3m3 4h-3"/>'
    : '<rect x="3" y="4" width="11" height="6" rx="1.5"/><rect x="8" y="14" width="11" height="6" rx="1.5"/><path d="M17 7h2a2 2 0 0 1 2 2v2"/><path d="M6 10v4"/>';
  return el;
}

export function createScratchStudio({ signal, getCode, onSendToEditor, onJumpToLine } = {}) {
  const ctrl = new AbortController();
  const sig = ctrl.signal;
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', () => destroy(), { once: true });
  }
  let mode = 'live';
  try { if (localStorage.getItem(MODE_KEY) === 'studio') mode = 'studio'; } catch { /* storage blocked */ }
  let studio = null;
  let destroyed = false;

  const live = createLive({
    onJumpToLine: (line) => onJumpToLine?.(line),
    onToStudio: () => { setMode('studio'); studio?.buildFromCode(); },
  });

  const liveBtn = h('button', { type: 'button', 'aria-pressed': 'false', onClick: () => setMode('live') }, modeIcon('live'), 'Scratch Live');
  const studioBtn = h('button', { type: 'button', 'aria-pressed': 'false', onClick: () => setMode('studio') }, modeIcon('studio'), 'Xưởng khối');
  const liveView = h('div', { class: 'sc-view', dataset: { view: 'live' } }, live.el);
  const studioView = h('div', { class: 'sc-view', dataset: { view: 'studio' }, hidden: true });
  const el = h('div', { class: 'sc-studio' },
    h('div', { class: 'sc-head' },
      h('span', { class: 'sc-head__brand' }, logo(), h('span', { class: 'sc-head__name' }, 'Scratch')),
      h('div', { class: 'sc-modes', role: 'group', 'aria-label': 'Chế độ Scratch' }, liveBtn, studioBtn)),
    h('div', { class: 'sc-body' }, liveView, studioView));

  function ensureStudio() {
    if (!studio) {
      studio = createStudio({ signal: sig, getCode, onSendToEditor: (code) => onSendToEditor?.(code) });
      studioView.appendChild(studio.el);
    }
    return studio;
  }

  function setMode(m) {
    if (destroyed) return;
    mode = m;
    try { localStorage.setItem(MODE_KEY, m); } catch { /* ignore */ }
    liveBtn.setAttribute('aria-pressed', String(m === 'live'));
    studioBtn.setAttribute('aria-pressed', String(m === 'studio'));
    liveView.hidden = m !== 'live';
    studioView.hidden = m !== 'studio';
    if (m === 'studio') {
      ensureStudio().show();
    } else {
      studio?.hide();
      const c = getCode?.();
      if (c) live.update(c.code, c.lang);
      requestAnimationFrame(() => live.relayout());
    }
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    studio?.hide();
    ctrl.abort();
    el.remove();
  }

  const first = getCode?.() || {};
  live.update(first.code ?? '', first.lang);
  setMode(mode);

  const api = {
    el,
    onCodeChange(code, lang) { if (!destroyed) live.update(code, lang); },
    onShow() {
      if (destroyed) return;
      if (mode === 'studio') ensureStudio().show();
      else requestAnimationFrame(() => live.relayout());
    },
    destroy,
  };
  // Test/debug hook (non-enumerable, no globals).
  Object.defineProperty(api, '_debug', { value: { get studio() { return ensureStudio(); }, live, setMode, get mode() { return mode; } } });
  return api;
}
