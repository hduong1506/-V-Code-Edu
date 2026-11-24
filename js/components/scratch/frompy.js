// V-Code Edu — "Tạo khối từ mã": build Xưởng khối blocks from the editor's Python (supported subset:
// print, input, assignment, augmented assignment, if/elif/else, for … in range(…), while, f-strings).
import { parseProgram, toPython, exprText } from './pyparse.js';
import { B } from './blocks.js';

const NUM = (v) => String(v);

export function pythonToBlocks(code, lang) {
  const tree = parseProgram(toPython(code, lang));
  const vars = new Set();
  const skipped = [];
  const approx = new Set();

  const isInput = (e) => {
    if (!e) return null;
    if (e.t === 'call' && e.f.t === 'name' && e.f.v === 'input') return { prompt: e.args[0] || null };
    if (e.t === 'call' && e.f.t === 'name' && ['int', 'float', 'str'].includes(e.f.v) && e.args.length === 1) return isInput(e.args[0]);
    return null;
  };

  /** Expression → literal string or reporter block. */
  function conv(e, line) {
    if (!e) return '';
    switch (e.t) {
      case 'num': return NUM(e.v);
      case 'str': return e.v;
      case 'const': return e.v ? 'true' : 'false';
      case 'none': return '';
      case 'paren': return conv(e.e, line);
      case 'name': vars.add(e.v); return B('va_get', { VAR: e.v });
      case 'unary':
        if (e.op === '-') return B('op_sub', { A: '0', B: conv(e.e, line) });
        return conv(e.e, line);
      case 'bin': {
        const ops = { '+': 'op_add', '-': 'op_sub', '*': 'op_mul', '/': 'op_div', '%': 'op_mod', '//': 'op_idiv' };
        if (ops[e.op]) {
          if (e.op === '+' && (isStrish(e.l) || isStrish(e.r))) return B('op_join', { A: conv(e.l, line), B: conv(e.r, line) });
          if (e.op === '*' && (isStrish(e.l) || isStrish(e.r))) break;
          return B(ops[e.op], { A: conv(e.l, line), B: conv(e.r, line) });
        }
        if (e.op === '**' && e.r.t === 'num' && e.r.v === 2) { const x = conv(e.l, line); return B('op_mul', { A: x, B: JSON.parse(JSON.stringify(x)) }); }
        break;
      }
      case 'cmp': {
        const pair = (op, l, r) => {
          const a = conv(l, line); const b = conv(r, line);
          switch (op) {
            case '<': return B('op_lt', { A: a, B: b });
            case '>': return B('op_gt', { A: a, B: b });
            case '==': return B('op_eq', { A: a, B: b });
            case '!=': return B('op_not', { A: B('op_eq', { A: a, B: b }) });
            case '<=': return B('op_not', { A: B('op_gt', { A: a, B: b }) });
            case '>=': return B('op_not', { A: B('op_lt', { A: a, B: b }) });
            default: return null;
          }
        };
        const parts = e.ops.map((op, i) => pair(op, e.items[i], e.items[i + 1]));
        if (parts.some((p) => !p)) break;
        return parts.reduce((acc, p) => B('op_and', { A: acc, B: p }));
      }
      case 'bool': return B(e.op === 'and' ? 'op_and' : 'op_or', { A: condOf(e.l, line), B: condOf(e.r, line) });
      case 'not': return B('op_not', { A: condOf(e.e, line) });
      case 'fstr': {
        const parts = e.parts.map((p) => (typeof p === 'string' ? p : conv(p, line)));
        return joinAll(parts);
      }
      case 'call': {
        const f = e.f;
        if (f.t === 'name') {
          if (['int', 'float', 'str'].includes(f.v) && e.args.length === 1 && !isInput(e)) return conv(e.args[0], line);
          if (f.v === 'len' && e.args.length === 1) return B('op_length', { S: conv(e.args[0], line) });
          if (f.v === 'round' && e.args.length === 1) return B('op_round', { A: conv(e.args[0], line) });
          if (f.v === 'abs' && e.args.length === 1) return B('op_math', { FN: 'abs', A: conv(e.args[0], line) });
        }
        if (f.t === 'attr' && f.e.t === 'name' && f.e.v === 'random' && f.name === 'randint' && e.args.length === 2) {
          return B('op_random', { A: conv(e.args[0], line), B: conv(e.args[1], line) });
        }
        if (f.t === 'attr' && f.e.t === 'name' && f.e.v === 'math' && ['sqrt', 'floor', 'ceil'].includes(f.name) && e.args.length === 1) {
          return B('op_math', { FN: f.name, A: conv(e.args[0], line) });
        }
        break;
      }
      default: break;
    }
    approx.add(line);
    return exprText(e);
  }
  function isStrish(e) { return e && (e.t === 'str' || e.t === 'fstr' || (e.t === 'call' && e.f.t === 'name' && (e.f.v === 'str' || e.f.v === 'input'))); }
  function joinAll(parts) {
    const items = parts.filter((p) => p !== '');
    if (!items.length) return '';
    if (items.length === 1) return items[0];
    return items.reduceRight((acc, p) => B('op_join', { A: p, B: acc }));
  }
  /** Value for a boolean slot. */
  function condOf(e, line) {
    if (e && e.t === 'const') return e.v ? B('op_not', { A: null }) : null;
    const v = conv(e, line);
    if (v && typeof v === 'object' && ['op_lt', 'op_gt', 'op_eq', 'op_and', 'op_or', 'op_not'].includes(v.op)) return v;
    return B('op_not', { A: B('op_eq', { A: v, B: '0' }) });
  }

  function usesName(body, name) {
    let found = false;
    const scanE = (e) => {
      if (!e || found || typeof e !== 'object') return;
      if (e.t === 'name' && e.v === name) { found = true; return; }
      for (const val of Object.values(e)) {
        if (Array.isArray(val)) val.forEach((x) => (typeof x === 'object' ? scanE(x) : null));
        else if (val && typeof val === 'object') scanE(val);
      }
    };
    scanE({ body });
    return found;
  }

  function stmtsOf(body) {
    const out = [];
    for (const st of body || []) out.push(...stmtOf(st));
    return out;
  }

  function stmtOf(st) {
    switch (st.kind) {
      case 'expr': {
        const e = st.expr;
        if (e.t === 'call' && e.f.t === 'name' && e.f.v === 'print') {
          const parts = [];
          e.args.forEach((a, i) => { if (i) parts.push(' '); parts.push(conv(a, st.line)); });
          return [B('lo_say_for', { MSG: joinAll(parts), SECS: '1.5' })];
        }
        const inp = isInput(e);
        if (inp) return [B('se_ask', { Q: inp.prompt ? conv(inp.prompt, st.line) : '' })];
        skipped.push(st.line);
        return [];
      }
      case 'assign': {
        if (st.targets.length !== 1 || !/^[\p{L}_][\p{L}\p{N}_]*$/u.test(st.targets[0])) { skipped.push(st.line); return []; }
        const name = st.targets[0];
        vars.add(name);
        const inp = isInput(st.value);
        if (inp) return [B('se_ask', { Q: inp.prompt ? conv(inp.prompt, st.line) : '' }), B('va_set', { VAR: name, VAL: B('se_answer') })];
        return [B('va_set', { VAR: name, VAL: conv(st.value, st.line) })];
      }
      case 'aug': {
        if (!/^[\p{L}_][\p{L}\p{N}_]*$/u.test(st.target)) { skipped.push(st.line); return []; }
        const name = st.target;
        vars.add(name);
        const val = conv(st.value, st.line);
        const cur = B('va_get', { VAR: name });
        switch (st.op) {
          case '+=': return [isStrish(st.value) ? B('va_set', { VAR: name, VAL: B('op_join', { A: cur, B: val }) }) : B('va_change', { VAR: name, VAL: val })];
          case '-=': return [B('va_change', { VAR: name, VAL: typeof val === 'string' && /^\d/.test(val) ? `-${val}` : B('op_sub', { A: '0', B: val }) })];
          case '*=': return [B('va_set', { VAR: name, VAL: B('op_mul', { A: cur, B: val }) })];
          case '/=': return [B('va_set', { VAR: name, VAL: B('op_div', { A: cur, B: val }) })];
          case '//=': return [B('va_set', { VAR: name, VAL: B('op_idiv', { A: cur, B: val }) })];
          case '%=': return [B('va_set', { VAR: name, VAL: B('op_mod', { A: cur, B: val }) })];
          default: skipped.push(st.line); return [];
        }
      }
      case 'if': {
        const build = (cond, body, clauses) => {
          if (!clauses.length) return B('ct_if', { COND: condOf(cond, st.line) }, stmtsOf(body));
          const [first, ...rest] = clauses;
          const elseBody = first.kind === 'elif' ? [build(first.cond, first.body, rest)] : stmtsOf(first.body);
          return B('ct_if_else', { COND: condOf(cond, st.line) }, stmtsOf(body), elseBody);
        };
        return [build(st.cond, st.body, st.clauses)];
      }
      case 'for': {
        const it = st.iter;
        const v = st.target;
        if (!(it && it.t === 'call' && it.f.t === 'name' && it.f.v === 'range' && it.args.length >= 1 && it.args.length <= 3 && /^[\p{L}_][\p{L}\p{N}_]*$/u.test(v || ''))) { skipped.push(st.line); return []; }
        const [a0, a1, a2] = it.args;
        const start = it.args.length === 1 ? '0' : conv(a0, st.line);
        const end = conv(it.args.length === 1 ? a0 : a1, st.line);
        const step = a2 ? conv(a2, st.line) : '1';
        const body = stmtsOf(st.body);
        if (!usesName(st.body, v) && !a2) {
          const times = start === '0' ? end : (typeof start === 'string' && typeof end === 'string' && /^-?\d+$/.test(start) && /^-?\d+$/.test(end) ? String(Number(end) - Number(start)) : B('op_sub', { A: end, B: start }));
          return [B('ct_repeat', { TIMES: times }, body)];
        }
        vars.add(v);
        const negative = typeof step === 'string' && step.trim().startsWith('-');
        const cond = negative ? B('op_not', { A: B('op_gt', { A: B('va_get', { VAR: v }), B: end }) }) : B('op_not', { A: B('op_lt', { A: B('va_get', { VAR: v }), B: end }) });
        return [B('va_set', { VAR: v, VAL: start }), B('ct_repeat_until', { COND: cond }, [...body, B('va_change', { VAR: v, VAL: step })])];
      }
      case 'while': {
        if (st.cond?.t === 'const' && st.cond.v) return [B('ct_forever', {}, stmtsOf(st.body))];
        return [B('ct_repeat_until', { COND: B('op_not', { A: condOf(st.cond, st.line) }) }, stmtsOf(st.body))];
      }
      case 'pass': case 'import': case 'global': return [];
      default:
        skipped.push(st.line);
        return [];
    }
  }

  const blocks = stmtsOf(tree);
  return { blocks: [B('ev_flag'), ...blocks], variables: [...vars], skipped: [...new Set(skipped)].sort((a, b) => a - b), approx: [...approx].sort((a, b) => a - b) };
}
