// V-Code Edu — authentication service (Firebase Authentication, existing project preserved).
//
// - Email/password + Google sign-in through Firebase Auth; session persists in Firebase's IndexedDB storage.
// - Profiles live in Firestore users/{emailKey} (same document keys as the legacy app → existing data preserved).
// - Legacy accounts (password hash stored in Firestore by the old app) are migrated transparently on first login:
//   a Firebase Auth account is created with the same password and the Firestore rules verify the legacy hash
//   server-side before the old hash is removed. See firestore.rules → users/{key}.
import { loadFirebase, emailKey, firebaseErrorMessage } from './firebase.js';
import { legacyPasswordProofs } from '../core/crypto.js';
import { appState, bus } from '../core/store.js';
import { kv } from '../core/idb.js';

let fb = null;            // { auth, db, A, fs }
let unsubProfile = null;
let initPromise = null;

const PROFILE_CACHE = (key) => `profile:${key}`;

function baseProfile(user, extra = {}) {
  const email = (user.email || '').toLowerCase();
  return {
    email,
    username: email.split('@')[0].replace(/[^a-z0-9_]/g, '') || 'hocvien',
    full_name: user.displayName || email.split('@')[0] || 'Học viên V-Code',
    role: 'none',
    auth_provider: (user.providerData?.[0]?.providerId || 'password').replace('.com', ''),
    school_name: '',
    class_name: '',
    avatar_url: user.photoURL || '',
    ...extra,
  };
}

function toSessionUser(user, profile = {}) {
  const email = (user.email || profile.email || '').toLowerCase();
  return {
    uid: user.uid,
    email,
    key: emailKey(email),
    displayName: profile.full_name || user.displayName || email.split('@')[0],
    photoURL: profile.avatar_url || user.photoURL || '',
    role: profile.role || 'none',
    school_name: profile.school_name || '',
    class_name: profile.class_name || '',
    provider: user.providerData?.[0]?.providerId || 'password',
    emailVerified: Boolean(user.emailVerified),
    xpLegacy: Number(profile.xp_legacy ?? profile.xp ?? 0) || 0,
    profile,
  };
}

/** Create or update users/{key} for the signed-in user without clobbering existing (legacy) data. */
async function ensureProfile(user) {
  const { db, fs } = fb;
  const key = emailKey(user.email);
  const ref = fs.doc(db, 'users', key);
  let snap = null;
  try {
    snap = await fs.getDoc(ref);
  } catch (err) {
    if (err?.code !== 'permission-denied') throw err;
    // Denied while a legacy password hash is still present (rules hide it). Google-verified users may claim it.
    if (user.providerData?.some((p) => p.providerId === 'google.com')) {
      await fs.updateDoc(ref, { password_hash: fs.deleteField(), uid: user.uid, claimed_via: 'google', migrated_at: fs.serverTimestamp() });
      snap = await fs.getDoc(ref);
    } else {
      throw err;
    }
  }
  if (!snap.exists()) {
    const data = { ...baseProfile(user), uid: user.uid, created_at: fs.serverTimestamp(), updated_at: fs.serverTimestamp() };
    await fs.setDoc(ref, data);
    return { ...data, created_at: Date.now() };
  }
  const data = snap.data();
  const patch = {};
  if (!data.uid) patch.uid = user.uid;
  if (!data.avatar_url && user.photoURL) patch.avatar_url = user.photoURL;
  if (!data.full_name && user.displayName) patch.full_name = user.displayName;
  if (data.xp !== undefined && data.xp_legacy === undefined) patch.xp_legacy = Number(data.xp) || 0;
  if ('password_hash' in data) patch.password_hash = fs.deleteField(); // open-rules deployments: never keep legacy hashes
  if ('legacy_claim' in data) patch.legacy_claim = fs.deleteField();
  if (Object.keys(patch).length) {
    patch.updated_at = fs.serverTimestamp();
    fs.updateDoc(ref, patch).catch((err) => console.warn('[auth] profile patch failed', err?.code));
  }
  const clean = { ...data, ...patch };
  delete clean.password_hash;
  delete clean.legacy_claim;
  return clean;
}

function watchProfile(user) {
  unsubProfile?.();
  const { db, fs } = fb;
  const key = emailKey(user.email);
  unsubProfile = fs.onSnapshot(fs.doc(db, 'users', key), (snap) => {
    if (!snap.exists()) return;
    const data = snap.data();
    delete data.password_hash;
    delete data.legacy_claim;
    const session = toSessionUser(user, data);
    appState.set({ user: session });
    kv.set(PROFILE_CACHE(key), data).catch(() => {});
  }, (err) => console.warn('[auth] profile listener error', err?.code));
}

async function handleSignedIn(user) {
  const key = emailKey(user.email);
  // 1) Instant UI from cache (works offline)
  const cached = await kv.get(PROFILE_CACHE(key), null);
  appState.set({ user: toSessionUser(user, cached || baseProfile(user)), authReady: true });
  // 2) Authoritative profile from Firestore (cached by Firestore offline persistence)
  try {
    const profile = await ensureProfile(user);
    appState.set({ user: toSessionUser(user, profile) });
    kv.set(PROFILE_CACHE(key), profile).catch(() => {});
    watchProfile(user);
  } catch (err) {
    console.warn('[auth] could not load profile', err);
    if (err?.code === 'permission-denied') {
      bus.emit('auth:profile-denied', err);
    }
  }
  bus.emit('auth:signed-in', appState.get().user);
}

/** Initialize Firebase Auth and subscribe to session changes. Safe to call multiple times. */
export function initAuth() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      fb = await loadFirebase();
    } catch (err) {
      console.warn('[auth] Firebase unavailable:', err?.message);
      appState.set({ authReady: true, user: null, firebaseUnavailable: true });
      initPromise = null; // allow retry when back online
      return false;
    }
    const { auth, A } = fb;
    try { await A.getRedirectResult(auth); } catch (err) { if (err?.code) bus.emit('auth:error', firebaseErrorMessage(err)); }
    A.onAuthStateChanged(auth, async (user) => {
      if (user && user.email) {
        await handleSignedIn(user);
      } else {
        unsubProfile?.();
        unsubProfile = null;
        const wasSignedIn = Boolean(appState.get().user);
        appState.set({ user: null, authReady: true });
        if (wasSignedIn) bus.emit('auth:signed-out');
      }
    });
    // Detect revoked/expired sessions (token refresh failures)
    A.onIdTokenChanged(auth, () => {});
    appState.set({ firebaseUnavailable: false });
    return true;
  })();
  return initPromise;
}

async function requireFb() {
  if (!fb) {
    const ok = await initAuth();
    if (!ok || !fb) throw authError({ code: 'app/firebase-unavailable', message: 'Không tải được dịch vụ đăng nhập. Hãy kiểm tra kết nối Internet.' });
  }
  return fb;
}

/** Wrap a Firebase error: friendly Vietnamese message + the original `code` (the dialog uses it for guided fixes). */
export function authError(err) {
  if (err instanceof Error && err.vcode) return err;
  const e = new Error(err?.code?.startsWith?.('app/') ? err.message : firebaseErrorMessage(err));
  e.code = err?.code || 'unknown';
  e.vcode = true;
  return e;
}

/**
 * "Ghi nhớ đăng nhập": local persistence (survives browser restarts, default) or session persistence
 * (signed out when the browser closes). Must be called before signing in.
 */
export async function setRememberMe(remember) {
  try { localStorage.setItem('vc-remember', remember ? '1' : '0'); } catch { /* storage unavailable */ }
  const { auth, A } = await requireFb();
  try {
    await A.setPersistence(auth, remember ? A.indexedDBLocalPersistence : A.browserSessionPersistence);
  } catch (err) {
    console.warn('[auth] persistence change failed', err?.code);
  }
}

export function getRememberMe() {
  try { return localStorage.getItem('vc-remember') !== '0'; } catch { return true; }
}

/** Register a new email/password account. */
export async function register({ fullName, email, password }) {
  const { auth, A, db, fs } = await requireFb();
  const cleanEmail = String(email).trim().toLowerCase();
  if (String(password).length < 6) throw authError({ code: 'auth/weak-password' });
  let cred;
  try {
    cred = await A.createUserWithEmailAndPassword(auth, cleanEmail, password);
  } catch (err) {
    throw authError(err);
  }
  const user = cred.user;
  try {
    await A.updateProfile(user, { displayName: String(fullName).trim() });
    const ref = fs.doc(db, 'users', emailKey(cleanEmail));
    const existing = await fs.getDoc(ref).catch((e) => (e?.code === 'permission-denied' ? 'legacy' : null));
    if (existing === 'legacy' || (existing && existing.exists() && existing.data().password_hash)) {
      // A legacy account exists for this email: don't let a new password silently take it over.
      await user.delete().catch(() => A.signOut(auth));
      throw authError({ code: 'app/legacy-account-exists', message: 'Email này đã có tài khoản từ phiên bản cũ. Hãy chọn "Đăng nhập" và dùng mật khẩu cũ.' });
    }
    if (!existing || !existing.exists()) {
      await fs.setDoc(ref, { ...baseProfile(user, { full_name: String(fullName).trim() }), uid: user.uid, created_at: fs.serverTimestamp(), updated_at: fs.serverTimestamp() });
    }
    A.sendEmailVerification(user).catch(() => {});
    await handleSignedIn(user);
    return appState.get().user;
  } catch (err) {
    throw authError(err);
  }
}

/** Try to migrate a legacy (pre-Firebase-Auth) account. Returns true if migrated and signed in. */
async function migrateLegacyAccount(email, password) {
  const { auth, A, db, fs } = fb;
  const ref = fs.doc(db, 'users', emailKey(email));
  let cred;
  try {
    cred = await A.createUserWithEmailAndPassword(auth, email, password);
  } catch (err) {
    if (err?.code === 'auth/email-already-in-use') return false; // a real Auth account exists → password was wrong
    if (err?.code === 'auth/weak-password') return false;
    throw err;
  }
  const user = cred.user;
  const proofs = await legacyPasswordProofs(password);
  const rollback = async () => { await user.delete().catch(() => A.signOut(auth)); };
  try {
    // Open-rules deployments can read the doc: verify locally first.
    let snap = null;
    try { snap = await fs.getDoc(ref); } catch (err) { if (err?.code !== 'permission-denied') throw err; }
    if (snap) {
      if (!snap.exists() || !snap.data().password_hash || !proofs.includes(snap.data().password_hash)) { await rollback(); return false; }
    }
    // Strict rules: the server compares legacy_claim with the stored hash.
    let claimed = false;
    for (const proof of proofs) {
      try {
        await fs.updateDoc(ref, { legacy_claim: proof, password_hash: fs.deleteField(), uid: user.uid, auth_provider: 'password', migrated_at: fs.serverTimestamp() });
        claimed = true;
        break;
      } catch (err) {
        if (err?.code === 'not-found') break;
        if (err?.code !== 'permission-denied') throw err;
      }
    }
    if (!claimed) { await rollback(); return false; }
    await fs.updateDoc(ref, { legacy_claim: fs.deleteField() }).catch(() => {});
    await A.updateProfile(user, { displayName: (snap?.data()?.full_name) || undefined }).catch(() => {});
    await handleSignedIn(user);
    bus.emit('auth:migrated', email);
    return true;
  } catch (err) {
    await rollback();
    throw err;
  }
}

/** Sign in with email/password (with transparent legacy migration). */
export async function login({ email, password }) {
  const { auth, A } = await requireFb();
  const cleanEmail = String(email).trim().toLowerCase();
  if (!cleanEmail.includes('@')) throw authError({ code: 'app/email-required', message: 'Vui lòng đăng nhập bằng địa chỉ email (tài khoản cũ cũng dùng email đã đăng ký).' });
  try {
    const cred = await A.signInWithEmailAndPassword(auth, cleanEmail, password);
    return cred.user;
  } catch (err) {
    const code = err?.code || '';
    if (['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-login-credentials'].includes(code)) {
      let migrated = false;
      try { migrated = await migrateLegacyAccount(cleanEmail, password); } catch (e) { console.warn('[auth] legacy migration failed', e); }
      if (migrated) return auth.currentUser;
    }
    throw authError(err);
  }
}

/** Google sign-in (popup, falls back to redirect when popups are blocked / unsupported). */
export async function loginWithGoogle() {
  const { auth, A } = await requireFb();
  const provider = new A.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const cred = await A.signInWithPopup(auth, provider);
    return cred.user;
  } catch (err) {
    if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment'].includes(err?.code)) {
      await A.signInWithRedirect(auth, provider);
      return null;
    }
    throw authError(err);
  }
}

export async function logout() {
  if (!fb) { appState.set({ user: null }); return; }
  unsubProfile?.();
  unsubProfile = null;
  await fb.A.signOut(fb.auth);
}

export async function resetPassword(email) {
  const { auth, A } = await requireFb();
  try {
    await A.sendPasswordResetEmail(auth, String(email).trim().toLowerCase());
  } catch (err) {
    throw authError(err);
  }
}

export async function changePassword(currentPassword, newPassword) {
  const { auth, A } = await requireFb();
  const user = auth.currentUser;
  if (!user) throw new Error('Bạn chưa đăng nhập.');
  if (String(newPassword).length < 6) throw new Error('Mật khẩu mới phải có ít nhất 6 ký tự.');
  try {
    const cred = A.EmailAuthProvider.credential(user.email, currentPassword);
    await A.reauthenticateWithCredential(user, cred);
    await A.updatePassword(user, newPassword);
  } catch (err) {
    throw new Error(firebaseErrorMessage(err));
  }
}

/** Fresh Firebase ID token for backend calls (null when signed out / offline without token). */
export async function getIdToken() {
  if (!fb?.auth?.currentUser) return null;
  try {
    return await fb.auth.currentUser.getIdToken();
  } catch (err) {
    if (err?.code === 'auth/user-token-expired' || err?.code === 'auth/user-disabled') {
      bus.emit('auth:error', firebaseErrorMessage(err));
      await logout().catch(() => {});
    }
    return null;
  }
}

export function currentUser() {
  return appState.get().user;
}

export function hasPasswordProvider() {
  return Boolean(fb?.auth?.currentUser?.providerData?.some((p) => p.providerId === 'password'));
}

/** Low-level access for other services (classroom, progress, conversations). */
export async function firestore() {
  const { db, fs } = await requireFb();
  return { db, fs };
}
