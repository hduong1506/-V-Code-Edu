// V-Code Edu — content loader (courses, challenges). JSON files are cached by the service worker for offline use.

const cache = new Map();

async function getJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(new URL(`../../${path}`, import.meta.url))
    .then((r) => {
      if (!r.ok) throw new Error(`Không tải được ${path} (HTTP ${r.status})`);
      return r.json();
    })
    .catch((err) => { cache.delete(path); throw err; });
  cache.set(path, p);
  return p;
}

const COURSE_ORDER = ['python', 'pyvn', 'web', 'c', 'cpp', 'ai'];

export async function loadCatalog() {
  const data = await getJSON('data/courses/index.json');
  const rank = (id) => { const i = COURSE_ORDER.indexOf(id); return i === -1 ? 99 : i; };
  return { ...data, courses: [...data.courses].sort((a, b) => rank(a.id) - rank(b.id)) };
}

export async function loadCourse(id) {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error('Mã khóa học không hợp lệ');
  return getJSON(`data/courses/${id}.json`);
}

export async function findLesson(courseId, lessonId) {
  const course = await loadCourse(courseId);
  const flat = [];
  for (const ch of course.chapters) for (const l of ch.lessons) flat.push({ ...l, chapter: ch });
  const idx = flat.findIndex((l) => l.id === lessonId);
  return { course, lesson: flat[idx] || null, prev: flat[idx - 1] || null, next: flat[idx + 1] || null, index: idx, total: flat.length };
}

export function loadChallenges() {
  return getJSON('data/challenges.json');
}

/** Map a course "lang" to a runtime language id. */
export function runtimeLang(lang) {
  if (lang === 'web') return 'html';
  return lang;
}

export const ACCENTS = {
  blue: 'var(--brand)',
  violet: 'var(--accent-ai)',
  cyan: 'var(--accent-live)',
  amber: 'var(--accent-amber)',
  green: 'var(--accent-green)',
  rose: 'var(--accent-rose)',
};

export const DIFFICULTY_LABEL = { easy: 'Cơ bản', medium: 'Trung bình', hard: 'Nâng cao' };
export const DIFFICULTY_BADGE = { easy: 'success', medium: 'warning', hard: 'danger' };
