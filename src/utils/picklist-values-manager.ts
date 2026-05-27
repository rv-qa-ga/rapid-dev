/**
 * PicklistValuesManager - Centralized picklist values management
 * 
 * Provides:
 * - Loading picklist values from JSON config
 * - Validating picklist values before use
 * - Auto-correcting invalid values (with fuzzy matching)
 * - Support for conditional field requirements
 * - Environment-aware defaults
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './logger';
import { config } from '../config/config';

// ============================================================================
// TYPES
// ============================================================================

interface PicklistFieldConfig {
  validValues: string[];
  defaultValue?: string;
  lastUpdated?: string;
  source?: string;
  conditionalRequirements?: {
    when: {
      [fieldName: string]: string[];
    };
    required: boolean;
    defaultValue?: string;
  };
}

interface PicklistValuesConfig {
  [objectType: string]: {
    [fieldName: string]: PicklistFieldConfig;
  };
}

// ============================================================================
// PICKLIST VALUES MANAGER
// ============================================================================

export class PicklistValuesManager {
  private static instance: PicklistValuesManager | null = null;
  private config: PicklistValuesConfig = {};
  private configPath: string;
  private cache: Map<string, PicklistFieldConfig> = new Map();

  private constructor() {
    // Determine config file path (support per-environment if needed)
    const envName = config.getEnvironment();
    const envConfigPath = path.resolve(process.cwd(), `src/config/env/picklist-values.${envName}.json`);
    const defaultConfigPath = path.resolve(process.cwd(), 'src/config/picklist-values.json');

    // Prefer environment-specific config, fallback to default
    if (fs.existsSync(envConfigPath)) {
      this.configPath = envConfigPath;
      logger.info(`Using environment-specific picklist config: picklist-values.${envName}.json`);
    } else {
      this.configPath = defaultConfigPath;
      logger.info('Using default picklist config: picklist-values.json');
    }

    this.loadConfig();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PicklistValuesManager {
    if (!PicklistValuesManager.instance) {
      PicklistValuesManager.instance = new PicklistValuesManager();
    }
    return PicklistValuesManager.instance;
  }

  /**
   * Load picklist values from JSON config
   */
  private loadConfig(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        logger.warn(`Picklist config file not found: ${this.configPath}. Using empty config.`);
        this.config = {};
        return;
      }

      const configContent = fs.readFileSync(this.configPath, 'utf-8');
      this.config = JSON.parse(configContent);
      
      // Remove $schema and metadata fields
      delete (this.config as any).$schema;
      delete (this.config as any).description;
      delete (this.config as any).version;
      delete (this.config as any).lastUpdated;

      logger.info(`✅ Loaded picklist values config from ${path.basename(this.configPath)}`);
      logger.debug(`   Objects: ${Object.keys(this.config).join(', ')}`);
    } catch (error: any) {
      logger.error(`❌ Failed to load picklist config: ${error.message}`);
      this.config = {};
    }
  }

  /**
   * Get valid values for a field
   */
  getValidValues(objectType: string, fieldName: string): string[] {
    const cacheKey = `${objectType}.${fieldName}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!.validValues;
    }

    const fieldConfig = this.config[objectType]?.[fieldName];
    if (!fieldConfig) {
      logger.debug(`No picklist config found for ${objectType}.${fieldName}`);
      return [];
    }

    this.cache.set(cacheKey, fieldConfig);
    return fieldConfig.validValues;
  }

  /**
   * Get default value for a field
   */
  getDefaultValue(objectType: string, fieldName: string): string | null {
    const fieldConfig = this.config[objectType]?.[fieldName];
    return fieldConfig?.defaultValue || null;
  }

  /**
   * Validate if a value is valid for a field
   */
  isValidValue(objectType: string, fieldName: string, value: string): boolean {
    const validValues = this.getValidValues(objectType, fieldName);
    if (validValues.length === 0) {
      // No config = assume valid (not a picklist or not configured)
      return true;
    }
    return validValues.includes(value);
  }

  /**
   * Validate and correct a picklist value
   * Returns the corrected value (or original if valid)
   */
  validateAndCorrect(
    objectType: string,
    fieldName: string,
    value: string,
    context?: Record<string, any>
  ): string {
    // If no value provided, check for default or conditional requirement
    if (!value || value === '') {
      const conditionalDefault = this.getConditionalDefault(objectType, fieldName, context);
      if (conditionalDefault) {
        logger.debug(`Using conditional default for ${objectType}.${fieldName}: ${conditionalDefault}`);
        return conditionalDefault;
      }
      const defaultValue = this.getDefaultValue(objectType, fieldName);
      if (defaultValue) {
        logger.debug(`Using default value for ${objectType}.${fieldName}: ${defaultValue}`);
        return defaultValue;
      }
      return value; // Return as-is if no default
    }

    // Check if value is valid
    if (this.isValidValue(objectType, fieldName, value)) {
      return value; // Valid, return as-is
    }

    // Try fuzzy matching
    const closestMatch = this.findClosestMatch(objectType, fieldName, value);
    if (closestMatch) {
      logger.warn(
        `⚠️  Invalid picklist value "${value}" for ${objectType}.${fieldName}. ` +
        `Auto-corrected to "${closestMatch}"`
      );
      return closestMatch;
    }

    // No match found - log warning but return original (let API fail with clear error)
    logger.warn(
      `⚠️  Invalid picklist value "${value}" for ${objectType}.${fieldName}. ` +
      `Valid values: ${this.getValidValues(objectType, fieldName).join(', ')}`
    );
    return value;
  }

  /**
   * Find closest match using fuzzy matching
   */
  findClosestMatch(objectType: string, fieldName: string, value: string): string | null {
    const validValues = this.getValidValues(objectType, fieldName);
    if (validValues.length === 0) {
      return null;
    }

    const normalizedValue = value.trim().toLowerCase();

    // Exact case-insensitive match
    for (const validValue of validValues) {
      if (validValue.toLowerCase() === normalizedValue) {
        return validValue;
      }
    }

    // Partial match (contains)
    for (const validValue of validValues) {
      if (validValue.toLowerCase().includes(normalizedValue) || 
          normalizedValue.includes(validValue.toLowerCase())) {
        return validValue;
      }
    }

    // Common mappings (e.g., "Affiliate" -> "AFL")
    const commonMappings: Record<string, Record<string, Record<string, string>>> = {
      Account: {
        Type: {
          customer: 'Agency',
        },
        Affiliate_Non_Affiliate__c: {
          'affiliate': 'AFL',
          'non-affiliate': 'NAF',
          'nonaffiliate': 'NAF',
        },
      },
    };

    const mappings = commonMappings[objectType]?.[fieldName];
    if (mappings) {
      for (const [key, mappedValue] of Object.entries(mappings)) {
        if (normalizedValue.includes(key)) {
          return mappedValue;
        }
      }
    }

    return null;
  }

  /**
   * Get conditional default value based on context
   */
  getConditionalDefault(
    objectType: string,
    fieldName: string,
    context?: Record<string, any>
  ): string | null {
    const fieldConfig = this.config[objectType]?.[fieldName];
    if (!fieldConfig?.conditionalRequirements || !context) {
      return null;
    }

    const requirements = fieldConfig.conditionalRequirements;
    const conditions = requirements.when;

    // Check if all conditions are met
    let allConditionsMet = true;
    for (const [conditionField, conditionValues] of Object.entries(conditions)) {
      const contextValue = context[conditionField];
      if (!contextValue || !conditionValues.includes(contextValue)) {
        allConditionsMet = false;
        break;
      }
    }

    if (allConditionsMet && requirements.required) {
      return requirements.defaultValue || fieldConfig.defaultValue || null;
    }

    return null;
  }

  /**
   * Check if a field is conditionally required based on context
   */
  isConditionallyRequired(
    objectType: string,
    fieldName: string,
    context?: Record<string, any>
  ): boolean {
    const fieldConfig = this.config[objectType]?.[fieldName];
    if (!fieldConfig?.conditionalRequirements || !context) {
      return false;
    }

    const requirements = fieldConfig.conditionalRequirements;
    const conditions = requirements.when;

    // Check if all conditions are met
    for (const [conditionField, conditionValues] of Object.entries(conditions)) {
      const contextValue = context[conditionField];
      if (!contextValue || !conditionValues.includes(contextValue)) {
        return false;
      }
    }

    return requirements.required === true;
  }

  /**
   * Reload config from file (useful after sync)
   */
  reloadConfig(): void {
    this.cache.clear();
    this.loadConfig();
  }
}
