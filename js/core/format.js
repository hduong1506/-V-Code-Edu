// V-Code Edu — formatting helpers (Vietnamese conventions: DD/MM/YYYY, 24-hour clock, comma decimals).

const pad = (n) => String(n).padStart(2, '0');

export function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (typeof v === 'number') return new Date(v);
  if (typeof v?.toMillis === 'function') return new Date(v.toMillis());
  if (typeof v?.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(v) {
  const d = toDate(v);
  return d ? `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` : '—';
}

export function formatDateTime(v) {
  const d = toDate(v);
  return d ? `${pad(d.getHours())}:${pad(d.getMinutes())} · ${formatDate(d)}` : '—';
}

export function formatRelative(v) {
  const d = toDate(v);
  if (!d) return '—';
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 45) return 'vừa xong';
  if (diff < 3600) return `${Math.round(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.round(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.round(diff / 86400)} ngày trước`;
  return formatDate(d);
}

/** Remaining time until a deadline, e.g. "còn 2 ngày 3 giờ" / "đã hết hạn". */
export function formatCountdown(ts) {
  if (!ts) return 'Không giới hạn';
  const ms = Number(ts) - Date.now();
  if (ms <= 0) return 'Đã hết hạn';
  const m = Math.floor(ms / 60000);
  const d = Math.floor(m / 1440);
  const hh = Math.floor((m % 1440) / 60);
  const mm = m % 60;
  if (d > 0) return `Còn ${d} ngày ${hh} giờ`;
  if (hh > 0) return `Còn ${hh} giờ ${mm} phút`;
  return `Còn ${mm} phút`;
}

export function formatScore(v) {
  if (v === null || v === undefined || v === '') return '—';
  return Number(v).toFixed(Number.isInteger(Number(v)) ? 0 : 1).replace('.', ',');
}

/** Build a timestamp from "YYYY-MM-DD" + hour + minute (24h). */
export function combineDateTime(dateStr, hour, minute) {
  if (!dateStr) return 0;
  const [y, mo, da] = dateStr.split('-').map(Number);
  return new Date(y, mo - 1, da, Number(hour) || 0, Number(minute) || 0, 0, 0).getTime();
}

export function splitDateTime(ts) {
  const d = toDate(ts);
  if (!d) return { date: '', hour: 23, minute: 59 };
  return { date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, hour: d.getHours(), minute: d.getMinutes() };
}
