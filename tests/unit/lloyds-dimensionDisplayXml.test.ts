import * as fs from 'fs';
import * as path from 'path';

import { describe, expect, it } from 'vitest';

import {
  assertLedgerDimensionDisplayRows,
  extractLedgerDimensionDisplayRowsFromFile,
} from '../../src/integrations/lloyds/dimensionDisplayXml';
import { LLOYDS_CLONED_REPOSITORY_IDS } from '../../src/integrations/lloyds/lloydsClonedRepoCohort';

const XML_DIR = path.resolve(process.cwd(), 'docs/lloyds/XMLs');

/** Classic `AEUM US-xxxxx YYYYMMDDHHMM.xml` only — WBX exports are covered by a separate case. */
function committedClassicXmlPaths(): string[] {
  if (!fs.existsSync(XML_DIR)) return [];
  const classicRe = /^[A-Z]{3,4} [A-Z]{2}-\d+ \d{12}\.xml$/i;
  return fs
    .readdirSync(XML_DIR)
    .filter((n) => n.toLowerCase().endsWith('.xml') && classicRe.test(n))
    .map((n) => path.join(XML_DIR, n));
}

function wbxXmlPathsForClonedCohort(): string[] {
  if (!fs.existsSync(XML_DIR)) return [];
  const cohort = new Set(LLOYDS_CLONED_REPOSITORY_IDS.map((s) => s.toUpperCase()));
  const wbxRe = /^(?:WBX|WRX)_(?<repo>[A-Z]{2}-\d+)_/i;
  const bestByRepo = new Map<string, { n: string; mtime: number }>();
  for (const n of fs.readdirSync(XML_DIR)) {
    if (!n.toLowerCase().endsWith('.xml')) continue;
    const up = n.toUpperCase();
    if (!up.startsWith('WBX_') && !up.startsWith('WRX_')) continue;
    const m = n.match(wbxRe);
    const repo = m?.groups?.repo?.toUpperCase();
    if (!repo || !cohort.has(repo)) continue;
    const full = path.join(XML_DIR, n);
    const mtime = fs.statSync(full).mtimeMs;
    const prev = bestByRepo.get(repo);
    if (!prev || mtime > prev.mtime) bestByRepo.set(repo, { n: full, mtime });
  }
  return [...bestByRepo.values()]
    .map((x) => x.n)
    .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));
}

describe('lloyds/dimensionDisplayXml (PP-392-UI-008)', () => {
  it('extracts rows and passes tilde / LOB rules on committed sample', () => {
    const sample = path.join(XML_DIR, 'AEUM US-58338 202604091630.xml');
    const rows = extractLedgerDimensionDisplayRowsFromFile(sample);
    expect(rows.length).toBeGreaterThan(0);
    expect(() => assertLedgerDimensionDisplayRows(rows)).not.toThrow();
  });

  it.each(committedClassicXmlPaths())(
    'dimension display rules hold for every classic XML under docs/lloyds/XMLs (%s)',
    (xmlPath) => {
      const rows = extractLedgerDimensionDisplayRowsFromFile(xmlPath);
      expect(rows.length).toBeGreaterThan(0);
      expect(() => assertLedgerDimensionDisplayRows(rows)).not.toThrow();
    },
  );

  it.each(wbxXmlPathsForClonedCohort())(
    'dimension display rules hold for WBX fixture per cloned repo (one file per repo) (%s)',
    (xmlPath) => {
      const rows = extractLedgerDimensionDisplayRowsFromFile(xmlPath);
      expect(rows.length).toBeGreaterThan(0);
      expect(() => assertLedgerDimensionDisplayRows(rows)).not.toThrow();
    },
  );
});
