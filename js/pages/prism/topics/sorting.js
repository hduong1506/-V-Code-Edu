// V-Prism — sorting & searching.
import { Recorder, parseNumberList, parseInteger, randomInts } from '../engine.js';

const arrInput = (def, max = 14) => ({
  name: 'arr', label: 'Mảng số nguyên', type: 'list', default: def,
  hint: `2–${max} số nguyên trong khoảng 1..99, cách nhau bởi dấu cách hoặc dấu phẩy.`,
  random: () => randomInts(8 + Math.floor(Math.random() * 4), 2, 99).join(' '),
  parse: (s) => parseNumberList(s, { min: 2, max, lo: 1, hi: 99 }),
});

const doneMarks = (n, from = 0, to = n - 1) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, k) => [from + k, 'done']));

// ---------------------------------------------------------------- bubble
const bubble = {
  id: 'bubble', title: 'Sắp xếp nổi bọt', renderer: 'bars',
  summary: 'Duyệt nhiều lượt, mỗi lượt so sánh từng cặp kề nhau và đổi chỗ nếu sai thứ tự — phần tử lớn nhất "nổi" dần về cuối mảng. Nếu một lượt không có lần đổi chỗ nào, mảng đã sắp xếp và có thể dừng sớm.',
  complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', note: 'Ổn định (stable), tại chỗ.' },
  inputs: [arrInput('38 27 43 3 9 82 10')],
  pseudo: ['lặp i từ 0 đến n-2:', '  đã_đổi ← sai', '  lặp j từ 0 đến n-2-i:', '    nếu a[j] > a[j+1]:', '      đổi chỗ a[j], a[j+1]; đã_đổi ← đúng', '  nếu không đã_đổi: dừng'],
  code: {
    python: 'def bubble_sort(a):\n    n = len(a)\n    for i in range(n - 1):\n        swapped = False\n        for j in range(n - 1 - i):\n            if a[j] > a[j + 1]:\n                a[j], a[j + 1] = a[j + 1], a[j]\n                swapped = True\n        if not swapped:\n            break\n    return a',
    cpp: 'void bubbleSort(int a[], int n) {\n    for (int i = 0; i < n - 1; i++) {\n        bool swapped = false;\n        for (int j = 0; j < n - 1 - i; j++) {\n            if (a[j] > a[j + 1]) {\n                int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;\n                swapped = true;\n            }\n        }\n        if (!swapped) break;\n    }\n}',
    javascript: 'function bubbleSort(a) {\n  for (let i = 0; i < a.length - 1; i++) {\n    let swapped = false;\n    for (let j = 0; j < a.length - 1 - i; j++) {\n      if (a[j] > a[j + 1]) {\n        [a[j], a[j + 1]] = [a[j + 1], a[j]];\n        swapped = true;\n      }\n    }\n    if (!swapped) break;\n  }\n  return a;\n}',
  },
  run({ arr }) {
    const a = [...arr];
    const n = a.length;
    const r = new Recorder();
    let sortedFrom = n;
    const base = () => ({ values: a, marks: doneMarks(n, sortedFrom, n - 1) });
    r.add(base(), 0, 'Bắt đầu: phần tử lớn sẽ dần "nổi" về cuối mảng sau mỗi lượt.');
    for (let i = 0; i < n - 1; i++) {
      let swapped = false;
      r.add(base(), 1, `Lượt ${i + 1}: đặt cờ đã_đổi = sai.`, { i });
      for (let j = 0; j < n - 1 - i; j++) {
        r.add({ ...base(), marks: { ...doneMarks(n, sortedFrom, n - 1), [j]: 'compare', [j + 1]: 'compare' } }, 3, `So sánh a[${j}] = ${a[j]} với a[${j + 1}] = ${a[j + 1]}.`, { i, j });
        if (a[j] > a[j + 1]) {
          [a[j], a[j + 1]] = [a[j + 1], a[j]];
          swapped = true;
          r.add({ ...base(), marks: { ...doneMarks(n, sortedFrom, n - 1), [j]: 'swap', [j + 1]: 'swap' } }, 4, `${a[j + 1]} > ${a[j]} nên đổi chỗ.`, { i, j });
        }
      }
      sortedFrom = n - 1 - i;
      r.add(base(), 2, `Kết thúc lượt ${i + 1}: ${a[n - 1 - i]} đã về đúng vị trí ${n - 1 - i}.`, { i });
      if (!swapped) { r.add({ values: a, marks: doneMarks(n) }, 5, 'Không có lần đổi chỗ nào trong lượt này → mảng đã sắp xếp, dừng sớm.'); return r.frames; }
    }
    r.add({ values: a, marks: doneMarks(n) }, 0, 'Hoàn tất! Mảng đã được sắp xếp tăng dần.');
    return r.frames;
  },
};

// ---------------------------------------------------------------- selection
const selection = {
  id: 'selection', title: 'Sắp xếp chọn', renderer: 'bars',
  summary: 'Ở mỗi bước, tìm phần tử nhỏ nhất trong phần chưa sắp xếp rồi đưa nó về đầu phần đó. Số lần đổi chỗ ít (tối đa n−1) nhưng số phép so sánh luôn là n(n−1)/2.',
  complexity: { best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', note: 'Không ổn định, tại chỗ.' },
  inputs: [arrInput('29 10 14 37 13 5 21')],
  pseudo: ['lặp i từ 0 đến n-2:', '  min ← i', '  lặp j từ i+1 đến n-1:', '    nếu a[j] < a[min]: min ← j', '  đổi chỗ a[i], a[min]'],
  code: {
    python: 'def selection_sort(a):\n    n = len(a)\n    for i in range(n - 1):\n        m = i\n        for j in range(i + 1, n):\n            if a[j] < a[m]:\n                m = j\n        a[i], a[m] = a[m], a[i]\n    return a',
    cpp: 'void selectionSort(int a[], int n) {\n    for (int i = 0; i < n - 1; i++) {\n        int m = i;\n        for (int j = i + 1; j < n; j++)\n            if (a[j] < a[m]) m = j;\n        int t = a[i]; a[i] = a[m]; a[m] = t;\n    }\n}',
    javascript: 'function selectionSort(a) {\n  for (let i = 0; i < a.length - 1; i++) {\n    let m = i;\n    for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j;\n    [a[i], a[m]] = [a[m], a[i]];\n  }\n  return a;\n}',
  },
  run({ arr }) {
    const a = [...arr];
    const n = a.length;
    const r = new Recorder();
    r.add({ values: a, marks: {} }, 0, 'Phần bên trái sẽ dần trở thành phần đã sắp xếp.');
    for (let i = 0; i < n - 1; i++) {
      let m = i;
      const done = doneMarks(n, 0, i - 1);
      r.add({ values: a, marks: { ...done, [i]: 'pivot' }, pointers: { i, min: m } }, 1, `Giả sử a[${i}] = ${a[i]} là nhỏ nhất.`, { i, min: m });
      for (let j = i + 1; j < n; j++) {
        r.add({ values: a, marks: { ...done, [m]: 'pivot', [j]: 'compare' }, pointers: { i, min: m, j } }, 3, `So sánh a[${j}] = ${a[j]} với giá trị nhỏ nhất hiện tại ${a[m]}.`, { i, j, min: m });
        if (a[j] < a[m]) { m = j; r.add({ values: a, marks: { ...done, [m]: 'pivot' }, pointers: { i, min: m } }, 3, `Tìm thấy giá trị nhỏ hơn: ${a[m]} tại vị trí ${m}.`, { i, j, min: m }); }
      }
      [a[i], a[m]] = [a[m], a[i]];
      r.add({ values: a, marks: { ...done, [i]: 'swap', [m]: 'swap' } }, 4, m === i ? `a[${i}] đã ở đúng chỗ.` : `Đổi chỗ để đưa ${a[i]} về vị trí ${i}.`, { i, min: m });
    }
    r.add({ values: a, marks: doneMarks(n) }, 0, 'Hoàn tất!');
    return r.frames;
  },
};

// ---------------------------------------------------------------- insertion
const insertion = {
  id: 'insertion', title: 'Sắp xếp chèn', renderer: 'bars',
  summary: 'Giống cách xếp bài trên tay: lấy từng phần tử và chèn nó vào đúng chỗ trong phần bên trái đã sắp xếp, bằng cách dịch các phần tử lớn hơn sang phải. Rất nhanh với mảng gần như đã sắp xếp.',
  complexity: { best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', note: 'Ổn định, tại chỗ, thích hợp cho mảng nhỏ.' },
  inputs: [arrInput('12 11 13 5 6 7 3')],
  pseudo: ['lặp i từ 1 đến n-1:', '  key ← a[i]; j ← i-1', '  trong khi j ≥ 0 và a[j] > key:', '    a[j+1] ← a[j]; j ← j-1', '  a[j+1] ← key'],
  code: {
    python: 'def insertion_sort(a):\n    for i in range(1, len(a)):\n        key = a[i]\n        j = i - 1\n        while j >= 0 and a[j] > key:\n            a[j + 1] = a[j]\n            j -= 1\n        a[j + 1] = key\n    return a',
    cpp: 'void insertionSort(int a[], int n) {\n    for (int i = 1; i < n; i++) {\n        int key = a[i], j = i - 1;\n        while (j >= 0 && a[j] > key) {\n            a[j + 1] = a[j];\n            j--;\n        }\n        a[j + 1] = key;\n    }\n}',
    javascript: 'function insertionSort(a) {\n  for (let i = 1; i < a.length; i++) {\n    const key = a[i];\n    let j = i - 1;\n    while (j >= 0 && a[j] > key) {\n      a[j + 1] = a[j];\n      j--;\n    }\n    a[j + 1] = key;\n  }\n  return a;\n}',
  },
  run({ arr }) {
    const a = [...arr];
    const n = a.length;
    const r = new Recorder();
    r.add({ values: a, marks: { 0: 'done' } }, 0, 'Phần tử đầu tiên tự nó đã là một dãy được sắp xếp.');
    for (let i = 1; i < n; i++) {
      const key = a[i];
      let j = i - 1;
      r.add({ values: a, marks: { ...doneMarks(n, 0, i - 1), [i]: 'pivot' }, pointers: { key: i } }, 1, `Lấy key = ${key} để chèn vào phần đã sắp xếp a[0..${i - 1}].`, { i, key });
      while (j >= 0 && a[j] > key) {
        r.add({ values: a, marks: { ...doneMarks(n, 0, i), [j]: 'compare', [j + 1]: 'pivot' } }, 2, `a[${j}] = ${a[j]} > ${key} → dịch ${a[j]} sang phải.`, { i, j, key });
        a[j + 1] = a[j];
        a[j] = key;
        r.add({ values: a, marks: { ...doneMarks(n, 0, i), [j]: 'pivot', [j + 1]: 'swap' } }, 3, 'Dịch xong một bước.', { i, j, key });
        j -= 1;
      }
      a[j + 1] = key;
      r.add({ values: a, marks: { ...doneMarks(n, 0, i), [j + 1]: 'active' } }, 4, `Đặt ${key} vào vị trí ${j + 1}.`, { i, key });
    }
    r.add({ values: a, marks: doneMarks(n) }, 0, 'Hoàn tất!');
    return r.frames;
  },
};

// ---------------------------------------------------------------- merge
const merge = {
  id: 'merge', title: 'Sắp xếp trộn', renderer: 'bars',
  summary: 'Chia để trị: chia mảng làm đôi, sắp xếp từng nửa (đệ quy), rồi trộn hai nửa đã sắp xếp thành một. Luôn O(n log n) nhưng cần thêm bộ nhớ phụ O(n).',
  complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', note: 'Ổn định. Dùng nhiều khi sắp xếp dữ liệu lớn / danh sách liên kết.' },
  inputs: [arrInput('38 27 43 3 9 82 10 15')],
  pseudo: ['merge_sort(l, r):', '  nếu l ≥ r: trả về', '  m ← (l + r) / 2', '  merge_sort(l, m); merge_sort(m+1, r)', '  trộn a[l..m] và a[m+1..r]:', '    lấy phần tử nhỏ hơn ở đầu hai nửa', '    chép phần còn lại'],
  code: {
    python: 'def merge_sort(a):\n    if len(a) <= 1:\n        return a\n    m = len(a) // 2\n    left, right = merge_sort(a[:m]), merge_sort(a[m:])\n    res, i, j = [], 0, 0\n    while i < len(left) and j < len(right):\n        if left[i] <= right[j]:\n            res.append(left[i]); i += 1\n        else:\n            res.append(right[j]); j += 1\n    return res + left[i:] + right[j:]',
    cpp: 'int tmp[100005];\nvoid mergeSort(int a[], int l, int r) {\n    if (l >= r) return;\n    int m = (l + r) / 2;\n    mergeSort(a, l, m);\n    mergeSort(a, m + 1, r);\n    int i = l, j = m + 1, k = l;\n    while (i <= m && j <= r) tmp[k++] = (a[i] <= a[j]) ? a[i++] : a[j++];\n    while (i <= m) tmp[k++] = a[i++];\n    while (j <= r) tmp[k++] = a[j++];\n    for (int t = l; t <= r; t++) a[t] = tmp[t];\n}',
    javascript: 'function mergeSort(a) {\n  if (a.length <= 1) return a;\n  const m = a.length >> 1;\n  const L = mergeSort(a.slice(0, m)), R = mergeSort(a.slice(m));\n  const res = [];\n  let i = 0, j = 0;\n  while (i < L.length && j < R.length) res.push(L[i] <= R[j] ? L[i++] : R[j++]);\n  return res.concat(L.slice(i), R.slice(j));\n}',
  },
  run({ arr }) {
    const a = [...arr];
    const r = new Recorder();
    r.add({ values: a, marks: {} }, 0, 'Chia mảng thành các nửa nhỏ dần cho tới khi mỗi phần chỉ còn 1 phần tử.');
    const rec = (l, rr, depth) => {
      if (l >= rr) return;
      const m = Math.floor((l + rr) / 2);
      r.add({ values: a, marks: {}, range: [l, rr] }, 2, `Chia đoạn [${l}..${rr}] tại giữa m = ${m}.`, { l, r: rr, m, depth });
      rec(l, m, depth + 1);
      rec(m + 1, rr, depth + 1);
      const left = a.slice(l, m + 1);
      const right = a.slice(m + 1, rr + 1);
      let i = 0; let j = 0; let k = l;
      r.add({ values: a, marks: Object.fromEntries([...Array(rr - l + 1)].map((_, t) => [l + t, t <= m - l ? 'compare' : 'pivot'])), range: [l, rr] }, 4, `Trộn hai nửa đã sắp xếp [${left.join(', ')}] và [${right.join(', ')}].`, { l, r: rr, m });
      while (i < left.length && j < right.length) {
        a[k] = left[i] <= right[j] ? left[i++] : right[j++];
        r.add({ values: a, marks: { [k]: 'swap' }, range: [l, rr] }, 5, `Đặt ${a[k]} vào vị trí ${k}.`, { l, r: rr, k });
        k += 1;
      }
      while (i < left.length) { a[k] = left[i++]; r.add({ values: a, marks: { [k]: 'swap' }, range: [l, rr] }, 6, `Chép phần còn lại ${a[k]}.`, { k }); k += 1; }
      while (j < right.length) { a[k] = right[j++]; r.add({ values: a, marks: { [k]: 'swap' }, range: [l, rr] }, 6, `Chép phần còn lại ${a[k]}.`, { k }); k += 1; }
      r.add({ values: a, marks: doneMarks(a.length, l, rr), range: [l, rr] }, 4, `Đoạn [${l}..${rr}] đã được sắp xếp.`, { l, r: rr });
    };
    rec(0, a.length - 1, 0);
    r.add({ values: a, marks: doneMarks(a.length) }, 0, 'Hoàn tất!');
    return r.frames;
  },
};

// ---------------------------------------------------------------- quick
const quick = {
  id: 'quick', title: 'Sắp xếp nhanh', renderer: 'bars',
  summary: 'Chọn một chốt (pivot), phân hoạch để các phần tử nhỏ hơn chốt nằm bên trái, lớn hơn nằm bên phải, rồi đệ quy với hai phần. Minh họa dùng phân hoạch Lomuto với chốt là phần tử cuối.',
  complexity: { best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', note: 'Không ổn định. Trường hợp xấu xảy ra khi chốt luôn là min/max (ví dụ mảng đã sắp xếp).' },
  inputs: [arrInput('10 80 30 90 40 50 70')],
  pseudo: ['quick_sort(l, r):', '  nếu l ≥ r: trả về', '  pivot ← a[r]; i ← l', '  lặp j từ l đến r-1:', '    nếu a[j] < pivot: đổi a[i], a[j]; i ← i+1', '  đổi a[i], a[r]   // chốt về đúng chỗ', '  quick_sort(l, i-1); quick_sort(i+1, r)'],
  code: {
    python: 'def quick_sort(a, l=0, r=None):\n    if r is None:\n        r = len(a) - 1\n    if l >= r:\n        return a\n    pivot, i = a[r], l\n    for j in range(l, r):\n        if a[j] < pivot:\n            a[i], a[j] = a[j], a[i]\n            i += 1\n    a[i], a[r] = a[r], a[i]\n    quick_sort(a, l, i - 1)\n    quick_sort(a, i + 1, r)\n    return a',
    cpp: 'void quickSort(int a[], int l, int r) {\n    if (l >= r) return;\n    int pivot = a[r], i = l;\n    for (int j = l; j < r; j++)\n        if (a[j] < pivot) { int t = a[i]; a[i] = a[j]; a[j] = t; i++; }\n    int t = a[i]; a[i] = a[r]; a[r] = t;\n    quickSort(a, l, i - 1);\n    quickSort(a, i + 1, r);\n}',
    javascript: 'function quickSort(a, l = 0, r = a.length - 1) {\n  if (l >= r) return a;\n  const pivot = a[r];\n  let i = l;\n  for (let j = l; j < r; j++) {\n    if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; }\n  }\n  [a[i], a[r]] = [a[r], a[i]];\n  quickSort(a, l, i - 1);\n  quickSort(a, i + 1, r);\n  return a;\n}',
  },
  run({ arr }) {
    const a = [...arr];
    const r = new Recorder();
    const fixed = new Set();
    const fx = () => Object.fromEntries([...fixed].map((k) => [k, 'done']));
    r.add({ values: a, marks: {} }, 0, 'Bắt đầu phân hoạch trên toàn mảng.');
    const rec = (l, rr) => {
      if (l > rr) return;
      if (l === rr) { fixed.add(l); r.add({ values: a, marks: fx() }, 1, `Đoạn chỉ có 1 phần tử (${a[l]}) → đã đúng chỗ.`); return; }
      const pivot = a[rr];
      let i = l;
      r.add({ values: a, marks: { ...fx(), [rr]: 'pivot' }, range: [l, rr], pointers: { i, pivot: rr } }, 2, `Chọn chốt = ${pivot} (phần tử cuối đoạn [${l}..${rr}]).`, { l, r: rr, pivot });
      for (let j = l; j < rr; j++) {
        r.add({ values: a, marks: { ...fx(), [rr]: 'pivot', [j]: 'compare' }, range: [l, rr], pointers: { i, j } }, 4, `So sánh a[${j}] = ${a[j]} với chốt ${pivot}.`, { i, j, pivot });
        if (a[j] < pivot) {
          [a[i], a[j]] = [a[j], a[i]];
          r.add({ values: a, marks: { ...fx(), [rr]: 'pivot', [i]: 'swap', [j]: 'swap' }, range: [l, rr], pointers: { i, j } }, 4, `${a[i]} < ${pivot} → đưa sang vùng bên trái (vị trí ${i}).`, { i, j, pivot });
          i += 1;
        }
      }
      [a[i], a[rr]] = [a[rr], a[i]];
      fixed.add(i);
      r.add({ values: a, marks: { ...fx(), [i]: 'active' }, range: [l, rr] }, 5, `Đưa chốt ${pivot} về vị trí ${i}: bên trái đều nhỏ hơn, bên phải đều lớn hơn hoặc bằng.`, { i, pivot });
      rec(l, i - 1);
      rec(i + 1, rr);
    };
    rec(0, a.length - 1);
    r.add({ values: a, marks: doneMarks(a.length) }, 0, 'Hoàn tất!');
    return r.frames;
  },
};

// ---------------------------------------------------------------- counting
const counting = {
  id: 'counting', title: 'Sắp xếp đếm', renderer: 'bars',
  summary: 'Không so sánh: đếm số lần xuất hiện của mỗi giá trị, rồi ghi lại theo thứ tự giá trị. Rất nhanh khi miền giá trị k nhỏ (ví dụ điểm 0–10).',
  complexity: { best: 'O(n + k)', avg: 'O(n + k)', worst: 'O(n + k)', space: 'O(k)', note: 'k là độ lớn miền giá trị. Không dùng được cho số thực hay miền giá trị rất lớn.' },
  inputs: [{ name: 'arr', label: 'Mảng số nguyên (0..9)', type: 'list', default: '4 2 2 8 3 3 1 7 0 2', hint: 'Tối đa 14 số trong khoảng 0..9.', random: () => randomInts(10, 0, 9).join(' '), parse: (s) => parseNumberList(s, { min: 2, max: 14, lo: 0, hi: 9 }) }],
  pseudo: ['tạo mảng đếm cnt[0..k] = 0', 'lặp x trong a: cnt[x] ← cnt[x] + 1', 'p ← 0', 'lặp v từ 0 đến k:', '  lặp cnt[v] lần: a[p] ← v; p ← p+1'],
  code: {
    python: 'def counting_sort(a, k=9):\n    cnt = [0] * (k + 1)\n    for x in a:\n        cnt[x] += 1\n    p = 0\n    for v in range(k + 1):\n        for _ in range(cnt[v]):\n            a[p] = v\n            p += 1\n    return a',
    cpp: 'void countingSort(int a[], int n, int k) {\n    int cnt[1001] = {0};\n    for (int i = 0; i < n; i++) cnt[a[i]]++;\n    int p = 0;\n    for (int v = 0; v <= k; v++)\n        while (cnt[v]-- > 0) a[p++] = v;\n}',
    javascript: 'function countingSort(a, k = 9) {\n  const cnt = new Array(k + 1).fill(0);\n  for (const x of a) cnt[x]++;\n  let p = 0;\n  for (let v = 0; v <= k; v++) {\n    for (let c = 0; c < cnt[v]; c++) a[p++] = v;\n  }\n  return a;\n}',
  },
  run({ arr }) {
    const a = [...arr];
    const k = 9;
    const cnt = new Array(k + 1).fill(0);
    const r = new Recorder();
    const aux = (marks = {}) => ({ label: 'cnt', values: [...cnt], marks });
    r.add({ values: a, marks: {}, aux: aux() }, 0, 'Tạo mảng đếm cnt gồm 10 ô (giá trị 0..9), tất cả bằng 0.');
    a.forEach((x, i) => {
      cnt[x] += 1;
      r.add({ values: a, marks: { [i]: 'compare' }, aux: aux({ [x]: 'active' }) }, 1, `Gặp ${x} → cnt[${x}] = ${cnt[x]}.`, { i, x });
    });
    let p = 0;
    for (let v = 0; v <= k; v++) {
      for (let c = 0; c < cnt[v]; c++) {
        a[p] = v;
        r.add({ values: a, marks: { ...doneMarks(a.length, 0, p - 1), [p]: 'swap' }, aux: aux({ [v]: 'active' }) }, 4, `Ghi ${v} vào vị trí ${p}.`, { v, p });
        p += 1;
      }
    }
    r.add({ values: a, marks: doneMarks(a.length), aux: aux() }, 0, 'Hoàn tất mà không cần một phép so sánh nào giữa các phần tử!');
    return r.frames;
  },
};

// ---------------------------------------------------------------- searching
const linear = {
  id: 'linear', title: 'Tìm kiếm tuần tự', renderer: 'cells',
  summary: 'Duyệt lần lượt từng phần tử từ trái sang phải cho tới khi gặp giá trị cần tìm. Đơn giản, dùng được với mọi mảng (kể cả chưa sắp xếp).',
  complexity: { best: 'O(1)', avg: 'O(n)', worst: 'O(n)', space: 'O(1)' },
  inputs: [
    { name: 'arr', label: 'Mảng', type: 'list', default: '14 33 27 10 35 19 42 44', hint: '2–16 số nguyên 0..999.', random: () => randomInts(10, 1, 60).join(' '), parse: (s) => parseNumberList(s, { min: 2, max: 16, lo: 0, hi: 999 }) },
    { name: 'x', label: 'Giá trị cần tìm', type: 'number', default: '35', random: () => String(randomInts(1, 1, 60)[0]), parse: (s) => parseInteger(s, { lo: 0, hi: 999, label: 'Giá trị cần tìm' }) },
  ],
  pseudo: ['lặp i từ 0 đến n-1:', '  nếu a[i] = x: trả về i', 'trả về -1'],
  code: {
    python: 'def linear_search(a, x):\n    for i, v in enumerate(a):\n        if v == x:\n            return i\n    return -1',
    cpp: 'int linearSearch(int a[], int n, int x) {\n    for (int i = 0; i < n; i++)\n        if (a[i] == x) return i;\n    return -1;\n}',
    javascript: 'function linearSearch(a, x) {\n  for (let i = 0; i < a.length; i++) if (a[i] === x) return i;\n  return -1;\n}',
  },
  run({ arr, x }) {
    const r = new Recorder();
    for (let i = 0; i < arr.length; i++) {
      const visited = Object.fromEntries([...Array(i)].map((_, k) => [k, 'dim']));
      r.add({ values: arr, marks: { ...visited, [i]: 'compare' }, pointers: { i } }, 1, `So sánh a[${i}] = ${arr[i]} với x = ${x}.`, { i, x });
      if (arr[i] === x) { r.add({ values: arr, marks: { ...visited, [i]: 'done' }, pointers: { i } }, 1, `Tìm thấy ${x} tại vị trí ${i} sau ${i + 1} phép so sánh.`, { i, x }); return r.frames; }
    }
    r.add({ values: arr, marks: Object.fromEntries(arr.map((_, k) => [k, 'dim'])) }, 2, `Đã duyệt hết ${arr.length} phần tử, không có ${x} → trả về -1.`, { x });
    return r.frames;
  },
};

const binary = {
  id: 'binary', title: 'Tìm kiếm nhị phân', renderer: 'cells',
  summary: 'Chỉ dùng cho mảng ĐÃ SẮP XẾP: so sánh với phần tử giữa, rồi loại bỏ một nửa không thể chứa đáp án. Mỗi bước thu hẹp phạm vi đi một nửa nên rất nhanh — 1 triệu phần tử chỉ cần khoảng 20 bước.',
  complexity: { best: 'O(1)', avg: 'O(log n)', worst: 'O(log n)', space: 'O(1)' },
  inputs: [
    { name: 'arr', label: 'Mảng (sẽ được tự sắp xếp)', type: 'list', default: '2 5 8 12 16 23 38 56 72 91', hint: '2–16 số nguyên 0..999.', random: () => randomInts(12, 1, 99).sort((p, q) => p - q).join(' '), parse: (s) => parseNumberList(s, { min: 2, max: 16, lo: 0, hi: 999 }) },
    { name: 'x', label: 'Giá trị cần tìm', type: 'number', default: '23', random: () => String(randomInts(1, 1, 99)[0]), parse: (s) => parseInteger(s, { lo: 0, hi: 999, label: 'Giá trị cần tìm' }) },
  ],
  pseudo: ['lo ← 0; hi ← n-1', 'trong khi lo ≤ hi:', '  mid ← (lo + hi) / 2', '  nếu a[mid] = x: trả về mid', '  nếu a[mid] < x: lo ← mid + 1', '  ngược lại: hi ← mid - 1', 'trả về -1'],
  code: {
    python: 'def binary_search(a, x):\n    lo, hi = 0, len(a) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if a[mid] == x:\n            return mid\n        if a[mid] < x:\n            lo = mid + 1\n        else:\n            hi = mid - 1\n    return -1',
    cpp: 'int binarySearch(int a[], int n, int x) {\n    int lo = 0, hi = n - 1;\n    while (lo <= hi) {\n        int mid = lo + (hi - lo) / 2;\n        if (a[mid] == x) return mid;\n        if (a[mid] < x) lo = mid + 1;\n        else hi = mid - 1;\n    }\n    return -1;\n}',
    javascript: 'function binarySearch(a, x) {\n  let lo = 0, hi = a.length - 1;\n  while (lo <= hi) {\n    const mid = (lo + hi) >> 1;\n    if (a[mid] === x) return mid;\n    if (a[mid] < x) lo = mid + 1;\n    else hi = mid - 1;\n  }\n  return -1;\n}',
  },
  run({ arr, x }) {
    const a = [...arr].sort((p, q) => p - q);
    const r = new Recorder();
    let lo = 0;
    let hi = a.length - 1;
    const outside = () => Object.fromEntries(a.map((_, k) => [k, k < lo || k > hi ? 'dim' : null]).filter(([, v]) => v));
    r.add({ values: a, marks: {}, pointers: { lo, hi } }, 0, `Mảng đã sắp xếp. Phạm vi tìm: [${lo}..${hi}].`, { lo, hi, x });
    let step = 0;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      step += 1;
      r.add({ values: a, marks: { ...outside(), [mid]: 'compare' }, pointers: { lo, mid, hi } }, 2, `Bước ${step}: mid = (${lo} + ${hi}) / 2 = ${mid}, a[mid] = ${a[mid]}.`, { lo, mid, hi, x });
      if (a[mid] === x) { r.add({ values: a, marks: { ...outside(), [mid]: 'done' }, pointers: { mid } }, 3, `a[${mid}] = ${x} → tìm thấy sau ${step} bước!`, { mid }); return r.frames; }
      if (a[mid] < x) { lo = mid + 1; r.add({ values: a, marks: outside(), pointers: { lo, hi } }, 4, `${a[mid]} < ${x} → bỏ nửa trái, lo = ${lo}.`, { lo, hi }); }
      else { hi = mid - 1; r.add({ values: a, marks: outside(), pointers: { lo, hi } }, 5, `${a[mid]} > ${x} → bỏ nửa phải, hi = ${hi}.`, { lo, hi }); }
    }
    r.add({ values: a, marks: Object.fromEntries(a.map((_, k) => [k, 'dim'])) }, 6, `lo > hi → không có ${x} trong mảng.`);
    return r.frames;
  },
};

export const sortingTopic = {
  id: 'sorting',
  intro: 'Sắp xếp là đưa các phần tử về một thứ tự (tăng dần, giảm dần…). Đây là nền tảng của rất nhiều thuật toán khác: tìm kiếm nhị phân, loại bỏ trùng lặp, tìm trung vị… Hãy so sánh **số bước** của từng thuật toán trên cùng một dữ liệu để cảm nhận sự khác biệt giữa $O(n^2)$ và $O(n \\log n)$.',
  algorithms: [bubble, selection, insertion, merge, quick, counting],
};

export const searchingTopic = {
  id: 'searching',
  intro: 'Tìm kiếm trả lời câu hỏi "giá trị x có trong dãy không, ở đâu?". Tìm kiếm tuần tự hoạt động với mọi dãy; tìm kiếm nhị phân nhanh hơn rất nhiều nhưng đòi hỏi dãy **đã sắp xếp**. Thử tìm một giá trị không có trong mảng để xem mỗi thuật toán phải làm bao nhiêu bước.',
  algorithms: [linear, binary],
};

export { doneMarks };
