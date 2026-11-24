/* V-Code Edu — C / C++ runtime: JSCPP interpreter (vendored, works offline) inside a Web Worker.
   JSCPP supports a teaching subset of C++: iostream, cstdio, cmath, cstring, iomanip, arrays, pointers,
   structs, functions, recursion. STL containers (vector, map, string class…) are not available. */

let loaded = false;

function ensureLoaded() {
  if (!loaded) {
    // The JSCPP browser bundle exposes `window.JSCPP` only when `window` exists; otherwise it hijacks
    // the worker's onmessage with its own protocol. Alias window → self so it takes the browser branch.
    // It checks `window && window.document !== undefined`, so provide a temporary stub during import.
    if (typeof self.window === 'undefined') self.window = self;
    const hadDocument = 'document' in self;
    if (!hadDocument) self.document = {};
    const handler = self.onmessage;
    try {
      importScripts(new URL('../../vendor/jscpp/JSCPP.es5.min.js', self.location.href).href);
    } finally {
      if (!hadDocument) delete self.document;
      if (self.onmessage !== handler) self.onmessage = handler;
    }
    if (!self.JSCPP) throw new Error('Không khởi tạo được trình chạy C/C++.');
    loaded = true;
  }
}

function friendlyError(err) {
  const msg = String(err?.message || err);
  if (/is not defined|not found|unknown/i.test(msg) && /vector|map|string|set|queue|stack|sort/i.test(msg)) {
    return `${msg}\n\nGợi ý: trình chạy C++ trên trình duyệt chưa hỗ trợ thư viện STL (vector, map, string…). Hãy dùng mảng và tự cài đặt thuật toán.`;
  }
  return msg;
}

self.onmessage = (e) => {
  const { id, code, stdin = '' } = e.data || {};
  const t0 = performance.now();
  try {
    ensureLoaded();
    let buffer = '';
    let lastFlush = performance.now();
    const flush = () => { if (buffer) { self.postMessage({ type: 'stdout', id, data: buffer }); buffer = ''; } };
    const exitCode = self.JSCPP.run(String(code), String(stdin).replace(/\r\n?/g, '\n'), {
      stdio: {
        write: (s) => {
          buffer += s;
          if (buffer.length > 4096 || performance.now() - lastFlush > 50) { flush(); lastFlush = performance.now(); }
        },
      },
      maxTimeout: 15000,
      unsigned_overflow: 'warn',
    });
    flush();
    self.postMessage({ type: 'done', id, ok: exitCode === 0, error: exitCode === 0 ? null : `Chương trình kết thúc với mã ${exitCode}`, durationMs: performance.now() - t0 });
  } catch (err) {
    self.postMessage({ type: 'done', id, ok: false, error: friendlyError(err), durationMs: performance.now() - t0 });
  }
};
