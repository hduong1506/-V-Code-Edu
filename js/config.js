// V-Code Edu — public runtime configuration.
// NOTE: The Firebase web config below is NOT a secret (Firebase identifies the project with it);
// access is protected by Firebase Auth + Firestore Security Rules (see firestore.rules).
// Never put AI provider keys here — they live only in the backend's environment variables.

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBJcl1zkrtRReiteKkErge12oh0FDi2LmA',
  authDomain: 'v-code-edu.firebaseapp.com',
  projectId: 'v-code-edu',
};

export const FIREBASE_SDK_VERSION = '10.12.2';
export const FIREBASE_SDK_BASE = `https://www.gstatic.com/firebasejs/${FIREBASE_SDK_VERSION}`;

export const APP_VERSION = '3.0.0';

// Code runtimes (pinned versions; cached by the service worker for offline use)
export const PYODIDE_VERSION = '0.27.7';
export const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;
export const KATEX_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.11/';
export const QRCODE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
export const WEBLLM_URL = 'https://esm.run/@mlc-ai/web-llm@0.2.79';
// Homepage 3D hero (WebGL). Loaded lazily; a CSS 3D fallback renders when it is unavailable.
export const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

const API_OVERRIDE_KEY = 'vc-api-base';

/**
 * Backend base URL resolution:
 *  1. user override saved in Settings (e.g. a school LAN server http://192.168.1.10:8000)
 *  2. window.VCODE_API_BASE (set by hosting page if needed)
 *  3. same origin when the page is served by the FastAPI backend (port 8000)
 *  4. http://localhost:8000 (local development with Live Server)
 */
export function getApiBase() {
  try {
    const saved = localStorage.getItem(API_OVERRIDE_KEY);
    if (saved) return saved.replace(/\/+$/, '');
  } catch { /* storage unavailable */ }
  if (typeof window !== 'undefined' && window.VCODE_API_BASE) return String(window.VCODE_API_BASE).replace(/\/+$/, '');
  if (location.port === '8000' || location.pathname.startsWith('/app')) return location.origin;
  if (location.protocol === 'https:' && !/^(localhost|127\.)/.test(location.hostname)) return location.origin;
  return 'http://localhost:8000';
}

export function setApiBase(url) {
  try {
    if (url) localStorage.setItem(API_OVERRIDE_KEY, String(url).trim().replace(/\/+$/, ''));
    else localStorage.removeItem(API_OVERRIDE_KEY);
  } catch { /* ignore */ }
}
