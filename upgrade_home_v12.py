# -*- coding: utf-8 -*-
"""
V-CODE EDU v12.0 — NÂNG CẤP TRANG CHỦ ĐẦY ĐẶN, CHUYÊN NGHIỆP & LOGO LỚN NỔI BẬT
1. Đưa Logo V-Code Edu cỡ lớn sắc nét kèm vòng hào quang 3D & các thẻ công nghệ vệ tinh vào Trang chủ.
2. Thay tiêu đề & mô tả cũ bằng thông điệp giáo dục ý nghĩa, tầm vóc hơn về hệ sinh thái V-Code Edu.
3. Bổ sung nền lưới công nghệ tinh tế, thanh thẻ ngôn ngữ hỗ trợ và dải 4 thẻ điểm nhấn tính năng.
"""
import os

V12_HOME_CSS = """
/* ==================== V12.0: RICH HOMEPAGE HERO WITH LARGE LOGO SHOWCASE ==================== */
#home-chapter-0 {
  min-height: calc(100vh - 62px);
  padding-top: 36px;
  padding-bottom: 44px;
  grid-template-columns: 1.12fr 0.88fr;
  gap: 44px;
}

.hero-bg-grid {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  background-image:
    linear-gradient(to right, rgba(16, 185, 129, 0.045) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(16, 185, 129, 0.045) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(circle at 50% 40%, black 35%, transparent 85%);
  -webkit-mask-image: radial-gradient(circle at 50% 40%, black 35%, transparent 85%);
}

.hero-lang-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 22px;
}
.hero-lang-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 999px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
}

.hero-logo-stage {
  position: relative;
  padding: 30px 24px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: radial-gradient(circle at 50% 35%, rgba(16, 185, 129, 0.18), transparent 62%),
              var(--bg-surface);
  border: 1px solid var(--border-highlight);
}

.hero-logo-orb-wrap {
  position: relative;
  width: 220px;
  height: 220px;
  display: grid;
  place-items: center;
  margin: 8px auto 18px;
}

.hero-logo-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px dashed rgba(16, 185, 129, 0.45);
  animation: heroSpinSlow 24s linear infinite;
}
.hero-logo-ring.ring-2 {
  inset: -14px;
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-top-color: var(--accent-blue);
  animation: heroSpinSlow 16s linear infinite reverse;
}
@keyframes heroSpinSlow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.hero-logo-big-frame {
  width: 168px;
  height: 168px;
  border-radius: 34px;
  background: #FFFFFF;
  padding: 14px;
  display: grid;
  place-items: center;
  box-shadow: 0 18px 48px rgba(16, 185, 129, 0.30), 0 0 0 4px rgba(16, 185, 129, 0.16);
  position: relative;
  z-index: 2;
  animation: heroFloatLogo 4.5s ease-in-out infinite;
}
@keyframes heroFloatLogo {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
}
.hero-logo-big-frame img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.hero-float-chip {
  position: absolute;
  z-index: 3;
  padding: 6px 12px;
  border-radius: 10px;
  background: var(--bg-glass);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border-strong);
  font-size: 11.5px;
  font-weight: 700;
  color: var(--text-primary);
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
  white-space: nowrap;
}
.hero-float-chip.c1 { top: 10px; left: -12px; border-color: rgba(16, 185, 129, 0.55); }
.hero-float-chip.c2 { top: 20px; right: -14px; border-color: rgba(59, 130, 246, 0.55); }
.hero-float-chip.c3 { bottom: 18px; left: -18px; border-color: rgba(245, 158, 11, 0.55); }
.hero-float-chip.c4 { bottom: 10px; right: -14px; border-color: rgba(139, 92, 246, 0.55); }

.hero-showcase-caption {
  text-align: center;
  margin-bottom: 16px;
}
.hero-showcase-caption strong {
  display: block;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: -0.02em;
  margin-bottom: 3px;
}
.hero-showcase-caption span {
  font-size: 12.5px;
  color: var(--text-secondary);
}

.hero-mini-pillars {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--border-subtle);
}
.hero-mini-pillar {
  background: var(--bg-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 10px;
  text-align: center;
}
.hero-mini-pillar strong {
  display: block;
  font-size: 14px;
  color: var(--accent-emerald);
  font-family: 'JetBrains Mono', monospace;
}
.hero-mini-pillar span {
  font-size: 11px;
  color: var(--text-secondary);
}

.hero-highlight-strip {
  position: relative;
  z-index: 2;
  max-width: 1260px;
  margin: -18px auto 30px;
  padding: 0 24px;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
.hero-highlight-item {
  background: var(--bg-glass);
  backdrop-filter: blur(14px);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: var(--shadow-card);
  transition: transform 0.2s ease, border-color 0.2s ease;
}
.hero-highlight-item:hover {
  transform: translateY(-3px);
  border-color: var(--border-highlight);
}
.hero-highlight-ico {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--accent-emerald-glow);
  display: grid;
  place-items: center;
  font-size: 18px;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  #home-chapter-0 { grid-template-columns: 1fr; }
  .hero-highlight-strip { grid-template-columns: repeat(2, 1fr); margin-top: 10px; }
}
@media (max-width: 600px) {
  .hero-highlight-strip { grid-template-columns: 1fr; }
  .hero-float-chip { display: none; }
}
"""

NEW_CHAPTER_0_HTML = """    <div class="hero-bg-grid" aria-hidden="true"></div>

    <!-- CHƯƠNG 1: HERO LOGO LỚN & THÔNG ĐIỆP GIÁO DỤC V-CODE EDU -->
    <section id="home-chapter-0" class="scroll-chapter">
      <div class="hero-copy-block">
        <div class="eyebrow-badge"><span>●</span><span>V-Code Edu • Hệ sinh thái Giáo dục Lập trình Việt Nam</span></div>
        <h1 class="hero-title">
          Khơi mở <span class="hl">tư duy lập trình</span> cho thế hệ trẻ Việt Nam.
        </h1>
        <p class="hero-subtitle">
          Hệ sinh thái học tập công nghệ toàn diện kết hợp lộ trình <strong>250+ bài học chuẩn hóa</strong>, phòng thực hành đa ngôn ngữ, lớp học trực tuyến theo dõi thời gian thực và trợ lý AI sư phạm — đồng hành cùng giáo viên và học sinh trên mọi hành trình chinh phục tri thức số.
        </p>

        <div class="hero-lang-pills">
          <span class="hero-lang-pill">🐍 Python 3</span>
          <span class="hero-lang-pill">🇻🇳 Python Tiếng Việt</span>
          <span class="hero-lang-pill">🌐 HTML5 &amp; CSS3</span>
          <span class="hero-lang-pill">⚙️ Ngôn ngữ C</span>
          <span class="hero-lang-pill">⚡ C++ HSG</span>
          <span class="hero-lang-pill">🗄️ SQL / MySQL</span>
        </div>

        <div class="hero-cta-row">
          <button class="btn btn-primary" onclick="switchView('learning')">📚 Khám phá 250+ Bài học →</button>
          <button class="btn btn-blue" onclick="switchView('classroom')">🏫 Vào Lớp học Trực tuyến</button>
          <button class="btn" onclick="scrollToChapter(1)">↓ Khám phá tính năng</button>
        </div>

        <div class="hero-metrics">
          <div class="metric-item"><strong>250+</strong><span>Bài học 5 khóa chuẩn</span></div>
          <div class="metric-item"><strong>8 Ngôn ngữ</strong><span>IDE Thực hành tự do</span></div>
          <div class="metric-item"><strong>50 Chặng</strong><span>Đấu trường Game Quest</span></div>
          <div class="metric-item"><strong>Online/Offline</strong><span>Hoạt động mọi lúc</span></div>
        </div>
      </div>

      <div class="chapter-visual">
        <div class="scroll-3d-stage hero-logo-stage" data-tilt-dir="right">
          <div class="hero-logo-orb-wrap">
            <div class="hero-logo-ring"></div>
            <div class="hero-logo-ring ring-2"></div>
            <div class="hero-logo-big-frame">
              <img src="assets/logo.jpg" alt="Logo V-Code Edu" onerror="this.outerHTML='<div style=font-size:64px;font-weight:800;color:#059669>V</div>'" />
            </div>
            <div class="hero-float-chip c1">🧩 Scratch Live</div>
            <div class="hero-float-chip c2">🤖 AI Sư phạm</div>
            <div class="hero-float-chip c3">🏫 Lớp học OLM</div>
            <div class="hero-float-chip c4">🎮 50 Chặng Game</div>
          </div>

          <div class="hero-showcase-caption">
            <strong>V-Code Edu Platform</strong>
            <span>Từ kéo-thả trực quan đến thuật toán chuyên sâu • THCS &amp; THPT Hòa Phú</span>
          </div>

          <div class="hero-mini-pillars">
            <div class="hero-mini-pillar">
              <strong>Live Sync</strong>
              <span>Python ↔ Scratch</span>
            </div>
            <div class="hero-mini-pillar">
              <strong>Auto-Grade</strong>
              <span>Chấm Test tự động</span>
            </div>
            <div class="hero-mini-pillar">
              <strong>Real-Time</strong>
              <span>Giám sát lớp học</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Dải thẻ nổi bật giúp trang chủ đầy đặn & rõ giá trị ngay từ màn hình đầu -->
    <div class="hero-highlight-strip">
      <div class="hero-highlight-item">
        <div class="hero-highlight-ico">📖</div>
        <div>
          <strong style="font-size:13.5px;display:block;margin-bottom:2px">Lộ trình Bài bản</strong>
          <span style="font-size:12px;color:var(--text-secondary)">5 khóa học (50 bài/khóa) từ cơ bản đến luyện thi HSG.</span>
        </div>
      </div>
      <div class="hero-highlight-item">
        <div class="hero-highlight-ico">💻</div>
        <div>
          <strong style="font-size:13.5px;display:block;margin-bottom:2px">IDE Đa ngôn ngữ</strong>
          <span style="font-size:12px;color:var(--text-secondary)">Hỗ trợ 8 ngôn ngữ kèm cầu nối Scratch 3.0 trực tiếp.</span>
        </div>
      </div>
      <div class="hero-highlight-item">
        <div class="hero-highlight-ico">🏫</div>
        <div>
          <strong style="font-size:13.5px;display:block;margin-bottom:2px">Lớp học Chuẩn OLM</strong>
          <span style="font-size:12px;color:var(--text-secondary)">Giao bài, làm bài trên IDE riêng và chấm điểm trả về ngay.</span>
        </div>
      </div>
      <div class="hero-highlight-item">
        <div class="hero-highlight-ico">🤖</div>
        <div>
          <strong style="font-size:13.5px;display:block;margin-bottom:2px">Trợ lý AI 24/7</strong>
          <span style="font-size:12px;color:var(--text-secondary)">Giải thích lỗi Tiếng Việt thông minh cả Online lẫn Offline.</span>
        </div>
      </div>
    </div>"""

def apply_v12():
    css_path = "css/design-system.css"
    old_css = open(css_path, "r", encoding="utf-8").read() if os.path.exists(css_path) else ""
    marker = "/* ==================== V12.0: RICH HOMEPAGE HERO WITH LARGE LOGO SHOWCASE ==================== */"
    if marker in old_css:
        old_css = old_css.split(marker)[0].rstrip()
    with open(css_path, "w", encoding="utf-8") as f:
        f.write(old_css + "\n\n" + V12_HOME_CSS.strip() + "\n")
    print("✔ Đã cập nhật CSS Trang chủ Logo lớn & Chi tiết đầy đặn: css/design-system.css")

    if os.path.exists("index.html"):
        html = open("index.html", "r", encoding="utf-8").read()
        html = html.replace("v11.0", "v12.0")

        ch0_start = html.find('<!-- CHƯƠNG 1')
        ch1_start = html.find('<!-- CHƯƠNG 2')
        if ch0_start != -1 and ch1_start != -1:
            html = html[:ch0_start] + NEW_CHAPTER_0_HTML.strip() + "\n\n    " + html[ch1_start:]
            with open("index.html", "w", encoding="utf-8") as f:
                f.write(html)
            print("✔ Đã nâng cấp Trang chủ (Logo lớn + Thông điệp mới + Dải tính năng): index.html")
        else:
            print("⚠ Không tìm thấy điểm chèn CHƯƠNG 1 / CHƯƠNG 2 trong index.html")

    print("\n🎉 HOÀN TẤT NÂNG CẤP TRANG CHỦ V-CODE EDU v12.0! Bấm Ctrl + Shift + R trên trình duyệt ngay!")

if __name__ == "__main__":
    apply_v12()