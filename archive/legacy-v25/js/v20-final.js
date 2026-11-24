// V-CODE EDU — UNIFIED THEME ENGINE (MOON/SUN) + ISOLATED IDE THEME + CLEAN HUMAN ICONS
(function () {
  const SUN_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  const MOON_SVG = `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
  const HELP_SVG = `<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="13" y2="13"/></svg>`;

  function applyGlobalTheme(mode) {
    const isLight = mode === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'light' : 'dark');
    document.body.setAttribute('data-theme', isLight ? 'light' : 'dark');
    document.documentElement.classList.toggle('light-theme', isLight);
    document.documentElement.classList.toggle('light-mode', isLight);
    document.body.classList.toggle('light-theme', isLight);
    document.body.classList.toggle('light-mode', isLight);
    try { localStorage.setItem('vcode_theme', isLight ? 'light' : 'dark'); } catch {}

    const btn = document.getElementById('theme-toggle-btn') || document.querySelector('[onclick*="toggleTheme"]');
    if (btn) {
      btn.innerHTML = isLight ? MOON_SVG : SUN_SVG;
      btn.title = isLight ? 'Chuyển sang giao diện Tối' : 'Chuyển sang giao diện Sáng';
      btn.setAttribute('aria-label', btn.title);
    }
  }

  window.toggleTheme = function () {
    const curLight = document.documentElement.getAttribute('data-theme') === 'light'
      || document.body.classList.contains('light-theme')
      || document.body.classList.contains('light-mode');
    applyGlobalTheme(curLight ? 'dark' : 'light');
  };

  function bindIsolatedIDETheme() {
    const btn = document.getElementById('ide-theme-btn') || [...document.querySelectorAll('#view-workspace button')].find((b) => /Sáng IDE|Tối IDE/i.test(b.textContent || ''));
    const ed = document.getElementById('code-editor');
    if (!btn || !ed) return;
    const editorWrap = ed.parentElement;

    const updateBtnLabel = (isLightEd) => {
      btn.innerHTML = isLightEd
        ? `${MOON_SVG.replace(/17/g, '14')}<span style="margin-left:5px">Tối IDE</span>`
        : `${SUN_SVG.replace(/17/g, '14')}<span style="margin-left:5px">Sáng IDE</span>`;
    };

    let ideLight = false;
    updateBtnLabel(false);

    btn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      ideLight = !ideLight;
      document.getElementById('view-workspace')?.classList.remove('ide-light', 'light-ide');
      document.body.classList.remove('ide-light-mode');
      ed.classList.toggle('v20-editor-light', ideLight);
      if (editorWrap) editorWrap.classList.toggle('v20-editor-wrap-light', ideLight);
      updateBtnLabel(ideLight);
    };
  }

  function refineFloatingHelperIcon() {
    const fab = document.getElementById('ai-fab')
      || document.getElementById('ai-tutor-fab')
      || document.querySelector('.ai-fab, .chatbot-fab, button[onclick*="toggleAIChat"], button[onclick*="toggleTutor"]');
    if (fab) {
      fab.classList.add('v20-clean-fab');
      fab.innerHTML = HELP_SVG;
      fab.title = 'Trợ giúp lập trình';
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    let saved = 'dark';
    try { saved = localStorage.getItem('vcode_theme') || 'dark'; } catch {}
    applyGlobalTheme(saved);

    const themeBtn = document.getElementById('theme-toggle-btn') || document.querySelector('[onclick*="toggleTheme"]');
    if (themeBtn) {
      themeBtn.onclick = (e) => { e.preventDefault(); window.toggleTheme(); };
    }

    bindIsolatedIDETheme();
    refineFloatingHelperIcon();
  });
})();
