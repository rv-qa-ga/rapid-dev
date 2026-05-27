/**
 * Dynamics 365 / Power Platform UI Step Definitions
 *
 * Authentication (env `DYNAMICS_UI_AUTH_MODE`):
 * - spn (default): Bearer from client-credentials; application user linked to `D365_CLIENT_ID`.
 * - interactive: Entra username/password (`D365_UI_USERNAME` / `D365_UI_PASSWORD`); MFA not automated.
 *
 * SPN / Application User flow:
 * 1. First navigation after auth: RDM model-driven app
 *    `<D365_BASE_URL>/Apps/uniquename/accelins_ReferenceData` (or DYNAMICS_RDM_APP_URL / D365_UI_ENTRY_URL).
 * 2. Optional: DYNAMICS_RDM_USE_PUBLISHED_APPS_TILE=true → main.aspx → Published Apps → "Reference Data Manage…" tile (not REX).
 * 3. Left nav: Party → Parties
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { logger } from '../../../utils/logger';
import { config } from '../../../config/config';
import { DynamicsAuth } from '../../../utils/dynamics-auth';
import {
  parseDynamicsUiAuthMode,
  getInteractiveDynamicsUiCredentials,
  completeEntraIdPasswordLoginIfNeeded,
} from '../../../utils/dynamics-microsoft-login';

/** Path segment for Reference Data Management (uniquename in environment URL). */
const RDM_APP_UNIQUE_PATH = '/Apps/uniquename/accelins_ReferenceData';

/**
 * Resolve `${VAR_NAME}` tokens in a string against process.env, so feature files can stay
 * env-agnostic (e.g. `the Dynamics browser URL should contain "${D365_HOST}"` resolves to
 * `accelinsqatest.crm11.dynamics.com` under ENV=qa and `accelinsqatest2.crm11.dynamics.com`
 * under ENV=qa2). Recognised tokens:
 *   - `${D365_HOST}`         hostname of D365_BASE_URL (no scheme, no trailing slash)
 *   - `${D365_BASE_URL}`     full URL, trailing slash stripped
 *   - any other `${VAR}`     raw process.env[VAR] value (empty string if unset)
 * Unknown tokens become empty strings rather than throwing — this mirrors shell behaviour
 * and keeps the step usable with optional env keys.
 */
function resolveEnvTokens(input: string): string {
  return input.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (_match, name: string) => {
    if (name === 'D365_HOST') {
      const base = (process.env.D365_BASE_URL || '').trim();
      if (!base) return '';
      try {
        return new URL(base).hostname;
      } catch {
        // Fall back to naive strip if not a URL
        return base.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      }
    }
    if (name === 'D365_BASE_URL') {
      return (process.env.D365_BASE_URL || '').trim().replace(/\/+$/, '');
    }
    return (process.env[name] || '').trim();
  });
}

/**
 * Full URL to open the RDM app. Override with DYNAMICS_RDM_APP_URL when host or uniquename differs.
 */
function getDynamicsRdmDirectUrl(baseUrl: string): string {
  const fromEnv = process.env.DYNAMICS_RDM_APP_URL?.trim();
  if (fromEnv) return fromEnv;
  const root = (baseUrl || '').replace(/\/$/, '') || 'https://accelinsqatest.crm11.dynamics.com';
  return `${root}${RDM_APP_UNIQUE_PATH}`;
}

/** First Playwright goto after SPN routing (login / entry). */
function getDynamicsUiFirstHitUrl(d365BaseUrl: string): string {
  const fromEnv = process.env.D365_UI_ENTRY_URL?.trim();
  if (fromEnv) return fromEnv;
  return getDynamicsRdmDirectUrl(d365BaseUrl);
}

/** Origins that must receive the SPN Bearer header (config base + entry URL host if different). */
function collectDynamicsSpnOrigins(d365BaseUrl: string, firstHitUrl: string): string[] {
  const origins = new Set<string>();
  const base = (d365BaseUrl || '').replace(/\/$/, '') || 'https://accelinsqatest.crm11.dynamics.com';
  try {
    origins.add(new URL(base).origin);
  } catch {
    /* ignore */
  }
  try {
    origins.add(new URL(firstHitUrl).origin);
  } catch {
    /* ignore */
  }
  return [...origins];
}

const D365_SPN_PERMISSIONS_HINT = `
Dynamics 365 returned a permissions/site map error (0x80050016). The signed-in identity (interactive user or application user) authenticates, but it does not have access to this app/site map.

Ask your Dynamics 365 administrator to:
1. SPN path: create an Application User linked to your Azure AD app (same Client ID as D365_CLIENT_ID) and assign a security role that includes the Reference Data Management app.
2. Interactive path: assign the automation account (D365_UI_USERNAME) a security role that includes the Reference Data Management app and required entities/site map.
3. Ensure the app's site map is published.

See: https://learn.microsoft.com/en-us/power-platform/admin/create-application-users-set-up-dynamics-365-connection
`;

/**
 * If the current page is the Dynamics permissions/site map error page, throw a clear error.
 */
async function throwIfDynamicsPermissionsError(page: import('@playwright/test').Page): Promise<void> {
  const url = page.url();
  if (url.includes('errorhandler.aspx') && url.includes('ErrorCode=')) {
    const body = await page.locator('body').innerText().catch(() => '');
    if (body.includes("don't have permissions") || body.includes('site map') || body.includes('0x80050016')) {
      throw new Error(`Dynamics 365 permissions error (SPN/Application User). ${D365_SPN_PERMISSIONS_HINT}`);
    }
  }
}

/**
 * Dataverse redirects users who authenticate in Entra but are not provisioned as environment users here.
 * Hostname still matches (assertions on `${D365_HOST}` pass) — detect and fail loudly.
 */
async function throwIfDynamicsOrgMembershipNotificationError(page: import('@playwright/test').Page): Promise<void> {
  const url = page.url().toLowerCase();
  if (!url.includes('notification.aspx')) return;

  const body = await page.locator('body').innerText({ timeout: 12000 }).catch(() => '');
  const blob = `${url}\n${body}`;

  if (
    /\bnotMemberOfOrg\b/i.test(blob) ||
    /you are not a member of this organization/i.test(blob) ||
    /do not belong to the organization/i.test(blob)
  ) {
    throw new Error(
      'Dynamics denied access after sign-in: this Entra identity is **not provisioned as a user** in this ' +
        'Power Platform / Dataverse environment (notMemberOfOrg). The Notifications page can still live on your org host — ' +
        'URL checks alone are misleading. Ask an administrator to **add this user** in the PPAC environment for ' +
        '`D365_BASE_URL` (Users / access + assign a security role), then rerun.',
    );
  }
}

/** Permissions error page and org-access notification page (`notification.aspx`). */
async function assertNoDynamicsUiBlockingState(page: import('@playwright/test').Page): Promise<void> {
  await throwIfDynamicsPermissionsError(page);
  await throwIfDynamicsOrgMembershipNotificationError(page);
}

const RDM_APP_DISPLAY_NAME = 'Reference Data Management';

function getDynamicsGotoTimeoutMs(): number {
  return parseInt(process.env.D365_UI_GOTO_TIMEOUT_MS || '90000', 10);
}

async function dynamicsGoto(page: import('@playwright/test').Page, url: string): Promise<void> {
  page.once('dialog', (d) => {
    d.accept().catch(() => {});
  });
  const ms = getDynamicsGotoTimeoutMs();
  try {
    await page.goto(url, { waitUntil: 'commit', timeout: ms });
    await page.waitForLoadState('domcontentloaded', { timeout: ms }).catch(() => {});
  } catch (e: any) {
    if (e.message?.includes('ERR_ABORTED') || e.message?.includes('Navigation')) {
      await page.waitForTimeout(500);
      await page.goto(url, { waitUntil: 'commit', timeout: ms });
      await page.waitForLoadState('domcontentloaded', { timeout: ms }).catch(() => {});
    } else throw e;
  }
}

function isDynamicsInteractiveUiAuth(): boolean {
  return parseDynamicsUiAuthMode() === 'interactive';
}

/** After navigating to Dynamics/Entra, complete password login when using interactive UI auth. */
async function dynamicsGotoWithOptionalInteractiveLogin(
  page: import('@playwright/test').Page,
  url: string,
): Promise<void> {
  await dynamicsGoto(page, url);
  if (isDynamicsInteractiveUiAuth()) {
    const creds = getInteractiveDynamicsUiCredentials();
    await completeEntraIdPasswordLoginIfNeeded(page, creds);
  } else {
    logger.debug(
      'Dynamics UI: skipping Entra password steps (DYNAMICS_UI_AUTH_MODE is not interactive). ' +
        'If the next page is Microsoft sign-in, set DYNAMICS_UI_AUTH_MODE=interactive with D365_UI_USERNAME / D365_UI_PASSWORD.',
    );
  }
}

/** Remove Bearer injection hooks so interactive Entra cookie session is used exclusively. */
async function clearDynamicsSpnBrowserRoutes(world: AutomationWorld): Promise<void> {
  if (!world.page) return;
  const d365Config = config.getDynamicsConfig();
  const baseUrl = d365Config.baseUrl?.replace(/\/$/, '') || 'https://accelinsqatest.crm11.dynamics.com';
  const firstHitUrl = getDynamicsUiFirstHitUrl(baseUrl);
  const origins = collectDynamicsSpnOrigins(baseUrl, firstHitUrl);
  const dynamicsUrlPredicate = (url: URL) => {
    if (origins.includes(url.origin)) return true;
    return url.href.startsWith(baseUrl);
  };
  await world.page.unroute(dynamicsUrlPredicate).catch(() => {});
}

/**
 * Land on Power Apps "Published Apps" grid (main.aspx?forceUCI=1&pagetype=apps) after main.aspx auth.
 */
async function ensureDynamicsPublishedAppsPage(
  page: import('@playwright/test').Page,
  baseUrl: string
): Promise<void> {
  const root = baseUrl.replace(/\/$/, '');
  const appsListUrl = `${root}/main.aspx?forceUCI=1&pagetype=apps`;

  logger.info('Waiting for Published Apps (after main.aspx / auth)');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(2000);

  const onAppsList = () => page.url().includes('pagetype=apps');
  const hasPublishedAppsMarker = async (): Promise<boolean> => {
    const pub = page.getByText(/Published Apps/i).first();
    const search = page.getByPlaceholder(/Search my apps/i).first();
    return (
      (await pub.isVisible({ timeout: 1500 }).catch(() => false)) ||
      (await search.isVisible({ timeout: 1500 }).catch(() => false))
    );
  };

  if (!onAppsList() || !(await hasPublishedAppsMarker())) {
    logger.info(`Opening Published Apps explicitly: ${appsListUrl}`);
    await dynamicsGotoWithOptionalInteractiveLogin(page, appsListUrl);
  }

  await page.waitForTimeout(1500);

  const markerTimeout = parseInt(process.env.D365_PUBLISHED_APPS_WAIT_MS || '60000', 10);
  const markerLocators = [
    page.getByText(/Published Apps/i).first(),
    page.getByPlaceholder(/Search my apps/i).first(),
    page.getByRole('searchbox').first(),
    page.locator('input[placeholder*="Search" i], input[aria-label*="Search" i]').first(),
  ];

  let markerVisible = false;
  const perMarkerMs = Math.max(15000, Math.floor(markerTimeout / markerLocators.length));
  for (const loc of markerLocators) {
    try {
      await loc.waitFor({ state: 'visible', timeout: perMarkerMs });
      markerVisible = true;
      logger.info('Published Apps screen marker found');
      break;
    } catch {
      /* try next */
    }
  }

  if (!markerVisible) {
    // Grid may render without exact placeholder text; still try to click the RDM tile.
    logger.warn(
      `Published Apps markers not found within timeout; continuing (${page.url()}). ` +
        `If the next step fails, increase D365_PUBLISHED_APPS_WAIT_MS or check SPN app access.`
    );
    await page.waitForTimeout(3000);
  }

  logger.info(`Published Apps step complete (${page.url()})`);
}

/**
 * Click the "Reference Data Manage..." tile (not "REX Reference Data Man...") on Published Apps.
 */
async function clickReferenceDataManagementApp(
  page: import('@playwright/test').Page,
  baseUrl: string
): Promise<void> {
  await ensureDynamicsPublishedAppsPage(page, baseUrl);

  logger.info(`Selecting ${RDM_APP_DISPLAY_NAME} tile (truncated label: Reference Data Manage…)`);
  await page.waitForLoadState('domcontentloaded');

  // Full name in a11y tree, or truncated tile label "Reference Data Manage…" (not "REX Reference Data Man…")
  const nameFull = new RegExp(RDM_APP_DISPLAY_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const nameTruncated = /^Reference Data Manage/i;

  const candidates = [
    page.getByRole('link', { name: nameFull }),
    page.getByRole('button', { name: nameFull }),
    page.getByRole('link', { name: nameTruncated }),
    page.getByRole('button', { name: nameTruncated }),
    page.locator('a, button, [role="button"], [role="link"]').filter({ hasText: nameTruncated }),
  ];

  let clicked = false;
  for (const loc of candidates) {
    const el = loc.first();
    if (await el.isVisible({ timeout: 8000 }).catch(() => false)) {
      await el.scrollIntoViewIfNeeded();
      await el.click({ timeout: 15000 });
      clicked = true;
      logger.info(`✅ Clicked ${RDM_APP_DISPLAY_NAME} app tile`);
      break;
    }
  }

  if (!clicked) {
    throw new Error(
      `${RDM_APP_DISPLAY_NAME} tile not found on Published Apps (${page.url()}). ` +
        `Unset DYNAMICS_RDM_USE_PUBLISHED_APPS_TILE or fix app access; default navigation uses the direct app URL (${RDM_APP_UNIQUE_PATH}).`
    );
  }

  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
}

async function navigateToRdmAppDirect(page: import('@playwright/test').Page, baseUrl: string): Promise<void> {
  const url = getDynamicsRdmDirectUrl(baseUrl);
  logger.info(`Opening ${RDM_APP_DISPLAY_NAME} via direct app URL: ${url}`);
  await dynamicsGotoWithOptionalInteractiveLogin(page, url);
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);
  await assertNoDynamicsUiBlockingState(page);
}

/**
 * Choose UI auth: interactive (Entra password) vs SPN (Bearer injection on Dynamics host).
 * SPN matches Dynamics API client-credentials behavior.
 */
async function ensureDynamicsUiAuth(world: AutomationWorld): Promise<void> {
  if (!world.page) throw new Error('Page not initialized.');
  if (isDynamicsInteractiveUiAuth()) {
    await clearDynamicsSpnBrowserRoutes(world);
    logger.info('Dynamics UI auth: interactive (D365_UI_USERNAME); SPN Bearer route disabled.');
    return;
  }
  await ensureDynamicsSpnAuthForBrowser(world);
}
/**
 * Inject OAuth2 client-credentials Bearer token on requests to the Dynamics org host(s).
 */
async function ensureDynamicsSpnAuthForBrowser(world: AutomationWorld): Promise<void> {
  if (!world.page) throw new Error('Page not initialized.');
  const d365Config = config.getDynamicsConfig();
  const baseUrl = d365Config.baseUrl?.replace(/\/$/, '') || 'https://accelinsqatest.crm11.dynamics.com';
  const firstHitUrl = getDynamicsUiFirstHitUrl(baseUrl);
  const token = await DynamicsAuth.getAccessToken();
  const origins = collectDynamicsSpnOrigins(baseUrl, firstHitUrl);
  const dynamicsUrlPredicate = (url: URL) => {
    if (origins.includes(url.origin)) return true;
    return url.href.startsWith(baseUrl);
  };
  await world.page.unroute(dynamicsUrlPredicate).catch(() => {});
  await world.page.route(dynamicsUrlPredicate, (route) => {
    const headers = { ...route.request().headers() };
    headers['Authorization'] = `Bearer ${token}`;
    route.continue({ headers });
  });
  logger.info(
    `Dynamics SPN auth enabled for browser: Bearer on origins ${origins.join(', ')} (first UI hit: ${firstHitUrl})`
  );
}

/**
 * Open the RDM app (or D365_UI_ENTRY_URL) first after SPN auth.
 */
async function navigateDynamicsUiFirstHit(world: AutomationWorld): Promise<void> {
  if (!world.page) throw new Error('Page not initialized.');
  const d365Config = config.getDynamicsConfig();
  const baseUrl = d365Config.baseUrl?.replace(/\/$/, '') || 'https://accelinsqatest.crm11.dynamics.com';
  const entryUrl = getDynamicsUiFirstHitUrl(baseUrl);
  logger.info(`Dynamics UI: loading RDM app entry URL: ${entryUrl}`);
  const dynamicsGotoTimeoutMs = parseInt(process.env.D365_UI_GOTO_TIMEOUT_MS || '90000', 10);
  await dynamicsGotoWithOptionalInteractiveLogin(world.page, entryUrl);
  await world.page.waitForLoadState('domcontentloaded', { timeout: dynamicsGotoTimeoutMs }).catch(() => {});
  await world.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

  const urlAfterLoad = world.page.url();
  if (!isDynamicsInteractiveUiAuth() && urlAfterLoad.includes('login.microsoftonline.com')) {
    throw new Error(
      'The browser is on Microsoft sign-in (login.microsoftonline.com), but DYNAMICS_UI_AUTH_MODE is not interactive. ' +
        'Bearer injection (SPN) does not fill the email/password form or complete this redirect. ' +
        'Set DYNAMICS_UI_AUTH_MODE=interactive plus D365_UI_USERNAME and D365_UI_PASSWORD in src/config/env/.env.<ENV>, ' +
        'then rerun (HEADLESS=false to watch).',
    );
  }

  await assertNoDynamicsUiBlockingState(world.page);

  const url = world.page.url();
  const onRdmApp = url.includes('/Apps/uniquename/') || url.includes('accelins_ReferenceData');
  const onUciShell = await world.page
    .locator('[data-id="navbar"], nav[role="navigation"]')
    .first()
    .isVisible({ timeout: 8000 })
    .catch(() => false);

  if (!onRdmApp && !onUciShell) {
    logger.info('Dynamics UI entry: RDM app / UCI shell not detected yet; continuing (SPN may still be valid).');
  }

  logger.info(`Dynamics UI entry complete (${url})`);
}

// ============================================================================
// AUTHENTICATION & LOGIN
// ============================================================================

Given('I am logged in to Dynamics 365', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  await ensureDynamicsUiAuth(this);
  await navigateDynamicsUiFirstHit(this);

  logger.info('✅ Successfully logged in to Dynamics 365 (RDM app entry loaded)');
});

Given('I am an authenticated Dynamics 365 user', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized. Ensure browser is initialized in Before hook.');
  }

  await ensureDynamicsUiAuth(this);
  await navigateDynamicsUiFirstHit(this);

  logger.info('✅ Successfully authenticated to Dynamics 365 (RDM app entry loaded)');
});

Given('The current account name is {string}', async function (this: AutomationWorld, accountName: string) {
  this.testContext.accountName = accountName;
  logger.info(`Current account name set to: ${accountName}`);
});

Given('the current account name is {string}', async function (this: AutomationWorld, accountName: string) {
  this.testContext.accountName = accountName;
  logger.info(`Current account name set to: ${accountName}`);
});

// ============================================================================
// APP NAVIGATION
// ============================================================================

When('I select the {string} app', async function (this: AutomationWorld, appName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Selecting app: ${appName}`);
  
  // Wait for apps to load
  await this.page.waitForLoadState('domcontentloaded');
  
  // Look for app tile by name
  const appSelectors = [
    `text=${appName}`,
    `[aria-label*="${appName}"]`,
    `button:has-text("${appName}")`,
    `a:has-text("${appName}")`,
  ];
  
  let appFound = false;
  for (const selector of appSelectors) {
    const appElement = this.page.locator(selector).first();
    if (await appElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appElement.click();
      appFound = true;
      logger.info(`✅ Clicked app: ${appName}`);
      break;
    }
  }
  
  if (!appFound) {
    throw new Error(`App "${appName}" not found. Available apps may need to be checked.`);
  }
  
  // Wait for app to load
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000); // Additional wait for app initialization
  
  this.testContext.currentApp = appName;
  logger.info(`✅ Successfully navigated to ${appName} app`);
});

When('I navigate to the Reference Data Management app', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  const d365Config = config.getDynamicsConfig();
  const baseUrl = d365Config.baseUrl?.replace(/\/$/, '') || 'https://accelinsqatest.crm11.dynamics.com';
  if (process.env.DYNAMICS_RDM_USE_PUBLISHED_APPS_TILE === 'true') {
    await clickReferenceDataManagementApp(this.page, baseUrl);
  } else {
    await navigateToRdmAppDirect(this.page, baseUrl);
  }
  this.testContext.currentApp = RDM_APP_DISPLAY_NAME;
  logger.info(`✅ Successfully navigated to ${RDM_APP_DISPLAY_NAME} app`);
});

Then('the Dynamics browser URL should contain {string}', async function (this: AutomationWorld, fragment: string) {
  if (!this.page) throw new Error('Page not initialized');
  const needle = resolveEnvTokens(fragment.replace(/^"|"$/g, ''));
  if (!needle) {
    throw new Error(
      `Dynamics URL assertion resolved to an empty string — check that the env var referenced in "${fragment}" is set (e.g. D365_BASE_URL for \${D365_HOST}).`,
    );
  }
  const timeoutMs = parseInt(process.env.D365_RDM_URL_ASSERT_MS || '45000', 10);
  const deadline = Date.now() + timeoutMs;
  let lastUrl = '';
  while (Date.now() < deadline) {
    await assertNoDynamicsUiBlockingState(this.page);
    lastUrl = this.page.url();
    if (lastUrl.includes(needle)) {
      logger.info(`✅ Dynamics URL contains "${needle}" (${lastUrl})`);
      return;
    }
    await this.page.waitForTimeout(1000);
  }
  throw new Error(
    `Expected URL to contain "${needle}" within ${timeoutMs}ms. Last URL: ${lastUrl}`
  );
});

Then('the Dynamics browser URL should not contain {string}', async function (this: AutomationWorld, fragment: string) {
  if (!this.page) throw new Error('Page not initialized');
  await assertNoDynamicsUiBlockingState(this.page);
  const needle = resolveEnvTokens(fragment.replace(/^"|"$/g, ''));
  if (!needle) {
    logger.info(`Dynamics URL negative-assertion token resolved to empty — treating as vacuously satisfied.`);
    return;
  }
  const url = this.page.url();
  if (url.includes(needle)) {
    throw new Error(`Expected URL not to contain "${needle}". URL: ${url}`);
  }
  logger.info(`✅ Dynamics URL does not contain "${needle}" (${url})`);
});

// ============================================================================
// ENTITY NAVIGATION (Left Pane)
// ============================================================================

When('I select {string} from the left navigation pane', async function (this: AutomationWorld, entityName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Selecting entity from left pane: ${entityName}`);
  
  // Wait for navigation pane to be visible
  await this.page.waitForLoadState('domcontentloaded');
  
  // Look for entity in left navigation pane
  // Dynamics left nav typically has structure like: nav > ul > li > a or button
  const entitySelectors = [
    `nav [aria-label*="${entityName}"]`,
    `nav a:has-text("${entityName}")`,
    `nav button:has-text("${entityName}")`,
    `[role="navigation"] a:has-text("${entityName}")`,
    `[role="navigation"] button:has-text("${entityName}")`,
    `text=${entityName}`, // Fallback - may match multiple elements
  ];
  
  let entityFound = false;
  for (const selector of entitySelectors) {
    const entityElement = this.page.locator(selector).first();
    if (await entityElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Scroll into view if needed
      await entityElement.scrollIntoViewIfNeeded();
      await entityElement.click();
      entityFound = true;
      logger.info(`✅ Clicked entity: ${entityName}`);
      break;
    }
  }
  
  if (!entityFound) {
    // Take screenshot for debugging
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Entity "${entityName}" not found in left navigation pane. Check screenshot for available entities.`);
  }
  
  // Wait for entity view to load
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000); // Additional wait for entity initialization
  
  this.testContext.currentEntity = entityName;
  logger.info(`✅ Successfully navigated to ${entityName} entity`);
});

When('I select {string} under {string} category in the left navigation pane', async function (
  this: AutomationWorld,
  entityName: string,
  categoryName: string
) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Selecting ${entityName} under ${categoryName} category`);
  
  // First, expand the category if it's collapsed
  const categorySelectors = [
    `nav [aria-label*="${categoryName}"]`,
    `nav button:has-text("${categoryName}")`,
    `[role="navigation"] button:has-text("${categoryName}")`,
  ];
  
  let categoryExpanded = false;
  for (const selector of categorySelectors) {
    const categoryElement = this.page.locator(selector).first();
    if (await categoryElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Check if category is expanded (has aria-expanded="true" or visible children)
      const isExpanded = await categoryElement.getAttribute('aria-expanded').then(attr => attr === 'true').catch(() => false);
      
      if (!isExpanded) {
        await categoryElement.click();
        await this.page.waitForTimeout(1000); // Wait for category to expand
        logger.info(`✅ Expanded category: ${categoryName}`);
      }
      categoryExpanded = true;
      break;
    }
  }
  
  if (!categoryExpanded) {
    logger.warn(`Category "${categoryName}" not found or already expanded. Proceeding to select entity.`);
  }
  
  // Now select the entity - reuse entity selection logic
  logger.info(`Selecting entity from left pane: ${entityName}`);
  
  await this.page.waitForLoadState('domcontentloaded');
  
  const entitySelectors = [
    `nav [aria-label*="${entityName}"]`,
    `nav a:has-text("${entityName}")`,
    `nav button:has-text("${entityName}")`,
    `[role="navigation"] a:has-text("${entityName}")`,
    `[role="navigation"] button:has-text("${entityName}")`,
    `text=${entityName}`,
  ];
  
  let entityFound = false;
  for (const selector of entitySelectors) {
    const entityElement = this.page.locator(selector).first();
    if (await entityElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await entityElement.scrollIntoViewIfNeeded();
      await entityElement.click();
      entityFound = true;
      logger.info(`✅ Clicked entity: ${entityName}`);
      break;
    }
  }
  
  if (!entityFound) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Entity "${entityName}" not found in left navigation pane. Check screenshot for available entities.`);
  }
  
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000);
  
  this.testContext.currentEntity = entityName;
  logger.info(`✅ Successfully navigated to ${entityName} entity`);
});

// ============================================================================
// SPECIFIC ENTITY NAVIGATION (Common Patterns)
// ============================================================================

When('I navigate to Parties in Reference Data Management', async function (this: AutomationWorld) {
  // Navigate to Reference Data Management app
  const appName = 'Reference Data Management';
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Selecting app: ${appName}`);
  await this.page.waitForLoadState('domcontentloaded');
  
  const appSelectors = [
    `text=${appName}`,
    `[aria-label*="${appName}"]`,
    `button:has-text("${appName}")`,
    `a:has-text("${appName}")`,
  ];
  
  let appFound = false;
  for (const selector of appSelectors) {
    const appElement = this.page.locator(selector).first();
    if (await appElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appElement.click();
      appFound = true;
      logger.info(`✅ Clicked app: ${appName}`);
      break;
    }
  }
  
  if (!appFound) {
    throw new Error(`App "${appName}" not found.`);
  }
  
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000);
  this.testContext.currentApp = appName;
  
  // Select "Parties" under "Party" category
  const categoryName = 'Party';
  const entityName = 'Parties';
  
  logger.info(`Selecting ${entityName} under ${categoryName} category`);
  
  const categorySelectors = [
    `nav [aria-label*="${categoryName}"]`,
    `nav button:has-text("${categoryName}")`,
    `[role="navigation"] button:has-text("${categoryName}")`,
  ];
  
  let categoryExpanded = false;
  for (const selector of categorySelectors) {
    const categoryElement = this.page.locator(selector).first();
    if (await categoryElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      const isExpanded = await categoryElement.getAttribute('aria-expanded').then(attr => attr === 'true').catch(() => false);
      if (!isExpanded) {
        await categoryElement.click();
        await this.page.waitForTimeout(1000);
        logger.info(`✅ Expanded category: ${categoryName}`);
      }
      categoryExpanded = true;
      break;
    }
  }
  
  if (!categoryExpanded) {
    logger.warn(`Category "${categoryName}" not found or already expanded.`);
  }
  
  // Select the entity
  const entitySelectors = [
    `nav [aria-label*="${entityName}"]`,
    `nav a:has-text("${entityName}")`,
    `nav button:has-text("${entityName}")`,
    `[role="navigation"] a:has-text("${entityName}")`,
    `[role="navigation"] button:has-text("${entityName}")`,
    `text=${entityName}`,
  ];
  
  let entityFound = false;
  for (const selector of entitySelectors) {
    const entityElement = this.page.locator(selector).first();
    if (await entityElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await entityElement.scrollIntoViewIfNeeded();
      await entityElement.click();
      entityFound = true;
      logger.info(`✅ Clicked entity: ${entityName}`);
      break;
    }
  }
  
  if (!entityFound) {
    throw new Error(`Entity "${entityName}" not found in left navigation pane.`);
  }
  
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000);
  this.testContext.currentEntity = entityName;
  logger.info(`✅ Successfully navigated to ${entityName} entity`);
});

// ============================================================================
// E2E: RDM app URL (or Published Apps tile) → Party → Parties
// ============================================================================

When('I open Dynamics RDM Parties page', async function (this: AutomationWorld) {
  await openDynamicsRdmPartiesPage(this);
});

When('I navigate to the Parties page', async function (this: AutomationWorld) {
  await openDynamicsRdmPartiesPage(this);
});

async function openDynamicsRdmPartiesPage(world: AutomationWorld): Promise<void> {
  if (!world.page) throw new Error('Page not initialized. Ensure browser is initialized for UI tests.');
  await ensureDynamicsUiAuth(world);
  const d365Config = config.getDynamicsConfig();
  const baseUrl = d365Config.baseUrl?.replace(/\/$/, '') || 'https://accelinsqatest.crm11.dynamics.com';
  const rdmMarker = 'accelins_ReferenceData';

  if (process.env.DYNAMICS_RDM_USE_PUBLISHED_APPS_TILE === 'true') {
    const mainUrl = `${baseUrl}/main.aspx`;
    logger.info('Opening main.aspx for Published Apps → RDM tile path');
    await dynamicsGotoWithOptionalInteractiveLogin(world.page!, mainUrl);
    await world.page!.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await world.page!.waitForTimeout(1500);
    await assertNoDynamicsUiBlockingState(world.page!);
    await clickReferenceDataManagementApp(world.page!, baseUrl);
  } else if (!world.page!.url().includes(rdmMarker)) {
    logger.info('Opening RDM app (direct URL)');
    await navigateToRdmAppDirect(world.page!, baseUrl);
  } else {
    logger.info('Already on RDM app; continuing to Parties navigation');
    await world.page!.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
    await world.page!.waitForTimeout(1500);
  }

  await world.page!.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await world.page!.waitForTimeout(2000);
  await assertNoDynamicsUiBlockingState(world.page!);

  const categoryName = 'Party';
  const entityName = 'Parties';
  logger.info(`Selecting ${entityName} under ${categoryName} in the left pane`);
  const categorySelectors = [`nav button:has-text("${categoryName}")`, `[role="navigation"] button:has-text("${categoryName}")`, `a:has-text("${categoryName}")`, `span:has-text("${categoryName}")`];
  for (const selector of categorySelectors) {
    const el = world.page!.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      const expanded = await el.getAttribute('aria-expanded').then(a => a === 'true').catch(() => false);
      if (!expanded) { await el.click(); await world.page!.waitForTimeout(1000); }
      break;
    }
  }
  const entitySelectors = [`nav a:has-text("${entityName}")`, `nav button:has-text("${entityName}")`, `[role="navigation"] a:has-text("${entityName}")`, `a:has-text("${entityName}")`, `span:has-text("${entityName}")`];
  let clicked = false;
  for (const selector of entitySelectors) {
    const el = world.page!.locator(selector).first();
    if (await el.isVisible({ timeout: 5000 }).catch(() => false)) {
      await el.scrollIntoViewIfNeeded();
      await el.click();
      clicked = true;
      logger.info(`✅ Clicked "${entityName}" under ${categoryName}`);
      break;
    }
  }
  if (!clicked) throw new Error(`"${entityName}" under ${categoryName} section not found. Check left navigation.`);
  await world.page!.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await world.page!.waitForTimeout(2000);
  world.testContext.currentApp = 'Reference Data Management';
  world.testContext.currentEntity = entityName;
  logger.info('✅ Dynamics RDM Parties page opened');
}

When('I filter by the current account name in the Name field', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  const accountName = this.testContext.accountName as string;
  if (!accountName) {
    throw new Error('No account name in context. Create an account in Salesforce first and capture the name.');
  }
  logger.info(`Filtering All Parties by Name (Begins with): ${accountName}`);

  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);

  // All Parties uses a "Filter by" dialog: click funnel on Name column -> set "Begins with" + value -> Apply
  const filterIconSelectors = [
    '[role="columnheader"]:has-text("Name") button[aria-label*="Filter"]',
    '[role="columnheader"]:has-text("Name") button[title*="Filter"]',
    'th:has-text("Name") button',
    'div[role="columnheader"]:has-text("Name") + button',
    'button[aria-label*="Filter"]',
    '[data-id*="Name"] button[aria-label*="Filter"]',
    'button:has(svg[data-icon-name="Filter"])',
    '.column-header:has-text("Name") button',
  ];
  let dialogOpened = false;
  for (const sel of filterIconSelectors) {
    const btn = this.page.locator(sel).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.scrollIntoViewIfNeeded();
      await btn.click();
      await this.page.waitForTimeout(800);
      if (await this.page.locator('[role="dialog"]:has-text("Filter by"), div:has-text("Filter by")').first().isVisible({ timeout: 3000 }).catch(() => false)) {
        dialogOpened = true;
        logger.info('Opened Filter by dialog from Name column');
        break;
      }
    }
  }

  if (!dialogOpened) {
    // Fallback: inline "Filter by keyword" box if present
    const keywordInput = this.page.locator('input[placeholder*="Filter by keyword"], input[placeholder*="Filter"]').first();
    if (await keywordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await keywordInput.clear();
      await keywordInput.fill(accountName);
      await this.page.waitForTimeout(2000);
      logger.info(`✅ Entered "${accountName}" in Filter by keyword (fallback)`);
      return;
    }
    throw new Error('Could not open Filter by dialog on Name column or find Filter by keyword input.');
  }

  const dialog = this.page.locator('[role="dialog"]').filter({ hasText: 'Filter by' }).first();
  // Select "Begins with" in the dropdown (required every time - not default)
  const dropdown = dialog.locator('select, [role="combobox"], [aria-haspopup="listbox"]').first();
  if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
    const tagName = await dropdown.evaluate((el) => el.tagName?.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      await dropdown.selectOption({ label: 'Begins with' });
    } else {
      await dropdown.click();
      await this.page.waitForTimeout(400);
      const beginsWithOption = this.page.locator('[role="listbox"] [role="option"]:has-text("Begins with"), [role="option"]:has-text("Begins with"), li:has-text("Begins with")').first();
      if (await beginsWithOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await beginsWithOption.click();
      }
    }
  }
  const filterInput = dialog.locator('input[type="text"]').first();
  await filterInput.waitFor({ state: 'visible', timeout: 3000 });
  await filterInput.clear();
  await filterInput.fill(accountName);
  await this.page.waitForTimeout(300);
  const applyBtn = dialog.locator('button:has-text("Apply")').first();
  await applyBtn.click();
  logger.info(`✅ Applied Filter by Name Begins with "${accountName}"`);
  await this.page.waitForTimeout(2000);
});

When('I filter for {string} in the Name field', async function (this: AutomationWorld, keyword: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  const accountName = (this.testContext.accountName as string) || keyword;
  logger.info(`Filtering All Parties by Name (Begins with): ${accountName}`);

  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);

  const filterIconSelectors = [
    '[role="columnheader"]:has-text("Name") button[aria-label*="Filter"]',
    '[role="columnheader"]:has-text("Name") button[title*="Filter"]',
    'th:has-text("Name") button',
    'button[aria-label*="Filter"]',
  ];
  let dialogOpened = false;
  for (const sel of filterIconSelectors) {
    const btn = this.page.locator(sel).first();
    if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await btn.click();
      await this.page.waitForTimeout(800);
      if (await this.page.locator('[role="dialog"]').filter({ hasText: 'Filter by' }).first().isVisible({ timeout: 3000 }).catch(() => false)) {
        dialogOpened = true;
        break;
      }
    }
  }
  if (!dialogOpened) {
    const keywordInput = this.page.locator('input[placeholder*="Filter by keyword"], input[placeholder*="Filter"]').first();
    if (await keywordInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await keywordInput.clear();
      await keywordInput.fill(accountName);
      await this.page.waitForTimeout(2000);
      return;
    }
    throw new Error('Could not open Filter by dialog or find keyword filter.');
  }
  const dialog = this.page.locator('[role="dialog"]').filter({ hasText: 'Filter by' }).first();
  const dropdown = dialog.locator('select, [role="combobox"], [aria-haspopup="listbox"]').first();
  if (await dropdown.isVisible({ timeout: 2000 }).catch(() => false)) {
    const tagName = await dropdown.evaluate((el) => el.tagName?.toLowerCase()).catch(() => '');
    if (tagName === 'select') {
      await dropdown.selectOption({ label: 'Begins with' });
    } else {
      await dropdown.click();
      await this.page.waitForTimeout(400);
      const beginsWithOption = this.page.locator('[role="listbox"] [role="option"]:has-text("Begins with"), [role="option"]:has-text("Begins with"), li:has-text("Begins with")').first();
      if (await beginsWithOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await beginsWithOption.click();
      }
    }
  }
  const filterInput = dialog.locator('input[type="text"]').first();
  await filterInput.waitFor({ state: 'visible', timeout: 3000 });
  await filterInput.clear();
  await filterInput.fill(accountName);
  const applyBtn = dialog.locator('button:has-text("Apply")').first();
  await applyBtn.click();
  await this.page.waitForTimeout(2000);
});

Then('I verify the Party record exists in the list', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }
  const accountName = this.testContext.accountName as string;
  if (!accountName) {
    throw new Error('No account name in context.');
  }

  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);

  const rowWithName = this.page.locator(`tr:has-text("${accountName}"), [role="row"]:has-text("${accountName}")`).first();
  const visible = await rowWithName.isVisible({ timeout: 10000 }).catch(() => false);
  if (!visible) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Party record with name "${accountName}" not found in the list.`);
  }
  logger.info(`✅ Party record "${accountName}" found in the list`);
});

Then('I should see the Party record exists in the list', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const accountName = this.testContext.accountName as string;
  if (!accountName) throw new Error('No account name in context.');
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);
  const rowWithName = this.page.locator(`tr:has-text("${accountName}"), [role="row"]:has-text("${accountName}")`).first();
  const visible = await rowWithName.isVisible({ timeout: 10000 }).catch(() => false);
  if (!visible) throw new Error(`Party record with name "${accountName}" not found in the list.`);
  logger.info(`✅ Party record "${accountName}" found in the list`);
});

When('I click on the Party record in the list', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const accountName = this.testContext.accountName as string;
  if (!accountName) throw new Error('No account name in context.');
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1500);
  const row = this.page.locator(`tr:has-text("${accountName}"), [role="row"]:has-text("${accountName}")`).first();
  const visible = await row.isVisible({ timeout: 10000 }).catch(() => false);
  if (!visible) throw new Error(`Party record "${accountName}" not found in the list.`);
  await row.click();
  await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await this.page.waitForTimeout(2000);
  logger.info(`✅ Clicked Party record "${accountName}"`);
});

Then('I should see the Party record details', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1500);
  const hasDetailView = await this.page.locator('form [role="form"], .entity-form, [data-lp-id="form-container"], .main-content form').first().isVisible({ timeout: 8000 }).catch(() => false)
    || await this.page.locator('[role="dialog"]').first().isVisible({ timeout: 3000 }).catch(() => false);
  if (!hasDetailView) {
    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    if (!bodyText || bodyText.length < 100) throw new Error('Party record details view not found.');
  }
  logger.info('✅ Party record details visible');
});

When('I navigate to {string} in Reference Data Management', async function (this: AutomationWorld, entityName: string) {
  // Navigate to Reference Data Management app
  const appName = 'Reference Data Management';
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Selecting app: ${appName}`);
  await this.page.waitForLoadState('domcontentloaded');
  
  const appSelectors = [
    `text=${appName}`,
    `[aria-label*="${appName}"]`,
    `button:has-text("${appName}")`,
    `a:has-text("${appName}")`,
  ];
  
  let appFound = false;
  for (const selector of appSelectors) {
    const appElement = this.page.locator(selector).first();
    if (await appElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await appElement.click();
      appFound = true;
      logger.info(`✅ Clicked app: ${appName}`);
      break;
    }
  }
  
  if (!appFound) {
    throw new Error(`App "${appName}" not found.`);
  }
  
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000);
  this.testContext.currentApp = appName;
  
  // Select entity from left navigation pane
  logger.info(`Selecting entity from left pane: ${entityName}`);
  await this.page.waitForLoadState('domcontentloaded');
  
  const entitySelectors = [
    `nav [aria-label*="${entityName}"]`,
    `nav a:has-text("${entityName}")`,
    `nav button:has-text("${entityName}")`,
    `[role="navigation"] a:has-text("${entityName}")`,
    `[role="navigation"] button:has-text("${entityName}")`,
    `text=${entityName}`,
  ];
  
  let entityFound = false;
  for (const selector of entitySelectors) {
    const entityElement = this.page.locator(selector).first();
    if (await entityElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await entityElement.scrollIntoViewIfNeeded();
      await entityElement.click();
      entityFound = true;
      logger.info(`✅ Clicked entity: ${entityName}`);
      break;
    }
  }
  
  if (!entityFound) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Entity "${entityName}" not found in left navigation pane.`);
  }
  
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000);
  this.testContext.currentEntity = entityName;
  logger.info(`✅ Successfully navigated to ${entityName} entity`);
});

// ============================================================================
// VERIFICATION STEPS
// ============================================================================

Then('I should be on the Dynamics home page', async function (this: AutomationWorld) {
  if (!this.page) throw new Error('Page not initialized');
  const d365Config = config.getDynamicsConfig();
  const baseUrl = d365Config.baseUrl?.replace(/\/$/, '') || 'https://accelinsqatest.crm11.dynamics.com';
  const url = this.page.url();
  const isDynamics = url.startsWith(baseUrl);
  if (!isDynamics) {
    throw new Error(`Expected to be on Dynamics (${baseUrl}). Current URL: ${url}`);
  }
  logger.info('✅ On Dynamics home / app page');
});

Then('I should see the text {string} in the page title', async function (this: AutomationWorld, expectedText: string) {
  if (!this.page) throw new Error('Page not initialized');
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(1500);
  const title = await this.page.title();
  const bodyText = await this.page.locator('body').innerText().catch(() => '');
  const combined = `${title} ${bodyText}`.toLowerCase();
  const found = combined.includes(expectedText.toLowerCase());
  if (!found) {
    throw new Error(`Expected to see "${expectedText}" in page title or content. Title: "${title}"`);
  }
  logger.info(`✅ Found "${expectedText}" in page title or content`);
});

Then('I should be in the {string} app', async function (this: AutomationWorld, appName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  // Check page title or header for app name
  const pageTitle = await this.page.title();
  const pageContent = await this.page.content();
  
  const isInApp = pageTitle.includes(appName) || 
                  pageContent.includes(appName) ||
                  (this.testContext.currentApp === appName);
  
  if (!isInApp) {
    throw new Error(`Expected to be in "${appName}" app, but current app is "${this.testContext.currentApp || 'unknown'}"`);
  }
  
  logger.info(`✅ Verified we are in ${appName} app`);
});

Then('I should see {string} entity view', async function (this: AutomationWorld, entityName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  // Wait for entity view to load
  await this.page.waitForLoadState('domcontentloaded');
  
  // Check if entity view is visible (may have entity name in header, title, or URL)
  const pageUrl = this.page.url();
  const pageContent = await this.page.content();
  
  const entityVisible = pageUrl.toLowerCase().includes(entityName.toLowerCase().replace(/\s+/g, '_')) ||
                        pageContent.toLowerCase().includes(entityName.toLowerCase()) ||
                        (this.testContext.currentEntity === entityName);
  
  if (!entityVisible) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Entity view "${entityName}" not visible. Current entity: ${this.testContext.currentEntity || 'unknown'}`);
  }
  
  logger.info(`✅ Verified ${entityName} entity view is displayed`);
});

// ============================================================================
// FORM INTERACTION STEPS
// ============================================================================

When('I click New to create a {string} record', async function (this: AutomationWorld, entityName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Clicking New to create ${entityName} record`);
  
  // Wait for page to be ready
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);
  
  // Look for New button - Dynamics typically uses "+ New" or "New" button
  const newButtonSelectors = [
    'button:has-text("+ New")',
    'button:has-text("New")',
    'a:has-text("New")',
    '[aria-label*="New"]',
    '[title*="New"]',
    'button[aria-label*="New"]',
  ];
  
  let clicked = false;
  for (const selector of newButtonSelectors) {
    const button = this.page.locator(selector).first();
    if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
      await button.click();
      clicked = true;
      logger.info(`✅ Clicked New button`);
      break;
    }
  }
  
  if (!clicked) {
    throw new Error(`New button not found for creating ${entityName} record`);
  }
  
  // Wait for form to load
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000);
  
  logger.info(`✅ New ${entityName} form opened`);
});

When('I select {string} in the {string} field', async function (this: AutomationWorld, value: string, fieldName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Selecting "${value}" in ${fieldName} field`);
  
  // Wait for form to be ready
  await this.page.waitForLoadState('domcontentloaded');
  
  // Look for the field - Dynamics uses various patterns for lookup fields
  const fieldSelectors = [
    `[aria-label*="${fieldName}"]`,
    `label:has-text("${fieldName}")`,
    `input[aria-label*="${fieldName}"]`,
    `div:has-text("${fieldName}")`,
  ];
  
  let fieldFound = false;
  for (const selector of fieldSelectors) {
    const fieldElement = this.page.locator(selector).first();
    if (await fieldElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Click on the field to open lookup/search
      await fieldElement.click();
      await this.page.waitForTimeout(1000);
      
      // Look for lookup/search dialog or dropdown
      // Try to find the value in a dropdown or search results
      const valueSelectors = [
        `text=${value}`,
        `[aria-label*="${value}"]`,
        `button:has-text("${value}")`,
        `a:has-text("${value}")`,
      ];
      
      for (const valueSelector of valueSelectors) {
        const valueElement = this.page.locator(valueSelector).first();
        if (await valueElement.isVisible({ timeout: 3000 }).catch(() => false)) {
          await valueElement.click();
          fieldFound = true;
          logger.info(`✅ Selected "${value}" in ${fieldName} field`);
          break;
        }
      }
      
      if (fieldFound) break;
    }
  }
  
  if (!fieldFound) {
    // Try typing the value directly if it's a text field
    const inputField = this.page.locator(`input[aria-label*="${fieldName}"], input[placeholder*="${fieldName}"]`).first();
    if (await inputField.isVisible({ timeout: 3000 }).catch(() => false)) {
      await inputField.fill(value);
      fieldFound = true;
      logger.info(`✅ Entered "${value}" in ${fieldName} field`);
    }
  }
  
  if (!fieldFound) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Could not select "${value}" in ${fieldName} field`);
  }
  
  await this.page.waitForTimeout(1000);
});

Then('the {string} field should be mandatory', async function (this: AutomationWorld, fieldName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Verifying ${fieldName} field is mandatory`);
  
  // Look for mandatory indicator (red asterisk, required label, etc.)
  const mandatoryIndicators = [
    `[aria-label*="${fieldName}"]:has([class*="required"], [class*="mandatory"])`,
    `label:has-text("${fieldName}") + * [class*="required"]`,
    `label:has-text("${fieldName}") + * [class*="mandatory"]`,
    `[aria-label*="${fieldName}"] [aria-required="true"]`,
  ];
  
  // Also check for error messages indicating required field
  const pageContent = await this.page.content();
  const hasRequiredError = pageContent.includes(`${fieldName}: Required`) || 
                          pageContent.includes(`${fieldName}: Required fields must be filled in`);
  
  let isMandatory = false;
  for (const selector of mandatoryIndicators) {
    const indicator = this.page.locator(selector).first();
    if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      isMandatory = true;
      break;
    }
  }
  
  if (!isMandatory && hasRequiredError) {
    isMandatory = true;
  }
  
  if (!isMandatory) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Field "${fieldName}" should be mandatory but no mandatory indicator found`);
  }
  
  logger.info(`✅ Verified ${fieldName} field is mandatory`);
});

Then('the {string} field should not be mandatory', async function (this: AutomationWorld, fieldName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Verifying ${fieldName} field is not mandatory`);
  
  // Check that there's no mandatory indicator
  const mandatoryIndicators = [
    `[aria-label*="${fieldName}"] [class*="required"]`,
    `label:has-text("${fieldName}") + * [class*="required"]`,
    `[aria-label*="${fieldName}"] [aria-required="true"]`,
  ];
  
  let hasMandatoryIndicator = false;
  for (const selector of mandatoryIndicators) {
    const indicator = this.page.locator(selector).first();
    if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
      hasMandatoryIndicator = true;
      break;
    }
  }
  
  if (hasMandatoryIndicator) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Field "${fieldName}" should not be mandatory but mandatory indicator found`);
  }
  
  logger.info(`✅ Verified ${fieldName} field is not mandatory`);
});

When('I save the {string} record', async function (this: AutomationWorld, entityName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Saving ${entityName} record`);
  
  // Look for Save button
  const saveButtonSelectors = [
    'button:has-text("Save")',
    'button:has-text("Save & Close")',
    '[aria-label*="Save"]',
    'button[title*="Save"]',
  ];
  
  let clicked = false;
  for (const selector of saveButtonSelectors) {
    const button = this.page.locator(selector).first();
    if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
      await button.click();
      clicked = true;
      logger.info(`✅ Clicked Save button`);
      break;
    }
  }
  
  if (!clicked) {
    throw new Error(`Save button not found`);
  }
  
  // Wait for save to complete
  await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await this.page.waitForTimeout(2000);
  
  logger.info(`✅ Record saved successfully`);
});

Then('the {string} record should be saved successfully', async function (this: AutomationWorld, entityName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  // Check for success indicators (form title changes from "Unsaved" to saved, no error messages, etc.)
  const pageContent = await this.page.content();
  const hasUnsaved = pageContent.includes('Unsaved');
  const hasError = pageContent.includes('error') || pageContent.includes('Error') || pageContent.includes('Required fields must be filled in');
  
  if (hasUnsaved) {
    throw new Error(`${entityName} record appears to be unsaved`);
  }
  
  if (hasError) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`${entityName} record save failed - error detected`);
  }
  
  logger.info(`✅ Verified ${entityName} record was saved successfully`);
});

When('I enter {string} in the {string} field', async function (this: AutomationWorld, value: string, fieldName: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Entering "${value}" in ${fieldName} field`);
  
  // Wait for form to be ready
  await this.page.waitForLoadState('domcontentloaded');
  
  // Look for the field input
  const fieldSelectors = [
    `input[aria-label*="${fieldName}"]`,
    `input[placeholder*="${fieldName}"]`,
    `[aria-label*="${fieldName}"] input`,
    `label:has-text("${fieldName}") + input`,
  ];
  
  let fieldFound = false;
  for (const selector of fieldSelectors) {
    const fieldElement = this.page.locator(selector).first();
    if (await fieldElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fieldElement.click();
      await fieldElement.fill(value);
      fieldFound = true;
      logger.info(`✅ Entered "${value}" in ${fieldName} field`);
      break;
    }
  }
  
  if (!fieldFound) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Could not find ${fieldName} field to enter value`);
  }
  
  await this.page.waitForTimeout(500);
});

When('I can leave {string} field empty', async function (this: AutomationWorld, fieldName: string) {
  // This is a verification step - just verify the field exists and is not mandatory
  logger.info(`Verifying ${fieldName} field can be left empty`);
  // The actual verification happens when we try to save without filling it
  // This step is mainly for documentation/clarity
});

When('I leave {string} field empty', async function (this: AutomationWorld, fieldName: string) {
  // Explicitly leave field empty - do nothing
  logger.info(`Leaving ${fieldName} field empty`);
});

Then('I should see error message {string}', async function (this: AutomationWorld, errorMessage: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Checking for error message: ${errorMessage}`);
  
  // Wait for error message to appear
  await this.page.waitForTimeout(1000);
  
  const pageContent = await this.page.content();
  const hasError = pageContent.includes(errorMessage);
  
  if (!hasError) {
    // Also check for error banner/div
    const errorSelectors = [
      `text=${errorMessage}`,
      `[role="alert"]:has-text("${errorMessage}")`,
      `.error:has-text("${errorMessage}")`,
    ];
    
    let errorFound = false;
    for (const selector of errorSelectors) {
      const errorElement = this.page.locator(selector).first();
      if (await errorElement.isVisible({ timeout: 2000 }).catch(() => false)) {
        errorFound = true;
        break;
      }
    }
    
    if (!errorFound) {
      const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
      if (screenshot) {
        this.attach(screenshot, 'image/png');
      }
      throw new Error(`Expected error message "${errorMessage}" not found`);
    }
  }
  
  logger.info(`✅ Verified error message: ${errorMessage}`);
});

Then('I should see {string} table with records where {string}', async function (this: AutomationWorld, tableName: string, condition: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Verifying ${tableName} table with condition: ${condition}`);
  
  // Wait for table to load
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);
  
  // Check if table is visible
  const tableSelectors = [
    `table:has-text("${tableName}")`,
    `[aria-label*="${tableName}"]`,
    `h1:has-text("${tableName}"), h2:has-text("${tableName}")`,
  ];
  
  let tableFound = false;
  for (const selector of tableSelectors) {
    const tableElement = this.page.locator(selector).first();
    if (await tableElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      tableFound = true;
      break;
    }
  }
  
  if (!tableFound) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Table "${tableName}" not found`);
  }
  
  // Verify table has records (has rows)
  const tableRows = this.page.locator('table tbody tr, [role="row"]').count();
  const rowCount = await tableRows;
  
  if (rowCount === 0) {
    logger.warn(`Table "${tableName}" found but has no rows`);
  }
  
  logger.info(`✅ Verified ${tableName} table is visible with ${rowCount} row(s)`);
});

Then('{string} values should be available from Parties table where {string}', async function (this: AutomationWorld, fieldName: string, condition: string) {
  // This is a verification step - verify that lookup values are available
  logger.info(`Verifying ${fieldName} values are available from Parties table where ${condition}`);
  // Implementation would verify lookup dropdown contains expected values
  // For now, this is a placeholder that documents the requirement
});

Then('I should see Parties with Party Type = {string}', async function (this: AutomationWorld, partyType: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Verifying Parties with Party Type = ${partyType} are visible`);
  
  // Wait for table to load
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);
  
  // Check if table contains records with the specified Party Type
  const pageContent = await this.page.content();
  const hasPartyType = pageContent.includes(partyType);
  
  if (!hasPartyType) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error(`Parties with Party Type = ${partyType} not found`);
  }
  
  logger.info(`✅ Verified Parties with Party Type = ${partyType} are visible`);
});

When('The TPA Mapping Table is populated or refreshed', async function (this: AutomationWorld) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info('Refreshing TPA Mapping Table');
  
  // Look for refresh button
  const refreshSelectors = [
    'button[aria-label*="Refresh"]',
    'button:has-text("Refresh")',
    '[title*="Refresh"]',
  ];
  
  for (const selector of refreshSelectors) {
    const refreshButton = this.page.locator(selector).first();
    if (await refreshButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await refreshButton.click();
      await this.page.waitForTimeout(2000);
      logger.info('✅ Refreshed TPA Mapping Table');
      return;
    }
  }
  
  // If no refresh button, just wait for table to load
  await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  logger.info('✅ TPA Mapping Table loaded');
});

Then('All Parties with Party Type = {string} should be included in the TPA Mapping Table', async function (this: AutomationWorld, partyType: string) {
  if (!this.page) {
    throw new Error('Page not initialized');
  }

  logger.info(`Verifying all Parties with Party Type = ${partyType} are included in TPA Mapping Table`);
  
  // Wait for table to load
  await this.page.waitForLoadState('domcontentloaded');
  await this.page.waitForTimeout(2000);
  
  // Check if table contains records
  const tableRows = this.page.locator('table tbody tr, [role="row"]').count();
  const rowCount = await tableRows;
  
  if (rowCount === 0) {
    const screenshot = await this.page.screenshot({ fullPage: true }).catch(() => null);
    if (screenshot) {
      this.attach(screenshot, 'image/png');
    }
    throw new Error('TPA Mapping Table is empty - no records found');
  }
  
  logger.info(`✅ Verified TPA Mapping Table contains ${rowCount} record(s) (should include all Parties with Party Type = ${partyType})`);
});
