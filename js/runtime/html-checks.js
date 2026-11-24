// V-Code Edu — HTML/CSS exercise checks (DSL), evaluated against a live Document.
// Shared by the in-app grader (inside a sandboxed iframe) and by content validation harnesses.
//
// Check objects (all accept optional "message" shown to the student when the check fails):
//   { "type": "exists",  "selector": "h1" }
//   { "type": "count",   "selector": "li", "min": 3, "max": 10 }
//   { "type": "text",    "selector": "h1", "equals": "Xin chào" }          // trimmed, whitespace-collapsed, exact
//   { "type": "text",    "selector": "p",  "includes": "lập trình" }       // case-insensitive substring
//   { "type": "attr",    "selector": "a",  "name": "href", "equals"|"includes"|"present": ... }
//   { "type": "style",   "selector": "h1", "property": "color", "equals": "rgb(47, 73, 209)" }   // computed style
//   { "type": "style",   "selector": ".box", "property": "display", "oneOf": ["flex", "inline-flex"] }
//   { "type": "js",      "expr": "document.querySelectorAll('img[alt]').length >= 1" }        // boolean expression
//
// runChecks(doc, checks) -> [{ ok, message, check }]
// NOTE: This function's source is also injected into the sandboxed iframe via `runChecks.toString()`,
// so it must stay self-contained (no imports, no closures over module scope).

export function runChecks(doc, checks) {
  const norm = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  const lower = (s) => norm(s).toLowerCase();
  const win = doc.defaultView;
  const describe = (c) => {
    switch (c.type) {
      case 'exists': return `Cần có phần tử "${c.selector}"`;
      case 'count': return `Cần ${c.min != null ? `ít nhất ${c.min}` : ''}${c.min != null && c.max != null ? ' và ' : ''}${c.max != null ? `nhiều nhất ${c.max}` : ''} phần tử "${c.selector}"`;
      case 'text': return c.equals != null ? `"${c.selector}" phải có nội dung "${c.equals}"` : `"${c.selector}" phải chứa "${c.includes}"`;
      case 'attr': return `"${c.selector}" cần thuộc tính ${c.name}${c.equals != null ? `="${c.equals}"` : c.includes != null ? ` chứa "${c.includes}"` : ''}`;
      case 'style': return `"${c.selector}" cần ${c.property}: ${c.equals != null ? c.equals : (c.oneOf || []).join(' | ')}`;
      case 'js': return 'Điều kiện kiểm tra nâng cao chưa đạt';
      default: return `Kiểm tra không hợp lệ: ${c.type}`;
    }
  };
  return (checks || []).map((c) => {
    let ok = false;
    try {
      const els = c.selector ? Array.from(doc.querySelectorAll(c.selector)) : [];
      switch (c.type) {
        case 'exists':
          ok = els.length > 0;
          break;
        case 'count':
          ok = (c.min == null || els.length >= c.min) && (c.max == null || els.length <= c.max);
          break;
        case 'text':
          ok = els.some((el) => (c.equals != null ? norm(el.textContent) === norm(c.equals) : lower(el.textContent).includes(lower(c.includes))));
          break;
        case 'attr':
          ok = els.some((el) => {
            if (!el.hasAttribute(c.name)) return false;
            const v = el.getAttribute(c.name) || '';
            if (c.equals != null) return norm(v) === norm(c.equals);
            if (c.includes != null) return lower(v).includes(lower(c.includes));
            return true;
          });
          break;
        case 'style':
          ok = els.some((el) => {
            const v = norm(win.getComputedStyle(el).getPropertyValue(c.property));
            if (c.equals != null) return v === norm(c.equals);
            if (Array.isArray(c.oneOf)) return c.oneOf.map(norm).includes(v);
            return v !== '';
          });
          break;
        case 'js':
          // eslint-disable-next-line no-new-func
          ok = Boolean(new win.Function('document', 'window', `return (${c.expr});`)(doc, win));
          break;
        default:
          ok = false;
      }
    } catch (err) {
      ok = false;
    }
    return { ok, message: c.message || describe(c), check: c };
  });
}
