import { describe, expect, it } from 'vitest';

import {
  buildDvJournalPostingFailedPayload,
  buildDvJournalPostingSuccessPayload,
  buildDvXmlApprovalFailedPayload,
  buildMuleXmlGenerationSuccessPayload,
} from '../../src/integrations/lloyds/serviceBusSender';

describe('lloyds/buildMuleXmlGenerationSuccessPayload', () => {
  it('returns canonical mule-xml-generation-success shape', () => {
    const pl = buildMuleXmlGenerationSuccessPayload({
      correlationId: '0000-0000-0000-03001',
      fileName: 'AEUM US-61273 202604161200.xml',
      blobId: 'https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml/AEUM US-61273 202604161200.xml',
      financialValues: {
        adp_currency: 'GBP',
        adp_prm: 1,
        adp_com: 2,
        adp_coi: 3,
        adp_tax: 4,
        adp_oth: 5,
      },
    });
    expect(pl.message).toBe('mule-xml-generation-success');
    expect(pl.correlation_id).toBe('0000-0000-0000-03001');
    expect(pl.financial_values.adp_currency).toBe('GBP');
    expect(Object.keys(pl.financial_values).sort()).toEqual(
      ['adp_com', 'adp_coi', 'adp_currency', 'adp_oth', 'adp_prm', 'adp_tax'].sort(),
    );
  });
});

describe('lloyds/dv-xml-approval-failed + dv-journal-posting-* payload builders', () => {
  it('buildDvXmlApprovalFailedPayload includes message and error block', () => {
    const p = buildDvXmlApprovalFailedPayload({
      correlationId: 'cid-1',
      fileName: 'AEUM US-56464 202604171931.xml',
      errorMessage: 'rejected',
    });
    expect(p.message).toBe('dv-xml-approval-failed');
    expect(p.correlation_id).toBe('cid-1');
    expect((p.error as { error_message: string }).error_message).toBe('rejected');
  });

  it('buildDvJournalPostingSuccessPayload mirrors success contract fields', () => {
    const p = buildDvJournalPostingSuccessPayload({
      correlationId: 'cid-2',
      fileName: 'AEUM US-58338 202604091630.xml',
      blobId: 'https://example.blob/mulesoft-xml/AEUM US-58338 202604091630.xml',
    });
    expect(p.message).toBe('dv-journal-posting-success');
    expect(p.blob_id).toContain('AEUM');
    expect(p.financial_values).toBeUndefined();
  });

  it('buildDvJournalPostingSuccessPayload includes d365 financial_values when passed', () => {
    const p = buildDvJournalPostingSuccessPayload({
      correlationId: 'cid-2',
      fileName: 'WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-28 12-35-02.516.xml',
      blobId: 'https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml/WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-28 12-35-02.516.xml',
      financialValues: {
        d365_prm: 1500,
        d365_com: 200,
        d365_coi: 300,
        d365_tax: 100,
        d365_oth: 50,
        d365_currency: 'EUR',
      },
    });
    const fv = p.financial_values as Record<string, unknown>;
    expect(fv.d365_currency).toBe('EUR');
    expect(fv.d365_prm).toBe(1500);
    expect(Object.keys(fv).sort()).toEqual(
      ['d365_coi', 'd365_com', 'd365_currency', 'd365_oth', 'd365_prm', 'd365_tax'].sort(),
    );
  });

  it('buildDvJournalPostingFailedPayload includes error_message', () => {
    const p = buildDvJournalPostingFailedPayload({
      correlationId: 'cid-3',
      fileName: 'AEUM US-58338 202604091630.xml',
    });
    expect(p.message).toBe('dv-journal-posting-failed');
    expect((p.error as { error_message: string }).error_message).toMatch(/journal posting/i);
  });
});
