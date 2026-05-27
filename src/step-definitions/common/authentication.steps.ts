/**
 * Common Authentication Steps
 * 
 * Reusable authentication steps for both UI and API tests
 */

import { Given } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { SalesforceUIAuth } from '../../utils/salesforce-auth';
import { SalesforceUserService } from '../../utils/salesforce-user';
import { SalesforceAPIClient } from '../../api-clients/salesforce/SalesforceAPIClient';
import { logger } from '../../utils/logger';
import { reporter } from '../../utils/reporter';
import { config } from '../../config/config';
import { getUserRoleCredentials, resolveRoleName, hasRoleCredentials } from '../../utils/user-role-config';

/**
 * Log environment context (URL, username, profile)
 * Used by both UI and API tests
 */
Given('I log the environment context', function (this: AutomationWorld) {
  const envName = config.getEnvironment();
  const baseUrl = config.getSalesforceConfig().baseUrl;
  const username = process.env.SF_USERNAME || process.env.SF_JWT_USERNAME || 'Not configured';

  logger.info(`Environment: ${envName.toUpperCase()}`);
  logger.info(`Environment URL: ${baseUrl}`);
  logger.info(`Test User: ${username}`);

  reporter.setEnvironmentContext({
    environment: envName,
    baseUrl,
    username,
  });
});

/**
 * Log environment context and authenticate as a specific user role
 * Combines logging and authentication for role-based scenarios
 * 
 * Usage:
 *   Given I log the environment as "MRD User"
 *   Given I log the environment as "Standard User"
 *   Given I log the environment as "Non-Admin User"
 */
Given('I log the environment as {string}', async function (this: AutomationWorld, userRole: string) {
  // Browser should be initialized by Before hook
  if (!this.page || this.page.isClosed()) {
    throw new Error('Page not initialized. Browser should be initialized by Before hook.');
  }

  const envName = config.getEnvironment();
  const baseUrl = config.getSalesforceConfig().baseUrl;

  // Get the mapped Salesforce user role
  const { getSFUserRoleFromJira } = await import('../../utils/user-role-mapping');
  const { resolveRoleName, getUserRoleCredentials } = await import('../../utils/user-role-config');
  
  // Map Jira mention to SF user role
  const sfUserRole = getSFUserRoleFromJira(userRole) || userRole;
  const normalizedRole = resolveRoleName(sfUserRole);
  
  // Get credentials for this role
  const credentials = getUserRoleCredentials(sfUserRole);
  const username = credentials.jwtUsername || credentials.username || 'Not configured';

  // Log environment context
  logger.info('═══════════════════════════════════════════════════════════════');
  logger.info(`🔐 USER AUTHENTICATION CONTEXT`);
  logger.info(`═══════════════════════════════════════════════════════════════`);
  logger.info(`Environment: ${envName.toUpperCase()}`);
  logger.info(`Environment URL: ${baseUrl}`);
  logger.info(`Requested Role: ${userRole}`);
  logger.info(`Mapped SF Role: ${sfUserRole}`);
  logger.info(`Normalized Role: ${normalizedRole}`);
  logger.info(`User ID/Username: ${username}`);
  logger.info(`Authentication Method: ${credentials.jwtUsername ? 'JWT' : credentials.username ? 'Password' : 'Not configured'}`);
  logger.info(`═══════════════════════════════════════════════════════════════`);

  reporter.setEnvironmentContext({
    environment: envName,
    baseUrl,
    username,
    userRole: sfUserRole,
    requestedRole: userRole,
  });

  // Authenticate as the specified user
  if (credentials.jwtUsername) {
    logger.info(`Authenticating as ${sfUserRole} using JWT: ${credentials.jwtUsername}`);
    try {
      const authResult = await SalesforceUIAuth.authenticateWithJWT(this.page, {
        username: credentials.jwtUsername,
      });
      this.testContext.authResult = authResult;
      this.testContext.userType = normalizedRole.toLowerCase();
      this.testContext.requestedRole = userRole;
      
      // CRITICAL: Verify authentication completed - check we're not on login page
      const currentUrl = this.page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('login.salesforce.com')) {
        logger.error('Authentication failed - still on login page after authentication');
        throw new Error(`Authentication incomplete - still on login page. Check JWT credentials and cookie settings.`);
      }
      
      // Wait a moment for page to fully load
      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        logger.warn('Network idle timeout - continuing anyway');
      });
      
      // Double-check we're logged in
      const finalUrl = this.page.url();
      if (finalUrl.includes('/login') || finalUrl.includes('login.salesforce.com')) {
        logger.error('Authentication failed - redirected back to login page');
        throw new Error(`Authentication failed - redirected to login page. URL: ${finalUrl}`);
      }
      
      logger.info(`✅ Authentication verified - on Salesforce domain: ${finalUrl}`);
      
      // Fetch and log user profile
      try {
        const { SalesforceUserService } = await import('../../utils/salesforce-user');
        const profileInfo = await SalesforceUserService.fetchUserProfile(
          authResult.accessToken,
          authResult.instanceUrl,
          credentials.jwtUsername
        );
        if (profileInfo) {
          logger.info(`✅ Authenticated as ${sfUserRole}`);
          logger.info(`   User ID: ${profileInfo.userId}`);
          logger.info(`   Username: ${credentials.jwtUsername}`);
          logger.info(`   Profile: ${profileInfo.profileName} (ID: ${profileInfo.profileId})`);
          
          // Store in testContext for later use
          this.testContext.username = credentials.jwtUsername;
          this.testContext.userId = profileInfo.userId;
          this.testContext.profileName = profileInfo.profileName;
          this.testContext.profileId = profileInfo.profileId;
          
          reporter.setEnvironmentContext({ 
            userProfile: profileInfo.profileName,
            userId: profileInfo.userId,
            profileId: profileInfo.profileId,
          });
        }
      } catch (profileError: any) {
        logger.warn(`Could not fetch user profile: ${profileError.message}`);
        logger.info(`✅ Authenticated as ${sfUserRole} (username: ${credentials.jwtUsername})`);
      }
    } catch (jwtError: any) {
      logger.error(`JWT authentication failed for ${sfUserRole}: ${jwtError.message}`);
      throw new Error(`Failed to authenticate as ${sfUserRole}: ${jwtError.message}`);
    }
  } else if (credentials.username && credentials.password) {
    logger.info(`Authenticating as ${sfUserRole} using password: ${credentials.username}`);
    try {
      const authResult = await SalesforceUIAuth.authenticateWithPassword(this.page, {
        username: credentials.username,
        password: credentials.password,
        securityToken: credentials.securityToken || '',
      });
      this.testContext.authResult = authResult;
      this.testContext.userType = normalizedRole.toLowerCase();
      this.testContext.requestedRole = userRole;
      this.testContext.username = credentials.username;
      this.testContext.userId = authResult.id?.split('/').pop() || 'Unknown';
      logger.info(`✅ Authenticated as ${sfUserRole} (username: ${credentials.username})`);
    } catch (pwdError: any) {
      logger.error(`Password authentication failed for ${sfUserRole}: ${pwdError.message}`);
      throw new Error(`Failed to authenticate as ${sfUserRole}: ${pwdError.message}`);
    }
  } else {
    const envFileHint = `src/config/env/.env.${envName}`;
    const jwtKey = `SF_${normalizedRole}_JWT_USERNAME`;
    const usernameKey = `SF_${normalizedRole}_USERNAME`;
    throw new Error(
      `Credentials not configured for ${sfUserRole}. ` +
      `Please configure ${jwtKey} or ${usernameKey} in ${envFileHint}`
    );
  }
});

/**
 * Authenticate Salesforce user (UI)
 * Uses JWT authentication and fetches user profile
 */
Given('I am an authenticated Salesforce user', async function (this: AutomationWorld) {
  // Browser should be initialized by Before hook - verify it's available
  if (!this.page || this.page.isClosed()) {
    throw new Error('Page not initialized or closed. Browser should be initialized by Before hook before authentication step.');
  }

  logger.info('Authenticating using JWT...');
  let authResult;
  try {
    authResult = await SalesforceUIAuth.authenticateWithJWT(this.page);
    logger.info('JWT authentication successful');
  } catch (jwtError: any) {
    logger.error(`JWT authentication failed: ${jwtError.message}`);
    const envName = config.getEnvironment();
    throw new Error(
      `JWT authentication is required. Please configure JWT credentials in src/config/env/.env.${envName}. Error: ${jwtError.message}`
    );
  }

  this.testContext.authResult = authResult;

  // Verify login - with error handling for page closure
  try {
    if (this.page.isClosed()) {
      logger.warn('Page closed after authentication, skipping login verification');
      return;
    }

    const { HomePage } = await import('../../page-objects/salesforce/HomePage');
    const homePage = new HomePage(this.page);
    const isLoggedIn = await homePage.isLoggedIn();

    if (!isLoggedIn) {
      logger.warn('Login verification failed, but continuing (may be false negative)');
    }
  } catch (verifyError: any) {
    logger.warn(`Login verification failed: ${verifyError.message}, but continuing`);
  }

  // Fetch and log user profile from Salesforce API
  const username = process.env.SF_JWT_USERNAME || process.env.SF_USERNAME || '';
  if (username && authResult) {
    try {
      const profileInfo = await SalesforceUserService.fetchUserProfile(
        authResult.accessToken,
        authResult.instanceUrl,
        username
      );
      if (profileInfo) {
        logger.info(`📋 Salesforce User Profile Details:`);
        logger.info(`   User ID: ${profileInfo.userId}`);
        logger.info(`   Username: ${username}`);
        logger.info(`   Profile: ${profileInfo.profileName} (Profile ID: ${profileInfo.profileId})`);
        
        // Store in testContext for later use
        this.testContext.username = username;
        this.testContext.userId = profileInfo.userId;
        this.testContext.profileName = profileInfo.profileName;
        this.testContext.profileId = profileInfo.profileId;
        this.testContext.userRole = 'Default'; // Default role when not specified
        this.testContext.userType = 'default';
        
        reporter.setEnvironmentContext({ 
          userProfile: profileInfo.profileName,
          userId: profileInfo.userId,
          profileId: profileInfo.profileId,
          username: username,
        });
      } else {
        logger.warn('Could not fetch user profile from Salesforce.');
        // Set basic info even if profile fetch fails
        this.testContext.username = username;
        this.testContext.userId = authResult.id?.split('/').pop() || 'Unknown';
        this.testContext.userRole = 'Default';
        this.testContext.userType = 'default';
      }
    } catch (profileError: any) {
      logger.warn(`Could not fetch user profile: ${profileError.message}`);
      // Set basic info even if profile fetch fails
      this.testContext.username = username;
      this.testContext.userId = authResult.id?.split('/').pop() || 'Unknown';
      this.testContext.userRole = 'Default';
      this.testContext.userType = 'default';
    }
  } else {
    // Fallback if username not available
    this.testContext.username = 'Authenticated User';
    this.testContext.userId = authResult.id?.split('/').pop() || 'Unknown';
    this.testContext.userRole = 'Default';
    this.testContext.userType = 'default';
  }
});

/**
 * Authenticate for API tests
 * Uses API client authentication
 */
Given('I have a valid Salesforce API token', async function (this: AutomationWorld) {
  await this.initAPI();
  const apiClient = new SalesforceAPIClient(this.apiContext);
  await apiClient.authenticate();
  this.testContext.apiClient = apiClient;
  delete this.testContext.apiJwtUsername;
  delete this.testContext.apiClientDescribe;
  logger.info('API authentication successful');
});

/**
 * JWT API client as QA MRD User (SF_QAMRDUSER_JWT_USERNAME).
 * Use for stories where MRD FLS must match REST describe/create (e.g. SF-883 Sub_Type__c).
 */
Given('I have a valid Salesforce API token as QA MRD user', async function (this: AutomationWorld) {
  const mrd = process.env.SF_QAMRDUSER_JWT_USERNAME?.trim();
  if (!mrd) {
    throw new Error(
      'SF_QAMRDUSER_JWT_USERNAME is not set. Add it to src/config/env/.env.<ENV> (same connected app / cert as other JWT users).'
    );
  }
  await this.initAPI();
  const apiClient = new SalesforceAPIClient(this.apiContext);
  await apiClient.authenticate(mrd);
  this.testContext.apiClient = apiClient;
  this.testContext.apiJwtUsername = mrd;
  delete this.testContext.apiClientDescribe;
  logger.info(`API authentication successful (QA MRD user: ${mrd})`);
});

/**
 * JWT API client as QA Actuary user (SF_QAACTUARYUSER_JWT_USERNAME).
 * Use for SF-977 Product Map / Expansion API tests (Actuary FLS and Sub Type field access).
 */
Given('I have a valid Salesforce API token as QA Actuary user', async function (this: AutomationWorld) {
  const actuary = process.env.SF_QAACTUARYUSER_JWT_USERNAME?.trim();
  if (!actuary) {
    throw new Error(
      'SF_QAACTUARYUSER_JWT_USERNAME is not set. Add it to src/config/env/.env.<ENV> (QA Actuary JWT user; same connected app / cert as other JWT users unless documented otherwise).'
    );
  }
  await this.initAPI();
  const apiClient = new SalesforceAPIClient(this.apiContext);
  await apiClient.authenticate(actuary);
  this.testContext.apiClient = apiClient;
  this.testContext.apiJwtUsername = actuary;
  delete this.testContext.apiClientDescribe;
  logger.info(`API authentication successful (QA Actuary user: ${actuary})`);
});

/**
 * SF-977: default JWT user (QA automation) for Opportunity describe + Tooling; Actuary for creates (TestDataFactory + apiClient).
 * Sets testContext.apiClientDescribe (automation) and testContext.apiClient (Actuary).
 */
Given(
  'I have Salesforce API clients for product map lifecycle \\(QA automation describe, Actuary create\\)',
  async function (this: AutomationWorld) {
    const actuary = process.env.SF_QAACTUARYUSER_JWT_USERNAME?.trim();
    if (!actuary) {
      throw new Error(
        'SF_QAACTUARYUSER_JWT_USERNAME is not set. Add it to src/config/env/.env.<ENV> (Actuary JWT for Product Map / Opportunity creates).'
      );
    }
    await this.initAPI();
    const describeClient = new SalesforceAPIClient(this.apiContext);
    await describeClient.authenticate();
    const actuaryClient = new SalesforceAPIClient(this.apiContext);
    await actuaryClient.authenticate(actuary);
    this.testContext.apiClientDescribe = describeClient;
    this.testContext.apiClient = actuaryClient;
    this.testContext.apiJwtUsername = actuary;
    delete this.testContext.sf883SubTypeToolingCandidates;
    logger.info(
      `SF-977 API: describe/metadata = QA automation JWT; creates = Actuary (${actuary})`
    );
  }
);

/**
 * JWT API client as MuleSoft integration user (SF_MULESOFT_INTEGRATION_JWT_USERNAME).
 * Used for SF-923 Dataverse_ID__c FLS / describe checks and integration-only API steps.
 */
Given('I have a valid Salesforce API token as MuleSoft integration user', async function (this: AutomationWorld) {
  const integrationUser = process.env.SF_MULESOFT_INTEGRATION_JWT_USERNAME?.trim();
  if (!integrationUser) {
    throw new Error(
      'SF_MULESOFT_INTEGRATION_JWT_USERNAME is not set. Add it to src/config/env/.env.<ENV> (integration user pre-authorized on the same JWT connected app unless your org differs).'
    );
  }
  await this.initAPI();
  const apiClient = new SalesforceAPIClient(this.apiContext);
  await apiClient.authenticate(integrationUser);
  this.testContext.apiClient = apiClient;
  this.testContext.apiJwtUsername = integrationUser;
  delete this.testContext.apiClientDescribe;
  logger.info(`API authentication successful (MuleSoft integration user: ${integrationUser})`);
});

/**
 * JWT API client as Data Governance user (SF_DATAGOVERNANCEUSER_JWT_USERNAME).
 * SF-872 access model: create / edit / deactivate (Valid To) on reference data.
 */
Given('I have a valid Salesforce API token as Data Governance user', async function (this: AutomationWorld) {
  const dg = process.env.SF_DATAGOVERNANCEUSER_JWT_USERNAME?.trim();
  if (!dg) {
    throw new Error(
      'SF_DATAGOVERNANCEUSER_JWT_USERNAME is not set. Add it to src/config/env/.env.<ENV> (Data Governance JWT user on the same connected app as other SF JWT users unless documented otherwise).'
    );
  }
  await this.initAPI();
  const apiClient = new SalesforceAPIClient(this.apiContext);
  await apiClient.authenticate(dg);
  this.testContext.apiClient = apiClient;
  this.testContext.apiJwtUsername = dg;
  delete this.testContext.apiClientDescribe;
  logger.info(`API authentication successful (Data Governance user: ${dg})`);
});

/**
 * JWT API client as read-only user (SF_READONLYUSER_JWT_USERNAME).
 */
Given('I have a valid Salesforce API token as read-only user', async function (this: AutomationWorld) {
  const ro = process.env.SF_READONLYUSER_JWT_USERNAME?.trim();
  if (!ro) {
    throw new Error(
      'SF_READONLYUSER_JWT_USERNAME is not set. Add it to src/config/env/.env.<ENV> (read-only JWT user for SF-872 governance checks).'
    );
  }
  await this.initAPI();
  const apiClient = new SalesforceAPIClient(this.apiContext);
  await apiClient.authenticate(ro);
  this.testContext.apiClient = apiClient;
  this.testContext.apiJwtUsername = ro;
  delete this.testContext.apiClientDescribe;
  logger.info(`API authentication successful (read-only user: ${ro})`);
});

/**
 * Alias for API authentication (for consistency)
 */
Given('I have authenticated with Salesforce API', async function (this: AutomationWorld) {
  await this.initAPI();
  const apiClient = new SalesforceAPIClient(this.apiContext);
  await apiClient.authenticate();
  this.testContext.apiClient = apiClient;
  delete this.testContext.apiJwtUsername;
  delete this.testContext.apiClientDescribe;
  logger.info('API authentication successful');
});

// ============================================================================
// GENERIC ROLE-BASED AUTHENTICATION
// Supports any user role (MRD, Standard User, Non-Admin, etc.)
// ============================================================================

/**
 * Generic role-based authentication step
 * Supports any user role by looking up credentials from environment variables
 * 
 * Usage in feature files:
 *   Given I am logged in as a "MRD" user
 *   Given I am logged in as a "Standard User" user
 *   Given I am logged in as a "Non-Admin User" user
 * 
 * Environment Variable Pattern:
 *   SF_{ROLE}_JWT_USERNAME (preferred) or
 *   SF_{ROLE}_USERNAME + SF_{ROLE}_PASSWORD + SF_{ROLE}_SECURITY_TOKEN
 * 
 * Examples:
 *   SF_MRD_JWT_USERNAME=qa.mrd.user@example.com.qa
 *   SF_STANDARDUSER_JWT_USERNAME=qa.standard.user@example.com.qa
 *   SF_NONADMINUSER_JWT_USERNAME=qa.nonadmin.user@example.com.qa
 */
Given('I am logged in as a {string} user', async function (this: AutomationWorld, role: string) {
  // Browser should be initialized by Before hook
  if (!this.page || this.page.isClosed()) {
    throw new Error('Page not initialized. Browser should be initialized by Before hook.');
  }

  // Map Jira mention to Salesforce user role first
  const { getSFUserRoleFromJira } = await import('../../utils/user-role-mapping');
  const sfRole = getSFUserRoleFromJira(role) || role;
  const resolvedRole = resolveRoleName(sfRole);
  logger.info(`🔐 Authenticating as ${role.toUpperCase()} user (mapped to: ${sfRole}, resolved: ${resolvedRole})...`);

  // Get credentials for this role
  const credentials = getUserRoleCredentials(sfRole);

  // Check if credentials are available
  if (!credentials.jwtUsername && !credentials.username) {
    const envName = config.getEnvironment();
    const normalizedRole = resolveRoleName(sfRole);
    const jwtKey = `SF_${normalizedRole}_JWT_USERNAME`;
    const usernameKey = `SF_${normalizedRole}_USERNAME`;
    
    logger.warn(`⚠️ ${role} user credentials not configured. Using admin user as fallback.`);
    logger.warn(`   To test ${role} permissions, configure ${jwtKey} or ${usernameKey} in src/config/env/.env.${envName}`);
    
    // Use regular admin authentication as fallback
    const authResult = await SalesforceUIAuth.authenticateWithJWT(this.page);
    this.testContext.authResult = authResult;
    this.testContext.userType = 'admin-fallback';
    this.testContext.requestedRole = role;
    logger.info(`✅ Authenticated as admin (fallback mode - ${role} user not configured)`);
    return;
  }

  // Try JWT authentication first (preferred)
  if (credentials.jwtUsername) {
    try {
      logger.info(`Authenticating ${role} user via JWT: ${credentials.jwtUsername}`);
      const authResult = await SalesforceUIAuth.authenticateWithJWT(this.page, {
        username: credentials.jwtUsername,
      });
      this.testContext.authResult = authResult;
      this.testContext.userType = resolvedRole.toLowerCase();
      this.testContext.requestedRole = role;
      logger.info(`✅ Authenticated as ${role.toUpperCase()} user via JWT`);
      
      // Fetch and log user profile
      try {
        const profileInfo = await SalesforceUserService.fetchUserProfile(
          authResult.accessToken,
          authResult.instanceUrl,
          credentials.jwtUsername
        );
        if (profileInfo) {
          logger.info(`User Profile: ${profileInfo.profileName} (Profile Id: ${profileInfo.profileId})`);
          reporter.setEnvironmentContext({ userProfile: profileInfo.profileName });
        }
      } catch (profileError: any) {
        logger.warn(`Could not fetch user profile: ${profileError.message}`);
      }
      
      return;
    } catch (jwtError: any) {
      logger.warn(`${role} user JWT auth failed: ${jwtError.message}, trying password auth...`);
    }
  }

  // Fallback: Password authentication
  if (credentials.username && credentials.password) {
    try {
      logger.info(`Authenticating ${role} user via password: ${credentials.username}`);
      const authResult = await SalesforceUIAuth.authenticateWithPassword(this.page, {
        username: credentials.username,
        password: credentials.password,
        securityToken: credentials.securityToken || '',
      });
      this.testContext.authResult = authResult;
      this.testContext.userType = resolvedRole.toLowerCase();
      this.testContext.requestedRole = role;
      logger.info(`✅ Authenticated as ${role.toUpperCase()} user via password`);
      return;
    } catch (pwdError: any) {
      logger.error(`${role} user password auth failed: ${pwdError.message}`);
      throw new Error(`${role} user authentication failed: ${pwdError.message}`);
    }
  }

  throw new Error(`${role} user authentication failed. Check SF_${resolvedRole}_* environment variables.`);
});

// ============================================================================
// STANDARD USER AUTHENTICATION (Non-Admin)
// Used for testing field-level security and permissions
// Backward compatibility: Uses the generic role-based authentication
// ============================================================================

/**
 * Authenticate as a Standard (non-admin) Salesforce user
 * Used for testing field visibility and permission restrictions
 * 
 * This step now uses the generic role-based authentication for consistency.
 * 
 * Requires environment variables:
 * - SF_STANDARDUSER_JWT_USERNAME (preferred) or
 * - SF_STANDARDUSER_USERNAME + SF_STANDARDUSER_PASSWORD + SF_STANDARDUSER_SECURITY_TOKEN
 * 
 * Legacy support: Also checks SF_STANDARD_USER_* (with underscore) for backward compatibility
 */
Given('I am logged in as a standard user', async function (this: AutomationWorld) {
  // Browser should be initialized by Before hook
  if (!this.page || this.page.isClosed()) {
    throw new Error('Page not initialized. Browser should be initialized by Before hook.');
  }

  logger.info('🔐 Authenticating as STANDARD USER (non-admin)...');

  // Check for new pattern first (SF_STANDARDUSER_*)
  let credentials = getUserRoleCredentials('standard user');
  
  // Fallback to legacy pattern (SF_STANDARD_USER_*) for backward compatibility
  if (!credentials.jwtUsername && !credentials.username) {
    const legacyJWT = process.env.SF_STANDARD_USER_JWT_USERNAME;
    const legacyUsername = process.env.SF_STANDARD_USER_USERNAME;
    const legacyPassword = process.env.SF_STANDARD_USER_PASSWORD;
    
    if (legacyJWT || legacyUsername) {
      logger.info('Using legacy SF_STANDARD_USER_* environment variables (consider migrating to SF_STANDARDUSER_*)');
      credentials = {
        jwtUsername: legacyJWT,
        username: legacyUsername,
        password: legacyPassword,
        securityToken: process.env.SF_STANDARD_USER_SECURITY_TOKEN,
      };
    }
  }

  if (!credentials.jwtUsername && !credentials.username) {
    // Fallback: Use admin user but log a warning
    logger.warn('⚠️ Standard user credentials not configured. Using admin user as fallback.');
    logger.warn('   To test non-admin permissions, configure SF_STANDARDUSER_JWT_USERNAME or SF_STANDARD_USER_JWT_USERNAME.');
    
    // Use regular admin authentication
    const authResult = await SalesforceUIAuth.authenticateWithJWT(this.page);
    this.testContext.authResult = authResult;
    this.testContext.userType = 'admin-fallback';
    logger.info('✅ Authenticated as admin (fallback mode)');
    return;
  }

  // Try JWT authentication with standard user
  if (credentials.jwtUsername) {
    try {
      logger.info(`Authenticating standard user via JWT: ${credentials.jwtUsername}`);
      const authResult = await SalesforceUIAuth.authenticateWithJWT(this.page, {
        username: credentials.jwtUsername,
      });
      this.testContext.authResult = authResult;
      this.testContext.userType = 'standard';
      logger.info('✅ Authenticated as STANDARD USER via JWT');
      return;
    } catch (jwtError: any) {
      logger.warn(`Standard user JWT auth failed: ${jwtError.message}, trying password auth...`);
    }
  }

  // Fallback: Password authentication for standard user
  if (credentials.username && credentials.password) {
    try {
      logger.info(`Authenticating standard user via password: ${credentials.username}`);
      const authResult = await SalesforceUIAuth.authenticateWithPassword(this.page, {
        username: credentials.username,
        password: credentials.password,
        securityToken: credentials.securityToken || '',
      });
      this.testContext.authResult = authResult;
      this.testContext.userType = 'standard';
      logger.info('✅ Authenticated as STANDARD USER via password');
      return;
    } catch (pwdError: any) {
      logger.error(`Standard user password auth failed: ${pwdError.message}`);
      throw new Error(`Standard user authentication failed: ${pwdError.message}`);
    }
  }

  throw new Error('Standard user authentication failed. Check SF_STANDARDUSER_* or SF_STANDARD_USER_* environment variables.');
});

/**
 * Alias: Authenticate as read-only user
 * Uses the generic role-based authentication with "read-only" role
 * Falls back to standard user if read-only credentials not configured
 */
Given('I am logged in as a read-only user', async function (this: AutomationWorld) {
  if (!this.page || this.page.isClosed()) {
    throw new Error('Page not initialized. Browser should be initialized by Before hook.');
  }

  logger.info('🔐 Authenticating as READ-ONLY USER...');
  
  // Try read-only user credentials first
  const readOnlyCredentials = getUserRoleCredentials('read-only user');
  
  // Fallback to standard user if read-only not configured
  if (!readOnlyCredentials.jwtUsername && !readOnlyCredentials.username) {
    logger.info('Read-only user not configured, falling back to standard user...');
    const standardCredentials = getUserRoleCredentials('standard user');
    
    // Also check legacy SF_STANDARD_USER_JWT_USERNAME
    const legacyJWT = process.env.SF_STANDARD_USER_JWT_USERNAME;
    
    if (standardCredentials.jwtUsername || legacyJWT) {
      const jwtUsername = standardCredentials.jwtUsername || legacyJWT;
      try {
        const authResult = await SalesforceUIAuth.authenticateWithJWT(this.page, {
          username: jwtUsername,
        });
        this.testContext.authResult = authResult;
        this.testContext.userType = 'read-only';
        logger.info('✅ Authenticated as READ-ONLY USER (using standard user credentials)');
        return;
      } catch (error: any) {
        logger.warn(`Read-only user auth failed: ${error.message}. Using admin fallback.`);
      }
    }
    
    // Final fallback: admin user
    logger.warn('⚠️ Read-only/standard user not configured. Using admin user as fallback.');
    logger.warn('   To test read-only permissions, configure SF_READONLYUSER_JWT_USERNAME or SF_STANDARDUSER_JWT_USERNAME.');
    
    this.testContext.userType = 'admin-fallback';
    this.testContext.standardUserNotConfigured = true;
    const authResult = await SalesforceUIAuth.authenticateWithJWT(this.page);
    this.testContext.authResult = authResult;
    logger.info('⚠️ Authenticated as admin (read-only user not configured)');
    return;
  }

  // Use read-only credentials
  try {
    if (readOnlyCredentials.jwtUsername) {
      const authResult = await SalesforceUIAuth.authenticateWithJWT(this.page, {
        username: readOnlyCredentials.jwtUsername,
      });
      this.testContext.authResult = authResult;
      this.testContext.userType = 'read-only';
      logger.info('✅ Authenticated as READ-ONLY USER');
    } else if (readOnlyCredentials.username && readOnlyCredentials.password) {
      const authResult = await SalesforceUIAuth.authenticateWithPassword(this.page, {
        username: readOnlyCredentials.username,
        password: readOnlyCredentials.password,
        securityToken: readOnlyCredentials.securityToken || '',
      });
      this.testContext.authResult = authResult;
      this.testContext.userType = 'read-only';
      logger.info('✅ Authenticated as READ-ONLY USER via password');
    }
  } catch (error: any) {
    logger.warn(`Read-only user auth failed: ${error.message}. Using admin fallback.`);
    this.testContext.userType = 'admin-fallback';
    this.testContext.standardUserNotConfigured = true;
    const authResult = await SalesforceUIAuth.authenticateWithJWT(this.page);
    this.testContext.authResult = authResult;
  }
});

