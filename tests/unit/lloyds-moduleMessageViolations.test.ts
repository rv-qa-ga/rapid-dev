import { describe, expect, it } from 'vitest';

import { applyModuleFieldViolation, parseViolationSpec } from '../../src/integrations/lloyds/moduleMessageViolations';

describe('lloyds/moduleMessageViolations', () => {
  it('parseViolationSpec splits message type and slug', () => {
    expect(parseViolationSpec('mule-xml-generation-success|omit_blob_id')).toEqual({
      messageType: 'mule-xml-generation-success',
      slug: 'omit_blob_id',
      key: 'mule-xml-generation-success|omit_blob_id',
    });
  });

  it('applyModuleFieldViolation removes blob_id', () => {
    const base = {
      message: 'mule-xml-generation-success',
      correlation_id: 'c1',
      file_name: 'f.xml',
      blob_id: 'https://x/blob/f.xml',
      financial_values: { adp_currency: 'USD', adp_prm: 1, adp_com: 0, adp_coi: 0, adp_tax: 0, adp_oth: 0 },
    };
    const out = applyModuleFieldViolation(base, 'mule-xml-generation-success|omit_blob_id');
    expect(out.blob_id).toBeUndefined();
    expect(out.correlation_id).toBe('c1');
  });

  it('applyModuleFieldViolation does not mutate input', () => {
    const base = {
      message: 'mule-xml-generation-success',
      correlation_id: 'c1',
      file_name: 'f.xml',
      blob_id: 'b',
      financial_values: { adp_currency: 'USD', adp_prm: 1, adp_com: 0, adp_coi: 0, adp_tax: 0, adp_oth: 0 },
    };
    applyModuleFieldViolation(base, 'mule-xml-generation-success|omit_blob_id');
    expect(base.blob_id).toBe('b');
  });
});
