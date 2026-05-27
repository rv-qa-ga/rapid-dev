#!/usr/bin/env ts-node
/**
 * Fetch SF-311 and all child work items from Jira, then identify which child
 * talks about "Opportunity Team member assignment (After Opportunity Questionnaire
 * is approved and before Opportunity is marked as Due Diligence)".
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { jiraClient } from '../src/integrations/jira/client';
import { logger } from '../src/utils/logger';

const envPaths = [
  path.resolve(process.cwd(), 'src/config/env/.env.qa'),
  path.resolve(process.cwd(), '.env.qa'),
  path.resolve(process.cwd(), '.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    logger.info(`Loaded env from ${envPath}`);
    break;
  }
}

function descriptionToText(desc: any): string {
  if (desc == null) return '';
  if (typeof desc === 'string') return desc;
  if (typeof desc === 'object' && desc.content) {
    const lines: string[] = [];
    function walk(n: any) {
      if (!n) return;
      if (n.text) lines.push(n.text);
      if (n.content && Array.isArray(n.content)) n.content.forEach(walk);
    }
    walk(desc);
    return lines.join(' ');
  }
  return JSON.stringify(desc).slice(0, 2000);
}

async function main() {
  const parentKey = 'SF-311';
  console.log('\n--- Fetching parent issue:', parentKey, '---\n');

  const parent = await jiraClient.getIssueWithFullDetails(parentKey);
  const parentSummary = parent.fields.summary || '';
  const parentDesc = descriptionToText(parent.fields.description);
  console.log(`Parent: ${parent.key}`);
  console.log(`Summary: ${parentSummary}`);
  console.log(`Type: ${parent.fields.issuetype?.name || 'N/A'}`);
  console.log(`Status: ${parent.fields.status?.name || 'N/A'}`);
  console.log(`Description (snippet): ${parentDesc.slice(0, 400)}...\n`);

  const children: { key: string; summary: string; description: string }[] = [];

  if (parent.fields.subtasks && Array.isArray(parent.fields.subtasks)) {
    console.log(`Found ${parent.fields.subtasks.length} subtask(s). Fetching each...\n`);
    for (const st of parent.fields.subtasks) {
      const key = st.key || st;
      try {
        const full = await jiraClient.getIssueWithFullDetails(key);
        const summary = full.fields.summary || '';
        const desc = descriptionToText(full.fields.description);
        children.push({ key, summary, description: desc });
      } catch (e: any) {
        console.error(`Failed to fetch ${key}: ${e.message}`);
      }
    }
  }

  const jql = `parent = ${parentKey}`;
  let searchResults: { key: string; summary: string; description: string }[] = [];
  try {
    const { issues } = await jiraClient.searchIssues(jql, 0, 100);
    const seen = new Set(children.map((c) => c.key));
    for (const iss of issues) {
      if (seen.has(iss.key)) continue;
      seen.add(iss.key);
      const desc = descriptionToText(iss.fields.description);
      searchResults.push({
        key: iss.key,
        summary: iss.fields.summary || '',
        description: desc,
      });
    }
  } catch (e: any) {
    logger.warn(`JQL search failed: ${e.message}`);
  }

  const allChildren = [...children];
  for (const r of searchResults) {
    if (!allChildren.some((c) => c.key === r.key)) allChildren.push(r);
  }

  if (allChildren.length === 0) {
    console.log('No child issues found (no subtasks and JQL returned none).');
    return;
  }

  console.log('--- Child work items ---\n');
  let matchKey: string | null = null;
  let matchSummary = '';
  let matchSnippet = '';

  for (const c of allChildren) {
    const text = `${c.summary} ${c.description}`.toLowerCase();
    const hasTeam = text.includes('opportunity team') || text.includes('team member');
    const hasAssignment = text.includes('assignment') || text.includes('assign');
    const hasQuestionnaire = text.includes('opportunity questionnaire') || text.includes('questionnaire') || text.includes('readiness');
    const hasApproved = text.includes('approved');
    const hasDueDiligence = text.includes('due diligence');

    console.log(`${c.key}: ${c.summary}`);
    console.log(`   Description snippet: ${c.description.slice(0, 280)}...`);
    console.log('');

    if (hasTeam && (hasAssignment || hasQuestionnaire) && (hasApproved || hasDueDiligence)) {
      matchKey = c.key;
      matchSummary = c.summary;
      matchSnippet = c.description.slice(0, 500);
    }
  }

  if (matchKey) {
    console.log('\n--- Match (Opportunity Team assignment after questionnaire approved, before Due Diligence) ---');
    console.log(`Key: ${matchKey}`);
    console.log(`Summary: ${matchSummary}`);
    console.log(`Description snippet: ${matchSnippet}`);
  } else {
    console.log('\nNo child explicitly matched all keywords; review the list above for the one that describes "Opportunity Team member assignment after Opportunity Questionnaire is approved and before Opportunity is marked as Due Diligence".');
  }

  // Explicitly fetch and show SF-653 (Assign Onboarding Team) and SF-658 - likely candidates for "after questionnaire approved, before Due Diligence"
  console.log('\n--- Full description: SF-653 (Assign Onboarding Team) ---');
  try {
    const i653 = await jiraClient.getIssueWithFullDetails('SF-653');
    console.log(descriptionToText(i653.fields.description));
  } catch (e: any) {
    console.log('Error:', e.message);
  }
  console.log('\n--- Full description: SF-658 (Member Onboarding Questionnaire Completion) ---');
  try {
    const i658 = await jiraClient.getIssueWithFullDetails('SF-658');
    console.log(descriptionToText(i658.fields.description));
  } catch (e: any) {
    console.log('Error:', e.message);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
