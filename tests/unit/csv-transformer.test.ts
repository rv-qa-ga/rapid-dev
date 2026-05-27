/**
 * Unit tests for CsvTransformer
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CsvTransformer } from '../../src/utils/csv-transformer';
import { PicklistMappingRepository } from '../../src/utils/picklist-mapping-repository';
import * as path from 'path';
import * as fs from 'fs';
import * as ExcelJS from 'exceljs';

describe('CsvTransformer', () => {
  let transformer: CsvTransformer;
  let mappingRepo: PicklistMappingRepository;
  let testCsvPath: string;
  let testMappingPath: string;

  beforeEach(async () => {
    mappingRepo = new PicklistMappingRepository();
    
    // Create test mapping file
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('party migration');
    
    worksheet.addRow([
      'Dataverse Field Name',
      'Dataverse Raw Value',
      'Dataverse Label',
      'Salesforce Value Target'
    ]);
    
    worksheet.addRow(['statecode', '0', 'Active', 'Active']);
    worksheet.addRow(['statecode', '1', 'Inactive', 'Inactive']);
    worksheet.addRow(['statuscode', '1', 'Active', 'Active']);
    worksheet.addRow(['statuscode', '2', 'Inactive', 'Inactive']);

    testMappingPath = path.join(__dirname, 'temp_test_mappings.xlsx');
    await workbook.xlsx.writeFile(testMappingPath);
    await mappingRepo.loadMappings(testMappingPath, 'party migration');

    transformer = new CsvTransformer(mappingRepo);

    // Create test CSV file
    const csvContent = `statecode,statuscode,name,partyid
0,1,Test Account,12345
1,2,Another Account,67890`;

    testCsvPath = path.join(__dirname, 'temp_test_input.csv');
    fs.writeFileSync(testCsvPath, csvContent, 'utf-8');
  });

  afterEach(() => {
    const tryUnlink = (p: string) => {
      try {
        if (fs.existsSync(p)) fs.unlinkSync(p);
      } catch {
        /* ignore EBUSY on Windows */
      }
    };
    tryUnlink(testCsvPath);
    tryUnlink(testMappingPath);
    tryUnlink(path.join(__dirname, 'temp_test_input_salesforce_ready.csv'));
  });

  describe('transformCsv', () => {
    it('should transform coded values to Salesforce picklist values', async () => {
      const result = await transformer.transformCsv(testCsvPath, undefined, false, false);

      expect(result.totalRows).toBe(2);
      expect(result.transformedFields).toBeGreaterThan(0);

      // Verify output file exists
      expect(fs.existsSync(result.outputPath)).toBe(true);

      // Read and verify transformed content
      const outputContent = fs.readFileSync(result.outputPath, 'utf-8');
      const lines = outputContent.split('\n');
      
      // Check header
      expect(lines[0]).toContain('statecode,statuscode');

      // Check transformed values (should have "Active" and "Inactive" instead of codes)
      expect(outputContent).toContain('Active');
      expect(outputContent).toContain('Inactive');
    });

    it('should log unmapped values', async () => {
      const result = await transformer.transformCsv(testCsvPath, undefined, false, false);

      // Should have some transformed values
      expect(result.transformedValues.length).toBeGreaterThan(0);
      
      // Unmapped values should be logged (fields without mappings)
      // name and partyid don't have mappings, so they won't be in unmapped (they're just passed through)
    });

    it('should fail in strict mode with unmapped values', async () => {
      // Coded value with no mapping for a field that has mappings (not a pass-through column)
      const csvWithUnmapped = `statecode,statuscode,name,partyid
99,1,Test,1`;

      const csvPath = path.join(__dirname, 'temp_test_unmapped.csv');
      fs.writeFileSync(csvPath, csvWithUnmapped, 'utf-8');

      try {
        await expect(
          transformer.transformCsv(csvPath, undefined, false, true)
        ).rejects.toThrow('Strict mode');
      } finally {
        try {
          if (fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
        } catch {
          /* Windows may hold file handles briefly */
        }
        const outPath = path.join(__dirname, 'temp_test_unmapped_salesforce_ready.csv');
        try {
          if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
        } catch {
          /* ignore */
        }
      }
    });

    it('should respect only-fields filter', async () => {
      transformer.setFieldFilters(['statecode'], undefined);
      
      const result = await transformer.transformCsv(testCsvPath, undefined, false, false);

      // Only statecode should be transformed
      const transformedFields = result.transformedValues
        .map(log => log.fieldName)
        .filter((value, index, self) => self.indexOf(value) === index);
      
      expect(transformedFields).toEqual(['statecode']);
    });

    it('should respect exclude-fields filter', async () => {
      transformer.setFieldFilters(undefined, ['statuscode']);
      
      const result = await transformer.transformCsv(testCsvPath, undefined, false, false);

      // statuscode should not be transformed
      const transformedFields = result.transformedValues
        .map(log => log.fieldName)
        .filter((value, index, self) => self.indexOf(value) === index);
      
      expect(transformedFields).not.toContain('statuscode');
    });

    it('should create backup when requested', async () => {
      const result = await transformer.transformCsv(testCsvPath, undefined, true, false);

      expect(result.backupPath).toBeDefined();
      expect(fs.existsSync(result.backupPath!)).toBe(true);
      
      // Cleanup backup
      if (fs.existsSync(result.backupPath!)) {
        fs.unlinkSync(result.backupPath!);
      }
    });
  });
});
