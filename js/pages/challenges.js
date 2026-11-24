// V-Code Edu — Đấu trường (challenge lobby): player card, daily challenge, maps, bosses, filters, grid,
// leaderboard and achievements. Always-dark competitive identity; all numbers come from real data.
import { h, mount, debounce } from '../core/dom.js';
import { icon } from '../components/icons.js';
import { loadChallenges } from '../services/content.js';
import { getProgress, isDone, loadLeaderboard } from '../services/progress.js';
import { appState, bus } from '../core/store.js';
import {
  RANKS, RANK_META, LANG_LABEL, WORLD_HUE, ensureArenaCss, fmt, pad3, cleanTitle, clock, tierFor, levelFor,
  computeStats, dailyChallenge, msToMidnight, dayKey, achievements, rng, prefersReducedMotion, idleWhenHidden,
} from './arena/core.js';
import { rankEmblem, tierEmblem, medal, worldArt, heroLayers, glyph } from './arena/art.js';

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
const initialsOf = (name) => String(name || '?').trim().split(/\s+/).map((w) => w[0]).slice(-2).join('').toUpperCase();
const STATUS = [{ id: 'all', label: 'Tất cả' }, { id: 'todo', label: 'Chưa hạ' }, { id: 'done', label: 'Đã hạ' }];

function openAuth() {
  import('../components/auth-dialog.js').then((m) => m.openAuthDialog()).catch(() => {});
}

/** Reveal elements with a staggered entrance as they scroll into view. */
function createRevealer(signal) {
  const reduced = prefersReducedMotion();
  if (reduced || !('IntersectionObserver' in window)) return { observe: (els) => els.forEach((e) => e.classList.add('is-in')) };
  const io = new IntersectionObserver((entries) => {
    let n = 0;
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      e.target.style.setProperty('--d', `${Math.min(n, 12) * 40}ms`);
      e.target.classList.add('is-in');
      io.unobserve(e.target);
      n += 1;
    }
  }, { rootMargin: '0px 0px -4% 0px', threshold: 0.05 });
  signal.addEventListener('abort', () => io.disconnect());
  return { observe: (els) => els.forEach((e) => io.observe(e)) };
}

function sectionHead(kicker, title, extra) {
  return h('header', { class: 'ar-head' },
    h('div', { class: 'ar-head__text' },
      h('span', { class: 'ar-kicker' }, kicker),
      h('h2', { class: 'ar-head__title' }, title)),
    extra || null);
}

export default {
  title: 'Đấu trường',
  async mount(container, ctx) {
    const { signal } = ctx;
    let data;
    try { [data] = await Promise.all([loadChallenges(), ensureArenaCss()]); } catch (err) {
      mount(container, h('div', { class: 'arena arena--error' }, h('div', { class: 'ar-wrap ar-empty' },
        h('span', { class: 'ar-kicker' }, 'Lỗi kết nối'), h('h1', null, 'Không tải được thử thách'), h('p', null, err.message),
        h('button', { class: 'ar-btn ar-btn--primary', type: 'button', onClick: () => ctx.navigate('/challenges') }, 'Thử lại'))));
      return;
    }
    let progress = await getProgress();
    if (signal.aborted) return;
    const worldsById = Object.fromEntries(data.worlds.map((w) => [w.id, w]));
    const state = {
      world: worldsById[Number(ctx.query.world)] ? Number(ctx.query.world) : 0,
      rank: RANKS.includes(ctx.query.rank) ? ctx.query.rank : 'all',
      status: 'all',
      q: '',
    };
    let stats = computeStats(data, progress);
    const reveal = createRevealer(signal);
    const owner = () => appState.get().user?.key || 'guest';

    /* ------------------------------------------------------------ hero */
    const heroArt = h('div', { class: 'ar-hero__art' }, heroLayers());
    const r = rng('embers');
    const embers = h('div', { class: 'ar-hero__embers', 'aria-hidden': 'true' },
      Array.from({ length: 16 }, () => h('i', { style: `left:${(r() * 100).toFixed(1)}%;--dur:${(7 + r() * 9).toFixed(1)}s;--delay:${(-r() * 12).toFixed(1)}s;--drift:${((r() - 0.5) * 80).toFixed(0)}px;--s:${(2 + r() * 3).toFixed(1)}px` })));
    const playSlot = h('div', { class: 'ar-play-slot' });
    const dailySlot = h('div', { class: 'ar-daily-slot' });
    const playerSlot = h('div', { class: 'ar-player-slot' });
    const langs = new Set(data.challenges.map((c) => c.lang)).size;
    const bossCount = data.challenges.filter((c) => c.boss || c.rank === 'BOSS').length;

    const hero = h('section', { class: 'ar-hero', 'aria-label': 'Sảnh đấu trường' },
      heroArt,
      h('div', { class: 'ar-hero__beams', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      embers,
      h('div', { class: 'ar-hero__fx', 'aria-hidden': 'true' }),
      h('div', { class: 'ar-wrap ar-hero__inner' },
        h('div', { class: 'ar-hero__intro' },
          h('span', { class: 'ar-eyebrow' }, glyph.crosshair(), 'Đấu trường thuật toán'),
          h('h1', { class: 'ar-hero__title' }, h('span', { class: 'ar-hero__title-sm' }, 'V-Code'), h('span', { class: 'ar-hero__title-lg', 'data-text': 'Đấu trường' }, 'Đấu trường')),
          h('p', { class: 'ar-hero__sub' }, `${data.challenges.length} trận đấu lập trình trên ${data.worlds.length} bản đồ. Mỗi trận được chấm bằng bộ test thật, kèm các vòng ẩn kiểm tra trường hợp hiểm hóc.`),
          h('ul', { class: 'ar-facts' },
            h('li', null, h('b', null, String(data.challenges.length)), 'trận'),
            h('li', null, h('b', null, String(data.worlds.length)), 'bản đồ'),
            h('li', null, h('b', null, String(langs)), 'ngôn ngữ'),
            h('li', null, h('b', null, String(bossCount)), 'trùm cuối')),
          playSlot,
          dailySlot),
        playerSlot));

    // parallax (fine pointers only, no reduced motion)
    if (!prefersReducedMotion() && window.matchMedia?.('(pointer: fine)').matches) {
      let raf = 0; let mx = 0; let my = 0;
      hero.addEventListener('pointermove', (e) => {
        const b = hero.getBoundingClientRect();
        mx = ((e.clientX - b.left) / b.width - 0.5) * 2;
        my = ((e.clientY - b.top) / b.height - 0.5) * 2;
        if (!raf) raf = requestAnimationFrame(() => { raf = 0; hero.style.setProperty('--mx', mx.toFixed(3)); hero.style.setProperty('--my', my.toFixed(3)); });
      }, { signal });
      hero.addEventListener('pointerleave', () => { hero.style.setProperty('--mx', '0'); hero.style.setProperty('--my', '0'); }, { signal });
    }

    function renderPlay() {
      const next = stats.nextUp;
      const target = next || dailyChallenge(data, progress, owner());
      mount(playSlot,
        h('div', { class: 'ar-play' },
          h('a', { class: 'ar-play__btn', href: `#/challenges/${target.id}`, 'data-arena-play': '' },
            h('span', { class: 'ar-play__face' },
              h('span', { class: 'ar-play__label' }, next ? 'Vào trận' : 'Chơi lại'),
              h('span', { class: 'ar-play__chev', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')))),
          h('div', { class: 'ar-play__meta' },
            h('span', { class: 'ar-play__k' }, next ? 'Trận kế tiếp' : 'Bạn đã hạ toàn bộ trận — luyện lại'),
            h('span', { class: 'ar-play__v' }, rankEmblem(target.rank, { size: 20 }), h('b', null, `#${pad3(target.stage)}`), h('span', { class: 'truncate' }, cleanTitle(target.title))))));
    }

    /* ------------------------------------------------------------ daily challenge */
    let dailyTimerEl = null;
    let dailyDay = dayKey();
    function renderDaily() {
      const c = dailyChallenge(data, progress, owner());
      const done = isDone(progress, 'challenges', c.id);
      const w = worldsById[c.world];
      dailyTimerEl = h('span', { class: 'ar-daily__time mono' }, clock(msToMidnight()));
      mount(dailySlot,
        h('a', { class: `ar-daily ${done ? 'is-done' : ''}`, href: `#/challenges/${c.id}`, 'data-arena-daily': c.id, style: { '--hue': RANK_META[c.rank].color } },
          h('div', { class: 'ar-daily__tag' }, icon('calendar'), 'Thử thách hôm nay'),
          h('div', { class: 'ar-daily__main' },
            rankEmblem(c.rank, { size: 40 }),
            h('div', { class: 'ar-daily__info' },
              h('div', { class: 'ar-daily__title' }, h('b', { class: 'mono' }, `#${pad3(c.stage)}`), ' ', cleanTitle(c.title)),
              h('div', { class: 'ar-daily__sub' }, `${RANK_META[c.rank].label} · ${LANG_LABEL[c.lang] || c.lang} · ${w ? w.name : ''}`)),
            h('div', { class: 'ar-daily__xp' }, done ? h('span', { class: 'ar-tag ar-tag--teal' }, icon('check'), 'Đã hạ') : h('span', null, h('b', null, `+${c.xp}`), ' XP'))),
          h('div', { class: 'ar-daily__foot' }, icon('clock'), 'Làm mới sau', dailyTimerEl)));
    }
    const timer = setInterval(() => {
      if (document.hidden || !dailyTimerEl) return;
      if (dayKey() !== dailyDay) { dailyDay = dayKey(); renderDaily(); renderPlay(); return; }
      dailyTimerEl.textContent = clock(msToMidnight());
    }, 1000);
    signal.addEventListener('abort', () => clearInterval(timer));

    /* ------------------------------------------------------------ player card */
    function renderPlayer() {
      const { user, authReady } = appState.get();
      const xp = stats.xp;
      const tier = tierFor(xp);
      const lvl = levelFor(xp);
      const name = user ? (user.displayName || user.email || 'Học viên') : 'Khách';
      const avatar = user?.photoURL
        ? h('img', { class: 'ar-player__avatar', src: user.photoURL, alt: '', referrerpolicy: 'no-referrer' })
        : h('span', { class: `ar-player__avatar ${user ? '' : 'is-guest'}`, 'aria-hidden': 'true' }, user ? initialsOf(name) : icon('user'));
      const st = stats.streak;
      mount(playerSlot,
        h('aside', { class: 'ar-player', 'aria-label': 'Thẻ người chơi', style: { '--tier': tier.tier.color, '--tier2': tier.tier.color2 } },
          h('span', { class: 'ar-brackets', 'aria-hidden': 'true' }),
          h('div', { class: 'ar-player__head' },
            avatar,
            h('div', { class: 'ar-player__id' },
              h('span', { class: 'ar-player__name truncate' }, name),
              h('span', { class: 'ar-player__sub truncate' }, user ? (user.school_name || user.email || 'Người chơi') : (authReady ? 'Tiến độ đang lưu trên thiết bị này' : 'Đang kiểm tra đăng nhập…'))),
            h('span', { class: 'ar-level', title: `Cấp ${lvl.level}` }, h('small', null, 'Cấp'), h('b', null, String(lvl.level)))),
          h('div', { class: 'ar-player__rank' },
            h('div', { class: 'ar-player__emblem' }, tierEmblem(tier.index, { size: 104 })),
            h('div', { class: 'ar-player__rankinfo' },
              h('span', { class: 'ar-kicker' }, 'Hạng hiện tại'),
              h('strong', { class: 'ar-player__tier' }, tier.label),
              h('span', { class: 'ar-player__xp' }, h('b', null, fmt(xp)), ' XP'),
              h('div', { class: 'ar-bar', role: 'progressbar', 'aria-label': 'Tiến độ lên hạng', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(tier.pct * 100)) },
                h('i', { style: `--p:${(tier.pct * 100).toFixed(1)}%` })),
              h('span', { class: 'ar-player__next' }, tier.next ? `Còn ${fmt(tier.toNext)} XP để lên ${tier.next.name}` : 'Đã đạt hạng cao nhất'))),
          h('div', { class: 'ar-player__lvl' },
            h('span', null, `Cấp ${lvl.level}`),
            h('div', { class: 'ar-bar ar-bar--thin ar-bar--teal' }, h('i', { style: `--p:${(lvl.pct * 100).toFixed(1)}%` })),
            h('span', { class: 'mono' }, `${fmt(lvl.into)}/${fmt(lvl.need)}`)),
          h('dl', { class: 'ar-player__stats' },
            h('div', null, h('dt', null, 'Trận đã hạ'), h('dd', null, h('b', null, String(stats.solved)), h('small', null, `/${stats.total}`))),
            h('div', null, h('dt', null, 'Trùm đã hạ'), h('dd', null, h('b', null, String(stats.bossesDone)), h('small', null, `/${stats.bosses}`))),
            h('div', { title: `Kỷ lục: ${st.best} ngày` }, h('dt', null, 'Chuỗi ngày'), h('dd', null, h('b', null, String(st.current)), h('small', null, st.current && !st.activeToday ? ' · giữ chuỗi hôm nay' : ' ngày')))),
          !user ? h('div', { class: 'ar-player__cta' },
            h('p', null, 'Đăng nhập để đồng bộ tiến độ và ghi tên lên bảng xếp hạng.'),
            h('button', { class: 'ar-btn ar-btn--primary ar-btn--block', type: 'button', onClick: openAuth, disabled: !authReady }, icon('login'), 'Đăng nhập')) : null));
    }

    /* ------------------------------------------------------------ maps */
    const mapsEl = h('div', { class: 'ar-maps', role: 'group', 'aria-label': 'Chọn bản đồ' });
    function renderMaps() {
      mount(mapsEl, stats.byWorld.map(({ world: w, total, done }) => {
        const pct = total ? done / total : 0;
        const cleared = total && done === total;
        const el = h('button', {
          class: `ar-map ar-rv ${state.world === w.id ? 'is-active' : ''} ${cleared ? 'is-cleared' : ''}`, type: 'button',
          'aria-pressed': String(state.world === w.id), style: { '--hue': WORLD_HUE[w.id] }, 'data-world': String(w.id),
          onClick: () => { setFilter({ world: state.world === w.id ? 0 : w.id }); gridHead.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' }); },
        },
        h('div', { class: 'ar-map__media' }, worldArt(w), h('span', { class: 'ar-map__lang' }, LANG_LABEL[w.lang] || w.lang), cleared ? h('span', { class: 'ar-map__stamp' }, 'Đã chinh phục') : null),
        h('div', { class: 'ar-map__body' },
          h('span', { class: 'ar-map__num' }, `Bản đồ ${pad3(w.id).slice(1)}`),
          h('strong', { class: 'ar-map__name' }, w.name),
          h('p', { class: 'ar-map__desc' }, w.description),
          h('div', { class: 'ar-map__prog' },
            h('div', { class: 'ar-bar ar-bar--thin' }, h('i', { style: `--p:${(pct * 100).toFixed(1)}%` })),
            h('span', { class: 'mono' }, `${done}/${total}`))));
        return el;
      }));
      reveal.observe([...mapsEl.children]);
    }

    /* ------------------------------------------------------------ bosses */
    const bossEl = h('div', { class: 'ar-bosses' });
    function renderBosses() {
      const bosses = data.challenges.filter((c) => c.boss || c.rank === 'BOSS');
      mount(bossEl, bosses.map((c) => {
        const done = isDone(progress, 'challenges', c.id);
        const w = worldsById[c.world];
        return h('a', { class: `ar-boss ar-rv ${done ? 'is-done' : ''}`, href: `#/challenges/${c.id}`, style: { '--hue': WORLD_HUE[c.world] } },
          h('span', { class: 'ar-boss__glow', 'aria-hidden': 'true' }),
          h('div', { class: 'ar-boss__top' },
            h('span', { class: 'ar-boss__world' }, w ? `Bản đồ ${w.id}` : ''),
            rankEmblem('BOSS', { size: 34 })),
          h('span', { class: 'ar-boss__num' }, `#${pad3(c.stage)}`),
          h('strong', { class: 'ar-boss__title' }, cleanTitle(c.title)),
          h('div', { class: 'ar-boss__foot' },
            h('span', null, LANG_LABEL[c.lang] || c.lang),
            h('span', { class: 'ar-boss__xp' }, `+${c.xp} XP`),
            done ? h('span', { class: 'ar-tag ar-tag--teal' }, icon('check'), 'Đã hạ') : h('span', { class: 'ar-tag ar-tag--red' }, glyph.skull(), 'Thách đấu')));
      }));
      reveal.observe([...bossEl.children]);
    }

    /* ------------------------------------------------------------ near completion */
    const nearEl = h('div', { class: 'ar-panel ar-near' });
    function renderNear() {
      const inProgress = stats.byWorld.filter((x) => x.done > 0 && x.done < x.total).sort((a, b) => (b.done / b.total) - (a.done / a.total));
      const head = h('header', { class: 'ar-panel__head' }, h('h3', null, icon('target'), 'Gần hoàn thành'));
      if (!inProgress.length) {
        mount(nearEl, head, h('p', { class: 'ar-muted' }, stats.solved ? 'Bạn đã chinh phục trọn các bản đồ đang chơi. Hãy mở một bản đồ mới!' : 'Hạ trận đầu tiên để theo dõi bản đồ bạn sắp chinh phục.'));
        return;
      }
      const top = inProgress[0];
      const left = data.challenges.filter((c) => c.world === top.world.id && !isDone(progress, 'challenges', c.id));
      mount(nearEl, head,
        h('div', { class: 'ar-near__world', style: { '--hue': WORLD_HUE[top.world.id] } },
          h('span', null, top.world.name),
          h('b', { class: 'mono' }, `${top.done}/${top.total}`)),
        h('div', { class: 'ar-bar ar-bar--thin', style: { '--bar': WORLD_HUE[top.world.id] } }, h('i', { style: `--p:${(top.done / top.total * 100).toFixed(1)}%` })),
        h('p', { class: 'ar-muted' }, `Còn ${left.length} trận để chinh phục bản đồ này.`),
        h('ul', { class: 'ar-near__list' }, left.slice(0, 4).map((c) => h('li', null,
          h('a', { href: `#/challenges/${c.id}` }, rankEmblem(c.rank, { size: 22 }), h('b', { class: 'mono' }, `#${pad3(c.stage)}`), h('span', { class: 'truncate' }, cleanTitle(c.title)), h('small', null, `+${c.xp}`))))),
        inProgress.length > 1 ? h('p', { class: 'ar-muted ar-near__more' }, `Đang chơi dở ${inProgress.length} bản đồ.`) : null);
    }

    /* ------------------------------------------------------------ filters + grid */
    const search = h('input', { class: 'ar-input', type: 'search', placeholder: 'Tìm trận: tên, chủ đề, số…', 'aria-label': 'Tìm trận đấu', autocomplete: 'off' });
    const rankChips = h('div', { class: 'ar-chips', role: 'group', 'aria-label': 'Lọc theo hạng' });
    const statusSeg = h('div', { class: 'ar-seg', role: 'group', 'aria-label': 'Lọc theo trạng thái' });
    const worldSelect = h('select', { class: 'ar-select', 'aria-label': 'Lọc theo bản đồ', onChange: (e) => setFilter({ world: Number(e.target.value) }) });
    const countEl = h('span', { class: 'ar-count' });
    const resetBtn = h('button', { class: 'ar-btn ar-btn--ghost ar-btn--sm', type: 'button', onClick: () => { search.value = ''; setFilter({ world: 0, rank: 'all', status: 'all', q: '' }); } }, icon('x'), 'Bỏ lọc');
    const grid = h('div', { class: 'ar-grid' });
    const gridHead = sectionHead('Danh sách trận đấu', 'Chọn trận', countEl);
    const worldBanner = h('div', { class: 'ar-world-banner-slot' });

    function renderFilters() {
      mount(rankChips,
        h('button', { class: 'ar-chip', type: 'button', 'aria-pressed': String(state.rank === 'all'), onClick: () => setFilter({ rank: 'all' }) }, icon('grid'), h('span', null, 'Mọi hạng')),
        RANKS.map((rk) => h('button', { class: 'ar-chip', type: 'button', 'aria-pressed': String(state.rank === rk), 'data-rank': rk, title: `${RANK_META[rk].label} — ${RANK_META[rk].name}`, style: { '--hue': RANK_META[rk].color }, onClick: () => setFilter({ rank: state.rank === rk ? 'all' : rk }) },
          rankEmblem(rk, { size: 22 }), h('span', null, rk === 'BOSS' ? 'Trùm' : rk), h('small', null, String(stats.byRank[rk].total)))));
      mount(statusSeg, STATUS.map((s) => h('button', { type: 'button', 'aria-pressed': String(state.status === s.id), 'data-status': s.id, onClick: () => setFilter({ status: s.id }) }, s.label)));
      mount(worldSelect, h('option', { value: '0', selected: state.world === 0 }, 'Mọi bản đồ'), data.worlds.map((w) => h('option', { value: String(w.id), selected: state.world === w.id }, `${w.id}. ${w.name}`)));
      resetBtn.hidden = !(state.world || state.rank !== 'all' || state.status !== 'all' || state.q);
    }

    function filtered() {
      const ql = fold(state.q.trim().replace(/^#/, ''));
      return data.challenges.filter((c) => (!state.world || c.world === state.world)
        && (state.rank === 'all' || c.rank === state.rank)
        && (state.status === 'all' || (state.status === 'done') === isDone(progress, 'challenges', c.id))
        && (!ql || (/^\d+$/.test(ql) ? String(c.stage) === String(Number(ql)) || fold(c.title).includes(ql) : fold([c.title, c.task, ...(c.tags || []), LANG_LABEL[c.lang]].join(' ')).includes(ql))));
    }

    function card(c) {
      const done = isDone(progress, 'challenges', c.id);
      const boss = c.boss || c.rank === 'BOSS';
      const meta = RANK_META[c.rank] || RANK_META.D;
      return h('a', {
        class: `stage-card ar-card ${done ? 'is-done' : ''} ${boss ? 'is-boss' : ''}`, href: `#/challenges/${c.id}`,
        style: { '--hue': meta.color }, 'data-rank': c.rank, 'data-id': c.id,
        'aria-label': `Trận ${c.stage}: ${cleanTitle(c.title)}. ${meta.label}, ${LANG_LABEL[c.lang] || c.lang}, ${c.xp} XP${done ? ', đã hạ' : ''}`,
      },
      h('span', { class: 'ar-card__sweep', 'aria-hidden': 'true' }),
      h('div', { class: 'ar-card__top' },
        h('span', { class: 'ar-card__num' }, pad3(c.stage)),
        h('span', { class: 'ar-card__rank' }, rankEmblem(c.rank, { size: 30 }), h('small', null, boss ? 'Trùm' : c.rank))),
      h('h3', { class: 'ar-card__title' }, cleanTitle(c.title)),
      h('div', { class: 'ar-card__meta' },
        h('span', { class: 'ar-card__lang' }, LANG_LABEL[c.lang] || c.lang),
        h('span', { class: 'ar-card__xp' }, icon('zap'), `${c.xp} XP`),
        h('span', { class: 'ar-card__state' }, done ? [icon('check'), 'Đã hạ'] : `BĐ ${c.world}`)));
    }

    function renderGrid({ animate = true } = {}) {
      const list = filtered();
      countEl.textContent = `${list.length}/${data.challenges.length} trận`;
      const w = state.world ? worldsById[state.world] : null;
      mount(worldBanner, w ? h('div', { class: 'ar-world-banner', style: { '--hue': WORLD_HUE[w.id] } },
        h('div', null, h('span', { class: 'ar-kicker' }, `Bản đồ ${w.id} · ${LANG_LABEL[w.lang] || w.lang}`), h('strong', null, w.name), h('p', null, w.description)),
        h('button', { class: 'ar-btn ar-btn--ghost ar-btn--sm', type: 'button', onClick: () => setFilter({ world: 0 }) }, icon('x'), 'Mọi bản đồ')) : null);
      if (!list.length) {
        mount(grid, h('div', { class: 'ar-empty' }, glyph.crosshair(), h('strong', null, 'Không có trận phù hợp'), h('p', null, 'Thử bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm.')));
        return;
      }
      const cards = list.map(card);
      mount(grid, cards);
      if (animate) reveal.observe(cards); else cards.forEach((c) => c.classList.add('is-in'));
    }

    function setFilter(patch) {
      Object.assign(state, patch);
      renderFilters();
      mapsEl.querySelectorAll('.ar-map').forEach((m) => {
        const on = Number(m.dataset.world) === state.world;
        m.classList.toggle('is-active', on);
        m.setAttribute('aria-pressed', String(on));
      });
      renderGrid();
      const qs = new URLSearchParams();
      if (state.world) qs.set('world', String(state.world));
      if (state.rank !== 'all') qs.set('rank', state.rank);
      const target = `#/challenges${qs.toString() ? `?${qs}` : ''}`;
      if (location.hash !== target) history.replaceState(null, '', target);
    }

    const onSearch = debounce(() => { state.q = search.value; renderFilters(); renderGrid(); }, 140);
    search.addEventListener('input', onSearch, { signal });
    signal.addEventListener('abort', () => onSearch.cancel());

    /* ------------------------------------------------------------ leaderboard */
    const boardEl = h('section', { class: 'ar-panel ar-board', 'aria-label': 'Bảng xếp hạng' });
    function boardHead(extra) {
      return h('header', { class: 'ar-panel__head' }, h('h3', null, icon('trophy'), 'Bảng xếp hạng'), extra || null);
    }
    async function renderBoard() {
      mount(boardEl, boardHead(h('span', { class: 'ar-tag' }, 'Top 10')),
        h('div', { class: 'ar-board__skel' }, Array.from({ length: 5 }, () => h('i'))));
      if (!appState.get().online) {
        mount(boardEl, boardHead(), h('p', { class: 'ar-muted' }, icon('wifi-off'), ' Bạn đang ngoại tuyến. Bảng xếp hạng cần kết nối Internet.'));
        return;
      }
      try {
        const rows = await loadLeaderboard(10);
        if (signal.aborted) return;
        const me = appState.get().user?.key;
        const meIn = rows.some((x) => x.key === me);
        mount(boardEl, boardHead(h('span', { class: 'ar-tag' }, 'Top 10')),
          rows.length
            ? h('ol', { class: 'ar-board__list' }, rows.map((row) => {
              const t = tierFor(row.xp);
              return h('li', { class: `${row.key === me ? 'is-me' : ''} ${row.rank <= 3 ? `is-top is-top${row.rank}` : ''}` },
                h('span', { class: 'ar-board__pos' }, String(row.rank)),
                h('span', { class: 'ar-board__ava', 'aria-hidden': 'true' }, initialsOf(row.name || 'Học viên')),
                h('span', { class: 'ar-board__who' },
                  h('span', { class: 'truncate' }, row.name || 'Học viên', row.key === me ? h('em', null, ' · Bạn') : null),
                  row.school ? h('small', { class: 'truncate' }, row.school) : null),
                h('span', { class: 'ar-board__tier', title: t.label }, tierEmblem(t.index, { size: 26 })),
                h('b', { class: 'ar-board__xp mono' }, fmt(row.xp)));
            }))
            : h('p', { class: 'ar-muted' }, 'Chưa có ai trên bảng xếp hạng. Hãy là người đầu tiên!'),
          !me ? h('div', { class: 'ar-board__note' }, h('span', null, 'Đăng nhập để tên bạn xuất hiện trên bảng xếp hạng.'), h('button', { class: 'ar-btn ar-btn--ghost ar-btn--sm', type: 'button', onClick: openAuth }, 'Đăng nhập'))
            : (!meIn && rows.length ? h('p', { class: 'ar-board__note ar-muted' }, `Bạn chưa vào Top 10 — hiện có ${fmt(stats.xp)} XP.`) : null));
      } catch (err) {
        if (signal.aborted) return;
        mount(boardEl, boardHead(), h('p', { class: 'ar-muted' }, `Chưa tải được bảng xếp hạng (${err?.code || err?.message || 'lỗi'}).`),
          h('button', { class: 'ar-btn ar-btn--ghost ar-btn--sm', type: 'button', onClick: () => renderBoard() }, icon('refresh'), 'Thử lại'));
      }
    }

    /* ------------------------------------------------------------ achievements */
    const achEl = h('section', { class: 'ar-panel ar-ach', 'aria-label': 'Huy hiệu' });
    function renderAch() {
      const list = achievements(stats);
      const got = list.filter((a) => a.done).length;
      mount(achEl,
        h('header', { class: 'ar-panel__head' }, h('h3', null, glyph.medal(), 'Huy hiệu'), h('span', { class: 'ar-tag' }, `${got}/${list.length}`)),
        h('ul', { class: 'ar-ach__grid' }, list.map((a) => h('li', { class: `ar-medal ${a.done ? 'is-on' : 'is-off'}`, title: `${a.name} — ${a.desc}${a.done ? ' (đã mở khóa)' : ` (${a.value}/${a.goal})`}`, 'data-ach': a.id },
          h('div', { class: 'ar-medal__icon' }, medal(a, { size: 52 }), a.done ? null : h('span', { class: 'ar-medal__lock' }, icon('lock'))),
          h('strong', null, a.name),
          h('small', null, a.done ? a.desc : `${a.value}/${a.goal}`)))));
    }

    /* ------------------------------------------------------------ layout */
    const root = h('div', { class: 'arena arena--lobby' },
      hero,
      h('div', { class: 'ar-wrap ar-body' },
        h('section', { class: 'ar-section', id: 'ar-maps' }, sectionHead('Bản đồ', 'Chọn chiến trường', h('span', { class: 'ar-head__hint' }, 'Bấm một bản đồ để lọc danh sách trận')), mapsEl),
        h('section', { class: 'ar-section ar-section--boss' }, sectionHead('Trùm cuối', 'Thử thách sinh tử', h('span', { class: 'ar-head__hint' }, 'Mỗi bản đồ kết thúc bằng một trận Trùm')), bossEl),
        h('div', { class: 'ar-main' },
          h('section', { class: 'ar-section ar-list', 'aria-label': 'Danh sách trận đấu' },
            gridHead,
            h('div', { class: 'ar-filters' },
              rankChips,
              h('div', { class: 'ar-filters__row' },
                h('label', { class: 'ar-search' }, icon('search'), search),
                statusSeg,
                worldSelect,
                resetBtn)),
            worldBanner,
            grid),
          h('aside', { class: 'ar-side' }, nearEl, boardEl, achEl))));

    mount(container, root);
    idleWhenHidden(hero, signal);

    function renderAll({ animate = true } = {}) {
      stats = computeStats(data, progress);
      renderPlayer();
      renderPlay();
      renderDaily();
      renderMaps();
      renderBosses();
      renderNear();
      renderFilters();
      renderGrid({ animate });
      renderAch();
    }
    renderAll();
    renderBoard();

    bus.on('progress:change', (p) => { progress = p; renderAll({ animate: false }); }, { signal });
    appState.subscribe((s, prev) => {
      if (s.user !== prev.user || s.authReady !== prev.authReady) {
        renderPlayer();
        if (s.user?.key !== prev.user?.key) renderBoard();
      }
      if (s.online !== prev.online && s.online) renderBoard();
    }, { signal });
  },
};
