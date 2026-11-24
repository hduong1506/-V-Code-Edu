// V-Code Edu — lesson page: theory + task + workbench with real execution and auto-grading.
// The learn-section frame (course accent, lesson map, completion state) is layered on top of
// the shared practice layout; grading and progress logic stay in buildPracticePage/markComplete.
import { h, mount } from '../core/dom.js';
import { icon } from '../components/icons.js';
import { findLesson, runtimeLang, DIFFICULTY_LABEL, DIFFICULTY_BADGE } from '../services/content.js';
import { markComplete, getProgress, isDone } from '../services/progress.js';
import { buildPracticePage } from '../components/practice.js';
import { toast, emptyState } from '../core/ui.js';
import { bus } from '../core/store.js';
import { courseTheme, themeVars, courseEmblem } from './learn/course-art.js';
import { rememberLesson } from './learn/shared.js';

export default {
  title: 'Bài học',
  async mount(container, ctx) {
    let data;
    try {
      data = await findLesson(ctx.params.course, ctx.params.lesson);
    } catch (err) {
      mount(container, h('div', { class: 'container page' }, emptyState({ iconName: 'alert', title: 'Không tải được bài học', text: err.message, action: h('a', { class: 'btn btn--primary', href: '#/learn' }, 'Về danh sách khóa học') })));
      return;
    }
    const { course, lesson, prev, next, index, total } = data;
    if (!lesson) {
      mount(container, h('div', { class: 'container page' }, emptyState({ iconName: 'alert', title: 'Không tìm thấy bài học', action: h('a', { class: 'btn btn--primary', href: `#/learn/${course.id}` }, 'Về khóa học') })));
      return;
    }
    document.title = `${lesson.title} · ${course.title} · V-Code Edu`;
    const progress = await getProgress();
    const lang = runtimeLang(course.lang);
    const theme = courseTheme(course);
    rememberLesson(course.id, lesson.id);

    let setSolvedFrame = () => {};

    await buildPracticePage(container, ctx, {
      crumbs: [{ label: 'Học', href: '#/learn' }, { label: course.title, href: `#/learn/${course.id}` }, { label: lesson.chapter.title }],
      title: lesson.title,
      meta: [
        h('span', { class: `badge badge--${DIFFICULTY_BADGE[lesson.difficulty] || 'brand'}` }, DIFFICULTY_LABEL[lesson.difficulty] || lesson.difficulty),
        h('span', { class: 'badge badge--amber' }, icon('zap'), `${lesson.xp} XP`),
        h('span', { class: 'badge' }, `Bài ${index + 1}/${total}`),
        isDone(progress, 'lessons', lesson.id) ? h('span', { class: 'badge badge--success' }, icon('check'), 'Đã hoàn thành') : null,
      ],
      lang,
      highlightLang: course.lang === 'web' ? 'html' : course.lang,
      sections: { theory: lesson.theory, task: lesson.task, hints: lesson.hints || [], solution: lesson.solution },
      prism: lesson.prism,
      starter: lesson.starter,
      tests: lesson.tests || [],
      checks: lesson.checks || [],
      draftKey: `lesson:${lesson.id}`,
      attemptsKey: `attempts:lesson:${lesson.id}`,
      solved: isDone(progress, 'lessons', lesson.id),
      initialTab: isDone(progress, 'lessons', lesson.id) ? 'task' : undefined,
      prev: prev ? { href: `#/learn/${course.id}/${prev.id}`, label: prev.title } : null,
      next: next ? { href: `#/learn/${course.id}/${next.id}`, label: next.title } : { href: `#/learn/${course.id}`, label: 'Về khóa học' },
      onPass: async () => {
        const { firstTime, xp } = await markComplete('lessons', lesson.id, lesson.xp);
        setSolvedFrame(true);
        toast(firstTime ? `Xuất sắc! Hoàn thành bài học (+${xp} XP).` : 'Chính xác! Bạn đã giải lại bài này.', {
          type: 'success',
          action: next ? { label: 'Bài tiếp theo', onClick: () => ctx.navigate(`/learn/${course.id}/${next.id}`) } : undefined,
        });
      },
    });

    // ---------------- learn-section frame (visual only) ----------------
    if (ctx.signal.aborted) return;
    Object.entries(themeVars(theme)).forEach(([k, v]) => container.style.setProperty(k, v));
    const page = container.querySelector('.ide-page');
    const head = container.querySelector('.ide-page__head');
    const crumbs = head?.querySelector('.ide-page__crumbs');
    const foot = container.querySelector('.ide-page__foot');
    if (!page || !head) return;
    page.classList.add('lx-lesson');

    if (crumbs) {
      crumbs.setAttribute('aria-label', 'Đường dẫn');
      head.insertBefore(h('div', { class: 'lx-lesson__top' }, courseEmblem(theme), crumbs), head.firstChild);
    }

    // Lesson map: one segment per lesson, grouped by chapter.
    const map = h('nav', { class: 'lx-lesson__map', 'aria-label': `Các bài trong khóa ${course.title}` });
    function renderMap(p) {
      let n = 0;
      mount(map, course.chapters.map((ch, ci) => h('div', { class: 'lx-lesson__map-ch', title: `Chương ${ci + 1}: ${ch.title}`, style: { flexGrow: String(Math.max(1, ch.lessons.length)) } },
        ch.lessons.map((l) => {
          n += 1;
          const state = l.id === lesson.id ? 'is-current' : isDone(p, 'lessons', l.id) ? 'is-done' : '';
          return h('a', { class: `lx-lesson__seg ${state}`, href: `#/learn/${course.id}/${l.id}`, title: `Bài ${n}: ${l.title}`, 'aria-label': `Bài ${n}: ${l.title}${state === 'is-done' ? ' (đã xong)' : ''}`, 'aria-current': l.id === lesson.id ? 'page' : null });
        }))));
    }
    renderMap(progress);
    head.appendChild(map);

    // Completion state banner.
    const doneBanner = h('div', { class: 'lx-lesson__done', role: 'status', hidden: true },
      h('span', { class: 'lx-lesson__done-icon' }, icon('check')),
      h('div', { class: 'grow' },
        h('strong', null, 'Bạn đã hoàn thành bài này'),
        h('span', null, next ? `Tiếp theo: ${next.title}` : 'Đây là bài cuối của khóa học — tuyệt vời!')),
      h('a', { class: 'lx-btn lx-btn--course lx-btn--sm', href: next ? `#/learn/${course.id}/${next.id}` : `#/learn/${course.id}` }, next ? 'Bài tiếp' : 'Về khóa học', icon('arrow-right')));
    head.appendChild(doneBanner);
    foot?.classList.add('lx-lesson__foot');

    setSolvedFrame = (solved) => {
      page.classList.toggle('is-solved', solved);
      doneBanner.hidden = !solved;
    };
    setSolvedFrame(isDone(progress, 'lessons', lesson.id));
    bus.on('progress:change', (p) => { if (p) renderMap(p); }, { signal: ctx.signal });
  },
};
