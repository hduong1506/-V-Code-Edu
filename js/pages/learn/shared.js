// V-Code Edu — helpers shared by the Learning pages (catalog, course, lesson).
import { h } from '../../core/dom.js';
import { kv } from '../../core/idb.js';
import { appState } from '../../core/store.js';

/** Number of completed lessons of a course (lesson ids are prefixed with "<courseId>-"). */
export function courseDoneCount(progress, courseId) {
  const prefix = `${courseId}-`;
  return Object.keys(progress?.lessons || {}).filter((id) => id.startsWith(prefix)).length;
}

export function pct(done, total) {
  return total ? Math.min(100, Math.round((done / total) * 100)) : 0;
}

/** Thin progress bar. */
export function bar(percent, className = '') {
  return h('div', { class: `lx-bar ${className}`.trim(), role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(percent) },
    h('span', { style: { width: `${percent}%` } }));
}

/** Circular progress ring with the percentage in the middle. */
export function ring(percent, label = `${percent}%`, className = '') {
  return h('div', { class: `lx-ring ${className}`.trim(), style: { '--pct': String(percent) }, role: 'img', 'aria-label': `Hoàn thành ${percent}%` },
    h('span', null, label));
}

const lastKey = () => `learn:last:${appState.get().user?.key || 'guest'}`;

/** Remember the lesson the learner opened last (for the "Tiếp tục học" card). */
export function rememberLesson(courseId, lessonId) {
  return kv.set(lastKey(), { course: courseId, lesson: lessonId, at: Date.now() }).catch(() => {});
}

export async function lastOpenedLesson() {
  try { return await kv.get(lastKey(), null); } catch { return null; }
}

/** Pointer-driven 3D tilt + illustration parallax for `.course-card`s inside `root`. */
export function enableTilt(root, signal, selector = '.course-card') {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  const reset = (card) => {
    card.classList.remove('is-tilting');
    for (const p of ['--rx', '--ry', '--px', '--py']) card.style.removeProperty(p);
  };
  root.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !fine.matches || reduce.matches) return;
    const card = e.target.closest(selector);
    if (!card || !root.contains(card)) return;
    const r = card.getBoundingClientRect();
    const x = Math.max(-0.5, Math.min(0.5, (e.clientX - r.left) / r.width - 0.5));
    const y = Math.max(-0.5, Math.min(0.5, (e.clientY - r.top) / r.height - 0.5));
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      card.classList.add('is-tilting');
      card.style.setProperty('--rx', `${(-y * 8).toFixed(2)}deg`);
      card.style.setProperty('--ry', `${(x * 10).toFixed(2)}deg`);
      card.style.setProperty('--px', x.toFixed(3));
      card.style.setProperty('--py', y.toFixed(3));
      card.style.setProperty('--gx', `${Math.round((x + 0.5) * 100)}%`);
      card.style.setProperty('--gy', `${Math.round((y + 0.5) * 100)}%`);
    });
  }, { signal });
  root.addEventListener('pointerout', (e) => {
    const card = e.target.closest(selector);
    if (card && !card.contains(e.relatedTarget)) { cancelAnimationFrame(frame); reset(card); }
  }, { signal });
}
