#!/usr/bin/env ts-node
/**
 * Diagnose why a given Repository ID's runs are stuck or failing.
 *
 * Pulls the same repo's view from all three sources of truth, then prints a
 * side-by-side table per run:
 *
 *   1. Mule control plane   — `dbo.PROCESS_TRACKER` (CURRENT_STAGE, WATERMARK, file name)
 *   2. Dataverse            — `accelins_workflow` records (ADP totals + XML totals + match toggles)
 *   3. Re-parse of the blob — `xmlTotals.computeAdpTotalsFromXml` against the same XML
 *
 * The output makes it easy to tell apart:
 *   - **ADP grain / duplicates** — detail vs summary products or duplicate keys in Snowflake; can show as ~2× XML vs ODS when the message carries deduped summary totals but XML reflects full detail rows
 *   - **transform bug** — consistent delta between ADP vs XML across retries with same watermark (after ADP grain is ruled out)
 *   - **watermark race** — deltas vary by run with different WATERMARKs
 *   - **XML-parser drift on our side** — Dataverse's stored XML totals differ from our re-parse
 *
 * Usage:
 *   npx ts-node scripts/lloyds/diagnose-repo.ts --repo-id US-61273
 *   npx ts-node scripts/lloyds/diagnose-repo.ts --repo-id CA-6178 --limit 5
 *   npx ts-node scripts/lloyds/diagnose-repo.ts --repo-id US-61273 --skip-blobs   (Mule+DV only)
 *
 * Auth: reuses the same `DefaultAzureCredential → SPN` chain as the rest of the
 * Lloyd's automation (see `src/integrations/lloyds/credential.ts`).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import * as sql from 'mssql';

import {
  dataverseScope,
  getDiscoveryCredential,
} from '../../src/integrations/lloyds/credential';
import { BlobServiceClient } from '@azure/storage-blob';

import { computeAdpTotalsFromXml, totalsToServiceBusPayload } from '../../src/integrations/lloyds/xmlTotals';

// ---------------------------------------------------------------------------
// Env + constants
// ---------------------------------------------------------------------------

for (const p of [
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env.qa'),
  path.resolve(__dirname, '../../.env'),
]) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p, override: true });
    console.log(`Loaded env: ${path.relative(process.cwd(), p)}\n`);
    break;
  }
}

const DEFAULTS = {
  sqlServer:       'sql-dev-uks-lyd.database.windows.net',
  sqlDatabase:     'sqldb-dev-uks-lyd',
  sqlScope:        'https://database.windows.net/.default',
  dataverseHost:   'https://accelinsqatest.crm11.dynamics.com',
  dataverseApiVer: 'v9.2',
};

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Args {
  repoId?: string;
  limit: number;
  skipBlobs: boolean;
  dumpXmlSample: boolean;
  xmlSampleCount: number;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { limit: 10, skipBlobs: false, dumpXmlSample: false, xmlSampleCount: 3, help: false };
  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case '--repo-id': a.repoId = argv[++i]; break;
      case '--limit': a.limit = Math.max(1, Number(argv[++i])); break;
      case '--skip-blobs': a.skipBlobs = true; break;
      case '--dump-xml-sample': a.dumpXmlSample = true; break;
      case '--xml-sample-count': a.xmlSampleCount = Math.max(1, Number(argv[++i])); break;
      case '--help':
      case '-h': a.help = true; break;
      default:
        if (argv[i].startsWith('--')) throw new Error(`Unknown flag: ${argv[i]}`);
    }
  }
  return a;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MuleRow {
  PROCESS_ID: string;
  PROCESS_NAME: string;
  REPO_ID: string;
  REPO_GUID: string | null;
  CURRENT_STAGE: string | null;
  PROCESS_STATUS: string | null;
  SOURCE_ROW_COUNT: number | null;
  XML_FILE_NAME: string | null;
  BLOB_STORAGE_PATH: string | null;
  INITIATED_BY: string | null;
  UPDATED: Date | null;
  WATERMARK: Date | null;
}

interface DvRow {
  workflowId: string;
  name: string | null;
  correlationId: string | null;
  blobId: string | null;
  fileName: string | null;
  statusCode: number | null;
  stateCode: number | null;
  overallMatch: boolean | null;
  currencyMatch: boolean | null;
  prmMatch: boolean | null;
  comMatch: boolean | null;
  coiMatch: boolean | null;
  taxMatch: boolean | null;
  othMatch: boolean | null;
  odsPrm: number | null;
  odsCom: number | null;
  odsCoi: number | null;
  odsTax: number | null;
  odsOth: number | null;
  odsCurrency: string | null;
  xmlPrm: number | null;
  xmlCom: number | null;
  xmlCoi: number | null;
  xmlTax: number | null;
  xmlOth: number | null;
  xmlCurrency: string | null;
}

interface LinePatternStats {
  totalLines: number;
  uniqueDocuments: number;
  uniqueTextLines: number;
  maxDupCount: number;
  /** Top few (document|text) keys and how many times they appear. */
  top: Array<{ key: string; count: number }>;
  /** TEXT -> total DEBIT over all occurrences, and total CREDIT. For invoking sanity on per-line amounts. */
  amountsByCategory: Record<string, { debit: number; credit: number; lines: number }>;
}

interface CombinedRun {
  mule: MuleRow;
  dv: DvRow | null;
  reparsed?: {
    prm: number;
    com: number;
    coi: number;
    tax: number;
    oth: number;
    currency: string;
    lineCount: number;
    legTagCount: number;
    fetchedFrom: string;
    xmlSample?: string[];
    patternAnalysis?: LinePatternStats;
  };
  reparseError?: string;
}

/**
 * Inspect every <LEDGERJOURNALENTITY> block in an XML and count:
 *   - unique DOCUMENTs and unique TEXT strings (a TEXT is "{repo} | {txType} | {category} | ..."
 *     so is naturally unique per business line)
 *   - highest repetition count on any (DOCUMENT, TEXT) key → 1 = no dup, 2+ = duplication bug
 *   - per-category totals of DEBIT vs CREDIT to cross-check the `xmlTotals` output
 */
function analyseLinePatterns(blocks: string[]): LinePatternStats {
  const keyCount = new Map<string, number>();
  const documents = new Set<string>();
  const textLines = new Set<string>();
  const amountsByCategory: Record<string, { debit: number; credit: number; lines: number }> = {};

  for (const block of blocks) {
    const doc = extractField(block, 'DOCUMENT') ?? '';
    const txt = extractField(block, 'TEXT') ?? '';
    const debit = Number(extractField(block, 'DEBITAMOUNT') ?? '0') || 0;
    const credit = Number(extractField(block, 'CREDITAMOUNT') ?? '0') || 0;
    documents.add(doc);
    textLines.add(txt);
    const key = `${doc}|${txt}`;
    keyCount.set(key, (keyCount.get(key) ?? 0) + 1);

    const category = (txt.split('|')[2] ?? '').trim().toUpperCase() || 'UNKNOWN';
    const slot = amountsByCategory[category] ?? { debit: 0, credit: 0, lines: 0 };
    slot.debit += debit;
    slot.credit += credit;
    slot.lines += 1;
    amountsByCategory[category] = slot;
  }
  const maxDupCount = Math.max(1, ...Array.from(keyCount.values()));
  const top = Array.from(keyCount.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  return {
    totalLines: blocks.length,
    uniqueDocuments: documents.size,
    uniqueTextLines: textLines.size,
    maxDupCount,
    top,
    amountsByCategory,
  };
}

function extractField(xmlBlock: string, tag: string): string | null {
  const elt = xmlBlock.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`));
  if (elt) return elt[1].trim();
  const attr = xmlBlock.match(new RegExp(`\\b${tag}="([^"]*)"`));
  return attr ? attr[1].trim() : null;
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

async function fetchMuleRuns(credential: Awaited<ReturnType<typeof getDiscoveryCredential>>['credential'], repoId: string, limit: number): Promise<MuleRow[]> {
  const token = await credential.getToken(DEFAULTS.sqlScope);
  if (!token) throw new Error('No SQL token.');
  const pool = await sql.connect({
    server: DEFAULTS.sqlServer,
    database: DEFAULTS.sqlDatabase,
    options: { encrypt: true, trustServerCertificate: false },
    authentication: { type: 'azure-active-directory-access-token', options: { token: token.token } },
    pool: { max: 1, min: 0, idleTimeoutMillis: 5_000 },
    requestTimeout: 30_000,
  });
  try {
    const result = await pool.request()
      .input('repoId', sql.NVarChar, repoId)
      .input('lim', sql.Int, limit)
      .query<MuleRow>(`
        SELECT TOP (@lim)
          PROCESS_ID, PROCESS_NAME, REPO_ID, REPO_GUID, CURRENT_STAGE, PROCESS_STATUS,
          SOURCE_ROW_COUNT, XML_FILE_NAME, BLOB_STORAGE_PATH, INITIATED_BY, UPDATED, WATERMARK
        FROM dbo.PROCESS_TRACKER
        WHERE REPO_ID = @repoId
        ORDER BY UPDATED DESC
      `);
    return result.recordset;
  } finally {
    await pool.close();
  }
}

async function fetchDataverseRows(credential: Awaited<ReturnType<typeof getDiscoveryCredential>>['credential'], repoId: string, limit: number): Promise<DvRow[]> {
  const scope = dataverseScope(DEFAULTS.dataverseHost);
  const token = await credential.getToken(scope);
  if (!token) throw new Error('No Dataverse token.');
  const headers = {
    Authorization: `Bearer ${token.token}`,
    Accept: 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  };
  // 1. Resolve repo code -> GUID
  const repoUrl = `${DEFAULTS.dataverseHost}/api/data/${DEFAULTS.dataverseApiVer}/accelins_repositoryfiles?$filter=accelins_name eq '${repoId.replace(/'/g, "''")}'&$select=accelins_repositoryfileid&$top=1`;
  const repoRes = await fetch(repoUrl, { headers });
  if (!repoRes.ok) throw new Error(`Dataverse lookup for accelins_repositoryfiles failed: ${repoRes.status} ${await repoRes.text()}`);
  const repoJson = (await repoRes.json()) as { value: Array<{ accelins_repositoryfileid: string }> };
  if (!repoJson.value?.length) {
    throw new Error(`No accelins_repositoryfile record found for repoId "${repoId}".`);
  }
  const repoGuid = repoJson.value[0].accelins_repositoryfileid;

  // 2. Query workflows linked to that repo, most recent first
  const select = [
    'accelins_workflowid',
    'accelins_name',
    'accelins_correlation_id',
    'accelins_blob_id',
    'accelins_file_name',
    'statuscode',
    'statecode',
    'accelins_overall_match',
    'accelins_currency_match',
    'accelins_total_premium_amount_match',
    'accelins_total_agency_commission_amount_match',
    'accelins_total_commission_amount_match',
    'accelins_total_tax_amount_match',
    'accelins_total_other_ontributions_amount_match',
    'accelins_ods_total_premium_amount',
    'accelins_ods_total_agency_commission_amount',
    'accelins_ods_total_commission_amount',
    'accelins_ods_total_tax_amount',
    'accelins_ods_total_other_contributions_amount',
    'accelins_ods_currency',
    'accelins_xml_total_premium_amount',
    'accelins_xml_total_agency_commission_amount',
    'accelins_xml_total_commission_amount',
    'accelins_xml_total_tax_amount',
    'accelins_xml_total_other_contributions_amount',
    'accelins_xml_currency',
  ].join(',');

  const wfUrl = `${DEFAULTS.dataverseHost}/api/data/${DEFAULTS.dataverseApiVer}/accelins_workflows?$filter=_accelins_repositoryfile_value eq ${repoGuid}&$select=${select}&$orderby=createdon desc&$top=${limit}`;
  const wfRes = await fetch(wfUrl, { headers });
  if (!wfRes.ok) throw new Error(`Dataverse query for accelins_workflows failed: ${wfRes.status} ${await wfRes.text()}`);
  const wfJson = (await wfRes.json()) as { value: Array<Record<string, unknown>> };
  return wfJson.value.map((r) => ({
    workflowId: String(r['accelins_workflowid'] ?? ''),
    name: asString(r['accelins_name']),
    correlationId: asString(r['accelins_correlation_id']),
    blobId: asString(r['accelins_blob_id']),
    fileName: asString(r['accelins_file_name']),
    statusCode: asNumber(r['statuscode']),
    stateCode: asNumber(r['statecode']),
    overallMatch: asBool(r['accelins_overall_match']),
    currencyMatch: asBool(r['accelins_currency_match']),
    prmMatch: asBool(r['accelins_total_premium_amount_match']),
    comMatch: asBool(r['accelins_total_agency_commission_amount_match']),
    coiMatch: asBool(r['accelins_total_commission_amount_match']),
    taxMatch: asBool(r['accelins_total_tax_amount_match']),
    othMatch: asBool(r['accelins_total_other_ontributions_amount_match']),
    odsPrm: asNumber(r['accelins_ods_total_premium_amount']),
    odsCom: asNumber(r['accelins_ods_total_agency_commission_amount']),
    odsCoi: asNumber(r['accelins_ods_total_commission_amount']),
    odsTax: asNumber(r['accelins_ods_total_tax_amount']),
    odsOth: asNumber(r['accelins_ods_total_other_contributions_amount']),
    odsCurrency: asString(r['accelins_ods_currency']),
    xmlPrm: asNumber(r['accelins_xml_total_premium_amount']),
    xmlCom: asNumber(r['accelins_xml_total_agency_commission_amount']),
    xmlCoi: asNumber(r['accelins_xml_total_commission_amount']),
    xmlTax: asNumber(r['accelins_xml_total_tax_amount']),
    xmlOth: asNumber(r['accelins_xml_total_other_contributions_amount']),
    xmlCurrency: asString(r['accelins_xml_currency']),
  }));
}

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.length > 0 && Number.isFinite(Number(v))) return Number(v);
  return null;
}
function asBool(v: unknown): boolean | null {
  if (typeof v === 'boolean') return v;
  return null;
}

/**
 * Best-effort pairing between a Mule PROCESS_TRACKER row and a Dataverse accelins_workflow
 * row. They don't share a direct key, so we try (in order):
 *   1. accelins_blob_id exactly matches PROCESS_TRACKER.BLOB_STORAGE_PATH
 *   2. accelins_file_name matches PROCESS_TRACKER.XML_FILE_NAME
 *   3. accelins_blob_id ends with PROCESS_TRACKER.XML_FILE_NAME
 *
 * Returns the first Dataverse row that matches, or null if none.
 */
function pairMuleRowWithDv(m: MuleRow, dvRows: DvRow[]): DvRow | null {
  if (m.BLOB_STORAGE_PATH) {
    const exactBlob = dvRows.find((d) => d.blobId === m.BLOB_STORAGE_PATH);
    if (exactBlob) return exactBlob;
  }
  if (m.XML_FILE_NAME) {
    const byName = dvRows.find((d) => d.fileName === m.XML_FILE_NAME);
    if (byName) return byName;
    const byBlobSuffix = dvRows.find((d) => d.blobId && d.blobId.endsWith(`/${m.XML_FILE_NAME}`));
    if (byBlobSuffix) return byBlobSuffix;
  }
  return null;
}

async function maybeReparseBlob(
  credential: Awaited<ReturnType<typeof getDiscoveryCredential>>['credential'],
  muleRow: MuleRow,
  sampleCount: number,
): Promise<CombinedRun['reparsed'] | { error: string }> {
  if (!muleRow.BLOB_STORAGE_PATH) return { error: 'PROCESS_TRACKER.BLOB_STORAGE_PATH is null' };
  // Parse the full URL so we pick up whichever container (fa-xmltotals, mulesoft-xml, …)
  // Mule actually wrote to, not the framework's default.
  let serviceUrl: string;
  let containerName: string;
  let blobName: string;
  try {
    const u = new URL(muleRow.BLOB_STORAGE_PATH);
    serviceUrl = `${u.protocol}//${u.host}`;
    const segs = u.pathname.split('/').filter(Boolean);
    if (segs.length < 2) throw new Error(`expected /<container>/<blob…> in ${u.pathname}`);
    containerName = decodeURIComponent(segs[0]);
    blobName = decodeURIComponent(segs.slice(1).join('/'));
  } catch (e) {
    return { error: `Could not parse BLOB_STORAGE_PATH as URL: ${muleRow.BLOB_STORAGE_PATH} (${e instanceof Error ? e.message : e})` };
  }

  try {
    const svc = new BlobServiceClient(serviceUrl, credential);
    const container = svc.getContainerClient(containerName);
    const blob = container.getBlobClient(blobName);
    const dl = await blob.download();
    if (!dl.readableStreamBody) throw new Error('download returned no body');
    const chunks: Buffer[] = [];
    for await (const chunk of dl.readableStreamBody as NodeJS.ReadableStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
    }
    const xml = Buffer.concat(chunks).toString('utf-8');
    const totals = computeAdpTotalsFromXml(xml);
    const asBus = totalsToServiceBusPayload(totals);
    // Quick tag count — bypasses the totals logic so we see the raw duplication.
    const legTagCount = (xml.match(/<LEDGERJOURNALENTITY\b/g) || []).length;

    // Capture all LEDGERJOURNALENTITY blocks once, then analyse + sample.
    const allBlocks: string[] = [];
    const blockRe = /<LEDGERJOURNALENTITY\b[^>]*>[\s\S]*?<\/LEDGERJOURNALENTITY>|<LEDGERJOURNALENTITY\b[^>]*\/>/g;
    let bm: RegExpExecArray | null;
    while ((bm = blockRe.exec(xml)) !== null) allBlocks.push(bm[0]);

    const patternAnalysis = analyseLinePatterns(allBlocks);
    const xmlSample = allBlocks.slice(0, Math.max(1, sampleCount));

    return {
      prm: asBus.adp_prm,
      com: asBus.adp_com,
      coi: asBus.adp_coi,
      tax: asBus.adp_tax,
      oth: asBus.adp_oth,
      currency: asBus.adp_currency,
      lineCount: totals.lineCount,
      legTagCount,
      fetchedFrom: muleRow.BLOB_STORAGE_PATH,
      xmlSample,
      patternAnalysis,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `Blob download/parse failed: ${msg}` };
  }
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function fmtNum(n: number | null | undefined): string {
  if (n === null || n === undefined) return '      (null)';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).padStart(14);
}

function fmtMatch(b: boolean | null | undefined): string {
  if (b === null || b === undefined) return '   -  ';
  return b ? '  ✅   ' : '  ❌   ';
}

function renderRun(run: CombinedRun, idx: number, total: number, args: Args): void {
  const m = run.mule;
  const d = run.dv;
  const r = run.reparsed;

  console.log(`\n──────────────────────────────────────────────────────────────────────────────`);
  console.log(`Run ${idx + 1} of ${total}`);
  console.log(`  PROCESS_ID:    ${m.PROCESS_ID}`);
  console.log(`  PROCESS_NAME:  ${m.PROCESS_NAME}`);
  console.log(`  STAGE/STATUS:  ${m.CURRENT_STAGE} / ${m.PROCESS_STATUS}`);
  console.log(`  WATERMARK:     ${m.WATERMARK?.toISOString() ?? '(null)'}`);
  console.log(`  UPDATED:       ${m.UPDATED?.toISOString() ?? '(null)'}`);
  console.log(`  SRC ROW COUNT: ${m.SOURCE_ROW_COUNT ?? '(null)'}`);
  console.log(`  XML FILE:      ${m.XML_FILE_NAME ?? '(null)'}`);
  console.log(`  BLOB PATH:     ${m.BLOB_STORAGE_PATH ?? '(null)'}`);
  console.log(`  INITIATED_BY:  ${m.INITIATED_BY ?? '(null)'}`);

  if (!d) {
    console.log(`  ⚠  No matching Dataverse accelins_workflow record found for this run.`);
  } else {
    console.log(`  DV record:     ${d.name} (${d.workflowId.slice(0, 8)}…)  statuscode=${d.statusCode}  overall_match=${d.overallMatch}`);

    // Side-by-side totals
    console.log(`\n  ┌──────────┬───────────────┬───────────────┬───────────────┬────────┐`);
    console.log(`  │ Metric   │ ADP (DV ODS)  │ XML (DV XML)  │ XML (reparse) │ Match  │`);
    console.log(`  ├──────────┼───────────────┼───────────────┼───────────────┼────────┤`);
    const rows: Array<[string, number | null, number | null, number | undefined, boolean | null]> = [
      ['PRM     ', d.odsPrm, d.xmlPrm, r?.prm, d.prmMatch],
      ['COM     ', d.odsCom, d.xmlCom, r?.com, d.comMatch],
      ['COI     ', d.odsCoi, d.xmlCoi, r?.coi, d.coiMatch],
      ['TAX     ', d.odsTax, d.xmlTax, r?.tax, d.taxMatch],
      ['OTH     ', d.odsOth, d.xmlOth, r?.oth, d.othMatch],
    ];
    for (const [label, a, b, c, m] of rows) {
      console.log(`  │ ${label} │ ${fmtNum(a)} │ ${fmtNum(b)} │ ${fmtNum(c)} │ ${fmtMatch(m)} │`);
    }
    console.log(`  │ Currency │ ${(d.odsCurrency ?? '(null)').padStart(14)} │ ${(d.xmlCurrency ?? '(null)').padStart(14)} │ ${(r?.currency ?? '(skip)').padStart(14)} │ ${fmtMatch(d.currencyMatch)} │`);
    console.log(`  └──────────┴───────────────┴───────────────┴───────────────┴────────┘`);
  }

  if (run.reparseError) {
    console.log(`  ⚠  Re-parse: ${run.reparseError}`);
  } else if (r) {
    const dup = m.SOURCE_ROW_COUNT && r.legTagCount && r.legTagCount !== m.SOURCE_ROW_COUNT
      ? `  ⚠  LEDGERJOURNALENTITY tags (${r.legTagCount}) ≠ SOURCE_ROW_COUNT (${m.SOURCE_ROW_COUNT}) — ratio ${(r.legTagCount / m.SOURCE_ROW_COUNT).toFixed(2)}×`
      : '';
    console.log(`  Re-parse:      XML has ${r.legTagCount} <LEDGERJOURNALENTITY> tags (${r.lineCount} used in totals), currency=${r.currency}${dup ? '\n' + dup : ''}`);

    if (r.patternAnalysis) {
      const pa = r.patternAnalysis;
      console.log(`  Line patterns: uniqueDocuments=${pa.uniqueDocuments}  uniqueTEXTs=${pa.uniqueTextLines}  maxDupCountOn(doc+text)=${pa.maxDupCount}${pa.maxDupCount > 1 ? '   ⚠ duplicate rows' : ''}`);
      const catKeys = Object.keys(pa.amountsByCategory).sort();
      if (catKeys.length > 0) {
        console.log(`  Per-category amounts (DEBIT − CREDIT, lines):`);
        for (const k of catKeys) {
          const s = pa.amountsByCategory[k];
          console.log(`     ${k.padEnd(10)} Σdebit=${fmtNum(s.debit)}  Σcredit=${fmtNum(s.credit)}  net=${fmtNum(s.debit - s.credit)}  (${s.lines} lines)`);
        }
      }
      if (pa.maxDupCount > 1) {
        console.log(`  Top repeated (DOCUMENT, TEXT) keys:`);
        for (const t of pa.top.slice(0, 3)) {
          console.log(`     ×${t.count}  ${t.key.length > 100 ? t.key.slice(0, 100) + '…' : t.key}`);
        }
      }
    }

    if (args.dumpXmlSample && r.xmlSample && r.xmlSample.length > 0) {
      console.log(`\n  XML sample (first ${r.xmlSample.length} <LEDGERJOURNALENTITY> blocks):`);
      for (let i = 0; i < r.xmlSample.length; i++) {
        console.log(`\n  --- Block ${i + 1} ---`);
        // Indent the block so it visually nests under the run heading in terminal output.
        for (const line of r.xmlSample[i].split('\n')) {
          console.log(`  | ${line.trimEnd()}`);
        }
      }
    }
  }
}

function renderSummary(runs: CombinedRun[], repoId: string): void {
  console.log(`\n══════════════════════════════════════════════════════════════════════════════`);
  console.log(`Summary for repo ${repoId} (${runs.length} runs)`);
  console.log(`══════════════════════════════════════════════════════════════════════════════`);

  const withDv = runs.filter((r) => r.dv).length;
  console.log(`  Mule runs found:               ${runs.length}`);
  console.log(`  Paired to a Dataverse record:  ${withDv}`);

  // Watermark uniqueness — if all the same, race theory is weaker.
  const watermarks = Array.from(new Set(runs.map((r) => r.mule.WATERMARK?.toISOString()).filter((v): v is string => !!v)));
  console.log(`  Distinct watermarks:           ${watermarks.length}`);
  if (watermarks.length > 0 && watermarks.length <= 5) {
    watermarks.forEach((w) => console.log(`     - ${w}`));
  }

  // Check if DV XML totals always equal our re-parse (tells us the XML-side parser is not the drift source).
  let dvXmlMatchesReparse = 0;
  let dvXmlMismatchesReparse = 0;
  let dvAdpVsXmlMismatchCount = 0;
  const metricDeltas: Array<{ prm: number; com: number; coi: number; tax: number; oth: number }> = [];

  for (const run of runs) {
    if (!run.dv) continue;
    if (run.reparsed) {
      const tol = 0.01;
      const parserMatches =
        approxEq(run.dv.xmlPrm, run.reparsed.prm, tol) &&
        approxEq(run.dv.xmlCom, run.reparsed.com, tol) &&
        approxEq(run.dv.xmlCoi, run.reparsed.coi, tol);
      if (parserMatches) dvXmlMatchesReparse += 1;
      else dvXmlMismatchesReparse += 1;
    }
    if (run.dv.overallMatch === false) dvAdpVsXmlMismatchCount += 1;
    metricDeltas.push({
      prm: (run.dv.xmlPrm ?? 0) - (run.dv.odsPrm ?? 0),
      com: (run.dv.xmlCom ?? 0) - (run.dv.odsCom ?? 0),
      coi: (run.dv.xmlCoi ?? 0) - (run.dv.odsCoi ?? 0),
      tax: (run.dv.xmlTax ?? 0) - (run.dv.odsTax ?? 0),
      oth: (run.dv.xmlOth ?? 0) - (run.dv.odsOth ?? 0),
    });
  }

  console.log(`\n  ADP-vs-XML overall_match fails across retries:   ${dvAdpVsXmlMismatchCount} of ${withDv}`);
  if (dvXmlMatchesReparse + dvXmlMismatchesReparse > 0) {
    console.log(`  DV's stored XML totals match our re-parse:       ${dvXmlMatchesReparse} match, ${dvXmlMismatchesReparse} drift`);
  }

  if (metricDeltas.length > 0) {
    // How consistent are the (XML - ADP) deltas across runs?
    const prms = metricDeltas.map((d) => d.prm);
    const coms = metricDeltas.map((d) => d.com);
    const cois = metricDeltas.map((d) => d.coi);
    const prmStd = stddev(prms);
    const comStd = stddev(coms);
    const coiStd = stddev(cois);

    console.log(`\n  (XML − ADP) delta across retries (tells apart transform bug from race):`);
    console.log(`     PRM:  mean=${fmtNum(mean(prms))}  stddev=${fmtNum(prmStd)}  sample=${prms.slice(0, 5).map((v) => v.toFixed(2)).join(', ')}${prms.length > 5 ? '…' : ''}`);
    console.log(`     COM:  mean=${fmtNum(mean(coms))}  stddev=${fmtNum(comStd)}  sample=${coms.slice(0, 5).map((v) => v.toFixed(2)).join(', ')}${coms.length > 5 ? '…' : ''}`);
    console.log(`     COI:  mean=${fmtNum(mean(cois))}  stddev=${fmtNum(coiStd)}  sample=${cois.slice(0, 5).map((v) => v.toFixed(2)).join(', ')}${cois.length > 5 ? '…' : ''}`);

    // Hypothesis selection
    console.log(`\n  Hypothesis:`);
    if (dvAdpVsXmlMismatchCount === 0) {
      console.log(`     No mismatches observed — repo is healthy.`);
    } else if (dvXmlMismatchesReparse > 0) {
      console.log(`     ⚠  Dataverse's stored XML totals differ from our re-parse — suggests a drift`);
      console.log(`        between the blob we're reading and what func-xml-totals saw.`);
    } else if (prmStd < 0.5 && comStd < 0.5 && coiStd < 0.5) {
      console.log(`     ✔ Transform / aggregation bug is most likely — deltas are CONSISTENT across retries`);
      console.log(`        with different watermarks. The XML-generation code is reliably producing`);
      console.log(`        one shape; the ADP summary totals are reliably producing another.`);
    } else {
      console.log(`     ✔ Watermark / race condition is more likely — deltas VARY across retries,`);
      console.log(`        indicating different snapshots produced different data.`);
    }
  }
}

function mean(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}
function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}
function approxEq(a: number | null, b: number, tol: number): boolean {
  if (a === null) return false;
  return Math.abs(a - b) <= tol;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.repoId) {
    console.log('Usage: diagnose-repo.ts --repo-id <CODE> [--limit 10] [--skip-blobs]');
    process.exit(args.help ? 0 : 1);
  }

  console.log(`Diagnosing repo "${args.repoId}" (up to ${args.limit} runs)…\n`);
  const { credential, source } = getDiscoveryCredential();
  console.log(`  Auth: ${source}\n`);

  console.log('Querying Mule PROCESS_TRACKER…');
  const muleRuns = await fetchMuleRuns(credential, args.repoId, args.limit);
  console.log(`  ${muleRuns.length} run(s) found.\n`);

  console.log('Querying Dataverse accelins_workflows…');
  const dvRows = await fetchDataverseRows(credential, args.repoId, Math.max(args.limit, muleRuns.length));
  console.log(`  ${dvRows.length} record(s) found.\n`);

  const combined: CombinedRun[] = [];
  for (const m of muleRuns) {
    const dv = pairMuleRowWithDv(m, dvRows);
    let reparsed: CombinedRun['reparsed'] | undefined;
    let reparseError: string | undefined;
    if (!args.skipBlobs) {
      const out = await maybeReparseBlob(credential, m, args.xmlSampleCount);
      if ('error' in out) reparseError = out.error;
      else reparsed = out;
    }
    combined.push({ mule: m, dv, reparsed, reparseError });
  }

  for (let i = 0; i < combined.length; i++) {
    renderRun(combined[i], i, combined.length, args);
  }
  renderSummary(combined, args.repoId);
}

main().catch((e) => {
  console.error('\nFATAL:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
