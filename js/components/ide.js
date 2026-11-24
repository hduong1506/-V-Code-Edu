// V-Code Edu — reusable workbench: editor + run/submit toolbar + stdin + terminal + problems + tests (+ web preview).
import { h, mount, debounce } from '../core/dom.js';
import { icon } from './icons.js';
import { createEditor, errorLine } from './editor.js';
import { runCode, gradeCode, renderPreview, onRuntimeStatus, warmup, LANGUAGES } from '../runtime/runner.js';
import { idb } from '../core/idb.js';
import { toast, confirmDialog, copyText } from '../core/ui.js';
import { createProblemsPanel, aiPromptForError } from './ide/problems.js';
import { analyzeCodeAsync } from './ide/diagnostics.js';
import { explainError, readsInput } from './ide/explain-errors.js';
import { getEditorSettings, onEditorSettings } from './ide/settings.js';
import { xicon, openEditorSettings, createEditorThemeButton } from './ide/controls.js';

export const RUNTIME_LABELS = { idle: ['Chưa tải', ''], loading: ['Đang tải…', 'badge--warning'], ready: ['Sẵn sàng', 'badge--success'], busy: ['Đang chạy…', 'badge--live'] };

/**
 * Terminal-like output panel.
 * createTerminal({ placeholder, toolbar }) → { el, clear, write, writeNode, status, meta, getText }
 * toolbar: true adds a header row with the run status, run time and copy / clear buttons.
 */
export function createTerminal({ placeholder = 'Bấm "Chạy thử" (Ctrl + Enter) để xem kết quả.', toolbar = false, title = 'Kết quả' } = {}) {
  const body = h('pre', { class: 'terminal__body', 'aria-live': 'polite', tabindex: '0', 'aria-label': 'Kết quả chương trình' });
  const status = h('div', { class: 'terminal__status' });
  const metaEl = h('span', { class: 'terminal__meta' });
  let empty = true;
  const showPlaceholder = () => mount(body, h('span', { class: 'terminal__muted terminal__placeholder' }, placeholder));
  const bar = toolbar ? h('div', { class: 'terminal__bar' },
    h('span', { class: 'terminal__title' }, xicon('output'), title),
    status,
    h('span', { class: 'grow' }),
    metaEl,
    h('button', { class: 'terminal__tool', type: 'button', title: 'Sao chép kết quả', 'aria-label': 'Sao chép kết quả', onClick: async () => { if (empty) return; toast((await copyText(body.textContent)) ? 'Đã sao chép kết quả.' : 'Không sao chép được.', { duration: 1500 }); } }, icon('copy')),
    h('button', { class: 'terminal__tool', type: 'button', title: 'Xóa màn hình', 'aria-label': 'Xóa màn hình kết quả', onClick: () => api.clear() }, xicon('eraser'))) : null;
  const el = h('div', { class: `terminal${toolbar ? ' terminal--bar' : ''}` }, bar, body, toolbar ? null : status);
  showPlaceholder();
  const api = {
    el,
    clear() { empty = true; showPlaceholder(); mount(status); metaEl.textContent = ''; },
    write(text, stream = 'stdout') {
      if (empty) { mount(body); empty = false; }
      const span = h('span', { class: stream === 'stderr' ? 'terminal__err' : stream === 'info' ? 'terminal__info' : stream === 'ok' ? 'terminal__ok' : '' }, text);
      body.appendChild(span);
      body.scrollTop = body.scrollHeight;
    },
    /** Append a rich node (notices, links) below the output. */
    writeNode(node) {
      if (empty) { mount(body); empty = false; }
      body.appendChild(node);
      body.scrollTop = body.scrollHeight;
    },
    status(text, type = '') {
      mount(status, text ? h('span', { class: `terminal__badge ${type ? `is-${type}` : ''}` }, text) : null);
    },
    meta(text) { metaEl.textContent = text || ''; },
    getText: () => (empty ? '' : body.textContent),
    isEmpty: () => empty,
  };
  return api;
}

/** Render grading results. */
export function renderResults(container, result) {
  if (!result) { mount(container, h('p', { class: 'muted', style: 'padding:14px' }, 'Bấm "Nộp bài" để chấm với toàn bộ bộ test.')); return; }
  const allOk = result.passed === result.total && result.total > 0;
  mount(container,
    h('div', { class: `grade-summary ${allOk ? 'is-pass' : 'is-fail'}` },
      icon(allOk ? 'check-circle' : 'x-circle'),
      h('div', { class: 'grow' },
        h('strong', null, allOk ? 'Chính xác! Bạn đã vượt qua tất cả kiểm thử.' : `Đạt ${result.passed}/${result.total} kiểm thử`),
        h('div', { class: 'muted', style: 'font-size:12px' }, `Điểm: ${result.score10.toFixed(1).replace('.', ',')}/10`)),
    ),
    h('div', { class: 'test-list' }, result.results.map((r) => h('details', { class: `test-item ${r.ok ? 'is-ok' : 'is-bad'}`, open: !r.ok && !r.hidden ? true : undefined },
      h('summary', null, icon(r.ok ? 'check' : 'x'), h('span', { class: 'grow' }, r.label), r.timedOut ? h('span', { class: 'badge badge--warning' }, 'Quá thời gian') : null),
      r.hidden ? h('p', { class: 'muted test-item__body' }, r.ok ? 'Test ẩn đã đạt.' : (r.error || 'Kết quả chưa đúng ở test ẩn. Hãy nghĩ thêm về các trường hợp đặc biệt.'))
        : h('div', { class: 'test-item__body' },
          r.input !== undefined && r.input !== null ? h('div', null, h('div', { class: 'test-item__k' }, 'Dữ liệu vào'), h('pre', null, r.input || '(trống)')) : null,
          r.expected !== undefined && r.expected !== null ? h('div', null, h('div', { class: 'test-item__k' }, 'Kết quả mong đợi'), h('pre', null, r.expected)) : null,
          r.actual !== undefined && r.actual !== null ? h('div', null, h('div', { class: 'test-item__k' }, 'Kết quả của bạn'), h('pre', null, r.actual || '(không in ra gì)')) : null,
          r.error ? h('div', null, h('div', { class: 'test-item__k' }, 'Lỗi'), h('pre', { class: 'is-error' }, r.error)) : null,
          r.message && r.input === undefined ? h('p', null, r.message) : null,
        ),
    ))),
  );
}

/**
 * Keep an editor's gutter markers and a problems panel in sync with static analysis.
 * Returns { run(): Promise, cancel() }.
 */
export function attachDiagnostics({ editor, problems, getLang, getCode = () => editor.getValue(), signal, delay = 450 }) {
  let token = 0;
  async function run() {
    const my = ++token;
    if (!getEditorSettings().diagnostics) { editor.setDiagnostics([]); problems?.setStatic([]); return []; }
    const issues = await analyzeCodeAsync(getCode(), getLang());
    if (my !== token || signal?.aborted) return issues;
    editor.setDiagnostics(issues);
    problems?.setStatic(issues);
    return issues;
  }
  const debounced = debounce(run, delay);
  onEditorSettings(() => debounced(), { signal });
  signal?.addEventListener('abort', () => debounced.cancel());
  return { run, schedule: debounced, cancel: () => debounced.cancel() };
}

/** Small "needs input" notice shown in the output when stdin is empty. */
export function inputNotice(onFocusInput) {
  return h('div', { class: 'term-notice' },
    xicon('input'),
    h('span', null, h('strong', null, 'Chương trình cần dữ liệu vào. '), 'Ô Dữ liệu vào đang trống — mỗi dòng tương ứng một lần input() / cin / scanf.'),
    onFocusInput ? h('button', { class: 'term-notice__btn', type: 'button', onClick: onFocusInput }, 'Nhập dữ liệu') : null);
}

/**
 * Full workbench.
 * opts: { lang, code, starter, stdin, tests, checks, draftKey, readOnly, submitLabel, onSubmitted(result, code), onAskAI({code, error, output}), signal, compact }
 * returns { el, editor, run, grade, getCode, setCode, getStdin, focus }
 */
export function createWorkbench(opts) {
  const { lang, starter = '', tests = [], checks = [], draftKey, signal, submitLabel = 'Nộp bài', onSubmitted, onAskAI } = opts;
  const isWeb = lang === 'html' || lang === 'web';
  const runtimeLang = isWeb ? 'html' : lang;
  const sampleTest = tests.find((t) => !t.hidden) || tests[0];
  let lastError = '';
  let lastOutput = '';
  let runCtrl = null;
  let disposePreview = null;

  const saveDraft = debounce((code) => {
    if (draftKey) idb.put('drafts', { key: draftKey, code, lang, updatedAt: Date.now() }).catch(() => {});
  }, 500);

  const editor = createEditor({
    value: opts.code ?? starter,
    lang: isWeb ? 'html' : lang,
    readOnly: opts.readOnly,
    onChange: (v) => { saveDraft(v); if (isWeb) livePreview(); editor.clearMarks(); diag.schedule(); updateInputHint(); },
    onRun: () => run(),
    onSave: () => toast('Bản nháp được lưu tự động trên thiết bị này.', { duration: 1800 }),
  });

  const runtimeBadge = h('span', { class: 'badge badge--dot' }, 'Sẵn sàng');
  const offRuntime = onRuntimeStatus(runtimeLang, (s, text) => {
    const [label, cls] = RUNTIME_LABELS[s] || ['', ''];
    runtimeBadge.className = `badge badge--dot ${cls}`;
    runtimeBadge.textContent = s === 'loading' && text ? text : label;
  });
  warmup(runtimeLang);

  const btnRun = h('button', { class: 'btn btn--soft', type: 'button', onClick: () => run(), title: 'Ctrl + Enter' }, icon('play'), isWeb ? 'Xem trước' : 'Chạy thử');
  const btnStop = h('button', { class: 'btn btn--danger-soft', type: 'button', hidden: true, onClick: () => runCtrl?.abort() }, icon('stop'), 'Dừng');
  const btnSubmit = (tests.length || checks.length) ? h('button', { class: 'btn btn--primary', type: 'button', onClick: () => grade() }, icon('check'), submitLabel) : null;
  const btnReset = h('button', { class: 'btn btn--ghost btn--icon btn--sm', type: 'button', title: 'Khôi phục mã ban đầu', 'aria-label': 'Khôi phục mã ban đầu', onClick: async () => {
    if (await confirmDialog({ title: 'Khôi phục mã ban đầu?', message: 'Mã hiện tại sẽ bị thay bằng mã khởi tạo của bài.', confirmLabel: 'Khôi phục', danger: true })) {
      editor.replaceValue(starter);
      saveDraft(starter);
      if (isWeb) livePreview();
    }
  } }, icon('restart'));
  const btnAI = onAskAI ? h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => onAskAI({ code: editor.getValue(), error: lastError, output: lastOutput }) }, icon('sparkles'), h('span', { class: 'wb-label' }, 'Hỏi V-Mentor')) : null;
  const iconBtn = (child, title, onClick) => h('button', { class: 'btn btn--ghost btn--icon btn--sm', type: 'button', title, 'aria-label': title, onClick }, child);
  const btnFormat = opts.readOnly ? null : iconBtn(xicon('format'), 'Định dạng mã (Shift+Alt+F)', () => { if (!editor.format()) toast('Mã đã gọn gàng.', { duration: 1200 }); });
  const btnFind = iconBtn(icon('search'), 'Tìm / thay thế (Ctrl+F)', () => editor.openFind());
  const btnSettings = iconBtn(icon('settings'), 'Cài đặt trình soạn thảo', (e) => openEditorSettings(e.currentTarget));
  btnSettings.setAttribute('aria-haspopup', 'dialog');

  const toolbar = h('div', { class: 'wb-toolbar' },
    h('span', { class: 'pill-tag' }, LANGUAGES[runtimeLang]?.label || lang),
    runtimeBadge,
    h('div', { class: 'grow' }),
    h('div', { class: 'wb-tools', role: 'toolbar', 'aria-label': 'Công cụ soạn thảo' }, btnFormat, btnFind, createEditorThemeButton({ signal, compact: true }), btnSettings),
    h('span', { class: 'wb-sep', 'aria-hidden': 'true' }),
    btnAI, btnReset,
  );

  // Bottom panel
  const terminal = createTerminal({ placeholder: isWeb ? 'Bảng điều khiển (console) của trang sẽ hiện ở đây.' : undefined });
  const stdin = h('textarea', { class: 'textarea textarea--code wb-stdin', spellcheck: 'false', placeholder: 'Mỗi dòng là một lần input()…', 'aria-label': 'Dữ liệu vào' });
  stdin.value = opts.stdin ?? sampleTest?.input ?? '';
  const results = h('div', { class: 'wb-results scroll-y' });
  renderResults(results, null);
  const preview = isWeb ? h('iframe', { class: 'wb-preview', title: 'Xem trước trang web' }) : null;
  const problems = createProblemsPanel({
    compact: true,
    getLang: () => runtimeLang,
    onJump: (line) => { editor.jumpToLine(line); },
    onAskAI: onAskAI ? (r) => onAskAI({ code: editor.getValue(), error: r.raw || r.message || r.title, output: lastOutput, prompt: aiPromptForError(r) }) : null,
  });
  const diag = attachDiagnostics({ editor, problems, getLang: () => runtimeLang, signal });
  diag.run();

  const inputHint = h('p', { class: 'field__hint wb-input-hint' });
  function updateInputHint() {
    if (isWeb) return;
    const needs = readsInput(editor.getValue(), lang);
    inputHint.textContent = needs && !stdin.value.trim() ? 'Chương trình có đọc dữ liệu (input / cin / scanf) nhưng ô này đang trống.' : 'Chương trình đọc lần lượt từng dòng khi gọi input() / cin / scanf.';
    inputHint.classList.toggle('is-warn', needs && !stdin.value.trim());
  }
  stdin.addEventListener('input', updateInputHint);
  updateInputHint();

  const panes = isWeb
    ? { preview: h('div', { class: 'wb-pane' }, preview), console: h('div', { class: 'wb-pane' }, terminal.el), problems: h('div', { class: 'wb-pane scroll-y' }, problems.el), tests: h('div', { class: 'wb-pane' }, results) }
    : { output: h('div', { class: 'wb-pane' }, terminal.el), input: h('div', { class: 'wb-pane wb-pane--pad' }, h('label', { class: 'field__label', style: 'margin-bottom:6px;display:block' }, 'Dữ liệu vào (stdin)'), stdin, inputHint), problems: h('div', { class: 'wb-pane scroll-y' }, problems.el), tests: h('div', { class: 'wb-pane' }, results) };
  const labels = { preview: 'Xem trước', console: 'Console', output: 'Kết quả', input: 'Dữ liệu vào', problems: 'Lỗi', tests: 'Kiểm thử' };
  const tabsEl = h('div', { class: 'tabs wb-tabs', role: 'tablist' });
  const paneHost = h('div', { class: 'wb-panes' }, Object.values(panes));
  const badge = h('span', { class: 'count wb-count', hidden: true });
  let activeTab = Object.keys(panes)[0];
  const tabBtns = {};
  Object.keys(panes).filter((k) => k !== 'tests' || tests.length || checks.length).forEach((k) => {
    tabBtns[k] = h('button', { class: 'tab', role: 'tab', type: 'button', id: `wb-tab-${k}-${Math.random().toString(36).slice(2, 7)}`, onClick: () => showTab(k) }, labels[k], k === 'problems' ? badge : null);
    tabsEl.appendChild(tabBtns[k]);
  });
  function showTab(id) {
    activeTab = id;
    Object.entries(panes).forEach(([k, p]) => { p.hidden = k !== id; });
    Object.entries(tabBtns).forEach(([k, b]) => b.setAttribute('aria-selected', String(k === id)));
    if (id === 'problems') tabBtns.problems?.classList.remove('is-flagged');
  }
  showTab(activeTab);
  problems.onChange((c) => {
    const n = c.errors + c.runtime;
    badge.hidden = !(n || c.warnings);
    badge.textContent = String(n || c.warnings);
    badge.classList.toggle('is-error', n > 0);
  });

  const actions = h('div', { class: 'wb-actions' }, btnRun, btnStop, btnSubmit);
  const bottom = h('div', { class: 'wb-bottom' }, h('div', { class: 'wb-bottom__head' }, tabsEl, actions), paneHost);
  const el = h('div', { class: 'workbench' }, toolbar, h('div', { class: 'wb-editor' }, editor.el), bottom);

  const livePreview = debounce(() => {
    if (!isWeb) return;
    disposePreview?.();
    terminal.clear();
    disposePreview = renderPreview(preview, editor.getValue(), { onConsole: ({ type, data }) => terminal.write(`${data}\n`, type === 'error' || type === 'warn' ? 'stderr' : 'stdout') });
  }, 400);
  if (isWeb) livePreview();

  async function run() {
    if (isWeb) {
      showTab('preview');
      livePreview.cancel();
      disposePreview?.();
      terminal.clear();
      disposePreview = renderPreview(preview, editor.getValue(), { onConsole: ({ type, data }) => terminal.write(`${data}\n`, type === 'error' || type === 'warn' ? 'stderr' : 'stdout') });
      return null;
    }
    runCtrl?.abort();
    runCtrl = new AbortController();
    showTab('output');
    terminal.clear();
    editor.clearMarks();
    problems.clearRuntime();
    btnRun.hidden = true;
    btnStop.hidden = false;
    terminal.status('Đang chạy…', 'live');
    lastError = '';
    const code = editor.getValue();
    if (readsInput(code, lang) && !stdin.value.trim()) terminal.writeNode(inputNotice(() => { showTab('input'); stdin.focus(); }));
    const res = await runCode({ lang, code, stdin: stdin.value, signal: runCtrl.signal, onOutput: (chunk, stream) => terminal.write(chunk, stream) });
    btnRun.hidden = false;
    btnStop.hidden = true;
    lastOutput = res.stdout;
    if (!res.ok) {
      lastError = res.error || res.stderr;
      if (res.error) terminal.write(`\n${res.error}\n`, 'stderr');
      const ex = explainError(res, { lang, code, stdin: stdin.value });
      const line = ex?.line || errorLine(res.error);
      if (line && !res.aborted) editor.markLine(line, 'error');
      problems.setRuntime(ex);
      terminal.status(res.timedOut ? 'Quá thời gian' : res.aborted ? 'Đã dừng' : 'Có lỗi', 'err');
      if (!res.aborted) {
        terminal.writeNode(h('button', { class: 'term-link', type: 'button', onClick: () => showTab('problems') }, icon('bug'), `${ex?.title || 'Xem giải thích lỗi'} — xem giải thích`));
        tabBtns.problems?.classList.add('is-flagged');
      }
    } else {
      if (!res.stdout && !res.stderr) terminal.write('(Chương trình không in ra gì)\n', 'info');
      terminal.status(`Hoàn tất · ${Math.round(res.durationMs || 0)} ms`, 'ok');
    }
    return res;
  }

  async function grade() {
    if (!btnSubmit) return null;
    btnSubmit.classList.add('is-loading');
    btnRun.disabled = true;
    showTab('tests');
    mount(results, h('div', { class: 'cluster', style: 'padding:16px' }, h('div', { class: 'spinner' }), h('span', { class: 'muted' }, 'Đang chấm bài…')));
    try {
      const result = await gradeCode({ lang: runtimeLang, code: editor.getValue(), tests, checks, onProgress: (i, n) => mount(results, h('div', { class: 'cluster', style: 'padding:16px' }, h('div', { class: 'spinner' }), h('span', { class: 'muted' }, `Đang chạy test ${i + 1}/${n}…`))) });
      renderResults(results, result);
      const firstErr = result.results.find((r) => !r.ok && r.error);
      lastError = firstErr?.error || '';
      if (firstErr?.error) {
        const visible = !firstErr.hidden;
        const ex = visible ? explainError({ ok: false, error: firstErr.error, timedOut: firstErr.timedOut }, { lang: runtimeLang, code: editor.getValue(), stdin: firstErr.input || '' }) : null;
        const line = ex?.line || errorLine(firstErr.error);
        if (line) editor.markLine(line, 'error');
        if (ex) { problems.setRuntime(ex); tabBtns.problems?.classList.add('is-flagged'); }
      }
      await onSubmitted?.(result, editor.getValue());
      return result;
    } catch (err) {
      mount(results, h('div', { class: 'callout callout--danger', style: 'margin:14px' }, icon('alert'), h('div', null, `Không chấm được bài: ${err.message}`)));
      return null;
    } finally {
      btnSubmit.classList.remove('is-loading');
      btnRun.disabled = false;
    }
  }

  signal?.addEventListener('abort', () => { runCtrl?.abort(); offRuntime(); disposePreview?.(); editor.destroy(); });

  return {
    el, editor, run, grade,
    getCode: () => editor.getValue(),
    setCode: (c) => { editor.setValue(c); if (isWeb) livePreview(); diag.schedule(); },
    getStdin: () => stdin.value,
    focus: () => editor.focus(),
  };
}

/** Load an autosaved draft (or null). */
export async function loadDraft(key) {
  try { return (await idb.get('drafts', key))?.code ?? null; } catch { return null; }
}
