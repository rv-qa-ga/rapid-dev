import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { logger } from './logger';

export const DEFAULT_ACCOUNT_DATAVERSE_FIELD = 'Dataverse_ID__c';

/** Probed once per process when env omits ACCOUNT_DATAVERSE_ID_FIELD. */
let resolvedSfAccountDataverseField: string | null = null;

export function resetSfAccountDataverseFieldResolutionForTests(): void {
  resolvedSfAccountDataverseField = null;
}

/**
 * Probe org with trivial SOQL (e.g. qamerge uses Dataverse_Id__c, not Dataverse_ID__c).
 */
export async function primeSfAccountDataverseFieldFromOrg(client: SalesforceAPIClient): Promise<void> {
  if (resolvedSfAccountDataverseField) return;
  const fromEnv =
    process.env.ACCOUNT_DATAVERSE_ID_FIELD?.trim() || process.env.SF_ACCOUNT_DATAVERSE_ID_FIELD?.trim();
  if (fromEnv && fromEnv.length > 0) {
    resolvedSfAccountDataverseField = fromEnv;
    return;
  }
  const candidates = [DEFAULT_ACCOUNT_DATAVERSE_FIELD, 'Dataverse_Id__c'];
  for (const f of candidates) {
    try {
      await client.query(`SELECT ${f} FROM Account LIMIT 1`);
      resolvedSfAccountDataverseField = f;
      if (f !== DEFAULT_ACCOUNT_DATAVERSE_FIELD) {
        logger.info(`Resolved Account Dataverse id API name for this org: ${f} (set ACCOUNT_DATAVERSE_ID_FIELD to skip probe).`);
      }
      return;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes('INVALID_FIELD')) continue;
      throw e;
    }
  }
  resolvedSfAccountDataverseField = DEFAULT_ACCOUNT_DATAVERSE_FIELD;
  logger.warn(
    `Could not probe Account Dataverse field; defaulting to ${DEFAULT_ACCOUNT_DATAVERSE_FIELD}. Set ACCOUNT_DATAVERSE_ID_FIELD if queries fail.`
  );
}

export function sfAccountDataverseField(): string {
  if (resolvedSfAccountDataverseField) return resolvedSfAccountDataverseField;
  const fromEnv =
    process.env.ACCOUNT_DATAVERSE_ID_FIELD?.trim() || process.env.SF_ACCOUNT_DATAVERSE_ID_FIELD?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ACCOUNT_DATAVERSE_FIELD;
}

export const DEFAULT_ACCOUNT_PARTY_MASTER_FIELD = 'Party_MasterId__c';

/** Null when org has no Party Master API field (qamerge may only use Dataverse id). */
let resolvedSfAccountPartyMasterField: string | null | undefined;

export function resetSfAccountPartyMasterFieldResolutionForTests(): void {
  resolvedSfAccountPartyMasterField = undefined;
}

export async function primeSfAccountPartyMasterFieldFromOrg(
  client: SalesforceAPIClient
): Promise<void> {
  if (resolvedSfAccountPartyMasterField !== undefined) return;
  const fromEnv = process.env.ACCOUNT_PARTY_MASTER_ID_FIELD?.trim();
  if (fromEnv && fromEnv.length > 0) {
    resolvedSfAccountPartyMasterField = fromEnv;
    return;
  }
  const candidates = [DEFAULT_ACCOUNT_PARTY_MASTER_FIELD, 'Party_Master_Id__c'];
  for (const f of candidates) {
    try {
      await client.query(`SELECT ${f} FROM Account LIMIT 1`);
      resolvedSfAccountPartyMasterField = f;
      if (f !== DEFAULT_ACCOUNT_PARTY_MASTER_FIELD) {
        logger.info(
          `Resolved Account Party Master API name for this org: ${f} (set ACCOUNT_PARTY_MASTER_ID_FIELD to skip probe).`
        );
      }
      return;
    } catch (e: any) {
      const msg = String(e?.message ?? e);
      if (msg.includes('INVALID_FIELD')) continue;
      throw e;
    }
  }
  resolvedSfAccountPartyMasterField = null;
  logger.info(
    'Account Party Master id field not found on this org; Party_MasterId__c steps will use Dataverse id / PTY_Code where applicable.'
  );
}

/** Returns API name or null when the org has no Party Master field. */
export function sfAccountPartyMasterField(): string | null {
  if (resolvedSfAccountPartyMasterField !== undefined) {
    return resolvedSfAccountPartyMasterField;
  }
  const fromEnv = process.env.ACCOUNT_PARTY_MASTER_ID_FIELD?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_ACCOUNT_PARTY_MASTER_FIELD;
}
