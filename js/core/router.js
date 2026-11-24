// V-Code Edu — hash router with lazy page modules and per-page CSS.
//
// Page module contract (js/pages/*.js):
//   export default {
//     title: 'Tên trang' | (ctx) => string,
//     async mount(container, ctx) { ...; return optionalCleanupFn; }
//   }
//   ctx = { params, query, path, signal, navigate }
//   - `signal` is aborted when the user leaves the page: pass it to addEventListener / fetch / store.subscribe.
//   - Always render into `container`; never touch elements outside it except via shared services.

import { h, mount as mountEl } from './dom.js';
import { appState, bus } from './store.js';

const routes = [];
let current = null; // { route, controller, cleanup, path }
let outlet = null;
let navToken = 0;
const loadedCss = new Set();

/** Compile '/learn/:course/:lesson?' into a regex + param names. */
function compile(pattern) {
  const keys = [];
  const re = pattern
    .replace(/\/+$/, '')
    .replace(/\/:(\w+)(\?)?/g, (_, key, optional) => {
      keys.push(key);
      return optional ? '(?:/([^/]+))?' : '/([^/]+)';
    });
  return { regex: new RegExp(`^${re || ''}/?$`), keys };
}

/**
 * Register routes: [{ path, load: () => import('...'), css?: ['css/pages/x.css'], nav?: 'learn', title?: 'x', requiresAuth?: bool }]
 */
export function defineRoutes(list) {
  for (const r of list) routes.push({ ...r, ...compile(r.path) });
}

export function parseHash(hash = location.hash) {
  const raw = hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart = ''] = raw.split('?');
  const path = pathPart.startsWith('/') ? pathPart : `/${pathPart}`;
  const query = Object.fromEntries(new URLSearchParams(queryPart));
  return { path: decodeURI(path), query };
}

export function navigate(path, { replace = false } = {}) {
  const target = path.startsWith('#') ? path : `#${path.startsWith('/') ? path : `/${path}`}`;
  if (replace) {
    history.replaceState(null, '', target);
    handleRoute();
  } else if (location.hash === target) {
    handleRoute();
  } else {
    location.hash = target;
  }
}

export function currentPath() {
  return current?.path || parseHash().path;
}

function ensureCss(hrefs = []) {
  return Promise.all(hrefs.map((href) => {
    if (loadedCss.has(href)) return Promise.resolve();
    loadedCss.add(href);
    return new Promise((resolve) => {
      const link = h('link', { rel: 'stylesheet', href, onLoad: resolve, onError: resolve });
      document.head.appendChild(link);
    });
  }));
}

function match(path) {
  for (const route of routes) {
    const m = route.regex.exec(path);
    if (m) {
      const params = {};
      route.keys.forEach((k, i) => { if (m[i + 1] !== undefined) params[k] = decodeURIComponent(m[i + 1]); });
      return { route, params };
    }
  }
  return null;
}

async function handleRoute() {
  const token = ++navToken;
  const { path, query } = parseHash();
  const found = match(path) || match('/404');
  if (!found) return;
  const { route, params } = found;

  // Leave previous page
  if (current) {
    try { current.controller.abort(); } catch { /* noop */ }
    try { current.cleanup?.(); } catch (err) { console.error('[router] cleanup failed', err); }
  }
  const controller = new AbortController();
  current = { route, controller, cleanup: null, path };
  bus.emit('route:change', { path, nav: route.nav, params, query });

  const slowTimer = setTimeout(() => {
    if (token === navToken) mountEl(outlet, h('div', { class: 'route-loading' }, h('div', { class: 'spinner', 'aria-label': 'Đang tải' })));
  }, 160);

  try {
    const [mod] = await Promise.all([route.load(), ensureCss(route.css)]);
    if (token !== navToken) return; // user navigated again meanwhile
    clearTimeout(slowTimer);
    const page = mod.default;
    const ctx = { params, query, path, signal: controller.signal, navigate };
    const container = h('div', { class: `page-root page-root--${route.nav || 'default'}` });
    mountEl(outlet, container);
    outlet.classList.remove('is-entering');
    void outlet.offsetWidth;
    outlet.classList.add('is-entering');
    const title = typeof page.title === 'function' ? page.title(ctx) : (page.title || route.title);
    document.title = title ? `${title} · V-Code Edu` : 'V-Code Edu — Giáo dục · Công nghệ · Tương lai';
    if (!query.keepScroll) window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
    const cleanup = await page.mount(container, ctx);
    if (token === navToken && typeof cleanup === 'function') current.cleanup = cleanup;
    outlet.focus({ preventScroll: true });
    if (token === navToken) bus.emit('route:mounted', { path, nav: route.nav });
  } catch (err) {
    clearTimeout(slowTimer);
    console.error('[router] failed to load route', path, err);
    if (token !== navToken) return;
    bus.emit('route:mounted', { path, nav: route.nav, error: true });
    const offline = !appState.get().online;
    mountEl(outlet, h('div', { class: 'container page' },
      h('div', { class: 'empty-state' },
        h('h3', null, offline ? 'Trang này chưa có trong bộ nhớ offline' : 'Không tải được trang'),
        h('p', null, offline
          ? 'Bạn đang ngoại tuyến và trang này chưa từng được mở khi có mạng. Hãy kết nối Internet rồi thử lại.'
          : `Đã xảy ra lỗi: ${err?.message || err}`),
        h('button', { class: 'btn btn--primary', onClick: () => handleRoute() }, 'Thử lại'),
      )));
  }
}

export function startRouter(outletEl) {
  outlet = outletEl;
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
