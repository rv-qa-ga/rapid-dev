/**
 * Dynamics Object Registry
 * 
 * Scans and caches Dynamics 365 (Dataverse) entity metadata
 * Provides entity name mappings and field information for test generation
 */

import * as fs from 'fs';
import * as path from 'path';
import { APIRequestContext } from '@playwright/test';
import { DynamicsAPIClient } from '../api-clients/dynamics/DynamicsAPIClient';
import { logger } from './logger';
import { config } from '../config/config';

export interface DynamicsEntity {
  LogicalName: string;        // e.g., "account", "contact"
  EntitySetName: string;      // e.g., "accounts", "contacts"
  DisplayName: string;        // e.g., "Account", "Contact"
  PrimaryIdAttribute: string; // e.g., "accountid", "contactid"
  PrimaryNameAttribute: string; // e.g., "name", "fullname"
  IsCustomEntity: boolean;
  Fields: DynamicsField[];
}

export interface DynamicsField {
  LogicalName: string;        // e.g., "name", "accountnumber"
  DisplayName: string;        // e.g., "Account Name", "Account Number"
  AttributeType: string;      // e.g., "String", "Lookup", "Picklist"
  IsRequired: boolean;
  IsCustomField: boolean;
  MaxLength?: number;
  Options?: Array<{ Value: number; Label: string }>; // For picklists
}

export interface DynamicsObjectRegistry {
  entities: Map<string, DynamicsEntity>; // Key: LogicalName (lowercase)
  entitySetNames: Map<string, string>;  // Key: EntitySetName -> LogicalName
  displayNames: Map<string, string>;    // Key: DisplayName -> LogicalName
  lastUpdated: string;
  environment: string;
}

/**
 * Dynamics Object Registry Manager
 * Scans Dynamics environment and maintains entity registry
 */
export class DynamicsObjectRegistryManager {
  private registryPath: string;
  private registry: DynamicsObjectRegistry | null = null;
  private apiClient: DynamicsAPIClient | null = null;

  constructor() {
    const registryDir = path.join(process.cwd(), 'data', 'dynamics-registry');
    if (!fs.existsSync(registryDir)) {
      fs.mkdirSync(registryDir, { recursive: true });
    }
    this.registryPath = path.join(registryDir, 'entity-registry.json');
  }

  /**
   * Initialize API client for scanning
   */
  private async initializeAPIClient(): Promise<DynamicsAPIClient> {
    if (this.apiClient) {
      return this.apiClient;
    }

    const { request } = await import('@playwright/test');
    const apiContext = await request.newContext();
    this.apiClient = new DynamicsAPIClient(apiContext);
    await this.apiClient.authenticate();
    
    return this.apiClient;
  }

  /**
   * Load registry from cache
   */
  private loadRegistry(): DynamicsObjectRegistry | null {
    if (fs.existsSync(this.registryPath)) {
      try {
        const content = fs.readFileSync(this.registryPath, 'utf-8');
        const data = JSON.parse(content);
        
        // Convert Maps from JSON
        const registry: DynamicsObjectRegistry = {
          entities: new Map(Object.entries(data.entities || {})),
          entitySetNames: new Map(Object.entries(data.entitySetNames || {})),
          displayNames: new Map(Object.entries(data.displayNames || {})),
          lastUpdated: data.lastUpdated,
          environment: data.environment,
        };
        
        return registry;
      } catch (error: any) {
        logger.warn(`Failed to load registry cache: ${error.message}`);
        return null;
      }
    }
    return null;
  }

  /**
   * Save registry to cache
   */
  private saveRegistry(registry: DynamicsObjectRegistry): void {
    try {
      // Convert Maps to objects for JSON serialization
      const data = {
        entities: Object.fromEntries(registry.entities),
        entitySetNames: Object.fromEntries(registry.entitySetNames),
        displayNames: Object.fromEntries(registry.displayNames),
        lastUpdated: registry.lastUpdated,
        environment: registry.environment,
      };
      
      fs.writeFileSync(this.registryPath, JSON.stringify(data, null, 2));
      logger.info(`✅ Registry saved to ${this.registryPath}`);
    } catch (error: any) {
      logger.error(`Failed to save registry: ${error.message}`);
    }
  }

  /**
   * Scan Dynamics environment and build entity registry
   */
  async scanEnvironment(forceRefresh: boolean = false): Promise<DynamicsObjectRegistry> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.loadRegistry();
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.lastUpdated).getTime();
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        if (cacheAge < maxAge) {
          logger.info(`✅ Using cached registry (age: ${Math.round(cacheAge / 1000 / 60)} minutes)`);
          return cached;
        }
      }
    }

    logger.info('🔍 Scanning Dynamics environment for entities...');
    
    const apiClient = await this.initializeAPIClient();
    const env = config.getEnvironment();
    
    const registry: DynamicsObjectRegistry = {
      entities: new Map(),
      entitySetNames: new Map(),
      displayNames: new Map(),
      lastUpdated: new Date().toISOString(),
      environment: env,
    };

    try {
      // Get EntityDefinitions using getAllEntityDefinitions method
      const entityDefinitionsResponse = await apiClient.getAllEntityDefinitions();
      
      // Dynamics returns entity definitions in 'value' array
      const entityDefinitions = entityDefinitionsResponse.value || [];
      
      if (!Array.isArray(entityDefinitions)) {
        throw new Error('Invalid response from EntityDefinitions endpoint');
      }

      logger.info(`📊 Found ${entityDefinitions.length} entities`);

      // Process each entity (limit to first 200 for performance, can be increased)
      const entitiesToProcess = entityDefinitions.slice(0, 200);
      
      for (const entityDef of entitiesToProcess) {
        const logicalName = entityDef.LogicalName?.toLowerCase();
        if (!logicalName) continue;

        // Get entity attributes/fields using getEntityProperties
        let fields: DynamicsField[] = [];
        
        try {
          const attributesResponse = await apiClient.getEntityProperties(logicalName);
          const attributes = attributesResponse.value || [];

          if (Array.isArray(attributes)) {
            fields = attributes.map((attr: any) => ({
              LogicalName: attr.LogicalName,
              DisplayName: attr.DisplayName?.UserLocalizedLabel?.Label || attr.LogicalName,
              AttributeType: attr.AttributeType,
              IsRequired: attr.IsRequired || false,
              IsCustomField: attr.IsCustomAttribute || false,
              MaxLength: attr.MaxLength,
            }));
          }
        } catch (error: any) {
          logger.warn(`⚠️  Could not fetch attributes for ${logicalName}: ${error.message}`);
        }

        // Parse entity definition response
        const entitySetName = entityDef.EntitySetName || logicalName + 's';
        const displayName = entityDef.DisplayName?.UserLocalizedLabel?.Label || 
                           entityDef.DisplayName?.Label || 
                           logicalName.charAt(0).toUpperCase() + logicalName.slice(1);
        const primaryIdAttr = entityDef.PrimaryIdAttribute || `${logicalName}id`;
        const primaryNameAttr = entityDef.PrimaryNameAttribute || 'name';

        const entity: DynamicsEntity = {
          LogicalName: logicalName,
          EntitySetName: entitySetName,
          DisplayName: displayName,
          PrimaryIdAttribute: primaryIdAttr,
          PrimaryNameAttribute: primaryNameAttr,
          IsCustomEntity: entityDef.IsCustomEntity || false,
          Fields: fields,
        };

        registry.entities.set(logicalName, entity);
        registry.entitySetNames.set(entity.EntitySetName.toLowerCase(), logicalName);
        registry.displayNames.set(entity.DisplayName.toLowerCase(), logicalName);
      }

      this.saveRegistry(registry);
      logger.info(`✅ Registry scan complete: ${registry.entities.size} entities registered`);
      
      return registry;
    } catch (error: any) {
      logger.error(`❌ Failed to scan Dynamics environment: ${error.message}`);
      
      // Return cached registry if available, even if stale
      const cached = this.loadRegistry();
      if (cached) {
        logger.warn('⚠️  Using stale cached registry due to scan failure');
        return cached;
      }
      
      throw error;
    }
  }

  /**
   * Get registry (loads from cache or scans if needed)
   */
  async getRegistry(forceRefresh: boolean = false): Promise<DynamicsObjectRegistry> {
    if (this.registry) {
      return this.registry;
    }

    this.registry = await this.scanEnvironment(forceRefresh);
    return this.registry;
  }

  /**
   * Find entity by various name formats
   */
  async findEntity(name: string): Promise<DynamicsEntity | null> {
    const registry = await this.getRegistry();
    const nameLower = name.toLowerCase().trim();

    // Try direct lookup
    if (registry.entities.has(nameLower)) {
      return registry.entities.get(nameLower)!;
    }

    // Try entity set name
    if (registry.entitySetNames.has(nameLower)) {
      const logicalName = registry.entitySetNames.get(nameLower)!;
      return registry.entities.get(logicalName) || null;
    }

    // Try display name
    if (registry.displayNames.has(nameLower)) {
      const logicalName = registry.displayNames.get(nameLower)!;
      return registry.entities.get(logicalName) || null;
    }

    // Try partial match
    for (const [logicalName, entity] of registry.entities.entries()) {
      if (logicalName.includes(nameLower) || 
          entity.DisplayName.toLowerCase().includes(nameLower) ||
          entity.EntitySetName.toLowerCase().includes(nameLower)) {
        return entity;
      }
    }

    return null;
  }

  /**
   * Get all entities
   */
  async getAllEntities(): Promise<DynamicsEntity[]> {
    const registry = await this.getRegistry();
    return Array.from(registry.entities.values());
  }

  /**
   * Check if entity exists
   */
  async entityExists(name: string): Promise<boolean> {
    const entity = await this.findEntity(name);
    return entity !== null;
  }

  /**
   * Get entity field by name
   */
  async getField(entityName: string, fieldName: string): Promise<DynamicsField | null> {
    const entity = await this.findEntity(entityName);
    if (!entity) return null;

    const fieldNameLower = fieldName.toLowerCase();
    return entity.Fields.find(
      f => f.LogicalName.toLowerCase() === fieldNameLower ||
           f.DisplayName.toLowerCase() === fieldNameLower
    ) || null;
  }
}

// Singleton instance
export const dynamicsObjectRegistry = new DynamicsObjectRegistryManager();
