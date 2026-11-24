// V-Code Edu — AI conversation history: local-first (IndexedDB) with Firestore sync for signed-in users.
// Conflict policy: last-writer-wins per conversation (updatedAt); deletions are tombstoned locally until synced.
import { idb } from '../core/idb.js';
import { appState, bus } from '../core/store.js';
import { uid, debounce } from '../core/dom.js';
import { firestore } from './auth.js';

const MAX_CLOUD_MESSAGES = 80;
const MAX_CLOUD_CHARS = 16000;

function owner() {
  return appState.get().user?.key || 'guest';
}

function notify() {
  bus.emit('conversations:change');
}

export async function listConversations({ query = '' } = {}) {
  const me = owner();
  const all = (await idb.all('conversations')).filter((c) => c.owner === me && !c.deleted);
  const q = query.trim().toLowerCase();
  const filtered = q
    ? all.filter((c) => c.title?.toLowerCase().includes(q) || c.messages?.some((m) => String(m.content).toLowerCase().includes(q)))
    : all;
  return filtered.sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.updatedAt - a.updatedAt);
}

export async function getConversation(id) {
  const c = await idb.get('conversations', id);
  return c && !c.deleted && c.owner === owner() ? c : null;
}

export async function createConversation({ mode = 'tutor', title = 'Cuộc trò chuyện mới' } = {}) {
  const now = Date.now();
  const c = { id: uid('c'), owner: owner(), title, mode, messages: [], createdAt: now, updatedAt: now, autoTitle: true };
  await idb.put('conversations', c);
  notify();
  return c;
}

export async function saveConversation(c, { sync = true } = {}) {
  c.updatedAt = Date.now();
  await idb.put('conversations', c);
  notify();
  if (sync) scheduleSync(c.id);
  return c;
}

export async function renameConversation(id, title) {
  const c = await getConversation(id);
  if (!c) return null;
  c.title = String(title).slice(0, 120);
  c.autoTitle = false;
  return saveConversation(c);
}

export async function deleteConversation(id) {
  const c = await idb.get('conversations', id);
  if (!c) return;
  c.deleted = true;
  c.messages = [];
  c.updatedAt = Date.now();
  await idb.put('conversations', c);
  notify();
  pushDelete(c);
}

/** Title from the first user message. */
export function deriveTitle(text) {
  const t = String(text || '').replace(/```[\s\S]*?```/g, ' ').replace(/[#*_`>]/g, '').replace(/\s+/g, ' ').trim();
  return t ? (t.length > 60 ? `${t.slice(0, 57)}…` : t) : 'Cuộc trò chuyện mới';
}

// ---------- Cloud sync ----------
const timers = new Map();
function scheduleSync(id) {
  if (!appState.get().user) return;
  clearTimeout(timers.get(id));
  timers.set(id, setTimeout(() => { timers.delete(id); pushOne(id); }, 1500));
}

function toCloud(c) {
  return {
    title: c.title,
    mode: c.mode,
    pinned: Boolean(c.pinned),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    messages: c.messages.slice(-MAX_CLOUD_MESSAGES).map((m) => ({
      id: m.id, role: m.role, content: String(m.content || '').slice(0, MAX_CLOUD_CHARS), createdAt: m.createdAt || 0,
      provider: m.provider || null, model: m.model || null, error: m.error ? String(m.error).slice(0, 500) : null,
    })),
  };
}

async function pushOne(id) {
  const user = appState.get().user;
  if (!user) return;
  const c = await idb.get('conversations', id);
  if (!c || c.owner !== user.key) return;
  try {
    const { db, fs } = await firestore();
    const ref = fs.doc(db, 'users', user.key, 'conversations', id);
    if (c.deleted) await fs.deleteDoc(ref);
    else await fs.setDoc(ref, toCloud(c));
    c.syncedAt = Date.now();
    await idb.put('conversations', c);
  } catch (err) {
    console.warn('[conversations] sync deferred:', err?.code || err?.message);
  }
}

async function pushDelete(c) {
  if (appState.get().user && c.owner === appState.get().user.key) pushOne(c.id);
}

/** Merge cloud ↔ local after sign-in (and adopt conversations made as guest). */
export const syncConversations = debounce(async () => {
  const user = appState.get().user;
  if (!user) return;
  try {
    const all = await idb.all('conversations');
    // adopt guest conversations
    for (const c of all.filter((x) => x.owner === 'guest' && !x.deleted && x.messages.length)) {
      c.owner = user.key;
      c.updatedAt = Date.now();
      await idb.put('conversations', c);
    }
    const { db, fs } = await firestore();
    const snap = await fs.getDocs(fs.collection(db, 'users', user.key, 'conversations'));
    const remote = new Map(snap.docs.map((d) => [d.id, d.data()]));
    const localAll = (await idb.all('conversations')).filter((c) => c.owner === user.key);
    const localMap = new Map(localAll.map((c) => [c.id, c]));
    for (const [id, r] of remote) {
      const l = localMap.get(id);
      if (!l || (!l.deleted && (r.updatedAt || 0) > (l.updatedAt || 0))) {
        await idb.put('conversations', { id, owner: user.key, title: r.title, mode: r.mode, pinned: r.pinned, messages: r.messages || [], createdAt: r.createdAt || Date.now(), updatedAt: r.updatedAt || Date.now(), syncedAt: Date.now() });
      }
    }
    for (const l of localAll) {
      const r = remote.get(l.id);
      if (l.deleted || !r || (l.updatedAt || 0) > (r.updatedAt || 0)) pushOne(l.id);
    }
    notify();
  } catch (err) {
    console.warn('[conversations] initial sync failed:', err?.code || err?.message);
  }
}, 800);

export function initConversationSync() {
  let last = null;
  appState.subscribe((s) => {
    const key = s.user?.key || null;
    if (key !== last) {
      last = key;
      notify();
      if (key) syncConversations();
    }
  });
  bus.on('net:online', () => syncConversations());
}
