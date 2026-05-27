/**
 * Read Lloyd's deliverables plan from CSV (Jira/Confluence export).
 * Uses the same CSV parsing pattern as other framework scripts (e.g. verify-sf721-country-import.ts).
 *
 * Usage:
 *   npx ts-node scripts/read-lloyds-deliverables-csv.ts
 *   npx ts-node scripts/read-lloyds-deliverables-csv.ts --csv data/excel/plans_lloyds_deliverables_18032026.csv
 *   npx ts-node scripts/read-lloyds-deliverables-csv.ts --json > data/lloyds_deliverables_work_items.json
 *   npx ts-node scripts/read-lloyds-deliverables-csv.ts --eng-pp   # Only ENG- and PP- keys (exclude AC-)
 *   npx ts-node scripts/read-lloyds-deliverables-csv.ts --automation-scope   # Engineering + Power platform Space only (excludes Accelerant / BSG / Tagetik epics in export)
 */

import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_CSV = path.join(process.cwd(), 'data', 'excel', 'plans_lloyds_deliverables_18032026.csv');

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

function parseCsv(filePath: string): Record<string, string>[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  const records: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = values[idx] ?? '';
    });
    records.push(record);
  }
  return records;
}

export interface LloydsWorkItem {
  hierarchy: string;
  title: string;
  /** Jira Space column from plan export (e.g. Engineering, Power platform, Accelerant Platform) */
  space: string;
  workItemKey: string;
  status: string;
  parentTitle: string;
  priority: string;
  sprint?: string;
  assignee?: string;
}

/** Normalized Space values included in automation testing strategy (excludes Accelerant Platform, etc.). */
export const LLOYDS_AUTOMATION_SCOPE_SPACES_NORMALIZED = new Set(['engineering', 'power platform']);

export function normalizeLloydsSpace(space: string): string {
  return space.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Filter plan rows to Engineering + Power platform only (per programme: focus PP / Engineering / D365 F&O flows;
 * omit Accelerant BDX, Tagetik, UAT delivery epics that live under Accelerant in this export).
 */
export function filterLloydsByAutomationScope(items: LloydsWorkItem[]): LloydsWorkItem[] {
  return items.filter((i) => LLOYDS_AUTOMATION_SCOPE_SPACES_NORMALIZED.has(normalizeLloydsSpace(i.space)));
}

export function readLloydsDeliverablesCsv(csvPath: string): LloydsWorkItem[] {
  const records = parseCsv(csvPath);
  return records.map((r) => ({
    hierarchy: r['Hierarchy'] ?? '',
    title: r['Title'] ?? '',
    space: r['Space'] ?? '',
    workItemKey: r['Work item key'] ?? '',
    status: r['Work item status'] ?? '',
    parentTitle: r['Parent'] ?? '',
    priority: r['Priority'] ?? '',
    sprint: r['Sprint'] ?? undefined,
    assignee: r['Assignee'] ?? undefined,
  }));
}

function main(): void {
  const args = process.argv.slice(2);
  let csvPath = DEFAULT_CSV;
  let outputJson = false;
  let engPpOnly = false;
  let automationScope = false;
  for (let i = 0; i < args.length; i++) {
    if ((args[i] === '--csv' || args[i] === '-c') && args[i + 1]) {
      csvPath = path.resolve(process.cwd(), args[++i]);
    } else if (args[i] === '--json') {
      outputJson = true;
    } else if (args[i] === '--eng-pp') {
      engPpOnly = true;
    } else if (args[i] === '--automation-scope') {
      automationScope = true;
    }
  }

  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}`);
    process.exit(1);
  }

  let items = readLloydsDeliverablesCsv(csvPath);
  if (automationScope) {
    const before = items.length;
    items = filterLloydsByAutomationScope(items);
    console.log(
      `Filtered to automation scope (Space = Engineering | Power platform): ${items.length} of ${before} rows\n`
    );
  }
  if (engPpOnly) {
    items = items.filter((i) => /^(ENG-|PP-)/.test(i.workItemKey));
    console.log(`Filtered to ENG- and PP- keys only: ${items.length} work items\n`);
  }

  if (outputJson) {
    console.log(JSON.stringify({ source: path.basename(csvPath), count: items.length, workItems: items }, null, 2));
    return;
  }

  // Group by epic (parent) for console summary
  const byEpic = new Map<string, LloydsWorkItem[]>();
  const epics: LloydsWorkItem[] = [];
  for (const item of items) {
    if (item.hierarchy === 'Epic') {
      epics.push(item);
      if (!byEpic.has(item.title)) byEpic.set(item.title, []);
    } else {
      const parent = item.parentTitle || 'No parent';
      if (!byEpic.has(parent)) byEpic.set(parent, []);
      byEpic.get(parent)!.push(item);
    }
  }

  console.log(`\nLloyd's deliverables: ${path.basename(csvPath)}`);
  console.log(`Total rows: ${items.length}\n`);
  for (const epic of epics) {
    const children = byEpic.get(epic.title) ?? [];
    console.log(`Epic: ${epic.workItemKey} – ${epic.title}`);
    console.log(`  Status: ${epic.status}  Priority: ${epic.priority}`);
    if (children.length) {
      console.log(`  Children (${children.length}):`);
      for (const c of children.slice(0, 15)) {
        console.log(`    - ${c.workItemKey} [${c.status}] ${c.title.substring(0, 60)}${c.title.length > 60 ? '…' : ''}`);
      }
      if (children.length > 15) console.log(`    ... and ${children.length - 15} more`);
    }
    console.log('');
  }
}

if (require.main === module) {
  main();
}
