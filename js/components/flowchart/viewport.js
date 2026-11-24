// V-Code Edu — Flowchart studio: pan / zoom for an SVG canvas (wheel, drag, pinch, buttons).

export function createViewport({ host, svg, layer, signal, minZoom = 0.2, maxZoom = 3, onChange }) {
  const st = { x: 40, y: 40, k: 1 };
  const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let anim = 0;

  const apply = () => {
    layer.setAttribute('transform', `translate(${st.x} ${st.y}) scale(${st.k})`);
    const g = 20 * st.k;
    host.style.setProperty('--fc-grid', `${g}px`);
    host.style.setProperty('--fc-grid-x', `${st.x}px`);
    host.style.setProperty('--fc-grid-y', `${st.y}px`);
    onChange?.(st);
  };

  const clampK = (k) => Math.min(maxZoom, Math.max(minZoom, k));

  function screenToWorld(clientX, clientY) {
    const r = svg.getBoundingClientRect();
    return { x: (clientX - r.left - st.x) / st.k, y: (clientY - r.top - st.y) / st.k };
  }
  function worldToScreen(x, y) {
    return { x: x * st.k + st.x, y: y * st.k + st.y };
  }

  function zoomAt(factor, cx, cy) {
    const k = clampK(st.k * factor);
    const f = k / st.k;
    st.x = cx - (cx - st.x) * f;
    st.y = cy - (cy - st.y) * f;
    st.k = k;
    apply();
  }

  function zoomCenter(factor) {
    const r = svg.getBoundingClientRect();
    animateTo(() => {
      const k = clampK(st.k * factor);
      const f = k / st.k;
      return { k, x: r.width / 2 - (r.width / 2 - st.x) * f, y: r.height / 2 - (r.height / 2 - st.y) * f };
    });
  }

  function animateTo(targetFn) {
    const t = targetFn();
    cancelAnimationFrame(anim);
    if (reduce()) { Object.assign(st, t); apply(); return; }
    const from = { ...st };
    const t0 = performance.now();
    const dur = 220;
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      st.x = from.x + (t.x - from.x) * e;
      st.y = from.y + (t.y - from.y) * e;
      st.k = from.k + (t.k - from.k) * e;
      apply();
      if (p < 1) anim = requestAnimationFrame(tick);
    };
    anim = requestAnimationFrame(tick);
  }

  function fit(bbox, { padding = 32, maxK = 1.25, animate = true } = {}) {
    const r = svg.getBoundingClientRect();
    if (!r.width || !r.height || !bbox) return;
    const k = clampK(Math.min((r.width - padding * 2) / Math.max(bbox.w, 1), (r.height - padding * 2) / Math.max(bbox.h, 1), maxK));
    const target = { k, x: (r.width - bbox.w * k) / 2 - bbox.x * k, y: Math.max(padding, (r.height - bbox.h * k) / 2) - bbox.y * k };
    if (animate) animateTo(() => target); else { Object.assign(st, target); apply(); }
  }

  /** Center a world point in view (keeps zoom). */
  function centerOn(x, y) {
    const r = svg.getBoundingClientRect();
    animateTo(() => ({ k: st.k, x: r.width / 2 - x * st.k, y: r.height / 2 - y * st.k }));
  }

  function ensureVisible(x, y, w, h, margin = 40) {
    const r = svg.getBoundingClientRect();
    const a = worldToScreen(x - w / 2, y - h / 2);
    const b = worldToScreen(x + w / 2, y + h / 2);
    if (a.x < margin || a.y < margin || b.x > r.width - margin || b.y > r.height - margin) centerOn(x, y);
  }

  svg.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = svg.getBoundingClientRect();
    if (e.ctrlKey || e.metaKey || Math.abs(e.deltaX) < 0.5) {
      const dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      zoomAt(Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0018)), e.clientX - r.left, e.clientY - r.top);
    } else {
      st.x -= e.deltaX; st.y -= e.deltaY; apply();
    }
  }, { passive: false, signal });

  // pan + pinch (callers start a pan explicitly so they can decide what empty-space drags do)
  const pointers = new Map();
  let pan = null;
  let pinch = null;

  function startPan(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      const r = svg.getBoundingClientRect();
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: st.k, cx: (a.x + b.x) / 2 - r.left, cy: (a.y + b.y) / 2 - r.top, sx: st.x, sy: st.y };
      pan = null;
    } else {
      pan = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, moved: false };
    }
    try { svg.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    host.classList.add('is-panning');
  }

  svg.addEventListener('pointermove', (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const k = clampK(pinch.k * (d / Math.max(pinch.d, 1)));
      const f = k / pinch.k;
      st.k = k;
      st.x = pinch.cx - (pinch.cx - pinch.sx) * f;
      st.y = pinch.cy - (pinch.cy - pinch.sy) * f;
      apply();
    } else if (pan && e.pointerId === pan.id) {
      const dx = e.clientX - pan.x; const dy = e.clientY - pan.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) pan.moved = true;
      st.x = pan.sx + dx; st.y = pan.sy + dy;
      apply();
    }
  }, { signal });

  const end = (e) => {
    if (!pointers.has(e.pointerId)) return;
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!pointers.size) { host.classList.remove('is-panning'); pan = null; }
  };
  svg.addEventListener('pointerup', end, { signal });
  svg.addEventListener('pointercancel', end, { signal });

  apply();
  return {
    state: st, apply, fit, zoomAt, zoomCenter, centerOn, ensureVisible, screenToWorld, worldToScreen, startPan,
    get panMoved() { return pan?.moved || false; },
    isPanning: () => pointers.size > 0,
    setZoom(k) { zoomCenter(k / st.k); },
  };
}
