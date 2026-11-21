// V-CODE EDU v13.0 — AI CHATBOX HỖ TRỢ MỌI ĐỊNH DẠNG GEMINI KEY (AQ. & AIza) + OPENAI + OFFLINE THÔNG MINH
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
      .replace(/```[a-z]*\n([\s\S]*?)```/g, '<pre style="background:#0F172A;color:#E2E8F0;padding:8px 10px;border-radius:8px;overflow-x:auto;margin:6px 0;font-size:12px"><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(16,185,129,0.16);color:#059669;padding:1px 5px;border-radius:4px;font-weight:600">$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
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
      return "🧮 **Kiểm tra số nguyên tố N:**\n```python\nn = int(input())\nla_nt = n > 1\nfor i in range(2, int(n**0.5) + 1):\n    if n % i == 0:\n        la_nt = False\n        break\nprint('Nguyen to' if la_nt else 'Khong phai')\n```";
    }
    if (q.includes('giai thừa') || q.includes('giai thua')) {
      return "🔢 **Tính giai thừa N!:**\n```python\nn = int(input())\ngt = 1\nfor i in range(1, n + 1):\n    gt *= i\nprint(gt)\n```";
    }
    if (q.includes('for') || q.includes('vòng lặp') || q.includes('while')) {
      return "🔁 **Vòng lặp `for` trong Python:**\n```python\nfor i in range(1, 6):\n    print(i)\n```";
    }
    if (q.includes('if') || q.includes('rẽ nhánh') || q.includes('chẵn') || q.includes('lẻ')) {
      return "🔀 **Rẽ nhánh `if / else`:**\n```python\nn = int(input())\nif n % 2 == 0:\n    print('Chan')\nelse:\n    print('Le')\n```";
    }
    return `🤖 **Trợ lý AI Cục bộ V-Code Edu:** Mình đã nhận câu hỏi *"${question}"*. Bạn có thể hỏi về cú pháp **Python, HTML, C, C++**, thuật toán hoặc sửa lỗi code!`;
  },

  async askHybrid(question, code = '', errorText = '') {
    const cfg = this.getConfig();
    const systemPrompt = "Bạn là Trợ lý AI thông minh, thân thiện của nền tảng giáo dục lập trình V-Code Edu (Việt Nam). Hãy trả lời trực tiếp, rõ ràng, ngắn gọn, có ví dụ code bằng Tiếng Việt.";
    const userContent = errorText ? `Câu hỏi: ${question}\nLỗi: ${errorText}\nCode:\n${code}` : question;

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
          return { mode: 'offline', text: this.offlineSmartReply(question, code, errorText) + `\n\n⚠️ *(OpenAI API trả về lỗi: ${d.error?.message || r.status})*` };
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
                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }]
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
          text: this.offlineSmartReply(question, code, errorText) + `\n\n⚠️ *(Chi tiết API Gemini: ${lastErr || 'Không thể kết nối'}). Đã tự động dùng AI Cục bộ trả lời.*`
        };
      }
    }

    return { mode: 'offline', text: this.offlineSmartReply(question, code, errorText) };
  },

  generateFlowchartSVG(code) {
    const lines = code.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'));
    const steps = [{ type: 'terminal', label: 'Bắt đầu (Start)' }];
    for (const line of lines.slice(0, 7)) {
      if (/^(if|elif|while|for|neu|lap_voi)\b/.test(line)) steps.push({ type: 'decision', label: line.replace(':', '').slice(0, 28) });
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
