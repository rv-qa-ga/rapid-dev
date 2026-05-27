/**
 * Shared helpers for SF-612, SF-788, and similar Dataverse-eligibility API tests.
 * Story wording uses Dataverse_Id__c; Salesforce API field is typically Dataverse_ID__c.
 */

import { randomUUID } from 'crypto';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../utils/logger';

export const ACCOUNT_DATAVERSE_FIELD = 'Dataverse_ID__c';

export async function stampAccountDataverseIdStrict(
  apiClient: SalesforceAPIClient,
  accountId: string,
  roleLabel: string
): Promise<string> {
  const guid = randomUUID();
  await apiClient.updateRecord('Account', accountId, { [ACCOUNT_DATAVERSE_FIELD]: guid });
  const q = await apiClient.query(
    `SELECT ${ACCOUNT_DATAVERSE_FIELD} FROM Account WHERE Id = '${accountId}' LIMIT 1`
  );
  const row = q.records?.[0] as Record<string, unknown> | undefined;
  const v = row?.[ACCOUNT_DATAVERSE_FIELD];
  if (v == null || String(v).trim() === '') {
    throw new Error(
      `Dataverse eligibility: Expected ${roleLabel} Account ${accountId} to have ${ACCOUNT_DATAVERSE_FIELD} after API update. ` +
        `Work items require related Accounts to exist in Dataverse — check FLS, validation rules, or field API name.`
    );
  }
  logger.info(`✅ ${roleLabel} ${accountId} has ${ACCOUNT_DATAVERSE_FIELD} set`);
  return String(v);
}

export async function assertAccountDataverseBlank(
  apiClient: SalesforceAPIClient,
  accountId: string,
  roleLabel: string
): Promise<void> {
  const q = await apiClient.query(
    `SELECT ${ACCOUNT_DATAVERSE_FIELD} FROM Account WHERE Id = '${accountId}' LIMIT 1`
  );
  const row = q.records?.[0] as Record<string, unknown> | undefined;
  const v = row?.[ACCOUNT_DATAVERSE_FIELD];
  if (v != null && String(v).trim() !== '') {
    throw new Error(
      `Test setup: Expected ${roleLabel} ${accountId} to have blank ${ACCOUNT_DATAVERSE_FIELD} for ineligible scenario, got ${JSON.stringify(v)}`
    );
  }
}

export async function assertAccountDataversePopulated(
  apiClient: SalesforceAPIClient,
  accountId: string,
  roleLabel: string
): Promise<void> {
  const q = await apiClient.query(
    `SELECT ${ACCOUNT_DATAVERSE_FIELD} FROM Account WHERE Id = '${accountId}' LIMIT 1`
  );
  const row = q.records?.[0] as Record<string, unknown> | undefined;
  const v = row?.[ACCOUNT_DATAVERSE_FIELD];
  if (v == null || String(v).trim() === '') {
    throw new Error(
      `${roleLabel} Account ${accountId} must have ${ACCOUNT_DATAVERSE_FIELD} populated per story.`
    );
  }
}

/**
 * Clear Dataverse id on Account (ineligible-update scenarios). Fails if field remains populated.
 */
export async function clearAccountDataverseIdStrict(
  apiClient: SalesforceAPIClient,
  accountId: string,
  roleLabel: string
): Promise<void> {
  await apiClient.updateRecord('Account', accountId, { [ACCOUNT_DATAVERSE_FIELD]: null });
  const q = await apiClient.query(
    `SELECT ${ACCOUNT_DATAVERSE_FIELD} FROM Account WHERE Id = '${accountId}' LIMIT 1`
  );
  const row = q.records?.[0] as Record<string, unknown> | undefined;
  const v = row?.[ACCOUNT_DATAVERSE_FIELD];
  if (v != null && String(v).trim() !== '') {
    throw new Error(
      `SF-788: Could not clear ${ACCOUNT_DATAVERSE_FIELD} on ${roleLabel} ${accountId} (still ${JSON.stringify(v)}). ` +
        `Org may block nulling this field via API — cannot automate "ineligible update" without clearing it.`
    );
  }
  logger.info(`✅ Cleared ${ACCOUNT_DATAVERSE_FIELD} on ${roleLabel} ${accountId}`);
}
