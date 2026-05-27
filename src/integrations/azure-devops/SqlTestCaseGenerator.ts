/**
 * SQL Test Case Generator for Azure DevOps Work Items
 * 
 * Generates Gherkin test cases for SQL Server database changes (ODS/TDS)
 * Analyzes Azure DevOps work items and creates comprehensive test scenarios
 * 
 * Focus Areas:
 * - Table schema changes (new tables, columns, indexes)
 * - Stored procedure modifications
 * - Data validation (ODS/TDS data integrity)
 * - Performance optimizations
 * - Data migration validation
 * - Reference data changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { AzureDevOpsWorkItem, AzureDevOpsClient } from './client';
import { SqlCodeAnalyzer, SqlChange } from './SqlCodeAnalyzer';
import { logger } from '../../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface SqlChangeAnalysis {
  workItemId: number;
  title: string;
  type: string;
  state: string;
  description: string;
  
  // Extracted SQL elements
  tables: string[];
  columns: string[];
  storedProcedures: string[];
  databases: string[]; // ODS, TDS, Reporting, etc.
  changeType: 'schema' | 'procedure' | 'data' | 'performance' | 'migration' | 'reference' | 'unknown';
  
  // Test scenarios
  scenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  description: string;
  tags: string[];
  steps: GherkinStep[];
  priority: 'high' | 'medium' | 'low';
}

interface GherkinStep {
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
}

// ============================================================================
// SQL TEST CASE GENERATOR
// ============================================================================

export class SqlTestCaseGenerator {
  private outputDir: string;
  private sqlScriptsDir: string;
  private adoClient: AzureDevOpsClient;
  private codeAnalyzer: SqlCodeAnalyzer;

  constructor(outputDir: string = 'src/features/sqlserver', sqlScriptsDir: string = 'src/features/sqlserver/sql-scripts') {
    this.outputDir = outputDir;
    this.sqlScriptsDir = sqlScriptsDir;
    this.adoClient = new AzureDevOpsClient();
    this.codeAnalyzer = new SqlCodeAnalyzer(this.adoClient);
    this.ensureOutputDirectory();
    this.ensureSqlScriptsDirectory();
  }

  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      logger.info(`Created output directory: ${this.outputDir}`);
    }
  }

  private ensureSqlScriptsDirectory(): void {
    if (!fs.existsSync(this.sqlScriptsDir)) {
      fs.mkdirSync(this.sqlScriptsDir, { recursive: true });
      logger.info(`Created SQL scripts directory: ${this.sqlScriptsDir}`);
    }
  }

  /**
   * Analyze Azure DevOps work item and generate test cases
   */
  public async generateTestCases(workItem: AzureDevOpsWorkItem): Promise<string | null> {
    try {
      // First, try to get PR links and analyze code changes
      let sqlChanges: SqlChange[] = [];
      let validationScripts: Map<string, string> = new Map();
      
      try {
        const prLinks = await this.adoClient.getPullRequestLinks(workItem.id);
        if (prLinks.length > 0) {
          logger.info(`Found ${prLinks.length} PR link(s) for work item ${workItem.id}`);
          
          // Extract PR ID from first link
          const prIdMatch = prLinks[0].match(/\/pullrequest\/(\d+)/i);
          if (prIdMatch) {
            const prId = parseInt(prIdMatch[1], 10);
            logger.info(`Analyzing PR ${prId} for code changes...`);
            
            // Get PR changes
            const fileChanges = await this.adoClient.getPullRequestChanges(prId);
            
            // Fetch file content for SQL files that don't have content
            const enrichedChanges = await this.enrichFileChangesWithContent(fileChanges, prId);
            
            // Analyze SQL changes
            sqlChanges = this.codeAnalyzer.analyzeChanges(enrichedChanges);
            
            // Generate validation SQL scripts
            if (sqlChanges.length > 0) {
              validationScripts = this.codeAnalyzer.generatePerformanceValidationScripts(sqlChanges);
              
              // Save SQL scripts
              this.saveValidationScripts(workItem.id, validationScripts);
            }
          }
        }
      } catch (prError: any) {
        logger.warn(`Could not analyze PR changes: ${prError.message}. Proceeding with work item analysis only.`);
      }
      
      // Analyze work item (fallback or supplement)
      const analysis = this.analyzeWorkItem(workItem, sqlChanges);
      
      // Generate basic validation scripts if no PR-based scripts were generated
      if (validationScripts.size === 0) {
        validationScripts = this.generateBasicValidationScripts(workItem, analysis);
        if (validationScripts.size > 0) {
          this.saveValidationScripts(workItem.id, validationScripts);
        }
      }
      
      // Generate feature file with PR-based scenarios
      const featureContent = this.generateFeatureFile(analysis, sqlChanges, validationScripts);
      
      if (!featureContent) {
        logger.warn(`No test cases generated for work item ${workItem.id}`);
        return null;
      }

      const fileName = this.getFeatureFileName(workItem);
      const filePath = path.join(this.outputDir, fileName);
      
      fs.writeFileSync(filePath, featureContent, 'utf-8');
      logger.info(`✅ Generated test cases: ${filePath}`);
      
      return filePath;
    } catch (error: any) {
      logger.error(`Error generating test cases for work item ${workItem.id}:`, error);
      return null;
    }
  }

  /**
   * Enrich file changes with content when missing
   */
  private async enrichFileChangesWithContent(fileChanges: any[], prId: number): Promise<any[]> {
    const enrichedChanges: any[] = [];
    
    if (fileChanges.length === 0) {
      logger.warn('No file changes to enrich');
      return enrichedChanges;
    }
    
    // Get repository ID (needed for fetching file content)
    const repos = await this.adoClient.getRepositories();
    if (repos.length === 0) {
      logger.warn('No repositories found, cannot fetch file content');
      return fileChanges;
    }
    
    const repositoryId = repos.find((r: any) => r.name.toLowerCase() === this.adoClient['project']?.toLowerCase())?.id || repos[0].id;
    
    // Get PR details to find source commit
    let sourceCommitId: string | undefined;
    try {
      const pr = await this.adoClient.getPullRequest(prId, repositoryId);
      sourceCommitId = pr.lastMergeSourceCommit?.commitId || pr.sourceRefName?.replace('refs/heads/', '');
      logger.info(`Using source commit/ref: ${sourceCommitId}`);
    } catch (error: any) {
      logger.warn(`Could not get PR details: ${error.message}`);
    }
    
    // Count SQL files that need content
    const sqlFilesNeedingContent = fileChanges.filter(change => {
      const filePath = change.item?.path || change.path || change.sourceServerItem || '';
      const hasContent = !!(change.newContent || change.content || change.contentAfter);
      return filePath && this.codeAnalyzer['isSqlFile'](filePath) && !hasContent;
    });
    
    logger.info(`Found ${sqlFilesNeedingContent.length} SQL file(s) that need content fetching`);
    
    // Fetch content for SQL files in parallel (with limit to avoid overwhelming the API)
    const fetchPromises = sqlFilesNeedingContent.slice(0, 20).map(async (change) => {
      const filePath = change.item?.path || change.path || change.sourceServerItem;
      
      if (!filePath || !sourceCommitId) {
        return change;
      }
      
      try {
        // Try to get content from source branch
        const content = await this.adoClient.getFileContent(repositoryId, filePath, sourceCommitId);
        if (content) {
          change.content = content;
          change.newContent = content;
          change.contentAfter = content;
          logger.info(`✅ Fetched content for ${filePath} (${content.length} chars)`);
        } else {
          logger.warn(`⚠️  No content returned for ${filePath}`);
        }
      } catch (error: any) {
        logger.warn(`Could not fetch content for ${filePath}: ${error.message}`);
        // Continue without content - we can still analyze based on file path
      }
      
      return change;
    });
    
    // Wait for all content fetches to complete
    if (fetchPromises.length > 0) {
      await Promise.all(fetchPromises);
    }
    
    // Return all changes (with enriched content where available)
    return fileChanges;
  }

  /**
   * Save validation SQL scripts to disk
   */
  private saveValidationScripts(workItemId: number, scripts: Map<string, string>): void {
    scripts.forEach((script, key) => {
      const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '_');
      const fileName = `ADO-${workItemId}-${sanitizedKey}.sql`;
      const filePath = path.join(this.sqlScriptsDir, fileName);
      
      fs.writeFileSync(filePath, script, 'utf-8');
      logger.info(`✅ Saved validation script: ${filePath}`);
    });
  }

  /**
   * Analyze work item to extract SQL-related information
   */
  private analyzeWorkItem(workItem: AzureDevOpsWorkItem, prSqlChanges: SqlChange[] = []): SqlChangeAnalysis {
    const title = workItem.fields['System.Title'] || '';
    const description = workItem.fields['System.Description'] || '';
    const type = workItem.fields['System.WorkItemType'] || '';
    const state = workItem.fields['System.State'] || '';
    
    const fullText = `${title} ${description}`.toLowerCase();
    
    // Extract database names
    const databases = this.extractDatabases(fullText);
    
    // Extract table names
    const tables = this.extractTables(fullText, description);
    
    // Extract column names
    const columns = this.extractColumns(fullText, description);
    
    // Extract stored procedures
    const storedProcedures = this.extractStoredProcedures(fullText, description);
    
    // Determine change type
    const changeType = this.determineChangeType(fullText, title, tables, storedProcedures);
    
    // Generate test scenarios
    const scenarios = this.generateScenarios(workItem, changeType, tables, columns, storedProcedures, databases, prSqlChanges);
    
    return {
      workItemId: workItem.id,
      title,
      type,
      state,
      description,
      tables,
      columns,
      storedProcedures,
      databases,
      changeType,
      scenarios,
    };
  }

  /**
   * Extract database names (ODS, TDS, Reporting, etc.)
   */
  private extractDatabases(text: string): string[] {
    const databases: string[] = [];
    const dbPatterns = [
      /\b(ods|ods-reference|ods-reference)\b/gi,
      /\b(tds)\b/gi,
      /\b(reporting)\b/gi,
      /\b(d365)\b/gi,
      /\b(reference)\b/gi,
    ];
    
    dbPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const db = match.toLowerCase();
          if (!databases.includes(db)) {
            databases.push(db);
          }
        });
      }
    });
    
    // Default to ODS if no database found but SQL-related
    if (databases.length === 0 && (text.includes('sql') || text.includes('database') || text.includes('table'))) {
      databases.push('ods');
    }
    
    return databases;
  }

  /**
   * Extract table names from text
   */
  private extractTables(text: string, description: string): string[] {
    const tables: string[] = [];
    
    // Pattern: "Table Name" or [Table Name] or table "TableName"
    const patterns = [
      /(?:table|from|into|update|insert into)\s+(?:\[|")?([A-Za-z][A-Za-z0-9_]*)/gi,
      new RegExp('\\[([A-Za-z][A-Za-z0-9_]*)\\]', 'g'), // [TableName]
      /"([A-Za-z][A-Za-z0-9_]*)"/g, // "TableName"
    ];
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const tableName = match[1];
        if (tableName && !tables.includes(tableName) && tableName.length > 2) {
          tables.push(tableName);
        }
      }
    });
    
    // Look for common table patterns in description
    const commonTables = ['Party', 'Account', 'Policy', 'Claim', 'Premium', 'VPT', 'Reference'];
    commonTables.forEach(table => {
      if (text.includes(table.toLowerCase()) && !tables.includes(table)) {
        tables.push(table);
      }
    });
    
    return tables;
  }

  /**
   * Extract column names from text
   */
  private extractColumns(text: string, description: string): string[] {
    const columns: string[] = [];
    
    // Pattern: "Column Name" or Column 'ColumnName'
    const patterns = [
      /(?:column|field)\s+['"]?([A-Za-z][A-Za-z0-9_]*)/gi,
      /column\s+['"]?([A-Za-z][A-Za-z0-9_]*)/gi,
      /'([A-Z][A-Za-z0-9_]*)'/g, // 'ColumnName'
    ];
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const columnName = match[1];
        if (columnName && !columns.includes(columnName) && columnName.length > 2) {
          columns.push(columnName);
        }
      }
    });
    
    // Extract from title if it mentions specific columns
    const titleMatch = text.match(/column\s+['"]?([A-Z][A-Za-z0-9_]*)/i);
    if (titleMatch && !columns.includes(titleMatch[1])) {
      columns.push(titleMatch[1]);
    }
    
    return columns;
  }

  /**
   * Extract stored procedure names
   */
  private extractStoredProcedures(text: string, description: string): string[] {
    const procedures: string[] = [];
    
    // Pattern: SP, SP_, [dbo].[SPName], dbo.SPName
    const patterns = [
      /(?:sp|stored procedure|procedure)\s+([A-Za-z][A-Za-z0-9_]*)/gi,
      /\[dbo\]\.\[([A-Za-z][A-Za-z0-9_]*)\]/gi,
      /dbo\.([A-Za-z][A-Za-z0-9_]*)/gi,
      /\[([A-Za-z][A-Za-z0-9_]*)\]\.\[([A-Za-z][A-Za-z0-9_]*)\]/gi, // [Schema].[SPName]
    ];
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const procName = match[1] || match[2];
        if (procName && !procedures.includes(procName) && procName.length > 2) {
          procedures.push(procName);
        }
      }
    });
    
    return procedures;
  }

  /**
   * Determine the type of SQL change
   */
  private determineChangeType(
    text: string,
    title: string,
    tables: string[],
    storedProcedures: string[]
  ): SqlChangeAnalysis['changeType'] {
    const lowerText = text.toLowerCase();
    const lowerTitle = title.toLowerCase();
    
    if (lowerText.includes('performance') || lowerText.includes('optimization') || lowerText.includes('optimise')) {
      return 'performance';
    }
    
    if (lowerText.includes('migration') || lowerText.includes('migrate')) {
      return 'migration';
    }
    
    if (lowerText.includes('reference data') || lowerText.includes('reference table')) {
      return 'reference';
    }
    
    if (storedProcedures.length > 0 || lowerText.includes('stored procedure') || lowerText.includes('sp ')) {
      return 'procedure';
    }
    
    if (tables.length > 0 || lowerText.includes('table') || lowerText.includes('column')) {
      return 'schema';
    }
    
    if (lowerText.includes('data') || lowerText.includes('validation') || lowerText.includes('integrity')) {
      return 'data';
    }
    
    return 'unknown';
  }

  /**
   * Generate test scenarios based on analysis
   */
  private generateScenarios(
    workItem: AzureDevOpsWorkItem,
    changeType: SqlChangeAnalysis['changeType'],
    tables: string[],
    columns: string[],
    storedProcedures: string[],
    databases: string[],
    prSqlChanges: SqlChange[] = []
  ): TestScenario[] {
    const scenarios: TestScenario[] = [];
    const workItemId = workItem.id;
    const title = workItem.fields['System.Title'] || '';
    
    // Default database if none specified
    const targetDatabase = databases.length > 0 ? databases[0] : 'ODS';
    
    switch (changeType) {
      case 'schema':
        // Table/Column changes - enhanced scenarios
        if (tables.length > 0) {
          // Table existence validation
          scenarios.push({
            name: `Validate ${tables[0]} table exists in ${targetDatabase} database`,
            description: `Verify that the ${tables[0]} table exists and is accessible in ${targetDatabase}`,
            tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@schema'],
            steps: [
              { keyword: 'Given', text: `I have a valid SQL Server connection` },
              { keyword: 'When', text: `I query the SQL Server "${targetDatabase}" database for table "${tables[0]}"` },
              { keyword: 'Then', text: `the table "${tables[0]}" should exist` },
            ],
            priority: 'high',
          });
          
          // Column validation for each column
          columns.forEach(column => {
            scenarios.push({
              name: `Validate ${column} column exists in ${tables[0]} table`,
              description: `Verify that the ${column} column exists in ${tables[0]} table with correct data type`,
              tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@schema', '@column'],
              steps: [
                { keyword: 'Given', text: `I have a valid SQL Server connection` },
                { keyword: 'When', text: `I query the SQL Server "${targetDatabase}" database for column "${column}" in table "${tables[0]}"` },
                { keyword: 'Then', text: `the column "${column}" should exist in table "${tables[0]}"` },
              ],
              priority: 'high',
            });
          });
          
          // Data validation scenario
          scenarios.push({
            name: `Validate data integrity in ${tables[0]} table`,
            description: `Verify data integrity and basic validation rules for ${tables[0]} table`,
            tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@schema', '@data-validation'],
            steps: [
              { keyword: 'Given', text: `I have a valid SQL Server connection` },
              { keyword: 'When', text: `I query the SQL Server "${targetDatabase}" database for data validation in "${tables[0]}"` },
              { keyword: 'Then', text: `the data should meet integrity requirements` },
            ],
            priority: 'medium',
          });
          
          // Table structure validation
          scenarios.push({
            name: `Validate ${tables[0]} table structure and constraints`,
            description: `Verify table structure, indexes, and constraints for ${tables[0]} table`,
            tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@schema', '@structure'],
            steps: [
              { keyword: 'Given', text: `I have a valid SQL Server connection` },
              { keyword: 'When', text: `I query the SQL Server "${targetDatabase}" database for table structure "${tables[0]}"` },
              { keyword: 'Then', text: `the table structure should be valid` },
            ],
            priority: 'medium',
          });
        }
        break;
        
      case 'procedure':
        // Stored procedure changes
        storedProcedures.forEach(proc => {
          scenarios.push({
            name: `Validate stored procedure ${proc} executes successfully`,
            description: `Verify that stored procedure ${proc} can be executed without errors`,
            tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@procedure'],
            steps: [
              { keyword: 'Given', text: `I have a valid SQL Server connection` },
              { keyword: 'When', text: `I execute stored procedure "${proc}" in "${targetDatabase}" database` },
              { keyword: 'Then', text: `the stored procedure should execute successfully` },
            ],
            priority: 'high',
          });
        });
        break;
        
      case 'performance':
        // Performance optimizations - enhanced with PR analysis
        if (prSqlChanges.length > 0) {
          // Generate scenarios based on actual code changes
          prSqlChanges.forEach(change => {
            if (change.sqlType === 'procedure' || change.sqlType === 'function') {
              const scriptKey = `${change.schema}.${change.objectName}`;
              const scriptName = `ADO-${workItemId}-${scriptKey.replace(/[^a-zA-Z0-9]/g, '_')}.sql`;
              scenarios.push({
                name: `Validate performance of ${change.schema}.${change.objectName} using validation script`,
                description: `Execute validation script to measure performance improvements for ${change.schema}.${change.objectName}. Script: ${scriptName}`,
                tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@performance', '@pr-validated'],
                steps: [
                  { keyword: 'Given', text: `I have a valid SQL Server connection` },
                  { keyword: 'When', text: `I execute the validation script "${scriptName}" in "${targetDatabase}" database` },
                  { keyword: 'Then', text: `the execution time should be within acceptable limits` },
                  { keyword: 'And', text: `the performance metrics should meet the requirements` },
                ],
                priority: 'high',
              });
            } else if (change.sqlType === 'index') {
              const scriptKey = `Index_${change.objectName}`;
              const scriptName = `ADO-${workItemId}-${scriptKey.replace(/[^a-zA-Z0-9]/g, '_')}.sql`;
              scenarios.push({
                name: `Validate index ${change.objectName} performance impact`,
                description: `Verify that the index ${change.objectName} improves query performance. Validation script: ${scriptName}`,
                tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@performance', '@index', '@pr-validated'],
                steps: [
                  { keyword: 'Given', text: `I have a valid SQL Server connection` },
                  { keyword: 'When', text: `I validate index "${change.objectName}" exists and is used in "${targetDatabase}" database` },
                  { keyword: 'Then', text: `the index should exist and improve query performance` },
                ],
                priority: 'high',
              });
            }
          });
        }
        
        // Fallback to basic performance test if no PR changes
        if (scenarios.length === 0 && (tables.length > 0 || storedProcedures.length > 0)) {
          const target = storedProcedures.length > 0 ? storedProcedures[0] : tables[0];
          scenarios.push({
            name: `Validate performance improvement for ${target}`,
            description: `Verify that performance optimizations for ${target} are working as expected`,
            tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@performance'],
            steps: [
              { keyword: 'Given', text: `I have a valid SQL Server connection` },
              { keyword: 'When', text: `I measure execution time for ${storedProcedures.length > 0 ? 'stored procedure' : 'query'} "${target}" in "${targetDatabase}" database` },
              { keyword: 'Then', text: `the execution time should be within acceptable limits` },
            ],
            priority: 'medium',
          });
        }
        break;
        
      case 'data':
        // Data validation
        if (tables.length > 0) {
          scenarios.push({
            name: `Validate data integrity in ${tables[0]} table`,
            description: `Verify data integrity and validation rules for ${tables[0]} table`,
            tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@data', '@validation'],
            steps: [
              { keyword: 'Given', text: `I have a valid SQL Server connection` },
              { keyword: 'When', text: `I query the SQL Server "${targetDatabase}" database for data validation in "${tables[0]}"` },
              { keyword: 'Then', text: `the data should meet integrity requirements` },
            ],
            priority: 'high',
          });
        }
        break;
        
      case 'reference':
        // Reference data changes - enhanced scenarios
        if (tables.length > 0) {
          // Reference data availability
          scenarios.push({
            name: `Validate reference data in ${tables[0]} table`,
            description: `Verify reference data is correctly loaded and accessible in ${tables[0]} table`,
            tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@reference'],
            steps: [
              { keyword: 'Given', text: `I have a valid SQL Server connection` },
              { keyword: 'When', text: `I query the SQL Server "${targetDatabase}" database for reference data in "${tables[0]}"` },
              { keyword: 'Then', text: `the reference data should be available and valid` },
            ],
            priority: 'high',
          });
          
          // Reference data completeness
          scenarios.push({
            name: `Validate reference data completeness in ${tables[0]} table`,
            description: `Verify that all expected reference data records are present in ${tables[0]} table`,
            tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@reference', '@completeness'],
            steps: [
              { keyword: 'Given', text: `I have a valid SQL Server connection` },
              { keyword: 'When', text: `I query the SQL Server "${targetDatabase}" database for reference data count in "${tables[0]}"` },
              { keyword: 'Then', text: `the reference data count should meet minimum requirements` },
            ],
            priority: 'medium',
          });
          
          // Reference data accuracy
          scenarios.push({
            name: `Validate reference data accuracy in ${tables[0]} table`,
            description: `Verify that reference data values are accurate and consistent in ${tables[0]} table`,
            tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@reference', '@accuracy'],
            steps: [
              { keyword: 'Given', text: `I have a valid SQL Server connection` },
              { keyword: 'When', text: `I query the SQL Server "${targetDatabase}" database for reference data validation in "${tables[0]}"` },
              { keyword: 'Then', text: `the reference data should be accurate and consistent` },
            ],
            priority: 'medium',
          });
        }
        break;
        
      case 'migration':
        // Data migration validation
        scenarios.push({
          name: `Validate data migration completed successfully`,
          description: `Verify that data migration has completed and data is accessible`,
          tags: ['@sqlserver', '@ado', `@ado-${workItemId}`, '@migration'],
          steps: [
            { keyword: 'Given', text: `I have a valid SQL Server connection` },
            { keyword: 'When', text: `I verify data migration status in "${targetDatabase}" database` },
            { keyword: 'Then', text: `the migration should be completed successfully` },
          ],
          priority: 'high',
        });
        break;
        
      default:
        // Generic SQL validation
        scenarios.push({
          name: `Validate SQL Server changes for ${title}`,
          description: `Verify that SQL Server changes are working as expected`,
          tags: ['@sqlserver', '@ado', `@ado-${workItemId}`],
          steps: [
            { keyword: 'Given', text: `I have a valid SQL Server connection` },
            { keyword: 'When', text: `I test the SQL Server connection` },
            { keyword: 'Then', text: `the connection should be successful` },
          ],
          priority: 'medium',
        });
    }
    
    return scenarios;
  }

  /**
   * Generate Gherkin feature file content
   */
  private generateFeatureFile(
    analysis: SqlChangeAnalysis,
    prSqlChanges: SqlChange[] = [],
    validationScripts: Map<string, string> = new Map()
  ): string | null {
    if (analysis.scenarios.length === 0) {
      return null;
    }
    
    const lines: string[] = [];
    
    // Feature header
    lines.push(`@sqlserver @ado @ado-${analysis.workItemId}`);
    lines.push(`Feature: ${this.escapeFeatureName(analysis.title)}`);
    lines.push(`  As a QA engineer`);
    lines.push(`  I want to validate SQL Server changes for Azure DevOps work item ${analysis.workItemId}`);
    lines.push(`  So that I can ensure database changes are working correctly`);
    lines.push('');
    
    // Add SQL Scripts section if validation scripts exist
    if (validationScripts.size > 0) {
      lines.push(`  # SQL Validation Scripts`);
      lines.push(`  # The following SQL scripts are available in src/features/sqlserver/sql-scripts/`);
      lines.push(`  # These scripts are generated from PR code analysis and can be executed as part of test scenarios:`);
      lines.push('');
      
      validationScripts.forEach((script, key) => {
        const scriptFileName = this.getScriptFileName(analysis.workItemId, key);
        lines.push(`  # - ${scriptFileName} (for ${key})`);
      });
      lines.push('');
    }
    
    // Background
    lines.push(`  Background:`);
    lines.push(`    Given I have a valid SQL Server connection`);
    lines.push('');
    
    // Scenarios
    analysis.scenarios.forEach((scenario, index) => {
      if (index > 0) {
        lines.push('');
      }
      
      // Tags
      if (scenario.tags.length > 0) {
        lines.push(`  ${scenario.tags.join(' ')}`);
      }
      
      // Scenario name
      lines.push(`  Scenario: ${scenario.name}`);
      
      // Add comment if scenario uses a validation script
      const scriptReference = this.findScriptReferenceForScenario(scenario, validationScripts, analysis.workItemId, prSqlChanges);
      if (scriptReference) {
        lines.push(`    # Uses validation script: ${scriptReference}`);
        lines.push(`    # Script location: src/features/sqlserver/sql-scripts/${scriptReference}`);
      }
      
      // Steps
      scenario.steps.forEach(step => {
        lines.push(`    ${step.keyword} ${step.text}`);
      });
    });
    
    return lines.join('\n') + '\n';
  }

  /**
   * Find script reference for a scenario
   */
  private findScriptReferenceForScenario(
    scenario: TestScenario,
    validationScripts: Map<string, string>,
    workItemId: number,
    prSqlChanges: SqlChange[]
  ): string | null {
    // Check if scenario steps reference a validation script
    const scriptStep = scenario.steps.find(step => 
      step.text.includes('validation script') || step.text.includes('execute the validation script')
    );
    
    if (scriptStep) {
      // Extract script name from step text
      const match = scriptStep.text.match(/validation script "([^"]+)"/);
      if (match) {
        return match[1];
      }
    }
    
    // Try to match based on PR SQL changes
    for (const change of prSqlChanges) {
      if (scenario.name.toLowerCase().includes(change.objectName.toLowerCase()) ||
          scenario.name.toLowerCase().includes(change.schema.toLowerCase())) {
        const scriptKey = change.sqlType === 'index' 
          ? `Index_${change.objectName}` 
          : `${change.schema}.${change.objectName}`;
        
        if (validationScripts.has(scriptKey)) {
          return this.getScriptFileName(workItemId, scriptKey);
        }
      }
    }
    
    return null;
  }

  /**
   * Get script file name from key
   */
  private getScriptFileName(workItemId: number, key: string): string {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9]/g, '_');
    return `ADO-${workItemId}-${sanitizedKey}.sql`;
  }

  /**
   * Get feature file name from work item
   */
  private getFeatureFileName(workItem: AzureDevOpsWorkItem): string {
    const workItemId = workItem.id;
    const title = workItem.fields['System.Title'] || 'Untitled';
    const sanitized = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .substring(0, 50);
    
    return `ADO-${workItemId}-${sanitized}.feature`;
  }

  /**
   * Generate basic validation scripts when PR analysis doesn't find changes
   */
  private generateBasicValidationScripts(
    workItem: AzureDevOpsWorkItem,
    analysis: SqlChangeAnalysis
  ): Map<string, string> {
    const scripts = new Map<string, string>();
    const workItemId = workItem.id;
    
    // Generate table validation script
    if (analysis.tables.length > 0) {
      const table = analysis.tables[0];
      const database = analysis.databases.length > 0 ? analysis.databases[0] : 'ODS';
      
      const tableScript = `-- Table Validation Script for ${table}
-- Generated for Azure DevOps work item ${workItemId}
-- Validates table existence, structure, and basic data integrity

-- 1. Check if table exists
IF OBJECT_ID('dbo.${table}', 'U') IS NOT NULL
BEGIN
    PRINT 'Table dbo.${table} exists'
    
    -- 2. Get table row count
    DECLARE @RowCount INT
    SELECT @RowCount = COUNT(*) FROM [dbo].[${table}]
    PRINT 'Row count: ' + CAST(@RowCount AS VARCHAR)
    
    -- 3. Check for null values in key columns (if applicable)
    DECLARE @NullKeyCount INT = 0
    IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS 
               WHERE TABLE_NAME = '${table}' AND COLUMN_NAME LIKE '%Key%' OR COLUMN_NAME LIKE '%ID%')
    BEGIN
        -- This is a placeholder - adjust based on actual table structure
        PRINT 'Key column validation: Check table structure for key columns'
    END
    
    -- 4. Validate table structure
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${table}'
    ORDER BY ORDINAL_POSITION
    
END
ELSE
BEGIN
    THROW 50000, 'Table dbo.${table} does not exist', 1
END
`;
      
      scripts.set(`Table_${table}`, tableScript);
    }
    
    // Generate stored procedure validation script
    if (analysis.storedProcedures.length > 0) {
      analysis.storedProcedures.forEach(proc => {
        const procScript = `-- Stored Procedure Validation Script for ${proc}
-- Generated for Azure DevOps work item ${workItemId}
-- Validates procedure existence and basic execution

-- 1. Check if procedure exists
IF OBJECT_ID('dbo.${proc}', 'P') IS NOT NULL
BEGIN
    PRINT 'Stored procedure dbo.${proc} exists'
    
    -- 2. Get procedure definition
    SELECT 
        OBJECT_DEFINITION(OBJECT_ID('dbo.${proc}')) AS ProcedureDefinition
    
    -- 3. Note: Actual execution should be done with appropriate test parameters
    -- EXEC dbo.${proc} @Param1 = 'test_value'
    
END
ELSE
BEGIN
    THROW 50000, 'Stored procedure dbo.${proc} does not exist', 1
END
`;
        
        scripts.set(`Procedure_${proc}`, procScript);
      });
    }
    
    // Generate column validation script
    if (analysis.columns.length > 0 && analysis.tables.length > 0) {
      const table = analysis.tables[0];
      analysis.columns.forEach(column => {
        const columnScript = `-- Column Validation Script for ${column} in ${table}
-- Generated for Azure DevOps work item ${workItemId}

-- 1. Check if column exists
IF COL_LENGTH('dbo.${table}', '${column}') IS NOT NULL
BEGIN
    PRINT 'Column ${column} exists in table ${table}'
    
    -- 2. Get column properties
    SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = '${table}' AND COLUMN_NAME = '${column}'
    
    -- 3. Check for null values (if column is not nullable)
    DECLARE @NullCount INT
    SELECT @NullCount = COUNT(*) 
    FROM [dbo].[${table}]
    WHERE [${column}] IS NULL
    
    IF @NullCount > 0
    BEGIN
        PRINT 'WARNING: Found ' + CAST(@NullCount AS VARCHAR) + ' NULL values in ${column}'
    END
    ELSE
    BEGIN
        PRINT 'No NULL values found in ${column}'
    END
    
END
ELSE
BEGIN
    THROW 50000, 'Column ${column} does not exist in table ${table}', 1
END
`;
        
        scripts.set(`Column_${table}_${column}`, columnScript);
      });
    }
    
    return scripts;
  }

  /**
   * Escape feature name for Gherkin
   */
  private escapeFeatureName(name: string): string {
    return name.replace(/"/g, '\\"');
  }
}

