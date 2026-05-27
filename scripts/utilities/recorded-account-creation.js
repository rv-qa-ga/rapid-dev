const { chromium } = require('playwright');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../src/config/env/.env.qa') });

/**
 * WARNING: This is a recorded Playwright script for account creation.
 * Credentials are loaded from environment variables to avoid exposing secrets.
 * 
 * Required environment variables:
 * - SF_USERNAME (or SF_JWT_USERNAME for JWT auth - recommended)
 * - SF_PASSWORD (if using password auth)
 * - SF_SECURITY_TOKEN (if using password auth)
 * - SF_VERIFICATION_CODE (if MFA verification is required)
 */

(async () => {
  // Load credentials from environment variables
  const username = process.env.SF_USERNAME || process.env.SF_JWT_USERNAME;
  const password = process.env.SF_PASSWORD;
  const securityToken = process.env.SF_SECURITY_TOKEN || '';
  const verificationCode = process.env.SF_VERIFICATION_CODE;
  const baseUrl = process.env.SF_BASE_URL || 'https://arx--qa.sandbox.my.salesforce.com';

  if (!username) {
    throw new Error('SF_USERNAME or SF_JWT_USERNAME must be set in environment variables');
  }

  const browser = await chromium.launch({
    headless: false
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${baseUrl}/`);
  await page.getByRole('textbox', { name: 'Username' }).click();
  await page.getByRole('textbox', { name: 'Username' }).fill(username);
  await page.getByRole('textbox', { name: 'Username' }).press('Tab');
  
  if (password) {
    await page.getByRole('textbox', { name: 'Password' }).fill(password + securityToken);
    await page.getByRole('textbox', { name: 'Password' }).press('Enter');
    await page.getByRole('button', { name: 'Log In to Sandbox' }).click();
    
    // Handle MFA verification if code is provided
    if (verificationCode) {
      await page.getByRole('textbox', { name: 'Verification Code' }).click();
      await page.getByRole('textbox', { name: 'Verification Code' }).click();
      await page.getByRole('textbox', { name: 'Verification Code' }).fill(verificationCode);
      await page.getByRole('button', { name: 'Verify' }).click();
    }
  } else {
    console.warn('WARNING: SF_PASSWORD not set. Consider using JWT authentication instead.');
    throw new Error('Password authentication requires SF_PASSWORD environment variable');
  }
  await page.goto('https://arx--qa.sandbox.lightning.force.com/lightning/r/Account/001DN00000IlOIkYAN/view');
  await page.getByRole('link', { name: 'Accounts' }).click();
  await page.getByText('All Accounts').click();
  await page.getByTitle('All Accounts').click();
  await page.getByRole('button', { name: 'New' }).click();
  await page.locator('.slds-radio--faux').first().click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('textbox', { name: 'Account Name' }).click();
  await page.getByRole('textbox', { name: 'Account Name' }).fill('TEST Name');
  await page.getByRole('textbox', { name: 'Account Number' }).click();
  await page.getByRole('textbox', { name: 'Account Number' }).fill('ACC NUMBER');
  await page.getByRole('combobox', { name: 'Account Status' }).click();
  await page.locator('.slds-input__icon > span > lightning-primitive-icon > .slds-icon > g > path').first().click();
  await page.locator('#combobox-button-585-1-585').getByText('New', { exact: true }).click();
  await page.locator('.slds-input__icon > span > lightning-primitive-icon > .slds-icon > g > path').first().click();
  await page.getByText('Prospect', { exact: true }).click();
  await page.getByText('Prospect', { exact: true }).click();
  await page.locator('span').filter({ hasText: 'Prospect' }).nth(1).click();
  await page.locator('.slds-input__icon > span > lightning-primitive-icon > .slds-icon').first().click();
  await page.getByRole('option', { name: 'Contracted' }).click();
  await page.locator('.slds-input__icon > span > lightning-primitive-icon > .slds-icon').first().click();
  await page.getByRole('option', { name: 'Active' }).click();
  await page.getByRole('combobox', { name: 'Account Status' }).click();
  await page.getByRole('option', { name: 'Runoff' }).dblclick();
  await page.locator('.slds-input__icon > span > lightning-primitive-icon > .slds-icon').first().click();
  await page.getByRole('option', { name: 'Offboarded' }).click();
  await page.getByRole('combobox', { name: 'Primary Contact' }).click();
  await page.locator('.slds-media__figure > .slds-icon-utility-add > span > lightning-primitive-icon > .slds-icon').click();
  await page.getByRole('combobox', { name: 'Salutation' }).click();
  await page.getByRole('option', { name: 'Mr.' }).click();
  await page.getByRole('textbox', { name: 'First Name' }).click();
  await page.getByRole('textbox', { name: 'First Name' }).fill('dd');
  await page.getByRole('textbox', { name: 'Middle Name' }).click();
  await page.getByRole('textbox', { name: 'Middle Name' }).fill('ddd');
  await page.getByRole('textbox', { name: 'Last Name' }).click();
  await page.getByRole('textbox', { name: 'Last Name' }).fill('ddd');
  await page.getByRole('textbox', { name: 'Suffix' }).click();
  await page.getByRole('textbox', { name: 'Suffix' }).fill('sr');
  await page.getByRole('combobox', { name: 'Account Name' }).click();
  await page.locator('.slds-media__figure > .slds-icon-standard-account > span > lightning-primitive-icon > .slds-icon').click();
  await page.getByRole('textbox', { name: 'Party Code' }).click();
  await page.getByRole('textbox', { name: 'Party Code' }).fill('TTE');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('textbox', { name: 'Phone' }).click();
  await page.getByRole('textbox', { name: 'Phone' }).fill('phone');
  await page.getByRole('textbox', { name: 'Phone' }).press('Tab');
  await page.getByRole('combobox', { name: 'Parent Account' }).click();
  await page.getByRole('combobox', { name: 'Parent Account' }).fill('parent account');
  await page.getByRole('combobox', { name: 'Parent Account' }).click();
  await page.locator('#brandBand_3').getByText('Parent Account', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Parent Account' }).fill('');
  await page.getByLabel('Recent Accounts').getByText('Ravi Test Insurer').click();
  await page.locator('span').filter({ hasText: 'Ravi Test Insurer' }).nth(5).click();
  await page.getByRole('textbox', { name: 'Fax' }).fill('fax');
  await page.getByText('*Type').click();
  await page.getByRole('option', { name: 'Agency', exact: true }).click();
  await page.getByRole('combobox', { name: 'Type' }).click();
  await page.getByRole('option', { name: 'Agency Branch' }).click();
  await page.getByRole('combobox', { name: 'Type' }).click();
  await page.getByRole('option', { name: 'Group' }).click();
  await page.getByRole('combobox', { name: 'Type' }).click();
  await page.getByRole('option', { name: 'Insurer Branch', exact: true }).click();
  await page.getByRole('combobox', { name: 'Type' }).click();
  await page.getByRole('option', { name: 'Legal Entity' }).click();
  await page.getByRole('combobox', { name: 'Type' }).click();
  await page.getByRole('option', { name: 'Reinsurer Branch' }).click();
  await page.getByRole('combobox', { name: 'Region', exact: true }).click();
  await page.getByRole('option', { name: 'US' }).click();
  await page.getByRole('combobox', { name: 'Region', exact: true }).click();
  await page.getByRole('option', { name: 'UK' }).click();
  await page.getByRole('combobox', { name: 'Region', exact: true }).click();
  await page.getByRole('option', { name: 'EU' }).click();
  await page.getByRole('combobox', { name: 'Region', exact: true }).click();
  await page.getByRole('option', { name: 'ROW' }).click();
  await page.getByText('ROW', { exact: true }).click();
  await page.getByRole('combobox', { name: 'Region', exact: true }).click();
  await page.getByRole('option', { name: 'CA', exact: true }).click();
  await page.getByText('*State/Province').click();
  await page.getByText('Alberta').click();
  await page.getByLabel('*State/Province').getByRole('button', { name: 'Move to Chosen' }).click();
  await page.getByRole('textbox', { name: 'Website' }).click();
  await page.getByRole('textbox', { name: 'Website' }).fill('website');
  await page.getByRole('textbox', { name: 'Website' }).press('Tab');
  await page.getByRole('textbox', { name: 'Ticker Symbol' }).click();
  await page.getByRole('textbox', { name: 'Ticker Symbol' }).fill('ticket symbol');
  await page.getByRole('combobox', { name: 'Distribution Region' }).click();
  await page.getByRole('combobox', { name: 'Distribution Region' }).click();
  await page.getByRole('option', { name: 'US' }).click();
  await page.getByRole('combobox', { name: 'Affiliate/Non-Affiliate' }).click();
  await page.getByRole('option', { name: 'NAF' }).click();
  await page.getByRole('combobox', { name: 'Functional Currency' }).click();
  await page.getByRole('option', { name: 'EUR' }).click();
  await page.getByRole('combobox', { name: 'Industry' }).click();
  await page.getByRole('option', { name: 'Communications', exact: true }).click();
  await page.getByRole('spinbutton', { name: 'Employees' }).click();
  await page.getByRole('spinbutton', { name: 'Employees' }).fill('123');
  await page.getByRole('spinbutton', { name: 'Annual Revenue' }).click();
  await page.getByRole('spinbutton', { name: 'Annual Revenue' }).fill('333333');
  await page.getByRole('combobox', { name: 'Data Source - Written' }).click();
  await page.getByRole('combobox', { name: 'Data Source - Written' }).click();
  await page.getByText('VIPR').click();
  await page.getByRole('combobox', { name: 'Data Source - Claims' }).click();
  await page.getByRole('option', { name: 'VIPR' }).click();
  await page.getByRole('combobox', { name: 'Address Search' }).click();
  await page.getByRole('textbox', { name: 'Billing Street' }).click();
  await page.getByRole('textbox', { name: 'Billing City' }).click();
  await page.getByRole('textbox', { name: 'Billing State/Province' }).click();
  await page.getByRole('textbox', { name: 'Billing Zip/Postal Code' }).click();
  await page.getByRole('textbox', { name: 'Billing Country' }).click();
  await page.getByRole('combobox', { name: 'Investment Status' }).click();
  await page.getByText('Non-owned').click();
  await page.getByRole('textbox', { name: 'Onboarded Date' }).click();
  await page.getByRole('button', { name: '23' }).click();
  await page.getByRole('gridcell', { name: '-12-25' }).click();
  await page.getByRole('textbox', { name: 'Reinsurance Arrangements' }).click();
  await page.getByRole('spinbutton', { name: 'FOS/FSCS Exposure (%)' }).click();
  await page.getByRole('spinbutton', { name: 'FOS/FSCS Exposure (%)' }).fill('');
  await page.getByRole('textbox', { name: 'Member Previously Known As' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.close();

  // ---------------------
  await context.close();
  await browser.close();
})();