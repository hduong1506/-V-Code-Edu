// V-Code Edu — Flowchart studio: source code → structured program tree (for the live flowchart).
// Python + Python Tiếng Việt (indentation based), and a best-effort brace parser for C / C++ / JavaScript / Java.
//
// Statement tree:
//   { k:'process'|'input'|'output'|'call'|'return'|'exit'|'break'|'continue', text, line, ...conv }
//   { k:'if', cond, line, then:[...], else:[...]|null }
//   { k:'while', cond, line, body }
//   { k:'for', line, init, cond, update, body, header }       (counted loops, expanded)
//   { k:'foreach', line, target, iter, body, text }
//   { k:'dowhile', line, cond, condLine, body }
// Program: { lang, main:[...], functions:[{ name, params, line, body }], warnings:[] , empty }

export const PY_LANGS = new Set(['python', 'py', 'pyvn']);
export const BRACE_LANGS = new Set(['c', 'cpp', 'c++', 'javascript', 'js', 'typescript', 'ts', 'java']);

/* ================================================================== */
/* Python / Python Tiếng Việt                                          */
/* ================================================================== */

const KW = {
  if: ['if', 'neu'], elif: ['elif', 'nguoc_lai_neu'], else: ['else', 'nguoc_lai'], for: ['for', 'lap_voi'], while: ['while', 'khi_ma'],
  def: ['def', 'ham'], return: ['return', 'tra_ve'], break: ['break', 'thoat_lap'], continue: ['continue', 'tiep_tuc'], pass: ['pass', 'bo_qua'],
};
const kwRe = (k) => KW[k].join('|');
const COMPOUND = /^(if|elif|else|for|while|def|class|try|except|finally|with|match|case|async\s+def|async\s+for|async\s+with|neu|nguoc_lai_neu|nguoc_lai|lap_voi|khi_ma|ham)\b/;

/** Split Python source into logical lines: { text, line, indent }. Comments removed, docstrings kept as text. */
function pyLogicalLines(src) {
  const out = [];
  const n = src.length;
  let i = 0;
  let line = 1;
  let buf = '';
  let startLine = 1;
  let indent = 0;
  let atLineStart = true;
  let depth = 0;
  const flush = () => {
    const t = buf.trim();
    if (t) out.push({ text: t, line: startLine, indent });
    buf = '';
    atLineStart = true;
  };
  while (i < n) {
    if (atLineStart) {
      let j = i; let col = 0;
      while (j < n && (src[j] === ' ' || src[j] === '\t')) { col += src[j] === '\t' ? 4 : 1; j += 1; }
      indent = col; startLine = line; i = j; atLineStart = false;
      continue;
    }
    const ch = src[i];
    if (ch === '#') { while (i < n && src[i] !== '\n') i += 1; continue; }
    if (ch === '"' || ch === "'") {
      const triple = src.startsWith(ch.repeat(3), i);
      const q = triple ? ch.repeat(3) : ch;
      let j = i + q.length;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src.startsWith(q, j)) { j += q.length; break; }
        if (!triple && src[j] === '\n') break;
        j += 1;
      }
      const s = src.slice(i, j);
      line += (s.match(/\n/g) || []).length;
      buf += s;
      i = j;
      continue;
    }
    if (ch === '\\' && src[i + 1] === '\n') { i += 2; line += 1; buf += ' '; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    if (ch === '\n') {
      line += 1; i += 1;
      if (depth === 0) flush(); else buf += ' ';
      continue;
    }
    if (ch === '\r') { i += 1; continue; }
    buf += ch;
    i += 1;
  }
  flush();
  return out;
}

/** Index of the first top-level ':' (outside strings/brackets), or -1. */
function topColon(text) {
  let depth = 0; let q = null;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '\\') { i += 1; continue; } if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    else if (ch === ':' && depth === 0) {
      if (text[i + 1] === '=') continue; // walrus
      return i;
    }
  }
  return -1;
}

function splitTop(text, sepChar) {
  const parts = [];
  let depth = 0; let q = null; let cur = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { cur += ch; if (ch === '\\') { cur += text[i + 1] || ''; i += 1; continue; } if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'") { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    if (ch === ')' || ch === ']' || ch === '}') depth -= 1;
    if (ch === sepChar && depth === 0) { parts.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

const INPUT_FN = /\b(input|nhap_so_thuc|nhap_so|nhap_chuoi)\s*\(/;

function pyInputType(rhs) {
  const r = rhs.replace(/\s+/g, '');
  if (/^nhap_so_thuc\(/.test(r) || /^float\(/.test(r) || /map\(float/.test(r)) return 'float';
  if (/^nhap_so\(/.test(r) || /^int\(/.test(r) || /map\(int/.test(r)) return 'int';
  if (/^nhap_chuoi\(/.test(r) || /^input\(/.test(r) || /^str\(/.test(r)) return 'str';
  return 'str';
}

const typeSuffix = (t) => (t === 'float' ? ' (số thực)' : t === 'str' ? ' (chuỗi)' : '');

function makeInput(names, type, line, raw) {
  const vars = names.map((nm) => ({ name: nm, type }));
  return {
    k: 'input', line, vars, raw,
    text: `Nhập ${names.join(', ')}`,
    designText: `Nhập ${names.map((nm) => nm + typeSuffix(type)).join(', ')}`,
  };
}

function classifyPySimple(text, line, ctx) {
  const t = text.trim();
  if (!t) return null;
  if (/^(import|from)\s/.test(t) || /^(global|nonlocal)\s/.test(t)) return null;
  if (/^("""|'''|"|')/.test(t) && /("""|'''|"|')$/.test(t)) return null; // docstring / bare string
  if (new RegExp(`^(${kwRe('pass')})$`).test(t)) return { k: 'pass', line };
  if (new RegExp(`^(${kwRe('break')})$`).test(t)) return { k: 'break', line };
  if (new RegExp(`^(${kwRe('continue')})$`).test(t)) return { k: 'continue', line };
  let m = new RegExp(`^(${kwRe('return')})\\b\\s*(.*)$`).exec(t);
  if (m) return { k: 'return', line, value: m[2].trim(), text: m[2].trim() ? `Trả về ${m[2].trim()}` : 'Kết thúc' };
  if (/^(sys\.exit|exit|quit)\s*\(.*\)$/.test(t)) return { k: 'exit', line, text: 'Kết thúc' };
  m = /^(print|in_ra)\s*\(([\s\S]*)\)$/.exec(t);
  if (m && splitTop(`${m[2]}`, ',').length >= 0) {
    const args = m[2].trim();
    const shown = splitTop(args, ',').filter((a) => !/^(sep|end|file|flush)\s*=/.test(a)).join(', ');
    return { k: 'output', line, text: shown ? `In ${shown}` : 'In dòng trống', designText: args ? `In ${args}` : 'In' };
  }
  // assignment with input
  m = /^([\p{L}_][\p{L}\p{N}_]*(?:\s*,\s*[\p{L}_][\p{L}\p{N}_]*)*)\s*=\s*(.+)$/u.exec(t);
  if (m && !/^=/.test(m[2]) && INPUT_FN.test(m[2])) {
    const names = m[1].split(',').map((s) => s.trim());
    const rhs = m[2].trim();
    if (/^list\s*\(/.test(rhs) || /\[.*for\b/.test(rhs)) {
      return { k: 'input', line, vars: null, text: `Nhập danh sách ${names.join(', ')}`, designText: t, raw: t };
    }
    return makeInput(names, pyInputType(rhs), line, t);
  }
  // user function call (bare or assigned)
  const callM = /^(?:[\p{L}_][\p{L}\p{N}_.\[\]]*\s*(?:,\s*[\p{L}_][\p{L}\p{N}_]*)*\s*(?:[-+*/%]|\/\/|\*\*)?=\s*)?([\p{L}_][\p{L}\p{N}_]*)\s*\(/u.exec(t);
  if (callM && ctx.funcs.has(callM[1])) return { k: 'call', line, text: t };
  return { k: 'process', line, text: t };
}

function parsePython(src, warnings) {
  const lines = pyLogicalLines(src);
  const funcs = new Set();
  for (const l of lines) {
    const m = new RegExp(`^(?:async\\s+)?(${kwRe('def')})\\s+([\\p{L}_][\\p{L}\\p{N}_]*)`, 'u').exec(l.text);
    if (m) funcs.add(m[2]);
  }
  const ctx = { funcs };
  const functions = [];
  let i = 0;

  function parseSuite(parentIndent, inline) {
    if (inline !== undefined) {
      return splitTop(inline.text, ';').map((s) => classifyPySimple(s, inline.line, ctx)).filter(Boolean);
    }
    const out = [];
    if (i >= lines.length || lines[i].indent <= parentIndent) return out;
    const ind = lines[i].indent;
    while (i < lines.length && lines[i].indent >= ind) {
      if (lines[i].indent > ind) {
        warnings.push(`Dòng ${lines[i].line}: thụt lề không đều — đã gộp vào khối phía trên.`);
      }
      parseStatement(out, lines[i].indent);
    }
    return out;
  }

  function headerParts(l) {
    const c = topColon(l.text);
    if (c < 0) {
      warnings.push(`Dòng ${l.line}: thiếu dấu hai chấm «:» ở cuối câu lệnh.`);
      return { head: l.text, rest: '' };
    }
    return { head: l.text.slice(0, c).trim(), rest: l.text.slice(c + 1).trim() };
  }

  function bodyOf(l, rest) {
    i += 1;
    if (rest) return parseSuite(l.indent, { text: rest, line: l.line });
    return parseSuite(l.indent);
  }

  function parseStatement(out, ind) {
    const l = lines[i];
    const t = l.text;
    if (!COMPOUND.test(t)) {
      i += 1;
      for (const s of splitTop(t, ';')) {
        const st = classifyPySimple(s, l.line, ctx);
        if (st) out.push(st);
      }
      return;
    }
    const { head, rest } = headerParts(l);
    const kw = /^(async\s+def|async\s+for|async\s+with|\S+)/.exec(head)[1].replace(/^async\s+/, '');
    const after = head.slice(head.indexOf(kw) + kw.length).trim();
    if (KW.if.includes(kw)) {
      const node = { k: 'if', cond: after, line: l.line, then: bodyOf(l, rest), else: null };
      let cur = node;
      while (i < lines.length && lines[i].indent === ind) {
        const nl = lines[i];
        const hp = /^(\S+)/.exec(nl.text)[1].replace(/:$/, '');
        if (KW.elif.includes(hp)) {
          const p = headerParts(nl);
          const cond = p.head.slice(hp.length).trim();
          const sub = { k: 'if', cond, line: nl.line, then: bodyOf(nl, p.rest), else: null };
          cur.else = [sub];
          cur = sub;
        } else if (KW.else.includes(hp)) {
          const p = headerParts(nl);
          cur.else = bodyOf(nl, p.rest);
          cur.elseLine = nl.line;
          break;
        } else break;
      }
      out.push(node);
      return;
    }
    if (KW.while.includes(kw)) {
      out.push({ k: 'while', cond: after, line: l.line, body: bodyOf(l, rest) });
      loopElse(ind);
      return;
    }
    if (KW.for.includes(kw)) {
      out.push(parsePyFor(after, l, bodyOf(l, rest)));
      loopElse(ind);
      return;
    }
    if (KW.def.includes(kw)) {
      const m = /^([\p{L}_][\p{L}\p{N}_]*)\s*\((.*)\)\s*(->.*)?$/u.exec(after);
      const name = m ? m[1] : after;
      const params = m ? m[2].trim() : '';
      functions.push({ name, params, line: l.line, body: bodyOf(l, rest) });
      return;
    }
    if (kw === 'class') {
      // methods become separate sub-charts
      const cls = /^([\p{L}_][\p{L}\p{N}_]*)/u.exec(after)?.[1] || 'Lớp';
      const before = functions.length;
      const body = bodyOf(l, rest);
      for (const f of functions.slice(before)) f.name = `${cls}.${f.name}`;
      if (body.length) warnings.push(`Dòng ${l.line}: thân lớp ${cls} chỉ vẽ các phương thức.`);
      return;
    }
    if (kw === 'try') {
      out.push(...bodyOf(l, rest));
      while (i < lines.length && lines[i].indent === ind && /^(except|else|finally)\b/.test(lines[i].text)) {
        const nl = lines[i];
        const w = /^(\w+)/.exec(nl.text)[1];
        const p = headerParts(nl);
        const b = bodyOf(nl, p.rest);
        if (w === 'finally') out.push(...b);
        else if (w === 'except') warnings.push(`Dòng ${nl.line}: nhánh «except» (xử lý lỗi) không được vẽ.`);
        else out.push(...b);
      }
      return;
    }
    if (kw === 'with') {
      out.push(...bodyOf(l, rest));
      return;
    }
    if (kw === 'match') {
      const subject = after;
      i += 1;
      const cases = [];
      if (i < lines.length && lines[i].indent > ind) {
        const cind = lines[i].indent;
        while (i < lines.length && lines[i].indent === cind && /^case\b/.test(lines[i].text)) {
          const nl = lines[i];
          const p = headerParts(nl);
          const pat = p.head.slice(4).trim();
          cases.push({ pat, line: nl.line, body: bodyOf(nl, p.rest) });
        }
      }
      let root = null; let cur = null;
      for (const c of cases) {
        if (c.pat === '_') { if (cur) cur.else = c.body; else out.push(...c.body); break; }
        const cond = c.pat.split('|').map((x) => `${subject} == ${x.trim()}`).join(' or ');
        const node = { k: 'if', cond, line: c.line, then: c.body, else: null };
        if (!root) root = node; else cur.else = [node];
        cur = node;
      }
      if (root) out.push(root);
      return;
    }
    // stray elif/else/except/case
    warnings.push(`Dòng ${l.line}: «${kw}» không nằm đúng chỗ.`);
    bodyOf(l, rest);
  }

  function loopElse(ind) {
    if (i < lines.length && lines[i].indent === ind && new RegExp(`^(${kwRe('else')})\\s*:`).test(lines[i].text)) {
      const nl = lines[i];
      warnings.push(`Dòng ${nl.line}: nhánh «else» của vòng lặp không được vẽ.`);
      bodyOf(nl, headerParts(nl).rest);
    }
  }

  const main = [];
  while (i < lines.length) {
    if (lines[i].indent > 0 && main.length === 0 && functions.length === 0) {
      warnings.push(`Dòng ${lines[i].line}: dòng đầu tiên không được thụt lề.`);
    }
    parseStatement(main, lines[i].indent);
  }
  return { main, functions };
}

function rangeArgs(args) {
  const a = splitTop(args, ',');
  if (a.length === 1) return { start: '0', stop: a[0], step: null };
  if (a.length === 2) return { start: a[0], stop: a[1], step: null };
  return { start: a[0], stop: a[1], step: a[2] };
}

function parsePyFor(after, l, body) {
  // "i in range(...)" | "i trong_khoang(...)" | "x in seq" | "x trong seq"
  let m = /^([\p{L}_][\p{L}\p{N}_]*)\s+(?:in\s+range|trong_khoang|trong\s+range)\s*\((.*)\)$/u.exec(after);
  if (m) {
    const v = m[1];
    const { start, stop, step } = rangeArgs(m[2]);
    const neg = step && /^-/.test(step.trim());
    const cond = `${v} ${neg ? '>' : '<'} ${stop}`;
    const update = step ? `${v} = ${v} + ${step.trim().startsWith('-') ? `(${step.trim()})` : step}` : `${v} = ${v} + 1`;
    const updateShown = step ? (neg ? `${v} = ${v} - ${step.trim().slice(1).trim()}` : `${v} = ${v} + ${step}`) : `${v} = ${v} + 1`;
    return {
      k: 'for', line: l.line, header: l.text,
      init: { k: 'process', line: l.line, text: `${v} = ${start}` },
      cond,
      update: { k: 'process', line: l.line, text: updateShown, designText: update },
      body,
    };
  }
  m = /^(.+?)\s+(?:in|trong)\s+(.+)$/u.exec(after);
  if (m) {
    return { k: 'foreach', line: l.line, target: m[1].trim(), iter: m[2].trim(), text: `Duyệt ${m[1].trim()} trong ${m[2].trim()}`, body };
  }
  return { k: 'foreach', line: l.line, target: after, iter: '', text: `Lặp ${after}`, body };
}

/* ================================================================== */
/* C / C++ / JavaScript / Java (brace based, best effort)              */
/* ================================================================== */

/** Replace comments and preprocessor lines with spaces (keeps offsets/line numbers). */
function stripC(src) {
  const a = src.split('');
  const n = a.length;
  let i = 0;
  let lineStart = true;
  while (i < n) {
    const ch = a[i];
    if (lineStart && /\s/.test(ch) && ch !== '\n') { i += 1; continue; }
    if (lineStart && ch === '#') {
      while (i < n && a[i] !== '\n') { a[i] = ' '; i += 1; }
      continue;
    }
    lineStart = false;
    if (ch === '\n') { lineStart = true; i += 1; continue; }
    if (ch === '/' && a[i + 1] === '/') { while (i < n && a[i] !== '\n') { a[i] = ' '; i += 1; } continue; }
    if (ch === '/' && a[i + 1] === '*') {
      while (i < n && !(a[i] === '*' && a[i + 1] === '/')) { if (a[i] !== '\n') a[i] = ' '; i += 1; }
      if (i < n) { a[i] = ' '; a[i + 1] = ' '; i += 2; }
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      const q = ch; i += 1;
      while (i < n && a[i] !== q) { if (a[i] === '\\') i += 1; i += 1; }
      i += 1;
      continue;
    }
    i += 1;
  }
  return a.join('');
}

const C_TYPES = 'unsigned|signed|long|short|int|float|double|char|bool|auto|string|std::string|void|const|static|let|var|size_t|long\\s+long|String|boolean';
const DECL_RE = new RegExp(`^(?:(?:${C_TYPES})\\s+)+`);

function cStripDecl(text) {
  const m = DECL_RE.exec(text);
  if (!m) return { decl: false, text };
  return { decl: true, type: m[0].trim(), text: text.slice(m[0].length).trim() };
}

function cTypeToKind(type) {
  if (/float|double/.test(type || '')) return 'float';
  if (/char|string|String/.test(type || '')) return 'str';
  return 'int';
}

function printfToArgs(fmt, args) {
  // "Tong = %d\n", tong  →  "Tong =", tong
  const parts = [];
  const re = /%[-+ #0]*\d*(?:\.\d+)?(?:hh|h|ll|l|L|z)?[diufFeEgGxXoscp%]/g;
  let last = 0; let ai = 0; let m;
  const pushLit = (s) => {
    const t = s.replace(/\\n|\\t/g, ' ').trim();
    if (t) parts.push(JSON.stringify(t).replace(/\\\\/g, '\\'));
  };
  while ((m = re.exec(fmt))) {
    pushLit(fmt.slice(last, m.index));
    if (m[0] === '%%') parts.push('"%"');
    else if (ai < args.length) parts.push(args[ai++]);
    last = m.index + m[0].length;
  }
  pushLit(fmt.slice(last));
  return parts;
}

function scanfTypes(fmt) {
  const out = [];
  const re = /%[*]?\d*(?:hh|h|ll|l|L)?([diufFeEgGxXoscp])/g;
  let m;
  while ((m = re.exec(fmt))) out.push(/[fFeEgG]/.test(m[1]) ? 'float' : /[sc]/.test(m[1]) ? 'str' : 'int');
  return out;
}

class CParser {
  constructor(src, lang, warnings) {
    this.raw = src;
    this.src = stripC(src);
    this.lang = lang;
    this.warnings = warnings;
    this.i = 0;
    this.n = this.src.length;
    this.lineAt = [];
    let ln = 1;
    for (let k = 0; k <= this.src.length; k++) { this.lineAt[k] = ln; if (this.src[k] === '\n') ln += 1; }
    this.funcs = new Set();
    this.types = new Map(); // variable → declared C type
    this.isJS = /^(javascript|js|typescript|ts)$/.test(lang);
    const fre = this.isJS
      ? /\bfunction\s+([A-Za-z_$][\w$]*)|\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\([^)]*\)\s*=>|[A-Za-z_$][\w$]*\s*=>)/g
      : /\b[A-Za-z_][\w:<>,\s*&]*?\s+\**([A-Za-z_]\w*)\s*\([^;{)]*\)\s*(?:const\s*)?\{/g;
    let m;
    while ((m = fre.exec(this.src))) {
      const nm = m[1] || m[2];
      if (nm && !/^(if|for|while|switch|return|else|catch|main)$/.test(nm)) this.funcs.add(nm);
    }
  }

  line(pos = this.i) { return this.lineAt[Math.min(pos, this.n)] || 1; }
  ws() { while (this.i < this.n && /\s/.test(this.src[this.i])) this.i += 1; }
  peekWord() { this.ws(); const m = /^[A-Za-z_$][\w$]*/.exec(this.src.slice(this.i, this.i + 40)); return m ? m[0] : ''; }
  eat(s) { this.ws(); if (this.src.startsWith(s, this.i)) { this.i += s.length; return true; } return false; }

  /** Read balanced text starting at an opening bracket; returns inner text. */
  balanced(open, close) {
    this.ws();
    if (this.src[this.i] !== open) return '';
    let depth = 0; const start = this.i + 1;
    for (; this.i < this.n; this.i++) {
      const ch = this.src[this.i];
      if (ch === '"' || ch === "'" || ch === '`') { this.skipString(); this.i -= 1; continue; }
      if (ch === open) depth += 1;
      else if (ch === close) { depth -= 1; if (depth === 0) { this.i += 1; return this.raw.slice(start, this.i - 1); } }
    }
    return this.raw.slice(start);
  }

  skipString() {
    const q = this.src[this.i]; this.i += 1;
    while (this.i < this.n && this.src[this.i] !== q) { if (this.src[this.i] === '\\') this.i += 1; this.i += 1; }
    this.i += 1;
  }

  /** Read a simple statement up to ';' (or newline for JS when complete). */
  simpleText() {
    this.ws();
    const start = this.i; let depth = 0;
    for (; this.i < this.n; this.i++) {
      const ch = this.src[this.i];
      if (ch === '"' || ch === "'" || ch === '`') { this.skipString(); this.i -= 1; continue; }
      if (ch === '(' || ch === '[' || ch === '{') depth += 1;
      else if (ch === ')' || ch === ']' || ch === '}') {
        if (depth === 0) break;
        depth -= 1;
      } else if (ch === ';' && depth === 0) { const t = this.raw.slice(start, this.i); this.i += 1; return t.trim(); }
      else if (ch === '\n' && depth === 0 && this.isJS) {
        const before = this.raw.slice(start, this.i).trimEnd();
        const rest = this.src.slice(this.i).replace(/^\s+/, '');
        if (before && !/[+\-*/%=&|,(<>?:.!]$/.test(before) && !/^[.+\-*/%?:&|)\]=]/.test(rest)) {
          return before.trim();
        }
      }
    }
    return this.raw.slice(start, this.i).trim();
  }

  parseProgram() {
    const main = []; const functions = [];
    this.parseTop(main, functions);
    return { main, functions };
  }

  parseTop(main, functions) {
    while (this.i < this.n) {
      this.ws();
      if (this.i >= this.n) break;
      if (this.src[this.i] === '}') { this.i += 1; continue; }
      if (this.src[this.i] === ';') { this.i += 1; continue; }
      const save = this.i;
      const w = this.peekWord();
      if (w === 'using' || w === 'typedef' || w === 'import' || w === 'package') { this.simpleText(); continue; }
      if (/^(struct|class|interface|enum|namespace)$/.test(w) || (/^(public|private|protected)$/.test(w) && /\b(class|interface)\b/.test(this.src.slice(this.i, this.i + 80).split('{')[0]))) {
        // class/namespace: descend into its body (methods become sub-charts)
        const headEnd = this.findHeadEnd();
        if (headEnd && this.src[headEnd.pos] === '{') {
          this.i = headEnd.pos;
          const inner = this.balanced('{', '}');
          const sub = new CParser(inner, this.lang, this.warnings);
          sub.lineOffset = this.line(headEnd.pos) - 1;
          sub.funcs = this.funcs;
          const r = sub.parseProgram();
          const shift = (arr) => arr.forEach((s) => shiftLines(s, sub.lineOffset));
          r.functions.forEach((f) => { f.line += sub.lineOffset; shift(f.body); functions.push(f); });
          if (r.main.length && this.isJS) { shift(r.main); main.push(...r.main); }
          this.eat(';');
          continue;
        }
        this.i = save;
      }
      const fn = this.tryFunction();
      if (fn) { functions.push(fn); continue; }
      this.i = save;
      // top-level statement (JS scripts; C globals)
      const before = this.i;
      const st = this.parseStatement();
      if (this.i === before) this.i += 1;
      if (st) main.push(...st);
    }
  }

  findHeadEnd() {
    let depth = 0;
    for (let k = this.i; k < this.n; k++) {
      const ch = this.src[k];
      if (ch === '(') depth += 1; else if (ch === ')') depth -= 1;
      else if ((ch === '{' || ch === ';') && depth === 0) return { pos: k };
      else if (ch === '"' || ch === "'") { const q = ch; k += 1; while (k < this.n && this.src[k] !== q) { if (this.src[k] === '\\') k += 1; k += 1; } }
    }
    return null;
  }

  tryFunction() {
    const save = this.i;
    const he = this.findHeadEnd();
    if (!he || this.src[he.pos] !== '{') return null;
    const head = this.raw.slice(this.i, he.pos).replace(/\s+/g, ' ').trim();
    let m;
    let name = null; let params = '';
    if (this.isJS) {
      m = /^(?:export\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\((.*)\)$/.exec(head)
        || /^(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\s*\((.*)\)|\((.*)\)\s*=>|([A-Za-z_$][\w$]*)\s*=>)$/.exec(head);
      if (m) { name = m[1]; params = (m[2] ?? m[3] ?? m[4] ?? '').trim(); }
    } else {
      m = /^(?:(?:public|private|protected|static|final|inline|virtual|extern|const|unsigned|signed|synchronized)\s+)*[A-Za-z_][\w:<>,\s*&\[\]]*?[\s*&]+\**([A-Za-z_]\w*)\s*\(([^()]*)\)\s*(?:const|throws\s+[\w, ]+)?$/.exec(head);
      if (m && !/^(if|for|while|switch|return|else|do|catch|sizeof)$/.test(m[1])) { name = m[1]; params = m[2].trim(); }
    }
    if (!name) { this.i = save; return null; }
    const line = this.line(this.i);
    this.i = he.pos;
    const body = this.parseBlockAt();
    return { name, params, line, body, isMain: name === 'main' };
  }

  parseBlockAt() {
    // at '{'
    this.ws();
    const out = [];
    if (this.src[this.i] !== '{') return out;
    this.i += 1;
    for (;;) {
      this.ws();
      if (this.i >= this.n) break;
      if (this.src[this.i] === '}') { this.i += 1; break; }
      const before = this.i;
      const st = this.parseStatement();
      if (st) out.push(...st);
      if (this.i === before) this.i += 1;
    }
    return out;
  }

  /** Parse one statement → array of statement nodes (possibly empty). */
  parseStatement() {
    this.ws();
    if (this.i >= this.n) return [];
    const ch = this.src[this.i];
    if (ch === '{') return this.parseBlockAt();
    if (ch === ';') { this.i += 1; return []; }
    const line = this.line();
    const w = this.peekWord();
    switch (w) {
      case 'if': {
        this.i += 2;
        const cond = this.balanced('(', ')').trim();
        const then = this.parseStatement();
        let els = null; let elseLine;
        const save = this.i;
        if (this.peekWord() === 'else') {
          elseLine = this.line();
          this.i += 4;
          els = this.parseStatement();
        } else this.i = save;
        return [{ k: 'if', cond, line, then, else: els, elseLine }];
      }
      case 'while': {
        this.i += 5;
        const cond = this.balanced('(', ')').trim();
        const body = this.parseStatement();
        return [{ k: 'while', cond: cond || 'true', line, body }];
      }
      case 'do': {
        this.i += 2;
        const body = this.parseStatement();
        let cond = 'true'; let condLine = line;
        if (this.peekWord() === 'while') { condLine = this.line(); this.i += 5; cond = this.balanced('(', ')').trim(); this.eat(';'); }
        return [{ k: 'dowhile', cond, condLine, line, body }];
      }
      case 'for': {
        this.i += 3;
        this.ws();
        const head = this.balanced('(', ')');
        const body = this.parseStatement();
        const parts = splitTop(head.replace(/\n/g, ' '), ';');
        if (head.split(';').length >= 3) {
          const [ini = '', cnd = '', upd = ''] = head.split(';').map((s) => s.trim());
          const init = ini ? this.cProcess(ini, line) : null;
          const update = upd ? { k: 'process', line, text: upd.split(',').map((s) => s.trim()).join('\n') } : null;
          return [{ k: 'for', line, header: `for (${head.trim()})`, init, cond: cnd || 'true', update, body }];
        }
        // for (x of arr) / for (auto x : v) / for (x in obj)
        const m = /^(?:(?:const|let|var|auto|int|char|double|float|string|std::string|String|long)\s*&?\s+)?([\w$]+)\s*(?:\bof\b|\bin\b|:)\s*(.+)$/.exec(head.trim());
        if (m) return [{ k: 'foreach', line, target: m[1], iter: m[2].trim(), text: `Duyệt ${m[1]} trong ${m[2].trim()}`, body }];
        void parts;
        return [{ k: 'foreach', line, target: head.trim(), iter: '', text: `Lặp ${head.trim()}`, body }];
      }
      case 'switch': {
        this.i += 6;
        const subject = this.balanced('(', ')').trim();
        this.ws();
        if (this.src[this.i] !== '{') return [];
        const bodyStart = this.i + 1;
        this.i += 1;
        // collect case labels + statements
        const groups = []; let cur = null;
        for (;;) {
          this.ws();
          if (this.i >= this.n) break;
          if (this.src[this.i] === '}') { this.i += 1; break; }
          const ww = this.peekWord();
          if (ww === 'case' || ww === 'default') {
            const l2 = this.line();
            let label = null;
            if (ww === 'case') {
              this.i += 4;
              const start = this.i;
              while (this.i < this.n && !(this.src[this.i] === ':' && this.src[this.i + 1] !== ':' && this.src[this.i - 1] !== ':')) this.i += 1;
              label = this.raw.slice(start, this.i).trim();
              this.i += 1;
            } else { this.i += 7; this.eat(':'); }
            if (!cur || cur.body.length) { cur = { labels: [], body: [], line: l2, isDefault: false }; groups.push(cur); }
            if (label === null) cur.isDefault = true; else cur.labels.push(label);
            continue;
          }
          const before = this.i;
          const st = this.parseStatement();
          if (this.i === before) this.i += 1;
          if (cur) cur.body.push(...st);
        }
        void bodyStart;
        let root = null; let tail = null; let defBody = null;
        for (const g of groups) {
          // drop the trailing break of each case
          const body = g.body.slice();
          if (body.length && body[body.length - 1].k === 'break') body.pop();
          if (g.isDefault && !g.labels.length) { defBody = body; continue; }
          const node = { k: 'if', cond: g.labels.map((lb) => `${subject} == ${lb}`).join(' || '), line: g.line, then: body, else: null };
          if (!root) root = node; else tail.else = [node];
          tail = node;
        }
        if (defBody) { if (tail) tail.else = defBody; else return defBody; }
        return root ? [root] : [];
      }
      case 'return': {
        this.i += 6;
        const v = this.simpleText().trim();
        return [{ k: 'return', line, value: v, text: v ? `Trả về ${v}` : 'Kết thúc' }];
      }
      case 'break': this.i += 5; this.eat(';'); return [{ k: 'break', line }];
      case 'continue': this.i += 8; this.eat(';'); return [{ k: 'continue', line }];
      case 'else': this.i += 4; return this.parseStatement();
      case 'try': {
        this.i += 3;
        const body = this.parseStatement();
        while (this.peekWord() === 'catch' || this.peekWord() === 'finally') {
          const isFinally = this.peekWord() === 'finally';
          this.i += isFinally ? 7 : 5;
          if (!isFinally) this.balanced('(', ')');
          const b = this.parseStatement();
          if (isFinally) body.push(...b);
          else this.warnings.push(`Dòng ${line}: nhánh «catch» không được vẽ.`);
        }
        return body;
      }
      case 'function': {
        const fn = this.tryFunction();
        if (fn) { this.extraFunctions = (this.extraFunctions || []); this.extraFunctions.push(fn); return []; }
        break;
      }
      default: break;
    }
    const text = this.simpleText();
    if (!text) return [];
    return this.classifyC(text, line);
  }

  cProcess(text, line) {
    const d = cStripDecl(text);
    if (d.decl) {
      const decls = splitTop(d.text, ',');
      for (const one of decls) {
        const nm = /^\**([A-Za-z_]\w*)/.exec(one);
        if (nm) this.types.set(nm[1], d.type);
      }
      const withInit = decls.filter((x) => /=/.test(x));
      if (!withInit.length) return null; // pure declaration: no flowchart box
      return { k: 'process', line, text: withInit.join('\n') };
    }
    return { k: 'process', line, text };
  }

  classifyC(text, line) {
    const t = text.replace(/\s+/g, ' ').trim();
    if (/^(using|typedef)\b/.test(t)) return [];
    // output
    let m = /^(?:std::)?printf\s*\(\s*"((?:[^"\\]|\\.)*)"\s*(?:,(.*))?\)$/.exec(t);
    if (m) {
      const args = printfToArgs(m[1], m[2] ? splitTop(m[2], ',') : []);
      return [{ k: 'output', line, text: `In ${args.join(', ') || '""'}`, designText: `In ${args.join(', ')}` }];
    }
    m = /^(?:std::)?puts\s*\((.*)\)$/.exec(t);
    if (m) return [{ k: 'output', line, text: `In ${m[1]}`, designText: `In ${m[1]}` }];
    if (/^(?:std::)?cout\s*<</.test(t)) {
      const parts = t.replace(/^(?:std::)?cout\s*<</, '').split('<<').map((s) => s.trim()).filter((s) => s && !/^(?:std::)?endl$/.test(s) && s !== '"\\n"' && s !== "'\\n'");
      const args = parts.map((p) => {
        if (!/^".*"$/.test(p)) return p;
        const inner = p.slice(1, -1).replace(/\\n|\\t/g, ' ').trim();
        return inner ? `"${inner}"` : '""';
      }).filter((p) => p !== '""');
      return [{ k: 'output', line, text: `In ${args.join(', ') || 'dòng trống'}`, designText: `In ${args.join(', ')}` }];
    }
    m = /^(?:console\.log|document\.write(?:ln)?|alert|System\.out\.print(?:ln|f)?)\s*\((.*)\)$/.exec(t);
    if (m) {
      const args = splitTop(m[1], ',').filter((a) => a.trim()).map((a) => a.replace(/^\s*\+\s*/, ''));
      const trimLit = (a) => (/^"[^"]*"$/.test(a.trim()) ? `\"${a.trim().slice(1, -1).trim()}\"` : a.trim());
      const shown = args.length === 1 && /\+/.test(args[0]) ? splitTop(args[0].replace(/\+/g, ','), ',').map(trimLit).filter((a) => a !== '""') : args;
      return [{ k: 'output', line, text: `In ${shown.join(', ') || 'dòng trống'}`, designText: `In ${shown.join(', ')}` }];
    }
    // input
    m = /^(?:std::)?scanf\s*\(\s*"((?:[^"\\]|\\.)*)"\s*,(.*)\)$/.exec(t);
    if (m) {
      const types = scanfTypes(m[1]);
      const names = splitTop(m[2], ',').map((s) => s.replace(/^&/, '').trim());
      return [this.cInput(names, names.map((nm, k) => types[k] || cTypeToKind(this.types.get(nm))), line)];
    }
    if (/^(?:std::)?cin\s*>>/.test(t)) {
      const names = t.replace(/^(?:std::)?cin\s*>>/, '').split('>>').map((s) => s.trim()).filter(Boolean);
      return [this.cInput(names, names.map((nm) => cTypeToKind(this.types.get(nm))), line)];
    }
    // JS / Java input in declarations: let n = Number(prompt()); int n = sc.nextInt();
    const d = cStripDecl(t);
    const body = d.text;
    m = /^([A-Za-z_$][\w$]*)\s*=\s*(.+)$/.exec(body);
    if (m && /\b(prompt|readline|nextInt|nextDouble|nextLine|next|nextFloat|nextLong)\s*\(/.test(m[2])) {
      const rhs = m[2];
      let type = 'str';
      if (/parseInt|Number\(|nextInt|nextLong|\+prompt/.test(rhs)) type = 'int';
      if (/parseFloat|nextDouble|nextFloat/.test(rhs)) type = 'float';
      if (d.decl) this.types.set(m[1], d.type);
      return [this.cInput([m[1]], [type], line)];
    }
    if (/^(?:process\.)?exit\s*\(/.test(t) || /^System\.exit\s*\(/.test(t)) return [{ k: 'exit', line, text: 'Kết thúc' }];
    if (/^(?:Scanner|BufferedReader)\b/.test(t) || /=\s*new\s+Scanner\b/.test(t)) return [];
    if (/^(?:const|let|var)\s+\w+\s*=\s*require\(/.test(t)) return [];
    const callM = /^(?:[\w$.[\]]+\s*[-+*/%]?=\s*)?([A-Za-z_$][\w$]*)\s*\(/.exec(body);
    if (callM && this.funcs.has(callM[1])) return [{ k: 'call', line, text: d.decl ? body : t }];
    const p = this.cProcess(t, line);
    return p ? [p] : [];
  }

  cInput(names, types, line) {
    const same = types.every((x) => x === types[0]);
    const st = {
      k: 'input', line, raw: '',
      vars: names.map((nm, k) => ({ name: nm, type: types[k] || 'int' })),
      text: `Nhập ${names.join(', ')}`,
    };
    st.designText = `Nhập ${st.vars.map((v) => v.name + typeSuffix(v.type)).join(', ')}`;
    void same;
    return st;
  }
}

function shiftLines(s, off) {
  if (!s || typeof s !== 'object') return;
  if (typeof s.line === 'number') s.line += off;
  if (typeof s.condLine === 'number') s.condLine += off;
  if (typeof s.elseLine === 'number') s.elseLine += off;
  for (const k of ['then', 'else', 'body']) if (Array.isArray(s[k])) s[k].forEach((x) => shiftLines(x, off));
  for (const k of ['init', 'update']) if (s[k]) shiftLines(s[k], off);
}

function parseBrace(src, lang, warnings) {
  const p = new CParser(src, lang, warnings);
  const { main, functions } = p.parseProgram();
  if (p.extraFunctions) functions.push(...p.extraFunctions);
  const mainFn = functions.find((f) => f.isMain);
  if (mainFn) {
    const rest = functions.filter((f) => f !== mainFn);
    const endMain = (list) => (list || []).forEach((st) => {
      if (st.k === 'return') { st.k = 'exit'; st.text = 'Kết thúc'; }
      for (const k of ['then', 'else', 'body']) if (Array.isArray(st[k])) endMain(st[k]);
    });
    endMain(mainFn.body);
    return { main: mainFn.body, functions: rest, mainLine: mainFn.line };
  }
  return { main, functions };
}

/* ================================================================== */

export function normalizeLangName(lang) {
  const l = String(lang || 'python').toLowerCase();
  if (l === 'py' || l === 'python3') return 'python';
  if (l === 'c++' || l === 'cc' || l === 'cxx') return 'cpp';
  if (l === 'js' || l === 'node') return 'javascript';
  if (l === 'ts') return 'typescript';
  return l;
}

export function parseProgram(code, lang) {
  const l = normalizeLangName(lang);
  const warnings = [];
  const src = String(code ?? '').replace(/\r\n?/g, '\n');
  let res;
  if (PY_LANGS.has(l)) res = parsePython(src, warnings);
  else if (BRACE_LANGS.has(l)) res = parseBrace(src, l, warnings);
  else return { lang: l, unsupported: true, main: [], functions: [], warnings };
  const empty = !res.main.length && !res.functions.length;
  return { lang: l, ...res, warnings, empty };
}
