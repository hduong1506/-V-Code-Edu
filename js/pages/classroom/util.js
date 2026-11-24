// V-Code Edu — classroom shared helpers: status logic, formatting, avatars, charts, sortable tables.
import { h, s, mount } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { firebaseErrorMessage } from '../../services/firebase.js';
import { toDate, formatDate, formatDateTime, formatScore } from '../../core/format.js';
import { illo, hashString } from './art.js';

export const LANG_OPTIONS = [['python', 'Python'], ['pyvn', 'Python Tiếng Việt'], ['cpp', 'C++'], ['c', 'C'], ['javascript', 'JavaScript']];
export const langLabel = (v) => (LANG_OPTIONS.find((l) => l[0] === v) || [0, v || '—'])[1];
export const errMsg = (err) => (err?.code ? firebaseErrorMessage(err) : err?.message || String(err));
export const DAY = 86400000;
export const ONLINE_WINDOW = 120000;

export const ms = (v) => toDate(v)?.getTime() || 0;
export const effScore = (sub) => (sub ? (sub.teacher_score ?? sub.score ?? null) : null);
export const isGraded = (sub) => sub && sub.teacher_score !== undefined && sub.teacher_score !== null;
export const round1 = (n) => Math.round(n * 10) / 10;
export const avg = (arr) => (arr.length ? arr.reduce((t, x) => t + x, 0) / arr.length : null);
export const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

/** Roster: entries of cls.students that are still members, plus bare emails without a profile entry. */
export function rosterOf(cls) {
  const emails = cls?.student_emails || [];
  const seen = new Set();
  const out = [];
  for (const st of cls?.students || []) {
    if (!emails.includes(st.email) || seen.has(st.email)) continue;
    seen.add(st.email);
    out.push({ email: st.email, full_name: st.full_name || st.email, joined_at: st.joined_at || 0 });
  }
  for (const e of emails) if (!seen.has(e)) { seen.add(e); out.push({ email: e, full_name: e, joined_at: 0 }); }
  return out;
}

/** Deadline state of an assignment. */
export function deadlineState(a, now = Date.now()) {
  if (!a?.deadline_ts) return 'none';
  if (now > a.deadline_ts) return 'closed';
  if (a.deadline_ts - now < 2 * DAY) return 'soon';
  return 'open';
}

/**
 * Student-facing status of one assignment: todo | submitted | graded | overdue  (+ soon flag)
 */
export function studentStatus(a, sub, now = Date.now()) {
  if (isGraded(sub)) return 'graded';
  if (sub) return 'submitted';
  if (a?.deadline_ts && now > a.deadline_ts) return 'overdue';
  return 'todo';
}

export const STATUS_META = {
  todo: { label: 'Chưa làm', cls: 'is-todo', icon: 'code' },
  soon: { label: 'Sắp đến hạn', cls: 'is-soon', icon: 'clock' },
  submitted: { label: 'Đã nộp', cls: 'is-submitted', icon: 'check' },
  graded: { label: 'Đã chấm', cls: 'is-graded', icon: 'check-circle' },
  overdue: { label: 'Quá hạn', cls: 'is-overdue', icon: 'alert' },
};

export function statusPill(status, extra) {
  const m = STATUS_META[status] || STATUS_META.todo;
  return h('span', { class: `cr-status ${m.cls}` }, icon(m.icon), m.label, extra ? h('span', { class: 'cr-status__extra' }, extra) : null);
}

/** Relative deadline text: "Còn 2 ngày", "Hết hạn 3 giờ trước", "Không giới hạn". */
export function deadlineText(ts, now = Date.now()) {
  if (!ts) return 'Không giới hạn';
  const diff = ts - now;
  const abs = Math.abs(diff);
  const mins = Math.round(abs / 60000);
  let span;
  if (mins < 60) span = `${Math.max(1, mins)} phút`;
  else if (mins < 1440) span = `${Math.round(mins / 60)} giờ`;
  else span = `${Math.round(mins / 1440)} ngày`;
  return diff >= 0 ? `Còn ${span}` : `Hết hạn ${span} trước`;
}

export function deadlineChip(a, now = Date.now()) {
  const st = deadlineState(a, now);
  const cls = { none: 'is-none', closed: 'is-closed', soon: 'is-soon', open: 'is-open' }[st];
  return h('span', { class: `cr-deadline ${cls}`, title: a?.deadline_ts ? `Hạn nộp: ${formatDateTime(a.deadline_ts)}` : 'Không giới hạn thời gian' }, icon('clock'), deadlineText(a?.deadline_ts, now));
}

export function shortDate(ts) {
  const d = toDate(ts);
  if (!d) return '—';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function dayLabel(ts, now = Date.now()) {
  const d = toDate(ts);
  if (!d) return '';
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(new Date(now)) - start(d)) / DAY);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Hôm qua';
  if (diff === -1) return 'Ngày mai';
  return `${['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'][d.getDay()]}, ${formatDate(d)}`;
}

export function timeOf(ts) {
  const d = toDate(ts);
  return d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '';
}

export function scoreText(v) { return v === null || v === undefined ? '—' : formatScore(round1(Number(v))); }

/** Score band for colour (always shown together with the number). */
export function scoreBand(v) {
  if (v === null || v === undefined) return 'none';
  const n = Number(v);
  if (n >= 8) return 'high';
  if (n >= 6.5) return 'good';
  if (n >= 5) return 'mid';
  return 'low';
}

// ---------------------------------------------------------------------------
// Avatars
const AVATAR_HUES = ['#1f5eff', '#0e7490', '#4b44d6', '#0f7a66', '#b45309', '#be185d', '#334a72', '#6a3fd6'];
export function initials(name) {
  const parts = String(name || '?').trim().split(/[\s@._-]+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts.length === 1 ? parts[0].slice(0, 2) : parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}
export function avatar(name, key, { size = 34, online = false, className = '' } = {}) {
  const hue = AVATAR_HUES[hashString(key || name) % AVATAR_HUES.length];
  return h('span', { class: `cr-avatar ${online ? 'is-online' : ''} ${className}`.trim(), style: { '--av': hue, width: `${size}px`, height: `${size}px`, fontSize: `${Math.round(size * 0.38)}px` }, 'aria-hidden': 'true' }, initials(name));
}

// ---------------------------------------------------------------------------
// Generic building blocks
export function emptyBlock({ art = 'classes', title, text, action, compact = false }) {
  return h('div', { class: `cr-empty ${compact ? 'is-compact' : ''}` }, illo(art), h('h3', null, title), text ? h('p', null, text) : null, action ? h('div', { class: 'cr-empty__actions' }, action) : null);
}

export function panel({ title, sub, actions, className = '', body, id }) {
  return h('section', { class: `cr-panel ${className}`.trim(), id },
    title ? h('header', { class: 'cr-panel__head' },
      h('div', { class: 'grow' }, h('h3', { class: 'cr-panel__title' }, title), sub ? h('p', { class: 'cr-panel__sub' }, sub) : null),
      actions || null) : null,
    h('div', { class: 'cr-panel__body' }, body));
}

/** KPI stat card. tone: blue | green | amber | red | violet | ink */
export function kpi({ label, value, hint, tone = 'ink', iconName = 'gauge', trend }) {
  return h('div', { class: `cr-kpi tone-${tone}` },
    h('div', { class: 'cr-kpi__top' }, h('span', { class: 'cr-kpi__icon' }, icon(iconName)), h('span', { class: 'cr-kpi__label' }, label)),
    h('div', { class: 'cr-kpi__value' }, value),
    hint ? h('div', { class: 'cr-kpi__hint' }, trend ? h('span', { class: `cr-kpi__trend is-${trend}` }) : null, hint) : null);
}

export function progressBar(value, total, { tone = 'blue', label } = {}) {
  const p = pct(value, total);
  return h('div', { class: `cr-progress tone-${tone}`, role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': String(total || 0), 'aria-valuenow': String(value), 'aria-label': label || `${value}/${total}` },
    h('span', { style: { width: `${p}%` } }));
}

export function chipFilter(options, value, onChange) {
  return h('div', { class: 'cr-chips', role: 'tablist' }, options.map(([id, label, count]) => h('button', {
    type: 'button', class: 'cr-chip', role: 'tab', 'aria-selected': String(value === id), onClick: () => onChange(id),
  }, label, count !== undefined && count !== null ? h('span', { class: 'cr-chip__count' }, String(count)) : null)));
}

export function searchBox(placeholder, value, onInput) {
  const input = h('input', { class: 'input cr-search__input', type: 'search', placeholder, value: value || '', 'aria-label': placeholder });
  input.addEventListener('input', () => onInput(input.value));
  return h('label', { class: 'cr-search' }, icon('search'), input);
}

// ---------------------------------------------------------------------------
// Charts (inline SVG / HTML, built from real data only)

/** Donut chart. segments: [{ label, value, tone }] (tone maps to a CSS colour class). */
export function donut(segments, { size = 148, thickness = 16, centerValue, centerLabel, ariaLabel } = {}) {
  const total = segments.reduce((t, x) => t + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const svg = s('svg', { class: 'cr-donut__svg', viewBox: `0 0 ${size} ${size}`, width: size, height: size, role: 'img', 'aria-label': ariaLabel || segments.map((x) => `${x.label}: ${x.value}`).join(', ') });
  svg.appendChild(s('circle', { class: 'cr-donut__track', cx: size / 2, cy: size / 2, r, 'stroke-width': thickness, fill: 'none' }));
  if (total > 0) {
    let offset = 0;
    const nonzero = segments.filter((x) => x.value > 0);
    const gap = nonzero.length > 1 ? 2.5 : 0;
    for (const seg of nonzero) {
      const len = (seg.value / total) * c;
      const arc = s('circle', {
        class: `cr-donut__seg tone-${seg.tone}`, cx: size / 2, cy: size / 2, r, fill: 'none', 'stroke-width': thickness,
        'stroke-dasharray': `${Math.max(0.01, len - gap)} ${c}`, 'stroke-dashoffset': String(-offset), transform: `rotate(-90 ${size / 2} ${size / 2})`,
      }, s('title', null, `${seg.label}: ${seg.value} (${pct(seg.value, total)}%)`));
      svg.appendChild(arc);
      offset += len;
    }
  }
  const legend = h('ul', { class: 'cr-legend' }, segments.map((seg) => h('li', null,
    h('span', { class: `cr-legend__sw tone-${seg.tone}` }), h('span', { class: 'cr-legend__label' }, seg.label), h('strong', null, String(seg.value)))));
  return h('div', { class: 'cr-donut' },
    h('div', { class: 'cr-donut__fig', style: { width: `${size}px`, height: `${size}px` } }, svg,
      h('div', { class: 'cr-donut__center' }, h('strong', null, centerValue ?? String(total)), centerLabel ? h('span', null, centerLabel) : null)),
    legend);
}

/** Horizontal bar list (HTML). rows: [{ label, value, total, sub, tone, onClick }] */
export function barList(rows, { valueText } = {}) {
  return h('div', { class: 'cr-barlist' }, rows.map((r) => {
    const p = pct(r.value, r.total);
    return h(r.onClick ? 'button' : 'div', { class: 'cr-barlist__row', type: r.onClick ? 'button' : undefined, onClick: r.onClick, title: `${r.label}: ${r.value}/${r.total} (${p}%)` },
      h('div', { class: 'cr-barlist__label' }, h('span', { class: 'truncate' }, r.label), r.sub ? h('span', { class: 'cr-barlist__sub' }, r.sub) : null),
      h('div', { class: 'cr-barlist__track' }, h('span', { class: `tone-${r.tone || 'blue'}`, style: { width: `${p}%` } })),
      h('div', { class: 'cr-barlist__val' }, valueText ? valueText(r) : `${p}%`));
  }));
}

/** Score distribution histogram (SVG columns 0–10). */
export function histogram(scores, { height = 150, ariaLabel = 'Phân bố điểm' } = {}) {
  const bins = Array.from({ length: 10 }, () => 0);
  for (const v of scores) bins[Math.min(9, Math.max(0, Math.floor(Number(v))))]++;
  const max = Math.max(1, ...bins);
  const W = 320; const H = height; const padB = 22; const padT = 16; const gap = 6;
  const bw = (W - gap * 9) / 10;
  const svg = s('svg', { class: 'cr-hist', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `${ariaLabel}: ${bins.map((b, i) => `${i}–${i + 1}: ${b}`).join(', ')}` });
  [0.5, 1].forEach((f) => svg.appendChild(s('line', { class: 'cr-hist__grid', x1: 0, x2: W, y1: padT + (H - padB - padT) * (1 - f), y2: padT + (H - padB - padT) * (1 - f) })));
  bins.forEach((b, i) => {
    const bh = b ? Math.max(4, ((H - padB - padT) * b) / max) : 0;
    const x = i * (bw + gap);
    const g = s('g', { class: 'cr-hist__col' });
    g.appendChild(s('rect', { class: 'cr-hist__hit', x, y: 0, width: bw, height: H - padB }));
    if (b) {
      g.appendChild(s('rect', { class: `cr-hist__bar band-${i >= 8 ? 'high' : i >= 6 ? 'good' : i >= 5 ? 'mid' : 'low'}`, x, y: H - padB - bh, width: bw, height: bh, rx: 4 }));
      g.appendChild(s('text', { class: 'cr-hist__val', x: x + bw / 2, y: H - padB - bh - 5, 'text-anchor': 'middle' }, String(b)));
    }
    g.appendChild(s('text', { class: 'cr-hist__tick', x: x + bw / 2, y: H - 6, 'text-anchor': 'middle' }, i === 9 ? '9–10' : String(i)));
    g.appendChild(s('title', null, `Điểm ${i}–${i + 1}${i === 9 ? ' (kể cả 10)' : ''}: ${b} bài`));
    svg.appendChild(g);
  });
  svg.appendChild(s('line', { class: 'cr-hist__base', x1: 0, x2: W, y1: H - padB, y2: H - padB }));
  return svg;
}

/** Column chart of a single series over time (student's own scores). points: [{ label, value, title }] */
export function columnSeries(points, { height = 140 } = {}) {
  const W = Math.max(280, points.length * 44); const H = height; const padB = 22; const padT = 18;
  const bw = Math.min(26, (W / points.length) * 0.5);
  const svg = s('svg', { class: 'cr-hist', viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': points.map((p) => `${p.title}: ${p.value ?? 'chưa có'}`).join(', ') });
  [0.5, 1].forEach((f) => svg.appendChild(s('line', { class: 'cr-hist__grid', x1: 0, x2: W, y1: padT + (H - padB - padT) * (1 - f), y2: padT + (H - padB - padT) * (1 - f) })));
  points.forEach((p, i) => {
    const cx = (W / points.length) * (i + 0.5);
    const g = s('g', { class: 'cr-hist__col' });
    if (p.value !== null && p.value !== undefined) {
      const bh = Math.max(4, ((H - padB - padT) * Number(p.value)) / 10);
      g.appendChild(s('rect', { class: `cr-hist__bar band-${scoreBand(p.value)}`, x: cx - bw / 2, y: H - padB - bh, width: bw, height: bh, rx: 4 }));
      g.appendChild(s('text', { class: 'cr-hist__val', x: cx, y: H - padB - bh - 5, 'text-anchor': 'middle' }, scoreText(p.value)));
    } else {
      g.appendChild(s('rect', { class: 'cr-hist__ghost', x: cx - bw / 2, y: H - padB - 4, width: bw, height: 4, rx: 2 }));
    }
    g.appendChild(s('text', { class: 'cr-hist__tick', x: cx, y: H - 6, 'text-anchor': 'middle' }, p.label));
    g.appendChild(s('title', null, `${p.title}: ${p.value === null || p.value === undefined ? 'chưa có điểm' : `${scoreText(p.value)}/10`}`));
    svg.appendChild(g);
  });
  svg.appendChild(s('line', { class: 'cr-hist__base', x1: 0, x2: W, y1: H - padB, y2: H - padB }));
  return svg;
}

/** Deadline strip: next `days` days with assignments placed on their due date. */
export function deadlineStrip(assignments, { days = 14, now = Date.now(), statusOf, onPick } = {}) {
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const cells = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * DAY);
    const next = d.getTime() + DAY;
    const due = assignments.filter((a) => a.deadline_ts && a.deadline_ts >= d.getTime() && a.deadline_ts < next);
    const wd = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
    cells.push(h('div', { class: `cr-strip__day ${i === 0 ? 'is-today' : ''} ${d.getDay() === 0 || d.getDay() === 6 ? 'is-weekend' : ''} ${due.length ? 'has-due' : ''}` },
      h('div', { class: 'cr-strip__wd' }, i === 0 ? 'Hôm nay' : wd),
      h('div', { class: 'cr-strip__num' }, String(d.getDate())),
      h('div', { class: 'cr-strip__items' }, due.slice(0, 3).map((a) => {
        const st = statusOf ? statusOf(a) : (a.deadline_ts < now ? 'overdue' : a.deadline_ts - now < 2 * DAY ? 'soon' : 'todo');
        return h('button', { type: 'button', class: `cr-strip__item st-${st}`, title: `${a.title} · hạn ${timeOf(a.deadline_ts)}`, onClick: () => onPick?.(a) }, h('span', { class: 'truncate' }, a.title));
      }), due.length > 3 ? h('span', { class: 'cr-strip__more' }, `+${due.length - 3}`) : null)));
  }
  return h('div', { class: 'cr-strip', role: 'list', 'aria-label': `Hạn nộp trong ${days} ngày tới` }, cells);
}

// ---------------------------------------------------------------------------
/**
 * Sortable table.
 * columns: [{ key, label, sort?: (row) => value, render: (row) => node, className, align, sticky }]
 */
export function sortableTable({ columns, rows, initial = null, rowKey, onRowClick, rowClass, caption, emptyText = 'Không có dữ liệu.' }) {
  let sortKey = initial?.key ?? null;
  let dir = initial?.dir ?? 1;
  const tbody = h('tbody');
  const thead = h('thead');
  const renderHead = () => mount(thead, h('tr', null, columns.map((c) => {
    if (!c.sort) return h('th', { class: [c.className, c.align ? `is-${c.align}` : '', c.sticky ? 'is-sticky' : ''].filter(Boolean).join(' '), scope: 'col', title: c.title }, c.label);
    const active = sortKey === c.key;
    return h('th', { class: [c.className, c.align ? `is-${c.align}` : '', c.sticky ? 'is-sticky' : '', 'is-sortable'].filter(Boolean).join(' '), scope: 'col', 'aria-sort': active ? (dir > 0 ? 'ascending' : 'descending') : 'none', title: c.title },
      h('button', { type: 'button', class: `cr-th-btn ${active ? 'is-active' : ''}`, onClick: () => { if (sortKey === c.key) dir = -dir; else { sortKey = c.key; dir = c.defaultDir || 1; } renderHead(); renderBody(); } },
        c.label, h('span', { class: `cr-sort ${active ? (dir > 0 ? 'is-asc' : 'is-desc') : ''}`, 'aria-hidden': 'true' })));
  })));
  const renderBody = () => {
    let list = rows.slice();
    const col = columns.find((c) => c.key === sortKey);
    if (col?.sort) {
      list.sort((a, b) => {
        const x = col.sort(a); const y = col.sort(b);
        const xn = x === null || x === undefined || x === ''; const yn = y === null || y === undefined || y === '';
        if (xn && yn) return 0;
        if (xn) return 1;
        if (yn) return -1;
        return (typeof x === 'string' ? x.localeCompare(y, 'vi') : x - y) * dir;
      });
    }
    if (!list.length) { mount(tbody, h('tr', null, h('td', { colspan: columns.length, class: 'cr-table__empty' }, emptyText))); return; }
    mount(tbody, list.map((r) => h('tr', {
      class: [onRowClick ? 'is-clickable' : '', rowClass ? rowClass(r) : ''].filter(Boolean).join(' '),
      dataset: rowKey ? { key: rowKey(r) } : undefined,
      tabindex: onRowClick ? '0' : undefined,
      onClick: onRowClick ? (e) => { if (!e.target.closest('button, a, input, select')) onRowClick(r); } : undefined,
      onKeydown: onRowClick ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(r); } : undefined,
    }, columns.map((c) => h('td', { class: [c.className, c.align ? `is-${c.align}` : '', c.sticky ? 'is-sticky' : ''].filter(Boolean).join(' ') }, c.render(r))))));
  };
  renderHead();
  renderBody();
  return h('div', { class: 'cr-table-wrap' }, h('table', { class: 'cr-table' }, caption ? h('caption', { class: 'sr-only' }, caption) : null, thead, tbody));
}

/** CSV export helper (UTF-8 BOM so Excel shows Vietnamese correctly). */
export function toCSV(rows) {
  const esc = (v) => { const t = String(v ?? ''); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
  return `﻿${rows.map((r) => r.map(esc).join(',')).join('\r\n')}`;
}

/** Section header inside the class workspace. */
export function sectionHead({ title, sub, actions, back }) {
  return h('header', { class: 'cr-sec-head' },
    h('div', { class: 'grow' },
      back ? h('button', { class: 'cr-back', type: 'button', onClick: back.onClick }, icon('arrow-left'), back.label) : null,
      h('h1', { class: 'cr-sec-head__title' }, title),
      sub ? h('p', { class: 'cr-sec-head__sub' }, sub) : null),
    actions ? h('div', { class: 'cr-sec-head__actions' }, actions) : null);
}

export function onlineOf(presence, email, now = Date.now()) {
  const p = presence.find((x) => x.id === email);
  return { p, online: Boolean(p && now - (p.updated_at || 0) < ONLINE_WINDOW && p.status !== 'idle') };
}

export function presenceText(p, online) {
  if (!p) return 'Chưa hoạt động';
  if (!online) return null;
  return { coding: 'Đang làm bài', error: 'Đang gặp lỗi', done: 'Vừa làm xong', online: 'Đang trực tuyến' }[p.status] || 'Đang trực tuyến';
}
