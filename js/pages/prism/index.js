// V-Prism — "Lăng kính thuật toán": interactive algorithm & data-structure visualizations.
// Visual identity: a scientific instrument lab — graph-paper canvas, hairline panels with corner ticks,
// rulers, monospace readouts, category colours per topic.
import { h, s, mount, raw, debounce } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { highlight } from '../../components/highlight.js';
import { markdown, enhanceMarkdown } from '../../components/markdown.js';
import { copyText, toast } from '../../core/ui.js';
import { kv } from '../../core/idb.js';
import { PRISM_TOPICS, PRISM_CATEGORIES, loadTopic } from './catalog.js';
import { Player } from './engine.js';
import { RENDERERS } from './renderers.js';

const SPEEDS = [0.25, 0.5, 1, 1.5, 2, 3, 4];
const CODE_LANGS = [['python', 'Python'], ['cpp', 'C++'], ['javascript', 'JavaScript']];
const CAT_CODE = { linear: 'LIN', algorithms: 'ALG', trees: 'TRE', graphs: 'GRA', techniques: 'TEC' };

// Complexity classes (ordered by growth) — used by the catalog legend, card chips and complexity gauges.
const CX = [
  { id: 'c1', label: 'O(1)', name: 'hằng số' },
  { id: 'clog', label: 'O(log n)', name: 'logarit' },
  { id: 'cn', label: 'O(n)', name: 'tuyến tính' },
  { id: 'cnlog', label: 'O(n log n)', name: 'tuyến tính-logarit' },
  { id: 'cn2', label: 'O(n²)', name: 'đa thức' },
  { id: 'cexp', label: 'O(2ⁿ)', name: 'hàm mũ' },
];
/** Classify a free-form complexity string (e.g. "O(n log n)", "O((V + E) log V)", "O(φⁿ)"). */
function cxClass(str) {
  const t = String(str || '').replace(/\s+/g, '');
  if (!t || t === '—' || !/O\(/.test(t)) return null;
  if (/φ|2ⁿ|\^n|n!/.test(t)) return 'cexp';
  if (/n²|V²|\^2|m·n|n·W|S·k/.test(t)) return 'cn2';
  if (/nlogn|\)logV/.test(t)) return 'cnlog';
  if (/O\(log/.test(t)) return 'clog';
  if (/O\(1/.test(t)) return 'c1';
  return 'cn';
}
const cxIndex = (id) => CX.findIndex((c) => c.id === id);
const pad2 = (n) => String(n).padStart(2, '0');

function prose(md) {
  const el = h('div', { class: 'prose' });
  el.innerHTML = markdown(md || '');
  enhanceMarkdown(el);
  return el;
}

function brandMark() {
  return h('span', { class: 'pz-brand' }, h('span', { class: 'pz-brand__prism', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')), h('span', null, 'V-Prism'), h('span', { class: 'pz-brand__lab' }, 'Phòng thí nghiệm thuật toán'));
}

// ---------------------------------------------------------------- topic glyphs (generated line-art SVG)
const R = (x, y, w, hh, cls = 'g-l', rx = 2) => s('rect', { x, y, width: w, height: hh, rx, class: cls });
const L = (x1, y1, x2, y2, cls = 'g-l') => s('line', { x1, y1, x2, y2, class: cls });
const C = (cx, cy, r, cls = 'g-l') => s('circle', { cx, cy, r, class: cls });
const P = (d, cls = 'g-l') => s('path', { d, class: cls });
function treeGlyph(accentNodes = [], accentEdges = [], sizes = null) {
  const N = [[60, 12], [34, 31], [86, 31], [20, 51], [46, 51], [74, 51], [100, 51]];
  const E = [[0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6]];
  return [
    ...E.map(([a, b], i) => L(N[a][0], N[a][1], N[b][0], N[b][1], accentEdges.includes(i) ? 'g-a' : 'g-l')),
    ...N.map(([x, y], i) => C(x, y, sizes ? sizes[i] : 6.5, accentNodes.includes(i) ? 'g-af' : 'g-n')),
  ];
}
const GLYPHS = {
  arrays: () => [
    ...[0, 1, 2, 3, 4, 5].map((i) => R(12 + i * 16, 22, 16, 20, i === 2 ? 'g-af' : 'g-n', 0)),
    ...[0, 1, 2, 3, 4, 5].map((i) => L(20 + i * 16, 47, 20 + i * 16, 51, 'g-t')),
    P('M52 8v8m-4-4 4 4 4-4', 'g-a'),
  ],
  'linked-list': () => [
    ...[8, 46, 84].map((x, i) => [R(x, 24, 26, 16, i === 1 ? 'g-af' : 'g-n', 3), L(x + 18, 24, x + 18, 40, i === 1 ? 'g-in' : 'g-l')]).flat(),
    P('M30 32h14m-4-3 4 3-4 3'), P('M68 32h14m-4-3 4 3-4 3'),
    P('M106 32h6m0-6v12', 'g-l'),
  ],
  'stack-queue': () => [
    P('M16 12v44h36V12', 'g-l'),
    ...[0, 1, 2, 3].map((i) => R(20, 46 - i * 10, 28, 7, i === 3 ? 'g-af' : 'g-n', 1.5)),
    ...[0, 1, 2, 3].map((i) => R(66 + i * 12, 27, 9, 10, i === 0 ? 'g-af' : 'g-n', 1.5)),
    L(62, 22, 116, 22, 'g-l'), L(62, 42, 116, 42, 'g-l'),
    P('M60 50h-6m3-3-3 3 3 3', 'g-a'), P('M118 50h-6m3-3 3 3-3 3', 'g-a'),
  ],
  'hash-table': () => [
    ...[0, 1, 2, 3].map((i) => R(12, 8 + i * 13, 11, 10, 'g-n', 1.5)),
    P('M23 13h10'), C(39, 13, 5, 'g-n'), P('M44 13h8'), C(58, 13, 5, 'g-af'),
    P('M23 39h10'), C(39, 39, 5, 'g-n'),
    P('M23 52h10'), C(39, 52, 5, 'g-n'), P('M44 52h8'), C(58, 52, 5, 'g-n'), P('M63 52h8'), C(77, 52, 5, 'g-n'),
    P('M86 26c10 0 14-6 22-6m-3-3 3 3-3 3', 'g-a'), s('text', { x: 92, y: 40, class: 'g-tx' }, 'h(k)'),
  ],
  sorting: () => [8, 14, 20, 27, 33, 40, 46].map((hh, i) => R(14 + i * 14, 56 - hh, 9, hh, i === 3 || i === 4 ? 'g-af' : 'g-n', 1.5)).concat([L(8, 57, 112, 57, 'g-t')]),
  searching: () => [
    ...[10, 14, 18, 22, 26, 30, 34, 38, 42].map((hh, i) => R(12 + i * 11, 54 - hh, 7, hh, i === 4 ? 'g-af' : 'g-n', 1)),
    P('M12 60v-3h95v3', 'g-a'), P('M59 6v8m-3-3 3 3 3-3', 'g-a'),
  ],
  'binary-tree': () => treeGlyph([0], []),
  bst: () => treeGlyph([0, 2, 5], [1, 4]),
  heap: () => treeGlyph([0], [], [9, 7.5, 7.5, 5.5, 5.5, 5.5, 5.5]),
  graph: () => {
    const N = [[16, 42], [42, 14], [54, 48], [86, 20], [106, 48]];
    const E = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4], [3, 4]];
    const path = [1, 4, 6];
    return [...E.map(([a, b], i) => L(N[a][0], N[a][1], N[b][0], N[b][1], path.includes(i) ? 'g-a' : 'g-l')), ...N.map(([x, y], i) => C(x, y, 6, i === 0 || i === 4 ? 'g-af' : 'g-n'))];
  },
  bfs: () => [
    C(60, 32, 13, 'g-d'), C(60, 32, 25, 'g-d'),
    ...[[60, 7], [82, 20], [82, 44], [38, 44], [38, 20], [60, 57]].map(([x, y], i) => [L(60, 32, x, y, 'g-l'), C(x, y, 4.5, i < 3 ? 'g-af' : 'g-n')]).flat(),
    C(60, 32, 6.5, 'g-af'),
  ],
  dfs: () => [
    L(20, 12, 44, 26, 'g-a'), L(44, 26, 64, 40, 'g-a'), L(64, 40, 86, 54, 'g-a'), L(20, 12, 70, 12), L(44, 26, 30, 50), L(64, 40, 100, 30),
    C(20, 12, 5.5, 'g-af'), C(44, 26, 5.5, 'g-af'), C(64, 40, 5.5, 'g-af'), C(86, 54, 5.5, 'g-af'), C(70, 12, 5, 'g-n'), C(30, 50, 5, 'g-n'), C(100, 30, 5, 'g-n'),
    P('M96 54c10 0 14-8 14-16', 'g-d'),
  ],
  recursion: () => [R(14, 6, 92, 52, 'g-n', 5), R(26, 14, 68, 36, 'g-n', 4), R(38, 22, 44, 20, 'g-n', 3), R(50, 28, 20, 8, 'g-af', 2), s('text', { x: 18, y: 15, class: 'g-tx' }, 'f(n)')],
  dp: () => {
    const out = [];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 7; c++) out.push(R(10 + c * 14, 6 + r * 13, 14, 13, (c <= r + 3 && c >= r) ? (c === r + 3 ? 'g-af' : 'g-s') : 'g-n', 0));
    out.push(P('M60 58h44m-4-3 4 3-4 3', 'g-a'));
    return out;
  },
};
function topicGlyph(id, cls = '') {
  return s('svg', { class: `pz-glyph ${cls}`, viewBox: '0 0 120 64', 'aria-hidden': 'true', focusable: 'false' }, (GLYPHS[id] || GLYPHS.arrays)());
}

function cornerTicks() { return h('span', { class: 'pz-ticks', 'aria-hidden': 'true' }); }

// ---------------------------------------------------------------- catalog
async function renderCatalog(container, ctx) {
  let q = ctx.query.q || '';
  let cat = ctx.query.cat || 'all';
  const search = h('input', { class: 'input', type: 'search', placeholder: 'Tìm: sắp xếp, BFS, heap, quy hoạch động…', value: q, 'aria-label': 'Tìm chủ đề thuật toán' });
  const chips = h('div', { class: 'pz-filters', role: 'group', 'aria-label': 'Lọc theo nhóm' });
  const results = h('div', { class: 'pz-catalog', 'aria-live': 'polite' });
  const countEl = h('span', { class: 'pz-count mono' });
  const demo = h('div', { class: 'pz-scope__demo', 'aria-hidden': 'true' });
  const totalAlgos = PRISM_TOPICS.reduce((sum, t) => sum + t.algorithms.length, 0);
  let complexity = null; // topicId -> { algoId: avg }

  function renderChips() {
    mount(chips, [{ id: 'all', title: 'Tất cả' }, ...PRISM_CATEGORIES].map((c) => h('button', {
      class: 'pz-filter', type: 'button', dataset: { cat: c.id }, 'aria-pressed': String(cat === c.id),
      onClick: () => { cat = c.id; renderChips(); renderResults(); },
    }, c.id === 'all' ? null : h('i', { class: 'pz-filter__dot' }), c.title,
    h('span', { class: 'pz-filter__n mono' }, String(c.id === 'all' ? PRISM_TOPICS.length : PRISM_TOPICS.filter((t) => t.category === c.id).length)))));
  }
  function matches(t) {
    const ql = q.trim().toLowerCase();
    if (!ql) return true;
    return [t.title, t.summary, t.id, ...t.algorithms.map((a) => a.title)].join(' ').toLowerCase().includes(ql);
  }
  function algoChip(t, a) {
    const avg = complexity?.[t.id]?.[a.id];
    const k = cxClass(avg);
    return h('span', { class: `pz-algo-chip ${k ? `is-${k}` : ''}`, title: avg ? `Độ phức tạp trung bình: ${avg}` : undefined }, h('i', { class: 'pz-cx-dot' }), a.title);
  }
  function card(t, idx) {
    const algos = t.algorithms;
    return h('a', { class: 'pz-topic-card', href: `#/prism/${t.id}`, dataset: { cat: t.category }, style: { '--i': String(idx) } },
      cornerTicks(),
      h('div', { class: 'pz-topic-card__plate' },
        h('span', { class: 'pz-topic-card__no mono' }, pad2(PRISM_TOPICS.indexOf(t) + 1)),
        h('span', { class: 'pz-topic-card__code mono' }, CAT_CODE[t.category]),
        topicGlyph(t.id)),
      h('div', { class: 'pz-topic-card__body' },
        h('h3', null, t.title),
        h('p', null, t.summary),
        h('div', { class: 'pz-topic-card__algos' }, algos.slice(0, 4).map((a) => algoChip(t, a)), algos.length > 4 ? h('span', { class: 'pz-algo-chip pz-algo-chip--more' }, `+${algos.length - 4}`) : null)),
      h('div', { class: 'pz-topic-card__foot' }, h('span', { class: 'mono' }, `${pad2(algos.length)} minh họa`), h('span', { class: 'pz-topic-card__go' }, 'Mở', icon('arrow-right'))));
  }
  function renderResults() {
    const groups = PRISM_CATEGORIES.filter((c) => cat === 'all' || c.id === cat).map((c) => ({ ...c, topics: PRISM_TOPICS.filter((t) => t.category === c.id && matches(t)) })).filter((g) => g.topics.length);
    const n = groups.reduce((sum, g) => sum + g.topics.length, 0);
    countEl.textContent = `${pad2(n)} / ${pad2(PRISM_TOPICS.length)} chủ đề`;
    if (!groups.length) {
      mount(results, h('div', { class: 'pz-empty' }, topicGlyph('searching'), h('h3', null, 'Không tìm thấy chủ đề phù hợp'), h('p', null, 'Thử từ khóa khác, ví dụ "cây", "đồ thị", "sắp xếp".'),
        h('button', { class: 'btn btn--sm', type: 'button', onClick: () => { q = ''; search.value = ''; cat = 'all'; renderChips(); renderResults(); search.focus(); } }, icon('refresh'), 'Xóa bộ lọc')));
      return;
    }
    let i = 0;
    mount(results, groups.map((g) => h('section', { class: 'pz-group', dataset: { cat: g.id } },
      h('header', { class: 'pz-group__head' },
        h('span', { class: 'pz-group__code mono' }, CAT_CODE[g.id]),
        h('h2', null, g.title),
        h('span', { class: 'pz-group__desc' }, g.description),
        h('span', { class: 'pz-group__rule', 'aria-hidden': 'true' }),
        h('span', { class: 'pz-group__n mono' }, `${pad2(g.topics.length)} chủ đề`)),
      h('div', { class: 'pz-topic-grid' }, g.topics.map((t) => card(t, i++))))));
  }
  search.addEventListener('input', debounce(() => { q = search.value; renderResults(); }, 120), { signal: ctx.signal });

  const legend = h('div', { class: 'pz-legend', 'aria-label': 'Chú giải độ phức tạp trung bình' },
    h('span', { class: 'pz-legend__title' }, 'Độ phức tạp TB'),
    h('div', { class: 'pz-legend__scale' }, CX.map((c) => h('span', { class: `pz-legend__item is-${c.id}`, title: c.name }, h('i', { class: 'pz-cx-dot' }), h('span', { class: 'mono' }, c.label)))));

  mount(container, h('div', { class: 'prism prism--catalog' },
    h('header', { class: 'pz-hero' },
      h('div', { class: 'container container--wide pz-hero__inner' },
        h('div', { class: 'pz-hero__text' },
          brandMark(),
          h('h1', null, 'Lăng kính ', h('span', { class: 'pz-hero__accent' }, 'thuật toán')),
          h('p', { class: 'pz-hero__lead' }, 'Như lăng kính tách ánh sáng thành quang phổ, V-Prism tách mỗi thuật toán thành từng bước nhỏ có thể nhìn thấy: dữ liệu thay đổi ra sao, dòng mã giả nào đang chạy, vì sao lại như vậy.'),
          h('dl', { class: 'pz-readouts' },
            h('div', { class: 'pz-readout' }, h('dt', null, 'Chủ đề'), h('dd', { class: 'mono' }, pad2(PRISM_TOPICS.length))),
            h('div', { class: 'pz-readout' }, h('dt', null, 'Minh họa'), h('dd', { class: 'mono' }, pad2(totalAlgos))),
            h('div', { class: 'pz-readout' }, h('dt', null, 'Ngôn ngữ mã'), h('dd', { class: 'mono' }, '03'))),
          h('div', { class: 'pz-hero__cta' },
            h('a', { class: 'btn btn--primary', href: '#/prism/sorting/bubble' }, icon('play'), 'Bắt đầu với Sắp xếp'),
            h('a', { class: 'btn', href: '#/prism/graph/dijkstra' }, icon('graph'), 'Thử Dijkstra'))),
        h('figure', { class: 'pz-scope' },
          cornerTicks(),
          h('figcaption', { class: 'pz-scope__head' },
            h('span', { class: 'pz-scope__leds', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
            h('span', { class: 'mono' }, 'Mẫu minh họa · sắp xếp'),
            h('span', { class: 'pz-scope__ch mono' }, 'n = 16')),
          h('div', { class: 'pz-scope__screen' }, h('span', { class: 'pz-ruler pz-ruler--x', 'aria-hidden': 'true' }), h('span', { class: 'pz-ruler pz-ruler--y', 'aria-hidden': 'true' }), demo)))),
    h('div', { class: 'container container--wide page pz-catalog-page' },
      h('div', { class: 'pz-catalog-tools' },
        h('div', { class: 'pz-catalog-tools__row' },
          h('div', { class: 'input-group pz-search' }, icon('search'), search),
          countEl),
        chips,
        legend),
      results)));
  renderChips();
  renderResults();
  const { mountMiniSort } = await import('./mini.js');
  if (!ctx.signal.aborted) mountMiniSort(demo, { signal: ctx.signal, size: 16 });

  // Annotate algorithm chips with their real average complexity (topic modules are lazy-loaded).
  Promise.all(PRISM_TOPICS.map((t) => loadTopic(t.id).then((full) => [t.id, Object.fromEntries((full?.algorithms || []).map((a) => [a.id, a.complexity?.avg]))]).catch(() => [t.id, {}])))
    .then((entries) => { if (ctx.signal.aborted) return; complexity = Object.fromEntries(entries); renderResults(); })
    .catch(() => {});
}

// ---------------------------------------------------------------- topic view
async function renderTopic(container, ctx) {
  const meta = PRISM_TOPICS.find((t) => t.id === ctx.params.topic);
  if (!meta) {
    mount(container, h('div', { class: 'prism' }, h('div', { class: 'container page' }, h('div', { class: 'pz-empty' }, topicGlyph('searching'), h('h3', null, 'Không tìm thấy chủ đề'), h('a', { class: 'btn btn--primary', href: '#/prism' }, 'Về Lăng kính thuật toán')))));
    return;
  }
  const topic = await loadTopic(meta.id);
  let algo = topic.algorithms.find((a) => a.id === ctx.params.algo) || topic.algorithms[0];
  let codeLang = (await kv.get('prism:code-lang', 'python')) || 'python';
  document.title = `${algo.title} · ${meta.title} · V-Prism`;
  const category = PRISM_CATEGORIES.find((c) => c.id === meta.category);

  // elements
  const stage = h('div', { class: 'pz-stage__canvas', role: 'img', 'aria-label': `Minh họa ${algo.title}` });
  const narration = h('p', { class: 'pz-narration', 'aria-live': 'polite' });
  const varsEl = h('div', { class: 'pz-vars' });
  const counter = h('span', { class: 'pz-counter mono' });
  const timeline = h('input', { class: 'pz-timeline', type: 'range', min: 0, max: 0, value: 0, 'aria-label': 'Dòng thời gian các bước' });
  const timelineWrap = h('div', { class: 'pz-timeline-wrap' }, timeline);
  const btn = (ic, label, onClick, extra = {}) => h('button', { class: 'btn btn--icon pz-ctrl', type: 'button', 'aria-label': label, title: label, onClick, ...extra }, icon(ic));
  const playBtn = h('button', { class: 'btn btn--primary pz-play', type: 'button', onClick: () => player.toggle() }, icon('play'), h('span', null, 'Chạy'));
  const speedSel = h('select', { class: 'select select--sm pz-speed', 'aria-label': 'Tốc độ' }, SPEEDS.map((sp) => h('option', { value: sp, selected: sp === 1 }, `${String(sp).replace('.', ',')}×`)));
  const pseudoEl = h('ol', { class: 'pz-pseudo mono' });
  const pseudoHl = h('span', { class: 'pz-pseudo__hl', 'aria-hidden': 'true' });
  const pseudoWrap = h('div', { class: 'pz-pseudo-wrap' }, pseudoHl, pseudoEl);
  const lineReadout = h('span', { class: 'pz-panel__readout mono' });
  const stageTitle = h('strong', { class: 'pz-stage__title' }, algo.title);
  const inputForm = h('form', { class: 'pz-inputs', novalidate: true });
  const algoTabs = h('div', { class: 'pz-algo-tabs', role: 'tablist', 'aria-label': 'Chọn thuật toán' });
  const detailTabs = h('div', { class: 'tabs pz-tabs', role: 'tablist' });
  const detailBody = h('div', { class: 'pz-detail-body' });
  const cxStrip = h('div', { class: 'pz-cx-strip' });
  let detailTab = 'explain';
  let currentLine = -1;

  // keyboard help popover
  const helpPop = h('div', { class: 'pz-help__pop', id: 'pz-help-pop', role: 'dialog', 'aria-label': 'Phím tắt', hidden: true },
    h('div', { class: 'pz-help__title' }, icon('info'), 'Phím tắt'),
    h('dl', { class: 'pz-help__list' },
      [['Space', 'K'], 'Chạy / tạm dừng',
        ['←', 'J'], 'Lùi một bước',
        ['→', 'L'], 'Tiến một bước',
        ['Home', 'R'], 'Về bước đầu',
        ['End'], 'Tới bước cuối',
        ['?'], 'Mở / đóng bảng này'].reduce((acc, item, i, arr) => (i % 2 ? acc : acc.concat(h('div', { class: 'pz-help__row' },
        h('dt', null, item.map((k) => h('kbd', { class: 'kbd' }, k))), h('dd', null, arr[i + 1])))), [])));
  const helpBtn = h('button', { class: 'btn btn--icon btn--sm pz-help__btn', type: 'button', 'aria-label': 'Phím tắt', title: 'Phím tắt (?)', 'aria-expanded': 'false', 'aria-controls': 'pz-help-pop', onClick: (e) => { e.stopPropagation(); setHelp(helpPop.hidden); } }, h('span', { class: 'mono', 'aria-hidden': 'true' }, '?'));
  const help = h('div', { class: 'pz-help' }, helpBtn, helpPop);
  function setHelp(open) { helpPop.hidden = !open; helpBtn.setAttribute('aria-expanded', String(open)); }
  document.addEventListener('click', (e) => { if (!help.contains(e.target)) setHelp(false); }, { signal: ctx.signal });

  function moveHighlight() {
    const li = pseudoEl.children[currentLine];
    if (!li || !li.offsetHeight) { pseudoHl.style.opacity = '0'; return; }
    pseudoHl.style.opacity = '1';
    pseudoHl.style.transform = `translateY(${li.offsetTop}px)`;
    pseudoHl.style.height = `${li.offsetHeight}px`;
  }
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => moveHighlight());
    ro.observe(pseudoWrap);
    ctx.signal.addEventListener('abort', () => ro.disconnect());
  }

  let lastTotal = -1;
  const player = new Player({
    onFrame: (frame, idx, total) => {
      const render = RENDERERS[algo.renderer];
      render(stage, frame.state);
      narration.textContent = frame.msg || '';
      counter.textContent = `${idx + 1} / ${total}`;
      timeline.max = String(Math.max(0, total - 1));
      timeline.value = String(idx);
      const span = Math.max(1, total - 1);
      timeline.style.setProperty('--pct', `${(idx / span) * 100}%`);
      timeline.setAttribute('aria-valuetext', `Bước ${idx + 1} trên ${total}`);
      if (total !== lastTotal) {
        lastTotal = total;
        let k = 1;
        while (span / k > 48) k += 1;
        timelineWrap.style.setProperty('--tick', `${(k / span) * 100}%`);
      }
      currentLine = typeof frame.line === 'number' ? frame.line : -1;
      Array.from(pseudoEl.children).forEach((li, i) => li.classList.toggle('is-active', i === currentLine));
      lineReadout.textContent = currentLine >= 0 && pseudoEl.children[currentLine] ? `dòng ${pad2(currentLine + 1)}` : '';
      moveHighlight();
      const vars = Object.entries(frame.vars || {});
      mount(varsEl, vars.length
        ? vars.map(([k, v]) => h('span', { class: 'pz-var' }, h('span', { class: 'pz-var__k mono' }, k), h('span', { class: 'pz-var__v mono' }, typeof v === 'number' && !Number.isInteger(v) ? v.toFixed(2).replace('.', ',') : String(v))))
        : h('span', { class: 'pz-vars__empty' }, 'Không có biến theo dõi ở bước này.'));
    },
    onState: (p) => {
      mount(playBtn, icon(p.playing ? 'pause' : 'play'), h('span', null, p.playing ? 'Tạm dừng' : (p.index >= p.frames.length - 1 && p.frames.length > 1 ? 'Chạy lại' : 'Chạy')));
      playBtn.setAttribute('aria-pressed', String(p.playing));
      stageEl.classList.toggle('is-playing', p.playing);
    },
  });

  function validateField(def) {
    const field = inputForm.querySelector(`[name="${def.name}"]`);
    const errEl = inputForm.querySelector(`[data-err="${def.name}"]`);
    if (!field || !errEl) return { error: 'missing' };
    const res = def.parse(field.value);
    const wrap = field.closest('.pz-field');
    if (res.error) { errEl.textContent = res.error; field.setAttribute('aria-invalid', 'true'); wrap?.classList.remove('is-valid'); }
    else { errEl.textContent = ''; field.removeAttribute('aria-invalid'); wrap?.classList.add('is-valid'); }
    return res;
  }

  function parseInputs() {
    const values = {};
    let ok = true;
    for (const def of algo.inputs) {
      const res = validateField(def);
      if (res.error) ok = false; else values[def.name] = res.value;
    }
    return ok ? values : null;
  }

  function runAlgo({ autoplay = false } = {}) {
    const values = parseInputs();
    if (!values) { toast('Dữ liệu vào chưa hợp lệ — xem thông báo dưới từng ô.', { type: 'warning' }); return; }
    let frames;
    try { frames = algo.run(values); } catch (err) { console.error(err); toast(`Không chạy được minh họa: ${err.message}`, { type: 'error' }); return; }
    player.load(frames);
    if (autoplay) player.play();
  }

  function renderInputs() {
    mount(inputForm,
      algo.inputs.map((def) => {
        const control = def.type === 'number'
          ? h('input', { class: 'input input--sm mono', name: def.name, value: def.default, inputmode: 'numeric', id: `pz-in-${def.name}`, 'aria-describedby': `pz-err-${def.name}` })
          : h('input', { class: 'input input--sm mono', name: def.name, value: def.default, id: `pz-in-${def.name}`, spellcheck: 'false', autocomplete: 'off', 'aria-describedby': `pz-err-${def.name}` });
        control.addEventListener('input', debounce(() => validateField(def), 250));
        return h('div', { class: 'field pz-field' },
          h('label', { class: 'field__label', for: `pz-in-${def.name}` }, def.label),
          h('div', { class: 'pz-field__control' }, control, h('span', { class: 'pz-field__ok', 'aria-hidden': 'true' }, icon('check'))),
          def.hint ? h('span', { class: 'field__hint' }, def.hint) : null,
          h('span', { class: 'field__error', 'data-err': def.name, id: `pz-err-${def.name}`, role: 'alert' }));
      }),
      h('div', { class: 'pz-inputs__actions' },
        h('button', { class: 'btn btn--primary btn--sm', type: 'submit' }, icon('play'), 'Áp dụng & chạy'),
        h('button', { class: 'btn btn--sm', type: 'button', onClick: () => {
          algo.inputs.forEach((def) => { if (def.random) inputForm.querySelector(`[name="${def.name}"]`).value = def.random(); });
          runAlgo({ autoplay: true });
        } }, icon('shuffle'), 'Ngẫu nhiên'),
        h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => { algo.inputs.forEach((def) => { inputForm.querySelector(`[name="${def.name}"]`).value = def.default; }); runAlgo(); } }, icon('refresh'), 'Mặc định')));
  }
  inputForm.addEventListener('submit', (e) => { e.preventDefault(); runAlgo({ autoplay: true }); }, { signal: ctx.signal });

  function renderAlgoTabs() {
    mount(algoTabs, topic.algorithms.map((a, i) => h('button', { class: `pz-algo-tab ${a.id === algo.id ? 'is-active' : ''}`, type: 'button', role: 'tab', 'aria-selected': String(a.id === algo.id), onClick: () => selectAlgo(a.id) },
      h('span', { class: 'pz-algo-tab__no mono' }, pad2(i + 1)), a.title)));
  }

  function gauge(k) {
    const idx = cxIndex(k);
    return h('span', { class: `pz-gauge ${k ? `is-${k}` : ''}`, 'aria-hidden': 'true' }, CX.map((c, i) => h('i', { class: i <= idx ? 'is-on' : '' })));
  }
  function renderCxStrip() {
    const c = algo.complexity || {};
    mount(cxStrip, [['Trung bình', c.avg], ['Xấu nhất', c.worst], ['Bộ nhớ', c.space]].map(([label, v]) => {
      const k = cxClass(v);
      return h('div', { class: `pz-cx-mini ${k ? `is-${k}` : ''}` }, h('span', { class: 'pz-cx-mini__k' }, label), h('span', { class: 'pz-cx-mini__v mono', title: v || '' }, v || '—'));
    }));
  }

  function renderDetail() {
    const tabs = [['explain', 'Giải thích', 'book-open'], ['code', 'Mã nguồn', 'code'], ['complexity', 'Độ phức tạp', 'gauge']];
    mount(detailTabs, tabs.map(([id, label, ic]) => h('button', { class: 'tab', type: 'button', role: 'tab', 'aria-selected': String(detailTab === id), onClick: () => { detailTab = id; renderDetail(); } }, icon(ic), label)));
    if (detailTab === 'explain') {
      mount(detailBody, h('div', { class: 'pz-explain-grid' }, prose(algo.summary),
        h('div', { class: 'callout callout--ai pz-ask' }, icon('sparkles'), h('div', null, 'Còn thắc mắc? ', h('a', { href: `#/ai?mode=algorithm&q=${encodeURIComponent(`Giải thích giúp em thuật toán "${algo.title}" (${meta.title}) bằng ví dụ dễ hiểu và độ phức tạp của nó.`)}` }, 'Hỏi V-Mentor về thuật toán này')))));
    } else if (detailTab === 'code') {
      const code = algo.code?.[codeLang] || '';
      mount(detailBody, h('div', { class: 'stack stack--sm' },
        h('div', { class: 'segmented pz-langs', role: 'tablist', 'aria-label': 'Ngôn ngữ' }, CODE_LANGS.map(([id, label]) => h('button', { type: 'button', 'aria-pressed': String(codeLang === id), onClick: () => { codeLang = id; kv.set('prism:code-lang', id); renderDetail(); } }, label))),
        h('div', { class: 'code-block pz-code' },
          h('div', { class: 'code-block__head' }, h('span', null, CODE_LANGS.find((l) => l[0] === codeLang)[1], h('span', { class: 'pz-code__lines mono' }, ` · ${code.split('\n').length} dòng`)),
            h('span', { class: 'cluster cluster--sm' },
              h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: async () => toast((await copyText(code)) ? 'Đã sao chép mã.' : 'Không sao chép được.', { duration: 1500 }) }, icon('copy'), 'Sao chép'),
              h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: async () => { await kv.set('workspace:incoming', { code, lang: codeLang, at: Date.now() }); ctx.navigate(`/workspace?lang=${codeLang}&from=snippet`); } }, icon('terminal'), 'Mở trong IDE'))),
          h('pre', null, h('code', null, raw(highlight(code, codeLang))))),
        codeLang === 'cpp' ? h('p', { class: 'field__hint' }, 'Lưu ý: trình chạy C++ trên trình duyệt hỗ trợ một tập con của C++ (không có STL, struct). Đoạn mã này là C++ chuẩn để đọc hiểu; một số đoạn cần trình biên dịch đầy đủ.') : null));
    } else {
      const c = algo.complexity || {};
      mount(detailBody, h('div', { class: 'stack' },
        h('div', { class: 'pz-cx-cards' }, [['best', 'Tốt nhất', 'Thời gian'], ['avg', 'Trung bình', 'Thời gian'], ['worst', 'Xấu nhất', 'Thời gian'], ['space', 'Bộ nhớ', 'Không gian']].map(([key, label, kind]) => {
          const v = c[key];
          const k = cxClass(v);
          return h('div', { class: `pz-cx-card ${k ? `is-${k}` : ''}` }, cornerTicks(),
            h('div', { class: 'pz-cx-card__head' }, h('span', { class: 'pz-cx-card__label' }, label), h('span', { class: 'pz-cx-card__kind mono' }, kind)),
            h('div', { class: 'pz-cx-card__value mono' }, v || '—'),
            gauge(k),
            h('div', { class: 'pz-cx-card__class' }, k ? `Nhóm ${CX[cxIndex(k)].label} · ${CX[cxIndex(k)].name}` : 'Không xếp nhóm'));
        })),
        c.note ? h('div', { class: 'callout callout--info' }, icon('info'), h('div', null, c.note)) : null,
        h('div', { class: 'pz-legend pz-legend--inline' }, h('span', { class: 'pz-legend__title' }, 'Thang tăng trưởng'),
          h('div', { class: 'pz-legend__scale' }, CX.map((cx) => h('span', { class: `pz-legend__item is-${cx.id}` }, h('i', { class: 'pz-cx-dot' }), h('span', { class: 'mono' }, cx.label)))))));
    }
  }

  function renderPseudo() {
    mount(pseudoEl, (algo.pseudo || []).map((line) => h('li', null, line)));
    currentLine = -1;
    pseudoHl.style.opacity = '0';
  }

  function selectAlgo(id) {
    const next = topic.algorithms.find((a) => a.id === id);
    if (!next || next === algo) return;
    algo = next;
    history.replaceState(null, '', `#/prism/${meta.id}/${algo.id}`);
    document.title = `${algo.title} · ${meta.title} · V-Prism`;
    stage.setAttribute('aria-label', `Minh họa ${algo.title}`);
    stageTitle.textContent = algo.title;
    renderAlgoTabs();
    renderInputs();
    renderPseudo();
    renderDetail();
    renderCxStrip();
    runAlgo();
  }

  timeline.addEventListener('input', () => player.seek(Number(timeline.value)), { signal: ctx.signal });
  speedSel.addEventListener('change', () => player.setSpeed(Number(speedSel.value)), { signal: ctx.signal });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !helpPop.hidden) { setHelp(false); helpBtn.focus(); return; }
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === ' ' || e.key === 'k') { e.preventDefault(); player.toggle(); }
    else if (e.key === 'ArrowRight' || e.key === 'l') { e.preventDefault(); player.step(1); }
    else if (e.key === 'ArrowLeft' || e.key === 'j') { e.preventDefault(); player.step(-1); }
    else if (e.key === 'r' || e.key === 'R') { player.restart(); }
    else if (e.key === 'End') { e.preventDefault(); player.pause(); player.seek(player.frames.length - 1); }
    else if (e.key === 'Home') { e.preventDefault(); player.restart(); }
    else if (e.key === '?') { e.preventDefault(); setHelp(helpPop.hidden); }
  }, { signal: ctx.signal });
  ctx.signal.addEventListener('abort', () => player.destroy());

  const others = PRISM_TOPICS.filter((t) => t.category === meta.category && t.id !== meta.id);

  const stageEl = h('section', { class: 'pz-stage', 'aria-label': 'Khu vực minh họa' },
    cornerTicks(),
    h('div', { class: 'pz-stage__bar' },
      h('span', { class: 'pz-stage__led', 'aria-hidden': 'true' }),
      stageTitle,
      h('span', { class: 'grow' }),
      h('span', { class: 'pz-stage__readout' }, h('span', { class: 'pz-stage__k' }, 'Bước'), counter),
      help),
    h('div', { class: 'pz-screen' },
      h('span', { class: 'pz-ruler pz-ruler--x', 'aria-hidden': 'true' }),
      h('span', { class: 'pz-ruler pz-ruler--y', 'aria-hidden': 'true' }),
      stage),
    h('div', { class: 'pz-dock' },
      h('div', { class: 'pz-controls' },
        h('div', { class: 'pz-controls__btns' },
          btn('restart', 'Về đầu (R)', () => player.restart()),
          btn('step-back', 'Lùi một bước (←)', () => player.step(-1)),
          playBtn,
          btn('step-forward', 'Tiến một bước (→)', () => player.step(1))),
        timelineWrap,
        h('label', { class: 'pz-speedbox', title: 'Tốc độ phát' }, icon('speed'), h('span', { class: 'pz-speedbox__k' }, 'Tốc độ'), speedSel))),
    h('div', { class: 'pz-readings' },
      h('div', { class: 'pz-reading pz-reading--explain' }, h('div', { class: 'pz-reading__title' }, icon('message'), 'Giải thích bước'), narration),
      h('div', { class: 'pz-reading pz-reading--vars' }, h('div', { class: 'pz-reading__title' }, icon('database'), 'Biến'), varsEl)));

  mount(container, h('div', { class: 'prism prism--topic', dataset: { cat: meta.category } },
    h('div', { class: 'container container--wide page pz-topic-page' },
      h('nav', { class: 'pz-crumbs', 'aria-label': 'Đường dẫn' }, h('a', { href: '#/prism' }, 'Lăng kính thuật toán'), icon('chevron-right'), h('a', { href: `#/prism?cat=${meta.category}` }, category?.title), icon('chevron-right'), h('span', { 'aria-current': 'page' }, meta.title)),
      h('header', { class: 'pz-topic-head' },
        h('div', { class: 'pz-topic-head__glyph' }, cornerTicks(), topicGlyph(meta.id)),
        h('div', { class: 'pz-topic-head__text' },
          h('div', { class: 'pz-topic-head__tags' }, h('span', { class: 'pz-cat-tag mono' }, h('i'), `${CAT_CODE[meta.category]} · ${category?.title}`), h('span', { class: 'pz-cat-tag pz-cat-tag--plain mono' }, `${pad2(topic.algorithms.length)} thuật toán`)),
          h('h1', null, meta.title),
          h('div', { class: 'pz-topic-intro' }, prose(topic.intro)))),
      algoTabs,
      h('div', { class: 'pz-layout' },
        stageEl,
        h('aside', { class: 'pz-aside' },
          h('section', { class: 'pz-panel' }, cornerTicks(), h('h2', { class: 'pz-panel__title' }, icon('edit'), 'Dữ liệu vào'), inputForm),
          h('section', { class: 'pz-panel' }, cornerTicks(), h('h2', { class: 'pz-panel__title' }, icon('list'), 'Mã giả', lineReadout), pseudoWrap),
          h('section', { class: 'pz-panel pz-panel--cx' }, cornerTicks(), h('h2', { class: 'pz-panel__title' }, icon('gauge'), 'Độ phức tạp'), cxStrip))),
      h('section', { class: 'pz-details' }, cornerTicks(), detailTabs, detailBody),
      others.length ? h('section', { class: 'pz-related' }, h('h2', null, 'Cùng nhóm'), h('div', { class: 'pz-related__grid' }, others.map((t) => h('a', { class: 'pz-related__item', href: `#/prism/${t.id}`, dataset: { cat: t.category } }, topicGlyph(t.id), h('span', null, h('strong', null, t.title), h('span', null, t.summary)), icon('arrow-right'))))) : null)));

  renderAlgoTabs();
  renderInputs();
  renderPseudo();
  renderDetail();
  renderCxStrip();
  runAlgo();
}

export default {
  title: (ctx) => (ctx.params.topic ? 'Lăng kính thuật toán' : 'V-Prism · Lăng kính thuật toán'),
  async mount(container, ctx) {
    if (ctx.params.topic) await renderTopic(container, ctx);
    else await renderCatalog(container, ctx);
  },
};
