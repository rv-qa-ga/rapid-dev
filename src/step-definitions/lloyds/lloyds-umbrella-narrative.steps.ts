/**
 * Lloyd's umbrella (`lloyds-pipeline.feature`) §D–§H narrative steps.
 *
 * Live DMF / posting / peek contracts are still programme-gated (ENG-270, RBAC, peek policy).
 * These definitions exist so scenarios can drop `@wip` later without "undefined step" failures;
 * today each step returns **skipped** unless an explicit opt-in env is set.
 */

import { DataTable, Given, Then, When } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';
import { logger } from '../../utils/logger';
import { SqlServerClient } from '../../sqlserver/client/SqlServerClient';

function liveDmfEnabled(): boolean {
  const v = process.env.LLOYDS_LIVE_DMF_AUTOMATION_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function livePostingEnabled(): boolean {
  const v = process.env.LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function liveE2eTraceEnabled(): boolean {
  const v = process.env.LLOYDS_E2E_TRACE_AUTOMATION_ENABLED?.trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

function eng44SqlEnabled(): boolean {
  return Boolean(process.env.LLOYDS_ENG44_EXCLUSION_SQL?.trim());
}

// --- §D DMF -----------------------------------------------------------------

Given(
  /^`dv-xml-approval-success` was published for correlation id "<correlation_id>"$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: concrete correlation binding not yet implemented.');
  },
);

When(
  /^Mule runs the 5-phase DMF handshake and publishes `mule-xml-submission-success` on `mule-d365-import`$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: Mule DMF handshake simulation not yet implemented.');
  },
);

Then(/^the Dataverse XML record's status should flip to "Shipped to Dynamics"$/, function (this: AutomationWorld) {
  void this;
  if (!liveDmfEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: Dataverse shipped status assert not yet implemented.');
});

Then(
  /^Mule's Azure SQL `PROCESS_TRACKER` should advance to `DMF_SUBMITTING \/ RUNNING`$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: PROCESS_TRACKER stage assert not yet implemented.');
  },
);

When(
  /^Mule publishes `mule-dmf-import-failed` on `mule-d365-import` for correlation id "<correlation_id>"$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: failure path not yet implemented.');
  },
);

Then(/^the Dataverse record status should reflect "Failed to Import to Dynamics"$/, function (this: AutomationWorld) {
  void this;
  if (!liveDmfEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: failure status assert not yet implemented.');
});

Then(/^an `ERROR_LOG` entry should exist with the same correlation id$/, function (this: AutomationWorld) {
  void this;
  if (!liveDmfEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: ERROR_LOG assert not yet implemented.');
});

When(
  /^Mule publishes `mule-dmf-processing-success` on `mule-d365-import`$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: processing success path not yet implemented.');
  },
);

Then(/^the Dataverse record status should reflect "Ready to Post to Dynamics"$/, function (this: AutomationWorld) {
  void this;
  if (!liveDmfEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: ready-to-post assert not yet implemented.');
});

// --- §E Posting -------------------------------------------------------------

Given(/^Ops have posted the journal in D365 F&O$/, function (this: AutomationWorld) {
  void this;
  if (!livePostingEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED: not yet implemented.');
});

When(
  /^the Journal Posting Confirmation Service publishes `dv-journal-posting-success` on `dv-d365-journalposting`$/,
  function (this: AutomationWorld) {
    void this;
    if (!livePostingEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED: not yet implemented.');
  },
);

Then(/^Mule's Azure SQL state for the correlation id should become `POSTED`$/, function (this: AutomationWorld) {
  void this;
  if (!livePostingEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED: not yet implemented.');
});

Then(/^the ADP repo file should reach status `WORK_ITEM_COMPLETE`$/, function (this: AutomationWorld) {
  void this;
  if (!livePostingEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED: not yet implemented.');
});

When(/^`dv-journal-posting-failed` is published on `dv-d365-journalposting`$/, function (this: AutomationWorld) {
  void this;
  if (!livePostingEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED: not yet implemented.');
});

Then(/^Mule should set the state to `POSTING_FAILED`$/, function (this: AutomationWorld) {
  void this;
  if (!livePostingEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED: not yet implemented.');
});

Then(
  /^a ServiceNow incident should be raised keyed by `PROCESS_ID` \+ `ERROR_ID`$/,
  function (this: AutomationWorld) {
    void this;
    if (!livePostingEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED: ServiceNow assert not yet implemented.');
  },
);

// --- §F Tagetik + Stage 5 ADP (remaining narrative) -------------------------
// Programme: Tagetik/TDS visibility is tied to Stage 4 posting + Mule consuming
// dv-journal-posting-*. mule-dependantproduct → ADP is independent — scenarios in
// lloyds-pipeline.feature must not imply Tagetik rows appear only after dependent product messages.

Given(/^Stage 4 reached `POSTED` for correlation id "<correlation_id>"$/, function (this: AutomationWorld) {
  void this;
  if (!livePostingEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED: Stage 4 anchor not yet implemented.');
});

When(
  /^Mule publishes `mule-dependentproduct-success` on `mule-dependantproduct`$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: dependent product hop not yet implemented.');
  },
);

Then(/^the `correlation_id` should match the Stage 1 correlation$/, function (this: AutomationWorld) {
  void this;
  if (!liveDmfEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: correlation match assert not yet implemented.');
});

Then(
  /^a Tagetik row with the same `_ACCEL_UNIQUE_RUN_ID` should be visible in `FOWT__TAGETIK_V1`$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: Tagetik correlation assert not yet implemented.');
  },
);

Given(/^the latest Tagetik row set for repo "<repo>"$/, function (this: AutomationWorld) {
  void this;
  if (!liveDmfEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: Tagetik row set fixture not yet implemented.');
});

When(
  /^I aggregate DEBIT_AMOUNT \/ CREDIT_AMOUNT by category \(PRM \/ COM \/ COI \/ TAX \/ OTH\)$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: Tagetik aggregate step not yet implemented.');
  },
);

Then(
  /^each aggregate should match `FOWD__AGENCY_POLICY_FO_SUMMARY_V1`'s `TOTAL_\*_AMOUNT` within ABS tolerance 5$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: Tagetik vs summary reconcile not yet implemented.');
  },
);

Given(/^a correlation id that hit `POSTING_FAILED` in Stage 4$/, function (this: AutomationWorld) {
  void this;
  if (!livePostingEnabled()) return 'skipped';
  throw new Error('LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED: negative Tagetik fixture not yet implemented.');
});

Then(
  /^`FOWT__TAGETIK_V1` should have no new rows tagged with that run id$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: negative Tagetik assert not yet implemented.');
  },
);

Then(
  /^`mule-dependentproduct-failed` should have been published on `mule-dependantproduct`$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveDmfEnabled()) return 'skipped';
    throw new Error('LLOYDS_LIVE_DMF_AUTOMATION_ENABLED: dependent product failed message assert not yet implemented.');
  },
);

// --- §G ENG-44 --------------------------------------------------------------

Given(/^ADP-side filters are in place to prevent Lloyd.s data from flowing into VIPR \/ Non-Lloyd.s tables$/, function (this: AutomationWorld) {
  void this;
  logger.info('ENG-44: assuming programme filters — supply LLOYDS_ENG44_EXCLUSION_SQL to run a read-only probe.');
});

When(
  /^I query Non-Lloyd.s ODS \/ TDS destinations for any `REPOSITORY_ID` in the Lloyd.s Agency cohort$/,
  async function (this: AutomationWorld) {
    void this;
    if (!eng44SqlEnabled()) {
      logger.warn('ENG-44: set LLOYDS_ENG44_EXCLUSION_SQL (single SELECT returning rows = violation) to run.');
      return 'skipped';
    }
    const sql = process.env.LLOYDS_ENG44_EXCLUSION_SQL!.trim();
    const client = new SqlServerClient();
    try {
      const res = await client.queryMany<Record<string, unknown>>(sql, {});
      this.testContext.lloydsEng44LastCount = res.recordset.length;
    } finally {
      await client.close();
    }
  },
);

Then(/^no rows should be returned$/, function (this: AutomationWorld) {
  if (!eng44SqlEnabled()) {
    return 'skipped';
  }
  const n = this.testContext.lloydsEng44LastCount as number | undefined;
  if (typeof n !== 'number') throw new Error('ENG-44: missing query result — run the When step first.');
  if (n !== 0) {
    throw new Error(`ENG-44 exclusion probe returned ${n} row(s) — expected zero.`);
  }
});

When(/^I query ResQ \/ DCR destinations for any Lloyd's cohort repository id$/, async function (this: AutomationWorld) {
  void this;
  const sql = process.env.LLOYDS_ENG44_RESQ_SQL?.trim();
  if (!sql) {
    logger.warn('ENG-44: set LLOYDS_ENG44_RESQ_SQL to run ResQ/DCR probe.');
    return 'skipped';
  }
  const client = new SqlServerClient();
  try {
    const res = await client.queryMany<Record<string, unknown>>(sql, {});
    this.testContext.lloydsEng44ResqCount = res.recordset.length;
  } finally {
    await client.close();
  }
});

Then(/^no matching rows should be returned$/, function (this: AutomationWorld) {
  const n = this.testContext.lloydsEng44ResqCount as number | undefined;
  if (typeof n !== 'number') {
    return 'skipped';
  }
  if (n !== 0) {
    throw new Error(`ENG-44 ResQ/DCR probe returned ${n} row(s) — expected zero.`);
  }
});

// --- §H E2E trace -----------------------------------------------------------

Given(
  /^a real `mule-xml-generation-success` message observed on `mule-xml-generation`$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveE2eTraceEnabled()) return 'skipped';
    throw new Error('LLOYDS_E2E_TRACE_AUTOMATION_ENABLED: queue peek trace not yet implemented.');
  },
);

When(
  /^I pin its "correlation_id", "file_name", "blob_id" and "_ACCEL_UNIQUE_RUN_ID" \(derivable from Mule's upstream read\)$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveE2eTraceEnabled()) return 'skipped';
    throw new Error('LLOYDS_E2E_TRACE_AUTOMATION_ENABLED: not yet implemented.');
  },
);

Then('the following end-to-end checks should all pass', function (this: AutomationWorld, _table: DataTable) {
  void _table;
  if (!liveE2eTraceEnabled()) return 'skipped';
  throw new Error('LLOYDS_E2E_TRACE_AUTOMATION_ENABLED: not yet implemented.');
});

Given(/^a real Mule run that failed at any stage$/, function (this: AutomationWorld) {
  void this;
  if (!liveE2eTraceEnabled()) return 'skipped';
  throw new Error('LLOYDS_E2E_TRACE_AUTOMATION_ENABLED: failure trace not yet implemented.');
});

Then(
  /^the same correlation id should appear on at least one of: DLQ, `ERROR_LOG`, ServiceNow ticket, Dataverse status label$/,
  function (this: AutomationWorld) {
    void this;
    if (!liveE2eTraceEnabled()) return 'skipped';
    throw new Error('LLOYDS_E2E_TRACE_AUTOMATION_ENABLED: observability bundle assert not yet implemented.');
  },
);
