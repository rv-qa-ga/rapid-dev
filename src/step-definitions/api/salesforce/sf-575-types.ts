/**
 * Type definitions for SF-575 step definitions
 * These types are used to fix TypeScript implicit any errors
 */

import { CustomMetadataRecord } from '../../../utils/custom-metadata-validator';

// Type definitions for validation result arrays
export interface DataverseValidationResult {
  record: CustomMetadataRecord;
  dataverseValue: string;
  dataverseField?: string;
  exists: boolean;
  error?: string;
}

export interface DataverseComparisonResult {
  record: CustomMetadataRecord;
  dataverseValue: string;
  dataverseField: string;
  salesforceValue: string;
  matches: boolean;
  error?: string;
}

export interface CountryValidationResult {
  record: CustomMetadataRecord;
  dataverseValue: string;
  exists: boolean;
  error?: string;
}
