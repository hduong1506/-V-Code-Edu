// V-Code Edu — code execution coordinator.
// Every language runs in an isolated Web Worker (or a sandboxed iframe for HTML), so student code can never
// touch the app, its storage, or the user's session — and runaway loops are stopped by terminating the worker.
import { PYODIDE_BASE } from '../config.js';
import { translatePyvn } from './pyvn.js';
import { runChecks } from './html-checks.js';
import { uid } from '../core/dom.js';

export const LANGUAGES = {
  python: { id: 'python', label: 'Python 3', short: 'Python', ext: 'py', highlight: 'python', engine: 'Pyodide (CPython 3.12 · WebAssembly)', offline: 'sau lần tải đầu' },
  pyvn: { id: 'pyvn', label: 'Python Tiếng Việt', short: 'Py TV', ext: 'py', highlight: 'pyvn', engine: 'Pyodide + bộ dịch từ khóa tiếng Việt', offline: 'sau lần tải đầu' },
  javascript: { id: 'javascript', label: 'JavaScript', short: 'JS', ext: 'js', highlight: 'javascript', engine: 'Web Worker (JavaScript gốc)', offline: 'luôn sẵn sàng' },
  c: { id: 'c', label: 'C', short: 'C', ext: 'c', highlight: 'c', engine: 'JSCPP (trình thông dịch C/C++ giáo dục)', offline: 'luôn sẵn sàng' },
  cpp: { id: 'cpp', label: 'C++', short: 'C++', ext: 'cpp', highlight: 'cpp', engine: 'JSCPP (tập con C++, không có STL)', offline: 'luôn sẵn sàng' },
  sql: { id: 'sql', label: 'SQL (SQLite)', short: 'SQL', ext: 'sql', highlight: 'sql', engine: 'sql.js (SQLite · WebAssembly)', offline: 'luôn sẵn sàng' },
  html: { id: 'html', label: 'HTML / CSS / JS', short: 'Web', ext: 'html', highlight: 'html', engine: 'Khung xem trước an toàn (iframe sandbox)', offline: 'luôn sẵn sàng' },
};

const WORKER_FILES = {
  python: 'python.worker.js',
  javascript: 'js.worker.js',
  c: 'cpp.worker.js',
  cpp: 'cpp.worker.js',
  sql: 'sql.worker.js',
};

const DEFAULT_TIMEOUT = { python: 12000, javascript: 6000, c: 12000, cpp: 12000, sql: 8000 };
const MAX_OUTPUT = 200_000; // characters kept per run

class WorkerHost {
  constructor(kind) {
    this.kind = kind;
    this.worker = null;
    this.status = 'idle'; // idle | loading | ready | busy
    this.pending = new Map();
    this.queue = Promise.resolve();
    this.listeners = new Set();
  }

  onStatus(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  setStatus(s, text) {
    this.status = s;
    this.listeners.forEach((fn) => fn(s, text));
  }

  spawn() {
    if (this.worker) return this.worker;
    const file = WORKER_FILES[this.kind];
    this.worker = new Worker(new URL(`./${file}`, import.meta.url));
    this.worker.onmessage = (e) => this.handle(e.data || {});
    this.worker.onerror = (e) => {
      const err = e.message || 'Lỗi trình chạy';
      for (const p of this.pending.values()) p.finish({ ok: false, error: err });
      this.pending.clear();
    };
    if (this.kind === 'python') {
      this.setStatus('loading', 'Đang tải Python…');
      this.worker.postMessage({ type: 'init', indexURL: PYODIDE_BASE });
    } else {
      this.setStatus('ready');
    }
    return this.worker;
  }

  handle(msg) {
    if (msg.type === 'ready') { this.setStatus('ready'); return; }
    if (msg.type === 'status') { this.setStatus('loading', msg.text); return; }
    if (msg.type === 'error' && !msg.id) {
      this.setStatus('idle', msg.error);
      for (const p of this.pending.values()) p.finish({ ok: false, error: msg.error });
      this.pending.clear();
      this.kill();
      return;
    }
    const p = this.pending.get(msg.id);
    if (!p) return;
    if (msg.type === 'stdout' || msg.type === 'stderr') p.output(msg.type, msg.data);
    else if (msg.type === 'tables') p.tables = msg.data;
    else if (msg.type === 'done') p.finish({ ok: msg.ok, error: msg.error, durationMs: msg.durationMs });
  }

  kill() {
    try { this.worker?.terminate(); } catch { /* noop */ }
    this.worker = null;
    this.setStatus('idle');
  }

  warmup() { this.spawn(); }

  run(payload, { onOutput, timeoutMs, signal }) {
    // Serialize runs per worker.
    const job = this.queue.then(() => new Promise((resolve) => {
      const id = uid('run');
      let stdout = '';
      let stderr = '';
      let truncated = false;
      let settled = false;
      let timer = null;
      const finish = (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        this.pending.delete(id);
        if (this.status === 'busy') this.setStatus('ready');
        resolve({ stdout, stderr, truncated, tables: entry.tables, ...res });
      };
      const entry = {
        tables: null,
        output: (stream, data) => {
          if (stream === 'stdout') {
            if (stdout.length < MAX_OUTPUT) stdout += data; else truncated = true;
          } else if (stderr.length < MAX_OUTPUT) stderr += data;
          onOutput?.(data, stream);
        },
        finish,
      };
      this.pending.set(id, entry);
      const w = this.spawn();
      if (this.status === 'ready') this.setStatus('busy');
      const startTimer = () => {
        timer = setTimeout(() => {
          this.kill(); // stop infinite loops
          finish({ ok: false, timedOut: true, error: `Hết thời gian chạy (${Math.round(timeoutMs / 1000)} giây). Có thể chương trình bị lặp vô hạn hoặc đang chờ thêm dữ liệu vào.` });
        }, timeoutMs);
      };
      if (this.kind === 'python' && this.status === 'loading') {
        // Do not count Pyodide download time against the program's time limit.
        const off = this.onStatus((s) => { if (s === 'ready' || s === 'busy') { off(); startTimer(); } });
      } else {
        startTimer();
      }
      signal?.addEventListener('abort', () => { this.kill(); finish({ ok: false, aborted: true, error: 'Đã dừng chương trình.' }); }, { once: true });
      w.postMessage({ type: 'run', id, ...payload });
    }));
    this.queue = job.catch(() => {});
    return job;
  }
}

const hosts = {};
function host(lang) {
  const kind = lang === 'pyvn' ? 'python' : lang;
  if (!WORKER_FILES[kind]) throw new Error(`Ngôn ngữ chưa được hỗ trợ: ${lang}`);
  const key = kind === 'cpp' ? 'c' : kind; // C and C++ share one JSCPP worker
  if (!hosts[key]) hosts[key] = new WorkerHost(kind);
  return hosts[key];
}

/** Preload a runtime (e.g. when a Python lesson opens). */
export function warmup(lang) {
  try { if (lang !== 'html') host(lang).warmup(); } catch { /* unsupported */ }
}

/** Subscribe to runtime status: fn(status, text). Returns unsubscribe. */
export function onRuntimeStatus(lang, fn) {
  if (lang === 'html') { fn('ready'); return () => {}; }
  const h = host(lang);
  fn(h.status);
  return h.onStatus(fn);
}

/**
 * Run code. Returns { ok, stdout, stderr, error, timedOut, aborted, durationMs, tables }.
 * onOutput(chunk, stream) streams output as it arrives.
 */
export async function runCode({ lang, code, stdin = '', grading = false, onOutput, timeoutMs, signal, files = null, mainName }) {
  if (lang === 'html') throw new Error('Dùng renderPreview() cho HTML');
  let src = String(code ?? '');
  if (lang === 'pyvn') {
    try { src = await translatePyvn(src); } catch (err) { return { ok: false, stdout: '', stderr: '', error: `Không tải được bộ dịch Python Tiếng Việt: ${err.message}` }; }
  }
  const kind = lang === 'pyvn' ? 'python' : lang;
  const payload = { code: src, stdin, grading };
  // IDE projects (Python): sibling files are mirrored into the virtual FS so `import` works. Never used for grading.
  if (kind === 'python' && !grading && Array.isArray(files) && files.length) {
    const extra = [];
    for (const f of files) {
      let text = String(f.code ?? '');
      if (lang === 'pyvn' && /\.py$/.test(f.name)) { try { text = await translatePyvn(text); } catch { /* keep source */ } }
      extra.push({ name: String(f.name), code: text });
    }
    payload.files = extra;
  }
  if (kind === 'python' && mainName) payload.mainName = String(mainName);
  return host(lang).run(payload, { onOutput, timeoutMs: timeoutMs || DEFAULT_TIMEOUT[kind] || 10000, signal });
}

/** Grader output normalization (see docs/ARCHITECTURE.md §3.3). */
export function normalizeOutput(s) {
  return String(s ?? '').normalize('NFC').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '');
}

// ---------- HTML preview & checks ----------

const CONSOLE_BRIDGE = (nonce) => `<script>(function(){var N=${JSON.stringify(nonce)};function s(t,a){try{parent.postMessage({__vc:N,type:t,data:Array.prototype.map.call(a,function(x){try{return typeof x==='string'?x:JSON.stringify(x)}catch(e){return String(x)}}).join(' ')},'*')}catch(e){}}
['log','info','warn','error'].forEach(function(k){var o=console[k];console[k]=function(){s(k,arguments);o&&o.apply(console,arguments)}});
window.addEventListener('error',function(e){s('error',[e.message+(e.lineno?' (dòng '+e.lineno+')':'')])});})();<\/script>`;

/** Build the srcdoc for a web project. parts = { html, css, js } or a full HTML string. */
export function buildWebDocument(parts, nonce = '') {
  const isFull = typeof parts === 'string';
  const html = isFull ? parts : (parts.html || '');
  const css = isFull ? '' : (parts.css || '');
  const js = isFull ? '' : (parts.js || '');
  const bridge = nonce ? CONSOLE_BRIDGE(nonce) : '';
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">${bridge}${css ? `<style>${css}</style>` : ''}`;
  let doc;
  if (/<html[\s>]/i.test(html)) {
    doc = /<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => `${m}${head}`) : html.replace(/<html[^>]*>/i, (m) => `${m}<head>${head}</head>`);
  } else {
    doc = `<!doctype html><html lang="vi"><head>${head}</head><body>${html}</body></html>`;
  }
  if (js) {
    const script = `<script>${js.replace(/<\/script/gi, '<\\/script')}<\/script>`;
    doc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => `${script}</body>`) : doc + script;
  }
  return doc;
}

/**
 * Render a live preview into an <iframe> with sandbox="allow-scripts" (no same-origin → cannot read app data).
 * onConsole({ type, data }) receives console output from the page.
 */
export function renderPreview(iframe, parts, { onConsole } = {}) {
  const nonce = uid('pv');
  iframe.setAttribute('sandbox', 'allow-scripts allow-modals allow-forms');
  iframe.setAttribute('referrerpolicy', 'no-referrer');
  const handler = (e) => {
    if (e.source !== iframe.contentWindow || !e.data || e.data.__vc !== nonce) return;
    onConsole?.({ type: e.data.type, data: e.data.data });
  };
  window.addEventListener('message', handler);
  iframe.srcdoc = buildWebDocument(parts, nonce);
  return () => window.removeEventListener('message', handler);
}

/** Evaluate HTML/CSS checks inside a hidden sandboxed iframe. Resolves to [{ ok, message }]. */
export function evaluateHtmlChecks(parts, checks, { timeoutMs = 6000 } = {}) {
  return new Promise((resolve) => {
    const nonce = uid('chk');
    const iframe = document.createElement('iframe');
    iframe.setAttribute('sandbox', 'allow-scripts');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText = 'position:fixed;left:-10000px;top:0;width:1024px;height:768px;border:0;visibility:hidden';
    const runner = `<script>(function(){var runChecks=${runChecks.toString()};
      function go(){var r;try{r=runChecks(document, ${JSON.stringify(checks || [])}).map(function(x){return {ok:x.ok,message:x.message}})}catch(e){r=[{ok:false,message:'Lỗi kiểm tra: '+e.message}]}
      parent.postMessage({__vc:${JSON.stringify(nonce)},results:r},'*')}
      if(document.readyState==='complete'){setTimeout(go,30)}else{window.addEventListener('load',function(){setTimeout(go,30)})}})();<\/script>`;
    let done = false;
    const finish = (results) => {
      if (done) return;
      done = true;
      window.removeEventListener('message', onMsg);
      clearTimeout(timer);
      iframe.remove();
      resolve(results);
    };
    const onMsg = (e) => {
      if (e.source === iframe.contentWindow && e.data && e.data.__vc === nonce) finish(e.data.results || []);
    };
    window.addEventListener('message', onMsg);
    const timer = setTimeout(() => finish((checks || []).map((c) => ({ ok: false, message: c.message || 'Hết thời gian kiểm tra' }))), timeoutMs);
    const doc = buildWebDocument(parts);
    iframe.srcdoc = /<\/body>/i.test(doc) ? doc.replace(/<\/body>(?![\s\S]*<\/body>)/i, () => `${runner}</body>`) : doc + runner;
    document.body.appendChild(iframe);
  });
}

/**
 * Grade a submission.
 * - stdout languages: runs every test (hidden ones included) → results with input/expected/actual (hidden details masked)
 * - html: evaluates checks
 * Returns { passed, total, score10, results: [{ ok, label, input, expected, actual, error, hidden }] }
 */
export async function gradeCode({ lang, code, tests = [], checks = [], onProgress, signal }) {
  if (lang === 'html' || lang === 'web') {
    const results = await evaluateHtmlChecks(code, checks);
    const passed = results.filter((r) => r.ok).length;
    return { passed, total: results.length, score10: results.length ? Math.round((passed / results.length) * 100) / 10 : 0, results: results.map((r, i) => ({ ...r, label: `Tiêu chí ${i + 1}` })) };
  }
  const results = [];
  for (let i = 0; i < tests.length; i++) {
    if (signal?.aborted) break;
    const t = tests[i];
    onProgress?.(i, tests.length);
    const res = await runCode({ lang, code, stdin: t.input ?? '', grading: true, signal });
    const actual = res.stdout;
    const ok = res.ok && normalizeOutput(actual) === normalizeOutput(t.expected);
    results.push({
      ok,
      label: `Test ${i + 1}${t.hidden ? ' (ẩn)' : ''}`,
      hidden: Boolean(t.hidden),
      input: t.hidden ? null : t.input,
      expected: t.hidden ? null : t.expected,
      actual: t.hidden ? null : actual,
      error: res.ok ? null : (t.hidden ? 'Chương trình gặp lỗi ở test ẩn.' : res.error),
      timedOut: res.timedOut,
    });
    if (res.timedOut) {
      // Remaining tests would likely time out too — mark them failed quickly.
      for (let j = i + 1; j < tests.length; j++) results.push({ ok: false, label: `Test ${j + 1}`, hidden: Boolean(tests[j].hidden), error: 'Bỏ qua do test trước bị quá thời gian.' });
      break;
    }
  }
  const passed = results.filter((r) => r.ok).length;
  return { passed, total: tests.length, score10: tests.length ? Math.round((passed / tests.length) * 100) / 10 : 0, results };
}
