// V-Code Edu — learning dashboard: greeting band with real progress, course catalog
// (tabs, search, track filter), "continue" card and the connected learning path.
import { h, mount } from '../core/dom.js';
import { icon } from '../components/icons.js';
import { loadCatalog, loadCourse, loadChallenges } from '../services/content.js';
import { getProgress, isDone, totalXp } from '../services/progress.js';
import { emptyState } from '../core/ui.js';
import { appState, bus } from '../core/store.js';
import { courseTheme, themeVars, courseArt, courseEmblem, TRACK_STYLE } from './learn/course-art.js';
import { courseDoneCount, pct, bar, ring, lastOpenedLesson, enableTilt } from './learn/shared.js';

const fmt = (n) => Number(n || 0).toLocaleString('vi-VN');

/** Colourful course card (old V-Code identity, real numbers only). */
export function courseCard(course, progress, index = 0) {
  const theme = courseTheme(course);
  const total = course.lessons_count || 0;
  const done = courseDoneCount(progress, course.id);
  const p = pct(done, total);
  const state = total && done >= total ? 'done' : done ? 'learning' : 'new';
  const cta = { new: 'Đăng ký', learning: 'Vào học', done: 'Ôn tập' }[state];
  return h('a', {
    class: `course-card is-${state}`,
    href: `#/learn/${course.id}`,
    style: { ...themeVars(theme), '--i': String(index) },
    'aria-label': `${course.title} — ${done ? `hoàn thành ${done}/${total} bài` : `${total} bài, miễn phí`}`,
  },
  h('div', { class: 'course-card__banner' },
    h('span', { class: 'course-card__dot', 'aria-hidden': 'true' }, state === 'done' ? icon('check') : null),
    h('div', { class: 'course-card__heading' },
      h('h3', { class: 'course-card__btitle' }, theme.banner),
      h('p', { class: 'course-card__bsub' }, theme.sub)),
    courseArt(theme, 'course-card__art')),
  h('div', { class: 'course-card__body' },
    h('span', { class: 'course-card__tag' }, `Khóa học • ${total} bài`),
    h('h4', { class: 'course-card__title' }, course.title),
    h('p', { class: 'course-card__meta' }, `V-Code Edu • Hoàn thành ${done}/${total}`),
    h('div', { class: 'course-card__facts' },
      h('span', null, icon('gauge'), course.level || 'Cơ bản'),
      h('span', null, icon('layers'), `${course.chapters_count} chương`),
      h('span', null, icon('zap'), `${fmt(course.xp_total)} XP`)),
    bar(p, 'course-card__bar'),
    h('div', { class: 'course-card__foot' },
      h('span', { class: 'course-card__price' }, 'Miễn phí'),
      h('span', { class: 'course-card__cta' }, cta, state === 'new' ? null : icon('arrow-right')))));
}

export default {
  title: 'Học lập trình',
  async mount(container, ctx) {
    let catalog;
    try { catalog = await loadCatalog(); } catch (err) {
      mount(container, h('div', { class: 'container page' }, emptyState({ iconName: 'alert', title: 'Không tải được danh sách khóa học', text: err.message })));
      return;
    }
    const [progressRes, challengesRes] = await Promise.allSettled([getProgress(), loadChallenges()]);
    let progress = progressRes.status === 'fulfilled' ? progressRes.value : { lessons: {}, challenges: {} };
    const challengeIds = challengesRes.status === 'fulfilled' ? (challengesRes.value.challenges || []).map((c) => c.id) : null;

    const available = catalog.tracks.filter((t) => t.status === 'available');
    const roadmap = catalog.tracks.filter((t) => t.status === 'roadmap');
    const totalLessons = catalog.courses.reduce((s, c) => s + (c.lessons_count || 0), 0);
    let tab = ['all', 'learning', 'done'].includes(ctx.query.tab) ? ctx.query.tab : 'all';
    let filter = available.some((t) => t.id === ctx.query.track) ? ctx.query.track : 'all';
    let q = '';

    const stateOf = (c) => {
      const d = courseDoneCount(progress, c.id);
      return c.lessons_count && d >= c.lessons_count ? 'done' : d ? 'learning' : 'new';
    };

    /* ---------------- dashboard band ---------------- */
    const band = h('section', { class: 'lx-band', 'aria-label': 'Tổng quan học tập' });
    function renderBand() {
      const { user } = appState.get();
      const perCourse = catalog.courses.map((c) => ({ c, done: courseDoneCount(progress, c.id) }));
      const started = perCourse.filter((x) => x.done > 0).length;
      const finished = perCourse.filter((x) => x.c.lessons_count && x.done >= x.c.lessons_count).length;
      const lessonsDone = perCourse.reduce((s, x) => s + Math.min(x.done, x.c.lessons_count || 0), 0);
      const solved = challengeIds ? challengeIds.filter((id) => isDone(progress, 'challenges', id)).length : Object.keys(progress.challenges || {}).length;
      const xp = totalXp(progress);
      const name = user ? (user.displayName || (user.email || '').split('@')[0] || 'bạn') : 'bạn';
      const initials = (user?.displayName || user?.email || 'V').trim().split(/\s+/).map((w) => w[0]).slice(-2).join('').toUpperCase();
      const avatar = user?.photoURL
        ? h('img', { class: 'lx-avatar', src: user.photoURL, alt: '', referrerpolicy: 'no-referrer' })
        : h('span', { class: 'lx-avatar', 'aria-hidden': 'true' }, user ? initials : icon('user'));
      const overall = pct(lessonsDone, totalLessons);

      const stat = (label, value, total, sub, tone) => h('div', { class: `lx-stat lx-stat--${tone}` },
        h('span', { class: 'lx-stat__label' }, label),
        h('strong', { class: 'lx-stat__num' }, String(value), total != null ? h('small', null, `/${total}`) : null),
        bar(total ? pct(value, total) : 0, 'lx-bar--band'),
        h('span', { class: 'lx-stat__sub' }, sub));

      mount(band,
        h('div', { class: 'lx-band__deco', 'aria-hidden': 'true' },
          h('span', { class: 'lx-glyph', style: '--x:72%;--y:18%;--d:0s' }, '{ }'),
          h('span', { class: 'lx-glyph', style: '--x:90%;--y:62%;--d:-3s' }, '</>'),
          h('span', { class: 'lx-glyph', style: '--x:58%;--y:78%;--d:-6s' }, '=>'),
          h('span', { class: 'lx-glyph', style: '--x:96%;--y:12%;--d:-1.5s' }, '#')),
        h('div', { class: 'container lx-band__inner' },
          h('p', { class: 'lx-greet' },
            'Xin chào ', h('strong', null, name), '. Chào mừng bạn đến với V-Code Edu. Hãy ',
            h('a', { class: 'lx-hl', href: '#learn-catalog', onClick: (e) => { e.preventDefault(); document.getElementById('learn-catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'khám phá'),
            ' nhé!'),
          h('div', { class: 'lx-dash' },
            h('div', { class: 'lx-profile' },
              h('div', { class: 'lx-profile__row' },
                avatar,
                h('div', { class: 'grow' },
                  h('strong', { class: 'lx-profile__name truncate' }, user ? (user.displayName || name) : 'Khách trải nghiệm'),
                  h('span', { class: 'lx-profile__sub' }, `Lộ trình lập trình ${fmt(totalLessons)} bài học`))),
              bar(overall, 'lx-bar--profile'),
              h('div', { class: 'lx-profile__foot' },
                h('span', null, `${overall}% lộ trình`),
                h('span', { class: 'lx-profile__xp' }, icon('zap'), `${fmt(xp)} XP`)),
              user ? null : h('button', {
                class: 'lx-signin', type: 'button',
                onClick: async () => {
                  const { openAuthDialog } = await import('../components/auth-dialog.js');
                  openAuthDialog({ reason: 'Đăng nhập để lưu tiến độ học tập lên đám mây và học tiếp trên mọi thiết bị.' });
                },
              }, icon('login'), 'Đăng nhập để đồng bộ tiến độ')),
            h('div', { class: 'lx-stats' },
              stat('Khóa học', started, catalog.courses.length, finished ? `${finished} khóa đã hoàn thành` : 'Đã bắt đầu học', 'course'),
              stat('Luyện tập (Bài học)', lessonsDone, totalLessons, lessonsDone ? `${overall}% tổng số bài` : 'Chưa có bài nào', 'lesson'),
              stat('Thử thách', solved, challengeIds ? challengeIds.length : null, solved ? 'Đã giải thành công' : 'Thử sức ngay', 'quest'))),
          user ? null : h('p', { class: 'lx-band__note' }, icon('info'), 'Bạn chưa đăng nhập — tiến độ vẫn được lưu trên thiết bị này và sẽ tự gộp vào tài khoản khi bạn đăng nhập.')));
    }

    /* ---------------- continue card ---------------- */
    const continueSlot = h('div', { class: 'lx-continue-slot' });
    async function renderContinue() {
      const courseIds = new Set(catalog.courses.map((c) => c.id));
      let pick = null;
      const last = await lastOpenedLesson();
      if (last && courseIds.has(last.course)) pick = { course: last.course, lesson: last.lesson, at: last.at };
      const ownerOf = (lessonId) => [...courseIds].filter((cid) => lessonId.startsWith(`${cid}-`)).sort((a, b) => b.length - a.length)[0];
      const completions = Object.entries(progress.lessons || {}).map(([id, v]) => ({ id, at: Number(v?.at) || 0, course: ownerOf(id) })).sort((a, b) => b.at - a.at);
      const recent = completions.find((x) => x.course);
      if (recent && (!pick || recent.at > pick.at)) pick = { course: recent.course, lesson: recent.id, at: recent.at };
      let mode = 'continue';
      if (!pick) { pick = { course: catalog.courses[0]?.id }; mode = 'start'; }
      if (!pick.course) return;
      let course;
      try { course = await loadCourse(pick.course); } catch { return; }
      if (ctx.signal.aborted) return;
      const flat = course.chapters.flatMap((ch, ci) => ch.lessons.map((l) => ({ ...l, chapter: ch, ci })));
      let i = Math.max(0, flat.findIndex((l) => l.id === pick.lesson));
      if (mode === 'continue' && isDone(progress, 'lessons', flat[i]?.id)) {
        const after = flat.findIndex((l, j) => j > i && !isDone(progress, 'lessons', l.id));
        const any = flat.findIndex((l) => !isDone(progress, 'lessons', l.id));
        i = after !== -1 ? after : any !== -1 ? any : i;
      }
      const lesson = flat[i];
      if (!lesson) return;
      const meta = catalog.courses.find((c) => c.id === course.id) || course;
      const theme = courseTheme(meta);
      const done = courseDoneCount(progress, course.id);
      const allDone = done >= flat.length;
      const eyebrow = mode === 'start' ? 'Gợi ý bắt đầu' : allDone ? 'Ôn tập lại' : 'Tiếp tục học';
      mount(continueSlot, h('a', { class: 'lx-continue', href: `#/learn/${course.id}/${lesson.id}`, style: themeVars(theme) },
        h('div', { class: 'lx-continue__art' }, courseArt(theme)),
        h('div', { class: 'lx-continue__body' },
          h('span', { class: 'lx-eyebrow' }, icon(mode === 'start' ? 'rocket' : 'play'), eyebrow),
          h('strong', { class: 'lx-continue__title' }, lesson.title),
          h('span', { class: 'lx-continue__meta' }, `${meta.title} • Chương ${lesson.ci + 1}: ${lesson.chapter.title} • Bài ${i + 1}/${flat.length}`),
          bar(pct(done, flat.length), 'lx-continue__bar')),
        h('span', { class: 'lx-continue__btn' }, mode === 'start' ? 'Bắt đầu' : 'Học tiếp', icon('arrow-right'))));
    }

    /* ---------------- catalog ---------------- */
    const tabsEl = h('div', { class: 'lx-tabs', role: 'tablist', 'aria-label': 'Danh sách khóa học' });
    const summary = h('span', { class: 'lx-tabs__summary' });
    const search = h('input', { class: 'lx-search__input', type: 'search', placeholder: 'Tìm khóa học: Python, web, thuật toán, AI…', 'aria-label': 'Tìm khóa học' });
    const chips = h('div', { class: 'lx-chips', role: 'group', 'aria-label': 'Lọc theo lộ trình' });
    const grid = h('div', { class: 'lx-grid', id: 'learn-grid', role: 'tabpanel' });

    function renderTabs() {
      const counts = { all: catalog.courses.length, learning: 0, done: 0 };
      for (const c of catalog.courses) { const s = stateOf(c); if (s !== 'new') counts[s] += 1; }
      const defs = [
        { id: 'all', label: 'Khóa học gợi ý' },
        { id: 'learning', label: `Đang học (${counts.learning})` },
        { id: 'done', label: `Đã hoàn thành (${counts.done})` },
      ];
      mount(tabsEl, defs.map((t) => h('button', {
        class: 'lx-tab', type: 'button', role: 'tab', 'aria-selected': String(tab === t.id), 'aria-controls': 'learn-grid',
        onClick: () => { tab = t.id; renderTabs(); renderGrid(); },
      }, t.label)));
      mount(summary, `${catalog.courses.length} khóa học • ${fmt(totalLessons)} bài học • Miễn phí`);
    }
    function renderChips() {
      mount(chips, [{ id: 'all', title: 'Tất cả' }, ...available].map((t) => h('button', {
        class: 'lx-chip', type: 'button', 'aria-pressed': String(filter === t.id),
        onClick: () => { filter = t.id; renderChips(); renderGrid(); },
      }, t.id !== 'all' ? icon(TRACK_STYLE[t.id]?.icon || 'book') : icon('grid'), t.title)));
    }
    function renderGrid() {
      const ql = q.trim().toLowerCase();
      const courses = catalog.courses.filter((c) => (filter === 'all' || c.track === filter)
        && (tab === 'all' || stateOf(c) === tab)
        && (!ql || [c.title, c.subtitle, c.description, c.level, ...(c.tags || [])].join(' ').toLowerCase().includes(ql)));
      const empty = tab === 'learning' && !ql && filter === 'all'
        ? emptyState({ iconName: 'book-open', title: 'Bạn chưa bắt đầu khóa học nào', text: 'Chọn một khóa trong "Khóa học gợi ý" và làm bài đầu tiên — tiến độ sẽ hiện ở đây.' })
        : tab === 'done' && !ql && filter === 'all'
          ? emptyState({ iconName: 'trophy', title: 'Chưa có khóa học nào hoàn thành', text: 'Hoàn thành tất cả bài trong một khóa để nhận huy hiệu hoàn thành tại đây.' })
          : emptyState({ iconName: 'search', title: 'Không có khóa học phù hợp', text: 'Thử từ khóa khác hoặc chọn "Tất cả".' });
      mount(grid, courses.length ? courses.map((c, i) => courseCard(c, progress, i)) : empty);
    }
    search.addEventListener('input', () => { q = search.value; renderGrid(); }, { signal: ctx.signal });

    /* ---------------- learning path ---------------- */
    const pathEl = h('div', { class: 'lx-path-wrap' });
    function renderPath() {
      const nodes = available.map((t, ti) => {
        const courses = (t.courses || []).map((cid) => catalog.courses.find((x) => x.id === cid)).filter(Boolean);
        const total = courses.reduce((s, c) => s + (c.lessons_count || 0), 0);
        const done = courses.reduce((s, c) => s + Math.min(courseDoneCount(progress, c.id), c.lessons_count || 0), 0);
        const p = pct(done, total);
        const lead = courseTheme(catalog.courses.find((c) => c.id === TRACK_STYLE[t.id]?.course) || courses[0] || {});
        return h('li', { class: `lx-node ${p >= 100 ? 'is-done' : p > 0 ? 'is-active' : ''}`, style: { ...themeVars(lead), '--i': String(ti) } },
          h('div', { class: 'lx-node__marker' },
            h('span', { class: 'lx-node__icon', style: { '--pct': String(p) } }, h('span', null, icon(TRACK_STYLE[t.id]?.icon || 'book'))),
            h('span', { class: 'lx-node__step' }, `Chặng ${ti + 1}`)),
          h('div', { class: 'lx-node__card' },
            h('div', { class: 'lx-node__head' },
              h('h3', null, t.title),
              h('span', { class: 'lx-node__pct' }, p ? `${p}%` : `${total} bài`)),
            h('p', { class: 'lx-node__desc' }, t.description),
            h('div', { class: 'lx-node__courses' },
              courses.map((c) => {
                const th = courseTheme(c);
                const d = courseDoneCount(progress, c.id);
                return h('a', { class: 'lx-node__course', href: `#/learn/${c.id}` },
                  courseEmblem(th), h('span', { class: 'grow truncate' }, c.title),
                  h('span', { class: 'lx-node__count' }, `${d}/${c.lessons_count}`));
              }),
              t.id === 'algorithms' ? h('a', { class: 'lx-node__course lx-node__course--prism', href: '#/prism' }, h('span', { class: 'lx-emblem lx-emblem--prism' }, icon('prism')), h('span', { class: 'grow truncate' }, 'Lăng kính thuật toán'), icon('arrow-right')) : null)));
      });
      mount(pathEl,
        h('ol', { class: 'lx-path' }, nodes),
        roadmap.length ? h('div', { class: 'lx-future' },
          h('div', { class: 'lx-future__head' },
            h('span', { class: 'lx-eyebrow lx-eyebrow--ai' }, icon('rocket'), 'Sắp ra mắt'),
            h('p', null, 'Các lộ trình đang được xây dựng — chưa mở để học.')),
          h('ul', { class: 'lx-future__list' }, roadmap.map((t) => h('li', { class: 'lx-future__item', title: t.description || '' },
            h('span', { class: 'lx-future__icon' }, icon(TRACK_STYLE[t.id]?.icon || 'rocket')),
            h('span', { class: 'grow' }, h('strong', null, t.title), t.topics?.length ? h('small', null, t.topics.slice(0, 3).join(' · ')) : null))))) : null);
    }

    bus.on('progress:change', (p) => {
      progress = p || progress;
      renderBand(); renderTabs(); renderGrid(); renderPath(); renderContinue();
    }, { signal: ctx.signal });
    appState.subscribe((s, prev) => { if (s.user !== prev.user) { renderBand(); renderContinue(); } }, { signal: ctx.signal });

    mount(container,
      h('div', { class: 'lx' },
        band,
        h('div', { class: 'container lx-main' },
          continueSlot,
          h('section', { class: 'lx-catalog', id: 'learn-catalog', 'aria-label': 'Khóa học' },
            h('div', { class: 'lx-tabsbar' }, tabsEl, summary),
            h('div', { class: 'lx-toolbar' },
              h('label', { class: 'lx-search' }, icon('search'), search),
              chips),
            grid),
          h('section', { class: 'lx-path-section', 'aria-labelledby': 'lx-path-title' },
            h('div', { class: 'lx-section-head' },
              h('span', { class: 'lx-eyebrow' }, icon('git-branch'), 'Lộ trình học'),
              h('h2', { id: 'lx-path-title' }, 'Bản đồ hành trình lập trình'),
              h('p', null, 'Đi từ nền tảng đến thuật toán và trí tuệ nhân tạo. Mỗi chặng gồm các khóa học được chấm bài tự động ngay trên trình duyệt.')),
            pathEl))));
    renderBand();
    renderTabs();
    renderChips();
    renderGrid();
    renderPath();
    renderContinue();
    enableTilt(grid, ctx.signal);
  },
};
