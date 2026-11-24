// V-Code Edu — Flowchart studio: live flowchart generated from the IDE editor code.
import { h, s, mount } from '../../core/dom.js';
import { icon } from '../icons.js';
import { toast } from '../../core/ui.js';
import { parseProgram, normalizeLangName } from './parse-code.js';
import { layoutProgram, arrange } from './layout.js';
import { makeDefs, nodeEl, roundedPath, labelPos, edgeLabelEl, labelKind } from './render.js';
import { createViewport } from './viewport.js';
import { exportSvg, exportPng } from './export.js';
import { FC_ICONS, fcIcon } from './icons-local.js';

const LANG_NAMES = { python: 'Python', pyvn: 'Python Tiếng Việt', c: 'C', cpp: 'C++', javascript: 'JavaScript', typescript: 'TypeScript', java: 'Java' };

export function createLiveView({ signal, getCode, onJumpToLine, onConvert }) {
  const defs = makeDefs();
  const layer = s('g', { 'data-layer': '' });
  const svg = s('svg', { class: 'fc-svg', role: 'group', 'aria-label': 'Lưu đồ sinh từ mã nguồn' }, defs.el, layer);
  const empty = h('div', { class: 'fc-empty', hidden: true });
  const warnBar = h('div', { class: 'fc-warnbar', hidden: true });
  const canvas = h('div', { class: 'fc-canvas fc-canvas--live' }, svg, empty);
  const status = h('span', { class: 'fc-status' }, 'Đang chờ mã nguồn…');
  const langPill = h('span', { class: 'fc-pill' }, '—');
  const zoomLabel = h('button', { class: 'fc-btn fc-btn--ghost fc-zoomlabel', type: 'button', title: 'Về 100%', 'aria-label': 'Đặt mức phóng 100%' }, '100%');

  const btn = (ic, label, onClick, extra = {}) => h('button', {
    class: `fc-btn ${extra.cls || 'fc-btn--ghost fc-btn--icon'}`, type: 'button', title: label, 'aria-label': label, onClick,
  }, typeof ic === 'string' ? (FC_ICONS[ic] ? fcIcon(ic) : icon(ic)) : ic, extra.text ? h('span', { class: 'fc-btn__text' }, extra.text) : null);

  const vp = createViewport({
    host: canvas, svg, layer, signal, minZoom: 0.15, maxZoom: 3,
    onChange: (st) => { zoomLabel.textContent = `${Math.round(st.k * 100)}%`; },
  });

  let graph = null;
  let program = null;
  let lastSig = '';
  let userMoved = false;
  let activeId = null;
  let lastCode = null; let lastLang = null;
  let charts = null;
  let arrangement = 'row';

  const toolbar = h('div', { class: 'fc-toolbar' },
    h('div', { class: 'fc-toolbar__group fc-toolbar__info' }, langPill, status),
    h('div', { class: 'fc-toolbar__group' },
      btn('minus', 'Thu nhỏ', () => { userMoved = true; vp.zoomCenter(1 / 1.2); }),
      zoomLabel,
      btn('plus', 'Phóng to', () => { userMoved = true; vp.zoomCenter(1.2); }),
      btn('fit', 'Vừa khung nhìn', () => fitView(true)),
      h('span', { class: 'fc-sep' }),
      btn('download', 'Tải ảnh SVG', () => doExport('svg'), { cls: 'fc-btn--ghost', text: 'SVG' }),
      btn('image', 'Tải ảnh PNG', () => doExport('png'), { cls: 'fc-btn--ghost', text: 'PNG' }),
      h('span', { class: 'fc-sep' }),
      btn('wand', 'Tạo lưu đồ có thể chỉnh sửa từ mã hiện tại', () => convert(), { cls: 'fc-btn--soft', text: 'Tạo lưu đồ từ mã hiện tại' }),
    ),
  );
  zoomLabel.addEventListener('click', () => { userMoved = true; vp.setZoom(1); });

  const legend = h('div', { class: 'fc-legend', 'aria-hidden': 'true' },
    ...[['start', 'Bắt đầu/Kết thúc'], ['io', 'Nhập/Xuất'], ['proc', 'Xử lý'], ['dec', 'Điều kiện'], ['call', 'Chương trình con']]
      .map(([c, t]) => h('span', { class: `fc-legend__item fc-cat-${c}` }, h('i'), t)));

  const el = h('div', { class: 'fc-live' }, toolbar, h('div', { class: 'fc-live__stage' }, canvas, warnBar, legend));

  // pan on empty space, click on nodes
  let downNode = null;
  svg.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    downNode = e.target.closest?.('.fc-node.is-link')?.dataset.id || null;
    vp.startPan(e);
    userMoved = true;
  }, { signal });
  svg.addEventListener('pointerup', (e) => {
    // pointer capture retargets click events, so resolve the node from pointerdown
    if (downNode && !vp.panMoved) {
      const under = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('.fc-node');
      if (!under || under.dataset.id === downNode) activate(downNode);
    }
    downNode = null;
  }, { signal, capture: true });
  svg.addEventListener('keydown', (e) => {
    const g = e.target.closest?.('.fc-node');
    if (g && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); activate(g.dataset.id); }
  }, { signal });
  svg.addEventListener('wheel', () => { userMoved = true; }, { passive: true, signal });

  function activate(id) {
    const n = graph?.nodes.find((x) => x.id === id);
    if (!n) return;
    activeId = id;
    layer.querySelectorAll('.fc-node.is-active').forEach((x) => x.classList.remove('is-active'));
    layer.querySelector(`.fc-node[data-id="${id}"]`)?.classList.add('is-active');
    if (n.line) onJumpToLine?.(n.line);
  }

  function showEmpty(title, text, iconName = 'flow') {
    mount(empty, h('div', { class: 'fc-empty__icon' }, fcIcon(iconName)), h('strong', null, title), text ? h('p', null, text) : null);
    empty.hidden = false;
    mount(layer);
    graph = null;
  }

  function chooseArrangement() {
    if (!charts || charts.length < 2) return 'row';
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height) return arrangement;
    const a = arrange(charts, 'row').bbox; const b = arrange(charts, 'column').bbox;
    const ka = Math.min(r.width / a.w, r.height / a.h);
    const kb = Math.min(r.width / b.w, r.height / b.h);
    return kb > ka * 1.08 ? 'column' : 'row';
  }

  function update(code, lang) {
    lastCode = code; lastLang = lang;
    const l = normalizeLangName(lang);
    langPill.textContent = LANG_NAMES[l] || l;
    if (!String(code || '').trim()) {
      status.textContent = 'Chưa có mã nguồn';
      warnBar.hidden = true;
      showEmpty('Chưa có mã để vẽ lưu đồ', 'Hãy viết chương trình trong trình soạn thảo — lưu đồ sẽ tự cập nhật theo từng dòng bạn gõ.');
      return;
    }
    try {
      program = parseProgram(code, lang);
    } catch (err) {
      status.textContent = 'Không phân tích được mã';
      showEmpty('Không đọc được cấu trúc chương trình', String(err?.message || err), 'alert');
      return;
    }
    if (program.unsupported) {
      status.textContent = 'Ngôn ngữ chưa hỗ trợ';
      warnBar.hidden = true;
      showEmpty('Lưu đồ chưa hỗ trợ ngôn ngữ này', 'Hãy dùng Python, Python Tiếng Việt, C, C++, JavaScript hoặc Java.', 'alert');
      return;
    }
    if (program.empty) {
      status.textContent = 'Chưa có câu lệnh';
      showEmpty('Chưa có câu lệnh để vẽ', 'Chương trình hiện chỉ có chú thích hoặc khai báo.');
      return;
    }
    empty.hidden = true;
    const lay = layoutProgram(program);
    charts = lay.charts;
    arrangement = chooseArrangement();
    graph = arrange(charts, arrangement);
    const warnings = [...program.warnings, ...lay.warnings];
    if (warnings.length) {
      mount(warnBar, fcIcon('alert'), h('span', null, warnings[0]), warnings.length > 1 ? h('span', { class: 'fc-warnbar__more' }, ` (+${warnings.length - 1})`) : null);
      warnBar.title = warnings.join('\n');
      warnBar.hidden = false;
    } else warnBar.hidden = true;
    const nNodes = graph.nodes.length;
    const fnCount = program.functions.length;
    status.textContent = `${nNodes} khối${fnCount ? ` · ${fnCount} hàm` : ''}`;
    render();
    const sig = graph.nodes.map((n) => n.kind).join(',');
    if (!userMoved || !lastSig) fitView(!lastSig ? false : true);
    lastSig = sig;
  }

  function render() {
    const parts = [];
    for (const gr of graph.groups) {
      if (!gr.showTitle) continue;
      parts.push(s('g', { class: 'fc-group' },
        s('rect', { class: 'fc-group__frame', x: gr.x, y: gr.y, width: gr.w, height: gr.h, rx: 12 }),
        s('text', { class: 'fc-group__title', x: gr.x + 14, y: gr.y + 20 }, gr.title)));
    }
    const edgeG = s('g', { class: 'fc-edges' });
    const labelG = s('g', { class: 'fc-labels' });
    for (const e of graph.edges) {
      edgeG.appendChild(s('path', { class: `fc-edge${e.back ? ' fc-edge--back' : ''}`, d: roundedPath(e.pts), 'marker-end': defs.arrow }));
      if (e.label) {
        const lab = edgeLabelEl(e.label, labelPos(e.pts), labelKind(e.label));
        if (lab) labelG.appendChild(lab);
      }
    }
    const dotG = s('g', { class: 'fc-dots' }, graph.dots.map(([x, y]) => s('circle', { class: 'fc-dot', cx: x, cy: y, r: 3.2 })));
    const nodeG = s('g', { class: 'fc-nodes' });
    for (const n of graph.nodes) {
      const title = n.line ? `Dòng ${n.line}: ${n.text}` : n.text;
      const g = nodeEl(n, { extraClass: `${n.line ? 'is-link' : ''} ${n.id === activeId ? 'is-active' : ''}`, title });
      if (n.line) {
        g.setAttribute('tabindex', '0');
        g.setAttribute('role', 'button');
        g.setAttribute('aria-label', `Dòng ${n.line}: ${n.text}. Nhấn Enter để tới dòng này trong trình soạn thảo`);
      }
      nodeG.appendChild(g);
    }
    mount(layer, ...parts, edgeG, dotG, nodeG, labelG);
  }

  function fitView(animate = true) {
    if (!graph) return;
    userMoved = false;
    vp.fit(graph.bbox, { padding: 28, maxK: 1.15, animate });
  }

  function doExport(kind) {
    if (!graph) { toast('Chưa có lưu đồ để tải về.', { type: 'warning' }); return; }
    if (kind === 'svg') exportSvg(svg, layer, graph.bbox, 'luu-do-tu-ma.svg');
    else exportPng(svg, layer, graph.bbox, 'luu-do-tu-ma.png');
  }

  /** Build an editable designer graph from the current code. */
  function buildDesignerGraph() {
    const src = getCode?.() || { code: lastCode, lang: lastLang };
    const prog = parseProgram(src.code || '', src.lang);
    if (prog.unsupported) throw new Error('Ngôn ngữ này chưa hỗ trợ tạo lưu đồ.');
    if (!prog.main.length) throw new Error(prog.functions.length ? 'Chương trình chính đang trống (chỉ có định nghĩa hàm).' : 'Chưa có câu lệnh để tạo lưu đồ.');
    const lay = layoutProgram(prog, { forDesigner: true });
    const g = arrange(lay.charts.slice(0, 1), 'row');
    const typeOf = (k) => ({ start: 'start', fnstart: 'start', end: 'end', return: 'end', input: 'input', output: 'output', process: 'process', call: 'call', decision: 'decision', foreach: 'decision' }[k] || 'process');
    const nodes = g.nodes.map((n) => {
      const type = typeOf(n.kind);
      let text = n.designText ?? n.text;
      if (type === 'end') text = 'Kết thúc';
      if (type === 'start') text = 'Bắt đầu';
      return { id: n.id, type, text, x: Math.round(n.x / 10) * 10, y: Math.round(n.y / 10) * 10 };
    });
    const seen = new Set();
    const edges = [];
    g.edges.forEach((e, i) => {
      const key = `${e.from}:${e.port}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push({ id: `e${i + 1}`, from: e.from, port: e.port, to: e.to });
    });
    const skipped = prog.functions.length;
    return { graph: { nodes, edges }, skipped };
  }

  function convert() {
    try {
      const res = buildDesignerGraph();
      onConvert?.(res.graph, res.skipped);
    } catch (err) {
      toast(err.message || 'Không tạo được lưu đồ.', { type: 'warning' });
    }
  }

  return {
    el,
    update,
    refresh() {
      const src = getCode?.();
      if (src) update(src.code, src.lang);
    },
    resize() {
      if (!graph || !charts) return;
      const next = chooseArrangement();
      if (next !== arrangement) { arrangement = next; graph = arrange(charts, arrangement); render(); }
      if (!userMoved) fitView(false);
    },
    buildDesignerGraph,
    getGraph: () => graph,
    hasContent: () => !!graph,
  };
}
