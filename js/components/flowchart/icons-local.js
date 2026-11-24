// V-Code Edu — Flowchart studio: extra icons (same 24×24 stroke style as components/icons.js).
import { s } from '../../core/dom.js';
import { icon } from '../icons.js';

export const FC_ICONS = {
  fit: '<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="9.5" r="1.8"/><path d="m21 16-5.5-5.5L5 20"/>',
  flow: '<rect x="8" y="2.5" width="8" height="4.5" rx="2.25"/><path d="M12 7v2.5"/><path d="M12 9.5 17 13l-5 3.5L7 13z"/><path d="M12 16.5V19"/><rect x="8" y="19" width="8" height="3" rx="1"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13"/>',
  ortho: '<path d="M5 4v7h14v9"/><path d="m16 17 3 3 3-3"/>',
  curve: '<path d="M5 4c0 9 14 5 14 16"/><path d="m16 17 3 3 3-3"/>',
  json: '<path d="M8 3H7a2 2 0 0 0-2 2v4a2 2 0 0 1-2 2 2 2 0 0 1 2 2v4a2 2 0 0 0 2 2h1"/><path d="M16 3h1a2 2 0 0 1 2 2v4a2 2 0 0 0 2 2 2 2 0 0 0-2 2v4a2 2 0 0 1-2 2h-1"/>',
  template: '<rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="5" rx="1.5"/><rect x="13" y="10" width="8" height="11" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/>',
  'python-out': '<path d="M14 3h7v7"/><path d="M21 3 11 13"/><path d="M19 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>',
  cursor: '<path d="m4 3 7 18 2.5-7.5L21 11z"/>',
};

export function fcIcon(name, opts) {
  if (!FC_ICONS[name]) return icon(name, opts);
  const el = s('svg', { class: 'icon', viewBox: '0 0 24 24', 'aria-hidden': 'true' });
  el.innerHTML = FC_ICONS[name];
  return el;
}

/** Mini shape preview for the palette (28×20 viewBox). */
export function shapeIcon(shape) {
  const el = s('svg', { class: 'fc-palette__shape', viewBox: '0 0 34 22', 'aria-hidden': 'true' });
  const d = {
    terminal: '<rect x="2" y="4" width="30" height="14" rx="7"/>',
    io: '<path d="M8 4h24l-6 14H2z"/>',
    process: '<rect x="2" y="4" width="30" height="14" rx="2"/>',
    decision: '<path d="M17 1.5 32 11 17 20.5 2 11z"/>',
    call: '<rect x="2" y="4" width="30" height="14" rx="1.5"/><path d="M6.5 4v14M27.5 4v14"/>',
  }[shape] || '';
  el.innerHTML = d;
  return el;
}
