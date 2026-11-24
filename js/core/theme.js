// V-Code Edu — global Light/Dark theme. Preference: 'light' | 'dark' | 'system' in localStorage['vc-theme'].
import { appState, bus } from './store.js';

const KEY = 'vc-theme';
const media = window.matchMedia('(prefers-color-scheme: dark)');

export function getThemePreference() {
  try { return localStorage.getItem(KEY) || 'system'; } catch { return 'system'; }
}

export function resolvedTheme(pref = getThemePreference()) {
  return pref === 'system' ? (media.matches ? 'dark' : 'light') : pref;
}

function apply(pref) {
  const theme = resolvedTheme(pref);
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0a0f1f' : '#f6f5f1');
  appState.set({ theme: pref });
  bus.emit('theme:change', { pref, theme });
}

export function setTheme(pref) {
  try { localStorage.setItem(KEY, pref); } catch { /* ignore */ }
  apply(pref);
}

/** Cycle light → dark → system. */
export function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const next = order[(order.indexOf(getThemePreference()) + 1) % order.length];
  setTheme(next);
  return next;
}

export function initTheme() {
  apply(getThemePreference());
  media.addEventListener('change', () => { if (getThemePreference() === 'system') apply('system'); });
  window.addEventListener('storage', (e) => { if (e.key === KEY) apply(getThemePreference()); });
}
