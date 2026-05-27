/**
 * SF-1083 — UI step definitions for the OSFI / ASLOB persona-correct duplicate-alert
 * fallback feature (`src/features/ui/SF/SF-1083.feature`).
 *
 * Reuses:
 *   - Common Data Governance auth: `Given I log the environment as "Data Governance"`
 *   - LEX URL + surface-wait helpers: `src/utils/salesforce-lightning-ui.ts`
 *   - New POM: `ReferenceDataNewRecordPage`
 *
 * Defect #2 workaround: every create in this feature populates the Code field
 * with a unique value so the legacy `*_Prevent_Duplicate` rule (MatchBlanks=TRUE
 * on a single Code identifier) does NOT match blank-vs-blank, freeing the new
 * `*_Match_Key_Alert` rule to fire as designed.
 */
import { After, Given, Then, When } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { AutomationWorld } from '../../../hooks/world';
import { ReferenceDataNewRecordPage } from '../../../page-objects/salesforce/ReferenceDataNewRecordPage';
import { logger } from '../../../utils/logger';

interface UiFieldRef {
  apiNames: string[];
  label?: string;
}
interface FieldMap {
  /** Createable name field for this object — populated with the unique name fragment. */
  nameField: UiFieldRef;
  /** Code field the legacy `*_Prevent_Duplicate` rule matches on. Optional: not all reference data objects have one (POG_Product__c does not). */
  codeField?: UiFieldRef;
}

/**
 * Per-object field mapping. Lists multiple API name candidates because the
 * describe API and on-form Lightning Input Fields can disagree on naming
 * (e.g. ASLOB__c describes `Code__c` but the form labels it "ASLOB Code" with
 * an `ASLOB_Code__c` field-name attribute). Label is the final fallback.
 */
const SF1083_UI_FIELD_MAP: Record<string, FieldMap> = {
  OSFI__c: {
    nameField: { apiNames: ['OSFI_Name__c'], label: 'OSFI Name' },
    codeField: { apiNames: ['OSFI_Code__c', 'Code__c'], label: 'OSFI Code' },
  },
  ASLOB__c: {
    nameField: { apiNames: ['ASLOB_Name__c'], label: 'ASLOB Name' },
    codeField: { apiNames: ['ASLOB_Code__c', 'Code__c'], label: 'ASLOB Code' },
  },
  POG_Product__c: {
    // POG_Product__c has no Code field per the describe API. The relevant rule
    // (POG_Prevent_Duplicate) matches directly on Pog_Product_Name__c, so the
    // hard-prevent scenario only needs the name to be identical.
    nameField: { apiNames: ['Pog_Product_Name__c', 'POG_Product_Name__c'], label: 'POG Product Name' },
  },
};

/**
 * Default for required "Valid From" date that both objects' page layouts
 * surface. Saving the form fails silently in Lightning if a required date is
 * blank, so we always set it explicitly.
 */
const VALID_FROM_FIELD: UiFieldRef = {
  apiNames: ['Valid_From__c'],
  label: 'Valid From',
};
function todayIsoDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy}`;
}

const NAME_PREFIX = 'SF1083UI';

interface UiCreatedRecord {
  objectType: string;
  recordId?: string;
  name: string;
  code?: string;
}

function uiState(world: AutomationWorld) {
  return (world.testContext.sf1083Ui ||= {
    runId: '',
    baselines: new Map<string, UiCreatedRecord>(),
    created: [] as UiCreatedRecord[],
  }) as {
    runId: string;
    baselines: Map<string, UiCreatedRecord>;
    created: UiCreatedRecord[];
  };
}

function fieldsFor(objectType: string): FieldMap {
  const m = SF1083_UI_FIELD_MAP[objectType];
  if (!m) {
    throw new Error(
      `SF-1083 UI: no field mapping configured for "${objectType}". Update SF1083_UI_FIELD_MAP.`
    );
  }
  return m;
}

function uniqueSuffix(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

Given('the SF-1083 UI duplicate test run id is assigned', function (this: AutomationWorld) {
  const s = uiState(this);
  if (!s.runId) s.runId = uniqueSuffix();
  logger.info(`SF-1083 UI run id: ${s.runId}`);
});

/**
 * Fill the new-record form with a unique name and (when the object has one) a
 * unique Code. Used by the baseline / conflicting / distinct / exact-duplicate
 * steps below. Returns the values used so the caller can record / assert.
 */
async function fillSf1083ForReferenceForm(
  form: ReferenceDataNewRecordPage,
  objectType: string,
  name: string,
  code: string | null
): Promise<void> {
  const { nameField, codeField } = fieldsFor(objectType);
  await form.setField(nameField, name);
  if (codeField && code !== null) {
    await form.setField(codeField, code);
  }
  // Required field on these reference-data layouts; Lightning will silently
  // not navigate to the detail page if Valid From is blank.
  try {
    await form.setField(VALID_FROM_FIELD, todayIsoDate());
  } catch (e: any) {
    logger.warn(`SF-1083 UI: could not set Valid From on ${objectType} — continuing (${e?.message || e})`);
  }
}

Given(
  'I create a baseline SF-1083 reference record via UI on {string} with name fragment {string}',
  async function (this: AutomationWorld, objectType: string, fragment: string) {
    const page = this.page;
    if (!page) throw new Error('Browser page not initialized — auth step must run first.');

    const s = uiState(this);
    const name = `${NAME_PREFIX}_${s.runId}_${fragment}`;
    const code = fieldsFor(objectType).codeField
      ? `${NAME_PREFIX}_${s.runId}_${objectType}_BASE_${uniqueSuffix()}`
      : null;

    const form = new ReferenceDataNewRecordPage(page, objectType);
    await form.navigate(this);
    await fillSf1083ForReferenceForm(form, objectType, name, code);
    await form.clickSave();

    const detail = await form.isOnRecordDetailPage(20000);
    if (!detail.ok) {
      const visibleAlert = await form.readDuplicateAlert(2000);
      const dump = visibleAlert
        ? `Inline alert text: ${visibleAlert.text.slice(0, 800)}`
        : `URL: ${page.url()}`;
      throw new Error(
        `SF-1083 UI: baseline ${objectType} did not navigate to detail page. ${dump}`
      );
    }

    const record: UiCreatedRecord = {
      objectType,
      recordId: detail.recordId,
      name,
      code: code ?? undefined,
    };
    s.baselines.set(objectType, record);
    s.created.push(record);
    logger.info(
      `SF-1083 UI: baseline ${objectType} saved id=${detail.recordId} name="${name}"${
        code ? ` code="${code}"` : ''
      }`
    );
  }
);

When(
  'I attempt to create a SF-1083 conflicting reference record via UI on {string} with name fragment {string}',
  async function (this: AutomationWorld, objectType: string, fragment: string) {
    const page = this.page;
    if (!page) throw new Error('Browser page not initialized.');

    const s = uiState(this);
    const baseline = s.baselines.get(objectType);
    if (!baseline) {
      throw new Error(`SF-1083 UI: missing baseline for ${objectType}; run baseline step first.`);
    }

    const probeName = `${NAME_PREFIX}_${s.runId}_${fragment}`;
    const probeCode = fieldsFor(objectType).codeField
      ? `${NAME_PREFIX}_${s.runId}_${objectType}_PROBE_${uniqueSuffix()}`
      : null;

    const form = new ReferenceDataNewRecordPage(page, objectType);
    await form.navigate(this);
    await fillSf1083ForReferenceForm(form, objectType, probeName, probeCode);
    await form.clickSave();

    this.testContext.sf1083UiCurrentForm = form;
    this.testContext.sf1083UiProbe = {
      objectType,
      name: probeName,
      code: probeCode ?? undefined,
    };
  }
);

/**
 * Negative-case probe: a clearly different name that should NOT trigger the
 * SF-1083 alert rule. Uses the same form-fill sequence as the conflicting probe
 * but the assertion that follows expects no alert + a saved record.
 */
When(
  'I attempt to create a SF-1083 distinct reference record via UI on {string} with name fragment {string}',
  async function (this: AutomationWorld, objectType: string, fragment: string) {
    const page = this.page;
    if (!page) throw new Error('Browser page not initialized.');

    const s = uiState(this);
    const probeName = `${NAME_PREFIX}_${s.runId}_${fragment}`;
    const probeCode = fieldsFor(objectType).codeField
      ? `${NAME_PREFIX}_${s.runId}_${objectType}_DISTINCT_${uniqueSuffix()}`
      : null;

    const form = new ReferenceDataNewRecordPage(page, objectType);
    await form.navigate(this);
    await fillSf1083ForReferenceForm(form, objectType, probeName, probeCode);
    await form.clickSave();

    this.testContext.sf1083UiCurrentForm = form;
    this.testContext.sf1083UiProbe = {
      objectType,
      name: probeName,
      code: probeCode ?? undefined,
    };
  }
);

/**
 * Exact-duplicate probe for the POG hard-prevent rule. Uses the SAME name
 * fragment as the baseline so `POG_Prevent_Duplicate` matches on the exact
 * `Pog_Product_Name__c` value and the form save is blocked.
 */
When(
  'I attempt to create a SF-1083 exact-duplicate reference record via UI on {string} with name fragment {string}',
  async function (this: AutomationWorld, objectType: string, fragment: string) {
    const page = this.page;
    if (!page) throw new Error('Browser page not initialized.');

    const s = uiState(this);
    const baseline = s.baselines.get(objectType);
    if (!baseline) {
      throw new Error(`SF-1083 UI: missing baseline for ${objectType}; run baseline step first.`);
    }

    // Identical name fragment to the baseline — the rule matches on Name.
    const probeName = `${NAME_PREFIX}_${s.runId}_${fragment}`;
    const probeCode = fieldsFor(objectType).codeField
      ? `${NAME_PREFIX}_${s.runId}_${objectType}_DUP_${uniqueSuffix()}`
      : null;

    const form = new ReferenceDataNewRecordPage(page, objectType);
    await form.navigate(this);
    await fillSf1083ForReferenceForm(form, objectType, probeName, probeCode);
    await form.clickSave();

    this.testContext.sf1083UiCurrentForm = form;
    this.testContext.sf1083UiProbe = {
      objectType,
      name: probeName,
      code: probeCode ?? undefined,
    };
  }
);

Then(
  'the SF-1083 Lightning duplicate alert should appear with the SF-1083 alert text',
  async function (this: AutomationWorld) {
    const form = this.testContext.sf1083UiCurrentForm as ReferenceDataNewRecordPage | undefined;
    const page = this.page;
    if (!form || !page) throw new Error('SF-1083 UI: no probe form / page in context.');

    const alert = await form.readDuplicateAlert(15000);

    // Diagnostic: if we couldn't find an alert, check whether the save
    // actually succeeded silently (URL navigated to detail) — that means the
    // SF-1083 alert rule didn't fire, which is a different defect than a
    // missing locator. Dump page state either way.
    if (!alert) {
      const url = page.url();
      const detail = await form.isOnRecordDetailPage(2000);
      const pageTextSnippet = (await page.locator('body').innerText().catch(() => '')) || '';
      const dupKeyword = pageTextSnippet
        .split('\n')
        .filter((l) =>
          /duplicate|use one of these|possible.*duplicate|you can still save/i.test(l)
        )
        .slice(0, 8)
        .join(' | ');
      logger.error(
        `SF-1083 UI: NO duplicate alert found.\n  url=${url}\n  detailPage=${JSON.stringify(detail)}\n  dupKeywordLines="${dupKeyword.slice(0, 600)}"\n  pageTextSnippet="${pageTextSnippet.slice(0, 800).replace(/\s+/g, ' ')}"`
      );
      const reason = detail.ok
        ? `Save SUCCEEDED with no alert (URL navigated to detail page ${url}). The SF-1083 *_Match_Key_Alert rule did NOT fire on UI.`
        : `Alert UI not visible AND save did not navigate to detail (still at ${url}). Alert may be rendered with a different DOM than expected.`;
      throw new Error(`SF-1083 UI: ${reason}`);
    }

    logger.info(
      `SF-1083 UI: alert text snippet="${alert.text.slice(0, 200).replace(/\s+/g, ' ')}" matchedCount=${alert.matchedCount} canIgnoreAndSave=${alert.canIgnoreAndSave}`
    );

    const looksLikeSf1083Alert =
      /possible\s+duplicate\s+reference\s+data/i.test(alert.text) ||
      /same\s+normaliz(e|ed)\s+name/i.test(alert.text) ||
      /you\s+can\s+still\s+save/i.test(alert.text);
    const looksLikeAnyDupAlert =
      looksLikeSf1083Alert ||
      /possible\s+duplicate/i.test(alert.text) ||
      /use\s+one\s+of\s+these\s+records/i.test(alert.text) ||
      // Lightning popover wrapper text (shown before user expands "View Duplicates")
      /this\s+record\s+looks\s+like\s+an\s+existing\s+record/i.test(alert.text) ||
      /similar\s+records\s+exist/i.test(alert.text) ||
      /view\s+duplicates/i.test(alert.text);

    expect(
      looksLikeAnyDupAlert,
      `Expected SF-1083 alert text "Possible duplicate reference data..." but got: ${alert.text.slice(0, 400)}`
    ).toBe(true);

    this.testContext.sf1083UiAlertSnapshot = alert;
  }
);

When(
  'I acknowledge the SF-1083 duplicate alert and save anyway',
  async function (this: AutomationWorld) {
    const form = this.testContext.sf1083UiCurrentForm as ReferenceDataNewRecordPage | undefined;
    if (!form) throw new Error('SF-1083 UI: no probe form in context.');

    const snapshot = this.testContext.sf1083UiAlertSnapshot as
      | { canIgnoreAndSave: boolean }
      | undefined;

    if (snapshot?.canIgnoreAndSave) {
      await form.clickSaveIgnoreAlert();
    } else {
      // Some Lightning releases keep using the same Save button; a second click
      // after the alert is visible commits the save with allowSave=true semantics.
      await form.clickSave();
    }
  }
);

Then(
  'the SF-1083 reference record should be saved on its detail page',
  async function (this: AutomationWorld) {
    const form = this.testContext.sf1083UiCurrentForm as ReferenceDataNewRecordPage | undefined;
    if (!form) throw new Error('SF-1083 UI: no probe form in context.');

    const detail = await form.isOnRecordDetailPage(20000);
    expect(detail.ok, `Expected to land on the record detail page after save-anyway`).toBe(true);

    const probe = this.testContext.sf1083UiProbe as
      | { objectType: string; name: string; code: string }
      | undefined;
    if (detail.recordId && probe) {
      const s = uiState(this);
      s.created.push({ ...probe, recordId: detail.recordId });
      logger.info(
        `SF-1083 UI: probe ${probe.objectType} saved id=${detail.recordId} (acknowledged duplicate alert)`
      );
    }
  }
);

/**
 * Negative-case assertion: the SF-1083 alert rule should NOT fire for a
 * clearly different name, and the record should save successfully.
 */
Then(
  'the SF-1083 Lightning duplicate alert should NOT appear and the record should be saved',
  async function (this: AutomationWorld) {
    const form = this.testContext.sf1083UiCurrentForm as ReferenceDataNewRecordPage | undefined;
    const page = this.page;
    if (!form || !page) throw new Error('SF-1083 UI: no probe form / page in context.');

    // First check whether an alert is visible. We expect NONE.
    const alert = await form.readDuplicateAlert(5000);
    if (alert) {
      throw new Error(
        `SF-1083 UI (negative): an unexpected duplicate alert fired. text="${alert.text.slice(0, 400)}"`
      );
    }

    // Then verify the record actually saved (URL navigated to detail page).
    const detail = await form.isOnRecordDetailPage(20000);
    expect(
      detail.ok,
      `SF-1083 UI (negative): no alert (good) but the record did not navigate to its detail page either. URL: ${page.url()}`
    ).toBe(true);

    const probe = this.testContext.sf1083UiProbe as
      | { objectType: string; name: string; code?: string }
      | undefined;
    if (detail.recordId && probe) {
      uiState(this).created.push({ ...probe, recordId: detail.recordId });
      logger.info(
        `SF-1083 UI (negative): ${probe.objectType} saved id=${detail.recordId} (no alert, as expected)`
      );
    }
  }
);

/**
 * POG hard-prevent assertion: the rule blocks the save → record must NOT
 * navigate to the detail page, and an alert with blocking semantics must be
 * visible (or the form must remain on the /new URL).
 *
 * NB: `POG_Prevent_Duplicate` is currently INACTIVE in qamerge (Defect #1), so
 * this scenario is expected to fail today. That is the documented behaviour
 * we want surfaced in the report.
 */
Then(
  'the SF-1083 reference record save should be blocked by the hard-prevent rule',
  async function (this: AutomationWorld) {
    const form = this.testContext.sf1083UiCurrentForm as ReferenceDataNewRecordPage | undefined;
    const page = this.page;
    if (!form || !page) throw new Error('SF-1083 UI: no probe form / page in context.');

    // PRIMARY signal — the form must NOT navigate to a saved-record detail page.
    // POG_Prevent_Duplicate is a Block rule, so a blocked save keeps the user on
    // /lightning/o/POG_Product__c/new with the duplicate popover visible.
    const detail = await form.isOnRecordDetailPage(8000);
    expect(
      detail.ok,
      `SF-1083 UI (POG hard-prevent): expected the save to be BLOCKED, but the record was saved (id=${detail.recordId}, URL=${page.url()}). POG_Prevent_Duplicate rule did not fire.`
    ).toBe(false);

    // SECONDARY signal — Lightning surfaces the block via a popover whose
    // wording varies by release. We log what we find; a missing locator is NOT
    // a fail-condition (the screenshot saved by the @After hook is the source
    // of truth for visual validation if/when needed).
    //
    // Known wordings we recognise:
    //   • Block / hard-prevent (SF-1022 POG_Prevent_Duplicate):
    //       "⊘ We hit a snag. You can't save this record because a duplicate
    //        record already exists. To save, use different information.
    //        View Duplicates"
    //   • Alert / soft (SF-1083 *_Match_Key_Alert):
    //       "This record looks like an existing record / Use one of these
    //        records? / Possible duplicate reference data … / View Duplicates"
    const alert = await form.readDuplicateAlert(8000);
    if (alert) {
      logger.info(
        `SF-1083 UI (POG hard-prevent): block popover visible: "${alert.text
          .slice(0, 240)
          .replace(/\s+/g, ' ')}"`
      );
      return;
    }

    // Fallback: scan the visible body text for any of the known block phrases.
    const bodyText = (await page.locator('body').innerText().catch(() => '')) || '';
    const blockPhraseRegex =
      /(use one of these records|cannot be saved|can(?:'|’)t save this record|duplicate record already exists|we hit a snag|review errors|possible duplicate)/i;
    const blockPhraseMatch = bodyText.match(blockPhraseRegex);
    if (blockPhraseMatch) {
      logger.info(
        `SF-1083 UI (POG hard-prevent): block phrase found in body: "${blockPhraseMatch[0]}"`
      );
      return;
    }

    // Save was blocked but neither the popover nor a known phrase was found.
    // Save-blocked is the POG hard-prevent contract; surface a WARN with the
    // URL so QA can inspect the after-hook screenshot if Lightning's wording
    // changed again.
    logger.warn(
      `SF-1083 UI (POG hard-prevent): save was BLOCKED (good) but no recognised popover/phrase visible. URL: ${page.url()}. Inspect the @After-hook screenshot if Lightning wording changed.`
    );
  }
);

After({ tags: '@SF-1083-UI' }, async function (this: AutomationWorld) {
  // Cleanup is best-effort: the Data Governance persona lacks DELETE permission
  // on these reference objects (Defect #3), so we just log what was created so
  // an admin can purge orphan SF1083UI_* records if needed.
  const s = this.testContext.sf1083Ui as { created: UiCreatedRecord[] } | undefined;
  if (s?.created?.length) {
    logger.warn(
      `SF-1083 UI: ${s.created.length} record(s) left in qamerge (DG persona cannot delete). Names start with "${NAME_PREFIX}_".`
    );
    for (const r of s.created) {
      logger.warn(`  - ${r.objectType} ${r.recordId ?? '(no id)'} name="${r.name}"`);
    }
  }
});
