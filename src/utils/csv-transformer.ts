/**
 * CSV Transformer
 * Transforms CSV files by applying picklist value mappings
 * 
 * This transformer reads a CSV file, applies picklist mappings from
 * PicklistMappingRepository, and outputs a transformed CSV ready for
 * Salesforce Workbench import.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PicklistMappingRepository } from './picklist-mapping-repository';
import { logger } from './logger';

export interface TransformationLog {
  fieldName: string;
  originalValue: string | number | null;
  transformedValue: string | null;
  rowIdentifier: string | number;
  rowNumber: number;
  mappingFound: boolean;
}

export interface TransformationResult {
  outputPath: string;
  totalRows: number;
  transformedFields: number;
  unmappedValues: TransformationLog[];
  transformedValues: TransformationLog[];
  backupPath?: string;
}

/**
 * CSV Transformer
 * Transforms CSV values using picklist mappings
 */
export class CsvTransformer {
  private mappingRepo: PicklistMappingRepository;
  private onlyFields?: string[];
  private excludeFields?: string[];

  constructor(mappingRepo: PicklistMappingRepository) {
    this.mappingRepo = mappingRepo;
  }

  /**
   * Set field filters
   */
  setFieldFilters(onlyFields?: string[], excludeFields?: string[]): void {
    this.onlyFields = onlyFields?.map(f => f.trim().toLowerCase());
    this.excludeFields = excludeFields?.map(f => f.trim().toLowerCase());
  }

  /**
   * Transform CSV file
   */
  async transformCsv(
    inputPath: string,
    outputPath?: string,
    createBackup: boolean = true,
    strictMode: boolean = false
  ): Promise<TransformationResult> {
    logger.info(`📝 Transforming CSV: ${inputPath}`);

    // Read CSV file
    const csvContent = fs.readFileSync(inputPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim() !== '');

    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header
    const headerLine = lines[0];
    const headers = this.parseCsvLine(headerLine);
    logger.debug(`Found ${headers.length} columns: ${headers.join(', ')}`);

    // Identify primary key column (for row identification in logs)
    const primaryKeyCol = this.findPrimaryKeyColumn(headers);

    // Create backup if requested
    let backupPath: string | undefined;
    if (createBackup) {
      backupPath = this.createBackup(inputPath);
      logger.info(`📦 Backup created: ${backupPath}`);
    }

    // Determine output path
    const finalOutputPath = outputPath || this.generateOutputPath(inputPath);

    // Transform data
    const transformedLines: string[] = [];
    const logs: TransformationLog[] = [];
    let transformedCount = 0;

    // Add header
    transformedLines.push(headerLine);

    // Process data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = this.parseCsvLine(line);
      const transformedValues: string[] = [];
      const rowIdentifier = primaryKeyCol !== -1 ? values[primaryKeyCol] : i;

      // Transform each column
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const fieldName = headers[colIndex];
        const originalValue = values[colIndex] || '';

        // Check if field should be processed
        if (!this.shouldProcessField(fieldName)) {
          transformedValues.push(originalValue);
          continue;
        }

        // Check if field has mappings
        if (!this.mappingRepo.hasMappings(fieldName)) {
          transformedValues.push(originalValue);
          continue;
        }

        // Transform value
        const transformedValue = this.mappingRepo.getTargetValue(fieldName, originalValue);

        if (transformedValue !== null) {
          // Mapping found and applied
          transformedValues.push(transformedValue);
          transformedCount++;
          logs.push({
            fieldName,
            originalValue,
            transformedValue,
            rowIdentifier,
            rowNumber: i + 1,
            mappingFound: true
          });
        } else {
          // No mapping found
          transformedValues.push(originalValue); // Keep original
          logs.push({
            fieldName,
            originalValue,
            transformedValue: null,
            rowIdentifier,
            rowNumber: i + 1,
            mappingFound: false
          });

          if (strictMode && originalValue !== '' && originalValue !== null) {
            throw new Error(
              `Strict mode: Unmapped value found for field "${fieldName}" = "${originalValue}" ` +
              `in row ${i + 1} (ID: ${rowIdentifier})`
            );
          }
        }
      }

      // Write transformed row
      transformedLines.push(this.formatCsvLine(transformedValues));
    }

    // Write output CSV
    fs.writeFileSync(finalOutputPath, transformedLines.join('\n'), 'utf-8');
    logger.info(`✅ Transformed CSV written to: ${finalOutputPath}`);
    logger.info(`   Rows processed: ${lines.length - 1}`);
    logger.info(`   Values transformed: ${transformedCount}`);

    // Separate logs
    const transformedLogs = logs.filter(log => log.mappingFound);
    const unmappedLogs = logs.filter(log => !log.mappingFound && log.originalValue !== '' && log.originalValue !== null);

    return {
      outputPath: finalOutputPath,
      totalRows: lines.length - 1,
      transformedFields: transformedCount,
      unmappedValues: unmappedLogs,
      transformedValues: transformedLogs,
      backupPath
    };
  }

  /**
   * Check if field should be processed based on filters
   */
  private shouldProcessField(fieldName: string): boolean {
    const normalized = fieldName.trim().toLowerCase();

    // Exclude filter
    if (this.excludeFields && this.excludeFields.includes(normalized)) {
      return false;
    }

    // Only filter
    if (this.onlyFields && !this.onlyFields.includes(normalized)) {
      return false;
    }

    return true;
  }

  /**
   * Find primary key column (for row identification)
   */
  private findPrimaryKeyColumn(headers: string[]): number {
    const primaryKeyPatterns = [
      'partyid',
      'id',
      'accelins_partyid',
      'partymasterid',
      'accelins_partymasterid',
      'primarykey'
    ];

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i].toLowerCase().trim();
      if (primaryKeyPatterns.some(pattern => header.includes(pattern))) {
        return i;
      }
    }

    return -1; // No primary key found
  }

  /**
   * Parse CSV line (handles quoted values, commas, etc.)
   */
  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    values.push(current);

    return values;
  }

  /**
   * Format values as CSV line (with proper escaping)
   */
  private formatCsvLine(values: string[]): string {
    return values.map(value => {
      const strValue = value === null || value === undefined ? '' : String(value);
      
      // Escape if contains comma, quote, or newline
      if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
        return `"${strValue.replace(/"/g, '""')}"`;
      }
      
      return strValue;
    }).join(',');
  }

  /**
   * Create backup of original file
   */
  private createBackup(inputPath: string): string {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const base = path.basename(inputPath, ext);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const backupPath = path.join(dir, `${base}_${timestamp}_backup${ext}`);

    fs.copyFileSync(inputPath, backupPath);
    return backupPath;
  }

  /**
   * Generate output path from input path
   */
  private generateOutputPath(inputPath: string): string {
    const dir = path.dirname(inputPath);
    const ext = path.extname(inputPath);
    const base = path.basename(inputPath, ext);
    return path.join(dir, `${base}_salesforce_ready${ext}`);
  }
}
