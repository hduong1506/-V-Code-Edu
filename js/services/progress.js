// V-Code Edu — learning progress (local-first, conflict-free cloud merge).
//
// Local:  kv['progress:<owner>'] = { lessons: { id: { at, xp } }, challenges: { id: { at, xp } }, updatedAt }
// Cloud:  users/{key}.progress.lessons.<id> / progress.challenges.<id>  (field-level writes → merges never conflict)
// XP is derived from completed items (+ legacy XP carried over), so two devices can never disagree.

import { kv } from '../core/idb.js';
import { appState, bus } from '../core/store.js';
import { firestore } from './auth.js';
import { debounce } from '../core/dom.js';

const KEY = (owner) => `progress:${owner || 'guest'}`;
let current = null;
let currentOwner = null;

function empty() {
  return { lessons: {}, challenges: {}, updatedAt: 0 };
}

function owner() {
  return appState.get().user?.key || 'guest';
}

async function load(ownerKey = owner()) {
  if (current && currentOwner === ownerKey) return current;
  const data = await kv.get(KEY(ownerKey), null);
  current = { ...empty(), ...(data || {}) };
  currentOwner = ownerKey;
  return current;
}

async function save() {
  current.updatedAt = Date.now();
  await kv.set(KEY(currentOwner), current);
  bus.emit('progress:change', current);
}

export async function getProgress() {
  return load();
}

export function isDone(progress, kind, id) {
  return Boolean(progress?.[kind]?.[id]);
}

export function totalXp(progress, xpLegacy = appState.get().user?.xpLegacy || 0) {
  let xp = Number(xpLegacy) || 0;
  for (const kind of ['lessons', 'challenges']) {
    for (const item of Object.values(progress?.[kind] || {})) xp += Number(item?.xp) || 0;
  }
  return xp;
}

const pushLeaderboard = debounce(async () => {
  const user = appState.get().user;
  if (!user) return;
  try {
    const { db, fs } = await firestore();
    const p = await load(user.key);
    await fs.setDoc(fs.doc(db, 'leaderboard', user.key), {
      name: String(user.displayName || 'Học viên').slice(0, 80),
      xp: Math.max(0, Math.round(totalXp(p, user.xpLegacy))),
      school: String(user.school_name || '').slice(0, 120),
      updated_at: fs.serverTimestamp(),
    });
  } catch (err) {
    console.warn('[progress] leaderboard update skipped:', err?.code || err?.message);
  }
}, 2500);

async function pushItem(kind, id, value) {
  const user = appState.get().user;
  if (!user) return;
  try {
    const { db, fs } = await firestore();
    // updateDoc is queued by Firestore's offline persistence and synced automatically when back online.
    await fs.updateDoc(fs.doc(db, 'users', user.key), new fs.FieldPath('progress', kind, id), value, 'updated_at', fs.serverTimestamp());
  } catch (err) {
    console.warn('[progress] cloud write deferred/failed:', err?.code || err?.message);
  }
}

/** Mark a lesson/challenge as completed. Returns { firstTime, xp }. */
export async function markComplete(kind, id, xp = 0) {
  const p = await load();
  const firstTime = !p[kind][id];
  if (firstTime) {
    p[kind][id] = { at: Date.now(), xp: Number(xp) || 0 };
    await save();
    pushItem(kind, id, p[kind][id]);
    pushLeaderboard();
  }
  return { firstTime, xp: firstTime ? Number(xp) || 0 : 0 };
}

/** Merge a remote progress object into local (union; keep earliest completion time). */
function mergeInto(target, source) {
  let changed = false;
  for (const kind of ['lessons', 'challenges']) {
    for (const [id, val] of Object.entries(source?.[kind] || {})) {
      const mine = target[kind][id];
      if (!mine || (val?.at && val.at < mine.at)) {
        target[kind][id] = { at: Number(val?.at) || Date.now(), xp: Number(val?.xp) || 0 };
        changed = true;
      }
    }
  }
  return changed;
}

/** One-time import of progress stored by the legacy app in localStorage. */
async function importLegacyLocal(p) {
  if (await kv.get('legacy-import-done', false)) return false;
  let changed = false;
  try {
    const ids = JSON.parse(localStorage.getItem('vcode_completed_challenges') || '[]');
    if (Array.isArray(ids) && ids.length) {
      let xpMap = {};
      try {
        const { loadChallenges } = await import('./content.js');
        const data = await loadChallenges();
        xpMap = Object.fromEntries((data.challenges || []).map((c) => [c.id, c.xp]));
      } catch { /* offline: default xp */ }
      for (const id of ids) {
        if (typeof id === 'string' && /^stage-\d+$/.test(id) && !p.challenges[id]) {
          p.challenges[id] = { at: Date.now(), xp: Number(xpMap[id]) || 100, legacy: true };
          changed = true;
        }
      }
    }
  } catch { /* corrupted legacy data — ignore */ }
  await kv.set('legacy-import-done', true);
  return changed;
}

/** Called on sign-in / sign-out / profile snapshot to reconcile local + cloud progress. */
async function reconcile() {
  const user = appState.get().user;
  if (!user) {
    current = null;
    await load('guest');
    bus.emit('progress:change', current);
    return;
  }
  const mine = await load(user.key);
  let changed = false;
  // 1) guest progress made before logging in moves into the account
  const guest = await kv.get(KEY('guest'), null);
  if (guest && (Object.keys(guest.lessons || {}).length || Object.keys(guest.challenges || {}).length)) {
    changed = mergeInto(mine, guest) || changed;
    await kv.set(KEY('guest'), empty());
  }
  changed = (await importLegacyLocal(mine)) || changed;
  // 2) cloud → local
  const remote = user.profile?.progress;
  if (remote) changed = mergeInto(mine, remote) || changed;
  if (changed) await save(); else bus.emit('progress:change', mine);
  // 3) local → cloud (only items the cloud is missing)
  for (const kind of ['lessons', 'challenges']) {
    for (const [id, val] of Object.entries(mine[kind])) {
      if (!remote?.[kind]?.[id]) pushItem(kind, id, { at: val.at, xp: val.xp });
    }
  }
  pushLeaderboard();
}

export function initProgress() {
  let lastKey = null;
  appState.subscribe((state, prev) => {
    const key = state.user?.key || null;
    const remoteChanged = state.user?.profile?.progress !== prev.user?.profile?.progress;
    if (key !== lastKey || remoteChanged) {
      lastKey = key;
      reconcile().catch((err) => console.warn('[progress] reconcile failed', err));
    }
  });
  reconcile().catch(() => {});
}

export async function loadLeaderboard(limitN = 20) {
  const { db, fs } = await firestore();
  const q = fs.query(fs.collection(db, 'leaderboard'), fs.orderBy('xp', 'desc'), fs.limit(limitN));
  const snap = await fs.getDocs(q);
  return snap.docs.map((d, i) => ({ rank: i + 1, key: d.id, ...d.data() }));
}
