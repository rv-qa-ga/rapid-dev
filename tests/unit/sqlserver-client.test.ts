/**
 * Unit tests for SQL Server Client
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as mssql from 'mssql';
import { SqlServerClient } from '../../src/sqlserver/client/SqlServerClient';
import { config } from '../../src/config/config';

// Mock mssql — SqlServerClient uses `new sql.ConnectionPool(...)`; constructor must return a pool object
vi.mock('mssql', () => {
  function makePool(recordset: { id: number; name: string }[]) {
    return {
      connect: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      request: vi.fn().mockReturnValue({
        input: vi.fn().mockReturnThis(),
        query: vi.fn().mockResolvedValue({
          recordset,
          rowsAffected: [recordset.length > 0 ? 1 : 0],
        }),
        timeout: 30000,
      }),
      connected: true,
      config: {
        database: 'master',
      },
    };
  }

  const ConnectionPool = vi.fn(function ConnectionPool(_config: unknown) {
    return makePool([{ id: 1, name: 'Test' }]);
  });

  const Int = Symbol('sql.Int');
  const Bit = Symbol('sql.Bit');
  const DateTime = Symbol('sql.DateTime');
  const NVarChar = Symbol('sql.NVarChar');

  return {
    __esModule: true,
    ConnectionPool,
    Int,
    Bit,
    DateTime,
    NVarChar,
    default: { ConnectionPool, Int, Bit, DateTime, NVarChar },
  };
});

// Mock config
vi.mock('../../src/config/config', () => ({
  config: {
    getSqlServerConfig: vi.fn().mockReturnValue({
      host: 'localhost',
      port: 1433,
      user: 'testuser',
      password: 'testpass',
      defaultDatabase: 'master',
      options: {
        encrypt: true,
        trustServerCertificate: false,
        enableArithAbort: true,
      },
    }),
    getTimeouts: vi.fn().mockReturnValue({
      api: 30000,
    }),
    getEnvironment: vi.fn().mockReturnValue('qa'),
  },
}));

// Mock logger
vi.mock('../../src/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fs — SqlServerClient uses `import * as fs from 'fs'` (namespace), not default export
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(true),
    readFileSync: vi.fn().mockReturnValue(
      JSON.stringify({
        databases: {
          Reporting: { name: 'ReportingDB' },
          ODS: { name: 'ODS_DB' },
        },
      })
    ),
  };
});

describe('SqlServerClient', () => {
  let client: SqlServerClient;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();
  });

  afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      expect(() => {
        client = new SqlServerClient();
      }).not.toThrow();
    });

    it('should throw error if user is missing', () => {
      vi.mocked(config.getSqlServerConfig).mockReturnValueOnce({
        host: 'localhost',
        port: 1433,
        // user missing
        password: 'testpass',
      });

      process.env.SQLSERVER_USER = '';

      expect(() => {
        client = new SqlServerClient();
      }).toThrow('SQLSERVER_USER');
    });

    it('should throw error if password is missing', () => {
      vi.mocked(config.getSqlServerConfig).mockReturnValueOnce({
        host: 'localhost',
        port: 1433,
        user: 'testuser',
        // password missing
      });

      process.env.SQLSERVER_PASSWORD = '';

      expect(() => {
        client = new SqlServerClient();
      }).toThrow('SQLSERVER_PASSWORD');
    });
  });

  describe('queryMany', () => {
    beforeEach(() => {
      client = new SqlServerClient();
    });

    it('should execute query and return results', async () => {
      const result = await client.queryMany('SELECT * FROM TestTable');

      expect(result.recordset).toBeDefined();
      expect(result.recordset.length).toBeGreaterThan(0);
      expect(result.rowsAffected).toBeDefined();
    });

    it('should handle parameterized queries', async () => {
      const result = await client.queryMany('SELECT * FROM TestTable WHERE id = @id', {
        id: 1,
      });

      expect(result.recordset).toBeDefined();
    });

    it('should support database option', async () => {
      const result = await client.queryMany('SELECT * FROM TestTable', undefined, {
        database: 'Reporting',
      });

      expect(result.recordset).toBeDefined();
    });
  });

  describe('queryOne', () => {
    beforeEach(() => {
      client = new SqlServerClient();
    });

    it('should return first row or null', async () => {
      const result = await client.queryOne('SELECT * FROM TestTable WHERE id = @id', {
        id: 1,
      });

      expect(result).toBeDefined();
    });

    it('should return null when no rows found', async () => {
      function EmptyConnectionPool(_config: unknown) {
        return {
          connect: vi.fn().mockResolvedValue(undefined),
          close: vi.fn().mockResolvedValue(undefined),
          request: vi.fn().mockReturnValue({
            input: vi.fn().mockReturnThis(),
            query: vi.fn().mockResolvedValue({
              recordset: [],
              rowsAffected: [0],
            }),
            timeout: 30000,
          }),
          connected: true,
          config: { database: 'master' },
        };
      }
      vi.mocked(mssql.ConnectionPool).mockImplementationOnce(EmptyConnectionPool as any);

      const result = await client.queryOne('SELECT * FROM TestTable WHERE id = @id', {
        id: 999,
      });

      expect(result).toBeNull();
    });
  });

  describe('getClientForDatabase', () => {
    beforeEach(() => {
      client = new SqlServerClient();
    });

    it('should return client wrapper for specific database', () => {
      const dbClient = client.getClientForDatabase('Reporting');

      expect(dbClient.queryMany).toBeDefined();
      expect(dbClient.queryOne).toBeDefined();
      expect(dbClient.execute).toBeDefined();
    });
  });

  describe('testConnection', () => {
    beforeEach(() => {
      client = new SqlServerClient();
    });

    it('should test connection successfully', async () => {
      const result = await client.testConnection();

      expect(result).toBe(true);
    });
  });
});

