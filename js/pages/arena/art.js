// V-Code Edu — Arena: original generated SVG art (rank emblems, tier emblems, medals, map art, hero skyline).
// All shapes are drawn here procedurally; no external images or third-party assets.
import { raw } from '../../core/dom.js';
import { RANK_META, TIERS, WORLD_HUE, rng } from './core.js';

const svg = (vb, body, cls = '', extra = '') => `<svg class="${cls}" viewBox="${vb}" aria-hidden="true" focusable="false" ${extra}>${body}</svg>`;

/* ---------------------------------------------------------------- difficulty rank emblems (D … BOSS) */
const CHEV = (y) => `<path d="M9 ${y}l7 -4.2 7 4.2" />`;
const RANK_GLYPH = {
  D: CHEV(19),
  C: CHEV(16) + CHEV(21.5),
  B: CHEV(13.5) + CHEV(18.5) + CHEV(23.5),
  A: '<path d="M16 8.5l5.5 6.5-5.5 6.5-5.5-6.5z"/><path d="M10 24.5l6-3.4 6 3.4"/>',
  S: '<path d="M16 7.5l2.3 6.2 6.2 2.3-6.2 2.3-2.3 6.2-2.3-6.2-6.2-2.3 6.2-2.3z" fill="currentColor" stroke="none"/>',
  BOSS: '<path d="M8.5 21.5l-1-10 5 4 3.5-6.5 3.5 6.5 5-4-1 10z" fill="currentColor" stroke="none"/><path d="M9 24.5h14" />',
};
export function rankEmblem(rank, { size = 28, cls = '' } = {}) {
  const meta = RANK_META[rank] || RANK_META.D;
  const c = meta.color;
  const shape = rank === 'BOSS'
    ? '<path d="M16 1.5l13 6v10.5c0 6.6-5.6 11.2-13 13-7.4-1.8-13-6.4-13-13V7.5z"/>'
    : '<path d="M16 1.8l12.6 7.3v13.8L16 30.2 3.4 22.9V9.1z"/>';
  return raw(svg('0 0 32 32', `
    <g fill="${c}" fill-opacity="0.14" stroke="${c}" stroke-width="1.6" stroke-linejoin="round">${shape}</g>
    <g fill="none" stroke="${c}" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter" style="color:${c}">${RANK_GLYPH[rank] || ''}</g>`,
  `ar-rank-emblem ${cls}`, `width="${size}" height="${size}" data-rank="${rank}"`));
}

/* ---------------------------------------------------------------- player tier emblems */
const TIER_GLYPH = [
  '<path d="M48 64h24" stroke-width="6"/>',
  '<path d="M44 66l16-10 16 10" stroke-width="6"/>',
  '<path d="M44 60l16-10 16 10M44 72l16-10 16 10" stroke-width="5.5"/>',
  '<path d="M44 56l16-10 16 10M44 67l16-10 16 10M44 78l16-10 16 10" stroke-width="5"/>',
  '<path d="M60 42l16 18-16 18-16-18z" stroke-width="5"/><path d="M60 52l7 8-7 8-7-8z" fill="currentColor" stroke="none"/>',
  '<path d="M46 52h28l8 10-22 22-22-22z" stroke-width="4.5"/><path d="M46 52l14 32 14-32M38 62h44" stroke-width="3"/>',
  '<path d="M60 38l6.2 15.4 16.6 1.2-12.7 10.7 4 16.2L60 72.6l-14.1 8.9 4-16.2-12.7-10.7 16.6-1.2z" fill="currentColor" stroke="none"/>',
];
export function tierEmblem(index, { size = 96, cls = '' } = {}) {
  const t = TIERS[Math.max(0, Math.min(TIERS.length - 1, index))];
  const id = `ar-tier-${t.id}`;
  const wings = index >= 4 ? `
    <g fill="url(#${id}-g)" opacity="0.9">
      <path d="M22 44L4 36l8 18-6 4 14 6z"/><path d="M98 44l18-8-8 18 6 4-14 6z"/>
      ${index >= 6 ? '<path d="M24 70L8 74l12 8-2 6 12-4z"/><path d="M96 70l16 4-12 8 2 6-12-4z"/>' : ''}
    </g>` : '';
  const crown = index >= 5 ? `<path d="M46 18l6 8 8-12 8 12 6-8-2 12H48z" fill="url(#${id}-g)"/>` : '';
  const pips = Array.from({ length: Math.min(index, 3) }, (_, i) => `<rect x="${52 + i * 6 - (Math.min(index, 3) - 1) * 3 + 3}" y="100" width="3.5" height="7" fill="${t.color}"/>`).join('');
  return raw(svg('0 0 120 120', `
    <defs>
      <linearGradient id="${id}-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.color}"/><stop offset="1" stop-color="${t.color2}"/></linearGradient>
      <linearGradient id="${id}-d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d222d"/><stop offset="1" stop-color="#0b0d12"/></linearGradient>
    </defs>
    ${wings}${crown}
    <path d="M60 22l34 14v30c0 18-15 30-34 36-19-6-34-18-34-36V36z" fill="url(#${id}-g)"/>
    <path d="M60 29l27 11.5v25c0 14.5-12 24.4-27 29.4-15-5-27-14.9-27-29.4v-25z" fill="url(#${id}-d)"/>
    <path d="M60 29l27 11.5v4L60 33 33 44.5v-4z" fill="${t.color}" opacity="0.35"/>
    <g fill="none" stroke="${t.color}" stroke-linecap="square" stroke-linejoin="miter" style="color:${t.color}">${TIER_GLYPH[index] || TIER_GLYPH[0]}</g>
    ${pips}`,
  `ar-tier-emblem ${cls}`, `width="${size}" height="${size}" data-tier="${t.id}"`));
}

/* ---------------------------------------------------------------- achievement medals */
const TONES = { red: '#ff4d5e', ember: '#ff8a3d', teal: '#2de2c0', cyan: '#4cc3ff', gold: '#ffc44d' };
const MEDAL_GLYPH = {
  bolt: '<path d="M35 14L22 35h9l-3 15 14-22h-9z" fill="currentColor" stroke="none"/>',
  crown: '<path d="M19 40l-2-16 8 6 7-11 7 11 8-6-2 16z" fill="currentColor" stroke="none"/><path d="M20 45h24"/>',
  skull: '<path d="M32 15c-9 0-14 6-14 13 0 5 2 7 4 9v6h20v-6c2-2 4-4 4-9 0-7-5-13-14-13z"/><circle cx="26.5" cy="29" r="3" fill="currentColor"/><circle cx="37.5" cy="29" r="3" fill="currentColor"/><path d="M28 43v4M32 43v4M36 43v4"/>',
  flag: '<path d="M22 49V15M22 16h20l-5 7 5 7H22"/>',
  ranks: '<path d="M20 26l12-7 12 7M20 34l12-7 12 7M20 42l12-7 12 7"/>',
  code: '<path d="M25 22l-9 10 9 10M39 22l9 10-9 10M35 18l-6 28"/>',
  star: '<path d="M32 14l4.6 11.6 12.4.9-9.5 8 3 12.1L32 40l-10.5 6.6 3-12.1-9.5-8 12.4-.9z" fill="currentColor" stroke="none"/>',
  flame: '<path d="M32 13c2 8 11 11 11 22a11 11 0 0 1-22 0c0-6 3-9 6-12 0 5 2 7 4 7 0-6-2-10 1-17z" fill="currentColor" stroke="none"/>',
  flame2: '<path d="M32 12c2 8 12 11 12 23a12 12 0 0 1-24 0c0-6 3-10 6-13 0 5 2 8 4 8 0-6-2-11 2-18z"/><path d="M32 30c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 3-5 5-10z" fill="currentColor" stroke="none"/>',
};
export function medal(a, { size = 56 } = {}) {
  const c = TONES[a.tone] || TONES.red;
  const glyph = MEDAL_GLYPH[a.glyph]
    || `<text x="32" y="${a.glyph.length > 2 ? 37.5 : 39}" text-anchor="middle" font-family="Barlow Condensed, Chakra Petch, sans-serif" font-weight="800" font-size="${a.glyph.length > 2 ? 17 : 21}" fill="currentColor" stroke="none">${a.glyph}</text>`;
  return raw(svg('0 0 64 64', `
    <path d="M32 2l26 15v30L32 62 6 47V17z" fill="${c}" fill-opacity="0.12" stroke="${c}" stroke-width="2"/>
    <path d="M32 8l21 12v24L32 56 11 44V20z" fill="#0d1016" stroke="${c}" stroke-opacity="0.45" stroke-width="1"/>
    <g fill="none" stroke="${c}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color:${c}">${glyph}</g>`,
  'ar-medal-svg', `width="${size}" height="${size}"`));
}

/* ---------------------------------------------------------------- world (map) art */
function contours(r, hue, w = 400, hgt = 220) {
  let out = '';
  for (let i = 0; i < 7; i++) {
    const y = 30 + i * 28 + r() * 10;
    const a = 8 + r() * 18;
    let d = `M-10 ${y.toFixed(1)}`;
    for (let x = 0; x <= w + 40; x += 40) d += ` Q${x + 20} ${(y + (r() - 0.5) * a * 2).toFixed(1)} ${x + 40} ${(y + (r() - 0.5) * a).toFixed(1)}`;
    out += `<path d="${d}" fill="none" stroke="${hue}" stroke-opacity="${0.05 + r() * 0.06}" stroke-width="1"/>`;
  }
  return out;
}

const WORLD_SCENE = {
  // 1 — launch runway in perspective toward a rising sun
  1: (hue, r) => {
    let lines = '';
    for (let i = -6; i <= 6; i++) lines += `<line x1="200" y1="120" x2="${200 + i * 70}" y2="230" stroke="${hue}" stroke-opacity="${0.12 + (6 - Math.abs(i)) * 0.02}"/>`;
    for (let k = 0; k < 6; k++) { const y = 124 + k * k * 3.4; lines += `<line x1="0" y1="${y}" x2="400" y2="${y}" stroke="${hue}" stroke-opacity="0.12"/>`; }
    let dash = '';
    for (let k = 0; k < 5; k++) { const y = 130 + k * k * 4.2; const hgt2 = 3 + k * 2; dash += `<rect x="${199 - k * 0.6}" y="${y}" width="${2 + k * 1.2}" height="${hgt2}" fill="${hue}" opacity="0.8"/>`; }
    return `<circle cx="200" cy="120" r="46" fill="url(#SUN)"/>
      ${[0, 1, 2, 3].map((i) => `<rect x="150" y="${104 + i * 5}" width="100" height="${1.5 + i * 0.6}" fill="#0c0f15"/>`).join('')}
      <rect x="0" y="120" width="400" height="110" fill="#0a0c11" fill-opacity="0.75"/>${lines}${dash}
      <path d="M186 96l14-30 14 30-14-7z" fill="${hue}" opacity="${0.75 + r() * 0.1}"/>`;
  },
  // 2 — branching decision paths (if / elif / else)
  2: (hue) => {
    const node = (x, y, big) => `<rect x="${x - (big ? 7 : 5)}" y="${y - (big ? 7 : 5)}" width="${big ? 14 : 10}" height="${big ? 14 : 10}" transform="rotate(45 ${x} ${y})" fill="#0c0f15" stroke="${hue}" stroke-width="2"/>`;
    return `<g fill="none" stroke="${hue}" stroke-width="2.5" stroke-linecap="square">
        <path d="M30 170H120L170 110H250L300 60H380" stroke-opacity="0.95"/>
        <path d="M120 170L170 170 210 150H290L330 120H380" stroke-opacity="0.5"/>
        <path d="M170 110L210 80H260" stroke-opacity="0.35"/>
        <path d="M210 150L240 190H380" stroke-opacity="0.3"/>
      </g>
      ${node(120, 170, true)}${node(170, 110)}${node(210, 150)}${node(300, 60, true)}${node(330, 120)}${node(210, 80)}
      <text x="128" y="160" font-family="Chakra Petch, monospace" font-size="11" font-weight="700" fill="${hue}" opacity="0.8">if</text>
      <text x="216" y="141" font-family="Chakra Petch, monospace" font-size="11" font-weight="700" fill="${hue}" opacity="0.6">elif</text>
      <text x="246" y="182" font-family="Chakra Petch, monospace" font-size="11" font-weight="700" fill="${hue}" opacity="0.5">else</text>`;
  },
  // 3 — loops: orbit rings around a core
  3: (hue, r) => {
    let rings = '';
    for (let i = 0; i < 5; i++) {
      const rx = 40 + i * 30;
      rings += `<ellipse cx="250" cy="110" rx="${rx}" ry="${rx * 0.42}" fill="none" stroke="${hue}" stroke-opacity="${0.55 - i * 0.08}" stroke-width="${i === 1 ? 2.5 : 1.3}" stroke-dasharray="${i % 2 ? '4 6' : 'none'}" transform="rotate(-14 250 110)"/>`;
      const ang = r() * Math.PI * 2;
      rings += `<circle cx="${(250 + Math.cos(ang) * rx).toFixed(1)}" cy="${(110 + Math.sin(ang) * rx * 0.42 - Math.cos(ang) * rx * 0.24).toFixed(1)}" r="${3 + (i % 2)}" fill="${hue}"/>`;
    }
    return `${rings}<circle cx="250" cy="110" r="18" fill="#0c0f15" stroke="${hue}" stroke-width="2.5"/><circle cx="250" cy="110" r="7" fill="${hue}"/>
      <path d="M244 104l12 6-12 6z" fill="#0c0f15"/>`;
  },
  // 4 — C fortress with towers and gate
  4: (hue) => `
      <path d="M0 190l60-26 40 12 70-30 60 22 80-28 90 30v60H0z" fill="#0a0c11"/>
      <g fill="#10131a" stroke="${hue}" stroke-width="2" stroke-linejoin="miter">
        <path d="M90 196V120h14v-10h10v10h12v-10h10v10h14v86z"/>
        <path d="M150 196V138h120v58z"/>
        <path d="M262 196V96h16v-12h10v12h12v-12h10v12h16v100z"/>
      </g>
      <path d="M150 138v-10h12v10h12v-10h12v10h12v-10h12v10h12v-10h12v10h12v-10h12v10" fill="none" stroke="${hue}" stroke-width="2"/>
      <path d="M194 196v-28a16 16 0 0 1 32 0v28" fill="#07080b" stroke="${hue}" stroke-width="2"/>
      <g fill="${hue}"><rect x="110" y="140" width="6" height="12"/><rect x="290" y="116" width="6" height="12"/><rect x="290" y="146" width="6" height="12"/></g>
      <text x="203" y="160" font-family="Chakra Petch, monospace" font-size="16" font-weight="700" fill="${hue}">C</text>`,
  // 5 — summit graph: mountain peaks with BFS nodes
  5: (hue) => {
    const pts = [[60, 168], [120, 118], [170, 140], [230, 64], [290, 110], [340, 86]];
    const edges = [[0, 1], [1, 2], [1, 3], [2, 3], [3, 4], [4, 5], [3, 5]];
    return `<path d="M0 220L60 168 120 118 170 140 230 64 290 110 340 86 400 140V220z" fill="#0a0c11"/>
      <path d="M0 220L60 168 120 118 170 140 230 64 290 110 340 86 400 140" fill="none" stroke="${hue}" stroke-opacity="0.35" stroke-width="1.5"/>
      <path d="M230 64l-18 20 10-2 8 10 8-10 10 2z" fill="${hue}" opacity="0.25"/>
      ${edges.map(([a, b]) => `<line x1="${pts[a][0]}" y1="${pts[a][1]}" x2="${pts[b][0]}" y2="${pts[b][1]}" stroke="${hue}" stroke-width="2" stroke-opacity="0.85"/>`).join('')}
      ${pts.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i === 3 ? 9 : 6}" fill="#0c0f15" stroke="${hue}" stroke-width="2.5"/>`).join('')}
      <circle cx="230" cy="64" r="3.5" fill="${hue}"/>
      <path d="M230 55V30l18 6-18 6" fill="none" stroke="${hue}" stroke-width="2"/>`;
  },
};

export function worldArt(world) {
  const hue = WORLD_HUE[world.id] || '#ff4d5e';
  const r = rng(`world-${world.id}`);
  const scene = (WORLD_SCENE[world.id] || WORLD_SCENE[1])(hue, r);
  const gid = `ar-w${world.id}`;
  return raw(svg('0 0 400 220', `
    <defs>
      <linearGradient id="${gid}-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#171b24"/><stop offset="1" stop-color="#0b0d12"/></linearGradient>
      <radialGradient id="${gid}-glow" cx="0.62" cy="0.42" r="0.6"><stop offset="0" stop-color="${hue}" stop-opacity="0.32"/><stop offset="1" stop-color="${hue}" stop-opacity="0"/></radialGradient>
      <radialGradient id="SUN-${world.id}" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="${hue}" stop-opacity="0.95"/><stop offset="1" stop-color="${hue}" stop-opacity="0.15"/></radialGradient>
    </defs>
    <rect width="400" height="220" fill="url(#${gid}-bg)"/>
    <rect width="400" height="220" fill="url(#${gid}-glow)"/>
    ${contours(r, hue)}
    <g class="ar-map__scene">${scene.replace(/url\(#SUN\)/g, `url(#SUN-${world.id})`)}</g>
    <text x="388" y="212" text-anchor="end" font-family="Barlow Condensed, sans-serif" font-weight="800" font-size="120" fill="${hue}" fill-opacity="0.06">0${world.id}</text>`,
  'ar-map__art', 'preserveAspectRatio="xMidYMid slice"'));
}

/* ---------------------------------------------------------------- hero skyline layers */
function skyline(r, { count, minH, maxH, base, fill, rim, windows = 0, antennas = 0, W = 1600 }) {
  let x = -20;
  let shapes = '';
  let lights = '';
  let ants = '';
  const spans = [];
  while (x < W + 20) {
    const w = 34 + r() * 90;
    const hgt = minH + r() * (maxH - minH);
    const top = base - hgt;
    const kind = r();
    let d;
    if (kind < 0.22) d = `M${x} ${base}V${top + 18}L${x + w * 0.5} ${top}L${x + w} ${top + 18}V${base}z`;
    else if (kind < 0.4) d = `M${x} ${base}V${top}H${x + w * 0.62}L${x + w} ${top + w * 0.38}V${base}z`;
    else if (kind < 0.55) d = `M${x} ${base}V${top + 10}H${x + w * 0.3}V${top}H${x + w * 0.7}V${top + 10}H${x + w}V${base}z`;
    else d = `M${x} ${base}V${top}H${x + w}V${base}z`;
    shapes += `<path d="${d}"/>`;
    spans.push([x, w, top]);
    if (windows) {
      const cols = Math.max(1, Math.floor(w / 12));
      const rows = Math.floor((hgt - 24) / 14);
      for (let cx = 0; cx < cols; cx++) for (let ry = 0; ry < rows; ry++) {
        if (r() < windows) lights += `<rect x="${(x + 6 + cx * 12).toFixed(1)}" y="${(top + 18 + ry * 14).toFixed(1)}" width="5" height="3"/>`;
      }
    }
    x += w + (r() < 0.3 ? r() * 14 : 0);
  }
  for (let i = 0; i < antennas; i++) {
    const [ax, aw, at] = spans[Math.floor(r() * spans.length)];
    const cx = ax + aw / 2;
    const hh = 26 + r() * 50;
    ants += `<line x1="${cx.toFixed(1)}" y1="${at}" x2="${cx.toFixed(1)}" y2="${(at - hh).toFixed(1)}" stroke="${fill}" stroke-width="3"/><circle class="ar-blink" style="animation-delay:${(r() * 3).toFixed(2)}s" cx="${cx.toFixed(1)}" cy="${(at - hh).toFixed(1)}" r="3" fill="#ff4d5e"/>`;
  }
  void count;
  return { shapes: `<g fill="${fill}" stroke="${rim}" stroke-width="1">${shapes}</g>`, lights, ants };
}

export function heroLayers() {
  const r = rng('arena-hero');
  const far = skyline(r, { minH: 90, maxH: 240, base: 520, fill: '#161a24', rim: 'rgba(255,77,94,0.18)' });
  const mid = skyline(r, { minH: 120, maxH: 330, base: 540, fill: '#0e1118', rim: 'rgba(255,138,61,0.22)', windows: 0.16, antennas: 7 });
  // perspective floor
  let floor = '';
  for (let i = -14; i <= 14; i++) floor += `<line x1="800" y1="520" x2="${800 + i * 140}" y2="760" />`;
  for (let k = 1; k < 8; k++) { const y = 520 + k * k * 4.2; floor += `<line x1="0" y1="${y}" x2="1600" y2="${y}" />`; }
  // radar ring (rotating) — tick marks
  let ticks = '';
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r1 = 250;
    const r2 = i % 6 === 0 ? 232 : 242;
    ticks += `<line x1="${(Math.cos(a) * r1).toFixed(1)}" y1="${(Math.sin(a) * r1).toFixed(1)}" x2="${(Math.cos(a) * r2).toFixed(1)}" y2="${(Math.sin(a) * r2).toFixed(1)}"/>`;
  }
  const back = svg('0 0 1600 640', `
    <defs>
      <radialGradient id="ar-hero-sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ff4d5e" stop-opacity="0.55"/><stop offset="0.55" stop-color="#ff8a3d" stop-opacity="0.16"/><stop offset="1" stop-color="#ff8a3d" stop-opacity="0"/></radialGradient>
    </defs>
    <circle cx="1120" cy="330" r="330" fill="url(#ar-hero-sun)"/>
    <g transform="translate(1120 330)">
      <g class="ar-spin" fill="none" stroke="#ff4d5e" stroke-opacity="0.32" stroke-width="2">${ticks}</g>
      <g class="ar-spin ar-spin--rev" fill="none" stroke="#ffffff" stroke-opacity="0.12">
        <circle r="200" stroke-dasharray="2 10"/><path d="M-170 0a170 170 0 0 1 170-170" stroke="#ff8a3d" stroke-opacity="0.5" stroke-width="3"/>
        <path d="M170 0a170 170 0 0 1-170 170" stroke="#2de2c0" stroke-opacity="0.35" stroke-width="3"/>
      </g>
      <circle r="290" fill="none" stroke="#ffffff" stroke-opacity="0.05"/>
      <path d="M0 -120l104 60v120L0 120l-104-60v-120z" fill="none" stroke="#ff4d5e" stroke-opacity="0.22" stroke-width="2"/>
    </g>`, 'ar-hero__layer ar-hero__layer--back', 'preserveAspectRatio="xMidYMax slice"');
  const farSvg = svg('0 0 1600 640', far.shapes, 'ar-hero__layer ar-hero__layer--far', 'preserveAspectRatio="xMidYMax slice"');
  const midSvg = svg('0 0 1600 640', `
    <g stroke="#ff4d5e" stroke-opacity="0.14" stroke-width="1">${floor}</g>
    ${mid.shapes}${mid.ants}
    <g fill="#ffb37a" opacity="0.55">${mid.lights}</g>`, 'ar-hero__layer ar-hero__layer--mid', 'preserveAspectRatio="xMidYMax slice"');
  const nearSvg = svg('0 0 1600 640', `
    <defs><pattern id="ar-hero-stripes" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="14" fill="#ff4d5e" fill-opacity="0.5"/></pattern></defs>
    <path d="M0 640V586L180 566 240 590H560L600 606H1040L1090 584H1380L1440 560 1600 548V640z" fill="#06070a"/>
    <path d="M0 586L180 566 240 590H560L600 606H1040L1090 584H1380L1440 560 1600 548" fill="none" stroke="#ff4d5e" stroke-opacity="0.55" stroke-width="2"/>
    <path d="M250 597H545L560 606H264z" fill="url(#ar-hero-stripes)"/>
    <path d="M1100 592H1370L1356 600H1090z" fill="url(#ar-hero-stripes)"/>
    <path d="M60 640L120 600H150L90 640z M110 640L170 600H200L140 640z" fill="#ff4d5e" fill-opacity="0.22"/>`, 'ar-hero__layer ar-hero__layer--near', 'preserveAspectRatio="xMidYMax slice"');
  return raw(back + farSvg + midSvg + nearSvg);
}

/* ---------------------------------------------------------------- small local icons */
export const glyph = {
  crosshair: () => raw('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/></svg>'),
  swords: () => raw('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 17.5L3 6V3h3l11.5 11.5M13 19l6-6M16 16l4 4M19 21l2-2M9.5 17.5L21 6V3h-3L6.5 14.5M11 19l-6-6M8 16l-4 4M5 21l-2-2"/></svg>'),
  medal: () => raw('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2l3 7M17 2l-3 7"/><circle cx="12" cy="15" r="6"/><path d="M12 12l1 2h2l-1.5 1.5.5 2-2-1-2 1 .5-2L9 14h2z" fill="currentColor"/></svg>'),
  map: () => raw('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/></svg>'),
  skull: () => raw('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c-4.4 0-7 3-7 6.5 0 2.4 1 3.6 2 4.5V17h10v-3c1-.9 2-2.1 2-4.5C19 6 16.4 3 12 3z"/><circle cx="9.5" cy="10" r="1.4" fill="currentColor"/><circle cx="14.5" cy="10" r="1.4" fill="currentColor"/><path d="M10 17v3M14 17v3"/></svg>'),
  hidden: () => raw('<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'),
};
