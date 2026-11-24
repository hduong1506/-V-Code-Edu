// V-Prism — binary trees, binary search trees, heaps.
import { Recorder, parseNumberList, parseInteger, randomInts, randomDistinct } from '../engine.js';

// ---------- helpers ----------
function parseLevelOrder(str) {
  const parts = String(str || '').split(/[\s,;]+/).filter(Boolean);
  if (!parts.length) return { error: 'Hãy nhập các nút theo thứ tự từng tầng.' };
  if (parts.length > 15) return { error: 'Tối đa 15 vị trí (4 tầng).' };
  const vals = [];
  for (const p of parts) {
    if (/^(null|x|-|_)$/i.test(p)) { vals.push(null); continue; }
    const v = Number(p);
    if (!Number.isInteger(v) || v < 0 || v > 99) return { error: `"${p}" phải là số nguyên 0..99 hoặc null.` };
    vals.push(v);
  }
  if (vals[0] === null) return { error: 'Gốc không được là null.' };
  return { value: vals };
}

/** Build {nodes, root} from level-order array (heap-style indexing, null = missing). */
function treeFromLevel(vals) {
  const nodes = {};
  vals.forEach((v, i) => {
    if (v === null) return;
    const parentMissing = i > 0 && vals[Math.floor((i - 1) / 2)] === null;
    if (parentMissing) return;
    nodes[i] = { value: v, left: null, right: null };
  });
  Object.keys(nodes).forEach((k) => {
    const i = Number(k);
    if (nodes[2 * i + 1]) nodes[i].left = 2 * i + 1;
    if (nodes[2 * i + 2]) nodes[i].right = 2 * i + 2;
  });
  return { nodes, root: nodes[0] ? 0 : null };
}

const levelInput = {
  name: 'tree', label: 'Cây (theo từng tầng, null = trống)', type: 'text', default: '8 3 10 1 6 null 14 null null 4 7',
  hint: 'Ví dụ "1 2 3 null 5": gốc 1, con trái 2, con phải 3, 2 không có con trái, có con phải 5.',
  random: () => { const v = randomDistinct(7, 1, 60); return [v[0], v[1], v[2], Math.random() < 0.5 ? 'null' : v[3], v[4], v[5], Math.random() < 0.5 ? 'null' : v[6]].join(' '); },
  parse: parseLevelOrder,
};

const travCode = {
  python: 'def preorder(n):\n    if n:\n        print(n.val, end=" ")   # gốc\n        preorder(n.left)          # trái\n        preorder(n.right)         # phải\n\ndef inorder(n):\n    if n:\n        inorder(n.left); print(n.val, end=" "); inorder(n.right)\n\ndef postorder(n):\n    if n:\n        postorder(n.left); postorder(n.right); print(n.val, end=" ")\n\nfrom collections import deque\ndef level_order(root):\n    q = deque([root])\n    while q:\n        n = q.popleft()\n        print(n.val, end=" ")\n        if n.left: q.append(n.left)\n        if n.right: q.append(n.right)',
  cpp: 'struct Node { int val; Node *left, *right; };\nvoid preorder(Node* n) {\n    if (!n) return;\n    cout << n->val << " ";\n    preorder(n->left);\n    preorder(n->right);\n}\nvoid inorder(Node* n) {\n    if (!n) return;\n    inorder(n->left); cout << n->val << " "; inorder(n->right);\n}\nvoid postorder(Node* n) {\n    if (!n) return;\n    postorder(n->left); postorder(n->right); cout << n->val << " ";\n}',
  javascript: 'const preorder = (n, out = []) => { if (n) { out.push(n.val); preorder(n.left, out); preorder(n.right, out); } return out; };\nconst inorder = (n, out = []) => { if (n) { inorder(n.left, out); out.push(n.val); inorder(n.right, out); } return out; };\nconst postorder = (n, out = []) => { if (n) { postorder(n.left, out); postorder(n.right, out); out.push(n.val); } return out; };\nfunction levelOrder(root) {\n  const q = [root], out = [];\n  while (q.length) {\n    const n = q.shift();\n    out.push(n.val);\n    if (n.left) q.push(n.left);\n    if (n.right) q.push(n.right);\n  }\n  return out;\n}',
};

function traversal(kind) {
  const meta = {
    preorder: { title: 'Duyệt trước (NLR)', summary: 'Thăm gốc trước, rồi cây con trái, rồi cây con phải. Dùng để sao chép cây hoặc in cấu trúc thư mục.', pseudo: ['preorder(n):', '  nếu n rỗng: trả về', '  thăm n', '  preorder(n.trái)', '  preorder(n.phải)'] },
    inorder: { title: 'Duyệt giữa (LNR)', summary: 'Thăm cây con trái, rồi gốc, rồi cây con phải. Với cây nhị phân tìm kiếm, thứ tự duyệt giữa cho dãy TĂNG DẦN.', pseudo: ['inorder(n):', '  nếu n rỗng: trả về', '  inorder(n.trái)', '  thăm n', '  inorder(n.phải)'] },
    postorder: { title: 'Duyệt sau (LRN)', summary: 'Thăm hai cây con trước rồi mới tới gốc. Dùng khi cần xử lý con trước cha, ví dụ xóa cây hoặc tính giá trị biểu thức.', pseudo: ['postorder(n):', '  nếu n rỗng: trả về', '  postorder(n.trái)', '  postorder(n.phải)', '  thăm n'] },
    level: { title: 'Duyệt theo tầng (BFS)', summary: 'Thăm lần lượt từng tầng từ trên xuống, trong mỗi tầng từ trái sang phải, dùng một hàng đợi.', pseudo: ['q ← [gốc]', 'trong khi q không rỗng:', '  n ← q.lấy_đầu()', '  thăm n', '  đưa n.trái, n.phải (nếu có) vào q'] },
  }[kind];
  return {
    id: kind, title: meta.title, renderer: 'tree', summary: meta.summary,
    complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: kind === 'level' ? 'O(w) — w là bề rộng lớn nhất' : 'O(h) — h là chiều cao' },
    inputs: [levelInput], pseudo: meta.pseudo, code: travCode,
    run({ tree }) {
      const { nodes, root } = treeFromLevel(tree);
      const r = new Recorder();
      const out = [];
      const visited = {};
      const st = (extra = {}) => ({ nodes, root, marks: { ...visited, ...extra.marks }, output: out, side: extra.side });
      r.add(st(), 0, 'Bắt đầu duyệt từ gốc.');
      if (kind === 'level') {
        const q = [root];
        while (q.length) {
          const id = q.shift();
          r.add(st({ marks: { [id]: 'compare' }, side: { title: 'Hàng đợi', items: q.map((x) => nodes[x].value) } }), 2, `Lấy ${nodes[id].value} ra khỏi đầu hàng đợi.`);
          out.push(nodes[id].value);
          visited[id] = 'done';
          for (const c of [nodes[id].left, nodes[id].right]) if (c !== null) q.push(c);
          r.add(st({ side: { title: 'Hàng đợi', items: q.map((x) => nodes[x].value) } }), 4, `Thăm ${nodes[id].value}; đưa các con vào cuối hàng đợi.`);
        }
      } else {
        const stack = [];
        const visit = (id, line) => {
          out.push(nodes[id].value);
          visited[id] = 'done';
          r.add(st({ side: { title: 'Ngăn xếp đệ quy', items: [...stack].reverse() } }), line, `Thăm ${nodes[id].value}.`);
        };
        const rec = (id) => {
          if (id === null || id === undefined) return;
          stack.push(nodes[id].value);
          r.add(st({ marks: { [id]: 'compare' }, side: { title: 'Ngăn xếp đệ quy', items: [...stack].reverse() } }), 0, `Gọi ${kind}(${nodes[id].value}).`);
          if (kind === 'preorder') visit(id, 2);
          rec(nodes[id].left);
          if (kind === 'inorder') visit(id, 3);
          rec(nodes[id].right);
          if (kind === 'postorder') visit(id, 4);
          stack.pop();
        };
        rec(root);
      }
      r.add(st(), 0, `Hoàn tất. Thứ tự: ${out.join(' → ')}.`);
      return r.frames;
    },
  };
}

// ---------- BST ----------
function bstInsert(state, v) {
  const { nodes } = state;
  const id = state.nextId++;
  nodes[id] = { value: v, left: null, right: null };
  if (state.root === null) { state.root = id; return { id, path: [] }; }
  let cur = state.root;
  const path = [];
  for (;;) {
    path.push(cur);
    if (v < nodes[cur].value) { if (nodes[cur].left === null) { nodes[cur].left = id; break; } cur = nodes[cur].left; }
    else { if (nodes[cur].right === null) { nodes[cur].right = id; break; } cur = nodes[cur].right; }
  }
  return { id, path };
}

const bstBuildInput = { name: 'keys', label: 'Dãy khóa chèn lần lượt', type: 'list', default: '50 30 70 20 40 60 80 35', hint: '1–12 số nguyên phân biệt 0..99.', random: () => randomDistinct(9, 1, 99).join(' '), parse: (s) => { const p = parseNumberList(s, { min: 1, max: 12, lo: 0, hi: 99 }); if (p.error) return p; if (new Set(p.value).size !== p.value.length) return { error: 'Các khóa phải khác nhau.' }; return p; } };

const bstCode = {
  python: 'class Node:\n    def __init__(self, k):\n        self.key, self.left, self.right = k, None, None\n\ndef insert(root, k):\n    if root is None:\n        return Node(k)\n    if k < root.key:\n        root.left = insert(root.left, k)\n    else:\n        root.right = insert(root.right, k)\n    return root\n\ndef search(root, k):\n    while root and root.key != k:\n        root = root.left if k < root.key else root.right\n    return root\n\ndef delete(root, k):\n    if root is None:\n        return None\n    if k < root.key:\n        root.left = delete(root.left, k)\n    elif k > root.key:\n        root.right = delete(root.right, k)\n    else:\n        if root.left is None:\n            return root.right\n        if root.right is None:\n            return root.left\n        s = root.right\n        while s.left:\n            s = s.left           # nút kế tiếp (nhỏ nhất bên phải)\n        root.key = s.key\n        root.right = delete(root.right, s.key)\n    return root',
  cpp: 'struct Node { int key; Node *left = nullptr, *right = nullptr; };\nNode* insert(Node* r, int k) {\n    if (!r) { Node* n = new Node; n->key = k; return n; }\n    if (k < r->key) r->left = insert(r->left, k);\n    else r->right = insert(r->right, k);\n    return r;\n}\nNode* search(Node* r, int k) {\n    while (r && r->key != k) r = k < r->key ? r->left : r->right;\n    return r;\n}\nNode* erase(Node* r, int k) {\n    if (!r) return r;\n    if (k < r->key) r->left = erase(r->left, k);\n    else if (k > r->key) r->right = erase(r->right, k);\n    else {\n        if (!r->left) return r->right;\n        if (!r->right) return r->left;\n        Node* s = r->right;\n        while (s->left) s = s->left;\n        r->key = s->key;\n        r->right = erase(r->right, s->key);\n    }\n    return r;\n}',
  javascript: 'function insert(root, k) {\n  if (!root) return { key: k, left: null, right: null };\n  if (k < root.key) root.left = insert(root.left, k);\n  else root.right = insert(root.right, k);\n  return root;\n}\nfunction search(root, k) {\n  while (root && root.key !== k) root = k < root.key ? root.left : root.right;\n  return root;\n}\nfunction remove(root, k) {\n  if (!root) return null;\n  if (k < root.key) root.left = remove(root.left, k);\n  else if (k > root.key) root.right = remove(root.right, k);\n  else {\n    if (!root.left) return root.right;\n    if (!root.right) return root.left;\n    let s = root.right;\n    while (s.left) s = s.left;\n    root.key = s.key;\n    root.right = remove(root.right, s.key);\n  }\n  return root;\n}',
};

const bstBuild = {
  id: 'insert', title: 'Chèn (xây dựng cây)', renderer: 'tree',
  summary: 'Cây nhị phân tìm kiếm (BST): mọi khóa ở cây con trái nhỏ hơn nút, mọi khóa ở cây con phải lớn hơn. Để chèn, đi từ gốc: nhỏ hơn thì rẽ trái, lớn hơn thì rẽ phải, tới chỗ trống thì đặt khóa.',
  complexity: { best: 'O(log n)', avg: 'O(log n)', worst: 'O(n) — cây suy biến', space: 'O(n)', note: 'Thử nhập dãy tăng dần "10 20 30 40 50" để thấy cây suy biến thành danh sách.' },
  inputs: [bstBuildInput], pseudo: ['insert(n, k):', '  nếu n rỗng: tạo nút k', '  nếu k < n.khóa: insert(n.trái, k)', '  ngược lại: insert(n.phải, k)'], code: bstCode,
  run({ keys }) {
    const state = { nodes: {}, root: null, nextId: 0 };
    const r = new Recorder();
    r.add({ nodes: state.nodes, root: state.root }, 0, 'Cây ban đầu rỗng.');
    for (const k of keys) {
      const snapshotPath = [];
      let cur = state.root;
      while (cur !== null) {
        snapshotPath.push(cur);
        const go = k < state.nodes[cur].value ? 'left' : 'right';
        r.add({ nodes: state.nodes, root: state.root, marks: { [cur]: 'compare' } }, go === 'left' ? 2 : 3, `${k} ${go === 'left' ? '<' : '>'} ${state.nodes[cur].value} → rẽ ${go === 'left' ? 'trái' : 'phải'}.`, { k });
        cur = state.nodes[cur][go];
      }
      const { id } = bstInsert(state, k);
      r.add({ nodes: state.nodes, root: state.root, marks: { [id]: 'done' } }, 1, `Gặp chỗ trống → đặt ${k}.`, { k, 'độ sâu': snapshotPath.length });
    }
    r.add({ nodes: state.nodes, root: state.root }, 0, 'Hoàn tất. Duyệt giữa cây này sẽ cho dãy tăng dần.');
    return r.frames;
  },
};

const bstSearch = {
  id: 'search', title: 'Tìm kiếm', renderer: 'tree',
  summary: 'Mỗi lần so sánh loại bỏ được cả một cây con, giống tìm kiếm nhị phân. Số bước bằng độ sâu của nút cần tìm.',
  complexity: { best: 'O(1)', avg: 'O(log n)', worst: 'O(n)', space: 'O(1)' },
  inputs: [bstBuildInput, { name: 'x', label: 'Khóa cần tìm', type: 'number', default: '35', parse: (s) => parseInteger(s, { lo: 0, hi: 99, label: 'Khóa cần tìm' }), random: () => String(randomInts(1, 1, 99)[0]) }],
  pseudo: ['n ← gốc', 'trong khi n ≠ rỗng:', '  nếu k = n.khóa: tìm thấy', '  nếu k < n.khóa: n ← n.trái', '  ngược lại: n ← n.phải', 'không tìm thấy'], code: bstCode,
  run({ keys, x }) {
    const state = { nodes: {}, root: null, nextId: 0 };
    keys.forEach((k) => bstInsert(state, k));
    const r = new Recorder();
    let cur = state.root;
    const path = {};
    r.add({ nodes: state.nodes, root: state.root }, 0, `Tìm ${x} bắt đầu từ gốc.`);
    let steps = 0;
    while (cur !== null) {
      steps += 1;
      const n = state.nodes[cur];
      if (n.value === x) { r.add({ nodes: state.nodes, root: state.root, marks: { ...path, [cur]: 'done' } }, 2, `Tìm thấy ${x} sau ${steps} lần so sánh.`); return r.frames; }
      r.add({ nodes: state.nodes, root: state.root, marks: { ...path, [cur]: 'compare' } }, x < n.value ? 3 : 4, `${x} ${x < n.value ? '<' : '>'} ${n.value} → sang cây con ${x < n.value ? 'trái' : 'phải'}.`);
      path[cur] = 'dim';
      cur = x < n.value ? n.left : n.right;
    }
    r.add({ nodes: state.nodes, root: state.root, marks: path }, 5, `Gặp chỗ trống → ${x} không có trong cây.`);
    return r.frames;
  },
};

const bstDelete = {
  id: 'delete', title: 'Xóa (3 trường hợp)', renderer: 'tree',
  summary: 'Ba trường hợp: (1) nút lá → xóa luôn; (2) nút có một con → nối con lên thay; (3) nút có hai con → thay khóa bằng nút kế tiếp (nhỏ nhất của cây con phải) rồi xóa nút kế tiếp đó.',
  complexity: { best: 'O(log n)', avg: 'O(log n)', worst: 'O(n)', space: 'O(h)' },
  inputs: [bstBuildInput, { name: 'x', label: 'Khóa cần xóa', type: 'number', default: '30', parse: (s) => parseInteger(s, { lo: 0, hi: 99, label: 'Khóa cần xóa' }), random: () => '50' }],
  pseudo: ['tìm nút n chứa k', 'nếu n là lá: xóa n', 'nếu n có 1 con: thay n bằng con đó', 'nếu n có 2 con:', '  s ← nút nhỏ nhất của cây con phải', '  n.khóa ← s.khóa; xóa s'], code: bstCode,
  run({ keys, x }) {
    const state = { nodes: {}, root: null, nextId: 0 };
    keys.forEach((k) => bstInsert(state, k));
    const { nodes } = state;
    const r = new Recorder();
    const snapTree = (marks = {}) => ({ nodes, root: state.root, marks });
    let parent = null;
    let cur = state.root;
    while (cur !== null && nodes[cur].value !== x) {
      r.add(snapTree({ [cur]: 'compare' }), 0, `Tìm ${x}: ${x < nodes[cur].value ? 'rẽ trái' : 'rẽ phải'} tại ${nodes[cur].value}.`);
      parent = cur;
      cur = x < nodes[cur].value ? nodes[cur].left : nodes[cur].right;
    }
    if (cur === null) { r.add(snapTree(), 0, `Không có ${x} trong cây.`); return r.frames; }
    const replaceChild = (p, oldId, newId) => {
      if (p === null) state.root = newId;
      else if (nodes[p].left === oldId) nodes[p].left = newId;
      else nodes[p].right = newId;
    };
    const n = nodes[cur];
    r.add(snapTree({ [cur]: 'swap' }), 0, `Tìm thấy ${x}.`);
    if (n.left === null && n.right === null) {
      replaceChild(parent, cur, null);
      delete nodes[cur];
      r.add(snapTree(), 1, 'Trường hợp 1: nút lá → xóa trực tiếp.');
    } else if (n.left === null || n.right === null) {
      const child = n.left !== null ? n.left : n.right;
      r.add(snapTree({ [cur]: 'swap', [child]: 'active' }), 2, `Trường hợp 2: chỉ có một con (${nodes[child].value}) → nối con lên thay.`);
      replaceChild(parent, cur, child);
      delete nodes[cur];
      r.add(snapTree({ [child]: 'done' }), 2, 'Đã xóa.');
    } else {
      let sp = cur;
      let s = n.right;
      r.add(snapTree({ [cur]: 'swap', [s]: 'compare' }), 4, 'Trường hợp 3: có hai con → tìm nút nhỏ nhất ở cây con phải.');
      while (nodes[s].left !== null) { sp = s; s = nodes[s].left; r.add(snapTree({ [cur]: 'swap', [s]: 'compare' }), 4, `Đi sang trái: ${nodes[s].value}.`); }
      r.add(snapTree({ [cur]: 'swap', [s]: 'pivot' }), 4, `Nút kế tiếp là ${nodes[s].value}.`);
      n.value = nodes[s].value;
      r.add(snapTree({ [cur]: 'active', [s]: 'pivot' }), 5, `Chép ${n.value} lên vị trí của ${x}.`);
      if (sp === cur) nodes[sp].right = nodes[s].right; else nodes[sp].left = nodes[s].right;
      delete nodes[s];
      r.add(snapTree({ [cur]: 'done' }), 5, 'Xóa nút kế tiếp (nó có tối đa một con phải). Cây vẫn đúng tính chất BST.');
    }
    return r.frames;
  },
};

// ---------- HEAP (max-heap, array-based) ----------
function heapTree(arr, size = arr.length) {
  const nodes = {};
  for (let i = 0; i < size; i++) nodes[i] = { value: arr[i], left: 2 * i + 1 < size ? 2 * i + 1 : null, right: 2 * i + 2 < size ? 2 * i + 2 : null };
  return { nodes, root: size ? 0 : null };
}
function heapState(arr, size, marks = {}, extra = {}) {
  const arrayMarks = { ...marks };
  for (let i = size; i < arr.length; i++) arrayMarks[i] = 'done';
  return { ...heapTree(arr, size), marks, array: arr, arrayMarks, arrayLabel: 'Mảng biểu diễn heap', ...extra };
}

const heapInput = (def) => ({ name: 'arr', label: 'Dãy số', type: 'list', default: def, hint: '2–12 số nguyên 0..99.', random: () => randomInts(9, 1, 99).join(' '), parse: (s) => parseNumberList(s, { min: 2, max: 12, lo: 0, hi: 99 }) });

const heapCode = {
  python: 'def sift_down(a, i, n):\n    while True:\n        big, l, r = i, 2 * i + 1, 2 * i + 2\n        if l < n and a[l] > a[big]: big = l\n        if r < n and a[r] > a[big]: big = r\n        if big == i:\n            return\n        a[i], a[big] = a[big], a[i]\n        i = big\n\ndef build_heap(a):\n    for i in range(len(a) // 2 - 1, -1, -1):\n        sift_down(a, i, len(a))\n\ndef heap_push(a, x):          # chèn + sift-up\n    a.append(x)\n    i = len(a) - 1\n    while i > 0 and a[(i - 1) // 2] < a[i]:\n        a[i], a[(i - 1) // 2] = a[(i - 1) // 2], a[i]\n        i = (i - 1) // 2\n\ndef heap_sort(a):\n    build_heap(a)\n    for end in range(len(a) - 1, 0, -1):\n        a[0], a[end] = a[end], a[0]\n        sift_down(a, 0, end)\n# Python có sẵn heapq (min-heap)',
  cpp: 'void siftDown(int a[], int i, int n) {\n    while (true) {\n        int big = i, l = 2 * i + 1, r = 2 * i + 2;\n        if (l < n && a[l] > a[big]) big = l;\n        if (r < n && a[r] > a[big]) big = r;\n        if (big == i) return;\n        int t = a[i]; a[i] = a[big]; a[big] = t;\n        i = big;\n    }\n}\nvoid heapSort(int a[], int n) {\n    for (int i = n / 2 - 1; i >= 0; i--) siftDown(a, i, n);\n    for (int end = n - 1; end > 0; end--) {\n        int t = a[0]; a[0] = a[end]; a[end] = t;\n        siftDown(a, 0, end);\n    }\n}\n// STL: priority_queue<int> pq;',
  javascript: 'function siftDown(a, i, n) {\n  for (;;) {\n    let big = i;\n    const l = 2 * i + 1, r = 2 * i + 2;\n    if (l < n && a[l] > a[big]) big = l;\n    if (r < n && a[r] > a[big]) big = r;\n    if (big === i) return;\n    [a[i], a[big]] = [a[big], a[i]];\n    i = big;\n  }\n}\nfunction heapSort(a) {\n  for (let i = (a.length >> 1) - 1; i >= 0; i--) siftDown(a, i, a.length);\n  for (let end = a.length - 1; end > 0; end--) {\n    [a[0], a[end]] = [a[end], a[0]];\n    siftDown(a, 0, end);\n  }\n  return a;\n}',
};

function recordSiftDown(r, a, i, n, line, prefix = '') {
  for (;;) {
    let big = i;
    const l = 2 * i + 1;
    const rr = 2 * i + 2;
    const cmp = { [i]: 'pivot' };
    if (l < n) cmp[l] = 'compare';
    if (rr < n) cmp[rr] = 'compare';
    if (l < n && a[l] > a[big]) big = l;
    if (rr < n && a[rr] > a[big]) big = rr;
    if (l >= n) { r.add(heapState(a, n, { [i]: 'active' }), line, `${prefix}${a[i]} là lá → dừng.`); return; }
    r.add(heapState(a, n, cmp), line, `${prefix}So sánh ${a[i]} với các con ${[l, rr].filter((c) => c < n).map((c) => a[c]).join(' và ')}.`);
    if (big === i) { r.add(heapState(a, n, { [i]: 'done' }), line, `${prefix}${a[i]} đã lớn hơn các con → dừng.`); return; }
    [a[i], a[big]] = [a[big], a[i]];
    r.add(heapState(a, n, { [i]: 'swap', [big]: 'swap' }), line, `${prefix}Đổi chỗ ${a[big]} xuống, ${a[i]} lên.`);
    i = big;
  }
}

const buildHeap = {
  id: 'build', title: 'Xây dựng heap', renderer: 'tree',
  summary: 'Max-heap là cây nhị phân đầy đủ trong đó mỗi nút ≥ các con, nên phần tử lớn nhất luôn ở gốc. Heap được lưu gọn trong mảng: con của nút i là 2i+1 và 2i+2. Xây heap bằng cách "vun đống" (sift-down) từ nút trong cuối cùng về gốc — chỉ O(n).',
  complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
  inputs: [heapInput('4 10 3 5 1 8 9 2 7')], pseudo: ['lặp i từ n/2 - 1 xuống 0:', '  sift_down(i):', '    big ← con lớn nhất của i', '    nếu a[big] > a[i]: đổi chỗ, tiếp tục với big'], code: heapCode,
  run({ arr }) {
    const a = [...arr];
    const r = new Recorder();
    r.add(heapState(a, a.length), 0, 'Xem mảng như một cây nhị phân đầy đủ (chưa phải heap).');
    for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) {
      r.add(heapState(a, a.length, { [i]: 'pivot' }), 1, `Vun đống tại nút ${a[i]} (chỉ số ${i}).`);
      recordSiftDown(r, a, i, a.length, 3);
    }
    r.add(heapState(a, a.length, { 0: 'done' }), 0, `Hoàn tất: gốc ${a[0]} là phần tử lớn nhất.`);
    return r.frames;
  },
};

const heapInsert = {
  id: 'insert', title: 'Chèn (sift-up) & lấy max', renderer: 'tree',
  summary: 'Chèn: đặt phần tử mới vào cuối mảng rồi "nổi lên" (sift-up) trong khi lớn hơn cha. Lấy max: lấy gốc, đưa phần tử cuối lên gốc rồi "chìm xuống" (sift-down). Đây là cách hàng đợi ưu tiên hoạt động.',
  complexity: { best: 'O(1)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
  inputs: [heapInput('15 3 17 10 84 19 6 22 9')], pseudo: ['push(x): thêm x vào cuối; i ← n-1', '  trong khi i > 0 và a[cha(i)] < a[i]: đổi chỗ; i ← cha(i)', 'pop_max(): kết quả ← a[0]', '  a[0] ← a[n-1]; n ← n-1; sift_down(0)'], code: heapCode,
  run({ arr }) {
    const a = [];
    const r = new Recorder();
    r.add(heapState(a, 0), 0, 'Heap ban đầu rỗng — chèn lần lượt từng phần tử.');
    for (const x of arr) {
      a.push(x);
      let i = a.length - 1;
      r.add(heapState(a, a.length, { [i]: 'active' }), 0, `Chèn ${x} vào cuối mảng (vị trí ${i}).`);
      while (i > 0 && a[Math.floor((i - 1) / 2)] < a[i]) {
        const p = Math.floor((i - 1) / 2);
        r.add(heapState(a, a.length, { [i]: 'compare', [p]: 'compare' }), 1, `${a[i]} > cha ${a[p]} → nổi lên.`);
        [a[i], a[p]] = [a[p], a[i]];
        i = p;
        r.add(heapState(a, a.length, { [i]: 'swap' }), 1, 'Đã đổi chỗ.');
      }
    }
    r.add(heapState(a, a.length, { 0: 'done' }), 0, `Max hiện tại: ${a[0]}. Giờ lấy max hai lần.`);
    for (let t = 0; t < 2 && a.length; t++) {
      const max = a[0];
      r.add(heapState(a, a.length, { 0: 'swap', [a.length - 1]: 'pivot' }), 2, `pop_max(): lấy ${max}; đưa phần tử cuối ${a[a.length - 1]} lên gốc.`);
      a[0] = a[a.length - 1];
      a.pop();
      if (a.length) recordSiftDown(r, a, 0, a.length, 3);
      r.add(heapState(a, a.length, a.length ? { 0: 'done' } : {}), 3, a.length ? `Đã lấy ${max}. Max mới: ${a[0]}.` : `Đã lấy ${max}. Heap rỗng.`);
    }
    return r.frames;
  },
};

const heapSort = {
  id: 'heapsort', title: 'Sắp xếp vun đống (heap sort)', renderer: 'tree',
  summary: 'Xây max-heap, rồi lặp: đổi gốc (lớn nhất) với phần tử cuối vùng heap, thu nhỏ vùng heap và vun đống lại tại gốc. Phần cuối mảng dần trở thành dãy đã sắp xếp.',
  complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', note: 'Không ổn định nhưng không cần bộ nhớ phụ.' },
  inputs: [heapInput('12 11 13 5 6 7 20 1')], pseudo: ['build_heap(a)', 'lặp end từ n-1 xuống 1:', '  đổi a[0], a[end]', '  sift_down(0) trong vùng a[0..end-1]'], code: heapCode,
  run({ arr }) {
    const a = [...arr];
    const r = new Recorder();
    r.add(heapState(a, a.length), 0, 'Bước 1: xây max-heap.');
    for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) recordSiftDown(r, a, i, a.length, 0);
    for (let end = a.length - 1; end > 0; end--) {
      r.add(heapState(a, end + 1, { 0: 'swap', [end]: 'swap' }), 2, `Đổi gốc ${a[0]} (lớn nhất) với ${a[end]} ở cuối vùng heap.`);
      [a[0], a[end]] = [a[end], a[0]];
      r.add(heapState(a, end, {}), 2, `${a[end]} đã ở đúng vị trí cuối cùng.`);
      recordSiftDown(r, a, 0, end, 3);
    }
    r.add(heapState(a, 0), 0, `Hoàn tất: ${a.join(' ')}.`);
    return r.frames;
  },
};

export const binaryTreeTopic = { id: 'binary-tree', intro: 'Cây nhị phân là cấu trúc phân cấp: mỗi nút có tối đa hai con (trái và phải). Bốn cách duyệt cây cơ bản cho ra bốn thứ tự khác nhau — hãy chạy thử cả bốn trên cùng một cây và so sánh kết quả.', algorithms: ['preorder', 'inorder', 'postorder', 'level'].map(traversal) };
export const bstTopic = { id: 'bst', intro: 'Cây nhị phân tìm kiếm giữ các khóa "có thứ tự": trái nhỏ hơn, phải lớn hơn. Nhờ đó tìm kiếm, chèn, xóa đều chỉ mất thời gian tỉ lệ với chiều cao cây — $O(\\log n)$ khi cây cân bằng.', algorithms: [bstBuild, bstSearch, bstDelete] };
export const heapTopic = { id: 'heap', intro: 'Heap (đống) là cây nhị phân đầy đủ thỏa tính chất heap: với max-heap, mỗi nút lớn hơn hoặc bằng các con. Heap là nền tảng của **hàng đợi ưu tiên** (priority queue), thuật toán Dijkstra và heap sort.', algorithms: [buildHeap, heapInsert, heapSort] };
