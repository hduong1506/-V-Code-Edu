// V-Code Edu — Xưởng khối projects: defaults, example projects, normalisation, localStorage and JSON files.
import { B, sanitizeBlocks } from './blocks.js';
import { SPRITE_KINDS, BACKDROPS } from './sprites.js';

export const FORMAT = 'vcode-scratch';
const AUTOSAVE_KEY = 'vc-scratch-autosave';
const LIBRARY_KEY = 'vc-scratch-library';

let idSeq = 0;
export const spriteId = () => `sp${Date.now().toString(36)}${(idSeq++).toString(36)}`;

export function makeSprite(kind = 'vbot', extra = {}) {
  return {
    id: spriteId(), name: SPRITE_KINDS[kind]?.name || 'Nhân vật', kind,
    x: 0, y: 0, dir: 90, size: 100, visible: true, costume: 0, rotationStyle: 'all', scripts: [], ...extra,
  };
}

export function newProject() {
  const bot = makeSprite('vbot', { y: -20 });
  bot.scripts.push({ x: 24, y: 24, blocks: [B('ev_flag'), B('mo_goto', { X: 0, Y: -20 }), B('lo_say_for', { MSG: 'Xin chào! Hãy kéo thêm khối để lập trình cho mình nhé.', SECS: 3 })] });
  return { format: FORMAT, version: 1, name: 'Dự án mới', backdrop: 'grid', variables: [{ name: 'điểm', value: 0, monitor: false }], messages: ['bắt đầu'], sprites: [bot], current: bot.id };
}

/* ---------------- example projects (every one runs) ---------------- */
const v = (name) => B('va_get', { VAR: name });

function exGreeter() {
  const bot = makeSprite('vbot', { y: -30 });
  bot.scripts.push({
    x: 20, y: 20,
    blocks: [
      B('ev_flag'),
      B('mo_goto', { X: 0, Y: -30 }),
      B('lo_costume', { COSTUME: 'đứng' }),
      B('lo_say_for', { MSG: 'Xin chào! Mình là V-Bot.', SECS: 2 }),
      B('se_ask', { Q: 'Bạn tên là gì?' }),
      B('va_set', { VAR: 'tên', VAL: B('se_answer') }),
      B('lo_costume', { COSTUME: 'vẫy tay' }),
      B('so_note', { NOTE: 72, BEATS: 0.25 }),
      B('lo_say_for', { MSG: B('op_join', { A: 'Rất vui được gặp ', B: v('tên') }), SECS: 2 }),
      B('lo_costume', { COSTUME: 'đứng' }),
      B('se_ask', { Q: 'Bạn bao nhiêu tuổi?' }),
      B('ct_if_else', { COND: B('op_gt', { A: B('se_answer'), B: '10' }) },
        [B('lo_say_for', { MSG: 'Ồ, bạn lớn hơn mình rồi! Mình mới 10 tuổi.', SECS: 2 })],
        [B('lo_say_for', { MSG: B('op_join', { A: 'Còn ', B: B('op_join', { A: B('op_sub', { A: '10', B: B('se_answer') }), B: ' năm nữa là bạn bằng tuổi mình!' }) }), SECS: 2 })]),
      B('lo_say', { MSG: B('op_join', { A: 'Tạm biệt ', B: B('op_join', { A: v('tên'), B: '!' }) }) }),
    ],
  });
  bot.scripts.push({ x: 20, y: 640, blocks: [B('ev_click'), B('lo_next_costume'), B('so_beep'), B('lo_say_for', { MSG: 'Ui, nhột quá!', SECS: 1 }), B('lo_next_costume')] });
  return { format: FORMAT, version: 1, name: 'Rô-bốt chào hỏi', backdrop: 'sky', variables: [{ name: 'tên', value: '', monitor: true }], messages: ['bắt đầu'], sprites: [bot], current: bot.id };
}

function exPolygon() {
  const turtle = makeSprite('turtle', { x: -40, y: -110, size: 80 });
  turtle.scripts.push({ x: 20, y: 20, blocks: [B('ev_flag'), B('va_set', { VAR: 'số cạnh', VAL: '6' }), B('ev_broadcast', { MSG: 'vẽ' })] });
  turtle.scripts.push({
    x: 20, y: 170,
    blocks: [B('ev_key', { KEY: 'space' }), B('va_change', { VAR: 'số cạnh', VAL: 1 }),
      B('ct_if', { COND: B('op_gt', { A: v('số cạnh'), B: '10' }) }, [B('va_set', { VAR: 'số cạnh', VAL: '3' })]),
      B('ev_broadcast', { MSG: 'vẽ' })],
  });
  turtle.scripts.push({
    x: 380, y: 20,
    blocks: [
      B('ev_msg', { MSG: 'vẽ' }),
      B('pe_clear'), B('pe_up'),
      B('mo_goto', { X: -40, Y: -110 }), B('mo_point', { DIR: 90 }),
      B('pe_color', { COLOR: '#2f6fdc' }), B('pe_size', { N: 4 }), B('pe_down'),
      B('ct_repeat', { TIMES: v('số cạnh') }, [
        B('mo_move', { STEPS: 80 }),
        B('mo_turn_l', { DEG: B('op_div', { A: '360', B: v('số cạnh') }) }),
        B('pe_change_hue', { N: 12 }),
        B('ct_wait', { SECS: 0.15 }),
      ]),
      B('pe_up'),
      B('lo_say_for', { MSG: B('op_join', { A: 'Hình ', B: B('op_join', { A: v('số cạnh'), B: ' cạnh! Nhấn phím cách để thêm cạnh.' }) }), SECS: 3 }),
    ],
  });
  return { format: FORMAT, version: 1, name: 'Vẽ hình đa giác bằng bút', backdrop: 'grid', variables: [{ name: 'số cạnh', value: 6, monitor: true }], messages: ['vẽ'], sprites: [turtle], current: turtle.id };
}

function exCatchStars() {
  const rocket = makeSprite('rocket', { y: -140, dir: 0, size: 80 });
  const star = makeSprite('star', { y: 170, size: 70 });
  rocket.scripts.push({
    x: 20, y: 20,
    blocks: [
      B('ev_flag'), B('mo_goto', { X: 0, Y: -140 }), B('mo_point', { DIR: 0 }), B('lo_set_size', { N: 80 }),
      B('ct_forever', {}, [
        B('ct_if', { COND: B('se_key', { KEY: 'left' }) }, [B('mo_change_x', { DX: -9 })]),
        B('ct_if', { COND: B('se_key', { KEY: 'right' }) }, [B('mo_change_x', { DX: 9 })]),
        B('ct_if_else', { COND: B('op_or', { A: B('se_key', { KEY: 'left' }), B: B('se_key', { KEY: 'right' }) }) },
          [B('lo_costume', { COSTUME: 'tăng tốc' })], [B('lo_costume', { COSTUME: 'bay' })]),
      ]),
    ],
  });
  rocket.scripts.push({
    x: 20, y: 380,
    blocks: [
      B('ev_flag'), B('se_reset_timer'),
      B('lo_say_for', { MSG: 'Dùng phím ← → để bắt sao trong 30 giây!', SECS: 2 }),
      B('ct_wait_until', { COND: B('op_gt', { A: B('se_timer'), B: '30' }) }),
      B('lo_say_for', { MSG: B('op_join', { A: 'Hết giờ! Điểm của em: ', B: v('điểm') }), SECS: 3 }),
      B('ct_stop'),
    ],
  });
  star.scripts.push({
    x: 20, y: 20,
    blocks: [
      B('ev_flag'), B('va_set', { VAR: 'điểm', VAL: '0' }), B('va_set', { VAR: 'tốc độ', VAL: '4' }),
      B('mo_goto', { X: B('op_random', { A: '-220', B: '220' }), Y: 170 }),
      B('ct_forever', {}, [
        B('mo_change_y', { DY: B('op_sub', { A: '0', B: v('tốc độ') }) }),
        B('mo_turn_r', { DEG: 6 }),
        B('ct_if', { COND: B('se_touch', { TARGET: 'Tên lửa' }) }, [
          B('va_change', { VAR: 'điểm', VAL: 1 }),
          B('va_change', { VAR: 'tốc độ', VAL: 0.3 }),
          B('so_note', { NOTE: 76, BEATS: 0.1 }),
          B('mo_goto', { X: B('op_random', { A: '-220', B: '220' }), Y: 170 }),
        ]),
        B('ct_if', { COND: B('op_lt', { A: B('mo_y'), B: '-165' }) }, [
          B('mo_goto', { X: B('op_random', { A: '-220', B: '220' }), Y: 170 }),
        ]),
      ]),
    ],
  });
  return {
    format: FORMAT, version: 1, name: 'Trò chơi bắt sao', backdrop: 'space',
    variables: [{ name: 'điểm', value: 0, monitor: true }, { name: 'tốc độ', value: 4, monitor: false }],
    messages: ['bắt đầu'], sprites: [rocket, star], current: star.id,
  };
}

function exCounting() {
  const bot = makeSprite('vbot', { x: -120, y: -40 });
  const ball = makeSprite('ball', { x: 120, y: -60, size: 90 });
  bot.scripts.push({
    x: 20, y: 20,
    blocks: [
      B('ev_flag'), B('mo_goto', { X: -120, Y: -40 }),
      B('va_set', { VAR: 'đếm', VAL: '0' }), B('va_set', { VAR: 'tổng', VAL: '0' }),
      B('ct_repeat', { TIMES: 10 }, [
        B('va_change', { VAR: 'đếm', VAL: 1 }),
        B('va_change', { VAR: 'tổng', VAL: v('đếm') }),
        B('ct_if_else', { COND: B('op_eq', { A: B('op_mod', { A: v('đếm'), B: '2' }), B: '0' }) },
          [B('lo_costume', { COSTUME: 'vẫy tay' }), B('lo_say', { MSG: B('op_join', { A: v('đếm'), B: ' là số chẵn' }) })],
          [B('lo_costume', { COSTUME: 'đứng' }), B('lo_say', { MSG: B('op_join', { A: v('đếm'), B: ' là số lẻ' }) })]),
        B('so_note', { NOTE: B('op_add', { A: '60', B: v('đếm') }), BEATS: 0.25 }),
        B('ct_wait', { SECS: 0.2 }),
      ]),
      B('lo_costume', { COSTUME: 'đứng' }),
      B('ev_broadcast', { MSG: 'xong' }),
      B('lo_say', { MSG: B('op_join', { A: 'Tổng từ 1 đến 10 là ', B: v('tổng') }) }),
    ],
  });
  ball.scripts.push({ x: 20, y: 20, blocks: [B('ev_flag'), B('mo_goto', { X: 120, Y: -60 }), B('lo_costume', { COSTUME: 'cam' })] });
  ball.scripts.push({
    x: 20, y: 200,
    blocks: [B('ev_msg', { MSG: 'xong' }), B('lo_costume', { COSTUME: 'xanh' }),
      B('ct_repeat', { TIMES: 2 }, [B('mo_glide', { SECS: 0.3, X: 120, Y: 20 }), B('mo_glide', { SECS: 0.3, X: 120, Y: -60 })])],
  });
  return {
    format: FORMAT, version: 1, name: 'Đếm số với biến', backdrop: 'meadow',
    variables: [{ name: 'đếm', value: 0, monitor: true }, { name: 'tổng', value: 0, monitor: true }],
    messages: ['xong'], sprites: [bot, ball], current: bot.id,
  };
}

export const EXAMPLES = [
  { id: 'greeter', name: 'Rô-bốt chào hỏi', desc: 'Hỏi tên, tuổi và trả lời bằng khối “hỏi và đợi”.', make: exGreeter },
  { id: 'polygon', name: 'Vẽ hình đa giác bằng bút', desc: 'Rùa vẽ đa giác đều; nhấn phím cách để thêm cạnh.', make: exPolygon },
  { id: 'stars', name: 'Trò chơi bắt sao', desc: 'Điều khiển tên lửa bằng phím ← → để bắt sao rơi.', make: exCatchStars },
  { id: 'counting', name: 'Đếm số với biến', desc: 'Đếm từ 1 đến 10, tính tổng và phân biệt chẵn lẻ.', make: exCounting },
];

/* ---------------- normalisation / serialisation ---------------- */
const str = (x, n = 60) => String(x ?? '').slice(0, n);
const num = (x, d) => (Number.isFinite(Number(x)) ? Number(x) : d);

export function normalizeProject(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.sprites)) throw new Error('Tệp không phải dự án Xưởng khối.');
  const sprites = raw.sprites.slice(0, 30).map((s) => ({
    id: str(s.id || spriteId(), 40), name: str(s.name || 'Nhân vật', 40) || 'Nhân vật',
    kind: SPRITE_KINDS[s.kind] ? s.kind : 'vbot',
    x: num(s.x, 0), y: num(s.y, 0), dir: num(s.dir, 90), size: Math.max(5, Math.min(500, num(s.size, 100))),
    visible: s.visible !== false, costume: Math.max(0, Math.floor(num(s.costume, 0))) % 2,
    rotationStyle: ['all', 'lr', 'none'].includes(s.rotationStyle) ? s.rotationStyle : 'all',
    scripts: (Array.isArray(s.scripts) ? s.scripts : []).slice(0, 200).map((sc) => ({ x: num(sc.x, 20), y: num(sc.y, 20), blocks: sanitizeBlocks(sc.blocks) })).filter((sc) => sc.blocks.length),
  }));
  if (!sprites.length) sprites.push(makeSprite('vbot'));
  const names = new Set();
  for (const s of sprites) { let n = s.name; let i = 2; while (names.has(n)) n = `${s.name} ${i++}`; s.name = n; names.add(n); }
  const variables = (Array.isArray(raw.variables) ? raw.variables : []).slice(0, 100)
    .map((x) => (typeof x === 'string' ? { name: x, value: 0, monitor: true } : { name: str(x?.name, 32), value: typeof x?.value === 'number' ? x.value : str(x?.value, 500), monitor: x?.monitor !== false }))
    .filter((x) => x.name);
  const messages = [...new Set((Array.isArray(raw.messages) ? raw.messages : []).map((m) => str(m, 40)).filter(Boolean))];
  return {
    format: FORMAT, version: 1, name: str(raw.name || 'Dự án', 60) || 'Dự án',
    backdrop: BACKDROPS[raw.backdrop] ? raw.backdrop : 'plain',
    variables, messages: messages.length ? messages : ['bắt đầu'], sprites,
    current: sprites.some((s) => s.id === raw.current) ? raw.current : sprites[0].id,
  };
}

export function serializeProject(p) {
  return JSON.stringify(p, (k, val) => (k.startsWith('_') ? undefined : val), 1);
}

export function loadAutosave() {
  try { const t = localStorage.getItem(AUTOSAVE_KEY); return t ? normalizeProject(JSON.parse(t)) : null; } catch { return null; }
}
export function saveAutosave(p) {
  try { localStorage.setItem(AUTOSAVE_KEY, serializeProject(p)); return true; } catch { return false; }
}
export function listSaved() {
  try {
    const lib = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '{}');
    return Object.entries(lib).map(([name, e]) => ({ name, savedAt: e.savedAt || 0 })).sort((a, b) => b.savedAt - a.savedAt);
  } catch { return []; }
}
export function saveToLibrary(p) {
  try {
    const lib = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '{}');
    lib[p.name] = { savedAt: Date.now(), data: JSON.parse(serializeProject(p)) };
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib));
    return true;
  } catch { return false; }
}
export function loadFromLibrary(name) {
  try { const lib = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '{}'); return lib[name] ? normalizeProject(lib[name].data) : null; } catch { return null; }
}
export function deleteFromLibrary(name) {
  try { const lib = JSON.parse(localStorage.getItem(LIBRARY_KEY) || '{}'); delete lib[name]; localStorage.setItem(LIBRARY_KEY, JSON.stringify(lib)); return true; } catch { return false; }
}
