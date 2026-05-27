/**
 * Comprehensive Field Data Generators
 * 
 * Centralized repository for generating comprehensive test data for all Salesforce fields.
 * Ensures data makes sense with proper geography, types, and relationships.
 * 
 * Usage:
 *   const data = COMPREHENSIVE_LEAD_DATA['First Name']();
 *   await fieldRegistry.setValue('First Name', data);
 */

import { COUNTRY_DEFAULTS } from './TestDataFactory';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get region from country
 */
function getRegionFromCountry(country?: string): string {
  if (!country) return 'US';
  const countryLower = String(country).toLowerCase();
  if (countryLower.includes('united states') || countryLower.includes('usa')) return 'US';
  if (countryLower.includes('united kingdom') || countryLower.includes('uk')) return 'UK';
  if (countryLower.includes('canada')) return 'CA';
  if (['germany', 'france', 'netherlands', 'belgium', 'austria', 'switzerland', 'spain', 'italy'].some(c => countryLower.includes(c))) return 'EU';
  if (['australia', 'new zealand', 'singapore', 'japan', 'hong kong'].some(c => countryLower.includes(c))) return 'APAC';
  if (['india', 'china', 'south korea', 'brazil', 'mexico', 'united arab emirates'].some(c => countryLower.includes(c))) return 'ROW';
  return 'EU'; // Default to EU
}

/**
 * Get currency from country
 */
function getCurrencyFromCountry(country?: string): string {
  if (!country) return 'USD';
  const countryLower = country.toLowerCase();
  if (countryLower.includes('united kingdom') || countryLower.includes('uk')) return 'GBP';
  if (['germany', 'france', 'netherlands', 'belgium', 'austria', 'switzerland', 'spain', 'italy', 'europe'].some(c => countryLower.includes(c))) return 'EUR';
  if (countryLower.includes('canada')) return 'CAD';
  return 'USD';
}

/**
 * Generate unique identifier
 */
function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}

/**
 * Generate future date (days from now) in mm/dd/yyyy format
 */
function generateFutureDate(days: number): string {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Pick random value from array
 */
function pickRandom<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Cycle through array based on index
 */
function cycleValue<T>(array: T[], index: number): T {
  return array[index % array.length];
}

// ============================================================================
// COMPREHENSIVE LEAD FIELD DATA GENERATORS
// ============================================================================

/**
 * Comprehensive Lead field data generators
 * Each function generates appropriate test data for the field
 * 
 * @param context - Optional context with index/count for cycling through values
 */
export interface FieldDataContext {
  index?: number;        // Current index for cycling through values
  country?: string;      // Selected country (affects region, currency, address)
  timestamp?: number;    // Timestamp for uniqueness
  uniqueId?: string;     // Unique identifier
}

export const COMPREHENSIVE_LEAD_DATA: Record<string, (context?: FieldDataContext) => string | number | boolean> = {
  // ════════════════════════════════════════════════════════════════════════════
  // STANDARD LEAD FIELDS - IDENTITY
  // ════════════════════════════════════════════════════════════════════════════
  
  'First Name': (ctx) => {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Jessica', 'William', 'Emma', 'James', 'Olivia'];
    const idx = ctx?.index || 0;
    const uniqueId = ctx?.uniqueId || generateUniqueId();
    return `${cycleValue(firstNames, idx)}${uniqueId.substring(0, 3)}`;
  },
  
  'Last Name': (ctx) => {
    const timestamp = ctx?.timestamp || Date.now();
    const uniqueId = ctx?.uniqueId || generateUniqueId();
    return `Lead_${uniqueId}_${timestamp}`;
  },
  
  'Company': (ctx) => {
    // Generate simple company name - can be ABCD or random text as user requested
    const simpleNames = ['ABCD', 'Test Company', 'ABC Corp', 'XYZ Inc', 'Company', 'Business', 'Enterprise'];
    const companyTypes = ['Insurance', 'Agency', 'Brokerage', 'Consulting', 'Services', 'Group', 'Partners', 'Associates', 'Corporation', 'Holdings', 'Enterprises', 'Solutions'];
    const idx = ctx?.index || 0;
    const timestamp = ctx?.timestamp || Date.now();
    const uniqueId = ctx?.uniqueId || generateUniqueId();
    
    // Alternate between simple names and descriptive names
    if (idx % 2 === 0) {
      return `${cycleValue(simpleNames, idx)}${uniqueId.substring(0, 3)}`;
    } else {
      return `${cycleValue(companyTypes, idx)}${uniqueId}_${timestamp}`;
    }
  },
  
  'Email': (ctx) => {
    const timestamp = ctx?.timestamp || Date.now();
    const uniqueId = ctx?.uniqueId || generateUniqueId();
    const idx = ctx?.index || 0;
    return `lead.${uniqueId.toLowerCase()}.${timestamp}@testcompany${idx}.com`;
  },
  
  'Phone': (ctx) => {
    const country = ctx?.country || 'United States';
    const countryDefaults = COUNTRY_DEFAULTS[country] || COUNTRY_DEFAULTS['United States'];
    const phoneBase = countryDefaults.phone.replace(/\d{4}$/, '');
    return `${phoneBase}${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  },
  
  'Mobile': (ctx) => {
    // Use same logic as Phone
    return COMPREHENSIVE_LEAD_DATA['Phone'](ctx) as string;
  },
  
  'Title': (ctx) => {
    const titles = ['CEO', 'CFO', 'VP Sales', 'Director', 'Manager', 'President', 'VP Operations', 'Chief Technology Officer', 'VP Marketing', 'Chief Risk Officer', 'Head of Underwriting', 'Managing Director'];
    const idx = ctx?.index || 0;
    return cycleValue(titles, idx);
  },
  
  'Salutation': (ctx) => {
    const salutations = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Mx.'];
    const idx = ctx?.index || 0;
    return cycleValue(salutations, idx);
  },
  
  'Middle Name': (ctx) => {
    const middleNames = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const idx = ctx?.index || 0;
    return cycleValue(middleNames, idx);
  },
  
  'Suffix': (ctx) => {
    const suffixes = ['Jr.', 'Sr.', 'II', 'III', 'IV', ''];
    const idx = ctx?.index || 0;
    return cycleValue(suffixes, idx);
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // STANDARD LEAD FIELDS - STATUS & RATING
  // ════════════════════════════════════════════════════════════════════════════
  
  'Status': () => 'Open - Not Contacted',
  
  'Rating': (ctx) => {
    const ratings = ['Hot', 'Warm', 'Cold'];
    const idx = ctx?.index || 0;
    return cycleValue(ratings, idx);
  },
  
  'Lead Source': (ctx) => {
    const sources = ['Paid Ads', 'Website', 'Purchased List', 'Referrals - COI', 'Referral - Internal Staff', 'Research', 'Conference', 'Trade Show', 'Partner Referral', 'Social Media', 'Email Campaign', 'Webinar'];
    const idx = ctx?.index || 0;
    return cycleValue(sources, idx);
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // STANDARD LEAD FIELDS - COMPANY INFORMATION
  // ════════════════════════════════════════════════════════════════════════════
  
  'Target Insured Industry': (ctx) => {
    const industries = ['Insurance', 'Financial Services', 'Healthcare', 'Technology', 'Manufacturing', 'Retail', 'Real Estate', 'Construction', 'Transportation', 'Energy'];
    const idx = ctx?.index || 0;
    return cycleValue(industries, idx);
  },
  
  'Website': (ctx) => {
    const companyName = COMPREHENSIVE_LEAD_DATA['Company'](ctx) as string;
    return `https://www.${companyName.toLowerCase().replace(/\s+/g, '')}.com`;
  },
  
  'Number of Employees': () => {
    return Math.floor(Math.random() * 1000) + 10;
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // ADDRESS FIELDS - Comprehensive Geography Coverage
  // ════════════════════════════════════════════════════════════════════════════
  
  'Street': (ctx) => {
    const streetNumber = Math.floor(Math.random() * 9999) + 1000;
    const suiteNumber = Math.floor(Math.random() * 999) + 100;
    const streetNames = ['Main', 'Oak', 'Elm', 'Park', 'First', 'Second', 'Broadway', 'Washington', 'Market', 'High', 'Church', 'King'];
    const idx = ctx?.index || 0;
    return `${streetNumber} ${cycleValue(streetNames, idx)} Street\nSuite ${suiteNumber}`;
  },
  
  'City': (ctx) => {
    const country = ctx?.country || 'United States';
    const countryDefaults = COUNTRY_DEFAULTS[country] || COUNTRY_DEFAULTS['United States'];
    return countryDefaults.city;
  },
  
  'State/Province': (ctx) => {
    const country = ctx?.country || 'United States';
    const countryDefaults = COUNTRY_DEFAULTS[country] || COUNTRY_DEFAULTS['United States'];
    // Use exact state name from defaults - these match the picklist values
    // For US: "New York", "California", etc.
    // For Canada: "Ontario", "British Columbia", etc.
    const state = countryDefaults.state;
    
    // Ensure we return a valid state name that exists in the picklist
    // Valid US states: Alabama, Alaska, Arizona, Arkansas, California, Colorado, Connecticut, Delaware, Florida, Georgia, Hawaii, Idaho, Illinois, Indiana, Iowa, Kansas, Kentucky, Louisiana, Maine, Maryland, Massachusetts, Michigan, Minnesota, Mississippi, Missouri, Montana, Nebraska, Nevada, New Hampshire, New Jersey, New Mexico, New York, North Carolina, North Dakota, Ohio, Oklahoma, Oregon, Pennsylvania, Rhode Island, South Carolina, South Dakota, Tennessee, Texas, Utah, Vermont, Virginia, Washington, West Virginia, Wisconsin, Wyoming
    // Valid Canadian provinces: Alberta, British Columbia, Manitoba, New Brunswick, Newfoundland and Labrador, Nova Scotia, Ontario, Prince Edward Island, Quebec, Saskatchewan, Northwest Territories, Nunavut, Yukon
    
    // If the state from defaults doesn't match, use a common one
    const validUSStates = ['Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'];
    const validCanadianProvinces = ['Alberta', 'British Columbia', 'Manitoba', 'New Brunswick', 'Newfoundland and Labrador', 'Nova Scotia', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Northwest Territories', 'Nunavut', 'Yukon'];
    
    // Check if state is valid
    if (country === 'United States' || country === 'Canada') {
      const allValidStates = [...validUSStates, ...validCanadianProvinces];
      if (allValidStates.includes(state)) {
        return state;
      }
      // If state doesn't match, use a default based on country
      if (country === 'United States') {
        return 'New York'; // Default US state
      } else if (country === 'Canada') {
        return 'Ontario'; // Default Canadian province
      }
    }
    
    // For non-US/CA countries, return empty (State/Province might not be applicable)
    // But if it's required, use a default US state
    return state || 'New York';
  },
  
  'Zip/Postal Code': (ctx) => {
    const country = ctx?.country || 'United States';
    const countryDefaults = COUNTRY_DEFAULTS[country] || COUNTRY_DEFAULTS['United States'];
    const basePostal = countryDefaults.postalCode;
    // Add random suffix for uniqueness
    return `${basePostal}-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`;
  },
  
  'Country': (ctx) => {
    // Cycle through all available countries for comprehensive coverage
    const countries = Object.keys(COUNTRY_DEFAULTS);
    const idx = ctx?.index || 0;
    return cycleValue(countries, idx);
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOM LEAD FIELDS - Required Fields
  // ════════════════════════════════════════════════════════════════════════════
  
  'Region': (ctx) => {
    const country = ctx?.country || COMPREHENSIVE_LEAD_DATA['Country'](ctx) as string;
    return getRegionFromCountry(country);
  },
  
  'Distribution Region': (ctx) => {
    // Same as Region
    return COMPREHENSIVE_LEAD_DATA['Region'](ctx) as string;
  },
  
  'Type': (ctx) => {
    // Valid Type__c values for Lead (Phase 1 scope)
    const types = ['Member', 'Non-Member MGA'];
    const idx = ctx?.index || 0;
    return cycleValue(types, idx);
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // CUSTOM LEAD FIELDS - Additional Information
  // ════════════════════════════════════════════════════════════════════════════
  
  'Product Overview': (ctx) => {
    const products = ['Property & Casualty', 'Life Insurance', 'Health Insurance', 'Reinsurance', 'Specialty Lines', 'Commercial Lines', 'Personal Lines', 'Excess & Surplus'];
    const idx = ctx?.index || 0;
    return cycleValue(products, idx);
  },
  
  'Prior/Incumbent': (ctx) => {
    const incumbents = ['Competitor A', 'Competitor B', 'Self-Insured', 'Unknown', 'Competitor C', 'In-House', 'Previous Carrier'];
    const idx = ctx?.index || 0;
    return cycleValue(incumbents, idx);
  },
  
  'Series Entity': (ctx) => {
    const idx = ctx?.index || 0;
    return `Series ${idx + 1}`;
  },
  
  'Annual GWP Estimate (Year 1)': () => {
    // Generate realistic GWP values (in dollars)
    return Math.floor(Math.random() * 5000000) + 100000;
  },
  
  'Estimated Onboarding Date': (ctx) => {
    const idx = ctx?.index || 0;
    // Vary between 60-180 days from now
    const days = 60 + (idx * 15);
    return generateFutureDate(days);
  },
  
  'Proposed Effective Date': (ctx) => {
    const idx = ctx?.index || 0;
    // Vary between 30-90 days from now
    const days = 30 + (idx * 10);
    return generateFutureDate(days);
  },
  
  'Submission folder link': (ctx) => {
    const timestamp = ctx?.timestamp || Date.now();
    const uniqueId = ctx?.uniqueId || generateUniqueId();
    return `https://sharepoint.example.com/folders/test-lead-${uniqueId.toLowerCase()}-${timestamp}`;
  },
  
  'Description': (ctx) => {
    const country = ctx?.country || COMPREHENSIVE_LEAD_DATA['Country'](ctx) as string;
    const region = getRegionFromCountry(country);
    const currency = getCurrencyFromCountry(country);
    const type = COMPREHENSIVE_LEAD_DATA['Type'](ctx) as string;
    return `Comprehensive test Lead with variety.\nCountry: ${country}\nRegion: ${region}\nCurrency: ${currency}\nType: ${type}\nCreated: ${new Date().toISOString()}`;
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // BOOLEAN FIELDS
  // ════════════════════════════════════════════════════════════════════════════
  
  'Is Record Duplicate': () => false,
  
  'Duplicate Override Reason': (ctx) => {
    const timestamp = ctx?.timestamp || Date.now();
    return `Test data creation - Comprehensive Lead for automation testing. Created: ${new Date(timestamp).toISOString()}`;
  },
  
  // ════════════════════════════════════════════════════════════════════════════
  // SYSTEM FIELDS (usually read-only, but included for completeness)
  // ════════════════════════════════════════════════════════════════════════════
  
  'Currency': (ctx) => {
    const country = ctx?.country || COMPREHENSIVE_LEAD_DATA['Country'](ctx) as string;
    return getCurrencyFromCountry(country);
  },
  
  'Geocode Accuracy': () => 'Address',
  
  'Latitude': (ctx) => {
    // Would need coordinates mapping - for now return 0
    // In real implementation, use getCoordinatesForCountry
    return 0;
  },
  
  'Longitude': (ctx) => {
    // Would need coordinates mapping - for now return 0
    return 0;
  },
};

// ============================================================================
// FIELD NAME MAPPING (UI Label -> Generator Key)
// ============================================================================

/**
 * Map UI field labels to generator keys
 * Handles variations in field naming
 */
export const FIELD_NAME_MAPPING: Record<string, string> = {
  // Standard field variations - Identity
  'Name': 'Last Name',  // Name field on Lead maps to Last Name
  'FirstName': 'First Name',
  'First Name': 'First Name',
  'First_Name__c': 'First Name',
  'LastName': 'Last Name',
  'Last Name': 'Last Name',
  'Last_Name__c': 'Last Name',
  'Company': 'Company',
  'Company Name': 'Company',
  'Email': 'Email',
  'Email Address': 'Email',
  'Phone': 'Phone',
  'MobilePhone': 'Mobile',
  'Mobile': 'Mobile',
  'Title': 'Title',
  'Status': 'Status',
  'Rating': 'Rating',
  'LeadSource': 'Lead Source',
  'Lead Source': 'Lead Source',
  'Industry': 'Target Insured Industry',
  'Target Insured Industry': 'Target Insured Industry',
  'Website': 'Website',
  'Street': 'Street',
  'City': 'City',
  'State': 'State/Province',
  'State/Province': 'State/Province',
  'State_Province__c': 'State/Province',
  'PostalCode': 'Zip/Postal Code',
  'Zip/Postal Code': 'Zip/Postal Code',
  'Country': 'Country',
  
  // Custom field variations
  'Region__c': 'Region',
  'Region': 'Region',
  'Distribution_Region__c': 'Distribution Region',
  'Distribution Region': 'Distribution Region',
  'Type__c': 'Type',
  'Type': 'Type',
  'Product_Overview__c': 'Product Overview',
  'Product Overview': 'Product Overview',
  'Prior_Incumbent__c': 'Prior/Incumbent',
  'Prior/Incumbent': 'Prior/Incumbent',
  'Series_Entity__c': 'Series Entity',
  'Series Entity': 'Series Entity',
  'Annual_GWP_Estimate_Year_1__c': 'Annual GWP Estimate (Year 1)',
  'Annual GWP Estimate (Year 1)': 'Annual GWP Estimate (Year 1)',
  'Estimated_Onboarding_Date__c': 'Estimated Onboarding Date',
  'Estimated Onboarding Date': 'Estimated Onboarding Date',
  'Estimated Onboarding Date__c': 'Estimated Onboarding Date',
  'Proposed_Effective_Date__c': 'Proposed Effective Date',
  'Proposed Effective Date': 'Proposed Effective Date',
  'Proposed Effective Date__c': 'Proposed Effective Date',
  'Submission_folder_link__c': 'Submission folder link',
  'Is_Record_Duplicate__c': 'Is Record Duplicate',
  'Duplicate_Override_Reason__c': 'Duplicate Override Reason',
  'Description': 'Description',
};

/**
 * Normalize field name to generator key
 */
export function normalizeFieldName(uiLabel: string): string {
  // Check mapping first
  if (FIELD_NAME_MAPPING[uiLabel]) {
    return FIELD_NAME_MAPPING[uiLabel];
  }
  
  // Try direct match
  if (COMPREHENSIVE_LEAD_DATA[uiLabel]) {
    return uiLabel;
  }
  
  // Try case-insensitive match
  const lowerLabel = uiLabel.toLowerCase();
  for (const key of Object.keys(COMPREHENSIVE_LEAD_DATA)) {
    if (key.toLowerCase() === lowerLabel) {
      return key;
    }
  }
  
  // Return original if no match found
  return uiLabel;
}
