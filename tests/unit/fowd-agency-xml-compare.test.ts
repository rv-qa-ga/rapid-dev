import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  assertSafeSnowflakeTableFqn,
  compareFowdAgencyPolicyToXml,
  formatTimestampForFilename,
  getRowValue,
  isSnowflakeAccelMetadataColumn,
  parseLedgerJournalEntitiesFromXmlContent,
  resolveUniqueTimestampedReportPath,
  snowflakeColumnToConventionXmlName,
  valuesEqual,
  fowdMappingPairValuesEqual,
  writeFowdCompareReportXml,
} from '../../src/utils/fowd-agency-xml-compare';
import {
  formatFinOpsSnowflakeNetworkPolicyHelp,
  getFinOpsConnectionOptions,
  isSnowflakeNetworkPolicyDenial,
  resolveSnowflakeOAuthTokenRequestUrl,
  useFinOpsSnowflakeOAuthClientCredentials,
} from '../../src/utils/fowd-agency-xml-compare/snowflake-fetch';

const MINIMAL_MAPPING = [
  { snowflakeColumn: 'LINE_NUMBER', xmlAttribute: 'LINENUMBER' },
  { snowflakeColumn: 'DESCRIPTION', xmlAttribute: 'DESCRIPTION' },
  { snowflakeColumn: 'DOCUMENT', xmlAttribute: 'DOCUMENT' },
  { snowflakeColumn: 'JOURNAL_NAME', xmlAttribute: 'JOURNALNAME' },
  { snowflakeColumn: 'DEBIT_AMOUNT', xmlAttribute: 'DEBITAMOUNT' },
];

const metaBase = {
  xmlDistinctDocumentsInFile: [] as string[],
};

describe('isSnowflakeNetworkPolicyDenial / formatFinOpsSnowflakeNetworkPolicyHelp', () => {
  it('detects Snowflake IP allowlist message', () => {
    const msg =
      'Incoming request with IP/Token 51.145.3.13 is not allowed to access Snowflake. Contact your account administrator.';
    expect(isSnowflakeNetworkPolicyDenial(new Error(msg))).toBe(true);
    const help = formatFinOpsSnowflakeNetworkPolicyHelp(new Error(msg));
    expect(help).toContain('51.145.3.13');
    expect(help).toContain('community.snowflake.com');
  });

  it('returns empty help for unrelated errors', () => {
    expect(isSnowflakeNetworkPolicyDenial(new Error('syntax error'))).toBe(false);
    expect(formatFinOpsSnowflakeNetworkPolicyHelp(new Error('syntax error'))).toBe('');
  });
});

describe('FinOps Snowflake env (OAuth / SPN)', () => {
  const base = {
    SNOWFLAKE_ACCOUNT: 'acct',
    SNOWFLAKE_USER: 'svc_user',
  };

  it('resolveSnowflakeOAuthTokenRequestUrl uses explicit URL', () => {
    const url = 'https://login.microsoftonline.com/tenant-guid/oauth2/v2.0/token';
    expect(
      resolveSnowflakeOAuthTokenRequestUrl({
        ...base,
        SNOWFLAKE_OAUTH_TOKEN_REQUEST_URL: url,
      } as NodeJS.ProcessEnv),
    ).toBe(url);
  });

  it('resolveSnowflakeOAuthTokenRequestUrl builds from SNOWFLAKE_TENANT_ID', () => {
    expect(
      resolveSnowflakeOAuthTokenRequestUrl({
        ...base,
        SNOWFLAKE_TENANT_ID: 'aaa-bbb-ccc',
      } as NodeJS.ProcessEnv),
    ).toBe('https://login.microsoftonline.com/aaa-bbb-ccc/oauth2/v2.0/token');
  });

  it('resolveSnowflakeOAuthTokenRequestUrl falls back to D365_TENANT_ID', () => {
    expect(
      resolveSnowflakeOAuthTokenRequestUrl({
        ...base,
        D365_TENANT_ID: 'ddd-eee-fff',
      } as NodeJS.ProcessEnv),
    ).toBe('https://login.microsoftonline.com/ddd-eee-fff/oauth2/v2.0/token');
  });

  it('throws when no tenant or explicit token URL', () => {
    expect(() =>
      resolveSnowflakeOAuthTokenRequestUrl({ ...base } as NodeJS.ProcessEnv),
    ).toThrow(/SNOWFLAKE_OAUTH_TOKEN_REQUEST_URL/);
  });

  it('useFinOpsSnowflakeOAuthClientCredentials when client id and secret set', () => {
    expect(
      useFinOpsSnowflakeOAuthClientCredentials({
        ...base,
        SNOWFLAKE_CLIENT_ID: 'id',
        SNOWFLAKE_CLIENT_SECRET: 'sec',
      } as NodeJS.ProcessEnv),
    ).toBe(true);
    expect(
      useFinOpsSnowflakeOAuthClientCredentials({
        ...base,
        SNOWFLAKE_CLIENT_ID: 'id',
        SNOWFLAKE_PREFER_BROWSER_SSO: '1',
        SNOWFLAKE_CLIENT_SECRET: 'sec',
      } as NodeJS.ProcessEnv),
    ).toBe(false);
    expect(
      useFinOpsSnowflakeOAuthClientCredentials({
        ...base,
        SNOWFLAKE_CLIENT_ID: 'id',
      } as NodeJS.ProcessEnv),
    ).toBe(false);
  });
});

describe('getFinOpsConnectionOptions (OAuth)', () => {
  const keys = [
    'SNOWFLAKE_ACCOUNT',
    'SNOWFLAKE_USER',
    'SNOWFLAKE_CLIENT_ID',
    'SNOWFLAKE_CLIENT_SECRET',
    'SNOWFLAKE_AUTHENTICATOR',
    'D365_TENANT_ID',
    'SNOWFLAKE_OAUTH_SCOPE',
    'SNOWFLAKE_OAUTH_RESOURCE',
  ] as const;
  const snapshot: Partial<Record<(typeof keys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const k of keys) {
      const v = snapshot[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  it('returns oauth_client_credentials options when id and secret are set', () => {
    for (const k of keys) snapshot[k] = process.env[k];
    process.env.SNOWFLAKE_ACCOUNT = 'accelins-prod';
    process.env.SNOWFLAKE_USER = 'snowflake_login';
    process.env.SNOWFLAKE_CLIENT_ID = 'app-id';
    process.env.SNOWFLAKE_CLIENT_SECRET = 'app-secret';
    process.env.D365_TENANT_ID = 'tenant-guid-123';
    delete process.env.SNOWFLAKE_AUTHENTICATOR;
    process.env.SNOWFLAKE_OAUTH_SCOPE = 'https://example.invalid/.default';
    delete process.env.SNOWFLAKE_OAUTH_RESOURCE;

    const o = getFinOpsConnectionOptions() as Record<string, unknown>;
    expect(o.authenticator).toBe('OAUTH_CLIENT_CREDENTIALS');
    expect(o.oauthClientId).toBe('app-id');
    expect(o.oauthClientSecret).toBe('app-secret');
    expect(String(o.oauthTokenRequestUrl)).toContain('tenant-guid-123');
    expect(o.oauthScope).toBe('https://example.invalid/.default');
  });

  it('builds scope from SNOWFLAKE_OAUTH_RESOURCE when scope unset', () => {
    for (const k of keys) snapshot[k] = process.env[k];
    process.env.SNOWFLAKE_ACCOUNT = 'accelins-prod';
    process.env.SNOWFLAKE_USER = 'snowflake_login';
    process.env.SNOWFLAKE_CLIENT_ID = 'app-id';
    process.env.SNOWFLAKE_CLIENT_SECRET = 'app-secret';
    process.env.D365_TENANT_ID = 'tenant-guid-123';
    delete process.env.SNOWFLAKE_AUTHENTICATOR;
    delete process.env.SNOWFLAKE_OAUTH_SCOPE;
    process.env.SNOWFLAKE_OAUTH_RESOURCE = 'https://snowflake-oauth-resource.example/api';

    const o = getFinOpsConnectionOptions() as Record<string, unknown>;
    expect(o.oauthScope).toBe('https://snowflake-oauth-resource.example/api/.default');
  });
});

describe('assertSafeSnowflakeTableFqn', () => {
  it('accepts 1–3 dot-separated Snowflake identifiers', () => {
    expect(() => assertSafeSnowflakeTableFqn('FOWD__AGENCY_POLICY_FO_V1')).not.toThrow();
    expect(() => assertSafeSnowflakeTableFqn('SCHEMA.FOWD__AGENCY_POLICY_FO_V1')).not.toThrow();
    expect(() =>
      assertSafeSnowflakeTableFqn(
        'FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1',
      ),
    ).not.toThrow();
  });

  it('rejects injection and invalid FQNs', () => {
    expect(() => assertSafeSnowflakeTableFqn('DB.SCHEMA.TABLE; DROP')).toThrow();
    expect(() => assertSafeSnowflakeTableFqn('DB.SCHEMA TABLE')).toThrow();
    expect(() => assertSafeSnowflakeTableFqn('a.b.c.d')).toThrow();
  });
});

describe('snowflakeColumnToConventionXmlName', () => {
  it('removes underscores for Dynamics-style XML attributes', () => {
    expect(snowflakeColumnToConventionXmlName('CREDIT_AMOUNT')).toBe('CREDITAMOUNT');
    expect(snowflakeColumnToConventionXmlName('JOURNAL_NAME')).toBe('JOURNALNAME');
  });
});

describe('isSnowflakeAccelMetadataColumn', () => {
  it('detects _ACCEL_ internal columns', () => {
    expect(isSnowflakeAccelMetadataColumn('_ACCEL_DBT_INVOCATION_ID')).toBe(true);
    expect(isSnowflakeAccelMetadataColumn('DOCUMENT')).toBe(false);
  });
});

describe('valuesEqual', () => {
  it('treats empty as equal', () => {
    expect(valuesEqual('', '')).toBe(true);
  });
  it('compares numbers leniently', () => {
    expect(valuesEqual('125', '125.0')).toBe(true);
    expect(valuesEqual('125', '126')).toBe(false);
  });
  it('compares ISO date prefix', () => {
    expect(valuesEqual('2025-12-15T00:00:00.000Z', '2025-12-15T12:00:00.000Z')).toBe(true);
  });
});

describe('fowdMappingPairValuesEqual', () => {
  it('treats Snowflake EXCHANGE_RATE 0 and empty XML EXCHANGERATE as equal', () => {
    expect(fowdMappingPairValuesEqual('EXCHANGE_RATE', 'EXCHANGERATE', '0', '')).toBe(true);
    expect(fowdMappingPairValuesEqual('EXCHANGE_RATE', 'EXCHANGERATE', '', '0')).toBe(true);
  });
  it('does not collapse non-zero vs empty for EXCHANGE_RATE', () => {
    expect(fowdMappingPairValuesEqual('EXCHANGE_RATE', 'EXCHANGERATE', '1.2', '')).toBe(false);
  });
  it('does not apply to other columns', () => {
    expect(fowdMappingPairValuesEqual('DEBIT_AMOUNT', 'DEBITAMOUNT', '0', '')).toBe(false);
  });
});

describe('getRowValue', () => {
  it('finds columns case-insensitively', () => {
    const row = { LINE_NUMBER: 1, journal_name: 'WBX' };
    expect(getRowValue(row, 'LINE_NUMBER')).toBe(1);
    expect(getRowValue(row, 'JOURNAL_NAME')).toBe('WBX');
  });
});

describe('parseLedgerJournalEntitiesFromXmlContent', () => {
  const xml = `<?xml version="1.0"?>
<Document>
<LEDGERJOURNALENTITY JOURNALNAME="WBX" DESCRIPTION="Test Desc" DOCUMENT="D1" LINENUMBER="1" DEBITAMOUNT="100" CREDITAMOUNT="0" />
<LEDGERJOURNALENTITY JOURNALNAME="WBX" DESCRIPTION="Other" DOCUMENT="D2" LINENUMBER="2" DEBITAMOUNT="0" CREDITAMOUNT="0" />
</Document>`;

  it('filters by DESCRIPTION and keys by line', () => {
    const { byLine, matchingDescription, elementsRead, distinctDescriptionsInFile, distinctDocumentsInFile } =
      parseLedgerJournalEntitiesFromXmlContent(xml, 'Test Desc', MINIMAL_MAPPING);
    expect(elementsRead).toBe(2);
    expect(matchingDescription).toBe(1);
    expect(distinctDescriptionsInFile).toEqual(['Other', 'Test Desc']);
    expect(distinctDocumentsInFile).toEqual(['D1', 'D2']);
    expect(byLine.size).toBe(1);
    const line = byLine.get('1');
    expect(line?.JOURNALNAME).toBe('WBX');
    expect(line?.DEBITAMOUNT).toBe('100');
  });

  it('filters by DOCUMENT when options.document is set', () => {
    const { byLine, matchingDescription } = parseLedgerJournalEntitiesFromXmlContent(xml, 'Test Desc', MINIMAL_MAPPING, {
      document: 'D1',
    });
    expect(matchingDescription).toBe(1);
    expect(byLine.get('1')?.DOCUMENT).toBe('D1');
    const noDoc = parseLedgerJournalEntitiesFromXmlContent(xml, 'Test Desc', MINIMAL_MAPPING, {
      document: 'D999',
    });
    expect(noDoc.matchingDescription).toBe(0);
    expect(noDoc.byLine.size).toBe(0);
  });
});

describe('compareFowdAgencyPolicyToXml (DOCUMENT match)', () => {
  it('reports ok when Snowflake and XML match for the same DOCUMENT', () => {
    const rows = [
      {
        LINE_NUMBER: 112363,
        DESCRIPTION: 'Test Desc',
        DOCUMENT: 'DOC1',
        JOURNAL_NAME: 'WBX',
        DEBIT_AMOUNT: 100,
      },
    ];
    const xmlMap = new Map<string, Record<string, string>>([
      [
        '1',
        {
          LINENUMBER: '1',
          DESCRIPTION: 'Test Desc',
          DOCUMENT: 'DOC1',
          JOURNALNAME: 'WBX',
          DEBITAMOUNT: '100',
        },
      ],
    ]);
    const report = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'Test Desc', {
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['Test Desc'],
      xmlDistinctDocumentsInFile: ['DOC1'],
    });
    expect(report.matchStrategy).toBe('DOCUMENT');
    expect(report.ok).toBe(true);
    expect(report.descriptionAlignmentOk).toBe(true);
    expect(report.descriptionAlignmentIssues).toEqual([]);
    expect(report.unpairedSnowflakeRows).toEqual([]);
    expect(report.unpairedXmlRows).toEqual([]);
    expect(report.mappingAttributeMismatches).toHaveLength(0);
    expect(Object.keys(report.mismatchesByMatchKey)).toHaveLength(0);
    expect(report.documentPairingSummary).toEqual([
      {
        document: 'DOC1',
        snowflakeRowCount: 1,
        xmlLineCount: 1,
        pairedLineCount: 1,
        unpairedSnowflakeRows: 0,
        unpairedXmlLines: 0,
      },
    ]);
  });

  it('pairs multiple rows with the same DOCUMENT by LINE_NUMBER / LINENUMBER order', () => {
    const rows = [
      {
        LINE_NUMBER: 1,
        DESCRIPTION: 'X',
        DOCUMENT: 'D1',
        JOURNAL_NAME: 'WBX',
        DEBIT_AMOUNT: 10,
      },
      {
        LINE_NUMBER: 2,
        DESCRIPTION: 'X',
        DOCUMENT: 'D1',
        JOURNAL_NAME: 'WBX',
        DEBIT_AMOUNT: 20,
      },
    ];
    const xmlMap = new Map<string, Record<string, string>>([
      [
        '1',
        { LINENUMBER: '1', DESCRIPTION: 'X', DOCUMENT: 'D1', JOURNALNAME: 'WBX', DEBITAMOUNT: '10' },
      ],
      [
        '2',
        { LINENUMBER: '2', DESCRIPTION: 'X', DOCUMENT: 'D1', JOURNALNAME: 'WBX', DEBITAMOUNT: '20' },
      ],
    ]);
    const report = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'X', {
      ...metaBase,
      xmlElementsRead: 2,
      xmlElementsMatchingDescription: 2,
      xmlDistinctDescriptionsInFile: ['X'],
      xmlDistinctDocumentsInFile: ['D1'],
    });
    expect(report.ok).toBe(true);
    expect(report.unpairedSnowflakeRows).toEqual([]);
    expect(report.unpairedXmlRows).toEqual([]);
    expect(report.documentPairingSummary).toEqual([
      {
        document: 'D1',
        snowflakeRowCount: 2,
        xmlLineCount: 2,
        pairedLineCount: 2,
        unpairedSnowflakeRows: 0,
        unpairedXmlLines: 0,
      },
    ]);
  });

  it('reports failure when DOCUMENT exists only on Snowflake vs only in XML', () => {
    const rows = [
      { LINE_NUMBER: 1, DESCRIPTION: 'X', DOCUMENT: 'DA', JOURNAL_NAME: 'WBX', DEBIT_AMOUNT: 1 },
    ];
    const xmlMap = new Map<string, Record<string, string>>([
      ['2', { LINENUMBER: '2', DESCRIPTION: 'X', DOCUMENT: 'DB', JOURNALNAME: 'WBX', DEBITAMOUNT: '9' }],
    ]);
    const report = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'X', {
      ...metaBase,
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['X'],
      xmlDistinctDocumentsInFile: ['DA', 'DB'],
    });
    expect(report.ok).toBe(false);
    expect(report.documentsOnlyInSnowflake).toContain('DA');
    expect(report.documentsOnlyInXml).toContain('DB');
    expect(report.unpairedSnowflakeRows.length).toBeGreaterThan(0);
    expect(report.unpairedXmlRows.length).toBeGreaterThan(0);
    const byDoc = new Map(report.documentPairingSummary.map((d) => [d.document, d]));
    expect(byDoc.get('DA')).toMatchObject({
      snowflakeRowCount: 1,
      xmlLineCount: 0,
      pairedLineCount: 0,
      unpairedSnowflakeRows: 1,
    });
    expect(byDoc.get('DB')).toMatchObject({
      snowflakeRowCount: 0,
      xmlLineCount: 1,
      pairedLineCount: 0,
      unpairedXmlLines: 1,
    });
  });

  it('reports extra Snowflake rows when counts differ for the same DOCUMENT', () => {
    const rows = [
      { LINE_NUMBER: 1, DESCRIPTION: 'X', DOCUMENT: 'D1', JOURNAL_NAME: 'WBX', DEBIT_AMOUNT: 10 },
      { LINE_NUMBER: 2, DESCRIPTION: 'X', DOCUMENT: 'D1', JOURNAL_NAME: 'WBX', DEBIT_AMOUNT: 20 },
      { LINE_NUMBER: 3, DESCRIPTION: 'X', DOCUMENT: 'D1', JOURNAL_NAME: 'WBX', DEBIT_AMOUNT: 30 },
    ];
    const xmlMap = new Map<string, Record<string, string>>([
      ['1', { LINENUMBER: '1', DESCRIPTION: 'X', DOCUMENT: 'D1', JOURNALNAME: 'WBX', DEBITAMOUNT: '10' }],
    ]);
    const report = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'X', {
      ...metaBase,
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['X'],
      xmlDistinctDocumentsInFile: ['D1'],
    });
    expect(report.ok).toBe(false);
    expect(report.unpairedSnowflakeRows).toHaveLength(2);
    expect(
      report.mismatches.some(
        (m) => m.kind === 'UNPAIRED_ROW' && m.snowflakeDisplay.includes('Extra Snowflake'),
      ),
    ).toBe(true);
    expect(report.documentPairingSummary.find((d) => d.document === 'D1')).toMatchObject({
      snowflakeRowCount: 3,
      xmlLineCount: 1,
      pairedLineCount: 1,
      unpairedSnowflakeRows: 2,
      unpairedXmlLines: 0,
    });
  });

  it('compares convention-mapped columns not listed in minimal mapping when XML has the attribute', () => {
    const rows = [
      {
        LINE_NUMBER: 1,
        DESCRIPTION: 'X',
        DOCUMENT: 'D1',
        JOURNAL_NAME: 'WBX',
        DEBIT_AMOUNT: 10,
        CREDIT_AMOUNT: 0,
      },
    ];
    const xmlMap = new Map<string, Record<string, string>>([
      [
        '1',
        {
          LINENUMBER: '1',
          DESCRIPTION: 'X',
          DOCUMENT: 'D1',
          JOURNALNAME: 'WBX',
          DEBITAMOUNT: '10',
          CREDITAMOUNT: '0',
        },
      ],
    ]);
    const report = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'X', {
      ...metaBase,
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['X'],
      xmlDistinctDocumentsInFile: ['D1'],
    });
    expect(report.pairCounts.fromConvention).toBeGreaterThanOrEqual(1);
    expect(report.attributeMatches.some((a) => a.snowflakeColumn === 'CREDIT_AMOUNT')).toBe(true);
    expect(report.ok).toBe(true);
  });

  it('excludes _ACCEL_* columns from coverage when ignoreSnowflakeAccelMetadataColumns is true', () => {
    const rows = [
      {
        LINE_NUMBER: 1,
        DESCRIPTION: 'X',
        DOCUMENT: 'D1',
        JOURNAL_NAME: 'WBX',
        DEBIT_AMOUNT: 10,
        _ACCEL_TEST_COL: 'meta',
      },
    ];
    const xmlMap = new Map<string, Record<string, string>>([
      [
        '1',
        { LINENUMBER: '1', DESCRIPTION: 'X', DOCUMENT: 'D1', JOURNALNAME: 'WBX', DEBITAMOUNT: '10' },
      ],
    ]);
    const withIgnore = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'X', {
      ...metaBase,
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['X'],
      xmlDistinctDocumentsInFile: ['D1'],
      ignoreSnowflakeAccelMetadataColumns: true,
    });
    expect(withIgnore.ignoreSnowflakeAccelMetadataColumns).toBe(true);
    expect(withIgnore.snowflakeAccelMetadataColumnsIgnored).toContain('_ACCEL_TEST_COL');
    expect(withIgnore.snowflakeColumnsWithoutXmlAttribute).not.toContain('_ACCEL_TEST_COL');

    const withoutIgnore = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'X', {
      ...metaBase,
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['X'],
      xmlDistinctDocumentsInFile: ['D1'],
      ignoreSnowflakeAccelMetadataColumns: false,
    });
    expect(withoutIgnore.snowflakeColumnsWithoutXmlAttribute).toContain('_ACCEL_TEST_COL');
  });

  it('reports Snowflake-only columns in coverage when no XML attribute exists', () => {
    const rows = [
      {
        LINE_NUMBER: 1,
        DESCRIPTION: 'X',
        DOCUMENT: 'D1',
        JOURNAL_NAME: 'WBX',
        DEBIT_AMOUNT: 10,
        ONLY_IN_SNOWFLAKE: 'orphan',
      },
    ];
    const xmlMap = new Map<string, Record<string, string>>([
      [
        '1',
        { LINENUMBER: '1', DESCRIPTION: 'X', DOCUMENT: 'D1', JOURNALNAME: 'WBX', DEBITAMOUNT: '10' },
      ],
    ]);
    const report = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'X', {
      ...metaBase,
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['X'],
      xmlDistinctDocumentsInFile: ['D1'],
    });
    expect(report.snowflakeColumnsWithoutXmlAttribute).toContain('ONLY_IN_SNOWFLAKE');
    expect(report.coverageGaps.some((g) => g.snowflakeColumn === 'ONLY_IN_SNOWFLAKE')).toBe(true);
  });

  it('reports each mapping attribute failure with xmlAttribute and groups by matchKey', () => {
    const rows = [
      {
        LINE_NUMBER: 1,
        DESCRIPTION: 'X',
        DOCUMENT: 'D1',
        JOURNAL_NAME: 'WBX',
        DEBIT_AMOUNT: 99,
      },
    ];
    const xmlMap = new Map<string, Record<string, string>>([
      ['1', { LINENUMBER: '1', DESCRIPTION: 'X', DOCUMENT: 'D1', JOURNALNAME: 'OTHER', DEBITAMOUNT: '10' }],
    ]);
    const report = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'X', {
      ...metaBase,
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['X'],
      xmlDistinctDocumentsInFile: ['D1'],
    });
    expect(report.ok).toBe(false);
    expect(report.mappingAttributeMismatches.length).toBeGreaterThanOrEqual(2);
    const keys = Object.keys(report.mismatchesByMatchKey);
    expect(keys.length).toBe(1);
    const attrs = report.mismatchesByMatchKey[keys[0]!].map((m) => m.xmlAttribute).sort();
    expect(attrs).toContain('JOURNALNAME');
    expect(attrs).toContain('DEBITAMOUNT');
    expect(report.mappingAttributeMismatches.every((m) => m.kind === 'MAPPING_ATTRIBUTE')).toBe(true);
    expect(report.mappingAttributeMismatches[0]?.snowflakeLineNumber).toBeDefined();
    expect(report.mappingAttributeMismatches[0]?.xmlLineNumber).toBeDefined();
  });

  it('fails description alignment when Snowflake has rows but XML has no matching DESCRIPTION', () => {
    const rows = [{ LINE_NUMBER: 1, DESCRIPTION: 'Only SF', DOCUMENT: 'D1', JOURNAL_NAME: 'WBX', DEBIT_AMOUNT: 1 }];
    const report = compareFowdAgencyPolicyToXml(rows, new Map(), MINIMAL_MAPPING, 'Only SF', {
      ...metaBase,
      xmlElementsRead: 2,
      xmlElementsMatchingDescription: 0,
      xmlDistinctDescriptionsInFile: ['Other Desc', 'Third'],
      xmlDistinctDocumentsInFile: ['A', 'B'],
    });
    expect(report.ok).toBe(false);
    expect(report.descriptionAlignmentOk).toBe(false);
    expect(report.descriptionAlignmentIssues.some((i) => i.code === 'NO_XML_LINES_FOR_FILTER')).toBe(
      true,
    );
  });

  it('fails description alignment when paired row Snowflake DESCRIPTION differs from XML', () => {
    const rows = [{ LINE_NUMBER: 1, DESCRIPTION: 'SF Desc', DOCUMENT: 'D1', JOURNAL_NAME: 'WBX', DEBIT_AMOUNT: 1 }];
    const xmlMap = new Map<string, Record<string, string>>([
      ['1', { LINENUMBER: '1', DESCRIPTION: 'XML Desc', DOCUMENT: 'D1', JOURNALNAME: 'WBX', DEBITAMOUNT: '1' }],
    ]);
    const report = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'SF Desc', {
      ...metaBase,
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['XML Desc'],
      xmlDistinctDocumentsInFile: ['D1'],
    });
    expect(report.ok).toBe(false);
    expect(report.descriptionAlignmentOk).toBe(false);
    expect(report.descriptionAlignmentIssues.some((i) => i.code === 'PAIR_DESCRIPTION_MISMATCH')).toBe(
      true,
    );
  });
});

describe('formatTimestampForFilename / resolveUniqueTimestampedReportPath', () => {
  it('formats UTC stamp without colon (Windows-safe)', () => {
    const s = formatTimestampForFilename(new Date('2026-04-16T19:30:15.042Z'));
    expect(s).toBe('20260416-193015-042');
  });

  it('resolves path with stamp before extension', () => {
    const fixed = new Date('2026-04-16T19:30:15.042Z');
    const base = path.join(os.tmpdir(), `fowd-stamp-${Date.now()}`, 'compare-report.xml');
    const resolved = resolveUniqueTimestampedReportPath(base, { now: fixed });
    expect(resolved).toMatch(/compare-report-20260416-193015-042\.xml$/);
    expect(resolved).not.toBe(base);
  });

  it('adds numeric suffix when stamped path already exists', () => {
    const fixed = new Date('2026-04-16T19:30:15.042Z');
    const dir = path.join(os.tmpdir(), `fowd-dup-${Date.now()}`);
    fs.mkdirSync(dir, { recursive: true });
    const first = path.join(dir, 'out.xml');
    const expectedFirst = path.join(dir, 'out-20260416-193015-042.xml');
    fs.writeFileSync(expectedFirst, '', 'utf8');
    try {
      const second = resolveUniqueTimestampedReportPath(first, { now: fixed });
      expect(second).toMatch(/out-20260416-193015-042-2\.xml$/);
    } finally {
      try {
        fs.unlinkSync(expectedFirst);
        fs.rmdirSync(dir);
      } catch {
        /* ignore */
      }
    }
  });
});

describe('writeFowdCompareReportXml', () => {
  it('writes XHTML with green row-match and red row-mismatch classes', () => {
    const rows = [
      {
        LINE_NUMBER: 1,
        DESCRIPTION: 'T',
        DOCUMENT: 'D1',
        JOURNAL_NAME: 'WBX',
        DEBIT_AMOUNT: 5,
      },
    ];
    const xmlMap = new Map<string, Record<string, string>>([
      ['1', { LINENUMBER: '1', DESCRIPTION: 'T', DOCUMENT: 'D1', JOURNALNAME: 'WBX', DEBITAMOUNT: '99' }],
    ]);
    const report = compareFowdAgencyPolicyToXml(rows, xmlMap, MINIMAL_MAPPING, 'T', {
      xmlElementsRead: 1,
      xmlElementsMatchingDescription: 1,
      xmlDistinctDescriptionsInFile: ['T'],
      xmlDistinctDocumentsInFile: ['D1'],
    });
    const out = path.join(os.tmpdir(), `fowd-compare-report-${Date.now()}.xml`);
    try {
      writeFowdCompareReportXml(report, out);
      const html = fs.readFileSync(out, 'utf8');
      expect(html).toContain('application/xhtml+xml');
      expect(html).toContain('tr class="row-match"');
      expect(html).toContain('tr class="row-mismatch"');
      expect(html).toContain('<span class="status-match">Match</span>');
      expect(html).toContain('<span class="status-mismatch">Mismatch</span>');
    } finally {
      try {
        fs.unlinkSync(out);
      } catch {
        /* ignore */
        /*TEst*/
      }
    }
  });
});
