// V-Code Edu — Flowchart studio: node kinds, sizing and text measuring (shared by live view + designer).

export const KINDS = {
  start:    { label: 'Bắt đầu',  shape: 'terminal', cat: 'start', ports: ['out'] },
  end:      { label: 'Kết thúc', shape: 'terminal', cat: 'end',   ports: [] },
  input:    { label: 'Nhập',     shape: 'io',       cat: 'io',    ports: ['out'] },
  output:   { label: 'Xuất',     shape: 'io',       cat: 'io',    ports: ['out'] },
  process:  { label: 'Xử lý',    shape: 'process',  cat: 'proc',  ports: ['out'] },
  decision: { label: 'Điều kiện', shape: 'decision', cat: 'dec',  ports: ['yes', 'no'] },
  call:     { label: 'Gọi chương trình con', shape: 'call', cat: 'call', ports: ['out'] },
  // live-view only kinds
  fnstart:  { label: 'Hàm',      shape: 'terminal', cat: 'start', ports: ['out'] },
  return:   { label: 'Trả về',   shape: 'terminal', cat: 'end',   ports: [] },
  foreach:  { label: 'Duyệt',    shape: 'prep',     cat: 'loop',  ports: ['yes', 'no'] },
};

export const DESIGNER_KINDS = ['start', 'end', 'input', 'output', 'process', 'decision', 'call'];

export const DEFAULT_TEXT = {
  start: 'Bắt đầu',
  end: 'Kết thúc',
  input: 'Nhập n',
  output: 'In kq',
  process: 'kq = 0',
  decision: 'n > 0',
  call: 'ds.append(n)',
};

export const PORT_LABEL = { yes: 'Đúng', no: 'Sai', out: '' };

export const FONT_CODE = '500 12px "JetBrains Mono", ui-monospace, "Cascadia Code", Consolas, monospace';
export const FONT_TERM = '600 12.5px "Be Vietnam Pro", system-ui, "Segoe UI", sans-serif';
export const LINE_H = 16;

let measureCtx = null;
const cache = new Map();

export function measure(text, font = FONT_CODE) {
  const key = font + '\u0000' + text;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  if (!measureCtx) {
    try { measureCtx = document.createElement('canvas').getContext('2d'); } catch { measureCtx = null; }
  }
  let w;
  if (measureCtx) {
    measureCtx.font = font;
    w = measureCtx.measureText(text).width;
  } else {
    w = text.length * 7.3;
  }
  // monospace fallbacks can be narrower than the real font: keep a small safety margin
  w = Math.ceil(w * 1.04);
  if (cache.size > 4000) cache.clear();
  cache.set(key, w);
  return w;
}

/** Wrap text to lines that fit maxW. Honors explicit newlines. Max `maxLines` lines (ellipsis). */
export function wrapText(text, maxW, font = FONT_CODE, maxLines = 3) {
  const out = [];
  const paragraphs = String(text ?? '').split('\n');
  let truncated = false;
  for (const para of paragraphs) {
    if (out.length >= maxLines) { truncated = true; break; }
    const words = para.split(/(\s+)/).filter((x) => x.length);
    let line = '';
    for (const wd of words) {
      const cand = line + wd;
      if (measure(cand.trimEnd(), font) <= maxW || !line.trim()) {
        if (!line.trim() && measure(wd, font) > maxW) {
          // hard break a long token
          let chunk = '';
          for (const ch of wd) {
            if (measure(chunk + ch, font) > maxW && chunk) { out.push(chunk); chunk = ''; if (out.length >= maxLines) break; }
            chunk += ch;
          }
          line = chunk;
          if (out.length >= maxLines) { truncated = true; break; }
        } else {
          line = cand;
        }
      } else {
        out.push(line.trimEnd());
        if (out.length >= maxLines) { truncated = true; line = ''; break; }
        line = wd.trimStart();
      }
    }
    if (truncated) break;
    out.push(line.trimEnd());
  }
  if (out.length > maxLines) { out.length = maxLines; truncated = true; }
  if (truncated && out.length) {
    let last = out[out.length - 1];
    while (last.length > 1 && measure(last + '…', font) > maxW) last = last.slice(0, -1);
    out[out.length - 1] = last + '…';
  }
  return out.length ? out : [''];
}

const MAXW = { terminal: 190, process: 230, call: 210, io: 210, decision: 170, prep: 200 };

/** Compute { w, h, lines, font } for a node of `kind` with `text`. */
export function nodeSize(kind, text) {
  const def = KINDS[kind] || KINDS.process;
  const shape = def.shape;
  const font = shape === 'terminal' ? FONT_TERM : FONT_CODE;
  const maxLines = shape === 'process' ? 5 : 3;
  const lines = wrapText(text || ' ', MAXW[shape], font, maxLines);
  const tw = Math.max(...lines.map((l) => measure(l, font)), 10);
  const th = lines.length * LINE_H;
  let w; let h;
  switch (shape) {
    case 'terminal': w = Math.max(104, tw + 40); h = Math.max(36, th + 18); break;
    case 'io': w = Math.max(124, tw + 52); h = Math.max(40, th + 20); break;
    case 'call': w = Math.max(124, tw + 44); h = Math.max(40, th + 20); break;
    case 'prep': w = Math.max(130, tw + 52); h = Math.max(40, th + 20); break;
    case 'decision': {
      const r = 2.5;
      let a = tw / 2 + (r * th) / 2 + 12;
      a = Math.max(a, 58);
      const b = Math.max(a / r, 28);
      w = a * 2; h = b * 2;
      break;
    }
    default: w = Math.max(112, tw + 32); h = Math.max(40, th + 20); break;
  }
  w = Math.ceil(w / 2) * 2;
  h = Math.ceil(h / 2) * 2;
  return { w, h, lines, font, shape, cat: def.cat };
}

/** Port anchor (relative to node center) and outgoing direction. */
export function portAnchor(kind, size, port) {
  const { w, h } = size;
  const shape = (KINDS[kind] || KINDS.process).shape;
  if (shape === 'decision' || shape === 'prep') {
    if (port === 'yes') return { x: 0, y: h / 2, dir: 'down' };
    if (port === 'no') return { x: w / 2, y: 0, dir: 'right' };
  }
  return { x: 0, y: h / 2, dir: 'down' };
}

export function cloneGraph(g) {
  return { nodes: g.nodes.map((n) => ({ ...n })), edges: g.edges.map((e) => ({ ...e })) };
}

export function shortText(text, max = 28) {
  const t = String(text ?? '').trim().replace(/\s*\n\s*/g, '; ').replace(/\s+/g, ' ');
  return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}
