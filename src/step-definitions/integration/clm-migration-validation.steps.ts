/**
 * CLM go-live — bulk migration validation (read-only).
 * Feature: src/features/integration/clm-go-live/CLM-MIGRATION-VALIDATION.feature
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { DynamicsAPIClient } from '../../api-clients/dynamics/DynamicsAPIClient';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../utils/logger';
import { primeSfAccountDataverseFieldFromOrg } from '../../utils/sf-account-dataverse-field';
import { primeSalesforceMigrationCorrelationFields } from '../../utils/sf-migration-correlation-field';
import {
  evaluateClmMigrationExistenceMatch,
  getClmMigrationEntity,
  getClmMigrationEntitiesForCounts,
  isClmMigrationEntityReadyOnInt,
  isClmMigrationGoNoGoFullTable,
  PICKLIST_MAPPINGS_EXCEL,
} from '../../utils/clm-migration-entity-config';
import {
  ClmEntityMigrationRunResult,
  loadClmEntityFieldMappings,
  runClmEntityMigrationValidation,
} from '../../utils/clm-migration-validation.service';
import { writeClmMigrationExcelReport } from '../../utils/clm-migration-excel-report';
import {
  ClmEntityRecordCount,
  collectClmMigrationRecordCounts,
  writeClmMigrationRecordCountReport,
} from '../../utils/clm-migration-record-count';

function assertReadOnlyMigration(): void {
  const env = (process.env.ENV || '').toLowerCase();
  if (env !== 'int') {
    throw new Error(
      `CLM migration validation requires ENV=int (.env.int). Current ENV=${process.env.ENV || '(unset)'}`
    );
  }
  if ((process.env.CLM_MIGRATION_ALLOW_WRITES || '').toLowerCase() === 'true') {
    throw new Error('CLM_MIGRATION_ALLOW_WRITES=true is not permitted for @migration-readonly scenarios.');
  }
}

function strictMode(): boolean {
  return (process.env.CLM_MIGRATION_STRICT || 'true').toLowerCase() !== 'false';
}

Given('migration validation is in read-only mode with no record creation', function () {
  assertReadOnlyMigration();
  logger.info('CLM migration: read-only mode — no Salesforce/Dynamics record creation');
});

Given(
  'CLM migration entity {string} field mappings are loaded from the migration mapping document',
  async function (this: AutomationWorld, entityKey: string) {
    assertReadOnlyMigration();
    if (!isClmMigrationEntityReadyOnInt(entityKey)) {
      const entity = getClmMigrationEntity(entityKey);
      throw new Error(
        `CLM migration entity "${entityKey}" (${entity.jira}) is not marked ready on INT. ` +
          `Set intMigrationReady in clm-migration-entity-config when SF load completes.`
      );
    }
    const entity = getClmMigrationEntity(entityKey);
    const { mappings, excelPath, sheetName } = await loadClmEntityFieldMappings(entityKey);
    this.testContext.clmMigrationEntityKey = entityKey;
    this.testContext.clmMigrationEntity = entity;
    this.testContext.clmFieldMappings = mappings;
    this.testContext.clmFieldMappingExcel = excelPath;
    this.testContext.clmFieldMappingSheet = sheetName;
    logger.info(
      `Loaded ${mappings.length} in-scope field mappings (Include in Migration = Y) for ${entity.label} ` +
        `from ${excelPath} [${sheetName}]. Picklist values: ${entity.picklistMigrationTab} in ${PICKLIST_MAPPINGS_EXCEL}`
    );
  }
);

When(
  'I run full CLM migration validation for entity {string}',
  async function (this: AutomationWorld, entityKey: string) {
    assertReadOnlyMigration();

    const dynamicsClient = this.testContext.dynamicsClient as DynamicsAPIClient;
    const salesforceClient = this.testContext.salesforceClient as SalesforceAPIClient;
    if (!dynamicsClient || !salesforceClient) {
      throw new Error('Authenticate Dynamics and Salesforce first (Background).');
    }

    const run = await runClmEntityMigrationValidation(dynamicsClient, salesforceClient, entityKey);
    this.testContext.clmMigrationRun = run;
    logger.info(
      `CLM migration run ${entityKey}: Dynamics=${run.dynamicsRecords.length}, ` +
        `missing SF=${run.missingInSalesforce.length}, field diffs=${run.recordsWithFieldDiffs}`
    );
  }
);

Then(
  'every Dynamics record should exist in Salesforce for CLM migration entity {string}',
  function (this: AutomationWorld, entityKey: string) {
    const run = this.testContext.clmMigrationRun as ClmEntityMigrationRunResult | undefined;
    if (!run || run.entity.key !== entityKey) {
      throw new Error(`Run validation first for entity "${entityKey}".`);
    }

    if (run.missingInSalesforce.length === 0) {
      logger.info(`All ${run.dynamicsRecords.length} Dynamics records have a Salesforce TARGET row.`);
      return;
    }

    const entity = getClmMigrationEntity(entityKey);
    if (entity.existenceMatchMode === 'skip') {
      logger.info(
        `Skipping reverse existence check for ${entityKey} (${entity.existenceExclusionNote || 'BA exclusion rules'}).`
      );
      return;
    }
    if (evaluateClmMigrationExistenceMatch(entity, run.missingInSalesforce.length)) {
      logger.info(
        `${run.missingInSalesforce.length} Dynamics record(s) missing in Salesforce — within documented tolerance ` +
          `(${entity.existenceExclusionNote || entity.existenceTolerance + ' allowed'}).`
      );
      return;
    }

    const sample = run.missingInSalesforce.slice(0, 10).join(', ');
    const msg =
      `${run.missingInSalesforce.length} Dynamics record(s) missing in Salesforce. Sample IDs: ${sample}`;
    if (strictMode()) {
      throw new Error(msg);
    }
    logger.warn(`⚠️  ${msg}`);
  }
);

Then(
  'all mapped fields should match for CLM migration entity {string} or be reported in the migration Excel report',
  function (this: AutomationWorld, entityKey: string) {
    const run = this.testContext.clmMigrationRun as ClmEntityMigrationRunResult | undefined;
    if (!run || run.entity.key !== entityKey) {
      throw new Error(`Run validation first for entity "${entityKey}".`);
    }

    const totalMismatches = run.validationResults.reduce((s, r) => s + r.fieldsDifferent, 0);
    if (totalMismatches === 0) {
      logger.info('All mapped fields match between SOURCE (Dynamics) and TARGET (Salesforce).');
      return;
    }

    const msg =
      `${run.recordsWithFieldDiffs} record(s) with ${totalMismatches} total field mismatch(es). See Excel report.`;
    if (strictMode()) {
      throw new Error(msg);
    }
    logger.warn(`⚠️  ${msg}`);
  }
);

Then(
  'Salesforce audit fields should match Dynamics for CLM migration entity {string}',
  function (this: AutomationWorld, entityKey: string) {
    const run = this.testContext.clmMigrationRun as ClmEntityMigrationRunResult | undefined;
    if (!run || run.entity.key !== entityKey) {
      throw new Error(`Run validation first for entity "${entityKey}".`);
    }

    const audit = run.auditValidation;
    if (!audit) {
      logger.info(`Audit validation not run for ${entityKey} (disabled or no matched records).`);
      return;
    }

    if (audit.mismatches.length === 0) {
      logger.info(
        `Audit fields match for ${audit.recordsChecked} record(s) (Owner/CreatedBy/LastModifiedBy).`
      );
      return;
    }

    const sample = audit.mismatches
      .slice(0, 5)
      .map((m) => `${m.dynamicsId}:${m.field}`)
      .join(', ');
    const msg =
      `${audit.mismatches.length} audit field mismatch(es) on ${entityKey}. Sample: ${sample}`;
    if (strictMode()) {
      throw new Error(msg);
    }
    logger.warn(`⚠️  ${msg}`);
  }
);

Then(
  'a CLM migration Excel report should be generated for entity {string}',
  async function (this: AutomationWorld, entityKey: string) {
    const run = this.testContext.clmMigrationRun as ClmEntityMigrationRunResult | undefined;
    if (!run || run.entity.key !== entityKey) {
      throw new Error(`Run validation first for entity "${entityKey}".`);
    }

    const { path, summary } = await writeClmMigrationExcelReport(run);
    this.testContext.clmMigrationReportPath = path;
    this.testContext.clmMigrationSummary = summary;
    logger.info(`CLM migration Excel report: ${path}`);
    logger.info(
      `Summary: queried=${summary.dynamicsQueried}, found=${summary.salesforceFound}, ` +
        `missing=${summary.missingInSalesforce}, mismatches=${summary.totalFieldMismatches}`
    );
  }
);

When('I collect migration record counts for all CLM migration entities', async function (this: AutomationWorld) {
  assertReadOnlyMigration();

  const dynamicsClient = this.testContext.dynamicsClient as DynamicsAPIClient;
  const salesforceClient = this.testContext.salesforceClient as SalesforceAPIClient;
  if (!dynamicsClient || !salesforceClient) {
    throw new Error('Authenticate Dynamics and Salesforce first (Background).');
  }

  const counts = await collectClmMigrationRecordCounts(dynamicsClient, salesforceClient);
  this.testContext.clmMigrationRecordCounts = counts;

  for (const c of counts) {
    const status = c.error ? 'ERROR' : c.match ? 'MATCH' : 'MISMATCH';
    logger.info(
      `[${c.entity.key}] ${status}: SOURCE=${c.dynamicsCount}, TARGET migrated=${c.salesforceMigratedCount}, ` +
        `TARGET total=${c.salesforceTotalCount}`
    );
  }
});

Then(
  'Dynamics and Salesforce record counts should match for each CLM migration entity',
  function (this: AutomationWorld) {
    const counts = this.testContext.clmMigrationRecordCounts as ClmEntityRecordCount[] | undefined;
    if (!counts || counts.length === 0) {
      throw new Error('Collect migration record counts first.');
    }

    const skipped = counts.filter((c) => c.skipped);
    const errors = counts.filter((c) => c.error && !c.skipped);
    const evaluated = counts.filter((c) => !c.skipped && !c.error);
    const mismatches = evaluated.filter((c) => !c.match);

    if (skipped.length > 0) {
      logger.info(
        `Skipped ${skipped.length} entity(ies) not deployed on INT: ${skipped.map((c) => c.entity.key).join(', ')}`
      );
      if (isClmMigrationGoNoGoFullTable() && strictMode()) {
        const detail = skipped.map((c) => `${c.entity.key}: ${c.skipReason}`).join('; ');
        throw new Error(
          `Go/No-Go full BA table: ${skipped.length} entity(ies) not loaded on INT — ${detail}`
        );
      }
    }

    if (errors.length > 0) {
      const detail = errors.map((c) => `${c.entity.key}: ${c.error}`).join('; ');
      throw new Error(`Record count query failed for ${errors.length} entity(ies): ${detail}`);
    }

    if (mismatches.length === 0) {
      logger.info(
        `All ${evaluated.length} evaluated entity record counts match (SOURCE Dynamics = TARGET Salesforce migrated).`
      );
      return;
    }

    const lines = mismatches.map(
      (c) =>
        `${c.entity.label} (${c.entity.jira}): SOURCE=${c.dynamicsCount}, ` +
        `TARGET migrated=${c.salesforceMigratedCount}, delta=${c.delta}`
    );
    const msg = `${mismatches.length} entity count mismatch(es):\n${lines.join('\n')}`;
    if (strictMode()) {
      throw new Error(msg);
    }
    logger.warn(`⚠️  ${msg}`);
  }
);

Then('a CLM migration record count Excel report should be generated', async function (this: AutomationWorld) {
  const counts = this.testContext.clmMigrationRecordCounts as ClmEntityRecordCount[] | undefined;
  if (!counts || counts.length === 0) {
    throw new Error('Collect migration record counts first.');
  }

  const reportPath = await writeClmMigrationRecordCountReport(counts);
  this.testContext.clmMigrationRecordCountReportPath = reportPath;
  logger.info(`Record count report: ${reportPath}`);
});

// Ensure SF Account Dataverse field is primed when using shared auth step from migration-validation.steps
Given(
  'I have valid API access to both Dynamics CRM and Salesforce for CLM migration',
  async function (this: AutomationWorld) {
    if (!this.apiContext) {
      throw new Error('API context not initialized.');
    }

    const dynamicsClient = new DynamicsAPIClient(this.apiContext);
    await dynamicsClient.authenticate();
    this.testContext.dynamicsClient = dynamicsClient;

    const salesforceClient = new SalesforceAPIClient(this.apiContext);
    await salesforceClient.authenticate();
    this.testContext.salesforceClient = salesforceClient;
    this.testContext.apiClient = salesforceClient;

    await primeSfAccountDataverseFieldFromOrg(salesforceClient);
    const countEntities = getClmMigrationEntitiesForCounts();
    await primeSalesforceMigrationCorrelationFields(
      salesforceClient,
      countEntities.map((e) => e.salesforceObject)
    );
    logger.info('CLM migration: Dynamics + Salesforce authenticated (read-only)');
  }
);
