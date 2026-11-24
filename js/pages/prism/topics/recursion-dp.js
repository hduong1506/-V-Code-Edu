// V-Prism — recursion & dynamic programming.
import { Recorder, parseNumberList, parseInteger, randomInts } from '../engine.js';

const nInput = (def, lo, hi, label = 'n') => ({ name: 'n', label, type: 'number', default: String(def), hint: `Số nguyên ${lo}..${hi} (giới hạn để cây lời gọi vừa màn hình).`, random: () => String(lo + Math.floor(Math.random() * (hi - lo + 1))), parse: (s) => parseInteger(s, { lo, hi, label }) });

// ---------------------------------------------------------------- factorial
const factorial = {
  id: 'factorial', title: 'Giai thừa n!', renderer: 'calltree',
  summary: 'Một hàm đệ quy luôn có (1) **trường hợp cơ sở** dừng đệ quy và (2) **bước đệ quy** gọi lại chính nó với bài toán nhỏ hơn. n! = n × (n−1)!, với 0! = 1. Quan sát ngăn xếp lời gọi lớn dần rồi "tháo" ngược lại.',
  complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n) ngăn xếp' },
  inputs: [nInput(5, 1, 8)],
  pseudo: ['fact(n):', '  nếu n ≤ 1: trả về 1        // cơ sở', '  trả về n × fact(n - 1)     // đệ quy'],
  code: {
    python: 'def fact(n):\n    if n <= 1:\n        return 1\n    return n * fact(n - 1)\n\nprint(fact(5))  # 120',
    cpp: 'long long fact(int n) {\n    if (n <= 1) return 1;\n    return n * fact(n - 1);\n}',
    javascript: 'function fact(n) {\n  if (n <= 1) return 1;\n  return n * fact(n - 1);\n}',
  },
  run({ n }) {
    const r = new Recorder();
    const nodes = [];
    const stack = [];
    let id = 0;
    const rec = (k, parent) => {
      const me = id++;
      nodes.push({ id: me, parent, label: `fact(${k})`, status: 'active' });
      stack.push(`fact(${k})`);
      r.add({ nodes, stack }, 0, `Gọi fact(${k}).`, { n: k, 'độ sâu': stack.length });
      let res;
      if (k <= 1) {
        res = 1;
        r.add({ nodes, stack }, 1, `${k} ≤ 1 → trường hợp cơ sở, trả về 1.`, { n: k });
      } else {
        nodes[me].status = 'waiting';
        r.add({ nodes, stack }, 2, `Cần fact(${k - 1}) trước khi tính ${k} × fact(${k - 1}).`, { n: k });
        const sub = rec(k - 1, me);
        res = k * sub;
        nodes[me].status = 'active';
        r.add({ nodes, stack }, 2, `fact(${k - 1}) = ${sub} → fact(${k}) = ${k} × ${sub} = ${res}.`, { n: k, 'kết quả': res });
      }
      nodes[me].status = 'done';
      nodes[me].result = res;
      stack.pop();
      return res;
    };
    const res = rec(n, null);
    r.add({ nodes, stack }, 0, `Kết quả: ${n}! = ${res}.`);
    return r.frames;
  },
};

// ---------------------------------------------------------------- fibonacci call tree
const fibTree = {
  id: 'fibonacci', title: 'Fibonacci & cây lời gọi', renderer: 'calltree',
  summary: 'fib(n) = fib(n−1) + fib(n−2). Cài đặt đệ quy "ngây thơ" gọi lại cùng một bài toán con rất nhiều lần — cây lời gọi phình to theo cấp số mũ. Đây chính là động lực của quy hoạch động (xem chủ đề Quy hoạch động).',
  complexity: { best: 'O(φⁿ) ≈ O(1,618ⁿ)', avg: 'O(φⁿ)', worst: 'O(φⁿ)', space: 'O(n) ngăn xếp' },
  inputs: [nInput(5, 1, 6)],
  pseudo: ['fib(n):', '  nếu n < 2: trả về n', '  trả về fib(n - 1) + fib(n - 2)'],
  code: {
    python: 'def fib(n):\n    if n < 2:\n        return n\n    return fib(n - 1) + fib(n - 2)',
    cpp: 'int fib(int n) {\n    if (n < 2) return n;\n    return fib(n - 1) + fib(n - 2);\n}',
    javascript: 'const fib = (n) => (n < 2 ? n : fib(n - 1) + fib(n - 2));',
  },
  run({ n }) {
    const r = new Recorder();
    const nodes = [];
    const stack = [];
    const counts = {};
    let id = 0;
    const rec = (k, parent) => {
      const me = id++;
      counts[k] = (counts[k] || 0) + 1;
      nodes.push({ id: me, parent, label: `fib(${k})`, status: 'active' });
      stack.push(`fib(${k})`);
      r.add({ nodes, stack }, 0, `Gọi fib(${k})${counts[k] > 1 ? ` — lần thứ ${counts[k]} tính lại fib(${k})!` : ''}.`, { 'tổng lời gọi': id });
      let res;
      if (k < 2) { res = k; r.add({ nodes, stack }, 1, `Cơ sở: fib(${k}) = ${k}.`); }
      else {
        nodes[me].status = 'waiting';
        const a = rec(k - 1, me);
        const b = rec(k - 2, me);
        res = a + b;
        nodes[me].status = 'active';
        r.add({ nodes, stack }, 2, `fib(${k}) = ${a} + ${b} = ${res}.`);
      }
      nodes[me].status = counts[k] > 1 ? 'memo' : 'done';
      nodes[me].result = res;
      stack.pop();
      return res;
    };
    const res = rec(n, null);
    const dup = Object.entries(counts).filter(([, c]) => c > 1).map(([k, c]) => `fib(${k})×${c}`).join(', ');
    r.add({ nodes, stack }, 0, `fib(${n}) = ${res} sau ${id} lời gọi. Bị tính lặp: ${dup || 'không có'} (nút màu tím).`, { 'tổng lời gọi': id });
    return r.frames;
  },
};

// ---------------------------------------------------------------- hanoi
const hanoi = {
  id: 'hanoi', title: 'Tháp Hà Nội', renderer: 'hanoi',
  summary: 'Chuyển n đĩa từ cọc A sang cọc C, mỗi lần một đĩa, không đặt đĩa lớn lên đĩa nhỏ. Ý tưởng đệ quy: chuyển n−1 đĩa sang cọc trung gian, chuyển đĩa lớn nhất, rồi chuyển n−1 đĩa lên trên nó. Cần đúng 2ⁿ − 1 bước.',
  complexity: { best: 'O(2ⁿ)', avg: 'O(2ⁿ)', worst: 'O(2ⁿ)', space: 'O(n) ngăn xếp' },
  inputs: [nInput(3, 1, 5, 'Số đĩa n')],
  pseudo: ['hanoi(n, nguồn, đích, trung_gian):', '  nếu n = 0: trả về', '  hanoi(n-1, nguồn, trung_gian, đích)', '  chuyển đĩa n: nguồn → đích', '  hanoi(n-1, trung_gian, đích, nguồn)'],
  code: {
    python: 'def hanoi(n, src="A", dst="C", via="B"):\n    if n == 0:\n        return\n    hanoi(n - 1, src, via, dst)\n    print(f"Chuyển đĩa {n}: {src} → {dst}")\n    hanoi(n - 1, via, dst, src)',
    cpp: 'void hanoi(int n, char src, char dst, char via) {\n    if (n == 0) return;\n    hanoi(n - 1, src, via, dst);\n    cout << "Chuyen dia " << n << ": " << src << " -> " << dst << endl;\n    hanoi(n - 1, via, dst, src);\n}',
    javascript: 'function hanoi(n, src = "A", dst = "C", via = "B") {\n  if (n === 0) return;\n  hanoi(n - 1, src, via, dst);\n  console.log(`Chuyển đĩa ${n}: ${src} → ${dst}`);\n  hanoi(n - 1, via, dst, src);\n}',
  },
  run({ n }) {
    const r = new Recorder();
    const pegs = [Array.from({ length: n }, (_, i) => n - i), [], []];
    const names = ['A', 'B', 'C'];
    let moves = 0;
    r.add({ pegs, n, moves }, 0, `${n} đĩa ở cọc A. Mục tiêu: chuyển hết sang cọc C.`);
    const rec = (k, s, d, v) => {
      if (k === 0) return;
      rec(k - 1, s, v, d);
      r.add({ pegs, n, moves, from: s, to: d, moving: k }, 3, `Chuyển đĩa ${k}: ${names[s]} → ${names[d]}.`, { 'bước': moves + 1 });
      pegs[d].push(pegs[s].pop());
      moves += 1;
      r.add({ pegs, n, moves, to: d }, 3, `Đã chuyển đĩa ${k}.`, { 'bước': moves });
      rec(k - 1, v, d, s);
    };
    rec(n, 0, 2, 1);
    r.add({ pegs, n, moves }, 0, `Hoàn tất sau ${moves} bước = 2^${n} − 1.`);
    return r.frames;
  },
};

// ---------------------------------------------------------------- DP: fib memo vs tabulation
const fibMemo = {
  id: 'fib-memo', title: 'Fibonacci có nhớ (top-down)', renderer: 'calltree',
  summary: 'Quy hoạch động "từ trên xuống": vẫn đệ quy, nhưng lưu kết quả mỗi bài toán con vào bảng nhớ. Lần sau gặp lại chỉ cần tra bảng — cây lời gọi co lại từ O(φⁿ) còn O(n).',
  complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n)' },
  inputs: [nInput(6, 2, 9)],
  pseudo: ['fib(n):', '  nếu n trong bảng_nhớ: trả về bảng_nhớ[n]', '  nếu n < 2: kq ← n', '  ngược lại: kq ← fib(n-1) + fib(n-2)', '  bảng_nhớ[n] ← kq; trả về kq'],
  code: {
    python: 'from functools import lru_cache\n\n@lru_cache(maxsize=None)\ndef fib(n):\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\n\n# hoặc tự cài:\nmemo = {}\ndef fib2(n):\n    if n in memo:\n        return memo[n]\n    memo[n] = n if n < 2 else fib2(n - 1) + fib2(n - 2)\n    return memo[n]',
    cpp: 'long long memo[100];\nbool has[100];\nlong long fib(int n) {\n    if (has[n]) return memo[n];\n    long long kq = n < 2 ? n : fib(n - 1) + fib(n - 2);\n    has[n] = true;\n    return memo[n] = kq;\n}',
    javascript: 'const memo = new Map();\nfunction fib(n) {\n  if (memo.has(n)) return memo.get(n);\n  const kq = n < 2 ? n : fib(n - 1) + fib(n - 2);\n  memo.set(n, kq);\n  return kq;\n}',
  },
  run({ n }) {
    const r = new Recorder();
    const nodes = [];
    const stack = [];
    const memo = new Array(n + 1).fill(null);
    let id = 0;
    const st = (mm = {}) => ({ nodes, stack, memo: [...memo], memoMarks: mm });
    const rec = (k, parent) => {
      const me = id++;
      nodes.push({ id: me, parent, label: `fib(${k})`, status: 'active' });
      stack.push(`fib(${k})`);
      if (memo[k] !== null) {
        nodes[me].status = 'memo';
        nodes[me].result = memo[k];
        r.add(st({ [k]: 'active' }), 1, `fib(${k}) đã có trong bảng nhớ = ${memo[k]} → trả về ngay, không gọi tiếp!`, { 'tổng lời gọi': id });
        stack.pop();
        return memo[k];
      }
      r.add(st(), 0, `Gọi fib(${k}) — chưa có trong bảng nhớ.`, { 'tổng lời gọi': id });
      let res;
      if (k < 2) res = k;
      else { nodes[me].status = 'waiting'; res = rec(k - 1, me) + rec(k - 2, me); }
      memo[k] = res;
      nodes[me].status = 'done';
      nodes[me].result = res;
      r.add(st({ [k]: 'done' }), 4, `Lưu bảng_nhớ[${k}] = ${res}.`, { 'tổng lời gọi': id });
      stack.pop();
      return res;
    };
    const res = rec(n, null);
    r.add(st(), 0, `fib(${n}) = ${res} chỉ với ${id} lời gọi (đệ quy thường cần nhiều hơn rất nhiều).`);
    return r.frames;
  },
};

const fibTab = {
  id: 'fib-table', title: 'Fibonacci lập bảng (bottom-up)', renderer: 'table',
  summary: 'Quy hoạch động "từ dưới lên": tính các bài toán con nhỏ nhất trước rồi điền dần vào bảng — không cần đệ quy. dp[i] = dp[i−1] + dp[i−2].',
  complexity: { best: 'O(n)', avg: 'O(n)', worst: 'O(n)', space: 'O(n), có thể giảm còn O(1)' },
  inputs: [nInput(10, 2, 20)],
  pseudo: ['dp[0] ← 0; dp[1] ← 1', 'lặp i từ 2 đến n:', '  dp[i] ← dp[i-1] + dp[i-2]', 'trả về dp[n]'],
  code: {
    python: 'def fib(n):\n    dp = [0, 1] + [0] * (n - 1)\n    for i in range(2, n + 1):\n        dp[i] = dp[i - 1] + dp[i - 2]\n    return dp[n]',
    cpp: 'long long fib(int n) {\n    long long dp[100];\n    dp[0] = 0; dp[1] = 1;\n    for (int i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];\n    return dp[n];\n}',
    javascript: 'function fib(n) {\n  const dp = [0, 1];\n  for (let i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];\n  return dp[n];\n}',
  },
  run({ n }) {
    const r = new Recorder();
    const dp = new Array(n + 1).fill(null);
    dp[0] = 0; dp[1] = 1;
    const st = (marks = {}) => ({ cells: [dp.map((v) => v)], colLabels: dp.map((_, i) => i), rowLabels: ['dp'], corner: 'i', marks });
    r.add(st({ '0,0': 'done', '0,1': 'done' }), 0, 'Khởi tạo hai bài toán con nhỏ nhất: dp[0] = 0, dp[1] = 1.');
    for (let i = 2; i <= n; i++) {
      r.add(st({ [`0,${i - 1}`]: 'compare', [`0,${i - 2}`]: 'compare' }), 2, `dp[${i}] = dp[${i - 1}] + dp[${i - 2}] = ${dp[i - 1]} + ${dp[i - 2]}.`, { i });
      dp[i] = dp[i - 1] + dp[i - 2];
      r.add(st({ [`0,${i}`]: 'done' }), 2, `dp[${i}] = ${dp[i]}.`, { i, 'dp[i]': dp[i] });
    }
    r.add(st({ [`0,${n}`]: 'active' }), 3, `fib(${n}) = ${dp[n]} sau đúng ${n - 1} phép cộng.`);
    return r.frames;
  },
};

// ---------------------------------------------------------------- knapsack
const knapsack = {
  id: 'knapsack', title: 'Bài toán cái túi 0/1', renderer: 'table',
  summary: 'Có n đồ vật (trọng lượng wᵢ, giá trị vᵢ) và túi chứa tối đa W. Chọn đồ vật (mỗi món lấy hoặc không) để tổng giá trị lớn nhất. dp[i][c] = giá trị tốt nhất khi dùng i món đầu với sức chứa c: không lấy món i → dp[i−1][c]; lấy → dp[i−1][c−wᵢ] + vᵢ.',
  complexity: { best: 'O(n·W)', avg: 'O(n·W)', worst: 'O(n·W)', space: 'O(n·W), có thể giảm còn O(W)' },
  inputs: [
    { name: 'w', label: 'Trọng lượng các món', type: 'list', default: '1 3 4 5', hint: '1–6 số nguyên 1..10.', random: () => randomInts(4, 1, 6).join(' '), parse: (s) => parseNumberList(s, { min: 1, max: 6, lo: 1, hi: 10 }) },
    { name: 'v', label: 'Giá trị các món', type: 'list', default: '1 4 5 7', hint: 'Cùng số lượng với trọng lượng, 1..50.', random: () => randomInts(4, 1, 15).join(' '), parse: (s) => parseNumberList(s, { min: 1, max: 6, lo: 1, hi: 50 }) },
    { name: 'W', label: 'Sức chứa W', type: 'number', default: '7', random: () => String(5 + Math.floor(Math.random() * 6)), parse: (s) => parseInteger(s, { lo: 1, hi: 12, label: 'Sức chứa W' }) },
  ],
  pseudo: ['dp[0][c] ← 0 với mọi c', 'lặp i từ 1 đến n, c từ 0 đến W:', '  dp[i][c] ← dp[i-1][c]                    // không lấy món i', '  nếu w[i] ≤ c: dp[i][c] ← max(dp[i][c], dp[i-1][c-w[i]] + v[i])', 'truy vết từ dp[n][W] để biết món nào được chọn'],
  code: {
    python: 'def knapsack(w, v, W):\n    n = len(w)\n    dp = [[0] * (W + 1) for _ in range(n + 1)]\n    for i in range(1, n + 1):\n        for c in range(W + 1):\n            dp[i][c] = dp[i - 1][c]\n            if w[i - 1] <= c:\n                dp[i][c] = max(dp[i][c], dp[i - 1][c - w[i - 1]] + v[i - 1])\n    return dp[n][W]',
    cpp: 'int dp[105][1005];\nint knapsack(int w[], int v[], int n, int W) {\n    for (int i = 1; i <= n; i++)\n        for (int c = 0; c <= W; c++) {\n            dp[i][c] = dp[i - 1][c];\n            if (w[i - 1] <= c && dp[i - 1][c - w[i - 1]] + v[i - 1] > dp[i][c])\n                dp[i][c] = dp[i - 1][c - w[i - 1]] + v[i - 1];\n        }\n    return dp[n][W];\n}',
    javascript: 'function knapsack(w, v, W) {\n  const n = w.length;\n  const dp = Array.from({ length: n + 1 }, () => new Array(W + 1).fill(0));\n  for (let i = 1; i <= n; i++)\n    for (let c = 0; c <= W; c++) {\n      dp[i][c] = dp[i - 1][c];\n      if (w[i - 1] <= c) dp[i][c] = Math.max(dp[i][c], dp[i - 1][c - w[i - 1]] + v[i - 1]);\n    }\n  return dp[n][W];\n}',
  },
  run({ w, v, W }) {
    const r = new Recorder();
    if (w.length !== v.length) { r.add({ cells: [[]], note: 'Số trọng lượng và số giá trị phải bằng nhau.' }, 0, 'Dữ liệu không hợp lệ: số trọng lượng khác số giá trị.'); return r.frames; }
    const n = w.length;
    const dp = Array.from({ length: n + 1 }, (_, i) => new Array(W + 1).fill(i === 0 ? 0 : null));
    const rowLabels = ['∅', ...w.map((wi, i) => `#${i + 1} (w${wi},v${v[i]})`)];
    const colLabels = Array.from({ length: W + 1 }, (_, c) => c);
    const st = (marks = {}, note) => ({ cells: dp, rowLabels, colLabels, corner: 'món \\ c', marks, note });
    r.add(st(), 0, 'Hàng đầu (không có món nào): mọi giá trị bằng 0.');
    for (let i = 1; i <= n; i++) {
      for (let c = 0; c <= W; c++) {
        const skip = dp[i - 1][c];
        let best = skip;
        const marks = { [`${i - 1},${c}`]: 'compare' };
        let msg = `dp[${i}][${c}]: không lấy món ${i} → ${skip}`;
        if (w[i - 1] <= c) {
          const take = dp[i - 1][c - w[i - 1]] + v[i - 1];
          marks[`${i - 1},${c - w[i - 1]}`] = 'pivot';
          msg += `; lấy → ${dp[i - 1][c - w[i - 1]]} + ${v[i - 1]} = ${take}`;
          best = Math.max(skip, take);
        } else msg += `; món nặng ${w[i - 1]} > ${c} nên không lấy được`;
        dp[i][c] = best;
        r.add(st({ ...marks, [`${i},${c}`]: 'swap' }), w[i - 1] <= c ? 3 : 2, `${msg} → chọn ${best}.`, { i, c });
      }
    }
    // backtrack
    const chosen = [];
    let c = W;
    const path = {};
    for (let i = n; i >= 1; i--) {
      path[`${i},${c}`] = 'done';
      if (dp[i][c] !== dp[i - 1][c]) { chosen.push(i); c -= w[i - 1]; }
    }
    r.add(st(path, `Chọn các món: ${chosen.reverse().map((i) => `#${i}`).join(', ') || 'không món nào'}`), 4, `Giá trị lớn nhất = ${dp[n][W]}. Truy vết ngược từ ô dp[${n}][${W}] để biết món nào được chọn.`);
    return r.frames;
  },
};

// ---------------------------------------------------------------- LCS
const lcs = {
  id: 'lcs', title: 'Dãy con chung dài nhất (LCS)', renderer: 'table',
  summary: 'Tìm độ dài dãy con chung dài nhất của hai xâu (các ký tự giữ thứ tự nhưng không cần liền nhau). Nếu a[i] = b[j] thì dp[i][j] = dp[i−1][j−1] + 1, ngược lại lấy max(dp[i−1][j], dp[i][j−1]). Ứng dụng: so sánh văn bản (diff), sinh học tin học.',
  complexity: { best: 'O(m·n)', avg: 'O(m·n)', worst: 'O(m·n)', space: 'O(m·n)' },
  inputs: [
    { name: 'a', label: 'Xâu A', type: 'text', default: 'ABCBDAB', random: () => 'AGGTAB', parse: (s) => (/^[A-Za-z0-9]{1,9}$/.test(String(s).trim()) ? { value: String(s).trim().toUpperCase() } : { error: 'Xâu A gồm 1–9 chữ cái/chữ số.' }) },
    { name: 'b', label: 'Xâu B', type: 'text', default: 'BDCABA', random: () => 'GXTXAYB', parse: (s) => (/^[A-Za-z0-9]{1,9}$/.test(String(s).trim()) ? { value: String(s).trim().toUpperCase() } : { error: 'Xâu B gồm 1–9 chữ cái/chữ số.' }) },
  ],
  pseudo: ['dp[0][*] ← 0; dp[*][0] ← 0', 'lặp i từ 1 đến m, j từ 1 đến n:', '  nếu a[i] = b[j]: dp[i][j] ← dp[i-1][j-1] + 1', '  ngược lại: dp[i][j] ← max(dp[i-1][j], dp[i][j-1])', 'truy vết để lấy dãy con chung'],
  code: {
    python: 'def lcs(a, b):\n    m, n = len(a), len(b)\n    dp = [[0] * (n + 1) for _ in range(m + 1)]\n    for i in range(1, m + 1):\n        for j in range(1, n + 1):\n            if a[i - 1] == b[j - 1]:\n                dp[i][j] = dp[i - 1][j - 1] + 1\n            else:\n                dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])\n    return dp[m][n]',
    cpp: 'int dp[1005][1005];\nint lcs(const char a[], const char b[]) {\n    int m = strlen(a), n = strlen(b);\n    for (int i = 1; i <= m; i++)\n        for (int j = 1; j <= n; j++)\n            dp[i][j] = (a[i - 1] == b[j - 1]) ? dp[i - 1][j - 1] + 1\n                     : (dp[i - 1][j] > dp[i][j - 1] ? dp[i - 1][j] : dp[i][j - 1]);\n    return dp[m][n];\n}',
    javascript: 'function lcs(a, b) {\n  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));\n  for (let i = 1; i <= a.length; i++)\n    for (let j = 1; j <= b.length; j++)\n      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);\n  return dp[a.length][b.length];\n}',
  },
  run({ a, b }) {
    const r = new Recorder();
    const m = a.length;
    const n = b.length;
    const dp = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 || j === 0 ? 0 : null)));
    const st = (marks = {}, extra = {}) => ({ cells: dp, rowLabels: ['∅', ...a.split('')], colLabels: ['∅', ...b.split('')], corner: 'A \\ B', marks, ...extra });
    r.add(st(), 0, 'Hàng và cột đầu tiên bằng 0 (một trong hai xâu rỗng).');
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (a[i - 1] === b[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
          r.add(st({ [`${i - 1},${j - 1}`]: 'pivot', [`${i},${j}`]: 'done' }, { rowMarks: { [i]: 'active' }, colMarks: { [j]: 'active' } }), 2, `A[${i}] = B[${j}] = '${a[i - 1]}' → dp = chéo trên-trái + 1 = ${dp[i][j]}.`, { i, j });
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
          r.add(st({ [`${i - 1},${j}`]: 'compare', [`${i},${j - 1}`]: 'compare', [`${i},${j}`]: 'swap' }, { rowMarks: { [i]: 'active' }, colMarks: { [j]: 'active' } }), 3, `'${a[i - 1]}' ≠ '${b[j - 1]}' → dp = max(trên ${dp[i - 1][j]}, trái ${dp[i][j - 1]}) = ${dp[i][j]}.`, { i, j });
        }
      }
    }
    let i = m;
    let j = n;
    const seq = [];
    const path = {};
    while (i > 0 && j > 0) {
      path[`${i},${j}`] = 'done';
      if (a[i - 1] === b[j - 1]) { seq.push(a[i - 1]); i -= 1; j -= 1; }
      else if (dp[i - 1][j] >= dp[i][j - 1]) i -= 1;
      else j -= 1;
    }
    r.add(st(path, { note: `Một dãy con chung dài nhất: ${seq.reverse().join('') || '(rỗng)'}` }), 4, `Độ dài LCS = ${dp[m][n]}. Truy vết đường đi từ góc dưới phải.`);
    return r.frames;
  },
};

// ---------------------------------------------------------------- coin change
const coins = {
  id: 'coin-change', title: 'Đổi tiền (ít đồng xu nhất)', renderer: 'table',
  summary: 'Với các mệnh giá cho trước (dùng không giới hạn), tìm số đồng xu ít nhất có tổng bằng S. dp[s] = min(dp[s − c] + 1) với mọi mệnh giá c ≤ s. Tham lam (luôn lấy đồng lớn nhất) không phải lúc nào cũng đúng — thử mệnh giá 1 3 4 với S = 6.',
  complexity: { best: 'O(S·k)', avg: 'O(S·k)', worst: 'O(S·k)', space: 'O(S)', note: 'k là số mệnh giá.' },
  inputs: [
    { name: 'coins', label: 'Các mệnh giá', type: 'list', default: '1 3 4', hint: '1–5 số nguyên 1..20.', random: () => [1, ...randomInts(2, 2, 7)].join(' '), parse: (s) => parseNumberList(s, { min: 1, max: 5, lo: 1, hi: 20 }) },
    { name: 'S', label: 'Số tiền S', type: 'number', default: '6', random: () => String(5 + Math.floor(Math.random() * 10)), parse: (s) => parseInteger(s, { lo: 1, hi: 20, label: 'Số tiền S' }) },
  ],
  pseudo: ['dp[0] ← 0; dp[s] ← ∞ với s > 0', 'lặp s từ 1 đến S:', '  với mỗi mệnh giá c ≤ s:', '    dp[s] ← min(dp[s], dp[s - c] + 1)', 'dp[S] là đáp án (∞ nếu không đổi được)'],
  code: {
    python: 'def min_coins(coins, S):\n    INF = float("inf")\n    dp = [0] + [INF] * S\n    for s in range(1, S + 1):\n        for c in coins:\n            if c <= s and dp[s - c] + 1 < dp[s]:\n                dp[s] = dp[s - c] + 1\n    return dp[S] if dp[S] != INF else -1',
    cpp: 'int minCoins(int coins[], int k, int S) {\n    int dp[10005];\n    dp[0] = 0;\n    for (int s = 1; s <= S; s++) {\n        dp[s] = 1e9;\n        for (int i = 0; i < k; i++)\n            if (coins[i] <= s && dp[s - coins[i]] + 1 < dp[s]) dp[s] = dp[s - coins[i]] + 1;\n    }\n    return dp[S] >= 1e9 ? -1 : dp[S];\n}',
    javascript: 'function minCoins(coins, S) {\n  const dp = [0, ...new Array(S).fill(Infinity)];\n  for (let s = 1; s <= S; s++)\n    for (const c of coins) if (c <= s) dp[s] = Math.min(dp[s], dp[s - c] + 1);\n  return dp[S] === Infinity ? -1 : dp[S];\n}',
  },
  run({ coins: cs, S }) {
    const r = new Recorder();
    const dp = new Array(S + 1).fill('∞');
    const from = new Array(S + 1).fill(null);
    dp[0] = 0;
    const st = (marks = {}, note) => ({ cells: [dp.map((v) => v)], colLabels: dp.map((_, i) => i), rowLabels: ['dp'], corner: 's', marks, note, extra: { label: 'Mệnh giá', values: cs, indices: false } });
    r.add(st({ '0,0': 'done' }), 0, 'dp[0] = 0 (không cần đồng nào cho số tiền 0).');
    for (let s = 1; s <= S; s++) {
      for (const c of cs) {
        if (c > s) continue;
        const cand = dp[s - c] === '∞' ? Infinity : dp[s - c] + 1;
        const cur = dp[s] === '∞' ? Infinity : dp[s];
        const better = cand < cur;
        if (better) { dp[s] = cand; from[s] = c; }
        r.add(st({ [`0,${s - c}`]: 'compare', [`0,${s}`]: better ? 'swap' : 'pivot' }), 3, `s = ${s}, dùng đồng ${c}: dp[${s - c}] + 1 = ${cand === Infinity ? '∞' : cand} ${better ? `< ${cur === Infinity ? '∞' : cur} → cập nhật` : '→ không tốt hơn'}.`, { s, c });
      }
    }
    const used = [];
    let s = S;
    while (s > 0 && from[s] !== null) { used.push(from[s]); s -= from[s]; }
    r.add(st({ [`0,${S}`]: 'done' }, dp[S] === '∞' ? 'Không thể đổi được số tiền này.' : `Cách đổi: ${used.join(' + ')} = ${S}`), 4, dp[S] === '∞' ? `Không đổi được ${S}.` : `Cần ít nhất ${dp[S]} đồng xu.`);
    return r.frames;
  },
};

export const recursionTopic = { id: 'recursion', intro: 'Đệ quy là khi một hàm **gọi lại chính nó** để giải bài toán nhỏ hơn cùng dạng. Hãy chú ý hai điều: trường hợp cơ sở (để dừng) và ngăn xếp lời gọi (máy tính nhớ những lời gọi đang dang dở như thế nào).', algorithms: [factorial, fibTree, hanoi] };
export const dpTopic = { id: 'dp', intro: 'Quy hoạch động (Dynamic Programming) giải bài toán lớn bằng cách **ghi nhớ kết quả các bài toán con chồng lấn** để không phải tính lại. Hai phong cách: có nhớ từ trên xuống (memoization) và lập bảng từ dưới lên (tabulation).', algorithms: [fibMemo, fibTab, knapsack, lcs, coins] };
