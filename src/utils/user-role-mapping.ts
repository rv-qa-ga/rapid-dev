/**
 * User Role Mapping Utility
 * 
 * Maps user roles mentioned in Jira acceptance criteria to actual Salesforce user role names
 * used in step definitions. This allows flexible mapping that can be updated without code changes.
 * 
 * Usage:
 *   const mapping = getUserRoleMapping();
 *   const sfRole = mapping.getSFUserRole('MRD'); // Returns 'MRD'
 *   const sfRole2 = mapping.getSFUserRole('admin user'); // Returns 'Admin'
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';

interface UserRoleMapping {
  jiraMention: string;
  sfUserRole: string;
  description: string;
}

interface UserRoleMappingConfig {
  description: string;
  version: string;
  mappings: UserRoleMapping[];
}

class UserRoleMappingManager {
  private mappings: Map<string, string> = new Map();
  private config: UserRoleMappingConfig | null = null;

  constructor() {
    this.loadMappings();
  }

  private loadMappings(): void {
    const configPath = path.resolve(__dirname, '../config/user-role-mapping.json');
    
    try {
      if (!fs.existsSync(configPath)) {
        logger.warn(`User role mapping file not found at ${configPath}. Using default mappings.`);
        this.loadDefaultMappings();
        return;
      }

      const configData = fs.readFileSync(configPath, 'utf-8');
      this.config = JSON.parse(configData) as UserRoleMappingConfig;

      // Build lookup map (case-insensitive)
      for (const mapping of this.config.mappings) {
        const key = mapping.jiraMention.toLowerCase().trim();
        this.mappings.set(key, mapping.sfUserRole);
      }

      logger.info(`✅ Loaded ${this.mappings.size} user role mappings from ${configPath}`);
    } catch (error: any) {
      logger.error(`Failed to load user role mappings: ${error.message}. Using default mappings.`);
      this.loadDefaultMappings();
    }
  }

  private loadDefaultMappings(): void {
    // Default mappings if config file is missing
    const defaultMappings: Array<[string, string]> = [
      ['mrd', 'MRD'],
      ['admin user', 'Admin'],
      ['administrator', 'Admin'],
      ['admin', 'Admin'],
      ['standard user', 'Standard User'],
      ['standard', 'Standard User'],
      ['non-admin user', 'Non-Admin User'],
      ['non-admin', 'Non-Admin User'],
      ['read-only user', 'Read-Only User'],
      ['read-only', 'Read-Only User'],
      ['readonly', 'Read-Only User'],
    ];

    for (const [key, value] of defaultMappings) {
      this.mappings.set(key.toLowerCase(), value);
    }
  }

  /**
   * Gets the Salesforce user role for a Jira mention
   * @param jiraMention - User role as mentioned in Jira (e.g., "MRD", "admin user", "non-admin user")
   * @returns Salesforce user role name (e.g., "MRD", "Admin", "Non-Admin User") or null if not found
   */
  getSFUserRole(jiraMention: string): string | null {
    if (!jiraMention || !jiraMention.trim()) {
      return null;
    }

    const key = jiraMention.toLowerCase().trim();
    
    // Direct lookup
    if (this.mappings.has(key)) {
      return this.mappings.get(key)!;
    }

    // Try partial matches (e.g., "a non-admin user" -> "non-admin user")
    for (const [mappedKey, mappedValue] of this.mappings.entries()) {
      if (key.includes(mappedKey) || mappedKey.includes(key)) {
        logger.debug(`Matched "${jiraMention}" to "${mappedValue}" via partial match`);
        return mappedValue;
      }
    }

    // Try removing common prefixes/suffixes
    const cleaned = key
      .replace(/^(a|an|the)\s+/i, '') // Remove articles
      .replace(/\s+user$/i, '') // Remove "user" suffix
      .replace(/\s+profile$/i, '') // Remove "profile" suffix
      .trim();

    if (cleaned !== key && this.mappings.has(cleaned)) {
      return this.mappings.get(cleaned)!;
    }

    logger.debug(`No mapping found for "${jiraMention}"`);
    return null;
  }

  /**
   * Gets all available mappings
   * @returns Array of all user role mappings
   */
  getAllMappings(): UserRoleMapping[] {
    if (!this.config) {
      return [];
    }
    return [...this.config.mappings];
  }

  /**
   * Checks if a mapping exists for a Jira mention
   * @param jiraMention - User role as mentioned in Jira
   * @returns true if mapping exists
   */
  hasMapping(jiraMention: string): boolean {
    return this.getSFUserRole(jiraMention) !== null;
  }
}

// Singleton instance
let mappingManager: UserRoleMappingManager | null = null;

/**
 * Gets the user role mapping manager instance
 */
export function getUserRoleMapping(): UserRoleMappingManager {
  if (!mappingManager) {
    mappingManager = new UserRoleMappingManager();
  }
  return mappingManager;
}

/**
 * Gets the Salesforce user role for a Jira mention
 * Convenience function that uses the singleton
 */
export function getSFUserRoleFromJira(jiraMention: string): string | null {
  return getUserRoleMapping().getSFUserRole(jiraMention);
}

