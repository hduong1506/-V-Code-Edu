# -*- coding: utf-8 -*-
"""
V-CODE EDU v17.0 — FIX TRIỆT ĐỂ LỖI SVG HIỆN CHỮ + THIẾT KẾ LẠI TRANG CHỦ PHONG CÁCH HODL.SWISS 3D
"""
import os
import re

SVG_ICO_RE = re.compile(r'<svg\s+class="vc-ico"[^>]*>[\s\S]*?</svg>\s*', re.IGNORECASE)

def clean_broken_svg_in_js(code):
    return SVG_ICO_RE.sub('', code)

def clean_broken_svg_in_html_attrs(html):
    def fix_attr(m):
        return m.group(1) + SVG_ICO_RE.sub('', m.group(2)) + m.group(3)
    return re.sub(r'(\b(?:title|placeholder|aria-label|alt|value)=["\'])([^"\']*)(["\'])', fix_attr, html)

def find_and_replace_home_view(html, new_home_inner_html):
    known_ids = ['view-home', 'home-view', 'home-section', 'page-home', 'section-home', 'home']
    m = None
    for kid in known_ids:
        pat = re.compile(rf'<(section|div|article)\b[^>]*\bid=["\']{re.escape(kid)}["\'][^>]*>', re.IGNORECASE)
        cand = pat.search(html)
        if cand:
            m = cand
            break

    if not m:
        for marker in ['Khơi mở tư duy', 'V-Code Edu Platform', 'swiss-home-root', 'hodl-vcode-root']:
            pos = html.find(marker)
            if pos != -1:
                cands = list(re.finditer(r'<(section|div)\b[^>]*(?:id=["\'][^"\']*home[^"\']*["\']|class=["\'][^"\']*view[^"\']*["\'])[^>]*>', html[:pos], re.IGNORECASE))
                if cands:
                    m = cands[-1]
                    break

    if not m:
        return html, False, None

    tag = m.group(1).lower()
    open_tag = m.group(0)
    inner_start = m.end()
    depth = 1
    token_re = re.compile(rf'<(/?){tag}\b[^>]*>', re.IGNORECASE)

    for tm in token_re.finditer(html, inner_start):
        if tm.group(1) == '/':
            depth -= 1
            if depth == 0:
                inner_end = tm.start()
                if 'hodl-vcode-root' not in open_tag:
                    if 'class="' in open_tag:
                        open_tag = open_tag.replace('class="', 'class="hodl-vcode-root ', 1)
                    elif "class='" in open_tag:
                        open_tag = open_tag.replace("class='", "class='hodl-vcode-root ", 1)
                    else:
                        open_tag = open_tag[:-1] + ' class="hodl-vcode-root">'
                return html[:m.start()] + open_tag + '\n' + new_home_inner_html + '\n' + html[inner_end:], True, open_tag
        else:
            if not tm.group(0).rstrip().endswith('/>'):
                depth += 1
    return html, False, None

HODL_VCODE_HOME_INNER = """
      <div id="hodl-cursor-glow" class="hodl-cursor-glow" aria-hidden="true"></div>
      <div class="hodl-horizon-bg" aria-hidden="true">
        <div class="hodl-horizon-arc"></div>
        <div class="hodl-floor-grid"></div>
      </div>

      <!-- PHÂN CẢNH 01: HERO 3D PHONG CÁCH HODL.SWISS -->
      <div class="hodl-hero hodl-reveal">
        <div class="hodl-hero-left">
          <div class="hodl-eyebrow">
            <span class="hodl-eyebrow-dot"></span>
            <span>V-CODE EDU • HỆ SINH THÁI GIÁO DỤC LẬP TRÌNH</span>
          </div>

          <h1 class="hodl-headline">
            TƯ DUY CODE.<br/>
            LÀM CHỦ THUẬT TOÁN.<br/>
            <span class="hodl-headline-neon">TƯƠNG LAI SỐ.</span>
          </h1>

          <div class="hodl-tagline">
            <span class="hodl-line"></span>
            <span>Nền tảng học lập trình trực quan cho học sinh Việt Nam.</span>
          </div>

          <p class="hodl-desc">
            Trình biên dịch Python, HTML/CSS, C, C++ trực tiếp trên trình duyệt, đồng bộ khối lệnh Scratch 3.0 theo thời gian thực và lớp học số đám mây — hoạt động mượt mà cả Online lẫn Offline.
          </p>

          <div class="hodl-cta-row">
            <button type="button" class="hodl-btn-primary hodl-magnetic" onclick="switchView('workspace')">
              <span>MỞ IDE THỰC HÀNH</span>
              <span class="hodl-arrow">&rarr;</span>
            </button>
            <button type="button" class="hodl-btn-secondary hodl-magnetic" onclick="switchView('classroom')">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>
              <span>VÀO LỚP HỌC SỐ</span>
            </button>
          </div>

          <div class="hodl-rating-row">
            <span class="hodl-stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span>
            <strong>250+ bài học</strong>
            <span>• 5 ngôn ngữ cốt lõi • 100 chặng thử thách</span>
          </div>

          <div class="hodl-trust-pills">
            <span class="hodl-pill" onclick="switchView('workspace')">IDE hỗ trợ Tab &amp; input()</span>
            <span class="hodl-pill" onclick="switchView('workspace')">Scratch 3.0 Live</span>
            <span class="hodl-pill" onclick="switchView('classroom')">Đồng bộ Cloud Firestore</span>
            <span class="hodl-pill" onclick="switchView('challenges')">100 Bài tập HSG</span>
          </div>
        </div>

        <!-- CỘT PHẢI: 3 BỆ ĐỠ 3D PHÁT SÁNG + 3 THẺ TƯƠNG TÁC THEO CHUỘT -->
        <div class="hodl-hero-right">
          <div class="hodl-stage-3d">
            <div class="hodl-podium-unit unit-left" onclick="switchView('workspace')">
              <div class="hodl-float-card card-scratch hodl-tilt-card">
                <div class="hc-top">SCRATCH LIVE</div>
                <div class="hc-sc-b1">Nếu <code>x &gt; 0</code> thì</div>
                <div class="hc-sc-b2">In <code>"Hợp lệ"</code></div>
                <div class="hc-foot">ĐỒNG BỘ TỨC THÌ</div>
              </div>
              <div class="hodl-pedestal"></div>
            </div>

            <div class="hodl-podium-unit unit-center" onclick="switchView('workspace')">
              <div class="hodl-float-card card-main hodl-tilt-card">
                <div class="hc-badge">V-CODE ENGINE v17</div>
                <div class="hc-logo-mark">V</div>
                <div class="hc-title">V-CODE IDE</div>
                <pre class="hc-mini-code">n = int(input())
for i in range(n):
    print(i * i)</pre>
                <div class="hc-foot">PYTHON • C • C++ • HTML</div>
              </div>
              <div class="hodl-pedestal ped-main"></div>
            </div>

            <div class="hodl-podium-unit unit-right" onclick="switchView('classroom')">
              <div class="hodl-float-card card-class hodl-tilt-card">
                <div class="hc-top">CLOUD CLASSROOM</div>
                <div class="hc-stat-big">100%</div>
                <div class="hc-stat-sub">Chấm Test tự động &amp; Lưu đám mây</div>
                <div class="hc-foot">GIÁO VIÊN • HỌC SINH</div>
              </div>
              <div class="hodl-pedestal"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- PHÂN CẢNH 02: CÁC PHÂN HỆ CHÍNH -->
      <div class="hodl-section hodl-reveal">
        <div class="hodl-sec-head">
          <span class="hodl-sec-kicker">01 / HỆ SINH THÁI TOÀN DIỆN</span>
          <h2>Mọi công cụ cần thiết trong một nền tảng duy nhất</h2>
        </div>
        <div class="hodl-grid-4">
          <div class="hodl-feature-card hodl-tilt-card" onclick="switchView('learning')">
            <div class="hf-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            </div>
            <h3>250+ Bài học Bài bản</h3>
            <p>Giáo trình Python, Python Tiếng Việt, HTML/CSS, C và C++ bám sát chương trình THCS &amp; THPT.</p>
            <span class="hf-link">Vào Khóa học &rarr;</span>
          </div>

          <div class="hodl-feature-card hodl-tilt-card" onclick="switchView('workspace')">
            <div class="hf-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
            </div>
            <h3>IDE &amp; Scratch Live</h3>
            <p>Gõ lệnh hỗ trợ Tab, tự thụt lề sau <code>if/for/while</code>, nhập <code>input()</code> trực tiếp và xem khối Scratch ngay.</p>
            <span class="hf-link">Mở IDE ngay &rarr;</span>
          </div>

          <div class="hodl-feature-card hodl-tilt-card" onclick="switchView('classroom')">
            <div class="hf-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18"/><path d="M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/></svg>
            </div>
            <h3>Lớp học Số Cloud</h3>
            <p>Tạo lớp học trong 5 giây, quản lý bằng menu gọn gàng, giao bài tập và đồng bộ học sinh qua Firebase.</p>
            <span class="hf-link">Vào Lớp học &rarr;</span>
          </div>

          <div class="hodl-feature-card hodl-tilt-card" onclick="switchView('challenges')">
            <div class="hf-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            </div>
            <h3>100 Thử thách Phân hạng</h3>
            <p>Kho 100 bài thuật toán thực chiến phân hạng từ cơ bản đến bồi dưỡng Học sinh giỏi.</p>
            <span class="hf-link">Chinh phục &rarr;</span>
          </div>
        </div>
      </div>

      <!-- PHÂN CẢNH 03: QUY TRÌNH HỌC & DẠY -->
      <div class="hodl-section hodl-reveal">
        <div class="hodl-sec-head">
          <span class="hodl-sec-kicker">02 / HIỆU SUẤT &amp; ĐỘ TIN CẬY</span>
          <h2>Vận hành mượt mà trên Máy tính &amp; Điện thoại</h2>
        </div>
        <div class="hodl-grid-3">
          <div class="hodl-step-card hodl-tilt-card">
            <span class="hs-num">01</span>
            <h4>Không cần cài đặt phức tạp</h4>
            <p>Mở trình duyệt là lập trình ngay. Chạy mượt 60fps trên máy tính phòng tin học lẫn điện thoại cá nhân.</p>
          </div>
          <div class="hodl-step-card hodl-tilt-card">
            <span class="hs-num">02</span>
            <h4>Tư duy trực quan bằng khối</h4>
            <p>Mỗi câu lệnh điều kiện, vòng lặp và nhập xuất đều tự động ánh xạ sang khối Scratch 3.0 chuẩn xác.</p>
          </div>
          <div class="hodl-step-card hodl-tilt-card">
            <span class="hs-num">03</span>
            <h4>Online Cloud &amp; Offline dự phòng</h4>
            <p>Dữ liệu lớp học lưu trữ trên Firebase Firestore và tự động duy trì hoạt động khi mạng không ổn định.</p>
          </div>
        </div>
      </div>
"""

HODL_V17_CSS = """
/* ==================== V17.0: HODL.SWISS 3D AESTHETIC FOR V-CODE EDU ==================== */
.hodl-vcode-root {
  position: relative;
  overflow: hidden;
  padding: 20px 24px 88px !important;
  background: radial-gradient(circle at 65% 20%, rgba(168, 85, 247, 0.14), transparent 50%),
              radial-gradient(circle at 20% 80%, rgba(217, 70, 239, 0.08), transparent 45%),
              #06040D;
  color: #F8FAFC;
  min-height: calc(100vh - 64px);
}
body.light-theme .hodl-vcode-root {
  background: radial-gradient(circle at 65% 20%, rgba(124, 58, 237, 0.09), transparent 50%), #F8FAFC;
  color: #0F172A;
}

.hodl-cursor-glow {
  position: fixed; top: 0; left: 0; width: 460px; height: 460px; border-radius: 50%;
  pointer-events: none; z-index: 0; will-change: transform;
  background: radial-gradient(circle, rgba(217, 70, 239, 0.16) 0%, rgba(124, 58, 237, 0.08) 40%, transparent 70%);
}
.hodl-horizon-bg { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.hodl-horizon-arc {
  position: absolute; top: 14%; right: -10%; width: 720px; height: 720px; border-radius: 50%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(217, 70, 239, 0.04) 45%, transparent 70%);
  filter: blur(24px);
}
.hodl-floor-grid {
  position: absolute; left: -10%; right: -10%; bottom: -120px; height: 420px;
  background-image:
    linear-gradient(to right, rgba(192, 132, 252, 0.11) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(192, 132, 252, 0.11) 1px, transparent 1px);
  background-size: 56px 56px;
  transform: perspective(520px) rotateX(64deg);
  mask-image: linear-gradient(to top, rgba(0,0,0,0.85), transparent 85%);
}

.hodl-reveal {
  position: relative; z-index: 1; max-width: 1240px; margin: 0 auto;
  opacity: 0; transform: translateY(20px);
  transition: opacity 0.65s cubic-bezier(0.22, 1, 0.36, 1), transform 0.65s cubic-bezier(0.22, 1, 0.36, 1);
}
.hodl-reveal.is-visible { opacity: 1; transform: translateY(0); }

.hodl-hero { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 40px; align-items: center; padding: 34px 0 64px; }
.hodl-eyebrow {
  display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px;
  background: rgba(168, 85, 247, 0.1); border: 1px solid rgba(192, 132, 252, 0.28);
  font-family: 'JetBrains Mono', monospace; font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em; color: #E879F9; margin-bottom: 22px;
}
.hodl-eyebrow-dot { width: 7px; height: 7px; border-radius: 50%; background: #E879F9; box-shadow: 0 0 10px #E879F9; }

.hodl-headline { font-size: clamp(34px, 4.6vw, 58px); line-height: 1.04; font-weight: 900; letter-spacing: -0.03em; margin: 0 0 18px; text-transform: uppercase; }
.hodl-headline-neon { background: linear-gradient(90deg, #E879F9 0%, #A855F7 55%, #38BDF8 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
.hodl-tagline { display: flex; align-items: center; gap: 12px; font-size: 15px; font-weight: 600; color: #E2E8F0; margin-bottom: 14px; }
body.light-theme .hodl-tagline { color: #1E293B; }
.hodl-line { width: 32px; height: 1.5px; background: #C084FC; display: inline-block; }

.hodl-desc { font-size: 15px; line-height: 1.65; color: #94A3B8; max-width: 520px; margin-bottom: 26px; }
body.light-theme .hodl-desc { color: #475569; }

.hodl-cta-row { display: flex; gap: 14px; flex-wrap: wrap; margin-bottom: 24px; }
.hodl-btn-primary {
  display: inline-flex; align-items: center; gap: 10px; padding: 13px 24px; border-radius: 999px; border: none; cursor: pointer;
  background: linear-gradient(90deg, #C026D3 0%, #9333EA 100%); color: #FFFFFF; font-weight: 800; font-size: 13px; letter-spacing: 0.04em;
  box-shadow: 0 10px 28px rgba(192, 38, 211, 0.38); transition: transform 0.18s ease, box-shadow 0.2s ease;
}
.hodl-btn-primary:hover { box-shadow: 0 14px 36px rgba(217, 70, 239, 0.55); }
.hodl-btn-secondary {
  display: inline-flex; align-items: center; gap: 9px; padding: 13px 22px; border-radius: 999px; cursor: pointer;
  background: rgba(255, 255, 255, 0.04); color: #F8FAFC; border: 1px solid rgba(255, 255, 255, 0.18);
  font-weight: 700; font-size: 13px; letter-spacing: 0.03em; transition: border-color 0.2s ease, background 0.2s ease, transform 0.18s ease;
}
.hodl-btn-secondary:hover { border-color: #D946EF; background: rgba(217, 70, 239, 0.1); }
body.light-theme .hodl-btn-secondary { color: #0F172A; border-color: #CBD5E1; background: #FFFFFF; }

.hodl-rating-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; color: #94A3B8; margin-bottom: 18px; }
.hodl-stars { color: #E879F9; letter-spacing: 2px; font-size: 14px; }
.hodl-rating-row strong { color: #F8FAFC; }
body.light-theme .hodl-rating-row strong { color: #0F172A; }

.hodl-trust-pills { display: flex; flex-wrap: wrap; gap: 8px; }
.hodl-pill {
  font-size: 11.5px; color: #CBD5E1; padding: 6px 12px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(148, 163, 184, 0.2);
  cursor: pointer; transition: border-color 0.2s, color 0.2s;
}
.hodl-pill:hover { border-color: #D946EF; color: #FFFFFF; }
body.light-theme .hodl-pill { color: #334155; background: #FFFFFF; }

.hodl-stage-3d { position: relative; display: grid; grid-template-columns: 1fr 1.25fr 1fr; gap: 14px; align-items: end; padding: 24px 6px 10px; }
.hodl-podium-unit { display: flex; flex-direction: column; align-items: center; cursor: pointer; }
.hodl-float-card {
  position: relative; width: 100%; border-radius: 14px; padding: 16px 14px;
  background: linear-gradient(155deg, rgba(30, 22, 52, 0.92), rgba(11, 8, 22, 0.96));
  border: 1px solid rgba(217, 70, 239, 0.32); box-shadow: 0 20px 44px rgba(0, 0, 0, 0.55);
  color: #F8FAFC; transform-style: preserve-3d; transition: transform 0.2s ease-out, border-color 0.25s ease;
  animation: hodlFloat 5.2s ease-in-out infinite;
}
.unit-left .hodl-float-card { animation-delay: 0s; }
.unit-center .hodl-float-card { animation-delay: 0.9s; padding: 22px 16px; border-color: rgba(232, 121, 249, 0.55); background: linear-gradient(155deg, rgba(46, 26, 78, 0.95), rgba(13, 9, 28, 0.98)); }
.unit-right .hodl-float-card { animation-delay: 1.7s; }
@keyframes hodlFloat { 0%, 100% { translate: 0 0; } 50% { translate: 0 -8px; } }

.hodl-tilt-card::after {
  content: ""; position: absolute; inset: 0; border-radius: inherit; pointer-events: none;
  background: radial-gradient(300px circle at var(--mx, 50%) var(--my, 50%), rgba(232, 121, 249, 0.16), transparent 60%);
  opacity: 0; transition: opacity 0.25s;
}
.hodl-tilt-card:hover::after { opacity: 1; }
.hodl-tilt-card:hover { border-color: #E879F9; }

.hc-top, .hc-badge { font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: 0.08em; color: #E879F9; margin-bottom: 10px; font-weight: 700; }
.hc-logo-mark { width: 44px; height: 44px; border-radius: 12px; margin-bottom: 10px; display: grid; place-items: center; font-weight: 900; font-size: 22px; background: linear-gradient(135deg, #D946EF, #7C3AED); color: #FFF; box-shadow: 0 8px 20px rgba(217, 70, 239, 0.4); }
.hc-title { font-size: 16px; font-weight: 800; letter-spacing: 0.02em; margin-bottom: 8px; }
.hc-mini-code { margin: 0 0 10px; padding: 8px 10px; border-radius: 8px; background: rgba(0, 0, 0, 0.42); font-family: 'JetBrains Mono', monospace; font-size: 11px; line-height: 1.5; color: #34D399; overflow: hidden; }
.hc-sc-b1 { background: #D97706; color: #FFF; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-bottom: 6px; }
.hc-sc-b2 { background: #7C3AED; color: #FFF; padding: 5px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; margin-left: 10px; margin-bottom: 10px; }
.hc-stat-big { font-family: 'JetBrains Mono', monospace; font-size: 28px; font-weight: 900; color: #38BDF8; margin-bottom: 4px; }
.hc-stat-sub { font-size: 11.5px; color: #CBD5E1; line-height: 1.45; margin-bottom: 10px; }
.hc-foot { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #94A3B8; letter-spacing: 0.08em; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 8px; }

.hodl-pedestal {
  width: 84%; height: 22px; margin-top: 14px; border-radius: 50%;
  background: radial-gradient(ellipse at center, rgba(25, 16, 44, 0.95) 45%, rgba(217, 70, 239, 0.55) 100%);
  box-shadow: 0 12px 26px rgba(192, 38, 211, 0.35), inset 0 2px 6px rgba(255,255,255,0.2);
  border: 1px solid rgba(232, 121, 249, 0.4);
}
.hodl-pedestal.ped-main { width: 92%; height: 28px; box-shadow: 0 14px 36px rgba(217, 70, 239, 0.5); }

.hodl-section { padding: 48px 0 12px; border-top: 1px solid rgba(148, 163, 184, 0.12); margin-top: 24px; }
.hodl-sec-head { margin-bottom: 24px; }
.hodl-sec-kicker { font-family: 'JetBrains Mono', monospace; font-size: 11px; letter-spacing: 0.12em; color: #E879F9; display: block; margin-bottom: 6px; font-weight: 700; }
.hodl-sec-head h2 { font-size: clamp(22px, 2.8vw, 32px); letter-spacing: -0.02em; margin: 0; }

.hodl-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.hodl-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.hodl-feature-card, .hodl-step-card { position: relative; padding: 22px; border-radius: 16px; cursor: pointer; background: rgba(17, 13, 32, 0.85); border: 1px solid rgba(192, 132, 252, 0.18); transition: transform 0.2s ease-out, border-color 0.2s ease; }
body.light-theme .hodl-feature-card, body.light-theme .hodl-step-card { background: #FFFFFF; border-color: #E2E8F0; }
.hf-icon { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; background: rgba(217, 70, 239, 0.12); color: #E879F9; border: 1px solid rgba(217, 70, 239, 0.28); margin-bottom: 14px; }
.hodl-feature-card h3, .hodl-step-card h4 { font-size: 16px; margin: 0 0 8px; }
.hodl-feature-card p, .hodl-step-card p { font-size: 13px; color: #94A3B8; line-height: 1.6; margin: 0; }
.hf-link { display: inline-block; margin-top: 14px; font-size: 12.5px; font-weight: 700; color: #E879F9; }
.hs-num { font-family: 'JetBrains Mono', monospace; font-size: 24px; font-weight: 900; color: rgba(232, 121, 249, 0.45); display: block; margin-bottom: 8px; }

@media (max-width: 1024px) {
  .hodl-hero { grid-template-columns: 1fr; padding: 18px 0 36px; gap: 32px; }
  .hodl-grid-4 { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 720px) {
  .hodl-stage-3d { grid-template-columns: 1fr; gap: 18px; }
  .hodl-pedestal { display: none; }
  .hodl-grid-4, .hodl-grid-3 { grid-template-columns: 1fr; }
  .hodl-cursor-glow { display: none !important; }
}
"""

V17_ANIM_JS = """
// V17.0: HODL.SWISS MOUSE ANIMATION + AUTO-FIND SCRATCH LIVE CONTAINER
(function () {
  function findScratchContainer() {
    const ids = ['scratch-blocks-view', 'scratch-blocks-container', 'scratch-canvas', 'scratch-stage', 'scratch-live-content', 'scratch-output', 'scratch-preview'];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return document.querySelector('[id*="scratch"][id*="block"], [id*="scratch"][id*="view"], [id*="scratch"][id*="canvas"], .scratch-workspace, .scratch-canvas');
  }

  window.addEventListener('DOMContentLoaded', () => {
    const ed = document.getElementById('code-editor');
    const scBox = findScratchContainer();
    if (ed && scBox && window.VCodeScratchBridge) {
      const syncNow = () => window.VCodeScratchBridge.render(ed.value, scBox);
      ed.addEventListener('input', syncNow);
      ed.addEventListener('keyup', syncNow);
      setTimeout(syncNow, 150);
    }

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-visible'); obs.unobserve(en.target); } });
    }, { threshold: 0.08 });
    document.querySelectorAll('.hodl-reveal').forEach((el) => obs.observe(el));

    if (window.matchMedia('(pointer: coarse)').matches) return;

    const glow = document.getElementById('hodl-cursor-glow');
    let mx = window.innerWidth / 2, my = window.innerHeight / 2, gx = mx, gy = my;
    if (glow) {
      window.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; }, { passive: true });
      const loop = () => {
        gx += (mx - gx) * 0.14; gy += (my - gy) * 0.14;
        glow.style.transform = `translate3d(${gx - 230}px, ${gy - 230}px, 0)`;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }

    document.querySelectorAll('.hodl-tilt-card').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.transform = `perspective(900px) rotateX(${((0.5 - y) * 11).toFixed(2)}deg) rotateY(${((x - 0.5) * 13).toFixed(2)}deg) translateY(-4px)`;
        card.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
      }, { passive: true });
      card.addEventListener('mouseleave', () => { card.style.transform = 'perspective(900px) rotateX(0deg) rotateY(0deg) translateY(0)'; });
    });

    document.querySelectorAll('.hodl-magnetic').forEach((btn) => {
      btn.addEventListener('mousemove', (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.transform = `translate3d(${((e.clientX - (r.left + r.width / 2)) * 0.18).toFixed(1)}px, ${((e.clientY - (r.top + r.height / 2)) * 0.18).toFixed(1)}px, 0)`;
      }, { passive: true });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'translate3d(0, 0, 0)'; });
    });
  });
})();
"""

def apply_v17():
    for js_path in ["js/app.js", "js/ai-tutor.js"]:
        if os.path.exists(js_path):
            raw = open(js_path, "r", encoding="utf-8").read()
            cleaned = clean_broken_svg_in_js(raw)
            with open(js_path, "w", encoding="utf-8") as f:
                f.write(cleaned)
            print(f"✔ Đã vá triệt để lỗi in chữ <svg> trong: {js_path}")

    if os.path.exists("js/v16-core.js"):
        v16 = open("js/v16-core.js", "r", encoding="utf-8").read()
        if "V17.0: HODL.SWISS MOUSE ANIMATION" not in v16:
            with open("js/v16-core.js", "w", encoding="utf-8") as f:
                f.write(v16.rstrip() + "\n" + V17_ANIM_JS.strip() + "\n")
            print("✔ Đã gắn animation chuột HODL.swiss & auto-finder Scratch Live vào js/v16-core.js")

    css_path = "css/design-system.css"
    if os.path.exists(css_path):
        css = open(css_path, "r", encoding="utf-8").read()
        marker = "/* ==================== V17.0: HODL.SWISS 3D"
        if marker in css:
            css = css.split(marker)[0].rstrip()
        with open(css_path, "w", encoding="utf-8") as f:
            f.write(css + "\n\n" + HODL_V17_CSS.strip() + "\n")
        print("✔ Đã cập nhật giao diện HODL.swiss 3D trong css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = clean_broken_svg_in_html_attrs(html)
        html = html.replace("v16.0", "v17.0").replace("v15.0", "v17.0")

        html, ok, matched_tag = find_and_replace_home_view(html, HODL_VCODE_HOME_INNER.strip())
        if ok:
            print(f"✔ ĐÃ THAY THẾ THÀNH CÔNG Trang chủ phong cách HODL.swiss 3D (khớp thẻ: {matched_tag})")
        else:
            print("⚠ Vẫn chưa khớp thẻ Trang chủ. Hãy gửi 20 dòng quanh chữ 'Khơi mở tư duy' trong index.html.")

        with open("index.html", "w", encoding="utf-8") as f:
            f.write(html)
        print("✔ Đã lưu index.html sạch lỗi")

    print("\nHOÀN TẤT NÂNG CẤP V-CODE EDU v17.0!")

if __name__ == "__main__":
    apply_v17()
    