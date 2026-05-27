/**
 * TestDataManager - Loads test data from Excel files
 * 
 * Use this when you need to load existing test data from Excel workbooks.
 * For creating new test data via API, use TestDataFactory instead.
 * 
 * This is useful for:
 * - Loading pre-defined test data sets
 * - Non-technical users who prefer Excel
 * - Legacy test data in Excel format
 * 
 * Uses exceljs (no known vulnerabilities) instead of xlsx.
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { testDataConfig } from '../../config/testData.config';
import { logger } from '../../utils/logger';

export interface TestDataRow {
  [key: string]: string | number | boolean | null;
}

export class TestDataManager {
  private cache: Map<string, TestDataRow[]> = new Map();

  /**
   * Load test data from Excel file
   */
  async loadFromExcel(
    workbookName: string,
    sheetName: string,
    useCache: boolean = true
  ): Promise<TestDataRow[]> {
    const cacheKey = `${workbookName}:${sheetName}`;

    if (useCache && testDataConfig.cacheEnabled && this.cache.has(cacheKey)) {
      logger.debug(`Loading from cache: ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    const workbookPath = path.join(testDataConfig.excelDirectory, workbookName);

    if (!fs.existsSync(workbookPath)) {
      throw new Error(`Workbook not found: ${workbookPath}`);
    }

    logger.info(`Loading test data from ${workbookName} - ${sheetName}`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(workbookPath);
    
    const sheet = workbook.getWorksheet(sheetName);

    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" not found in workbook ${workbookName}`);
    }

    const rows: TestDataRow[] = [];
    const headers: string[] = [];

    // Get headers from first row
    sheet.getRow(1).eachCell((cell, colNumber) => {
      headers[colNumber - 1] = cell.value?.toString() || `Column${colNumber}`;
    });

    // Get data rows (starting from row 2)
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header row

      const rowData: TestDataRow = {};
      row.eachCell((cell, colNumber) => {
        const header = headers[colNumber - 1];
        if (header) {
          // Handle different cell value types
          const value = cell.value;
          if (value === null || value === undefined) {
            rowData[header] = null;
          } else if (typeof value === 'object' && 'result' in value) {
            // Formula result
            rowData[header] = value.result as string | number | boolean;
          } else if (typeof value === 'object' && 'richText' in value) {
            // Rich text - extract plain text
            rowData[header] = (value.richText as Array<{text: string}>).map(t => t.text).join('');
          } else if (value instanceof Date) {
            rowData[header] = value.toISOString();
          } else {
            rowData[header] = value as string | number | boolean;
          }
        }
      });
      
      // Only add row if it has data
      if (Object.keys(rowData).length > 0) {
        rows.push(rowData);
      }
    });

    if (useCache && testDataConfig.cacheEnabled) {
      this.cache.set(cacheKey, rows);
    }

    logger.info(`Loaded ${rows.length} rows from ${sheetName}`);
    return rows;
  }

  /**
   * Load test data synchronously (wrapper for backward compatibility)
   * Note: This is less efficient as it blocks. Use loadFromExcel for async operations.
   */
  loadFromExcelSync(
    workbookName: string,
    sheetName: string,
    useCache: boolean = true
  ): TestDataRow[] {
    const cacheKey = `${workbookName}:${sheetName}`;

    // Return from cache if available
    if (useCache && testDataConfig.cacheEnabled && this.cache.has(cacheKey)) {
      logger.debug(`Loading from cache: ${cacheKey}`);
      return this.cache.get(cacheKey)!;
    }

    // For sync operations, return empty and log warning
    // The caller should use async loadFromExcel instead
    logger.warn(`Sync Excel loading is deprecated. Use async loadFromExcel() instead.`);
    logger.warn(`Returning empty array for ${workbookName}:${sheetName}`);
    return [];
  }

  /**
   * Get test data row by test case ID
   */
  async getRowByTestCaseId(
    testCaseId: string,
    workbookName: string = testDataConfig.defaultWorkbook,
    sheetName: string = 'TestData'
  ): Promise<TestDataRow | null> {
    const rows = await this.loadFromExcel(workbookName, sheetName);
    const row = rows.find((r) => r.TestCaseID === testCaseId || r['Test Case ID'] === testCaseId);

    if (!row) {
      logger.warn(`Test data not found for test case ID: ${testCaseId}`);
      return null;
    }

    return row;
  }

  /**
   * Get test data rows by tag
   */
  async getRowsByTag(
    tag: string,
    workbookName: string = testDataConfig.defaultWorkbook,
    sheetName: string = 'TestData'
  ): Promise<TestDataRow[]> {
    const rows = await this.loadFromExcel(workbookName, sheetName);
    return rows.filter((r) => {
      const tags = (r.Tags || r['Tags'] || '').toString().split(',').map((t: string) => t.trim());
      return tags.includes(tag);
    });
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Test data cache cleared');
  }
}

export const testDataManager = new TestDataManager();
