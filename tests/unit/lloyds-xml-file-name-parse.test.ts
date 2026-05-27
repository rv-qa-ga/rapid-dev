import { describe, expect, it } from 'vitest';

import {
  buildFileName,
  buildWbxFileName,
  extractUniqueRunIdFromWbxOrWrxFileName,
  parseFileName,
} from '../../src/integrations/lloyds/xmlFileName';

describe('parseFileName (classic + WBX)', () => {
  it('parses classic Mule shape', () => {
    expect(parseFileName('AEUM US-56464 202604301600.xml')).toEqual({
      ledger: 'AEUM',
      repoId: 'US-56464',
      stamp: '202604301600',
    });
  });

  it('parses WBX shape and normalises ledger to AEUM', () => {
    const name =
      'WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-27 15-52-00.773.xml';
    expect(parseFileName(name)).toEqual({
      ledger: 'AEUM',
      repoId: 'US-56464',
      stamp: '202604271552',
    });
  });

  it('parses WRX shape like WBX (Power Apps / QA export prefix)', () => {
    const name =
      'WRX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-27 15-52-00.773.xml';
    expect(parseFileName(name)).toEqual({
      ledger: 'AEUM',
      repoId: 'US-56464',
      stamp: '202604271552',
    });
  });

  it('returns null for bad names', () => {
    expect(parseFileName('not-a-lloyds-xml.xml')).toBeNull();
    expect(parseFileName('AEUMUS-56464202604301600.xml')).toBeNull();
  });

  it('extractUniqueRunIdFromWbxOrWrxFileName returns UUID from WBX/WRX or null otherwise', () => {
    const wbx =
      'WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-27 15-52-00.773.xml';
    expect(extractUniqueRunIdFromWbxOrWrxFileName(wbx)).toBe('04a80873-3ba1-4caa-9316-d1a0f6ab1b9c');
    const wrx = wbx.replace(/^WBX/, 'WRX');
    expect(extractUniqueRunIdFromWbxOrWrxFileName(wrx)).toBe('04a80873-3ba1-4caa-9316-d1a0f6ab1b9c');
    expect(extractUniqueRunIdFromWbxOrWrxFileName('AEUM US-56464 202604301600.xml')).toBeNull();
    expect(extractUniqueRunIdFromWbxOrWrxFileName('WBX_bad.xml')).toBeNull();
  });

  it('round-trips build helpers', () => {
    const at = new Date(Date.UTC(2026, 3, 30, 16, 0, 0));
    const classic = buildFileName({ ledger: 'AEUM', repoId: 'US-56464', at });
    expect(parseFileName(classic)).toEqual({
      ledger: 'AEUM',
      repoId: 'US-56464',
      stamp: '202604301600',
    });
    const wbx = buildWbxFileName({
      repoId: 'us-56464',
      runId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
      at,
    });
    expect(parseFileName(wbx)?.repoId).toBe('US-56464');
    expect(parseFileName(wbx)?.stamp).toBe('202604301600');
  });
});
