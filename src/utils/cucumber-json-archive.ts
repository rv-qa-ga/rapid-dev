/**
 * Optional backup of Cucumber JSON after a run (for Zephyr / audits).
 * Enable with ARCHIVE_CUCUMBER_JSON=true (see env.sample).
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

const SOURCE_JSON = path.join(process.cwd(), 'reports', 'json', 'cucumber-report.json');
const ARCHIVE_DIR = path.join(process.cwd(), 'reports', 'json', 'archive');

function truthyEnv(v: string | undefined): boolean {
  const s = (v || '').toLowerCase().trim();
  return s === 'true' || s === '1' || s === 'yes';
}

function sanitizeForFilename(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'no-work-item';
}

function tagName(t: unknown): string | null {
  if (typeof t === 'string') return t;
  if (t && typeof t === 'object' && 'name' in t && typeof (t as { name: unknown }).name === 'string') {
    return (t as { name: string }).name;
  }
  return null;
}

/** Jira-style keys from tags: @SF-883, @SF-883-API-001 → SF-883 */
function collectWorkItemKeysFromReport(data: unknown): string[] {
  const keys = new Set<string>();
  if (!Array.isArray(data)) return [];

  const ingestTags = (tags: unknown) => {
    if (!Array.isArray(tags)) return;
    for (const t of tags) {
      const name = tagName(t);
      if (!name?.startsWith('@')) continue;
      const m = name.match(/^@([A-Z]+-\d+)/);
      if (m) keys.add(m[1]);
    }
  };

  for (const feature of data) {
    if (!feature || typeof feature !== 'object') continue;
    const f = feature as { tags?: unknown; elements?: unknown[] };
    ingestTags(f.tags);
    for (const el of f.elements || []) {
      if (!el || typeof el !== 'object') continue;
      const sc = el as { type?: string; tags?: unknown };
      if (sc.type !== 'scenario') continue;
      ingestTags(sc.tags);
    }
  }
  return [...keys].sort();
}

/**
 * Copy cucumber-report.json into reports/json/archive/ when ARCHIVE_CUCUMBER_JSON is enabled.
 * Filename: cucumber-report-{workItem(s)}-{timestamp}.json
 * - ARCHIVE_WORK_ITEM=SF-883 forces the work segment (use for runs with no matching tags).
 * - Otherwise work items are inferred from scenario/feature tags (e.g. @SF-883-API-001).
 */
export async function archiveCucumberJsonIfEnabled(): Promise<void> {
  if (!truthyEnv(process.env.ARCHIVE_CUCUMBER_JSON)) {
    return;
  }

  await new Promise<void>((resolve) => setImmediate(() => resolve()));

  if (!fs.existsSync(SOURCE_JSON)) {
    logger.warn(`ARCHIVE_CUCUMBER_JSON: skipped — source file not found: ${SOURCE_JSON}`);
    return;
  }

  let workSegment = process.env.ARCHIVE_WORK_ITEM?.trim();
  if (!workSegment) {
    try {
      const raw = fs.readFileSync(SOURCE_JSON, 'utf-8');
      const parsed = JSON.parse(raw) as unknown;
      const keys = collectWorkItemKeysFromReport(parsed);
      workSegment = keys.length > 0 ? keys.join('_') : 'no-work-item';
    } catch (e: unknown) {
      logger.warn(`ARCHIVE_CUCUMBER_JSON: could not parse JSON for work-item inference — ${(e as Error)?.message || e}`);
      workSegment = 'no-work-item';
    }
  }

  workSegment = sanitizeForFilename(workSegment);
  if (workSegment.length > 120) {
    workSegment = `${workSegment.slice(0, 120)}-truncated`;
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  const dest = path.join(ARCHIVE_DIR, `cucumber-report-${workSegment}-${ts}.json`);
  fs.copyFileSync(SOURCE_JSON, dest);
  logger.info(`📁 Archived Cucumber JSON: ${path.relative(process.cwd(), dest)}`);
}
