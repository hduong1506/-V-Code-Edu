// V-Code Edu — classroom settings (teacher) / class info (student) and the invitation dialog (code, link, QR).
import { h, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { toast, openModal, confirmDialog, copyText } from '../../core/ui.js';
import { formatDate } from '../../core/format.js';
import { QRCODE_URL } from '../../config.js';
import * as C from '../../services/classroom.js';
import { banner } from './art.js';
import { invalidateClasses } from './shell.js';
import { errMsg, sectionHead, panel, avatar } from './util.js';

export const inviteLink = (code) => `${location.origin}${location.pathname}#/join/${code}`;

function loadQR() {
  if (window.QRCode) return Promise.resolve();
  return new Promise((res, rej) => { const s = h('script', { src: QRCODE_URL, crossorigin: 'anonymous', onLoad: res, onError: rej }); document.head.appendChild(s); });
}

async function renderQR(box, text, size = 184) {
  mount(box, h('div', { class: 'spinner' }));
  try {
    await loadQR();
    mount(box);
    // eslint-disable-next-line no-new
    new window.QRCode(box, { text, width: size, height: size, colorDark: '#0a1630', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
  } catch {
    mount(box, h('span', { class: 'cr-qr__err' }, 'Không tạo được mã QR (cần Internet lần đầu).'));
  }
}

export function openInvite(S, { welcome = false } = {}) {
  const code = S.code;
  const link = inviteLink(code);
  const qr = h('div', { class: 'cr-qr', role: 'img', 'aria-label': `Mã QR mở liên kết mời vào lớp ${code}` });
  const copyBtn = (label, text, ok) => h('button', { class: 'btn btn--sm', type: 'button', onClick: async () => toast((await copyText(text)) ? ok : 'Không chép được.', { type: 'success', duration: 1600 }) }, icon('copy'), label);
  openModal({
    title: welcome ? 'Lớp đã sẵn sàng — mời học sinh' : 'Mời học sinh vào lớp',
    size: 'lg',
    className: 'cr-modal cr-invite-modal',
    content: h('div', { class: 'cr-invite' },
      h('div', { class: 'cr-invite__main' },
        welcome ? h('div', { class: 'cr-callout tone-green' }, icon('check-circle'), h('div', null, h('strong', null, `Đã tạo lớp “${S.cls?.name || code}”. `), 'Gửi mã lớp, liên kết hoặc cho học sinh quét mã QR.')) : null,
        h('div', { class: 'cr-invite__block' },
          h('span', { class: 'cr-invite__k' }, 'Mã lớp'),
          h('div', { class: 'cr-invite__code', 'aria-label': `Mã lớp ${code.split('').join(' ')}` }, code.split('').map((ch) => h('span', null, ch))),
          h('div', { class: 'cluster cluster--sm' }, copyBtn('Chép mã', code, 'Đã chép mã lớp.'))),
        h('div', { class: 'cr-invite__block' },
          h('span', { class: 'cr-invite__k' }, 'Liên kết mời'),
          h('div', { class: 'cr-invite__link' }, h('input', { class: 'input', readonly: true, value: link, 'aria-label': 'Liên kết mời', onFocus: (e) => e.target.select() }), copyBtn('Chép', link, 'Đã chép liên kết mời.')),
          navigator.share ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => navigator.share({ title: `Tham gia lớp ${S.cls?.name || code}`, text: `Mã lớp: ${code}`, url: link }).catch(() => {}) }, icon('share'), 'Chia sẻ…') : null),
        h('ol', { class: 'cr-invite__steps' },
          h('li', null, 'Học sinh đăng nhập V-Code Edu với vai trò ', h('strong', null, 'Học sinh'), '.'),
          h('li', null, 'Mở liên kết / quét QR, hoặc vào ', h('strong', null, 'Lớp học'), ' và nhập mã ', h('strong', { class: 'mono' }, code), '.'),
          h('li', null, 'Tên các em xuất hiện ngay trong mục Học sinh.'))),
      h('div', { class: 'cr-invite__qr' }, qr, h('p', null, 'Quét để mở liên kết mời'), h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => presentCode(S) }, icon('maximize'), 'Trình chiếu mã lớp'))),
    actions: [{ label: 'Xong', variant: 'primary' }],
  });
  renderQR(qr, link);
}

/** Full-screen "projector" view of the class code + QR for the classroom screen. */
function presentCode(S) {
  const qr = h('div', { class: 'cr-qr cr-qr--lg' });
  openModal({
    size: 'xl', className: 'cr-modal cr-present-modal', title: S.cls?.name || S.code,
    content: h('div', { class: 'cr-present' },
      h('div', null, h('p', { class: 'cr-present__k' }, 'Vào V-Code Edu → Lớp học → nhập mã'), h('div', { class: 'cr-present__code' }, S.code), h('p', { class: 'cr-present__link mono' }, inviteLink(S.code))),
      qr),
  });
  renderQR(qr, inviteLink(S.code), 280);
}

// ---------------------------------------------------------------------------
export function settingsSection(S) {
  return S.isTeacher ? teacherSettings(S) : studentInfo(S);
}

function teacherSettings(S) {
  const { cls, code } = S;
  const name = h('input', { class: 'input', id: 'cr-set-name', value: cls.name, maxlength: 120 });
  const subject = h('input', { class: 'input', id: 'cr-set-subject', value: cls.grade_subject || '', maxlength: 80 });
  const desc = h('textarea', { class: 'textarea', id: 'cr-set-desc', maxlength: 1000 });
  desc.value = cls.description || '';
  const saveBtn = h('button', { class: 'btn btn--primary', type: 'submit' }, icon('check'), 'Lưu thay đổi');
  const form = h('form', { class: 'cr-form', onSubmit: async (e) => {
    e.preventDefault();
    if (!name.value.trim()) { toast('Tên lớp không được để trống.', { type: 'warning' }); name.focus(); return; }
    saveBtn.classList.add('is-loading');
    try { await C.updateClass(code, { name: name.value, grade_subject: subject.value, description: desc.value }); invalidateClasses(); toast('Đã lưu thông tin lớp.', { type: 'success' }); } catch (err) { toast(errMsg(err), { type: 'error' }); } finally { saveBtn.classList.remove('is-loading'); }
  } },
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-set-name' }, 'Tên lớp'), name),
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-set-subject' }, 'Môn / khối'), subject),
    h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-set-desc' }, 'Mô tả'), desc),
    h('div', { class: 'cr-form__actions' }, saveBtn));
  const delBtn = h('button', { class: 'btn btn--danger', type: 'button', onClick: async () => {
    if (!(await confirmDialog({ title: `Xóa lớp ${cls.name}?`, message: 'Toàn bộ bài tập, bài nộp, điểm và thảo luận sẽ bị xóa vĩnh viễn. Thao tác này không thể hoàn tác.', confirmLabel: 'Xóa vĩnh viễn', danger: true }))) return;
    delBtn.classList.add('is-loading');
    try { await C.deleteClass(code); invalidateClasses(); toast('Đã xóa lớp.'); S.ctx.navigate('/classroom'); } catch (err) { toast(errMsg(err), { type: 'error' }); delBtn.classList.remove('is-loading'); }
  } }, icon('trash'), 'Xóa lớp');
  const facts = h('dl', { class: 'cr-facts' });
  const renderFacts = () => mount(facts,
    h('div', null, h('dt', null, 'Giáo viên'), h('dd', null, S.cls.teacher_name || S.cls.teacher_email)),
    h('div', null, h('dt', null, 'Ngày tạo'), h('dd', null, S.cls.created_at ? formatDate(S.cls.created_at) : '—')),
    h('div', null, h('dt', null, 'Học sinh'), h('dd', null, String(S.roster().length))),
    h('div', null, h('dt', null, 'Bài tập'), h('dd', null, String(S.assignments.length))),
    h('div', null, h('dt', null, 'Bài nộp'), h('dd', null, String(S.submissions.length))));
  renderFacts();
  const el = h('div', { class: 'cr-sec' },
    sectionHead({ title: 'Cài đặt lớp', sub: 'Thông tin lớp, lời mời và quản lý dữ liệu.' }),
    h('div', { class: 'cr-settings' },
      panel({ title: 'Thông tin lớp', body: form }),
      h('div', { class: 'cr-settings__side' },
        panel({ title: 'Lời mời', className: 'cr-panel--invite', body: h('div', { class: 'cr-set-invite' },
          banner(code, 'cr-set-invite__banner'),
          h('div', { class: 'cr-set-invite__code mono' }, code),
          h('p', { class: 'muted' }, 'Học sinh dùng mã này hoặc liên kết mời để tham gia.'),
          h('button', { class: 'btn btn--soft btn--block', type: 'button', onClick: () => openInvite(S) }, icon('qr'), 'Mã, liên kết & QR')) }),
        panel({ title: 'Thông tin', body: facts }))),
    h('section', { class: 'cr-danger' },
      h('div', { class: 'grow' }, h('h3', null, 'Vùng nguy hiểm'), h('p', null, 'Xóa lớp sẽ xóa vĩnh viễn toàn bộ bài tập, bài nộp và thảo luận của lớp.')),
      delBtn));
  return { el, update: renderFacts };
}

function studentInfo(S) {
  const el = h('div', { class: 'cr-sec' });
  function update() {
    const { cls, code } = S;
    mount(el,
      sectionHead({ title: 'Thông tin lớp' }),
      h('div', { class: 'cr-settings' },
        panel({ title: cls.name, sub: cls.grade_subject || null, body: h('div', { class: 'stack' },
          cls.description ? h('p', { class: 'text-2' }, cls.description) : h('p', { class: 'muted' }, 'Lớp chưa có mô tả.'),
          h('dl', { class: 'cr-facts' },
            h('div', null, h('dt', null, 'Mã lớp'), h('dd', { class: 'mono' }, code)),
            h('div', null, h('dt', null, 'Giáo viên'), h('dd', { class: 'cr-facts__user' }, avatar(cls.teacher_name || cls.teacher_email, cls.teacher_email, { size: 24 }), cls.teacher_name || cls.teacher_email)),
            h('div', null, h('dt', null, 'Sĩ số'), h('dd', null, `${S.roster().length} học sinh`)),
            h('div', null, h('dt', null, 'Ngày tạo'), h('dd', null, cls.created_at ? formatDate(cls.created_at) : '—')))) }),
        h('div', { class: 'cr-settings__side' }, panel({ title: 'Quyền riêng tư', body: h('p', { class: 'text-2' }, 'Giáo viên thấy tên, email, bài nộp và trạng thái trực tuyến của em trong lớp này. Các bạn cùng lớp chỉ thấy tên em trong danh sách thành viên và tin nhắn thảo luận.') }))),
      h('section', { class: 'cr-danger' },
        h('div', { class: 'grow' }, h('h3', null, 'Rời khỏi lớp'), h('p', null, 'Em sẽ không xem được bài tập của lớp nữa. Bài đã nộp vẫn được giữ lại cho giáo viên.')),
        h('button', { class: 'btn btn--danger-soft', type: 'button', onClick: async () => {
          if (!(await confirmDialog({ title: 'Rời khỏi lớp?', message: 'Em sẽ không xem được bài tập của lớp nữa (bài đã nộp vẫn được giữ).', confirmLabel: 'Rời lớp', danger: true }))) return;
          try { await C.leaveClass(code); invalidateClasses(); toast('Đã rời lớp.'); S.ctx.navigate('/classroom'); } catch (err) { toast(errMsg(err), { type: 'error' }); }
        } }, icon('logout'), 'Rời lớp')));
  }
  update();
  return { el, update, deps: ['cls', 'assignments'] };
}
