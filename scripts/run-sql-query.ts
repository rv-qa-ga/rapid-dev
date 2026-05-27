/**
 * SQL Server Query Runner Script
 * Executes a SQL query and displays results in a formatted way
 * 
 * Usage:
 *   ts-node scripts/run-sql-query.ts "SELECT TOP(10) * FROM Reference.master.Party"
 *   ts-node scripts/run-sql-query.ts "SELECT * FROM Accounts WHERE Type = @type" --params '{"type":"Customer"}'
 *   ts-node scripts/run-sql-query.ts "SELECT COUNT(*) AS Count FROM Accounts" --database Reporting
 */

import { SqlServerClient } from '../src/sqlserver/client/SqlServerClient';
import { logger } from '../src/utils/logger';
import { config } from '../src/config/config';

async function runQuery() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let query = '';
  let database: string | undefined;
  let params: Record<string, any> | undefined;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--database=')) {
      database = arg.split('=')[1];
    } else if (arg.startsWith('--params=')) {
      try {
        params = JSON.parse(arg.split('=')[1]);
      } catch (error) {
        console.error('❌ Invalid JSON in --params argument');
        process.exit(1);
      }
    } else if (arg === '--database' && i + 1 < args.length) {
      database = args[i + 1];
      i++;
    } else if (arg === '--params' && i + 1 < args.length) {
      try {
        params = JSON.parse(args[i + 1]);
        i++;
      } catch (error) {
        console.error('❌ Invalid JSON in --params argument');
        process.exit(1);
      }
    } else if (!arg.startsWith('--')) {
      // Treat as query (if not already set)
      if (!query) {
        query = arg;
      }
    }
  }

  // If query is not provided as argument, try to get from stdin or show usage
  if (!query) {
    console.error('Usage: ts-node scripts/run-sql-query.ts "<query>" [options]');
    console.error('');
    console.error('Options:');
    console.error('  --database=<name>    Logical database name (e.g., Reporting, ODS)');
    console.error('  --params=<json>      Query parameters as JSON object');
    console.error('');
    console.error('Examples:');
    console.error('  ts-node scripts/run-sql-query.ts "SELECT TOP(10) * FROM Reference.master.Party"');
    console.error('  ts-node scripts/run-sql-query.ts "SELECT * FROM Accounts WHERE Type = @type" --params \'{"type":"Customer"}\'');
    console.error('  ts-node scripts/run-sql-query.ts "SELECT COUNT(*) AS Count FROM Accounts" --database Reporting');
    process.exit(1);
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SQL Server Query Runner');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Display configuration
  try {
    const sqlConfig = config.getSqlServerConfig();
    console.log('Configuration:');
    console.log(`  Environment: ${config.getEnvironment()}`);
    console.log(`  Host: ${sqlConfig.host}`);
    console.log(`  Database: ${database || sqlConfig.defaultDatabase || 'default'}`);
    if (params) {
      console.log(`  Parameters: ${JSON.stringify(params)}`);
    }
    console.log('');
  } catch (error: any) {
    console.error(`❌ Configuration error: ${error.message}`);
    process.exit(1);
  }

  let client: SqlServerClient | null = null;

  try {
    // Initialize client
    console.log('Connecting to SQL Server...');
    client = new SqlServerClient();
    console.log('✅ Connected\n');

    // Display query
    console.log('Query:');
    console.log(`  ${query}\n`);

    // Execute query
    console.log('Executing query...\n');
    const startTime = Date.now();
    
    const result = await client.queryMany(query, params, { database });
    
    const duration = Date.now() - startTime;

    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Results');
    console.log('═══════════════════════════════════════════════════════════════\n');
    
    if (result.recordset.length === 0) {
      console.log('No rows returned.\n');
    } else {
      console.log(`Rows returned: ${result.recordset.length}`);
      console.log(`Execution time: ${duration}ms\n`);
      
      // Get column names from first row
      const columns = Object.keys(result.recordset[0]);
      
      // Calculate column widths
      const columnWidths: Record<string, number> = {};
      columns.forEach(col => {
        columnWidths[col] = Math.max(
          col.length,
          ...result.recordset.map((row: any) => {
            const value = row[col];
            return value !== null && value !== undefined ? String(value).length : 4; // "null"
          })
        );
        // Cap at 50 characters for display
        columnWidths[col] = Math.min(columnWidths[col], 50);
      });

      // Print header
      const headerRow = columns.map(col => col.padEnd(columnWidths[col])).join(' | ');
      const separator = columns.map(col => '-'.repeat(columnWidths[col])).join('-|-');
      console.log(headerRow);
      console.log(separator);

      // Print rows
      result.recordset.forEach((row: any, index: number) => {
        const dataRow = columns.map(col => {
          const value = row[col];
          let displayValue = value === null || value === undefined ? 'null' : String(value);
          // Truncate long values
          if (displayValue.length > 50) {
            displayValue = displayValue.substring(0, 47) + '...';
          }
          return displayValue.padEnd(columnWidths[col]);
        }).join(' | ');
        console.log(dataRow);
        
        // Limit display to first 100 rows
        if (index >= 99) {
          console.log(`\n... (showing first 100 rows, total: ${result.recordset.length})`);
          return;
        }
      });
      
      console.log('');
    }

    // Display summary
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('Summary');
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log(`Total rows: ${result.recordset.length}`);
    console.log(`Rows affected: ${result.rowsAffected.join(', ')}`);
    console.log(`Execution time: ${duration}ms\n`);

    // Option to output as JSON
    if (result.recordset.length > 0 && result.recordset.length <= 100) {
      console.log('JSON Output:');
      console.log(JSON.stringify(result.recordset, null, 2));
      console.log('');
    }

  } catch (error: any) {
    console.error('\n═══════════════════════════════════════════════════════════════');
    console.error('❌ Query failed!');
    console.error('═══════════════════════════════════════════════════════════════\n');
    console.error(`Error: ${error.message}\n`);
    
    if (error.message.includes('Invalid object name')) {
      console.error('Possible issues:');
      console.error('  - Table or schema name is incorrect');
      console.error('  - Database name is incorrect');
      console.error('  - User does not have permissions to access the object\n');
    } else if (error.message.includes('Login failed') || error.message.includes('authentication')) {
      console.error('Authentication issue:');
      console.error('  - Verify Azure AD credentials are correct');
      console.error('  - Check if service principal has access to SQL Server');
      console.error('  - Ensure SQL Server is configured for Azure AD authentication\n');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Connection closed.\n');
    }
  }
}

// Run the query
runQuery().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

