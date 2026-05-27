/**
 * Permission Validation Step Definitions
 * 
 * Step definitions for validating object-level and record-level permissions.
 * 
 * Usage in feature files:
 *   Then I should be able to create Account records
 *   Then I should NOT be able to create Account records
 *   Then I should be able to read Account records
 *   Then I should be able to update Account records
 *   Then I should be able to delete Account records
 */

import { Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../hooks/world';
import { getPermissionValidator } from '../../utils/permission-validator';
import { getRoleMetadata } from '../../utils/role-metadata';
import { logger } from '../../utils/logger';
import { getSFUserRoleFromJira } from '../../utils/user-role-mapping';

// ============================================================================
// OBJECT-LEVEL PERMISSIONS
// ============================================================================

/**
 * Validate that role can create object
 * 
 * Examples:
 *   Then I should be able to create Account records
 *   Then I should be able to create Lead records
 */
Then(
  /^I should be able to create (\w+) records$/,
  async function (this: AutomationWorld, objectName: string) {
    const roleId = this.testContext.userRole || this.testContext.requestedRole;
    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    logger.info(`Validating create permission for role "${roleId}" on object "${objectName}"`);

    const validator = getPermissionValidator();
    const canCreate = validator.canCreate(roleId, objectName);

    if (!canCreate) {
      throw new Error(
        `Role "${roleId}" should be able to create ${objectName} records, but permission check failed.`
      );
    }

    logger.info(`✅ Role "${roleId}" can create ${objectName} records`);
  }
);

/**
 * Validate that role cannot create object
 * 
 * Examples:
 *   Then I should NOT be able to create Account records
 *   Then I should NOT be able to create Lead records
 */
Then(
  /^I should NOT be able to create (\w+) records$/,
  async function (this: AutomationWorld, objectName: string) {
    const roleId = this.testContext.userRole || this.testContext.requestedRole;
    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    logger.info(`Validating NO create permission for role "${roleId}" on object "${objectName}"`);

    const validator = getPermissionValidator();
    const canCreate = validator.canCreate(roleId, objectName);

    if (canCreate) {
      throw new Error(
        `Role "${roleId}" should NOT be able to create ${objectName} records, but permission check shows it can.`
      );
    }

    logger.info(`✅ Role "${roleId}" cannot create ${objectName} records (as expected)`);
  }
);

/**
 * Validate that role can read object
 * 
 * Examples:
 *   Then I should be able to read Account records
 */
Then(
  /^I should be able to read (\w+) records$/,
  async function (this: AutomationWorld, objectName: string) {
    const roleId = this.testContext.userRole || this.testContext.requestedRole;
    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    logger.info(`Validating read permission for role "${roleId}" on object "${objectName}"`);

    const validator = getPermissionValidator();
    const canRead = validator.canRead(roleId, objectName);

    if (!canRead) {
      throw new Error(
        `Role "${roleId}" should be able to read ${objectName} records, but permission check failed.`
      );
    }

    logger.info(`✅ Role "${roleId}" can read ${objectName} records`);
  }
);

/**
 * Validate that role can update object
 * 
 * Examples:
 *   Then I should be able to update Account records
 */
Then(
  /^I should be able to update (\w+) records$/,
  async function (this: AutomationWorld, objectName: string) {
    const roleId = this.testContext.userRole || this.testContext.requestedRole;
    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    logger.info(`Validating update permission for role "${roleId}" on object "${objectName}"`);

    const validator = getPermissionValidator();
    const canUpdate = validator.canUpdate(roleId, objectName);

    if (!canUpdate) {
      throw new Error(
        `Role "${roleId}" should be able to update ${objectName} records, but permission check failed.`
      );
    }

    logger.info(`✅ Role "${roleId}" can update ${objectName} records`);
  }
);

/**
 * Validate that role can delete object
 * 
 * Examples:
 *   Then I should be able to delete Account records
 */
Then(
  /^I should be able to delete (\w+) records$/,
  async function (this: AutomationWorld, objectName: string) {
    const roleId = this.testContext.userRole || this.testContext.requestedRole;
    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    logger.info(`Validating delete permission for role "${roleId}" on object "${objectName}"`);

    const validator = getPermissionValidator();
    const canDelete = validator.canDelete(roleId, objectName);

    if (!canDelete) {
      throw new Error(
        `Role "${roleId}" should be able to delete ${objectName} records, but permission check failed.`
      );
    }

    logger.info(`✅ Role "${roleId}" can delete ${objectName} records`);
  }
);

/**
 * Validate that role cannot delete object
 * 
 * Examples:
 *   Then I should NOT be able to delete Account records
 */
Then(
  /^I should NOT be able to delete (\w+) records$/,
  async function (this: AutomationWorld, objectName: string) {
    const roleId = this.testContext.userRole || this.testContext.requestedRole;
    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    logger.info(`Validating NO delete permission for role "${roleId}" on object "${objectName}"`);

    const validator = getPermissionValidator();
    const canDelete = validator.canDelete(roleId, objectName);

    if (canDelete) {
      throw new Error(
        `Role "${roleId}" should NOT be able to delete ${objectName} records, but permission check shows it can.`
      );
    }

    logger.info(`✅ Role "${roleId}" cannot delete ${objectName} records (as expected)`);
  }
);

// ============================================================================
// RECORD-LEVEL ACCESS VALIDATION
// ============================================================================

/**
 * Validate that role can access a specific record
 * 
 * Examples:
 *   Then I should be able to access the Account record
 */
Then(
  /^I should be able to access the (\w+) record$/,
  async function (this: AutomationWorld, objectName: string) {
    const roleId = this.testContext.userRole || this.testContext.requestedRole;
    const recordId = this.testContext.recordId;

    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    if (!recordId) {
      throw new Error(`No ${objectName} record ID in test context. Create a record first.`);
    }

    if (!this.testContext.authResult?.accessToken) {
      throw new Error('No access token in test context. Authenticate first.');
    }

    logger.info(`Validating record access for role "${roleId}" on ${objectName} ${recordId}`);

    const validator = getPermissionValidator();
    const accessResult = await validator.validateRecordAccess(
      roleId,
      objectName,
      recordId,
      this.testContext.authResult.accessToken,
      this.testContext.authResult.instanceUrl
    );

    if (!accessResult.canAccess) {
      throw new Error(
        `Role "${roleId}" should be able to access ${objectName} record ${recordId}, but access check failed. ` +
        `Error: ${accessResult.error || 'Unknown error'}`
      );
    }

    logger.info(`✅ Role "${roleId}" can access ${objectName} record ${recordId}`);
  }
);

/**
 * Validate that role cannot access a specific record
 * 
 * Examples:
 *   Then I should NOT be able to access the Account record
 */
Then(
  /^I should NOT be able to access the (\w+) record$/,
  async function (this: AutomationWorld, objectName: string) {
    const roleId = this.testContext.userRole || this.testContext.requestedRole;
    const recordId = this.testContext.recordId;

    if (!roleId) {
      throw new Error('No role specified in test context. Use "Given I am logged in as a {role} user" first.');
    }

    if (!recordId) {
      throw new Error(`No ${objectName} record ID in test context. Create a record first.`);
    }

    if (!this.testContext.authResult?.accessToken) {
      throw new Error('No access token in test context. Authenticate first.');
    }

    logger.info(`Validating NO record access for role "${roleId}" on ${objectName} ${recordId}`);

    const validator = getPermissionValidator();
    const accessResult = await validator.validateRecordAccess(
      roleId,
      objectName,
      recordId,
      this.testContext.authResult.accessToken,
      this.testContext.authResult.instanceUrl
    );

    if (accessResult.canAccess) {
      throw new Error(
        `Role "${roleId}" should NOT be able to access ${objectName} record ${recordId}, but access check shows it can.`
      );
    }

    logger.info(`✅ Role "${roleId}" cannot access ${objectName} record ${recordId} (as expected)`);
  }
);

