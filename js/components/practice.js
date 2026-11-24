// V-Code Edu — split "read + code" practice layout shared by lessons, challenges and class assignments.
import { h, mount, raw } from '../core/dom.js';
import { icon } from './icons.js';
import { markdown, enhanceMarkdown } from './markdown.js';
import { highlight } from './highlight.js';
import { createWorkbench, loadDraft } from './ide.js';
import { kv } from '../core/idb.js';
import { toast } from '../core/ui.js';

/** Lazily-created AI side drawer with the chat component. */
export function createAIDrawer({ signal, getContext }) {
  let drawer = null;
  let chat = null;
  async function open(prompt) {
    if (!drawer) {
      const { createChat } = await import('./chat.js');
      const body = h('div', { class: 'ai-drawer__body' });
      drawer = h('aside', { class: 'ai-drawer', 'aria-label': 'Trợ lý AI V-Mentor' },
        h('div', { class: 'ai-drawer__head' },
          h('span', { class: 'badge badge--ai' }, icon('sparkles'), 'V-Mentor'),
          h('strong', { class: 'grow' }, 'Hỏi trợ lý AI'),
          h('a', { class: 'btn btn--ghost btn--sm', href: '#/ai', title: 'Mở trang trợ lý AI' }, icon('maximize')),
          h('button', { class: 'btn btn--ghost btn--icon btn--sm', type: 'button', 'aria-label': 'Đóng', onClick: () => close() }, icon('x'))),
        body);
      document.body.appendChild(drawer);
      await ensureAiCss();
      chat = createChat(body, { compact: true, mode: 'tutor', context: getContext() });
      signal.addEventListener('abort', () => { chat?.destroy(); drawer?.remove(); });
    }
    chat.setContext(getContext());
    requestAnimationFrame(() => drawer.classList.add('is-open'));
    if (prompt) chat.send(prompt); else chat.focus();
  }
  function close() { drawer?.classList.remove('is-open'); }
  return { open, close };
}

let aiCssPromise = null;
function ensureAiCss() {
  if (document.querySelector('link[href="css/pages/ai.css"]')) return Promise.resolve();
  if (!aiCssPromise) {
    aiCssPromise = new Promise((resolve) => {
      const l = h('link', { rel: 'stylesheet', href: 'css/pages/ai.css', onLoad: resolve, onError: resolve });
      document.head.appendChild(l);
    });
  }
  return aiCssPromise;
}

function prose(md, opts) {
  const el = h('div', { class: 'prose' });
  el.innerHTML = markdown(md || '');
  enhanceMarkdown(el, opts);
  return el;
}

/**
 * buildPracticePage(container, ctx, {
 *   crumbs: [{label, href}], title, meta: [Node], lang, highlightLang,
 *   sections: { theory?: md, task: md, hints?: [md], solution?: code }, prism?: topicId,
 *   starter, tests, checks, draftKey, attemptsKey, onPass(result, code), onResult(result, code),
 *   prev?: {href,label}, next?: {href,label}, aiLesson: string, submitLabel
 * })
 */
export async function buildPracticePage(container, ctx, cfg) {
  const { signal } = ctx;
  const draft = cfg.draftKey ? await loadDraft(cfg.draftKey) : null;
  const attempts = cfg.attemptsKey ? Number(await kv.get(cfg.attemptsKey, 0)) : 0;
  let solved = Boolean(cfg.solved);
  let failCount = attempts;

  // ----- left pane -----
  const tabsDef = [];
  if (cfg.sections.theory) tabsDef.push({ id: 'theory', label: 'Lý thuyết', icon: 'book-open' });
  tabsDef.push({ id: 'task', label: 'Đề bài', icon: 'target' });
  if (cfg.sections.hints?.length) tabsDef.push({ id: 'hints', label: `Gợi ý (${cfg.sections.hints.length})`, icon: 'bulb' });
  if (cfg.sections.solution) tabsDef.push({ id: 'solution', label: 'Lời giải', icon: 'key' });
  let active = cfg.initialTab || (cfg.sections.theory ? 'theory' : 'task');
  let hintsShown = 0;

  const tabsEl = h('div', { class: 'tabs', role: 'tablist', style: 'padding:0 12px' });
  const content = h('div', { class: 'ide-page__content scroll-y' });

  function renderTab() {
    mount(tabsEl, tabsDef.map((t) => h('button', { class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(t.id === active), onClick: () => { active = t.id; renderTab(); } }, icon(t.icon), t.label)));
    let node;
    if (active === 'theory') node = prose(cfg.sections.theory, { onOpenCode: (code) => wb.setCode(code) });
    else if (active === 'task') {
      node = h('div', { class: 'stack' },
        prose(cfg.sections.task),
        cfg.tests?.filter((t) => !t.hidden).length ? h('div', { class: 'stack stack--sm' },
          h('h3', { style: 'font-size:var(--fs-md)' }, 'Ví dụ kiểm thử'),
          cfg.tests.filter((t) => !t.hidden).slice(0, 2).map((t, i) => h('div', { class: 'sample-io' },
            h('div', null, h('div', { class: 'test-item__k' }, `Dữ liệu vào #${i + 1}`), h('pre', null, t.input || '(trống)')),
            h('div', null, h('div', { class: 'test-item__k' }, `Kết quả #${i + 1}`), h('pre', null, t.expected))))) : null,
        cfg.prism ? h('a', { class: 'callout callout--info', href: `#/prism/${cfg.prism}`, style: 'text-decoration:none' }, icon('prism'), h('div', null, h('strong', null, 'Xem trực quan thuật toán '), 'trong Lăng kính thuật toán để hiểu từng bước chạy.')) : null,
      );
    } else if (active === 'hints') {
      const hints = cfg.sections.hints;
      node = h('div', null,
        hints.slice(0, hintsShown).map((hint, i) => h('div', { class: 'hint-card' }, h('div', { class: 'hint-card__head' }, icon('bulb'), `Gợi ý ${i + 1}`), prose(hint))),
        hintsShown < hints.length
          ? h('button', { class: 'btn btn--soft', type: 'button', style: 'margin-top:12px', onClick: () => { hintsShown += 1; renderTab(); } }, icon('bulb'), hintsShown === 0 ? 'Xem gợi ý đầu tiên' : 'Xem gợi ý tiếp theo')
          : h('p', { class: 'muted', style: 'margin-top:12px' }, 'Bạn đã xem hết gợi ý. Hãy thử hỏi V-Mentor nếu vẫn còn vướng.'),
      );
    } else if (active === 'solution') {
      const unlocked = solved || failCount >= 3;
      node = unlocked
        ? h('div', { class: 'stack' },
          h('div', { class: 'callout callout--success' }, icon('key'), h('div', null, solved ? 'Bạn đã giải xong — hãy so sánh với lời giải tham khảo.' : 'Lời giải được mở sau 3 lần nộp chưa đạt. Hãy đọc hiểu rồi tự viết lại nhé!')),
          h('div', { class: 'code-block' }, h('div', { class: 'code-block__head' }, h('span', null, 'Lời giải tham khảo')), h('pre', null, h('code', null, raw(highlight(cfg.sections.solution, cfg.highlightLang || cfg.lang))))))
        : h('div', { class: 'empty-state' }, h('div', { class: 'empty-state__icon' }, icon('lock')), h('h3', null, 'Lời giải đang khóa'),
          h('p', null, `Lời giải sẽ mở khi bạn giải đúng, hoặc sau 3 lần nộp chưa đạt (đã nộp ${failCount}/3). Hãy dùng gợi ý trước nhé!`));
    }
    mount(content, node);
  }

  const left = h('div', { class: 'ide-page__left' },
    h('div', { class: 'ide-page__head' },
      h('div', { class: 'ide-page__crumbs' }, cfg.crumbs.map((c, i) => [i ? icon('chevron-right') : null, c.href ? h('a', { href: c.href }, c.label) : h('span', null, c.label)])),
      h('h1', { class: 'ide-page__title' }, cfg.title),
      h('div', { class: 'cluster cluster--sm', style: 'margin-bottom:10px' }, cfg.meta || [])),
    tabsEl, content,
    h('div', { class: 'ide-page__foot' },
      cfg.prev ? h('a', { class: 'btn btn--ghost btn--sm', href: cfg.prev.href }, icon('chevron-left'), h('span', { class: 'truncate', style: 'max-width:160px' }, cfg.prev.label)) : h('span'),
      cfg.next ? h('a', { class: 'btn btn--soft btn--sm', href: cfg.next.href }, h('span', { class: 'truncate', style: 'max-width:160px' }, cfg.next.label), icon('chevron-right')) : h('span')),
  );

  // ----- right pane -----
  let lastSnapshot = { code: '', error: '' };
  const ai = createAIDrawer({ signal, getContext: () => ({ code: wb.getCode(), language: cfg.highlightLang || cfg.lang, error: lastSnapshot.error, lesson: `${cfg.title}\n${(cfg.sections.task || '').slice(0, 1200)}` }) });
  const wb = createWorkbench({
    lang: cfg.lang,
    code: draft ?? cfg.starter,
    starter: cfg.starter,
    tests: cfg.tests || [],
    checks: cfg.checks || [],
    draftKey: cfg.draftKey,
    signal,
    submitLabel: cfg.submitLabel || 'Nộp bài',
    onAskAI: ({ code, error }) => { lastSnapshot = { code, error }; ai.open(error ? 'Em gặp lỗi khi chạy chương trình. Hãy giúp em hiểu lỗi và gợi ý cách sửa (đừng viết hộ toàn bộ lời giải nhé).' : null); },
    onSubmitted: async (result, code) => {
      lastSnapshot.error = result.results.find((r) => r.error)?.error || '';
      const passed = result.total > 0 && result.passed === result.total;
      if (passed) {
        const firstSolve = !solved;
        solved = true;
        await cfg.onPass?.(result, code, firstSolve);
      } else {
        failCount += 1;
        if (cfg.attemptsKey) kv.set(cfg.attemptsKey, failCount).catch(() => {});
        if (failCount === 3 && cfg.sections.solution) toast('Lời giải tham khảo đã được mở trong tab "Lời giải".', { type: 'info' });
      }
      await cfg.onResult?.(result, code);
      if (active === 'solution') renderTab();
    },
  });

  const mobileSwitch = h('div', { class: 'ide-mobile-switch' }, h('div', { class: 'segmented', style: 'width:100%' },
    h('button', { type: 'button', 'aria-pressed': 'true', style: 'flex:1', onClick: (e) => setPane('read', e.currentTarget) }, icon('book-open'), 'Đề bài'),
    h('button', { type: 'button', 'aria-pressed': 'false', style: 'flex:1', onClick: (e) => setPane('code', e.currentTarget) }, icon('code'), 'Viết code')));
  const page = h('div', { class: 'ide-page', dataset: { pane: 'read' } }, left, h('div', { class: 'ide-page__right' }, wb.el));
  function setPane(p, btn) {
    page.dataset.pane = p;
    mobileSwitch.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  }
  mount(container, mobileSwitch, page);
  renderTab();
  return { wb, ai, markSolved: () => { solved = true; } };
}
