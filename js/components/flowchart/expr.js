// V-Code Edu — Flowchart studio: safe expression engine.
// Tokenizer + Pratt parser + evaluator with Python semantics (ints are BigInt, floats are Number).
// NO eval / new Function anywhere. Also prints ASTs back as canonical Python (used by codegen).

export class FcError extends Error {
  constructor(message, extra = {}) {
    super(message);
    this.name = 'FcError';
    Object.assign(this, extra);
  }
}

/* ------------------------------------------------------------------ */
/* Tokenizer                                                           */
/* ------------------------------------------------------------------ */

const OPS = [
  '===', '!==', '**=', '//=', '...',
  '**', '//', '==', '!=', '<=', '>=', '<>', '&&', '||', '+=', '-=', '*=', '/=', '%=', ':=', '++', '--',
  '←', '≠', '≤', '≥', '+', '-', '*', '/', '%', '<', '>', '=', '(', ')', '[', ']', '{', '}', ',', '!', ';', '.', ':', '?',
];
const ID_START = /[\p{L}_]/u;
const ID_PART = /[\p{L}\p{N}_\p{Mn}\p{Mc}]/u;

function readQuoted(src, i, quote) {
  // returns { value, end } ; i points at the opening quote
  let j = i + 1;
  let out = '';
  while (j < src.length) {
    const ch = src[j];
    if (ch === '\\') {
      const nx = src[j + 1];
      const map = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', 0: '\0' };
      if (nx in map) { out += map[nx]; j += 2; continue; }
      out += '\\'; j += 1; continue;
    }
    if (ch === quote) return { value: out, end: j + 1 };
    if (ch === '\n') break;
    out += ch;
    j += 1;
  }
  throw new FcError('Chuỗi chưa có dấu nháy đóng ' + quote, { pos: i });
}

function readRawQuoted(src, i, quote) {
  // f-strings keep their raw body (braces are parsed later)
  let j = i + 1;
  while (j < src.length) {
    if (src[j] === '\\') { j += 2; continue; }
    if (src[j] === quote) return { body: src.slice(i + 1, j), end: j + 1 };
    j += 1;
  }
  throw new FcError('Chuỗi chưa có dấu nháy đóng ' + quote, { pos: i });
}

export function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n' || ch === ' ') { i += 1; continue; }
    if (ch === '#') break; // comment to end
    // numbers
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(?:\d[\d_]*(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i));
      const text = m[0].replace(/_/g, '');
      const isFloat = /[.eE]/.test(text);
      toks.push({ type: 'num', value: isFloat ? Number(text) : BigInt(text), pos: i, text: m[0] });
      i += m[0].length;
      continue;
    }
    // strings / f-strings
    if ((ch === 'f' || ch === 'F') && (src[i + 1] === '"' || src[i + 1] === "'")) {
      const { body, end } = readRawQuoted(src, i + 1, src[i + 1]);
      toks.push({ type: 'fstr', value: body, pos: i });
      i = end;
      continue;
    }
    if (ch === '"' || ch === "'") {
      const { value, end } = readQuoted(src, i, ch);
      toks.push({ type: 'str', value, pos: i });
      i = end;
      continue;
    }
    if (ch === '“' || ch === '”') {
      // smart quotes typed by mistake — accept them as "
      let j = i + 1;
      while (j < n && src[j] !== '”' && src[j] !== '“' && src[j] !== '\n') j += 1;
      if (j >= n || src[j] === '\n') throw new FcError('Chuỗi chưa có dấu nháy đóng', { pos: i });
      toks.push({ type: 'str', value: src.slice(i + 1, j), pos: i });
      i = j + 1;
      continue;
    }
    if (ID_START.test(ch)) {
      let j = i + 1;
      while (j < n && ID_PART.test(src[j])) j += 1;
      // std::string style
      toks.push({ type: 'name', value: src.slice(i, j).normalize('NFC'), pos: i });
      i = j;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (op) {
      toks.push({ type: 'op', value: op, pos: i });
      i += op.length;
      continue;
    }
    if (ch === '^') throw new FcError('Dùng «**» cho phép lũy thừa (ví dụ: x ** 2)', { pos: i });
    if (ch === '&' || ch === '|') throw new FcError(`Dùng «and» / «or» thay cho «${ch}»`, { pos: i });
    throw new FcError(`Ký tự không hợp lệ «${ch}»`, { pos: i });
  }
  toks.push({ type: 'eof', value: '', pos: n });
  return toks;
}

/* ------------------------------------------------------------------ */
/* Parser (Pratt)                                                      */
/* ------------------------------------------------------------------ */

const WORD_OPS = {
  and: 'and', va: 'and', 'và': 'and',
  or: 'or', hoac: 'or', 'hoặc': 'or',
  not: 'not', khong_phai: 'not',
  mod: '%', div: '//',
  in: 'in',
};
const LITERALS = {
  True: true, False: false, 'Đúng': true, 'Sai': false, 'đúng': true, 'sai': false, dung: true, true: true, false: false,
  None: null,
};
const PY_KEYWORDS = new Set(['lambda', 'def', 'class', 'return', 'if', 'else', 'elif', 'while', 'for', 'import', 'from', 'as',
  'try', 'except', 'finally', 'with', 'yield', 'global', 'nonlocal', 'assert', 'del', 'raise', 'pass', 'break', 'continue', 'is', 'async', 'await']);

const CMP_OPS = new Set(['===', '!==', '==', '!=', '<', '>', '<=', '>=', '<>', '≠', '≤', '≥', 'in', 'not in']);
const NORMALIZE_CMP = { '===': '==', '!==': '!=', '<>': '!=', '≠': '!=', '≤': '<=', '≥': '>=', '=': '==' };

function opOf(tok) {
  if (tok.type === 'op') return tok.value;
  if (tok.type === 'name' && WORD_OPS[tok.value]) return WORD_OPS[tok.value];
  return null;
}

class Parser {
  constructor(src, { mode = 'expr' } = {}) {
    this.src = src;
    this.mode = mode; // 'expr' | 'cond' (single = means ==)
    this.toks = tokenize(src);
    this.i = 0;
  }

  peek(k = 0) { return this.toks[Math.min(this.i + k, this.toks.length - 1)]; }
  next() { return this.toks[this.i++] || this.toks[this.toks.length - 1]; }
  atEnd() { return this.peek().type === 'eof'; }
  isOp(v, k = 0) { return opOf(this.peek(k)) === v; }

  expectOp(v) {
    const t = this.next();
    if (opOf(t) !== v) throw this.err(t, `Thiếu «${v}»`);
    return t;
  }

  err(tok, msg) {
    const near = tok.type === 'eof' ? 'cuối biểu thức' : `«${this.src.slice(tok.pos, tok.pos + 12).trim()}»`;
    return new FcError(`${msg} (gần ${near})`, { pos: tok.pos });
  }

  lbp(tok) {
    const op = opOf(tok);
    if (!op) return 0;
    if (op === 'or' || op === '||') return 10;
    if (op === 'and' || op === '&&') return 20;
    if (op === 'not') return this.peek(1) && opOf(this.peek(1)) === 'in' ? 40 : 0;
    if (CMP_OPS.has(op)) return 40;
    if (op === '=' && this.mode === 'cond') return 40;
    if (op === '+' || op === '-') return 60;
    if (op === '*' || op === '/' || op === '//' || op === '%') return 70;
    if (op === '**') return 90;
    if (op === '(' || op === '[' || op === '.') return 100;
    return 0;
  }

  parseExpr(rbp = 0) {
    const t = this.next();
    let left = this.nud(t);
    while (this.lbp(this.peek()) > rbp) {
      const t2 = this.next();
      left = this.led(t2, left);
    }
    return left;
  }

  nud(t) {
    if (t.type === 'num') return { t: 'num', v: t.value };
    if (t.type === 'str') {
      let v = t.value;
      // implicit concatenation "a" "b"
      while (this.peek().type === 'str') v += this.next().value;
      return { t: 'str', v };
    }
    if (t.type === 'fstr') return parseFString(t.value, t.pos);
    if (t.type === 'name') {
      if (Object.prototype.hasOwnProperty.call(LITERALS, t.value)) {
        const v = LITERALS[t.value];
        return v === null ? { t: 'none' } : { t: 'bool', v };
      }
      const op = WORD_OPS[t.value];
      if (op === 'not') return { t: 'not', e: this.parseExpr(30) };
      if (op) throw this.err(t, `Từ khóa «${t.value}» đặt sai vị trí`);
      if (PY_KEYWORDS.has(t.value)) throw this.err(t, `Không dùng từ khóa «${t.value}» trong biểu thức`);
      return { t: 'name', id: t.value };
    }
    if (t.type === 'op') {
      switch (t.value) {
        case '(': {
          if (this.isOp(')')) throw this.err(t, 'Cặp ngoặc rỗng');
          const e = this.parseExpr(0);
          if (this.isOp(',')) {
            const items = [e];
            while (this.isOp(',')) { this.next(); if (this.isOp(')')) break; items.push(this.parseExpr(0)); }
            this.expectOp(')');
            return { t: 'tuple', items };
          }
          this.expectOp(')');
          return e;
        }
        case '[': {
          const items = [];
          while (!this.isOp(']')) {
            items.push(this.parseExpr(0));
            if (this.isOp(',')) { this.next(); continue; }
            if (!this.isOp(']')) throw this.err(this.peek(), 'Thiếu «,» hoặc «]» trong danh sách');
          }
          this.expectOp(']');
          return { t: 'list', items };
        }
        case '-': return { t: 'unary', op: '-', e: this.parseExpr(80) };
        case '+': return { t: 'unary', op: '+', e: this.parseExpr(80) };
        case '!': return { t: 'not', e: this.parseExpr(30) };
        default: break;
      }
    }
    if (t.type === 'eof') throw this.err(t, 'Biểu thức chưa hoàn chỉnh');
    if (t.type === 'op' && t.value === '^') throw this.err(t, 'Dùng ** cho lũy thừa');
    throw this.err(t, `Không mong đợi «${t.value}»`);
  }

  led(t, left) {
    let op = opOf(t);
    if (op === '(') {
      const args = [];
      while (!this.isOp(')')) {
        if (this.peek().type === 'name' && opOf(this.peek(1)) === '=' ) {
          const kw = this.next().value; this.next();
          args.push({ kw, e: this.parseExpr(0) });
        } else {
          args.push({ e: this.parseExpr(0) });
        }
        if (this.isOp(',')) { this.next(); continue; }
        if (!this.isOp(')')) throw this.err(this.peek(), 'Thiếu «,» hoặc «)» khi gọi hàm');
      }
      this.expectOp(')');
      return { t: 'call', fn: left, args };
    }
    if (op === '[') {
      const idx = this.parseExpr(0);
      this.expectOp(']');
      return { t: 'index', obj: left, idx };
    }
    if (op === '.') {
      const nm = this.next();
      if (nm.type !== 'name') throw this.err(nm, 'Thiếu tên sau dấu «.»');
      return { t: 'attr', obj: left, name: nm.value };
    }
    if (op === 'or' || op === '||') return { t: 'boolop', op: 'or', l: left, r: this.parseExpr(10) };
    if (op === 'and' || op === '&&') return { t: 'boolop', op: 'and', l: left, r: this.parseExpr(20) };
    if (op === 'not') { this.next(); op = 'not in'; }
    if (CMP_OPS.has(op) || (op === '=' && this.mode === 'cond')) {
      const ops = [NORMALIZE_CMP[op] || op];
      const items = [left, this.parseExpr(40)];
      for (;;) {
        let nx = opOf(this.peek());
        if (nx === 'not' && opOf(this.peek(1)) === 'in') { this.next(); nx = 'not in'; }
        else if (!(CMP_OPS.has(nx) || (nx === '=' && this.mode === 'cond'))) break;
        this.next();
        ops.push(NORMALIZE_CMP[nx] || nx);
        items.push(this.parseExpr(40));
      }
      return { t: 'cmp', ops, items };
    }
    if (op === '**') return { t: 'bin', op, l: left, r: this.parseExpr(89) };
    if (['+', '-', '*', '/', '//', '%'].includes(op)) {
      return { t: 'bin', op, l: left, r: this.parseExpr(op === '+' || op === '-' ? 60 : 70) };
    }
    throw this.err(t, `Không mong đợi «${t.value}»`);
  }
}

function parseFString(body, pos) {
  const parts = [];
  let lit = '';
  let i = 0;
  const unesc = (s) => s.replace(/\\(.)/g, (_, c) => ({ n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"' }[c] ?? '\\' + c));
  while (i < body.length) {
    const ch = body[i];
    if (ch === '{' && body[i + 1] === '{') { lit += '{'; i += 2; continue; }
    if (ch === '}' && body[i + 1] === '}') { lit += '}'; i += 2; continue; }
    if (ch === '{') {
      let depth = 0; let j = i + 1; let q = null; let colon = -1;
      for (; j < body.length; j++) {
        const c = body[j];
        if (q) { if (c === q) q = null; continue; }
        if (c === '"' || c === "'") { q = c; continue; }
        if (c === '(' || c === '[' || c === '{') depth += 1;
        else if (c === ')' || c === ']') depth -= 1;
        else if (c === '}') { if (depth === 0) break; depth -= 1; }
        else if (c === ':' && depth === 0 && colon < 0) colon = j;
      }
      if (j >= body.length) throw new FcError('f-string thiếu dấu «}»', { pos });
      const inner = body.slice(i + 1, colon >= 0 ? colon : j);
      let spec = colon >= 0 ? body.slice(colon + 1, j) : '';
      let exprText = inner;
      if (/!r$|!s$/.test(exprText)) exprText = exprText.slice(0, -2);
      if (lit) { parts.push(unesc(lit)); lit = ''; }
      const p = new Parser(exprText.trim());
      const e = p.parseExpr(0);
      if (!p.atEnd()) throw new FcError('Biểu thức trong f-string không hợp lệ', { pos });
      parts.push({ e, spec, src: exprText.trim() });
      i = j + 1;
      continue;
    }
    if (ch === '}') throw new FcError('f-string có dấu «}» thừa', { pos });
    lit += ch;
    i += 1;
  }
  if (lit) parts.push(unesc(lit));
  return { t: 'fstr', parts };
}

/** Parse a single expression. mode 'cond' treats a lone '=' as '=='. */
export function parseExpression(src, { mode = 'expr' } = {}) {
  const p = new Parser(String(src), { mode });
  if (p.atEnd()) throw new FcError('Biểu thức đang trống');
  const e = p.parseExpr(0);
  if (!p.atEnd()) throw p.err(p.peek(), `Thừa «${p.peek().value}»`);
  return e;
}

/** Parse a comma separated list of expressions (may be empty). */
export function parseExpressionList(src) {
  const p = new Parser(String(src));
  const items = [];
  while (!p.atEnd()) {
    items.push(p.parseExpr(0));
    if (p.isOp(',')) { p.next(); continue; }
    if (!p.atEnd()) throw p.err(p.peek(), `Thừa «${p.peek().value}» (các biểu thức cách nhau bởi dấu phẩy)`);
  }
  return items;
}

/** Parse "a, b, sep='-', end=''" → [{ kw?, e }] (used by output blocks). */
export function parseArgList(src) {
  const p = new Parser(String(src));
  const items = [];
  while (!p.atEnd()) {
    if (p.peek().type === 'name' && opOf(p.peek(1)) === '=' && (p.peek().value === 'sep' || p.peek().value === 'end')) {
      const kw = p.next().value; p.next();
      items.push({ kw, e: p.parseExpr(0) });
    } else {
      items.push({ e: p.parseExpr(0) });
    }
    if (p.isOp(',')) { p.next(); continue; }
    if (!p.atEnd()) throw p.err(p.peek(), `Thừa «${p.peek().value}» (các biểu thức cách nhau bởi dấu phẩy)`);
  }
  return items;
}

const DECL_TYPES = /^(?:(?:const|let|var|unsigned|signed|long|short|int|float|double|char|bool|auto|string|std::string|long long)\s+)+/;

function isTarget(e) {
  return e.t === 'name' || (e.t === 'index' && (e.obj.t === 'name' || e.obj.t === 'index'));
}

/** Split text into simple statements by newline and top-level ';'. */
export function splitStatements(text) {
  const out = [];
  let buf = '';
  let q = null;
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      buf += ch;
      if (ch === '\\') { buf += text[i + 1] || ''; i += 1; continue; }
      if (ch === q) q = null;
      continue;
    }
    if (ch === '"' || ch === "'") { q = ch; buf += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    if ((ch === ';' || ch === '\n') && depth <= 0) { if (buf.trim()) out.push(buf.trim()); buf = ''; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/**
 * Parse one simple statement (assignment / augmented assignment / ++ / call expression).
 * Returns { k:'assign', targets, value } | { k:'aug', target, op, value } | { k:'expr', e } | { k:'decl', names }
 */
export function parseStatement(src) {
  let text = String(src).trim();
  if (text === 'pass' || text === 'bo_qua') return { k: 'pass' };
  const declM = DECL_TYPES.exec(text);
  if (declM && /^[\p{L}_]/u.test(text.slice(declM[0].length))) {
    text = text.slice(declM[0].length);
    // "int n" / "int a, b" (declaration only)
    if (/^[\p{L}_][\p{L}\p{N}_]*(\s*,\s*[\p{L}_][\p{L}\p{N}_]*)*$/u.test(text)) {
      return { k: 'decl', names: text.split(',').map((x) => x.trim()) };
    }
  }
  const p = new Parser(text);
  if (p.atEnd()) return { k: 'pass' };
  // ++x / --x
  if (p.isOp('++') || p.isOp('--')) {
    const op = p.next().value;
    const target = p.parseExpr(0);
    if (!isTarget(target) || !p.atEnd()) throw new FcError(`Câu lệnh «${text}» không hợp lệ`);
    return { k: 'aug', target, op: op === '++' ? '+' : '-', value: { t: 'num', v: 1n } };
  }
  const lhs = [p.parseExpr(0)];
  while (p.isOp(',')) { p.next(); lhs.push(p.parseExpr(0)); }
  const t = p.peek();
  const op = opOf(t);
  if (op === '=' || op === '←' || op === ':=') {
    p.next();
    // chained a = b = 0 is not supported — keep it simple and explicit
    const rhs = [p.parseExpr(0)];
    while (p.isOp(',')) { p.next(); rhs.push(p.parseExpr(0)); }
    if (!p.atEnd()) throw p.err(p.peek(), `Thừa «${p.peek().value}»`);
    for (const e of lhs) if (!isTarget(e)) throw new FcError(`Vế trái của phép gán phải là tên biến (trong «${text}»)`);
    const value = rhs.length === 1 ? rhs[0] : { t: 'tuple', items: rhs };
    return { k: 'assign', targets: lhs, value };
  }
  if (['+=', '-=', '*=', '/=', '//=', '%=', '**='].includes(op)) {
    p.next();
    if (lhs.length !== 1 || !isTarget(lhs[0])) throw new FcError(`Vế trái của «${op}» phải là một biến`);
    const value = p.parseExpr(0);
    if (!p.atEnd()) throw p.err(p.peek(), `Thừa «${p.peek().value}»`);
    return { k: 'aug', target: lhs[0], op: op.slice(0, -1), value };
  }
  if (op === '++' || op === '--') {
    p.next();
    if (lhs.length !== 1 || !isTarget(lhs[0]) || !p.atEnd()) throw new FcError(`Câu lệnh «${text}» không hợp lệ`);
    return { k: 'aug', target: lhs[0], op: op === '++' ? '+' : '-', value: { t: 'num', v: 1n } };
  }
  if (!p.atEnd()) {
    if (op === '==' ) throw new FcError(`Trong khối Xử lý dùng «=» để gán, «==» là phép so sánh (trong «${text}»)`);
    throw p.err(p.peek(), `Thừa «${p.peek().value}»`);
  }
  if (lhs.length === 1 && lhs[0].t === 'call') return { k: 'expr', e: lhs[0] };
  if (lhs.length === 1 && lhs[0].t === 'cmp' && lhs[0].ops[0] === '==') {
    throw new FcError(`Trong khối Xử lý dùng «=» để gán, «==» là phép so sánh (trong «${text}»)`);
  }
  throw new FcError(`«${text}» không phải phép gán. Viết dạng: bien = bieu_thuc`);
}

/* ------------------------------------------------------------------ */
/* Python value model                                                  */
/* ------------------------------------------------------------------ */

export const isInt = (v) => typeof v === 'bigint' || typeof v === 'boolean';
export const isNum = (v) => isInt(v) || typeof v === 'number';
const toBig = (v) => (typeof v === 'boolean' ? (v ? 1n : 0n) : v);
const toF = (v) => Number(toBig(v));

export function typeName(v) {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return 'bool';
  if (typeof v === 'bigint') return 'số nguyên (int)';
  if (typeof v === 'number') return 'số thực (float)';
  if (typeof v === 'string') return 'chuỗi (str)';
  if (Array.isArray(v)) return 'danh sách (list)';
  return 'giá trị';
}

export function pyFloatRepr(x) {
  if (Number.isNaN(x)) return 'nan';
  if (x === Infinity) return 'inf';
  if (x === -Infinity) return '-inf';
  if (x === 0) return Object.is(x, -0) ? '-0.0' : '0.0';
  const ax = Math.abs(x);
  if (ax >= 1e16 || ax < 1e-4) {
    let s = x.toExponential();
    s = s.replace(/e([+-])(\d)$/, 'e$10$2');
    return s;
  }
  const s = String(x);
  return Number.isInteger(x) ? `${s}.0` : s;
}

function strRepr(s) {
  const useDouble = s.includes("'") && !s.includes('"');
  const q = useDouble ? '"' : "'";
  let out = '';
  for (const ch of s) {
    if (ch === '\\') out += '\\\\';
    else if (ch === '\n') out += '\\n';
    else if (ch === '\t') out += '\\t';
    else if (ch === '\r') out += '\\r';
    else if (ch === q) out += '\\' + q;
    else out += ch;
  }
  return q + out + q;
}

export function pyRepr(v) {
  if (v === null || v === undefined) return 'None';
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (typeof v === 'bigint') return v.toString();
  if (typeof v === 'number') return pyFloatRepr(v);
  if (typeof v === 'string') return strRepr(v);
  if (Array.isArray(v)) return `[${v.map(pyRepr).join(', ')}]`;
  return String(v);
}

export function pyStr(v) {
  return typeof v === 'string' ? v : pyRepr(v);
}

export function truthy(v) {
  if (v === null || v === undefined) return false;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'bigint') return v !== 0n;
  if (typeof v === 'number') return v !== 0;
  if (typeof v === 'string' || Array.isArray(v)) return v.length > 0;
  return true;
}

export function pyEq(a, b) {
  if (isNum(a) && isNum(b)) {
    if (isInt(a) && isInt(b)) return toBig(a) === toBig(b);
    return toF(a) === toF(b);
  }
  if (typeof a === 'string' && typeof b === 'string') return a === b;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => pyEq(x, b[i]));
  return (a ?? null) === (b ?? null);
}

function cmpErr(op, a, b) {
  return new FcError(`Không thể so sánh «${op}» giữa ${typeName(a)} và ${typeName(b)}`);
}

function pyCompare(a, b, op) {
  // returns -1/0/1
  if (isNum(a) && isNum(b)) {
    const x = isInt(a) && isInt(b) ? toBig(a) : toF(a);
    const y = isInt(a) && isInt(b) ? toBig(b) : toF(b);
    // eslint-disable-next-line no-nested-ternary
    return x < y ? -1 : x > y ? 1 : (x === y ? 0 : NaN);
  }
  if (typeof a === 'string' && typeof b === 'string') return a < b ? -1 : a > b ? 1 : 0;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
      if (!pyEq(a[i], b[i])) return pyCompare(a[i], b[i], op);
    }
    return a.length - b.length < 0 ? -1 : a.length > b.length ? 1 : 0;
  }
  throw cmpErr(op, a, b);
}

function compareOp(op, a, b) {
  switch (op) {
    case '==': return pyEq(a, b);
    case '!=': return !pyEq(a, b);
    case '<': return pyCompare(a, b, op) < 0;
    case '>': return pyCompare(a, b, op) > 0;
    case '<=': { const c = pyCompare(a, b, op); return c <= 0; }
    case '>=': { const c = pyCompare(a, b, op); return c >= 0; }
    case 'in':
    case 'not in': {
      let r;
      if (typeof b === 'string') {
        if (typeof a !== 'string') throw new FcError(`Toán tử «in» với chuỗi cần vế trái là chuỗi, không phải ${typeName(a)}`);
        r = b.includes(a);
      } else if (Array.isArray(b)) {
        r = b.some((x) => pyEq(x, a));
      } else {
        throw new FcError(`Không dùng «in» với ${typeName(b)}`);
      }
      return op === 'in' ? r : !r;
    }
    default: throw new FcError(`Phép so sánh «${op}» chưa được hỗ trợ`);
  }
}

function zeroDiv() { return new FcError('Lỗi chia cho 0 (ZeroDivisionError)'); }

function bigFloorDiv(a, b) {
  if (b === 0n) throw zeroDiv();
  let q = a / b;
  if ((a % b !== 0n) && ((a < 0n) !== (b < 0n))) q -= 1n;
  return q;
}
function bigMod(a, b) {
  if (b === 0n) throw zeroDiv();
  let r = a % b;
  if (r !== 0n && ((r < 0n) !== (b < 0n))) r += b;
  return r;
}

function opErr(op, a, b) {
  let hint = '';
  if (op === '+' && (typeof a === 'string') !== (typeof b === 'string') && (isNum(a) || isNum(b))) hint = ' — dùng str(...) để đổi số thành chuỗi, hoặc int(...) để đổi chuỗi thành số';
  return new FcError(`Không thể dùng phép «${op}» giữa ${typeName(a)} và ${typeName(b)}${hint}`);
}

const MAX_SEQ = 1_000_000;

export function binop(op, a, b) {
  const bothNum = isNum(a) && isNum(b);
  const bothInt = isInt(a) && isInt(b);
  switch (op) {
    case '+':
      if (bothNum) return bothInt ? toBig(a) + toBig(b) : toF(a) + toF(b);
      if (typeof a === 'string' && typeof b === 'string') return a + b;
      if (Array.isArray(a) && Array.isArray(b)) return a.concat(b);
      throw opErr(op, a, b);
    case '-':
      if (bothNum) return bothInt ? toBig(a) - toBig(b) : toF(a) - toF(b);
      throw opErr(op, a, b);
    case '*': {
      if (bothNum) return bothInt ? toBig(a) * toBig(b) : toF(a) * toF(b);
      const seq = typeof a === 'string' || Array.isArray(a) ? a : (typeof b === 'string' || Array.isArray(b) ? b : null);
      const cnt = seq === a ? b : a;
      if (seq !== null && isInt(cnt)) {
        const k = Number(toBig(cnt));
        if (k <= 0) return typeof seq === 'string' ? '' : [];
        if (k * seq.length > MAX_SEQ) throw new FcError('Kết quả quá dài');
        if (typeof seq === 'string') return seq.repeat(k);
        let out = [];
        for (let i = 0; i < k; i++) out = out.concat(seq);
        return out;
      }
      throw opErr(op, a, b);
    }
    case '/':
      if (bothNum) { if (toF(b) === 0) throw zeroDiv(); return toF(a) / toF(b); }
      throw opErr(op, a, b);
    case '//':
      if (bothInt) return bigFloorDiv(toBig(a), toBig(b));
      if (bothNum) { if (toF(b) === 0) throw zeroDiv(); return Math.floor(toF(a) / toF(b)); }
      throw opErr(op, a, b);
    case '%':
      if (bothInt) return bigMod(toBig(a), toBig(b));
      if (bothNum) {
        const x = toF(a); const y = toF(b);
        if (y === 0) throw zeroDiv();
        const r = x - y * Math.floor(x / y);
        return r;
      }
      if (typeof a === 'string') throw new FcError('Chưa hỗ trợ định dạng chuỗi bằng «%» — hãy dùng f-string hoặc dấu phẩy');
      throw opErr(op, a, b);
    case '**': {
      if (bothInt) {
        const x = toBig(a); const y = toBig(b);
        if (y < 0n) {
          if (x === 0n) throw zeroDiv();
          return Math.pow(Number(x), Number(y));
        }
        const bits = x === 0n || x === 1n || x === -1n ? 0 : x.toString(2).length * Number(y);
        if (bits > 100000) throw new FcError('Kết quả lũy thừa quá lớn');
        return x ** y;
      }
      if (bothNum) {
        const x = toF(a); const y = toF(b);
        if (x === 0 && y < 0) throw zeroDiv();
        if (x < 0 && !Number.isInteger(y)) throw new FcError('Lũy thừa số âm với số mũ không nguyên cho kết quả số phức — chưa hỗ trợ');
        return Math.pow(x, y);
      }
      throw opErr(op, a, b);
    }
    default:
      throw new FcError(`Phép toán «${op}» chưa được hỗ trợ`);
  }
}

function needNum(name, v) {
  if (!isNum(v)) throw new FcError(`Hàm ${name}() cần số, không phải ${typeName(v)}`);
}

function bankersRound(x) {
  const r = Math.round(x);
  if (Math.abs(x % 1) === 0.5) return 2 * Math.round(x / 2);
  return r;
}

function argList(name, args, min, max) {
  if (args.length < min || args.length > max) {
    const need = min === max ? `${min}` : `${min}–${max}`;
    throw new FcError(`Hàm ${name}() cần ${need} tham số, nhưng nhận ${args.length}`);
  }
}

function minMax(name, args, sign) {
  let items = args;
  if (args.length === 1) {
    if (!Array.isArray(args[0]) && typeof args[0] !== 'string') throw new FcError(`Hàm ${name}() cần một danh sách hoặc nhiều giá trị`);
    items = typeof args[0] === 'string' ? [...args[0]] : args[0];
  }
  if (!items.length) throw new FcError(`Hàm ${name}() nhận danh sách rỗng`);
  let best = items[0];
  for (const x of items.slice(1)) if (pyCompare(x, best, name) * sign > 0) best = x;
  return best;
}

/** Built-in functions. Each gets (args: values[], kwargs: {}, ctx). */
export const BUILTINS = {
  int(args) {
    argList('int', args, 0, 1);
    if (!args.length) return 0n;
    const v = args[0];
    if (typeof v === 'bigint') return v;
    if (typeof v === 'boolean') return v ? 1n : 0n;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) throw new FcError(`Không thể đổi ${pyFloatRepr(v)} thành số nguyên`);
      return BigInt(Math.trunc(v));
    }
    if (typeof v === 'string') {
      const t = v.trim().replace(/_/g, '');
      if (/^[+-]?\d+$/.test(t)) return BigInt(t);
      throw new FcError(`Không thể đổi «${v}» thành số nguyên (int)`);
    }
    throw new FcError(`Không thể đổi ${typeName(v)} thành số nguyên`);
  },
  float(args) {
    argList('float', args, 0, 1);
    if (!args.length) return 0;
    const v = args[0];
    if (isNum(v)) return toF(v);
    if (typeof v === 'string') {
      const t = v.trim().replace(/_/g, '');
      if (/^[+-]?(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?$/.test(t)) return Number(t);
      const low = t.toLowerCase();
      if (['inf', '+inf', 'infinity', '+infinity'].includes(low)) return Infinity;
      if (['-inf', '-infinity'].includes(low)) return -Infinity;
      if (['nan', '+nan', '-nan'].includes(low)) return NaN;
      throw new FcError(`Không thể đổi «${v}» thành số thực (float)`);
    }
    throw new FcError(`Không thể đổi ${typeName(v)} thành số thực`);
  },
  str(args) { argList('str', args, 0, 1); return args.length ? pyStr(args[0]) : ''; },
  bool(args) { argList('bool', args, 0, 1); return args.length ? truthy(args[0]) : false; },
  len(args) {
    argList('len', args, 1, 1);
    const v = args[0];
    if (typeof v === 'string') return BigInt([...v].length);
    if (Array.isArray(v)) return BigInt(v.length);
    throw new FcError(`Hàm len() không dùng được với ${typeName(v)}`);
  },
  abs(args) {
    argList('abs', args, 1, 1);
    const v = args[0];
    needNum('abs', v);
    if (isInt(v)) { const b = toBig(v); return b < 0n ? -b : b; }
    return Math.abs(v);
  },
  min(args) { return minMax('min', args, -1); },
  max(args) { return minMax('max', args, 1); },
  round(args) {
    argList('round', args, 1, 2);
    const [v, nd] = args;
    needNum('round', v);
    if (nd === undefined || nd === null) {
      if (isInt(v)) return toBig(v);
      if (!Number.isFinite(v)) throw new FcError(`Không thể làm tròn ${pyFloatRepr(v)}`);
      return BigInt(bankersRound(v));
    }
    if (!isInt(nd)) throw new FcError('Số chữ số làm tròn phải là số nguyên');
    const k = Number(toBig(nd));
    if (isInt(v)) {
      if (k >= 0) return toBig(v);
      const p = 10n ** BigInt(-k);
      const b = toBig(v);
      const q = bigFloorDiv(b, p); const r = b - q * p;
      let res = q;
      if (r * 2n > p || (r * 2n === p && q % 2n !== 0n)) res = q + 1n;
      return res * p;
    }
    if (!Number.isFinite(v)) return v;
    if (k >= 0 && k <= 30 && Math.abs(v) < 1e21) {
      // exact decimal expansion of the double decides ties (Python semantics: round-half-even on the exact value)
      const exact = Math.abs(v).toFixed(Math.min(100, k + 70));
      const dot = exact.indexOf('.');
      const tail = exact.slice(dot + 1 + k);
      const r = Number(v.toFixed(k));
      if (/^50*$/.test(tail)) {
        const lastDigit = Number((k === 0 ? exact.slice(0, dot) : exact.slice(dot + k, dot + k + 1)).slice(-1));
        if (lastDigit % 2 === 0) {
          // toFixed rounded away from zero; go back to the even neighbour
          const step = Math.pow(10, -k);
          return Number((v > 0 ? r - step : r + step).toFixed(k));
        }
      }
      return r;
    }
    const scale = Math.pow(10, k);
    return Math.round(v * scale) / scale;
  },
  sqrt(args) {
    argList('sqrt', args, 1, 1);
    needNum('sqrt', args[0]);
    const x = toF(args[0]);
    if (x < 0) throw new FcError('Không thể lấy căn bậc hai của số âm (math domain error)');
    return Math.sqrt(x);
  },
  sum(args) {
    argList('sum', args, 1, 2);
    if (!Array.isArray(args[0])) throw new FcError('Hàm sum() cần một danh sách');
    return args[0].reduce((acc, x) => binop('+', acc, x), args.length > 1 ? args[1] : 0n);
  },
  print(args, kwargs, ctx) {
    const sep = kwargs.sep !== undefined ? pyStr(kwargs.sep) : ' ';
    const end = kwargs.end !== undefined ? pyStr(kwargs.end) : '\n';
    ctx.write(args.map(pyStr).join(sep) + end);
    return null;
  },
};

// Vietnamese aliases (from data/pyvn-keywords.json) → canonical Python names.
export const FN_ALIASES = { do_dai: 'len', so_nguyen: 'int', so_thuc: 'float', lam_tron: 'round', in_ra: 'print', can_bac_hai: 'sqrt' };

const MATH_FUNCS = {
  sqrt: BUILTINS.sqrt,
  floor(args) { argList('floor', args, 1, 1); needNum('floor', args[0]); return isInt(args[0]) ? toBig(args[0]) : BigInt(Math.floor(args[0])); },
  ceil(args) { argList('ceil', args, 1, 1); needNum('ceil', args[0]); return isInt(args[0]) ? toBig(args[0]) : BigInt(Math.ceil(args[0])); },
  gcd(args) {
    argList('gcd', args, 2, 2);
    let [a, b] = args.map((x) => { if (!isInt(x)) throw new FcError('Hàm gcd() cần số nguyên'); const v = toBig(x); return v < 0n ? -v : v; });
    while (b) [a, b] = [b, a % b];
    return a;
  },
};
const MATH_CONSTS = { pi: Math.PI, e: Math.E };

function resolveIndex(seq, idx) {
  if (!isInt(idx)) throw new FcError(`Chỉ số phải là số nguyên, không phải ${typeName(idx)}`);
  const len = typeof seq === 'string' ? [...seq].length : seq.length;
  let i = Number(toBig(idx));
  if (i < 0) i += len;
  if (i < 0 || i >= len) throw new FcError(`Chỉ số ${pyRepr(idx)} nằm ngoài phạm vi (độ dài ${len})`);
  return i;
}

function callMethod(obj, name, args) {
  if (Array.isArray(obj)) {
    switch (name) {
      case 'append': argList('append', args, 1, 1); if (obj.length >= MAX_SEQ) throw new FcError('Danh sách quá dài'); obj.push(args[0]); return null;
      case 'pop': {
        argList('pop', args, 0, 1);
        if (!obj.length) throw new FcError('Không thể pop() danh sách rỗng');
        const i = args.length ? resolveIndex(obj, args[0]) : obj.length - 1;
        return obj.splice(i, 1)[0];
      }
      case 'insert': {
        argList('insert', args, 2, 2);
        if (!isInt(args[0])) throw new FcError('Vị trí chèn phải là số nguyên');
        let i = Number(toBig(args[0]));
        if (i < 0) i = Math.max(0, obj.length + i);
        obj.splice(Math.min(i, obj.length), 0, args[1]);
        return null;
      }
      case 'count': argList('count', args, 1, 1); return BigInt(obj.filter((x) => pyEq(x, args[0])).length);
      case 'index': {
        argList('index', args, 1, 1);
        const i = obj.findIndex((x) => pyEq(x, args[0]));
        if (i < 0) throw new FcError(`${pyRepr(args[0])} không có trong danh sách`);
        return BigInt(i);
      }
      default: break;
    }
  }
  if (typeof obj === 'string') {
    switch (name) {
      case 'upper': argList('upper', args, 0, 0); return obj.toUpperCase();
      case 'lower': argList('lower', args, 0, 0); return obj.toLowerCase();
      case 'strip': argList('strip', args, 0, 0); return obj.trim();
      case 'count': argList('count', args, 1, 1); if (typeof args[0] !== 'string' || !args[0]) throw new FcError('count() cần chuỗi con'); return BigInt(obj.split(args[0]).length - 1);
      default: break;
    }
  }
  throw new FcError(`${typeName(obj)} không có phương thức «${name}»`);
}

function formatSpec(v, spec) {
  if (!spec) return pyStr(v);
  const m = /^([<>^]?)(\d*)(,?)(?:\.(\d+))?([fdse%]?)$/.exec(spec);
  if (!m) throw new FcError(`Định dạng «:${spec}» chưa được hỗ trợ`);
  const [, align, width, comma, prec, type] = m;
  let s;
  if (type === 'f' || type === '%') {
    needNum('định dạng', v);
    const x = toF(v) * (type === '%' ? 100 : 1);
    s = x.toFixed(prec !== undefined ? Number(prec) : 6) + (type === '%' ? '%' : '');
  } else if (type === 'e') {
    needNum('định dạng', v);
    s = toF(v).toExponential(prec !== undefined ? Number(prec) : 6).replace(/e([+-])(\d)$/, 'e$10$2');
  } else if (type === 'd') {
    if (!isInt(v)) throw new FcError('Định dạng «d» cần số nguyên');
    s = toBig(v).toString();
  } else {
    s = pyStr(v);
    if (prec !== undefined && typeof v === 'string') s = s.slice(0, Number(prec));
    else if (prec !== undefined && typeof v === 'number') s = String(Number(v.toPrecision(Number(prec))));
  }
  if (comma) s = s.replace(/^(-?)(\d+)/, (_, sg, d) => sg + d.replace(/\B(?=(\d{3})+(?!\d))/g, ','));
  const w = width ? Number(width) : 0;
  if (s.length < w) {
    const pad = w - s.length;
    const al = align || (isNum(v) ? '>' : '<');
    if (al === '>') s = ' '.repeat(pad) + s;
    else if (al === '^') s = ' '.repeat(Math.floor(pad / 2)) + s + ' '.repeat(Math.ceil(pad / 2));
    else s += ' '.repeat(pad);
  }
  return s;
}

/**
 * Evaluate an AST. ctx = { vars: Map<string, any>, write(text) }.
 */
export function evaluate(e, ctx) {
  switch (e.t) {
    case 'num': return e.v;
    case 'str': return e.v;
    case 'bool': return e.v;
    case 'none': return null;
    case 'name': {
      if (ctx.vars.has(e.id)) return ctx.vars.get(e.id);
      if (e.id === 'math') throw new FcError('Dùng math.sqrt(x)… hoặc gọi trực tiếp sqrt(x)');
      throw new FcError(`Biến «${e.id}» chưa có giá trị (chưa được nhập hoặc gán)`);
    }
    case 'list': return e.items.map((x) => evaluate(x, ctx));
    case 'tuple': return e.items.map((x) => evaluate(x, ctx));
    case 'fstr': return e.parts.map((p) => (typeof p === 'string' ? p : formatSpec(evaluate(p.e, ctx), p.spec))).join('');
    case 'unary': {
      const v = evaluate(e.e, ctx);
      if (!isNum(v)) throw new FcError(`Không thể đặt dấu «${e.op}» trước ${typeName(v)}`);
      if (e.op === '+') return isInt(v) ? toBig(v) : v;
      return isInt(v) ? -toBig(v) : -v;
    }
    case 'not': return !truthy(evaluate(e.e, ctx));
    case 'boolop': {
      const l = evaluate(e.l, ctx);
      if (e.op === 'and') return truthy(l) ? evaluate(e.r, ctx) : l;
      return truthy(l) ? l : evaluate(e.r, ctx);
    }
    case 'bin': return binop(e.op, evaluate(e.l, ctx), evaluate(e.r, ctx));
    case 'cmp': {
      let left = evaluate(e.items[0], ctx);
      for (let i = 0; i < e.ops.length; i++) {
        const right = evaluate(e.items[i + 1], ctx);
        if (!compareOp(e.ops[i], left, right)) return false;
        left = right;
      }
      return true;
    }
    case 'index': {
      const obj = evaluate(e.obj, ctx);
      const idx = evaluate(e.idx, ctx);
      if (typeof obj === 'string') return [...obj][resolveIndex(obj, idx)];
      if (Array.isArray(obj)) return obj[resolveIndex(obj, idx)];
      throw new FcError(`Không thể lấy phần tử [ ] của ${typeName(obj)}`);
    }
    case 'attr': {
      if (e.obj.t === 'name' && e.obj.id === 'math' && !ctx.vars.has('math')) {
        if (e.name in MATH_CONSTS) return MATH_CONSTS[e.name];
        throw new FcError(`math.${e.name} chưa được hỗ trợ`);
      }
      throw new FcError(`Thuộc tính «.${e.name}» chưa được hỗ trợ`);
    }
    case 'call': {
      const args = [];
      const kwargs = {};
      for (const a of e.args) {
        if (a.kw) kwargs[a.kw] = evaluate(a.e, ctx);
        else args.push(evaluate(a.e, ctx));
      }
      if (e.fn.t === 'name') {
        const name = FN_ALIASES[e.fn.id] || e.fn.id;
        if (name === 'input' || name === 'nhap_so' || name === 'nhap_chuoi' || name === 'nhap_so_thuc') {
          throw new FcError('Hãy dùng khối «Nhập» để đọc dữ liệu từ bàn phím');
        }
        if (ctx.vars.has(e.fn.id)) throw new FcError(`«${e.fn.id}» đang là một biến nên không gọi như hàm được — hãy đặt tên biến khác`);
        const fn = BUILTINS[name];
        if (!fn) throw new FcError(`Hàm «${e.fn.id}» chưa được hỗ trợ. Có thể dùng: int, float, str, len, abs, min, max, round, sqrt, sum`);
        if (Object.keys(kwargs).length && name !== 'print') throw new FcError(`Hàm ${name}() không nhận tham số có tên`);
        return fn(args, kwargs, ctx);
      }
      if (e.fn.t === 'attr') {
        if (e.fn.obj.t === 'name' && e.fn.obj.id === 'math' && !ctx.vars.has('math')) {
          const fn = MATH_FUNCS[e.fn.name];
          if (!fn) throw new FcError(`math.${e.fn.name}() chưa được hỗ trợ`);
          return fn(args, kwargs, ctx);
        }
        const obj = evaluate(e.fn.obj, ctx);
        return callMethod(obj, e.fn.name, args);
      }
      throw new FcError('Lời gọi hàm không hợp lệ');
    }
    default:
      throw new FcError('Biểu thức không hợp lệ');
  }
}

/** Assign to a target AST (name or index). */
export function assignTarget(target, value, ctx) {
  if (target.t === 'name') {
    ctx.vars.set(target.id, value);
    return;
  }
  if (target.t === 'index') {
    const obj = evaluate(target.obj, ctx);
    const idx = evaluate(target.idx, ctx);
    if (!Array.isArray(obj)) throw new FcError(`Không thể gán phần tử cho ${typeName(obj)}`);
    obj[resolveIndex(obj, idx)] = value;
    return;
  }
  throw new FcError('Vế trái phép gán không hợp lệ');
}

/** Execute a parsed simple statement. */
export function execStatement(st, ctx) {
  switch (st.k) {
    case 'pass':
    case 'decl': return;
    case 'expr': evaluate(st.e, ctx); return;
    case 'assign': {
      const v = evaluate(st.value, ctx);
      if (st.targets.length === 1) { assignTarget(st.targets[0], st.value.t === 'tuple' ? v : v, ctx); return; }
      const vals = Array.isArray(v) ? v : (typeof v === 'string' ? [...v] : null);
      if (!vals) throw new FcError(`Không thể tách ${typeName(v)} thành ${st.targets.length} giá trị`);
      if (vals.length !== st.targets.length) throw new FcError(`Số biến (${st.targets.length}) và số giá trị (${vals.length}) không khớp`);
      st.targets.forEach((t, i) => assignTarget(t, vals[i], ctx));
      return;
    }
    case 'aug': {
      const cur = evaluate(st.target, ctx);
      const res = binop(st.op, cur, evaluate(st.value, ctx));
      if (st.target.t === 'name') ctx.vars.set(st.target.id, res); else assignTarget(st.target, res, ctx);
      return;
    }
    default: throw new FcError('Câu lệnh không hợp lệ');
  }
}

/* ------------------------------------------------------------------ */
/* Python printer                                                      */
/* ------------------------------------------------------------------ */

const PREC = { or: 1, and: 2, not: 3, cmp: 4, '+': 6, '-': 6, '*': 7, '/': 7, '//': 7, '%': 7, unary: 8, '**': 9, postfix: 10, atom: 11 };

function precOf(e) {
  switch (e.t) {
    case 'boolop': return PREC[e.op];
    case 'not': return PREC.not;
    case 'cmp': return PREC.cmp;
    case 'bin': return PREC[e.op];
    case 'unary': return PREC.unary;
    case 'tuple': return 0;
    case 'num': return (typeof e.v === 'bigint' ? e.v < 0n : e.v < 0 || Object.is(e.v, -0)) ? PREC.unary : PREC.atom;
    default: return PREC.atom;
  }
}

function pyStringLiteral(s, preferSingle = false) {
  if (preferSingle) {
    return `'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r')}'`;
  }
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\r/g, '\\r')}"`;
}

/** Print AST as canonical Python source. usage collects { math: bool } */
export function toPython(e, usage = {}, inF = false) {
  const wrap = (child, minPrec) => {
    const s = toPython(child, usage, inF);
    return precOf(child) < minPrec ? `(${s})` : s;
  };
  switch (e.t) {
    case 'num': return typeof e.v === 'bigint' ? e.v.toString() : pyFloatRepr(e.v).replace(/^inf$/, 'float("inf")').replace(/^nan$/, 'float("nan")');
    case 'str': return pyStringLiteral(e.v, inF);
    case 'bool': return e.v ? 'True' : 'False';
    case 'none': return 'None';
    case 'name': return e.id;
    case 'list': return `[${e.items.map((x) => toPython(x, usage, inF)).join(', ')}]`;
    case 'tuple': return e.items.map((x) => wrap(x, 1)).join(', ');
    case 'fstr': {
      let body = '';
      for (const p of e.parts) {
        if (typeof p === 'string') body += p.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t').replace(/\{/g, '{{').replace(/\}/g, '}}');
        else body += `{${toPython(p.e, usage, true)}${p.spec ? ':' + p.spec : ''}}`;
      }
      return `f"${body}"`;
    }
    case 'unary': return `${e.op}${wrap(e.e, PREC.unary)}`;
    case 'not': return `not ${wrap(e.e, PREC.not)}`;
    case 'boolop': return `${wrap(e.l, PREC[e.op])} ${e.op} ${wrap(e.r, PREC[e.op] + 1)}`;
    case 'bin': {
      const p = PREC[e.op];
      if (e.op === '**') return `${wrap(e.l, PREC.postfix)} ** ${wrap(e.r, PREC.unary)}`;
      return `${wrap(e.l, p)} ${e.op} ${wrap(e.r, p + 1)}`;
    }
    case 'cmp': {
      let s = wrap(e.items[0], PREC.cmp + 1);
      e.ops.forEach((op, i) => { s += ` ${op} ${wrap(e.items[i + 1], PREC.cmp + 1)}`; });
      return s;
    }
    case 'index': return `${wrap(e.obj, PREC.postfix)}[${toPython(e.idx, usage, inF)}]`;
    case 'attr':
      if (e.obj.t === 'name' && e.obj.id === 'math') usage.math = true;
      return `${wrap(e.obj, PREC.postfix)}.${e.name}`;
    case 'call': {
      let fn;
      if (e.fn.t === 'name') {
        fn = FN_ALIASES[e.fn.id] || e.fn.id;
        if (fn === 'sqrt') usage.sqrt = true;
      } else {
        fn = toPython(e.fn, usage, inF);
      }
      const args = e.args.map((a) => (a.kw ? `${a.kw}=` : '') + toPython(a.e, usage, inF));
      return `${fn}(${args.join(', ')})`;
    }
    default: return '?';
  }
}

export function statementToPython(st, usage = {}) {
  switch (st.k) {
    case 'pass': return 'pass';
    case 'decl': return null;
    case 'expr': return toPython(st.e, usage);
    case 'assign': return `${st.targets.map((t) => toPython(t, usage)).join(', ')} = ${toPython(st.value, usage)}`;
    case 'aug': return `${toPython(st.target, usage)} ${st.op}= ${toPython(st.value, usage)}`;
    default: return null;
  }
}

/** Collect variable names read by an expression (for hints). */
export function namesIn(e, out = new Set()) {
  if (!e || typeof e !== 'object') return out;
  if (e.t === 'name') out.add(e.id);
  for (const k of ['e', 'l', 'r', 'obj', 'idx', 'value']) if (e[k]) namesIn(e[k], out);
  if (e.items) e.items.forEach((x) => namesIn(x, out));
  if (e.args) e.args.forEach((a) => namesIn(a.e, out));
  if (e.parts) e.parts.forEach((p) => typeof p !== 'string' && namesIn(p.e, out));
  return out;
}
