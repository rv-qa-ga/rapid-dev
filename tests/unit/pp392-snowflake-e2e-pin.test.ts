import { describe, expect, it } from 'vitest';

import { readPp392SnowflakeE2ePinFromEnv } from '../../src/integrations/lloyds/pp392SnowflakeE2ePin';

const wbx =
  'WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-27 15-52-00.773.xml';

describe('readPp392SnowflakeE2ePinFromEnv', () => {
  it('returns null when both vars unset', () => {
    expect(
      readPp392SnowflakeE2ePinFromEnv({
        LLOYDS_PP392_E2E_CORRELATION_ID: '',
        LLOYDS_PP392_E2E_FILE_NAME: '',
      }),
    ).toBeNull();
    expect(readPp392SnowflakeE2ePinFromEnv({})).toBeNull();
  });

  it('throws when only one var is set', () => {
    expect(() =>
      readPp392SnowflakeE2ePinFromEnv({
        LLOYDS_PP392_E2E_CORRELATION_ID: '04a80873-3ba1-4caa-9316-d1a0f6ab1b9c',
      }),
    ).toThrow(/both/);
    expect(() =>
      readPp392SnowflakeE2ePinFromEnv({
        LLOYDS_PP392_E2E_FILE_NAME: wbx,
      }),
    ).toThrow(/both/);
  });

  it('normalises correlation UUID and validates file name + WBX run id match', () => {
    const pin = readPp392SnowflakeE2ePinFromEnv({
      LLOYDS_PP392_E2E_CORRELATION_ID: '{04A80873-3BA1-4CAA-9316-D1A0F6AB1B9C}',
      LLOYDS_PP392_E2E_FILE_NAME: wbx,
    });
    expect(pin).toEqual({
      correlationId: '04a80873-3ba1-4caa-9316-d1a0f6ab1b9c',
      fileName: wbx,
    });
  });

  it('throws when WBX run id does not match correlation', () => {
    expect(() =>
      readPp392SnowflakeE2ePinFromEnv({
        LLOYDS_PP392_E2E_CORRELATION_ID: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        LLOYDS_PP392_E2E_FILE_NAME: wbx,
      }),
    ).toThrow(/does not match/);
  });

  it('allows classic file name when no embedded run id', () => {
    const classic = 'AEUM US-56464 202604301600.xml';
    const pin = readPp392SnowflakeE2ePinFromEnv({
      LLOYDS_PP392_E2E_CORRELATION_ID: '04a80873-3ba1-4caa-9316-d1a0f6ab1b9c',
      LLOYDS_PP392_E2E_FILE_NAME: classic,
    });
    expect(pin?.fileName).toBe(classic);
    expect(pin?.correlationId).toBe('04a80873-3ba1-4caa-9316-d1a0f6ab1b9c');
  });
});
