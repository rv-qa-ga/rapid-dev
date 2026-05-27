import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { logger } from './logger';

export const DEFAULT_MIGRATION_CORRELATION_FIELD = 'Dataverse_ID__c';

const CORRELATION_CANDIDATES = [
  DEFAULT_MIGRATION_CORRELATION_FIELD,
  'Dataverse_Id__c',
  'DataverseID__c',
  'DataverseId__c',
];

/** Per-process cache: Salesforce object API name → resolved correlation field. */
const resolvedByObject = new Map<string, string>();

export function resetSfMigrationCorrelationFieldCacheForTests(): void {
  resolvedByObject.clear();
}

/**
 * Probe org with trivial SOQL — qamerge Account may use Dataverse_Id__c; INT uses Dataverse_ID__c.
 */
export async function resolveSalesforceMigrationCorrelationField(
  client: SalesforceAPIClient,
  objectApiName: string
): Promise<string> {
  const cached = resolvedByObject.get(objectApiName);
  if (cached) {
    return cached;
  }

  const envKey = `CLM_MIGRATION_CORRELATION_${objectApiName.replace(/__c$/i, '').toUpperCase()}`;
  const fromEnv = process.env[envKey]?.trim() || process.env.CLM_MIGRATION_CORRELATION_FIELD?.trim();
  if (fromEnv) {
    resolvedByObject.set(objectApiName, fromEnv);
    return fromEnv;
  }

  for (const field of CORRELATION_CANDIDATES) {
    try {
      await client.query(`SELECT Id, ${field} FROM ${objectApiName} LIMIT 1`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('INVALID_FIELD') && !msg.includes('No such column')) {
        throw err;
      }
      continue;
    }

    try {
      const countResult = await client.query(
        `SELECT COUNT() FROM ${objectApiName} WHERE ${field} != null`
      );
      const populated = countResult.totalSize ?? 0;
      if (populated > 0) {
        resolvedByObject.set(objectApiName, field);
        if (field !== DEFAULT_MIGRATION_CORRELATION_FIELD) {
          logger.info(
            `Resolved ${objectApiName} correlation field: ${field} (${populated} populated row(s)).`
          );
        }
        return field;
      }
    } catch {
      // fall through — try next candidate
    }
  }

  for (const field of CORRELATION_CANDIDATES) {
    try {
      await client.query(`SELECT Id, ${field} FROM ${objectApiName} LIMIT 1`);
      resolvedByObject.set(objectApiName, field);
      if (field !== DEFAULT_MIGRATION_CORRELATION_FIELD) {
        logger.info(
          `Resolved ${objectApiName} correlation field: ${field} (set ${envKey} to skip probe).`
        );
      }
      return field;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (!msg.includes('INVALID_FIELD') && !msg.includes('No such column')) {
        throw err;
      }
    }
  }

  resolvedByObject.set(objectApiName, DEFAULT_MIGRATION_CORRELATION_FIELD);
  logger.warn(
    `Could not probe correlation field on ${objectApiName}; defaulting to ${DEFAULT_MIGRATION_CORRELATION_FIELD}.`
  );
  return DEFAULT_MIGRATION_CORRELATION_FIELD;
}

/** Prime correlation fields for all listed Salesforce objects (e.g. before count/validation batch). */
export async function primeSalesforceMigrationCorrelationFields(
  client: SalesforceAPIClient,
  objectApiNames: string[]
): Promise<void> {
  for (const obj of [...new Set(objectApiNames.filter(Boolean))]) {
    await resolveSalesforceMigrationCorrelationField(client, obj);
  }
}
