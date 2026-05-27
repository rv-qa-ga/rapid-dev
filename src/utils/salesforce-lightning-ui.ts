/**
 * Shared Salesforce Lightning Experience UI helpers.
 *
 * Resolves a Lightning Experience host (lightning.force.com) from the configured
 * Salesforce instance URL and provides a surface-readiness waiter for LEX pages
 * that often render the global header before the Aura/LWC body has hydrated.
 *
 * Used by SF-872 (`sf-872-ui.steps.ts`) and SF-1083 UI tests; kept generic so any
 * UI feature interacting with `/lightning/o/<obj>/...` pages can reuse.
 *
 * NOTE: existing SF-872 step file currently inlines equivalent helpers. They can
 * be migrated to import from this module in a separate, low-risk pass.
 */
import type { Page } from '@playwright/test';
import { config } from '../config/config';
import { logger } from './logger';
import type { AutomationWorld } from '../hooks/world';

/**
 * Convert a Salesforce instance URL (api/soap host) to its Lightning Experience host.
 * Idempotent — already-LEX URLs pass through unchanged.
 */
export function toLightningExperienceBaseUrl(url: string): string {
  const u = url.replace(/\/$/, '');
  if (u.includes('.lightning.force.com')) return u;
  if (u.includes('.my.salesforce.com')) {
    return u.replace('.my.salesforce.com', '.lightning.force.com');
  }
  return u;
}

/**
 * Resolve the Lightning Experience base URL from (in priority order):
 *   1. SALESFORCE_INSTANCE_URL or SF_INSTANCE_URL env vars
 *   2. The current AutomationWorld auth result (from the active JWT session)
 *   3. The framework's configured Salesforce baseUrl for the current ENV
 */
export function getLightningBaseUrl(world: AutomationWorld): string {
  const envUrl = (process.env.SALESFORCE_INSTANCE_URL || process.env.SF_INSTANCE_URL || '').trim();
  if (envUrl) return toLightningExperienceBaseUrl(envUrl);

  const fromAuth = world.testContext?.authResult?.instanceUrl as string | undefined;
  if (fromAuth?.trim()) return toLightningExperienceBaseUrl(fromAuth.trim());

  const base = config.getSalesforceConfig().baseUrl?.trim();
  if (base) return toLightningExperienceBaseUrl(base);

  throw new Error(
    'Cannot resolve Lightning base URL. Set SALESFORCE_INSTANCE_URL (or SF_INSTANCE_URL), or ensure JWT auth / Salesforce baseUrl is configured.'
  );
}

/**
 * Wait for a Salesforce Lightning Experience page to be visually ready.
 *
 * LEX pages often show the global nav before the body renders, and many
 * surfaces live in closed shadow roots that defeat tag-based waits. This
 * combines:
 *   - load + networkidle states
 *   - spinner-hidden waits
 *   - a heuristic main-workspace size check
 *
 * All inner timeouts are soft — the wait returns even if any single signal
 * fails to fire (e.g. for screenshot-only pages with very light DOM).
 */
export async function waitForLightningSurface(page: Page): Promise<void> {
  await page.waitForLoadState('load', { timeout: 90000 });
  await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(() => {});
  await page
    .locator('.slds-spinner, .forceListViewManagerSpinner, lightning-spinner')
    .first()
    .waitFor({ state: 'hidden', timeout: 45000 })
    .catch(() => {});

  await page
    .waitForFunction(
      () => {
        const bigEnough = (el: Element | null) => {
          if (!el) return false;
          const r = (el as HTMLElement).getBoundingClientRect();
          return r.height > 160 && r.width > 320;
        };
        const selectors = [
          '.oneContent',
          '[role="main"]',
          '.navexDesktopLayoutContainer',
          '.workspace',
          '.desktop.container',
        ];
        for (const sel of selectors) {
          if (bigEnough(document.querySelector(sel))) return true;
        }
        const body = document.body;
        return !!(body && body.scrollHeight > 380);
      },
      { timeout: 35000 }
    )
    .catch(() => {
      logger.warn(
        'Salesforce LEX main-area heuristic timed out; continuing (page may still be settling)'
      );
    });

  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
}
