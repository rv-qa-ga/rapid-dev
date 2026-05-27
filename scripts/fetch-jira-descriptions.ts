#!/usr/bin/env ts-node
/**
 * One-off: Fetch Jira issue summary + description for given keys and write to JSON.
 * Usage: npx ts-node scripts/fetch-jira-descriptions.ts SF-585 SF-660 SF-667 SF-668 SF-723 SF-759
 */
import * as fs from 'fs';
import * as path from 'path';
import { JiraClient } from '../src/integrations/jira/client';

function stripAdf(desc: any): string {
  if (!desc) return '';
  if (typeof desc === 'string') return desc;
  if (desc.content) {
    return (desc.content as any[])
      .map((block: any) => {
        if (block.content) {
          return (block.content as any[])
            .map((c: any) => (c.text != null ? c.text : ''))
            .join('');
        }
        return '';
      })
      .join('\n');
  }
  return JSON.stringify(desc);
}

async function main() {
  const keys = process.argv.slice(2).filter((a) => /^[A-Z]+-\d+$/i.test(a));
  if (keys.length === 0) {
    console.error('Usage: npx ts-node scripts/fetch-jira-descriptions.ts SF-585 SF-660 ...');
    process.exit(1);
  }
  // Config loads .env when imported
  const jira = new JiraClient();
  const out: Record<string, { summary: string; description: string; status: string }> = {};
  for (const key of keys) {
    try {
      const issue = await jira.getIssue(key);
      const summary = issue.fields?.summary || '';
      const rawDesc = issue.fields?.description;
      const description = stripAdf(rawDesc);
      const status = issue.fields?.status?.name || '';
      out[key] = { summary, description, status };
      console.log(`Fetched ${key}: ${summary}`);
    } catch (e: any) {
      console.error(`Failed ${key}:`, e.message);
    }
  }
  const outPath = path.join(process.cwd(), 'temp-jira-descriptions.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf-8');
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
