/**
 * PP-393 — DMF submission & tracking (narrative scenarios).
 * Runnable Lloyd's Stage-1 + Dataverse glue lives under `lloyds-pipeline-hops` / PP-391 UI rows.
 * These steps stay **skipped** until `LLOYDS_PP393_DMF_AUTOMATION_ENABLED=1` and contracts are frozen.
 */

import { Given, Then, When } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import { logger } from '../../utils/logger';

function pp393Live(): boolean {
  const v = process.env.LLOYDS_PP393_DMF_AUTOMATION_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

Given(
  /^an XML File has status Ready to Ship to Dynamics following automatic validation per Design Revision$/,
  function (this: AutomationWorld) {
    void this;
    if (!pp393Live()) return 'skipped';
    throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: fixture not yet implemented.');
  },
);

Given(/^an XML File has status Ready to Ship to Dynamics$/, function (this: AutomationWorld) {
  void this;
  if (!pp393Live()) return 'skipped';
  throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: fixture not yet implemented.');
});

Given(/^MuleSoft has submitted the file to a D365 DMF import project successfully$/, function (this: AutomationWorld) {
  void this;
  if (!pp393Live()) return 'skipped';
  throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: fixture not yet implemented.');
});

When(
  /^Dataverse is updated from mule-xml-submission-success or equivalent on queue "mule-d365-import"$/,
  function (this: AutomationWorld) {
    void this;
    if (!pp393Live()) return 'skipped';
    throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
  },
);

Then(/^the Integration File status in Dataverse should be set to Shipped to Dynamics$/, function (this: AutomationWorld) {
  void this;
  if (!pp393Live()) return 'skipped';
  throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
});

Then(
  /^execution details such as job or execution identifiers should be stored per solution design$/,
  function (this: AutomationWorld) {
    void this;
    if (!pp393Live()) return 'skipped';
    throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
  },
);

Then(
  /^the Mule Azure SQL control row for the same CorrelationId should reflect submitted state and dmfExecutionId or equivalent per architecture$/,
  function (this: AutomationWorld) {
    void this;
    if (!pp393Live()) return 'skipped';
    throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
  },
);

Given(/^an XML File reached Ready to Ship to Dynamics via straight-through validation$/, function (this: AutomationWorld) {
  void this;
  if (!pp393Live()) return 'skipped';
  throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
});

When(/^MuleSoft completes a successful DMF import submission for that file$/, function (this: AutomationWorld) {
  void this;
  if (!pp393Live()) return 'skipped';
  throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
});

When(/^the operations user opens the Integration File in Dataverse or Ops app$/, function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then(/^the status reason or status should show Shipped to Dynamics$/, function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then(/^relevant execution details should be visible where the UI exposes them$/, function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then(/^capture screenshot evidence$/, function (this: AutomationWorld) {
  void this;
  logger.info('PP-393: screenshot step — UI automation not wired in this slice.');
  return 'skipped';
});

When(
  /^MuleSoft submits to D365 DMF and the import fails or mule-xml-submission-failed or mule-dmf-processing-failed is raised$/,
  function (this: AutomationWorld) {
    void this;
    if (!pp393Live()) return 'skipped';
    throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: negative path not yet implemented.');
  },
);

Then(
  /^Dataverse should record a non-success status and error or execution detail per design$/,
  function (this: AutomationWorld) {
    void this;
    if (!pp393Live()) return 'skipped';
    throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
  },
);

Then(/^the Dataverse status must not show Shipped to Dynamics$/, function (this: AutomationWorld) {
  void this;
  if (!pp393Live()) return 'skipped';
  throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
});

Then(
  /^the Mule Azure SQL control row should reflect failure or reconcile-required state consistent with the error matrix$/,
  function (this: AutomationWorld) {
    void this;
    if (!pp393Live()) return 'skipped';
    throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
  },
);

Given(/^an XML File was shipped to Dynamics and DMF import completed successfully$/, function (this: AutomationWorld) {
  void this;
  if (!pp393Live()) return 'skipped';
  throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
});

When(
  /^mule-dmf-processing-success is processed on "mule-d365-import" for the correlation$/,
  function (this: AutomationWorld) {
    void this;
    if (!pp393Live()) return 'skipped';
    throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
  },
);

Then(
  /^the Dataverse record should show Ready to Post to Dynamics or the solution equivalent label$/,
  function (this: AutomationWorld) {
    void this;
    if (!pp393Live()) return 'skipped';
    throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
  },
);

Then(/^Mule Azure SQL state should reflect DMF_COMPLETED or equivalent$/, function (this: AutomationWorld) {
  void this;
  if (!pp393Live()) return 'skipped';
  throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
});

Given(/^an XML File was submitted for DMF import$/, function (this: AutomationWorld) {
  void this;
  if (!pp393Live()) return 'skipped';
  throw new Error('LLOYDS_PP393_DMF_AUTOMATION_ENABLED: not yet implemented.');
});

When(/^the import fails$/, function (this: AutomationWorld) {
  void this;
  return 'skipped';
});

Then(
  /^the operations user should see failure indication and enough detail to triage$/,
  function (this: AutomationWorld) {
    void this;
    return 'skipped';
  },
);
