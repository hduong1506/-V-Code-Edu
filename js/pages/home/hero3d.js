// V-Code Edu — homepage hero: interactive WebGL scene ("V-Core").
//
// A faceted crystal core (the V-Code "spark") wrapped in orbit rings like the brand mark, satellites for
// each learning pillar, floating code glyph billboards and a deep star field. Pointer = parallax, scroll =
// camera dolly, click the core = energy pulse.
//
// Performance rules: DPR capped, a single rAF loop that stops when the hero is off-screen or the tab is
// hidden, one static frame for prefers-reduced-motion, everything disposed when the page unmounts.
import { THREE_URL } from '../../config.js';

function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return Boolean(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

function glowTexture(THREE, inner, outer = 'rgba(0,0,0,0)') {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.35, inner.replace(/[\d.]+\)$/, '0.35)'));
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glyphTexture(THREE, text, color) {
  const c = document.createElement('canvas');
  const font = '700 44px "JetBrains Mono", ui-monospace, monospace';
  const g = c.getContext('2d');
  g.font = font;
  const w = Math.ceil(g.measureText(text).width) + 56;
  c.width = w;
  c.height = 84;
  g.font = font;
  const r = 20;
  g.beginPath();
  g.moveTo(r, 2); g.lineTo(w - r, 2); g.quadraticCurveTo(w - 2, 2, w - 2, r);
  g.lineTo(w - 2, 82 - r); g.quadraticCurveTo(w - 2, 82, w - r, 82);
  g.lineTo(r, 82); g.quadraticCurveTo(2, 82, 2, 82 - r);
  g.lineTo(2, r); g.quadraticCurveTo(2, 2, r, 2);
  g.closePath();
  g.fillStyle = 'rgba(14, 22, 58, 0.72)';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = color;
  g.globalAlpha = 0.85;
  g.stroke();
  g.globalAlpha = 1;
  g.fillStyle = color;
  g.textBaseline = 'middle';
  g.fillText(text, 28, 44);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: w / 84 };
}

/**
 * Mount the hero scene into `host`. Resolves with { setProgress(p), pulse() } or null when WebGL/Three.js
 * is unavailable (caller keeps the CSS fallback visible).
 */
export async function createHero3D(host, { signal, reduced = false } = {}) {
  if (!webglAvailable()) return null;
  let THREE;
  try { THREE = await import(THREE_URL); } catch (err) { console.warn('[hero3d] Three.js unavailable:', err?.message); return null; }
  if (signal?.aborted) return null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.domElement.className = 'hero3d__canvas';
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070b1d, 0.035);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
  camera.position.set(0, 0.4, 11);

  const disposables = [];
  const keep = (o) => { disposables.push(o); return o; };

  // ---------- lights ----------
  scene.add(new THREE.AmbientLight(0x6070ff, 0.35));
  const key = new THREE.PointLight(0x8ea2ff, 28, 30, 1.6); key.position.set(4, 3, 6); scene.add(key);
  const rim = new THREE.PointLight(0x22d3ee, 34, 30, 1.6); rim.position.set(-4, -2, 3); scene.add(rim);
  const top = new THREE.PointLight(0xd8b4fe, 26, 30, 1.6); top.position.set(0, 6, -2); scene.add(top);

  const world = new THREE.Group();
  scene.add(world);
  const rig = new THREE.Group(); // core + orbits (moves right on wide screens)
  world.add(rig);

  // ---------- crystal core ----------
  const coreGeo = keep(new THREE.IcosahedronGeometry(1.45, 0));
  const coreMat = keep(new THREE.MeshStandardMaterial({ color: 0x2a3a9e, metalness: 0.55, roughness: 0.28, flatShading: true, emissive: 0x0d1450, emissiveIntensity: 0.5, transparent: true, opacity: 0.92 }));
  const core = new THREE.Mesh(coreGeo, coreMat);
  rig.add(core);

  const shellGeo = keep(new THREE.IcosahedronGeometry(1.95, 1));
  const shellEdges = keep(new THREE.EdgesGeometry(shellGeo));
  const shellMat = keep(new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.35 }));
  const shell = new THREE.LineSegments(shellEdges, shellMat);
  rig.add(shell);

  const innerGeo = keep(new THREE.OctahedronGeometry(0.55, 0));
  const innerMat = keep(new THREE.MeshBasicMaterial({ color: 0xa5f3fc }));
  const inner = new THREE.Mesh(innerGeo, innerMat);
  rig.add(inner);

  const glowTex = keep(glowTexture(THREE, 'rgba(111, 134, 255, 0.95)'));
  const glowMat = keep(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }));
  const glow = new THREE.Sprite(glowMat);
  glow.scale.set(7.5, 7.5, 1);
  rig.add(glow);

  // ---------- orbits + satellites (brand-mark motif) ----------
  const satTex = keep(glowTexture(THREE, 'rgba(255, 255, 255, 1)'));
  const orbits = [];
  const ORBITS = [
    { r: 3.15, tiltX: 1.25, tiltZ: -0.35, color: 0x6f86ff, speed: 0.32, sats: [0x22d3ee, 0xa78bfa] },
    { r: 3.75, tiltX: 1.05, tiltZ: 0.55, color: 0x22d3ee, speed: -0.22, sats: [0x34d399] },
    { r: 2.55, tiltX: 1.7, tiltZ: 0.05, color: 0xa78bfa, speed: 0.45, sats: [0xfbbf24] },
  ];
  for (const o of ORBITS) {
    const group = new THREE.Group();
    group.rotation.set(o.tiltX, 0, o.tiltZ);
    const ringGeo = keep(new THREE.TorusGeometry(o.r, 0.012, 8, 220));
    const ringMat = keep(new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0.55 }));
    group.add(new THREE.Mesh(ringGeo, ringMat));
    const sats = o.sats.map((color, i) => {
      const geo = keep(new THREE.SphereGeometry(0.085, 16, 16));
      const mat = keep(new THREE.MeshBasicMaterial({ color }));
      const m = new THREE.Mesh(geo, mat);
      const sMat = keep(new THREE.SpriteMaterial({ map: satTex, color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 }));
      const halo = new THREE.Sprite(sMat);
      halo.scale.set(0.9, 0.9, 1);
      m.add(halo);
      group.add(m);
      return { mesh: m, phase: (i / o.sats.length) * Math.PI * 2 };
    });
    rig.add(group);
    orbits.push({ ...o, group, sats });
  }

  // ---------- floating code glyphs ----------
  const GLYPHS = [['def', '#8be3b0'], ['{ }', '#8fb3ff'], ['</>', '#ff9bd2'], ['for i in', '#c3a6ff'], ['AI', '#67e8f9'], ['SELECT', '#ffd27a'], ['if x:', '#8be3b0'], ['cout <<', '#ffb27a'], ['print()', '#8fb3ff'], ['O(log n)', '#67e8f9'], ['while', '#c3a6ff'], ['01', '#a5f3fc']];
  const glyphs = GLYPHS.map(([text, color], i) => {
    const { tex, aspect } = glyphTexture(THREE, text, color);
    keep(tex);
    const mat = keep(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.9 }));
    const sp = new THREE.Sprite(mat);
    const h = 0.42;
    sp.scale.set(h * aspect, h, 1);
    // Arc around the core, biased to its right/back so glyphs never cover the headline on the left.
    const angle = -1.25 + (i / (GLYPHS.length - 1)) * 2.9;
    const radius = 3.6 + (i % 3) * 0.7;
    const base = new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.9, -1.6 - (i % 4) * 0.5);
    sp.position.copy(base);
    sp.material.opacity = 0.7;
    rig.add(sp);
    return { sp, base, speed: 0.4 + (i % 5) * 0.12, phase: i * 1.7 };
  });

  // ---------- star field ----------
  const N = 1600;
  const pos = new Float32Array(N * 3);
  const col = new Float32Array(N * 3);
  const palette = [new THREE.Color(0x8fa2ff), new THREE.Color(0x67e8f9), new THREE.Color(0xc4b5fd), new THREE.Color(0xffffff)];
  for (let i = 0; i < N; i++) {
    const r = 8 + Math.random() * 30;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    pos[i * 3] = r * Math.sin(p) * Math.cos(t);
    pos[i * 3 + 1] = r * Math.cos(p) * 0.6;
    pos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t) - 6;
    const c = palette[i % palette.length];
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  const starGeo = keep(new THREE.BufferGeometry());
  starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const starMat = keep(new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // ---------- floor grid ----------
  const grid = new THREE.GridHelper(80, 80, 0x3b4bd8, 0x1c2566);
  grid.position.y = -3.4;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  keep(grid.geometry); keep(grid.material);
  scene.add(grid);

  // ---------- interaction state ----------
  const state = { mx: 0, my: 0, tx: 0, ty: 0, progress: 0, pulse: 0, visible: true, running: false, t0: performance.now() };
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  function layout() {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = w / h > 1.15;
    rig.position.x = wide ? Math.min(3.6, (w / h) * 1.95) : 0;
    rig.position.y = wide ? 0.1 : 1.8;
    const s = wide ? 0.78 : 0.62;
    rig.scale.setScalar(s);
  }

  function frame(now) {
    const t = (now - state.t0) / 1000;
    // smooth pointer
    state.tx += (state.mx - state.tx) * 0.05;
    state.ty += (state.my - state.ty) * 0.05;
    const p = state.progress;

    core.rotation.x = t * 0.25 + state.ty * 0.4;
    core.rotation.y = t * 0.35 + state.tx * 0.6 + p * 2.2;
    shell.rotation.y = -t * 0.12 + p * 1.2;
    shell.rotation.x = t * 0.08;
    inner.rotation.y = -t * 1.2;
    inner.rotation.z = t * 0.6;

    const pulse = state.pulse;
    state.pulse *= 0.94;
    const sc = 1 + pulse * 0.35 + Math.sin(t * 2) * 0.02;
    core.scale.setScalar(sc);
    glow.material.opacity = 0.7 + pulse * 0.6 + Math.sin(t * 1.5) * 0.08;
    glow.scale.setScalar(7.5 + pulse * 4);
    coreMat.emissiveIntensity = 0.55 + pulse * 1.6;
    shellMat.opacity = 0.35 + pulse * 0.5;

    for (const o of orbits) {
      o.group.rotation.y = t * o.speed * 0.4;
      for (const s of o.sats) {
        const a = t * o.speed * 2 + s.phase;
        s.mesh.position.set(Math.cos(a) * o.r, Math.sin(a) * o.r, 0);
      }
    }
    for (const g of glyphs) {
      g.sp.position.y = g.base.y + Math.sin(t * g.speed + g.phase) * 0.25;
      g.sp.position.x = g.base.x + Math.cos(t * g.speed * 0.6 + g.phase) * 0.12;
      g.sp.material.opacity = 0.35 + 0.4 * (0.5 + 0.5 * Math.sin(t * 0.8 + g.phase));
    }
    stars.rotation.y = t * 0.012;
    grid.position.z = (t * 0.6) % 1;

    world.rotation.y = state.tx * 0.18;
    world.rotation.x = state.ty * 0.08;
    camera.position.z = 11 + p * 5;
    camera.position.y = 0.4 - p * 1.4;
    camera.lookAt(rig.position.x * 0.35, rig.position.y * 0.3 - p * 0.8, 0);
    renderer.render(scene, camera);
  }

  let raf = 0;
  const loop = (now) => {
    raf = 0;
    if (!state.running) return;
    frame(now);
    raf = requestAnimationFrame(loop);
  };
  const start = () => {
    if (reduced || state.running || !state.visible || document.visibilityState !== 'visible') return;
    state.running = true;
    raf = requestAnimationFrame(loop);
  };
  const stop = () => { state.running = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

  layout();
  frame(performance.now() + 4000);

  const ro = new ResizeObserver(() => { layout(); if (!state.running) frame(performance.now()); });
  ro.observe(host);
  const io = new IntersectionObserver(([e]) => { state.visible = e.isIntersecting; if (state.visible) start(); else stop(); }, { threshold: 0 });
  io.observe(host);
  const onVis = () => (document.visibilityState === 'visible' ? start() : stop());
  document.addEventListener('visibilitychange', onVis);

  const target = host.closest('.hero') || host;
  const onMove = (e) => {
    const r = target.getBoundingClientRect();
    state.mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    state.my = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  const onLeave = () => { state.mx = 0; state.my = 0; };
  const onClick = (e) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    if (raycaster.intersectObject(core, false).length || raycaster.intersectObject(inner, false).length) {
      state.pulse = 1;
      host.dispatchEvent(new CustomEvent('hero:pulse', { bubbles: true }));
      if (reduced) frame(performance.now());
    }
  };
  if (!reduced) {
    target.addEventListener('pointermove', onMove, { passive: true });
    target.addEventListener('pointerleave', onLeave);
  }
  target.addEventListener('click', onClick);
  start();

  const dispose = () => {
    stop();
    ro.disconnect();
    io.disconnect();
    document.removeEventListener('visibilitychange', onVis);
    target.removeEventListener('pointermove', onMove);
    target.removeEventListener('pointerleave', onLeave);
    target.removeEventListener('click', onClick);
    for (const d of disposables) d.dispose?.();
    renderer.dispose();
    renderer.forceContextLoss?.();
    renderer.domElement.remove();
  };
  signal?.addEventListener('abort', dispose);

  return {
    setProgress(p) {
      state.progress = Math.max(0, Math.min(1, p));
      if (!state.running) frame(performance.now());
    },
    pulse() { state.pulse = 1; if (!state.running) frame(performance.now()); },
    dispose,
  };
}
