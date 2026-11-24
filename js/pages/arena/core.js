// V-Code Edu — Arena: shared helpers for the challenge lobby and match pages.
// Everything here is derived from real data (data/challenges.json + local/cloud progress). No fake numbers.
import { isDone, totalXp } from '../../services/progress.js';

export const RANKS = ['D', 'C', 'B', 'A', 'S', 'BOSS'];
export const RANK_META = {
  D: { label: 'Hạng D', name: 'Tập sự', color: '#9aa3b2' },
  C: { label: 'Hạng C', name: 'Chiến binh', color: '#2de2c0' },
  B: { label: 'Hạng B', name: 'Tinh nhuệ', color: '#4cc3ff' },
  A: { label: 'Hạng A', name: 'Đột kích', color: '#ff8a3d' },
  S: { label: 'Hạng S', name: 'Tối thượng', color: '#ffc44d' },
  BOSS: { label: 'Trùm', name: 'Trùm cuối', color: '#ff4d5e' },
};
export const LANG_LABEL = { python: 'Python', c: 'C', cpp: 'C++' };
export const WORLD_HUE = { 1: '#2de2c0', 2: '#ff8a3d', 3: '#4cc3ff', 4: '#ff4d5e', 5: '#ffc44d' };

/* ---------------------------------------------------------------- fonts */
const FONT_HREF = 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,500;0,600;0,700;0,800;1,700;1,800&family=Chakra+Petch:wght@500;600;700&display=swap&subset=vietnamese';
export function ensureArenaFonts() {
  if (document.querySelector('link[data-arena-fonts]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_HREF;
  link.crossOrigin = 'anonymous';
  link.dataset.arenaFonts = '';
  document.head.appendChild(link);
}

/** Make sure the arena stylesheet(s) are present even if the route config does not list them. Resolves when loaded. */
export function ensureArenaCss(hrefs = ['css/pages/challenges.css']) {
  ensureArenaFonts();
  return Promise.all(hrefs.map((href) => {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return null;
    return new Promise((resolve) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      link.onload = resolve;
      link.onerror = resolve;
      document.head.appendChild(link);
      setTimeout(resolve, 2500);
    });
  }));
}

/* ---------------------------------------------------------------- formatting */
const nf = new Intl.NumberFormat('vi-VN');
export const fmt = (n) => nf.format(Math.round(Number(n) || 0));
export const pad3 = (n) => String(n).padStart(3, '0');
export const cleanTitle = (t) => String(t || '').replace(/^Chặng \d+:\s*/, '');
export function clock(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const two = (x) => String(x).padStart(2, '0');
  return hh ? `${two(hh)}:${two(mm)}:${two(ss)}` : `${two(mm)}:${two(ss)}`;
}

/* ---------------------------------------------------------------- tiers & level (from real XP) */
export const TIERS = [
  { id: 'recruit', name: 'Tân binh', min: 0, color: '#9aa3b2', color2: '#5b6372' },
  { id: 'bronze', name: 'Đồng', min: 300, color: '#e0915a', color2: '#8a4a25' },
  { id: 'silver', name: 'Bạc', min: 1000, color: '#d7dee8', color2: '#7b8798' },
  { id: 'gold', name: 'Vàng', min: 2500, color: '#ffd166', color2: '#b7791f' },
  { id: 'platinum', name: 'Bạch kim', min: 5000, color: '#5ff0d4', color2: '#1d8c7d' },
  { id: 'diamond', name: 'Kim cương', min: 9000, color: '#8fd3ff', color2: '#4f6bff' },
  { id: 'legend', name: 'Huyền thoại', min: 15000, color: '#ff6b78', color2: '#ffb347' },
];
const ROMAN = ['I', 'II', 'III'];

/** Tier info for an XP amount: { index, tier, next, division, label, pct, toNext } */
export function tierFor(xp) {
  xp = Math.max(0, Number(xp) || 0);
  let index = 0;
  for (let i = 0; i < TIERS.length; i++) if (xp >= TIERS[i].min) index = i;
  const tier = TIERS[index];
  const next = TIERS[index + 1] || null;
  let division = '';
  if (next && index > 0) {
    const span = (next.min - tier.min) / 3;
    division = ROMAN[Math.min(2, Math.floor((xp - tier.min) / span))];
  }
  const pct = next ? (xp - tier.min) / (next.min - tier.min) : 1;
  return { index, tier, next, division, label: division ? `${tier.name} ${division}` : tier.name, pct: Math.min(1, Math.max(0, pct)), toNext: next ? next.min - xp : 0 };
}

/** Level L starts at 50·L·(L−1) XP (L2 = 100, L3 = 300, L5 = 1 000, L10 = 4 500…). */
export const levelStart = (L) => 50 * L * (L - 1);
export function levelFor(xp) {
  xp = Math.max(0, Number(xp) || 0);
  const level = Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * xp) / 100)) / 2));
  const a = levelStart(level);
  const b = levelStart(level + 1);
  return { level, pct: (xp - a) / (b - a), into: xp - a, need: b - a };
}

/* ---------------------------------------------------------------- dates, streaks */
export function dayKey(ts = Date.now()) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function prevDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1, 12).getTime());
}
export function msToMidnight(now = Date.now()) {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - now;
}

/** Streak of consecutive days with at least one completion (lessons or challenges). */
export function streaks(progress) {
  const days = new Set();
  for (const kind of ['lessons', 'challenges']) {
    for (const item of Object.values(progress?.[kind] || {})) if (item?.at) days.add(dayKey(item.at));
  }
  // best streak
  let best = 0;
  for (const d of days) {
    if (days.has(prevDayKey(d))) continue; // not a run start
    let len = 0;
    let k = d;
    while (days.has(k)) {
      len += 1;
      const [y, m, dd] = k.split('-').map(Number);
      k = dayKey(new Date(y, m - 1, dd + 1, 12).getTime());
    }
    best = Math.max(best, len);
  }
  // current streak: ends today, or yesterday (still alive until midnight)
  let cur = 0;
  let k = dayKey();
  if (!days.has(k)) k = prevDayKey(k);
  while (days.has(k)) { cur += 1; k = prevDayKey(k); }
  return { current: cur, best, activeToday: days.has(dayKey()) };
}

/* ---------------------------------------------------------------- stats */
export function computeStats(data, progress) {
  const list = data.challenges;
  const solved = list.filter((c) => isDone(progress, 'challenges', c.id));
  const solvedSet = new Set(solved.map((c) => c.id));
  const byWorld = data.worlds.map((w) => {
    const items = list.filter((c) => c.world === w.id);
    const done = items.filter((c) => solvedSet.has(c.id)).length;
    return { world: w, total: items.length, done, xp: items.reduce((s, c) => s + c.xp, 0) };
  });
  const byRank = Object.fromEntries(RANKS.map((r) => [r, { total: list.filter((c) => c.rank === r).length, done: solved.filter((c) => c.rank === r).length }]));
  const byLang = Object.fromEntries(Object.keys(LANG_LABEL).map((l) => [l, solved.filter((c) => c.lang === l).length]));
  const bosses = list.filter((c) => c.boss || c.rank === 'BOSS');
  const xp = totalXp(progress);
  const challengeXp = solved.reduce((s, c) => s + (Number(progress.challenges[c.id]?.xp) || 0), 0);
  return {
    total: list.length,
    solved: solved.length,
    solvedSet,
    bosses: bosses.length,
    bossesDone: bosses.filter((c) => solvedSet.has(c.id)).length,
    byWorld, byRank, byLang,
    xp, challengeXp,
    streak: streaks(progress),
    nextUp: list.find((c) => !solvedSet.has(c.id)) || null,
  };
}

/* ---------------------------------------------------------------- daily challenge */
function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const DAILY_KEY = 'vc-arena-daily';
/** Deterministic pick for today among unsolved challenges; remembered for the whole day once chosen. */
export function dailyChallenge(data, progress, owner = 'guest') {
  const today = dayKey();
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(DAILY_KEY) || 'null'); } catch { saved = null; }
  if (saved && saved.date === today && saved.owner === owner) {
    const c = data.challenges.find((x) => x.id === saved.id);
    if (c) return c;
  }
  const pool = data.challenges.filter((c) => !isDone(progress, 'challenges', c.id));
  const from = pool.length ? pool : data.challenges;
  const c = from[hash(`${today}|vcode-arena`) % from.length];
  try { localStorage.setItem(DAILY_KEY, JSON.stringify({ date: today, owner, id: c.id })); } catch { /* storage off */ }
  return c;
}

/* ---------------------------------------------------------------- achievements */
export function achievements(stats) {
  const ranksTried = RANKS.filter((r) => stats.byRank[r].done > 0).length;
  const langs = Object.values(stats.byLang).filter((n) => n > 0).length;
  const worldsCleared = stats.byWorld.filter((w) => w.total && w.done === w.total).length;
  const bestWorld = Math.max(0, ...stats.byWorld.map((w) => w.done));
  const best = stats.streak.best;
  const A = (id, name, desc, glyph, value, goal, tone = 'red') => ({ id, name, desc, glyph, value: Math.min(value, goal), goal, done: value >= goal, tone });
  return [
    A('first', 'Khai hỏa', 'Hạ trận đầu tiên', 'bolt', stats.solved, 1, 'teal'),
    A('s10', 'Chiến binh', 'Hạ 10 trận', '10', stats.solved, 10, 'teal'),
    A('s25', 'Lão luyện', 'Hạ 25 trận', '25', stats.solved, 25, 'cyan'),
    A('s50', 'Nửa chặng', 'Hạ 50 trận', '50', stats.solved, 50, 'ember'),
    A('s100', 'Bất bại', 'Hạ toàn bộ 100 trận', '100', stats.solved, 100, 'gold'),
    A('boss1', 'Diệt Trùm', 'Hạ gục một Trùm cuối', 'crown', stats.bossesDone, 1, 'red'),
    A('boss5', 'Thợ săn Trùm', `Hạ cả ${stats.bosses} Trùm cuối`, 'skull', stats.bossesDone, stats.bosses, 'gold'),
    A('world', 'Chinh phục', 'Hoàn thành trọn một bản đồ', 'flag', worldsCleared ? 20 : bestWorld, 20, 'ember'),
    A('ranks', 'Toàn năng', 'Hạ ít nhất một trận ở mỗi hạng D → Trùm', 'ranks', ranksTried, RANKS.length, 'cyan'),
    A('poly', 'Đa ngôn ngữ', 'Hạ trận bằng Python, C và C++', 'code', langs, 3, 'teal'),
    A('elite', 'Tinh anh', 'Hạ 5 trận hạng S', 'star', stats.byRank.S.done, 5, 'gold'),
    A('streak3', 'Bền bỉ', 'Chuỗi 3 ngày luyện tập liên tiếp', 'flame', best, 3, 'ember'),
    A('streak7', 'Không ngơi nghỉ', 'Chuỗi 7 ngày luyện tập liên tiếp', 'flame2', best, 7, 'red'),
  ];
}

/* ---------------------------------------------------------------- seeded RNG for generated art */
export function rng(seed) {
  let a = hash(String(seed)) || 1;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Pause CSS loops while an element is off-screen or the tab is hidden (adds .is-idle). */
export function idleWhenHidden(el, signal) {
  let visible = true;
  const apply = () => el.classList.toggle('is-idle', !visible || document.hidden);
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => { visible = entries[0]?.isIntersecting ?? true; apply(); }, { threshold: 0 });
    io.observe(el);
    signal?.addEventListener('abort', () => io.disconnect());
  }
  document.addEventListener('visibilitychange', apply, { signal });
  apply();
}
