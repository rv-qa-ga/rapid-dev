/**
 * Comprehensive SQL Test Case Generator
 * 
 * Analyzes Azure DevOps work items for database changes and produces
 * comprehensive, prioritized SQL test cases with full context analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AzureDevOpsClient, AzureDevOpsWorkItem } from './client';
import { SqlServerClient } from '../../sqlserver/client/SqlServerClient';
import { logger } from '../../utils/logger';
import { SqlCodeAnalyzer, SqlChange } from './SqlCodeAnalyzer';

// ============================================================================
// TYPES
// ============================================================================

export interface SQLTestCase {
  id: string;
  title: string;
  purpose: string;
  preconditions: string;
  steps: string[];
  expected_result: string;
  test_data: string;
  priority: 'High' | 'Medium' | 'Low';
  type: 'Unit' | 'Integration' | 'Regression' | 'Performance' | 'Security' | 'Data-migration' | 'Backfill' | 'Rollback';
  complexity: 'Simple' | 'Moderate' | 'Complex';
  cleanup: string;
  automation_notes: string;
  source_references: Array<{
    file: string;
    line_range: string;
    url: string;
  }>;
  category: string;
}

export interface AffectedObject {
  object_type: string;
  schema: string;
  name: string;
  change_type: 'CREATE' | 'ALTER' | 'DROP' | 'UNKNOWN';
  notes: string;
}

export interface AcceptanceCriteriaMapping {
  criterion: string;
  covered_by: string[];
  coverage_status: 'Complete' | 'Partial' | 'Missing';
}

export interface RiskAssessment {
  risk: string;
  severity: 'High' | 'Medium' | 'Low';
  mitigation: string;
}

export interface SQLTestCaseAnalysis {
  work_item_id: number;
  executive_summary: string;
  affected_objects: AffectedObject[];
  assumptions_conflicts: string[];
  test_cases: SQLTestCase[];
  test_data_matrix: Record<string, string>;
  sql_test_scripts: Record<string, string>;
  acceptance_criteria_mapping: AcceptanceCriteriaMapping[];
  risk_assessment: RiskAssessment[];
  automation_plan: {
    priority_tests: string[];
    tools: string[];
    ci_gates: string[];
  };
  release_checklist: string[];
}

// ============================================================================
// COMPREHENSIVE SQL TEST CASE GENERATOR
// ============================================================================

export class SQLTestCaseComprehensiveGenerator {
  private adoClient: AzureDevOpsClient;
  private sqlClient: SqlServerClient | null;
  private codeAnalyzer: SqlCodeAnalyzer;
  private outputDir: string;
  private sqlScriptsDir: string;

  constructor(outputDir: string = 'src/features/sqlserver', sqlScriptsDir: string = 'src/features/sqlserver/sql-scripts') {
    this.adoClient = new AzureDevOpsClient();
    this.codeAnalyzer = new SqlCodeAnalyzer(this.adoClient);
    this.outputDir = outputDir;
    this.sqlScriptsDir = sqlScriptsDir;
    
    // Initialize SQL client (may fail if not configured)
    try {
      this.sqlClient = new SqlServerClient();
    } catch (error) {
      logger.warn('SQL Server client not available. Database structure analysis will be limited.');
      this.sqlClient = null;
    }
    
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    if (!fs.existsSync(this.sqlScriptsDir)) {
      fs.mkdirSync(this.sqlScriptsDir, { recursive: true });
    }
  }

  /**
   * Main entry point: Analyze work item and generate comprehensive SQL test cases
   */
  public async generateSQLTestCases(workItemId: number): Promise<SQLTestCaseAnalysis> {
    logger.info(`🔍 Starting comprehensive analysis for work item ${workItemId}`);
    
    // Step 1: Fetch work item and extract core fields
    const workItem = await this.adoClient.getWorkItem(workItemId, true);
    const coreFields = this.extractCoreFields(workItem);
    
    // Step 2: Extract and consolidate all comments
    const comments = await this.extractComments(workItemId);
    
    // Step 3: Enumerate and process all links
    const links = await this.processLinks(workItem);
    
    // Step 4: Download and inspect all attachments
    const attachments = await this.processAttachments(workItemId);
    
    // Step 5: Analyze PR diffs and SQL attachments for code changes
    const codeChanges = await this.analyzeCodeChanges(workItem, links.prLinks, attachments.sqlFiles);
    
    // Step 6: Get database structure context
    const dbContext = await this.getDatabaseContext(codeChanges);
    
    // Step 7: Correlate all information and build understanding
    const understanding = this.buildUnderstanding(coreFields, comments, links, attachments, codeChanges, dbContext);
    
    // Step 8: Generate comprehensive test cases
    const testCases = this.generateTestCases(understanding, codeChanges, dbContext);
    
    // Step 9: Generate SQL test scripts
    const sqlScripts = this.generateSqlTestScripts(testCases, understanding);
    
    // Step 10: Build comprehensive analysis
    const analysis = this.buildSQLTestCaseAnalysis(
      workItemId,
      coreFields,
      understanding,
      codeChanges,
      testCases,
      sqlScripts,
      comments,
      links,
      attachments
    );
    
    // Step 11: Save outputs
    await this.saveOutputs(analysis, sqlScripts);
    
    logger.info(`✅ Comprehensive analysis complete for work item ${workItemId}`);
    return analysis;
  }

  /**
   * Extract core fields from work item
   */
  private extractCoreFields(workItem: AzureDevOpsWorkItem): any {
    return {
      id: workItem.id,
      title: workItem.fields['System.Title'] || '',
      description: workItem.fields['System.Description'] || '',
      acceptanceCriteria: this.extractAcceptanceCriteria(workItem),
      areaPath: workItem.fields['System.AreaPath'] || '',
      iterationPath: workItem.fields['System.IterationPath'] || '',
      priority: workItem.fields['Microsoft.VSTS.Common.Priority'] || '',
      state: workItem.fields['System.State'] || '',
      tags: (workItem.fields['System.Tags'] || '').split(';').filter((t: string) => t.trim()),
      workItemType: workItem.fields['System.WorkItemType'] || '',
      assignedTo: workItem.fields['System.AssignedTo'] || null,
      createdDate: workItem.fields['System.CreatedDate'] || '',
      changedDate: workItem.fields['System.ChangedDate'] || '',
    };
  }

  /**
   * Extract acceptance criteria from description or custom field
   */
  private extractAcceptanceCriteria(workItem: AzureDevOpsWorkItem): string[] {
    const description = workItem.fields['System.Description'] || '';
    const criteria: string[] = [];
    
    // Look for acceptance criteria patterns
    const patterns = [
      /Acceptance\s+Criteria?:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/gi,
      /AC:?\s*\n([\s\S]*?)(?=\n\n|\n[A-Z]|$)/gi,
      /Given\s+([\s\S]*?)(?=\n\n|$)/gi,
    ];
    
    patterns.forEach(pattern => {
      const matches = description.matchAll(pattern);
      for (const match of matches) {
        const text = match[1] || match[0];
        const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
        criteria.push(...lines);
      }
    });
    
    // Also check custom fields
    const customField = workItem.fields['Microsoft.VSTS.Common.AcceptanceCriteria'] || 
                       workItem.fields['Custom.AcceptanceCriteria'] || '';
    if (customField) {
      criteria.push(customField);
    }
    
    return criteria.filter((c: string, i: number, arr: string[]) => arr.indexOf(c) === i); // Remove duplicates
  }

  /**
   * Extract and consolidate all comments
   */
  private async extractComments(workItemId: number): Promise<Array<{author: string, timestamp: string, message: string, flags: string[]}>> {
    try {
      // Azure DevOps API for comments
      const org = (this.adoClient as any).organization;
      const project = (this.adoClient as any).project;
      const client = (this.adoClient as any).client;
      
      const { data } = await client.get(
        `/${org}/${project}/_apis/wit/workitems/${workItemId}/comments`,
        {
          params: {
            'api-version': '7.1-preview.3',
          },
        }
      );
      
      const comments: Array<{author: string, timestamp: string, message: string, flags: string[]}> = [];
      
      if (data.comments) {
        for (const comment of data.comments) {
          const flags: string[] = [];
          const message = comment.text || '';
          
          // Flag important comments
          if (message.toLowerCase().includes('clarification') || 
              message.toLowerCase().includes('assumption') ||
              message.toLowerCase().includes('note:')) {
            flags.push('clarification');
          }
          if (message.toLowerCase().includes('manual test') || 
              message.toLowerCase().includes('test steps')) {
            flags.push('manual_test_steps');
          }
          
          comments.push({
            author: comment.createdBy?.displayName || 'Unknown',
            timestamp: comment.createdDate || '',
            message,
            flags,
          });
        }
      }
      
      return comments;
    } catch (error: any) {
      logger.warn(`Could not fetch comments: ${error.message}`);
      return [];
    }
  }

  /**
   * Process all links in work item
   */
  private async processLinks(workItem: AzureDevOpsWorkItem): Promise<{
    prLinks: string[];
    commits: any[];
    linkedWorkItems: any[];
    testCases: any[];
  }> {
    const prLinks: string[] = [];
    const commits: any[] = [];
    const linkedWorkItems: any[] = [];
    const testCases: any[] = [];
    
    // Get PR links
    const prs = await this.adoClient.getPullRequestLinks(workItem.id);
    prLinks.push(...prs);
    
    // Process relations
    if ((workItem as any).relations) {
      for (const relation of (workItem as any).relations) {
        if (relation.rel === 'ArtifactLink') {
          // Check for commits
          if (relation.url?.includes('/Commit/')) {
            commits.push(relation);
          }
          // Check for test cases
          if (relation.url?.includes('/TestManagement/')) {
            testCases.push(relation);
          }
        } else if (relation.rel?.includes('LinkTypes')) {
          // Linked work items
          const workItemMatch = relation.url?.match(/workItems\/(\d+)/);
          if (workItemMatch) {
            try {
              const linkedWI = await this.adoClient.getWorkItem(parseInt(workItemMatch[1], 10));
              linkedWorkItems.push({
                id: linkedWI.id,
                title: linkedWI.fields['System.Title'],
                type: linkedWI.fields['System.WorkItemType'],
                relation: relation.rel,
              });
            } catch (error) {
              // Skip if can't fetch
            }
          }
        }
      }
    }
    
    return { prLinks, commits, linkedWorkItems, testCases };
  }

  /**
   * Download and inspect all attachments
   */
  private async processAttachments(workItemId: number): Promise<{
    sqlFiles: Array<{name: string, content: string, path: string}>;
    spreadsheets: Array<{name: string, path: string}>;
    documents: Array<{name: string, path: string}>;
  }> {
    const sqlFiles: Array<{name: string, content: string, path: string}> = [];
    const spreadsheets: Array<{name: string, path: string}> = [];
    const documents: Array<{name: string, path: string}> = [];
    
    try {
      const workItem = await this.adoClient.getWorkItem(workItemId, true);
      
      if ((workItem as any).relations) {
        for (const relation of (workItem as any).relations) {
          if (relation.rel === 'AttachedFile' && relation.url) {
            const attachmentId = relation.url.match(/attachments\/([^/?]+)/)?.[1];
            if (attachmentId) {
              try {
                const org = (this.adoClient as any).organization;
                const project = (this.adoClient as any).project;
                const client = (this.adoClient as any).client;
                
                const { data } = await client.get(
                  `/${org}/${project}/_apis/wit/attachments/${attachmentId}`,
                  {
                    responseType: 'arraybuffer',
                    params: {
                      'api-version': '7.1',
                    },
                  }
                );
                
                const fileName = relation.attributes?.name || `attachment_${attachmentId}`;
                const filePath = path.join(this.sqlScriptsDir, `SQL-${workItemId}-${fileName}`);
                
                fs.writeFileSync(filePath, Buffer.from(data));
                
                // Categorize by extension
                if (fileName.toLowerCase().endsWith('.sql')) {
                  sqlFiles.push({
                    name: fileName,
                    content: Buffer.from(data).toString('utf-8'),
                    path: filePath,
                  });
                } else if (fileName.match(/\.(xlsx?|csv)$/i)) {
                  spreadsheets.push({ name: fileName, path: filePath });
                } else if (fileName.match(/\.(pdf|docx?|md|txt)$/i)) {
                  documents.push({ name: fileName, path: filePath });
                }
              } catch (error: any) {
                logger.warn(`Could not download attachment ${attachmentId}: ${error.message}`);
              }
            }
          }
        }
      }
    } catch (error: any) {
      logger.warn(`Could not process attachments: ${error.message}`);
    }
    
    return { sqlFiles, spreadsheets, documents };
  }

  /**
   * Analyze code changes from PRs and SQL attachments
   */
  private async analyzeCodeChanges(
    workItem: AzureDevOpsWorkItem,
    prLinks: string[],
    sqlAttachments: Array<{name: string, content: string, path: string}>
  ): Promise<{
    prChanges: SqlChange[];
    attachmentChanges: SqlChange[];
    allChanges: SqlChange[];
  }> {
    const prChanges: SqlChange[] = [];
    const attachmentChanges: SqlChange[] = [];
    
    // Analyze PR changes
    for (const prLink of prLinks) {
      const prIdMatch = prLink.match(/pullrequest\/(\d+)/i);
      if (prIdMatch) {
        const prId = parseInt(prIdMatch[1], 10);
        try {
          const fileChanges = await this.adoClient.getPullRequestChanges(prId);
          const enrichedChanges = await this.enrichFileChangesWithContent(fileChanges, prId);
          const changes = this.codeAnalyzer.analyzeChanges(enrichedChanges);
          prChanges.push(...changes);
        } catch (error: any) {
          logger.warn(`Could not analyze PR ${prId}: ${error.message}`);
        }
      }
    }
    
    // Analyze SQL attachments
    for (const sqlFile of sqlAttachments) {
      try {
        const change: SqlChange = {
          filePath: sqlFile.path,
          changeType: 'added',
          sqlType: 'script',
          objectName: sqlFile.name.replace(/\.sql$/i, ''),
          schema: 'dbo',
          content: sqlFile.content,
          performanceIndicators: [],
          affectedTables: this.codeAnalyzer['extractTables'](sqlFile.content),
          affectedColumns: this.codeAnalyzer['extractColumns'](sqlFile.content),
        };
        attachmentChanges.push(change);
      } catch (error: any) {
        logger.warn(`Could not analyze SQL attachment ${sqlFile.name}: ${error.message}`);
      }
    }
    
    const allChanges = [...prChanges, ...attachmentChanges];
    
    return { prChanges, attachmentChanges, allChanges };
  }

  /**
   * Enrich file changes with content
   */
  private async enrichFileChangesWithContent(fileChanges: any[], prId: number): Promise<any[]> {
    if (fileChanges.length === 0) {
      return fileChanges;
    }
    
    // Get repository ID
    const repos = await this.adoClient.getRepositories();
    if (repos.length === 0) {
      return fileChanges;
    }
    
    const repositoryId = repos.find((r: any) => r.name.toLowerCase() === (this.adoClient as any).project?.toLowerCase())?.id || repos[0].id;
    
    // Get PR details to find source commit
    let sourceCommitId: string | undefined;
    try {
      const pr = await this.adoClient.getPullRequest(prId, repositoryId);
      sourceCommitId = pr.lastMergeSourceCommit?.commitId || pr.sourceRefName?.replace('refs/heads/', '');
    } catch (error: any) {
      logger.warn(`Could not get PR details: ${error.message}`);
    }
    
    // Fetch content for SQL files that need it
    const sqlFilesNeedingContent = fileChanges.filter(change => {
      const filePath = change.item?.path || change.path || change.sourceServerItem || '';
      const hasContent = !!(change.newContent || change.content || change.contentAfter);
      return filePath && this.codeAnalyzer['isSqlFile'](filePath) && !hasContent;
    });
    
    // Fetch content in parallel (limit to 20)
    const fetchPromises = sqlFilesNeedingContent.slice(0, 20).map(async (change) => {
      const filePath = change.item?.path || change.path || change.sourceServerItem;
      
      if (!filePath || !sourceCommitId) {
        return change;
      }
      
      try {
        const content = await this.adoClient.getFileContent(repositoryId, filePath, sourceCommitId);
        if (content) {
          change.content = content;
          change.newContent = content;
          change.contentAfter = content;
        }
      } catch (error: any) {
        logger.warn(`Could not fetch content for ${filePath}: ${error.message}`);
      }
      
      return change;
    });
    
    if (fetchPromises.length > 0) {
      await Promise.all(fetchPromises);
    }
    
    return fileChanges;
  }

  /**
   * Get database context for affected objects
   */
  private async getDatabaseContext(codeChanges: {allChanges: SqlChange[]}): Promise<Record<string, any>> {
    const context: Record<string, any> = {};
    
    if (!this.sqlClient) {
      return context;
    }
    
    // Get structure for each affected table
    for (const change of codeChanges.allChanges) {
      if (change.sqlType === 'table' && change.affectedTables.length > 0) {
        for (const table of change.affectedTables) {
          if (!context[table]) {
            try {
              // Query INFORMATION_SCHEMA for table structure
              const columns = await this.sqlClient.queryMany(
                `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, CHARACTER_MAXIMUM_LENGTH
                 FROM INFORMATION_SCHEMA.COLUMNS
                 WHERE TABLE_NAME = @tableName
                 ORDER BY ORDINAL_POSITION`,
                { tableName: table }
              );
              
              const constraints = await this.sqlClient.queryMany(
                `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE
                 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                 WHERE TABLE_NAME = @tableName`,
                { tableName: table }
              );
              
              context[table] = {
                columns: columns || [],
                constraints: constraints || [],
              };
            } catch (error: any) {
              logger.warn(`Could not get structure for table ${table}: ${error.message}`);
            }
          }
        }
      }
    }
    
    return context;
  }

  /**
   * Build understanding from all collected information
   */
  private buildUnderstanding(
    coreFields: any,
    comments: any[],
    links: any,
    attachments: any,
    codeChanges: any,
    dbContext: any
  ): any {
    return {
      coreFields,
      comments,
      links,
      attachments,
      codeChanges,
      dbContext,
      conflicts: this.identifyConflicts(coreFields, comments, codeChanges),
      assumptions: this.extractAssumptions(comments, coreFields),
    };
  }

  /**
   * Identify conflicts between different sources
   */
  private identifyConflicts(coreFields: any, comments: any[], codeChanges: any): string[] {
    const conflicts: string[] = [];
    
    // Check for conflicts between acceptance criteria and code changes
    const acceptanceCriteria = coreFields.acceptanceCriteria || [];
    const description = coreFields.description || '';
    const allChanges = codeChanges.allChanges || [];
    
    // Check if acceptance criteria mentions specific objects that aren't in code changes
    for (const criterion of acceptanceCriteria) {
      const mentionedProcedures = this.extractProcedureNames(criterion, criterion.toLowerCase());
      const mentionedTables = this.extractTableNames(criterion.toLowerCase(), mentionedProcedures);
      
      const foundTables = mentionedTables.filter((table: string) => 
        !allChanges.some((change: SqlChange) => 
          change.affectedTables.includes(table) || 
          change.objectName.toLowerCase() === table.toLowerCase()
        )
      );
      
      if (foundTables.length > 0) {
        conflicts.push(`Acceptance criterion mentions table(s) ${foundTables.join(', ')} but these are not found in code changes`);
      }
    }
    
    // Check if code changes include objects not mentioned in description/acceptance criteria
    for (const change of allChanges) {
      if (change.affectedTables.length > 0) {
        const table = change.affectedTables[0];
        if (!description.toLowerCase().includes(table.toLowerCase()) &&
            !acceptanceCriteria.some((ac: string) => ac.toLowerCase().includes(table.toLowerCase()))) {
          conflicts.push(`Code changes affect table ${table} but it's not mentioned in description or acceptance criteria`);
        }
      }
    }
    
    return conflicts;
  }

  /**
   * Extract table names from text (excluding names that are part of procedure names)
   */
  private extractTableNames(text: string, procedures: string[]): string[] {
    const tables: string[] = [];
    const patterns = [
      /table\s+['"]?([A-Za-z][A-Za-z0-9_]*)['"]?/gi,
      /\[([A-Za-z][A-Za-z0-9_]*)\]/g,
      /from\s+['"]?([A-Za-z][A-Za-z0-9_]*)['"]?\s*(?:where|join|group|order)/gi,
      /into\s+['"]?([A-Za-z][A-Za-z0-9_]*)['"]?/gi,
      /update\s+['"]?([A-Za-z][A-Za-z0-9_]*)['"]?/gi,
      /delete\s+from\s+['"]?([A-Za-z][A-Za-z0-9_]*)['"]?/gi,
    ];
    
    // Create a set of procedure name parts to exclude (e.g., "d365" from "D365SPCreatetFXAmount")
    const procedureParts = new Set<string>();
    procedures.forEach(proc => {
      // Split procedure name by capital letters and common patterns
      const parts = proc.split(/(?=[A-Z])|SP|sp/).filter(p => p && p.length > 2);
      parts.forEach(part => procedureParts.add(part.toLowerCase()));
      // Also add the full lowercase name
      procedureParts.add(proc.toLowerCase());
    });
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const tableName = match[1];
        // Filter out common false positives and procedure name parts
        if (tableName && 
            tableName.length > 2 && 
            !tables.includes(tableName) &&
            !procedureParts.has(tableName.toLowerCase()) &&
            !['select', 'where', 'from', 'into', 'update', 'delete', 'insert'].includes(tableName.toLowerCase())) {
          tables.push(tableName);
        }
      }
    });
    
    return tables;
  }

  /**
   * Extract procedure names from text (preserve original case for better matching)
   */
  private extractProcedureNames(originalText: string, lowerText: string): string[] {
    const procedures: string[] = [];
    
    // First, try to match full procedure names with patterns like "D365SPCreatetFXAmount"
    // These patterns work better on original case text
    const caseSensitivePatterns = [
      // Match full patterns like "D365SPCreatetFXAmount" (most specific first)
      /(?:\[?([A-Z][A-Za-z0-9]*SP[A-Z][A-Za-z0-9]*)\]?)/g,
      /(?:\[?([A-Z][A-Za-z0-9]*\.SP[A-Z][A-Za-z0-9]*)\]?)/g,
      // Match patterns like "SPCreatetFXAmount" or "SPCreateFXAmount"
      /(?:\[?SP([A-Z][A-Za-z0-9]+)\]?)/g,
      // Match explicit procedure references like "procedure D365SPCreatetFXAmount" or "[D365].[SPCreatetFXAmount]"
      /(?:stored\s+)?procedure\s+\[?([A-Z][A-Za-z0-9_]*)\]?/gi,
      /\[([A-Z][A-Za-z0-9_]*)\]\s*\.\s*\[SP[A-Z][A-Za-z0-9_]*\]/g,
      /\[([A-Z][A-Za-z0-9_]*SP[A-Z][A-Za-z0-9_]*)\]/g,
    ];
    
    caseSensitivePatterns.forEach(pattern => {
      const matches = originalText.matchAll(pattern);
      for (const match of matches) {
        let procName = match[1] || match[0];
        // Handle "SPCreatetFXAmount" pattern (match[1] is "CreatetFXAmount", need to add "SP" prefix)
        if (pattern.source.includes('SP([A-Z]') && !procName.toUpperCase().startsWith('SP')) {
          procName = 'SP' + procName;
        }
        // Remove schema prefix if present (e.g., "D365.SPCreatetFXAmount" -> "SPCreatetFXAmount")
        if (procName.includes('.')) {
          const parts = procName.split('.');
          procName = parts[parts.length - 1];
        }
        // Filter out common false positives and ensure it's a valid procedure name
        if (procName && 
            procName.length > 3 && 
            !procedures.includes(procName) &&
            !procedures.some(p => p.toLowerCase() === procName.toLowerCase()) &&
            !procedures.some(p => procName.toLowerCase().includes(p.toLowerCase()) && procName.length > p.length) &&
            !['table', 'column', 'index', 'view', 'trigger'].includes(procName.toLowerCase())) {
          // Remove any procedures that are substrings of this one
          const filtered = procedures.filter(p => !procName.toLowerCase().includes(p.toLowerCase()) || procName.length <= p.length);
          procedures.length = 0;
          procedures.push(...filtered);
          procedures.push(procName);
        }
      }
    });
    
    // Then try case-insensitive patterns on lowercased text
    const caseInsensitivePatterns = [
      /(?:stored\s+)?procedure\s+([a-z][a-z0-9_]*)/gi,
      /sp\s+([a-z][a-z0-9_]*)/gi,
      /(?:sp|proc|procedure)\s*['"]?([a-z][a-z0-9_]*)['"]?/gi,
    ];
    
    caseInsensitivePatterns.forEach(pattern => {
      const matches = lowerText.matchAll(pattern);
      for (const match of matches) {
        const procName = match[1];
        if (procName && 
            procName.length > 3 && 
            !procedures.some(p => p.toLowerCase() === procName.toLowerCase()) &&
            !['table', 'column', 'index', 'view', 'trigger'].includes(procName)) {
          // Try to find the original case version in the original text
          const originalMatch = originalText.match(new RegExp(`\\b${procName}\\b`, 'i'));
          if (originalMatch) {
            procedures.push(originalMatch[0]);
          } else {
            procedures.push(procName);
          }
        }
      }
    });
    
    return procedures;
  }

  /**
   * Extract assumptions from comments and description
   */
  private extractAssumptions(comments: any[], coreFields: any): string[] {
    const assumptions: string[] = [];
    
    // Look for assumption patterns in comments
    comments.forEach(comment => {
      if (comment.message.toLowerCase().includes('assume') ||
          comment.message.toLowerCase().includes('assuming')) {
        assumptions.push(comment.message);
      }
    });
    
    return assumptions;
  }

  /**
   * Generate comprehensive test cases across all categories
   */
  private generateTestCases(understanding: any, codeChanges: any, dbContext: any): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let tcCounter = 1;
    const workItemId = understanding.coreFields.id;
    const allChanges = codeChanges.allChanges || [];
    
    // Extract SQL objects from work item content if no PR changes found
    const extractedObjects = this.extractSQLObjectsFromWorkItem(understanding);
    
    // Merge extracted objects with PR changes
    const enrichedChanges = this.enrichChangesWithWorkItemContent(allChanges, extractedObjects, understanding);
    
    // 1. Schema & DDL tests (with positive and negative scenarios)
    const schemaTests = this.generateSchemaDDLTests(workItemId, enrichedChanges, dbContext, understanding, tcCounter);
    testCases.push(...schemaTests);
    tcCounter += schemaTests.length;
    
    // 2. Constraint & Referential Integrity tests
    const constraintTests = this.generateConstraintTests(workItemId, enrichedChanges, dbContext, understanding, tcCounter);
    testCases.push(...constraintTests);
    tcCounter += constraintTests.length;
    
    // 3. Stored Procedure / Function unit tests (with positive and negative scenarios)
    const procedureTests = this.generateProcedureTests(workItemId, enrichedChanges, understanding, tcCounter);
    testCases.push(...procedureTests);
    tcCounter += procedureTests.length;
    
    // 4. Data Migration / Backfill tests
    const migrationTests = this.generateMigrationTests(workItemId, enrichedChanges, understanding, tcCounter);
    testCases.push(...migrationTests);
    tcCounter += migrationTests.length;
    
    // 5. Index & Performance checks
    const performanceTests = this.generatePerformanceTests(workItemId, enrichedChanges, understanding, tcCounter);
    testCases.push(...performanceTests);
    tcCounter += performanceTests.length;
    
    // 6. Trigger & Side-effect tests
    const triggerTests = this.generateTriggerTests(workItemId, enrichedChanges, understanding, tcCounter);
    testCases.push(...triggerTests);
    tcCounter += triggerTests.length;
    
    // 7. Security & Permissions tests
    const securityTests = this.generateSecurityTests(workItemId, enrichedChanges, understanding, tcCounter);
    testCases.push(...securityTests);
    tcCounter += securityTests.length;
    
    // 8. Integration tests
    const integrationTests = this.generateIntegrationTests(workItemId, enrichedChanges, understanding, tcCounter);
    testCases.push(...integrationTests);
    tcCounter += integrationTests.length;
    
    // 9. Regression tests
    const regressionTests = this.generateRegressionTests(workItemId, enrichedChanges, understanding, tcCounter);
    testCases.push(...regressionTests);
    tcCounter += regressionTests.length;
    
    // 10. Rollback & Upgrade safety tests
    const rollbackTests = this.generateRollbackTests(workItemId, enrichedChanges, understanding, tcCounter);
    testCases.push(...rollbackTests);
    tcCounter += rollbackTests.length;
    
    // 11. Generate test cases from acceptance criteria if we have very few test cases
    if (testCases.length < 3) {
      const acTests = this.generateTestCasesFromAcceptanceCriteria(workItemId, understanding, tcCounter);
      testCases.push(...acTests);
    }
    
    return testCases;
  }

  /**
   * Extract SQL objects from work item description, title, and acceptance criteria
   */
  private extractSQLObjectsFromWorkItem(understanding: any): {
    tables: string[];
    procedures: string[];
    columns: string[];
    databases: string[];
    views: string[];
  } {
    const coreFields = understanding.coreFields;
    const title = coreFields.title || '';
    const description = coreFields.description || '';
    const acceptanceCriteria = coreFields.acceptanceCriteria || [];
    
    const fullText = `${title} ${description} ${acceptanceCriteria.join(' ')}`;
    const fullTextLower = fullText.toLowerCase();
    
    // Extract procedures FIRST (before lowercasing, to preserve case-sensitive patterns)
    // This is important for patterns like "D365SPCreatetFXAmount" which should be recognized as one procedure
    const procedures = this.extractProcedureNames(fullText, fullTextLower);
    
    // Extract tables (but exclude any that are part of procedure names)
    const tables = this.extractTableNames(fullTextLower, procedures);
    
    // Extract columns
    const columns = this.extractColumnNames(fullTextLower, description);
    
    // Extract databases
    const databases = this.extractDatabaseNames(fullTextLower);
    
    // Extract views
    const views = this.extractViewNames(fullTextLower);
    
    return { tables, procedures, columns, databases, views };
  }

  /**
   * Extract column names from text
   */
  private extractColumnNames(text: string, description: string): string[] {
    const columns: string[] = [];
    const patterns = [
      /column\s+['"]?([A-Za-z][A-Za-z0-9_]*)['"]?/gi,
      /column\s+([A-Za-z][A-Za-z0-9_]*)/gi,
      /\[([A-Za-z][A-Za-z0-9_]*)\]\s*[A-Za-z]/g, // [ColumnName] in brackets
    ];
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const colName = match[1];
        if (colName && !columns.includes(colName) && colName.length > 2) {
          columns.push(colName);
        }
      }
    });
    
    return columns;
  }

  /**
   * Extract database names
   */
  private extractDatabaseNames(text: string): string[] {
    const databases: string[] = [];
    const dbPatterns = [
      /\b(ODS|TDS|Reporting|D365|CM|d365|ods|tds|reporting)\b/gi,
      /database\s+['"]?([A-Za-z][A-Za-z0-9_]*)['"]?/gi,
    ];
    
    dbPatterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const dbName = match[1] || match[0];
        if (dbName && !databases.includes(dbName)) {
          databases.push(dbName);
        }
      }
    });
    
    return databases;
  }

  /**
   * Extract view names
   */
  private extractViewNames(text: string): string[] {
    const views: string[] = [];
    const patterns = [
      /view\s+['"]?([A-Za-z][A-Za-z0-9_]*)['"]?/gi,
      /vw([A-Za-z][A-Za-z0-9_]*)/gi,
    ];
    
    patterns.forEach(pattern => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const viewName = match[1] || match[0];
        if (viewName && !views.includes(viewName)) {
          views.push(viewName);
        }
      }
    });
    
    return views;
  }

  /**
   * Enrich changes with work item content
   */
  private enrichChangesWithWorkItemContent(
    prChanges: SqlChange[],
    extractedObjects: any,
    understanding: any
  ): SqlChange[] {
    const enriched: SqlChange[] = [...prChanges];
    
    // If no PR changes, create synthetic changes from extracted objects
    if (prChanges.length === 0) {
      const coreFields = understanding.coreFields;
      const title = coreFields.title || '';
      const description = coreFields.description || '';
      const fullText = `${title} ${description}`.toLowerCase();
      
      // Determine change type from work item content
      const isPerformance = fullText.includes('performance') || fullText.includes('optimiz');
      const isMigration = fullText.includes('migrate') || fullText.includes('backfill');
      const isProcedure = extractedObjects.procedures.length > 0 || fullText.includes('procedure') || fullText.includes('sp ');
      const isTable = extractedObjects.tables.length > 0 || fullText.includes('table');
      
      // Create changes for tables
      for (const table of extractedObjects.tables) {
        enriched.push({
          filePath: `work-item-${coreFields.id}`,
          changeType: 'added',
          sqlType: 'table',
          objectName: table,
          schema: 'dbo',
          content: description,
          performanceIndicators: isPerformance ? ['performance'] : [],
          affectedTables: [table],
          affectedColumns: extractedObjects.columns.filter((col: string) => 
            description.toLowerCase().includes(col.toLowerCase())
          ),
        });
      }
      
      // Create changes for procedures
      for (const proc of extractedObjects.procedures) {
        enriched.push({
          filePath: `work-item-${coreFields.id}`,
          changeType: 'modified',
          sqlType: 'procedure',
          objectName: proc,
          schema: 'dbo',
          content: description,
          performanceIndicators: isPerformance ? ['performance'] : [],
          affectedTables: extractedObjects.tables,
          affectedColumns: [],
        });
      }
      
      // If no specific objects found, create a generic change based on work item type
      if (enriched.length === 0) {
        // Try to extract object name from title
        // Look for patterns like "D365SPCreatetFXAmount" or "[D365].[SPCreatetFXAmount]"
        let objectName = '';
        let schema = 'dbo';
        
        // Try to match full procedure name like "D365SPCreatetFXAmount"
        const fullProcMatch = title.match(/([A-Z][A-Za-z0-9]*SP[A-Z][A-Za-z0-9]*)/);
        if (fullProcMatch) {
          objectName = fullProcMatch[1];
          // Check if it has schema prefix (e.g., "D365SPCreatetFXAmount" might be "[D365].[SPCreatetFXAmount]")
          if (objectName.includes('SP') && objectName.length > 10) {
            const spIndex = objectName.indexOf('SP');
            const possibleSchema = objectName.substring(0, spIndex);
            const possibleProc = objectName.substring(spIndex);
            // If schema part looks like a schema name (short, uppercase), split it
            if (possibleSchema.length <= 10 && possibleSchema === possibleSchema.toUpperCase()) {
              schema = possibleSchema;
              objectName = possibleProc;
            }
          }
        } else {
          // Fallback: try CamelCase patterns
          const titleMatch = title.match(/(?:sp|procedure|proc|table|view)\s*([A-Za-z][A-Za-z0-9_]*)/i) ||
                            title.match(/([A-Z][a-z]+[A-Z][A-Za-z0-9_]*)/);
          objectName = titleMatch ? titleMatch[1] : title.substring(0, 50).replace(/[^A-Za-z0-9]/g, '_');
        }
        
        enriched.push({
          filePath: `work-item-${coreFields.id}`,
          changeType: 'modified',
          sqlType: isProcedure ? 'procedure' : isTable ? 'table' : 'script',
          objectName: objectName || title.substring(0, 50).replace(/[^A-Za-z0-9]/g, '_'),
          schema: schema,
          content: description,
          performanceIndicators: isPerformance ? ['performance'] : [],
          affectedTables: extractedObjects.tables.length > 0 ? extractedObjects.tables : [],
          affectedColumns: extractedObjects.columns,
        });
      }
    }
    
    return enriched;
  }

  /**
   * Generate test cases from acceptance criteria when no SQL objects found
   */
  private generateTestCasesFromAcceptanceCriteria(workItemId: number, understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    const coreFields = understanding.coreFields;
    const acceptanceCriteria = coreFields.acceptanceCriteria || [];
    const description = coreFields.description || '';
    const title = coreFields.title || '';
    
    // Generate test cases from each acceptance criterion
    acceptanceCriteria.forEach((criterion: string, index: number) => {
      if (criterion.trim().length < 10) return; // Skip very short criteria
      
      // POSITIVE: Acceptance criterion satisfied
      testCases.push({
        id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
        title: `Validate acceptance criterion: ${criterion.substring(0, 60)}${criterion.length > 60 ? '...' : ''}`,
        purpose: `Verify that acceptance criterion is met: ${criterion}`,
        preconditions: `Database connection available. Changes from work item ${workItemId} are deployed.`,
        steps: [
          `-- Execute validation queries based on acceptance criterion`,
          `-- Verify expected behavior matches criterion: ${criterion}`,
        ],
        expected_result: `Acceptance criterion is satisfied: ${criterion}`,
        test_data: '',
        priority: 'High',
        type: 'Integration',
        complexity: 'Moderate',
        cleanup: '',
        automation_notes: 'Requires mapping acceptance criterion to specific validation queries',
        source_references: [],
        category: 'Integration',
      });
      
      // NEGATIVE: Acceptance criterion edge case
      testCases.push({
        id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
        title: `Validate edge case for acceptance criterion: ${criterion.substring(0, 50)}${criterion.length > 50 ? '...' : ''}`,
        purpose: `Verify system handles edge cases related to: ${criterion}`,
        preconditions: `Database connection available. Edge case test data prepared.`,
        steps: [
          `-- Test edge case scenario (NULL values, boundary conditions, etc.)`,
          `-- Verify system handles edge case appropriately`,
        ],
        expected_result: `Edge case is handled correctly without errors`,
        test_data: 'Edge case test data',
        priority: 'Medium',
        type: 'Unit',
        complexity: 'Moderate',
        cleanup: 'Remove edge case test data',
        automation_notes: 'Requires edge case test data setup',
        source_references: [],
        category: 'Integration',
      });
    });
    
    // If no acceptance criteria, generate test cases from description
    if (testCases.length === 0 && description) {
      const descLower = description.toLowerCase();
      
      // Check for common patterns
      if (descLower.includes('performance') || descLower.includes('optimiz')) {
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate performance improvement for ${title}`,
          purpose: `Verify that performance improvements meet requirements`,
          preconditions: `Database connection available. Performance baseline established.`,
          steps: [
            `-- Execute queries/procedures related to ${title}`,
            `-- Measure execution time and resource usage`,
            `-- Compare with performance baseline`,
          ],
          expected_result: `Performance meets or exceeds baseline requirements`,
          test_data: '',
          priority: 'High',
          type: 'Performance',
          complexity: 'Complex',
          cleanup: '',
          automation_notes: 'Requires performance measurement and baseline comparison',
          source_references: [],
          category: 'Index & Performance',
        });
      }
      
      if (descLower.includes('data') && (descLower.includes('validat') || descLower.includes('integrity'))) {
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate data integrity for ${title}`,
          purpose: `Verify data integrity requirements are met`,
          preconditions: `Database connection available. Test data available.`,
          steps: [
            `-- Execute data validation queries`,
            `-- Verify data meets integrity requirements`,
          ],
          expected_result: `Data integrity is maintained`,
          test_data: '',
          priority: 'High',
          type: 'Integration',
          complexity: 'Moderate',
          cleanup: '',
          automation_notes: 'Requires data validation queries',
          source_references: [],
          category: 'Constraint & Referential Integrity',
        });
      }
    }
    
    return testCases;
  }

  /**
   * Generate Schema & DDL test cases with positive and negative scenarios
   */
  private generateSchemaDDLTests(workItemId: number, changes: SqlChange[], dbContext: any, understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    const coreFields = understanding.coreFields;
    const title = coreFields.title || '';
    const description = coreFields.description || '';
    
    for (const change of changes) {
      if (change.sqlType === 'table') {
        const tableName = change.objectName;
        const schema = change.schema;
        
        // POSITIVE: Table existence
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate ${schema}.${tableName} table exists`,
          purpose: `Verify table ${schema}.${tableName} exists after ${change.changeType}`,
          preconditions: `Database connection available. Table should be ${change.changeType === 'added' ? 'created' : change.changeType === 'modified' ? 'altered' : 'dropped'}.`,
          steps: [
            `SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${tableName}'`,
            `IF @@ROWCOUNT = 0 THROW 50000, 'Table ${schema}.${tableName} does not exist', 1`,
          ],
          expected_result: `Table ${schema}.${tableName} exists in database`,
          test_data: '',
          priority: 'High',
          type: 'Unit',
          complexity: 'Simple',
          cleanup: '',
          automation_notes: 'Can be automated with tSQLt.AssertObjectExists or INFORMATION_SCHEMA queries',
          source_references: [{
            file: path.basename(change.filePath),
            line_range: '1-100',
            url: change.filePath,
          }],
          category: 'Schema & DDL',
        });
        
        // NEGATIVE: Table should not exist in wrong schema
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate ${tableName} table does not exist in incorrect schema`,
          purpose: `Verify table ${tableName} is not accidentally created in wrong schema`,
          preconditions: `Database connection available`,
          steps: [
            `SELECT COUNT(*) AS TableCount FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA != '${schema}'`,
            `IF @@ROWCOUNT > 0 THROW 50000, 'Table ${tableName} found in unexpected schema', 1`,
          ],
          expected_result: `Table ${tableName} only exists in schema ${schema}`,
          test_data: '',
          priority: 'Medium',
          type: 'Unit',
          complexity: 'Simple',
          cleanup: '',
          automation_notes: 'Can be automated with INFORMATION_SCHEMA queries',
          source_references: [],
          category: 'Schema & DDL',
        });
        
        // Column structure validation (positive)
        if (change.affectedColumns.length > 0) {
          for (const column of change.affectedColumns) {
            // POSITIVE: Column exists with correct properties
            testCases.push({
              id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
              title: `Validate column ${column} exists in ${schema}.${tableName}`,
              purpose: `Verify column ${column} exists with correct data type and constraints`,
              preconditions: `Table ${schema}.${tableName} exists`,
              steps: [
                `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, CHARACTER_MAXIMUM_LENGTH`,
                `FROM INFORMATION_SCHEMA.COLUMNS`,
                `WHERE TABLE_SCHEMA = '${schema}' AND TABLE_NAME = '${tableName}' AND COLUMN_NAME = '${column}'`,
                `IF @@ROWCOUNT = 0 THROW 50000, 'Column ${column} does not exist', 1`,
              ],
              expected_result: `Column ${column} exists with expected data type and properties`,
              test_data: '',
              priority: 'High',
              type: 'Unit',
              complexity: 'Simple',
              cleanup: '',
              automation_notes: 'Can be automated with INFORMATION_SCHEMA.COLUMNS queries',
              source_references: [{
                file: path.basename(change.filePath),
                line_range: '1-100',
                url: change.filePath,
              }],
              category: 'Schema & DDL',
            });
            
            // NEGATIVE: Column should not accept invalid data
            testCases.push({
              id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
              title: `Validate column ${column} rejects invalid data types`,
              purpose: `Verify column ${column} enforces data type constraints`,
              preconditions: `Table ${schema}.${tableName} exists with column ${column}`,
              steps: [
                `-- Attempt to insert invalid data type (adjust based on column type)`,
                `-- Example: INSERT INTO ${schema}.${tableName} (${column}) VALUES ('invalid')`,
                `-- Should fail with data type conversion error`,
              ],
              expected_result: `Invalid data type is rejected with appropriate error`,
              test_data: '',
              priority: 'Medium',
              type: 'Unit',
              complexity: 'Moderate',
              cleanup: '',
              automation_notes: 'Requires test data setup and error handling validation',
              source_references: [],
              category: 'Schema & DDL',
            });
          }
        }
      }
    }
    
    return testCases;
  }

  /**
   * Generate Constraint & Referential Integrity test cases
   */
  private generateConstraintTests(workItemId: number, changes: SqlChange[], dbContext: any, understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    
    for (const change of changes) {
      if (change.content?.toUpperCase().includes('CONSTRAINT') || 
          change.content?.toUpperCase().includes('FOREIGN KEY') ||
          change.content?.toUpperCase().includes('PRIMARY KEY')) {
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate constraints on ${change.schema}.${change.objectName}`,
          purpose: `Verify all constraints (PK, FK, UNIQUE, CHECK) are correctly defined`,
          preconditions: `Table ${change.schema}.${change.objectName} exists`,
          steps: [
            `SELECT CONSTRAINT_NAME, CONSTRAINT_TYPE FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS`,
            `WHERE TABLE_SCHEMA = '${change.schema}' AND TABLE_NAME = '${change.objectName}'`,
            `-- Verify expected constraints exist`,
          ],
          expected_result: 'All expected constraints are present and correctly defined',
          test_data: '',
          priority: 'High',
          type: 'Unit',
          complexity: 'Moderate',
          cleanup: '',
          automation_notes: 'Can be automated with INFORMATION_SCHEMA.TABLE_CONSTRAINTS queries',
          source_references: [{
            file: change.filePath,
            line_range: '1-100',
            url: '',
          }],
          category: 'Constraint & Referential Integrity',
        });
      }
    }
    
    return testCases;
  }

  /**
   * Generate Stored Procedure / Function test cases with positive and negative scenarios
   */
  private generateProcedureTests(workItemId: number, changes: SqlChange[], understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    const coreFields = understanding.coreFields;
    const title = coreFields.title || '';
    const description = coreFields.description || '';
    
    for (const change of changes) {
      if (change.sqlType === 'procedure' || change.sqlType === 'function') {
        const procName = change.objectName;
        const schema = change.schema;
        const isPerformance = title.toLowerCase().includes('performance') || description.toLowerCase().includes('performance');
        
        // POSITIVE: Procedure exists
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate ${schema}.${procName} ${change.sqlType} exists`,
          purpose: `Verify ${change.sqlType} ${schema}.${procName} exists and can be executed`,
          preconditions: `Database connection available`,
          steps: [
            `SELECT OBJECT_SCHEMA_NAME(OBJECT_ID('${schema}.${procName}')) AS SchemaName,`,
            `       OBJECT_NAME(OBJECT_ID('${schema}.${procName}')) AS ObjectName`,
            `IF OBJECT_ID('${schema}.${procName}', '${change.sqlType === 'procedure' ? 'P' : 'FN'}') IS NULL`,
            `  THROW 50000, '${change.sqlType} ${schema}.${procName} does not exist', 1`,
          ],
          expected_result: `${change.sqlType} exists and is accessible`,
          test_data: '',
          priority: 'High',
          type: 'Unit',
          complexity: 'Simple',
          cleanup: '',
          automation_notes: 'Can be automated with OBJECT_ID checks. For execution tests, use tSQLt or parameterized test data',
          source_references: [{
            file: path.basename(change.filePath),
            line_range: '1-100',
            url: change.filePath,
          }],
          category: 'Stored Procedure / Function',
        });
        
        // POSITIVE: Procedure executes successfully with valid parameters
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate ${schema}.${procName} executes successfully with valid input`,
          purpose: `Verify ${change.sqlType} ${schema}.${procName} executes without errors when provided valid parameters`,
          preconditions: `${change.sqlType} ${schema}.${procName} exists. Valid test data available.`,
          steps: [
            `-- Execute ${change.sqlType} with valid parameters`,
            `-- Example: EXEC ${schema}.${procName} @param1 = 'value1', @param2 = 'value2'`,
            `-- Verify execution completes without errors`,
            `-- Verify expected results are returned`,
          ],
          expected_result: `${change.sqlType} executes successfully and returns expected results`,
          test_data: 'Valid test parameters based on procedure signature',
          priority: 'High',
          type: 'Unit',
          complexity: 'Moderate',
          cleanup: 'Clean up any test data created by procedure execution',
          automation_notes: 'Can be automated with tSQLt or direct EXEC calls with assertions',
          source_references: [],
          category: 'Stored Procedure / Function',
        });
        
        // NEGATIVE: Procedure handles null parameters correctly
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate ${schema}.${procName} handles NULL parameters correctly`,
          purpose: `Verify ${change.sqlType} ${schema}.${procName} handles NULL input parameters appropriately`,
          preconditions: `${change.sqlType} ${schema}.${procName} exists`,
          steps: [
            `-- Execute ${change.sqlType} with NULL parameters`,
            `-- Verify either: procedure handles NULL gracefully OR returns appropriate error`,
            `-- Example: EXEC ${schema}.${procName} @param1 = NULL`,
          ],
          expected_result: `Procedure either handles NULL gracefully or returns clear error message`,
          test_data: '',
          priority: 'Medium',
          type: 'Unit',
          complexity: 'Moderate',
          cleanup: '',
          automation_notes: 'Requires testing with NULL values and error handling validation',
          source_references: [],
          category: 'Stored Procedure / Function',
        });
        
        // NEGATIVE: Procedure rejects invalid parameters
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate ${schema}.${procName} rejects invalid input parameters`,
          purpose: `Verify ${change.sqlType} ${schema}.${procName} validates input and rejects invalid data`,
          preconditions: `${change.sqlType} ${schema}.${procName} exists`,
          steps: [
            `-- Execute ${change.sqlType} with invalid parameters (wrong type, out of range, etc.)`,
            `-- Example: EXEC ${schema}.${procName} @param1 = 'invalid', @param2 = -1`,
            `-- Verify procedure returns appropriate validation error`,
          ],
          expected_result: `Invalid parameters are rejected with clear error message`,
          test_data: 'Invalid test parameters (wrong types, out of range values)',
          priority: 'Medium',
          type: 'Unit',
          complexity: 'Moderate',
          cleanup: '',
          automation_notes: 'Requires testing with various invalid inputs',
          source_references: [],
          category: 'Stored Procedure / Function',
        });
        
        // Performance test if work item mentions performance
        if (isPerformance) {
          testCases.push({
            id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
            title: `Validate ${schema}.${procName} performance improvement`,
            purpose: `Verify ${change.sqlType} ${schema}.${procName} executes within acceptable performance thresholds`,
            preconditions: `${change.sqlType} ${schema}.${procName} exists. Performance baseline established.`,
            steps: [
              `-- Execute ${change.sqlType} and measure execution time`,
              `-- Compare with performance baseline`,
              `-- Verify execution time meets performance requirements`,
            ],
            expected_result: `Procedure execution time is within acceptable limits`,
            test_data: '',
            priority: 'High',
            type: 'Performance',
            complexity: 'Complex',
            cleanup: '',
            automation_notes: 'Requires performance measurement tools and baseline comparison',
            source_references: [],
            category: 'Index & Performance',
          });
        }
      }
    }
    
    return testCases;
  }

  /**
   * Generate Data Migration / Backfill test cases
   */
  private generateMigrationTests(workItemId: number, changes: SqlChange[], understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    
    // Check if any changes involve migration
    const hasMigration = changes.some(c => 
      c.content?.toLowerCase().includes('migrate') ||
      c.content?.toLowerCase().includes('backfill') ||
      c.content?.toLowerCase().includes('update') && c.content?.toLowerCase().includes('set')
    );
    
    if (hasMigration) {
      testCases.push({
        id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
        title: 'Validate data migration row count parity',
        purpose: 'Verify that row counts match before and after migration',
        preconditions: 'Source and target tables exist. Migration script has been executed.',
        steps: [
          `-- Get source row count (adjust table names as needed)`,
          `DECLARE @SourceCount INT = (SELECT COUNT(*) FROM [SourceTable])`,
          `DECLARE @TargetCount INT = (SELECT COUNT(*) FROM [TargetTable])`,
          `IF @SourceCount != @TargetCount`,
          `  THROW 50000, 'Row count mismatch: Source=' + CAST(@SourceCount AS VARCHAR) + ', Target=' + CAST(@TargetCount AS VARCHAR), 1`,
        ],
        expected_result: 'Source and target row counts match',
        test_data: '',
        priority: 'High',
        type: 'Data-migration',
        complexity: 'Moderate',
        cleanup: '',
        automation_notes: 'Can be automated with COUNT queries. Ensure idempotency by checking migration status flags',
        source_references: [],
        category: 'Data Migration / Backfill',
      });
      
      testCases.push({
        id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
        title: 'Validate migration idempotency',
        purpose: 'Verify migration can be run multiple times without side effects',
        preconditions: 'Migration script exists and can be executed',
        steps: [
          `-- Execute migration script first time`,
          `-- Record row counts and checksums`,
          `-- Execute migration script second time`,
          `-- Verify row counts and checksums unchanged`,
        ],
        expected_result: 'Migration produces identical results on repeated execution',
        test_data: '',
        priority: 'High',
        type: 'Data-migration',
        complexity: 'Complex',
        cleanup: '',
        automation_notes: 'Requires running migration script multiple times and comparing results',
        source_references: [],
        category: 'Data Migration / Backfill',
      });
    }
    
    return testCases;
  }

  /**
   * Generate Index & Performance test cases
   */
  private generatePerformanceTests(workItemId: number, changes: SqlChange[], understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    
    for (const change of changes) {
      if (change.sqlType === 'index' || change.performanceIndicators.length > 0) {
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate index exists and is used: ${change.objectName}`,
          purpose: `Verify index ${change.objectName} exists and improves query performance`,
          preconditions: `Table exists. Index should be created.`,
          steps: [
            `SELECT i.name AS IndexName, i.type_desc AS IndexType`,
            `FROM sys.indexes i`,
            `INNER JOIN sys.tables t ON i.object_id = t.object_id`,
            `WHERE t.name = '${change.affectedTables[0] || 'TableName'}' AND i.name = '${change.objectName}'`,
            `IF @@ROWCOUNT = 0 THROW 50000, 'Index ${change.objectName} does not exist', 1`,
            `-- Check index usage in execution plan for related queries`,
          ],
          expected_result: 'Index exists and is used in query execution plans',
          test_data: '',
          priority: 'Medium',
          type: 'Performance',
          complexity: 'Moderate',
          cleanup: '',
          automation_notes: 'Can check index existence with sys.indexes. Performance validation requires execution plan analysis',
          source_references: [{
            file: change.filePath,
            line_range: '1-100',
            url: '',
          }],
          category: 'Index & Performance',
        });
      }
    }
    
    return testCases;
  }

  /**
   * Generate Trigger test cases
   */
  private generateTriggerTests(workItemId: number, changes: SqlChange[], understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    
    for (const change of changes) {
      if (change.sqlType === 'trigger') {
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate trigger ${change.objectName} fires correctly`,
          purpose: `Verify trigger ${change.objectName} executes on expected events`,
          preconditions: `Trigger exists. Test data available.`,
          steps: [
            `-- Insert/Update/Delete test data to trigger event`,
            `-- Verify trigger logic executed (check side effects)`,
            `-- Verify no duplicate side effects`,
          ],
          expected_result: 'Trigger fires once per event and produces expected side effects',
          test_data: 'Test data to trigger INSERT/UPDATE/DELETE events',
          priority: 'High',
          type: 'Unit',
          complexity: 'Complex',
          cleanup: 'Remove test data',
          automation_notes: 'Requires test data setup and verification of trigger side effects',
          source_references: [{
            file: change.filePath,
            line_range: '1-100',
            url: '',
          }],
          category: 'Trigger & Side-effect',
        });
      }
    }
    
    return testCases;
  }

  /**
   * Generate Security & Permissions test cases
   */
  private generateSecurityTests(workItemId: number, changes: SqlChange[], understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    
    // Generate security tests for all affected objects
    const uniqueObjects = new Set(changes.map(c => `${c.schema}.${c.objectName}`));
    
    for (const obj of uniqueObjects) {
      const [schema, name] = obj.split('.');
      testCases.push({
        id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
        title: `Validate permissions on ${obj}`,
        purpose: `Verify only authorized roles can access ${obj}`,
        preconditions: `Object ${obj} exists. Test user with limited permissions available.`,
        steps: [
          `-- Test with different user roles`,
          `EXECUTE AS USER = 'TestUser'`,
          `-- Attempt to SELECT/INSERT/UPDATE/DELETE`,
          `REVERT`,
        ],
        expected_result: 'Only authorized roles can perform allowed operations',
        test_data: '',
        priority: 'Medium',
        type: 'Security',
        complexity: 'Moderate',
        cleanup: '',
        automation_notes: 'Can be automated with EXECUTE AS and permission checks',
        source_references: [],
        category: 'Security & Permissions',
      });
    }
    
    return testCases;
  }

  /**
   * Generate Integration test cases
   */
  private generateIntegrationTests(workItemId: number, changes: SqlChange[], understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    
    // Check for ETL/SSIS references in understanding
    const hasETLReferences = understanding.coreFields.description?.toLowerCase().includes('etl') ||
                             understanding.coreFields.description?.toLowerCase().includes('ssis');
    
    if (hasETLReferences) {
      testCases.push({
        id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
        title: 'Validate ETL/SSIS package compatibility',
        purpose: 'Verify ETL processes work correctly with database changes',
        preconditions: 'ETL package exists. Test environment available.',
        steps: [
          `-- Execute ETL package`,
          `-- Verify data loads correctly`,
          `-- Check for errors in ETL logs`,
        ],
        expected_result: 'ETL package executes successfully with new schema',
        test_data: '',
        priority: 'High',
        type: 'Integration',
        complexity: 'Complex',
        cleanup: '',
        automation_notes: 'Requires ETL package execution and log analysis',
        source_references: [],
        category: 'Integration',
      });
    }
    
    return testCases;
  }

  /**
   * Generate Regression test cases
   */
  private generateRegressionTests(workItemId: number, changes: SqlChange[], understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    
    // Generate regression tests for existing queries that must keep same results
    for (const change of changes) {
      if (change.affectedTables.length > 0) {
        testCases.push({
          id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
          title: `Validate existing queries return same results for ${change.affectedTables[0]}`,
          purpose: `Verify that existing queries/reports using ${change.affectedTables[0]} still work correctly`,
          preconditions: `Table ${change.affectedTables[0]} exists. Baseline query results available.`,
          steps: [
            `-- Execute baseline queries`,
            `-- Compare results with expected baseline`,
            `-- Verify no unexpected changes in result set`,
          ],
          expected_result: 'Query results match baseline expectations',
          test_data: '',
          priority: 'High',
          type: 'Regression',
          complexity: 'Moderate',
          cleanup: '',
          automation_notes: 'Requires baseline query results for comparison',
          source_references: [],
          category: 'Regression',
        });
      }
    }
    
    return testCases;
  }

  /**
   * Generate Rollback & Upgrade safety test cases
   */
  private generateRollbackTests(workItemId: number, changes: SqlChange[], understanding: any, startCounter: number): SQLTestCase[] {
    const testCases: SQLTestCase[] = [];
    let counter = startCounter;
    
    // Generate rollback test
    testCases.push({
      id: `WI-${workItemId}-TC-${String(counter++).padStart(2, '0')}`,
      title: 'Validate rollback script exists and is tested',
      purpose: 'Verify that changes can be safely rolled back if needed',
      preconditions: 'Rollback script available',
      steps: [
        `-- Verify rollback script exists`,
        `-- Test rollback script in test environment`,
        `-- Verify database returns to previous state`,
      ],
      expected_result: 'Rollback script successfully reverts all changes',
      test_data: '',
      priority: 'High',
      type: 'Rollback',
      complexity: 'Complex',
      cleanup: '',
      automation_notes: 'Requires rollback script execution and state verification',
      source_references: [],
      category: 'Rollback & Upgrade safety',
    });
    
    return testCases;
  }

  /**
   * Generate SQL test scripts with proper setup/teardown
   */
  private generateSqlTestScripts(testCases: SQLTestCase[], understanding: any): Record<string, string> {
    const scripts: Record<string, string> = {};
    
    for (const testCase of testCases) {
      const setupSQL = this.generateSetupSQL(testCase);
      const testSQL = testCase.steps.join('\n\n');
      const cleanupSQL = testCase.cleanup || this.generateDefaultCleanup(testCase);
      
      const script = `-- ============================================================================
-- Test Script: ${testCase.id}
-- Title: ${testCase.title}
-- Purpose: ${testCase.purpose}
-- Category: ${testCase.category}
-- Priority: ${testCase.priority} | Type: ${testCase.type} | Complexity: ${testCase.complexity}
-- ============================================================================
-- Generated for comprehensive test case analysis
-- Work Item: ${understanding.coreFields.id}
-- ============================================================================

-- PRECONDITIONS
-- ${testCase.preconditions}

-- SETUP
${setupSQL}

-- TEST EXECUTION
${testSQL}

-- EXPECTED RESULT
-- ${testCase.expected_result}

-- VERIFICATION
-- Add assertions here based on expected result
-- Example:
-- IF NOT EXISTS (SELECT 1 FROM ... WHERE ...)
--     THROW 50000, 'Test failed: Expected condition not met', 1

-- CLEANUP
${cleanupSQL}

-- ============================================================================
-- Automation Notes: ${testCase.automation_notes}
-- ============================================================================
`;
      scripts[testCase.id] = script;
    }
    
    return scripts;
  }

  /**
   * Generate setup SQL for test case
   */
  private generateSetupSQL(testCase: SQLTestCase): string {
    if (testCase.test_data) {
      return `-- Setup test data\n${testCase.test_data}`;
    }
    
    // Generate default setup based on test type
    if (testCase.type === 'Unit' && testCase.category === 'Schema & DDL') {
      return `-- No setup required for schema validation tests`;
    }
    
    if (testCase.type === 'Data-migration') {
      return `-- Setup: Create test data in source table
-- BEGIN TRANSACTION
-- Insert test records
-- COMMIT TRANSACTION`;
    }
    
    return `-- Setup: Configure test environment as needed`;
  }

  /**
   * Generate default cleanup SQL
   */
  private generateDefaultCleanup(testCase: SQLTestCase): string {
    if (testCase.type === 'Data-migration' || testCase.test_data) {
      return `-- Cleanup: Remove test data
-- ROLLBACK TRANSACTION (if using transaction)
-- Or DELETE FROM test tables WHERE test_flag = 1`;
    }
    
    return `-- No cleanup required for this test`;
  }

  /**
   * Build comprehensive analysis output
   */
  private buildSQLTestCaseAnalysis(
    workItemId: number,
    coreFields: any,
    understanding: any,
    codeChanges: any,
    testCases: SQLTestCase[],
    sqlScripts: Record<string, string>,
    comments: any[],
    links: any,
    attachments: any
  ): SQLTestCaseAnalysis {
    // Build affected objects list
    const affectedObjects: AffectedObject[] = codeChanges.allChanges.map((change: SqlChange) => ({
      object_type: change.sqlType,
      schema: change.schema,
      name: change.objectName,
      change_type: change.changeType.toUpperCase() as any,
      notes: change.filePath,
    }));
    
    // Build executive summary
    const executiveSummary = this.buildExecutiveSummary(coreFields, codeChanges, affectedObjects);
    
    // Build acceptance criteria mapping
    const acceptanceCriteriaMapping = this.buildAcceptanceCriteriaMapping(
      coreFields.acceptanceCriteria,
      testCases
    );
    
    // Build risk assessment
    const riskAssessment = this.buildRiskAssessment(codeChanges, understanding);
    
    // Build automation plan
    const automationPlan = this.buildAutomationPlan(testCases);
    
    // Build release checklist
    const releaseChecklist = this.buildReleaseChecklist(testCases, riskAssessment);
    
    return {
      work_item_id: workItemId,
      executive_summary: executiveSummary,
      affected_objects: affectedObjects,
      assumptions_conflicts: [
        ...understanding.assumptions,
        ...understanding.conflicts,
      ],
      test_cases: testCases,
      test_data_matrix: this.buildTestDataMatrix(testCases),
      sql_test_scripts: sqlScripts,
      acceptance_criteria_mapping: acceptanceCriteriaMapping,
      risk_assessment: riskAssessment,
      automation_plan: automationPlan,
      release_checklist: releaseChecklist,
    };
  }

  /**
   * Build executive summary
   */
  private buildExecutiveSummary(coreFields: any, codeChanges: any, affectedObjects: AffectedObject[]): string {
    const bullets: string[] = [];
    
    bullets.push(`${coreFields.title} - ${coreFields.workItemType}`);
    
    if (affectedObjects.length > 0) {
      bullets.push(`Affects ${affectedObjects.length} database object(s): ${affectedObjects.map(o => `${o.schema}.${o.name}`).join(', ')}`);
    }
    
    const highRiskAreas = this.identifyHighRiskAreas(codeChanges, affectedObjects);
    if (highRiskAreas.length > 0) {
      bullets.push(`High-risk areas: ${highRiskAreas.join(', ')}`);
    }
    
    return bullets.join('\n');
  }

  /**
   * Identify high-risk areas
   */
  private identifyHighRiskAreas(codeChanges: any, affectedObjects: AffectedObject[]): string[] {
    const risks: string[] = [];
    
    // Check for data migration
    if (codeChanges.allChanges.some((c: SqlChange) => c.content?.toLowerCase().includes('migrate'))) {
      risks.push('Data migration');
    }
    
    // Check for constraint changes
    if (codeChanges.allChanges.some((c: SqlChange) => c.content?.toLowerCase().includes('constraint'))) {
      risks.push('Constraint modifications');
    }
    
    // Check for performance changes
    if (codeChanges.allChanges.some((c: SqlChange) => c.performanceIndicators.length > 0)) {
      risks.push('Performance optimizations');
    }
    
    return risks;
  }

  /**
   * Build acceptance criteria mapping
   */
  private buildAcceptanceCriteriaMapping(
    acceptanceCriteria: string[],
    testCases: SQLTestCase[]
  ): AcceptanceCriteriaMapping[] {
    return acceptanceCriteria.map(criterion => {
      // Simple matching - would need more sophisticated analysis
      const coveredBy = testCases
        .filter(tc => tc.purpose.toLowerCase().includes(criterion.toLowerCase().substring(0, 20)))
        .map(tc => tc.id);
      
      return {
        criterion,
        covered_by: coveredBy,
        coverage_status: coveredBy.length > 0 ? 'Complete' : 'Missing',
      };
    });
  }

  /**
   * Build risk assessment
   */
  private buildRiskAssessment(codeChanges: any, understanding: any): RiskAssessment[] {
    const risks: RiskAssessment[] = [];
    
    // Add risks based on code changes
    if (codeChanges.allChanges.some((c: SqlChange) => c.changeType === 'deleted')) {
      risks.push({
        risk: 'Object deletion may break dependent objects',
        severity: 'High',
        mitigation: 'Verify all dependencies before deletion, ensure rollback plan exists',
      });
    }
    
    return risks;
  }

  /**
   * Build automation plan
   */
  private buildAutomationPlan(testCases: SQLTestCase[]): {
    priority_tests: string[];
    tools: string[];
    ci_gates: string[];
  } {
    const priorityTests = testCases
      .filter(tc => tc.priority === 'High' && tc.complexity === 'Simple')
      .slice(0, 10)
      .map(tc => tc.id);
    
    return {
      priority_tests: priorityTests,
      tools: ['tSQLt', 'Azure Pipelines', 'dbatools', 'SQL Server Agent'],
      ci_gates: [
        'Run unit tests on PR creation',
        'Run integration tests on merge to main',
        'Require all high-priority tests to pass',
      ],
    };
  }

  /**
   * Build release checklist
   */
  private buildReleaseChecklist(testCases: SQLTestCase[], riskAssessment: RiskAssessment[]): string[] {
    const checklist: string[] = [];
    
    checklist.push('All high-priority test cases executed and passed');
    checklist.push('Database backup created before deployment');
    
    if (riskAssessment.some(r => r.severity === 'High')) {
      checklist.push('High-risk mitigation steps completed');
    }
    
    checklist.push('Rollback plan tested and documented');
    checklist.push('Performance baseline established (if applicable)');
    
    return checklist;
  }

  /**
   * Build test data matrix
   */
  private buildTestDataMatrix(testCases: SQLTestCase[]): Record<string, string> {
    const matrix: Record<string, string> = {};
    
    for (const testCase of testCases) {
      if (testCase.test_data) {
        matrix[testCase.id] = testCase.test_data;
      }
    }
    
    return matrix;
  }

  /**
   * Save outputs (JSON, Markdown, Feature file, SQL scripts)
   */
  private async saveOutputs(analysis: SQLTestCaseAnalysis, sqlScripts: Record<string, string>): Promise<void> {
    // Save JSON
    const jsonPath = path.join(this.outputDir, `SQL-${analysis.work_item_id}-test-case-analysis.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(analysis, null, 2), 'utf-8');
    logger.info(`✅ Saved comprehensive analysis JSON: ${jsonPath}`);
    
    // Save Markdown summary
    const markdownPath = path.join(this.outputDir, `SQL-${analysis.work_item_id}-test-case-analysis.md`);
    const markdown = this.generateMarkdownSummary(analysis);
    fs.writeFileSync(markdownPath, markdown, 'utf-8');
    logger.info(`✅ Saved Markdown summary: ${markdownPath}`);
    
    // Save Gherkin feature file
    const featureContent = this.generateFeatureFile(analysis, sqlScripts);
    if (featureContent) {
      const featurePath = path.join(this.outputDir, this.getFeatureFileName(analysis.work_item_id, analysis.executive_summary));
      fs.writeFileSync(featurePath, featureContent, 'utf-8');
      logger.info(`✅ Saved Gherkin feature file: ${featurePath}`);
    }
    
    // Save SQL scripts
    for (const [testCaseId, script] of Object.entries(sqlScripts)) {
      const scriptPath = path.join(this.sqlScriptsDir, `${testCaseId}.sql`);
      fs.writeFileSync(scriptPath, script, 'utf-8');
      logger.info(`✅ Saved SQL test script: ${scriptPath}`);
    }
  }

  /**
   * Generate Gherkin feature file from comprehensive test cases
   */
  private generateFeatureFile(analysis: SQLTestCaseAnalysis, sqlScripts: Record<string, string>): string | null {
    if (analysis.test_cases.length === 0) {
      return null;
    }
    
    const lines: string[] = [];
    const workItemId = analysis.work_item_id;
    
    // Feature header
    const featureTitle = this.sanitizeFeatureName(analysis.executive_summary.split('\n')[0] || `Work Item ${workItemId}`);
    lines.push(`@sqlserver @ado @ado-${workItemId}`);
    lines.push(`Feature: ${featureTitle}`);
    lines.push(`  As a QA engineer`);
    lines.push(`  I want to validate SQL Server changes for Azure DevOps work item ${workItemId}`);
    lines.push(`  So that I can ensure database changes are working correctly`);
    lines.push('');
    
    // Add SQL Scripts section
    if (Object.keys(sqlScripts).length > 0) {
      lines.push(`  # SQL Validation Scripts`);
      lines.push(`  # The following SQL scripts are available in src/features/sqlserver/sql-scripts/`);
      lines.push(`  # These scripts are generated from comprehensive test case analysis:`);
      lines.push('');
      
      Object.keys(sqlScripts).forEach(testCaseId => {
        lines.push(`  # - ${testCaseId}.sql`);
      });
      lines.push('');
    }
    
    // Background
    lines.push(`  Background:`);
    lines.push(`    Given I have a valid SQL Server connection`);
    lines.push('');
    
    // Group test cases by category for better organization
    const testCasesByCategory = this.groupTestCasesByCategory(analysis.test_cases);
    
    // Generate scenarios for each test case
    Object.entries(testCasesByCategory).forEach(([category, testCases], categoryIndex) => {
      if (categoryIndex > 0) {
        lines.push('');
      }
      
      // Add category comment
      lines.push(`  # ${category} Tests`);
      lines.push('');
      
      testCases.forEach((testCase, index) => {
        if (index > 0) {
          lines.push('');
        }
        
        // Tags based on priority, type, and category
        const tags = this.generateTagsForTestCase(testCase, workItemId);
        if (tags.length > 0) {
          lines.push(`  ${tags.join(' ')}`);
        }
        
        // Scenario name
        lines.push(`  Scenario: ${testCase.title}`);
        
        // Add comment with test case details and SQL script reference
        lines.push(`    # Test Case ID: ${testCase.id}`);
        lines.push(`    # Purpose: ${testCase.purpose}`);
        lines.push(`    # Priority: ${testCase.priority} | Type: ${testCase.type} | Complexity: ${testCase.complexity}`);
        if (sqlScripts[testCase.id]) {
          lines.push(`    # SQL Script: src/features/sqlserver/sql-scripts/${testCase.id}.sql`);
        }
        
        // Convert test case steps to Gherkin steps
        const gherkinSteps = this.convertToGherkinSteps(testCase, sqlScripts[testCase.id] ? testCase.id : null);
        gherkinSteps.forEach(step => {
          lines.push(`    ${step.keyword} ${step.text}`);
        });
      });
    });
    
    return lines.join('\n') + '\n';
  }

  /**
   * Group test cases by category
   */
  private groupTestCasesByCategory(testCases: SQLTestCase[]): Record<string, SQLTestCase[]> {
    const grouped: Record<string, SQLTestCase[]> = {};
    
    testCases.forEach(tc => {
      if (!grouped[tc.category]) {
        grouped[tc.category] = [];
      }
      grouped[tc.category].push(tc);
    });
    
    return grouped;
  }

  /**
   * Generate tags for test case
   */
  private generateTagsForTestCase(testCase: SQLTestCase, workItemId: number): string[] {
    const tags: string[] = [];
    
    // Base tags
    tags.push(`@sqlserver`, `@ado-${workItemId}`);
    
    // Priority tag
    tags.push(`@priority-${testCase.priority.toLowerCase()}`);
    
    // Type tag
    tags.push(`@type-${testCase.type.toLowerCase().replace(/-/g, '-')}`);
    
    // Category tag (simplified)
    const categoryTag = testCase.category.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[&/]/g, '-')
      .replace(/-+/g, '-');
    tags.push(`@category-${categoryTag}`);
    
    return tags;
  }

  /**
   * Convert test case steps to Gherkin steps with specific, actionable steps
   */
  private convertToGherkinSteps(testCase: SQLTestCase, sqlScriptId: string | null): Array<{keyword: string, text: string}> {
    const steps: Array<{keyword: string, text: string}> = [];
    
    // Preconditions
    if (testCase.preconditions && testCase.preconditions.trim() && !testCase.preconditions.includes('Database connection available')) {
      const preconditions = testCase.preconditions
        .replace(/Database connection available[.,]?\s*/gi, '')
        .trim();
      if (preconditions) {
        steps.push({
          keyword: 'Given',
          text: preconditions
        });
      }
    }
    
    // Convert SQL steps to Gherkin steps
    testCase.steps.forEach((step, index) => {
      // Skip SQL comments
      if (step.trim().startsWith('--')) {
        return;
      }
      
      // Convert SQL statements to Gherkin steps
      const stepLower = step.toLowerCase().trim();
      let keyword = 'When';
      let stepText = step;
      
      // Determine keyword and convert SQL to natural language
      if (stepLower.includes('select') && stepLower.includes('from information_schema')) {
        keyword = 'When';
        // Extract table/column name for more specific step
        const tableMatch = step.match(/table_name\s*=\s*['"]?([A-Za-z][A-Za-z0-9_]*)['"]?/i);
        const columnMatch = step.match(/column_name\s*=\s*['"]?([A-Za-z][A-Za-z0-9_]*)['"]?/i);
        if (tableMatch) {
          stepText = `I query the SQL Server database for table "${tableMatch[1]}"`;
        } else if (columnMatch) {
          stepText = `I query the SQL Server database for column "${columnMatch[1]}"`;
        } else {
          stepText = `I query the SQL Server database structure`;
        }
      } else if (stepLower.includes('exec') || stepLower.includes('execute')) {
        keyword = 'When';
        const procMatch = step.match(/(?:exec|execute)\s+([A-Za-z][A-Za-z0-9_.]*)/i);
        if (procMatch) {
          stepText = `I execute stored procedure "${procMatch[1]}"`;
          if (sqlScriptId) {
            stepText += ` using SQL script ${sqlScriptId}.sql`;
          }
        } else {
          stepText = `I execute the SQL script`;
          if (sqlScriptId) {
            stepText = `I execute SQL script ${sqlScriptId}.sql`;
          }
        }
      } else if (stepLower.includes('if @@rowcount') || stepLower.includes('throw')) {
        keyword = 'Then';
        if (stepLower.includes('does not exist')) {
          stepText = `the object should not exist`;
        } else if (stepLower.includes('exists')) {
          stepText = `the object should exist`;
        } else {
          stepText = `the query should return expected results`;
        }
      } else if (stepLower.includes('verify') || stepLower.includes('validate') || stepLower.includes('check') || 
                 stepLower.includes('assert') || stepLower.includes('should') || stepLower.includes('expect')) {
        keyword = 'Then';
        stepText = step.replace(/verify|validate|check|assert/gi, '').trim();
      } else if (stepLower.includes('given') || stepLower.includes('setup') || stepLower.includes('prepare')) {
        keyword = 'Given';
        stepText = step.replace(/given|setup|prepare/gi, '').trim();
      } else if (stepLower.includes('insert') || stepLower.includes('update') || stepLower.includes('delete')) {
        keyword = 'When';
        if (stepLower.includes('insert')) {
          stepText = `I insert test data`;
        } else if (stepLower.includes('update')) {
          stepText = `I update test data`;
        } else {
          stepText = `I delete test data`;
        }
      } else if (stepLower.includes('count') || stepLower.includes('measure')) {
        keyword = 'When';
        stepText = `I measure the execution performance`;
      } else if (index > 0 && steps.length > 0) {
        keyword = 'And';
        stepText = step;
      }
      
      // Clean up step text
      stepText = stepText
        .replace(/^--\s*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (stepText && stepText.length > 0) {
        steps.push({ keyword, text: stepText });
      }
    });
    
    // Expected result as Then step (if not already covered)
    if (testCase.expected_result && testCase.expected_result.trim()) {
      const hasExpectedResult = steps.some(s => 
        s.keyword === 'Then' && 
        s.text.toLowerCase().includes(testCase.expected_result.toLowerCase().substring(0, 20))
      );
      
      if (!hasExpectedResult) {
        steps.push({
          keyword: 'Then',
          text: testCase.expected_result
        });
      }
    }
    
    // If no steps were added, create meaningful default steps based on test case
    if (steps.length === 0) {
      const titleLower = testCase.title.toLowerCase();
      
      if (titleLower.includes('exists')) {
        steps.push({
          keyword: 'When',
          text: `I query the SQL Server database for the object`
        });
        steps.push({
          keyword: 'Then',
          text: `the object should exist`
        });
      } else if (titleLower.includes('execute') || titleLower.includes('run')) {
        steps.push({
          keyword: 'When',
          text: sqlScriptId ? `I execute SQL script ${sqlScriptId}.sql` : `I execute the SQL script`
        });
        steps.push({
          keyword: 'Then',
          text: `the script should execute successfully`
        });
      } else {
        steps.push({
          keyword: 'When',
          text: `I execute the test case ${testCase.id}`
        });
        steps.push({
          keyword: 'Then',
          text: testCase.expected_result || `the expected result should be achieved`
        });
      }
    }
    
    return steps;
  }

  /**
   * Sanitize feature name for Gherkin
   */
  private sanitizeFeatureName(name: string): string {
    return name
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100); // Limit length
  }

  /**
   * Get feature file name
   */
  private getFeatureFileName(workItemId: number, executiveSummary: string): string {
    const title = this.sanitizeFeatureName(executiveSummary.split('\n')[0] || `work-item-${workItemId}`);
    const sanitized = title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);
    
    return `SQL-${workItemId}-${sanitized}.feature`;
  }

  /**
   * Generate Markdown summary
   */
  private generateMarkdownSummary(analysis: SQLTestCaseAnalysis): string {
    const lines: string[] = [];
    
    lines.push(`# Comprehensive Test Analysis for Work Item ${analysis.work_item_id}`);
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(analysis.executive_summary);
    lines.push('');
    
    lines.push('## Affected Objects');
    lines.push('');
    lines.push('| Object Type | Schema | Name | Change Type | Notes |');
    lines.push('|------------|--------|------|-------------|-------|');
    analysis.affected_objects.forEach(obj => {
      lines.push(`| ${obj.object_type} | ${obj.schema} | ${obj.name} | ${obj.change_type} | ${obj.notes} |`);
    });
    lines.push('');
    
    if (analysis.assumptions_conflicts.length > 0) {
      lines.push('## Assumptions & Conflicts');
      lines.push('');
      analysis.assumptions_conflicts.forEach(item => {
        lines.push(`- ${item}`);
      });
      lines.push('');
    }
    
    lines.push('## Top 10 High-Priority Test Cases');
    lines.push('');
    
    const topTests = analysis.test_cases
      .filter(tc => tc.priority === 'High')
      .slice(0, 10);
    
    topTests.forEach((tc, index) => {
      lines.push(`### ${index + 1}. ${tc.id}: ${tc.title}`);
      lines.push(`- **Purpose**: ${tc.purpose}`);
      lines.push(`- **Category**: ${tc.category}`);
      lines.push(`- **Type**: ${tc.type}`);
      lines.push(`- **Complexity**: ${tc.complexity}`);
      lines.push(`- **SQL Script**: \`src/features/sqlserver/sql-scripts/${tc.id}.sql\``);
      if (tc.source_references.length > 0) {
        lines.push(`- **Source**: ${tc.source_references[0].file} (${tc.source_references[0].line_range})`);
      }
      lines.push('');
    });
    
    lines.push('## Risk Assessment');
    lines.push('');
    analysis.risk_assessment.forEach(risk => {
      lines.push(`### ${risk.severity} Risk: ${risk.risk}`);
      lines.push(`**Mitigation**: ${risk.mitigation}`);
      lines.push('');
    });
    
    lines.push('## Automation Plan');
    lines.push('');
    lines.push('### Priority Tests for Automation');
    analysis.automation_plan.priority_tests.forEach(tcId => {
      lines.push(`- ${tcId}`);
    });
    lines.push('');
    lines.push('### Recommended Tools');
    analysis.automation_plan.tools.forEach(tool => {
      lines.push(`- ${tool}`);
    });
    lines.push('');
    
    lines.push('## Release Checklist');
    lines.push('');
    analysis.release_checklist.forEach(item => {
      lines.push(`- [ ] ${item}`);
    });
    lines.push('');
    
    lines.push('---');
    lines.push(`*Generated on ${new Date().toISOString()}*`);
    lines.push(`*For full details, see SQL-${analysis.work_item_id}-test-case-analysis.json*`);
    
    return lines.join('\n');
  }
}

