// V-Code Edu — Flowchart studio: drag-and-drop flowchart designer with step-by-step execution.
import { h, s, mount, debounce, raw } from '../../core/dom.js';
import { icon } from '../icons.js';
import { toast, openModal, confirmDialog, copyText, downloadFile } from '../../core/ui.js';
import { highlight } from '../highlight.js';
import { KINDS, DESIGNER_KINDS, DEFAULT_TEXT, PORT_LABEL, nodeSize, portAnchor, shortText } from './model.js';
import { makeDefs, shapeEl, textEl, roundedPath, curvedPath, labelPos, edgeLabelEl } from './render.js';
import { createViewport } from './viewport.js';
import { exportSvg, exportPng } from './export.js';
import { Runner, validateGraph, nodeName, MAX_STEPS } from './interpreter.js';
import { generatePython } from './codegen.js';
import { pyRepr } from './expr.js';
import { TEMPLATES, templateById } from './templates.js';
import { fcIcon, shapeIcon } from './icons-local.js';

const STORE_KEY = 'vc-flowchart:designer:v1';
const GRID = 20;
const SPEEDS = [1100, 800, 560, 400, 280, 180, 110, 60, 25, 0];
const SPEED_NAMES = ['Rất chậm', 'Rất chậm', 'Chậm', 'Chậm', 'Vừa', 'Vừa', 'Nhanh', 'Nhanh', 'Rất nhanh', 'Tức thì'];

const HELP = {
  start: 'Điểm bắt đầu của thuật toán. Lưu đồ chỉ có đúng một khối Bắt đầu.',
  end: 'Điểm kết thúc. Có thể có nhiều khối Kết thúc.',
  input: 'Ví dụ: «Nhập n» hoặc «Nhập a, b». Mặc định là số nguyên; thêm «(số thực)» hoặc «(chuỗi)» sau tên biến để đổi kiểu.',
  output: 'Ví dụ: «In tong» hoặc «In "Tổng là:", tong». Các biểu thức cách nhau bởi dấu phẩy.',
  process: 'Phép gán, mỗi dòng một lệnh hoặc ngăn cách bằng «;». Ví dụ: «tong = tong + i». Có thể dùng ← thay cho =.',
  decision: 'Biểu thức đúng/sai, ví dụ «i <= n», «n % 2 == 0», «a > b và a > c». Nhánh Đúng ở dưới, nhánh Sai ở bên phải.',
  call: 'Gọi một hàm/phương thức có sẵn, ví dụ «ds.append(x)» hoặc «print(x)».',
};

function storageGet() {
  try { return localStorage.getItem(STORE_KEY); } catch { return null; }
}
function storageSet(v) {
  try { localStorage.setItem(STORE_KEY, v); return true; } catch { return false; }
}

const snap = (v) => Math.round(v / GRID) * GRID;

/** Validate & normalise an imported graph object. Throws Error (Vietnamese). */
export function sanitizeGraph(obj) {
  if (!obj || typeof obj !== 'object') throw new Error('Tệp không đúng định dạng lưu đồ.');
  const src = obj.graph && Array.isArray(obj.graph.nodes) ? obj.graph : obj;
  if (!Array.isArray(src.nodes) || !Array.isArray(src.edges)) throw new Error('Tệp thiếu danh sách khối (nodes) hoặc mũi tên (edges).');
  if (src.nodes.length > 500) throw new Error('Lưu đồ quá lớn (tối đa 500 khối).');
  const ids = new Set();
  const nodes = src.nodes.map((n, i) => {
    if (!n || !DESIGNER_KINDS.includes(n.type)) throw new Error(`Khối thứ ${i + 1} có loại không hợp lệ.`);
    const id = String(n.id ?? `k${i + 1}`).slice(0, 40);
    if (ids.has(id)) throw new Error(`Mã khối «${id}» bị trùng.`);
    ids.add(id);
    const x = Number(n.x); const y = Number(n.y);
    return { id, type: n.type, text: String(n.text ?? DEFAULT_TEXT[n.type]).slice(0, 400), x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 };
  });
  const seen = new Set();
  const edges = [];
  src.edges.forEach((e, i) => {
    if (!e) return;
    const from = String(e.from); const to = String(e.to); const port = String(e.port || 'out');
    if (!ids.has(from) || !ids.has(to)) return;
    if (!['out', 'yes', 'no'].includes(port)) return;
    const key = `${from}:${port}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ id: String(e.id ?? `e${i + 1}`).slice(0, 40), from, port, to });
  });
  return { nodes, edges };
}

export function createDesigner({ signal, onSendToEditor, onImportFromCode }) {
  /* ---------------- state ---------------- */
  let graph = { nodes: [], edges: [] };
  let edgeStyle = 'ortho';
  const selN = new Set();
  const selE = new Set();
  let undoStack = [];
  let redoStack = [];
  let current = '';
  let run = null;
  let errorIds = new Set();
  let shown = false;
  let fitted = false;
  let lastPointerDown = 0;
  let idSeq = 1;
  const sizeCache = new Map();

  const sizeOf = (n) => {
    const key = `${n.type}\u0001${n.text}`;
    let v = sizeCache.get(key);
    if (!v) { v = nodeSize(n.type, n.text); sizeCache.set(key, v); if (sizeCache.size > 2000) sizeCache.clear(); }
    return v;
  };
  const byId = (id) => graph.nodes.find((n) => n.id === id);
  const newId = (prefix) => {
    const used = new Set([...graph.nodes.map((n) => n.id), ...graph.edges.map((e) => e.id)]);
    let id;
    do { id = `${prefix}${idSeq++}`; } while (used.has(id));
    return id;
  };

  /* ---------------- DOM ---------------- */
  const defs = makeDefs();
  const gGroupGrid = s('g', { class: 'fc-dedges' });
  const gNodes = s('g', { class: 'fc-dnodes' });
  const gOverlay = s('g', { class: 'fc-overlay', 'data-noexport': '' });
  const layer = s('g', { 'data-layer': '' }, gGroupGrid, gNodes, gOverlay);
  const svg = s('svg', { class: 'fc-svg fc-svg--designer', role: 'application', 'aria-label': 'Vùng vẽ lưu đồ. Phím Delete để xóa, Ctrl+Z hoàn tác, Enter để sửa nội dung khối, mũi tên để di chuyển.' }, defs.el, layer);
  const inlineEditor = h('textarea', { class: 'fc-inline-edit', hidden: true, spellcheck: 'false', 'aria-label': 'Sửa nội dung khối' });
  const lockBanner = h('div', { class: 'fc-lock', hidden: true }, fcIcon('lock'), h('span', null, 'Đang chạy thử — bấm «Dừng» để chỉnh sửa lưu đồ.'));
  const zoomLabel = h('span', { class: 'fc-zoomval' }, '100%');
  const canvas = h('div', { class: 'fc-canvas fc-canvas--designer', tabindex: '-1' }, svg, inlineEditor, lockBanner);

  const vp = createViewport({
    host: canvas, svg, layer, signal, minZoom: 0.2, maxZoom: 2.5,
    onChange: (st) => { zoomLabel.textContent = `${Math.round(st.k * 100)}%`; if (!inlineEditor.hidden) placeEditor(); },
  });

  const mkBtn = (ic, label, onClick, { text, cls = 'fc-btn--ghost', iconOnly = !text, id } = {}) => {
    const b = h('button', { class: `fc-btn ${cls}${iconOnly ? ' fc-btn--icon' : ''}`, type: 'button', title: label, 'aria-label': label, onClick, dataset: id ? { act: id } : undefined },
      ic ? fcIcon(ic) : null, text ? h('span', { class: 'fc-btn__text' }, text) : null);
    return b;
  };

  // palette
  const PALETTE = [
    ['start', 'terminal', 'Bắt đầu'], ['end', 'terminal', 'Kết thúc'], ['input', 'io', 'Nhập'], ['output', 'io', 'Xuất'],
    ['process', 'process', 'Xử lý'], ['decision', 'decision', 'Điều kiện'], ['call', 'call', 'Chương trình con'],
  ];
  const palette = h('div', { class: 'fc-palette', role: 'toolbar', 'aria-label': 'Bảng khối — kéo vào vùng vẽ hoặc nhấn để thêm' },
    h('div', { class: 'fc-palette__title' }, 'Khối'),
    PALETTE.map(([type, shape, label]) => h('button', {
      class: `fc-palette__item fc-cat-${KINDS[type].cat}`, type: 'button', dataset: { type },
      title: `${label} — kéo vào vùng vẽ (hoặc nhấn để thêm vào giữa)`, 'aria-label': `Thêm khối ${label}`,
    }, shapeIcon(shape), h('span', null, label))),
  );

  // menus
  function makeMenu(triggerIc, label, text, itemsFn) {
    const panel = h('div', { class: 'fc-menu__panel', role: 'menu', hidden: true });
    const trigger = mkBtn(triggerIc, label, () => {
      const open = panel.hidden;
      document.querySelectorAll('.fc-menu__panel').forEach((p) => { p.hidden = true; });
      if (open) {
        mount(panel, itemsFn().map((it) => (it === '-' ? h('div', { class: 'fc-menu__sep' }) : h('button', {
          class: 'fc-menu__item', type: 'button', role: 'menuitem',
          onClick: () => { panel.hidden = true; it.onClick(); },
        }, it.icon ? fcIcon(it.icon) : null, h('span', { class: 'fc-menu__label' }, h('b', null, it.label), it.desc ? h('small', null, it.desc) : null)))));
        panel.hidden = false;
        panel.querySelector('button')?.focus();
      } else panel.hidden = true;
      trigger.setAttribute('aria-expanded', String(!panel.hidden));
    }, { text });
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    const wrap = h('div', { class: 'fc-menu' }, trigger, panel);
    document.addEventListener('pointerdown', (e) => { if (!wrap.contains(e.target)) panel.hidden = true; }, { signal });
    wrap.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !panel.hidden) { panel.hidden = true; trigger.focus(); e.stopPropagation(); }
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !panel.hidden) {
        const items = [...panel.querySelectorAll('button')];
        const i = items.indexOf(document.activeElement);
        items[(i + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
        e.preventDefault();
      }
    });
    return wrap;
  }

  const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true });

  const btnUndo = mkBtn('undo', 'Hoàn tác (Ctrl+Z)', () => undo());
  const btnRedo = mkBtn('redo', 'Làm lại (Ctrl+Y)', () => redo());
  const btnDelete = mkBtn('trash', 'Xóa phần đang chọn (Delete)', () => deleteSelection());
  const btnStyle = mkBtn('ortho', 'Kiểu mũi tên: gấp khúc', () => setEdgeStyle(edgeStyle === 'ortho' ? 'curve' : 'ortho'));
  const templatesMenu = makeMenu('template', 'Chọn lưu đồ mẫu', 'Mẫu', () => TEMPLATES.map((t) => ({ label: t.name, desc: t.description, onClick: () => loadTemplate(t.id) })));
  const fileMenu = makeMenu('folder', 'Tệp: nhập/xuất', 'Tệp', () => [
    ...(onImportFromCode ? [{ icon: 'wand', label: 'Tạo lưu đồ từ mã hiện tại', desc: 'Chuyển chương trình trong trình soạn thảo thành lưu đồ', onClick: () => onImportFromCode() }, '-'] : []),
    { icon: 'upload', label: 'Mở tệp JSON…', desc: 'Nhập lưu đồ đã lưu', onClick: () => fileInput.click() },
    { icon: 'json', label: 'Lưu thành JSON', desc: 'Tải lưu đồ về máy', onClick: () => exportJson() },
    '-',
    { icon: 'download', label: 'Tải ảnh SVG', onClick: () => exportImage('svg') },
    { icon: 'image', label: 'Tải ảnh PNG', onClick: () => exportImage('png') },
    '-',
    { icon: 'trash', label: 'Xóa toàn bộ lưu đồ', onClick: () => clearAll() },
  ]);

  // run controls
  const btnRun = mkBtn('play', 'Chạy (F5)', () => startRun('run'), { text: 'Chạy', cls: 'fc-btn--primary' });
  const btnStep = mkBtn('step-forward', 'Chạy từng bước (F10)', () => startRun('step'), { text: 'Từng bước' });
  const btnPause = mkBtn('pause', 'Tạm dừng', () => pauseRun());
  const btnStop = mkBtn('stop', 'Dừng', () => stopRun());
  const speed = h('input', { type: 'range', min: '1', max: '10', value: '6', class: 'fc-range', 'aria-label': 'Tốc độ chạy' });
  const speedName = h('span', { class: 'fc-speed__name' }, SPEED_NAMES[5]);
  speed.addEventListener('input', () => { speedName.textContent = SPEED_NAMES[Number(speed.value) - 1]; save(); }, { signal });
  const btnPy = mkBtn('python', 'Chuyển lưu đồ thành mã Python', () => showPython(), { text: 'Chuyển thành Python', cls: 'fc-btn--soft' });

  const toolbar = h('div', { class: 'fc-toolbar fc-toolbar--designer' },
    h('div', { class: 'fc-toolbar__group' }, btnUndo, btnRedo, btnDelete, h('span', { class: 'fc-sep' }), templatesMenu, fileMenu, btnStyle),
    h('div', { class: 'fc-toolbar__group fc-runbar', role: 'group', 'aria-label': 'Chạy thử lưu đồ' },
      btnRun, btnStep, btnPause, btnStop,
      h('label', { class: 'fc-speed', title: 'Tốc độ chạy' }, fcIcon('speed'), speed, speedName)),
    h('div', { class: 'fc-toolbar__group fc-toolbar__end' }, btnPy),
  );

  const zoomBox = h('div', { class: 'fc-zoombox', 'data-noexport': '' },
    mkBtn('minus', 'Thu nhỏ', () => vp.zoomCenter(1 / 1.2)),
    h('button', { class: 'fc-btn fc-btn--ghost fc-zoomlabel', type: 'button', title: 'Về 100%', onClick: () => vp.setZoom(1) }, zoomLabel),
    mkBtn('plus', 'Phóng to', () => vp.zoomCenter(1.2)),
    mkBtn('fit', 'Vừa khung nhìn (phím 0)', () => fitView()));
  const hint = h('div', { class: 'fc-hint' }, 'Kéo khối từ bảng bên trái · kéo từ chấm tròn để nối · nháy đúp để sửa chữ · Shift + kéo để chọn nhiều');
  canvas.append(zoomBox, hint);

  // side panel
  const inputsArea = h('textarea', { class: 'fc-textarea', rows: '3', spellcheck: 'false', placeholder: 'Mỗi dòng một giá trị, ví dụ:\n5', 'aria-label': 'Dữ liệu vào, mỗi dòng một giá trị' });
  inputsArea.addEventListener('input', () => save(), { signal });
  const runStatus = h('div', { class: 'fc-runstatus', role: 'status', 'aria-live': 'polite' }, 'Sẵn sàng');
  const promptBox = h('form', { class: 'fc-prompt', hidden: true });
  const watchBody = h('tbody');
  const watch = h('div', { class: 'fc-watch' }, h('table', { class: 'fc-table' }, h('thead', null, h('tr', null, h('th', null, 'Biến'), h('th', null, 'Giá trị'), h('th', null, 'Kiểu'))), watchBody));
  const consoleEl = h('div', { class: 'fc-console', role: 'log', 'aria-live': 'polite', 'aria-label': 'Kết quả chạy' });
  const runPane = h('div', { class: 'fc-pane', role: 'tabpanel' },
    h('label', { class: 'fc-label' }, 'Dữ liệu vào', h('small', null, 'mỗi dòng một giá trị')), inputsArea,
    runStatus, promptBox,
    h('div', { class: 'fc-label' }, 'Bảng biến'), watch,
    h('div', { class: 'fc-label' }, 'Kết quả', h('button', { class: 'fc-link', type: 'button', onClick: () => mount(consoleEl) }, 'Xóa')), consoleEl);
  const inspector = h('div', { class: 'fc-pane', role: 'tabpanel', hidden: true });
  const tabRun = h('button', { class: 'fc-tab is-active', type: 'button', role: 'tab', 'aria-selected': 'true', onClick: () => setTab('run') }, 'Chạy thử');
  const tabInspect = h('button', { class: 'fc-tab', type: 'button', role: 'tab', 'aria-selected': 'false', onClick: () => setTab('inspect') }, 'Khối đang chọn');
  const side = h('aside', { class: 'fc-side' }, h('div', { class: 'fc-tabs', role: 'tablist' }, tabRun, tabInspect), runPane, inspector);

  const el = h('div', { class: 'fc-designer' }, toolbar, h('div', { class: 'fc-dmain' }, palette, canvas, side), fileInput);

  function setTab(t) {
    const isRun = t === 'run';
    tabRun.classList.toggle('is-active', isRun); tabInspect.classList.toggle('is-active', !isRun);
    tabRun.setAttribute('aria-selected', String(isRun)); tabInspect.setAttribute('aria-selected', String(!isRun));
    runPane.hidden = !isRun; inspector.hidden = isRun;
    if (!isRun) renderInspector();
  }

  /* ---------------- persistence & history ---------------- */
  const snapshot = () => JSON.stringify(graph);

  const saveNow = () => storageSet(JSON.stringify({ format: 'vcode-flowchart', version: 1, graph, inputs: inputsArea.value, edgeStyle, speed: Number(speed.value) }));
  const save = debounce(saveNow, 350);
  window.addEventListener('pagehide', () => { save.cancel(); saveNow(); }, { signal });

  function commit() {
    const snap2 = snapshot();
    if (snap2 === current) return;
    undoStack.push(current);
    if (undoStack.length > 150) undoStack.shift();
    redoStack = [];
    current = snap2;
    save.cancel();
    saveNow();
    updateButtons();
  }

  function restore(str) {
    graph = JSON.parse(str);
    current = str;
    for (const id of [...selN]) if (!byId(id)) selN.delete(id);
    for (const id of [...selE]) if (!graph.edges.some((e) => e.id === id)) selE.delete(id);
    errorIds.clear();
    renderAll();
    save();
    updateButtons();
  }

  function undo() {
    if (!canEdit() || !undoStack.length) return;
    redoStack.push(current);
    restore(undoStack.pop());
  }
  function redo() {
    if (!canEdit() || !redoStack.length) return;
    undoStack.push(current);
    restore(redoStack.pop());
  }

  function updateButtons() {
    const locked = isLocked();
    btnUndo.disabled = locked || !undoStack.length;
    btnRedo.disabled = locked || !redoStack.length;
    btnDelete.disabled = locked || (!selN.size && !selE.size);
    btnRun.disabled = !!run && !run.finished && run.mode === 'run' && !run.waiting;
    btnPause.disabled = !run || run.finished || run.mode !== 'run';
    btnStop.disabled = !run;
    btnStep.disabled = !!run && !run.finished && run.waiting;
    lockBanner.hidden = !locked;
    canvas.classList.toggle('is-locked', locked);
    palette.classList.toggle('is-disabled', locked);
  }

  /* ---------------- geometry / routing ---------------- */
  function anchorOf(n, port) {
    const sz = sizeOf(n);
    const a = portAnchor(n.type, sz, port);
    return { x: n.x + a.x, y: n.y + a.y, dir: a.dir };
  }

  function route(e) {
    const S = byId(e.from); const T = byId(e.to);
    if (!S || !T) return null;
    const A = anchorOf(S, e.port);
    const ss = sizeOf(S); const ts = sizeOf(T);
    const inset = ts.shape === 'io' ? 6 : 0;
    const tTop = T.y - ts.h / 2; const tL = T.x - ts.w / 2 + inset; const tR = T.x + ts.w / 2 - inset;
    const sL = S.x - ss.w / 2; const sR = S.x + ss.w / 2; const sB = S.y + ss.h / 2;
    let pts; let endDir;
    if (S.id === T.id) {
      // self loop: around the left
      const xr = sL - 28;
      pts = [[A.x, A.y], [A.x, A.y + 18], [xr, A.y + 18], [xr, S.y], [sL + (ss.shape === 'io' ? 6 : 0), S.y]];
      endDir = 'right';
    } else if (A.dir === 'down') {
      if (tTop >= A.y + 16) {
        if (Math.abs(T.x - A.x) < 1) pts = [[A.x, A.y], [T.x, tTop]];
        else { const my = Math.round((A.y + tTop) / 2); pts = [[A.x, A.y], [A.x, my], [T.x, my], [T.x, tTop]]; }
        endDir = 'down';
      } else if (A.x >= T.x - 4) {
        const xr = Math.min(tL, sL) - 26;
        pts = [[A.x, A.y], [A.x, A.y + 16], [xr, A.y + 16], [xr, T.y], [tL, T.y]];
        endDir = 'right';
      } else {
        const xr = Math.max(tR, sR) + 26;
        pts = [[A.x, A.y], [A.x, A.y + 16], [xr, A.y + 16], [xr, T.y], [tR, T.y]];
        endDir = 'left';
      }
    } else if (tL >= A.x + 16) {
      if (tTop > A.y + 8) { pts = [[A.x, A.y], [T.x, A.y], [T.x, tTop]]; endDir = 'down'; }
      else { const mx = Math.round((A.x + tL) / 2); pts = [[A.x, A.y], [mx, A.y], [mx, T.y], [tL, T.y]]; endDir = 'right'; }
    } else if (tTop > sB + 20) {
      const xr = A.x + 22; const my = Math.round((sB + tTop) / 2);
      pts = [[A.x, A.y], [xr, A.y], [xr, my], [T.x, my], [T.x, tTop]];
      endDir = 'down';
    } else {
      const xr = Math.max(A.x, tR) + 26;
      pts = [[A.x, A.y], [xr, A.y], [xr, T.y], [tR, T.y]];
      endDir = 'left';
    }
    let d;
    const wraps = (A.dir === 'down' && endDir !== 'down') || (A.dir === 'right' && endDir === 'left');
    if (edgeStyle === 'curve' && S.id !== T.id && !wraps) d = curvedPath(pts[0], A.dir, pts[pts.length - 1], endDir);
    else if (edgeStyle === 'curve') d = roundedPath(pts, 24);
    else d = roundedPath(pts, 8);
    return { d, pts, label: PORT_LABEL[e.port] };
  }

  /* ---------------- rendering ---------------- */
  const nodeViews = new Map();
  const edgeViews = new Map();

  function nodeClass(n) {
    const sz = sizeOf(n);
    const c = ['fc-node', 'fc-dnode', `fc-cat-${sz.cat}`, `fc-shape-${sz.shape}`];
    if (selN.has(n.id)) c.push('is-selected');
    if (errorIds.has(n.id)) c.push('is-error');
    if (run && run.currentId === n.id) c.push(run.finished && run.error ? 'is-failed' : 'is-current');
    if (run && run.visited?.has(n.id)) c.push('is-visited');
    return c.join(' ');
  }

  function renderNodes() {
    const alive = new Set();
    for (const n of graph.nodes) {
      alive.add(n.id);
      let v = nodeViews.get(n.id);
      if (!v) {
        const g = s('g', { 'data-id': n.id, tabindex: '0', role: 'button' });
        g.addEventListener('focus', () => {
          if (performance.now() - lastPointerDown < 400) return;
          if (!selN.has(n.id) || selN.size !== 1 || selE.size) { selN.clear(); selE.clear(); selN.add(n.id); renderAll(); }
          vp.ensureVisible(n.x, n.y, sizeOf(n).w, sizeOf(n).h);
        });
        v = { g, key: null };
        nodeViews.set(n.id, v);
        gNodes.appendChild(g);
      }
      const key = `${n.type}\u0001${n.text}`;
      if (v.key !== key) {
        const sz = sizeOf(n);
        const ports = (KINDS[n.type].ports || []).map((p) => {
          const a = portAnchor(n.type, sz, p);
          return s('g', { class: `fc-port fc-port--${p}`, 'data-port': p, 'data-noexport': '' },
            s('circle', { class: 'fc-port__hit', cx: a.x, cy: a.y, r: 11 }),
            s('circle', { class: 'fc-port__dot', cx: a.x, cy: a.y, r: 4.5 }),
            p !== 'out' ? s('text', { class: 'fc-port__label', x: a.x + (p === 'no' ? 8 : 8), y: a.y + (p === 'no' ? -8 : 14) }, PORT_LABEL[p]) : null,
            s('title', null, p === 'out' ? 'Kéo để nối tới khối tiếp theo' : `Kéo để nối nhánh ${PORT_LABEL[p]}`));
        });
        mount(v.g, s('title', null, `${KINDS[n.type].label}: ${n.text}`), shapeEl(sz.shape, sz.w, sz.h), textEl(sz.lines, sz.shape), ...ports);
        v.g.setAttribute('aria-label', `${KINDS[n.type].label}: ${n.text}`);
        v.key = key;
      }
      v.g.setAttribute('transform', `translate(${n.x} ${n.y})`);
      const cls = nodeClass(n);
      if (v.g.getAttribute('class') !== cls) v.g.setAttribute('class', cls);
    }
    for (const [id, v] of nodeViews) if (!alive.has(id)) { v.g.remove(); nodeViews.delete(id); }
  }

  function renderEdges() {
    const alive = new Set();
    for (const e of graph.edges) {
      const r = route(e);
      if (!r) continue;
      alive.add(e.id);
      let v = edgeViews.get(e.id);
      if (!v) {
        const path = s('path', { class: 'fc-edge' });
        const hit = s('path', { class: 'fc-edge-hit' });
        const g = s('g', { class: 'fc-dedge', 'data-edge': e.id }, hit, path);
        v = { g, path, hit, label: null };
        edgeViews.set(e.id, v);
        gGroupGrid.appendChild(g);
      }
      v.path.setAttribute('d', r.d);
      v.hit.setAttribute('d', r.d);
      const active = run && run.edgeId === e.id && !run.finished;
      const sel = selE.has(e.id);
      v.path.setAttribute('marker-end', active ? defs.arrowActive : sel ? defs.arrowSel : defs.arrow);
      v.g.setAttribute('class', `fc-dedge${sel ? ' is-selected' : ''}${active ? ' is-active' : ''}`);
      if (v.label) { v.label.remove(); v.label = null; }
      if (r.label) {
        const pos = labelPos(r.pts);
        v.label = edgeLabelEl(r.label, pos, e.port === 'yes' ? 'yes' : 'no');
        if (v.label) v.g.appendChild(v.label);
      }
    }
    for (const [id, v] of edgeViews) if (!alive.has(id)) { v.g.remove(); edgeViews.delete(id); }
  }

  function renderAll() {
    renderEdges();
    renderNodes();
    updateButtons();
    if (!inspector.hidden) renderInspector();
  }

  function graphBBox() {
    if (!graph.nodes.length) return { x: 0, y: 0, w: 400, h: 300 };
    let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
    for (const n of graph.nodes) {
      const sz = sizeOf(n);
      x0 = Math.min(x0, n.x - sz.w / 2 - 34); x1 = Math.max(x1, n.x + sz.w / 2 + 34);
      y0 = Math.min(y0, n.y - sz.h / 2 - 10); y1 = Math.max(y1, n.y + sz.h / 2 + 24);
    }
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  function fitView(animate = true) {
    vp.fit(graphBBox(), { padding: 36, maxK: 1.1, animate });
  }

  /* ---------------- editing ops ---------------- */
  const isLocked = () => !!run && !run.finished;
  function canEdit() {
    if (isLocked()) { toast('Đang chạy thử — hãy bấm «Dừng» trước khi chỉnh sửa.', { type: 'warning', duration: 2600 }); return false; }
    if (run && run.finished) clearRun();
    return true;
  }

  function addNode(type, x, y, { edit = true } = {}) {
    if (!canEdit()) return null;
    const n = { id: newId('k'), type, text: DEFAULT_TEXT[type], x: snap(x), y: snap(y) };
    // avoid stacking exactly on top of another node
    let guard = 0;
    while (graph.nodes.some((m) => Math.abs(m.x - n.x) < 10 && Math.abs(m.y - n.y) < 10) && guard++ < 20) { n.x += GRID; n.y += GRID * 2; }
    graph.nodes.push(n);
    selN.clear(); selE.clear(); selN.add(n.id);
    commit();
    renderAll();
    if (edit && type !== 'start' && type !== 'end') startEdit(n.id, true);
    return n;
  }

  function addNodeAtCenter(type) {
    const r = svg.getBoundingClientRect();
    const c = vp.screenToWorld(r.left + r.width / 2, r.top + r.height / 2);
    addNode(type, c.x, c.y);
  }

  function setEdge(from, port, to) {
    const S = byId(from); const T = byId(to);
    if (!S || !T) return;
    if (T.type === 'start') { toast('Không được nối mũi tên vào khối «Bắt đầu».', { type: 'warning' }); return; }
    if (S.type === 'end') return;
    graph.edges = graph.edges.filter((e) => !(e.from === from && e.port === port));
    const id = newId('e');
    graph.edges.push({ id, from, port, to });
    errorIds.delete(from);
    commit();
    renderAll();
  }

  function removeEdge(from, port) {
    graph.edges = graph.edges.filter((e) => !(e.from === from && e.port === port));
    commit();
    renderAll();
  }

  function deleteSelection() {
    if (!selN.size && !selE.size) return;
    if (!canEdit()) return;
    graph.nodes = graph.nodes.filter((n) => !selN.has(n.id));
    graph.edges = graph.edges.filter((e) => !selE.has(e.id) && !selN.has(e.from) && !selN.has(e.to));
    selN.clear(); selE.clear();
    commit();
    renderAll();
  }

  function setNodeText(id, text) {
    const n = byId(id);
    if (!n || n.text === text) return;
    n.text = text;
    errorIds.delete(id);
    commit();
    renderAll();
  }

  function setEdgeStyle(st) {
    edgeStyle = st;
    btnStyle.replaceChildren(fcIcon(st === 'ortho' ? 'ortho' : 'curve'));
    const label = st === 'ortho' ? 'Kiểu mũi tên: gấp khúc (nhấn để đổi sang đường cong)' : 'Kiểu mũi tên: đường cong (nhấn để đổi sang gấp khúc)';
    btnStyle.title = label; btnStyle.setAttribute('aria-label', label);
    renderEdges();
    save();
  }

  function loadGraph(g, { inputs, keepHistory = true, message } = {}) {
    if (isLocked()) stopRun();
    clearRun();
    const clean = sanitizeGraph(g);
    graph = clean;
    selN.clear(); selE.clear(); errorIds.clear();
    if (inputs !== undefined) inputsArea.value = inputs;
    if (keepHistory) commit(); else { current = snapshot(); undoStack = []; redoStack = []; }
    renderAll();
    if (shown) fitView(false); else fitted = false;
    save();
    if (message) toast(message, { type: 'success', action: keepHistory && undoStack.length ? { label: 'Hoàn tác', onClick: () => undo() } : undefined });
  }

  function loadTemplate(id) {
    const t = templateById(id);
    if (!t) return;
    loadGraph(JSON.parse(JSON.stringify(t.graph)), { inputs: t.inputs, message: `Đã mở mẫu «${t.name}».` });
  }

  async function clearAll() {
    if (!graph.nodes.length) return;
    if (!canEdit()) return;
    const ok = await confirmDialog({ title: 'Xóa toàn bộ lưu đồ?', message: 'Mọi khối và mũi tên sẽ bị xóa. Bạn vẫn có thể bấm Hoàn tác (Ctrl+Z) để lấy lại.', confirmLabel: 'Xóa hết', danger: true });
    if (!ok) return;
    graph = { nodes: [], edges: [] };
    selN.clear(); selE.clear();
    commit();
    renderAll();
  }

  function exportJson() {
    const data = { format: 'vcode-flowchart', version: 1, graph, inputs: inputsArea.value };
    downloadFile('luu-do.json', JSON.stringify(data, null, 2), 'application/json;charset=utf-8');
  }

  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (!f) return;
    if (f.size > 2_000_000) { toast('Tệp quá lớn.', { type: 'error' }); return; }
    try {
      const obj = JSON.parse(await f.text());
      loadGraph(obj, { inputs: typeof obj.inputs === 'string' ? obj.inputs : undefined, message: `Đã mở «${f.name}».` });
    } catch (err) {
      toast(err instanceof SyntaxError ? 'Tệp không phải JSON hợp lệ.' : err.message, { type: 'error' });
    }
  }, { signal });

  function exportImage(kind) {
    if (!graph.nodes.length) { toast('Lưu đồ đang trống.', { type: 'warning' }); return; }
    const prevSel = [...selN]; const prevE = [...selE];
    selN.clear(); selE.clear(); renderAll();
    const bb = graphBBox();
    if (kind === 'svg') exportSvg(svg, layer, bb, 'luu-do.svg'); else exportPng(svg, layer, bb, 'luu-do.png');
    prevSel.forEach((x) => selN.add(x)); prevE.forEach((x) => selE.add(x)); renderAll();
  }

  /* ---------------- inline text editor ---------------- */
  let editing = null;
  function placeEditor() {
    if (!editing) return;
    const n = byId(editing.id);
    if (!n) return;
    const sz = sizeOf(n);
    const k = vp.state.k;
    const w = Math.max(200, sz.w * k + 20);
    const lines = Math.max(2, inlineEditor.value.split('\n').length + 1);
    const hgt = Math.max(sz.h * k, lines * 19 + 14);
    const c = vp.worldToScreen(n.x, n.y);
    Object.assign(inlineEditor.style, { left: `${c.x - w / 2}px`, top: `${c.y - hgt / 2}px`, width: `${w}px`, height: `${hgt}px` });
  }
  function startEdit(id, selectAll = false) {
    if (!canEdit()) return;
    const n = byId(id);
    if (!n) return;
    editing = { id, orig: n.text };
    inlineEditor.value = n.text;
    inlineEditor.dataset.type = n.type;
    inlineEditor.hidden = false;
    placeEditor();
    inlineEditor.focus();
    if (selectAll) inlineEditor.select(); else inlineEditor.setSelectionRange(n.text.length, n.text.length);
  }
  function endEdit(commitIt) {
    if (!editing) return;
    const { id } = editing;
    editing = null;
    const val = inlineEditor.value.replace(/\s+$/g, '').replace(/^\s+/, '');
    inlineEditor.hidden = true;
    if (commitIt) setNodeText(id, val || DEFAULT_TEXT[byId(id)?.type] || '');
    const g = nodeViews.get(id)?.g;
    if (g) { lastPointerDown = performance.now(); g.focus({ preventScroll: true }); }
  }
  inlineEditor.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { e.preventDefault(); endEdit(false); }
    else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); endEdit(true); }
  }, { signal });
  inlineEditor.addEventListener('input', () => placeEditor(), { signal });
  inlineEditor.addEventListener('blur', () => endEdit(true), { signal });

  /* ---------------- inspector ---------------- */
  function renderInspector() {
    if (selN.size === 1 && !selE.size) {
      const n = byId([...selN][0]);
      if (!n) { mount(inspector); return; }
      const ta = h('textarea', { class: 'fc-textarea', rows: '3', spellcheck: 'false', 'aria-label': 'Nội dung khối', disabled: isLocked() || undefined }, n.text);
      ta.addEventListener('change', () => setNodeText(n.id, ta.value.trim() || DEFAULT_TEXT[n.type]));
      const targets = graph.nodes.filter((m) => m.type !== 'start');
      const portRows = (KINDS[n.type].ports || []).map((p) => {
        const cur = graph.edges.find((e) => e.from === n.id && e.port === p);
        const sel = h('select', { class: 'fc-select', 'aria-label': `Nối ${p === 'out' ? 'tới' : `nhánh ${PORT_LABEL[p]}`}`, disabled: isLocked() || undefined },
          h('option', { value: '' }, '— chưa nối —'),
          targets.map((m) => h('option', { value: m.id, selected: cur?.to === m.id || undefined }, `${KINDS[m.type].label}: ${shortText(m.text, 26)}`)));
        sel.addEventListener('change', () => { if (!canEdit()) return; if (sel.value) setEdge(n.id, p, sel.value); else removeEdge(n.id, p); });
        return h('label', { class: 'fc-field' }, h('span', null, p === 'out' ? 'Đi tới' : `Nhánh ${PORT_LABEL[p]}`), sel);
      });
      mount(inspector,
        h('div', { class: `fc-insp__head fc-cat-${KINDS[n.type].cat}` }, shapeIcon(KINDS[n.type].shape === 'terminal' ? 'terminal' : KINDS[n.type].shape), h('strong', null, KINDS[n.type].label)),
        h('label', { class: 'fc-field' }, h('span', null, 'Nội dung'), ta),
        h('p', { class: 'fc-help' }, HELP[n.type]),
        portRows,
        h('button', { class: 'fc-btn fc-btn--danger-soft', type: 'button', disabled: isLocked() || undefined, onClick: () => deleteSelection() }, fcIcon('trash'), h('span', null, 'Xóa khối')));
      return;
    }
    if (selE.size === 1 && !selN.size) {
      const e = graph.edges.find((x) => x.id === [...selE][0]);
      if (e) {
        const a = byId(e.from); const b = byId(e.to);
        mount(inspector,
          h('div', { class: 'fc-insp__head' }, fcIcon('arrow-right'), h('strong', null, 'Mũi tên')),
          h('p', null, `${nodeName(a)}${e.port !== 'out' ? ` (nhánh ${PORT_LABEL[e.port]})` : ''} → ${nodeName(b)}`),
          h('button', { class: 'fc-btn fc-btn--danger-soft', type: 'button', disabled: isLocked() || undefined, onClick: () => deleteSelection() }, fcIcon('trash'), h('span', null, 'Xóa mũi tên')));
        return;
      }
    }
    mount(inspector,
      h('p', { class: 'fc-help' }, selN.size + selE.size > 1 ? `Đang chọn ${selN.size} khối và ${selE.size} mũi tên.` : 'Chọn một khối để sửa nội dung và cách nối.'),
      h('ul', { class: 'fc-keys' },
        [['Kéo', 'khối từ bảng vào vùng vẽ'], ['Kéo chấm tròn', 'để nối mũi tên'], ['Nháy đúp / Enter', 'sửa chữ trong khối'], ['Delete', 'xóa phần đang chọn'],
          ['Ctrl+Z / Ctrl+Y', 'hoàn tác / làm lại'], ['Shift + kéo', 'chọn nhiều khối'], ['Mũi tên ←↑→↓', 'di chuyển khối'], ['Lăn chuột', 'phóng to / thu nhỏ']]
          .map(([k, v]) => h('li', null, h('kbd', null, k), h('span', null, v)))));
  }

  /* ---------------- pointer interactions ---------------- */
  let drag = null;
  let lastTap = { id: null, t: 0 };
  let lastDownNode = null;
  const tempPath = s('path', { class: 'fc-temp-edge' });
  const marquee = s('rect', { class: 'fc-marquee' });

  function nodeAt(x, y) {
    for (let i = graph.nodes.length - 1; i >= 0; i--) {
      const n = graph.nodes[i]; const sz = sizeOf(n);
      if (Math.abs(x - n.x) <= sz.w / 2 + 6 && Math.abs(y - n.y) <= sz.h / 2 + 6) return n;
    }
    return null;
  }

  svg.addEventListener('pointerdown', (e) => {
    lastPointerDown = performance.now();
    if (editing) endEdit(true);
    if (e.pointerType === 'mouse' && e.button === 1) { vp.startPan(e); drag = { kind: 'pan', id: e.pointerId, x: e.clientX, y: e.clientY }; e.preventDefault(); return; }
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const locked = isLocked();
    const portEl = e.target.closest?.('.fc-port');
    const nodeG = e.target.closest?.('.fc-dnode');
    const edgeG = e.target.closest?.('.fc-dedge');
    lastDownNode = nodeG && !portEl ? nodeG.dataset.id : null;
    const w = vp.screenToWorld(e.clientX, e.clientY);
    if (!nodeG) canvas.focus({ preventScroll: true });
    if (portEl && nodeG && !locked) {
      if (run?.finished) clearRun();
      const from = nodeG.dataset.id; const port = portEl.dataset.port;
      drag = { kind: 'connect', id: e.pointerId, from, port, target: null };
      gOverlay.appendChild(tempPath);
      updateTemp(w);
      svg.setPointerCapture(e.pointerId);
      e.preventDefault();
      return;
    }
    if (nodeG) {
      const id = nodeG.dataset.id;
      if (e.shiftKey || e.ctrlKey || e.metaKey) { if (selN.has(id)) selN.delete(id); else selN.add(id); }
      else if (!selN.has(id)) { selN.clear(); selE.clear(); selN.add(id); }
      // double tap (touch)
      const now = performance.now();
      if (e.pointerType !== 'mouse' && lastTap.id === id && now - lastTap.t < 380) { lastTap = { id: null, t: 0 }; renderAll(); startEdit(id); e.preventDefault(); return; }
      lastTap = { id, t: now };
      if (!locked) {
        const origins = new Map(graph.nodes.filter((n) => selN.has(n.id)).map((n) => [n.id, { x: n.x, y: n.y }]));
        drag = { kind: 'move', id: e.pointerId, start: w, origins, moved: false, sx: e.clientX, sy: e.clientY };
        svg.setPointerCapture(e.pointerId);
      }
      renderAll();
      return;
    }
    if (edgeG) {
      const id = edgeG.dataset.edge;
      if (e.shiftKey || e.ctrlKey || e.metaKey) { if (selE.has(id)) selE.delete(id); else selE.add(id); }
      else { selN.clear(); selE.clear(); selE.add(id); }
      renderAll();
      return;
    }
    if (e.shiftKey && !locked) {
      drag = { kind: 'marquee', id: e.pointerId, start: w, add: e.ctrlKey || e.metaKey };
      gOverlay.appendChild(marquee);
      svg.setPointerCapture(e.pointerId);
      return;
    }
    vp.startPan(e);
    drag = { kind: 'pan', id: e.pointerId, x: e.clientX, y: e.clientY };
  }, { signal });

  function updateTemp(w) {
    const S = byId(drag.from);
    const A = anchorOf(S, drag.port);
    const T = nodeAt(w.x, w.y);
    const tgt = T && T.type !== 'start' ? T : null;
    drag.target = tgt?.id || null;
    nodeViews.forEach((v, id) => v.g.classList.toggle('is-drop', id === drag.target));
    let d;
    if (tgt) {
      const r = route({ from: drag.from, port: drag.port, to: tgt.id });
      d = r.d;
    } else d = curvedPath([A.x, A.y], A.dir, [w.x, w.y], w.y > A.y ? 'down' : 'up');
    tempPath.setAttribute('d', d);
    tempPath.setAttribute('marker-end', defs.arrowSel);
  }

  svg.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const w = vp.screenToWorld(e.clientX, e.clientY);
    if (drag.kind === 'move') {
      if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 4) return;
      drag.moved = true;
      const dx = w.x - drag.start.x; const dy = w.y - drag.start.y;
      for (const [id, o] of drag.origins) {
        const n = byId(id);
        if (!n) continue;
        n.x = e.altKey ? o.x + dx : snap(o.x + dx);
        n.y = e.altKey ? o.y + dy : snap(o.y + dy);
      }
      renderEdges();
      renderNodes();
    } else if (drag.kind === 'connect') {
      updateTemp(w);
    } else if (drag.kind === 'marquee') {
      const x = Math.min(w.x, drag.start.x); const y = Math.min(w.y, drag.start.y);
      marquee.setAttribute('x', x); marquee.setAttribute('y', y);
      marquee.setAttribute('width', Math.abs(w.x - drag.start.x)); marquee.setAttribute('height', Math.abs(w.y - drag.start.y));
      drag.rect = { x, y, w: Math.abs(w.x - drag.start.x), h: Math.abs(w.y - drag.start.y) };
    }
  }, { signal });

  const finishDrag = (e, cancelled) => {
    if (!drag || e.pointerId !== drag.id) return;
    const d = drag;
    drag = null;
    if (d.kind === 'move') {
      if (d.moved && !cancelled) commit();
      renderAll();
    } else if (d.kind === 'connect') {
      tempPath.remove();
      nodeViews.forEach((v) => v.g.classList.remove('is-drop'));
      if (!cancelled && d.target) setEdge(d.from, d.port, d.target);
    } else if (d.kind === 'marquee') {
      marquee.remove();
      if (!cancelled && d.rect) {
        if (!d.add) { selN.clear(); selE.clear(); }
        for (const n of graph.nodes) {
          const sz = sizeOf(n);
          if (n.x + sz.w / 2 >= d.rect.x && n.x - sz.w / 2 <= d.rect.x + d.rect.w && n.y + sz.h / 2 >= d.rect.y && n.y - sz.h / 2 <= d.rect.y + d.rect.h) selN.add(n.id);
        }
        for (const ed of graph.edges) if (selN.has(ed.from) && selN.has(ed.to)) selE.add(ed.id);
        renderAll();
      }
    } else if (d.kind === 'pan') {
      if (!cancelled && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 4 && (selN.size || selE.size)) {
        selN.clear(); selE.clear(); renderAll();
      }
    }
  };
  svg.addEventListener('pointerup', (e) => finishDrag(e, false), { signal });
  svg.addEventListener('pointercancel', (e) => finishDrag(e, true), { signal });
  svg.addEventListener('dblclick', (e) => {
    // pointer capture may retarget the event to <svg>: fall back to the node under the last pointerdown
    const nodeG = e.target.closest?.('.fc-dnode') || (lastDownNode ? nodeViews.get(lastDownNode)?.g : null);
    if (nodeG) { e.preventDefault(); startEdit(nodeG.dataset.id); return; }
    if (e.target.closest?.('.fc-dedge') || e.target.closest?.('.fc-port')) return;
    // double click on empty canvas: add a process block there
    if (isLocked()) return;
    const w = vp.screenToWorld(e.clientX, e.clientY);
    addNode('process', w.x, w.y);
  }, { signal });

  // palette drag & drop
  let pdrag = null;
  palette.addEventListener('pointerdown', (e) => {
    const item = e.target.closest('.fc-palette__item');
    if (!item || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (isLocked()) { canEdit(); return; }
    e.preventDefault();
    const type = item.dataset.type;
    const ghost = h('div', { class: `fc-ghost fc-cat-${KINDS[type].cat}` }, shapeIcon(KINDS[type].shape), h('span', null, KINDS[type].label));
    pdrag = { type, id: e.pointerId, sx: e.clientX, sy: e.clientY, moved: false, ghost, item };
    try { item.setPointerCapture(e.pointerId); } catch { /* ignore */ }
  }, { signal });
  palette.addEventListener('pointermove', (e) => {
    if (!pdrag || e.pointerId !== pdrag.id) return;
    if (!pdrag.moved && Math.hypot(e.clientX - pdrag.sx, e.clientY - pdrag.sy) > 5) {
      pdrag.moved = true;
      document.body.appendChild(pdrag.ghost);
      canvas.classList.add('is-dropzone');
    }
    if (pdrag.moved) {
      pdrag.ghost.style.transform = `translate(${e.clientX - 40}px, ${e.clientY - 18}px)`;
      const r = canvas.getBoundingClientRect();
      const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      pdrag.ghost.classList.toggle('is-over', inside);
    }
  }, { signal });
  const endPalette = (e, cancelled) => {
    if (!pdrag || e.pointerId !== pdrag.id) return;
    const d = pdrag;
    pdrag = null;
    d.ghost.remove();
    canvas.classList.remove('is-dropzone');
    if (cancelled) return;
    if (!d.moved) { addNodeAtCenter(d.type); return; }
    const r = canvas.getBoundingClientRect();
    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
      const w = vp.screenToWorld(e.clientX, e.clientY);
      addNode(d.type, w.x, w.y);
    }
  };
  palette.addEventListener('pointerup', (e) => endPalette(e, false), { signal });
  palette.addEventListener('pointercancel', (e) => endPalette(e, true), { signal });
  palette.addEventListener('click', (e) => {
    const item = e.target.closest('.fc-palette__item');
    if (item && e.detail === 0) addNodeAtCenter(item.dataset.type); // keyboard activation
  }, { signal });

  /* ---------------- keyboard ---------------- */
  el.addEventListener('keydown', (e) => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    const mod = e.ctrlKey || e.metaKey;
    const inCanvas = canvas.contains(e.target);
    if (e.key === 'F5') { e.preventDefault(); startRun('run'); return; }
    if (e.key === 'F10') { e.preventDefault(); startRun('step'); return; }
    if (mod && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) { e.preventDefault(); undo(); return; }
    if (mod && (e.key === 'y' || e.key === 'Y' || ((e.key === 'z' || e.key === 'Z') && e.shiftKey))) { e.preventDefault(); redo(); return; }
    if (!inCanvas) return;
    if (mod && (e.key === 'a' || e.key === 'A')) { e.preventDefault(); graph.nodes.forEach((n) => selN.add(n.id)); graph.edges.forEach((x) => selE.add(x.id)); renderAll(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelection(); return; }
    if ((e.key === 'Enter' || e.key === 'F2') && selN.size === 1) { e.preventDefault(); startEdit([...selN][0]); return; }
    if (e.key === 'Escape') { if (selN.size || selE.size) { selN.clear(); selE.clear(); renderAll(); } return; }
    if (e.key === '+' || e.key === '=') { vp.zoomCenter(1.2); return; }
    if (e.key === '-') { vp.zoomCenter(1 / 1.2); return; }
    if (e.key === '0') { fitView(); return; }
    const arrows = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (arrows[e.key]) {
      e.preventDefault();
      const [dx, dy] = arrows[e.key];
      if (selN.size) {
        if (!canEdit()) return;
        for (const n of graph.nodes) if (selN.has(n.id)) { n.x += dx * GRID; n.y += dy * GRID; }
        commit();
        renderAll();
        const n = byId([...selN][0]);
        if (n) vp.ensureVisible(n.x, n.y, sizeOf(n).w, sizeOf(n).h);
      } else {
        vp.state.x -= dx * 60; vp.state.y -= dy * 60; vp.apply();
      }
    }
  }, { signal });

  /* ---------------- execution ---------------- */
  function logLine(text, cls = 'out') {
    const last = consoleEl.lastElementChild;
    if (cls === 'out' && last && last.classList.contains('fc-log--out') && !last.dataset.closed) {
      last.textContent += text;
    } else {
      consoleEl.appendChild(h('span', { class: `fc-log fc-log--${cls}` }, text));
    }
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }
  function closeOut() { const last = consoleEl.lastElementChild; if (last) last.dataset.closed = '1'; }

  function logErrorWithNode(message, nodeId) {
    const item = h('div', { class: 'fc-log fc-log--err' }, fcIcon('x-circle'), h('span', null, message));
    if (nodeId) {
      item.appendChild(h('button', { class: 'fc-link', type: 'button', onClick: () => focusNode(nodeId) }, 'Xem khối'));
    }
    consoleEl.appendChild(item);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  }

  function focusNode(id) {
    const n = byId(id);
    if (!n) return;
    selN.clear(); selE.clear(); selN.add(id);
    renderAll();
    vp.centerOn(n.x, n.y);
  }

  function typeShort(v) {
    if (v === null) return 'None';
    if (typeof v === 'boolean') return 'bool';
    if (typeof v === 'bigint') return 'int';
    if (typeof v === 'number') return 'float';
    if (typeof v === 'string') return 'str';
    if (Array.isArray(v)) return 'list';
    return '';
  }

  function renderWatch(changed = new Set()) {
    if (!run) { mount(watchBody, h('tr', { class: 'fc-watch__empty' }, h('td', { colspan: '3' }, 'Chưa có biến — hãy bấm Chạy hoặc Từng bước.'))); return; }
    const rows = [...run.runner.vars.entries()].map(([k, v]) => {
      let txt = pyRepr(v);
      if (txt.length > 60) txt = `${txt.slice(0, 59)}…`;
      return h('tr', { class: changed.has(k) ? 'is-changed' : '' }, h('td', { class: 'fc-mono' }, k), h('td', { class: 'fc-mono', title: pyRepr(v) }, txt), h('td', { class: 'fc-type' }, typeShort(v)));
    });
    mount(watchBody, rows.length ? rows : h('tr', { class: 'fc-watch__empty' }, h('td', { colspan: '3' }, 'Chưa có biến nào được gán.')));
  }

  function setStatus(text, kind = '') {
    runStatus.textContent = text;
    runStatus.className = `fc-runstatus${kind ? ` is-${kind}` : ''}`;
  }

  function clearRun() {
    if (!run) return;
    clearTimeout(run.timer);
    cancelAnimationFrame(run.raf);
    run = null;
    promptBox.hidden = true;
    renderAll();
  }

  function stopRun() {
    if (!run) return;
    const wasActive = !run.finished;
    clearRun();
    errorIds.clear();
    renderAll();
    renderWatch();
    if (wasActive) { closeOut(); logLine('■ Đã dừng chạy thử.', 'info'); }
    setStatus('Sẵn sàng');
  }

  function pauseRun() {
    if (!run || run.finished || run.mode !== 'run') return;
    clearTimeout(run.timer);
    cancelAnimationFrame(run.raf);
    run.mode = 'step';
    setStatus(`Tạm dừng sau ${run.runner.steps} bước — bấm «Từng bước» hoặc «Chạy» để tiếp tục.`, 'paused');
    updateButtons();
  }

  function inputLines() {
    const lines = inputsArea.value.replace(/\r\n?/g, '\n').split('\n');
    while (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  function startRun(mode) {
    if (editing) endEdit(true);
    if (run && !run.finished) {
      if (run.waiting) { promptBox.querySelector('input')?.focus(); return; }
      run.mode = mode;
      updateButtons();
      if (mode === 'run') schedule(); else doStep();
      return;
    }
    // fresh run
    clearRun();
    errorIds.clear();
    const v = validateGraph(graph);
    setTab('run');
    mount(consoleEl);
    if (!v.ok) {
      v.errors.forEach((er) => { if (er.nodeId) errorIds.add(er.nodeId); logErrorWithNode(er.message, er.nodeId); });
      setStatus(`Lưu đồ chưa hợp lệ (${v.errors.length} lỗi) — hãy sửa các khối được tô đỏ.`, 'error');
      renderAll();
      const first = v.errors.find((x) => x.nodeId);
      if (first) { const n = byId(first.nodeId); if (n) vp.ensureVisible(n.x, n.y, sizeOf(n).w, sizeOf(n).h); }
      return;
    }
    let runner;
    try { runner = new Runner(JSON.parse(JSON.stringify(graph)), { inputs: inputLines(), maxSteps: MAX_STEPS }); } catch (err) {
      logErrorWithNode(err.message); return;
    }
    run = { runner, mode, currentId: runner.current, edgeId: null, visited: new Set(), finished: false, waiting: false, timer: 0, raf: 0, error: false };
    logLine('▶ Bắt đầu chạy thử', 'info');
    closeOut();
    renderWatch();
    renderAll();
    setStatus('Đang chạy…', 'running');
    if (mode === 'run') schedule(); else { setStatus('Chế độ từng bước — bấm «Từng bước» (F10) để thực hiện khối đang sáng.', 'paused'); updateButtons(); }
  }

  function schedule() {
    if (!run || run.finished || run.mode !== 'run' || run.waiting) return;
    const delay = SPEEDS[Number(speed.value) - 1];
    setStatus('Đang chạy…', 'running');
    if (delay === 0) {
      run.raf = requestAnimationFrame(() => {
        const t0 = performance.now();
        let r;
        do { r = doStep(true); } while (r === 'ok' && performance.now() - t0 < 12);
        renderAll();
        renderWatch();
        if (r === 'ok') schedule();
      });
    } else {
      run.timer = setTimeout(() => { if (doStep() === 'ok') schedule(); }, delay);
    }
  }

  function doStep(silent = false) {
    if (!run || run.finished) return 'done';
    const before = new Map([...run.runner.vars.entries()].map(([k, v]) => [k, pyRepr(v)]));
    const r = run.runner.step();
    if (r.echo?.length) for (const ec of r.echo) { closeOut(); logLine(`› ${ec.name} = ${ec.raw}`, 'echo'); closeOut(); }
    if (r.write) logLine(r.write, 'out');
    const changed = new Set();
    for (const [k, v] of run.runner.vars) if (before.get(k) !== pyRepr(v)) changed.add(k);
    if (r.status === 'ok') {
      run.visited.add(r.nodeId);
      run.currentId = r.nextId;
      run.edgeId = r.edgeId;
      if (!silent) {
        renderAll();
        renderWatch(changed);
        setStatus(`Bước ${run.runner.steps}: ${nodeName(r.node)}${r.port && r.port !== 'out' ? ` → nhánh ${PORT_LABEL[r.port]}` : ''}`, run.mode === 'run' ? 'running' : 'paused');
        const n = byId(r.nextId);
        if (n && run.mode !== 'run') vp.ensureVisible(n.x, n.y, sizeOf(n).w, sizeOf(n).h);
      }
      return 'ok';
    }
    if (r.status === 'need-input') {
      run.waiting = true;
      run.currentId = r.nodeId;
      renderAll();
      renderWatch(changed);
      showPrompt(r.varName, r.varType);
      return 'wait';
    }
    if (r.status === 'done') {
      run.visited.add(r.nodeId);
      run.currentId = r.nodeId;
      run.edgeId = null;
      run.finished = true;
      closeOut();
      logLine(`✔ Chương trình kết thúc sau ${run.runner.steps} bước.`, 'ok');
      setStatus(`Hoàn thành sau ${run.runner.steps} bước.`, 'ok');
      renderAll();
      renderWatch(changed);
      return 'done';
    }
    if (r.status === 'error') {
      run.finished = true;
      run.error = true;
      run.currentId = r.nodeId;
      run.edgeId = null;
      errorIds.add(r.nodeId);
      closeOut();
      logErrorWithNode(r.error.message, r.nodeId);
      setStatus('Dừng vì lỗi — xem khối được tô đỏ.', 'error');
      renderAll();
      renderWatch(changed);
      const n = byId(r.nodeId);
      if (n) vp.ensureVisible(n.x, n.y, sizeOf(n).w, sizeOf(n).h);
      return 'error';
    }
    return 'done';
  }

  function showPrompt(name, type) {
    const tname = type === 'float' ? 'số thực' : type === 'str' ? 'chuỗi' : 'số nguyên';
    const input = h('input', { class: 'fc-input', type: 'text', 'aria-label': `Giá trị cho ${name}`, autocomplete: 'off', inputmode: type === 'str' ? 'text' : 'decimal' });
    mount(promptBox,
      h('label', { class: 'fc-prompt__label' }, fcIcon('arrow-right'), h('span', null, 'Hết dữ liệu vào — nhập giá trị cho '), h('b', { class: 'fc-mono' }, name), h('small', null, ` (${tname})`)),
      h('div', { class: 'fc-prompt__row' }, input, h('button', { class: 'fc-btn fc-btn--primary', type: 'submit' }, 'Gửi')));
    promptBox.hidden = false;
    setStatus(`Đang chờ nhập ${name}…`, 'paused');
    updateButtons();
    setTab('run');
    setTimeout(() => input.focus(), 30);
  }
  promptBox.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!run || !run.waiting) return;
    const input = promptBox.querySelector('input');
    run.runner.provideInput(input.value);
    run.waiting = false;
    promptBox.hidden = true;
    updateButtons();
    const res = doStep();
    if (res === 'ok' && run && run.mode === 'run') schedule();
  }, { signal });

  /* ---------------- Python ---------------- */
  function showPython() {
    if (editing) endEdit(true);
    let res;
    try { res = generatePython(graph); } catch (err) { toast(`Không chuyển được: ${err.message}`, { type: 'error' }); return; }
    if (!res.ok) {
      errorIds.clear();
      setTab('run');
      mount(consoleEl);
      res.errors.forEach((er) => { if (er.nodeId) errorIds.add(er.nodeId); logErrorWithNode(er.message, er.nodeId); });
      setStatus('Hãy sửa lưu đồ trước khi chuyển thành Python.', 'error');
      renderAll();
      toast('Lưu đồ chưa hợp lệ — xem danh sách lỗi ở bảng «Chạy thử».', { type: 'warning' });
      return;
    }
    const note = res.mode === 'structured'
      ? h('p', { class: 'fc-dialog__note' }, fcIcon('check-circle'), 'Đã nhận ra cấu trúc if/else và vòng lặp while từ lưu đồ.')
      : h('p', { class: 'fc-dialog__note is-warn' }, fcIcon('alert'), 'Lưu đồ có đường nhảy chéo nên được dịch thành vòng lặp «máy trạng thái» (biến buoc). Chương trình vẫn chạy đúng như lưu đồ.');
    const content = h('div', { class: 'fc-dialog' }, note, h('pre', { class: 'fc-dialog__code' }, h('code', null, raw(highlight(res.code, 'python')))));
    const actions = [
      { label: 'Sao chép', icon: 'copy', variant: 'ghost', onClick: async () => { const ok = await copyText(res.code); toast(ok ? 'Đã sao chép mã Python.' : 'Không sao chép được.', { type: ok ? 'success' : 'error' }); return false; } },
    ];
    if (onSendToEditor) actions.push({ label: 'Mở trong trình soạn thảo', icon: 'code', variant: 'primary', onClick: () => { onSendToEditor(res.code); } });
    else actions.push({ label: 'Đóng', variant: 'primary' });
    openModal({ title: 'Mã Python từ lưu đồ', size: 'lg', content, actions });
  }

  /* ---------------- init ---------------- */
  function init() {
    let loaded = false;
    const rawSaved = storageGet();
    if (rawSaved) {
      try {
        const obj = JSON.parse(rawSaved);
        graph = sanitizeGraph(obj.graph || obj);
        if (typeof obj.inputs === 'string') inputsArea.value = obj.inputs;
        if (obj.edgeStyle === 'curve' || obj.edgeStyle === 'ortho') edgeStyle = obj.edgeStyle;
        if (Number(obj.speed) >= 1 && Number(obj.speed) <= 10) { speed.value = String(obj.speed); speedName.textContent = SPEED_NAMES[obj.speed - 1]; }
        loaded = true;
      } catch { loaded = false; }
    }
    if (!loaded) {
      const t = TEMPLATES[0];
      graph = sanitizeGraph(JSON.parse(JSON.stringify(t.graph)));
      inputsArea.value = t.inputs;
    }
    current = snapshot();
    setEdgeStyle(edgeStyle);
    renderAll();
    renderWatch();
    renderInspector();
  }
  init();

  return {
    el,
    onShow() {
      shown = true;
      if (!fitted) { fitted = true; requestAnimationFrame(() => fitView(false)); }
    },
    loadGraph,
    getGraph: () => JSON.parse(JSON.stringify(graph)),
    fit: () => fitView(false),
    destroy() { if (run) clearRun(); save.cancel(); saveNow(); },
    // test hooks
    _debug: { get graph() { return graph; }, startRun, stopRun, undo, redo, get run() { return run; }, vp },
  };
}
