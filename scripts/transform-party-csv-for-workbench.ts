/**
 * Transform Party CSV for Workbench Import
 * 
 * This script transforms Dataverse Party CSV exports by decoding coded values
 * into Salesforce-compatible picklist values using PicklistValueMappings.xlsx.
 * 
 * Usage:
 *   ts-node scripts/transform-party-csv-for-workbench.ts --input-csv <path> --mapping-xlsx <path>
 *   ts-node scripts/transform-party-csv-for-workbench.ts --source dataverse --mapping-xlsx <path>
 * 
 * Options:
 *   --input-csv <path>          Input CSV file path (required for csv mode)
 *   --source <csv|dataverse>    Data source: csv (default) or dataverse
 *   --mapping-xlsx <path>       Path to PicklistValueMappings.xlsx (required)
 *   --sheet <name>              Sheet name (default: "party migration")
 *   --output-csv <path>         Output CSV path (optional, auto-generated if not provided)
 *   --log <path>                Log file path (optional)
 *   --strict                    Fail if unmapped coded values exist
 *   --dry-run                   Don't write output, only produce log
 *   --only-fields <fields>      Comma-separated list of fields to transform
 *   --exclude-fields <fields>   Comma-separated list of fields to exclude
 *   --no-backup                 Don't create backup of original CSV
 */

import * as path from 'path';
import * as fs from 'fs';
import { PicklistMappingRepository } from '../src/utils/picklist-mapping-repository';
import { CsvTransformer, TransformationResult } from '../src/utils/csv-transformer';
import { logger } from '../src/utils/logger';
import { SqlServerClient } from '../src/sqlserver/client/SqlServerClient';

interface CliOptions {
  inputCsv?: string;
  source: 'csv' | 'dataverse';
  mappingXlsx: string;
  sheet: string;
  outputCsv?: string;
  logPath?: string;
  strict: boolean;
  dryRun: boolean;
  onlyFields?: string[];
  excludeFields?: string[];
  createBackup: boolean;
  // Dataverse options
  environment?: string;
  recordLimit?: number;
  database?: string;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const options: CliOptions = {
    source: 'csv',
    mappingXlsx: '',
    sheet: 'party migration',
    strict: false,
    dryRun: false,
    createBackup: true
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const nextArg = args[i + 1];

    switch (arg) {
      case '--input-csv':
        if (nextArg && !nextArg.startsWith('--')) {
          options.inputCsv = nextArg;
          i++;
        }
        break;

      case '--source':
        if (nextArg && !nextArg.startsWith('--')) {
          options.source = nextArg as 'csv' | 'dataverse';
          i++;
        }
        break;

      case '--mapping-xlsx':
        if (nextArg && !nextArg.startsWith('--')) {
          options.mappingXlsx = nextArg;
          i++;
        }
        break;

      case '--sheet':
        if (nextArg && !nextArg.startsWith('--')) {
          options.sheet = nextArg;
          i++;
        }
        break;

      case '--output-csv':
        if (nextArg && !nextArg.startsWith('--')) {
          options.outputCsv = nextArg;
          i++;
        }
        break;

      case '--log':
        if (nextArg && !nextArg.startsWith('--')) {
          options.logPath = nextArg;
          i++;
        }
        break;

      case '--strict':
        options.strict = true;
        break;

      case '--dry-run':
        options.dryRun = true;
        break;

      case '--only-fields':
        if (nextArg && !nextArg.startsWith('--')) {
          options.onlyFields = nextArg.split(',').map(f => f.trim());
          i++;
        }
        break;

      case '--exclude-fields':
        if (nextArg && !nextArg.startsWith('--')) {
          options.excludeFields = nextArg.split(',').map(f => f.trim());
          i++;
        }
        break;

      case '--no-backup':
        options.createBackup = false;
        break;

      case '--environment':
        if (nextArg && !nextArg.startsWith('--')) {
          options.environment = nextArg;
          i++;
        }
        break;

      case '--record-limit':
        if (nextArg && !nextArg.startsWith('--')) {
          options.recordLimit = parseInt(nextArg, 10);
          i++;
        }
        break;

      case '--database':
        if (nextArg && !nextArg.startsWith('--')) {
          options.database = nextArg;
          i++;
        }
        break;

      case '--help':
      case '-h':
        printUsage();
        process.exit(0);
        break;
    }
  }

  return options;
}

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
Transform Party CSV for Workbench Import
========================================

This script transforms Dataverse Party CSV exports by decoding coded values
into Salesforce-compatible picklist values using PicklistValueMappings.xlsx.

Usage:
  ts-node scripts/transform-party-csv-for-workbench.ts [options]

Required Options:
  --mapping-xlsx <path>       Path to PicklistValueMappings.xlsx (default: data/excel/PicklistValueMappings.xlsx)

Data Source (choose one):
  --input-csv <path>          Input CSV file path (for csv mode)
  --source dataverse          Fetch data from Dataverse database

Optional Options:
  --sheet <name>              Sheet name in mapping Excel (default: "party migration")
  --output-csv <path>         Output CSV path (auto-generated if not provided)
  --log <path>                Log file path (auto-generated if not provided)
  --strict                    Fail if unmapped coded values exist
  --dry-run                   Don't write output, only produce log
  --only-fields <fields>      Comma-separated list of fields to transform
  --exclude-fields <fields>   Comma-separated list of fields to exclude
  --no-backup                 Don't create backup of original CSV

Dataverse Options (when --source dataverse):
  --environment <env>         Environment name (default: QATEST2)
  --record-limit <number>     Limit number of records to fetch
  --database <name>           Database name (default: D365Lake)

Examples:
  # Transform existing CSV (uses default mapping file from data/excel/)
  ts-node scripts/transform-party-csv-for-workbench.ts \\
    --input-csv data/excel/party_extract.csv

  # Transform with custom mapping file
  ts-node scripts/transform-party-csv-for-workbench.ts \\
    --input-csv data/excel/party_extract.csv \\
    --mapping-xlsx data/excel/PicklistValueMappings.xlsx

  # Fetch from Dataverse and transform
  ts-node scripts/transform-party-csv-for-workbench.ts \\
    --source dataverse \\
    --environment QATEST2 \\
    --record-limit 100

  # Dry run to see what would be transformed
  ts-node scripts/transform-party-csv-for-workbench.ts \\
    --input-csv data/excel/party_extract.csv \\
    --dry-run

  # Transform only specific fields
  ts-node scripts/transform-party-csv-for-workbench.ts \\
    --input-csv data/excel/party_extract.csv \\
    --only-fields "statecode,statuscode"
`);
}

/**
 * Fetch data from Dataverse and export to CSV
 */
async function fetchFromDataverse(
  environment: string = 'QATEST2',
  recordLimit?: number,
  database?: string
): Promise<string> {
  logger.info(`📊 Fetching data from Dynamics ${environment} database...`);

  const outputDir = path.join(process.cwd(), 'data', 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
  const outputPath = path.join(outputDir, `${environment}PartyTable${timestamp}.csv`);

  const query = buildPartyQuery(recordLimit);

  let sqlClient: SqlServerClient | null = null;

  try {
    sqlClient = new SqlServerClient();
    logger.info('✅ Connected to SQL Server');

    logger.info(`Executing query${database ? ` on database: ${database}` : ''}...`);
    const result = await sqlClient.queryMany(query, undefined, { database });

    if (result.recordset.length === 0) {
      throw new Error('No data returned from query');
    }

    logger.info(`✅ Fetched ${result.recordset.length} records`);

    // Export to CSV
    const columns = Object.keys(result.recordset[0]);
    const csvLines: string[] = [columns.join(',')];

    // Sort by accelins_partymasterid
    const sortedRows = [...result.recordset].sort((a: any, b: any) => {
      const aId = a.accelins_partymasterid || '';
      const bId = b.accelins_partymasterid || '';
      return String(aId).localeCompare(String(bId));
    });

    for (const row of sortedRows) {
      const csvRow = columns.map(col => {
        const value = row[col];
        if (value === null || value === undefined) {
          return '';
        }
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
      });
      csvLines.push(csvRow.join(','));
    }

    fs.writeFileSync(outputPath, csvLines.join('\n'), 'utf-8');
    logger.info(`✅ Exported to: ${outputPath}`);

    return outputPath;
  } catch (error: any) {
    logger.error(`❌ Error fetching data: ${error.message}`);
    throw error;
  } finally {
    if (sqlClient) {
      await sqlClient.close();
    }
  }
}

/**
 * Build SQL query for Party data
 */
function buildPartyQuery(recordLimit?: number): string {
  const topClause = recordLimit ? `TOP(${recordLimit})` : '';
  
  return `
SELECT ${topClause}
    statecode,
    accelins_name,
    accelins_partyid,
    createdon,
    createdby,
    modifiedon,
    modifiedby,
    ownerid,
    statuscode,
    accelins_partymasterid,
    accelins_partytype,
    accelins_member_previous_known_name,
    accelins_member_short_name,
    accelins_addressline1,
    accelins_addressline2,
    accelins_city,
    accelins_country,
    accelins_postal_code,
    accelins_state,
    accelins_datasource,
    accelins_affiliate_nonaffiliate,
    accelins_functional_currency,
    accelins_admittednonadmitted,
    accelins_mgaownership,
    accelins_datasourceclaims,
    accelins_claimsproductionperiodeffectivefrom,
    accelins_writtenaccountingperiodeffectivefrom,
    accelins_memberstartdate,
    accelins_memberdiscontinueddate,
    CONCAT(accelins_addressline1, ' ', accelins_addressline2) AS accelins_full_address
FROM dbo.accelins_party
ORDER BY accelins_partymasterid ASC;
`;
}

/**
 * Write transformation log to file
 */
function writeLog(result: TransformationResult, logPath?: string): string {
  const logData = {
    timestamp: new Date().toISOString(),
    summary: {
      totalRows: result.totalRows,
      transformedFields: result.transformedFields,
      unmappedCount: result.unmappedValues.length,
      transformedCount: result.transformedValues.length
    },
    unmappedValues: result.unmappedValues,
    transformedValues: result.transformedValues.slice(0, 100), // Limit to first 100 for readability
    mappedFields: result.transformedValues
      .map(log => log.fieldName)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort()
  };

  const logContent = JSON.stringify(logData, null, 2);

  if (!logPath) {
    const logDir = path.join(process.cwd(), 'data', 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    logPath = path.join(logDir, `party_transform_${timestamp}.json`);
  }

  fs.writeFileSync(logPath, logContent, 'utf-8');
  logger.info(`📄 Transformation log written to: ${logPath}`);

  return logPath;
}

/**
 * Main execution
 */
async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║   Party CSV Transformation for Workbench Import             ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  const options = parseArgs();

  // Set default mapping file path if not provided
  if (!options.mappingXlsx) {
    const defaultMappingPath = path.join(process.cwd(), 'data', 'excel', 'PicklistValueMappings.xlsx');
    if (fs.existsSync(defaultMappingPath)) {
      options.mappingXlsx = defaultMappingPath;
      console.log(`📋 Using default mapping file: ${defaultMappingPath}`);
    } else {
      console.error('❌ Error: --mapping-xlsx is required');
      console.error(`   Default location not found: ${defaultMappingPath}`);
      printUsage();
      process.exit(1);
    }
  }

  if (options.source === 'csv' && !options.inputCsv) {
    console.error('❌ Error: --input-csv is required when --source is csv');
    printUsage();
    process.exit(1);
  }

  try {
    // Step 1: Get input CSV (either from file or Dataverse)
    let inputCsvPath: string;

    if (options.source === 'dataverse') {
      console.log('📊 Fetching data from Dataverse...');
      inputCsvPath = await fetchFromDataverse(
        options.environment || 'QATEST2',
        options.recordLimit,
        options.database || 'D365Lake'
      );
    } else {
      if (!fs.existsSync(options.inputCsv!)) {
        throw new Error(`Input CSV file not found: ${options.inputCsv}`);
      }
      inputCsvPath = path.resolve(options.inputCsv!);
    }

    console.log(`📁 Input CSV: ${inputCsvPath}`);

    // Step 2: Load picklist mappings
    console.log('\n📖 Loading picklist mappings...');
    const mappingRepo = new PicklistMappingRepository();
    await mappingRepo.loadMappings(
      path.resolve(options.mappingXlsx),
      options.sheet
    );

    const mappedFields = mappingRepo.getMappedFields();
    console.log(`✅ Loaded mappings for ${mappedFields.length} fields`);
    if (mappedFields.length > 0) {
      console.log(`   Fields: ${mappedFields.slice(0, 10).join(', ')}${mappedFields.length > 10 ? '...' : ''}`);
    }

    // Step 3: Transform CSV
    console.log('\n🔄 Transforming CSV...');
    const transformer = new CsvTransformer(mappingRepo);
    
    if (options.onlyFields || options.excludeFields) {
      transformer.setFieldFilters(options.onlyFields, options.excludeFields);
      if (options.onlyFields) {
        console.log(`   Only transforming: ${options.onlyFields.join(', ')}`);
      }
      if (options.excludeFields) {
        console.log(`   Excluding: ${options.excludeFields.join(', ')}`);
      }
    }

    let result: TransformationResult;

    if (options.dryRun) {
      console.log('🔍 DRY RUN MODE - No output file will be created');
      // For dry run, we'll still transform but use a temp output path
      const tempOutput = path.join(path.dirname(inputCsvPath), 'temp_dry_run_output.csv');
      result = await transformer.transformCsv(
        inputCsvPath,
        tempOutput,
        false, // No backup in dry run
        options.strict
      );
      // Delete temp file
      if (fs.existsSync(tempOutput)) {
        fs.unlinkSync(tempOutput);
      }
    } else {
      result = await transformer.transformCsv(
        inputCsvPath,
        options.outputCsv ? path.resolve(options.outputCsv) : undefined,
        options.createBackup,
        options.strict
      );
    }

    // Step 4: Write log
    console.log('\n📄 Generating transformation log...');
    const logPath = writeLog(result, options.logPath);

    // Step 5: Print summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('TRANSFORMATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`Total rows processed: ${result.totalRows}`);
    console.log(`Values transformed: ${result.transformedFields}`);
    console.log(`Unmapped values: ${result.unmappedValues.length}`);
    
    if (result.unmappedValues.length > 0) {
      console.log('\n⚠️  Unmapped values found:');
      const unmappedByField = new Map<string, number>();
      result.unmappedValues.forEach(log => {
        const count = unmappedByField.get(log.fieldName) || 0;
        unmappedByField.set(log.fieldName, count + 1);
      });
      
      Array.from(unmappedByField.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([field, count]) => {
          console.log(`   ${field}: ${count} unmapped value(s)`);
        });
      
      if (unmappedByField.size > 10) {
        console.log(`   ... and ${unmappedByField.size - 10} more fields`);
      }
    }

    if (!options.dryRun) {
      console.log(`\n✅ Output CSV: ${result.outputPath}`);
      if (result.backupPath) {
        console.log(`📦 Backup: ${result.backupPath}`);
      }
    }
    console.log(`📄 Log file: ${logPath}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (options.strict && result.unmappedValues.length > 0) {
      console.error('❌ Strict mode: Transformation failed due to unmapped values');
      process.exit(1);
    }

    console.log('✅ Transformation complete!');
    if (!options.dryRun) {
      console.log(`\n💡 Next step: Use the transformed CSV in Workbench Field Mapping Automation`);
      console.log(`   Run: npm run workbench:map-fields "${result.outputPath}"`);
    }

  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

export { main, fetchFromDataverse };
