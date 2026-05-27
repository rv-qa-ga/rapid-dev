/**
 * Microsoft Entra ID (Azure AD) password sign-in via the hosted login UX.
 * Used when Dynamics UI tests run with DYNAMICS_UI_AUTH_MODE=interactive.
 *
 * MFA / number matching is not automated — conditional access must allow password-only for this account.
 */

import type { Page } from '@playwright/test';
import { logger } from './logger';

export type DynamicsUiAuthMode = 'spn' | 'interactive';

/**
 * spn — inject Bearer token from client credentials (legacy default).
 * interactive — real browser session via Entra username + password.
 */
export function parseDynamicsUiAuthMode(): DynamicsUiAuthMode {
  const raw = (process.env.DYNAMICS_UI_AUTH_MODE || process.env.D365_UI_AUTH_MODE || 'spn').toLowerCase().trim();
  if (raw === 'interactive' || raw === 'user' || raw === 'password') {
    return 'interactive';
  }
  return 'spn';
}

/** Username + password for interactive Dynamics UI login (never log the password). */
export function getInteractiveDynamicsUiCredentials(): { username: string; password: string } {
  const username = (process.env.D365_UI_USERNAME || process.env.D365_INTERACTIVE_USERNAME || '').trim();
  const password = (
    process.env.D365_UI_PASSWORD ||
    process.env.D365_INTERACTIVE_PASSWORD ||
    process.env.D365_SVC_PASSWORD ||
    process.env.D365_SVC_Password ||
    ''
  ).trim();
  if (!username || !password) {
    throw new Error(
      'Interactive Dynamics UI auth requires D365_UI_USERNAME and D365_UI_PASSWORD in .env.<ENV> ' +
        '(aliases D365_INTERACTIVE_USERNAME / D365_INTERACTIVE_PASSWORD). Set DYNAMICS_UI_AUTH_MODE=interactive.',
    );
  }
  return { username, password };
}

function redactUsername(u: string): string {
  const at = u.indexOf('@');
  if (at <= 0) return '***';
  return `***${u.slice(at)}`;
}

export function isMicrosoftLoginHost(url: string): boolean {
  try {
    const h = new URL(url).hostname;
    return (
      h.includes('login.microsoftonline.com') ||
      h.includes('login.microsoft.com') ||
      h.includes('login.live.com') ||
      h.includes('login.windows.net')
    );
  } catch {
    return url.includes('login.microsoftonline.com') || url.includes('login.windows.net');
  }
}

function emailStepLocator(page: Page) {
  return page
    .locator(
      [
        'input[name="loginfmt"]',
        'input#i0116',
        'input[type="email"][autocomplete="username"]',
        'input[data-bind*="username"]',
        'input[data-report-event*="SignIn_EmailUsername"]',
        'input.inp[type="email"]',
      ].join(', '),
    )
    .or(page.getByPlaceholder(/work\s+email|email\s+address|sign\s+in/i))
    .or(page.getByRole('textbox', { name: /^Email$/i }))
    .or(page.locator('input[type="email"]'))
    .first();
}

function passwordStepLocator(page: Page) {
  return page
    .locator(
      [
        'input[name="passwd"]',
        'input#passwordInput',
        'input[type="password"]#i0118',
        'input#i0118',
        'input[type="password"][autocomplete="current-password"]',
      ].join(', '),
    )
    .first();
}

/**
 * If Entra shows the email/username step, fill it and click Next once.
 * For manual SSO: caller waits while the user completes MFA, passwordless, or password in the browser.
 * Returns true if the email step was found and submitted.
 */
export async function trySubmitEntraUsernameOnly(page: Page, username: string): Promise<boolean> {
  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  const emailInput = emailStepLocator(page);
  if (await emailInput.isVisible({ timeout: 10000 }).catch(() => false)) {
    logger.info(`Microsoft login: pre-filling email for manual SSO handoff (${redactUsername(username)})`);
    await emailInput.click({ timeout: 5000 }).catch(() => {});
    await emailInput.fill(username);
    await clickPrimaryMicrosoftSubmit(page);
    await page.waitForTimeout(1500).catch(() => {});
    return true;
  }
  return false;
}

async function clickPrimaryMicrosoftSubmit(page: Page): Promise<void> {
  const candidates = [
    page.getByRole('button', { name: /^Next$/i }).first(),
    page.getByRole('button', { name: /^Sign in$/i }).first(),
    page.locator('input[type="submit"]#idSIButton9').first(),
    page.locator('button#idSIButton9').first(),
    page.locator('input[type="submit"][value="Next"]').first(),
    page.locator('input[type="submit"][value="Sign in"]').first(),
  ];
  for (const loc of candidates) {
    if (await loc.isVisible({ timeout: 2500 }).catch(() => false)) {
      await loc.click({ timeout: 15000 }).catch(async () => {
        await page.locator('#idSIButton9').click({ timeout: 15000 });
      });
      return;
    }
  }
  await page.locator('#idSIButton9').click({ timeout: 15000 });
}

/**
 * If the browser is still on Microsoft login UX, submit email/password and optional "Stay signed in?".
 */
export async function completeEntraIdPasswordLoginIfNeeded(
  page: Page,
  creds: { username: string; password: string },
  options?: { timeoutMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? parseInt(process.env.D365_UI_LOGIN_TIMEOUT_MS || '180000', 10);
  const deadline = Date.now() + timeoutMs;

  logger.info(`Microsoft login (interactive): Entra UX for ${redactUsername(creds.username)}`);

  await page.waitForLoadState('domcontentloaded', { timeout: 30000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  // Branded tenants often hydrate the username field shortly after paint
  try {
    await emailStepLocator(page).waitFor({ state: 'visible', timeout: 25000 });
  } catch {
    /* loop below still handles slow loads */
  }

  while (Date.now() < deadline) {
    const url = page.url();

    if (!isMicrosoftLoginHost(url)) {
      logger.info('Microsoft login: host is past Entra login; continuing.');
      return;
    }

    const emailInput = emailStepLocator(page);
    const pwdInput = passwordStepLocator(page);

    const body = await page.locator('body').innerText({ timeout: 2000 }).catch(() => '');
    if (
      /verify your identity|more information required|Authenticator|Approve the request|multi-factor|MFA\b|SMS/i.test(
        body,
      )
    ) {
      throw new Error(
        'Microsoft sign-in prompted for MFA / extra verification. ' +
          'Use Conditional Access exclusions or a password-only auth strength for this automation account, ' +
          'or set DYNAMICS_UI_AUTH_MODE=spn.',
      );
    }

    if (await emailInput.isVisible({ timeout: 3500 }).catch(() => false)) {
      logger.info('Microsoft login: entering work email (username step)');
      await emailInput.click({ timeout: 5000 }).catch(() => {});
      await emailInput.fill(creds.username);
      await clickPrimaryMicrosoftSubmit(page);
      await page.waitForTimeout(1200).catch(() => {});
      continue;
    }

    if (await pwdInput.isVisible({ timeout: 3500 }).catch(() => false)) {
      logger.info('Microsoft login: entering password');
      await pwdInput.click({ timeout: 5000 }).catch(() => {});
      await pwdInput.fill(creds.password);
      await clickPrimaryMicrosoftSubmit(page);
      await page.waitForTimeout(1500).catch(() => {});
      continue;
    }

    // "Stay signed in?" — Yes improves session persistence for Cucumber reuse
    const kmsiHeading = page.getByText(/Stay signed in\?/i).first();
    if (await kmsiHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
      logger.info('Microsoft login: confirming "Stay signed in"');
      await page.locator('#idSIButton9').first().click({ timeout: 10000 }).catch(() => {});
      await page.waitForTimeout(1200).catch(() => {});
      continue;
    }

    await page.waitForTimeout(500).catch(() => {});
  }

  if (isMicrosoftLoginHost(page.url())) {
    const hint =
      'If the email field stayed empty, confirm DYNAMICS_UI_AUTH_MODE=interactive and D365_UI_USERNAME / D365_UI_PASSWORD in .env.<ENV>. ' +
      'SPN mode never fills this form.';
    throw new Error(
      `Timed out after ${timeoutMs}ms on Microsoft login — check credentials, CAPTCHA, or CA/MFA policies. ${hint}`,
    );
  }
}
