// V-Code Edu — "Định dạng mã" (Shift+Alt+F). Conservative formatters that never change program meaning:
//  - C / C++ / Java / JavaScript / CSS: brace-based re-indentation (strings, comments and template literals respected)
//  - Python / Python Tiếng Việt: leading tabs → 4 spaces, trailing whitespace stripped (indentation structure untouched)
//  - HTML: tag-based re-indentation; <script>/<style> bodies re-indented with the brace formatter; <pre>/<textarea> kept
//  - SQL: keywords upper-cased (outside strings, quoted identifiers and comments)

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const SQL_KW = new Set(('select from where insert into values update set delete create table drop alter add primary key foreign references not null unique default index '
  + 'join inner left right outer full cross on group by order having limit offset as and or in is like glob between distinct union all except intersect case when then else end '
  + 'exists asc desc integer int text real varchar char boolean date numeric blob view trigger begin commit rollback transaction if replace autoincrement check constraint collate '
  + 'natural using with recursive pragma vacuum').split(/\s+/));
const SQL_FN = new Set('count sum avg min max round abs length lower upper substr trim coalesce ifnull nullif cast date time datetime strftime julianday random total group_concat'.split(' '));

const lead = (s) => (s.match(/^[ \t]*/) || [''])[0];

/** Scan one line of C-like code, updating `st` = { depth, block, tpl } (block comment / template literal state). */
function scanLine(line, st, { lineComments = true, templates = false } = {}) {
  let i = 0;
  let quote = null;
  const n = line.length;
  while (i < n) {
    const ch = line[i];
    const nx = line[i + 1];
    if (st.block) { if (ch === '*' && nx === '/') { st.block = false; i += 2; continue; } i += 1; continue; }
    if (st.tpl) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === '`') { st.tpl = false; i += 1; continue; }
      i += 1; continue;
    }
    if (quote) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === quote) quote = null;
      i += 1; continue;
    }
    if (ch === '/' && nx === '*') { st.block = true; i += 2; continue; }
    if (lineComments && ch === '/' && nx === '/') break;
    if (ch === '"' || ch === "'") { quote = ch; i += 1; continue; }
    if (templates && ch === '`') { st.tpl = true; i += 1; continue; }
    if (ch === '{' || ch === '(' || ch === '[') st.depth += 1;
    else if (ch === '}' || ch === ')' || ch === ']') st.depth = Math.max(0, st.depth - 1);
    i += 1;
  }
}

/** Strip comments and string contents from a C-like line (best effort, single line). */
function codeOnly(t) {
  return t.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '').replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""').trim();
}

export function formatBraces(code, unit = '    ', { lang = 'c', base = 0 } = {}) {
  const lines = String(code).replace(/\r\n?/g, '\n').split('\n');
  const st = { depth: 0, block: false, tpl: false };
  const opts = { lineComments: lang !== 'css', templates: lang === 'javascript' || lang === 'typescript' };
  const out = [];
  let prev = '';
  for (const raw of lines) {
    if (st.tpl) { out.push(raw.replace(/\s+$/, '')); scanLine(raw, st, opts); continue; }
    const t = raw.trim();
    if (!t) { out.push(''); continue; }
    if (st.block) {
      out.push(unit.repeat(base + st.depth) + (t.startsWith('*') ? ` ${t}` : t));
      scanLine(t, st, opts);
      continue;
    }
    let closers = 0;
    for (const ch of t) { if (ch === '}' || ch === ')' || ch === ']') closers += 1; else break; }
    let d = Math.max(0, st.depth - closers);
    // brace-less body of if/for/while/else: indent one extra level (only the next statement)
    if (/^(?:(?:if|for|while)\s*\(.*\)|else(?:\s+if\s*\(.*\))?|do)$/.test(prev) && !t.startsWith('{')) d += 1;
    // `case x:` / `default:` labels sit one level in, their statements one further (C, C++, Java, JS)
    out.push(unit.repeat(base + d) + t);
    scanLine(t, st, opts);
    const c = codeOnly(t);
    if (c) prev = c;
  }
  return out.join('\n');
}

export function formatPython(code) {
  const lines = String(code).replace(/\r\n?/g, '\n').split('\n');
  let triple = null; // inside a triple-quoted string: keep the line verbatim
  const out = lines.map((line) => {
    const wasInside = Boolean(triple);
    // track triple quotes (ignores ones inside single-line strings/comments, good enough for a guard)
    let i = 0;
    let q = null;
    while (i < line.length) {
      const s3 = line.slice(i, i + 3);
      if (triple) { if (s3 === triple) { triple = null; i += 3; continue; } i += 1; continue; }
      const ch = line[i];
      if (q) { if (ch === '\\') { i += 2; continue; } if (ch === q) q = null; i += 1; continue; }
      if (ch === '#') break;
      if (s3 === '"""' || s3 === "'''") { triple = s3; i += 3; continue; }
      if (ch === '"' || ch === "'") q = ch;
      i += 1;
    }
    if (wasInside) return line;
    const ind = lead(line).replace(/\t/g, '    ');
    const body = line.slice(lead(line).length);
    return triple ? ind + body : (ind + body).replace(/[ \t]+$/, '');
  });
  return out.join('\n').replace(/\n{3,}$/g, '\n\n');
}

export function formatHTML(code, unit = '  ') {
  const lines = String(code).replace(/\r\n?/g, '\n').split('\n');
  const out = [];
  let depth = 0;
  let raw = null; // 'pre' | 'textarea' | 'script' | 'style'
  let rawBuf = [];
  let rawDepth = 0;
  const flushRaw = () => {
    if (raw === 'script' || raw === 'style') {
      const inner = rawBuf.join('\n');
      const formatted = formatBraces(inner.replace(/^\n+|\n+$/g, ''), unit, { lang: raw === 'style' ? 'css' : 'javascript', base: rawDepth });
      if (inner.trim()) out.push(...formatted.split('\n'));
    } else out.push(...rawBuf);
    rawBuf = [];
  };
  for (const line of lines) {
    if (raw) {
      const closeRe = new RegExp(`</${raw}\\s*>`, 'i');
      if (closeRe.test(line)) {
        const idx = line.search(closeRe);
        const before = line.slice(0, idx);
        if (before.trim()) rawBuf.push(before);
        flushRaw();
        depth = Math.max(0, rawDepth - 1);
        const rest = line.slice(idx).trim();
        out.push(unit.repeat(depth) + rest);
        raw = null;
        // tags after the closing tag on the same line
        depth += netTags(rest.replace(new RegExp(`^</${raw || '\\w+'}\\s*>`, 'i'), ''));
        continue;
      }
      rawBuf.push(line);
      continue;
    }
    const t = line.trim();
    if (!t) { out.push(''); continue; }
    const startsClosing = /^<\//.test(t) || /^-->/.test(t);
    const d = Math.max(0, depth - (startsClosing ? 1 : 0));
    out.push(unit.repeat(d) + t);
    // opening of a raw-content element left open on this line?
    const m = /<(pre|textarea|script|style)\b[^>]*>(?![\s\S]*<\/\1\s*>)/i.exec(t);
    depth = Math.max(0, depth + netTags(t));
    if (m) {
      raw = m[1].toLowerCase();
      rawDepth = depth; // netTags already counted the open tag
      const after = t.slice(m.index + m[0].length);
      if (after.trim()) rawBuf.push(after);
    }
  }
  if (raw) flushRaw();
  return out.join('\n');
}

/** Number of opened minus closed (non-void) tags on a line. */
function netTags(t) {
  let n = 0;
  const clean = t.replace(/<!--[\s\S]*?-->/g, '').replace(/"[^"]*"|'[^']*'/g, '""');
  const re = /<(\/?)([A-Za-z][\w:-]*)\b[^>]*?(\/?)>/g;
  let m;
  while ((m = re.exec(clean))) {
    const name = m[2].toLowerCase();
    if (m[1]) n -= 1;
    else if (!m[3] && !VOID_TAGS.has(name)) n += 1;
  }
  return n;
}

export function formatSQL(code) {
  let out = '';
  const src = String(code).replace(/\r\n?/g, '\n');
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (ch === '-' && src[i + 1] === '-') { const e = src.indexOf('\n', i); const stop = e === -1 ? src.length : e; out += src.slice(i, stop); i = stop; continue; }
    if (ch === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); const stop = e === -1 ? src.length : e + 2; out += src.slice(i, stop); i = stop; continue; }
    if (ch === "'" || ch === '"' || ch === '`' || ch === '[') {
      const close = ch === '[' ? ']' : ch;
      let j = i + 1;
      while (j < src.length) { if (src[j] === close) { if (src[j + 1] === close && close !== ']') { j += 2; continue; } j += 1; break; } j += 1; }
      out += src.slice(i, j); i = j; continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < src.length && /\w/.test(src[j])) j += 1;
      const w = src.slice(i, j);
      const lw = w.toLowerCase();
      const isFn = SQL_FN.has(lw) && /^\s*\(/.test(src.slice(j, j + 10));
      out += SQL_KW.has(lw) || isFn ? w.toUpperCase() : w;
      i = j; continue;
    }
    out += ch; i += 1;
  }
  return out.split('\n').map((l) => l.replace(/[ \t]+$/, '')).join('\n');
}

/** Format `code` for `lang`. Returns the new text (unchanged when the language has no formatter). */
export function formatCode(code, lang, { unit } = {}) {
  const l = String(lang || '').toLowerCase();
  let res;
  if (l === 'python' || l === 'pyvn') res = formatPython(code);
  else if (l === 'html') res = formatHTML(code, unit || '  ');
  else if (l === 'sql') res = formatSQL(code);
  else if (['c', 'cpp', 'java', 'javascript', 'typescript', 'css', 'json'].includes(l)) res = formatBraces(code, unit || (l === 'javascript' || l === 'css' || l === 'json' ? '  ' : '    '), { lang: l });
  else return code;
  res = res.replace(/[ \t]+$/gm, (m, off, s) => (l === 'python' || l === 'pyvn' ? m : '')).replace(/\n*$/, '\n');
  return res;
}

export const FORMATTABLE = new Set(['python', 'pyvn', 'html', 'sql', 'c', 'cpp', 'java', 'javascript', 'typescript', 'css', 'json']);
