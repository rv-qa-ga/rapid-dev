/**
 * Strip Confluence storage-format HTML to plain text (for exports / knowledge scripts).
 * Used by ConfluenceClient consumers; macros become placeholders.
 */
export function storageHtmlToPlainText(html: string): string {
  if (!html || !html.trim()) return '';
  let s = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<ac:structured-macro[\s\S]*?<\/ac:structured-macro>/gi, '\n[macro]\n')
    .replace(/<ac:[\s\S]*?\/>/g, '')
    .replace(/<\/ac:[^>]+>/g, '\n');
  const blockTags = ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr', 'br', 'hr', 'table', 'th', 'td'];
  for (const tag of blockTags) {
    s = s.replace(new RegExp(`</${tag}>`, 'gi'), '\n');
  }
  s = s.replace(/<[^>]+>/g, ' ');
  s = s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"');
  s = s.replace(/\n{3,}/g, '\n\n').replace(/^\s+|\s+$/gm, '').trim();
  return s;
}
