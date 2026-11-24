// V-Code Edu — AI assistant modes (shared by UI; cloud prompts live on the backend, local prompts here).

export const AI_MODES = [
  { id: 'tutor', label: 'Gia sư lập trình', short: 'Gia sư', icon: 'school', description: 'Gợi mở từng bước, giúp em tự tìm ra lời giải.',
    suggestions: ['Vòng lặp for và while khác nhau thế nào?', 'Em mới học Python, nên bắt đầu từ đâu?', 'Giải thích biến và kiểu dữ liệu bằng ví dụ đời thường'] },
  { id: 'debugger', label: 'Gỡ lỗi', short: 'Gỡ lỗi', icon: 'bug', description: 'Đọc thông báo lỗi, tìm nguyên nhân và cách sửa.',
    suggestions: ['IndentationError nghĩa là gì?', 'Vì sao chương trình của em in sai kết quả?', 'Lỗi "list index out of range" sửa thế nào?'] },
  { id: 'reviewer', label: 'Review code', short: 'Review', icon: 'check-circle', description: 'Nhận xét chất lượng, cách đặt tên, độ phức tạp, đề xuất cải thiện.',
    suggestions: ['Hãy review đoạn code của em', 'Làm sao để code dễ đọc hơn?', 'Code này có thể tối ưu không?'] },
  { id: 'algorithm', label: 'Giải thích thuật toán', short: 'Thuật toán', icon: 'git-branch', description: 'Ý tưởng, từng bước, độ phức tạp và ví dụ trực quan.',
    suggestions: ['Giải thích tìm kiếm nhị phân', 'Quy hoạch động là gì? Ví dụ bài cái túi', 'So sánh sắp xếp nhanh và sắp xếp trộn'] },
  { id: 'learning', label: 'Trợ lý học tập', short: 'Học tập', icon: 'book-open', description: 'Lập kế hoạch học, ôn tập, tạo câu hỏi tự kiểm tra.',
    suggestions: ['Lập lộ trình 4 tuần học Python cho em', 'Tạo 5 câu hỏi trắc nghiệm về vòng lặp', 'Tóm tắt kiến thức về hàm trong C++'] },
  { id: 'project', label: 'Phát triển dự án', short: 'Dự án', icon: 'rocket', description: 'Lên ý tưởng, chia nhỏ tính năng, thiết kế cấu trúc dự án.',
    suggestions: ['Gợi ý dự án Python cho học sinh lớp 10', 'Em muốn làm web giới thiệu trường, bắt đầu thế nào?', 'Chia nhỏ dự án trò chơi đoán số'] },
  { id: 'knowledge', label: 'Hỏi đáp kiến thức', short: 'Kiến thức', icon: 'bulb', description: 'Kiến thức CNTT, AI, an toàn thông tin, công nghệ tương lai.',
    suggestions: ['Trí tuệ nhân tạo học như thế nào?', 'Làm sao để đặt mật khẩu an toàn?', 'IoT là gì? Có ví dụ ở Việt Nam không?'] },
];

export const modeById = (id) => AI_MODES.find((m) => m.id === id) || AI_MODES[0];

const COMMON = 'Bạn là V-Mentor, trợ lý học tập của nền tảng V-Code Edu dành cho học sinh Việt Nam. Trả lời bằng tiếng Việt, ngắn gọn, thân thiện, chính xác; dùng Markdown, khối mã có ghi ngôn ngữ. Nếu không chắc chắn, hãy nói rõ.';

const LOCAL_PROMPTS = {
  tutor: 'Hãy dạy theo phương pháp gợi mở: đặt câu hỏi, gợi ý từng bước, không đưa ngay lời giải hoàn chỉnh cho bài tập.',
  debugger: 'Hãy giải thích lỗi bằng lời dễ hiểu, chỉ ra dòng có vấn đề, nguyên nhân và cách sửa.',
  reviewer: 'Hãy review code: điểm tốt, vấn đề (đúng sai, đặt tên, cấu trúc, độ phức tạp) và đề xuất cải thiện cụ thể.',
  algorithm: 'Hãy giải thích thuật toán: ý tưởng, các bước, ví dụ chạy tay, độ phức tạp thời gian/bộ nhớ.',
  learning: 'Hãy giúp lập kế hoạch học tập, tóm tắt kiến thức và tạo câu hỏi ôn tập.',
  project: 'Hãy giúp chia nhỏ dự án thành các bước, đề xuất cấu trúc và công nghệ phù hợp với học sinh.',
  knowledge: 'Hãy trả lời câu hỏi kiến thức công nghệ một cách dễ hiểu, có ví dụ thực tế.',
};

export function localSystemPrompt(modeId, context) {
  let p = `${COMMON} ${LOCAL_PROMPTS[modeId] || LOCAL_PROMPTS.tutor}`;
  if (context?.code) p += `\n\nMã nguồn của học sinh (${context.language || 'code'}):\n\`\`\`${context.language || ''}\n${String(context.code).slice(0, 6000)}\n\`\`\``;
  if (context?.error) p += `\n\nThông báo lỗi:\n${String(context.error).slice(0, 2000)}`;
  if (context?.lesson) p += `\n\nBài đang học: ${String(context.lesson).slice(0, 1500)}`;
  return p;
}
