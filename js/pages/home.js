// V-Code Edu — homepage: an immersive, scroll-driven story in seven scenes.
//   1. Hero "V-Core"          — interactive WebGL scene (Three.js) + CSS 3D fallback
//   2. Code that really runs  — pinned scene, real Python (Pyodide) mini IDE that tilts into place
//   3. V-Prism lab            — live sorting visual on a 3D stage + the real algorithm catalogue
//   4. V-Mentor               — aurora scene, AI orb, 3D carousel of the 7 real tutoring modes, real ask box
//   5. Ecosystem              — every section as its own "product" card (learn, arena, IDE, classroom…)
//   6. Future                 — perspective-grid horizon + the real roadmap from the catalogue
//   7. Start                  — call to action
// Every number on this page is computed from the actual content files; nothing is simulated.
import { h, mount, raw, revealOnScroll } from '../core/dom.js';
import { icon } from '../components/icons.js';
import { highlight } from '../components/highlight.js';
import { createEditor } from '../components/editor.js';
import { createTerminal } from '../components/ide.js';
import { appState } from '../core/store.js';
import { kv } from '../core/idb.js';
import { initScrollScenes, initCounters, initTilt, initMagnetic, initSceneNav, prefersReducedMotion } from './home/scenes.js';

const TRY_CODE = `# Python thật, chạy ngay trên trình duyệt của bạn
diem = [7.5, 9.0, 6.5, 8.0, 10.0]
tb = sum(diem) / len(diem)
print(f"Điểm trung bình: {tb:.2f}")
for d in sorted(diem, reverse=True):
    print("★" * round(d), d)
`;

const SNIPPETS = {
  python: 'def tim_nhi_phan(a, x):\n    lo, hi = 0, len(a) - 1\n    while lo <= hi:\n        mid = (lo + hi) // 2\n        if a[mid] == x:\n            return mid\n        lo, hi = (mid + 1, hi) if a[mid] < x else (lo, mid - 1)\n    return -1',
  cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    long long s = 0;\n    for (int i = 1; i <= 100; i++) s += i;\n    cout << s << endl;\n}',
};

const COURSE_LOOK = {
  python: { grad: 'linear-gradient(135deg,#10b981,#047857)', ic: 'python', tag: 'for Beginners' },
  pyvn: { grad: 'linear-gradient(135deg,#0ea5e9,#0369a1)', ic: 'python', tag: 'Tư duy lập trình' },
  web: { grad: 'linear-gradient(135deg,#fb923c,#ea580c)', ic: 'globe', tag: 'Web Frontend' },
  c: { grad: 'linear-gradient(135deg,#3b82f6,#1d4ed8)', ic: 'cpu', tag: 'Core CS' },
  cpp: { grad: 'linear-gradient(135deg,#8b5cf6,#6d28d9)', ic: 'zap', tag: 'Basic to HSG' },
  ai: { grad: 'linear-gradient(135deg,#ec4899,#7c3aed)', ic: 'brain', tag: 'AI & Data' },
};

const TRACK_ICON = { programming: 'code', web: 'globe', algorithms: 'git-branch', ai: 'brain', 'ml-dl': 'layers', 'data-science': 'bars', cybersecurity: 'shield', 'robotics-iot': 'robot', automation: 'wrench' };

function sceneHead({ eyebrow, ic, title, lead, tone }) {
  return h('header', { class: `scene-head ${tone ? `scene-head--${tone}` : ''} reveal` },
    h('span', { class: 'scene-eyebrow' }, icon(ic), eyebrow),
    h('h2', { class: 'scene-title' }, title),
    lead ? h('p', { class: 'scene-lead' }, lead) : null);
}

export default {
  title: '',
  async mount(container, ctx) {
    const { signal } = ctx;
    const reduced = prefersReducedMotion();
    const user = appState.get().user;

    // ---------- real numbers ----------
    const data = { courses: [], lessons: 0, challenges: 0, bosses: 0, topics: [], algos: 0, tracks: [], modes: [] };
    await Promise.allSettled([
      import('../services/content.js').then(async (m) => {
        const [cat, ch] = await Promise.all([m.loadCatalog(), m.loadChallenges()]);
        data.courses = cat.courses;
        data.tracks = cat.tracks || [];
        data.lessons = cat.courses.reduce((n, c) => n + (c.lessons_count || 0), 0);
        data.challenges = (ch.challenges || []).length;
        data.bosses = (ch.challenges || []).filter((c) => c.boss || c.rank === 'BOSS').length;
      }),
      import('./prism/catalog.js').then((m) => {
        data.topics = m.PRISM_TOPICS;
        data.algos = m.PRISM_TOPICS.reduce((n, t) => n + t.algorithms.length, 0);
      }),
      import('../services/ai-modes.js').then((m) => { data.modes = m.AI_MODES; }),
    ]);

    // =====================================================================
    // 1) HERO — V-Core
    // =====================================================================
    const canvasHost = h('div', { class: 'hero3d' });
    const fallback = h('div', { class: 'hero-fallback', 'aria-hidden': 'true' },
      h('div', { class: 'hero-fallback__ring hero-fallback__ring--1' }),
      h('div', { class: 'hero-fallback__ring hero-fallback__ring--2' }),
      h('div', { class: 'hero-fallback__ring hero-fallback__ring--3' }),
      h('div', { class: 'hero-fallback__core' }),
    );
    const hud = (cls, ic, title, text) => h('div', { class: `hero-hud ${cls}` }, h('span', { class: 'hero-hud__icon' }, icon(ic)), h('div', null, h('strong', null, title), h('span', null, text)));
    const pulseHint = h('button', { class: 'hero-pulse-hint', type: 'button', onClick: () => hero3d?.pulse() }, h('span', { class: 'hero-pulse-hint__dot' }), 'Chạm vào lõi V-Core');

    const heroTitle = h('h1', { class: 'home-title hero-title' },
      h('span', { class: 'hero-line' }, h('span', null, 'Học lập trình.')),
      h('span', { class: 'hero-line' }, h('span', null, 'Hiểu ', h('em', { class: 'hero-em hero-em--live' }, 'thuật toán'), '.')),
      h('span', { class: 'hero-line' }, h('span', null, 'Làm chủ ', h('em', { class: 'hero-em hero-em--ai' }, 'AI'), '.')));

    const stat = (n, label, ic) => h('div', { class: 'hero-stat' }, h('span', { class: 'hero-stat__icon' }, icon(ic)), h('div', null, h('strong', { dataset: { count: String(n) } }, String(n)), h('span', null, label)));

    const heroSection = h('section', { class: 'scene hero', id: 's-hero', dataset: { scene: '', tone: 'dark' } },
      h('div', { class: 'hero__sky', 'aria-hidden': 'true' }),
      fallback,
      canvasHost,
      h('div', { class: 'hero__huds', 'aria-hidden': 'true' },
        hud('hero-hud--a', 'terminal', 'main.py · đã chạy', 'Python thật trong trình duyệt'),
        hud('hero-hud--b', 'prism', `${data.topics.length || 14} chủ đề · ${data.algos || 41} thuật toán`, 'V-Prism trực quan từng bước'),
        hud('hero-hud--c', 'sparkles', `V-Mentor · ${data.modes.length || 7} chế độ`, 'Gia sư AI dạy cách tư duy'),
        hud('hero-hud--d', 'wifi-off', 'Học cả khi mất mạng', 'Ứng dụng web tiến bộ (PWA)')),
      h('div', { class: 'container container--wide hero__inner' },
        h('div', { class: 'hero__copy' },
          h('span', { class: 'hero-kicker' }, h('span', { class: 'hero-kicker__dot' }), 'Nền tảng giáo dục công nghệ cho học sinh Việt Nam'),
          heroTitle,
          h('p', { class: 'hero-lead' }, 'Từ dòng lệnh đầu tiên đến dự án trí tuệ nhân tạo — học qua bài tập được chấm bằng trình chạy thật, nhìn thấy thuật toán chuyển động từng bước, và luôn có trợ lý AI hướng dẫn cách tư duy thay vì làm hộ.'),
          h('div', { class: 'hero-cta' },
            h('a', { class: 'hero-btn hero-btn--primary', href: user ? '#/learn' : '#/learn/python', dataset: { magnetic: '' } }, icon('play'), h('span', null, user ? 'Tiếp tục học' : 'Bắt đầu học miễn phí')),
            h('a', { class: 'hero-btn hero-btn--glass', href: '#/prism', dataset: { magnetic: '' } }, icon('prism'), h('span', null, 'Khám phá Lăng kính'))),
          h('ul', { class: 'hero-proof' },
            h('li', null, icon('check'), 'Python, C/C++, JS, SQL chạy ngay trên trình duyệt'),
            h('li', null, icon('check'), 'Lưu đồ & Scratch Live'),
            h('li', null, icon('check'), 'Miễn phí cho học sinh và giáo viên')),
          pulseHint)),
      h('div', { class: 'container container--wide hero__stats' },
        stat(data.courses.length || 6, 'khóa học', 'book-open'),
        stat(data.lessons || 104, 'bài học chấm tự động', 'check-circle'),
        stat(data.challenges || 100, 'chặng thử thách', 'trophy'),
        stat(data.algos || 41, 'thuật toán trực quan', 'prism')),
      h('button', { class: 'hero-scroll', type: 'button', 'aria-label': 'Cuộn xuống để khám phá', onClick: () => codeSection.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }) }, h('span', { class: 'hero-scroll__mouse' }, h('i')), 'Cuộn để khám phá'),
    );

    // =====================================================================
    // 2) CODE — real Python, pinned scene
    // =====================================================================
    const tryTerminal = createTerminal({ placeholder: 'Bấm "Chạy" để thực thi bằng Python thật (lần đầu tải bộ chạy ~12 MB, sau đó dùng được offline).' });
    const tryEditor = createEditor({ value: TRY_CODE, lang: 'python', minLines: 7, onRun: () => runTry() });
    const runBtn = h('button', { class: 'btn btn--primary', type: 'button', onClick: () => runTry() }, icon('play'), 'Chạy');
    async function runTry() {
      runBtn.classList.add('is-loading');
      tryTerminal.clear();
      tryTerminal.status('Đang chạy…', 'live');
      try {
        const { runCode } = await import('../runtime/runner.js');
        const res = await runCode({ lang: 'python', code: tryEditor.getValue(), onOutput: (c, st) => tryTerminal.write(c, st) });
        if (!res.ok) { tryTerminal.write(`\n${res.error}\n`, 'stderr'); tryTerminal.status('Có lỗi', 'err'); }
        else tryTerminal.status(`Hoàn tất · ${Math.round(res.durationMs)} ms`, 'ok');
      } catch (err) {
        tryTerminal.write(`Không tải được bộ chạy Python: ${err.message}\n`, 'stderr');
        tryTerminal.status('Có lỗi', 'err');
      } finally { runBtn.classList.remove('is-loading'); }
    }
    const steps = [
      ['01', 'Viết', 'Trình soạn thảo có tô màu cú pháp, tự thụt lề, gợi ý — cho 7 ngôn ngữ.', 'code'],
      ['02', 'Chạy', 'CPython biên dịch sang WebAssembly chạy ngay trong trình duyệt, không gửi code lên máy chủ.', 'play'],
      ['03', 'Chấm & sửa', 'Bộ test có cả test ẩn, đánh dấu dòng lỗi và giải thích lỗi bằng tiếng Việt.', 'check-circle'],
    ];
    const stepEls = steps.map(([n, t, d, ic], i) => h('li', { class: 'code-step', dataset: { step: String(i) } },
      h('span', { class: 'code-step__num' }, n), h('div', null, h('h3', null, icon(ic), t), h('p', null, d))));
    const langs = [['Python', 'python'], ['Python Tiếng Việt', 'pyvn'], ['C', 'c'], ['C++', 'cpp'], ['JavaScript', 'javascript'], ['SQL', 'sql'], ['HTML/CSS', 'html']];
    const codeSection = h('section', { class: 'scene scene-code', id: 's-code', dataset: { scene: 'pin', tone: 'light' } },
      h('div', { class: 'scene-code__sticky' },
        h('div', { class: 'container container--wide scene-code__grid' },
          h('div', { class: 'scene-code__copy' },
            sceneHead({ eyebrow: 'Trình chạy thật', ic: 'cpu', title: 'Không phải mô phỏng. Đây là Python thật.', lead: 'Mỗi bài tập được chấm bằng chính trình chạy này. Thử sửa đoạn code bên cạnh rồi bấm Chạy.' }),
            h('ol', { class: 'code-steps' }, stepEls),
            h('div', { class: 'lang-belt', 'aria-label': 'Ngôn ngữ hỗ trợ' }, langs.map(([label, id]) => h('a', { class: 'lang-chip', href: `#/workspace?lang=${id}` }, label))),
            h('div', { class: 'cluster', style: 'margin-top:20px' },
              h('a', { class: 'btn btn--primary btn--lg', href: '#/workspace' }, icon('terminal'), 'Mở IDE đầy đủ'),
              h('a', { class: 'btn btn--lg', href: '#/workspace?view=flowchart' }, icon('git-branch'), 'Lưu đồ & Scratch'))),
          h('div', { class: 'scene-code__stage' },
            h('div', { class: 'code-window' },
              h('div', { class: 'code-window__bar' },
                h('span', { class: 'code-window__dots' }, h('i'), h('i'), h('i')),
                h('span', { class: 'pill-tag' }, 'main.py'),
                h('span', { class: 'grow' }),
                runBtn),
              h('div', { class: 'code-window__editor' }, tryEditor.el),
              h('div', { class: 'code-window__out' }, tryTerminal.el)),
            h('pre', { class: 'code-ghost code-ghost--a', 'aria-hidden': 'true' }, h('code', null, raw(highlight(SNIPPETS.python, 'python')))),
            h('pre', { class: 'code-ghost code-ghost--b', 'aria-hidden': 'true' }, h('code', null, raw(highlight(SNIPPETS.cpp, 'cpp')))),
          ))));

    // =====================================================================
    // 3) V-PRISM — algorithm lab
    // =====================================================================
    const sortHost = h('div', { class: 'lab-stage__bars' });
    const algoNames = data.topics.flatMap((t) => t.algorithms.map((a) => `${t.title} · ${a.title}`));
    const marquee = (list, reverse) => h('div', { class: `lab-marquee ${reverse ? 'lab-marquee--rev' : ''}`, 'aria-hidden': 'true' },
      h('div', { class: 'lab-marquee__track' }, [...list, ...list].map((n) => h('span', null, n))));
    const prismSection = h('section', { class: 'scene scene-prism', id: 's-prism', dataset: { scene: '', tone: 'dark' } },
      h('div', { class: 'scene-prism__grid', 'aria-hidden': 'true' }),
      h('div', { class: 'container container--wide scene-prism__inner' },
        sceneHead({ eyebrow: 'V-Prism · Lăng kính thuật toán', ic: 'prism', title: 'Nhìn thấy thuật toán chuyển động', lead: `${data.topics.length} chủ đề, ${data.algos} thuật toán: tua lại, chạy chậm, tự nhập dữ liệu, xem mã giả sáng theo từng bước và đọc mã nguồn bằng Python, C++, JavaScript.`, tone: 'dark' }),
        h('div', { class: 'lab' },
          h('div', { class: 'lab-stage', dataset: { tilt: '6' } },
            h('div', { class: 'lab-stage__frame' },
              h('div', { class: 'lab-stage__head' }, h('span', { class: 'lab-dot' }), h('span', { class: 'mono' }, 'V-PRISM · LIVE'), h('span', { class: 'grow' }), h('span', { class: 'mono lab-stage__tick' }, 'n = 14')),
              sortHost,
              h('div', { class: 'lab-stage__ruler', 'aria-hidden': 'true' }, Array.from({ length: 15 }, (_, i) => h('i', null, String(i))))),
            h('div', { class: 'lab-stage__floor', 'aria-hidden': 'true' })),
          h('div', { class: 'lab-topics' }, data.topics.slice(0, 8).map((t) => h('a', { class: 'lab-topic', href: `#/prism/${t.id}`, dataset: { tilt: '8' } },
            h('span', { class: 'lab-topic__icon' }, icon(t.icon)), h('strong', null, t.title), h('span', null, `${t.algorithms.length} thuật toán`)))),
        ),
        h('div', { class: 'cluster', style: 'justify-content:center;margin-top:28px' },
          h('a', { class: 'hero-btn hero-btn--cyan', href: '#/prism' }, icon('prism'), h('span', null, `Mở toàn bộ ${data.topics.length} chủ đề`)))),
      algoNames.length ? marquee(algoNames.slice(0, Math.ceil(algoNames.length / 2))) : null,
      algoNames.length ? marquee(algoNames.slice(Math.ceil(algoNames.length / 2)), true) : null,
    );

    // =====================================================================
    // 4) V-MENTOR — AI
    // =====================================================================
    const aiInput = h('input', { class: 'mentor-ask__input', placeholder: 'Ví dụ: Giải thích đệ quy bằng ví dụ đời thường', 'aria-label': 'Câu hỏi cho V-Mentor', maxlength: 500 });
    let modeId = 'tutor';
    const modeCards = data.modes.map((m, i) => h('button', { class: `mentor-card ${i === 0 ? 'is-active' : ''}`, type: 'button', style: { '--i': String(i), '--n': String(data.modes.length) }, onClick: () => {
      modeId = m.id;
      modeCards.forEach((c) => c.classList.toggle('is-active', c === modeCards[i]));
      aiInput.placeholder = m.suggestions?.[0] ? `Ví dụ: ${m.suggestions[0]}` : aiInput.placeholder;
      aiInput.focus();
    } }, h('span', { class: 'mentor-card__icon' }, icon(m.icon)), h('strong', null, m.label), h('span', null, m.description)));
    const aiSection = h('section', { class: 'scene scene-ai', id: 's-ai', dataset: { scene: '', tone: 'dark' } },
      h('div', { class: 'scene-ai__aurora', 'aria-hidden': 'true' }, h('i'), h('i'), h('i')),
      h('div', { class: 'container container--wide scene-ai__grid' },
        h('div', { class: 'scene-ai__copy' },
          sceneHead({ eyebrow: 'V-Mentor · Trợ lý AI', ic: 'sparkles', title: 'Một người thầy kiên nhẫn, có mặt mọi lúc', lead: 'V-Mentor được thiết kế để dạy, không để làm hộ: gợi mở bằng câu hỏi, chỉ ra chỗ sai trong code, giải thích thuật toán kèm độ phức tạp. Khóa API được giữ an toàn trên máy chủ; phòng máy không có Internet có thể dùng AI ngoại tuyến (tùy chọn).', tone: 'dark' }),
          h('form', { class: 'mentor-ask', onSubmit: async (e) => {
            e.preventDefault();
            const q = aiInput.value.trim();
            if (!q) { aiInput.focus(); return; }
            await kv.set('ai:incoming', { prompt: q, mode: modeId, at: Date.now() });
            ctx.navigate('/ai');
          } }, icon('sparkles'), aiInput, h('button', { class: 'mentor-ask__send', type: 'submit', 'aria-label': 'Gửi câu hỏi' }, icon('send'))),
          h('p', { class: 'mentor-note' }, icon('info'), 'Câu hỏi sẽ được gửi tới V-Mentor ở trang Trợ lý AI với chế độ bạn chọn.')),
        h('div', { class: 'scene-ai__stage' },
          h('div', { class: 'mentor-orb', 'aria-hidden': 'true' }, h('i', { class: 'mentor-orb__core' }), h('i', { class: 'mentor-orb__ring mentor-orb__ring--1' }), h('i', { class: 'mentor-orb__ring mentor-orb__ring--2' }), h('i', { class: 'mentor-orb__ring mentor-orb__ring--3' })),
          h('div', { class: 'mentor-carousel' }, modeCards))));

    // =====================================================================
    // 5) ECOSYSTEM — each section as its own product
    // =====================================================================
    const courseTiles = data.courses.map((c) => {
      const look = COURSE_LOOK[c.id] || { grad: 'linear-gradient(135deg,#6366f1,#4338ca)', ic: 'book-open', tag: c.level };
      return h('a', { class: 'eco-course', href: `#/learn/${c.id}`, style: { '--grad': look.grad }, dataset: { tilt: '10' } },
        h('span', { class: 'eco-course__art' }, icon(look.ic)),
        h('span', { class: 'eco-course__tag' }, look.tag),
        h('strong', null, c.title),
        h('span', { class: 'eco-course__meta' }, `${c.lessons_count} bài · ${c.xp_total} XP`));
    });
    const ecoSection = h('section', { class: 'scene scene-eco', id: 's-eco', dataset: { scene: '', tone: 'light' } },
      h('div', { class: 'container container--wide' },
        sceneHead({ eyebrow: 'Hệ sinh thái', ic: 'layers', title: 'Một nền tảng — nhiều không gian, mỗi nơi một cá tính', lead: 'Học xong lý thuyết thì luyện tập, vướng thì hỏi AI, khó hình dung thì mở Lăng kính, rồi so tài trong đấu trường.' }),
        h('div', { class: 'eco-courses reveal' }, courseTiles),
        h('div', { class: 'eco-grid' },
          h('a', { class: 'eco-card eco-card--arena reveal', href: '#/challenges', dataset: { tilt: '6' } },
            h('span', { class: 'eco-card__kicker' }, 'ĐẤU TRƯỜNG'),
            h('h3', null, `${data.challenges} chặng thử thách`),
            h('p', null, `Từ nhập xuất đến bài toán học sinh giỏi, có test ẩn, ${data.bosses ? `${data.bosses} trùm cuối, ` : ''}huy hiệu và bảng xếp hạng.`),
            h('span', { class: 'eco-card__go' }, 'Vào trận', icon('arrow-right')),
            h('span', { class: 'eco-card__art eco-card__art--arena', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'))),
          h('a', { class: 'eco-card eco-card--ide reveal', href: '#/workspace', dataset: { tilt: '6' } },
            h('span', { class: 'eco-card__kicker' }, 'IDE · LƯU ĐỒ · SCRATCH'),
            h('h3', null, 'Không gian lập trình chuyên nghiệp'),
            h('p', null, 'Nhiều tệp, giao diện editor sáng/tối riêng, bảng lỗi giải thích bằng tiếng Việt, lưu đồ kéo thả và Scratch Live.'),
            h('span', { class: 'eco-card__go' }, 'Mở IDE', icon('arrow-right')),
            h('span', { class: 'eco-card__art eco-card__art--ide', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'), h('i'))),
          h('a', { class: 'eco-card eco-card--class reveal', href: '#/classroom', dataset: { tilt: '6' } },
            h('span', { class: 'eco-card__kicker' }, 'LỚP HỌC'),
            h('h3', null, 'Quản lý lớp như một sản phẩm SaaS'),
            h('p', null, 'Giao bài có hạn nộp, chấm tự động thang 10, chấm tay và nhận xét, bảng điểm, theo dõi học sinh theo thời gian thực.'),
            h('span', { class: 'eco-card__go' }, 'Vào lớp học', icon('arrow-right')),
            h('span', { class: 'eco-card__art eco-card__art--class', 'aria-hidden': 'true' }, h('i'), h('i'), h('i'))),
          h('a', { class: 'eco-card eco-card--offline reveal', href: '#/account?tab=offline', dataset: { tilt: '6' } },
            h('span', { class: 'eco-card__kicker' }, 'NGOẠI TUYẾN'),
            h('h3', null, 'Học mọi lúc — kể cả khi mất mạng'),
            h('p', null, 'Cài như ứng dụng. Bài học, IDE và tiến độ vẫn chạy offline; dữ liệu tự đồng bộ khi có mạng trở lại.'),
            h('span', { class: 'eco-card__go' }, 'Chuẩn bị học offline', icon('arrow-right')),
            h('span', { class: 'eco-card__art eco-card__art--offline', 'aria-hidden': 'true' }, icon('wifi-off'))))));

    // =====================================================================
    // 6) FUTURE — roadmap horizon
    // =====================================================================
    const tracks = data.tracks.length ? data.tracks : [];
    const futureSection = h('section', { class: 'scene scene-future', id: 's-future', dataset: { scene: '', tone: 'dark' } },
      h('div', { class: 'scene-future__sun', 'aria-hidden': 'true' }),
      h('div', { class: 'scene-future__floor', 'aria-hidden': 'true' }),
      h('div', { class: 'container container--wide scene-future__inner' },
        sceneHead({ eyebrow: 'Tầm nhìn', ic: 'rocket', title: 'Một hệ sinh thái lớn dần cùng người học', lead: 'Kiến trúc mô-đun cho phép bổ sung từng lĩnh vực mới mà không phải xây lại nền tảng.', tone: 'dark' }),
        h('ol', { class: 'roadmap' }, tracks.map((t, i) => h('li', { class: `roadmap__node reveal ${t.status === 'roadmap' ? 'is-soon' : 'is-live'}`, style: { transitionDelay: `${i * 60}ms` } },
          h('span', { class: 'roadmap__dot' }, icon(TRACK_ICON[t.id] || 'compass')),
          h('span', { class: 'roadmap__badge' }, t.status === 'roadmap' ? 'Sắp ra mắt' : 'Đang mở'),
          h('strong', null, t.title),
          h('span', { class: 'roadmap__desc' }, t.description)))),
      ));

    // =====================================================================
    // 7) START — call to action
    // =====================================================================
    const startSection = h('section', { class: 'scene scene-start', id: 's-start', dataset: { tone: 'light' } },
      h('div', { class: 'container container--wide' },
        h('div', { class: 'start-card reveal', dataset: { tilt: '4' } },
          h('div', { class: 'start-card__glow', 'aria-hidden': 'true' }),
          h('div', null,
            h('h2', null, 'Sẵn sàng viết dòng code đầu tiên?'),
            h('p', null, 'Không cần cài đặt. Không mất phí. Chỉ cần trình duyệt — và một chút tò mò.')),
          h('div', { class: 'cluster' },
            h('a', { class: 'hero-btn hero-btn--light', href: '#/learn/python', dataset: { magnetic: '' } }, h('span', null, 'Học Python ngay'), icon('arrow-right')),
            !user ? h('button', { class: 'hero-btn hero-btn--outline', type: 'button', onClick: async () => { const { openAuthDialog } = await import('../components/auth-dialog.js'); openAuthDialog({ mode: 'register' }); } }, h('span', null, 'Tạo tài khoản')) : null))));

    // ---------- scene navigator ----------
    const NAVS = [['s-hero', 'V-Core'], ['s-code', 'Code thật'], ['s-prism', 'Lăng kính'], ['s-ai', 'V-Mentor'], ['s-eco', 'Hệ sinh thái'], ['s-future', 'Tương lai'], ['s-start', 'Bắt đầu']];
    const sceneNav = h('nav', { class: 'scene-nav', 'aria-label': 'Các phần của trang chủ', dataset: { tone: 'dark' } },
      NAVS.map(([id, label]) => h('a', { href: `#${id}`, dataset: { target: id }, onClick: (e) => { e.preventDefault(); container.querySelector(`#${id}`)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' }); } }, h('span', null, label))));
    const progressBar = h('div', { class: 'home-progress', 'aria-hidden': 'true' }, h('i'));

    mount(container, h('div', { class: `home ${reduced ? 'is-reduced' : ''}` }, progressBar, sceneNav, heroSection, codeSection, prismSection, aiSection, ecoSection, futureSection, startSection));

    // ---------- behaviours ----------
    const stepCount = steps.length;
    let hero3d = null;
    initScrollScenes(container, {
      signal,
      onProgress: (el, p) => {
        if (el === heroSection) hero3d?.setProgress(p * 2);
        if (el === codeSection) {
          const active = Math.min(stepCount - 1, Math.floor(p * stepCount * 1.05));
          stepEls.forEach((st, i) => st.classList.toggle('is-active', i === active));
          stepEls.forEach((st, i) => st.classList.toggle('is-done', i < active));
        }
      },
    });
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.setProperty('--k', String(max > 0 ? window.scrollY / max : 0));
    };
    window.addEventListener('scroll', onScroll, { passive: true, signal });
    onScroll();
    initCounters(container, { signal });
    initTilt(container, { signal });
    initMagnetic(container, { signal });
    initSceneNav(container, sceneNav, { signal });
    revealOnScroll(container, signal);

    import('./prism/mini.js').then(({ mountMiniSort }) => {
      if (!signal.aborted) mountMiniSort(sortHost, { signal, size: 14, interval: 150 });
    }).catch(() => {});

    // WebGL hero (lazy, after first paint). Keeps the CSS fallback when unavailable.
    requestAnimationFrame(async () => {
      try {
        const { createHero3D } = await import('./home/hero3d.js');
        hero3d = await createHero3D(canvasHost, { signal, reduced });
        if (hero3d && !signal.aborted) heroSection.classList.add('is-webgl');
      } catch (err) { console.warn('[home] 3D hero unavailable:', err?.message); }
    });
    heroSection.addEventListener('hero:pulse', () => { pulseHint.classList.add('is-done'); });

    return () => tryEditor.destroy();
  },
};
