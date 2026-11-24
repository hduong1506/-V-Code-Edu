// V-Code Edu — online/offline detection + backend reachability.
import { appState, bus } from './store.js';
import { getApiBase } from '../config.js';

let probeTimer = null;

async function probeBackend() {
  if (!navigator.onLine && !/^(localhost|127\.|192\.168\.|10\.)/.test(new URL(getApiBase()).hostname)) {
    appState.set({ backend: { ...appState.get().backend, reachable: false, checkedAt: Date.now() } });
    return false;
  }
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3500);
    const res = await fetch(`${getApiBase()}/api/health`, { signal: ctrl.signal, cache: 'no-store' });
    clearTimeout(t);
    const ok = res.ok;
    const data = ok ? await res.json().catch(() => ({})) : {};
    appState.set({ backend: { reachable: ok, checkedAt: Date.now(), providers: data?.ai?.providers || [], version: data?.version } });
    return ok;
  } catch {
    appState.set({ backend: { reachable: false, checkedAt: Date.now(), providers: [] } });
    return false;
  }
}

export function refreshBackendStatus() {
  return probeBackend();
}

export function initNetwork() {
  const update = () => {
    const online = navigator.onLine;
    const was = appState.get().online;
    appState.set({ online });
    if (was !== online) bus.emit(online ? 'net:online' : 'net:offline');
    probeBackend();
  };
  window.addEventListener('online', update);
  window.addEventListener('offline', update);
  probeBackend();
  clearInterval(probeTimer);
  probeTimer = setInterval(() => { if (document.visibilityState === 'visible') probeBackend(); }, 60000);
}
