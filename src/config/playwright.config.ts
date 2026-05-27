import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { config } from './config';

const authFile = path.join(__dirname, '../../playwright/.auth/user.json');
const sfConfig = config.getSalesforceConfig();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'reports/playwright-report' }],
    ['json', { outputFile: 'reports/json/playwright-report.json' }],
  ],
  use: {
    baseURL: sfConfig.baseUrl,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1920, height: 1080 },
    channel: 'chrome',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9',
    },
    ...(fs.existsSync(authFile) ? { storageState: authFile } : {}),
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        viewport: { width: 1920, height: 1080 },
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation'],
        ignoreHTTPSErrors: true,
      },
    },
  ],
});

