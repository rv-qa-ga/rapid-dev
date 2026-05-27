/**
 * ============================================================================
 * Reference Data New-Record Page (SF-1083)
 * ============================================================================
 *
 * POM for the Salesforce Lightning new-record form for any reference-data
 * custom object covered by SF-1083 (OSFI__c, ASLOB__c, etc.). Encapsulates:
 *   - navigation to /lightning/o/<obj>/new
 *   - filling the createable name + Code fields by API name (so the same POM
 *     works regardless of the human-readable label per object)
 *   - clicking Save
 *   - reading the Lightning duplicate-alert message rendered by SF-1083's
 *     `<Object>_Match_Key_Alert` rule (or the legacy `*_Prevent_Duplicate`)
 *   - clicking "Save (Ignore Alert)" to acknowledge an Allow rule
 *   - confirming the record-detail page after a successful save
 *
 * Selectors are layered (multi-locator + text fallback) because Salesforce
 * Lightning structure varies slightly across releases and per-object layouts.
 * ============================================================================
 */
import type { Locator, Page } from '@playwright/test';
import { logger } from '../../utils/logger';
import { getLightningBaseUrl, waitForLightningSurface } from '../../utils/salesforce-lightning-ui';
import type { AutomationWorld } from '../../hooks/world';

export interface DuplicateAlertSnapshot {
  /** Full visible alert text (best-effort; may concatenate matched-record summaries). */
  text: string;
  /** Number of matched records the alert advertises (parsed from text). 0 if not visible. */
  matchedCount: number;
  /** Names of matched records as displayed in the alert (may be empty if Lightning doesn't list them). */
  matchedNames: string[];
  /** True if the alert offers a "Save (Ignore Alert)" / "Save anyway" affordance (Allow rule). */
  canIgnoreAndSave: boolean;
}

export class ReferenceDataNewRecordPage {
  constructor(
    private readonly page: Page,
    private readonly objectApiName: string
  ) {}

  /** Navigate to /lightning/o/<obj>/new and wait for the LEX form surface. */
  async navigate(world: AutomationWorld): Promise<void> {
    const base = getLightningBaseUrl(world);
    const url = `${base}/lightning/o/${encodeURIComponent(this.objectApiName)}/new`;
    logger.info(`SF-1083 UI: navigating to ${url}`);
    await this.page.goto(url, { waitUntil: 'load', timeout: 90000 });
    await waitForLightningSurface(this.page);
    await this.formContainer().waitFor({ state: 'visible', timeout: 30000 });
  }

  /**
   * Set the value for a field. Accepts a single API name or an object with
   * multiple candidate API names plus a UI label fallback. Layered locator
   * strategy: API name attributes → label-based → debug dump.
   */
  async setField(
    fieldRef: string | { apiNames: string[]; label?: string },
    value: string
  ): Promise<void> {
    const apiNames =
      typeof fieldRef === 'string' ? [fieldRef] : fieldRef.apiNames.filter(Boolean);
    const label = typeof fieldRef === 'string' ? undefined : fieldRef.label;

    for (const apiName of apiNames) {
      const candidates: Locator[] = [
        this.page.locator(`lightning-input-field[field-name="${apiName}"] input`).first(),
        this.page.locator(`lightning-input-field[data-field-name="${apiName}"] input`).first(),
        this.page.locator(`lightning-input-field[field-name="${apiName}"] textarea`).first(),
        this.page.locator(`[data-field="${apiName}"] input`).first(),
        this.page.locator(`[data-target-selection-name*="${apiName}"] input`).first(),
        this.page.locator(`input[name="${apiName}"]`).first(),
      ];
      for (const loc of candidates) {
        if (await loc.isVisible({ timeout: 1500 }).catch(() => false)) {
          await loc.fill('');
          await loc.fill(value);
          logger.info(
            `SF-1083 UI: set ${this.objectApiName}.${apiName} = ${JSON.stringify(value)} (by api name)`
          );
          return;
        }
      }
    }

    if (label) {
      const labelCandidates: Locator[] = [
        this.page.getByLabel(label, { exact: true }).first(),
        this.page.getByLabel(label, { exact: false }).first(),
        this.page
          .locator(`lightning-input-field`)
          .filter({ hasText: label })
          .locator('input, textarea')
          .first(),
      ];
      for (const loc of labelCandidates) {
        if (await loc.isVisible({ timeout: 2000 }).catch(() => false)) {
          await loc.fill('');
          await loc.fill(value);
          logger.info(
            `SF-1083 UI: set ${this.objectApiName} field by label "${label}" = ${JSON.stringify(value)}`
          );
          return;
        }
      }
    }

    // Debug dump: enumerate visible lightning-input-field API names so the next
    // attempt has a precise target. Also enumerate plain label texts.
    const seenFields: string[] = [];
    try {
      const els = this.page.locator('lightning-input-field');
      const n = Math.min(await els.count(), 60);
      for (let i = 0; i < n; i++) {
        const fn =
          (await els.nth(i).getAttribute('field-name').catch(() => null)) ||
          (await els.nth(i).getAttribute('data-field-name').catch(() => null)) ||
          '(no field-name)';
        const visible = await els.nth(i).isVisible({ timeout: 200 }).catch(() => false);
        seenFields.push(`${fn}${visible ? '' : ' (hidden)'}`);
      }
    } catch {
      // ignore
    }
    throw new Error(
      `SF-1083 UI: could not locate field on ${this.objectApiName} form. Tried apiNames=[${apiNames.join(', ')}], label=${
        label ? JSON.stringify(label) : '(none)'
      }. Visible lightning-input-fields: [${seenFields.join(', ')}]`
    );
  }

  /**
   * Backwards-compatible single-API-name setter.
   * @deprecated prefer `setField()` which accepts label fallback.
   */
  async setFieldByApiName(apiName: string, value: string): Promise<void> {
    return this.setField(apiName, value);
  }

  /**
   * Click the form's Save button (the primary action footer button).
   *
   * Retries with `force: true` if Lightning's duplicate-alert popover overlay
   * intercepts pointer events — that is the documented Lightning UX where a
   * second Save click after the alert popover acknowledges and persists the
   * record (allowSave=true semantics).
   */
  async clickSave(): Promise<void> {
    const saveButton = this.page
      .getByRole('button', { name: /^Save$/, exact: true })
      .or(this.page.locator('button.slds-button_brand', { hasText: /^Save$/i }))
      .or(this.page.locator('button[name="SaveEdit"]'))
      .or(this.page.locator('lightning-button[label="Save"] button'))
      .first();
    await saveButton.waitFor({ state: 'visible', timeout: 15000 });
    try {
      await saveButton.click({ timeout: 8000 });
      logger.info('SF-1083 UI: clicked Save');
    } catch (firstErr: any) {
      logger.warn(
        `SF-1083 UI: normal Save click intercepted (likely duplicate-alert popover overlay). Retrying with force: ${firstErr?.message?.split('\n')[0]}`
      );
      // Try to dismiss any popover overlay first (best-effort), then force-click.
      await this.dismissDuplicatePopover();
      await saveButton.click({ force: true, timeout: 8000 });
      logger.info('SF-1083 UI: clicked Save (forced)');
    }
    // Allow Lightning to validate fields, fire duplicate detection, and either
    // navigate to the detail page (success) or render the duplicate alert.
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }

  /**
   * Best-effort dismiss of the Lightning "Similar Records Exist" popover that
   * floats above the form when a duplicate rule fires. Closing it removes the
   * overlay so Save / Cancel buttons become clickable normally.
   */
  private async dismissDuplicatePopover(): Promise<void> {
    const closeBtn = this.page
      .getByRole('button', { name: /^Close$/i })
      .or(this.page.locator('lightning-button-icon[alternative-text="Close"] button'))
      .or(this.page.locator('button[title="Close"]'))
      .first();
    if (await closeBtn.isVisible({ timeout: 800 }).catch(() => false)) {
      try {
        await closeBtn.click({ timeout: 2000, force: true });
        await this.page.waitForTimeout(300);
        logger.info('SF-1083 UI: dismissed duplicate-alert popover via Close button');
      } catch {
        // best-effort
      }
    }
  }

  /**
   * Read the Lightning duplicate-alert (if present) and return a structured
   * snapshot. Returns null when no alert is visible.
   *
   * Lightning renders the duplicate alert in two layers:
   *   1. A small popover near the Save button: "Similar Records Exist /
   *      This record looks like an existing record. ... View Duplicates"
   *   2. (After clicking "View Duplicates") an expanded modal/region that
   *      shows the rule's configured Alert Text and the matched records list.
   *
   * We accept layer-1 (popover) as proof that the alert fired, and try to
   * expand to layer-2 to capture the rule's alert text + matched names.
   */
  async readDuplicateAlert(timeoutMs = 8000): Promise<DuplicateAlertSnapshot | null> {
    // Layer 1 — popover. Use getByText (shadow-DOM aware) because the
    // Lightning duplicate-alert popover is rendered in a closed shadow root
    // that CSS :has-text() cannot reach. innerText sees it, getByText sees it.
    //
    // Lightning renders TWO popover variants depending on whether the rule is
    // an Alert (Allow) or a Block (Hard-prevent):
    //   • Allow: "This record looks like an existing record / View Duplicates"
    //   • Block: "⊘ We hit a snag. You can't save this record because a
    //            duplicate record already exists. To save, use different
    //            information. View Duplicates"  (SF-1022 POG_Prevent_Duplicate)
    const popoverByText = this.page
      .getByText(/this record looks like an existing record/i)
      .or(this.page.getByText(/we hit a snag/i))
      .or(this.page.getByText(/duplicate record already exists/i))
      .or(this.page.getByText(/can(?:'|’)t save this record/i))
      .first();

    // Layer 2 — expanded panel (matched-records list + rule alert text).
    // Use getByText for the rule alert text too (also shadow-DOM aware).
    const expandedAlert = this.page
      .locator('records-duplicate-alert-message')
      .or(this.page.locator('[data-aura-class*="DuplicateAlert"]'))
      .or(this.page.getByText(/possible duplicate reference data/i))
      .or(this.page.getByText(/use one of these records\?/i))
      .or(this.page.getByText(/we hit a snag/i))
      .or(this.page.getByText(/duplicate record already exists/i))
      .first();

    let alertRegion = expandedAlert;
    if (!(await alertRegion.isVisible({ timeout: timeoutMs }).catch(() => false))) {
      // Try the popover form
      if (await popoverByText.isVisible({ timeout: 2500 }).catch(() => false)) {
        alertRegion = popoverByText;
      } else {
        return null;
      }
    }

    const text = (await alertRegion.innerText().catch(() => '')) || '';

    // Non-destructive read: do NOT click "View Duplicates" here — that opens a
    // secondary modal layer that intercepts pointer events on the form's Save
    // button, breaking the subsequent acknowledged-save click. The popover-
    // level text ("This record looks like an existing record / View Duplicates")
    // is sufficient evidence that the SF-1083 alert rule fired.
    const matchedCount = ((): number => {
      const m = text.match(/(\d+)\s+(potential\s+)?duplicates?\s+found/i);
      if (m) return parseInt(m[1], 10);
      return 0;
    })();

    const matchedNames: string[] = [];
    try {
      const items = alertRegion.locator(
        'a[data-recordid], [data-aura-class*="DuplicateRecordItem"], lightning-card a, ul li a, lightning-tile a'
      );
      const count = Math.min(await items.count(), 25);
      for (let i = 0; i < count; i++) {
        const t = (await items.nth(i).innerText().catch(() => '')).trim();
        if (t) matchedNames.push(t);
      }
    } catch {
      // best-effort
    }

    const ignoreSaveBtn = this.page
      .getByRole('button', { name: /Save\s*\(?\s*Ignore Alert\s*\)?/i })
      .or(this.page.getByRole('button', { name: /Save anyway/i }))
      .first();
    const canIgnoreAndSave = await ignoreSaveBtn.isVisible({ timeout: 1000 }).catch(() => false);

    return { text, matchedCount, matchedNames, canIgnoreAndSave };
  }

  /**
   * Click "Save (Ignore Alert)" / "Save anyway" — the secondary save button
   * that Lightning renders when an Allow-action duplicate rule has fired.
   */
  async clickSaveIgnoreAlert(): Promise<void> {
    const btn = this.page
      .getByRole('button', { name: /Save\s*\(?\s*Ignore Alert\s*\)?/i })
      .or(this.page.getByRole('button', { name: /Save anyway/i }))
      .first();
    await btn.waitFor({ state: 'visible', timeout: 8000 });
    await btn.click();
    logger.info('SF-1083 UI: clicked Save (Ignore Alert)');
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  }

  /**
   * Check whether navigation has reached a record detail page for this object.
   * Salesforce Lightning detail URLs look like `/lightning/r/<obj>/<id>/view`.
   */
  async isOnRecordDetailPage(timeoutMs = 12000): Promise<{ ok: boolean; recordId?: string }> {
    const detailRegex = new RegExp(
      `/lightning/r/${this.objectApiName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/([a-zA-Z0-9]{15,18})/view`
    );
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const m = this.page.url().match(detailRegex);
      if (m) return { ok: true, recordId: m[1] };
      await this.page.waitForTimeout(500);
    }
    return { ok: false };
  }

  /** Locator for the form container (record edit form within the new-record modal/page). */
  private formContainer(): Locator {
    return this.page
      .locator('lightning-record-edit-form')
      .or(this.page.locator('records-record-layout-item').first())
      .or(this.page.locator('div.forceGeneratedLayout').first())
      .first();
  }
}
