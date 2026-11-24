// V-Prism — topic catalog (metadata only; heavy topic modules are lazy-loaded).

export const PRISM_CATEGORIES = [
  { id: 'linear', title: 'Cấu trúc tuyến tính', description: 'Dữ liệu xếp thành một hàng.' },
  { id: 'algorithms', title: 'Sắp xếp & tìm kiếm', description: 'Những thuật toán nền tảng nhất.' },
  { id: 'trees', title: 'Cây', description: 'Dữ liệu phân cấp.' },
  { id: 'graphs', title: 'Đồ thị', description: 'Đỉnh, cạnh và đường đi.' },
  { id: 'techniques', title: 'Kỹ thuật thiết kế', description: 'Đệ quy và quy hoạch động.' },
];

export const PRISM_TOPICS = [
  { id: 'arrays', title: 'Mảng', category: 'linear', icon: 'grid', summary: 'Truy cập O(1), chèn và xóa phải dịch phần tử.', algorithms: [{ id: 'access', title: 'Truy cập & duyệt' }, { id: 'insert', title: 'Chèn phần tử' }, { id: 'delete', title: 'Xóa phần tử' }] },
  { id: 'linked-list', title: 'Danh sách liên kết', category: 'linear', icon: 'link', summary: 'Các nút nối bằng con trỏ: chèn/xóa linh hoạt.', algorithms: [{ id: 'insert', title: 'Chèn nút' }, { id: 'delete', title: 'Xóa & tìm kiếm' }, { id: 'reverse', title: 'Đảo ngược' }] },
  { id: 'stack-queue', title: 'Ngăn xếp & Hàng đợi', category: 'linear', icon: 'stack', summary: 'LIFO và FIFO — nền tảng của đệ quy, DFS, BFS.', algorithms: [{ id: 'stack', title: 'Ngăn xếp (LIFO)' }, { id: 'queue', title: 'Hàng đợi (FIFO)' }, { id: 'brackets', title: 'Kiểm tra dấu ngoặc' }] },
  { id: 'hash-table', title: 'Bảng băm', category: 'linear', icon: 'hash', summary: 'Tra cứu trung bình O(1) nhờ hàm băm.', algorithms: [{ id: 'chaining', title: 'Xâu ngăn cách' }, { id: 'probing', title: 'Dò tuyến tính' }] },
  { id: 'sorting', title: 'Sắp xếp', category: 'algorithms', icon: 'bars', summary: '6 thuật toán từ O(n²) đến O(n log n).', algorithms: [{ id: 'bubble', title: 'Nổi bọt' }, { id: 'selection', title: 'Chọn' }, { id: 'insertion', title: 'Chèn' }, { id: 'merge', title: 'Trộn' }, { id: 'quick', title: 'Nhanh' }, { id: 'counting', title: 'Đếm' }] },
  { id: 'searching', title: 'Tìm kiếm', category: 'algorithms', icon: 'search', summary: 'Tuần tự O(n) và nhị phân O(log n).', algorithms: [{ id: 'linear', title: 'Tuần tự' }, { id: 'binary', title: 'Nhị phân' }] },
  { id: 'binary-tree', title: 'Cây nhị phân', category: 'trees', icon: 'tree', summary: 'Bốn cách duyệt: trước, giữa, sau, theo tầng.', algorithms: [{ id: 'preorder', title: 'Duyệt trước' }, { id: 'inorder', title: 'Duyệt giữa' }, { id: 'postorder', title: 'Duyệt sau' }, { id: 'level', title: 'Theo tầng' }] },
  { id: 'bst', title: 'Cây nhị phân tìm kiếm', category: 'trees', icon: 'git-branch', summary: 'Chèn, tìm, xóa trong O(chiều cao).', algorithms: [{ id: 'insert', title: 'Chèn' }, { id: 'search', title: 'Tìm kiếm' }, { id: 'delete', title: 'Xóa' }] },
  { id: 'heap', title: 'Heap & hàng đợi ưu tiên', category: 'trees', icon: 'layers', summary: 'Phần tử lớn nhất luôn ở gốc.', algorithms: [{ id: 'build', title: 'Xây heap' }, { id: 'insert', title: 'Chèn & lấy max' }, { id: 'heapsort', title: 'Heap sort' }] },
  { id: 'graph', title: 'Đồ thị & đường đi ngắn nhất', category: 'graphs', icon: 'graph', summary: 'Biểu diễn đồ thị và thuật toán Dijkstra.', algorithms: [{ id: 'representation', title: 'Biểu diễn' }, { id: 'dijkstra', title: 'Dijkstra' }] },
  { id: 'bfs', title: 'Duyệt theo chiều rộng', category: 'graphs', icon: 'target', summary: 'Loang theo lớp bằng hàng đợi.', algorithms: [{ id: 'bfs', title: 'BFS' }] },
  { id: 'dfs', title: 'Duyệt theo chiều sâu', category: 'graphs', icon: 'compass', summary: 'Đi sâu rồi quay lui bằng ngăn xếp.', algorithms: [{ id: 'dfs', title: 'DFS' }] },
  { id: 'recursion', title: 'Đệ quy', category: 'techniques', icon: 'refresh', summary: 'Giai thừa, Fibonacci, Tháp Hà Nội.', algorithms: [{ id: 'factorial', title: 'Giai thừa' }, { id: 'fibonacci', title: 'Fibonacci' }, { id: 'hanoi', title: 'Tháp Hà Nội' }] },
  { id: 'dp', title: 'Quy hoạch động', category: 'techniques', icon: 'table', summary: 'Ghi nhớ bài toán con: cái túi, LCS, đổi tiền.', algorithms: [{ id: 'fib-memo', title: 'Fibonacci có nhớ' }, { id: 'fib-table', title: 'Fibonacci lập bảng' }, { id: 'knapsack', title: 'Cái túi 0/1' }, { id: 'lcs', title: 'LCS' }, { id: 'coin-change', title: 'Đổi tiền' }] },
];

/** Lazy-load the full topic definition (algorithms with run(), code, pseudocode…). */
export async function loadTopic(id) {
  switch (id) {
    case 'sorting': return (await import('./topics/sorting.js')).sortingTopic;
    case 'searching': return (await import('./topics/sorting.js')).searchingTopic;
    case 'arrays': return (await import('./topics/linear.js')).arraysTopic;
    case 'linked-list': return (await import('./topics/linear.js')).linkedListTopic;
    case 'stack-queue': return (await import('./topics/linear.js')).stackQueueTopic;
    case 'hash-table': return (await import('./topics/linear.js')).hashTopic;
    case 'binary-tree': return (await import('./topics/trees.js')).binaryTreeTopic;
    case 'bst': return (await import('./topics/trees.js')).bstTopic;
    case 'heap': return (await import('./topics/trees.js')).heapTopic;
    case 'graph': return (await import('./topics/graphs.js')).graphTopic;
    case 'bfs': return (await import('./topics/graphs.js')).bfsTopic;
    case 'dfs': return (await import('./topics/graphs.js')).dfsTopic;
    case 'recursion': return (await import('./topics/recursion-dp.js')).recursionTopic;
    case 'dp': return (await import('./topics/recursion-dp.js')).dpTopic;
    default: return null;
  }
}
