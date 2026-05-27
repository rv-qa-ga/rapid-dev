/**
 * One-off: create Jira Bug for SF-594/595 E2E sync failures and link to parent stories.
 * Run: cross-env ENV=qamerge npx ts-node scripts/create-sf594-595-sync-bug.ts
 */
import axios from 'axios';
import * as dotenv from 'dotenv';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

const SUMMARY =
  '[qamerge] SF-594 / SF-595 E2E: Contact and AccountTeamMember not in Dataverse RDM (qatest2) after 60s';

const DESCRIPTION_PLAIN = fs.readFileSync(
  path.join(__dirname, '../docs/bugs/SF-594-595-e2e-mulesoft-d365-sync-failure.md'),
  'utf8'
);

function plainToAdf(markdown: string): { type: string; version: number; content: unknown[] } {
  const content: unknown[] = [];
  for (const block of markdown.split(/\n\n+/)) {
    const line = block.trim();
    if (!line || line.startsWith('#') || line.startsWith('---') || line.startsWith('```')) continue;
    if (line.startsWith('|') || line.startsWith('- [ ]')) continue;
    if (line.startsWith('Use this when')) continue;

    if (line.startsWith('## ')) {
      content.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: line.replace(/^##\s+/, '') }],
      });
      continue;
    }
    if (line.startsWith('### ')) {
      content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: line.replace(/^###\s+/, '') }],
      });
      continue;
    }

    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: line.replace(/\n/g, ' ').slice(0, 8000) }],
    });
  }
  return { type: 'doc', version: 1, content: content.length ? content : [{ type: 'paragraph', content: [{ type: 'text', text: SUMMARY }] }] };
}

async function main(): Promise<void> {
  const envName = process.env.ENV || 'qamerge';
  const envFile = path.join(__dirname, `../src/config/env/.env.${envName}`);
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: true });
  }

  const baseURL = (process.env.JIRA_BASE_URL || 'https://accelins.atlassian.net').replace(/\/+$/, '');
  const email = process.env.JIRA_EMAIL || process.env.ATLASSIAN_EMAIL;
  const token =
    process.env.JIRA_API_TOKEN ||
    process.env.ATLASSIAN_API_TOKEN ||
    process.env.JIRA_AUTOMATION_TOKEN;

  if (!email || !token) {
    throw new Error('Set JIRA_EMAIL and JIRA_API_TOKEN in .env.qamerge');
  }

  const client = axios.create({
    baseURL: `${baseURL}/rest/api/3/`,
    auth: { username: email, password: token },
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    httpsAgent: new https.Agent({
      rejectUnauthorized: process.env.JIRA_REJECT_UNAUTHORIZED !== 'false',
    }),
  });

  const { data: created } = await client.post<{ key: string }>('issue', {
    fields: {
      project: { key: 'SF' },
      issuetype: { name: 'Bug' },
      summary: SUMMARY,
      description: plainToAdf(DESCRIPTION_PLAIN),
      labels: ['qamerge', 'mulesoft', 'd365', 'integration', 'e2e', 'SF-594', 'SF-595', 'automation'],
    },
  });

  console.log(`Created: ${baseURL}/browse/${created.key}`);

  for (const related of ['SF-594', 'SF-595']) {
    try {
      await client.post('issueLink', {
        type: { name: 'Relates' },
        inwardIssue: { key: created.key },
        outwardIssue: { key: related },
      });
      console.log(`Linked ${created.key} Relates ${related}`);
    } catch (e: unknown) {
      const msg = axios.isAxiosError(e) ? JSON.stringify(e.response?.data) : String(e);
      console.warn(`Link to ${related} failed: ${msg}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
