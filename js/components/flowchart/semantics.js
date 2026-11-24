// V-Code Edu — Flowchart studio: meaning of each designer node's text.
//   Nhập:      "Nhập n", "n", "Nhập a, b (số thực)", "Nhập ten (chuỗi)"
//   Xuất:      "In tong", "Xuất \"Tổng:\", tong", "print(a, b)"
//   Xử lý:     assignments, one per line or separated by ';'
//   Điều kiện: a boolean expression ("n % 2 == 0", "a > b và b > c", "i <= n?")
import { FcError, parseExpression, parseArgList, parseStatement, splitStatements } from './expr.js';

const ID_RE = /^[\p{L}_][\p{L}\p{N}_]*$/u;

const TYPE_HINTS = [
  { re: /^(số\s*nguyên|so\s*nguyen|nguyên|nguyen|int|integer)$/i, type: 'int' },
  { re: /^(số\s*thực|so\s*thuc|thực|thuc|float|real|double)$/i, type: 'float' },
  { re: /^(chuỗi|chuoi|xâu|xau|văn\s*bản|van\s*ban|str|string|text|chữ|chu)$/i, type: 'str' },
];

function hintType(h) {
  const t = h.trim();
  for (const x of TYPE_HINTS) if (x.re.test(t)) return x.type;
  return null;
}

const INPUT_PREFIX = /^\s*(nhập|nhap|đọc|doc|input|read|cin\s*>>)(?=[\s:]|$)\s*:?\s*/i;
const OUTPUT_PREFIX = /^\s*(in\s+ra|in|xuất|xuat|hiển\s*thị|hien\s*thi|viết|viet|ghi|print|output)(?=[\s:"'(]|$)\s*:?\s*/i;
const COND_PREFIX = /^\s*(nếu|neu|if|while|khi|khi_ma)\s+/i;

export function parseInputText(text) {
  const body = String(text ?? '').replace(INPUT_PREFIX, '').trim();
  if (!body) throw new FcError('Khối Nhập cần tên biến, ví dụ: Nhập n');
  let parts = body.split(/\s*[,;]\s*/).filter(Boolean);
  if (parts.length === 1 && /\s/.test(parts[0]) && !/[(:]/.test(parts[0])) parts = parts[0].split(/\s+/);
  return parts.map((p) => {
    const m = /^([\p{L}_][\p{L}\p{N}_]*)\s*(?:\(\s*([^)]*?)\s*\)|:\s*(.+))?$/u.exec(p.trim());
    if (!m) throw new FcError(`«${p}» không phải tên biến hợp lệ (chỉ gồm chữ, số, dấu _ và không bắt đầu bằng số)`);
    const hint = m[2] ?? m[3];
    let type = 'int';
    if (hint !== undefined) {
      type = hintType(hint);
      if (!type) throw new FcError(`Kiểu «${hint}» không hợp lệ — dùng (số nguyên), (số thực) hoặc (chuỗi)`);
    }
    return { name: m[1].normalize('NFC'), type };
  });
}

export function parseOutputText(text) {
  const raw = String(text ?? '').trim();
  const callM = /^(print|in_ra)\s*\(([\s\S]*)\)\s*$/.exec(raw);
  let body;
  if (callM) body = callM[2];
  else body = raw.replace(OUTPUT_PREFIX, '');
  const args = parseArgList(body);
  const pos = args.filter((a) => !a.kw);
  if (pos.length === 1 && pos[0].e.t === 'tuple' && !callM) {
    const kws = args.filter((a) => a.kw);
    return [...pos[0].e.items.map((e) => ({ e })), ...kws];
  }
  return args;
}

export function parseDecisionText(text) {
  let t = String(text ?? '').trim().replace(COND_PREFIX, '');
  t = t.replace(/\s*(thì|thi)\s*$/i, '').replace(/[:?？]+\s*$/, '').trim();
  if (!t) throw new FcError('Khối Điều kiện cần một biểu thức, ví dụ: n > 0');
  return parseExpression(t, { mode: 'cond' });
}

export function parseProcessText(text) {
  const parts = splitStatements(String(text ?? ''));
  if (!parts.length) throw new FcError('Khối Xử lý đang trống — hãy viết phép gán, ví dụ: tong = tong + i');
  return parts.map((p) => parseStatement(p));
}

/** Compile a designer node → executable description. Throws FcError (Vietnamese). */
export function compileNode(node) {
  switch (node.type) {
    case 'start': return { kind: 'start' };
    case 'end': return { kind: 'end' };
    case 'input': return { kind: 'input', vars: parseInputText(node.text) };
    case 'output': return { kind: 'output', args: parseOutputText(node.text) };
    case 'process':
    case 'call': return { kind: 'process', stmts: parseProcessText(node.text) };
    case 'decision': return { kind: 'decision', cond: parseDecisionText(node.text) };
    default: throw new FcError(`Loại khối «${node.type}» không hợp lệ`);
  }
}

export function isIdentifier(s) { return ID_RE.test(s); }
