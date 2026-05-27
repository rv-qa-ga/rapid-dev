/**
 * ============================================================================
 * SALESFORCE FIELD LOCATOR REGISTRY
 * ============================================================================
 *
 * QA field API names & picklists should stay aligned with the org describe API.
 * Regenerate metadata: `ENV=qa npx ts-node scripts/scan-salesforce-fields.ts --all`
 * Outputs: `reports/salesforce-field-metadata.json`, `reports/field-registry-config.ts`
 *
 * Central repository for all Salesforce field locators and interactions.
 * This eliminates scattered locators and provides reliable, reusable field handling.
 * 
 * USAGE:
 *   const registry = new FieldRegistry(page);
 *   await registry.setValue('Account Status', 'Contracted');
 *   const value = await registry.getValue('Account Status');
 * 
 * ADDING NEW FIELDS:
 *   Add entry to FIELD_CONFIG with the field's type and locator strategy.
 * ============================================================================
 */

import { Page, Locator } from '@playwright/test';
import { logger } from '../../../utils/logger';

// ============================================================================
// FIELD TYPES
// ============================================================================

export type FieldType = 
  | 'text'           // Standard text input
  | 'textarea'       // Multi-line text
  | 'combobox'       // Single-select dropdown (lightning-combobox)
  | 'dual-listbox'   // Multi-select with Available/Chosen (lightning-dual-listbox)
  | 'lookup'         // Salesforce lookup field
  | 'checkbox'       // Boolean checkbox
  | 'date'           // Date picker
  | 'datetime'       // DateTime picker
  | 'currency'       // Currency input
  | 'number'         // Numeric input
  | 'phone'          // Phone number
  | 'email'          // Email input
  | 'url'            // URL input
  | 'picklist'       // Standard picklist
  | 'rich-text';     // Rich text editor

// ============================================================================
// FIELD CONFIGURATION INTERFACE
// ============================================================================

export interface FieldConfig {
  /** Display label as shown in Salesforce UI */
  label: string;
  
  /** API name of the field (optional, for reference) */
  apiName?: string;
  
  /** Type of field determines interaction strategy */
  type: FieldType;
  
  /** Whether field is required (* prefix in label) */
  required?: boolean;
  
  /** Custom locator override (if default doesn't work) */
  customLocator?: string;
  
  /** For dual-listbox: default value to set if empty */
  defaultValue?: string;
  
  /** Valid values for validation (optional) */
  validValues?: string[];
}

// ============================================================================
// SALESFORCE FIELD CONFIGURATIONS
// ============================================================================
// Central repository for all Salesforce field locators and configurations.
// Organized by object type (Account, Contact, etc.)

export const FIELD_CONFIG: Record<string, FieldConfig> = {
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - IDENTITY & CORE
  // ════════════════════════════════════════════════════════════════════════════
  
  'Account Name': {
    label: 'Account Name',
    apiName: 'Name',
    type: 'text',
    required: true,
  },
  
  'Name': {
    label: 'Account Name',
    apiName: 'Name',
    type: 'text',
    required: true,
  },
  
  'Account Status': {
    label: 'Account Status',
    apiName: 'Account_Status__c',
    type: 'combobox',
    validValues: ['Prospect', 'Onboarding', 'Contracted', 'Active', 'Runoff', 'Offboarded', 'Invalid'],
    defaultValue: 'Prospect',
  },
  
  'Status': {
    label: 'Account Status',
    apiName: 'Account_Status__c',
    type: 'combobox',
    validValues: ['Prospect', 'Onboarding', 'Contracted', 'Active', 'Runoff', 'Offboarded', 'Invalid'],
    defaultValue: 'Prospect',
  },
  
  'Type': {
    label: 'Type',
    apiName: 'Type',
    type: 'combobox',
    validValues: [
      'Acquisition Company',
      'Agency',
      'Agency Branch',
      'Distribution Partner',
      'Group',
      'Insurer',
      'Insurer Branch',
      'Legal Entity',
      'Member',
      'Non - Member MGA',
      'Placing Broker',
      'Reinsurance Broker',
      'Reinsurer',
      'Reinsurer Branch',
      'Service Company',
      'Third Party Administrator',
      'TPA Group',
    ],
  },
  
  'Account Type': {
    label: 'Type',
    apiName: 'Type',
    type: 'combobox',
    validValues: [
      'Acquisition Company',
      'Agency',
      'Agency Branch',
      'Distribution Partner',
      'Group',
      'Insurer',
      'Insurer Branch',
      'Legal Entity',
      'Member',
      'Non - Member MGA',
      'Placing Broker',
      'Reinsurance Broker',
      'Reinsurer',
      'Reinsurer Branch',
      'Service Company',
      'Third Party Administrator',
      'TPA Group',
    ],
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - CUSTOM FIELDS
  // ════════════════════════════════════════════════════════════════════════════
  
  'Country': {
    label: 'Country',  // Matches both "*Country" and "Country" (Lead/Account) with exact: false
    apiName: 'Country__c',
    type: 'combobox',  // Changed from dual-listbox to combobox (picklist)
    required: true,
    defaultValue: 'Germany',
  },
  
  'State/Province': {
    label: 'State/Province',
    apiName: 'State_Province__c',
    type: 'combobox',  // Changed from dual-listbox to combobox (picklist)
    required: false,
  },
  
  'Region': {
    label: 'Region',
    apiName: 'Region__c',
    type: 'combobox',
    required: true,
    validValues: ['US', 'UK', 'EU', 'CA', 'ROW'],
  },
  
  'Functional Currency': {
    label: 'Functional Currency',
    apiName: 'Functional_Currency__c',
    type: 'combobox',
    validValues: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'CHF'],
  },
  
  'Affiliate/Non-Affiliate': {
    label: 'Affiliate/Non-Affiliate',
    apiName: 'Affiliate_Non_Affiliate__c',
    type: 'combobox',
    validValues: ['NAF', 'AFL'],
  },
  
  'Affiliate_Non_Affiliate__c': {
    label: 'Affiliate/Non-Affiliate',
    apiName: 'Affiliate_Non_Affiliate__c',
    type: 'combobox',
    validValues: ['NAF', 'AFL'],
  },
  
  'Party Code': {
    label: 'Party Code',
    apiName: 'Party_Code__c',
    type: 'text',
  },
  
  'Party_Code__c': {
    label: 'Party Code',
    apiName: 'Party_Code__c',
    type: 'text',
  },
  
  'PTY Code': {
    label: 'PTY Code',
    apiName: 'PTY_Code__c',
    type: 'text',
  },
  
  'PTY_Code__c': {
    label: 'PTY Code',
    apiName: 'PTY_Code__c',
    type: 'text',
  },
  
  'Primary Contact': {
    label: 'Primary Contact',
    apiName: 'Primary_Contact__c',
    type: 'lookup',
  },
  
  'Primary_Contact__c': {
    label: 'Primary Contact',
    apiName: 'Primary_Contact__c',
    type: 'lookup',
  },
  
  'Member Previously Known As Name': {
    label: 'Member Previously Known As Name',
    apiName: 'Member_Previously_Known_As_Name__c',
    type: 'text',
  },
  
  'Member_Previously_Known_As_Name__c': {
    label: 'Member Previously Known As Name',
    apiName: 'Member_Previously_Known_As_Name__c',
    type: 'text',
  },
  
  'Distribution Region': {
    label: 'Distribution Region',
    apiName: 'Distribution_Region__c',
    type: 'combobox',
  },
  
  'Distribution_Region__c': {
    label: 'Distribution Region',
    apiName: 'Distribution_Region__c',
    type: 'combobox',
  },
  
  'Written Accounting Period Effective From': {
    label: 'Written Accounting Period Effective From',
    apiName: 'Written_Accounting_Period_Effective_From__c',
    type: 'date',
  },
  
  'Written_Accounting_Period_Effective_From__c': {
    label: 'Written Accounting Period Effective From',
    apiName: 'Written_Accounting_Period_Effective_From__c',
    type: 'date',
  },
  
  'Claims Production Period Effective From': {
    label: 'Claims Production Period Effective From',
    apiName: 'Claims_Production_Period_Effective_From__c',
    type: 'date',
  },
  
  'Claims_Production_Period_Effective_From__c': {
    label: 'Claims Production Period Effective From',
    apiName: 'Claims_Production_Period_Effective_From__c',
    type: 'date',
  },
  
  'NumberOfEmployees': {
    label: 'Employees',
    apiName: 'NumberOfEmployees',
    type: 'number',
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - CONTACT INFORMATION
  // ════════════════════════════════════════════════════════════════════════════
  
  'Phone': {
    label: 'Phone',
    apiName: 'Phone',
    type: 'phone',
  },
  
  'Fax': {
    label: 'Fax',
    apiName: 'Fax',
    type: 'phone',
  },
  
  'Website': {
    label: 'Website',
    apiName: 'Website',
    type: 'url',
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - BILLING ADDRESS
  // ════════════════════════════════════════════════════════════════════════════
  
  'Billing Street': {
    label: 'Billing Street',
    apiName: 'BillingStreet',
    type: 'textarea',
  },
  
  'Billing City': {
    label: 'Billing City',
    apiName: 'BillingCity',
    type: 'text',
  },
  
  'Billing State': {
    label: 'Billing State/Province',
    apiName: 'BillingState',
    type: 'text',
  },
  
  'Billing State/Province': {
    label: 'Billing State/Province',
    apiName: 'BillingState',
    type: 'text',
  },
  
  'Billing Postal Code': {
    label: 'Billing Zip/Postal Code',
    apiName: 'BillingPostalCode',
    type: 'text',
  },
  
  'Billing Zip/Postal Code': {
    label: 'Billing Zip/Postal Code',
    apiName: 'BillingPostalCode',
    type: 'text',
  },
  
  'Billing Country': {
    label: 'Billing Country',
    apiName: 'BillingCountry',
    type: 'combobox',
    validValues: ['Germany', 'United States', 'United Kingdom', 'Canada', 'France', 'Australia'],
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - SHIPPING ADDRESS
  // ════════════════════════════════════════════════════════════════════════════
  
  'Shipping Street': {
    label: 'Shipping Street',
    apiName: 'ShippingStreet',
    type: 'textarea',
  },
  
  'Shipping City': {
    label: 'Shipping City',
    apiName: 'ShippingCity',
    type: 'text',
  },
  
  'Shipping State': {
    label: 'Shipping State/Province',
    apiName: 'ShippingState',
    type: 'text',
  },
  
  'Shipping State/Province': {
    label: 'Shipping State/Province',
    apiName: 'ShippingState',
    type: 'text',
  },
  
  'Shipping Postal Code': {
    label: 'Shipping Zip/Postal Code',
    apiName: 'ShippingPostalCode',
    type: 'text',
  },
  
  'Shipping Zip/Postal Code': {
    label: 'Shipping Zip/Postal Code',
    apiName: 'ShippingPostalCode',
    type: 'text',
  },
  
  'Shipping Country': {
    label: 'Shipping Country',
    apiName: 'ShippingCountry',
    type: 'combobox',
    validValues: ['Germany', 'United States', 'United Kingdom', 'Canada', 'France', 'Australia'],
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - COMPANY INFORMATION
  // ════════════════════════════════════════════════════════════════════════════
  
  'Industry': {
    label: 'Industry',
    apiName: 'Industry',
    type: 'combobox',
    validValues: [
      'Agriculture',
      'Apparel',
      'Banking',
      'Biotechnology',
      'Chemicals',
      'Communications',
      'Construction',
      'Consulting',
      'Education',
      'Electronics',
      'Energy',
      'Engineering',
      'Entertainment',
      'Environmental',
      'Finance',
      'Food & Beverage',
      'Government',
      'Healthcare',
      'Hospitality',
      'Insurance',
      'Machinery',
      'Manufacturing',
      'Media',
      'Not For Profit',
      'Recreation',
      'Retail',
      'Shipping',
      'Technology',
      'Telecommunications',
      'Transportation',
      'Utilities',
      'Other',
    ],
  },
  
  'Number of Employees': {
    label: 'Employees',
    apiName: 'NumberOfEmployees',
    type: 'number',
  },
  
  'Employees': {
    label: 'Employees',
    apiName: 'NumberOfEmployees',
    type: 'number',
  },
  
  'Annual Revenue': {
    label: 'Annual Revenue',
    apiName: 'AnnualRevenue',
    type: 'currency',
  },
  
  'Ticker Symbol': {
    label: 'Ticker Symbol',
    apiName: 'TickerSymbol',
    type: 'text',
  },
  
  'Ownership': {
    label: 'Ownership',
    apiName: 'Ownership',
    type: 'combobox',
    validValues: ['Independent', 'Mission', 'Owned'],
  },
  
  'SIC Code': {
    label: 'SIC Code',
    apiName: 'Sic',
    type: 'text',
  },
  
  'Rating': {
    label: 'Rating',
    apiName: 'Rating',
    type: 'combobox',
    validValues: ['Hot', 'Warm', 'Cold'],
  },
  
  'Account Source': {
    label: 'Account Source',
    apiName: 'AccountSource',
    type: 'combobox',
    validValues: ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference'],
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - DESCRIPTION & NOTES
  // ════════════════════════════════════════════════════════════════════════════
  
  'Description': {
    label: 'Description',
    apiName: 'Description',
    type: 'textarea',
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - RELATIONSHIPS
  // ════════════════════════════════════════════════════════════════════════════
  
  'Parent Account': {
    label: 'Parent Account',
    apiName: 'ParentId',
    type: 'lookup',
  },
  
  'Account Owner': {
    label: 'Account Owner',
    apiName: 'OwnerId',
    type: 'lookup',
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - MEMBER DETAILS SECTION
  // ════════════════════════════════════════════════════════════════════════════
  
  'Broker Sourced': {
    label: 'Broker Sourced',
    apiName: 'Broker_Sourced__c',
    type: 'combobox',
    validValues: ['Yes', 'No'],
    defaultValue: 'No',
  },

  'Broker_Sourced__c': {
    label: 'Broker Sourced',
    apiName: 'Broker_Sourced__c',
    type: 'combobox',
    validValues: ['Yes', 'No'],
    defaultValue: 'No',
  },
  
  'Broker Sourced Name': {
    label: 'Broker Sourced Name',
    apiName: 'Broker_Sourced_Name__c',
    type: 'text',
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - DATA SOURCE FIELDS
  // ════════════════════════════════════════════════════════════════════════════
  
  'Data Source - Written': {
    label: 'Data Source - Written',
    apiName: 'Data_Source_Written__c',
    type: 'combobox',
    validValues: ['VIPR', 'Platform'],
  },
  
  'Data_Source_Written__c': {
    label: 'Data Source - Written',
    apiName: 'Data_Source_Written__c',
    type: 'combobox',
    validValues: ['VIPR', 'Platform'],
  },
  
  'Data Source Written': {
    label: 'Data Source - Written',
    apiName: 'Data_Source_Written__c',
    type: 'combobox',
    validValues: ['VIPR', 'Platform'],
  },
  
  'Data Source - Claims': {
    label: 'Data Source - Claims',
    apiName: 'Data_Source_Claims__c',
    type: 'combobox',
    validValues: ['VIPR', 'Platform'],
  },
  
  'Data_Source_Claims__c': {
    label: 'Data Source - Claims',
    apiName: 'Data_Source_Claims__c',
    type: 'combobox',
    validValues: ['VIPR', 'Platform'],
  },
  
  'Data Source Claims': {
    label: 'Data Source - Claims',
    apiName: 'Data_Source_Claims__c',
    type: 'combobox',
    validValues: ['VIPR', 'Platform'],
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ACCOUNT FIELDS - SYSTEM FIELDS (Read-Only)
  // ════════════════════════════════════════════════════════════════════════════
  
  'Account ID': {
    label: 'Account ID',
    apiName: 'Id',
    type: 'text',
  },
  
  'Created By': {
    label: 'Created By',
    apiName: 'CreatedById',
    type: 'lookup',
  },
  
  'Created Date': {
    label: 'Created Date',
    apiName: 'CreatedDate',
    type: 'datetime',
  },
  
  'Last Modified By': {
    label: 'Last Modified By',
    apiName: 'LastModifiedById',
    type: 'lookup',
  },
  
  'Last Modified Date': {
    label: 'Last Modified Date',
    apiName: 'LastModifiedDate',
    type: 'datetime',
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // LEAD FIELDS (standard)
  // ════════════════════════════════════════════════════════════════════════════
  
  'Company': {
    label: 'Company',
    apiName: 'Company',
    type: 'text',
    required: true,
  },
  'Last Name': {
    label: 'Last Name',
    apiName: 'LastName',
    type: 'text',
    required: true,
  },
  /** Lead Type (Type__c) - required on Lead create in many orgs */
  'Type__c': {
    label: 'Lead Type',
    apiName: 'Type__c',
    type: 'combobox',
    required: true,
    validValues: ['Member', 'Non - Member MGA', 'Non-Member MGA'],
  },
  'Lead Type': {
    label: 'Lead Type',
    apiName: 'Type__c',
    type: 'combobox',
    required: true,
    validValues: ['Member', 'Non - Member MGA', 'Non-Member MGA'],
  },
  /** Status on Lead form (label "Status") - do not confuse with Account Status */
  'Lead Status': {
    label: 'Status',
    apiName: 'Status',
    type: 'combobox',
    validValues: ['Disqualified', 'New', 'Funnel', 'Qualified'],
    defaultValue: 'New',
  },
  /** Country on Lead form (standard field, label often "Country" without asterisk) */
  'Lead Country': {
    label: 'Country',
    apiName: 'Country',
    type: 'combobox',
    required: true,
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // OPPORTUNITY FIELDS (standard – API names for UAT/QA)
  // ════════════════════════════════════════════════════════════════════════════
  
  'Opportunity Name': {
    label: 'Opportunity Name',
    apiName: 'Name',
    type: 'text',
    required: true,
  },
  'Stage': {
    label: 'Stage',
    apiName: 'StageName',
    type: 'combobox',
    required: true,
    validValues: ['Pipeline', 'Due Diligence', 'Contracting', 'Go\u2011Live', 'Live', 'Unqualified'],
  },
  'StageName': {
    label: 'Stage',
    apiName: 'StageName',
    type: 'combobox',
    required: true,
    validValues: ['Pipeline', 'Due Diligence', 'Contracting', 'Go\u2011Live', 'Live', 'Unqualified'],
  },
  'Close Date': {
    label: 'Close Date',
    apiName: 'CloseDate',
    type: 'date',
    required: true,
  },
  'CloseDate': {
    label: 'Close Date',
    apiName: 'CloseDate',
    type: 'date',
    required: true,
  },
  'Opportunity Type': {
    label: 'Type',
    apiName: 'Type',
    type: 'combobox',
    required: true,
    validValues: ['New Business', 'Expansion'],
  },
  /** SF-883 — Opportunity Sub Type (API name varies by org; locator uses label) */
  'Sub Type': {
    label: 'Sub Type',
    type: 'combobox',
  },
  /** SF-883 — Rate & Commission Changes */
  'Updated Commission Rate': {
    label: 'Updated Commission Rate',
    apiName: 'Updated_Commission_Rate__c',
    type: 'number',
  },
  'Updated Commission Rate Additional Cmts': {
    label: 'Updated Commission Rate Additional Cmts',
    type: 'textarea',
  },
  'Current Commission Rate': {
    label: 'Current Commission Rate',
    type: 'number',
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // MEMBER LEGAL ENTITY RELATIONSHIP (MLER) - SF-789
  // ════════════════════════════════════════════════════════════════════════════
  'Member': {
    label: 'Member',
    apiName: 'Member__c',
    type: 'lookup',
  },
  'Member__c': {
    label: 'Member',
    apiName: 'Member__c',
    type: 'lookup',
  },
  'Legal Entity': {
    label: 'Legal Entity',
    apiName: 'Legal_Entity__c',
    type: 'lookup',
  },
  'Legal_Entity__c': {
    label: 'Legal Entity',
    apiName: 'Legal_Entity__c',
    type: 'lookup',
  },
  'Group': {
    label: 'Group',
    apiName: 'Group__c',
    type: 'lookup',
  },
  'Group__c': {
    label: 'Group',
    apiName: 'Group__c',
    type: 'lookup',
  },
  'Start Date': {
    label: 'Start Date',
    apiName: 'Start_Date__c',
    type: 'date',
  },
  'Start_Date__c': {
    label: 'Start Date',
    apiName: 'Start_Date__c',
    type: 'date',
  },

  // ════════════════════════════════════════════════════════════════════════════
  // ADD MORE OBJECTS BELOW (Contact, Opportunity, etc.)
  // ════════════════════════════════════════════════════════════════════════════
  
};

// ============================================================================
// FIELD REGISTRY CLASS
// ============================================================================

export class FieldRegistry {
  private page: Page;
  
  constructor(page: Page) {
    this.page = page;
  }
  
  // --------------------------------------------------------------------------
  // GET FIELD CONFIGURATION
  // --------------------------------------------------------------------------
  
  getFieldConfig(fieldName: string): FieldConfig | undefined {
    // Try exact match first
    if (FIELD_CONFIG[fieldName]) {
      return FIELD_CONFIG[fieldName];
    }
    
    // Try case-insensitive match
    const normalizedName = fieldName.toLowerCase();
    for (const [key, config] of Object.entries(FIELD_CONFIG)) {
      if (!config || typeof config !== 'object') continue;
      const labelMatch = config.label && config.label.toLowerCase() === normalizedName;
      const apiMatch = config.apiName && config.apiName.toLowerCase() === normalizedName;
      if (key.toLowerCase() === normalizedName || labelMatch || apiMatch) {
        return config;
      }
    }
    
    return undefined;
  }
  
  // --------------------------------------------------------------------------
  // SET FIELD VALUE (Main Entry Point)
  // --------------------------------------------------------------------------
  
  async setValue(fieldName: string, value: string): Promise<void> {
    const config = this.getFieldConfig(fieldName);
    
    if (!config) {
      logger.warn(`Field "${fieldName}" not in registry. Using auto-detection.`);
      await this.setValueAutoDetect(fieldName, this.sanitizeFieldValue(value));
      return;
    }
    
    const safeValue = this.sanitizeFieldValue(value);
    logger.info(`Setting ${config.type} field "${fieldName}" to "${safeValue}"`);
    
    switch (config.type) {
      case 'text':
      case 'phone':
      case 'email':
      case 'url':
      case 'number':
      case 'currency':
        await this.setTextField(config, safeValue);
        break;
        
      case 'textarea':
        await this.setTextareaField(config, safeValue);
        break;
        
      case 'combobox':
      case 'picklist':
        await this.setComboboxField(config, safeValue);
        break;
        
      case 'dual-listbox':
        await this.setDualListboxField(config, safeValue);
        break;
        
      case 'lookup':
        await this.setLookupField(config, safeValue);
        break;
        
      case 'checkbox':
        await this.setCheckboxField(config, safeValue);
        break;
        
      case 'date':
        await this.setDateField(config, safeValue);
        break;
        
      default:
        await this.setValueAutoDetect(fieldName, safeValue);
    }
  }
  
  /** Ensure value is a string safe for input.fill() - no control chars, no undefined */
  private sanitizeFieldValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    // Strip ASCII control chars (eslint: avoid control chars in regex source)
    // eslint-disable-next-line no-control-regex -- intentional sanitization of user/agent strings
    return s.replace(/[\x00-\x1F\x7F]/g, '').trim().slice(0, 131072);
  }
  
  // --------------------------------------------------------------------------
  // GET FIELD VALUE
  // --------------------------------------------------------------------------
  
  async getValue(fieldName: string): Promise<string | null> {
    const config = this.getFieldConfig(fieldName);
    const label = config?.label || fieldName;
    
    logger.debug(`Getting value for field: ${fieldName}`);
    
    // Lead Type (Type__c): read from combobox on new or edit (do not rely on flexipage alone — new Lead form uses edit form)
    if (config?.apiName === 'Type__c') {
      const formScope = this.page.locator('lightning-record-edit-form, [role="dialog"] .slds-modal__content').first();
      const scope = (await formScope.isVisible({ timeout: 800 }).catch(() => false)) ? formScope : this.page;
      const tryButtons = [
        scope.locator('lightning-combobox[data-field-name="Type__c"] button[role="combobox"]').first(),
        scope.locator('lightning-combobox[data-field="Type__c"] button[role="combobox"]').first(),
        scope.getByRole('combobox', { name: 'Lead Type' }).first(),
        scope.getByRole('combobox', { name: 'Type' }).first(),
      ];
      for (const btn of tryButtons) {
        if ((await btn.count()) > 0 && (await btn.first().isVisible({ timeout: 2000 }).catch(() => false))) {
          const dataValue = await btn.first().getAttribute('data-value').catch(() => null);
          if (dataValue) {
            logger.debug(`Lead Type combobox data-value: ${dataValue}`);
            return dataValue;
          }
          const truncated = await btn.first().locator('span.slds-truncate').textContent().catch(() => null);
          if (truncated?.trim()) {
            logger.debug(`Lead Type combobox text: ${truncated.trim()}`);
            return truncated.trim();
          }
        }
      }
    }
    
    // OPTIMIZATION: Check if we're in edit mode first (faster path for combobox fields)
    const isEditMode = await this.page.locator('lightning-record-edit-form').isVisible({ timeout: 300 }).catch(() => false);
    
    if (isEditMode && config?.type === 'combobox') {
      // In edit mode - check combobox button directly (fastest path)
      try {
        const comboboxButton = this.page.locator(`button[role="combobox"][aria-label="${label}"]`).first();
        if (await comboboxButton.count() > 0) {
          const dataValue = await comboboxButton.getAttribute('data-value').catch(() => null);
          if (dataValue) {
            logger.debug(`Found value "${dataValue}" in edit mode combobox`);
            return dataValue;
          }
          // Fallback: get text from button
          const buttonText = await comboboxButton.locator('span.slds-truncate').textContent().catch(() => null);
          if (buttonText?.trim()) {
            logger.debug(`Found value "${buttonText}" in edit mode combobox (text)`);
            return buttonText.trim();
          }
        }
      } catch { /* continue to other strategies */ }
    }
    
    // OPTIMIZATION: Check element existence first before waiting for visibility (reduces timeout waste)
    // Strategy 1: Look in flexipage-field containers (reduced timeout: 500ms)
    try {
      const flexipageField = this.page.locator('flexipage-field').filter({ hasText: label });
      const count = await flexipageField.count();
      if (count > 0) {
        if (await flexipageField.first().isVisible({ timeout: 500 }).catch(() => false)) {
          const valueElement = flexipageField.first().locator('lightning-formatted-text, .slds-form-element__static');
          const value = await valueElement.first().textContent().catch(() => null);
          if (value?.trim()) {
            logger.debug(`Found value "${value}" in flexipage-field`);
            return value.trim();
          }
        }
      }
    } catch { /* continue */ }
    
    // Strategy 2: Look in highlights panel (reduced timeout: 300ms)
    try {
      const panel = this.page.locator('records-lwc-highlights-panel');
      const count = await panel.count();
      if (count > 0 && await panel.isVisible({ timeout: 300 }).catch(() => false)) {
        const panelText = await panel.textContent() || '';
        if (panelText.includes(label) && config?.validValues) {
          for (const validValue of config.validValues) {
            if (panelText.includes(validValue)) {
              logger.debug(`Found value "${validValue}" in highlights panel`);
              return validValue;
            }
          }
        }
      }
    } catch { /* continue */ }
    
    // Strategy 3: Search for any lightning-formatted-text with valid values (reduced timeout: 200ms)
    if (config?.validValues) {
      for (const validValue of config.validValues) {
        const element = this.page.locator(`lightning-formatted-text:has-text("${validValue}")`).first();
        if (await element.count() > 0 && await element.isVisible({ timeout: 200 }).catch(() => false)) {
          logger.debug(`Found value "${validValue}" via text search`);
          return validValue;
        }
      }
    }
    
    // Fast exit - don't try all strategies if field not found
    logger.debug(`Field "${fieldName}" value not found`);
    return null;
  }
  
  // --------------------------------------------------------------------------
  // FIELD TYPE HANDLERS
  // --------------------------------------------------------------------------
  
  /** Set standard text input field */
  private async setTextField(config: FieldConfig, value: string): Promise<void> {
    // Wait for form to be ready (not list view)
    await this.page.waitForLoadState('domcontentloaded');
    
    // Ensure we're in a form context, not a list view
    // Try multiple form selectors with longer timeout since form appears in 2-3 seconds
    const formSelectors = [
      'lightning-record-edit-form',
      'lightning-record-form',
      'form[data-aura-class*="RecordEditForm"]',
    ];
    
    let isFormVisible = false;
    for (const formSel of formSelectors) {
      if (await this.page.locator(formSel).first().isVisible({ timeout: 5000 }).catch(() => false)) {
        isFormVisible = true;
        break;
      }
    }
    
    // If form element not found, check if input field itself is visible (indicates form is ready)
    if (!isFormVisible) {
      const inputCheck = this.page.locator(`input[aria-label*="${config.label}"], input[name*="${config.label}"], input[name="${config.label}"]`).first();
      if (await inputCheck.isVisible({ timeout: 3000 }).catch(() => false)) {
        isFormVisible = true;
        logger.debug(`Form context inferred from visible input field: ${config.label}`);
      }
    }
    
    if (!isFormVisible) {
      // Wait a bit more for form to appear after clicking New (form appears in 2-3 seconds)
      await this.page.waitForTimeout(2000);
    }
    
    // Try multiple selectors to find the field in a form context
    // Priority: Lightning API name (field-name) > direct input > form input > textbox role > label
    const selectors = [
      // Lightning: use API name for reliable targeting (Lead Company, etc.)
      ...(config.apiName
        ? [
            `lightning-input-field[field-name="${config.apiName}"] input`,
            `lightning-input-field[data-field-name="${config.apiName}"] input`,
          ]
        : []),
      // Direct input selectors (highest priority - form is ready when input is visible)
      `input[aria-label="${config.label}"]`,
      `input[name="${config.label}"]`,
      `input[aria-label*="${config.label}"]`,
      `input[name*="${config.label}"]`,
      // Form-specific selectors
      `lightning-record-edit-form input[aria-label="${config.label}"], lightning-record-edit-form input[name="${config.label}"]`,
      `lightning-record-form input[aria-label="${config.label}"], lightning-record-form input[name="${config.label}"]`,
      // Textbox role within form context
      `lightning-record-edit-form >> role=textbox[name="${config.label}"], lightning-record-form >> role=textbox[name="${config.label}"]`,
      // Label-based (but exclude table headers)
      `lightning-record-edit-form >> label:has-text("${config.label}") >> input, lightning-record-form >> label:has-text("${config.label}") >> input`,
      // Fallback: label-based without form restriction
      `label:has-text("${config.label}") >> input`,
    ];
    
    let inputFound = false;
    for (const selector of selectors) {
      try {
        const input = this.page.locator(selector).first();
        if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
          await input.clear();
          await input.fill(value);
          logger.info(`✅ Set text field "${config.label}" to "${value}"`);
          inputFound = true;
          break;
        }
      } catch {
        // Continue to next selector
      }
    }
    
    // Fallback: Use getByLabel but verify it's not a table header and is in a form context
    if (!inputFound) {
      // First, ensure we're in a form context (not list view)
      // Try multiple form selectors (use 5s timeout for form after previous field fill)
      const formSelectors = [
        'lightning-record-edit-form',
        'lightning-record-form',
        'form[data-aura-class*="RecordEditForm"]',
        '[data-aura-class*="forceRecordEdit"]',
      ];
      
      let isFormContext = false;
      let formContext: any = null;
      
      for (const formSel of formSelectors) {
        const form = this.page.locator(formSel).first();
        if (await form.isVisible({ timeout: 5000 }).catch(() => false)) {
          isFormContext = true;
          formContext = form;
          logger.debug(`Form context found: ${formSel}`);
          break;
        }
      }
      
      // Alternative: Check if input field itself is visible (indicates form is ready)
      if (!isFormContext) {
        // Try to find the input field directly - if it's visible, form is ready
        const inputCheckSelectors = [
          `input[aria-label*="${config.label}"]`,
          `input[name*="${config.label}"]`,
          `input[name="${config.label}"]`,
          `lightning-input[label*="${config.label}"] input`,
          `input[placeholder*="${config.label}"]`,
        ];
        
        for (const inputSel of inputCheckSelectors) {
          const inputCheck = this.page.locator(inputSel).first();
          if (await inputCheck.isVisible({ timeout: 5000 }).catch(() => false)) {
            isFormContext = true;
            formContext = this.page; // Use page as context if form element not found but input is visible
            logger.debug(`Form context inferred from visible input field: ${inputSel}`);
            // Store the found input selector for later use
            (this as any)._foundInputSelector = inputSel;
            break;
          }
        }
      }
      
      if (!isFormContext) {
        throw new Error(`Field "${config.label}" cannot be set - not in a form context. Ensure you're in edit/create form mode.`);
      }
      
      // Use getByLabel but restrict to form context and verify it's not a table header
      // If formContext is page, use page.getByLabel directly
      let input;
      if (formContext && formContext !== this.page) {
        input = formContext.getByLabel(config.label, { exact: false }).first();
      } else {
        // Use page directly - form context validated, input field is visible
        // If we found input via selector earlier, use that selector directly
        const foundSelector = (this as any)._foundInputSelector;
        if (foundSelector) {
          input = this.page.locator(foundSelector).first();
          logger.debug(`Using previously found input selector: ${foundSelector}`);
        } else {
          // Try direct input selectors first (faster and more reliable when form context inferred from input)
          const directInputSelectors = [
            `input[aria-label="${config.label}"]`,
            `input[name="${config.label}"]`,
            `input[aria-label*="${config.label}"]`,
            `input[name*="${config.label}"]`,
            `lightning-input[label*="${config.label}"] input`,
          ];
          
          let directInputFound = false;
          for (const inputSel of directInputSelectors) {
            const directInput = this.page.locator(inputSel).first();
            if (await directInput.isVisible({ timeout: 3000 }).catch(() => false)) {
              input = directInput;
              directInputFound = true;
              logger.debug(`Using direct input selector: ${inputSel}`);
              break;
            }
          }
          
          if (!directInputFound) {
            // Fallback to getByLabel
            input = this.page.getByLabel(config.label, { exact: false }).first();
          }
        }
      }
      
      // Verify it's not a table header (th element) and is actually an input
      const tagName = await input.evaluate((el: any) => el.tagName.toLowerCase()).catch(() => '');
      if (tagName === 'th') {
        throw new Error(`Field "${config.label}" found but it's a table header, not a form field. Ensure you're in edit/create form mode.`);
      }
      
      // Verify it's an input or textarea element
      if (tagName !== 'input' && tagName !== 'textarea') {
        // Try to find the actual input within the label's context
        const inputWithinLabel = input.locator('input, textarea').first();
        if (await inputWithinLabel.count() > 0) {
          await inputWithinLabel.waitFor({ state: 'visible', timeout: 5000 });
          await inputWithinLabel.clear();
          await inputWithinLabel.fill(value);
          logger.info(`✅ Set text field "${config.label}" to "${value}" (via label context)`);
          return;
        }
        throw new Error(`Field "${config.label}" found but it's not an input field (tag: ${tagName}). Ensure you're in edit/create form mode.`);
      }
      
      await input.waitFor({ state: 'visible', timeout: 5000 });
      await input.clear();
      await input.fill(value);
      logger.info(`✅ Set text field "${config.label}" to "${value}"`);
    }
  }
  
  /** Set textarea field */
  private async setTextareaField(config: FieldConfig, value: string): Promise<void> {
    const textarea = this.page.getByLabel(config.label, { exact: false }).first();
    await textarea.waitFor({ state: 'visible', timeout: 5000 });
    await textarea.clear();
    await textarea.fill(value);
    logger.info(`✅ Set textarea "${config.label}" to "${value}"`);
  }
  
  /** Set combobox/picklist field */
  private async setComboboxField(config: FieldConfig, value: string): Promise<void> {
    // Special handling for Region field - uses specific button selector pattern
    if (config.label === 'Region' || config.apiName === 'Region__c') {
      await this.setRegionField(value);
      return;
    }

    // Stage/StageName (Opportunity) - use dedicated selectors for reliability in UAT
    const label = config.label || (config.apiName === 'StageName' ? 'Stage' : undefined);
    if (label === 'Stage' || config.apiName === 'StageName') {
      await this.setStageField(value);
      return;
    }

    // Broker Sourced (Yes/No picklist on Lead, Account, Opportunity in QA)
    if (config.apiName === 'Broker_Sourced__c') {
      const formScope = this.page.locator('lightning-record-edit-form, [role="dialog"] .slds-modal__content').first();
      if (await formScope.isVisible({ timeout: 2000 }).catch(() => false)) {
        let btn = formScope
          .locator(
            'lightning-combobox[data-field-name="Broker_Sourced__c"], lightning-combobox[data-field="Broker_Sourced__c"], lightning-combobox[field-name="Broker_Sourced__c"]'
          )
          .first()
          .locator('button[role="combobox"]')
          .first();
        if (!(await btn.isVisible({ timeout: 2000 }).catch(() => false))) {
          btn = formScope.getByRole('combobox', { name: 'Broker Sourced' }).first();
        }
        if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
          await btn.click();
          await this.page.waitForLoadState('domcontentloaded');
          const opt = this.page
            .locator(`lightning-base-combobox-item[data-value="${value}"]`)
            .or(this.page.getByRole('option', { name: value }))
            .first();
          if (await opt.isVisible({ timeout: 5000 }).catch(() => false)) {
            await opt.click();
            await this.page.waitForLoadState('domcontentloaded');
            logger.info(`✅ Set Broker Sourced to "${value}"`);
            return;
          }
        }
      }
    }

    // Lead Type (Type__c) - form-scoped combobox in case label differs in UAT
    if (config.apiName === 'Type__c' || config.label === 'Lead Type') {
      const formScope = this.page.locator('lightning-record-edit-form, [role="dialog"] .slds-modal__content').first();
      if (await formScope.isVisible({ timeout: 2000 }).catch(() => false)) {
        let typeButton = formScope.locator(
          'lightning-combobox[data-field-name="Type__c"], lightning-combobox[data-field="Type__c"], lightning-combobox[field-name="Type__c"]'
        ).first().locator('button[role="combobox"]').first();
        if (!(await typeButton.isVisible({ timeout: 2000 }).catch(() => false))) {
          typeButton = formScope.getByRole('combobox', { name: 'Lead Type' }).first();
        }
        if (!(await typeButton.isVisible({ timeout: 2000 }).catch(() => false))) {
          typeButton = formScope.getByLabel('Lead Type', { exact: false }).first();
        }
        if (await typeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await typeButton.click();
          await this.page.waitForLoadState('domcontentloaded');
          const opt = this.page.locator(`lightning-base-combobox-item[data-value="${value}"]`).or(this.page.getByRole('option', { name: value })).first();
          if (await opt.isVisible({ timeout: 5000 }).catch(() => false)) {
            await opt.click();
            await this.page.waitForLoadState('domcontentloaded');
            logger.info(`✅ Set Lead Type to "${value}"`);
            return;
          }
        }
      }
    }

    // Lead Status (Status on Lead form) - scope to form to avoid matching list-view column header (th[aria-label="Lead Status"])
    if (config.apiName === 'Status' && config.label === 'Status') {
      const formScope = this.page.locator('lightning-record-edit-form, [role="dialog"] .slds-modal__content').first();
      if (await formScope.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Try getByRole first (form-scoped) then data-field selectors
        let statusButton = formScope.getByRole('combobox', { name: 'Status' }).first();
        if (!(await statusButton.isVisible({ timeout: 2000 }).catch(() => false))) {
          const statusCombo = formScope.locator(
            'lightning-combobox[data-field-name="Status"], lightning-combobox[data-field="Status"]'
          ).first();
          statusButton = statusCombo.locator('button[role="combobox"]').first();
        }
        if (await statusButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          await statusButton.click();
          await this.page.waitForLoadState('domcontentloaded');
          const opt = this.page.locator(`lightning-base-combobox-item[data-value="${value}"]`).or(this.page.getByRole('option', { name: value })).first();
          if (await opt.isVisible({ timeout: 5000 }).catch(() => false)) {
            await opt.click();
            await this.page.waitForLoadState('domcontentloaded');
            logger.info(`✅ Set Lead Status to "${value}"`);
            return;
          }
        }
      }
    }
    
    // Find and click the combobox to open dropdown
    const combobox = this.page.getByLabel(config.label, { exact: false })
      .or(this.page.locator(`lightning-combobox`).filter({ hasText: config.label }))
      .first();
    
    await combobox.waitFor({ state: 'visible', timeout: 10000 });
    await combobox.click();
    // OPTIMIZATION: Wait for dropdown to appear instead of arbitrary timeout
    await this.page.waitForLoadState('domcontentloaded');
    
    // Select the option
    const option = this.page.getByRole('option', { name: value, exact: true })
      .or(this.page.locator(`lightning-base-combobox-item[data-value="${value}"]`))
      .first();
    
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();
    // OPTIMIZATION: Wait for selection to apply instead of arbitrary timeout
    await this.page.waitForLoadState('domcontentloaded');
    
    logger.info(`✅ Set combobox "${config.label}" to "${value}"`);
  }
  
  /** Set Region field using specific button selector pattern */
  private async setRegionField(value: string): Promise<void> {
    // Valid Region values: US, EU, CA, ROW, UK
    const validValues = ['US', 'EU', 'CA', 'ROW', 'UK'];
    if (!validValues.includes(value)) {
      throw new Error(`Invalid Region value: ${value}. Valid values are: ${validValues.join(', ')}`);
    }

    logger.info(`Setting Region field to: ${value}`);

    // Try multiple selectors for QA/sandbox (aria-label, role, data-field)
    const regionButtonSelectors = [
      'button[role="combobox"][aria-label="Region"]',
      'button.slds-combobox__input[aria-label="Region"]',
      'lightning-combobox[data-field="Region__c"] button',
      'lightning-combobox[data-field="Region"] button',
      '[data-field="Region__c"] .slds-combobox__input',
      '[data-field="Region"] .slds-combobox__input',
    ];
    let regionButton: Locator | null = null;
    for (const sel of regionButtonSelectors) {
      const loc = this.page.locator(sel).first();
      if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
        regionButton = loc;
        logger.debug(`Region combobox found with: ${sel}`);
        break;
      }
    }
    if (!regionButton) {
      const byRole = this.page.getByRole('combobox', { name: 'Region' }).first();
      if (await byRole.isVisible({ timeout: 3000 }).catch(() => false)) {
        regionButton = byRole;
      }
    }
    if (!regionButton) {
      throw new Error('Region combobox not found. Tried aria-label, data-field=Region__c, data-field=Region, and role=combobox.');
    }

    await regionButton.waitFor({ state: 'visible', timeout: 5000 });
    await regionButton.scrollIntoViewIfNeeded();
    
    // OPTIMIZATION: Check if the value is already selected (fast check - no timeout)
    const currentValue = await regionButton.getAttribute('data-value').catch(() => null);
    const buttonText = await regionButton.locator('span.slds-truncate').textContent().catch(() => null);
    
    if (currentValue === value || buttonText?.trim() === value) {
      logger.info(`✅ Region is already set to "${value}"`);
      return;
    }
    
    // Click the button to open the dropdown
    await regionButton.click();
    // OPTIMIZATION: Use load state instead of arbitrary timeout
    await this.page.waitForLoadState('domcontentloaded');
    
    // Select the option from the dropdown
    // Try multiple strategies to find the option
    let optionSelected = false;
    
    // Strategy 1: Find by role="option" with exact text
    try {
      const option = this.page.getByRole('option', { name: value, exact: true }).first();
      if (await option.count() > 0 && await option.isVisible({ timeout: 3000 }).catch(() => false)) {
        await option.scrollIntoViewIfNeeded();
        await option.click();
        optionSelected = true;
        logger.info(`✅ Selected Region option "${value}" (strategy 1)`);
      }
    } catch (error: any) {
      logger.debug(`Strategy 1 failed: ${error.message}`);
    }
    
    // Strategy 2: Find by data-value attribute
    if (!optionSelected) {
      try {
        const option = this.page.locator(`lightning-base-combobox-item[data-value="${value}"]`).first();
        if (await option.count() > 0 && await option.isVisible({ timeout: 3000 }).catch(() => false)) {
          await option.scrollIntoViewIfNeeded();
          await option.click();
          optionSelected = true;
          logger.info(`✅ Selected Region option "${value}" (strategy 2)`);
        }
      } catch (error: any) {
        logger.debug(`Strategy 2 failed: ${error.message}`);
      }
    }
    
    // Strategy 3: Find by text content
    if (!optionSelected) {
      try {
        const option = this.page.locator(`lightning-base-combobox-item, [role="option"]`)
          .filter({ hasText: value })
          .first();
        if (await option.count() > 0 && await option.isVisible({ timeout: 3000 }).catch(() => false)) {
          await option.scrollIntoViewIfNeeded();
          await option.click();
          optionSelected = true;
          logger.info(`✅ Selected Region option "${value}" (strategy 3)`);
        }
      } catch (error: any) {
        logger.debug(`Strategy 3 failed: ${error.message}`);
      }
    }
    
    if (!optionSelected) {
      // Close dropdown if still open
      await this.page.keyboard.press('Escape');
      throw new Error(`Could not find Region option "${value}" in dropdown`);
    }
    
    // OPTIMIZATION: Use load state instead of arbitrary timeout
    await this.page.waitForLoadState('domcontentloaded');
    
    // Verify the value was set (quick check)
    const updatedValue = await regionButton.getAttribute('data-value').catch(() => null);
    const updatedText = await regionButton.locator('span.slds-truncate').textContent().catch(() => null);
    
    if (updatedValue === value || updatedText?.trim() === value) {
      logger.info(`✅ Set Region field to "${value}"`);
    } else {
      logger.warn(`⚠️  Region field may not have been set correctly. Expected: "${value}", Got: "${updatedValue || updatedText}"`);
    }
  }

  /** Set Opportunity Stage field (StageName) - dedicated selectors for UAT reliability */
  private async setStageField(value: string): Promise<void> {
    const validValues = ['Pipeline', 'Due Diligence', 'Contract', 'Contracting', 'Go-Live', 'Active', 'Closed', 'Unqualified', 'Approval Ready'];
    if (!validValues.includes(value)) {
      logger.warn(`Stage value "${value}" may not be valid; attempting anyway.`);
    }
    const stageButtonSelectors = [
      'button[role="combobox"][aria-label="Stage"]',
      'lightning-combobox[data-field="StageName"] button',
      'lightning-combobox[data-field="StageName"]',
      '[data-field="StageName"] button[role="combobox"]',
      '[data-field="StageName"] .slds-combobox__input',
    ];
    let stageButton: Locator | null = null;
    for (const sel of stageButtonSelectors) {
      const loc = this.page.locator(sel).first();
      if (await loc.isVisible({ timeout: 3000 }).catch(() => false)) {
        stageButton = loc;
        logger.debug(`Stage combobox found with: ${sel}`);
        break;
      }
    }
    if (!stageButton) {
      const byRole = this.page.getByRole('combobox', { name: 'Stage' }).first();
      if (await byRole.isVisible({ timeout: 3000 }).catch(() => false)) {
        stageButton = byRole;
      }
    }
    if (!stageButton) {
      const byLabel = this.page.getByLabel('Stage', { exact: false }).first();
      if (await byLabel.isVisible({ timeout: 3000 }).catch(() => false)) {
        stageButton = byLabel;
      }
    }
    if (!stageButton) {
      throw new Error('Stage combobox not found. Tried aria-label, data-field=StageName, role=combobox, and getByLabel.');
    }
    await stageButton.waitFor({ state: 'visible', timeout: 5000 });
    await stageButton.scrollIntoViewIfNeeded();
    const currentVal = await stageButton.getAttribute('data-value').catch(() => null);
    const buttonText = await stageButton.locator('span.slds-truncate').textContent().catch(() => null);
    if (currentVal === value || buttonText?.trim() === value) {
      logger.info(`✅ Stage is already set to "${value}"`);
      return;
    }
    await stageButton.click();
    await this.page.waitForLoadState('domcontentloaded');
    const option = this.page.locator(`lightning-base-combobox-item[data-value="${value}"]`).first();
    const optionByRole = this.page.getByRole('option', { name: value, exact: true }).first();
    if (await option.isVisible({ timeout: 10000 }).catch(() => false)) {
      await option.click();
    } else if (await optionByRole.isVisible({ timeout: 5000 }).catch(() => false)) {
      await optionByRole.click();
    } else {
      throw new Error(`Stage option "${value}" not found in dropdown`);
    }
    await this.page.waitForLoadState('domcontentloaded');
    logger.info(`✅ Set Stage to "${value}"`);
  }
  
  /** 
   * Set dual-listbox field (multi-select with Available/Chosen lists)
   * Uses recorded Playwright selectors for reliability
   */
  private async setDualListboxField(config: FieldConfig, value: string): Promise<void> {
    // Check if value already in Chosen list
    const chosenList = this.page.getByLabel(config.label).locator('div[role="listbox"]').last();
    const chosenOptions = chosenList.locator('div[role="option"]');
    const chosenCount = await chosenOptions.count().catch(() => 0);
    
    if (chosenCount > 0) {
      // Check if our value is already selected
      for (let i = 0; i < chosenCount; i++) {
        const text = await chosenOptions.nth(i).textContent();
        if (text?.includes(value)) {
          logger.info(`Value "${value}" already selected in "${config.label}"`);
          return;
        }
      }
    }
    
    // Scroll to make the field visible
    const dualListbox = this.page.getByLabel(config.label);
    await dualListbox.scrollIntoViewIfNeeded().catch(() => {});
    // OPTIMIZATION: Wait for field to be ready instead of arbitrary timeout
    await this.page.waitForLoadState('domcontentloaded');
    
    // Click on the option in Available list using getByText (recorded selector)
    const optionToSelect = this.page.getByText(value, { exact: true });
    if (!await optionToSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      logger.warn(`Option "${value}" not found in Available list for "${config.label}"`);
      return;
    }
    
    await optionToSelect.click();
    // OPTIMIZATION: Wait for selection to register instead of arbitrary timeout
    await this.page.waitForLoadState('domcontentloaded');
    
    // Click the Move to Chosen button (recorded selector)
    const moveButton = this.page.getByLabel(config.label).getByRole('button', { name: 'Move to Chosen' });
    if (await moveButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await moveButton.click();
      // OPTIMIZATION: Wait for move to complete instead of arbitrary timeout
      await this.page.waitForLoadState('domcontentloaded');
      logger.info(`✅ Set dual-listbox "${config.label}" to "${value}"`);
    } else {
      logger.warn(`Move to Chosen button not found for "${config.label}"`);
    }
  }
  
  /** Set lookup field */
  private async setLookupField(config: FieldConfig, value: string): Promise<void> {
    const lookup = this.page.getByLabel(config.label, { exact: false }).first();
    await lookup.waitFor({ state: 'visible', timeout: 5000 });
    await lookup.clear();
    await lookup.fill(value);
    // Salesforce lookup triggers async search — wait for results to load (2s typical)
    await this.page.waitForTimeout(2000);

    // Strategy 1: getByRole option (substring match by default)
    let optionClicked = false;
    const roleOption = this.page.getByRole('option', { name: value }).first();
    if (await roleOption.isVisible({ timeout: 8000 }).catch(() => false)) {
      await roleOption.click();
      optionClicked = true;
    }

    // Strategy 2: lightning-base-combobox-item or span with hasText (Salesforce LWC)
    if (!optionClicked) {
      const comboboxItem = this.page
        .locator('lightning-base-combobox-item, [role="option"]')
        .filter({ hasText: new RegExp(value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
        .first();
      if (await comboboxItem.isVisible({ timeout: 3000 }).catch(() => false)) {
        await comboboxItem.click();
        optionClicked = true;
      }
    }

    if (!optionClicked) {
      throw new Error(`Lookup "${config.label}": option matching "${value}" did not appear within timeout.`);
    }

    logger.info(`✅ Set lookup "${config.label}" to "${value}"`);
  }
  
  /** Set checkbox field */
  private async setCheckboxField(config: FieldConfig, value: string): Promise<void> {
    const checkbox = this.page.getByLabel(config.label, { exact: false }).first();
    const shouldCheck = value.toLowerCase() === 'true' || value === '1';
    
    if (shouldCheck) {
      await checkbox.check();
    } else {
      await checkbox.uncheck();
    }
    
    logger.info(`✅ Set checkbox "${config.label}" to ${shouldCheck}`);
  }
  
  /** Set date field (scoped to form to avoid matching list-view column headers) */
  private async setDateField(config: FieldConfig, value: string): Promise<void> {
    // Scope to record edit form / modal so we don't match table header (e.g. Close Date in list view)
    const formScope = this.page.locator('lightning-record-edit-form, lightning-record-form, [role="dialog"] .slds-modal__content').first();
    let dateInput: Locator;
    const inForm = await formScope.isVisible({ timeout: 3000 }).catch(() => false);
    if (inForm) {
      // Prefer input by field name for Opportunity Close Date to avoid th with same label
      if (config.apiName === 'CloseDate') {
        const byField = formScope.locator('lightning-input-field[data-field-name="CloseDate"] input, lightning-input-field[field-name="CloseDate"] input').first();
        if (await byField.isVisible({ timeout: 3000 }).catch(() => false)) {
          dateInput = byField;
        } else {
          dateInput = formScope.getByRole('textbox', { name: config.label }).or(formScope.getByLabel(config.label, { exact: false })).first();
        }
      } else {
        dateInput = formScope.getByRole('textbox', { name: config.label }).or(formScope.getByLabel(config.label, { exact: false })).first();
      }
    } else {
      dateInput = this.page.getByLabel(config.label, { exact: false }).first();
    }
    await dateInput.waitFor({ state: 'visible', timeout: 10000 });
    await dateInput.clear();
    await dateInput.fill(value);
    await this.page.keyboard.press('Escape'); // Close date picker if open
    
    logger.info(`✅ Set date "${config.label}" to "${value}"`);
  }
  
  /** Auto-detect field type and set value (fallback) */
  private async setValueAutoDetect(fieldName: string, value: string): Promise<void> {
    const safeValue = this.sanitizeFieldValue(value);
    logger.debug(`Auto-detecting field type for: ${fieldName}`);
    
    // Try text input first
    const input = this.page.getByLabel(fieldName, { exact: false }).first();
    if (await input.isVisible({ timeout: 2000 }).catch(() => false)) {
      const tagName = await input.evaluate(el => el.tagName.toLowerCase());
      
      if (tagName === 'input' || tagName === 'textarea') {
        await input.clear();
        await input.fill(safeValue);
        logger.info(`✅ Set field "${fieldName}" to "${safeValue}" (auto-detected text)`);
        return;
      }
    }
    
    // Try as combobox
    const combobox = this.page.locator('lightning-combobox, lightning-picklist').filter({ hasText: fieldName }).first();
    if (await combobox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await combobox.click();
      // OPTIMIZATION: Wait for dropdown to appear instead of arbitrary timeout
      await this.page.waitForLoadState('domcontentloaded');
      const option = this.page.getByRole('option', { name: safeValue }).first();
      await option.click();
      logger.info(`✅ Set field "${fieldName}" to "${safeValue}" (auto-detected combobox)`);
      return;
    }
    
    throw new Error(`Could not find or set field: ${fieldName}`);
  }
  
  // --------------------------------------------------------------------------
  // UTILITY METHODS
  // --------------------------------------------------------------------------
  
  /** Set required fields with default values before saving */
  async setRequiredFieldDefaults(): Promise<void> {
    logger.info('Setting default values for required fields...');
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIORITY: Handle Country field explicitly (most common cause of save errors)
    // ═══════════════════════════════════════════════════════════════════════════
    await this.ensureCountrySelected();
    
    // Handle other required dual-listbox fields
    for (const [name, config] of Object.entries(FIELD_CONFIG)) {
      if (config.required && config.defaultValue && config.type === 'dual-listbox' && name !== 'Country') {
        try {
          // Check if field is visible and empty
          const labelWithoutAsterisk = config.label.replace(/^\*/, '');
          const field = this.page.getByLabel(labelWithoutAsterisk, { exact: false });
          if (await field.isVisible({ timeout: 1000 }).catch(() => false)) {
            const chosenList = field.locator('div[role="listbox"]').last();
            const chosenCount = await chosenList.locator('div[role="option"]').count().catch(() => 0);
            
            if (chosenCount === 0) {
              await this.setDualListboxField(config, config.defaultValue);
            }
          }
        } catch (error: any) {
          logger.debug(`Could not set default for ${name}: ${error.message}`);
        }
      }
    }
  }
  
  /** Ensure Country field has a value selected (prevents "hit a snag" errors) */
  private async ensureCountrySelected(): Promise<void> {
    logger.info('Checking required picklist fields (Country)...');
    
    // Handle Country field (now combobox/picklist, not dual-listbox)
    const countryConfig = this.getFieldConfig('Country');
    if (countryConfig && countryConfig.defaultValue) {
      try {
        await this.setValue('Country', countryConfig.defaultValue);
        logger.info(`✅ Set Country to default value: ${countryConfig.defaultValue}`);
      } catch (error: any) {
        logger.debug(`Country field may already be set: ${error.message}`);
      }
    }
    
    // NOTE: State/Province field has been removed - it was UI-only and auto-populated from BillingState
    // We no longer need to set or validate State/Province field
  }
  
  /** Select a value in a dual-listbox field using arrow button */
  private async selectDualListboxValue(fieldLabel: string, value: string): Promise<void> {
    try {
      // Find ALL dual-listbox components on the page
      const allDualListboxes = this.page.locator('lightning-dual-listbox');
      const count = await allDualListboxes.count();
      
      logger.debug(`Found ${count} dual-listbox components, looking for "${fieldLabel}"...`);
      
      for (let i = 0; i < count; i++) {
        const dualListbox = allDualListboxes.nth(i);
        const text = await dualListbox.textContent().catch(() => '');
        
        if (!text?.toLowerCase().includes(fieldLabel.toLowerCase())) {
          continue;
        }
        
        logger.info(`Found "${fieldLabel}" dual-listbox`);
        
        // Check if value already in Chosen list (right side)
        const chosenColumn = dualListbox.locator('div[data-id="secondList"], .slds-dueling-list__column:last-child');
        const chosenText = await chosenColumn.textContent().catch(() => '');
        
        if (chosenText && chosenText.length > 20) {  // Has meaningful content
          logger.info(`"${fieldLabel}" already has selection`);
          return;
        }
        
        // Find the value in Available list and click it
        const availableOption = dualListbox.locator(`div[role="option"]:has-text("${value}")`).first();
        
        if (!await availableOption.isVisible({ timeout: 1000 }).catch(() => false)) {
          // Try with span
          const spanOption = dualListbox.locator(`span.slds-truncate[title="${value}"]`).first();
          if (await spanOption.isVisible({ timeout: 1000 }).catch(() => false)) {
            await spanOption.click();
            // OPTIMIZATION: Minimal wait for click to register (dual-listbox needs brief delay)
            await this.page.waitForTimeout(100);
          } else {
            logger.debug(`Value "${value}" not found in "${fieldLabel}" available list`);
            continue;
          }
        } else {
          await availableOption.click();
          // OPTIMIZATION: Minimal wait for click to register
          await this.page.waitForTimeout(100);
        }
        
        // Click the Move to Chosen button (right arrow)
        const moveButton = dualListbox.locator('button[title="Move to Chosen"]').first();
        if (await moveButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await moveButton.click();
          // OPTIMIZATION: Wait for move to complete instead of arbitrary timeout
          await this.page.waitForLoadState('domcontentloaded');
          logger.info(`✅ Selected "${value}" in "${fieldLabel}" field using arrow button`);
          return;
        }
        
        // Fallback: Try double-click
        logger.debug('Arrow button not found, trying double-click...');
        const optionToDoubleClick = dualListbox.locator(`div[role="option"]:has-text("${value}"), span[title="${value}"]`).first();
        if (await optionToDoubleClick.isVisible({ timeout: 500 }).catch(() => false)) {
          await optionToDoubleClick.dblclick();
          // OPTIMIZATION: Wait for double-click to register
          await this.page.waitForLoadState('domcontentloaded');
          logger.info(`✅ Double-clicked "${value}" in "${fieldLabel}" field`);
          return;
        }
      }
      
      logger.debug(`Could not find or set "${fieldLabel}" field`);
    } catch (error: any) {
      logger.warn(`Error setting "${fieldLabel}": ${error.message}`);
    }
  }
  
  /** Check if a field is visible on the current page */
  async isFieldVisible(fieldName: string): Promise<boolean> {
    const config = this.getFieldConfig(fieldName);
    const label = config?.label || fieldName;
    
    const field = this.page.getByLabel(label, { exact: false })
      .or(this.page.locator('flexipage-field').filter({ hasText: label }))
      .first();
    
    return await field.isVisible({ timeout: 2000 }).catch(() => false);
  }
  
  /** Check if a field is editable */
  async isFieldEditable(fieldName: string): Promise<boolean> {
    const config = this.getFieldConfig(fieldName);
    const label = config?.label || fieldName;
    
    const editableSelectors = [
      `input[aria-label*="${label}"]`,
      `lightning-combobox:has-text("${label}")`,
      `lightning-input:has-text("${label}")`,
    ];
    
    for (const selector of editableSelectors) {
      const element = this.page.locator(selector).first();
      if (await element.isVisible({ timeout: 1000 }).catch(() => false)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Best-effort list of visible field labels on the current Lightning record edit form.
   * Used by comprehensive Lead (and similar) UI steps.
   */
  async getAllVisibleFields(): Promise<string[]> {
    const labels = new Set<string>();
    const inForm = this.page.locator(
      'lightning-record-edit-form lightning-input, lightning-record-edit-form lightning-combobox, lightning-record-edit-form lightning-textarea, lightning-record-edit-form lightning-datepicker'
    );
    const n = await inForm.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 200); i++) {
      const loc = inForm.nth(i);
      if (!(await loc.isVisible({ timeout: 400 }).catch(() => false))) continue;
      const label = await loc.getAttribute('label').catch(() => null);
      if (label && label.trim()) labels.add(label.replace(/\s*\*\s*$/, '').trim());
    }
    const flexi = this.page.locator('flexipage-field');
    const m = await flexi.count().catch(() => 0);
    for (let i = 0; i < Math.min(m, 200); i++) {
      const el = flexi.nth(i);
      if (!(await el.isVisible({ timeout: 400 }).catch(() => false))) continue;
      const labelEl = el.locator('.slds-form-element__label, [part="label"], slot[name="label"]').first();
      const text = (await labelEl.innerText().catch(() => '')) || (await el.innerText().catch(() => ''));
      const first = text.split('\n')[0]?.trim();
      if (first && first.length < 200) labels.add(first.replace(/\s*\*\s*$/, '').trim());
    }
    return [...labels];
  }
}

