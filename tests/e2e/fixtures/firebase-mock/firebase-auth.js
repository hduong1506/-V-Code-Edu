// TEST-ONLY fake of firebase-auth.js. The signed-in user comes from window.__FBMOCK__.user (null = signed out).
const cfg = globalThis.__FBMOCK__ || {};

function makeUser(u) {
  return {
    uid: u.uid || `uid_${String(u.email).replace(/[^a-z0-9]/gi, '')}`,
    email: u.email,
    displayName: u.displayName || u.email.split('@')[0],
    photoURL: '',
    emailVerified: true,
    providerData: [{ providerId: 'password' }],
    getIdToken: async () => 'mock-token',
    delete: async () => {},
  };
}

let current = cfg.user ? makeUser(cfg.user) : null;
const listeners = new Set();
const auth = { get currentUser() { return current; }, languageCode: 'vi' };

export function getAuth() { return auth; }
export function onAuthStateChanged(_auth, cb) { listeners.add(cb); setTimeout(() => cb(current), 0); return () => listeners.delete(cb); }
export function onIdTokenChanged() { return () => {}; }
export async function getRedirectResult() { return null; }
export async function signOut() { current = null; listeners.forEach((cb) => cb(null)); }
export class GoogleAuthProvider { setCustomParameters() {} }
export const EmailAuthProvider = { credential: () => ({}) };
const unsupported = async () => { const e = new Error('Firebase mock: not supported in tests'); e.code = 'auth/operation-not-allowed'; throw e; };
export const signInWithEmailAndPassword = unsupported;
export const createUserWithEmailAndPassword = unsupported;
export const signInWithPopup = unsupported;
export const signInWithRedirect = unsupported;
export const sendPasswordResetEmail = unsupported;
export const reauthenticateWithCredential = unsupported;
export const updatePassword = unsupported;
export async function updateProfile() {}
export async function sendEmailVerification() {}
