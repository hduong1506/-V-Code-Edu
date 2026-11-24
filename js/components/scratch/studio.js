// V-Code Edu — Xưởng khối: toolbar, block editor, stage panel, sprite list and project actions.
import { h, raw, debounce } from '../../core/dom.js';
import { icon } from '../icons.js';
import { toast, openModal, confirmDialog, downloadFile, copyText } from '../../core/ui.js';
import { highlight } from '../highlight.js';
import { createWorkspace, openPopover, closePopover } from './workspace.js';
import { createStage } from './stage.js';
import { createRuntime, KEY_FROM_EVENT } from './runtime.js';
import { glyph } from './render.js';
import { SPRITE_KINDS, SPRITE_KIND_ORDER, BACKDROPS, BACKDROP_ORDER, spriteThumb } from './sprites.js';
import {
  EXAMPLES, newProject, makeSprite, normalizeProject, serializeProject, loadAutosave, saveAutosave,
  listSaved, saveToLibrary, loadFromLibrary, deleteFromLibrary,
} from './projects.js';
import { projectToPython } from './codegen.js';
import { pythonToBlocks } from './frompy.js';

const isEditable = (t) => t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

export function createStudio({ signal, getCode, onSendToEditor }) {
  let project = loadAutosave() || newProject();
  let active = false;
  let pristine = true;

  const sprite = () => project.sprites.find((s) => s.id === project.current) || project.sprites[0];

  /* ---------- stage + runtime ---------- */
  const coords = h('span', { class: 'sc-coords', 'aria-live': 'off' }, 'x: 0  y: 0');
  const stage = createStage({
    signal,
    onSpriteClick: (sp) => {
      if (project.current !== sp.id) selectSprite(sp.id);
      runtime.spriteClicked(sp);
    },
    onStageClick: () => runtime.userGesture(),
    onMouse: (m) => { coords.textContent = `x: ${m.x}  y: ${m.y}`; },
    onSpriteMoved: (sp, done) => { runtime.requestRender(); if (sp.id === project.current) syncInfo(); if (done) { if (sp.id === project.current) ws.renderPalette(); autosave(); } },
  });
  const runtime = createRuntime({
    getProject: () => project,
    stage,
    onThreads: (set) => { ws.setRunning(set); flagBtn.classList.toggle('is-on', set.size > 0); },
    onError: (err) => toast(`Kịch bản gặp lỗi và đã dừng: ${err?.message || err}`, { type: 'error' }),
    onDirty: () => ws.renderPalette(),
  });

  /* ---------- editor ---------- */
  const autosave = debounce(() => { saveAutosave(project); }, 500);
  const ws = createWorkspace({
    signal,
    getProject: () => project,
    getSprite: sprite,
    runtime,
    onChange: () => { pristine = false; autosave(); },
    onVarsChanged: () => { runtime.requestRender(); autosave(); },
    onMessagesChanged: () => { ws.renderPalette(); autosave(); },
  });

  /* ---------- toolbar ---------- */
  const nameInput = h('input', { class: 'sc-st__name', value: project.name, maxlength: '60', 'aria-label': 'Tên dự án', spellcheck: 'false' });
  nameInput.addEventListener('input', () => { project.name = nameInput.value.trim() || 'Dự án'; autosave(); });
  const fileInput = h('input', { type: 'file', accept: '.json,application/json', hidden: true });
  fileInput.addEventListener('change', async () => {
    const f = fileInput.files?.[0];
    fileInput.value = '';
    if (!f) return;
    try {
      if (f.size > 4e6) throw new Error('Tệp quá lớn.');
      loadProject(normalizeProject(JSON.parse(await f.text())));
      toast(`Đã mở “${project.name}”.`, { type: 'success' });
    } catch (err) {
      toast(`Không đọc được tệp: ${err.message}`, { type: 'error' });
    }
  }, { signal });

  const exBtn = h('button', { class: 'sc-btn', type: 'button', 'aria-haspopup': 'menu' }, icon('sparkles'), h('span', { class: 'sc-hide-narrow' }, 'Ví dụ'), icon('chevron-down'));
  exBtn.addEventListener('click', () => openPopover(exBtn, [
    { head: 'Dự án mẫu (chạy được ngay)' },
    ...EXAMPLES.map((ex) => ({ label: ex.name, onSelect: () => openExample(ex) })),
  ], { minWidth: 240 }), { signal });

  const projBtn = h('button', { class: 'sc-btn', type: 'button', 'aria-haspopup': 'menu' }, icon('folder'), h('span', { class: 'sc-hide-narrow' }, 'Dự án'), icon('chevron-down'));
  projBtn.addEventListener('click', () => openPopover(projBtn, [
    { label: 'Lưu vào trình duyệt', onSelect: saveLocal },
    { label: 'Mở dự án đã lưu…', onSelect: openSavedDialog },
    { sep: true },
    { label: 'Xuất tệp JSON', onSelect: () => downloadFile(`${fileSafe(project.name)}.json`, serializeProject(project), 'application/json') },
    { label: 'Nhập tệp JSON…', onSelect: () => fileInput.click() },
    { sep: true },
    { label: 'Dự án mới', onSelect: async () => { if (await confirmReplace()) loadProject(newProject()); } },
  ], { minWidth: 220 }), { signal });

  const fromCodeBtn = h('button', { class: 'sc-btn', type: 'button', title: 'Tạo khối từ mã Python trong trình soạn thảo', onClick: () => buildFromCode() }, icon('wand'), h('span', { class: 'sc-hide-narrow' }, 'Tạo khối từ mã'));
  const pyBtn = h('button', { class: 'sc-btn sc-btn--soft', type: 'button', title: 'Xem mã Python tương đương', onClick: () => showPython() }, icon('python'), h('span', { class: 'sc-hide-narrow' }, 'Xem mã Python'));
  const stageToggle = h('button', { class: 'sc-iconbtn sc-st__stagetoggle', type: 'button', title: 'Ẩn/hiện sân khấu', 'aria-label': 'Ẩn hoặc hiện sân khấu', onClick: () => { root.classList.toggle('is-stage-collapsed'); requestAnimationFrame(fitStage); } }, icon('monitor'));
  const bar = h('div', { class: 'sc-st__bar' }, nameInput, exBtn, projBtn, h('span', { class: 'grow' }), fromCodeBtn, pyBtn, stageToggle, fileInput);

  /* ---------- stage panel ---------- */
  const flagBtn = h('button', { class: 'sc-runbtn sc-runbtn--go', type: 'button', title: 'Bấm cờ xanh để chạy', 'aria-label': 'Chạy (cờ xanh)' }, glyph('flag'));
  const stopBtn = h('button', { class: 'sc-runbtn sc-runbtn--stop', type: 'button', title: 'Dừng tất cả', 'aria-label': 'Dừng tất cả' }, glyph('stop'));
  const fullBtn = h('button', { class: 'sc-iconbtn', type: 'button', title: 'Phóng to sân khấu', 'aria-label': 'Phóng to sân khấu' }, icon('maximize'));
  flagBtn.addEventListener('click', () => { runtime.greenFlag(); stage.el.focus({ preventScroll: true }); }, { signal });
  stopBtn.addEventListener('click', () => runtime.stopAll(), { signal });
  fullBtn.addEventListener('click', () => toggleFull(), { signal });
  const stageBar = h('div', { class: 'sc-st__stagebar' }, flagBtn, stopBtn, h('span', { class: 'grow' }), coords, fullBtn);
  const stageBox = h('div', { class: 'sc-st__stagebox' }, stage.el);
  const stageWrap = h('div', { class: 'sc-st__stagewrap' }, stageBar, stageBox);

  // sprite info
  const fName = h('input', { class: 'sc-field-in', maxlength: '40', 'aria-label': 'Tên nhân vật' });
  const numField = (label, key) => {
    const input = h('input', { class: 'sc-field-in sc-field-in--num', type: 'number', step: 'any', 'aria-label': label });
    input.addEventListener('change', () => {
      const sp = sprite();
      const v = Number(input.value);
      if (!Number.isFinite(v)) return;
      if (key === 'size') sp.size = Math.max(5, Math.min(500, v));
      else if (key === 'dir') { let d = ((v % 360) + 360) % 360; if (d > 180) d -= 360; sp.dir = d; }
      else sp[key] = v;
      runtime.requestRender(); syncInfo(); ws.renderPalette(); autosave();
    }, { signal });
    return { input, el: h('label', { class: 'sc-info__f' }, h('span', null, label), input) };
  };
  const fx = numField('x', 'x'); const fy = numField('y', 'y'); const fd = numField('hướng', 'dir'); const fs = numField('cỡ', 'size');
  const visBtn = h('button', { class: 'sc-iconbtn', type: 'button', title: 'Hiện / ẩn nhân vật', 'aria-label': 'Hiện hoặc ẩn nhân vật' });
  visBtn.addEventListener('click', () => { const sp = sprite(); sp.visible = !sp.visible; syncInfo(); runtime.requestRender(); autosave(); }, { signal });
  fName.addEventListener('change', () => {
    const sp = sprite();
    const nm = fName.value.trim();
    if (!nm || project.sprites.some((o) => o !== sp && o.name === nm)) { fName.value = sp.name; toast('Tên nhân vật bị trống hoặc đã có.', { type: 'warning' }); return; }
    const old = sp.name;
    sp.name = nm;
    for (const o of project.sprites) for (const sc of o.scripts) walkTargets(sc.blocks, old, nm);
    renderSprites(); ws.renderAll(); autosave();
  }, { signal });
  const info = h('div', { class: 'sc-info' },
    h('label', { class: 'sc-info__f sc-info__f--name' }, h('span', null, 'Nhân vật'), fName),
    fx.el, fy.el, fd.el, fs.el, visBtn);

  const spriteList = h('div', { class: 'sc-sprites__list', role: 'listbox', 'aria-label': 'Danh sách nhân vật' });
  const addBtn = h('button', { class: 'sc-sprite sc-sprite--add', type: 'button', title: 'Thêm nhân vật', 'aria-label': 'Thêm nhân vật' }, icon('plus'), h('span', null, 'Thêm'));
  addBtn.addEventListener('click', () => openPopover(addBtn, [
    { head: 'Chọn nhân vật' },
    ...SPRITE_KIND_ORDER.map((k) => ({ label: SPRITE_KINDS[k].name, onSelect: () => addSprite(k) })),
  ], { minWidth: 180 }), { signal });
  const bdThumb = h('span', { class: 'sc-bd__thumb' });
  const bdName = h('span', { class: 'sc-bd__name' });
  const bdBtn = h('button', { class: 'sc-bd', type: 'button', title: 'Đổi phông nền', 'aria-haspopup': 'menu' }, bdThumb, h('span', { class: 'sc-bd__txt' }, h('small', null, 'Phông nền'), bdName));
  bdBtn.addEventListener('click', () => openPopover(bdBtn, BACKDROP_ORDER.map((id) => ({
    label: BACKDROPS[id].name, checked: project.backdrop === id,
    onSelect: () => { project.backdrop = id; syncBackdrop(); runtime.requestRender(); ws.renderPalette(); autosave(); },
  })), { minWidth: 170 }), { signal });
  const sprites = h('div', { class: 'sc-sprites' }, h('div', { class: 'sc-sprites__head' }, h('strong', null, 'Nhân vật'), h('span', { class: 'grow' }), bdBtn), spriteList);

  const side = h('aside', { class: 'sc-st__side' }, stageWrap, info, sprites);
  const main = h('div', { class: 'sc-st__main' }, ws.el, side);
  const root = h('div', { class: 'sc-st' }, bar, main);

  /* ---------- sprites ---------- */
  function walkTargets(list, old, nm) {
    for (const b of list || []) {
      for (const [k, v] of Object.entries(b.args || {})) {
        if (v && typeof v === 'object') walkTargets([v], old, nm);
        else if (k === 'TARGET' && v === old) b.args[k] = nm;
      }
      for (const st of Object.values(b.stacks || {})) walkTargets(st, old, nm);
    }
  }
  function renderSprites() {
    spriteList.replaceChildren(...project.sprites.map((sp) => {
      const selected = sp.id === project.current;
      const tile = h('div', { class: `sc-sprite${selected ? ' is-selected' : ''}`, role: 'option', 'aria-selected': String(selected), tabindex: '0', title: sp.name },
        h('img', { src: spriteThumb(sp.kind, 0), alt: '', draggable: 'false' }),
        h('span', { class: 'sc-sprite__name' }, sp.name),
        selected && project.sprites.length > 1 ? h('button', { class: 'sc-sprite__del', type: 'button', title: 'Xóa nhân vật', 'aria-label': `Xóa ${sp.name}`, onClick: (e) => { e.stopPropagation(); removeSprite(sp); } }, icon('x')) : null);
      tile.addEventListener('click', () => selectSprite(sp.id));
      tile.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectSprite(sp.id); } });
      return tile;
    }), addBtn);
  }
  function selectSprite(id) {
    project.current = id;
    renderSprites(); syncInfo(); ws.renderAll(); autosave();
  }
  function addSprite(kind) {
    let base = SPRITE_KINDS[kind].name; let nm = base; let i = 2;
    while (project.sprites.some((s) => s.name === nm)) nm = `${base} ${i++}`;
    const sp = makeSprite(kind, { name: nm, x: Math.round(Math.random() * 200 - 100), y: Math.round(Math.random() * 120 - 60) });
    project.sprites.push(sp);
    selectSprite(sp.id);
    runtime.requestRender();
    pristine = false;
  }
  async function removeSprite(sp) {
    if (sp.scripts.length && !(await confirmDialog({ title: 'Xóa nhân vật?', message: `“${sp.name}” và ${sp.scripts.length} kịch bản của nhân vật này sẽ bị xóa.`, confirmLabel: 'Xóa', danger: true }))) return;
    runtime.stopAll();
    project.sprites = project.sprites.filter((s) => s !== sp);
    project.current = project.sprites[0].id;
    selectSprite(project.current);
    runtime.requestRender();
  }
  function syncInfo() {
    const sp = sprite();
    if (!sp) return;
    if (document.activeElement !== fName) fName.value = sp.name;
    const set = (f, v) => { if (document.activeElement !== f.input) f.input.value = String(Math.round(v * 100) / 100); };
    set(fx, sp.x); set(fy, sp.y); set(fd, sp.dir); set(fs, sp.size);
    visBtn.replaceChildren(icon(sp.visible ? 'eye' : 'eye-off'));
    visBtn.setAttribute('aria-pressed', String(!sp.visible));
  }
  function syncBackdrop() {
    bdName.textContent = BACKDROPS[project.backdrop]?.name || '';
    bdThumb.dataset.bd = project.backdrop;
  }

  /* ---------- stage sizing / fullscreen ---------- */
  function fitStage() {
    if (!active) return;
    const full = root.classList.contains('is-stage-full');
    const w = stageBox.clientWidth; const hh = full ? stageBox.clientHeight : Math.min(stageBox.clientWidth * 0.75, stageBox.clientHeight || Infinity);
    stage.fit(w, hh || w * 0.75);
    runtime.requestRender();
  }
  const ro = new ResizeObserver(() => { fitStage(); ws.relayout(); });
  ro.observe(stageBox);
  ro.observe(root);
  function toggleFull(force) {
    const on = force ?? !root.classList.contains('is-stage-full');
    root.classList.toggle('is-stage-full', on);
    fullBtn.replaceChildren(icon(on ? 'minimize' : 'maximize'));
    fullBtn.title = on ? 'Thu nhỏ sân khấu' : 'Phóng to sân khấu';
    if (on && stageWrap.requestFullscreen && !document.fullscreenElement) stageWrap.requestFullscreen().catch(() => {});
    if (!on && document.fullscreenElement === stageWrap) document.exitFullscreen().catch(() => {});
    requestAnimationFrame(fitStage);
  }
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && root.classList.contains('is-stage-full')) toggleFull(false);
    else requestAnimationFrame(fitStage);
  }, { signal });

  /* ---------- keyboard ---------- */
  document.addEventListener('keydown', (e) => {
    if (!active || !root.isConnected || !root.offsetParent) return;
    if (isEditable(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
    const ae = document.activeElement;
    if (ae && ae !== document.body && !root.contains(ae)) return;
    if (root.classList.contains('is-stage-full') && e.key === 'Escape') { toggleFull(false); return; }
    const key = KEY_FROM_EVENT(e);
    if (!key) return;
    runtime.userGesture();
    if (!e.repeat) runtime.keyDown(key);
    else runtime.keys.add(key);
    if (stage.el.contains(ae) && ['space', 'up', 'down', 'left', 'right'].includes(key)) e.preventDefault();
  }, { signal });
  document.addEventListener('keyup', (e) => runtime.keyUp(KEY_FROM_EVENT(e)), { signal });
  window.addEventListener('blur', () => runtime.clearKeys(), { signal });
  const infoTimer = setInterval(() => { if (active && runtime.running) syncInfo(); }, 250);
  signal?.addEventListener('abort', () => { clearInterval(infoTimer); ro.disconnect(); runtime.stopAll(); runtime.setActive(false); });

  /* ---------- project actions ---------- */
  function loadProject(p) {
    runtime.stopAll();
    stage.penClear();
    for (const sp of project.sprites) delete sp._rt;
    project = p;
    pristine = true;
    nameInput.value = project.name;
    syncBackdrop(); renderSprites(); syncInfo(); ws.renderAll();
    runtime.requestRender();
    saveAutosave(project);
  }
  async function confirmReplace() {
    if (pristine) return true;
    return confirmDialog({ title: 'Thay dự án hiện tại?', message: 'Dự án đang mở sẽ được thay thế. Hãy chọn “Dự án → Lưu vào trình duyệt” trước nếu muốn giữ lại.', confirmLabel: 'Tiếp tục' });
  }
  async function openExample(ex) {
    if (!(await confirmReplace())) return;
    loadProject(ex.make());
    toast(`Đã mở ví dụ “${ex.name}”. Bấm cờ xanh để chạy!`, { type: 'success' });
  }
  function saveLocal() {
    if (saveToLibrary(project)) { pristine = true; toast(`Đã lưu “${project.name}” vào trình duyệt.`, { type: 'success' }); }
    else toast('Không lưu được (bộ nhớ trình duyệt bị chặn hoặc đã đầy).', { type: 'error' });
  }
  function openSavedDialog() {
    const list = listSaved();
    const body = h('div', { class: 'sc-saved' });
    const render = () => {
      const items = listSaved();
      if (!items.length) { body.replaceChildren(h('p', { class: 'text-2' }, 'Chưa có dự án nào được lưu trong trình duyệt này.')); return; }
      body.replaceChildren(...items.map((it) => h('div', { class: 'sc-saved__row' },
        h('div', { class: 'sc-saved__meta' }, h('strong', null, it.name), h('small', null, it.savedAt ? new Date(it.savedAt).toLocaleString('vi-VN') : '')),
        h('button', { class: 'btn btn--sm btn--primary', type: 'button', onClick: async () => { const p = loadFromLibrary(it.name); if (!p) { toast('Không mở được dự án này.', { type: 'error' }); return; } if (!(await confirmReplace())) return; m.close(); loadProject(p); toast(`Đã mở “${p.name}”.`, { type: 'success' }); } }, 'Mở'),
        h('button', { class: 'btn btn--sm btn--ghost', type: 'button', 'aria-label': `Xóa ${it.name}`, onClick: async () => { if (await confirmDialog({ title: 'Xóa dự án đã lưu?', message: `Xóa “${it.name}” khỏi trình duyệt?`, confirmLabel: 'Xóa', danger: true })) { deleteFromLibrary(it.name); render(); } } }, icon('trash')))));
    };
    void list;
    render();
    const m = openModal({ title: 'Dự án đã lưu', content: body, className: 'sc-modal', actions: [{ label: 'Đóng', variant: 'ghost' }] });
  }

  function showPython() {
    let code;
    try { code = projectToPython(project); } catch (err) { toast(`Không tạo được mã: ${err.message}`, { type: 'error' }); return; }
    const content = h('div', { class: 'sc-pymodal' },
      h('div', { class: 'callout callout--info' }, icon('info'), h('div', null,
        h('strong', null, 'Chỉ phần logic được chuyển thành Python thật. '),
        'Biến, “nói” (print), “hỏi và đợi” (input), vòng lặp, “nếu”, phép toán và tin nhắn (hàm) chạy được trong Python. Khối chuyển động, hiển thị, âm thanh và bút vẽ cần sân khấu nên được ghi thành chú thích.')),
      h('pre', { class: 'code-block sc-pymodal__code' }, h('code', null, raw(highlight(code, 'python')))));
    openModal({
      title: 'Mã Python tương đương', size: 'lg', className: 'sc-modal', content,
      actions: [
        { label: 'Sao chép', variant: 'ghost', icon: 'copy', onClick: async () => { toast((await copyText(code)) ? 'Đã sao chép mã Python.' : 'Không sao chép được.', { type: 'info' }); return false; } },
        { label: 'Mở trong trình soạn thảo', variant: 'primary', icon: 'code', onClick: () => { onSendToEditor?.(code); toast('Đã đưa mã Python vào trình soạn thảo.', { type: 'success' }); } },
      ],
    });
    return code;
  }

  function buildFromCode() {
    const c = getCode?.() || {};
    const lang = c.lang || 'python';
    if (lang !== 'python' && lang !== 'pyvn') { toast('“Tạo khối từ mã” chỉ hỗ trợ Python và Python Tiếng Việt.', { type: 'warning' }); return null; }
    if (!String(c.code || '').trim()) { toast('Trình soạn thảo đang trống.', { type: 'warning' }); return null; }
    const res = pythonToBlocks(c.code, lang);
    if (res.blocks.length <= 1) { toast('Không tìm thấy lệnh nào chuyển được thành khối (hỗ trợ: print, input, gán biến, if, for range, while).', { type: 'warning' }); return null; }
    for (const name of res.variables) if (!project.variables.some((v) => v.name === name)) project.variables.push({ name, value: 0, monitor: true });
    const sp = sprite();
    const y = sp.scripts.reduce((m, s) => Math.max(m, s.y), -60) + 80;
    sp.scripts.push({ x: 24, y: sp.scripts.length ? y + 120 : 24, blocks: res.blocks });
    pristine = false;
    ws.renderAll();
    autosave();
    const notes = [];
    if (res.skipped.length) notes.push(`bỏ qua dòng ${res.skipped.slice(0, 8).join(', ')}${res.skipped.length > 8 ? '…' : ''} (chưa hỗ trợ)`);
    if (res.approx.length) notes.push(`dòng ${res.approx.slice(0, 6).join(', ')} có biểu thức được giữ dạng chữ`);
    toast(`Đã tạo ${res.blocks.length - 1} khối cho “${sp.name}”${notes.length ? ` — ${notes.join('; ')}` : ''}.`, { type: notes.length ? 'warning' : 'success', duration: 6500 });
    return res;
  }

  function fileSafe(n) { return String(n).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'du-an'; }

  // initial paint
  syncBackdrop(); renderSprites(); syncInfo();

  return {
    el: root,
    show() {
      active = true;
      runtime.setActive(true);
      requestAnimationFrame(() => { ws.renderAll(); fitStage(); });
    },
    hide() { active = false; closePopover(); runtime.setActive(false); },
    buildFromCode,
    showPython,
    get project() { return project; },
    loadProject,
    loadExample(id) { const ex = EXAMPLES.find((e) => e.id === id); if (ex) loadProject(ex.make()); return project; },
    runtime,
    stage,
    workspace: ws,
    selectSprite,
    toPython: () => projectToPython(project),
  };
}
