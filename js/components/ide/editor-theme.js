// V-Code Edu — editor colour theme, independent of the site theme.
// Values: 'dark' (Night) | 'light' (Paper) | 'auto' (follows html[data-theme]).
// Stored in localStorage['vc-editor-theme']. Every element carrying [data-editor-theme] (each .code-editor root,
// plus IDE panes that want to match) is updated on change, and a `vc:editor-theme` window event is dispatched.

const KEY = 'vc-editor-theme';
export const EDITOR_THEMES = [
  { id: 'auto', label: 'Theo giao diện', short: 'Tự động' },
  { id: 'light', label: 'Editor sáng (Paper)', short: 'Sáng' },
  { id: 'dark', label: 'Editor tối (Night)', short: 'Tối' },
];
const VALID = new Set(EDITOR_THEMES.map((t) => t.id));

export function getEditorTheme() {
  try {
    const v = localStorage.getItem(KEY);
    return VALID.has(v) ? v : 'auto';
  } catch { return 'auto'; }
}

/** The palette actually shown: 'dark' | 'light'. */
export function resolvedEditorTheme(pref = getEditorTheme()) {
  if (pref === 'auto') return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
  return pref;
}

function applyAll(pref) {
  document.querySelectorAll('[data-editor-theme]').forEach((el) => { el.dataset.editorTheme = pref; });
  window.dispatchEvent(new CustomEvent('vc:editor-theme', { detail: { pref, theme: resolvedEditorTheme(pref) } }));
}

export function setEditorTheme(pref) {
  const v = VALID.has(pref) ? pref : 'auto';
  try { localStorage.setItem(KEY, v); } catch { /* private mode: still applies for this page */ }
  current = v;
  applyAll(v);
  return v;
}

/** Cycle auto → light → dark → auto. Returns the new preference. */
export function cycleEditorTheme() {
  const order = ['auto', 'light', 'dark'];
  return setEditorTheme(order[(order.indexOf(getEditorTheme()) + 1) % order.length]);
}

/** Subscribe to changes: fn({pref, theme}). Returns unsubscribe. */
export function onEditorTheme(fn, { signal } = {}) {
  const handler = (e) => fn(e.detail);
  window.addEventListener('vc:editor-theme', handler, signal ? { signal } : undefined);
  return () => window.removeEventListener('vc:editor-theme', handler);
}

let current = getEditorTheme();
// Other tabs changed the preference.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) { current = getEditorTheme(); applyAll(current); }
});
// In "auto" mode the resolved palette changes with the site theme; tell listeners (status bars, labels).
new MutationObserver(() => {
  if (getEditorTheme() === 'auto') window.dispatchEvent(new CustomEvent('vc:editor-theme', { detail: { pref: 'auto', theme: resolvedEditorTheme('auto') } }));
}).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
