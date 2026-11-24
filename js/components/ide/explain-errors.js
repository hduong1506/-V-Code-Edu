// V-Code Edu — turn raw runtime errors (Python tracebacks, JS errors, JSCPP messages, SQLite errors, timeouts)
// into { type, title, line, col, file, message, explanation, hint } with Vietnamese explanations for students.
import { closest } from './diagnostics.js';

const PY_BUILTIN_NAMES = ['print', 'input', 'int', 'float', 'str', 'len', 'range', 'list', 'dict', 'set', 'tuple', 'sum', 'min', 'max', 'abs', 'round', 'sorted', 'enumerate', 'zip', 'map', 'filter', 'open', 'type', 'bool', 'True', 'False', 'None'];

function identifiersOf(code) {
  return new Set((String(code || '').match(/[A-Za-z_À-ỹ][\wÀ-ỹ]*/g) || []));
}

/** Parse a Python traceback: last user frame (skipping the input() shim) + final "Type: message" line. */
function parsePython(raw, mainName) {
  const lines = String(raw).split('\n');
  let line = 0;
  let file = '';
  for (const l of lines) {
    const m = /File "([^"]+)", line (\d+)(?:, in (.+))?/.exec(l);
    if (m && m[3] !== '__vc_input' && !/^<frozen|\/lib\/python|pyodide/.test(m[1])) { file = m[1]; line = Number(m[2]); }
  }
  let last = '';
  for (let i = lines.length - 1; i >= 0; i--) { if (lines[i].trim()) { last = lines[i].trim(); break; } }
  const tm = /^([A-Za-z_][\w.]*(?:Error|Exception|Warning|Interrupt|Exit|Iteration))(?::\s*(.*))?$/.exec(last);
  const caret = lines.find((l) => /^\s*\^+\s*$/.test(l));
  let col = 0;
  if (caret) {
    const idx = lines.indexOf(caret);
    const srcLine = lines[idx - 1] || '';
    col = caret.indexOf('^') - (srcLine.length - srcLine.trimStart().length) + 1;
  }
  return { type: tm ? tm[1] : '', message: tm ? (tm[2] || '') : last, line, file: file || mainName, col: col > 0 ? col : 0 };
}

function pyExplain(type, msg, ctx) {
  const ids = identifiersOf(ctx.code);
  let m;
  switch (type) {
    case 'NameError': {
      m = /name '([^']+)' is not defined/.exec(msg);
      const name = m ? m[1] : '';
      const guess = name ? closest(name, [...ids, ...PY_BUILTIN_NAMES].filter((x) => x !== name)) : '';
      return {
        title: name ? `Không tìm thấy tên '${name}'` : 'Dùng một tên chưa được định nghĩa',
        explanation: `Python không biết '${name || 'tên này'}' là gì. Thường do: chưa gán giá trị cho biến trước khi dùng, gõ sai chính tả (Python phân biệt chữ HOA/thường), quên dấu nháy khi viết chuỗi, hoặc dùng biến được tạo bên trong một hàm khác.`,
        hint: guess ? `Có phải ý em là '${guess}'? Nếu không, hãy gán giá trị trước, ví dụ: ${name} = 0` : (name ? `Gán giá trị cho '${name}' trước dòng này (ví dụ ${name} = int(input())), hoặc đặt '${name}' trong dấu nháy nếu đó là chữ cần in.` : 'Kiểm tra chính tả tên biến.'),
      };
    }
    case 'SyntaxError': {
      let hint = 'Kiểm tra dấu ngoặc, dấu hai chấm và dấu nháy ở dòng được đánh dấu (và dòng ngay phía trên).';
      if (/expected ':'/.test(msg)) hint = 'Thêm dấu hai chấm (:) vào cuối câu lệnh if / for / while / def / else.';
      else if (/was never closed/.test(msg)) hint = 'Có một dấu ngoặc mở nhưng chưa được đóng — hãy thêm dấu đóng tương ứng.';
      else if (/unmatched '(.)'/.test(msg)) hint = 'Có một dấu ngoặc đóng thừa — xóa nó hoặc thêm dấu mở phù hợp.';
      else if (/unterminated string literal|EOL while scanning/.test(msg)) hint = 'Chuỗi thiếu dấu nháy đóng. Mở bằng " thì đóng bằng ", mở bằng \' thì đóng bằng \'.';
      else if (/unterminated triple-quoted/.test(msg)) hint = 'Chuỗi nhiều dòng """ … """ chưa được đóng.';
      else if (/invalid character/.test(msg)) hint = 'Có ký tự lạ (thường là dấu nháy cong “ ” hoặc ‘ ’ khi sao chép từ Word). Gõ lại bằng dấu nháy thẳng.';
      else if (/Missing parentheses in call to 'print'/.test(msg)) hint = 'Trong Python 3, print là hàm: viết print(...).';
      else if (/cannot assign to|Maybe you meant '==' /.test(msg)) hint = 'Để so sánh dùng == ; dấu = chỉ dùng để gán giá trị cho biến ở bên trái.';
      else if (/invalid syntax\. Perhaps you forgot a comma/.test(msg)) hint = 'Có thể thiếu dấu phẩy giữa các phần tử hoặc tham số.';
      else if (/'return' outside function/.test(msg)) hint = 'return chỉ dùng bên trong hàm def.';
      else if (/'break' outside loop|'continue' not properly in loop/.test(msg)) hint = 'break / continue phải nằm trong vòng lặp.';
      else if (/invalid decimal literal/.test(msg)) hint = 'Tên biến không được bắt đầu bằng chữ số.';
      return { title: 'Lỗi cú pháp (SyntaxError)', explanation: 'Python không đọc hiểu được câu lệnh vì viết sai quy tắc ngữ pháp, nên chương trình chưa chạy dòng nào.', hint };
    }
    case 'IndentationError': case 'TabError': {
      let hint = 'Căn lề lại các dòng trong cùng một khối cho thẳng hàng (mỗi cấp thụt 4 dấu cách).';
      if (/expected an indented block/.test(msg)) hint = 'Dòng sau câu lệnh kết thúc bằng ":" phải được thụt vào (nhấn Tab).';
      else if (/unexpected indent/.test(msg)) hint = 'Dòng này bị thụt vào thừa — xóa bớt khoảng trắng ở đầu dòng.';
      else if (/unindent does not match/.test(msg)) hint = 'Mức thụt lề không khớp với khối nào phía trên — căn thẳng với khối mà nó thuộc về.';
      else if (type === 'TabError') hint = 'Không trộn phím Tab với dấu cách. Dùng "Định dạng mã" (Shift+Alt+F) để đổi Tab thành dấu cách.';
      return { title: 'Lỗi thụt lề (IndentationError)', explanation: 'Python dùng thụt lề (khoảng trắng đầu dòng) để biết lệnh nào thuộc khối nào. Thụt lề sai làm chương trình không chạy được.', hint };
    }
    case 'TypeError': {
      let hint = 'Kiểm tra kiểu dữ liệu của các giá trị ở dòng này (dùng type(x) để xem).';
      let explanation = 'Một phép toán hoặc hàm nhận giá trị có kiểu dữ liệu không phù hợp.';
      if ((m = /can only concatenate str \(not "(\w+)"\) to str/.exec(msg))) { explanation = `Không thể nối chuỗi (str) với ${m[1]} bằng dấu +.`; hint = 'Đổi số thành chuỗi bằng str(x), hoặc dùng print("Kết quả:", x) / f"Kết quả: {x}".'; }
      else if ((m = /unsupported operand type\(s\) for (.+): '(\w+)' and '(\w+)'/.exec(msg))) { explanation = `Phép ${m[1]} không áp dụng được giữa kiểu ${m[2]} và ${m[3]}.`; hint = m[2] === 'str' || m[3] === 'str' ? 'Giá trị nhập bằng input() luôn là chuỗi — hãy đổi sang số bằng int(...) hoặc float(...).' : 'Đổi các giá trị về cùng kiểu trước khi tính.'; }
      else if ((m = /'(\w+)' object is not callable/.exec(msg))) { explanation = `Em đang gọi một giá trị kiểu ${m[1]} như một hàm (có dấu ngoặc tròn phía sau).`; hint = 'Có thể em đã đặt tên biến trùng tên hàm (ví dụ sum = 0 rồi gọi sum(...)), hoặc quên dấu * giữa số và ngoặc: 2(x+1) → 2*(x+1).'; }
      else if ((m = /'(\w+)' object is not subscriptable/.exec(msg))) { explanation = `Kiểu ${m[1]} không lấy phần tử bằng [ ] được.`; hint = 'Chỉ chuỗi, danh sách, tuple, từ điển mới dùng được x[i].'; }
      else if ((m = /'(\w+)' object is not iterable/.exec(msg))) { explanation = `Không thể duyệt qua giá trị kiểu ${m[1]} bằng vòng for.`; hint = 'Để lặp n lần hãy dùng for i in range(n).'; }
      else if (/missing \d+ required positional argument/.test(msg)) { explanation = 'Gọi hàm thiếu tham số.'; hint = 'Truyền đủ số tham số như trong định nghĩa def của hàm.'; }
      else if (/takes \d+ positional arguments? but \d+ (were|was) given/.test(msg)) { explanation = 'Gọi hàm với số tham số khác với định nghĩa.'; hint = 'Kiểm tra lại số lượng tham số khi gọi hàm.'; }
      else if (/'(str|int|float)' object does not support item assignment/.test(msg)) { explanation = 'Chuỗi và số không thay đổi được từng phần tử.'; hint = 'Tạo chuỗi mới, hoặc đổi sang danh sách: list(s).'; }
      else if (/'<' not supported|'>' not supported/.test(msg)) { explanation = 'So sánh hai giá trị khác kiểu (ví dụ chuỗi với số).'; hint = 'Đổi dữ liệu nhập vào sang số bằng int(...) trước khi so sánh.'; }
      return { title: 'Sai kiểu dữ liệu (TypeError)', explanation, hint };
    }
    case 'ValueError': {
      let explanation = 'Giá trị có kiểu đúng nhưng nội dung không hợp lệ.';
      let hint = 'Kiểm tra dữ liệu đầu vào.';
      if ((m = /invalid literal for int\(\) with base 10: '(.*)'/.exec(msg))) { explanation = `int() không đổi được '${m[1]}' thành số nguyên.`; hint = m[1].includes(' ') ? 'Dòng dữ liệu có nhiều số cách nhau bởi dấu cách: dùng a, b = map(int, input().split()).' : (m[1] === '' ? 'Dòng dữ liệu vào đang trống — hãy nhập số vào ô Dữ liệu vào.' : (/\./.test(m[1]) ? 'Số có phần thập phân: dùng float(...) thay cho int(...).' : 'Hãy nhập đúng một số nguyên trên mỗi dòng của ô Dữ liệu vào.')); }
      else if (/could not convert string to float/.test(msg)) { explanation = 'float() không đổi được chuỗi này thành số thực.'; hint = 'Dùng dấu chấm cho phần thập phân (3.5, không phải 3,5).'; }
      else if (/not enough values to unpack/.test(msg)) { explanation = 'Số biến bên trái nhiều hơn số giá trị nhận được.'; hint = 'Kiểm tra dòng dữ liệu vào có đủ số lượng giá trị không.'; }
      else if (/too many values to unpack/.test(msg)) { explanation = 'Số giá trị nhận được nhiều hơn số biến bên trái.'; hint = 'Kiểm tra lại số lượng giá trị trên dòng dữ liệu vào.'; }
      else if (/math domain error/.test(msg)) { explanation = 'Phép toán không xác định (ví dụ căn bậc hai của số âm, log của 0).'; hint = 'Kiểm tra giá trị trước khi gọi hàm toán học.'; }
      return { title: 'Giá trị không hợp lệ (ValueError)', explanation, hint };
    }
    case 'ZeroDivisionError': return { title: 'Chia cho 0 (ZeroDivisionError)', explanation: 'Chương trình thực hiện phép chia (/, //, %) với số chia bằng 0.', hint: 'Thêm điều kiện kiểm tra trước khi chia, ví dụ: if b != 0: …' };
    case 'IndexError': return { title: 'Chỉ số vượt phạm vi (IndexError)', explanation: 'Em truy cập phần tử ở vị trí không tồn tại. Danh sách có n phần tử thì chỉ số hợp lệ từ 0 đến n-1.', hint: 'Kiểm tra điều kiện vòng lặp (dùng range(len(a)) thay vì range(len(a)+1)) và danh sách có bị rỗng không.' };
    case 'KeyError': { m = /^'?(.*?)'?$/.exec(msg); return { title: 'Không có khóa trong từ điển (KeyError)', explanation: `Từ điển không có khóa ${m ? `'${m[1]}'` : 'được yêu cầu'}.`, hint: 'Kiểm tra bằng if khoa in d: … hoặc dùng d.get(khoa, giá_trị_mặc_định).' }; }
    case 'AttributeError': {
      m = /'(\w+)' object has no attribute '(\w+)'/.exec(msg);
      const tips = { push: 'append', add: 'append (với list) hoặc add (với set)', length: 'len(x)', size: 'len(x)', lenght: 'len(x)', toUpperCase: 'upper()', toLowerCase: 'lower()', trim: 'strip()', contains: 'toán tử in' };
      return { title: 'Thuộc tính không tồn tại (AttributeError)', explanation: m ? `Kiểu ${m[1]} không có thuộc tính / phương thức '${m[2]}'.` : 'Giá trị này không có thuộc tính được gọi.', hint: m && tips[m[2]] ? `Trong Python hãy dùng ${tips[m[2]]}.` : (m && m[1] === 'NoneType' ? 'Biến đang là None — có thể một hàm không return giá trị (ví dụ a = a.sort()).' : 'Kiểm tra chính tả tên phương thức và kiểu dữ liệu của biến.') };
    }
    case 'RecursionError': return { title: 'Đệ quy quá sâu (RecursionError)', explanation: 'Hàm gọi lại chính nó quá nhiều lần (thường là đệ quy không có điểm dừng).', hint: 'Kiểm tra trường hợp cơ sở (điểm dừng) và đảm bảo mỗi lần gọi đều tiến gần tới điểm dừng.' };
    case 'EOFError': return { title: 'Thiếu dữ liệu vào (EOFError)', explanation: 'Chương trình gọi input() nhưng ô Dữ liệu vào không còn dòng nào để đọc.', hint: 'Nhập dữ liệu vào ô "Dữ liệu vào": mỗi dòng tương ứng với một lần gọi input().' };
    case 'ModuleNotFoundError': case 'ImportError': {
      m = /No module named '([^']+)'/.exec(msg);
      return { title: 'Không tìm thấy thư viện (ModuleNotFoundError)', explanation: m ? `Không có module '${m[1]}'.` : 'Không nhập được thư viện.', hint: 'Nếu đó là tệp của em, hãy tạo tệp cùng tên (ví dụ utils.py) trong dự án. Một số thư viện cần Internet để tải lần đầu.' };
    }
    case 'UnboundLocalError': return { title: 'Biến cục bộ chưa có giá trị (UnboundLocalError)', explanation: 'Trong hàm, em dùng một biến trước khi gán, trong khi hàm lại có lệnh gán cho biến đó (nên Python coi là biến cục bộ).', hint: 'Truyền giá trị vào hàm qua tham số, hoặc khai báo global ten_bien ở đầu hàm.' };
    case 'OverflowError': return { title: 'Tràn số (OverflowError)', explanation: 'Kết quả quá lớn để biểu diễn (thường với số thực).', hint: 'Dùng số nguyên, hoặc giảm kích thước phép tính.' };
    case 'FileNotFoundError': return { title: 'Không tìm thấy tệp (FileNotFoundError)', explanation: 'Chương trình mở một tệp không tồn tại.', hint: 'Tạo tệp đó trong dự án (nút + ở thanh tệp) với đúng tên, rồi chạy lại.' };
    case 'KeyboardInterrupt': return { title: 'Chương trình bị dừng', explanation: 'Chương trình đã bị dừng giữa chừng.', hint: '' };
    default: return { title: type || 'Lỗi khi chạy chương trình', explanation: 'Chương trình dừng vì gặp lỗi khi đang chạy.', hint: 'Đọc thông báo lỗi gốc bên dưới và kiểm tra dòng được đánh dấu.' };
  }
}

function jsExplain(type, msg) {
  let m;
  if (type === 'ReferenceError') {
    m = /(\S+) is not defined/.exec(msg);
    if (/before initialization/.test(msg)) return { title: 'Dùng biến trước khi khai báo', explanation: 'Biến let/const được dùng trước dòng khai báo của nó.', hint: 'Đưa dòng khai báo let/const lên trước chỗ sử dụng.' };
    return { title: m ? `Không tìm thấy '${m[1]}' (ReferenceError)` : 'ReferenceError', explanation: `JavaScript không biết ${m ? `'${m[1]}'` : 'tên này'} là gì: chưa khai báo hoặc gõ sai chính tả (phân biệt HOA/thường).`, hint: m ? `Khai báo trước bằng let ${m[1]} = …; hoặc kiểm tra chính tả.` : 'Khai báo biến bằng let hoặc const trước khi dùng.' };
  }
  if (type === 'TypeError') {
    if ((m = /Cannot read properties of (undefined|null) \(reading '([^']+)'\)/.exec(msg))) return { title: 'Đọc thuộc tính của undefined/null', explanation: `Giá trị đang là ${m[1]} nên không có thuộc tính '${m[2]}'.`, hint: 'Kiểm tra biến đã được gán chưa, hoặc chỉ số mảng có vượt quá độ dài không.' };
    if ((m = /(\S+) is not a function/.exec(msg))) return { title: `'${m[1]}' không phải là hàm`, explanation: 'Em đang gọi (dùng dấu ngoặc tròn) một giá trị không phải hàm.', hint: 'Kiểm tra chính tả tên hàm (ví dụ console.log, arr.push) và kiểu dữ liệu.' };
    if (/Assignment to constant variable/.test(msg)) return { title: 'Gán lại hằng số const', explanation: 'Biến khai báo bằng const không thể gán giá trị mới.', hint: 'Đổi const thành let nếu cần thay đổi giá trị.' };
    return { title: 'Sai kiểu dữ liệu (TypeError)', explanation: 'Một phép toán được thực hiện trên giá trị không đúng kiểu.', hint: 'Kiểm tra kiểu dữ liệu bằng typeof x.' };
  }
  if (type === 'SyntaxError') {
    let hint = 'Kiểm tra dấu ngoặc, dấu phẩy, dấu nháy quanh chỗ vừa sửa.';
    if (/missing \) after argument list/.test(msg)) hint = 'Thiếu dấu ) khi gọi hàm.';
    else if (/Unexpected end of input/.test(msg)) hint = 'Thiếu dấu } hoặc ) ở cuối chương trình.';
    else if (/Invalid or unexpected token/.test(msg)) hint = 'Có ký tự lạ hoặc chuỗi chưa đóng dấu nháy.';
    else if (/has already been declared/.test(msg)) hint = 'Một biến chỉ được khai báo let/const một lần; lần sau chỉ cần gán.';
    return { title: 'Lỗi cú pháp JavaScript', explanation: 'JavaScript không đọc hiểu được chương trình nên chưa chạy dòng nào.', hint };
  }
  if (type === 'RangeError') {
    if (/call stack/.test(msg)) return { title: 'Đệ quy quá sâu (RangeError)', explanation: 'Hàm gọi lại chính nó quá nhiều lần.', hint: 'Kiểm tra điều kiện dừng của hàm đệ quy.' };
    return { title: 'Giá trị ngoài phạm vi (RangeError)', explanation: msg, hint: 'Kiểm tra kích thước mảng / tham số.' };
  }
  return null;
}

/**
 * explainError(res, { lang, code, stdin, mainName }) → explanation object or null when there is no error.
 * `res` is a runCode() result ({ ok, error, timedOut, aborted }) or a raw error string.
 */
export function explainError(res, { lang = 'python', code = '', stdin = '', mainName = 'main.py' } = {}) {
  const r = typeof res === 'string' ? { ok: false, error: res } : (res || {});
  if (r.ok || (!r.error && !r.timedOut)) return null;
  const raw = String(r.error || '');
  const codeLines = String(code).split('\n');
  const withLine = (o) => ({ ...o, raw, codeLine: o.line > 0 && (!o.file || o.file === mainName) ? (codeLines[o.line - 1] ?? '') : '' });
  const needsInput = /\binput\s*\(|nhap_so|nhap_chuoi|nhap_so_thuc|\bcin\s*>>|\bscanf\s*\(|\bprompt\s*\(|\breadline\s*\(/.test(code);

  if (r.aborted) return withLine({ type: 'Aborted', severity: 'info', title: 'Em đã dừng chương trình', line: 0, explanation: 'Chương trình bị dừng bằng nút Dừng trước khi chạy xong.', hint: '' });
  if (r.timedOut) {
    return withLine({
      type: 'Timeout', title: 'Quá thời gian chạy', line: 0,
      explanation: needsInput && !String(stdin).trim()
        ? 'Chương trình chạy quá lâu. Chương trình có đọc dữ liệu vào nhưng ô Dữ liệu vào đang trống, hoặc có vòng lặp không bao giờ dừng.'
        : 'Chương trình chạy quá thời gian cho phép — thường do vòng lặp vô hạn (điều kiện dừng không bao giờ sai) hoặc thuật toán quá chậm.',
      hint: 'Kiểm tra điều kiện của while và đảm bảo biến điều khiển thay đổi sau mỗi vòng. Thử in giá trị biến trong vòng lặp để theo dõi.',
    });
  }
  if (/cần thêm dữ liệu vào|EOFError/.test(raw)) {
    const p = lang === 'python' || lang === 'pyvn' ? parsePython(raw, mainName) : { line: 0 };
    return withLine({ type: 'EOFError', title: 'Thiếu dữ liệu vào', line: p.line || 0, file: p.file, explanation: 'Chương trình cần đọc thêm dữ liệu (input / cin / scanf) nhưng ô Dữ liệu vào đã hết dòng hoặc đang trống.', hint: 'Nhập dữ liệu vào ô "Dữ liệu vào": mỗi dòng tương ứng với một lần đọc.' });
  }
  if (lang === 'python' || lang === 'pyvn') {
    const p = parsePython(raw, mainName);
    const e = pyExplain(p.type, p.message, { code, stdin });
    if (p.type === 'ValueError' && /invalid literal for int\(\)/.test(p.message) && !String(stdin).trim()) e.hint = 'Ô Dữ liệu vào đang trống — hãy nhập số vào đó (mỗi dòng một giá trị) rồi chạy lại.';
    return withLine({ type: p.type || 'Error', title: e.title, line: p.line, col: p.col, file: p.file, message: p.type ? `${p.type}: ${p.message}` : p.message, explanation: e.explanation, hint: e.hint });
  }
  if (lang === 'javascript') {
    const m = /^(\w*Error|Error):\s*(.*?)(?:\s*\(dòng (\d+)(?:, cột (\d+))?\))?$/s.exec(raw.trim());
    const type = m ? m[1] : 'Error';
    const msg = m ? m[2] : raw;
    const e = jsExplain(type, msg) || { title: 'Lỗi khi chạy JavaScript', explanation: msg, hint: 'Kiểm tra dòng được đánh dấu.' };
    return withLine({ type, title: e.title, line: m && m[3] ? Number(m[3]) : 0, col: m && m[4] ? Number(m[4]) : 0, message: `${type}: ${msg}`, explanation: e.explanation, hint: e.hint });
  }
  if (lang === 'c' || lang === 'cpp') {
    let m = /line (\d+) \(column (\d+)\)/.exec(raw);
    if (/Parsing Failure/.test(raw) && m) {
      const ln = Number(m[1]);
      const found = /but "(.+?)" found/.exec(raw);
      const expectsSemi = /"\;"/.test(raw) || /";"/.test(raw);
      const prevLine = (codeLines[ln - 2] || '').trim();
      const semi = expectsSemi && prevLine && !/[;{}]$/.test(prevLine) && !prevLine.startsWith('#');
      return withLine({
        type: 'SyntaxError', title: semi ? 'Thiếu dấu chấm phẩy (;)' : 'Lỗi cú pháp C/C++', line: semi ? ln - 1 : ln, col: semi ? 0 : Number(m[2]),
        message: `Lỗi phân tích cú pháp ở dòng ${ln}, cột ${m[2]}${found ? ` (gặp "${found[1]}")` : ''}`,
        explanation: semi ? `Câu lệnh ở dòng ${ln - 1} chưa kết thúc bằng dấu ';' nên trình biên dịch đọc nhầm sang dòng ${ln}.` : 'Trình thông dịch không đọc hiểu được câu lệnh vì viết sai cú pháp.',
        hint: semi ? `Thêm ; vào cuối dòng ${ln - 1}.` : 'Kiểm tra dấu ; ở cuối câu lệnh, các cặp ngoặc ( ) { } và dấu nháy ở dòng này và dòng phía trên.',
      });
    }
    m = /^(\d+):(\d+)\s+(.*)$/s.exec(raw.trim());
    const ln = m ? Number(m[1]) : 0;
    const col = m ? Number(m[2]) : 0;
    const msg = m ? m[3] : raw;
    let title = 'Lỗi khi chạy chương trình C/C++';
    let explanation = msg;
    let hint = 'Kiểm tra dòng được đánh dấu.';
    let k;
    if ((k = /variable (\w+) does not exist/.exec(msg))) { title = `Biến '${k[1]}' chưa được khai báo`; explanation = `Chương trình dùng '${k[1]}' nhưng chưa khai báo biến này (hoặc khai báo ở khối khác).`; const g = closest(k[1], [...identifiersOf(code)].filter((x) => x !== k[1])); hint = g ? `Có phải ý em là '${g}'? Nếu không, hãy khai báo: int ${k[1]};` : `Khai báo trước khi dùng, ví dụ: int ${k[1]} = 0;`; }
    else if ((k = /cannot find library: (\S+)/.exec(msg))) { title = `Chưa hỗ trợ thư viện <${k[1]}>`; explanation = 'Trình chạy C/C++ trên trình duyệt (JSCPP) chỉ hỗ trợ iostream, cstdio, cmath, cstring, iomanip, cctype, cstdlib, ctime.'; hint = 'Dùng mảng thay cho vector, mảng char thay cho string, và tự cài đặt thuật toán (sắp xếp, tìm kiếm…).'; }
    else if (/overflow of NaN|NaN/.test(msg)) { title = 'Phép tính không xác định'; explanation = 'Có phép chia cho 0 hoặc dùng biến chưa có giá trị (chưa đọc được dữ liệu vào).'; hint = 'Kiểm tra số chia khác 0 và ô Dữ liệu vào đã có đủ dữ liệu.'; }
    else if (/divid\w* by zero|division by zero/i.test(msg)) { title = 'Chia cho 0'; explanation = 'Phép chia hoặc chia lấy dư có số chia bằng 0.'; hint = 'Kiểm tra số chia trước khi thực hiện phép chia.'; }
    else if (/index out of bound|out of bound|segmentation/i.test(msg)) { title = 'Truy cập ngoài mảng'; explanation = 'Chỉ số mảng vượt quá kích thước đã khai báo.'; hint = 'Mảng a[n] có chỉ số hợp lệ từ 0 đến n-1.'; }
    else if (/is not a function|function (\w+) is not defined|cannot find function/i.test(msg)) { title = 'Hàm chưa được định nghĩa'; explanation = msg; hint = 'Kiểm tra tên hàm và khai báo / định nghĩa hàm trước khi gọi; nhớ #include thư viện cần thiết.'; }
    else if (/kết thúc với mã/.test(msg)) { title = 'Chương trình kết thúc với mã lỗi'; explanation = 'Hàm main trả về giá trị khác 0.'; hint = 'Kết thúc main bằng return 0; khi chương trình chạy đúng.'; }
    else if (/STL|vector|map|string/.test(msg)) { hint = 'Trình chạy trên trình duyệt chưa hỗ trợ STL — dùng mảng.'; }
    return withLine({ type: 'RuntimeError', title, line: ln, col, message: msg, explanation, hint });
  }
  if (lang === 'sql') {
    const msg = raw.replace(/^Lỗi SQL:\s*/, '');
    let k;
    let title = 'Lỗi SQL';
    let explanation = msg;
    let hint = 'Kiểm tra tên bảng, tên cột và cú pháp câu lệnh.';
    let line = 0;
    if ((k = /near "([^"]+)": syntax error/.exec(msg))) {
      title = `Lỗi cú pháp gần "${k[1]}"`; explanation = `SQLite không hiểu câu lệnh ở chỗ "${k[1]}".`;
      const g = closest(k[1].toUpperCase(), ['SELECT', 'FROM', 'WHERE', 'INSERT', 'INTO', 'VALUES', 'UPDATE', 'DELETE', 'CREATE', 'TABLE', 'ORDER', 'GROUP', 'LIMIT', 'JOIN']);
      hint = g && g !== k[1].toUpperCase() ? `Có phải ý em là ${g}?` : 'Kiểm tra dấu phẩy, dấu ngoặc và từ khóa quanh vị trí này.';
      const idx = codeLines.findIndex((l) => l.includes(k[1]));
      line = idx + 1;
    } else if ((k = /no such table: (\S+)/.exec(msg))) { title = `Không có bảng '${k[1]}'`; explanation = `Cơ sở dữ liệu không có bảng tên '${k[1]}'.`; hint = 'Các bảng mẫu: lop, hoc_sinh, mon_hoc, diem. Hoặc tạo bảng bằng CREATE TABLE trước.'; line = codeLines.findIndex((l) => l.includes(k[1])) + 1; }
    else if ((k = /no such column: (\S+)/.exec(msg))) { title = `Không có cột '${k[1]}'`; explanation = `Không tìm thấy cột '${k[1]}' trong các bảng của câu lệnh.`; hint = 'Kiểm tra chính tả tên cột. Bảng hoc_sinh có: id, ho_ten, gioi_tinh, ngay_sinh, ma_lop.'; line = codeLines.findIndex((l) => l.includes(k[1].split('.').pop())) + 1; }
    else if (/incomplete input/.test(msg)) { title = 'Câu lệnh chưa hoàn chỉnh'; explanation = 'Câu lệnh SQL bị thiếu phần cuối (thiếu ngoặc đóng, dấu nháy hoặc mệnh đề).'; hint = 'Kiểm tra dấu ngoặc và dấu nháy đơn đã được đóng chưa.'; }
    else if ((k = /UNIQUE constraint failed: (\S+)/.exec(msg))) { title = 'Trùng khóa'; explanation = `Giá trị của ${k[1]} đã tồn tại (phải duy nhất).`; hint = 'Dùng giá trị khác cho khóa chính, hoặc bỏ cột id để SQLite tự tăng.'; }
    else if (/NOT NULL constraint failed/.test(msg)) { title = 'Thiếu giá trị bắt buộc'; explanation = 'Một cột NOT NULL chưa được gán giá trị.'; hint = 'Cung cấp đủ giá trị cho các cột bắt buộc.'; }
    else if (/table \S+ already exists/.test(msg)) { title = 'Bảng đã tồn tại'; explanation = msg; hint = 'Dùng CREATE TABLE IF NOT EXISTS, hoặc đặt tên bảng khác.'; }
    else if (/has \d+ columns but \d+ values were supplied/.test(msg)) { title = 'Số giá trị không khớp số cột'; explanation = msg; hint = 'Liệt kê tên cột: INSERT INTO bang (cot1, cot2) VALUES (…, …).'; }
    return withLine({ type: 'SQLError', title, line: Math.max(0, line), message: msg, explanation, hint });
  }
  return withLine({ type: 'Error', title: 'Lỗi khi chạy chương trình', line: 0, message: raw, explanation: raw, hint: '' });
}

/** Does the program read input? (input / cin / scanf / prompt…) */
export function readsInput(code, lang) {
  const src = String(code || '');
  if (lang === 'python' || lang === 'pyvn') return /\binput\s*\(|\bnhap_(so|chuoi|so_thuc)\b|sys\.stdin/.test(src.replace(/#.*$/gm, ''));
  if (lang === 'c' || lang === 'cpp') return /\bcin\s*>>|\bscanf\s*\(|\bgetline\s*\(|\bgetchar\s*\(|\bgets\s*\(/.test(src.replace(/\/\/.*$/gm, ''));
  if (lang === 'javascript') return /\b(input|prompt|readline)\s*\(/.test(src.replace(/\/\/.*$/gm, ''));
  return false;
}
