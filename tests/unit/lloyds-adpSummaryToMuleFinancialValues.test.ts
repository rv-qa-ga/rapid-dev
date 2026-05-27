import { describe, expect, it } from 'vitest';

import { adpSummaryRowToMuleFinancialValues } from '../../src/integrations/lloyds/adpSummaryToMuleFinancialValues';

describe('lloyds/adpSummaryRowToMuleFinancialValues', () => {
  it('maps summary columns to Mule financial_values (mixed-case keys)', () => {
    const row: Record<string, unknown> = {
      Policy_Currency_Code: 'usd',
      TOTAL_PREMIUM_AMOUNT: '10.005',
      TOTAL_MEMBER_COMMISSION_AMOUNT: 2,
      TOTAL_INSURER_COMMISSION_AMOUNT: 3,
      TOTAL_TAX_AMOUNT: 4,
      TOTAL_OTHER_CONTRIBUTIONS_AMOUNT: null,
    };
    const fv = adpSummaryRowToMuleFinancialValues(row);
    expect(fv.adp_currency).toBe('USD');
    expect(fv.adp_prm).toBe(10.01);
    expect(fv.adp_com).toBe(2);
    expect(fv.adp_coi).toBe(3);
    expect(fv.adp_tax).toBe(4);
    expect(fv.adp_oth).toBe(0);
  });
});
