/* V-Code Edu — JavaScript runtime in an isolated Web Worker (no DOM, no access to the app or its storage).
   Provides console.*, and input() / prompt() that read from the provided stdin lines. */

function fmt(v) {
  if (typeof v === 'string') return v;
  try {
    if (v instanceof Error) return `${v.name}: ${v.message}`;
    if (typeof v === 'object' && v !== null) return JSON.stringify(v, (k, val) => (typeof val === 'bigint' ? `${val}n` : val), 2);
    return String(v);
  } catch { return String(v); }
}

self.onmessage = async (e) => {
  const { id, code, stdin = '' } = e.data || {};
  const t0 = performance.now();
  const lines = String(stdin).replace(/\r\n?/g, '\n').split('\n');
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  let pos = 0;
  const out = (stream) => (...args) => self.postMessage({ type: stream, id, data: `${args.map(fmt).join(' ')}\n` });
  const sandboxConsole = { log: out('stdout'), info: out('stdout'), debug: out('stdout'), table: out('stdout'), warn: out('stderr'), error: out('stderr') };
  const input = () => {
    if (pos >= lines.length) throw new Error('Chương trình cần thêm dữ liệu vào (input) nhưng ô Dữ liệu vào đã hết dòng.');
    return lines[pos++];
  };
  try {
    const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
    const fn = new AsyncFunction('console', 'input', 'prompt', 'readline', `"use strict";\n${code}`);
    await fn(sandboxConsole, input, input, input);
    self.postMessage({ type: 'done', id, ok: true, durationMs: performance.now() - t0 });
  } catch (err) {
    let msg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
    // Map the position inside the generated async function back to the student's line:
    // "(async function anonymous(<params>\n) {\n"use strict";\n<code>" → user line = line - 3.
    const m = err && typeof err.stack === 'string' ? /<anonymous>:(\d+):(\d+)/.exec(err.stack) : null;
    if (m && Number(m[1]) > 3) msg += ` (dòng ${Number(m[1]) - 3}, cột ${m[2]})`;
    self.postMessage({ type: 'done', id, ok: false, error: msg, durationMs: performance.now() - t0 });
  }
};
