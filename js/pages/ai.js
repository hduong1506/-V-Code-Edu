// V-Code Edu — AI assistant page (V-Mentor): conversation history + chat.
import { h, mount, debounce } from '../core/dom.js';
import { icon } from '../components/icons.js';
import { createChat, mentorOrb } from '../components/chat.js';
import { listConversations, renameConversation, deleteConversation } from '../services/conversations.js';
import { modeById } from '../services/ai-modes.js';
import { promptDialog, confirmDialog, toast } from '../core/ui.js';
import { bus, appState } from '../core/store.js';
import { kv } from '../core/idb.js';

const GROUPS = ['Hôm nay', 'Hôm qua', '7 ngày trước', 'Cũ hơn'];
const COLLAPSE_KEY = 'vc-ai-sidebar-collapsed';

function groupLabel(ts) {
  const d = new Date(ts);
  const today = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOf(today) - startOf(d)) / 86400000);
  if (diff <= 0) return GROUPS[0];
  if (diff === 1) return GROUPS[1];
  if (diff < 7) return GROUPS[2];
  return GROUPS[3];
}

function timeLabel(ts) {
  const d = new Date(ts);
  const g = groupLabel(ts);
  if (g === GROUPS[0] || g === GROUPS[1]) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: g === GROUPS[3] ? '2-digit' : undefined });
}

const readCollapsed = () => { try { return localStorage.getItem(COLLAPSE_KEY) === '1'; } catch { return false; } };
const writeCollapsed = (v) => { try { localStorage.setItem(COLLAPSE_KEY, v ? '1' : '0'); } catch { /* ignore */ } };

export default {
  title: 'Trợ lý AI V-Mentor',
  async mount(container, ctx) {
    const { signal } = ctx;
    let activeId = ctx.params.conversation || null;
    let query = '';
    const mobileMq = window.matchMedia('(max-width: 860px)');

    const search = h('input', { class: 'input input--sm', type: 'search', placeholder: 'Tìm trong lịch sử…', 'aria-label': 'Tìm cuộc trò chuyện' });
    const listEl = h('nav', { class: 'ai-history__list scroll-y', 'aria-label': 'Lịch sử trò chuyện' },
      h('div', { class: 'ai-history__loading', 'aria-hidden': 'true' }, [70, 88, 60, 80].map((w) => h('span', { class: 'skeleton', style: { width: `${w}%` } }))));
    const newBtn = h('button', { class: 'ai-new', type: 'button', onClick: () => { chat.newConversation(); activeId = null; history.replaceState(null, '', '#/ai'); renderList(); closeDrawer(); } },
      icon('plus'), h('span', null, 'Cuộc trò chuyện mới'));
    const collapseBtn = h('button', { class: 'btn btn--ghost btn--icon btn--sm ai-history__collapse', type: 'button', 'aria-label': 'Thu gọn lịch sử', title: 'Thu gọn lịch sử', onClick: () => toggleSidebar() }, icon('sidebar'));
    const footEl = h('div', { class: 'ai-history__foot' });
    const sidebar = h('aside', { class: 'ai-history', id: 'ai-history', 'aria-label': 'Lịch sử trò chuyện V-Mentor' },
      h('div', { class: 'ai-history__brand' }, mentorOrb('sm'), h('div', { class: 'ai-history__brandtext' }, h('strong', null, 'V-Mentor'), h('span', null, 'Trợ lý học lập trình')), collapseBtn),
      h('div', { class: 'ai-history__top' }, newBtn, h('div', { class: 'input-group ai-search' }, icon('search'), search)),
      listEl,
      footEl,
    );
    const scrim = h('div', { class: 'ai-scrim', 'aria-hidden': 'true', onClick: () => closeDrawer() });
    const toggle = h('button', { class: 'btn btn--ghost btn--icon btn--sm ai-history-toggle', type: 'button', 'aria-controls': 'ai-history', 'aria-label': 'Mở lịch sử trò chuyện', title: 'Lịch sử trò chuyện', onClick: () => toggleSidebar() }, icon('history'));
    const chatHost = h('section', { class: 'ai-main', 'aria-label': 'Khung trò chuyện' });
    const aurora = h('div', { class: 'ai-aurora', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'));
    const layout = h('div', { class: `ai-page ${readCollapsed() ? 'is-collapsed' : ''}` }, aurora, sidebar, h('div', { class: 'ai-main-wrap' }, chatHost), scrim);
    mount(container, layout);

    function syncToggle() {
      const mobile = mobileMq.matches;
      const open = mobile ? sidebar.classList.contains('is-open') : !layout.classList.contains('is-collapsed');
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Đóng lịch sử trò chuyện' : 'Mở lịch sử trò chuyện');
      layout.classList.toggle('is-drawer-open', mobile && open);
      sidebar.toggleAttribute('inert', !open);
    }
    function closeDrawer() { if (mobileMq.matches) { sidebar.classList.remove('is-open'); syncToggle(); } }
    function toggleSidebar() {
      if (mobileMq.matches) {
        sidebar.classList.toggle('is-open');
        syncToggle();
        if (sidebar.classList.contains('is-open')) setTimeout(() => search.focus({ preventScroll: true }), 50);
      } else {
        const collapsed = !layout.classList.contains('is-collapsed');
        layout.classList.toggle('is-collapsed', collapsed);
        writeCollapsed(collapsed);
        syncToggle();
      }
    }
    mobileMq.addEventListener('change', () => { sidebar.classList.remove('is-open'); syncToggle(); }, { signal });
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMq.matches && sidebar.classList.contains('is-open') && !document.querySelector('dialog[open]')) { e.preventDefault(); closeDrawer(); toggle.focus(); }
    }, { signal });
    syncToggle();

    function renderFoot() {
      const user = appState.get().user;
      mount(footEl, icon(user ? 'cloud' : 'database'),
        h('span', null, user ? 'Lịch sử được đồng bộ với tài khoản của bạn.' : 'Lịch sử lưu trên thiết bị này. Đăng nhập để đồng bộ.'));
    }
    renderFoot();
    appState.subscribe((s, p) => { if (s.user !== p.user) renderFoot(); }, { signal });

    // Content handed over from other pages (e.g. "Hỏi V-Mentor" in the IDE)
    const incoming = await kv.get('ai:incoming', null);
    if (incoming && Date.now() - incoming.at < 60000) await kv.del('ai:incoming');

    const chat = createChat(chatHost, {
      conversationId: activeId,
      mode: incoming?.mode || ctx.query.mode || 'tutor',
      context: incoming?.context || null,
      initialPrompt: incoming && Date.now() - incoming.at < 60000 ? incoming.prompt : (ctx.query.q || null),
      headerStart: toggle,
      onConversation: (id) => { activeId = id; history.replaceState(null, '', `#/ai/${id}`); renderList(); },
    });

    function convItem(c) {
      const m = modeById(c.mode);
      const questions = c.messages.filter((x) => x.role === 'user').length;
      const open = (e) => { e.preventDefault(); activeId = c.id; history.replaceState(null, '', `#/ai/${c.id}`); chat.load(c.id); renderList(); closeDrawer(); };
      return h('div', { class: `ai-conv ${c.id === activeId ? 'is-active' : ''}` },
        h('a', { class: 'ai-conv__link', href: `#/ai/${c.id}`, 'aria-current': c.id === activeId ? 'page' : undefined, onClick: open },
          h('span', { class: 'ai-conv__icon', title: m.label }, icon(m.icon)),
          h('span', { class: 'ai-conv__text' },
            h('span', { class: 'ai-conv__title truncate' }, c.title || 'Cuộc trò chuyện'),
            h('span', { class: 'ai-conv__meta' }, `${m.short} · ${questions} câu hỏi · ${timeLabel(c.updatedAt)}`))),
        h('div', { class: 'ai-conv__actions' },
          h('button', { class: 'btn btn--ghost btn--icon btn--sm', type: 'button', 'aria-label': `Đổi tên “${c.title}”`, title: 'Đổi tên', onClick: async () => {
            const t = await promptDialog({ title: 'Đổi tên cuộc trò chuyện', label: 'Tên mới', value: c.title });
            if (t) { await renameConversation(c.id, t); toast('Đã đổi tên.', { duration: 1500 }); }
          } }, icon('edit')),
          h('button', { class: 'btn btn--ghost btn--icon btn--sm ai-conv__del', type: 'button', 'aria-label': `Xóa “${c.title}”`, title: 'Xóa', onClick: async () => {
            if (await confirmDialog({ title: 'Xóa cuộc trò chuyện?', message: `"${c.title}" sẽ bị xóa vĩnh viễn (cả trên các thiết bị đã đồng bộ).`, confirmLabel: 'Xóa', danger: true })) {
              await deleteConversation(c.id);
              if (c.id === activeId) { activeId = null; chat.newConversation(); history.replaceState(null, '', '#/ai'); }
            }
          } }, icon('trash'))));
    }

    async function renderList() {
      const items = await listConversations({ query });
      if (signal.aborted) return;
      if (!items.length) {
        mount(listEl, h('div', { class: 'ai-history__empty' },
          icon(query ? 'search' : 'messages'),
          h('p', null, query ? 'Không tìm thấy cuộc trò chuyện phù hợp.' : 'Chưa có cuộc trò chuyện nào. Hãy đặt câu hỏi đầu tiên!')));
        return;
      }
      const groups = new Map(GROUPS.map((g) => [g, []]));
      for (const c of items) groups.get(groupLabel(c.updatedAt)).push(c);
      mount(listEl, [...groups.entries()].filter(([, convs]) => convs.length).map(([label, convs]) => h('section', { class: 'ai-history__group', 'aria-label': label },
        h('h3', { class: 'ai-history__label' }, h('span', null, label), h('span', { class: 'ai-history__count' }, String(convs.length))),
        convs.map(convItem))));
    }

    search.addEventListener('input', debounce(() => { query = search.value; renderList(); }, 200), { signal });
    search.addEventListener('keydown', (e) => { if (e.key === 'Escape' && search.value) { e.preventDefault(); e.stopPropagation(); search.value = ''; query = ''; renderList(); } }, { signal });
    bus.on('conversations:change', () => renderList(), { signal });
    await renderList();
    chat.focus();
    return () => chat.destroy();
  },
};
