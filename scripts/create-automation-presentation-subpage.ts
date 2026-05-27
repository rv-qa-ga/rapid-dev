#!/usr/bin/env ts-node

/**
 * Create Automation Framework Presentation Sub-Page and Link from Automation Testing Page
 *
 * 1. Creates a new sub-page "Automation Framework Presentation" under the Complete Workflow Guide (2692710418).
 * 2. Appends a "See also" link to that sub-page at the bottom of the TM space Automation Testing page (2978381889).
 *
 * Usage:
 *   npm run docs:create:automation-presentation-subpage
 *
 * Or:
 *   ts-node scripts/create-automation-presentation-subpage.ts
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

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

const CONFLUENCE_BASE_URL = process.env.CONFLUENCE_BASE_URL || 'https://accelins.atlassian.net/wiki';
const CONFLUENCE_SPACE_KEY = process.env.CONFLUENCE_SPACE_KEY || 'TM';
const ATLASSIAN_EMAIL = process.env.ATLASSIAN_EMAIL || process.env.JIRA_EMAIL || '';
const ATLASSIAN_API_TOKEN = process.env.ATLASSIAN_API_TOKEN || process.env.JIRA_API_TOKEN || '';

const WORKFLOW_GUIDE_PAGE_ID = '2692710418'; // QA Automation Framework - Complete Workflow Guide
const AUTOMATION_TESTING_PAGE_ID = '2978381889'; // TM space Automation Testing page
const SUBPAGE_TITLE = 'Automation Framework Presentation';
const SUBPAGE_CONTENT_FILE = path.resolve(__dirname, '../docs/CONFLUENCE_AUTOMATION_PRESENTATION.txt');

const SEE_ALSO_MARKER = 'Automation Framework Presentation'; // used to avoid duplicate block

function wikiMarkupToStorageFormat(wikiMarkup: string): string {
  let html = wikiMarkup;

  html = html.replace(/^h1\. (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/^h2\. (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^h3\. (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^h4\. (.*$)/gim, '<h4>$1</h4>');
  html = html.replace(/\*(.+?)\*/g, '<strong>$1</strong>');
  html = html.replace(/\{code(?::(\w+))?\}([\s\S]*?)\{code\}/g, (_m, lang, code) => {
    const language = lang || 'text';
    return `<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">${language}</ac:parameter>
  <ac:plain-text-body><![CDATA[${(code as string).trim()}]]></ac:plain-text-body>
</ac:structured-macro>`;
  });
  html = html.replace(/\{\{([^}]+)\}\}/g, '<code>$1</code>');
  html = html.replace(/\[([^\|]+)\|([^\]]+)\]/g, (_m, text, url) => {
    if ((url as string).startsWith('http')) {
      return `<a href="${url}">${text}</a>`;
    }
    return `<ac:link><ri:page ri:content-title="${url}" /><ac:link-body>${text}</ac:link-body></ac:link>`;
  });

  const lines = html.split('\n');
  const processed: string[] = [];
  let inList = false;
  let listType: 'ol' | 'ul' | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      if (inList) {
        processed.push(`</${listType}>`);
        inList = false;
        listType = null;
      }
      processed.push('');
      continue;
    }

    if (trimmed.match(/^# (.+)$/)) {
      if (!inList || listType !== 'ol') {
        if (inList) processed.push(`</${listType}>`);
        processed.push('<ol>');
        inList = true;
        listType = 'ol';
      }
      processed.push(`<li>${trimmed.replace(/^# /, '')}</li>`);
      continue;
    }

    if (trimmed.match(/^\* (.+)$/)) {
      if (!inList || listType !== 'ul') {
        if (inList) processed.push(`</${listType}>`);
        processed.push('<ul>');
        inList = true;
        listType = 'ul';
      }
      processed.push(`<li>${trimmed.replace(/^\* /, '')}</li>`);
      continue;
    }

    if (inList) {
      processed.push(`</${listType}>`);
      inList = false;
      listType = null;
    }

    if (trimmed.match(/^<[^>]+>/) || trimmed.match(/^<\/[^>]+>/) || trimmed.match(/^<ac:/) || trimmed.match(/^<ri:/)) {
      processed.push(line);
      continue;
    }

    processed.push(`<p>${line}</p>`);
  }

  if (inList && listType) {
    processed.push(`</${listType}>`);
  }

  return processed.join('\n');
}

function buildSeeAlsoBlock(subPageId: string): string {
  return `
<p><strong>See also</strong></p>
<p><ac:link><ri:page ri:content-id="${subPageId}" /><ac:link-body>${SUBPAGE_TITLE}</ac:link-body></ac:link> — slide-style overview of the framework; open <code>docs/presentation/AutomationPresentation.html</code> from the repo in a browser.</p>`;
}

async function main() {
  console.log('\n📄 Automation Presentation Sub-Page and Automation Testing Link');
  console.log('════════════════════════════════════════════════════════════════\n');

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('❌ ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN must be set');
    process.exit(1);
  }

  if (!fs.existsSync(SUBPAGE_CONTENT_FILE)) {
    console.error(`❌ Content file not found: ${SUBPAGE_CONTENT_FILE}`);
    process.exit(1);
  }

  const auth = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64');
  const client = axios.create({
    baseURL: `${CONFLUENCE_BASE_URL}/rest/api`,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  try {
    const wikiMarkup = fs.readFileSync(SUBPAGE_CONTENT_FILE, 'utf-8');
    const storageFormat = wikiMarkupToStorageFormat(wikiMarkup);

    // 1) Find or create sub-page under Workflow Guide
    let subPageId: string;

    const searchRes = await client.get('/content/search', {
      params: {
        cql: `space = ${CONFLUENCE_SPACE_KEY} AND title = "${SUBPAGE_TITLE}" AND ancestor = ${WORKFLOW_GUIDE_PAGE_ID}`,
        expand: 'version',
      },
    }).catch(() => ({ data: { results: [] } }));

    const existing = searchRes.data?.results?.[0];

    if (existing) {
      subPageId = existing.id;
      console.log(`📌 Found existing sub-page: ${subPageId}`);
      const { data: currentPage } = await client.get(`/content/${subPageId}?expand=version`);
      const updatePayload = {
        id: subPageId,
        type: 'page',
        title: SUBPAGE_TITLE,
        space: { key: CONFLUENCE_SPACE_KEY },
        body: { storage: { value: storageFormat, representation: 'storage' } },
        version: { number: currentPage.version.number + 1, message: 'Updated Automation Framework Presentation' },
      };
      await client.put(`/content/${subPageId}`, updatePayload);
      console.log('   ✅ Sub-page updated');
    } else {
      const createPayload = {
        type: 'page',
        title: SUBPAGE_TITLE,
        space: { key: CONFLUENCE_SPACE_KEY },
        ancestors: [{ id: WORKFLOW_GUIDE_PAGE_ID }],
        body: { storage: { value: storageFormat, representation: 'storage' } },
      };
      const { data: newPage } = await client.post('/content', createPayload);
      subPageId = newPage.id;
      console.log(`✅ Sub-page created: ${subPageId}`);
    }

    const subPageUrl = `${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${subPageId}/${encodeURIComponent(SUBPAGE_TITLE)}`;
    console.log(`   📎 ${subPageUrl}\n`);

    // 2) Append link to Automation Testing page (2978381889) if not already present
    const { data: automationPage } = await client.get(`/content/${AUTOMATION_TESTING_PAGE_ID}?expand=version,body.storage`);
    let content = automationPage.body.storage.value;
    const version = automationPage.version.number;

    if (content.includes(SEE_ALSO_MARKER)) {
      console.log('📌 Automation Testing page already contains link; skipping append.');
    } else {
      content = content + buildSeeAlsoBlock(subPageId);
      await client.put(`/content/${AUTOMATION_TESTING_PAGE_ID}`, {
        id: AUTOMATION_TESTING_PAGE_ID,
        type: 'page',
        title: automationPage.title,
        space: { key: CONFLUENCE_SPACE_KEY },
        body: { storage: { value: content, representation: 'storage' } },
        version: { number: version + 1, message: 'Added link to Automation Framework Presentation sub-page' },
      });
      console.log('✅ Automation Testing page updated with link at bottom.');
    }

    const automationTestingUrl = `${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${AUTOMATION_TESTING_PAGE_ID}/Automation+Testing`;
    console.log(`   📎 Automation Testing: ${automationTestingUrl}`);
    console.log('\n✅ Done.');
  } catch (err: unknown) {
    const e = err as { message?: string; response?: { status?: number; data?: unknown } };
    console.error('❌', e.message ?? e);
    if (e.response) {
      console.error('   Status:', e.response.status);
      console.error('   Data:', JSON.stringify(e.response.data, null, 2));
    }
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
