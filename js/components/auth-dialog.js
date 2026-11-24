// V-Code Edu — sign-in / sign-up / password-reset dialog (Firebase Authentication).
//
// Visual identity restored from the legacy app (v2.5 "OLM" auth box): a two-column card with an
// illustrated indigo welcome panel on the left and a clean white form on the right, orange primary
// action, Google button, "Ghi nhớ đăng nhập" and "Quên mật khẩu?".
//
// Error handling is diagnostic, not cosmetic: errors carry the Firebase `code` and the dialog offers the
// concrete fix (e.g. enabling the Email/Password provider, opening the app on an authorized domain).
import { h, s, mount } from '../core/dom.js';
import { openModal, toast } from '../core/ui.js';
import { icon } from './icons.js';
import { login, register, loginWithGoogle, resetPassword, setRememberMe, getRememberMe } from '../services/auth.js';
import { appState } from '../core/store.js';
import { FIREBASE_CONFIG } from '../config.js';

const CONSOLE = `https://console.firebase.google.com/project/${FIREBASE_CONFIG.projectId}/authentication`;
const COPY = {
  login: { title: 'Đăng nhập V-Code Edu', sub: 'Đăng nhập bằng tài khoản Google hoặc Email của bạn' },
  register: { title: 'Tạo tài khoản miễn phí', sub: 'Chỉ mất 30 giây — tiến độ học được lưu và đồng bộ mọi thiết bị' },
  reset: { title: 'Khôi phục mật khẩu', sub: 'Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu' },
};

let cssPromise = null;
function ensureCss() {
  if (!cssPromise) {
    cssPromise = new Promise((resolve) => {
      if (document.querySelector('link[data-auth-css]')) { resolve(); return; }
      const link = h('link', { rel: 'stylesheet', href: 'css/auth.css', dataset: { authCss: '' }, onLoad: resolve, onError: resolve });
      document.head.appendChild(link);
    });
  }
  return cssPromise;
}

/** Real catalogue numbers for the welcome panel (falls back to neutral wording offline). */
async function loadStats() {
  try {
    const [{ loadCatalog, loadChallenges }] = await Promise.all([import('../services/content.js')]);
    const [cat, ch] = await Promise.all([loadCatalog(), loadChallenges()]);
    const lessons = cat.courses.reduce((n, c) => n + (c.lessons_count || 0), 0);
    return { courses: cat.courses.length, lessons, challenges: (ch.challenges || []).length };
  } catch { return null; }
}

function passwordStrength(pw) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const level = pw.length < 6 ? 0 : Math.min(4, Math.max(1, score - 1));
  return { level, label: ['Quá ngắn', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'][level] };
}

/** Floating "glass" decoration for the welcome panel — pure CSS 3D, no images. */
function artDecor() {
  return h('div', { class: 'auth-art__decor', 'aria-hidden': 'true' },
    h('div', { class: 'auth-cube auth-cube--a' }, ...['f', 'b', 'l', 'r', 't', 'd'].map((f) => h('span', { class: `auth-cube__${f}` }))),
    h('div', { class: 'auth-cube auth-cube--b' }, ...['f', 'b', 'l', 'r', 't', 'd'].map((f) => h('span', { class: `auth-cube__${f}` }))),
    h('div', { class: 'auth-orb auth-orb--1' }),
    h('div', { class: 'auth-orb auth-orb--2' }),
    s('svg', { class: 'auth-orbit', viewBox: '0 0 400 400' },
      s('ellipse', { cx: 200, cy: 200, rx: 190, ry: 70, transform: 'rotate(-18 200 200)' }),
      s('ellipse', { cx: 200, cy: 200, rx: 150, ry: 46, transform: 'rotate(24 200 200)' })),
    h('span', { class: 'auth-glyph auth-glyph--1' }, '{ }'),
    h('span', { class: 'auth-glyph auth-glyph--2' }, '</>'),
    h('span', { class: 'auth-glyph auth-glyph--3' }, 'def'),
  );
}

/** Open the auth dialog. mode: 'login' | 'register' | 'reset'. Resolves with the user or null. */
export function openAuthDialog({ mode = 'login', reason, redirectTo } = {}) {
  ensureCss();
  return new Promise((resolve) => {
    let state = mode;
    let modal;
    let busy = false;
    const is127 = location.hostname === '127.0.0.1';

    // ---------- welcome panel (left) ----------
    const cardsHost = h('div', { class: 'auth-art__cards' });
    const miniCard = (ic, title, text) => h('div', { class: 'auth-mini' }, h('span', { class: 'auth-mini__icon' }, icon(ic)), h('div', null, h('strong', null, title), h('span', null, text)));
    const renderCards = (st) => mount(cardsHost,
      miniCard('book-open', st ? `${st.lessons} bài học chuẩn hóa` : 'Bài học chuẩn hóa', 'Python, Python Tiếng Việt, HTML/CSS, C, C++, AI'),
      miniCard('school', 'Lớp học trực tuyến V-Code', 'Giao bài, theo dõi & chấm điểm trực tiếp'),
      miniCard('trophy', st ? `${st.challenges} chặng thử thách & AI` : 'Đấu trường thử thách & AI', 'Học lập trình thú vị như chơi game'));
    renderCards(null);
    loadStats().then((st) => { if (st) renderCards(st); });

    const art = h('aside', { class: 'auth-art' },
      artDecor(),
      h('div', { class: 'auth-art__head' },
        h('div', { class: 'auth-art__hello' }, 'Chào mừng bạn tới'),
        h('div', { class: 'auth-art__brand' },
          h('img', { src: 'assets/logo-640.jpg', alt: '', width: 64, height: 64 }),
          h('div', null, h('div', { class: 'auth-art__name' }, 'V-Code Edu'), h('div', { class: 'auth-art__tag' }, 'Nền tảng Lập trình Giáo dục Việt Nam')))),
      cardsHost,
      h('div', { class: 'auth-art__foot' }, h('span', null, 'THCS & THPT Hòa Phú'), h('span', null, icon('shield'), 'Bảo mật bởi Firebase')),
    );

    // ---------- form panel (right) ----------
    const heading = h('h2', { class: 'auth-panel__title', id: 'auth-title' });
    const sub = h('p', { class: 'auth-panel__sub' });
    const view = h('div', { class: 'auth-view' });
    const closeBtn = h('button', { type: 'button', class: 'auth-close', 'aria-label': 'Đóng', onClick: () => modal.close(null) }, icon('x'));
    const panel = h('section', { class: 'auth-panel' },
      closeBtn,
      h('div', { class: 'auth-panel__top' },
        h('a', { href: '#/', class: 'auth-panel__home', onClick: () => modal.close(null) }, icon('home'), 'V-Code Edu'),
        h('span', { class: 'auth-panel__safe' }, icon('lock'), 'Bảo mật & An toàn')),
      heading, sub, view);

    const shell = h('div', { class: 'auth-shell' }, art, panel);

    // ---------- helpers ----------
    function inputRow({ id, type = 'text', ic, placeholder, autocomplete, required = true, minlength, maxlength, label }) {
      const input = h('input', { id, class: 'auth-input__field', type, placeholder, autocomplete, required: required || undefined, minlength, maxlength, 'aria-label': label || placeholder });
      let toggle = null;
      if (type === 'password') {
        toggle = h('button', { type: 'button', class: 'auth-input__eye', 'aria-label': 'Hiện mật khẩu', 'aria-pressed': 'false', onClick: () => {
          const show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          toggle.setAttribute('aria-pressed', String(show));
          toggle.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
          mount(toggle, icon(show ? 'eye-off' : 'eye'));
          input.focus();
        } }, icon('eye'));
      }
      const caps = type === 'password' ? h('span', { class: 'auth-input__caps', hidden: true }, 'Caps Lock đang bật') : null;
      if (caps) {
        const check = (e) => { if (e.getModifierState) caps.hidden = !e.getModifierState('CapsLock'); };
        input.addEventListener('keydown', check);
        input.addEventListener('keyup', check);
      }
      const row = h('label', { class: 'auth-input', for: id }, h('span', { class: 'auth-input__icon' }, icon(ic)), input, toggle);
      return { row: caps ? h('div', null, row, caps) : row, input };
    }

    function googleButton(label = 'Tiếp tục với Google') {
      const btn = h('button', { type: 'button', class: 'auth-google', onClick: async () => {
        if (busy) return;
        busy = true;
        btn.classList.add('is-loading');
        showMessage(null);
        try {
          await setRememberMe(remember.checked);
          const u = await loginWithGoogle();
          if (u) done(u, 'Đăng nhập Google thành công.');
        } catch (err) { showMessage(err); } finally { busy = false; btn.classList.remove('is-loading'); }
      } }, h('span', { class: 'auth-google__g' }, icon('google')), label);
      return btn;
    }

    const msgBox = h('div', { class: 'auth-msg', 'aria-live': 'polite' });
    const remember = h('input', { type: 'checkbox', class: 'auth-check__box', checked: getRememberMe() || undefined });

    function done(user, text) {
      toast(text, { type: 'success' });
      modal.close(user);
      if (redirectTo) location.hash = redirectTo;
    }

    function helpBlock({ title, body, steps = [], actions = [] }) {
      return h('div', { class: 'auth-help', role: 'alert' },
        h('div', { class: 'auth-help__title' }, icon('alert'), title),
        body ? h('p', null, body) : null,
        steps.length ? h('ol', null, steps.map((st) => h('li', null, st))) : null,
        actions.length ? h('div', { class: 'auth-help__actions' }, actions) : null);
    }

    function showMessage(err, kind = 'error') {
      if (!err) { mount(msgBox); return; }
      if (kind === 'success') { mount(msgBox, h('div', { class: 'auth-note auth-note--ok', role: 'status' }, icon('check-circle'), h('span', null, err))); return; }
      const code = err.code || '';
      if (code === 'auth/operation-not-allowed') {
        mount(msgBox, helpBlock({
          title: state === 'register' ? 'Đăng ký bằng email chưa được bật cho dự án' : 'Đăng nhập bằng email chưa được bật cho dự án',
          body: 'Phiên bản cũ chỉ dùng Firebase cho đăng nhập Google, còn mật khẩu email được so khớp ngay trong cơ sở dữ liệu (không an toàn). Phiên bản mới dùng Firebase Authentication, nên quản trị viên cần bật phương thức Email/Password một lần:',
          steps: ['Mở Firebase Console → Authentication → Sign-in method.', 'Chọn Email/Password → bật Enable → Save.', 'Quay lại đây và đăng nhập bằng mật khẩu cũ — tài khoản cũ được nâng cấp tự động, dữ liệu giữ nguyên.'],
          actions: [
            h('a', { class: 'auth-btn auth-btn--ghost', href: `${CONSOLE}/providers`, target: '_blank', rel: 'noopener' }, icon('external'), 'Mở Firebase Console'),
            googleButton('Dùng Google ngay'),
          ],
        }));
        return;
      }
      if (code === 'auth/unauthorized-domain') {
        const localUrl = location.href.replace('//127.0.0.1', '//localhost');
        mount(msgBox, helpBlock({
          title: `Tên miền “${location.hostname}” chưa được Firebase cho phép`,
          body: is127 ? 'Firebase mặc định cho phép “localhost” chứ không phải “127.0.0.1”. Mở lại trang bằng localhost là đăng nhập được ngay.' : 'Quản trị viên cần thêm tên miền này vào danh sách được phép:',
          steps: is127 ? [] : ['Firebase Console → Authentication → Settings → Authorized domains.', `Bấm “Add domain”, nhập ${location.hostname} rồi lưu.`],
          actions: [is127
            ? h('a', { class: 'auth-btn auth-btn--primary', href: localUrl }, icon('external'), 'Mở bằng localhost')
            : h('a', { class: 'auth-btn auth-btn--ghost', href: `${CONSOLE}/settings`, target: '_blank', rel: 'noopener' }, icon('external'), 'Mở cài đặt Firebase')],
        }));
        return;
      }
      if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-login-credentials'].includes(code)) {
        mount(msgBox, h('div', { class: 'auth-note auth-note--err', role: 'alert' }, icon('x-circle'),
          h('span', null, err.message, ' ', h('button', { type: 'button', class: 'auth-link', onClick: () => go('reset') }, 'Quên mật khẩu?'))));
        return;
      }
      if (code === 'auth/email-already-in-use' || code === 'app/legacy-account-exists') {
        mount(msgBox, h('div', { class: 'auth-note auth-note--err', role: 'alert' }, icon('info'),
          h('span', null, err.message, ' ', h('button', { type: 'button', class: 'auth-link', onClick: () => go('login') }, 'Chuyển sang đăng nhập'))));
        return;
      }
      const soft = code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
      mount(msgBox, h('div', { class: `auth-note ${soft ? 'auth-note--soft' : 'auth-note--err'}`, role: soft ? 'status' : 'alert' }, icon(soft ? 'info' : 'x-circle'), h('span', null, err.message || String(err))));
    }

    function go(next) {
      state = next;
      render(true);
    }

    function submitButton(label) {
      return h('button', { type: 'submit', class: 'auth-submit' }, h('span', null, label), icon('arrow-right'));
    }

    async function guard(form, fn) {
      if (busy) return;
      if (!form.reportValidity()) return;
      busy = true;
      const btn = form.querySelector('.auth-submit');
      btn.classList.add('is-loading');
      showMessage(null);
      try { await fn(); } catch (err) { showMessage(err); shake(); } finally { busy = false; btn.classList.remove('is-loading'); }
    }

    function shake() {
      panel.classList.remove('is-shake');
      void panel.offsetWidth;
      panel.classList.add('is-shake');
    }

    // ---------- views ----------
    function loginView() {
      const email = inputRow({ id: 'auth-email', type: 'email', ic: 'mail', placeholder: 'Email đã đăng ký', autocomplete: 'email', label: 'Email' });
      const pass = inputRow({ id: 'auth-pass', type: 'password', ic: 'lock', placeholder: 'Mật khẩu', autocomplete: 'current-password', minlength: 6, label: 'Mật khẩu' });
      const form = h('form', { class: 'auth-form', novalidate: false, onSubmit: (e) => {
        e.preventDefault();
        guard(form, async () => {
          await setRememberMe(remember.checked);
          const u = await login({ email: email.input.value, password: pass.input.value });
          done(u, 'Đăng nhập thành công. Chào mừng bạn trở lại!');
        });
      } },
        email.row, pass.row,
        h('div', { class: 'auth-row' },
          h('label', { class: 'auth-check' }, remember, h('span', { class: 'auth-check__mark', 'aria-hidden': 'true' }, icon('check')), 'Ghi nhớ đăng nhập'),
          h('button', { type: 'button', class: 'auth-link', onClick: () => go('reset') }, 'Quên mật khẩu?')),
        msgBox,
        submitButton('Đăng nhập'),
        h('div', { class: 'auth-divider' }, h('span', null, 'hoặc')),
        googleButton(),
        is127 ? h('p', { class: 'auth-hint' }, icon('info'), 'Bạn đang mở bằng 127.0.0.1 — đăng nhập Google cần ', h('a', { href: location.href.replace('//127.0.0.1', '//localhost') }, 'mở bằng localhost'), '.') : null,
        h('p', { class: 'auth-switch' }, 'Bạn chưa có tài khoản? ', h('button', { type: 'button', class: 'auth-link auth-link--strong', onClick: () => go('register') }, 'Đăng ký ngay')));
      return { form, focus: email.input };
    }

    function registerView() {
      const name = inputRow({ id: 'auth-name', ic: 'user', placeholder: 'Họ và tên đầy đủ', autocomplete: 'name', minlength: 2, maxlength: 80, label: 'Họ và tên' });
      const email = inputRow({ id: 'auth-email', type: 'email', ic: 'mail', placeholder: 'Địa chỉ Email', autocomplete: 'email', label: 'Email' });
      const pass = inputRow({ id: 'auth-pass', type: 'password', ic: 'lock', placeholder: 'Mật khẩu (tối thiểu 6 ký tự)', autocomplete: 'new-password', minlength: 6, label: 'Mật khẩu' });
      const confirm = inputRow({ id: 'auth-pass2', type: 'password', ic: 'key', placeholder: 'Nhập lại mật khẩu', autocomplete: 'new-password', minlength: 6, label: 'Nhập lại mật khẩu' });
      const meter = h('div', { class: 'auth-meter', dataset: { level: '0' } }, h('div', { class: 'auth-meter__bars' }, h('i'), h('i'), h('i'), h('i')), h('span', { class: 'auth-meter__label' }, 'Độ mạnh mật khẩu'));
      pass.input.addEventListener('input', () => {
        const st = passwordStrength(pass.input.value);
        meter.dataset.level = String(st.level);
        meter.querySelector('.auth-meter__label').textContent = pass.input.value ? `Độ mạnh: ${st.label}` : 'Độ mạnh mật khẩu';
      });
      const checkMatch = () => confirm.input.setCustomValidity(confirm.input.value && confirm.input.value !== pass.input.value ? 'Mật khẩu nhập lại chưa khớp.' : '');
      confirm.input.addEventListener('input', checkMatch);
      pass.input.addEventListener('input', checkMatch);
      const form = h('form', { class: 'auth-form', onSubmit: (e) => {
        e.preventDefault();
        checkMatch();
        guard(form, async () => {
          await setRememberMe(remember.checked);
          const u = await register({ fullName: name.input.value, email: email.input.value, password: pass.input.value });
          done(u, `Chào mừng ${u?.displayName || ''} đến với V-Code Edu! Hãy kiểm tra email để xác minh tài khoản.`);
        });
      } },
        name.row, email.row, pass.row, meter, confirm.row,
        h('div', { class: 'auth-row' }, h('label', { class: 'auth-check' }, remember, h('span', { class: 'auth-check__mark', 'aria-hidden': 'true' }, icon('check')), 'Ghi nhớ đăng nhập')),
        msgBox,
        submitButton('Tạo tài khoản miễn phí'),
        h('div', { class: 'auth-divider' }, h('span', null, 'hoặc đăng ký nhanh bằng')),
        googleButton('Đăng ký với Google'),
        h('p', { class: 'auth-legal' }, icon('shield'), 'Mật khẩu được Firebase Authentication bảo vệ và không bao giờ được lưu trong cơ sở dữ liệu của V-Code Edu.'),
        h('p', { class: 'auth-switch' }, 'Đã có tài khoản? ', h('button', { type: 'button', class: 'auth-link auth-link--strong', onClick: () => go('login') }, 'Đăng nhập ngay')));
      return { form, focus: name.input };
    }

    function resetView() {
      const email = inputRow({ id: 'auth-reset-email', type: 'email', ic: 'mail', placeholder: 'Email đã đăng ký', autocomplete: 'email', label: 'Email' });
      const form = h('form', { class: 'auth-form', onSubmit: (e) => {
        e.preventDefault();
        guard(form, async () => {
          await resetPassword(email.input.value);
          showMessage('Đã gửi email đặt lại mật khẩu (nếu email đã đăng ký). Hãy kiểm tra hộp thư, kể cả mục Thư rác/Spam.', 'success');
        });
      } },
        h('div', { class: 'auth-reset-art', 'aria-hidden': 'true' }, h('span', null, icon('key'))),
        email.row,
        msgBox,
        submitButton('Gửi liên kết đặt lại'),
        h('p', { class: 'auth-hint' }, icon('info'), 'Tài khoản đăng nhập bằng Google không cần mật khẩu — hãy dùng nút “Tiếp tục với Google”.'),
        h('button', { type: 'button', class: 'auth-back', onClick: () => go('login') }, icon('arrow-left'), 'Quay lại đăng nhập'));
      return { form, focus: email.input };
    }

    function render(animate = false) {
      const offline = !appState.get().online;
      heading.textContent = COPY[state].title;
      sub.textContent = COPY[state].sub;
      showMessage(null);
      const v = state === 'register' ? registerView() : state === 'reset' ? resetView() : loginView();
      mount(view,
        reason ? h('div', { class: 'auth-note auth-note--info' }, icon('info'), h('span', null, reason)) : null,
        offline ? h('div', { class: 'auth-note auth-note--warn' }, icon('wifi-off'), h('span', null, 'Bạn đang ngoại tuyến. Đăng nhập cần Internet — bạn vẫn học và luyện tập offline, tiến độ được lưu trên máy.')) : null,
        v.form);
      shell.dataset.mode = state;
      if (animate) { view.classList.remove('is-switching'); void view.offsetWidth; view.classList.add('is-switching'); }
      setTimeout(() => v.focus?.focus(), 40);
    }

    render();
    modal = openModal({
      size: 'xl',
      className: 'auth-modal',
      content: shell,
      onClose: (u) => resolve(u || null),
    });
    modal.el.setAttribute('aria-labelledby', 'auth-title');
  });
}

/** Ensure the user is signed in; opens the dialog if needed. Resolves with user or null. */
export async function requireSignIn(reason) {
  const u = appState.get().user;
  if (u) return u;
  await openAuthDialog({ reason });
  return appState.get().user;
}
