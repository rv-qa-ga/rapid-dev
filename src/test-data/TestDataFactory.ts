/**
 * TestDataFactory - Creates test data via Salesforce API
 * 
 * Supports both UI and API tests by creating prerequisite data
 * before test execution. Uses native fetch (no Playwright dependency).
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { SalesforceJWTAuth } from '../utils/jwt-auth';
import { getRoleBasedDataFactory } from './RoleBasedDataFactory';
import { PicklistValuesManager } from '../utils/picklist-values-manager';
import type { APIRequestContext } from '@playwright/test';

/** SF-942: legacy `Region__c` / picklist values → `Reporting_Region__c` (UK&I, EU, CA, US) */
const LEGACY_REGION_TO_REPORTING: Record<string, string> = {
  US: 'US',
  CA: 'CA',
  EU: 'EU',
  UK: 'UK&I',
  ROW: 'US',
};

// ============================================================================
// TYPES
// ============================================================================

export interface TestRecord {
  id: string;
  type: string;
  name: string;
  data: Record<string, any>;
}

export interface EntityData {
  _description?: string;
  _columns?: string[];
  data: Record<string, any>[];
  statusValues?: string[];
  stageValues?: string[];
}

export interface CreateOptions {
  checkExists?: boolean;
  deleteIfExists?: boolean;
  reuseExisting?: boolean;
  /** Role ID to create record as (e.g., 'mrd', 'member-operations') - optional for backward compatibility */
  role?: string;
  /** Whether to validate FLS before creating (only when role is specified) */
  validateFLS?: boolean;
  /** Scenario ID for tracking test data */
  scenarioId?: string;
}

// ============================================================================
// DEFAULT ACCOUNT DATA - Comprehensive defaults for all account creation
// ============================================================================

/**
 * Default values for Account fields
 * These are applied to ALL accounts created via TestDataFactory
 * to ensure data completeness and avoid validation errors
 * 
 * MAXIMUM FIELDS populated for robust test data
 */
export const DEFAULT_ACCOUNT_DATA: Record<string, any> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIRED / CRITICAL FIELDS
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE: Name is MANDATORY - must be provided when calling createAccount()
  Functional_Currency__c: 'USD',           // Required for Insurer/Reinsurer types
  // SF-942: Reporting_Region__c is the business region (mandatory on Account create in org rules)
  Reporting_Region__c: 'US',
  // NOTE: State/Province field has been removed - it was UI-only and auto-populated from BillingState
  // State_Province__c and Country__c are UI-only fields (auto-populated from BillingState/BillingCountry)
  // They are NOT accessible via REST API - do NOT include in API requests
  Account_Status__c: 'Prospect',           // Required; valid values: Prospect, Onboarding, Contracted, Active, Runoff, Offboarded, Invalid (no "New")
  Type: 'Agency',                           // Default account type
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CONTACT INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  Phone: '+1 212 555 0100',
  Fax: '+1 212 555 0101',
  Website: 'https://test-automation.example.com',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING ADDRESS (Complete)
  // ═══════════════════════════════════════════════════════════════════════════
  BillingStreet: '123 Automation Test Street\nSuite 100',
  BillingCity: 'New York',
  BillingState: 'New York',                 // Also set BillingState for consistency
  BillingPostalCode: '10001',
  BillingCountry: 'United States',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // SHIPPING ADDRESS (Complete)
  // ═══════════════════════════════════════════════════════════════════════════
  ShippingStreet: '456 Test Shipping Lane\nBuilding B',
  ShippingCity: 'New York',
  // ShippingState: Optional - only set if explicitly provided and valid in org
  ShippingPostalCode: '10001',
  ShippingCountry: 'United States',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // COMPANY INFORMATION
  // ═══════════════════════════════════════════════════════════════════════════
  Industry: 'Insurance',
  NumberOfEmployees: 250,
  AnnualRevenue: 5000000,
  TickerSymbol: 'TEST',
  Ownership: 'Private',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // DESCRIPTION & NOTES
  // ═══════════════════════════════════════════════════════════════════════════
  Description: 'Test account created by E2E automation framework for testing purposes. This account contains comprehensive test data across all available fields.',
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CUSTOM FIELDS (Common Salesforce Custom Fields)
  // ═══════════════════════════════════════════════════════════════════════════
  // Note: Add any org-specific custom fields here
};

/**
 * Account Type specific overrides with REGIONAL VARIETY
 * Each Account Type defaults to a different region/country for test data diversity
 * These override DEFAULT_ACCOUNT_DATA when the Type matches
 */
export const ACCOUNT_TYPE_DEFAULTS: Record<string, Record<string, any>> = {
  // ═══════════════════════════════════════════════════════════════════════════
  // EUROPEAN ACCOUNTS (Germany, UK, France, Netherlands, Belgium)
  // ═══════════════════════════════════════════════════════════════════════════
  'Acquisition Company': {
    Functional_Currency__c: 'USD',
    BillingCountry: 'United States',
    BillingCity: 'Chicago',
    BillingState: 'Illinois',  // Valid US state
    BillingPostalCode: '60601',
    Phone: '+1 312 555 0100',
    Industry: 'Insurance',
  },
  'Agency': {
    Functional_Currency__c: 'USD',
    BillingCountry: 'United States',
    BillingCity: 'New York',
    BillingState: 'New York',  // Valid US state
    BillingPostalCode: '10001',
    Phone: '+1 212 555 0100',
    Industry: 'Insurance',
  },
  'Agency Branch': {
    Functional_Currency__c: 'USD',
    BillingCountry: 'United States',
    BillingCity: 'Los Angeles',
    BillingState: 'California',  // Valid US state
    BillingPostalCode: '90001',
    Phone: '+1 213 555 0100',
    Industry: 'Insurance',
  },
  'Distribution Partner': {
    Functional_Currency__c: 'CAD',
    BillingCountry: 'Canada',
    BillingCity: 'Toronto',
    BillingState: 'Ontario',  // Valid Canadian province
    BillingPostalCode: 'M5H 2N2',
    Phone: '+1 416 555 0100',
    Industry: 'Insurance',
  },
  'Group': {
    Functional_Currency__c: 'CAD',
    BillingCountry: 'Canada',
    BillingCity: 'Vancouver',
    BillingState: 'British Columbia',  // Valid Canadian province
    BillingPostalCode: 'V6C 3E8',
    Phone: '+1 604 555 0100',
    Industry: 'Insurance',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // NORTH AMERICAN ACCOUNTS (US, Canada)
  // ═══════════════════════════════════════════════════════════════════════════
  'Insurer': {
    Functional_Currency__c: 'USD',
    BillingCountry: 'United States',
    BillingCity: 'New York',
    BillingState: 'New York',
    BillingPostalCode: '10001',
    Phone: '+1 212 555 0100',
    Industry: 'Insurance',
  },
  'Insurer Branch': {
    Functional_Currency__c: 'USD',
    BillingCountry: 'United States',
    BillingCity: 'Chicago',
    BillingState: 'Illinois',
    BillingPostalCode: '60601',
    Phone: '+1 312 555 0100',
    Industry: 'Insurance',
  },
  'Legal Entity': {
    Functional_Currency__c: 'USD',
    BillingCountry: 'United States',
    BillingCity: 'Los Angeles',
    BillingState: 'California',
    BillingPostalCode: '90001',
    Phone: '+1 213 555 0100',
    Industry: 'Insurance',
  },
  'Member': {
    Functional_Currency__c: 'CAD',
    BillingCountry: 'Canada',
    BillingCity: 'Toronto',
    BillingState: 'Ontario',
    BillingPostalCode: 'M5H 2N2',
    Phone: '+1 416 555 0100',
    Industry: 'Insurance',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // MGA ACCOUNTS (Member MGA, Non-Member MGA)
  // IMPORTANT: These types have special field visibility rules:
  // - Broker_Sourced__c (RESTRICTED PICKLIST) - visible for MGA types
  // - Broker_Sourced_Name__c (text) - visible for MGA types
  // NOTE: In QA, record types are currently restricted. Default is "Master".
  // Field visibility may depend on dynamic page layout rules based on Type.
  // DO NOT set Broker_Sourced__c as it's a restricted picklist with unknown values.
  // ═══════════════════════════════════════════════════════════════════════════
  'Member MGA': {
    Functional_Currency__c: 'CAD',
    BillingCountry: 'Canada',
    BillingCity: 'Toronto',
    BillingState: 'Ontario',
    BillingPostalCode: 'M5H 2N2',
    Phone: '+1 416 555 0100',
    Industry: 'Insurance',
  },
  'Non - Member MGA': {
    Functional_Currency__c: 'CAD',
    BillingCountry: 'Canada',
    BillingCity: 'Vancouver',
    BillingState: 'British Columbia',
    BillingPostalCode: 'V6C 3E8',
    Phone: '+1 604 555 0100',
    Industry: 'Insurance',
  },
  'Non-Member MGA': {
    Functional_Currency__c: 'CAD',
    BillingCountry: 'Canada',
    BillingCity: 'Vancouver',
    BillingState: 'British Columbia',
    BillingPostalCode: 'V6C 3E8',
    Phone: '+1 604 555 0100',
    Industry: 'Insurance',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // UK ACCOUNTS (London, Manchester, Edinburgh)
  // ═══════════════════════════════════════════════════════════════════════════
  'Placing Broker': {
    Functional_Currency__c: 'GBP',
    BillingCountry: 'United Kingdom',
    BillingCity: 'Manchester',
    // BillingState: 'England',  // REMOVED - UK is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: 'M1 1AD',
    Phone: '+44 161 123 4567',
    Industry: 'Insurance',
  },
  'Reinsurance Broker': {
    Functional_Currency__c: 'GBP',
    BillingCountry: 'United Kingdom',
    BillingCity: 'Edinburgh',
    // BillingState: 'Scotland',  // REMOVED - UK is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: 'EH1 1BB',
    Phone: '+44 131 123 4567',
    Industry: 'Insurance',
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // REST OF WORLD ACCOUNTS (Australia, Singapore, Japan)
  // ═══════════════════════════════════════════════════════════════════════════
  'Reinsurer': {
    Functional_Currency__c: 'USD',
    BillingCountry: 'Australia',
    BillingCity: 'Sydney',
    // BillingState: 'New South Wales',  // REMOVED - Australia is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: '2000',
    Phone: '+61 2 1234 5678',
    Industry: 'Insurance',
  },
  'Reinsurer Branch': {
    Functional_Currency__c: 'USD',
    BillingCountry: 'Singapore',
    BillingCity: 'Singapore',
    // BillingState: 'Central Region',  // REMOVED - Singapore is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: '048619',
    Phone: '+65 6123 4567',
    Industry: 'Insurance',
  },
  'Service Company': {
    Functional_Currency__c: 'USD',
    BillingCountry: 'Japan',
    BillingCity: 'Tokyo',
    // BillingState: 'Tokyo',  // REMOVED - Japan is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: '100-0001',
    Phone: '+81 3 1234 5678',
    Industry: 'Insurance',
  },
  'Third Party Administrator': {
    Functional_Currency__c: 'EUR',
    BillingCountry: 'Switzerland',
    BillingCity: 'Zurich',
    // BillingState: 'Zurich',  // REMOVED - Switzerland is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: '8001',
    Phone: '+41 44 123 4567',
    Industry: 'Insurance',
  },
  'TPA Group': {
    Functional_Currency__c: 'EUR',
    BillingCountry: 'Germany',
    BillingCity: 'Berlin',
    // BillingState: 'Berlin',  // REMOVED - Germany is not US/Canada, so BillingState must be blank per validation rule
    BillingPostalCode: '10115',
    Phone: '+49 30 123 4567',
    Industry: 'Insurance',
  },
};

/**
 * Complete list of supported countries with their region/currency defaults
 * Used for on-demand test data creation with variety
 */
export const COUNTRY_DEFAULTS: Record<string, { region: string; currency: string; city: string; state: string; postalCode: string; phone: string }> = {
  // ════════════════════════════════════════════════════════════════════════════
  // NORTH AMERICA (US/CA - State_Province__c picklist supports these)
  // ════════════════════════════════════════════════════════════════════════════
  // NOTE: State fields are OPTIONAL - only set if explicitly provided and valid in org
  'United States': { region: 'US', currency: 'USD', city: 'New York', state: 'New York', postalCode: '10001', phone: '+1 212 555 0100' },
  'Canada': { region: 'CA', currency: 'CAD', city: 'Toronto', state: 'Ontario', postalCode: 'M5H 2N2', phone: '+1 416 555 0100' },
  
  // ════════════════════════════════════════════════════════════════════════════
  // EUROPEAN UNION (EU Region)
  // State values added manually to Salesforce - set if available, but don't fail if missing
  // ════════════════════════════════════════════════════════════════════════════
  'Germany': { region: 'EU', currency: 'EUR', city: 'Munich', state: 'Bavaria', postalCode: '80331', phone: '+49 89 1234567' },
  'France': { region: 'EU', currency: 'EUR', city: 'Paris', state: 'Île-de-France', postalCode: '75001', phone: '+33 1 12 34 56 78' },
  'Netherlands': { region: 'EU', currency: 'EUR', city: 'Amsterdam', state: 'North Holland', postalCode: '1012 AB', phone: '+31 20 123 4567' },
  'Belgium': { region: 'EU', currency: 'EUR', city: 'Brussels', state: 'Brussels-Capital', postalCode: '1000', phone: '+32 2 123 4567' },
  'Switzerland': { region: 'EU', currency: 'EUR', city: 'Zurich', state: 'Zurich', postalCode: '8001', phone: '+41 44 123 4567' },
  'Spain': { region: 'EU', currency: 'EUR', city: 'Madrid', state: 'Madrid', postalCode: '28001', phone: '+34 91 123 4567' },
  'Italy': { region: 'EU', currency: 'EUR', city: 'Milan', state: 'Lombardy', postalCode: '20121', phone: '+39 02 1234 5678' },
  'Austria': { region: 'EU', currency: 'EUR', city: 'Vienna', state: 'Vienna', postalCode: '1010', phone: '+43 1 1234567' },
  'Sweden': { region: 'EU', currency: 'EUR', city: 'Stockholm', state: 'Stockholm County', postalCode: '111 22', phone: '+46 8 123 4567' },
  'Denmark': { region: 'EU', currency: 'EUR', city: 'Copenhagen', state: 'Capital Region', postalCode: '1050', phone: '+45 12 34 56 78' },
  'Norway': { region: 'EU', currency: 'EUR', city: 'Oslo', state: 'Oslo', postalCode: '0150', phone: '+47 22 12 34 56' },
  'Poland': { region: 'EU', currency: 'EUR', city: 'Warsaw', state: 'Masovian', postalCode: '00-001', phone: '+48 22 123 4567' },
  
  // ════════════════════════════════════════════════════════════════════════════
  // UNITED KINGDOM (UK Region)
  // State values added manually to Salesforce - set if available, but don't fail if missing
  // ════════════════════════════════════════════════════════════════════════════
  'United Kingdom': { region: 'UK', currency: 'GBP', city: 'London', state: 'England', postalCode: 'EC2N 4AY', phone: '+44 20 1234 5678' },
  
  // ════════════════════════════════════════════════════════════════════════════
  // REST OF WORLD (ROW Region)
  // State values added for variety - set if available, but don't fail if missing
  // ════════════════════════════════════════════════════════════════════════════
  'Australia': { region: 'ROW', currency: 'USD', city: 'Sydney', state: 'New South Wales', postalCode: '2000', phone: '+61 2 1234 5678' },
  'Singapore': { region: 'ROW', currency: 'USD', city: 'Singapore', state: 'Central Region', postalCode: '048619', phone: '+65 6123 4567' },
  'Japan': { region: 'ROW', currency: 'USD', city: 'Tokyo', state: 'Tokyo', postalCode: '100-0001', phone: '+81 3 1234 5678' },
  'Hong Kong': { region: 'ROW', currency: 'USD', city: 'Hong Kong', state: 'Hong Kong Island', postalCode: '999077', phone: '+852 1234 5678' },
  'United Arab Emirates': { region: 'ROW', currency: 'USD', city: 'Dubai', state: 'Dubai', postalCode: '00000', phone: '+971 4 123 4567' },
  'India': { region: 'ROW', currency: 'USD', city: 'Mumbai', state: 'Maharashtra', postalCode: '400001', phone: '+91 22 1234 5678' },
  'China': { region: 'ROW', currency: 'USD', city: 'Shanghai', state: 'Shanghai', postalCode: '200000', phone: '+86 21 1234 5678' },
  'South Korea': { region: 'ROW', currency: 'USD', city: 'Seoul', state: 'Seoul', postalCode: '04524', phone: '+82 2 1234 5678' },
  'Brazil': { region: 'ROW', currency: 'USD', city: 'São Paulo', state: 'São Paulo', postalCode: '01310-100', phone: '+55 11 1234 5678' },
  'Mexico': { region: 'ROW', currency: 'USD', city: 'Mexico City', state: 'Mexico City', postalCode: '06000', phone: '+52 55 1234 5678' },
};

/**
 * Valid Account Types - picklist values
 */
export const VALID_ACCOUNT_TYPES = [
  'Acquisition Company',
  'Agency',
  'Agency Branch',
  'Distribution Partner',
  'Group',
  'Insurer',
  'Insurer Branch',
  'Legal Entity',
  'Member',
  'Member MGA',
  'Non - Member MGA',
  'Non-Member MGA',
  'Placing Broker',
  'Reinsurance Broker',
  'Reinsurer',
  'Reinsurer Branch',
  'Service Company',
  'Third Party Administrator',
  'TPA Group',
];

/**
 * Valid Account Status values (org-level; "New" is not valid)
 */
export const VALID_ACCOUNT_STATUSES = [
  'Prospect',
  'Onboarding',
  'Contracted',
  'Active',
  'Runoff',
  'Offboarded',
  'Invalid',
];

/**
 * Valid Region values
 */
export const VALID_REGIONS = ['US', 'UK', 'EU', 'CA', 'ROW'];

/**
 * Valid Functional Currency values
 */
export const VALID_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD'];

// ============================================================================
// TEST DATA FACTORY
// ============================================================================

export class TestDataFactory {
  private accessToken: string = '';
  private instanceUrl: string = '';
  private createdRecords: TestRecord[] = [];
  private persistentRecords: Set<string> = new Set();
  private recordTypeCache: Map<string, string> = new Map(); // Cache RecordTypeId by DeveloperName // Records that should NOT be cleaned up
  private dataCache: Map<string, EntityData> = new Map();
  private initialized: boolean = false;
  /** Tracks which JWT subject was used so we can re-auth when switching users (e.g. QA MRD vs default). */
  private jwtUsernameUsed: string | undefined;
  private apiContext?: APIRequestContext; // Optional API context for role-based operations
  private picklistManager: PicklistValuesManager = PicklistValuesManager.getInstance();

  // --------------------------------------------------------------------------
  // INITIALIZATION
  // --------------------------------------------------------------------------

  /**
   * @param explicitJwtUsername - If set (e.g. SF_QAMRDUSER_JWT_USERNAME), authenticate as that user;
   *   re-authenticates when different from the user already in use (matches SalesforceAPIClient MRD pattern).
   *
   * When `explicitJwtUsername` is undefined and `SF_USE_QA_MRD_FOR_API=true`, the QA MRD user is used
   * (mirrors `SalesforceAPIClient.authenticate()`). This keeps every callsite that lacks the explicit
   * override (e.g. internal `describeSObject`/`filterToExistingFields` paths) on the same identity as
   * the explicit MRD callers — required for stories whose fields are MRD-FLS-only (SF-861 Sub_Type__c).
   */
  async initialize(explicitJwtUsername?: string): Promise<void> {
    let u = explicitJwtUsername?.trim() || undefined;
    if (!u && process.env.SF_USE_QA_MRD_FOR_API === 'true') {
      const mrd = process.env.SF_QAMRDUSER_JWT_USERNAME?.trim();
      if (mrd) u = mrd;
    }
    const sameUser =
      this.initialized &&
      (u === this.jwtUsernameUsed || (u === undefined && this.jwtUsernameUsed === undefined));
    if (sameUser) {
      return;
    }

    await this.authenticate(u);
    this.jwtUsernameUsed = u;
    this.initialized = true;
    // Invalidate describe cache on user-context switch: field createability is
    // per-profile, so cached data from a previous user (e.g. SA -> QA MRD) may
    // be stale and cause INVALID_FIELD on insert for fields the new user cannot
    // write.
    if (this.fieldCache && this.fieldCache.size > 0) {
      logger.debug(
        `TestDataFactory describe cache invalidated (${this.fieldCache.size} object(s)) on JWT user switch`
      );
      this.fieldCache.clear();
    }
    logger.info(`TestDataFactory initialized${u ? ` (JWT user: ${u})` : ''}`);
  }

  private async authenticate(usernameOverride?: string): Promise<void> {
    // Use JWT authentication
    try {
      const authResult = await SalesforceJWTAuth.authenticate(usernameOverride);
      this.accessToken = authResult.accessToken;
      this.instanceUrl = authResult.instanceUrl;
      logger.info(`Authenticated to: ${this.instanceUrl} using JWT`);
    } catch (error: any) {
      logger.error(`JWT authentication error: ${error.message}`);
      const envName = config.getEnvironment();
      throw new Error(
        `JWT authentication failed for TestDataFactory. Please configure JWT credentials in src/config/env/.env.${envName}. Error: ${error.message}`
      );
    }
  }

  // --------------------------------------------------------------------------
  // DATA LOADING
  // --------------------------------------------------------------------------

  loadEntityData(entityName: string): EntityData {
    const cacheKey = entityName.toLowerCase();
    
    if (this.dataCache.has(cacheKey)) {
      return this.dataCache.get(cacheKey)!;
    }

    const filePath = path.join(__dirname, 'excel', `${cacheKey}.json`);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Test data file not found: ${filePath}`);
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as EntityData;
    this.dataCache.set(cacheKey, data);
    
    return data;
  }

  getTestData(entityName: string, testCaseId: string): Record<string, any> | null {
    const entityData = this.loadEntityData(entityName);
    return entityData.data.find(d => d.TestCaseID === testCaseId) || null;
  }

  getValidValues(entityName: string, fieldType: 'status' | 'stage'): string[] {
    const entityData = this.loadEntityData(entityName);
    return fieldType === 'status' ? (entityData.statusValues || []) : (entityData.stageValues || []);
  }

  // --------------------------------------------------------------------------
  // API HELPERS
  // --------------------------------------------------------------------------

  /** Use configured Salesforce API version (e.g. v60.0); avoid hardcoding an older version. */
  private getSalesforceRestApiVersionPrefix(): string {
    const v = config.getSalesforceConfig().apiVersion || '60.0';
    return v.startsWith('v') ? v : `v${v}`;
  }

  private async apiRequest(
    method: string,
    endpoint: string,
    body?: Record<string, any>
  ): Promise<any> {
    const url = `${this.instanceUrl}/services/data/${this.getSalesforceRestApiVersionPrefix()}${endpoint}`;
    
    const options: RequestInit = {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        // Bypass Salesforce duplicate detection rules for test data creation
        'Sforce-Duplicate-Rule-Header': 'allowSave=true',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    
    if (method === 'DELETE' && response.status === 204) {
      return { success: true };
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`API ${method} ${endpoint} failed: ${response.status} - ${error}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : { success: true };
  }

  async query(soql: string): Promise<any> {
    const encoded = encodeURIComponent(soql);
    return this.apiRequest('GET', `/query/?q=${encoded}`);
  }

  /**
   * Describe a Salesforce object (fields, picklists, etc.). Used by SF-883 and similar flows.
   */
  async describeSObject(sobjectType: string): Promise<{ name?: string; fields?: any[] }> {
    await this.initialize();
    return this.apiRequest('GET', `/sobjects/${sobjectType}/describe`);
  }

  /**
   * Cache of createable field API names per SObject (populated on first describe).
   * Used by filterToExistingFields to strip fields that do not exist in the current org
   * (e.g. Reporting_Region__c removed from UAT but still referenced in QA defaults).
   */
  private fieldCache: Map<string, Set<string>> = new Map();

  /**
   * Probe the org via describe and strip any payload keys that do NOT exist on the
   * target SObject. Results are cached per SObject per session.
   */
  async filterToExistingFields<T extends Record<string, any>>(
    sobjectType: string,
    payload: T
  ): Promise<T> {
    // Explicit per-object / global strip list from env (applies BEFORE describe).
    // Supports:
    //   SF_SKIP_FIELDS_<OBJECT> = comma-separated field API names (object-specific)
    //   SF_SKIP_FIELDS          = comma-separated field API names (applies to all objects)
    // Used for fields that are in describe but cannot be inserted (e.g. deprecated
    // fields still in metadata, or features not yet deployed to the current env).
    const perObjectKey = `SF_SKIP_FIELDS_${sobjectType.replace(/__c$/, '').toUpperCase()}`;
    const perObject = (process.env[perObjectKey] || '').split(',').map((s) => s.trim()).filter(Boolean);
    const global = (process.env.SF_SKIP_FIELDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const skipList = new Set<string>([...perObject, ...global]);

    // Explicit allow-list: fields that must ALWAYS pass through the filter regardless
    // of what describe says (useful for dependent picklists like Opportunity.Sub_Type__c
    // whose visibility is context-sensitive and may not appear in the raw describe
    // response). Supports:
    //   SF_ALLOW_FIELDS_<OBJECT> = comma-separated field API names (object-specific)
    //   SF_ALLOW_FIELDS          = comma-separated field API names (applies to all)
    const allowPerObjectKey = `SF_ALLOW_FIELDS_${sobjectType.replace(/__c$/, '').toUpperCase()}`;
    const allowPerObject = (process.env[allowPerObjectKey] || '').split(',').map((s) => s.trim()).filter(Boolean);
    const allowGlobal = (process.env.SF_ALLOW_FIELDS || '').split(',').map((s) => s.trim()).filter(Boolean);
    const forceAllow = new Set<string>([...allowPerObject, ...allowGlobal]);

    let allowed = this.fieldCache.get(sobjectType);
    if (!allowed) {
      try {
        const describe = await this.describeSObject(sobjectType);
        // Keep any field that exists in describe (regardless of createable flag).
        // createable=false is often set for dependent picklists whose visibility
        // depends on another field's value (e.g. Opportunity.Sub_Type__c is only
        // writable when Type = Expansion) — dropping these breaks valid scenarios.
        // Explicit problem fields should be listed in SF_SKIP_FIELDS_<OBJECT>.
        // deprecatedAndHidden fields are still excluded.
        const names = (describe.fields || [])
          .filter(
            (f: any) =>
              f && f.deprecatedAndHidden !== true && typeof f.name === 'string'
          )
          .map((f: any) => f.name as string);
        allowed = new Set(names);
        this.fieldCache.set(sobjectType, allowed);
        logger.debug(
          `Cached ${names.length} fields for ${sobjectType} describe`
        );
      } catch (e: any) {
        logger.warn(
          `Could not describe ${sobjectType} for payload filtering (${e.message}); falling back to skip list only`
        );
        allowed = null as unknown as Set<string>;
      }
    }

    const cleaned: Record<string, any> = {};
    const dropped: string[] = [];
    for (const [k, v] of Object.entries(payload)) {
      if (skipList.has(k)) {
        dropped.push(`${k} (env-skip)`);
        continue;
      }
      if (forceAllow.has(k)) {
        cleaned[k] = v;
        continue;
      }
      if (allowed && !allowed.has(k)) {
        dropped.push(k);
        continue;
      }
      cleaned[k] = v;
    }
    if (dropped.length > 0) {
      logger.info(
        `🧹 Dropped ${dropped.length} field(s) from ${sobjectType} payload: ${dropped.join(', ')}`
      );
    }
    return cleaned as T;
  }

  // --------------------------------------------------------------------------
  // ACCOUNT OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Get RecordTypeId by DeveloperName (cached)
   */
  private async getRecordTypeId(developerName: string): Promise<string | null> {
    // Check cache first
    if (this.recordTypeCache.has(developerName)) {
      return this.recordTypeCache.get(developerName) || null;
    }
    
    try {
      // Query for RecordType
      const soql = `SELECT Id, DeveloperName FROM RecordType WHERE SObjectType = 'Account' AND DeveloperName = '${developerName}' LIMIT 1`;
      const result = await this.query(soql);
      
      if (result.records && result.records.length > 0) {
        const recordTypeId = result.records[0].Id;
        this.recordTypeCache.set(developerName, recordTypeId);
        logger.debug(`Found RecordTypeId for ${developerName}: ${recordTypeId}`);
        return recordTypeId;
      }
    } catch (error: any) {
      logger.warn(`Could not query RecordType for ${developerName}: ${error.message}`);
    }
    
    return null;
  }

  /**
   * Build comprehensive account payload with all default fields
   * This ensures all accounts have complete data to avoid validation errors
   */
  private async buildAccountPayload(data: Record<string, any>, accountName: string): Promise<Record<string, any>> {
    const accountType = data.Type;
    
    // Start with global defaults
    const payload: Record<string, any> = {
      ...DEFAULT_ACCOUNT_DATA,
    };
    
    // Apply type-specific defaults if available
    if (accountType && ACCOUNT_TYPE_DEFAULTS[accountType]) {
      Object.assign(payload, ACCOUNT_TYPE_DEFAULTS[accountType]);
    }
    
    // Apply user-provided data (overrides defaults)
    Object.assign(payload, this.filterSalesforceFields(data));
    
    // CRITICAL: Name is MANDATORY - always set it
    if (!accountName || accountName.trim() === '') {
      throw new Error('Account Name is MANDATORY. Please provide a Name when creating an Account.');
    }
    payload.Name = accountName;
    
    // ═══════════════════════════════════════════════════════════════════════════
    // RECORD TYPE HANDLING
    // ═══════════════════════════════════════════════════════════════════════════
    // NOTE: QA ENVIRONMENT CONFIGURATION (Temporary - as of Dec 2024)
    // - Account record types are RESTRICTED for test profiles in QA
    // - Default record type is "Master" for all accounts
    // - DO NOT set RecordTypeId - user doesn't have access to specific record types
    // - Field visibility (e.g., Broker Sourced Name) depends on:
    //   1. Dynamic page layout rules based on Type value
    //   2. Field-level security settings
    // This configuration may change in the future - user will notify.
    // ═══════════════════════════════════════════════════════════════════════════
    
    const isMGAType = accountType === 'Member MGA' || 
                      accountType === 'Non-Member MGA' || 
                      accountType === 'Non - Member MGA';
    
    if (isMGAType) {
      // DO NOT set RecordTypeId - test user doesn't have access in QA environment
      // Salesforce will use the default "Master" record type
      // If this changes in the future, uncomment the RecordTypeId logic below:
      /*
      if (!payload.RecordTypeId) {
        const recordTypeNames = [
          accountType.replace(/\s+/g, '_'),
          accountType.replace(/\s+/g, ''),
          'MGA',
          'Member',
        ];
        for (const rtName of recordTypeNames) {
          const rtId = await this.getRecordTypeId(rtName);
          if (rtId) {
            payload.RecordTypeId = rtId;
            break;
          }
        }
      }
      */
      
      // NOTE: Broker_Sourced__c is a RESTRICTED PICKLIST (not checkbox)
      // Do NOT set a value for it - let the UI page layout control its visibility
      // Broker_Sourced_Name__c is a text field that may be auto-populated from Lead
      // We don't set default values for these fields - they are managed by business rules
      
      logger.info(`📋 Creating MGA Account with Type="${accountType}" (using default Master record type in QA)`);
    }
    
    // CRITICAL: Type is now REQUIRED - cannot create Account without Type
    // ALWAYS ensure Type is set (from DEFAULT_ACCOUNT_DATA, ACCOUNT_TYPE_DEFAULTS, or user data)
    if (!payload.Type) {
      payload.Type = 'Agency'; // Default Type - this should never happen as DEFAULT_ACCOUNT_DATA includes Type
      logger.warn('⚠️  Type not set in payload - defaulting to "Agency". Type is REQUIRED for Account creation.');
    }
    
    // CRITICAL: Ownership is REQUIRED (per SF-573) - ensure it's always set
    if (!payload.Ownership) {
      payload.Ownership = 'Private'; // Default Ownership
      logger.debug('✅ Set Ownership to "Private" (REQUIRED per SF-573)');
    }
    
    // ALWAYS include Functional Currency (even if not strictly required)
    // BUT: Functional_Currency__c is MANDATORY for Insurer, Insurer Branch, Reinsurer (per SF-467)
    if (!payload.Functional_Currency__c) {
      const requiresFunctionalCurrency = ['Insurer', 'Insurer Branch', 'Reinsurer'].includes(payload.Type);
      if (requiresFunctionalCurrency) {
        payload.Functional_Currency__c = 'USD'; // Default for mandatory types
        logger.debug(`✅ Set Functional_Currency__c to "USD" (MANDATORY for ${payload.Type} per SF-467)`);
      } else {
        payload.Functional_Currency__c = 'USD'; // Default for all types
      }
    }
    
    // SF-942: Account uses Reporting_Region__c; strip deprecated API names and map legacy Region__c
    if (payload.Region__c != null && payload.Region__c !== '' && !payload.Reporting_Region__c) {
      const key = String(payload.Region__c);
      payload.Reporting_Region__c = LEGACY_REGION_TO_REPORTING[key] || 'US';
    }
    delete payload.Region__c;
    delete payload.Distribution_Region__c;

    if (!payload.Reporting_Region__c) {
      payload.Reporting_Region__c = 'US';
    }
    
    // ALWAYS include Account Status (valid: Prospect, Onboarding, Contracted, Active, Runoff, Offboarded, Invalid)
    if (!payload.Account_Status__c) {
      payload.Account_Status__c = 'Prospect';
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // CONDITIONAL MANDATORY FIELDS (per SF-467)
    // ═══════════════════════════════════════════════════════════════════════════
    
    // Admission_Status__c is MANDATORY for Insurer (per SF-467)
    if (payload.Type === 'Insurer' && !payload.Admission_Status__c) {
      payload.Admission_Status__c = 'Not Applicable'; // Default value
      logger.debug('✅ Set Admission_Status__c to "Not Applicable" (MANDATORY for Insurer per SF-467)');
    }
    
    // Affiliate_Non_Affiliate__c is MANDATORY for Member, Insurer, Insurer Branch, Group, Reinsurer (per SF-467)
    const requiresAffiliateNonAffiliate = ['Member', 'Insurer', 'Insurer Branch', 'Group', 'Reinsurer'].includes(payload.Type);
    if (requiresAffiliateNonAffiliate && !payload.Affiliate_Non_Affiliate__c) {
      payload.Affiliate_Non_Affiliate__c = 'NAF'; // Default value
      logger.debug(`✅ Set Affiliate_Non_Affiliate__c to "NAF" (MANDATORY for ${payload.Type} per SF-467)`);
    }
    
    // Set Billing Country based on Region
    // Default BillingCountry if not already set from ACCOUNT_TYPE_DEFAULTS
    if (!payload.BillingCountry) {
      payload.BillingCountry = 'United States';
    }
    
  // ═══════════════════════════════════════════════════════════════════════════
  // BILLING ADDRESS FIELDS - Set BillingState based on Region
  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE: State/Province field has been removed - it was UI-only and auto-populated from BillingState
  // State_Province__c and Country__c are UI-only fields (auto-populated from BillingState/BillingCountry)
  // They are NOT accessible via REST API - do NOT include in API requests
  // The validation rule requiring State_Province__c is satisfied by setting BillingState
  
  // CRITICAL: Ensure ShippingCountry matches BillingCountry to avoid validation errors
  // When syncing, also update ShippingCity/ShippingPostalCode so the address makes sense
  if (payload.BillingCountry) {
    if (!payload.ShippingCountry || payload.ShippingCountry !== payload.BillingCountry) {
      const oldShippingCountry = payload.ShippingCountry;
      payload.ShippingCountry = payload.BillingCountry;
      logger.debug(`✅ Synced ShippingCountry to match BillingCountry: "${payload.BillingCountry}" (was: "${oldShippingCountry || 'not set'}")`);

      // Sync ShippingCity and ShippingPostalCode to match billing so the address is coherent
      if (payload.BillingCity) {
        payload.ShippingCity = payload.BillingCity;
      }
      if (payload.BillingPostalCode) {
        payload.ShippingPostalCode = payload.BillingPostalCode;
      }

      // Clear ShippingState when country changes (may be invalid for the new country)
      if (oldShippingCountry && oldShippingCountry !== payload.BillingCountry && payload.ShippingState) {
        logger.debug(`Removing ShippingState "${payload.ShippingState}" because ShippingCountry changed from "${oldShippingCountry}" to "${payload.BillingCountry}"`);
        delete payload.ShippingState;
      }
    }
  }
  
  // CRITICAL: Only copy ShippingState if ShippingCountry matches BillingCountry
  // ShippingState must be valid for ShippingCountry (validation rule)
  // If ShippingCountry differs from BillingCountry, clear ShippingState to avoid validation error
  if (payload.ShippingState && payload.ShippingCountry && payload.BillingCountry && 
      payload.ShippingCountry !== payload.BillingCountry) {
    // ShippingState is set but ShippingCountry differs - this will cause validation error
    logger.debug(`Removing ShippingState "${payload.ShippingState}" because ShippingCountry (${payload.ShippingCountry}) differs from BillingCountry (${payload.BillingCountry})`);
    delete payload.ShippingState;
  } else if (!payload.ShippingState && payload.BillingState && payload.ShippingCountry === payload.BillingCountry) {
    // Only copy if countries match
    payload.ShippingState = payload.BillingState;
  }
  
  // Set BillingState based on BillingCountry (CRITICAL: Validation rule requirement)
  // VALIDATION RULE: "Billing State/Province must be blank unless the country is United States or Canada"
  // Only set BillingState if BillingCountry is "United States" or "Canada"
  if (!payload.BillingState) {
    const billingCountry = payload.BillingCountry || '';
    if (billingCountry === 'United States') {
      payload.BillingState = 'New York'; // Default US state
      logger.debug(`✅ Set BillingState to "New York" for BillingCountry "United States" (satisfies validation rule)`);
    } else if (billingCountry === 'Canada') {
      payload.BillingState = 'Ontario'; // Default Canadian province
      logger.debug(`✅ Set BillingState to "Ontario" for BillingCountry "Canada"`);
    } else {
      // For all other countries, BillingState must be blank per validation rule
      // Explicitly ensure it's not set
      delete payload.BillingState;
      logger.debug(`✅ BillingState left blank for BillingCountry "${billingCountry}" (validation rule requirement)`);
    }
  } else {
    // BillingState was explicitly set - validate it's only set for US/Canada
    const billingCountry = payload.BillingCountry || '';
    if (billingCountry !== 'United States' && billingCountry !== 'Canada' && payload.BillingState) {
      logger.warn(`⚠️  BillingState "${payload.BillingState}" is set but BillingCountry is "${billingCountry}" (not US/Canada). Clearing BillingState to satisfy validation rule.`);
      delete payload.BillingState;
    }
  }
  
  // CRITICAL: ShippingState validation - same rules as BillingState
  // ShippingState must be blank unless the country is US or Canada
  const shippingCountry = payload.ShippingCountry || '';
  if (shippingCountry !== 'United States' && shippingCountry !== 'Canada') {
    if (payload.ShippingState) {
      logger.debug(`Removing ShippingState "${payload.ShippingState}" - not valid for ShippingCountry "${shippingCountry}" (only US/Canada allowed)`);
      delete payload.ShippingState;
    }
  } else if (!payload.ShippingState && payload.BillingState && payload.ShippingCountry === payload.BillingCountry) {
    payload.ShippingState = payload.BillingState;
  }
  
  // Remove UI-only fields before returning (they're not accessible via API)
  // State_Province__c and Country__c are auto-populated from BillingState/BillingCountry
  const finalPayload = this.filterUIOnlyFields(payload);
    
    logger.info(`📦 Account payload built with ${Object.keys(finalPayload).length} fields (UI-only fields removed)`);
    logger.debug(`Payload details: ${JSON.stringify(finalPayload, null, 2)}`);
    
    return finalPayload;
  }

  /**
   * Same REST payload shaping as createAccount (defaults, billing, picklists, describe filter)
   * without idempotency checks or POST — for integration steps that call SalesforceAPIClient directly.
   */
  async composeAccountPayloadForIntegrationApi(data: Record<string, any>): Promise<Record<string, any>> {
    if (!data?.Name || String(data.Name).trim() === '') {
      throw new Error('Account Name is MANDATORY when composing Account payload.');
    }
    await this.initialize();
    const accountName = String(data.Name).trim();
    let payload = await this.buildAccountPayload(data, accountName);
    delete payload.Region__c;
    delete payload.Distribution_Region__c;
    if (!payload.Reporting_Region__c) {
      payload.Reporting_Region__c = 'US';
    }
    if ((payload.BillingCountry === 'United States' || payload.BillingCountry === 'Canada') && !payload.BillingState) {
      payload.BillingState = payload.BillingCountry === 'United States' ? 'New York' : 'Ontario';
      logger.debug(`✅ Set BillingState to "${payload.BillingState}" for ${payload.BillingCountry}`);
    }
    let apiPayload = this.filterUIOnlyFields(payload);
    apiPayload = this.validateAndCorrectPicklistValues('Account', apiPayload);
    this.applyConditionalFieldRequirements('Account', apiPayload);
    apiPayload = await this.filterToExistingFields('Account', apiPayload);
    return apiPayload;
  }


  /**
   * Set API context for role-based operations
   * This is optional and only needed when using role-based data creation
   */
  setAPIContext(apiContext: APIRequestContext): void {
    this.apiContext = apiContext;
  }

  async createAccount(
    data: Record<string, any>,
    options: CreateOptions = {}
  ): Promise<TestRecord> {
    // If role is specified, use RoleBasedDataFactory
    if (options.role) {
      logger.info(`Creating Account as role "${options.role}" via RoleBasedDataFactory`);
      const roleFactory = getRoleBasedDataFactory();
      return await roleFactory.createAccountAsRole(
        options.role,
        data,
        {
          checkExists: options.checkExists,
          deleteIfExists: options.deleteIfExists,
          reuseExisting: options.reuseExisting,
          validateFLS: options.validateFLS,
          scenarioId: options.scenarioId,
        },
        this.apiContext
      );
    }

    // Default behavior (backward compatible)
    // ENFORCE IDEMPOTENCY: Default to always check and delete if exists
    const { checkExists = true, deleteIfExists = true, reuseExisting = false } = options;
    
    // CRITICAL: Account Name is MANDATORY
    if (!data.Name || data.Name.trim() === '') {
      throw new Error('Account Name is MANDATORY. Please provide a Name field when creating an Account.');
    }
    const accountName = data.Name;

    logger.info(`Creating Account: ${accountName}`);

    // ALWAYS check for existing records first (idempotency)
    if (checkExists) {
      logger.debug(`Checking for existing Account with Name: ${accountName}`);
      const existing = await this.findRecord('Account', 'Name', accountName);
      
      if (existing) {
        logger.info(`Found existing Account: ${existing.Id} with Name: ${accountName}`);
        
        if (reuseExisting) {
          logger.info(`Reusing existing Account: ${existing.Id}`);
          return { id: existing.Id, type: 'Account', name: accountName, data };
        }
        
        // ALWAYS delete if exists (unless explicitly told not to)
        if (deleteIfExists) {
          logger.info(`Deleting existing Account before creating new one: ${existing.Id}`);
          try {
            await this.deleteRecord('Account', existing.Id);
            logger.info(`Successfully deleted existing Account: ${existing.Id}`);
          } catch (error: any) {
            logger.warn(`Failed to delete existing Account ${existing.Id}: ${error.message}`);
            // Continue anyway - will create duplicate but at least we tried
          }
        } else {
          logger.warn(`Existing Account found but deleteIfExists=false. Will create duplicate: ${accountName}`);
        }
      } else {
        logger.debug(`No existing Account found with Name: ${accountName}`);
      }
    }

    // Build comprehensive payload with all defaults
    const payload = await this.buildAccountPayload(data, accountName);
    
    // Strip any deprecated names that bypassed buildAccountPayload
    delete payload.Region__c;
    delete payload.Distribution_Region__c;
    if (!payload.Reporting_Region__c) {
      payload.Reporting_Region__c = 'US';
    }
    
    // Ensure BillingState is set for US/CA countries (satisfies validation rule)
    if ((payload.BillingCountry === 'United States' || payload.BillingCountry === 'Canada') && !payload.BillingState) {
      payload.BillingState = payload.BillingCountry === 'United States' ? 'New York' : 'Ontario';
      logger.debug(`✅ Set BillingState to "${payload.BillingState}" for ${payload.BillingCountry}`);
    }
    
    // Final filter: Remove any UI-only fields that might have been added
    let apiPayload = this.filterUIOnlyFields(payload);
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PICKLIST VALIDATION AND AUTO-CORRECTION
    // ═══════════════════════════════════════════════════════════════════════════
    apiPayload = this.validateAndCorrectPicklistValues('Account', apiPayload);
    
    // Handle conditional field requirements (e.g., Affiliate_Non_Affiliate__c when Status = Onboarding)
    this.applyConditionalFieldRequirements('Account', apiPayload);
    
    logger.info(`📤 API Request - POST /sobjects/Account`);
    logger.info(`📦 Request Payload: ${JSON.stringify(apiPayload, null, 2)}`);
    logger.info(`🔍 Validation: BillingCountry="${apiPayload.BillingCountry || 'NOT SET'}", BillingState="${apiPayload.BillingState || 'NOT SET'}"`);
    logger.debug(`ℹ️  Note: State_Province__c, Country__c are UI-only; Reporting_Region__c is SF-942 business region`);

    // Probe describe and drop any fields not present on Account in this org
    // (e.g. Reporting_Region__c may have been removed from UAT/QA).
    apiPayload = await this.filterToExistingFields('Account', apiPayload);

    // Create account via API
    const result = await this.apiRequest('POST', '/sobjects/Account', apiPayload);
    
    logger.info(`📥 API Response - Account ID: ${result.id}`);
    logger.info(`📋 Full Response: ${JSON.stringify(result, null, 2)}`);

    const record: TestRecord = {
      id: result.id,
      type: 'Account',
      name: accountName,
      data
    };

    this.createdRecords.push(record);
    logger.info(`Account created: ${result.id}`);
    
    return record;
  }

  async createAccountWithStatus(
    status: string,
    additionalData: Record<string, any> = {},
    options: CreateOptions = {}
  ): Promise<TestRecord> {
    return this.createAccount({
      Name: `Test Account - ${status} - ${Date.now()}`,
      Account_Status__c: status,
      ...additionalData
    }, options);
  }

  // --------------------------------------------------------------------------
  // CONTACT OPERATIONS
  // --------------------------------------------------------------------------

  async createContact(
    data: Record<string, any>,
    accountId?: string,
    options: CreateOptions = {}
  ): Promise<TestRecord> {
    // If role is specified, use RoleBasedDataFactory
    if (options.role) {
      logger.info(`Creating Contact as role "${options.role}" via RoleBasedDataFactory`);
      if (!accountId) {
        throw new Error('AccountId is required when creating Contact as a role');
      }
      const roleFactory = getRoleBasedDataFactory();
      return await roleFactory.createContactAsRole(
        options.role,
        data,
        accountId,
        {
          checkExists: options.checkExists,
          deleteIfExists: options.deleteIfExists,
          reuseExisting: options.reuseExisting,
          validateFLS: options.validateFLS,
          scenarioId: options.scenarioId,
        },
        this.apiContext
      );
    }

    // Default behavior (backward compatible)
    const lastName = data.LastName || `TestContact${Date.now()}`;

    logger.info(`Creating Contact: ${data.FirstName || ''} ${lastName}`);

    let contactData: Record<string, any> = {
      LastName: lastName,
      ...this.filterSalesforceFields(data)
    };

    if (accountId) {
      contactData.AccountId = accountId;
    }

    // Probe describe and drop fields not present on Contact in this org
    // (e.g. Reporting_Region__c may not exist in UAT yet).
    contactData = await this.filterToExistingFields('Contact', contactData);

    const result = await this.apiRequest('POST', '/sobjects/Contact', contactData);

    const record: TestRecord = {
      id: result.id,
      type: 'Contact',
      name: `${data.FirstName || ''} ${lastName}`.trim(),
      data
    };

    this.createdRecords.push(record);
    logger.info(`Contact created: ${result.id}`);
    
    return record;
  }

  // --------------------------------------------------------------------------
  // LEAD OPERATIONS
  // --------------------------------------------------------------------------

  async createLead(data: Record<string, any>, options: CreateOptions = {}): Promise<TestRecord> {
    // If role is specified, use RoleBasedDataFactory
    if (options.role) {
      logger.info(`Creating Lead as role "${options.role}" via RoleBasedDataFactory`);
      const roleFactory = getRoleBasedDataFactory();
      return await roleFactory.createLeadAsRole(
        options.role,
        data,
        {
          checkExists: options.checkExists,
          deleteIfExists: options.deleteIfExists,
          reuseExisting: options.reuseExisting,
          validateFLS: options.validateFLS,
          scenarioId: options.scenarioId,
        },
        this.apiContext
      );
    }

    // Default behavior (backward compatible)
    const lastName = data.LastName || `TestLead${Date.now()}`;
    const company = data.Company || 'Test Company';
    
    // Handle Name field - split into FirstName and LastName if provided
    if (data.Name && !data.FirstName && !data.LastName) {
      const nameParts = data.Name.trim().split(/\s+/);
      if (nameParts.length > 1) {
        data.FirstName = nameParts[0];
        data.LastName = nameParts.slice(1).join(' ');
      } else {
        data.LastName = nameParts[0];
      }
      delete data.Name; // Remove Name field as it's not a valid Lead field
    }

    logger.info(`Creating Lead: ${data.FirstName || ''} ${lastName}`);

    let payload: Record<string, any> = {
      LastName: lastName,
      Company: company,
      ...this.filterSalesforceFields(data)
    };
    
    // SF-942: Lead has Reporting_Region__c; map legacy Region__c if tests still pass it
    if (payload.Region__c != null && payload.Region__c !== '' && !payload.Reporting_Region__c) {
      const key = String(payload.Region__c);
      payload.Reporting_Region__c = LEGACY_REGION_TO_REPORTING[key] || 'US';
    }
    delete payload.Region__c;
    delete payload.Distribution_Region__c;
    if (payload.Reporting_Region__c == null || payload.Reporting_Region__c === '') {
      payload.Reporting_Region__c = 'US';
    }

    // Env-specific default Lead Type__c / Status (some orgs default these via flow,
    // others require them on REST insert). Set SF_DEFAULT_LEAD_TYPE__c / LEAD_STATUS
    // in .env.<env> when the active org doesn't have the auto-default deployed.
    if (!payload.Type__c && process.env.SF_DEFAULT_LEAD_TYPE__c) {
      payload.Type__c = process.env.SF_DEFAULT_LEAD_TYPE__c.trim();
      logger.info(`Lead default Type__c applied from env: "${payload.Type__c}"`);
    }
    if (!payload.Status && process.env.SF_DEFAULT_LEAD_STATUS) {
      payload.Status = process.env.SF_DEFAULT_LEAD_STATUS.trim();
      logger.info(`Lead default Status applied from env: "${payload.Status}"`);
    }

    // Probe describe and drop fields not present on Lead in this org
    // (e.g. Reporting_Region__c may not exist in UAT yet).
    payload = await this.filterToExistingFields('Lead', payload);

    const result = await this.apiRequest('POST', '/sobjects/Lead', payload);

    const record: TestRecord = {
      id: result.id,
      type: 'Lead',
      name: `${data.FirstName || ''} ${lastName}`.trim(),
      data
    };

    this.createdRecords.push(record);
    logger.info(`Lead created: ${result.id}`);
    
    return record;
  }

  /**
   * Convert Lead to Account, Contact, and Opportunity (REST v58.0 convert endpoint).
   * Same contract as SalesforceAPIClient.convertLead; kept on TestDataFactory for script use without Playwright context.
   */
  async convertLead(
    leadId: string,
    options: {
      convertedStatus?: string;
      doNotCreateOpportunity?: boolean;
      opportunityName?: string;
      overwriteLeadSource?: boolean;
      accountId?: string;
      contactId?: string;
      ownerId?: string;
    } = {}
  ): Promise<{
    success: boolean;
    opportunityId?: string;
    accountId?: string;
    contactId?: string;
    errors?: Array<{ message: string; statusCode: string }>;
  }> {
    await this.initialize();
    const convertApiVersion = '58.0';
    const url = `${this.instanceUrl.replace(/\/$/, '')}/services/data/${convertApiVersion}/sobjects/Lead/${leadId}/convert`;
    const payload: Record<string, unknown> = {
      convertedStatus: options.convertedStatus || 'Qualified',
      doNotCreateOpportunity: options.doNotCreateOpportunity || false,
      opportunityName: options.opportunityName || `Test Opportunity ${Date.now()}`,
      overwriteLeadSource: options.overwriteLeadSource || false,
      ...(options.accountId && { accountId: options.accountId }),
      ...(options.contactId && { contactId: options.contactId }),
      ...(options.ownerId && { ownerId: options.ownerId }),
    };
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'Sforce-Duplicate-Rule-Header': 'allowSave=true',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const status = response.status;
      const errorText = await response.text();
      let errorMessage = errorText;
      try {
        const errorData = JSON.parse(errorText);
        if (Array.isArray(errorData)) {
          errorMessage = errorData.map((e: any) => e.message || JSON.stringify(e)).join('; ');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.errors) {
          errorMessage = JSON.stringify(errorData.errors);
        }
      } catch {
        // keep text
      }
      if (status === 404) {
        throw new Error(
          `Failed to convert Lead: convert endpoint 404. Check Convert Leads permission and API. ${errorMessage}`
        );
      }
      throw new Error(`Failed to convert Lead: ${errorMessage}`);
    }
    return await response.json();
  }

  // --------------------------------------------------------------------------
  // OPPORTUNITY OPERATIONS
  // --------------------------------------------------------------------------

  async createOpportunity(
    data: Record<string, any>,
    accountId: string
  ): Promise<TestRecord> {
    const oppName = data.Name || `Test Opportunity ${Date.now()}`;

    let closeDate = data.CloseDate;
    if (typeof closeDate === 'string' && closeDate.startsWith('+')) {
      const days = parseInt(closeDate.replace('+', '').replace('days', ''), 10);
      const date = new Date();
      date.setDate(date.getDate() + days);
      closeDate = date.toISOString().split('T')[0];
    }

    // Valid Opportunity StageName values: Pipeline, Due Diligence, Contract, Go-Live, Active, Unqualified (Prospecting is NOT valid)
    const requestedStage = data.Stage || 'Pipeline';
    const stageName =
      requestedStage === 'Pipeline' && process.env.SF_OPPORTUNITY_STAGE_PIPELINE
        ? process.env.SF_OPPORTUNITY_STAGE_PIPELINE
        : requestedStage;
    if (requestedStage === 'Pipeline' && stageName !== requestedStage) {
      logger.info(`Opportunity stage override: "Pipeline" -> StageName "${stageName}" (SF_OPPORTUNITY_STAGE_PIPELINE)`);
    }

    logger.info(`Creating Opportunity: ${oppName} (StageName=${stageName})`);
    const oppPayload: Record<string, any> = {
      Name: oppName,
      AccountId: accountId,
      StageName: stageName,
      CloseDate: closeDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      ...this.filterSalesforceFields(data)
    };

    // Env-specific default Type (SF_DEFAULT_OPPORTUNITY_TYPE). In some orgs Type is
    // auto-defaulted by flow/trigger; in others the REST API requires it explicitly.
    // Set SF_DEFAULT_OPPORTUNITY_TYPE=<picklist value> in .env.<env> to provide a
    // fallback when no Type is passed in via the step data.
    if (!oppPayload.Type) {
      const envDefaultType = process.env.SF_DEFAULT_OPPORTUNITY_TYPE?.trim();
      if (envDefaultType) {
        oppPayload.Type = envDefaultType;
        logger.info(`Opportunity default Type applied from env: "${envDefaultType}"`);
        // If Type = Expansion, also set Sub_Type__c when SF_DEFAULT_OPPORTUNITY_SUB_TYPE
        // is provided (org validation requires Sub Type when Type=Expansion).
        if (!oppPayload.Sub_Type__c && process.env.SF_DEFAULT_OPPORTUNITY_SUB_TYPE) {
          oppPayload.Sub_Type__c = process.env.SF_DEFAULT_OPPORTUNITY_SUB_TYPE.trim();
          logger.info(`Opportunity default Sub_Type__c applied from env: "${oppPayload.Sub_Type__c}"`);
        }
      }
    }

    // Probe describe and drop fields not present on Opportunity in this org
    // (e.g. Reporting_Region__c may not exist in UAT yet).
    const filteredOppPayload = await this.filterToExistingFields('Opportunity', oppPayload);
    const result = await this.apiRequest('POST', '/sobjects/Opportunity', filteredOppPayload);

    const record: TestRecord = {
      id: result.id,
      type: 'Opportunity',
      name: oppName,
      data
    };

    this.createdRecords.push(record);
    logger.info(`Opportunity created: ${result.id}`);
    
    return record;
  }

  /**
   * Create or find Opportunity_Readiness__c (Opportunity Summary questionnaire) for an Opportunity.
   * SF-357: Used when testing Opportunity Summary fields and Executive approval.
   * Lookup to Opportunity is typically Opportunity__c.
   */
  async createOpportunityReadiness(
    opportunityId: string,
    opportunityName: string,
    data?: Record<string, any>
  ): Promise<TestRecord> {
    const name = data?.Name || `Opp Readiness ${opportunityName || opportunityId}`;
    logger.info(`Creating Opportunity_Readiness__c for Opportunity: ${opportunityId}`);

    const payload = {
      Name: name,
      Opportunity__c: opportunityId,
      ...(data || {}),
    };

    const result = await this.apiRequest('POST', '/sobjects/Opportunity_Readiness__c', payload);

    const record: TestRecord = {
      id: result.id,
      type: 'Opportunity_Readiness__c',
      name,
      data: payload,
    };

    this.createdRecords.push(record);
    logger.info(`Opportunity_Readiness__c created: ${result.id}`);
    return record;
  }

  /**
   * Find existing Opportunity_Readiness__c record linked to an Opportunity (e.g. auto-created by process).
   */
  async findOpportunityReadinessByOpportunity(opportunityId: string): Promise<TestRecord | null> {
    const row = await this.findRecord('Opportunity_Readiness__c', 'Opportunity__c', opportunityId);
    if (!row) return null;
    return {
      id: row.Id,
      type: 'Opportunity_Readiness__c',
      name: row.Name || '',
      data: {},
    };
  }

  /**
   * Submit a record for approval using the Process Approvals API.
   * @returns submission result with instanceId and newWorkitemIds if successful.
   */
  async submitForApproval(
    contextId: string,
    processDefinitionNameOrId?: string
  ): Promise<{ instanceId?: string; newWorkitemIds?: string[]; results?: any[] }> {
    const request: Record<string, unknown> = { actionType: 'Submit', contextId };
    if (processDefinitionNameOrId != null && String(processDefinitionNameOrId).trim() !== '') {
      request.processDefinitionNameOrId = processDefinitionNameOrId;
    }
    const body = { requests: [request] };
    const result = await this.apiRequest('POST', '/process/approvals', body);
    const first = result.results?.[0];
    return {
      instanceId: first?.instanceId,
      newWorkitemIds: first?.newWorkitemIds,
      results: result.results,
    };
  }

  /**
   * Add an Opportunity Team Member (for contracting test data / DD stage).
   * OpportunityAccessLevel: 'Read' | 'Edit' (Edit = Read/Write).
   */
  async createOpportunityTeamMember(
    opportunityId: string,
    userId: string,
    teamMemberRole: string,
    opportunityAccessLevel: 'Read' | 'Edit' = 'Edit'
  ): Promise<{ id: string }> {
    const result = await this.apiRequest('POST', '/sobjects/OpportunityTeamMember', {
      OpportunityId: opportunityId,
      UserId: userId,
      TeamMemberRole: teamMemberRole,
      OpportunityAccessLevel: opportunityAccessLevel,
    });
    return { id: result.id };
  }

  // --------------------------------------------------------------------------
  // GENERIC OPERATIONS
  // --------------------------------------------------------------------------

  async findRecord(sobjectType: string, field: string, value: string): Promise<any | null> {
    try {
      // Handle Id field specially - don't include it twice in SELECT
      let selectFields = 'Id, Name';
      if (field !== 'Id' && field !== 'Name') {
        selectFields = `Id, Name, ${field}`;
      }
      
      const result = await this.query(
        `SELECT ${selectFields} FROM ${sobjectType} WHERE ${field} = '${value}' LIMIT 1`
      );
      return result.records?.[0] || null;
    } catch (error: any) {
      logger.debug(`findRecord error: ${error.message}`);
      return null;
    }
  }

  /**
   * Verify a record exists by ID (simple existence check)
   */
  async verifyRecordExists(sobjectType: string, recordId: string): Promise<boolean> {
    try {
      const result = await this.query(
        `SELECT Id, Name FROM ${sobjectType} WHERE Id = '${recordId}' LIMIT 1`
      );
      return result.records && result.records.length > 0;
    } catch (error: any) {
      logger.debug(`verifyRecordExists error: ${error.message}`);
      return false;
    }
  }

  async deleteRecord(sobjectType: string, recordId: string): Promise<void> {
    logger.info(`Deleting ${sobjectType}: ${recordId}`);
    await this.apiRequest('DELETE', `/sobjects/${sobjectType}/${recordId}`);
  }

  async updateRecord(sobjectType: string, recordId: string, data: Record<string, any>): Promise<void> {
    logger.info(`Updating ${sobjectType}: ${recordId}`);
    
    // Validate and correct picklist values before update
    const correctedData = this.validateAndCorrectPicklistValues(sobjectType, data);
    
    // Apply conditional requirements
    this.applyConditionalFieldRequirements(sobjectType, correctedData);
    
    await this.apiRequest('PATCH', `/sobjects/${sobjectType}/${recordId}`, correctedData);
  }

  // --------------------------------------------------------------------------
  // REGISTER EXTERNAL RECORD (for records created outside TestDataFactory)
  // --------------------------------------------------------------------------
  
  /**
   * Register an externally-created record for cleanup tracking.
   * Use this for records created via direct API calls (e.g., AccountContactRelation).
   */
  registerRecord(recordId: string, sobjectType: string, name?: string): void {
    const record: TestRecord = {
      id: recordId,
      type: sobjectType,
      name: name || `${sobjectType}_${recordId}`,
      data: {}
    };
    this.createdRecords.push(record);
    logger.debug(`Registered ${sobjectType} record for cleanup: ${recordId}`);
  }

  // --------------------------------------------------------------------------
  // CLEANUP
  // --------------------------------------------------------------------------
  // NOTE: Only records explicitly marked via markAsPersistent() will be skipped.
  // Regular test records (created via data-factory.steps.ts) are ALWAYS cleaned up.
  // On-demand records (created via on-demand-data.steps.ts) are marked persistent.
  // --------------------------------------------------------------------------

  async cleanup(): Promise<void> {
    if (this.createdRecords.length === 0) {
      logger.debug('No records to clean up');
      return;
    }

    // Log the persistent records set size for debugging
    logger.debug(`Persistent records set contains ${this.persistentRecords.size} record ID(s)`);

    // Filter out persistent records - only these will be skipped
    const toDelete = this.createdRecords
      .filter(record => !this.persistentRecords.has(record.id))
      .reverse(); // Reverse to delete in correct order (handles dependencies)
    
    const persistentCount = this.createdRecords.length - toDelete.length;
    
    if (toDelete.length === 0 && persistentCount > 0) {
      logger.info(`📌 All ${this.createdRecords.length} records are PERSISTENT (on-demand) - skipping cleanup`);
      this.createdRecords = [];
      return;
    }
    
    if (persistentCount > 0) {
      logger.info(`📌 Skipping ${persistentCount} PERSISTENT (on-demand) records`);
    }

    logger.info(`🧹 Cleaning up ${toDelete.length} regular test records`);

    let deletedCount = 0;
    let failedCount = 0;

    const failedRecords: Array<{ type: string; id: string; name: string; error: string }> = [];
    
    for (const record of toDelete) {
      try {
        logger.debug(`Deleting ${record.type} ${record.id} (${record.name})`);
        await this.deleteRecord(record.type, record.id);
        deletedCount++;
        logger.debug(`✅ Deleted ${record.type} ${record.id}`);
      } catch (error: any) {
        failedCount++;
        const errorMsg = error.message || String(error);
        failedRecords.push({
          type: record.type,
          id: record.id,
          name: record.name,
          error: errorMsg
        });
        logger.warn(`❌ Failed to delete ${record.type} ${record.id} (${record.name}): ${errorMsg}`);
        
        // Log more details for debugging
        if (error.status) {
          logger.warn(`   Status code: ${error.status}`);
        }
        if (error.response) {
          logger.warn(`   Response: ${JSON.stringify(error.response)}`);
        }
        
        // Continue deleting other records even if one fails
      }
    }

    // Clear the array regardless of success/failure
    // Failed records are logged above for manual cleanup if needed
    this.createdRecords = [];
    
    if (failedCount > 0) {
      logger.warn(`⚠️  Cleanup completed: ${deletedCount} deleted, ${failedCount} failed`);
      logger.warn(`⚠️  Failed records (may need manual cleanup):`);
      failedRecords.forEach(r => {
        logger.warn(`   - ${r.type}: ${r.id} (${r.name}) - Error: ${r.error}`);
      });
    } else {
      logger.info(`✅ Cleanup complete: ${deletedCount} records deleted`);
    }
  }

  getCreatedRecords(): TestRecord[] {
    return [...this.createdRecords];
  }

  /**
   * Mark a record as persistent (will NOT be cleaned up)
   * Used for on-demand test data creation
   */
  markAsPersistent(recordId: string): void {
    this.persistentRecords.add(recordId);
    logger.info(`📌 Record ${recordId} marked as PERSISTENT (will not be cleaned up)`);
  }

  /**
   * Check if a record is marked as persistent
   */
  isPersistent(recordId: string): boolean {
    return this.persistentRecords.has(recordId);
  }

  /**
   * Clean up orphaned test records by pattern (for manual cleanup)
   * This is useful for cleaning up records from failed test runs
   */
  async cleanupOrphanedRecords(
    sobjectType: string,
    namePattern: string,
    limit: number = 100
  ): Promise<number> {
    try {
      await this.initialize();
      
      logger.info(`Searching for orphaned ${sobjectType} records matching pattern: ${namePattern}`);
      
      // Query for records matching the pattern
      const soql = `SELECT Id, Name FROM ${sobjectType} WHERE Name LIKE '${namePattern}' ORDER BY CreatedDate DESC LIMIT ${limit}`;
      const result = await this.query(soql);
      
      if (!result.records || result.records.length === 0) {
        logger.info(`No orphaned ${sobjectType} records found matching pattern: ${namePattern}`);
        return 0;
      }
      
      logger.info(`Found ${result.records.length} orphaned ${sobjectType} records to delete`);
      
      let deletedCount = 0;
      for (const record of result.records) {
        try {
          await this.deleteRecord(sobjectType, record.Id);
          deletedCount++;
          logger.debug(`Deleted orphaned ${sobjectType}: ${record.Id} (${record.Name})`);
        } catch (error: any) {
          logger.warn(`Failed to delete orphaned ${sobjectType} ${record.Id}: ${error.message}`);
        }
      }
      
      logger.info(`✅ Cleaned up ${deletedCount} orphaned ${sobjectType} records`);
      return deletedCount;
    } catch (error: any) {
      logger.error(`Failed to cleanup orphaned records: ${error.message}`);
      throw error;
    }
  }

  // --------------------------------------------------------------------------
  // HELPERS
  // --------------------------------------------------------------------------

  /**
   * Filter out UI-only and calculated fields that must not be set via REST API.
   * SF-942: deprecated Region__c / Distribution_Region__c API names must not be sent (use Reporting_Region__c).
   * State_Province__c and Country__c are auto-populated from BillingState/BillingCountry.
   */
  private filterUIOnlyFields(data: Record<string, any>): Record<string, any> {
    const uiOnlyFields = [
      'State_Province__c',    // Auto-populated from BillingState
      'Country__c',          // Auto-populated from BillingCountry
      'Region__c',           // Removed / replaced by Reporting_Region__c (SF-942)
      'Distribution_Region__c', // Renamed to RDM_Region__c — do not send legacy name
    ];
    
    const filtered: Record<string, any> = { ...data };
    for (const field of uiOnlyFields) {
      if (field in filtered) {
        delete filtered[field];
        logger.debug(`Removed UI-only field "${field}" from API payload (auto-populated from billing address)`);
      }
    }
    
    return filtered;
  }

  private filterSalesforceFields(data: Record<string, any>): Record<string, any> {
    // Exclude fields that are handled specially or are not valid API field names
    const excluded = [
      'TestCaseID', 'Tags', 'Description', 'AccountName', '_description', 'Name',
      'Stage',  // Use StageName for Opportunity API (handled separately in createOpportunity)
    ];
    const filtered: Record<string, any> = {};

    for (const [key, value] of Object.entries(data)) {
      if (!excluded.includes(key) && value !== '' && value !== null && value !== undefined) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  // --------------------------------------------------------------------------
  // PICKLIST VALIDATION METHODS
  // --------------------------------------------------------------------------

  /**
   * Validate and correct all picklist values in a payload
   */
  private validateAndCorrectPicklistValues(
    objectType: string,
    payload: Record<string, any>
  ): Record<string, any> {
    const correctedPayload = { ...payload };
    const picklistFields = (this.picklistManager as any).config[objectType] || {};

    for (const [fieldName, value] of Object.entries(correctedPayload)) {
      if (value === null || value === undefined || value === '') {
        continue; // Skip null/empty values
      }

      // Check if this field has picklist config
      if (picklistFields[fieldName]) {
        const correctedValue = this.picklistManager.validateAndCorrect(
          objectType,
          fieldName,
          String(value),
          correctedPayload
        );
        
        if (correctedValue !== value) {
          correctedPayload[fieldName] = correctedValue;
        }
      }
    }

    return correctedPayload;
  }

  /**
   * Apply conditional field requirements (e.g., Affiliate_Non_Affiliate__c when Status = Onboarding)
   */
  private applyConditionalFieldRequirements(
    objectType: string,
    payload: Record<string, any>
  ): void {
    const picklistFields = (this.picklistManager as any).config[objectType] || {};

    for (const [fieldName, fieldConfig] of Object.entries(picklistFields)) {
      const config = fieldConfig as any;
      
      // Check if field is conditionally required
      if (config.conditionalRequirements && this.picklistManager.isConditionallyRequired(objectType, fieldName, payload)) {
        // Field is required but not set - use conditional default
        if (!payload[fieldName] || payload[fieldName] === '') {
          const conditionalDefault = this.picklistManager.getConditionalDefault(objectType, fieldName, payload);
          if (conditionalDefault) {
            payload[fieldName] = conditionalDefault;
            logger.info(
              `✅ Auto-set ${fieldName} = "${conditionalDefault}" ` +
              `(conditionally required based on current field values)`
            );
          }
        }
      }
    }
  }
}

// Singleton instance
export const testDataFactory = new TestDataFactory();

