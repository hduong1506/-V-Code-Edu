// V-Code Edu — AI chat component (used by the full AI page and the IDE side drawer).
import { h, mount, throttle, uid } from '../core/dom.js';
import { icon } from './icons.js';
import { markdown, enhanceMarkdown } from './markdown.js';
import { toast, copyText } from '../core/ui.js';
import { appState, bus } from '../core/store.js';
import { AI_MODES, modeById, localSystemPrompt } from '../services/ai-modes.js';
import { streamChat, fetchProviders, AIError } from '../services/ai-client.js';
import { isWebGPUAvailable, onLocalStatus, streamLocal, localStatus, loadLocalModel, wasDownloaded } from '../services/local-ai.js';
import { createConversation, getConversation, saveConversation, deriveTitle } from '../services/conversations.js';

const PROVIDER_KEY = 'vc-ai-provider';
export const PROVIDER_CHOICES = [
  { id: 'auto', label: 'Tự động', hint: 'Dùng AI đám mây; nếu không có thì dùng AI cục bộ.' },
  { id: 'cloud', label: 'AI đám mây', hint: 'Mô hình mạnh qua máy chủ V-Code (cần Internet).' },
  { id: 'local', label: 'Máy chủ cục bộ', hint: 'Mô hình chạy trên máy chủ của trường/phòng máy (Ollama) — dùng được không cần Internet.' },
  { id: 'browser', label: 'AI trên trình duyệt', hint: 'Mô hình nhỏ chạy ngay trên máy bạn (WebGPU). Tải một lần, sau đó dùng offline.' },
];

function getProviderChoice() {
  try { return localStorage.getItem(PROVIDER_KEY) || 'auto'; } catch { return 'auto'; }
}
function setProviderChoice(v) {
  try { localStorage.setItem(PROVIDER_KEY, v); } catch { /* ignore */ }
}

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** V-Mentor avatar: a CSS-animated orb (pulses while the parent message/chat is streaming). */
export function mentorOrb(size = '') {
  return h('span', { class: `vm-orb ${size ? `vm-orb--${size}` : ''}`, 'aria-hidden': 'true' },
    h('span', { class: 'vm-orb__swirl' }), h('span', { class: 'vm-orb__core' }), h('span', { class: 'vm-orb__ring' }));
}

/** Put a blinking caret at the end of the last text-bearing element of rendered markdown. */
function placeCaret(root) {
  let node = root;
  for (;;) {
    const last = node.lastElementChild;
    if (!last || last.matches('br, input, svg, img, hr')) break;
    if (last.matches('.code-block')) { node = last.querySelector('pre code') || last; break; }
    if (last.matches('table')) { node = last.querySelector('tbody tr:last-child td:last-child') || last.querySelector('th:last-child') || last; break; }
    node = last;
  }
  node.appendChild(h('span', { class: 'caret', 'aria-hidden': 'true' }));
}

function skeletonLines(n = 3) {
  return h('div', { class: 'chat-skeleton', 'aria-hidden': 'true' }, Array.from({ length: n }, (_, i) => h('span', { class: 'skeleton', style: { width: `${[92, 78, 54, 86][i % 4]}%` } })));
}

/**
 * createChat(container, { conversationId, mode, context, compact, onConversation(id), headerStart, initialPrompt, onOpenCode })
 */
export function createChat(container, opts = {}) {
  const ac = new AbortController();
  const { signal } = ac;
  const compact = Boolean(opts.compact);
  let conversation = null;
  let mode = opts.mode || 'tutor';
  let context = opts.context || null;
  let provider = getProviderChoice();
  let streaming = null; // AbortController of the active request

  // ---------- header ----------
  const modeSelect = h('select', { class: 'select select--sm chat-select', 'aria-label': 'Chế độ trợ lý' }, AI_MODES.map((m) => h('option', { value: m.id }, m.label)));
  const providerSelect = h('select', { class: 'select select--sm chat-select', 'aria-label': 'Nguồn AI' }, PROVIDER_CHOICES.map((p) => h('option', { value: p.id, title: p.hint }, p.label)));
  modeSelect.value = mode;
  providerSelect.value = provider;
  const statusEl = h('span', { class: 'chat-status', role: 'status' });
  const modeLabel = h('span', { class: 'chat-title__mode' });

  modeSelect.addEventListener('change', () => setMode(modeSelect.value, { persist: true }));
  providerSelect.addEventListener('change', () => {
    provider = providerSelect.value;
    setProviderChoice(provider);
    providerSelect.title = PROVIDER_CHOICES.find((p) => p.id === provider)?.hint || '';
    updateStatus();
    if (provider === 'browser') maybeOfferLocalDownload();
  });
  providerSelect.title = PROVIDER_CHOICES.find((p) => p.id === provider)?.hint || '';

  const header = h('div', { class: 'chat-header' },
    opts.headerStart || null,
    compact ? null : h('div', { class: 'chat-title' }, mentorOrb('sm'), h('div', { class: 'chat-title__text' }, h('strong', null, 'V-Mentor'), modeLabel)),
    h('div', { class: 'chat-header__controls' },
      h('label', { class: 'chat-field' }, icon('wand'), modeSelect),
      h('label', { class: 'chat-field' }, icon('cpu'), providerSelect)),
    statusEl,
  );

  // ---------- messages ----------
  const list = h('div', { class: 'chat-messages scroll-y', role: 'log', 'aria-live': 'polite', 'aria-relevant': 'additions', tabindex: '0', 'aria-label': 'Nội dung trò chuyện' });
  const jumpBtn = h('button', { class: 'chat-jump', type: 'button', hidden: true, 'aria-label': 'Cuộn xuống tin nhắn mới nhất', onClick: () => { stickToBottom = true; scrollDown(true, true); } }, icon('chevron-down'), h('span', null, 'Mới nhất'));
  const scroller = h('div', { class: 'chat-scroller' }, list, jumpBtn);
  let stickToBottom = true;
  let lastTop = 0;
  const distance = () => list.scrollHeight - list.scrollTop - list.clientHeight;
  const updateJump = () => { jumpBtn.hidden = distance() < 120 || !list.querySelector('.msg'); };
  list.addEventListener('scroll', () => {
    const d = distance();
    // Only an upward scroll by the user releases auto-follow; reaching the bottom re-engages it.
    if (list.scrollTop < lastTop - 2 && d > 48) stickToBottom = false;
    else if (d < 48) stickToBottom = true;
    lastTop = list.scrollTop;
    updateJump();
  }, { passive: true, signal });
  function scrollDown(force = false, smooth = false) {
    if (!(force || stickToBottom)) { updateJump(); return; }
    if (smooth && !reducedMotion()) list.scrollTo({ top: list.scrollHeight, behavior: 'smooth' });
    else list.scrollTop = list.scrollHeight;
    lastTop = list.scrollTop;
    updateJump();
  }

  // ---------- composer ----------
  const ctxChip = h('div', { class: 'chat-context', hidden: true });
  const input = h('textarea', { class: 'chat-input', rows: 1, maxlength: 12000, placeholder: compact ? 'Hỏi V-Mentor…' : 'Hỏi V-Mentor bất cứ điều gì về lập trình…', 'aria-label': 'Nội dung câu hỏi', 'data-chat-input': '' });
  const sendBtn = h('button', { class: 'chat-send', type: 'submit', 'aria-label': 'Gửi (Enter)', title: 'Gửi (Enter)' }, icon('send'));
  const stopBtn = h('button', { class: 'chat-stop', type: 'button', 'aria-label': 'Dừng tạo câu trả lời (Esc)', title: 'Dừng (Esc)', hidden: true, onClick: () => streaming?.abort() }, h('span', { class: 'chat-stop__sq' }), h('span', null, 'Dừng'));
  const counter = h('span', { class: 'chat-counter' });
  const composer = h('form', { class: 'chat-composer', onSubmit: (e) => { e.preventDefault(); send(); } },
    ctxChip,
    h('div', { class: 'chat-composer__box' }, input, h('div', { class: 'chat-composer__actions' }, stopBtn, sendBtn)),
    h('div', { class: 'chat-composer__foot' },
      compact ? null : h('span', { class: 'chat-keys' },
        h('kbd', { class: 'kbd' }, 'Enter'), ' gửi · ', h('kbd', { class: 'kbd' }, 'Shift'), '+', h('kbd', { class: 'kbd' }, 'Enter'), ' xuống dòng · ', h('kbd', { class: 'kbd' }, 'Esc'), ' dừng'),
      h('span', { class: 'chat-disclaimer' }, 'AI có thể sai — hãy kiểm tra lại thông tin quan trọng.'), counter),
  );
  const autosize = () => {
    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, compact ? 160 : 240)}px`;
    counter.textContent = input.value.length > 2000 ? `${input.value.length.toLocaleString('vi-VN')}/12.000` : '';
    root.classList.toggle('has-text', Boolean(input.value.trim()));
  };
  input.addEventListener('input', autosize, { signal });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    else if (e.key === 'Escape' && streaming) { e.preventDefault(); e.stopPropagation(); streaming.abort(); }
  }, { signal });

  const root = h('div', { class: `chat ${compact ? 'chat--compact' : 'chat--full'}` }, header, scroller, composer);
  mount(container, root);
  mount(list, h('div', { class: 'chat-loading' }, skeletonLines(2), skeletonLines(3)));

  // Esc anywhere on the full page stops generation (dialogs handle their own Esc).
  if (!compact) {
    window.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape' || !streaming || e.defaultPrevented) return;
      if (document.querySelector('dialog[open]')) return;
      streaming.abort();
    }, { signal });
  } else {
    root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && streaming) { e.stopPropagation(); streaming.abort(); } }, { signal });
  }

  // ---------- context chip ----------
  function renderContext() {
    if (!context || (!context.code && !context.error)) { ctxChip.hidden = true; return; }
    ctxChip.hidden = false;
    const lines = (context.code || '').split('\n').length;
    mount(ctxChip,
      icon('code'),
      h('span', { class: 'grow truncate' }, `Đính kèm: ${context.lesson ? `${context.lesson.split('\n')[0]} · ` : ''}${context.code ? `${lines} dòng ${context.language || 'code'}` : ''}${context.error ? ' · có thông báo lỗi' : ''}`),
      h('button', { class: 'btn btn--ghost btn--sm btn--icon', type: 'button', 'aria-label': 'Bỏ đính kèm', onClick: () => { context = null; renderContext(); } }, icon('x')),
    );
  }

  // ---------- status (honest: which source will answer, and whether it is available) ----------
  function updateStatus() {
    const { online, backend } = appState.get();
    let text = '';
    let cls = '';
    let ic = 'cloud';
    if (provider === 'browser') {
      const st = localStatus();
      ic = 'monitor';
      text = !isWebGPUAvailable() ? 'Trình duyệt không hỗ trợ WebGPU' : st.state === 'ready' ? 'AI trên trình duyệt: sẵn sàng (offline)' : st.state === 'loading' ? `Đang tải mô hình ${st.progress}%` : 'AI trên trình duyệt (chưa tải)';
      cls = st.state === 'ready' ? 'is-ok' : st.state === 'error' || !isWebGPUAvailable() ? 'is-bad' : 'is-warn';
    } else if (!backend.reachable) {
      ic = 'cloud-off';
      text = online ? 'Chưa kết nối máy chủ AI' : 'Ngoại tuyến — AI đám mây không khả dụng';
      cls = 'is-bad';
    } else {
      const avail = (backend.providers || []).filter((p) => p.available);
      const cloud = avail.filter((p) => p.kind === 'cloud');
      const local = avail.filter((p) => p.kind === 'local');
      if (provider === 'local') { ic = 'database'; text = local.length ? `Máy chủ cục bộ: ${local[0].id}` : 'Máy chủ chưa cấu hình AI cục bộ'; cls = local.length ? 'is-ok' : 'is-bad'; }
      else if (provider === 'cloud') { text = cloud.length && online ? `Đám mây: ${cloud.map((p) => p.id).join(', ')}` : online ? 'Máy chủ chưa cấu hình AI đám mây' : 'Ngoại tuyến'; cls = cloud.length && online ? 'is-ok' : 'is-bad'; if (!online) ic = 'cloud-off'; }
      else { text = avail.length ? `Sẵn sàng · ${avail.map((p) => p.id).join(', ')}` : 'Máy chủ chưa cấu hình nhà cung cấp AI'; cls = avail.length ? 'is-ok' : 'is-bad'; }
    }
    statusEl.className = `chat-status ${cls}`;
    statusEl.title = text;
    mount(statusEl, h('span', { class: `chat-status__dot ${cls}` }), icon(ic), h('span', { class: 'truncate' }, text));
  }
  appState.subscribe((s, p) => { if (s.backend !== p.backend || s.online !== p.online) updateStatus(); }, { signal });
  const offLocal = onLocalStatus(() => updateStatus());
  signal.addEventListener('abort', offLocal);
  fetchProviders().then((d) => {
    appState.set({ backend: { ...appState.get().backend, reachable: true, providers: d.providers || [] } });
  }).catch(() => {}).finally(updateStatus);

  async function maybeOfferLocalDownload() {
    if (!isWebGPUAvailable()) { toast('Trình duyệt này chưa hỗ trợ WebGPU nên không chạy được AI trên máy. Hãy dùng Chrome/Edge mới trên máy tính.', { type: 'warning', duration: 7000 }); return; }
    if (localStatus().state === 'ready' || localStatus().state === 'loading') return;
    const downloaded = await wasDownloaded();
    toast(downloaded ? 'Đang nạp mô hình AI đã tải trên máy…' : 'Lần đầu dùng sẽ tải mô hình (~0,4–1 GB) và lưu lại để dùng offline.', { duration: 6000 });
    loadLocalModel().catch((err) => toast(err.message, { type: 'error', duration: 8000 }));
  }

  // ---------- mode ----------
  async function setMode(m, { persist = false } = {}) {
    mode = modeById(m).id;
    modeSelect.value = mode;
    modeLabel.textContent = modeById(mode).label;
    if (persist && conversation) { conversation.mode = mode; await saveConversation(conversation, { sync: true }); }
    renderEmpty();
  }

  // ---------- rendering ----------
  function fillAndSend(text) {
    input.value = text;
    autosize();
    send();
  }

  function renderEmpty() {
    if (conversation?.messages?.length) return;
    const m = modeById(mode);
    const suggestions = h('div', { class: 'chat-suggestions', role: 'list', 'aria-label': 'Câu hỏi gợi ý' },
      m.suggestions.map((s) => h('button', { class: 'chat-suggestion', type: 'button', role: 'listitem', title: 'Gửi câu hỏi này cho V-Mentor', onClick: () => fillAndSend(s) },
        icon('sparkles'), h('span', null, s), icon('arrow-right', { className: 'chat-suggestion__go' }))));
    if (compact) {
      mount(list, h('div', { class: 'chat-empty chat-empty--compact' },
        mentorOrb('lg'),
        h('h2', null, m.label),
        h('p', { class: 'muted' }, m.description),
        suggestions));
      updateJump();
      return;
    }
    const modeCards = h('div', { class: 'chat-modes', role: 'radiogroup', 'aria-label': 'Chọn chế độ trợ lý' },
      AI_MODES.map((md) => h('button', {
        class: `chat-mode ${md.id === mode ? 'is-active' : ''}`, type: 'button', role: 'radio', 'aria-checked': String(md.id === mode),
        onClick: () => setMode(md.id, { persist: true }),
      }, h('span', { class: 'chat-mode__icon' }, icon(md.icon)), h('span', { class: 'chat-mode__text' }, h('strong', null, md.label), h('span', null, md.description)))));
    mount(list, h('div', { class: 'chat-empty' },
      h('div', { class: 'chat-hero' },
        mentorOrb('xl'),
        h('h2', { class: 'chat-hero__title' }, 'Xin chào, mình là ', h('span', { class: 'vm-gradient-text' }, 'V-Mentor')),
        h('p', { class: 'chat-hero__lead' }, 'Trợ lý học lập trình của V-Code Edu. Chọn một chế độ rồi đặt câu hỏi — mình sẽ giải thích từng bước, bằng tiếng Việt.')),
      h('section', { class: 'chat-empty__section', 'aria-label': 'Chế độ' },
        h('h3', { class: 'chat-empty__label' }, 'Chế độ trợ lý'), modeCards),
      h('section', { class: 'chat-empty__section', 'aria-label': 'Gợi ý' },
        h('h3', { class: 'chat-empty__label' }, `Gợi ý cho chế độ “${m.short}”`), suggestions)));
    updateJump();
  }

  function aiHead(msg, streamingNow = false) {
    return h('div', { class: 'msg__head' },
      h('span', { class: 'msg__head-orb' }, mentorOrb('xs')),
      h('strong', { class: 'msg__name' }, 'V-Mentor'),
      streamingNow ? h('span', { class: 'msg__state' }, 'đang trả lời…') : null,
      msg.provider ? h('span', { class: 'msg__provider', title: 'Nguồn trả lời' }, msg.provider === 'browser' ? 'AI trên trình duyệt' : `${msg.provider}${msg.model ? ` · ${msg.model}` : ''}`) : null);
  }

  function messageEl(msg, isLast) {
    if (msg.role === 'user') {
      return h('div', { class: 'msg msg--user', dataset: { id: msg.id } },
        h('div', { class: 'msg__bubble' }, msg.content),
        msg.attachments ? h('div', { class: 'msg__meta' }, icon('code'), msg.attachments) : null);
    }
    const body = h('div', { class: 'msg__body prose' });
    if (msg.error) {
      mount(body, h('div', { class: 'callout callout--danger chat-error', role: 'alert' }, icon('alert'),
        h('div', null,
          h('strong', null, 'Không nhận được câu trả lời. '), msg.error,
          isLast ? h('div', { class: 'chat-error__hint' }, 'Bấm “Thử lại”, hoặc đổi “Nguồn AI” ở thanh phía trên.') : null)));
    } else {
      body.innerHTML = markdown(msg.content || '');
      enhanceMarkdown(body, { onOpenCode: opts.onOpenCode });
    }
    const actions = h('div', { class: 'msg__actions' },
      msg.content ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: async () => toast((await copyText(msg.content)) ? 'Đã sao chép câu trả lời.' : 'Không sao chép được.', { duration: 1500 }) }, icon('copy'), 'Sao chép') : null,
      isLast ? h('button', { class: `btn btn--sm ${msg.error ? 'btn--ai' : 'btn--ghost'}`, type: 'button', onClick: () => regenerate() }, icon('refresh'), msg.error ? 'Thử lại' : 'Tạo lại') : null,
    );
    return h('div', { class: `msg msg--ai ${msg.error ? 'is-error' : ''}`, dataset: { id: msg.id } },
      h('div', { class: 'msg__avatar' }, mentorOrb()),
      h('div', { class: 'msg__main' }, aiHead(msg), body, actions));
  }

  function renderAll({ force = true } = {}) {
    if (!conversation || !conversation.messages.length) { renderEmpty(); return; }
    const msgs = conversation.messages;
    const lastAi = msgs.map((m) => m.role).lastIndexOf('assistant');
    const prevTop = list.scrollTop;
    mount(list, msgs.map((m, i) => messageEl(m, i === lastAi && i === msgs.length - 1)));
    if (force || stickToBottom) scrollDown(true);
    else { list.scrollTop = prevTop; lastTop = prevTop; updateJump(); }
  }

  async function ensureConversation() {
    if (!conversation) {
      conversation = await createConversation({ mode });
      opts.onConversation?.(conversation.id);
    }
    return conversation;
  }

  function setStreamingUI(on) {
    root.classList.toggle('is-streaming', on);
    sendBtn.hidden = on;
    stopBtn.hidden = !on;
  }

  // ---------- generation ----------
  async function generate(assistantMsg) {
    const c = conversation;
    streaming = new AbortController();
    const myStream = streaming;
    setStreamingUI(true);
    const history = c.messages.filter((m) => m !== assistantMsg);
    const headSlot = h('div', null, aiHead(assistantMsg, true));
    const bodyEl = h('div', { class: 'msg__body prose' },
      h('div', { class: 'msg__thinking' }, h('span', { class: 'msg__thinking-label' }, 'V-Mentor đang suy nghĩ…'), skeletonLines(3)));
    const el = h('div', { class: 'msg msg--ai is-streaming', 'aria-busy': 'true' },
      h('div', { class: 'msg__avatar' }, mentorOrb()),
      h('div', { class: 'msg__main' }, headSlot, bodyEl));
    list.appendChild(el);
    scrollDown(true);
    let shownProvider = null;
    const paint = throttle(() => {
      if (myStream.signal.aborted && !assistantMsg.content) return;
      if (assistantMsg.provider !== shownProvider) { shownProvider = assistantMsg.provider; mount(headSlot, aiHead(assistantMsg, true)); }
      if (!assistantMsg.content) return;
      bodyEl.innerHTML = markdown(assistantMsg.content);
      placeCaret(bodyEl);
      scrollDown();
    }, 60);

    const useBrowser = provider === 'browser' || (provider === 'auto' && !appState.get().backend.reachable && localStatus().state === 'ready');
    try {
      if (useBrowser) {
        assistantMsg.provider = 'browser';
        paint();
        const system = localSystemPrompt(mode, context);
        for await (const chunk of streamLocal({ messages: history.filter((m) => !m.error).map((m) => ({ role: m.role, content: m.content })), system, signal: myStream.signal })) {
          assistantMsg.content += chunk;
          paint();
        }
      } else {
        for await (const ev of streamChat({ messages: history, mode, provider, context, signal: myStream.signal })) {
          if (ev.type === 'meta') { assistantMsg.provider = ev.data.provider; assistantMsg.model = ev.data.model; paint(); }
          else if (ev.type === 'delta') { assistantMsg.content += ev.data.text || ''; paint(); }
          else if (ev.type === 'error') throw new AIError(ev.data.code, ev.data.message);
          else if (ev.type === 'done' && typeof ev.data?.remaining === 'number' && ev.data.remaining <= 5) {
            toast(`Bạn còn ${ev.data.remaining} lượt hỏi AI hôm nay.`, { type: 'warning' });
          }
        }
      }
      if (!assistantMsg.content.trim()) throw new AIError('empty', 'Mô hình không trả về nội dung. Hãy thử lại.');
    } catch (err) {
      if (err?.name === 'AbortError' || myStream.signal.aborted) {
        if (!assistantMsg.content) assistantMsg.content = '_(Đã dừng)_';
        else assistantMsg.content += '\n\n_(Đã dừng)_';
      } else {
        assistantMsg.error = err?.message || String(err);
        if (err?.code === 'offline' || err?.code === 'network' || err?.code === 'no_provider') {
          if (isWebGPUAvailable() && provider !== 'browser') assistantMsg.error += ' Bạn có thể chuyển sang "AI trên trình duyệt" để dùng AI không cần Internet.';
        }
      }
    } finally {
      paint.cancel?.();
      if (streaming === myStream) { streaming = null; setStreamingUI(false); }
      assistantMsg.createdAt = Date.now();
      await saveConversation(c);
      if (conversation === c && el.isConnected) {
        const follow = stickToBottom;
        const finalEl = messageEl(assistantMsg, c.messages[c.messages.length - 1] === assistantMsg);
        el.replaceWith(finalEl);
        if (follow) scrollDown(true); else updateJump();
      } else if (conversation === c) {
        renderAll({ force: false });
      }
      if (!streaming) input.focus({ preventScroll: true });
    }
  }

  async function send(textArg) {
    const text = (textArg ?? input.value).trim();
    if (!text || streaming) return;
    const c = await ensureConversation();
    const userMsg = { id: uid('m'), role: 'user', content: text, createdAt: Date.now() };
    if (context?.code) userMsg.attachments = `Kèm mã ${context.language || ''} (${context.code.split('\n').length} dòng)${context.error ? ' và lỗi' : ''}`;
    c.messages.push(userMsg);
    if (c.autoTitle && c.messages.filter((m) => m.role === 'user').length === 1) c.title = deriveTitle(text);
    c.mode = mode;
    input.value = '';
    autosize();
    const assistant = { id: uid('m'), role: 'assistant', content: '', createdAt: Date.now() };
    c.messages.push(assistant);
    await saveConversation(c, { sync: false });
    stickToBottom = true;
    renderAll();
    // remove the empty assistant element; generate() paints its own streaming element
    list.lastElementChild?.remove();
    await generate(assistant);
  }

  async function regenerate() {
    const c = conversation;
    if (!c || streaming) return;
    const last = c.messages[c.messages.length - 1];
    if (last?.role !== 'assistant') return;
    last.content = '';
    delete last.error;
    delete last.provider;
    delete last.model;
    stickToBottom = true;
    renderAll();
    list.lastElementChild?.remove();
    await generate(last);
  }

  async function load(id) {
    streaming?.abort();
    conversation = id ? await getConversation(id) : null;
    if (conversation?.mode) { mode = modeById(conversation.mode).id; modeSelect.value = mode; }
    modeLabel.textContent = modeById(mode).label;
    stickToBottom = true;
    renderAll();
  }

  bus.on('conversations:change', async () => {
    if (conversation && !(await getConversation(conversation.id))) { conversation = null; renderAll(); }
  }, { signal });

  modeLabel.textContent = modeById(mode).label;
  renderContext();
  updateStatus();
  load(opts.conversationId).then(() => { if (opts.initialPrompt) send(opts.initialPrompt); });

  return {
    load,
    send,
    newConversation() { streaming?.abort(); conversation = null; renderAll(); input.focus(); },
    setContext(ctx) { context = ctx; renderContext(); },
    setMode(m) { setMode(m); },
    focus() { input.focus(); },
    destroy() { streaming?.abort(); ac.abort(); },
  };
}
