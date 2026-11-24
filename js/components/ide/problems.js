// V-Code Edu — "Lỗi & Gỡ lỗi" panel: runtime error explanation + static diagnostics, shared by IDE and workbench.
import { h, mount, raw } from '../../core/dom.js';
import { icon } from '../icons.js';
import { highlight } from '../highlight.js';

const SEV = {
  error: { label: 'Lỗi', icon: 'x-circle' },
  warning: { label: 'Cảnh báo', icon: 'alert' },
  info: { label: 'Gợi ý', icon: 'info' },
};

/**
 * createProblemsPanel({ onJump(line, file), onAskAI(payload) | null, getLang(), compact })
 * → { el, setStatic(issues), setRuntime(explanation|null), clearRuntime(), counts(), onChange(fn) }
 */
export function createProblemsPanel({ onJump, onAskAI, getLang = () => 'python', compact = false } = {}) {
  const el = h('div', { class: `problems${compact ? ' problems--compact' : ''}`, role: 'region', 'aria-label': 'Lỗi và gỡ lỗi' });
  let staticIssues = [];
  let runtime = null;
  let filter = 'all';
  let checkedOnce = false;
  const listeners = new Set();

  const counts = () => {
    // A runtime error already reported by a static check on the same line is counted once.
    const dup = runtime && runtime.line > 0 && staticIssues.some((i) => i.severity === 'error' && i.line === runtime.line);
    const c = { errors: 0, warnings: 0, infos: 0, runtime: runtime && runtime.type !== 'Aborted' && !dup ? 1 : 0 };
    staticIssues.forEach((i) => { if (i.severity === 'error') c.errors += 1; else if (i.severity === 'warning') c.warnings += 1; else c.infos += 1; });
    c.total = c.errors + c.warnings + c.runtime;
    return c;
  };

  function jumpBtn(line, file, label) {
    return line > 0 ? h('button', { class: 'pb-chip', type: 'button', onClick: (e) => { e.stopPropagation(); onJump?.(line, file); } }, label || `Dòng ${line}`) : null;
  }

  function runtimeCard(r) {
    const lang = getLang();
    const sameFile = !r.file || /main\.|^main$/.test(r.file) || r.isActiveFile !== false;
    return h('article', { class: `pb-runtime${r.type === 'Aborted' ? ' is-info' : ''}`, 'aria-live': 'polite' },
      h('header', { class: 'pb-runtime__head' },
        h('span', { class: 'pb-runtime__icon', 'aria-hidden': 'true' }, icon(r.type === 'Timeout' ? 'clock' : r.type === 'Aborted' ? 'stop' : 'bug')),
        h('div', { class: 'grow' },
          h('div', { class: 'pb-runtime__kicker' }, r.type === 'Aborted' ? 'Đã dừng' : 'Lỗi khi chạy', r.type && !['Timeout', 'Aborted', 'Error'].includes(r.type) ? h('code', null, r.type) : null),
          h('h3', { class: 'pb-runtime__title' }, r.title)),
        r.line > 0 ? h('button', { class: 'btn btn--sm pb-goto', type: 'button', onClick: () => onJump?.(r.line, r.file) }, icon('arrow-right'), r.file && !sameFile ? `${r.file} : ${r.line}` : `Dòng ${r.line}`) : null),
      r.line > 0 && r.codeLine !== undefined && r.codeLine !== '' ? h('button', { class: 'pb-code', type: 'button', title: 'Đi tới dòng lỗi', onClick: () => onJump?.(r.line, r.file) },
        h('span', { class: 'pb-code__ln' }, String(r.line)),
        h('code', { class: 'pb-code__src' }, raw(highlight(r.codeLine.replace(/^\s+/, ''), lang === 'pyvn' ? 'pyvn' : lang)))) : null,
      r.explanation ? h('div', { class: 'pb-block' }, h('div', { class: 'pb-block__k' }, icon('info'), 'Giải thích'), h('p', null, r.explanation)) : null,
      r.hint ? h('div', { class: 'pb-block pb-block--fix' }, h('div', { class: 'pb-block__k' }, icon('bulb'), 'Cách sửa'), h('p', null, r.hint)) : null,
      r.raw ? h('details', { class: 'pb-raw' }, h('summary', null, 'Thông báo lỗi gốc'), h('pre', null, r.raw)) : null,
      onAskAI && r.type !== 'Aborted' ? h('div', { class: 'pb-actions' },
        h('button', { class: 'btn btn--ai btn--sm', type: 'button', onClick: () => onAskAI({ kind: 'runtime', ...r }) }, icon('sparkles'), 'Hỏi V-Mentor về lỗi này')) : null);
  }

  function row(it) {
    const s = SEV[it.severity] || SEV.info;
    const clickable = it.line > 0;
    return h(clickable ? 'button' : 'div', {
      class: `pb-row is-${it.severity}`, type: clickable ? 'button' : undefined,
      onClick: clickable ? () => onJump?.(it.line, it.file) : undefined,
      title: clickable ? `Đi tới dòng ${it.line}` : undefined,
    },
    h('span', { class: 'pb-row__sev', 'aria-label': s.label }, icon(s.icon)),
    h('span', { class: 'pb-row__body' },
      h('span', { class: 'pb-row__title' }, it.title),
      it.detail ? h('span', { class: 'pb-row__detail' }, it.detail) : null,
      it.hint ? h('span', { class: 'pb-row__hint' }, icon('bulb'), it.hint) : null),
    h('span', { class: 'pb-row__ln' }, it.line > 0 ? `Dòng ${it.line}` : '—'));
  }

  function render() {
    const c = counts();
    const shown = staticIssues.filter((i) => filter === 'all' || (filter === 'error' ? i.severity === 'error' : i.severity !== 'error'));
    const filterBtn = (id, label, n) => h('button', { class: 'pb-filter', type: 'button', 'aria-pressed': String(filter === id), onClick: () => { filter = id; render(); } }, label, n !== undefined ? h('span', { class: 'pb-filter__n' }, String(n)) : null);
    mount(el,
      runtime ? runtimeCard(runtime) : null,
      h('section', { class: 'pb-static' },
        h('header', { class: 'pb-static__head' },
          h('span', { class: 'pb-static__title' }, icon('shield'), 'Kiểm tra mã nguồn'),
          h('span', { class: 'grow' }),
          staticIssues.length ? h('div', { class: 'pb-filters', role: 'group', 'aria-label': 'Lọc' },
            filterBtn('all', 'Tất cả', staticIssues.length), filterBtn('error', 'Lỗi', c.errors), filterBtn('warn', 'Cảnh báo', c.warnings + c.infos)) : null),
        shown.length ? h('div', { class: 'pb-list' }, shown.map(row))
          : h('div', { class: 'pb-empty' },
            h('span', { class: 'pb-empty__icon' }, icon('check-circle')),
            h('div', null,
              h('strong', null, staticIssues.length ? 'Không có mục nào trong bộ lọc này' : (checkedOnce ? 'Không phát hiện lỗi thường gặp' : 'Chưa kiểm tra')),
              h('p', null, runtime ? 'Phần kiểm tra tĩnh không thấy lỗi cú pháp — lỗi phía trên chỉ xuất hiện khi chương trình chạy.' : 'Kiểm tra tĩnh tìm lỗi thụt lề, thiếu dấu, ngoặc chưa đóng, biến chưa khai báo… Hãy chạy chương trình để kiểm tra đầy đủ.')))));
    listeners.forEach((fn) => fn(c));
  }

  render();
  return {
    el,
    setStatic(list) { staticIssues = Array.isArray(list) ? list : []; checkedOnce = true; render(); },
    setRuntime(r) { runtime = r || null; render(); },
    clearRuntime() { if (runtime) { runtime = null; render(); } },
    getRuntime: () => runtime,
    getStatic: () => staticIssues,
    counts,
    onChange(fn) { listeners.add(fn); fn(counts()); return () => listeners.delete(fn); },
  };
}

/** Prompt text for V-Mentor about one error. */
export function aiPromptForError(r) {
  const where = r.line > 0 ? ` ở dòng ${r.line}${r.codeLine ? ` (\`${r.codeLine.trim()}\`)` : ''}` : '';
  return `Chương trình của em gặp lỗi "${r.title}"${where}.${r.message ? `\nThông báo: ${r.message}` : ''}\nHãy giải thích vì sao lỗi xảy ra và gợi ý cách sửa từng bước (đừng viết hộ toàn bộ lời giải nhé).`;
}
