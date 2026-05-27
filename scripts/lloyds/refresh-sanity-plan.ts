#!/usr/bin/env ts-node
/**
 * Refresh the Lloyd's Row-1 sanity plan snapshot.
 *
 * Usage:
 *   npm run lloyds:sanity:plan                 # refresh, write snapshot, print table
 *   npm run lloyds:sanity:plan -- --dry-run    # same but do NOT write the snapshot
 *   npm run lloyds:sanity:plan:status          # read the current snapshot, no live calls
 *
 * Auth: uses `DefaultAzureCredential` by default — run `az login` once. If the QA SPN
 * later has Dataverse Read + Storage Blob Data Reader, set `LLOYDS_USE_SPN=true` in
 * `.env.qa` and the same script switches to SPN without further code changes.
 *
 * Output: `src/features/lloyds/test-data/sanity-plan.json` (committed).
 *
 * **Runnable rows** are blobs whose names parse as Mule XML + ledger/repo exist in Dataverse **and**
 * `repoId` is in **`LLOYDS_CLONED_REPOSITORY_IDS`** (**seventeen** programme repos — **2026-05-06** reload; same ids as `LLOYDS_AGENCY_COHORT_12`).
 *
 * The snapshot is then read by:
 *   - `scripts/lloyds/send-mule-xml-generation-test-message.ts --from-plan`
 *   - `@PP-391-API-001` Cucumber step `Given the Lloyd's sanity plan is loaded`
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { buildSyntheticXmlBlobEntriesFromLocalDir } from '../../src/integrations/lloyds/blobContainerClient';
import {
  buildSanityPlan,
  readSanityPlan,
  resolvePlanPath,
  writeSanityPlan,
  type SanityPlan,
} from '../../src/integrations/lloyds/sanityPlanner';

// ---------------------------------------------------------------------------
// Env loading — matches the rest of the Lloyd's scripts.
// ---------------------------------------------------------------------------

const envPaths = [
  path.resolve(__dirname, '../../src/config/env/.env.qa'),
  path.resolve(__dirname, '../../.env.qa'),
  path.resolve(__dirname, '../../.env'),
];
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
    console.log(`Loaded env: ${path.relative(process.cwd(), envPath)}\n`);
    break;
  }
}

interface Args {
  dryRun: boolean;
  statusOnly: boolean;
  maxBlobs?: number;
  /** Use `docs/lloyds/XMLs` file names as synthetic blob rows (no Storage list; still queries Dataverse). */
  fromDocsXml: boolean;
  help: boolean;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { dryRun: false, statusOnly: false, fromDocsXml: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '--dry-run': args.dryRun = true; break;
      case '--status': args.statusOnly = true; break;
      case '--max-blobs': args.maxBlobs = Number(argv[++i]); break;
      case '--from-docs-xml': args.fromDocsXml = true; break;
      case '--help':
      case '-h': args.help = true; break;
      default: if (a.startsWith('--')) throw new Error(`Unknown flag: ${a}`);
    }
  }
  return args;
}

function printHelp(): void {
  console.log(`Refresh the Lloyd's Row-1 sanity plan (blob × Dataverse discovery).

  --status       Read and print the current snapshot only; do not call live APIs.
  --dry-run      Refresh from live APIs but do NOT write the snapshot file.
  --max-blobs N  Limit the number of blobs considered (useful for smoke runs).
  --from-docs-xml  Skip Azure blob listing; use parseable *.xml file names under docs/lloyds/XMLs
                   as synthetic blob rows (still queries Dataverse master). Use when Storage
                   returns 403 (grant Storage Blob Data Reader on mulesoft-xml or run az login).
  --help         Show this help.
`);
}

function printPlan(plan: SanityPlan, filePath: string | null): void {
  console.log('\n=== Lloyd\'s Row-1 sanity plan ===');
  if (filePath) console.log(`File:                ${path.relative(process.cwd(), filePath)}`);
  console.log(`Generated:           ${plan.generatedAt}`);
  console.log(`Dataverse host:      ${plan.dataverseHost}`);
  console.log(`Blob container:      ${plan.blobContainer}`);
  console.log(`Credential source:   ${plan.credentialSource}`);
  console.log(`XML blobs considered: ${plan.blobs.xmlCount}`);
  console.log(`Master data:          ${plan.masterData.legalEntities.count} legal entities, ${plan.masterData.repositoryFiles.count} repository files`);
  console.log(`Runnable rows:        ${plan.runnable.length}`);
  console.log(`Blocked rows:         ${plan.blocked.length}`);

  if (plan.runnable.length > 0) {
    console.log('\n-- Runnable --');
    for (const r of plan.runnable) {
      const localTag = r.localXmlPath ? ' [local XML present]' : ' [no local XML]';
      console.log(`  [${r.index}] ${r.name}  ledger=${r.ledger}  repo=${r.repoId}  size=${r.sizeBytes}B${localTag}`);
    }
  }
  if (plan.blocked.length > 0) {
    console.log('\n-- Blocked --');
    const byReason = new Map<string, number>();
    for (const b of plan.blocked) {
      byReason.set(b.reason, (byReason.get(b.reason) ?? 0) + 1);
      console.log(`  ${b.name}  [${b.reason}] ${b.detail}`);
    }
    console.log('\n  Summary:');
    for (const [reason, n] of byReason.entries()) console.log(`    ${reason}: ${n}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) { printHelp(); return; }

  const filePath = resolvePlanPath();

  if (args.statusOnly) {
    const plan = readSanityPlan(filePath);
    if (!plan) {
      console.log(`No snapshot found at ${path.relative(process.cwd(), filePath)}. Run \`npm run lloyds:sanity:plan\` first.`);
      process.exitCode = 2;
      return;
    }
    printPlan(plan, filePath);
    return;
  }

  const localXmlDir = path.resolve(process.cwd(), 'docs/lloyds/XMLs');
  if (args.fromDocsXml) {
    console.log(
      'Building sanity plan from docs/lloyds/XMLs file names (synthetic blobs) + live Dataverse master…',
    );
  } else {
    console.log('Building sanity plan (live Dataverse + Blob) — may take a few seconds…');
  }
  const syntheticBlobEntries = args.fromDocsXml ? buildSyntheticXmlBlobEntriesFromLocalDir(localXmlDir) : undefined;
  if (args.fromDocsXml && syntheticBlobEntries.length === 0) {
    console.error(
      'No parseable *.xml file names under docs/lloyds/XMLs. Add classic `AEUM US-56464 YYYYMMDDHHMM.xml` ' +
        'or WBX_* names that match parseFileName().',
    );
    process.exitCode = 2;
    return;
  }
  const plan = await buildSanityPlan({
    maxBlobs: args.maxBlobs,
    ...(syntheticBlobEntries?.length ? { syntheticBlobEntries } : {}),
  });
  printPlan(plan, args.dryRun ? null : filePath);

  if (args.dryRun) {
    console.log('\n--dry-run: snapshot NOT written.');
    return;
  }

  writeSanityPlan(plan, filePath);
  console.log(`\nSnapshot written: ${path.relative(process.cwd(), filePath)}`);
  console.log('Commit it when you\'re happy with the runnable list.');
}

main().catch((e) => {
  if (e instanceof Error) {
    const msg = e.message || '(no message)';
    console.error('ERROR:', msg);
    if (/not authorized|403|401/i.test(msg)) {
      console.error(
        '\nHint: Azure Storage or Dataverse denied this call. For blob list 403, grant the principal ' +
          '`Storage Blob Data Reader` on the `mulesoft-xml` container (or run `az login` with a user that has access). ' +
          'Alternatively run: npm run lloyds:sanity:plan -- --from-docs-xml\n',
      );
    }
    if (e.stack) console.error(e.stack);
  } else {
    console.error('ERROR (non-Error):', e);
  }
  process.exit(1);
});
