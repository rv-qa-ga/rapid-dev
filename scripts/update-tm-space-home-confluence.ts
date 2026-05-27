#!/usr/bin/env ts-node

/**
 * Update TM space overview / home page in Confluence
 *
 * The page at https://accelins.atlassian.net/wiki/spaces/TM/overview is the space home.
 * This script updates it with the description and links from TM_Space_Overview_Home.txt.
 *
 * Uses Confluence API v2 to get the TM space's homepageId, then v1 content API to update the page.
 * Override with CONFLUENCE_TM_HOME_PAGE_ID if the space home is not set or you want a specific page.
 *
 * Requires: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (or JIRA_EMAIL / JIRA_API_TOKEN) in .env.qa
 *
 * Usage:
 *   npx ts-node scripts/update-tm-space-home-confluence.ts
 *   npm run docs:update:tm-home
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
const TM_HOME_PAGE_ID_OVERRIDE = process.env.CONFLUENCE_TM_HOME_PAGE_ID || '';

const CONFLUENCE_DIR = path.resolve(__dirname, '../docs/planning/confluence');
const HOME_CONTENT_FILE = path.join(CONFLUENCE_DIR, 'TM_Space_Overview_Home.txt');

/**
 * Convert Confluence wiki markup to storage format (same logic as update-bsgqa-planning-hub-confluence.ts)
 */
function wikiMarkupToStorageFormat(wikiMarkup: string): string {
  let html = wikiMarkup;
  const lines = html.split('\n');
  const out: string[] = [];
  let i = 0;

  // Tables
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const isHeaderRow = /^\|\|.+\|\|$/.test(trimmed);
    const isBodyRow = !isHeaderRow && /^\|.+\|$/.test(trimmed);

    if (isHeaderRow) {
      const cells = trimmed.split(/\|\|/).filter((c) => c.trim() !== '');
      const ths = cells.map((c) => `<th>${c.trim()}</th>`).join('');
      out.push('<table class="wrapped confluenceTable"><thead><tr>' + ths + '</tr></thead><tbody>');
      i++;
      while (i < lines.length && /^\|.+\|$/.test(lines[i].trim()) && !lines[i].trim().startsWith('||')) {
        const row = lines[i].trim();
        const cells = row.split(/\|/).filter((c) => c.trim() !== '');
        const tds = cells.map((c) => `<td>${c.trim()}</td>`).join('');
        out.push('<tr>' + tds + '</tr>');
        i++;
      }
      out.push('</tbody></table>');
      continue;
    }
    if (isBodyRow) {
      const last = out[out.length - 1];
      if (!last?.includes('<tbody>') || last?.includes('</table>')) out.push('<table class="wrapped confluenceTable"><tbody>');
      const cells = trimmed.split(/\|/).filter((c) => c.trim() !== '');
      const tds = cells.map((c) => `<td>${c.trim()}</td>`).join('');
      out.push('<tr>' + tds + '</tr>');
      i++;
      continue;
    }
    const last = out[out.length - 1];
    if (last?.includes('</tr>')) {
      const tableLines = out.filter((l) => l.includes('<tbody>') || l.includes('</table>'));
      const opened = tableLines.filter((l) => l.includes('<tbody>')).length;
      const closed = tableLines.filter((l) => l.includes('</table>')).length;
      if (opened > closed) out.push('</tbody></table>');
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
    if (u.startsWith('http')) return `<a href="${u}">${text.trim()}</a>`;
    return `<ac:link><ri:page ri:content-title="${u}" /><ac:link-body>${text.trim()}</ac:link-body></ac:link>`;
  });
  html = html.replace(/\[([^\]]+)\]/g, (m: string, title: string) => {
    const t = title.trim();
    if (t.includes('|') || /^https?:\/\//i.test(t)) return m;
    return `<ac:link><ri:page ri:content-title="${t}" /><ac:link-body>${t}</ac:link-body></ac:link>`;
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
  console.log('\n📄 TM Space Home – Update overview page');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('❌ Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (e.g. in src/config/env/.env.qa)');
    process.exit(1);
  }

  if (!fs.existsSync(HOME_CONTENT_FILE)) {
    console.error(`❌ Content file not found: ${HOME_CONTENT_FILE}`);
    process.exit(1);
  }

  const auth = Buffer.from(`${ATLASSIAN_EMAIL}:${ATLASSIAN_API_TOKEN}`).toString('base64');
  const restApi = axios.create({
    baseURL: `${CONFLUENCE_BASE_URL}/rest/api`,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  let homePageId = TM_HOME_PAGE_ID_OVERRIDE;

  if (!homePageId) {
    try {
      console.log('🔍 Fetching TM space (API v2) for homepageId...');
      const v2 = axios.create({
        baseURL: `${CONFLUENCE_BASE_URL}/api/v2`,
        headers: {
          Authorization: `Basic ${auth}`,
          Accept: 'application/json',
        },
      });
      const { data: spaceList } = await v2.get('/spaces', { params: { keys: CONFLUENCE_SPACE_KEY } });
      const space = spaceList.results?.[0];
      if (space?.homepageId && space.homepageId !== '0') {
        homePageId = String(space.homepageId);
        console.log(`   Home page ID: ${homePageId} (from space "${space.name}")`);
      }
    } catch (err: any) {
      console.warn('   Could not get space homepage:', err.message);
    }
  } else {
    console.log(`   Using CONFLUENCE_TM_HOME_PAGE_ID: ${homePageId}`);
  }

  if (!homePageId) {
    console.error('❌ No home page ID. Set space home in Confluence (Space settings → Overview) or set CONFLUENCE_TM_HOME_PAGE_ID.');
    process.exit(1);
  }

  try {
    console.log('\n🔍 Fetching current page...');
    const { data: page } = await restApi.get(`/content/${homePageId}?expand=version,body.storage`);
    const currentVersion = page.version.number;
    console.log(`   Title: ${page.title}, Version: ${currentVersion}`);

    const wiki = fs.readFileSync(HOME_CONTENT_FILE, 'utf-8');
    const storage = wikiMarkupToStorageFormat(wiki);

    console.log('\n📤 Updating page body...');
    await restApi.put(`/content/${homePageId}`, {
      id: homePageId,
      type: 'page',
      title: page.title,
      space: { key: CONFLUENCE_SPACE_KEY },
      body: {
        storage: { value: storage, representation: 'storage' },
      },
      version: {
        number: currentVersion + 1,
        message: 'TM space home: description and links to test management artifacts',
      },
    });
    console.log('   ✅ Page updated.');

    console.log('\n✅ Done.');
    console.log(`\n📎 TM space overview: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/overview`);
  } catch (err: any) {
    console.error('\n❌ Error:', err.message);
    if (err.response) {
      console.error('   Status:', err.response.status);
      console.error('   Data:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
