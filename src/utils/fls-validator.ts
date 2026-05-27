/**
 * Field-Level Security (FLS) Validator
 * 
 * Loads and validates FLS matrix from JSON configuration.
 * Provides utilities to check field visibility and editability per role.
 * 
 * Usage:
 *   const fls = getFLSValidator();
 *   const canView = fls.isFieldVisible('mrd', 'Account', 'AnnualRevenue');
 *   const canEdit = fls.isFieldEditable('mrd', 'Account', 'AnnualRevenue');
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

// ============================================================================
// TYPES
// ============================================================================

export interface RolePermission {
  view: boolean;
  edit: boolean;
  required?: boolean;
}

export interface FieldFLS {
  fieldName: string;
  fieldLabel?: string;
  fieldType?: string;
  rolePermissions: Record<string, RolePermission>;
  sensitiveDataClassification?: string[];
  notes?: string;
}

export interface ObjectFLS {
  objectName: string;
  fields: FieldFLS[];
}

export interface FLSMatrix {
  version: string;
  lastUpdated?: string;
  source?: string;
  description?: string;
  objects: Record<string, ObjectFLS>;
}

// ============================================================================
// FLS VALIDATOR CLASS
// ============================================================================

export class FLSValidator {
  private matrix: FLSMatrix | null = null;
  private matrixPath: string;
  private loaded: boolean = false;

  constructor(matrixPath?: string) {
    this.matrixPath = matrixPath || path.resolve(__dirname, '../config/fls-matrix.json');
  }

  /**
   * Load FLS matrix from JSON file
   */
  loadFLSMatrix(): FLSMatrix {
    if (this.loaded && this.matrix) {
      return this.matrix;
    }

    try {
      if (!fs.existsSync(this.matrixPath)) {
        logger.warn(`FLS matrix file not found at ${this.matrixPath}. Using empty matrix.`);
        this.matrix = this.createEmptyMatrix();
        this.loaded = true;
        return this.matrix;
      }

      const fileContent = fs.readFileSync(this.matrixPath, 'utf-8');
      this.matrix = JSON.parse(fileContent) as FLSMatrix;

      // Validate structure
      this.validateFLSMatrix(this.matrix);

      this.loaded = true;
      logger.info(`✅ Loaded FLS matrix from ${this.matrixPath} (${Object.keys(this.matrix.objects).length} objects)`);
      
      return this.matrix;
    } catch (error: any) {
      logger.error(`Failed to load FLS matrix: ${error.message}`);
      this.matrix = this.createEmptyMatrix();
      this.loaded = true;
      return this.matrix;
    }
  }

  /**
   * Create empty matrix structure
   */
  private createEmptyMatrix(): FLSMatrix {
    return {
      version: '1.0.0',
      lastUpdated: new Date().toISOString(),
      objects: {},
    };
  }

  /**
   * Validate FLS matrix structure
   */
  validateFLSMatrix(matrix: FLSMatrix): void {
    if (!matrix.objects) {
      throw new Error('FLS matrix must have "objects" property');
    }

    for (const [objectName, objectFLS] of Object.entries(matrix.objects)) {
      if (!objectFLS.fields || !Array.isArray(objectFLS.fields)) {
        throw new Error(`Object "${objectName}" must have "fields" array`);
      }

      for (const field of objectFLS.fields) {
        if (!field.fieldName) {
          throw new Error(`Field in object "${objectName}" must have "fieldName"`);
        }
        if (!field.rolePermissions) {
          throw new Error(`Field "${field.fieldName}" in object "${objectName}" must have "rolePermissions"`);
        }
      }
    }

    logger.debug('FLS matrix structure validated');
  }

  /**
   * Get field permission for a specific role
   * @param roleId - Role ID (e.g., 'mrd', 'member-operations')
   * @param objectName - Object API name (e.g., 'Account', 'Lead')
   * @param fieldName - Field API name (e.g., 'Name', 'AnnualRevenue')
   * @returns RolePermission or null if not found
   */
  getFieldPermission(roleId: string, objectName: string, fieldName: string): RolePermission | null {
    const matrix = this.loadFLSMatrix();
    
    const objectFLS = matrix.objects[objectName];
    if (!objectFLS) {
      logger.debug(`Object "${objectName}" not found in FLS matrix`);
      return null;
    }

    const field = objectFLS.fields.find(f => f.fieldName === fieldName);
    if (!field) {
      logger.debug(`Field "${fieldName}" not found in object "${objectName}"`);
      return null;
    }

    const permission = field.rolePermissions[roleId];
    if (!permission) {
      logger.debug(`Role "${roleId}" not found for field "${fieldName}" in object "${objectName}"`);
      return null;
    }

    return permission;
  }

  /**
   * Check if a field is visible (readable) for a role
   * @param roleId - Role ID
   * @param objectName - Object API name
   * @param fieldName - Field API name
   * @returns true if field is visible, false otherwise
   */
  isFieldVisible(roleId: string, objectName: string, fieldName: string): boolean {
    const permission = this.getFieldPermission(roleId, objectName, fieldName);
    return permission?.view === true;
  }

  /**
   * Check if a field is editable for a role
   * @param roleId - Role ID
   * @param objectName - Object API name
   * @param fieldName - Field API name
   * @returns true if field is editable, false otherwise
   */
  isFieldEditable(roleId: string, objectName: string, fieldName: string): boolean {
    const permission = this.getFieldPermission(roleId, objectName, fieldName);
    return permission?.edit === true;
  }

  /**
   * Check if a field is required for a role
   * @param roleId - Role ID
   * @param objectName - Object API name
   * @param fieldName - Field API name
   * @returns true if field is required, false otherwise
   */
  isFieldRequired(roleId: string, objectName: string, fieldName: string): boolean {
    const permission = this.getFieldPermission(roleId, objectName, fieldName);
    return permission?.required === true;
  }

  /**
   * Get sensitive data classification for a field
   * @param objectName - Object API name
   * @param fieldName - Field API name
   * @returns Array of classification tags (PII, Financial, Compliance, etc.)
   */
  getSensitiveDataClassification(objectName: string, fieldName: string): string[] {
    const matrix = this.loadFLSMatrix();
    
    const objectFLS = matrix.objects[objectName];
    if (!objectFLS) {
      return [];
    }

    const field = objectFLS.fields.find(f => f.fieldName === fieldName);
    if (!field) {
      return [];
    }

    return field.sensitiveDataClassification || [];
  }

  /**
   * Get all fields for an object
   * @param objectName - Object API name
   * @returns Array of field FLS definitions
   */
  getObjectFields(objectName: string): FieldFLS[] {
    const matrix = this.loadFLSMatrix();
    const objectFLS = matrix.objects[objectName];
    return objectFLS?.fields || [];
  }

  /**
   * Get all roles that have permission for a field
   * @param objectName - Object API name
   * @param fieldName - Field API name
   * @param permissionType - 'view' or 'edit'
   * @returns Array of role IDs that have the permission
   */
  getRolesWithPermission(objectName: string, fieldName: string, permissionType: 'view' | 'edit'): string[] {
    const matrix = this.loadFLSMatrix();
    const objectFLS = matrix.objects[objectName];
    if (!objectFLS) {
      return [];
    }

    const field = objectFLS.fields.find(f => f.fieldName === fieldName);
    if (!field) {
      return [];
    }

    const roles: string[] = [];
    for (const [roleId, permission] of Object.entries(field.rolePermissions)) {
      if (permissionType === 'view' && permission.view) {
        roles.push(roleId);
      } else if (permissionType === 'edit' && permission.edit) {
        roles.push(roleId);
      }
    }

    return roles;
  }

  /**
   * Check if FLS matrix is loaded
   */
  isLoaded(): boolean {
    return this.loaded && this.matrix !== null;
  }

  /**
   * Reload FLS matrix (useful after updates)
   */
  reload(): void {
    this.loaded = false;
    this.matrix = null;
    this.loadFLSMatrix();
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let flsValidatorInstance: FLSValidator | null = null;

/**
 * Get the FLS validator instance
 */
export function getFLSValidator(matrixPath?: string): FLSValidator {
  if (!flsValidatorInstance) {
    flsValidatorInstance = new FLSValidator(matrixPath);
  }
  return flsValidatorInstance;
}

/**
 * Reset the FLS validator instance (useful for testing)
 */
export function resetFLSValidator(): void {
  flsValidatorInstance = null;
}

