// V-Code Edu — autocomplete popup for the textarea editor.
// Sources: snippets, language keywords & builtins, identifiers already in the document.
// Keys: ↑/↓ navigate, Enter/Tab accept, Esc close, Ctrl+Space open manually. Positioned at the caret with a mirror element.
import { h } from '../../core/dom.js';

const w = (s) => s.split(/\s+/).filter(Boolean);

const KEYWORDS = {
  python: w('False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield'),
  pyvn: w('neu nguoc_lai_neu nguoc_lai lap_voi trong_khoang trong khi_ma va hoac khong_phai dung sai ham tra_ve thoat_lap tiep_tuc bo_qua'),
  javascript: w('break case catch class const continue default delete do else export extends finally for function if import in instanceof let new of return super switch this throw try typeof var void while yield async await null undefined true false'),
  c: w('auto break case char const continue default do double else enum extern float for goto if inline int long return short signed sizeof static struct switch typedef union unsigned void volatile while bool true false NULL'),
  cpp: w('auto bool break case catch char class const continue default delete do double else enum false float for friend if inline int long namespace new nullptr operator private protected public return short signed sizeof static struct switch template this throw true try typedef typename unsigned using virtual void while'),
  sql: w('SELECT FROM WHERE INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE DROP ALTER ADD PRIMARY KEY FOREIGN REFERENCES NOT NULL UNIQUE DEFAULT JOIN INNER LEFT ON GROUP BY ORDER HAVING LIMIT OFFSET AS AND OR IN IS LIKE BETWEEN DISTINCT UNION ALL CASE WHEN THEN ELSE END EXISTS ASC DESC INTEGER TEXT REAL'),
  html: w('div span p a img ul ol li h1 h2 h3 h4 section header footer main nav article aside button input label form select option textarea table thead tbody tr th td strong em br hr link script style meta title head body html canvas video audio iframe figure figcaption'),
  css: w('color background background-color border border-radius margin padding width height max-width min-height display flex grid gap align-items justify-content flex-direction flex-wrap grid-template-columns position top left right bottom z-index font-size font-weight font-family line-height text-align text-decoration box-shadow opacity transition transform cursor overflow'),
};
const BUILTINS = {
  python: w('print input int float str bool list dict set tuple range len sum min max abs round sorted reversed enumerate zip map filter open type isinstance any all ord chr divmod pow super object Exception ValueError TypeError IndexError KeyError ZeroDivisionError append extend insert pop remove split join strip upper lower replace format items keys values'),
  pyvn: w('nhap_so nhap_so_thuc nhap_chuoi in_ra do_dai print input int float str len range'),
  javascript: w('console log Math JSON Object Array String Number Boolean Map Set Date parseInt parseFloat isNaN input prompt push pop shift map filter reduce forEach join split length includes indexOf slice toFixed'),
  c: w('printf scanf puts gets getchar putchar malloc free strlen strcpy strcmp strcat memset sqrt pow abs fabs'),
  cpp: w('std cout cin endl cerr string printf scanf getline sqrt pow abs swap max min setprecision fixed'),
  sql: w('COUNT SUM AVG MIN MAX ROUND LENGTH UPPER LOWER SUBSTR COALESCE IFNULL hoc_sinh lop mon_hoc diem ho_ten ma_lop gioi_tinh ngay_sinh ten_lop khoi ma_mon ten_mon hoc_sinh_id'),
  html: w('class id href src alt type value placeholder style'),
  css: w('none block inline-block flex grid center space-between auto solid transparent relative absolute fixed sticky bold'),
};

// Snippet bodies: \t = one indent unit, ${1:text} = selected placeholder, $0 = final caret.
const SNIPPETS = {
  python: [
    ['for', 'for i in range(${1:n}):\n\t$0', 'Vòng lặp for với range'],
    ['fori', 'for i in range(len(${1:a})):\n\t$0', 'Duyệt chỉ số của danh sách'],
    ['forin', 'for ${1:x} in ${2:a}:\n\t$0', 'Duyệt từng phần tử'],
    ['while', 'while ${1:dieu_kien}:\n\t$0', 'Vòng lặp while'],
    ['if', 'if ${1:dieu_kien}:\n\t$0', 'Câu lệnh if'],
    ['ifelse', 'if ${1:dieu_kien}:\n\t$0\nelse:\n\t', 'if … else'],
    ['elif', 'elif ${1:dieu_kien}:\n\t$0', 'Nhánh elif'],
    ['def', 'def ${1:ten_ham}(${2:}):\n\t$0', 'Định nghĩa hàm'],
    ['class', 'class ${1:TenLop}:\n\tdef __init__(self$0):\n\t\tpass', 'Định nghĩa lớp'],
    ['try', 'try:\n\t$0\nexcept ${1:Exception} as e:\n\tprint("Lỗi:", e)', 'Bắt lỗi try … except'],
    ['print', 'print(${1:})', 'In ra màn hình'],
    ['input', '${1:n} = int(input())', 'Nhập một số nguyên'],
    ['inputs', '${1:a}, ${2:b} = map(int, input().split())', 'Nhập nhiều số trên một dòng'],
    ['inputlist', '${1:a} = list(map(int, input().split()))', 'Nhập danh sách số'],
    ['main', 'if __name__ == "__main__":\n\t$0', 'Điểm bắt đầu chương trình'],
    ['with', 'with open("${1:du_lieu.txt}") as f:\n\t$0', 'Đọc tệp'],
  ],
  pyvn: [
    ['neu', 'neu ${1:dieu_kien}:\n\t$0', 'Câu lệnh nếu'],
    ['neunguoclai', 'neu ${1:dieu_kien}:\n\t$0\nnguoc_lai:\n\t', 'nếu … ngược lại'],
    ['lap_voi', 'lap_voi i trong_khoang(${1:1}, ${2:n + 1}):\n\t$0', 'Vòng lặp lặp với'],
    ['khi_ma', 'khi_ma ${1:dieu_kien}:\n\t$0', 'Vòng lặp khi mà'],
    ['in_ra', 'in_ra(${1:})', 'In ra màn hình'],
    ['nhap_so', '${1:n} = nhap_so()', 'Nhập một số nguyên'],
    ['ham', 'ham ${1:ten_ham}(${2:}):\n\t$0', 'Định nghĩa hàm'],
  ],
  c: [
    ['main', '#include <stdio.h>\n\nint main() {\n\t$0\n\treturn 0;\n}', 'Khung chương trình C'],
    ['for', 'for (int ${1:i} = 0; i < ${2:n}; i++) {\n\t$0\n}', 'Vòng lặp for'],
    ['while', 'while (${1:dieu_kien}) {\n\t$0\n}', 'Vòng lặp while'],
    ['if', 'if (${1:dieu_kien}) {\n\t$0\n}', 'Câu lệnh if'],
    ['ifelse', 'if (${1:dieu_kien}) {\n\t$0\n} else {\n\t\n}', 'if … else'],
    ['printf', 'printf("${1:%d}\\n", $0);', 'In có định dạng'],
    ['scanf', 'scanf("${1:%d}", &$0);', 'Đọc dữ liệu vào'],
    ['func', '${1:int} ${2:ten_ham}(${3:int x}) {\n\t$0\n}', 'Định nghĩa hàm'],
  ],
  cpp: [
    ['main', '#include <iostream>\nusing namespace std;\n\nint main() {\n\t$0\n\treturn 0;\n}', 'Khung chương trình C++'],
    ['for', 'for (int ${1:i} = 0; i < ${2:n}; i++) {\n\t$0\n}', 'Vòng lặp for'],
    ['while', 'while (${1:dieu_kien}) {\n\t$0\n}', 'Vòng lặp while'],
    ['if', 'if (${1:dieu_kien}) {\n\t$0\n}', 'Câu lệnh if'],
    ['ifelse', 'if (${1:dieu_kien}) {\n\t$0\n} else {\n\t\n}', 'if … else'],
    ['cout', 'cout << ${1:x} << endl;', 'In ra màn hình'],
    ['cin', 'cin >> ${1:x};', 'Đọc dữ liệu vào'],
    ['func', '${1:int} ${2:ten_ham}(${3:int x}) {\n\t$0\n}', 'Định nghĩa hàm'],
    ['struct', 'struct ${1:Diem} {\n\t$0\n};', 'Khai báo struct'],
  ],
  javascript: [
    ['log', 'console.log(${1:});', 'In ra console'],
    ['for', 'for (let ${1:i} = 0; i < ${2:n}; i++) {\n\t$0\n}', 'Vòng lặp for'],
    ['forof', 'for (const ${1:x} of ${2:arr}) {\n\t$0\n}', 'Duyệt từng phần tử'],
    ['while', 'while (${1:dieu_kien}) {\n\t$0\n}', 'Vòng lặp while'],
    ['if', 'if (${1:dieu_kien}) {\n\t$0\n}', 'Câu lệnh if'],
    ['ifelse', 'if (${1:dieu_kien}) {\n\t$0\n} else {\n\t\n}', 'if … else'],
    ['function', 'function ${1:tenHam}(${2:}) {\n\t$0\n}', 'Khai báo hàm'],
    ['arrow', 'const ${1:tenHam} = (${2:}) => {\n\t$0\n};', 'Hàm mũi tên'],
    ['input', 'const ${1:n} = Number(input());', 'Đọc một số'],
  ],
  html: [
    ['html5', '<!DOCTYPE html>\n<html lang="vi">\n<head>\n\t<meta charset="UTF-8">\n\t<meta name="viewport" content="width=device-width, initial-scale=1">\n\t<title>${1:Trang của em}</title>\n</head>\n<body>\n\t$0\n</body>\n</html>', 'Khung trang HTML5'],
    ['div', '<div class="${1:}">$0</div>', 'Khối div'],
    ['a', '<a href="${1:#}">$0</a>', 'Liên kết'],
    ['img', '<img src="${1:anh.png}" alt="${2:mô tả}">', 'Hình ảnh'],
    ['ul', '<ul>\n\t<li>$0</li>\n</ul>', 'Danh sách'],
    ['button', '<button type="button">${1:Bấm}</button>', 'Nút bấm'],
    ['input', '<input type="${1:text}" placeholder="$0">', 'Ô nhập'],
    ['table', '<table>\n\t<tr>\n\t\t<th>${1:Cột}</th>\n\t</tr>\n\t<tr>\n\t\t<td>$0</td>\n\t</tr>\n</table>', 'Bảng'],
    ['link', '<link rel="stylesheet" href="${1:style.css}">', 'Nhúng CSS'],
    ['script', '<script>\n\t$0\n</script>', 'Thẻ script'],
  ],
  css: [
    ['flex', 'display: flex;\nalign-items: ${1:center};\njustify-content: ${2:center};\ngap: ${3:8px};', 'Bố cục flex'],
    ['grid', 'display: grid;\ngrid-template-columns: ${1:repeat(3, 1fr)};\ngap: ${2:16px};', 'Bố cục grid'],
    ['media', '@media (max-width: ${1:600px}) {\n\t$0\n}', 'Responsive'],
    ['rule', '${1:.lop} {\n\t$0\n}', 'Quy tắc CSS'],
  ],
  sql: [
    ['sel', 'SELECT ${1:*} FROM ${2:hoc_sinh}$0;', 'Truy vấn SELECT'],
    ['selw', 'SELECT ${1:*} FROM ${2:hoc_sinh} WHERE ${3:dieu_kien};', 'SELECT … WHERE'],
    ['join', 'SELECT ${1:hs.ho_ten, d.diem}\nFROM hoc_sinh hs\nJOIN diem d ON d.hoc_sinh_id = hs.id$0;', 'Nối hai bảng'],
    ['group', 'SELECT ${1:ma_lop}, COUNT(*) AS so_luong\nFROM ${2:hoc_sinh}\nGROUP BY ${1:ma_lop};', 'Gom nhóm'],
    ['ins', 'INSERT INTO ${1:bang} (${2:cot1, cot2}) VALUES (${3:gia_tri1, gia_tri2});', 'Thêm dòng'],
    ['upd', 'UPDATE ${1:bang} SET ${2:cot} = ${3:gia_tri} WHERE ${4:dieu_kien};', 'Cập nhật'],
    ['ct', 'CREATE TABLE ${1:ten_bang} (\n\tid INTEGER PRIMARY KEY,\n\t${2:ten} TEXT NOT NULL\n);', 'Tạo bảng'],
  ],
};

const KIND_LABEL = { snippet: 'mẫu', keyword: 'từ khóa', builtin: 'có sẵn', word: 'trong tệp' };

let mirror = null;
/** Pixel position of character `pos` inside `ta`, relative to the textarea's visible box (mirror technique). */
export function caretCoords(ta, pos) {
  if (!mirror) {
    mirror = document.createElement('div');
    mirror.setAttribute('aria-hidden', 'true');
    mirror.style.cssText = 'position:absolute;top:0;left:-99999px;visibility:hidden;overflow:hidden;pointer-events:none';
    document.body.appendChild(mirror);
  }
  const cs = getComputedStyle(ta);
  const props = ['boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'letterSpacing', 'lineHeight', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderLeftWidth', 'whiteSpace', 'wordWrap', 'overflowWrap', 'wordBreak', 'tabSize', 'textTransform'];
  props.forEach((p) => { mirror.style[p] = cs[p]; });
  mirror.style.width = `${ta.clientWidth}px`;
  mirror.style.whiteSpace = cs.whiteSpace === 'pre' || ta.getAttribute('wrap') === 'off' ? 'pre' : 'pre-wrap';
  mirror.textContent = ta.value.slice(0, pos);
  const marker = document.createElement('span');
  marker.textContent = ta.value.slice(pos, pos + 1) || '.';
  mirror.appendChild(marker);
  const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.6;
  return { left: marker.offsetLeft - ta.scrollLeft, top: marker.offsetTop - ta.scrollTop, height: lh };
}

function wordRe(lang) {
  if (lang === 'css' || lang === 'html') return /[\w-]+$/;
  if (lang === 'python' || lang === 'pyvn') return /[\w\u00C0-\u1EF9]+$/;
  return /[\w$]+$/;
}

function inStringOrComment(lineBefore, lang) {
  let q = null;
  for (let i = 0; i < lineBefore.length; i++) {
    const ch = lineBefore[i];
    if (q) { if (ch === '\\') { i += 1; continue; } if (ch === q) q = null; continue; }
    if (ch === '"' || ch === "'" || (ch === '`' && lang === 'javascript')) { q = ch; continue; }
    if ((lang === 'python' || lang === 'pyvn') && ch === '#') return true;
    if ((lang === 'c' || lang === 'cpp' || lang === 'javascript') && ch === '/' && lineBefore[i + 1] === '/') return true;
    if (lang === 'sql' && ch === '-' && lineBefore[i + 1] === '-') return true;
  }
  return Boolean(q) && lang !== 'html';
}

/** Expand a snippet body: returns { text, selStart, selEnd } (offsets inside text). */
export function expandSnippet(body, indent, unit) {
  let text = '';
  let selStart = -1;
  let selEnd = -1;
  let caret = -1;
  const src = body.replace(/\t/g, unit).replace(/\n/g, `\n${indent}`);
  const re = /\$\{(\d+):([^}]*)\}|\$(\d+)/g;
  let last = 0;
  let m;
  while ((m = re.exec(src))) {
    text += src.slice(last, m.index);
    if (m[1] !== undefined) {
      if (m[1] === '1' && selStart < 0) { selStart = text.length; selEnd = text.length + m[2].length; }
      text += m[2];
    } else if (m[3] === '0') caret = text.length;
    last = m.index + m[0].length;
  }
  text += src.slice(last);
  if (selStart < 0) { selStart = selEnd = caret >= 0 ? caret : text.length; }
  return { text, selStart, selEnd };
}

/**
 * createAutocomplete({ textarea, root, getLang, getUnit, replaceRange(start, end, text, selStart, selEnd), getWords })
 * root: positioned element the popup lives in (the .code-editor).
 */
export function createAutocomplete({ textarea: ta, root, getLang, getUnit, replaceRange, getWords }) {
  const list = h('div', { class: 'ac__list', role: 'listbox', id: `ac-${Math.random().toString(36).slice(2, 8)}` });
  const foot = h('div', { class: 'ac__foot' }, h('span', null, '↑↓ chọn'), h('span', null, 'Enter / Tab chèn'), h('span', null, 'Esc đóng'));
  const el = h('div', { class: 'ac', hidden: true }, list, foot);
  root.appendChild(el);
  let items = [];
  let sel = 0;
  let start = 0;
  let open = false;

  function candidates(lang, prefix) {
    const p = prefix.toLowerCase();
    const out = [];
    const seen = new Set();
    const push = (label, kind, detail, insert) => {
      const key = `${kind}:${label}`;
      if (seen.has(key)) return;
      const l = label.toLowerCase();
      let score;
      if (l.startsWith(p)) score = label.startsWith(prefix) ? 0 : 1;
      else {
        // subsequence match (e.g. "prt" → print)
        let j = 0;
        for (const ch of l) if (ch === p[j]) j += 1;
        if (j < p.length || p.length < 2) return;
        score = 3;
      }
      if (kind !== 'snippet' && l === p) return; // nothing to complete
      seen.add(key);
      out.push({ label, kind, detail, insert, score: score + { snippet: 0, keyword: 0.2, builtin: 0.3, word: 0.5 }[kind] + label.length / 100 });
    };
    (SNIPPETS[lang] || []).forEach(([label, body, desc]) => push(label, 'snippet', desc, body));
    (KEYWORDS[lang] || []).forEach((k) => push(lang === 'sql' && prefix === prefix.toLowerCase() ? k.toLowerCase() : k, 'keyword', 'Từ khóa', null));
    if (lang === 'pyvn') KEYWORDS.python.forEach((k) => push(k, 'keyword', 'Từ khóa Python', null));
    (BUILTINS[lang] || []).forEach((k) => push(k, 'builtin', 'Có sẵn', null));
    const builtinsSet = new Set([...(KEYWORDS[lang] || []), ...(BUILTINS[lang] || [])]);
    for (const wd of getWords()) if (!builtinsSet.has(wd) && wd !== prefix) push(wd, 'word', 'Trong tệp', null);
    return out.sort((a, b) => a.score - b.score).slice(0, 40);
  }

  function render() {
    list.replaceChildren(...items.map((it, i) => h('div', {
      class: `ac__item${i === sel ? ' is-active' : ''}`, role: 'option', id: `${list.id}-${i}`, 'aria-selected': String(i === sel),
      onMousedown: (e) => { e.preventDefault(); sel = i; accept(); },
    },
    h('span', { class: `ac__kind ac__kind--${it.kind}`, 'aria-hidden': 'true' }, it.kind === 'snippet' ? '{}' : it.kind === 'keyword' ? 'K' : it.kind === 'builtin' ? 'ƒ' : 'ab'),
    h('span', { class: 'ac__label' }, it.label),
    h('span', { class: 'ac__detail' }, it.kind === 'snippet' ? it.detail : KIND_LABEL[it.kind]))));
    ta.setAttribute('aria-activedescendant', `${list.id}-${sel}`);
    list.children[sel]?.scrollIntoView({ block: 'nearest' });
  }

  function position() {
    const c = caretCoords(ta, start);
    const sc = ta.parentElement; // scroller
    const rootRect = root.getBoundingClientRect();
    const scRect = sc.getBoundingClientRect();
    const baseLeft = scRect.left - rootRect.left + c.left;
    const baseTop = scRect.top - rootRect.top + c.top;
    el.style.left = '0px';
    el.style.top = '0px';
    const pw = el.offsetWidth || 300;
    const ph = el.offsetHeight || 200;
    let left = Math.max(4, Math.min(baseLeft, root.clientWidth - pw - 6));
    let top = baseTop + c.height + 2;
    if (top + ph > root.clientHeight - 4 && baseTop - ph - 2 > 0) top = baseTop - ph - 2;
    el.style.left = `${Math.round(left)}px`;
    el.style.top = `${Math.round(top)}px`;
  }

  function show(force = false) {
    const lang = getLang();
    const pos = ta.selectionStart;
    if (pos !== ta.selectionEnd) { close(); return; }
    const v = ta.value;
    const lineStart = v.lastIndexOf('\n', pos - 1) + 1;
    const before = v.slice(lineStart, pos);
    if (!force && inStringOrComment(before, lang)) { close(); return; }
    const m = wordRe(lang).exec(before);
    const prefix = m ? m[0] : '';
    if (!force && prefix.length < 2) { close(); return; }
    if (/^\d/.test(prefix)) { close(); return; }
    start = pos - prefix.length;
    items = candidates(lang, prefix);
    if (!items.length) { close(); return; }
    sel = 0;
    open = true;
    el.hidden = false;
    ta.setAttribute('aria-expanded', 'true');
    ta.setAttribute('aria-controls', list.id);
    render();
    position();
  }

  function close() {
    if (!open && el.hidden) return;
    open = false;
    el.hidden = true;
    ta.setAttribute('aria-expanded', 'false');
    ta.removeAttribute('aria-activedescendant');
  }

  function accept() {
    const it = items[sel];
    if (!it) { close(); return; }
    const pos = ta.selectionStart;
    const v = ta.value;
    const lineStart = v.lastIndexOf('\n', start - 1) + 1;
    const indent = (v.slice(lineStart, start).match(/^[ \t]*/) || [''])[0];
    close();
    if (it.insert) {
      const { text, selStart, selEnd } = expandSnippet(it.insert, indent, getUnit());
      replaceRange(start, pos, text, selStart, selEnd);
    } else {
      let text = it.label;
      let caret = text.length;
      const lang = getLang();
      const callable = it.kind === 'builtin' && /^(print|input|len|range|int|float|str|sum|min|max|abs|round|sorted|list|dict|set|tuple|enumerate|zip|map|filter|open|type|in_ra|nhap_so|nhap_chuoi|nhap_so_thuc|printf|scanf|puts|strlen|sqrt|pow|parseInt|parseFloat|prompt|COUNT|SUM|AVG|MIN|MAX|ROUND|LENGTH|UPPER|LOWER)$/.test(it.label);
      if (callable && v[pos] !== '(' && !(lang === 'pyvn' && /^nhap_/.test(it.label) && false)) { text += '()'; caret = text.length - 1; }
      replaceRange(start, pos, text, caret, caret);
    }
  }

  return {
    el,
    isOpen: () => open,
    close,
    /** Called from the editor's keydown handler first. Returns true when the key was consumed. */
    handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Space') { e.preventDefault(); show(true); return true; }
      if (!open) return false;
      if (e.key === 'ArrowDown') { e.preventDefault(); sel = (sel + 1) % items.length; render(); return true; }
      if (e.key === 'ArrowUp') { e.preventDefault(); sel = (sel - 1 + items.length) % items.length; render(); return true; }
      if (e.key === 'PageDown') { e.preventDefault(); sel = Math.min(items.length - 1, sel + 6); render(); return true; }
      if (e.key === 'PageUp') { e.preventDefault(); sel = Math.max(0, sel - 6); render(); return true; }
      if ((e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) || (e.key === 'Tab' && !e.shiftKey)) { e.preventDefault(); accept(); return true; }
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return true; }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'Home' || e.key === 'End') close();
      return false;
    },
    /** Called on textarea input events. */
    onInput(e) {
      if (!e || !e.inputType) { close(); return; } // programmatic change
      if (e.inputType === 'insertText' && e.data && /[\w\u00C0-\u1EF9$-]/.test(e.data)) show(false);
      else if (e.inputType === 'deleteContentBackward' && open) show(false);
      else close();
    },
    reposition() { if (open) position(); },
  };
}
