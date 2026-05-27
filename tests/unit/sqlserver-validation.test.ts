/**
 * Unit tests for SQL Server Validation Helpers
 */

import { describe, it, expect, vi } from 'vitest';
import {
  assertFieldsMatch,
  assertCountMatches,
  FieldComparison,
} from '../../src/sqlserver/tests/helpers/validation';
import { SqlServerClient } from '../../src/sqlserver/client/SqlServerClient';

// Mock SqlServerClient
const mockSqlClient = {
  queryOne: vi.fn(),
  queryMany: vi.fn(),
} as unknown as SqlServerClient;

describe('SQL Server Validation Helpers', () => {
  describe('assertFieldsMatch', () => {
    it('should pass when all fields match', () => {
      const expected = {
        Id: '123',
        Name: 'Test Account',
        Type: 'Customer',
      };

      const actual = {
        SalesforceId: '123',
        AccountName: 'Test Account',
        AccountType: 'Customer',
      };

      const mappings: FieldComparison[] = [
        { sourceField: 'Id', sqlColumn: 'SalesforceId' },
        { sourceField: 'Name', sqlColumn: 'AccountName' },
        { sourceField: 'Type', sqlColumn: 'AccountType' },
      ];

      expect(() => assertFieldsMatch(expected, actual, mappings)).not.toThrow();
    });

    it('should throw when fields do not match', () => {
      const expected = {
        Id: '123',
        Name: 'Test Account',
      };

      const actual = {
        SalesforceId: '123',
        AccountName: 'Different Name',
      };

      const mappings: FieldComparison[] = [
        { sourceField: 'Id', sqlColumn: 'SalesforceId' },
        { sourceField: 'Name', sqlColumn: 'AccountName' },
      ];

      expect(() => assertFieldsMatch(expected, actual, mappings)).toThrow('Field mismatch');
    });

    it('should handle case-insensitive string comparison', () => {
      const expected = {
        Name: 'Test Account',
      };

      const actual = {
        AccountName: 'test account',
      };

      const mappings: FieldComparison[] = [
        { sourceField: 'Name', sqlColumn: 'AccountName' },
      ];

      expect(() => assertFieldsMatch(expected, actual, mappings)).not.toThrow();
    });

    it('should apply transformation function', () => {
      const expected = {
        CreatedDate: '2024-01-01T00:00:00Z',
      };

      const actual = {
        CreatedDate: new Date('2024-01-01T00:00:00Z'),
      };

      const mappings: FieldComparison[] = [
        {
          sourceField: 'CreatedDate',
          sqlColumn: 'CreatedDate',
          transform: (v: string) => new Date(v),
        },
      ];

      expect(() => assertFieldsMatch(expected, actual, mappings)).not.toThrow();
    });
  });

  describe('assertCountMatches', () => {
    it('should pass when counts match', async () => {
      mockSqlClient.queryOne = vi.fn().mockResolvedValue({ count: 10 });

      await expect(
        assertCountMatches(mockSqlClient, 10, 'Accounts', undefined, undefined, {
          tolerance: 0,
        })
      ).resolves.not.toThrow();
    });

    it('should pass when counts match within tolerance', async () => {
      mockSqlClient.queryOne = vi.fn().mockResolvedValue({ count: 11 });

      await expect(
        assertCountMatches(mockSqlClient, 10, 'Accounts', undefined, undefined, {
          tolerance: 1,
        })
      ).resolves.not.toThrow();
    });

    it('should throw when counts do not match', async () => {
      mockSqlClient.queryOne = vi.fn().mockResolvedValue({ count: 15 });

      await expect(
        assertCountMatches(mockSqlClient, 10, 'Accounts', undefined, undefined, {
          tolerance: 0,
        })
      ).rejects.toThrow('Count mismatch');
    });

    it('should support WHERE clause', async () => {
      mockSqlClient.queryOne = vi.fn().mockResolvedValue({ count: 5 });

      await expect(
        assertCountMatches(
          mockSqlClient,
          5,
          'Accounts',
          'Type = @type',
          { type: 'Customer' },
          { tolerance: 0 }
        )
      ).resolves.not.toThrow();

      expect(mockSqlClient.queryOne).toHaveBeenCalledWith(
        expect.stringContaining('WHERE Type = @type'),
        { type: 'Customer' },
        expect.any(Object)
      );
    });
  });
});

