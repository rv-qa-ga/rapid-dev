/**
 * Role Metadata Loader
 * 
 * Loads and queries role definitions from JSON configuration.
 * Provides utilities to access role metadata (profiles, permission sets, permissions, etc.).
 * 
 * Usage:
 *   const roleMeta = getRoleMetadata();
 *   const roleDef = roleMeta.getRoleDefinition('mrd');
 *   const profile = roleMeta.getRoleProfile('mrd');
 *   const canCreate = roleMeta.canCreate('mrd', 'Account');
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ObjectPermission {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
  viewAll?: boolean;
  modifyAll?: boolean;
}

export interface SharingRule {
  object: string;
  defaultAccess?: 'Private' | 'Public Read Only' | 'Public Read/Write';
  canSeeOwnRecords: boolean;
  canSeeTeamRecords: boolean;
  canSeeAllRecords: boolean;
  hierarchyAccess?: boolean;
}

export interface HierarchyInfo {
  parentRole?: string;
  childRoles?: string[];
  level?: number;
}

export interface TestDataConfig {
  canCreateRecords: boolean;
  defaultRecordOwner?: 'self' | 'admin' | 'specified';
  allowedObjectTypes?: string[];
}

export interface RoleDefinition {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  profile?: string;
  permissionSets?: string[];
  hierarchy?: HierarchyInfo;
  objectPermissions?: Record<string, ObjectPermission>;
  fieldLevelSecurity?: Record<string, any>; // Detailed FLS in fls-matrix.json
  sharingRules?: Record<string, SharingRule>;
  testData?: TestDataConfig;
}

export interface RoleDefinitions {
  version: string;
  lastUpdated?: string;
  description?: string;
  roles: RoleDefinition[];
}

// ============================================================================
// ROLE METADATA MANAGER
// ============================================================================

export class RoleMetadataManager {
  private definitions: RoleDefinitions | null = null;
  private definitionsPath: string;
  private loaded: boolean = false;
  private roleMap: Map<string, RoleDefinition> = new Map();

  constructor(definitionsPath?: string) {
    this.definitionsPath = definitionsPath || path.resolve(__dirname, '../config/user-roles.json');
  }

  /**
   * Load role definitions from JSON file
   */
  loadRoleDefinitions(): RoleDefinitions {
    if (this.loaded && this.definitions) {
      return this.definitions;
    }

    try {
      if (!fs.existsSync(this.definitionsPath)) {
        logger.warn(`Role definitions file not found at ${this.definitionsPath}. Using empty definitions.`);
        this.definitions = this.createEmptyDefinitions();
        this.loaded = true;
        return this.definitions;
      }

      const fileContent = fs.readFileSync(this.definitionsPath, 'utf-8');
      this.definitions = JSON.parse(fileContent) as RoleDefinitions;

      // Validate structure
      this.validateRoleDefinitions(this.definitions);

      // Build role map for quick lookup
      this.roleMap.clear();
      for (const role of this.definitions.roles) {
        this.roleMap.set(role.id, role);
      }

      this.loaded = true;
      logger.info(`✅ Loaded role definitions from ${this.definitionsPath} (${this.definitions.roles.length} roles)`);
      
      return this.definitions;
    } catch (error: any) {
      logger.error(`Failed to load role definitions: ${error.message}`);
      this.definitions = this.createEmptyDefinitions();
      this.loaded = true;
      return this.definitions;
    }
  }

  /**
   * Create empty definitions structure
   */
  private createEmptyDefinitions(): RoleDefinitions {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      roles: [],
    };
  }

  /**
   * Validate role definitions structure
   */
  validateRoleDefinitions(definitions: RoleDefinitions): void {
    if (!definitions.roles || !Array.isArray(definitions.roles)) {
      throw new Error('Role definitions must have "roles" array');
    }

    for (const role of definitions.roles) {
      if (!role.id) {
        throw new Error('Role must have "id" property');
      }
      if (!role.name) {
        throw new Error(`Role "${role.id}" must have "name" property`);
      }
      if (!role.displayName) {
        throw new Error(`Role "${role.id}" must have "displayName" property`);
      }
    }

    logger.debug('Role definitions structure validated');
  }

  /**
   * Get role definition by ID
   * @param roleId - Role ID (e.g., 'mrd', 'member-operations')
   * @returns RoleDefinition or null if not found
   */
  getRoleDefinition(roleId: string): RoleDefinition | null {
    this.loadRoleDefinitions();
    return this.roleMap.get(roleId) || null;
  }

  /**
   * Get all role definitions
   * @returns Array of all role definitions
   */
  getAllRoleDefinitions(): RoleDefinition[] {
    this.loadRoleDefinitions();
    return [...this.definitions!.roles];
  }

  /**
   * Get role profile name
   * @param roleId - Role ID
   * @returns Profile name or null
   */
  getRoleProfile(roleId: string): string | null {
    const role = this.getRoleDefinition(roleId);
    return role?.profile || null;
  }

  /**
   * Get permission sets for a role
   * @param roleId - Role ID
   * @returns Array of permission set names
   */
  getRolePermissionSets(roleId: string): string[] {
    const role = this.getRoleDefinition(roleId);
    return role?.permissionSets || [];
  }

  /**
   * Get object permissions for a role
   * @param roleId - Role ID
   * @param objectName - Object API name (e.g., 'Account', 'Lead')
   * @returns ObjectPermission or null
   */
  getObjectPermissions(roleId: string, objectName: string): ObjectPermission | null {
    const role = this.getRoleDefinition(roleId);
    if (!role || !role.objectPermissions) {
      return null;
    }
    return role.objectPermissions[objectName] || null;
  }

  /**
   * Check if role can create object
   */
  canCreate(roleId: string, objectName: string): boolean {
    const permissions = this.getObjectPermissions(roleId, objectName);
    return permissions?.create === true;
  }

  /**
   * Check if role can read object
   */
  canRead(roleId: string, objectName: string): boolean {
    const permissions = this.getObjectPermissions(roleId, objectName);
    return permissions?.read === true;
  }

  /**
   * Check if role can update object
   */
  canUpdate(roleId: string, objectName: string): boolean {
    const permissions = this.getObjectPermissions(roleId, objectName);
    return permissions?.update === true;
  }

  /**
   * Check if role can delete object
   */
  canDelete(roleId: string, objectName: string): boolean {
    const permissions = this.getObjectPermissions(roleId, objectName);
    return permissions?.delete === true;
  }

  /**
   * Check if role can view all records
   */
  canViewAll(roleId: string, objectName: string): boolean {
    const permissions = this.getObjectPermissions(roleId, objectName);
    return permissions?.viewAll === true;
  }

  /**
   * Check if role can modify all records
   */
  canModifyAll(roleId: string, objectName: string): boolean {
    const permissions = this.getObjectPermissions(roleId, objectName);
    return permissions?.modifyAll === true;
  }

  /**
   * Get sharing rules for a role and object
   * @param roleId - Role ID
   * @param objectName - Object API name
   * @returns SharingRule or null
   */
  getSharingRules(roleId: string, objectName: string): SharingRule | null {
    const role = this.getRoleDefinition(roleId);
    if (!role || !role.sharingRules) {
      return null;
    }
    return role.sharingRules[objectName] || null;
  }

  /**
   * Get hierarchy information for a role
   * @param roleId - Role ID
   * @returns HierarchyInfo or null
   */
  getHierarchy(roleId: string): HierarchyInfo | null {
    const role = this.getRoleDefinition(roleId);
    return role?.hierarchy || null;
  }

  /**
   * Get test data configuration for a role
   * @param roleId - Role ID
   * @returns TestDataConfig or null
   */
  getTestDataConfig(roleId: string): TestDataConfig | null {
    const role = this.getRoleDefinition(roleId);
    return role?.testData || null;
  }

  /**
   * Check if role can create records
   */
  canCreateRecords(roleId: string): boolean {
    const testData = this.getTestDataConfig(roleId);
    return testData?.canCreateRecords === true;
  }

  /**
   * Get allowed object types for role
   */
  getAllowedObjectTypes(roleId: string): string[] {
    const testData = this.getTestDataConfig(roleId);
    return testData?.allowedObjectTypes || [];
  }

  /**
   * Check if role definitions are loaded
   */
  isLoaded(): boolean {
    return this.loaded && this.definitions !== null;
  }

  /**
   * Reload role definitions (useful after updates)
   */
  reload(): void {
    this.loaded = false;
    this.definitions = null;
    this.roleMap.clear();
    this.loadRoleDefinitions();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let roleMetadataInstance: RoleMetadataManager | null = null;

/**
 * Get the role metadata manager instance
 */
export function getRoleMetadata(definitionsPath?: string): RoleMetadataManager {
  if (!roleMetadataInstance) {
    roleMetadataInstance = new RoleMetadataManager(definitionsPath);
  }
  return roleMetadataInstance;
}

/**
 * Reset the role metadata instance (useful for testing)
 */
export function resetRoleMetadata(): void {
  roleMetadataInstance = null;
}

