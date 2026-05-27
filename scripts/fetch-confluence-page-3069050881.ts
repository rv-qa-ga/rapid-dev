#!/usr/bin/env ts-node
/**
 * One-off: fetch TM Confluence "Lloyds QA Environment Access and Blocker Management"
 * https://accelins.atlassian.net/wiki/spaces/TM/pages/3069050881
 *
 * Usage: npx ts-node scripts/fetch-confluence-page-3069050881.ts [--out reports/lloyds-qa-env-confluence.txt]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

const PAGE_ID = '3069050881';

const envPaths = [
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    process.stderr.write(`Loaded env: ${path.relative(process.cwd(), envPath)}\n`);
    break;
  }
}

async function main(): Promise<void> {
  const { ConfluenceClient } = await import('../src/integrations/confluence/client');
  const { storageHtmlToPlainText } = await import('../src/integrations/confluence/storage-html-to-plain');
  let out = path.resolve(process.cwd(), 'reports', 'lloyds-qa-env-confluence.txt');
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--out' || args[i] === '-o') && args[i + 1]) {
      out = path.resolve(process.cwd(), args[++i]);
    }
  }

  const client = new ConfluenceClient();
  if (!client.isConfigured()) {
    process.stderr.write('Confluence not configured (ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN)\n');
    process.exit(2);
  }

  const page = await client.getPage(PAGE_ID, { expand: 'version,body.storage' });
  if (!page) {
    process.stderr.write(`Page ${PAGE_ID} not found or forbidden\n`);
    process.exit(3);
  }

  const html = (page as { body?: { storage?: { value: string } } }).body?.storage?.value ?? '';
  const plain = storageHtmlToPlainText(html);

  const needle =
    /lloyds integrated qa env|integrated qa|SQLSERVER|dimensionattributevaluecombination|dbo\.|datawarehouse\.fabric|\.database\.windows\.net|mirroredwarehouse|fabric/i;
  const lines = plain
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const hits = lines.filter((l) => needle.test(l));

  const chunks: string[] = [];
  chunks.push(`# ${page.title}\n`);
  chunks.push(`Page ID: ${PAGE_ID}\n`);
  chunks.push('\n## Keyword lines (subset)\n\n');
  chunks.push(hits.join('\n\n'));
  chunks.push('\n\n---\n\n## Full plain text\n\n');
  chunks.push(plain);

  const dir = path.dirname(out);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(out, chunks.join(''), 'utf-8');
  process.stderr.write(`Wrote ${out} (${plain.length} chars plain, ${hits.length} keyword lines)\n`);
}

main().catch((e) => {
  process.stderr.write(String(e?.message || e));
  process.exit(1);
});
