import { Given } from '@cucumber/cucumber';

/**
 * Explicit failures for Fabric portal / DLQ / audit / blob UI until dedicated automation
 * exists. Scenarios using these steps are tagged `@wip` so default `not @wip` runs skip them;
 * when you intentionally include `@wip`, these steps surface a clear NOT_AUTOMATED error.
 */
Given('the PP-391 UI-only scenario {string} is not yet automated', function (id: string) {
  throw new Error(
    `NOT_AUTOMATED:${id} — Blob portal, Mule UI, Service Bus Explorer, or audit timeline (add Playwright/CLI or drop @wip when ready).`,
  );
});

Given('the PP-392 Fabric validation scenario {string} is not yet automated against dbo.dimensionattributevaluecombination', function (id: string) {
  throw new Error(
    `NOT_AUTOMATED:${id} — Fabric mirrored warehouse SQL against dbo.dimensionattributevaluecombination (see docs/lloyds/PP-392-Feature File.docx.extracted.txt).`,
  );
});

Given('the PP-395 scenario {string} is not yet automated', function (id: string) {
  throw new Error(
    `NOT_AUTOMATED:${id} — PP-395 journal posting monitor: F&O Silver / LedgerJournalTable, Dataverse D365_* summary fields, ` +
      'dv-journal-posting queue payloads, SLA breach handling (see Jira PP-395 + docs/lloyds/SKILL.md Stage 4).',
  );
});

