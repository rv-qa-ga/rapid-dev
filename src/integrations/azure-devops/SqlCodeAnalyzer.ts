/**
 * SQL Code Analyzer
 * Analyzes SQL code changes from pull requests to extract:
 * - Stored procedures modified
 * - Tables/columns affected
 * - Performance-related changes (indexes, query optimizations)
 * - Schema changes
 */

import { logger } from '../../utils/logger';

export interface SqlChange {
  filePath: string;
  changeType: 'added' | 'modified' | 'deleted';
  sqlType: 'procedure' | 'function' | 'table' | 'index' | 'view' | 'trigger' | 'script' | 'unknown';
  objectName: string;
  schema: string;
  content: string;
  oldContent?: string;
  performanceIndicators: string[];
  affectedTables: string[];
  affectedColumns: string[];
}

export interface PerformanceChange {
  type: 'index' | 'query_optimization' | 'procedure_optimization' | 'statistics' | 'partitioning';
  description: string;
  beforeQuery?: string;
  afterQuery?: string;
  expectedImprovement: string;
}

export class SqlCodeAnalyzer {
  private adoClient?: any; // AzureDevOpsClient - optional for fetching file content
  
  constructor(adoClient?: any) {
    this.adoClient = adoClient;
  }

  /**
   * Analyze file changes to extract SQL-related changes
   */
  public analyzeChanges(fileChanges: any[]): SqlChange[] {
    const sqlChanges: SqlChange[] = [];
    
    for (const change of fileChanges) {
      if (!this.isSqlFile(change.item?.path || change.path)) {
        continue;
      }
      
      const sqlChange = this.analyzeFileChange(change);
      if (sqlChange) {
        sqlChanges.push(sqlChange);
      }
    }
    
    return sqlChanges;
  }

  /**
   * Check if file is SQL-related
   */
  private isSqlFile(filePath: string): boolean {
    if (!filePath) return false;
    
    const sqlExtensions = ['.sql', '.tsql', '.ddl', '.dml'];
    const sqlPatterns = [
      /\.sql$/i,
      /stored.?procedure/i,
      /sp_/i,
      /procedure/i,
      /function/i,
    ];
    
    const lowerPath = filePath.toLowerCase();
    return sqlExtensions.some(ext => lowerPath.endsWith(ext)) ||
           sqlPatterns.some(pattern => pattern.test(lowerPath));
  }

  /**
   * Analyze a single file change
   */
  private analyzeFileChange(change: any): SqlChange | null {
    // Handle different Azure DevOps API response formats
    const filePath = change.item?.path || change.path || change.sourceServerItem || '';
    const changeType = this.determineChangeType(change);
    
    // Content might be in different fields depending on API endpoint
    const content = change.newContent || change.content || change.contentAfter || '';
    const oldContent = change.originalContent || change.oldContent || change.contentBefore || '';
    
    // Log what we found
    if (filePath) {
      logger.debug(`Analyzing file change: ${filePath} (type: ${changeType})`);
    }
    
    // If content is missing, we'll still try to extract info from file path
    // The content will be fetched separately if needed
    
    // Extract SQL object information - try with content first, then fallback to path
    let sqlInfo = this.extractSqlObjectInfo(content, filePath);
    
    // If we couldn't extract SQL info but have content, try to infer from file path
    if (!sqlInfo && content) {
      const inferredInfo = this.inferSqlObjectFromContent(content, filePath);
      if (inferredInfo) {
        sqlInfo = inferredInfo;
      }
    }
    
    // If still no SQL info, try to infer from file path only
    if (!sqlInfo && filePath) {
      sqlInfo = this.inferSqlObjectFromContent('', filePath);
    }
    
    // If we still can't determine SQL type, but it's a SQL file, treat as script
    if (!sqlInfo && this.isSqlFile(filePath)) {
      sqlInfo = {
        type: 'script',
        schema: 'dbo',
        name: filePath.split('/').pop()?.split('\\').pop()?.replace(/\.sql$/i, '') || 'unknown',
      };
    }
    
    // If still no SQL info, return null
    if (!sqlInfo) {
      logger.debug(`Could not determine SQL object type for ${filePath}`);
      return null;
    }
    
    // Analyze performance indicators (even with empty content, we can check file path)
    const performanceIndicators = this.extractPerformanceIndicators(content, oldContent);
    
    // Extract affected tables and columns
    const affectedTables = this.extractTables(content);
    const affectedColumns = this.extractColumns(content);
    
    logger.info(`✅ Detected SQL change: ${sqlInfo.type} ${sqlInfo.schema}.${sqlInfo.name} in ${filePath}`);
    
    return {
      filePath,
      changeType,
      sqlType: sqlInfo.type,
      objectName: sqlInfo.name,
      schema: sqlInfo.schema,
      content,
      oldContent,
      performanceIndicators,
      affectedTables,
      affectedColumns,
    };
  }

  /**
   * Infer SQL object information from content when explicit patterns don't match
   */
  private inferSqlObjectFromContent(content: string, filePath: string): { type: SqlChange['sqlType'], name: string, schema: string } | null {
    // Try to extract from file name
    const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
    const nameWithoutExt = fileName.replace(/\.sql$/i, '');
    
    // Check if it looks like a stored procedure
    if (fileName.toLowerCase().startsWith('sp_') || fileName.toLowerCase().includes('procedure')) {
      return {
        type: 'procedure',
        schema: 'dbo',
        name: nameWithoutExt,
      };
    }
    
    // Check if it looks like a function
    if (fileName.toLowerCase().includes('function') || fileName.toLowerCase().includes('fn_')) {
      return {
        type: 'function',
        schema: 'dbo',
        name: nameWithoutExt,
      };
    }
    
    // Default to script
    return {
      type: 'script',
      schema: 'dbo',
      name: nameWithoutExt,
    };
  }

  /**
   * Determine change type
   */
  private determineChangeType(change: any): 'added' | 'modified' | 'deleted' {
    if (change.changeType === 'add' || change.changeType === 'add, edit') {
      return 'added';
    }
    if (change.changeType === 'delete' || change.changeType === 'delete, edit') {
      return 'deleted';
    }
    return 'modified';
  }

  /**
   * Extract SQL object information (procedure, function, table, etc.)
   */
  private extractSqlObjectInfo(content: string, filePath: string): { type: SqlChange['sqlType'], name: string, schema: string } | null {
    const upperContent = content.toUpperCase();
    
    // Stored Procedure
    const procMatch = content.match(/(?:CREATE|ALTER)\s+(?:PROCEDURE|PROC)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i);
    if (procMatch) {
      return {
        type: 'procedure',
        schema: procMatch[1] || 'dbo',
        name: procMatch[2] || '',
      };
    }
    
    // Function
    const funcMatch = content.match(/(?:CREATE|ALTER)\s+FUNCTION\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i);
    if (funcMatch) {
      return {
        type: 'function',
        schema: funcMatch[1] || 'dbo',
        name: funcMatch[2] || '',
      };
    }
    
    // Table
    const tableMatch = content.match(/(?:CREATE|ALTER)\s+TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i);
    if (tableMatch) {
      return {
        type: 'table',
        schema: tableMatch[1] || 'dbo',
        name: tableMatch[2] || '',
      };
    }
    
    // Index
    const indexMatch = content.match(/(?:CREATE|ALTER)\s+(?:UNIQUE\s+)?(?:CLUSTERED|NONCLUSTERED)?\s+INDEX\s+\[?(\w+)\]?\s+ON\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i);
    if (indexMatch) {
      return {
        type: 'index',
        schema: indexMatch[2] || 'dbo',
        name: indexMatch[1] || '',
      };
    }
    
    // View
    const viewMatch = content.match(/(?:CREATE|ALTER)\s+VIEW\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i);
    if (viewMatch) {
      return {
        type: 'view',
        schema: viewMatch[1] || 'dbo',
        name: viewMatch[2] || '',
      };
    }
    
    // Trigger
    const triggerMatch = content.match(/(?:CREATE|ALTER)\s+TRIGGER\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/i);
    if (triggerMatch) {
      return {
        type: 'trigger',
        schema: triggerMatch[1] || 'dbo',
        name: triggerMatch[2] || '',
      };
    }
    
    // If file path suggests SQL, treat as script
    if (this.isSqlFile(filePath)) {
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || '';
      return {
        type: 'script',
        schema: 'dbo',
        name: fileName.replace(/\.sql$/i, ''),
      };
    }
    
    return null;
  }

  /**
   * Extract performance-related indicators
   */
  private extractPerformanceIndicators(content: string, oldContent?: string): string[] {
    const indicators: string[] = [];
    const upperContent = content.toUpperCase();
    
    // Performance keywords
    const performanceKeywords = [
      'INDEX',
      'INCLUDE',
      'WITH (',
      'OPTION (',
      'HINT',
      'NOLOCK',
      'FAST',
      'OPTIMIZE',
      'STATISTICS',
      'COMPUTE',
      'PARTITION',
      'PARALLEL',
    ];
    
    performanceKeywords.forEach(keyword => {
      if (upperContent.includes(keyword)) {
        indicators.push(keyword);
      }
    });
    
    // Compare with old content to detect optimizations
    if (oldContent) {
      const oldUpper = oldContent.toUpperCase();
      
      // Check if new indexes were added
      const newIndexes = this.countMatches(upperContent, /CREATE\s+(?:UNIQUE\s+)?INDEX/gi);
      const oldIndexes = this.countMatches(oldUpper, /CREATE\s+(?:UNIQUE\s+)?INDEX/gi);
      if (newIndexes > oldIndexes) {
        indicators.push('NEW_INDEX_ADDED');
      }
      
      // Check for query plan hints
      if (upperContent.includes('OPTION') && !oldUpper.includes('OPTION')) {
        indicators.push('QUERY_HINT_ADDED');
      }
      
      // Check for NOLOCK additions (performance optimization)
      if (upperContent.includes('NOLOCK') && !oldUpper.includes('NOLOCK')) {
        indicators.push('NOLOCK_ADDED');
      }
    }
    
    return [...new Set(indicators)];
  }

  /**
   * Extract table names from SQL content
   */
  private extractTables(content: string): string[] {
    const tables: string[] = [];
    
    // FROM, JOIN, INTO, UPDATE patterns
    const patterns = [
      /(?:FROM|JOIN|INTO|UPDATE)\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi,
      /TABLE\s+(?:\[?(\w+)\]?\.)?\[?(\w+)\]?/gi,
    ];
    
    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const tableName = match[2] || match[1];
        if (tableName && !tables.includes(tableName) && tableName.length > 1) {
          tables.push(tableName);
        }
      }
    });
    
    return tables;
  }

  /**
   * Extract column names from SQL content
   */
  private extractColumns(content: string): string[] {
    const columns: string[] = [];
    
    // Column patterns in SELECT, INSERT, UPDATE
    const patterns = [
      /(?:SELECT|INSERT|UPDATE)\s+.*?\[?(\w+)\]?\s*(?:,|FROM|WHERE|SET)/gi,
    ];
    
    patterns.forEach(pattern => {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        const columnName = match[1];
        if (columnName && !columns.includes(columnName) && columnName.length > 1) {
          columns.push(columnName);
        }
      }
    });
    
    return columns;
  }

  /**
   * Count regex matches
   */
  private countMatches(text: string, pattern: RegExp): number {
    const matches = text.matchAll(pattern);
    let count = 0;
    for (const _ of matches) {
      count++;
    }
    return count;
  }

  /**
   * Generate performance validation SQL scripts
   */
  public generatePerformanceValidationScripts(sqlChanges: SqlChange[]): Map<string, string> {
    const scripts = new Map<string, string>();
    
    for (const change of sqlChanges) {
      if (change.sqlType === 'procedure' || change.sqlType === 'function') {
        const script = this.generateProcedureValidationScript(change);
        if (script) {
          scripts.set(`${change.schema}.${change.objectName}`, script);
        }
      } else if (change.sqlType === 'index') {
        const script = this.generateIndexValidationScript(change);
        if (script) {
          scripts.set(`Index_${change.objectName}`, script);
        }
      } else if (change.sqlType === 'table') {
        const script = this.generateTableValidationScript(change);
        if (script) {
          scripts.set(`${change.schema}.${change.objectName}`, script);
        }
      }
    }
    
    return scripts;
  }

  /**
   * Generate validation script for stored procedure
   */
  private generateProcedureValidationScript(change: SqlChange): string {
    const lines: string[] = [];
    
    lines.push(`-- Performance Validation Script for ${change.schema}.${change.objectName}`);
    lines.push(`-- Generated from PR changes`);
    lines.push('');
    lines.push(`-- 1. Check if procedure exists`);
    lines.push(`IF OBJECT_ID('${change.schema}.${change.objectName}', 'P') IS NOT NULL`);
    lines.push(`BEGIN`);
    lines.push(`    PRINT 'Procedure ${change.schema}.${change.objectName} exists'`);
    lines.push(`END`);
    lines.push(`ELSE`);
    lines.push(`BEGIN`);
    lines.push(`    THROW 50000, 'Procedure ${change.schema}.${change.objectName} does not exist', 1`);
    lines.push(`END`);
    lines.push('');
    
    lines.push(`-- 2. Get execution plan and statistics`);
    lines.push(`SET STATISTICS IO ON`);
    lines.push(`SET STATISTICS TIME ON`);
    lines.push('');
    lines.push(`-- 3. Execute procedure and measure performance`);
    lines.push(`DECLARE @StartTime DATETIME2 = SYSDATETIME()`);
    lines.push(`DECLARE @EndTime DATETIME2`);
    lines.push(`DECLARE @ExecutionTimeMs INT`);
    lines.push('');
    lines.push(`-- TODO: Add actual procedure call with test parameters`);
    lines.push(`-- EXEC ${change.schema}.${change.objectName} @Param1 = 'value'`);
    lines.push('');
    lines.push(`SET @EndTime = SYSDATETIME()`);
    lines.push(`SET @ExecutionTimeMs = DATEDIFF(MILLISECOND, @StartTime, @EndTime)`);
    lines.push('');
    lines.push(`-- 4. Validate execution time (adjust threshold as needed)`);
    lines.push(`IF @ExecutionTimeMs > 5000 -- 5 seconds threshold`);
    lines.push(`BEGIN`);
    lines.push(`    PRINT 'WARNING: Execution time exceeds threshold: ' + CAST(@ExecutionTimeMs AS VARCHAR) + 'ms'`);
    lines.push(`END`);
    lines.push(`ELSE`);
    lines.push(`BEGIN`);
    lines.push(`    PRINT 'SUCCESS: Execution time within threshold: ' + CAST(@ExecutionTimeMs AS VARCHAR) + 'ms'`);
    lines.push(`END`);
    lines.push('');
    lines.push(`SET STATISTICS IO OFF`);
    lines.push(`SET STATISTICS TIME OFF`);
    
    return lines.join('\n');
  }

  /**
   * Generate validation script for index
   */
  private generateIndexValidationScript(change: SqlChange): string {
    const lines: string[] = [];
    
    lines.push(`-- Index Validation Script for ${change.objectName}`);
    lines.push(`-- Generated from PR changes`);
    lines.push('');
    lines.push(`-- 1. Check if index exists`);
    lines.push(`IF EXISTS (`);
    lines.push(`    SELECT 1 FROM sys.indexes`);
    lines.push(`    WHERE name = '${change.objectName}'`);
    lines.push(`)`);
    lines.push(`BEGIN`);
    lines.push(`    PRINT 'Index ${change.objectName} exists'`);
    lines.push(`END`);
    lines.push(`ELSE`);
    lines.push(`BEGIN`);
    lines.push(`    THROW 50000, 'Index ${change.objectName} does not exist', 1`);
    lines.push(`END`);
    lines.push('');
    
    lines.push(`-- 2. Get index statistics`);
    lines.push(`SELECT`);
    lines.push(`    i.name AS IndexName,`);
    lines.push(`    i.type_desc AS IndexType,`);
    lines.push(`    i.is_unique AS IsUnique,`);
    lines.push(`    i.is_primary_key AS IsPrimaryKey,`);
    lines.push(`    s.avg_fragmentation_in_percent AS Fragmentation,`);
    lines.push(`    s.page_count AS PageCount`);
    lines.push(`FROM sys.indexes i`);
    lines.push(`INNER JOIN sys.dm_db_index_physical_stats(DB_ID(), OBJECT_ID('${change.affectedTables[0] || 'TABLE_NAME'}'), NULL, NULL, 'DETAILED') s`);
    lines.push(`    ON i.object_id = s.object_id AND i.index_id = s.index_id`);
    lines.push(`WHERE i.name = '${change.objectName}'`);
    
    return lines.join('\n');
  }

  /**
   * Generate validation script for table
   */
  private generateTableValidationScript(change: SqlChange): string {
    const lines: string[] = [];
    
    lines.push(`-- Table Validation Script for ${change.schema}.${change.objectName}`);
    lines.push(`-- Generated from PR changes`);
    lines.push('');
    lines.push(`-- 1. Check if table exists`);
    lines.push(`IF OBJECT_ID('${change.schema}.${change.objectName}', 'U') IS NOT NULL`);
    lines.push(`BEGIN`);
    lines.push(`    PRINT 'Table ${change.schema}.${change.objectName} exists'`);
    lines.push(`END`);
    lines.push(`ELSE`);
    lines.push(`BEGIN`);
    lines.push(`    THROW 50000, 'Table ${change.schema}.${change.objectName} does not exist', 1`);
    lines.push(`END`);
    lines.push('');
    
    if (change.affectedColumns.length > 0) {
      lines.push(`-- 2. Validate columns`);
      change.affectedColumns.forEach(column => {
        lines.push(`IF COL_LENGTH('${change.schema}.${change.objectName}', '${column}') IS NOT NULL`);
        lines.push(`BEGIN`);
        lines.push(`    PRINT 'Column ${column} exists'`);
        lines.push(`END`);
        lines.push(`ELSE`);
        lines.push(`BEGIN`);
        lines.push(`    THROW 50000, 'Column ${column} does not exist', 1`);
        lines.push(`END`);
      });
    }
    
    return lines.join('\n');
  }
}

