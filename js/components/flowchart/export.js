// V-Code Edu — Flowchart studio: export the canvas as a standalone SVG or a PNG.
// CSS variables don't survive outside the page, so computed styles are inlined into a clone.
import { downloadFile, toast } from '../../core/ui.js';

const PROPS = ['fill', 'fill-opacity', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity',
  'font-family', 'font-size', 'font-weight', 'font-variant-ligatures', 'font-feature-settings', 'letter-spacing', 'paint-order', 'display', 'visibility'];

function inline(src, dst) {
  if (src.nodeType !== 1) return;
  const cs = getComputedStyle(src);
  let style = '';
  for (const p of PROPS) {
    const v = cs.getPropertyValue(p);
    if (v) style += `${p}:${v};`;
  }
  dst.setAttribute('style', style);
  dst.removeAttribute('class');
  const a = src.children; const b = dst.children;
  for (let i = 0; i < a.length && i < b.length; i++) inline(a[i], b[i]);
}

/** Build a standalone SVG string for `layer` content within bbox. */
export function buildSvg(svg, layer, bbox, { padding = 24 } = {}) {
  const host = svg.closest('.fc-canvas') || svg.parentElement;
  const bg = getComputedStyle(host).getPropertyValue('--fc-canvas').trim() || getComputedStyle(host).backgroundColor || '#ffffff';
  const clone = svg.cloneNode(true);
  inline(svg, clone);
  clone.querySelectorAll('[data-noexport]').forEach((x) => x.remove());
  const w = Math.ceil(bbox.w + padding * 2);
  const h = Math.ceil(bbox.h + padding * 2);
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('viewBox', `${bbox.x - padding} ${bbox.y - padding} ${w} ${h}`);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.removeAttribute('style');
  const layerClone = clone.querySelector('[data-layer]');
  if (layerClone) layerClone.removeAttribute('transform');
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  rect.setAttribute('x', String(bbox.x - padding));
  rect.setAttribute('y', String(bbox.y - padding));
  rect.setAttribute('width', String(w));
  rect.setAttribute('height', String(h));
  rect.setAttribute('fill', bg);
  clone.insertBefore(rect, clone.firstChild);
  return { text: `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`, w, h };
}

export function exportSvg(svg, layer, bbox, filename = 'luu-do.svg') {
  const { text } = buildSvg(svg, layer, bbox);
  downloadFile(filename, text, 'image/svg+xml;charset=utf-8');
}

export function exportPng(svg, layer, bbox, filename = 'luu-do.png', scale = 2) {
  const { text, w, h } = buildSvg(svg, layer, bbox);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml;charset=utf-8' }));
  img.onload = () => {
    try {
      const k = Math.min(scale, 8000 / Math.max(w, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(w * k);
      canvas.height = Math.round(h * k);
      const ctx = canvas.getContext('2d');
      ctx.scale(k, k);
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => {
        if (blob) downloadFile(filename, blob);
        else toast('Không tạo được ảnh PNG.', { type: 'error' });
      }, 'image/png');
    } catch {
      toast('Không tạo được ảnh PNG.', { type: 'error' });
    } finally {
      URL.revokeObjectURL(url);
    }
  };
  img.onerror = () => { URL.revokeObjectURL(url); toast('Không tạo được ảnh PNG.', { type: 'error' }); };
  img.src = url;
}
