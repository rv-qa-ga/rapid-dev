/**
 * ╔═══════════════════════════════════════════════════════════════════════════╗
 * ║                    ⚠️  STABLE - DO NOT MODIFY  ⚠️                          ║
 * ╠═══════════════════════════════════════════════════════════════════════════╣
 * ║  These UI-specific login step definitions are LOCKED.                     ║
 * ║  Last verified: 2025-11-29                                                ║
 * ║                                                                           ║
 * ║  Common authentication steps are in:                                      ║
 * ║  - src/step-definitions/common/authentication.steps.ts                  ║
 * ║                                                                           ║
 * ║  Related files that should also remain stable:                            ║
 * ║  - src/page-objects/salesforce/HomePage.ts (login methods)                ║
 * ║  - src/features/ui/General/login.feature                                  ║
 * ╚═══════════════════════════════════════════════════════════════════════════╝
 */

import { When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { HomePage } from '../../../page-objects/salesforce/HomePage';
import { logger } from '../../../utils/logger';

// Note: Authentication steps are in common/authentication.steps.ts
// This file only contains UI-specific navigation steps

/**
 * Step: Open the App Launcher
 */
When('I open the App Launcher', async function (this: AutomationWorld) {
  // Log current user context
  const userId = this.testContext.userId || 
                 (this.testContext.authResult?.id ? this.testContext.authResult.id.split('/').pop() : 'Unknown');
  const username = this.testContext.username || 
                   this.testContext.requestedRole || 
                   (this.testContext.authResult ? 'Authenticated User' : 'Unknown');
  const userType = this.testContext.userType || 'Unknown';
  const userRole = this.testContext.requestedRole || 'Default';
  
  logger.info(`🔍 Opening App Launcher`);
  logger.info(`   User Role: ${userRole}`);
  logger.info(`   User Type: ${userType}`);
  logger.info(`   Username: ${username}`);
  logger.info(`   User ID: ${userId}`);
  
  const homePage = new HomePage(this.page);
  await homePage.openAppLauncher();
  
  logger.info(`✅ App Launcher opened`);
  logger.info(`   User ID: ${userId} | Username: ${username} | Role: ${userRole}`);
});

/**
 * Step: Navigate to Accelerant Console via App Launcher search
 */
When('I navigate to the Accelerant Console', async function (this: AutomationWorld) {
  // Log current user context
  const userId = this.testContext.userId || 
                 (this.testContext.authResult?.id ? this.testContext.authResult.id.split('/').pop() : 'Unknown');
  const username = this.testContext.username || 
                   this.testContext.requestedRole || 
                   (this.testContext.authResult ? 'Authenticated User' : 'Unknown');
  const userType = this.testContext.userType || 'Unknown';
  const userRole = this.testContext.requestedRole || 'Default';
  
  logger.info(`📍 Navigating to Accelerant Console`);
  logger.info(`   User Role: ${userRole}`);
  logger.info(`   User Type: ${userType}`);
  logger.info(`   Username: ${username}`);
  logger.info(`   User ID: ${userId}`);
  
  const homePage = new HomePage(this.page);
  await homePage.openAccelerantConsole();
  
  logger.info(`✅ Navigation to Accelerant Console completed`);
  logger.info(`   User ID: ${userId} | Username: ${username} | Role: ${userRole}`);
});

/**
 * Step: Verify Accelerant Console is loaded
 */
Then('the Accelerant Console should be loaded', async function (this: AutomationWorld) {
  // Log current user context
  const userId = this.testContext.userId || 
                 (this.testContext.authResult?.id ? this.testContext.authResult.id.split('/').pop() : 'Unknown');
  const username = this.testContext.username || 
                   this.testContext.requestedRole || 
                   (this.testContext.authResult ? 'Authenticated User' : 'Unknown');
  const userType = this.testContext.userType || 'Unknown';
  const userRole = this.testContext.requestedRole || 'Default';
  
  logger.info(`🔍 Verifying Accelerant Console is loaded`);
  logger.info(`   User Role: ${userRole}`);
  logger.info(`   User Type: ${userType}`);
  logger.info(`   Username: ${username}`);
  logger.info(`   User ID: ${userId}`);
  
  const homePage = new HomePage(this.page);
  const loaded = await homePage.isAccelerantConsoleLoaded();
  if (!loaded) {
    throw new Error(`Accelerant Console did not finish loading (User ID: ${userId}, Username: ${username}, Role: ${userRole})`);
  }
  logger.info(`✅ Accelerant Console loaded successfully`);
  logger.info(`   User ID: ${userId} | Username: ${username} | Role: ${userRole}`);
});

/**
 * Step: Log out from Salesforce
 */
Then('I log out successfully', async function (this: AutomationWorld) {
  // Log current user context before logout
  const userId = this.testContext.userId || 
                 (this.testContext.authResult?.id ? this.testContext.authResult.id.split('/').pop() : 'Unknown');
  const username = this.testContext.username || 
                   this.testContext.requestedRole || 
                   (this.testContext.authResult ? 'Authenticated User' : 'Unknown');
  const userType = this.testContext.userType || 'Unknown';
  const userRole = this.testContext.requestedRole || 'Default';
  const profileName = this.testContext.profileName || 'Unknown';
  
  logger.info(`🚪 Logging out from Salesforce`);
  logger.info(`   User Role: ${userRole}`);
  logger.info(`   User Type: ${userType}`);
  logger.info(`   Username: ${username}`);
  logger.info(`   User ID: ${userId}`);
  logger.info(`   Profile: ${profileName}`);
  
  const homePage = new HomePage(this.page);
  await homePage.logout();

  // Confirm logout by detecting the login page username field
  try {
    await this.page.waitForSelector('#username', { timeout: 30000 });
    logger.info(`✅ Logged out successfully`);
    logger.info(`   User ID: ${userId} | Username: ${username} | Role: ${userRole} | Profile: ${profileName}`);
    logger.info(`   Login page displayed`);
  } catch {
    logger.warn(`⚠️  Could not confirm logout via login page selector`);
    logger.warn(`   User ID: ${userId} | Username: ${username} | Role: ${userRole}`);
  }
});

