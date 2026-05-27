/**
 * Phase A audit validation — Owner / CreatedBy / LastModifiedBy after Workbench load.
 * Maps Dynamics systemuser GUID → Salesforce User via Azure_Active_Directory_ID__c.
 */

import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { logger } from './logger';

export const DYNAMICS_AUDIT_SELECT = ['_ownerid_value', '_createdby_value', '_modifiedby_value'] as const;
export const SALESFORCE_AUDIT_SELECT = ['OwnerId', 'CreatedById', 'LastModifiedById'] as const;

export interface ClmAuditFieldMismatch {
  dynamicsId: string;
  salesforceId: string;
  field: 'Owner' | 'CreatedBy' | 'LastModifiedBy';
  dynamicsUserId: string;
  expectedSfUserId: string;
  actualSfUserId: string;
}

export interface ClmAuditValidationResult {
  recordsChecked: number;
  mismatches: ClmAuditFieldMismatch[];
  unmappedDynamicsUsers: Set<string>;
}

let dynamicsToSfUserMap: Map<string, string> | null = null;

export function resetClmMigrationUserMapForTests(): void {
  dynamicsToSfUserMap = null;
}

function normalizeGuid(value: string): string {
  return value.trim().toLowerCase().replace(/[{}]/g, '');
}

/** Build Dynamics systemuserid → Salesforce User Id via Azure AD object id. */
export async function buildClmMigrationUserMap(
  dynamicsClient: DynamicsAPIClient,
  salesforceClient: SalesforceAPIClient
): Promise<Map<string, string>> {
  if (dynamicsToSfUserMap) {
    return dynamicsToSfUserMap;
  }

  const map = new Map<string, string>();
  const csvPath = process.env.CLM_MIGRATION_USER_MAPPING_CSV?.trim();
  if (csvPath) {
    const fs = await import('fs');
    if (fs.existsSync(csvPath)) {
      const text = fs.readFileSync(csvPath, 'utf8');
      for (const line of text.split(/\r?\n/).slice(1)) {
        const [dvId, sfId] = line.split(',').map((s) => s.trim().replace(/^"|"$/g, ''));
        if (dvId && sfId) {
          map.set(normalizeGuid(dvId), sfId);
        }
      }
      logger.info(`Loaded ${map.size} user mapping row(s) from ${csvPath}`);
      dynamicsToSfUserMap = map;
      return map;
    }
    logger.warn(`CLM_MIGRATION_USER_MAPPING_CSV not found: ${csvPath}`);
  }

  const sfByAzure = new Map<string, string>();
  let sfOffset = 0;
  const sfPage = 2000;
  while (true) {
    const sfRes = await salesforceClient.query(
      `SELECT Id, Azure_Active_Directory_ID__c FROM User WHERE Azure_Active_Directory_ID__c != null LIMIT ${sfPage} OFFSET ${sfOffset}`
    );
    const rows = (sfRes.records || []) as Array<{ Id?: string; Azure_Active_Directory_ID__c?: string }>;
    for (const row of rows) {
      const azure = String(row.Azure_Active_Directory_ID__c || '').trim();
      if (azure && row.Id) {
        sfByAzure.set(normalizeGuid(azure), row.Id);
      }
    }
    if (rows.length < sfPage) {
      break;
    }
    sfOffset += sfPage;
  }
  logger.info(`Indexed ${sfByAzure.size} Salesforce User(s) by Azure_Active_Directory_ID__c`);

  const dvFields = ['systemuserid', 'azureactivedirectoryobjectid'];
  let dvRows: Record<string, unknown>[] = [];
  try {
    const res = await dynamicsClient.query('systemusers', {
      $select: dvFields.join(','),
      $filter: 'azureactivedirectoryobjectid ne null',
      $top: '5000',
    });
    dvRows = (res.value as Record<string, unknown>[]) || [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.warn(`Could not query Dynamics systemusers for audit map: ${msg}`);
    dynamicsToSfUserMap = map;
    return map;
  }

  for (const row of dvRows) {
    const dvUserId = normalizeGuid(String(row.systemuserid || ''));
    const azure = normalizeGuid(String(row.azureactivedirectoryobjectid || ''));
    const sfId = azure ? sfByAzure.get(azure) : undefined;
    if (dvUserId && sfId) {
      map.set(dvUserId, sfId);
    }
  }

  logger.info(`Built Dynamics→Salesforce user map: ${map.size} systemuser(s)`);
  dynamicsToSfUserMap = map;
  return map;
}

export function compareRecordAuditFields(
  dynamicsRecord: Record<string, unknown>,
  salesforceRecord: Record<string, unknown>,
  dynamicsId: string,
  userMap: Map<string, string>
): { mismatches: ClmAuditFieldMismatch[]; unmapped: string[] } {
  const mismatches: ClmAuditFieldMismatch[] = [];
  const unmapped: string[] = [];
  const sfId = String(salesforceRecord.Id || '');

  const pairs: Array<{
    label: ClmAuditFieldMismatch['field'];
    dynamicsKey: string;
    sfKey: string;
  }> = [
    { label: 'Owner', dynamicsKey: '_ownerid_value', sfKey: 'OwnerId' },
    { label: 'CreatedBy', dynamicsKey: '_createdby_value', sfKey: 'CreatedById' },
    { label: 'LastModifiedBy', dynamicsKey: '_modifiedby_value', sfKey: 'LastModifiedById' },
  ];

  for (const { label, dynamicsKey, sfKey } of pairs) {
    const dvUser = normalizeGuid(String(dynamicsRecord[dynamicsKey] || ''));
    if (!dvUser) {
      continue;
    }
    const expectedSf = userMap.get(dvUser);
    const actualSf = String(salesforceRecord[sfKey] || '');
    if (!expectedSf) {
      unmapped.push(dvUser);
      continue;
    }
    if (actualSf !== expectedSf) {
      mismatches.push({
        dynamicsId,
        salesforceId: sfId,
        field: label,
        dynamicsUserId: dvUser,
        expectedSfUserId: expectedSf,
        actualSfUserId: actualSf,
      });
    }
  }

  return { mismatches, unmapped };
}

export async function validateAuditFieldsForRecords(
  dynamicsClient: DynamicsAPIClient,
  salesforceClient: SalesforceAPIClient,
  pairs: Array<{ dynamics: Record<string, unknown>; salesforce: Record<string, unknown>; dynamicsId: string }>
): Promise<ClmAuditValidationResult> {
  const userMap = await buildClmMigrationUserMap(dynamicsClient, salesforceClient);
  const mismatches: ClmAuditFieldMismatch[] = [];
  const unmappedDynamicsUsers = new Set<string>();

  for (const { dynamics, salesforce, dynamicsId } of pairs) {
    const { mismatches: rowMismatch, unmapped } = compareRecordAuditFields(
      dynamics,
      salesforce,
      dynamicsId,
      userMap
    );
    mismatches.push(...rowMismatch);
    for (const u of unmapped) {
      unmappedDynamicsUsers.add(u);
    }
  }

  return {
    recordsChecked: pairs.length,
    mismatches,
    unmappedDynamicsUsers,
  };
}
