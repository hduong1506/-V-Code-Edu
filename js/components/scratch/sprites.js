// V-Code Edu — original sprite and backdrop art, drawn entirely in code (canvas paths).
// Every costume is drawn centred on (0, 0) and faces RIGHT (direction 90).

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function fillStroke(ctx, fill, stroke, lw = 2.5) {
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = lw; ctx.strokeStyle = stroke; ctx.stroke(); }
}
function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }

const INK = '#1d2548';

/* ---------------- V-Bot: a friendly robot (brand blue, cyan visor) ---------------- */
function drawVBot(ctx, wave) {
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  // antenna
  ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(0, -42); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  circle(ctx, 0, -45, 5); fillStroke(ctx, wave ? '#ffd23f' : '#45d3f2', INK, 2.5);
  // legs
  rr(ctx, -14, 28, 10, 14, 3); fillStroke(ctx, '#5b6b9a', INK);
  rr(ctx, 4, 28, 10, 14, 3); fillStroke(ctx, '#5b6b9a', INK);
  rr(ctx, -18, 38, 16, 7, 3.5); fillStroke(ctx, '#2f49d1', INK);
  rr(ctx, 2, 38, 16, 7, 3.5); fillStroke(ctx, '#2f49d1', INK);
  // arms
  ctx.lineWidth = 7; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(-22, 8); ctx.lineTo(-30, 22); ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = '#8fa2ff';
  ctx.beginPath(); ctx.moveTo(-22, 8); ctx.lineTo(-30, 22); ctx.stroke();
  circle(ctx, -31, 24, 5); fillStroke(ctx, '#ffd23f', INK, 2.2);
  ctx.lineWidth = 7; ctx.strokeStyle = INK;
  ctx.beginPath(); ctx.moveTo(22, 8); if (wave) ctx.lineTo(34, -10); else ctx.lineTo(30, 22); ctx.stroke();
  ctx.lineWidth = 4; ctx.strokeStyle = '#8fa2ff';
  ctx.beginPath(); ctx.moveTo(22, 8); if (wave) ctx.lineTo(34, -10); else ctx.lineTo(30, 22); ctx.stroke();
  if (wave) { circle(ctx, 35, -13, 5); } else { circle(ctx, 31, 24, 5); }
  fillStroke(ctx, '#ffd23f', INK, 2.2);
  // body
  rr(ctx, -22, 0, 44, 32, 9); fillStroke(ctx, '#3f5ef0', INK, 2.8);
  rr(ctx, -12, 8, 24, 14, 4); fillStroke(ctx, '#e8ebfb', INK, 2);
  circle(ctx, -5, 15, 2.6); fillStroke(ctx, '#e5484d');
  circle(ctx, 3, 15, 2.6); fillStroke(ctx, '#4cd49a');
  // head
  rr(ctx, -27, -32, 54, 34, 12); fillStroke(ctx, '#5a77ff', INK, 2.8);
  rr(ctx, -20, -25, 40, 20, 9); fillStroke(ctx, '#0d1a3a', INK, 2);
  // eyes (look right) & smile
  ctx.fillStyle = '#45d3f2';
  if (wave) {
    ctx.lineWidth = 3; ctx.strokeStyle = '#45d3f2';
    ctx.beginPath(); ctx.arc(-4, -14, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(10, -14, 4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
  } else {
    circle(ctx, -3, -16, 4); ctx.fill();
    circle(ctx, 11, -16, 4); ctx.fill();
  }
  ctx.lineWidth = 2.2; ctx.strokeStyle = '#45d3f2';
  ctx.beginPath(); ctx.arc(4, -11, 5, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
  // ear bolts
  rr(ctx, -31, -20, 6, 10, 2); fillStroke(ctx, '#ffd23f', INK, 2);
  rr(ctx, 25, -20, 6, 10, 2); fillStroke(ctx, '#ffd23f', INK, 2);
}

/* ---------------- Rocket (points right) ---------------- */
function drawRocket(ctx, boost) {
  ctx.lineJoin = 'round';
  // flame
  ctx.beginPath();
  const fl = boost ? 34 : 20;
  ctx.moveTo(-26, -8); ctx.quadraticCurveTo(-26 - fl, -4, -28 - fl, 0); ctx.quadraticCurveTo(-26 - fl, 4, -26, 8); ctx.closePath();
  ctx.fillStyle = '#ff9a1f'; ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-26, -4); ctx.quadraticCurveTo(-24 - fl * 0.6, -2, -26 - fl * 0.6, 0); ctx.quadraticCurveTo(-24 - fl * 0.6, 2, -26, 4); ctx.closePath();
  ctx.fillStyle = '#ffe066'; ctx.fill();
  // fins
  ctx.beginPath(); ctx.moveTo(-14, -12); ctx.lineTo(-30, -26); ctx.lineTo(-24, -10); ctx.closePath(); fillStroke(ctx, '#e5484d', INK, 2.4);
  ctx.beginPath(); ctx.moveTo(-14, 12); ctx.lineTo(-30, 26); ctx.lineTo(-24, 10); ctx.closePath(); fillStroke(ctx, '#e5484d', INK, 2.4);
  // body
  ctx.beginPath();
  ctx.moveTo(-26, -13); ctx.lineTo(14, -13); ctx.quadraticCurveTo(36, -10, 44, 0); ctx.quadraticCurveTo(36, 10, 14, 13); ctx.lineTo(-26, 13); ctx.closePath();
  fillStroke(ctx, '#f2f4fb', INK, 2.6);
  // nose
  ctx.beginPath(); ctx.moveTo(24, -11.2); ctx.quadraticCurveTo(38, -8, 44, 0); ctx.quadraticCurveTo(38, 8, 24, 11.2); ctx.closePath(); fillStroke(ctx, '#e5484d', INK, 2.2);
  // window
  circle(ctx, 4, 0, 7); fillStroke(ctx, '#45d3f2', INK, 2.4);
  circle(ctx, 2, -2, 2.2); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
  // stripe
  ctx.fillStyle = '#3f5ef0'; ctx.fillRect(-20, -12, 5, 24);
}

/* ---------------- Ball ---------------- */
function drawBall(ctx, alt) {
  circle(ctx, 0, 0, 22); fillStroke(ctx, alt ? '#4cd49a' : '#ff7a59', INK, 2.6);
  ctx.save(); circle(ctx, 0, 0, 21); ctx.clip();
  ctx.lineWidth = 5; ctx.strokeStyle = alt ? '#ffffff' : '#ffd23f';
  ctx.beginPath(); ctx.arc(-26, 0, 22, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(26, 0, 22, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  ctx.restore();
  circle(ctx, -8, -9, 5); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
}

/* ---------------- Star ---------------- */
function starPath(ctx, r1, r2, n = 5) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? r2 : r1;
    const a = -Math.PI / 2 + (i * Math.PI) / n;
    const x = Math.cos(a) * r; const y = Math.sin(a) * r;
    if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
  }
  ctx.closePath();
}
function drawStar(ctx, shine) {
  ctx.lineJoin = 'round';
  if (shine) {
    ctx.strokeStyle = '#ffe680'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4 + Math.PI / 8;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * 28, Math.sin(a) * 28); ctx.lineTo(Math.cos(a) * 34, Math.sin(a) * 34); ctx.stroke();
    }
  }
  starPath(ctx, 26, 11); fillStroke(ctx, shine ? '#ffd23f' : '#ffc21a', '#b07800', 2.6);
  starPath(ctx, 15, 6.5); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fill();
  ctx.fillStyle = INK;
  circle(ctx, -4.5, -2, 2.2); ctx.fill(); circle(ctx, 4.5, -2, 2.2); ctx.fill();
  ctx.lineWidth = 1.8; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(0, 2, 3.5, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
}

/* ---------------- Fish (faces right) ---------------- */
function drawFish(ctx, flick) {
  ctx.lineJoin = 'round';
  const t = flick ? 7 : -7;
  // tail
  ctx.beginPath(); ctx.moveTo(-18, 0); ctx.lineTo(-36, -14 + t * 0.4); ctx.quadraticCurveTo(-31, 0, -36, 14 + t * 0.4); ctx.closePath(); fillStroke(ctx, '#ff9a1f', INK, 2.4);
  // fins
  ctx.beginPath(); ctx.moveTo(-4, -14); ctx.quadraticCurveTo(2, -26, 12, -15); ctx.closePath(); fillStroke(ctx, '#ff9a1f', INK, 2.2);
  // body
  ctx.beginPath(); ctx.ellipse(2, 0, 26, 16, 0, 0, Math.PI * 2); fillStroke(ctx, '#ffb31f', INK, 2.6);
  // stripes
  ctx.save(); ctx.beginPath(); ctx.ellipse(2, 0, 25, 15, 0, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-10, -18, 6, 36); ctx.fillRect(6, -18, 5, 36);
  ctx.restore();
  ctx.beginPath(); ctx.ellipse(2, 0, 26, 16, 0, 0, Math.PI * 2); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke();
  // eye
  circle(ctx, 17, -4, 4.5); fillStroke(ctx, '#fff', INK, 2);
  circle(ctx, 18.5, -4, 2); ctx.fillStyle = INK; ctx.fill();
  // mouth
  ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(24, 5, 3, Math.PI * 0.4, Math.PI * 1.1); ctx.stroke();
}

/* ---------------- Turtle (top view, faces right) — great for pen drawing ---------------- */
function drawTurtle(ctx, step) {
  ctx.lineJoin = 'round';
  const a = step ? 5 : -5;
  ctx.fillStyle = '#7ccf6a';
  const legs = [[10, -15 + a * 0.3, 1], [10, 15 - a * 0.3, 1], [-12, -15 - a * 0.3, -1], [-12, 15 + a * 0.3, -1]];
  for (const [x, y] of legs) { ctx.beginPath(); ctx.ellipse(x + (step ? 2 : -2), y + Math.sign(y) * 3, 6, 5, 0, 0, Math.PI * 2); fillStroke(ctx, '#7ccf6a', INK, 2.2); }
  ctx.beginPath(); ctx.moveTo(-20, 0); ctx.lineTo(-28, -3); ctx.lineTo(-28, 3); ctx.closePath(); fillStroke(ctx, '#7ccf6a', INK, 2);
  // head
  ctx.beginPath(); ctx.ellipse(24, 0, 8, 7, 0, 0, Math.PI * 2); fillStroke(ctx, '#7ccf6a', INK, 2.4);
  circle(ctx, 27, -3, 1.6); ctx.fillStyle = INK; ctx.fill(); circle(ctx, 27, 3, 1.6); ctx.fill();
  // shell
  ctx.beginPath(); ctx.ellipse(-1, 0, 20, 17, 0, 0, Math.PI * 2); fillStroke(ctx, '#2e9e5b', INK, 2.6);
  ctx.strokeStyle = '#1d6b3c'; ctx.lineWidth = 1.8;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const an = (i * Math.PI) / 3; const x = -1 + Math.cos(an) * 7; const y = Math.sin(an) * 7; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
  ctx.closePath(); ctx.fillStyle = '#4cbf74'; ctx.fill(); ctx.stroke();
  for (let i = 0; i < 6; i++) { const an = (i * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(-1 + Math.cos(an) * 7, Math.sin(an) * 7); ctx.lineTo(-1 + Math.cos(an) * 17, Math.sin(an) * 14.5); ctx.stroke(); }
}

export const SPRITE_KINDS = {
  vbot: { name: 'V-Bot', costumes: [{ name: 'đứng', w: 76, h: 100, draw: (c) => drawVBot(c, false) }, { name: 'vẫy tay', w: 80, h: 100, draw: (c) => drawVBot(c, true) }] },
  rocket: { name: 'Tên lửa', costumes: [{ name: 'bay', w: 100, h: 60, draw: (c) => drawRocket(c, false) }, { name: 'tăng tốc', w: 120, h: 60, draw: (c) => drawRocket(c, true) }] },
  ball: { name: 'Quả bóng', costumes: [{ name: 'cam', w: 50, h: 50, draw: (c) => drawBall(c, false) }, { name: 'xanh', w: 50, h: 50, draw: (c) => drawBall(c, true) }] },
  star: { name: 'Ngôi sao', costumes: [{ name: 'sao', w: 60, h: 60, draw: (c) => drawStar(c, false) }, { name: 'lấp lánh', w: 74, h: 74, draw: (c) => drawStar(c, true) }] },
  fish: { name: 'Cá vàng', costumes: [{ name: 'bơi 1', w: 80, h: 48, draw: (c) => drawFish(c, false) }, { name: 'bơi 2', w: 80, h: 48, draw: (c) => drawFish(c, true) }] },
  turtle: { name: 'Rùa', costumes: [{ name: 'bò 1', w: 70, h: 52, draw: (c) => drawTurtle(c, false) }, { name: 'bò 2', w: 70, h: 52, draw: (c) => drawTurtle(c, true) }] },
};
export const SPRITE_KIND_ORDER = ['vbot', 'rocket', 'ball', 'star', 'fish', 'turtle'];

/* ---------------- costume cache (2x offscreen canvas + alpha for hit tests) ---------------- */
const RES = 2;
const cache = new Map();
export function costumeImage(kind, idx) {
  const k = SPRITE_KINDS[kind] || SPRITE_KINDS.vbot;
  const c = k.costumes[((idx % k.costumes.length) + k.costumes.length) % k.costumes.length];
  const key = `${kind}:${c.name}`;
  let entry = cache.get(key);
  if (!entry) {
    const pad = 6;
    const w = c.w + pad * 2; const h = c.h + pad * 2;
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * RES); cv.height = Math.ceil(h * RES);
    const ctx = cv.getContext('2d', { willReadFrequently: true });
    ctx.setTransform(RES, 0, 0, RES, (w / 2) * RES, (h / 2) * RES);
    c.draw(ctx);
    let alpha = null;
    try { alpha = ctx.getImageData(0, 0, cv.width, cv.height).data; } catch { alpha = null; }
    entry = { canvas: cv, w, h, res: RES, alpha };
    cache.set(key, entry);
  }
  return entry;
}
/** Is local point (lx, ly) — costume coords centred at 0 — opaque? */
export function costumeHit(entry, lx, ly) {
  const px = Math.floor((lx + entry.w / 2) * entry.res);
  const py = Math.floor((ly + entry.h / 2) * entry.res);
  if (px < 0 || py < 0 || px >= entry.canvas.width || py >= entry.canvas.height) return false;
  if (!entry.alpha) return true;
  return entry.alpha[(py * entry.canvas.width + px) * 4 + 3] > 40;
}

/** Small thumbnail (data URL) for sprite tiles. */
const thumbs = new Map();
export function spriteThumb(kind, idx = 0) {
  const key = `${kind}:${idx}`;
  if (thumbs.has(key)) return thumbs.get(key);
  const e = costumeImage(kind, idx);
  const cv = document.createElement('canvas');
  cv.width = 96; cv.height = 96;
  const ctx = cv.getContext('2d');
  const sc = Math.min(84 / e.w, 84 / e.h);
  ctx.translate(48, 48); ctx.scale(sc, sc);
  ctx.drawImage(e.canvas, -e.w / 2, -e.h / 2, e.w, e.h);
  const url = cv.toDataURL();
  thumbs.set(key, url);
  return url;
}

/* ---------------- backdrops (480 × 360) ---------------- */
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

function bdPlain(ctx) { ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 480, 360); }
function bdGrid(ctx) {
  ctx.fillStyle = '#fbfcff'; ctx.fillRect(0, 0, 480, 360);
  ctx.lineWidth = 1;
  for (let x = 0; x <= 480; x += 20) { ctx.strokeStyle = x % 100 === 40 ? 'rgba(47,73,209,.18)' : 'rgba(47,73,209,.07)'; ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, 360); ctx.stroke(); }
  for (let y = 0; y <= 360; y += 20) { ctx.strokeStyle = (y - 180) % 100 === 0 ? 'rgba(47,73,209,.18)' : 'rgba(47,73,209,.07)'; ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(480, y + 0.5); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(29,37,72,.55)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 180); ctx.lineTo(480, 180); ctx.moveTo(240, 0); ctx.lineTo(240, 360); ctx.stroke();
  ctx.fillStyle = 'rgba(29,37,72,.6)'; ctx.font = '600 10px system-ui, sans-serif';
  for (let x = -200; x <= 200; x += 100) if (x) ctx.fillText(String(x), 240 + x + 3, 192);
  for (let y = -100; y <= 100; y += 100) if (y) ctx.fillText(String(y), 244, 180 - y - 3);
  ctx.fillText('x', 470, 172); ctx.fillText('y', 248, 12);
}
function bdSky(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#6cc4ff'); g.addColorStop(0.75, '#d6f0ff'); g.addColorStop(1, '#eaf7ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 360);
  circle(ctx, 400, 60, 30); ctx.fillStyle = '#ffe680'; ctx.fill();
  const cloud = (x, y, s) => { ctx.fillStyle = 'rgba(255,255,255,.95)'; [[0, 0, 22], [24, -10, 26], [50, 0, 20], [24, 6, 22]].forEach(([dx, dy, r]) => { circle(ctx, x + dx * s, y + dy * s, r * s); ctx.fill(); }); };
  cloud(60, 80, 1); cloud(250, 50, 0.8); cloud(320, 150, 0.6);
  ctx.fillStyle = '#7ccf6a'; ctx.beginPath(); ctx.moveTo(0, 330); ctx.quadraticCurveTo(140, 290, 260, 325); ctx.quadraticCurveTo(380, 300, 480, 320); ctx.lineTo(480, 360); ctx.lineTo(0, 360); ctx.fill();
}
function bdSpace(ctx) {
  const g = ctx.createRadialGradient(240, 180, 40, 240, 180, 360); g.addColorStop(0, '#1b2a6b'); g.addColorStop(1, '#070b22');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 360);
  const r = rng(7);
  for (let i = 0; i < 120; i++) { ctx.fillStyle = `rgba(255,255,255,${0.35 + r() * 0.65})`; circle(ctx, r() * 480, r() * 360, r() * 1.4 + 0.3); ctx.fill(); }
  circle(ctx, 390, 80, 34); ctx.fillStyle = '#a593ff'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,214,120,.85)'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(390, 80, 56, 12, -0.3, 0, Math.PI * 2); ctx.stroke();
  circle(ctx, 70, 300, 50); ctx.fillStyle = '#c9cfe6'; ctx.fill();
  ctx.fillStyle = 'rgba(120,130,170,.5)'; circle(ctx, 55, 285, 10); ctx.fill(); circle(ctx, 90, 310, 7); ctx.fill();
}
function bdOcean(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, 360); g.addColorStop(0, '#45c3e8'); g.addColorStop(1, '#0b5f8f');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 360);
  ctx.fillStyle = '#e9d7a5'; ctx.beginPath(); ctx.moveTo(0, 335); ctx.quadraticCurveTo(240, 315, 480, 338); ctx.lineTo(480, 360); ctx.lineTo(0, 360); ctx.fill();
  ctx.strokeStyle = '#2e9e5b'; ctx.lineWidth = 6; ctx.lineCap = 'round';
  [[40, 0], [70, 1], [420, 2], [445, 3]].forEach(([x, k]) => { ctx.beginPath(); ctx.moveTo(x, 340); ctx.bezierCurveTo(x - 14, 300 - k * 4, x + 14, 280, x - 4, 250 + k * 6); ctx.stroke(); });
  const r = rng(3);
  ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5;
  for (let i = 0; i < 18; i++) { circle(ctx, r() * 480, r() * 300, 2 + r() * 5); ctx.stroke(); }
}
function bdMeadow(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, 220); g.addColorStop(0, '#9fdcff'); g.addColorStop(1, '#e8f7ff');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 480, 360);
  ctx.fillStyle = '#8fd17a'; ctx.beginPath(); ctx.moveTo(0, 230); ctx.quadraticCurveTo(120, 170, 260, 220); ctx.quadraticCurveTo(380, 180, 480, 210); ctx.lineTo(480, 360); ctx.lineTo(0, 360); ctx.fill();
  ctx.fillStyle = '#5fb653'; ctx.beginPath(); ctx.moveTo(0, 290); ctx.quadraticCurveTo(200, 240, 480, 285); ctx.lineTo(480, 360); ctx.lineTo(0, 360); ctx.fill();
  const r = rng(11);
  for (let i = 0; i < 26; i++) { const x = r() * 480; const y = 280 + r() * 75; ctx.fillStyle = ['#fff', '#ffd23f', '#ff7a9a'][i % 3]; circle(ctx, x, y, 3); ctx.fill(); }
}

export const BACKDROPS = {
  plain: { name: 'Trắng', draw: bdPlain },
  grid: { name: 'Lưới tọa độ', draw: bdGrid },
  sky: { name: 'Bầu trời', draw: bdSky },
  space: { name: 'Vũ trụ', draw: bdSpace },
  ocean: { name: 'Đại dương', draw: bdOcean },
  meadow: { name: 'Đồng cỏ', draw: bdMeadow },
};
export const BACKDROP_ORDER = ['plain', 'grid', 'sky', 'space', 'ocean', 'meadow'];

const bdCache = new Map();
export function backdropImage(id) {
  const key = BACKDROPS[id] ? id : 'plain';
  if (!bdCache.has(key)) {
    const cv = document.createElement('canvas');
    cv.width = 960; cv.height = 720;
    const ctx = cv.getContext('2d');
    ctx.scale(2, 2);
    BACKDROPS[key].draw(ctx);
    bdCache.set(key, cv);
  }
  return bdCache.get(key);
}
