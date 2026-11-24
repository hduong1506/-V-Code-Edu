// V-Code Edu — static checks ("Kiểm tra lỗi mã nguồn"), restored and improved from the legacy analyzePythonCode.
// analyzeCode(code, lang) → [{ line, col?, endCol?, severity: 'error'|'warning'|'info', title, detail, hint? }]
// Every check is conservative: anything that is only a guess is reported as a warning or a hint, never as an error.

const words = (s) => new Set(s.split(/\s+/).filter(Boolean));

const PY_KEYWORDS = words('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield');
const PY_BUILTINS = words(`abs aiter all anext any ascii bin bool breakpoint bytearray bytes callable chr classmethod compile complex delattr dict dir divmod enumerate eval exec
  filter float format frozenset getattr globals hasattr hash help hex id input int isinstance issubclass iter len list locals map max memoryview min next object oct open ord pow
  print property range repr reversed round set setattr slice sorted staticmethod str sum super tuple type vars zip __import__ __name__ __file__ __doc__ __builtins__ NotImplemented Ellipsis
  exit quit copyright credits license BaseException Exception ArithmeticError AssertionError AttributeError EOFError FloatingPointError GeneratorExit ImportError ModuleNotFoundError
  IndexError KeyError KeyboardInterrupt LookupError MemoryError NameError NotImplementedError OSError OverflowError RecursionError ReferenceError RuntimeError StopIteration
  StopAsyncIteration SyntaxError IndentationError TabError SystemError SystemExit TypeError UnboundLocalError UnicodeError UnicodeDecodeError UnicodeEncodeError ValueError
  ZeroDivisionError FileNotFoundError FileExistsError PermissionError TimeoutError ConnectionError IsADirectoryError Warning UserWarning DeprecationWarning RuntimeWarning
  match case _`);
const PY_BLOCK = words('if elif else for while def class try except finally with async');
const SMART = /[“”‘’– ]/;

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

/** Closest candidate within distance 2 (case-insensitive bonus), or ''. */
export function closest(name, candidates) {
  let best = '';
  let bestD = 3;
  for (const c of candidates) {
    if (c === name || c.length < 2) continue;
    const d = c.toLowerCase() === name.toLowerCase() ? 0.5 : levenshtein(name, c);
    if (d < bestD && d <= (name.length <= 3 ? 1 : 2)) { best = c; bestD = d; }
  }
  return best;
}

// ------------------------------------------------------------------ Python
function tokenizePython(src) {
  const tokens = [];
  const issues = [];
  const stack = [];
  let i = 0;
  let line = 1;
  let col = 1;
  const n = src.length;
  const adv = (k = 1) => { for (let t = 0; t < k; t++) { if (src[i] === '\n') { line += 1; col = 1; } else col += 1; i += 1; } };
  while (i < n) {
    const ch = src[i];
    if (ch === '\n') { tokens.push({ t: 'nl', v: '\n', line, col, depth: stack.length }); adv(); continue; }
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\f') { adv(); continue; }
    if (ch === '\\' && src[i + 1] === '\n') { adv(2); continue; }
    if (ch === '#') { while (i < n && src[i] !== '\n') adv(); continue; }
    const pm = /^(?:[rRbBuUfF]{1,2})?("""|'''|"|')/.exec(src.slice(i, i + 5));
    if (pm && (pm[0].length === pm[1].length || /[A-Za-z]/.test(ch))) {
      const sLine = line;
      const sCol = col;
      const prefix = pm[0].slice(0, pm[0].length - pm[1].length);
      const q = pm[1];
      adv(pm[0].length);
      let closed = false;
      while (i < n) {
        if (src[i] === '\\') { adv(2); continue; }
        if (src.startsWith(q, i)) { adv(q.length); closed = true; break; }
        if (q.length === 1 && src[i] === '\n') break;
        adv();
      }
      if (!closed) {
        issues.push(q.length === 3
          ? { line: sLine, col: sCol, severity: 'error', title: 'Chuỗi nhiều dòng chưa được đóng', detail: `Chuỗi bắt đầu bằng ${q} ở dòng ${sLine} chưa có ${q} để kết thúc.`, hint: `Thêm ${q} vào cuối đoạn văn bản.` }
          : { line: sLine, col: sCol, endCol: col, severity: 'error', title: 'Chuỗi chưa đóng dấu nháy', detail: `Thiếu dấu ${q} để kết thúc chuỗi ở dòng ${sLine}.`, hint: `Một chuỗi phải mở và đóng bằng cùng một loại dấu nháy, ví dụ ${q}xin chào${q}.` });
      }
      tokens.push({ t: 'str', v: prefix, line: sLine, col: sCol, depth: stack.length });
      continue;
    }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(?:0[xXbBoO][\w]+|[\d_]*\.?[\d_]+(?:[eE][+-]?\d+)?[jJ]?)/.exec(src.slice(i, i + 40));
      tokens.push({ t: 'num', v: m[0], line, col, depth: stack.length });
      adv(m[0].length || 1);
      continue;
    }
    if (/[A-Za-z_À-ỹ]/.test(ch)) {
      const m = /^[A-Za-z_À-ỹ][\wÀ-ỹ]*/.exec(src.slice(i, i + 80));
      tokens.push({ t: 'name', v: m[0], line, col, depth: stack.length });
      adv(m[0].length);
      continue;
    }
    if ('([{'.includes(ch)) { stack.push({ ch, line, col }); tokens.push({ t: 'op', v: ch, line, col, depth: stack.length - 1 }); adv(); continue; }
    if (')]}'.includes(ch)) {
      const want = { ')': '(', ']': '[', '}': '{' }[ch];
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, endCol: col + 1, severity: 'error', title: `Thừa dấu đóng '${ch}'`, detail: `Dấu '${ch}' ở dòng ${line} không có dấu mở tương ứng.`, hint: 'Xóa dấu thừa hoặc thêm dấu mở ở vị trí phù hợp.' });
      else if (top.ch !== want) {
        issues.push({ line, col, endCol: col + 1, severity: 'error', title: `Dấu '${ch}' không khớp với '${top.ch}'`, detail: `Dấu '${top.ch}' mở ở dòng ${top.line} nhưng lại được đóng bằng '${ch}' ở dòng ${line}.`, hint: `Đóng '${top.ch}' bằng '${{ '(': ')', '[': ']', '{': '}' }[top.ch]}'.` });
        stack.pop();
      } else stack.pop();
      tokens.push({ t: 'op', v: ch, line, col, depth: stack.length });
      adv();
      continue;
    }
    if (SMART.test(ch)) {
      issues.push({ line, col, endCol: col + 1, severity: 'error', title: `Ký tự không hợp lệ '${ch}'`, detail: `Dòng ${line} có ký tự '${ch}' (thường do sao chép từ Word hoặc trang web).`, hint: ch === ' ' ? 'Thay bằng dấu cách thường.' : 'Thay bằng dấu nháy thẳng " hoặc \' gõ từ bàn phím.' });
      adv();
      continue;
    }
    const om = /^(?:\*\*=|\/\/=|>>=|<<=|->|:=|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|\*\*|\/\/|<<|>>|[+\-*/%@&|^~<>=.,:;!])/.exec(src.slice(i, i + 3));
    if (om) { tokens.push({ t: 'op', v: om[0], line, col, depth: stack.length }); adv(om[0].length); continue; }
    adv();
  }
  for (const s of stack) {
    issues.push({ line: s.line, col: s.col, endCol: s.col + 1, severity: 'error', title: `Dấu '${s.ch}' chưa được đóng`, detail: `Dấu '${s.ch}' mở ở dòng ${s.line} nhưng không có '${{ '(': ')', '[': ']', '{': '}' }[s.ch]}' để đóng.`, hint: 'Đếm lại các cặp ngoặc; mỗi dấu mở cần một dấu đóng.' });
  }
  return { tokens, issues };
}

function analyzePython(code) {
  const src = String(code ?? '').replace(/\r\n?/g, '\n');
  const physical = src.split('\n');
  const { tokens, issues } = tokenizePython(src);

  // Group tokens into logical lines (newline only ends a statement at bracket depth 0).
  const logical = [];
  let cur = [];
  for (const tk of tokens) {
    if (tk.t === 'nl') { if (tk.depth === 0) { if (cur.length) logical.push(cur); cur = []; } continue; }
    cur.push(tk);
  }
  if (cur.length) logical.push(cur);

  let starImport = false;
  const defs = new Map(); // name → first line defined
  const addDef = (name, line) => { if (!defs.has(name) || defs.get(name) > line) defs.set(name, line); };
  const uses = []; // { name, line, col, moduleLevel, inLoop }

  const indentStack = [0];
  const blocks = []; // { kind, indent }
  let expect = null; // { line, indent }
  let mixedWarned = false;

  for (const toks of logical) {
    const first = toks[0];
    const ln = first.line;
    const rawLine = physical[ln - 1] || '';
    const leadWs = (rawLine.match(/^[ \t]*/) || [''])[0];
    if (!mixedWarned && /\t/.test(leadWs) && / /.test(leadWs)) {
      mixedWarned = true;
      issues.push({ line: ln, severity: 'warning', title: 'Trộn lẫn phím Tab và dấu cách', detail: `Dòng ${ln} thụt lề bằng cả Tab và dấu cách, Python có thể báo TabError.`, hint: 'Dùng "Định dạng mã" (Shift+Alt+F) để đổi Tab thành 4 dấu cách.' });
    }
    const indent = leadWs.replace(/\t/g, '    ').length;

    // ---- indentation structure
    if (expect) {
      if (indent <= expect.indent) {
        issues.push({ line: ln, severity: 'error', title: 'Thiếu thụt lề (IndentationError)', detail: `Dòng ${ln} phải thụt vào so với dòng ${expect.line} vì dòng ${expect.line} kết thúc bằng dấu ':'.`, hint: 'Nhấn Tab ở đầu dòng để thụt lề (4 dấu cách).' });
      } else indentStack.push(indent);
      expect = null;
    } else if (indent > indentStack[indentStack.length - 1]) {
      issues.push({ line: ln, severity: 'error', title: 'Thụt lề thừa (unexpected indent)', detail: `Dòng ${ln} bị thụt vào nhưng dòng trước không mở khối lệnh mới.`, hint: 'Xóa bớt khoảng trắng ở đầu dòng cho thẳng hàng với dòng phía trên.' });
    } else if (indent < indentStack[indentStack.length - 1]) {
      while (indentStack.length > 1 && indentStack[indentStack.length - 1] > indent) indentStack.pop();
      if (indentStack[indentStack.length - 1] !== indent) {
        issues.push({ line: ln, severity: 'error', title: 'Thụt lề không khớp', detail: `Mức thụt lề của dòng ${ln} không khớp với khối lệnh nào phía trên.`, hint: 'Căn dòng này thẳng hàng với khối lệnh mà nó thuộc về.' });
        indentStack.push(indent);
      }
    }
    while (blocks.length && blocks[blocks.length - 1].indent >= indent) blocks.pop();
    const inDef = blocks.some((b) => b.kind === 'def' || b.kind === 'class' || b.kind === 'lambda');
    let inLoop = false;
    for (let b = blocks.length - 1; b >= 0; b--) {
      if (blocks[b].kind === 'def' || blocks[b].kind === 'class') break;
      if (blocks[b].kind === 'for' || blocks[b].kind === 'while') { inLoop = true; break; }
    }
    const anyLoop = blocks.some((b) => b.kind === 'for' || b.kind === 'while');

    // ---- statement shape
    const kw = first.t === 'name' ? first.v : '';
    const kw2 = kw === 'async' && toks[1] ? toks[1].v : kw;
    const top = toks.filter((t) => t.depth === 0);
    const topColons = top.filter((t) => t.t === 'op' && t.v === ':');
    const last = toks[toks.length - 1];
    const isBlock = PY_BLOCK.has(kw) && !(kw === 'async' && !['def', 'for', 'with'].includes(kw2));
    if (kw === 'else' && toks[1]?.v === 'if') {
      issues.push({ line: ln, col: first.col, endCol: toks[1].col + 2, severity: 'error', title: 'Viết "else if" thay vì "elif"', detail: `Python không có "else if" trên cùng một dòng (dòng ${ln}).`, hint: 'Viết elif <điều kiện>:' });
    } else if (isBlock && !topColons.length) {
      issues.push({ line: ln, col: last.col, endCol: last.col + String(last.v).length, severity: 'error', title: 'Thiếu dấu hai chấm (:)', detail: `Câu lệnh "${kw2}" ở dòng ${ln} phải kết thúc bằng dấu ':'.`, hint: `Thêm dấu ':' vào cuối dòng ${ln}.` });
    }
    const endsWithColon = last.t === 'op' && last.v === ':' && last.depth === 0;
    if (endsWithColon && (isBlock || ['match', 'case'].includes(kw))) {
      expect = { line: ln, indent };
      blocks.push({ kind: kw2 === 'def' ? 'def' : kw2, indent });
    }
    if (['if', 'elif', 'while'].includes(kw)) {
      const eq = top.find((t) => t.t === 'op' && t.v === '=');
      if (eq) issues.push({ line: ln, col: eq.col, endCol: eq.col + 1, severity: 'error', title: 'Dùng "=" trong điều kiện', detail: `Ở dòng ${ln}, "=" là phép gán. Để so sánh bằng phải dùng "==".`, hint: 'Đổi = thành ==' });
    }
    if (kw === 'print' && toks[1] && (toks[1].t === 'str' || toks[1].t === 'name' || toks[1].t === 'num')) {
      issues.push({ line: ln, col: first.col, endCol: first.col + 5, severity: 'error', title: 'print là một hàm trong Python 3', detail: `Dòng ${ln} viết kiểu Python 2 (print không có dấu ngoặc).`, hint: 'Viết print(...) với dấu ngoặc tròn.' });
    }
    if ((kw === 'return' || kw === 'yield') && !blocks.some((b) => b.kind === 'def')) {
      issues.push({ line: ln, col: first.col, endCol: first.col + kw.length, severity: 'error', title: `"${kw}" nằm ngoài hàm`, detail: `Lệnh ${kw} ở dòng ${ln} chỉ được dùng bên trong một hàm (def).`, hint: 'Thụt lệnh vào trong thân hàm, hoặc dùng print() nếu muốn in kết quả.' });
    }
    if ((kw === 'break' || kw === 'continue') && !inLoop) {
      issues.push({ line: ln, col: first.col, endCol: first.col + kw.length, severity: 'error', title: `"${kw}" nằm ngoài vòng lặp`, detail: `Lệnh ${kw} ở dòng ${ln} chỉ dùng được bên trong vòng lặp for hoặc while.`, hint: 'Kiểm tra lại thụt lề: lệnh này phải nằm trong thân vòng lặp.' });
    }

    // ---- definitions
    if (kw === 'import') {
      let group = [];
      const flush = () => {
        const asAt = group.findIndex((x) => x.v === 'as');
        if (asAt >= 0 && group[asAt + 1]) addDef(group[asAt + 1].v, ln);
        else if (group[0]?.t === 'name') addDef(group[0].v, ln);
        group = [];
      };
      toks.slice(1).forEach((t) => { if (t.v === ',') flush(); else group.push(t); });
      flush();
      continue;
    }
    if (kw === 'from') {
      const imp = toks.findIndex((t) => t.v === 'import');
      for (let k = imp + 1; k > 0 && k < toks.length; k++) {
        const t = toks[k];
        if (t.v === '*') { starImport = true; break; }
        if (t.t !== 'name' || t.v === 'as') continue;
        if (toks[k + 1]?.v === 'as') continue;
        addDef(t.v, ln);
      }
      continue;
    }
    if (kw === 'global' || kw === 'nonlocal') { toks.slice(1).forEach((t) => { if (t.t === 'name') addDef(t.v, 0); }); continue; }
    const defIdx = kw2 === 'def' ? (kw === 'async' ? 1 : 0) : -1;
    const paramSet = new Set();
    if (defIdx >= 0 && toks[defIdx + 1]) {
      addDef(toks[defIdx + 1].v, ln);
      // parameters: names at depth 1 directly after "(" "," "*" "**" — default values are uses
      for (let k = defIdx + 2; k < toks.length; k++) {
        const t = toks[k];
        const p = toks[k - 1];
        if (t.t === 'name' && t.depth === 1 && p && ['(', ',', '*', '**'].includes(p.v)) { paramSet.add(k); addDef(t.v, ln); }
      }
    }
    if (kw === 'class' && toks[1]) addDef(toks[1].v, ln);
    toks.forEach((t, k) => {
      if (t.t !== 'name') return;
      const p = toks[k - 1];
      if ((t.v === 'as') && toks[k + 1]?.t === 'name') addDef(toks[k + 1].v, ln);
      if (t.v === 'for') {
        for (let j = k + 1; j < toks.length && toks[j].v !== 'in'; j++) if (toks[j].t === 'name') addDef(toks[j].v, ln);
      }
      if (t.v === 'lambda') {
        for (let j = k + 1; j < toks.length && toks[j].v !== ':'; j++) if (toks[j].t === 'name' && ['lambda', ',', '*', '**'].includes(toks[j - 1].v)) addDef(toks[j].v, ln);
      }
      if (toks[k + 1]?.v === ':=') addDef(t.v, ln);
      void p;
    });
    // assignment targets: names before a top-level "=" / augmented assignment / annotation
    let assignIdx = toks.findIndex((t) => t.depth === 0 && t.t === 'op' && /^(?:=|\+=|-=|\*=|\/=|\/\/=|%=|\*\*=|&=|\|=|\^=|>>=|<<=)$/.test(t.v));
    if (assignIdx >= 0 && toks[assignIdx].v === '=') { // chained a = b = 0 → every name before the last "=" is a target
      for (let k = toks.length - 1; k > assignIdx; k--) if (toks[k].depth === 0 && toks[k].v === '=') { assignIdx = k; break; }
    }
    const annIdx = !isBlock && toks[1]?.v === ':' && toks[0].t === 'name' ? 1 : -1;
    const targetEnd = assignIdx >= 0 ? assignIdx : annIdx;
    if (targetEnd > 0) {
      for (let k = 0; k < targetEnd; k++) {
        const t = toks[k];
        if (t.t !== 'name' || PY_KEYWORDS.has(t.v)) continue;
        if (toks[k - 1]?.v === '.') continue;
        const tupleTarget = t.depth === 1 && (toks[0].v === '(' || toks[0].v === '[');
        if (t.depth !== 0 && !tupleTarget) continue;
        const next = toks[k + 1];
        if (next && (next.v === '[' || next.v === '.' || next.v === '(')) continue; // a[i] = …, obj.x = …
        if (assignIdx >= 0 && toks[assignIdx].v !== '=' && annIdx < 0) continue; // x += 1 needs x already
        addDef(t.v, ln);
      }
    }

    // ---- uses
    toks.forEach((t, k) => {
      if (t.t !== 'name' || PY_KEYWORDS.has(t.v) || PY_BUILTINS.has(t.v)) return;
      const p = toks[k - 1];
      const nx = toks[k + 1];
      if (p && p.v === '.') return; // attribute
      if (paramSet.has(k)) return;
      if (defIdx >= 0 && k === defIdx + 1) return;
      if (kw === 'class' && k === 1) return;
      if (nx && nx.v === '=' && t.depth > 0) return; // keyword argument f(end="")
      if (p && p.v === 'as') return;
      if (targetEnd > 0 && k < targetEnd && (t.depth === 0 || (t.depth === 1 && (toks[0].v === '(' || toks[0].v === '['))) && (annIdx > 0 || toks[assignIdx]?.v === '=') && !(nx && (nx.v === '[' || nx.v === '.'))) return;
      if (kw === 'except' && p?.v === 'as') return;
      uses.push({ name: t.v, line: ln, col: t.col, moduleLevel: !inDef, inLoop: anyLoop });
    });
  }
  if (expect) {
    issues.push({ line: expect.line, severity: 'error', title: 'Khối lệnh chưa có thân', detail: `Dòng ${expect.line} kết thúc bằng ':' nhưng chưa có lệnh nào thụt vào bên dưới.`, hint: 'Viết ít nhất một lệnh thụt lề bên dưới, hoặc dùng pass nếu chưa viết gì.' });
  }

  if (!starImport) {
    const reported = new Set();
    // words inside “curly quotes” are text, not names: the invalid-character error already covers that line
    const smartLines = new Set(issues.filter((i) => i.title.startsWith('Ký tự không hợp lệ')).map((i) => i.line));
    for (let k = uses.length - 1; k >= 0; k--) if (smartLines.has(uses[k].line)) uses.splice(k, 1);
    const candidates = [...defs.keys(), ...PY_BUILTINS];
    for (const u of uses) {
      if (!defs.has(u.name)) {
        if (reported.has(u.name)) continue;
        reported.add(u.name);
        const guess = closest(u.name, candidates);
        issues.push({ line: u.line, col: u.col, endCol: u.col + u.name.length, severity: 'error', title: `Tên '${u.name}' chưa được định nghĩa`, detail: `Dòng ${u.line} dùng '${u.name}' nhưng chương trình chưa từng gán giá trị hay định nghĩa tên này (sẽ gây NameError).`, hint: guess ? `Có phải ý em là '${guess}'?` : `Hãy gán giá trị trước khi dùng, ví dụ: ${u.name} = int(input())` });
      } else if (u.moduleLevel && !u.inLoop && defs.get(u.name) > u.line) {
        const key = `late:${u.name}`;
        if (reported.has(key)) continue;
        reported.add(key);
        issues.push({ line: u.line, col: u.col, endCol: u.col + u.name.length, severity: 'warning', title: `Dùng '${u.name}' trước khi gán`, detail: `'${u.name}' được dùng ở dòng ${u.line} nhưng tới dòng ${defs.get(u.name)} mới được gán / định nghĩa.`, hint: 'Python chạy từ trên xuống: hãy đưa lệnh gán (hoặc def) lên trước chỗ sử dụng.' });
      }
    }
  }
  return issues;
}

// ------------------------------------------------------------------ C-like scanning (C, C++, JavaScript, CSS)
function scanBrackets(src, { lineComments = true, templates = false, chars = false } = {}) {
  const issues = [];
  const stack = [];
  const code = []; // per-line code with strings blanked & comments removed
  let line = 1;
  let col = 1;
  let buf = '';
  let mode = null; // 'block' | 'tpl' | quote char
  let quoteStart = null;
  const pairs = { '(': ')', '[': ']', '{': '}' };
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    const nx = src[i + 1];
    if (ch === '\n') {
      if (mode === '"' || (mode === "'" && !chars)) {
        if (mode === '"' || mode === "'") issues.push({ line: quoteStart.line, col: quoteStart.col, endCol: col, severity: 'error', title: 'Chuỗi chưa đóng dấu nháy', detail: `Chuỗi bắt đầu ở dòng ${quoteStart.line} chưa có dấu ${mode} kết thúc.`, hint: `Thêm ${mode} vào cuối chuỗi.` });
        mode = null;
      } else if (mode === "'" && chars) {
        issues.push({ line: quoteStart.line, col: quoteStart.col, severity: 'error', title: 'Ký tự chưa đóng dấu nháy đơn', detail: `Thiếu dấu ' kết thúc ở dòng ${quoteStart.line}.`, hint: "Ký tự đơn viết trong cặp nháy đơn, ví dụ 'a'." });
        mode = null;
      }
      code.push(buf); buf = ''; line += 1; col = 1;
      continue;
    }
    if (mode === 'block') { if (ch === '*' && nx === '/') { mode = null; i += 1; col += 1; } col += 1; continue; }
    if (mode === 'tpl') { if (ch === '\\') { i += 1; col += 2; continue; } if (ch === '`') mode = null; col += 1; continue; }
    if (mode) { if (ch === '\\') { i += 1; col += 2; buf += '  '; continue; } if (ch === mode) { mode = null; buf += ch; } else buf += ' '; col += 1; continue; }
    if (ch === '/' && nx === '*') { mode = 'block'; i += 1; col += 2; continue; }
    if (lineComments && ch === '/' && nx === '/') { while (i + 1 < src.length && src[i + 1] !== '\n') i += 1; continue; }
    if (ch === '"' || ch === "'") { mode = ch; quoteStart = { line, col }; buf += ch; col += 1; continue; }
    if (templates && ch === '`') { mode = 'tpl'; buf += '``'; col += 1; continue; }
    if (pairs[ch]) stack.push({ ch, line, col });
    else if (ch === ')' || ch === ']' || ch === '}') {
      const top = stack[stack.length - 1];
      if (!top) issues.push({ line, col, endCol: col + 1, severity: 'error', title: `Thừa dấu đóng '${ch}'`, detail: `Dấu '${ch}' ở dòng ${line} không có dấu mở tương ứng.`, hint: 'Xóa dấu thừa hoặc thêm dấu mở phù hợp.' });
      else if (pairs[top.ch] !== ch) { issues.push({ line, col, endCol: col + 1, severity: 'error', title: `Dấu '${ch}' không khớp với '${top.ch}'`, detail: `Dấu '${top.ch}' mở ở dòng ${top.line} nhưng được đóng bằng '${ch}' ở dòng ${line}.`, hint: `Đóng '${top.ch}' bằng '${pairs[top.ch]}'.` }); stack.pop(); }
      else stack.pop();
    }
    buf += ch;
    col += 1;
  }
  code.push(buf);
  if (mode === 'block') issues.push({ line, severity: 'error', title: 'Chú thích /* chưa được đóng', detail: 'Có một chú thích /* … nhưng thiếu */ ở cuối.', hint: 'Thêm */ để kết thúc chú thích.' });
  if (mode === 'tpl') issues.push({ line, severity: 'error', title: 'Chuỗi ` chưa được đóng', detail: 'Template string bắt đầu bằng ` nhưng chưa có ` kết thúc.', hint: 'Thêm ` để kết thúc chuỗi.' });
  for (const s of stack) issues.push({ line: s.line, col: s.col, endCol: s.col + 1, severity: 'error', title: `Dấu '${s.ch}' chưa được đóng`, detail: `Dấu '${s.ch}' mở ở dòng ${s.line} nhưng thiếu '${pairs[s.ch]}'.`, hint: s.ch === '{' ? 'Mỗi khối { … } cần dấu } đóng ở cuối.' : 'Đếm lại các cặp ngoặc trên dòng này.' });
  return { issues, code };
}

/** Find the condition `( … )` after a keyword at index `from` in a code-only line. Returns {start, end, text} or null. */
function parenGroup(s, from) {
  const open = s.indexOf('(', from);
  if (open < 0) return null;
  let d = 0;
  for (let k = open; k < s.length; k++) {
    if (s[k] === '(') d += 1;
    else if (s[k] === ')') { d -= 1; if (d === 0) return { start: open, end: k, text: s.slice(open + 1, k) }; }
  }
  return null;
}

function conditionChecks(code, issues, lang) {
  code.forEach((s, idx) => {
    const ln = idx + 1;
    const re = /\b(if|while)\s*\(/g;
    let m;
    while ((m = re.exec(s))) {
      const g = parenGroup(s, m.index);
      if (!g) continue;
      // single "=" at depth 0 of the condition
      let d = 0;
      for (let k = 0; k < g.text.length; k++) {
        const c = g.text[k];
        if (c === '(') d += 1; else if (c === ')') d -= 1;
        else if (c === '=' && d === 0 && !/[=!<>+\-*/%&|^]/.test(g.text[k - 1] || '') && g.text[k + 1] !== '=') {
          const colAt = g.start + 2 + k;
          issues.push({ line: ln, col: colAt, endCol: colAt + 1, severity: 'warning', title: 'Dùng "=" (gán) trong điều kiện', detail: `Điều kiện ở dòng ${ln} chứa phép gán "=". Có lẽ em muốn so sánh bằng "==".`, hint: lang === 'javascript' ? 'Dùng === (hoặc ==) để so sánh.' : 'Dùng == để so sánh.' });
          break;
        }
      }
      const after = s.slice(g.end + 1).trim();
      if (after === ';' && !(m[1] === 'while' && /^\s*}/.test(s))) {
        issues.push({ line: ln, severity: 'warning', title: `Dấu ";" ngay sau ${m[1]} (…)`, detail: `Dấu chấm phẩy ở dòng ${ln} làm thân lệnh ${m[1]} bị rỗng; các lệnh phía sau luôn chạy.`, hint: 'Xóa dấu ; ngay sau dấu ngoặc đóng của điều kiện.' });
      }
    }
    const fm = /\bfor\s*\(/.exec(s);
    if (fm) {
      const g = parenGroup(s, fm.index);
      if (g && s.slice(g.end + 1).trim() === ';') issues.push({ line: ln, severity: 'warning', title: 'Dấu ";" ngay sau for (…)', detail: `Vòng lặp ở dòng ${ln} có thân rỗng vì dấu ; ngay sau for (…).`, hint: 'Xóa dấu ; để thân vòng lặp là khối lệnh bên dưới.' });
      if (g && lang !== 'javascript' && g.text.split(';').length !== 3 && !/:/.test(g.text)) issues.push({ line: ln, severity: 'error', title: 'Sai cú pháp vòng lặp for', detail: `Phần trong for (…) ở dòng ${ln} phải có 3 phần ngăn cách bởi 2 dấu chấm phẩy.`, hint: 'Ví dụ: for (int i = 0; i < n; i++)' });
    }
  });
}

const C_STMT = /^(?:return\b|break$|continue$|cout\b|cin\b|cerr\b|printf\s*\(|scanf\s*\(|puts\s*\(|putchar\s*\(|getchar\s*\(|(?:unsigned\s+|signed\s+|const\s+|static\s+)*(?:int|long\s+long|long|short|float|double|char|bool|string|auto|size_t)\s+[A-Za-z_*&][^(]*$|[A-Za-z_][\w.\[\]>-]*\s*(?:=(?!=)|\+=|-=|\*=|\/=|%=|\+\+|--)|(?:\+\+|--)[A-Za-z_]|[A-Za-z_]\w*\s*\([^;{]*\)$)/;
const JSCPP_LIBS = new Set(['iostream', 'cstdio', 'cmath', 'cstring', 'iomanip', 'cctype', 'cstdlib', 'ctime', 'stdio.h', 'math.h', 'string.h', 'ctype.h', 'stdlib.h', 'time.h']);

function missingSemicolons(code, issues, { strict }) {
  for (let idx = 0; idx < code.length; idx++) {
    const s = code[idx].trim();
    if (!s || s.startsWith('#')) continue;
    if (/[;{}:,([\\]$/.test(s) || /(?:<<|>>|\+|-|\*|\/|&&|\|\||\?|=|<|>|!|&|\|)$/.test(s)) continue;
    if (/^(?:if|for|while|switch|else|do|case|default|try|catch|class|struct|namespace|template|function|enum|union)\b/.test(s)) continue;
    if (/^[A-Za-z_][\w\s*&<>:,]*\s+[A-Za-z_]\w*\s*\([^;]*\)\s*(?:const)?$/.test(s) && !/^(?:return|cout|printf)/.test(s)) continue; // function header
    if (!C_STMT.test(s)) continue;
    // continuation on the next line?
    let j = idx + 1;
    while (j < code.length && !code[j].trim()) j += 1;
    const next = (code[j] || '').trim();
    if (/^(?:<<|>>|\.|\?|:|&&|\|\||\+|-|\*|\/|=|\)|,)/.test(next)) continue;
    if (next.startsWith('{') && /\)$/.test(s)) continue;
    issues.push({ line: idx + 1, col: code[idx].length + 1, severity: strict ? 'error' : 'info', title: strict ? 'Thiếu dấu chấm phẩy (;)' : 'Nên kết thúc câu lệnh bằng ;', detail: strict ? `Câu lệnh ở dòng ${idx + 1} cần kết thúc bằng dấu ';'.` : `Dòng ${idx + 1} không có dấu ';'. JavaScript tự chèn được nhưng viết rõ ; giúp tránh lỗi khó thấy.`, hint: `Thêm ; vào cuối dòng ${idx + 1}.` });
  }
}

function analyzeCLike(codeText, lang) {
  const src = String(codeText ?? '').replace(/\r\n?/g, '\n');
  const { issues, code } = scanBrackets(src, { lineComments: true, chars: true });
  conditionChecks(code, issues, lang);
  missingSemicolons(code, issues, { strict: true });
  const all = code.join('\n');
  // includes supported by the in-browser interpreter
  code.forEach((s, idx) => {
    const m = /^\s*#\s*include\s*[<"]([^>"]+)[>"]/.exec(s);
    if (m && !JSCPP_LIBS.has(m[1].trim())) {
      issues.push({ line: idx + 1, severity: 'warning', title: `Trình chạy trên trình duyệt chưa hỗ trợ <${m[1]}>`, detail: `JSCPP (trình thông dịch C/C++ giáo dục) chỉ có iostream, cstdio, cmath, cstring, iomanip, cctype, cstdlib, ctime. Thư viện <${m[1]}> sẽ báo lỗi khi chạy.`, hint: m[1].includes('bits') ? 'Thay bằng các #include cụ thể như <iostream>, <cmath>.' : 'Dùng mảng và tự cài đặt thuật toán thay cho thư viện STL.' });
    }
  });
  if (!/\bmain\s*\(/.test(all) && all.trim()) issues.push({ line: 1, severity: 'warning', title: 'Chưa có hàm main()', detail: 'Chương trình C/C++ bắt đầu chạy từ hàm main().', hint: 'Thêm: int main() { … return 0; }' });
  if (lang === 'cpp' || /\b(cout|cin)\b/.test(all)) {
    const usesStd = /\b(cout|cin|endl|cerr)\b/.test(all.replace(/std::\s*(cout|cin|endl|cerr)/g, ''));
    if (usesStd && !/using\s+namespace\s+std\s*;/.test(all)) {
      const ln = code.findIndex((s) => /\b(cout|cin|endl)\b/.test(s)) + 1;
      issues.push({ line: ln || 1, severity: 'error', title: 'Thiếu "using namespace std;"', detail: 'cout / cin / endl nằm trong không gian tên std.', hint: 'Thêm dòng using namespace std; sau các #include, hoặc viết std::cout.' });
    }
    if (/\b(cout|cin)\b/.test(all) && !/#\s*include\s*<iostream>/.test(src)) issues.push({ line: 1, severity: 'error', title: 'Thiếu #include <iostream>', detail: 'cout và cin được khai báo trong thư viện <iostream>.', hint: 'Thêm #include <iostream> ở đầu chương trình.' });
  }
  if (/\b(printf|scanf)\s*\(/.test(all) && !/#\s*include\s*<(stdio\.h|cstdio)>/.test(src)) issues.push({ line: 1, severity: 'warning', title: 'Thiếu #include <stdio.h>', detail: 'printf / scanf được khai báo trong <stdio.h> (C) hoặc <cstdio> (C++).', hint: 'Thêm #include <stdio.h> ở đầu chương trình.' });
  // scanf("%d", x) without &
  code.forEach((s, idx) => {
    const m = /\bscanf\s*\(\s*"([^"]*)"\s*,(.*)\)/.exec(src.split('\n')[idx] || '');
    if (!m) return;
    const specs = (m[1].match(/%l{0,2}[dfiuc]|%s/g) || []);
    const args = m[2].split(',').map((a) => a.trim());
    args.forEach((a, k) => {
      if (!a || a.startsWith('&') || !/^[A-Za-z_]\w*$/.test(a) || specs[k] === '%s') return;
      if (new RegExp(`\\b${a}\\s*\\[|\\*\\s*${a}\\b`).test(all)) return;
      issues.push({ line: idx + 1, severity: 'warning', title: `scanf thiếu dấu & trước '${a}'`, detail: `scanf cần địa chỉ của biến để ghi giá trị vào (dòng ${idx + 1}).`, hint: `Viết &${a} thay vì ${a}.` });
    });
  });
  return issues;
}

function analyzeJS(codeText) {
  const src = String(codeText ?? '').replace(/\r\n?/g, '\n');
  const { issues, code } = scanBrackets(src, { lineComments: true, templates: true });
  conditionChecks(code, issues, 'javascript');
  missingSemicolons(code, issues, { strict: false });
  if (!issues.some((i) => i.severity === 'error')) {
    try {
      const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
      // Parse only (never executed): catches syntax errors the bracket scan cannot see.
      // eslint-disable-next-line no-new
      new AsyncFunction('console', 'input', 'prompt', 'readline', `"use strict";\n${src}`);
    } catch (err) {
      if (err instanceof SyntaxError) issues.push({ line: 0, severity: 'error', title: 'Lỗi cú pháp JavaScript', detail: err.message, hint: 'Kiểm tra dấu ngoặc, dấu phẩy và từ khóa quanh vị trí vừa sửa.' });
    }
  }
  code.forEach((s, idx) => {
    if (/\bconsole\.(?:log|error|warn)\b/.test(s)) return;
    const m = /\bconsol\w*\.\w+|\bConsole\.\w+|\bconsole\.(?:print|write|logs?)\b(?!\()/.exec(s);
    if (m && !/^console\.log$/.test(m[0])) issues.push({ line: idx + 1, severity: 'warning', title: `Có thể gõ sai "${m[0]}"`, detail: 'Để in ra màn hình trong JavaScript dùng console.log(...).', hint: 'Viết console.log(...)' });
  });
  return issues;
}

const HTML_VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
const HTML_OPTIONAL = new Set(['p', 'li', 'td', 'th', 'tr', 'option', 'dt', 'dd', 'thead', 'tbody', 'tfoot', 'colgroup', 'html', 'head', 'body']);

function analyzeHTML(codeText) {
  const src = String(codeText ?? '').replace(/\r\n?/g, '\n');
  const issues = [];
  const stack = [];
  const lineAt = (pos) => src.slice(0, pos).split('\n').length;
  const re = /<!--[\s\S]*?(?:-->|$)|<(\/?)([A-Za-z][\w:-]*)([^<>]*?)(\/?)(>|(?=<)|$)/g;
  let m;
  while ((m = re.exec(src))) {
    if (m[0].startsWith('<!--')) {
      if (!m[0].endsWith('-->')) issues.push({ line: lineAt(m.index), severity: 'error', title: 'Chú thích <!-- chưa được đóng', detail: 'Thiếu --> để kết thúc chú thích HTML.', hint: 'Thêm --> vào cuối chú thích.' });
      continue;
    }
    const [, close, rawName, attrs, selfClose, end] = m;
    const name = rawName.toLowerCase();
    const ln = lineAt(m.index);
    if (end !== '>') { issues.push({ line: ln, severity: 'error', title: `Thẻ <${close}${rawName}> thiếu dấu >`, detail: `Thẻ ở dòng ${ln} chưa có dấu > để kết thúc.`, hint: 'Thêm > vào cuối thẻ.' }); continue; }
    if (!close && name === 'img' && !/\balt\s*=/.test(attrs)) issues.push({ line: ln, severity: 'info', title: 'Ảnh nên có thuộc tính alt', detail: `Thẻ <img> ở dòng ${ln} không có alt (mô tả ảnh cho người dùng trình đọc màn hình).`, hint: 'Thêm alt="mô tả ngắn".' });
    if (close) {
      if (HTML_VOID.has(name)) continue;
      const idx = stack.map((s) => s.name).lastIndexOf(name);
      if (idx < 0) { issues.push({ line: ln, severity: 'error', title: `Thẻ đóng </${rawName}> thừa`, detail: `Không có thẻ <${rawName}> nào đang mở để đóng ở dòng ${ln}.`, hint: `Xóa </${rawName}> hoặc thêm thẻ mở tương ứng.` }); continue; }
      for (let k = stack.length - 1; k > idx; k--) {
        const s = stack[k];
        if (!HTML_OPTIONAL.has(s.name)) issues.push({ line: s.line, severity: 'error', title: `Thẻ <${s.raw}> chưa được đóng`, detail: `Thẻ <${s.raw}> mở ở dòng ${s.line} nhưng </${rawName}> ở dòng ${ln} lại đóng trước.`, hint: `Thêm </${s.raw}> trước </${rawName}>.` });
      }
      stack.length = idx;
      continue;
    }
    if (selfClose || HTML_VOID.has(name)) continue;
    stack.push({ name, raw: rawName, line: ln });
    if (name === 'script' || name === 'style') {
      const endIdx = src.toLowerCase().indexOf(`</${name}`, re.lastIndex);
      if (endIdx < 0) { issues.push({ line: ln, severity: 'error', title: `Thẻ <${name}> chưa được đóng`, detail: `Thiếu </${name}>.`, hint: `Thêm </${name}>.` }); stack.pop(); break; }
      re.lastIndex = endIdx;
    }
  }
  for (const s of stack) if (!HTML_OPTIONAL.has(s.name)) issues.push({ line: s.line, severity: 'error', title: `Thẻ <${s.raw}> chưa được đóng`, detail: `Thẻ <${s.raw}> mở ở dòng ${s.line} nhưng không có </${s.raw}>.`, hint: `Thêm </${s.raw}> ở vị trí kết thúc nội dung.` });
  return issues;
}

function analyzeCSS(codeText) {
  const src = String(codeText ?? '').replace(/\r\n?/g, '\n');
  const { issues, code } = scanBrackets(src, { lineComments: false });
  let depth = 0;
  code.forEach((s, idx) => {
    const t = s.trim();
    const ln = idx + 1;
    const startDepth = depth;
    for (const ch of s) { if (ch === '{') depth += 1; else if (ch === '}') depth = Math.max(0, depth - 1); }
    if (startDepth === 0 || !t || /[{}]/.test(t) || t.startsWith('@')) return;
    if (!t.includes(':')) { issues.push({ line: ln, severity: 'error', title: 'Khai báo CSS thiếu dấu hai chấm', detail: `Dòng ${ln} phải có dạng thuộc-tính: giá-trị;`, hint: 'Ví dụ: color: red;' }); return; }
    if (!t.endsWith(';')) {
      let j = idx + 1;
      while (j < code.length && !code[j].trim()) j += 1;
      if (j < code.length && !code[j].trim().startsWith('}')) issues.push({ line: ln, col: s.length + 1, severity: 'warning', title: 'Thiếu dấu chấm phẩy (;)', detail: `Khai báo ở dòng ${ln} chưa có dấu ';' nên khai báo tiếp theo sẽ bị bỏ qua.`, hint: `Thêm ; vào cuối dòng ${ln}.` });
    }
  });
  return issues;
}

const SQL_STATEMENTS = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'DROP', 'ALTER', 'WITH', 'PRAGMA', 'BEGIN', 'COMMIT', 'REPLACE', 'ROLLBACK', 'EXPLAIN'];
const SQL_CLAUSES = ['FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'JOIN', 'VALUES', 'INTO', 'SET', 'TABLE', 'SELECT', 'DISTINCT', 'INNER', 'LEFT', 'OFFSET', 'UNION'];

function analyzeSQL(codeText) {
  const src = String(codeText ?? '').replace(/\r\n?/g, '\n');
  const issues = [];
  const lines = src.split('\n');
  let depth = 0;
  let quote = null;
  let qLine = 0;
  let stmtStart = true;
  lines.forEach((raw, idx) => {
    const ln = idx + 1;
    let s = '';
    for (let k = 0; k < raw.length; k++) {
      const ch = raw[k];
      if (quote) { if (ch === quote) { if (raw[k + 1] === quote) { k += 1; continue; } quote = null; } s += ' '; continue; }
      if (ch === '-' && raw[k + 1] === '-') break;
      if (ch === "'" || ch === '"') { quote = ch; qLine = ln; s += ' '; continue; }
      if (ch === '(') depth += 1;
      if (ch === ')') { depth -= 1; if (depth < 0) { issues.push({ line: ln, col: k + 1, severity: 'error', title: "Thừa dấu ')'", detail: `Dấu ')' ở dòng ${ln} không có '(' tương ứng.`, hint: 'Xóa dấu thừa.' }); depth = 0; } }
      s += ch;
    }
    const wordsIn = s.match(/[A-Za-z_]\w*/g) || [];
    let skipFirst = false;
    if (stmtStart && wordsIn.length) {
      skipFirst = true;
      const w = wordsIn[0].toUpperCase();
      if (!SQL_STATEMENTS.includes(w)) {
        const g = closest(w, SQL_STATEMENTS);
        issues.push({ line: ln, severity: g ? 'error' : 'warning', title: g ? `Có thể gõ sai từ khóa "${wordsIn[0]}"` : `Câu lệnh SQL bắt đầu bằng "${wordsIn[0]}"`, detail: g ? `Câu lệnh ở dòng ${ln} nên bắt đầu bằng ${g}.` : 'Câu lệnh SQL thường bắt đầu bằng SELECT, INSERT, UPDATE, DELETE, CREATE…', hint: g ? `Sửa thành ${g}.` : 'Kiểm tra lại từ khóa đầu câu lệnh.' });
      }
      stmtStart = false;
    }
    wordsIn.forEach((w, wi) => {
      if (wi === 0 && skipFirst) return;
      const W = w.toUpperCase();
      if (W.length < 4 || SQL_CLAUSES.includes(W) || SQL_STATEMENTS.includes(W)) return;
      const g = closest(W, ['FROM', 'WHERE', 'GROUP', 'ORDER', 'HAVING', 'LIMIT', 'VALUES', 'SELECT', 'DISTINCT']);
      const anagram = g && [...W].sort().join('') === [...g].sort().join('');
      if (g && (levenshtein(W, g) === 1 || anagram) && /^[A-Z]+$/.test(w)) issues.push({ line: ln, severity: 'warning', title: `Có thể gõ sai "${w}"`, detail: `"${w}" trông giống từ khóa ${g}.`, hint: `Sửa thành ${g} nếu đó là từ khóa.` });
    });
    if (s.includes(';')) stmtStart = !s.slice(s.lastIndexOf(';') + 1).trim();
  });
  if (quote) issues.push({ line: qLine, severity: 'error', title: 'Chuỗi chưa đóng dấu nháy', detail: `Thiếu dấu ${quote} kết thúc chuỗi bắt đầu ở dòng ${qLine}.`, hint: "Chuỗi trong SQL viết trong cặp nháy đơn, ví dụ 'Hà Nội'." });
  if (depth > 0) issues.push({ line: lines.length, severity: 'error', title: "Thiếu dấu ')'", detail: 'Số dấu ( nhiều hơn số dấu ).', hint: 'Đóng đủ các dấu ngoặc.' });
  return issues;
}

/** Static analysis for a language. pyvn code must already be translated to Python (see analyzeCodeAsync). */
export function analyzeCode(code, lang) {
  if (!String(code ?? '').trim()) return [];
  let res = [];
  try {
    switch (lang) {
      case 'python': case 'pyvn': res = analyzePython(code); break;
      case 'c': case 'cpp': res = analyzeCLike(code, lang); break;
      case 'javascript': res = analyzeJS(code); break;
      case 'html': res = analyzeHTML(code); break;
      case 'css': res = analyzeCSS(code); break;
      case 'sql': res = analyzeSQL(code); break;
      default: res = [];
    }
  } catch (err) {
    console.warn('[diagnostics] analyzer failed', err);
    res = [];
  }
  const seen = new Set();
  const order = { error: 0, warning: 1, info: 2 };
  return res.filter((i) => { const k = `${i.line}|${i.title}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .sort((a, b) => (a.line || 1e9) - (b.line || 1e9) || order[a.severity] - order[b.severity]);
}

/** Like analyzeCode, but translates Python Tiếng Việt first (keywords mapped, line numbers preserved). */
export async function analyzeCodeAsync(code, lang) {
  if (lang === 'pyvn') {
    try {
      const { translatePyvn } = await import('../../runtime/pyvn.js');
      return analyzeCode(await translatePyvn(code), 'python');
    } catch { return analyzeCode(code, 'python').filter((i) => !/chưa được định nghĩa/.test(i.title)); }
  }
  return analyzeCode(code, lang);
}

/** Identifiers in a document (for autocomplete and "did you mean"). */
export function documentIdentifiers(code) {
  const out = new Set();
  const re = /[A-Za-z_À-ỹ][\wÀ-ỹ]{1,}/g;
  let m;
  const src = String(code ?? '').slice(0, 200000);
  while ((m = re.exec(src))) out.add(m[0]);
  return out;
}
