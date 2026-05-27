#!/usr/bin/env ts-node
/**
 * Lloyd's Agency diagnostic. Loops `LLOYDS_AGENCY_COHORT_12` (**seventeen** repo ids; XML exists in blob / ADP
 * for each), resolves each against Dataverse **`accelins_repositoryfile`**, queries Mule
 * **PROCESS_TRACKER**, downloads blob XML when present, and aggregates a summary. **`dvExists`**
 * reflects whether each cohort repo has an **`accelins_repositoryfile`** master in Dynamics.
 *
 * Uses the same DefaultAzureCredential → SPN chain as the other helpers.
 * When LLOYDS_USE_SPN=true, authenticates as the QA SPN (needs Dataverse +
 * SQL + Blob + SB grants — see docs/servicenow-ticket-lloyds-spn-permissions.md).
 *
 * Optional:
 *   npm run lloyds:diagnose:12-repos -- --json-out reports/lloyds-diagnose-12-repos.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import * as sql from 'mssql';
import { BlobServiceClient } from '@azure/storage-blob';

import { dataverseScope, getDiscoveryCredential } from '../../src/integrations/lloyds/credential';
import { LLOYDS_AGENCY_COHORT_12 } from '../../src/integrations/lloyds/lloydsClonedRepoCohort';

/** Programme Agency repository ids (blob + ADP; cohort length matches `lloydsClonedRepoCohort.ts`). */
const LLOYDS_REPOS = [...LLOYDS_AGENCY_COHORT_12];

const CFG = {
  sqlServer: 'sql-dev-uks-lyd.database.windows.net',
  sqlDatabase: 'sqldb-dev-uks-lyd',
  sqlScope: 'https://database.windows.net/.default',
  dataverseHost: 'https://accelinsqatest.crm11.dynamics.com',
  dataverseApiVer: 'v9.2',
};

for (const p of [
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env.qa'),
]) {
  if (fs.existsSync(p)) { dotenv.config({ path: p, override: true }); break; }
}

interface RepoSummary {
  repoId: string;
  dvExists: boolean;
  dvGuid?: string;
  dvLedger?: string;
  muleRunCount: number;
  latestStage?: string;
  latestStatus?: string;
  latestBlobPath?: string;
  latestWatermark?: Date;
  dvWorkflowCount: number;
  latestDvRecordName?: string;
  latestStatusCode?: number;
  overallMatch?: boolean;
  odsPrm?: number; odsCom?: number; odsCoi?: number;
  xmlPrm?: number; xmlCom?: number; xmlCoi?: number;
  factorPrm?: number; factorCom?: number; factorCoi?: number;
  xmlTagCount?: number;
  uniqueDocs?: number;
  uniqueTexts?: number;
  docsPerText?: number;
  error?: string;
}

function parseArgs(argv: string[]): { jsonOut?: string } {
  const out: { jsonOut?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json-out' && argv[i + 1]) {
      out.jsonOut = argv[++i];
    } else if (a.startsWith('--json-out=')) {
      out.jsonOut = a.slice('--json-out='.length);
    }
  }
  return out;
}

async function main() {
  const { jsonOut } = parseArgs(process.argv.slice(2));
  console.log(`Lloyd's 12-repo bulk diagnostic\n`);
  const { credential, source } = getDiscoveryCredential();
  console.log(`Auth: ${source}\n`);

  const sqlToken = await credential.getToken(CFG.sqlScope);
  const dvToken = await credential.getToken(dataverseScope(CFG.dataverseHost));
  if (!sqlToken || !dvToken) throw new Error('Token acquisition failed.');
  const dvHeaders = {
    Authorization: `Bearer ${dvToken.token}`,
    Accept: 'application/json',
    'OData-MaxVersion': '4.0', 'OData-Version': '4.0',
  };

  const pool = await sql.connect({
    server: CFG.sqlServer, database: CFG.sqlDatabase,
    options: { encrypt: true, trustServerCertificate: false },
    authentication: { type: 'azure-active-directory-access-token', options: { token: sqlToken.token } },
    pool: { max: 1, min: 0, idleTimeoutMillis: 5_000 },
    requestTimeout: 30_000,
  });

  const summaries: RepoSummary[] = [];
  try {
    for (const repoId of LLOYDS_REPOS) {
      const s: RepoSummary = { repoId, dvExists: false, muleRunCount: 0, dvWorkflowCount: 0 };
      try {
        // 1. Dataverse master-data existence (and which legal entity it's tied to)
        const repoUrl = `${CFG.dataverseHost}/api/data/${CFG.dataverseApiVer}/accelins_repositoryfiles?$filter=accelins_name eq '${repoId}'&$select=accelins_repositoryfileid,_accelins_legal_entity_value&$top=1`;
        const rres = await fetch(repoUrl, { headers: dvHeaders });
        if (rres.ok) {
          const rjson = (await rres.json()) as { value: Array<{ accelins_repositoryfileid: string; _accelins_legal_entity_value?: string }> };
          if (rjson.value?.length) {
            s.dvExists = true;
            s.dvGuid = rjson.value[0].accelins_repositoryfileid;
            const leGuid = rjson.value[0]._accelins_legal_entity_value;
            if (leGuid) {
              const leUrl = `${CFG.dataverseHost}/api/data/${CFG.dataverseApiVer}/accelins_legalentities(${leGuid})?$select=accelins_name`;
              const leRes = await fetch(leUrl, { headers: dvHeaders });
              if (leRes.ok) {
                const leJson = (await leRes.json()) as { accelins_name?: string };
                s.dvLedger = leJson.accelins_name ?? undefined;
              }
            }
          }
        }

        // 2. Mule tracker — most recent run for this repo
        const muleRows = await pool.request()
          .input('repoId', sql.NVarChar, repoId)
          .query<{
            PROCESS_ID: string; CURRENT_STAGE: string; PROCESS_STATUS: string;
            BLOB_STORAGE_PATH: string; WATERMARK: Date; total_runs: number;
          }>(`
            SELECT TOP 1 PROCESS_ID, CURRENT_STAGE, PROCESS_STATUS, BLOB_STORAGE_PATH, WATERMARK,
                   (SELECT COUNT(*) FROM dbo.PROCESS_TRACKER WHERE REPO_ID = @repoId) AS total_runs
            FROM dbo.PROCESS_TRACKER
            WHERE REPO_ID = @repoId
            ORDER BY UPDATED DESC
          `);
        const mrow = muleRows.recordset[0];
        if (mrow) {
          s.muleRunCount = mrow.total_runs;
          s.latestStage = mrow.CURRENT_STAGE;
          s.latestStatus = mrow.PROCESS_STATUS;
          s.latestBlobPath = mrow.BLOB_STORAGE_PATH;
          s.latestWatermark = mrow.WATERMARK;
        }

        // 3. Dataverse workflows for this repo
        if (s.dvGuid) {
          const wfUrl = `${CFG.dataverseHost}/api/data/${CFG.dataverseApiVer}/accelins_workflows?$filter=_accelins_repositoryfile_value eq ${s.dvGuid}&$select=accelins_workflowid,accelins_name,statuscode,accelins_overall_match,accelins_ods_total_premium_amount,accelins_ods_total_agency_commission_amount,accelins_ods_total_commission_amount,accelins_xml_total_premium_amount,accelins_xml_total_agency_commission_amount,accelins_xml_total_commission_amount&$orderby=createdon desc&$top=1`;
          const wres = await fetch(wfUrl, { headers: dvHeaders });
          if (wres.ok) {
            const wjson = (await wres.json()) as { value: Array<Record<string, unknown>> };
            s.dvWorkflowCount = wjson.value?.length ?? 0;
            if (s.dvWorkflowCount > 0) {
              const w = wjson.value[0];
              s.latestDvRecordName = String(w['accelins_name'] ?? '');
              s.latestStatusCode = typeof w['statuscode'] === 'number' ? (w['statuscode'] as number) : undefined;
              s.overallMatch = typeof w['accelins_overall_match'] === 'boolean' ? (w['accelins_overall_match'] as boolean) : undefined;
              s.odsPrm = w['accelins_ods_total_premium_amount'] as number | undefined;
              s.odsCom = w['accelins_ods_total_agency_commission_amount'] as number | undefined;
              s.odsCoi = w['accelins_ods_total_commission_amount'] as number | undefined;
              s.xmlPrm = w['accelins_xml_total_premium_amount'] as number | undefined;
              s.xmlCom = w['accelins_xml_total_agency_commission_amount'] as number | undefined;
              s.xmlCoi = w['accelins_xml_total_commission_amount'] as number | undefined;
              if (s.odsPrm && s.xmlPrm) s.factorPrm = s.xmlPrm / s.odsPrm;
              if (s.odsCom && s.xmlCom) s.factorCom = s.xmlCom / s.odsCom;
              if (s.odsCoi && s.xmlCoi) s.factorCoi = s.xmlCoi / s.odsCoi;
            }
          }
        }

        // 4. Blob analysis on the latest tracker's BLOB_STORAGE_PATH
        if (s.latestBlobPath) {
          try {
            const u = new URL(s.latestBlobPath);
            const serviceUrl = `${u.protocol}//${u.host}`;
            const segs = u.pathname.split('/').filter(Boolean);
            const containerName = decodeURIComponent(segs[0]);
            const blobName = decodeURIComponent(segs.slice(1).join('/'));
            const svc = new BlobServiceClient(serviceUrl, credential);
            const blob = svc.getContainerClient(containerName).getBlobClient(blobName);
            const dl = await blob.download();
            const chunks: Buffer[] = [];
            for await (const chunk of dl.readableStreamBody as NodeJS.ReadableStream) {
              chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
            }
            const xml = Buffer.concat(chunks).toString('utf-8');
            const tags = (xml.match(/<LEDGERJOURNALENTITY\b/g) || []).length;
            const docs = new Set<string>();
            const texts = new Set<string>();
            const blockRe = /<LEDGERJOURNALENTITY\b[^>]*>[\s\S]*?<\/LEDGERJOURNALENTITY>|<LEDGERJOURNALENTITY\b[^>]*\/>/g;
            let m: RegExpExecArray | null;
            while ((m = blockRe.exec(xml)) !== null) {
              const doc = m[0].match(/<DOCUMENT\b[^>]*>([^<]*)<\/DOCUMENT>/)?.[1] ?? '';
              const txt = m[0].match(/<TEXT\b[^>]*>([^<]*)<\/TEXT>/)?.[1] ?? '';
              if (doc) docs.add(doc);
              if (txt) texts.add(txt);
            }
            s.xmlTagCount = tags;
            s.uniqueDocs = docs.size;
            s.uniqueTexts = texts.size;
            s.docsPerText = texts.size > 0 ? tags / texts.size : 0;
          } catch (e) {
            s.error = `blob: ${e instanceof Error ? e.message : e}`;
          }
        }
      } catch (e) {
        s.error = e instanceof Error ? e.message : String(e);
      }
      summaries.push(s);
      const f = (n?: number) => (n !== undefined ? n.toFixed(2) : '-');
      console.log(`  ✓ ${s.repoId.padEnd(10)} DV=${s.dvExists ? '✓' : '✗'}  runs=${s.muleRunCount.toString().padStart(3)}  latest=${(s.latestStage ?? '-').padEnd(28)} XML=${s.xmlTagCount ?? '-'}/${s.uniqueDocs ?? '-'}/${s.uniqueTexts ?? '-'}  fPRM=${f(s.factorPrm)}  fCOI=${f(s.factorCoi)}  fCOM=${f(s.factorCom)}${s.error ? '  ⚠ ' + s.error : ''}`);
    }
  } finally {
    await pool.close();
  }

  // --- Aggregate summary ---
  console.log(`\n═══════════ AGGREGATE FINDINGS ═══════════`);
  const missingInDV = summaries.filter((s) => !s.dvExists).map((s) => s.repoId);
  const withMuleRuns = summaries.filter((s) => s.muleRunCount > 0);
  const withDvRecords = summaries.filter((s) => s.dvWorkflowCount > 0);
  const stuckAtApproval = summaries.filter((s) => s.latestStage === 'AWAITING_APPROVAL_TO_POST');
  const overallMatchFalse = summaries.filter((s) => s.overallMatch === false);
  const has2xFactor = summaries.filter(
    (s) =>
      (s.factorPrm !== undefined && Math.abs(Math.abs(s.factorPrm) - 2) < 0.1) ||
      (s.factorCoi !== undefined && Math.abs(Math.abs(s.factorCoi) - 2) < 0.1) ||
      (s.factorCom !== undefined && Math.abs(Math.abs(s.factorCom) - 2) < 0.1),
  );
  const has1to2DocFanout = summaries.filter(
    (s) => s.docsPerText !== undefined && s.docsPerText >= 1.8 && s.docsPerText <= 2.2,
  );

  console.log(`  In Dataverse master:                      ${summaries.length - missingInDV.length} / ${summaries.length}`);
  if (missingInDV.length) console.log(`    Missing: ${missingInDV.join(', ')}`);
  console.log(`  Have Mule runs:                           ${withMuleRuns.length} / ${summaries.length}`);
  console.log(`  Have Dataverse records:                   ${withDvRecords.length} / ${summaries.length}`);
  console.log(`  Stuck at AWAITING_APPROVAL_TO_POST:       ${stuckAtApproval.length} / ${withMuleRuns.length}`);
  console.log(`  overall_match = false:                    ${overallMatchFalse.length} / ${withDvRecords.length}`);
  console.log(`  Show ~2× ADP→XML factor on any metric:    ${has2xFactor.length} / ${withDvRecords.length}`);
  console.log(`  Show 1:2 doc fanout (tags / texts ≈ 2):   ${has1to2DocFanout.length} / ${withMuleRuns.length}`);

  const ledgers = Array.from(new Set(summaries.map((s) => s.dvLedger).filter((l): l is string => !!l)));
  console.log(`  Distinct ledgers across the 12:           ${ledgers.length} (${ledgers.join(', ')})`);

  const singleRootCauseHypothesis =
    has2xFactor.length === overallMatchFalse.length &&
    overallMatchFalse.length === withDvRecords.length &&
    has1to2DocFanout.length === withMuleRuns.length &&
    withDvRecords.length > 0;

  if (singleRootCauseHypothesis) {
    console.log(`\n  ✓ SINGLE ROOT CAUSE CONFIRMED: every repo with DV records shows the same 2×`);
    console.log(`    ADP→XML factor AND 1:2 doc fanout. Systematic Mule Agency-XML transform issue.`);
    console.log(`    Not repo-specific.`);
  } else {
    console.log(`\n  Partial confirmation. Look at per-repo breakdown below for outliers.`);
  }

  console.log(`\nPer-repo breakdown:`);
  const hdr =
    '  ' +
    'Repo'.padEnd(10) +
    ' ' +
    'DV'.padEnd(4) +
    'Led'.padEnd(6) +
    'Mule'.padEnd(5) +
    'Stage'.padEnd(28) +
    'Tags/Docs/Texts'.padEnd(18) +
    'fPRM'.padEnd(8) +
    'fCOM'.padEnd(8) +
    'fCOI';
  console.log(hdr);
  console.log('  ' + '-'.repeat(hdr.length - 2));
  for (const s of summaries) {
    const f = (n?: number) => (n !== undefined ? n.toFixed(2).padEnd(8) : '-       ');
    const tdt = s.xmlTagCount !== undefined ? `${s.xmlTagCount}/${s.uniqueDocs}/${s.uniqueTexts}` : '-';
    console.log(
      '  ' +
        s.repoId.padEnd(10) +
        ' ' +
        (s.dvExists ? '✓   ' : '✗   ') +
        (s.dvLedger ?? '-').padEnd(6) +
        String(s.muleRunCount).padEnd(5) +
        (s.latestStage ?? '-').padEnd(28) +
        tdt.padEnd(18) +
        f(s.factorPrm) +
        f(s.factorCom) +
        f(s.factorCoi),
    );
  }

  if (jsonOut) {
    const report = {
      generatedAt: new Date().toISOString(),
      dataverseHost: CFG.dataverseHost,
      sqlServer: CFG.sqlServer,
      sqlDatabase: CFG.sqlDatabase,
      aggregate: {
        reposTotal: summaries.length,
        inDataverseMaster: summaries.length - missingInDV.length,
        missingInDataverseMaster: missingInDV,
        haveMuleRuns: withMuleRuns.length,
        haveDataverseWorkflowRecords: withDvRecords.length,
        stuckAtAwaitingApprovalToPost: stuckAtApproval.length,
        overallMatchFalseCount: overallMatchFalse.length,
        overallMatchDenominator: withDvRecords.length,
        hasApprox2xFactorCount: has2xFactor.length,
        hasApprox2xFactorDenominator: withDvRecords.length,
        has1to2DocFanoutCount: has1to2DocFanout.length,
        has1to2DocFanoutDenominator: withMuleRuns.length,
        distinctLedgers: ledgers,
        singleRootCauseHypothesis,
      },
      summaries,
    };
    const absPath = path.resolve(process.cwd(), jsonOut);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, JSON.stringify(report, null, 2), 'utf-8');
    console.log(`\nJSON report written: ${absPath}`);
  }
}

main().catch((e) => {
  console.error('\nFATAL:', e instanceof Error ? e.message : e);
  if (e instanceof Error && e.stack) console.error(e.stack);
  process.exit(1);
});
