// V-Code Edu — IndexedDB wrapper (promise-based). Local-first storage that works offline.
// Stores:
//   kv            key → value (settings, progress cache, drafts index)
//   conversations id → { id, title, mode, messages[], createdAt, updatedAt, owner, deleted, syncedAt }
//   drafts        key → { key, code, lang, updatedAt }   (editor autosave per lesson/workspace)
//   outbox        auto-increment → { type, payload, createdAt, attempts }  (actions awaiting sync)

const DB_NAME = 'vcode-edu';
const DB_VERSION = 1;
let dbPromise = null;
let memoryFallback = null; // used when IndexedDB is unavailable (private mode in some browsers)

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) { reject(new Error('IndexedDB unavailable')); return; }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('conversations')) {
        const s = db.createObjectStore('conversations', { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
      }
      if (!db.objectStoreNames.contains('drafts')) db.createObjectStore('drafts', { keyPath: 'key' });
      if (!db.objectStoreNames.contains('outbox')) db.createObjectStore('outbox', { keyPath: 'seq', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocked'));
  }).catch((err) => {
    console.warn('[idb] falling back to memory store:', err?.message);
    memoryFallback = memoryFallback || { kv: new Map(), conversations: new Map(), drafts: new Map(), outbox: new Map(), seq: 0 };
    return null;
  });
  return dbPromise;
}

function reqToPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore(store, mode, fn) {
  const db = await open();
  if (!db) return fn(null);
  const tx = db.transaction(store, mode);
  const result = await fn(tx.objectStore(store));
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  return result;
}

export const idb = {
  async get(store, key) {
    return withStore(store, 'readonly', (s) => (s ? reqToPromise(s.get(key)) : memoryFallback[store].get(key)));
  },
  async put(store, value, key) {
    return withStore(store, 'readwrite', (s) => {
      if (s) return reqToPromise(key === undefined ? s.put(value) : s.put(value, key));
      const m = memoryFallback[store];
      if (store === 'outbox') { const seq = ++memoryFallback.seq; m.set(seq, { ...value, seq }); return seq; }
      m.set(key !== undefined ? key : value.id ?? value.key, value);
      return key;
    });
  },
  async delete(store, key) {
    return withStore(store, 'readwrite', (s) => (s ? reqToPromise(s.delete(key)) : memoryFallback[store].delete(key)));
  },
  async all(store) {
    return withStore(store, 'readonly', (s) => (s ? reqToPromise(s.getAll()) : Array.from(memoryFallback[store].values())));
  },
  async clear(store) {
    return withStore(store, 'readwrite', (s) => (s ? reqToPromise(s.clear()) : memoryFallback[store].clear()));
  },
};

/** Convenience key/value API. */
export const kv = {
  get: (key, fallback = undefined) => idb.get('kv', key).then((v) => (v === undefined ? fallback : v)).catch(() => fallback),
  set: (key, value) => idb.put('kv', value, key),
  del: (key) => idb.delete('kv', key),
};
