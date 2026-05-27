/**
 * SQL Server Connectivity Test Script
 * Tests connection to SQL Server and runs a sample query
 * 
 * Usage:
 *   ts-node scripts/test-sql-connection.ts
 *   ts-node scripts/test-sql-connection.ts --database Reporting
 *   ts-node scripts/test-sql-connection.ts --query "SELECT @@VERSION AS Version"
 */

import { SqlServerClient } from '../src/sqlserver/client/SqlServerClient';
import { logger } from '../src/utils/logger';
import { config } from '../src/config/config';

async function testConnection() {
  const args = process.argv.slice(2);
  const databaseArg = args.find(arg => arg.startsWith('--database='));
  const queryArg = args.find(arg => arg.startsWith('--query='));
  const database = databaseArg ? databaseArg.split('=')[1] : undefined;
  const customQuery = queryArg ? queryArg.split('=')[1] : undefined;

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('SQL Server Connectivity Test');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Display configuration
  try {
    const sqlConfig = config.getSqlServerConfig();
    console.log('Configuration:');
    console.log(`  Environment: ${config.getEnvironment()}`);
    console.log(`  Host: ${sqlConfig.host}`);
    console.log(`  Port: ${sqlConfig.port || 1433}`);
    console.log(`  Default Database: ${sqlConfig.defaultDatabase || 'master'}`);
    
    // Show authentication method
    const hasAzureAD = !!(sqlConfig.tenantId || process.env.SQLSERVER_TENANT_ID);
    const hasLegacyAuth = !!(sqlConfig.user || process.env.SQLSERVER_USER);
    
    if (hasAzureAD) {
      console.log(`  Authentication: Azure AD (Microsoft Entra)`);
      console.log(`  Tenant ID: ${(sqlConfig.tenantId || process.env.SQLSERVER_TENANT_ID || '').substring(0, 8)}...`);
      console.log(`  Client ID: ${(sqlConfig.clientId || process.env.SQLSERVER_CLIENT_ID || '').substring(0, 10)}...`);
      console.log(`  Client Secret: ${sqlConfig.clientSecret || process.env.SQLSERVER_CLIENT_SECRET ? '***' : 'Not set'}`);
    } else if (hasLegacyAuth) {
      console.log(`  Authentication: SQL Server (Legacy)`);
      console.log(`  User: ${sqlConfig.user || process.env.SQLSERVER_USER || 'Not set'}`);
      console.log(`  Password: ${sqlConfig.password ? '***' : process.env.SQLSERVER_PASSWORD ? '***' : 'Not set'}`);
    } else {
      console.log(`  Authentication: Not configured`);
    }
    
    console.log(`  Target Database: ${database || sqlConfig.defaultDatabase || 'master'}`);
    console.log('');
  } catch (error: any) {
    console.error(`❌ Configuration error: ${error.message}`);
    console.error('\nPlease ensure:');
    console.error('  1. SQL Server config is added to src/config/env/<env>.json');
    console.error('  2. Environment variables are set in .env.<env> file');
    console.error('  3. Required: SQLSERVER_HOST, SQLSERVER_USER, SQLSERVER_PASSWORD');
    process.exit(1);
  }

  let client: SqlServerClient | null = null;

  try {
    // Initialize client
    console.log('Initializing SQL Server client...');
    client = new SqlServerClient();
    console.log('✅ Client initialized\n');

    // Test connection
    console.log('Testing connection...');
    const connected = await client.testConnection(database);
    
    if (!connected) {
      throw new Error('Connection test failed');
    }
    console.log('✅ Connection successful!\n');

    // Run sample queries
    if (customQuery) {
      console.log(`Running custom query: ${customQuery}\n`);
      const result = await client.queryMany(customQuery, undefined, { database });
      console.log('Results:');
      console.log(JSON.stringify(result.recordset, null, 2));
      console.log(`\nRows returned: ${result.recordset.length}`);
    } else {
      // Run default test queries
      console.log('Running test queries...\n');

      // Query 1: Server version
      console.log('1. Server Version:');
      const versionResult = await client.queryOne<{ Version: string }>(
        'SELECT @@VERSION AS Version',
        undefined,
        { database }
      );
      if (versionResult) {
        console.log(`   ${versionResult.Version.substring(0, 100)}...`);
      }
      console.log('');

      // Query 2: Current database
      console.log('2. Current Database:');
      const dbResult = await client.queryOne<{ CurrentDatabase: string }>(
        'SELECT DB_NAME() AS CurrentDatabase',
        undefined,
        { database }
      );
      if (dbResult) {
        console.log(`   ${dbResult.CurrentDatabase}`);
      }
      console.log('');

      // Query 3: Database list (if master database)
      if (!database || database === 'master' || database === config.getSqlServerConfig().defaultDatabase) {
        console.log('3. Available Databases:');
        const dbListResult = await client.queryMany<{ name: string }>(
          'SELECT name FROM sys.databases WHERE name NOT IN (\'master\', \'tempdb\', \'model\', \'msdb\') ORDER BY name',
          undefined,
          { database: 'master' }
        );
        if (dbListResult.recordset.length > 0) {
          dbListResult.recordset.forEach((db, index) => {
            console.log(`   ${index + 1}. ${db.name}`);
          });
        } else {
          console.log('   (No user databases found)');
        }
        console.log('');
      }

      // Query 4: Test parameterized query
      console.log('4. Testing Parameterized Query:');
      const paramResult = await client.queryOne<{ TestValue: number }>(
        'SELECT @value AS TestValue',
        { value: 42 },
        { database }
      );
      if (paramResult) {
        console.log(`   Parameterized query result: ${paramResult.TestValue}`);
      }
      console.log('');

      // Query 5: Check if Accounts table exists (if Reporting database)
      if (database === 'Reporting' || !database) {
        console.log('5. Checking for Accounts table:');
        const tableCheckResult = await client.queryOne<{ TableExists: number }>(
          `SELECT CASE WHEN EXISTS (
            SELECT * FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'Accounts'
          ) THEN 1 ELSE 0 END AS TableExists`,
          undefined,
          { database: 'Reporting' }
        );
        if (tableCheckResult && tableCheckResult.TableExists === 1) {
          const countResult = await client.queryOne<{ Count: number }>(
            'SELECT COUNT(*) AS Count FROM Accounts',
            undefined,
            { database: 'Reporting' }
          );
          console.log(`   ✅ Accounts table exists`);
          if (countResult) {
            console.log(`   Record count: ${countResult.Count}`);
          }
        } else {
          console.log('   ⚠️  Accounts table does not exist (this is OK if not set up yet)');
        }
        console.log('');
      }
    }

    console.log('═══════════════════════════════════════════════════════════════');
    console.log('✅ All tests passed!');
    console.log('═══════════════════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n═══════════════════════════════════════════════════════════════');
    console.error('❌ Test failed!');
    console.error('═══════════════════════════════════════════════════════════════\n');
    console.error(`Error: ${error.message}\n`);
    
    if (error.message.includes('SQLSERVER_TENANT_ID') || error.message.includes('SQLSERVER_CLIENT_ID') || error.message.includes('SQLSERVER_CLIENT_SECRET')) {
      console.error('Configuration Issue:');
      console.error('  Please set Azure AD credentials in your .env file:');
      console.error('    SQLSERVER_TENANT_ID');
      console.error('    SQLSERVER_CLIENT_ID');
      console.error('    SQLSERVER_CLIENT_SECRET');
      console.error(`  Expected location: src/config/env/.env.${config.getEnvironment()}\n`);
    } else if (error.message.includes('SQLSERVER_USER') || error.message.includes('SQLSERVER_PASSWORD')) {
      console.error('Configuration Issue:');
      console.error('  Please set SQLSERVER_USER and SQLSERVER_PASSWORD in your .env file');
      console.error('  (Note: Azure AD authentication is recommended instead)');
      console.error(`  Expected location: src/config/env/.env.${config.getEnvironment()}\n`);
    } else if (error.message.includes('connection') || error.message.includes('ECONNREFUSED')) {
      console.error('Connection Issue:');
      console.error('  - Verify SQL Server is running and accessible');
      console.error('  - Check SQLSERVER_HOST and SQLSERVER_PORT are correct');
      console.error('  - Verify firewall rules allow connections');
      console.error('  - Check SQL Server authentication mode (SQL Auth vs Windows Auth)\n');
    } else if (error.message.includes('Login failed')) {
      console.error('Authentication Issue:');
      console.error('  - Verify SQLSERVER_USER and SQLSERVER_PASSWORD are correct');
      console.error('  - Check if SQL Server authentication is enabled');
      console.error('  - Verify user has permissions to access the database\n');
    }
    
    process.exit(1);
  } finally {
    if (client) {
      await client.close();
      console.log('Connection closed.\n');
    }
  }
}

// Run the test
testConnection().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

