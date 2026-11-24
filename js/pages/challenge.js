// V-Code Edu — Arena match page (#/challenges/:id): HUD, briefing, workbench, rounds and result overlay.
import { h, mount, raw } from '../core/dom.js';
import { icon } from '../components/icons.js';
import { loadChallenges } from '../services/content.js';
import { markComplete, getProgress, isDone, totalXp } from '../services/progress.js';
import * as IDE from '../components/ide.js';
import { markdown, enhanceMarkdown } from '../components/markdown.js';
import { highlight } from '../components/highlight.js';
import { idb, kv } from '../core/idb.js';
import { toast } from '../core/ui.js';
import { RANK_META, LANG_LABEL, WORLD_HUE, ensureArenaCss, pad3, cleanTitle, clock } from './arena/core.js';
import { rankEmblem, glyph } from './arena/art.js';
import { roundTiles, showMatchResult } from './arena/overlay.js';

const SOLUTION_AFTER = 3;

async function loadDraft(key) {
  if (typeof IDE.loadDraft === 'function') return IDE.loadDraft(key);
  try { return (await idb.get('drafts', key))?.code ?? null; } catch { return null; }
}

function prose(md) {
  const el = h('div', { class: 'prose ar-prose' });
  el.innerHTML = markdown(md || '');
  enhanceMarkdown(el);
  return el;
}

function errorScreen(container, title, text) {
  mount(container, h('div', { class: 'arena arena--match arena--error' },
    h('div', { class: 'ar-wrap ar-empty ar-empty--page' },
      glyph.crosshair(),
      h('span', { class: 'ar-kicker' }, 'Mất tín hiệu'),
      h('h1', null, title),
      text ? h('p', null, text) : null,
      h('a', { class: 'ar-btn ar-btn--primary', href: '#/challenges' }, icon('grid'), 'Về sảnh'))));
}

export default {
  title: 'Trận đấu',
  async mount(container, ctx) {
    const { signal } = ctx;
    let data;
    try { [data] = await Promise.all([loadChallenges(), ensureArenaCss(['css/pages/challenges.css', 'css/pages/ide.css'])]); } catch (err) { errorScreen(container, 'Không tải được thử thách', err.message); return; }
    const idx = data.challenges.findIndex((x) => x.id === ctx.params.id);
    const c = data.challenges[idx];
    if (!c) { errorScreen(container, 'Không tìm thấy trận này', 'Đường dẫn có thể đã cũ. Hãy chọn trận khác trong sảnh.'); return; }

    document.title = `#${pad3(c.stage)} ${cleanTitle(c.title)} · Đấu trường · V-Code Edu`;
    const world = data.worlds.find((w) => w.id === c.world);
    const prev = data.challenges[idx - 1];
    const next = data.challenges[idx + 1];
    const meta = RANK_META[c.rank] || RANK_META.D;
    const boss = c.boss || c.rank === 'BOSS';
    const tests = c.tests || [];
    const visibleTests = tests.filter((t) => !t.hidden);
    const hiddenCount = tests.length - visibleTests.length;
    const draftKey = `challenge:${c.id}`;
    const attemptsKey = `attempts:challenge:${c.id}`;

    const [progress, draft, attempts, practice] = await Promise.all([
      getProgress(),
      loadDraft(draftKey),
      kv.get(attemptsKey, 0).then(Number).catch(() => 0),
      import('../components/practice.js').catch(() => null),
    ]);
    if (signal.aborted) return;
    let solved = isDone(progress, 'challenges', c.id);
    let failCount = attempts || 0;
    let lastResult = null;
    let lastError = '';

    /* ------------------------------------------------------------ timer (local only) */
    const startedAt = Date.now();
    let stoppedAt = 0;
    const timerEl = h('span', { class: 'ar-hud__clock mono', 'aria-label': 'Thời gian trận' }, '00:00');
    const elapsed = () => (stoppedAt || Date.now()) - startedAt;
    const tick = setInterval(() => { if (!document.hidden && !stoppedAt) timerEl.textContent = clock(elapsed()); }, 1000);
    signal.addEventListener('abort', () => clearInterval(tick));

    /* ------------------------------------------------------------ HUD */
    const xpChip = h('span', { class: 'ar-hud__xp' });
    function renderXpChip() {
      mount(xpChip, solved ? [h('span', { class: 'ar-tag ar-tag--teal' }, icon('check'), 'Đã hạ'), h('span', { class: 'ar-hud__xpv' }, `${c.xp} XP`)] : h('span', { class: 'ar-hud__xpv' }, icon('zap'), h('b', null, `+${c.xp}`), ' XP'));
    }
    renderXpChip();
    const lobbyHref = `#/challenges${world ? `?world=${world.id}` : ''}`;
    const navBtn = (target, dir) => (target
      ? h('a', { class: 'ar-hud__navbtn', href: `#/challenges/${target.id}`, title: `${dir === 'prev' ? 'Trận trước' : 'Trận sau'}: #${pad3(target.stage)} ${cleanTitle(target.title)}`, 'aria-label': dir === 'prev' ? 'Trận trước' : 'Trận sau', 'data-nav-dir': dir },
        dir === 'prev' ? icon('chevron-left') : null, h('span', { class: 'mono' }, pad3(target.stage)), dir === 'next' ? icon('chevron-right') : null)
      : h('span', { class: 'ar-hud__navbtn is-disabled', 'aria-hidden': 'true' }, dir === 'prev' ? icon('chevron-left') : icon('chevron-right')));

    const hud = h('header', { class: `ar-hud ${boss ? 'is-boss' : ''}`, style: { '--hue': meta.color, '--world': WORLD_HUE[c.world] || meta.color } },
      h('a', { class: 'ar-hud__back', href: lobbyHref, title: 'Về sảnh' }, icon('arrow-left'), h('span', null, 'Sảnh')),
      h('div', { class: 'ar-hud__id' },
        h('span', { class: 'ar-hud__num' }, `#${pad3(c.stage)}`),
        h('div', { class: 'ar-hud__names' },
          h('span', { class: 'ar-hud__world' }, world ? `Bản đồ ${world.id} · ${world.name}` : 'Đấu trường'),
          h('h1', { class: 'ar-hud__title' }, cleanTitle(c.title)))),
      h('div', { class: 'ar-hud__stats' },
        h('span', { class: 'ar-hud__rank', title: `${meta.label} — ${meta.name}` }, rankEmblem(c.rank, { size: 30 }), h('span', null, h('small', null, 'Hạng'), h('b', null, boss ? 'Trùm' : c.rank))),
        h('span', { class: 'ar-hud__lang' }, h('small', null, 'Ngôn ngữ'), h('b', null, LANG_LABEL[c.lang] || c.lang)),
        xpChip,
        h('span', { class: 'ar-hud__timer' }, icon('clock'), timerEl)),
      h('nav', { class: 'ar-hud__nav', 'aria-label': 'Chuyển trận' }, navBtn(prev, 'prev'), navBtn(next, 'next')));

    /* ------------------------------------------------------------ rounds strip */
    const roundsTiles = h('div', { class: 'ar-rounds__slot' });
    const roundsSum = h('span', { class: 'ar-rounds__sum' });
    function renderRounds(result) {
      mount(roundsTiles, roundTiles(tests, result?.results || null, { compact: true }));
      if (!result) mount(roundsSum, tests.length ? `${tests.length} vòng · ${hiddenCount} vòng ẩn · Nộp bài để chấm` : 'Trận này chưa có bộ kiểm tra');
      else {
        const win = result.total > 0 && result.passed === result.total;
        mount(roundsSum, h('b', { class: win ? 'is-win' : 'is-loss' }, win ? 'Toàn thắng' : `${result.passed}/${result.total} vòng đạt`), ` · Điểm ${result.score10?.toFixed ? result.score10.toFixed(1).replace('.', ',') : ''}/10`);
      }
    }
    renderRounds(null);
    const rounds = h('div', { class: 'ar-rounds', 'aria-label': 'Vòng đấu' }, h('span', { class: 'ar-rounds__label' }, glyph.swords(), 'Vòng đấu'), roundsTiles, roundsSum);

    /* ------------------------------------------------------------ briefing */
    const tabs = [
      { id: 'brief', label: 'Nhiệm vụ', ic: 'target' },
      ...(c.hints?.length ? [{ id: 'hints', label: `Gợi ý (${c.hints.length})`, ic: 'bulb' }] : []),
      ...(c.solution ? [{ id: 'solution', label: 'Lời giải', ic: 'key' }] : []),
    ];
    let activeTab = 'brief';
    let hintsShown = 0;
    const tabsEl = h('div', { class: 'ar-tabs', role: 'tablist', 'aria-label': 'Thông tin trận' });
    const briefBody = h('div', { class: 'ar-brief__body', role: 'tabpanel' });

    function renderBriefTab() {
      mount(tabsEl, tabs.map((t) => h('button', { class: 'ar-tab', type: 'button', role: 'tab', 'aria-selected': String(t.id === activeTab), 'data-tab': t.id, onClick: () => { activeTab = t.id; renderBriefTab(); } },
        icon(t.ic), h('span', null, t.label), t.id === 'solution' && !(solved || failCount >= SOLUTION_AFTER) ? icon('lock') : null)));
      let node;
      if (activeTab === 'brief') {
        node = h('div', { class: 'ar-brief__stack' },
          h('div', { class: 'ar-brief__block' }, h('span', { class: 'ar-kicker' }, 'Mục tiêu'), prose(c.task)),
          visibleTests.length ? h('div', { class: 'ar-brief__block' },
            h('span', { class: 'ar-kicker' }, `Vòng công khai (${visibleTests.length})`),
            h('div', { class: 'ar-io-list' }, visibleTests.map((t) => {
              const n = tests.indexOf(t) + 1;
              return h('div', { class: 'ar-io' },
                h('span', { class: 'ar-io__n' }, `Vòng ${n}`),
                h('div', { class: 'ar-io__cols' },
                  h('div', null, h('small', null, 'Dữ liệu vào'), h('pre', null, String(t.input ?? '').replace(/\n$/, '') || '(trống)')),
                  h('div', null, h('small', null, 'Kết quả mong đợi'), h('pre', null, String(t.expected ?? '')))));
            })),
            hiddenCount ? h('p', { class: 'ar-io__hidden' }, glyph.hidden(), `+ ${hiddenCount} vòng ẩn kiểm tra các trường hợp đặc biệt. Dữ liệu của vòng ẩn được giữ bí mật.`) : null) : null,
          c.tags?.length ? h('div', { class: 'ar-brief__block' }, h('span', { class: 'ar-kicker' }, 'Kỹ năng'), h('div', { class: 'ar-taglist' }, c.tags.map((t) => h('span', { class: 'ar-tag' }, t)))) : null,
          h('div', { class: 'ar-brief__keys' }, h('kbd', null, 'Ctrl'), '+', h('kbd', null, 'Enter'), h('span', null, 'chạy thử với dữ liệu vào')));
      } else if (activeTab === 'hints') {
        node = h('div', { class: 'ar-brief__stack' },
          c.hints.slice(0, hintsShown).map((hint, i) => h('div', { class: 'ar-hint' }, h('span', { class: 'ar-kicker' }, icon('bulb'), `Gợi ý ${i + 1}`), prose(hint))),
          hintsShown < c.hints.length
            ? h('button', { class: 'ar-btn ar-btn--ghost', type: 'button', 'data-hint-next': '', onClick: () => { hintsShown += 1; renderBriefTab(); } }, icon('bulb'), hintsShown ? 'Mở gợi ý tiếp theo' : 'Mở gợi ý đầu tiên')
            : h('p', { class: 'ar-muted' }, 'Bạn đã xem hết gợi ý.'));
      } else {
        const unlocked = solved || failCount >= SOLUTION_AFTER;
        node = unlocked
          ? h('div', { class: 'ar-brief__stack' },
            h('p', { class: 'ar-note ar-note--teal' }, icon('key'), solved ? 'Bạn đã hạ trận này — hãy so sánh với lời giải tham khảo.' : `Lời giải được mở sau ${SOLUTION_AFTER} lần nộp chưa đạt. Hãy đọc hiểu rồi tự viết lại nhé!`),
            h('div', { class: 'code-block ar-code' }, h('div', { class: 'code-block__head' }, h('span', null, 'Lời giải tham khảo')), h('pre', null, h('code', null, raw(highlight(c.solution, c.lang))))))
          : h('div', { class: 'ar-locked' }, h('span', { class: 'ar-locked__ic' }, icon('lock')), h('strong', null, 'Lời giải đang khóa'),
            h('p', null, `Mở khi bạn hạ trận, hoặc sau ${SOLUTION_AFTER} lần nộp chưa đạt (đã nộp ${Math.min(failCount, SOLUTION_AFTER)}/${SOLUTION_AFTER}).`));
      }
      mount(briefBody, node);
      briefBody.scrollTop = 0;
    }

    const brief = h('section', { class: 'ar-brief', 'aria-label': 'Đề bài' }, tabsEl, briefBody);

    /* ------------------------------------------------------------ workbench */
    const ai = practice?.createAIDrawer
      ? practice.createAIDrawer({ signal, getContext: () => ({ code: wb.getCode(), language: c.lang, error: lastError, lesson: `${c.title}\n${(c.task || '').slice(0, 1200)}` }) })
      : null;
    const benchHost = h('section', { class: 'ar-bench', 'aria-label': 'Trình soạn thảo' });
    let resultUI = null;

    const wb = IDE.createWorkbench({
      lang: c.lang,
      code: draft ?? c.starter,
      starter: c.starter,
      tests,
      draftKey,
      signal,
      submitLabel: 'Nộp bài',
      onAskAI: ai ? ({ error }) => { lastError = error || ''; ai.open(error ? 'Em gặp lỗi khi chạy chương trình. Hãy giúp em hiểu lỗi và gợi ý cách sửa (đừng viết hộ toàn bộ lời giải nhé).' : null); } : undefined,
      onSubmitted: async (result) => {
        if (signal.aborted || !result) return;
        lastResult = result;
        lastError = result.results?.find((r) => r.error)?.error || '';
        renderRounds(result);
        const win = result.total > 0 && result.passed === result.total;
        let firstTime = false;
        let xpGained = 0;
        let xpBefore = 0;
        let xpAfter = 0;
        if (win) {
          const p0 = await getProgress();
          xpBefore = totalXp(p0);
          try {
            ({ firstTime, xp: xpGained } = await markComplete('challenges', c.id, c.xp));
          } catch (err) {
            toast(`Chưa lưu được tiến độ: ${err.message}`, { type: 'error' });
          }
          xpAfter = totalXp(await getProgress());
          solved = true;
          stoppedAt = stoppedAt || Date.now();
          timerEl.textContent = clock(elapsed());
          renderXpChip();
          root.classList.add('is-won');
        } else {
          failCount += 1;
          kv.set(attemptsKey, failCount).catch(() => {});
        }
        if (activeTab === 'solution' || (!win && failCount === SOLUTION_AFTER)) renderBriefTab();
        resultUI = showMatchResult(root, {
          win, passed: result.passed, total: result.total, results: result.results || [], tests, challenge: c,
          elapsedMs: elapsed(), firstTime, xpGained, xpBefore, xpAfter,
          solutionUnlocked: !win && failCount >= SOLUTION_AFTER && Boolean(c.solution),
          hasNext: Boolean(next), signal,
          onRetry: () => wb.focus(),
          onNext: () => next && ctx.navigate(`/challenges/${next.id}`),
          onLobby: () => ctx.navigate(lobbyHref.slice(1)),
        });
      },
    });
    benchHost.appendChild(wb.el);

    /* ------------------------------------------------------------ layout + mobile tabs */
    const body = h('div', { class: 'ar-match__body', dataset: { pane: 'brief' } }, brief, benchHost);
    const mtabs = h('div', { class: 'ar-mtabs', role: 'tablist', 'aria-label': 'Chế độ xem' });
    function setPane(p) {
      body.dataset.pane = p;
      mount(mtabs,
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(p === 'brief'), onClick: () => setPane('brief') }, icon('target'), 'Nhiệm vụ'),
        h('button', { type: 'button', role: 'tab', 'aria-selected': String(p === 'code'), onClick: () => { setPane('code'); wb.focus?.(); } }, icon('code'), 'Viết code'));
    }
    setPane('brief');

    const root = h('div', { class: `arena arena--match ${solved ? 'is-solved' : ''} ${boss ? 'is-boss' : ''}`, style: { '--hue': meta.color } },
      h('div', { class: 'ar-match__fx', 'aria-hidden': 'true' }),
      hud, rounds, mtabs, body);
    mount(container, root);
    renderBriefTab();

    // Keyboard: Ctrl/⌘+Enter runs even when focus is outside the editor (the editor handles it itself when focused).
    document.addEventListener('keydown', (e) => {
      if (!(e.ctrlKey || e.metaKey) || e.key !== 'Enter' || e.defaultPrevented) return;
      if (root.querySelector('.ar-result')) return;
      if (wb.el.contains(e.target)) return;
      e.preventDefault();
      setPane('code');
      wb.run();
    }, { signal });

    return () => { resultUI?.close?.(); };
  },
};
