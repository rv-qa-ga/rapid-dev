#!/usr/bin/env ts-node

/**
 * Create or update "QA Onboarding Progress Tracker" sub-page under Automation Testing (TM space).
 * Reads content from docs/planning/confluence/BSGQA_Subpage_Automation_Onboarding_Progress.txt
 *
 * Usage:
 *   npm run docs:create:onboarding-progress-tracker
 *   ts-node scripts/create-onboarding-progress-tracker-subpage.ts
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

const AUTOMATION_TESTING_PAGE_ID = '2978381889';
const SUBPAGE_TITLE = 'QA Onboarding Progress Tracker';
const SUBPAGE_CONTENT_FILE = path.resolve(__dirname, '../docs/planning/confluence/BSGQA_Subpage_Automation_Onboarding_Progress.txt');

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function wikiMarkupToStorageFormat(wikiMarkup: string): string {
  let html = wikiMarkup;

  // Tables
  const lines = html.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.match(/^\|\|.+\|\|$/)) {
      const cells = trimmed.split(/\|\|/).filter((c) => c.trim() !== '');
      const ths = cells.map((c) => `<th>${c.trim()}</th>`).join('');
      out.push('<table class="wrapped confluenceTable"><thead><tr>' + ths + '</tr></thead><tbody>');
      i++;
      while (i < lines.length && lines[i].trim().match(/^\|.+\|$/) && !lines[i].trim().startsWith('||')) {
        const row = lines[i].trim();
        const cells = row.split(/\|/).filter((c) => c.trim() !== '');
        const tds = cells.map((c) => `<td>${c.trim()}</td>`).join('');
        out.push('<tr>' + tds + '</tr>');
        i++;
      }
      out.push('</tbody></table>');
      continue;
    }
    if (trimmed.match(/^\|.+\|$/)) {
      const cells = trimmed.split(/\|/).filter((c) => c.trim() !== '');
      const tds = cells.map((c) => `<td>${c.trim()}</td>`).join('');
      if (!out[out.length - 1]?.includes('<tbody>')) {
        out.push('<table class="wrapped confluenceTable"><tbody>');
      }
      out.push('<tr>' + tds + '</tr>');
      i++;
      continue;
    }
    const last = out[out.length - 1];
    if (last?.includes('</tr>') && out.some((l) => l.includes('<tbody>')) && !out[out.length - 1]?.includes('</tbody>')) {
      const tableLines = out.filter((l) => l.includes('<tbody>') || l.includes('</table>'));
      if (tableLines.filter((l) => l.includes('<tbody>')).length > tableLines.filter((l) => l.includes('</table>')).length) {
        out.push('</tbody></table>');
      }
    }
    out.push(line);
    i++;
  }
  if (out.some((l) => l.includes('<tbody>')) && !out[out.length - 1]?.includes('</table>')) {
    out.push('</tbody></table>');
  }
  html = out.join('\n');

  html = html.replace(/^h1\. (.*)$/gim, '<h1>$1</h1>');
  html = html.replace(/^h2\. (.*)$/gim, '<h2>$1</h2>');
  html = html.replace(/^h3\. (.*)$/gim, '<h3>$1</h3>');
  html = html.replace(/^h4\. (.*)$/gim, '<h4>$1</h4>');
  html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  html = html.replace(/\{\{([^}]+)\}\}/g, '<code>$1</code>');
  html = html.replace(/\[([^|\]]+)\|([^\]]+)\]/g, (_m: string, text: string, url: string) => {
    const u = url.trim();
    if (u.startsWith('http')) return `<a href="${escapeXmlAttr(u)}">${text.trim()}</a>`;
    return `<ac:link><ri:page ri:content-title="${escapeXmlAttr(u)}" /><ac:link-body>${text.trim()}</ac:link-body></ac:link>`;
  });
  html = html.replace(/\[([^\]]+)\]/g, (m: string, title: string) => {
    const t = title.trim();
    if (t.includes('|') || t.startsWith('http')) return m;
    return `<ac:link><ri:page ri:content-title="${escapeXmlAttr(t)}" /><ac:link-body>${t}</ac:link-body></ac:link>`;
  });

  const ulLines = html.split('\n');
  const result: string[] = [];
  let inUl = false;
  for (let j = 0; j < ulLines.length; j++) {
    const ln = ulLines[j];
    const bulletMatch = ln.match(/^\* ([^*].*)$/);
    if (bulletMatch && !ln.trim().startsWith('<')) {
      if (!inUl) {
        result.push('<ul>');
        inUl = true;
      }
      result.push('<li>' + bulletMatch[1] + '</li>');
      continue;
    }
    if (inUl) {
      result.push('</ul>');
      inUl = false;
    }
    result.push(ln);
  }
  if (inUl) result.push('</ul>');
  html = result.join('\n');

  const finalLines = html.split('\n');
  const processed: string[] = [];
  for (let k = 0; k < finalLines.length; k++) {
    const line = finalLines[k];
    const t = line.trim();
    if (!t) {
      processed.push('');
      continue;
    }
    if (/^<(h[1-6]|table|tr|td|th|ul|ol|li|ac:|ri:|\/)/.test(t) || t.startsWith('<ac:') || t.includes('</')) {
      processed.push(line);
      continue;
    }
    if (!t.startsWith('<')) processed.push('<p>' + line + '</p>');
    else processed.push(line);
  }
  return processed.join('\n');
}

async function main() {
  console.log('\n📄 QA Onboarding Progress Tracker – Create/Update Sub-Page');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('❌ Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (e.g. in .env.qa)');
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

    const searchRes = await client.get('/content/search', {
      params: {
        cql: `space = ${CONFLUENCE_SPACE_KEY} AND title = "${SUBPAGE_TITLE}" AND ancestor = ${AUTOMATION_TESTING_PAGE_ID}`,
        expand: 'version',
      },
    }).catch(() => ({ data: { results: [] } }));

    const existing = searchRes.data?.results?.[0];

    if (existing) {
      const subPageId = existing.id;
      console.log(`📌 Found existing sub-page: ${subPageId}`);
      const { data: currentPage } = await client.get(`/content/${subPageId}?expand=version`);
      await client.put(`/content/${subPageId}`, {
        id: subPageId,
        type: 'page',
        title: SUBPAGE_TITLE,
        space: { key: CONFLUENCE_SPACE_KEY },
        body: { storage: { value: storageFormat, representation: 'storage' } },
        version: { number: currentPage.version.number + 1, message: 'Updated QA Onboarding Progress Tracker' },
      });
      console.log('   ✅ Sub-page updated.');
      console.log(`\n📎 ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${subPageId}/${encodeURIComponent(SUBPAGE_TITLE)}`);
    } else {
      const { data: newPage } = await client.post('/content', {
        type: 'page',
        title: SUBPAGE_TITLE,
        space: { key: CONFLUENCE_SPACE_KEY },
        ancestors: [{ id: AUTOMATION_TESTING_PAGE_ID }],
        body: { storage: { value: storageFormat, representation: 'storage' } },
      });
      console.log(`✅ Sub-page created: ${newPage.id}`);
      console.log(`\n📎 ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${newPage.id}/${encodeURIComponent(SUBPAGE_TITLE)}`);
    }

    console.log('\n✅ Done. Add the link to the Automation Testing page and run docs:update:bsgqa-hub to publish it.');
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
