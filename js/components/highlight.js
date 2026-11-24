// V-Code Edu — lightweight syntax highlighter (no dependencies).
// highlight(code, lang) -> escaped HTML string with <span class="tok-*"> wrappers.
// Supported: python, pyvn, javascript (js), typescript (ts), c, cpp (c++), java, html (xml), css, sql, json, bash (sh, shell), plaintext.

import { esc } from '../core/dom.js';

const words = (str) => new Set(str.split(/\s+/).filter(Boolean));

const PY_KEYWORDS = words('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield match case');
const PY_BUILTINS = words('print input int float str bool list dict set tuple range len sum min max abs round sorted reversed enumerate zip map filter open type isinstance any all ord chr divmod pow super object Exception ValueError TypeError IndexError KeyError ZeroDivisionError self');
const PYVN_KEYWORDS = words('neu nguoc_lai_neu nguoc_lai lap_voi trong_khoang trong khi_ma va hoac khong_phai dung sai ham tra_ve thoat_lap tiep_tuc bo_qua');
const PYVN_BUILTINS = words('nhap_so nhap_so_thuc nhap_chuoi in_ra do_dai');
const JS_KEYWORDS = words('break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new of return super switch this throw try typeof var void while with yield async await static get set null undefined true false');
const JS_BUILTINS = words('console Math JSON Object Array String Number Boolean Promise Map Set Date RegExp Error window document parseInt parseFloat isNaN fetch setTimeout setInterval clearTimeout');
const C_KEYWORDS = words('auto break case char const continue default do double else enum extern float for goto if inline int long register restrict return short signed sizeof static struct switch typedef union unsigned void volatile while bool true false NULL');
const CPP_KEYWORDS = words('alignas alignof and asm auto bool break case catch char class const constexpr const_cast continue decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not nullptr operator or private protected public register reinterpret_cast return short signed sizeof static static_cast struct switch template this throw true try typedef typeid typename union unsigned using virtual void volatile while');
const CPP_BUILTINS = words('std cout cin endl cerr string vector map set pair queue stack priority_queue deque unordered_map unordered_set sort swap min max abs printf scanf puts getline size_t memset strlen strcpy strcmp');
const JAVA_KEYWORDS = words('abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null var record');
const SQL_KEYWORDS = words('select from where insert into values update set delete create table drop alter add primary key foreign references not null unique default index join inner left right outer full on group by order having limit offset as and or in is like between distinct union all case when then else end exists asc desc count sum avg min max integer int text real varchar char boolean date');
const BASH_KEYWORDS = words('if then else elif fi for while do done case esac function in return export local echo cd ls pip python uvicorn npm git source');

const LANG_ALIASES = { js: 'javascript', mjs: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', 'c++': 'cpp', cc: 'cpp', h: 'c', hpp: 'cpp', py: 'python', python3: 'python', xml: 'html', svg: 'html', htm: 'html', sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash', sqlite: 'sql', mysql: 'sql', text: 'plaintext', txt: 'plaintext', '': 'plaintext' };

export function normalizeLang(lang) {
  const l = String(lang || '').toLowerCase().trim();
  return LANG_ALIASES[l] || l;
}

function wrap(cls, text) {
  return cls ? `<span class="tok-${cls}">${esc(text)}</span>` : esc(text);
}

// Generic rule-based tokenizer. Rules are [regex(sticky), classifier(match) -> class|null]
function tokenize(code, rules) {
  let out = '';
  let i = 0;
  const n = code.length;
  let plain = '';
  outer: while (i < n) {
    for (const [re, cls] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (m && m.index === i && m[0].length > 0) {
        if (plain) { out += esc(plain); plain = ''; }
        const c = typeof cls === 'function' ? cls(m[0], m) : cls;
        out += wrap(c, m[0]);
        i += m[0].length;
        continue outer;
      }
    }
    plain += code[i];
    i += 1;
  }
  if (plain) out += esc(plain);
  return out;
}

function identClassifier(keywords, builtins, extraKeywords) {
  return (word, m) => {
    if (keywords.has(word) || (extraKeywords && extraKeywords.has(word))) return 'keyword';
    if (builtins && builtins.has(word)) return 'builtin';
    // function call: identifier followed by "("
    const after = m.input.slice(m.index + word.length, m.index + word.length + 40);
    if (/^\s*\(/.test(after)) return 'function';
    if (/^[A-Z][A-Za-z0-9_]*$/.test(word) && word.length > 1) return 'type';
    return null;
  };
}

const NUM = [/\b(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?[jJlLuUfF]*)\b/y, 'number'];
const OPS = [/[+\-*/%=<>!&|^~?:]+/y, 'operator'];
const PUNCT = [/[()[\]{},;.]/y, 'punct'];

const RULES = {
  python: [
    [/#[^\n]*/y, 'comment'],
    [/(?:[rRbBuUfF]{1,2})?(?:"""[\s\S]*?(?:"""|$)|'''[\s\S]*?(?:'''|$))/y, 'string'],
    [/(?:[rRbBuUfF]{1,2})?(?:"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?)/y, 'string'],
    [/@[A-Za-z_][\w.]*/y, 'meta'],
    NUM,
    [/[A-Za-z_À-ỹ][\wÀ-ỹ]*/y, identClassifier(PY_KEYWORDS, PY_BUILTINS)],
    OPS, PUNCT,
  ],
  pyvn: null, // filled below (python + Vietnamese keywords)
  javascript: [
    [/\/\/[^\n]*/y, 'comment'],
    [/\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'],
    [/`(?:\\.|[^`\\])*`?/y, 'string'],
    [/"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/y, 'string'],
    NUM,
    [/[A-Za-z_$][\w$]*/y, identClassifier(JS_KEYWORDS, JS_BUILTINS)],
    [/=>/y, 'keyword'],
    OPS, PUNCT,
  ],
  c: [
    [/\/\/[^\n]*/y, 'comment'],
    [/\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'],
    [/#\s*\w+(?:[ \t]+<[^>\n]*>)?/y, 'meta'],
    [/"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/y, 'string'],
    NUM,
    [/[A-Za-z_]\w*/y, identClassifier(C_KEYWORDS, words('printf scanf puts gets malloc free strlen strcpy strcmp memset sqrt pow abs fopen fclose fprintf fscanf'))],
    OPS, PUNCT,
  ],
  cpp: null,
  java: null,
  css: [
    [/\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'],
    [/"(?:\\.|[^"\\\n])*"?|'(?:\\.|[^'\\\n])*'?/y, 'string'],
    [/@[\w-]+/y, 'keyword'],
    [/#[0-9a-fA-F]{3,8}\b/y, 'number'],
    [/-?\d*\.?\d+(?:px|em|rem|%|vh|vw|s|ms|deg|fr|ch|vmin|vmax)?\b/y, 'number'],
    [/--[\w-]+/y, 'attr'],
    [/[\w-]+(?=\s*:(?!:))/y, 'attr'],
    [/[.#]?[A-Za-z_][\w-]*/y, (w) => (w.startsWith('.') || w.startsWith('#') ? 'type' : 'tag')],
    [/::?[\w-]+/y, 'builtin'],
    [/[{}();:,>+~*]/y, 'punct'],
  ],
  sql: [
    [/--[^\n]*/y, 'comment'],
    [/\/\*[\s\S]*?(?:\*\/|$)/y, 'comment'],
    [/'(?:''|[^'])*'?/y, 'string'],
    [/"(?:[^"])*"?/y, 'type'],
    NUM,
    [/[A-Za-z_]\w*/y, (w, m) => (SQL_KEYWORDS.has(w.toLowerCase()) ? 'keyword' : (/^\s*\(/.test(m.input.slice(m.index + w.length)) ? 'function' : null))],
    [/[=<>!*+\-/%]+/y, 'operator'],
    [/[(),;.]/y, 'punct'],
  ],
  json: [
    [/"(?:\\.|[^"\\])*"(?=\s*:)/y, 'attr'],
    [/"(?:\\.|[^"\\])*"?/y, 'string'],
    [/\b(?:true|false|null)\b/y, 'keyword'],
    NUM,
    [/[{}[\],:]/y, 'punct'],
  ],
  bash: [
    [/#[^\n]*/y, 'comment'],
    [/"(?:\\.|[^"\\])*"?|'[^']*'?/y, 'string'],
    [/\$\{?[\w@#?*!-]+\}?/y, 'attr'],
    [/(?<=\s|^)--?[\w-]+/y, 'builtin'],
    NUM,
    [/[A-Za-z_][\w.-]*/y, (w) => (BASH_KEYWORDS.has(w) ? 'keyword' : null)],
    [/[|&;<>()=]+/y, 'operator'],
  ],
};

RULES.pyvn = RULES.python.map((rule) => (rule[1] && typeof rule[1] === 'function'
  ? [rule[0], (w, m) => (PYVN_KEYWORDS.has(w) ? 'keyword' : PYVN_BUILTINS.has(w) ? 'builtin' : rule[1](w, m))]
  : rule));
RULES.cpp = RULES.c.map((rule) => (rule[1] && typeof rule[1] === 'function' ? [rule[0], identClassifier(CPP_KEYWORDS, CPP_BUILTINS)] : rule));
RULES.java = RULES.c.filter((r) => r[1] !== 'meta').map((rule) => (rule[1] && typeof rule[1] === 'function' ? [rule[0], identClassifier(JAVA_KEYWORDS, words('System String Math Integer Scanner ArrayList HashMap List Map out println print'))] : rule));
RULES.java.splice(2, 0, [/@\w+/y, 'meta']);
RULES.typescript = RULES.javascript.map((rule) => (rule[1] && typeof rule[1] === 'function' ? [rule[0], identClassifier(JS_KEYWORDS, JS_BUILTINS, words('interface type enum implements private public protected readonly declare namespace abstract as keyof string number boolean any unknown never'))] : rule));

function highlightHTML(code) {
  let out = '';
  let i = 0;
  const n = code.length;
  while (i < n) {
    if (code.startsWith('<!--', i)) {
      const end = code.indexOf('-->', i + 4);
      const stop = end === -1 ? n : end + 3;
      out += wrap('comment', code.slice(i, stop));
      i = stop;
      continue;
    }
    if (code[i] === '<' && /[A-Za-z!/]/.test(code[i + 1] || '')) {
      const end = code.indexOf('>', i);
      const stop = end === -1 ? n : end + 1;
      const tag = code.slice(i, stop);
      // tag name
      const m = /^(<\/?|<!)([A-Za-z][\w:-]*)?/.exec(tag);
      let j = m ? m[0].length : 1;
      out += wrap('punct', m ? m[1] : '<');
      if (m && m[2]) out += wrap('tag', m[2]);
      const rest = tag.slice(j, tag.endsWith('/>') ? -2 : tag.endsWith('>') ? -1 : undefined);
      out += rest.replace(/([A-Za-z_:][\w:.-]*)(\s*=\s*)?("[^"]*"|'[^']*'|[^\s"'>]+)?|([^A-Za-z_:]+)/g, (all, name, eq, val, other) => {
        if (other !== undefined) return esc(other);
        return wrap('attr', name) + (eq ? esc(eq) : '') + (val ? wrap('string', val) : '');
      });
      out += wrap('punct', tag.endsWith('/>') ? '/>' : tag.endsWith('>') ? '>' : '');
      const tagName = (m && m[2] || '').toLowerCase();
      i = stop;
      // embedded <style>/<script>
      if ((tagName === 'style' || tagName === 'script') && !tag.startsWith('</')) {
        const close = code.toLowerCase().indexOf(`</${tagName}`, i);
        const inner = code.slice(i, close === -1 ? n : close);
        out += tokenize(inner, tagName === 'style' ? RULES.css : RULES.javascript);
        i = close === -1 ? n : close;
      }
      continue;
    }
    if (code[i] === '&') {
      const m = /^&[#\w]+;/.exec(code.slice(i, i + 12));
      if (m) { out += wrap('builtin', m[0]); i += m[0].length; continue; }
    }
    const next = code.slice(i).search(/[<&]/);
    const stop = next === -1 ? n : i + Math.max(next, 1);
    out += esc(code.slice(i, stop));
    i = stop;
  }
  return out;
}

/** Highlight `code` for `lang`. Always returns safe, escaped HTML. */
export function highlight(code, lang) {
  const src = String(code ?? '');
  const l = normalizeLang(lang);
  if (l === 'html') return highlightHTML(src);
  const rules = RULES[l];
  if (!rules) return esc(src);
  try {
    return tokenize(src, rules);
  } catch {
    return esc(src);
  }
}

export const SUPPORTED_LANGS = ['python', 'pyvn', 'javascript', 'typescript', 'c', 'cpp', 'java', 'html', 'css', 'sql', 'json', 'bash'];

export const LANG_LABELS = {
  python: 'Python', pyvn: 'Python Tiếng Việt', javascript: 'JavaScript', typescript: 'TypeScript', c: 'C', cpp: 'C++',
  java: 'Java', html: 'HTML', css: 'CSS', sql: 'SQL', json: 'JSON', bash: 'Terminal', plaintext: 'Văn bản',
};
