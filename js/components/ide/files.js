// V-Code Edu — multi-file projects for the IDE, one project per language, stored in IDB `drafts` as `workspace:<lang>`.
// Record shape (v2): { key, lang, v: 2, project: { files: [{ name, code }], active }, stdin, updatedAt,
//                      code (legacy: active/main file), files (legacy HTML: { html, css, js }) }
// Older records ({ code, stdin } or HTML { files: { html, css, js } }) are migrated transparently on load.
import { idb } from '../../core/idb.js';

export const MAIN_FILE = { python: 'main.py', pyvn: 'main.py', javascript: 'main.js', c: 'main.c', cpp: 'main.cpp', sql: 'main.sql', html: 'index.html' };
export const ALLOWED_EXT = {
  python: ['py', 'txt', 'csv', 'json'],
  pyvn: ['py', 'txt', 'csv'],
  javascript: ['js', 'json', 'txt'],
  c: ['c', 'h', 'txt'],
  cpp: ['cpp', 'h', 'hpp', 'txt'],
  sql: ['sql'],
  html: ['html', 'css', 'js'],
};
const MAX_FILES = 20;

/** Highlight / analysis language of a file inside a project. */
export function fileLang(name, projectLang) {
  const ext = String(name).split('.').pop().toLowerCase();
  if (ext === 'py') return projectLang === 'pyvn' ? 'pyvn' : 'python';
  return { js: 'javascript', css: 'css', html: 'html', htm: 'html', c: 'c', h: projectLang === 'cpp' ? 'cpp' : 'c', hpp: 'cpp', cpp: 'cpp', sql: 'sql', json: 'json', txt: 'plaintext', csv: 'plaintext' }[ext] || 'plaintext';
}

/** Can this file be executed with the project's runtime? */
export function isRunnable(name, projectLang) {
  const l = fileLang(name, projectLang);
  if (projectLang === 'html') return true;
  if (projectLang === 'pyvn') return l === 'pyvn';
  return l === projectLang;
}

export function validateName(name, lang, files, current = null) {
  const n = String(name || '').trim();
  if (!n) return 'Tên tệp không được để trống.';
  if (n.length > 48) return 'Tên tệp tối đa 48 ký tự.';
  if (!/^[A-Za-z0-9_][A-Za-z0-9_.-]*\.[A-Za-z0-9]+$/.test(n)) return 'Chỉ dùng chữ không dấu, số, dấu gạch dưới / gạch ngang, và có phần mở rộng (ví dụ: tien_ich.py).';
  const ext = n.split('.').pop().toLowerCase();
  if (!ALLOWED_EXT[lang].includes(ext)) return `Dự án ${lang === 'html' ? 'Web' : lang} chỉ nhận tệp: ${ALLOWED_EXT[lang].map((e) => `.${e}`).join(', ')}.`;
  if ((lang === 'python' || lang === 'pyvn') && ext === 'py' && !/^[A-Za-z_]\w*\.py$/.test(n)) return 'Tên tệp Python phải là tên hợp lệ để import được (chữ, số, _; không bắt đầu bằng số).';
  if (files.some((f) => f.name.toLowerCase() === n.toLowerCase() && f.name !== current)) return 'Đã có tệp trùng tên.';
  if (!current && files.length >= MAX_FILES) return `Mỗi dự án tối đa ${MAX_FILES} tệp.`;
  return '';
}

/** Suggest an unused file name like `tep_moi.py`, `tep_moi_2.py`. */
export function suggestName(lang, files, base = null) {
  const ext = lang === 'html' ? 'css' : ALLOWED_EXT[lang][0];
  const stem = base || (lang === 'html' ? 'style2' : (lang === 'python' || lang === 'pyvn') ? 'tien_ich' : 'tep_moi');
  let name = `${stem}.${ext}`;
  for (let i = 2; files.some((f) => f.name.toLowerCase() === name.toLowerCase()); i++) name = `${stem}_${i}.${ext}`;
  return name;
}

export function copyName(name, files) {
  const dot = name.lastIndexOf('.');
  const stem = name.slice(0, dot);
  const ext = name.slice(dot);
  let out = `${stem}_ban_sao${ext}`;
  for (let i = 2; files.some((f) => f.name === out); i++) out = `${stem}_ban_sao_${i}${ext}`;
  return out;
}

/** Convert legacy HTML parts ↔ files. */
export function filesFromWebParts(parts = {}) {
  return [
    { name: 'index.html', code: parts.html || '' },
    { name: 'style.css', code: parts.css || '' },
    { name: 'script.js', code: parts.js || '' },
  ];
}

/** Web preview parts: the active .html (or index.html) + all CSS + all JS files, in tab order. */
export function webParts(project) {
  const files = project.files;
  const active = files.find((f) => f.name === project.active);
  const htmlFile = active && /\.html?$/i.test(active.name) ? active : (files.find((f) => f.name.toLowerCase() === 'index.html') || files.find((f) => /\.html?$/i.test(f.name)));
  return {
    html: htmlFile?.code || '',
    css: files.filter((f) => /\.css$/i.test(f.name)).map((f) => (files.filter((x) => /\.css$/i.test(x.name)).length > 1 ? `/* ${f.name} */\n${f.code}` : f.code)).join('\n\n'),
    js: files.filter((f) => /\.js$/i.test(f.name)).map((f) => f.code).join('\n;\n'),
  };
}

/** Normalise any stored / shared payload into { files, active, stdin }. */
export function normalizeProject(lang, rec) {
  if (!rec) return null;
  if (rec.project && Array.isArray(rec.project.files) && rec.project.files.length) {
    const files = rec.project.files.filter((f) => f && typeof f.name === 'string').map((f) => ({ name: f.name, code: String(f.code ?? '') }));
    if (!files.length) return null;
    const active = files.some((f) => f.name === rec.project.active) ? rec.project.active : files[0].name;
    return { files, active, stdin: String(rec.stdin ?? '') };
  }
  if (lang === 'html') {
    if (rec.files && typeof rec.files === 'object' && !Array.isArray(rec.files)) return { files: filesFromWebParts(rec.files), active: 'index.html', stdin: '' };
    if (typeof rec.code === 'string') return { files: filesFromWebParts({ html: rec.code }), active: 'index.html', stdin: '' };
    return null;
  }
  if (typeof rec.code === 'string') return { files: [{ name: MAIN_FILE[lang], code: rec.code }], active: MAIN_FILE[lang], stdin: String(rec.stdin ?? '') };
  return null;
}

export async function loadProject(lang) {
  try { return normalizeProject(lang, await idb.get('drafts', `workspace:${lang}`)); } catch { return null; }
}

export function saveProject(lang, project) {
  const active = project.files.find((f) => f.name === project.active) || project.files[0];
  const record = { key: `workspace:${lang}`, lang, v: 2, project: { files: project.files.map((f) => ({ name: f.name, code: f.code })), active: project.active }, stdin: project.stdin || '', updatedAt: Date.now() };
  if (lang === 'html') {
    const byName = (n) => project.files.find((f) => f.name === n)?.code ?? '';
    record.files = { html: byName('index.html'), css: byName('style.css'), js: byName('script.js') };
  } else {
    record.code = (project.files.find((f) => f.name === MAIN_FILE[lang]) || active)?.code ?? '';
  }
  return idb.put('drafts', record).catch(() => {});
}
