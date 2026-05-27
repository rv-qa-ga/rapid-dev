/**
 * Picklist Mapping Repository
 * Loads and manages picklist value mappings from PicklistValueMappings.xlsx
 * 
 * This repository reads the "party migration" sheet and creates in-memory
 * dictionaries for fast lookup during CSV transformation.
 */

import * as ExcelJS from 'exceljs';
import * as path from 'path';
import * as fs from 'fs';
import { logger } from './logger';

export interface PicklistMapping {
  dataverseField: string;
  dataverseCode: string | number | null;
  dataverseLabel: string | null;
  salesforceTargetValue: string;
  rowNumber: number;
}

export interface FieldMappings {
  // Key: field name, Value: Map of (code/label -> target value)
  [fieldName: string]: Map<string | number, string>;
}

export interface LabelMappings {
  // Key: field name, Value: Map of (label -> target value)
  [fieldName: string]: Map<string, string>;
}

/**
 * Picklist Mapping Repository
 * Loads mappings from Excel and provides fast lookup
 */
export class PicklistMappingRepository {
  private mappings: PicklistMapping[] = [];
  private fieldMappings: FieldMappings = {};
  private labelMappings: LabelMappings = {};
  private loaded: boolean = false;

  /**
   * Load mappings from Excel file
   */
  async loadMappings(
    excelPath: string,
    sheetName: string = 'party migration'
  ): Promise<void> {
    if (!fs.existsSync(excelPath)) {
      throw new Error(`Excel mapping file not found: ${excelPath}`);
    }

    logger.info(`📖 Loading picklist mappings from: ${excelPath}`);
    logger.info(`   Sheet: "${sheetName}"`);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelPath);

    const worksheet = workbook.getWorksheet(sheetName);
    if (!worksheet) {
      throw new Error(`Sheet "${sheetName}" not found in Excel file`);
    }

    // Read headers
    const headers: string[] = [];
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      headers[colNumber - 1] = this.getCellValueAsString(cell).trim();
    });

    logger.debug(`Headers found: ${headers.join(', ')}`);

    // Find column indices using flexible matching
    const fieldNameCol = this.findColumnIndex(headers, [
      'Dataverse Field Name',
      'Dataverse Field',
      'Field Name',
      'Source Field',
      'Field'
    ]);

    const codeCol = this.findColumnIndex(headers, [
      'Dataverse Raw Value',
      'Dataverse Code',
      'Datawords Code',
      'Code',
      'Raw Value',
      'Value'
    ]);

    const labelCol = this.findColumnIndex(headers, [
      'Dataverse Label',
      'Label',
      'Display Label',
      'Description'
    ]);

    const targetCol = this.findColumnIndex(headers, [
      'Salesforce Value Target',
      'Salesforce Target',
      'Target Value',
      'SF Value',
      'Target'
    ]);

    if (fieldNameCol === -1) {
      throw new Error('Dataverse Field Name column not found in Excel file');
    }

    if (targetCol === -1) {
      throw new Error('Salesforce Value Target column not found in Excel file');
    }

    // Read data rows
    this.mappings = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const fieldName = this.getCellValueAsString(row.getCell(fieldNameCol + 1)).trim();
      const code = this.getCellValueAsString(row.getCell(codeCol + 1));
      const label = labelCol !== -1 ? this.getCellValueAsString(row.getCell(labelCol + 1)).trim() : null;
      const targetValue = this.getCellValueAsString(row.getCell(targetCol + 1)).trim();

      // Skip empty rows
      if (!fieldName || !targetValue) {
        return;
      }

      // Normalize code (handle numeric strings)
      let normalizedCode: string | number | null = null;
      if (code && code.trim() !== '') {
        const codeTrimmed = code.trim();
        // Try to parse as number
        const numValue = Number(codeTrimmed);
        if (!isNaN(numValue) && codeTrimmed === numValue.toString()) {
          normalizedCode = numValue;
        } else {
          normalizedCode = codeTrimmed;
        }
      }

      this.mappings.push({
        dataverseField: fieldName,
        dataverseCode: normalizedCode,
        dataverseLabel: label || null,
        salesforceTargetValue: targetValue,
        rowNumber
      });
    });

    logger.info(`✅ Loaded ${this.mappings.length} picklist mappings`);

    // Build lookup dictionaries
    this.buildLookupDictionaries();

    this.loaded = true;
  }

  /**
   * Build in-memory lookup dictionaries for fast access
   */
  private buildLookupDictionaries(): void {
    this.fieldMappings = {};
    this.labelMappings = {};

    for (const mapping of this.mappings) {
      const fieldName = mapping.dataverseField;

      // Initialize field maps if needed
      if (!this.fieldMappings[fieldName]) {
        this.fieldMappings[fieldName] = new Map();
      }
      if (!this.labelMappings[fieldName]) {
        this.labelMappings[fieldName] = new Map();
      }

      // Add code-based mapping
      if (mapping.dataverseCode !== null) {
        this.fieldMappings[fieldName].set(mapping.dataverseCode, mapping.salesforceTargetValue);
      }

      // Add label-based mapping
      if (mapping.dataverseLabel) {
        const normalizedLabel = mapping.dataverseLabel.toLowerCase().trim();
        this.labelMappings[fieldName].set(normalizedLabel, mapping.salesforceTargetValue);
      }
    }

    // Log summary
    const fieldCounts = Object.keys(this.fieldMappings).length;
    logger.debug(`Built lookup dictionaries for ${fieldCounts} fields`);
  }

  /**
   * Get Salesforce target value for a Dataverse field and value
   * Tries code match first, then label match
   */
  getTargetValue(fieldName: string, dataverseValue: string | number | null): string | null {
    if (!this.loaded) {
      throw new Error('Mappings not loaded. Call loadMappings() first.');
    }

    if (dataverseValue === null || dataverseValue === undefined || dataverseValue === '') {
      return null;
    }

    const normalizedField = fieldName.trim();
    
    // Try code-based lookup first
    if (this.fieldMappings[normalizedField]) {
      // Normalize the value (handle string vs number)
      let normalizedValue: string | number;
      if (typeof dataverseValue === 'number') {
        normalizedValue = dataverseValue;
      } else {
        const strValue = String(dataverseValue).trim();
        const numValue = Number(strValue);
        normalizedValue = (!isNaN(numValue) && strValue === numValue.toString()) ? numValue : strValue;
      }

      const codeMap = this.fieldMappings[normalizedField];
      if (codeMap.has(normalizedValue)) {
        return codeMap.get(normalizedValue)!;
      }
    }

    // Try label-based lookup
    if (this.labelMappings[normalizedField]) {
      const labelMap = this.labelMappings[normalizedField];
      const normalizedLabel = String(dataverseValue).toLowerCase().trim();
      if (labelMap.has(normalizedLabel)) {
        return labelMap.get(normalizedLabel)!;
      }
    }

    return null; // No mapping found
  }

  /**
   * Check if a field has mappings
   */
  hasMappings(fieldName: string): boolean {
    const normalizedField = fieldName.trim();
    return !!(this.fieldMappings[normalizedField] || this.labelMappings[normalizedField]);
  }

  /**
   * Get all fields that have mappings
   */
  getMappedFields(): string[] {
    const fields = new Set<string>();
    Object.keys(this.fieldMappings).forEach(f => fields.add(f));
    Object.keys(this.labelMappings).forEach(f => fields.add(f));
    return Array.from(fields).sort();
  }

  /**
   * Get all mappings for a specific field
   */
  getFieldMappings(fieldName: string): PicklistMapping[] {
    return this.mappings.filter(m => m.dataverseField === fieldName.trim());
  }

  /**
   * Get all mappings
   */
  getAllMappings(): PicklistMapping[] {
    return [...this.mappings];
  }

  /**
   * Find column index by header name (case-insensitive, flexible matching)
   */
  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();
      for (const name of possibleNames) {
        if (header === name.toLowerCase() || header.includes(name.toLowerCase())) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Get cell value as string
   */
  private getCellValueAsString(cell: ExcelJS.Cell | null | undefined): string {
    if (!cell || cell.value === null || cell.value === undefined) {
      return '';
    }

    // Handle merged cells
    if (cell.isMerged && cell.master) {
      return this.getCellValueAsString(cell.master);
    }

    // Handle different value types
    if (typeof cell.value === 'string') {
      return cell.value.trim();
    }
    if (typeof cell.value === 'number') {
      return cell.value.toString();
    }
    if (cell.value instanceof Date) {
      return cell.value.toISOString().split('T')[0];
    }
    if (typeof cell.value === 'boolean') {
      return cell.value ? 'Yes' : 'No';
    }
    if (typeof cell.value === 'object') {
      // Handle rich text or formula results
      if ('richText' in cell.value) {
        return (cell.value as any).richText.map((rt: any) => rt.text).join('');
      }
      if ('result' in cell.value) {
        return String(cell.value.result);
      }
      return String(cell.value);
    }

    return String(cell.value).trim();
  }
}
