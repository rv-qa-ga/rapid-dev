#!/usr/bin/env ts-node
/**
 * Dynamics 365 Finance & Operations — open web client for legal entity AUMI.
 *
 * Two auth modes:
 *
 * 1) Manual SSO (recommended for your own Entra account — MFA / Authenticator / passwordless in the browser):
 *    DYNAMICS_FO_USE_MANUAL_SSO=true
 *    DYNAMICS_FO_SSO_EMAIL=you@accelins.com
 *    (Does not use D365_UI_PASSWORD; you complete sign-in in the headed window.)
 *
 * 2) Password automation (service account; CA must allow password-only):
 *    DYNAMICS_UI_AUTH_MODE=interactive
 *    D365_UI_USERNAME, D365_UI_PASSWORD
 *
 * Env (from `src/config/env/.env.<ENV>`):
 *   D365_FO_UI_ENTRY_URL (or D365_FO_UI_BASE_URL + D365_FO_DATA_AREA_ID, default data area `aumi`)
 *   Optional: DYNAMICS_FO_MANUAL_SSO_TIMEOUT_MS (default 300000) — max wait for you to finish SSO and land on F&O
 *   Optional: DYNAMICS_FO_LIST_LEGAL_ENTITIES=false — skip OData listing of legal-entity / data-area IDs after login
 *   After login, lists distinct data area IDs from OData LegalEntities (browser session, then optional D365_* SPN fallback).
 *
 * Usage:
 *   npm run dynamics:fo:aumi-smoke
 *   cross-env ENV=qa ts-node scripts/dynamics-fno-aumi-login-smoke.ts
 *
 * This script defaults to headed (visible browser) so Entra + F&O are easy to watch — your
 * `.env.<ENV>` value `HEADLESS=true` does not apply here. Use `--headless` or
 * `DYNAMICS_FO_SMOKE_HEADLESS=true` for headless (e.g. CI).
 */

import * as fs from 'fs';
import * as path from 'path';
import { ClientSecretCredential } from '@azure/identity';
import { chromium, type BrowserContext, type Page } from 'playwright';

import { fnoOdataScopeFromBaseUrl } from '../src/integrations/lloyds/credential';
import {
  completeEntraIdPasswordLoginIfNeeded,
  getInteractiveDynamicsUiCredentials,
  isMicrosoftLoginHost,
  parseDynamicsUiAuthMode,
  trySubmitEntraUsernameOnly,
} from '../src/utils/dynamics-microsoft-login';
import { logger } from '../src/utils/logger';

/** Headed by default so you can see login; `.env` HEADLESS=true is ignored unless you opt in to headless. */
function resolveChromiumHeadless(): boolean {
  if (process.argv.includes('--headless')) return true;
  if ((process.env.DYNAMICS_FO_SMOKE_HEADLESS || '').toLowerCase() === 'true') return true;
  return false;
}

function loadEnvFile(): void {
  if (!process.env.ENV) {
    process.env.ENV = 'qa';
    logger.info('ENV not set; using qa');
  }
  const envFile = path.resolve(__dirname, '../src/config/env', `.env.${process.env.ENV}`);
  if (!fs.existsSync(envFile)) {
    throw new Error(`Missing env file: ${envFile}`);
  }
  require('dotenv').config({ path: envFile, override: true });
  logger.info(`Loaded ${path.relative(process.cwd(), envFile)}`);
}

function resolveFoEntryUrl(): string {
  const explicit = (process.env.D365_FO_UI_ENTRY_URL || '').trim();
  if (explicit) return explicit;
  const base = (process.env.D365_FO_UI_BASE_URL || '').trim().replace(/\/+$/, '');
  const dataArea = (process.env.D365_FO_DATA_AREA_ID || 'aumi').trim().toLowerCase();
  if (!base) {
    throw new Error(
      'Set D365_FO_UI_ENTRY_URL or D365_FO_UI_BASE_URL in .env.<ENV> (see .env.qa D365_FO_* block).',
    );
  }
  return `${base}/?cmp=${encodeURIComponent(dataArea)}&mi=defaultdashboard`;
}

function isManualSsoMode(): boolean {
  const v = (process.env.DYNAMICS_FO_USE_MANUAL_SSO || '').trim().toLowerCase();
  if (v === 'true' || v === '1' || v === 'yes') return true;
  return (process.env.DYNAMICS_FO_AUTH || '').trim().toLowerCase() === 'manual_sso';
}

function resolveManualSsoEmail(): string {
  return (process.env.DYNAMICS_FO_SSO_EMAIL || '').trim();
}

/** If Microsoft shows a session tile for this address, click it (skips typing email). */
async function tryClickEntraSessionTileForEmail(page: Page, email: string): Promise<boolean> {
  const escaped = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const role of ['button', 'link'] as const) {
    const loc = page.getByRole(role, { name: new RegExp(escaped, 'i') }).first();
    if (await loc.isVisible({ timeout: 4000 }).catch(() => false)) {
      await loc.click({ timeout: 15000 });
      logger.info('Clicked Microsoft sign-in tile matching DYNAMICS_FO_SSO_EMAIL');
      return true;
    }
  }
  return false;
}

async function waitForFoAfterAuth(page: Page, timeoutMs: number): Promise<void> {
  await page.waitForURL(
    (u) =>
      u.hostname.includes('operations.dynamics.com') &&
      !u.href.includes('login.microsoftonline.com') &&
      !u.href.includes('login.microsoft.com'),
    { timeout: timeoutMs },
  );
}

function assertUrlHasAumiEntity(pageUrl: string): void {
  const u = pageUrl.toLowerCase();
  if (!u.includes('cmp=aumi')) {
    logger.warn(
      `Final URL does not contain cmp=aumi — you may need to switch company manually. URL: ${pageUrl}`,
    );
  }
}

function foOperationsOriginFromPageUrl(pageUrl: string): string {
  let u: URL;
  try {
    u = new URL(pageUrl);
  } catch {
    throw new Error(`Cannot parse F&O URL: ${pageUrl}`);
  }
  if (!u.hostname.includes('operations.dynamics.com')) {
    throw new Error(`Expected *.operations.dynamics.com host, got: ${u.hostname}`);
  }
  return `${u.protocol}//${u.host}`;
}

function shouldListLegalEntities(): boolean {
  const v = (process.env.DYNAMICS_FO_LIST_LEGAL_ENTITIES ?? 'true').trim().toLowerCase();
  return v !== 'false' && v !== '0' && v !== 'no';
}

function extractDataAreaId(row: Record<string, unknown>): string | null {
  const candidates = [
    row.LegalEntityId,
    row.DataAreaId,
    row.dataAreaId,
    row.Company,
    row.LegalEntity,
    row.PrimaryForLegalEntity,
  ];
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return null;
}

function extractEntityLabel(row: Record<string, unknown>): string {
  const candidates = [row.Name, row.LegalEntityName, row.CompanyName, row.Description];
  for (const c of candidates) {
    if (c === null || c === undefined) continue;
    const s = String(c).trim();
    if (s) return s;
  }
  return '';
}

type ODataGetResult = { ok: () => boolean; status: () => number; json: () => Promise<unknown> };

type ODataPage = { value?: unknown[]; '@odata.nextLink'?: string };

async function fetchAllODataEntityPages(
  getUrl: (absoluteUrl: string) => Promise<ODataGetResult>,
  startUrl: string,
): Promise<{ rows: Record<string, unknown>[]; lastStatus: number; lastOk: boolean }> {
  const rows: Record<string, unknown>[] = [];
  let url: string | null = startUrl;
  let lastStatus = 0;
  let lastOk = false;
  for (let i = 0; i < 40 && url; i++) {
    const res = await getUrl(url);
    lastStatus = res.status();
    lastOk = res.ok();
    if (!res.ok()) {
      return { rows, lastStatus, lastOk };
    }
    const data = (await res.json()) as ODataPage;
    if (Array.isArray(data.value)) {
      for (const item of data.value) {
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          rows.push(item as Record<string, unknown>);
        }
      }
    }
    const next = data['@odata.nextLink'];
    url = typeof next === 'string' && next.length > 0 ? next : null;
  }
  return { rows, lastStatus, lastOk };
}

function mergeLegalEntityRows(rows: Record<string, unknown>[]): Map<string, string> {
  /** Normalised key (lowercase) → display id (first-seen casing) */
  const idByNorm = new Map<string, string>();
  const nameByNorm = new Map<string, string>();
  for (const row of rows) {
    const id = extractDataAreaId(row);
    if (!id) continue;
    const norm = id.toLowerCase();
    if (!idByNorm.has(norm)) idByNorm.set(norm, id);
    const label = extractEntityLabel(row);
    if (label && (!nameByNorm.has(norm) || nameByNorm.get(norm)!.length < label.length)) {
      nameByNorm.set(norm, label);
    }
  }
  const out = new Map<string, string>();
  for (const [norm, displayId] of idByNorm) {
    const name = nameByNorm.get(norm) || '';
    out.set(displayId, name);
  }
  return out;
}

async function tryListLegalEntitiesViaBrowserCookies(
  context: BrowserContext,
  foOrigin: string,
): Promise<{ idToName: Map<string, string>; source: string } | null> {
  const base = `${foOrigin.replace(/\/$/, '')}/data`;
  const tries = [
    `${base}/LegalEntities?$format=json&$top=5000&cross-company=true`,
    `${base}/LegalEntities?$format=json&$top=5000`,
  ];
  for (const startUrl of tries) {
    const { rows, lastOk, lastStatus } = await fetchAllODataEntityPages(
      (u) => context.request.get(u, { headers: { Accept: 'application/json' }, timeout: 120_000 }),
      startUrl,
    );
    if (lastOk && rows.length > 0) {
      return { idToName: mergeLegalEntityRows(rows), source: `OData LegalEntities (browser cookies) via ${startUrl.split('?')[0]}` };
    }
    if (lastOk && rows.length === 0) {
      logger.warn(`LegalEntities OData returned 200 but 0 rows (${startUrl}) — try another query or check permissions.`);
    } else {
      logger.warn(`LegalEntities OData (browser cookies) failed: HTTP ${lastStatus} for ${startUrl}`);
    }
  }
  return null;
}

async function tryListLegalEntitiesViaSpn(foOrigin: string): Promise<{ idToName: Map<string, string>; source: string } | null> {
  const tid = (process.env.D365_TENANT_ID || '').trim();
  const cid = (process.env.D365_CLIENT_ID || '').trim();
  const sec = (process.env.D365_CLIENT_SECRET || '').trim();
  if (!tid || !cid || !sec) {
    logger.warn('Skipping SPN OData fallback: D365_TENANT_ID / D365_CLIENT_ID / D365_CLIENT_SECRET not all set.');
    return null;
  }
  const odataBase = `${foOrigin.replace(/\/$/, '')}/data`;
  const scope = (process.env.D365_FO_ODATA_SCOPE || '').trim() || fnoOdataScopeFromBaseUrl(odataBase);
  let token: string;
  try {
    const cred = new ClientSecretCredential(tid, cid, sec);
    const t = await cred.getToken(scope);
    if (!t?.token) {
      logger.warn('SPN: no access token for F&O OData scope (check API permissions on the F&O app registration).');
      return null;
    }
    token = t.token;
  } catch (e) {
    logger.warn(`SPN token for F&O OData failed: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
  const tries = [
    `${odataBase}/LegalEntities?$format=json&$top=5000&cross-company=true`,
    `${odataBase}/LegalEntities?$format=json&$top=5000`,
  ];
  for (const startUrl of tries) {
    const { rows, lastOk, lastStatus } = await fetchAllODataEntityPages(async (u) => {
      const res = await fetch(u, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
      return {
        ok: () => res.ok,
        status: () => res.status,
        json: () => res.json(),
      };
    }, startUrl);
    if (lastOk && rows.length > 0) {
      return { idToName: mergeLegalEntityRows(rows), source: `OData LegalEntities (D365_* SPN) via ${startUrl.split('?')[0]}` };
    }
    if (!lastOk) {
      logger.warn(`LegalEntities OData (SPN) failed: HTTP ${lastStatus} for ${startUrl}`);
    }
  }
  return null;
}

async function logLegalEntityDataAreaIds(context: BrowserContext, foOrigin: string): Promise<void> {
  if (!shouldListLegalEntities()) {
    logger.info('Skipping legal entity list (DYNAMICS_FO_LIST_LEGAL_ENTITIES=false).');
    return;
  }
  logger.info('--- F&O legal entities (data area / cmp IDs) ---');
  logger.info(`F&O host: ${foOrigin}`);

  let result = await tryListLegalEntitiesViaBrowserCookies(context, foOrigin);
  if (!result || result.idToName.size === 0) {
    result = await tryListLegalEntitiesViaSpn(foOrigin);
  }
  if (!result || result.idToName.size === 0) {
    logger.warn(
      'Could not retrieve legal entities from OData (browser session and SPN). ' +
        'Confirm LegalEntities is public, cross-company OData is allowed, and the identity has read access.',
    );
    return;
  }

  const ids = [...result.idToName.keys()].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
  logger.info(`Source: ${result.source}`);
  logger.info(`Distinct data area IDs in this environment: ${ids.length}`);
  for (const id of ids) {
    const name = result.idToName.get(id) || '';
    logger.info(name ? `  ${id} — ${name}` : `  ${id}`);
  }
  logger.info('--- end legal entity list ---');
}

async function gotoFo(page: Page, url: string): Promise<void> {
  page.once('dialog', (d) => {
    void d.accept().catch(() => {});
  });
  const ms = parseInt(process.env.D365_UI_GOTO_TIMEOUT_MS || '120000', 10);
  await page.goto(url, { waitUntil: 'commit', timeout: ms });
  await page.waitForLoadState('domcontentloaded', { timeout: ms }).catch(() => {});
}

async function main(): Promise<void> {
  loadEnvFile();

  const manualSso = isManualSsoMode();
  const ssoEmail = resolveManualSsoEmail();

  if (manualSso) {
    if (!ssoEmail) {
      throw new Error('Manual SSO: set DYNAMICS_FO_SSO_EMAIL in .env.<ENV> (your work account, e.g. you@accelins.com).');
    }
    logger.info(`Auth: manual SSO for ${ssoEmail.split('@')[0]}@…`);
  } else {
    if (parseDynamicsUiAuthMode() !== 'interactive') {
      throw new Error(
        'Set DYNAMICS_UI_AUTH_MODE=interactive for Entra password login, or set DYNAMICS_FO_USE_MANUAL_SSO=true for SSO in the browser.',
      );
    }
  }

  const creds = manualSso ? null : getInteractiveDynamicsUiCredentials();
  const entryUrl = resolveFoEntryUrl();
  logger.info(`F&O entry URL: ${entryUrl}`);

  const headless = resolveChromiumHeadless();
  logger.info(headless ? 'Chromium: headless' : 'Chromium: headed (browser window visible)');
  const browser = await chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    await gotoFo(page, entryUrl);

    const manualSsoTimeoutMs = parseInt(process.env.DYNAMICS_FO_MANUAL_SSO_TIMEOUT_MS || '300000', 10);
    const passwordFlowTimeoutMs = parseInt(process.env.D365_UI_LOGIN_TIMEOUT_MS || '180000', 10) + 120000;

    if (manualSso) {
      if (isMicrosoftLoginHost(page.url())) {
        await tryClickEntraSessionTileForEmail(page, ssoEmail);
      }
      if (isMicrosoftLoginHost(page.url())) {
        await trySubmitEntraUsernameOnly(page, ssoEmail);
      }
      logger.info(
        'Complete SSO in the browser (passwordless, Authenticator, password, Stay signed in?, etc.). ' +
          `Waiting up to ${manualSsoTimeoutMs}ms for F&O…`,
      );
      await waitForFoAfterAuth(page, manualSsoTimeoutMs);
    } else {
      if (isMicrosoftLoginHost(page.url())) {
        await completeEntraIdPasswordLoginIfNeeded(page, creds!);
      }
      await waitForFoAfterAuth(page, passwordFlowTimeoutMs);
    }

    await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {});
    const finalUrl = page.url();
    assertUrlHasAumiEntity(finalUrl);

    const foOrigin = foOperationsOriginFromPageUrl(finalUrl);
    await logLegalEntityDataAreaIds(context, foOrigin);

    const shotDir = path.resolve(__dirname, '../reports/screenshots');
    if (!fs.existsSync(shotDir)) fs.mkdirSync(shotDir, { recursive: true });
    const shotPath = path.join(shotDir, `dynamics-fno-aumi-smoke-${Date.now()}.png`);
    await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});
    logger.info(`Screenshot: ${path.relative(process.cwd(), shotPath)}`);
    logger.info(`OK — F&O loaded. Final URL: ${finalUrl}`);
  } finally {
    await browser.close().catch(() => {});
  }
}

main().catch((e) => {
  logger.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
