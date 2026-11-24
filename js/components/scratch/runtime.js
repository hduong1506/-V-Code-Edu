// V-Code Edu — Xưởng khối runtime: a frame-based interpreter with Scratch-like concurrent threads.
// Each script runs as a generator. Plain `yield` = end of a loop iteration (may resume in the same
// tick if nothing needs redrawing); `yield TICK` = wait for the next frame (waits, glides, ask…).
import { SPECS } from './blocks.js';
import { SPRITE_KINDS, BACKDROPS } from './sprites.js';
import { W, H, spriteBounds, spriteHit, spritesTouch, touchingEdge, formatValue } from './stage.js';

const TICK = Symbol('tick');
const STOP = Symbol('stop');
const TICK_MS = 1000 / 30;
const WORK_MS = 6;

/* ---------------- Scratch-style value semantics ---------------- */
export function toNum(v) {
  if (typeof v === 'number') return Number.isNaN(v) ? 0 : v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const s = String(v ?? '').trim();
  if (!s) return 0;
  const n = Number(s);
  return Number.isNaN(n) ? 0 : n;
}
export function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0 && !Number.isNaN(v);
  const s = String(v ?? '').trim().toLowerCase();
  return !(s === '' || s === '0' || s === 'false');
}
function isNumeric(v) {
  if (typeof v === 'number') return !Number.isNaN(v);
  if (typeof v === 'boolean') return false;
  const s = String(v ?? '');
  return s.trim() !== '' && !Number.isNaN(Number(s));
}
export function compare(a, b) {
  if (isNumeric(a) && isNumeric(b)) return toNum(a) - toNum(b);
  const sa = String(a ?? '').toLowerCase(); const sb = String(b ?? '').toLowerCase();
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const norm180 = (d) => { let x = ((d % 360) + 360) % 360; if (x > 180) x -= 360; return x; };
const round8 = (v) => Math.round(v * 1e8) / 1e8;

function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  const n = m ? parseInt(m[1], 16) : 0x2f6fdc;
  const r = ((n >> 16) & 255) / 255; const g = ((n >> 8) & 255) / 255; const b = (n & 255) / 255;
  const max = Math.max(r, g, b); const min = Math.min(r, g, b);
  let hh = 0; let s = 0; const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hh = (g - b) / d + (g < b ? 6 : 0); else if (max === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4;
    hh *= 60;
  }
  return { h: hh, s: s * 100, l: l * 100 };
}
const penCss = (p) => `hsl(${((p.h % 360) + 360) % 360} ${p.s}% ${p.l}%)`;

export const KEY_FROM_EVENT = (e) => {
  const k = e.key;
  if (k === ' ' || k === 'Spacebar') return 'space';
  if (k === 'ArrowUp') return 'up';
  if (k === 'ArrowDown') return 'down';
  if (k === 'ArrowLeft') return 'left';
  if (k === 'ArrowRight') return 'right';
  if (k && k.length === 1) return k.toLowerCase();
  return null;
};

export function createRuntime({ getProject, stage, onThreads, onError, onDirty }) {
  let threads = [];
  let rafId = 0;
  let active = false;
  let lastTick = 0;
  let redraw = false;
  let dirty = true;
  let timerStart = performance.now();
  let answer = '';
  let asking = false;
  let tempo = 90;
  let volume = 100;
  let instrument = 'triangle';
  let audio = null;
  let master = null;
  const voices = new Set();
  const keys = new Set();
  let now = performance.now();
  let lastRunningKey = '';
  let errorShown = false;

  const P = () => getProject();
  const rtOf = (sp) => {
    if (!sp._rt) sp._rt = { bubble: null, effects: { color: 0, ghost: 0, brightness: 0 }, pen: { down: false, ...hexToHsl('#2f6fdc'), size: 3 } };
    return sp._rt;
  };
  const markRedraw = () => { redraw = true; dirty = true; };

  /* ---------- variables ---------- */
  function varEntry(name) {
    const list = P().variables;
    let v = list.find((x) => x.name === name);
    if (!v && name) { v = { name, value: 0, monitor: true }; list.push(v); }
    return v;
  }
  function getVar(name) { return varEntry(name)?.value ?? 0; }
  function setVar(name, value) { const v = varEntry(name); if (v) { v.value = value; dirty = true; } }

  /* ---------- motion helpers ---------- */
  function fence(sp) {
    const b = spriteBounds(sp);
    const inset = Math.min(15, Math.floor((b.right - b.left) / 2), Math.floor((b.bottom - b.top) / 2));
    let dx = 0; let dy = 0;
    if (b.right < inset) dx = inset - b.right;
    else if (b.left > W - inset) dx = (W - inset) - b.left;
    if (b.bottom < inset) dy = inset - b.bottom;
    else if (b.top > H - inset) dy = (H - inset) - b.top;
    sp.x += dx; sp.y -= dy;
  }
  function moveTo(sp, x, y) {
    const ox = sp.x; const oy = sp.y;
    sp.x = round8(toNum(x)); sp.y = round8(toNum(y));
    fence(sp);
    const pen = rtOf(sp).pen;
    if (pen.down && (sp.x !== ox || sp.y !== oy)) stage.penLine(ox, oy, sp.x, sp.y, penCss(pen), pen.size);
    markRedraw();
  }
  function setDir(sp, d) { sp.dir = round8(norm180(toNum(d))); markRedraw(); }
  function bounce(sp) {
    const b = spriteBounds(sp);
    const dist = { left: Math.max(0, b.left), top: Math.max(0, b.top), right: Math.max(0, W - b.right), bottom: Math.max(0, H - b.bottom) };
    let edge = null; let min = Infinity;
    for (const [k, v] of Object.entries(dist)) if (v < min) { min = v; edge = k; }
    if (min > 0) return;
    const rad = ((90 - sp.dir) * Math.PI) / 180;
    let dx = Math.cos(rad); let dy = -Math.sin(rad);
    if (edge === 'left') dx = Math.max(0.2, Math.abs(dx));
    else if (edge === 'top') dy = Math.max(0.2, Math.abs(dy));
    else if (edge === 'right') dx = -Math.max(0.2, Math.abs(dx));
    else dy = -Math.max(0.2, Math.abs(dy));
    setDir(sp, (Math.atan2(dy, dx) * 180) / Math.PI + 90);
    const nb = spriteBounds(sp);
    if (nb.left < 0) sp.x += -nb.left; else if (nb.right > W) sp.x -= nb.right - W;
    if (nb.top < 0) sp.y -= -nb.top; else if (nb.bottom > H) sp.y += nb.bottom - H;
    markRedraw();
  }
  function spriteByName(name) { return P().sprites.find((s) => s.name === name); }
  function targetPoint(sp, target) {
    if (target === '_mouse_') return { x: stage.mouse.x, y: stage.mouse.y };
    const o = spriteByName(target);
    return o && o !== sp ? { x: o.x, y: o.y } : null;
  }

  /* ---------- sound ---------- */
  function userGesture() {
    try {
      if (!audio) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        audio = new AC();
        master = audio.createGain();
        master.gain.value = 0.25;
        master.connect(audio.destination);
      }
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    } catch { audio = null; }
  }
  function tone(freq, secs, type = instrument) {
    if (!audio || audio.state !== 'running' || volume <= 0) return;
    try {
      const t0 = audio.currentTime;
      const osc = audio.createOscillator();
      const g = audio.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const v = (volume / 100) * 0.9;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(v, t0 + 0.012);
      g.gain.setValueAtTime(v, t0 + Math.max(0.02, secs - 0.06));
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + Math.max(0.05, secs));
      osc.connect(g); g.connect(master);
      osc.start(t0); osc.stop(t0 + Math.max(0.06, secs) + 0.02);
      voices.add(osc);
      osc.onended = () => voices.delete(osc);
    } catch { /* audio unavailable */ }
  }
  function stopSounds() { for (const o of voices) { try { o.stop(); } catch { /* ended */ } } voices.clear(); }

  /* ---------- evaluation ---------- */
  function ev(sp, v) {
    if (v && typeof v === 'object' && v.op) return report(sp, v);
    return v ?? '';
  }
  function report(sp, b) {
    const a = b.args || {};
    const n = (k) => toNum(ev(sp, a[k]));
    const s = (k) => formatValue(ev(sp, a[k]));
    switch (b.op) {
      case 'mo_x': return round8(sp.x);
      case 'mo_y': return round8(sp.y);
      case 'mo_dir': return round8(sp.dir);
      case 'lo_costume_num': return (sp.costume || 0) + 1;
      case 'lo_size': return Math.round(sp.size);
      case 'so_volume': return volume;
      case 'se_touch': {
        const t = a.TARGET;
        if (!sp.visible) return false;
        if (t === '_edge_') return touchingEdge(sp);
        if (t === '_mouse_') return spriteHit(sp, W / 2 + stage.mouse.x, H / 2 - stage.mouse.y);
        const o = spriteByName(t);
        return !!o && o !== sp && spritesTouch(sp, o);
      }
      case 'se_key': return a.KEY === 'any' ? keys.size > 0 : keys.has(a.KEY);
      case 'se_mouse_down': return !!stage.mouse.down;
      case 'se_mouse_x': return stage.mouse.x;
      case 'se_mouse_y': return stage.mouse.y;
      case 'se_distance': { const p = targetPoint(sp, a.TARGET); return p ? round8(Math.hypot(p.x - sp.x, p.y - sp.y)) : 10000; }
      case 'se_answer': return answer;
      case 'se_timer': return Math.round((now - timerStart) / 10) / 100;
      case 'op_add': return n('A') + n('B');
      case 'op_sub': return n('A') - n('B');
      case 'op_mul': return n('A') * n('B');
      case 'op_div': return n('A') / n('B');
      case 'op_random': {
        const ra = ev(sp, a.A); const rb = ev(sp, a.B);
        let lo = toNum(ra); let hi = toNum(rb);
        if (lo > hi) [lo, hi] = [hi, lo];
        const dec = /\./.test(String(ra)) || /\./.test(String(rb)) || !Number.isInteger(lo) || !Number.isInteger(hi);
        return dec ? lo + Math.random() * (hi - lo) : lo + Math.floor(Math.random() * (hi - lo + 1));
      }
      case 'op_gt': return compare(ev(sp, a.A), ev(sp, a.B)) > 0;
      case 'op_lt': return compare(ev(sp, a.A), ev(sp, a.B)) < 0;
      case 'op_eq': return compare(ev(sp, a.A), ev(sp, a.B)) === 0;
      case 'op_and': return toBool(ev(sp, a.A)) && toBool(ev(sp, a.B));
      case 'op_or': return toBool(ev(sp, a.A)) || toBool(ev(sp, a.B));
      case 'op_not': return !toBool(ev(sp, a.A));
      case 'op_join': return s('A') + s('B');
      case 'op_letter': { const str = s('S'); const i = Math.floor(n('N')) - 1; return Array.from(str)[i] ?? ''; }
      case 'op_length': return Array.from(s('S')).length;
      case 'op_mod': { const x = n('A'); const y = n('B'); return y === 0 ? NaN : ((x % y) + y) % y; }
      case 'op_idiv': { const y = n('B'); return y === 0 ? (n('A') >= 0 ? Infinity : -Infinity) : Math.floor(n('A') / y); }
      case 'op_round': return Math.round(n('A'));
      case 'op_math': {
        const x = n('A');
        const f = { abs: Math.abs(x), sqrt: Math.sqrt(x), floor: Math.floor(x), ceil: Math.ceil(x), sin: Math.sin((x * Math.PI) / 180), cos: Math.cos((x * Math.PI) / 180) }[a.FN];
        return f === undefined ? 0 : Math.round(f * 1e10) / 1e10;
      }
      case 'va_get': return getVar(a.VAR);
      default: return '';
    }
  }

  /* ---------- statements ---------- */
  function setBubble(sp, type, text) {
    const r = rtOf(sp);
    r.bubble = text === '' || text === null ? null : { type, text: formatValue(text) };
    markRedraw();
    return r.bubble;
  }
  function* waitSecs(secs) {
    const end = now + Math.max(0, secs) * 1000;
    yield TICK;
    while (now < end) yield TICK;
  }
  function* runStack(sp, blocks) {
    for (const b of blocks || []) yield* exec(sp, b);
  }
  function* exec(sp, b) {
    const a = b.args || {};
    const n = (k) => toNum(ev(sp, a[k]));
    const sv = (k) => ev(sp, a[k]);
    const r = rtOf(sp);
    switch (b.op) {
      case 'ev_flag': case 'ev_key': case 'ev_click': case 'ev_msg': return;
      case 'ev_broadcast': startHats((h) => h.op === 'ev_msg' && h.args.MSG === a.MSG, { restart: true }); return;
      case 'ev_broadcast_wait': {
        const started = startHats((h) => h.op === 'ev_msg' && h.args.MSG === a.MSG, { restart: true });
        yield TICK;
        while (started.some((t) => !t.done)) yield TICK;
        return;
      }
      // motion
      case 'mo_move': { const st = n('STEPS'); const rad = (sp.dir * Math.PI) / 180; moveTo(sp, sp.x + st * Math.sin(rad), sp.y + st * Math.cos(rad)); return; }
      case 'mo_turn_r': setDir(sp, sp.dir + n('DEG')); return;
      case 'mo_turn_l': setDir(sp, sp.dir - n('DEG')); return;
      case 'mo_goto': moveTo(sp, n('X'), n('Y')); return;
      case 'mo_goto_random': moveTo(sp, Math.round(Math.random() * 480 - 240), Math.round(Math.random() * 360 - 180)); return;
      case 'mo_glide': {
        const secs = n('SECS'); const x1 = n('X'); const y1 = n('Y');
        const x0 = sp.x; const y0 = sp.y; const start = now; const dur = secs * 1000;
        if (dur <= 0) { moveTo(sp, x1, y1); return; }
        yield TICK;
        for (;;) {
          const t = (now - start) / dur;
          if (t >= 1) { moveTo(sp, x1, y1); return; }
          moveTo(sp, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
          yield TICK;
        }
      }
      case 'mo_point': setDir(sp, n('DIR')); return;
      case 'mo_point_towards': {
        const p = targetPoint(sp, a.TARGET);
        if (p) { const dx = p.x - sp.x; const dy = p.y - sp.y; if (dx || dy) setDir(sp, 90 - (Math.atan2(dy, dx) * 180) / Math.PI); }
        return;
      }
      case 'mo_change_x': moveTo(sp, sp.x + n('DX'), sp.y); return;
      case 'mo_set_x': moveTo(sp, n('X'), sp.y); return;
      case 'mo_change_y': moveTo(sp, sp.x, sp.y + n('DY')); return;
      case 'mo_set_y': moveTo(sp, sp.x, n('Y')); return;
      case 'mo_bounce': bounce(sp); return;
      case 'mo_rotation': sp.rotationStyle = ['all', 'lr', 'none'].includes(a.STYLE) ? a.STYLE : 'all'; markRedraw(); return;
      // looks
      case 'lo_say': setBubble(sp, 'say', sv('MSG')); return;
      case 'lo_think': setBubble(sp, 'think', sv('MSG')); return;
      case 'lo_say_for': case 'lo_think_for': {
        const bub = setBubble(sp, b.op === 'lo_say_for' ? 'say' : 'think', sv('MSG'));
        yield* waitSecs(n('SECS'));
        if (r.bubble === bub) setBubble(sp, 'say', null);
        return;
      }
      case 'lo_costume': {
        const kind = SPRITE_KINDS[sp.kind] || SPRITE_KINDS.vbot;
        const v = sv('COSTUME');
        const idx = kind.costumes.findIndex((c) => c.name === v);
        if (idx >= 0) sp.costume = idx;
        else if (isNumeric(v)) { const k = kind.costumes.length; sp.costume = ((Math.round(toNum(v)) - 1) % k + k) % k; }
        markRedraw();
        return;
      }
      case 'lo_next_costume': { const k = (SPRITE_KINDS[sp.kind] || SPRITE_KINDS.vbot).costumes.length; sp.costume = ((sp.costume || 0) + 1) % k; markRedraw(); return; }
      case 'lo_backdrop': {
        const v = String(sv('BACKDROP'));
        const id = BACKDROPS[v] ? v : Object.keys(BACKDROPS).find((k) => BACKDROPS[k].name === v);
        if (id) { P().backdrop = id; markRedraw(); }
        return;
      }
      case 'lo_change_size': sp.size = clamp(sp.size + n('N'), 5, 500); markRedraw(); return;
      case 'lo_set_size': sp.size = clamp(n('N'), 5, 500); markRedraw(); return;
      case 'lo_change_effect': case 'lo_set_effect': {
        const k = ['color', 'ghost', 'brightness'].includes(a.EFFECT) ? a.EFFECT : 'color';
        let v = b.op === 'lo_change_effect' ? r.effects[k] + n('N') : n('N');
        if (k === 'ghost') v = clamp(v, 0, 100);
        if (k === 'brightness') v = clamp(v, -100, 100);
        r.effects[k] = v;
        markRedraw();
        return;
      }
      case 'lo_clear_effects': r.effects = { color: 0, ghost: 0, brightness: 0 }; markRedraw(); return;
      case 'lo_show': sp.visible = true; markRedraw(); return;
      case 'lo_hide': sp.visible = false; markRedraw(); return;
      case 'lo_front': { const list = P().sprites; const i = list.indexOf(sp); if (i >= 0) { list.splice(i, 1); list.push(sp); } markRedraw(); return; }
      // sound
      case 'so_note': {
        const note = clamp(n('NOTE'), 0, 130);
        const secs = (Math.max(0, n('BEATS')) * 60) / tempo;
        tone(440 * 2 ** ((note - 69) / 12), secs);
        yield* waitSecs(secs);
        return;
      }
      case 'so_beep': tone(880, 0.14, 'square'); return;
      case 'so_rest': yield* waitSecs((Math.max(0, n('BEATS')) * 60) / tempo); return;
      case 'so_instrument': instrument = ['sine', 'triangle', 'square', 'sawtooth'].includes(a.INST) ? a.INST : 'triangle'; return;
      case 'so_set_tempo': tempo = clamp(n('BPM'), 20, 500); return;
      case 'so_set_volume': volume = clamp(n('N'), 0, 100); return;
      // control
      case 'ct_wait': yield* waitSecs(n('SECS')); return;
      case 'ct_repeat': {
        const times = Math.round(n('TIMES'));
        for (let i = 0; i < times; i++) { yield* runStack(sp, b.stacks?.S1); yield; }
        return;
      }
      case 'ct_forever': for (;;) { yield* runStack(sp, b.stacks?.S1); yield; }
      case 'ct_if': if (toBool(ev(sp, a.COND))) yield* runStack(sp, b.stacks?.S1); return;
      case 'ct_if_else': yield* runStack(sp, toBool(ev(sp, a.COND)) ? b.stacks?.S1 : b.stacks?.S2); return;
      case 'ct_wait_until': while (!toBool(ev(sp, a.COND))) yield TICK; return;
      case 'ct_repeat_until': while (!toBool(ev(sp, a.COND))) { yield* runStack(sp, b.stacks?.S1); yield; } return;
      case 'ct_stop': api.stopAll(); throw STOP;
      // sensing
      case 'se_ask': {
        const q = formatValue(sv('Q'));
        while (asking) yield TICK;
        asking = true;
        try {
          if (sp.visible) setBubble(sp, 'say', q);
          const st = { done: false, value: '' };
          stage.ask(sp.visible ? '' : q).then((v) => { st.done = true; st.value = v; });
          while (!st.done) yield TICK;
          answer = st.value;
          if (sp.visible) setBubble(sp, 'say', null);
          dirty = true;
        } finally { asking = false; }
        return;
      }
      case 'se_reset_timer': timerStart = now; return;
      // variables
      case 'va_set': setVar(a.VAR, sv('VAL')); return;
      case 'va_change': setVar(a.VAR, toNum(getVar(a.VAR)) + n('VAL')); return;
      case 'va_show': case 'va_hide': { const v = varEntry(a.VAR); if (v) { v.monitor = b.op === 'va_show'; dirty = true; onDirty?.('vars'); } return; }
      // pen
      case 'pe_clear': stage.penClear(); markRedraw(); return;
      case 'pe_stamp': stage.stamp(sp); markRedraw(); return;
      case 'pe_down': r.pen.down = true; stage.penDot(sp.x, sp.y, penCss(r.pen), r.pen.size); markRedraw(); return;
      case 'pe_up': r.pen.down = false; return;
      case 'pe_color': Object.assign(r.pen, hexToHsl(a.COLOR)); return;
      case 'pe_change_hue': r.pen.h = (r.pen.h + n('N') * 3.6) % 360; return;
      case 'pe_size': r.pen.size = clamp(n('N'), 1, 200); return;
      case 'pe_change_size': r.pen.size = clamp(r.pen.size + n('N'), 1, 200); return;
      default:
        if (SPECS[b.op] && ['reporter', 'boolean'].includes(SPECS[b.op].shape)) { report(sp, b); return; }
        return;
    }
  }

  /* ---------- threads ---------- */
  function makeThread(sp, script, blocks) {
    const th = { sprite: sp, script, done: false, tickWait: false, gen: null };
    th.gen = runStack(sp, blocks);
    threads.push(th);
    ensureLoop();
    return th;
  }
  function startHats(pred, { restart = false, sprite = null } = {}) {
    const started = [];
    for (const sp of P().sprites) {
      if (sprite && sp !== sprite) continue;
      for (const script of sp.scripts) {
        const hat = script.blocks[0];
        if (!hat || SPECS[hat.op]?.shape !== 'hat' || !pred(hat)) continue;
        const existing = threads.find((t) => t.script === script && !t.done);
        if (existing) { if (!restart) continue; existing.done = true; }
        started.push(makeThread(sp, script, script.blocks.slice(1)));
      }
    }
    return started;
  }
  function step(th) {
    try {
      const res = th.gen.next();
      if (res.done) th.done = true;
      else if (res.value === TICK) th.tickWait = true;
    } catch (err) {
      th.done = true;
      if (err !== STOP && !errorShown) { errorShown = true; onError?.(err); }
    }
  }
  function tick() {
    now = performance.now();
    redraw = false;
    const t0 = now;
    for (;;) {
      let ran = false;
      for (const th of threads.slice()) {
        if (th.done || th.tickWait) continue;
        ran = true;
        step(th);
      }
      if (!ran || redraw || performance.now() - t0 > WORK_MS) break;
    }
    for (const th of threads) th.tickWait = false;
    threads = threads.filter((t) => !t.done);
    emitThreads();
  }
  function emitThreads() {
    const set = new Set(threads.map((t) => t.script));
    const key = threads.map((t) => P().sprites.indexOf(t.sprite) + ':' + t.sprite.scripts.indexOf(t.script)).sort().join(',');
    if (key !== lastRunningKey) { lastRunningKey = key; onThreads?.(set); }
  }

  function frame(ts) {
    rafId = 0;
    if (!active) return;
    if (threads.length && ts - lastTick >= TICK_MS - 2) {
      lastTick = ts;
      tick();
    } else if (!threads.length && lastRunningKey) emitThreads();
    if (dirty) { dirty = false; api.render(); }
    rafId = requestAnimationFrame(frame);
  }
  function ensureLoop() { if (active && !rafId) rafId = requestAnimationFrame(frame); }

  const api = {
    TICK,
    get threads() { return threads; },
    get answer() { return answer; },
    get keys() { return keys; },
    get running() { return threads.length > 0; },
    render() {
      const proj = P();
      stage.render(proj);
      stage.renderMonitors(proj.variables.filter((v) => v.monitor).map((v) => ({ name: v.name, value: v.value })));
    },
    requestRender() { dirty = true; ensureLoop(); },
    setActive(on) {
      active = !!on;
      if (active) { dirty = true; ensureLoop(); } else if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    },
    userGesture,
    greenFlag() {
      userGesture();
      api.stopAll();
      errorShown = false;
      timerStart = performance.now();
      for (const sp of P().sprites) { const r = rtOf(sp); r.effects = { color: 0, ghost: 0, brightness: 0 }; r.bubble = null; r.pen.down = false; }
      startHats((h) => h.op === 'ev_flag');
      dirty = true;
      ensureLoop();
    },
    stopAll() {
      for (const t of threads) t.done = true;
      threads = [];
      stopSounds();
      stage.cancelAsk();
      asking = false;
      for (const sp of P().sprites) if (sp._rt) sp._rt.bubble = null;
      dirty = true;
      emitThreads();
    },
    keyDown(key) {
      if (!key) return;
      keys.add(key);
      startHats((h) => h.op === 'ev_key' && (h.args.KEY === key || h.args.KEY === 'any'));
    },
    keyUp(key) { if (key) keys.delete(key); },
    clearKeys() { keys.clear(); },
    spriteClicked(sp) { userGesture(); startHats((h) => h.op === 'ev_click', { sprite: sp }); },
    /** Toggle-run a script from the editor (click). Reporter scripts return their value. */
    runScript(sp, script) {
      userGesture();
      const first = script.blocks[0];
      if (!first) return null;
      const shape = SPECS[first.op]?.shape;
      if (shape === 'reporter' || shape === 'boolean') {
        try { return { value: report(sp, first) }; } catch { return { value: '' }; }
      }
      const existing = threads.find((t) => t.script === script && !t.done);
      if (existing) { existing.done = true; threads = threads.filter((t) => t !== existing); emitThreads(); dirty = true; return null; }
      makeThread(sp, script, shape === 'hat' ? script.blocks.slice(1) : script.blocks);
      emitThreads();
      return null;
    },
    /** Run a lone palette block once (no thread bookkeeping in the UI). */
    runBlock(sp, block) {
      userGesture();
      const shape = SPECS[block.op]?.shape;
      if (shape === 'reporter' || shape === 'boolean') { try { return { value: report(sp, block) }; } catch { return { value: '' }; } }
      if (shape === 'hat') return null;
      makeThread(sp, null, [block]);
      return null;
    },
    resetPen() { stage.penClear(); dirty = true; },
    resetSpriteState(sp) { delete sp._rt; },
    /** Test/debug view of interpreter state. */
    debug() { return { threads: threads.length, answer, tempo, volume, timer: (performance.now() - timerStart) / 1000, keys: [...keys] }; },
  };
  return api;
}
