// V-Code Edu — minimal reactive store + event bus.

export function createStore(initial = {}) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get: () => state,
    set(patch) {
      const next = typeof patch === 'function' ? patch(state) : patch;
      const prev = state;
      state = { ...state, ...next };
      subs.forEach((fn) => {
        try { fn(state, prev); } catch (err) { console.error('[store] subscriber failed', err); }
      });
    },
    subscribe(fn, { signal, immediate = false } = {}) {
      subs.add(fn);
      if (immediate) fn(state, state);
      const off = () => subs.delete(fn);
      signal?.addEventListener('abort', off);
      return off;
    },
  };
}

/** Global application state. */
export const appState = createStore({
  user: null,          // { uid, email, key, displayName, photoURL, role, school_name, class_name, provider }
  authReady: false,    // true once Firebase reported the initial auth state
  online: navigator.onLine,
  backend: { reachable: false, checkedAt: 0, providers: [] },
  sync: { state: 'idle', pending: 0, lastSyncedAt: 0 }, // idle | syncing | error | offline
  theme: 'system',
});

const listeners = new Map();
export const bus = {
  on(event, fn, { signal } = {}) {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    const off = () => listeners.get(event)?.delete(fn);
    signal?.addEventListener('abort', off);
    return off;
  },
  emit(event, data) {
    listeners.get(event)?.forEach((fn) => {
      try { fn(data); } catch (err) { console.error(`[bus] ${event} handler failed`, err); }
    });
  },
};
