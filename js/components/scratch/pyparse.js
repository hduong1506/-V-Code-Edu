// V-Code Edu — a small, forgiving Python parser for Scratch Live and "Tạo khối từ mã".
// It never throws for user code: unknown constructs become { t: 'raw' } expressions or { kind: 'other' } statements.
// Python Tiếng Việt is translated with the shared mapping first (line numbers are preserved).
import { loadPyvnMapping, translatePyvnWith } from '../../runtime/pyvn.js';

// Fallback copy used until data/pyvn-keywords.json has loaded (kept minimal; the JSON is the source of truth).
const FALLBACK_PYVN = {
  phrases: [
    { vn: 'nhap_so_thuc()', py: 'float(input())' },
    { vn: 'nhap_so()', py: 'int(input())' },
    { vn: 'nhap_chuoi()', py: 'input()' },
    { vn: 'trong_khoang', py: 'in range' },
  ],
  words: {
    neu: 'if', nguoc_lai_neu: 'elif', nguoc_lai: 'else', lap_voi: 'for', khi_ma: 'while', trong: 'in', va: 'and', hoac: 'or',
    khong_phai: 'not', dung: 'True', sai: 'False', ham: 'def', tra_ve: 'return', thoat_lap: 'break', tiep_tuc: 'continue',
    bo_qua: 'pass', in_ra: 'print', do_dai: 'len', so_nguyen: 'int', so_thuc: 'float', sap_xep: 'sorted', lam_tron: 'round',
  },
};
let pyvnMapping = null;
let pyvnLoading = null;

/** Starts loading the pyvn mapping; resolves true when the real mapping is available. */
export function ensurePyvn() {
  if (pyvnMapping) return Promise.resolve(true);
  if (!pyvnLoading) {
    pyvnLoading = loadPyvnMapping().then((m) => { pyvnMapping = m; return true; }).catch(() => { pyvnLoading = null; return false; });
  }
  return pyvnLoading;
}

export function toPython(code, lang) {
  const src = String(code ?? '').replace(/\r\n?/g, '\n');
  if (lang !== 'pyvn') return src;
  try { return translatePyvnWith(pyvnMapping || FALLBACK_PYVN, src); } catch { return src; }
}

/* ------------------------------------------------------------------ tokenizer */

const OPS = ['**=', '//=', '>>=', '<<=', '...', '**', '//', '==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', '<<', '>>', ':=',
  '+', '-', '*', '/', '%', '<', '>', '=', '(', ')', '[', ']', '{', '}', ',', ':', '.', '@', '~', '&', '|', '^', ';'];

export function tokenize(src) {
  const toks = [];
  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\\') { i++; continue; }
    if (ch === '#') break;
    const start = i;
    // string (with optional prefix)
    const pm = /^([rRbBuUfF]{1,2})?(['"])/.exec(src.slice(i, i + 4));
    if (pm && (pm[1] ? /^[rRbBuUfF]{1,2}$/.test(pm[1]) : true)) {
      const prefix = (pm[1] || '').toLowerCase();
      const q = pm[2];
      let j = i + (pm[1] || '').length;
      const triple = src.slice(j, j + 3) === q.repeat(3);
      const quote = triple ? q.repeat(3) : q;
      j += quote.length;
      let body = '';
      let closed = false;
      while (j < n) {
        if (src[j] === '\\' && !prefix.includes('r')) {
          const nx = src[j + 1];
          const map = { n: '\n', t: '\t', '\\': '\\', "'": "'", '"': '"' };
          body += map[nx] ?? `\\${nx ?? ''}`;
          j += 2;
          continue;
        }
        if (src.startsWith(quote, j)) { j += quote.length; closed = true; break; }
        body += src[j];
        j++;
      }
      if (!closed) throw new SyntaxError('Chuỗi chưa đóng');
      toks.push({ t: 'str', v: body, f: prefix.includes('f'), s: start, e: j });
      i = j;
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?j?)/.exec(src.slice(i));
      const raw = m[0];
      toks.push({ t: 'num', v: Number(raw.replace(/_/g, '').replace(/j$/, '')), raw, s: start, e: i + raw.length });
      i += raw.length;
      continue;
    }
    if (/[\p{L}_]/u.test(ch)) {
      const m = /^[\p{L}\p{N}_]+/u.exec(src.slice(i));
      toks.push({ t: 'name', v: m[0], s: start, e: i + m[0].length });
      i += m[0].length;
      continue;
    }
    const op = OPS.find((o) => src.startsWith(o, i));
    if (!op) throw new SyntaxError(`Ký tự lạ "${ch}"`);
    toks.push({ t: 'op', v: op, s: start, e: i + op.length });
    i += op.length;
  }
  return toks;
}

/* ------------------------------------------------------------------ expressions */

const KW = new Set(['and', 'or', 'not', 'in', 'is', 'if', 'else', 'lambda', 'for', 'None', 'True', 'False']);

class ExprParser {
  constructor(src, toks) { this.src = src; this.toks = toks; this.i = 0; }
  peek(o = 0) { return this.toks[this.i + o]; }
  isOp(v, o = 0) { const t = this.peek(o); return t && t.t === 'op' && t.v === v; }
  isName(v, o = 0) { const t = this.peek(o); return t && t.t === 'name' && t.v === v; }
  next() { return this.toks[this.i++]; }
  expectOp(v) { if (!this.isOp(v)) throw new SyntaxError(`Thiếu "${v}"`); return this.next(); }
  raw(s, e) { return { t: 'raw', text: this.src.slice(s, e).trim(), s, e }; }
  node(obj, s, e) { obj.s = s; obj.e = e; return obj; }

  /** Skip a bracketed group starting at the current opener; returns end offset. */
  skipGroup() {
    let depth = 0;
    let end = this.peek()?.e ?? this.src.length;
    while (this.i < this.toks.length) {
      const t = this.next();
      end = t.e;
      if (t.t === 'op' && '([{'.includes(t.v)) depth++;
      else if (t.t === 'op' && ')]}'.includes(t.v)) { depth--; if (depth <= 0) break; }
    }
    return end;
  }
  /** Skip to the next comma or closing bracket at depth 0 (not consuming it). */
  skipToBoundary() {
    let depth = 0;
    let end = this.peek()?.s ?? this.src.length;
    while (this.i < this.toks.length) {
      const t = this.peek();
      if (t.t === 'op' && '([{'.includes(t.v)) depth++;
      if (t.t === 'op' && ')]}'.includes(t.v)) { if (depth === 0) break; depth--; }
      if (depth === 0 && t.t === 'op' && t.v === ',') break;
      this.next();
      end = t.e;
    }
    return end;
  }

  parse() {
    const e = this.parseTest();
    if (this.i < this.toks.length) {
      // tuple at top level
      if (this.isOp(',')) {
        const items = [e];
        while (this.isOp(',')) { this.next(); if (this.i >= this.toks.length) break; items.push(this.parseTest()); }
        if (this.i < this.toks.length) throw new SyntaxError('Thừa ký hiệu');
        return this.node({ t: 'tuple', items }, e.s, items[items.length - 1].e);
      }
      throw new SyntaxError('Thừa ký hiệu');
    }
    return e;
  }
  parseTest() {
    const t = this.peek();
    if (!t) throw new SyntaxError('Thiếu biểu thức');
    if (this.isName('lambda')) { const s = t.s; const e = this.skipToBoundary(); return this.raw(s, e); }
    const a = this.parseOr();
    if (this.isName('if')) {
      this.next();
      const cond = this.parseOr();
      if (!this.isName('else')) throw new SyntaxError('Thiếu else');
      this.next();
      const b = this.parseTest();
      return this.node({ t: 'ternary', a, cond, b }, a.s, b.e);
    }
    return a;
  }
  parseOr() {
    let l = this.parseAnd();
    while (this.isName('or')) { this.next(); const r = this.parseAnd(); l = this.node({ t: 'bool', op: 'or', l, r }, l.s, r.e); }
    return l;
  }
  parseAnd() {
    let l = this.parseNot();
    while (this.isName('and')) { this.next(); const r = this.parseNot(); l = this.node({ t: 'bool', op: 'and', l, r }, l.s, r.e); }
    return l;
  }
  parseNot() {
    if (this.isName('not')) { const s = this.next().s; const e = this.parseNot(); return this.node({ t: 'not', e }, s, e.e); }
    return this.parseCmp();
  }
  parseCmp() {
    const first = this.parseBit();
    const ops = [];
    const items = [first];
    for (;;) {
      const t = this.peek();
      if (!t) break;
      let op = null;
      if (t.t === 'op' && ['<', '>', '==', '!=', '<=', '>='].includes(t.v)) { op = t.v; this.next(); }
      else if (this.isName('in')) { op = 'in'; this.next(); }
      else if (this.isName('not') && this.isName('in', 1)) { op = 'not in'; this.next(); this.next(); }
      else if (this.isName('is')) { this.next(); op = 'is'; if (this.isName('not')) { this.next(); op = 'is not'; } }
      if (!op) break;
      ops.push(op);
      items.push(this.parseBit());
    }
    if (!ops.length) return first;
    return this.node({ t: 'cmp', ops, items }, first.s, items[items.length - 1].e);
  }
  parseBit() {
    let l = this.parseArith();
    while (this.peek()?.t === 'op' && ['|', '^', '&', '<<', '>>'].includes(this.peek().v)) {
      const op = this.next().v; const r = this.parseArith();
      l = this.node({ t: 'bin', op, l, r }, l.s, r.e);
    }
    return l;
  }
  parseArith() {
    let l = this.parseTerm();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.next().v; const r = this.parseTerm();
      l = this.node({ t: 'bin', op, l, r }, l.s, r.e);
    }
    return l;
  }
  parseTerm() {
    let l = this.parseUnary();
    while (['*', '/', '//', '%', '@'].some((o) => this.isOp(o))) {
      const op = this.next().v; const r = this.parseUnary();
      l = this.node({ t: 'bin', op, l, r }, l.s, r.e);
    }
    return l;
  }
  parseUnary() {
    if (this.isOp('-') || this.isOp('+') || this.isOp('~')) {
      const t = this.next();
      const e = this.parseUnary();
      if (t.v === '-' && e.t === 'num') return this.node({ t: 'num', v: -e.v, raw: `-${e.raw}` }, t.s, e.e);
      return this.node({ t: 'unary', op: t.v, e }, t.s, e.e);
    }
    return this.parsePower();
  }
  parsePower() {
    const base = this.parsePostfix();
    if (this.isOp('**')) { this.next(); const ex = this.parseUnary(); return this.node({ t: 'bin', op: '**', l: base, r: ex }, base.s, ex.e); }
    return base;
  }
  parsePostfix() {
    let e = this.parseAtom();
    for (;;) {
      if (this.isOp('(')) {
        this.next();
        const args = [];
        const kwargs = [];
        while (!this.isOp(')')) {
          const t = this.peek();
          if (!t) throw new SyntaxError('Thiếu ")"');
          if (t.t === 'op' && (t.v === '*' || t.v === '**')) { const s = t.s; this.next(); const end = this.skipToBoundary(); args.push(this.raw(s, end)); }
          else if (t.t === 'name' && this.isOp('=', 1)) { this.next(); this.next(); kwargs.push({ name: t.v, value: this.parseTest() }); }
          else {
            const a = this.parseTest();
            if (this.isName('for')) { const end = this.skipToBoundary(); args.push(this.raw(a.s, end)); }
            else args.push(a);
          }
          if (this.isOp(',')) this.next(); else if (!this.isOp(')')) throw new SyntaxError('Thiếu ","');
        }
        const close = this.next();
        e = this.node({ t: 'call', f: e, args, kwargs }, e.s, close.e);
      } else if (this.isOp('[')) {
        const s0 = this.peek().s;
        this.next();
        const startI = this.i;
        let idx;
        try {
          idx = this.parseTest();
          if (!this.isOp(']')) throw new SyntaxError('slice');
        } catch {
          this.i = startI;
          let depth = 0;
          while (this.i < this.toks.length) {
            const t = this.peek();
            if (t.t === 'op' && '([{'.includes(t.v)) depth++;
            if (t.t === 'op' && ')]}'.includes(t.v)) { if (depth === 0) break; depth--; }
            this.next();
          }
          idx = this.raw(this.toks[startI]?.s ?? s0, this.peek()?.s ?? this.src.length);
        }
        const close = this.expectOp(']');
        e = this.node({ t: 'index', e, i: idx }, e.s, close.e);
      } else if (this.isOp('.')) {
        this.next();
        const nm = this.next();
        if (!nm || nm.t !== 'name') throw new SyntaxError('Thiếu tên thuộc tính');
        e = this.node({ t: 'attr', e, name: nm.v }, e.s, nm.e);
      } else break;
    }
    return e;
  }
  parseAtom() {
    const t = this.peek();
    if (!t) throw new SyntaxError('Thiếu biểu thức');
    if (t.t === 'num') { this.next(); return this.node({ t: 'num', v: t.v, raw: t.raw }, t.s, t.e); }
    if (t.t === 'str') {
      this.next();
      let parts = t.f ? parseFString(t.v) : [t.v];
      let e = t.e;
      while (this.peek()?.t === 'str') {
        const n2 = this.next();
        parts = parts.concat(n2.f ? parseFString(n2.v) : [n2.v]);
        e = n2.e;
      }
      if (parts.every((p) => typeof p === 'string')) return this.node({ t: 'str', v: parts.join('') }, t.s, e);
      return this.node({ t: 'fstr', parts }, t.s, e);
    }
    if (t.t === 'name') {
      this.next();
      if (t.v === 'True' || t.v === 'False') return this.node({ t: 'const', v: t.v === 'True' }, t.s, t.e);
      if (t.v === 'None') return this.node({ t: 'none' }, t.s, t.e);
      if (KW.has(t.v)) throw new SyntaxError(`Từ khóa "${t.v}" không đúng chỗ`);
      return this.node({ t: 'name', v: t.v }, t.s, t.e);
    }
    if (t.t === 'op' && t.v === '(') {
      const s0 = t.s;
      this.next();
      if (this.isOp(')')) { const c = this.next(); return this.node({ t: 'tuple', items: [] }, s0, c.e); }
      const first = this.parseTest();
      if (this.isName('for')) { this.i -= 0; const end = this.skipRestOfGroup(); return this.raw(s0, end); }
      if (this.isOp(',')) {
        const items = [first];
        while (this.isOp(',')) { this.next(); if (this.isOp(')')) break; items.push(this.parseTest()); }
        const c = this.expectOp(')');
        return this.node({ t: 'tuple', items }, s0, c.e);
      }
      const c = this.expectOp(')');
      return this.node({ t: 'paren', e: first }, s0, c.e);
    }
    if (t.t === 'op' && t.v === '[') {
      const s0 = t.s;
      const save = this.i;
      this.next();
      const items = [];
      try {
        while (!this.isOp(']')) {
          const it = this.parseTest();
          if (this.isName('for')) throw new SyntaxError('comp');
          items.push(it);
          if (this.isOp(',')) this.next(); else if (!this.isOp(']')) throw new SyntaxError('Thiếu ","');
        }
        const c = this.next();
        return this.node({ t: 'list', items }, s0, c.e);
      } catch {
        this.i = save;
        const end = this.skipGroup();
        return this.raw(s0, end);
      }
    }
    if (t.t === 'op' && t.v === '{') { const s0 = t.s; const end = this.skipGroup(); return this.raw(s0, end); }
    throw new SyntaxError(`Không hiểu "${t.v}"`);
  }
  skipRestOfGroup() {
    let depth = 1;
    let end = this.src.length;
    while (this.i < this.toks.length) {
      const t = this.next();
      end = t.e;
      if (t.t === 'op' && '([{'.includes(t.v)) depth++;
      else if (t.t === 'op' && ')]}'.includes(t.v)) { depth--; if (depth === 0) break; }
    }
    return end;
  }
}

/** Split an f-string body into literal strings and parsed expressions. */
function parseFString(body) {
  const parts = [];
  let buf = '';
  let i = 0;
  while (i < body.length) {
    const ch = body[i];
    if (ch === '{' && body[i + 1] === '{') { buf += '{'; i += 2; continue; }
    if (ch === '}' && body[i + 1] === '}') { buf += '}'; i += 2; continue; }
    if (ch === '{') {
      let depth = 1;
      let j = i + 1;
      while (j < body.length && depth) { if (body[j] === '{') depth++; else if (body[j] === '}') depth--; if (depth) j++; }
      let inner = body.slice(i + 1, j);
      inner = inner.replace(/![rsa]$/, '').replace(/:[^:()[\]{}'"]*$/, '').replace(/=\s*$/, '');
      if (buf) { parts.push(buf); buf = ''; }
      parts.push(parseExpr(inner));
      i = j + 1;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf) parts.push(buf);
  return parts;
}

/** Parse an expression; returns a raw node on failure (never throws). */
export function parseExpr(src) {
  const text = String(src ?? '').trim();
  try {
    const toks = tokenize(text);
    if (!toks.length) return { t: 'raw', text: '' };
    return new ExprParser(text, toks).parse();
  } catch {
    return { t: 'raw', text };
  }
}

/** Source-like text for any expression node. */
export function exprText(n) {
  if (!n) return '';
  switch (n.t) {
    case 'num': return n.raw ?? String(n.v);
    case 'str': return JSON.stringify(n.v);
    case 'fstr': return `f"${n.parts.map((p) => (typeof p === 'string' ? p : `{${exprText(p)}}`)).join('')}"`;
    case 'name': return n.v;
    case 'const': return n.v ? 'True' : 'False';
    case 'none': return 'None';
    case 'bin': return `${exprText(n.l)} ${n.op} ${exprText(n.r)}`;
    case 'bool': return `${exprText(n.l)} ${n.op} ${exprText(n.r)}`;
    case 'not': return `not ${exprText(n.e)}`;
    case 'unary': return `${n.op}${exprText(n.e)}`;
    case 'cmp': return n.items.map((it, i) => (i ? `${n.ops[i - 1]} ` : '') + exprText(it)).join(' ');
    case 'call': return `${exprText(n.f)}(${[...n.args.map(exprText), ...n.kwargs.map((k) => `${k.name}=${exprText(k.value)}`)].join(', ')})`;
    case 'attr': return `${exprText(n.e)}.${n.name}`;
    case 'index': return `${exprText(n.e)}[${exprText(n.i)}]`;
    case 'paren': return `(${exprText(n.e)})`;
    case 'tuple': return n.items.map(exprText).join(', ');
    case 'list': return `[${n.items.map(exprText).join(', ')}]`;
    case 'ternary': return `${exprText(n.a)} if ${exprText(n.cond)} else ${exprText(n.b)}`;
    default: return n.text ?? '';
  }
}

/* ------------------------------------------------------------------ statements */

/** Split source into logical lines: joins bracket/backslash continuations, strips comments. */
function logicalLines(src) {
  const lines = src.split('\n');
  const out = [];
  let buf = '';
  let startLine = 0;
  let depth = 0;
  let inTriple = null;
  for (let li = 0; li < lines.length; li++) {
    const line = lines[li];
    if (!buf) startLine = li + 1;
    let code = '';
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (inTriple) {
        const k = line.indexOf(inTriple, i);
        if (k === -1) { code += line.slice(i); i = line.length; break; }
        code += line.slice(i, k + 3); i = k + 3; inTriple = null; continue;
      }
      if (ch === '#') break;
      if (ch === '"' || ch === "'") {
        if (line.slice(i, i + 3) === ch.repeat(3)) { inTriple = ch.repeat(3); code += inTriple; i += 3; continue; }
        let j = i + 1;
        while (j < line.length && line[j] !== ch) { if (line[j] === '\\') j++; j++; }
        code += line.slice(i, j + 1); i = j + 1; continue;
      }
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth = Math.max(0, depth - 1);
      code += ch; i++;
    }
    let cont = false;
    if (/\\\s*$/.test(code) && !inTriple) { code = code.replace(/\\\s*$/, ' '); cont = true; }
    buf += (buf ? (inTriple ? '\n' : ' ') : '') + (buf ? code.trim() : code);
    if (depth > 0 || inTriple || cont) continue;
    if (buf.trim()) out.push({ line: startLine, endLine: li + 1, text: buf });
    buf = '';
  }
  if (buf.trim()) out.push({ line: startLine, endLine: lines.length, text: buf });
  return out;
}

/** Find a top-level character (outside strings/brackets) in s; returns index or -1. */
function findTop(s, pred, from = 0) {
  let depth = 0;
  for (let i = from; i < s.length; i++) {
    const ch = s[i];
    if (ch === '"' || ch === "'") {
      const triple = s.slice(i, i + 3) === ch.repeat(3);
      const q = triple ? ch.repeat(3) : ch;
      let j = i + q.length;
      while (j < s.length && !s.startsWith(q, j)) { if (s[j] === '\\') j++; j++; }
      i = j + q.length - 1;
      continue;
    }
    if ('([{'.includes(ch)) depth++;
    else if (')]}'.includes(ch)) depth--;
    else if (depth === 0 && pred(ch, i)) return i;
  }
  return -1;
}

const COMPOUND = /^(if|elif|else|for|while|def|class|try|except|finally|with|async\s+def|async\s+for|async\s+with|match|case)\b/;

function splitSemicolons(text) {
  const parts = [];
  let rest = text;
  for (;;) {
    const k = findTop(rest, (ch) => ch === ';');
    if (k === -1) { parts.push(rest); break; }
    parts.push(rest.slice(0, k));
    rest = rest.slice(k + 1);
  }
  return parts.map((p) => p.trim()).filter(Boolean);
}

function parseSimple(text, line) {
  const t = text.trim();
  let m;
  if (t === 'break') return { kind: 'break', line };
  if (t === 'continue') return { kind: 'continue', line };
  if (t === 'pass') return { kind: 'pass', line };
  if ((m = /^return\b\s*(.*)$/s.exec(t))) return { kind: 'return', line, value: m[1] ? parseExpr(m[1]) : null };
  if (/^(import|from)\s/.test(t)) return { kind: 'import', line, text: t };
  if ((m = /^(global|nonlocal)\s+(.+)$/.exec(t))) return { kind: 'global', line, names: m[2].split(',').map((x) => x.trim()) };
  if ((m = /^(del|assert|raise|yield)\b\s*(.*)$/s.exec(t))) return { kind: 'other', line, text: t, word: m[1] };
  // augmented assignment
  const aug = findTop(t, (ch, i) => /^(\*\*=|\/\/=|>>=|<<=|[+\-*/%&|^@]=)/.test(t.slice(i)) && t[i - 1] !== '=' && !/[=!<>]/.test(t[i - 1] || ''));
  if (aug > 0) {
    const opm = /^(\*\*=|\/\/=|>>=|<<=|[+\-*/%&|^@]=)/.exec(t.slice(aug));
    const target = t.slice(0, aug).trim();
    if (/^[\p{L}_][\p{L}\p{N}_.[\]'"]*$/u.test(target)) {
      return { kind: 'aug', line, target, op: opm[1], value: parseExpr(t.slice(aug + opm[1].length)) };
    }
  }
  // plain assignment (possibly chained, possibly annotated)
  const eqs = [];
  let from = 0;
  for (;;) {
    const k = findTop(t, (ch, i) => ch === '=' && t[i + 1] !== '=' && !/[=!<>+\-*/%&|^@:]/.test(t[i - 1] || ''), from);
    if (k === -1) break;
    eqs.push(k);
    from = k + 1;
  }
  if (eqs.length) {
    const pieces = [];
    let last = 0;
    for (const k of eqs) { pieces.push(t.slice(last, k)); last = k + 1; }
    const valueText = t.slice(last);
    const targets = pieces.map((p) => p.trim().replace(/:\s*[^=]+$/, '').trim());
    if (targets.every((x) => /^[\p{L}_][\p{L}\p{N}_.,\s[\]()'"]*$/u.test(x) && !/^(lambda|if|while)\b/.test(x))) {
      return { kind: 'assign', line, targets, value: parseExpr(valueText) };
    }
  }
  const ann = /^([\p{L}_][\p{L}\p{N}_]*)\s*:\s*[\p{L}_][\w\[\], .]*$/u.exec(t);
  if (ann) return { kind: 'other', line, text: t };
  const e = parseExpr(t);
  if (e.t === 'raw') return { kind: 'other', line, text: t };
  return { kind: 'expr', line, expr: e };
}

function parseHeader(text, line) {
  const m = COMPOUND.exec(text);
  const word = m[1].replace(/\s+/g, ' ');
  const colon = findTop(text, (ch, i) => ch === ':' && i >= m[0].length - 0 && !/^\s*=/.test(text.slice(i + 1, i + 2)));
  let head = colon === -1 ? text.slice(m[0].length) : text.slice(m[0].length, colon);
  const inline = colon === -1 ? '' : text.slice(colon + 1).trim();
  head = head.trim();
  const node = { kind: word, line, body: [], clauses: [], inline, missingColon: colon === -1 };
  if (word === 'if' || word === 'elif' || word === 'while') node.cond = parseExpr(head);
  else if (word === 'for' || word === 'async for') {
    const k = /^(.+?)\s+in\s+(.+)$/s.exec(head);
    if (k) { node.target = k[1].trim(); node.iter = parseExpr(k[2]); } else node.headText = head;
    node.kind = 'for';
  } else if (word === 'def' || word === 'async def') {
    const k = /^([\p{L}_][\p{L}\p{N}_]*)\s*\((.*)\)\s*(->.*)?$/su.exec(head);
    node.kind = 'def';
    node.name = k ? k[1] : head;
    node.params = k && k[2].trim() ? k[2].split(',').map((p) => p.trim().split(/[:=]/)[0].trim()).filter(Boolean) : [];
  } else {
    node.headText = head;
  }
  return node;
}

/**
 * Parse Python source into a statement tree.
 * Statement: { kind, line, ... , body?: Stmt[], clauses?: [{ kind: 'elif'|'else'|'except'|'finally', line, cond?, body }] }
 */
export function parseProgram(src) {
  let lines;
  try { lines = logicalLines(String(src ?? '')); } catch { lines = []; }
  const root = { kind: 'module', body: [], indent: -1 };
  const stack = [{ node: root, indent: -1, list: root.body }];
  let lastCompound = null; // { node, indent }
  for (const ll of lines) {
    const rawIndent = (/^[ \t]*/.exec(ll.text) || [''])[0].replace(/\t/g, '    ').length;
    const text = ll.text.trim();
    if (!text) continue;
    // Clause attaching to a previous compound at same indent (elif/else/except/finally)
    const isClause = /^(elif|else|except|finally)\b/.test(text);
    while (stack.length > 1 && stack[stack.length - 1].indent >= rawIndent) stack.pop();
    let target = stack[stack.length - 1];
    let stmts;
    try {
      if (COMPOUND.test(text)) {
        const node = parseHeader(text, ll.line);
        node.endLine = ll.endLine;
        if (isClause) {
          const owner = findClauseOwner(target.list, node.kind);
          if (owner) {
            owner.clauses.push(node);
            node.isClause = true;
          } else {
            target.list.push({ kind: 'other', line: ll.line, text, orphan: true });
            continue;
          }
        } else {
          target.list.push(node);
        }
        if (node.inline) {
          for (const p of splitSemicolons(node.inline)) node.body.push(parseSimple(p, ll.line));
        } else {
          stack.push({ node, indent: rawIndent, list: node.body });
        }
        lastCompound = node;
        continue;
      }
      stmts = splitSemicolons(text).map((p) => parseSimple(p, ll.line));
    } catch {
      stmts = [{ kind: 'other', line: ll.line, text }];
    }
    target.list.push(...stmts);
  }
  void lastCompound;
  return root.body;
}

function findClauseOwner(list, kind) {
  for (let i = list.length - 1; i >= 0; i--) {
    const n = list[i];
    if (!n) continue;
    const okKinds = kind === 'elif' ? ['if'] : kind === 'else' ? ['if', 'for', 'while', 'try'] : ['try'];
    if (okKinds.includes(n.kind)) {
      const lastClause = n.clauses[n.clauses.length - 1];
      if (lastClause && (lastClause.kind === 'else' || lastClause.kind === 'finally')) return null;
      return n;
    }
    return null;
  }
  return null;
}
