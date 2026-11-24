// V-Code Edu — Xưởng khối stage: 480×360 logical canvas scaled to fit, pen layer, speech bubbles,
// variable monitors, the "hỏi và đợi" prompt, sprite hit-testing and dragging.
import { h } from '../../core/dom.js';
import { icon } from '../icons.js';
import { costumeImage, costumeHit, backdropImage, SPRITE_KINDS } from './sprites.js';

export const W = 480;
export const H = 360;

export function formatValue(v) {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return Number.isNaN(v) ? '0' : (v > 0 ? 'Infinity' : '-Infinity');
    if (Number.isInteger(v)) return String(v);
    return String(Math.round(v * 1e6) / 1e6);
  }
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v ?? '');
}

/** Transform helpers shared by drawing and hit tests. */
function spriteXform(sp) {
  const scale = (sp.size || 100) / 100;
  let angle = 0;
  let flip = 1;
  if (sp.rotationStyle === 'lr') flip = sp.dir < 0 ? -1 : 1;
  else if (sp.rotationStyle !== 'none') angle = ((sp.dir - 90) * Math.PI) / 180;
  return { cx: W / 2 + sp.x, cy: H / 2 - sp.y, scale, angle, flip };
}

export function spriteBounds(sp) {
  const e = costumeImage(sp.kind, sp.costume || 0);
  const t = spriteXform(sp);
  const hw = (e.w / 2 - 6) * t.scale; const hh = (e.h / 2 - 6) * t.scale;
  const c = Math.cos(t.angle); const s = Math.sin(t.angle);
  const ex = Math.abs(hw * c) + Math.abs(hh * s);
  const ey = Math.abs(hw * s) + Math.abs(hh * c);
  return { left: t.cx - ex, right: t.cx + ex, top: t.cy - ey, bottom: t.cy + ey };
}

/** Is stage point (sx, sy) (canvas coords, y down) on an opaque pixel of the sprite? */
export function spriteHit(sp, sx, sy) {
  if (!sp.visible) return false;
  const e = costumeImage(sp.kind, sp.costume || 0);
  const t = spriteXform(sp);
  const dx = sx - t.cx; const dy = sy - t.cy;
  const c = Math.cos(-t.angle); const s = Math.sin(-t.angle);
  const lx = ((dx * c - dy * s) / t.scale) * t.flip;
  const ly = (dx * s + dy * c) / t.scale;
  return costumeHit(e, lx, ly);
}

export function spritesTouch(a, b) {
  if (!a.visible || !b.visible) return false;
  const A = spriteBounds(a); const Bb = spriteBounds(b);
  const l = Math.max(A.left, Bb.left); const r = Math.min(A.right, Bb.right);
  const t = Math.max(A.top, Bb.top); const bo = Math.min(A.bottom, Bb.bottom);
  if (l >= r || t >= bo) return false;
  const area = (r - l) * (bo - t);
  const step = Math.max(1, Math.sqrt(area / 1600));
  for (let y = t + step / 2; y < bo; y += step) {
    for (let x = l + step / 2; x < r; x += step) {
      if (spriteHit(a, x, y) && spriteHit(b, x, y)) return true;
    }
  }
  return false;
}

export function touchingEdge(sp) {
  const b = spriteBounds(sp);
  return b.left < 0 || b.right > W || b.top < 0 || b.bottom > H;
}

function wrapText(ctx, text, maxW) {
  const words = String(text).split(/(\s+)/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur + w;
    if (ctx.measureText(test).width > maxW && cur.trim()) { lines.push(cur.trim()); cur = w.trimStart(); }
    else cur = test;
    while (ctx.measureText(cur).width > maxW && cur.length > 1) {
      let k = cur.length - 1;
      while (k > 1 && ctx.measureText(cur.slice(0, k)).width > maxW) k--;
      lines.push(cur.slice(0, k)); cur = cur.slice(k);
    }
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines.slice(0, 8);
}

export function createStage({ signal, onSpriteClick, onStageClick, onMouse, onSpriteMoved }) {
  const canvas = h('canvas', { class: 'sc-stage__canvas', width: W, height: H, 'aria-label': 'Sân khấu' });
  const monitors = h('div', { class: 'sc-monitors' });
  const askInput = h('input', { class: 'sc-ask__input', type: 'text', maxlength: '300', 'aria-label': 'Câu trả lời', autocomplete: 'off' });
  const askQ = h('div', { class: 'sc-ask__q' });
  const askBtn = h('button', { class: 'sc-ask__ok', type: 'button', 'aria-label': 'Gửi câu trả lời', title: 'Gửi (Enter)' }, icon('check'));
  const ask = h('form', { class: 'sc-ask', hidden: true }, askQ, h('div', { class: 'sc-ask__row' }, askInput, askBtn));
  const box = h('div', { class: 'sc-stage', tabindex: '0', 'aria-label': 'Sân khấu 480 × 360. Bấm để điều khiển bằng bàn phím.' }, canvas, monitors, ask);

  const ctx = canvas.getContext('2d');
  const pen = document.createElement('canvas');
  pen.width = W * 2; pen.height = H * 2;
  const pctx = pen.getContext('2d');
  pctx.scale(2, 2);
  pctx.lineCap = 'round'; pctx.lineJoin = 'round';

  let scale = 1;
  let dpr = 1;
  const mouse = { x: 0, y: 0, down: false };
  let askResolve = null;
  let probe = null;
  let probeCtx = null;

  function fit(width, height) {
    if (!width || !height) return;
    scale = Math.max(0.1, Math.min(width / W, height / H));
    const cw = Math.floor(W * scale); const ch = Math.floor(H * scale);
    dpr = Math.min(3, window.devicePixelRatio || 1);
    box.style.width = `${cw}px`;
    box.style.height = `${ch}px`;
    box.style.setProperty('--sc-stage-scale', String(scale));
    const bw = Math.round(cw * dpr); const bh = Math.round(ch * dpr);
    if (canvas.width !== bw || canvas.height !== bh) { canvas.width = bw; canvas.height = bh; }
  }

  function toStage(e) {
    const r = canvas.getBoundingClientRect();
    const sx = ((e.clientX - r.left) / r.width) * W;
    const sy = ((e.clientY - r.top) / r.height) * H;
    return { sx, sy, x: Math.round(sx - W / 2), y: Math.round(H / 2 - sy) };
  }

  let sprites = [];
  let drag = null;
  canvas.addEventListener('pointermove', (e) => {
    const p = toStage(e);
    mouse.x = Math.max(-240, Math.min(240, p.x)); mouse.y = Math.max(-180, Math.min(180, p.y));
    onMouse?.(mouse);
    if (drag && drag.id === e.pointerId) {
      const dx = p.sx - drag.sx; const dy = p.sy - drag.sy;
      if (!drag.moved && Math.hypot(dx, dy) > 3) drag.moved = true;
      if (drag.moved) {
        drag.sprite.x = Math.round(drag.ox + dx);
        drag.sprite.y = Math.round(drag.oy - dy);
        onSpriteMoved?.(drag.sprite, false);
      }
    }
  }, { signal });
  canvas.addEventListener('pointerdown', (e) => {
    box.focus({ preventScroll: true });
    mouse.down = true;
    const p = toStage(e);
    for (let i = sprites.length - 1; i >= 0; i--) {
      const sp = sprites[i];
      if (spriteHit(sp, p.sx, p.sy)) {
        drag = { id: e.pointerId, sprite: sp, sx: p.sx, sy: p.sy, ox: sp.x, oy: sp.y, moved: false };
        try { canvas.setPointerCapture(e.pointerId); } catch { /* ignore */ }
        onSpriteClick?.(sp);
        return;
      }
    }
    onStageClick?.();
  }, { signal });
  const up = (e) => {
    mouse.down = false;
    if (drag && drag.id === e.pointerId) { if (drag.moved) onSpriteMoved?.(drag.sprite, true); drag = null; }
  };
  canvas.addEventListener('pointerup', up, { signal });
  canvas.addEventListener('pointercancel', up, { signal });
  window.addEventListener('pointerup', () => { mouse.down = false; }, { signal });

  ask.addEventListener('submit', (e) => { e.preventDefault(); finishAsk(); }, { signal });
  askBtn.addEventListener('click', (e) => { e.preventDefault(); finishAsk(); }, { signal });
  function finishAsk() {
    if (!askResolve) return;
    const v = askInput.value;
    const r = askResolve;
    askResolve = null;
    ask.hidden = true;
    askInput.value = '';
    box.focus({ preventScroll: true });
    r(v);
  }

  function drawBubble(sp, b) {
    const bounds = spriteBounds(sp);
    ctx.font = '600 13px "Be Vietnam Pro", system-ui, sans-serif';
    const lines = wrapText(ctx, b.text === '' ? ' ' : b.text, 160);
    const lh = 17;
    const bw = Math.max(44, Math.min(176, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22));
    const bh = lines.length * lh + 14;
    let x = bounds.right - 8;
    let flipped = false;
    if (x + bw > W - 2) { x = bounds.left + 8 - bw; flipped = true; }
    x = Math.max(2, Math.min(W - bw - 2, x));
    let y = bounds.top - bh - 14;
    y = Math.max(2, Math.min(H - bh - 2, y));
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(29,37,72,.38)';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    const r = 12;
    ctx.moveTo(x + r, y); ctx.arcTo(x + bw, y, x + bw, y + bh, r); ctx.arcTo(x + bw, y + bh, x, y + bh, r);
    ctx.arcTo(x, y + bh, x, y, r); ctx.arcTo(x, y, x + bw, y, r); ctx.closePath();
    ctx.fill(); ctx.stroke();
    const tx = flipped ? x + bw - 22 : x + 22;
    if (b.type === 'think') {
      [[0, 8, 4.5], [flipped ? 6 : -6, 16, 3]].forEach(([dx, dy, rr]) => {
        ctx.beginPath(); ctx.arc(tx + dx, y + bh + dy, rr, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      });
    } else {
      ctx.beginPath();
      ctx.moveTo(tx - 7, y + bh - 1);
      ctx.lineTo(tx + (flipped ? 8 : -8), y + bh + 12);
      ctx.lineTo(tx + 7, y + bh - 1);
      ctx.fill(); ctx.stroke();
      ctx.fillRect(tx - 6, y + bh - 3, 12, 3);
    }
    ctx.fillStyle = '#1d2548';
    ctx.textBaseline = 'top';
    lines.forEach((l, i) => ctx.fillText(l, x + 11, y + 8 + i * lh));
    ctx.restore();
  }

  function drawSprite(target, sp) {
    if (!sp.visible) return;
    const e = costumeImage(sp.kind, sp.costume || 0);
    const t = spriteXform(sp);
    const fx = sp._rt?.effects || {};
    target.save();
    target.translate(t.cx, t.cy);
    target.rotate(t.angle);
    target.scale(t.scale * t.flip, t.scale);
    const filters = [];
    if (fx.color) filters.push(`hue-rotate(${(fx.color * 1.8) % 360}deg)`);
    if (fx.brightness) filters.push(`brightness(${Math.max(0, 1 + fx.brightness / 100)})`);
    if (filters.length) target.filter = filters.join(' ');
    if (fx.ghost) target.globalAlpha = Math.max(0, Math.min(1, 1 - fx.ghost / 100));
    target.drawImage(e.canvas, -e.w / 2, -e.h / 2, e.w, e.h);
    target.restore();
  }

  function render(project) {
    sprites = project.sprites;
    ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(backdropImage(project.backdrop), 0, 0, W, H);
    ctx.drawImage(pen, 0, 0, W, H);
    for (const sp of sprites) drawSprite(ctx, sp);
    for (const sp of sprites) if (sp.visible && sp._rt?.bubble) drawBubble(sp, sp._rt.bubble);
  }

  function renderMonitors(list) {
    const sig = JSON.stringify(list);
    if (monitors.dataset.sig === sig) return;
    monitors.dataset.sig = sig;
    monitors.replaceChildren(...list.map((m) => h('div', { class: 'sc-monitor' },
      h('span', { class: 'sc-monitor__name' }, m.name), h('span', { class: 'sc-monitor__val' }, formatValue(m.value)))));
  }

  return {
    el: box,
    canvas,
    mouse,
    fit,
    render,
    renderMonitors,
    penLine(x1, y1, x2, y2, color, size) {
      pctx.strokeStyle = color; pctx.lineWidth = size;
      pctx.beginPath(); pctx.moveTo(W / 2 + x1, H / 2 - y1); pctx.lineTo(W / 2 + x2, H / 2 - y2); pctx.stroke();
    },
    penDot(x, y, color, size) {
      pctx.fillStyle = color;
      pctx.beginPath(); pctx.arc(W / 2 + x, H / 2 - y, Math.max(0.5, size / 2), 0, Math.PI * 2); pctx.fill();
    },
    penClear() { pctx.save(); pctx.setTransform(1, 0, 0, 1, 0, 0); pctx.clearRect(0, 0, pen.width, pen.height); pctx.restore(); },
    stamp(sp) { drawSprite(pctx, sp); },
    /** Read back a pen pixel at scratch coords (tests / sensing). Returns [r,g,b,a]. */
    penPixel(x, y) {
      try {
        if (!probe) { probe = document.createElement('canvas'); probe.width = 1; probe.height = 1; probeCtx = probe.getContext('2d', { willReadFrequently: true }); }
        probeCtx.clearRect(0, 0, 1, 1);
        probeCtx.drawImage(pen, Math.round((W / 2 + x) * 2), Math.round((H / 2 - y) * 2), 1, 1, 0, 0, 1, 1);
        return Array.from(probeCtx.getImageData(0, 0, 1, 1).data);
      } catch { return [0, 0, 0, 0]; }
    },
    ask(question) {
      return new Promise((resolve) => {
        askResolve = resolve;
        askQ.textContent = question || '';
        askQ.hidden = !question;
        ask.hidden = false;
        askInput.value = '';
        setTimeout(() => { try { askInput.focus({ preventScroll: true }); } catch { /* ignore */ } }, 20);
      });
    },
    cancelAsk() { if (askResolve) { askResolve = null; ask.hidden = true; askInput.value = ''; } },
    get asking() { return !!askResolve; },
    kinds: SPRITE_KINDS,
  };
}
