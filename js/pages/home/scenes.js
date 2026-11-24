// V-Code Edu — tiny scroll-scene toolkit for the homepage story (no dependencies).
//
// [data-scene]           → CSS variable --p (0..1) = progress of the section through the viewport.
//   data-scene="pin"     → progress across a tall section whose inner element is position: sticky.
// [data-count="1234"]    → counts up when it enters the viewport.
// [data-tilt]            → 3D tilt toward the pointer (--rx/--ry/--mx/--my).
// [data-magnetic]        → element drifts slightly toward the pointer.
// All effects are skipped for prefers-reduced-motion (final state is shown immediately).

const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function initScrollScenes(root, { signal, onProgress } = {}) {
  const scenes = [...root.querySelectorAll('[data-scene]')];
  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = window.innerHeight || 1;
    for (const el of scenes) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -vh * 0.5 || r.top > vh * 1.5) continue;
      let p;
      if (el.dataset.scene === 'pin') {
        const total = r.height - vh;
        p = total > 0 ? clamp(-r.top / total) : clamp((vh - r.top) / (vh + r.height));
      } else {
        p = clamp((vh - r.top) / (vh + r.height));
      }
      const prev = el._p;
      if (prev === undefined || Math.abs(prev - p) > 0.0005) {
        el._p = p;
        el.style.setProperty('--p', p.toFixed(4));
        onProgress?.(el, p);
      }
    }
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', queue, { passive: true, signal });
  window.addEventListener('resize', queue, { passive: true, signal });
  update();
  signal?.addEventListener('abort', () => cancelAnimationFrame(raf));
  return { update };
}

export function initCounters(root, { signal } = {}) {
  const els = [...root.querySelectorAll('[data-count]')];
  const reduced = prefersReducedMotion();
  const fmt = (n) => Math.round(n).toLocaleString('vi-VN');
  const run = (el) => {
    const target = Number(el.dataset.count) || 0;
    if (reduced || target === 0) { el.textContent = fmt(target); return; }
    const dur = 1400;
    const t0 = performance.now();
    const step = (now) => {
      if (signal?.aborted) return;
      const k = clamp((now - t0) / dur);
      const eased = 1 - (1 - k) ** 4;
      el.textContent = fmt(target * eased);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (!('IntersectionObserver' in window)) { els.forEach(run); return; }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
  }, { threshold: 0.4 });
  els.forEach((el) => { el.textContent = '0'; io.observe(el); });
  signal?.addEventListener('abort', () => io.disconnect());
}

export function initTilt(root, { signal, max = 10 } = {}) {
  if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
  root.addEventListener('pointermove', (e) => {
    const el = e.target.closest('[data-tilt]');
    if (!el || !root.contains(el)) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    const m = Number(el.dataset.tilt) || max;
    el.style.setProperty('--ry', `${((x - 0.5) * m * 2).toFixed(2)}deg`);
    el.style.setProperty('--rx', `${((0.5 - y) * m * 2).toFixed(2)}deg`);
    el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
    el.classList.add('is-tilting');
  }, { passive: true, signal });
  root.addEventListener('pointerout', (e) => {
    const el = e.target.closest('[data-tilt]');
    if (!el || el.contains(e.relatedTarget)) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.classList.remove('is-tilting');
  }, { signal });
}

export function initMagnetic(root, { signal, strength = 0.25 } = {}) {
  if (prefersReducedMotion() || !window.matchMedia('(pointer: fine)').matches) return;
  for (const el of root.querySelectorAll('[data-magnetic]')) {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * strength;
      const dy = (e.clientY - (r.top + r.height / 2)) * strength;
      el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
    }, { passive: true, signal });
    el.addEventListener('pointerleave', () => { el.style.transform = ''; }, { signal });
  }
}

/** Highlights the scene-navigator dot of the section currently in view. */
export function initSceneNav(root, nav, { signal } = {}) {
  const dots = [...nav.querySelectorAll('[data-target]')];
  const sections = dots.map((d) => root.querySelector(`#${d.dataset.target}`)).filter(Boolean);
  if (!('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const id = e.target.id;
      dots.forEach((d) => d.classList.toggle('is-active', d.dataset.target === id));
      nav.dataset.tone = e.target.dataset.tone || 'dark';
    }
  }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
  sections.forEach((s) => io.observe(s));
  signal?.addEventListener('abort', () => io.disconnect());
}
