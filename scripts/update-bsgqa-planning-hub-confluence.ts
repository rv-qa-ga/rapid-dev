#!/usr/bin/env ts-node

/**
 * Update BSGQA Next-Version Planning Hub and create three sub-pages in Confluence
 *
 * 1. Fetches the hub page (TM space, page ID 2979201092)
 * 2. Updates the hub page body with content from BSGQA_Planning_Hub_Overview.txt
 * 3. Creates or updates three child pages: Month-End Process, End-to-End Process, Automation Testing
 *
 * Requires: ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (or JIRA_EMAIL / JIRA_API_TOKEN) in .env.qa
 *
 * Usage:
 *   npx ts-node scripts/update-bsgqa-planning-hub-confluence.ts
 *   npm run docs:update:bsgqa-hub   (if added to package.json)
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

const HUB_PAGE_ID = '2979201092'; // BSGQA Next-Version Planning Hub – Overview
const CONFLUENCE_DIR = path.resolve(__dirname, '../docs/planning/confluence');

const SUBPAGES: { title: string; file: string }[] = [
  { title: 'Month-End Process', file: 'BSGQA_Subpage_Month_End_Process.txt' },
  { title: 'End-to-End Process', file: 'BSGQA_Subpage_End_To_End_Process.txt' },
  { title: 'Automation Testing', file: 'BSGQA_Subpage_Automation_Testing.txt' },
];

/**
 * Convert Confluence wiki markup to storage format (HTML + macros)
 */
function escapeXmlText(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
function convertInlineWikiToStorage(snippet: string): string {
  let s = snippet
    .replace(/\{\{([^}]+)\}\}/g, (_: string, code: string) => '<code>' + escapeXmlText(code) + '</code>')
    .replace(/\[([^|\]]+)\|([^\]]+)\]/g, (_: string, text: string, url: string) => {
      const u = url.trim();
      if (u.startsWith('http')) return `<a href="${escapeXmlAttr(u)}">${text.trim()}</a>`;
      return `<ac:link><ri:page ri:content-title="${escapeXmlAttr(u)}" /><ac:link-body>${text.trim()}</ac:link-body></ac:link>`;
    });
  s = s.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  return s.replace(/&(?!amp;|lt;|gt;|quot;|#\d+;)/g, '&amp;');
}

function wikiMarkupToStorageFormat(wikiMarkup: string): string {
  let html = wikiMarkup;

  // Checkbox runs "* [ ] ..." -> Confluence ac:task-list (before other list conversion)
  const checkboxLineRegex = /^\s*\*\s*\[\s*\]\s+(.+)$/;
  const taskListBlocks: { start: number; end: number; tasks: string[] }[] = [];
  const htmlLines = html.split('\n');
  let idx = 0;
  while (idx < htmlLines.length) {
    const tasks: string[] = [];
    const start = idx;
    while (idx < htmlLines.length && checkboxLineRegex.test(htmlLines[idx])) {
      const m = htmlLines[idx].match(checkboxLineRegex);
      if (m) tasks.push(convertInlineWikiToStorage(m[1].trim()));
      idx++;
    }
    if (tasks.length > 0) {
      taskListBlocks.push({ start, end: idx, tasks });
    } else {
      idx++;
    }
  }
  if (taskListBlocks.length > 0) {
    const replaced: string[] = [];
    let lastEnd = 0;
    for (const block of taskListBlocks) {
      for (let i = lastEnd; i < block.start; i++) replaced.push(htmlLines[i]);
      const taskListXml =
        '<ac:task-list>\n' +
        block.tasks
          .map((body) => {
            // Task-body must be storage XHTML so Confluence shows the label; CDATA hides it
            const safe = body.replace(/]]>/g, ']]]]><![CDATA[>'); // avoid breaking out of any wrapper
            return `  <ac:task>\n    <ac:task-status>incomplete</ac:task-status>\n    <ac:task-body><p>${safe}</p></ac:task-body>\n  </ac:task>`;
          })
          .join('\n') +
        '\n</ac:task-list>';
      replaced.push(taskListXml);
      lastEnd = block.end;
    }
    for (let i = lastEnd; i < htmlLines.length; i++) replaced.push(htmlLines[i]);
    html = replaced.join('\n');
  }

  // Tables: || h1 || h2 || and | c1 | c2 |
  const lines = html.split('\n');
  const out: string[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    // Header row: || a || b || c ||
    if (trimmed.match(/^\|\|.+\|\|$/)) {
      const cells = trimmed.split(/\|\|/).filter((c) => c.trim() !== '');
      const ths = cells.map((c) => `<th>${c.trim()}</th>`).join('');
      out.push('<table class="wrapped confluenceTable"><thead><tr>' + ths + '</tr></thead><tbody>');
      i++;
      // Data rows: | a | b | c |
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
    // Data row only (no header above)
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
    // Close table if we were in body-only rows and now hit non-table line
    const last = out[out.length - 1];
    if (last?.includes('</tr>') && out.some((l) => l.includes('<tbody>')) && !out[out.length - 1]?.includes('</tbody>')) {
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

  // Headers
  html = html.replace(/^h1\. (.*)$/gim, '<h1>$1</h1>');
  html = html.replace(/^h2\. (.*)$/gim, '<h2>$1</h2>');
  html = html.replace(/^h3\. (.*)$/gim, '<h3>$1</h3>');
  html = html.replace(/^h4\. (.*)$/gim, '<h4>$1</h4>');

  // Bold *text*
  html = html.replace(/\*([^*]+)\*/g, '<strong>$1</strong>');
  // Italic _text_
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');

  // Code blocks
  html = html.replace(/\{code(?::(\w+))?\}([\s\S]*?)\{code\}/g, (_m, lang, code) => {
    const language = lang || 'text';
    return `<ac:structured-macro ac:name="code" ac:schema-version="1">
  <ac:parameter ac:name="language">${language}</ac:parameter>
  <ac:plain-text-body><![CDATA[${(code || '').trim()}]]></ac:plain-text-body>
</ac:structured-macro>`;
  });
  // Inline code {{x}}
  html = html.replace(/\{\{([^}]+)\}\}/g, '<code>$1</code>');

  // Links [text|url] or [text|page title]
  html = html.replace(/\[([^|\]]+)\|([^\]]+)\]/g, (_m, text, url) => {
    const u = url.trim();
    if (u.startsWith('http')) return `<a href="${escapeXmlAttr(u)}">${text.trim()}</a>`;
    return `<ac:link><ri:page ri:content-title="${escapeXmlAttr(u)}" /><ac:link-body>${text.trim()}</ac:link-body></ac:link>`;
  });
  // Link by page title only [Page Title]
  html = html.replace(/\[([^\]]+)\]/g, (m, title) => {
    const t = title.trim();
    if (t.includes('|') || t.startsWith('http')) return m;
    return `<ac:link><ri:page ri:content-title="${escapeXmlAttr(t)}" /><ac:link-body>${t}</ac:link-body></ac:link>`;
  });

  // Numbered list # item
  html = html.replace(/^# (.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (m) => {
    if (m.includes('</ol>')) return m;
    return '<ol>' + m + '</ol>';
  });
  // Bullet * item (single line, not bold)
  const ulLines = html.split('\n');
  const result: string[] = [];
  let inOl = false;
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
    if (ln.includes('</li>') && ln.includes('<ol>')) inOl = true;
    if (inOl && !ln.includes('<li>') && !ln.includes('</ol>')) {
      inOl = false;
    }
    result.push(ln);
  }
  if (inUl) result.push('</ul>');
  html = result.join('\n');

  // Paragraphs: wrap standalone lines that are not already HTML
  const finalLines = html.split('\n');
  const processed: string[] = [];
  for (let k = 0; k < finalLines.length; k++) {
    const line = finalLines[k];
    const t = line.trim();
    if (!t) {
      processed.push('');
      continue;
    }
    if (/^<(h[1-6]|table|tr|td|th|ul|ol|li|ac:|ri:|\/)/.test(t) || t.startsWith('<ac:') || t.includes('</') || t.includes('<ac:task')) {
      processed.push(line);
      continue;
    }
    if (!t.startsWith('<')) processed.push('<p>' + line + '</p>');
    else processed.push(line);
  }
  return processed.join('\n');
}

async function main() {
  console.log('\n📄 BSGQA Planning Hub – Update Hub & Create Sub-Pages');
  console.log('═══════════════════════════════════════════════════════════\n');

  if (!ATLASSIAN_EMAIL || !ATLASSIAN_API_TOKEN) {
    console.error('❌ Set ATLASSIAN_EMAIL and ATLASSIAN_API_TOKEN (e.g. in src/config/env/.env.qa)');
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
    // 1) Fetch hub page
    console.log('🔍 Fetching hub page...');
    const { data: hubPage } = await client.get(`/content/${HUB_PAGE_ID}?expand=version,body.storage`);
    const currentVersion = hubPage.version.number;
    console.log(`   Title: ${hubPage.title}, Version: ${currentVersion}`);

    // 2) Read and convert hub overview content
    const hubFile = path.join(CONFLUENCE_DIR, 'BSGQA_Planning_Hub_Overview.txt');
    if (!fs.existsSync(hubFile)) {
      console.error(`❌ Hub content file not found: ${hubFile}`);
      process.exit(1);
    }
    const hubWiki = fs.readFileSync(hubFile, 'utf-8');
    const hubStorage = wikiMarkupToStorageFormat(hubWiki);

    // 3) Update hub page
    console.log('\n📤 Updating hub page body...');
    await client.put(`/content/${HUB_PAGE_ID}`, {
      id: HUB_PAGE_ID,
      type: 'page',
      title: hubPage.title,
      space: { key: CONFLUENCE_SPACE_KEY },
      body: {
        storage: {
          value: hubStorage,
          representation: 'storage',
        },
      },
      version: {
        number: currentVersion + 1,
        message: 'BSGQA Planning Hub – overview and links to sub-pages',
      },
    });
    console.log('   ✅ Hub page updated.');

    // 4) Create or update each sub-page
    for (const sub of SUBPAGES) {
      const subPath = path.join(CONFLUENCE_DIR, sub.file);
      if (!fs.existsSync(subPath)) {
        console.warn(`   ⚠️ Skip ${sub.title}: file not found ${sub.file}`);
        continue;
      }
      const wiki = fs.readFileSync(subPath, 'utf-8');
      const storage = wikiMarkupToStorageFormat(wiki);

      // Check for existing child with this title
      const childList = await client.get(`/content/${HUB_PAGE_ID}/child/page`, {
        params: { limit: 50, expand: 'version' },
      });
      const existing = childList.data.results?.find((p: any) => p.title === sub.title);

      if (existing) {
        console.log(`\n📝 Updating sub-page: ${sub.title} (ID: ${existing.id})`);
        await client.put(`/content/${existing.id}`, {
          id: existing.id,
          type: 'page',
          title: sub.title,
          space: { key: CONFLUENCE_SPACE_KEY },
          body: {
            storage: { value: storage, representation: 'storage' },
          },
          version: {
            number: existing.version.number + 1,
            message: `Updated ${sub.title}`,
          },
        });
        console.log(`   ✅ Updated.`);
      } else {
        console.log(`\n📝 Creating sub-page: ${sub.title}`);
        const { data: created } = await client.post('/content', {
          type: 'page',
          title: sub.title,
          space: { key: CONFLUENCE_SPACE_KEY },
          ancestors: [{ id: HUB_PAGE_ID }],
          body: {
            storage: { value: storage, representation: 'storage' },
          },
        });
        console.log(`   ✅ Created (ID: ${created.id}).`);
      }
    }

    console.log('\n✅ Done.');
    console.log(`\n📎 Hub: ${CONFLUENCE_BASE_URL}/spaces/${CONFLUENCE_SPACE_KEY}/pages/${HUB_PAGE_ID}`);
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
