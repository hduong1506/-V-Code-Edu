# -*- coding: utf-8 -*-
"""
V-CODE EDU v10.0 — HOÀN THIỆN 3 TRỤ CỘT CHUẨN OLM.VN & AI THÔNG MINH:
1. Robot AI v10: Không cần Key vẫn trả lời cục bộ thông minh + định dạng Markdown đẹp,
   có Key chuẩn (AIza... / sk-...) gọi API thực thụ, hướng dẫn lấy Key 4 bước chi tiết.
2. Giao diện Đăng nhập / Đăng ký 2 cột chuẩn OLM.VN.
3. Hệ thống Lớp học chuẩn OLM.VN (Thanh icon trái, Thông tin lớp, 4 Tab, Thảo luận, Chấm bài).
"""
import os

AI_TUTOR_V10_JS = """// V-CODE EDU v10.0 — AI CỤC BỘ THÔNG MINH (KHÔNG CẦN KEY) + API GEMINI / OPENAI THỰC THỤ
window.VCodeAI = {
  getConfig() {
    return {
      backendUrl: localStorage.getItem('vcode_backend_url') || 'http://localhost:8000',
      geminiKey: (localStorage.getItem('vcode_gemini_key') || '').trim(),
      openaiKey: (localStorage.getItem('vcode_openai_key') || '').trim()
    };
  },

  hasValidKey() {
    const cfg = this.getConfig();
    return cfg.geminiKey.startsWith('AIza') || cfg.openaiKey.startsWith('sk-');
  },

  formatMarkdown(text) {
    return String(text || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/```[a-z]*\\n([\\s\\S]*?)```/g, '<pre style="background:#0F172A;color:#E2E8F0;padding:8px 10px;border-radius:8px;overflow-x:auto;margin:6px 0;font-size:12px"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(16,185,129,0.16);color:#059669;padding:1px 5px;border-radius:4px;font-weight:600">$1</code>')
      .replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>')
      .replace(/\\n/g, '<br/>');
  },

  offlineSmartReply(question, code = '', errorText = '') {
    const q = (question || '').trim().toLowerCase();

    if (/^(hi|hello|hey|chào|chao|xin chào|alo|good|bạn là ai|ban la ai|giới thiệu)/.test(q)) {
      return "👋 Chào bạn! Mình là **Trợ lý AI của V-Code Edu** (đang chạy chế độ Cục bộ siêu tốc, không cần Key).\\nBạn có thể hỏi mình bất kỳ kiến thức nào về **Python, Python Tiếng Việt, HTML/CSS, C, C++, thuật toán** hoặc dán lỗi code để mình hướng dẫn sửa nhé!";
    }
    if (/SyntaxError/i.test(errorText) || q.includes('syntaxerror') || q.includes('lỗi cú pháp') || q.includes('loi cu phap')) {
      return "⚠️ **Cách sửa lỗi SyntaxError (Lỗi cú pháp):**\\n1. Kiểm tra dấu hai chấm `:` ở cuối dòng `if`, `elif`, `else`, `for`, `while`, `def`.\\n2. Kiểm tra cặp dấu ngoặc `()` hoặc nháy `''` đã đóng đủ chưa.\\n3. Dùng `==` khi so sánh bằng (không dùng `=`).";
    }
    if (/IndentationError/i.test(errorText) || q.includes('thụt lề') || q.includes('thut le')) {
      return "⚠️ **Cách sửa lỗi IndentationError (Lỗi thụt lề):**\\nTrong Python, các câu lệnh nằm trong cùng một khối `if / for / while` phải thụt lề bằng nhau (chuẩn là **4 khoảng trắng** hoặc **1 phím Tab**).";
    }
    if (q.includes('số nguyên tố') || q.includes('so nguyen to') || q.includes('nguyen to')) {
      return "🧮 **Thuật toán kiểm tra số nguyên tố N trong Python:**\\n```python\\nn = int(input())\\nla_nt = n > 1\\nfor i in range(2, int(n**0.5) + 1):\\n    if n % i == 0:\\n        la_nt = False\\n        break\\nprint('Nguyen to' if la_nt else 'Khong phai')\\n```";
    }
    if (q.includes('giai thừa') || q.includes('giai thua')) {
      return "🔢 **Tính giai thừa N! trong Python:**\\n```python\\nn = int(input())\\ngt = 1\\nfor i in range(1, n + 1):\\n    gt *= i\\nprint(gt)\\n```";
    }
    if (q.includes('chẵn') || q.includes('chan') || q.includes('lẻ') || q.includes('le ')) {
      return "🔀 **Kiểm tra số chẵn / lẻ:** Dùng phép chia lấy dư `% 2`:\\n```python\\nn = int(input())\\nif n % 2 == 0:\\n    print('So chan')\\nelse:\\n    print('So le')\\n```";
    }
    if (q.includes('for') || q.includes('vòng lặp') || q.includes('vong lap') || q.includes('while')) {
      return "🔁 **Vòng lặp trong Python:**\\n• **Vòng lặp `for`:** Biết trước số lần lặp.\\n```python\\nfor i in range(1, 6):\\n    print(i)\\n```\\n• **Vòng lặp `while`:** Lặp khi điều kiện còn đúng (`while n > 0:`).";
    }
    if (q.includes('if') || q.includes('rẽ nhánh') || q.includes('re nhanh') || q.includes('điều kiện')) {
      return "🔀 **Cấu trúc rẽ nhánh `if / elif / else`:**\\n```python\\ndiem = float(input())\\nif diem >= 8:\\n    print('Gioi')\\nelif diem >= 6.5:\\n    print('Kha')\\nelse:\\n    print('Trung binh')\\n```";
    }
    if (q.includes('hàm') || q.includes('def ') || q.includes('function')) {
      return "🧩 **Định nghĩa hàm (`def`) trong Python:**\\n```python\\ndef tinh_tong(a, b):\\n    return a + b\\nprint(tinh_tong(3, 5))\\n```";
    }
    if (q.includes('mảng') || q.includes('list') || q.includes('danh sách')) {
      return "📦 **Danh sách (`list`) trong Python:**\\n```python\\na = [2, 5, 8, 10]\\na.append(12)  # Thêm phần tử\\nprint(sum(a), len(a))  # Tổng và độ dài\\n```";
    }
    if (q.includes('html') || q.includes('css') || q.includes('web')) {
      return "🌐 **Cơ bản HTML5 & CSS3:**\\n```html\\n<h1 style='color:#059669'>V-Code Edu</h1>\\n<p>Đoạn văn giới thiệu trang web.</p>\\n```\\nBạn có thể thực hành trực tiếp 50 bài trong khóa **HTML5 & CSS3**!";
    }
    if (q.includes('c++') || q.includes('cpp') || q.includes('cout') || q.includes('vector')) {
      return "⚡ **Mẫu chương trình C++ chuẩn thi HSG:**\\n```cpp\\n#include <iostream>\\nusing namespace std;\\nint main() {\\n    int n; cin >> n;\\n    cout << n * 2;\\n    return 0;\\n}\\n```";
    }
    if (q.includes('ngôn ngữ c') || q.includes('printf') || q.includes('scanf')) {
      return "⚙️ **Mẫu nhập xuất ngôn ngữ C:**\\n```c\\n#include <stdio.h>\\nint main() {\\n    int n; scanf(\\"%d\\", &n);\\n    printf(\\"%d\\", n * 2);\\n    return 0;\\n}\\n```";
    }
    if (q.includes('lớp') || q.includes('olm') || q.includes('mã lớp')) {
      return "🏫 **Hướng dẫn dùng Lớp học V-Code Edu:**\\n• **Giáo viên:** Tạo lớp → lấy ID mã lớp gửi cho học sinh → giao bài tập & theo dõi trực tiếp.\\n• **Học sinh:** Vào mục **Lớp học** → nhập ID mã lớp → bấm nút cam **Làm bài** để nộp bài chấm điểm.";
    }
    if (q.includes('key') || q.includes('api')) {
      return "🔑 **Cách bật AI Online thông minh:**\\nBấm nút **Đổi key / Hướng dẫn** ở đầu khung chat này để xem hướng dẫn 4 bước lấy **Gemini API Key miễn phí** (bắt đầu bằng `AIza...`) trong 30 giây!";
    }

    return `🤖 **Trợ lý AI Cục bộ V-Code Edu:**\\nMình đã nhận câu hỏi: *"${question}"*.\\nHiện mình đang trả lời cục bộ (không cần API Key). Bạn có thể hỏi cụ thể hơn về:\\n• Cú pháp **Python** (\`if/else\`, \`for\`, \`while\`, \`def\`, \`list\`)\\n• Thuật toán (**số nguyên tố, giai thừa, chẵn lẻ, tính tổng**)\\n• Ngôn ngữ **HTML/CSS, C, C++** hoặc **sửa lỗi SyntaxError / IndentationError**.\\n*(Hoặc dán Gemini API Key bắt đầu bằng \`AIza...\` để trò chuyện tự do mọi chủ đề!)*`;
  },

  async askHybrid(question, code = '', errorText = '') {
    const cfg = this.getConfig();
    const systemPrompt = "Bạn là Trợ lý AI thông minh, thân thiện của nền tảng giáo dục lập trình V-Code Edu (Việt Nam). Hãy trả lời trực tiếp, rõ ràng, ngắn gọn, có ví dụ code bằng Tiếng Việt.";
    const userContent = errorText ? `Câu hỏi: ${question}\\nLỗi: ${errorText}\\nCode:\\n${code}` : question;

    if (navigator.onLine) {
      if (cfg.openaiKey && cfg.openaiKey.startsWith('sk-')) {
        try {
          const r = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.openaiKey}` },
            body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userContent }], max_tokens: 600 })
          });
          const d = await r.json();
          if (r.ok && d.choices?.[0]?.message?.content) {
            return { mode: 'online-openai', text: d.choices[0].message.content };
          }
        } catch {}
      }

      if (cfg.geminiKey && cfg.geminiKey.startsWith('AIza')) {
        for (const model of ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-1.5-flash']) {
          try {
            const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.geminiKey}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: `${systemPrompt}\\n\\n${userContent}` }] }] })
            });
            const d = await r.json();
            if (r.ok && d.candidates?.[0]?.content?.parts?.[0]?.text) {
              return { mode: 'online-gemini', text: d.candidates[0].content.parts[0].text };
            }
          } catch {}
        }
      }
    }

    const localAnswer = this.offlineSmartReply(question, code, errorText);
    const badKeyWarn = (cfg.geminiKey && !cfg.geminiKey.startsWith('AIza')) || (cfg.openaiKey && !cfg.openaiKey.startsWith('sk-'));
    const suffix = badKeyWarn ? "\\n\\n⚠️ *(Lưu ý: Key bạn đã lưu chưa đúng chuẩn `AIza...` hoặc `sk-...` nên AI tạm trả lời bằng chế độ Cục bộ. Bấm **Đổi key** để cập nhật nhé!)*" : "";
    return { mode: 'offline', text: localAnswer + suffix };
  },

  generateFlowchartSVG(code) {
    const lines = code.split('\\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const steps = [{ type: 'terminal', label: 'Bắt đầu (Start)' }];
    for (const line of lines.slice(0, 7)) {
      if (/^(if|elif|while|for|neu|lap_voi)\\b/.test(line)) steps.push({ type: 'decision', label: line.replace(':', '').slice(0, 28) });
      else if (line.includes('input(') || line.startsWith('print(') || line.startsWith('in_ra(')) steps.push({ type: 'io', label: line.slice(0, 28) });
      else steps.push({ type: 'process', label: line.slice(0, 28) });
    }
    steps.push({ type: 'terminal', label: 'Kết thúc (End)' });
    const h = steps.length * 58 + 20;
    let svg = `<svg viewBox="0 0 320 ${h}" width="100%" height="${h}" xmlns="http://www.w3.org/2000/svg" style="font-family:'JetBrains Mono',monospace;font-size:11px">`;
    steps.forEach((s, i) => {
      const y = 14 + i * 56;
      if (i > 0) svg += `<line x1="160" y1="${y - 20}" x2="160" y2="${y}" stroke="#10B981" stroke-width="1.5"/>`;
      if (s.type === 'terminal') svg += `<rect x="70" y="${y}" width="180" height="34" rx="17" fill="#0D111A" stroke="#10B981" stroke-width="1.5"/>`;
      else if (s.type === 'decision') svg += `<polygon points="160,${y-3} 265,${y+17} 160,${y+37} 55,${y+17}" fill="#141A27" stroke="#F59E0B" stroke-width="1.5"/>`;
      else if (s.type === 'io') svg += `<polygon points="65,${y} 265,${y} 250,${y+34} 50,${y+34}" fill="#0D111A" stroke="#3B82F6" stroke-width="1.5"/>`;
      else svg += `<rect x="55" y="${y}" width="210" height="34" rx="6" fill="#0D111A" stroke="rgba(255,255,255,0.22)" stroke-width="1.2"/>`;
      const safe = s.label.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      svg += `<text x="160" y="${y + 21}" fill="#F8FAFC" text-anchor="middle">${safe}</text>`;
    });
    return svg + `</svg>`;
  }
};
"""

OLM_V10_CSS = """
/* ==================== V10.0: OLM-STYLE AUTH MODAL (2-COLUMN) ==================== */
.olm-auth-box {
  max-width: 860px !important; padding: 0 !important; overflow: hidden !important;
  background: #FFFFFF !important; color: #0F172A !important; border-radius: 20px !important;
  display: grid; grid-template-columns: 46% 54%;
}
.olm-auth-left {
  background: linear-gradient(150deg, #5B63F6 0%, #4338CA 100%);
  color: #FFFFFF; padding: 34px 28px; display: flex; flex-direction: column; justify-content: space-between;
}
.olm-auth-left-logo { display: flex; align-items: center; gap: 12px; margin-top: 10px; }
.olm-auth-left-logo img { width: 54px; height: 54px; border-radius: 14px; background: #FFFFFF; padding: 4px; object-fit: contain; }
.olm-auth-feature-cards { display: grid; gap: 12px; margin: 22px 0; }
.olm-auth-mini-card {
  background: rgba(255, 255, 255, 0.14); backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.22); border-radius: 14px;
  padding: 13px 16px; display: flex; align-items: center; gap: 12px;
}
.olm-auth-right { background: #FFFFFF; padding: 30px 36px; position: relative; color: #0F172A; }
.olm-auth-topbar { display: flex; justify-content: space-between; align-items: center; font-size: 12.5px; color: #4F46E5; font-weight: 700; margin-bottom: 18px; }
.olm-auth-input-wrap { position: relative; margin-bottom: 12px; }
.olm-auth-input-wrap .ico { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); font-size: 15px; color: #64748B; }
.olm-auth-input {
  width: 100%; padding: 11px 38px 11px 38px; border: 1.5px solid #CBD5E1; border-radius: 10px;
  font-size: 13.5px; color: #0F172A; background: #FFFFFF; font-family: inherit;
}
.olm-auth-input:focus { outline: none; border-color: #4F46E5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.14); }
.olm-btn-orange {
  width: 100%; padding: 11px 18px; border: none; border-radius: 999px;
  background: linear-gradient(90deg, #FF8C1A 0%, #FF5E00 100%);
  color: #FFFFFF; font-weight: 700; font-size: 14px; cursor: pointer;
  box-shadow: 0 6px 18px rgba(255, 94, 0, 0.30); transition: transform 0.15s ease, filter 0.2s ease;
}
.olm-btn-orange:hover { filter: brightness(1.06); transform: translateY(-1px); }
.olm-social-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
.olm-social-btn {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 9px 12px; border-radius: 10px; border: 1.5px solid #E2E8F0;
  background: #FFFFFF; color: #0F172A; font-weight: 600; font-size: 12.5px; cursor: pointer;
}
.olm-social-btn:hover { border-color: #4F46E5; background: #F8FAFC; }

/* ==================== V10.0: OLM-STYLE CLASSROOM WORKSPACE ==================== */
.olm-shell { background: #F4F7FB; min-height: calc(100vh - 62px); color: #0F172A; padding: 22px 20px 60px; }
[data-theme="dark"] .olm-shell { background: var(--bg-base); color: var(--text-primary); }
.olm-layout { max-width: 1260px; margin: 0 auto; display: grid; grid-template-columns: 88px 1fr; gap: 20px; align-items: start; }
.olm-side-rail {
  background: #FFFFFF; border-radius: 16px; padding: 12px 8px;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06); display: flex; flex-direction: column; gap: 8px;
  position: sticky; top: 80px;
}
[data-theme="dark"] .olm-side-rail { background: var(--bg-surface); border: 1px solid var(--border-subtle); }
.olm-rail-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 10px 4px;
  border-radius: 12px; border: 1.5px solid transparent; background: transparent;
  color: #475569; font-size: 11px; font-weight: 600; cursor: pointer;
}
.olm-rail-btn span.ico { font-size: 20px; }
.olm-rail-btn:hover { background: #F1F5F9; color: #1D4ED8; }
.olm-rail-btn.active { background: #EFF6FF; border-color: #3B82F6; color: #1D4ED8; font-weight: 700; }

.olm-top-strip { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
.olm-class-pill-select { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.olm-class-badge-btn { padding: 6px 16px; border-radius: 10px; border: 2px solid #CBD5E1; background: #FFFFFF; color: #334155; font-weight: 800; font-size: 14px; cursor: pointer; }
.olm-class-badge-btn.active { border-color: #6366F1; background: #EEF2FF; color: #4338CA; }

.olm-white-card {
  background: #FFFFFF; border-radius: 16px; padding: 20px 24px;
  box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05); margin-bottom: 18px; border: 1px solid #E2E8F0;
}
[data-theme="dark"] .olm-white-card { background: var(--bg-surface); border-color: var(--border-subtle); color: var(--text-primary); }

.olm-section-title { display: flex; align-items: center; gap: 10px; font-size: 17px; font-weight: 800; margin-bottom: 14px; }
.olm-section-title::before { content: ""; width: 4px; height: 20px; border-radius: 4px; background: #3B82F6; }
.olm-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.olm-info-box-blue { background: #F0F6FF; border-radius: 14px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; color: #0F172A; }
.olm-info-box-green { background: #ECFDF5; border-radius: 14px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; color: #0F172A; }
.olm-pill-tabs-wrap { display: flex; justify-content: center; margin-bottom: 14px; }
.olm-pill-tabs { display: inline-flex; gap: 6px; background: #FFF3EB; padding: 5px; border-radius: 14px; flex-wrap: wrap; }
.olm-pill-tab { padding: 8px 16px; border-radius: 10px; border: none; background: transparent; color: #475569; font-weight: 700; font-size: 13px; cursor: pointer; font-family: inherit; }
.olm-pill-tab.active { background: #FFFFFF; color: #2563EB; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08); }

.olm-status-filters { display: flex; justify-content: center; gap: 10px; flex-wrap: wrap; margin-bottom: 18px; }
.olm-filter-chip { padding: 5px 12px; border-radius: 999px; border: 1px solid #E2E8F0; background: #F8FAFC; color: #334155; font-size: 12px; font-weight: 600; cursor: pointer; }
.olm-filter-chip.active { background: #EFF6FF; border-color: #3B82F6; color: #1D4ED8; }

.olm-hw-card {
  background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px; padding: 16px 20px; margin-bottom: 12px;
  display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
}
[data-theme="dark"] .olm-hw-card { background: var(--bg-elevated); border-color: var(--border-subtle); }
.olm-hw-card:hover { border-color: #3B82F6; box-shadow: 0 6px 18px rgba(37, 99, 235, 0.08); }
.olm-hw-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, #34D399, #10B981); color: #FFFFFF; display: grid; place-items: center; font-size: 20px; flex-shrink: 0; }
.olm-hw-btn { padding: 9px 22px; border-radius: 10px; border: none; background: linear-gradient(180deg, #FF8C1A 0%, #F97316 100%); color: #FFFFFF; font-weight: 700; font-size: 13.5px; cursor: pointer; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.30); }
.olm-hw-btn:hover { filter: brightness(1.06); }

@media (max-width: 820px) {
  .olm-auth-box { grid-template-columns: 1fr; max-width: 440px !important; }
  .olm-auth-left { display: none; }
  .olm-layout { grid-template-columns: 1fr; }
  .olm-side-rail { flex-direction: row; overflow-x: auto; position: static; }
  .olm-info-grid { grid-template-columns: 1fr; }
}
"""

OLM_AUTH_MODAL_HTML = """  <div id="auth-modal" class="modal-overlay">
    <div class="modal-box olm-auth-box">
      <div class="olm-auth-left">
        <div>
          <div style="font-size:15px;font-weight:700;opacity:0.95">Chào mừng bạn tới</div>
          <div class="olm-auth-left-logo">
            <img src="assets/logo.jpg" alt="V-Code Edu" onerror="this.style.display='none'" />
            <div>
              <div style="font-size:26px;font-weight:800;line-height:1.1">V-Code Edu</div>
              <div style="font-size:12px;opacity:0.88">Nền tảng Lập trình Giáo dục Việt Nam</div>
            </div>
          </div>
        </div>
        <div class="olm-auth-feature-cards">
          <div class="olm-auth-mini-card"><span style="font-size:24px">📚</span><div><strong>250+ Bài học chuẩn hóa</strong><div style="font-size:11.5px;opacity:0.88">Python, Python VN, HTML, C, C++</div></div></div>
          <div class="olm-auth-mini-card"><span style="font-size:24px">🏫</span><div><strong>Lớp học Trực tuyến OLM</strong><div style="font-size:11.5px;opacity:0.88">Giao bài, theo dõi &amp; chấm điểm trực tiếp</div></div></div>
          <div class="olm-auth-mini-card"><span style="font-size:24px">🎮</span><div><strong>50 Chặng Thử thách &amp; AI</strong><div style="font-size:11.5px;opacity:0.88">★★★★★ Học lập trình thú vị như chơi game</div></div></div>
        </div>
        <div style="font-size:12px;opacity:0.9;display:flex;justify-content:space-between">
          <span>🏫 THCS &amp; THPT Hòa Phú</span>
          <span>📞 Hỗ trợ 24/7</span>
        </div>
      </div>

      <div class="olm-auth-right">
        <button class="modal-close" style="color:#475569" onclick="closeModal('auth-modal')">✕</button>
        <div class="olm-auth-topbar">
          <span>🏠 V-Code Edu</span>
          <span style="color:#64748B;font-weight:500">Bảo mật &amp; An toàn</span>
        </div>
        <h2 id="auth-heading" style="text-align:center;font-size:23px;font-weight:800;margin-bottom:6px;color:#0F172A">Đăng nhập</h2>
        <p id="auth-subheading" style="text-align:center;font-size:12.5px;color:#64748B;margin-bottom:18px">Đăng nhập vào tài khoản học tập của bạn</p>

        <form id="auth-login-form" onsubmit="handleLoginSubmit(event)">
          <div class="olm-auth-input-wrap"><span class="ico">👤</span><input id="login-identifier" class="olm-auth-input" required placeholder="Tên đăng nhập hoặc Email" /></div>
          <div class="olm-auth-input-wrap">
            <span class="ico">🔒</span>
            <input id="login-password" type="password" class="olm-auth-input" required placeholder="Mật khẩu" />
            <button type="button" class="password-toggle" onclick="togglePassVis('login-password')">👁</button>
          </div>
          <div style="display:flex;justify-content:space-between;align-items:center;font-size:12.5px;margin-bottom:16px;color:#475569">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer"><input type="checkbox" checked /> Ghi nhớ đăng nhập</label>
            <span style="color:#2563EB;cursor:pointer" onclick="showToast('💡 Liên hệ giáo viên hoặc đăng nhập lại bằng Google để khôi phục!')">Quên mật khẩu?</span>
          </div>
          <button type="submit" class="olm-btn-orange">Đăng nhập</button>
          <div class="auth-divider" style="margin:14px 0;color:#94A3B8">hoặc</div>
          <div class="olm-social-row">
            <button type="button" class="olm-social-btn" onclick="handleRealSocialLogin('google')">🔵 Google</button>
            <button type="button" class="olm-social-btn" onclick="handleRealSocialLogin('facebook')">📘 Facebook</button>
          </div>
          <button type="button" class="olm-social-btn" style="width:100%" onclick="handleRealSocialLogin('github')">⚫ Đăng nhập bằng GitHub</button>
          <div style="text-align:center;margin-top:16px;font-size:13px;color:#475569">
            Bạn chưa có tài khoản? <button type="button" style="background:none;border:none;color:#2563EB;font-weight:700;cursor:pointer" onclick="switchAuthTab('register')">Đăng ký ngay</button>
          </div>
        </form>

        <form id="auth-register-form" style="display:none" onsubmit="handleRegisterSubmit(event)">
          <div class="olm-auth-input-wrap"><span class="ico">🪪</span><input id="reg-fullname" class="olm-auth-input" required placeholder="Họ và tên đầy đủ" /></div>
          <div class="olm-auth-input-wrap"><span class="ico">✉️</span><input id="reg-email" type="email" class="olm-auth-input" required placeholder="Địa chỉ Email" /></div>
          <div class="olm-auth-input-wrap">
            <span class="ico">🔒</span>
            <input id="reg-password" type="password" class="olm-auth-input" required minlength="6" placeholder="Mật khẩu (tối thiểu 6 ký tự)" />
            <button type="button" class="password-toggle" onclick="togglePassVis('reg-password')">👁</button>
          </div>
          <button type="submit" class="olm-btn-orange">Đăng ký tài khoản miễn phí</button>
          <div class="auth-divider" style="margin:14px 0;color:#94A3B8">hoặc đăng ký nhanh bằng</div>
          <div class="olm-social-row">
            <button type="button" class="olm-social-btn" onclick="handleRealSocialLogin('google')">🔵 Google</button>
            <button type="button" class="olm-social-btn" onclick="handleRealSocialLogin('facebook')">📘 Facebook</button>
          </div>
          <div style="text-align:center;margin-top:14px;font-size:13px;color:#475569">
            Đã có tài khoản? <button type="button" style="background:none;border:none;color:#2563EB;font-weight:700;cursor:pointer" onclick="switchAuthTab('login')">Đăng nhập ngay</button>
          </div>
        </form>
      </div>
    </div>
  </div>"""

OLM_CLASSROOM_HTML = """  <!-- ==================== VIEW 4: HỆ THỐNG LỚP HỌC CHUẨN OLM.VN HOÀN HẢO ==================== -->
  <section id="view-classroom" class="view-section">
    <div class="olm-shell">
      <div id="classroom-login-required" class="olm-white-card" style="display:none;max-width:540px;margin:40px auto;text-align:center">
        <div style="font-size:40px;margin-bottom:8px">🏫</div>
        <h2 style="margin-bottom:8px">Đăng nhập để vào Lớp học V-Code Edu</h2>
        <p style="color:#64748B;margin-bottom:18px">Hệ thống lưu trữ lớp học, bài tập, điểm số và nhận xét theo tài khoản của bạn.</p>
        <button class="olm-btn-orange" style="max-width:260px" onclick="openAuthModal('login')">Đăng nhập ngay</button>
      </div>

      <div id="classroom-role-once-picker" class="olm-white-card" style="display:none;max-width:760px;margin:24px auto;text-align:center">
        <span class="badge badge-blue" style="margin-bottom:8px">THIẾT LẬP LẦN ĐẦU</span>
        <h2 style="margin-bottom:6px">Bạn tham gia lớp học với vai trò nào?</h2>
        <p style="color:#D97706;font-size:13px;margin-bottom:20px">⚠️ Lưu ý: Vai trò chỉ được chọn <strong>1 lần duy nhất</strong> cho tài khoản này.</p>
        <div class="grid-2col" style="text-align:left">
          <div style="padding:20px;border-radius:14px;border:2px solid #10B981;background:#ECFDF5;color:#0F172A">
            <div style="font-size:32px;margin-bottom:6px">👨‍🏫</div>
            <h3>Giáo viên</h3>
            <p style="font-size:13px;color:#334155;margin:6px 0 14px">Tạo lớp học, chia sẻ mã lớp/QR, giao bài tập và xem trực tiếp + chấm điểm bài làm của học sinh.</p>
            <button class="btn btn-primary" style="width:100%" onclick="lockRoleOnceAction('teacher')">Đăng ký vai trò Giáo viên</button>
          </div>
          <div style="padding:20px;border-radius:14px;border:2px solid #3B82F6;background:#EFF6FF;color:#0F172A">
            <div style="font-size:32px;margin-bottom:6px">👨‍🎓</div>
            <h3>Học sinh</h3>
            <p style="font-size:13px;color:#334155;margin:6px 0 14px">Nhập ID mã lớp thầy/cô gửi để vào lớp, làm bài tập trên IDE riêng và xem điểm + nhận xét của giáo viên.</p>
            <button class="btn btn-blue" style="width:100%" onclick="lockRoleOnceAction('student')">Đăng ký vai trò Học sinh</button>
          </div>
        </div>
      </div>

      <div id="olm-main-workspace" class="olm-layout" style="display:none">
        <aside class="olm-side-rail">
          <button class="olm-rail-btn" onclick="switchView('home')"><span class="ico">🏠</span><span>Tổng quan</span></button>
          <button class="olm-rail-btn" onclick="switchOlmTab('assignments')"><span class="ico">📝</span><span>Bài tập</span></button>
          <button class="olm-rail-btn active" onclick="switchOlmTab('assignments')"><span class="ico">🏫</span><span>Lớp học</span></button>
          <button class="olm-rail-btn" onclick="switchView('learning')"><span class="ico">📚</span><span>Khóa học</span></button>
          <button class="olm-rail-btn" onclick="switchView('account')"><span class="ico">👤</span><span>Cá nhân</span></button>
        </aside>

        <div>
          <div class="olm-top-strip">
            <div id="olm-class-pills" class="olm-class-pill-select"></div>
            <div id="olm-role-actions" style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"></div>
          </div>

          <div class="olm-white-card">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-bottom:12px">
              <div class="olm-section-title" style="margin-bottom:0">Thông tin lớp: <span id="olm-active-class-name" style="color:#1D4ED8"></span></div>
              <div style="display:flex;gap:8px;align-items:center">
                <span id="olm-active-class-code" class="olm-code-chip"></span>
                <button class="btn btn-sm" onclick="copyActiveClassCode()">📋 Copy Mã</button>
                <button class="btn btn-sm btn-primary" onclick="shareActiveClassQR()">📱 QR Lớp</button>
              </div>
            </div>
            <div class="olm-info-grid">
              <div class="olm-info-box-blue">
                <div><div style="font-size:12.5px;color:#475569;margin-bottom:4px">Giáo viên phụ trách</div><strong id="olm-teacher-name" style="font-size:16px">Thầy Nguyễn Phi Hùng</strong></div>
                <span style="font-size:28px">👨‍🏫</span>
              </div>
              <div class="olm-info-box-green">
                <div><div style="font-size:12.5px;color:#475569;margin-bottom:4px">Sĩ số thành viên thật</div><strong id="olm-student-count" style="font-size:24px;font-family:'JetBrains Mono',monospace">0</strong></div>
                <span style="font-size:28px">👥</span>
              </div>
            </div>
          </div>

          <div class="olm-white-card">
            <div class="olm-pill-tabs-wrap">
              <div class="olm-pill-tabs">
                <button class="olm-pill-tab active" data-olmtab="assignments" onclick="switchOlmTab('assignments')">📋 Bài tập</button>
                <button class="olm-pill-tab" data-olmtab="members" onclick="switchOlmTab('members')">👥 Thành viên</button>
                <button class="olm-pill-tab" data-olmtab="realtime" onclick="switchOlmTab('realtime')">📡 Học trực tuyến (Real-time)</button>
                <button class="olm-pill-tab" data-olmtab="discussion" onclick="switchOlmTab('discussion')">💬 Thảo luận</button>
              </div>
            </div>

            <div id="olmpanel-assignments" class="olm-panel">
              <div class="olm-status-filters">
                <button class="olm-filter-chip active" onclick="filterOlmAssignments('all', this)">Tất cả <span id="olm-hw-count">(0)</span></button>
                <button class="olm-filter-chip" onclick="filterOlmAssignments('todo', this)">🟡 Bài chưa làm</button>
                <button class="olm-filter-chip" onclick="filterOlmAssignments('done', this)">🟢 Đã hoàn thành</button>
              </div>
              <div id="olm-hw-list"></div>
            </div>

            <div id="olmpanel-members" class="olm-panel" style="display:none">
              <div style="overflow-x:auto"><table class="data-table"><thead><tr><th>STT</th><th>Họ và tên</th><th>Email</th><th>Trạng thái</th><th>Điểm / XP</th></tr></thead><tbody id="olm-members-tbody"></tbody></table></div>
            </div>

            <div id="olmpanel-realtime" class="olm-panel" style="display:none">
              <div style="overflow-x:auto"><table class="data-table"><thead><tr><th>Học sinh</th><th>Bài đang làm</th><th>Trạng thái trực tiếp</th><th>Tiến độ</th><th>Thao tác</th></tr></thead><tbody id="realtime-monitor-body"></tbody></table></div>
            </div>

            <div id="olmpanel-discussion" class="olm-panel" style="display:none">
              <div style="display:flex;gap:8px;margin-bottom:14px">
                <input id="olm-discuss-input" class="input-field" placeholder="Viết thông báo hoặc câu hỏi thảo luận cho cả lớp..." onkeydown="if(event.key==='Enter') postOlmDiscussion()" />
                <button class="btn btn-primary" onclick="postOlmDiscussion()">Gửi</button>
              </div>
              <div id="olm-discuss-list"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>"""

V10_APP_PATCH = """
// ==================== V10.0 PATCH: PERFECT OLM CLASSROOM + SMART LOCAL/API ROBOT AI ====================
window.AppState.olmTab = 'assignments';
window.AppState.olmHwFilter = 'all';
window.AppState.olmActiveDetail = null;

window.sendRobotAIChat = async function() {
  const inp = document.getElementById('robot-chat-input');
  const q = inp.value.trim();
  if (!q) return;
  inp.value = '';
  const feed = document.getElementById('robot-chat-feed');
  feed.innerHTML += `<div class="chat-msg user">${q.replace(/</g, '&lt;')}</div>`;
  const code = document.getElementById('code-editor')?.value || '';
  const res = await window.VCodeAI.askHybrid(q, code);
  const tag = res.mode === 'offline' ? '🟠 AI Cục bộ (Không cần Key)' : (res.mode === 'online-openai' ? '🟢 API Chatbox (OpenAI)' : '🟢 API Chatbox (Gemini)');
  feed.innerHTML += `<div class="chat-msg ai"><div style="font-size:10.5px;color:var(--accent-emerald);font-weight:700;margin-bottom:4px">${tag}</div>${window.VCodeAI.formatMarkdown(res.text)}</div>`;
  feed.scrollTop = feed.scrollHeight;
};

window.refreshRobotKeyUI = function() {
  const cfg = window.VCodeAI.getConfig();
  const validKey = cfg.openaiKey.startsWith('sk-') ? cfg.openaiKey : (cfg.geminiKey.startsWith('AIza') ? cfg.geminiKey : '');
  const guide = document.getElementById('robot-key-guide');
  const activeBox = document.getElementById('robot-key-active');
  const badge = document.getElementById('robot-ai-mode-badge');
  const masked = document.getElementById('robot-key-masked');

  if (validKey && navigator.onLine) {
    if (guide) guide.style.display = 'none';
    if (activeBox) activeBox.style.display = 'flex';
    if (masked) masked.textContent = `${validKey.slice(0, 6)}...${validKey.slice(-4)}`;
    if (badge) badge.textContent = validKey.startsWith('sk-') ? '🟢 API Chatbox (OpenAI)' : '🟢 API Chatbox (Gemini)';
  } else {
    if (guide) guide.style.display = 'block';
    if (activeBox) activeBox.style.display = 'none';
    if (badge) badge.textContent = '🟠 AI Cục bộ (Sẵn sàng không cần Key)';
  }
};

window.saveQuickRobotKey = function() {
  const k = (document.getElementById('robot-quick-key-input').value || '').trim();
  if (!k) return;
  if (!k.startsWith('AIza') && !k.startsWith('sk-')) {
    alert('Mã Key chưa đúng chuẩn!\\n• Google Gemini API Key phải bắt đầu bằng: AIza...\\n• OpenAI API Key phải bắt đầu bằng: sk-...\\nBạn xem hướng dẫn 4 bước ngay bên trên để lấy đúng mã nhé!');
    return;
  }
  if (k.startsWith('sk-')) { localStorage.setItem('vcode_openai_key', k); localStorage.removeItem('vcode_gemini_key'); }
  else { localStorage.setItem('vcode_gemini_key', k); localStorage.removeItem('vcode_openai_key'); }
  document.getElementById('robot-quick-key-input').value = '';
  refreshRobotKeyUI();
  showToast('🤖 Đã kích hoạt API Chatbox thông minh thành công!');
};

window.switchOlmTab = function(tabName) {
  window.AppState.olmTab = tabName;
  document.querySelectorAll('[data-olmtab]').forEach((b) => b.classList.toggle('active', b.dataset.olmtab === tabName));
  document.querySelectorAll('.olm-panel').forEach((p) => { p.style.display = p.id === `olmpanel-${tabName}` ? 'block' : 'none'; });
};

window.filterOlmAssignments = function(mode, btn) {
  window.AppState.olmHwFilter = mode;
  document.querySelectorAll('.olm-filter-chip').forEach((c) => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderOlmActiveClass();
};

window.initClassroomPortalData = async function() {
  const u = window.AppState.user;
  const loginBox = document.getElementById('classroom-login-required');
  const roleBox = document.getElementById('classroom-role-once-picker');
  const ws = document.getElementById('olm-main-workspace');
  if (!loginBox || !roleBox || !ws) return;

  loginBox.style.display = 'none';
  roleBox.style.display = 'none';
  ws.style.display = 'none';

  if (!u) { loginBox.style.display = 'block'; return; }
  if (!u.role || u.role === 'none') { roleBox.style.display = 'block'; return; }

  ws.style.display = 'grid';
  const isTeacher = u.role === 'teacher' || u.role === 'admin';
  const ldb = window.LocalClassDB.load();
  let classes = [];

  try {
    const endpoint = isTeacher ? `/api/classes/teacher/${encodeURIComponent(u.email)}` : `/api/classes/student/${encodeURIComponent(u.email)}`;
    const res = await apiRequest(endpoint);
    classes = res.classes || [];
  } catch {
    classes = isTeacher
      ? ldb.classes.filter((c) => c.teacher_email === u.email || ldb.classes.length > 0)
      : ldb.classes.filter((c) => (c.students || []).some((s) => s.email === u.email));
  }

  if (isTeacher && classes.length === 0) classes = ldb.classes;
  window.AppState.olmClasses = classes;

  const actBox = document.getElementById('olm-role-actions');
  if (isTeacher) {
    actBox.innerHTML = `
      <button class="btn btn-primary btn-sm" onclick="document.getElementById('create-class-modal').classList.add('open')">+ Tạo lớp mới</button>
      <button class="btn btn-blue btn-sm" onclick="openCreateAssignmentModal()">📝 Giao bài tập</button>`;
  } else {
    actBox.innerHTML = `
      <input id="student-join-code-input" class="input-field mono" style="width:165px;padding:6px 10px;text-transform:uppercase;font-weight:700" placeholder="Nhập ID mã lớp..." />
      <button class="olm-hw-btn" style="padding:7px 14px;font-size:12.5px" onclick="joinClassByCodeAction()">+ Vào lớp</button>`;
  }

  const pills = document.getElementById('olm-class-pills');
  if (classes.length === 0) {
    pills.innerHTML = `<span style="font-size:13.5px;color:#64748B">${isTeacher ? 'Chưa có lớp học nào — bấm + Tạo lớp mới!' : 'Em chưa vào lớp nào — nhập mã lớp (VD: TIN10HP) ở bên phải!'}</span>`;
    document.getElementById('olm-active-class-name').textContent = 'Chưa chọn lớp';
    document.getElementById('olm-active-class-code').textContent = '---';
    document.getElementById('olm-hw-list').innerHTML = `<p style="text-align:center;color:#64748B;padding:24px">Hãy tham gia hoặc tạo một lớp học để xem danh sách bài tập.</p>`;
    return;
  }

  if (!window.AppState.activeClassroomCode || !classes.some((c) => c.code === window.AppState.activeClassroomCode)) {
    window.AppState.activeClassroomCode = classes[0].code;
  }

  pills.innerHTML = classes.map((c) => `
    <button class="olm-class-badge-btn ${c.code === window.AppState.activeClassroomCode ? 'active' : ''}" onclick="selectOlmClass('${c.code}')">${c.name.split('—')[0].trim()} (${c.code})</button>
  `).join('');

  await selectOlmClass(window.AppState.activeClassroomCode);
};

window.selectOlmClass = async function(code) {
  window.AppState.activeClassroomCode = code;
  document.querySelectorAll('.olm-class-badge-btn').forEach((b) => b.classList.toggle('active', b.textContent.includes(`(${code})`)));

  let detail = null;
  try {
    detail = await apiRequest(`/api/classes/${encodeURIComponent(code)}/detail`);
  } catch {
    const ldb = window.LocalClassDB.load();
    const cls = ldb.classes.find((c) => c.code === code) || ldb.classes[0];
    if (cls) {
      detail = {
        classroom: { ...cls, students_count: (cls.students || []).length },
        roster: (cls.students || []).map((st) => ({
          username: st.username, full_name: st.full_name, email: st.email, xp: st.xp || 100,
          status: 'not_started', problem: 'Chưa mở bài tập', progress: 0, score: null, code: '', updated: 'Chưa làm'
        })),
        assignments: cls.assignments || [],
        submissions: cls.submissions || []
      };
    }
  }
  window.AppState.olmActiveDetail = detail;
  window.AppState.currentRoster = detail?.roster || [];
  window.__classAssignmentsCache = detail?.assignments || [];
  renderOlmActiveClass();
};

window.renderOlmActiveClass = function() {
  const detail = window.AppState.olmActiveDetail;
  if (!detail) return;
  const u = window.AppState.user;
  const isTeacher = u && (u.role === 'teacher' || u.role === 'admin');
  const cls = detail.classroom;

  document.getElementById('olm-active-class-name').textContent = cls.name;
  document.getElementById('olm-active-class-code').textContent = cls.code;
  document.getElementById('olm-teacher-name').textContent = cls.teacher_name || 'Giáo viên V-Code Edu';
  document.getElementById('olm-student-count').textContent = detail.roster.length;

  const allHw = detail.assignments || [];
  document.getElementById('olm-hw-count').textContent = `(${allHw.length})`;
  const filteredHw = allHw.filter((a) => {
    const mySub = (detail.submissions || []).find((s) => s.assignment_code === a.code && s.username === u.username);
    if (window.AppState.olmHwFilter === 'done') return Boolean(mySub);
    if (window.AppState.olmHwFilter === 'todo') return !mySub;
    return true;
  });

  const hwBox = document.getElementById('olm-hw-list');
  hwBox.innerHTML = filteredHw.length
    ? filteredHw.map((a, idx) => {
        const mySub = (detail.submissions || []).find((s) => s.assignment_code === a.code && s.username === u.username);
        const fbHtml = mySub && mySub.teacher_feedback ? `<div style="margin-top:6px;padding:6px 10px;border-radius:8px;background:#ECFDF5;color:#065F46;font-size:12px">💬 <b>Nhận xét GV:</b> ${mySub.teacher_feedback}</div>` : '';
        return `
          <div class="olm-hw-card">
            <div style="display:flex;align-items:flex-start;gap:14px;flex:1;min-width:240px">
              <div class="olm-hw-icon">🧮</div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:3px">
                  <span class="badge badge-blue">Tin học • Python</span>
                  <strong style="font-size:15px">${a.title}</strong>
                  ${mySub ? `<span class="badge badge-easy">✓ Điểm: ${mySub.score}/100</span>` : ''}
                </div>
                <div style="font-size:12.5px;color:#64748B;margin-bottom:4px">[Luyện tập] ${a.description}</div>
                <div style="font-size:12px;color:#475569">Giáo viên: <strong>${cls.teacher_name || 'GV Tin học'}</strong> • Hạn: ${a.due_date || 'Không giới hạn'}</div>
                ${fbHtml}
              </div>
            </div>
            <div>
              ${isTeacher
                ? `<button class="btn btn-sm btn-blue" onclick="switchOlmTab('realtime')">👁 Xem tiến độ</button>`
                : `<button class="olm-hw-btn" onclick="openDedicatedAssignmentIDE(${idx}, '${cls.code}')">${mySub ? 'Làm lại' : 'Làm bài'}</button>`
              }
            </div>
          </div>`;
      }).join('')
    : `<p style="text-align:center;color:#64748B;padding:20px">Không có bài tập nào trong mục này.</p>`;

  const mBody = document.getElementById('olm-members-tbody');
  mBody.innerHTML = detail.roster.length
    ? detail.roster.map((st, i) => `
        <tr><td>${i + 1}</td><td><strong>${st.full_name}</strong></td><td>${st.email}</td><td>${st.status === 'completed' ? '<span class="badge badge-easy">Đã làm</span>' : (st.status === 'coding' ? '<span class="badge badge-blue">Đang làm</span>' : '<span class="badge badge-med">Chưa làm</span>')}</td><td class="mono">${st.xp} XP</td></tr>`).join('')
    : `<tr><td colspan="5" style="text-align:center;color:#64748B;padding:18px">Chưa có học sinh nào tham gia lớp. Gửi mã lớp <b>${cls.code}</b> cho học sinh nhé!</td></tr>`;

  if (window.renderRealRosterTable) window.renderRealRosterTable();
  renderOlmDiscussion();
};

window.postOlmDiscussion = function() {
  const inp = document.getElementById('olm-discuss-input');
  const txt = (inp?.value || '').trim();
  if (!txt) return;
  inp.value = '';
  const key = 'vcode_discuss_' + window.AppState.activeClassroomCode;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  list.unshift({ author: window.AppState.user?.full_name || 'Thành viên', role: window.AppState.user?.role || 'student', text: txt, time: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) });
  localStorage.setItem(key, JSON.stringify(list));
  renderOlmDiscussion();
};

window.renderOlmDiscussion = function() {
  const box = document.getElementById('olm-discuss-list');
  if (!box) return;
  const key = 'vcode_discuss_' + window.AppState.activeClassroomCode;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  box.innerHTML = list.length
    ? list.map((m) => `<div style="padding:12px 14px;border-radius:10px;background:var(--bg-elevated);margin-bottom:8px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><strong>${m.author} ${m.role === 'teacher' ? '<span class="badge badge-easy">GV</span>' : ''}</strong><span style="color:#64748B">${m.time}</span></div><div style="font-size:13.5px">${m.text}</div></div>`).join('')
    : `<p style="text-align:center;color:#64748B;padding:16px">Chưa có thảo luận nào trong lớp. Hãy là người đầu tiên đặt câu hỏi!</p>`;
};
"""

def apply_v10():
    with open("js/ai-tutor.js", "w", encoding="utf-8") as f:
        f.write(AI_TUTOR_V10_JS.strip() + "\n")
    print("✔ Đã nâng cấp AI Cục bộ thông minh (không cần Key) + API thực thụ: js/ai-tutor.js")

    css_path = "css/design-system.css"
    old_css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V10.0: OLM-STYLE AUTH MODAL (2-COLUMN) ==================== */"
    if marker in old_css:
        old_css = old_css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(old_css + "\n\n" + OLM_V10_CSS.strip() + "\n")
    print("✔ Đã cập nhật CSS Giao diện Đăng nhập & Lớp học chuẩn OLM.VN: css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v9.0", "v10.0")

        v4_start = html.find('<!-- ==================== VIEW 4:')
        v5_start = html.find('<!-- ==================== VIEW 5:')
        if v4_start != -1 and v5_start != -1:
            html = html[:v4_start] + OLM_CLASSROOM_HTML.strip() + "\n\n  " + html[v5_start:]

        am_start = html.find('<div id="auth-modal" class="modal-overlay">')
        oc_start = html.find('<!-- MODAL CẤU HÌNH FIREBASE OAUTH THẬT -->')
        if am_start != -1 and oc_start != -1:
            html = html[:am_start] + OLM_AUTH_MODAL_HTML.strip() + "\n\n  " + html[oc_start:]

        old_guide_start = html.find('<div id="robot-key-guide"')
        old_guide_end = html.find('<!-- Khu vực Hiển thị Key hiện tại')
        if old_guide_start != -1 and old_guide_end != -1:
            detailed_guide = """<div id="robot-key-guide" style="background:var(--bg-elevated);padding:11px 12px;border-radius:10px;font-size:11.8px;border:1px solid var(--border-subtle);line-height:1.55">
        <strong style="color:var(--accent-emerald)">💡 AI Cục bộ đang sẵn sàng (Không cần Key)!</strong>
        <div style="margin:5px 0 7px;color:var(--text-secondary)">
          Muốn AI trả lời chuyên sâu như ChatGPT/Gemini? Làm theo <b>4 bước miễn phí</b>:<br/>
          <b>B1:</b> Mở <a href="https://aistudio.google.com/apikey" target="_blank" style="color:#2563EB;font-weight:700">aistudio.google.com/apikey</a> (đăng nhập Gmail).<br/>
          <b>B2:</b> Bấm nút <b>Create API key</b> (Tạo khóa API).<br/>
          <b>B3:</b> Copy chuỗi mã bắt đầu bằng <code>AIza...</code> (hoặc <code>sk-...</code> của OpenAI).<br/>
          <b>B4:</b> Dán vào ô bên dưới và bấm <b>Lưu</b>!
        </div>
        <div style="display:flex;gap:6px">
          <input id="robot-quick-key-input" type="password" class="input-field mono" style="padding:6px 8px;font-size:12px" placeholder="Dán AIza... hoặc sk-..." />
          <button class="btn btn-sm btn-primary" onclick="saveQuickRobotKey()">Lưu</button>
        </div>
      </div>

      """
            html = html[:old_guide_start] + detailed_guide + html[old_guide_end:]

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã cập nhật Giao diện Đăng nhập OLM, Lớp học OLM & Hướng dẫn AI: index.html")

    if os.path.exists("js/app.js"):
        app_js = open("js/app.js", "r", encoding="utf-8").read()
        marker = "// ==================== V10.0 PATCH:"
        if marker in app_js:
            app_js = app_js.split(marker)[0].rstrip()
        with open("js/app.js", "w", encoding="utf-8") as f:
            f.write(app_js + "\n\n" + V10_APP_PATCH.strip() + "\n")
        print("✔ Đã hoàn thiện logic OLM Classroom & AI Markdown: js/app.js")

    print("\n🎉 HOÀN TẤT NÂNG CẤP V-CODE EDU v10.0 CHUẨN OLM.VN! Bấm Ctrl + Shift + R trên trình duyệt!")

if __name__ == "__main__":
    apply_v10()