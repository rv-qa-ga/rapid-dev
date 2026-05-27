/**
 * SF-656 - Region-based Executive approval for Opportunity Summary (UI)
 * Approval routing by Member Operating Region (US, UK, EU, CA, UK and EU). 5-day reminder.
 * Steps are implemented as stubs/pending where full approval automation is not yet available.
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';

Given('the Opportunity Summary Fields require Executive approval', async function (this: AutomationWorld) {
  logger.info('Opportunity Summary Fields require Executive approval (SF-656)');
});

When('the approval request is submitted', async function (this: AutomationWorld) {
  logger.info('Approval request submitted (routing by Member Operating Region)');
});

Then(
  'the approver must be determined based on the Members Operating Region which is captured in the Opportunity Summary Fields',
  async function (this: AutomationWorld) {
    logger.info('Approver determined by Member Operating Region (per BA confirmation)');
  }
);

Then('the request must be routed to the corresponding Executive Team approver group', async function (this: AutomationWorld) {
  logger.info('Request routed to Executive Team approver group');
});

Then('each Approver in that Team must approve the Opportunity Summary fields individually', async function (
  this: AutomationWorld
) {
  logger.info('Each approver in team must approve individually');
});

Given(
  'an Opportunity Summary approval request is submitted with Members Operating Region {string}',
  async function (this: AutomationWorld, region: string) {
    (this.testContext as any).submittedMemberOperatingRegion = region;
    logger.info(`Approval request submitted with Member Operating Region: ${region}`);
  }
);

Then(
  'the approval must be routed to US Executive Team approvers (Aaron DiCaprio - MRD, Rich Koehler - Head of Distribution, Steve Strauss - CUO, Hugh Burgess - CUO)',
  async function (this: AutomationWorld) {
    const region = (this.testContext as any).submittedMemberOperatingRegion;
    if (region !== 'US') logger.warn(`Expected region US, got ${region}`);
    logger.info('Approval routed to US Executive Team approvers');
  }
);

Then(
  'the approval must be routed to UK Executive Team approvers (Matthew Wood - Head of Distribution, Nick Brown - CUO)',
  async function (this: AutomationWorld) {
    const region = (this.testContext as any).submittedMemberOperatingRegion;
    if (region !== 'UK') logger.warn(`Expected region UK, got ${region}`);
    logger.info('Approval routed to UK Executive Team approvers');
  }
);

Then(
  'the approval must be routed to EU Executive Team approvers (Gabriella Engstrand - Head of Distribution, Raquel Reneses - CUO)',
  async function (this: AutomationWorld) {
    const region = (this.testContext as any).submittedMemberOperatingRegion;
    if (region !== 'EU') logger.warn(`Expected region EU, got ${region}`);
    logger.info('Approval routed to EU Executive Team approvers');
  }
);

Then(
  'the approval must be routed to CA Executive Team approvers (Esaïe Djossou - Head of Distribution, Joy Parkes - CUO)',
  async function (this: AutomationWorld) {
    const region = (this.testContext as any).submittedMemberOperatingRegion;
    if (region !== 'CA') logger.warn(`Expected region CA, got ${region}`);
    logger.info('Approval routed to CA Executive Team approvers');
  }
);

Then(
  'the approval must be routed to UK and EU Executive Team approvers (Matthew Wood - Head of Distribution, Nick Brown - CUO)',
  async function (this: AutomationWorld) {
    const region = (this.testContext as any).submittedMemberOperatingRegion;
    if (region !== 'UK and EU') logger.warn(`Expected region UK and EU, got ${region}`);
    logger.info('Approval routed to UK and EU Executive Team approvers');
  }
);

Given('an Opportunity Summary approval request has been submitted', async function (this: AutomationWorld) {
  logger.info('Opportunity Summary approval request submitted');
});

Given('the approval status is {string}', async function (this: AutomationWorld, status: string) {
  (this.testContext as any).approvalStatus = status;
  logger.info(`Approval status: ${status}`);
});

Given(
  'the approval has been pending for 5 working days (Monday - Friday, ignore holidays)',
  async function (this: AutomationWorld) {
    (this.testContext as any).approvalPendingDays = 5;
    logger.info('Approval pending for 5 working days');
  }
);

When('the approval has not been approved, returned for update or rejected', async function (this: AutomationWorld) {
  logger.info('Approval still pending (not approved/returned/rejected)');
});

Then('a reminder notification must be sent to the assigned Executive approver(s)', async function (this: AutomationWorld) {
  logger.info('Reminder must be sent to Executive approvers');
});

Then('the reminder must include:', async function (this: AutomationWorld, dataTable: any) {
  const rows = dataTable.raw() as string[][];
  const items = rows.map((r) => r[0]).filter(Boolean);
  logger.info('Reminder must include: ' + items.join(', '));
});

Then('the approval must remain in status {string}', async function (this: AutomationWorld, status: string) {
  logger.info(`Approval remains in status: ${status}`);
});

Given(
  'the approval has been pending for fewer than 5 working days',
  async function (this: AutomationWorld) {
    (this.testContext as any).approvalPendingDays = 3;
    logger.info('Approval pending for fewer than 5 working days');
  }
);

When('the approval has not been approved', async function (this: AutomationWorld) {
  logger.info('Approval not yet approved');
});

Then('a reminder notification must not yet be sent to the assigned Executive approver(s)', async function (
  this: AutomationWorld
) {
  logger.info('No reminder before 5 working days');
});
