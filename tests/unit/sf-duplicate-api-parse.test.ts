import { describe, expect, it } from 'vitest';
import {
  bodyIndicatesDuplicateOrValidation,
  bodyIndicatesDuplicateRule,
  bodyIndicatesDuplicatesDetected,
  bodyIndicatesValidationException,
  extractDuplicateRuleNames,
  extractMatchedRecordIdsFromDuplicateBody,
  rawResponseIndicatesDuplicatesDetected,
} from '../../src/utils/sf-duplicate-api-parse';

describe('sf-duplicate-api-parse', () => {
  it('detects DUPLICATES_DETECTED in raw text', () => {
    expect(rawResponseIndicatesDuplicatesDetected('[{"errorCode":"DUPLICATES_DETECTED"}]')).toBe(true);
    expect(rawResponseIndicatesDuplicatesDetected('OK')).toBe(false);
  });

  it('detects duplicate in array body', () => {
    const body = [{ errorCode: 'DUPLICATES_DETECTED', message: 'dup' }];
    expect(bodyIndicatesDuplicatesDetected(body, '')).toBe(true);
  });

  it('extracts matched Ids from nested duplicateResult', () => {
    const body = [
      {
        errorCode: 'DUPLICATES_DETECTED',
        duplicateResult: {
          matchResults: [{ records: [{ Id: '001000000000001AAA' }, { Id: '001000000000002AAA' }] }],
        },
      },
    ];
    const ids = extractMatchedRecordIdsFromDuplicateBody(body);
    expect(ids).toContain('001000000000001AAA');
    expect(ids).toContain('001000000000002AAA');
  });

  it('detects a specific DuplicateRule by name (e.g. POG_Prevent_Duplicate)', () => {
    const body = [
      {
        errorCode: 'DUPLICATES_DETECTED',
        duplicateResult: {
          duplicateRule: 'POG_Prevent_Duplicate',
          duplicateRuleEntityType: 'POG_Product__c',
          matchResults: [],
        },
      },
    ];
    expect(bodyIndicatesDuplicateRule(body, 'POG_Prevent_Duplicate')).toBe(true);
    expect(bodyIndicatesDuplicateRule(body, 'POG_Match_Key_Alert')).toBe(false);
  });

  it('extracts all duplicate rule names that fired', () => {
    const body = [
      {
        errorCode: 'DUPLICATES_DETECTED',
        duplicateResult: { duplicateRule: 'OSFI_Match_Key_Alert' },
      },
      {
        errorCode: 'DUPLICATES_DETECTED',
        duplicateResult: { duplicateRule: 'OSFI_Prevent_Duplicate' },
      },
    ];
    const names = extractDuplicateRuleNames(body);
    expect(names).toContain('OSFI_Match_Key_Alert');
    expect(names).toContain('OSFI_Prevent_Duplicate');
    expect(names).toHaveLength(2);
  });

  it('recognises FIELD_CUSTOM_VALIDATION_EXCEPTION (LOB-style) as duplicate detection', () => {
    const body = [
      {
        errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION',
        message: 'Line of business with the same name and BEGAAP & Solvency II combination.',
      },
    ];
    expect(bodyIndicatesValidationException(body)).toBe(true);
    expect(bodyIndicatesValidationException(body, /same name and BEGAAP/i)).toBe(true);
    expect(bodyIndicatesValidationException(body, /unrelated message/i)).toBe(false);
  });

  it('bodyIndicatesDuplicateOrValidation accepts either pattern', () => {
    const dupBody = [{ errorCode: 'DUPLICATES_DETECTED', duplicateResult: {} }];
    const valBody = [{ errorCode: 'FIELD_CUSTOM_VALIDATION_EXCEPTION', message: 'dup' }];
    const cleanBody = { id: '00x', success: true };
    expect(bodyIndicatesDuplicateOrValidation(dupBody, '')).toBe(true);
    expect(bodyIndicatesDuplicateOrValidation(valBody, '')).toBe(true);
    expect(bodyIndicatesDuplicateOrValidation(cleanBody, '')).toBe(false);
  });
});
