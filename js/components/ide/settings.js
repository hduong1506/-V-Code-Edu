// V-Code Edu — editor preferences shared by every editor on the site (localStorage['vc-editor-settings']).
const KEY = 'vc-editor-settings';
export const DEFAULT_SETTINGS = Object.freeze({
  fontSize: 14,        // px, 11–22
  tabSize: 'auto',     // 'auto' (2 for web languages, 4 otherwise) | 2 | 4
  wordWrap: false,
  autoClose: true,     // auto-close brackets & quotes
  autocomplete: true,  // suggestion popup while typing
  diagnostics: true,   // live static checks (gutter markers)
});

function sanitize(s) {
  const out = { ...DEFAULT_SETTINGS, ...(s && typeof s === 'object' ? s : {}) };
  out.fontSize = Math.min(22, Math.max(11, Math.round(Number(out.fontSize) || DEFAULT_SETTINGS.fontSize)));
  out.tabSize = out.tabSize === 2 || out.tabSize === '2' ? 2 : out.tabSize === 4 || out.tabSize === '4' ? 4 : 'auto';
  ['wordWrap', 'autoClose', 'autocomplete', 'diagnostics'].forEach((k) => { out[k] = Boolean(out[k]); });
  return out;
}

let cache = null;
export function getEditorSettings() {
  if (cache) return cache;
  try { cache = sanitize(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch { cache = sanitize(null); }
  return cache;
}

export function setEditorSettings(patch) {
  cache = sanitize({ ...getEditorSettings(), ...patch });
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent('vc:editor-settings', { detail: cache }));
  return cache;
}

export function onEditorSettings(fn, { signal } = {}) {
  const handler = (e) => fn(e.detail);
  window.addEventListener('vc:editor-settings', handler, signal ? { signal } : undefined);
  return () => window.removeEventListener('vc:editor-settings', handler);
}

window.addEventListener('storage', (e) => {
  if (e.key !== KEY) return;
  cache = null;
  window.dispatchEvent(new CustomEvent('vc:editor-settings', { detail: getEditorSettings() }));
});

/** Indent unit for a language given the settings. */
export function indentFor(lang, settings = getEditorSettings()) {
  if (settings.tabSize === 2 || settings.tabSize === 4) return ' '.repeat(settings.tabSize);
  return lang === 'html' || lang === 'css' || lang === 'javascript' ? '  ' : '    ';
}
