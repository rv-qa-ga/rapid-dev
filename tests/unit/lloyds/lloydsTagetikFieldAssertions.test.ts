import { describe, expect, it } from 'vitest';
import {
  pickTagetikRowForRun,
  validateTagetikJournalLineFieldsPresent,
  validateTagetikNumericOverlapWithAdpSummary,
} from '../../../src/integrations/lloyds/lloydsTagetikFieldAssertions';

describe('lloydsTagetikFieldAssertions', () => {
  it('pickTagetikRowForRun prefers repo+run match', () => {
    const rows = [
      { REPOSITORY_ID: 'US-X', _ACCEL_UNIQUE_RUN_ID: 'aaa', DEBIT_AMOUNT: 1 },
      { REPOSITORY_ID: 'US-56464', _ACCEL_UNIQUE_RUN_ID: 'BBB', DEBIT_AMOUNT: 2, CREDIT_AMOUNT: 0 },
    ];
    const r = pickTagetikRowForRun(rows as any, 'US-56464', 'bbb');
    expect(r?.DEBIT_AMOUNT).toBe(2);
  });

  it('validateTagetikJournalLineFieldsPresent requires debit or credit', () => {
    expect(validateTagetikJournalLineFieldsPresent({ A: 1 } as any).length).toBeGreaterThan(0);
    expect(validateTagetikJournalLineFieldsPresent({ DEBIT_AMOUNT: 10 } as any)).toEqual([]);
  });

  it('validateTagetikNumericOverlapWithAdpSummary compares magnitudes when columns overlap', () => {
    const summary = { TOTAL_PREMIUM_AMOUNT: 100, TOTAL_MEMBER_COMMISSION_AMOUNT: -50 } as any;
    const tag = { TOTAL_PREMIUM_AMOUNT: -100, TOTAL_MEMBER_COMMISSION_AMOUNT: 50 } as any;
    expect(validateTagetikNumericOverlapWithAdpSummary(summary, tag, 5)).toEqual([]);
  });
});
