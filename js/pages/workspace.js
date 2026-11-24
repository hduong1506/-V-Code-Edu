// V-Code Edu — multi-language developer workspace (works offline after first load).
// Modes: "Mã nguồn" (editor + run panel) | "Lưu đồ" | "Scratch Live" (editor + studio side by side).
import { h, mount, debounce } from '../core/dom.js';
import { icon } from '../components/icons.js';
import { createEditor, errorLine } from '../components/editor.js';
import { createTerminal, attachDiagnostics, inputNotice, RUNTIME_LABELS } from '../components/ide.js';
import { createAIDrawer } from '../components/practice.js';
import { runCode, renderPreview, onRuntimeStatus, warmup, LANGUAGES } from '../runtime/runner.js';
import { kv } from '../core/idb.js';
import { appState } from '../core/store.js';
import { toast, openModal, copyText, downloadFile, confirmDialog, promptDialog } from '../core/ui.js';
import { QRCODE_URL } from '../config.js';
import { createProblemsPanel, aiPromptForError } from '../components/ide/problems.js';
import { explainError, readsInput } from '../components/ide/explain-errors.js';
import { xicon, openEditorSettings, openShortcutsModal, openPopover, createEditorThemeButton } from '../components/ide/controls.js';
import { getEditorSettings, onEditorSettings, indentFor } from '../components/ide/settings.js';
import { getEditorTheme, onEditorTheme, resolvedEditorTheme } from '../components/ide/editor-theme.js';
import {
  MAIN_FILE, fileLang, isRunnable, validateName, suggestName, copyName, filesFromWebParts, webParts, normalizeProject, loadProject, saveProject,
} from '../components/ide/files.js';

const EXAMPLES = {
  python: [
    { label: 'Xin chào', code: 'ten = input("Tên của em là gì? ")\nprint(f"Xin chào {ten}, chào mừng đến với V-Code Edu!")\n', stdin: 'An' },
    { label: 'Số nguyên tố', code: 'def la_nguyen_to(n):\n    if n < 2:\n        return False\n    i = 2\n    while i * i <= n:\n        if n % i == 0:\n            return False\n        i += 1\n    return True\n\nn = int(input())\nprint([x for x in range(2, n + 1) if la_nguyen_to(x)])\n', stdin: '50' },
    { label: 'Sắp xếp nổi bọt', code: 'a = list(map(int, input().split()))\nfor i in range(len(a)):\n    for j in range(len(a) - 1 - i):\n        if a[j] > a[j + 1]:\n            a[j], a[j + 1] = a[j + 1], a[j]\nprint(*a)\n', stdin: '5 2 9 1 7' },
    { label: 'Fibonacci (đệ quy có nhớ)', code: 'from functools import lru_cache\n\n@lru_cache(None)\ndef fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n\nfor i in range(15):\n    print(fib(i), end=" ")\n', stdin: '' },
  ],
  pyvn: [
    { label: 'Chẵn hay lẻ', code: 'n = nhap_so()\nneu n % 2 == 0:\n    in_ra("Số chẵn")\nnguoc_lai:\n    in_ra("Số lẻ")\n', stdin: '7' },
    { label: 'Bảng cửu chương', code: 'n = nhap_so()\nlap_voi i trong_khoang(1, 11):\n    in_ra(n, "x", i, "=", n * i)\n', stdin: '7' },
  ],
  javascript: [
    { label: 'Xin chào', code: 'const name = input();\nconsole.log(`Xin chào ${name}!`);\n', stdin: 'V-Code' },
    { label: 'Mảng & map', code: 'const nums = input().split(" ").map(Number);\nconsole.log("Bình phương:", nums.map((x) => x * x));\nconsole.log("Tổng:", nums.reduce((a, b) => a + b, 0));\n', stdin: '1 2 3 4 5' },
  ],
  c: [
    { label: 'Tổng hai số', code: '#include <stdio.h>\n\nint main() {\n    int a, b;\n    scanf("%d %d", &a, &b);\n    printf("%d\\n", a + b);\n    return 0;\n}\n', stdin: '3 5' },
    { label: 'Mảng & vòng lặp', code: '#include <stdio.h>\n\nint main() {\n    int n, x, max;\n    int a[100];\n    scanf("%d", &n);\n    for (int i = 0; i < n; i++) {\n        scanf("%d", &x);   /* đọc vào biến tạm rồi gán vào mảng */\n        a[i] = x;\n    }\n    max = a[0];\n    for (int i = 1; i < n; i++)\n        if (a[i] > max) max = a[i];\n    printf("Lon nhat: %d\\n", max);\n    return 0;\n}\n', stdin: '5\n4 8 1 9 3' },
  ],
  cpp: [
    { label: 'cin / cout', code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int n;\n    cin >> n;\n    long long s = 0;\n    for (int i = 1; i <= n; i++) s += i;\n    cout << "Tong 1.." << n << " = " << s << endl;\n    return 0;\n}\n', stdin: '100' },
    { label: 'Tìm kiếm nhị phân', code: '#include <iostream>\nusing namespace std;\n\nint main() {\n    int a[] = {1, 3, 5, 7, 9, 11, 13};\n    int n = 7, x;\n    cin >> x;\n    int lo = 0, hi = n - 1, pos = -1;\n    while (lo <= hi) {\n        int mid = (lo + hi) / 2;\n        if (a[mid] == x) { pos = mid; break; }\n        if (a[mid] < x) lo = mid + 1; else hi = mid - 1;\n    }\n    cout << "Vi tri: " << pos << endl;\n    return 0;\n}\n', stdin: '9' },
  ],
  sql: [
    { label: 'Danh sách học sinh', code: '-- Cơ sở dữ liệu mẫu: lop, hoc_sinh, mon_hoc, diem\nSELECT id, ho_ten, ma_lop FROM hoc_sinh ORDER BY ho_ten;\n', stdin: '' },
    { label: 'Điểm trung bình', code: 'SELECT hs.ho_ten, ROUND(AVG(d.diem), 2) AS diem_tb\nFROM hoc_sinh hs JOIN diem d ON d.hoc_sinh_id = hs.id\nGROUP BY hs.id\nORDER BY diem_tb DESC\nLIMIT 5;\n', stdin: '' },
  ],
  html: [
    { label: 'Thẻ giới thiệu', files: { html: '<main class="card">\n  <h1>Xin chào, mình là An</h1>\n  <p>Mình đang học lập trình web tại V-Code Edu.</p>\n  <button id="btn">Bấm thử</button>\n</main>\n', css: 'body { font-family: system-ui, sans-serif; display: grid; place-items: center; min-height: 100vh; margin: 0; background: #f6f5f1; }\n.card { background: white; padding: 32px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,.08); text-align: center; }\nbutton { padding: 10px 18px; border: 0; border-radius: 8px; background: #2f49d1; color: white; cursor: pointer; }\n', js: 'document.getElementById("btn").addEventListener("click", () => {\n  console.log("Đã bấm nút!");\n  alert("Chào bạn!");\n});\n' } },
  ],
};

const MODES = [
  { id: 'code', label: 'Mã nguồn', icon: () => icon('code') },
  { id: 'flowchart', label: 'Lưu đồ', icon: () => xicon('flow') },
  { id: 'scratch', label: 'Scratch Live', icon: () => xicon('blocks') },
];
const STUDIO = {
  flowchart: { path: '../components/flowchart/index.js', css: 'css/pages/flowchart.css', factory: 'createFlowchartStudio', title: 'Lưu đồ thuật toán', desc: 'Sơ đồ khối sinh từ mã Python, cập nhật khi em gõ.' },
  scratch: { path: '../components/scratch/index.js', css: 'css/pages/scratch.css', factory: 'createScratchStudio', title: 'Scratch Live', desc: 'Khối lệnh kiểu Scratch tương ứng với từng dòng mã.' },
};
const LAYOUT_KEY = 'vc-ws-layout';
const FILE_COLORS = { py: 'py', js: 'js', css: 'css', html: 'html', c: 'c', h: 'c', cpp: 'cpp', hpp: 'cpp', sql: 'sql', txt: 'txt', csv: 'txt', json: 'js' };

function readLayout() {
  const def = { mode: 'code', split: { code: 0.6, studio: 0.46 }, editorCollapsed: false, studioMax: false, stdinOpen: true, dockOpen: false };
  try { const v = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null'); return v && typeof v === 'object' ? { ...def, ...v, split: { ...def.split, ...(v.split || {}) } } : def; } catch { return def; }
}
function writeLayout(l) { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(l)); } catch { /* private mode */ } }

async function encodeShare(payload) {
  const json = JSON.stringify(payload);
  try {
    if ('CompressionStream' in window) {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      const buf = new Uint8Array(await new Response(stream).arrayBuffer());
      let bin = '';
      buf.forEach((b) => { bin += String.fromCharCode(b); });
      return `z${btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
    }
  } catch { /* fall through */ }
  return `b${btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}`;
}

async function decodeShare(s) {
  const kind = s[0];
  const b64 = s.slice(1).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  if (kind === 'z') {
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return JSON.parse(await new Response(stream).text());
  }
  return JSON.parse(decodeURIComponent(escape(bin)));
}

function ensureCss(href) {
  if (document.querySelector(`link[href$="${href}"]`)) return;
  document.head.appendChild(h('link', { rel: 'stylesheet', href }));
}

function fileIcon(name) {
  const ext = name.split('.').pop().toLowerCase();
  return h('span', { class: `ws-ficon ws-ficon--${FILE_COLORS[ext] || 'txt'}`, 'aria-hidden': 'true' }, ext === 'html' ? '<>' : ext === 'css' ? '#' : ext.slice(0, 3));
}

export default {
  title: 'IDE đa ngôn ngữ',
  async mount(container, ctx) {
    const { signal } = ctx;
    let lang = LANGUAGES[ctx.query.lang] ? ctx.query.lang : (await kv.get('workspace:lang', 'python'));
    if (!LANGUAGES[lang]) lang = 'python';
    const layout = readLayout();
    let mode = ['code', 'flowchart', 'scratch'].includes(ctx.query.view) ? ctx.query.view : (['code', 'flowchart', 'scratch'].includes(layout.mode) ? layout.mode : 'code');
    let project = { files: [{ name: MAIN_FILE[lang], code: '' }], active: MAIN_FILE[lang], stdin: '' };
    let runCtrl = null;
    let disposePreview = null;
    let lastError = '';
    let lastRun = null; // { ok, ms, label }
    let sideTab = 'output';
    let mobilePane = 'editor';
    let running = false;
    let ready = false; // nothing is saved until the stored project has been loaded

    // ---------- incoming code (share link / AI snippet)
    let incoming = null;
    if (ctx.query.code) {
      try { incoming = await decodeShare(ctx.query.code); } catch { toast('Liên kết chia sẻ không hợp lệ.', { type: 'error' }); }
    } else if (ctx.query.from === 'snippet') {
      const snip = await kv.get('workspace:incoming', null);
      if (snip && Date.now() - snip.at < 120000) { incoming = { lang: LANGUAGES[snip.lang] ? snip.lang : (snip.lang === 'css' ? 'html' : 'python'), code: snip.code }; await kv.del('workspace:incoming'); }
    }
    if (incoming?.lang && LANGUAGES[incoming.lang]) lang = incoming.lang;

    // ---------------------------------------------------------------- header
    const langSelect = h('select', { class: 'select select--sm ws-lang', 'aria-label': 'Ngôn ngữ lập trình' }, Object.values(LANGUAGES).map((l) => h('option', { value: l.id }, l.label)));
    langSelect.value = lang;
    const runtimeBadge = h('span', { class: 'badge badge--dot ws-runtime', title: '' });
    const modeBtns = {};
    const modeSeg = h('div', { class: 'ws-modes', role: 'tablist', 'aria-label': 'Chế độ làm việc' }, MODES.map((m) => {
      modeBtns[m.id] = h('button', { class: 'ws-mode', type: 'button', role: 'tab', dataset: { mode: m.id }, title: m.label, onClick: () => setMode(m.id) }, m.icon(), h('span', { class: 'ws-mode__label' }, m.label));
      return modeBtns[m.id];
    }));
    const tool = (child, title, onClick, extra = {}) => h('button', { class: 'ws-tool', type: 'button', title, 'aria-label': title, onClick, ...extra }, child);
    const btnMax = h('button', { class: 'ws-tool ws-max ws-only-studio', type: 'button', onClick: () => setStudioMax(!layout.studioMax) });
    const btnExamples = h('button', { class: 'ws-tool ws-tool--text', type: 'button', 'aria-haspopup': 'menu', title: 'Chương trình mẫu', onClick: (e) => openExamples(e.currentTarget) }, icon('book-open'), h('span', null, 'Ví dụ'), icon('chevron-down'));
    const btnFormat = tool(xicon('format'), 'Định dạng mã (Shift+Alt+F)', () => { if (!editor.format()) toast(editor.canFormat() ? 'Mã đã gọn gàng.' : 'Tệp này không có bộ định dạng.', { duration: 1300 }); });
    const btnFind = tool(icon('search'), 'Tìm / thay thế (Ctrl+F, Ctrl+H)', () => editor.openFind());
    const btnSettings = tool(icon('settings'), 'Cài đặt trình soạn thảo', (e) => openEditorSettings(e.currentTarget), { 'aria-haspopup': 'dialog' });
    const btnKeys = tool(xicon('keyboard'), 'Phím tắt (F1)', () => openShortcutsModal());
    const themeBtn = createEditorThemeButton({ signal, compact: true });
    themeBtn.className = 'ws-tool ide-theme-btn';
    const btnRun = h('button', { class: 'btn btn--primary btn--sm ws-run', type: 'button', title: 'Chạy (Ctrl + Enter)', onClick: () => run() }, icon('play'), h('span', null, 'Chạy'));
    const btnStop = h('button', { class: 'btn btn--danger-soft btn--sm ws-stop', type: 'button', hidden: true, title: 'Dừng chương trình', onClick: () => runCtrl?.abort() }, icon('stop'), h('span', null, 'Dừng'));
    const btnAI = h('button', { class: 'btn btn--ghost btn--sm ws-hide-sm', type: 'button', title: 'Hỏi trợ lý AI V-Mentor', onClick: () => ai.open(lastError ? 'Chương trình của em bị lỗi, hãy giúp em hiểu và sửa lỗi.' : null) }, icon('sparkles'), h('span', { class: 'ws-label' }, 'Hỏi V-Mentor'));
    const btnShare = h('button', { class: 'btn btn--ghost btn--sm', type: 'button', title: 'Chia sẻ bằng liên kết / mã QR', onClick: () => share() }, icon('share'), h('span', { class: 'ws-label' }, 'Chia sẻ'));
    const btnDownload = h('button', { class: 'btn btn--ghost btn--sm', type: 'button', 'aria-haspopup': 'menu', title: 'Tải về máy', onClick: (e) => openDownload(e.currentTarget) }, icon('download'), h('span', { class: 'ws-label' }, 'Tải về'));

    const bar = h('div', { class: 'workspace__bar', role: 'toolbar', 'aria-label': 'Thanh công cụ IDE' },
      h('div', { class: 'ws-bar__group ws-bar__left' }, h('span', { class: 'ws-logo', 'aria-hidden': 'true' }, icon('terminal')), langSelect, runtimeBadge),
      h('div', { class: 'ws-bar__group ws-bar__center' }, modeSeg, btnMax),
      h('div', { class: 'ws-bar__group ws-bar__right' },
        h('div', { class: 'ws-tools' }, btnExamples, h('span', { class: 'ws-sep' }), btnFormat, btnFind, themeBtn, btnSettings, btnKeys),
        h('span', { class: 'ws-sep' }),
        btnAI, btnShare, btnDownload, btnStop, btnRun));

    // ---------------------------------------------------------------- editor column
    const editor = createEditor({
      value: '', lang,
      onChange: () => onEdit(),
      onRun: () => run(),
      onSave: () => { saveNow(); toast('Đã lưu trên thiết bị này.', { duration: 1400 }); },
      onCursor: (c) => { stLn.textContent = `Dòng ${c.line}, Cột ${c.col}${c.selected ? ` (${c.selected} đã chọn)` : ''}`; },
    });
    const filesTabs = h('div', { class: 'ws-files__tabs', role: 'tablist', 'aria-label': 'Các tệp trong dự án' });
    const btnNewFile = h('button', { class: 'ws-files__btn', type: 'button', title: 'Tệp mới', 'aria-label': 'Tạo tệp mới', onClick: () => newFile() }, icon('plus'));
    const btnFileMenu = h('button', { class: 'ws-files__btn', type: 'button', title: 'Thao tác với tệp', 'aria-label': 'Thao tác với tệp', 'aria-haspopup': 'menu', onClick: (e) => openFileMenu(e.currentTarget) }, icon('more-h'));
    const btnCollapse = h('button', { class: 'ws-files__btn ws-only-studio', type: 'button', title: 'Thu gọn trình soạn thảo', 'aria-label': 'Thu gọn trình soạn thảo', onClick: () => setCollapsed(true) }, xicon('collapseLeft'));
    const filesBar = h('div', { class: 'ws-files workspace__files' }, filesTabs, btnNewFile, h('span', { class: 'grow' }), btnFileMenu, btnCollapse);
    const rail = h('button', { class: 'ws-rail', type: 'button', title: 'Mở lại trình soạn thảo', 'aria-label': 'Mở lại trình soạn thảo', onClick: () => setCollapsed(false) }, xicon('expandLeft'), h('span', { class: 'ws-rail__label' }, 'Mã nguồn'));
    const editorHost = h('div', { class: 'ws-editor-host' }, editor.el);
    const editorCol = h('section', { class: 'workspace__editor ws-col ws-col--editor', 'aria-label': 'Trình soạn thảo', dataset: { editorTheme: getEditorTheme() } }, filesBar, editorHost, rail);

    // ---------------------------------------------------------------- output panel
    const terminal = createTerminal({ toolbar: true, placeholder: 'Bấm "Chạy" (Ctrl + Enter) để xem kết quả của chương trình.' });
    const consoleTerm = createTerminal({ toolbar: true, title: 'Console', placeholder: 'console.log() và lỗi JavaScript của trang sẽ hiện ở đây.' });
    const preview = h('iframe', { class: 'wb-preview ws-preview', title: 'Xem trước trang web' });
    const problems = createProblemsPanel({
      getLang: () => fileLang(project.active, lang),
      onJump: (line, file) => jumpTo(line, file),
      onAskAI: (r) => { lastError = r.raw || r.message || r.title; ai.open(aiPromptForError(r)); },
    });
    const stdin = h('textarea', { class: 'textarea textarea--code ws-stdin__input', spellcheck: 'false', placeholder: 'Mỗi dòng cho một lần input() / cin / scanf…', 'aria-label': 'Dữ liệu vào (stdin)' });
    const stdinNeed = h('span', { class: 'ws-stdin__need', hidden: true }, 'Cần dữ liệu');
    const stdinCount = h('span', { class: 'ws-stdin__count' });
    const stdinToggle = h('button', { class: 'ws-stdin__toggle', type: 'button', 'aria-expanded': 'true', title: 'Thu gọn / mở rộng', onClick: () => setStdinOpen(!layout.stdinOpen) }, icon('chevron-down'));
    const stdinBox = h('div', { class: 'workspace__stdin ws-stdin' },
      h('div', { class: 'ws-stdin__head' },
        h('label', { class: 'ws-stdin__title', onClick: () => { if (!layout.stdinOpen) setStdinOpen(true); stdin.focus(); } }, xicon('input'), 'Dữ liệu vào'),
        stdinNeed, h('span', { class: 'grow' }), stdinCount,
        h('button', { class: 'ws-stdin__toggle', type: 'button', title: 'Xóa dữ liệu vào', 'aria-label': 'Xóa dữ liệu vào', onClick: () => { stdin.value = ''; onStdin(); stdin.focus(); } }, xicon('eraser')),
        stdinToggle),
      stdin);

    const tabDefs = () => (lang === 'html'
      ? [['preview', 'Xem trước', () => icon('eye')], ['console', 'Console', () => xicon('output')], ['problems', 'Lỗi & Gỡ lỗi', () => icon('bug')]]
      : [['output', 'Kết quả', () => xicon('output')], ['problems', 'Lỗi & Gỡ lỗi', () => icon('bug')]]);
    const sideTabs = h('div', { class: 'ws-ptabs', role: 'tablist', 'aria-label': 'Bảng kết quả' });
    const problemsCount = h('span', { class: 'ws-count', hidden: true });
    const dockToggle = h('button', { class: 'ws-ptabs__btn ws-only-studio', type: 'button', title: 'Thu gọn bảng kết quả', 'aria-label': 'Thu gọn hoặc mở bảng kết quả', onClick: () => setDock(!layout.dockOpen) }, icon('chevron-down'));
    const panes = {
      output: h('div', { class: 'ws-pane', role: 'tabpanel' }, terminal.el),
      problems: h('div', { class: 'ws-pane ws-pane--scroll', role: 'tabpanel' }, problems.el),
      preview: h('div', { class: 'ws-pane', role: 'tabpanel' }, preview),
      console: h('div', { class: 'ws-pane', role: 'tabpanel' }, consoleTerm.el),
    };
    const side = h('section', { class: 'workspace__side ws-side', 'aria-label': 'Kết quả chạy chương trình' },
      h('div', { class: 'ws-ptabs__bar' }, sideTabs, h('span', { class: 'grow' }), dockToggle),
      h('div', { class: 'ws-panes' }, Object.values(panes)),
      stdinBox);

    // ---------------------------------------------------------------- studio
    const studioBody = h('div', { class: 'ws-studio__body' });
    const studio = h('section', { class: 'ws-studio', 'aria-label': 'Trực quan hóa mã nguồn' }, studioBody);
    const studios = {}; // kind → { inst, el, state: 'loading'|'ready'|'error' }

    const splitter = h('div', { class: 'ws-splitter', role: 'separator', tabindex: '0', 'aria-orientation': 'vertical', 'aria-label': 'Kéo để đổi kích thước hai khung' });
    const rightCol = h('div', { class: 'ws-col ws-col--right' });
    const main = h('div', { class: 'workspace__main' }, editorCol, splitter, rightCol);

    // ---------------------------------------------------------------- status bar & mobile switcher
    const stLang = h('span', { class: 'ws-st__item ws-st__lang' });
    const stLn = h('span', { class: 'ws-st__item' }, 'Dòng 1, Cột 1');
    const stIndent = h('button', { class: 'ws-st__item ws-st__btn', type: 'button', title: 'Đổi độ rộng thụt lề', onClick: (e) => openEditorSettings(e.currentTarget) });
    const stProblems = h('button', { class: 'ws-st__item ws-st__btn ws-st__problems', type: 'button', title: 'Mở bảng Lỗi & Gỡ lỗi', onClick: () => { if (mode !== 'code') setDock(true); showSideTab('problems'); setMobilePane('output'); } });
    const stRuntime = h('span', { class: 'ws-st__item ws-st__runtime' });
    const stRun = h('span', { class: 'ws-st__item ws-st__run' });
    const stTheme = h('button', { class: 'ws-st__item ws-st__btn', type: 'button', title: 'Cài đặt trình soạn thảo', onClick: (e) => openEditorSettings(e.currentTarget) });
    const stNet = h('span', { class: 'ws-st__item ws-st__net' });
    const status = h('footer', { class: 'ws-status', 'aria-label': 'Thanh trạng thái' },
      stLang, stLn, stIndent, h('span', { class: 'ws-st__item ws-hide-xs' }, 'UTF-8'), stProblems, h('span', { class: 'grow' }), stRun, stRuntime, stTheme, stNet);
    const mobileBtns = {};
    const mobileBar = h('nav', { class: 'ws-mobilebar', 'aria-label': 'Chuyển khung' });
    function renderMobileBar() {
      const items = [['editor', 'Mã nguồn', () => icon('code')]];
      if (mode !== 'code') items.push(['studio', mode === 'flowchart' ? 'Lưu đồ' : 'Scratch', () => (mode === 'flowchart' ? xicon('flow') : xicon('blocks'))]);
      items.push(['output', lang === 'html' ? 'Xem trước' : 'Kết quả', () => xicon('output')], ['problems', 'Lỗi', () => icon('bug')]);
      mount(mobileBar, items.map(([id, label, ic]) => {
        mobileBtns[id] = h('button', { type: 'button', class: 'ws-mobilebar__btn', 'aria-pressed': String(mobilePane === id || (id === 'problems' && mobilePane === 'output' && sideTab === 'problems')), onClick: () => {
          if (id === 'problems') { showSideTab('problems'); setMobilePane('output'); return; }
          if (id === 'output' && sideTab === 'problems') showSideTab(lang === 'html' ? 'preview' : 'output');
          setMobilePane(id);
        } }, ic(), h('span', null, label), id === 'problems' ? h('span', { class: 'ws-count ws-count--mobile', hidden: true }) : null);
        return mobileBtns[id];
      }));
      updateCounts(problems.counts());
    }

    const root = h('div', { class: 'workspace', dataset: { mode, pane: mobilePane } }, bar, main, status, mobileBar);
    mount(container, root);

    const ai = createAIDrawer({ signal, getContext: () => ({ code: currentCodeForAI(), language: lang, error: lastError }) });

    // ---------------------------------------------------------------- helpers
    const activeFile = () => project.files.find((f) => f.name === project.active) || project.files[0];
    function syncActive() { const f = activeFile(); if (f) f.code = editor.getValue(); }
    function currentCodeForAI() {
      syncActive();
      if (project.files.length === 1) return activeFile().code;
      return project.files.map((f) => `# ===== ${f.name} =====\n${f.code}`).join('\n\n');
    }
    function studioGetCode() { syncActive(); const f = activeFile(); return { code: f.code, lang: fileLang(f.name, lang) === 'pyvn' ? 'pyvn' : (fileLang(f.name, lang) === 'python' ? 'python' : lang) }; }

    const save = debounce(() => saveNow(), 400);
    function saveNow() { if (!ready) return; save.cancel?.(); syncActive(); project.stdin = stdin.value; saveProject(lang, project); }

    const livePreview = debounce(() => renderWeb(), 450);
    const notifyStudio = debounce(() => {
      if (mode === 'code') return;
      const s = studios[mode];
      if (s?.state === 'ready') { const { code, lang: l } = studioGetCode(); try { s.inst.onCodeChange?.(code, l); } catch (err) { console.warn('[workspace] studio update failed', err); } }
    }, 300);

    const diag = attachDiagnostics({ editor, problems, getLang: () => fileLang(project.active, lang), signal });

    function onEdit() {
      editor.clearMarks();
      syncActive();
      if (lang === 'html') livePreview();
      diag.schedule();
      notifyStudio();
      updateStdinNeed();
      save();
    }
    function onStdin() { updateStdinNeed(); save(); }
    stdin.addEventListener('input', onStdin, { signal });

    function updateStdinNeed() {
      const lines = stdin.value ? stdin.value.replace(/\n$/, '').split('\n').length : 0;
      stdinCount.textContent = lines ? `${lines} dòng` : '';
      const f = activeFile();
      const need = lang !== 'html' && lang !== 'sql' && readsInput(f?.code || editor.getValue(), lang) && !stdin.value.trim();
      stdinNeed.hidden = !need;
      stdinBox.classList.toggle('is-needed', need);
    }

    function setStdinOpen(open) {
      layout.stdinOpen = open;
      writeLayout(layout);
      stdinBox.classList.toggle('is-collapsed', !open);
      stdinToggle.setAttribute('aria-expanded', String(open));
    }

    function renderWeb() {
      disposePreview?.();
      consoleTerm.clear();
      syncActive();
      disposePreview = renderPreview(preview, webParts(project), { onConsole: ({ type, data }) => {
        consoleTerm.write(`${data}\n`, type === 'error' || type === 'warn' ? 'stderr' : 'stdout');
        if (type === 'error') { consoleTerm.status('Có lỗi', 'err'); if (sideTab !== 'console') sideTabBtns.console?.classList.add('is-flagged'); }
      } });
    }

    // ---------------------------------------------------------------- side tabs
    const sideTabBtns = {};
    function renderSideTabs() {
      const defs = tabDefs();
      if (!defs.find(([id]) => id === sideTab)) sideTab = defs[0][0];
      mount(sideTabs, defs.map(([id, label, ic]) => {
        sideTabBtns[id] = h('button', { class: 'ws-ptab', type: 'button', role: 'tab', 'aria-selected': String(id === sideTab), onClick: () => { showSideTab(id); if (mode !== 'code' && !layout.dockOpen) setDock(true); } }, ic(), h('span', null, label), id === 'problems' ? problemsCount : null);
        return sideTabBtns[id];
      }));
      Object.entries(panes).forEach(([id, p]) => { p.hidden = id !== sideTab; });
      // Only one terminal lives in the DOM at a time (program output, or the web page console).
      if (lang === 'html') { terminal.el.remove(); if (!consoleTerm.el.isConnected) panes.console.appendChild(consoleTerm.el); } else { consoleTerm.el.remove(); if (!terminal.el.isConnected) panes.output.appendChild(terminal.el); }
      stdinBox.hidden = lang === 'html' || lang === 'sql';
    }
    function showSideTab(id) {
      sideTab = id;
      Object.entries(sideTabBtns).forEach(([k, b]) => { b.setAttribute('aria-selected', String(k === id)); if (k === id) b.classList.remove('is-flagged'); });
      Object.entries(panes).forEach(([k, p]) => { p.hidden = k !== id; });
      renderMobileBarState();
    }
    function updateCounts(c) {
      const n = c.errors + c.runtime;
      const shown = n || c.warnings;
      problemsCount.hidden = !shown;
      problemsCount.textContent = String(shown);
      problemsCount.classList.toggle('is-error', n > 0);
      const mc = mobileBar.querySelector('.ws-count--mobile');
      if (mc) { mc.hidden = !shown; mc.textContent = String(shown); mc.classList.toggle('is-error', n > 0); }
      mount(stProblems, icon('x-circle'), String(c.errors + c.runtime), icon('alert'), String(c.warnings));
      stProblems.classList.toggle('has-errors', n > 0);
      stProblems.setAttribute('aria-label', `${c.errors + c.runtime} lỗi, ${c.warnings} cảnh báo — mở bảng Lỗi & Gỡ lỗi`);
    }
    problems.onChange(updateCounts);

    // ---------------------------------------------------------------- files
    function renderFiles() {
      mount(filesTabs, project.files.map((f) => {
        const isActive = f.name === project.active;
        const tab = h('div', { class: `ws-ftab${isActive ? ' is-active' : ''}`, role: 'tab', 'aria-selected': String(isActive), tabindex: isActive ? '0' : '-1', title: `${f.name}${isRunnable(f.name, lang) || lang === 'html' ? '' : ' (tệp dữ liệu)'} — nhấp đúp để đổi tên`,
          onClick: () => openFile(f.name),
          onDblclick: () => renameFile(f.name),
          onKeydown: (e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openFile(f.name); }
            if (e.key === 'F2') { e.preventDefault(); renameFile(f.name); }
            if (e.key === 'Delete') { e.preventDefault(); deleteFile(f.name); }
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
              const i = project.files.indexOf(f) + (e.key === 'ArrowRight' ? 1 : -1);
              const nx = project.files[(i + project.files.length) % project.files.length];
              openFile(nx.name);
              filesTabs.querySelector('.ws-ftab.is-active')?.focus();
            }
          } },
        fileIcon(f.name), h('span', { class: 'ws-ftab__name' }, f.name),
        project.files.length > 1 ? h('button', { class: 'ws-ftab__close', type: 'button', tabindex: '-1', title: `Xóa ${f.name}`, 'aria-label': `Xóa tệp ${f.name}`, onClick: (e) => { e.stopPropagation(); deleteFile(f.name); } }, icon('x')) : null);
        return tab;
      }));
      filesTabs.querySelector('.ws-ftab.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    function openFile(name) {
      if (name === project.active) return;
      syncActive();
      project.active = name;
      const f = activeFile();
      editor.setLang(fileLang(f.name, lang));
      editor.setValue(f.code);
      renderFiles();
      updateStatus();
      diag.run();
      notifyStudio();
      updateStdinNeed();
      if (lang === 'html' && /\.html?$/i.test(name)) livePreview();
      save();
    }
    async function newFile() {
      syncActive();
      const name = await promptDialog({ title: 'Tạo tệp mới', label: `Tên tệp (${lang === 'html' ? '.html, .css, .js' : lang === 'python' ? 'ví dụ tien_ich.py hoặc du_lieu.txt' : 'có phần mở rộng'})`, value: suggestName(lang, project.files), confirmLabel: 'Tạo' });
      if (!name) return;
      const err = validateName(name, lang, project.files);
      if (err) { toast(err, { type: 'error' }); return; }
      const ext = name.split('.').pop();
      const starter = (lang === 'python' || lang === 'pyvn') && ext === 'py' ? `# ${name} — dùng trong main.py bằng: import ${name.slice(0, -3)}\n\ndef xin_chao(ten):\n    return f"Xin chào {ten}!"\n` : '';
      project.files.push({ name, code: starter });
      openFile(name);
      renderFiles();
      if (starter && (lang === 'python' || lang === 'pyvn')) toast(`Đã tạo ${name}. Trong main.py viết: import ${name.slice(0, -3)}`, { type: 'success', duration: 3500 });
    }
    async function renameFile(oldName = project.active) {
      const name = await promptDialog({ title: 'Đổi tên tệp', label: 'Tên mới', value: oldName, confirmLabel: 'Đổi tên' });
      if (!name || name === oldName) return;
      const err = validateName(name, lang, project.files, oldName);
      if (err) { toast(err, { type: 'error' }); return; }
      const f = project.files.find((x) => x.name === oldName);
      f.name = name;
      if (project.active === oldName) { project.active = name; editor.setLang(fileLang(name, lang)); diag.run(); }
      renderFiles();
      updateStatus();
      save();
    }
    function duplicateFile(name = project.active) {
      syncActive();
      if (project.files.length >= 20) { toast('Mỗi dự án tối đa 20 tệp.', { type: 'error' }); return; }
      const f = project.files.find((x) => x.name === name);
      const nn = copyName(f.name, project.files);
      project.files.splice(project.files.indexOf(f) + 1, 0, { name: nn, code: f.code });
      openFile(nn);
      renderFiles();
    }
    async function deleteFile(name = project.active) {
      if (project.files.length <= 1) { toast('Dự án cần ít nhất một tệp.', { type: 'warning' }); return; }
      if (!(await confirmDialog({ title: `Xóa ${name}?`, message: 'Tệp sẽ bị xóa khỏi dự án trên thiết bị này. Không thể hoàn tác.', confirmLabel: 'Xóa tệp', danger: true }))) return;
      syncActive();
      const idx = project.files.findIndex((x) => x.name === name);
      project.files.splice(idx, 1);
      if (project.active === name) {
        const next = project.files[Math.max(0, idx - 1)];
        project.active = next.name;
        editor.setLang(fileLang(next.name, lang));
        editor.setValue(next.code);
        diag.run();
      }
      renderFiles();
      updateStatus();
      saveNow();
    }
    function menuItem(ic, label, onClick, extra = null) {
      return h('button', { class: 'menu__item ws-menu__item', type: 'button', role: 'menuitem', onClick: () => { closeMenu?.(); onClick(); } }, ic, h('span', { class: 'grow' }, label), extra);
    }
    let closeMenu = null;
    function openFileMenu(anchor) {
      const content = h('div', { class: 'ws-menu', role: 'menu' },
        menuItem(xicon('fileAdd'), 'Tệp mới…', () => newFile()),
        menuItem(xicon('pencil'), `Đổi tên “${project.active}”…`, () => renameFile(), h('kbd', { class: 'kbd' }, 'F2')),
        menuItem(xicon('dup'), 'Nhân bản tệp', () => duplicateFile()),
        menuItem(icon('trash'), 'Xóa tệp', () => deleteFile(), null),
        h('div', { class: 'menu__sep' }),
        menuItem(xicon('eraser'), 'Xóa toàn bộ nội dung tệp', () => { editor.replaceValue(''); editor.focus(); }),
        h('div', { class: 'menu__sep' }),
        menuItem(icon('download'), 'Tải tệp này', () => downloadOne()),
        menuItem(xicon('files'), `Tải toàn bộ dự án (${project.files.length} tệp)`, () => downloadAll()));
      closeMenu = openPopover(anchor, content, { className: 'ide-pop--menu' });
    }
    function openExamples(anchor) {
      const list = EXAMPLES[lang] || [];
      const content = h('div', { class: 'ws-menu', role: 'menu' },
        h('div', { class: 'ws-menu__head' }, `Chương trình mẫu · ${LANGUAGES[lang].short}`),
        list.length ? list.map((ex) => menuItem(icon('file'), ex.label, () => loadExample(ex))) : h('p', { class: 'muted', style: 'padding:8px 10px;margin:0' }, 'Chưa có ví dụ.'),
        h('div', { class: 'menu__sep' }),
        h('p', { class: 'ws-menu__note' }, lang === 'html' ? 'Ví dụ sẽ thay ba tệp index.html, style.css, script.js.' : 'Ví dụ thay nội dung tệp đang mở (Ctrl+Z để hoàn tác).'));
      closeMenu = openPopover(anchor, content, { className: 'ide-pop--menu', align: 'start' });
    }
    function openDownload(anchor) {
      const content = h('div', { class: 'ws-menu', role: 'menu' },
        menuItem(icon('file'), `Tải tệp đang mở (${project.active})`, () => downloadOne()),
        project.files.length > 1 ? menuItem(xicon('files'), `Tải toàn bộ dự án (${project.files.length} tệp riêng)`, () => downloadAll()) : null,
        lang === 'html' ? menuItem(icon('globe'), 'Tải trang web gộp (một tệp index.html)', () => downloadBundled()) : null);
      closeMenu = openPopover(anchor, content, { className: 'ide-pop--menu' });
    }
    function loadExample(ex) {
      if (lang === 'html') {
        project.files = filesFromWebParts(ex.files);
        project.active = 'index.html';
        editor.setLang('html');
        editor.setValue(project.files[0].code);
        renderFiles();
        renderWeb();
      } else {
        editor.replaceValue(ex.code);
        stdin.value = ex.stdin || '';
        onStdin();
      }
      syncActive();
      diag.run();
      notifyStudio();
      updateStdinNeed();
      saveNow();
    }

    // ---------------------------------------------------------------- modes, layout, splitter
    function applyLayout() {
      root.dataset.mode = mode;
      root.classList.toggle('is-collapsed', mode !== 'code' && layout.editorCollapsed);
      root.classList.toggle('is-studio-max', mode !== 'code' && layout.studioMax);
      root.classList.toggle('is-dock-open', mode !== 'code' && layout.dockOpen);
      const frac = mode === 'code' ? layout.split.code : layout.split.studio;
      main.style.setProperty('--ws-left', `${Math.round(frac * 1000) / 10}%`);
      splitter.setAttribute('aria-valuenow', String(Math.round(frac * 100)));
      splitter.setAttribute('aria-valuemin', '20');
      splitter.setAttribute('aria-valuemax', '80');
      btnMax.title = layout.studioMax ? 'Thu nhỏ (hiện lại trình soạn thảo)' : 'Phóng to toàn bộ bề rộng';
      btnMax.setAttribute('aria-label', btnMax.title);
      mount(btnMax, icon(layout.studioMax ? 'minimize' : 'maximize'));
      dockToggle.setAttribute('aria-expanded', String(layout.dockOpen));
      Object.entries(modeBtns).forEach(([id, b]) => { b.setAttribute('aria-selected', String(id === mode)); b.classList.toggle('is-active', id === mode); });
    }
    function setMode(next, { persist = true } = {}) {
      if (!['code', 'flowchart', 'scratch'].includes(next)) next = 'code';
      const prevStudio = mode !== next ? studios[mode] : null;
      if (prevStudio?.state === 'ready') { try { prevStudio.inst.onHide?.(); } catch { /* optional hook */ } }
      mode = next;
      if (persist) { layout.mode = mode; writeLayout(layout); }
      if (mode === 'code') {
        if (side.parentElement !== rightCol) mount(rightCol, side);
        if (mobilePane === 'studio') mobilePane = 'editor';
      } else {
        if (side.parentElement !== editorCol) editorCol.appendChild(side);
        if (studio.parentElement !== rightCol) mount(rightCol, studio);
        showStudio(mode);
        if (window.matchMedia('(max-width: 900px)').matches && mobilePane === 'editor') mobilePane = 'studio';
      }
      applyLayout();
      renderMobileBar();
      setMobilePane(mobilePane);
    }
    function setCollapsed(c) { layout.editorCollapsed = c; if (!c) layout.studioMax = false; writeLayout(layout); applyLayout(); if (!c) editor.focus(); }
    function setStudioMax(m) { layout.studioMax = m; if (!m) layout.editorCollapsed = false; writeLayout(layout); applyLayout(); }
    function setDock(open) { layout.dockOpen = open; writeLayout(layout); applyLayout(); }
    function setMobilePane(p) {
      mobilePane = p;
      root.dataset.pane = p === 'problems' ? 'output' : p;
      renderMobileBarState();
      if (p === 'studio' && mode !== 'code') { const s = studios[mode]; if (s?.state === 'ready') { try { s.inst.onShow?.(); } catch { /* ignore */ } } }
    }
    function renderMobileBarState() {
      Object.entries(mobileBtns).forEach(([id, b]) => {
        const on = id === 'problems' ? (mobilePane === 'output' && sideTab === 'problems') : (id === 'output' ? mobilePane === 'output' && sideTab !== 'problems' : mobilePane === id);
        b.setAttribute('aria-pressed', String(on));
      });
    }

    // splitter drag + keyboard
    splitter.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      splitter.setPointerCapture(e.pointerId);
      root.classList.add('is-resizing');
      const rect = main.getBoundingClientRect();
      const key = mode === 'code' ? 'code' : 'studio';
      const move = (ev) => {
        const frac = Math.min(0.8, Math.max(0.2, (ev.clientX - rect.left) / rect.width));
        layout.split[key] = frac;
        main.style.setProperty('--ws-left', `${Math.round(frac * 1000) / 10}%`);
      };
      const up = () => {
        splitter.removeEventListener('pointermove', move);
        splitter.removeEventListener('pointerup', up);
        splitter.removeEventListener('pointercancel', up);
        root.classList.remove('is-resizing');
        writeLayout(layout);
        applyLayout();
        editor.refresh();
      };
      splitter.addEventListener('pointermove', move);
      splitter.addEventListener('pointerup', up);
      splitter.addEventListener('pointercancel', up);
    }, { signal });
    splitter.addEventListener('dblclick', () => { layout.split[mode === 'code' ? 'code' : 'studio'] = mode === 'code' ? 0.6 : 0.46; writeLayout(layout); applyLayout(); }, { signal });
    splitter.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const key = mode === 'code' ? 'code' : 'studio';
      layout.split[key] = Math.min(0.8, Math.max(0.2, layout.split[key] + (e.key === 'ArrowLeft' ? -0.03 : 0.03)));
      writeLayout(layout);
      applyLayout();
    }, { signal });

    async function showStudio(kind) {
      const cfg = STUDIO[kind];
      studio.setAttribute('aria-label', `${cfg.title} — ${cfg.desc}`);
      studio.dataset.kind = kind;
      let s = studios[kind];
      if (!s) {
        s = { state: 'loading', inst: null, el: h('div', { class: 'ws-studio__slot' }) };
        studios[kind] = s;
        mount(s.el, h('div', { class: 'ws-studio__state' }, h('div', { class: 'spinner' }), h('p', null, `Đang tải ${cfg.title}…`)));
        loadStudio(kind, s);
      }
      Object.values(studios).forEach((x) => { x.el.hidden = x !== s; });
      if (s.el.parentElement !== studioBody) studioBody.appendChild(s.el);
      if (s.state === 'ready') {
        try { s.inst.onShow?.(); const { code, lang: l } = studioGetCode(); s.inst.onCodeChange?.(code, l); } catch (err) { console.warn('[workspace] studio show failed', err); }
      }
    }
    async function loadStudio(kind, s) {
      const cfg = STUDIO[kind];
      ensureCss(cfg.css);
      try {
        const mod = await import(cfg.path);
        const factory = mod[cfg.factory] || mod.default?.[cfg.factory] || (typeof mod.default === 'function' ? mod.default : null);
        if (typeof factory !== 'function') throw new Error(`Thiếu hàm ${cfg.factory}`);
        if (signal.aborted) return;
        const inst = factory({
          signal,
          getCode: () => studioGetCode(),
          onSendToEditor: (code) => sendToEditor(code),
          onJumpToLine: (line) => { if (window.matchMedia('(max-width: 900px)').matches) setMobilePane('editor'); if (layout.editorCollapsed || layout.studioMax) { layout.editorCollapsed = false; layout.studioMax = false; applyLayout(); } editor.jumpToLine(line); },
        });
        if (!inst || !(inst.el instanceof Node)) throw new Error('Thành phần không trả về giao diện hợp lệ');
        s.inst = inst;
        s.state = 'ready';
        mount(s.el, inst.el);
        if (mode === kind) { inst.onShow?.(); const { code, lang: l } = studioGetCode(); inst.onCodeChange?.(code, l); }
      } catch (err) {
        console.warn(`[workspace] ${kind} studio unavailable:`, err?.message || err);
        s.state = 'error';
        const offline = !navigator.onLine;
        mount(s.el, h('div', { class: 'ws-studio__state is-error' },
          h('span', { class: 'ws-studio__state-icon' }, icon('alert')),
          h('h3', null, `Không tải được ${cfg.title}`),
          h('p', null, offline ? 'Bạn đang ngoại tuyến và thành phần này chưa được lưu sẵn. Hãy kết nối Internet rồi thử lại.' : 'Thành phần này đang được cập nhật hoặc tạm thời không khả dụng. Trình soạn thảo và chạy mã vẫn hoạt động bình thường.'),
          h('div', { class: 'cluster cluster--sm', style: 'justify-content:center' },
            h('button', { class: 'btn btn--soft btn--sm', type: 'button', onClick: () => { delete studios[kind]; s.el.remove(); showStudio(kind); } }, icon('refresh'), 'Thử lại'),
            h('button', { class: 'btn btn--ghost btn--sm', type: 'button', onClick: () => setMode('code') }, icon('code'), 'Về chế độ Mã nguồn'))));
      }
    }
    async function sendToEditor(code) {
      if (lang !== 'python' && lang !== 'pyvn') await switchLang('python');
      if (!/\.py$/.test(project.active)) {
        const py = project.files.find((f) => /\.py$/.test(f.name)) || project.files[0];
        openFile(py.name);
      }
      editor.replaceValue(String(code ?? ''));
      syncActive();
      diag.run();
      notifyStudio();
      saveNow();
      toast('Đã đưa mã vào trình soạn thảo (Ctrl+Z để hoàn tác).', { type: 'success', duration: 2200 });
    }
    function jumpTo(line, file) {
      if (file && file !== project.active && project.files.some((f) => f.name === file)) openFile(file);
      if (window.matchMedia('(max-width: 900px)').matches) setMobilePane('editor');
      if (mode !== 'code' && (layout.editorCollapsed || layout.studioMax)) { layout.editorCollapsed = false; layout.studioMax = false; applyLayout(); }
      editor.jumpToLine(line);
      editor.markLine(line, 'error');
    }

    // ---------------------------------------------------------------- status bar
    function updateStatus() {
      const fl = fileLang(project.active, lang);
      const label = { python: 'Python', pyvn: 'Python Tiếng Việt', javascript: 'JavaScript', c: 'C', cpp: 'C++', sql: 'SQL', html: 'HTML', css: 'CSS', json: 'JSON', plaintext: 'Văn bản' }[fl] || fl;
      mount(stLang, h('span', { class: `ws-st__dot ws-ficon--${FILE_COLORS[project.active.split('.').pop()] || 'txt'}` }), label);
      const s = getEditorSettings();
      stIndent.textContent = `Dấu cách: ${indentFor(fl, s).length}${s.wordWrap ? ' · Xuống dòng' : ''}`;
      const t = resolvedEditorTheme();
      stTheme.textContent = `Editor: ${getEditorTheme() === 'auto' ? `Tự động (${t === 'dark' ? 'tối' : 'sáng'})` : t === 'dark' ? 'Night' : 'Paper'}`;
    }
    function updateNet() {
      const on = appState.get().online;
      mount(stNet, icon(on ? 'wifi' : 'wifi-off'), on ? 'Trực tuyến' : 'Ngoại tuyến');
      stNet.classList.toggle('is-offline', !on);
    }
    function updateRunStatus() {
      if (!lastRun) { stRun.textContent = ''; return; }
      mount(stRun, icon(lastRun.ok ? 'check' : 'x'), lastRun.label);
      stRun.className = `ws-st__item ws-st__run ${lastRun.ok ? 'is-ok' : 'is-err'}`;
    }
    onEditorSettings(() => updateStatus(), { signal });
    onEditorTheme(() => updateStatus(), { signal });
    appState.subscribe((st, prev) => { if (st.online !== prev.online) updateNet(); }, { signal });

    // ---------------------------------------------------------------- language switch
    let offStatus = null;
    async function switchLang(next, { fromIncoming } = {}) {
      if (ready) saveNow();
      runCtrl?.abort();
      lang = next;
      kv.set('workspace:lang', lang).catch(() => {});
      langSelect.value = lang;
      offStatus?.();
      offStatus = onRuntimeStatus(lang, (s, text) => {
        const [label, cls] = RUNTIME_LABELS[s] || ['', ''];
        runtimeBadge.className = `badge badge--dot ws-runtime ${cls}`;
        runtimeBadge.textContent = s === 'loading' ? 'Đang tải…' : label;
        runtimeBadge.title = `${LANGUAGES[lang].engine} · Ngoại tuyến: ${LANGUAGES[lang].offline}${s === 'loading' && text ? ` — ${text}` : ''}`;
        mount(stRuntime, h('span', { class: `ws-st__led is-${s}` }), `${LANGUAGES[lang].short}: ${s === 'loading' ? 'Đang tải bộ chạy…' : label}`);
        stRuntime.title = `${LANGUAGES[lang].engine}${s === 'loading' && text ? ` — ${text}` : ''}`;
      });
      warmup(lang);
      let loaded = null;
      if (fromIncoming && incoming) {
        loaded = normalizeProject(lang, incoming.project ? { project: incoming.project, stdin: incoming.stdin } : (lang === 'html' ? { files: incoming.files, code: incoming.code } : { code: incoming.code ?? '', stdin: incoming.stdin }));
      }
      if (!loaded) loaded = await loadProject(lang);
      if (!loaded) {
        const ex = EXAMPLES[lang]?.[0];
        loaded = lang === 'html'
          ? { files: filesFromWebParts(ex.files), active: 'index.html', stdin: '' }
          : { files: [{ name: MAIN_FILE[lang], code: ex?.code ?? '' }], active: MAIN_FILE[lang], stdin: ex?.stdin ?? '' };
      }
      project = loaded;
      stdin.value = project.stdin || '';
      terminal.clear();
      consoleTerm.clear();
      problems.clearRuntime();
      lastError = '';
      lastRun = null;
      updateRunStatus();
      const f = activeFile();
      editor.setLang(fileLang(f.name, lang));
      editor.setValue(f.code);
      sideTab = lang === 'html' ? 'preview' : 'output';
      renderFiles();
      renderSideTabs();
      renderMobileBar();
      updateStatus();
      updateStdinNeed();
      diag.run();
      notifyStudio();
      if (lang === 'html') renderWeb();
      ready = true;
      if (fromIncoming) saveNow();
    }

    // ---------------------------------------------------------------- run
    async function run() {
      if (running && runCtrl) return;
      syncActive();
      if (lang === 'html') {
        showSideTab('preview');
        if (mode !== 'code') setDock(true);
        setMobilePane('output');
        renderWeb();
        lastRun = { ok: true, label: 'Đã cập nhật xem trước' };
        updateRunStatus();
        return;
      }
      let file = activeFile();
      if (!isRunnable(file.name, lang)) {
        file = project.files.find((x) => x.name === MAIN_FILE[lang]) || project.files.find((x) => isRunnable(x.name, lang));
        if (!file) { toast('Dự án chưa có tệp chạy được.', { type: 'error' }); return; }
        toast(`${project.active} là tệp dữ liệu — đang chạy ${file.name}.`, { duration: 2200 });
      }
      runCtrl?.abort();
      runCtrl = new AbortController();
      running = true;
      terminal.clear();
      editor.clearMarks();
      problems.clearRuntime();
      showSideTab('output');
      if (mode !== 'code') setDock(true);
      setMobilePane('output');
      btnRun.hidden = true;
      btnStop.hidden = false;
      terminal.status('Đang chạy…', 'live');
      terminal.meta(file.name);
      if (readsInput(file.code, lang) && !stdin.value.trim()) {
        terminal.writeNode(inputNotice(() => { setStdinOpen(true); stdin.focus(); }));
      }
      const t0 = performance.now();
      const res = await runCode({
        lang, code: file.code, stdin: stdin.value, signal: runCtrl.signal,
        onOutput: (c, s) => terminal.write(c, s),
        files: lang === 'python' || lang === 'pyvn' ? project.files : null,
        mainName: file.name,
      });
      running = false;
      btnRun.hidden = false;
      btnStop.hidden = true;
      const ms = Math.round(res.durationMs || performance.now() - t0);
      if (!res.ok) {
        lastError = res.error || res.stderr || '';
        if (res.error) terminal.write(`\n${res.error}\n`, 'stderr');
        const ex = explainError(res, { lang, code: file.code, stdin: stdin.value, mainName: file.name });
        if (ex && ex.file && ex.file !== file.name && !project.files.some((x) => x.name === ex.file)) ex.file = file.name;
        if (ex && ex.file && ex.file !== project.active) ex.isActiveFile = false;
        const line = ex?.line || errorLine(res.error);
        if (line && !res.aborted && (!ex?.file || ex.file === project.active)) editor.markLine(line, 'error');
        problems.setRuntime(ex);
        terminal.status(res.timedOut ? 'Quá thời gian' : res.aborted ? 'Đã dừng' : 'Có lỗi', 'err');
        terminal.meta(`${file.name} · ${ms} ms`);
        lastRun = { ok: false, label: res.timedOut ? 'Quá thời gian' : res.aborted ? 'Đã dừng' : `Lỗi${line ? ` ở dòng ${line}` : ''}` };
        if (!res.aborted) {
          terminal.writeNode(h('button', { class: 'term-link', type: 'button', onClick: () => showSideTab('problems') }, icon('bug'), `${ex?.title || 'Lỗi'} — xem giải thích và cách sửa`));
          showSideTab('problems');
          sideTabBtns.output?.classList.add('is-flagged');
        }
      } else {
        lastError = '';
        if (!res.stdout && !res.stderr) terminal.write('(Chương trình chạy xong nhưng không in ra gì. Dùng print() / cout / console.log để hiển thị kết quả.)\n', 'info');
        terminal.status(`Hoàn tất · ${ms} ms`, 'ok');
        terminal.meta(`${file.name} · ${ms} ms`);
        lastRun = { ok: true, label: `Chạy xong · ${ms} ms` };
      }
      updateRunStatus();
    }

    // ---------------------------------------------------------------- download & share
    function downloadOne() {
      syncActive();
      const f = activeFile();
      downloadFile(f.name, f.code, f.name.endsWith('.html') ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8');
    }
    async function downloadAll() {
      syncActive();
      for (const f of project.files) {
        downloadFile(f.name, f.code, f.name.endsWith('.html') ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8');
        await new Promise((r) => setTimeout(r, 350)); // browsers throttle bursts of downloads
      }
      toast(`Đã tải ${project.files.length} tệp. Nếu trình duyệt hỏi, hãy cho phép tải nhiều tệp.`, { duration: 3200 });
    }
    function downloadBundled() {
      syncActive();
      const p = webParts(project);
      downloadFile('index.html', `<!doctype html>\n<html lang="vi">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Dự án V-Code Edu</title>\n<style>\n${p.css}\n</style>\n</head>\n<body>\n${p.html}\n<script>\n${p.js}\n</script>\n</body>\n</html>\n`, 'text/html;charset=utf-8');
    }

    async function share() {
      syncActive();
      const f = activeFile();
      const payload = { lang, code: f.code, stdin: stdin.value };
      if (project.files.length > 1 || lang === 'html') payload.project = { files: project.files, active: project.active };
      if (lang === 'html') payload.files = { html: project.files.find((x) => x.name === 'index.html')?.code ?? '', css: project.files.find((x) => x.name === 'style.css')?.code ?? '', js: project.files.find((x) => x.name === 'script.js')?.code ?? '' };
      const encoded = await encodeShare(payload);
      const url = `${location.origin}${location.pathname}#/workspace?lang=${lang}&code=${encoded}`;
      const qrBox = h('div', { class: 'qr-box', style: 'display:grid;place-items:center;padding:12px;background:#fff;border-radius:12px;margin-top:12px;min-height:60px' });
      const input = h('input', { class: 'input', value: url, readonly: true, 'aria-label': 'Liên kết chia sẻ' });
      openModal({
        title: 'Chia sẻ mã nguồn',
        content: h('div', { class: 'stack' },
          h('p', { class: 'text-2' }, `Mã nguồn${project.files.length > 1 ? ` (${project.files.length} tệp)` : ''} được nén trực tiếp vào liên kết — không cần tải lên máy chủ. Người nhận mở liên kết là thấy ngay code của bạn.`),
          input,
          url.length > 2000 ? h('p', { class: 'field__hint' }, 'Liên kết khá dài vì mã nguồn lớn; một số ứng dụng nhắn tin có thể cắt bớt.') : null,
          qrBox),
        actions: [{ label: 'Đóng', variant: 'ghost' }, { label: 'Sao chép liên kết', variant: 'primary', icon: 'copy', onClick: async () => { toast((await copyText(url)) ? 'Đã sao chép liên kết.' : 'Không sao chép được.', { duration: 1800 }); return false; } }],
      });
      setTimeout(() => input.select(), 50);
      if (url.length < 2300) {
        try {
          if (!window.QRCode) await new Promise((res, rej) => { const sc = h('script', { src: QRCODE_URL, crossorigin: 'anonymous', onLoad: res, onError: rej }); document.head.appendChild(sc); });
          // eslint-disable-next-line no-new
          new window.QRCode(qrBox, { text: url, width: 200, height: 200, correctLevel: window.QRCode.CorrectLevel.L });
        } catch { mount(qrBox, h('span', { class: 'muted', style: 'color:#333' }, 'Không tạo được mã QR (cần Internet lần đầu).')); }
      } else {
        mount(qrBox, h('span', { style: 'color:#333;font-size:13px' }, 'Mã nguồn quá dài để tạo mã QR.'));
      }
    }

    // ---------------------------------------------------------------- wiring
    langSelect.addEventListener('change', () => switchLang(langSelect.value), { signal });
    root.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !e.target.closest('.code-editor')) { e.preventDefault(); run(); }
    }, { signal });
    window.addEventListener('beforeunload', () => saveNow(), { signal });

    setStdinOpen(layout.stdinOpen !== false);
    updateNet();
    await switchLang(lang, { fromIncoming: Boolean(incoming) });
    setMode(mode, { persist: !ctx.query.view });
    if (incoming) toast('Đã mở mã nguồn được chia sẻ.', { type: 'success', duration: 2500 });
    if (ctx.query.code) history.replaceState(null, '', `#/workspace?lang=${lang}`);
    return () => {
      saveNow();
      runCtrl?.abort();
      offStatus?.();
      disposePreview?.();
      notifyStudio.cancel();
      livePreview.cancel();
      Object.values(studios).forEach((s) => { try { s.inst?.destroy?.(); } catch { /* ignore */ } });
      editor.destroy();
    };
  },
};
