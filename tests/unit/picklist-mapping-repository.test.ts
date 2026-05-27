/**
 * Unit tests for PicklistMappingRepository
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PicklistMappingRepository } from '../../src/utils/picklist-mapping-repository';
import * as path from 'path';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';

describe('PicklistMappingRepository', () => {
  let repo: PicklistMappingRepository;

  beforeEach(() => {
    repo = new PicklistMappingRepository();
  });

  describe('getTargetValue', () => {
    it('should map statecode 0 to Salesforce value', async () => {
      // Create a test Excel file in memory
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('party migration');
      
      // Add headers
      worksheet.addRow([
        'Dataverse Field Name',
        'Dataverse Raw Value',
        'Dataverse Label',
        'Salesforce Value Target'
      ]);
      
      // Add test mappings
      worksheet.addRow(['statecode', '0', 'Active', 'Active']);
      worksheet.addRow(['statecode', '1', 'Inactive', 'Inactive']);
      worksheet.addRow(['statuscode', '1', 'Active', 'Active']);
      worksheet.addRow(['statuscode', '2', 'Inactive', 'Inactive']);

      // Save to temp file
      const tempPath = path.join(__dirname, 'temp_test_mappings.xlsx');
      await workbook.xlsx.writeFile(tempPath);

      try {
        await repo.loadMappings(tempPath, 'party migration');

        // Test statecode mapping
        expect(repo.getTargetValue('statecode', '0')).toBe('Active');
        expect(repo.getTargetValue('statecode', 0)).toBe('Active');
        expect(repo.getTargetValue('statecode', '1')).toBe('Inactive');
        expect(repo.getTargetValue('statecode', 1)).toBe('Inactive');

        // Test statuscode mapping
        expect(repo.getTargetValue('statuscode', '1')).toBe('Active');
        expect(repo.getTargetValue('statuscode', 1)).toBe('Active');
        expect(repo.getTargetValue('statuscode', '2')).toBe('Inactive');
        expect(repo.getTargetValue('statuscode', 2)).toBe('Inactive');

        // Test unmapped value
        expect(repo.getTargetValue('statecode', '99')).toBeNull();
        expect(repo.getTargetValue('unknown_field', '0')).toBeNull();
      } finally {
        // Cleanup
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    it('should handle label-based matching when code match fails', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('party migration');
      
      worksheet.addRow([
        'Dataverse Field Name',
        'Dataverse Raw Value',
        'Dataverse Label',
        'Salesforce Value Target'
      ]);
      
      worksheet.addRow(['country', '', 'United States', 'USA']);
      worksheet.addRow(['country', '', 'United Kingdom', 'UK']);

      const tempPath = path.join(__dirname, 'temp_test_mappings2.xlsx');
      await workbook.xlsx.writeFile(tempPath);

      try {
        await repo.loadMappings(tempPath, 'party migration');

        // Should match by label (case-insensitive)
        expect(repo.getTargetValue('country', 'United States')).toBe('USA');
        expect(repo.getTargetValue('country', 'united states')).toBe('USA');
        expect(repo.getTargetValue('country', 'United Kingdom')).toBe('UK');
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });

    it('should handle whitespace and formatting', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('party migration');
      
      worksheet.addRow([
        'Dataverse Field Name',
        'Dataverse Raw Value',
        'Dataverse Label',
        'Salesforce Value Target'
      ]);
      
      worksheet.addRow(['field1', ' 0 ', 'Label', 'Target']);

      const tempPath = path.join(__dirname, 'temp_test_mappings3.xlsx');
      await workbook.xlsx.writeFile(tempPath);

      try {
        await repo.loadMappings(tempPath, 'party migration');

        // Should handle whitespace
        expect(repo.getTargetValue('field1', '0')).toBe('Target');
        expect(repo.getTargetValue('field1', 0)).toBe('Target');
        expect(repo.getTargetValue('field1', ' 0 ')).toBe('Target');
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });
  });

  describe('hasMappings', () => {
    it('should correctly identify fields with mappings', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('party migration');
      
      worksheet.addRow([
        'Dataverse Field Name',
        'Dataverse Raw Value',
        'Salesforce Value Target'
      ]);
      
      worksheet.addRow(['statecode', '0', 'Active']);

      const tempPath = path.join(__dirname, 'temp_test_mappings4.xlsx');
      await workbook.xlsx.writeFile(tempPath);

      try {
        await repo.loadMappings(tempPath, 'party migration');

        expect(repo.hasMappings('statecode')).toBe(true);
        expect(repo.hasMappings('unknown_field')).toBe(false);
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });
  });

  describe('getMappedFields', () => {
    it('should return all fields that have mappings', async () => {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('party migration');
      
      worksheet.addRow([
        'Dataverse Field Name',
        'Dataverse Raw Value',
        'Salesforce Value Target'
      ]);
      
      worksheet.addRow(['statecode', '0', 'Active']);
      worksheet.addRow(['statuscode', '1', 'Active']);
      worksheet.addRow(['country', 'US', 'USA']);

      const tempPath = path.join(__dirname, 'temp_test_mappings5.xlsx');
      await workbook.xlsx.writeFile(tempPath);

      try {
        await repo.loadMappings(tempPath, 'party migration');

        const fields = repo.getMappedFields();
        expect(fields).toContain('statecode');
        expect(fields).toContain('statuscode');
        expect(fields).toContain('country');
        expect(fields.length).toBe(3);
      } finally {
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    });
  });
});
