// V-Code Edu — "Python Tiếng Việt" translator.
// Converts Vietnamese keywords (data/pyvn-keywords.json) to Python, ONLY outside string literals and comments,
// preserving line numbers so error messages still point at the student's line.

let mappingPromise = null;

export function loadPyvnMapping() {
  if (!mappingPromise) {
    mappingPromise = fetch(new URL('../../data/pyvn-keywords.json', import.meta.url))
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .catch((err) => { mappingPromise = null; throw err; });
  }
  return mappingPromise;
}

/** Split Python source into segments: { code: true|false, text } (false = string/comment). */
function segments(src) {
  const out = [];
  let i = 0;
  let buf = '';
  const n = src.length;
  const push = (code, text) => { if (text) out.push({ code, text }); };
  while (i < n) {
    const ch = src[i];
    if (ch === '#') {
      push(true, buf); buf = '';
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? n : end;
      push(false, src.slice(i, stop));
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'") {
      // include string prefix letters (f, r, b, u) already in buf — fine, they stay in code segment
      const triple = src.slice(i, i + 3) === ch.repeat(3);
      const quote = triple ? ch.repeat(3) : ch;
      let j = i + quote.length;
      while (j < n) {
        if (src[j] === '\\') { j += 2; continue; }
        if (src.startsWith(quote, j)) { j += quote.length; break; }
        if (!triple && src[j] === '\n') break;
        j += 1;
      }
      push(true, buf); buf = '';
      push(false, src.slice(i, j));
      i = j;
      continue;
    }
    buf += ch;
    i += 1;
  }
  push(true, buf);
  return out;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Translate Vietnamese-keyword Python to standard Python using a mapping object. */
export function translatePyvnWith(mapping, src) {
  const phrases = (mapping.phrases || []).slice().sort((a, b) => b.vn.length - a.vn.length);
  const words = mapping.words || {};
  const wordRe = new RegExp(`(?<![\\w.])(${Object.keys(words).sort((a, b) => b.length - a.length).map(escapeRegex).join('|')})(?![\\w])`, 'g');
  return segments(String(src ?? '')).map((seg) => {
    if (!seg.code) return seg.text;
    let t = seg.text;
    for (const p of phrases) {
      const re = new RegExp(`(?<![\\w.])${escapeRegex(p.vn).replace(/\\\(\\\)$/, '\\s*\\(\\s*\\)')}${/\w$/.test(p.vn) ? '(?![\\w])' : ''}`, 'g');
      t = t.replace(re, p.py);
    }
    if (Object.keys(words).length) t = t.replace(wordRe, (m) => words[m]);
    return t;
  }).join('');
}

/** Async convenience: loads mapping then translates. */
export async function translatePyvn(src) {
  const mapping = await loadPyvnMapping();
  return translatePyvnWith(mapping, src);
}
