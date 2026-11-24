/* V-Code Edu — Python runtime (Pyodide / CPython compiled to WebAssembly) inside a classic Web Worker.
   Messages in:  { type: 'init', indexURL }
                 { type: 'run', id, code, stdin, grading }
   Messages out: { type: 'ready' } | { type: 'status', text }
                 { type: 'stdout'|'stderr', id, data }
                 { type: 'done', id, ok, error, durationMs } */

let pyodide = null;
let loading = null;
let currentId = null;
const decoder = new TextDecoder();

function post(msg) { self.postMessage(msg); }

async function init(indexURL) {
  if (pyodide) return pyodide;
  if (!loading) {
    loading = (async () => {
      post({ type: 'status', text: 'Đang tải Python (lần đầu có thể mất vài giây)…' });
      importScripts(`${indexURL}pyodide.js`);
      const py = await self.loadPyodide({ indexURL });
      pyodide = py;
      post({ type: 'ready' });
      return py;
    })().catch((err) => { loading = null; throw err; });
  }
  return loading;
}

function makeWriter(stream) {
  return {
    write(buf) {
      const text = decoder.decode(buf, { stream: true });
      if (text) post({ type: stream, id: currentId, data: text });
      return buf.length;
    },
  };
}

const PRELUDE = `
import sys, builtins
__vc_lines = __vc_stdin.split("\\n") if __vc_stdin != "" else []
if __vc_lines and __vc_lines[-1] == "" and __vc_stdin.endswith("\\n"):
    __vc_lines.pop()
__vc_pos = [0]
def __vc_input(prompt=""):
    if prompt and not __vc_grading:
        sys.stdout.write(str(prompt))
    if __vc_pos[0] >= len(__vc_lines):
        raise EOFError("Chương trình cần thêm dữ liệu vào (input) nhưng ô Dữ liệu vào đã hết dòng.")
    line = __vc_lines[__vc_pos[0]]
    __vc_pos[0] += 1
    if not __vc_grading:
        sys.stdout.write(line + "\\n")
    return line
builtins.input = __vc_input
`;

const PROJECT_DIR = '/home/pyodide/vc_project';

function cleanTraceback(msg, mainName = 'main.py') {
  // Keep only the user-relevant part of the traceback; map "<exec>" to the running file's name.
  const lines = String(msg).split('\n');
  const start = lines.findIndex((l) => l.includes('File "<exec>"') || l.includes(`File "${PROJECT_DIR}/`));
  const kept = start >= 0 ? ['Traceback (most recent call last):', ...lines.slice(start)] : lines;
  return kept.join('\n')
    .replace(/File "<exec>"/g, `File "${mainName}"`)
    .split(`File "${PROJECT_DIR}/`).join('File "')
    .trim();
}

/** Mirror the IDE project's sibling files into the virtual FS so `import utils` / open('data.txt') work.
    Always resets the folder, so grading runs (no files) never see leftovers from the IDE. */
function syncProjectFiles(py, files) {
  const FS = py.FS;
  try { FS.mkdirTree(PROJECT_DIR); } catch { /* exists */ }
  try {
    for (const n of FS.readdir(PROJECT_DIR)) {
      if (n === '.' || n === '..') continue;
      try { FS.unlink(`${PROJECT_DIR}/${n}`); } catch { /* directory or busy */ }
    }
  } catch { /* noop */ }
  const modules = [];
  for (const f of Array.isArray(files) ? files : []) {
    const name = String(f?.name || '');
    if (!/^[\w-][\w.-]{0,63}$/.test(name)) continue;
    try {
      FS.writeFile(`${PROJECT_DIR}/${name}`, String(f.code ?? ''));
      if (name.endsWith('.py')) modules.push(name.slice(0, -3));
    } catch { /* ignore single file */ }
  }
  return modules;
}

async function run({ id, code, stdin = '', grading = false, files = null, mainName = 'main.py' }) {
  currentId = id;
  const t0 = performance.now();
  try {
    const py = await init(self.__indexURL);
    try {
      py.setStdout(makeWriter('stdout'));
      py.setStderr(makeWriter('stderr'));
    } catch {
      py.setStdout({ batched: (s) => post({ type: 'stdout', id, data: `${s}\n` }) });
      py.setStderr({ batched: (s) => post({ type: 'stderr', id, data: `${s}\n` }) });
    }
    const globals = py.globals.get('dict')();
    globals.set('__name__', '__main__');
    globals.set('__vc_stdin', String(stdin).replace(/\r\n?/g, '\n'));
    globals.set('__vc_grading', Boolean(grading));
    await py.runPythonAsync(PRELUDE, { globals });
    const modules = syncProjectFiles(py, grading ? null : files);
    globals.set('__vc_project_dir', PROJECT_DIR);
    globals.set('__vc_modules', py.toPy(modules));
    globals.set('__vc_use_project', modules.length > 0 || (Array.isArray(files) && files.length > 0 && !grading));
    await py.runPythonAsync(`
import sys as __vc_sys, os as __vc_os, importlib as __vc_il
for __m in list(__vc_modules):
    __vc_sys.modules.pop(__m, None)
if __vc_project_dir in __vc_sys.path:
    __vc_sys.path.remove(__vc_project_dir)
if __vc_use_project:
    __vc_sys.path.insert(0, __vc_project_dir)
    __vc_os.chdir(__vc_project_dir)
elif __vc_os.getcwd() == __vc_project_dir:
    __vc_os.chdir("/home/pyodide")
__vc_il.invalidate_caches()
`, { globals });
    // Auto-load packages imported by the code (e.g. numpy) when online; ignore failures offline.
    try { await py.loadPackagesFromImports(code); } catch { /* offline or unknown package */ }
    await py.runPythonAsync(code, { globals });
    await py.runPythonAsync('import sys\nsys.stdout.flush()\nsys.stderr.flush()', { globals });
    globals.destroy?.();
    post({ type: 'done', id, ok: true, durationMs: performance.now() - t0 });
  } catch (err) {
    const message = err && err.type ? cleanTraceback(err.message, String(mainName || 'main.py').replace(/[^\w.-]/g, '') || 'main.py') : String(err?.message || err);
    post({ type: 'done', id, ok: false, error: message, durationMs: performance.now() - t0 });
  }
}

self.onmessage = async (e) => {
  const msg = e.data || {};
  if (msg.type === 'init') {
    self.__indexURL = msg.indexURL;
    try { await init(msg.indexURL); } catch (err) { post({ type: 'error', error: `Không tải được Python: ${err?.message || err}` }); }
  } else if (msg.type === 'run') {
    await run(msg);
  }
};
