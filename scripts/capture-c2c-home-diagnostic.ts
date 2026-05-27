#!/usr/bin/env ts-node
/**
 * Capture C2C Home screenshot for automation user + diagnose profile/app assignment.
 */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { SalesforceUIAuth } from '../src/utils/salesforce-auth';
import { config } from '../src/config/config';

const targetEnv = (process.env.ENV || 'c2c').toLowerCase();
const envFile = path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  process.env.ENV = targetEnv;
}

const username =
  process.env.SF_ADMIN_JWT_USERNAME ||
  process.env.SF_QAAUTOMATIONUSER_JWT_USERNAME ||
  process.env.SF_JWT_USERNAME ||
  'qa-automation@accelins.com.c2c';

function lightningBaseUrl(): string {
  const sf = config.getSalesforceConfig();
  const base = (sf.baseUrl || process.env.SF_BASE_URL || '').replace(/\/$/, '');
  return base.replace('.my.salesforce.com', '.lightning.force.com');
}

async function queryUserProfile(instanceUrl: string, token: string, uname: string): Promise<void> {
  const apiVer = process.env.SF_API_VERSION || 'v60.0';
  const q = `SELECT Id, Username, Profile.Name, UserRole.Name FROM User WHERE Username = '${uname.replace(/'/g, "\\'")}' LIMIT 1`;
  const url = `${instanceUrl.replace(/\/$/, '')}/services/data/${apiVer}/query?q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } });
  const body = (await res.json()) as { records?: Array<{ Username?: string; Profile?: { Name?: string }; UserRole?: { Name?: string } }> };
  const u = body.records?.[0];
  console.log(`User: ${u?.Username}`);
  console.log(`Profile: ${u?.Profile?.Name ?? 'unknown'}`);
  console.log(`Role: ${u?.UserRole?.Name ?? '(none)'}`);
}

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), 'reports', 'screenshots', 'sf1093-c2c');
  fs.mkdirSync(outDir, { recursive: true });
  const shotPath = path.join(outDir, 'rapiddev-poc-home-diagnostic.png');

  const { SalesforceJWTAuth } = await import('../src/utils/jwt-auth');
  const auth = await SalesforceJWTAuth.authenticate();
  console.log(`\n=== User / profile ===`);
  await queryUserProfile(auth.instanceUrl, auth.accessToken, username);

  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--disable-blink-features=AutomationControlled', '--ignore-certificate-errors'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();
    const lightBase = lightningBaseUrl();

    console.log(`\n=== UI login as ${username} ===`);
    await SalesforceUIAuth.authenticateWithJWT(page, { username });

    // Try Sales app first (where profile home overrides are configured)
    const salesAppUrl = `${lightBase}/lightning/app/standard__LightningSales`;
    await page.goto(salesAppUrl, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);

    const homeTab = page.locator('one-app-nav-bar-item-root a').filter({ hasText: /^Home$/i }).first();
    if (await homeTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await homeTab.click();
      await page.waitForTimeout(3000);
    }

    const pageText = await page.locator('body').innerText().catch(() => '');
    const hasRapidDev = /RapidDev:\s*POC/i.test(pageText);
    const hasOldBanner = /MRD Home|Admin Home|Standard User Home|SF-1093 Role-Based/i.test(pageText);

    console.log(`\n=== Home page content check ===`);
    console.log(`  "RapidDev: POC" visible: ${hasRapidDev ? 'YES' : 'NO'}`);
    console.log(`  Old SF-1093 banner visible: ${hasOldBanner ? 'YES' : 'NO'}`);

    // Also try generic home URL
    if (!hasRapidDev) {
      console.log(`  Trying /lightning/page/home ...`);
      await page.goto(`${lightBase}/lightning/page/home`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(3000);
      const pageText2 = await page.locator('body').innerText().catch(() => '');
      console.log(`  "RapidDev: POC" on /page/home: ${/RapidDev:\s*POC/i.test(pageText2) ? 'YES' : 'NO'}`);
    }

    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`\nScreenshot saved: ${shotPath}`);
    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
