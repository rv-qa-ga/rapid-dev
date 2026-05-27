#!/usr/bin/env ts-node
/**
 * SF-1093 — Capture Lightning Home screenshots per QA persona (c2c).
 *
 * Usage:
 *   ENV=c2c npx ts-node scripts/sf1093-c2c-home-screenshots.ts
 *   ENV=c2c npx ts-node scripts/sf1093-c2c-home-screenshots.ts --only=MRD,Actuary
 *
 * Output: reports/screenshots/sf1093-c2c-home-<Persona>.png
 */

import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { SalesforceUIAuth } from '../src/utils/salesforce-auth';
import { config } from '../src/config/config';

const ONLY = process.argv.find((a) => a.startsWith('--only='))?.split('=')[1];
const targetEnv = (process.env.ENV || 'c2c').toLowerCase();
const envFile = path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`);
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile, override: true });
  process.env.ENV = targetEnv;
}

const SALES_APP = 'standard__LightningSales';

interface PersonaCapture {
  slug: string;
  label: string;
  username: string;
  expectedHomeLabel: string;
  profileName: string;
}

const PERSONAS: PersonaCapture[] = [
  {
    slug: 'MRD',
    label: 'MRD',
    username: process.env.SF_QAMRDUSER_JWT_USERNAME || 'qa.mrd.user@accelins.com.c2c',
    expectedHomeLabel: 'MRD Home',
    profileName: 'Accelerant - Basic User',
  },
  {
    slug: 'Standard-User',
    label: 'Standard User',
    username: process.env.SF_STANDARDUSER_JWT_USERNAME || 'qa.standard.user@accelins.com.c2c',
    expectedHomeLabel: 'Standard User Home',
    profileName: 'Accelerant - System Administrator',
  },
  {
    slug: 'Non-Admin-User',
    label: 'Non-Admin User',
    username: process.env.SF_NONADMINUSER_JWT_USERNAME || 'qa.ui.nonadmin@accelins.com.c2c',
    expectedHomeLabel: 'Non-Admin User Home',
    profileName: 'Accelerant - Standard User',
  },
  {
    slug: 'Actuary',
    label: 'Actuary',
    username: process.env.SF_QAACTUARYUSER_JWT_USERNAME || 'qa.actuary@accelins.com.c2c',
    expectedHomeLabel: 'MRD Home',
    profileName: 'Accelerant - Basic User (shared → MRD Home)',
  },
  {
    slug: 'Data-Governance',
    label: 'Data Governance',
    username: process.env.SF_DATAGOVERNANCEUSER_JWT_USERNAME || 'datastewardqa@accelins.com.c2c',
    expectedHomeLabel: 'MRD Home',
    profileName: 'Accelerant - Basic User (shared → MRD Home)',
  },
  {
    slug: 'Admin',
    label: 'Admin / Automation',
    username:
      process.env.SF_ADMIN_JWT_USERNAME ||
      process.env.SF_QAAUTOMATIONUSER_JWT_USERNAME ||
      'qa-automation@accelins.com.c2c',
    expectedHomeLabel: 'Admin Home',
    profileName: 'System Administrator',
  },
];

function lightningBaseUrl(): string {
  const sf = config.getSalesforceConfig();
  const base = (sf.baseUrl || process.env.SF_BASE_URL || '').replace(/\/$/, '');
  return base.replace('.my.salesforce.com', '.lightning.force.com');
}

async function waitForHomeReady(page: import('playwright').Page, expectedLabel: string): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const selectors = [
    'one-appnav',
    '.desktopContainer',
    'runtime_sales_home',
    'flexipage-component2',
  ];
  for (const sel of selectors) {
    await page.locator(sel).first().waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
  }

  // Role banner from SF-1093 FlexiPages (title or subtitle)
  const banner = page.getByText(/SF-1093 Role-Based Lightning Home|MRD Home|Standard User Home|Non-Admin User Home|Admin Home/i);
  await banner.first().waitFor({ state: 'visible', timeout: 60000 }).catch(() => {});

  await page.waitForTimeout(1500);
}

async function capturePersona(
  persona: PersonaCapture,
  outDir: string
): Promise<{ path: string; ok: boolean; note?: string }> {
  const shotPath = path.join(outDir, `sf1093-c2c-home-${persona.slug}.png`);
  const headless = process.env.HEADLESS !== 'false';
  const browser = await chromium.launch({
    channel: 'chrome',
    headless,
    args: ['--disable-blink-features=AutomationControlled', '--ignore-certificate-errors'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      ignoreHTTPSErrors: true,
      locale: 'en-US',
    });
    const page = await context.newPage();
    const lightBase = lightningBaseUrl();

    console.log(`\n📸 ${persona.label} (${persona.username})`);
    console.log(`   Profile: ${persona.profileName}`);
    console.log(`   Expected banner: ${persona.expectedHomeLabel}`);

    await SalesforceUIAuth.authenticateWithJWT(page, { username: persona.username });

    const appUrl = `${lightBase}/lightning/app/${SALES_APP}`;
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(2500);

    // Open Home tab inside Sales app (profile overrides are app-scoped)
    const homeTab = page.locator('one-app-nav-bar-item-root a').filter({ hasText: /^Home$/i }).first();
    if (await homeTab.isVisible({ timeout: 8000 }).catch(() => false)) {
      await homeTab.click();
      await page.waitForTimeout(2000);
    } else {
      const homeUrl = `${lightBase}/lightning/page/home`;
      await page.goto(homeUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    }

    await waitForHomeReady(page, persona.expectedHomeLabel);

    const hasBanner = await page
      .getByText(/SF-1093 Role-Based Lightning Home|MRD Home|Standard User Home|Non-Admin User Home|Admin Home/i)
      .first()
      .isVisible()
      .catch(() => false);
    await page.screenshot({ path: shotPath, fullPage: false, timeout: 30000 });

    const note = hasBanner ? undefined : `Banner "${persona.expectedHomeLabel}" not detected — screenshot saved anyway`;
    if (note) console.log(`   ⚠️  ${note}`);
    else console.log(`   ✅ Saved ${shotPath}`);

    await context.close();
    return { path: shotPath, ok: true, note };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`   ❌ Failed: ${msg.slice(0, 200)}`);
    return { path: shotPath, ok: false, note: msg };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function main(): Promise<void> {
  console.log(`SF-1093 c2c home screenshots — ENV=${targetEnv}`);

  const outDir = path.join(process.cwd(), 'reports', 'screenshots', 'sf1093-c2c');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const onlyArg = ONLY?.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  const personas = onlyArg?.length
    ? PERSONAS.filter(
        (p) =>
          onlyArg.includes(p.slug.toLowerCase()) ||
          onlyArg.includes(p.label.toLowerCase()) ||
          onlyArg.includes(p.label.toLowerCase().replace(/\s+/g, '-'))
      )
    : PERSONAS;
  if (personas.length === 0) {
    console.error(`No persona matched --only=${ONLY}`);
    process.exit(1);
  }

  const results: { persona: string; path: string; ok: boolean; note?: string }[] = [];
  for (const persona of personas) {
    const r = await capturePersona(persona, outDir);
    results.push({ persona: persona.label, path: r.path, ok: r.ok, note: r.note });
  }

  const summaryPath = path.join(outDir, `sf1093-c2c-home-screenshots-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.txt`);
  const lines = [
    `SF-1093 c2c home screenshots — ${new Date().toISOString()}`,
    `Sales app: ${SALES_APP}`,
    '',
    ...results.map((r) => `${r.ok ? 'OK' : 'FAIL'} | ${r.persona} | ${r.path}${r.note ? ` | ${r.note}` : ''}`),
  ];
  fs.writeFileSync(summaryPath, lines.join('\n'), 'utf-8');

  console.log(`\n=== Summary ===`);
  for (const r of results) {
    console.log(`  ${r.ok ? '✅' : '❌'} ${r.persona} → ${path.relative(process.cwd(), r.path)}`);
  }
  console.log(`\nSummary file: ${summaryPath}`);

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
