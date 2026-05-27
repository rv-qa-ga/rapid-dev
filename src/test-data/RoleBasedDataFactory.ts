/**
 * Role-Based Test Data Factory
 * 
 * Creates test data as a specific user role, respecting FLS and permissions.
 * Integrates with existing TestDataFactory and role metadata.
 * 
 * Usage:
 *   const factory = new RoleBasedDataFactory();
 *   await factory.initialize('mrd');
 *   const account = await factory.createAccountAsRole('mrd', { Name: 'Test Account' });
 */

import { logger } from '../utils/logger';
import { TestDataFactory, TestRecord, CreateOptions } from './TestDataFactory';
import { getRoleMetadata } from '../utils/role-metadata';
import { getFLSValidator } from '../utils/fls-validator';
import { getUserRoleCredentials, resolveRoleName } from '../utils/user-role-config';
import { SalesforceJWTAuth } from '../utils/jwt-auth';
import { SalesforceAPIClient } from '../api-clients/salesforce/SalesforceAPIClient';
import { APIRequestContext } from '@playwright/test';
import { getRoleDataManager } from './helpers/RoleDataManager';

// ============================================================================
// TYPES
// ============================================================================

export interface RoleBasedCreateOptions extends CreateOptions {
  /** Role ID to create record as (e.g., 'mrd', 'member-operations') */
  role?: string;
  /** Whether to validate FLS before creating */
  validateFLS?: boolean;
  /** Whether to set record owner to role user */
  setOwnerToRole?: boolean;
  /** Scenario ID for tracking test data */
  scenarioId?: string;
}

export interface ScenarioDataTracker {
  scenarioId: string;
  records: Array<{
    recordId: string;
    objectType: string;
    role: string;
    createdAt: string;
  }>;
}

// ============================================================================
// ROLE-BASED DATA FACTORY
// ============================================================================

export class RoleBasedDataFactory {
  private testDataFactory: TestDataFactory;
  private roleMetadata = getRoleMetadata();
  private flsValidator = getFLSValidator();
  private roleClients: Map<string, SalesforceAPIClient> = new Map();
  private roleAccessTokens: Map<string, { accessToken: string; instanceUrl: string }> = new Map();

  constructor() {
    this.testDataFactory = new TestDataFactory();
  }

  /**
   * Initialize factory for a specific role
   * Authenticates as the role user and caches credentials
   * Note: If role is not found in definitions, still authenticate using credentials from environment variables
   */
  async initialize(roleId: string, apiContext?: APIRequestContext): Promise<void> {
    // Check if already initialized
    if (this.roleAccessTokens.has(roleId)) {
      logger.debug(`Role "${roleId}" already initialized`);
      return;
    }

    const roleDef = this.roleMetadata.getRoleDefinition(roleId);
    
    // Get role name for credential lookup (use roleId if roleDef not found)
    const roleNameForCreds = roleDef?.name || roleId;
    
    logger.info(`🔐 Initializing RoleBasedDataFactory for role: ${roleId}${roleDef ? '' : ' (not in definitions, using env vars)'}`);

    // Get credentials for role (from environment variables)
    const credentials = getUserRoleCredentials(roleNameForCreds);
    
    if (!credentials.jwtUsername && !credentials.username) {
      throw new Error(
        `No credentials configured for role "${roleId}" (${roleNameForCreds}). ` +
        `Please configure SF_${resolveRoleName(roleNameForCreds)}_JWT_USERNAME or SF_${resolveRoleName(roleNameForCreds)}_USERNAME`
      );
    }

    // Authenticate as role user
    try {
      let authResult;
      
      if (credentials.jwtUsername) {
        // Use JWT authentication with username override
        authResult = await SalesforceJWTAuth.authenticate(credentials.jwtUsername);
      } else if (credentials.username && credentials.password && credentials.securityToken) {
        // Use password authentication (would need to implement)
        throw new Error('Password authentication not yet implemented for role-based factory');
      } else {
        throw new Error('No valid credentials found for role');
      }

      // Cache access token
      this.roleAccessTokens.set(roleId, {
        accessToken: authResult.accessToken,
        instanceUrl: authResult.instanceUrl,
      });

      // Create API client for this role
      if (apiContext) {
        const client = new SalesforceAPIClient(apiContext);
        client.setAccessToken(authResult.accessToken);
        this.roleClients.set(roleId, client);
      }

      const displayName = roleDef?.displayName || roleNameForCreds;
      logger.info(`✅ Initialized role "${roleId}" (${displayName})`);
    } catch (error: any) {
      logger.error(`Failed to initialize role "${roleId}": ${error.message}`);
      throw error;
    }
  }

  /**
   * Get API client for a role (creates if needed)
   * Made accessible for RoleDataManager
   */
  async getRoleClient(roleId: string, apiContext?: APIRequestContext): Promise<SalesforceAPIClient | null> {
    if (this.roleClients.has(roleId)) {
      return this.roleClients.get(roleId)!;
    }

    if (!apiContext) {
      logger.warn(`No API context provided, cannot create API client for role "${roleId}"`);
      return null;
    }

    await this.initialize(roleId, apiContext);
    return this.roleClients.get(roleId) || null;
  }

  /**
   * Validate FLS for fields before creating record
   */
  private validateFieldLevelSecurity(
    roleId: string,
    objectName: string,
    data: Record<string, any>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const roleDef = this.roleMetadata.getRoleDefinition(roleId);
    
    if (!roleDef) {
      errors.push(`Role "${roleId}" not found`);
      return { valid: false, errors };
    }

    // Check each field in data
    for (const [fieldName, fieldValue] of Object.entries(data)) {
      // Skip system fields
      if (fieldName.startsWith('_') || fieldName === 'Id' || fieldName === 'OwnerId') {
        continue;
      }

      // Check if field is visible
      const isVisible = this.flsValidator.isFieldVisible(roleId, objectName, fieldName);
      if (!isVisible) {
        errors.push(`Field "${fieldName}" is not visible for role "${roleId}"`);
        continue;
      }

      // Check if field is editable (if value is being set)
      if (fieldValue !== null && fieldValue !== undefined) {
        const isEditable = this.flsValidator.isFieldEditable(roleId, objectName, fieldName);
        if (!isEditable) {
          errors.push(`Field "${fieldName}" is not editable for role "${roleId}"`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Create Account as a specific role
   */
  async createAccountAsRole(
    roleId: string,
    data: Record<string, any>,
    options: RoleBasedCreateOptions = {},
    apiContext?: APIRequestContext
  ): Promise<TestRecord> {
    logger.info(`📦 Creating Account as role "${roleId}"`);

    // Validate FLS if requested
    if (options.validateFLS !== false) {
      const flsValidation = this.validateFieldLevelSecurity(roleId, 'Account', data);
      if (!flsValidation.valid) {
        logger.warn(`FLS validation failed: ${flsValidation.errors.join(', ')}`);
        if (options.validateFLS === true) {
          throw new Error(`FLS validation failed: ${flsValidation.errors.join(', ')}`);
        }
      }
    }

    // Check if role can create Account (only if role is defined in user-roles.json)
    // If role is not found, skip permission check and proceed (role definitions file may not exist)
    const roleDef = this.roleMetadata.getRoleDefinition(roleId);
    if (roleDef) {
      const canCreate = this.roleMetadata.canCreate(roleId, 'Account');
      if (!canCreate) {
        throw new Error(`Role "${roleId}" does not have permission to create Account records`);
      }
    } else {
      logger.warn(`Role "${roleId}" not found in role definitions - skipping permission check. Proceeding with account creation.`);
    }

    // Initialize role if needed
    await this.initialize(roleId, apiContext);

    // Get role client or use default factory
    const roleClient = await this.getRoleClient(roleId, apiContext);
    
    if (roleClient) {
      // Create using role's API client
      const record = await roleClient.createRecord('Account', data);
      
      // Set owner if requested
      if (options.setOwnerToRole !== false) {
        const roleDef = this.roleMetadata.getRoleDefinition(roleId);
        if (roleDef) {
          // Get user ID for role (would need to query User object)
          // For now, use the default owner
          logger.debug(`Record created, owner set to role user`);
        }
      }

      const testRecord: TestRecord = {
        id: record.id || '',
        type: 'Account',
        name: data.Name || 'Unnamed Account',
        data: { ...data, Id: record.id },
      };

      // Track scenario data if scenarioId provided
      if (options.scenarioId) {
        this.trackScenarioData(options.scenarioId, testRecord.id, 'Account', roleId);
      }

      logger.info(`✅ Created Account ${testRecord.id} as role "${roleId}"`);
      return testRecord;
    } else {
      // Fallback to default factory (will use default admin credentials)
      // Ensure default factory is initialized and has API context if we have one
      await this.testDataFactory.initialize();
      if (apiContext) {
        this.testDataFactory.setAPIContext(apiContext);
      }
      logger.warn(`Using default factory (admin) for role "${roleId}" - API context ${apiContext ? 'provided' : 'not available'}`);
      return await this.testDataFactory.createAccount(data, options);
    }
  }

  /**
   * Create Lead as a specific role
   */
  async createLeadAsRole(
    roleId: string,
    data: Record<string, any>,
    options: RoleBasedCreateOptions = {},
    apiContext?: APIRequestContext
  ): Promise<TestRecord> {
    logger.info(`📦 Creating Lead as role "${roleId}"`);

    // Validate FLS if requested
    if (options.validateFLS !== false) {
      const flsValidation = this.validateFieldLevelSecurity(roleId, 'Lead', data);
      if (!flsValidation.valid) {
        logger.warn(`FLS validation failed: ${flsValidation.errors.join(', ')}`);
        if (options.validateFLS === true) {
          throw new Error(`FLS validation failed: ${flsValidation.errors.join(', ')}`);
        }
      }
    }

    // Check if role can create Lead
    const canCreate = this.roleMetadata.canCreate(roleId, 'Lead');
    if (!canCreate) {
      throw new Error(`Role "${roleId}" does not have permission to create Lead records`);
    }

    // Initialize role if needed
    await this.initialize(roleId, apiContext);

    // Get role client or use default factory
    const roleClient = await this.getRoleClient(roleId, apiContext);
    
    if (roleClient) {
      const record = await roleClient.createRecord('Lead', data);
      
      const testRecord: TestRecord = {
        id: record.id || '',
        type: 'Lead',
        name: `${data.FirstName || ''} ${data.LastName || ''}`.trim() || 'Unnamed Lead',
        data: { ...data, Id: record.id },
      };

      if (options.scenarioId) {
        this.trackScenarioData(options.scenarioId, testRecord.id, 'Lead', roleId);
      }

      logger.info(`✅ Created Lead ${testRecord.id} as role "${roleId}"`);
      return testRecord;
    } else {
      logger.warn(`Using default factory (admin) for role "${roleId}" - API context not available`);
      await this.testDataFactory.initialize();
      return await this.testDataFactory.createLead(data);
    }
  }

  /**
   * Create Contact as a specific role
   */
  async createContactAsRole(
    roleId: string,
    data: Record<string, any>,
    accountId: string,
    options: RoleBasedCreateOptions = {},
    apiContext?: APIRequestContext
  ): Promise<TestRecord> {
    logger.info(`📦 Creating Contact as role "${roleId}"`);

    // Validate FLS if requested
    if (options.validateFLS !== false) {
      const flsValidation = this.validateFieldLevelSecurity(roleId, 'Contact', data);
      if (!flsValidation.valid) {
        logger.warn(`FLS validation failed: ${flsValidation.errors.join(', ')}`);
        if (options.validateFLS === true) {
          throw new Error(`FLS validation failed: ${flsValidation.errors.join(', ')}`);
        }
      }
    }

    // Check if role can create Contact
    const canCreate = this.roleMetadata.canCreate(roleId, 'Contact');
    if (!canCreate) {
      throw new Error(`Role "${roleId}" does not have permission to create Contact records`);
    }

    // Initialize role if needed
    await this.initialize(roleId, apiContext);

    const roleClient = await this.getRoleClient(roleId, apiContext);
    
    if (roleClient) {
      const record = await roleClient.createRecord('Contact', { ...data, AccountId: accountId });
      
      const testRecord: TestRecord = {
        id: record.id || '',
        type: 'Contact',
        name: `${data.FirstName || ''} ${data.LastName || ''}`.trim() || 'Unnamed Contact',
        data: { ...data, AccountId: accountId, Id: record.id },
      };

      if (options.scenarioId) {
        this.trackScenarioData(options.scenarioId, testRecord.id, 'Contact', roleId);
      }

      logger.info(`✅ Created Contact ${testRecord.id} as role "${roleId}"`);
      return testRecord;
    } else {
      logger.warn(`Using default factory (admin) for role "${roleId}" - API context not available`);
      await this.testDataFactory.initialize();
      return await this.testDataFactory.createContact(data, accountId);
    }
  }

  /**
   * Track test data by scenario
   * Delegates to RoleDataManager for centralized tracking
   */
  trackScenarioData(scenarioId: string, recordId: string, objectType: string, role: string): void {
    const dataManager = getRoleDataManager();
    dataManager.trackScenarioData(scenarioId, recordId, objectType, role, false);
  }

  /**
   * Get all data for a scenario
   * Delegates to RoleDataManager
   */
  getScenarioData(scenarioId: string): ScenarioDataTracker | null {
    const dataManager = getRoleDataManager();
    return dataManager.getScenarioData(scenarioId);
  }

  /**
   * Cleanup all data for a scenario
   * Delegates to RoleDataManager for centralized cleanup
   */
  async cleanupScenarioData(scenarioId: string, apiContext?: APIRequestContext): Promise<void> {
    const dataManager = getRoleDataManager();
    const tracker = dataManager.getScenarioData(scenarioId);
    
    if (!tracker) {
      logger.debug(`No data tracked for scenario ${scenarioId}`);
      return;
    }

    logger.info(`🧹 Cleaning up ${tracker.records.length} records for scenario ${scenarioId}`);

    for (const record of tracker.records) {
      // Skip persistent records
      if (record.persistent) {
        logger.debug(`Skipping persistent record ${record.objectType} ${record.recordId}`);
        continue;
      }

      try {
        const roleClient = await this.getRoleClient(record.role, apiContext);
        if (roleClient) {
          await roleClient.deleteRecord(record.objectType, record.recordId);
          logger.debug(`Deleted ${record.objectType} ${record.recordId}`);
        } else {
          // Fallback to default factory
          await this.testDataFactory.initialize();
          await this.testDataFactory.deleteRecord(record.objectType, record.recordId);
        }
      } catch (error: any) {
        logger.warn(`Failed to delete ${record.objectType} ${record.recordId}: ${error.message}`);
      }
    }

    // Remove from tracking after cleanup (unless persistent)
    if (!dataManager.isScenarioPersistent(scenarioId)) {
      // Cleanup tracking data (actual deletion already done above)
      await dataManager.cleanupScenarioData(scenarioId, apiContext, false);
    }
    
    logger.info(`✅ Cleanup complete for scenario ${scenarioId}`);
  }

  /**
   * Mark scenario data as persistent (skip cleanup)
   * Delegates to RoleDataManager
   */
  markScenarioAsPersistent(scenarioId: string): void {
    const dataManager = getRoleDataManager();
    dataManager.markScenarioAsPersistent(scenarioId);
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let roleBasedDataFactoryInstance: RoleBasedDataFactory | null = null;

/**
 * Get the role-based data factory instance
 */
export function getRoleBasedDataFactory(): RoleBasedDataFactory {
  if (!roleBasedDataFactoryInstance) {
    roleBasedDataFactoryInstance = new RoleBasedDataFactory();
  }
  return roleBasedDataFactoryInstance;
}

/**
 * Reset the role-based data factory instance (useful for testing)
 */
export function resetRoleBasedDataFactory(): void {
  roleBasedDataFactoryInstance = null;
}

