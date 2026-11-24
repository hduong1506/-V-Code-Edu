// V-Prism — arrays, linked lists, stacks & queues, hash tables.
import { Recorder, parseNumberList, parseInteger, randomInts, randomDistinct } from '../engine.js';

const listInput = (def, { max = 10, label = 'Mảng ban đầu' } = {}) => ({
  name: 'arr', label, type: 'list', default: def, hint: `1–${max} số nguyên 0..99.`,
  random: () => randomInts(4 + Math.floor(Math.random() * 4), 1, 99).join(' '),
  parse: (s) => parseNumberList(s, { min: 1, max, lo: 0, hi: 99 }),
});
const intInput = (name, label, def, lo, hi) => ({ name, label, type: 'number', default: String(def), parse: (s) => parseInteger(s, { lo, hi, label }), random: () => String(lo + Math.floor(Math.random() * (Math.min(hi, 99) - lo + 1))) });

// ================================================================ ARRAYS
const arrAccess = {
  id: 'access', title: 'Truy cập & duyệt', renderer: 'cells',
  summary: 'Mảng lưu các phần tử liên tiếp trong bộ nhớ, nên truy cập a[i] chỉ cần một phép tính địa chỉ: O(1). Duyệt toàn bộ mảng (ví dụ tính tổng, tìm max) cần O(n).',
  complexity: { best: 'O(1) truy cập', avg: 'O(n) duyệt', worst: 'O(n) duyệt', space: 'O(1)' },
  inputs: [listInput('7 3 9 1 12 5 8'), intInput('i', 'Chỉ số cần truy cập', 4, 0, 15)],
  pseudo: ['x ← a[i]          // O(1)', 'tong ← 0; max ← a[0]', 'lặp k từ 0 đến n-1:', '  tong ← tong + a[k]', '  nếu a[k] > max: max ← a[k]'],
  code: {
    python: 'a = [7, 3, 9, 1, 12, 5, 8]\nprint(a[4])          # truy cập O(1)\ntong, lon_nhat = 0, a[0]\nfor x in a:          # duyệt O(n)\n    tong += x\n    lon_nhat = max(lon_nhat, x)\nprint(tong, lon_nhat)',
    cpp: 'int a[] = {7, 3, 9, 1, 12, 5, 8};\nint n = 7;\ncout << a[4] << endl;          // O(1)\nint tong = 0, mx = a[0];\nfor (int k = 0; k < n; k++) {   // O(n)\n    tong += a[k];\n    if (a[k] > mx) mx = a[k];\n}',
    javascript: 'const a = [7, 3, 9, 1, 12, 5, 8];\nconsole.log(a[4]);            // O(1)\nlet sum = 0, max = a[0];\nfor (const x of a) {          // O(n)\n  sum += x;\n  if (x > max) max = x;\n}',
  },
  run({ arr, i }) {
    const r = new Recorder();
    if (i >= arr.length) {
      r.add({ values: arr, marks: {} }, 0, `Chỉ số ${i} vượt ngoài mảng (0..${arr.length - 1}) → lỗi "index out of range".`);
    } else {
      r.add({ values: arr, marks: { [i]: 'active' }, pointers: { i } }, 0, `a[${i}] = ${arr[i]}: máy tính tính ngay địa chỉ = địa chỉ đầu + ${i} × kích thước ô → O(1).`, { i, 'a[i]': arr[i] });
    }
    let sum = 0;
    let mx = arr[0];
    r.add({ values: arr, marks: {} }, 1, 'Duyệt mảng để tính tổng và giá trị lớn nhất.', { tong: 0, max: mx });
    arr.forEach((v, k) => {
      sum += v;
      if (v > mx) mx = v;
      r.add({ values: arr, marks: { ...Object.fromEntries([...Array(k)].map((_, t) => [t, 'done'])), [k]: 'compare' }, pointers: { k } }, v === mx ? 4 : 3, `k = ${k}: cộng ${v} → tổng = ${sum}${v === mx ? `; max mới = ${mx}` : ''}.`, { k, tong: sum, max: mx });
    });
    r.add({ values: arr, marks: Object.fromEntries(arr.map((_, t) => [t, 'done'])) }, 2, `Xong sau ${arr.length} bước: tổng = ${sum}, lớn nhất = ${mx}.`, { tong: sum, max: mx });
    return r.frames;
  },
};

const arrInsert = {
  id: 'insert', title: 'Chèn phần tử', renderer: 'cells',
  summary: 'Chèn vào vị trí i phải dịch tất cả phần tử từ i trở đi sang phải một ô để tạo chỗ trống — tốn O(n) trong trường hợp xấu (chèn vào đầu). Chèn vào cuối mảng (khi còn chỗ) chỉ O(1).',
  complexity: { best: 'O(1) (cuối)', avg: 'O(n)', worst: 'O(n) (đầu)', space: 'O(1)' },
  inputs: [listInput('4 8 15 16 23', { max: 9 }), intInput('i', 'Vị trí chèn', 1, 0, 9), intInput('v', 'Giá trị chèn', 42, 0, 99)],
  pseudo: ['n ← n + 1', 'lặp k từ n-1 xuống i+1:', '  a[k] ← a[k-1]   // dịch phải', 'a[i] ← v'],
  code: {
    python: 'a = [4, 8, 15, 16, 23]\na.insert(1, 42)      # Python tự dịch các phần tử\n# Tự cài đặt:\ndef insert_at(a, i, v):\n    a.append(None)\n    for k in range(len(a) - 1, i, -1):\n        a[k] = a[k - 1]\n    a[i] = v',
    cpp: 'void insertAt(int a[], int &n, int i, int v) {\n    for (int k = n; k > i; k--) a[k] = a[k - 1];\n    a[i] = v;\n    n++;\n}',
    javascript: 'function insertAt(a, i, v) {\n  a.push(undefined);\n  for (let k = a.length - 1; k > i; k--) a[k] = a[k - 1];\n  a[i] = v;\n}',
  },
  run({ arr, i, v }) {
    const r = new Recorder();
    if (i > arr.length) { r.add({ values: arr, marks: {} }, 0, `Vị trí ${i} không hợp lệ (chỉ chèn được ở 0..${arr.length}).`); return r.frames; }
    const a = [...arr, null];
    r.add({ values: a, marks: { [a.length - 1]: 'active' } }, 0, 'Mở rộng mảng thêm một ô trống ở cuối.', { n: a.length });
    for (let k = a.length - 1; k > i; k--) {
      a[k] = a[k - 1];
      a[k - 1] = null;
      r.add({ values: a, marks: { [k]: 'swap', [k - 1]: 'compare' } }, 2, `Dịch ${a[k]} từ ô ${k - 1} sang ô ${k}.`, { k });
    }
    a[i] = v;
    r.add({ values: a, marks: { [i]: 'done' } }, 3, `Đặt ${v} vào ô ${i}. Đã dịch ${arr.length - i} phần tử.`, { i, v });
    return r.frames;
  },
};

const arrDelete = {
  id: 'delete', title: 'Xóa phần tử', renderer: 'cells',
  summary: 'Xóa phần tử ở vị trí i rồi dịch các phần tử phía sau sang trái để lấp chỗ trống — O(n) trong trường hợp xấu.',
  complexity: { best: 'O(1) (cuối)', avg: 'O(n)', worst: 'O(n) (đầu)', space: 'O(1)' },
  inputs: [listInput('4 8 15 16 23 42', { max: 10 }), intInput('i', 'Vị trí xóa', 2, 0, 9)],
  pseudo: ['lặp k từ i đến n-2:', '  a[k] ← a[k+1]   // dịch trái', 'n ← n - 1'],
  code: {
    python: 'a = [4, 8, 15, 16, 23, 42]\na.pop(2)             # xóa phần tử ở vị trí 2\n# Tự cài đặt:\ndef delete_at(a, i):\n    for k in range(i, len(a) - 1):\n        a[k] = a[k + 1]\n    a.pop()',
    cpp: 'void deleteAt(int a[], int &n, int i) {\n    for (int k = i; k < n - 1; k++) a[k] = a[k + 1];\n    n--;\n}',
    javascript: 'function deleteAt(a, i) {\n  for (let k = i; k < a.length - 1; k++) a[k] = a[k + 1];\n  a.length--;\n}',
  },
  run({ arr, i }) {
    const r = new Recorder();
    if (i >= arr.length) { r.add({ values: arr, marks: {} }, 0, `Vị trí ${i} không hợp lệ (0..${arr.length - 1}).`); return r.frames; }
    const a = [...arr];
    r.add({ values: a, marks: { [i]: 'swap' } }, 0, `Xóa a[${i}] = ${a[i]}.`, { i });
    a[i] = null;
    r.add({ values: a, marks: { [i]: 'dim' } }, 0, 'Ô này trở thành trống.');
    for (let k = i; k < a.length - 1; k++) {
      a[k] = a[k + 1];
      a[k + 1] = null;
      r.add({ values: a, marks: { [k]: 'swap', [k + 1]: 'compare' } }, 1, `Dịch ${a[k]} từ ô ${k + 1} sang ô ${k}.`, { k });
    }
    a.pop();
    r.add({ values: a, marks: {} }, 2, `Giảm kích thước còn ${a.length}. Đã dịch ${arr.length - 1 - i} phần tử.`);
    return r.frames;
  },
};

// ================================================================ LINKED LIST
function llState(nodes, order, extra = {}) {
  return { nodes, order, ...extra };
}

const llCode = {
  python: 'class Node:\n    def __init__(self, val, nxt=None):\n        self.val, self.next = val, nxt\n\ndef insert_head(head, v):\n    return Node(v, head)\n\ndef insert_at(head, i, v):\n    if i == 0:\n        return Node(v, head)\n    cur = head\n    for _ in range(i - 1):\n        cur = cur.next\n    cur.next = Node(v, cur.next)\n    return head\n\ndef reverse(head):\n    prev = None\n    while head:\n        head.next, prev, head = prev, head, head.next\n    return prev',
  cpp: 'struct Node { int val; Node* next; };\n\nNode* insertHead(Node* head, int v) {\n    return new Node{v, head};\n}\n\nNode* insertAt(Node* head, int i, int v) {\n    if (i == 0) return new Node{v, head};\n    Node* cur = head;\n    for (int k = 0; k < i - 1; k++) cur = cur->next;\n    cur->next = new Node{v, cur->next};\n    return head;\n}\n\nNode* reverse(Node* head) {\n    Node* prev = nullptr;\n    while (head) {\n        Node* nxt = head->next;\n        head->next = prev;\n        prev = head;\n        head = nxt;\n    }\n    return prev;\n}',
  javascript: 'class Node {\n  constructor(val, next = null) { this.val = val; this.next = next; }\n}\nconst insertHead = (head, v) => new Node(v, head);\nfunction insertAt(head, i, v) {\n  if (i === 0) return new Node(v, head);\n  let cur = head;\n  for (let k = 0; k < i - 1; k++) cur = cur.next;\n  cur.next = new Node(v, cur.next);\n  return head;\n}\nfunction reverse(head) {\n  let prev = null;\n  while (head) [head.next, prev, head] = [prev, head, head.next];\n  return prev;\n}',
};

const llInsert = {
  id: 'insert', title: 'Chèn nút', renderer: 'list',
  summary: 'Danh sách liên kết gồm các nút, mỗi nút giữ giá trị và con trỏ tới nút kế tiếp. Chèn vào đầu chỉ cần đổi con trỏ: O(1). Chèn vào vị trí i phải đi từ head tới nút thứ i−1: O(n).',
  complexity: { best: 'O(1) (đầu)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
  inputs: [listInput('12 7 25 3', { max: 8, label: 'Danh sách ban đầu' }), intInput('i', 'Vị trí chèn (0 = đầu)', 2, 0, 8), intInput('v', 'Giá trị', 40, 0, 99)],
  pseudo: ['tạo nút mới N(v)', 'nếu i = 0: N.next ← head; head ← N', 'cur ← head; đi i-1 bước: cur ← cur.next', 'N.next ← cur.next', 'cur.next ← N'],
  code: llCode,
  run({ arr, i, v }) {
    const r = new Recorder();
    const nodes = arr.map((value) => ({ value }));
    let order = nodes.map((_, k) => k);
    if (i > arr.length) { r.add(llState(nodes, order), 0, `Vị trí ${i} không hợp lệ (0..${arr.length}).`); return r.frames; }
    nodes.push({ value: v });
    const nid = nodes.length - 1;
    r.add(llState(nodes, order, { note: `Nút mới N(${v}) được tạo, chưa nối vào danh sách.` }), 0, `Tạo nút mới chứa ${v}.`);
    if (i === 0) {
      order = [nid, ...order];
      r.add(llState(nodes, order, { marks: { [nid]: 'done' }, pointers: { head: nid } }), 1, 'Chèn đầu: N.next trỏ tới head cũ, rồi head trỏ tới N. Chỉ 2 thao tác → O(1).');
      return r.frames;
    }
    let cur = 0;
    r.add(llState(nodes, order, { marks: { [order[cur]]: 'compare' }, pointers: { cur: order[cur] } }), 2, 'Bắt đầu từ head.');
    for (let k = 0; k < i - 1; k++) {
      cur += 1;
      r.add(llState(nodes, order, { marks: { [order[cur]]: 'compare' }, pointers: { cur: order[cur] } }), 2, `Đi tiếp: cur ← cur.next (bước ${k + 1}/${i - 1}).`);
    }
    r.add(llState(nodes, order, { marks: { [order[cur]]: 'compare', [nid]: 'active' }, pointers: { cur: order[cur], N: nid } }), 3, `N.next ← cur.next (nút ${order[cur + 1] !== undefined ? nodes[order[cur + 1]].value : 'null'}).`);
    order = [...order.slice(0, cur + 1), nid, ...order.slice(cur + 1)];
    r.add(llState(nodes, order, { marks: { [nid]: 'done' } }), 4, `cur.next ← N. Đã chèn ${v} vào vị trí ${i} mà không phải dịch phần tử nào.`);
    return r.frames;
  },
};

const llDelete = {
  id: 'delete', title: 'Xóa & tìm kiếm', renderer: 'list',
  summary: 'Tìm nút có giá trị x bằng cách đi từ head (O(n)). Khi tìm thấy, chỉ cần cho nút đứng trước "nhảy qua" nút đó: prev.next ← cur.next.',
  complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
  inputs: [listInput('5 18 9 30 14', { max: 8, label: 'Danh sách' }), intInput('x', 'Giá trị cần xóa', 30, 0, 99)],
  pseudo: ['prev ← null; cur ← head', 'trong khi cur ≠ null và cur.val ≠ x:', '  prev ← cur; cur ← cur.next', 'nếu cur = null: không tìm thấy', 'nếu prev = null: head ← cur.next', 'ngược lại: prev.next ← cur.next'],
  code: {
    python: 'def delete_value(head, x):\n    prev, cur = None, head\n    while cur and cur.val != x:\n        prev, cur = cur, cur.next\n    if cur is None:\n        return head          # không tìm thấy\n    if prev is None:\n        return cur.next      # xóa head\n    prev.next = cur.next\n    return head',
    cpp: 'Node* deleteValue(Node* head, int x) {\n    Node *prev = nullptr, *cur = head;\n    while (cur && cur->val != x) { prev = cur; cur = cur->next; }\n    if (!cur) return head;\n    if (!prev) head = cur->next;\n    else prev->next = cur->next;\n    delete cur;\n    return head;\n}',
    javascript: 'function deleteValue(head, x) {\n  let prev = null, cur = head;\n  while (cur && cur.val !== x) { prev = cur; cur = cur.next; }\n  if (!cur) return head;\n  if (!prev) return cur.next;\n  prev.next = cur.next;\n  return head;\n}',
  },
  run({ arr, x }) {
    const r = new Recorder();
    const nodes = arr.map((value) => ({ value }));
    let order = nodes.map((_, k) => k);
    let k = 0;
    r.add(llState(nodes, order, { pointers: { cur: 0 } }), 0, 'cur bắt đầu ở head.');
    while (k < order.length && nodes[order[k]].value !== x) {
      r.add(llState(nodes, order, { marks: { [order[k]]: 'compare' }, pointers: { cur: order[k], ...(k ? { prev: order[k - 1] } : {}) } }), 1, `${nodes[order[k]].value} ≠ ${x} → đi tiếp.`);
      k += 1;
    }
    if (k === order.length) { r.add(llState(nodes, order), 3, `Đã đi hết danh sách, không có ${x}.`); return r.frames; }
    r.add(llState(nodes, order, { marks: { [order[k]]: 'swap' }, pointers: { cur: order[k], ...(k ? { prev: order[k - 1] } : {}) } }), 1, `Tìm thấy ${x} sau ${k + 1} bước.`);
    order = order.filter((_, t) => t !== k);
    r.add(llState(nodes, order), k === 0 ? 4 : 5, k === 0 ? 'Nút cần xóa là head → head ← cur.next.' : 'prev.next ← cur.next: nút bị "bỏ qua" và được giải phóng.');
    return r.frames;
  },
};

const llReverse = {
  id: 'reverse', title: 'Đảo ngược', renderer: 'list',
  summary: 'Đảo chiều tất cả con trỏ next bằng ba biến prev, cur, nxt — một bài kinh điển trong phỏng vấn lập trình. Mỗi nút được xử lý đúng một lần.',
  complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
  inputs: [listInput('1 2 3 4 5', { max: 8, label: 'Danh sách' })],
  pseudo: ['prev ← null; cur ← head', 'trong khi cur ≠ null:', '  nxt ← cur.next', '  cur.next ← prev', '  prev ← cur; cur ← nxt', 'head ← prev'],
  code: llCode,
  run({ arr }) {
    const r = new Recorder();
    const nodes = arr.map((value) => ({ value }));
    const order = nodes.map((_, k) => k);
    r.add(llState(nodes, order, { pointers: { cur: 0 } }), 0, 'prev = null, cur = head.');
    for (let k = 0; k < order.length; k++) {
      r.add(llState(nodes, order, { reversedUpTo: k, marks: { [k]: 'compare' }, pointers: { cur: k, ...(k ? { prev: k - 1 } : {}), ...(k + 1 < order.length ? { nxt: k + 1 } : {}) } }), 2, `Lưu nxt = ${k + 1 < order.length ? nodes[k + 1].value : 'null'}.`);
      r.add(llState(nodes, order, { reversedUpTo: k + 1, marks: { [k]: 'swap' }, pointers: { cur: k } }), 3, `Đảo con trỏ: ${nodes[k].value}.next ← ${k ? nodes[k - 1].value : 'null'}.`);
    }
    const rev = [...order].reverse();
    r.add(llState(nodes, rev, { marks: Object.fromEntries(rev.map((t) => [t, 'done'])), pointers: { head: rev[0] } }), 5, 'head ← prev. Danh sách đã được đảo ngược.');
    return r.frames;
  },
};

// ================================================================ STACK & QUEUE
function parseOps(str, kind) {
  const tokens = String(str || '').split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
  if (!tokens.length) return { error: 'Hãy nhập ít nhất một thao tác.' };
  if (tokens.length > 14) return { error: 'Tối đa 14 thao tác.' };
  const ops = [];
  for (const t of tokens) {
    const m = /^(push|pop|peek|enqueue|dequeue|front)\s*(-?\d+)?$/i.exec(t);
    if (!m) return { error: `Không hiểu thao tác "${t}". Dùng: ${kind === 'stack' ? 'push 5, pop, peek' : 'enqueue 5, dequeue, front'}.` };
    const op = m[1].toLowerCase();
    if ((op === 'push' || op === 'enqueue') && m[2] === undefined) return { error: `"${t}" cần một giá trị, ví dụ "${op} 7".` };
    if (kind === 'stack' && !['push', 'pop', 'peek'].includes(op)) return { error: 'Ngăn xếp chỉ dùng push, pop, peek.' };
    if (kind === 'queue' && !['enqueue', 'dequeue', 'front'].includes(op)) return { error: 'Hàng đợi chỉ dùng enqueue, dequeue, front.' };
    ops.push({ op, v: m[2] !== undefined ? Number(m[2]) : null, raw: t });
  }
  return { value: ops };
}

const stackOps = {
  id: 'stack', title: 'Ngăn xếp (LIFO)', renderer: 'stackqueue',
  summary: 'Ngăn xếp hoạt động theo nguyên tắc vào sau – ra trước (LIFO), như chồng đĩa: chỉ thêm (push) và lấy (pop) ở đỉnh. Ứng dụng: hoàn tác (Ctrl+Z), lời gọi hàm, duyệt DFS, kiểm tra ngoặc.',
  complexity: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)', note: 'push / pop / peek đều O(1).' },
  inputs: [{ name: 'ops', label: 'Chuỗi thao tác', type: 'text', default: 'push 3, push 8, push 5, peek, pop, push 1, pop, pop', hint: 'push x, pop, peek — cách nhau bởi dấu phẩy.', parse: (s) => parseOps(s, 'stack'), random: () => 'push 4, push 9, pop, push 2, push 6, peek, pop, pop' }],
  pseudo: ['push(x): đặt x lên đỉnh', 'pop(): lấy và trả về phần tử ở đỉnh', 'peek(): xem phần tử ở đỉnh', 'nếu ngăn xếp rỗng khi pop/peek: lỗi'],
  code: {
    python: 'stack = []\nstack.append(3)      # push\nstack.append(8)\ntop = stack[-1]      # peek\nx = stack.pop()      # pop\nprint(x, stack)',
    cpp: 'int st[1000], top = 0;\nvoid push(int x) { st[top++] = x; }\nint pop() { return st[--top]; }\nint peek() { return st[top - 1]; }\nbool empty() { return top == 0; }',
    javascript: 'const stack = [];\nstack.push(3);            // push\nstack.push(8);\nconst top = stack.at(-1); // peek\nconst x = stack.pop();    // pop',
  },
  run({ ops }) {
    const r = new Recorder();
    const items = [];
    const labels = ops.map((o) => o.raw);
    r.add({ kind: 'stack', items, ops: labels, opIndex: -1 }, 0, 'Ngăn xếp ban đầu rỗng.');
    ops.forEach((o, idx) => {
      if (o.op === 'push') { items.push(o.v); r.add({ kind: 'stack', items, ops: labels, opIndex: idx, marks: { [items.length - 1]: 'done' } }, 0, `push(${o.v}): đặt ${o.v} lên đỉnh.`, { size: items.length }); }
      else if (!items.length) r.add({ kind: 'stack', items, ops: labels, opIndex: idx }, 3, `${o.op}(): ngăn xếp rỗng → lỗi "stack underflow".`);
      else if (o.op === 'peek') r.add({ kind: 'stack', items, ops: labels, opIndex: idx, marks: { [items.length - 1]: 'active' } }, 2, `peek() = ${items[items.length - 1]} (không lấy ra).`, { top: items[items.length - 1] });
      else {
        r.add({ kind: 'stack', items, ops: labels, opIndex: idx, marks: { [items.length - 1]: 'swap' } }, 1, `pop(): lấy ${items[items.length - 1]} ra khỏi đỉnh.`);
        const x = items.pop();
        r.add({ kind: 'stack', items, ops: labels, opIndex: idx, output: x }, 1, `Đã lấy ra ${x}.`, { size: items.length });
      }
    });
    return r.frames;
  },
};

const queueOps = {
  id: 'queue', title: 'Hàng đợi (FIFO)', renderer: 'stackqueue',
  summary: 'Hàng đợi hoạt động theo nguyên tắc vào trước – ra trước (FIFO), như xếp hàng mua vé: thêm vào cuối (enqueue), lấy ra ở đầu (dequeue). Ứng dụng: duyệt BFS, hàng đợi in, xử lý yêu cầu.',
  complexity: { best: 'O(1)', avg: 'O(1)', worst: 'O(1)', space: 'O(n)', note: 'Cài bằng mảng vòng hoặc danh sách liên kết để dequeue là O(1).' },
  inputs: [{ name: 'ops', label: 'Chuỗi thao tác', type: 'text', default: 'enqueue 4, enqueue 7, enqueue 1, dequeue, front, enqueue 9, dequeue', hint: 'enqueue x, dequeue, front — cách nhau bởi dấu phẩy.', parse: (s) => parseOps(s, 'queue'), random: () => 'enqueue 2, enqueue 6, enqueue 3, dequeue, enqueue 8, dequeue, front' }],
  pseudo: ['enqueue(x): thêm x vào cuối', 'dequeue(): lấy phần tử ở đầu', 'front(): xem phần tử ở đầu', 'nếu hàng đợi rỗng khi dequeue/front: lỗi'],
  code: {
    python: 'from collections import deque\nq = deque()\nq.append(4)          # enqueue\nq.append(7)\nfirst = q[0]         # front\nx = q.popleft()      # dequeue O(1)',
    cpp: 'int q[1000], head = 0, tail = 0;\nvoid enqueue(int x) { q[tail++] = x; }\nint dequeue() { return q[head++]; }\nint front() { return q[head]; }\nbool empty() { return head == tail; }',
    javascript: 'const q = [];\nq.push(4);              // enqueue\nq.push(7);\nconst first = q[0];     // front\nconst x = q.shift();    // dequeue (O(n) với mảng JS — dùng chỉ số head để O(1))',
  },
  run({ ops }) {
    const r = new Recorder();
    const items = [];
    const labels = ops.map((o) => o.raw);
    r.add({ kind: 'queue', items, ops: labels, opIndex: -1 }, 0, 'Hàng đợi ban đầu rỗng.');
    ops.forEach((o, idx) => {
      if (o.op === 'enqueue') { items.push(o.v); r.add({ kind: 'queue', items, ops: labels, opIndex: idx, marks: { [items.length - 1]: 'done' } }, 0, `enqueue(${o.v}): thêm vào cuối hàng.`, { size: items.length }); }
      else if (!items.length) r.add({ kind: 'queue', items, ops: labels, opIndex: idx }, 3, `${o.op}(): hàng đợi rỗng → lỗi.`);
      else if (o.op === 'front') r.add({ kind: 'queue', items, ops: labels, opIndex: idx, marks: { 0: 'active' } }, 2, `front() = ${items[0]}.`);
      else {
        r.add({ kind: 'queue', items, ops: labels, opIndex: idx, marks: { 0: 'swap' } }, 1, `dequeue(): lấy ${items[0]} ở đầu hàng.`);
        const x = items.shift();
        r.add({ kind: 'queue', items, ops: labels, opIndex: idx, output: x }, 1, `Đã lấy ra ${x}.`, { size: items.length });
      }
    });
    return r.frames;
  },
};

const brackets = {
  id: 'brackets', title: 'Kiểm tra dấu ngoặc', renderer: 'stackqueue',
  summary: 'Ứng dụng kinh điển của ngăn xếp: gặp ngoặc mở thì push; gặp ngoặc đóng thì pop và kiểm tra có khớp loại không. Cuối cùng ngăn xếp phải rỗng.',
  complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)' },
  inputs: [{ name: 's', label: 'Biểu thức', type: 'text', default: '{[(a+b)*c]-(d)}', hint: 'Tối đa 24 ký tự, gồm ( ) [ ] { } và chữ/số.', random: () => ['(()[]{})', '{[(])}', '((a+b)*[c-d])', '([)]', '{{[[(())]]}}'][Math.floor(Math.random() * 5)], parse: (s) => (String(s).length > 24 ? { error: 'Tối đa 24 ký tự.' } : !String(s).trim() ? { error: 'Hãy nhập biểu thức.' } : { value: String(s).replace(/\s/g, '') }) }],
  pseudo: ['lặp mỗi ký tự c:', '  nếu c là ngoặc mở: push(c)', '  nếu c là ngoặc đóng:', '    nếu rỗng hoặc pop() không khớp c: SAI', 'ĐÚNG nếu ngăn xếp rỗng'],
  code: {
    python: 'def balanced(s):\n    pairs = {")": "(", "]": "[", "}": "{"}\n    st = []\n    for c in s:\n        if c in "([{":\n            st.append(c)\n        elif c in pairs:\n            if not st or st.pop() != pairs[c]:\n                return False\n    return not st',
    cpp: 'bool balanced(const char s[]) {\n    char st[1000]; int top = 0;\n    for (int i = 0; s[i]; i++) {\n        char c = s[i];\n        if (c == \'(\' || c == \'[\' || c == \'{\') st[top++] = c;\n        else if (c == \')\' || c == \']\' || c == \'}\') {\n            char open = c == \')\' ? \'(\' : c == \']\' ? \'[\' : \'{\';\n            if (top == 0 || st[--top] != open) return false;\n        }\n    }\n    return top == 0;\n}',
    javascript: 'function balanced(s) {\n  const pairs = { ")": "(", "]": "[", "}": "{" };\n  const st = [];\n  for (const c of s) {\n    if ("([{".includes(c)) st.push(c);\n    else if (c in pairs && st.pop() !== pairs[c]) return false;\n  }\n  return st.length === 0;\n}',
  },
  run({ s }) {
    const r = new Recorder();
    const pairs = { ')': '(', ']': '[', '}': '{' };
    const st = [];
    r.add({ kind: 'stack', items: st, text: s, cursor: -1 }, 0, 'Duyệt từng ký tự từ trái sang phải.');
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if ('([{'.includes(c)) { st.push(c); r.add({ kind: 'stack', items: st, text: s, cursor: i, marks: { [st.length - 1]: 'done' } }, 1, `"${c}" là ngoặc mở → push.`); }
      else if (pairs[c]) {
        if (!st.length || st[st.length - 1] !== pairs[c]) {
          r.add({ kind: 'stack', items: st, text: s, cursor: i, bad: i, marks: st.length ? { [st.length - 1]: 'swap' } : {} }, 3, st.length ? `"${c}" không khớp với "${st[st.length - 1]}" ở đỉnh → biểu thức SAI.` : `Gặp "${c}" nhưng ngăn xếp rỗng → biểu thức SAI.`);
          return r.frames;
        }
        r.add({ kind: 'stack', items: st, text: s, cursor: i, marks: { [st.length - 1]: 'active' } }, 3, `"${c}" khớp với "${st[st.length - 1]}" → pop.`);
        st.pop();
        r.add({ kind: 'stack', items: st, text: s, cursor: i }, 3, 'Đã pop.');
      } else r.add({ kind: 'stack', items: st, text: s, cursor: i }, 0, `"${c}" không phải dấu ngoặc → bỏ qua.`);
    }
    r.add({ kind: 'stack', items: st, text: s, cursor: s.length, output: st.length ? 'SAI (còn ngoặc chưa đóng)' : 'ĐÚNG' }, 4, st.length ? `Còn ${st.length} ngoặc mở chưa được đóng → SAI.` : 'Ngăn xếp rỗng → biểu thức cân bằng (ĐÚNG).');
    return r.frames;
  },
};

// ================================================================ HASH TABLE
const keysInput = (def) => ({ name: 'keys', label: 'Các khóa chèn lần lượt', type: 'list', default: def, hint: '1–12 số nguyên 0..999.', random: () => randomDistinct(8, 1, 99).join(' '), parse: (s) => parseNumberList(s, { min: 1, max: 12, lo: 0, hi: 999 }) });
const mInput = { name: 'm', label: 'Số ô (m)', type: 'number', default: '7', parse: (s) => parseInteger(s, { lo: 3, hi: 13, label: 'Số ô m' }), random: () => '7' };

const chaining = {
  id: 'chaining', title: 'Băm xâu ngăn cách (chaining)', renderer: 'hash',
  summary: 'Hàm băm h(k) = k mod m quyết định ô chứa khóa. Khi nhiều khóa rơi vào cùng ô (va chạm), ta nối chúng thành một danh sách tại ô đó. Hệ số tải α = n/m càng nhỏ thì tra cứu càng nhanh.',
  complexity: { best: 'O(1)', avg: 'O(1 + α)', worst: 'O(n)', space: 'O(n + m)', note: 'α = n/m là hệ số tải.' },
  inputs: [keysInput('15 11 27 8 12 33 20 4'), mInput, { name: 'q', label: 'Khóa cần tìm', type: 'number', default: '27', parse: (s) => parseInteger(s, { lo: 0, hi: 999, label: 'Khóa cần tìm' }), random: () => String(randomInts(1, 1, 99)[0]) }],
  pseudo: ['insert(k): i ← k mod m; thêm k vào danh sách ô i', 'search(k): i ← k mod m', '  duyệt danh sách ô i tìm k'],
  code: {
    python: 'm = 7\ntable = [[] for _ in range(m)]\n\ndef insert(k):\n    table[k % m].append(k)\n\ndef search(k):\n    return k in table[k % m]',
    cpp: 'const int M = 7;\nint bucket[M][100], sz[M];\nvoid insert(int k) { int i = k % M; bucket[i][sz[i]++] = k; }\nbool search(int k) {\n    int i = k % M;\n    for (int j = 0; j < sz[i]; j++) if (bucket[i][j] == k) return true;\n    return false;\n}',
    javascript: 'const m = 7;\nconst table = Array.from({ length: m }, () => []);\nconst insert = (k) => table[k % m].push(k);\nconst search = (k) => table[k % m].includes(k);\n// Thực tế: dùng sẵn new Map() / new Set()',
  },
  run({ keys, m, q }) {
    const r = new Recorder();
    const buckets = Array.from({ length: m }, () => []);
    r.add({ mode: 'chain', buckets }, 0, `Bảng băm có ${m} ô, ban đầu rỗng. h(k) = k mod ${m}.`);
    keys.forEach((k) => {
      const i = k % m;
      r.add({ mode: 'chain', buckets, marks: { [i]: 'compare' } }, 0, `h(${k}) = ${k} mod ${m} = ${i}.`, { k, 'h(k)': i });
      const collide = buckets[i].length > 0;
      buckets[i].push(k);
      r.add({ mode: 'chain', buckets, marks: { [i]: collide ? 'swap' : 'done' }, keyMark: { [i]: buckets[i].length - 1 } }, 0, collide ? `Va chạm! Ô ${i} đã có khóa → nối ${k} vào cuối danh sách.` : `Đặt ${k} vào ô ${i}.`, { 'α': (keys.indexOf(k) + 1) / m });
    });
    const i = q % m;
    r.add({ mode: 'chain', buckets, marks: { [i]: 'compare' } }, 1, `Tìm ${q}: h(${q}) = ${i} → chỉ cần xem ô ${i}.`);
    for (let j = 0; j < buckets[i].length; j++) {
      r.add({ mode: 'chain', buckets, marks: { [i]: 'compare' }, keyMark: { [i]: j } }, 2, `So sánh với ${buckets[i][j]}.`);
      if (buckets[i][j] === q) { r.add({ mode: 'chain', buckets, marks: { [i]: 'done' }, keyMark: { [i]: j } }, 2, `Tìm thấy ${q} sau ${j + 1} phép so sánh.`); return r.frames; }
    }
    r.add({ mode: 'chain', buckets, marks: { [i]: 'dim' } }, 2, `Không có ${q} trong bảng.`);
    return r.frames;
  },
};

const probing = {
  id: 'probing', title: 'Địa chỉ mở (dò tuyến tính)', renderer: 'hash',
  summary: 'Mỗi ô chứa tối đa một khóa. Nếu ô h(k) đã bị chiếm, ta dò tiếp ô (h(k)+1) mod m, (h(k)+2) mod m… cho tới khi gặp ô trống. Các khóa dễ "dồn cụm" khi bảng gần đầy.',
  complexity: { best: 'O(1)', avg: 'O(1) khi α nhỏ', worst: 'O(n)', space: 'O(m)', note: 'Cần m > n. Nên giữ α < 0,7.' },
  inputs: [keysInput('10 22 31 4 15 28 17'), { ...mInput, default: '11', parse: (s) => parseInteger(s, { lo: 5, hi: 13, label: 'Số ô m' }) }, { name: 'q', label: 'Khóa cần tìm', type: 'number', default: '17', parse: (s) => parseInteger(s, { lo: 0, hi: 999, label: 'Khóa cần tìm' }), random: () => String(randomInts(1, 1, 99)[0]) }],
  pseudo: ['insert(k): i ← k mod m', '  trong khi ô i đã có khóa: i ← (i + 1) mod m', '  đặt k vào ô i', 'search(k): dò từ k mod m tới khi gặp k hoặc ô trống'],
  code: {
    python: 'm = 11\ntable = [None] * m\n\ndef insert(k):\n    i = k % m\n    while table[i] is not None:\n        i = (i + 1) % m\n    table[i] = k\n\ndef search(k):\n    i = k % m\n    while table[i] is not None:\n        if table[i] == k:\n            return i\n        i = (i + 1) % m\n    return -1',
    cpp: 'const int M = 11;\nint table_[M]; bool used[M];\nvoid insert(int k) {\n    int i = k % M;\n    while (used[i]) i = (i + 1) % M;\n    table_[i] = k; used[i] = true;\n}\nint search(int k) {\n    int i = k % M;\n    while (used[i]) {\n        if (table_[i] == k) return i;\n        i = (i + 1) % M;\n    }\n    return -1;\n}',
    javascript: 'const m = 11, table = new Array(m).fill(null);\nfunction insert(k) {\n  let i = k % m;\n  while (table[i] !== null) i = (i + 1) % m;\n  table[i] = k;\n}\nfunction search(k) {\n  let i = k % m;\n  while (table[i] !== null) {\n    if (table[i] === k) return i;\n    i = (i + 1) % m;\n  }\n  return -1;\n}',
  },
  run({ keys, m, q }) {
    const r = new Recorder();
    if (keys.length >= m) { r.add({ mode: 'probe', buckets: new Array(m).fill(null) }, 0, `Cần số ô m (${m}) lớn hơn số khóa (${keys.length}).`); return r.frames; }
    const slots = new Array(m).fill(null);
    r.add({ mode: 'probe', buckets: slots }, 0, `Bảng ${m} ô, h(k) = k mod ${m}.`);
    keys.forEach((k) => {
      let i = k % m;
      let probes = 0;
      r.add({ mode: 'probe', buckets: slots, marks: { [i]: 'compare' } }, 0, `h(${k}) = ${i}.`, { k });
      while (slots[i] !== null) {
        r.add({ mode: 'probe', buckets: slots, marks: { [i]: 'swap' } }, 1, `Ô ${i} đã có ${slots[i]} → dò ô tiếp theo.`, { k, 'lần dò': ++probes });
        i = (i + 1) % m;
      }
      slots[i] = k;
      r.add({ mode: 'probe', buckets: slots, marks: { [i]: 'done' }, keyMark: { [i]: 0 } }, 2, `Đặt ${k} vào ô ${i}${probes ? ` sau ${probes} lần dò` : ''}.`);
    });
    let i = q % m;
    let steps = 0;
    while (slots[i] !== null && steps < m) {
      r.add({ mode: 'probe', buckets: slots, marks: { [i]: 'compare' } }, 3, `Tìm ${q}: xem ô ${i} (${slots[i]}).`);
      if (slots[i] === q) { r.add({ mode: 'probe', buckets: slots, marks: { [i]: 'done' }, keyMark: { [i]: 0 } }, 3, `Tìm thấy ${q} ở ô ${i}.`); return r.frames; }
      i = (i + 1) % m;
      steps += 1;
    }
    r.add({ mode: 'probe', buckets: slots, marks: { [i]: 'dim' } }, 3, `Gặp ô trống → ${q} không có trong bảng.`);
    return r.frames;
  },
};

export const arraysTopic = { id: 'arrays', intro: 'Mảng là cấu trúc dữ liệu cơ bản nhất: các phần tử cùng kiểu nằm **liên tiếp** trong bộ nhớ và được đánh số từ 0. Nhờ vậy truy cập theo chỉ số cực nhanh, nhưng chèn/xóa ở giữa phải dịch nhiều phần tử.', algorithms: [arrAccess, arrInsert, arrDelete] };
export const linkedListTopic = { id: 'linked-list', intro: 'Danh sách liên kết là chuỗi các **nút** nối với nhau bằng con trỏ. Khác với mảng, các nút không cần nằm liền nhau trong bộ nhớ: chèn/xóa chỉ cần đổi con trỏ, nhưng muốn tới phần tử thứ i phải đi từ đầu danh sách.', algorithms: [llInsert, llDelete, llReverse] };
export const stackQueueTopic = { id: 'stack-queue', intro: 'Ngăn xếp (stack) và hàng đợi (queue) là hai cấu trúc "hạn chế" quyền truy cập: chỉ thao tác ở đỉnh (stack) hoặc ở hai đầu (queue). Chính sự hạn chế đó làm chúng trở thành công cụ mạnh cho đệ quy, DFS, BFS và mô phỏng.', algorithms: [stackOps, queueOps, brackets] };
export const hashTopic = { id: 'hash-table', intro: 'Bảng băm lưu cặp khóa–giá trị và cho phép tra cứu trung bình **O(1)** nhờ hàm băm biến khóa thành chỉ số ô. Đây là nền tảng của `dict` trong Python, `Map` trong JavaScript và `unordered_map` trong C++.', algorithms: [chaining, probing] };
