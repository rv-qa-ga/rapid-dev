/**
 * SQL Server Data Validation Helpers
 * Provides utilities for validating data that flows from Salesforce/Dynamics into SQL Server
 */

import { SqlServerClient, QueryResult } from '../../client/SqlServerClient';
import { logger } from '../../../utils/logger';

export interface WaitForRecordOptions {
  timeoutMs?: number; // Maximum time to wait (default: 30000)
  intervalMs?: number; // Polling interval (default: 1000)
  database?: string; // Logical database name
}

export interface FieldComparison {
  sourceField: string; // Field name in source system (Salesforce/Dynamics)
  sqlColumn: string; // Column name in SQL table
  transform?: (value: any) => any; // Optional transformation function
}

export interface CountComparisonOptions {
  database?: string; // Logical database name
  tolerance?: number; // Allowed difference in counts (default: 0)
}

/**
 * Wait for a record to appear in SQL Server (useful for eventual consistency)
 * @param client SQL Server client
 * @param table Table name
 * @param whereClause WHERE clause (without WHERE keyword, use parameterized queries)
 * @param params Query parameters
 * @param options Wait options
 */
export async function waitForRecord(
  client: SqlServerClient,
  table: string,
  whereClause: string,
  params?: Record<string, any>,
  options?: WaitForRecordOptions
): Promise<any> {
  const timeoutMs = options?.timeoutMs || 30000;
  const intervalMs = options?.intervalMs || 1000;
  const startTime = Date.now();

  logger.info(`Waiting for record in table ${table} with condition: ${whereClause}`);

  while (Date.now() - startTime < timeoutMs) {
    const sql = `SELECT TOP 1 * FROM ${table} WHERE ${whereClause}`;
    const result = await client.queryOne(sql, params, { database: options?.database });

    if (result) {
      logger.info(`Record found in table ${table} after ${Date.now() - startTime}ms`);
      return result;
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timeout waiting for record in table ${table} with condition: ${whereClause} (timeout: ${timeoutMs}ms)`
  );
}

/**
 * Assert that the count of records in SQL matches the expected count
 * @param client SQL Server client
 * @param expectedCount Expected count from source system
 * @param table SQL table name
 * @param whereClause WHERE clause (optional)
 * @param params Query parameters
 * @param options Comparison options
 */
export async function assertCountMatches(
  client: SqlServerClient,
  expectedCount: number,
  table: string,
  whereClause?: string,
  params?: Record<string, any>,
  options?: CountComparisonOptions
): Promise<void> {
  let sql = `SELECT COUNT(*) AS count FROM ${table}`;
  if (whereClause) {
    sql += ` WHERE ${whereClause}`;
  }

  logger.info(`Comparing count for table ${table}. Expected: ${expectedCount}`);

  const result = await client.queryOne<{ count: number }>(sql, params, {
    database: options?.database,
  });

  if (!result) {
    throw new Error(`Failed to get count from table ${table}`);
  }

  const actualCount = result.count;
  const tolerance = options?.tolerance || 0;
  const difference = Math.abs(actualCount - expectedCount);

  logger.info(`Actual count: ${actualCount}, Expected: ${expectedCount}, Difference: ${difference}`);

  if (difference > tolerance) {
    throw new Error(
      `Count mismatch for table ${table}. Expected: ${expectedCount}, Actual: ${actualCount}, Difference: ${difference} (tolerance: ${tolerance})`
    );
  }
}

/**
 * Assert that specific fields match between source record and SQL row
 * @param expected Source record (from Salesforce/Dynamics)
 * @param actual SQL row
 * @param fieldMappings Field-to-column mappings
 */
export function assertFieldsMatch(
  expected: Record<string, any>,
  actual: Record<string, any>,
  fieldMappings: FieldComparison[]
): void {
  const mismatches: string[] = [];

  for (const mapping of fieldMappings) {
    const sourceValue = expected[mapping.sourceField];
    let expectedValue = sourceValue;

    // Apply transformation if provided
    if (mapping.transform && sourceValue !== undefined && sourceValue !== null) {
      expectedValue = mapping.transform(sourceValue);
    }

    const actualValue = actual[mapping.sqlColumn];

    // Compare values (handle null/undefined)
    if (expectedValue !== actualValue) {
      // Handle case-insensitive string comparison
      if (
        typeof expectedValue === 'string' &&
        typeof actualValue === 'string' &&
        expectedValue.toLowerCase() === actualValue.toLowerCase()
      ) {
        continue; // Match (case-insensitive)
      }

      // Handle date comparison (within 1 second tolerance)
      if (expectedValue instanceof Date && actualValue instanceof Date) {
        const diff = Math.abs(expectedValue.getTime() - actualValue.getTime());
        if (diff < 1000) {
          continue; // Match (within 1 second)
        }
      }

      mismatches.push(
        `${mapping.sourceField} -> ${mapping.sqlColumn}: expected "${expectedValue}", got "${actualValue}"`
      );
    }
  }

  if (mismatches.length > 0) {
    throw new Error(`Field mismatch detected:\n${mismatches.join('\n')}`);
  }

  logger.info(`All ${fieldMappings.length} fields matched successfully`);
}

/**
 * Compare a source record (Salesforce/Dynamics) with SQL Server data
 * @param client SQL Server client
 * @param sourceRecord Source record from Salesforce/Dynamics
 * @param table SQL table name
 * @param whereClause WHERE clause to find matching record
 * @param params Query parameters
 * @param fieldMappings Field-to-column mappings
 * @param options Query options
 */
export async function compareSourceWithSql(
  client: SqlServerClient,
  sourceRecord: Record<string, any>,
  table: string,
  whereClause: string,
  params?: Record<string, any>,
  fieldMappings?: FieldComparison[],
  options?: { database?: string }
): Promise<void> {
  logger.info(`Comparing source record with SQL table ${table}`);

  const sql = `SELECT TOP 1 * FROM ${table} WHERE ${whereClause}`;
  const sqlRow = await client.queryOne(sql, params, { database: options?.database });

  if (!sqlRow) {
    throw new Error(`No matching record found in table ${table} with condition: ${whereClause}`);
  }

  if (fieldMappings && fieldMappings.length > 0) {
    assertFieldsMatch(sourceRecord, sqlRow as Record<string, any>, fieldMappings);
  } else {
    // If no mappings provided, compare all fields that exist in both
    logger.warn('No field mappings provided. Skipping field-level comparison.');
  }
}

/**
 * Wait for count to match expected value (useful for batch processing)
 * @param client SQL Server client
 * @param expectedCount Expected count
 * @param table SQL table name
 * @param whereClause WHERE clause (optional)
 * @param params Query parameters
 * @param options Wait and comparison options
 */
export async function waitForCountMatch(
  client: SqlServerClient,
  expectedCount: number,
  table: string,
  whereClause?: string,
  params?: Record<string, any>,
  options?: WaitForRecordOptions & CountComparisonOptions
): Promise<void> {
  const timeoutMs = options?.timeoutMs || 30000;
  const intervalMs = options?.intervalMs || 1000;
  const startTime = Date.now();

  logger.info(`Waiting for count to match ${expectedCount} in table ${table}`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      await assertCountMatches(client, expectedCount, table, whereClause, params, options);
      logger.info(`Count matched after ${Date.now() - startTime}ms`);
      return;
    } catch (error: any) {
      // Continue waiting if count doesn't match yet
      if (Date.now() - startTime >= timeoutMs) {
        throw error; // Re-throw if timeout reached
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error(
    `Timeout waiting for count to match ${expectedCount} in table ${table} (timeout: ${timeoutMs}ms)`
  );
}

