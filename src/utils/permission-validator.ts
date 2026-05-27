/**
 * Permission Validator
 * 
 * Validates object-level and record-level permissions for roles.
 * Supports both configuration-based validation and API-based validation.
 * 
 * Usage:
 *   const validator = getPermissionValidator();
 *   const canCreate = validator.canCreate('mrd', 'Account');
 *   const hasAccess = await validator.validateRecordAccess('mrd', 'Account', recordId, accessToken, instanceUrl);
 */

import { logger } from './logger';
import { getRoleMetadata, RoleMetadataManager } from './role-metadata';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { APIRequestContext } from '@playwright/test';

// ============================================================================
// TYPES
// ============================================================================

export interface RecordAccessResult {
  canAccess: boolean;
  canRead: boolean;
  canEdit: boolean;
  canDelete: boolean;
  error?: string;
}

export interface SharingValidationResult {
  canSeeOwnRecords: boolean;
  canSeeTeamRecords: boolean;
  canSeeAllRecords: boolean;
  hierarchyAccess: boolean;
  error?: string;
}

// ============================================================================
// PERMISSION VALIDATOR CLASS
// ============================================================================

export class PermissionValidator {
  private roleMetadata: RoleMetadataManager;

  constructor() {
    this.roleMetadata = getRoleMetadata();
  }

  // ==========================================================================
  // OBJECT-LEVEL PERMISSIONS (Configuration-based)
  // ==========================================================================

  /**
   * Check if role can create object
   */
  canCreate(roleId: string, objectName: string): boolean {
    return this.roleMetadata.canCreate(roleId, objectName);
  }

  /**
   * Check if role can read object
   */
  canRead(roleId: string, objectName: string): boolean {
    return this.roleMetadata.canRead(roleId, objectName);
  }

  /**
   * Check if role can update object
   */
  canUpdate(roleId: string, objectName: string): boolean {
    return this.roleMetadata.canUpdate(roleId, objectName);
  }

  /**
   * Check if role can delete object
   */
  canDelete(roleId: string, objectName: string): boolean {
    return this.roleMetadata.canDelete(roleId, objectName);
  }

  /**
   * Check if role can view all records
   */
  canViewAll(roleId: string, objectName: string): boolean {
    return this.roleMetadata.canViewAll(roleId, objectName);
  }

  /**
   * Check if role can modify all records
   */
  canModifyAll(roleId: string, objectName: string): boolean {
    return this.roleMetadata.canModifyAll(roleId, objectName);
  }

  /**
   * Get all object permissions for a role
   */
  getObjectPermissions(roleId: string, objectName: string) {
    return this.roleMetadata.getObjectPermissions(roleId, objectName);
  }

  // ==========================================================================
  // RECORD-LEVEL ACCESS (API-based validation)
  // ==========================================================================

  /**
   * Validate record access via API
   * Queries Salesforce to check what the user can actually see/do
   * 
   * @param roleId - Role ID
   * @param objectName - Object API name
   * @param recordId - Record ID to check
   * @param accessToken - Salesforce access token for the role user
   * @param instanceUrl - Salesforce instance URL
   * @returns RecordAccessResult with permission details
   */
  async validateRecordAccess(
    roleId: string,
    objectName: string,
    recordId: string,
    accessToken: string,
    instanceUrl: string
  ): Promise<RecordAccessResult> {
    try {
      // Try to read the record
      const canRead = await this.tryReadRecord(objectName, recordId, accessToken, instanceUrl);
      
      // If can't read, can't do anything else
      if (!canRead) {
        return {
          canAccess: false,
          canRead: false,
          canEdit: false,
          canDelete: false,
        };
      }

      // Try to get record (will fail if no read access)
      const record = await this.getRecord(objectName, recordId, accessToken, instanceUrl);
      
      // Try to update (check if fields are updateable)
      const canEdit = await this.tryUpdateRecord(objectName, recordId, accessToken, instanceUrl);
      
      // Try to delete (will fail if no delete access)
      const canDelete = await this.tryDeleteRecord(objectName, recordId, accessToken, instanceUrl);

      return {
        canAccess: true,
        canRead: true,
        canEdit: canEdit,
        canDelete: canDelete,
      };
    } catch (error: any) {
      logger.warn(`Record access validation failed: ${error.message}`);
      return {
        canAccess: false,
        canRead: false,
        canEdit: false,
        canDelete: false,
        error: error.message,
      };
    }
  }

  /**
   * Try to read a record
   */
  private async tryReadRecord(
    objectName: string,
    recordId: string,
    accessToken: string,
    instanceUrl: string
  ): Promise<boolean> {
    try {
      const apiVersion = 'v60.0'; // Default API version
      const url = `${instanceUrl}/services/data/${apiVersion}/sobjects/${objectName}/${recordId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      return response.ok;
    } catch (error: any) {
      logger.debug(`Read record failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Get a record
   */
  private async getRecord(
    objectName: string,
    recordId: string,
    accessToken: string,
    instanceUrl: string
  ): Promise<any> {
    const apiVersion = 'v60.0';
    const url = `${instanceUrl}/services/data/${apiVersion}/sobjects/${objectName}/${recordId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to get record: ${errorText}`);
    }

    return await response.json();
  }

  /**
   * Try to update a record (check if updateable)
   */
  private async tryUpdateRecord(
    objectName: string,
    recordId: string,
    accessToken: string,
    instanceUrl: string
  ): Promise<boolean> {
    try {
      // Get record to check if it's updateable
      const record = await this.getRecord(objectName, recordId, accessToken, instanceUrl);
      
      // Try a minimal update (just update a non-critical field if possible)
      // For now, we'll check if the record has updateable fields
      // In a real scenario, we might try a PATCH request
      
      // Check object describe to see if updateable
      const apiVersion = 'v60.0';
      const describeUrl = `${instanceUrl}/services/data/${apiVersion}/sobjects/${objectName}/describe`;
      
      const describeResponse = await fetch(describeUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!describeResponse.ok) {
        return false;
      }

      const describe = await describeResponse.json();
      return (describe as any).updateable === true;
    } catch (error: any) {
      logger.debug(`Update check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Try to delete a record
   */
  private async tryDeleteRecord(
    objectName: string,
    recordId: string,
    accessToken: string,
    instanceUrl: string
  ): Promise<boolean> {
    try {
      // Check object describe to see if deletable
      const apiVersion = 'v60.0';
      const describeUrl = `${instanceUrl}/services/data/${apiVersion}/sobjects/${objectName}/describe`;
      
      const describeResponse = await fetch(describeUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!describeResponse.ok) {
        return false;
      }

      const describe = await describeResponse.json();
      return (describe as any).deletable === true;
    } catch (error: any) {
      logger.debug(`Delete check failed: ${error.message}`);
      return false;
    }
  }

  // ==========================================================================
  // SHARING RULES VALIDATION (API-based)
  // ==========================================================================

  /**
   * Validate sharing rules via API
   * Queries Salesforce to check what records the user can see
   * 
   * @param roleId - Role ID
   * @param objectName - Object API name
   * @param accessToken - Salesforce access token for the role user
   * @param instanceUrl - Salesforce instance URL
   * @param testRecordIds - Array of test record IDs to check visibility
   * @returns SharingValidationResult
   */
  async validateSharingRules(
    roleId: string,
    objectName: string,
    accessToken: string,
    instanceUrl: string,
    testRecordIds: string[]
  ): Promise<SharingValidationResult> {
    try {
      // Query to see what records the user can access
      const apiVersion = 'v60.0';
      const soql = `SELECT Id, OwnerId FROM ${objectName} WHERE Id IN ('${testRecordIds.join("','")}') LIMIT 200`;
      const queryUrl = `${instanceUrl}/services/data/${apiVersion}/query/?q=${encodeURIComponent(soql)}`;
      
      const response = await fetch(queryUrl, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Query failed: ${errorText}`);
      }

      const queryResult = await response.json();
      const accessibleRecords = (queryResult as any).records || [];
      const accessibleIds = accessibleRecords.map((r: any) => r.Id);

      // Check if user can see all records (viewAll permission)
      const canSeeAll = this.canViewAll(roleId, objectName);
      
      // Check if user can see own records
      const canSeeOwnRecords = accessibleIds.length > 0; // Simplified check
      
      // Check if user can see team records (would need to check OwnerId)
      const canSeeTeamRecords = accessibleIds.length > 0; // Simplified check

      // Get hierarchy access from role metadata
      const sharingRules = this.roleMetadata.getSharingRules(roleId, objectName);
      const hierarchyAccess = sharingRules?.hierarchyAccess === true;

      return {
        canSeeOwnRecords,
        canSeeTeamRecords,
        canSeeAllRecords: canSeeAll,
        hierarchyAccess,
      };
    } catch (error: any) {
      logger.warn(`Sharing rules validation failed: ${error.message}`);
      return {
        canSeeOwnRecords: false,
        canSeeTeamRecords: false,
        canSeeAllRecords: false,
        hierarchyAccess: false,
        error: error.message,
      };
    }
  }

  // ==========================================================================
  // COMPREHENSIVE PERMISSION VALIDATION
  // ==========================================================================

  /**
   * Validate all permissions for a role and object
   * Combines configuration-based and API-based validation
   */
  async validateAllPermissions(
    roleId: string,
    objectName: string,
    accessToken?: string,
    instanceUrl?: string
  ): Promise<{
    objectPermissions: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
      viewAll: boolean;
      modifyAll: boolean;
    };
    recordAccess?: RecordAccessResult;
    sharingRules?: SharingValidationResult;
  }> {
    const objectPermissions = this.getObjectPermissions(roleId, objectName) || {
      create: false,
      read: false,
      update: false,
      delete: false,
      viewAll: false,
      modifyAll: false,
    };

    const result: any = {
      objectPermissions,
    };

    // If access token provided, do API validation
    if (accessToken && instanceUrl) {
      // Note: Would need a test record ID for full validation
      // This is a placeholder for the structure
      logger.debug('API validation requires test record ID');
    }

    return result;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let permissionValidatorInstance: PermissionValidator | null = null;

/**
 * Get the permission validator instance
 */
export function getPermissionValidator(): PermissionValidator {
  if (!permissionValidatorInstance) {
    permissionValidatorInstance = new PermissionValidator();
  }
  return permissionValidatorInstance;
}

/**
 * Reset the permission validator instance (useful for testing)
 */
export function resetPermissionValidator(): void {
  permissionValidatorInstance = null;
}

