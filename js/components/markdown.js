// V-Code Edu — safe Markdown renderer (no raw HTML passthrough → XSS-safe).
// Supports: headings, paragraphs, bold/italic/strike, inline code, fenced code (highlighted + copy button),
// ordered/unordered/task lists, blockquotes, tables, horizontal rules, links (http/https/mailto/#/ only),
// and math ($…$, $$…$$) rendered with KaTeX (lazy-loaded; falls back to monospace when offline).
import { esc } from '../core/dom.js';
import { highlight, normalizeLang, LANG_LABELS } from './highlight.js';
import { iconHTML } from './icons.js';
import { KATEX_BASE } from '../config.js';

let katexPromise = null;
function loadKatex() {
  if (window.katex) return Promise.resolve(window.katex);
  if (!katexPromise) {
    katexPromise = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.crossOrigin = 'anonymous';
      css.href = `${KATEX_BASE}katex.min.css`;
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.crossOrigin = 'anonymous';
      s.src = `${KATEX_BASE}katex.min.js`;
      s.onload = () => resolve(window.katex);
      s.onerror = () => { katexPromise = null; reject(new Error('KaTeX unavailable')); };
      document.head.appendChild(s);
    });
  }
  return katexPromise;
}

function safeUrl(url) {
  const u = String(url || '').trim();
  if (/^(https?:|mailto:|#\/|#)/i.test(u)) return u;
  if (/^[\w./-]+$/.test(u) && !u.includes('..')) return u; // relative app links
  return null;
}

// Inline formatting on ALREADY-ESCAPED text segments (code spans and math are protected first).
function inline(text, store) {
  let s = esc(text);
  // links [text](url)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+&quot;[^&]*&quot;)?\)/g, (m, label, url) => {
    const decoded = url.replace(/&amp;/g, '&');
    const safe = safeUrl(decoded);
    if (!safe) return label;
    const external = /^https?:/i.test(safe);
    return `<a href="${esc(safe)}"${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${label}</a>`;
  });
  // autolinks
  s = s.replace(/(^|[\s(])(https?:\/\/[^\s<)]+[^\s<).,;:!?])/g, (m, pre, url) => `${pre}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
  s = s.replace(/\*\*\*([^*]+)\*\*\*/g, '<strong><em>$1</em></strong>');
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
  // restore protected tokens
  s = s.replace(/\u0000(\d+)\u0000/g, (m, i) => store[Number(i)]);
  return s;
}

function protect(text, store) {
  // inline code
  let t = text.replace(/`([^`\n]+)`/g, (m, c) => { store.push(`<code>${esc(c)}</code>`); return `\u0000${store.length - 1}\u0000`; });
  // inline math $...$ (not $$), avoid currency like "20.000$" by requiring non-space after opening
  t = t.replace(/(^|[^\\$\w])\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?!\w)/g, (m, pre, math) => {
    store.push(`<span class="math-inline" data-math="${esc(math)}"><span class="math-raw">${esc(math)}</span></span>`);
    return `${pre}\u0000${store.length - 1}\u0000`;
  });
  t = t.replace(/\\\(([\s\S]+?)\\\)/g, (m, math) => { store.push(`<span class="math-inline" data-math="${esc(math)}"><span class="math-raw">${esc(math)}</span></span>`); return `\u0000${store.length - 1}\u0000`; });
  return t;
}

function codeBlock(code, lang) {
  const l = normalizeLang(lang);
  const label = LANG_LABELS[l] || (lang ? lang : 'Mã');
  return `<div class="code-block" data-lang="${esc(l)}"><div class="code-block__head"><span>${esc(label)}</span>`
    + `<span class="cluster cluster--sm">`
    + `<button type="button" class="btn btn--ghost btn--sm" data-code-action="copy" aria-label="Sao chép mã">${iconHTML('copy', 14)}<span>Sao chép</span></button>`
    + (['python', 'pyvn', 'javascript', 'c', 'cpp', 'sql', 'html'].includes(l) ? `<button type="button" class="btn btn--ghost btn--sm" data-code-action="open" aria-label="Mở mã trong IDE">${iconHTML('terminal', 14)}<span>Mở trong IDE</span></button>` : '')
    + `</span></div><pre><code>${highlight(code.replace(/\n$/, ''), l)}</code></pre></div>`;
}

function renderTable(lines, store) {
  const split = (row) => row.trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'));
  const head = split(lines[0]);
  const aligns = split(lines[1]).map((c) => (/^:-+:$/.test(c) ? 'center' : /-+:$/.test(c) ? 'right' : 'left'));
  const body = lines.slice(2).map(split);
  return `<table><thead><tr>${head.map((c, i) => `<th style="text-align:${aligns[i] || 'left'}">${inline(protect(c, store), store)}</th>`).join('')}</tr></thead>`
    + `<tbody>${body.map((r) => `<tr>${head.map((_, i) => `<td style="text-align:${aligns[i] || 'left'}">${inline(protect(r[i] || '', store), store)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}

/** Render Markdown to safe HTML string. */
export function markdown(src) {
  const text = String(src ?? '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n');
  const out = [];
  const store = [];
  let i = 0;

  const isBlockStart = (l) => /^(#{1,6}\s|```|~~~|>\s?|\s*([-*+]|\d+[.)])\s|\$\$|\s*(\*\s*){3,}$|\s*(-\s*){3,}$|\|)/.test(l);

  while (i < lines.length) {
    const line = lines[i];

    // fenced code (also handles an unterminated fence while streaming)
    const fence = /^(\s*)(```|~~~)\s*([\w+#.-]*)/.exec(line);
    if (fence) {
      const marker = fence[2];
      const lang = fence[3];
      const buf = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith(marker)) { buf.push(lines[i]); i += 1; }
      i += 1;
      out.push(codeBlock(buf.join('\n'), lang));
      continue;
    }

    // display math
    if (line.trim().startsWith('$$') || line.trim().startsWith('\\[')) {
      const closer = line.trim().startsWith('$$') ? '$$' : '\\]';
      let body = line.trim().slice(2);
      if (body.endsWith(closer) && body.length >= 2) {
        body = body.slice(0, -2);
        i += 1;
      } else {
        const buf = [body];
        i += 1;
        while (i < lines.length && !lines[i].includes(closer)) { buf.push(lines[i]); i += 1; }
        if (i < lines.length) buf.push(lines[i].slice(0, lines[i].indexOf(closer)));
        i += 1;
        body = buf.join('\n');
      }
      out.push(`<div class="math-display" data-math="${esc(body.trim())}"><pre class="math-raw">${esc(body.trim())}</pre></div>`);
      continue;
    }

    // heading
    const hm = /^(#{1,6})\s+(.*)$/.exec(line);
    if (hm) {
      const level = Math.min(hm[1].length + 1, 6); // h1 in content renders as h2 (page owns h1)
      out.push(`<h${level}>${inline(protect(hm[2].replace(/\s+#+\s*$/, ''), store), store)}</h${level}>`);
      i += 1;
      continue;
    }

    // hr
    if (/^\s*((\*\s*){3,}|(-\s*){3,}|(_\s*){3,})$/.test(line)) { out.push('<hr>'); i += 1; continue; }

    // table
    if (line.includes('|') && i + 1 < lines.length && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1])) {
      const buf = [line, lines[i + 1]];
      i += 2;
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) { buf.push(lines[i]); i += 1; }
      out.push(renderTable(buf, store));
      continue;
    }

    // blockquote
    if (/^>\s?/.test(line)) {
      const buf = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i += 1; }
      out.push(`<blockquote>${markdown(buf.join('\n'))}</blockquote>`);
      continue;
    }

    // lists
    const lm = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (lm) {
      const ordered = /\d/.test(lm[2]);
      const baseIndent = lm[1].length;
      const items = [];
      while (i < lines.length) {
        const m = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/.exec(lines[i]);
        if (m && m[1].length === baseIndent && /\d/.test(m[2]) === ordered) {
          items.push([m[3]]);
          i += 1;
        } else if (lines[i].trim() && (/^\s+/.test(lines[i]) && (lines[i].match(/^\s*/)[0].length > baseIndent))) {
          items[items.length - 1].push(lines[i].slice(Math.min(lines[i].match(/^\s*/)[0].length, baseIndent + 2)));
          i += 1;
        } else if (!lines[i].trim() && i + 1 < lines.length && /^(\s*)([-*+]|\d+[.)])\s+/.test(lines[i + 1]) && lines[i + 1].match(/^\s*/)[0].length >= baseIndent) {
          i += 1;
        } else {
          break;
        }
      }
      const start = ordered ? Number(lm[2].replace(/\D/g, '')) : 1;
      const tag = ordered ? 'ol' : 'ul';
      out.push(`<${tag}${ordered && start !== 1 ? ` start="${start}"` : ''}>${items.map((parts) => {
        let first = parts[0];
        let task = '';
        const tm = /^\[( |x|X)\]\s+(.*)$/.exec(first);
        if (tm) { task = `<input type="checkbox" disabled${tm[1].trim() ? ' checked' : ''}> `; first = tm[2]; }
        const rest = parts.slice(1).join('\n');
        return `<li>${task}${inline(protect(first, store), store)}${rest ? markdown(rest) : ''}</li>`;
      }).join('')}</${tag}>`);
      continue;
    }

    // blank
    if (!line.trim()) { i += 1; continue; }

    // paragraph
    const buf = [line];
    i += 1;
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) { buf.push(lines[i]); i += 1; }
    out.push(`<p>${buf.map((l) => inline(protect(l, store), store)).join('<br>')}</p>`);
  }
  return out.join('\n');
}

/** After inserting markdown HTML into the DOM: render math and wire code-block buttons. */
export function enhanceMarkdown(root, { onOpenCode } = {}) {
  const mathEls = root.querySelectorAll('[data-math]:not([data-rendered])');
  if (mathEls.length) {
    loadKatex().then((katex) => {
      mathEls.forEach((el) => {
        try {
          katex.render(el.dataset.math, el, { displayMode: el.classList.contains('math-display'), throwOnError: false, output: 'html' });
          el.dataset.rendered = '1';
        } catch { /* keep raw */ }
      });
    }).catch(() => { /* offline: raw TeX stays visible */ });
  }
  root.querySelectorAll('.code-block:not([data-wired])').forEach((block) => {
    block.dataset.wired = '1';
    block.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-code-action]');
      if (!btn) return;
      const code = block.querySelector('pre code').textContent;
      if (btn.dataset.codeAction === 'copy') {
        const { copyText } = await import('../core/ui.js');
        const ok = await copyText(code);
        const label = btn.querySelector('span');
        if (label) { label.textContent = ok ? 'Đã chép' : 'Lỗi'; setTimeout(() => { label.textContent = 'Sao chép'; }, 1400); }
      } else if (btn.dataset.codeAction === 'open') {
        if (onOpenCode) onOpenCode(code, block.dataset.lang);
        else {
          const { kv } = await import('../core/idb.js');
          await kv.set('workspace:incoming', { code, lang: block.dataset.lang, at: Date.now() });
          location.hash = `#/workspace?lang=${encodeURIComponent(block.dataset.lang)}&from=snippet`;
        }
      }
    });
  });
}
