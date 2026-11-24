// V-Prism — compact self-looping sorting demo (homepage & catalog hero).
import { h, mount } from '../../core/dom.js';
import { renderBars } from './renderers.js';

function* insertionFrames(a) {
  const n = a.length;
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0 && a[j - 1] > a[j]) {
      yield { values: [...a], marks: { [j]: 'compare', [j - 1]: 'compare' } };
      [a[j - 1], a[j]] = [a[j], a[j - 1]];
      yield { values: [...a], marks: { [j - 1]: 'swap' } };
      j -= 1;
    }
    yield { values: [...a], marks: Object.fromEntries([...Array(i + 1)].map((_, k) => [k, 'done'])) };
  }
}

function* quickFrames(a, l = 0, r = a.length - 1, fixed = new Set()) {
  if (l >= r) { if (l === r) fixed.add(l); return; }
  const pivot = a[r];
  let i = l;
  const fx = () => Object.fromEntries([...fixed].map((k) => [k, 'done']));
  for (let j = l; j < r; j++) {
    yield { values: [...a], marks: { ...fx(), [r]: 'pivot', [j]: 'compare' }, range: [l, r] };
    if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; yield { values: [...a], marks: { ...fx(), [r]: 'pivot', [i]: 'swap' }, range: [l, r] }; i += 1; }
  }
  [a[i], a[r]] = [a[r], a[i]];
  fixed.add(i);
  yield { values: [...a], marks: { ...fx(), [i]: 'active' } };
  yield* quickFrames(a, l, i - 1, fixed);
  yield* quickFrames(a, i + 1, r, fixed);
}

/** Mount a looping mini sorting animation. */
export function mountMiniSort(container, { signal, size = 14, interval = 140 } = {}) {
  const host = h('div', { class: 'pz-mini' });
  const label = h('div', { class: 'pz-mini__label' });
  mount(container, h('div', { class: 'pz-mini-wrap' }, host, label));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fresh = () => Array.from({ length: size }, () => 8 + Math.floor(Math.random() * 92));
  if (reduced) {
    const a = fresh();
    const frames = [...insertionFrames(a)];
    renderBars(host, frames[Math.floor(frames.length / 2)]);
    label.textContent = 'Sắp xếp chèn';
    return;
  }
  let round = 0;
  let gen = null;
  let timer = null;
  const next = () => {
    if (signal?.aborted) return;
    if (!gen) {
      const arr = fresh();
      const useQuick = round % 2 === 1;
      label.textContent = useQuick ? 'Sắp xếp nhanh · O(n log n)' : 'Sắp xếp chèn · O(n²)';
      gen = useQuick ? quickFrames(arr) : insertionFrames(arr);
      renderBars(host, { values: [...arr], marks: {} });
      round += 1;
    }
    const step = gen.next();
    if (step.done) {
      gen = null;
      timer = setTimeout(next, 1400);
      return;
    }
    if (document.visibilityState === 'visible') renderBars(host, step.value);
    timer = setTimeout(next, interval);
  };
  next();
  signal?.addEventListener('abort', () => clearTimeout(timer));
}
