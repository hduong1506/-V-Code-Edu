// V-Code Edu — "Xem mã Python": readable Python for the logic subset of a Xưởng khối project.
// Variables, nói → print, hỏi → input, loops, if, operators and message scripts become real Python.
// Motion, looks, sound and pen blocks have no meaning without a stage, so they become comments.
import { SPECS, CATEGORY_NAMES, KEY_OPTIONS, MATH_OPTIONS } from './blocks.js';
import { BACKDROPS } from './sprites.js';

const PY_KEYWORDS = new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield', 'print', 'input', 'int', 'str', 'float', 'len', 'round', 'random', 'time', 'math', 'so', 'tra_loi', 'bat_dau']);

export function identifier(name, used) {
  let id = String(name ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').replace(/_+/g, '_');
  if (!id) id = 'bien';
  if (/^[0-9]/.test(id)) id = `bien_${id}`;
  if (PY_KEYWORDS.has(id)) id = `${id}_`;
  let out = id;
  let i = 2;
  while (used && used.has(out)) out = `${id}_${i++}`;
  used?.add(out);
  return out;
}

const pyStr = (s) => JSON.stringify(String(s));
const isNumLit = (s) => typeof s === 'string' && s.trim() !== '' && !Number.isNaN(Number(s)) && /^[\s+-]*[0-9.]/.test(s);
const numLit = (s) => {
  const n = Number(String(s).trim());
  if (!Number.isFinite(n)) return '0';
  return String(n);
};

// precedence: 1 or, 2 and, 3 not, 4 compare, 5 + -, 6 * / // %, 7 unary, 9 atom
const E = (code, type = 'any', prec = 9) => ({ code, type, prec });
const wrap = (e, p) => (e.prec < p ? `(${e.code})` : e.code);

export function projectToPython(project) {
  const used = new Set();
  const varIds = new Map();
  for (const v of project.variables) varIds.set(v.name, identifier(v.name, used));
  const flags = { random: false, time: false, so: false, math: false, timer: false };
  const varTypes = new Map();

  // message handler names
  const handlers = new Map(); // msg -> [fnName]
  const keyHandlers = [];
  const clickHandlers = [];
  for (const sp of project.sprites) {
    for (const sc of sp.scripts) {
      const hat = sc.blocks[0];
      if (!hat) continue;
      if (hat.op === 'ev_msg') {
        const list = handlers.get(hat.args.MSG) || [];
        const fn = identifier(`khi_nhan_${hat.args.MSG}`, used);
        list.push(fn);
        handlers.set(hat.args.MSG, list);
        sc._fn = fn;
      } else if (hat.op === 'ev_key') {
        sc._fn = identifier(`khi_nhan_phim_${hat.args.KEY}`, used);
        keyHandlers.push(sc);
      } else if (hat.op === 'ev_click') {
        sc._fn = identifier(`khi_bam_vao_${sp.name}`, used);
        clickHandlers.push(sc);
      }
    }
  }

  // ---- type inference for variables (num unless anything non-numeric is ever stored)
  const typeOfLiteralOrBlock = (v) => {
    if (v && typeof v === 'object') return exprRaw(v, null).type;
    return isNumLit(String(v)) ? 'num' : 'str';
  };
  for (const v of project.variables) varTypes.set(v.name, typeof v.value === 'number' || isNumLit(String(v.value)) ? 'num' : 'str');
  for (let pass = 0; pass < 2; pass++) {
    for (const sp of project.sprites) for (const sc of sp.scripts) walk(sc.blocks, (b) => {
      if (b.op === 'va_set') {
        const t = typeOfLiteralOrBlock(b.args.VAL);
        if (t !== 'num') varTypes.set(b.args.VAR, 'any');
      }
    });
  }
  function walk(list, fn) {
    for (const b of list || []) {
      fn(b);
      for (const st of Object.values(b.stacks || {})) walk(st, fn);
    }
  }

  const vid = (name) => {
    if (!varIds.has(name)) varIds.set(name, identifier(name || 'bien', used));
    return varIds.get(name);
  };

  // ---- expressions
  function lit(v, slotType) {
    const s = String(v ?? '');
    if (slotType === 'num') return E(isNumLit(s) ? numLit(s) : '0', 'num', s.trim().startsWith('-') ? 7 : 9);
    if (isNumLit(s)) return E(numLit(s), 'num', s.trim().startsWith('-') ? 7 : 9);
    return E(pyStr(s), 'str');
  }
  function arg(b, name, notes) {
    const v = b.args?.[name];
    const a = SPECS[b.op]?.args?.[name];
    if (v && typeof v === 'object' && v.op) return exprRaw(v, notes);
    if (a?.type === 'bool') return E('False', 'bool');
    return lit(v, a?.type);
  }
  function asNum(e) {
    if (e.type === 'num') return e;
    flags.so = true;
    return E(`so(${e.code})`, 'num');
  }
  function asStr(e) {
    if (e.type === 'str') return e;
    return E(`str(${e.code})`, 'str');
  }
  function placeholder(code, type, text, notes) {
    notes?.push(`"${text}" chỉ có trên sân khấu Scratch — tạm thay bằng ${code}`);
    return E(code, type);
  }
  function exprRaw(b, notes) {
    const A = () => arg(b, 'A', notes);
    const Bv = () => arg(b, 'B', notes);
    const bin = (op, p) => { const l = asNum(A()); const r = asNum(Bv()); return E(`${wrap(l, p)} ${op} ${wrap(r, p + 1)}`, 'num', p); };
    const cmp = (op) => {
      let l = A(); let r = Bv();
      if (l.type === 'num' || r.type === 'num') { l = asNum(l); r = asNum(r); }
      return E(`${wrap(l, 5)} ${op} ${wrap(r, 5)}`, 'bool', 4);
    };
    switch (b.op) {
      case 'op_add': return bin('+', 5);
      case 'op_sub': return bin('-', 5);
      case 'op_mul': return bin('*', 6);
      case 'op_div': return bin('/', 6);
      case 'op_mod': return bin('%', 6);
      case 'op_idiv': return bin('//', 6);
      case 'op_round': return E(`round(${asNum(A()).code})`, 'num');
      case 'op_math': {
        const x = asNum(A()).code;
        flags.math = true;
        const fn = b.args.FN;
        if (fn === 'abs') { flags.math = false || flags.math; return E(`abs(${x})`, 'num'); }
        if (fn === 'sin' || fn === 'cos') return E(`round(math.${fn}(math.radians(${x})), 10)`, 'num');
        if (fn === 'sqrt' || fn === 'floor' || fn === 'ceil') return E(`math.${fn}(${x})`, 'num');
        return E(x, 'num');
      }
      case 'op_random': {
        flags.random = true;
        const a = A(); const c = Bv();
        const dec = /\./.test(a.code) || /\./.test(c.code);
        return E(`random.${dec ? 'uniform' : 'randint'}(${asNum(a).code}, ${asNum(c).code})`, 'num');
      }
      case 'op_gt': return cmp('>');
      case 'op_lt': return cmp('<');
      case 'op_eq': return cmp('==');
      case 'op_and': { const l = A(); const r = Bv(); return E(`${wrap(l, 2)} and ${wrap(r, 3)}`, 'bool', 2); }
      case 'op_or': { const l = A(); const r = Bv(); return E(`${wrap(l, 1)} or ${wrap(r, 2)}`, 'bool', 1); }
      case 'op_not': return E(`not ${wrap(A(), 3)}`, 'bool', 3);
      case 'op_join': {
        const l = arg(b, 'A', notes); const r = arg(b, 'B', notes);
        if (l.code.startsWith('"') && r.code.startsWith('"') && l.type === 'str' && r.type === 'str') return E(pyStr(JSON.parse(l.code) + JSON.parse(r.code)), 'str');
        return E(`${wrap(asStr(l), 5)} + ${wrap(asStr(r), 6)}`, 'str', 5);
      }
      case 'op_length': return E(`len(${asStr(arg(b, 'S', notes)).code})`, 'num');
      case 'op_letter': return E(`${wrap(asStr(arg(b, 'S', notes)), 9)}[${wrap(asNum(arg(b, 'N', notes)), 6)} - 1]`, 'str');
      case 'va_get': return E(vid(b.args.VAR), varTypes.get(b.args.VAR) === 'num' ? 'num' : 'any');
      case 'se_answer': return E('tra_loi', 'str');
      case 'se_timer': flags.time = true; flags.timer = true; return E('round(time.time() - bat_dau, 2)', 'num');
      case 'se_touch': return placeholder('False', 'bool', `chạm ${b.args.TARGET === '_edge_' ? 'cạnh' : b.args.TARGET === '_mouse_' ? 'con trỏ chuột' : b.args.TARGET}?`, notes);
      case 'se_key': return placeholder('False', 'bool', `phím ${(KEY_OPTIONS.find((k) => k[0] === b.args.KEY) || [0, b.args.KEY])[1]} được nhấn?`, notes);
      case 'se_mouse_down': return placeholder('False', 'bool', 'chuột được nhấn?', notes);
      case 'se_mouse_x': return placeholder('0', 'num', 'chuột x', notes);
      case 'se_mouse_y': return placeholder('0', 'num', 'chuột y', notes);
      case 'se_distance': return placeholder('0', 'num', 'khoảng cách', notes);
      case 'mo_x': return placeholder('0', 'num', 'vị trí x', notes);
      case 'mo_y': return placeholder('0', 'num', 'vị trí y', notes);
      case 'mo_dir': return placeholder('90', 'num', 'hướng', notes);
      case 'lo_costume_num': return placeholder('1', 'num', 'số trang phục', notes);
      case 'lo_size': return placeholder('100', 'num', 'kích thước', notes);
      case 'so_volume': return placeholder('100', 'num', 'âm lượng', notes);
      default: return E('None', 'any');
    }
  }

  // ---- human description of a block (for comments)
  function describe(b) {
    const spec = SPECS[b.op];
    if (!spec) return b.op;
    return spec.rows[0].replace(/@[a-z-]+/g, (g) => ({ '@turn-right': '↻', '@turn-left': '↺', '@flag': 'cờ xanh', '@stop': '' }[g] ?? '')).replace(/%([A-Z0-9]+)/g, (_, name) => {
      const v = b.args?.[name];
      const a = spec.args?.[name];
      if (v && typeof v === 'object') return `(${exprRaw(v, null).code})`;
      if (a?.type === 'dd') {
        if (a.menu === 'backdrops') return `[${BACKDROPS[v]?.name || v}]`;
        if (a.menu === 'keys') return `[${(KEY_OPTIONS.find((k) => k[0] === v) || [0, v])[1]}]`;
        if (a.menu === 'math') return `[${(MATH_OPTIONS.find((k) => k[0] === v) || [0, v])[1]}]`;
        if (v === '_mouse_') return '[con trỏ chuột]';
        if (v === '_edge_') return '[cạnh]';
        return `[${v}]`;
      }
      return String(v ?? '');
    }).replace(/\s+/g, ' ').trim();
  }

  // ---- statements
  const IND = '    ';
  function stmts(list, depth, ctx) {
    const out = [];
    for (const b of list || []) out.push(...stmt(b, depth, ctx));
    if (!out.some((l) => !l.trim().startsWith('#'))) out.push(IND.repeat(depth) + 'pass');
    return out;
  }
  function stmt(b, depth, ctx) {
    const p = IND.repeat(depth);
    const notes = [];
    const lines = [];
    const spec = SPECS[b.op];
    const comment = (cat) => [`${p}# [${CATEGORY_NAMES[cat] || cat}] ${describe(b)}`];
    const body = (key) => stmts(b.stacks?.[key], depth + 1, ctx);
    const emit = (...ls) => { for (const n of notes) lines.push(`${p}# Lưu ý: ${n}`); lines.push(...ls); return lines; };
    if (!spec) return [];
    switch (b.op) {
      case 'lo_say': case 'lo_think': return emit(`${p}print(${arg(b, 'MSG', notes).code})`);
      case 'lo_say_for': case 'lo_think_for': {
        flags.time = true;
        const msg = arg(b, 'MSG', notes).code; const secs = asNum(arg(b, 'SECS', notes)).code;
        return emit(`${p}print(${msg})`, `${p}time.sleep(${secs})`);
      }
      case 'se_ask': ctx.globals.add('tra_loi'); return emit(`${p}tra_loi = input(${asStr(arg(b, 'Q', notes)).code} + " ")`);
      case 'se_reset_timer': flags.time = true; flags.timer = true; ctx.globals.add('bat_dau'); return emit(`${p}bat_dau = time.time()`);
      case 'va_set': { const id = vid(b.args.VAR); ctx.globals.add(id); const val = arg(b, 'VAL', notes); return emit(`${p}${id} = ${varTypes.get(b.args.VAR) === 'num' ? asNum(val).code : val.code}`); }
      case 'va_change': {
        const id = vid(b.args.VAR); ctx.globals.add(id);
        const val = asNum(arg(b, 'VAL', notes)).code;
        if (varTypes.get(b.args.VAR) === 'num') return emit(`${p}${id} += ${val}`);
        flags.so = true;
        return emit(`${p}${id} = so(${id}) + ${val}`);
      }
      case 'ct_wait': flags.time = true; return emit(`${p}time.sleep(${asNum(arg(b, 'SECS', notes)).code})`);
      case 'ct_repeat': {
        const t = arg(b, 'TIMES', notes);
        const n = t.type === 'num' && /^-?\d+$/.test(t.code) ? t.code : `round(${asNum(t).code})`;
        return emit(`${p}for _ in range(${n}):`, ...body('S1'));
      }
      case 'ct_forever': return emit(`${p}while True:  # lặp lại mãi mãi`, ...body('S1'));
      case 'ct_if': return emit(`${p}if ${arg(b, 'COND', notes).code}:`, ...body('S1'));
      case 'ct_if_else': return emit(`${p}if ${arg(b, 'COND', notes).code}:`, ...body('S1'), `${p}else:`, ...body('S2'));
      case 'ct_repeat_until': return emit(`${p}while not ${wrap(arg(b, 'COND', notes), 3)}:`, ...body('S1'));
      case 'ct_wait_until': return [`${p}# [Điều khiển] ${describe(b)} — Python thuần không có sự kiện để chờ nên khối này được bỏ qua`];
      case 'ct_stop': return emit(`${p}raise SystemExit  # dừng tất cả`);
      case 'ev_broadcast': case 'ev_broadcast_wait': {
        const fns = handlers.get(b.args.MSG) || [];
        if (!fns.length) return [`${p}# [Sự kiện] phát tin nhắn [${b.args.MSG}] — chưa có kịch bản nào nhận tin nhắn này`];
        return [`${p}# phát tin nhắn [${b.args.MSG}] = gọi các hàm nhận tin nhắn`, ...fns.map((fn) => `${p}${fn}()`)];
      }
      case 'va_show': case 'va_hide': return comment('variables');
      default:
        if (['reporter', 'boolean'].includes(spec.shape)) return [`${p}# (khối giá trị đứng riêng: ${describe(b)})`];
        return comment(spec.cat);
    }
  }

  // ---- assemble
  const header = [
    `# Mã Python được tạo từ Xưởng khối — dự án “${String(project.name).replace(/[\r\n]/g, ' ')}”`,
    '# Python không có sân khấu: các khối Chuyển động, Hiển thị (trừ “nói/nghĩ”), Âm thanh và Bút vẽ',
    '# được ghi thành chú thích. Khối “nói” trở thành print(), “hỏi và đợi” trở thành input().',
  ];
  const fnBlocks = [];
  const mainLines = [];
  const handlerOrder = [];
  for (const sp of project.sprites) for (const sc of sp.scripts) if (sc._fn) handlerOrder.push({ sp, sc });
  for (const { sp, sc } of handlerOrder) {
    const ctx = { globals: new Set() };
    const bodyLines = stmts(sc.blocks.slice(1), 1, ctx);
    const hat = sc.blocks[0];
    const why = hat.op === 'ev_msg' ? `khi nhận tin nhắn [${hat.args.MSG}]`
      : hat.op === 'ev_key' ? `khi nhấn phím [${(KEY_OPTIONS.find((k) => k[0] === hat.args.KEY) || [0, hat.args.KEY])[1]}] — Python không bắt được phím, hàm này không tự chạy`
        : 'khi bấm vào nhân vật — Python không có chuột trên sân khấu, hàm này không tự chạy';
    const lines = [`# Nhân vật “${sp.name}”: ${why}`, `def ${sc._fn}():`];
    const gl = [...ctx.globals].filter(Boolean);
    if (gl.length) lines.push(`${IND}global ${gl.join(', ')}`);
    lines.push(...bodyLines);
    fnBlocks.push(lines.join('\n'));
  }
  let flagCount = 0;
  for (const sp of project.sprites) {
    for (const sc of sp.scripts) {
      if (sc.blocks[0]?.op !== 'ev_flag') continue;
      flagCount++;
      const ctx = { globals: new Set() };
      mainLines.push(`# Nhân vật “${sp.name}”: khi bấm cờ xanh`);
      mainLines.push(...stmts(sc.blocks.slice(1), 0, ctx));
      mainLines.push('');
    }
  }
  for (const sp of project.sprites) for (const sc of sp.scripts) delete sc._fn;
  if (!flagCount) mainLines.push('# (Chưa có kịch bản “khi bấm cờ xanh” nên phần chính đang trống)', 'pass');

  const imports = [];
  if (flags.math) imports.push('import math');
  if (flags.random) imports.push('import random');
  if (flags.time) imports.push('import time');
  const prelude = [];
  if (flags.so) {
    prelude.push(
      'def so(x):',
      '    """Đổi giá trị sang số giống Scratch (chữ không phải số thành 0)."""',
      '    try:',
      '        n = float(x)',
      '    except (TypeError, ValueError):',
      '        return 0',
      '    return int(n) if n.is_integer() else n',
    );
  }
  const varLines = ['# Biến (dùng chung cho mọi nhân vật)'];
  for (const v of project.variables) {
    const val = typeof v.value === 'number' ? String(v.value) : (isNumLit(String(v.value)) ? numLit(v.value) : pyStr(v.value));
    varLines.push(`${vid(v.name)} = ${varTypes.get(v.name) === 'num' && !isNumLit(String(v.value)) ? '0' : val}`);
  }
  if (mainLines.some((l) => /\btra_loi\b/.test(l)) || fnBlocks.some((f) => /\btra_loi\b/.test(f))) varLines.push('tra_loi = ""');
  if (flags.timer) varLines.push('bat_dau = time.time()');

  const parts = [header.join('\n')];
  if (imports.length) parts.push(imports.join('\n'));
  if (prelude.length) parts.push(prelude.join('\n'));
  if (varLines.length > 1) parts.push(varLines.join('\n'));
  if (fnBlocks.length) parts.push(fnBlocks.join('\n\n\n'));
  parts.push(['# ===== Chương trình chính =====', ...mainLines].join('\n').trimEnd());
  return `${parts.join('\n\n\n')}\n`;
}
