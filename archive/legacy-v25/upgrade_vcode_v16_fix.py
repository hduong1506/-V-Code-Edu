# -*- coding: utf-8 -*-
"""
V-CODE EDU v16.1 — VÁ TRIỆT ĐỂ:
1. Thay thế chính xác #view-home (xử lý thẻ lồng nhau) sang giao diện Swiss 3D mượt 60fps & tắt Three.js cũ.
2. Đặt IDE mặc định chỉ gồm chú thích # hướng dẫn, bấm các nút ví dụ mới chèn code mẫu.
3. Ghi đè trực tiếp js/scratch-bridge.js để sửa dứt điểm lỗi Scratch Live (if không hiện Thực thi).
4. Thay thế toàn bộ emoji AI bằng hệ thống icon SVG nét mảnh chuyên nghiệp (không làm mất hình).
"""
import os
import re

def svg_ico(path_d, size=15):
    return (
        f'<svg class="vc-ico" width="{size}" height="{size}" viewBox="0 0 24 24" '
        f'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" '
        f'stroke-linejoin="round" aria-hidden="true">{path_d}</svg>'
    )

ICON_MAP = {
    "🏠": svg_ico('<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>'),
    "📚": svg_ico('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
    "💻": svg_ico('<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>'),
    "🏫": svg_ico('<path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>'),
    "🏆": svg_ico('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>'),
    "🤖": svg_ico('<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>'),
    "🚀": svg_ico('<path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/>'),
    "📝": svg_ico('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>'),
    "⚙️": svg_ico('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.6.85 1 1.51 1H21a2 2 0 1 1 0 4h-.09c-.66 0-1.25.4-1.51 1z"/>'),
    "👨‍🏫": svg_ico('<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    "🎓": svg_ico('<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>'),
    "☀️": svg_ico('<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>'),
    "🌙": svg_ico('<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'),
    "🔗": svg_ico('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
    "⬇️": svg_ico('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
    "🔐": svg_ico('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    "🔒": svg_ico('<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>'),
    "🗑️": svg_ico('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>'),
    "✏️": svg_ico('<path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>'),
    "📊": svg_ico('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>'),
    "🔥": svg_ico('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    "⚡": svg_ico('<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>'),
    "✅": svg_ico('<polyline points="20 6 9 17 4 12"/>'),
    "⚠️": svg_ico('<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>'),
    "✨": "", "🎉": "", "👋": "", "💎": "", "👑": "", "🧩": "", "🎯": "", "💡": "", "📂": "", "🟠": "", "🟢": "", "▶": ""
}

def replace_emojis_with_svg(text):
    for em, rep in ICON_MAP.items():
        if rep:
            text = text.replace(em, rep + " ")
        else:
            text = text.replace(em + " ", "").replace(em, "")
    return text

def replace_element_by_id(html, elem_id, replacement):
    pattern = re.compile(rf'<(section|div)\b[^>]*\bid=["\']{re.escape(elem_id)}["\'][^>]*>', re.IGNORECASE)
    m = pattern.search(html)
    if not m:
        return html, False
    tag = m.group(1).lower()
    start = m.start()
    pos = m.end()
    depth = 1
    token_re = re.compile(rf'<(/?){tag}\b[^>]*>', re.IGNORECASE)
    for tm in token_re.finditer(html, pos):
        if tm.group(1) == '/':
            depth -= 1
            if depth == 0:
                return html[:start] + replacement + html[tm.end():], True
        else:
            if not tm.group(0).rstrip().endswith('/>'):
                depth += 1
    return html, False

SCRATCH_BRIDGE_V16_JS = """// V-CODE EDU v16.1 — SCRATCH 3.0 LIVE BRIDGE (CHÍNH XÁC 100%, ICON SVG SẠCH)
window.VCodeScratchBridge = {
  esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  stripComment(line) {
    let inStr = null;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if ((ch === '"' || ch === "'") && line[i - 1] !== '\\\\') {
        inStr = inStr === ch ? null : (inStr || ch);
      } else if (ch === '#' && !inStr) {
        return line.slice(0, i).trim();
      }
    }
    return line.trim();
  },

  parseLine(rawLine) {
    const t = this.stripComment(rawLine);
    if (!t) return null;

    let m = t.match(/^(?:if|neu)(?:\\s+|\\s*(?=\\())(.+?):?$/i);
    if (m) return { type: 'control', label: `Nếu <span class="sc-cond">${this.esc(m[1].trim())}</span> thì` };

    m = t.match(/^(?:elif|nguoc_lai_neu)(?:\\s+|\\s*(?=\\())(.+?):?$/i);
    if (m) return { type: 'control', label: `Ngược lại nếu <span class="sc-cond">${this.esc(m[1].trim())}</span> thì` };

    if (/^(?:else|nguoc_lai)\\s*:?$/i.test(t)) return { type: 'control', label: `Ngược lại` };

    m = t.match(/^(?:for|lap_voi)\\s+([a-zA-Z_]\\w*)\\s+(?:in|trong_khoang)\\s+(.+?):?$/i);
    if (m) {
      let rng = m[2].trim();
      const rm = rng.match(/^range\\s*\\((.*)\\)$/);
      if (rm) rng = rm[1];
      return { type: 'loop', label: `Lặp biến <span class="sc-var">${this.esc(m[1])}</span> trong <span class="sc-val">${this.esc(rng)}</span>` };
    }

    m = t.match(/^(?:while|khi_ma)(?:\\s+|\\s*(?=\\())(.+?):?$/i);
    if (m) return { type: 'loop', label: `Lặp khi <span class="sc-cond">${this.esc(m[1].trim())}</span>` };

    m = t.match(/^def\\s+([a-zA-Z_]\\w*)\\s*\\(([^)]*)\\)\\s*:?$/i);
    if (m) return { type: 'func', label: `Định nghĩa hàm <span class="sc-val">${this.esc(m[1])}(${this.esc(m[2])})</span>` };

    m = t.match(/^return\\b(.*)$/i);
    if (m) return { type: 'func', label: `Trả về <span class="sc-val">${this.esc(m[1].trim() || 'None')}</span>` };

    m = t.match(/^([a-zA-Z_]\\w*(?:\\s*,\\s*[a-zA-Z_]\\w*)*)\\s*=\\s*(?:int|float|str)?\\s*\\(?.*(?:input|nhap_so|nhap_chuoi|nhap_so_thuc)\\s*\\(/i);
    if (m) return { type: 'sensing', label: `Nhập dữ liệu lưu vào <span class="sc-var">${this.esc(m[1])}</span>` };

    m = t.match(/^(?:print|in_ra)\\s*\\((.*)\\)$/i);
    if (m) return { type: 'looks', label: `Hiển thị ra màn hình <span class="sc-val">${this.esc(m[1].trim())}</span>` };

    m = t.match(/^([a-zA-Z_]\\w*)\\s*(\\+=|-=|\\*=|\\/=)\\s*(.+)$/);
    if (m) {
      const op = { '+=': 'tăng thêm', '-=': 'giảm đi', '*=': 'nhân với', '/=': 'chia cho' }[m[2]];
      return { type: 'data', label: `Thay đổi biến <span class="sc-var">${this.esc(m[1])}</span> ${op} <span class="sc-val">${this.esc(m[3].trim())}</span>` };
    }

    m = t.match(/^([a-zA-Z_]\\w*(?:\\s*,\\s*[a-zA-Z_]\\w*)*)\\s*=\\s*(.+)$/);
    if (m) return { type: 'data', label: `Đặt biến <span class="sc-var">${this.esc(m[1])}</span> thành <span class="sc-val">${this.esc(m[2].trim())}</span>` };

    if (/^break$/i.test(t)) return { type: 'control', label: `Thoát vòng lặp (break)` };
    if (/^continue$/i.test(t)) return { type: 'control', label: `Chuyển lượt lặp tiếp theo` };

    return { type: 'stmt', label: `Lệnh: <span class="sc-val">${this.esc(t)}</span>` };
  },

  render(code, targetEl) {
    const el = typeof targetEl === 'string' ? document.getElementById(targetEl) : (targetEl || document.getElementById('scratch-blocks-view') || document.getElementById('scratch-canvas'));
    if (!el) return '';
    const lines = String(code || '').replace(/\\r\\n/g, '\\n').split('\\n');
    let html = `<div class="sc-hat-block">Khi bấm vào Chạy Chương Trình (V-Code Edu)</div>`;
    let count = 0;
    for (const raw of lines) {
      const blk = this.parseLine(raw);
      if (!blk) continue;
      count++;
      const spaces = (raw.match(/^[ \\t]*/) || [''])[0].replace(/\\t/g, '    ').length;
      const lvl = Math.min(5, Math.floor(spaces / 4));
      html += `<div class="sc-block sc-${blk.type}" style="margin-left:${lvl * 22}px">${blk.label}</div>`;
    }
    if (!count) {
      html += `<div class="sc-empty-hint">Bắt đầu gõ lệnh Python ở khung bên trái (ví dụ: <code>x = int(input())</code> hoặc <code>if x &gt; 0:</code>) để xem khối Scratch lắp ghép trực tiếp.</div>`;
    }
    el.innerHTML = html;
    return html;
  }
};

window.renderScratchFromPython = (code, target) => window.VCodeScratchBridge.render(code, target);
window.renderScratchLive = (code, target) => window.VCodeScratchBridge.render(code, target);
window.updateScratchBlocks = (code, target) => window.VCodeScratchBridge.render(code, target);
"""

THREE_HERO_LIGHT_JS = """// V-CODE EDU v16.1 — TẮT THREE.JS PARTICLE CŨ ĐỂ TỐI ƯU 60FPS KHÔNG LAG
window.initThreeHero = function () {};
"""

SWISS_HOME_V161_HTML = """
    <section id="view-home" class="view-section active swiss-home-root">
      <div id="swiss-cursor-glow" class="swiss-cursor-glow" aria-hidden="true"></div>
      <div class="swiss-grid-bg" aria-hidden="true"></div>

      <div class="swiss-hero swiss-reveal">
        <div class="swiss-hero-left">
          <div class="swiss-eyebrow">
            <span class="swiss-dot"></span>
            <span>V-CODE EDU • NỀN TẢNG HỌC LẬP TRÌNH THẾ HỆ MỚI</span>
          </div>
          <h1 class="swiss-title">
            Tư duy Thuật toán.<br/>
            <span class="swiss-title-accent">Chính xác từ dòng lệnh đầu tiên.</span>
          </h1>
          <p class="swiss-subtitle">
            Môi trường thực hành Python, Python Tiếng Việt, HTML/CSS, C và C++ tích hợp khối lệnh Scratch 3.0 theo thời gian thực cùng không gian lớp học đồng bộ đám mây.
          </p>
          <div class="swiss-cta-row">
            <button class="btn btn-primary swiss-magnetic" onclick="switchView('workspace')">Mở trình soạn thảo IDE</button>
            <button class="btn swiss-magnetic" onclick="switchView('classroom')">Vào Lớp học trực tuyến</button>
            <button class="btn swiss-magnetic" onclick="switchView('learning')">Khám phá Khóa học</button>
          </div>
          <div class="swiss-metrics">
            <div><strong>250+</strong><span>Bài học bài bản</span></div>
            <div><strong>05</strong><span>Ngôn ngữ cốt lõi</span></div>
            <div><strong>100</strong><span>Chặng thử thách</span></div>
            <div><strong>60fps</strong><span>Online &amp; Offline</span></div>
          </div>
        </div>

        <div class="swiss-hero-right">
          <div class="swiss-3d-stage swiss-tilt-card">
            <div class="swiss-stage-bar">
              <span class="s-dot"></span><span class="s-dot"></span><span class="s-dot"></span>
              <span class="s-filename">main.py — V-Code Engine v16</span>
            </div>
            <pre class="swiss-stage-code"><code><span class="tk-cm"># Nhập hai số nguyên x, y</span>
<span class="tk-id">x</span> = <span class="tk-fn">int</span>(<span class="tk-fn">input</span>(<span class="tk-str">"Nhập x: "</span>))
<span class="tk-id">y</span> = <span class="tk-fn">int</span>(<span class="tk-fn">input</span>(<span class="tk-str">"Nhập y: "</span>))

<span class="tk-kw">if</span> x + y &gt; <span class="tk-num">0</span>:
    <span class="tk-fn">print</span>(<span class="tk-str">"Tổng dương:"</span>, x + y)
<span class="tk-kw">else</span>:
    <span class="tk-fn">print</span>(<span class="tk-str">"Tổng không dương"</span>)</code></pre>
            <div class="swiss-stage-floating-card">
              <div class="sf-label">SCRATCH 3.0 LIVE SYNC</div>
              <div class="sf-block">Nếu <span>x + y &gt; 0</span> thì</div>
              <div class="sf-block sf-sub">Hiển thị <span>"Tổng dương:", x + y</span></div>
            </div>
          </div>
        </div>
      </div>

      <div class="swiss-section swiss-reveal">
        <div class="swiss-sec-head">
          <span class="swiss-sec-index">01 / KIẾN TRÚC NỀN TẢNG</span>
          <h2>Mọi công cụ cần thiết cho Giáo viên và Học sinh</h2>
        </div>
        <div class="swiss-bento">
          <div class="swiss-card swiss-tilt-card" onclick="switchView('workspace')">
            <div class="swiss-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <div class="swiss-card-num">01 • IDE &amp; SCRATCH LIVE</div>
            <h3>Biên dịch trực tiếp &amp; Khối trực quan</h3>
            <p>Hỗ trợ phím Tab, tự động thụt lề sau <code>if/for/while</code>, nhập dữ liệu <code>input()</code> tương tác và tự động đồng bộ khối lệnh Scratch 3.0.</p>
            <span class="swiss-card-link">Mở IDE thực hành &rarr;</span>
          </div>

          <div class="swiss-card swiss-tilt-card" onclick="switchView('classroom')">
            <div class="swiss-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>
            </div>
            <div class="swiss-card-num">02 • LỚP HỌC SỐ CLOUD</div>
            <h3>Quản trị lớp học &amp; Giao bài tự động</h3>
            <p>Tạo nhiều lớp học, quản lý bằng menu gọn gàng, giao bài tập kèm bộ kiểm thử Test Case và đồng bộ danh sách học sinh trên Cloud Firestore.</p>
            <span class="swiss-card-link">Vào Lớp học &rarr;</span>
          </div>

          <div class="swiss-card swiss-tilt-card" onclick="switchView('challenges')">
            <div class="swiss-card-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            </div>
            <div class="swiss-card-num">03 • ĐẤU TRƯỜNG THỬ THÁCH</div>
            <h3>100 Bài toán Phân hạng</h3>
            <p>Lộ trình 100 bài thực chiến từ nhập môn đến luyện thi Học sinh giỏi Python, C, C++ chia cấp bậc từ Rank D đến BOSS.</p>
            <span class="swiss-card-link">Thử sức ngay &rarr;</span>
          </div>
        </div>
      </div>

      <div class="swiss-section swiss-reveal">
        <div class="swiss-sec-head">
          <span class="swiss-sec-index">02 / QUY TRÌNH KHÉP KÍN</span>
          <h2>Vận hành mượt mà trên Máy tính &amp; Điện thoại</h2>
        </div>
        <div class="swiss-process-grid">
          <div class="swiss-step swiss-tilt-card" onclick="switchView('learning')">
            <span class="step-code">STEP 01</span>
            <h4>Học qua 250+ bài giảng</h4>
            <p>Hệ thống giáo trình bám sát chương trình Tin học THCS &amp; THPT với ví dụ chạy trực tiếp.</p>
          </div>
          <div class="swiss-step swiss-tilt-card" onclick="switchView('workspace')">
            <span class="step-code">STEP 02</span>
            <h4>Lập trình &amp; Kiểm thử</h4>
            <p>Viết code không cần cài môi trường, nhập dữ liệu đầu vào trực tiếp và quan sát sơ đồ khối.</p>
          </div>
          <div class="swiss-step swiss-tilt-card" onclick="switchView('classroom')">
            <span class="step-code">STEP 03</span>
            <h4>Nộp bài &amp; Đồng bộ Cloud</h4>
            <p>Lưu trữ bền vững trên Firebase, tự động hoạt động ổn định cả khi mất kết nối mạng.</p>
          </div>
        </div>
      </div>
    </section>
"""

EXTRA_V161_CSS = """
/* ==================== V16.1: ICON SYSTEM & SWISS CARD ICONS ==================== */
.vc-ico { display: inline-block; vertical-align: -2.5px; flex-shrink: 0; }
.swiss-card-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: grid; place-items: center; margin-bottom: 14px;
  background: rgba(16, 185, 129, 0.12); color: #10B981;
  border: 1px solid rgba(16, 185, 129, 0.25);
}
.sc-empty-hint {
  color: #94A3B8; font-size: 13px; line-height: 1.6; padding: 14px 8px;
  border: 1px dashed rgba(148, 163, 184, 0.25); border-radius: 10px; margin-top: 8px;
}
"""

DEFAULT_CLEAN_IDE_CODE = """# Viết chương trình Python của bạn tại đây...
# Mẹo: Dùng phím Tab để thụt lề, hoặc bấm các nút ví dụ bên trên (+ Nhập số N, + Vòng lặp for...) để chèn mẫu nhanh.
"""

def run_fix():
    with open("js/scratch-bridge.js", "w", encoding="utf-8") as f:
        f.write(SCRATCH_BRIDGE_V16_JS.strip() + "\n")
    print("✔ Đã sửa triệt để js/scratch-bridge.js (if/for/while chuẩn 100%, bỏ icon AI)")

    with open("js/three-hero.js", "w", encoding="utf-8") as f:
        f.write(THREE_HERO_LIGHT_JS.strip() + "\n")
    print("✔ Đã tắt hiệu ứng Three.js cũ gây lag trong js/three-hero.js")

    if os.path.exists("js/v16-core.js"):
        v16 = open("js/v16-core.js", "r", encoding="utf-8").read()
        clean_hook = """
// V16.1: Đặt IDE mặc định chỉ gồm hướng dẫn ngắn, bấm nút ví dụ mới chèn code mẫu
window.addEventListener('DOMContentLoaded', () => {
  const ed = document.getElementById('code-editor');
  if (ed && (!ed.value.trim() || ed.value.includes('Bài 3: Tính tổng các số chẵn'))) {
    ed.value = `# Viết chương trình Python của bạn tại đây...\\n# Mẹo: Dùng phím Tab để thụt lề, hoặc bấm các nút ví dụ bên trên (+ Nhập số N, + Vòng lặp for...) để chèn mẫu nhanh.\\n`;
    if (window.VCodeScratchBridge) window.VCodeScratchBridge.render(ed.value);
  }
});
"""
        if "V16.1: Đặt IDE mặc định" not in v16:
            with open("js/v16-core.js", "w", encoding="utf-8") as f:
                f.write(v16.rstrip() + "\n" + clean_hook)
            print("✔ Đã đặt IDE mặc định sạch trong js/v16-core.js")

    css_path = "css/design-system.css"
    if os.path.exists(css_path):
        css = open(css_path, "r", encoding="utf-8").read()
        if "V16.1: ICON SYSTEM" not in css:
            with open(css_path, "w", encoding="utf-8") as f:
                f.write(css.rstrip() + "\n\n" + EXTRA_V161_CSS.strip() + "\n")
            print("✔ Đã thêm CSS hệ thống icon SVG vào css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v15.0", "v16.0").replace("v14.0", "v16.0")

        html, replaced = replace_element_by_id(html, "view-home", SWISS_HOME_V161_HTML.strip())
        if replaced:
            print("✔ ĐÃ THAY THẾ THÀNH CÔNG Trang chủ Swiss 3D mới (#view-home)")
        else:
            print("⚠ Không tìm thấy thẻ có id='view-home' trong index.html")

        html = re.sub(
            r'(<textarea[^>]*id=["\']code-editor["\'][^>]*>)[\s\S]*?(</textarea>)',
            r'\1' + DEFAULT_CLEAN_IDE_CODE + r'\2',
            html,
            count=1
        )
        print("✔ Đã làm sạch code mặc định trong khung IDE (#code-editor)")

        html = replace_emojis_with_svg(html)
        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã thay toàn bộ biểu tượng cũ bằng hệ thống icon SVG trong index.html")

    for fpath in ["js/app.js", "js/ai-tutor.js"]:
        if os.path.exists(fpath):
            txt = replace_emojis_with_svg(open(fpath, "r", encoding="utf-8").read())
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(txt)
            print(f"✔ Đã đồng bộ hệ thống icon SVG trong {fpath}")

    print("\nHOÀN TẤT VÁ LỖI V-CODE EDU v16.1!")

if __name__ == "__main__":
    run_fix()