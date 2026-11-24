// V-Prism — graphs: representation, Dijkstra, BFS, DFS.
import { Recorder } from '../engine.js';

const DEFAULT_EDGES = 'A-B:4, A-C:2, B-C:1, B-D:5, C-D:8, C-E:10, D-E:2, D-F:6, E-F:3';
const PRESET_POS = { A: [80, 180], B: [210, 70], C: [210, 290], D: [380, 70], E: [380, 290], F: [540, 180], G: [540, 320], H: [80, 320] };

/** Parse "A-B:4, B-C" (undirected). Returns { nodes, edges, weighted }. */
function parseGraph(str, { requireWeights = false } = {}) {
  const tokens = String(str || '').split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean);
  if (!tokens.length) return { error: 'Hãy nhập ít nhất một cạnh, ví dụ "A-B:4".' };
  if (tokens.length > 16) return { error: 'Tối đa 16 cạnh để hình dễ nhìn.' };
  const edges = [];
  const ids = new Set();
  let weighted = false;
  for (const t of tokens) {
    const m = /^([A-H])\s*-\s*([A-H])(?:\s*:\s*(\d{1,2}))?$/i.exec(t);
    if (!m) return { error: `Cạnh "${t}" không hợp lệ. Dùng đỉnh A–H và dạng "A-B" hoặc "A-B:4" (trọng số 0..99).` };
    const u = m[1].toUpperCase();
    const v = m[2].toUpperCase();
    if (u === v) return { error: `Cạnh "${t}" nối một đỉnh với chính nó.` };
    if (edges.some((e) => (e.u === u && e.v === v) || (e.u === v && e.v === u))) return { error: `Cạnh ${u}-${v} bị lặp lại.` };
    if (m[3] !== undefined) weighted = true;
    else if (requireWeights) return { error: `Cạnh "${t}" cần trọng số, ví dụ "${u}-${v}:3".` };
    edges.push({ u, v, w: m[3] !== undefined ? Number(m[3]) : 1 });
    ids.add(u); ids.add(v);
  }
  const sorted = [...ids].sort();
  const usePreset = sorted.every((id) => PRESET_POS[id]) && sorted.length <= 6;
  const nodes = sorted.map((id, i) => {
    if (usePreset) return { id, x: PRESET_POS[id][0], y: PRESET_POS[id][1] };
    const ang = (2 * Math.PI * i) / sorted.length - Math.PI / 2;
    return { id, x: Math.round(320 + 230 * Math.cos(ang)), y: Math.round(180 + 140 * Math.sin(ang)) };
  });
  return { value: { nodes, edges, weighted } };
}

function adjacency(g) {
  const adj = Object.fromEntries(g.nodes.map((n) => [n.id, []]));
  for (const e of g.edges) { adj[e.u].push({ to: e.v, w: e.w }); adj[e.v].push({ to: e.u, w: e.w }); }
  for (const k of Object.keys(adj)) adj[k].sort((p, q) => p.to.localeCompare(q.to));
  return adj;
}

const graphInput = (def = DEFAULT_EDGES, opts = {}) => ({
  name: 'graph', label: 'Danh sách cạnh (vô hướng)', type: 'text', default: def,
  hint: 'Đỉnh A–H. Dạng "A-B:4" (có trọng số) hoặc "A-B". Cách nhau bởi dấu phẩy.',
  random: () => {
    const ids = ['A', 'B', 'C', 'D', 'E', 'F'];
    const es = [];
    for (let i = 1; i < ids.length; i++) es.push(`${ids[Math.floor(Math.random() * i)]}-${ids[i]}:${1 + Math.floor(Math.random() * 9)}`);
    for (let k = 0; k < 3; k++) {
      const a = ids[Math.floor(Math.random() * 6)];
      const b = ids[Math.floor(Math.random() * 6)];
      if (a !== b && !es.some((e) => e.startsWith(`${a}-${b}`) || e.startsWith(`${b}-${a}`))) es.push(`${a}-${b}:${1 + Math.floor(Math.random() * 9)}`);
    }
    return es.join(', ');
  },
  parse: (s) => parseGraph(s, opts),
});
const sourceInput = { name: 'src', label: 'Đỉnh xuất phát', type: 'text', default: 'A', random: () => 'A', parse: (s) => (/^[A-H]$/i.test(String(s).trim()) ? { value: String(s).trim().toUpperCase() } : { error: 'Đỉnh xuất phát phải là một chữ cái A–H.' }) };

function checkSource(g, src) {
  return g.nodes.some((n) => n.id === src);
}

// ---------------------------------------------------------------- representation
const representation = {
  id: 'representation', title: 'Biểu diễn đồ thị', renderer: 'graph',
  summary: 'Đồ thị gồm các đỉnh và cạnh. Hai cách lưu phổ biến: **danh sách kề** (mỗi đỉnh lưu các đỉnh kề — tiết kiệm bộ nhớ, O(V + E)) và **ma trận kề** (bảng V×V — kiểm tra cạnh O(1) nhưng tốn O(V²) bộ nhớ).',
  complexity: { best: 'Danh sách kề: O(V + E) bộ nhớ', avg: 'Ma trận kề: O(V²) bộ nhớ', worst: 'Kiểm tra cạnh: O(1) với ma trận, O(bậc) với danh sách', space: '—' },
  inputs: [graphInput()],
  pseudo: ['với mỗi cạnh (u, v, w):', '  thêm v vào danh_sách_kề[u]; thêm u vào danh_sách_kề[v]', '  ma_trận[u][v] ← w; ma_trận[v][u] ← w'],
  code: {
    python: 'edges = [("A", "B", 4), ("A", "C", 2), ("B", "C", 1)]\nadj = {}\nfor u, v, w in edges:\n    adj.setdefault(u, []).append((v, w))\n    adj.setdefault(v, []).append((u, w))\n\nnodes = sorted(adj)\nidx = {x: i for i, x in enumerate(nodes)}\nmatrix = [[0] * len(nodes) for _ in nodes]\nfor u, v, w in edges:\n    matrix[idx[u]][idx[v]] = matrix[idx[v]][idx[u]] = w',
    cpp: 'const int MAXV = 100;\nint matrixW[MAXV][MAXV];       // ma trận kề\nint adjTo[MAXV][MAXV], deg[MAXV]; // danh sách kề (bằng mảng)\nvoid addEdge(int u, int v, int w) {\n    matrixW[u][v] = matrixW[v][u] = w;\n    adjTo[u][deg[u]++] = v;\n    adjTo[v][deg[v]++] = u;\n}',
    javascript: 'const edges = [["A", "B", 4], ["A", "C", 2], ["B", "C", 1]];\nconst adj = new Map();\nfor (const [u, v, w] of edges) {\n  if (!adj.has(u)) adj.set(u, []);\n  if (!adj.has(v)) adj.set(v, []);\n  adj.get(u).push([v, w]);\n  adj.get(v).push([u, w]);\n}',
  },
  run({ graph }) {
    const r = new Recorder();
    const ids = graph.nodes.map((n) => n.id);
    const adjList = Object.fromEntries(ids.map((id) => [id, []]));
    const rows = ids.map(() => ids.map(() => 0));
    const base = (extra) => ({ ...graph, adjList, matrix: { labels: ids, rows, marks: extra.mm }, marks: extra.marks, edgeMarks: extra.em });
    r.add(base({}), 0, `Đồ thị có ${ids.length} đỉnh và ${graph.edges.length} cạnh. Bắt đầu với danh sách kề và ma trận kề rỗng.`);
    for (const e of graph.edges) {
      adjList[e.u].push(e.v);
      adjList[e.v].push(e.u);
      const i = ids.indexOf(e.u);
      const j = ids.indexOf(e.v);
      rows[i][j] = e.w;
      rows[j][i] = e.w;
      r.add(base({ marks: { [e.u]: 'compare', [e.v]: 'compare' }, em: { [`${e.u}-${e.v}`]: 'active' }, mm: { [`${i},${j}`]: 'active', [`${j},${i}`]: 'active' } }), 1, `Cạnh ${e.u}–${e.v}${graph.weighted ? ` (trọng số ${e.w})` : ''}: thêm vào danh sách kề của cả hai đỉnh và hai ô đối xứng của ma trận.`);
    }
    r.add(base({}), 2, `Xong. Danh sách kề dùng ${graph.edges.length * 2} mục; ma trận kề dùng ${ids.length * ids.length} ô.`);
    return r.frames;
  },
};

// ---------------------------------------------------------------- Dijkstra
const dijkstra = {
  id: 'dijkstra', title: 'Đường đi ngắn nhất (Dijkstra)', renderer: 'graph',
  summary: 'Tìm đường đi ngắn nhất từ một đỉnh tới mọi đỉnh khi trọng số không âm. Mỗi bước chọn đỉnh chưa chốt có khoảng cách nhỏ nhất, chốt nó, rồi "nới lỏng" các cạnh đi ra: nếu đi qua đỉnh này ngắn hơn thì cập nhật.',
  complexity: { best: 'O((V + E) log V)', avg: 'O((V + E) log V)', worst: 'O(V²) nếu không dùng heap', space: 'O(V)', note: 'Không dùng được khi có cạnh trọng số âm (dùng Bellman–Ford).' },
  inputs: [graphInput(DEFAULT_EDGES, { requireWeights: true }), sourceInput],
  pseudo: ['dist[mọi đỉnh] ← ∞; dist[nguồn] ← 0', 'trong khi còn đỉnh chưa chốt:', '  u ← đỉnh chưa chốt có dist nhỏ nhất; chốt u', '  với mỗi cạnh (u, v, w):', '    nếu dist[u] + w < dist[v]: dist[v] ← dist[u] + w; trước[v] ← u'],
  code: {
    python: 'import heapq\n\ndef dijkstra(adj, src):\n    dist = {v: float("inf") for v in adj}\n    dist[src] = 0\n    pq = [(0, src)]\n    while pq:\n        d, u = heapq.heappop(pq)\n        if d > dist[u]:\n            continue\n        for v, w in adj[u]:\n            if d + w < dist[v]:\n                dist[v] = d + w\n                heapq.heappush(pq, (dist[v], v))\n    return dist',
    cpp: '// Phiên bản O(V^2) không cần STL (phù hợp V nhỏ)\nconst int INF = 1e9;\nint n, w[100][100], dist[100];\nbool done_[100];\nvoid dijkstra(int src) {\n    for (int i = 0; i < n; i++) { dist[i] = INF; done_[i] = false; }\n    dist[src] = 0;\n    for (int it = 0; it < n; it++) {\n        int u = -1;\n        for (int i = 0; i < n; i++)\n            if (!done_[i] && (u == -1 || dist[i] < dist[u])) u = i;\n        if (dist[u] == INF) break;\n        done_[u] = true;\n        for (int v = 0; v < n; v++)\n            if (w[u][v] && dist[u] + w[u][v] < dist[v]) dist[v] = dist[u] + w[u][v];\n    }\n}',
    javascript: 'function dijkstra(adj, src) {\n  const dist = {}, done = new Set();\n  for (const v of Object.keys(adj)) dist[v] = Infinity;\n  dist[src] = 0;\n  while (done.size < Object.keys(adj).length) {\n    let u = null;\n    for (const v in dist) if (!done.has(v) && (u === null || dist[v] < dist[u])) u = v;\n    if (dist[u] === Infinity) break;\n    done.add(u);\n    for (const [v, w] of adj[u]) if (dist[u] + w < dist[v]) dist[v] = dist[u] + w;\n  }\n  return dist;\n}',
  },
  run({ graph, src }) {
    const r = new Recorder();
    if (!checkSource(graph, src)) { r.add({ ...graph }, 0, `Đỉnh ${src} không có trong đồ thị.`); return r.frames; }
    const adj = adjacency(graph);
    const dist = Object.fromEntries(graph.nodes.map((n) => [n.id, Infinity]));
    const prev = {};
    const done = new Set();
    dist[src] = 0;
    const treeEdges = () => Object.fromEntries(Object.entries(prev).map(([v, u]) => [`${u}-${v}`, 'done']));
    const st = (marks = {}, em = {}) => ({ ...graph, dist: { ...dist }, marks: { ...Object.fromEntries([...done].map((d) => [d, 'done'])), ...marks }, edgeMarks: { ...treeEdges(), ...em }, side: { title: 'Chưa chốt (theo dist)', items: graph.nodes.filter((n) => !done.has(n.id)).sort((a, b) => dist[a.id] - dist[b.id]).map((n) => `${n.id}:${dist[n.id] === Infinity ? '∞' : dist[n.id]}`), highlightFirst: true } });
    r.add(st({ [src]: 'active' }), 0, `dist[${src}] = 0, các đỉnh khác = ∞.`);
    while (done.size < graph.nodes.length) {
      let u = null;
      for (const n of graph.nodes) if (!done.has(n.id) && (u === null || dist[n.id] < dist[u])) u = n.id;
      if (dist[u] === Infinity) { r.add(st(), 2, 'Các đỉnh còn lại không đến được từ nguồn.'); break; }
      done.add(u);
      r.add(st({ [u]: 'pivot' }), 2, `Chốt ${u} với dist = ${dist[u]} (nhỏ nhất trong các đỉnh chưa chốt).`);
      for (const { to: v, w } of adj[u]) {
        if (done.has(v)) continue;
        const cand = dist[u] + w;
        if (cand < dist[v]) {
          const old = dist[v];
          dist[v] = cand;
          prev[v] = u;
          r.add(st({ [u]: 'pivot', [v]: 'swap' }, { [`${u}-${v}`]: 'active' }), 4, `Nới lỏng ${u}→${v}: ${dist[u]} + ${w} = ${cand} < ${old === Infinity ? '∞' : old} → cập nhật dist[${v}] = ${cand}.`);
        } else {
          r.add(st({ [u]: 'pivot', [v]: 'compare' }, { [`${u}-${v}`]: 'compare' }), 4, `${u}→${v}: ${dist[u]} + ${w} = ${cand} ≥ ${dist[v]} → giữ nguyên.`);
        }
      }
    }
    r.add(st(), 0, `Hoàn tất. Các cạnh xanh tạo thành cây đường đi ngắn nhất từ ${src}.`);
    return r.frames;
  },
};

// ---------------------------------------------------------------- BFS
const bfs = {
  id: 'bfs', title: 'Duyệt theo chiều rộng (BFS)', renderer: 'graph',
  summary: 'BFS loang ra từ đỉnh nguồn theo từng "lớp": thăm hết các đỉnh cách 1 cạnh, rồi 2 cạnh, … nhờ một hàng đợi. Với đồ thị không trọng số, BFS cho đường đi ít cạnh nhất.',
  complexity: { best: 'O(V + E)', avg: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
  inputs: [graphInput('A-B, A-C, B-D, C-D, C-E, D-F, E-F'), sourceInput],
  pseudo: ['đánh dấu nguồn; q ← [nguồn]; d[nguồn] ← 0', 'trong khi q không rỗng:', '  u ← q.lấy_đầu()', '  với mỗi v kề u chưa đánh dấu:', '    đánh dấu v; d[v] ← d[u] + 1; q.thêm(v)'],
  code: {
    python: 'from collections import deque\n\ndef bfs(adj, s):\n    dist = {s: 0}\n    q = deque([s])\n    order = []\n    while q:\n        u = q.popleft()\n        order.append(u)\n        for v in adj[u]:\n            if v not in dist:\n                dist[v] = dist[u] + 1\n                q.append(v)\n    return order, dist',
    cpp: 'int n, adj_[100][100], deg_[100], d[100], q[100];\nvoid bfs(int s) {\n    for (int i = 0; i < n; i++) d[i] = -1;\n    int head = 0, tail = 0;\n    d[s] = 0; q[tail++] = s;\n    while (head < tail) {\n        int u = q[head++];\n        for (int k = 0; k < deg_[u]; k++) {\n            int v = adj_[u][k];\n            if (d[v] == -1) { d[v] = d[u] + 1; q[tail++] = v; }\n        }\n    }\n}',
    javascript: 'function bfs(adj, s) {\n  const dist = { [s]: 0 }, q = [s], order = [];\n  for (let head = 0; head < q.length; head++) {\n    const u = q[head];\n    order.push(u);\n    for (const v of adj[u]) {\n      if (!(v in dist)) { dist[v] = dist[u] + 1; q.push(v); }\n    }\n  }\n  return { order, dist };\n}',
  },
  run({ graph, src }) {
    const r = new Recorder();
    if (!checkSource(graph, src)) { r.add({ ...graph, weighted: false }, 0, `Đỉnh ${src} không có trong đồ thị.`); return r.frames; }
    const adj = adjacency(graph);
    const dist = { [src]: 0 };
    const order = [];
    const q = [src];
    const tree = {};
    const st = (marks = {}, em = {}) => ({ ...graph, weighted: false, dist: { ...dist }, order: [...order], orderLabel: 'Thứ tự thăm', marks: { ...Object.fromEntries(order.map((x) => [x, 'done'])), ...Object.fromEntries(q.map((x) => [x, 'visited'])), ...marks }, edgeMarks: { ...tree, ...em }, side: { title: 'Hàng đợi', items: [...q], highlightFirst: true } });
    r.add(st({ [src]: 'active' }), 0, `Đánh dấu ${src}, đưa vào hàng đợi. Nhãn phía trên mỗi đỉnh là số cạnh tới nguồn.`);
    while (q.length) {
      const u = q.shift();
      order.push(u);
      r.add(st({ [u]: 'pivot' }), 2, `Lấy ${u} ra khỏi đầu hàng đợi.`);
      for (const { to: v } of adj[u]) {
        if (dist[v] === undefined) {
          dist[v] = dist[u] + 1;
          q.push(v);
          tree[`${u}-${v}`] = 'done';
          r.add(st({ [u]: 'pivot', [v]: 'swap' }, { [`${u}-${v}`]: 'active' }), 4, `${v} chưa thăm → d[${v}] = ${dist[v]}, thêm vào cuối hàng đợi.`);
        } else {
          r.add(st({ [u]: 'pivot', [v]: 'compare' }, { [`${u}-${v}`]: 'compare' }), 3, `${v} đã được đánh dấu → bỏ qua.`);
        }
      }
    }
    r.add(st(), 0, `Hoàn tất. Thứ tự BFS: ${order.join(' → ')}.`);
    return r.frames;
  },
};

// ---------------------------------------------------------------- DFS
const dfs = {
  id: 'dfs', title: 'Duyệt theo chiều sâu (DFS)', renderer: 'graph',
  summary: 'DFS đi sâu nhất có thể theo một nhánh rồi mới quay lui (backtrack) để thử nhánh khác — dùng đệ quy hoặc ngăn xếp. Ứng dụng: tìm thành phần liên thông, phát hiện chu trình, sắp xếp tô-pô, giải mê cung.',
  complexity: { best: 'O(V + E)', avg: 'O(V + E)', worst: 'O(V + E)', space: 'O(V)' },
  inputs: [graphInput('A-B, A-C, B-D, C-D, C-E, D-F, E-F, G-H'), sourceInput],
  pseudo: ['dfs(u):', '  đánh dấu u đã thăm', '  với mỗi v kề u:', '    nếu v chưa thăm: dfs(v)', '  // quay lui khi hết đỉnh kề'],
  code: {
    python: 'def dfs(adj, u, seen=None, order=None):\n    if seen is None:\n        seen, order = set(), []\n    seen.add(u)\n    order.append(u)\n    for v in adj[u]:\n        if v not in seen:\n            dfs(adj, v, seen, order)\n    return order\n\n# Đếm thành phần liên thông:\n# lặp mọi đỉnh, chưa thăm thì gọi dfs và tăng bộ đếm',
    cpp: 'int n, adj_[100][100], deg_[100];\nbool seen[100];\nvoid dfs(int u) {\n    seen[u] = true;\n    cout << u << " ";\n    for (int k = 0; k < deg_[u]; k++) {\n        int v = adj_[u][k];\n        if (!seen[v]) dfs(v);\n    }\n}',
    javascript: 'function dfs(adj, u, seen = new Set(), order = []) {\n  seen.add(u);\n  order.push(u);\n  for (const v of adj[u]) if (!seen.has(v)) dfs(adj, v, seen, order);\n  return order;\n}',
  },
  run({ graph, src }) {
    const r = new Recorder();
    if (!checkSource(graph, src)) { r.add({ ...graph, weighted: false }, 0, `Đỉnh ${src} không có trong đồ thị.`); return r.frames; }
    const adj = adjacency(graph);
    const seen = new Set();
    const order = [];
    const stack = [];
    const tree = {};
    const finished = new Set();
    const st = (marks = {}, em = {}) => ({ ...graph, weighted: false, order: [...order], orderLabel: 'Thứ tự khám phá', marks: { ...Object.fromEntries([...seen].map((x) => [x, finished.has(x) ? 'done' : 'visited'])), ...marks }, edgeMarks: { ...tree, ...em }, side: { title: 'Ngăn xếp đệ quy (đỉnh bên trái)', items: [...stack].reverse(), highlightFirst: true } });
    let components = 0;
    const visit = (u) => {
      seen.add(u);
      order.push(u);
      stack.push(u);
      r.add(st({ [u]: 'pivot' }), 1, `Vào dfs(${u}): đánh dấu đã thăm.`);
      for (const { to: v } of adj[u]) {
        if (!seen.has(v)) {
          tree[`${u}-${v}`] = 'done';
          r.add(st({ [u]: 'pivot', [v]: 'swap' }, { [`${u}-${v}`]: 'active' }), 3, `${v} chưa thăm → đi sâu: gọi dfs(${v}).`);
          visit(v);
          r.add(st({ [u]: 'pivot' }), 2, `Quay lui về ${u}, xét đỉnh kề tiếp theo.`);
        } else {
          r.add(st({ [u]: 'pivot', [v]: 'compare' }, { [`${u}-${v}`]: 'compare' }), 2, `${v} đã thăm → bỏ qua.`);
        }
      }
      finished.add(u);
      stack.pop();
      r.add(st({ [u]: 'done' }), 4, `Hết đỉnh kề của ${u} → kết thúc dfs(${u}).`);
    };
    components = 1;
    visit(src);
    for (const n of graph.nodes) {
      if (!seen.has(n.id)) {
        components += 1;
        r.add(st({ [n.id]: 'active' }), 0, `${n.id} chưa được thăm → thuộc một thành phần liên thông khác. Gọi dfs(${n.id}).`);
        visit(n.id);
      }
    }
    r.add(st(), 0, `Hoàn tất. Thứ tự DFS: ${order.join(' → ')}. Số thành phần liên thông: ${components}.`);
    return r.frames;
  },
};

export const graphTopic = { id: 'graph', intro: 'Đồ thị mô hình hóa các mối quan hệ: bản đồ đường đi, mạng xã hội, mạng máy tính… Trước khi chạy thuật toán, ta cần chọn cách **biểu diễn** đồ thị trong bộ nhớ. Sau đó, Dijkstra giải bài toán kinh điển: đường đi ngắn nhất.', algorithms: [representation, dijkstra] };
export const bfsTopic = { id: 'bfs', intro: 'BFS (Breadth-First Search) duyệt đồ thị theo từng lớp khoảng cách, giống vết dầu loang. Hãy quan sát **hàng đợi**: đỉnh vào trước được xử lý trước, nhờ đó các đỉnh gần nguồn luôn được thăm trước các đỉnh xa.', algorithms: [bfs] };
export const dfsTopic = { id: 'dfs', intro: 'DFS (Depth-First Search) giống đi trong mê cung: cứ đi sâu theo một lối, tới ngõ cụt thì quay lại ngã rẽ gần nhất. Quan sát **ngăn xếp đệ quy** để hiểu cách máy tính "nhớ" đường quay lui. Đồ thị mặc định có hai thành phần liên thông.', algorithms: [dfs] };
