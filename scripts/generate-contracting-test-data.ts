/**
 * Generate test data for Opportunity Contracting (steps 1–9).
 *
 * Reuses the same utility pattern as generate-manual-test-data.ts (TestDataFactory,
 * env, region rotation). Creates Account → Opportunity (Type: New Business); the org
 * auto-creates and links Opportunity_Readiness__c. The script finds that record and
 * populates it (no separate create). Then either:
 *   - Run 1 (default): Create + populate; output instructions for Submit for
 *     Approval and Approvals; optionally run post-approval updates if you have
 *     already approved the records (e.g. via UI).
 *   - Run 2 (CONTRACTING_AFTER_APPROVAL=1): Assume records exist (by name prefix),
 *     apply post-approval updates: Account=Onboarding, Opp=Due Diligence,
 *     add team (if configured), Questionnaires_Recipt__c=Yes, complete tasks,
 *     Opp=Contracting.
 *
 * See docs/CONTRACTING_TEST_DATA_DESIGN.md for flow and questions.
 *
 * Usage:
 *   ENV=qa npx ts-node scripts/generate-contracting-test-data.ts
 *   npm run data:contracting-test
 *   # Create 5 records (Contracting_TestData_001–005):
 *   CONTRACTING_DATA_START=1 CONTRACTING_DATA_COUNT=5 npm run data:contracting-test
 *   # After approving in UI, run post-approval updates for those records:
 *   CONTRACTING_AFTER_APPROVAL=1 CONTRACTING_DATA_START=1 CONTRACTING_DATA_COUNT=5 npm run data:contracting-test
 *   # Optional: 9 team roles + 9 user IDs (comma-separated) to add Opportunity Team Members via API:
 *   CONTRACTING_TEAM_ROLES="Lead Actuary,Lead Underwriter,..." CONTRACTING_TEAM_USER_IDS="005xxx,005yyy,..." ...
 *   # Optional: populate Opportunity_Readiness__c Due Diligence tab checkboxes (from QA screenshots):
 *   CONTRACTING_POPULATE_DD_TAB=1 ...
 *   # Create one US record for review (name starts with "WF"):
 *   CONTRACTING_DATA_COUNT=1 CONTRACTING_DATA_REGION=US npm run data:contracting-test
 *   # Restrict to EU, UK, CA only (random billing address per record):
 *   CONTRACTING_DATA_REGIONS=EU,UK,CA CONTRACTING_DATA_START=21 CONTRACTING_DATA_COUNT=25 npm run data:contracting-test
 *   # Account Type is always Member or Non-Member MGA (alternating). Owner = QA MRD User:
 *   USE_QA_MRD_AS_OWNER=true npm run data:contracting-test
 *   # Submit for approval (as QA MRD User when SF_QAMRDUSER_JWT_USERNAME set). US: first listed approver only. UK/EU/CA: each listed approver (see doc).
 *   CONTRACTING_SUBMIT_AND_APPROVE=1 OPPORTUNITY_READINESS_APPROVAL_PROCESS_NAME="Opportunity Readiness Approval" OPPORTUNITY_APPROVER_USERNAMES_US="..." (legacy CONTRACTING_* still works)
 *   # Run one stage at a time (see docs/E2E-SALESFORCE-ACCOUNT-CREATION-PLAN.md):
 *   CONTRACTING_RUN_STAGE=S1    # Create only
 *   CONTRACTING_RUN_STAGE=S2S3  # Submit + approve only (records must exist)
 *   CONTRACTING_RUN_STAGE=S4S5  # Post-approval + team only (same as CONTRACTING_AFTER_APPROVAL=1)
 *   # Env reference: docs/CONTRACTING_ENV_EXAMPLE.md, docs/OPPORTUNITY_READINESS_APPROVERS_BY_REGION.md, docs/CONTRACTING_OPPORTUNITY_TEAM_QA.md
 *   # Name prefix defaults to WF_ (e.g. WF_001). Set CONTRACTING_USE_TIMESTAMP_IN_NAME=1 for WF_YYYYMMDD_HHmm_001.
 *   # For S4S5 (post-approval): if org requires Party_Code__c when Account_Status__c=Onboarding, set CONTRACTING_PARTY_CODE_PREFIX (e.g. QA → QA001, QA002).
 */

import * as path from 'path';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { testDataFactory, COUNTRY_DEFAULTS } from '../src/test-data/TestDataFactory';
import { logger } from '../src/utils/logger';
import { SalesforceJWTAuth } from '../src/utils/jwt-auth';
import { config } from '../src/config/config';
import { getRequiredReadinessPayload } from './lib/opportunity-readiness-payload';
import { approveWorkitem, PROCESS_APPROVALS_API_VERSION, submitForApprovalAsUser } from './lib/process-approvals-fetch';
import {
  applyOpportunityReadinessApprovalSlice,
  getOpportunityReadinessApproverUsernames,
  getOpportunityReadinessApprovalProcessDefinitionNameOrId,
} from './lib/approver-env';
import { submitReadinessApprovalWithAutoRetry } from './lib/readiness-approval-submit';

const env = (process.env.ENV || 'qa').toLowerCase();
process.env.ENV = env;
const envFile = path.resolve(process.cwd(), 'src/config/env', `.env.${env}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  console.log(`[OK] Loaded ${envFile}`);
} else {
  console.warn(`[WARN] No ${envFile}; using process.env`);
}

const REGIONS: Array<{ label: string; country: keyof typeof COUNTRY_DEFAULTS }> = [
  { label: 'US', country: 'United States' },
  { label: 'CA', country: 'Canada' },
  { label: 'UK', country: 'United Kingdom' },
  { label: 'EU', country: 'Germany' },
];

const DEFAULT_NAME_PREFIX = 'WF_';
/** If set, names include timestamp: WF_YYYYMMDD_HHmm_001. Otherwise WF_001. */
const USE_TIMESTAMP_IN_NAME = process.env.CONTRACTING_USE_TIMESTAMP_IN_NAME === '1' || process.env.CONTRACTING_USE_TIMESTAMP_IN_NAME === 'true';
const NAME_PREFIX = process.env.CONTRACTING_DATA_PREFIX?.trim() || DEFAULT_NAME_PREFIX;

let cachedEffectivePrefix: string | null = null;

function getTimestampPrefix(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${y}${m}${d}_${h}${min}_`;
}

/** Effective prefix for this run: NAME_PREFIX (starts with WF_) + optional timestamp. Cached per process so S2S3/S4S5 find records created in S1. When CONTRACTING_DATA_PREFIX is set explicitly, use it as-is (no timestamp). */
function getEffectivePrefix(): string {
  if (cachedEffectivePrefix) return cachedEffectivePrefix;
  const explicitPrefix = process.env.CONTRACTING_DATA_PREFIX?.trim();
  if (explicitPrefix) {
    cachedEffectivePrefix = explicitPrefix.endsWith('_') ? explicitPrefix : explicitPrefix + '_';
    return cachedEffectivePrefix;
  }
  const base = NAME_PREFIX || DEFAULT_NAME_PREFIX;
  if (USE_TIMESTAMP_IN_NAME) {
    cachedEffectivePrefix = (base.endsWith('_') ? base : base + '_') + getTimestampPrefix();
  } else {
    cachedEffectivePrefix = base.endsWith('_') ? base : base + '_';
  }
  return cachedEffectivePrefix;
}

function pad(n: number): string {
  return String(n).padStart(3, '0');
}

interface CreatedRecord {
  accountId: string;
  opportunityId: string;
  readinessId: string;
  region: string;
  accountName: string;
  memberOperatingRegion: string;
}

/** Add Opportunity Team Members using a specific user's token (e.g. QA MRD User). */
async function addOpportunityTeamAsUser(
  instanceUrl: string,
  accessToken: string,
  opportunityId: string,
  teamRoles: string[],
  teamUserIds: string[]
): Promise<void> {
  const baseUrl = `${instanceUrl.replace(/\/$/, '')}/services/data/${PROCESS_APPROVALS_API_VERSION}`;
  for (let i = 0; i < teamRoles.length; i++) {
    const role = teamRoles[i];
    const userId = teamUserIds[i];
    if (!userId) continue;
    const body = {
      OpportunityId: opportunityId,
      UserId: userId,
      TeamMemberRole: role,
      OpportunityAccessLevel: 'Edit',
    };
    const response = await fetch(`${baseUrl}/sobjects/OpportunityTeamMember`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text();
      logger.warn(`Could not add team member ${role} to ${opportunityId}: ${response.status} - ${text}`);
    }
  }
}

function getQaMrdUsername(): string | undefined {
  return process.env.SF_QAMRDUSER_JWT_USERNAME?.trim() || process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME?.trim();
}

/** Submit each readiness record for approval (as QA MRD User when SF_QAMRDUSER_JWT_USERNAME set), then log in as each approver and approve. */
async function submitAndApprovePhase(created: CreatedRecord[]): Promise<void> {
  const processNameOrId = getOpportunityReadinessApprovalProcessDefinitionNameOrId();
  if (!processNameOrId) {
    console.log(
      '[SKIP] Submit/approve: set OPPORTUNITY_READINESS_APPROVAL_PROCESS_NAME or OPPORTUNITY_READINESS_APPROVAL_PROCESS_ID (legacy CONTRACTING_* name still works).'
    );
    return;
  }

  const qaMrdUsername = getQaMrdUsername();
  let submitToken: { instanceUrl: string; accessToken: string } | null = null;
  if (qaMrdUsername) {
    try {
      const auth = await SalesforceJWTAuth.authenticate(qaMrdUsername);
      submitToken = { instanceUrl: auth.instanceUrl, accessToken: auth.accessToken };
      console.log(`[OK] Submit for approval will run as QA MRD User: ${qaMrdUsername}`);
    } catch (e: any) {
      logger.warn(`Could not authenticate as QA MRD User for submit: ${e.message}. Using default API user.`);
    }
  }

  for (const r of created) {
    try {
      let submitResult: { instanceId?: string; newWorkitemIds?: string[] };
      if (submitToken) {
        submitResult = await submitReadinessApprovalWithAutoRetry(r.readinessId, processNameOrId, (ctx, proc) =>
          submitForApprovalAsUser(submitToken.instanceUrl, submitToken.accessToken, ctx, proc)
        );
      } else {
        submitResult = await submitReadinessApprovalWithAutoRetry(r.readinessId, processNameOrId, (ctx, proc) =>
          testDataFactory.submitForApproval(ctx, proc).then((res) => ({
            instanceId: res.instanceId,
            newWorkitemIds: res.newWorkitemIds,
          }))
        );
      }
      const workitemIds = submitResult.newWorkitemIds || [];
      if (workitemIds.length === 0) {
        const instanceId = submitResult.instanceId;
        const q = testDataFactory.query.bind(testDataFactory);
        const workitemQuery = await q(
          `SELECT Id, ActorId FROM ProcessInstanceWorkitem WHERE ProcessInstance.TargetObjectId = '${r.readinessId}' AND ProcessInstance.Status = 'Pending'`
        );
        const items = workitemQuery?.records || [];
        if (items.length === 0) {
          logger.warn(`No pending work items for readiness ${r.readinessId}. InstanceId: ${instanceId}`);
          continue;
        }
        for (const item of items) workitemIds.push(item.Id);
      }

      const approverUsernames = getOpportunityReadinessApproverUsernames(r.memberOperatingRegion);
      if (approverUsernames.length === 0) {
        console.log(
          `[INFO] No Opportunity approver usernames for region ${r.memberOperatingRegion}. Set OPPORTUNITY_APPROVER_USERNAMES_${r.memberOperatingRegion} (or legacy CONTRACTING_*).`
        );
        continue;
      }

      const { workitemIds: wids, approverUsernames: users } = applyOpportunityReadinessApprovalSlice(
        r.memberOperatingRegion,
        workitemIds,
        approverUsernames
      );
      for (let i = 0; i < wids.length; i++) {
        const workitemId = wids[i];
        const username = users[i] || users[0];
        logger.info(`Approving work item ${workitemId} as ${username} (${r.memberOperatingRegion})`);
        const auth = await SalesforceJWTAuth.authenticate(username);
        await approveWorkitem(auth.instanceUrl, auth.accessToken, workitemId, 'Approved by contracting test script');
      }
      console.log(`[OK] Submitted and approved: ${r.accountName} (${r.memberOperatingRegion})`);
    } catch (e: any) {
      logger.error(`Submit/approve failed for ${r.readinessId}: ${e.message}`);
      throw e;
    }
  }
}

async function createPhase(startNum: number, count: number, ownerId?: string): Promise<CreatedRecord[]> {
  const created: CreatedRecord[] = [];
  const regionOverride = process.env.CONTRACTING_DATA_REGION?.trim().toUpperCase();
  const regionsListRaw = process.env.CONTRACTING_DATA_REGIONS?.trim();
  let regionList: typeof REGIONS;
  // CONTRACTING_DATA_REGIONS (list) takes precedence over CONTRACTING_DATA_REGION (single)
  if (regionsListRaw) {
    const labels = regionsListRaw.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
    regionList = REGIONS.filter((r) => labels.includes(r.label));
    if (regionList.length === 0) {
      throw new Error(`Invalid CONTRACTING_DATA_REGIONS=${regionsListRaw}; use comma-separated US, CA, UK, EU.`);
    }
  } else if (regionOverride) {
    regionList = REGIONS.filter((r) => r.label === regionOverride);
    if (regionList.length === 0) {
      throw new Error(`Invalid CONTRACTING_DATA_REGION=${regionOverride}; use US, CA, UK, or EU.`);
    }
  } else {
    regionList = REGIONS;
  }
  const useRandomRegion = Boolean(regionsListRaw);
  // Account Type: Member or Non-Member MGA only (QA org uses "Non - Member MGA" with spaces)
  const accountTypes: Array<'Member' | 'Non - Member MGA'> = ['Member', 'Non - Member MGA'];
  for (let i = 0; i < count; i++) {
    const num = startNum + i;
    const suffix = pad(num);
    const effectivePrefix = getEffectivePrefix();
    const accountName = `${effectivePrefix}${suffix}`;
    const regionConfig = useRandomRegion
      ? regionList[Math.floor(Math.random() * regionList.length)]
      : regionList[i % regionList.length];
    const countryDefaults = COUNTRY_DEFAULTS[regionConfig.country];
    if (!countryDefaults) throw new Error(`No COUNTRY_DEFAULTS for ${regionConfig.country}`);

    const accountType = accountTypes[i % accountTypes.length];
    const accountData: Record<string, any> = {
      Name: accountName,
      Type: accountType,
      BillingCountry: regionConfig.country,
      BillingCity: countryDefaults.city,
      BillingPostalCode: countryDefaults.postalCode,
      Phone: countryDefaults.phone,
      Functional_Currency__c: countryDefaults.currency === 'GBP' ? 'GBP' : countryDefaults.currency === 'CAD' ? 'CAD' : countryDefaults.currency === 'EUR' ? 'EUR' : 'USD',
      Description: `Contracting test data – ${regionConfig.label}. Created by generate-contracting-test-data.ts.`,
    };
    if (regionConfig.country === 'United States' || regionConfig.country === 'Canada') {
      accountData.BillingState = countryDefaults.state;
    }
    if (ownerId) {
      accountData.OwnerId = ownerId;
    }

    const account = await testDataFactory.createAccount(accountData, {
      checkExists: true,
      deleteIfExists: false,
      reuseExisting: true,
    });
    // Ensure Account billing address matches selected region (updates reused accounts when using CONTRACTING_DATA_REGIONS)
    const billingUpdate: Record<string, any> = {
      BillingCountry: regionConfig.country,
      BillingCity: countryDefaults.city,
      BillingPostalCode: countryDefaults.postalCode,
      Phone: countryDefaults.phone,
      Functional_Currency__c: countryDefaults.currency === 'GBP' ? 'GBP' : countryDefaults.currency === 'CAD' ? 'CAD' : countryDefaults.currency === 'EUR' ? 'EUR' : 'USD',
    };
    if (regionConfig.country === 'United States' || regionConfig.country === 'Canada') {
      billingUpdate.BillingState = countryDefaults.state;
    }
    await testDataFactory.updateRecord('Account', account.id, billingUpdate);
    const closeDate = new Date();
    closeDate.setDate(closeDate.getDate() + 90);
    const opportunityData: Record<string, unknown> = {
      Name: `${accountName} Opportunity`,
      StageName: 'Pipeline',
      Type: 'New Business',
      CloseDate: closeDate.toISOString().split('T')[0],
    };
    if (ownerId) {
      (opportunityData as Record<string, any>).OwnerId = ownerId;
    }
    const opportunity = await testDataFactory.createOpportunity(opportunityData as Record<string, any>, account.id);

    let readinessRow = await testDataFactory.findOpportunityReadinessByOpportunity(opportunity.id);
    if (!readinessRow) {
      const maxWaitMs = 15000;
      const intervalMs = 2000;
      for (let waited = 0; waited < maxWaitMs; waited += intervalMs) {
        await new Promise((r) => setTimeout(r, intervalMs));
        readinessRow = await testDataFactory.findOpportunityReadinessByOpportunity(opportunity.id);
        if (readinessRow) break;
      }
    }
    if (!readinessRow) {
      throw new Error(
        `No Opportunity Readiness record found for Opportunity ${opportunity.id} after waiting. ` +
          'The org may auto-create it asynchronously (Flow/Process Builder). Try running the script again, or ensure Type=New Business triggers creation.'
      );
    }
    const completedBy =
      process.env.SF_QAMRDUSER_JWT_USERNAME?.trim() ||
      process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME?.trim();
    const readinessPayload = getRequiredReadinessPayload(account.id, regionConfig.label, {
      summaryCompletedByUsername: completedBy,
    }) as Record<string, any>;
    await testDataFactory.updateRecord('Opportunity_Readiness__c', readinessRow.id, readinessPayload);

    created.push({
      accountId: account.id,
      opportunityId: opportunity.id,
      readinessId: readinessRow.id,
      region: regionConfig.label,
      accountName,
      memberOperatingRegion: regionConfig.label,
    });
    logger.info(`Created ${i + 1}/${count}: ${accountName} (${regionConfig.label}) → Opp ${opportunity.id} → Readiness ${readinessRow.id} (auto-created, populated)`);
  }
  return created;
}

async function postApprovalPhase(created: CreatedRecord[]): Promise<void> {
  const partyCodePrefix = process.env.CONTRACTING_PARTY_CODE_PREFIX?.trim();
  for (const r of created) {
    const accountUpdate: Record<string, any> = { Account_Status__c: 'Onboarding' };
    if (partyCodePrefix) {
      const numPart = r.accountName.match(/\d{3}$/)?.[0] || pad(created.indexOf(r) + 1);
      accountUpdate.Party_Code__c = `${partyCodePrefix}${numPart}`;
    }
    await testDataFactory.updateRecord('Account', r.accountId, accountUpdate);
    await testDataFactory.updateRecord('Opportunity', r.opportunityId, { StageName: 'Due Diligence' });
  }
  console.log('[OK] Account → Onboarding, Opportunity → Due Diligence');

  const populateDD = process.env.CONTRACTING_POPULATE_DD_TAB === '1' || process.env.CONTRACTING_POPULATE_DD_TAB === 'true';
  if (populateDD) {
    const ddCheckboxes: Record<string, boolean> = {
      CompanyRegulatoryChecksComplete__c: true,
      StaffBackgroundCheckComplete__c: true,
      ConfirmInsuranceRequirementsMet__c: true,
      ComplianceDocumentReviewComplete__c: true,
      BackgroundScreenChecksComplete__c: true,
      RegulatoryIssuesOrActionReviewed__c: true,
      EOPIDetailsProvided__c: true,
      UpGuardSecurityRating__c: true,
      ConfirmCreditScoreReviewComplete__c: true,
      FinancialAccountsReviewCompleted__c: true,
      BUXCadenceAndRequirementsAgreed__c: true,
      PaidBordeauxReconciliationComplete__c: true,
      BordeauxTrackerCompleted__c: true,
      ConfirmPlatformNotification__c: true,
      ParentalCompanyGuaranteeReceived__c: true,
      PaidDataFeedAgreed__c: true,
      ConfirmSamplePaidDataReviewed__c: true,
      ConfirmExposureDataFeedAgreed__c: true,
      ExposureDataFeedRequirementsProvided__c: true,
    };
    for (const r of created) {
      try {
        await testDataFactory.updateRecord('Opportunity_Readiness__c', r.readinessId, ddCheckboxes);
      } catch (e: any) {
        logger.warn(`Could not populate DD tab on readiness ${r.readinessId}: ${e.message}`);
      }
    }
    console.log('[OK] Opportunity_Readiness__c Due Diligence tab checkboxes populated');
  }

  const teamRolesRaw = process.env.CONTRACTING_TEAM_ROLES?.trim();
  const teamUserIdsRaw = process.env.CONTRACTING_TEAM_USER_IDS?.trim();
  if (teamRolesRaw && teamUserIdsRaw) {
    const roles = teamRolesRaw.split(',').map((s) => s.trim()).filter(Boolean);
    const userIds = teamUserIdsRaw.split(',').map((s) => s.trim()).filter(Boolean);
    if (roles.length !== userIds.length) {
      console.warn('[WARN] CONTRACTING_TEAM_ROLES and CONTRACTING_TEAM_USER_IDS count mismatch; skipping team assignment.');
    } else {
      const qaMrdUsername = getQaMrdUsername();
      if (qaMrdUsername) {
        try {
          const auth = await SalesforceJWTAuth.authenticate(qaMrdUsername);
          console.log(`[OK] Adding Opportunity Team as QA MRD User: ${qaMrdUsername}`);
          for (const r of created) {
            await addOpportunityTeamAsUser(auth.instanceUrl, auth.accessToken, r.opportunityId, roles, userIds);
          }
          console.log('[OK] Opportunity Team Members added (Edit access)');
        } catch (e: any) {
          logger.warn(`Could not add team as QA MRD User: ${e.message}. Falling back to default API user.`);
          for (const r of created) {
            for (let i = 0; i < roles.length; i++) {
              try {
                await testDataFactory.createOpportunityTeamMember(r.opportunityId, userIds[i], roles[i], 'Edit');
              } catch (e2: any) {
                logger.warn(`Could not add team member ${roles[i]} to ${r.opportunityId}: ${e2.message}`);
              }
            }
          }
          console.log('[OK] Opportunity Team Members added (Edit access, via default user)');
        }
      } else {
        for (const r of created) {
          for (let i = 0; i < roles.length; i++) {
            try {
              await testDataFactory.createOpportunityTeamMember(r.opportunityId, userIds[i], roles[i], 'Edit');
            } catch (e: any) {
              logger.warn(`Could not add team member ${roles[i]} to ${r.opportunityId}: ${e.message}`);
            }
          }
        }
        console.log('[OK] Opportunity Team Members added (Edit access). Set SF_QAMRDUSER_JWT_USERNAME to add team as QA MRD User.');
      }
    }
  } else {
    console.log('[INFO] Set CONTRACTING_TEAM_ROLES and CONTRACTING_TEAM_USER_IDS (comma-separated) to add team via API. See docs/CONTRACTING_OPPORTUNITY_TEAM_QA.md.');
  }

  for (const r of created) {
    try {
      await testDataFactory.updateRecord('Opportunity', r.opportunityId, { Questionnaires_Recipt__c: 'Yes' });
    } catch (e: any) {
      try {
        await testDataFactory.updateRecord('Opportunity', r.opportunityId, { Questionnaires_Receipt_Received__c: true });
      } catch (e2: any) {
        logger.warn(`Could not set Questionnaires Receipt Received on ${r.opportunityId}: ${e.message}; ${e2.message}`);
      }
    }
  }
  console.log('[OK] Opportunity "Questionnaires Receipt Received" = Yes');

  const q = testDataFactory.query.bind(testDataFactory);
  for (const r of created) {
    try {
      let taskResult = await q(`SELECT Id FROM Task WHERE WhatId = '${r.opportunityId}' AND Status != 'Completed' LIMIT 50`);
      let tasks = taskResult?.records || [];
      const readinessTaskResult = await q(`SELECT Id FROM Task WHERE WhatId = '${r.readinessId}' AND Status != 'Completed' LIMIT 50`);
      tasks = tasks.concat(readinessTaskResult?.records || []);
      for (const t of tasks) {
        await testDataFactory.updateRecord('Task', t.Id, { Status: 'Completed' });
      }
      if (tasks.length) logger.info(`Completed ${tasks.length} task(s) for Opportunity ${r.opportunityId}`);
    } catch (e: any) {
      logger.warn(`Could not complete tasks for ${r.opportunityId}: ${e.message}`);
    }
  }
  console.log('[OK] Related tasks marked Completed');

  for (const r of created) {
    await testDataFactory.updateRecord('Opportunity', r.opportunityId, { StageName: 'Contracting' });
  }
  console.log('[OK] Opportunity → Contracting');
}

async function main() {
  const startNum = Math.max(1, parseInt(process.env.CONTRACTING_DATA_START || '1', 10));
  const count = Math.max(1, Math.min(99, parseInt(process.env.CONTRACTING_DATA_COUNT || '10', 10)));
  const afterApproval = process.env.CONTRACTING_AFTER_APPROVAL === '1' || process.env.CONTRACTING_AFTER_APPROVAL === 'true';
  const runStage = (process.env.CONTRACTING_RUN_STAGE || '').trim().toUpperCase();
  const regionInfo = process.env.CONTRACTING_DATA_REGION?.trim()
    ? ` | Region: ${process.env.CONTRACTING_DATA_REGION}`
    : process.env.CONTRACTING_DATA_REGIONS?.trim()
      ? ` | Regions: ${process.env.CONTRACTING_DATA_REGIONS} (random per record)`
      : '';

  const modeLabel = runStage === 'S1' ? 'STAGE S1 (CREATE ONLY)'
    : runStage === 'S2S3' ? 'STAGE S2+S3 (SUBMIT + APPROVE ONLY)'
    : runStage === 'S4S5' ? 'STAGE S4+S5 (POST-APPROVAL + TEAM ONLY)'
    : afterApproval ? 'POST-APPROVAL UPDATES' : 'CREATE + POPULATE';

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log(`  Contracting Test Data (${count} records)`);
  console.log(`  Name prefix: ${getEffectivePrefix()}${pad(startNum)}–${getEffectivePrefix()}${pad(startNum + count - 1)}${regionInfo}`);
  console.log(`  Mode: ${modeLabel}`);
  console.log('═══════════════════════════════════════════════════════════\n');

  await testDataFactory.initialize();

  let ownerId: string | undefined;
  if (process.env.SF_MANUAL_TEST_DATA_OWNER_ID?.trim()) {
    ownerId = process.env.SF_MANUAL_TEST_DATA_OWNER_ID.trim();
    console.log(`[OK] Using QA MRD User (Owner): ${ownerId}\n`);
  } else if (process.env.USE_QA_MRD_AS_OWNER === 'true' || process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME || process.env.SF_QAMRDUSER_JWT_USERNAME) {
    const username = process.env.SF_MANUAL_TEST_DATA_OWNER_USERNAME || process.env.SF_QAMRDUSER_JWT_USERNAME;
    if (username) {
      const escaped = String(username).replace(/'/g, "''");
      const res = await testDataFactory.query(`SELECT Id FROM User WHERE Username = '${escaped}' LIMIT 1`);
      ownerId = res?.records?.[0]?.Id;
      if (ownerId) {
        console.log(`[OK] Resolved QA MRD User: "${username}" → ${ownerId}. Account & Opportunity owner will be set.\n`);
      } else {
        throw new Error(`User not found for username: ${username}. Check SF_QAMRDUSER_JWT_USERNAME or SF_MANUAL_TEST_DATA_OWNER_USERNAME in .env.qa`);
      }
    }
  }
  if (!ownerId) {
    console.log('[INFO] Account and Opportunity will be owned by the API user. Set USE_QA_MRD_AS_OWNER=true (and SF_QAMRDUSER_JWT_USERNAME in .env.qa) to assign QA MRD User as owner.\n');
  }

  /** Load existing records by name prefix (for S2S3 or post-approval). */
  async function loadCreatedByPrefix(): Promise<CreatedRecord[]> {
    const created: CreatedRecord[] = [];
    const effectivePrefix = getEffectivePrefix();
    for (let i = 0; i < count; i++) {
      const num = startNum + i;
      const accountName = `${effectivePrefix}${pad(num)}`;
      const regionConfig = REGIONS[i % REGIONS.length];
      const accountResult = await testDataFactory.query(
        `SELECT Id FROM Account WHERE Name = '${accountName}' LIMIT 1`
      );
      const accountId = accountResult?.records?.[0]?.Id;
      if (!accountId) {
        console.warn(`[WARN] Account not found: ${accountName}. Run create phase first.`);
        continue;
      }
      const oppResult = await testDataFactory.query(
        `SELECT Id FROM Opportunity WHERE AccountId = '${accountId}' AND Name LIKE '%${accountName}%' LIMIT 1`
      );
      const opportunityId = oppResult?.records?.[0]?.Id;
      if (!opportunityId) {
        console.warn(`[WARN] Opportunity not found for ${accountName}.`);
        continue;
      }
      const readinessResult = await testDataFactory.query(
        `SELECT Id FROM Opportunity_Readiness__c WHERE Opportunity__c = '${opportunityId}' LIMIT 1`
      );
      const readinessId = readinessResult?.records?.[0]?.Id;
      if (!readinessId) {
        console.warn(`[WARN] Opportunity_Readiness__c not found for ${accountName}.`);
        continue;
      }
      created.push({
        accountId,
        opportunityId,
        readinessId,
        region: regionConfig.label,
        accountName,
        memberOperatingRegion: regionConfig.label,
      });
    }
    return created;
  }

  // ─── S4S5 or CONTRACTING_AFTER_APPROVAL: post-approval only ───
  if (runStage === 'S4S5' || afterApproval) {
    const created = await loadCreatedByPrefix();
    if (created.length === 0) {
      console.error('No existing records found. Run S1 (create) first, or run without CONTRACTING_RUN_STAGE/S4S5 or CONTRACTING_AFTER_APPROVAL.');
      process.exit(1);
    }
    await postApprovalPhase(created);
    console.log('\nDone (post-approval updates applied).\n');
    return;
  }

  // ─── S2S3: submit + approve only (records must already exist) ───
  if (runStage === 'S2S3') {
    const created = await loadCreatedByPrefix();
    if (created.length === 0) {
      console.error('No existing records found. Run S1 first: CONTRACTING_RUN_STAGE=S1 CONTRACTING_DATA_START=' + startNum + ' CONTRACTING_DATA_COUNT=' + count + ' npm run data:contracting-test');
      process.exit(1);
    }
    await submitAndApprovePhase(created);
    console.log('\nDone (submit + approve). Next: run S4S5 to apply post-approval + team.');
    console.log(`  CONTRACTING_RUN_STAGE=S4S5 CONTRACTING_DATA_START=${startNum} CONTRACTING_DATA_COUNT=${count} npm run data:contracting-test\n`);
    return;
  }

  // ─── S1 or default: create phase ───
  const created = await createPhase(startNum, count, ownerId);

  if (runStage === 'S1') {
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  Summary (S1 – created only)');
    console.log('═══════════════════════════════════════════════════════════\n');
    printSummaryTable(created);
  console.log('\n--- Next: submit + approve (S2+S3) ---');
  console.log(`  CONTRACTING_RUN_STAGE=S2S3 CONTRACTING_DATA_START=${startNum} CONTRACTING_DATA_COUNT=${count} OPPORTUNITY_READINESS_APPROVAL_PROCESS_NAME="Opportunity Readiness Approval" CONTRACTING_SUBMIT_AND_APPROVE=1 npm run data:contracting-test`);
  if (USE_TIMESTAMP_IN_NAME) {
    console.log(`  (Use same prefix for S2S3: CONTRACTING_DATA_PREFIX=${getEffectivePrefix().replace(/_$/, '')})`);
  }
    console.log('\nSet OPPORTUNITY_APPROVER_USERNAMES_US, _UK, _EU, _CA (or legacy CONTRACTING_*) and SF_QAMRDUSER_JWT_USERNAME in .env.qa (see docs/CONTRACTING_ENV_EXAMPLE.md).\n');
    return;
  }

  if (process.env.CONTRACTING_SUBMIT_AND_APPROVE === '1' || process.env.CONTRACTING_SUBMIT_AND_APPROVE === 'true') {
    await submitAndApprovePhase(created);
  }

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  Summary (created & populated)');
  console.log('═══════════════════════════════════════════════════════════\n');
  printSummaryTable(created);

  console.log('\n--- Next steps (approval flow) ---');
  console.log('1) If you did not use CONTRACTING_SUBMIT_AND_APPROVE=1: submit for approval as QA MRD User, then have each region approver approve.');
  console.log('2) After all approvals, run post-approval + team (S4S5):');
  console.log(`   CONTRACTING_RUN_STAGE=S4S5 CONTRACTING_DATA_START=${startNum} CONTRACTING_DATA_COUNT=${count} npm run data:contracting-test`);
  console.log('   Or: CONTRACTING_AFTER_APPROVAL=1 CONTRACTING_DATA_START=' + startNum + ' CONTRACTING_DATA_COUNT=' + count + ' npm run data:contracting-test');
  console.log('\nSet CONTRACTING_TEAM_ROLES and CONTRACTING_TEAM_USER_IDS to add Opportunity Team (see docs/CONTRACTING_OPPORTUNITY_TEAM_QA.md).');
  console.log('\nDone.\n');
}

function printSummaryTable(created: CreatedRecord[]): void {
  console.log('Account Name                 | Region | Account Id         | Opportunity Id      | Readiness Id');
  console.log('-----------------------------|--------|--------------------|--------------------|-------------------');
  for (const r of created) {
    console.log(`${r.accountName.padEnd(28)} | ${r.region.padEnd(6)} | ${r.accountId} | ${r.opportunityId} | ${r.readinessId}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
