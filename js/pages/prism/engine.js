// V-Prism — frame recorder + player.
// Algorithms record immutable snapshots ("frames"); the player only moves an index → stepping back is exact.

export const MAX_FRAMES = 3000;

/** Deep-ish clone for plain data snapshots. */
export const snap = (v) => (typeof structuredClone === 'function' ? structuredClone(v) : JSON.parse(JSON.stringify(v)));

/** Frame recorder used by algorithm generators. */
export class Recorder {
  constructor() { this.frames = []; }
  /** add(state, line, msg, vars) — state is cloned. */
  add(state, line, msg, vars = {}) {
    if (this.frames.length >= MAX_FRAMES) return;
    this.frames.push({ state: snap(state), line, msg, vars: { ...vars } });
  }
  get length() { return this.frames.length; }
}

/** Playback controller. */
export class Player {
  constructor({ onFrame, onState }) {
    this.frames = [];
    this.index = 0;
    this.playing = false;
    this.speed = 1;
    this.timer = null;
    this.onFrame = onFrame;
    this.onState = onState;
    this.reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  load(frames) {
    this.pause();
    this.frames = frames;
    this.index = 0;
    this.emit();
  }

  emit() {
    if (!this.frames.length) return;
    this.onFrame?.(this.frames[this.index], this.index, this.frames.length);
    this.onState?.(this);
  }

  delay() {
    return Math.max(60, 900 / this.speed);
  }

  tick() {
    if (!this.playing) return;
    if (this.index >= this.frames.length - 1) { this.pause(); return; }
    this.index += 1;
    this.emit();
    this.timer = setTimeout(() => this.tick(), this.delay());
  }

  play() {
    if (!this.frames.length) return;
    if (this.index >= this.frames.length - 1) this.index = 0;
    this.playing = true;
    this.onState?.(this);
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), this.reduced ? 0 : this.delay() / 2);
  }

  pause() {
    this.playing = false;
    clearTimeout(this.timer);
    this.onState?.(this);
  }

  toggle() { if (this.playing) this.pause(); else this.play(); }
  step(delta) { this.pause(); this.seek(this.index + delta); }
  seek(i) {
    if (!this.frames.length) return;
    this.index = Math.max(0, Math.min(this.frames.length - 1, i));
    this.emit();
  }
  restart() { this.pause(); this.seek(0); }
  setSpeed(s) { this.speed = s; if (this.playing) { clearTimeout(this.timer); this.timer = setTimeout(() => this.tick(), this.delay()); } this.onState?.(this); }
  destroy() { this.pause(); }
}

// ---------- input parsing helpers (Vietnamese errors) ----------
export function parseNumberList(str, { min = 1, max = 16, lo = -999, hi = 999, integer = true } = {}) {
  const parts = String(str || '').split(/[\s,;]+/).filter(Boolean);
  if (parts.length < min) return { error: `Cần ít nhất ${min} số.` };
  if (parts.length > max) return { error: `Tối đa ${max} số để hình ảnh dễ theo dõi.` };
  const values = [];
  for (const p of parts) {
    const v = Number(p);
    if (!Number.isFinite(v) || (integer && !Number.isInteger(v))) return { error: `"${p}" không phải ${integer ? 'số nguyên' : 'số'} hợp lệ.` };
    if (v < lo || v > hi) return { error: `Các số phải nằm trong khoảng ${lo}..${hi}.` };
    values.push(v);
  }
  return { value: values };
}

export function parseInteger(str, { lo = -999, hi = 999, label = 'Giá trị' } = {}) {
  const v = Number(String(str ?? '').trim());
  if (String(str ?? '').trim() === '' || !Number.isInteger(v)) return { error: `${label} phải là số nguyên.` };
  if (v < lo || v > hi) return { error: `${label} phải nằm trong khoảng ${lo}..${hi}.` };
  return { value: v };
}

export function randomInts(n, lo = 1, hi = 99) {
  return Array.from({ length: n }, () => lo + Math.floor(Math.random() * (hi - lo + 1)));
}

export function randomDistinct(n, lo = 1, hi = 99) {
  const set = new Set();
  while (set.size < n) set.add(lo + Math.floor(Math.random() * (hi - lo + 1)));
  return [...set];
}
