// V-Code Edu — classroom artwork: deterministic class banners (seeded by class code) and original
// spot illustrations for empty states / landing. All SVG is generated from numbers and fixed strings
// (never user text), so it is safe to inject with raw().
import { h, raw } from '../../core/dom.js';

let uidCounter = 0;
const nextId = (p) => `${p}${(++uidCounter).toString(36)}`;

/** FNV-1a string hash → 32-bit int. */
export function hashString(str) {
  let h1 = 0x811c9dc5;
  for (const ch of String(str || '')) { h1 ^= ch.codePointAt(0); h1 = Math.imul(h1, 0x01000193); }
  return h1 >>> 0;
}

/** Small deterministic PRNG (mulberry32). */
export function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Deep, professional palettes: [from, to, accent]
const PALETTES = [
  ['#0b1a3a', '#1f5eff', '#8fb0ff'],
  ['#0a1730', '#0e6e8c', '#6fd6f0'],
  ['#14123d', '#4b44d6', '#b1abff'],
  ['#0b1d24', '#0f7a66', '#6ee7c8'],
  ['#0f1c3f', '#2f6df6', '#ffd27a'],
  ['#111827', '#334a72', '#9fb3d9'],
  ['#1d0f3d', '#6a3fd6', '#d4c2ff'],
  ['#062238', '#0b65a8', '#9ad7ff'],
];

export function classTheme(code) {
  const seed = hashString(code);
  const pal = PALETTES[seed % PALETTES.length];
  return { seed, from: pal[0], to: pal[1], accent: pal[2], pattern: (seed >>> 5) % 6 };
}

/** Banner SVG markup for a class code. */
export function bannerSVG(code, { w = 640, h: hh = 200 } = {}) {
  const t = classTheme(code);
  const r = prng(t.seed);
  const gid = nextId('crg');
  const pid = nextId('crp');
  let shapes = '';
  const A = t.accent;
  switch (t.pattern) {
    case 0: { // orbits
      const cx = w * (0.62 + r() * 0.25); const cy = hh * (0.2 + r() * 0.6);
      for (let i = 1; i <= 7; i++) shapes += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${(i * 34).toFixed(1)}" fill="none" stroke="${A}" stroke-opacity="${(0.34 - i * 0.035).toFixed(2)}" stroke-width="1.5"/>`;
      shapes += `<circle cx="${(cx + 68).toFixed(1)}" cy="${(cy - 22).toFixed(1)}" r="7" fill="${A}" fill-opacity=".9"/><circle cx="${(cx - 102).toFixed(1)}" cy="${(cy + 40).toFixed(1)}" r="4" fill="#fff" fill-opacity=".8"/>`;
      break;
    }
    case 1: { // dot grid with highlighted cells
      shapes += `<pattern id="${pid}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.6" fill="${A}" fill-opacity=".35"/></pattern><rect x="${w * 0.35}" width="${w * 0.65}" height="${hh}" fill="url(#${pid})"/>`;
      for (let i = 0; i < 6; i++) { const x = w * 0.45 + Math.floor(r() * 18) * 22; const y = Math.floor(r() * 8) * 22; shapes += `<rect x="${x - 7}" y="${y - 7}" width="18" height="18" rx="5" fill="${A}" fill-opacity="${(0.25 + r() * 0.5).toFixed(2)}"/>`; }
      break;
    }
    case 2: { // waves
      for (let i = 0; i < 6; i++) {
        const y = hh * (0.3 + i * 0.12); const amp = 14 + r() * 18; const ph = r() * w;
        let d = `M0 ${y.toFixed(1)}`;
        for (let x = 0; x <= w; x += 20) d += ` L${x} ${(y + Math.sin((x + ph) / 70) * amp).toFixed(1)}`;
        shapes += `<path d="${d}" fill="none" stroke="${A}" stroke-opacity="${(0.12 + i * 0.05).toFixed(2)}" stroke-width="2"/>`;
      }
      break;
    }
    case 3: { // code brackets + blocks
      for (let i = 0; i < 9; i++) {
        const x = w * (0.42 + r() * 0.55); const y = hh * r(); const bw = 30 + r() * 90;
        shapes += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="8" rx="4" fill="${i % 3 ? A : '#fff'}" fill-opacity="${(0.18 + r() * 0.35).toFixed(2)}"/>`;
      }
      const bx = w * 0.8; const by = hh * 0.5;
      shapes += `<path d="M${bx - 40} ${by - 34} l-26 34 l26 34 M${bx + 40} ${by - 34} l26 34 l-26 34 M${bx + 12} ${by - 40} l-24 80" fill="none" stroke="${A}" stroke-opacity=".55" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
      break;
    }
    case 4: { // diagonal bands
      for (let i = 0; i < 7; i++) {
        const x = w * 0.3 + i * 58 + r() * 20;
        shapes += `<path d="M${x.toFixed(1)} ${hh + 20} L${(x + 160).toFixed(1)} -20" stroke="${A}" stroke-opacity="${(0.08 + r() * 0.22).toFixed(2)}" stroke-width="${(10 + r() * 22).toFixed(1)}" stroke-linecap="round"/>`;
      }
      break;
    }
    default: { // triangles / graph nodes
      const pts = Array.from({ length: 9 }, () => [w * (0.4 + r() * 0.58), hh * (0.08 + r() * 0.84)]);
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
        const dx = pts[i][0] - pts[j][0]; const dy = pts[i][1] - pts[j][1];
        if (Math.hypot(dx, dy) < 150) shapes += `<line x1="${pts[i][0].toFixed(1)}" y1="${pts[i][1].toFixed(1)}" x2="${pts[j][0].toFixed(1)}" y2="${pts[j][1].toFixed(1)}" stroke="${A}" stroke-opacity=".3" stroke-width="1.5"/>`;
      }
      pts.forEach(([x, y], i) => { shapes += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${i % 4 ? 4 : 7}" fill="${i % 4 ? A : '#fff'}" fill-opacity=".85"/>`; });
    }
  }
  return `<svg class="cr-banner-svg" viewBox="0 0 ${w} ${hh}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
<defs><linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.from}"/><stop offset="1" stop-color="${t.to}"/></linearGradient>
<linearGradient id="${gid}s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".6" stop-color="#000" stop-opacity="0"/></linearGradient></defs>
<rect width="${w}" height="${hh}" fill="url(#${gid})"/>${shapes}
<rect width="${w}" height="${hh}" fill="url(#${gid}s)"/></svg>`;
}

/** Banner element (div wrapping the SVG). */
export function banner(code, className = '') {
  return h('div', { class: `cr-banner ${className}`.trim() }, raw(bannerSVG(code)));
}

/** Small square class "logo" derived from the banner palette. */
export function classMark(code, name = '') {
  const t = classTheme(code);
  const letter = (String(name || code).trim()[0] || '#').toUpperCase();
  return h('span', { class: 'cr-mark', style: { background: `linear-gradient(135deg, ${t.from}, ${t.to})`, '--mark-accent': t.accent }, 'aria-hidden': 'true' }, letter);
}

// ---------------------------------------------------------------------------
// Spot illustrations. Colours come from CSS classes (.i-*), so they follow the theme.
const ILLOS = {
  classes: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="146" rx="86" ry="8"/>
<rect class="i-surf i-stroke" x="34" y="34" width="132" height="92" rx="12"/><rect class="i-blue" x="34" y="34" width="132" height="34" rx="12"/><rect class="i-blue" x="34" y="56" width="132" height="12"/>
<circle class="i-accent" cx="146" cy="50" r="7"/><rect class="i-line" x="48" y="82" width="70" height="7" rx="3.5"/><rect class="i-line2" x="48" y="96" width="98" height="6" rx="3"/><rect class="i-line2" x="48" y="108" width="54" height="6" rx="3"/>
<rect class="i-surf i-stroke" x="120" y="66" width="96" height="70" rx="12"/><rect class="i-navy" x="120" y="66" width="96" height="24" rx="12"/><rect class="i-navy" x="120" y="80" width="96" height="10"/>
<rect class="i-line" x="132" y="100" width="52" height="6" rx="3"/><rect class="i-line2" x="132" y="112" width="70" height="6" rx="3"/>
<circle class="i-green" cx="206" cy="38" r="14"/><path class="i-white-stroke" d="m199 38 5 5 9-10" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  assignments: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="148" rx="80" ry="7"/>
<rect class="i-surf i-stroke" x="70" y="22" width="100" height="120" rx="12"/><rect class="i-navy" x="96" y="14" width="48" height="18" rx="7"/>
<rect class="i-blue-soft" x="84" y="46" width="16" height="16" rx="4"/><path class="i-blue-stroke" d="m87 54 4 4 7-8" fill="none" stroke-width="2.5" stroke-linecap="round"/><rect class="i-line" x="108" y="48" width="48" height="6" rx="3"/><rect class="i-line2" x="108" y="58" width="32" height="5" rx="2.5"/>
<rect class="i-blue-soft" x="84" y="74" width="16" height="16" rx="4"/><rect class="i-line" x="108" y="76" width="44" height="6" rx="3"/><rect class="i-line2" x="108" y="86" width="26" height="5" rx="2.5"/>
<rect class="i-amber-soft" x="84" y="102" width="16" height="16" rx="4"/><rect class="i-line" x="108" y="104" width="50" height="6" rx="3"/><rect class="i-line2" x="108" y="114" width="30" height="5" rx="2.5"/>
<circle class="i-amber" cx="176" cy="44" r="18"/><path class="i-white-stroke" d="M176 34v10l7 5" fill="none" stroke-width="3" stroke-linecap="round"/>
<path class="i-blue" d="m44 70 8-3 3-8 3 8 8 3-8 3-3 8-3-8z"/></svg>`,
  students: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="146" rx="90" ry="8"/>
<circle class="i-blue-soft" cx="70" cy="66" r="20"/><path class="i-blue-soft" d="M38 132c0-20 14-34 32-34s32 14 32 34z"/>
<circle class="i-navy" cx="120" cy="56" r="24"/><path class="i-navy" d="M80 136c0-24 18-40 40-40s40 16 40 40z"/>
<circle class="i-blue-soft" cx="170" cy="66" r="20"/><path class="i-blue-soft" d="M138 132c0-20 14-34 32-34s32 14 32 34z"/>
<circle class="i-surf i-stroke-dash" cx="206" cy="36" r="16"/><path class="i-blue-stroke" d="M206 29v14M199 36h14" stroke-width="3" stroke-linecap="round"/></svg>`,
  discussion: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="146" rx="80" ry="7"/>
<path class="i-surf i-stroke" d="M40 30h108a12 12 0 0 1 12 12v44a12 12 0 0 1-12 12H76l-20 16v-16H40a12 12 0 0 1-12-12V42a12 12 0 0 1 12-12z"/>
<rect class="i-line" x="44" y="48" width="86" height="7" rx="3.5"/><rect class="i-line2" x="44" y="62" width="64" height="6" rx="3"/><rect class="i-line2" x="44" y="74" width="74" height="6" rx="3"/>
<path class="i-blue" d="M200 68H112a12 12 0 0 0-12 12v32a12 12 0 0 0 12 12h60l18 14v-14h10a12 12 0 0 0 12-12V80a12 12 0 0 0-12-12z"/>
<circle class="i-white" cx="134" cy="96" r="5"/><circle class="i-white" cx="154" cy="96" r="5"/><circle class="i-white" cx="174" cy="96" r="5"/></svg>`,
  inbox: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="146" rx="84" ry="8"/>
<path class="i-surf i-stroke" d="M52 84 72 40h96l20 44v42a10 10 0 0 1-10 10H62a10 10 0 0 1-10-10z"/>
<path class="i-blue-soft" d="M52 84h40l8 16h40l8-16h40v42a10 10 0 0 1-10 10H62a10 10 0 0 1-10-10z"/>
<rect class="i-line" x="92" y="52" width="56" height="6" rx="3"/><rect class="i-line2" x="98" y="64" width="44" height="5" rx="2.5"/>
<circle class="i-green" cx="186" cy="40" r="15"/><path class="i-white-stroke" d="m179 40 5 5 9-10" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  activity: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="146" rx="84" ry="8"/>
<rect class="i-surf i-stroke" x="36" y="28" width="168" height="104" rx="14"/>
<path class="i-blue-stroke" d="M52 98h26l12-30 18 50 16-40 10 20h54" fill="none" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>
<circle class="i-violet" cx="188" cy="98" r="7"/><rect class="i-line2" x="52" y="42" width="60" height="6" rx="3"/></svg>`,
  grades: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="146" rx="84" ry="8"/>
<rect class="i-surf i-stroke" x="40" y="26" width="160" height="108" rx="12"/>
<rect class="i-line2" x="40" y="26" width="160" height="22" rx="12"/><rect class="i-line2" x="40" y="38" width="160" height="10"/>
${[0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => `<rect class="${(r + c) % 3 === 0 ? 'i-green-soft' : (r + c) % 3 === 1 ? 'i-blue-soft' : 'i-line2'}" x="${56 + c * 36}" y="${58 + r * 24}" width="28" height="16" rx="4"/>`).join('')).join('')}
<circle class="i-blue" cx="196" cy="32" r="15"/><path class="i-white-stroke" d="M189 35l5-7 4 4 5-6" fill="none" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  join: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="146" rx="84" ry="8"/>
<rect class="i-navy" x="58" y="24" width="124" height="112" rx="14"/>
<rect class="i-blue" x="58" y="24" width="124" height="40" rx="14"/><rect class="i-blue" x="58" y="50" width="124" height="14"/>
<rect class="i-white" x="76" y="80" width="88" height="22" rx="6" fill-opacity=".14"/>
<g class="i-white">${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${82 + i * 13.5}" y="86" width="9" height="10" rx="2"/>`).join('')}</g>
<rect class="i-white" x="92" y="112" width="56" height="10" rx="5" fill-opacity=".5"/>
<circle class="i-green" cx="182" cy="28" r="16"/><path class="i-white-stroke" d="M182 20v16M174 28h16" stroke-width="3" stroke-linecap="round"/></svg>`,
  lock: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="146" rx="70" ry="7"/>
<path class="i-stroke-thick" d="M96 70V54a24 24 0 0 1 48 0v16" fill="none"/><rect class="i-navy" x="80" y="68" width="80" height="66" rx="12"/><circle class="i-amber" cx="120" cy="96" r="8"/><rect class="i-amber" x="116" y="100" width="8" height="18" rx="3"/></svg>`,
  offline: `<svg viewBox="0 0 240 160" aria-hidden="true"><ellipse class="i-shadow" cx="120" cy="146" rx="70" ry="7"/>
<path class="i-surf i-stroke" d="M74 112a26 26 0 0 1 4-52 36 36 0 0 1 68-6 28 28 0 0 1 22 58z"/><path class="i-amber-stroke" d="m100 76 40 30M140 76l-40 30" stroke-width="5" stroke-linecap="round"/></svg>`,
};

/** Illustration element; name in ILLOS. */
export function illo(name, className = '') {
  return h('div', { class: `cr-illo ${className}`.trim() }, raw(ILLOS[name] || ILLOS.classes));
}

/** Hero illustration for the signed-out landing page: an abstract classroom dashboard (no data). */
export function heroIllustration() {
  return h('div', { class: 'cr-hero-art' }, raw(`<svg viewBox="0 0 560 440" aria-hidden="true" focusable="false">
<defs>
  <linearGradient id="crh-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1a3a"/><stop offset="1" stop-color="#1f5eff"/></linearGradient>
  <linearGradient id="crh-b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="i-stop-1"/><stop offset="1" class="i-stop-2"/></linearGradient>
</defs>
<circle class="i-blob" cx="300" cy="220" r="200"/>
<g class="cr-float cr-float--1">
  <rect class="i-surf i-stroke i-elev" x="70" y="60" width="400" height="290" rx="18"/>
  <rect fill="url(#crh-a)" x="70" y="60" width="400" height="74" rx="18"/><rect fill="url(#crh-a)" x="70" y="110" width="400" height="24"/>
  <g stroke="#8fb0ff" stroke-opacity=".35" stroke-width="1.5" fill="none"><circle cx="420" cy="80" r="30"/><circle cx="420" cy="80" r="52"/><circle cx="420" cy="80" r="74"/></g>
  <rect x="96" y="84" width="130" height="12" rx="6" fill="#fff" fill-opacity=".92"/><rect x="96" y="104" width="84" height="8" rx="4" fill="#fff" fill-opacity=".5"/>
  <rect class="i-surf2" x="92" y="152" width="110" height="64" rx="12"/><rect class="i-surf2" x="214" y="152" width="110" height="64" rx="12"/><rect class="i-surf2" x="336" y="152" width="112" height="64" rx="12"/>
  <rect class="i-line" x="106" y="166" width="46" height="7" rx="3.5"/><rect class="i-ink" x="106" y="182" width="34" height="18" rx="5"/>
  <rect class="i-line" x="228" y="166" width="46" height="7" rx="3.5"/><rect class="i-green" x="228" y="182" width="44" height="18" rx="5"/>
  <rect class="i-line" x="350" y="166" width="46" height="7" rx="3.5"/><rect class="i-amber" x="350" y="182" width="28" height="18" rx="5"/>
  <rect class="i-surf2" x="92" y="230" width="232" height="100" rx="12"/>
  ${[38, 62, 48, 80, 56, 70, 44, 66].map((v, i) => `<rect class="${i === 3 ? 'i-blue' : 'i-blue-soft'}" x="${108 + i * 26}" y="${316 - v}" width="16" height="${v}" rx="4"/>`).join('')}
  <rect class="i-surf2" x="336" y="230" width="112" height="100" rx="12"/>
  <circle cx="392" cy="280" r="30" fill="none" class="i-ring-bg" stroke-width="12"/>
  <circle cx="392" cy="280" r="30" fill="none" class="i-ring-fg" stroke-width="12" stroke-dasharray="132 189" transform="rotate(-90 392 280)" stroke-linecap="round"/>
</g>
<g class="cr-float cr-float--2">
  <rect class="i-surf i-stroke i-elev" x="16" y="300" width="180" height="120" rx="16"/>
  <rect class="i-code" x="16" y="300" width="180" height="120" rx="16"/>
  <circle cx="36" cy="318" r="4" fill="#ff6b7d"/><circle cx="50" cy="318" r="4" fill="#f4b545"/><circle cx="64" cy="318" r="4" fill="#4cd49a"/>
  <rect x="34" y="336" width="54" height="7" rx="3.5" fill="#c3a6ff"/><rect x="94" y="336" width="62" height="7" rx="3.5" fill="#8fb3ff"/>
  <rect x="46" y="352" width="80" height="7" rx="3.5" fill="#8be3b0"/><rect x="46" y="368" width="40" height="7" rx="3.5" fill="#ffb27a"/><rect x="92" y="368" width="50" height="7" rx="3.5" fill="#dfe4f3" fill-opacity=".6"/>
  <rect x="34" y="384" width="30" height="7" rx="3.5" fill="#c3a6ff"/>
</g>
<g class="cr-float cr-float--3">
  <rect class="i-surf i-stroke i-elev" x="380" y="318" width="164" height="76" rx="16"/>
  <circle class="i-green" cx="414" cy="356" r="16"/><path d="m406 356 6 6 10-12" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <rect class="i-line" x="440" y="342" width="82" height="8" rx="4"/><rect class="i-line2" x="440" y="358" width="56" height="7" rx="3.5"/>
</g>
<g class="cr-float cr-float--4">
  <rect class="i-surf i-stroke i-elev" x="440" y="22" width="104" height="54" rx="14"/>
  <path class="i-violet" d="m466 38 4-10 4 10 10 4-10 4-4 10-4-10-10-4z"/><rect class="i-line" x="490" y="40" width="40" height="7" rx="3.5"/><rect class="i-line2" x="490" y="54" width="26" height="6" rx="3"/>
</g>
</svg>`));
}

/** Role illustrations (teacher / student). */
export function roleArt(role) {
  const teacher = `<svg viewBox="0 0 120 90" aria-hidden="true"><rect class="i-navy" x="10" y="10" width="78" height="50" rx="6"/><rect x="18" y="20" width="40" height="5" rx="2.5" fill="#fff" fill-opacity=".85"/><rect x="18" y="31" width="56" height="4" rx="2" fill="#fff" fill-opacity=".4"/><rect x="18" y="40" width="30" height="4" rx="2" fill="#fff" fill-opacity=".4"/><path d="M60 46l6 6 12-14" fill="none" stroke="#4cd49a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><circle class="i-blue" cx="96" cy="46" r="11"/><path class="i-blue" d="M78 84c0-12 8-20 18-20s18 8 18 20z"/><rect class="i-line" x="40" y="60" width="8" height="22" rx="3"/></svg>`;
  const student = `<svg viewBox="0 0 120 90" aria-hidden="true"><rect class="i-surf i-stroke" x="30" y="16" width="70" height="46" rx="6"/><rect class="i-code" x="34" y="20" width="62" height="38" rx="3"/><rect x="40" y="27" width="22" height="4" rx="2" fill="#c3a6ff"/><rect x="46" y="35" width="32" height="4" rx="2" fill="#8be3b0"/><rect x="46" y="43" width="18" height="4" rx="2" fill="#ffb27a"/><rect class="i-line" x="22" y="62" width="86" height="6" rx="3"/><circle class="i-green" cx="20" cy="40" r="10"/><path class="i-green" d="M4 84c0-11 7-18 16-18s16 7 16 18z"/></svg>`;
  return h('div', { class: 'cr-role-art' }, raw(role === 'teacher' ? teacher : student));
}
