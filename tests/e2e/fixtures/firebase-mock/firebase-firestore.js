// TEST-ONLY in-memory fake of firebase-firestore.js (subset used by V-Code Edu). No security rules are emulated.
// Seed: window.__FBMOCK__.db = { 'collection/doc[/sub/doc]': {...fields} }  ({__ts: ms} = Timestamp)
// Dump: window.__fbmock.dump() → same shape (for handing state from one simulated user to the next).
const cfg = globalThis.__FBMOCK__ || {};

export class Timestamp {
  constructor(ms) { this._ms = ms; }
  toMillis() { return this._ms; }
  toDate() { return new Date(this._ms); }
  get seconds() { return Math.floor(this._ms / 1000); }
  get nanoseconds() { return 0; }
  toJSON() { return { __ts: this._ms }; }
  static now() { return new Timestamp(Date.now()); }
  static fromMillis(ms) { return new Timestamp(ms); }
}

function revive(v) {
  if (Array.isArray(v)) return v.map(revive);
  if (v && typeof v === 'object') {
    if (typeof v.__ts === 'number' && Object.keys(v).length === 1) return new Timestamp(v.__ts);
    const o = {};
    for (const [k, x] of Object.entries(v)) o[k] = revive(x);
    return o;
  }
  return v;
}
function clone(v) {
  if (v instanceof Timestamp) return new Timestamp(v._ms);
  if (Array.isArray(v)) return v.map(clone);
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = clone(x); return o; }
  return v;
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

const store = new Map(Object.entries(revive(cfg.db || {})));
const listeners = new Set();
globalThis.__fbmock = {
  store,
  dump: () => JSON.parse(JSON.stringify(Object.fromEntries(store))),
  writes: 0,
};

// ---------- sentinels ----------
const OP = Symbol('fsop');
export const serverTimestamp = () => ({ [OP]: 'ts' });
export const deleteField = () => ({ [OP]: 'del' });
export const arrayUnion = (...items) => ({ [OP]: 'union', items });
export const arrayRemove = (...items) => ({ [OP]: 'remove', items });
export const increment = (n) => ({ [OP]: 'inc', n });
export class FieldPath { constructor(...segments) { this.segments = segments; } }

function resolve(cur, v) {
  if (v && v[OP]) {
    switch (v[OP]) {
      case 'ts': return new Timestamp(Date.now());
      case 'union': { const arr = Array.isArray(cur) ? clone(cur) : []; for (const it of v.items) if (!arr.some((x) => same(x, it))) arr.push(clone(it)); return arr; }
      case 'remove': return (Array.isArray(cur) ? cur : []).filter((x) => !v.items.some((it) => same(x, it)));
      case 'inc': return (Number(cur) || 0) + v.n;
      default: return undefined;
    }
  }
  if (v && typeof v === 'object' && !(v instanceof Timestamp) && !Array.isArray(v)) {
    const o = cur && typeof cur === 'object' && !Array.isArray(cur) ? clone(cur) : {};
    for (const [k, x] of Object.entries(v)) { if (x && x[OP] === 'del') delete o[k]; else o[k] = resolve(o[k], x); }
    return o;
  }
  return clone(v);
}
function setPath(obj, segs, value) {
  let o = obj;
  for (let i = 0; i < segs.length - 1; i++) { if (!o[segs[i]] || typeof o[segs[i]] !== 'object') o[segs[i]] = {}; o = o[segs[i]]; }
  const last = segs[segs.length - 1];
  if (value && value[OP] === 'del') delete o[last]; else o[last] = resolve(o[last], value);
}

// ---------- refs ----------
const DB = { type: 'db' };
export function getFirestore() { return DB; }
export function initializeFirestore() { return DB; }
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const memoryLocalCache = () => ({});
const autoId = () => Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 12);
function joinPath(parent, segs) {
  const base = parent && parent.type !== 'db' ? [parent.path] : [];
  return [...base, ...segs.map(String)].join('/').replace(/\/+/g, '/');
}
export function doc(parent, ...segs) {
  let path = joinPath(parent, segs);
  if (parent?.type === 'collection' && !segs.length) path = `${parent.path}/${autoId()}`;
  const parts = path.split('/');
  return { type: 'doc', path, id: parts[parts.length - 1], parentPath: parts.slice(0, -1).join('/') };
}
export function collection(parent, ...segs) {
  const path = joinPath(parent, segs);
  return { type: 'collection', path, id: path.split('/').pop() };
}
export const where = (field, op, value) => ({ kind: 'where', field, op, value });
export const orderBy = (field, dir = 'asc') => ({ kind: 'orderBy', field, dir });
export const limit = (n) => ({ kind: 'limit', n });
export function query(ref, ...cons) { return { type: 'query', path: ref.path, cons: [...(ref.cons || []), ...cons] }; }

const getField = (data, f) => String(f).split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
const cmpVal = (v) => (v instanceof Timestamp ? v._ms : v);

function docSnap(path) {
  const data = store.get(path);
  const parts = path.split('/');
  const ref = { type: 'doc', path, id: parts[parts.length - 1], parentPath: parts.slice(0, -1).join('/') };
  return { id: ref.id, ref, exists: () => data !== undefined, data: () => (data === undefined ? undefined : clone(data)), get: (f) => clone(getField(data || {}, f)) };
}
function runQuery(q) {
  const prefix = `${q.path}/`;
  let docs = [];
  for (const key of store.keys()) if (key.startsWith(prefix) && !key.slice(prefix.length).includes('/')) docs.push(docSnap(key));
  for (const c of q.cons || []) {
    if (c.kind !== 'where') continue;
    docs = docs.filter((d) => {
      const v = cmpVal(getField(d.data(), c.field)); const x = cmpVal(c.value);
      switch (c.op) {
        case '==': return same(v, x);
        case '!=': return !same(v, x);
        case '<': return v < x;
        case '<=': return v <= x;
        case '>': return v > x;
        case '>=': return v >= x;
        case 'array-contains': return Array.isArray(v) && v.some((it) => same(it, x));
        case 'array-contains-any': return Array.isArray(v) && v.some((it) => x.some((y) => same(it, y)));
        case 'in': return x.some((y) => same(v, y));
        default: return true;
      }
    });
  }
  const orders = (q.cons || []).filter((c) => c.kind === 'orderBy');
  if (orders.length) {
    docs.sort((a, b) => {
      for (const o of orders) {
        const x = cmpVal(getField(a.data(), o.field)); const y = cmpVal(getField(b.data(), o.field));
        if (x === y) continue;
        const r = x === undefined ? -1 : y === undefined ? 1 : x < y ? -1 : 1;
        return o.dir === 'desc' ? -r : r;
      }
      return 0;
    });
  }
  const lim = (q.cons || []).find((c) => c.kind === 'limit');
  if (lim) docs = docs.slice(0, lim.n);
  return { docs, size: docs.length, empty: !docs.length, forEach: (fn) => docs.forEach(fn) };
}
const snapOf = (target) => (target.type === 'doc' ? docSnap(target.path) : runQuery(target));

// ---------- reads ----------
const tick = () => new Promise((r) => setTimeout(r, 5));
export async function getDoc(ref) { await tick(); return docSnap(ref.path); }
export async function getDocs(q) { await tick(); return runQuery(q.type === 'collection' ? { path: q.path, cons: [] } : q); }
export function onSnapshot(target, next, error) {
  const t = target.type === 'collection' ? { type: 'query', path: target.path, cons: [] } : target;
  const l = { t, next: typeof next === 'function' ? next : next?.next, error };
  listeners.add(l);
  setTimeout(() => { if (listeners.has(l)) l.next(snapOf(t)); }, 0);
  return () => listeners.delete(l);
}
let notifyQueued = false;
function notify() {
  globalThis.__fbmock.writes++;
  if (notifyQueued) return;
  notifyQueued = true;
  setTimeout(() => { notifyQueued = false; for (const l of [...listeners]) { try { l.next(snapOf(l.t)); } catch (e) { console.error('[fbmock] listener failed', e); } } }, 0);
}

// ---------- writes ----------
function applySet(path, data, opts = {}) {
  const prev = store.get(path);
  if (opts.merge && prev) store.set(path, resolve(prev, data));
  else store.set(path, resolve(undefined, data));
}
function applyUpdate(path, args) {
  const prev = store.get(path);
  if (prev === undefined) { const e = new Error(`No document to update: ${path}`); e.code = 'not-found'; throw e; }
  const next = clone(prev);
  if (args.length === 1 && args[0] && typeof args[0] === 'object' && !(args[0] instanceof FieldPath)) {
    for (const [k, v] of Object.entries(args[0])) setPath(next, k.split('.'), v);
  } else {
    for (let i = 0; i < args.length; i += 2) {
      const f = args[i];
      setPath(next, f instanceof FieldPath ? f.segments : String(f).split('.'), args[i + 1]);
    }
  }
  store.set(path, next);
}
export async function setDoc(ref, data, opts) { await tick(); applySet(ref.path, data, opts); notify(); }
export async function updateDoc(ref, ...args) { await tick(); applyUpdate(ref.path, args); notify(); }
export async function deleteDoc(ref) { await tick(); store.delete(ref.path); notify(); }
export async function addDoc(coll, data) { const ref = doc(coll); await setDoc(ref, data); return ref; }
export function writeBatch() {
  const ops = [];
  return {
    set(ref, data, opts) { ops.push(() => applySet(ref.path, data, opts)); return this; },
    update(ref, ...args) { ops.push(() => applyUpdate(ref.path, args)); return this; },
    delete(ref) { ops.push(() => store.delete(ref.path)); return this; },
    async commit() { await tick(); ops.forEach((f) => f()); notify(); },
  };
}
