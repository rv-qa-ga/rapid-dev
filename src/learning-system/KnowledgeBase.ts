/**
 * KnowledgeBase - Context Storage System for Learning
 * 
 * Stores and manages work item context, patterns, and learned knowledge
 * for context-aware test case generation.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';
import { jiraClient } from '../integrations/jira/client';

// ============================================================================
// TYPES
// ============================================================================

export interface WorkItemIndex {
  workItems: WorkItemIndexEntry[];
  lastUpdated: string;
  version: string;
}

export interface WorkItemIndexEntry {
  key: string;
  summary: string;
  type: string;
  status: string;
  priority: string;
  entities: string[];
  fields: string[];
  featureTypes: string[];
  relatedItems: string[];
  contextFile: string;
  v1FeatureFiles: {
    ui?: string;
    api?: string;
  };
  v2FeatureFiles: {
    ui?: string;
    api?: string;
  };
  lastUpdated: string;
}

export interface WorkItemContext {
  key: string;
  summary: string;
  type: string;
  status: string;
  priority: string;
  description: {
    raw: string;
    parsed: {
      sentences: string[];
      entities: string[];
      fields: string[];
      actions: string[];
    };
  };
  acceptanceCriteria: AcceptanceCriterion[];
  comments: CommentSummary[];
  relatedIssues: RelatedIssue[];
  fieldDefinitions: Record<string, FieldDefinition>;
  generatedFeatures: {
    ui?: string;
    api?: string;
  };
  qaReviewedFeatures: {
    ui?: string;
    api?: string;
    reviewedBy?: string;
    reviewedDate?: string;
  };
  extractedAt: string;
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  type: string;
  covered: boolean;
}

export interface CommentSummary {
  author: string;
  date: string;
  text: string;
}

export interface RelatedIssue {
  key: string;
  summary: string;
  type: string;
  linkType: string;
}

export interface FieldDefinition {
  type: string;
  values?: string[];
  required: boolean;
  description?: string;
}

// ============================================================================
// KNOWLEDGE BASE CLASS
// ============================================================================

export class KnowledgeBase {
  private baseDir: string;
  private indexFile: string;
  private workItemsDir: string;
  private patternsDir: string;

  constructor(baseDir: string = 'data/knowledge-base') {
    this.baseDir = path.resolve(process.cwd(), baseDir);
    this.indexFile = path.join(this.baseDir, 'work-items-index.json');
    this.workItemsDir = path.join(this.baseDir, 'work-items');
    this.patternsDir = path.join(this.baseDir, 'patterns');

    // Ensure directories exist
    this.ensureDirectories();
  }

  /**
   * Ensure all required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [this.baseDir, this.workItemsDir, this.patternsDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        logger.info(`Created directory: ${dir}`);
      }
    }
  }

  /**
   * Load work item index
   */
  loadIndex(): WorkItemIndex {
    if (!fs.existsSync(this.indexFile)) {
      return {
        workItems: [],
        lastUpdated: new Date().toISOString(),
        version: '1.0.0',
      };
    }

    const content = fs.readFileSync(this.indexFile, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Save work item index
   */
  saveIndex(index: WorkItemIndex): void {
    index.lastUpdated = new Date().toISOString();
    fs.writeFileSync(this.indexFile, JSON.stringify(index, null, 2));
    logger.info(`Saved work item index: ${index.workItems.length} items`);
  }

  /**
   * Get work item context
   */
  getWorkItemContext(workItemKey: string): WorkItemContext | null {
    const contextFile = path.join(this.workItemsDir, `${workItemKey}.json`);
    
    if (!fs.existsSync(contextFile)) {
      return null;
    }

    const content = fs.readFileSync(contextFile, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Save work item context
   */
  saveWorkItemContext(context: WorkItemContext): void {
    const contextFile = path.join(this.workItemsDir, `${context.key}.json`);
    context.extractedAt = new Date().toISOString();
    fs.writeFileSync(contextFile, JSON.stringify(context, null, 2));
    logger.info(`Saved context for ${context.key}`);
  }

  /**
   * Update index entry for a work item
   */
  updateIndexEntry(entry: WorkItemIndexEntry): void {
    const index = this.loadIndex();
    
    const existingIndex = index.workItems.findIndex(item => item.key === entry.key);
    if (existingIndex >= 0) {
      index.workItems[existingIndex] = entry;
    } else {
      index.workItems.push(entry);
    }

    this.saveIndex(index);
  }

  /**
   * Find similar work items based on entities, fields, or feature types
   */
  findSimilarWorkItems(
    workItemKey: string,
    criteria: {
      entities?: string[];
      fields?: string[];
      featureTypes?: string[];
    }
  ): WorkItemIndexEntry[] {
    const index = this.loadIndex();
    const currentItem = index.workItems.find(item => item.key === workItemKey);
    
    if (!currentItem) {
      return [];
    }

    const similar: WorkItemIndexEntry[] = [];

    for (const item of index.workItems) {
      if (item.key === workItemKey) continue;

      let similarity = 0;

      // Check entity similarity
      if (criteria.entities && item.entities.length > 0) {
        const commonEntities = criteria.entities.filter(e => item.entities.includes(e));
        similarity += commonEntities.length * 0.3;
      }

      // Check field similarity
      if (criteria.fields && item.fields.length > 0) {
        const commonFields = criteria.fields.filter(f => item.fields.includes(f));
        similarity += commonFields.length * 0.4;
      }

      // Check feature type similarity
      if (criteria.featureTypes && item.featureTypes.length > 0) {
        const commonTypes = criteria.featureTypes.filter(t => item.featureTypes.includes(t));
        similarity += commonTypes.length * 0.3;
      }

      if (similarity > 0.3) {
        similar.push(item);
      }
    }

    // Sort by similarity (descending)
    return similar.sort((a, b) => {
      const scoreA = this.calculateSimilarityScore(a, criteria);
      const scoreB = this.calculateSimilarityScore(b, criteria);
      return scoreB - scoreA;
    });
  }

  /**
   * Calculate similarity score
   */
  private calculateSimilarityScore(
    item: WorkItemIndexEntry,
    criteria: {
      entities?: string[];
      fields?: string[];
      featureTypes?: string[];
    }
  ): number {
    let score = 0;

    if (criteria.entities && item.entities.length > 0) {
      const commonEntities = criteria.entities.filter(e => item.entities.includes(e));
      score += (commonEntities.length / Math.max(criteria.entities.length, item.entities.length)) * 0.3;
    }

    if (criteria.fields && item.fields.length > 0) {
      const commonFields = criteria.fields.filter(f => item.fields.includes(f));
      score += (commonFields.length / Math.max(criteria.fields.length, item.fields.length)) * 0.4;
    }

    if (criteria.featureTypes && item.featureTypes.length > 0) {
      const commonTypes = criteria.featureTypes.filter(t => item.featureTypes.includes(t));
      score += (commonTypes.length / Math.max(criteria.featureTypes.length, item.featureTypes.length)) * 0.3;
    }

    return score;
  }

  /**
   * Check if work item has v2 files
   */
  hasV2Files(workItemKey: string): boolean {
    const index = this.loadIndex();
    const entry = index.workItems.find(item => item.key === workItemKey);
    
    if (!entry) return false;

    return !!(entry.v2FeatureFiles.ui || entry.v2FeatureFiles.api);
  }

  /**
   * Get all work items with v2 files
   */
  getWorkItemsWithV2(): WorkItemIndexEntry[] {
    const index = this.loadIndex();
    return index.workItems.filter(item => 
      !!(item.v2FeatureFiles.ui || item.v2FeatureFiles.api)
    );
  }
}

