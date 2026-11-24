// V-Code Edu — Flowchart (Lưu đồ) studio.
// Two modes: "Từ mã nguồn" (live flowchart from the IDE editor) and "Thiết kế" (drag-and-drop designer + runner).
//
// createFlowchartStudio({ signal, getCode, onSendToEditor, onJumpToLine })
//   getCode(): { code, lang }
//   onSendToEditor(pythonCode)
//   onJumpToLine(line)
// → { el, onCodeChange(code, lang), onShow(), destroy() }
import { h } from '../../core/dom.js';
import { toast, confirmDialog } from '../../core/ui.js';
import { createLiveView } from './live.js';
import { createDesigner } from './editor.js';
import { fcIcon } from './icons-local.js';

const MODE_KEY = 'vc-flowchart:mode';

export function createFlowchartStudio({ signal, getCode, onSendToEditor, onJumpToLine } = {}) {
  const ctrl = new AbortController();
  const sig = ctrl.signal;
  signal?.addEventListener('abort', () => destroy(), { once: true });

  let mode = 'live';
  try { if (localStorage.getItem(MODE_KEY) === 'design') mode = 'design'; } catch { /* storage blocked */ }
  let visible = false;
  let liveDirty = true;
  let pending = null;

  const live = createLiveView({
    signal: sig,
    getCode,
    onJumpToLine: (line) => onJumpToLine?.(line),
    onConvert: (graph, skipped) => importGraph(graph, skipped),
  });

  const designer = createDesigner({
    signal: sig,
    onSendToEditor: onSendToEditor ? (code) => { onSendToEditor(code); toast('Đã mở mã Python trong trình soạn thảo.', { type: 'success' }); } : null,
    onImportFromCode: () => {
      try {
        const res = live.buildDesignerGraph();
        importGraph(res.graph, res.skipped);
      } catch (err) {
        toast(err.message || 'Không tạo được lưu đồ từ mã.', { type: 'warning' });
      }
    },
  });

  async function importGraph(graph, skipped) {
    const g = designer.getGraph();
    const hasWork = g.nodes.length > 2;
    if (hasWork) {
      const ok = await confirmDialog({
        title: 'Thay thế lưu đồ đang thiết kế?',
        message: 'Lưu đồ hiện tại trong chế độ Thiết kế sẽ được thay bằng lưu đồ tạo từ mã. Bạn có thể bấm Hoàn tác (Ctrl+Z) để lấy lại.',
        confirmLabel: 'Thay thế',
      });
      if (!ok) return;
    }
    setMode('design');
    designer.loadGraph(graph, { message: skipped ? `Đã tạo lưu đồ từ chương trình chính (bỏ qua ${skipped} hàm).` : 'Đã tạo lưu đồ từ mã nguồn — bạn có thể chỉnh sửa và chạy thử.' });
  }

  const segLive = h('button', { class: 'fc-seg__btn', type: 'button', role: 'tab', onClick: () => setMode('live') }, fcIcon('code'), h('span', null, 'Từ mã nguồn'));
  const segDesign = h('button', { class: 'fc-seg__btn', type: 'button', role: 'tab', onClick: () => setMode('design') }, fcIcon('flow'), h('span', null, 'Thiết kế'));
  const seg = h('div', { class: 'fc-seg', role: 'tablist', 'aria-label': 'Chế độ lưu đồ' }, segLive, segDesign);
  seg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      setMode(mode === 'live' ? 'design' : 'live');
      (mode === 'live' ? segLive : segDesign).focus();
    }
  }, { signal: sig });

  const head = h('div', { class: 'fc-head' },
    h('div', { class: 'fc-head__title' }, fcIcon('flow'), h('span', null, 'Lưu đồ')),
    seg);
  const livePane = h('div', { class: 'fc-mode fc-mode--live' }, live.el);
  const designPane = h('div', { class: 'fc-mode fc-mode--design' }, designer.el);
  const el = h('div', { class: 'fc-studio' }, head, h('div', { class: 'fc-body' }, livePane, designPane));

  function setMode(m) {
    mode = m;
    try { localStorage.setItem(MODE_KEY, m === 'design' ? 'design' : 'live'); } catch { /* ignore */ }
    const isLive = m === 'live';
    segLive.classList.toggle('is-active', isLive);
    segDesign.classList.toggle('is-active', !isLive);
    segLive.setAttribute('aria-selected', String(isLive));
    segDesign.setAttribute('aria-selected', String(!isLive));
    segLive.tabIndex = isLive ? 0 : -1;
    segDesign.tabIndex = isLive ? -1 : 0;
    livePane.hidden = !isLive;
    designPane.hidden = isLive;
    if (visible) {
      if (isLive) refreshLive(); else designer.onShow();
    }
  }

  function refreshLive() {
    if (pending) { live.update(pending.code, pending.lang); pending = null; liveDirty = false; return; }
    if (liveDirty) { live.refresh(); liveDirty = false; } else live.resize();
  }

  const ro = new ResizeObserver(() => {
    if (!visible || !el.isConnected) return;
    if (mode === 'live') live.resize();
  });
  ro.observe(el);

  setMode(mode);

  function destroy() {
    if (ctrl.signal.aborted) return;
    ro.disconnect();
    designer.destroy();
    ctrl.abort();
  }

  return {
    el,
    onCodeChange(code, lang) {
      if (visible && mode === 'live') { live.update(code, lang); liveDirty = false; pending = null; }
      else { pending = { code, lang }; liveDirty = true; }
    },
    onShow() {
      visible = true;
      if (mode === 'live') {
        if (!pending) liveDirty = true;
        refreshLive();
      } else designer.onShow();
    },
    onHide() { visible = false; },
    destroy,
    // exposed for tests / advanced embedding
    _live: live,
    _designer: designer,
    setMode,
  };
}
