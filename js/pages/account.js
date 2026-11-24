// V-Code Edu — account: profile, security, appearance, AI & server settings, offline readiness, data.
import { h, mount } from '../core/dom.js';
import { icon } from '../components/icons.js';
import { appState, bus } from '../core/store.js';
import { toast, confirmDialog, downloadFile } from '../core/ui.js';
import { setTheme, getThemePreference } from '../core/theme.js';
import { getApiBase, setApiBase, PYODIDE_BASE, KATEX_BASE } from '../config.js';
import { refreshBackendStatus } from '../core/net.js';
import { firestore, changePassword, resetPassword, logout, hasPasswordProvider } from '../services/auth.js';
import { firebaseErrorMessage } from '../services/firebase.js';
import { getProgress, totalXp } from '../services/progress.js';
import { idb } from '../core/idb.js';
import { isWebGPUAvailable, onLocalStatus, loadLocalModel } from '../services/local-ai.js';
import { warmup } from '../runtime/runner.js';

const TABS = [
  ['profile', 'Hồ sơ', 'user'],
  ['security', 'Bảo mật', 'shield'],
  ['settings', 'Giao diện & AI', 'settings'],
  ['offline', 'Ngoại tuyến', 'wifi-off'],
  ['data', 'Dữ liệu', 'database'],
];

function section(title, desc, ...children) {
  return h('section', { class: 'card stack' }, h('div', null, h('h2', { class: 'section-title' }, title), desc ? h('p', { class: 'muted', style: 'margin-top:4px;font-size:var(--fs-sm)' }, desc) : null), ...children);
}

async function resizeImage(file, max = 160) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.82);
  } finally { URL.revokeObjectURL(url); }
}

export default {
  title: 'Tài khoản',
  async mount(container, ctx) {
    const { signal } = ctx;
    let tab = TABS.some((t) => t[0] === ctx.query.tab) ? ctx.query.tab : 'profile';
    const nav = h('nav', { class: 'account-nav', 'aria-label': 'Mục tài khoản' });
    const body = h('div', { class: 'account-body stack stack--lg' });

    function renderNav() {
      mount(nav, TABS.map(([id, label, ic]) => h('button', { class: `account-nav__item ${tab === id ? 'is-active' : ''}`, type: 'button', 'aria-current': tab === id ? 'page' : undefined, onClick: () => { tab = id; history.replaceState(null, '', `#/account?tab=${id}`); renderNav(); render(); } }, icon(ic), label)));
    }

    function needLogin(text) {
      return section('Bạn chưa đăng nhập', text, h('div', null, h('button', { class: 'btn btn--primary', type: 'button', onClick: async () => { const { openAuthDialog } = await import('../components/auth-dialog.js'); openAuthDialog(); } }, icon('login'), 'Đăng nhập / Tạo tài khoản')));
    }

    async function profileTab() {
      const user = appState.get().user;
      if (!user) return needLogin('Đăng nhập để lưu hồ sơ, đồng bộ tiến độ học và lịch sử trò chuyện AI giữa các thiết bị.');
      const progress = await getProgress();
      const name = h('input', { class: 'input', value: user.displayName, maxlength: 80 });
      const school = h('input', { class: 'input', value: user.school_name, maxlength: 120 });
      const klass = h('input', { class: 'input', value: user.class_name, maxlength: 40 });
      let avatar = user.photoURL;
      const avatarEl = h('div', { class: 'avatar avatar--lg' });
      const paintAvatar = () => mount(avatarEl, avatar ? h('img', { src: avatar, alt: '', style: 'width:100%;height:100%;object-fit:cover', referrerpolicy: 'no-referrer' }) : (user.displayName || '?')[0].toUpperCase());
      paintAvatar();
      const file = h('input', { type: 'file', accept: 'image/*', hidden: true, onChange: async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 8 * 1024 * 1024) { toast('Ảnh quá lớn (tối đa 8 MB).', { type: 'warning' }); return; }
        avatar = await resizeImage(f);
        paintAvatar();
      } });
      const roleLabel = { teacher: 'Giáo viên', student: 'Học sinh', admin: 'Quản trị', none: 'Chưa chọn' }[user.role || 'none'];
      return [
        section('Hồ sơ cá nhân', 'Thông tin hiển thị với giáo viên, bạn học và trên bảng xếp hạng.',
          h('div', { class: 'cluster' }, avatarEl, h('div', { class: 'stack stack--sm' },
            h('div', { class: 'cluster cluster--sm' }, h('button', { class: 'btn btn--sm', type: 'button', onClick: () => file.click() }, icon('upload'), 'Đổi ảnh'), avatar ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => { avatar = ''; paintAvatar(); } }, 'Xóa ảnh') : null),
            h('span', { class: 'field__hint' }, 'Ảnh được thu nhỏ còn 160×160 trước khi lưu.')), file),
          h('div', { class: 'field-row' },
            h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Họ và tên'), name),
            h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Email'), h('input', { class: 'input', value: user.email, disabled: true }))),
          h('div', { class: 'field-row' },
            h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Trường'), school),
            h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Lớp'), klass),
            h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Vai trò'), h('input', { class: 'input', value: roleLabel, disabled: true }), h('span', { class: 'field__hint' }, 'Vai trò được chọn một lần trong mục Lớp học.'))),
          h('div', null, h('button', { class: 'btn btn--primary', type: 'button', onClick: async (e) => {
            e.currentTarget.classList.add('is-loading');
            try {
              const { db, fs } = await firestore();
              await fs.updateDoc(fs.doc(db, 'users', user.key), { full_name: name.value.trim().slice(0, 80) || user.displayName, school_name: school.value.trim().slice(0, 120), class_name: klass.value.trim().slice(0, 40), avatar_url: avatar || '', updated_at: fs.serverTimestamp() });
              toast('Đã lưu hồ sơ.', { type: 'success' });
            } catch (err) { toast(firebaseErrorMessage(err), { type: 'error' }); } finally { e.currentTarget?.classList.remove('is-loading'); }
          } }, 'Lưu hồ sơ'))),
        section('Thành tích', null, h('div', { class: 'cluster', style: 'gap:40px' },
          h('div', { class: 'stat' }, h('span', { class: 'stat__value' }, String(totalXp(progress))), h('span', { class: 'stat__label' }, 'Tổng XP')),
          h('div', { class: 'stat' }, h('span', { class: 'stat__value' }, String(Object.keys(progress.lessons).length)), h('span', { class: 'stat__label' }, 'Bài học xong')),
          h('div', { class: 'stat' }, h('span', { class: 'stat__value' }, String(Object.keys(progress.challenges).length)), h('span', { class: 'stat__label' }, 'Thử thách đã vượt')))),
      ];
    }

    function securityTab() {
      const user = appState.get().user;
      if (!user) return needLogin('Đăng nhập để quản lý mật khẩu và phiên đăng nhập.');
      const cur = h('input', { class: 'input', type: 'password', autocomplete: 'current-password' });
      const next = h('input', { class: 'input', type: 'password', autocomplete: 'new-password', minlength: 6 });
      const again = h('input', { class: 'input', type: 'password', autocomplete: 'new-password' });
      const pwd = hasPasswordProvider();
      return [
        pwd ? section('Đổi mật khẩu', 'Vì lý do bảo mật, bạn cần nhập mật khẩu hiện tại.',
          h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Mật khẩu hiện tại'), cur),
          h('div', { class: 'field-row' }, h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Mật khẩu mới'), next), h('div', { class: 'field' }, h('label', { class: 'field__label' }, 'Nhập lại'), again)),
          h('div', null, h('button', { class: 'btn btn--primary', type: 'button', onClick: async (e) => {
            if (next.value !== again.value) { toast('Mật khẩu nhập lại không khớp.', { type: 'warning' }); return; }
            e.currentTarget.classList.add('is-loading');
            try { await changePassword(cur.value, next.value); cur.value = next.value = again.value = ''; toast('Đã đổi mật khẩu.', { type: 'success' }); } catch (err) { toast(err.message, { type: 'error' }); } finally { e.currentTarget?.classList.remove('is-loading'); }
          } }, 'Cập nhật mật khẩu')))
          : section('Đăng nhập bằng Google', 'Tài khoản của bạn dùng Google để đăng nhập nên không có mật khẩu riêng tại V-Code Edu.',
            h('div', null, h('button', { class: 'btn', type: 'button', onClick: async () => { try { await resetPassword(user.email); toast('Đã gửi email tạo mật khẩu (nếu được hỗ trợ).', { type: 'success' }); } catch (err) { toast(err.message, { type: 'error' }); } } }, icon('mail'), 'Gửi email đặt mật khẩu'))),
        section('Phiên đăng nhập', `Đang đăng nhập: ${user.email} (${user.provider === 'google.com' ? 'Google' : 'Email/mật khẩu'}). Phiên được lưu an toàn trên thiết bị này cho tới khi bạn đăng xuất.`,
          h('div', null, h('button', { class: 'btn btn--danger-soft', type: 'button', onClick: async () => { await logout(); toast('Đã đăng xuất.'); ctx.navigate('/'); } }, icon('logout'), 'Đăng xuất khỏi thiết bị này'))),
      ];
    }

    function settingsTab() {
      const pref = getThemePreference();
      const themeSeg = h('div', { class: 'segmented' }, [['light', 'Sáng', 'sun'], ['dark', 'Tối', 'moon'], ['system', 'Theo hệ thống', 'monitor']].map(([v, l, ic]) => h('button', { type: 'button', 'aria-pressed': String(pref === v), onClick: () => { setTheme(v); render(); } }, icon(ic), l)));
      const api = h('input', { class: 'input', value: getApiBase(), placeholder: 'http://localhost:8000' });
      const status = h('div');
      const paintStatus = () => {
        const b = appState.get().backend;
        mount(status, h('div', { class: `callout ${b.reachable ? 'callout--success' : 'callout--warning'}` }, icon(b.reachable ? 'check-circle' : 'alert'),
          h('div', null, b.reachable ? `Đã kết nối máy chủ${b.version ? ` (v${b.version})` : ''}. Nhà cung cấp AI khả dụng: ${(b.providers || []).filter((p) => p.available).map((p) => p.id).join(', ') || 'chưa có — quản trị viên cần cấu hình khóa API trên máy chủ'}.` : `Chưa kết nối được máy chủ tại ${getApiBase()}. AI đám mây sẽ không hoạt động cho tới khi máy chủ chạy.`)));
      };
      paintStatus();
      appState.subscribe((s, p) => { if (s.backend !== p.backend) paintStatus(); }, { signal });
      const localBox = h('div');
      const offLocal = onLocalStatus((st) => mount(localBox, h('div', { class: 'stack stack--sm' },
        h('p', { class: 'muted', style: 'font-size:var(--fs-sm)' }, isWebGPUAvailable() ? 'Trình duyệt hỗ trợ WebGPU — có thể chạy một mô hình AI nhỏ ngay trên máy, dùng được khi không có Internet (sau khi tải lần đầu, khoảng 0,4–1 GB).' : 'Trình duyệt này chưa hỗ trợ WebGPU nên không chạy được AI trên máy. Hãy dùng Chrome hoặc Edge bản mới trên máy tính.'),
        st.state === 'loading' ? h('div', { class: 'progress' }, h('span', { style: { width: `${st.progress}%` } })) : null,
        st.text ? h('p', { class: 'field__hint' }, st.text) : null,
        isWebGPUAvailable() && st.state !== 'ready' && st.state !== 'loading' ? h('div', null, h('button', { class: 'btn btn--ai', type: 'button', onClick: () => loadLocalModel().catch((e) => toast(e.message, { type: 'error' })) }, icon('download'), 'Tải AI trên trình duyệt')) : null)));
      signal.addEventListener('abort', offLocal);
      return [
        section('Giao diện', 'Áp dụng cho toàn bộ nền tảng, kể cả trình soạn thảo, trợ lý AI và Lăng kính thuật toán.', themeSeg),
        section('Máy chủ V-Code (AI & dịch vụ)', 'Mặc định dùng máy chủ cùng địa chỉ trang hoặc localhost:8000. Phòng máy có thể trỏ tới máy chủ trong mạng LAN (ví dụ http://192.168.1.10:8000) để dùng AI cục bộ không cần Internet.',
          h('div', { class: 'cluster cluster--sm' }, h('div', { class: 'grow', style: 'min-width:220px' }, api),
            h('button', { class: 'btn btn--primary', type: 'button', onClick: async () => { setApiBase(api.value.trim() || null); await refreshBackendStatus(); toast('Đã lưu địa chỉ máy chủ.', { type: 'success' }); } }, 'Lưu & kiểm tra'),
            h('button', { class: 'btn btn--ghost', type: 'button', onClick: async () => { setApiBase(null); api.value = getApiBase(); await refreshBackendStatus(); } }, 'Mặc định')),
          status),
        section('AI trên trình duyệt (tùy chọn)', null, localBox),
      ];
    }

    async function offlineTab() {
      const rows = h('div', { class: 'stack stack--sm' });
      const cacheNames = ('caches' in window) ? await caches.keys() : [];
      let usage = null;
      try { usage = await navigator.storage?.estimate?.(); } catch { /* ignore */ }
      const sw = 'serviceWorker' in navigator && navigator.serviceWorker.controller;
      const items = [
        ['Ứng dụng (giao diện, trang, dữ liệu khóa học)', sw ? 'Đã sẵn sàng offline' : 'Chưa kích hoạt (cần mở qua http://localhost hoặc HTTPS)', Boolean(sw)],
        ['Tiến độ học, bản nháp code, lịch sử chat', 'Lưu trên thiết bị (IndexedDB), đồng bộ khi có mạng', true],
        ['Chạy C / C++ / JavaScript / SQL / HTML', 'Luôn chạy được offline', true],
        ['Chạy Python', cacheNames.some((n) => n.includes('runtime')) ? 'Đã lưu bộ chạy Python nếu đã mở bài Python ít nhất một lần' : 'Cần tải một lần (~12 MB)', cacheNames.some((n) => n.includes('runtime'))],
        ['Đăng nhập, lớp học, bảng xếp hạng', 'Cần Internet; dữ liệu đã xem được lưu đệm và thay đổi được gửi lại khi có mạng', null],
        ['Trợ lý AI đám mây', 'Cần Internet (hoặc máy chủ AI cục bộ trong mạng LAN)', null],
      ];
      mount(rows, items.map(([t, d, ok]) => h('div', { class: 'offline-row' }, h('span', { class: `offline-row__icon ${ok === true ? 'is-ok' : ok === false ? 'is-warn' : ''}` }, icon(ok === true ? 'check-circle' : ok === false ? 'alert' : 'cloud')), h('div', null, h('strong', null, t), h('div', { class: 'muted', style: 'font-size:12px' }, d)))));
      const btn = h('button', { class: 'btn btn--primary', type: 'button', onClick: async () => {
        btn.classList.add('is-loading');
        try {
          warmup('python');
          const urls = [`${PYODIDE_BASE}pyodide.js`, `${PYODIDE_BASE}pyodide.asm.js`, `${PYODIDE_BASE}pyodide.asm.wasm`, `${PYODIDE_BASE}python_stdlib.zip`, `${PYODIDE_BASE}pyodide-lock.json`, `${KATEX_BASE}katex.min.js`, `${KATEX_BASE}katex.min.css`, 'data/challenges.json', 'data/courses/index.json'];
          try {
            const idx = await fetch('data/courses/index.json').then((r) => r.json());
            for (const c of idx.courses) urls.push(`data/courses/${c.id}.json`);
          } catch { /* offline */ }
          let ok = 0;
          await Promise.all(urls.map((u) => fetch(u, { mode: u.startsWith('http') ? 'cors' : 'same-origin' }).then((r) => { if (r.ok) ok += 1; }).catch(() => {})));
          toast(`Đã lưu ${ok}/${urls.length} tài nguyên để học offline.`, { type: ok ? 'success' : 'warning' });
          render();
        } finally { btn.classList.remove('is-loading'); }
      } }, icon('download'), 'Tải gói học offline');
      return [
        section('Sẵn sàng ngoại tuyến', 'V-Code Edu là ứng dụng web tiến bộ (PWA): sau khi mở một lần khi có mạng, bạn vẫn học, viết và chạy code khi mất Internet.', rows,
          h('div', { class: 'cluster' }, btn, usage ? h('span', { class: 'muted', style: 'font-size:12px' }, `Đang dùng ${(usage.usage / 1048576).toFixed(1)} MB bộ nhớ trình duyệt`) : null)),
      ];
    }

    async function dataTab() {
      return [
        section('Xuất dữ liệu của bạn', 'Tải về tiến độ học, bản nháp code và lịch sử trò chuyện AI lưu trên thiết bị này (định dạng JSON).',
          h('div', null, h('button', { class: 'btn', type: 'button', onClick: async () => {
            const [progress, drafts, conversations] = await Promise.all([getProgress(), idb.all('drafts'), idb.all('conversations')]);
            const me = appState.get().user?.key || 'guest';
            downloadFile(`vcode-edu-du-lieu-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exported_at: new Date().toISOString(), account: appState.get().user?.email || null, progress, drafts, conversations: conversations.filter((c) => c.owner === me && !c.deleted) }, null, 2), 'application/json');
          } }, icon('download'), 'Tải dữ liệu (JSON)'))),
        section('Xóa dữ liệu trên thiết bị', 'Xóa bản nháp code, lịch sử chat và bộ nhớ đệm trên máy này. Dữ liệu đã đồng bộ lên tài khoản không bị ảnh hưởng.',
          h('div', null, h('button', { class: 'btn btn--danger-soft', type: 'button', onClick: async () => {
            if (!(await confirmDialog({ title: 'Xóa dữ liệu cục bộ?', message: 'Bản nháp chưa đồng bộ và lịch sử chat chưa đăng nhập sẽ mất vĩnh viễn.', confirmLabel: 'Xóa', danger: true }))) return;
            await Promise.all([idb.clear('drafts'), idb.clear('conversations')]);
            if ('caches' in window) for (const k of await caches.keys()) if (k.includes('runtime')) await caches.delete(k);
            toast('Đã xóa dữ liệu cục bộ.');
            bus.emit('conversations:change');
          } }, icon('trash'), 'Xóa dữ liệu cục bộ'))),
      ];
    }

    async function render() {
      const map = { profile: profileTab, security: securityTab, settings: settingsTab, offline: offlineTab, data: dataTab };
      const content = await map[tab]();
      mount(body, content);
    }

    mount(container, h('div', { class: 'container page' },
      h('header', { class: 'page-header' }, h('div', null, h('span', { class: 'page-eyebrow' }, icon('user'), 'Tài khoản'), h('h1', { class: 'page-title' }, 'Hồ sơ & cài đặt'))),
      h('div', { class: 'account-layout' }, nav, body)));
    renderNav();
    await render();
    appState.subscribe((s, p) => { if (s.user !== p.user && (tab === 'profile' || tab === 'security')) render(); }, { signal });
  },
};
