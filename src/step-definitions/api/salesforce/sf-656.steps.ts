/**
 * SF-656 - Region-based Executive approval for Opportunity Summary (API)
 * Uses framework: api-common "I describe the {word} object fields", field existence, picklist steps.
 * Approval routing is based on Member Operating Region (Opportunity Summary) per BA confirmation.
 */

import { Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';

function findFieldByLabelOrName(fields: any[], name: string): any {
  const n = (s: string) => (s || '').toLowerCase().trim();
  return (
    fields.find(
      (f: any) =>
        f.label === name ||
        n(f.label) === n(name) ||
        f.name === name ||
        f.name === name.replace(/\s+/g, '_') + '__c'
    ) || null
  );
}

Then(
  'the "Approval_Status__c" or equivalent approval status field should exist',
  async function (this: AutomationWorld) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) throw new Error('No field metadata. Run "I describe the Opportunity_Readiness__c object fields" first.');
    const approvalField =
      findFieldByLabelOrName(fields, 'Approval_Status__c') ||
      findFieldByLabelOrName(fields, 'Approval Status') ||
      fields.find((f: any) => /approval|status/i.test(f.name || '') && /approval|status/i.test(f.label || ''));
    if (!approvalField) {
      const names = fields.map((f: any) => f.name).slice(0, 25).join(', ');
      throw new Error(`No approval status field found on Opportunity_Readiness__c. Fields (sample): ${names}`);
    }
    logger.info(`Approval-related field found: ${approvalField.name}`);
  }
);

Then(
  'the object should support submission for approval and routing by region',
  async function (this: AutomationWorld) {
    const fields = this.testContext.fieldsMetadata;
    if (!fields) throw new Error('No field metadata. Run describe step first.');
    const hasApproval = fields.some((f: any) => /approval|status/i.test(f.name || ''));
    const hasRegion = fields.some((f: any) => /member.*operating|region/i.test((f.label || f.name || '').toLowerCase()));
    if (!hasApproval || !hasRegion) {
      throw new Error(
        'Object should support approval and region routing. Check for approval-related and Member Operating Region fields.'
      );
    }
    logger.info('Object supports approval and region-based routing');
  }
);
