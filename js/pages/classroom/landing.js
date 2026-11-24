// V-Code Edu — classroom: offline notice, signed-out landing, one-time role selection, invitation (join) page.
import { h, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { toast, confirmDialog } from '../../core/ui.js';
import * as C from '../../services/classroom.js';
import { heroIllustration, roleArt, banner, illo } from './art.js';
import { errMsg, rosterOf, emptyBlock } from './util.js';
import { invalidateClasses } from './shell.js';

function openSignIn(reason) {
  import('../../components/auth-dialog.js').then((m) => m.openAuthDialog({ reason }));
}

export function offlineView() {
  return h('div', { class: 'cr-page cr-narrow' },
    emptyBlock({ art: 'offline', title: 'Lớp học cần kết nối Internet lần đầu', text: 'Không tải được dịch vụ dữ liệu. Hãy kết nối mạng để vào lớp; sau đó dữ liệu lớp học được lưu đệm để xem khi ngoại tuyến.', action: h('button', { class: 'btn btn--primary', type: 'button', onClick: () => location.reload() }, icon('refresh'), 'Thử lại') }));
}

// ---------------------------------------------------------------------------
export function landingView({ joinCode } = {}) {
  const code = joinCode ? C.normCode(joinCode) : null;
  const signIn = () => openSignIn(code ? `Đăng nhập để tham gia lớp ${code}.` : 'Đăng nhập để vào lớp học.');
  const features = [
    ['users', 'blue', 'Quản lý lớp gọn gàng', 'Tạo lớp trong vài giây, mời học sinh bằng mã lớp, liên kết hoặc mã QR.'],
    ['calendar', 'amber', 'Giao bài có hạn nộp', 'Đề bài Markdown, mã khởi tạo, ngôn ngữ và hạn nộp theo giờ 24h.'],
    ['check-circle', 'green', 'Chấm tự động bằng bộ test', 'Bài nộp được chạy với bộ test (có test ẩn) và quy ra thang điểm 10.'],
    ['edit', 'ink', 'Giáo viên chấm lại & nhận xét', 'Xem mã nguồn, chạy lại test, sửa điểm và gửi nhận xét cho từng em.'],
    ['table', 'blue', 'Bảng điểm & biểu đồ', 'Ma trận học sinh × bài tập, phân bố điểm, tỉ lệ nộp bài — xuất CSV.'],
    ['zap', 'violet', 'Theo dõi thời gian thực', 'Biết ai đang trực tuyến, ai đang làm bài nào, cập nhật không cần tải lại.'],
  ];
  return h('div', { class: 'classroom-landing cr-landing' },
    h('section', { class: 'cr-hero' },
      h('div', { class: 'cr-hero__copy' },
        h('span', { class: 'cr-eyebrow' }, h('span', { class: 'cr-eyebrow__dot' }), 'Lớp học lập trình trực tuyến'),
        h('h1', { class: 'cr-hero__title' }, 'Giao bài, chấm bài và theo dõi tiến độ — ', h('span', null, 'trong một lớp học.')),
        h('p', { class: 'cr-hero__sub' }, 'Giáo viên tạo lớp và giao bài có hạn nộp. Học sinh viết và chạy code ngay trên trình duyệt, bài được chấm tự động bằng bộ test; giáo viên xem lại, chấm điểm và nhận xét.'),
        code ? h('div', { class: 'cr-invite-note' }, icon('mail'), h('div', null, h('strong', null, `Bạn được mời vào lớp ${code}.`), ' Đăng nhập hoặc tạo tài khoản để tham gia.')) : null,
        h('div', { class: 'cr-hero__cta' },
          h('button', { class: 'btn btn--primary btn--lg', type: 'button', onClick: signIn }, icon('login'), code ? 'Đăng nhập để tham gia' : 'Đăng nhập để bắt đầu'),
          h('a', { class: 'btn btn--ghost btn--lg', href: '#/classroom', onClick: (e) => { e.preventDefault(); document.getElementById('cr-how')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'Cách hoạt động', icon('arrow-right'))),
        h('ul', { class: 'cr-hero__ticks' }, ['Chạy code ngay trên trình duyệt', 'Chấm tự động bằng bộ test', 'Đồng bộ thời gian thực'].map((t) => h('li', null, icon('check'), t)))),
      h('div', { class: 'cr-hero__visual' }, heroIllustration())),
    h('section', { class: 'cr-features' },
      h('div', { class: 'cr-section-head' }, h('span', { class: 'cr-kicker' }, 'Tính năng'), h('h2', null, 'Mọi thứ một lớp học lập trình cần'), h('p', null, 'Thiết kế cho giờ Tin học trên lớp lẫn bài tập về nhà.')),
      h('div', { class: 'cr-feature-grid' }, features.map(([ic, tone, t, d]) => h('article', { class: 'cr-feature' },
        h('span', { class: `cr-feature__icon tone-${tone}` }, icon(ic)), h('h3', null, t), h('p', null, d))))),
    h('section', { class: 'cr-how', id: 'cr-how' },
      h('div', { class: 'cr-section-head' }, h('span', { class: 'cr-kicker' }, 'Cách hoạt động'), h('h2', null, 'Bắt đầu trong ba bước')),
      h('div', { class: 'cr-how__cols' },
        howCol('school', 'Dành cho giáo viên', ['Đăng nhập và chọn vai trò Giáo viên.', 'Tạo lớp, gửi mã lớp / liên kết / mã QR cho học sinh.', 'Giao bài kèm bộ test, theo dõi bài nộp và chấm điểm.']),
        howCol('user', 'Dành cho học sinh', ['Đăng nhập và chọn vai trò Học sinh.', 'Nhập mã lớp hoặc mở liên kết mời của thầy/cô.', 'Làm bài trên trình duyệt, nộp và nhận điểm, nhận xét.']))),
    h('section', { class: 'cr-cta' },
      h('div', null, h('h2', null, 'Sẵn sàng mở lớp học của bạn?'), h('p', null, 'Dùng chung một tài khoản V-Code Edu cho học tập, luyện thi và lớp học.')),
      h('button', { class: 'btn btn--lg cr-cta__btn', type: 'button', onClick: signIn }, icon('login'), 'Đăng nhập')));
}

function howCol(ic, title, steps) {
  return h('div', { class: 'cr-how__col' },
    h('div', { class: 'cr-how__head' }, h('span', { class: 'cr-how__icon' }, icon(ic)), h('h3', null, title)),
    h('ol', { class: 'cr-steps' }, steps.map((t, i) => h('li', null, h('span', { class: 'cr-steps__n' }, String(i + 1)), h('span', null, t)))));
}

// ---------------------------------------------------------------------------
export function roleView(user) {
  const school = h('input', { class: 'input', id: 'cr-school', placeholder: 'VD: THCS & THPT Hòa Phú', value: user.school_name || '', maxlength: 120 });
  const cls = h('input', { class: 'input', id: 'cr-classname', placeholder: 'VD: 10A1', value: user.class_name || '', maxlength: 40 });
  let role = null;
  const clsField = h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-classname' }, 'Lớp của em'), cls);
  const opts = h('div', { class: 'role-options', role: 'radiogroup', 'aria-label': 'Chọn vai trò' });
  const submit = h('button', { class: 'btn btn--primary btn--lg', type: 'button', disabled: true, onClick: async () => {
    if (!role) return;
    const ok = await confirmDialog({ title: `Xác nhận vai trò ${role === 'teacher' ? 'Giáo viên' : 'Học sinh'}?`, message: 'Vai trò chỉ được chọn MỘT lần và sẽ được khóa trên máy chủ để bảo đảm an toàn cho lớp học.', confirmLabel: 'Xác nhận' });
    if (!ok) return;
    submit.classList.add('is-loading');
    try { await C.chooseRole(role, { school_name: school.value, class_name: role === 'student' ? cls.value : '' }); toast('Đã lưu vai trò.', { type: 'success' }); } catch (err) { toast(errMsg(err), { type: 'error' }); } finally { submit.classList.remove('is-loading'); }
  } }, 'Tiếp tục', icon('arrow-right'));
  const roles = [
    ['teacher', 'Tôi là giáo viên', ['Tạo lớp và mời học sinh', 'Giao bài, chấm tự động và chấm lại', 'Bảng điểm, biểu đồ, theo dõi trực tiếp']],
    ['student', 'Tôi là học sinh', ['Tham gia lớp bằng mã hoặc liên kết', 'Làm bài, nộp và nhận điểm ngay', 'Xem nhận xét của thầy/cô']],
  ];
  const renderOpts = () => {
    mount(opts, roles.map(([id, t, items]) => h('button', { class: `role-option ${role === id ? 'is-selected' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(role === id), onClick: () => { role = id; submit.disabled = false; renderOpts(); } },
      h('span', { class: 'role-option__check', 'aria-hidden': 'true' }, icon('check')),
      roleArt(id),
      h('strong', null, t),
      h('ul', null, items.map((x) => h('li', null, icon('check'), x))))));
    clsField.hidden = role === 'teacher';
  };
  renderOpts();
  return h('div', { class: 'cr-page cr-role' },
    h('div', { class: 'cr-role__card' },
      h('div', { class: 'cr-role__head' },
        h('span', { class: 'cr-eyebrow' }, h('span', { class: 'cr-eyebrow__dot' }), 'Thiết lập lớp học'),
        h('h1', null, `Chào ${user.displayName}! Bạn tham gia với vai trò nào?`),
        h('p', null, 'Chọn vai trò để mở các chức năng phù hợp. Vai trò được khóa sau khi xác nhận.')),
      opts,
      h('div', { class: 'cr-role__fields' },
        h('div', { class: 'field' }, h('label', { class: 'field__label', for: 'cr-school' }, 'Trường (không bắt buộc)'), school),
        clsField),
      h('div', { class: 'cr-role__foot' }, h('p', { class: 'muted' }, icon('shield'), ' Vai trò được kiểm tra bởi máy chủ, không thể tự nâng quyền.'), submit)));
}

// ---------------------------------------------------------------------------
export async function joinView(container, ctx, user, isTeacher) {
  const code = C.normCode(ctx.params.code);
  if (isTeacher) { ctx.navigate(`/classroom/${code}`, { replace: true }); return; }
  mount(container, h('div', { class: 'cr-loading' }, h('div', { class: 'spinner' }), h('span', null, 'Đang mở lời mời…')));
  try {
    const cls = await C.getClass(code);
    if (ctx.signal.aborted) return;
    if (!cls) {
      mount(container, h('div', { class: 'cr-page cr-narrow' }, emptyBlock({ art: 'lock', title: `Không tìm thấy lớp “${code}”`, text: 'Liên kết mời có thể đã hết hiệu lực hoặc lớp đã bị xóa. Hãy hỏi lại thầy/cô mã lớp chính xác.', action: h('a', { class: 'btn btn--primary', href: '#/classroom' }, 'Về lớp học của tôi') })));
      return;
    }
    if ((cls.student_emails || []).includes(user.key)) { ctx.navigate(`/classroom/${code}`, { replace: true }); return; }
    const count = rosterOf(cls).length;
    const btn = h('button', { class: 'btn btn--primary btn--lg btn--block', type: 'button', onClick: async () => {
      btn.classList.add('is-loading');
      try { await C.joinClass(code); invalidateClasses(); toast(`Đã tham gia lớp ${cls.name}.`, { type: 'success' }); ctx.navigate(`/classroom/${code}`, { replace: true }); } catch (err) { toast(errMsg(err), { type: 'error' }); btn.classList.remove('is-loading'); }
    } }, icon('plus'), 'Tham gia lớp');
    mount(container, h('div', { class: 'cr-page cr-join' },
      h('div', { class: 'cr-join__card' },
        banner(code, 'cr-join__banner'),
        h('div', { class: 'cr-join__body' },
          h('span', { class: 'cr-code-chip' }, icon('hash'), code),
          h('h1', null, cls.name),
          cls.grade_subject ? h('p', { class: 'cr-join__subject' }, cls.grade_subject) : null,
          h('dl', { class: 'cr-join__meta' },
            h('div', null, h('dt', null, 'Giáo viên'), h('dd', null, cls.teacher_name || cls.teacher_email)),
            h('div', null, h('dt', null, 'Thành viên'), h('dd', null, `${count} học sinh`))),
          cls.description ? h('p', { class: 'cr-join__desc' }, cls.description) : null,
          btn,
          h('p', { class: 'cr-join__note' }, icon('info'), ' Khi tham gia, giáo viên sẽ thấy tên, email và bài nộp của em trong lớp này.'))),
      illo('join', 'cr-join__art')));
  } catch (err) {
    mount(container, h('div', { class: 'cr-page cr-narrow' }, emptyBlock({ art: 'lock', title: 'Không mở được lớp', text: errMsg(err), action: h('a', { class: 'btn btn--primary', href: '#/classroom' }, 'Về lớp học của tôi') })));
  }
}
