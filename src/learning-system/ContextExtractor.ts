/**
 * ContextExtractor - Extracts full context from Jira work items
 * 
 * Analyzes Jira work items and extracts comprehensive context including:
 * - Description parsing
 * - Acceptance criteria
 * - Comments
 * - Related issues
 * - Field definitions
 */

import * as fs from 'fs';
import { jiraClient } from '../integrations/jira/client';
import { logger } from '../utils/logger';
import {
  WorkItemContext,
  AcceptanceCriterion,
  CommentSummary,
  RelatedIssue,
  FieldDefinition,
} from './KnowledgeBase';
import { FeatureGenerator } from '../integrations/jira/FeatureGenerator';

// ============================================================================
// CONTEXT EXTRACTOR CLASS
// ============================================================================

export class ContextExtractor {
  /**
   * Extract full context from a Jira work item
   */
  async extractContext(workItemKey: string): Promise<WorkItemContext> {
    logger.info(`Extracting context for ${workItemKey}...`);

    try {
      // Fetch work item from Jira
      const issue = await jiraClient.getIssue(workItemKey);

      // Extract basic information
      const context: WorkItemContext = {
        key: issue.key,
        summary: issue.fields.summary || '',
        type: issue.fields.issuetype?.name || 'Unknown',
        status: issue.fields.status?.name || 'Unknown',
        priority: issue.fields.priority?.name || 'Medium',
        description: this.parseDescription(issue.fields.description),
        acceptanceCriteria: this.extractAcceptanceCriteria(issue),
        comments: this.extractComments(issue),
        relatedIssues: this.extractRelatedIssues(issue),
        fieldDefinitions: {},
        generatedFeatures: {},
        qaReviewedFeatures: {},
        extractedAt: new Date().toISOString(),
      };

      // Extract entities and fields from description
      const entities = this.extractEntities(context.description.raw);
      const fields = this.extractFields(context.description.raw);
      const actions = this.extractActions(context.description.raw);

      context.description.parsed = {
        sentences: this.splitIntoSentences(context.description.raw),
        entities,
        fields,
        actions,
      };

      // Extract field definitions from custom fields
      context.fieldDefinitions = await this.extractFieldDefinitions(issue, fields);

      // Check for generated feature files
      context.generatedFeatures = this.findFeatureFiles(workItemKey);

      // Check for v2 (QA-reviewed) feature files
      context.qaReviewedFeatures = this.findV2FeatureFiles(workItemKey);

      logger.info(`Context extracted for ${workItemKey}: ${entities.length} entities, ${fields.length} fields`);
      return context;
    } catch (error: any) {
      logger.error(`Failed to extract context for ${workItemKey}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Parse Jira description (handles ADF format)
   */
  private parseDescription(description: any): { raw: string; parsed: any } {
    if (!description) {
      return {
        raw: '',
        parsed: {
          sentences: [],
          entities: [],
          fields: [],
          actions: [],
        },
      };
    }

    // If description is a string, use it directly
    if (typeof description === 'string') {
      return {
        raw: description,
        parsed: {
          sentences: [],
          entities: [],
          fields: [],
          actions: [],
        },
      };
    }

    // If description is ADF (Atlassian Document Format), extract text
    const raw = this.extractTextFromADF(description);
    return {
      raw,
      parsed: {
        sentences: [],
        entities: [],
        fields: [],
        actions: [],
      },
    };
  }

  /**
   * Extract text from ADF (Atlassian Document Format)
   */
  private extractTextFromADF(adf: any): string {
    if (typeof adf === 'string') return adf;
    if (!adf || !adf.content) return '';

    const texts: string[] = [];

    const extract = (node: any) => {
      if (node.type === 'text') {
        texts.push(node.text || '');
      }
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach(extract);
      }
    };

    if (Array.isArray(adf.content)) {
      adf.content.forEach(extract);
    } else {
      extract(adf);
    }

    return texts.join(' ').trim();
  }

  /**
   * Extract acceptance criteria
   */
  private extractAcceptanceCriteria(issue: any): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];

    // Try to find acceptance criteria in custom fields
    const acField = issue.fields['customfield_10000'] || 
                   issue.fields['customfield_10001'] ||
                   issue.fields.description;

    if (!acField) return criteria;

    const acText = typeof acField === 'string' ? acField : this.extractTextFromADF(acField);
    
    // Look for AC patterns: "Given/When/Then", "AC-1:", "1.", etc.
    const acPatterns = [
      /(?:Given|When|Then|AC-\d+|Acceptance Criteria|AC:)\s*(.+?)(?=\n\n|\n(?:Given|When|Then|AC-|\d+\.|$))/gi,
      /(\d+\.\s*.+?)(?=\n\d+\.|\n\n|$)/g,
    ];

    for (const pattern of acPatterns) {
      const matches = acText.matchAll(pattern);
      let index = 1;
      for (const match of matches) {
        const text = match[1] || match[0];
        if (text.trim().length > 10) {
          criteria.push({
            id: `AC-${index++}`,
            text: text.trim(),
            type: this.detectACType(text),
            covered: false,
          });
        }
      }
    }

    return criteria;
  }

  /**
   * Detect acceptance criteria type
   */
  private detectACType(text: string): string {
    const lower = text.toLowerCase();
    if (lower.includes('given') || lower.includes('when') || lower.includes('then')) {
      return 'bdd';
    }
    if (lower.includes('validate') || lower.includes('verify')) {
      return 'validation';
    }
    if (lower.includes('display') || lower.includes('show') || lower.includes('visible')) {
      return 'visibility';
    }
    return 'general';
  }

  /**
   * Extract comments
   */
  private extractComments(issue: any): CommentSummary[] {
    const comments: CommentSummary[] = [];

    if (issue.fields.comment && issue.fields.comment.comments) {
      for (const comment of issue.fields.comment.comments) {
        comments.push({
          author: comment.author?.displayName || 'Unknown',
          date: comment.created || '',
          text: typeof comment.body === 'string' 
            ? comment.body 
            : this.extractTextFromADF(comment.body),
        });
      }
    }

    return comments;
  }

  /**
   * Extract related issues
   */
  private extractRelatedIssues(issue: any): RelatedIssue[] {
    const related: RelatedIssue[] = [];

    // Check issue links
    if (issue.fields.issuelinks) {
      for (const link of issue.fields.issuelinks) {
        const linkedIssue = link.outwardIssue || link.inwardIssue;
        if (linkedIssue) {
          related.push({
            key: linkedIssue.key,
            summary: linkedIssue.fields?.summary || '',
            type: linkedIssue.fields?.issuetype?.name || 'Unknown',
            linkType: link.type?.name || 'Related',
          });
        }
      }
    }

    return related;
  }

  /**
   * Extract entities (Account, Contact, Opportunity, etc.)
   */
  private extractEntities(text: string): string[] {
    const entities = new Set<string>();
    const commonEntities = [
      'Account', 'Contact', 'Opportunity', 'Lead', 'Case',
      'Contract', 'Product', 'Pricebook', 'Campaign',
    ];

    const lowerText = text.toLowerCase();
    for (const entity of commonEntities) {
      if (lowerText.includes(entity.toLowerCase())) {
        entities.add(entity);
      }
    }

    return Array.from(entities);
  }

  /**
   * Extract field names
   */
  private extractFields(text: string): string[] {
    const fields = new Set<string>();
    
    // Pattern: "Field Name", "Field_Name__c", "fieldName"
    const patterns = [
      /([A-Z][a-zA-Z0-9_]+__c)/g, // Custom fields
      /(?:field|Field)\s+([A-Z][a-zA-Z0-9\s]+?)(?:\s|$|,|\.)/g,
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const field = match[1] || match[0];
        if (field && field.length > 2) {
          fields.add(field.trim());
        }
      }
    }

    return Array.from(fields);
  }

  /**
   * Extract actions (validate, display, create, etc.)
   */
  private extractActions(text: string): string[] {
    const actions = new Set<string>();
    const actionKeywords = [
      'validate', 'display', 'show', 'hide', 'create', 'update',
      'delete', 'populate', 'auto-populate', 'map', 'convert',
    ];

    const lowerText = text.toLowerCase();
    for (const action of actionKeywords) {
      if (lowerText.includes(action)) {
        actions.add(action);
      }
    }

    return Array.from(actions);
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 10);
  }

  /**
   * Extract field definitions (simplified - would need Salesforce API for full details)
   */
  private async extractFieldDefinitions(issue: any, fieldNames: string[]): Promise<Record<string, FieldDefinition>> {
    const definitions: Record<string, FieldDefinition> = {};

    // For now, create basic definitions from field names
    // In future, could query Salesforce API for full field metadata
    for (const fieldName of fieldNames) {
      definitions[fieldName] = {
        type: 'Text', // Default
        required: false,
        description: `Field: ${fieldName}`,
      };

      // Detect field type from name patterns
      if (fieldName.includes('__c')) {
        definitions[fieldName].type = 'Custom';
      }
      if (fieldName.toLowerCase().includes('date')) {
        definitions[fieldName].type = 'Date';
      }
      if (fieldName.toLowerCase().includes('status') || fieldName.toLowerCase().includes('type')) {
        definitions[fieldName].type = 'Picklist';
      }
    }

    return definitions;
  }

  /**
   * Find generated feature files (v1)
   */
  private findFeatureFiles(workItemKey: string): { ui?: string; api?: string } {
    const featureFiles: { ui?: string; api?: string } = {};

    const uiFile = `src/features/ui/SF/${workItemKey}.feature`;
    const apiFile = `src/features/api/SF/${workItemKey}.feature`;

    if (fs.existsSync(uiFile)) {
      featureFiles.ui = uiFile;
    }
    if (fs.existsSync(apiFile)) {
      featureFiles.api = apiFile;
    }

    return featureFiles;
  }

  /**
   * Find v2 (QA-reviewed) feature files
   */
  private findV2FeatureFiles(workItemKey: string): { ui?: string; api?: string; reviewedBy?: string; reviewedDate?: string } {
    const featureFiles: { ui?: string; api?: string; reviewedBy?: string; reviewedDate?: string } = {};

    const uiFile = `src/features/ui/SF/${workItemKey}-v2.feature`;
    const apiFile = `src/features/api/SF/${workItemKey}-v2.feature`;

    if (fs.existsSync(uiFile)) {
      featureFiles.ui = uiFile;
      // Try to extract review date from file
      const stats = fs.statSync(uiFile);
      featureFiles.reviewedDate = stats.mtime.toISOString();
    }
    if (fs.existsSync(apiFile)) {
      featureFiles.api = apiFile;
      if (!featureFiles.reviewedDate) {
        const stats = fs.statSync(apiFile);
        featureFiles.reviewedDate = stats.mtime.toISOString();
      }
    }

    return featureFiles;
  }
}

