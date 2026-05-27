#!/usr/bin/env ts-node
/**
 * Build a per-repo (and queue / F&O) matrix from Cucumber JSON for Confluence / QA progress.
 *
 * Usage:
 *   npx ts-node scripts/lloyds/repo-matrix-from-cucumber-json.ts [path/to/cucumber-report.json]
 * Default input: reports/json/cucumber-report.json
 * Output: reports/lloyds-repo-matrix.json
 *
 * Used by `npm run docs:upload:lloyds-qa-progress:matrix` and by the Confluence upload script
 * (`--repo-matrix-json` or default reports/lloyds-repo-matrix.json when `--inject-repo-matrix`).
 */

import * as fs from 'fs';
import * as path from 'path';

const DEFAULT_IN = path.resolve(process.cwd(), 'reports/json/cucumber-report.json');
const DEFAULT_OUT = path.resolve(process.cwd(), 'reports/lloyds-repo-matrix.json');

const PLACEHOLDER = '<!-- LLOYDS_REPO_MATRIX_INJECT -->';

export type StepStatus = 'passed' | 'failed' | 'skipped' | 'pending' | 'ambiguous' | 'unknown';

export type RepoMatrix = {
  generatedAt: string;
  sourceCucumberJson: string;
  byRepo: Record<string, Record<string, StepStatus>>;
  queues: Record<string, Record<string, StepStatus>>;
  globalScenarios: Record<string, StepStatus>;
};

function rollupScenarioStatus(steps: any[]): StepStatus {
  const visible = (steps || []).filter((s: any) => !s.hidden);
  if (visible.some((s: any) => s.result?.status === 'failed')) return 'failed';
  if (visible.some((s: any) => s.result?.status === 'ambiguous')) return 'ambiguous';
  if (visible.some((s: any) => s.result?.status === 'pending')) return 'pending';
  if (visible.length > 0 && visible.every((s: any) => s.result?.status === 'skipped')) return 'skipped';
  if (visible.some((s: any) => s.result?.status === 'passed')) return 'passed';
  return 'unknown';
}

function pickScenarioTag(tags: { name?: string }[] | undefined): string | undefined {
  const list = (tags || []).map((t) => t.name || '');
  const pp391 = list.filter((n) => /^@PP-391-[A-Za-z0-9-]+$/.test(n) && n !== '@PP-391');
  if (pp391.length === 0) return undefined;
  // Prefer longest / most specific (e.g. @PP-391-CROSS-READ-001 over nothing)
  pp391.sort((a, b) => b.length - a.length);
  return pp391[0];
}

export function extractRepoFromName(name: string): string | undefined {
  const m1 = name.match(/repository\s+"([^"]+)"/i);
  if (m1) return m1[1];
  const m2 = name.match(/\bfor\s+"([^"]+)"\s*$/i);
  if (m2 && /^US-\d+$/i.test(m2[1])) return m2[1];
  return undefined;
}

function extractQueueFromName(name: string): string | undefined {
  const m = name.match(/queue\s+"([^"]+)"/i);
  return m?.[1];
}

export function parseCucumberJsonToMatrix(
  raw: unknown,
  sourcePath: string
): RepoMatrix {
  const arr = Array.isArray(raw) ? raw : [];
  const matrix: RepoMatrix = {
    generatedAt: new Date().toISOString(),
    sourceCucumberJson: sourcePath,
    byRepo: {},
    queues: {},
    globalScenarios: {},
  };

  for (const feature of arr) {
    const uri = String(feature.uri || '');
    const norm = uri.replace(/\\/g, '/');
    if (!norm.includes('lloyds-pipeline-e2e-readonly') && !norm.includes('lloyds-e2e-readonly-repo')) continue;
    const elements = feature.elements || [];
    for (const el of elements) {
      const name = String(el.name || '');
      const tag = pickScenarioTag(el.tags);
      if (!tag) continue;
      const status = rollupScenarioStatus(el.steps || []);
      const repo = extractRepoFromName(name);
      const queue = extractQueueFromName(name);

      if (repo) {
        if (!matrix.byRepo[repo]) matrix.byRepo[repo] = {};
        matrix.byRepo[repo][tag] = status;
      } else if (queue) {
        if (!matrix.queues[queue]) matrix.queues[queue] = {};
        matrix.queues[queue][tag] = status;
      } else {
        matrix.globalScenarios[tag] = status;
      }
    }
  }

  return matrix;
}

function statusEmoji(s: StepStatus): string {
  switch (s) {
    case 'passed':
      return 'G';
    case 'failed':
      return 'R';
    case 'skipped':
      return '—';
    case 'pending':
    case 'ambiguous':
    case 'unknown':
    default:
      return 'Y';
  }
}

/** Markdown table + legend for Confluence source (pipe tables convert in upload). */
export function repoMatrixToMarkdown(m: RepoMatrix): string {
  const lines: string[] = [];
  lines.push(`*Generated ${m.generatedAt} from \`${path.relative(process.cwd(), m.sourceCucumberJson)}\`.*`);
  lines.push('');
  lines.push('**Legend:** G = passed (green), R = failed (red), Y = ambiguous/unknown, — = skipped.');
  lines.push('');

  const repoIds = Object.keys(m.byRepo).sort();
  const colTags = new Set<string>();
  for (const r of repoIds) {
    Object.keys(m.byRepo[r]).forEach((t) => colTags.add(t));
  }
  const cols = Array.from(colTags).sort();

  if (repoIds.length > 0 && cols.length > 0) {
    lines.push('### Per repository (ten-repo matrix)');
    lines.push('');
    const header = ['Repo', ...cols.map(shortenTag)];
    lines.push(`| ${header.join(' | ')} |`);
    lines.push(`| ${header.map(() => '---').join(' | ')} |`);
    for (const repo of repoIds) {
      const row = [repo, ...cols.map((c) => statusEmoji(m.byRepo[repo][c] || 'unknown'))];
      lines.push(`| ${row.join(' | ')} |`);
    }
    lines.push('');
  } else {
    lines.push('*(No per-repo rows found in Cucumber JSON for `lloyds-pipeline-e2e-readonly`.)*');
    lines.push('');
  }

  const qNames = Object.keys(m.queues).sort();
  if (qNames.length > 0) {
    lines.push('### Service Bus queue scenarios');
    lines.push('');
    lines.push('| Queue | Status tag | R/Y/G |');
    lines.push('| --- | --- | --- |');
    for (const q of qNames) {
      for (const [t, st] of Object.entries(m.queues[q])) {
        lines.push(`| \`${q}\` | ${t} | ${statusEmoji(st)} |`);
      }
    }
    lines.push('');
  }

  const globals = Object.entries(m.globalScenarios).sort(([a], [b]) => a.localeCompare(b));
  if (globals.length > 0) {
    lines.push('### Other E2E scenarios (Fabric / F&O / …)');
    lines.push('');
    lines.push('| Tag | R/Y/G |');
    lines.push('| --- | --- |');
    for (const [t, st] of globals) {
      lines.push(`| ${t} | ${statusEmoji(st)} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function shortenTag(tag: string): string {
  return tag.replace(/^@PP-391-/, '');
}

/** Replace the placeholder in QA progress markdown, or append if missing. */
export function injectRepoMatrixIntoMarkdown(md: string, fragment: string): string {
  if (md.includes(PLACEHOLDER)) {
    return md.replace(PLACEHOLDER, fragment.trimEnd());
  }
  return md;
}

function parseArgs(argv: string[]): { input: string; output: string } {
  const nonFlags = argv.filter((a) => !a.startsWith('-'));
  const input = nonFlags[0] ? path.resolve(process.cwd(), nonFlags[0]) : DEFAULT_IN;
  const outIdx = argv.indexOf('-o');
  const output =
    outIdx >= 0 && argv[outIdx + 1] ? path.resolve(process.cwd(), argv[outIdx + 1]) : DEFAULT_OUT;
  return { input, output };
}

/** Load `reports/lloyds-repo-matrix.json` (written by this script), not raw Cucumber JSON. */
export function loadRepoMatrixMarkdownFromJsonFile(matrixJsonPath: string): string | null {
  if (!fs.existsSync(matrixJsonPath)) return null;
  const raw = JSON.parse(fs.readFileSync(matrixJsonPath, 'utf-8'));
  if (!raw || typeof raw !== 'object' || typeof raw.generatedAt !== 'string' || typeof raw.byRepo !== 'object') {
    return null;
  }
  return repoMatrixToMarkdown(raw as RepoMatrix);
}

async function main() {
  const argv = process.argv.slice(2);
  const { input, output } = parseArgs(argv);

  if (!fs.existsSync(input)) {
    console.error(`Input not found: ${input}`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(input, 'utf-8'));
  const matrix = parseCucumberJsonToMatrix(raw, input);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(matrix, null, 2), 'utf-8');
  console.log(`Wrote ${path.relative(process.cwd(), output)}`);
  const mdPath = output.replace(/\.json$/i, '.md');
  fs.writeFileSync(mdPath, repoMatrixToMarkdown(matrix), 'utf-8');
  console.log(`Wrote ${path.relative(process.cwd(), mdPath)}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
