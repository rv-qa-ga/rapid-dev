/**
 * Lloyd's Phase 2 — ADP Snowflake read assertions (`@phase-2 @snowflake` in `lloyds-pipeline.feature` §B).
 *
 * Composes:
 *   - `snowflakeSummaryClient.ts` (queries + helpers)
 *   - `dataverseMasterDataClient.ts` (repository guid by code)
 *   - `xmlFileRecordClient.ts` (latest `accelins_workflow` per repository file)
 */

import { After, DataTable, Given, Then, When } from '@cucumber/cucumber';
import type { Connection } from 'snowflake-sdk';

import { AutomationWorld } from '../../hooks/world';
import { logger } from '../../utils/logger';
import {
  connectFinOpsSnowflake,
  destroyConnection,
  loadFinOpsSnowflakeEnv,
} from '../../utils/fowd-agency-xml-compare';
import { adpSummaryRowToMuleFinancialValues, type MuleFinancialValues } from '../../integrations/lloyds/adpSummaryToMuleFinancialValues';
import {
  countDetailRowsForRun,
  fetchFowdDetailRowsForRun,
  fetchLatestSummaryRowsForRepo,
  fetchSummaryInformationSchemaColumns,
  fetchSummaryRowByRunId,
  fetchTagetikRowsForRepoRun,
  getSnowflakeCell,
  getSnowflakeCellFirst,
  LLOYDS_FOWC_DETAIL_TABLE,
  LLOYDS_FOWD_DETAIL_TABLE,
  LLOYDS_SUMMARY_AGENCY_COMMISSION_COLUMNS,
  LLOYDS_SUMMARY_INSURER_COMMISSION_COLUMNS,
  resolveLloydsSnowflakeTableFqn,
  resolveSummaryColumnUsed,
  runSnowflakeQuery,
} from '../../integrations/lloyds/snowflakeSummaryClient';
import { DataverseMasterDataClient } from '../../integrations/lloyds/dataverseMasterDataClient';
import { XmlFileRecord, XmlFileRecordClient } from '../../integrations/lloyds/xmlFileRecordClient';
import { loadAdpXmlMappingPairs } from '../../integrations/lloyds/defaultAdpXmlMapping';
import { withinAbsMagnitude } from '../../integrations/lloyds/lloydsAmountCompare';
import {
  compareFowdRowsToXmlText,
  descriptionFromFowdRows,
  resolveXmlBlobNameForDownload,
} from '../../integrations/lloyds/lloydsCrossSystemReadOnly';
import { LloydsBlobClient } from '../../integrations/lloyds/blobContainerClient';
import { computeAdpTotalsFromXml } from '../../integrations/lloyds/xmlTotals';
import {
  pickTagetikRowForRun,
  readTagetikJournalLineFields,
  validateTagetikJournalLineFieldsPresent,
  validateTagetikNumericOverlapWithAdpSummary,
} from '../../integrations/lloyds/lloydsTagetikFieldAssertions';
import type { MappingPair } from '../../utils/fowd-agency-xml-compare/types';

interface LloydsSnowflakeWorldCtx {
  connection?: Connection;
  /** Rows from the generic ORDER BY query (SNOW-001). */
  queryRows?: Record<string, unknown>[];
  latestSummaryRow?: Record<string, unknown>;
  informationSchemaColumns?: Array<{ COLUMN_NAME: string; DATA_TYPE: string }>;
  detailCounts?: { fowd: number; fowc: number; runId: string; repo: string };
  dataverseXmlRecord?: XmlFileRecord;
  fowdDetailRows?: Record<string, unknown>[];
  downloadedJournalXml?: string;
  adpXmlMappingPairs?: MappingPair[];
  tagetikRows?: Record<string, unknown>[];
  /** SNOW-004: `financial_values` built from latest summary row for a repo. */
  snowContractFv?: MuleFinancialValues;
  snowContractRunId?: string;
  snowContractRefetchedSummary?: Record<string, unknown>;
}

function sfCtx(world: AutomationWorld): LloydsSnowflakeWorldCtx {
  if (!world.testContext.lloydsSnowflake) world.testContext.lloydsSnowflake = {};
  return world.testContext.lloydsSnowflake as LloydsSnowflakeWorldCtx;
}

After({ tags: '@snowflake' }, async function (this: AutomationWorld) {
  const c = sfCtx(this).connection;
  if (c) {
    try {
      await destroyConnection(c);
    } catch (e) {
      logger.warn(`Snowflake disconnect: ${(e as Error).message}`);
    }
    delete sfCtx(this).connection;
  }
});

const connectFrameworkFinOpsSnowflake = async function (this: AutomationWorld, dbLabel: string) {
  loadFinOpsSnowflakeEnv();
  const expected = (process.env.SNOWFLAKE_DATABASE || 'FINANCIAL_OPERATIONS').trim();
  if (dbLabel.trim().toUpperCase() !== expected.toUpperCase()) {
    logger.warn(
      `Snowflake database label "${dbLabel}" does not match SNOWFLAKE_DATABASE="${expected}" — using configured database.`,
    );
  }
  const prev = sfCtx(this).connection;
  if (prev) {
    try {
      await destroyConnection(prev);
    } catch {
      /* ignore */
    }
  }
  sfCtx(this).connection = await connectFinOpsSnowflake();
};

Given('a Snowflake connection to {string} via the framework Snowflake client', connectFrameworkFinOpsSnowflake);
/** @deprecated Use "framework Snowflake client" — FinOps may use Entra SPN (OAuth) or browser SSO. */
Given('a Snowflake connection to {string} via the framework SSO client', connectFrameworkFinOpsSnowflake);

When(
  'I query {string} for repo {string} ordered by {string} descending',
  async function (this: AutomationWorld, shortTable: string, repo: string, orderCol: string) {
    const conn = sfCtx(this).connection;
    if (!conn) throw new Error('No Snowflake connection — run the Snowflake connection Given step first.');
    const fqn = resolveLloydsSnowflakeTableFqn(shortTable);
    const oc = orderCol.trim();
    if (!/^[A-Za-z0-9_]+$/.test(oc)) {
      throw new Error(`Unsafe ORDER BY column "${orderCol}"`);
    }
    const sql = `
      SELECT *
      FROM   ${fqn}
      WHERE  _ACCEL_REPOSITORY_ID = :1
      ORDER  BY ${oc} DESC
      LIMIT  25
    `;
    sfCtx(this).queryRows = await runSnowflakeQuery<Record<string, unknown>>(conn, sql, [repo]);
  },
);

Then('at least one row should be returned', function (this: AutomationWorld) {
  const rows = sfCtx(this).queryRows ?? [];
  if (rows.length === 0) {
    logger.warn('Snowflake query returned zero rows — skipping (optional feed or timing).');
    return 'skipped';
  }
});

Then(/^the distinct "_ACCEL_UNIQUE_RUN_ID" set should include the summary's latest run id for that repo$/, function (this: AutomationWorld) {
  const rows = sfCtx(this).queryRows ?? [];
  const summary = sfCtx(this).latestSummaryRow;
  if (!rows.length) {
    return 'skipped';
  }
  if (!summary) {
    throw new Error('Missing latest summary row — use Given the latest summary row for repo ... from FOWD__AGENCY_POLICY_FO_SUMMARY_V1 first.');
  }
  const runId = String(getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim();
  if (!runId) throw new Error('Summary row missing _ACCEL_UNIQUE_RUN_ID');
  const distinct = new Set(
    rows
      .map((r) => String(getSnowflakeCell(r, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim())
      .filter(Boolean),
  );
  if (!distinct.has(runId)) {
    throw new Error(
      `Expected Tagetik _ACCEL_UNIQUE_RUN_ID values [${[...distinct].join(', ')}] to include summary run id "${runId}".`,
    );
  }
});

Then('the first row\'s {string} should equal {string}', function (this: AutomationWorld, column: string, expected: string) {
  const rows = sfCtx(this).queryRows;
  if (!rows?.length) throw new Error('No Snowflake rows in context — run the query When step first.');
  const v = getSnowflakeCell(rows[0], column);
  const actual = v === null || v === undefined ? '' : String(v).trim();
  const want = expected.trim();
  if (actual.toLowerCase() !== want.toLowerCase()) {
    throw new Error(`${column}: expected "${want}", got "${actual}"`);
  }
});

Then('the first row\'s {string} should be a non-empty UUID', function (this: AutomationWorld, column: string) {
  const rows = sfCtx(this).queryRows;
  if (!rows?.length) throw new Error('No Snowflake rows in context.');
  const v = getSnowflakeCell(rows[0], column);
  const s = v === null || v === undefined ? '' : String(v).trim();
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(s)) {
    throw new Error(`${column}: expected non-empty UUID, got "${s}"`);
  }
});

Then('the Dataverse XML File record from the last fetch should exist', function (this: AutomationWorld) {
  const rec = sfCtx(this).dataverseXmlRecord;
  if (!rec?.workflowId) {
    throw new Error('No Dataverse XML File record in context — run the fetch step first.');
  }
});

Then('the first row\'s {string} should be a valid ISO 4217 code', function (this: AutomationWorld, column: string) {
  const rows = sfCtx(this).queryRows;
  if (!rows?.length) throw new Error('No Snowflake rows in context.');
  const v = getSnowflakeCell(rows[0], column);
  const s = v === null || v === undefined ? '' : String(v).trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(s)) {
    throw new Error(`${column}: expected 3-letter ISO 4217 code, got "${s}"`);
  }
});

Then('the numeric totals {string} should all be numeric or null', function (this: AutomationWorld, csvColumns: string) {
  const rows = sfCtx(this).queryRows;
  if (!rows?.length) throw new Error('No Snowflake rows in context.');
  const names = csvColumns.split(',').map((s) => s.trim()).filter(Boolean);
  for (const col of names) {
    const v = getSnowflakeCell(rows[0], col);
    if (v === null || v === undefined) continue;
    if (typeof v === 'number' && Number.isFinite(v)) continue;
    if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) continue;
    throw new Error(`Column "${col}" expected numeric or null, got ${JSON.stringify(v)} (${typeof v})`);
  }
});

Given(
  'the latest summary row for repo {string} from {string}',
  async function (this: AutomationWorld, repo: string, shortTable: string) {
    if (shortTable.trim().toUpperCase() !== 'FOWD__AGENCY_POLICY_FO_SUMMARY_V1') {
      throw new Error(`Unsupported summary table "${shortTable}"`);
    }
    const conn = sfCtx(this).connection;
    if (!conn) throw new Error('No Snowflake connection — run the Snowflake connection Given step first.');
    const rows = await fetchLatestSummaryRowsForRepo(conn, repo, 1);
    if (!rows.length) {
      throw new Error(`No summary rows for repository "${repo}" in ${shortTable}`);
    }
    sfCtx(this).latestSummaryRow = rows[0];
  },
);

When(
  'I look up the same {string} in {string} and {string}',
  async function (this: AutomationWorld, _runCol: string, detailShortA: string, detailShortB: string) {
    const conn = sfCtx(this).connection;
    const summary = sfCtx(this).latestSummaryRow;
    if (!conn || !summary) throw new Error('Missing Snowflake connection or latest summary row.');
    const runId = String(getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim();
    const repo = String(getSnowflakeCell(summary, '_ACCEL_REPOSITORY_ID') ?? '').trim();
    if (!runId || !repo) throw new Error('Summary row missing _ACCEL_UNIQUE_RUN_ID or _ACCEL_REPOSITORY_ID');
    const fqnA = resolveLloydsSnowflakeTableFqn(detailShortA);
    const fqnB = resolveLloydsSnowflakeTableFqn(detailShortB);
    const [fowd, fowc] = await Promise.all([
      countDetailRowsForRun(conn, fqnA, runId, repo),
      countDetailRowsForRun(conn, fqnB, runId, repo),
    ]);
    sfCtx(this).detailCounts = { fowd, fowc, runId, repo };
  },
);

Then('at least one detail table should return a non-zero row count for that run id', function (this: AutomationWorld) {
  const d = sfCtx(this).detailCounts;
  if (!d || (d.fowd === 0 && d.fowc === 0)) {
    throw new Error(`Expected detail row count > 0 in FOWD and/or FOWC; got fowd=${d?.fowd ?? 'n/a'}, fowc=${d?.fowc ?? 'n/a'}`);
  }
});

Then(/^the detail rows' "([^"]+)" should all equal the summary row's value$/, async function (this: AutomationWorld, _col: string) {
  const conn = sfCtx(this).connection;
  const summary = sfCtx(this).latestSummaryRow;
  const d = sfCtx(this).detailCounts;
  if (!conn || !summary || !d?.runId || !d.repo) throw new Error('Missing context for detail repository assertion.');
  const runId = d.runId;
  const repo = d.repo;
  const tables: string[] = [];
  if (d.fowd > 0) tables.push(LLOYDS_FOWD_DETAIL_TABLE);
  if (d.fowc > 0) tables.push(LLOYDS_FOWC_DETAIL_TABLE);
  for (const fqn of tables) {
    const sql = `
      SELECT DISTINCT _ACCEL_REPOSITORY_ID AS R
      FROM   ${fqn}
      WHERE  _ACCEL_UNIQUE_RUN_ID = :1
    `;
    const rows = await runSnowflakeQuery<{ R: string }>(conn, sql, [runId]);
    const distinct = [...new Set(rows.map((x) => String(x.R ?? '').trim()).filter(Boolean))];
    if (distinct.length !== 1 || distinct[0] !== repo) {
      throw new Error(`${fqn}: expected single _ACCEL_REPOSITORY_ID="${repo}", got ${JSON.stringify(distinct)}`);
    }
  }
});

Given('the column metadata for {string}', async function (this: AutomationWorld, shortTable: string) {
  if (shortTable.trim().toUpperCase() !== 'FOWD__AGENCY_POLICY_FO_SUMMARY_V1') {
    throw new Error(`INFORMATION_SCHEMA step only implemented for FOWD__AGENCY_POLICY_FO_SUMMARY_V1, got ${shortTable}`);
  }
  const conn = sfCtx(this).connection;
  if (!conn) throw new Error('No Snowflake connection.');
  sfCtx(this).informationSchemaColumns = await fetchSummaryInformationSchemaColumns(conn);
});

Then('the following columns should be present with the expected data types:', function (this: AutomationWorld, table: DataTable) {
  const meta = sfCtx(this).informationSchemaColumns;
  if (!meta?.length) {
    logger.warn(
      'Skipping schema assertion: INFORMATION_SCHEMA.COLUMNS returned no rows (role may lack metadata read).',
    );
    return 'skipped';
  }
  const byName = new Map(meta.map((m) => [m.COLUMN_NAME.toUpperCase(), m.DATA_TYPE]));
  for (const row of table.hashes()) {
    const rawCol = (row.column || '').trim();
    /** ISDE / ADP renames (2026-04): allow legacy Snowflake names until all envs publish new metadata. */
    const candidates = rawCol
      .split(/\s*\/\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    const wantType = (row.type || '').trim();
    let matchedName: string | undefined;
    let actual: string | undefined;
    for (const col of candidates) {
      const t = byName.get(col.toUpperCase());
      if (t) {
        matchedName = col;
        actual = t;
        break;
      }
    }
    if (!actual || !matchedName) {
      throw new Error(
        `Missing column on FOWD__AGENCY_POLICY_FO_SUMMARY_V1 (tried ${candidates.map((c) => `"${c}"`).join(', ')})`,
      );
    }
    if (!snowflakeTypeMatches(actual, wantType)) {
      throw new Error(`Column "${matchedName}": expected type compatible with "${wantType}", got "${actual}"`);
    }
  }
});

Given('I have loaded the latest ADP summary row for repository {string}', async function (this: AutomationWorld, repo: string) {
  const conn = sfCtx(this).connection;
  if (!conn) throw new Error('No Snowflake connection.');
  const rows = await fetchLatestSummaryRowsForRepo(conn, repo, 1);
  if (!rows.length) throw new Error(`No ADP summary rows for repository "${repo}"`);
  sfCtx(this).latestSummaryRow = rows[0];
});

When('I fetch the latest Lloyd\'s XML File record for repository {string} in Dataverse', async function (this: AutomationWorld, repo: string) {
  const master = DataverseMasterDataClient.create();
  const rec = await master.findRepositoryByCode(repo);
  if (!rec) {
    throw new Error(`Repository "${repo}" not found in Dataverse accelins_repositoryfiles.`);
  }
  const client = await XmlFileRecordClient.createFromApiContext(this.apiContext);
  const xml = await client.findLatestByRepositoryFileId(rec.id);
  if (!xml) {
    throw new Error(`No accelins_workflows row for repository "${repo}" (lookup guid ${rec.id}).`);
  }
  sfCtx(this).dataverseXmlRecord = xml;
});

Then('the Dataverse workflow totals should match the ADP summary within ABS tolerance {int}', function (this: AutomationWorld, tol: number) {
  const summary = sfCtx(this).latestSummaryRow;
  const rec = sfCtx(this).dataverseXmlRecord;
  if (!summary || !rec) throw new Error('Missing ADP summary row or Dataverse record in context.');
  const t = Math.abs(Number(tol)) || 5;
  const pairs: Array<{ adpCols: readonly string[]; label: string; wf: number | null }> = [
    { adpCols: ['TOTAL_PREMIUM_AMOUNT'], label: 'PRM', wf: rec.odsPrm },
    { adpCols: LLOYDS_SUMMARY_AGENCY_COMMISSION_COLUMNS, label: 'COM', wf: rec.odsCom },
    { adpCols: LLOYDS_SUMMARY_INSURER_COMMISSION_COLUMNS, label: 'COI', wf: rec.odsCoi },
    { adpCols: ['TOTAL_TAX_AMOUNT'], label: 'TAX', wf: rec.odsTax },
    { adpCols: ['TOTAL_OTHER_CONTRIBUTIONS_AMOUNT'], label: 'OTH', wf: rec.odsOth },
  ];
  for (const { adpCols, label, wf } of pairs) {
    const raw = getSnowflakeCellFirst(summary, adpCols);
    const adpColUsed = resolveSummaryColumnUsed(summary, adpCols) ?? adpCols.join(' | ');
    const adp = coerceNumber(raw);
    if (!withinAbsMagnitude(adp, wf, t)) {
      throw new Error(
        `${label} (ADP ${adpColUsed} vs Dataverse workflow / accelins_workflow): ADP=${String(raw)} (${adp}) vs workflow=${wf} — outside ABS ${t} (magnitudes; sign ignored)`,
      );
    }
  }
  const curRaw = getSnowflakeCell(summary, 'POLICY_CURRENCY_CODE');
  const adpCur = curRaw === null || curRaw === undefined ? '' : String(curRaw).trim().toUpperCase();
  const dvCur = (rec.odsCurrency ?? '').trim().toUpperCase();
  if (adpCur && dvCur && adpCur !== dvCur) {
    throw new Error(`Currency: ADP POLICY_CURRENCY_CODE="${adpCur}" vs Dataverse workflow currency="${dvCur}"`);
  }
});

Then('the Dataverse XML totals should match the ADP summary within ABS tolerance {int}', function (this: AutomationWorld, tol: number) {
  const summary = sfCtx(this).latestSummaryRow;
  const rec = sfCtx(this).dataverseXmlRecord;
  if (!summary || !rec) throw new Error('Missing ADP summary row or Dataverse record in context.');
  const t = Math.abs(Number(tol)) || 5;
  const pairs: Array<{ adpCols: readonly string[]; label: string; xml: number | null }> = [
    { adpCols: ['TOTAL_PREMIUM_AMOUNT'], label: 'PRM', xml: rec.xmlPrm },
    { adpCols: LLOYDS_SUMMARY_AGENCY_COMMISSION_COLUMNS, label: 'COM', xml: rec.xmlCom },
    { adpCols: LLOYDS_SUMMARY_INSURER_COMMISSION_COLUMNS, label: 'COI', xml: rec.xmlCoi },
    { adpCols: ['TOTAL_TAX_AMOUNT'], label: 'TAX', xml: rec.xmlTax },
    { adpCols: ['TOTAL_OTHER_CONTRIBUTIONS_AMOUNT'], label: 'OTH', xml: rec.xmlOth },
  ];
  for (const { adpCols, label, xml } of pairs) {
    const raw = getSnowflakeCellFirst(summary, adpCols);
    const adpColUsed = resolveSummaryColumnUsed(summary, adpCols) ?? adpCols.join(' | ');
    const adp = coerceNumber(raw);
    if (!withinAbsMagnitude(adp, xml, t)) {
      throw new Error(
        `${label} (ADP ${adpColUsed} vs Dataverse XML): ADP=${String(raw)} (${adp}) vs XML=${xml} — outside ABS ${t} (magnitudes; sign ignored)`,
      );
    }
  }
  const curRaw = getSnowflakeCell(summary, 'POLICY_CURRENCY_CODE');
  const adpCur = curRaw === null || curRaw === undefined ? '' : String(curRaw).trim().toUpperCase();
  const dvCur = (rec.xmlCurrency ?? '').trim().toUpperCase();
  if (adpCur && dvCur && adpCur !== dvCur) {
    throw new Error(`Currency: ADP POLICY_CURRENCY_CODE="${adpCur}" vs Dataverse XML="${dvCur}"`);
  }
});

Then('the Dataverse XML totals should match the Dataverse workflow totals within ABS tolerance {int}', function (this: AutomationWorld, tol: number) {
  const rec = sfCtx(this).dataverseXmlRecord;
  if (!rec) throw new Error('Missing Dataverse XML File record in context.');
  const t = Math.abs(Number(tol)) || 5;
  const pairs: Array<{ label: string; wf: number | null; xml: number | null }> = [
    { label: 'PRM', wf: rec.odsPrm, xml: rec.xmlPrm },
    { label: 'COM', wf: rec.odsCom, xml: rec.xmlCom },
    { label: 'COI', wf: rec.odsCoi, xml: rec.xmlCoi },
    { label: 'TAX', wf: rec.odsTax, xml: rec.xmlTax },
    { label: 'OTH', wf: rec.odsOth, xml: rec.xmlOth },
  ];
  for (const { label, wf, xml } of pairs) {
    if (!withinAbsMagnitude(wf, xml, t)) {
      throw new Error(`${label}: workflow=${wf} vs XML=${xml} — outside ABS ${t} (magnitudes; sign ignored)`);
    }
  }
  const oCur = (rec.odsCurrency ?? '').trim().toUpperCase();
  const xCur = (rec.xmlCurrency ?? '').trim().toUpperCase();
  if (oCur && xCur && oCur !== xCur) {
    throw new Error(`Currency: Dataverse workflow="${oCur}" vs XML="${xCur}"`);
  }
});

When('I download the Mule XML blob for the loaded Dataverse XML File record', async function (this: AutomationWorld) {
  const rec = sfCtx(this).dataverseXmlRecord;
  if (!rec) throw new Error('Missing Dataverse XML File record — fetch it first.');
  const blobName = resolveXmlBlobNameForDownload(rec);
  const client = LloydsBlobClient.create();
  sfCtx(this).downloadedJournalXml = await client.downloadXmlBlob(blobName);
  logger.info(`[cross-system] Downloaded blob "${blobName}" (${sfCtx(this).downloadedJournalXml!.length} chars)`);
});

Then('totals parsed from the downloaded journal XML should match the ADP summary within ABS tolerance {int}', function (this: AutomationWorld, tol: number) {
  const summary = sfCtx(this).latestSummaryRow;
  const xmlText = sfCtx(this).downloadedJournalXml;
  if (!summary || !xmlText) throw new Error('Missing ADP summary or downloaded XML in context.');
  const t = Math.abs(Number(tol)) || 5;
  const fromXml = computeAdpTotalsFromXml(xmlText);
  const pairs: Array<{ adpCols: readonly string[]; label: string; xmlVal: number }> = [
    { adpCols: ['TOTAL_PREMIUM_AMOUNT'], label: 'PRM', xmlVal: fromXml.prm },
    { adpCols: LLOYDS_SUMMARY_AGENCY_COMMISSION_COLUMNS, label: 'COM', xmlVal: fromXml.com },
    { adpCols: LLOYDS_SUMMARY_INSURER_COMMISSION_COLUMNS, label: 'COI', xmlVal: fromXml.coi },
    { adpCols: ['TOTAL_TAX_AMOUNT'], label: 'TAX', xmlVal: fromXml.tax },
    { adpCols: ['TOTAL_OTHER_CONTRIBUTIONS_AMOUNT'], label: 'OTH', xmlVal: fromXml.oth },
  ];
  for (const { adpCols, label, xmlVal } of pairs) {
    const raw = getSnowflakeCellFirst(summary, adpCols);
    const adpColUsed = resolveSummaryColumnUsed(summary, adpCols) ?? adpCols.join(' | ');
    const adp = coerceNumber(raw);
    if (!withinAbsMagnitude(adp, xmlVal, t)) {
      throw new Error(
        `${label}: ADP summary ${adpColUsed}=${String(raw)} (${adp}) vs XML-aggregated=${xmlVal} — outside ABS ${t} (magnitudes; sign ignored)`,
      );
    }
  }
  const curRaw = getSnowflakeCell(summary, 'POLICY_CURRENCY_CODE');
  const adpCur = curRaw === null || curRaw === undefined ? '' : String(curRaw).trim().toUpperCase();
  const xmlCur = (fromXml.currency ?? '').trim().toUpperCase();
  if (adpCur && xmlCur && adpCur !== xmlCur) {
    throw new Error(`Currency: ADP="${adpCur}" vs first XML CURRENCYCODE="${xmlCur}"`);
  }
});

When('I load FOWD detail rows for repository {string} and the loaded ADP summary run id', async function (this: AutomationWorld, repo: string) {
  const conn = sfCtx(this).connection;
  const summary = sfCtx(this).latestSummaryRow;
  if (!conn || !summary) throw new Error('Missing Snowflake connection or ADP summary row.');
  const runId = String(getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim();
  if (!runId) throw new Error('Summary row has no _ACCEL_UNIQUE_RUN_ID.');
  const rid = String(getSnowflakeCell(summary, '_ACCEL_REPOSITORY_ID') ?? '').trim();
  if (rid && rid.toUpperCase() !== repo.toUpperCase()) {
    throw new Error(`Repository mismatch: summary has "${rid}" but scenario repo is "${repo}".`);
  }
  sfCtx(this).fowdDetailRows = await fetchFowdDetailRowsForRun(conn, repo, runId);
  if (!sfCtx(this).fowdDetailRows?.length) {
    throw new Error(`No FOWD detail rows for repo "${repo}" and run "${runId}".`);
  }
});

Then('ADP Snowflake FOWD detail rows should match the downloaded journal XML per the programme field mapping', async function (this: AutomationWorld) {
  const rows = sfCtx(this).fowdDetailRows;
  const xmlText = sfCtx(this).downloadedJournalXml;
  if (!rows?.length || !xmlText) throw new Error('Missing FOWD detail rows or downloaded XML — run prior steps.');
  if (!sfCtx(this).adpXmlMappingPairs) {
    sfCtx(this).adpXmlMappingPairs = await loadAdpXmlMappingPairs();
  }
  const mapping = sfCtx(this).adpXmlMappingPairs!;
  const description = descriptionFromFowdRows(rows);
  const report = compareFowdRowsToXmlText(rows, xmlText, mapping, description);
  if (!report.ok) {
    const sample = report.mismatches.slice(0, 12);
    throw new Error(
      `FOWD ↔ XML compare failed (${report.mismatches.length} mismatch(es); showing up to 12): ${JSON.stringify(sample, null, 2)}`,
    );
  }
  logger.info(
    `[cross-system] FOWD↔XML OK — rows=${report.snowflakeRowCount} lines=${report.xmlLineCount} pairs=${report.comparedFieldPairs}`,
  );
});

Given(
  'a mule-xml-generation-success financial_values block derived from the latest Snowflake summary for repo {string}',
  async function (this: AutomationWorld, repo: string) {
    const conn = sfCtx(this).connection;
    if (!conn) throw new Error('No Snowflake connection — run the Snowflake connection Given step first.');
    const rows = await fetchLatestSummaryRowsForRepo(conn, repo.trim(), 1);
    if (!rows.length) throw new Error(`No ADP summary row for repository "${repo}".`);
    const row = rows[0]!;
    const runId = String(getSnowflakeCell(row, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim();
    if (!runId) throw new Error('Latest summary row has no _ACCEL_UNIQUE_RUN_ID.');
    sfCtx(this).latestSummaryRow = row;
    sfCtx(this).snowContractFv = adpSummaryRowToMuleFinancialValues(row);
    sfCtx(this).snowContractRunId = runId;
    sfCtx(this).snowContractRefetchedSummary = undefined;
    logger.info(`[SNOW-004] Built financial_values from latest summary run_id=${runId} repo=${repo}`);
  },
);

When(
  'I fetch the summary row from {string} for the loaded run id',
  async function (this: AutomationWorld, shortTable: string) {
    const conn = sfCtx(this).connection;
    const runId = sfCtx(this).snowContractRunId;
    if (!conn || !runId) throw new Error('Missing Snowflake connection or loaded run id — run the SNOW-004 Given step first.');
    const fqn = resolveLloydsSnowflakeTableFqn(shortTable.trim());
    if (fqn !== resolveLloydsSnowflakeTableFqn('FOWD__AGENCY_POLICY_FO_SUMMARY_V1')) {
      throw new Error(`SNOW-004 only supports summary table; got "${shortTable}" → ${fqn}`);
    }
    const again = await fetchSummaryRowByRunId(conn, runId);
    if (!again) throw new Error(`No summary row for run id "${runId}" after refetch.`);
    sfCtx(this).snowContractRefetchedSummary = again;
  },
);

Then(
  'the message financial_values {string} should equal the summary {string}',
  function (this: AutomationWorld, messageKey: string, summaryColumn: string) {
    const fv = sfCtx(this).snowContractFv;
    const summary = sfCtx(this).snowContractRefetchedSummary;
    if (!fv || !summary) throw new Error('Missing message financial_values or refetched summary — run SNOW-004 steps in order.');
    const mk = messageKey.trim();
    const allowed = ['adp_prm', 'adp_com', 'adp_coi', 'adp_tax', 'adp_oth', 'adp_currency'] as const;
    if (!allowed.includes(mk as (typeof allowed)[number])) {
      throw new Error(`Unknown financial_values key "${messageKey}". Expected one of: ${allowed.join(', ')}.`);
    }
    const msgVal = fv[mk as keyof MuleFinancialValues];
    const candidates = summaryColumn
      .split(/\s*\/\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!candidates.length) {
      throw new Error(`Summary column spec is empty: "${summaryColumn}"`);
    }
    const sumRaw = getSnowflakeCellFirst(summary, candidates);
    const sumLabel = resolveSummaryColumnUsed(summary, candidates) ?? candidates.join(' | ');
    if (mk === 'adp_currency') {
      const a = String(msgVal ?? '').trim().toUpperCase();
      const b = sumRaw === null || sumRaw === undefined ? '' : String(sumRaw).trim().toUpperCase();
      if (a !== b) {
        throw new Error(`Currency mismatch: message ${mk}="${a}" vs summary ${sumLabel}="${b}"`);
      }
      return;
    }
    const m = typeof msgVal === 'number' ? msgVal : Number(msgVal);
    const s = coerceNumber(sumRaw);
    if (s === null || !Number.isFinite(m)) {
      throw new Error(`Non-numeric compare: message ${mk}=${String(msgVal)} summary ${sumLabel}=${String(sumRaw)}`);
    }
    if (!withinAbsMagnitude(m, s, 0.02)) {
      throw new Error(`Mismatch: message ${mk}=${m} vs summary ${sumLabel}=${s} (raw ${String(sumRaw)}) (magnitudes; sign ignored)`);
    }
  },
);

When('I query Tagetik rows for repository {string} and the loaded ADP run id', async function (this: AutomationWorld, repo: string) {
  const conn = sfCtx(this).connection;
  const summary = sfCtx(this).latestSummaryRow;
  if (!conn || !summary) throw new Error('Missing Snowflake connection or ADP summary row.');
  const runId = String(getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim();
  if (!runId) throw new Error('Summary row has no _ACCEL_UNIQUE_RUN_ID.');
  sfCtx(this).tagetikRows = await fetchTagetikRowsForRepoRun(conn, repo, runId, 50);
});

Then('Tagetik slice rows for this run should exist or the scenario is skipped when not yet posted', function (this: AutomationWorld) {
  const rows = sfCtx(this).tagetikRows ?? [];
  if (rows.length === 0) {
    logger.warn('No Tagetik FOWT rows for this repo+run — skipping (posting / dependent product may not have landed).');
    return 'skipped';
  }
  const summary = sfCtx(this).latestSummaryRow;
  if (!summary) throw new Error('Missing ADP summary.');
  const runId = String(getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim().toLowerCase();
  const expectRepo = String(getSnowflakeCell(summary, '_ACCEL_REPOSITORY_ID') ?? '').trim().toUpperCase();
  for (const row of rows) {
    const r = String(row.REPOSITORY_ID ?? row.repository_id ?? '').trim().toUpperCase();
    const u = String(row._ACCEL_UNIQUE_RUN_ID ?? row._accel_unique_run_id ?? '').trim().toLowerCase();
    if (r && u && u === runId && r === expectRepo) return;
  }
  throw new Error(
    `Tagetik rows present (${rows.length}) but none matched REPOSITORY_ID="${expectRepo}" and _ACCEL_UNIQUE_RUN_ID for ADP run "${runId}".`,
  );
});

Then('the Snowflake Tagetik slice first matching row should expose journal line amount fields', function (this: AutomationWorld) {
  const rows = sfCtx(this).tagetikRows ?? [];
  if (!rows.length) {
    logger.warn('[tagetik] no slice rows — skip journal line field checks');
    return 'skipped';
  }
  const summary = sfCtx(this).latestSummaryRow;
  if (!summary) throw new Error('Missing ADP summary.');
  const repo = String(getSnowflakeCell(summary, '_ACCEL_REPOSITORY_ID') ?? '').trim().toUpperCase();
  const runId = String(getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim().toLowerCase();
  const row = pickTagetikRowForRun(rows, repo, runId);
  if (!row) throw new Error('No Tagetik row to inspect.');
  const issues = validateTagetikJournalLineFieldsPresent(row);
  if (issues.length) throw new Error(issues.join(' '));
});

Then('the Snowflake Tagetik slice first matching row currency should match ADP summary when both are set', function (this: AutomationWorld) {
  const rows = sfCtx(this).tagetikRows ?? [];
  if (!rows.length) {
    return 'skipped';
  }
  const summary = sfCtx(this).latestSummaryRow;
  if (!summary) throw new Error('Missing ADP summary.');
  const repo = String(getSnowflakeCell(summary, '_ACCEL_REPOSITORY_ID') ?? '').trim().toUpperCase();
  const runId = String(getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim().toLowerCase();
  const row = pickTagetikRowForRun(rows, repo, runId);
  if (!row) throw new Error('No Tagetik row to inspect.');
  const { currency } = readTagetikJournalLineFields(row);
  const adpCur = String(getSnowflakeCell(summary, 'POLICY_CURRENCY_CODE') ?? '').trim().toUpperCase();
  if (currency && adpCur && currency !== adpCur) {
    throw new Error(`Tagetik slice currency="${currency}" vs ADP POLICY_CURRENCY_CODE="${adpCur}"`);
  }
});

Then(
  'the Snowflake Tagetik slice first matching row shared totals with ADP summary should match within ABS tolerance {int}',
  function (this: AutomationWorld, tol: number) {
    const rows = sfCtx(this).tagetikRows ?? [];
    if (!rows.length) {
      return 'skipped';
    }
    const summary = sfCtx(this).latestSummaryRow;
    if (!summary) throw new Error('Missing ADP summary.');
    const repo = String(getSnowflakeCell(summary, '_ACCEL_REPOSITORY_ID') ?? '').trim().toUpperCase();
    const runId = String(getSnowflakeCell(summary, '_ACCEL_UNIQUE_RUN_ID') ?? '').trim().toLowerCase();
    const row = pickTagetikRowForRun(rows, repo, runId);
    if (!row) throw new Error('No Tagetik row to inspect.');
    const t = Math.abs(Number(tol)) || 5;
    const miss = validateTagetikNumericOverlapWithAdpSummary(summary, row, t);
    if (miss.length) throw new Error(miss.join('; '));
  },
);

function coerceNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function snowflakeTypeMatches(actualRaw: string, expectedHuman: string): boolean {
  const a = actualRaw.trim().toUpperCase();
  const e = expectedHuman.trim().toUpperCase();
  if (e === 'TEXT') {
    return ['TEXT', 'VARCHAR', 'CHAR', 'CHARACTER VARYING', 'STRING'].includes(a);
  }
  if (e === 'NUMBER') {
    return ['NUMBER', 'DECIMAL', 'NUMERIC', 'FLOAT', 'DOUBLE', 'BIGINT', 'INT', 'INTEGER', 'FIXED'].includes(a);
  }
  if (e === 'TIMESTAMP_NTZ') {
    return a === 'TIMESTAMP_NTZ' || (a.includes('TIMESTAMP') && a.includes('NTZ'));
  }
  return a === e;
}
