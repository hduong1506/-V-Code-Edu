# -*- coding: utf-8 -*-
"""
V-CODE EDU v13.0:
1. Vá lỗi chặn API Key Google AI Studio mới (hỗ trợ cả khóa bắt đầu bằng AQ. lẫn AIza... và sk-...,
   gửi kèm header x-goog-api-key và tự động thử gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash).
2. Xóa bỏ hoàn toàn khoảng trống thừa ở Trang chủ, bổ sung thêm cụm hình ảnh 3D động
   (Khối lập phương 3D xoay 6 mặt, Thẻ lộ trình đa ngôn ngữ, Biểu đồ cột động).
"""
import os

AI_TUTOR_V13_JS = """// V-CODE EDU v13.0 — AI CHATBOX HỖ TRỢ MỌI ĐỊNH DẠNG GEMINI KEY (AQ. & AIza) + OPENAI + OFFLINE THÔNG MINH
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
    return Boolean((cfg.geminiKey && cfg.geminiKey.length >= 12) || (cfg.openaiKey && cfg.openaiKey.length >= 12));
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
    if (/^(hi|hello|hey|chào|chao|xin chào|alo|bạn là ai|ban la ai)/.test(q)) {
      return "👋 Chào bạn! Mình là **Trợ lý AI của V-Code Edu**. Bạn có thể hỏi mình về **Python, Python Tiếng Việt, HTML/CSS, C, C++, thuật toán** hoặc dán lỗi code để mình hướng dẫn sửa nhé!";
    }
    if (/SyntaxError/i.test(errorText) || q.includes('syntaxerror') || q.includes('lỗi cú pháp')) {
      return "⚠️ **Cách sửa lỗi SyntaxError:** Kiểm tra dấu hai chấm `:` ở cuối dòng `if/elif/else/for/while/def`, cặp ngoặc `()` và dùng `==` khi so sánh.";
    }
    if (/IndentationError/i.test(errorText) || q.includes('thụt lề')) {
      return "⚠️ **Cách sửa lỗi IndentationError:** Các lệnh trong cùng khối `if/for/while` phải thụt lề đều **4 khoảng trắng** (1 phím Tab).";
    }
    if (q.includes('số nguyên tố') || q.includes('nguyen to')) {
      return "🧮 **Kiểm tra số nguyên tố N:**\\n```python\\nn = int(input())\\nla_nt = n > 1\\nfor i in range(2, int(n**0.5) + 1):\\n    if n % i == 0:\\n        la_nt = False\\n        break\\nprint('Nguyen to' if la_nt else 'Khong phai')\\n```";
    }
    if (q.includes('giai thừa') || q.includes('giai thua')) {
      return "🔢 **Tính giai thừa N!:**\\n```python\\nn = int(input())\\ngt = 1\\nfor i in range(1, n + 1):\\n    gt *= i\\nprint(gt)\\n```";
    }
    if (q.includes('for') || q.includes('vòng lặp') || q.includes('while')) {
      return "🔁 **Vòng lặp `for` trong Python:**\\n```python\\nfor i in range(1, 6):\\n    print(i)\\n```";
    }
    if (q.includes('if') || q.includes('rẽ nhánh') || q.includes('chẵn') || q.includes('lẻ')) {
      return "🔀 **Rẽ nhánh `if / else`:**\\n```python\\nn = int(input())\\nif n % 2 == 0:\\n    print('Chan')\\nelse:\\n    print('Le')\\n```";
    }
    return `🤖 **Trợ lý AI Cục bộ V-Code Edu:** Mình đã nhận câu hỏi *"${question}"*. Bạn có thể hỏi về cú pháp **Python, HTML, C, C++**, thuật toán hoặc sửa lỗi code!`;
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
          return { mode: 'offline', text: this.offlineSmartReply(question, code, errorText) + `\\n\\n⚠️ *(OpenAI API trả về lỗi: ${d.error?.message || r.status})*` };
        } catch {}
      }

      if (cfg.geminiKey && cfg.geminiKey.length >= 12) {
        const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
        let lastErr = '';
        for (const model of models) {
          try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(cfg.geminiKey)}`;
            const r = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'x-goog-api-key': cfg.geminiKey },
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\\n\\n${userContent}` }] }]
              })
            });
            const d = await r.json().catch(() => ({}));
            if (r.ok && d.candidates?.[0]?.content?.parts?.[0]?.text) {
              return { mode: 'online-gemini', text: d.candidates[0].content.parts[0].text };
            }
            lastErr = d.error?.message || `HTTP ${r.status}`;
            if (r.status === 400 && /API key not valid/i.test(lastErr)) break;
          } catch (e) {
            lastErr = e.message;
          }
        }
        return {
          mode: 'offline',
          text: this.offlineSmartReply(question, code, errorText) + `\\n\\n⚠️ *(Chi tiết API Gemini: ${lastErr || 'Không thể kết nối'}). Đã tự động dùng AI Cục bộ trả lời.*`
        };
      }
    }

    return { mode: 'offline', text: this.offlineSmartReply(question, code, errorText) };
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

V13_CSS = """
/* ==================== V13.0: FIX EMPTY GAPS ON HOMEPAGE + 3D ANIMATED SHOWCASE ==================== */
.scroll-chapter {
  min-height: auto !important;
  padding: 54px 24px !important;
}
#home-chapter-0 {
  min-height: calc(100vh - 90px) !important;
  padding-top: 32px !important;
  padding-bottom: 36px !important;
}

.home-3d-bridge-band {
  position: relative; z-index: 2; max-width: 1260px;
  margin: 8px auto 12px; padding: 26px 24px;
}
.home-3d-showcase-grid {
  display: grid; grid-template-columns: 1.1fr 0.9fr 1fr; gap: 18px; align-items: stretch;
}
.home-3d-card {
  background: var(--bg-glass); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--border-subtle); border-radius: 16px; padding: 22px;
  box-shadow: var(--shadow-card); position: relative; overflow: hidden;
  transition: transform 0.25s ease, border-color 0.25s ease;
}
.home-3d-card:hover { transform: translateY(-4px); border-color: var(--border-highlight); }

.center-cube-scene { width: 110px; height: 110px; perspective: 600px; margin: 12px auto 18px; }
.center-cube { width: 100%; height: 100%; position: relative; transform-style: preserve-3d; animation: rotateHomeCube 12s linear infinite; }
.center-cube .cf {
  position: absolute; width: 110px; height: 110px;
  border: 1.5px solid var(--accent-emerald);
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(59, 130, 246, 0.14));
  display: grid; place-items: center; font-family: 'JetBrains Mono', monospace;
  font-size: 16px; font-weight: 800; color: var(--text-primary);
  box-shadow: inset 0 0 18px rgba(16, 185, 129, 0.18);
}
.center-cube .cf1 { transform: rotateY(0deg) translateZ(55px); }
.center-cube .cf2 { transform: rotateY(90deg) translateZ(55px); }
.center-cube .cf3 { transform: rotateY(180deg) translateZ(55px); }
.center-cube .cf4 { transform: rotateY(-90deg) translateZ(55px); }
.center-cube .cf5 { transform: rotateX(90deg) translateZ(55px); }
.center-cube .cf6 { transform: rotateX(-90deg) translateZ(55px); }
@keyframes rotateHomeCube {
  0% { transform: rotateX(-18deg) rotateY(0deg); }
  100% { transform: rotateX(342deg) rotateY(360deg); }
}

.mini-bar-chart { display: flex; align-items: flex-end; gap: 8px; height: 78px; padding-top: 10px; margin-top: 12px; }
.mini-bar-chart span { flex: 1; border-radius: 6px 6px 2px 2px; background: linear-gradient(180deg, #10B981, #2563EB); animation: barPulse 2.8s ease-in-out infinite; }
.mini-bar-chart span:nth-child(1) { height: 42%; animation-delay: 0s; }
.mini-bar-chart span:nth-child(2) { height: 68%; animation-delay: 0.2s; }
.mini-bar-chart span:nth-child(3) { height: 55%; animation-delay: 0.4s; }
.mini-bar-chart span:nth-child(4) { height: 85%; animation-delay: 0.6s; }
.mini-bar-chart span:nth-child(5) { height: 96%; animation-delay: 0.8s; }
@keyframes barPulse {
  0%, 100% { opacity: 0.78; transform: scaleY(0.95); }
  50% { opacity: 1; transform: scaleY(1.04); }
}

@media (max-width: 960px) { .home-3d-showcase-grid { grid-template-columns: 1fr; } }
"""

HOME_3D_BRIDGE_HTML = """
    <!-- DẢI HÌNH ẢNH ĐỘNG 3D & THÔNG TIN HỆ SINH THÁI (LẤP ĐẦY KHOẢNG TRỐNG) -->
    <div class="home-3d-bridge-band">
      <div class="home-3d-showcase-grid">
        <div class="home-3d-card">
          <span class="bento-tag">Hệ sinh thái Đa ngôn ngữ</span>
          <h3 style="font-size:17px;margin-bottom:8px">Từ Kéo-Thả đến Thuật toán Thi HSG</h3>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:12px">
            Một lộ trình xuyên suốt giúp học sinh làm quen từ khối lệnh trực quan, chuyển mượt sang Python Tiếng Việt, Python chuẩn, Web HTML/CSS cho tới C/C++ chuyên sâu.
          </p>
          <div style="display:flex;gap:6px;flex-wrap:wrap">
            <span class="badge badge-easy">Python 3</span>
            <span class="badge badge-blue">Python VN</span>
            <span class="badge badge-med">HTML / CSS</span>
            <span class="badge badge-hard">C / C++</span>
          </div>
        </div>

        <div class="home-3d-card" style="text-align:center">
          <span class="bento-tag">Mô hình 3D • V-Code Core</span>
          <div class="center-cube-scene" aria-hidden="true">
            <div class="center-cube">
              <div class="cf cf1">Python</div>
              <div class="cf cf2">Scratch</div>
              <div class="cf cf3">C++</div>
              <div class="cf cf4">HTML5</div>
              <div class="cf cf5">AI</div>
              <div class="cf cf6">OLM</div>
            </div>
          </div>
          <div style="font-size:12.5px;color:var(--text-secondary)">6 trụ cột công nghệ đồng bộ trong 1 nền tảng</div>
        </div>

        <div class="home-3d-card">
          <span class="bento-tag">Hiệu quả Thực tế</span>
          <h3 style="font-size:17px;margin-bottom:6px">Tăng tốc Tư duy &amp; Tự động Hóa</h3>
          <p style="font-size:13px;color:var(--text-secondary)">
            Hệ thống chấm Test Case tức thì kết hợp 50 chặng thử thách game giúp học sinh tự học chủ động mọi lúc, mọi nơi.
          </p>
          <div class="mini-bar-chart" aria-hidden="true">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
        </div>
      </div>
    </div>
"""

V13_APP_PATCH = """
// ==================== V13.0 PATCH: UNBLOCK ALL GEMINI KEYS (AQ. & AIza) + OPENAI ====================
window.refreshRobotKeyUI = function() {
  const cfg = window.VCodeAI.getConfig();
  const activeKey = cfg.openaiKey || cfg.geminiKey;
  const guide = document.getElementById('robot-key-guide');
  const activeBox = document.getElementById('robot-key-active');
  const badge = document.getElementById('robot-ai-mode-badge');
  const masked = document.getElementById('robot-key-masked');

  if (activeKey && activeKey.length >= 12 && navigator.onLine) {
    if (guide) guide.style.display = 'none';
    if (activeBox) activeBox.style.display = 'flex';
    if (masked) masked.textContent = `${activeKey.slice(0, 6)}...${activeKey.slice(-4)}`;
    if (badge) badge.textContent = activeKey.startsWith('sk-') ? '🟢 API Chatbox (OpenAI)' : '🟢 API Chatbox (Gemini)';
  } else {
    if (guide) guide.style.display = 'block';
    if (activeBox) activeBox.style.display = 'none';
    if (badge) badge.textContent = '🟠 AI Cục bộ (Sẵn sàng không cần Key)';
  }
};

window.saveQuickRobotKey = function() {
  const k = (document.getElementById('robot-quick-key-input').value || '').trim();
  if (!k || k.length < 12) {
    alert('Vui lòng dán đầy đủ mã API Key (Gemini hoặc OpenAI)!');
    return;
  }
  if (k.startsWith('sk-')) {
    localStorage.setItem('vcode_openai_key', k);
    localStorage.removeItem('vcode_gemini_key');
  } else {
    localStorage.setItem('vcode_gemini_key', k);
    localStorage.removeItem('vcode_openai_key');
  }
  document.getElementById('robot-quick-key-input').value = '';
  refreshRobotKeyUI();
  showToast('🤖 Đã lưu API Key thành công! Hãy nhắn tin cho Robot AI ngay.');
};
"""

def apply_v13():
    with open("js/ai-tutor.js", "w", encoding="utf-8") as f:
        f.write(AI_TUTOR_V13_JS.strip() + "\n")
    print("✔ Đã gỡ chặn Key Google AI Studio (AQ. / AIza) & nâng cấp gọi Gemini 2.5/2.0: js/ai-tutor.js")

    css_path = "css/design-system.css"
    old_css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V13.0: FIX EMPTY GAPS ON HOMEPAGE"
    if marker in old_css:
        old_css = old_css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(old_css + "\n\n" + V13_CSS.strip() + "\n")
    print("✔ Đã xóa khoảng trống thừa & thêm CSS mô hình 3D xoay: css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v12.0", "v13.0")
        if 'class="home-3d-bridge-band"' not in html:
            ch3_marker = '<!-- CHƯƠNG 3'
            idx = html.find(ch3_marker)
            if idx != -1:
                html = html[:idx] + HOME_3D_BRIDGE_HTML.strip() + "\n\n    " + html[idx:]
        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã bổ sung dải hình ảnh động 3D & thông tin trang web vào: index.html")

    if os.path.exists("js/app.js"):
        app_js = open("js/app.js", "r", encoding="utf-8").read()
        marker = "// ==================== V13.0 PATCH:"
        if marker in app_js:
            app_js = app_js.split(marker)[0].rstrip()
        with open("js/app.js", "w", encoding="utf-8") as f:
            f.write(app_js + "\n\n" + V13_APP_PATCH.strip() + "\n")
        print("✔ Đã cập nhật hàm lưu Key hỗ trợ mọi mã Gemini/OpenAI: js/app.js")

    print("\n🎉 HOÀN TẤT NÂNG CẤP V-CODE EDU v13.0! Bấm Ctrl + Shift + R trên trình duyệt ngay!")

if __name__ == "__main__":
    apply_v13()