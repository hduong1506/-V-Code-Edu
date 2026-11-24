// V-Code Edu — UI primitives: toast, modal (native <dialog>), confirm/prompt, copy, dropdown menu.
import { h, $ } from './dom.js';
import { icon } from '../components/icons.js';

const TOAST_ICON = { success: 'check-circle', error: 'x-circle', warning: 'alert', info: 'info' };

function toastRegion() {
  let region = $('#toast-region');
  if (!region) {
    region = h('div', { id: 'toast-region', class: 'toast-region', role: 'status', 'aria-live': 'polite' });
    document.body.appendChild(region);
  }
  return region;
}

/** Show a toast. type: info | success | warning | error */
export function toast(message, { type = 'info', duration = 4200, action } = {}) {
  const close = () => {
    el.classList.add('is-leaving');
    setTimeout(() => el.remove(), 220);
  };
  const el = h('div', { class: `toast toast--${type}`, role: type === 'error' ? 'alert' : 'status' },
    icon(TOAST_ICON[type] || 'info'),
    h('div', { class: 'grow' }, message),
    action ? h('button', { class: 'btn btn--sm btn--ghost', style: 'color:inherit', onClick: () => { action.onClick(); close(); } }, action.label) : null,
    h('button', { class: 'toast__close', 'aria-label': 'Đóng thông báo', onClick: close }, icon('x')),
  );
  toastRegion().appendChild(el);
  if (duration > 0) setTimeout(close, duration);
  return close;
}

/**
 * Open a modal dialog.
 * openModal({ title, content: Node|string, actions: [{ label, variant, onClick(close) => bool|Promise, autofocus }], size: 'sm'|'md'|'lg'|'xl', onClose, dismissible })
 * Returns { el, body, close }.
 */
export function openModal({ title, content, actions = [], size = 'md', onClose, dismissible = true, className = '' } = {}) {
  const dialog = h('dialog', { class: `modal ${size !== 'md' ? `modal--${size}` : ''} ${className}`.trim(), 'aria-label': title || 'Hộp thoại' });
  let closed = false;
  const close = (result) => {
    if (closed) return;
    closed = true;
    try { dialog.close(); } catch { /* already closed */ }
    dialog.remove();
    onClose?.(result);
  };
  const body = h('div', { class: 'modal__body' }, content);
  const header = title !== undefined ? h('div', { class: 'modal__header' },
    h('h2', { class: 'modal__title' }, title),
    dismissible ? h('button', { class: 'btn btn--ghost btn--icon btn--sm', 'aria-label': 'Đóng', onClick: () => close(null) }, icon('x')) : null,
  ) : null;
  const footer = actions.length ? h('div', { class: 'modal__footer' }, actions.map((a) => {
    const btn = h('button', {
      class: `btn ${a.variant ? `btn--${a.variant}` : ''}`,
      type: a.type || 'button',
      autofocus: a.autofocus || undefined,
      onClick: async () => {
        if (!a.onClick) return close(a.value ?? null);
        btn.classList.add('is-loading');
        try {
          const res = await a.onClick(close);
          if (res !== false) close(a.value ?? res ?? null);
        } finally {
          btn.classList.remove('is-loading');
        }
      },
    }, a.icon ? icon(a.icon) : null, a.label);
    return btn;
  })) : null;
  dialog.append(...[header, body, footer].filter(Boolean));
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); if (dismissible) close(null); });
  dialog.addEventListener('click', (e) => { if (dismissible && e.target === dialog) close(null); });
  document.body.appendChild(dialog);
  dialog.showModal();
  return { el: dialog, body, close };
}

/** Promise<boolean> confirmation dialog. */
export function confirmDialog({ title = 'Xác nhận', message = '', confirmLabel = 'Đồng ý', cancelLabel = 'Hủy', danger = false } = {}) {
  return new Promise((resolve) => {
    openModal({
      title,
      size: 'sm',
      content: h('p', { class: 'text-2' }, message),
      actions: [
        { label: cancelLabel, variant: 'ghost', value: false },
        { label: confirmLabel, variant: danger ? 'danger' : 'primary', value: true, autofocus: true },
      ],
      onClose: (v) => resolve(v === true),
    });
  });
}

/** Promise<string|null> text prompt dialog. */
export function promptDialog({ title = 'Nhập giá trị', label = '', value = '', placeholder = '', confirmLabel = 'Lưu', maxLength = 120 } = {}) {
  return new Promise((resolve) => {
    const input = h('input', { class: 'input', value, placeholder, maxlength: maxLength, 'aria-label': label || title });
    let result = null;
    const form = h('form', { class: 'field', onSubmit: (e) => { e.preventDefault(); result = input.value.trim(); m.close(); } },
      label ? h('label', { class: 'field__label' }, label) : null, input);
    const m = openModal({
      title, size: 'sm', content: form,
      actions: [
        { label: 'Hủy', variant: 'ghost' },
        { label: confirmLabel, variant: 'primary', onClick: () => { result = input.value.trim(); } },
      ],
      onClose: () => resolve(result === '' ? null : result),
    });
    setTimeout(() => { input.focus(); input.select(); }, 30);
  });
}

/** Copy text to clipboard; returns true on success. */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = h('textarea', { style: 'position:fixed;opacity:0;left:-9999px' }, text);
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    ta.remove();
    return ok;
  }
}

/** Wire a dropdown: root has .menu, a trigger button and a .menu__panel. Closes on outside click / Escape. */
export function bindMenu(root, signal) {
  const trigger = root.querySelector('[data-menu-trigger]');
  const setOpen = (open) => {
    root.classList.toggle('is-open', open);
    trigger?.setAttribute('aria-expanded', String(open));
  };
  trigger?.addEventListener('click', (e) => { e.stopPropagation(); setOpen(!root.classList.contains('is-open')); }, { signal });
  document.addEventListener('click', (e) => { if (!root.contains(e.target)) setOpen(false); }, { signal });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); }, { signal });
  root.querySelector('.menu__panel')?.addEventListener('click', (e) => { if (e.target.closest('.menu__item')) setOpen(false); }, { signal });
  return setOpen;
}

/** Download a text/blob as a file. */
export function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Render an empty state block. */
export function emptyState({ iconName = 'info', title, text, action } = {}) {
  return h('div', { class: 'empty-state' },
    h('div', { class: 'empty-state__icon' }, icon(iconName)),
    title ? h('h3', null, title) : null,
    text ? h('p', null, text) : null,
    action || null,
  );
}
