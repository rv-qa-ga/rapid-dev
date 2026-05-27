/**
 * Shared local HTML preview wrapper for Confluence upload scripts.
 * Renders markdown body with Mermaid via CDN (no Kroki / no Confluence API).
 */

import * as fs from 'fs';
import * as path from 'path';

const MERMAID_CDN =
  process.env.MERMAID_CDN_URL?.trim() ||
  'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js';

function escapeHtmlAttr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

export function parsePreviewHtmlPath(argv: string[], defaultBasename: string): string | null {
  const idx = argv.indexOf('--preview-html');
  if (idx < 0) return null;
  const next = argv[idx + 1];
  if (next && !next.startsWith('--')) {
    return path.resolve(process.cwd(), next.trim());
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return path.resolve(process.cwd(), 'reports', 'html', `${defaultBasename}-${stamp}.html`);
}

export function wrapBrowserPreviewDocument(options: {
  title: string;
  innerBodyHtml: string;
  bannerHtml: string;
}): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>${escapeHtmlAttr(options.title)}</title>
  <style>
    body { font-family: system-ui, Segoe UI, sans-serif; line-height: 1.45; max-width: 1200px; margin: 0 auto; padding: 1rem 1.25rem 3rem; color: #172b4d; }
    .preview-banner { background: #fff7d6; border: 1px solid #ffc400; border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; }
    .preview-banner code { background: rgba(0,0,0,.06); padding: 0.1em 0.35em; border-radius: 3px; }
    table.preview-table { border-collapse: collapse; width: 100%; margin: 1rem 0; font-size: 0.92rem; }
    table.preview-table th, table.preview-table td { border: 1px solid #dfe1e6; padding: 0.4rem 0.55rem; vertical-align: top; }
    table.preview-table th { background: #f4f5f7; text-align: left; }
    article h1 { font-size: 1.65rem; margin-top: 0; }
    article h2 { font-size: 1.25rem; margin-top: 1.75rem; border-bottom: 1px solid #dfe1e6; padding-bottom: 0.25rem; }
    article h3 { font-size: 1.05rem; margin-top: 1.25rem; }
    article blockquote { margin: 0.75rem 0; padding-left: 1rem; border-left: 4px solid #0052cc; color: #42526e; }
    .mermaid { margin: 1.25rem 0; overflow-x: auto; }
    pre { background: #f4f5f7; padding: 0.75rem 1rem; overflow-x: auto; border-radius: 4px; font-size: 0.85rem; }
  </style>
  <script src="${escapeHtmlAttr(MERMAID_CDN)}"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ startOnLoad: true, theme: 'neutral', securityLevel: 'loose' });
      }
    });
  </script>
</head>
<body>
  <div class="preview-banner">${options.bannerHtml}</div>
  <article>${options.innerBodyHtml}</article>
</body>
</html>`;
}

export function writeMarkdownPreviewHtml(options: {
  markdownPath: string;
  previewPath: string;
  markdownToHtml: (markdown: string) => string;
  documentTitle: string;
  bannerHtml: string;
}): void {
  if (!fs.existsSync(options.markdownPath)) {
    throw new Error(`Markdown not found: ${options.markdownPath}`);
  }
  const mdRaw = fs.readFileSync(options.markdownPath, 'utf-8');
  const inner = options.markdownToHtml(mdRaw);
  const html = wrapBrowserPreviewDocument({
    title: options.documentTitle,
    innerBodyHtml: inner,
    bannerHtml: options.bannerHtml,
  });
  fs.mkdirSync(path.dirname(options.previewPath), { recursive: true });
  fs.writeFileSync(options.previewPath, html, 'utf-8');
}
