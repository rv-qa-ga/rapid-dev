#!/usr/bin/env ts-node

/**
 * Upload Lloyd's QA progress diagram page to Confluence as a sub-page
 *
 * Source: docs/lloyds/LLOYDS_QA_PROGRESS.md
 * Canonical QA progress page (TM space):
 *   https://accelins.atlassian.net/wiki/spaces/TM/pages/3220078705/QA+progress+R+Y+G
 *
 * Legacy parent (Lloyd's of London) for title-based child discovery:
 *   https://accelins.atlassian.net/wiki/spaces/TM/pages/3020062774/Lloyd+s+of+London
 *
 * Mermaid blocks are rendered to SVG and attached so the Confluence page shows graphics
 * (Cloud does not render Mermaid from fenced code).
 *
 * Render order: (1) Kroki plain POST with retries, (2) Kroki JSON POST, (3) mermaid.ink
 * (deflated diagram in URL when under length limit), (4) Playwright + Mermaid CDN —
 * tries **Google Chrome / Edge** (`channel`) first so images work without
 * `npx playwright install chromium` when a system browser is installed.
 *
 * TLS: if `NODE_TLS_REJECT_UNAUTHORIZED=0` is set, Kroki / mermaid.ink use a relaxed HTTPS
 * agent. If not set but the first request fails with a **certificate** error, the uploader
 * retries **once** with relaxed verification (same idea as corporate MITM proxies).
 *
 * **Default:** SVGs are **uploaded as page attachments** and referenced with **`ac:image`** —
 * Confluence Cloud often **strips or hides raw inline `<svg>`** in storage HTML, so attachments
 * are what actually render as visible images for most tenants.
 * **Opt-in inline SVG:** set `LLOYDS_CONFLUENCE_MERMAID_INLINE_SVG=1` (may show nothing in Cloud).
 * **Explicit:** `LLOYDS_CONFLUENCE_MERMAID_ATTACHMENT_MACRO=0` also forces inline (same as opt-out of attachments).
 *
 * Requires: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (or JIRA_*) in .env / .env.qa
 *
 * Usage:
 *   npm run docs:upload:lloyds-qa-progress
 *   npx ts-node scripts/upload-lloyds-qa-progress-to-confluence.ts --page-id 3220078705
 *   npx ts-node scripts/upload-lloyds-qa-progress-to-confluence.ts --page-id 3220078705 --inject-repo-matrix
 *   npx ts-node scripts/upload-lloyds-qa-progress-to-confluence.ts --repo-matrix-json reports/lloyds-repo-matrix.json
 *   npx ts-node scripts/upload-lloyds-qa-progress-to-confluence.ts --parent-page-id 3020062774
 *   npx ts-node scripts/upload-lloyds-qa-progress-to-confluence.ts --preview-html
 *   npx ts-node scripts/upload-lloyds-qa-progress-to-confluence.ts --preview-html reports/html/my-preview.html
 *
 * **--preview-html** writes a local HTML file (Mermaid via CDN in the browser — no Kroki).
 * Does **not** call Confluence; **ATLASSIAN_*** credentials are not required.
 * Use this when **Kroki** (or all SVG renderers) fails: open the HTML, then update Confluence manually — see `docs/lloyds/LLOYDS_QA_PROGRESS.md` §3.
 *
 * **--skip-diagram-render** uploads **markdown body only**: skips Kroki / mermaid.ink / Playwright.
 * Each Mermaid block becomes a short **placeholder** in Confluence — paste diagrams manually (e.g. from preview HTML).
 *
 * Target resolution (first match wins):
 *   1) --page-id <id>
 *   2) CONFLUENCE_LLOYDS_QA_PROGRESS_PAGE_ID in env
 *   3) Find child titled "QA progress (R / Y / G)" under --parent-page-id (default 3020062774)
 */

import * as fs from 'fs';
import * as https from 'https';
import * as os from 'os';
import * as path from 'path';
import * as zlib from 'zlib';
import * as dotenv from 'dotenv';
import axios from 'axios';
import type { Browser } from 'playwright';
import { ConfluenceClient } from '../src/integrations/confluence/client';
import {
  codeBlockToMacro,
  markdownToBrowserPreviewHtml,
  markdownToConfluenceStorage,
} from './lib/markdown-to-confluence';
import {
  injectRepoMatrixIntoMarkdown,
  loadRepoMatrixMarkdownFromJsonFile,
} from './lloyds/repo-matrix-from-cucumber-json';

const envPaths = [
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`📁 Loaded env from: ${path.relative(process.cwd(), envPath)}`);
    break;
  }
}

const DEFAULT_PARENT_PAGE_ID = '3020062774';
const SUBPAGE_TITLE = 'QA progress (R / Y / G)';
const MARKDOWN_PATH = path.resolve(__dirname, '../docs/lloyds/LLOYDS_QA_PROGRESS.md');
const KROKI_MERMAID_SVG = 'https://kroki.io/mermaid/svg';
const KROKI_JSON = 'https://kroki.io';
const MERMAID_CDN =
  process.env.MERMAID_CDN_URL?.trim() ||
  'https://cdn.jsdelivr.net/npm/mermaid@10.9.0/dist/mermaid.min.js';

function escapeHtmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
}
const ATTACHMENT_PREFIX = 'lloyds-qa-progress-mermaid';
const KROKI_RETRIES = Math.max(1, Math.min(8, parseInt(process.env.KROKI_RETRIES || '5', 10) || 5));
const KROKI_TIMEOUT_MS = Math.max(30000, parseInt(process.env.KROKI_TIMEOUT_MS || '180000', 10) || 180000);
const MERMAID_INK_BASE =
  (process.env.MERMAID_INK_BASE_URL || 'https://mermaid.ink').replace(/\/+$/, '') || 'https://mermaid.ink';
const MERMAID_INK_MAX_URL =
  Math.max(2000, parseInt(process.env.MERMAID_INK_MAX_URL_CHARS || '12000', 10) || 12000) || 12000;

function insecureHttpsAgent(): https.Agent | undefined {
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
    return new https.Agent({ rejectUnauthorized: false });
  }
  return undefined;
}

function axiosTlsOpts(): { httpsAgent?: https.Agent } {
  const httpsAgent = insecureHttpsAgent();
  return httpsAgent ? { httpsAgent } : {};
}

function relaxedHttpsAgent(): https.Agent {
  return new https.Agent({ rejectUnauthorized: false });
}

function isTlsLikeError(e: unknown): boolean {
  const any = e as { code?: string; cause?: { code?: string }; message?: string };
  const code = any?.code ?? any?.cause?.code;
  const msg = e instanceof Error ? e.message : String(any?.message ?? e ?? '');
  return (
    code === 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' ||
    code === 'CERT_HAS_EXPIRED' ||
    /certificate|UNABLE_TO_GET_ISSUER|self-signed|unable to verify the first certificate/i.test(msg)
  );
}

/** First attempt uses strict TLS unless `NODE_TLS_REJECT_UNAUTHORIZED=0`; on cert errors, retry once relaxed. */
async function withTlsRelaxedOnCertFailure(label: string, op: (opts: { forceInsecure?: boolean }) => Promise<void>): Promise<void> {
  try {
    await op({});
  } catch (e) {
    if (!isTlsLikeError(e)) throw e;
    console.warn(`   ⚠️ ${label}: TLS verification failed — retrying with relaxed HTTPS once.`);
    await op({ forceInsecure: true });
  }
}

function httpsAgentForRequest(opts: { forceInsecure?: boolean }): { httpsAgent?: https.Agent } {
  if (opts.forceInsecure) return { httpsAgent: relaxedHttpsAgent() };
  const a = insecureHttpsAgent();
  return a ? { httpsAgent: a } : {};
}

/** Strip active content from SVG before embedding in Confluence storage XML. */
function sanitizeSvgForConfluence(svg: string): string {
  let s = svg.trim();
  s = s.replace(/<script\b[\s\S]*?<\/script>/gi, '');
  s = s.replace(/\s+on[a-z][a-z0-9-]*\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  return s;
}

function stripMermaidBlocks(md: string): { text: string; sources: string[] } {
  const sources: string[] = [];
  const text = md.replace(/```mermaid\s*\n([\s\S]*?)```/g, (_, inner) => {
    sources.push(inner.trim());
    return `\n\nMERMAID_PLACEHOLDER_${sources.length - 1}\n\n`;
  });
  return { text, sources };
}

function attachmentMacro(filename: string): string {
  return `<ac:image ac:align="center" ac:layout="center" ac:width="900">
  <ri:attachment ri:filename="${filename}" />
</ac:image>`;
}

/**
 * Confluence Cloud sanitizes page body HTML and often removes inline `<svg>`.
 * Default: attach SVG + `ac:image` (visible). Inline SVG only when explicitly requested.
 */
function embedMermaidDiagramsAsAttachments(): boolean {
  if ((process.env.LLOYDS_CONFLUENCE_MERMAID_INLINE_SVG || '').trim() === '1') {
    return false;
  }
  const legacy = (process.env.LLOYDS_CONFLUENCE_MERMAID_ATTACHMENT_MACRO || '').trim();
  if (legacy === '0' || /^false$/i.test(legacy)) {
    return false;
  }
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function krokiMermaidToSvgPlainPost(
  source: string,
  outFile: string,
  tls: { forceInsecure?: boolean } = {},
): Promise<void> {
  const response = await axios.post(KROKI_MERMAID_SVG, source, {
    ...httpsAgentForRequest(tls),
    headers: { 'Content-Type': 'text/plain' },
    timeout: KROKI_TIMEOUT_MS,
    responseType: 'arraybuffer',
    validateStatus: (s) => s === 200,
  });
  fs.writeFileSync(outFile, Buffer.from(response.data));
}

async function krokiMermaidToSvgJsonPost(source: string, outFile: string, tls: { forceInsecure?: boolean } = {}): Promise<void> {
  const response = await axios.post(
    KROKI_JSON,
    {
      diagram_source: source,
      diagram_type: 'mermaid',
      output_format: 'svg',
    },
    {
      ...httpsAgentForRequest(tls),
      headers: { 'Content-Type': 'application/json' },
      timeout: KROKI_TIMEOUT_MS,
      responseType: 'arraybuffer',
      validateStatus: (s) => s === 200,
    },
  );
  fs.writeFileSync(outFile, Buffer.from(response.data));
}

/** Public mermaid.ink service: zlib-compress diagram, base64url in path (GET). */
async function mermaidInkDeflatedToSvgFile(source: string, outFile: string, tls: { forceInsecure?: boolean } = {}): Promise<void> {
  const deflated = zlib.deflateSync(Buffer.from(source, 'utf8'), { level: 9 });
  let b64 = deflated.toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  b64 = b64.replace(/=+$/, '');
  const url = `${MERMAID_INK_BASE}/svg/${b64}`;
  if (url.length > MERMAID_INK_MAX_URL) {
    throw new Error(`mermaid.ink URL too long (${url.length} > ${MERMAID_INK_MAX_URL})`);
  }
  const response = await axios.get(url, {
    ...httpsAgentForRequest(tls),
    timeout: KROKI_TIMEOUT_MS,
    responseType: 'arraybuffer',
    validateStatus: (s) => s === 200,
    headers: { Accept: 'image/svg+xml,application/xml,text/xml,*/*' },
  });
  const buf = Buffer.from(response.data);
  const head = buf.slice(0, 200).toString('utf8').trimStart();
  if (!head.includes('<svg') && !head.startsWith('<?xml')) {
    throw new Error('mermaid.ink returned non-SVG response');
  }
  fs.writeFileSync(outFile, buf);
}

/**
 * When Kroki is overloaded (504), render Mermaid in headless Chromium using the same
 * Mermaid build as most docs (CDN). Requires `npx playwright install chromium` (or CI image with browsers).
 */
async function mermaidPlaywrightToSvgFile(source: string, outFile: string): Promise<void> {
  const payload = JSON.stringify(source);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body>
<script type="application/json" id="mermaid-def">${payload}</script>
<script src="${escapeHtmlAttr(MERMAID_CDN)}"></script>
<script>
(async () => {
  const def = JSON.parse(document.getElementById('mermaid-def').textContent);
  mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'neutral' });
  const id = 'mmd-' + Date.now();
  const { svg } = await mermaid.render(id, def);
  document.body.innerHTML = svg;
})();
</script>
</body></html>`;

  const { chromium } = await import('playwright');
  let browser: Browser | undefined;
  /** Prefer system Chrome / Edge first (no `playwright install` required on many dev PCs). */
  const launchOpts: Array<{ headless: true; channel?: 'chrome' | 'msedge' }> = [
    { headless: true, channel: 'chrome' },
    { headless: true, channel: 'msedge' },
    { headless: true },
  ];
  let lastLaunchErr: unknown;
  for (const opts of launchOpts) {
    try {
      browser = await chromium.launch(opts);
      lastLaunchErr = undefined;
      break;
    } catch (e) {
      lastLaunchErr = e;
    }
  }
  if (!browser) {
    throw lastLaunchErr instanceof Error
      ? lastLaunchErr
      : new Error(
          'Could not launch Chromium. Install Playwright browsers (`npx playwright install chromium`) or install Google Chrome / Microsoft Edge for channel launch.',
        );
  }
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load', timeout: KROKI_TIMEOUT_MS });
    await page.waitForSelector('svg', { timeout: KROKI_TIMEOUT_MS });
    const svg = await page.$eval('svg', (el) => el.outerHTML);
    fs.writeFileSync(outFile, svg, 'utf8');
  } finally {
    await browser?.close();
  }
}

type RenderMethod = 'kroki-plain' | 'kroki-json' | 'mermaid-ink' | 'playwright';

async function renderMermaidToSvgFile(source: string, outFile: string): Promise<RenderMethod> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= KROKI_RETRIES; attempt++) {
    try {
      await withTlsRelaxedOnCertFailure('Kroki plain', (tls) => krokiMermaidToSvgPlainPost(source, outFile, tls));
      return 'kroki-plain';
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const retry = attempt < KROKI_RETRIES;
      console.warn(`   ⚠️ Kroki plain POST attempt ${attempt}/${KROKI_RETRIES}: ${msg}${retry ? ' — retrying…' : ''}`);
      if (retry) await sleep(2000 * attempt);
    }
  }
  try {
    console.log('   ↪ Kroki JSON API…');
    await withTlsRelaxedOnCertFailure('Kroki JSON', (tls) => krokiMermaidToSvgJsonPost(source, outFile, tls));
    return 'kroki-json';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`   ⚠️ Kroki JSON failed: ${msg}`);
  }
  try {
    console.log('   ↪ mermaid.ink (deflated URL)…');
    await withTlsRelaxedOnCertFailure('mermaid.ink', (tls) => mermaidInkDeflatedToSvgFile(source, outFile, tls));
    return 'mermaid-ink';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`   ⚠️ mermaid.ink failed: ${msg}`);
  }
  try {
    console.log('   ↪ Playwright + Mermaid (CDN; Chrome / Edge / bundled Chromium)…');
    await mermaidPlaywrightToSvgFile(source, outFile);
    return 'playwright';
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`   ⚠️ Playwright render failed: ${msg}`);
    const prior = lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new Error(`All Mermaid renderers failed. Playwright: ${msg}. Last Kroki error: ${prior}`);
  }
}

function substituteMermaidPlaceholders(
  storageHtml: string,
  sources: string[],
  /** Sanitized inline SVG per diagram, or null to fall back to code / attachment mode. */
  diagramSvg: (string | null)[],
  attachmentNames: string[],
  options?: { skipDiagramRender?: boolean; useAttachmentImages?: boolean },
): string {
  const useAttachmentMacro = options?.useAttachmentImages !== false;
  let html = storageHtml;
  for (let i = 0; i < sources.length; i++) {
    const re = new RegExp(`<p>MERMAID_PLACEHOLDER_${i}</p>`, 'g');
    if (options?.skipDiagramRender) {
      html = html.replace(
        re,
        `<p><em>Diagram ${i + 1} — <strong>not uploaded</strong> in this run (manual diagram update). Use <code>npm run docs:preview:lloyds-qa-progress-html</code> or <code>docs/lloyds/LLOYDS_QA_PROGRESS.md</code>.</em></p>`,
      );
      continue;
    }
    const inline = diagramSvg[i];
    if (inline && useAttachmentMacro) {
      html = html.replace(
        re,
        `${attachmentMacro(attachmentNames[i])}\n<p><em>Diagram ${i + 1} — Mermaid → SVG (page attachment). Re-run <code>npm run docs:upload:lloyds-qa-progress</code> after editing <code>docs/lloyds/LLOYDS_QA_PROGRESS.md</code>.</em></p>`,
      );
    } else if (inline && !useAttachmentMacro) {
      html = html.replace(
        re,
        `<p><em>Diagram ${i + 1} — Mermaid → SVG (inline; may be hidden in Confluence Cloud). Prefer default upload (attachments).</em></p>\n${inline}\n`,
      );
    } else {
      html = html.replace(re, `<p>${codeBlockToMacro('mermaid', sources[i])}</p>`);
    }
  }
  return html;
}

function parsePageIdArg(argv: string[]): string | undefined {
  const idx = argv.indexOf('--page-id');
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1].trim();
  const eq = argv.find((a) => a.startsWith('--page-id='));
  if (eq) return eq.slice('--page-id='.length).trim();
  return undefined;
}

const DEFAULT_REPO_MATRIX_JSON = path.resolve(process.cwd(), 'reports/lloyds-repo-matrix.json');

function parseRepoMatrixJsonArg(argv: string[]): string | undefined {
  const idx = argv.indexOf('--repo-matrix-json');
  if (idx >= 0 && argv[idx + 1]) return path.resolve(process.cwd(), argv[idx + 1].trim());
  const eq = argv.find((a) => a.startsWith('--repo-matrix-json='));
  if (eq) return path.resolve(process.cwd(), eq.slice('--repo-matrix-json='.length).trim());
  return undefined;
}

/** Local HTML preview path, or null if flag absent. Optional path after the flag. */
function parsePreviewHtmlPath(argv: string[]): string | null {
  const idx = argv.indexOf('--preview-html');
  if (idx < 0) return null;
  const next = argv[idx + 1];
  if (next && !next.startsWith('--')) {
    return path.resolve(process.cwd(), next.trim());
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return path.resolve(process.cwd(), 'reports', 'html', `lloyds-qa-progress-confluence-preview-${stamp}.html`);
}

function wrapBrowserPreviewDocument(innerBodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Lloyd's QA progress (R/Y/G) — local Confluence preview</title>
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
  <div class="preview-banner">
    <strong>Local preview only</strong> — diagrams use <strong>Mermaid in your browser</strong> (not Kroki).
    After review, publish with <code>npm run docs:upload:lloyds-qa-progress</code> (Confluence page
    <a href="https://accelins.atlassian.net/wiki/spaces/TM/pages/3220078705/QA+progress+R+Y+G">3220078705</a>).
  </div>
  <article>${innerBodyHtml}</article>
</body>
</html>`;
}

async function main() {
  const args = process.argv.slice(2);
  const previewPath = parsePreviewHtmlPath(args);

  if (previewPath) {
    console.log("\n📄 Lloyd's QA progress — **preview HTML** (no Confluence)\n");
    if (!fs.existsSync(MARKDOWN_PATH)) {
      console.error(`❌ Markdown not found: ${MARKDOWN_PATH}`);
      process.exit(1);
    }
    let mdRaw = fs.readFileSync(MARKDOWN_PATH, 'utf-8');
    const injectMatrix =
      args.includes('--inject-repo-matrix') ||
      Boolean((process.env.LLOYDS_REPO_MATRIX_INJECT || '').trim().match(/^(1|true|yes)$/i));
    const matrixPathExplicit = parseRepoMatrixJsonArg(args);
    const envMatrix = (process.env.LLOYDS_REPO_MATRIX_JSON || '').trim();
    let matrixBlock =
      '> *This preview did not merge a Cucumber matrix. Use `--inject-repo-matrix` or `npm run docs:upload:lloyds-qa-progress:matrix` to inject the per-repo table.*';
    if (injectMatrix || matrixPathExplicit || envMatrix) {
      const p =
        matrixPathExplicit || (envMatrix ? path.resolve(process.cwd(), envMatrix) : DEFAULT_REPO_MATRIX_JSON);
      const frag = loadRepoMatrixMarkdownFromJsonFile(p);
      matrixBlock =
        frag ||
        `> *No valid repo matrix at \`${path.relative(process.cwd(), p)}\`. Run \`npm run lloyds:repo-matrix\` after E2E.*`;
    }
    mdRaw = injectRepoMatrixIntoMarkdown(mdRaw, matrixBlock);
    const inner = markdownToBrowserPreviewHtml(mdRaw);
    const html = wrapBrowserPreviewDocument(inner);
    fs.mkdirSync(path.dirname(previewPath), { recursive: true });
    fs.writeFileSync(previewPath, html, 'utf-8');
    console.log(`✅ Wrote preview: ${previewPath}`);
    console.log('   Open the file in a browser to verify tables and Mermaid before uploading.\n');
    process.exit(0);
  }
  let parentPageId = DEFAULT_PARENT_PAGE_ID;
  const parentIdx = args.indexOf('--parent-page-id');
  if (parentIdx >= 0 && args[parentIdx + 1]) {
    parentPageId = args[parentIdx + 1];
  }

  const explicitPageId =
    parsePageIdArg(args) ||
    (process.env.CONFLUENCE_LLOYDS_QA_PROGRESS_PAGE_ID || '').trim() ||
    undefined;

  console.log("\n📄 Lloyd's QA progress – Upload to Confluence");
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new ConfluenceClient();
  if (!client.isConfigured()) {
    console.error('❌ Error: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set (e.g. in .env or .env.qa)');
    process.exit(1);
  }

  if (!fs.existsSync(MARKDOWN_PATH)) {
    console.error(`❌ Error: Markdown not found: ${MARKDOWN_PATH}`);
    process.exit(1);
  }

  let mdRaw = fs.readFileSync(MARKDOWN_PATH, 'utf-8');

  const injectMatrix =
    args.includes('--inject-repo-matrix') ||
    Boolean((process.env.LLOYDS_REPO_MATRIX_INJECT || '').trim().match(/^(1|true|yes)$/i));
  const matrixPathExplicit = parseRepoMatrixJsonArg(args);
  const envMatrix = (process.env.LLOYDS_REPO_MATRIX_JSON || '').trim();

  let matrixBlock =
    '> *This Confluence publish did not merge a Cucumber matrix. After E2E, run `npm run docs:upload:lloyds-qa-progress:matrix` (or upload with `--inject-repo-matrix`) to replace this block with the per-repo table.*';

  if (injectMatrix || matrixPathExplicit || envMatrix) {
    const p = matrixPathExplicit || (envMatrix ? path.resolve(process.cwd(), envMatrix) : DEFAULT_REPO_MATRIX_JSON);
    const frag = loadRepoMatrixMarkdownFromJsonFile(p);
    matrixBlock =
      frag ||
      `> *No valid repo matrix at \`${path.relative(process.cwd(), p)}\`. Run \`npm run test:lloyds:e2e-readonly\` then \`npm run lloyds:repo-matrix\`.*`;
  }

  mdRaw = injectRepoMatrixIntoMarkdown(mdRaw, matrixBlock);

  const skipDiagramRender = args.includes('--skip-diagram-render');

  const { text: mdStripped, sources: mermaidSources } = stripMermaidBlocks(mdRaw);
  const attachmentNames = mermaidSources.map((_, i) => `${ATTACHMENT_PREFIX}-${i}.svg`);
  const diagramSvg: (string | null)[] = mermaidSources.map(() => null);
  const tempByIdx: (string | undefined)[] = mermaidSources.map(() => undefined);

  const mermaidAsAttachments = embedMermaidDiagramsAsAttachments();

  if (skipDiagramRender) {
    console.log(
      `⏭️  Skipping Mermaid → SVG (${mermaidSources.length} block(s)) — --skip-diagram-render (body + diagram placeholders only).\n`,
    );
  } else {
    for (let i = 0; i < mermaidSources.length; i++) {
      const tmp = path.join(os.tmpdir(), `${ATTACHMENT_PREFIX}-${i}-${Date.now()}.svg`);
      try {
        console.log(`🖼️  Mermaid → SVG (${i + 1}/${mermaidSources.length})…`);
        const method = await renderMermaidToSvgFile(mermaidSources[i], tmp);
        tempByIdx[i] = tmp;
        diagramSvg[i] = sanitizeSvgForConfluence(fs.readFileSync(tmp, 'utf8'));
        console.log(`   ✓ Diagram ${i + 1} rendered via ${method}`);
      } catch (e: any) {
        console.warn(`   ⚠️ All renderers failed for diagram ${i + 1}: ${e.message || e}. Falling back to code block.`);
      }
    }

    const embeddedCount = diagramSvg.filter(Boolean).length;
    if (embeddedCount > 0) {
      if (mermaidAsAttachments) {
        console.log(
          `\n📌 Publishing ${embeddedCount} diagram(s) as **page attachments** + \`ac:image\` (default — Confluence Cloud often hides inline SVG). ` +
            `Inline SVG: \`LLOYDS_CONFLUENCE_MERMAID_INLINE_SVG=1\`.\n`,
        );
      } else {
        console.log(
          `\n📌 Embedding ${embeddedCount} diagram(s) as **inline SVG** (\`LLOYDS_CONFLUENCE_MERMAID_INLINE_SVG=1\`). ` +
            `If diagrams are blank in Confluence, remove that env var and re-upload.\n`,
        );
      }
    }
  }

  let storageFormat = markdownToConfluenceStorage(mdStripped);
  storageFormat = substituteMermaidPlaceholders(storageFormat, mermaidSources, diagramSvg, attachmentNames, {
    skipDiagramRender,
    useAttachmentImages: mermaidAsAttachments,
  });

  console.log(`📖 Read ${path.relative(process.cwd(), MARKDOWN_PATH)}`);
  console.log(`   Mermaid blocks: ${mermaidSources.length}, storage size: ${(storageFormat.length / 1024).toFixed(1)} KB\n`);

  const cleanupTemps = () => {
    for (const f of tempByIdx) {
      if (!f) continue;
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        /* ignore */
      }
    }
  };

  try {
    let pageId: string;

    if (explicitPageId) {
      pageId = explicitPageId;
      const probe = await client.getPage(pageId, { expand: 'version' });
      if (!probe) {
        console.error(`❌ No access or page not found: ${pageId}. Check id and Confluence permissions.`);
        process.exit(1);
      }
      console.log(`🔍 Updating page by ID ${pageId} ("${probe.title}")…\n`);
    } else {
      console.log(`🔍 Looking for sub-page "${SUBPAGE_TITLE}" under parent ${parentPageId}...`);
      const existing = await client.findChildPageByTitle(parentPageId, SUBPAGE_TITLE);

      if (existing) {
        pageId = existing.id;
        console.log(`   Found existing page (ID: ${pageId}). Attaching / updating diagrams…\n`);
      } else {
        console.log('   Not found. Creating stub page, then attaching diagrams…\n');
        const stub = await client.createPageWithBody(
          parentPageId,
          SUBPAGE_TITLE,
          '<p><em>Uploading diagrams…</em></p>'
        );
        pageId = stub.id;
        console.log(`   Created page ID ${pageId}.\n`);
      }
    }

    if (mermaidAsAttachments && !skipDiagramRender) {
      for (let i = 0; i < mermaidSources.length; i++) {
        if (!diagramSvg[i] || !tempByIdx[i]) continue;
        const finalName = attachmentNames[i];
        const staged = path.join(os.tmpdir(), finalName);
        fs.copyFileSync(tempByIdx[i], staged);
        try {
          await client.uploadAttachment(pageId, staged);
        } finally {
          if (fs.existsSync(staged)) fs.unlinkSync(staged);
        }
      }
    }

    cleanupTemps();

    const fullAfter = await client.getPage(pageId, { expand: 'version' });
    const v = (fullAfter?.version?.number ?? 1) + 1;

    const versionMessage = skipDiagramRender
      ? "Updated Lloyd's QA progress (R/Y/G) — body text only; diagrams omitted (manual paste)"
      : mermaidAsAttachments
        ? "Updated Lloyd's QA progress (R/Y/G) — Mermaid → SVG attachments + ac:image (Kroki / mermaid.ink / Playwright)"
        : "Updated Lloyd's QA progress (R/Y/G) — Mermaid → inline SVG (LLOYDS_CONFLUENCE_MERMAID_INLINE_SVG=1)";

    await client.updatePageContent(pageId, storageFormat, v, {
      message: versionMessage,
    });

    const page = await client.getPage(pageId, { expand: '_links' });
    if (skipDiagramRender) {
      console.log('✅ Page saved (body + diagram placeholders — update diagrams manually in Confluence).');
    } else {
      console.log(
        mermaidAsAttachments
          ? '✅ Page saved (Mermaid diagrams as page attachments — should be visible in Confluence).'
          : '✅ Page saved (Mermaid diagrams as inline SVG — if blank in Cloud, re-run without LLOYDS_CONFLUENCE_MERMAID_INLINE_SVG).',
      );
    }
    if (page?._links?.webui) {
      console.log(`\n📎 View: ${client.getBaseUrl()}${page._links.webui}`);
    }
    if (explicitPageId) {
      console.log(`\n📎 Target page id: ${pageId}`);
    } else {
      console.log(
        `\n📎 Parent: ${client.getBaseUrl()}/spaces/${process.env.CONFLUENCE_SPACE_KEY || 'TM'}/pages/${parentPageId}`
      );
    }
  } catch (err: any) {
    cleanupTemps();
    console.error('\n❌ Error:', err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main().catch(console.error);
