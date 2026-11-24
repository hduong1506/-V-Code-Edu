// V-Code Edu — course page: coloured hero with illustration, chapter timeline (accordion),
// sticky "continue" side card. All numbers come from the course data and real progress.
import { h, mount } from '../core/dom.js';
import { icon } from '../components/icons.js';
import { loadCourse, loadCatalog, DIFFICULTY_LABEL } from '../services/content.js';
import { getProgress, isDone } from '../services/progress.js';
import { emptyState } from '../core/ui.js';
import { markdown } from '../components/markdown.js';
import { bus } from '../core/store.js';
import { courseTheme, themeVars, courseArt, courseEmblem } from './learn/course-art.js';
import { pct, bar, ring } from './learn/shared.js';

const DIFF_TONE = { easy: 'easy', medium: 'medium', hard: 'hard' };

function lessonKinds(l) {
  const kinds = [];
  if (l.theory) kinds.push({ icon: 'book-open', label: 'Lý thuyết' });
  if (l.checks?.length) kinds.push({ icon: 'globe', label: `Chấm giao diện (${l.checks.length} tiêu chí)` });
  else if (l.tests?.length) kinds.push({ icon: 'terminal', label: `Bài tập code (${l.tests.length} bộ test)` });
  if (l.prism) kinds.push({ icon: 'prism', label: 'Có minh họa trong Lăng kính thuật toán' });
  return kinds;
}

export default {
  title: 'Khóa học',
  async mount(container, ctx) {
    let course;
    try { course = await loadCourse(ctx.params.course); } catch (err) {
      mount(container, h('div', { class: 'container page' }, emptyState({ iconName: 'alert', title: 'Không tìm thấy khóa học', text: err.message, action: h('a', { class: 'btn btn--primary', href: '#/learn' }, 'Xem tất cả khóa học') })));
      return;
    }
    document.title = `${course.title} · V-Code Edu`;
    let trackTitle = '';
    try {
      const cat = await loadCatalog();
      trackTitle = cat.tracks.find((t) => t.id === course.track)?.title || '';
    } catch { /* offline catalog — optional */ }

    const theme = courseTheme(course);
    const lessons = course.chapters.flatMap((ch) => ch.lessons);
    const xpTotal = lessons.reduce((s, l) => s + (l.xp || 0), 0);
    const open = new Set(course.chapters.map((ch) => ch.id));
    let firstRender = true;
    {
      // Start with fully-completed chapters collapsed (unless the whole course is done).
      const p0 = await getProgress();
      const complete = course.chapters.filter((ch) => ch.lessons.length && ch.lessons.every((l) => isDone(p0, 'lessons', l.id)));
      if (complete.length < course.chapters.length) complete.forEach((ch) => open.delete(ch.id));
    }

    async function render() {
      const progress = await getProgress();
      if (ctx.signal.aborted) return;
      const doneOf = (l) => isDone(progress, 'lessons', l.id);
      const done = lessons.filter(doneOf).length;
      const allDone = lessons.length > 0 && done === lessons.length;
      const next = lessons.find((l) => !doneOf(l)) || lessons[0];
      const nextIndex = lessons.indexOf(next);
      const nextChapterIndex = course.chapters.findIndex((ch) => ch.lessons.includes(next));
      const p = pct(done, lessons.length);
      const xp = lessons.filter(doneOf).reduce((s, l) => s + (l.xp || 0), 0);
      const chaptersDone = course.chapters.filter((ch) => ch.lessons.length && ch.lessons.every(doneOf)).length;
      const ctaLabel = allDone ? 'Ôn lại từ đầu' : done ? 'Tiếp tục bài học' : 'Bắt đầu học';
      const ctaHref = `#/learn/${course.id}/${allDone ? lessons[0].id : next.id}`;

      const desc = h('div', { class: 'prose lx-hero__desc' });
      desc.innerHTML = markdown(course.description || '');

      const hero = h('header', { class: 'lx-hero' },
        h('div', { class: 'lx-hero__deco', 'aria-hidden': 'true' }),
        h('div', { class: 'lx-hero__text' },
          h('div', { class: 'lx-hero__badges' },
            courseEmblem(theme, 'lx-emblem--lg'),
            h('span', { class: 'lx-hero__pill' }, icon('gauge'), course.level || 'Cơ bản'),
            trackTitle ? h('span', { class: 'lx-hero__pill lx-hero__pill--ghost' }, icon('git-branch'), trackTitle) : null),
          h('h1', { class: 'lx-hero__title' }, course.title),
          course.subtitle ? h('p', { class: 'lx-hero__sub' }, course.subtitle) : null,
          desc,
          h('ul', { class: 'lx-hero__facts' },
            h('li', null, h('strong', null, String(course.chapters.length)), h('span', null, 'chương')),
            h('li', null, h('strong', null, String(lessons.length)), h('span', null, 'bài học')),
            h('li', null, h('strong', null, xpTotal.toLocaleString('vi-VN')), h('span', null, 'XP')),
            h('li', null, h('strong', null, 'Miễn phí'), h('span', null, 'học cả offline'))),
          h('div', { class: 'lx-hero__actions' },
            h('a', { class: 'lx-btn lx-btn--white', href: ctaHref }, icon('play'), ctaLabel),
            h('span', { class: 'lx-hero__next' }, allDone ? 'Bạn đã hoàn thành khóa học này!' : done ? `Tiếp theo: ${next.title}` : `Bài đầu tiên: ${lessons[0]?.title || ''}`))),
        h('div', { class: 'lx-hero__visual' }, courseArt(theme, 'lx-hero__art')),
        h('div', { class: 'lx-hero__progress' },
          h('div', { class: 'lx-hero__progress-label' },
            h('span', null, 'Tiến độ của bạn'),
            h('strong', null, `${done}/${lessons.length} bài • ${p}%`)),
          bar(p, 'lx-bar--hero')));

      const chapters = h('div', { class: 'chapter-list' }, course.chapters.map((ch, ci) => {
        const chDone = ch.lessons.filter(doneOf).length;
        const complete = ch.lessons.length > 0 && chDone === ch.lessons.length;
        const isOpen = open.has(ch.id);
        const bodyId = `chapter-body-${ch.id}`;
        const section = h('section', { class: `chapter ${isOpen ? 'is-open' : ''} ${complete ? 'is-complete' : ''} ${ci === nextChapterIndex && !allDone ? 'is-current' : ''}`, style: { '--i': String(ci) } },
          h('button', {
            class: 'chapter__head', type: 'button', 'aria-expanded': String(isOpen), 'aria-controls': bodyId,
            onClick: () => {
              const nowOpen = !section.classList.contains('is-open');
              section.classList.toggle('is-open', nowOpen);
              section.querySelector('.chapter__head').setAttribute('aria-expanded', String(nowOpen));
              section.querySelector('.chapter__body').inert = !nowOpen;
              if (nowOpen) open.add(ch.id); else open.delete(ch.id);
            },
          },
          h('span', { class: 'chapter__num' }, complete ? icon('check') : String(ci + 1).padStart(2, '0')),
          h('span', { class: 'chapter__text' },
            h('span', { class: 'chapter__kicker' }, `Chương ${ci + 1} • ${ch.lessons.length} bài`),
            h('h3', { class: 'chapter__title' }, ch.title),
            ch.summary ? h('span', { class: 'chapter__summary' }, ch.summary) : null),
          h('span', { class: 'chapter__meta' },
            h('span', { class: 'chapter__count' }, `${chDone}/${ch.lessons.length}`),
            bar(pct(chDone, ch.lessons.length), 'chapter__bar')),
          h('span', { class: 'chapter__chev', 'aria-hidden': 'true' }, icon('chevron-down'))),
          h('div', { class: 'chapter__body', id: bodyId, inert: !isOpen },
            h('div', { class: 'chapter__inner' },
              h('ol', { class: 'lesson-list' }, ch.lessons.map((l, li) => {
                const ok = doneOf(l);
                const current = !allDone && l === next;
                return h('li', null, h('a', { class: `lesson-row ${ok ? 'is-done' : ''} ${current ? 'is-current' : ''}`, href: `#/learn/${course.id}/${l.id}`, 'aria-current': current ? 'step' : null },
                  h('span', { class: 'lesson-row__state', 'aria-hidden': 'true' }, ok ? icon('check') : current ? icon('play') : String(li + 1)),
                  h('span', { class: 'lesson-row__main' },
                    h('span', { class: 'lesson-row__title' }, l.title),
                    h('span', { class: 'lesson-row__sub' },
                      h('span', { class: `lesson-row__diff is-${DIFF_TONE[l.difficulty] || 'easy'}` }, DIFFICULTY_LABEL[l.difficulty] || l.difficulty || 'Cơ bản'),
                      lessonKinds(l).map((k) => h('span', { class: 'lesson-row__kind', title: k.label }, icon(k.icon), h('span', { class: 'sr-only' }, k.label))),
                      ok ? h('span', { class: 'lesson-row__flag' }, 'Đã xong') : current ? h('span', { class: 'lesson-row__flag is-next' }, done ? 'Học tiếp' : 'Bắt đầu') : null)),
                  h('span', { class: 'lesson-row__xp' }, `+${l.xp || 0} XP`),
                  h('span', { class: 'lesson-row__go', 'aria-hidden': 'true' }, icon('chevron-right'))));
              })))));
        return section;
      }));

      const side = h('aside', { class: 'lx-side' },
        h('div', { class: 'lx-side-card' },
          h('div', { class: 'lx-side-card__top' },
            courseEmblem(theme),
            h('div', { class: 'grow' },
              h('span', { class: 'lx-side-card__kicker' }, allDone ? 'Đã hoàn thành' : done ? 'Tiếp tục bài học' : 'Sẵn sàng bắt đầu'),
              h('strong', { class: 'lx-side-card__course truncate' }, course.title))),
          h('div', { class: 'lx-side-card__next' },
            ring(p),
            h('div', { class: 'grow' },
              h('span', { class: 'lx-side-card__label' }, allDone ? 'Bạn đã học hết' : `Bài ${nextIndex + 1}/${lessons.length} • Chương ${nextChapterIndex + 1}`),
              h('strong', { class: 'lx-side-card__lesson' }, allDone ? `${lessons.length} bài học` : next.title))),
          h('a', { class: 'lx-btn lx-btn--course lx-btn--block', href: ctaHref }, icon('play'), ctaLabel),
          h('dl', { class: 'lx-side-card__stats' },
            h('div', null, h('dt', null, 'Bài đã xong'), h('dd', null, `${done}/${lessons.length}`)),
            h('div', null, h('dt', null, 'XP đạt được'), h('dd', null, `${xp}/${xpTotal}`)),
            h('div', null, h('dt', null, 'Chương hoàn thành'), h('dd', null, `${chaptersDone}/${course.chapters.length}`)),
            h('div', null, h('dt', null, 'Trình độ'), h('dd', null, course.level || 'Cơ bản'))),
          h('p', { class: 'lx-side-card__note' }, icon('check-circle'), 'Miễn phí • Bài tập được chấm tự động ngay trên trình duyệt')),
        h('div', { class: 'lx-side-links' },
          h('a', { href: '#/challenges' }, icon('trophy'), 'Thử thách lập trình'),
          h('a', { href: '#/prism' }, icon('prism'), 'Lăng kính thuật toán'),
          h('a', { href: '#/ai' }, icon('sparkles'), 'Hỏi trợ lý AI')));

      const allOpen = course.chapters.every((ch) => open.has(ch.id));
      const toggleAll = h('button', {
        class: 'lx-linkbtn', type: 'button',
        onClick: () => {
          if (course.chapters.every((ch) => open.has(ch.id))) open.clear(); else course.chapters.forEach((ch) => open.add(ch.id));
          render();
        },
      }, icon(allOpen ? 'minimize' : 'maximize'), allOpen ? 'Thu gọn tất cả' : 'Mở tất cả');

      mount(container, h('div', { class: `lx lx--course ${firstRender ? 'is-first' : ''}`, style: themeVars(theme) },
        h('div', { class: 'container lx-course' },
          h('nav', { class: 'lx-crumbs', 'aria-label': 'Đường dẫn' },
            h('a', { href: '#/learn' }, icon('book-open'), 'Học'), icon('chevron-right'),
            h('span', { 'aria-current': 'page' }, course.title)),
          hero,
          h('div', { class: 'lx-course__layout' },
            h('section', { class: 'lx-course__main', 'aria-labelledby': 'lx-content-title' },
              h('div', { class: 'lx-course__head' },
                h('div', null,
                  h('h2', { id: 'lx-content-title' }, 'Nội dung khóa học'),
                  h('p', null, `${course.chapters.length} chương • ${lessons.length} bài • ${chaptersDone} chương đã hoàn thành`)),
                toggleAll),
              chapters),
            side))));
      firstRender = false;
    }
    await render();
    bus.on('progress:change', () => render(), { signal: ctx.signal });
  },
};
