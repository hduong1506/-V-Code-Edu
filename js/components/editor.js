// V-Code Edu — lightweight code editor (textarea + highlighted overlay, no dependencies).
// Keyboard: Tab/Shift+Tab indent, Enter auto-indent, Ctrl/⌘+Enter run, Ctrl/⌘+/ toggle comment, Ctrl/⌘+S save,
// Ctrl+F / Ctrl+H find & replace, Ctrl+D duplicate line, Alt+↑/↓ move line, Shift+Alt+F format, Ctrl+Space suggestions,
// Ctrl+G go to line, Ctrl+Shift+K delete line, F1 shortcut help. Esc then Tab leaves the editor (keyboard accessibility).
//
// Backward-compatible API: createEditor({ value, lang, onChange, onRun, onSave, readOnly, minLines, ariaLabel })
//   → { el, textarea, getValue, setValue, setLang, getLang, focus, markLine, clearMarks, insertAtCursor, destroy, ... }
import { h } from '../core/dom.js';
import { highlight, normalizeLang } from './highlight.js';
import { getEditorTheme } from './ide/editor-theme.js';
import { getEditorSettings, indentFor } from './ide/settings.js';
import { createAutocomplete } from './ide/autocomplete.js';
import { createFindBar } from './ide/find.js';
import { formatCode, FORMATTABLE } from './ide/formatter.js';
import { documentIdentifiers } from './ide/diagnostics.js';

const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'", '`': '`' };
const BRACKETS = { '(': ')', '[': ']', '{': '}' };
const CLOSERS = { ')': '(', ']': '[', '}': '{' };
const COMMENT = { python: '# ', pyvn: '# ', javascript: '// ', c: '// ', cpp: '// ', java: '// ', sql: '-- ', css: '/* ', html: '<!-- ' };

// Make sure editor styles exist on pages whose route does not load ide.css (e.g. the home page demo).
function ensureIdeCss() {
  if (document.querySelector('link[href$="css/pages/ide.css"]')) return;
  document.head.appendChild(h('link', { rel: 'stylesheet', href: 'css/pages/ide.css', 'data-editor-css': '' }));
}

/** Split highlighted HTML (flat <span class="tok-*"> runs) into per-line HTML strings. */
function splitLines(html) {
  const lines = [];
  let cur = '';
  let open = '';
  for (let i = 0; i < html.length; i++) {
    const ch = html[i];
    if (ch === '<') {
      const j = html.indexOf('>', i);
      const tag = html.slice(i, j + 1);
      if (tag.startsWith('</')) open = ''; else open = tag;
      cur += tag;
      i = j;
    } else if (ch === '\n') {
      lines.push(open ? `${cur}</span>` : cur);
      cur = open;
    } else cur += ch;
  }
  lines.push(cur);
  return lines;
}

/** Wrap character ranges [{s, e, cls}] (columns in raw text) of one highlighted line. */
function decorate(html, ranges) {
  if (!ranges || !ranges.length) return html;
  let out = '';
  let idx = 0;
  let cur = '';
  const open = (c) => (c ? `<span class="${c}">` : '');
  const close = (c) => (c ? '</span>' : '');
  for (let i = 0; i < html.length;) {
    const ch = html[i];
    if (ch === '<') {
      const j = html.indexOf('>', i);
      out += close(cur) + html.slice(i, j + 1) + open(cur);
      i = j + 1;
      continue;
    }
    let len = 1;
    if (ch === '&') { const j = html.indexOf(';', i); if (j > i && j - i < 10) len = j - i + 1; }
    let c = '';
    for (const r of ranges) if (idx >= r.s && idx < r.e) c = c ? `${c} ${r.cls}` : r.cls;
    if (c !== cur) { out += close(cur) + open(c); cur = c; }
    out += html.substr(i, len);
    i += len;
    idx += 1;
  }
  return out + close(cur);
}

export function createEditor({
  value = '', lang = 'python', onChange, onRun, onSave, onCursor, onFormat, readOnly = false, minLines = 12,
  ariaLabel = 'Trình soạn thảo mã nguồn', autocomplete = true, gutterClick = true,
} = {}) {
  ensureIdeCss();
  let currentLang = normalizeLang(lang);
  let escPressed = false;
  let settings = getEditorSettings();
  const marks = new Map(); // line → 'error' | 'warning' | 'active' (explicit marks from hosts)
  let diags = []; // [{ line, col, endCol, severity, title }]
  let findRanges = [];
  let findCurrent = -1;
  let bracketPos = []; // [{ pos, bad }]
  let lineHtml = [];
  let lineStarts = [0];
  let activeLine = 0;
  let destroyed = false;
  let internalInsert = false;

  const gutterInner = h('div', { class: 'code-editor__gutter-inner' });
  const gutter = h('div', { class: 'code-editor__gutter', 'aria-hidden': 'true' }, gutterInner);
  const code = h('code');
  const pre = h('pre', { class: 'code-editor__highlight', 'aria-hidden': 'true' }, code);
  const ta = h('textarea', {
    class: 'code-editor__input',
    spellcheck: 'false',
    autocapitalize: 'off',
    autocomplete: 'off',
    autocorrect: 'off',
    wrap: 'off',
    'aria-label': ariaLabel,
    'aria-multiline': 'true',
    readonly: readOnly || undefined,
  });
  ta.value = value;
  const scroller = h('div', { class: 'code-editor__scroller' }, pre, ta);
  const el = h('div', { class: 'code-editor', style: { '--min-lines': String(minLines) }, dataset: { editorTheme: getEditorTheme(), lang: currentLang } }, gutter, scroller);

  // ---------------------------------------------------------------- rendering
  let raf = 0;
  function computeLineStarts(text) {
    lineStarts = [0];
    for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) lineStarts.push(i + 1);
  }
  function lineOf(pos) {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (lineStarts[mid] <= pos) lo = mid; else hi = mid - 1; }
    return lo; // 0-based
  }
  function lineRanges(i) {
    const ranges = [];
    const ls = lineStarts[i];
    const le = i + 1 < lineStarts.length ? lineStarts[i + 1] - 1 : ta.value.length;
    const len = le - ls;
    for (const d of diags) {
      if (d.line - 1 !== i || !d.col) continue;
      let s = Math.max(0, d.col - 1);
      let e = d.endCol ? d.endCol - 1 : s + 1;
      if (s >= len) { s = Math.max(0, len - 1); e = len; }
      if (e <= s) e = s + 1;
      ranges.push({ s, e: Math.min(e, len), cls: d.severity === 'error' ? 'dg-err' : d.severity === 'warning' ? 'dg-warn' : 'dg-info' });
    }
    findRanges.forEach(([fs, fe], k) => {
      if (fe <= ls || fs > le) return;
      ranges.push({ s: Math.max(0, fs - ls), e: Math.min(len, fe - ls), cls: k === findCurrent ? 'fm fm--cur' : 'fm' });
    });
    for (const b of bracketPos) if (b.pos >= ls && b.pos < le) ranges.push({ s: b.pos - ls, e: b.pos - ls + 1, cls: b.bad ? 'bm bm--bad' : 'bm' });
    return ranges;
  }
  function lineClass(i) {
    const n = i + 1;
    let c = 'cl';
    if (i === activeLine) c += ' is-active';
    const m = marks.get(n);
    if (m === 'error') c += ' is-error';
    else if (m === 'warning') c += ' is-warning';
    return c;
  }
  function gutterClass(i) {
    const n = i + 1;
    const m = marks.get(n);
    const d = diags.find((x) => x.line === n && x.severity === 'error') || diags.find((x) => x.line === n && x.severity === 'warning') || diags.find((x) => x.line === n);
    let c = i === activeLine ? 'is-current' : '';
    if (m) c += ` is-${m}`;
    else if (d) c += d.severity === 'error' ? ' has-error' : d.severity === 'warning' ? ' has-warning' : ' has-info';
    return c.trim();
  }
  function gutterTitle(i) {
    const list = diags.filter((x) => x.line === i + 1);
    return list.length ? list.map((x) => x.title).join('\n') : '';
  }
  function render() {
    raf = 0;
    if (destroyed) return;
    const text = ta.value;
    computeLineStarts(text);
    lineHtml = splitLines(highlight(text, currentLang));
    activeLine = Math.min(lineOf(ta.selectionStart), lineHtml.length - 1);
    computeBrackets();
    let html = '';
    for (let i = 0; i < lineHtml.length; i++) html += `<div class="${lineClass(i)}">${decorate(lineHtml[i], lineRanges(i))}</div>`;
    code.innerHTML = html;
    let g = '';
    for (let i = 0; i < lineHtml.length; i++) {
      const t = gutterTitle(i);
      g += `<span class="${gutterClass(i)}"${t ? ` title="${t.replace(/"/g, '&quot;').replace(/</g, '&lt;')}"` : ''}>${i + 1}</span>`;
    }
    gutterInner.innerHTML = g;
    el.style.setProperty('--gutter-digits', String(Math.max(2, String(lineHtml.length).length)));
    syncWrap();
    syncScroll();
  }
  function schedule() { if (!raf) raf = requestAnimationFrame(render); }
  function refreshLine(i) {
    if (i < 0 || i >= lineHtml.length) return;
    const node = code.children[i];
    if (node) { node.className = lineClass(i); node.innerHTML = decorate(lineHtml[i], lineRanges(i)); }
    const gn = gutterInner.children[i];
    if (gn) gn.className = gutterClass(i);
  }
  function syncWrap() {
    if (!settings.wordWrap) {
      pre.style.width = '';
      for (const s of gutterInner.children) s.style.height = '';
      return;
    }
    pre.style.width = `${ta.clientWidth}px`;
    const lines = code.children;
    const gs = gutterInner.children;
    for (let i = 0; i < lines.length; i++) if (gs[i]) gs[i].style.height = `${lines[i].offsetHeight}px`;
  }
  function syncScroll() {
    pre.style.transform = `translate(${-ta.scrollLeft}px, ${-ta.scrollTop}px)`;
    gutterInner.style.transform = `translateY(${-ta.scrollTop}px)`;
  }

  // ---------------------------------------------------------------- bracket matching & cursor
  function findMatch(pos) {
    const v = ta.value;
    const ch = v[pos];
    if (BRACKETS[ch]) {
      let d = 0;
      for (let i = pos; i < v.length && i < pos + 20000; i++) {
        if (v[i] === ch) d += 1; else if (v[i] === BRACKETS[ch]) { d -= 1; if (d === 0) return i; }
      }
      return -1;
    }
    if (CLOSERS[ch]) {
      let d = 0;
      for (let i = pos; i >= 0 && i > pos - 20000; i--) {
        if (v[i] === ch) d += 1; else if (v[i] === CLOSERS[ch]) { d -= 1; if (d === 0) return i; }
      }
      return -1;
    }
    return null;
  }
  function computeBrackets() {
    bracketPos = [];
    if (ta.selectionStart !== ta.selectionEnd || document.activeElement !== ta) return;
    const p = ta.selectionStart;
    const v = ta.value;
    let at = null;
    if (BRACKETS[v[p - 1]] || CLOSERS[v[p - 1]]) at = p - 1;
    else if (BRACKETS[v[p]] || CLOSERS[v[p]]) at = p;
    if (at === null) return;
    const m = findMatch(at);
    if (m === null) return;
    bracketPos = m < 0 ? [{ pos: at, bad: true }] : [{ pos: at }, { pos: m }];
  }
  let lastCursorKey = '';
  function onSelection() {
    if (destroyed || document.activeElement !== ta && !el.contains(document.activeElement)) return;
    if (!lineHtml.length) return;
    const prevActive = activeLine;
    const prevBrackets = bracketPos.map((b) => lineOf(b.pos));
    activeLine = Math.min(lineOf(ta.selectionStart), lineHtml.length - 1);
    computeBrackets();
    const touched = new Set([prevActive, activeLine, ...prevBrackets, ...bracketPos.map((b) => lineOf(b.pos))]);
    touched.forEach(refreshLine);
    emitCursor();
  }
  function emitCursor() {
    if (!onCursor) return;
    const pos = ta.selectionStart;
    const ln = lineOf(pos);
    const info = { line: ln + 1, col: pos - lineStarts[ln] + 1, selected: Math.abs(ta.selectionEnd - ta.selectionStart) };
    const key = `${info.line}:${info.col}:${info.selected}`;
    if (key !== lastCursorKey) { lastCursorKey = key; onCursor(info); }
  }

  // ---------------------------------------------------------------- editing helpers
  function emit() {
    schedule();
    onChange?.(ta.value);
  }

  // Replace selection with text (keeps undo history via execCommand when possible).
  function insert(text, selectStartOffset = null, selectEndOffset = null) {
    const start = ta.selectionStart;
    if (document.activeElement !== ta) ta.focus({ preventScroll: true });
    internalInsert = true;
    try {
      const ok = document.execCommand && document.execCommand('insertText', false, text);
      if (!ok) {
        ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
        ta.dispatchEvent(new Event('input', { bubbles: true }));
      }
    } finally { internalInsert = false; }
    if (selectStartOffset !== null) {
      ta.selectionStart = start + selectStartOffset;
      ta.selectionEnd = start + (selectEndOffset ?? selectStartOffset);
    }
    schedule();
  }
  function replaceRange(s, e, text, selS = null, selE = null) {
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(s, e);
    insert(text, selS, selE);
  }
  /** Replace the whole document as one undoable step, keeping the caret on the same line. */
  function replaceAll(text) {
    const ln = lineOf(ta.selectionStart);
    const top = ta.scrollTop;
    ta.focus({ preventScroll: true });
    ta.setSelectionRange(0, ta.value.length);
    insert(text);
    computeLineStarts(ta.value);
    const p = lineStarts[Math.min(ln, lineStarts.length - 1)] || 0;
    const le = ta.value.indexOf('\n', p);
    const firstNonWs = ta.value.slice(p, le < 0 ? undefined : le).search(/\S|$/);
    ta.setSelectionRange(p + firstNonWs, p + firstNonWs);
    ta.scrollTop = top;
    schedule();
  }

  function indentUnit() { return indentFor(currentLang, settings); }

  function lineRange() {
    const v = ta.value;
    const s = v.lastIndexOf('\n', ta.selectionStart - 1) + 1;
    let e = v.indexOf('\n', ta.selectionEnd - (ta.selectionEnd > ta.selectionStart && v[ta.selectionEnd - 1] === '\n' ? 1 : 0));
    if (e === -1) e = v.length;
    return [s, e];
  }

  function transformLines(fn) {
    const [s, e] = lineRange();
    const block = ta.value.slice(s, e);
    const out = block.split('\n').map(fn).join('\n');
    ta.selectionStart = s;
    ta.selectionEnd = e;
    insert(out);
    ta.selectionStart = s;
    ta.selectionEnd = s + out.length;
  }

  function duplicateLines() {
    if (ta.selectionStart !== ta.selectionEnd && !ta.value.slice(ta.selectionStart, ta.selectionEnd).includes('\n')) {
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      const end = ta.selectionEnd;
      ta.setSelectionRange(end, end);
      insert(sel, 0, sel.length);
      return;
    }
    const [s, e] = lineRange();
    const block = ta.value.slice(s, e);
    const offS = ta.selectionStart - s;
    const offE = ta.selectionEnd - s;
    ta.setSelectionRange(e, e);
    insert(`\n${block}`);
    ta.setSelectionRange(e + 1 + offS, e + 1 + offE);
    schedule();
  }

  function moveLines(dir) {
    const v = ta.value;
    const [s, e] = lineRange();
    const offS = ta.selectionStart - s;
    const offE = ta.selectionEnd - s;
    const block = v.slice(s, e);
    if (dir < 0) {
      if (s === 0) return;
      const ps = v.lastIndexOf('\n', s - 2) + 1;
      const prev = v.slice(ps, s - 1);
      ta.setSelectionRange(ps, e);
      insert(`${block}\n${prev}`);
      ta.setSelectionRange(ps + offS, ps + offE);
    } else {
      if (e >= v.length) return;
      let ne = v.indexOf('\n', e + 1);
      if (ne === -1) ne = v.length;
      const next = v.slice(e + 1, ne);
      ta.setSelectionRange(s, ne);
      insert(`${next}\n${block}`);
      const ns = s + next.length + 1;
      ta.setSelectionRange(ns + offS, ns + offE);
    }
    schedule();
  }

  function deleteLines() {
    const v = ta.value;
    const [s, e] = lineRange();
    const from = s > 0 && e >= v.length ? s - 1 : s;
    const to = e < v.length ? e + 1 : e;
    ta.setSelectionRange(from, to);
    insert('');
  }

  function toggleComment() {
    const c = COMMENT[currentLang] || '// ';
    const [s, en] = lineRange();
    const lines = ta.value.slice(s, en).split('\n');
    const all = lines.every((l) => !l.trim() || l.trimStart().startsWith(c.trim()));
    const closeTok = currentLang === 'css' ? ' */' : currentLang === 'html' ? ' -->' : '';
    transformLines((l) => {
      if (!l.trim()) return l;
      if (all) {
        let r = l.replace(new RegExp(`^(\\s*)${c.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} ?`), '$1');
        if (closeTok) r = r.replace(new RegExp(`\\s?${closeTok.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '');
        return r;
      }
      const ind = l.match(/^\s*/)[0];
      return `${ind}${c}${l.slice(ind.length)}${closeTok}`;
    });
  }

  function format() {
    if (readOnly) return false;
    if (!FORMATTABLE.has(currentLang)) return false;
    const before = ta.value;
    const after = formatCode(before, currentLang, { unit: settings.tabSize === 'auto' ? undefined : indentUnit() });
    if (after !== before) replaceAll(after);
    onFormat?.(after !== before);
    return after !== before;
  }

  function jumpToLine(line, { select = true } = {}) {
    computeLineStarts(ta.value);
    const n = Math.max(1, Math.min(line, lineStarts.length));
    const s = lineStarts[n - 1];
    let e = ta.value.indexOf('\n', s);
    if (e === -1) e = ta.value.length;
    ta.focus({ preventScroll: true });
    if (select) ta.setSelectionRange(s, e); else ta.setSelectionRange(s, s);
    revealPos(s);
    onSelection();
  }

  function revealPos(pos) {
    const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
    const ln = lineOf(pos);
    let top = ln * lh;
    if (settings.wordWrap && code.children[ln]) top = code.children[ln].offsetTop;
    const pad = 12;
    if (top < ta.scrollTop + pad || top + lh > ta.scrollTop + ta.clientHeight - pad) ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
    if (!settings.wordWrap) {
      const col = pos - lineStarts[ln];
      const cw = (parseFloat(getComputedStyle(ta).fontSize) || 14) * 0.6;
      const x = col * cw;
      if (x < ta.scrollLeft || x > ta.scrollLeft + ta.clientWidth - 60) ta.scrollLeft = Math.max(0, x - ta.clientWidth / 2);
    }
    syncScroll();
  }

  async function gotoLinePrompt() {
    const { promptDialog } = await import('../core/ui.js');
    const v = await promptDialog({ title: 'Đi tới dòng', label: `Số dòng (1–${lineStarts.length})`, value: String(activeLine + 1), confirmLabel: 'Đi tới' });
    const n = parseInt(v, 10);
    if (n > 0) jumpToLine(n, { select: false });
  }

  // ---------------------------------------------------------------- autocomplete & find
  let wordsCache = null;
  const ac = autocomplete && !readOnly ? createAutocomplete({
    textarea: ta,
    root: el,
    getLang: () => currentLang,
    getUnit: () => indentUnit(),
    replaceRange: (s, e, text, selS, selE) => replaceRange(s, e, text, selS, selE),
    getWords: () => { if (!wordsCache) wordsCache = documentIdentifiers(ta.value); return wordsCache; },
  }) : null;
  let find = null;
  function ensureFind() {
    if (!find) {
      find = createFindBar({
        root: el,
        textarea: ta,
        getValue: () => ta.value,
        setMatches: (ranges, cur) => {
          const old = new Set(findRanges.map(([s]) => lineOf(s)));
          findRanges = ranges;
          findCurrent = cur;
          if (ranges.length > 400 || old.size > 400) { schedule(); return; }
          ranges.forEach(([s]) => old.add(lineOf(s)));
          old.forEach(refreshLine);
        },
        reveal: (s, e) => { revealPos(s); ta.setSelectionRange(s, e); },
        replaceRange: (s, e, text) => { if (!readOnly) replaceRange(s, e, text); },
        replaceAll: (text) => { if (!readOnly) replaceAll(text); },
        focusEditor: () => ta.focus(),
      });
    }
    return find;
  }

  // ---------------------------------------------------------------- events
  ta.addEventListener('input', (e) => {
    wordsCache = null;
    if (settings.autocomplete && !internalInsert) ac?.onInput(e); else ac?.close();
    emit();
    find?.refresh();
  });
  ta.addEventListener('scroll', () => { syncScroll(); ac?.reposition(); }, { passive: true });
  ta.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== ta) ac?.close(); }, 120));
  ta.addEventListener('click', () => ac?.close());
  const selHandler = () => { if (document.activeElement === ta) onSelection(); };
  document.addEventListener('selectionchange', selHandler);
  ta.addEventListener('focus', () => { el.classList.add('is-focused'); onSelection(); });
  ta.addEventListener('blur', () => {
    el.classList.remove('is-focused');
    if (bracketPos.length) { const lines = bracketPos.map((b) => lineOf(b.pos)); bracketPos = []; lines.forEach(refreshLine); }
  });
  if (gutterClick) {
    gutter.addEventListener('mousedown', (e) => {
      const span = e.target.closest('span');
      if (!span || !gutterInner.contains(span)) return;
      e.preventDefault();
      jumpToLine(Number(span.textContent));
    });
  }

  ta.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (ac && settings.autocomplete && ac.handleKey(e)) return;
    if (e.key === 'Escape') {
      if (find?.isOpen()) { find.close(); e.preventDefault(); return; }
      escPressed = true;
      return;
    }
    if (e.key === 'F1') { e.preventDefault(); import('./ide/controls.js').then((m) => m.openShortcutsModal()); return; }
    if (mod && e.key === 'Enter') { e.preventDefault(); onRun?.(); return; }
    if (mod && (e.key === 's' || e.key === 'S')) { e.preventDefault(); onSave?.(ta.value); return; }
    if (mod && !e.shiftKey && (e.key === 'f' || e.key === 'F')) { e.preventDefault(); ensureFind().open(); return; }
    if (mod && (e.key === 'h' || e.key === 'H')) { e.preventDefault(); ensureFind().open({ replace: !readOnly }); return; }
    if (mod && (e.key === 'g' || e.key === 'G')) { e.preventDefault(); gotoLinePrompt(); return; }
    if (readOnly) return;
    if (e.shiftKey && e.altKey && (e.key === 'F' || e.key === 'f' || e.code === 'KeyF')) { e.preventDefault(); format(); return; }
    if (mod && !e.shiftKey && (e.key === 'd' || e.key === 'D')) { e.preventDefault(); duplicateLines(); return; }
    if (mod && e.shiftKey && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); deleteLines(); return; }
    if (e.altKey && !mod && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) { e.preventDefault(); moveLines(e.key === 'ArrowUp' ? -1 : 1); return; }
    if (mod && e.key === '/') { e.preventDefault(); toggleComment(); return; }
    if (e.key === 'Tab') {
      if (escPressed) { escPressed = false; return; } // let focus move on
      e.preventDefault();
      const unit = indentUnit();
      if ((ta.selectionStart !== ta.selectionEnd && ta.value.slice(ta.selectionStart, ta.selectionEnd).includes('\n')) || e.shiftKey) {
        transformLines((l) => (e.shiftKey ? l.replace(new RegExp(`^( {1,${unit.length}}|\\t)`), '') : unit + l));
      } else {
        insert(unit);
      }
      return;
    }
    escPressed = false;
    if (e.key === 'Enter' && !e.shiftKey && !mod) {
      e.preventDefault();
      const v = ta.value;
      const pos = ta.selectionStart;
      const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
      const line = v.slice(lineStart, pos);
      let indent = line.match(/^[ \t]*/)[0];
      const trimmed = line.replace(/\s+(#|\/\/).*$/, '').trimEnd();
      const unit = indentUnit();
      const before = v[pos - 1];
      const after = v[pos];
      if (/[:]$/.test(trimmed) && (currentLang === 'python' || currentLang === 'pyvn')) indent += unit;
      if ((before === '{' && after === '}') || (before === '[' && after === ']') || (before === '(' && after === ')')) { insert(`\n${indent}${unit}\n${indent}`, indent.length + unit.length + 1); return; }
      if (currentLang === 'html' && /<([a-zA-Z][\w-]*)[^>]*>$/.test(v.slice(lineStart, pos)) && v.slice(pos).startsWith('</')) { insert(`\n${indent}${unit}\n${indent}`, indent.length + unit.length + 1); return; }
      if (/[{[(]$/.test(trimmed)) indent += unit;
      if ((currentLang === 'python' || currentLang === 'pyvn') && /^\s*(return|break|continue|pass|raise)\b/.test(line) && indent.length >= unit.length) indent = indent.slice(0, -unit.length);
      insert(`\n${indent}`);
      return;
    }
    if (e.key === 'Backspace' && ta.selectionStart === ta.selectionEnd) {
      const pos = ta.selectionStart;
      const v = ta.value;
      const unit = indentUnit();
      const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
      const before = v.slice(lineStart, pos);
      if (before.length && /^ +$/.test(before) && before.length % unit.length === 0) {
        e.preventDefault();
        ta.selectionStart = pos - unit.length;
        insert('');
        return;
      }
      if (settings.autoClose && PAIRS[v[pos - 1]] && PAIRS[v[pos - 1]] === v[pos]) {
        e.preventDefault();
        ta.selectionStart = pos - 1;
        ta.selectionEnd = pos + 1;
        insert('');
        return;
      }
    }
    // closing brace: dedent a whitespace-only line
    if (e.key === '}' && ta.selectionStart === ta.selectionEnd && ta.value[ta.selectionStart] !== '}') {
      const pos = ta.selectionStart;
      const v = ta.value;
      const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
      const before = v.slice(lineStart, pos);
      const unit = indentUnit();
      if (before.length >= unit.length && /^\s+$/.test(before)) {
        e.preventDefault();
        ta.setSelectionRange(lineStart, pos);
        insert(`${before.slice(0, before.length - unit.length)}}`);
        return;
      }
    }
    if (settings.autoClose && PAIRS[e.key] && !mod && !e.altKey) {
      const sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
      const nextCh = ta.value[ta.selectionEnd];
      const isQuote = e.key === '"' || e.key === "'" || e.key === '`';
      if (isQuote && nextCh === e.key && !sel) { e.preventDefault(); ta.selectionStart = ta.selectionEnd = ta.selectionEnd + 1; onSelection(); return; }
      const prevCh = ta.value[ta.selectionStart - 1] || '';
      if (isQuote && /\w/.test(prevCh) && !sel) return; // apostrophes inside words
      if (e.key === '`' && currentLang !== 'javascript' && !sel) return;
      if (sel || !nextCh || /[\s)\]};,]/.test(nextCh)) {
        e.preventDefault();
        insert(`${e.key}${sel}${PAIRS[e.key]}`, 1, 1 + sel.length);
        return;
      }
    }
    if (settings.autoClose && (e.key === ')' || e.key === ']' || e.key === '}') && ta.value[ta.selectionStart] === e.key && ta.selectionStart === ta.selectionEnd) {
      e.preventDefault();
      ta.selectionStart = ta.selectionEnd = ta.selectionStart + 1;
      onSelection();
    }
  });

  // ---------------------------------------------------------------- settings (shared, live)
  function applySettings() {
    settings = getEditorSettings();
    el.style.setProperty('--ed-font', `${settings.fontSize}px`);
    el.classList.toggle('is-wrap', settings.wordWrap);
    ta.setAttribute('wrap', settings.wordWrap ? 'soft' : 'off');
    el.style.setProperty('--ed-tab', String(indentUnit().length));
    if (!settings.autocomplete) ac?.close();
    schedule();
  }
  el.__vcApplySettings = applySettings;
  applySettings();
  let ro = null;
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(() => { if (settings.wordWrap) syncWrap(); ac?.reposition(); });
    ro.observe(scroller);
  }

  render();

  return {
    el,
    textarea: ta,
    getValue: () => ta.value,
    setValue(v) { ta.value = String(v ?? ''); marks.clear(); wordsCache = null; ac?.close(); render(); find?.refresh(); },
    /** Replace the document but keep undo history (Ctrl+Z restores the previous text). */
    replaceValue(v) { if (readOnly) { this.setValue(v); return; } marks.clear(); replaceAll(String(v ?? '')); },
    setLang(l) { currentLang = normalizeLang(l); el.dataset.lang = currentLang; applySettings(); render(); },
    getLang: () => currentLang,
    focus() { ta.focus(); },
    /** Mark a 1-based line (type: 'error' | 'warning' | 'active'). */
    markLine(line, type = 'error') { if (line > 0) { marks.set(line, type); render(); } },
    clearMarks() { if (marks.size) { marks.clear(); render(); } },
    /** Static diagnostics → gutter markers + wavy underlines. */
    setDiagnostics(list) { diags = Array.isArray(list) ? list.filter((d) => d.line > 0) : []; schedule(); },
    insertAtCursor(text) { ta.focus(); insert(text); },
    format,
    canFormat: () => FORMATTABLE.has(currentLang) && !readOnly,
    openFind: (replace = false) => ensureFind().open({ replace: replace && !readOnly }),
    jumpToLine,
    gotoLine: gotoLinePrompt,
    duplicateLines,
    moveLines,
    toggleComment,
    getCursor() { const p = ta.selectionStart; const ln = lineOf(p); return { line: ln + 1, col: p - lineStarts[ln] + 1 }; },
    getLineCount: () => lineStarts.length,
    refresh: () => render(),
    destroy() { destroyed = true; cancelAnimationFrame(raf); document.removeEventListener('selectionchange', selHandler); ro?.disconnect(); find?.close(); ac?.close(); },
  };
}

// Shared settings changed (any editor's popover or another tab): update every editor on the page.
window.addEventListener('vc:editor-settings', () => {
  document.querySelectorAll('.code-editor').forEach((node) => node.__vcApplySettings?.());
});

/** Extract a 1-based error line number from Python / JS / C (JSCPP) / SQL error text. */
export function errorLine(message) {
  const msg = String(message || '');
  const py = [...msg.matchAll(/File "([^"]+)", line (\d+)(?:, in (\S+))?/g)].filter((m) => m[3] !== '__vc_input');
  if (py.length) return Number(py[py.length - 1][2]);
  const m = /line (\d+)/i.exec(msg) || /dòng (\d+)/i.exec(msg) || /^(\d+):\d+\s/.exec(msg.trim()) || /:(\d+):\d+/.exec(msg);
  return m ? Number(m[1]) : 0;
}
