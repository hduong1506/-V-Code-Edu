// V-Code Edu — Flowchart studio: validation + step-by-step execution of a designer graph.
import { FcError, evaluate, execStatement, truthy, pyStr, BUILTINS } from './expr.js';
import { compileNode } from './semantics.js';
import { KINDS, shortText } from './model.js';

export const MAX_STEPS = 10000;
const MAX_OUTPUT = 200000;

export function nodeName(n) {
  const label = KINDS[n.type]?.label || 'Khối';
  const t = shortText(n.text, 30);
  return n.type === 'start' || n.type === 'end' ? `«${label}»` : `${label} «${t}»`;
}

export function outEdgeMap(graph) {
  const m = new Map();
  for (const e of graph.edges) m.set(`${e.from}:${e.port}`, e);
  return m;
}

/**
 * Validate a graph. Returns { ok, errors: [{ message, nodeId?, edgeId? }], compiled: Map, startId }.
 */
export function validateGraph(graph) {
  const errors = [];
  const compiled = new Map();
  const byId = new Map(graph.nodes.map((n) => [n.id, n]));
  const starts = graph.nodes.filter((n) => n.type === 'start');
  const ends = graph.nodes.filter((n) => n.type === 'end');

  if (!graph.nodes.length) errors.push({ message: 'Lưu đồ đang trống — hãy kéo các khối từ bảng bên trái vào vùng vẽ.' });
  else if (!starts.length) errors.push({ message: 'Lưu đồ chưa có khối «Bắt đầu».' });
  else if (starts.length > 1) starts.slice(1).forEach((s) => errors.push({ nodeId: s.id, message: `Có ${starts.length} khối «Bắt đầu» — lưu đồ chỉ được có đúng một.` }));
  if (graph.nodes.length && !ends.length) errors.push({ message: 'Lưu đồ chưa có khối «Kết thúc».' });

  for (const e of graph.edges) {
    if (!byId.has(e.from) || !byId.has(e.to)) errors.push({ edgeId: e.id, message: 'Có mũi tên nối tới khối không tồn tại.' });
  }

  const out = outEdgeMap(graph);
  for (const n of graph.nodes) {
    try {
      compiled.set(n.id, compileNode(n));
    } catch (err) {
      errors.push({ nodeId: n.id, message: `${nodeName(n)}: ${err.message}` });
    }
    if (n.type === 'end') {
      if (graph.edges.some((e) => e.from === n.id)) errors.push({ nodeId: n.id, message: 'Khối «Kết thúc» không được có mũi tên đi ra.' });
      continue;
    }
    if (n.type === 'decision') {
      const miss = [];
      if (!out.has(`${n.id}:yes`)) miss.push('Đúng');
      if (!out.has(`${n.id}:no`)) miss.push('Sai');
      if (miss.length) errors.push({ nodeId: n.id, message: `${nodeName(n)} còn thiếu nhánh ${miss.join(' và ')}.` });
    } else if (!out.has(`${n.id}:out`)) {
      errors.push({ nodeId: n.id, message: `${nodeName(n)} chưa được nối tới khối tiếp theo.` });
    }
    if (n.type === 'start' && graph.edges.some((e) => e.to === n.id)) {
      errors.push({ nodeId: n.id, message: 'Không được nối mũi tên đi vào khối «Bắt đầu».' });
    }
  }

  if (starts.length === 1) {
    const seen = new Set([starts[0].id]);
    const stack = [starts[0].id];
    while (stack.length) {
      const id = stack.pop();
      for (const e of graph.edges) if (e.from === id && !seen.has(e.to) && byId.has(e.to)) { seen.add(e.to); stack.push(e.to); }
    }
    for (const n of graph.nodes) {
      if (!seen.has(n.id)) errors.push({ nodeId: n.id, message: `${nodeName(n)} không thể đi tới từ «Bắt đầu» (chưa được nối).` });
    }
  }
  return { ok: errors.length === 0, errors, compiled, startId: starts.length === 1 ? starts[0].id : null };
}

function readValue(raw, v) {
  const s = String(raw);
  if (v.type === 'str') return s;
  if (v.type === 'float') {
    try { return BUILTINS.float([s.trim()]); } catch {
      throw new FcError(`Dữ liệu vào «${s}» không phải số — biến ${v.name} cần số thực.`);
    }
  }
  const t = s.trim();
  if (/^[+-]?\d+$/.test(t)) return BigInt(t);
  if (/^[+-]?(\d+\.\d*|\.\d+|\d+)([eE][+-]?\d+)?$/.test(t)) {
    throw new FcError(`Dữ liệu vào «${s}» không phải số nguyên — biến ${v.name} cần số nguyên. Muốn nhập số thực, sửa khối thành «Nhập ${v.name} (số thực)».`);
  }
  throw new FcError(`Dữ liệu vào «${s}» không phải số nguyên — biến ${v.name} cần số nguyên. Muốn nhập chữ, sửa khối thành «Nhập ${v.name} (chuỗi)».`);
}

/**
 * Runner: executes a validated graph one node per step.
 * step() → { status: 'ok'|'done'|'error'|'need-input', nodeId, edgeId, nextId, error, write, echo }
 */
export class Runner {
  constructor(graph, { inputs = [], maxSteps = MAX_STEPS } = {}) {
    this.graph = graph;
    const v = validateGraph(graph);
    if (!v.ok) throw Object.assign(new FcError(v.errors[0].message), { validation: v.errors });
    this.compiled = v.compiled;
    this.out = outEdgeMap(graph);
    this.byId = new Map(graph.nodes.map((n) => [n.id, n]));
    this.vars = new Map();
    this.queue = inputs.slice();
    this.maxSteps = maxSteps;
    this.steps = 0;
    this.output = '';
    this.current = v.startId;
    this.status = 'ready';
    this.pendingVar = 0; // index of next variable to read in a multi-var input node
    this.lastError = null;
  }

  provideInput(line) { this.queue.push(String(line)); }

  fail(nodeId, err) {
    this.status = 'error';
    const node = this.byId.get(nodeId);
    const message = err instanceof FcError ? err.message : `Lỗi không mong đợi: ${err?.message || err}`;
    this.lastError = { nodeId, message: node ? `${nodeName(node)}: ${message}` : message };
    return { status: 'error', nodeId, error: this.lastError };
  }

  step() {
    if (this.status === 'done' || this.status === 'error') return { status: this.status, nodeId: this.current };
    const id = this.current;
    const node = this.byId.get(id);
    const c = this.compiled.get(id);
    if (this.steps >= this.maxSteps) {
      return this.fail(id, new FcError(`Đã chạy quá ${this.maxSteps.toLocaleString('vi-VN')} bước nên phải dừng — lưu đồ có thể bị lặp vô hạn. Hãy kiểm tra điều kiện dừng và lệnh tăng/giảm biến đếm trong vòng lặp.`));
    }
    let write = '';
    const echo = [];
    const ctx = { vars: this.vars, write: (s) => { write += s; } };
    let port = 'out';
    try {
      switch (c.kind) {
        case 'start': break;
        case 'end':
          this.steps += 1;
          this.status = 'done';
          return { status: 'done', nodeId: id, edgeId: null, nextId: null };
        case 'input':
          while (this.pendingVar < c.vars.length) {
            const v = c.vars[this.pendingVar];
            if (!this.queue.length) {
              this.status = 'need-input';
              return { status: 'need-input', nodeId: id, varName: v.name, varType: v.type };
            }
            const raw = this.queue.shift();
            echo.push({ name: v.name, raw });
            this.vars.set(v.name, readValue(raw, v));
            this.pendingVar += 1;
          }
          this.pendingVar = 0;
          break;
        case 'output': {
          const args = [];
          const kw = {};
          for (const a of c.args) { if (a.kw) kw[a.kw] = evaluate(a.e, ctx); else args.push(evaluate(a.e, ctx)); }
          const sep = kw.sep !== undefined ? pyStr(kw.sep) : ' ';
          const end = kw.end !== undefined ? pyStr(kw.end) : '\n';
          write += args.map(pyStr).join(sep) + end;
          break;
        }
        case 'process':
          for (const st of c.stmts) execStatement(st, ctx);
          break;
        case 'decision':
          port = truthy(evaluate(c.cond, ctx)) ? 'yes' : 'no';
          break;
        default: throw new FcError('Khối không hợp lệ');
      }
    } catch (err) {
      if (write) this.output += write;
      return { ...this.fail(id, err), write, echo };
    }
    this.output += write;
    if (this.output.length > MAX_OUTPUT) return this.fail(id, new FcError('Kết quả in ra quá dài — có thể lưu đồ bị lặp vô hạn.'));
    this.steps += 1;
    const edge = this.out.get(`${id}:${port}`);
    if (!edge) return this.fail(id, new FcError('Không có mũi tên đi tiếp từ khối này.'));
    this.current = edge.to;
    this.status = 'running';
    return { status: 'ok', nodeId: id, edgeId: edge.id, nextId: edge.to, port, write, echo, node };
  }

  /** Run synchronously until done/error/need-input (used by tests & "fast" mode). */
  runToEnd(limit = Infinity) {
    let r;
    let k = 0;
    do { r = this.step(); k += 1; } while (r.status === 'ok' && k < limit);
    return r;
  }
}
