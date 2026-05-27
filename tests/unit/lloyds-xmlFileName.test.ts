import { describe, expect, it } from 'vitest';

import { buildBlobId, buildWbxFileName, parseFileName } from '../../src/integrations/lloyds/xmlFileName';

describe('lloyds/xmlFileName', () => {
  it('parseFileName splits ledger, repoId, stamp', () => {
    const r = parseFileName('AEUM US-61273 202604161200.xml');
    expect(r).toEqual({ ledger: 'AEUM', repoId: 'US-61273', stamp: '202604161200' });
  });

  it('buildBlobId appends file name to default mulesoft-xml base', () => {
    const b = buildBlobId('AEUM US-61273 202604161200.xml');
    expect(b.endsWith('/mulesoft-xml/AEUM US-61273 202604161200.xml')).toBe(true);
  });

  it('buildBlobId rewrites full URL to configured container', () => {
    const legacy = 'https://other.blob.core.windows.net/old/AEUM%20US-61273%20202604161200.xml';
    const b = buildBlobId(legacy);
    expect(b).toContain('mulesoft-xml/');
    expect(b).toContain('AEUM');
  });

  it('parseFileName returns null on bad shape', () => {
    expect(parseFileName('bad.xml')).toBeNull();
  });

  it('parseFileName accepts WBX mulesoft-xml names (Snowflake _ACCEL_UNIQUE_RUN_ID + timestamp)', () => {
    const r = parseFileName('WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-27 15-52-00.773.xml');
    expect(r).toEqual({ ledger: 'AEUM', repoId: 'US-56464', stamp: '202604271552' });
  });

  it('parseFileName WBX is case-insensitive on prefix and normalises repo id', () => {
    const r = parseFileName('wbx_us-57244_96506549-1ea0-47fc-a858-7a2badb9af1f_2026-04-27 15-52-05.963.xml');
    expect(r).toEqual({ ledger: 'AEUM', repoId: 'US-57244', stamp: '202604271552' });
  });

  it('buildWbxFileName round-trips through parseFileName', () => {
    const at = new Date(Date.UTC(2026, 3, 28, 12, 35, 2, 516));
    const name = buildWbxFileName({
      repoId: 'US-56464',
      runId: '04a80873-3ba1-4caa-9316-d1a0f6ab1b9c',
      at,
    });
    expect(name).toBe('WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-28 12-35-02.516.xml');
    expect(parseFileName(name)).toEqual({ ledger: 'AEUM', repoId: 'US-56464', stamp: '202604281235' });
  });
});
