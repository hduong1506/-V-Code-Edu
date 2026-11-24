/* V-Code Edu — Service Worker (offline support).
   Strategies:
   - App shell + core modules: precached at install (versioned cache), served cache-first, refreshed in background.
   - Same-origin JS/CSS/JSON/assets: stale-while-revalidate (fast + updates on next load).
   - Code runtimes & libraries (Pyodide, KaTeX, Firebase SDK, fonts, WebLLM loader): cache-first in a long-lived runtime cache.
   - API calls (/api/*), Firestore/Auth network channels, non-GET: never cached (network only).
   - Navigations: network-first, falling back to the cached app shell when offline. */

const VERSION = 'v3.1.0';
const SHELL_CACHE = `vcode-shell-${VERSION}`;
const ASSET_CACHE = `vcode-assets-${VERSION}`;
const RUNTIME_CACHE = 'vcode-runtime-v1'; // large, version-pinned third-party files survive app updates

const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './data/courses/index.json',
  './data/challenges.json',
  './data/pyvn-keywords.json',
  './vendor/jscpp/JSCPP.es5.min.js',
  './vendor/sqljs/sql-wasm.js',
  './vendor/sqljs/sql-wasm.wasm',
  './assets/logo-640.jpg',
  './assets/icons/mark-96.png',
  './assets/icons/icon-192.png',
  './assets/icons/apple-touch-icon.png',
  './css/auth.css',
  './css/base.css',
  './css/components.css',
  './css/pages/account.css',
  './css/pages/ai.css',
  './css/pages/challenges.css',
  './css/pages/classroom.css',
  './css/pages/flowchart.css',
  './css/pages/home.css',
  './css/pages/ide.css',
  './css/pages/learn.css',
  './css/pages/prism.css',
  './css/pages/scratch.css',
  './css/shell.css',
  './css/tokens.css',
  './css/vbot.css',
  './js/components/auth-dialog.js',
  './js/components/chat.js',
  './js/components/editor.js',
  './js/components/flowchart/codegen.js',
  './js/components/flowchart/editor.js',
  './js/components/flowchart/export.js',
  './js/components/flowchart/expr.js',
  './js/components/flowchart/icons-local.js',
  './js/components/flowchart/index.js',
  './js/components/flowchart/interpreter.js',
  './js/components/flowchart/layout.js',
  './js/components/flowchart/live.js',
  './js/components/flowchart/model.js',
  './js/components/flowchart/parse-code.js',
  './js/components/flowchart/render.js',
  './js/components/flowchart/semantics.js',
  './js/components/flowchart/templates.js',
  './js/components/flowchart/viewport.js',
  './js/components/highlight.js',
  './js/components/icons.js',
  './js/components/ide/autocomplete.js',
  './js/components/ide/controls.js',
  './js/components/ide/diagnostics.js',
  './js/components/ide/editor-theme.js',
  './js/components/ide/explain-errors.js',
  './js/components/ide/files.js',
  './js/components/ide/find.js',
  './js/components/ide/formatter.js',
  './js/components/ide/problems.js',
  './js/components/ide/settings.js',
  './js/components/ide.js',
  './js/components/markdown.js',
  './js/components/practice.js',
  './js/components/scratch/blocks.js',
  './js/components/scratch/codegen.js',
  './js/components/scratch/frompy.js',
  './js/components/scratch/index.js',
  './js/components/scratch/live.js',
  './js/components/scratch/projects.js',
  './js/components/scratch/pyparse.js',
  './js/components/scratch/render.js',
  './js/components/scratch/runtime.js',
  './js/components/scratch/shapes.js',
  './js/components/scratch/sprites.js',
  './js/components/scratch/stage.js',
  './js/components/scratch/studio.js',
  './js/components/scratch/workspace.js',
  './js/components/vbot.js',
  './js/config.js',
  './js/core/crypto.js',
  './js/core/dom.js',
  './js/core/format.js',
  './js/core/idb.js',
  './js/core/net.js',
  './js/core/router.js',
  './js/core/store.js',
  './js/core/theme.js',
  './js/core/ui.js',
  './js/main.js',
  './js/pages/account.js',
  './js/pages/ai.js',
  './js/pages/arena/art.js',
  './js/pages/arena/core.js',
  './js/pages/arena/overlay.js',
  './js/pages/challenge.js',
  './js/pages/challenges.js',
  './js/pages/classroom/art.js',
  './js/pages/classroom/assignments.js',
  './js/pages/classroom/feed.js',
  './js/pages/classroom/gradebook.js',
  './js/pages/classroom/home.js',
  './js/pages/classroom/landing.js',
  './js/pages/classroom/overview.js',
  './js/pages/classroom/people.js',
  './js/pages/classroom/settings.js',
  './js/pages/classroom/shell.js',
  './js/pages/classroom/util.js',
  './js/pages/classroom/workspace.js',
  './js/pages/classroom.js',
  './js/pages/course.js',
  './js/pages/home/hero3d.js',
  './js/pages/home/scenes.js',
  './js/pages/home.js',
  './js/pages/learn/course-art.js',
  './js/pages/learn/shared.js',
  './js/pages/learn.js',
  './js/pages/lesson.js',
  './js/pages/not-found.js',
  './js/pages/prism/catalog.js',
  './js/pages/prism/engine.js',
  './js/pages/prism/index.js',
  './js/pages/prism/mini.js',
  './js/pages/prism/renderers.js',
  './js/pages/prism/topics/graphs.js',
  './js/pages/prism/topics/linear.js',
  './js/pages/prism/topics/recursion-dp.js',
  './js/pages/prism/topics/sorting.js',
  './js/pages/prism/topics/trees.js',
  './js/pages/workspace.js',
  './js/runtime/cpp.worker.js',
  './js/runtime/html-checks.js',
  './js/runtime/js.worker.js',
  './js/runtime/python.worker.js',
  './js/runtime/pyvn.js',
  './js/runtime/runner.js',
  './js/runtime/sql.worker.js',
  './js/services/ai-client.js',
  './js/services/ai-modes.js',
  './js/services/auth.js',
  './js/services/classroom.js',
  './js/services/content.js',
  './js/services/conversations.js',
  './js/services/firebase.js',
  './js/services/local-ai.js',
  './js/services/progress.js',
];

const RUNTIME_HOSTS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'www.gstatic.com', 'esm.run'];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL_CACHE);
    // Add individually so one missing file doesn't abort the whole install.
    await Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch((err) => console.warn('[sw] precache skip', url, err?.message))));
    // Course files are discovered from the catalog.
    try {
      const idx = await (await fetch('./data/courses/index.json', { cache: 'reload' })).json();
      await Promise.all((idx.courses || []).map((c) => cache.add(`./data/courses/${c.id}.json`).catch(() => {})));
    } catch { /* offline install */ }
  })());
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, ASSET_CACHE, RUNTIME_CACHE]);
    for (const key of await caches.keys()) if (!keep.has(key) && key.startsWith('vcode-')) await caches.delete(key);
    await self.clients.claim();
  })());
});

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  // ignoreVary: servers often send "Vary: Origin" (CORS middleware); precached entries have no Origin,
  // while module imports do — without ignoreVary they would never match offline.
  const cached = await cache.match(request, { ignoreVary: true });
  const network = fetch(request).then((res) => {
    if (res && res.ok && res.type !== 'opaque') cache.put(request, res.clone()).catch(() => {});
    return res;
  }).catch(() => null);
  if (cached) { network.catch(() => {}); return cached; }
  const res = await network;
  if (res) return res;
  const shell = await caches.match(request, { ignoreSearch: true, ignoreVary: true });
  return shell || new Response('Offline', { status: 503, statusText: 'Offline' });
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) return cached;
  const res = await fetch(request);
  // Cache successful CORS/basic responses. Opaque responses are only accepted for version-pinned
  // scripts loaded via importScripts() in workers (e.g. Pyodide), which are always no-cors.
  const cacheable = res && ((res.ok && (res.type === 'basic' || res.type === 'cors')) || (res.type === 'opaque' && request.destination === 'script'));
  if (cacheable) cache.put(request, res.clone()).catch(() => {});
  return res;
}

async function networkFirstNavigation(request) {
  try {
    const res = await fetch(request);
    if (res && res.ok) {
      const cache = await caches.open(SHELL_CACHE);
      cache.put('./index.html', res.clone()).catch(() => {});
    }
    return res;
  } catch {
    return (await caches.match('./index.html', { ignoreVary: true })) || (await caches.match('./', { ignoreVary: true })) || new Response('<h1>Đang ngoại tuyến</h1>', { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Never cache API calls, auth/firestore channels or browser extensions.
  if (url.pathname.startsWith('/api/')) return;
  if (/googleapis\.com$/.test(url.hostname) && url.hostname !== 'fonts.googleapis.com') return;
  if (url.hostname.endsWith('firebaseio.com') || url.hostname.includes('identitytoolkit') || url.hostname.includes('securetoken')) return;
  if (!url.protocol.startsWith('http')) return;

  if (request.mode === 'navigate') { event.respondWith(networkFirstNavigation(request)); return; }

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(request, url.pathname.startsWith('/data/') || url.pathname.includes('/data/') ? ASSET_CACHE : SHELL_CACHE));
    return;
  }

  if (RUNTIME_HOSTS.includes(url.hostname)) {
    // Firebase SDK files from gstatic: only the versioned firebasejs path.
    if (url.hostname === 'www.gstatic.com' && !url.pathname.startsWith('/firebasejs/')) return;
    event.respondWith(cacheFirst(request, RUNTIME_CACHE).catch(() => caches.match(request, { ignoreVary: true }).then((r) => r || Response.error())));
  }
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});
