// V-Prism — renderers. Each takes (host, state) and redraws. Colors come from CSS classes → theme-aware.
import { h, s, mount } from '../../core/dom.js';

const cls = (mark) => (mark ? `is-${mark}` : '');

// ---------- bars ----------
export function renderBars(host, st) {
  const values = st.values || [];
  const max = Math.max(1, ...values.map((v) => Math.abs(v)));
  const bars = values.map((v, i) => {
    const mark = st.marks?.[i];
    const inRange = !st.range || (i >= st.range[0] && i <= st.range[1]);
    return h('div', { class: `pz-bar ${cls(mark)} ${inRange ? '' : 'is-dim'}`, style: { '--h': `${Math.max(4, (Math.abs(v) / max) * 100)}%` } },
      h('span', { class: 'pz-bar__val' }, String(v)),
      h('span', { class: 'pz-bar__idx' }, String(i)),
      st.pointers ? h('span', { class: 'pz-bar__ptr' }, Object.entries(st.pointers).filter(([, idx]) => idx === i).map(([k]) => k).join(' ')) : null);
  });
  mount(host, h('div', { class: 'pz-bars', style: { '--n': String(values.length) } }, bars), st.aux ? renderCellsRow(st.aux) : null);
}

// ---------- array cells (one or more rows) ----------
function renderCellsRow(row) {
  return h('div', { class: 'pz-row' },
    row.label ? h('div', { class: 'pz-row__label' }, row.label) : null,
    h('div', { class: 'pz-cells' }, (row.values || []).map((v, i) => {
      const ptrs = row.pointers ? Object.entries(row.pointers).filter(([, idx]) => idx === i).map(([k]) => k) : [];
      return h('div', { class: `pz-cell ${cls(row.marks?.[i])}` },
        ptrs.length ? h('span', { class: 'pz-cell__ptr' }, ptrs.join(' ')) : null,
        h('span', { class: 'pz-cell__val' }, v === null || v === undefined ? '' : String(v)),
        row.indices === false ? null : h('span', { class: 'pz-cell__idx' }, String(row.indexOffset ? i + row.indexOffset : i)));
    })));
}

export function renderCells(host, st) {
  const rows = st.rows || [{ values: st.values, marks: st.marks, pointers: st.pointers, label: st.label }];
  mount(host, h('div', { class: 'pz-cellgrid' }, rows.map(renderCellsRow), st.note ? h('div', { class: 'pz-note' }, st.note) : null));
}

// ---------- linked list ----------
export function renderList(host, st) {
  const order = st.order || st.nodes.map((_, i) => i);
  const items = [];
  items.push(h('div', { class: 'pz-ll-head' }, 'head', h('span', { class: 'pz-arrow' }, '→')));
  order.forEach((idx, k) => {
    const n = st.nodes[idx];
    const ptrs = st.pointers ? Object.entries(st.pointers).filter(([, v]) => v === idx).map(([key]) => key) : [];
    items.push(h('div', { class: `pz-ll-node ${cls(st.marks?.[idx])}` },
      ptrs.length ? h('span', { class: 'pz-cell__ptr' }, ptrs.join(' ')) : null,
      h('span', { class: 'pz-ll-node__val' }, String(n.value)),
      h('span', { class: 'pz-ll-node__next' }, '•')));
    const isLast = k === order.length - 1;
    const reversed = st.reversedUpTo !== undefined && k < st.reversedUpTo;
    items.push(h('span', { class: `pz-arrow ${reversed ? 'is-rev' : ''}` }, isLast ? '→ null' : reversed ? '←' : '→'));
  });
  if (!order.length) items.push(h('span', { class: 'pz-arrow' }, 'null'));
  mount(host, h('div', { class: 'pz-ll' }, items), st.note ? h('div', { class: 'pz-note' }, st.note) : null);
}

// ---------- stack / queue ----------
export function renderStackQueue(host, st) {
  const kind = st.kind || 'stack';
  const items = st.items || [];
  const box = h('div', { class: `pz-sq pz-sq--${kind}` },
    items.map((v, i) => h('div', { class: `pz-sq__item ${cls(st.marks?.[i])}` }, String(v),
      kind === 'stack' && i === items.length - 1 ? h('span', { class: 'pz-sq__tag' }, 'đỉnh') : null,
      kind === 'queue' && i === 0 ? h('span', { class: 'pz-sq__tag' }, 'đầu') : null,
      kind === 'queue' && i === items.length - 1 && items.length > 1 ? h('span', { class: 'pz-sq__tag pz-sq__tag--end' }, 'cuối') : null)),
    !items.length ? h('div', { class: 'pz-sq__empty' }, 'rỗng') : null);
  const text = st.text ? h('div', { class: 'pz-tape' }, st.text.split('').map((ch, i) => h('span', { class: `pz-tape__ch ${i === st.cursor ? 'is-active' : i < st.cursor ? 'is-done' : ''} ${st.bad === i ? 'is-swap' : ''}` }, ch))) : null;
  const ops = st.ops ? h('div', { class: 'pz-ops' }, st.ops.map((o, i) => h('span', { class: `pz-op ${i === st.opIndex ? 'is-active' : i < st.opIndex ? 'is-done' : ''}` }, o))) : null;
  mount(host, h('div', { class: 'pz-sq-wrap' }, ops, text, box, st.output !== undefined ? h('div', { class: 'pz-note' }, `Kết quả: ${st.output}`) : null));
}

// ---------- binary tree / heap ----------
function layoutTree(nodes, root) {
  // in-order x positions, depth y positions
  const pos = {};
  let x = 0;
  let maxDepth = 0;
  const walk = (id, depth) => {
    if (id === null || id === undefined || !nodes[id]) return;
    walk(nodes[id].left, depth + 1);
    pos[id] = { x: x++, y: depth };
    maxDepth = Math.max(maxDepth, depth);
    walk(nodes[id].right, depth + 1);
  };
  walk(root, 0);
  return { pos, count: x, maxDepth };
}

export function renderTree(host, st) {
  const { nodes = {}, root = null } = st;
  const { pos, count, maxDepth } = layoutTree(nodes, root);
  const gapX = 52;
  const gapY = 62;
  const W = Math.max(320, count * gapX + 40);
  const H = Math.max(140, (maxDepth + 1) * gapY + 30);
  const cx = (id) => 20 + gapX / 2 + pos[id].x * gapX;
  const cy = (id) => 30 + pos[id].y * gapY;
  const edges = [];
  const circles = [];
  Object.keys(pos).forEach((id) => {
    const n = nodes[id];
    for (const child of [n.left, n.right]) {
      if (child !== null && child !== undefined && pos[child]) {
        edges.push(s('line', { class: `pz-edge ${cls(st.edgeMarks?.[`${id}-${child}`])}`, x1: cx(id), y1: cy(id), x2: cx(child), y2: cy(child) }));
      }
    }
  });
  Object.keys(pos).forEach((id) => {
    const n = nodes[id];
    circles.push(s('g', { class: `pz-node ${cls(st.marks?.[id])}`, transform: `translate(${cx(id)},${cy(id)})` },
      s('circle', { r: 19 }),
      s('text', { 'text-anchor': 'middle', dy: '0.35em' }, String(n.value)),
      st.labels?.[id] !== undefined ? s('text', { class: 'pz-node__label', 'text-anchor': 'middle', y: 34 }, String(st.labels[id])) : null));
  });
  const svg = s('svg', { class: 'pz-svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Cây nhị phân' }, edges, circles);
  mount(host,
    count ? h('div', { class: 'pz-scroll' }, svg) : h('div', { class: 'pz-note' }, 'Cây rỗng'),
    st.array ? renderCellsRow({ label: st.arrayLabel || 'Mảng', values: st.array, marks: st.arrayMarks, pointers: st.arrayPointers }) : null,
    st.output ? h('div', { class: 'pz-note' }, `${st.outputLabel || 'Thứ tự duyệt'}: `, h('strong', { class: 'mono' }, st.output.join(' → ') || '—')) : null,
    st.side ? renderSide(st.side) : null);
}

// ---------- graph ----------
function renderSide(side) {
  return h('div', { class: 'pz-side' }, h('span', { class: 'pz-side__title' }, side.title), h('div', { class: 'pz-side__items' }, (side.items || []).length ? side.items.map((it, i) => h('span', { class: `pz-chip ${i === 0 && side.highlightFirst ? 'is-active' : ''}` }, String(it))) : h('span', { class: 'muted' }, 'rỗng')));
}

export function renderGraph(host, st) {
  const { nodes = [], edges = [] } = st;
  const W = 640;
  const H = 360;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const lines = edges.map((e) => {
    const a = byId[e.u];
    const b = byId[e.v];
    if (!a || !b) return null;
    const key = `${e.u}-${e.v}`;
    const mark = st.edgeMarks?.[key] || st.edgeMarks?.[`${e.v}-${e.u}`];
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    return s('g', { class: `pz-gedge ${cls(mark)}` },
      s('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y }),
      e.w !== undefined && st.weighted !== false ? s('g', { transform: `translate(${mx},${my})` }, s('rect', { x: -11, y: -10, width: 22, height: 20, rx: 6 }), s('text', { 'text-anchor': 'middle', dy: '0.35em' }, String(e.w))) : null);
  });
  const circles = nodes.map((n) => s('g', { class: `pz-node ${cls(st.marks?.[n.id])}`, transform: `translate(${n.x},${n.y})` },
    s('circle', { r: 21 }),
    s('text', { 'text-anchor': 'middle', dy: '0.35em' }, n.label || n.id),
    st.dist && st.dist[n.id] !== undefined ? s('text', { class: 'pz-node__label', 'text-anchor': 'middle', y: -30 }, st.dist[n.id] === Infinity ? '∞' : String(st.dist[n.id])) : null));
  mount(host,
    h('div', { class: 'pz-scroll' }, s('svg', { class: 'pz-svg pz-svg--graph', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Đồ thị' }, lines, circles)),
    h('div', { class: 'pz-side-row' },
      st.side ? renderSide(st.side) : null,
      st.order ? h('div', { class: 'pz-side' }, h('span', { class: 'pz-side__title' }, st.orderLabel || 'Thứ tự thăm'), h('div', { class: 'pz-side__items' }, st.order.length ? st.order.map((x) => h('span', { class: 'pz-chip' }, x)) : h('span', { class: 'muted' }, '—'))) : null),
    st.matrix ? renderMatrix(st.matrix) : null,
    st.adjList ? h('div', { class: 'pz-adj' }, Object.entries(st.adjList).map(([k, vs]) => h('div', { class: `pz-adj__row ${st.marks?.[k] ? cls(st.marks[k]) : ''}` }, h('strong', { class: 'mono' }, `${k}:`), vs.map((v) => h('span', { class: 'pz-chip' }, v))))) : null);
}

function renderMatrix(m) {
  return h('div', { class: 'pz-scroll' }, h('table', { class: 'pz-table' },
    h('thead', null, h('tr', null, h('th', null, ''), m.labels.map((l) => h('th', null, l)))),
    h('tbody', null, m.rows.map((r, i) => h('tr', null, h('th', null, m.labels[i]), r.map((v, j) => h('td', { class: cls(m.marks?.[`${i},${j}`]) }, String(v))))))));
}

// ---------- DP / generic table ----------
export function renderTable(host, st) {
  mount(host, h('div', { class: 'pz-scroll' }, h('table', { class: 'pz-table pz-table--dp' },
    st.colLabels ? h('thead', null, h('tr', null, h('th', { class: 'pz-table__corner' }, st.corner || ''), st.colLabels.map((l, j) => h('th', { class: cls(st.colMarks?.[j]) }, String(l))))) : null,
    h('tbody', null, st.cells.map((row, i) => h('tr', null,
      st.rowLabels ? h('th', { class: cls(st.rowMarks?.[i]) }, String(st.rowLabels[i])) : null,
      row.map((v, j) => h('td', { class: cls(st.marks?.[`${i},${j}`]) }, v === null || v === undefined ? '' : String(v)))))))),
  st.extra ? renderCellsRow(st.extra) : null,
  st.note ? h('div', { class: 'pz-note' }, st.note) : null);
}

// ---------- recursion call tree ----------
export function renderCallTree(host, st) {
  const nodes = st.nodes || [];
  if (!nodes.length) { mount(host, h('div', { class: 'pz-note' }, 'Chưa có lời gọi nào')); return; }
  // layout: leaves get sequential x, parents centered over children
  const children = {};
  nodes.forEach((n) => { if (n.parent !== null) (children[n.parent] = children[n.parent] || []).push(n.id); });
  const pos = {};
  let leaf = 0;
  const place = (id, depth) => {
    const ch = children[id] || [];
    if (!ch.length) { pos[id] = { x: leaf++, y: depth }; return; }
    ch.forEach((c) => place(c, depth + 1));
    pos[id] = { x: (pos[ch[0]].x + pos[ch[ch.length - 1]].x) / 2, y: depth };
  };
  place(nodes[0].id, 0);
  const gapX = 70;
  const gapY = 64;
  const maxY = Math.max(...Object.values(pos).map((p) => p.y));
  const W = Math.max(320, leaf * gapX + 40);
  const H = (maxY + 1) * gapY + 30;
  const X = (id) => 20 + gapX / 2 + pos[id].x * gapX;
  const Y = (id) => 28 + pos[id].y * gapY;
  const edges = nodes.filter((n) => n.parent !== null && pos[n.parent]).map((n) => s('line', { class: `pz-edge ${n.status === 'active' ? 'is-active' : ''}`, x1: X(n.parent), y1: Y(n.parent), x2: X(n.id), y2: Y(n.id) }));
  const boxes = nodes.map((n) => s('g', { class: `pz-call ${cls(n.status)}`, transform: `translate(${X(n.id)},${Y(n.id)})` },
    s('rect', { x: -31, y: -14, width: 62, height: 28, rx: 8 }),
    s('text', { 'text-anchor': 'middle', dy: '0.35em' }, n.label),
    n.result !== undefined ? s('text', { class: 'pz-node__label', 'text-anchor': 'middle', y: 28 }, `= ${n.result}`) : null));
  mount(host, h('div', { class: 'pz-scroll' }, s('svg', { class: 'pz-svg', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Cây lời gọi đệ quy' }, edges, boxes)),
    st.stack ? renderSide({ title: 'Ngăn xếp lời gọi (đỉnh bên trái)', items: [...st.stack].reverse(), highlightFirst: true }) : null,
    st.memo ? renderCellsRow({ label: 'Bảng nhớ', values: st.memo, marks: st.memoMarks }) : null);
}

// ---------- hash table ----------
export function renderHash(host, st) {
  const rows = st.buckets.map((b, i) => h('div', { class: `pz-bucket ${cls(st.marks?.[i])}` },
    h('span', { class: 'pz-bucket__idx mono' }, String(i)),
    st.mode === 'chain'
      ? h('div', { class: 'pz-bucket__chain' }, b.length ? b.map((k, j) => [j ? h('span', { class: 'pz-arrow' }, '→') : null, h('span', { class: `pz-chip ${st.keyMark?.[i] === j ? 'is-active' : ''}` }, String(k))]) : h('span', { class: 'muted' }, '∅'))
      : h('div', { class: 'pz-bucket__chain' }, b === null || b === undefined ? h('span', { class: 'muted' }, '∅') : b === '☠' ? h('span', { class: 'pz-chip is-dim' }, 'đã xóa') : h('span', { class: `pz-chip ${st.keyMark?.[i] === 0 ? 'is-active' : ''}` }, String(b)))));
  mount(host, h('div', { class: 'pz-hash' }, rows), st.note ? h('div', { class: 'pz-note' }, st.note) : null);
}

// ---------- tower of hanoi ----------
export function renderHanoi(host, st) {
  const n = st.n;
  const names = ['A', 'B', 'C'];
  mount(host, h('div', { class: 'pz-hanoi' }, st.pegs.map((peg, p) => h('div', { class: `pz-peg ${st.from === p ? 'is-from' : ''} ${st.to === p ? 'is-to' : ''}` },
    h('div', { class: 'pz-peg__rod' }),
    h('div', { class: 'pz-peg__disks' }, peg.map((d) => h('div', { class: `pz-disk ${st.moving === d ? 'is-active' : ''}`, style: { width: `${30 + (d / n) * 70}%`, '--hue': String(200 + d * 25) } }, String(d)))),
    h('div', { class: 'pz-peg__name' }, `Cọc ${names[p]}`)))),
  h('div', { class: 'pz-note' }, `Số bước đã đi: ${st.moves} / ${2 ** n - 1}`));
}

export const RENDERERS = {
  bars: renderBars,
  cells: renderCells,
  list: renderList,
  stackqueue: renderStackQueue,
  tree: renderTree,
  graph: renderGraph,
  table: renderTable,
  calltree: renderCallTree,
  hash: renderHash,
  hanoi: renderHanoi,
};
