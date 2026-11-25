// V-Code Edu — application bootstrap.
import { h, $, mount } from './core/dom.js';
import { appState, bus } from './core/store.js';
import { initTheme, cycleTheme, getThemePreference } from './core/theme.js';
import { initNetwork, refreshBackendStatus } from './core/net.js';
import { defineRoutes, startRouter, navigate } from './core/router.js';
import { toast, bindMenu } from './core/ui.js';
import { icon } from './components/icons.js';
import { initAuth, logout, firestore } from './services/auth.js';
import { initProgress, totalXp } from './services/progress.js';
import { initConversationSync } from './services/conversations.js';

const NAV = [
  { id: 'home', label: 'Trang chủ', href: '#/', icon: 'home' },
  { id: 'learn', label: 'Học', href: '#/learn', icon: 'book-open' },
  { id: 'challenges', label: 'Thử thách', href: '#/challenges', icon: 'trophy' },
  { id: 'prism', label: 'Lăng kính', href: '#/prism', icon: 'prism' },
  { id: 'workspace', label: 'IDE', href: '#/workspace', icon: 'terminal' },
  { id: 'ai', label: 'Trợ lý AI', href: '#/ai', icon: 'sparkles' },
  { id: 'classroom', label: 'Lớp học', href: '#/classroom', icon: 'school' },
];

const IDE_CSS = ['css/pages/ide.css', 'css/pages/flowchart.css', 'css/pages/scratch.css'];
const ARENA_CSS = ['css/pages/ide.css', 'css/pages/challenges.css'];
const CLASS_CSS = ['css/pages/classroom.css', 'css/pages/ide.css'];

defineRoutes([
  { path: '/', nav: 'home', load: () => import('./pages/home.js'), css: ['css/pages/home.css', 'css/pages/prism.css', 'css/pages/ide.css'] },
  { path: '/learn', nav: 'learn', load: () => import('./pages/learn.js'), css: ['css/pages/learn.css'] },
  { path: '/learn/:course', nav: 'learn', load: () => import('./pages/course.js'), css: ['css/pages/learn.css'] },
  { path: '/learn/:course/:lesson', nav: 'learn', app: true, load: () => import('./pages/lesson.js'), css: ['css/pages/ide.css', 'css/pages/learn.css'] },
  { path: '/challenges', nav: 'challenges', load: () => import('./pages/challenges.js'), css: ARENA_CSS },
  { path: '/challenges/:id', nav: 'challenges', app: true, load: () => import('./pages/challenge.js'), css: ARENA_CSS },
  { path: '/workspace', nav: 'workspace', app: true, load: () => import('./pages/workspace.js'), css: IDE_CSS },
  { path: '/prism/:topic?/:algo?', nav: 'prism', load: () => import('./pages/prism/index.js'), css: ['css/pages/prism.css'] },
  { path: '/ai/:conversation?', nav: 'ai', app: true, load: () => import('./pages/ai.js'), css: ['css/pages/ai.css'] },
  { path: '/classroom', nav: 'classroom', load: () => import('./pages/classroom.js'), css: CLASS_CSS },
  { path: '/classroom/:code', nav: 'classroom', load: () => import('./pages/classroom.js'), css: CLASS_CSS },
  { path: '/join/:code', nav: 'classroom', load: () => import('./pages/classroom.js'), css: CLASS_CSS },
  { path: '/account', nav: 'account', load: () => import('./pages/account.js'), css: ['css/pages/account.css'] },
  { path: '/404', nav: 'none', load: () => import('./pages/not-found.js') },
]);

// ---------- Shell: navigation ----------
let indicator = null;
const DRAWER_ITEMS = {
  home: { label: 'Trang chủ 3D', sub: 'Khám phá hệ sinh thái V-Code Edu' },
  learn: { label: 'Khóa học', sub: 'Python, Python Tiếng Việt, Web, C, C++, AI' },
  challenges: { label: 'Đấu trường thử thách', sub: '100 chặng · bảng xếp hạng · huy hiệu' },
  prism: { label: 'Lăng kính thuật toán', sub: '14 chủ đề trực quan từng bước' },
  workspace: { label: 'IDE · Lưu đồ · Scratch Live', sub: '7 ngôn ngữ, chạy ngay trên trình duyệt', badge: 'LIVE' },
  ai: { label: 'Trợ lý AI V-Mentor', sub: '7 chế độ học cùng AI' },
  classroom: { label: 'Lớp học trực tuyến', sub: 'Giao bài, nộp bài, chấm điểm' },
};
let drawerAccount = null;
function renderNav() {
  const links = $('[data-nav-links]');
  const drawer = $('[data-mobile-drawer]');
  const make = (item) => h('a', { class: 'navlink', href: item.href, dataset: { nav: item.id } }, icon(item.icon), item.label);
  indicator = h('span', { class: 'nav-indicator', 'aria-hidden': 'true', hidden: true });
  mount(links, indicator, NAV.map(make));
  drawerAccount = h('div', { class: 'drawer__group' });
  mount(drawer,
    h('div', { class: 'drawer__head' },
      h('span', { class: 'drawer__logo' }, h('img', { src: 'assets/logo-640.jpg', alt: '', width: 72, height: 72 })),
      h('strong', null, 'V-Code Edu'),
      h('span', null, 'Nền tảng Học lập trình Việt Nam'),
      h('button', { class: 'drawer__close', type: 'button', 'aria-label': 'Đóng menu', dataset: { drawerClose: '' } }, icon('x'))),
    h('div', { class: 'drawer__section' }, h('div', { class: 'drawer__label' }, 'Quản lí tài khoản'), drawerAccount),
    h('div', { class: 'drawer__section' },
      h('div', { class: 'drawer__label' }, 'Không gian học tập'),
      h('div', { class: 'drawer__group' }, NAV.map((item) => {
        const meta = DRAWER_ITEMS[item.id] || { label: item.label, sub: '' };
        return h('a', { class: 'navlink drawer__item', href: item.href, dataset: { nav: item.id } },
          h('span', { class: 'drawer__icon' }, icon(item.icon)),
          h('span', { class: 'drawer__text' }, h('strong', null, meta.label), meta.sub ? h('small', null, meta.sub) : null),
          meta.badge ? h('span', { class: 'drawer__badge' }, meta.badge) : null,
          h('span', { class: 'drawer__arrow' }, icon('arrow-right')));
      }))),
    h('div', { class: 'drawer__foot' },
      h('button', { class: 'drawer__theme', type: 'button', onClick: () => $('[data-theme-toggle]').click() }, icon('moon'), 'Đổi giao diện sáng / tối'),
      h('span', null, 'Phiên bản 3.1 · GIÁO DỤC · CÔNG NGHỆ · TƯƠNG LAI')));
  renderDrawerAccount();
}

function renderDrawerAccount() {
  if (!drawerAccount) return;
  const { user } = appState.get();
  if (!user) {
    mount(drawerAccount,
      h('button', { class: 'drawer__btn drawer__btn--primary', type: 'button', onClick: async () => {
        const { openAuthDialog } = await import('./components/auth-dialog.js');
        openAuthDialog();
      } }, icon('login'), 'Đăng nhập / Đăng ký'),
      h('a', { class: 'drawer__btn', href: '#/account' }, icon('settings'), 'Cài đặt & chế độ offline'));
    return;
  }
  mount(drawerAccount,
    h('div', { class: 'drawer__user' },
      user.photoURL ? h('img', { class: 'avatar', src: user.photoURL, alt: '', referrerpolicy: 'no-referrer' }) : h('span', { class: 'avatar' }, (user.displayName || '?').trim()[0]?.toUpperCase() || '?'),
      h('div', null, h('strong', { class: 'truncate' }, user.displayName), h('small', { class: 'truncate' }, user.email))),
    h('a', { class: 'drawer__btn', href: '#/account' }, icon('user'), 'Hồ sơ & Thông tin cá nhân'),
    h('button', { class: 'drawer__btn drawer__btn--danger', type: 'button', onClick: async () => {
      await logout();
      toast('Đã đăng xuất. Hẹn gặp lại!', { type: 'info' });
    } }, icon('logout'), 'Đăng xuất tài khoản'));
}

function moveIndicator() {
  if (!indicator) return;
  const active = $('[data-nav-links] .navlink.is-active');
  if (!active || !active.offsetParent) { indicator.hidden = true; return; }
  indicator.hidden = false;
  indicator.style.setProperty('--x', `${active.offsetLeft}px`);
  indicator.style.width = `${active.offsetWidth}px`;
}

function setActiveNav(navId) {
  document.querySelectorAll('[data-nav]').forEach((a) => {
    const active = a.dataset.nav === navId;
    a.classList.toggle('is-active', active);
    if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  moveIndicator();
}

function initBurger() {
  const btn = $('[data-burger]');
  const drawer = $('[data-mobile-drawer]');
  const backdrop = h('div', { class: 'drawer-backdrop', 'aria-hidden': 'true' });
  document.body.appendChild(backdrop);
  const set = (open) => {
    drawer.classList.toggle('is-open', open);
    backdrop.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
    if (open) setTimeout(() => drawer.querySelector('[data-drawer-close]')?.focus(), 50);
  };
  btn.addEventListener('click', () => set(!drawer.classList.contains('is-open')));
  backdrop.addEventListener('click', () => set(false));
  drawer.addEventListener('click', (e) => { if (e.target.closest('a, [data-drawer-close], .drawer__btn--danger, .drawer__btn--primary')) set(false); });
  bus.on('route:change', () => set(false));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
}

function renderThemeToggle() {
  const btn = $('[data-theme-toggle]');
  const pref = getThemePreference();
  const labels = { light: 'Giao diện sáng', dark: 'Giao diện tối', system: 'Theo hệ thống' };
  mount(btn, icon(pref === 'light' ? 'sun' : pref === 'dark' ? 'moon' : 'monitor'));
  btn.title = `${labels[pref]} — bấm để đổi`;
  btn.setAttribute('aria-label', `${labels[pref]}. Bấm để đổi giao diện`);
}

let accountMenuAbort = null;
function renderAccount() {
  const slot = $('[data-account-slot]');
  const { user, authReady } = appState.get();
  accountMenuAbort?.abort();
  accountMenuAbort = new AbortController();
  if (!authReady) { mount(slot, h('div', { class: 'skeleton', style: 'width:96px;height:36px;border-radius:999px' })); return; }
  if (!user) {
    mount(slot, h('button', { class: 'btn login-btn', type: 'button', onClick: async () => {
      const { openAuthDialog } = await import('./components/auth-dialog.js');
      openAuthDialog();
    } }, icon('login'), h('span', null, 'Đăng nhập')));
    return;
  }
  const initials = (user.displayName || user.email || '?').trim().split(/\s+/).map((w) => w[0]).slice(-2).join('').toUpperCase();
  const avatar = user.photoURL
    ? h('img', { class: 'avatar', src: user.photoURL, alt: '', referrerpolicy: 'no-referrer' })
    : h('span', { class: 'avatar', 'aria-hidden': 'true' }, initials);
  const roleLabel = { teacher: 'Giáo viên', student: 'Học sinh', admin: 'Quản trị' }[user.role];
  const menu = h('div', { class: 'menu' },
    h('button', { class: 'account-btn', type: 'button', 'data-menu-trigger': '', 'aria-haspopup': 'menu', 'aria-expanded': 'false' },
      avatar, h('span', { class: 'account-btn__name truncate' }, user.displayName)),
    h('div', { class: 'menu__panel', role: 'menu' },
      h('div', { class: 'menu__head' },
        h('div', { style: 'font-weight:700' }, user.displayName),
        h('div', { class: 'muted truncate', style: 'font-size:12px' }, user.email),
        roleLabel ? h('span', { class: 'badge badge--brand role-chip', style: 'margin-top:6px' }, roleLabel) : null),
      h('div', { class: 'menu__sep' }),
      h('a', { class: 'menu__item', href: '#/account', role: 'menuitem' }, icon('user'), 'Hồ sơ & cài đặt'),
      h('a', { class: 'menu__item', href: '#/learn', role: 'menuitem' }, icon('book-open'), 'Tiến độ học tập'),
      h('a', { class: 'menu__item', href: '#/classroom', role: 'menuitem' }, icon('school'), 'Lớp học của tôi'),
      h('a', { class: 'menu__item', href: '#/ai', role: 'menuitem' }, icon('history'), 'Lịch sử trò chuyện AI'),
      h('div', { class: 'menu__sep' }),
      h('button', { class: 'menu__item', type: 'button', role: 'menuitem', onClick: async () => {
        await logout();
        toast('Đã đăng xuất. Hẹn gặp lại!', { type: 'info' });
      } }, icon('logout'), 'Đăng xuất'),
    ));
  mount(slot, menu);
  bindMenu(menu, accountMenuAbort.signal);
  requestAnimationFrame(moveIndicator);
}

// ---------- Connection status (online / offline / syncing) ----------
let syncing = false;
function statusInfo() {
  const { online, user } = appState.get();
  if (!online) return { state: 'offline', text: 'Ngoại tuyến', sub: '· Lưu trên máy' };
  if (syncing) return { state: 'syncing', text: 'Đang đồng bộ', sub: '…' };
  return user ? { state: 'online', text: 'Online', sub: '· Đồng bộ Cloud' } : { state: 'online', text: 'Online', sub: '· Chế độ khách' };
}

function renderStatus() {
  const pill = $('[data-net-pill]');
  const info = statusInfo();
  pill.dataset.state = info.state;
  $('[data-status-text]').textContent = info.text;
  $('[data-status-sub]').textContent = info.sub;
  pill.title = info.state === 'offline'
    ? 'Bạn đang ngoại tuyến — bài học, IDE và tiến độ vẫn hoạt động; dữ liệu sẽ đồng bộ khi có mạng'
    : 'Trạng thái kết nối & đồng bộ';
  pill.setAttribute('aria-label', `${info.text} ${info.sub.replace('·', '')}`.trim());
  if ($('[data-status]').classList.contains('is-open')) renderStatusPanel();
}

function renderStatusPanel() {
  const { online, user, backend } = appState.get();
  const sw = Boolean(navigator.serviceWorker?.controller);
  const row = (ic, label, val, ok) => h('div', { class: 'status-row' }, icon(ic), h('span', { class: 'status-row__label' }, label), h('span', { class: 'status-row__val', dataset: { ok } }, val));
  const providers = (backend?.providers || []).filter((p) => (typeof p === 'string' ? true : p?.available));
  mount($('[data-status-panel]'),
    h('div', { class: 'status-panel__title' }, icon(online ? 'wifi' : 'wifi-off'), online ? 'Đang trực tuyến' : 'Đang ngoại tuyến'),
    h('p', { class: 'status-panel__lead' }, online
      ? (user ? 'Tiến độ, bản nháp và lịch sử trò chuyện được đồng bộ lên đám mây theo tài khoản của bạn.' : 'Bạn đang dùng chế độ khách: tiến độ lưu trên thiết bị này. Đăng nhập để đồng bộ giữa các máy.')
      : 'Bài học, IDE, Lăng kính và tiến độ vẫn hoạt động. Mọi thay đổi được lưu trên máy và tự đồng bộ khi có mạng trở lại.'),
    row('globe', 'Internet', online ? 'Đã kết nối' : 'Mất kết nối', online ? '1' : '0'),
    row('cloud', 'Đồng bộ đám mây', !user ? 'Chưa đăng nhập' : !online ? 'Tạm dừng' : syncing ? 'Đang đồng bộ…' : 'Đã đồng bộ', !user ? '-' : online && !syncing ? '1' : '0'),
    row('sparkles', 'Máy chủ AI', backend?.reachable ? (providers.length ? `Sẵn sàng (${providers.length})` : 'Chưa cấu hình khóa') : 'Không kết nối được', backend?.reachable ? (providers.length ? '1' : '0') : '0'),
    row('download', 'Chế độ offline', sw ? 'Sẵn sàng' : 'Chưa kích hoạt', sw ? '1' : '-'),
    h('div', { class: 'status-panel__actions' },
      h('button', { class: 'btn btn--sm', type: 'button', onClick: async (e) => {
        e.currentTarget.classList.add('is-loading');
        await refreshBackendStatus();
        renderStatusPanel();
      } }, icon('refresh'), 'Kiểm tra lại'),
      h('a', { class: 'btn btn--sm btn--ghost', href: '#/account?tab=offline' }, icon('settings'), 'Cài đặt offline')));
}

async function syncAfterReconnect() {
  if (!appState.get().user) return;
  syncing = true;
  renderStatus();
  try {
    const { db, fs } = await firestore();
    await Promise.race([fs.waitForPendingWrites(db), new Promise((r) => setTimeout(r, 15000))]);
  } catch { /* offline again or Firebase unavailable — the pill shows the real network state */ }
  syncing = false;
  renderStatus();
}

// ---------- XP chip ----------
let lastXp = null;
function renderXp(progress) {
  const chip = $('[data-xp-chip]');
  const xp = Math.round(totalXp(progress));
  chip.hidden = xp <= 0;
  $('[data-xp-value]').textContent = xp.toLocaleString('vi-VN');
  if (lastXp !== null && xp > lastXp) { chip.classList.remove('is-bump'); void chip.offsetWidth; chip.classList.add('is-bump'); }
  lastXp = xp;
}

// ---------- Micro-interactions ----------
function initRipples() {
  document.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('.btn, .chip, .auth-submit, .auth-google');
    if (!btn || btn.disabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const r = btn.getBoundingClientRect();
    const size = Math.max(r.width, r.height) * 2.2;
    const ripple = h('span', { class: 'ripple', style: { width: `${size}px`, height: `${size}px`, left: `${e.clientX - r.left - size / 2}px`, top: `${e.clientY - r.top - size / 2}px` } });
    btn.classList.add('has-ripple');
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => { ripple.remove(); if (!btn.querySelector('.ripple')) btn.classList.remove('has-ripple'); });
  }, { passive: true });
}

function initScrollState() {
  let raf = 0;
  const update = () => { raf = 0; document.documentElement.classList.toggle('is-scrolled', window.scrollY > 24); };
  window.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(update); }, { passive: true });
  bus.on('route:change', () => requestAnimationFrame(update));
  update();
}

function initRouteProgress() {
  const bar = $('.route-progress');
  let doneTimer = 0;
  bus.on('route:change', () => {
    clearTimeout(doneTimer);
    bar.classList.remove('is-done');
    bar.classList.add('is-active');
  });
  bus.on('route:mounted', () => {
    bar.classList.add('is-done');
    doneTimer = setTimeout(() => bar.classList.remove('is-active', 'is-done'), 600);
  });
}

// ---------- Service worker ----------
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) return;
  navigator.serviceWorker.register('sw.js').then((reg) => {
    reg.addEventListener('updatefound', () => {
      const worker = reg.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          toast('Đã có phiên bản mới của V-Code Edu.', { duration: 0, action: { label: 'Tải lại', onClick: () => location.reload() } });
        }
      });
    });
  }).catch((err) => console.warn('[sw] registration failed', err));
}

// ---------- Boot ----------
function boot() {
  initTheme();
  initNetwork();
  renderNav();
  initBurger();
  renderThemeToggle();
  renderAccount();
  renderStatus();
  initRipples();
  initScrollState();
  initRouteProgress();
  bindMenu($('[data-status]'));
  $('[data-net-pill]').addEventListener('click', () => renderStatusPanel());
  $('[data-year]').textContent = String(new Date().getFullYear());

  $('[data-theme-toggle]').addEventListener('click', (e) => {
    const next = cycleTheme();
    const btn = e.currentTarget;
    btn.classList.remove('is-spinning');
    void btn.offsetWidth;
    btn.classList.add('is-spinning');
    const labels = { light: 'Giao diện sáng', dark: 'Giao diện tối', system: 'Giao diện theo hệ thống' };
    toast(labels[next], { duration: 1600 });
  });
  bus.on('theme:change', renderThemeToggle);

  appState.subscribe((s, prev) => {
    if (s.user !== prev.user || s.authReady !== prev.authReady) { renderAccount(); renderDrawerAccount(); }
    if (s.online !== prev.online || s.user !== prev.user || s.backend !== prev.backend) renderStatus();
  });
  bus.on('progress:change', renderXp);
  bus.on('net:offline', () => toast('Mất kết nối Internet. Bạn vẫn có thể học, viết và chạy code offline — dữ liệu được lưu trên máy.', { type: 'warning' }));
  bus.on('net:online', () => {
    toast('Đã kết nối lại. Dữ liệu đang được đồng bộ.', { type: 'success', duration: 2500 });
    initAuth();
    syncAfterReconnect();
  });
  bus.on('auth:error', (msg) => toast(msg, { type: 'error' }));
  bus.on('auth:migrated', () => toast('Tài khoản cũ của bạn đã được nâng cấp lên Firebase Authentication an toàn.', { type: 'success', duration: 6000 }));
  bus.on('auth:profile-denied', () => toast('Không đọc được hồ sơ trên máy chủ (quyền truy cập). Hãy đảm bảo firestore.rules đã được triển khai.', { type: 'warning', duration: 8000 }));

  bus.on('route:change', ({ nav, path }) => {
    setActiveNav(nav);
    document.documentElement.dataset.section = nav || 'none';
    const route = path || '/';
    const appPage = /^\/(workspace|ai)(\/|$)/.test(route) || /^\/learn\/[^/]+\/[^/]+/.test(route) || /^\/challenges\/[^/]+/.test(route);
    document.body.classList.toggle('is-app-page', appPage);
    $('[data-footer]').hidden = false;
  });
  window.addEventListener('resize', moveIndicator, { passive: true });
  document.fonts?.ready.then(moveIndicator);

  startRouter($('#app-main'));
  initAuth();
  initProgress();
  initConversationSync();
  registerServiceWorker();
  window.addEventListener('load', () => document.documentElement.classList.add('is-loaded'));
  // Floating V-Mentor robot (every page; draggable; opens the AI quick-chat)
  import('./components/vbot.js').then((m) => m.initVBot()).catch((err) => console.warn('[vbot] unavailable', err?.message));
}

boot();

// Expose a tiny debug handle for e2e tests (no secrets).
window.__vcode = { appState, navigate, version: '3.1.1' };
