#!/usr/bin/env ts-node

/**
 * Add "Introduction to Lloyd's of London" section to the main Lloyd's Confluence page.
 * Page ID: 3020062774 (TM space) — tries current then draft if 404.
 *
 * Uses the framework Confluence client (src/integrations/confluence/client.ts).
 * If you get 404: the page may still be a draft. Publish it first, then run this script again.
 * Alternatively paste the content from docs/lloyds/LLOYDS_INTRODUCTION_FOR_MAIN_PAGE.txt into the page.
 *
 * Usage: npx ts-node scripts/add-lloyds-intro-to-confluence-page.ts
 *        npx ts-node scripts/add-lloyds-intro-to-confluence-page.ts --page-id <id>
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { ConfluenceClient } from '../src/integrations/confluence/client';

const envPaths = [
  path.resolve(__dirname, '../src/config/env/.env.qa'),
  path.resolve(__dirname, '../.env.qa'),
  path.resolve(__dirname, '../.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    break;
  }
}

const DEFAULT_PAGE_ID = '3020062774';

const INTRODUCTION_HTML = `
<h2>Introduction to Lloyd's of London</h2>
<p>Lloyd's of London began in the late 17th century as a coffee house owned by Edward Lloyd around 1686 in Tower Street, London. It became a popular meeting place for merchants, shipowners, and sailors who needed marine insurance for ships and cargo travelling across the world. Investors would gather there to agree to insure voyages, each writing their name under the amount they were willing to cover—this practice gave rise to the term <strong>"underwriter."</strong> By the 18th century, Lloyd's had evolved from an informal gathering into a structured marketplace for insurance.</p>
<p>Over time, Lloyd's expanded beyond marine insurance to cover a wide range of risks, including property, aviation, energy, cyber, and even highly unusual or complex risks. It is not an insurance company itself, but a <strong>marketplace</strong> where members (individuals and corporations) join together in syndicates to insure risks. Lloyd's played a major role in insuring historic events such as the Titanic and has adapted through major challenges, including massive losses from asbestos claims and natural catastrophes in the late 20th century. Today, it remains one of the world's leading specialty insurance markets, operating in over 200 countries and territories.</p>
<h3>Cool facts about Lloyd's of London</h3>
<ul>
<li>The term <strong>"underwriter"</strong> comes from investors literally writing their names under the risk details at Lloyd's coffee house.</li>
<li>Lloyd's once insured Betty Grable's legs for $1 million in the 1940s.</li>
<li>It has insured unusual risks like taste buds of wine tasters, famous voices, and even body parts of celebrities.</li>
<li>Lloyd's insured parts of the Titanic and paid out claims after it sank in 1912.</li>
<li>The iconic Lloyd's building (opened in 1986) in London has its elevators, pipes, and ducts on the outside, giving it an "inside-out" architectural design.</li>
<li>Lloyd's played a major role in developing modern marine and reinsurance practices used worldwide today.</li>
</ul>
<hr />
`;

async function main() {
  const pageId = process.argv.includes('--page-id')
    ? process.argv[process.argv.indexOf('--page-id') + 1] || DEFAULT_PAGE_ID
    : DEFAULT_PAGE_ID;

  const client = new ConfluenceClient();
  if (!client.isConfigured()) {
    console.error('❌ ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set');
    process.exit(1);
  }

  try {
    console.log('📖 Fetching main page (trying current then draft)...');
    let page = await client.getPage(pageId);
    let isDraft = false;
    if (!page) {
      page = await client.getPage(pageId, { status: 'draft' });
      isDraft = !!page;
    }

    if (!page) {
      console.error('❌ Page not found (ID: ' + pageId + '). Publish the page or check the ID.');
      process.exit(1);
    }

    if (page.body?.storage?.value?.includes('Introduction to Lloyd\'s of London')) {
      console.log('ℹ️  Introduction section already present; skipping.');
      return;
    }

    const currentContent = page.body?.storage?.value ?? '';
    const currentVersion = page.version?.number ?? 1;
    const newContent = INTRODUCTION_HTML.trim() + '\n\n' + currentContent;

    console.log('📤 Updating page with introduction at top...');
    await client.updatePageContent(pageId, newContent, currentVersion + 1, {
      title: page.title,
      message: 'Added Introduction to Lloyd\'s of London',
      ...(isDraft && { status: 'draft' as const }),
    });

    console.log('✅ Done. View: ' + client.getBaseUrl() + '/spaces/' + (process.env.CONFLUENCE_SPACE_KEY || 'TM') + '/pages/' + pageId);
  } catch (err: any) {
    console.error('❌', err.message);
    if (err.response) console.error(err.response.status, err.response.data);
    process.exit(1);
  }
}

main().catch(console.error);
