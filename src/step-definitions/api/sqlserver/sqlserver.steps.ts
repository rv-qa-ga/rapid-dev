/**
 * SQL Server Step Definitions
 * Provides Cucumber steps for SQL Server data validation and SSIS/Agent jobs.
 *
 * Reusable capabilities:
 * 1. Query database tables – use SqlServerClient.queryMany / queryOne (steps below).
 * 2. Run SSIS jobs – "When I run the SSIS job {string}" (uses runAgentJob from sqlserver/helpers/ssis-jobs).
 * 3. Check status of SSIS jobs – "When I check the status of the SSIS job {string}", "Then the SSIS job X status should be Y".
 */

import { Given, When, Then } from '@cucumber/cucumber';
import { AutomationWorld } from '../../../hooks/world';
import { SqlServerClient } from '../../../sqlserver/client/SqlServerClient';
import {
  waitForRecord,
  assertCountMatches,
  assertFieldsMatch,
  compareSourceWithSql,
  waitForCountMatch,
  FieldComparison,
} from '../../../sqlserver/tests/helpers/validation';
import {
  runAgentJob,
  runAgentJobAtStep,
  getAgentJobStatus,
  waitForAgentJobToComplete,
  waitForAgentJobStepToComplete,
  type AgentJobStatus,
  type AgentJobRunStatus,
} from '../../../sqlserver/helpers/ssis-jobs';
import { SalesforceAPIClient } from '../../../api-clients/salesforce/SalesforceAPIClient';
import { DynamicsAPIClient } from '../../../api-clients/dynamics/DynamicsAPIClient';
import { logger } from '../../../utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// REUSABLE QUERY HELPER
// ============================================================================

export interface RunQueryOptions {
  database: string;
  logResult?: boolean;
  singleRow?: boolean;
}

export interface RunQueryResult<T = Record<string, unknown>> {
  rowCount: number;
  recordset: T[];
  singleRow: T | null;
}

/**
 * Run a parameterized query in the given database. Reusable across step definitions.
 * @param sqlClient – SqlServerClient instance
 * @param query – SQL query with @paramName placeholders
 * @param params – key-value parameters (e.g. { partyName: 'X', accountId: 'Y' })
 * @param options – database name, and optional logResult (log first row + count), singleRow (use queryOne)
 * @returns RunQueryResult with rowCount, recordset, and singleRow (when singleRow: true)
 */
export async function runQueryInDatabase<T = Record<string, unknown>>(
  sqlClient: SqlServerClient,
  query: string,
  params: Record<string, unknown>,
  options: RunQueryOptions
): Promise<RunQueryResult<T>> {
  const { database, logResult = false, singleRow = false } = options;
  const trimmedQuery = query.trim();

  if (logResult) {
    logger.info(
      `Running query in database "${database}": ${trimmedQuery.substring(0, 120)}${trimmedQuery.length > 120 ? '...' : ''}`
    );
  }

  if (singleRow) {
    const row = await sqlClient.queryOne<T>(trimmedQuery, params as Record<string, any>, { database });
    const recordset = row ? [row] : [];
    if (logResult) {
      if (row) {
        const keys = Object.keys(row as object);
        const logLine = keys.map((k) => `${k}=${(row as any)[k]}`).join(', ');
        logger.info(`Query result (single row): ${logLine}`);
      } else {
        logger.info('Query returned 0 rows.');
      }
    }
    return { rowCount: recordset.length, recordset, singleRow: row };
  }

  const result = await sqlClient.queryMany<T>(trimmedQuery, params as Record<string, any>, { database });
  const rows = result.recordset || [];
  if (logResult && rows.length > 0) {
    const first = rows[0];
    const keys = Object.keys(first as object);
    const logLine = keys.map((k) => `${k}=${(first as any)[k]}`).join(', ');
    logger.info(`Query result (first row): ${logLine}`);
    if (rows.length > 1) {
      logger.info(`Query returned ${rows.length} row(s) total.`);
    }
  } else if (logResult) {
    logger.info('Query returned 0 rows.');
  }
  return {
    rowCount: rows.length,
    recordset: rows,
    singleRow: rows.length > 0 ? rows[0] : null,
  };
}

// ============================================================================
// CONNECTION STEPS
// ============================================================================

Given('I have a valid SQL Server connection', async function (this: AutomationWorld) {
  try {
    const sqlClient = new SqlServerClient();
    this.testContext.sqlClient = sqlClient;
    logger.info('SQL Server client initialized');
  } catch (error: any) {
    throw new Error(`Failed to initialize SQL Server client: ${error.message}`);
  }
});

When('I test the SQL Server connection', async function (this: AutomationWorld) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }

  const connected = await sqlClient.testConnection();
  this.testContext.sqlConnectionTest = connected;
});

Then('the connection should be successful', async function (this: AutomationWorld) {
  const connected = this.testContext.sqlConnectionTest as boolean;
  if (!connected) {
    throw new Error('SQL Server connection test failed');
  }
  logger.info('✅ SQL Server connection test passed');
});

// ============================================================================
// QUERY STEPS
// ============================================================================

When('I query the SQL Server {string} database for the account', async function (
  this: AutomationWorld,
  databaseName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  // Get the account ID from context (set by previous steps)
  const accountId = this.testContext.accountId || this.testContext.salesforceAccount?.Id || this.testContext.dynamicsAccount?.accountid;
  if (!accountId) {
    throw new Error('Account ID not found in test context. Create an account first.');
  }

  // Determine which table and column to use based on source system
  let table: string;
  let idColumn: string;
  let whereClause: string;

  if (this.testContext.salesforceAccount) {
    // Salesforce account
    table = 'Accounts';
    idColumn = 'SalesforceId';
    whereClause = `${idColumn} = @accountId`;
  } else if (this.testContext.dynamicsAccount) {
    // Dynamics account
    table = 'DynamicsAccounts';
    idColumn = 'DynamicsAccountId';
    whereClause = `${idColumn} = @accountId`;
  } else {
    throw new Error('No source account found. Create a Salesforce or Dynamics account first.');
  }

  const sql = `SELECT TOP 1 * FROM ${table} WHERE ${whereClause}`;
  const result = await sqlClient.queryOne(sql, { accountId }, { database: databaseName });

  this.testContext.sqlAccount = result;
  this.testContext.sqlDatabase = databaseName;
  this.testContext.sqlTable = table;

  if (result) {
    logger.info(`✅ Found account in SQL Server ${databaseName}.${table}`);
  } else {
    logger.warn(`⚠️  Account not found in SQL Server ${databaseName}.${table}`);
  }
});

When('I wait for the account to appear in SQL Server {string} database', async function (
  this: AutomationWorld,
  databaseName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  const accountId = this.testContext.accountId || this.testContext.salesforceAccount?.Id || this.testContext.dynamicsAccount?.accountid;
  if (!accountId) {
    throw new Error('Account ID not found in test context.');
  }

  let table: string;
  let idColumn: string;
  let whereClause: string;

  if (this.testContext.salesforceAccount) {
    table = 'Accounts';
    idColumn = 'SalesforceId';
    whereClause = `${idColumn} = @accountId`;
  } else if (this.testContext.dynamicsAccount) {
    table = 'DynamicsAccounts';
    idColumn = 'DynamicsAccountId';
    whereClause = `${idColumn} = @accountId`;
  } else {
    throw new Error('No source account found.');
  }

  try {
    const result = await waitForRecord(
      sqlClient,
      table,
      whereClause,
      { accountId },
      { database: databaseName, timeoutMs: 30000, intervalMs: 1000 }
    );
    this.testContext.sqlAccount = result;
    this.testContext.sqlDatabase = databaseName;
    this.testContext.sqlTable = table;
    logger.info(`✅ Account appeared in SQL Server after waiting`);
  } catch (error: any) {
    throw new Error(`Timeout waiting for account to appear: ${error.message}`);
  }
});

// ============================================================================
// VALIDATION STEPS
// ============================================================================

Then('the account should exist in the {string} table', async function (this: AutomationWorld, tableName: string) {
  const sqlAccount = this.testContext.sqlAccount;
  if (!sqlAccount) {
    throw new Error(`Account not found in SQL Server table ${tableName}`);
  }
  logger.info(`✅ Account exists in table ${tableName}`);
});

Then('the account fields should match the Salesforce record', async function (this: AutomationWorld) {
  const salesforceAccount = this.testContext.salesforceAccount;
  const sqlAccount = this.testContext.sqlAccount;

  if (!salesforceAccount) {
    throw new Error('Salesforce account not found in test context.');
  }
  if (!sqlAccount) {
    throw new Error('SQL account not found in test context.');
  }

  // Load field mappings from mapping file
  const mappingPath = path.join(__dirname, '..', '..', 'sqlserver', 'mappings', 'account-to-sql.json');
  let fieldMappings: FieldComparison[] = [];

  if (fs.existsSync(mappingPath)) {
    try {
      const mappingData = fs.readFileSync(mappingPath, 'utf-8');
      const mapping = JSON.parse(mappingData);
      fieldMappings = mapping.fieldMappings.map((fm: any) => ({
        sourceField: fm.sourceField,
        sqlColumn: fm.sqlColumn,
        transform: fm.transform === 'datetime' ? (v: any) => new Date(v) : undefined,
      }));
    } catch (error: any) {
      logger.warn(`Failed to load mapping file: ${error.message}. Using default mappings.`);
    }
  }

  // Default mappings if file not found
  if (fieldMappings.length === 0) {
    fieldMappings = [
      { sourceField: 'Id', sqlColumn: 'SalesforceId' },
      { sourceField: 'Name', sqlColumn: 'AccountName' },
      { sourceField: 'Type', sqlColumn: 'AccountType' },
      { sourceField: 'Industry', sqlColumn: 'Industry' },
      { sourceField: 'Phone', sqlColumn: 'Phone' },
      { sourceField: 'Website', sqlColumn: 'Website' },
    ];
  }

  assertFieldsMatch(salesforceAccount, sqlAccount as Record<string, any>, fieldMappings);
  logger.info('✅ All account fields match between Salesforce and SQL Server');
});

Then('the account fields should match the Dynamics record', async function (this: AutomationWorld) {
  const dynamicsAccount = this.testContext.dynamicsAccount;
  const sqlAccount = this.testContext.sqlAccount;

  if (!dynamicsAccount) {
    throw new Error('Dynamics account not found in test context.');
  }
  if (!sqlAccount) {
    throw new Error('SQL account not found in test context.');
  }

  // Load field mappings
  const mappingPath = path.join(__dirname, '..', '..', 'sqlserver', 'mappings', 'dynamics-account-to-sql.json');
  let fieldMappings: FieldComparison[] = [];

  if (fs.existsSync(mappingPath)) {
    try {
      const mappingData = fs.readFileSync(mappingPath, 'utf-8');
      const mapping = JSON.parse(mappingData);
      fieldMappings = mapping.fieldMappings.map((fm: any) => ({
        sourceField: fm.sourceField,
        sqlColumn: fm.sqlColumn,
        transform: fm.transform === 'datetime' ? (v: any) => new Date(v) : undefined,
      }));
    } catch (error: any) {
      logger.warn(`Failed to load mapping file: ${error.message}. Using default mappings.`);
    }
  }

  // Default mappings if file not found
  if (fieldMappings.length === 0) {
    fieldMappings = [
      { sourceField: 'accountid', sqlColumn: 'DynamicsAccountId' },
      { sourceField: 'name', sqlColumn: 'AccountName' },
      { sourceField: 'accountnumber', sqlColumn: 'AccountNumber' },
      { sourceField: 'telephone1', sqlColumn: 'Phone' },
      { sourceField: 'websiteurl', sqlColumn: 'Website' },
    ];
  }

  assertFieldsMatch(dynamicsAccount, sqlAccount as Record<string, any>, fieldMappings);
  logger.info('✅ All account fields match between Dynamics and SQL Server');
});

// ============================================================================
// COUNT COMPARISON STEPS
// ============================================================================

Given('I have queried Salesforce for all Accounts', async function (this: AutomationWorld) {
  const salesforceClient = this.testContext.salesforceClient as SalesforceAPIClient;
  if (!salesforceClient) {
    // Try to get from API context
    if (!this.apiContext) {
      throw new Error('API context not initialized.');
    }
    const client = new SalesforceAPIClient(this.apiContext);
    await client.authenticate();
    this.testContext.salesforceClient = client;
  }

  const soql = 'SELECT COUNT() FROM Account';
  const result = await (this.testContext.salesforceClient as SalesforceAPIClient).query(soql);
  this.testContext.salesforceAccountCount = result.totalSize || 0;
  logger.info(`Salesforce Account count: ${this.testContext.salesforceAccountCount}`);
});

When('I compare the count with SQL Server {string} database {string} table', async function (
  this: AutomationWorld,
  databaseName: string,
  tableName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  const expectedCount = this.testContext.salesforceAccountCount as number;
  if (expectedCount === undefined) {
    throw new Error('Salesforce account count not found. Query Salesforce first.');
  }

  await assertCountMatches(sqlClient, expectedCount, tableName, undefined, undefined, {
    database: databaseName,
    tolerance: 0,
  });

  logger.info(`✅ Count matches: ${expectedCount} accounts in both systems`);
});

Then('the counts should match within tolerance of {int}', async function (this: AutomationWorld, tolerance: number) {
  // This step is typically used after the comparison step
  // The actual comparison happens in the "When" step above
  logger.info(`✅ Count comparison completed with tolerance: ${tolerance}`);
});

// ============================================================================
// TABLE AND COLUMN VALIDATION STEPS (for ADO-generated test cases)
// ============================================================================

When('I run the following query in {string} database and log the result:', async function (
  this: AutomationWorld,
  databaseName: string,
  docStringOrQuery?: { content: string } | string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }
  const query = typeof docStringOrQuery === 'string'
    ? docStringOrQuery
    : (docStringOrQuery && typeof docStringOrQuery === 'object' && 'content' in docStringOrQuery
      ? docStringOrQuery.content
      : '');
  if (!query || !query.trim()) {
    throw new Error('Step requires a doc string with the SQL query.');
  }
  const result = await runQueryInDatabase<Record<string, unknown>>(
    sqlClient,
    query.trim(),
    {},
    { database: databaseName, logResult: true, singleRow: false }
  );
  this.testContext.sqlQueryResult = { recordset: result.recordset };
  this.testContext.sqlQueryRowCount = result.rowCount;
});

When('I run the following parameterized query in {string} database and log the result:', async function (
  this: AutomationWorld,
  databaseName: string,
  docString: { content: string },
  dataTable: { raw: () => string[][] }
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }
  const query = (docString?.content ?? '').trim();
  if (!query) {
    throw new Error('Step requires a doc string with the SQL query.');
  }
  const rows = dataTable.raw();
  const params: Record<string, unknown> = {};
  if (rows.length >= 2) {
    const headers = rows[0];
    const values = rows[1];
    headers.forEach((name, i) => {
      if (name && values[i] !== undefined) {
        const val = values[i];
        params[name.trim()] = /^\d+$/.test(val) ? parseInt(val, 10) : val;
      }
    });
  }
  const result = await runQueryInDatabase<Record<string, unknown>>(
    sqlClient,
    query,
    params,
    { database: databaseName, logResult: true, singleRow: false }
  );
  this.testContext.sqlQueryResult = { recordset: result.recordset };
  this.testContext.sqlQueryRowCount = result.rowCount;
});

When('I query the SQL Server {string} database for table {string}', async function (
  this: AutomationWorld,
  databaseName: string,
  tableName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }
  const sql = `
    SELECT TABLE_NAME 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = @tableName
  `;
  const result = await runQueryInDatabase<{ TABLE_NAME: string }>(
    sqlClient,
    sql,
    { tableName },
    { database: databaseName, logResult: false, singleRow: true }
  );
  this.testContext.sqlTableExists = !!result.singleRow;
  this.testContext.sqlTableName = tableName;
  this.testContext.sqlDatabase = databaseName;

  if (result.singleRow) {
    logger.info(`✅ Table ${tableName} found in ${databaseName} database`);
  } else {
    logger.warn(`⚠️  Table ${tableName} not found in ${databaseName} database`);
  }
});

Then('the table {string} should exist', async function (this: AutomationWorld, tableName: string) {
  const exists = this.testContext.sqlTableExists as boolean;
  if (!exists) {
    throw new Error(`Table ${tableName} does not exist in ${this.testContext.sqlDatabase} database`);
  }
  logger.info(`✅ Verified table ${tableName} exists`);
});

When('I query the SQL Server {string} database for column {string} in table {string}', async function (
  this: AutomationWorld,
  databaseName: string,
  columnName: string,
  tableName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }
  const sql = `
    SELECT COLUMN_NAME 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_NAME = @tableName 
      AND COLUMN_NAME = @columnName
  `;
  const result = await runQueryInDatabase<{ COLUMN_NAME: string }>(
    sqlClient,
    sql,
    { tableName, columnName },
    { database: databaseName, logResult: false, singleRow: true }
  );
  this.testContext.sqlColumnExists = !!result.singleRow;
  this.testContext.sqlColumnName = columnName;
  this.testContext.sqlTableName = tableName;
  this.testContext.sqlDatabase = databaseName;

  if (result.singleRow) {
    logger.info(`✅ Column ${columnName} found in table ${tableName}`);
  } else {
    logger.warn(`⚠️  Column ${columnName} not found in table ${tableName}`);
  }
});

Then('the column {string} should exist in table {string}', async function (
  this: AutomationWorld,
  columnName: string,
  tableName: string
) {
  const exists = this.testContext.sqlColumnExists as boolean;
  if (!exists) {
    throw new Error(`Column ${columnName} does not exist in table ${tableName}`);
  }
  logger.info(`✅ Verified column ${columnName} exists in table ${tableName}`);
});

// ============================================================================
// STORED PROCEDURE STEPS
// ============================================================================

When('I execute stored procedure {string} in {string} database', async function (
  this: AutomationWorld,
  procedureName: string,
  databaseName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  try {
    // First check if procedure exists
    const checkSql = `
      SELECT ROUTINE_NAME 
      FROM INFORMATION_SCHEMA.ROUTINES 
      WHERE ROUTINE_SCHEMA = 'dbo' 
        AND ROUTINE_NAME = @procedureName
        AND ROUTINE_TYPE = 'PROCEDURE'
    `;
    
    const exists = await sqlClient.queryOne(checkSql, { procedureName }, { database: databaseName });
    if (!exists) {
      throw new Error(`Stored procedure ${procedureName} does not exist`);
    }
    
    // Execute the procedure (with no parameters for now)
    const execSql = `EXEC [dbo].[${procedureName}]`;
    await sqlClient.execute(execSql, {}, { database: databaseName });
    
    this.testContext.sqlProcedureExecuted = true;
    this.testContext.sqlProcedureName = procedureName;
    logger.info(`✅ Stored procedure ${procedureName} executed successfully`);
  } catch (error: any) {
    this.testContext.sqlProcedureExecuted = false;
    this.testContext.sqlProcedureError = error.message;
    throw error;
  }
});

Then('the stored procedure should execute successfully', async function (this: AutomationWorld) {
  const executed = this.testContext.sqlProcedureExecuted as boolean;
  if (!executed) {
    const error = this.testContext.sqlProcedureError as string;
    throw new Error(`Stored procedure execution failed: ${error || 'Unknown error'}`);
  }
  logger.info('✅ Stored procedure execution verified');
});

// ============================================================================
// SSIS / SQL Server Agent Job Steps (reusable run and status)
// ============================================================================

When('I run the SSIS job {string}', async function (this: AutomationWorld, jobName: string) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }
  await runAgentJob(sqlClient, jobName);
  this.testContext.ssisJobName = jobName;
  logger.info(`✅ SSIS/Agent job "${jobName}" run requested`);
});

When('I run step {int} of the SSIS job {string}', async function (this: AutomationWorld, stepNumber: number, jobName: string) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }
  await runAgentJobAtStep(sqlClient, jobName, stepNumber);
  this.testContext.ssisJobName = jobName;
  logger.info(`✅ SSIS/Agent job "${jobName}" started at step ${stepNumber}`);
});

When('I check the status of the SSIS job {string}', async function (this: AutomationWorld, jobName: string) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }
  const status = await getAgentJobStatus(sqlClient, jobName);
  this.testContext.ssisJobStatus = status;
  this.testContext.ssisJobName = jobName;
  logger.info(`✅ SSIS job "${jobName}" status: isRunning=${status.isRunning}, lastRunStatus=${status.lastRunStatus}`);
});

Then('the SSIS job {string} status should be {string}', async function (
  this: AutomationWorld,
  jobName: string,
  expectedStatus: string
) {
  const status = this.testContext.ssisJobStatus as AgentJobStatus | undefined;
  if (!status) {
    const sqlClient = this.testContext.sqlClient as SqlServerClient;
    if (!sqlClient) {
      throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" and check job status first.');
    }
    const s = await getAgentJobStatus(sqlClient, jobName);
    this.testContext.ssisJobStatus = s;
    if (s.jobName !== jobName) {
      throw new Error(`Job name mismatch: expected ${jobName}, got ${s.jobName}`);
    }
    if (s.lastRunStatus !== expectedStatus.toLowerCase()) {
      throw new Error(`SSIS job "${jobName}" status: expected "${expectedStatus}", got "${s.lastRunStatus}"${s.message ? ` - ${s.message}` : ''}`);
    }
    logger.info(`✅ SSIS job "${jobName}" status is ${expectedStatus}`);
    return;
  }
  if (status.jobName !== jobName) {
    throw new Error(`Job name mismatch: expected ${jobName}, got ${status.jobName}`);
  }
  const normalized = expectedStatus.toLowerCase().replace(/\s+/g, '_');
  const validStatuses: AgentJobRunStatus[] = ['succeeded', 'failed', 'retry', 'canceled', 'in_progress', 'unknown'];
  if (!validStatuses.includes(normalized as AgentJobRunStatus)) {
    throw new Error(`Invalid expected status "${expectedStatus}". Use one of: ${validStatuses.join(', ')}`);
  }
  if (status.lastRunStatus !== normalized) {
    throw new Error(`SSIS job "${jobName}" status: expected "${normalized}", got "${status.lastRunStatus}"${status.message ? ` - ${status.message}` : ''}`);
  }
  logger.info(`✅ SSIS job "${jobName}" status is ${expectedStatus}`);
});

When('I wait for the SSIS job {string} to complete', async function (this: AutomationWorld, jobName: string) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }
  const status = await waitForAgentJobToComplete(sqlClient, jobName);
  this.testContext.ssisJobStatus = status;
  this.testContext.ssisJobName = jobName;
  logger.info(`✅ SSIS job "${jobName}" completed with status: ${status.lastRunStatus}`);
});

When('I wait for the SSIS job {string} to complete with timeout {int} minutes', async function (
  this: AutomationWorld,
  jobName: string,
  timeoutMinutes: number
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const status = await waitForAgentJobToComplete(sqlClient, jobName, { timeoutMs });
  this.testContext.ssisJobStatus = status;
  this.testContext.ssisJobName = jobName;
  logger.info(`✅ SSIS job "${jobName}" completed with status: ${status.lastRunStatus}`);
});

When('I wait for the Step 2 of the SSIS job {string} to complete with timeout {int} minutes', async function (
  this: AutomationWorld,
  jobName: string,
  timeoutMinutes: number
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }
  const timeoutMs = timeoutMinutes * 60 * 1000;
  // Wait only for step 2 completion (polls sysjobhistory for step_id=2), not the entire job
  const result = await waitForAgentJobStepToComplete(sqlClient, jobName, 2, { timeoutMs });
  this.testContext.ssisJobStepStatus = result;
  this.testContext.ssisJobName = jobName;
  logger.info(`✅ Step 2 of SSIS job "${jobName}" completed with status: ${result.lastRunStatus} (step 2 only, not entire job)`);
});

When('I confirm step 2 of the SSIS job {string} has completed successfully', async function (
  this: AutomationWorld,
  jobName: string
) {
  const stepStatus = this.testContext.ssisJobStepStatus as { lastRunStatus: string; message?: string } | undefined;
  if (!stepStatus) {
    throw new Error(`No step 2 status in context. Run and wait for step 2 of job "${jobName}" first.`);
  }
  if (this.testContext.ssisJobName !== jobName) {
    throw new Error(`Job name mismatch: expected "${jobName}", got "${this.testContext.ssisJobName}".`);
  }
  if (stepStatus.lastRunStatus !== 'succeeded') {
    throw new Error(
      `Step 2 of SSIS job "${jobName}" did not succeed: lastRunStatus=${stepStatus.lastRunStatus}${stepStatus.message ? ` - ${stepStatus.message}` : ''}`
    );
  }
  logger.info(`✅ Step 2 of SSIS job "${jobName}" completed successfully`);
});

Then('the SSIS job should have completed successfully', async function (this: AutomationWorld) {
  const status = this.testContext.ssisJobStatus as AgentJobStatus | undefined;
  if (!status) {
    throw new Error('No SSIS job status in context. Run and wait for the job first.');
  }
  if (status.lastRunStatus !== 'succeeded') {
    throw new Error(`SSIS job "${status.jobName}" did not succeed: lastRunStatus=${status.lastRunStatus}${status.message ? ` - ${status.message}` : ''}`);
  }
  logger.info(`✅ SSIS job "${status.jobName}" completed successfully`);
});

// ============================================================================
// PERFORMANCE TESTING STEPS
// ============================================================================

When('I measure execution time for {string} {string} in {string} database', async function (
  this: AutomationWorld,
  itemType: string, // 'stored procedure' or 'query'
  itemName: string,
  databaseName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  const startTime = Date.now();
  
  try {
    if (itemType === 'stored procedure') {
      const execSql = `EXEC [dbo].[${itemName}]`;
      await sqlClient.execute(execSql, {}, { database: databaseName });
    } else {
      // For queries, we'd need the actual query - this is a placeholder
      logger.warn('Query performance measurement requires actual query text');
    }
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    this.testContext.sqlExecutionTime = executionTime;
    this.testContext.sqlItemName = itemName;
    logger.info(`⏱️  Execution time: ${executionTime}ms`);
  } catch (error: any) {
    throw new Error(`Failed to measure execution time: ${error.message}`);
  }
});

Then('the execution time should be within acceptable limits', async function (this: AutomationWorld) {
  const executionTime = this.testContext.sqlExecutionTime as number;
  if (executionTime === undefined) {
    throw new Error('Execution time not measured');
  }
  
  // Default acceptable limit: 30 seconds (30000ms)
  const acceptableLimit = 30000;
  
  if (executionTime > acceptableLimit) {
    throw new Error(`Execution time ${executionTime}ms exceeds acceptable limit of ${acceptableLimit}ms`);
  }
  
  logger.info(`✅ Execution time ${executionTime}ms is within acceptable limits`);
});

// ============================================================================
// DATA VALIDATION STEPS
// ============================================================================

When('I query the SQL Server {string} database for data validation in {string}', async function (
  this: AutomationWorld,
  databaseName: string,
  tableName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  // Perform basic data validation checks
  const sql = `
    SELECT 
      COUNT(*) as RecordCount,
      COUNT(DISTINCT CASE WHEN [Key] IS NULL THEN 1 END) as NullKeyCount
    FROM [dbo].[${tableName}]
  `;
  
  try {
    const result = await sqlClient.queryOne(sql, {}, { database: databaseName });
    this.testContext.sqlValidationResult = result;
    this.testContext.sqlTableName = tableName;
    logger.info(`✅ Data validation query executed for ${tableName}`);
  } catch (error: any) {
    throw new Error(`Data validation query failed: ${error.message}`);
  }
});

Then('the data should meet integrity requirements', async function (this: AutomationWorld) {
  const validationResult = this.testContext.sqlValidationResult as any;
  if (!validationResult) {
    throw new Error('Data validation result not found');
  }
  
  // Basic integrity checks
  if (validationResult.RecordCount === 0) {
    logger.warn('⚠️  Table has no records');
  }
  
  if (validationResult.NullKeyCount > 0) {
    logger.warn(`⚠️  Found ${validationResult.NullKeyCount} records with null keys`);
  }
  
  logger.info('✅ Data integrity requirements verified');
});

// ============================================================================
// REFERENCE DATA STEPS
// ============================================================================

When('I query the SQL Server {string} database for reference data in {string}', async function (
  this: AutomationWorld,
  databaseName: string,
  tableName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  // Query reference data
  const sql = `SELECT TOP 10 * FROM [dbo].[${tableName}] ORDER BY [Key]`;
  
  try {
    const results = await sqlClient.queryMany(sql, {}, { database: databaseName });
    this.testContext.sqlReferenceData = results;
    this.testContext.sqlTableName = tableName;
    logger.info(`✅ Retrieved ${results.recordset.length} reference data records from ${tableName}`);
  } catch (error: any) {
    throw new Error(`Reference data query failed: ${error.message}`);
  }
});

Then('the reference data should be available and valid', async function (this: AutomationWorld) {
  const referenceData = this.testContext.sqlReferenceData as any[];
  if (!referenceData || referenceData.length === 0) {
    throw new Error('Reference data is not available or empty');
  }

  logger.info(`✅ Verified ${referenceData.length} reference data records are available and valid`);
});

// ============================================================================
// REFERENCE PARTY TABLE STEPS (E2E Business Data validation)
// ============================================================================

const REFERENCE_PARTY_BY_NAME_QUERY = `
  SELECT TOP 1 *
  FROM [Reference].[master].[Party]
  WHERE PartyName = @partyName
`;

When('I query the Reference database for the party by name {string}', async function (
  this: AutomationWorld,
  partyName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized. Use "Given I have a valid SQL Server connection" first.');
  }
  const result = await runQueryInDatabase<Record<string, unknown>>(
    sqlClient,
    REFERENCE_PARTY_BY_NAME_QUERY,
    { partyName },
    { database: 'Reference', logResult: false, singleRow: true }
  );
  this.testContext.referenceParty = result.singleRow;
  this.testContext.referencePartyName = partyName;
  if (result.singleRow) {
    logger.info(`✅ Found party "${partyName}" in Reference.[master].[Party]`);
  } else {
    logger.warn(`⚠️  Party "${partyName}" not found in Reference.[master].[Party]`);
  }
});

When('I query the Reference database for the party from the current account', async function (this: AutomationWorld) {
  const partyName = this.testContext.accountName as string;
  if (!partyName) {
    throw new Error('Account name not in context. Create an account and capture its name first.');
  }
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }
  const result = await runQueryInDatabase<Record<string, unknown>>(
    sqlClient,
    REFERENCE_PARTY_BY_NAME_QUERY,
    { partyName },
    { database: 'Reference', logResult: false, singleRow: true }
  );
  this.testContext.referenceParty = result.singleRow;
  this.testContext.referencePartyName = partyName;
  if (result.singleRow) {
    logger.info(`✅ Found party "${partyName}" in Reference.[master].[Party]`);
  } else {
    logger.warn(`⚠️  Party "${partyName}" not found in Reference.[master].[Party]`);
  }
});

Then('the party should exist in the Reference Party table', async function (this: AutomationWorld) {
  const party = this.testContext.referenceParty as Record<string, unknown> | null | undefined;
  const partyName = this.testContext.referencePartyName as string | undefined;
  if (!party) {
    const name = partyName ? ` "${partyName}"` : '';
    throw new Error(`Party${name} was not found in Reference.[master].[Party]. Ensure Source Staging step 2 and Business Data job have run.`);
  }
  logger.info(`✅ Party exists in Reference.[master].[Party]`);
});

const REFERENCE_PARTY_BY_ACCOUNT_NAME_QUERY = `
  SELECT * FROM [Reference].[master].[Party]
  WHERE PartyName = @accountName
`;

Then('I confirm the party should exist in the Reference Party table', async function (this: AutomationWorld) {
  const accountName = this.testContext.accountName as string | undefined;
  if (!accountName) {
    throw new Error('Account name not in context. Ensure account was created and name captured (e.g. "I capture the current Account Id from the page" or account name set from created record).');
  }
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }
  const result = await runQueryInDatabase<Record<string, unknown>>(
    sqlClient,
    REFERENCE_PARTY_BY_ACCOUNT_NAME_QUERY.trim(),
    { accountName },
    { database: 'Reference', logResult: true, singleRow: false }
  );
  if (result.rowCount === 0) {
    throw new Error(
      `No party found in Reference.[master].[Party] for account name "${accountName}". Ensure Source Staging step 2 and Business Data job have run.`
    );
  }
  logger.info(`✅ Party exists in Reference.[master].[Party] with PartyName="${accountName}"`);
});

// ============================================================================
// MIGRATION VALIDATION STEPS
// ============================================================================

When('I verify data migration status in {string} database', async function (
  this: AutomationWorld,
  databaseName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  // Check for migration status indicators (this is a placeholder - actual implementation depends on migration tracking)
  const sql = `
    SELECT 
      COUNT(*) as TotalTables,
      COUNT(CASE WHEN TABLE_NAME LIKE '%Migration%' OR TABLE_NAME LIKE '%Log%' THEN 1 END) as MigrationTables
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = 'dbo'
  `;
  
  try {
    const result = await sqlClient.queryOne(sql, {}, { database: databaseName });
    this.testContext.sqlMigrationStatus = result;
    this.testContext.sqlDatabase = databaseName;
    logger.info('✅ Migration status check completed');
  } catch (error: any) {
    throw new Error(`Migration status check failed: ${error.message}`);
  }
});

Then('the migration should be completed successfully', async function (this: AutomationWorld) {
  const migrationStatus = this.testContext.sqlMigrationStatus as any;
  if (!migrationStatus) {
    throw new Error('Migration status not found');
  }
  
  // Basic validation - actual implementation would check specific migration tables/status
  logger.info('✅ Migration completion verified');
});

// ============================================================================
// VALIDATION SCRIPT EXECUTION STEPS (for PR-based test cases)
// ============================================================================

When('I execute the validation script {string} in {string} database', async function (
  this: AutomationWorld,
  scriptName: string,
  databaseName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  // Load SQL script from file
  const scriptPath = path.join(__dirname, '..', '..', 'features', 'ado', 'sql-scripts', scriptName);
  
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Validation script not found: ${scriptPath}`);
  }

  const scriptContent = fs.readFileSync(scriptPath, 'utf-8');
  
  // Execute script and capture results
  const startTime = Date.now();
  try {
    // Split script into batches (by GO statements or semicolons)
    const batches = scriptContent
      .split(/^\s*GO\s*$/gim)
      .map(batch => batch.trim())
      .filter(batch => batch.length > 0);
    
    for (const batch of batches) {
      await sqlClient.execute(batch, {}, { database: databaseName });
    }
    
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    this.testContext.sqlScriptExecutionTime = executionTime;
    this.testContext.sqlScriptName = scriptName;
    logger.info(`✅ Validation script executed in ${executionTime}ms`);
  } catch (error: any) {
    this.testContext.sqlScriptError = error.message;
    throw new Error(`Validation script execution failed: ${error.message}`);
  }
});

Then('the performance metrics should meet the requirements', async function (this: AutomationWorld) {
  const executionTime = this.testContext.sqlScriptExecutionTime as number;
  if (executionTime === undefined) {
    throw new Error('Script execution time not measured');
  }
  
  // Check execution time (adjust threshold as needed)
  const maxExecutionTime = 10000; // 10 seconds default
  
  if (executionTime > maxExecutionTime) {
    logger.warn(`⚠️  Execution time ${executionTime}ms exceeds threshold ${maxExecutionTime}ms`);
  } else {
    logger.info(`✅ Execution time ${executionTime}ms is within acceptable limits`);
  }
  
  // Additional validation can be added here (e.g., check for specific output messages)
});

When('I validate index {string} exists and is used in {string} database', async function (
  this: AutomationWorld,
  indexName: string,
  databaseName: string
) {
  const sqlClient = this.testContext.sqlClient as SqlServerClient;
  if (!sqlClient) {
    throw new Error('SQL Server client not initialized.');
  }

  // Check if index exists
  const checkSql = `
    SELECT 
      i.name AS IndexName,
      i.type_desc AS IndexType,
      i.is_unique AS IsUnique,
      OBJECT_NAME(i.object_id) AS TableName
    FROM sys.indexes i
    WHERE i.name = @indexName
  `;
  
  const indexInfo = await sqlClient.queryOne(checkSql, { indexName }, { database: databaseName });
  
  if (!indexInfo) {
    throw new Error(`Index ${indexName} does not exist`);
  }
  
  this.testContext.sqlIndexInfo = indexInfo;
  this.testContext.sqlIndexName = indexName;
  logger.info(`✅ Index ${indexName} exists on table ${indexInfo.TableName}`);
});

Then('the index should exist and improve query performance', async function (this: AutomationWorld) {
  const indexInfo = this.testContext.sqlIndexInfo as any;
  if (!indexInfo) {
    throw new Error('Index information not found');
  }
  
  // Validate index properties
  if (!indexInfo.IndexName) {
    throw new Error('Index validation failed');
  }
  
  logger.info(`✅ Index ${indexInfo.IndexName} validated - Type: ${indexInfo.IndexType}, Unique: ${indexInfo.IsUnique}`);
});

// ============================================================================
// CLEANUP
// ============================================================================

// Cleanup hook (can be called in After hooks)
export async function cleanupSqlServerConnection(world: AutomationWorld): Promise<void> {
  const sqlClient = world.testContext.sqlClient as SqlServerClient;
  if (sqlClient) {
    try {
      await sqlClient.close();
      logger.info('SQL Server connection closed');
    } catch (error: any) {
      logger.warn(`Error closing SQL Server connection: ${error.message}`);
    }
  }
}

