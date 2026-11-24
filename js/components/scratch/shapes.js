// V-Code Edu — Scratch shapes: SVG path builders for Scratch-genre blocks and a layout pass
// that measures HTML-laid-out blocks and writes the matching SVG outline behind each one.
import { s } from '../../core/dom.js';

export const R = 4;          // corner radius
export const NX = 12;        // notch offset from the left edge
export const NW = 20;        // notch width
export const ND = 5.2;       // notch depth
export const ARM = 16;       // C-block left arm width
export const HAT = 16;       // hat cap height

const NOTCH_R = 'c 1.5 0 2.5 .8 3.2 1.8 l 1.8 2.4 c .6 .8 1.3 1 2.3 1 h 5.4 c 1 0 1.7 -.2 2.3 -1 l 1.8 -2.4 c .7 -1 1.7 -1.8 3.2 -1.8';
const NOTCH_L = 'c -1.5 0 -2.5 .8 -3.2 1.8 l -1.8 2.4 c -.6 .8 -1.3 1 -2.3 1 h -5.4 c -1 0 -1.7 -.2 -2.3 -1 l -1.8 -2.4 c -.7 -1 -1.7 -1.8 -3.2 -1.8';

const f = (n) => Math.round(n * 10) / 10;

function topEdge(w, top) {
  if (top === 'hat') {
    const bw = Math.min(96, w - R);
    return `M 0 ${HAT} C ${f(bw * 0.22)} -5 ${f(bw * 0.78)} -5 ${f(bw)} ${HAT} H ${f(w - R)} Q ${f(w)} ${HAT} ${f(w)} ${HAT + R}`;
  }
  if (top === 'def') {
    const D = 14;
    return `M 0 ${D} Q 0 0 ${D} 0 H ${f(w - D)} Q ${f(w)} 0 ${f(w)} ${D}`;
  }
  return `M 0 ${R} Q 0 0 ${R} 0 H ${NX} ${NOTCH_R} H ${f(w - R)} Q ${f(w)} 0 ${f(w)} ${R}`;
}

function bottomEdge(w, h, cap) {
  const head = `V ${f(h - R)} Q ${f(w)} ${f(h)} ${f(w - R)} ${f(h)}`;
  const tab = cap ? '' : ` H ${NX + NW} ${NOTCH_L}`;
  return `${head}${tab} H ${R} Q 0 ${f(h)} 0 ${f(h - R)} Z`;
}

/** Plain stack / hat / cap block outline. */
export function stackPath(w, h, { top = 'notch', cap = false } = {}) {
  w = Math.max(w, NX + NW + R * 2 + 4);
  return `${topEdge(w, top)} ${bottomEdge(w, h, cap)}`;
}

/**
 * C-block outline. sections: [{ kind: 'row'|'mouth', y, h }] in block-box coordinates, must start and end with a row.
 */
export function cPath(w, h, sections, { top = 'notch', cap = false } = {}) {
  w = Math.max(w, ARM + NX + NW + R * 2 + 6);
  let d = topEdge(w, top);
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const next = sections[i + 1];
    if (sec.kind === 'row') {
      if (next && next.kind === 'mouth') {
        const yb = sec.y + sec.h;
        d += ` V ${f(yb - R)} Q ${f(w)} ${f(yb)} ${f(w - R)} ${f(yb)} H ${ARM + NX + NW} ${NOTCH_L} H ${ARM + R} Q ${ARM} ${f(yb)} ${ARM} ${f(yb + R)}`;
      } else if (!next) {
        d += ` ${bottomEdge(w, h, cap)}`;
      }
    } else {
      const yb = sec.y + sec.h;
      d += ` V ${f(yb - R)} Q ${ARM} ${f(yb)} ${ARM + R} ${f(yb)} H ${f(w - R)} Q ${f(w)} ${f(yb)} ${f(w)} ${f(yb + R)}`;
    }
  }
  if (sections[sections.length - 1]?.kind !== 'row') d += ` ${bottomEdge(w, h, cap)}`;
  return d;
}

export function reporterPath(w, h) {
  const r = h / 2;
  if (w < h) w = h;
  return `M ${f(r)} 0 H ${f(w - r)} A ${f(r)} ${f(r)} 0 0 1 ${f(w - r)} ${f(h)} H ${f(r)} A ${f(r)} ${f(r)} 0 0 1 ${f(r)} 0 Z`;
}

export function booleanPath(w, h) {
  const r = h / 2;
  if (w < h + 8) w = h + 8;
  return `M 0 ${f(r)} L ${f(r)} 0 H ${f(w - r)} L ${f(w)} ${f(r)} L ${f(w - r)} ${f(h)} H ${f(r)} Z`;
}

/** The SVG background element every block carries as its first child. */
export function makeBg() {
  return s('svg', { class: 'sc-b__bg', 'aria-hidden': 'true', focusable: 'false' }, s('path', { class: 'sc-b__path' }));
}

/**
 * Measure every `.sc-b` inside root (root included) and write its outline. Reads all geometry first,
 * then writes, so there is one layout per call. Safe to call on detached-but-rendered subtrees.
 */
export function layoutShapes(root) {
  if (!root) return;
  const list = root.matches?.('.sc-b') ? [root, ...root.querySelectorAll('.sc-b')] : [...root.querySelectorAll('.sc-b')];
  const jobs = [];
  for (const el of list) {
    const bg = el.firstElementChild;
    if (!bg || !bg.classList.contains('sc-b__bg')) continue;
    const shape = el.dataset.shape;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (!w && !h) continue;
    const job = { el, bg, shape, w, h, top: el.dataset.top || 'notch', cap: el.dataset.cap === '1' };
    if (shape === 'c') {
      const secs = [];
      let rowW = 0;
      for (const ch of el.children) {
        if (ch.classList.contains('sc-b__row')) {
          secs.push({ kind: 'row', y: ch.offsetTop, h: ch.offsetHeight });
          if (!ch.classList.contains('sc-b__row--foot')) rowW = Math.max(rowW, ch.offsetWidth);
        } else if (ch.classList.contains('sc-b__mouth')) {
          secs.push({ kind: 'mouth', y: ch.offsetTop, h: ch.offsetHeight });
        }
      }
      job.secs = secs;
      job.w = Math.max(rowW, ARM + NX + NW + R * 2 + 30);
    }
    jobs.push(job);
  }
  for (const j of jobs) {
    let d;
    if (j.shape === 'c') d = cPath(j.w, j.h, j.secs, { top: j.top, cap: j.cap });
    else if (j.shape === 'reporter') d = reporterPath(j.w, j.h);
    else if (j.shape === 'boolean') d = booleanPath(j.w, j.h);
    else d = stackPath(j.w, j.h, { top: j.top, cap: j.cap });
    j.bg.setAttribute('width', j.w);
    j.bg.setAttribute('height', j.h);
    j.bg.firstElementChild.setAttribute('d', d);
    if (j.shape === 'c') j.el.style.setProperty('--arm-w', `${j.w}px`);
  }
}
