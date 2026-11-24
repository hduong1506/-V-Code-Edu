// V-Code Edu — Flowchart studio: structured layout of a program tree.
// Each construct becomes a "fragment" laid out around a vertical axis (x = 0, top y = 0):
//   sequences stack vertically, if/else branches sit side by side and merge, loops get a back-edge rail
//   on the left and an exit rail on the right; break / continue are routed to those rails.
// Invariant: every dangling "out" of a fragment ends at y = frag.h (any x); consumers add the elbow to the axis.
import { nodeSize } from './model.js';

const G = 30;      // vertical gap between stacked items
const CG = 40;     // gap between side-by-side columns
const RAIL = 24;   // distance of loop rails from the body
const MG = 18;     // merge gap below branches
const CHART_GAP = 90;

let seqNo = 0;
function mk(kind, text, line, extra = {}) {
  const size = nodeSize(kind, text);
  seqNo += 1;
  return { id: `n${seqNo}`, kind, text, line, ...size, x: 0, y: 0, ...extra };
}

function emptyFrag(lead = null) {
  return { nodes: [], edges: [], outs: [], jumps: [], dots: [], left: 0, right: 0, h: 0, entry: null, empty: true, lead };
}

function nodeFrag(node, flows = true) {
  node.x = 0; node.y = 0;
  return {
    nodes: [node], edges: [], dots: [], jumps: [],
    outs: flows ? [{ from: node.id, port: 'out', pts: [[0, node.h]] }] : [],
    left: node.w / 2, right: node.w / 2, h: node.h, entry: node.id, empty: false, lead: null,
  };
}

function shift(f, dx, dy) {
  const mv = (p) => [p[0] + dx, p[1] + dy];
  for (const n of f.nodes) { n.x += dx; n.y += dy; }
  for (const e of f.edges) e.pts = e.pts.map(mv);
  for (const o of f.outs) o.pts = o.pts.map(mv);
  for (const j of f.jumps) j.pts = j.pts.map(mv);
  f.dots = f.dots.map(mv);
  return f;
}

const last = (pts) => pts[pts.length - 1];

/** Extend an out (ending at y = fromY) down to the axis entry at (0, top). */
function toEntry(pts, fromY, top) {
  const [x] = last(pts);
  if (Math.abs(x) < 0.5) return [...pts, [0, top]];
  const my = fromY + (top - fromY) / 2;
  return [...pts, [x, my], [0, my], [0, top]];
}

function append(A, B) {
  const top = A.h + G;
  shift(B, 0, top);
  for (const o of A.outs) A.edges.push({ from: o.from, port: o.port, label: o.label, to: B.entry, pts: toEntry(o.pts, A.h, top) });
  A.nodes.push(...B.nodes);
  A.edges.push(...B.edges);
  A.jumps.push(...B.jumps);
  A.dots.push(...B.dots);
  A.outs = B.outs;
  A.h = top + B.h;
  A.left = Math.max(A.left, B.left);
  A.right = Math.max(A.right, B.right);
  return A;
}

function seq(stmts, ctx) {
  let acc = null;
  for (const st of stmts || []) {
    if (!st || st.k === 'pass') continue;
    if (st.k === 'break' || st.k === 'continue') {
      if (!acc) return emptyFrag(st.k);
      for (const o of acc.outs) acc.jumps.push({ ...o, type: st.k, pts: [...o.pts, [0, last(o.pts)[1] + 10]] });
      acc.outs = [];
      return acc; // the rest of the block is unreachable
    }
    const f = stmtFrag(st, ctx);
    if (!f || f.empty) continue;
    if (!acc) acc = f; else append(acc, f);
  }
  return acc || emptyFrag();
}

function stmtFrag(st, ctx) {
  switch (st.k) {
    case 'process': return nodeFrag(mk('process', st.text, st.line, { designText: st.designText }));
    case 'call': return nodeFrag(mk('call', st.text, st.line, { designText: st.designText }));
    case 'input': return nodeFrag(mk('input', st.text, st.line, { designText: st.designText }));
    case 'output': return nodeFrag(mk('output', st.text, st.line, { designText: st.designText }));
    case 'return':
    case 'exit': return nodeFrag(mk('return', st.text || 'Kết thúc', st.line), false);
    case 'if': return ifFrag(st, ctx);
    case 'while': return loopFrag({ kind: 'decision', label: st.cond, line: st.line, body: st.body });
    case 'foreach': return loopFrag({ kind: 'foreach', label: st.text, line: st.line, body: st.body });
    case 'for': {
      const loop = loopFrag({ kind: 'decision', label: st.cond, line: st.line, body: st.body, update: st.update });
      if (!st.init) return loop;
      const f = nodeFrag(mk('process', st.init.text, st.line, { designText: st.init.designText }));
      return append(f, loop);
    }
    case 'dowhile': return doWhileFrag(st);
    default: return null;
  }
}

function ifFrag(st, ctx) {
  const D = mk('decision', st.cond, st.line);
  const dw = D.w; const dh = D.h;
  const T = seq(st.then, ctx);
  const E = st.else ? seq(st.else, ctx) : emptyFrag();
  const F = { nodes: [D], edges: [], outs: [], jumps: [], dots: [], left: dw / 2, right: dw / 2, h: dh, entry: D.id, empty: false, lead: null };

  // "if c: break/continue" (no else) → the jump leaves from a side vertex, normal flow continues downward
  if (T.lead && E.empty && !E.lead) {
    const side = T.lead === 'break' ? 1 : (ctx.continueSide === 'left' ? -1 : 1);
    F.jumps.push({ type: T.lead, from: D.id, port: 'yes', label: 'Đúng', pts: [[side * dw / 2, dh / 2]] });
    F.outs.push({ from: D.id, port: 'no', label: 'Sai', pts: [[0, dh]] });
    return F;
  }

  // no else: true branch straight down, false branch bypasses on the right
  if (E.empty && !E.lead) {
    const top = dh + G;
    let mergeY;
    if (T.empty) {
      mergeY = dh + G;
      F.outs.push({ from: D.id, port: 'yes', label: 'Đúng', pts: [[0, dh], [0, mergeY]] });
    } else {
      shift(T, 0, top);
      F.edges.push({ from: D.id, port: 'yes', label: 'Đúng', to: T.entry, pts: [[0, dh], [0, top]] });
      mergeY = top + T.h + MG;
      F.nodes.push(...T.nodes); F.edges.push(...T.edges); F.jumps.push(...T.jumps); F.dots.push(...T.dots);
      for (const o of T.outs) F.outs.push({ ...o, pts: [...o.pts, [last(o.pts)[0], mergeY], [0, mergeY]] });
      F.left = Math.max(F.left, T.left);
    }
    const xb = Math.max(T.right, dw / 2) + RAIL;
    F.outs.push({ from: D.id, port: 'no', label: 'Sai', pts: [[dw / 2, dh / 2], [xb, dh / 2], [xb, mergeY], [0, mergeY]] });
    F.right = xb + 6;
    F.h = mergeY;
    if (F.outs.length >= 2) F.dots.push([0, mergeY]);
    return F;
  }

  // if / else: branches side by side
  const colTop = dh + Math.round(G * 0.7);
  const branches = [
    { f: T, port: 'yes', label: 'Đúng', sign: -1 },
    { f: E, port: 'no', label: 'Sai', sign: 1 },
  ];
  // a lone jump branch should sit on the side its rail is on (avoids crossing the other column)
  const jumpDir = (f) => (f.lead === 'break' ? 1 : (ctx.continueSide === 'left' ? -1 : 1));
  if ((T.lead && !E.lead && jumpDir(T) === 1) || (E.lead && !T.lead && jumpDir(E) === -1)) {
    branches[0].sign = 1; branches[1].sign = -1;
  }
  for (const b of branches) {
    const vx = b.sign * dw / 2;
    if (b.f.lead) {
      const dir = b.f.lead === 'break' ? 1 : (ctx.continueSide === 'left' ? -1 : 1);
      const pts = [[vx, dh / 2]];
      if (dir !== b.sign) pts.push([vx, dh + 8]); // step below the diamond before crossing the axis
      F.jumps.push({ type: b.f.lead, from: D.id, port: b.port, label: b.label, pts });
      b.x = vx; b.h = 0;
      continue;
    }
    if (b.f.empty) { b.x = vx; b.h = 0; continue; }
    b.x = b.sign < 0 ? Math.min(-(b.f.right + CG / 2), vx) : Math.max(b.f.left + CG / 2, vx);
    b.h = b.f.h;
  }
  const mergeY = colTop + Math.max(branches[0].h, branches[1].h) + MG;
  for (const b of branches) {
    const vx = b.sign * dw / 2;
    if (b.f.lead) continue;
    if (b.f.empty) {
      F.outs.push({ from: D.id, port: b.port, label: b.label, pts: [[vx, dh / 2], [vx, mergeY], [0, mergeY]] });
      continue;
    }
    shift(b.f, b.x, colTop);
    F.edges.push({ from: D.id, port: b.port, label: b.label, to: b.f.entry, pts: [[vx, dh / 2], [b.x, dh / 2], [b.x, colTop]] });
    F.nodes.push(...b.f.nodes); F.edges.push(...b.f.edges); F.jumps.push(...b.f.jumps); F.dots.push(...b.f.dots);
    for (const o of b.f.outs) F.outs.push({ ...o, pts: [...o.pts, [last(o.pts)[0], mergeY], [0, mergeY]] });
    if (b.sign < 0) F.left = Math.max(F.left, -b.x + b.f.left);
    else F.right = Math.max(F.right, b.x + b.f.right);
  }
  F.h = mergeY;
  if (F.outs.length === 1) F.outs[0].pts = F.outs[0].pts.slice(0, -1); // single out keeps its own column
  if (F.outs.length >= 2) F.dots.push([0, mergeY]);
  return F;
}

function loopFrag({ kind, label, line, body, update }) {
  const D = mk(kind, label, line);
  const dw = D.w; const dh = D.h;
  const yes = kind === 'foreach' ? 'Còn' : 'Đúng';
  const no = kind === 'foreach' ? 'Hết' : 'Sai';
  let B;
  if (update) {
    const B0 = seq(body, { continueSide: 'right' });
    const U = nodeFrag(mk('process', update.text, update.line, { designText: update.designText }));
    if (B0.empty) {
      B = U;
    } else {
      const conts = B0.jumps.filter((j) => j.type === 'continue');
      B0.jumps = B0.jumps.filter((j) => j.type !== 'continue');
      const xc = Math.max(B0.right, dw / 2) + RAIL / 2;
      const top = B0.h + G;
      append(B0, U);
      for (const j of conts) {
        const [px, py] = last(j.pts);
        B0.edges.push({ from: j.from, port: j.port, label: j.label, to: U.entry, pts: [...j.pts, [xc, py], [xc, top - G / 2], [0, top - G / 2], [0, top]] });
      }
      if (conts.length) B0.right = Math.max(B0.right, xc + 4);
      B = B0;
    }
  } else {
    B = seq(body, { continueSide: 'left' });
  }
  const F = { nodes: [D], edges: [], outs: [], jumps: [], dots: [], left: dw / 2, right: dw / 2, h: dh, entry: D.id, empty: false, lead: null };
  const top = dh + G;
  const xL = -(Math.max(B.left, dw / 2) + RAIL);
  const xR = Math.max(B.right, dw / 2) + RAIL;
  const toD = [[xL, dh / 2], [-dw / 2, dh / 2]];
  let loopBottom;
  const breaks = [];
  if (B.empty) {
    loopBottom = dh + G;
    if (B.lead === 'break') breaks.push({ from: D.id, port: 'yes', label: yes, pts: [[0, dh], [0, loopBottom]] });
    else F.edges.push({ from: D.id, port: 'yes', label: yes, to: D.id, back: true, pts: [[0, dh], [0, loopBottom], [xL, loopBottom], ...toD] });
  } else {
    shift(B, 0, top);
    F.edges.push({ from: D.id, port: 'yes', label: yes, to: B.entry, pts: [[0, dh], [0, top]] });
    F.nodes.push(...B.nodes); F.edges.push(...B.edges); F.dots.push(...B.dots);
    loopBottom = top + B.h + MG;
    for (const o of B.outs) F.edges.push({ from: o.from, port: o.port, label: o.label, to: D.id, back: true, pts: [...o.pts, [last(o.pts)[0], loopBottom], [xL, loopBottom], ...toD] });
    for (const j of B.jumps) {
      const [, py] = last(j.pts);
      if (j.type === 'continue') F.edges.push({ from: j.from, port: j.port, label: j.label, to: D.id, back: true, pts: [...j.pts, [xL, py], ...toD] });
      else breaks.push(j);
    }
  }
  const exitY = loopBottom + MG + 4;
  F.outs.push({ from: D.id, port: 'no', label: no, pts: [[dw / 2, dh / 2], [xR, dh / 2], [xR, exitY], [0, exitY]] });
  for (const j of breaks) {
    const [, py] = last(j.pts);
    F.outs.push({ ...j, pts: [...j.pts, [xR, py], [xR, exitY], [0, exitY]] });
  }
  if (F.outs.length >= 2) F.dots.push([0, exitY]);
  F.left = -xL + 4;
  F.right = xR + 4;
  F.h = exitY;
  return F;
}

function doWhileFrag(st) {
  const B = seq(st.body, { continueSide: 'right' });
  const D = mk('decision', st.cond, st.condLine || st.line);
  const dw = D.w; const dh = D.h;
  const F = B.empty ? { ...emptyFrag(), empty: false } : B;
  const conts = F.jumps.filter((j) => j.type === 'continue');
  const breaks = F.jumps.filter((j) => j.type === 'break');
  F.jumps = [];
  const top = B.empty ? 0 : B.h + G;
  D.x = 0; D.y = top;
  const xc = Math.max(F.right, dw / 2) + RAIL / 2;
  for (const o of F.outs) F.edges.push({ from: o.from, port: o.port, label: o.label, to: D.id, pts: toEntry(o.pts, top - G, top) });
  for (const j of conts) {
    const [, py] = last(j.pts);
    F.edges.push({ from: j.from, port: j.port, label: j.label, to: D.id, pts: [...j.pts, [xc, py], [xc, top - G / 2], [0, top - G / 2], [0, top]] });
  }
  F.nodes.push(D);
  const entry = B.empty ? D.id : B.entry;
  const xL = -(Math.max(F.left, dw / 2) + RAIL);
  const xR = Math.max(F.right, dw / 2, conts.length ? xc : 0) + RAIL;
  F.edges.push({ from: D.id, port: 'yes', label: 'Đúng', to: entry, back: true, pts: [[-dw / 2, top + dh / 2], [xL, top + dh / 2], [xL, -G / 2], [0, -G / 2], [0, 0]] });
  const exitY = top + dh + Math.round(G * 0.8);
  F.outs = [{ from: D.id, port: 'no', label: 'Sai', pts: [[0, top + dh], [0, exitY]] }];
  for (const j of breaks) {
    const [, py] = last(j.pts);
    F.outs.push({ ...j, pts: [...j.pts, [xR, py], [xR, exitY], [0, exitY]] });
  }
  if (F.outs.length >= 2) F.dots.push([0, exitY]);
  F.entry = entry;
  F.left = Math.max(F.left, -xL + 4, dw / 2);
  F.right = Math.max(F.right, dw / 2, breaks.length ? xR + 4 : 0, conts.length ? xc + 4 : 0);
  F.h = exitY;
  F.empty = false;
  return F;
}

function simplify(pts) {
  const out = [];
  for (const p of pts) {
    const q = [Math.round(p[0] * 2) / 2, Math.round(p[1] * 2) / 2];
    const prev = out[out.length - 1];
    if (prev && prev[0] === q[0] && prev[1] === q[1]) continue;
    out.push(q);
  }
  // remove collinear middles
  for (let i = out.length - 2; i >= 1; i--) {
    const [a, b, c] = [out[i - 1], out[i], out[i + 1]];
    if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) out.splice(i, 1);
  }
  return out;
}

/** Transform for-each loops into index loops so the designer can execute them. */
function expandForEach(stmts, depth = 0) {
  return (stmts || []).map((s) => {
    if (!s || typeof s !== 'object') return s;
    const c = { ...s };
    for (const k of ['then', 'else', 'body']) if (Array.isArray(c[k])) c[k] = expandForEach(c[k], depth + (c.k === 'foreach' || c.k === 'for' || c.k === 'while' ? 1 : 0));
    if (c.k === 'foreach' && c.iter) {
      const idx = depth ? `chi_so_${depth + 1}` : 'chi_so';
      return {
        k: 'for', line: c.line,
        init: { k: 'process', line: c.line, text: `${idx} = 0` },
        cond: `${idx} < len(${c.iter})`,
        update: { k: 'process', line: c.line, text: `${idx} = ${idx} + 1` },
        body: [{ k: 'process', line: c.line, text: `${c.target} = ${c.iter}[${idx}]` }, ...c.body],
      };
    }
    return c;
  });
}

function chartFrag(title, startKind, startText, body, line, warnings) {
  const S = nodeFrag(mk(startKind, startText, line));
  const B = seq(body, { continueSide: 'left' });
  if (!B.empty) append(S, B);
  if (S.jumps.length) {
    warnings.push(`${title}: có lệnh «break»/«continue» nằm ngoài vòng lặp.`);
    S.jumps = [];
  }
  if (S.outs.length) append(S, nodeFrag(mk('end', startKind === 'fnstart' ? 'Kết thúc hàm' : 'Kết thúc', null), false));
  return { title, frag: S };
}

/**
 * Lay out a parsed program. Returns charts (relative fragments) — call arrange() to get absolute coords.
 * options.forDesigner: expand for-each loops; only the main chart is produced.
 */
export function layoutProgram(program, { forDesigner = false } = {}) {
  seqNo = 0;
  const warnings = [];
  const charts = [];
  const main = forDesigner ? expandForEach(program.main) : program.main;
  const showMain = main.length || !program.functions.length || forDesigner;
  if (showMain) charts.push(chartFrag('Chương trình chính', 'start', 'Bắt đầu', main, program.mainLine ?? null, warnings));
  if (!forDesigner) {
    for (const f of program.functions) {
      charts.push(chartFrag(`Hàm ${f.name}(${f.params})`, 'fnstart', `${f.name}(${f.params})`, f.body, f.line, warnings));
    }
  }
  return { charts, warnings };
}

/** Place charts in a row or a column; returns absolute graph. */
export function arrange(charts, mode = 'row') {
  const nodes = []; const edges = []; const dots = []; const groups = [];
  let cursor = 0;
  const TITLE = charts.length > 1 ? 40 : 0;
  charts.forEach((c, ci) => {
    const f = c.frag;
    const w = f.left + f.right;
    let ox; let oy;
    if (mode === 'row') { ox = cursor + f.left; oy = TITLE; cursor += w + CHART_GAP; }
    else { ox = Math.max(f.left, 0); oy = cursor + TITLE; cursor += f.h + TITLE + CHART_GAP; }
    for (const n of f.nodes) nodes.push({ ...n, x: n.x + ox, y: n.y + oy + n.h / 2, chart: ci });
    f.edges.forEach((e, k) => edges.push({ ...e, id: `c${ci}e${k}`, chart: ci, pts: simplify(e.pts.map((p) => [p[0] + ox, p[1] + oy])) }));
    for (const d of f.dots) dots.push([d[0] + ox, d[1] + oy]);
    groups.push({ title: c.title, x: ox - f.left - 16, y: oy - TITLE - 8 + (TITLE ? 6 : 0), w: w + 32, h: f.h + TITLE + 24, showTitle: charts.length > 1 });
  });
  // bounding box (include back-edge rails that go above the top)
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  const grow = (x, y) => { minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y); };
  for (const n of nodes) { grow(n.x - n.w / 2, n.y - n.h / 2); grow(n.x + n.w / 2, n.y + n.h / 2); }
  for (const e of edges) for (const p of e.pts) grow(p[0], p[1]);
  for (const g of groups) { grow(g.x, g.y); grow(g.x + g.w, g.y + g.h); }
  if (!Number.isFinite(minX)) { minX = 0; minY = 0; maxX = 100; maxY = 100; }
  return { nodes, edges, dots, groups, bbox: { x: minX, y: minY, w: maxX - minX, h: maxY - minY } };
}
