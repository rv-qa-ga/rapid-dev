#!/usr/bin/env ts-node
/**
 * Fetch BA Confluence pages for CLM Dataverse → Salesforce migration.
 *
 * - https://accelins.atlassian.net/wiki/spaces/SA/pages/3155165214
 * - https://accelins.atlassian.net/wiki/spaces/SA/pages/3180691488
 *
 * Usage:
 *   npx ts-node scripts/fetch-clm-ba-migration-confluence.ts
 *   npm run docs:fetch:clm-ba-migration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';
import { storageHtmlToPlainText } from '../src/integrations/confluence/storage-html-to-plain';

const PAGES: Array<{ id: string; slug: string }> = [
  { id: '3155165214', slug: 'etl-overview-key-principles' },
  { id: '3180691488', slug: 'per-object-migration-procedures' },
];

const envPaths = [
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(__dirname, '../src/config/env/.env.qamerge'),
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`Loaded env: ${path.relative(process.cwd(), envPath)}`);
    break;
  }
}

async function main(): Promise<void> {
  const client = new ConfluenceClient();
  if (!client.isConfigured()) {
    console.error('Confluence not configured (ATLASSIAN_EMAIL + ATLASSIAN_API_TOKEN)');
    process.exit(2);
  }

  const outDir = path.resolve(process.cwd(), 'docs', 'clm', 'confluence-sources');
  fs.mkdirSync(outDir, { recursive: true });

  const combined: string[] = [
    '# CLM BA migration documentation (Confluence export)\n',
    `*Generated: ${new Date().toISOString()}*\n`,
  ];

  for (const { id, slug } of PAGES) {
    const page = await client.getPage(id, { expand: 'version,body.storage' });
    if (!page) {
      console.error(`Page ${id} not found or forbidden`);
      process.exit(3);
    }

    const html = page.body?.storage?.value ?? '';
    const plain = storageHtmlToPlainText(html);
    const wikiUrl = `${client.getBaseUrl()}/spaces/SA/pages/${id}`;

    const single = [
      `# ${page.title}`,
      '',
      `**Confluence:** ${wikiUrl}`,
      `**Page ID:** ${id}`,
      `**Version:** ${page.version?.number ?? '?'}`,
      '',
      plain,
    ].join('\n');

    const singlePath = path.join(outDir, `${slug}.md`);
    fs.writeFileSync(singlePath, single, 'utf-8');
    console.log(`Wrote ${singlePath} (${plain.length} chars)`);

    combined.push(`\n---\n\n## ${page.title}\n\n**Wiki:** ${wikiUrl}\n\n${plain}\n`);
  }

  const combinedPath = path.join(outDir, 'README.md');
  fs.writeFileSync(combinedPath, combined.join('\n'), 'utf-8');
  console.log(`Wrote ${combinedPath}`);
}

main().catch((e) => {
  console.error(e?.message || e);
  process.exit(1);
});
