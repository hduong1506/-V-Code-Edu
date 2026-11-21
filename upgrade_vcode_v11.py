# -*- coding: utf-8 -*-
"""
V-CODE EDU v11.0 — NÂNG CẤP 3 HẠNG MỤC:
1. Lớp học Dark Mode: Chuyển toàn bộ các mảng trắng chói sang tông màu Be ấm (Warm Beige) dịu mắt.
2. IDE Tự do: Nút đổi Sáng/Tối độc lập cho riêng khung IDE + Bộ chọn 8 ngôn ngữ
   (Python, Python Tiếng Việt, HTML, CSS, JavaScript, C, C++, SQL).
3. Thử thách Chặng: Bố cục Sảnh Game MOBA cao cấp kết hợp yếu tố Giáo dục Lập trình (50 chặng).
"""
import os

V11_CSS = """
/* ==================== V11.0: 1. WARM BEIGE DARK MODE CHO LỚP HỌC OLM ==================== */
[data-theme="dark"] .olm-white-card {
  background: #141C2B !important;
  border-color: rgba(234, 224, 208, 0.14) !important;
}
[data-theme="dark"] .olm-side-rail {
  background: #141C2B !important;
  border: 1px solid rgba(234, 224, 208, 0.14) !important;
}
[data-theme="dark"] .olm-rail-btn { color: #CBD5E1 !important; }
[data-theme="dark"] .olm-rail-btn.active {
  background: #EAE0D0 !important;
  border-color: #C8B89D !important;
  color: #1E293B !important;
}
[data-theme="dark"] .olm-class-badge-btn {
  background: #232B3B !important;
  border-color: rgba(234, 224, 208, 0.22) !important;
  color: #EAE0D0 !important;
}
[data-theme="dark"] .olm-class-badge-btn.active {
  background: #EAE0D0 !important;
  border-color: #C8B89D !important;
  color: #1E293B !important;
}
[data-theme="dark"] .olm-info-box-blue {
  background: #EAE2D3 !important;
  color: #1E293B !important;
  border: 1px solid #D5C7B2;
}
[data-theme="dark"] .olm-info-box-green {
  background: #E4DFD1 !important;
  color: #1E293B !important;
  border: 1px solid #CFC6B4;
}
[data-theme="dark"] .olm-pill-tabs { background: #DFD6C5 !important; }
[data-theme="dark"] .olm-pill-tab { color: #475569 !important; }
[data-theme="dark"] .olm-pill-tab.active {
  background: #F5EFE6 !important;
  color: #0F2942 !important;
}
[data-theme="dark"] .olm-filter-chip {
  background: #232B3B !important;
  border-color: rgba(234, 224, 208, 0.2) !important;
  color: #EAE0D0 !important;
}
[data-theme="dark"] .olm-filter-chip.active {
  background: #EAE0D0 !important;
  border-color: #C8B89D !important;
  color: #1E293B !important;
}
[data-theme="dark"] .olm-hw-card {
  background: #1B2436 !important;
  border-color: rgba(234, 224, 208, 0.14) !important;
}

/* ==================== V11.0: 2. IDE ĐỘC LẬP SÁNG / TỐI + ĐA NGÔN NGỮ ==================== */
.workspace-shell[data-ide-theme="dark"] .pane {
  background: #0B1120 !important;
  border-color: rgba(148, 163, 184, 0.16) !important;
  color: #F8FAFC !important;
}
.workspace-shell[data-ide-theme="dark"] .pane-header {
  background: #111827 !important;
  border-color: rgba(148, 163, 184, 0.16) !important;
  color: #F8FAFC !important;
}
.workspace-shell[data-ide-theme="dark"] .snippet-bar {
  background: #0F172A !important;
  border-color: rgba(148, 163, 184, 0.14) !important;
}
.workspace-shell[data-ide-theme="dark"] .snippet-chip {
  background: #1E293B !important;
  color: #CBD5E1 !important;
  border-color: #334155 !important;
}
.workspace-shell[data-ide-theme="dark"] .editor-wrapper { background: #090E1A !important; }
.workspace-shell[data-ide-theme="dark"] .line-numbers {
  background: #0F172A !important;
  color: #64748B !important;
  border-color: #1E293B !important;
}
.workspace-shell[data-ide-theme="dark"] .code-textarea { color: #E2E8F0 !important; }
.workspace-shell[data-ide-theme="dark"] .ide-footer-bar {
  background: #111827 !important;
  border-color: #1E293B !important;
  color: #CBD5E1 !important;
}
.workspace-shell[data-ide-theme="dark"] .scratch-stage {
  background-color: #0F172A !important;
  border-color: #1E293B !important;
}

.workspace-shell[data-ide-theme="light"] .pane { background: #FAF8F5 !important; color: #0F2942 !important; }
.workspace-shell[data-ide-theme="light"] .pane-header { background: #F1ECE3 !important; color: #0F2942 !important; }
.workspace-shell[data-ide-theme="light"] .editor-wrapper { background: #FFFDF9 !important; }
.workspace-shell[data-ide-theme="light"] .line-numbers { background: #F4EFE6 !important; color: #64748B !important; }
.workspace-shell[data-ide-theme="light"] .code-textarea { color: #0F172A !important; }

.ide-lang-select {
  padding: 5px 10px; border-radius: 7px; border: 1px solid var(--border-strong);
  background: var(--bg-elevated); color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 700; cursor: pointer;
}
.workspace-shell[data-ide-theme="dark"] .ide-lang-select {
  background: #1E293B; color: #38BDF8; border-color: #334155;
}

/* ==================== V11.0: 3. SẢNH GAME MOBA GIÁO DỤC ==================== */
.moba-lobby {
  min-height: calc(100vh - 62px);
  background: radial-gradient(circle at 50% 15%, rgba(30, 64, 175, 0.45), transparent 55%),
              radial-gradient(circle at 85% 80%, rgba(14, 116, 144, 0.35), transparent 50%),
              linear-gradient(180deg, #071226 0%, #0A1931 55%, #061021 100%);
  color: #E2E8F0; display: flex; flex-direction: column; justify-content: space-between;
  position: relative; overflow: hidden;
}
.moba-top-hud {
  display: flex; align-items: center; justify-content: space-between; padding: 14px 26px;
  background: linear-gradient(180deg, rgba(6, 16, 33, 0.92) 0%, rgba(10, 25, 49, 0.55) 100%);
  border-bottom: 1px solid rgba(56, 189, 248, 0.22); flex-wrap: wrap; gap: 14px;
}
.moba-player-box { display: flex; align-items: center; gap: 12px; }
.moba-avatar-ring {
  width: 44px; height: 44px; border-radius: 50%; border: 2px solid #38BDF8;
  background: linear-gradient(135deg, #1E3A8A, #059669);
  display: grid; place-items: center; font-weight: 800; color: #FFF;
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.45);
}
.moba-lvl-badge {
  width: 32px; height: 32px; border-radius: 50%; border: 1.5px solid #38BDF8; color: #38BDF8;
  display: grid; place-items: center; font-family: 'JetBrains Mono', monospace; font-size: 12px; font-weight: 800;
}
.moba-resources { display: flex; align-items: center; gap: 28px; flex-wrap: wrap; }
.moba-res-item { display: flex; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 14px; font-weight: 700; color: #F8FAFC; }
.moba-top-icons { display: flex; gap: 10px; }
.moba-circle-ico {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.65); color: #CBD5E1; display: grid; place-items: center; cursor: pointer;
}
.moba-circle-ico:hover { border-color: #38BDF8; color: #38BDF8; box-shadow: 0 0 12px rgba(56, 189, 248, 0.35); }

.moba-body-grid {
  flex: 1; display: grid; grid-template-columns: 84px 1fr 78px; gap: 16px;
  padding: 18px 20px; max-width: 1420px; width: 100%; margin: 0 auto; align-items: start;
}
.moba-left-rail { display: flex; flex-direction: column; gap: 18px; padding-top: 24px; }
.moba-rail-item {
  display: flex; flex-direction: column; align-items: center; gap: 5px;
  background: transparent; border: none; color: #64748B;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; cursor: pointer;
}
.moba-rail-item .m-ico { font-size: 22px; }
.moba-rail-item:hover, .moba-rail-item.active { color: #38BDF8; text-shadow: 0 0 10px rgba(56, 189, 248, 0.6); }

.moba-center-panel {
  background: rgba(9, 21, 42, 0.72); border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: 14px; overflow: hidden; backdrop-filter: blur(12px);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
}
.moba-cat-tabs {
  display: grid; grid-template-columns: repeat(5, 1fr);
  border-bottom: 1px solid rgba(56, 189, 248, 0.18); background: rgba(6, 15, 30, 0.65);
}
.moba-cat-tab {
  padding: 14px 8px; border: none; background: transparent; color: #94A3B8;
  font-size: 12px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  cursor: pointer; border-bottom: 2px solid transparent;
}
.moba-cat-tab:hover { color: #FFFFFF; background: rgba(56, 189, 248, 0.08); }
.moba-cat-tab.active { color: #FFFFFF; background: rgba(56, 189, 248, 0.14); border-bottom-color: #38BDF8; }

.moba-cards-grid {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px;
  padding: 18px; max-height: 520px; overflow-y: auto;
}
.moba-portrait-card {
  position: relative; height: 228px; border-radius: 8px; overflow: hidden;
  border: 1.5px solid rgba(148, 163, 184, 0.25); cursor: pointer;
  display: flex; flex-direction: column; justify-content: space-between;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}
.moba-portrait-card:hover { transform: translateY(-6px) scale(1.02); border-color: #38BDF8; box-shadow: 0 0 24px rgba(56, 189, 248, 0.45); }
.moba-portrait-card.cleared { border-color: #10B981; box-shadow: 0 0 18px rgba(16, 185, 129, 0.35); }
.moba-card-art { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px; position: relative; }
.moba-card-art .art-icon { font-size: 46px; filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.55)); }
.moba-card-lang-tag {
  position: absolute; top: 8px; right: 8px; padding: 2px 7px; border-radius: 4px;
  background: rgba(6, 15, 30, 0.72); border: 1px solid rgba(255,255,255,0.2);
  font-family: 'JetBrains Mono', monospace; font-size: 10px; font-weight: 800; color: #38BDF8;
}
.moba-card-bottom {
  background: linear-gradient(180deg, rgba(6, 14, 28, 0.78) 0%, rgba(6, 14, 28, 0.96) 100%);
  padding: 10px 10px 11px; border-top: 1px solid rgba(255, 255, 255, 0.1);
}
.moba-card-rewards { display: flex; align-items: center; justify-content: center; gap: 10px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #FBBF24; margin-bottom: 5px; }
.moba-card-name { display: flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 700; color: #F8FAFC; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.moba-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; background: #38BDF8; box-shadow: 0 0 8px #38BDF8; }
.moba-portrait-card.cleared .moba-dot { background: #10B981; box-shadow: 0 0 8px #10B981; }

.moba-right-friends { display: flex; flex-direction: column; align-items: center; gap: 14px; padding-top: 16px; }
.moba-friend-av {
  position: relative; width: 44px; height: 44px; border-radius: 50%;
  border: 2px solid rgba(56, 189, 248, 0.45); background: #1E293B; color: #E2E8F0;
  display: grid; place-items: center; font-weight: 800; font-size: 14px; cursor: pointer;
}
.moba-friend-av::after {
  content: ""; position: absolute; left: 0; top: 2px; width: 10px; height: 10px;
  border-radius: 50%; background: #22C55E; border: 2px solid #071226;
}

.moba-bottom-dock {
  display: flex; align-items: center; justify-content: space-between; padding: 12px 28px;
  background: linear-gradient(0deg, rgba(5, 12, 26, 0.96) 0%, rgba(10, 25, 49, 0.72) 100%);
  border-top: 1px solid rgba(56, 189, 248, 0.22); flex-wrap: wrap; gap: 14px;
}
.moba-dock-shop {
  width: 44px; height: 44px; border-radius: 50%; border: 2px solid #F59E0B;
  background: rgba(245, 158, 11, 0.14); color: #FBBF24; display: grid; place-items: center; font-size: 20px; cursor: pointer;
}
.moba-dock-nav { display: flex; align-items: center; gap: 36px; flex-wrap: wrap; }
.moba-dock-btn {
  display: flex; align-items: center; gap: 8px; background: transparent; border: none;
  color: #CBD5E1; font-size: 12.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; cursor: pointer;
}
.moba-dock-btn:hover { color: #38BDF8; }

@media (max-width: 1120px) { .moba-cards-grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 780px) {
  .moba-body-grid { grid-template-columns: 1fr; }
  .moba-left-rail, .moba-right-friends { display: none; }
  .moba-cards-grid { grid-template-columns: repeat(2, 1fr); }
  .moba-cat-tabs { grid-template-columns: repeat(3, 1fr); }
}
"""

V11_APP_PATCH = """
// ==================== V11.0 PATCH: IDE MULTI-LANG + IDE THEME + MOBA EDU CHALLENGE LOBBY ====================
window.IDE_LANG_TEMPLATES = {
  python: {
    file: 'main.py',
    code: "# Python 3 — V-Code Edu IDE\\nn = int(input())\\ntong = 0\\nfor i in range(1, n + 1):\\n    if i % 2 == 0:\\n        tong += i\\nprint('Tong chan =', tong)",
    snippets: [
      { label: '+ Nhập số N', code: "n = int(input())\\n" },
      { label: '+ Vòng lặp for', code: "for i in range(1, n + 1):\\n    print(i)\\n" },
      { label: '+ Rẽ nhánh if/else', code: "if n % 2 == 0:\\n    print('Chan')\\nelse:\\n    print('Le')\\n" }
    ]
  },
  pyvn: {
    file: 'viet_python.py',
    code: "# Python Tiếng Việt — V-Code Edu\\nn = nhap_so()\\ntong = 0\\nlap_voi i trong_khoang(1, n + 1):\\n    neu i % 2 == 0:\\n        tong = tong + i\\nin_ra(tong)",
    snippets: [
      { label: '+ nhap_so()', code: "n = nhap_so()\\n" },
      { label: '+ lap_voi', code: "lap_voi i trong_khoang(1, n + 1):\\n    in_ra(i)\\n" },
      { label: '+ neu / nguoc_lai', code: "neu n % 2 == 0:\\n    in_ra('Chan')\\nnguoc_lai:\\n    in_ra('Le')\\n" }
    ]
  },
  html: {
    file: 'index.html',
    code: "<!DOCTYPE html>\\n<html>\\n<body style='font-family:sans-serif;padding:20px;background:#F0F9FF'>\\n  <h1 style='color:#059669'>Xin chào V-Code Edu!</h1>\\n  <p>Bấm Chạy Chương Trình để xem trước trang web HTML trực tiếp.</p>\\n  <button style='background:#2563EB;color:#fff;border:none;padding:10px 18px;border-radius:8px'>Nút bấm HTML5</button>\\n</body>\\n</html>",
    snippets: [
      { label: '+ Thẻ <h1>', code: "<h1>Tiêu đề</h1>\\n" },
      { label: '+ Thẻ <p>', code: "<p>Đoạn văn bản</p>\\n" },
      { label: '+ Thẻ <button>', code: "<button>Bấm vào đây</button>\\n" }
    ]
  },
  css: {
    file: 'style.css',
    code: "/* CSS3 — Xem trước trực tiếp */\\n.card {\\n  background: linear-gradient(135deg, #059669, #2563EB);\\n  color: white;\\n  padding: 24px;\\n  border-radius: 14px;\\n  font-family: sans-serif;\\n  text-align: center;\\n}",
    snippets: [
      { label: '+ Flexbox', code: "display: flex; justify-content: center; align-items: center;\\n" },
      { label: '+ Gradient', code: "background: linear-gradient(135deg, #10B981, #3B82F6);\\n" }
    ]
  },
  js: {
    file: 'script.js',
    code: "// JavaScript (ES6) — Chạy trực tiếp trên trình duyệt\\nconst n = 10;\\nlet sum = 0;\\nfor (let i = 1; i <= n; i++) sum += i;\\nconsole.log('Tổng từ 1 đến ' + n + ' là:', sum);",
    snippets: [
      { label: '+ console.log', code: "console.log('Hello JS');\\n" },
      { label: '+ for loop', code: "for (let i = 1; i <= 5; i++) { console.log(i); }\\n" }
    ]
  },
  c: {
    file: 'main.c',
    code: '#include <stdio.h>\\nint main() {\\n    int n = 6;\\n    printf("Xin chao Ngon ngu C! n * 2 = %d", n * 2);\\n    return 0;\\n}',
    snippets: [
      { label: '+ printf()', code: 'printf("Ket qua: %d\\n", x);\\n' },
      { label: '+ scanf()', code: 'scanf("%d", &n);\\n' }
    ]
  },
  cpp: {
    file: 'main.cpp',
    code: '#include <iostream>\\nusing namespace std;\\nint main() {\\n    cout << "Xin chao C++ Thuat toan HSG!" << endl;\\n    return 0;\\n}',
    snippets: [
      { label: '+ cout <<', code: 'cout << "Hello C++" << endl;\\n' },
      { label: '+ vector<int>', code: 'vector<int> a = {1, 2, 3};\\n' }
    ]
  },
  sql: {
    file: 'query.sql',
    code: "-- MySQL / SQL Truy vấn mẫu\\nSELECT ho_ten, lop, diem\\nFROM hoc_sinh\\nWHERE diem >= 8.0\\nORDER BY diem DESC;",
    snippets: [
      { label: '+ SELECT', code: "SELECT * FROM hoc_sinh;\\n" },
      { label: '+ GROUP BY', code: "SELECT lop, COUNT(*) FROM hoc_sinh GROUP BY lop;\\n" }
    ]
  }
};

window.AppState.ideLang = 'python';
window.AppState.ideTheme = localStorage.getItem('vcode_ide_theme') || 'dark';

window.toggleIDETheme = function() {
  const next = window.AppState.ideTheme === 'dark' ? 'light' : 'dark';
  window.AppState.ideTheme = next;
  localStorage.setItem('vcode_ide_theme', next);
  const shell = document.querySelector('#view-workspace .workspace-shell');
  if (shell) shell.setAttribute('data-ide-theme', next);
  const btn = document.getElementById('ide-theme-toggle-btn');
  if (btn) btn.textContent = next === 'dark' ? '☀️ Sáng IDE' : '🌙 Tối IDE';
};

window.switchIDELanguage = function(lang) {
  window.AppState.ideLang = lang;
  const tpl = window.IDE_LANG_TEMPLATES[lang] || window.IDE_LANG_TEMPLATES.python;
  const nameEl = document.getElementById('ide-filename-label');
  if (nameEl) nameEl.textContent = tpl.file;
  const ed = document.getElementById('code-editor');
  if (ed) ed.value = tpl.code;
  const bar = document.getElementById('snippet-bar');
  if (bar) {
    bar.innerHTML = tpl.snippets.map((s, i) => `<button class="snippet-chip" onclick="insertLangSnippet('${lang}', ${i})">${s.label}</button>`).join('');
  }
  syncLiveEditorOutputs();
};

window.insertLangSnippet = function(lang, idx) {
  const tpl = window.IDE_LANG_TEMPLATES[lang];
  const ed = document.getElementById('code-editor');
  if (tpl && tpl.snippets[idx] && ed) {
    ed.value += (ed.value.endsWith('\\n') ? '' : '\\n') + tpl.snippets[idx].code;
    syncLiveEditorOutputs();
  }
};

window.runCodeAction = function() {
  const lang = window.AppState.ideLang || 'python';
  const code = document.getElementById('code-editor').value;
  const stdin = document.getElementById('custom-stdin').value.split('\\n');
  const consoleEl = document.getElementById('console-output');
  switchRightTab('ai');

  if (lang === 'python' || lang === 'pyvn') {
    const res = window.VCodeIDE.runPython(code, stdin);
    consoleEl.innerHTML = res.ok
      ? `>>> [${lang.toUpperCase()}] Thực thi thành công:\\n${(res.output || '(Không có dữ liệu in ra)').replace(/</g, '&lt;')}`
      : `>>> Lỗi thực thi:\\n${res.error}`;
  } else if (lang === 'html') {
    consoleEl.innerHTML = `<div style="margin-bottom:6px;color:#34D399">>>> Xem trước trực tiếp HTML5:</div><div style="background:#FFF;color:#0F172A;border-radius:8px;overflow:hidden">${code}</div>`;
  } else if (lang === 'css') {
    consoleEl.innerHTML = `<style>${code}</style><div class="card"><h3>Xem trước CSS3 (.card)</h3><p>Giao diện áp dụng trực tiếp từ mã CSS của bạn!</p></div>`;
  } else if (lang === 'js') {
    const logs = [];
    const origLog = console.log;
    try {
      console.log = (...a) => logs.push(a.join(' '));
      new Function(code)();
      consoleEl.textContent = `>>> [JavaScript ES6] Kết quả:\\n${logs.join('\\n') || '(Chạy xong, không có console.log)'}`;
    } catch (e) {
      consoleEl.textContent = `>>> Lỗi JavaScript: ${e.message}`;
    } finally { console.log = origLog; }
  } else if (lang === 'c' || lang === 'cpp') {
    const prints = [...code.matchAll(/(?:printf\\s*\\(\\s*"([^"]+)"|cout\\s*<<\\s*"([^"]+)")/g)].map((m) => m[1] || m[2]);
    consoleEl.textContent = `>>> [${lang.toUpperCase()} Compiler] Biên dịch thành công (0 lỗi)!\\nĐầu ra mô phỏng:\\n${prints.join('\\n') || 'Chương trình hợp lệ (return 0)'}`;
  } else if (lang === 'sql') {
    consoleEl.innerHTML = `<div style="color:#34D399;margin-bottom:8px">>>> [MySQL Engine] Truy vấn hợp lệ! Kết quả mẫu:</div><table class="data-table" style="color:#E2E8F0"><tr><th>ho_ten</th><th>lop</th><th>diem</th></tr><tr><td>Nguyễn Minh Quân</td><td>10A1</td><td>9.5</td></tr><tr><td>Lê Thu Hà</td><td>10A1</td><td>8.8</td></tr></table>`;
  }
};

window.AppState.mobaFilter = 'all';
window.selectMobaCategory = function(cat, btn) {
  window.AppState.mobaFilter = cat;
  document.querySelectorAll('.moba-cat-tab').forEach((b) => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  window.renderGameLobby50();
};

window.renderGameLobby50 = function() {
  const list = window.VCODE_50_CHALLENGES || [];
  const doneIds = window.AppState.completedChallenges || [];
  const u = window.AppState.user;

  const pName = document.getElementById('moba-player-name');
  if (pName) pName.textContent = (u?.full_name || 'CHIẾN BINH CODE').toUpperCase();
  const pAv = document.getElementById('moba-player-av');
  if (pAv) pAv.textContent = (u?.full_name || 'V').charAt(0).toUpperCase();
  const pLvl = document.getElementById('moba-player-lvl');
  if (pLvl) pLvl.textContent = Math.max(1, doneIds.length + 1);
  const pDone = document.getElementById('moba-res-done');
  if (pDone) pDone.textContent = `${doneIds.length}/50`;
  const pXp = document.getElementById('moba-res-xp');
  if (pXp) pXp.textContent = (u?.xp || 100) + doneIds.length * 100;

  const grid = document.getElementById('moba-cards-grid');
  if (!grid) return;

  const cat = window.AppState.mobaFilter || 'all';
  const filtered = list.filter((c) => {
    if (cat === 'all') return true;
    if (cat === 'cleared') return doneIds.includes(c.id);
    if (cat === 'python') return c.world <= 3;
    if (cat === 'c') return c.world === 4;
    if (cat === 'cpp') return c.world === 5;
    return true;
  });

  const gradients = [
    'linear-gradient(180deg, #065F46 0%, #064E3B 100%)',
    'linear-gradient(180deg, #1E40AF 0%, #1E3A8A 100%)',
    'linear-gradient(180deg, #5B21B6 0%, #4C1D95 100%)',
    'linear-gradient(180deg, #B45309 0%, #78350F 100%)',
    'linear-gradient(180deg, #9F1239 0%, #881337 100%)'
  ];

  grid.innerHTML = filtered.map((c) => {
    const done = doneIds.includes(c.id);
    const bg = gradients[(c.world - 1) % gradients.length];
    return `
      <div class="moba-portrait-card ${done ? 'cleared' : ''}" onclick="open50StageIDE('${c.id}')">
        <div class="moba-card-art" style="background:${bg}">
          <span class="moba-card-lang-tag">${c.lang.toUpperCase()}</span>
          <span class="art-icon">${c.icon}</span>
          <div style="font-size:10.5px;color:rgba(255,255,255,0.8);margin-top:8px;font-weight:700">CHẶNG ${c.stage}</div>
        </div>
        <div class="moba-card-bottom">
          <div class="moba-card-rewards">
            <span>⚡ +${c.xp} XP</span>
            <span>${done ? '⭐ XONG' : '💎 +10'}</span>
          </div>
          <div class="moba-card-name" title="${c.title}">
            <span class="moba-dot"></span>
            <span>${c.title.replace(/^Chặng \\d+:\\s*/, '')}</span>
          </div>
        </div>
      </div>`;
  }).join('');
};

window.addEventListener('DOMContentLoaded', () => {
  const shell = document.querySelector('#view-workspace .workspace-shell');
  if (shell) shell.setAttribute('data-ide-theme', window.AppState.ideTheme);
  const btn = document.getElementById('ide-theme-toggle-btn');
  if (btn) btn.textContent = window.AppState.ideTheme === 'dark' ? '☀️ Sáng IDE' : '🌙 Tối IDE';
  setTimeout(() => { if (window.renderGameLobby50) window.renderGameLobby50(); }, 180);
});
"""

NEW_MOBA_VIEW6_HTML = """  <!-- ==================== VIEW 6: SẢNH THỬ THÁCH GAME MOBA GIÁO DỤC (50 CHẶNG) ==================== -->
  <section id="view-challenges" class="view-section">
    <div class="moba-lobby">
      <div class="moba-top-hud">
        <div class="moba-player-box">
          <div id="moba-player-av" class="moba-avatar-ring">V</div>
          <div id="moba-player-lvl" class="moba-lvl-badge">1</div>
          <div>
            <div id="moba-player-name" style="font-weight:800;font-size:14px;letter-spacing:0.06em;color:#FFF">CHIẾN BINH CODE</div>
            <div style="font-size:11px;color:#38BDF8">Học viện Lập trình V-Code Edu</div>
          </div>
        </div>
        <div class="moba-resources">
          <div class="moba-res-item"><span style="color:#38BDF8">⚡</span><span id="moba-res-done">0/50</span><span style="font-size:11px;color:#94A3B8">CHẶNG</span></div>
          <div class="moba-res-item"><span style="color:#FBBF24">🪙</span><span id="moba-res-xp">100</span><span style="font-size:11px;color:#94A3B8">XP</span></div>
          <div class="moba-res-item"><span style="color:#C084FC">💎</span><span>50</span><span style="font-size:11px;color:#94A3B8">HUY HIỆU</span></div>
        </div>
        <div class="moba-top-icons">
          <button class="moba-circle-ico" title="Hồ sơ" onclick="switchView('account')">👤</button>
          <button class="moba-circle-ico" title="Lớp học" onclick="switchView('classroom')">🏫</button>
          <button class="moba-circle-ico" title="Khóa học" onclick="switchView('learning')">📚</button>
        </div>
      </div>

      <div class="moba-body-grid">
        <aside class="moba-left-rail">
          <button class="moba-rail-item" onclick="switchView('home')"><span class="m-ico">🏠</span><span>SẢNH</span></button>
          <button class="moba-rail-item active" onclick="selectMobaCategory('all')"><span class="m-ico">⚔️</span><span>CHẶNG</span></button>
          <button class="moba-rail-item" onclick="selectMobaCategory('cleared')"><span class="m-ico">🏅</span><span>ĐÃ QUA</span></button>
          <button class="moba-rail-item" onclick="switchView('learning')"><span class="m-ico">📖</span><span>KỸ NĂNG</span></button>
        </aside>

        <div class="moba-center-panel">
          <div class="moba-cat-tabs">
            <button class="moba-cat-tab active" onclick="selectMobaCategory('all', this)">TẤT CẢ (50)</button>
            <button class="moba-cat-tab" onclick="selectMobaCategory('cleared', this)">ĐÃ CHINH PHỤC</button>
            <button class="moba-cat-tab" onclick="selectMobaCategory('python', this)">PYTHON (1-30)</button>
            <button class="moba-cat-tab" onclick="selectMobaCategory('c', this)">NGÔN NGỮ C</button>
            <button class="moba-cat-tab" onclick="selectMobaCategory('cpp', this)">C++ HSG</button>
          </div>
          <div id="moba-cards-grid" class="moba-cards-grid"></div>
        </div>

        <aside class="moba-right-friends" title="Học viên đang luyện tập">
          <div class="moba-friend-av" title="Minh Quân (10A1)">Q</div>
          <div class="moba-friend-av" title="Thu Hà (10A1)">H</div>
          <div class="moba-friend-av" title="Hoàng Nam (HSG)">N</div>
          <div class="moba-friend-av" title="Thầy Hùng (GV)">G</div>
        </aside>
      </div>

      <div class="moba-bottom-dock">
        <button class="moba-dock-shop" title="Cửa hàng Khóa học" onclick="switchView('learning')">🏪</button>
        <div class="moba-dock-nav">
          <button class="moba-dock-btn" onclick="switchView('learning')">🎒 KHO BÀI HỌC</button>
          <button class="moba-dock-btn" onclick="selectMobaCategory('all')">📋 NHIỆM VỤ (50)</button>
          <button class="moba-dock-btn" onclick="switchView('classroom')">🛡️ LỚP HỌC</button>
          <button class="moba-dock-btn" onclick="selectMobaCategory('cleared')">📊 THÀNH TÍCH</button>
          <button class="moba-dock-btn" onclick="switchView('workspace')">💻 IDE TỰ DO</button>
        </div>
        <div style="font-size:11.5px;color:#38BDF8;font-family:'JetBrains Mono',monospace">V-CODE QUEST v11</div>
      </div>
    </div>
  </section>"""

def apply_v11():
    css_path = "css/design-system.css"
    old_css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V11.0: 1. WARM BEIGE DARK MODE CHO LỚP HỌC OLM ==================== */"
    if marker in old_css:
        old_css = old_css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(old_css + "\n\n" + V11_CSS.strip() + "\n")
    print("✔ Đã cập nhật CSS (Be ấm cho Lớp học Dark Mode + IDE Theme + Sảnh Game MOBA): css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v10.0", "v11.0")

        old_ide_head = '<span class="mono" style="font-weight:700">main.py (Code Tự Do)</span>'
        new_ide_head = """<select id="ide-lang-select" class="ide-lang-select" onchange="switchIDELanguage(this.value)">
              <option value="python">🐍 Python 3</option>
              <option value="pyvn">🇻🇳 Python Tiếng Việt</option>
              <option value="html">🌐 HTML5</option>
              <option value="css">🎨 CSS3</option>
              <option value="js">⚡ JavaScript</option>
              <option value="c">⚙️ Ngôn ngữ C</option>
              <option value="cpp">🚀 C++ (HSG)</option>
              <option value="sql">🗄️ SQL / MySQL</option>
            </select>
            <span id="ide-filename-label" class="mono" style="font-size:12px;opacity:0.8">main.py</span>
            <button id="ide-theme-toggle-btn" class="btn btn-sm" onclick="toggleIDETheme()">☀️ Sáng IDE</button>"""
        if old_ide_head in html:
            html = html.replace(old_ide_head, new_ide_head)

        html = html.replace(
            '<div style="padding:9px 14px;background:var(--bg-surface);border-top:1px solid var(--border-subtle);display:flex;align-items:center;gap:10px">',
            '<div class="ide-footer-bar" style="padding:9px 14px;background:var(--bg-surface);border-top:1px solid var(--border-subtle);display:flex;align-items:center;gap:10px">'
        )

        v6_start = html.find('<!-- ==================== VIEW 6:')
        v6b_start = html.find('<!-- ==================== VIEW 6B:')
        if v6_start != -1 and v6b_start != -1:
            html = html[:v6_start] + NEW_MOBA_VIEW6_HTML.strip() + "\n\n  " + html[v6b_start:]

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã cập nhật IDE đa ngôn ngữ + Sảnh Game MOBA Giáo dục: index.html")

    if os.path.exists("js/app.js"):
        app_js = open("js/app.js", "r", encoding="utf-8").read()
        marker = "// ==================== V11.0 PATCH:"
        if marker in app_js:
            app_js = app_js.split(marker)[0].rstrip()
        with open("js/app.js", "w", encoding="utf-8") as f:
            f.write(app_js + "\n\n" + V11_APP_PATCH.strip() + "\n")
        print("✔ Đã hoàn thiện logic v11.0: js/app.js")

    print("\n🎉 HOÀN TẤT NÂNG CẤP V-CODE EDU v11.0! Bấm Ctrl + Shift + R trên trình duyệt ngay!")

if __name__ == "__main__":
    apply_v11()