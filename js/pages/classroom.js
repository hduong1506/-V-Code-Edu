// V-Code Edu — Classroom (route entry for #/classroom, #/classroom/:code, #/join/:code).
// Teachers: classes, invitations (code / link / QR), assignments with tests + deadlines, auto + manual grading,
// gradebook, live presence, activity feed, discussion. Students: joined classes, assignments with status,
// in-browser workbench with auto-grading, grades & feedback, discussion.
// Data: Firestore via js/services/classroom.js (rules in firestore.rules). UI modules live in ./classroom/.
import { h, mount } from '../core/dom.js';
import { appState } from '../core/store.js';
import { offlineView, landingView, roleView, joinView } from './classroom/landing.js';
import { homeView } from './classroom/home.js';
import { classView } from './classroom/workspace.js';

function waitForAuth(signal) {
  return new Promise((resolve) => {
    if (appState.get().authReady) { resolve(); return; }
    const off = appState.subscribe((s) => { if (s.authReady) { off(); resolve(); } }, { signal });
  });
}

export default {
  title: 'Lớp học',
  async mount(container, ctx) {
    const { signal } = ctx;
    let viewAbort = null;
    signal.addEventListener('abort', () => viewAbort?.abort());

    mount(container, h('div', { class: 'cr-loading' }, h('div', { class: 'spinner' }), h('span', null, 'Đang mở lớp học…')));
    await waitForAuth(signal);
    if (signal.aborted) return;

    const render = async () => {
      viewAbort?.abort();
      viewAbort = new AbortController();
      const vctx = { ...ctx, signal: AbortSignal.any ? AbortSignal.any([signal, viewAbort.signal]) : viewAbort.signal };
      const { user, firebaseUnavailable } = appState.get();
      const joinCode = ctx.path.startsWith('/join/') ? ctx.params.code : null;
      if (firebaseUnavailable) { mount(container, offlineView()); return; }
      if (!user) { mount(container, landingView({ joinCode })); return; }
      if (!user.role || user.role === 'none') { mount(container, roleView(user)); return; }
      const isTeacher = user.role === 'teacher' || user.role === 'admin';
      if (joinCode) { await joinView(container, vctx, user, isTeacher); return; }
      if (ctx.params.code) await classView(container, vctx, user, isTeacher);
      else await homeView(container, vctx, user, isTeacher);
    };

    let lastRole = appState.get().user?.role;
    let lastKey = appState.get().user?.key;
    appState.subscribe((s) => {
      if (s.user?.key !== lastKey || s.user?.role !== lastRole) {
        lastKey = s.user?.key;
        lastRole = s.user?.role;
        render();
      }
    }, { signal });
    await render();
  },
};
