import * as fs from 'fs';
import * as path from 'path';

import { describe, expect, it } from 'vitest';

import { computeAdpTotalsFromFile, totalsToServiceBusPayload } from '../../src/integrations/lloyds/xmlTotals';

const SAMPLE = path.resolve(process.cwd(), 'docs/lloyds/XMLs/AEUM US-58338 202604091630.xml');

describe('lloyds/xmlTotals (committed sample)', () => {
  it('reads sample XML and produces finite service-bus totals', () => {
    if (!fs.existsSync(SAMPLE)) {
      throw new Error(`Missing sample XML at ${SAMPLE}`);
    }
    const t = computeAdpTotalsFromFile(SAMPLE);
    expect(t.lineCount).toBeGreaterThan(0);
    const fv = totalsToServiceBusPayload(t);
    expect(Number.isFinite(fv.adp_prm)).toBe(true);
    expect(fv.adp_currency.length).toBeGreaterThanOrEqual(3);
  });
});
