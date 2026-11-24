// V-Code Edu — Arena: end-of-match overlay ("CHIẾN THẮNG" / "THẤT BẠI") and round tiles.
import { h } from '../../core/dom.js';
import { icon } from '../../components/icons.js';
import { tierFor, levelFor, fmt, clock, pad3, prefersReducedMotion } from './core.js';
import { tierEmblem, glyph } from './art.js';

/**
 * Round tiles. `tests` = challenge tests (for hidden flags), `results` = grading results (optional).
 * Each tile: pending | pass | fail, hidden tests marked with a lock.
 */
export function roundTiles(tests, results = null, { compact = false } = {}) {
  return h('ol', { class: `ar-rounds__tiles ${compact ? 'is-compact' : ''}` }, tests.map((t, i) => {
    const r = results?.[i];
    const hidden = r ? r.hidden : t.hidden;
    const st = r ? (r.ok ? 'pass' : 'fail') : 'pending';
    const label = `Vòng ${i + 1}${hidden ? ' (ẩn)' : ''}: ${st === 'pass' ? 'đạt' : st === 'fail' ? (r.timedOut ? 'quá thời gian' : 'chưa đạt') : 'chưa chấm'}`;
    return h('li', { class: `ar-round is-${st} ${hidden ? 'is-hidden' : ''}`, title: label, 'aria-label': label, style: `--i:${i}` },
      h('span', { class: 'ar-round__n' }, String(i + 1)),
      h('span', { class: 'ar-round__ic' }, st === 'pass' ? icon('check') : st === 'fail' ? icon('x') : hidden ? glyph.hidden() : null),
      hidden ? h('span', { class: 'ar-round__tag' }, 'Ẩn') : null);
  }));
}

function countUp(el, to, ms = 900) {
  if (prefersReducedMotion() || to <= 0) { el.textContent = fmt(to); return; }
  const t0 = performance.now();
  const step = (t) => {
    const k = Math.min(1, (t - t0) / ms);
    el.textContent = fmt(to * (1 - (1 - k) ** 3));
    if (k < 1 && el.isConnected) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * showMatchResult(host, {
 *   win, passed, total, results, tests, challenge, elapsedMs,
 *   firstTime, xpGained, xpBefore, xpAfter, solutionUnlocked,
 *   hasNext, onRetry, onNext, onLobby, signal
 * }) → { close }
 */
export function showMatchResult(host, o) {
  host.querySelector('.ar-result')?.remove();
  const prevFocus = document.activeElement;
  const c = o.challenge;
  const titleId = `ar-result-title-${Date.now()}`;

  let rankBlock = null;
  if (o.win) {
    const before = tierFor(o.xpBefore);
    const after = tierFor(o.xpAfter);
    const lvB = levelFor(o.xpBefore);
    const lvA = levelFor(o.xpAfter);
    const promoted = after.index > before.index;
    const fromPct = promoted ? 0 : before.pct;
    const bar = h('i', { style: `--p:${(fromPct * 100).toFixed(1)}%` });
    rankBlock = h('div', { class: 'ar-result__rank', style: { '--tier': after.tier.color } },
      h('div', { class: 'ar-result__emblem' }, tierEmblem(after.index, { size: 84 })),
      h('div', { class: 'ar-result__rankinfo' },
        promoted ? h('span', { class: 'ar-result__promo' }, 'Thăng hạng!', ` ${before.tier.name} → ${after.tier.name}`) : h('span', { class: 'ar-kicker' }, 'Tiến độ hạng'),
        h('strong', null, after.label, h('small', null, ` · Cấp ${lvA.level}${lvA.level > lvB.level ? ' (lên cấp!)' : ''}`)),
        h('div', { class: 'ar-bar' }, bar),
        h('span', { class: 'ar-result__next' }, after.next ? `${fmt(o.xpAfter)} XP · còn ${fmt(after.toNext)} XP để lên ${after.next.name}` : `${fmt(o.xpAfter)} XP · hạng cao nhất`)));
    requestAnimationFrame(() => requestAnimationFrame(() => bar.style.setProperty('--p', `${(after.pct * 100).toFixed(1)}%`)));
  }

  const xpNum = h('b', null, '0');
  const stats = o.win
    ? h('div', { class: 'ar-result__stats' },
      h('div', { class: 'ar-result__stat is-xp' },
        h('span', { class: 'ar-kicker' }, 'Phần thưởng'),
        o.firstTime ? h('span', { class: 'ar-result__big' }, '+', xpNum, h('small', null, ' XP')) : h('span', { class: 'ar-result__big is-muted' }, '0', h('small', null, ' XP')),
        h('small', null, o.firstTime ? 'Đã ghi vào tiến độ của bạn' : 'Bạn đã hạ trận này trước đó — không cộng thêm XP')),
      h('div', { class: 'ar-result__stat' },
        h('span', { class: 'ar-kicker' }, 'Thời gian'),
        h('span', { class: 'ar-result__big mono' }, clock(o.elapsedMs)),
        h('small', null, 'Tính từ lúc mở trận')),
      h('div', { class: 'ar-result__stat' },
        h('span', { class: 'ar-kicker' }, 'Vòng đấu'),
        h('span', { class: 'ar-result__big' }, `${o.passed}/${o.total}`),
        h('small', null, 'Tất cả vòng đều đạt')))
    : h('div', { class: 'ar-result__stats' },
      h('div', { class: 'ar-result__stat' },
        h('span', { class: 'ar-kicker' }, 'Vòng đạt'),
        h('span', { class: 'ar-result__big' }, `${o.passed}/${o.total}`),
        h('small', null, o.results.some((r) => !r.ok && r.hidden) ? 'Có vòng ẩn chưa đạt — xét thêm trường hợp đặc biệt' : 'Xem chi tiết từng vòng trong tab Kiểm thử')),
      h('div', { class: 'ar-result__stat' },
        h('span', { class: 'ar-kicker' }, 'Thời gian'),
        h('span', { class: 'ar-result__big mono' }, clock(o.elapsedMs)),
        h('small', null, o.solutionUnlocked ? 'Lời giải tham khảo đã được mở' : 'Đọc lại đề và thử lại nhé')));

  const btnRetry = h('button', { class: `ar-btn ${o.win ? 'ar-btn--ghost' : 'ar-btn--primary'} ar-btn--lg`, type: 'button', 'data-result-action': 'retry', onClick: () => { close(); o.onRetry?.(); } }, icon('restart'), 'Thử lại');
  const btnNext = o.hasNext ? h('button', { class: `ar-btn ${o.win ? 'ar-btn--primary' : 'ar-btn--ghost'} ar-btn--lg`, type: 'button', 'data-result-action': 'next', onClick: () => { close(); o.onNext?.(); } }, 'Thử thách tiếp theo', icon('arrow-right')) : null;
  const btnLobby = h('button', { class: 'ar-btn ar-btn--ghost ar-btn--lg', type: 'button', 'data-result-action': 'lobby', onClick: () => { close(); o.onLobby?.(); } }, icon('grid'), 'Về sảnh');

  const el = h('div', { class: `ar-result ${o.win ? 'is-win' : 'is-loss'}`, role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('div', { class: 'ar-result__bg', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
    h('div', { class: 'ar-result__panel' },
      h('span', { class: 'ar-result__kicker' }, `Trận #${pad3(c.stage)} · ${o.win ? 'Hoàn thành' : 'Kết thúc'}`),
      h('h2', { class: 'ar-result__title', id: titleId },
        h('span', { class: 'ar-result__word', 'data-text': o.win ? 'Chiến thắng' : 'Thất bại' }, o.win ? 'Chiến thắng' : 'Thất bại'),
        o.win ? null : h('span', { class: 'ar-result__score' }, `— ${o.passed}/${o.total} bài kiểm tra`)),
      h('p', { class: 'ar-result__sub' }, c.title),
      h('div', { class: 'ar-result__rounds' }, roundTiles(o.tests, o.results)),
      stats,
      rankBlock,
      h('div', { class: 'ar-result__actions' }, o.win ? [btnNext, btnRetry, btnLobby] : [btnRetry, btnNext, btnLobby])));

  function onKey(e) {
    if (e.key === 'Escape') { e.preventDefault(); close(); o.onRetry?.(); }
    if (e.key === 'Tab') {
      const f = [...el.querySelectorAll('button')];
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  let closed = false;
  function close() {
    if (closed) return;
    closed = true;
    document.removeEventListener('keydown', onKey, true);
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), prefersReducedMotion() ? 0 : 220);
    if (prevFocus && prevFocus.isConnected && typeof prevFocus.focus === 'function') prevFocus.focus({ preventScroll: true });
  }
  document.addEventListener('keydown', onKey, true);
  o.signal?.addEventListener('abort', () => { document.removeEventListener('keydown', onKey, true); el.remove(); });
  host.appendChild(el);
  if (o.win && o.firstTime) setTimeout(() => countUp(xpNum, o.xpGained), prefersReducedMotion() ? 0 : 450);
  else if (o.firstTime) xpNum.textContent = fmt(o.xpGained);
  requestAnimationFrame(() => el.classList.add('is-open'));
  setTimeout(() => (o.win ? (btnNext || btnRetry) : btnRetry).focus({ preventScroll: true }), 60);
  return { el, close };
}
