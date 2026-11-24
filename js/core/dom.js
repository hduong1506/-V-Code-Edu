// V-Code Edu — tiny DOM toolkit (no framework).
// h() builds elements safely: string children become TEXT nodes, never HTML.
// Use `raw(htmlString)` only for HTML you generated and escaped yourself (e.g. highlight(), markdown()).

const SVG_NS = 'http://www.w3.org/2000/svg';
const RAW = Symbol('raw-html');

/** Mark a string as trusted HTML (already escaped/sanitized by our own renderers). */
export function raw(html) {
  return { [RAW]: true, html: String(html ?? '') };
}

/** Escape text for safe interpolation into HTML strings and attributes. */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applyProps(el, props, isSvg) {
  if (!props) return;
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue;
    if (key === 'class' || key === 'className') {
      const cls = Array.isArray(value) ? value.filter(Boolean).join(' ') : value;
      if (isSvg) el.setAttribute('class', cls); else el.className = cls;
    } else if (key === 'style') {
      if (typeof value === 'string') el.style.cssText = value;
      else for (const [prop, v] of Object.entries(value)) {
        if (v === undefined || v === null) continue;
        if (prop.startsWith('--')) el.style.setProperty(prop, v); else el.style[prop] = v;
      }
    } else if (key === 'dataset') {
      for (const [k, v] of Object.entries(value)) if (v !== undefined && v !== null) el.dataset[k] = v;
    } else if (key === 'ref') {
      if (typeof value === 'function') value(el);
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'html') {
      throw new Error('Use raw() children instead of the html prop');
    } else if (!isSvg && (key === 'value' || key === 'checked' || key === 'selected' || key === 'disabled' || key === 'hidden')) {
      el[key] = value;
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
}

function appendChildren(el, children) {
  for (const child of children) {
    if (child === null || child === undefined || child === false || child === true) continue;
    if (Array.isArray(child)) { appendChildren(el, child); continue; }
    if (child instanceof Node) { el.appendChild(child); continue; }
    if (typeof child === 'object' && child[RAW]) {
      const tpl = document.createElement('template');
      tpl.innerHTML = child.html;
      el.appendChild(tpl.content);
      continue;
    }
    el.appendChild(document.createTextNode(String(child)));
  }
}

/**
 * Create an HTML element.
 * h('button', { class: 'btn', onClick: fn }, 'Label', iconNode)
 */
export function h(tag, props, ...children) {
  if (props && (props instanceof Node || Array.isArray(props) || typeof props !== 'object' || props[RAW])) {
    children.unshift(props);
    props = null;
  }
  const el = document.createElement(tag);
  applyProps(el, props, false);
  appendChildren(el, children);
  return el;
}

/** Create an SVG element (namespaced). */
export function s(tag, props, ...children) {
  if (props && (props instanceof Node || Array.isArray(props) || typeof props !== 'object')) {
    children.unshift(props);
    props = null;
  }
  const el = document.createElementNS(SVG_NS, tag);
  applyProps(el, props, true);
  appendChildren(el, children);
  return el;
}

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

/** Replace all children of `el` with the given nodes. */
export function mount(el, ...children) {
  clear(el);
  appendChildren(el, children);
  return el;
}

/** Debounce helper. */
export function debounce(fn, ms = 200) {
  let t;
  const wrapped = (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
  wrapped.cancel = () => clearTimeout(t);
  return wrapped;
}

/** Throttle helper (leading + trailing). */
export function throttle(fn, ms = 200) {
  let last = 0;
  let timer = null;
  let pendingArgs = null;
  return (...args) => {
    const now = Date.now();
    const remaining = ms - (now - last);
    if (remaining <= 0) {
      last = now;
      fn(...args);
    } else {
      pendingArgs = args;
      if (!timer) {
        timer = setTimeout(() => {
          last = Date.now();
          timer = null;
          fn(...pendingArgs);
        }, remaining);
      }
    }
  };
}

/** Unique-ish id. */
export function uid(prefix = 'id') {
  const rnd = (crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(2)) : [Math.random() * 1e9, Math.random() * 1e9]);
  return `${prefix}_${Date.now().toString(36)}${Array.from(rnd, (n) => n.toString(36)).join('')}`;
}

/** Observe elements with class .reveal and add .is-visible when in view. */
export function revealOnScroll(root = document, signal) {
  const els = $$('.reveal', root);
  if (!('IntersectionObserver' in window)) { els.forEach((e) => e.classList.add('is-visible')); return; }
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
  els.forEach((e) => io.observe(e));
  signal?.addEventListener('abort', () => io.disconnect());
}
