// V-Code Edu — Scratch Live: the editor's Python (or Python Tiếng Việt) drawn as live Scratch-style blocks.
import { h } from '../../core/dom.js';
import { icon } from '../icons.js';
import { parseProgram, toPython, exprText, ensurePyvn } from './pyparse.js';
import { blockEl, rowEl, mouthEl, footEl, lbl, litPill, stackEl, glyph, CATS } from './render.js';
import { layoutShapes } from './shapes.js';

const MAX_DEPTH = 5;
const clip = (str, n = 42) => (str.length > n ? `${str.slice(0, n - 1)}…` : str);

const BIN_LABEL = { '+': '+', '-': '−', '*': '×', '/': '÷', '//': 'chia lấy nguyên', '%': 'chia lấy dư', '**': 'mũ' };
const CMP_LABEL = { '==': '=', '!=': '≠', '<=': '≤', '>=': '≥', '<': '<', '>': '>', in: 'có trong', 'not in': 'không có trong', is: 'là', 'is not': 'không là' };
const BUILTIN_LABEL = {
  len: 'độ dài của', int: 'số nguyên', float: 'số thực', str: 'chuỗi', round: 'làm tròn', abs: 'giá trị tuyệt đối',
  max: 'lớn nhất của', min: 'nhỏ nhất của', sum: 'tổng của', sorted: 'sắp xếp', range: 'khoảng', bool: 'đúng/sai của',
  list: 'danh sách từ', chr: 'ký tự mã', ord: 'mã của ký tự', type: 'kiểu của',
};

/* --------------------------------------------------------------- expressions */

function rep(cat, ...parts) { return blockEl({ cat, shape: 'reporter' }, rowEl(...parts)); }
function boolB(cat, ...parts) { return blockEl({ cat, shape: 'boolean' }, rowEl(...parts)); }
function varPill(name) { return h('span', { class: 'sc-field', title: name }, clip(name, 24)); }

function isInputCall(e) {
  if (!e) return null;
  if (e.t === 'call' && e.f.t === 'name' && e.f.v === 'input') return { prompt: e.args[0] || null, cast: null };
  if (e.t === 'call' && e.f.t === 'name' && ['int', 'float', 'str'].includes(e.f.v) && e.args.length === 1) {
    const inner = isInputCall(e.args[0]);
    if (inner) return { prompt: inner.prompt, cast: e.f.v };
  }
  return null;
}

export function exprEl(n, depth = 0) {
  if (!n) return litPill('');
  if (depth > MAX_DEPTH) return litPill(clip(exprText(n), 30), { mono: true, title: exprText(n) });
  const d = depth + 1;
  switch (n.t) {
    case 'num': return litPill(n.raw ?? String(n.v));
    case 'str': return litPill(`"${clip(n.v, 40)}"`, { title: n.v.length > 40 ? n.v : undefined });
    case 'const': return litPill(n.v ? 'True' : 'False');
    case 'none': return litPill('None');
    case 'name': return rep('variables', lbl(clip(n.v, 24)));
    case 'paren': return exprEl(n.e, depth);
    case 'fstr': return rep('operators', lbl('chuỗi'), ...n.parts.map((p) => (typeof p === 'string' ? litPill(`"${clip(p, 30)}"`) : exprEl(p, d))));
    case 'bin': return rep('operators', exprEl(n.l, d), lbl(BIN_LABEL[n.op] || n.op), exprEl(n.r, d));
    case 'unary': return rep('operators', lbl(n.op === '-' ? '−' : n.op), exprEl(n.e, d));
    case 'bool': return boolB('operators', exprEl(n.l, d), lbl(n.op === 'and' ? 'và' : 'hoặc'), exprEl(n.r, d));
    case 'not': return boolB('operators', lbl('không'), exprEl(n.e, d));
    case 'cmp': {
      const pairs = n.ops.map((op, i) => boolB('operators', exprEl(n.items[i], d), lbl(CMP_LABEL[op] || op), exprEl(n.items[i + 1], d)));
      if (pairs.length === 1) return pairs[0];
      return pairs.reduce((acc, p) => boolB('operators', acc, lbl('và'), p));
    }
    case 'ternary': return rep('operators', exprEl(n.a, d), lbl('nếu'), exprEl(n.cond, d), lbl('không thì'), exprEl(n.b, d));
    case 'index': return rep('variables', exprEl(n.e, d), lbl('['), exprEl(n.i, d), lbl(']'));
    case 'tuple': return h('span', { class: 'sc-tuple' }, n.items.flatMap((it, i) => (i ? [lbl(','), exprEl(it, d)] : [exprEl(it, d)])));
    case 'call': return callEl(n, d);
    default: return litPill(clip(exprText(n) || n.text || '', 40), { mono: true, title: exprText(n) || n.text });
  }
}

function argsEls(n, d) {
  const out = n.args.map((a) => exprEl(a, d));
  for (const k of n.kwargs) out.push(litPill(`${k.name}=${clip(exprText(k.value), 20)}`, { mono: true }));
  return out;
}

function callEl(n, d) {
  const f = n.f;
  const inp = isInputCall(n);
  if (inp) return rep('sensing', lbl(inp.cast === 'int' ? 'số nguyên từ bàn phím' : inp.cast === 'float' ? 'số thực từ bàn phím' : 'hỏi'), inp.prompt ? exprEl(inp.prompt, d) : null);
  if (f.t === 'attr' && f.e.t === 'name' && f.e.v === 'random') {
    if (f.name === 'randint' && n.args.length === 2) return rep('operators', lbl('ngẫu nhiên từ'), exprEl(n.args[0], d), lbl('đến'), exprEl(n.args[1], d));
    if (f.name === 'random') return rep('operators', lbl('ngẫu nhiên từ 0 đến 1'));
    if (f.name === 'choice' && n.args.length === 1) return rep('operators', lbl('chọn ngẫu nhiên trong'), exprEl(n.args[0], d));
  }
  if (f.t === 'name' && BUILTIN_LABEL[f.v]) return rep('operators', lbl(BUILTIN_LABEL[f.v]), ...argsEls(n, d));
  if (f.t === 'name') return rep('functions', lbl(clip(f.v, 24)), ...argsEls(n, d));
  if (f.t === 'attr') return rep('functions', exprEl(f.e, d), lbl(`.${f.name}`), ...argsEls(n, d));
  return litPill(clip(exprText(n), 40), { mono: true });
}

/* --------------------------------------------------------------- statements */

function stack(cat, line, parts, opts = {}) {
  const el = blockEl({ cat, shape: 'stack', cap: !!opts.cap, top: opts.top }, rowEl(...parts));
  el.dataset.line = line;
  return el;
}

function cblock(cat, line, arms, opts = {}) {
  // arms: [{ parts, body, line }]
  const kids = [];
  for (const arm of arms) {
    const r = rowEl(...arm.parts);
    if (arm.line) r.dataset.line = arm.line;
    kids.push(r, mouthEl(stackEl(...bodyEls(arm.body))));
  }
  kids.push(footEl(!!opts.arrow));
  const el = blockEl({ cat, shape: 'c', cap: !!opts.cap, top: opts.top }, kids);
  el.dataset.line = line;
  return el;
}

function hasBreak(body) {
  for (const st of body || []) {
    if (st.kind === 'break') return true;
    if (st.kind === 'if' || st.kind === 'try' || st.kind === 'with') {
      if (hasBreak(st.body)) return true;
      if (st.clauses?.some((c) => hasBreak(c.body))) return true;
    }
  }
  return false;
}

function rangeParts(st) {
  const it = st.iter;
  const v = st.target;
  if (!(it && it.t === 'call' && it.f.t === 'name' && it.f.v === 'range' && it.args.length >= 1 && it.args.length <= 3 && !it.kwargs.length)) return null;
  const [a0, a1, a2] = it.args;
  const start = it.args.length === 1 ? { t: 'num', v: 0, raw: '0' } : a0;
  const end = it.args.length === 1 ? a0 : a1;
  if (v === '_' && it.args.length === 1) return [lbl('lặp lại'), exprEl(end, 1), lbl('lần')];
  if (a2) return [lbl('lặp với'), varPill(v), lbl('từ'), exprEl(start, 1), lbl('đến trước'), exprEl(end, 1), lbl('bước'), exprEl(a2, 1)];
  const last = end.t === 'num' && Number.isInteger(end.v) ? { t: 'num', v: end.v - 1, raw: String(end.v - 1) } : { t: 'bin', op: '-', l: end, r: { t: 'num', v: 1, raw: '1' } };
  return [lbl('lặp với'), varPill(v), lbl('từ'), exprEl(start, 1), lbl('đến'), exprEl(last, 1)];
}

function bodyEls(body) {
  const out = [];
  for (const st of body || []) {
    try { out.push(stmtEl(st)); } catch { out.push(stack('other', st.line, [litPill(clip(st.text || '…'), { mono: true })])); }
  }
  return out;
}

const AUG = {
  '+=': (t, v) => [lbl('thay đổi'), t, lbl('thêm'), v],
  '-=': (t, v) => [lbl('giảm'), t, lbl('đi'), v],
  '*=': (t, v) => [lbl('nhân'), t, lbl('với'), v],
  '/=': (t, v) => [lbl('chia'), t, lbl('cho'), v],
  '//=': (t, v) => [lbl('chia lấy nguyên'), t, lbl('cho'), v],
  '%=': (t, v) => [lbl('lấy dư của'), t, lbl('khi chia cho'), v],
  '**=': (t, v) => [lbl('lũy thừa'), t, lbl('mũ'), v],
};

function stmtEl(st) {
  switch (st.kind) {
    case 'expr': {
      const e = st.expr;
      if (e.t === 'call' && e.f.t === 'name' && e.f.v === 'print') {
        const parts = [lbl('in ra màn hình')];
        e.args.forEach((a, i) => { if (i) parts.push(lbl(',')); parts.push(exprEl(a, 1)); });
        for (const k of e.kwargs) parts.push(litPill(`${k.name}=${clip(exprText(k.value), 16)}`, { mono: true }));
        return stack('looks', st.line, parts);
      }
      const inp = isInputCall(e);
      if (inp) return stack('sensing', st.line, [lbl('hỏi'), inp.prompt ? exprEl(inp.prompt, 1) : litPill(''), lbl('và đợi')]);
      if (e.t === 'call' && e.f.t === 'attr' && e.f.name === 'append' && e.args.length === 1) {
        return stack('variables', st.line, [lbl('thêm'), exprEl(e.args[0], 1), lbl('vào'), varPill(exprText(e.f.e))]);
      }
      if (e.t === 'call' && e.f.t === 'name') return stack('functions', st.line, [lbl('gọi'), h('span', { class: 'sc-field sc-field--fn' }, clip(e.f.v, 24)), ...argsEls(e, 1)]);
      if (e.t === 'call' && e.f.t === 'attr') return stack('functions', st.line, [lbl('gọi'), exprEl(e.f.e, 1), lbl(`.${e.f.name}`), ...argsEls(e, 1)]);
      return stack('other', st.line, [lbl('tính'), exprEl(e, 1)]);
    }
    case 'assign': {
      const inp = isInputCall(st.value);
      const target = varPill(st.targets.join(' = '));
      if (inp) {
        const parts = [lbl('hỏi'), inp.prompt ? exprEl(inp.prompt, 1) : litPill(''), lbl('rồi lưu vào'), target];
        if (inp.cast === 'int') parts.push(lbl('(số nguyên)'));
        if (inp.cast === 'float') parts.push(lbl('(số thực)'));
        return stack('sensing', st.line, parts);
      }
      return stack('variables', st.line, [lbl('đặt'), target, lbl('thành'), exprEl(st.value, 1)]);
    }
    case 'aug': {
      const fn = AUG[st.op] || ((t, v) => [lbl('cập nhật'), t, lbl(st.op), v]);
      return stack('variables', st.line, fn(varPill(st.target), exprEl(st.value, 1)));
    }
    case 'if': {
      const arms = [{ parts: [lbl('nếu'), exprEl(st.cond, 1), lbl('thì')], body: st.body }];
      for (const c of st.clauses) {
        if (c.kind === 'elif') arms.push({ parts: [lbl('ngược lại nếu'), exprEl(c.cond, 1), lbl('thì')], body: c.body, line: c.line });
        else arms.push({ parts: [lbl('ngược lại')], body: c.body, line: c.line });
      }
      return cblock('control', st.line, arms);
    }
    case 'for': {
      const parts = st.iter ? (rangeParts(st) || [lbl('lặp với mỗi'), varPill(st.target), lbl('trong'), exprEl(st.iter, 1)]) : [lbl('lặp'), litPill(clip(st.headText || ''), { mono: true })];
      const arms = [{ parts: [glyph('loop', 'sc-glyph--sm'), ...parts], body: st.body }];
      for (const c of st.clauses) arms.push({ parts: [lbl('khi lặp xong (else)')], body: c.body, line: c.line });
      return cblock('control', st.line, arms, { arrow: true });
    }
    case 'while': {
      if (st.cond && st.cond.t === 'const' && st.cond.v === true && !st.clauses.length) {
        const forever = !hasBreak(st.body);
        return cblock('control', st.line, [{ parts: [lbl(forever ? 'lặp lại mãi mãi' : 'lặp lại mãi (đến khi thoát)')], body: st.body }], { arrow: true, cap: forever });
      }
      const arms = [{ parts: [lbl('lặp lại trong khi'), exprEl(st.cond, 1)], body: st.body }];
      for (const c of st.clauses) arms.push({ parts: [lbl('khi lặp xong (else)')], body: c.body, line: c.line });
      return cblock('control', st.line, arms, { arrow: true });
    }
    case 'def':
      return cblock('functions', st.line, [{ parts: [lbl('định nghĩa hàm'), h('span', { class: 'sc-field sc-field--fn' }, st.name), ...st.params.map((p) => rep('functions', lbl(p)))], body: st.body }]);
    case 'return': return stack('functions', st.line, [lbl('trả về'), st.value ? exprEl(st.value, 1) : litPill('None')], { cap: true });
    case 'break': return stack('control', st.line, [lbl('thoát vòng lặp')], { cap: true });
    case 'continue': return stack('control', st.line, [lbl('bỏ qua lượt lặp này')], { cap: true });
    case 'pass': return stack('control', st.line, [lbl('không làm gì'), litPill('pass', { mono: true })]);
    case 'import': return stack('functions', st.line, [lbl('dùng thư viện'), litPill(clip(st.text.replace(/^(import|from)\s+/, ''), 36), { mono: true })]);
    case 'global': return stack('variables', st.line, [lbl('dùng biến toàn cục'), ...st.names.map((n) => varPill(n))]);
    case 'class': case 'try': case 'with': case 'match': case 'case': case 'async with': {
      const arms = [{ parts: [lbl(st.kind), litPill(clip(st.headText || '', 36), { mono: true })], body: st.body }];
      for (const c of st.clauses) arms.push({ parts: [lbl(c.kind), c.headText ? litPill(clip(c.headText, 30), { mono: true }) : null], body: c.body, line: c.line });
      return cblock('other', st.line, arms);
    }
    default: {
      const el = stack('other', st.line, [litPill(clip(st.text || '…', 48), { mono: true, title: st.text })]);
      if (st.orphan) el.classList.add('is-warn');
      return el;
    }
  }
}

/** Collect category ids used in a rendered tree (for the legend). */
function usedCats(root) {
  const set = new Set();
  root.querySelectorAll('.sc-b').forEach((b) => set.add(b.dataset.cat));
  return set;
}

/* --------------------------------------------------------------- view */

const LEGEND_ORDER = ['events', 'control', 'looks', 'sensing', 'variables', 'operators', 'functions', 'other'];
const LEGEND_LABEL = { events: 'Sự kiện', control: 'Điều khiển', looks: 'Hiển thị / in ra', sensing: 'Nhập liệu', variables: 'Biến', operators: 'Phép toán', functions: 'Hàm', other: 'Lệnh khác' };

export function createLive({ onJumpToLine, onToStudio }) {
  let zoom = 1;
  let last = { code: null, lang: null };
  const canvas = h('div', { class: 'sc-live__canvas' });
  const sizer = h('div', { class: 'sc-live__sizer' }, canvas);
  const scroll = h('div', { class: 'sc-live__scroll', tabindex: '0', 'aria-label': 'Các khối lệnh Scratch Live' }, sizer);
  const stats = h('span', { class: 'sc-live__stats' });
  const legendList = h('div', { class: 'sc-legend__list' });
  const legend = h('div', { class: 'sc-legend' },
    h('span', { class: 'sc-legend__title' }, 'Chú giải'), legendList);
  const zoomLabel = h('span', { class: 'sc-zoom__val' }, '100%');

  const setZoom = (z) => {
    zoom = Math.min(1.6, Math.max(0.6, Math.round(z * 10) / 10));
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
    applySize();
  };
  function applySize() {
    canvas.style.transform = zoom === 1 ? '' : `scale(${zoom})`;
    sizer.style.width = `${Math.ceil(canvas.offsetWidth * zoom)}px`;
    sizer.style.height = `${Math.ceil(canvas.offsetHeight * zoom)}px`;
  }

  const bar = h('div', { class: 'sc-live__bar' },
    h('span', { class: 'sc-live__badge' }, h('span', { class: 'sc-live__dot' }), 'Trực tiếp'),
    stats,
    h('span', { class: 'grow' }),
    h('div', { class: 'sc-zoom', role: 'group', 'aria-label': 'Thu phóng' },
      h('button', { class: 'sc-iconbtn', type: 'button', title: 'Thu nhỏ', 'aria-label': 'Thu nhỏ', onClick: () => setZoom(zoom - 0.1) }, icon('minus')),
      zoomLabel,
      h('button', { class: 'sc-iconbtn', type: 'button', title: 'Phóng to', 'aria-label': 'Phóng to', onClick: () => setZoom(zoom + 0.1) }, icon('plus'))),
    h('button', { class: 'sc-btn sc-btn--soft', type: 'button', title: 'Tạo khối trong Xưởng khối từ mã đang mở', onClick: () => onToStudio?.() }, icon('wand'), h('span', { class: 'sc-hide-narrow' }, 'Mở trong Xưởng khối')),
  );

  const el = h('div', { class: 'sc-live' }, bar, scroll, legend);

  scroll.addEventListener('click', (e) => {
    const t = e.target.closest('[data-line]');
    if (!t || !scroll.contains(t)) return;
    const line = Number(t.dataset.line);
    if (line) {
      scroll.querySelectorAll('.is-picked').forEach((x) => x.classList.remove('is-picked'));
      t.closest('.sc-b')?.classList.add('is-picked');
      onJumpToLine?.(line);
    }
  });
  scroll.addEventListener('keydown', (e) => {
    if (e.key === '+' || e.key === '=') { setZoom(zoom + 0.1); e.preventDefault(); }
    if (e.key === '-') { setZoom(zoom - 0.1); e.preventDefault(); }
  });

  function render(code, lang) {
    const isPy = lang === 'python' || lang === 'pyvn' || !lang;
    const scripts = [];
    let blockCount = 0;
    let fnCount = 0;
    if (!isPy) {
      scripts.push(h('div', { class: 'sc-live__empty' },
        h('strong', null, 'Scratch Live dành cho Python'),
        h('span', null, 'Hãy chọn ngôn ngữ Python hoặc Python Tiếng Việt trong trình soạn thảo để xem chương trình dưới dạng khối lệnh.')));
    } else {
      const tree = parseProgram(toPython(code, lang));
      const main = [];
      const defs = [];
      for (const st of tree) (st.kind === 'def' ? defs : main).push(st);
      const hat = blockEl({ cat: 'events', shape: 'stack', top: 'hat' }, rowEl(lbl('khi bấm'), glyph('play', 'sc-glyph--play'), lbl('Chạy chương trình')));
      hat.dataset.line = '1';
      const mainStack = stackEl(hat, ...bodyEls(main));
      scripts.push(h('div', { class: 'sc-script sc-script--live' }, mainStack));
      if (!main.length) {
        scripts.push(h('div', { class: 'sc-live__hint' }, defs.length ? 'Chương trình chỉ có định nghĩa hàm — hãy gọi hàm ở phần chính.' : 'Hãy gõ lệnh Python ở trình soạn thảo, các khối sẽ xuất hiện ngay tại đây.'));
      }
      for (const d of defs) {
        fnCount++;
        const head = blockEl({ cat: 'functions', shape: 'stack', top: 'def' },
          rowEl(lbl('định nghĩa'), h('span', { class: 'sc-field sc-field--fn' }, d.name), ...d.params.map((p) => rep('functions', lbl(p)))));
        head.dataset.line = d.line;
        scripts.push(h('div', { class: 'sc-script sc-script--live' }, stackEl(head, ...bodyEls(d.body))));
      }
    }
    const prevTop = scroll.scrollTop;
    const prevLeft = scroll.scrollLeft;
    canvas.replaceChildren(...scripts);
    layoutShapes(canvas);
    applySize();
    scroll.scrollTop = prevTop;
    scroll.scrollLeft = prevLeft;
    blockCount = canvas.querySelectorAll('.sc-b[data-line]').length - (isPy ? 1 : 0);
    stats.textContent = isPy ? `${blockCount} khối lệnh${fnCount ? ` · ${fnCount} hàm` : ''}` : '';
    const used = usedCats(canvas);
    legendList.replaceChildren(...LEGEND_ORDER.filter((c) => used.has(c) || ['events', 'control', 'looks', 'variables'].includes(c)).map((c) =>
      h('span', { class: 'sc-legend__item', dataset: { cat: c } }, h('i', { class: 'sc-legend__sw' }), LEGEND_LABEL[c] || CATS[c]?.name)));
  }

  ensurePyvn().then((ok) => { if (ok && last.lang === 'pyvn') render(last.code, last.lang); });

  // First render may happen while detached/hidden: re-measure once the view gets a real size.
  let measuredW = 0;
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => {
      const w = scroll.offsetWidth;
      if (w && !measuredW && last.code !== null) { layoutShapes(canvas); applySize(); }
      measuredW = w;
    }).observe(scroll);
  }

  return {
    el,
    update(code, lang) {
      code = String(code ?? '');
      if (code === last.code && lang === last.lang) return;
      last = { code, lang };
      render(code, lang);
    },
    relayout() {
      if (last.code !== null && el.isConnected && el.offsetWidth) { layoutShapes(canvas); applySize(); }
    },
  };
}
