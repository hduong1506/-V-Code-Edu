// V-Code Edu — Xưởng khối editor: category list, block palette (flyout), scrollable workspace with
// pointer-based drag & drop, snapping, nesting, reporter slots, dropdowns and context menus.
import { h, s } from '../../core/dom.js';
import { icon } from '../icons.js';
import { promptDialog, confirmDialog } from '../../core/ui.js';
import {
  SPECS, PALETTE, CATEGORY_ORDER, CATEGORY_NAMES, KEY_OPTIONS, EFFECT_OPTIONS, ROTATION_OPTIONS, INSTRUMENT_OPTIONS, MATH_OPTIONS,
  newBlock, cloneBlocks, isHat, isReporter, isBoolean, isCap, walkBlocks,
} from './blocks.js';
import { blockEl, rowEl, mouthEl, footEl, lbl, stackEl, glyph, textWidth } from './render.js';
import { layoutShapes, stackPath, ARM } from './shapes.js';
import { SPRITE_KINDS, BACKDROPS, BACKDROP_ORDER } from './sprites.js';
import { formatValue } from './stage.js';

const SNAP = 30;
const SNAP_SLOT = 26;
const INPUT_FONT = '600 12px "Be Vietnam Pro", system-ui, sans-serif';

/* ---------------- floating popover menu (dropdowns + context menus) ---------------- */
let openPop = null;
export function closePopover() { if (openPop) { openPop.remove(); openPop = null; } }
export function openPopover(anchor, items, { x, y, minWidth } = {}) {
  closePopover();
  const list = h('div', { class: 'sc-pop__list', role: 'menu' });
  for (const it of items) {
    if (it.sep) { list.appendChild(h('div', { class: 'sc-pop__sep' })); continue; }
    if (it.head) { list.appendChild(h('div', { class: 'sc-pop__head' }, it.head)); continue; }
    list.appendChild(h('button', {
      class: `sc-pop__item${it.danger ? ' is-danger' : ''}${it.checked ? ' is-checked' : ''}`,
      type: 'button', role: 'menuitem',
      onClick: (e) => { e.stopPropagation(); closePopover(); it.onSelect?.(); },
    }, h('span', { class: 'sc-pop__check' }, it.checked ? icon('check') : null), h('span', null, it.label)));
  }
  const pop = h('div', { class: 'sc-studio sc-pop' }, list);
  if (minWidth) pop.style.minWidth = `${minWidth}px`;
  document.body.appendChild(pop);
  openPop = pop;
  const r = anchor ? anchor.getBoundingClientRect() : { left: x, right: x, top: y, bottom: y };
  const pw = pop.offsetWidth; const ph = pop.offsetHeight;
  let left = anchor ? r.left : x;
  let top = anchor ? r.bottom + 4 : y;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, (anchor ? r.top - ph - 4 : y - ph));
  pop.style.left = `${Math.max(8, left)}px`;
  pop.style.top = `${Math.max(8, top)}px`;
  const close = (e) => {
    if (openPop !== pop) return cleanup();
    if (e.type === 'keydown' && e.key !== 'Escape') return;
    if (e.type === 'pointerdown' && pop.contains(e.target)) return;
    closePopover(); cleanup();
  };
  const cleanup = () => { document.removeEventListener('pointerdown', close, true); document.removeEventListener('keydown', close, true); window.removeEventListener('resize', close); };
  setTimeout(() => { document.addEventListener('pointerdown', close, true); document.addEventListener('keydown', close, true); window.addEventListener('resize', close); }, 0);
  pop.querySelector('.is-checked, .sc-pop__item')?.focus({ preventScroll: true });
  return pop;
}

export function createWorkspace({ signal, getProject, getSprite, runtime, onChange, onVarsChanged, onMessagesChanged }) {
  let zoom = 0.9;
  let category = 'events';
  const shadows = new WeakMap();
  const scriptEls = new Map();

  /* ---------- DOM ---------- */
  const cats = h('nav', { class: 'sc-cats', 'aria-label': 'Nhóm khối lệnh' });
  const flyInner = h('div', { class: 'sc-flyout__inner' });
  const flyout = h('div', { class: 'sc-flyout', 'aria-label': 'Bảng khối lệnh' }, flyInner,
    h('div', { class: 'sc-flyout__trash', 'aria-hidden': 'true' }, icon('trash'), h('span', null, 'Thả vào đây để xóa')));
  const canvas = h('div', { class: 'sc-ws__canvas' });
  const sizer = h('div', { class: 'sc-ws__sizer' }, canvas);
  const ws = h('div', { class: 'sc-ws', tabindex: '0', 'aria-label': 'Vùng lập trình' }, sizer);
  const marker = h('div', { class: 'sc-ws__marker', hidden: true }, s('svg', { class: 'sc-ws__marker-svg' }, s('path')));
  canvas.appendChild(marker);
  const emptyHint = h('div', { class: 'sc-ws__empty', hidden: true }, icon('stack'), h('strong', null, 'Kéo khối lệnh vào đây'), h('span', null, 'Bắt đầu bằng khối “khi bấm cờ xanh” trong nhóm Sự kiện.'));
  const zoomVal = h('span', { class: 'sc-zoom__val' }, '90%');
  const tools = h('div', { class: 'sc-ws__tools' },
    h('button', { class: 'sc-iconbtn', type: 'button', title: 'Thu nhỏ', 'aria-label': 'Thu nhỏ', onClick: () => setZoom(zoom - 0.1) }, icon('minus')),
    zoomVal,
    h('button', { class: 'sc-iconbtn', type: 'button', title: 'Phóng to', 'aria-label': 'Phóng to', onClick: () => setZoom(zoom + 0.1) }, icon('plus')),
    h('span', { class: 'sc-ws__tools-sep' }),
    h('button', { class: 'sc-iconbtn', type: 'button', title: 'Dọn dẹp khối', 'aria-label': 'Dọn dẹp khối', onClick: () => cleanUp() }, icon('grid')));
  const wsWrap = h('div', { class: 'sc-ws-wrap' }, ws, emptyHint, tools);
  const el = h('div', { class: 'sc-editor' }, cats, flyout, wsWrap);

  /* ---------- menus / options ---------- */
  function menuOptions(menu) {
    const proj = getProject();
    const sp = getSprite();
    switch (menu) {
      case 'keys': return KEY_OPTIONS;
      case 'effects': return EFFECT_OPTIONS;
      case 'rotation': return ROTATION_OPTIONS;
      case 'instruments': return INSTRUMENT_OPTIONS;
      case 'math': return MATH_OPTIONS;
      case 'msgs': return [...proj.messages.map((m) => [m, m]), ['__new__', 'Tin nhắn mới…']];
      case 'vars': return [...proj.variables.map((v) => [v.name, v.name]), ['__new__', 'Biến mới…']];
      case 'costumes': return (SPRITE_KINDS[sp?.kind] || SPRITE_KINDS.vbot).costumes.map((c) => [c.name, c.name]);
      case 'backdrops': return BACKDROP_ORDER.map((id) => [id, BACKDROPS[id].name]);
      case 'touch': return [['_mouse_', 'con trỏ chuột'], ['_edge_', 'cạnh sân khấu'], ...proj.sprites.filter((o) => o !== sp).map((o) => [o.name, o.name])];
      case 'towards': return [['_mouse_', 'con trỏ chuột'], ...proj.sprites.filter((o) => o !== sp).map((o) => [o.name, o.name])];
      default: return [];
    }
  }
  function optionLabel(menu, value) {
    const found = menuOptions(menu).find(([v]) => v === value);
    if (found) return found[1];
    if (value === '_mouse_') return 'con trỏ chuột';
    if (value === '_edge_') return 'cạnh sân khấu';
    return value === '' ? '—' : String(value);
  }

  async function chooseOption(btn, b, name, argSpec) {
    const opts = menuOptions(argSpec.menu);
    openPopover(btn, opts.map(([v, label]) => ({
      label,
      checked: v === b.args[name],
      onSelect: async () => {
        let value = v;
        if (v === '__new__') {
          if (argSpec.menu === 'msgs') {
            const m = await promptDialog({ title: 'Tin nhắn mới', label: 'Tên tin nhắn', placeholder: 'ví dụ: bắt đầu', maxLength: 40 });
            if (!m) return;
            if (!getProject().messages.includes(m)) getProject().messages.push(m);
            onMessagesChanged?.();
            value = m;
          } else {
            const nm = await createVariable();
            if (!nm) return;
            value = nm;
          }
        }
        b.args[name] = value;
        const scriptEl = btn.closest('.sc-script');
        btn.querySelector('.sc-dd__label').textContent = optionLabel(argSpec.menu, value);
        layoutShapes(scriptEl || btn.closest('.sc-b'));
        if (!flyout.contains(btn)) { updateSize(); onChange?.(); }
      },
    })), { minWidth: Math.max(140, btn.offsetWidth) });
  }

  async function createVariable() {
    const nm = await promptDialog({ title: 'Tạo biến mới', label: 'Tên biến (dùng cho mọi nhân vật)', placeholder: 'ví dụ: điểm', maxLength: 32 });
    if (!nm) return null;
    const proj = getProject();
    if (proj.variables.some((v) => v.name === nm)) return nm;
    proj.variables.push({ name: nm, value: 0, monitor: true });
    onVarsChanged?.();
    renderPalette();
    onChange?.();
    return nm;
  }

  /* ---------- block rendering ---------- */
  const GLYPH_TOKENS = { '@flag': () => glyph('flag', 'sc-glyph--flag'), '@stop': () => glyph('stop'), '@turn-right': () => glyph('turn-right'), '@turn-left': () => glyph('turn-left'), '@note': () => glyph('note', 'sc-glyph--ext'), '@pen': () => glyph('pen', 'sc-glyph--ext') };

  function autosize(input) {
    const w = textWidth(input.value || input.placeholder || '', INPUT_FONT);
    input.style.width = `${Math.max(input.classList.contains('sc-in--num') ? 26 : 30, Math.ceil(w) + 16)}px`;
  }

  function slotEl(b, name, a, ctx) {
    const v = b.args[name];
    if (v && typeof v === 'object' && v.op) {
      const slot = h('span', { class: 'sc-slot sc-slot--filled', dataset: { arg: name } });
      slot.__owner = b;
      slot.appendChild(renderBlock(v, { b: v, owner: b, arg: name }, ctx));
      return slot;
    }
    if (a.type === 'bool') {
      const slot = h('span', { class: 'sc-slot sc-slot--bool', dataset: { arg: name, type: 'bool' } });
      slot.__owner = b;
      return slot;
    }
    if (a.type === 'dd') {
      const btn = h('button', { class: 'sc-dd', type: 'button', dataset: { arg: name }, 'aria-haspopup': 'menu', title: 'Chọn' },
        h('span', { class: 'sc-dd__label' }, optionLabel(a.menu, v)), h('span', { class: 'sc-dd__caret', 'aria-hidden': 'true' }));
      btn.addEventListener('click', (e) => { e.stopPropagation(); chooseOption(btn, b, name, a); });
      return btn;
    }
    if (a.type === 'color') {
      const input = h('input', { type: 'color', class: 'sc-color__native', value: /^#[0-9a-f]{6}$/i.test(v) ? v : '#2f6fdc', tabindex: '-1', 'aria-hidden': 'true' });
      const btn = h('button', { class: 'sc-color', type: 'button', title: 'Chọn màu', 'aria-label': 'Chọn màu bút', style: { '--sw': input.value } }, input);
      btn.addEventListener('click', (e) => { e.stopPropagation(); try { input.showPicker ? input.showPicker() : input.click(); } catch { input.click(); } });
      input.addEventListener('input', () => { b.args[name] = input.value; btn.style.setProperty('--sw', input.value); if (!flyout.contains(btn)) onChange?.(); });
      return btn;
    }
    const isNum = a.type === 'num';
    const input = h('input', {
      class: `sc-in${isNum ? ' sc-in--num' : ''}`,
      type: 'text', value: String(v ?? ''), spellcheck: 'false', autocomplete: 'off',
      inputmode: isNum ? 'decimal' : undefined, 'aria-label': 'Giá trị',
    });
    autosize(input);
    input.addEventListener('input', () => {
      if (isNum) {
        const cleaned = input.value.replace(/[^0-9.\-eE]/g, '');
        if (cleaned !== input.value) input.value = cleaned;
      }
      b.args[name] = input.value;
      autosize(input);
      layoutShapes(input.closest('.sc-script') || input.closest('.sc-b'));
      if (!flyout.contains(input)) { updateSize(); onChange?.(); }
    });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur(); e.stopPropagation(); });
    const slot = h('span', { class: `sc-slot sc-slot--${isNum ? 'num' : 'text'}`, dataset: { arg: name, type: a.type } }, input);
    slot.__owner = b;
    return slot;
  }

  function rowParts(row, b, ctx) {
    const spec = SPECS[b.op];
    const out = [];
    for (const tok of row.split(/(%[A-Z0-9]+|@[a-z-]+)/)) {
      if (!tok) continue;
      if (tok.startsWith('%')) {
        const name = tok.slice(1);
        const a = spec.args?.[name];
        if (!a) continue;
        if (a.type === 'var') out.push(lbl(String(b.args[name] || '?')));
        else out.push(slotEl(b, name, a, ctx));
      } else if (tok.startsWith('@')) out.push(GLYPH_TOKENS[tok]?.() || null);
      else if (tok.trim()) out.push(lbl(tok.trim()));
    }
    return out;
  }

  function renderBlock(b, bind, ctx = {}) {
    const spec = SPECS[b.op];
    if (!spec) {
      const unknown = blockEl({ cat: 'other' }, rowEl(lbl(`khối lạ: ${b.op}`)));
      unknown.__bind = bind;
      return unknown;
    }
    const shape = spec.shape;
    const shapeAttr = shape === 'hat' || shape === 'cap' || shape === 'stack' ? 'stack' : shape;
    const el2 = blockEl({ cat: spec.cat, shape: shapeAttr, top: shape === 'hat' ? 'hat' : 'notch', cap: shape === 'cap' || !!spec.cap });
    el2.__bind = bind;
    spec.rows.forEach((row, i) => {
      el2.appendChild(rowEl(...rowParts(row, b, ctx)));
      if (shape === 'c') el2.appendChild(mouthEl(renderStack(b.stacks?.[`S${i + 1}`] || [], null, ctx)));
    });
    if (shape === 'c') el2.appendChild(footEl(!!spec.arrow));
    return el2;
  }

  function renderStack(list, script, ctx) {
    return stackEl(...list.map((b, i) => renderBlock(b, { b, list, index: i, script }, ctx)));
  }

  /* ---------- palette ---------- */
  function paletteBlock(op, args) {
    const b = newBlock(op, args);
    const wrap = h('div', { class: 'sc-fly__item' }, renderBlock(b, { b, palette: true }));
    return wrap;
  }

  function renderPalette() {
    const proj = getProject();
    const sp = getSprite();
    const costumes = (SPRITE_KINDS[sp?.kind] || SPRITE_KINDS.vbot).costumes;
    const firstVar = proj.variables[0]?.name || '';
    const firstMsg = proj.messages[0] || 'bắt đầu';
    const other = proj.sprites.find((o) => o !== sp);
    const defaults = {
      mo_goto: { X: String(Math.round(sp?.x || 0)), Y: String(Math.round(sp?.y || 0)) },
      mo_glide: { X: String(Math.round(sp?.x || 0)), Y: String(Math.round(sp?.y || 0)) },
      lo_costume: { COSTUME: costumes[1]?.name || costumes[0].name },
      lo_backdrop: { BACKDROP: proj.backdrop },
      va_set: { VAR: firstVar }, va_change: { VAR: firstVar }, va_show: { VAR: firstVar }, va_hide: { VAR: firstVar },
      ev_msg: { MSG: firstMsg }, ev_broadcast: { MSG: firstMsg }, ev_broadcast_wait: { MSG: firstMsg },
      se_touch: { TARGET: other ? other.name : '_edge_' },
    };
    const prevScroll = flyout.scrollTop;
    const sections = CATEGORY_ORDER.map((cat) => {
      const items = [];
      if (cat === 'variables') {
        items.push(h('button', { class: 'sc-btn sc-fly__make', type: 'button', onClick: () => createVariable() }, icon('plus'), 'Tạo biến'));
        for (const v of proj.variables) {
          const cb = h('input', { type: 'checkbox', class: 'sc-fly__check', checked: !!v.monitor, title: 'Hiện trên sân khấu', 'aria-label': `Hiện biến ${v.name} trên sân khấu` });
          cb.addEventListener('change', () => { v.monitor = cb.checked; onVarsChanged?.(); onChange?.(); });
          const item = paletteBlock('va_get', { VAR: v.name });
          item.classList.add('sc-fly__var');
          item.prepend(cb);
          item.dataset.varName = v.name;
          items.push(item);
        }
        if (!proj.variables.length) items.push(h('p', { class: 'sc-fly__note' }, 'Chưa có biến nào. Bấm “Tạo biến” để bắt đầu.'));
        else for (const op of PALETTE.variables) items.push(paletteBlock(op, defaults[op]));
      } else {
        for (const op of PALETTE[cat]) items.push(paletteBlock(op, defaults[op]));
      }
      return h('section', { class: 'sc-fly__sec', dataset: { cat } },
        h('h3', { class: 'sc-fly__title', dataset: { cat } }, h('i', { class: 'sc-fly__dot' }), CATEGORY_NAMES[cat]), ...items);
    });
    flyInner.replaceChildren(...sections);
    layoutShapes(flyInner);
    flyout.scrollTop = prevScroll;
  }

  function renderCats() {
    cats.replaceChildren(...CATEGORY_ORDER.map((cat) => h('button', {
      class: 'sc-cat', type: 'button', dataset: { cat }, 'aria-pressed': String(cat === category),
      onClick: () => selectCategory(cat, true),
    }, h('span', { class: 'sc-cat__dot' }), h('span', { class: 'sc-cat__name' }, CATEGORY_NAMES[cat]))));
  }
  function selectCategory(cat, scroll) {
    category = cat;
    cats.querySelectorAll('.sc-cat').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === cat)));
    if (scroll) {
      const sec = flyInner.querySelector(`.sc-fly__sec[data-cat="${cat}"]`);
      if (sec) { flyout.scrollTo({ top: sec.offsetTop - 4, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
    }
  }
  flyout.addEventListener('scroll', () => {
    const top = flyout.scrollTop + 40;
    let cur = CATEGORY_ORDER[0];
    for (const sec of flyInner.children) if (sec.offsetTop <= top) cur = sec.dataset.cat;
    if (cur !== category) selectCategory(cur, false);
  }, { passive: true, signal });

  /* ---------- workspace scripts ---------- */
  function renderScripts() {
    const sp = getSprite();
    scriptEls.clear();
    const els = [];
    for (const script of sp?.scripts || []) {
      const sEl = h('div', { class: 'sc-script sc-script--ws', style: { left: `${script.x}px`, top: `${script.y}px` } });
      sEl.__script = script;
      const first = script.blocks[0];
      if (first && isReporter(first)) sEl.appendChild(renderBlock(first, { b: first, list: script.blocks, index: 0, script }));
      else sEl.appendChild(renderStack(script.blocks, script, {}));
      scriptEls.set(script, sEl);
      els.push(sEl);
    }
    canvas.replaceChildren(...els, marker);
    layoutShapes(canvas);
    emptyHint.hidden = els.length > 0;
    updateSize();
    applyRunning();
  }

  function updateSize() {
    let mw = 0; let mh = 0;
    for (const [script, sEl] of scriptEls) {
      mw = Math.max(mw, script.x + sEl.offsetWidth);
      mh = Math.max(mh, script.y + sEl.offsetHeight);
    }
    const vw = ws.clientWidth / zoom; const vh = ws.clientHeight / zoom;
    const w = Math.max(mw + 320, vw); const hh = Math.max(mh + 320, vh);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${hh}px`;
    canvas.style.transform = `scale(${zoom})`;
    sizer.style.width = `${Math.ceil(w * zoom)}px`;
    sizer.style.height = `${Math.ceil(hh * zoom)}px`;
  }

  function setZoom(z) {
    const old = zoom;
    zoom = Math.min(1.6, Math.max(0.5, Math.round(z * 10) / 10));
    zoomVal.textContent = `${Math.round(zoom * 100)}%`;
    const cx = (ws.scrollLeft + ws.clientWidth / 2) / old; const cy = (ws.scrollTop + ws.clientHeight / 2) / old;
    updateSize();
    ws.scrollLeft = cx * zoom - ws.clientWidth / 2;
    ws.scrollTop = cy * zoom - ws.clientHeight / 2;
  }

  function cleanUp() {
    const sp = getSprite();
    let y = 20;
    for (const script of sp.scripts) {
      script.x = 20; script.y = y;
      const sEl = scriptEls.get(script);
      y += (sEl ? sEl.offsetHeight : 60) + 28;
    }
    renderScripts();
    ws.scrollTo({ left: 0, top: 0 });
    onChange?.();
  }

  let runningSet = new Set();
  function applyRunning() { for (const [script, sEl] of scriptEls) sEl.classList.toggle('is-running', runningSet.has(script)); }

  /* ---------- reporter value bubble ---------- */
  function showValue(anchor, value) {
    canvas.querySelectorAll('.sc-valtip').forEach((t) => t.remove());
    document.querySelectorAll('.sc-valtip--fixed').forEach((t) => t.remove());
    const r = anchor.getBoundingClientRect();
    const tip = h('div', { class: 'sc-studio sc-valtip sc-valtip--fixed', role: 'status' }, formatValue(value) || ' ');
    tip.style.left = `${r.left}px`;
    tip.style.top = `${r.bottom + 6}px`;
    document.body.appendChild(tip);
    setTimeout(() => tip.remove(), 2200);
  }

  /* ---------- drag & drop ---------- */
  let drag = null;
  let pan = null;
  let dragLayer = null;

  function grabTarget(t, e) {
    const row = t.closest('.sc-b__row');
    if (row) {
      const bEl = row.parentElement;
      return bEl && bEl.classList.contains('sc-b') ? bEl : null;
    }
    // hat cap area / padding of a non-C block
    if (t.classList?.contains('sc-b') && t.dataset.shape !== 'c') return t;
    // the left arm of a C-block (beside its mouth)
    if (e && t.classList?.contains('sc-b__mouth')) {
      const r = t.getBoundingClientRect();
      const scale = r.width / (t.offsetWidth || 1);
      if (e.clientX - r.left < ARM * scale) return t.parentElement;
    }
    return null;
  }

  function onPointerDown(e) {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const t = e.target;
    if (t.closest('input, .sc-dd, .sc-color, button, .sc-ws__tools')) return;
    const bEl = grabTarget(t, e);
    const inPalette = flyout.contains(t);
    if (!bEl || !bEl.__bind) {
      if (ws.contains(t) && !inPalette) {
        pan = { id: e.pointerId, x: e.clientX, y: e.clientY, sl: ws.scrollLeft, st: ws.scrollTop };
        ws.classList.add('is-panning');
      }
      return;
    }
    e.preventDefault();
    ws.focus({ preventScroll: true });
    const rect = bEl.getBoundingClientRect();
    const srcScale = inPalette ? 1 : zoom;
    drag = {
      id: e.pointerId, x0: e.clientX, y0: e.clientY, bEl, inPalette, started: false,
      offX: (e.clientX - rect.left) / srcScale, offY: (e.clientY - rect.top) / srcScale,
      lp: e.pointerType === 'touch' ? setTimeout(() => { if (drag && !drag.started) { const d = drag; drag = null; showContextMenu(d.bEl, d.x0, d.y0); } }, 600) : 0,
    };
  }

  function beginDrag() {
    const bind = drag.bEl.__bind;
    const sp = getSprite();
    let blocks;
    if (drag.inPalette) {
      blocks = [cloneBlocks(bind.b)];
    } else if (bind.owner) {
      blocks = [bind.b];
      const prev = shadows.get(bind.owner)?.[bind.arg];
      const a = SPECS[bind.owner.op]?.args?.[bind.arg];
      bind.owner.args[bind.arg] = prev !== undefined ? prev : (a?.type === 'bool' ? null : (a?.def ?? ''));
    } else if (bind.list) {
      blocks = bind.list.splice(bind.index);
      if (bind.script && bind.script.blocks.length === 0) sp.scripts.splice(sp.scripts.indexOf(bind.script), 1);
    } else return false;
    drag.blocks = blocks;
    drag.started = true;
    closePopover();
    // floating copy
    const inner = isReporter(blocks[0]) ? renderBlock(blocks[0], { b: blocks[0] }) : renderStack(blocks, null, {});
    const holder = h('div', { class: 'sc-script sc-script--drag' }, inner);
    const mover = h('div', { class: 'sc-drag', style: { transform: `scale(${zoom})` } }, holder);
    dragLayer = h('div', { class: 'sc-studio sc-drag-layer' }, mover);
    document.body.appendChild(dragLayer);
    layoutShapes(holder);
    drag.mover = mover;
    drag.h = holder.offsetHeight;
    drag.topW = inner.firstElementChild?.classList?.contains('sc-b') ? inner.firstElementChild.offsetWidth : inner.offsetWidth;
    drag.topH = (isReporter(blocks[0]) ? inner : inner.firstElementChild)?.offsetHeight || 40;
    el.classList.add('is-dragging');
    if (!drag.inPalette) renderScripts();
    drag.targets = collectTargets(blocks);
    return true;
  }

  function collectTargets(blocks) {
    const top = blocks[0];
    const out = [];
    const cr = canvas.getBoundingClientRect();
    const toWs = (r) => ({ x: (r.left - cr.left) / zoom, y: (r.top - cr.top) / zoom, w: r.width / zoom, h: r.height / zoom });
    if (isReporter(top)) {
      for (const slot of canvas.querySelectorAll('.sc-slot[data-type]')) {
        if (slot.dataset.type === 'bool' ? !isBoolean(top) && false : false) continue;
        if (slot.dataset.type === 'bool' && !isBoolean(top)) continue;
        const r = toWs(slot.getBoundingClientRect());
        out.push({ kind: 'slot', x: r.x, y: r.y + r.h / 2, el: slot, owner: slot.__owner, arg: slot.dataset.arg });
      }
      return out;
    }
    const hat = isHat(top);
    const endsCap = isCap(blocks[blocks.length - 1]);
    for (const bEl of canvas.querySelectorAll('.sc-b')) {
      const bind = bEl.__bind;
      if (!bind?.list || isReporter(bind.b)) continue;
      const r = toWs(bEl.getBoundingClientRect());
      if (!hat && !isCap(bind.b) && !(endsCap && bind.index < bind.list.length - 1)) {
        out.push({ kind: 'after', x: r.x, y: r.y + bEl.offsetHeight, list: bind.list, index: bind.index + 1 });
      }
      if (!hat && bind.b.stacks) {
        bEl.querySelectorAll(':scope > .sc-b__mouth').forEach((m, i) => {
          const list = bind.b.stacks[`S${i + 1}`];
          if (!list || (endsCap && list.length)) return;
          const mr = toWs(m.getBoundingClientRect());
          out.push({ kind: 'after', x: mr.x + ARM, y: mr.y, list, index: 0 });
        });
      }
    }
    if (!endsCap) {
      for (const sEl of canvas.querySelectorAll(':scope > .sc-script')) {
        const script = sEl.__script;
        const first = script?.blocks[0];
        if (!first || isHat(first) || isReporter(first)) continue;
        out.push({ kind: 'before', x: script.x, y: script.y, script });
      }
    }
    return out;
  }

  function dragPos(e, d = drag) {
    const cr = canvas.getBoundingClientRect();
    return { x: (e.clientX - d.offX * zoom - cr.left) / zoom, y: (e.clientY - d.offY * zoom - cr.top) / zoom };
  }

  function findSnap(p) {
    let best = null; let bestD = Infinity;
    for (const c of drag.targets) {
      let d;
      if (c.kind === 'slot') d = Math.hypot(p.x - c.x, p.y + drag.h / 2 - c.y);
      else if (c.kind === 'before') d = Math.hypot(p.x - c.x, p.y + drag.h - c.y);
      else d = Math.hypot(p.x - c.x, p.y - c.y);
      const lim = c.kind === 'slot' ? SNAP_SLOT : SNAP;
      if (d < lim && d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  function overPalette(e) {
    const fr = flyout.getBoundingClientRect();
    const cr = cats.getBoundingClientRect();
    const inRect = (r) => e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    return inRect(fr) || inRect(cr);
  }

  let snapEl = null;
  function showSnap(c) {
    if (snapEl) { snapEl.classList.remove('is-snap'); snapEl = null; }
    if (!c) { marker.hidden = true; return; }
    if (c.kind === 'slot') { marker.hidden = true; snapEl = c.el; snapEl.classList.add('is-snap'); return; }
    const w = Math.max(60, drag.topW); const hh = Math.max(32, Math.min(48, drag.topH));
    const svg = marker.firstElementChild;
    svg.setAttribute('width', w + 2); svg.setAttribute('height', hh + 8);
    svg.firstElementChild.setAttribute('d', stackPath(w, hh, { top: isHat(drag.blocks[0]) ? 'hat' : 'notch' }));
    const y = c.kind === 'before' ? c.y - drag.h : c.y;
    marker.style.left = `${c.x}px`;
    marker.style.top = `${y}px`;
    marker.hidden = false;
  }

  function onPointerMove(e) {
    if (pan && pan.id === e.pointerId) {
      ws.scrollLeft = pan.sl - (e.clientX - pan.x);
      ws.scrollTop = pan.st - (e.clientY - pan.y);
      return;
    }
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.started) {
      if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) < 5) return;
      clearTimeout(drag.lp);
      if (!beginDrag()) { drag = null; return; }
    }
    e.preventDefault();
    drag.mover.style.left = `${e.clientX - drag.offX * zoom}px`;
    drag.mover.style.top = `${e.clientY - drag.offY * zoom}px`;
    // auto-scroll near the workspace edges
    const wr = ws.getBoundingClientRect();
    if (e.clientX > wr.left && e.clientX < wr.right && e.clientY > wr.top && e.clientY < wr.bottom) {
      if (e.clientX > wr.right - 28) ws.scrollLeft += 14;
      if (e.clientY > wr.bottom - 28) ws.scrollTop += 14;
      if (e.clientY < wr.top + 20) ws.scrollTop -= 14;
    }
    const del = overPalette(e);
    el.classList.toggle('is-over-trash', del);
    drag.snap = del ? null : findSnap(dragPos(e));
    showSnap(drag.snap);
  }

  function onPointerUp(e) {
    if (pan && pan.id === e.pointerId) { pan = null; ws.classList.remove('is-panning'); return; }
    if (!drag || drag.id !== e.pointerId) return;
    const d = drag;
    drag = null;
    clearTimeout(d.lp);
    if (!d.started) { handleClick(d.bEl, d.inPalette); return; }
    const sp = getSprite();
    const del = overPalette(e);
    if (!del && e.type !== 'pointercancel') {
      const c = d.snap;
      if (c?.kind === 'after') c.list.splice(c.index, 0, ...d.blocks);
      else if (c?.kind === 'before') { c.script.blocks.unshift(...d.blocks); c.script.y = Math.round(c.script.y - d.h); }
      else if (c?.kind === 'slot') {
        const prev = c.owner.args[c.arg];
        const sh = shadows.get(c.owner) || {};
        sh[c.arg] = prev && typeof prev === 'object' ? '' : prev;
        shadows.set(c.owner, sh);
        c.owner.args[c.arg] = d.blocks[0];
      } else {
        const wr = ws.getBoundingClientRect();
        const inside = e.clientX >= wr.left && e.clientX <= wr.right && e.clientY >= wr.top && e.clientY <= wr.bottom;
        if (inside || !d.inPalette) {
          const p = dragPos(e, d);
          const maxX = (ws.scrollLeft + ws.clientWidth) / zoom - 60;
          const maxY = (ws.scrollTop + ws.clientHeight) / zoom - 30;
          sp.scripts.push({ x: Math.round(Math.max(4, Math.min(p.x, maxX))), y: Math.round(Math.max(4, Math.min(p.y, maxY))), blocks: d.blocks });
        }
      }
    }
    dragLayer?.remove();
    dragLayer = null;
    showSnap(null);
    el.classList.remove('is-dragging', 'is-over-trash');
    renderScripts();
    if (!(d.inPalette && del)) onChange?.();
  }

  function handleClick(bEl, inPalette) {
    const sp = getSprite();
    if (!sp) return;
    const bind = bEl.__bind;
    if (inPalette) {
      const res = runtime.runBlock(sp, bind.b);
      if (res) showValue(bEl, res.value);
      return;
    }
    const sEl = bEl.closest('.sc-script');
    const script = sEl?.__script;
    if (!script) return;
    if (bind.owner) { const res = runtime.runBlock(sp, bind.b); if (res) showValue(bEl, res.value); return; }
    const res = runtime.runScript(sp, script);
    if (res) showValue(bEl, res.value);
  }

  /* ---------- context menu ---------- */
  function deleteBlock(bEl) {
    const bind = bEl.__bind;
    const sp = getSprite();
    if (bind.owner) {
      const a = SPECS[bind.owner.op]?.args?.[bind.arg];
      bind.owner.args[bind.arg] = a?.type === 'bool' ? null : (a?.def ?? '');
    } else if (bind.list) {
      bind.list.splice(bind.index, 1);
      if (bind.script && bind.script.blocks.length === 0) sp.scripts.splice(sp.scripts.indexOf(bind.script), 1);
    }
    renderScripts();
    onChange?.();
  }
  function duplicateBlock(bEl) {
    const bind = bEl.__bind;
    const sp = getSprite();
    const sEl = bEl.closest('.sc-script');
    const script = sEl?.__script;
    const cr = canvas.getBoundingClientRect();
    const r = bEl.getBoundingClientRect();
    const x = Math.round((r.left - cr.left) / zoom) + 28;
    const y = Math.round((r.top - cr.top) / zoom) + 28;
    const blocks = bind.list ? cloneBlocks(bind.list.slice(bind.index)) : [cloneBlocks(bind.b)];
    sp.scripts.push({ x, y, blocks });
    void script;
    renderScripts();
    onChange?.();
  }
  function countBlocks(bEl) {
    const bind = bEl.__bind;
    let n = 0;
    walkBlocks([bind.b], (b) => { if (!isReporter(b)) n++; });
    return n;
  }
  function showContextMenu(bEl, x, y) {
    const inPalette = flyout.contains(bEl);
    if (inPalette) {
      const item = bEl.closest('.sc-fly__var');
      if (!item) return;
      const name = item.dataset.varName;
      openPopover(null, [
        { head: `Biến “${name}”` },
        { label: 'Đổi tên biến', onSelect: () => renameVariable(name) },
        { label: 'Xóa biến', danger: true, onSelect: () => deleteVariable(name) },
      ], { x, y });
      return;
    }
    const n = countBlocks(bEl);
    openPopover(null, [
      { label: 'Nhân bản', onSelect: () => duplicateBlock(bEl) },
      { label: n > 1 ? `Xóa ${n} khối` : 'Xóa khối', danger: true, onSelect: () => deleteBlock(bEl) },
    ], { x, y });
  }
  function showWsMenu(x, y) {
    const sp = getSprite();
    openPopover(null, [
      { label: 'Dọn dẹp khối', onSelect: () => cleanUp() },
      { label: 'Xóa tất cả khối của nhân vật này', danger: true, onSelect: async () => {
        if (!sp.scripts.length) return;
        if (await confirmDialog({ title: 'Xóa tất cả khối?', message: `Mọi kịch bản của “${sp.name}” sẽ bị xóa.`, confirmLabel: 'Xóa', danger: true })) {
          sp.scripts.length = 0; renderScripts(); onChange?.();
        }
      } },
    ], { x, y });
  }
  async function renameVariable(name) {
    const nm = await promptDialog({ title: 'Đổi tên biến', label: 'Tên mới', value: name, maxLength: 32 });
    if (!nm || nm === name) return;
    const proj = getProject();
    if (proj.variables.some((v) => v.name === nm)) return;
    const v = proj.variables.find((x) => x.name === name);
    if (v) v.name = nm;
    for (const sp of proj.sprites) for (const sc of sp.scripts) walkBlocks(sc.blocks, (b) => { if (b.args && 'VAR' in b.args && b.args.VAR === name) b.args.VAR = nm; });
    onVarsChanged?.(); renderPalette(); renderScripts(); onChange?.();
  }
  async function deleteVariable(name) {
    const proj = getProject();
    let used = 0;
    for (const sp of proj.sprites) for (const sc of sp.scripts) walkBlocks(sc.blocks, (b) => { if (b.args?.VAR === name) used++; });
    if (used && !(await confirmDialog({ title: 'Xóa biến?', message: `Biến “${name}” đang được dùng trong ${used} khối. Các khối đó sẽ không còn biến để dùng.`, confirmLabel: 'Xóa biến', danger: true }))) return;
    proj.variables = proj.variables.filter((v) => v.name !== name);
    onVarsChanged?.(); renderPalette(); renderScripts(); onChange?.();
  }

  el.addEventListener('pointerdown', onPointerDown, { signal });
  window.addEventListener('pointermove', onPointerMove, { signal, passive: false });
  window.addEventListener('pointerup', onPointerUp, { signal });
  window.addEventListener('pointercancel', onPointerUp, { signal });
  el.addEventListener('contextmenu', (e) => {
    if (e.target.closest('input')) return;
    e.preventDefault();
    const bEl = grabTarget(e.target, e);
    if (bEl?.__bind && !bEl.__bind.palette) showContextMenu(bEl, e.clientX, e.clientY);
    else if (bEl && flyout.contains(bEl)) showContextMenu(bEl, e.clientX, e.clientY);
    else if (ws.contains(e.target)) showWsMenu(e.clientX, e.clientY);
  }, { signal });
  ws.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? 0.1 : -0.1)); }
  }, { passive: false, signal });
  ws.addEventListener('keydown', (e) => {
    if (e.target !== ws) return;
    if (e.key === '+' || e.key === '=') { setZoom(zoom + 0.1); e.preventDefault(); }
    else if (e.key === '-') { setZoom(zoom - 0.1); e.preventDefault(); }
  }, { signal });
  signal?.addEventListener('abort', () => { dragLayer?.remove(); closePopover(); });

  renderCats();

  return {
    el,
    renderAll() { renderPalette(); renderScripts(); },
    renderPalette,
    renderScripts,
    relayout() { if (el.offsetWidth) { layoutShapes(flyInner); layoutShapes(canvas); updateSize(); } },
    setRunning(set) { runningSet = set; applyRunning(); },
    selectCategory: (c) => selectCategory(c, true),
    createVariable,
    get zoom() { return zoom; },
    /** test hooks */
    _canvas: canvas,
    _flyout: flyout,
  };
}
