// V-Code Edu — Xưởng khối: block definitions, palette order and model helpers.
// Block model (plain JSON):  { op, args: { NAME: literal | Block }, stacks?: { S1: Block[], S2: Block[] } }
// Script: { x, y, blocks: Block[] }.  Every op listed here is executed by runtime.js.

export const CATEGORY_ORDER = ['events', 'motion', 'looks', 'sound', 'control', 'sensing', 'operators', 'variables', 'pen'];
export const CATEGORY_NAMES = {
  events: 'Sự kiện', motion: 'Chuyển động', looks: 'Hiển thị', sound: 'Âm thanh', control: 'Điều khiển',
  sensing: 'Cảm biến', operators: 'Phép toán', variables: 'Biến', pen: 'Bút vẽ',
};

const KEY_LETTERS = 'abcdefghijklmnopqrstuvwxyz'.split('');
const KEY_DIGITS = '0123456789'.split('');
export const KEY_OPTIONS = [
  ['space', 'phím cách'], ['up', 'mũi tên lên'], ['down', 'mũi tên xuống'], ['left', 'mũi tên trái'], ['right', 'mũi tên phải'], ['any', 'bất kỳ'],
  ...KEY_LETTERS.map((k) => [k, k]), ...KEY_DIGITS.map((k) => [k, k]),
];
export const EFFECT_OPTIONS = [['color', 'màu'], ['ghost', 'bóng mờ'], ['brightness', 'độ sáng']];
export const ROTATION_OPTIONS = [['all', 'xoay tròn'], ['lr', 'trái - phải'], ['none', 'không xoay']];
export const INSTRUMENT_OPTIONS = [['sine', 'sáo trúc (âm tròn)'], ['triangle', 'đàn bầu (âm mềm)'], ['square', 'trò chơi 8-bit (âm vuông)'], ['sawtooth', 'kèn (âm răng cưa)']];
export const MATH_OPTIONS = [['abs', 'giá trị tuyệt đối'], ['sqrt', 'căn bậc hai'], ['floor', 'làm tròn xuống'], ['ceil', 'làm tròn lên'], ['sin', 'sin'], ['cos', 'cos']];

/**
 * Specs. shape: hat | stack | cap | c | reporter | boolean.
 * rows: one label per row; "%NAME" = input, "@glyph" = icon. C-blocks: one row per mouth.
 * args: { NAME: { type: num|text|bool|dd|color, def, menu } }
 */
export const SPECS = {
  // ---- Sự kiện
  ev_flag: { cat: 'events', shape: 'hat', rows: ['khi bấm @flag'] },
  ev_key: { cat: 'events', shape: 'hat', rows: ['khi nhấn phím %KEY'], args: { KEY: { type: 'dd', menu: 'keys', def: 'space' } } },
  ev_click: { cat: 'events', shape: 'hat', rows: ['khi bấm vào nhân vật này'] },
  ev_msg: { cat: 'events', shape: 'hat', rows: ['khi nhận tin nhắn %MSG'], args: { MSG: { type: 'dd', menu: 'msgs', def: 'bắt đầu' } } },
  ev_broadcast: { cat: 'events', shape: 'stack', rows: ['phát tin nhắn %MSG'], args: { MSG: { type: 'dd', menu: 'msgs', def: 'bắt đầu' } } },
  ev_broadcast_wait: { cat: 'events', shape: 'stack', rows: ['phát tin nhắn %MSG và đợi'], args: { MSG: { type: 'dd', menu: 'msgs', def: 'bắt đầu' } } },

  // ---- Chuyển động
  mo_move: { cat: 'motion', shape: 'stack', rows: ['di chuyển %STEPS bước'], args: { STEPS: { type: 'num', def: '10' } } },
  mo_turn_r: { cat: 'motion', shape: 'stack', rows: ['xoay @turn-right %DEG độ'], args: { DEG: { type: 'num', def: '15' } } },
  mo_turn_l: { cat: 'motion', shape: 'stack', rows: ['xoay @turn-left %DEG độ'], args: { DEG: { type: 'num', def: '15' } } },
  mo_goto: { cat: 'motion', shape: 'stack', rows: ['đi tới x: %X y: %Y'], args: { X: { type: 'num', def: '0' }, Y: { type: 'num', def: '0' } } },
  mo_goto_random: { cat: 'motion', shape: 'stack', rows: ['đi tới vị trí ngẫu nhiên'] },
  mo_glide: { cat: 'motion', shape: 'stack', rows: ['lướt trong %SECS giây tới x: %X y: %Y'], args: { SECS: { type: 'num', def: '1' }, X: { type: 'num', def: '0' }, Y: { type: 'num', def: '0' } } },
  mo_point: { cat: 'motion', shape: 'stack', rows: ['đặt hướng %DIR'], args: { DIR: { type: 'num', def: '90' } } },
  mo_point_towards: { cat: 'motion', shape: 'stack', rows: ['hướng về phía %TARGET'], args: { TARGET: { type: 'dd', menu: 'towards', def: '_mouse_' } } },
  mo_change_x: { cat: 'motion', shape: 'stack', rows: ['thay đổi x một lượng %DX'], args: { DX: { type: 'num', def: '10' } } },
  mo_set_x: { cat: 'motion', shape: 'stack', rows: ['đặt x thành %X'], args: { X: { type: 'num', def: '0' } } },
  mo_change_y: { cat: 'motion', shape: 'stack', rows: ['thay đổi y một lượng %DY'], args: { DY: { type: 'num', def: '10' } } },
  mo_set_y: { cat: 'motion', shape: 'stack', rows: ['đặt y thành %Y'], args: { Y: { type: 'num', def: '0' } } },
  mo_bounce: { cat: 'motion', shape: 'stack', rows: ['nếu chạm cạnh thì bật lại'] },
  mo_rotation: { cat: 'motion', shape: 'stack', rows: ['đặt kiểu xoay %STYLE'], args: { STYLE: { type: 'dd', menu: 'rotation', def: 'lr' } } },
  mo_x: { cat: 'motion', shape: 'reporter', rows: ['vị trí x'] },
  mo_y: { cat: 'motion', shape: 'reporter', rows: ['vị trí y'] },
  mo_dir: { cat: 'motion', shape: 'reporter', rows: ['hướng'] },

  // ---- Hiển thị
  lo_say_for: { cat: 'looks', shape: 'stack', rows: ['nói %MSG trong %SECS giây'], args: { MSG: { type: 'text', def: 'Xin chào!' }, SECS: { type: 'num', def: '2' } } },
  lo_say: { cat: 'looks', shape: 'stack', rows: ['nói %MSG'], args: { MSG: { type: 'text', def: 'Xin chào!' } } },
  lo_think_for: { cat: 'looks', shape: 'stack', rows: ['nghĩ %MSG trong %SECS giây'], args: { MSG: { type: 'text', def: 'Hừm…' }, SECS: { type: 'num', def: '2' } } },
  lo_think: { cat: 'looks', shape: 'stack', rows: ['nghĩ %MSG'], args: { MSG: { type: 'text', def: 'Hừm…' } } },
  lo_costume: { cat: 'looks', shape: 'stack', rows: ['đổi trang phục thành %COSTUME'], args: { COSTUME: { type: 'dd', menu: 'costumes', def: '' } } },
  lo_next_costume: { cat: 'looks', shape: 'stack', rows: ['trang phục tiếp theo'] },
  lo_backdrop: { cat: 'looks', shape: 'stack', rows: ['đổi phông nền thành %BACKDROP'], args: { BACKDROP: { type: 'dd', menu: 'backdrops', def: 'grid' } } },
  lo_change_size: { cat: 'looks', shape: 'stack', rows: ['thay đổi kích thước một lượng %N'], args: { N: { type: 'num', def: '10' } } },
  lo_set_size: { cat: 'looks', shape: 'stack', rows: ['đặt kích thước thành %N %'], args: { N: { type: 'num', def: '100' } } },
  lo_change_effect: { cat: 'looks', shape: 'stack', rows: ['thay đổi hiệu ứng %EFFECT một lượng %N'], args: { EFFECT: { type: 'dd', menu: 'effects', def: 'color' }, N: { type: 'num', def: '25' } } },
  lo_set_effect: { cat: 'looks', shape: 'stack', rows: ['đặt hiệu ứng %EFFECT thành %N'], args: { EFFECT: { type: 'dd', menu: 'effects', def: 'color' }, N: { type: 'num', def: '0' } } },
  lo_clear_effects: { cat: 'looks', shape: 'stack', rows: ['xóa hiệu ứng đồ họa'] },
  lo_show: { cat: 'looks', shape: 'stack', rows: ['hiện'] },
  lo_hide: { cat: 'looks', shape: 'stack', rows: ['ẩn'] },
  lo_front: { cat: 'looks', shape: 'stack', rows: ['đưa lên lớp trên cùng'] },
  lo_costume_num: { cat: 'looks', shape: 'reporter', rows: ['số trang phục'] },
  lo_size: { cat: 'looks', shape: 'reporter', rows: ['kích thước'] },

  // ---- Âm thanh
  so_note: { cat: 'sound', shape: 'stack', rows: ['@note phát nốt %NOTE trong %BEATS nhịp'], args: { NOTE: { type: 'num', def: '60' }, BEATS: { type: 'num', def: '0.5' } } },
  so_beep: { cat: 'sound', shape: 'stack', rows: ['@note phát tiếng bíp'] },
  so_rest: { cat: 'sound', shape: 'stack', rows: ['@note nghỉ %BEATS nhịp'], args: { BEATS: { type: 'num', def: '0.25' } } },
  so_instrument: { cat: 'sound', shape: 'stack', rows: ['@note đặt nhạc cụ %INST'], args: { INST: { type: 'dd', menu: 'instruments', def: 'triangle' } } },
  so_set_tempo: { cat: 'sound', shape: 'stack', rows: ['@note đặt nhịp độ %BPM nhịp/phút'], args: { BPM: { type: 'num', def: '90' } } },
  so_set_volume: { cat: 'sound', shape: 'stack', rows: ['@note đặt âm lượng %N %'], args: { N: { type: 'num', def: '100' } } },
  so_volume: { cat: 'sound', shape: 'reporter', rows: ['âm lượng'] },

  // ---- Điều khiển
  ct_wait: { cat: 'control', shape: 'stack', rows: ['đợi %SECS giây'], args: { SECS: { type: 'num', def: '1' } } },
  ct_repeat: { cat: 'control', shape: 'c', rows: ['lặp lại %TIMES lần'], arrow: true, args: { TIMES: { type: 'num', def: '10' } } },
  ct_forever: { cat: 'control', shape: 'c', rows: ['lặp lại mãi mãi'], arrow: true, cap: true },
  ct_if: { cat: 'control', shape: 'c', rows: ['nếu %COND thì'], args: { COND: { type: 'bool' } } },
  ct_if_else: { cat: 'control', shape: 'c', rows: ['nếu %COND thì', 'nếu không thì'], args: { COND: { type: 'bool' } } },
  ct_wait_until: { cat: 'control', shape: 'stack', rows: ['đợi đến khi %COND'], args: { COND: { type: 'bool' } } },
  ct_repeat_until: { cat: 'control', shape: 'c', rows: ['lặp lại đến khi %COND'], arrow: true, args: { COND: { type: 'bool' } } },
  ct_stop: { cat: 'control', shape: 'cap', rows: ['dừng tất cả @stop'] },

  // ---- Cảm biến
  se_touch: { cat: 'sensing', shape: 'boolean', rows: ['chạm %TARGET ?'], args: { TARGET: { type: 'dd', menu: 'touch', def: '_edge_' } } },
  se_key: { cat: 'sensing', shape: 'boolean', rows: ['phím %KEY được nhấn?'], args: { KEY: { type: 'dd', menu: 'keys', def: 'space' } } },
  se_mouse_down: { cat: 'sensing', shape: 'boolean', rows: ['chuột được nhấn?'] },
  se_mouse_x: { cat: 'sensing', shape: 'reporter', rows: ['chuột x'] },
  se_mouse_y: { cat: 'sensing', shape: 'reporter', rows: ['chuột y'] },
  se_distance: { cat: 'sensing', shape: 'reporter', rows: ['khoảng cách đến %TARGET'], args: { TARGET: { type: 'dd', menu: 'towards', def: '_mouse_' } } },
  se_ask: { cat: 'sensing', shape: 'stack', rows: ['hỏi %Q và đợi'], args: { Q: { type: 'text', def: 'Bạn tên là gì?' } } },
  se_answer: { cat: 'sensing', shape: 'reporter', rows: ['trả lời'] },
  se_timer: { cat: 'sensing', shape: 'reporter', rows: ['bộ đếm giờ'] },
  se_reset_timer: { cat: 'sensing', shape: 'stack', rows: ['đặt lại bộ đếm giờ'] },

  // ---- Phép toán
  op_add: { cat: 'operators', shape: 'reporter', rows: ['%A + %B'], args: { A: { type: 'num', def: '' }, B: { type: 'num', def: '' } } },
  op_sub: { cat: 'operators', shape: 'reporter', rows: ['%A − %B'], args: { A: { type: 'num', def: '' }, B: { type: 'num', def: '' } } },
  op_mul: { cat: 'operators', shape: 'reporter', rows: ['%A × %B'], args: { A: { type: 'num', def: '' }, B: { type: 'num', def: '' } } },
  op_div: { cat: 'operators', shape: 'reporter', rows: ['%A ÷ %B'], args: { A: { type: 'num', def: '' }, B: { type: 'num', def: '' } } },
  op_random: { cat: 'operators', shape: 'reporter', rows: ['ngẫu nhiên từ %A đến %B'], args: { A: { type: 'num', def: '1' }, B: { type: 'num', def: '10' } } },
  op_gt: { cat: 'operators', shape: 'boolean', rows: ['%A > %B'], args: { A: { type: 'text', def: '' }, B: { type: 'text', def: '50' } } },
  op_lt: { cat: 'operators', shape: 'boolean', rows: ['%A < %B'], args: { A: { type: 'text', def: '' }, B: { type: 'text', def: '50' } } },
  op_eq: { cat: 'operators', shape: 'boolean', rows: ['%A = %B'], args: { A: { type: 'text', def: '' }, B: { type: 'text', def: '50' } } },
  op_and: { cat: 'operators', shape: 'boolean', rows: ['%A và %B'], args: { A: { type: 'bool' }, B: { type: 'bool' } } },
  op_or: { cat: 'operators', shape: 'boolean', rows: ['%A hoặc %B'], args: { A: { type: 'bool' }, B: { type: 'bool' } } },
  op_not: { cat: 'operators', shape: 'boolean', rows: ['không %A'], args: { A: { type: 'bool' } } },
  op_join: { cat: 'operators', shape: 'reporter', rows: ['nối %A với %B'], args: { A: { type: 'text', def: 'xin ' }, B: { type: 'text', def: 'chào' } } },
  op_letter: { cat: 'operators', shape: 'reporter', rows: ['ký tự thứ %N của %S'], args: { N: { type: 'num', def: '1' }, S: { type: 'text', def: 'táo' } } },
  op_length: { cat: 'operators', shape: 'reporter', rows: ['độ dài của %S'], args: { S: { type: 'text', def: 'táo' } } },
  op_mod: { cat: 'operators', shape: 'reporter', rows: ['%A chia lấy dư %B'], args: { A: { type: 'num', def: '' }, B: { type: 'num', def: '' } } },
  op_idiv: { cat: 'operators', shape: 'reporter', rows: ['%A chia lấy nguyên %B'], args: { A: { type: 'num', def: '' }, B: { type: 'num', def: '' } } },
  op_round: { cat: 'operators', shape: 'reporter', rows: ['làm tròn %A'], args: { A: { type: 'num', def: '' } } },
  op_math: { cat: 'operators', shape: 'reporter', rows: ['%FN của %A'], args: { FN: { type: 'dd', menu: 'math', def: 'abs' }, A: { type: 'num', def: '' } } },

  // ---- Biến
  va_get: { cat: 'variables', shape: 'reporter', rows: ['%VAR'], args: { VAR: { type: 'var', def: '' } } },
  va_set: { cat: 'variables', shape: 'stack', rows: ['đặt %VAR thành %VAL'], args: { VAR: { type: 'dd', menu: 'vars', def: '' }, VAL: { type: 'text', def: '0' } } },
  va_change: { cat: 'variables', shape: 'stack', rows: ['thay đổi %VAR một lượng %VAL'], args: { VAR: { type: 'dd', menu: 'vars', def: '' }, VAL: { type: 'num', def: '1' } } },
  va_show: { cat: 'variables', shape: 'stack', rows: ['hiện biến %VAR'], args: { VAR: { type: 'dd', menu: 'vars', def: '' } } },
  va_hide: { cat: 'variables', shape: 'stack', rows: ['ẩn biến %VAR'], args: { VAR: { type: 'dd', menu: 'vars', def: '' } } },

  // ---- Bút vẽ
  pe_clear: { cat: 'pen', shape: 'stack', rows: ['@pen xóa hết'] },
  pe_stamp: { cat: 'pen', shape: 'stack', rows: ['@pen đóng dấu'] },
  pe_down: { cat: 'pen', shape: 'stack', rows: ['@pen hạ bút'] },
  pe_up: { cat: 'pen', shape: 'stack', rows: ['@pen nhấc bút'] },
  pe_color: { cat: 'pen', shape: 'stack', rows: ['@pen đặt màu bút thành %COLOR'], args: { COLOR: { type: 'color', def: '#2f6fdc' } } },
  pe_change_hue: { cat: 'pen', shape: 'stack', rows: ['@pen thay đổi màu bút một lượng %N'], args: { N: { type: 'num', def: '10' } } },
  pe_size: { cat: 'pen', shape: 'stack', rows: ['@pen đặt độ dày bút thành %N'], args: { N: { type: 'num', def: '3' } } },
  pe_change_size: { cat: 'pen', shape: 'stack', rows: ['@pen thay đổi độ dày bút một lượng %N'], args: { N: { type: 'num', def: '1' } } },
};

/** Palette layout per category (op ids; the variables category is built dynamically). */
export const PALETTE = {
  events: ['ev_flag', 'ev_key', 'ev_click', 'ev_msg', 'ev_broadcast', 'ev_broadcast_wait'],
  motion: ['mo_move', 'mo_turn_r', 'mo_turn_l', 'mo_goto', 'mo_goto_random', 'mo_glide', 'mo_point', 'mo_point_towards', 'mo_change_x', 'mo_set_x', 'mo_change_y', 'mo_set_y', 'mo_bounce', 'mo_rotation', 'mo_x', 'mo_y', 'mo_dir'],
  looks: ['lo_say_for', 'lo_say', 'lo_think_for', 'lo_think', 'lo_costume', 'lo_next_costume', 'lo_backdrop', 'lo_change_size', 'lo_set_size', 'lo_change_effect', 'lo_set_effect', 'lo_clear_effects', 'lo_show', 'lo_hide', 'lo_front', 'lo_costume_num', 'lo_size'],
  sound: ['so_note', 'so_beep', 'so_rest', 'so_instrument', 'so_set_tempo', 'so_set_volume', 'so_volume'],
  control: ['ct_wait', 'ct_repeat', 'ct_forever', 'ct_if', 'ct_if_else', 'ct_wait_until', 'ct_repeat_until', 'ct_stop'],
  sensing: ['se_touch', 'se_key', 'se_mouse_down', 'se_mouse_x', 'se_mouse_y', 'se_distance', 'se_ask', 'se_answer', 'se_timer', 'se_reset_timer'],
  operators: ['op_add', 'op_sub', 'op_mul', 'op_div', 'op_random', 'op_gt', 'op_lt', 'op_eq', 'op_and', 'op_or', 'op_not', 'op_join', 'op_letter', 'op_length', 'op_mod', 'op_idiv', 'op_round', 'op_math'],
  variables: ['va_set', 'va_change', 'va_show', 'va_hide'],
  pen: ['pe_clear', 'pe_stamp', 'pe_down', 'pe_up', 'pe_color', 'pe_change_hue', 'pe_size', 'pe_change_size'],
};

export const isHat = (b) => SPECS[b?.op]?.shape === 'hat';
export const isReporter = (b) => ['reporter', 'boolean'].includes(SPECS[b?.op]?.shape);
export const isBoolean = (b) => SPECS[b?.op]?.shape === 'boolean';
export const isCap = (b) => { const sp = SPECS[b?.op]; return !!sp && (sp.shape === 'cap' || (sp.shape === 'c' && sp.cap)); };
export const mouthCount = (b) => (SPECS[b?.op]?.shape === 'c' ? SPECS[b.op].rows.length : 0);

/** New block with default arguments. */
export function newBlock(op, args = {}) {
  const spec = SPECS[op];
  const b = { op, args: {} };
  if (!spec) return b;
  for (const [name, a] of Object.entries(spec.args || {})) {
    if (a.type === 'bool') b.args[name] = null;
    else b.args[name] = a.def ?? '';
  }
  Object.assign(b.args, args);
  const n = mouthCount(b);
  if (n) { b.stacks = {}; for (let i = 1; i <= n; i++) b.stacks[`S${i}`] = []; }
  return b;
}

/** Shorthand used by example projects: B('mo_move', { STEPS: 10 }, [stack1], [stack2]). Numbers become strings. */
export function B(op, args = {}, s1, s2) {
  const norm = {};
  for (const [k, v] of Object.entries(args)) norm[k] = typeof v === 'number' ? String(v) : v;
  const b = newBlock(op, norm);
  if (s1) b.stacks.S1 = s1;
  if (s2) b.stacks.S2 = s2;
  return b;
}

export function cloneBlocks(x) { return JSON.parse(JSON.stringify(x)); }

/** Visit every block (stack blocks, nested reporters, sub-stacks). fn(block). */
export function walkBlocks(list, fn) {
  for (const b of list || []) walkBlock(b, fn);
}
export function walkBlock(b, fn) {
  if (!b || typeof b !== 'object' || !b.op) return;
  fn(b);
  for (const v of Object.values(b.args || {})) if (v && typeof v === 'object') walkBlock(v, fn);
  for (const st of Object.values(b.stacks || {})) walkBlocks(st, fn);
}

/** Make a model safe: unknown ops dropped, args normalised. Returns a sanitised copy. */
export function sanitizeBlocks(list) {
  const out = [];
  for (const b of Array.isArray(list) ? list : []) {
    const c = sanitizeBlock(b);
    if (c) out.push(c);
  }
  return out;
}
export function sanitizeBlock(b) {
  if (!b || typeof b !== 'object' || !SPECS[b.op]) return null;
  const spec = SPECS[b.op];
  const nb = newBlock(b.op);
  for (const [name, a] of Object.entries(spec.args || {})) {
    const v = b.args?.[name];
    if (v && typeof v === 'object') {
      const r = sanitizeBlock(v);
      nb.args[name] = r && isReporter(r) && a.type !== 'dd' && a.type !== 'var' ? r : (a.type === 'bool' ? null : (a.def ?? ''));
    } else if (v !== undefined && v !== null) {
      nb.args[name] = a.type === 'bool' ? null : String(v).slice(0, 2000);
    }
  }
  if (nb.stacks) for (const k of Object.keys(nb.stacks)) nb.stacks[k] = sanitizeBlocks(b.stacks?.[k]);
  return nb;
}
