#!/usr/bin/env ts-node
/** Capture C2C home screenshots for Admin + MRD personas. */
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { SalesforceUIAuth } from '../src/utils/salesforce-auth';
import { config } from '../src/config/config';

const targetEnv = (process.env.ENV || 'c2c').toLowerCase();
dotenv.config({ path: path.resolve(__dirname, '../src/config/env', `.env.${targetEnv}`), override: true });

const PERSONAS = [
  {
    slug: 'Admin',
    username: process.env.SF_JWT_USERNAME || 'qa-automation@accelins.com.c2c',
  },
  {
    slug: 'MRD',
    username: process.env.SF_QAMRDUSER_JWT_USERNAME || 'qa.mrd.user@accelins.com.c2c',
  },
];

function lightBase(): string {
  const base = (config.getSalesforceConfig().baseUrl || '').replace(/\/$/, '');
  return base.replace('.my.salesforce.com', '.lightning.force.com');
}

async function capture(username: string, slug: string, outDir: string): Promise<{ path: string; hasBanner: boolean }> {
  const shotPath = path.join(outDir, `rapiddev-poc-home-${slug}.png`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--ignore-certificate-errors'] });
  try {
    const page = await (await browser.newContext({ viewport: { width: 1920, height: 1080 }, ignoreHTTPSErrors: true })).newPage();
    await SalesforceUIAuth.authenticateWithJWT(page, { username });
    await page.goto(`${lightBase()}/lightning/app/standard__LightningSales`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(3000);
    await page.goto(`${lightBase()}/lightning/page/home`, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(4000);
    const text = await page.locator('body').innerText();
    const hasBanner = /RapidDev:\s*POC/i.test(text);
    await page.screenshot({ path: shotPath });
    return { path: shotPath, hasBanner };
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  const outDir = path.join(process.cwd(), 'reports', 'screenshots', 'sf1093-c2c');
  fs.mkdirSync(outDir, { recursive: true });
  for (const p of PERSONAS) {
    console.log(`Capturing ${p.slug} (${p.username})...`);
    const r = await capture(p.username, p.slug, outDir);
    console.log(`  RapidDev: POC visible: ${r.hasBanner ? 'YES' : 'NO'}`);
    console.log(`  ${r.path}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
