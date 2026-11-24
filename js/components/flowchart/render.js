// V-Code Edu — Flowchart studio: SVG shapes, nodes, edges (shared by live view + designer).
import { s } from '../../core/dom.js';
import { LINE_H } from './model.js';

let defsSeq = 0;

/** <defs> with arrow markers. Returns { el, arrow, arrowActive, arrowSel } (url() references). */
export function makeDefs() {
  defsSeq += 1;
  const id = `fcdefs${defsSeq}`;
  const marker = (suffix, cls) => s('marker', {
    id: `${id}-${suffix}`, viewBox: '0 0 10 10', refX: '9', refY: '5', markerWidth: '7', markerHeight: '7',
    orient: 'auto-start-reverse', markerUnits: 'userSpaceOnUse',
  }, s('path', { d: 'M0 0.8 L10 5 L0 9.2 L2.6 5 z', class: cls }));
  const el = s('defs', null,
    marker('a', 'fc-arrow'),
    marker('b', 'fc-arrow fc-arrow--active'),
    marker('c', 'fc-arrow fc-arrow--sel'),
    marker('d', 'fc-arrow fc-arrow--err'),
  );
  return { el, arrow: `url(#${id}-a)`, arrowActive: `url(#${id}-b)`, arrowSel: `url(#${id}-c)`, arrowErr: `url(#${id}-d)` };
}

export function shapeEl(shape, w, h) {
  const hw = w / 2; const hh = h / 2;
  switch (shape) {
    case 'terminal':
      return s('rect', { class: 'fc-shape', x: -hw, y: -hh, width: w, height: h, rx: hh, ry: hh });
    case 'io': {
      const k = 12;
      return s('path', { class: 'fc-shape', d: `M${-hw + k} ${-hh} H${hw} L${hw - k} ${hh} H${-hw} Z` });
    }
    case 'decision':
      return s('path', { class: 'fc-shape', d: `M0 ${-hh} L${hw} 0 L0 ${hh} L${-hw} 0 Z` });
    case 'prep': {
      const k = 14;
      return s('path', { class: 'fc-shape', d: `M${-hw} 0 L${-hw + k} ${-hh} H${hw - k} L${hw} 0 L${hw - k} ${hh} H${-hw + k} Z` });
    }
    case 'call':
      return s('g', null,
        s('rect', { class: 'fc-shape', x: -hw, y: -hh, width: w, height: h, rx: 3 }),
        s('path', { class: 'fc-shape-inner', d: `M${-hw + 9} ${-hh} V${hh} M${hw - 9} ${-hh} V${hh}` }));
    default:
      return s('rect', { class: 'fc-shape', x: -hw, y: -hh, width: w, height: h, rx: 4 });
  }
}

export function textEl(lines, shape) {
  const cls = shape === 'terminal' ? 'fc-text fc-text--term' : 'fc-text';
  const n = lines.length;
  const y0 = -((n - 1) * LINE_H) / 2;
  return s('text', { class: cls, 'text-anchor': 'middle' },
    lines.map((ln, i) => s('tspan', { x: 0, y: y0 + i * LINE_H, dy: '0.35em' }, ln || ' ')));
}

/** Build a node group (centered at node.x, node.y). */
export function nodeEl(node, { extraClass = '', title } = {}) {
  const g = s('g', {
    class: `fc-node fc-cat-${node.cat} fc-shape-${node.shape} ${extraClass}`.trim(),
    transform: `translate(${node.x} ${node.y})`,
    'data-id': node.id,
  });
  if (title) g.appendChild(s('title', null, title));
  g.appendChild(shapeEl(node.shape, node.w, node.h));
  g.appendChild(textEl(node.lines, node.shape));
  return g;
}

/** Polyline → path with rounded corners. */
export function roundedPath(pts, r = 7) {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0][0]} ${pts[0][1]}`;
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1]; const [x, y] = pts[i]; const [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(x - px, y - py); const l2 = Math.hypot(nx - x, ny - y);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    if (rr < 0.5) { d += ` L${x} ${y}`; continue; }
    const ax = x - ((x - px) / l1) * rr; const ay = y - ((y - py) / l1) * rr;
    const bx = x + ((nx - x) / l2) * rr; const by = y + ((ny - y) / l2) * rr;
    d += ` L${ax} ${ay} Q${x} ${y} ${bx} ${by}`;
  }
  const l = pts[pts.length - 1];
  d += ` L${l[0]} ${l[1]}`;
  return d;
}

/** Smooth cubic path between two endpoints with directions. */
export function curvedPath(a, adir, b, bdir) {
  const dist = Math.max(40, Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.45);
  const v = (dir) => ({ down: [0, 1], up: [0, -1], right: [1, 0], left: [-1, 0] }[dir] || [0, 1]);
  const [ax, ay] = v(adir); const [bx, by] = v(bdir);
  const c1 = [a[0] + ax * dist, a[1] + ay * dist];
  const c2 = [b[0] - bx * dist, b[1] - by * dist];
  return `M${a[0]} ${a[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${b[0]} ${b[1]}`;
}

/** Label position for an edge that starts at pts[0] heading to pts[1]. */
export function labelPos(pts) {
  if (pts.length < 2) return null;
  const [x0, y0] = pts[0]; const [x1, y1] = pts[1];
  if (Math.abs(x1 - x0) < 0.5) {
    return y1 >= y0 ? { x: x0 + 7, y: y0 + 13, anchor: 'start' } : { x: x0 + 7, y: y0 - 7, anchor: 'start' };
  }
  return x1 > x0 ? { x: x0 + 8, y: y0 - 6, anchor: 'start' } : { x: x0 - 8, y: y0 - 6, anchor: 'end' };
}

export function edgeLabelEl(text, pos, kind) {
  if (!text || !pos) return null;
  return s('text', { class: `fc-elabel fc-elabel--${kind}`, x: pos.x, y: pos.y, 'text-anchor': pos.anchor }, text);
}

export function labelKind(label) {
  if (label === 'Đúng' || label === 'Còn') return 'yes';
  if (label === 'Sai' || label === 'Hết') return 'no';
  return 'plain';
}
