/**
 * FeatureFileParser - Parses Gherkin feature files into structured data
 * 
 * Extracts scenarios, steps, tags, and examples from feature files
 * for comparison and analysis.
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface ParsedFeatureFile {
  path: string;
  name: string;
  type: 'ui' | 'api';
  feature: {
    tags: string[];
    name: string;
    description: string[];
  };
  background?: {
    steps: Step[];
  };
  scenarios: Scenario[];
  metadata: {
    workItemKey?: string;
    generatedDate?: string;
    version?: string;
  };
}

export interface Scenario {
  tags: string[];
  name: string;
  type: 'scenario' | 'outline';
  steps: Step[];
  examples?: ExampleTable;
}

export interface Step {
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
  rawText: string;
  hasDataTable: boolean;
  hasDocString: boolean;
}

export interface ExampleTable {
  headers: string[];
  rows: string[][];
}

// ============================================================================
// FEATURE FILE PARSER CLASS
// ============================================================================

export class FeatureFileParser {
  /**
   * Parse a feature file into structured data
   */
  parse(filePath: string): ParsedFeatureFile {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Feature file not found: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    const parsed: ParsedFeatureFile = {
      path: filePath,
      name: path.basename(filePath, '.feature'),
      type: this.detectType(filePath),
      feature: {
        tags: [],
        name: '',
        description: [],
      },
      scenarios: [],
      metadata: this.extractMetadata(content),
    };

    let currentScenario: Scenario | null = null;
    let inFeature = false;
    let inBackground = false;
    let inScenario = false;
    let inExamples = false;
    let pendingTags: string[] = [];
    let backgroundSteps: Step[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines (but track them for context)
      if (!trimmed) {
        if (inExamples && currentScenario) {
          inExamples = false;
        }
        continue;
      }

      // Comments
      if (trimmed.startsWith('#')) {
        // Extract metadata from comments
        this.parseComment(trimmed, parsed);
        continue;
      }

      // Tags
      if (trimmed.startsWith('@')) {
        const tags = this.extractTags(trimmed);
        pendingTags.push(...tags);
        continue;
      }

      // Feature declaration
      if (trimmed.startsWith('Feature:')) {
        inFeature = true;
        parsed.feature.tags = [...pendingTags];
        pendingTags = [];
        parsed.feature.name = trimmed.replace(/^Feature:\s*/, '').trim();
        continue;
      }

      // Feature description (lines after Feature:)
      if (inFeature && !inBackground && !inScenario && 
          !trimmed.startsWith('Background:') && 
          !trimmed.startsWith('Scenario')) {
        if (trimmed.startsWith('As a') || trimmed.startsWith('I want') || trimmed.startsWith('So that')) {
          parsed.feature.description.push(trimmed);
        }
        continue;
      }

      // Background
      if (trimmed.startsWith('Background:')) {
        inBackground = true;
        inFeature = false;
        backgroundSteps = [];
        continue;
      }

      // Scenario or Scenario Outline
      if (trimmed.startsWith('Scenario:') || trimmed.startsWith('Scenario Outline:')) {
        // Save previous scenario
        if (currentScenario) {
          parsed.scenarios.push(currentScenario);
        }

        inScenario = true;
        inBackground = false;
        inExamples = false;
        
        const scenarioName = trimmed.replace(/^Scenario( Outline)?:\s*/, '').trim();
        currentScenario = {
          tags: [...pendingTags],
          name: scenarioName,
          type: trimmed.startsWith('Scenario Outline:') ? 'outline' : 'scenario',
          steps: [],
        };
        pendingTags = [];
        continue;
      }

      // Examples table
      if (trimmed.startsWith('Examples:')) {
        inExamples = true;
        if (currentScenario) {
          currentScenario.examples = { headers: [], rows: [] };
        }
        continue;
      }

      // Examples table rows
      if (inExamples && trimmed.startsWith('|')) {
        if (currentScenario && currentScenario.examples) {
          const cells = trimmed.split('|').map(c => c.trim()).filter(c => c);
          if (currentScenario.examples.headers.length === 0) {
            currentScenario.examples.headers = cells;
          } else {
            currentScenario.examples.rows.push(cells);
          }
        }
        continue;
      }

      // Steps (Given/When/Then/And/But)
      const stepMatch = trimmed.match(/^(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const keyword = stepMatch[1] as Step['keyword'];
        const text = stepMatch[2].trim();
        
        const step: Step = {
          keyword,
          text: this.normalizeStepText(text),
          rawText: text,
          hasDataTable: false,
          hasDocString: false,
        };

        if (inBackground) {
          backgroundSteps.push(step);
        } else if (currentScenario) {
          currentScenario.steps.push(step);
        }
        continue;
      }
    }

    // Save last scenario
    if (currentScenario) {
      parsed.scenarios.push(currentScenario);
    }

    // Set background if found
    if (backgroundSteps.length > 0) {
      parsed.background = { steps: backgroundSteps };
    }

    return parsed;
  }

  /**
   * Detect feature file type (ui or api) from path
   */
  private detectType(filePath: string): 'ui' | 'api' {
    if (filePath.includes('/ui/')) return 'ui';
    if (filePath.includes('/api/')) return 'api';
    return 'ui'; // Default
  }

  /**
   * Extract tags from a line
   */
  private extractTags(line: string): string[] {
    return line
      .split(/\s+/)
      .filter(tag => tag.startsWith('@'))
      .map(tag => tag.trim());
  }

  /**
   * Parse comment for metadata
   */
  private parseComment(comment: string, parsed: ParsedFeatureFile): void {
    const lower = comment.toLowerCase();
    
    // Extract work item key
    const workItemMatch = comment.match(/JIRA:\s*([A-Z]+-\d+)/i);
    if (workItemMatch) {
      parsed.metadata.workItemKey = workItemMatch[1];
    }

    // Extract generated date
    const dateMatch = comment.match(/Generated:\s*(.+?)(?:\s|$)/i);
    if (dateMatch) {
      parsed.metadata.generatedDate = dateMatch[1];
    }

    // Extract version
    if (lower.includes('v2') || lower.includes('version 2')) {
      parsed.metadata.version = 'v2';
    } else if (lower.includes('v1') || lower.includes('version 1')) {
      parsed.metadata.version = 'v1';
    }
  }

  /**
   * Extract metadata from file content
   */
  private extractMetadata(content: string): ParsedFeatureFile['metadata'] {
    const metadata: ParsedFeatureFile['metadata'] = {};

    // Extract work item from file name or content
    const workItemMatch = content.match(/@([A-Z]+-\d+)/);
    if (workItemMatch) {
      metadata.workItemKey = workItemMatch[1];
    }

    return metadata;
  }

  /**
   * Normalize step text for comparison
   */
  private normalizeStepText(text: string): string {
    // Remove quotes, normalize whitespace
    return text
      .replace(/['"]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  /**
   * Compare two parsed feature files
   */
  compare(file1: ParsedFeatureFile, file2: ParsedFeatureFile): ComparisonResult {
    const result: ComparisonResult = {
      scenarios: {
        added: [],
        removed: [],
        modified: [],
        unchanged: [],
      },
      steps: {
        added: [],
        removed: [],
        modified: [],
      },
      tags: {
        added: [],
        removed: [],
      },
      background: {
        changed: false,
        stepsAdded: [],
        stepsRemoved: [],
      },
    };

    // Compare scenarios
    const scenarios1 = new Map(file1.scenarios.map(s => [s.name, s]));
    const scenarios2 = new Map(file2.scenarios.map(s => [s.name, s]));

    // Find added scenarios
    for (const [name, scenario] of scenarios2) {
      if (!scenarios1.has(name)) {
        result.scenarios.added.push(scenario);
      }
    }

    // Find removed scenarios
    for (const [name, scenario] of scenarios1) {
      if (!scenarios2.has(name)) {
        result.scenarios.removed.push(scenario);
      }
    }

    // Find modified scenarios
    for (const [name, scenario1] of scenarios1) {
      const scenario2 = scenarios2.get(name);
      if (scenario2) {
        const scenarioDiff = this.compareScenarios(scenario1, scenario2);
        if (scenarioDiff.changed) {
          result.scenarios.modified.push({
            original: scenario1,
            updated: scenario2,
            changes: scenarioDiff,
          });
        } else {
          result.scenarios.unchanged.push(scenario1);
        }
      }
    }

    // Compare background
    if (file1.background || file2.background) {
      const bg1 = file1.background?.steps || [];
      const bg2 = file2.background?.steps || [];
      
      if (bg1.length !== bg2.length || 
          !this.stepsEqual(bg1, bg2)) {
        result.background.changed = true;
        result.background.stepsAdded = bg2.filter(s2 => 
          !bg1.some(s1 => this.stepsEqual([s1], [s2]))
        );
        result.background.stepsRemoved = bg1.filter(s1 => 
          !bg2.some(s2 => this.stepsEqual([s1], [s2]))
        );
      }
    }

    return result;
  }

  /**
   * Compare two scenarios
   */
  private compareScenarios(s1: Scenario, s2: Scenario): ScenarioChanges {
    const changes: ScenarioChanges = {
      changed: false,
      stepsAdded: [],
      stepsRemoved: [],
      stepsModified: [],
      tagsAdded: [],
      tagsRemoved: [],
      nameChanged: s1.name !== s2.name,
      typeChanged: s1.type !== s2.type,
    };

    if (changes.nameChanged || changes.typeChanged) {
      changes.changed = true;
    }

    // Compare tags
    const tags1 = new Set(s1.tags);
    const tags2 = new Set(s2.tags);
    
    changes.tagsAdded = s2.tags.filter(t => !tags1.has(t));
    changes.tagsRemoved = s1.tags.filter(t => !tags2.has(t));
    
    if (changes.tagsAdded.length > 0 || changes.tagsRemoved.length > 0) {
      changes.changed = true;
    }

    // Compare steps
    const steps1 = s1.steps;
    const steps2 = s2.steps;

    // Find added steps
    changes.stepsAdded = steps2.filter(s2 => 
      !steps1.some(s1 => this.stepsEqual([s1], [s2]))
    );

    // Find removed steps
    changes.stepsRemoved = steps1.filter(s1 => 
      !steps2.some(s2 => this.stepsEqual([s1], [s2]))
    );

    // Find modified steps (same position, different text)
    for (let i = 0; i < Math.min(steps1.length, steps2.length); i++) {
      if (!this.stepsEqual([steps1[i]], [steps2[i]])) {
        changes.stepsModified.push({
          original: steps1[i],
          updated: steps2[i],
          position: i,
        });
      }
    }

    if (changes.stepsAdded.length > 0 || 
        changes.stepsRemoved.length > 0 || 
        changes.stepsModified.length > 0) {
      changes.changed = true;
    }

    return changes;
  }

  /**
   * Check if two steps are equal
   */
  private stepsEqual(steps1: Step[], steps2: Step[]): boolean {
    if (steps1.length !== steps2.length) return false;
    
    return steps1.every((s1, i) => {
      const s2 = steps2[i];
      return s1.keyword === s2.keyword && 
             s1.text === s2.text;
    });
  }
}

// ============================================================================
// COMPARISON RESULT TYPES
// ============================================================================

export interface ComparisonResult {
  scenarios: {
    added: Scenario[];
    removed: Scenario[];
    modified: ModifiedScenario[];
    unchanged: Scenario[];
  };
  steps: {
    added: Step[];
    removed: Step[];
    modified: ModifiedStep[];
  };
  tags: {
    added: string[];
    removed: string[];
  };
  background: {
    changed: boolean;
    stepsAdded: Step[];
    stepsRemoved: Step[];
  };
}

export interface ModifiedScenario {
  original: Scenario;
  updated: Scenario;
  changes: ScenarioChanges;
}

export interface ScenarioChanges {
  changed: boolean;
  stepsAdded: Step[];
  stepsRemoved: Step[];
  stepsModified: ModifiedStep[];
  tagsAdded: string[];
  tagsRemoved: string[];
  nameChanged: boolean;
  typeChanged: boolean;
}

export interface ModifiedStep {
  original: Step;
  updated: Step;
  position: number;
}

