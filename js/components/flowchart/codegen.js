// V-Code Edu — Flowchart studio: designer graph → Python.
// Structured translation: if/else via immediate post-dominator (merge point), while loops via back-edges
// (natural loops of a reducible graph). Unstructured graphs fall back to a state machine (while + "buoc").
import { toPython, statementToPython } from './expr.js';
import { validateGraph, outEdgeMap } from './interpreter.js';

const EXIT = '__exit__';
class Unstructured extends Error {}

const INVERT = { '==': '!=', '!=': '==', '<': '>=', '>=': '<', '>': '<=', '<=': '>', in: 'not in', 'not in': 'in' };

function negate(cond) {
  if (cond.t === 'cmp' && cond.ops.length === 1) return { t: 'cmp', ops: [INVERT[cond.ops[0]]], items: cond.items };
  if (cond.t === 'not') return cond.e;
  if (cond.t === 'bool') return { t: 'bool', v: !cond.v };
  return { t: 'not', e: cond };
}

function nodeLines(c, usage) {
  switch (c.kind) {
    case 'start':
    case 'end': return [];
    case 'input':
      return c.vars.map((v) => {
        if (v.type === 'str') return `${v.name} = input()`;
        return `${v.name} = ${v.type}(input())`;
      });
    case 'output': {
      const parts = c.args.map((a) => (a.kw ? `${a.kw}=` : '') + toPython(a.e, usage));
      return [`print(${parts.join(', ')})`];
    }
    case 'process': {
      const ls = c.stmts.map((s) => statementToPython(s, usage)).filter((x) => x !== null);
      return ls;
    }
    default: return [];
  }
}

function indentLines(lines, depth) {
  const pad = '    '.repeat(depth);
  return lines.map((l) => pad + l);
}

/** Print the statement tree. */
function printStmts(stmts, depth, usage) {
  const out = [];
  if (!stmts.length) return indentLines(['pass'], depth);
  for (const s of stmts) {
    switch (s.t) {
      case 'lines': out.push(...indentLines(s.lines, depth)); break;
      case 'break': out.push(...indentLines(['break'], depth)); break;
      case 'continue': out.push(...indentLines(['continue'], depth)); break;
      case 'while':
        out.push(...indentLines([`while ${toPython(s.cond, usage)}:`], depth));
        out.push(...printStmts(s.body, depth + 1, usage));
        break;
      case 'if': {
        out.push(...indentLines([`if ${toPython(s.cond, usage)}:`], depth));
        out.push(...printStmts(s.then, depth + 1, usage));
        let els = s.else;
        while (els.length === 1 && els[0].t === 'if') {
          const e = els[0];
          out.push(...indentLines([`elif ${toPython(e.cond, usage)}:`], depth));
          out.push(...printStmts(e.then, depth + 1, usage));
          els = e.else;
        }
        if (els.length) {
          out.push(...indentLines(['else:'], depth));
          out.push(...printStmts(els, depth + 1, usage));
        }
        break;
      }
      default: break;
    }
  }
  return out;
}

const endsWithJump = (stmts) => {
  const last = stmts[stmts.length - 1];
  return !!last && (last.t === 'break' || last.t === 'continue');
};

function stripTrailingContinue(stmts) {
  const last = stmts[stmts.length - 1];
  if (!last) return stmts;
  if (last.t === 'continue') { stmts.pop(); return stmts; }
  if (last.t === 'if') { stripTrailingContinue(last.then); stripTrailingContinue(last.else); }
  return stmts;
}

function makeIf(cond, thenS, elseS) {
  if (!thenS.length && !elseS.length) return [];
  if (!thenS.length) return makeIf(negate(cond), elseS, []);
  if (thenS.length === 1 && thenS[0].t === 'continue' && elseS.length && endsWithJump(elseS)) {
    // "if c: continue / break"  →  "if not c: break" + continue (stripped at the loop tail)
    return [{ t: 'if', cond: negate(cond), then: elseS, else: [] }, { t: 'continue' }];
  }
  if (elseS.length && endsWithJump(thenS)) return [{ t: 'if', cond, then: thenS, else: [] }, ...elseS];
  if (thenS.length && elseS.length && endsWithJump(elseS) && !endsWithJump(thenS) && elseS.length <= 2) {
    // "if c: A else: break"  →  "if not c: break" + A  (reads better in loops)
    return [{ t: 'if', cond: negate(cond), then: elseS, else: [] }, ...thenS];
  }
  return [{ t: 'if', cond, then: thenS, else: elseS }];
}

function computeSets(ids, succ, entry, forward = true) {
  // generic dominator-style dataflow: dom(n) = {n} ∪ ∩ dom(p) over preds (forward) / succs (post)
  const all = new Set(ids);
  const dom = new Map();
  for (const id of ids) dom.set(id, new Set(all));
  dom.set(entry, new Set([entry]));
  const preds = new Map(ids.map((id) => [id, []]));
  for (const id of ids) for (const s of succ.get(id) || []) if (preds.has(s)) preds.get(s).push(id);
  const rel = forward ? preds : succ;
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 500) {
    changed = false;
    for (const id of ids) {
      if (id === entry) continue;
      const ps = (rel.get(id) || []).filter((p) => dom.has(p));
      let inter = null;
      for (const p of ps) {
        const d = dom.get(p);
        if (!inter) inter = new Set(d);
        else for (const x of inter) if (!d.has(x)) inter.delete(x);
      }
      const next = inter || new Set();
      next.add(id);
      const cur = dom.get(id);
      if (next.size !== cur.size || [...next].some((x) => !cur.has(x))) { dom.set(id, next); changed = true; }
    }
  }
  return dom;
}

function structured(graph, compiled, startId, usage) {
  const out = outEdgeMap(graph);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const target = (id) => (byId.get(id).type === 'end' ? EXIT : id);
  const succOf = (id) => {
    if (id === EXIT) return [];
    const n = byId.get(id);
    if (n.type === 'end') return [EXIT];
    if (n.type === 'decision') return [target(out.get(`${id}:yes`).to), target(out.get(`${id}:no`).to)];
    return [target(out.get(`${id}:out`).to)];
  };
  // reachable (end nodes collapse into EXIT)
  const ids = [];
  const seen = new Set([startId]);
  const st = [startId];
  while (st.length) {
    const id = st.pop();
    ids.push(id);
    for (const s of succOf(id)) if (!seen.has(s)) { seen.add(s); st.push(s); }
  }
  if (!seen.has(EXIT)) { ids.push(EXIT); }
  const succ = new Map(ids.map((id) => [id, succOf(id)]));

  // back-edges by DFS
  const back = [];
  const color = new Map();
  const dfs = (u) => {
    color.set(u, 1);
    for (const v of succ.get(u)) {
      if (!color.has(v)) dfs(v);
      else if (color.get(v) === 1) back.push([u, v]);
    }
    color.set(u, 2);
  };
  dfs(startId);

  const dom = computeSets(ids, succ, startId, true);
  for (const [u, v] of back) if (!dom.get(u).has(v)) throw new Unstructured('irreducible');

  const pdom = computeSets(ids, succ, EXIT, false);
  const reachExit = new Set([EXIT]);
  {
    let grew = true;
    while (grew) {
      grew = false;
      for (const id of ids) if (!reachExit.has(id) && succ.get(id).some((s) => reachExit.has(s))) { reachExit.add(id); grew = true; }
    }
  }
  const ipdom = (n) => {
    const set = pdom.get(n);
    if (!set || !reachExit.has(n)) return null; // cannot reach exit (infinite loop)
    for (const d of set) {
      if (d === n) continue;
      if (pdom.get(d) && pdom.get(d).size === set.size - 1) return d;
    }
    return null;
  };

  // natural loops
  const preds = new Map(ids.map((id) => [id, []]));
  for (const id of ids) for (const s of succ.get(id)) preds.get(s)?.push(id);
  const loops = new Map();
  for (const [u, h] of back) {
    const L = loops.get(h) || { header: h, body: new Set([h]) };
    const stack = [u];
    while (stack.length) {
      const x = stack.pop();
      if (L.body.has(x)) continue;
      L.body.add(x);
      for (const p of preds.get(x)) stack.push(p);
    }
    loops.set(h, L);
  }
  for (const L of loops.values()) {
    const exits = new Set();
    for (const x of L.body) for (const s of succ.get(x)) if (!L.body.has(s)) exits.add(s);
    if (exits.size > 1) throw new Unstructured('multi-exit loop');
    L.exit = exits.size ? [...exits][0] : null;
  }

  const emitted = new Set();
  let budget = 5000;

  const emit = (entry, stop, loop, isLoopEntry = false) => {
    const res = [];
    let n = entry;
    let first = true;
    for (;;) {
      if (budget-- < 0) throw new Unstructured('budget');
      if (n === stop && stop !== undefined) break;
      if (loop && n === loop.exit) { res.push({ t: 'break' }); break; }
      if (loop && n === loop.header && !(first && isLoopEntry)) { res.push({ t: 'continue' }); break; }
      if (n === EXIT) {
        if (!loop) break;
        throw new Unstructured('exit inside structure');
      }
      if (n === null || n === undefined) break;
      const L = loops.get(n);
      if (L && !(loop && loop.header === n && first && isLoopEntry)) {
        if (emitted.has(n)) throw new Unstructured('dup loop');
        const c = compiled.get(n);
        const node = byId.get(n);
        let whileStmt;
        if (node.type === 'decision') {
          const [ys, ns] = succ.get(n);
          const yIn = L.body.has(ys);
          const nIn = L.body.has(ns);
          if (yIn !== nIn) {
            emitted.add(n);
            const cond = yIn ? c.cond : negate(c.cond);
            const body = stripTrailingContinue(emit(yIn ? ys : ns, undefined, L));
            whileStmt = { t: 'while', cond, body };
          }
        }
        if (!whileStmt) {
          const body = stripTrailingContinue(emit(n, undefined, L, true));
          whileStmt = { t: 'while', cond: { t: 'bool', v: true }, body };
        }
        res.push(whileStmt);
        if (L.exit === null) break;
        n = L.exit;
        first = false;
        continue;
      }
      if (emitted.has(n)) throw new Unstructured('dup');
      emitted.add(n);
      const node = byId.get(n);
      const c = compiled.get(n);
      if (node.type === 'decision') {
        let m = ipdom(n);
        if (loop && m !== null && !loop.body.has(m)) m = null;
        if (loop && m === loop.header) m = null; // both branches end with continue (stripped later)
        const [ys, ns] = succ.get(n);
        const stopAt = m === null ? undefined : m;
        const thenS = emit(ys, stopAt, loop);
        const elseS = emit(ns, stopAt, loop);
        res.push(...makeIf(c.cond, thenS, elseS));
        if (m === null) break;
        n = m;
      } else {
        const lines = nodeLines(c, usage);
        if (lines.length) {
          const prev = res[res.length - 1];
          if (prev && prev.t === 'lines') prev.lines.push(...lines); else res.push({ t: 'lines', lines });
        }
        n = succ.get(n)[0];
      }
      first = false;
    }
    return res;
  };

  const body = emit(startId, EXIT, null);
  return body;
}

function stateMachine(graph, compiled, startId, usage) {
  const out = outEdgeMap(graph);
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  // number reachable nodes in BFS order
  const num = new Map();
  const order = [];
  const q = [startId];
  const seen = new Set([startId]);
  while (q.length) {
    const id = q.shift();
    if (byId.get(id).type !== 'end') { num.set(id, order.length + 1); order.push(id); }
    for (const e of graph.edges) if (e.from === id && !seen.has(e.to)) { seen.add(e.to); q.push(e.to); }
  }
  const stepOf = (id) => (byId.get(id).type === 'end' ? 0 : num.get(id));
  const lines = [
    '# Lưu đồ có các đường nhảy chéo nhau (không tách được thành if/while lồng nhau),',
    '# nên được dịch theo kiểu "máy trạng thái": biến buoc cho biết khối nào chạy tiếp theo.',
    '# buoc = 0 nghĩa là đã tới khối Kết thúc.',
    `buoc = ${stepOf(startId)}`,
    'while buoc != 0:',
  ];
  order.forEach((id, i) => {
    const c = compiled.get(id);
    const node = byId.get(id);
    const kw = i === 0 ? 'if' : 'elif';
    lines.push(`    ${kw} buoc == ${num.get(id)}:`);
    if (node.type === 'decision') {
      lines.push(`        if ${toPython(c.cond, usage)}:`);
      lines.push(`            buoc = ${stepOf(out.get(`${id}:yes`).to)}`);
      lines.push('        else:');
      lines.push(`            buoc = ${stepOf(out.get(`${id}:no`).to)}`);
    } else {
      for (const l of nodeLines(c, usage)) lines.push(`        ${l}`);
      lines.push(`        buoc = ${stepOf(out.get(`${id}:out`).to)}`);
    }
  });
  return lines;
}

/**
 * Generate Python from a designer graph.
 * Returns { ok, code, mode: 'structured'|'state-machine', errors }
 */
export function generatePython(graph, { forceStateMachine = false } = {}) {
  const v = validateGraph(graph);
  if (!v.ok) return { ok: false, errors: v.errors, code: '' };
  const usage = {};
  let body;
  let mode = 'structured';
  if (!forceStateMachine) {
    try {
      const stmts = structured(graph, v.compiled, v.startId, usage);
      body = printStmts(stmts, 0, usage);
      if (!stmts.length) body = ['pass'];
    } catch (err) {
      if (!(err instanceof Unstructured)) throw err;
      body = null;
    }
  }
  if (!body) {
    mode = 'state-machine';
    body = stateMachine(graph, v.compiled, v.startId, usage);
  }
  const head = ['# Chương trình Python được tạo từ lưu đồ (V-Code Edu)'];
  if (usage.math) head.push('import math');
  if (usage.sqrt) head.push('from math import sqrt');
  return { ok: true, mode, code: `${[...head, '', ...body].join('\n')}\n`, errors: [] };
}
