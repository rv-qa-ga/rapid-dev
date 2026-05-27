#!/usr/bin/env ts-node
/**
 * Interactive ManCo (Management Committee) test data for EU/UK only.
 *
 * Flow per record (no Lead — avoids flaky/broken Lead convert API in QA):
 * 1) Create Account + Opportunity via API (Type = New Business or MANCO_OPPORTUNITY_TYPE, Stage = Pipeline)
 * 2) Populate Opportunity_Readiness__c
 * 3) Submit Opportunity Readiness for approval (as QA MRD) → approve as regional Opportunity approvers (docs/OPPORTUNITY_READINESS_APPROVERS_BY_REGION.md)
 * 4) POG approval: optional submit (MANCO_POG_APPROVAL_PROCESS_NAME) + approve pending items as MANCO_POG approvers
 *
 * US/CA: utility exits after warning (ManCo does not apply).
 *
 * Ground rules:
 *   - All creates/updates/query/submit use QA MRD User JWT (SF_QAMRDUSER_JWT_USERNAME). Required.
 *   - Opportunity Readiness approval: approvers follow Members Operating Region — see
 *     docs/OPPORTUNITY_READINESS_APPROVERS_BY_REGION.md (set OPPORTUNITY_APPROVER_USERNAMES_*; legacy CONTRACTING_* still works).
 *
 * Names: QAManCo data_<epochMs> or QAManCo data_<base>_<n> when count > 1.
 *
 * Env (src/config/env/.env.qa):
 *   SF_QAMRDUSER_JWT_USERNAME — required (QA MRD JWT; all API calls use this user)
 *   USE_QA_MRD_AS_OWNER=true — recommended so OwnerId matches creator
 *   MANCO_READINESS_APPROVAL_PROCESS_NAME — optional; else OPPORTUNITY_* / CONTRACTING_* / default label
 *   MANCO_READINESS_APPROVAL_PROCESS_ID — optional; overrides name (use Id from npm run data:list-readiness-approval-processes)
 *   MANCO_APPROVER_USERNAMES_* — optional; else OPPORTUNITY_APPROVER_USERNAMES_* (legacy CONTRACTING_APPROVER_USERNAMES_*)
 *   MANCO_POG_APPROVAL_PROCESS_NAME — optional POG approval process (developer name / label as org expects)
 *   MANCO_POG_APPROVER_USERNAMES_UK, MANCO_POG_APPROVER_USERNAMES_EU — POG committee approvers (required for POG API approvals)
 *   MANCO_POG_SUBMIT_CONTEXT — readiness | opportunity (default: readiness); context for optional POG submit
 *   SF_QAMRDUSER_JWT_USERNAME, USE_QA_MRD_AS_OWNER — same as contracting scripts
 *   MANCO_OPPORTUNITY_TYPE — optional; default New Business (QA). Use Expansion if needed.
 *   MANCO_BROKER_SOURCED — optional Account picklist Yes/No; default Yes (legacy: MANCO_LEAD_BROKER_SOURCED__c)
 *
 * Usage:
 *   npm run data:manco-test
 *   cross-env ENV=qa ts-node scripts/generate-manco-test-data.ts
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import * as readline from 'readline';
import { testDataFactory, COUNTRY_DEFAULTS } from '../src/test-data/TestDataFactory';
import { logger } from '../src/utils/logger';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { getRequiredReadinessPayload } from './lib/opportunity-readiness-payload';
import { approveWorkitem, submitForApprovalAsUser } from './lib/process-approvals-fetch';
import {
  applyOpportunityReadinessApprovalSlice,
  getMancoPogApprovers,
  getMancoReadinessApprovers,
  getMancoReadinessApprovalProcessDefinitionNameOrId,
} from './lib/approver-env';
import {
  isNoApplicableProcessError,
  submitReadinessApprovalWithAutoRetry,
} from './lib/readiness-approval-submit';

const env = (process.env.ENV || 'qa').toLowerCase();
process.env.ENV = env;
const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  console.log(`[OK] Loaded ${envFile}\n`);
} else {
  console.warn(`[WARN] No ${envFile}; using process.env\n`);
}

const REGIONS: Array<{ label: string; country: keyof typeof COUNTRY_DEFAULTS }> = [
  { label: 'US', country: 'United States' },
  { label: 'CA', country: 'Canada' },
  { label: 'UK', country: 'United Kingdom' },
  { label: 'EU', country: 'Germany' },
];

interface CreatedRecord {
  accountId: string;
  opportunityId: string;
  readinessId: string;
  region: string;
  accountName: string;
  memberOperatingRegion: string;
}

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, (a) => resolve(a.trim())));
}

function getQaMrdUsername(): string | undefined {
  return process.env.SF_QAMRDUSER_JWT_USERNAME?.trim() || process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME?.trim();
}

/** ManCo utility requires QA MRD JWT username (not generic owner username). */
function getRequiredQaMrdJwtUsername(): string | undefined {
  return process.env.SF_QAMRDUSER_JWT_USERNAME?.trim();
}

async function resolveOwnerId(): Promise<string | undefined> {
  if (process.env.SF_MANUAL_TEST_DATA_OWNER_ID?.trim()) {
    return process.env.SF_MANUAL_TEST_DATA_OWNER_ID.trim();
  }
  if (process.env.USE_QA_MRD_AS_OWNER === 'true' || process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME || process.env.SF_QAMRDUSER_JWT_USERNAME) {
    const username = process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME || process.env.SF_QAMRDUSER_JWT_USERNAME;
    if (username) {
      const escaped = String(username).replace(/'/g, "''");
      const res = await testDataFactory.query(`SELECT Id FROM User WHERE Username = '${escaped}' LIMIT 1`);
      return res?.records?.[0]?.Id;
    }
  }
  return undefined;
}

async function gatherPendingWorkitemIds(contextIds: string[]): Promise<string[]> {
  const q = testDataFactory.query.bind(testDataFactory);
  const ids: string[] = [];
  for (const contextId of contextIds) {
    const workitemQuery = await q(
      `SELECT Id FROM ProcessInstanceWorkitem WHERE ProcessInstance.TargetObjectId = '${contextId}' AND ProcessInstance.Status = 'Pending'`
    );
    for (const row of workitemQuery?.records || []) {
      if (row.Id) ids.push(row.Id);
    }
  }
  return ids;
}

async function approveWorkitemsWithUsers(
  workitemIds: string[],
  approverUsernames: string[],
  memberOperatingRegion: string,
  comment: string
): Promise<void> {
  if (workitemIds.length === 0 || approverUsernames.length === 0) return;
  const { workitemIds: wids, approverUsernames: users } = applyOpportunityReadinessApprovalSlice(
    memberOperatingRegion,
    workitemIds,
    approverUsernames
  );
  if (wids.length === 0 || users.length === 0) return;
  for (let i = 0; i < wids.length; i++) {
    const workitemId = wids[i];
    const username = users[i] || users[0];
    const auth = await SalesforceJWTAuth.authenticate(username);
    await approveWorkitem(auth.instanceUrl, auth.accessToken, workitemId, comment);
  }
}

async function submitReadinessAndApprove(record: CreatedRecord, qaMrd: { instanceUrl: string; accessToken: string } | null): Promise<void> {
  const processNameOrId = getMancoReadinessApprovalProcessDefinitionNameOrId();
  const approvers = getMancoReadinessApprovers(record.memberOperatingRegion);
  if (approvers.length === 0) {
    throw new Error(
      `No Opportunity Readiness approvers for ${record.memberOperatingRegion}. Set OPPORTUNITY_APPROVER_USERNAMES_${record.memberOperatingRegion} (or MANCO_* / legacy CONTRACTING_*).`
    );
  }

  let submitResult: { instanceId?: string; newWorkitemIds?: string[] };
  try {
    if (qaMrd) {
      submitResult = await submitReadinessApprovalWithAutoRetry(record.readinessId, processNameOrId, (ctx, proc) =>
        submitForApprovalAsUser(qaMrd.instanceUrl, qaMrd.accessToken, ctx, proc)
      );
    } else {
      submitResult = await submitReadinessApprovalWithAutoRetry(record.readinessId, processNameOrId, (ctx, proc) =>
        testDataFactory.submitForApproval(ctx, proc).then((res) => ({
          instanceId: res.instanceId,
          newWorkitemIds: res.newWorkitemIds,
        }))
      );
    }
  } catch (e: any) {
    if (isNoApplicableProcessError(e)) {
      throw new Error(
        `${e.message}\n\n` +
          `[MANCO] NO_APPLICABLE_PROCESS: Salesforce did not apply any approval process to this readiness record.\n` +
          `Try:\n` +
          `  1) npm run data:list-readiness-approval-processes   → copy Id into OPPORTUNITY_READINESS_APPROVAL_PROCESS_ID in .env.qa\n` +
          `  2) Or set OPPORTUNITY_READINESS_APPROVAL_PROCESS_NAME to the Developer Name (or exact name) from Setup → Approval Processes\n` +
          `  3) In the UI, confirm the same record can be submitted; fix entry criteria / required fields if submit is disabled there\n` +
          `Readiness Id: ${record.readinessId} | Process tried (name or Id): ${processNameOrId}`
      );
    }
    throw e;
  }

  let workitemIds = submitResult.newWorkitemIds || [];
  if (workitemIds.length === 0) {
    workitemIds = await gatherPendingWorkitemIds([record.readinessId]);
  }
  if (workitemIds.length === 0) {
    throw new Error(`No approval work items for readiness ${record.readinessId} after submit.`);
  }

  await approveWorkitemsWithUsers(
    workitemIds,
    approvers,
    record.memberOperatingRegion,
    'Approved by generate-manco-test-data (readiness)'
  );
  console.log(`[OK] Opportunity Readiness questionnaire submitted and approved: ${record.accountName}`);
}

async function runPogPhase(record: CreatedRecord, qaMrd: { instanceUrl: string; accessToken: string } | null): Promise<void> {
  const pogApprovers = getMancoPogApprovers(record.memberOperatingRegion);
  const pogProcess = process.env.MANCO_POG_APPROVAL_PROCESS_NAME?.trim();
  const submitCtx = (process.env.MANCO_POG_SUBMIT_CONTEXT || 'readiness').toLowerCase();
  const contextId =
    submitCtx === 'opportunity' ? record.opportunityId : record.readinessId;

  await new Promise((r) => setTimeout(r, 5000));

  if (pogProcess && qaMrd) {
    try {
      await submitForApprovalAsUser(qaMrd.instanceUrl, qaMrd.accessToken, contextId, pogProcess);
      console.log(`[OK] Submitted POG approval process on ${submitCtx}: ${pogProcess}`);
    } catch (e: any) {
      logger.warn(`POG submit skipped or failed (org may auto-start POG): ${e.message}`);
    }
  } else if (pogProcess && !qaMrd) {
    try {
      const res = await testDataFactory.submitForApproval(contextId, pogProcess);
      if (!res.newWorkitemIds?.length) {
        logger.warn('POG submit returned no work items; checking pending queue.');
      }
    } catch (e: any) {
      logger.warn(`POG submit as API user failed: ${e.message}`);
    }
  }

  await new Promise((r) => setTimeout(r, 3000));

  let workitemIds = await gatherPendingWorkitemIds([record.readinessId, record.opportunityId]);
  if (workitemIds.length === 0) {
    console.log('[INFO] No pending approval work items for POG (may be complete or not started).');
    return;
  }

  if (pogApprovers.length === 0) {
    console.log(
      `[WARN] ${workitemIds.length} pending work item(s) but MANCO_POG_APPROVER_USERNAMES_${record.memberOperatingRegion} is not set. Approve POG in UI or set env.`
    );
    return;
  }

  await approveWorkitemsWithUsers(
    workitemIds,
    pogApprovers,
    record.memberOperatingRegion,
    'Approved by generate-manco-test-data (POG)'
  );
  console.log(`[OK] POG approval work items approved: ${record.accountName}`);
}

async function createOneRecord(
  baseName: string,
  regionConfig: { label: string; country: keyof typeof COUNTRY_DEFAULTS },
  accountType: string,
  ownerId?: string
): Promise<CreatedRecord> {
  const countryDefaults = COUNTRY_DEFAULTS[regionConfig.country];
  if (!countryDefaults) throw new Error(`No COUNTRY_DEFAULTS for ${regionConfig.country}`);

  const brokerSourced =
    process.env.MANCO_BROKER_SOURCED?.trim() ||
    process.env.MANCO_LEAD_BROKER_SOURCED__c?.trim() ||
    'Yes';

  const accountData: Record<string, any> = {
    Name: baseName,
    Type: accountType,
    BillingCountry: regionConfig.country,
    BillingCity: countryDefaults.city,
    BillingPostalCode: countryDefaults.postalCode,
    Phone: countryDefaults.phone,
    Functional_Currency__c:
      countryDefaults.currency === 'GBP'
        ? 'GBP'
        : countryDefaults.currency === 'CAD'
          ? 'CAD'
          : countryDefaults.currency === 'EUR'
            ? 'EUR'
            : 'USD',
    BillingStreet: '123 ManCo Billing St',
    Description: `ManCo test data (${regionConfig.label}). ${baseName}`,
    Broker_Sourced__c: brokerSourced,
  };
  if (regionConfig.country === 'United States' || regionConfig.country === 'Canada') {
    accountData.BillingState = countryDefaults.state;
  }
  if (ownerId) {
    accountData.OwnerId = ownerId;
  }

  const account = await testDataFactory.createAccount(accountData);

  const oppName = `${baseName} Opportunity`;
  const closeDate = new Date();
  closeDate.setDate(closeDate.getDate() + 90);
  const stagePipeline =
    process.env.SF_OPPORTUNITY_STAGE_PIPELINE?.trim() || 'Pipeline';
  const opportunityType =
    process.env.MANCO_OPPORTUNITY_TYPE?.trim() || 'New Business';

  const oppPayload: Record<string, any> = {
    Name: oppName,
    Stage: stagePipeline,
    Type: opportunityType,
    CloseDate: closeDate.toISOString().split('T')[0],
  };
  if (ownerId) {
    oppPayload.OwnerId = ownerId;
  }

  const opportunity = await testDataFactory.createOpportunity(oppPayload, account.id);

  let readinessRow = await testDataFactory.findOpportunityReadinessByOpportunity(opportunity.id);
  if (!readinessRow) {
    const maxWaitMs = 20000;
    const intervalMs = 2000;
    for (let waited = 0; waited < maxWaitMs; waited += intervalMs) {
      await new Promise((r) => setTimeout(r, intervalMs));
      readinessRow = await testDataFactory.findOpportunityReadinessByOpportunity(opportunity.id);
      if (readinessRow) break;
    }
  }
  if (!readinessRow) {
    throw new Error(
      'No Opportunity_Readiness__c after Account/Opportunity create. Ensure Type=New Business (or MANCO_OPPORTUNITY_TYPE) triggers readiness in this org.'
    );
  }

  const readinessPayload = getRequiredReadinessPayload(account.id, regionConfig.label, {
    summaryCompletedByUsername: getRequiredQaMrdJwtUsername(),
  }) as Record<string, any>;
  await testDataFactory.updateRecord('Opportunity_Readiness__c', readinessRow.id, readinessPayload);

  return {
    accountId: account.id,
    opportunityId: opportunity.id,
    readinessId: readinessRow.id,
    region: regionConfig.label,
    accountName: baseName,
    memberOperatingRegion: regionConfig.label,
  };
}

async function main(): Promise<void> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  ManCo test data generator (EU / UK only)');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('Select region:');
  console.log('  1 = US');
  console.log('  2 = CA');
  console.log('  3 = UK');
  console.log('  4 = EU');
  const regionChoice = await prompt(rl, 'Enter choice [1-4]: ');

  let regionConfig: (typeof REGIONS)[0];
  if (regionChoice === '1') {
    console.log('\nManCo approval does not apply to US. Exiting (no data created).\n');
    rl.close();
    return;
  }
  if (regionChoice === '2') {
    console.log('\nManCo approval does not apply to CA. Exiting (no data created).\n');
    rl.close();
    return;
  }
  if (regionChoice === '3') regionConfig = REGIONS[2];
  else if (regionChoice === '4') regionConfig = REGIONS[3];
  else {
    console.error('Invalid choice. Use 1–4.');
    rl.close();
    process.exitCode = 1;
    return;
  }

  console.log('\nAccount Type:');
  console.log('  1 = Member');
  console.log('  2 = Non - Member MGA');
  const typeChoice = await prompt(rl, 'Enter choice [1-2] (default 1): ');
  const accountType = typeChoice === '2' ? 'Non - Member MGA' : 'Member';

  const countRaw = await prompt(rl, 'How many records to create? (default 1, max 20): ');
  let count = parseInt(countRaw || '1', 10);
  if (Number.isNaN(count) || count < 1) count = 1;
  if (count > 20) count = 20;

  rl.close();

  const qaMrdUser = getRequiredQaMrdJwtUsername();
  if (!qaMrdUser) {
    console.error(
      '\n[ERROR] SF_QAMRDUSER_JWT_USERNAME must be set in .env.qa.\n' +
        'ManCo utility creates and updates records as QA MRD User only.\n'
    );
    process.exit(1);
  }

  try {
    await testDataFactory.initialize(qaMrdUser);
  } catch (e: any) {
    console.error(`\n[ERROR] Could not initialize TestDataFactory as QA MRD User: ${e.message}\n`);
    process.exit(1);
  }
  console.log(`[OK] Salesforce API (create / update / query / submit) runs as: ${qaMrdUser}\n`);

  const ownerId = await resolveOwnerId();
  if (ownerId) {
    console.log(`[OK] OwnerId for Account & Opportunity: ${ownerId}\n`);
  } else {
    console.log('[INFO] OwnerId not set on records (optional). Set USE_QA_MRD_AS_OWNER=true to set OwnerId to QA MRD.\n');
  }

  /** TestDataFactory JWT is already QA MRD — submit uses factory; POG submit uses factory when this is null. */
  const qaMrd: { instanceUrl: string; accessToken: string } | null = null;

  const baseTs = Date.now();
  const created: CreatedRecord[] = [];

  for (let i = 0; i < count; i++) {
    const baseName = count === 1 ? `QAManCo data_${baseTs}` : `QAManCo data_${baseTs + i}`;
    console.log(`\n--- Record ${i + 1}/${count}: ${baseName} (${regionConfig.label}, ${accountType}) ---`);
    const rec = await createOneRecord(baseName, regionConfig, accountType, ownerId);
    await submitReadinessAndApprove(rec, qaMrd);
    await runPogPhase(rec, qaMrd);
    created.push(rec);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('Account Name                 | Region | Account Id         | Opportunity Id      | Readiness Id');
  console.log('-----------------------------|--------|--------------------|---------------------|-------------------');
  for (const r of created) {
    console.log(
      `${r.accountName.padEnd(28)} | ${r.region.padEnd(6)} | ${r.accountId} | ${r.opportunityId} | ${r.readinessId}`
    );
  }
  console.log('\nDone.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
