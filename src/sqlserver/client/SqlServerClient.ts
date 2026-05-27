/**
 * SQL Server Database Client
 * Provides a clean abstraction for executing queries against SQL Server databases
 * Supports multiple databases on the same server instance
 */

import * as sql from 'mssql';
import { config } from '../../config/config';
import { logger } from '../../utils/logger';
import { SqlServerAuth } from '../../utils/sqlserver-auth';
import * as fs from 'fs';
import * as path from 'path';

export interface QueryOptions {
  database?: string; // Logical database name (e.g., "Reporting", "ODS")
  timeout?: number; // Query timeout in milliseconds
  retries?: number; // Number of retry attempts on failure
}

export interface QueryResult<T = any> {
  recordset: T[];
  rowsAffected: number[];
  returnValue?: any;
}

// Extended config type to support Azure AD authentication
interface ExtendedSqlConfig {
  server: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  options?: {
    encrypt?: boolean;
    trustServerCertificate?: boolean;
    enableArithAbort?: boolean;
  };
  pool?: {
    max?: number;
    min?: number;
    idleTimeoutMillis?: number;
  };
  requestTimeout?: number;
  authentication?: {
    type: string;
    options: {
      clientId: string;
      clientSecret: string;
      tenantId: string;
    };
  };
}

/**
 * SQL Server Client
 * Handles connections and query execution for SQL Server databases
 */
export class SqlServerClient {
  private connectionPool: sql.ConnectionPool | null = null;
  private sqlConfig: ExtendedSqlConfig;
  private currentDatabase: string = 'master';
  private databases: Map<string, string> = new Map();
  private useAzureAD: boolean = false;
  private azureADConfig: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
  } | null = null;

  constructor() {
    const sqlConfigFromEnv = config.getSqlServerConfig();
    const envName = config.getEnvironment();
    
    // Check for Azure AD authentication (preferred method).
    // Lloyd's QA often reuses the Dataverse SPN for Azure SQL (`database.windows.net`); allow D365_* when SQLSERVER_* unset.
    const tenantId =
      sqlConfigFromEnv.tenantId || process.env.SQLSERVER_TENANT_ID || process.env.D365_TENANT_ID;
    const clientId =
      sqlConfigFromEnv.clientId || process.env.SQLSERVER_CLIENT_ID || process.env.D365_CLIENT_ID;
    const clientSecret =
      sqlConfigFromEnv.clientSecret ||
      process.env.SQLSERVER_CLIENT_SECRET ||
      process.env.D365_CLIENT_SECRET;

    // Check for legacy SQL Server authentication
    const user = sqlConfigFromEnv.user || process.env.SQLSERVER_USER;
    const password = sqlConfigFromEnv.password || process.env.SQLSERVER_PASSWORD;

    // Determine authentication method
    if (tenantId && clientId && clientSecret) {
      // Use Azure AD authentication
      this.useAzureAD = true;
      this.azureADConfig = {
        tenantId,
        clientId,
        clientSecret,
      };
      logger.info('Using Azure AD (Microsoft Entra) authentication for SQL Server');
    } else if (user && password) {
      // Use legacy SQL Server authentication
      this.useAzureAD = false;
      logger.warn('Using legacy SQL Server authentication. Consider migrating to Azure AD authentication.');
    } else {
      // No valid authentication method found
      throw new Error(
        `SQL Server authentication not configured. Please set either:\n` +
        `  Azure AD (recommended): SQLSERVER_TENANT_ID, SQLSERVER_CLIENT_ID, SQLSERVER_CLIENT_SECRET\n` +
        `    (or reuse Dynamics QA SPN: D365_TENANT_ID, D365_CLIENT_ID, D365_CLIENT_SECRET)\n` +
        `  Legacy SQL Auth: SQLSERVER_USER, SQLSERVER_PASSWORD\n` +
        `  in src/config/env/.env.${envName} (or exported as environment variables)`
      );
    }

    const serverHost = (sqlConfigFromEnv.host || '').trim();
    if (!serverHost || serverHost.includes('your-sql-server')) {
      throw new Error(
        `SQL Server host is not configured. Set SQLSERVER_HOST (and SQLSERVER_DEFAULT_DB for Mule PROCESS_TRACKER), ` +
          `or AZURE_SQL_DB_DEV_SERVER / AZURE_SQL_DB_DEV_DATABASE in .env.${envName}.`
      );
    }

    this.currentDatabase = sqlConfigFromEnv.defaultDatabase || 'master';

    // Build base connection config
    this.sqlConfig = {
      server: serverHost,
      port: sqlConfigFromEnv.port || 1433,
      database: this.currentDatabase,
      options: {
        encrypt: sqlConfigFromEnv.options?.encrypt !== false, // Default to true
        trustServerCertificate: sqlConfigFromEnv.options?.trustServerCertificate || false,
        enableArithAbort: sqlConfigFromEnv.options?.enableArithAbort !== false, // Default to true
      },
      pool: {
        max: 10,
        min: 0,
        idleTimeoutMillis: 30000,
      },
      requestTimeout: config.getTimeouts().api,
    };

    // Add authentication configuration
    if (this.useAzureAD && this.azureADConfig) {
      // Azure AD authentication configuration
      this.sqlConfig.authentication = {
        type: 'azure-active-directory-service-principal-secret',
        options: {
          clientId: this.azureADConfig.clientId,
          clientSecret: this.azureADConfig.clientSecret,
          tenantId: this.azureADConfig.tenantId,
        },
      };
    } else {
      // Legacy SQL Server authentication
      this.sqlConfig.user = user;
      this.sqlConfig.password = password;
    }

    // Load database mappings
    this.loadDatabaseMappings();
  }

  /**
   * Load database name mappings from config file
   */
  private loadDatabaseMappings(): void {
    // Path from compiled JS: src/sqlserver/client -> src/sqlserver/config
    const mappingPath = path.resolve(__dirname, '..', 'config', 'databases.json');
    
    if (!fs.existsSync(mappingPath)) {
      logger.warn(`Database mapping file not found at ${mappingPath}. Using direct database names.`);
      return;
    }

    try {
      const mappingData = fs.readFileSync(mappingPath, 'utf-8');
      const mappings = JSON.parse(mappingData);
      
      if (mappings.databases) {
        Object.entries(mappings.databases).forEach(([logicalName, dbInfo]: [string, any]) => {
          this.databases.set(logicalName, dbInfo.name);
          logger.debug(`Mapped logical database "${logicalName}" to "${dbInfo.name}"`);
        });
      }
    } catch (error: any) {
      logger.warn(`Failed to load database mappings: ${error.message}`);
    }
  }

  /**
   * Get actual database name from logical name
   */
  private getDatabaseName(logicalName?: string): string {
    if (!logicalName) {
      return this.currentDatabase;
    }

    // Check if it's a logical name (mapped)
    if (this.databases.has(logicalName)) {
      return this.databases.get(logicalName)!;
    }

    // Assume it's already an actual database name
    return logicalName;
  }

  /**
   * Get or create connection pool
   */
  private async getConnection(databaseName?: string): Promise<sql.ConnectionPool> {
    const targetDatabase = this.getDatabaseName(databaseName);
    
    // If pool exists and is connected, reuse it (but switch database if needed)
    if (this.connectionPool && this.connectionPool.connected) {
      // If database changed, we need a new connection
      if (this.currentDatabase !== targetDatabase) {
        await this.close();
      } else {
        return this.connectionPool;
      }
    }

    // For Azure AD, ensure we have a valid token before connecting
    if (this.useAzureAD) {
      try {
        // Get Azure AD access token (will cache and reuse if valid)
        await SqlServerAuth.getAccessToken();
      } catch (error: any) {
        logger.error(`Failed to get Azure AD token: ${error.message}`);
        throw new Error(`Azure AD authentication failed: ${error.message}`);
      }
    }

    // Create new connection pool with target database
    const connectionConfig = {
      ...this.sqlConfig,
      database: targetDatabase,
    };

    this.currentDatabase = targetDatabase;

    logger.debug(`Connecting to SQL Server: ${connectionConfig.server}:${connectionConfig.port}/${targetDatabase} (Auth: ${this.useAzureAD ? 'Azure AD' : 'SQL Server'})`);
    
    // Cast to any to handle extended config with Azure AD authentication
    this.connectionPool = new sql.ConnectionPool(connectionConfig as any);
    
    try {
      await this.connectionPool.connect();
      logger.info(`Connected to SQL Server database: ${targetDatabase} (${this.useAzureAD ? 'Azure AD' : 'SQL Server'} authentication)`);
    } catch (error: any) {
      logger.error(`Failed to connect to SQL Server: ${error.message}`);
      
      // Provide helpful error messages
      if (this.useAzureAD) {
        if (error.message.includes('Login failed') || error.message.includes('authentication')) {
          throw new Error(
            `SQL Server Azure AD connection failed. Please verify:\n` +
            `  - SQLSERVER_TENANT_ID, SQLSERVER_CLIENT_ID, SQLSERVER_CLIENT_SECRET are correct\n` +
            `  - Service principal has permissions to access SQL Server\n` +
            `  - SQL Server is configured for Azure AD authentication\n` +
            `  Original error: ${error.message}`
          );
        }
      }
      
      throw new Error(`SQL Server connection failed: ${error.message}`);
    }

    return this.connectionPool;
  }

  /**
   * Execute a query and return multiple rows
   * @param sqlQuery SQL query string (use parameterized queries)
   * @param params Query parameters (object with parameter names and values)
   * @param options Query options
   */
  async queryMany<T = any>(
    sqlQuery: string,
    params?: Record<string, any>,
    options?: QueryOptions
  ): Promise<QueryResult<T>> {
    logger.debug(`Executing query on database: ${options?.database || 'default'}`);
    logger.debug(`Query: ${sqlQuery.substring(0, 200)}${sqlQuery.length > 200 ? '...' : ''}`);
    if (params) {
      logger.debug(`Parameters: ${JSON.stringify(params)}`);
    }

    const pool = await this.getConnection(options?.database);
    const request = pool.request();

    // Add parameters if provided
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        // Determine SQL type based on value
        if (typeof value === 'number') {
          request.input(key, sql.Int, value);
        } else if (typeof value === 'boolean') {
          request.input(key, sql.Bit, value);
        } else if (value instanceof Date) {
          request.input(key, sql.DateTime, value);
        } else {
          request.input(key, sql.NVarChar, value);
        }
      });
    }

    // Set timeout if provided (cast to any to set timeout property)
    if (options?.timeout) {
      (request as any).timeout = options.timeout;
    }

    try {
      const result = await request.query(sqlQuery);
      const recordset = result.recordset ?? [];
      const rowsAffected = result.rowsAffected ?? [];
      logger.debug(`Query returned ${recordset.length} rows`);
      return {
        recordset: recordset as T[],
        rowsAffected,
      };
    } catch (error: any) {
      logger.error(`Query execution failed: ${error.message}`);
      logger.error(`Query: ${sqlQuery}`);
      if (params) {
        logger.error(`Parameters: ${JSON.stringify(params)}`);
      }
      throw new Error(`SQL query failed: ${error.message}`);
    }
  }

  /**
   * Execute a query and return a single row (or null)
   * @param sqlQuery SQL query string (use parameterized queries)
   * @param params Query parameters
   * @param options Query options
   */
  async queryOne<T = any>(
    sqlQuery: string,
    params?: Record<string, any>,
    options?: QueryOptions
  ): Promise<T | null> {
    const result = await this.queryMany<T>(sqlQuery, params, options);
    return result.recordset.length > 0 ? result.recordset[0] : null;
  }

  /**
   * Execute a non-query statement (INSERT, UPDATE, DELETE, etc.)
   * @param sqlQuery SQL statement
   * @param params Query parameters
   * @param options Query options
   */
  async execute(
    sqlQuery: string,
    params?: Record<string, any>,
    options?: QueryOptions
  ): Promise<{ rowsAffected: number[] }> {
    logger.debug(`Executing statement on database: ${options?.database || 'default'}`);
    logger.debug(`Statement: ${sqlQuery.substring(0, 200)}${sqlQuery.length > 200 ? '...' : ''}`);
    if (params) {
      logger.debug(`Parameters: ${JSON.stringify(params)}`);
    }

    const result = await this.queryMany(sqlQuery, params, options);
    return {
      rowsAffected: result.rowsAffected,
    };
  }

  /**
   * Get a client instance for a specific database
   * Returns a wrapper that automatically uses the specified database
   */
  getClientForDatabase(databaseName: string): {
    queryMany: <T = any>(sql: string, params?: Record<string, any>, options?: Omit<QueryOptions, 'database'>) => Promise<QueryResult<T>>;
    queryOne: <T = any>(sql: string, params?: Record<string, any>, options?: Omit<QueryOptions, 'database'>) => Promise<T | null>;
    execute: (sql: string, params?: Record<string, any>, options?: Omit<QueryOptions, 'database'>) => Promise<{ rowsAffected: number[] }>;
  } {
    return {
      queryMany: <T = any>(sql: string, params?: Record<string, any>, options?: Omit<QueryOptions, 'database'>) => {
        return this.queryMany<T>(sql, params, { ...options, database: databaseName });
      },
      queryOne: <T = any>(sql: string, params?: Record<string, any>, options?: Omit<QueryOptions, 'database'>) => {
        return this.queryOne<T>(sql, params, { ...options, database: databaseName });
      },
      execute: (sql: string, params?: Record<string, any>, options?: Omit<QueryOptions, 'database'>) => {
        return this.execute(sql, params, { ...options, database: databaseName });
      },
    };
  }

  /**
   * Test connection to SQL Server
   */
  async testConnection(databaseName?: string): Promise<boolean> {
    try {
      const pool = await this.getConnection(databaseName);
      await pool.request().query('SELECT 1 AS test');
      logger.info('SQL Server connection test successful');
      return true;
    } catch (error: any) {
      logger.error(`SQL Server connection test failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Close connection pool
   */
  async close(): Promise<void> {
    if (this.connectionPool && this.connectionPool.connected) {
      await this.connectionPool.close();
      logger.info('SQL Server connection closed');
    }
    this.connectionPool = null;
  }
}

