// V-Code Edu — "V-Bot": the floating V-Mentor robot shown on every page.
//
// • Always visible, draggable anywhere (mouse, touch, pen; arrow keys when focused). Position is remembered
//   per device as viewport ratios and re-clamped on resize.
// • Click / Enter → opens a real AI quick-chat panel (same backend gateway, same 7 modes, same history as the
//   full "Trợ lý AI" page; conversations can be continued full-screen). Optional: attach the code that is
//   open in the current editor as context. Offline: uses the in-browser model when it is loaded, otherwise
//   says so honestly — never a canned answer.
// • On the /ai page a click focuses the main chat composer instead of opening a second chat.
import { h, s, mount } from '../core/dom.js';
import { icon } from './icons.js';
import { appState, bus } from '../core/store.js';
import { navigate } from '../core/router.js';

const POS_KEY = 'vc-vbot-pos';
const GREET_KEY = 'vc-vbot-greeted';
const SIZE = 68;
const MARGIN = 10;

/** True when the backend reports at least one configured (available) AI provider. */
function hasProvider(backend) {
  return (backend?.providers || []).some((p) => (typeof p === 'string' ? true : p?.available));
}

function readPos() {
  try { const p = JSON.parse(localStorage.getItem(POS_KEY) || 'null'); if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return p; } catch { /* ignore */ }
  return null;
}
function writePos(p) { try { localStorage.setItem(POS_KEY, JSON.stringify(p)); } catch { /* ignore */ } }

/** Original robot illustration (SVG). Eyes are separate groups so they can follow the pointer and blink. */
function robotSvg(idPrefix = 'vb') {
  const g = (id) => `${idPrefix}-${id}`;
  const svg = s('svg', { class: 'vbot__svg', viewBox: '0 0 120 132', 'aria-hidden': 'true' });
  svg.innerHTML = `
    <defs>
      <linearGradient id="${g('body')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8b9cff"/><stop offset="0.55" stop-color="#5b5bf0"/><stop offset="1" stop-color="#4338ca"/></linearGradient>
      <linearGradient id="${g('head')}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#dfe5ff"/></linearGradient>
      <linearGradient id="${g('visor')}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2160"/><stop offset="1" stop-color="#0b0f33"/></linearGradient>
      <radialGradient id="${g('eye')}" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="#e0fbff"/><stop offset="0.45" stop-color="#5eead4"/><stop offset="1" stop-color="#06b6d4"/></radialGradient>
      <radialGradient id="${g('bulb')}" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#fff"/><stop offset="0.5" stop-color="#f0abfc"/><stop offset="1" stop-color="#c026d3"/></radialGradient>
    </defs>
    <ellipse class="vbot__shadow" cx="60" cy="126" rx="30" ry="5"/>
    <g class="vbot__antenna">
      <path d="M60 22 V8" stroke="#a5b4fc" stroke-width="4" stroke-linecap="round"/>
      <circle class="vbot__bulb" cx="60" cy="7" r="6.5" fill="url(#${g('bulb')})"/>
    </g>
    <g class="vbot__arm vbot__arm--l"><path d="M24 86 q-12 6 -14 18" stroke="url(#${g('body')})" stroke-width="9" stroke-linecap="round" fill="none"/><circle cx="10" cy="105" r="6" fill="#c7d2fe"/></g>
    <g class="vbot__arm vbot__arm--r"><path d="M96 86 q12 6 14 18" stroke="url(#${g('body')})" stroke-width="9" stroke-linecap="round" fill="none"/><circle cx="110" cy="105" r="6" fill="#c7d2fe"/></g>
    <rect x="28" y="74" width="64" height="44" rx="18" fill="url(#${g('body')})"/>
    <rect x="44" y="86" width="32" height="18" rx="8" fill="#1e1b4b" opacity="0.55"/>
    <circle class="vbot__heart" cx="60" cy="95" r="5" fill="#5eead4"/>
    <rect x="50" y="66" width="20" height="10" rx="4" fill="#a5b4fc"/>
    <g class="vbot__head">
      <rect x="10" y="22" width="100" height="50" rx="24" fill="url(#${g('head')})"/>
      <rect x="4" y="38" width="10" height="20" rx="5" fill="#a5b4fc"/>
      <rect x="106" y="38" width="10" height="20" rx="5" fill="#a5b4fc"/>
      <rect x="20" y="30" width="80" height="34" rx="17" fill="url(#${g('visor')})"/>
      <g class="vbot__eyes">
        <g class="vbot__eye"><ellipse cx="44" cy="47" rx="8" ry="9" fill="url(#${g('eye')})"/><circle cx="46.5" cy="44" r="2.4" fill="#fff"/></g>
        <g class="vbot__eye"><ellipse cx="76" cy="47" rx="8" ry="9" fill="url(#${g('eye')})"/><circle cx="78.5" cy="44" r="2.4" fill="#fff"/></g>
      </g>
      <path class="vbot__mouth" d="M53 57 q7 5 14 0" stroke="#5eead4" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <ellipse cx="30" cy="57" rx="4" ry="2.4" fill="#f9a8d4" opacity="0.55"/>
      <ellipse cx="90" cy="57" rx="4" ry="2.4" fill="#f9a8d4" opacity="0.55"/>
    </g>`;
  return svg;
}

export function initVBot() {
  if (document.querySelector('.vbot')) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- the robot button ----------
  const bubble = h('div', { class: 'vbot-bubble', role: 'status', hidden: true });
  const badge = h('span', { class: 'vbot__badge', hidden: true }, '1');
  const btn = h('button', {
    class: 'vbot', type: 'button', 'aria-label': 'V-Mentor — trợ lý AI. Bấm để trò chuyện, kéo để di chuyển (phím mũi tên khi đang chọn).',
    title: 'V-Mentor · bấm để hỏi, kéo để di chuyển',
  }, h('span', { class: 'vbot__halo', 'aria-hidden': 'true' }), robotSvg('vbm'), badge);
  document.body.append(btn, bubble);

  let pos = readPos();
  const place = (x, y, { save = false } = {}) => {
    const maxX = window.innerWidth - SIZE - MARGIN;
    const maxY = window.innerHeight - SIZE - MARGIN;
    const cx = Math.max(MARGIN, Math.min(maxX, x));
    const cy = Math.max(MARGIN + 56, Math.min(maxY, y));
    btn.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    btn.dataset.side = cx + SIZE / 2 > window.innerWidth / 2 ? 'right' : 'left';
    current = { x: cx, y: cy };
    if (save) { pos = { x: cx / window.innerWidth, y: cy / window.innerHeight }; writePos(pos); }
    positionBubble();
    if (panelOpen) positionPanel();
  };
  let current = { x: 0, y: 0 };
  const placeFromSaved = () => {
    if (pos) { place(pos.x * window.innerWidth, pos.y * window.innerHeight); return; }
    // Default corner. On narrow screens and on pages with a bottom composer (AI chat), sit above it so the
    // robot never covers the send button.
    let y = window.innerHeight - SIZE - (window.innerWidth < 720 ? 104 : 22);
    const composer = document.querySelector('[data-chat-input]');
    if (composer) {
      const r = (composer.closest('form') || composer).getBoundingClientRect();
      if (r.width && r.right > window.innerWidth - SIZE - 30) y = Math.min(y, r.top - SIZE - 12);
    }
    place(window.innerWidth - SIZE - 18, y);
  };
  bus.on('route:mounted', () => { if (!pos) setTimeout(placeFromSaved, 120); });

  // ---------- drag (pointer events) ----------
  let drag = null;
  btn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, ox: current.x, oy: current.y, moved: false, lastX: e.clientX, t: performance.now() };
    btn.setPointerCapture(e.pointerId);
  });
  btn.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.sx;
    const dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) < 6) return;
    if (!drag.moved) { drag.moved = true; btn.classList.add('is-dragging'); hideBubble(); }
    const vx = e.clientX - drag.lastX;
    drag.lastX = e.clientX;
    btn.style.setProperty('--tilt', `${Math.max(-18, Math.min(18, vx * 1.6))}deg`);
    place(drag.ox + dx, drag.oy + dy);
  });
  const endDrag = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const wasMoved = drag.moved;
    drag = null;
    btn.classList.remove('is-dragging');
    btn.style.setProperty('--tilt', '0deg');
    if (wasMoved) {
      place(current.x, current.y, { save: true });
      btn.classList.add('is-landing');
      setTimeout(() => btn.classList.remove('is-landing'), 500);
      btn._suppressClick = true;
      setTimeout(() => { btn._suppressClick = false; }, 0);
    }
  };
  btn.addEventListener('pointerup', endDrag);
  btn.addEventListener('pointercancel', endDrag);
  btn.addEventListener('click', (e) => {
    if (btn._suppressClick) { e.preventDefault(); return; }
    activate();
  });
  btn.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 60 : 20;
    const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    if (moves[e.key]) {
      e.preventDefault();
      place(current.x + moves[e.key][0], current.y + moves[e.key][1], { save: true });
    }
  });
  window.addEventListener('resize', () => placeFromSaved(), { passive: true });

  // eyes follow the pointer
  if (!reduced) {
    const eyes = btn.querySelector('.vbot__eyes');
    let raf = 0;
    let px = 0;
    let py = 0;
    window.addEventListener('pointermove', (e) => {
      px = e.clientX; py = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const cx = current.x + SIZE / 2;
        const cy = current.y + SIZE * 0.36;
        const ang = Math.atan2(py - cy, px - cx);
        const dist = Math.min(1, Math.hypot(px - cx, py - cy) / 300);
        eyes.style.transform = `translate(${(Math.cos(ang) * 4 * dist).toFixed(2)}px, ${(Math.sin(ang) * 3 * dist).toFixed(2)}px)`;
      });
    }, { passive: true });
  }

  // ---------- greeting bubble (once per device) ----------
  let bubbleTimer = 0;
  function positionBubble() {
    if (bubble.hidden) return;
    const right = btn.dataset.side === 'right';
    bubble.dataset.side = right ? 'right' : 'left';
    const bw = bubble.offsetWidth || 240;
    const x = right ? current.x - bw - 10 : current.x + SIZE + 10;
    bubble.style.transform = `translate3d(${Math.max(8, Math.min(window.innerWidth - bw - 8, x))}px, ${current.y + 6}px, 0)`;
  }
  function showBubble(text, ms = 6000) {
    mount(bubble, text);
    bubble.hidden = false;
    positionBubble();
    clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(hideBubble, ms);
  }
  function hideBubble() { bubble.hidden = true; clearTimeout(bubbleTimer); }
  bubble.addEventListener('click', () => { hideBubble(); activate(); });

  // ---------- quick-chat panel ----------
  let panel = null;
  let panelOpen = false;
  let ui = null;

  function positionPanel() {
    if (!panel) return;
    if (window.innerWidth < 560) { panel.style.transform = ''; panel.classList.add('is-sheet'); return; }
    panel.classList.remove('is-sheet');
    const w = panel.offsetWidth || 400;
    const ph = panel.offsetHeight || 560;
    const right = btn.dataset.side === 'right';
    let x = right ? current.x - w - 14 : current.x + SIZE + 14;
    x = Math.max(10, Math.min(window.innerWidth - w - 10, x));
    let y = current.y + SIZE - ph;
    y = Math.max(70, Math.min(window.innerHeight - ph - 10, y));
    panel.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    panel.style.transformOrigin = right ? '100% 100%' : '0 100%';
  }

  async function buildPanel() {
    const [{ AI_MODES, modeById, localSystemPrompt }, { streamChat, AIError }, conv, md, local] = await Promise.all([
      import('../services/ai-modes.js'), import('../services/ai-client.js'), import('../services/conversations.js'),
      import('./markdown.js'), import('../services/local-ai.js'),
    ]);
    let mode = 'tutor';
    let conversation = null;
    let streaming = null;
    let attachCode = false;

    const modeSel = h('select', { class: 'vbot-panel__mode', 'aria-label': 'Chế độ của V-Mentor' }, AI_MODES.map((m) => h('option', { value: m.id }, m.label)));
    const statusEl = h('span', { class: 'vbot-panel__status' });
    const list = h('div', { class: 'vbot-panel__list', role: 'log', 'aria-live': 'polite' });
    const input = h('textarea', { class: 'vbot-panel__input', rows: 1, placeholder: 'Hỏi V-Mentor bất cứ điều gì…', 'aria-label': 'Câu hỏi cho V-Mentor', maxlength: 4000 });
    const sendBtn = h('button', { class: 'vbot-panel__send', type: 'submit', 'aria-label': 'Gửi' }, icon('send'));
    const stopBtn = h('button', { class: 'vbot-panel__send vbot-panel__send--stop', type: 'button', 'aria-label': 'Dừng', hidden: true, onClick: () => streaming?.abort() }, icon('stop'));
    const codeChip = h('button', { class: 'vbot-chip', type: 'button', hidden: true, 'aria-pressed': 'false', onClick: () => {
      attachCode = !attachCode;
      codeChip.setAttribute('aria-pressed', String(attachCode));
      codeChip.classList.toggle('is-on', attachCode);
    } }, icon('code'), 'Đính kèm code đang mở');

    const head = h('div', { class: 'vbot-panel__head' },
      h('span', { class: 'vbot-panel__avatar' }, robotSvg('vbp')),
      h('div', { class: 'vbot-panel__title' }, h('strong', null, 'V-Mentor'), statusEl),
      h('div', { class: 'vbot-panel__tools' },
        h('button', { class: 'vbot-icon-btn', type: 'button', title: 'Cuộc trò chuyện mới', 'aria-label': 'Cuộc trò chuyện mới', onClick: () => { streaming?.abort(); conversation = null; renderMessages(); input.focus(); } }, icon('plus')),
        h('button', { class: 'vbot-icon-btn', type: 'button', title: 'Mở toàn màn hình', 'aria-label': 'Mở trong trang Trợ lý AI', onClick: () => { closePanel(); navigate(conversation ? `/ai/${conversation.id}` : '/ai'); } }, icon('maximize')),
        h('button', { class: 'vbot-icon-btn', type: 'button', title: 'Đóng', 'aria-label': 'Đóng', onClick: () => closePanel() }, icon('x'))));
    const form = h('form', { class: 'vbot-panel__composer', onSubmit: (e) => { e.preventDefault(); send(input.value); } }, input, sendBtn, stopBtn);
    const el = h('section', { class: 'vbot-panel', role: 'dialog', 'aria-label': 'Trò chuyện nhanh với V-Mentor' },
      head,
      h('div', { class: 'vbot-panel__bar' }, modeSel, codeChip),
      list,
      form,
      h('div', { class: 'vbot-panel__foot' },
        h('span', null, icon('shield'), 'Khóa API nằm an toàn trên máy chủ'),
        h('button', { type: 'button', class: 'vbot-link', onClick: () => { pos = null; try { localStorage.removeItem(POS_KEY); } catch { /* ignore */ } placeFromSaved(); } }, 'Đưa robot về góc')));
    document.body.appendChild(el);

    modeSel.addEventListener('change', () => { mode = modeSel.value; renderMessages(); });
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = `${Math.min(140, input.scrollHeight)}px`; });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(input.value); }
      if (e.key === 'Escape') { if (streaming) streaming.abort(); else closePanel(); }
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Escape' && e.target !== input) closePanel(); });

    function editorCode() {
      const ta = document.querySelector('.page-root .code-editor__input');
      if (!ta || !ta.value.trim()) return null;
      const langEl = document.querySelector('[aria-label="Ngôn ngữ"]');
      return { code: ta.value.slice(0, 8000), language: langEl?.value || (location.hash.includes('/challenges/') ? 'python' : undefined) };
    }

    function refreshStatus() {
      const { online, backend } = appState.get();
      const localReady = local.localStatus().state === 'ready';
      let text = 'Đang kiểm tra máy chủ AI…';
      let state = 'wait';
      if (backend.reachable && hasProvider(backend)) { text = 'Sẵn sàng trả lời'; state = 'ok'; }
      else if (localReady) { text = 'AI trên trình duyệt (ngoại tuyến)'; state = 'ok'; }
      else if (backend.missing) { text = 'Chưa cấu hình máy chủ AI cho trang này'; state = 'off'; }
      else if (!online) { text = 'Ngoại tuyến — cần Internet hoặc AI trên trình duyệt'; state = 'off'; }
      else if (backend.checkedAt && !backend.reachable) { text = 'Chưa kết nối được máy chủ AI'; state = 'off'; }
      else if (backend.reachable) { text = 'Máy chủ chưa cấu hình khóa AI'; state = 'off'; }
      statusEl.textContent = text;
      statusEl.dataset.state = state;
      codeChip.hidden = !editorCode();
    }

    function msgEl(m) {
      if (m.role === 'user') return h('div', { class: 'vbot-msg vbot-msg--user' }, h('div', { class: 'vbot-msg__bubble' }, m.content));
      const body = h('div', { class: 'vbot-msg__bubble prose' });
      if (m.error) mount(body, h('div', { class: 'callout callout--danger' }, icon('alert'), h('div', null, m.error)));
      else if (m.content) body.innerHTML = md.markdown(m.content);
      else mount(body, h('span', { class: 'vbot-typing' }, h('i'), h('i'), h('i')));
      if (m.content && !m.error) { try { md.enhanceMarkdown(body); } catch { /* optional */ } }
      return h('div', { class: 'vbot-msg vbot-msg--ai' }, h('span', { class: 'vbot-msg__avatar' }, robotSvg(`vbx${Math.random().toString(36).slice(2, 7)}`)), body);
    }

    function renderMessages() {
      const msgs = conversation?.messages || [];
      if (!msgs.length) {
        const m = modeById(mode);
        mount(list, h('div', { class: 'vbot-welcome' },
          h('div', { class: 'vbot-welcome__hi' }, 'Chào bạn! Mình là V-Mentor 👋'),
          h('p', null, `Chế độ “${m.label}”: ${m.description}`),
          h('div', { class: 'vbot-welcome__chips' }, (m.suggestions || []).map((q) => h('button', { class: 'vbot-chip', type: 'button', onClick: () => send(q) }, q)))));
        return;
      }
      mount(list, msgs.map(msgEl));
      list.scrollTop = list.scrollHeight;
    }

    async function send(text) {
      const q = String(text || '').trim();
      if (!q || streaming) return;
      input.value = '';
      input.style.height = 'auto';
      if (!conversation) conversation = await conv.createConversation({ mode });
      conversation.mode = mode;
      conversation.messages.push({ role: 'user', content: q, createdAt: Date.now() });
      if (conversation.autoTitle !== false && conversation.messages.length === 1) conversation.title = conv.deriveTitle(q);
      const ai = { role: 'assistant', content: '' };
      conversation.messages.push(ai);
      renderMessages();
      const aiNode = list.lastElementChild;
      const bodyNode = aiNode.querySelector('.vbot-msg__bubble');
      streaming = new AbortController();
      const my = streaming;
      sendBtn.hidden = true; stopBtn.hidden = false;
      btn.classList.add('is-thinking');
      el.classList.add('is-streaming');
      let paintQueued = false;
      const paint = () => {
        if (paintQueued) return;
        paintQueued = true;
        requestAnimationFrame(() => { paintQueued = false; if (ai.content) { bodyNode.innerHTML = md.markdown(ai.content); list.scrollTop = list.scrollHeight; } });
      };
      const context = attachCode ? editorCode() : null;
      const history = conversation.messages.filter((m) => m !== ai);
      const { backend } = appState.get();
      const useLocal = local.localStatus().state === 'ready' && !(backend.reachable && hasProvider(backend));
      try {
        if (useLocal) {
          ai.provider = 'browser';
          for await (const chunk of local.streamLocal({ messages: history.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })), system: localSystemPrompt(mode, context), signal: my.signal })) { ai.content += chunk; paint(); }
        } else {
          for await (const ev of streamChat({ messages: history, mode, context, signal: my.signal })) {
            if (ev.type === 'meta') { ai.provider = ev.data.provider; ai.model = ev.data.model; }
            else if (ev.type === 'delta') { ai.content += ev.data.text || ''; paint(); }
            else if (ev.type === 'error') throw new AIError(ev.data.code, ev.data.message);
          }
        }
        if (!ai.content.trim()) throw new AIError('empty', 'Mô hình không trả về nội dung. Hãy thử lại.');
      } catch (err) {
        if (err?.name === 'AbortError' || my.signal.aborted) ai.content = ai.content ? `${ai.content}\n\n_(Đã dừng)_` : '_(Đã dừng)_';
        else ai.error = err?.message || String(err);
      } finally {
        streaming = null;
        sendBtn.hidden = false; stopBtn.hidden = true;
        btn.classList.remove('is-thinking');
        el.classList.remove('is-streaming');
        ai.createdAt = Date.now();
        await conv.saveConversation(conversation).catch(() => {});
        renderMessages();
        if (!panelOpen) { badge.hidden = false; btn.classList.add('has-news'); }
        input.focus({ preventScroll: true });
      }
    }

    appState.subscribe((st, prev) => { if (st.backend !== prev.backend || st.online !== prev.online) refreshStatus(); });
    local.onLocalStatus?.(() => refreshStatus());
    bus.on('route:mounted', () => setTimeout(refreshStatus, 200));
    renderMessages();
    refreshStatus();
    return { el, input, refreshStatus };
  }

  async function openPanel() {
    if (!ui) {
      btn.classList.add('is-loading');
      try {
        ui = await buildPanel();
        panel = ui.el;
      } catch (err) {
        console.warn('[vbot] panel failed', err);
        btn.classList.remove('is-loading');
        navigate('/ai');
        return;
      }
      btn.classList.remove('is-loading');
    }
    panelOpen = true;
    badge.hidden = true;
    btn.classList.remove('has-news');
    btn.setAttribute('aria-expanded', 'true');
    ui.refreshStatus();
    panel.classList.add('is-open');
    positionPanel();
    setTimeout(() => ui.input.focus({ preventScroll: true }), 60);
  }
  function closePanel() {
    if (!panel) return;
    panelOpen = false;
    panel.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.focus({ preventScroll: true });
  }
  // The panel intentionally stays open while the user keeps working on the page (e.g. reading code while
  // asking); it closes via its own controls, Esc, or clicking the robot again.

  function activate() {
    hideBubble();
    btn.classList.remove('is-wave');
    void btn.offsetWidth;
    btn.classList.add('is-wave');
    if (/^#\/ai(\/|$|\?)/.test(location.hash)) {
      const composer = document.querySelector('[data-chat-input], .chat textarea');
      if (composer) {
        composer.focus();
        composer.classList.add('is-vbot-focus');
        setTimeout(() => composer.classList.remove('is-vbot-focus'), 900);
        showBubble('Bạn đang ở trang Trợ lý AI — hãy gõ câu hỏi vào ô bên dưới nhé!', 3500);
        return;
      }
    }
    if (panelOpen) closePanel(); else openPanel();
  }

  // ---------- reactions ----------
  bus.on('route:change', () => {
    btn.classList.remove('is-hop');
    void btn.offsetWidth;
    btn.classList.add('is-hop');
  });
  bus.on('net:offline', () => btn.classList.add('is-offline'));
  bus.on('net:online', () => btn.classList.remove('is-offline'));
  if (!appState.get().online) btn.classList.add('is-offline');

  placeFromSaved();
  requestAnimationFrame(() => btn.classList.add('is-ready'));
  let greeted = false;
  try { greeted = localStorage.getItem(GREET_KEY) === '1'; } catch { /* ignore */ }
  if (!greeted && !navigator.webdriver) {
    setTimeout(() => {
      showBubble('Chào bạn! Mình là V-Mentor. Kéo mình đi đâu cũng được — bấm vào mình để hỏi bài nhé!', 7000);
      try { localStorage.setItem(GREET_KEY, '1'); } catch { /* ignore */ }
    }, document.documentElement.classList.contains('has-intro') ? 4200 : 1800);
  }

  return { open: openPanel, close: closePanel };
}
