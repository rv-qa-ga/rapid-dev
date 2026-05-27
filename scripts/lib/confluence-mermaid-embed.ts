/**
 * Mermaid → Confluence: strip blocks, render via Kroki, substitute attachment macros.
 * Shared by CLM and Lloyd's QA progress upload scripts.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import axios from 'axios';

const KROKI_MERMAID_SVG = 'https://kroki.io/mermaid/svg';
const KROKI_TIMEOUT_MS = 60_000;

export function stripMermaidBlocks(md: string): { text: string; sources: string[] } {
  const sources: string[] = [];
  const text = md.replace(/```mermaid\s*\n([\s\S]*?)```/g, (_, inner) => {
    sources.push(inner.trim());
    return `\n\nMERMAID_PLACEHOLDER_${sources.length - 1}\n\n`;
  });
  return { text, sources };
}

export function attachmentMacro(filename: string, width = 900): string {
  return `<ac:image ac:align="center" ac:layout="center" ac:width="${width}">
  <ri:attachment ri:filename="${filename}" />
</ac:image>`;
}

export async function renderMermaidToSvgFile(source: string, outFile: string): Promise<void> {
  const response = await axios.post(KROKI_MERMAID_SVG, source, {
    headers: { 'Content-Type': 'text/plain' },
    timeout: KROKI_TIMEOUT_MS,
    responseType: 'arraybuffer',
    validateStatus: (s) => s === 200,
    ...(process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0'
      ? { httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }) }
      : {}),
  });
  fs.writeFileSync(outFile, Buffer.from(response.data));
}

export function substituteMermaidPlaceholders(
  storageHtml: string,
  sources: string[],
  attachmentNames: string[],
  options?: { skipDiagramRender?: boolean; includeCaption?: boolean }
): string {
  const includeCaption = options?.includeCaption ?? false;
  let html = storageHtml;
  for (let i = 0; i < sources.length; i++) {
    const re = new RegExp(`<p>MERMAID_PLACEHOLDER_${i}</p>`, 'g');
    if (options?.skipDiagramRender) {
      html = html.replace(
        re,
        `<p><em>Diagram ${i + 1} — not rendered (use upload script without --skip-diagram-render).</em></p>`
      );
      continue;
    }
    const caption = includeCaption
      ? `\n<p><em>Diagram ${i + 1} — programme phase pipeline (Mermaid → SVG).</em></p>`
      : '';
    html = html.replace(re, `${attachmentMacro(attachmentNames[i])}${caption}`);
  }
  return html;
}

export async function prepareMermaidAttachments(
  sources: string[],
  prefix: string
): Promise<{ attachmentNames: string[]; tempFiles: string[] }> {
  const attachmentNames = sources.map((_, i) => `${prefix}-${i}.svg`);
  const tempFiles: string[] = [];
  for (let i = 0; i < sources.length; i++) {
    const tmp = path.join(os.tmpdir(), attachmentNames[i]);
    console.log(`🖼️  Mermaid → SVG (${i + 1}/${sources.length})…`);
    await renderMermaidToSvgFile(sources[i], tmp);
    tempFiles.push(tmp);
  }
  return { attachmentNames, tempFiles };
}
