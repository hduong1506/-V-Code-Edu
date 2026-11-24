// V-Code Edu — per-course visual identity for the Learning section:
// gradient, banner title/subtitle, emblem and an original inline SVG illustration.
// Mapped by course id; unknown ids fall back to a palette chosen from the course accent.
import { h, raw } from '../../core/dom.js';

const MONO = 'JetBrains Mono, ui-monospace, Consolas, monospace';
const SANS = 'Be Vietnam Pro, system-ui, sans-serif';

/* ------------------------------------------------------------------ illustrations
   All drawings use a 160×120 viewBox and only solid fills (no <defs> ids), so the
   same artwork can appear several times on one page without id collisions. */
const ART = {
  // Stylised snake coiling out of a code editor, with braces.
  python: `
    <circle cx="116" cy="64" r="48" fill="#fff" opacity=".10"/>
    <g data-layer="back" transform="rotate(-7 50 56)">
      <rect x="8" y="20" width="82" height="64" rx="11" fill="#064e3b" fill-opacity=".38" stroke="#fff" stroke-opacity=".38"/>
      <circle cx="20" cy="31" r="2.8" fill="#fca5a5"/><circle cx="28.5" cy="31" r="2.8" fill="#fde68a"/><circle cx="37" cy="31" r="2.8" fill="#bbf7d0"/>
      <text x="16" y="54" font-family="${MONO}" font-size="11" font-weight="800" fill="#fde68a">def</text>
      <rect x="42" y="46.5" width="38" height="6" rx="3" fill="#fff" fill-opacity=".75"/>
      <rect x="24" y="61" width="48" height="6" rx="3" fill="#fff" fill-opacity=".45"/>
      <rect x="24" y="73" width="28" height="6" rx="3" fill="#a7f3d0" fill-opacity=".9"/>
    </g>
    <g data-layer="front">
      <path d="M148 116 C148 94 108 98 108 77 C108 56 148 61 148 40 C148 25 133 17 121 22" fill="none" stroke="#064e3b" stroke-opacity=".35" stroke-width="16" stroke-linecap="round" transform="translate(2 4)"/>
      <path d="M148 116 C148 94 108 98 108 77 C108 56 148 61 148 40 C148 25 133 17 121 22" fill="none" stroke="#fde047" stroke-width="15" stroke-linecap="round"/>
      <path d="M148 116 C148 94 108 98 108 77 C108 56 148 61 148 40 C148 25 133 17 121 22" fill="none" stroke="#f59e0b" stroke-width="15" stroke-dasharray="5 11" stroke-opacity=".55"/>
      <ellipse cx="116" cy="24" rx="13.5" ry="10.5" fill="#fde047"/>
      <circle cx="112.5" cy="20.5" r="3.4" fill="#fff"/><circle cx="111.8" cy="20.8" r="1.8" fill="#0f172a"/>
      <path d="M103 27 l-8 2.4 M103 27 l-7.4 -3.2" stroke="#f43f5e" stroke-width="2.2" stroke-linecap="round"/>
      <text x="60" y="112" font-family="${MONO}" font-size="22" font-weight="800" fill="#fff" fill-opacity=".9">{ }</text>
    </g>`,

  // Lotus with a gold star and a Vietnamese-keyword speech bubble.
  pyvn: `
    <circle cx="112" cy="70" r="46" fill="#fff" opacity=".10"/>
    <g data-layer="back">
      <rect x="4" y="14" width="98" height="32" rx="12" fill="#0c4a6e" fill-opacity=".42" stroke="#fff" stroke-opacity=".4"/>
      <path d="M26 45 l-4 11 l13 -11z" fill="#0c4a6e" fill-opacity=".42"/>
      <text x="53" y="34.5" text-anchor="middle" font-family="${MONO}" font-size="9.6" font-weight="700" fill="#fff">in_ra(<tspan fill="#fde68a">"Chào"</tspan>)</text>
      <g transform="translate(-10 12)">
        <circle cx="140" cy="24" r="14" fill="#ef4444"/>
        <path d="M140 14.5 l2.6 7.6 h8 l-6.5 4.8 l2.5 7.7 l-6.6 -4.8 l-6.6 4.8 l2.5 -7.7 l-6.5 -4.8 h8z" fill="#fde047"/>
      </g>
    </g>
    <g data-layer="front">
      <ellipse cx="108" cy="106" rx="44" ry="7" fill="#0c4a6e" fill-opacity=".35"/>
      <path d="M108 102 C84 100 66 88 62 72 C80 72 98 82 108 102Z" fill="#fbcfe8"/>
      <path d="M108 102 C132 100 150 88 154 72 C136 72 118 82 108 102Z" fill="#fbcfe8"/>
      <path d="M108 102 C90 92 84 72 92 54 C104 64 110 84 108 102Z" fill="#f9a8d4"/>
      <path d="M108 102 C126 92 132 72 124 54 C112 64 106 84 108 102Z" fill="#f9a8d4"/>
      <path d="M108 102 C98 86 98 64 108 46 C118 64 118 86 108 102Z" fill="#fff"/>
      <path d="M108 98 C104 86 104 70 108 58" stroke="#f472b6" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <text x="10" y="92" font-family="${SANS}" font-size="20" font-weight="800" fill="#fff" fill-opacity=".92">nếu</text>
      <text x="22" y="112" font-family="${MONO}" font-size="10" font-weight="700" fill="#bae6fd">→ if</text>
    </g>`,

  // Browser window with a layout, a tag bubble, a cursor and colour swatches.
  web: `
    <circle cx="96" cy="58" r="50" fill="#fff" opacity=".10"/>
    <g data-layer="back">
      <rect x="36" y="14" width="114" height="84" rx="11" fill="#fff" fill-opacity=".95"/>
      <path d="M36 25 a11 11 0 0 1 11 -11 h92 a11 11 0 0 1 11 11 v5 h-114z" fill="#ffedd5"/>
      <circle cx="46" cy="22" r="2.6" fill="#f87171"/><circle cx="54" cy="22" r="2.6" fill="#fbbf24"/><circle cx="62" cy="22" r="2.6" fill="#34d399"/>
      <rect x="72" y="18.5" width="64" height="7" rx="3.5" fill="#fff"/>
      <rect x="44" y="38" width="98" height="20" rx="5" fill="#fb923c"/>
      <rect x="50" y="44" width="40" height="4" rx="2" fill="#fff"/><rect x="50" y="51" width="26" height="3" rx="1.5" fill="#fff" fill-opacity=".7"/>
      <rect x="44" y="64" width="30" height="26" rx="5" fill="#fed7aa"/>
      <rect x="78" y="64" width="30" height="26" rx="5" fill="#fde68a"/>
      <rect x="112" y="64" width="30" height="26" rx="5" fill="#bfdbfe"/>
    </g>
    <g data-layer="front">
      <rect x="6" y="64" width="54" height="36" rx="11" fill="#7c2d12" fill-opacity=".78"/>
      <text x="33" y="88" text-anchor="middle" font-family="${MONO}" font-size="17" font-weight="800" fill="#fff">&lt;/&gt;</text>
      <path d="M124 76 l0 26 l7 -6.5 l5 10.5 l5 -2.4 l-5 -10.2 l9.5 -0.6z" fill="#1f2937" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>
      <circle cx="16" cy="22" r="6" fill="#fde047"/><circle cx="16" cy="38" r="6" fill="#fff" fill-opacity=".85"/><circle cx="16" cy="54" r="6" fill="#7c2d12" fill-opacity=".55"/>
    </g>`,

  // Micro-chip with a "C" die, circuit traces and a gear.
  c: `
    <circle cx="96" cy="58" r="50" fill="#fff" opacity=".10"/>
    <g data-layer="back" stroke="#fff" stroke-opacity=".55" stroke-width="2" fill="none" stroke-linecap="round">
      <path d="M58 36 H38 V18"/><path d="M58 52 H22"/><path d="M122 40 H140 V20"/><path d="M122 70 H152"/><path d="M80 92 V112"/><path d="M104 92 V104 H128"/>
      <g fill="#fde047" stroke="none"><circle cx="38" cy="18" r="3.4"/><circle cx="22" cy="52" r="3.4"/><circle cx="140" cy="20" r="3.4"/><circle cx="152" cy="70" r="3.4"/><circle cx="128" cy="104" r="3.4"/></g>
    </g>
    <g data-layer="front">
      <circle cx="30" cy="92" r="15" fill="none" stroke="#bfdbfe" stroke-opacity=".75" stroke-width="8" stroke-dasharray="5.5 4.3"/>
      <circle cx="30" cy="92" r="9" fill="#1e3a8a" fill-opacity=".55" stroke="#bfdbfe" stroke-width="2.4"/>
      <g fill="#dbeafe">
        <rect x="64" y="18" width="5" height="10" rx="2"/><rect x="76" y="18" width="5" height="10" rx="2"/><rect x="88" y="18" width="5" height="10" rx="2"/><rect x="100" y="18" width="5" height="10" rx="2"/><rect x="112" y="18" width="5" height="10" rx="2"/>
        <rect x="64" y="86" width="5" height="10" rx="2"/><rect x="76" y="86" width="5" height="10" rx="2"/><rect x="88" y="86" width="5" height="10" rx="2"/><rect x="100" y="86" width="5" height="10" rx="2"/><rect x="112" y="86" width="5" height="10" rx="2"/>
      </g>
      <rect x="56" y="26" width="68" height="62" rx="11" fill="#1e3a8a" fill-opacity=".72" stroke="#fff" stroke-opacity=".7" stroke-width="1.6"/>
      <rect x="68" y="36" width="44" height="42" rx="7" fill="#fff"/>
      <text x="90" y="68" text-anchor="middle" font-family="${SANS}" font-size="30" font-weight="900" fill="#1d4ed8">C</text>
      <circle cx="64" cy="34" r="2.2" fill="#fde047"/>
    </g>`,

  // Tree / graph with a highlighted path and a lightning bolt.
  cpp: `
    <circle cx="90" cy="62" r="50" fill="#fff" opacity=".10"/>
    <g data-layer="back" stroke-linecap="round">
      <g stroke="#fff" stroke-opacity=".55" stroke-width="3">
        <path d="M66 24 L94 54"/><path d="M42 54 L26 88"/><path d="M94 54 L80 88"/><path d="M94 54 L108 88"/>
      </g>
      <g stroke="#fde047" stroke-width="4"><path d="M66 24 L42 54"/><path d="M42 54 L58 88"/></g>
      <g fill="#fff"><circle cx="94" cy="54" r="9"/><circle cx="26" cy="88" r="8"/><circle cx="80" cy="88" r="8"/><circle cx="108" cy="88" r="8"/></g>
      <g fill="#fde047"><circle cx="66" cy="24" r="10"/><circle cx="42" cy="54" r="9"/><circle cx="58" cy="88" r="8"/></g>
      <g font-family="${MONO}" font-size="9" font-weight="800" text-anchor="middle" fill="#4c1d95"><text x="66" y="27.5">1</text><text x="42" y="57.5">2</text><text x="94" y="57.5">3</text><text x="58" y="91.5">5</text></g>
    </g>
    <g data-layer="front">
      <path d="M138 8 L112 62 H128 L116 114 L154 50 H136 L148 8Z" fill="#3b0764" fill-opacity=".35" transform="translate(3 4)"/>
      <path d="M138 8 L112 62 H128 L116 114 L154 50 H136 L148 8Z" fill="#fde047" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>
      <text x="8" y="116" font-family="${MONO}" font-size="16" font-weight="800" fill="#fff" fill-opacity=".85">O(n)</text>
    </g>`,

  // Neural network with glowing activations and a sparkle.
  ai: `
    <circle cx="86" cy="60" r="52" fill="#fff" opacity=".10"/>
    <g data-layer="back" stroke="#fff" stroke-opacity=".32" stroke-width="1.6">
      <path d="M26 30 L76 18 M26 30 L76 46 M26 30 L76 74 M26 30 L76 102 M26 60 L76 18 M26 60 L76 46 M26 60 L76 74 M26 60 L76 102 M26 90 L76 18 M26 90 L76 46 M26 90 L76 74 M26 90 L76 102"/>
      <path d="M76 18 L126 44 M76 46 L126 44 M76 74 L126 44 M76 102 L126 44 M76 18 L126 80 M76 46 L126 80 M76 74 L126 80 M76 102 L126 80"/>
    </g>
    <g data-layer="front">
      <path d="M26 60 L76 46 L126 44" stroke="#fde047" stroke-width="3.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      <g fill="#fff"><circle cx="26" cy="30" r="8"/><circle cx="26" cy="90" r="8"/><circle cx="76" cy="18" r="8"/><circle cx="76" cy="74" r="8"/><circle cx="76" cy="102" r="8"/><circle cx="126" cy="80" r="9"/></g>
      <g fill="#fde047" stroke="#fff" stroke-width="2"><circle cx="26" cy="60" r="8.5"/><circle cx="76" cy="46" r="8.5"/><circle cx="126" cy="44" r="10"/></g>
      <path d="M146 92 q2 9 10 11 q-8 2 -10 11 q-2 -9 -10 -11 q8 -2 10 -11z" fill="#fff"/>
      <path d="M144 12 q1.4 6 7 7.4 q-5.6 1.4 -7 7.4 q-1.4 -6 -7 -7.4 q5.6 -1.4 7 -7.4z" fill="#fde047"/>
    </g>`,

  // Generic fallback: code brackets with blocks.
  fallback: `
    <circle cx="96" cy="60" r="50" fill="#fff" opacity=".10"/>
    <g data-layer="back">
      <rect x="40" y="22" width="100" height="72" rx="12" fill="#0f172a" fill-opacity=".3" stroke="#fff" stroke-opacity=".4"/>
      <rect x="52" y="38" width="46" height="6" rx="3" fill="#fff" fill-opacity=".75"/>
      <rect x="60" y="52" width="60" height="6" rx="3" fill="#fde68a"/>
      <rect x="60" y="66" width="34" height="6" rx="3" fill="#fff" fill-opacity=".5"/>
    </g>
    <g data-layer="front">
      <text x="14" y="106" font-family="${MONO}" font-size="30" font-weight="800" fill="#fff">&lt;/&gt;</text>
    </g>`,
};

/* ------------------------------------------------------------------ identities */
const THEMES = {
  python: { from: '#059669', to: '#10b981', deep: '#065f46', ink: '#047857', inkDark: '#34d399', banner: 'Python', sub: 'for Beginners', emblem: 'Py' },
  pyvn: { from: '#0284c7', to: '#0ea5e9', deep: '#075985', ink: '#0369a1', inkDark: '#38bdf8', banner: 'Python VN', sub: 'Tư duy lập trình', emblem: 'VN' },
  web: { from: '#ea580c', to: '#f97316', deep: '#9a3412', ink: '#c2410c', inkDark: '#fb923c', banner: 'HTML & CSS', sub: 'Web Frontend', emblem: '</>' },
  c: { from: '#2563eb', to: '#3b82f6', deep: '#1e3a8a', ink: '#1d4ed8', inkDark: '#60a5fa', banner: 'Ngôn ngữ C', sub: 'Core CS', emblem: 'C' },
  cpp: { from: '#4f46e5', to: '#7c3aed', deep: '#3b0764', ink: '#6d28d9', inkDark: '#a78bfa', banner: 'C++ Pro', sub: 'Thuật toán · HSG', emblem: 'C++' },
  ai: { from: '#c026d3', to: '#ec4899', deep: '#831843', ink: '#be185d', inkDark: '#f472b6', banner: 'AI & Data', sub: 'Khoa học dữ liệu', emblem: 'AI' },
};

// Fallback palettes keyed by the course "accent" field in index.json.
const ACCENT_THEMES = {
  green: THEMES.python, blue: THEMES.c, cyan: THEMES.pyvn, rose: THEMES.ai, amber: THEMES.web, violet: THEMES.cpp,
};

/** Visual identity for a course (works for unknown ids). */
export function courseTheme(course = {}) {
  const base = THEMES[course.id] || ACCENT_THEMES[course.accent] || THEMES.c;
  const known = Boolean(THEMES[course.id]);
  const title = String(course.title || 'Khóa học');
  return {
    ...base,
    id: course.id,
    banner: known ? base.banner : title.split(/[:—-]/)[0].trim(),
    sub: known ? base.sub : (course.level || 'V-Code Edu'),
    emblem: known ? base.emblem : title.replace(/[^A-Za-zÀ-ỹ0-9+]/g, '').slice(0, 2).toUpperCase() || '</>',
    art: known ? course.id : 'fallback',
  };
}

/** CSS custom properties that paint an element in the course colours. */
export function themeVars(theme) {
  return { '--c-from': theme.from, '--c-to': theme.to, '--c-deep': theme.deep, '--c-ink': theme.ink, '--c-ink-dark': theme.inkDark };
}

/** Inline SVG illustration (trusted, generated here). */
export function courseArt(theme, className = '') {
  const body = ART[theme.art] || ART.fallback;
  return h('span', { class: `lx-art ${className}`.trim(), 'aria-hidden': 'true' },
    raw(`<svg viewBox="0 0 160 120" width="160" height="120" focusable="false" xmlns="http://www.w3.org/2000/svg">${body}</svg>`));
}

/** Small square emblem in the course gradient. */
export function courseEmblem(theme, className = '') {
  return h('span', { class: `lx-emblem ${className}`.trim(), style: themeVars(theme), 'aria-hidden': 'true' }, theme.emblem);
}

/* ------------------------------------------------------------------ track identities (learning path) */
export const TRACK_STYLE = {
  programming: { icon: 'code', course: 'python' },
  web: { icon: 'globe', course: 'web' },
  algorithms: { icon: 'git-branch', course: 'cpp' },
  ai: { icon: 'brain', course: 'ai' },
  'ml-dl': { icon: 'layers' },
  'data-science': { icon: 'bars' },
  cybersecurity: { icon: 'shield' },
  'robotics-iot': { icon: 'cpu' },
  automation: { icon: 'zap' },
};
