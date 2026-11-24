// V-Code Edu — Flowchart studio: ready-made designer templates.
// Coordinates are node centers on a 20px grid.

const n = (id, type, text, x, y) => ({ id, type, text, x, y });
const e = (id, from, port, to) => ({ id, from, port, to });

export const TEMPLATES = [
  {
    id: 'sum',
    name: 'Tổng 1..n',
    description: 'Nhập n, tính tổng 1 + 2 + … + n bằng vòng lặp.',
    inputs: '5',
    graph: {
      nodes: [
        n('s', 'start', 'Bắt đầu', 300, 60),
        n('in', 'input', 'Nhập n', 300, 140),
        n('init', 'process', 'tong = 0\ni = 1', 300, 230),
        n('cond', 'decision', 'i <= n', 300, 340),
        n('body', 'process', 'tong = tong + i\ni = i + 1', 300, 460),
        n('out', 'output', 'In "Tổng là:", tong', 560, 460),
        n('end', 'end', 'Kết thúc', 560, 560),
      ],
      edges: [
        e('e1', 's', 'out', 'in'), e('e2', 'in', 'out', 'init'), e('e3', 'init', 'out', 'cond'),
        e('e4', 'cond', 'yes', 'body'), e('e5', 'body', 'out', 'cond'), e('e6', 'cond', 'no', 'out'), e('e7', 'out', 'out', 'end'),
      ],
    },
  },
  {
    id: 'max3',
    name: 'Số lớn nhất của 3 số',
    description: 'Nhập a, b, c và tìm số lớn nhất.',
    inputs: '7\n12\n9',
    graph: {
      nodes: [
        n('s', 'start', 'Bắt đầu', 300, 60),
        n('in', 'input', 'Nhập a, b, c', 300, 140),
        n('init', 'process', 'lon_nhat = a', 300, 220),
        n('d1', 'decision', 'b > lon_nhat', 300, 320),
        n('p1', 'process', 'lon_nhat = b', 300, 420),
        n('d2', 'decision', 'c > lon_nhat', 300, 520),
        n('p2', 'process', 'lon_nhat = c', 300, 620),
        n('out', 'output', 'In "Số lớn nhất:", lon_nhat', 300, 720),
        n('end', 'end', 'Kết thúc', 300, 800),
      ],
      edges: [
        e('e1', 's', 'out', 'in'), e('e2', 'in', 'out', 'init'), e('e3', 'init', 'out', 'd1'),
        e('e4', 'd1', 'yes', 'p1'), e('e5', 'd1', 'no', 'd2'), e('e6', 'p1', 'out', 'd2'),
        e('e7', 'd2', 'yes', 'p2'), e('e8', 'd2', 'no', 'out'), e('e9', 'p2', 'out', 'out'), e('e10', 'out', 'out', 'end'),
      ],
    },
  },
  {
    id: 'parity',
    name: 'Kiểm tra chẵn lẻ',
    description: 'Nhập n và cho biết n là số chẵn hay số lẻ.',
    inputs: '14',
    graph: {
      nodes: [
        n('s', 'start', 'Bắt đầu', 300, 60),
        n('in', 'input', 'Nhập n', 300, 140),
        n('d', 'decision', 'n % 2 == 0', 300, 240),
        n('o1', 'output', 'In n, "là số chẵn"', 300, 350),
        n('o2', 'output', 'In n, "là số lẻ"', 540, 350),
        n('end', 'end', 'Kết thúc', 300, 450),
      ],
      edges: [
        e('e1', 's', 'out', 'in'), e('e2', 'in', 'out', 'd'), e('e3', 'd', 'yes', 'o1'), e('e4', 'd', 'no', 'o2'),
        e('e5', 'o1', 'out', 'end'), e('e6', 'o2', 'out', 'end'),
      ],
    },
  },
  {
    id: 'divisors',
    name: 'Đếm ước số',
    description: 'Đếm số ước dương của n (vòng lặp + điều kiện lồng nhau).',
    inputs: '12',
    graph: {
      nodes: [
        n('s', 'start', 'Bắt đầu', 300, 60),
        n('in', 'input', 'Nhập n', 300, 140),
        n('init', 'process', 'dem = 0\ni = 1', 300, 230),
        n('d1', 'decision', 'i <= n', 300, 340),
        n('d2', 'decision', 'n % i == 0', 300, 460),
        n('p1', 'process', 'dem = dem + 1', 300, 570),
        n('inc', 'process', 'i = i + 1', 300, 660),
        n('out', 'output', 'In "Số ước của", n, "là", dem', 620, 460),
        n('end', 'end', 'Kết thúc', 620, 560),
      ],
      edges: [
        e('e1', 's', 'out', 'in'), e('e2', 'in', 'out', 'init'), e('e3', 'init', 'out', 'd1'),
        e('e4', 'd1', 'yes', 'd2'), e('e5', 'd2', 'yes', 'p1'), e('e6', 'd2', 'no', 'inc'), e('e7', 'p1', 'out', 'inc'),
        e('e8', 'inc', 'out', 'd1'), e('e9', 'd1', 'no', 'out'), e('e10', 'out', 'out', 'end'),
      ],
    },
  },
];

export function templateById(id) {
  return TEMPLATES.find((t) => t.id === id) || null;
}
