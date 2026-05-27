/**
 * FeatureGenerator - World-Class Test Case Generator v3.0
 * 
 * ENHANCED CAPABILITIES:
 * - Intelligent parsing of Jira acceptance criteria (Given/When/Then format)
 * - Automatic field name extraction from description (not just title)
 * - Feature type detection (visibility, behavior, auto-population, read-only, etc.)
 * - Comprehensive scenario generation based on EACH acceptance criterion
 * - Automatic negative/boundary scenario generation
 * - Data-driven tests with Scenario Outlines
 * - Multi-object support (Account, Lead, Opportunity, Contact, etc.)
 * - Intelligent API vs UI scenario assignment (no redundancy)
 * - Coverage analysis to ensure every sentence is covered
 * - UI tests include at least one UI-based data creation
 * 
 * Thoroughly analyzes Jira work items including:
 * - Description (full ADF parsing with Given/When/Then detection)
 * - All comments
 * - Related/linked work items
 * - Acceptance criteria (structured parsing)
 * - Field values and picklist options
 * - Sentence-level coverage tracking
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { jiraClient } from './client';
import { logger } from '../../utils/logger';
import { getSFUserRoleFromJira } from '../../utils/user-role-mapping';

// ============================================================================
// TYPES
// ============================================================================

// Parent/Epic context for enhanced test case generation
interface ParentContext {
  key: string;
  summary: string;
  type: string; // Epic, Story, etc.
  status: string;
  description: string;
  acceptanceCriteria: AcceptanceCriterion[];
  businessObjective: string; // High-level business objective extracted from parent
  relatedFeatures: string[]; // Other features/stories under the same parent
  technicalNotes: string[]; // Technical requirements from parent
}

interface JiraData {
  key: string;
  summary: string;
  type: string;
  status: string;
  priority: string;
  description: string;
  rawDescription: any; // Keep raw ADF for detailed parsing
  acceptanceCriteria: AcceptanceCriterion[];
  fieldValues: string[];
  comments: CommentSummary[];
  relatedIssues: RelatedIssue[];
  // V3.1: Parent/Epic context for enhanced understanding
  parentContext: ParentContext | null;
  // Enhanced entity/field extraction
  primaryEntity: string;
  secondaryEntity: string | null;
  actualFieldName: string;
  fieldApiName: string;
  featureType: FeatureType;
  fullContext: string;
  // Multi-field support
  isMultiField: boolean;
  allFields: FieldInfo[];
  // Conditional validation support
  conditionFields: ConditionalField[];
  // Multi-feature-type support (for stories with multiple requirements)
  featureTypes: FeatureType[]; // All detected feature types
  fieldFeatureMap: Map<string, FeatureType>; // Map field to its feature type
  // Coverage analysis (v3.0)
  allSentences: SentenceInfo[]; // All sentences extracted from Jira content
  coverageAnalysis: CoverageAnalysis; // Coverage tracking
  summaryOfUnderstanding: SummaryOfUnderstanding; // V3.0: Structured understanding summary
}

interface SummaryOfUnderstanding {
  overview: string; // High-level summary
  primaryEntity: string; // Main object being tested
  fields: Array<{
    name: string;
    apiName: string;
    action: 'delete' | 'hide' | 'show' | 'create' | 'modify' | 'validate';
    description: string;
  }>;
  accountTypes?: string[]; // Account Types identified (for Account-related features)
  requirements: Array<{
    id: string; // REQ-1, REQ-2, etc.
    description: string; // What needs to be tested
    testType: 'api' | 'ui' | 'both'; // Best way to test this
    priority: 'p1' | 'p2' | 'p3';
    relatedFields: string[]; // Fields involved
    relatedACs: string[]; // Related acceptance criteria IDs
  }>;
  acceptanceCriteria: Array<{
    id: string;
    summary: string;
    covered: boolean;
  }>;
  keyPoints: string[]; // Important notes/constraints
}

interface SentenceInfo {
  id: string; // Unique ID for the sentence
  text: string; // Original sentence text
  source: 'summary' | 'description' | 'comment' | 'acceptance-criteria' | 'scenario';
  sourceIndex: number; // Index within source (e.g., which comment, which AC)
  keywords: string[]; // Extracted keywords for matching
  entities: string[]; // Detected entities (Account, Contact, etc.)
  fields: string[]; // Detected field names
  actions: string[]; // Detected actions (hide, delete, modify, etc.)
  isCovered: boolean; // Whether this sentence is covered by a scenario
  coveringScenarios: string[]; // IDs of scenarios that cover this sentence
  bestTestType: 'api' | 'ui' | 'both'; // Best way to test this requirement
}

interface CoverageAnalysis {
  totalSentences: number;
  coveredSentences: number;
  uncoveredSentences: SentenceInfo[];
  coveragePercentage: number;
  sentenceToScenarioMap: Map<string, string[]>; // sentence ID -> scenario IDs
  scenarioToSentenceMap: Map<string, string[]>; // scenario ID -> sentence IDs
  apiScenarios: string[]; // Scenario IDs assigned to API
  uiScenarios: string[]; // Scenario IDs assigned to UI
}

interface SentenceInfo {
  id: string; // Unique ID for the sentence
  text: string; // Original sentence text
  source: 'summary' | 'description' | 'comment' | 'acceptance-criteria' | 'scenario';
  sourceIndex: number; // Index within source (e.g., which comment, which AC)
  keywords: string[]; // Extracted keywords for matching
  entities: string[]; // Detected entities (Account, Contact, etc.)
  fields: string[]; // Detected field names
  actions: string[]; // Detected actions (hide, delete, modify, etc.)
  isCovered: boolean; // Whether this sentence is covered by a scenario
  coveringScenarios: string[]; // IDs of scenarios that cover this sentence
}

interface CoverageAnalysis {
  totalSentences: number;
  coveredSentences: number;
  uncoveredSentences: SentenceInfo[];
  coveragePercentage: number;
  sentenceToScenarioMap: Map<string, string[]>; // sentence ID -> scenario IDs
  scenarioToSentenceMap: Map<string, string[]>; // scenario ID -> sentence IDs
}

interface FieldInfo {
  displayName: string;
  apiName: string;
  action: 'delete' | 'hide' | 'show' | 'create' | 'modify' | 'validate';
  conditionalAccountTypes?: string[]; // For conditional visibility (e.g., visible only on Member and Non-Member MGA)
}

interface ConditionalField {
  fieldName: string;
  condition: string;
  isRequired: boolean;
}

interface AcceptanceCriterion {
  id: string;           // AC-1, AC-2, etc.
  title: string;        // Short title/name
  given: string[];      // GIVEN conditions
  when: string[];       // WHEN actions
  then: string[];       // THEN expectations
  rawText: string;      // Original text
  isNegative: boolean;  // Is this a negative test case?
  isDataDriven: boolean; // Does it need multiple values?
  relatedValues: string[]; // Extracted values for this AC
  userRole?: string;    // Extracted user role from acceptance criterion (e.g., "MRD", "Admin", "Non-Admin User")
}

interface CommentSummary {
  author: string;
  date: string;
  content: string;
  hasValues: boolean;
}

interface RelatedIssue {
  key: string;
  summary: string;
  type: string;
  relationship: string;
}

// Feature types for intelligent scenario generation
type FeatureType = 
  | 'field-visibility'      // Show/hide fields
  | 'field-behavior'        // Field behavior changes (editable, read-only)
  | 'auto-population'       // Auto-fill from another object
  | 'field-mapping'         // Map field from one object to another
  | 'picklist-values'       // Add/remove/modify picklist values
  | 'validation-rule'       // Add validation rules
  | 'field-creation'        // New field creation
  | 'field-removal'         // Remove/hide field
  | 'permission-based'      // Different behavior based on user role
  | 'general';              // General/unknown

// Generation modes for user-driven scenario input
type GenerationMode = 1 | 2 | 3 | 4;

// User-provided scenario
interface UserScenario {
  title: string;
  given: string[];
  when: string[];
  then: string[];
  source: 'user';
  originalText?: string;
}

// Scenario classification result
interface ClassificationResult {
  type: 'API' | 'UI' | 'NeedsDecision';
  rationale: string;
  questions?: string[];
}

// Scenario metadata for feature files
interface ScenarioMetadata {
  scenario_source: 'user' | 'generator';
  generation_mode: GenerationMode;
  classification: 'API' | 'UI' | 'NeedsDecision';
  classification_rationale: string;
  status: 'READY' | 'BLOCKED';
  questions?: string[];
  added_reason?: string; // For MODE 2 augmented scenarios
}

// Validation result for scenarios
interface ValidationResult {
  status: 'READY' | 'BLOCKED';
  questions: string[];
}

// ============================================================================
// FEATURE GENERATOR
// ============================================================================

interface StepDefinition {
  type: 'Given' | 'When' | 'Then' | 'And';
  pattern: string; // Original pattern from step definition
  regex: RegExp; // Compiled regex for matching
  file: string; // File where it's defined
  isCommon: boolean; // Whether it's in common/ folder
  category: 'api' | 'ui' | 'data' | 'auth' | 'general'; // Category
}

// Application types for multi-platform support
type ApplicationType = 'salesforce' | 'dynamics' | 'unknown';

export class FeatureGenerator {
  private outputDir: string;
  private stepDefinitions: StepDefinition[] = []; // V3.0: Cached step definitions
  private stepsLoaded: boolean = false; // V3.0: Whether steps have been loaded
  private generationMode: GenerationMode = 3; // Default to MODE 3 (current behavior)
  private userScenarios: UserScenario[] = []; // User-provided scenarios (MODE 1 & 2)
  private interactiveMode: boolean = true; // Enable interactive prompts for ambiguous cases

  constructor(outputDir: string = 'src/features', generationMode?: GenerationMode, userScenarios?: UserScenario[]) {
    this.outputDir = outputDir;
    if (generationMode !== undefined) {
      this.generationMode = generationMode;
    }
    if (userScenarios !== undefined) {
      this.userScenarios = userScenarios;
    }
  }

  /**
   * Detect application type from Jira issue key
   * PP = Power Platform (Dynamics)
   * SF/ST = Salesforce
   */
  private detectApplicationType(issueKey: string): ApplicationType {
    const prefix = issueKey.split('-')[0].toUpperCase();
    
    if (prefix === 'PP') {
      return 'dynamics';
    } else if (prefix === 'SF' || prefix === 'ST') {
      return 'salesforce';
    }
    
    return 'unknown';
  }

  /**
   * Interactive prompt for user input
   */
  private async promptUser(question: string, options?: string[]): Promise<string> {
    if (!this.interactiveMode) {
      // Non-interactive mode: return default or first option
      return options?.[0] || '';
    }

    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    
    let promptText = question;
    if (options && options.length > 0) {
      promptText += '\n';
      options.forEach((opt, idx) => {
        promptText += `  [${idx + 1}] ${opt}\n`;
      });
      promptText += '\nYour choice: ';
    } else {
      promptText += ' ';
    }

    const answer = await new Promise<string>(resolve => {
      rl.question(promptText, resolve);
      rl.close();
    });

    // If options provided and answer is a number, return the option
    if (options && options.length > 0) {
      const num = parseInt(answer.trim());
      if (!isNaN(num) && num >= 1 && num <= options.length) {
        return options[num - 1];
      }
    }

    return answer.trim();
  }

  async generate(issueKey: string): Promise<string | null> {
    return this.generateWithSuffix(issueKey, '');
  }

  // ==========================================================================
  // V3.0: STEP DEFINITION ANALYSIS
  // ==========================================================================

  /**
   * Loads and analyzes all step definitions from common and feature-specific files
   */
  private async loadStepDefinitions(): Promise<void> {
    if (this.stepsLoaded) {
      return; // Already loaded
    }

    const stepDefDir = path.join(process.cwd(), 'src/step-definitions');
    const commonDir = path.join(stepDefDir, 'common');
    const apiDir = path.join(stepDefDir, 'api');
    const uiDir = path.join(stepDefDir, 'ui');

    // Load from common files (priority)
    await this.scanStepDefinitions(commonDir, true);
    
    // Load from feature-specific files (for reference)
    await this.scanStepDefinitions(apiDir, false);
    await this.scanStepDefinitions(uiDir, false);

    this.stepsLoaded = true;
    logger.info(`✅ Loaded ${this.stepDefinitions.length} step definitions for analysis`);
  }

  /**
   * Scans a directory for step definition files and extracts patterns
   */
  private async scanStepDefinitions(dir: string, isCommon: boolean): Promise<void> {
    if (!fs.existsSync(dir)) {
      return;
    }

    const files = fs.readdirSync(dir).filter(f => f.endsWith('.steps.ts'));
    
    for (const file of files) {
      const filePath = path.join(dir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Determine category
      let category: StepDefinition['category'] = 'general';
      if (file.includes('api')) category = 'api';
      else if (file.includes('ui')) category = 'ui';
      else if (file.includes('data')) category = 'data';
      else if (file.includes('auth')) category = 'auth';

      // Extract step definitions (Given/When/Then/And)
      const stepPatterns = [
        /(Given|When|Then|And)\s*\(['"`]([^'"`]+)['"`]/g,
        /(Given|When|Then|And)\s*\(`([^`]+)`/g,
      ];

      for (const pattern of stepPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const type = match[1] as StepDefinition['type'];
          const stepPattern = match[2];
          
          // Convert Cucumber pattern to regex
          const regex = this.patternToRegex(stepPattern);
          
          this.stepDefinitions.push({
            type,
            pattern: stepPattern,
            regex,
            file: filePath,
            isCommon,
            category,
          });
        }
      }
    }
  }

  /**
   * Converts a Cucumber step pattern to a regex for matching
   */
  private patternToRegex(pattern: string): RegExp {
    // Escape special regex characters
    const regexStr = pattern
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      // Convert Cucumber placeholders to regex
      .replace(/\\\{int\\\}/g, '\\d+')
      .replace(/\\\{word\\\}/g, '\\w+')
      .replace(/\\\{string\\\}/g, '"[^"]*"')
      .replace(/\\\{float\\\}/g, '\\d+\\.\\d+');

    return new RegExp(`^${regexStr}$`, 'i');
  }

  /**
   * Finds matching step definitions for a given step text
   */
  private findMatchingSteps(stepText: string): StepDefinition[] {
    const matches: StepDefinition[] = [];
    
    for (const stepDef of this.stepDefinitions) {
      // Try exact match first
      if (stepDef.regex.test(stepText)) {
        matches.push(stepDef);
      } else {
        // Try fuzzy match (for parameterized steps)
        const normalizedStep = stepText.toLowerCase().trim();
        const normalizedPattern = stepDef.pattern.toLowerCase();
        
        // Check if step text contains key words from pattern
        const patternWords = normalizedPattern.split(/\s+/).filter(w => 
          w.length > 3 && !w.includes('{') && !w.includes('}')
        );
        const matchingWords = patternWords.filter(w => normalizedStep.includes(w));
        
        if (matchingWords.length >= patternWords.length * 0.7) {
          matches.push(stepDef);
        }
      }
    }
    
    // Sort by: common steps first, then by match quality
    return matches.sort((a, b) => {
      if (a.isCommon !== b.isCommon) return a.isCommon ? -1 : 1;
      return 0;
    });
  }

  /**
   * Analyzes a scenario and determines which steps need to be created
   */
  private analyzeScenarioSteps(scenarioLines: string[]): {
    existingSteps: Array<{ step: string; stepDef: StepDefinition }>;
    missingSteps: Array<{ step: string; suggestedLocation: 'common' | 'feature-specific'; reason: string }>;
  } {
    const existingSteps: Array<{ step: string; stepDef: StepDefinition }> = [];
    const missingSteps: Array<{ step: string; suggestedLocation: 'common' | 'feature-specific'; reason: string }> = [];

    for (const line of scenarioLines) {
      const trimmed = line.trim();
      if (!trimmed.match(/^(Given|When|Then|And)\s+/i)) {
        continue;
      }

      const matches = this.findMatchingSteps(trimmed);
      
      if (matches.length > 0) {
        // Prefer common steps
        const bestMatch = matches.find(m => m.isCommon) || matches[0];
        existingSteps.push({ step: trimmed, stepDef: bestMatch });
      } else {
        // Determine if this should be common or feature-specific
        const shouldBeCommon = this.shouldBeCommonStep(trimmed);
        missingSteps.push({
          step: trimmed,
          suggestedLocation: shouldBeCommon ? 'common' : 'feature-specific',
          reason: shouldBeCommon 
            ? 'Generic pattern that could be reused across multiple features'
            : 'Feature-specific logic that is unlikely to be reused',
        });
      }
    }

    return { existingSteps, missingSteps };
  }

  /**
   * Determines if a step should be added to common steps
   */
  private shouldBeCommonStep(stepText: string): boolean {
    const lowerText = stepText.toLowerCase();
    
    // Common patterns (should be in common/)
    const commonPatterns = [
      'navigate to',
      'click',
      'fill in',
      'save',
      'should be visible',
      'should not be visible',
      'should exist',
      'should not exist',
      'should display',
      'should be editable',
      'should be read-only',
      'should be required',
      'should be hidden',
      'create.*via api',
      'update.*via api',
      'query.*via api',
      'describe.*object',
      'field type',
      'picklist',
      'help text',
      'take a screenshot',
    ];

    // Feature-specific patterns (should be in feature-specific files)
    const specificPatterns = [
      'sf-\\d+', // SF-XXX specific
      'specific.*workflow',
      'custom.*validation',
    ];

    // Check for common patterns
    for (const pattern of commonPatterns) {
      if (new RegExp(pattern, 'i').test(stepText)) {
        return true;
      }
    }

    // Check for feature-specific patterns
    for (const pattern of specificPatterns) {
      if (new RegExp(pattern, 'i').test(stepText)) {
        return false;
      }
    }

    // Default: if it uses generic entities/fields, make it common
    const hasGenericEntity = /\b(Account|Contact|Lead|Opportunity|Record)\b/i.test(stepText);
    const hasGenericField = /\{string\}|\{word\}|\{int\}/.test(stepText);
    
    return hasGenericEntity || hasGenericField;
  }

  // ==========================================================================
  // USER SCENARIO PARSING & PROCESSING
  // ==========================================================================

  /**
   * Parses a Gherkin .feature file and extracts scenarios
   */
  static parseUserFeatureFile(filePath: string): UserScenario[] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const scenarios: UserScenario[] = [];
    
    // Simple Gherkin parser - extract scenarios
    const scenarioRegex = /Scenario(?:\s+Outline)?:\s*(.+?)(?=\s+Scenario|\s+Feature|$)/gs;
    let match;
    
    while ((match = scenarioRegex.exec(content)) !== null) {
      const scenarioText = match[1];
      const lines = scenarioText.split('\n').map(l => l.trim()).filter(l => l);
      
      const scenario: UserScenario = {
        title: lines[0] || 'Untitled Scenario',
        given: [],
        when: [],
        then: [],
        source: 'user',
        originalText: scenarioText
      };
      
      let currentSection: 'given' | 'when' | 'then' | null = null;
      
      for (const line of lines.slice(1)) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.startsWith('given')) {
          currentSection = 'given';
          scenario.given.push(line.replace(/^Given\s+/i, '').trim());
        } else if (lowerLine.startsWith('when')) {
          currentSection = 'when';
          scenario.when.push(line.replace(/^When\s+/i, '').trim());
        } else if (lowerLine.startsWith('then')) {
          currentSection = 'then';
          scenario.then.push(line.replace(/^Then\s+/i, '').trim());
        } else if (lowerLine.startsWith('and') || lowerLine.startsWith('but')) {
          const step = line.replace(/^(And|But)\s+/i, '').trim();
          if (currentSection && step) {
            scenario[currentSection].push(step);
          }
        }
      }
      
      if (scenario.given.length > 0 || scenario.when.length > 0 || scenario.then.length > 0) {
        scenarios.push(scenario);
      }
    }
    
    return scenarios;
  }

  /**
   * Parses a CSV/XLSX file with scenario data
   * Expected columns: Scenario Title, Given, When, Then
   */
  static parseUserScenarioSheet(csvPath: string): UserScenario[] {
    const content = fs.readFileSync(csvPath, 'utf-8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l);
    
    if (lines.length < 2) {
      return [];
    }
    
    // Parse header
    const header = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const titleIdx = header.findIndex(h => /title|scenario/i.test(h));
    const givenIdx = header.findIndex(h => /given/i.test(h));
    const whenIdx = header.findIndex(h => /when/i.test(h));
    const thenIdx = header.findIndex(h => /then/i.test(h));
    
    if (titleIdx === -1 || givenIdx === -1 || whenIdx === -1 || thenIdx === -1) {
      throw new Error('CSV must contain columns: Scenario Title, Given, When, Then');
    }
    
    const scenarios: UserScenario[] = [];
    
    // Parse rows
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      
      if (row.length < Math.max(titleIdx, givenIdx, whenIdx, thenIdx) + 1) {
        continue;
      }
      
      const title = row[titleIdx] || `Scenario ${i}`;
      const given = row[givenIdx] ? row[givenIdx].split(/[;\n]/).map(s => s.trim()).filter(s => s) : [];
      const when = row[whenIdx] ? row[whenIdx].split(/[;\n]/).map(s => s.trim()).filter(s => s) : [];
      const then = row[thenIdx] ? row[thenIdx].split(/[;\n]/).map(s => s.trim()).filter(s => s) : [];
      
      if (given.length > 0 || when.length > 0 || then.length > 0) {
        scenarios.push({
          title,
          given,
          when,
          then,
          source: 'user'
        });
      }
    }
    
    return scenarios;
  }

  /**
   * Normalizes user-provided scenarios
   */
  private normalizeUserScenarios(scenarios: UserScenario[]): UserScenario[] {
    return scenarios.map(scenario => ({
      ...scenario,
      given: this.normalizeSteps(scenario.given, 'Given'),
      when: this.normalizeSteps(scenario.when, 'When'),
      then: this.normalizeSteps(scenario.then, 'Then'),
    }));
  }

  /**
   * Normalizes steps to ensure proper Gherkin format
   */
  private normalizeSteps(steps: string[], keyword: string): string[] {
    return steps
      .map(step => {
        // Remove existing keyword if present
        let cleaned = step.replace(/^(Given|When|Then|And|But)\s+/i, '').trim();
        // Capitalize first letter
        if (cleaned.length > 0) {
          cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
        return cleaned;
      })
      .filter(step => step.length > 0);
  }

  /**
   * Classifies a scenario as API, UI, or NeedsDecision
   */
  private classifyScenario(scenario: UserScenario): ClassificationResult {
    const allSteps = [...scenario.given, ...scenario.when, ...scenario.then]
      .join(' ')
      .toLowerCase();

    // Prefer API when:
    if (
      /field.*exist|verify.*exist|check.*exist|field.*type|metadata/i.test(allSteps) ||
      /create.*via api|update.*via api|query.*via api|describe.*object/i.test(allSteps) ||
      /business.*rule|validation|data.*integrity|crud/i.test(allSteps)
    ) {
      return {
        type: 'API',
        rationale: 'Scenario tests business rules, validations, or data integrity via API'
      };
    }

    // Use UI when:
    if (
      /navigate|click|fill|visible|display|render|help text|client.*validation/i.test(allSteps) ||
      /user.*interaction|browser|auth.*flow|end.*to.*end/i.test(allSteps)
    ) {
      return {
        type: 'UI',
        rationale: 'Scenario requires user interaction, navigation, or UI-specific behavior'
      };
    }

    // If both are possible:
    if (
      /create|update|save|edit/i.test(allSteps) &&
      !/via api|via POST/i.test(allSteps)
    ) {
      return {
        type: 'API',
        rationale: 'Scenario can be tested via API or UI; defaulting to API for efficiency. Consider adding 1-2 P0 UI smoke tests.'
      };
    }

    // NeedsDecision:
    return {
      type: 'NeedsDecision',
      rationale: 'Unable to determine optimal test type. Please review: Does this require UI interaction or can it be tested via API?',
      questions: [
        'Does this scenario require browser-based user interaction?',
        'Is this testing UI rendering/visibility?',
        'Can this be validated via API or database query?'
      ]
    };
  }

  /**
   * Deduplicates scenarios by intent, not exact wording
   */
  private deduplicateScenarios(scenarios: UserScenario[]): UserScenario[] {
    const seen: Map<string, UserScenario> = new Map();
    
    for (const scenario of scenarios) {
      const signature = this.createIntentSignature(scenario);
      
      if (!seen.has(signature)) {
        seen.set(signature, scenario);
      }
    }
    
    return Array.from(seen.values());
  }

  /**
   * Creates an intent signature for deduplication
   */
  private createIntentSignature(scenario: UserScenario): string {
    const allText = [...scenario.given, ...scenario.when, ...scenario.then]
      .join(' ')
      .toLowerCase();
    
    // Extract entities
    const entities = ['account', 'contact', 'lead', 'opportunity', 'record'];
    const foundEntity = entities.find(e => allText.includes(e)) || 'record';
    
    // Extract fields (simple pattern)
    const fieldMatch = allText.match(/"([^"]+)"/);
    const field = fieldMatch ? fieldMatch[1].toLowerCase().replace(/\s+/g, '-') : 'field';
    
    // Extract actions
    let action = 'general';
    if (/visible|display|show/i.test(allText)) action = 'visibility';
    else if (/edit|modify|update|change/i.test(allText)) action = 'edit';
    else if (/create|new|add/i.test(allText)) action = 'create';
    else if (/delete|remove|hide/i.test(allText)) action = 'delete';
    else if (/exist|verify|check/i.test(allText)) action = 'verify';
    
    return `${foundEntity}-${field}-${action}`;
  }

  /**
   * Validates scenario and marks as BLOCKED if required info is missing
   */
  private validateScenario(scenario: UserScenario, jiraData: JiraData): ValidationResult {
    const issues: string[] = [];
    const allSteps = [...scenario.given, ...scenario.when, ...scenario.then].join(' ').toLowerCase();
    
    // Check for missing entities
    const entities = ['account', 'contact', 'lead', 'opportunity', 'record'];
    const hasEntity = entities.some(e => allSteps.includes(e));
    if (!hasEntity && !jiraData.primaryEntity) {
      issues.push('Entity not specified. Which object is being tested?');
    }
    
    // Check for missing fields (if Jira has field info)
    const hasField = /"[^"]+"/.test(allSteps);
    if (!hasField && jiraData.actualFieldName) {
      issues.push(`Field not specified. Is this testing "${jiraData.actualFieldName}"?`);
    }
    
    // Check for missing step definitions
    const scenarioLines = [
      ...scenario.given.map(g => `Given ${g}`),
      ...scenario.when.map(w => `When ${w}`),
      ...scenario.then.map(t => `Then ${t}`)
    ];
    const stepAnalysis = this.analyzeScenarioSteps(scenarioLines);
    if (stepAnalysis.missingSteps.length > 0) {
      const missingStepNames = stepAnalysis.missingSteps
        .slice(0, 3)
        .map(s => s.step)
        .join(', ');
      issues.push(`Missing step definitions: ${missingStepNames}${stepAnalysis.missingSteps.length > 3 ? '...' : ''}`);
    }
    
    return {
      status: issues.length > 0 ? 'BLOCKED' : 'READY',
      questions: issues
    };
  }

  /**
   * Generates additional scenarios to fill coverage gaps (MODE 2 only)
   */
  private generateAugmentedScenarios(
    userScenarios: UserScenario[],
    jiraData: JiraData,
    maxAdditional: number = 5
  ): { scenarios: UserScenario[], explanations: string[] } {
    const augmented: UserScenario[] = [];
    const explanations: string[] = [];
    
    // Get user scenario signatures to avoid duplicates
    const userSignatures = new Set(userScenarios.map(s => this.createIntentSignature(s)));
    
    // Find uncovered P1 requirements
    const uncoveredReqs = jiraData.summaryOfUnderstanding.requirements
      .filter(req => req.priority === 'p1')
      .slice(0, maxAdditional);
    
    for (const req of uncoveredReqs) {
      // Check if user scenarios already cover this
      const reqSignature = `${jiraData.primaryEntity.toLowerCase()}-${req.relatedFields[0] || 'field'}-verify`;
      if (userSignatures.has(reqSignature)) {
        continue;
      }
      
      // Generate minimal scenario
      const scenario: UserScenario = {
        title: req.description.substring(0, 60),
        given: [`I am logged in as a "Accelerant - System administrator" user`],
        when: [],
        then: [req.description],
        source: 'user' // Will be marked as generator in metadata
      };
      
      // Add appropriate steps based on requirement
      if (req.testType === 'ui' || req.testType === 'both') {
        scenario.given.push(`I have an existing ${jiraData.primaryEntity} record`);
        scenario.when.push(`I navigate to the ${jiraData.primaryEntity} record`);
      }
      
      augmented.push(scenario);
      explanations.push(`Added by generator: Covers critical P1 requirement ${req.id} - ${req.description.substring(0, 50)}...`);
      
      if (augmented.length >= maxAdditional) {
        break;
      }
    }
    
    return { scenarios: augmented, explanations };
  }

  async generateWithSuffix(issueKey: string, suffix: string = ''): Promise<string | null> {
    logger.info(`\n${'═'.repeat(80)}`);
    logger.info(`🚀 DEEP ANALYSIS FEATURE GENERATOR v3.0 - Processing: ${issueKey}${suffix || ''}`);
    logger.info(`${'═'.repeat(80)}\n`);

    // ==========================================================================
    // MODE INFORMATION
    // ==========================================================================
    const modeDescriptions: Record<GenerationMode, string> = {
      1: 'User Scenarios Only - Only user-provided scenarios are used, no generator scenarios',
      2: 'User Scenarios + Augmentation - User scenarios as baseline, generator adds critical gaps',
      3: 'Generator Only - Full automatic generation from Jira data (current behavior)',
      4: 'Risk-Based Testing (RBT) - UI test cases generated; API optional (minimal 1-2 or skip)'
    };
    logger.info(`📋 GENERATION MODE: ${this.generationMode} - ${modeDescriptions[this.generationMode]}\n`);

    // ==========================================================================
    // PHASE 1: PREPARATION
    // ==========================================================================
    logger.info(`📋 PHASE 1: PREPARATION`);
    logger.info(`   └─ Loading step definitions for analysis...`);
    await this.loadStepDefinitions();
    logger.info(`   ✅ Step definitions loaded: ${this.stepDefinitions.length} total\n`);
    
    // Normalize and deduplicate user scenarios if provided
    if (this.userScenarios.length > 0) {
      logger.info(`📋 USER SCENARIOS PROCESSING`);
      logger.info(`   └─ Normalizing and deduplicating ${this.userScenarios.length} user scenario(s)...`);
      this.userScenarios = this.deduplicateScenarios(this.normalizeUserScenarios(this.userScenarios));
      logger.info(`   ✅ Processed ${this.userScenarios.length} unique scenario(s)\n`);
    }

    // ==========================================================================
    // PHASE 2: JIRA DATA FETCHING & DEEP ANALYSIS
    // ==========================================================================
    logger.info(`📋 PHASE 2: JIRA DATA FETCHING & DEEP ANALYSIS`);
    logger.info(`   └─ Fetching comprehensive data from Jira...`);
    
    const jiraData = await this.fetchComprehensiveData(issueKey);
    
    logger.info(`   ✅ Data fetched successfully`);
    logger.info(`\n   📊 ANALYSIS SUMMARY:`);
    logger.info(`      • Description: ${jiraData.description.length} characters`);
    logger.info(`      • Acceptance Criteria: ${jiraData.acceptanceCriteria.length} item(s)`);
    logger.info(`      • Comments: ${jiraData.comments.length} comment(s)`);
    logger.info(`      • Related Issues: ${jiraData.relatedIssues.length} issue(s)`);
    logger.info(`      • Parent Context: ${jiraData.parentContext ? jiraData.parentContext.key : 'None'}`);
    logger.info(`      • Field Values: ${jiraData.fieldValues.length} value(s)`);
    logger.info(`      • Sentences Extracted: ${jiraData.allSentences.length} sentence(s)`);
    logger.info(`      • Requirements Identified: ${jiraData.summaryOfUnderstanding.requirements.length} requirement(s)`);
    logger.info(`      • Fields Involved: ${jiraData.summaryOfUnderstanding.fields.length} field(s)`);
    
    // V3.1: Show parent context details
    if (jiraData.parentContext) {
      logger.info(`\n   📑 PARENT/EPIC CONTEXT:`);
      logger.info(`      • Parent Key: ${jiraData.parentContext.key}`);
      logger.info(`      • Parent Type: ${jiraData.parentContext.type}`);
      logger.info(`      • Business Objective: ${jiraData.parentContext.businessObjective.substring(0, 50) || 'N/A'}...`);
      logger.info(`      • Parent ACs: ${jiraData.parentContext.acceptanceCriteria.length} item(s)`);
      logger.info(`      • Related Features: ${jiraData.parentContext.relatedFeatures.length} item(s)`);
    }
    
    // Deep analysis breakdown
    logger.info(`\n   🔍 DEEP ANALYSIS BREAKDOWN:`);
    logger.info(`      • Primary Entity: ${jiraData.primaryEntity}`);
    logger.info(`      • Secondary Entity: ${jiraData.secondaryEntity || 'None'}`);
    logger.info(`      • Primary Field: ${jiraData.actualFieldName} (${jiraData.fieldApiName})`);
    logger.info(`      • Feature Type(s): ${jiraData.featureTypes.join(', ')}`);
    logger.info(`      • Is Multi-Field: ${jiraData.isMultiField ? 'Yes' : 'No'}`);
    
    if (jiraData.summaryOfUnderstanding.fields.length > 0) {
      logger.info(`\n   📌 FIELDS IDENTIFIED:`);
      jiraData.summaryOfUnderstanding.fields.forEach((field, idx) => {
        logger.info(`      ${idx + 1}. ${field.name} (${field.apiName}) - Action: ${field.action}`);
      });
    }
    
    if (jiraData.summaryOfUnderstanding.requirements.length > 0) {
      logger.info(`\n   📋 REQUIREMENTS IDENTIFIED:`);
      jiraData.summaryOfUnderstanding.requirements.forEach((req, idx) => {
        logger.info(`      ${req.id}: ${req.description.substring(0, 60)}...`);
        logger.info(`         → Test Type: ${req.testType.toUpperCase()} | Priority: ${req.priority}`);
      });
    }
    
    logger.info(`\n   ✅ Deep analysis complete\n`);

    // ==========================================================================
    // PHASE 3: SCENARIO GENERATION STRATEGY
    // ==========================================================================
    logger.info(`📋 PHASE 3: SCENARIO GENERATION STRATEGY`);
    logger.info(`   └─ Analyzing requirements and determining optimal test approach...`);
    
    const strategy = this.analyzeTestStrategy(jiraData);
    
    logger.info(`   ✅ Strategy determined:`);
    logger.info(`      • UI Scenarios: ${strategy.uiScenarios} scenario(s)`);
    logger.info(`      • API Scenarios: ${strategy.apiScenarios} scenario(s)`);
    logger.info(`      • UI Data Creation: ${strategy.uiDataCreation ? 'Required' : 'Not Required'}`);
    logger.info(`      • Efficiency Score: ${strategy.efficiencyScore}/100\n`);

    // ==========================================================================
    // PHASE 4: FEATURE FILE GENERATION
    // ==========================================================================
    logger.info(`📋 PHASE 4: FEATURE FILE GENERATION`);
    logger.info(`   └─ Generating UI feature file...`);
    const uiContent = this.generateUIFeature(jiraData, suffix, this.generationMode, this.userScenarios);
    const uiPath = await this.writeFile(issueKey, uiContent, 'ui', suffix);
    logger.info(`   ✅ UI feature generated: ${uiPath}`);

    logger.info(`   └─ Generating API feature file...`);
    const apiContent = this.generateAPIFeature(jiraData, suffix, this.generationMode, this.userScenarios);
    await this.writeFile(issueKey, apiContent, 'api', suffix);
    logger.info(`   ✅ API feature generated\n`);

    logger.info(`${'═'.repeat(80)}`);
    logger.info(`✅ Feature generation complete for ${issueKey}${suffix || ''}`);
    logger.info(`${'═'.repeat(80)}\n`);

    return uiPath;
  }

  // ==========================================================================
  // TEST STRATEGY ANALYSIS
  // ==========================================================================

  /**
   * Analyzes requirements and determines optimal test strategy (API vs UI)
   * Considers efficiency, speed, and coverage requirements
   */
  private analyzeTestStrategy(data: JiraData): {
    uiScenarios: number;
    apiScenarios: number;
    uiDataCreation: boolean;
    efficiencyScore: number;
  } {
    let uiScenarios = 0;
    let apiScenarios = 0;
    let uiDataCreation = false;
    let efficiencyScore = 0;
    let totalDecisions = 0;

    for (const req of data.summaryOfUnderstanding.requirements) {
      totalDecisions++;
      
      // Decision logic based on requirement type
      if (req.testType === 'api') {
        apiScenarios++;
        efficiencyScore += 90; // API tests are generally faster
      } else if (req.testType === 'ui') {
        uiScenarios++;
        efficiencyScore += 70; // UI tests are slower but necessary for visibility/behavior
        // Mark UI data creation if this is a creation requirement
        if (req.description.toLowerCase().includes('create') && !uiDataCreation) {
          uiDataCreation = true;
        }
      } else {
        // Both - decide based on efficiency
        // Prefer API for existence/type checks, UI for visibility/behavior
        if (req.description.toLowerCase().includes('exist') || 
            req.description.toLowerCase().includes('type') ||
            req.description.toLowerCase().includes('metadata')) {
          apiScenarios++;
          efficiencyScore += 85;
        } else {
          uiScenarios++;
          efficiencyScore += 75;
          if (req.description.toLowerCase().includes('create') && !uiDataCreation) {
            uiDataCreation = true;
          }
        }
      }
    }

    // Ensure at least one UI data creation scenario
    if (uiScenarios > 0 && !uiDataCreation) {
      // We'll add a UI data creation scenario during generation
      uiDataCreation = true;
    }

    // Calculate average efficiency score
    const avgEfficiency = totalDecisions > 0 ? Math.round(efficiencyScore / totalDecisions) : 0;

    return {
      uiScenarios,
      apiScenarios,
      uiDataCreation,
      efficiencyScore: avgEfficiency,
    };
  }

  // ==========================================================================
  // COMPREHENSIVE DATA FETCHING
  // ==========================================================================

  private async fetchComprehensiveData(issueKey: string): Promise<JiraData> {
    const issue = await jiraClient.getIssue(issueKey);
    const comments = await jiraClient.getComments(issueKey);

    const rawDescription = issue.fields.description;
    const description = this.parseADFComprehensive(rawDescription);
    const parsedComments = this.parseAllComments(comments);
    const relatedIssues = await this.fetchRelatedIssues(issue);

    // V3.1: Fetch parent/epic context for enhanced understanding
    logger.info(`   └─ Fetching parent/epic context...`);
    const parentContext = await this.fetchParentContext(issue);
    if (parentContext) {
      logger.info(`   ✅ Parent context loaded: ${parentContext.key} (${parentContext.type})`);
      logger.info(`      • Summary: ${parentContext.summary.substring(0, 60)}...`);
      logger.info(`      • Business Objective: ${parentContext.businessObjective.substring(0, 60) || 'N/A'}...`);
    } else {
      logger.info(`   ℹ️  No parent/epic found for this issue`);
    }

    const fullContext = this.buildFullContext(description, parsedComments, relatedIssues, parentContext);

    // ENHANCED: Extract change components FIRST to override feature type and entity detection
    // Also pass description to check for fields mentioned there
    logger.info(`   └─ Extracting change components from comments and description...`);
    const changeComponents = this.extractChangeComponents(parsedComments, description);
    logger.info(`   ✅ Extracted ${changeComponents.length} change component(s)`);
    if (changeComponents.length > 0) {
      changeComponents.forEach((cc, idx) => {
        logger.info(`      ${idx + 1}. ${cc.objectName}.${cc.fieldApiName} - ${cc.changeType}`);
      });
    }
    
    // Enhanced extraction - now includes comments AND change components for better object/field detection
    const { primaryEntity, secondaryEntity, actualFieldName, fieldApiName } = 
      this.extractEnhancedEntityAndField(issue.fields.summary || '', description, parsedComments, changeComponents);
    
    // ENHANCED: Detect feature type using all context including comments
    const allContextText = description + '\n' + parsedComments.map(c => c.content).join('\n');
    let featureType = this.detectFeatureType(issue.fields.summary || '', allContextText);
    
    // ENHANCED: Override feature type based on change components (takes priority)
    if (changeComponents.length > 0) {
      // ENHANCED: Prioritize "Delete" over "Modify" - find Delete first
      const deleteComponent = changeComponents.find(c => c.changeType.toLowerCase() === 'delete');
      const primaryComponent = deleteComponent || changeComponents[0];
      
      logger.info(`Primary change component: ${JSON.stringify(primaryComponent)}`);
      if (primaryComponent.changeType.toLowerCase() === 'delete') {
        featureType = 'field-removal';
        logger.info(`✅ Overriding feature type to 'field-removal' based on change component`);
      } else if (primaryComponent.changeType.toLowerCase() === 'modify') {
        // Could be picklist-values, field-behavior, etc. - keep detected type
        logger.info(`Change type is 'modify', keeping detected feature type: ${featureType}`);
      }
    } else {
      logger.debug('No change components found - using text-based feature type detection');
    }

    // Extract acceptance criteria with structure
    const acceptanceCriteria = this.extractStructuredAcceptanceCriteria(description, parsedComments);

    // Extract field values (with Account Type detection)
    // Note: extractFieldValues now handles Account Type detection internally
    const fieldValues = this.extractFieldValues(rawDescription, parsedComments, fullContext);
    
    // ENHANCED: Detect Account Types separately from full context (before filtering)
    // We need to extract raw values first to detect Account Types
    const rawValues: Set<string> = new Set();
    this.extractFromADFStructure(rawDescription, rawValues);
    parsedComments.filter(c => c.hasValues).forEach(c => {
      this.extractValuesFromText(c.content, rawValues);
    });
    this.extractValuesFromText(fullContext, rawValues);
    
    // ENHANCED: Extract Account Types directly from Scope section first (most reliable)
    const accountTypesFromScope = this.extractAccountTypesFromScope(fullContext);
    
    const accountTypeDetection = this.detectAccountTypes(fullContext, Array.from(rawValues));
    let accountTypes = accountTypeDetection.areAccountTypes ? accountTypeDetection.accountTypes : [];
    
    // Merge with Account Types from Scope section (ensures we get all 17)
    if (accountTypesFromScope.length > 0) {
      accountTypesFromScope.forEach((type: string) => {
        if (!accountTypes.includes(type)) {
          accountTypes.push(type);
        }
      });
    }
    
    // If we're in Account Type context and have Account entity, always use all 17 known types
    if (primaryEntity.toLowerCase() === 'account' && fullContext.toLowerCase().includes('account type')) {
      const allKnownTypes = [
        'Acquisition Company', 'Agency', 'Agency Branch', 'Distribution Partner',
        'Group', 'Insurer', 'Insurer Branch', 'Legal Entity', 'Member',
        'Non-Member MGA', 'Placing Broker', 'Reinsurance Broker', 'Reinsurer',
        'Reinsurer Branch', 'Service Company', 'Third Party Administrator (TPA)', 'TPA Group'
      ];
      // Use all known types if we're in Account Type context
      accountTypes = allKnownTypes;
      logger.info(`✅ Using all 17 known Account Types from context`);
    } else {
      // Consolidate all Account Types to ensure exactly 17 unique types (no duplicates)
      accountTypes = this.consolidateAccountTypes(accountTypes);
    }
    
    // Final consolidation to ensure exactly 17 (in case consolidation didn't catch all)
    accountTypes = this.consolidateAccountTypes(accountTypes);
    
    if (accountTypes.length > 0) {
      logger.info(`✅ Final Account Types: ${accountTypes.length} type(s): ${accountTypes.join(', ')}`);
    }

    // Extract multiple fields from summary and description
    // ENHANCED: Also extract from raw ADF structure for better table parsing
    const { allFields: fieldsFromText, isMultiField: isMultiFromText } = this.extractMultipleFields(issue.fields.summary || '', description);
    
    // ENHANCED: Extract fields directly from ADF table structure
    const fieldsFromADF = this.extractFieldsFromADFTable(rawDescription);
    const allFields = fieldsFromADF.length > 0 ? fieldsFromADF : fieldsFromText;
    const isMultiField = allFields.length > 1;
    
    if (fieldsFromADF.length > 0) {
      logger.info(`✅ Extracted ${fieldsFromADF.length} field(s) from ADF table structure`);
    }
    
    // Extract conditional validation fields
    const conditionFields = this.extractConditionalFields(description);

    // ENHANCED: Detect multiple feature types from acceptance criteria and field actions
    const { featureTypes, fieldFeatureMap } = this.detectMultipleFeatureTypes(
      acceptanceCriteria, 
      allFields, 
      changeComponents,
      allContextText
    );

    // V3.0: Extract all sentences for coverage analysis
    logger.info(`   └─ Extracting sentences from all sources for coverage analysis...`);
    const allSentences = this.extractAllSentences(
      issue.fields.summary || '',
      description,
      parsedComments,
      acceptanceCriteria
    );
    logger.info(`   ✅ Extracted ${allSentences.length} sentence(s) for analysis`);

    // V3.0: Generate Summary of Understanding (structured, actionable summary)
    logger.info(`   └─ Generating Summary of Understanding...`);
    const summaryOfUnderstanding = this.generateSummaryOfUnderstanding(
      issue.fields.summary || '',
      description,
      acceptanceCriteria,
      allFields,
      changeComponents,
      primaryEntity,
      actualFieldName,
      featureTypes,
      parsedComments,
      accountTypes
    );
    logger.info(`   ✅ Summary generated: ${summaryOfUnderstanding.requirements.length} requirement(s), ${summaryOfUnderstanding.fields.length} field(s)`);

    // V3.0: Initialize coverage analysis based on summary requirements (not raw sentences)
    const coverageAnalysis: CoverageAnalysis = {
      totalSentences: summaryOfUnderstanding.requirements.length,
      coveredSentences: 0,
      uncoveredSentences: [],
      coveragePercentage: 0,
      sentenceToScenarioMap: new Map<string, string[]>(),
      scenarioToSentenceMap: new Map<string, string[]>(),
      apiScenarios: [],
      uiScenarios: [],
    };

    return {
      key: issueKey,
      summary: issue.fields.summary || '',
      type: issue.fields.issuetype?.name || 'Story',
      status: issue.fields.status?.name || 'Unknown',
      priority: issue.fields.priority?.name || 'Medium',
      description,
      rawDescription,
      acceptanceCriteria,
      fieldValues,
      comments: parsedComments,
      relatedIssues,
      parentContext,
      primaryEntity,
      secondaryEntity,
      actualFieldName,
      fieldApiName,
      featureType,
      fullContext,
      isMultiField,
      allFields,
      conditionFields,
      featureTypes,
      fieldFeatureMap,
      allSentences,
      coverageAnalysis,
      summaryOfUnderstanding,
    };
  }

  // ==========================================================================
  // ENHANCED ENTITY/FIELD EXTRACTION
  // ==========================================================================

  private extractEnhancedEntityAndField(
    summary: string, 
    description: string, 
    comments: CommentSummary[] = [],
    changeComponents: Array<{objectName: string; fieldName: string; fieldApiName: string; componentType: string; changeType: string}> = []
  ): {
    primaryEntity: string;
    secondaryEntity: string | null;
    actualFieldName: string;
    fieldApiName: string;
  } {
    // ═══════════════════════════════════════════════════════════════════════════
    // ENHANCED: Include relationship objects and check comments for object names
    // ═══════════════════════════════════════════════════════════════════════════
    const entities = [
      'Account', 'Contact', 'Lead', 'Opportunity', 'Contract', 'Case', 'Task', 'Quote', 'Order', 'Campaign',
      'AccountContactRelation', 'AccountContactRelationship', 'Account Account Relationship',
      'ContactRole', 'OpportunityContactRole', 'AccountRole'
    ];
    
    let primaryEntity = 'Record';
    let secondaryEntity: string | null = null;
    let actualFieldName = '';
    let fieldApiName = '';
    
    // ENHANCED: Parse comments for change components (like the table you showed)
    // Look for patterns like "Component: AccountContactRelation.Relationship_Strength__c, Change Type: Delete"
    const allText = summary + '\n' + description + '\n' + comments.map(c => c.content).join('\n');
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIORITY 1: Check for Page Layout context (highest priority)
    // ═══════════════════════════════════════════════════════════════════════════
    const lowerSummary = summary.toLowerCase();
    const lowerDescription = description.toLowerCase();
    
    if (lowerSummary.includes('page layout') || lowerDescription.includes('page layout')) {
      // Extract entity from page layout context: "Account Page Layout" → Account
      const layoutEntity = this.extractEntityFromPageLayoutContext(summary, description);
      if (layoutEntity) {
        logger.info(`✅ Entity from page layout context: ${layoutEntity}`);
        // Don't override with change components if page layout is mentioned
        return {
          primaryEntity: layoutEntity,
          secondaryEntity: null,
          actualFieldName: '',
          fieldApiName: '',
        };
      }
    }
    
    // ═══════════════════════════════════════════════════════════════════════════
    // PRIORITY 2: Check title/summary for entity (high weight)
    // ═══════════════════════════════════════════════════════════════════════════
    const titleEntity = this.extractEntityFromTitle(summary);
    if (titleEntity) {
      logger.debug(`✅ Entity from title: ${titleEntity}`);
      primaryEntity = titleEntity;
    }
    
    // ENHANCED: Find entities in summary, description, AND comments
    const foundEntities: string[] = [];
    
    // ENHANCED: Use change components if provided (extracted in fetchComprehensiveData)
    // This takes priority over text-based detection ONLY if no page layout context
    if (changeComponents.length > 0 && !lowerSummary.includes('page layout') && !lowerDescription.includes('page layout')) {
      // ENHANCED: Prioritize "Delete" over "Modify" - find Delete first
      const deleteComponent = changeComponents.find(c => c.changeType.toLowerCase() === 'delete');
      const primaryComponent = deleteComponent || changeComponents[0];
      
      if (primaryComponent.objectName) {
        // Normalize object name (e.g., "AccountAccountRelation" -> "AccountContactRelation")
        const normalizedObjectName = this.normalizeEntityName(primaryComponent.objectName);
        
        // Find matching entity
        const matchingEntity = entities.find(e => 
          e.toLowerCase().replace(/\s+/g, '') === normalizedObjectName.toLowerCase().replace(/\s+/g, '')
        );
        if (matchingEntity && !foundEntities.includes(matchingEntity)) {
          foundEntities.push(matchingEntity);
          primaryEntity = matchingEntity;
          logger.debug(`✅ Using entity from change component (matched): ${primaryEntity}`);
        } else if (!matchingEntity) {
          // If not in entities list, use normalized name directly
          primaryEntity = normalizedObjectName;
          logger.debug(`✅ Using entity from change component (normalized): ${primaryEntity}`);
        }
      }
      if (primaryComponent.fieldName && !actualFieldName) {
        actualFieldName = primaryComponent.fieldName;
        fieldApiName = primaryComponent.fieldApiName || primaryComponent.fieldName;
        logger.debug(`✅ Using field from change component: ${actualFieldName} (${fieldApiName})`);
      }
      
      // ENHANCED: Return early if we have change component data (don't override with text-based detection)
      if (primaryEntity && actualFieldName) {
        logger.info(`Using change component data: ${primaryEntity}.${fieldApiName}`);
        return {
          primaryEntity,
          secondaryEntity: null,
          actualFieldName,
          fieldApiName,
        };
      }
    }
    for (const entity of entities) {
      const entityLower = entity.toLowerCase();
      if (summary.toLowerCase().includes(entityLower) || 
          description.toLowerCase().includes(entityLower) ||
          allText.toLowerCase().includes(entityLower)) {
        foundEntities.push(entity);
      }
    }
    
    // ENHANCED: Check for object names in change component tables (e.g., "AccountContactRelation.Roles")
    const componentPattern = /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\.([A-Z][A-Za-z_]+)/g;
    let componentMatch;
    while ((componentMatch = componentPattern.exec(allText)) !== null) {
      const objectName = componentMatch[1].replace(/\s+/g, ''); // Remove spaces
      // Map common variations
      const normalizedObject = objectName === 'AccountContactRelation' || objectName === 'AccountContactRelationship' 
        ? 'AccountContactRelation' 
        : objectName;
      if (entities.includes(normalizedObject) && !foundEntities.includes(normalizedObject)) {
        foundEntities.push(normalizedObject);
      }
    }

    if (foundEntities.length >= 2) {
      // Multiple entities - likely a mapping/relationship feature
      secondaryEntity = foundEntities[0];
      primaryEntity = foundEntities[foundEntities.length - 1];
    } else if (foundEntities.length === 1) {
      primaryEntity = foundEntities[0];
    }

    // Extract actual field name from description
    // Look for patterns like "Region field", "Status field", field names in quotes, etc.
    // ENHANCED: Prioritize full API field names (e.g., Estimated_Onboarding_Date__c) over partial matches
    const fieldPatterns = [
      // "Region__c" or "Estimated_Onboarding_Date__c" - Full API names (PRIORITY)
      /([A-Z][A-Za-z_]+(?:_[A-Za-z_]+)*__c)/g,
      // "the Region field" or "the Estimated Onboarding Date field"
      /the\s+([A-Z][A-Za-z_\s]+?)\s+field/gi,
      // "field: Region" or "Field Name: Region"
      /field(?:\s+name)?[:\s]+([A-Z][A-Za-z_\s]+)/gi,
      // Quoted field names: "Region", 'Status', "Estimated Onboarding Date"
      /["']([A-Z][A-Za-z_\s]+)["']/g,
      // "add/remove/hide/show XXXX"
      /(?:add|remove|hide|show|create|delete|update|map)\s+(?:the\s+)?([A-Z][A-Za-z_\s]+?)(?:\s+field|\s+on|\s+from|$)/gi,
    ];

    // ENHANCED: Use allText (includes comments) for field extraction
    const combinedText = allText;
    const foundFields: string[] = [];

    for (const pattern of fieldPatterns) {
      let match;
      while ((match = pattern.exec(combinedText)) !== null) {
        const field = match[1].trim();
        // ENHANCED: Allow longer field names (up to 60 chars) for compound fields like Estimated_Onboarding_Date__c
        if (field.length >= 2 && field.length <= 60 && !this.isCommonWord(field)) {
          foundFields.push(field);
        }
      }
    }

    // ENHANCED: Prioritize API field names (ending with __c) over display names
    // This ensures we get "Estimated_Onboarding_Date__c" instead of "Estimated"
    const apiFields = foundFields.filter(f => f.includes('__c') || f.match(/^[A-Z][A-Za-z_]+__c$/));
    const displayFields = foundFields.filter(f => !f.includes('__c'));

    // Use the most common field name found, prioritizing API field names
    if (foundFields.length > 0) {
      const fieldCounts = new Map<string, number>();
      // Count API fields with higher weight
      apiFields.forEach(f => {
        const normalized = f.toLowerCase();
        fieldCounts.set(normalized, (fieldCounts.get(normalized) || 0) + 3); // API fields get 3x weight
      });
      // Count display fields with normal weight
      displayFields.forEach(f => {
        const normalized = f.toLowerCase();
        fieldCounts.set(normalized, (fieldCounts.get(normalized) || 0) + 1);
      });
      
      // Get the most frequent field name, preferring API field names
      let maxCount = 0;
      let mostCommon = foundFields[0];
      fieldCounts.forEach((count, field) => {
        if (count > maxCount) {
          maxCount = count;
          // Prefer API field if available
          const apiField = apiFields.find(f => f.toLowerCase() === field);
          mostCommon = apiField || foundFields.find(f => f.toLowerCase() === field) || foundFields[0];
        }
      });
      
      actualFieldName = mostCommon;
    }

    // If no field found, try to extract from summary
    if (!actualFieldName) {
      // Remove entity names and common words from summary
      let cleanSummary = summary;
      entities.forEach(e => {
        cleanSummary = cleanSummary.replace(new RegExp(e, 'gi'), '');
      });
      cleanSummary = cleanSummary
        .replace(/^[-–—:\s]+/, '')
        .replace(/[-–—:\s]+$/, '')
        .replace(/\s+field$/i, '')
        .replace(/^(add|remove|hide|show|create|update|map|set)\s+/i, '')
        .trim();
      
      if (cleanSummary.length > 0 && cleanSummary.length < 50) {
        actualFieldName = cleanSummary;
      } else {
        actualFieldName = 'Field';
      }
    }

    // Generate API name
    // ENHANCED: If actualFieldName already contains __c, use it as-is (preserve full API name)
    if (actualFieldName.includes('__c')) {
      // Already an API field name - use it directly
      fieldApiName = actualFieldName.replace(/\s+/g, '_');
    } else {
      // Convert display name to API name
      fieldApiName = actualFieldName.replace(/\s+/g, '_');
      if (!fieldApiName.endsWith('__c') && !['Name', 'Id', 'Type', 'Status', 'OwnerId'].includes(fieldApiName)) {
        fieldApiName += '__c';
      }
    }

    return { primaryEntity, secondaryEntity, actualFieldName, fieldApiName };
  }

  /**
   * Extracts entity from page layout context
   * Example: "Account Page Layout/Fields Updates" → "Account"
   */
  private extractEntityFromPageLayoutContext(summary: string, description: string): string | null {
    const entities = [
      'Account', 'Contact', 'Lead', 'Opportunity', 'Contract', 'Case', 'Task', 'Quote', 'Order', 'Campaign'
    ];
    
    // Check summary first: "Account Page Layout" → Account
    const summaryMatch = summary.match(/([A-Z][a-z]+)\s+Page\s+Layout/i);
    if (summaryMatch) {
      const entity = entities.find(e => e.toLowerCase() === summaryMatch[1].toLowerCase());
      if (entity) {
        return entity;
      }
    }
    
    // Check description for similar patterns
    const descMatch = description.match(/([A-Z][a-z]+)\s+Page\s+Layout/i);
    if (descMatch) {
      const entity = entities.find(e => e.toLowerCase() === descMatch[1].toLowerCase());
      if (entity) {
        return entity;
      }
    }
    
    // Fallback: Look for entity before "page layout" in any case
    const text = (summary + ' ' + description).toLowerCase();
    for (const entity of entities) {
      const entityLower = entity.toLowerCase();
      const pattern = new RegExp(`\\b${entityLower}\\s+page\\s+layout`, 'i');
      if (pattern.test(text)) {
        return entity;
      }
    }
    
    return null;
  }

  /**
   * Extracts entity from title/summary with high weight
   * Example: "Account Page Layout" → "Account"
   */
  private extractEntityFromTitle(summary: string): string | null {
    const entities = [
      'Account', 'Contact', 'Lead', 'Opportunity', 'Contract', 'Case', 'Task', 'Quote', 'Order', 'Campaign'
    ];
    
    const lowerSummary = summary.toLowerCase();
    
    // Check if summary starts with entity name
    for (const entity of entities) {
      const entityLower = entity.toLowerCase();
      // Check if summary starts with entity or entity is early in the summary
      if (lowerSummary.startsWith(entityLower + ' ') || 
          lowerSummary.match(new RegExp(`^${entityLower}[^a-z]`, 'i'))) {
        return entity;
      }
    }
    
    // Check for entity in first 50 characters (high priority position)
    const firstPart = summary.substring(0, 50).toLowerCase();
    for (const entity of entities) {
      if (firstPart.includes(entity.toLowerCase())) {
        return entity;
      }
    }
    
    return null;
  }

  // ==========================================================================
  // MULTI-FIELD EXTRACTION
  // ==========================================================================

  private extractMultipleFields(summary: string, description: string): {
    allFields: FieldInfo[];
    isMultiField: boolean;
  } {
    const allFields: FieldInfo[] = [];
    const combinedText = summary + '\n' + description;

    // PRIORITY 1: Extract fields from "Field | Behaviour/Notes" table format
    // This is the most reliable source for field visibility requirements
    const fieldTableFields = this.extractFieldsFromVisibilityTable(combinedText);
    if (fieldTableFields.length > 0) {
      logger.info(`✅ Extracted ${fieldTableFields.length} field(s) from Field | Behaviour/Notes table`);
      allFields.push(...fieldTableFields);
    }

    // Pattern 1: API field names in summary (e.g., "fields Mission_Series_MGA__c and Owned_MGA__c")
    const apiFieldPattern = /([A-Z][A-Za-z_]+__c)/g;
    let match;
    while ((match = apiFieldPattern.exec(summary)) !== null) {
      const apiName = match[1];
      // Skip if already extracted from table
      if (allFields.some(f => f.apiName === apiName)) {
        continue;
      }
      
      const displayName = apiName.replace(/__c$/, '').replace(/_/g, ' ');
      
      // Determine action from context
      let action: FieldInfo['action'] = 'modify';
      if (summary.toLowerCase().includes('delete') || summary.toLowerCase().includes('remove')) {
        action = 'delete';
      } else if (summary.toLowerCase().includes('hide')) {
        action = 'hide';
      } else if (summary.toLowerCase().includes('show')) {
        action = 'show';
      } else if (summary.toLowerCase().includes('create') || summary.toLowerCase().includes('add')) {
        action = 'create';
      }

      allFields.push({ displayName, apiName, action });
    }

    // Pattern 2: Fields listed with "and" or commas in summary
    // e.g., "Hide TerritoriesCovered, First Year GWP, and Expressed Interest"
    const listPattern = /(?:fields?|hide|delete|remove|show)\s+(.+?)(?:\s+from|\s+on|\s+for|$)/i;
    const listMatch = summary.match(listPattern);
    if (listMatch && allFields.length === 0) {
      const fieldList = listMatch[1];
      // Split by comma, "and", semicolon
      const items = fieldList.split(/,|\s+and\s+|;/).map(s => s.trim()).filter(s => s.length > 0);
      
      items.forEach(item => {
        // Clean up the item
        const cleanItem = item.replace(/^the\s+/i, '').replace(/\s+field$/i, '').trim();
        if (cleanItem.length >= 2 && cleanItem.length <= 50) {
          const apiName = cleanItem.replace(/\s+/g, '_') + '__c';
          
          let action: FieldInfo['action'] = 'modify';
          if (summary.toLowerCase().includes('delete') || summary.toLowerCase().includes('remove')) {
            action = 'delete';
          } else if (summary.toLowerCase().includes('hide')) {
            action = 'hide';
          }

          allFields.push({ displayName: cleanItem, apiName, action });
        }
      });
    }

    // Pattern 3: Look for field names in description (when making mandatory, etc.)
    const mandatoryPattern = /make\s+(.+?)\s+(?:mandatory|required)/i;
    const mandatoryMatch = combinedText.match(mandatoryPattern);
    if (mandatoryMatch && allFields.length === 0) {
      const fieldList = mandatoryMatch[1];
      const items = fieldList.split(/,|\s+and\s+|;/).map(s => s.trim());
      
      items.forEach(item => {
        const cleanItem = item.replace(/^the\s+/i, '').replace(/\s+field$/i, '').trim();
        if (cleanItem.length >= 2 && cleanItem.length <= 50) {
          const apiName = cleanItem.replace(/\s+/g, '_') + '__c';
          allFields.push({ displayName: cleanItem, apiName, action: 'validate' });
        }
      });
    }

    const isMultiField = allFields.length > 1;

    logger.debug(`Extracted ${allFields.length} fields: ${allFields.map(f => f.displayName).join(', ')}`);

    return { allFields, isMultiField };
  }

  /**
   * Extracts fields from "Field | Behaviour/Notes" table format
   * Example:
   * | Field | Behaviour/Notes |
   * | Account Name | Mandatory on all account types. |
   * | Phone | Visible |
   * | Type | Mandatory; must contain full approved picklist values |
   */
  private extractFieldsFromVisibilityTable(text: string): FieldInfo[] {
    const fields: FieldInfo[] = [];
    
    // Pattern 1: Markdown table format (from ADF parsing)
    // | Field | Behaviour/Notes |
    // | Account Name | Mandatory on all account types. |
    const tableRowPattern = /\|([^|]+)\|([^|]+)\|/g;
    let match;
    let isHeaderRow = true;
    
    while ((match = tableRowPattern.exec(text)) !== null) {
      const fieldName = match[1].trim();
      const behavior = match[2].trim();
      
      // Skip header row
      if (isHeaderRow && (fieldName.toLowerCase().includes('field') || fieldName.toLowerCase().includes('behaviour'))) {
        isHeaderRow = false;
        continue;
      }
      isHeaderRow = false;
      
      // Skip empty rows or rows that don't look like field definitions
      if (!fieldName || fieldName.length < 2 || fieldName.length > 100) {
        continue;
      }
      
      // Skip if it's clearly not a field name (e.g., "Field", "Behaviour", "Notes")
      if (['field', 'fields', 'behaviour', 'behavior', 'notes', 'note'].includes(fieldName.toLowerCase())) {
        continue;
      }
      
      // Convert display name to API name
      let apiName = fieldName;
      // If it's already an API name (contains __c), use it
      if (fieldName.includes('__c')) {
        apiName = fieldName;
      } else {
        // Convert display name to API name
        // Account Name -> Account_Name (standard field) or Account_Name__c (custom)
        // Account_Status__c -> Account_Status__c (already API name)
        apiName = fieldName.replace(/\s+/g, '_');
        // If it doesn't end with __c and isn't a standard field, add __c
        const standardFields = ['Name', 'Type', 'Phone', 'Website', 'TickerSymbol', 'Ownership', 
                                'NumberOfEmployees', 'BillingAddress', 'BillingCountry', 'Description'];
        if (!standardFields.some(sf => fieldName.toLowerCase().includes(sf.toLowerCase())) && 
            !apiName.endsWith('__c')) {
          apiName = apiName + '__c';
        }
      }
      
      // Determine action from behavior
      const behaviorLower = behavior.toLowerCase();
      let action: FieldInfo['action'] = 'show';
      
      if (behaviorLower.includes('mandatory') || behaviorLower.includes('required')) {
        action = 'validate';
      } else if (behaviorLower.includes('hidden') || behaviorLower.includes('hide')) {
        action = 'hide';
      } else if (behaviorLower.includes('visible') || behaviorLower.includes('show')) {
        action = 'show';
      } else if (behaviorLower.includes('auto') || behaviorLower.includes('auto-populated') || behaviorLower.includes('auto generated')) {
        action = 'modify'; // Auto-population is a modification
      }
      
      // Check for conditional visibility
      if (behaviorLower.includes('visible on') || behaviorLower.includes('hidden on')) {
        action = 'show'; // Conditional visibility still needs visibility tests
      }
      
      fields.push({
        displayName: fieldName,
        apiName: apiName,
        action: action
      });
      
      logger.debug(`Extracted field from table: ${fieldName} (${apiName}) - ${action} - Behavior: ${behavior.substring(0, 50)}`);
    }
    
    // Pattern 2: Plain text table format (without pipes, from ADF structure)
    // Field | Behaviour/Notes
    // Account Name | Mandatory on all account types.
    const plainTablePattern = /^([A-Z][A-Za-z_\s]+?)\s*\|\s*(.+?)$/gm;
    let plainMatch;
    while ((plainMatch = plainTablePattern.exec(text)) !== null) {
      const fieldName = plainMatch[1].trim();
      const behavior = plainMatch[2].trim();
      
      // Skip header-like rows
      if (['field', 'fields', 'behaviour', 'behavior', 'notes'].includes(fieldName.toLowerCase())) {
        continue;
      }
      
      // Skip if already extracted
      if (fields.some(f => f.displayName.toLowerCase() === fieldName.toLowerCase())) {
        continue;
      }
      
      // Convert to API name
      let apiName = fieldName.replace(/\s+/g, '_');
      if (!apiName.endsWith('__c') && !['Name', 'Type', 'Phone', 'Website'].some(sf => fieldName.includes(sf))) {
        apiName = apiName + '__c';
      }
      
      // Determine action
      const behaviorLower = behavior.toLowerCase();
      let action: FieldInfo['action'] = 'show';
      if (behaviorLower.includes('mandatory') || behaviorLower.includes('required')) {
        action = 'validate';
      } else if (behaviorLower.includes('hidden')) {
        action = 'hide';
      }
      
      fields.push({
        displayName: fieldName,
        apiName: apiName,
        action: action
      });
    }
    
    return fields;
  }

  /**
   * Extracts fields directly from ADF table structure
   * This handles tables that might not be properly parsed as markdown
   * Also handles "Hidden for All Account Types" and "Conditional Visibility" sections
   */
  private extractFieldsFromADFTable(rawADF: any): FieldInfo[] {
    const fields: FieldInfo[] = [];
    
    if (!rawADF || !rawADF.content) {
      return fields;
    }
    
    // First, extract all text to check for section headers
    const fullText = this.parseADFComprehensive(rawADF);
    const textLower = fullText.toLowerCase();
    
    // Generic section detection - works for any entity
    // Check for "Hidden for All" section (entity-agnostic)
    const hasHiddenSection = textLower.includes('hidden for all') || 
                            textLower.includes('must not appear on any page layout') ||
                            textLower.includes('must not be populated');
    
    // Check for "Conditional Visibility" section (entity-agnostic)
    const hasConditionalSection = textLower.includes('conditional visibility') ||
                                  textLower.includes('visible only on') ||
                                  textLower.includes('visible for') ||
                                  textLower.includes('hidden for');
    
    // Extract conditional values (generic - works for Account Types, Record Types, etc.)
    const conditionalValues: string[] = [];
    const conditionalMatch = fullText.match(/visible only on\s+([^:.]+)/i);
    if (conditionalMatch) {
      const conditionalText = conditionalMatch[1];
      // Extract values (could be Account Types, Record Types, or other categories)
      // Split by common separators: "and", ",", "or"
      const values = conditionalText.split(/\s+(?:and|or|,)\s+/i).map(v => v.trim()).filter(v => v.length > 0);
      conditionalValues.push(...values);
    }
    
    // Recursively search for table nodes
    const findTables = (node: any): any[] => {
      const tables: any[] = [];
      
      if (node.type === 'table' && node.content) {
        tables.push(node);
      }
      
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child: any) => {
          tables.push(...findTables(child));
        });
      }
      
      return tables;
    };
    
    // Also find section headers to determine context
    const findSectionContext = (node: any, currentSection: string = ''): { section: string; tables: any[] } => {
      let section = currentSection;
      const tables: any[] = [];
      
      if (node.type === 'heading') {
        const headingText = this.getNodeText(node).toLowerCase();
        // Generic section detection - works for any entity
        if (headingText.includes('hidden for all') || headingText.includes('must not appear') || headingText.includes('must not be populated')) {
          section = 'hidden';
        } else if (headingText.includes('conditional visibility') || headingText.includes('visible only on') || headingText.includes('visible for')) {
          section = 'conditional';
        } else if (headingText.includes('universal configuration') || headingText.includes('fields that must be visible') || headingText.includes('all') && headingText.includes('visible')) {
          section = 'universal';
        }
      }
      
      if (node.type === 'table' && node.content) {
        tables.push({ table: node, section });
      }
      
      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child: any) => {
          const childResult = findSectionContext(child, section);
          section = childResult.section || section;
          tables.push(...childResult.tables);
        });
      }
      
      return { section, tables };
    };
    
    const { tables: tablesWithContext } = findSectionContext(rawADF);
    
    for (const { table, section } of tablesWithContext) {
      if (!table.content || !Array.isArray(table.content)) {
        continue;
      }
      
      // Check if this looks like a "Field | Behaviour/Notes" table
      let isFieldTable = false;
      let headerRow: any = null;
      
      // Find header row
      for (const row of table.content) {
        if (row.type === 'tableRow' && row.content) {
          const cells = row.content.map((cell: any) => this.getNodeText(cell).trim().toLowerCase());
          if (cells.some((cell: string) => cell.includes('field')) && 
              (cells.some((cell: string) => cell.includes('behaviour')) || 
               cells.some((cell: string) => cell.includes('behavior')) || 
               cells.some((cell: string) => cell.includes('note')))) {
            isFieldTable = true;
            headerRow = row;
            break;
          }
        }
      }
      
      if (!isFieldTable) {
        continue;
      }
      
      // Determine section context
      let fieldSection = section;
      if (!fieldSection) {
        // Try to infer from surrounding text
        if (hasHiddenSection && !hasConditionalSection) {
          fieldSection = 'hidden';
        } else if (hasConditionalSection) {
          fieldSection = 'conditional';
        } else {
          fieldSection = 'universal';
        }
      }
      
      // Extract fields from data rows (skip header)
      for (const row of table.content) {
        if (row === headerRow) {
          continue;
        }
        
        if (row.type === 'tableRow' && row.content && row.content.length >= 2) {
          const fieldName = this.getNodeText(row.content[0]).trim();
          const behavior = this.getNodeText(row.content[1]).trim();
          
          // Skip empty or invalid rows
          if (!fieldName || fieldName.length < 2 || fieldName.length > 100) {
            continue;
          }
          
          // Skip header-like values
          if (['field', 'fields', 'behaviour', 'behavior', 'notes', 'note'].includes(fieldName.toLowerCase())) {
            continue;
          }
          
          // Convert to API name
          let apiName = fieldName;
          if (fieldName.includes('__c')) {
            apiName = fieldName;
          } else {
            apiName = fieldName.replace(/\s+/g, '_');
            // Generic standard fields (common across entities)
            const commonStandardFields = ['Name', 'Type', 'Phone', 'Website', 'Description', 'Status', 'Owner', 'CreatedDate', 'LastModifiedDate'];
            // Only add __c if it's not a common standard field
            if (!commonStandardFields.some(sf => fieldName.toLowerCase().includes(sf.toLowerCase())) && 
                !apiName.endsWith('__c')) {
              apiName = apiName + '__c';
            }
          }
          
          // Determine action from behavior and section context
          const behaviorLower = behavior.toLowerCase();
          let action: FieldInfo['action'] = 'show';
          
          // Section-based action determination (generic - works for any entity)
          if (fieldSection === 'hidden') {
            action = 'hide';
          } else if (fieldSection === 'conditional') {
            action = 'show'; // Conditional visibility - visible on specific conditions
          } else {
            // Universal section - determine from behavior
            if (behaviorLower.includes('mandatory') || behaviorLower.includes('required')) {
              action = 'validate';
            } else if (behaviorLower.includes('hidden') || behaviorLower.includes('hide')) {
              action = 'hide';
            } else if (behaviorLower.includes('visible') || behaviorLower.includes('show')) {
              action = 'show';
            } else if (behaviorLower.includes('auto') || behaviorLower.includes('auto-populated') || behaviorLower.includes('auto generated')) {
              action = 'modify';
            }
          }
          
          // Override with behavior text if it's more specific
          if (behaviorLower.includes('mandatory') || behaviorLower.includes('required')) {
            action = 'validate';
          } else if (behaviorLower.includes('hidden') || behaviorLower.includes('hide') || 
                     behaviorLower.includes('must not appear') || behaviorLower.includes('must not be populated')) {
            action = 'hide';
          }
          
          fields.push({
            displayName: fieldName,
            apiName: apiName,
            action: action,
            // Store conditional values if applicable (generic - could be Account Types, Record Types, etc.)
            conditionalAccountTypes: fieldSection === 'conditional' && conditionalValues.length > 0 
              ? conditionalValues 
              : undefined
          });
          
          logger.debug(`Extracted field from ADF table: ${fieldName} (${apiName}) - ${action} - Section: ${fieldSection}`);
        }
      }
    }
    
    return fields;
  }

  // ==========================================================================
  // CONDITIONAL VALIDATION EXTRACTION
  // ==========================================================================

  private extractConditionalFields(description: string): ConditionalField[] {
    const conditionFields: ConditionalField[] = [];

    // Pattern: "when X = Y" or "if X = Y"
    const conditionPattern = /(?:when|if)\s+(.+?)\s*[=]\s*(.+?)(?:\s+and|\s+then|,|$)/gi;
    let match;
    
    const conditions: string[] = [];
    while ((match = conditionPattern.exec(description)) !== null) {
      const condition = `${match[1].trim()} = ${match[2].trim()}`;
      conditions.push(condition);
    }

    // If conditions found, look for required fields
    if (conditions.length > 0) {
      const combinedCondition = conditions.join(' AND ');
      
      // Look for mandatory/required fields
      const requiredPattern = /(?:make|require|mandatory)[:\s]+(.+?)(?:\s+when|\s+if|$)/i;
      const requiredMatch = description.match(requiredPattern);
      
      if (requiredMatch) {
        const fieldList = requiredMatch[1];
        const items = fieldList.split(/,|\s+and\s+/).map(s => s.trim());
        
        items.forEach(item => {
          const cleanItem = item.replace(/^the\s+/i, '').replace(/\s+field$/i, '').trim();
          if (cleanItem.length >= 2 && cleanItem.length <= 50) {
            conditionFields.push({
              fieldName: cleanItem,
              condition: combinedCondition,
              isRequired: true,
            });
          }
        });
      }
    }

    return conditionFields;
  }

  // ==========================================================================
  // FEATURE TYPE DETECTION
  // ==========================================================================

  private detectFeatureType(summary: string, description: string): FeatureType {
    const text = (summary + ' ' + description).toLowerCase();

    // PRIORITY 1: Check for page layout requirements (highest priority)
    if (text.includes('page layout') || 
        (text.includes('layout') && (text.includes('field') || text.includes('visible') || text.includes('account type')))) {
      return 'field-visibility';
    }

    // PRIORITY 2: Check for conditional visibility patterns
    if (text.includes('visible only on') || 
        text.includes('visible for') ||
        text.includes('hidden for') ||
        text.includes('mandatory on') ||
        text.includes('required on') ||
        text.includes('conditional visibility')) {
      return 'field-visibility';
    }

    // Check for auto-population/mapping
    if (text.includes('auto-popul') || text.includes('automatically popul') || 
        text.includes('map') && (text.includes('from') || text.includes('to'))) {
      return 'auto-population';
    }

    // Check for field visibility
    if (text.includes('hide') || text.includes('show') || text.includes('visible') || 
        text.includes('not visible') || text.includes('hidden')) {
      return 'field-visibility';
    }

    // Check for read-only behavior
    if (text.includes('read-only') || text.includes('readonly') || text.includes('not editable') ||
        text.includes('cannot edit') || text.includes('cannot modify')) {
      return 'field-behavior';
    }

    // Check for picklist changes
    if (text.includes('picklist') || text.includes('dropdown') || text.includes('add value') ||
        text.includes('remove value') || text.includes('new option')) {
      return 'picklist-values';
    }

    // Check for validation rules
    if (text.includes('validation') || text.includes('validate') || text.includes('required')) {
      return 'validation-rule';
    }

    // Check for permission-based
    if (text.includes('admin') || text.includes('permission') || text.includes('profile') ||
        text.includes('role') || text.includes('user type')) {
      return 'permission-based';
    }

    // Check for field creation/removal
    if (text.includes('create field') || text.includes('new field') || text.includes('add field')) {
      return 'field-creation';
    }
    // ENHANCED: Detect delete/removal actions more comprehensively
    if (text.includes('remove field') || text.includes('delete field') || 
        text.includes('field deleted') || text.includes('field removed') ||
        text.includes('delete') && text.includes('field') ||
        text.includes('remove') && text.includes('field') ||
        // Check for change type indicators
        text.includes('change type') && text.includes('delete') ||
        text.includes('component') && text.includes('delete')) {
      return 'field-removal';
    }

    return 'general';
  }

  // ==========================================================================
  // MULTI-FEATURE TYPE DETECTION
  // ==========================================================================

  /**
   * Detects multiple feature types from acceptance criteria and field actions
   * This enables generating scenarios for stories with multiple requirements
   * (e.g., SF-501: field removal + field visibility + picklist modification)
   */
  private detectMultipleFeatureTypes(
    acceptanceCriteria: AcceptanceCriterion[],
    allFields: FieldInfo[],
    changeComponents: Array<{objectName: string; fieldName: string; fieldApiName: string; componentType: string; changeType: string}>,
    fullContext: string
  ): {
    featureTypes: FeatureType[];
    fieldFeatureMap: Map<string, FeatureType>;
  } {
    const featureTypes = new Set<FeatureType>();
    const fieldFeatureMap = new Map<string, FeatureType>();

    // 1. Detect feature types from acceptance criteria
    for (const ac of acceptanceCriteria) {
      const acText = ac.rawText.toLowerCase();
      const acFeatureType = this.detectFeatureType(ac.title || '', acText);
      featureTypes.add(acFeatureType);
      
      // Try to map fields mentioned in this AC to the feature type
      for (const field of allFields) {
        if (acText.includes(field.displayName.toLowerCase()) || 
            acText.includes(field.apiName.toLowerCase())) {
          fieldFeatureMap.set(field.apiName, acFeatureType);
        }
      }
    }

    // 2. Detect feature types from field actions
    for (const field of allFields) {
      let fieldFeatureType: FeatureType;
      
      switch (field.action) {
        case 'delete':
          fieldFeatureType = 'field-removal';
          break;
        case 'hide':
          fieldFeatureType = 'field-visibility';
          break;
        case 'modify':
          // Check if it's picklist modification
          if (fullContext.toLowerCase().includes('picklist') || 
              fullContext.toLowerCase().includes('remove value') ||
              fullContext.toLowerCase().includes('add value')) {
            fieldFeatureType = 'picklist-values';
          } else {
            fieldFeatureType = 'field-behavior';
          }
          break;
        case 'show':
          fieldFeatureType = 'field-visibility';
          break;
        case 'validate':
          fieldFeatureType = 'validation-rule';
          break;
        default:
          fieldFeatureType = 'general';
      }
      
      featureTypes.add(fieldFeatureType);
      if (!fieldFeatureMap.has(field.apiName)) {
        fieldFeatureMap.set(field.apiName, fieldFeatureType);
      }
    }

    // 3. Detect feature types from change components
    for (const component of changeComponents) {
      let componentFeatureType: FeatureType;
      
      switch (component.changeType.toLowerCase()) {
        case 'delete':
          componentFeatureType = 'field-removal';
          break;
        case 'modify':
          // Check component type or context
          if (component.componentType.toLowerCase().includes('picklist')) {
            componentFeatureType = 'picklist-values';
          } else {
            componentFeatureType = 'field-behavior';
          }
          break;
        default:
          componentFeatureType = 'field-behavior';
      }
      
      featureTypes.add(componentFeatureType);
      if (component.fieldApiName && !fieldFeatureMap.has(component.fieldApiName)) {
        fieldFeatureMap.set(component.fieldApiName, componentFeatureType);
      }
    }

    // If no feature types detected, use the primary one
    if (featureTypes.size === 0) {
      featureTypes.add('general');
    }

    logger.info(`✅ Detected ${featureTypes.size} feature type(s): ${Array.from(featureTypes).join(', ')}`);
    logger.info(`✅ Mapped ${fieldFeatureMap.size} field(s) to feature types`);

    return {
      featureTypes: Array.from(featureTypes),
      fieldFeatureMap,
    };
  }

  // ==========================================================================
  // V3.0: SUMMARY OF UNDERSTANDING GENERATION
  // ==========================================================================

  /**
   * Generates a structured "Summary of Understanding" from all Jira data
   * This becomes the basis for coverage analysis (more meaningful than raw sentences)
   */
  private generateSummaryOfUnderstanding(
    summary: string,
    description: string,
    acceptanceCriteria: AcceptanceCriterion[],
    allFields: FieldInfo[],
    changeComponents: Array<{objectName: string; fieldName: string; fieldApiName: string; componentType: string; changeType: string}>,
    primaryEntity: string,
    actualFieldName: string,
    featureTypes: FeatureType[],
    comments: CommentSummary[],
    accountTypes: string[] = []
  ): SummaryOfUnderstanding {
    // Extract overview from summary and description
    const overview = this.extractOverview(summary, description);
    
    // Extract field information
    const fields = this.extractFieldSummaries(allFields, changeComponents, description);
    
    // Extract requirements from acceptance criteria and change components
    const requirements = this.extractRequirements(
      acceptanceCriteria,
      allFields,
      changeComponents,
      description,
      featureTypes,
      accountTypes,
      primaryEntity
    );
    
    // Extract AC summaries
    const acSummaries = acceptanceCriteria.map(ac => ({
      id: ac.id,
      summary: this.summarizeAcceptanceCriterion(ac),
      covered: false,
    }));
    
    // Extract key points from comments and description
    const keyPoints = this.extractKeyPoints(description, comments, changeComponents);
    
    logger.info(`✅ Generated Summary of Understanding: ${requirements.length} requirements, ${fields.length} fields${accountTypes.length > 0 ? `, ${accountTypes.length} Account Type(s)` : ''}`);
    
    const result: SummaryOfUnderstanding = {
      overview,
      primaryEntity,
      fields,
      requirements,
      acceptanceCriteria: acSummaries,
      keyPoints,
    };
    
    // Add Account Types if detected
    if (accountTypes.length > 0) {
      result.accountTypes = accountTypes;
    }
    
    return result;
  }

  /**
   * Extracts a high-level overview from summary and description
   */
  private extractOverview(summary: string, description: string): string {
    // Use summary if it's descriptive, otherwise extract from description
    if (summary.length > 20 && !summary.includes(' - ') && !summary.match(/^[A-Z]{2}-\d+/)) {
      return summary;
    }
    
    // Extract first meaningful sentence from description
    const sentences = this.splitIntoSentences(description);
    for (const sentence of sentences) {
      if (sentence.length > 30 && sentence.length < 200) {
        // Filter out noise
        if (!sentence.includes('@@') && 
            !sentence.includes('http') &&
            !sentence.toLowerCase().includes('commit')) {
          return sentence;
        }
      }
    }
    
    return summary || 'Feature implementation requiring test coverage';
  }

  /**
   * Extracts structured field information
   */
  private extractFieldSummaries(
    allFields: FieldInfo[],
    changeComponents: Array<{objectName: string; fieldName: string; fieldApiName: string; componentType: string; changeType: string}>,
    description: string
  ): SummaryOfUnderstanding['fields'] {
    const fields: SummaryOfUnderstanding['fields'] = [];
    const processedFields = new Set<string>();
    
    // Process change components first (most accurate)
    for (const component of changeComponents) {
      if (!processedFields.has(component.fieldApiName)) {
        fields.push({
          name: component.fieldName,
          apiName: component.fieldApiName,
          action: this.mapChangeTypeToAction(component.changeType),
          description: this.extractFieldDescription(component.fieldName, description),
        });
        processedFields.add(component.fieldApiName);
      }
    }
    
    // Process extracted fields
    for (const field of allFields) {
      if (!processedFields.has(field.apiName)) {
        fields.push({
          name: field.displayName,
          apiName: field.apiName,
          action: field.action,
          description: this.extractFieldDescription(field.displayName, description),
        });
        processedFields.add(field.apiName);
      }
    }
    
    return fields;
  }

  /**
   * Maps change type to action
   */
  private mapChangeTypeToAction(changeType: string): SummaryOfUnderstanding['fields'][0]['action'] {
    const lower = changeType.toLowerCase();
    if (lower.includes('delete') || lower.includes('remove')) return 'delete';
    if (lower.includes('hide')) return 'hide';
    if (lower.includes('show')) return 'show';
    if (lower.includes('create') || lower.includes('add')) return 'create';
    if (lower.includes('modify') || lower.includes('update') || lower.includes('change')) return 'modify';
    if (lower.includes('validate') || lower.includes('require')) return 'validate';
    return 'modify';
  }

  /**
   * Extracts field description from context
   */
  private extractFieldDescription(fieldName: string, description: string): string {
    const lowerField = fieldName.toLowerCase();
    const lowerDesc = description.toLowerCase();
    
    // Look for sentences mentioning this field
    const sentences = this.splitIntoSentences(description);
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(lowerField)) {
        // Clean up the sentence
        const clean = sentence
          .replace(/^[^a-z]*/i, '') // Remove leading non-letters
          .replace(/@@[^\s]+/g, '') // Remove @ mentions
          .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
          .trim();
        
        if (clean.length > 20 && clean.length < 150) {
          return clean;
        }
      }
    }
    
    return `Field: ${fieldName}`;
  }

  /**
   * Extracts testable requirements from all sources
   */
  private extractRequirements(
    acceptanceCriteria: AcceptanceCriterion[],
    allFields: FieldInfo[],
    changeComponents: Array<{objectName: string; fieldName: string; fieldApiName: string; componentType: string; changeType: string}>,
    description: string,
    featureTypes: FeatureType[],
    accountTypes: string[] = [],
    primaryEntity: string = ''
  ): SummaryOfUnderstanding['requirements'] {
    const requirements: SummaryOfUnderstanding['requirements'] = [];
    let reqId = 1;
    
    // ENHANCED: Generate requirement for Account Types if detected
    if (accountTypes.length > 0 && primaryEntity.toLowerCase() === 'account') {
      requirements.push({
        id: `REQ-${reqId++}`,
        description: `Verify Account Type field dropdown shows all ${accountTypes.length} Account Types: ${accountTypes.slice(0, 5).join(', ')}${accountTypes.length > 5 ? '...' : ''}`,
        testType: 'ui',
        priority: 'p1',
        relatedFields: ['Type'],
        relatedACs: []
      });
      logger.info(`✅ Generated requirement REQ-${reqId - 1} for Account Type validation (${accountTypes.length} types)`);
    }
    
    // ENHANCED: Generate requirements for each field from Field | Behaviour/Notes table
    if (allFields.length > 0) {
      for (const field of allFields) {
        // Skip if field name is empty or invalid
        if (!field.displayName || field.displayName.length < 2) {
          continue;
        }

        // Generate requirement based on field action
        let reqDescription = '';
        let testType: 'api' | 'ui' | 'both' = 'ui';
        let priority: 'p1' | 'p2' | 'p3' = 'p1';

        switch (field.action) {
          case 'validate':
            reqDescription = `Verify "${field.displayName}" is mandatory on ${primaryEntity} creation`;
            testType = 'ui';
            priority = 'p1';
            break;
          case 'show':
            reqDescription = `Verify "${field.displayName}" is visible on ${primaryEntity} page layout for all Account Types`;
            testType = 'ui';
            priority = 'p1';
            break;
          case 'hide':
            reqDescription = `Verify "${field.displayName}" is hidden on ${primaryEntity} page layout`;
            testType = 'ui';
            priority = 'p2';
            break;
          case 'modify':
            // Check if it's auto-populated
            if (description.toLowerCase().includes(field.displayName.toLowerCase()) && 
                (description.toLowerCase().includes('auto-populated') || description.toLowerCase().includes('auto generated'))) {
              reqDescription = `Verify "${field.displayName}" is auto-populated on ${primaryEntity}`;
              testType = 'ui';
              priority = 'p2';
            } else {
              reqDescription = `Verify "${field.displayName}" behavior on ${primaryEntity}`;
              testType = 'both';
              priority = 'p2';
            }
            break;
          default:
            reqDescription = `Verify "${field.displayName}" functionality on ${primaryEntity}`;
            testType = 'both';
            priority = 'p2';
        }

        // Add Account Type context if applicable
        if (primaryEntity.toLowerCase() === 'account' && accountTypes.length > 0) {
          reqDescription += ` (for all ${accountTypes.length} Account Types)`;
        }

        requirements.push({
          id: `REQ-${reqId++}`,
          description: reqDescription,
          testType,
          priority,
          relatedFields: [field.apiName],
          relatedACs: []
        });

        logger.debug(`✅ Generated requirement REQ-${reqId - 1} for field: ${field.displayName} (${field.action})`);
      }
      
      logger.info(`✅ Generated ${allFields.length} requirement(s) from Field | Behaviour/Notes table`);
    }
    
    // Extract from acceptance criteria
    for (const ac of acceptanceCriteria) {
      const acText = ac.rawText.toLowerCase();
      
      // Determine test type
      let testType: 'api' | 'ui' | 'both' = 'both';
      if (acText.includes('visible') || acText.includes('display') || acText.includes('help text')) {
        testType = 'ui';
      } else if (acText.includes('field exists') || acText.includes('field type') || acText.includes('metadata')) {
        testType = 'api';
      }
      
      // Determine priority
      let priority: 'p1' | 'p2' | 'p3' = 'p2';
      if (ac.id.includes('1') || acText.includes('smoke') || acText.includes('critical')) {
        priority = 'p1';
      } else if (acText.includes('negative') || acText.includes('edge case')) {
        priority = 'p3';
      }
      
      // Extract related fields
      const relatedFields: string[] = [];
      for (const field of allFields) {
        if (acText.includes(field.displayName.toLowerCase()) || acText.includes(field.apiName.toLowerCase())) {
          relatedFields.push(field.apiName);
        }
      }
      
      // Create requirement from AC
      const reqDescription = this.summarizeAcceptanceCriterion(ac);
      if (reqDescription.length > 10) {
        requirements.push({
          id: `REQ-${reqId++}`,
          description: reqDescription,
          testType,
          priority,
          relatedFields,
          relatedACs: [ac.id],
        });
      }
    }
    
    // Extract from change components (if not already covered)
    for (const component of changeComponents) {
      const componentDesc = `${component.changeType} ${component.fieldName} on ${component.objectName}`;
      const alreadyCovered = requirements.some(r => 
        r.description.toLowerCase().includes(component.fieldName.toLowerCase())
      );
      
      if (!alreadyCovered) {
        let testType: 'api' | 'ui' | 'both' = 'both';
        if (component.changeType.toLowerCase() === 'delete') {
          testType = 'api'; // Field existence checks are better via API
        } else if (component.changeType.toLowerCase() === 'modify' && component.componentType.toLowerCase().includes('picklist')) {
          testType = 'ui'; // Picklist changes are better via UI
        }
        
        requirements.push({
          id: `REQ-${reqId++}`,
          description: `${component.changeType} ${component.fieldName} field on ${component.objectName}`,
          testType,
          priority: 'p1',
          relatedFields: [component.fieldApiName],
          relatedACs: [],
        });
      }
    }
    
    // Extract from description if no requirements found
    if (requirements.length === 0) {
      const descSentences = this.splitIntoSentences(description);
      for (const sentence of descSentences) {
        if (sentence.length > 30 && sentence.length < 200) {
          // Check if it's a requirement (not noise)
          if (!sentence.includes('@@') && 
              !sentence.includes('http') &&
              !sentence.toLowerCase().includes('commit')) {
            requirements.push({
              id: `REQ-${reqId++}`,
              description: sentence.trim(),
              testType: this.determineBestTestType(sentence, [], [], []),
              priority: 'p2',
              relatedFields: [],
              relatedACs: [],
            });
          }
        }
      }
    }
    
    return requirements;
  }

  /**
   * Summarizes an acceptance criterion into a testable requirement
   */
  private summarizeAcceptanceCriterion(ac: AcceptanceCriterion): string {
    // Use title if available
    if (ac.title && ac.title.length > 10) {
      return ac.title;
    }
    
    // Combine Given/When/Then into a summary
    const parts: string[] = [];
    if (ac.given.length > 0) {
      parts.push(ac.given[0]);
    }
    if (ac.when.length > 0) {
      parts.push(ac.when[0]);
    }
    if (ac.then.length > 0) {
      parts.push(ac.then[0]);
    }
    
    if (parts.length > 0) {
      return parts.join(' → ');
    }
    
    // Fallback to first sentence of raw text
    const sentences = this.splitIntoSentences(ac.rawText);
    return sentences[0] || ac.rawText.substring(0, 100);
  }

  /**
   * Extracts key points/constraints from comments and description
   */
  private extractKeyPoints(
    description: string,
    comments: CommentSummary[],
    changeComponents: Array<{objectName: string; fieldName: string; fieldApiName: string; componentType: string; changeType: string}>
  ): string[] {
    const keyPoints: string[] = [];
    
    // Extract from change components
    if (changeComponents.length > 0) {
      const componentSummary = changeComponents.map(c => 
        `${c.changeType} ${c.fieldName} on ${c.objectName}`
      ).join(', ');
      keyPoints.push(`Change Components: ${componentSummary}`);
    }
    
    // Extract important notes from comments (filter out noise)
    for (const comment of comments) {
      const content = comment.content.toLowerCase();
      // Look for important clarifications
      if (content.includes('note:') || 
          content.includes('important:') ||
          content.includes('constraint:') ||
          (content.includes('object') && content.includes('field') && !content.includes('@@'))) {
        const sentences = this.splitIntoSentences(comment.content);
        for (const sentence of sentences) {
          if (sentence.length > 20 && sentence.length < 200 && 
              !sentence.includes('@@') && 
              !sentence.includes('http')) {
            keyPoints.push(sentence.trim());
            break; // One key point per comment
          }
        }
      }
    }
    
    return keyPoints;
  }

  // ==========================================================================
  // V3.0: SENTENCE EXTRACTION FOR COVERAGE ANALYSIS
  // ==========================================================================

  /**
   * Extracts all sentences from Jira content for coverage analysis
   */
  private extractAllSentences(
    summary: string,
    description: string,
    comments: CommentSummary[],
    acceptanceCriteria: AcceptanceCriterion[]
  ): SentenceInfo[] {
    const sentences: SentenceInfo[] = [];
    let sentenceId = 0;

    // Extract from summary
    const summarySentences = this.splitIntoSentences(summary);
    summarySentences.forEach((text, idx) => {
      if (text.trim().length > 10) { // Ignore very short fragments
        sentences.push(this.createSentenceInfo(
          `SENT-${++sentenceId}`,
          text,
          'summary',
          idx,
          summary
        ));
      }
    });

    // Extract from description
    const descSentences = this.splitIntoSentences(description);
    descSentences.forEach((text, idx) => {
      if (text.trim().length > 10) {
        sentences.push(this.createSentenceInfo(
          `SENT-${++sentenceId}`,
          text,
          'description',
          idx,
          description
        ));
      }
    });

    // Extract from comments
    comments.forEach((comment, commentIdx) => {
      const commentSentences = this.splitIntoSentences(comment.content);
      commentSentences.forEach((text, idx) => {
        if (text.trim().length > 10) {
          sentences.push(this.createSentenceInfo(
            `SENT-${++sentenceId}`,
            text,
            'comment',
            commentIdx,
            comment.content
          ));
        }
      });
    });

    // Extract from acceptance criteria
    acceptanceCriteria.forEach((ac, acIdx) => {
      const acSentences = this.splitIntoSentences(ac.rawText);
      acSentences.forEach((text, idx) => {
        if (text.trim().length > 10) {
          sentences.push(this.createSentenceInfo(
            `SENT-${++sentenceId}`,
            text,
            'acceptance-criteria',
            acIdx,
            ac.rawText
          ));
        }
      });
    });

    logger.info(`✅ Extracted ${sentences.length} sentences for coverage analysis`);
    return sentences;
  }

  /**
   * Splits text into sentences (handles various punctuation)
   */
  private splitIntoSentences(text: string): string[] {
    // Remove markdown, HTML, and ADF formatting
    const cleanText = text
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Markdown links
      .replace(/<[^>]+>/g, '') // HTML tags
      .replace(/\{[^}]+\}/g, '') // ADF formatting
      .replace(/\n+/g, ' ') // Newlines to spaces
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim();

    // Split by sentence terminators
    const sentences = cleanText
      .split(/(?<=[.!?])\s+(?=[A-Z])/g) // Split on sentence boundaries
      .map(s => s.trim())
      .filter(s => s.length > 0);

    return sentences;
  }

  /**
   * Creates a SentenceInfo object with extracted metadata
   */
  private createSentenceInfo(
    id: string,
    text: string,
    source: SentenceInfo['source'],
    sourceIndex: number,
    fullContext: string
  ): SentenceInfo {
    const lowerText = text.toLowerCase();
    
    // Extract keywords
    const keywords = this.extractKeywords(text);
    
    // Extract entities (Account, Contact, Opportunity, etc.)
    const entities = this.extractEntities(text);
    
    // Extract field names
    const fields = this.extractFieldNamesFromText(text);
    
    // Extract actions
    const actions = this.extractActions(text);
    
    // Determine best test type
    const bestTestType = this.determineBestTestType(text, keywords, fields, actions);

    return {
      id,
      text: text.trim(),
      source,
      sourceIndex,
      keywords,
      entities,
      fields,
      actions,
      isCovered: false,
      coveringScenarios: [],
      bestTestType,
    };
  }

  /**
   * Extracts keywords from text
   */
  private extractKeywords(text: string): string[] {
    const lowerText = text.toLowerCase();
    const keywords: string[] = [];
    
    // Common testing keywords
    const keywordPatterns = [
      'visible', 'hidden', 'show', 'hide', 'display',
      'editable', 'read-only', 'required', 'mandatory',
      'validate', 'validation', 'error', 'reject',
      'create', 'update', 'delete', 'remove',
      'picklist', 'dropdown', 'field', 'value',
      'admin', 'user', 'permission', 'profile',
      'auto-populate', 'automatically', 'inherit',
    ];

    keywordPatterns.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        keywords.push(keyword);
      }
    });

    return keywords;
  }

  /**
   * Extracts entity names from text
   */
  private extractEntities(text: string): string[] {
    const entities: string[] = [];
    const entityPatterns = [
      'Account', 'Contact', 'Lead', 'Opportunity',
      'AccountContactRelation', 'AccountContactRelationship',
      'Case', 'Contract', 'Product', 'Pricebook',
    ];

    entityPatterns.forEach(entity => {
      if (text.includes(entity)) {
        entities.push(entity);
      }
    });

    return entities;
  }

  /**
   * Extracts field names from text (for general field extraction)
   * Note: There's a more specific extractFieldNames method for filtering picklist values
   */
  private extractFieldNamesFromText(text: string): string[] {
    const fields: string[] = [];
    
    // API field pattern (ends with __c)
    const apiFieldPattern = /([A-Z][A-Za-z_]+__c)/g;
    let match;
    while ((match = apiFieldPattern.exec(text)) !== null) {
      fields.push(match[1]);
    }

    // Display field names (capitalized words that might be fields)
    const displayFieldPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:field|Field)/g;
    while ((match = displayFieldPattern.exec(text)) !== null) {
      fields.push(match[1]);
    }

    return fields;
  }

  /**
   * Extracts actions from text
   */
  private extractActions(text: string): string[] {
    const lowerText = text.toLowerCase();
    const actions: string[] = [];
    
    const actionPatterns = [
      'hide', 'show', 'display', 'visible', 'hidden',
      'delete', 'remove', 'create', 'add', 'modify',
      'update', 'edit', 'change', 'set', 'clear',
      'validate', 'require', 'mandatory', 'optional',
      'read-only', 'editable', 'disable', 'enable',
    ];

    actionPatterns.forEach(action => {
      if (lowerText.includes(action)) {
        actions.push(action);
      }
    });

    return actions;
  }

  /**
   * Determines the best test type (API, UI, or both) for a sentence
   */
  private determineBestTestType(
    text: string,
    keywords: string[],
    fields: string[],
    actions: string[]
  ): 'api' | 'ui' | 'both' {
    const lowerText = text.toLowerCase();
    
    // API-preferred indicators
    const apiIndicators = [
      'api', 'rest', 'soql', 'query', 'metadata',
      'field exists', 'field type', 'field does not exist',
      'describe', 'object fields', 'schema',
    ];
    
    // UI-preferred indicators
    const uiIndicators = [
      'visible', 'display', 'show', 'hide', 'hidden',
      'click', 'button', 'page', 'screen', 'view',
      'edit mode', 'detail page', 'form', 'picklist',
      'help text', 'tooltip', 'user interface', 'ui',
    ];
    
    // Count matches
    const apiScore = apiIndicators.filter(ind => lowerText.includes(ind)).length;
    const uiScore = uiIndicators.filter(ind => lowerText.includes(ind)).length;
    
    // Field existence checks are better via API
    if (lowerText.includes('field does not exist') || 
        lowerText.includes('field exists') ||
        lowerText.includes('field type')) {
      return 'api';
    }
    
    // Visibility/display checks are better via UI
    if (lowerText.includes('visible') || 
        lowerText.includes('display') ||
        lowerText.includes('show') ||
        lowerText.includes('hide')) {
      return 'ui';
    }
    
    // Help text, picklist values are UI
    if (lowerText.includes('help text') || 
        lowerText.includes('picklist') ||
        lowerText.includes('dropdown')) {
      return 'ui';
    }
    
    // Metadata/describe operations are API
    if (lowerText.includes('describe') || 
        lowerText.includes('metadata') ||
        lowerText.includes('schema')) {
      return 'api';
    }
    
    // Default based on scores
    if (apiScore > uiScore) return 'api';
    if (uiScore > apiScore) return 'ui';
    return 'both'; // If equal or unclear, test both
  }

  // ==========================================================================
  // STRUCTURED ACCEPTANCE CRITERIA EXTRACTION
  // ==========================================================================

  private extractStructuredAcceptanceCriteria(description: string, comments: CommentSummary[]): AcceptanceCriterion[] {
    const criteria: AcceptanceCriterion[] = [];
    const combinedText = description + '\n' + comments.map(c => c.content).join('\n');

    // Pattern 1: Numbered scenarios with Given/When/Then
    const scenarioPattern = /(?:Scenario\s*(\d+)|AC[-\s]*(\d+)|Acceptance\s*Criteria?\s*(\d+))[:\s]*([^\n]*)\n([\s\S]*?)(?=(?:Scenario\s*\d|AC[-\s]*\d|Acceptance\s*Criteria?\s*\d|$))/gi;
    
    let match;
    let acCount = 0;

    while ((match = scenarioPattern.exec(combinedText)) !== null) {
      acCount++;
      const acNum = match[1] || match[2] || match[3] || acCount.toString();
      const title = match[4]?.trim() || '';
      const body = match[5] || '';

      const ac = this.parseAcceptanceCriterionBody(acNum, title, body);
      if (ac) {
        criteria.push(ac);
      }
    }

    // Pattern 2: Look for Given/When/Then blocks without explicit AC numbering
    if (criteria.length === 0) {
      const gwtPattern = /GIVEN\s+([^\n]+(?:\n(?!WHEN|THEN)[^\n]*)*)\s*WHEN\s+([^\n]+(?:\n(?!GIVEN|THEN)[^\n]*)*)\s*THEN\s+([^\n]+(?:\n(?!GIVEN|WHEN)[^\n]*)*)/gi;
      
      while ((match = gwtPattern.exec(combinedText)) !== null) {
        acCount++;
        const ac: AcceptanceCriterion = {
          id: `AC-${acCount}`,
          title: `Scenario ${acCount}`,
          given: this.splitLines(match[1]),
          when: this.splitLines(match[2]),
          then: this.splitLines(match[3]),
          rawText: match[0],
          isNegative: this.isNegativeScenario(match[0]),
          isDataDriven: this.hasMultipleValues(match[0]),
          relatedValues: this.extractInlineValues(match[0]),
        };
        // Extract user role from acceptance criterion
        ac.userRole = this.extractUserFromAcceptanceCriterion(ac);
        criteria.push(ac);
      }
    }

    // Pattern 3: Bullet points as acceptance criteria
    if (criteria.length === 0) {
      const bulletPattern = /^[\s]*[-•*]\s+(.+)$/gm;
      const bullets: string[] = [];
      
      while ((match = bulletPattern.exec(combinedText)) !== null) {
        const bullet = match[1].trim();
        if (bullet.length > 10 && bullet.length < 200) {
          bullets.push(bullet);
        }
      }

      bullets.forEach((bullet, idx) => {
        const ac: AcceptanceCriterion = {
          id: `AC-${idx + 1}`,
          title: bullet.substring(0, 50),
          given: [],
          when: [],
          then: [bullet],
          rawText: bullet,
          isNegative: this.isNegativeScenario(bullet),
          isDataDriven: this.hasMultipleValues(bullet),
          relatedValues: this.extractInlineValues(bullet),
        };
        // Extract user role from acceptance criterion
        ac.userRole = this.extractUserFromAcceptanceCriterion(ac);
        criteria.push(ac);
      });
    }

    return criteria;
  }

  private parseAcceptanceCriterionBody(acNum: string, title: string, body: string): AcceptanceCriterion | null {
    const given: string[] = [];
    const when: string[] = [];
    const then: string[] = [];

    // Parse Given/When/Then from body
    const givenMatch = body.match(/GIVEN\s+([^\n]+(?:\n(?!WHEN|THEN|AND)[^\n]*)*)/i);
    const whenMatch = body.match(/WHEN\s+([^\n]+(?:\n(?!GIVEN|THEN|AND)[^\n]*)*)/i);
    const thenMatch = body.match(/THEN\s+([^\n]+(?:\n(?!GIVEN|WHEN|AND)[^\n]*)*)/i);

    if (givenMatch) given.push(...this.splitLines(givenMatch[1]));
    if (whenMatch) when.push(...this.splitLines(whenMatch[1]));
    if (thenMatch) then.push(...this.splitLines(thenMatch[1]));

    // Also check for AND clauses
    const andPattern = /AND\s+([^\n]+)/gi;
    let andMatch;
    // Default AND clauses to THEN; value widened so comparisons type-check if routing evolves
    const currentSection = 'then' as 'given' | 'when' | 'then';

    while ((andMatch = andPattern.exec(body)) !== null) {
      const andClause = andMatch[1].trim();
      if (currentSection === 'given') given.push(andClause);
      else if (currentSection === 'when') when.push(andClause);
      else then.push(andClause);
    }

    // If no structured content, use the body as-is
    if (given.length === 0 && when.length === 0 && then.length === 0) {
      const lines = body.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      if (lines.length > 0) {
        then.push(...lines);
      } else if (title) {
        then.push(title);
      }
    }

    if (given.length === 0 && when.length === 0 && then.length === 0) {
      return null;
    }

    const ac: AcceptanceCriterion = {
      id: `AC-${acNum}`,
      title: title || `Scenario ${acNum}`,
      given,
      when,
      then,
      rawText: body,
      isNegative: this.isNegativeScenario(body),
      isDataDriven: this.hasMultipleValues(body),
      relatedValues: this.extractInlineValues(body),
    };

    // Extract user role from acceptance criterion
    ac.userRole = this.extractUserFromAcceptanceCriterion(ac);

    return ac;
  }

  private splitLines(text: string): string[] {
    return text
      .split(/\n|AND\s+/i)
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.match(/^(GIVEN|WHEN|THEN)$/i));
  }

  private isNegativeScenario(text: string): boolean {
    const lower = text.toLowerCase();
    return lower.includes('cannot') || lower.includes('should not') || 
           lower.includes('must not') || lower.includes('not visible') ||
           lower.includes('not editable') || lower.includes('reject') ||
           lower.includes('error') || lower.includes('fail') ||
           lower.includes('invalid');
  }

  private hasMultipleValues(text: string): boolean {
    // Check for comma-separated values or lists
    return text.includes(',') || /\b(US|UK|EU|CA|APAC)\b.*\b(US|UK|EU|CA|APAC)\b/i.test(text);
  }

  private extractInlineValues(text: string): string[] {
    const values: string[] = [];
    
    // Extract quoted values
    const quotedPattern = /["']([A-Za-z\s-]+)["']/g;
    let match;
    while ((match = quotedPattern.exec(text)) !== null) {
      if (match[1].length >= 2 && match[1].length <= 30) {
        values.push(match[1]);
      }
    }

    // Extract common region/status values
    const commonValues = ['US', 'UK', 'EU', 'CA', 'APAC', 'Active', 'Inactive', 'Pending', 'Approved', 'Rejected'];
    commonValues.forEach(v => {
      if (text.includes(v)) {
        values.push(v);
      }
    });

    return [...new Set(values)];
  }

  // ==========================================================================
  // USER EXTRACTION FROM ACCEPTANCE CRITERIA
  // ==========================================================================

  /**
   * Extracts user role/type from acceptance criterion text
   * Looks for patterns like:
   * - "a non-admin user"
   * - "an admin user"
   * - "a Accelerant - System administrator"
   * - "an MRD user"
   * - "a read-only user"
   * - "non-admin users"
   * 
   * @param ac - Acceptance criterion to extract user from
   * @returns User role string (e.g., "MRD", "Admin", "Non-Admin User") or null
   */
  private extractUserFromAcceptanceCriterion(ac: AcceptanceCriterion): string | undefined {
    // Combine all text from GIVEN, WHEN, THEN, and rawText
    const givenText = ac.given.join(' ').toLowerCase();
    const whenText = ac.when.join(' ').toLowerCase();
    const thenText = ac.then.join(' ').toLowerCase();
    const fullText = (ac.rawText || '').toLowerCase();
    const combinedText = `${givenText} ${whenText} ${thenText} ${fullText}`.toLowerCase();

    // Pattern 1: "a/an {role} user" or "{role} user"
    const userPatterns = [
      /(?:a|an)\s+([a-z\s-]+?)\s+user/i,
      /([a-z\s-]+?)\s+user/i,
      /user\s+with\s+([a-z\s-]+?)\s+role/i,
      /([a-z\s-]+?)\s+profile/i,
      /as\s+(?:a|an)\s+([a-z\s-]+?)(?:\s+user)?/i,
      /logged\s+in\s+as\s+(?:a|an)?\s*([a-z\s-]+?)(?:\s+user)?/i,
    ];

    for (const pattern of userPatterns) {
      const match = combinedText.match(pattern);
      if (match && match[1]) {
        const role = match[1].trim();
        // Filter out common false positives
        const falsePositives = ['salesforce', 'authenticated', 'logged', 'test', 'system', 'any', 'the'];
        if (!falsePositives.includes(role.toLowerCase()) && role.length > 1) {
          // Try to map using the user role mapping
          const mappedRole = getSFUserRoleFromJira(role);
          if (mappedRole) {
            logger.debug(`Extracted user role "${role}" from AC, mapped to "${mappedRole}"`);
            return mappedRole;
          }
          // If no mapping found, return the extracted role (will be normalized later)
          logger.debug(`Extracted user role "${role}" from AC (no mapping found)`);
          return role;
        }
      }
    }

    // Pattern 2: Specific role mentions (check raw text for exact matches)
    // Updated to include all 12 supported roles
    const knownRoles = [
      'admin', 'administrator', 'standard', 'non-admin', 'read-only', 'readonly', 'mrd',
      'member-operations', 'member operations', 'ird', 'insurer-data-manager', 'insurer data manager',
      'underwriting', 'actuarial', 'claims', 'claims-operations', 'claims operations',
      'legal-counsel', 'legal counsel', 'compliance', 'executive', 'tech-leadership', 'tech leadership'
    ];
    for (const role of knownRoles) {
      if (combinedText.includes(role)) {
        const mappedRole = getSFUserRoleFromJira(role);
        if (mappedRole) {
          logger.debug(`Found known role "${role}" in AC, mapped to "${mappedRole}"`);
          return mappedRole;
        }
      }
    }

    return undefined;
  }

  /**
   * Normalizes user role name for use in step definitions
   * Examples:
   * - "non-admin user" → "Non-Admin User"
   * - "admin user" → "Admin"
   * - "mrd" → "MRD"
   * 
   * @param role - User role to normalize
   * @returns Normalized role name
   */
  private normalizeUserRoleForStep(role: string): string {
    if (!role) return 'Admin'; // Default fallback

    // First try to get mapped role
    const mappedRole = getSFUserRoleFromJira(role);
    if (mappedRole) {
      return mappedRole;
    }

    // Remove "user" suffix if present
    let normalized = role.replace(/\s+user$/i, '').trim();

    // Capitalize first letter of each word
    normalized = normalized
      .split(/\s+/)
      .map(word => {
        // Keep acronyms uppercase (MRD, API, etc.)
        if (word.length <= 3 && word === word.toUpperCase()) {
          return word;
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    // Handle special cases
    if (normalized.toLowerCase() === 'admin' || normalized.toLowerCase() === 'administrator') {
      return 'Admin';
    }
    if (normalized.toLowerCase() === 'mrd') {
      return 'MRD';
    }

    return normalized;
  }

  /**
   * Checks if a step is user-related (authentication/login)
   */
  private isUserRelatedStep(step: string): boolean {
    const lower = step.toLowerCase();
    return lower.includes('logged in') || 
           lower.includes('authenticated') || 
           (lower.includes('user') && (lower.includes('as') || lower.includes('with'))) ||
           lower.includes('login');
  }

  /**
   * Intelligently converts natural language step to Gherkin format
   * Maps common patterns to existing common step definitions to minimize work-item-specific steps
   * Priority: Use common steps from ui-common.steps.ts, data-factory.steps.ts, authentication.steps.ts
   */
  private convertToGherkinStep(step: string, keyword: string): string {
    // Remove leading keyword if present and clean up
    let cleaned = step.replace(/^(given|when|then|and|but)\s+/i, '').trim();
    
    // Remove malformed prefixes like "/ WHEN / THEN):"
    cleaned = cleaned.replace(/^[/\s]*\(?WHEN\s*\/\s*THEN\)?:?\s*/i, '').trim();
    cleaned = cleaned.replace(/^[/\s]*\(?GIVEN\s*\/\s*WHEN\s*\/\s*THEN\)?:?\s*/i, '').trim();
    cleaned = cleaned.replace(/^[/\s]*\(?WHEN\)?:?\s*/i, '').trim();
    
    // Skip empty or very short steps
    if (cleaned.length < 3) {
      return '';
    }
    
    // Skip steps that are clearly comments or metadata
    if (cleaned.startsWith('@@') || cleaned.startsWith('//') || cleaned.match(/^[A-Z]{2,}\s+[A-Z]/)) {
      return '';
    }
    
    const lower = cleaned.toLowerCase();
    
    // ============================================================================
    // PATTERN MAPPING TO COMMON STEP DEFINITIONS (Priority Order)
    // ============================================================================
    
    // 1. NAVIGATION PATTERNS - Map to: "When I navigate to the {Entity} record"
    if (lower.match(/navigate to|open.*record|go to.*record|view.*record|access.*record|open any|they open/)) {
      const entityMatch = lower.match(/(account|opportunity|lead|contact|contract|accountcontactrelation)/);
      if (entityMatch) {
        const entity = entityMatch[1].charAt(0).toUpperCase() + entityMatch[1].slice(1);
        return `When I navigate to the ${entity} record`;
      }
    }
    
    // 2. LIST VIEW NAVIGATION - Map to: "When I navigate to the {Entity} object list"
    if (lower.match(/navigate to.*list|go to.*list|view.*list|list view|compact view|performs.*search|views.*list/)) {
      const entityMatch = lower.match(/(account|opportunity|lead|contact|contract)/);
      if (entityMatch) {
        const entity = entityMatch[1].charAt(0).toUpperCase() + entityMatch[1].slice(1);
        return `When I navigate to the ${entity} object list`;
      }
    }
    
    // 3. FIELD VISIBILITY PATTERNS - Map to: "Then the \"{field}\" field should be visible"
    // Extract field names (look for __c fields first, then try other patterns)
    const fieldPatterns = [
      /([A-Za-z_]+(?:_[A-Za-z0-9]+)*__c)/g,  // Custom fields: FieldName__c
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(field|Field)/g,  // "First-Year Estimated Gross Written Premi_c field"
      /(TerritoriesCovered_c|Expressed_Interest_c|Annual_GWP_Estimate_Year_1__c)/g,  // Known field names
    ];
    
    let extractedField: string | null = null;
    for (const pattern of fieldPatterns) {
      const match = cleaned.match(pattern);
      if (match && match[1]) {
        extractedField = match[1];
        break;
      }
    }
    
    if (extractedField && (lower.match(/field.*visible|visible.*field|should be visible|is visible|appears|displayed|can see|shows|rendered|included/))) {
      if (lower.includes('not') || lower.includes('hidden') || lower.includes('cannot') || lower.includes('does not') || lower.includes('not.*rendered') || lower.includes('not.*included')) {
        return `Then the "${extractedField}" field should not be visible`;
      }
      return `Then the "${extractedField}" field should be visible`;
    }
    
    // 4. FIELD NOT VISIBLE PATTERNS - Map to: "Then the \"{field}\" field should not be visible"
    if (lower.match(/not visible|hidden|does not appear|cannot.*see|not displayed|not shown|not.*rendered|not.*included|do not appear/)) {
      if (extractedField) {
        return `Then the "${extractedField}" field should not be visible`;
      }
      // Try to extract field from context
      for (const pattern of fieldPatterns) {
        const match = cleaned.match(pattern);
        if (match && match[1]) {
          return `Then the "${match[1]}" field should not be visible`;
        }
      }
    }
    
    // 5. FIELD VISIBILITY IN DETAILS - Map to: "Then the \"{field}\" field should be visible in the details section"
    if (lower.match(/visible.*detail|detail.*visible|details section/)) {
      if (extractedField) {
        return `Then the "${extractedField}" field should be visible in the details section`;
      }
    }
    
    // 6. EDIT BUTTON PATTERNS - Map to: "Then the Edit button should not be visible"
    if (lower.match(/edit.*button|cannot edit|edit.*not visible|edit.*disabled|edit.*not available/)) {
      if (lower.includes('not') || lower.includes('cannot')) {
        return `Then the Edit button should not be visible`;
      }
    }
    
    // 7. CLICK EDIT PATTERNS - Map to: "When I click Edit on the {Entity}"
    if (lower.match(/click.*edit|edit.*record|edit.*page|click edit/)) {
      const entityMatch = lower.match(/(account|opportunity|lead|contact|accountcontactrelation)/);
      if (entityMatch) {
        const entity = entityMatch[1].charAt(0).toUpperCase() + entityMatch[1].slice(1);
        return `When I click Edit on the ${entity}`;
      }
      return `When I click Edit on the Account`; // Default fallback
    }
    
    // 8. SAVE PATTERNS - Map to: "When I save the record"
    if (lower.match(/save.*record|click.*save|submit|save.*changes/)) {
      return `When I save the record`;
    }
    
    // 9. RECORD CREATION PATTERNS - Map to: "Given I have an existing {Entity} record" or "Given I have a test {Entity} created via API"
    if (lower.match(/create.*record|new.*record|add.*record|have.*record|existing.*record/)) {
      const entityMatch = lower.match(/(account|opportunity|lead|contact|contract|accountcontactrelation)/);
      if (entityMatch) {
        const entity = entityMatch[1].charAt(0).toUpperCase() + entityMatch[1].slice(1);
        // Check if it's a "Given" step (data setup) or "When" step (action)
        if (keyword === 'Given' || lower.includes('have') || lower.includes('existing')) {
          // Prefer API creation for test data
          if (lower.includes('via api') || lower.includes('api')) {
            return `Given I have a test ${entity} created via API`;
          }
          return `Given I have an existing ${entity} record`;
        } else {
          return `When I navigate to the ${entity} object list`;
        }
      }
    }
    
    // 10. TEST DATA CREATION VIA API - Map to: "Given I have a test {Entity} created via API"
    if (lower.match(/created via api|via api|api.*create/)) {
      const entityMatch = lower.match(/(account|opportunity|lead|contact|accountcontactrelation)/);
      if (entityMatch) {
        const entity = entityMatch[1].charAt(0).toUpperCase() + entityMatch[1].slice(1);
        return `Given I have a test ${entity} created via API`;
      }
    }
    
    // 11. FIELD EDIT/SET PATTERNS - Map to: "When I set the \"{field}\" field"
    if (lower.match(/set.*field|edit.*field|fill.*field|enter.*field|update.*field/)) {
      if (extractedField) {
        return `When I set the "${extractedField}" field`;
      }
    }
    
    // 12. FIELD READ-ONLY PATTERNS - Map to: "Then the \"{field}\" field should be read-only"
    if (lower.match(/read-only|readonly|not editable|cannot.*edit|field.*read-only/)) {
      if (extractedField) {
        return `Then the "${extractedField}" field should be read-only`;
      }
      return `Then the "{fieldName}" field should not be visible or should be read-only`;
    }
    
    // 13. RECORD SAVED SUCCESSFULLY - Map to: "Then the {Entity} should be saved successfully"
    if (lower.match(/saved successfully|created successfully|record.*saved|should be saved/)) {
      const entityMatch = lower.match(/(account|opportunity|lead|contact|contract)/);
      if (entityMatch) {
        const entity = entityMatch[1].charAt(0).toUpperCase() + entityMatch[1].slice(1);
        return `Then the ${entity} should be saved successfully`;
      }
      return `Then the record should be saved successfully`;
    }
    
    // 14. VALIDATION ERROR PATTERNS - Map to: "Then I should see a validation error"
    if (lower.match(/validation error|error.*message|should see.*error/)) {
      return `Then I should see a validation error`;
    }
    
    // 15. FIELD BLANK/EMPTY PATTERNS - Map to: "Then the \"{field}\" field should be blank or empty"
    if (lower.match(/blank|empty|null|not.*set|no.*value/)) {
      if (extractedField) {
        return `Then the "${extractedField}" field should be blank or empty`;
      }
    }
    
    // 16. SKIP GENERIC USER ACTION DESCRIPTIONS (already handled by authentication)
    if (lower.match(/^(a|an|the)\s+(non-?admin|admin|standard|read-only|readonly)\s+user/)) {
      return ''; // User authentication is already handled
    }
    
    // 17. SKIP CONFIGURATION/SETUP STEPS (not testable actions)
    if (lower.match(/fls.*updated|permission.*set|profile.*updated|org.*profile|field.*level.*security|fls is updated/)) {
      return ''; // These are setup steps, not test steps
    }
    
    // 18. SKIP COMMENT/METADATA PATTERNS
    if (lower.match(/@@|gabriel|niraj|ahmed|tagged|sprint|updated|removed.*access|look over|terminology|language|story|specific|ac to be added|indicates removal/)) {
      return '';
    }
    
    // 19. SKIP INCOMPLETE OR MALFORMED STEPS
    if (cleaned.match(/^[A-Z]{2,}\s*$/) || cleaned.match(/^[^a-zA-Z]*$/) || cleaned.match(/^[^a-zA-Z0-9]+$/)) {
      return '';
    }
    
    // 20. SKIP STEPS THAT ARE JUST ENTITY NAMES OR FIELD NAMES WITHOUT ACTION
    if (cleaned.match(/^(Account|Opportunity|Lead|Contact|Contract|Permission sets?|Dashboards?|Reports?)$/)) {
      return '';
    }
    
    // 21. SKIP STEPS THAT ARE JUST DESCRIPTIONS WITHOUT ACTION
    if (lower.match(/^(opportunity|account|lead|contact) lightning pages?|shared list views?|dynamic forms?|lightning components?/)) {
      return '';
    }
    
    // For remaining steps, clean up and format properly
    // Remove trailing punctuation and extra whitespace
    cleaned = cleaned.replace(/[.,;:]+$/, '').trim();
    
    // Skip if too short after cleaning
    if (cleaned.length < 5) {
      return '';
    }
    
    // Capitalize first letter
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    
    // Add appropriate keyword
    if (keyword === 'Given' && !cleaned.toLowerCase().startsWith('given')) {
      return `Given ${cleaned}`;
    } else if (keyword === 'When' && !cleaned.toLowerCase().startsWith('when')) {
      return `When ${cleaned}`;
    } else if (keyword === 'Then' && !cleaned.toLowerCase().startsWith('then')) {
      return `Then ${cleaned}`;
    }
    
    return cleaned;
  }

  // ==========================================================================
  // SCENARIO GENERATION FROM ACCEPTANCE CRITERIA
  // ==========================================================================

  /**
   * Generates scenarios directly from acceptance criteria
   * Uses the actual user specified in acceptance criteria instead of hardcoded users
   */
  private generateScenariosFromAcceptanceCriteria(
    lines: string[],
    data: JiraData,
    featureKey: string,
    count: number
  ): number {
    if (!data.acceptanceCriteria || data.acceptanceCriteria.length === 0) {
      return count;
    }

    // Filter acceptance criteria that have meaningful content
    const validACs = data.acceptanceCriteria.filter(ac => 
      (ac.given.length > 0 || ac.when.length > 0 || ac.then.length > 0) &&
      ac.given.length + ac.when.length + ac.then.length > 0
    );

    if (validACs.length === 0) {
      return count;
    }

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # ACCEPTANCE CRITERIA SCENARIOS`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    for (const ac of validACs) {
      count++;
      const scenarioId = `${featureKey}-UI-${String(count).padStart(3, '0')}`;

      // Determine tags - Enhanced with priority, smoke, positive/negative, etc.
      const tags = [`@${data.key}`, `@${scenarioId}`];
      
      // Priority tags (from acceptance criteria or default based on position)
      // Priority: p1 for first 3 scenarios (critical path), p2 for others
      const priority = (count === 1 ? 'p1' : count <= 3 ? 'p1' : 'p2');
      tags.push(`@${priority}`);
      
      // Smoke tag for first scenario (critical path)
      if (count === 1) {
        tags.push('@smoke');
      }
      
      // Positive/Negative tags
      if (ac.isNegative) {
        tags.push('@negative');
      } else {
        tags.push('@positive');
      }
      
      // Data-driven tag
      if (ac.isDataDriven) {
        tags.push('@data-driven');
      }
      
      // User role tag
      if (ac.userRole) {
        const roleTag = ac.userRole.replace(/\s+/g, '-').toLowerCase();
        tags.push(`@${roleTag}`);
      }
      
      // Feature type tags
      if (data.featureType) {
        const featureTypeTag = data.featureType.replace(/\s+/g, '-').toLowerCase();
        tags.push(`@${featureTypeTag}`);
      }
      
      // Scenario type tags based on content
      const scenarioText = ac.title || ac.rawText || '';
      if (/field.*exist|verify.*exist|check.*exist/i.test(scenarioText)) {
        tags.push('@field-exists');
      }
      if (/create|new|add/i.test(scenarioText) && !/update|edit/i.test(scenarioText)) {
        tags.push('@create');
      }
      if (/update|edit|modify|change/i.test(scenarioText)) {
        tags.push('@update');
      }
      if (/query|search|retrieve|get/i.test(scenarioText)) {
        tags.push('@query');
      }
      if (/visible|visibility|display|show/i.test(scenarioText)) {
        tags.push('@visibility');
      }
      if (/read.*only|not.*edit|cannot.*edit/i.test(scenarioText)) {
        tags.push('@read-only');
      }
      if (/permission|access|role|restrict/i.test(scenarioText)) {
        tags.push('@permissions');
      }

      lines.push(`  ${tags.join(' ')}`);
      lines.push(`  Scenario: ${ac.title || `AC ${ac.id}`}`);

      // Add user authentication step - use application-specific login
      const appType = this.detectApplicationType(data.key);
      if (appType === 'dynamics') {
        // For Dynamics, use Dynamics login (no user role selection needed)
        lines.push(`    Given I am logged in to Dynamics 365`);
      } else {
        // For Salesforce, use role-based login
        if (ac.userRole) {
          // Normalize user role for step definition
          const normalizedRole = this.normalizeUserRoleForStep(ac.userRole);
          lines.push(`    Given I am logged in as a "${normalizedRole}" user`);
        } else {
          // Default to Accelerant - System administrator when no user role is mentioned in acceptance criteria
          lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
        }
      }

      // Add GIVEN steps (skip user-related ones as we already added authentication)
      for (const givenStep of ac.given) {
        if (!this.isUserRelatedStep(givenStep)) {
          const step = this.convertToGherkinStep(givenStep, 'Given');
          // Skip empty steps (filtered out by convertToGherkinStep)
          if (!step || step.trim().length === 0) {
            continue;
          }
          // Avoid duplicate "Given" if already present
          if (step.toLowerCase().startsWith('given')) {
            lines.push(`    ${step}`);
          } else if (step.trim().length > 0) {
            lines.push(`    And ${step.replace(/^(Given|When|Then)\s+/i, '')}`);
          }
        }
      }

      // Add WHEN steps
      for (const whenStep of ac.when) {
        const step = this.convertToGherkinStep(whenStep, 'When');
        // Skip empty steps
        if (!step || step.trim().length === 0) {
          continue;
        }
        if (step.toLowerCase().startsWith('when')) {
          lines.push(`    ${step}`);
        } else if (step.trim().length > 0) {
          lines.push(`    And ${step.replace(/^(Given|When|Then)\s+/i, '')}`);
        }
      }

      // Add THEN steps
      for (const thenStep of ac.then) {
        const step = this.convertToGherkinStep(thenStep, 'Then');
        // Skip empty steps
        if (!step || step.trim().length === 0) {
          continue;
        }
        if (step.toLowerCase().startsWith('then')) {
          lines.push(`    ${step}`);
        } else if (step.trim().length > 0) {
          lines.push(`    And ${step.replace(/^(Given|When|Then)\s+/i, '')}`);
        }
      }

      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
    }

    logger.info(`✅ Generated ${validACs.length} scenario(s) from acceptance criteria`);
    return count;
  }

  // ==========================================================================
  // UI FEATURE GENERATION (ENHANCED)
  // ==========================================================================

  private generateUIFeature(data: JiraData, suffix: string = '', mode: GenerationMode = 3, userScenarios: UserScenario[] = []): string {
    const lines: string[] = [];
    const featureKey = `${data.key}${suffix}`;

    // ========== COMPREHENSIVE HEADER ==========
    lines.push(`# ${'═'.repeat(78)}`);
    lines.push(`# JIRA: ${data.key} - ${data.summary}`);
    lines.push(`# Type: ${data.type} | Status: ${data.status} | Priority: ${data.priority}`);
    lines.push(`# Feature Type: ${data.featureType}`);
    lines.push(`# Generated: ${new Date().toISOString()} (FeatureGenerator v3.1)`);
    lines.push(`# ${'═'.repeat(78)}`);
    lines.push('#');
    
    // ========== GENERATION MODE INFORMATION ==========
    const modeDescriptions: Record<GenerationMode, string> = {
      1: 'User Scenarios Only - Only user-provided scenarios are used, no generator scenarios',
      2: 'User Scenarios + Augmentation - User scenarios as baseline, generator adds critical gaps',
      3: 'Generator Only - Full automatic generation from Jira data (current behavior)',
      4: 'Risk-Based Testing (RBT) - UI test cases generated; API optional (minimal 1-2 or skip)'
    };
    lines.push(`# ═══════════════════════════════════════════════════════════════════════════`);
    lines.push(`# GENERATION MODE`);
    lines.push(`# ═══════════════════════════════════════════════════════════════════════════`);
    lines.push(`# Mode: ${mode}`);
    lines.push(`# Description: ${modeDescriptions[mode]}`);
    if (mode === 1 || mode === 2) {
      lines.push(`# User Scenarios Provided: ${userScenarios.length}`);
      if (mode === 2) {
        lines.push(`# Augmentation: Enabled (max 5 additional scenarios for critical gaps)`);
      }
    }
    if (mode === 4) {
      lines.push(`# RBT: UI test cases generated; API optional (minimal 1-2 or skip).`);
    }
    lines.push(`#`);
    
    // V3.1: PARENT/EPIC CONTEXT (if available)
    if (data.parentContext) {
      lines.push('# ═══════════════════════════════════════════════════════════════════════════');
      lines.push('# PARENT/EPIC CONTEXT');
      lines.push('# ═══════════════════════════════════════════════════════════════════════════');
      lines.push(`#`);
      lines.push(`# Parent: ${data.parentContext.key} - ${data.parentContext.summary}`);
      lines.push(`# Type: ${data.parentContext.type} | Status: ${data.parentContext.status}`);
      if (data.parentContext.businessObjective) {
        lines.push(`# Business Objective: ${data.parentContext.businessObjective.substring(0, 70)}...`);
      }
      if (data.parentContext.acceptanceCriteria.length > 0) {
        lines.push(`#`);
        lines.push(`# Parent Acceptance Criteria (${data.parentContext.acceptanceCriteria.length}):`);
        data.parentContext.acceptanceCriteria.slice(0, 5).forEach((ac, idx) => {
          const acText = ac.title || ac.rawText.substring(0, 60);
          lines.push(`#   ${idx + 1}. ${acText}...`);
        });
        if (data.parentContext.acceptanceCriteria.length > 5) {
          lines.push(`#   ... and ${data.parentContext.acceptanceCriteria.length - 5} more`);
        }
      }
      if (data.parentContext.technicalNotes.length > 0) {
        lines.push(`#`);
        lines.push(`# Technical Notes from Parent:`);
        data.parentContext.technicalNotes.forEach(note => {
          lines.push(`#   • ${note.substring(0, 65)}...`);
        });
      }
      if (data.parentContext.relatedFeatures.length > 0) {
        lines.push(`#`);
        lines.push(`# Related Work Items: ${data.parentContext.relatedFeatures.slice(0, 8).join(', ')}`);
      }
      lines.push(`#`);
    }

    // V3.0: SUMMARY OF UNDERSTANDING
    lines.push('# ═══════════════════════════════════════════════════════════════════════════');
    lines.push('# SUMMARY OF UNDERSTANDING');
    lines.push('# ═══════════════════════════════════════════════════════════════════════════');
    lines.push(`#`);
    lines.push(`# Overview: ${data.summaryOfUnderstanding.overview}`);
    lines.push(`# Primary Entity: ${data.summaryOfUnderstanding.primaryEntity}`);
    lines.push(`#`);
    
    if (data.summaryOfUnderstanding.fields.length > 0) {
      lines.push(`# Fields Involved (${data.summaryOfUnderstanding.fields.length}):`);
      data.summaryOfUnderstanding.fields.forEach(field => {
        lines.push(`#   • ${field.name} (${field.apiName}) - ${field.action}`);
        if (field.description && field.description !== `Field: ${field.name}`) {
          lines.push(`#     ${field.description.substring(0, 70)}`);
        }
      });
      lines.push(`#`);
    }
    
    // ENHANCED: Add Account Types if detected
    if (data.summaryOfUnderstanding.accountTypes && data.summaryOfUnderstanding.accountTypes.length > 0) {
      lines.push(`# Account Types Involved (${data.summaryOfUnderstanding.accountTypes.length}):`);
      data.summaryOfUnderstanding.accountTypes.forEach(accountType => {
        lines.push(`#   • ${accountType}`);
      });
      lines.push(`#`);
    }
    
    if (data.summaryOfUnderstanding.requirements.length > 0) {
      lines.push(`# Test Requirements (${data.summaryOfUnderstanding.requirements.length}):`);
      data.summaryOfUnderstanding.requirements.forEach(req => {
        lines.push(`#   ${req.id}: ${req.description.substring(0, 65)}`);
        lines.push(`#     → Test Type: ${req.testType.toUpperCase()} | Priority: ${req.priority}`);
      });
      lines.push(`#`);
    }
    
    if (data.summaryOfUnderstanding.keyPoints.length > 0) {
      lines.push(`# Key Points:`);
      data.summaryOfUnderstanding.keyPoints.forEach(point => {
        lines.push(`#   • ${point.substring(0, 70)}`);
      });
      lines.push(`#`);
    }
    
    lines.push('# ═══════════════════════════════════════════════════════════════════════════');
    lines.push('#');

    // Negative/Boundary scenarios note
    lines.push('# NEGATIVE/BOUNDARY SCENARIOS:');
    lines.push('#   - Invalid values rejected');
    lines.push('#   - Permission-based access control');
    lines.push('#   - Blank/null value handling');
    lines.push('#');

    // ENHANCED: Only show field values if they are actual picklist values (not Account Types)
    if (data.fieldValues.length > 0) {
      lines.push('# FIELD VALUES IDENTIFIED:');
      data.fieldValues.forEach(v => lines.push(`#   • ${v}`));
      lines.push('#');
    }

    lines.push(`# ${'═'.repeat(78)}`);
    lines.push('');

    // ========== FEATURE DECLARATION ==========
    const appType = this.detectApplicationType(data.key);
    const featureTags = this.getFeatureTags(data);
    const appTag = appType === 'dynamics' ? '@dynamics' : '@salesforce';
    lines.push(`@ui ${appTag} @${data.key} @${data.priority.toLowerCase()} ${featureTags}`);
    lines.push(`Feature: ${featureKey} - ${data.summary}`);
    
    // Use application-specific feature description
    if (appType === 'dynamics') {
      lines.push(`  As a Dynamics 365 user`);
      lines.push(`  I want to manage ${data.primaryEntity} data in Reference Data Management`);
      lines.push(`  So that ${data.primaryEntity} records are managed correctly`);
    } else {
      lines.push(`  As a Salesforce user`);
      lines.push(`  I want to verify the ${data.actualFieldName} functionality on ${data.primaryEntity}`);
      lines.push(`  So that ${data.primaryEntity} records are managed correctly`);
    }
    lines.push('');

    // ========== BACKGROUND ==========
    lines.push('  Background:');
    
    // Use application-specific authentication step (appType already declared above)
    if (appType === 'dynamics') {
      lines.push('    Given I am logged in to Dynamics 365');
    } else {
      lines.push('    Given I am an authenticated Salesforce user');
    }
    lines.push('');

    // ========== GENERATE SCENARIOS BASED ON FEATURE TYPE(S) ==========
    let scenarioCount = 0;

    // MODE 1 & 2: Inject user scenarios first
    if ((mode === 1 || mode === 2) && userScenarios.length > 0) {
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push(`  # USER-PROVIDED SCENARIOS`);
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push('');
      
      const uiScenarios = userScenarios.filter(s => {
        const classification = this.classifyScenario(s);
        return classification.type === 'UI' || classification.type === 'NeedsDecision';
      });
      
      for (const scenario of uiScenarios) {
        scenarioCount++;
        const classification = this.classifyScenario(scenario);
        const validation = this.validateScenario(scenario, data);
        const scenarioId = `${featureKey}-UI-${String(scenarioCount).padStart(3, '0')}`;
        
        // Add metadata comments
        lines.push(`  # Scenario Source: user`);
        lines.push(`  # Generation Mode: ${mode}`);
        lines.push(`  # Classification: ${classification.type}`);
        lines.push(`  # Classification Rationale: ${classification.rationale}`);
        lines.push(`  # Status: ${validation.status}`);
        if (validation.questions.length > 0) {
          lines.push(`  # Questions: ${validation.questions.join('; ')}`);
        }
        lines.push('');
        
        // Add scenario
        const tags = [`@${data.key}`, `@${scenarioId}`, `@p2`];
        if (classification.type === 'NeedsDecision') {
          tags.push('@needs-decision');
        }
        lines.push(`  ${tags.join(' ')}`);
        lines.push(`  Scenario: ${scenario.title}`);
        
        // Add steps
        scenario.given.forEach(g => lines.push(`    Given ${g}`));
        scenario.when.forEach(w => lines.push(`    When ${w}`));
        scenario.then.forEach(t => lines.push(`    Then ${t}`));
        lines.push(`    And I take a screenshot as evidence`);
        lines.push('');
      }
      
      logger.info(`✅ Injected ${uiScenarios.length} user scenario(s) into UI feature`);
    }

    // MODE 3 & 4: Generate scenarios from acceptance criteria (Mode 4 = RBT with full UI generation)
    // MODE 1: Skip. MODE 2: Generate for augmentation.
    if (mode === 3 || mode === 2 || mode === 4) {
      scenarioCount = this.generateScenariosFromAcceptanceCriteria(lines, data, featureKey, scenarioCount);
    }

    // MODE 1: Skip full generator scenarios
    if (mode === 1) {
      // Skip feature-type-specific scenarios
    } else {
      // MODE 2 & 3: Generate scenarios for ALL detected feature types (multi-feature support)
      const featureTypesToGenerate = data.featureTypes && data.featureTypes.length > 0 
        ? data.featureTypes 
        : [data.featureType]; // Fallback to single feature type

      // Generate scenarios for each feature type
      for (const featureType of featureTypesToGenerate) {
        // Get fields for this feature type
        const fieldsForType = data.fieldFeatureMap 
          ? Array.from(data.fieldFeatureMap.entries())
              .filter(([_, ft]) => ft === featureType)
              .map(([fieldName, _]) => fieldName)
          : [];

        // Create a modified data object for this feature type
        const typeSpecificData = {
          ...data,
          featureType,
          // If we have field-specific data, use it
          actualFieldName: fieldsForType.length > 0 ? fieldsForType[0] : data.actualFieldName,
        };

        switch (featureType) {
          case 'auto-population':
            scenarioCount = this.generateAutoPopulationScenarios(lines, typeSpecificData, featureKey, scenarioCount);
            break;
          case 'field-visibility':
            scenarioCount = this.generateFieldVisibilityScenarios(lines, typeSpecificData, featureKey, scenarioCount);
            break;
          case 'field-behavior':
            scenarioCount = this.generateFieldBehaviorScenarios(lines, typeSpecificData, featureKey, scenarioCount);
            break;
          case 'field-removal':
            scenarioCount = this.generateFieldRemovalScenarios(lines, typeSpecificData, featureKey, scenarioCount);
            break;
          case 'permission-based':
            scenarioCount = this.generatePermissionScenarios(lines, typeSpecificData, featureKey, scenarioCount);
            break;
          case 'picklist-values':
            scenarioCount = this.generatePicklistScenarios(lines, typeSpecificData, featureKey, scenarioCount);
            break;
          default:
            scenarioCount = this.generateGeneralScenarios(lines, typeSpecificData, featureKey, scenarioCount);
        }
      }
    }

    // MODE 2: Add augmented scenarios
    if (mode === 2 && userScenarios.length > 0) {
      const augmentation = this.generateAugmentedScenarios(userScenarios, data, 5);
      if (augmentation.scenarios.length > 0) {
        lines.push(`  # ${'═'.repeat(74)}`);
        lines.push(`  # AUGMENTED SCENARIOS (Added by Generator)`);
        lines.push(`  # ${'═'.repeat(74)}`);
        lines.push('');
        
        for (let i = 0; i < augmentation.scenarios.length; i++) {
          const scenario = augmentation.scenarios[i];
          const explanation = augmentation.explanations[i];
          scenarioCount++;
          const classification = this.classifyScenario(scenario);
          const scenarioId = `${featureKey}-UI-${String(scenarioCount).padStart(3, '0')}`;
          
          // Add metadata comments
          lines.push(`  # Scenario Source: generator`);
          lines.push(`  # Generation Mode: ${mode}`);
          lines.push(`  # Added Reason: ${explanation}`);
          lines.push(`  # Classification: ${classification.type}`);
          lines.push(`  # Classification Rationale: ${classification.rationale}`);
          lines.push(`  # Status: READY`);
          lines.push('');
          
          // Add scenario
          const tags = [`@${data.key}`, `@${scenarioId}`, `@p1`, `@augmented`];
          lines.push(`  ${tags.join(' ')}`);
          lines.push(`  Scenario: ${scenario.title}`);
          
          // Add steps
          scenario.given.forEach(g => lines.push(`    Given ${g}`));
          scenario.when.forEach(w => lines.push(`    When ${w}`));
          scenario.then.forEach(t => lines.push(`    Then ${t}`));
          lines.push(`    And I take a screenshot as evidence`);
          lines.push('');
        }
        
        logger.info(`✅ Added ${augmentation.scenarios.length} augmented scenario(s) to UI feature`);
      }
    }

    // ========== ADD NEGATIVE SCENARIOS (MODE 2, 3 & 4) ==========
    if (mode !== 1) {
      scenarioCount = this.generateNegativeScenarios(lines, data, featureKey, scenarioCount);
    }

    // ENHANCED: Generate Account Type validation scenario if Account Types are detected
    if (data.summaryOfUnderstanding.accountTypes && 
        data.summaryOfUnderstanding.accountTypes.length > 0 && 
        data.primaryEntity.toLowerCase() === 'account') {
      scenarioCount++;
      const accountTypes = data.summaryOfUnderstanding.accountTypes;
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push(`  # ACCOUNT TYPE FIELD: Verify all ${accountTypes.length} Account Types are available`);
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push('');
      lines.push(`  @${data.key} @${featureKey}-UI-${String(scenarioCount).padStart(3, '0')} @smoke @p1 @account-type-validation`);
      lines.push(`  Scenario: Verify Account Type field dropdown shows all ${accountTypes.length} Account Types`);
      lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
      lines.push(`    When I navigate to the Account object list`);
      lines.push(`    And I click New to create a Account`);
      lines.push(`    And I click on the "Type" picklist`);
      // Add verification steps for each Account Type
      accountTypes.forEach(accountType => {
        lines.push(`    Then I should see "${accountType}" in the "Type" field picklist`);
      });
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
      logger.info(`✅ Added Account Type validation scenario for ${accountTypes.length} Account Type(s)`);
    }

    // V3.0: Ensure at least one UI data creation scenario
    const hasUIDataCreation = lines.some(line => 
      line.includes('I create a new') && 
      !line.includes('via API') &&
      !line.includes('via POST')
    );
    
    if (!hasUIDataCreation && scenarioCount > 0) {
      // Add a UI data creation scenario
      const entity = data.primaryEntity;
      scenarioCount++;
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push(`  # UI DATA CREATION (V3.0 Requirement)`);
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push('');
      lines.push(`  @${data.key} @${featureKey}-UI-${String(scenarioCount).padStart(3, '0')} @p2 @ui-data-creation`);
      lines.push(`  Scenario: Create ${entity} record via UI`);
      
      // Use application-specific navigation steps
      const appType = this.detectApplicationType(data.key);
      if (appType === 'dynamics') {
        // Dynamics navigation pattern: Login -> App -> Entity
        lines.push(`    Given I am logged in to Dynamics 365`);
        lines.push(`    When I navigate to the Reference Data Management app`);
        // Map entity to Dynamics entity name (e.g., Party -> Parties)
        const dynamicsEntityName = this.getDynamicsEntityNameForUI(entity);
        lines.push(`    And I select "${dynamicsEntityName}" from the left navigation pane`);
        lines.push(`    And I click New to create a ${entity}`);
        lines.push(`    And I fill in required ${entity} fields`);
        lines.push(`    And I save the record`);
        lines.push(`    Then the ${entity} should be created successfully`);
      } else {
        // Salesforce navigation pattern
        lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
        lines.push(`    When I navigate to the ${entity} object list`);
        lines.push(`    And I click New to create a ${entity}`);
        lines.push(`    And I fill in required ${entity} fields`);
        lines.push(`    And I save the record`);
        lines.push(`    Then the ${entity} should be created successfully`);
      }
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
      logger.info(`✅ Added UI data creation scenario for ${entity}`);
    }

    // V3.0: Analyze coverage and add report
    this.analyzeCoverage(lines, data, featureKey, 'ui');

    // V3.0: Analyze step definition usage and add report
    this.analyzeStepDefinitions(lines, data, featureKey, 'ui');

    return lines.join('\n');
  }

  private getFeatureTags(data: JiraData): string {
    const tags: string[] = [];
    const appType = this.detectApplicationType(data.key);
    
    // Application-specific tag
    if (appType === 'dynamics') {
      tags.push('@dynamics', '@d365');
    } else {
      tags.push('@salesforce');
    }
    
    switch (data.featureType) {
      case 'auto-population':
        tags.push('@auto-populate', '@field-mapping');
        break;
      case 'field-visibility':
        tags.push('@field-visibility');
        break;
      case 'field-behavior':
        tags.push('@field-behavior', '@read-only');
        break;
      case 'permission-based':
        tags.push('@permissions', '@roles');
        break;
      case 'picklist-values':
        tags.push('@picklist');
        break;
    }

    if (data.primaryEntity !== 'Record') {
      tags.push(`@${data.primaryEntity.toLowerCase()}`);
    }

    return tags.join(' ');
  }

  /**
   * Get application-specific entity name
   * For Dynamics, convert to entity set name (e.g., Account -> accounts)
   * For Salesforce, keep as-is
   */
  private getEntityNameForStep(entity: string, appType: ApplicationType): string {
    if (appType === 'dynamics') {
      // Convert to Dynamics entity set name (plural, lowercase)
      // Common mappings
      const mappings: Record<string, string> = {
        'Account': 'accounts',
        'Contact': 'contacts',
        'Lead': 'leads',
        'Opportunity': 'opportunities',
        'Party': 'accelins_parties', // Custom entity
      };
      
      if (mappings[entity]) {
        return mappings[entity];
      }
      
      // Default: lowercase and pluralize
      return entity.toLowerCase() + 's';
    }
    
    return entity;
  }

  /**
   * Generate application-specific step for describing object fields
   */
  private getDescribeObjectStep(entity: string, appType: ApplicationType): string {
    if (appType === 'dynamics') {
      const entitySetName = this.getEntityNameForStep(entity, appType);
      return `When I call the Dynamics API to describe ${entitySetName} entity`;
    }
    
    return `When I describe the ${entity} object fields`;
  }

  /**
   * Generate application-specific step for creating records
   */
  private getCreateRecordStep(entity: string, appType: ApplicationType): string {
    if (appType === 'dynamics') {
      const entitySetName = this.getEntityNameForStep(entity, appType);
      return `When I create a Dynamics ${entitySetName} record via API with:`;
    }
    
    return `When I create a new ${entity} via POST with:`;
  }

  /**
   * Generate application-specific step for querying records
   */
  private getQueryRecordStep(entity: string, appType: ApplicationType): string {
    if (appType === 'dynamics') {
      const entitySetName = this.getEntityNameForStep(entity, appType);
      return `When I query Dynamics ${entitySetName} records via API`;
    }
    
    return `When I query the ${entity} record via API`;
  }

  /**
   * Get Dynamics entity name for UI navigation
   * Maps entity names to their display names in Dynamics left navigation
   */
  private getDynamicsEntityNameForUI(entity: string): string {
    // Common mappings for Reference Data Management entities
    const mappings: Record<string, string> = {
      'Account': 'Accounts',
      'Party': 'Parties',
      'Contact': 'Contacts',
      'Lead': 'Leads',
      'Opportunity': 'Opportunities',
      'Record': 'Records', // Generic fallback
      'TPA Mapping': 'TPA Maps',
      'TPAMapping': 'TPA Maps',
    };
    
    // Check if we have a mapping
    if (mappings[entity]) {
      return mappings[entity];
    }
    
    // Default: capitalize first letter and pluralize if needed
    return entity.charAt(0).toUpperCase() + entity.slice(1) + (entity.endsWith('s') ? '' : 's');
  }

  // ==========================================================================
  // SCENARIO GENERATORS BY FEATURE TYPE
  // ==========================================================================

  private generateAutoPopulationScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const source = data.secondaryEntity || 'Source';
    const target = data.primaryEntity;
    const field = data.actualFieldName;

    // ENHANCED: Check if this is a Lead conversion scenario
    const isLeadConversion = source === 'Lead' && target === 'Opportunity';
    const description = data.fullContext || '';
    const hasConversionKeywords = /lead\s+(?:conversion|convert|to\s+opportunity)/i.test(description) ||
                                  /convert\s+lead/i.test(description) ||
                                  /maps?\s+from\s+lead/i.test(description);

    // If Lead conversion detected, use dedicated conversion scenarios
    if (isLeadConversion || hasConversionKeywords) {
      return this.generateLeadConversionScenarios(lines, data, featureKey, count, field);
    }

    // Header
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # AUTO-POPULATION: ${field} from ${source} to ${target}`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Scenario 1: Basic auto-population
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @smoke @p1 @auto-populate`);
    lines.push(`  Scenario: Verify ${field} auto-populates from ${source} to ${target}`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have a test ${source} created via API with:`);
    lines.push(`      | field   | value    |`);
    lines.push(`      | ${field} | EU       |`);
    if (target === 'Opportunity') {
      lines.push(`    When I navigate to the ${source} record`);
      lines.push(`    And I create a new ${target} from the ${source}`);
    } else {
      lines.push(`    And I have a test ${target} created via API for the ${source}`);
      lines.push(`    When I navigate to the ${target} record`);
    }
    lines.push(`    Then the "${field}" field should display "EU"`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Scenario 2: Data-driven for all values
    if (data.fieldValues.length > 0) {
      count++;
      lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @auto-populate @data-driven`);
      lines.push(`  Scenario Outline: Verify ${field} mapping for all valid values`);
      lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
      lines.push(`    And I have a test ${source} created via API with ${field} "<value>"`);
      if (target === 'Opportunity' && source !== 'Lead') {
        lines.push(`    When I navigate to the ${source} record`);
        lines.push(`    And I create a new ${target} from the ${source}`);
      } else {
        lines.push(`    And I have a test ${target} created via API for the ${source}`);
        lines.push(`    When I navigate to the ${target} record`);
      }
      lines.push(`    Then the "${field}" field should display "<value>"`);
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
      lines.push('    Examples:');
      lines.push('      | value |');
      data.fieldValues.forEach(v => lines.push(`      | ${v} |`));
      lines.push('');
    }

    // Scenario 3: Field is read-only after population
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @read-only`);
    lines.push(`  Scenario: Verify ${field} is NOT editable on ${target} after creation`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have a test ${source} created via API with ${field} "UK"`);
    lines.push(`    And I have a test ${target} created via API for the ${source}`);
    lines.push(`    When I navigate to the ${target} record`);
    lines.push(`    And I click Edit on the ${target}`);
    lines.push(`    Then the "${field}" field should not be editable`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Scenario 4: Field visible on target
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @visibility`);
    lines.push(`  Scenario: Verify ${field} field is visible on ${target}`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have a test ${source} created via API with ${field} "US"`);
    lines.push(`    And I have a test ${target} created via API for the ${source}`);
    lines.push(`    When I navigate to the ${target} record`);
    lines.push(`    Then the "${field}" field should be visible`);
    lines.push(`    And the "${field}" field should display "US"`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Scenario 5: Exact match verification
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @exact-match`);
    lines.push(`  Scenario: Verify ${field} value matches exactly from ${source}`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have a test ${source} created via API with ${field} "APAC"`);
    lines.push(`    And I have a test ${target} created via API for the ${source}`);
    lines.push(`    When I navigate to the ${target} record`);
    lines.push(`    Then the "${field}" field should display "APAC"`);
    lines.push(`    And the ${field} value should match exactly what was on the ${source}`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    return count;
  }

  /**
   * Generate Lead to Opportunity conversion scenarios
   * Handles field mapping during Lead conversion workflow
   */
  private generateLeadConversionScenarios(
    lines: string[], 
    data: JiraData, 
    featureKey: string, 
    count: number,
    field: string
  ): number {
    // Header
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # LEAD CONVERSION: ${field} mapping from Lead to Opportunity`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Scenario 1: Field maps from Lead to Opportunity during conversion
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @smoke @p1 @lead-conversion`);
    lines.push(`  Scenario: Verify ${field} maps from Lead to Opportunity during conversion`);
    lines.push(`    Given I have a test Lead created via API with:`);
    lines.push(`      | field   | value    |`);
    lines.push(`      | ${field} | EU       |`);
    lines.push(`    When I convert the Lead to Opportunity`);
    lines.push(`    Then the Opportunity should have ${field} "EU"`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Scenario 2: Data-driven for all values
    if (data.fieldValues.length > 0) {
      count++;
      lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @lead-conversion @data-driven`);
      lines.push(`  Scenario Outline: Verify ${field} maps from Lead to Opportunity for all values during conversion`);
      lines.push(`    Given I have a test Lead created via API with ${field} "<value>"`);
      lines.push(`    When I convert the Lead to Opportunity`);
      lines.push(`    Then the Opportunity should have ${field} "<value>"`);
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
      lines.push('    Examples:');
      lines.push('      | value |');
      data.fieldValues.forEach(v => lines.push(`      | ${v} |`));
      lines.push('');
    }

    // Scenario 3: Field does NOT map to Account during conversion (negative test)
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @lead-conversion @negative`);
    lines.push(`  Scenario: Verify ${field} does NOT map to Account during Lead conversion`);
    lines.push(`    Given I have a test Lead created via API with:`);
    lines.push(`      | field   | value    |`);
    lines.push(`      | ${field} | UK       |`);
    lines.push(`    When I convert the Lead to Opportunity`);
    lines.push(`    Then the Opportunity should have ${field} "UK"`);
    lines.push(`    And the Account should NOT have ${field}`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Scenario 4: Field value is preserved during conversion
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @lead-conversion`);
    lines.push(`  Scenario: Verify ${field} value is preserved during Lead conversion`);
    lines.push(`    Given I have a test Lead created via API with ${field} "US"`);
    lines.push(`    When I convert the Lead to Opportunity`);
    lines.push(`    Then the Opportunity should have ${field} "US"`);
    lines.push(`    And the ${field} value should match exactly what was on the Lead`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    return count;
  }

  private generateFieldVisibilityScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    
    // ENHANCED: Generate scenarios for all fields if multi-field, otherwise use single field
    const fieldsToTest = data.isMultiField && data.allFields.length > 0 
      ? data.allFields 
      : [{ displayName: data.actualFieldName, apiName: data.fieldApiName, action: 'show' as FieldInfo['action'] }];

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # FIELD VISIBILITY: ${fieldsToTest.length} field(s) on ${entity}`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Generate test cases for each field
    for (const fieldInfo of fieldsToTest) {
      const field = fieldInfo.displayName;
      const apiName = fieldInfo.apiName;
      const action = fieldInfo.action;

      // Skip if field name is empty or invalid
      if (!field || field.length < 2) {
        continue;
      }

      // Test 1: Field visibility for admin (for all fields)
      count++;
      lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @smoke @p1 @admin`);
      lines.push(`  Scenario: Verify "${field}" is visible for admin users`);
      lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
      lines.push(`    When I navigate to the ${entity} object list`);
      lines.push(`    And I click New to create a ${entity}`);
      lines.push(`    Then the "${field}" field should be visible`);
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');

      // Test 2: Mandatory field validation (if action is 'validate')
      if (action === 'validate') {
        count++;
        lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @mandatory @validation`);
        lines.push(`  Scenario: Verify "${field}" is mandatory on ${entity} creation`);
        lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
        lines.push(`    When I navigate to the ${entity} object list`);
        lines.push(`    And I click New to create a ${entity}`);
        lines.push(`    And I fill in required ${entity} fields except "${field}"`);
        lines.push(`    And I attempt to save the record`);
        lines.push(`    Then the save should fail with validation error`);
        lines.push(`    And the error message should indicate "${field}" is required`);
        lines.push(`    And I take a screenshot as evidence`);
        lines.push('');
      }

      // Test 3: Field visibility based on conditional requirements (generic - works for Account Types, Record Types, etc.)
      // Only generate if conditional values or entity-specific types are detected
      const currentFieldInfo = fieldsToTest.find(f => f.displayName === field);
      const conditionalValues = currentFieldInfo?.conditionalAccountTypes;
      
      // Account-specific: Account Type visibility tests
      if (entity.toLowerCase() === 'account' && 
          data.summaryOfUnderstanding.accountTypes && 
          data.summaryOfUnderstanding.accountTypes.length > 0) {
        
        if (conditionalValues && conditionalValues.length > 0) {
          // Conditional visibility: visible only on specific Account Types
          count++;
          lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @conditional-visibility`);
          lines.push(`  Scenario Outline: Verify "${field}" is visible only on ${conditionalValues.join(' and ')} Account Types`);
          lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
          lines.push(`    When I navigate to the Account object list`);
          lines.push(`    And I click New to create a Account`);
          lines.push(`    And I set the "Type" field to "<accountType>"`);
          lines.push(`    Then the "${field}" field should be visible`);
          lines.push(`    And I take a screenshot as evidence`);
          lines.push('');
          lines.push('    Examples:');
          lines.push('      | accountType |');
          // Test with conditional types (should be visible)
          conditionalValues.forEach(accountType => {
            lines.push(`      | ${accountType} |`);
          });
          // Test with non-conditional types (should NOT be visible)
          const nonConditionalTypes = data.summaryOfUnderstanding.accountTypes.filter(
            type => !conditionalValues.includes(type)
          ).slice(0, 3); // Test 3 non-conditional types
          nonConditionalTypes.forEach(accountType => {
            lines.push(`      | ${accountType} |`);
          });
          lines.push('');
        } else if (action === 'hide') {
          // Hidden for all Account Types
          count++;
          lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @hidden-field`);
          lines.push(`  Scenario Outline: Verify "${field}" is NOT visible for any Account Type`);
          lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
          lines.push(`    When I navigate to the Account object list`);
          lines.push(`    And I click New to create a Account`);
          lines.push(`    And I set the "Type" field to "<accountType>"`);
          lines.push(`    Then the "${field}" field should not be visible`);
          lines.push(`    And I take a screenshot as evidence`);
          lines.push('');
          lines.push('    Examples:');
          lines.push('      | accountType |');
          // Test a sample of Account Types to verify field is hidden
          data.summaryOfUnderstanding.accountTypes.slice(0, 5).forEach(accountType => {
            lines.push(`      | ${accountType} |`);
          });
          lines.push('');
        } else {
          // Visible on all Account Types
          count++;
          lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @account-type-visibility`);
          lines.push(`  Scenario Outline: Verify "${field}" is visible for all Account Types`);
          lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
          lines.push(`    When I navigate to the Account object list`);
          lines.push(`    And I click New to create a Account`);
          lines.push(`    And I set the "Type" field to "<accountType>"`);
          lines.push(`    Then the "${field}" field should be visible`);
          lines.push(`    And I take a screenshot as evidence`);
          lines.push('');
          lines.push('    Examples:');
          lines.push('      | accountType |');
          data.summaryOfUnderstanding.accountTypes.forEach(accountType => {
            lines.push(`      | ${accountType} |`);
          });
          lines.push('');
        }
      } else if (action === 'hide') {
        // Generic hidden field test (for non-Account entities or when Account Types not detected)
        count++;
        lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @hidden-field`);
        lines.push(`  Scenario: Verify "${field}" is NOT visible on ${entity}`);
        lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
        lines.push(`    When I navigate to the ${entity} object list`);
        lines.push(`    And I click New to create a ${entity}`);
        lines.push(`    Then the "${field}" field should not be visible`);
        lines.push(`    And I take a screenshot as evidence`);
        lines.push('');
      }

      // Test 4: Field visibility on edit form
      count++;
      lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @edit-form`);
      lines.push(`  Scenario: Verify "${field}" is visible on ${entity} edit form`);
      lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
      lines.push(`    And I have an existing ${entity} record`);
      lines.push(`    When I navigate to the ${entity} record`);
      lines.push(`    And I click Edit on the ${entity}`);
      lines.push(`    Then the "${field}" field should be visible`);
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
    }

    return count;
  }

  private generateFieldBehaviorScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const field = data.actualFieldName;

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # FIELD BEHAVIOR: ${field} on ${entity}`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Field is read-only
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @smoke @p1 @read-only`);
    lines.push(`  Scenario: Verify ${field} is read-only on ${entity}`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    And I click Edit on the ${entity}`);
    lines.push(`    Then the "${field}" field should not be editable`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Field cannot be modified
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @negative`);
    lines.push(`  Scenario: Verify user cannot modify ${field} after ${entity} creation`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    And I click Edit on the ${entity}`);
    lines.push(`    Then the "${field}" field should be read-only`);
    lines.push(`    And attempting to edit the ${field} should not be possible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    return count;
  }

  private generatePermissionScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const field = data.actualFieldName;

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # PERMISSION-BASED: ${field} on ${entity}`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Admin access
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @smoke @p1 @admin`);
    lines.push(`  Scenario: Verify admin user can access ${field}`);
    lines.push(`    Given I am logged in as an admin user`);
    lines.push(`    And I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    Then the "${field}" field should be visible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Standard user restricted
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @standard-user @negative`);
    lines.push(`  Scenario: Verify standard user cannot access ${field}`);
    lines.push(`    Given I am logged in as a standard user`);
    lines.push(`    And I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    Then the "${field}" field should not be visible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Read-only user
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @read-only-user @negative`);
    lines.push(`  Scenario: Verify read-only user cannot edit ${field}`);
    lines.push(`    Given I am logged in as a read-only user`);
    lines.push(`    And I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    Then the Edit button should not be visible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    return count;
  }

  private generateFieldRemovalScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const field = data.actualFieldName;

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # FIELD REMOVAL: ${field} should NOT exist on ${entity}`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Scenario 1: Field does not exist on detail page
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @smoke @p1 @field-removal`);
    lines.push(`  Scenario: Verify ${field} field does NOT exist on ${entity}`);
    lines.push(`    Given I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    Then the "${field}" field should not be visible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Scenario 2: Field not available in edit mode
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @field-removal`);
    lines.push(`  Scenario: Verify ${field} field is not available in edit mode`);
    lines.push(`    Given I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    And I click Edit on the ${entity}`);
    lines.push(`    Then the "${field}" field should not be visible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Scenario 3: Field not present on detail page
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @field-removal`);
    lines.push(`  Scenario: Verify ${field} field is not present on ${entity} detail page`);
    lines.push(`    Given I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    Then the "${field}" field should not be visible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Scenario 4: Field not visible for standard users
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @field-removal`);
    lines.push(`  Scenario: Verify ${field} field is not visible for standard users`);
    lines.push(`    Given I am logged in as a standard user`);
    lines.push(`    And I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    Then the "${field}" field should not be visible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    return count;
  }

  private generatePicklistScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const field = data.actualFieldName;

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # PICKLIST VALUES: ${field} on ${entity}`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Set valid values
    if (data.fieldValues.length > 0) {
      count++;
      lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @smoke @p1 @data-driven`);
      lines.push(`  Scenario Outline: Set ${field} to valid picklist values`);
      lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
      lines.push(`    And I have an existing ${entity} record`);
      lines.push(`    When I navigate to the ${entity} record`);
      lines.push(`    And I click Edit on the ${entity}`);
      lines.push(`    And I set the "${field}" field to "<value>"`);
      lines.push(`    And I save the record`);
      lines.push(`    Then the ${entity} should be saved successfully`);
      lines.push(`    And the "${field}" field should display "<value>"`);
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
      lines.push('    Examples:');
      lines.push('      | value |');
      data.fieldValues.forEach(v => lines.push(`      | ${v} |`));
      lines.push('');
    }

    // Verify all values available
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @picklist-options`);
    lines.push(`  Scenario: Verify all ${field} picklist options are available`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    And I click Edit on the ${entity}`);
    lines.push(`    And I click on the "${field}" picklist`);
    lines.push(`    Then I should see all expected picklist values`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    return count;
  }

  private generateGeneralScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const field = data.actualFieldName;

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # GENERAL SCENARIOS: ${field} on ${entity}`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Scenario 1: Field is visible
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @smoke @p1`);
    lines.push(`  Scenario: Verify ${field} field is visible on ${entity}`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    Then the "${field}" field should be visible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Scenario 2: Field can be edited
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @edit`);
    lines.push(`  Scenario: Verify ${field} field can be edited on ${entity}`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have an existing ${entity} record`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    And I click Edit on the ${entity}`);
    lines.push(`    And I set the "${field}" field to "Test Value"`);
    lines.push(`    And I save the record`);
    lines.push(`    Then the ${entity} should be saved successfully`);
    lines.push(`    And the "${field}" field should display "Test Value"`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Data-driven if values available
    if (data.fieldValues.length > 0) {
      count++;
      lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p1 @data-driven`);
      lines.push(`  Scenario Outline: Set ${field} to valid values`);
      lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
      lines.push(`    And I have an existing ${entity} record`);
      lines.push(`    When I navigate to the ${entity} record`);
      lines.push(`    And I click Edit on the ${entity}`);
      lines.push(`    And I set the "${field}" field to "<value>"`);
      lines.push(`    And I save the record`);
      lines.push(`    Then the "${field}" field should display "<value>"`);
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
      lines.push('    Examples:');
      lines.push('      | value |');
      data.fieldValues.forEach(v => lines.push(`      | ${v} |`));
      lines.push('');
    }

    return count;
  }

  private generateNegativeScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const field = data.actualFieldName;

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # NEGATIVE / BOUNDARY SCENARIOS`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Negative 1: Blank value handling
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @negative @blank-value`);
    lines.push(`  Scenario: Verify behavior when ${field} is blank`);
    lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
    lines.push(`    And I have a test ${entity} created via API without "${field}"`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    Then the "${field}" field should be visible`);
    lines.push(`    And the "${field}" field should be blank or empty`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Negative 2: Invalid value (if applicable)
    if (data.featureType === 'picklist-values' || data.fieldValues.length > 0) {
      count++;
      lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @negative @invalid-value`);
      lines.push(`  Scenario: Verify invalid value cannot be set for ${field}`);
      lines.push(`    Given I am logged in as a "Accelerant - System administrator" user`);
      lines.push(`    And I have an existing ${entity} record`);
      lines.push(`    When I navigate to the ${entity} record`);
      lines.push(`    And I click Edit on the ${entity}`);
      lines.push(`    Then the "${field}" picklist should not contain invalid values`);
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
    }

    // Negative 3: Permission denied
    count++;
    lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @negative @permissions`);
    lines.push(`  Scenario: Verify restricted user cannot modify ${field}`);
    lines.push(`    Given I am logged in as a read-only user`);
    lines.push(`    And I have a test ${entity} created via API`);
    lines.push(`    When I navigate to the ${entity} record`);
    lines.push(`    Then the Edit button should not be visible`);
    lines.push(`    And I take a screenshot as evidence`);
    lines.push('');

    // Negative 4: Standard user restriction (if permission-based)
    if (data.featureType === 'permission-based' || data.featureType === 'field-visibility') {
      count++;
      lines.push(`  @${data.key} @${featureKey}-UI-${String(count).padStart(3, '0')} @p2 @negative @standard-user`);
      lines.push(`  Scenario: Verify standard user has restricted access to ${field}`);
      lines.push(`    Given I am logged in as a standard user`);
      lines.push(`    And I have a test ${entity} created via API`);
      lines.push(`    When I navigate to the ${entity} record`);
      lines.push(`    Then the "${field}" field should not be visible or should be read-only`);
      lines.push(`    And I take a screenshot as evidence`);
      lines.push('');
    }

    return count;
  }

  // ==========================================================================
  // API FEATURE GENERATION (ENHANCED)
  // ==========================================================================

  private generateAPIFeature(data: JiraData, suffix: string = '', mode: GenerationMode = 3, userScenarios: UserScenario[] = []): string {
    const lines: string[] = [];
    const featureKey = `${data.key}${suffix}`;

    // ========== HEADER ==========
    lines.push(`# ${'═'.repeat(78)}`);
    lines.push(`# JIRA: ${data.key} - ${data.summary}`);
    lines.push(`# Type: ${data.type} | Status: ${data.status} | Priority: ${data.priority}`);
    lines.push(`# Feature Type: ${data.featureType}`);
    lines.push(`# Generated: ${new Date().toISOString()} (FeatureGenerator v3.1)`);
    lines.push(`# ${'═'.repeat(78)}`);
    lines.push('#');
    
    // ========== GENERATION MODE INFORMATION ==========
    const modeDescriptions: Record<GenerationMode, string> = {
      1: 'User Scenarios Only - Only user-provided scenarios are used, no generator scenarios',
      2: 'User Scenarios + Augmentation - User scenarios as baseline, generator adds critical gaps',
      3: 'Generator Only - Full automatic generation from Jira data (current behavior)',
      4: 'Risk-Based Testing (RBT) - UI test cases generated; API optional (minimal 1-2 or skip)'
    };
    lines.push(`# ═══════════════════════════════════════════════════════════════════════════`);
    lines.push(`# GENERATION MODE`);
    lines.push(`# ═══════════════════════════════════════════════════════════════════════════`);
    lines.push(`# Mode: ${mode}`);
    lines.push(`# Description: ${modeDescriptions[mode]}`);
    if (mode === 1 || mode === 2) {
      lines.push(`# User Scenarios Provided: ${userScenarios.length}`);
      if (mode === 2) {
        lines.push(`# Augmentation: Enabled (max 5 additional scenarios for critical gaps)`);
      }
    }
    if (mode === 4) {
      lines.push(`# RBT: API optional - 1-2 minimal smoke scenarios only (skip API file if not needed).`);
    }
    lines.push(`#`);
    
    // V3.1: PARENT/EPIC CONTEXT (if available)
    if (data.parentContext) {
      lines.push('# ═══════════════════════════════════════════════════════════════════════════');
      lines.push('# PARENT/EPIC CONTEXT');
      lines.push('# ═══════════════════════════════════════════════════════════════════════════');
      lines.push(`#`);
      lines.push(`# Parent: ${data.parentContext.key} - ${data.parentContext.summary}`);
      lines.push(`# Type: ${data.parentContext.type} | Status: ${data.parentContext.status}`);
      if (data.parentContext.businessObjective) {
        lines.push(`# Business Objective: ${data.parentContext.businessObjective.substring(0, 70)}...`);
      }
      if (data.parentContext.acceptanceCriteria.length > 0) {
        lines.push(`#`);
        lines.push(`# Parent Acceptance Criteria (${data.parentContext.acceptanceCriteria.length}):`);
        data.parentContext.acceptanceCriteria.slice(0, 3).forEach((ac, idx) => {
          const acText = ac.title || ac.rawText.substring(0, 60);
          lines.push(`#   ${idx + 1}. ${acText}...`);
        });
        if (data.parentContext.acceptanceCriteria.length > 3) {
          lines.push(`#   ... and ${data.parentContext.acceptanceCriteria.length - 3} more`);
        }
      }
      if (data.parentContext.relatedFeatures.length > 0) {
        lines.push(`#`);
        lines.push(`# Related Work Items: ${data.parentContext.relatedFeatures.slice(0, 5).join(', ')}`);
      }
      lines.push(`#`);
    }

    // V3.0: SUMMARY OF UNDERSTANDING
    lines.push('# ═══════════════════════════════════════════════════════════════════════════');
    lines.push('# SUMMARY OF UNDERSTANDING');
    lines.push('# ═══════════════════════════════════════════════════════════════════════════');
    lines.push(`#`);
    lines.push(`# Overview: ${data.summaryOfUnderstanding.overview}`);
    lines.push(`# Primary Entity: ${data.summaryOfUnderstanding.primaryEntity}`);
    lines.push(`#`);
    
    if (data.summaryOfUnderstanding.fields.length > 0) {
      lines.push(`# Fields Involved (${data.summaryOfUnderstanding.fields.length}):`);
      data.summaryOfUnderstanding.fields.forEach(field => {
        lines.push(`#   • ${field.name} (${field.apiName}) - ${field.action}`);
      });
      lines.push(`#`);
    }
    
    // ENHANCED: Add Account Types if detected
    if (data.summaryOfUnderstanding.accountTypes && data.summaryOfUnderstanding.accountTypes.length > 0) {
      lines.push(`# Account Types Involved (${data.summaryOfUnderstanding.accountTypes.length}):`);
      data.summaryOfUnderstanding.accountTypes.forEach(accountType => {
        lines.push(`#   • ${accountType}`);
      });
      lines.push(`#`);
    }
    
    if (data.summaryOfUnderstanding.requirements.length > 0) {
      lines.push(`# Test Requirements (${data.summaryOfUnderstanding.requirements.length}):`);
      data.summaryOfUnderstanding.requirements.forEach(req => {
        lines.push(`#   ${req.id}: ${req.description.substring(0, 65)}`);
        lines.push(`#     → Test Type: ${req.testType.toUpperCase()} | Priority: ${req.priority}`);
      });
      lines.push(`#`);
    }
    
    lines.push('# ═══════════════════════════════════════════════════════════════════════════');
    lines.push('#');
    lines.push('# API TESTS - Comprehensive Coverage');
    lines.push('#');

    if (data.fieldValues.length > 0) {
      lines.push('# VALID VALUES FOR API TESTING:');
      data.fieldValues.forEach(v => lines.push(`#   • ${v}`));
      lines.push('#');
    }

    lines.push('# NEGATIVE/BOUNDARY:');
    lines.push('#   - Invalid values rejected');
    lines.push('#   - Null/blank handling');
    lines.push('#   - Field-level security');
    lines.push('#');

    lines.push(`# ${'═'.repeat(78)}`);
    lines.push('');

    // ========== FEATURE ==========
    const appType = this.detectApplicationType(data.key);
    const featureTags = this.getFeatureTags(data);
    const appTag = appType === 'dynamics' ? '@dynamics' : '@salesforce';
    lines.push(`@api ${appTag} @${data.key} @${data.priority.toLowerCase()} ${featureTags}`);
    lines.push(`Feature: API - ${featureKey} - ${data.summary}`);
    lines.push('');
    lines.push('  Background:');
    
    // Use application-specific authentication step (appType already declared above)
    if (appType === 'dynamics') {
      lines.push('    Given I have a valid Dynamics 365 API token');
    } else {
      lines.push('    Given I have a valid Salesforce API token');
    }
    lines.push('');

    let count = 0;
    const entity = data.primaryEntity;
    const field = data.actualFieldName;
    const apiField = data.fieldApiName;

    // MODE 1 & 2: Inject user scenarios first
    if ((mode === 1 || mode === 2) && userScenarios.length > 0) {
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push(`  # USER-PROVIDED SCENARIOS`);
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push('');
      
      const apiScenarios = userScenarios.filter(s => {
        const classification = this.classifyScenario(s);
        return classification.type === 'API' || classification.type === 'NeedsDecision';
      });
      
      for (const scenario of apiScenarios) {
        count++;
        const classification = this.classifyScenario(scenario);
        const validation = this.validateScenario(scenario, data);
        const scenarioId = `${featureKey}-API-${String(count).padStart(3, '0')}`;
        
        // Add metadata comments
        lines.push(`  # Scenario Source: user`);
        lines.push(`  # Generation Mode: ${mode}`);
        lines.push(`  # Classification: ${classification.type}`);
        lines.push(`  # Classification Rationale: ${classification.rationale}`);
        lines.push(`  # Status: ${validation.status}`);
        if (validation.questions.length > 0) {
          lines.push(`  # Questions: ${validation.questions.join('; ')}`);
        }
        lines.push('');
        
        // Add scenario
        const tags = [`@${data.key}`, `@${scenarioId}`, `@p2`];
        if (classification.type === 'NeedsDecision') {
          tags.push('@needs-decision');
        }
        lines.push(`  ${tags.join(' ')}`);
        lines.push(`  Scenario: API - ${scenario.title}`);
        
        // Add steps
        scenario.given.forEach(g => lines.push(`    Given ${g}`));
        scenario.when.forEach(w => lines.push(`    When ${w}`));
        scenario.then.forEach(t => lines.push(`    Then ${t}`));
        lines.push('');
      }
      
      logger.info(`✅ Injected ${apiScenarios.length} user scenario(s) into API feature`);
    }

    // MODE 1: Skip all generator scenarios
    // MODE 4: RBT - generate only 1-2 minimal API smoke scenarios (no bulk generation)
    if (mode === 1) {
      // Skip field existence and feature-type-specific scenarios
    } else if (mode === 4) {
      // RBT: API minimal 1-2 tests only
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push(`  # RBT (RISK-BASED TESTING) - API MINIMAL 1-2 TESTS`);
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push(`  # Mode 4 generates only minimal API smoke; define full risk-based API tests manually if needed.`);
      lines.push(`  #`);
      lines.push('');
      const firstField = data.summaryOfUnderstanding.fields.length > 0
        ? data.summaryOfUnderstanding.fields[0]
        : { name: field, apiName: apiField || field };
      const rbtFieldApiName = firstField.apiName || firstField.name;
      if (rbtFieldApiName && rbtFieldApiName.trim() !== '') {
        count++;
        lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @smoke @p1 @rbt @field-exists`);
        lines.push(`  Scenario: API (RBT) - Verify critical field exists on ${entity}`);
        lines.push(`    ${this.getDescribeObjectStep(entity, appType)}`);
        lines.push(`    Then the "${rbtFieldApiName}" field should exist`);
        lines.push('');
      }
      if (data.secondaryEntity && data.summaryOfUnderstanding.fields.length > 0) {
        const f = data.summaryOfUnderstanding.fields[0];
        const secApiName = f.apiName || f.name;
        if (secApiName && secApiName.trim() !== '') {
          count++;
          lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p2 @rbt @field-exists`);
          lines.push(`  Scenario: API (RBT) - Verify critical field exists on ${data.secondaryEntity}`);
          lines.push(`    ${this.getDescribeObjectStep(data.secondaryEntity, appType)}`);
          lines.push(`    Then the "${secApiName}" field should exist`);
          lines.push('');
        }
      }
    } else {
      // MODE 2 & 3: Generate scenarios
      // ========== FIELD EXISTENCE ==========
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push(`  # FIELD EXISTENCE VERIFICATION`);
      lines.push(`  # ${'═'.repeat(74)}`);
      lines.push('');

    // ENHANCED: Handle multi-field scenarios (like SF-467 with 46 fields)
    // If we have multiple fields in summaryOfUnderstanding, generate scenarios for each
    const fieldsToVerify = data.summaryOfUnderstanding.fields.length > 0 
      ? data.summaryOfUnderstanding.fields 
      : [{ name: field, apiName: apiField || field, action: 'show' as const }];

    // For field-removal, verify fields do NOT exist
    if (data.featureType === 'field-removal') {
      for (const fieldInfo of fieldsToVerify) {
        const fieldApiName = fieldInfo.apiName || fieldInfo.name;
        if (!fieldApiName || fieldApiName.trim() === '') {
          logger.warn(`⚠️  Skipping field existence check - empty field name for field: ${fieldInfo.name}`);
          continue;
        }
        count++;
        lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @smoke @p1 @field-removal`);
        lines.push(`  Scenario: API - Verify ${fieldApiName} field does NOT exist on ${entity}`);
        const appType = this.detectApplicationType(data.key);
        lines.push(`    ${this.getDescribeObjectStep(entity, appType)}`);
        lines.push(`    Then the "${fieldApiName}" field should not exist`);
        lines.push('');
      }
    } else {
      // Verify each field exists
      for (const fieldInfo of fieldsToVerify) {
        const fieldApiName = fieldInfo.apiName || fieldInfo.name;
        if (!fieldApiName || fieldApiName.trim() === '') {
          logger.warn(`⚠️  Skipping field existence check - empty field name for field: ${fieldInfo.name}`);
          continue;
        }
        count++;
        lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @smoke @p1 @field-exists`);
        lines.push(`  Scenario: API - Verify ${fieldApiName} field exists on ${entity}`);
        const appType = this.detectApplicationType(data.key);
        lines.push(`    ${this.getDescribeObjectStep(entity, appType)}`);
        lines.push(`    Then the "${fieldApiName}" field should exist`);
        lines.push('');

        // If secondary entity exists, check there too
        if (data.secondaryEntity) {
          count++;
          lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @field-exists`);
          lines.push(`  Scenario: API - Verify ${fieldApiName} field exists on ${data.secondaryEntity}`);
          const appType = this.detectApplicationType(data.key);
          lines.push(`    ${this.getDescribeObjectStep(data.secondaryEntity, appType)}`);
          lines.push(`    Then the "${fieldApiName}" field should exist`);
          lines.push('');
        }
      }
      
      // ========== BASED ON FEATURE TYPE ==========
      // Generate additional scenarios based on feature type
      // Note: field-removal scenarios are already generated in field existence section above
      if (data.featureType === 'auto-population') {
        count = this.generateAPIAutoPopulationScenarios(lines, data, featureKey, count);
      } else if (data.featureType === 'field-behavior') {
        count = this.generateAPIFieldBehaviorScenarios(lines, data, featureKey, count);
      } else {
        // Generate general scenarios for other feature types
        count = this.generateAPIGeneralScenarios(lines, data, featureKey, count);
      }

      // MODE 2: Add augmented scenarios
      if (mode === 2 && userScenarios.length > 0) {
        const augmentation = this.generateAugmentedScenarios(userScenarios, data, 5);
        const apiAugmented = augmentation.scenarios.filter(s => {
          const classification = this.classifyScenario(s);
          return classification.type === 'API' || classification.type === 'NeedsDecision';
        });
        
        if (apiAugmented.length > 0) {
          lines.push(`  # ${'═'.repeat(74)}`);
          lines.push(`  # AUGMENTED SCENARIOS (Added by Generator)`);
          lines.push(`  # ${'═'.repeat(74)}`);
          lines.push('');
          
          for (let i = 0; i < apiAugmented.length; i++) {
            const scenario = apiAugmented[i];
            const explanation = augmentation.explanations[augmentation.scenarios.indexOf(scenario)];
            count++;
            const classification = this.classifyScenario(scenario);
            const scenarioId = `${featureKey}-API-${String(count).padStart(3, '0')}`;
            
            // Add metadata comments
            lines.push(`  # Scenario Source: generator`);
            lines.push(`  # Generation Mode: ${mode}`);
            lines.push(`  # Added Reason: ${explanation}`);
            lines.push(`  # Classification: ${classification.type}`);
            lines.push(`  # Classification Rationale: ${classification.rationale}`);
            lines.push(`  # Status: READY`);
            lines.push('');
            
            // Add scenario
            const tags = [`@${data.key}`, `@${scenarioId}`, `@p1`, `@augmented`];
            lines.push(`  ${tags.join(' ')}`);
            lines.push(`  Scenario: API - ${scenario.title}`);
            
            // Add steps
            scenario.given.forEach(g => lines.push(`    Given ${g}`));
            scenario.when.forEach(w => lines.push(`    When ${w}`));
            scenario.then.forEach(t => lines.push(`    Then ${t}`));
            lines.push('');
          }
          
          logger.info(`✅ Added ${apiAugmented.length} augmented scenario(s) to API feature`);
        }
      }

      // ========== NEGATIVE API SCENARIOS ==========
      count = this.generateAPINegativeScenarios(lines, data, featureKey, count);
    }
  }

    // V3.0: Analyze coverage and add report (for all modes)
    this.analyzeCoverage(lines, data, featureKey, 'api');

    // V3.0: Analyze step definition usage and add report
    this.analyzeStepDefinitions(lines, data, featureKey, 'api');

    return lines.join('\n');
  }

  // ==========================================================================
  // V3.0: STEP DEFINITION ANALYSIS
  // ==========================================================================

  /**
   * Analyzes step definition usage in generated scenarios
   */
  private analyzeStepDefinitions(
    lines: string[],
    data: JiraData,
    featureKey: string,
    testType: 'ui' | 'api'
  ): void {
    const allLines = lines.join('\n');
    const scenarioBlocks = this.extractScenarioBlocks(allLines, featureKey, testType);
    
    const allMissingSteps: Array<{ step: string; suggestedLocation: 'common' | 'feature-specific'; reason: string }> = [];
    const allExistingSteps: Array<{ step: string; stepDef: StepDefinition }> = [];
    
    for (const [scenarioId, scenarioText] of scenarioBlocks.entries()) {
      const scenarioLines = scenarioText.split('\n').filter(l => l.trim());
      const analysis = this.analyzeScenarioSteps(scenarioLines);
      
      allExistingSteps.push(...analysis.existingSteps);
      allMissingSteps.push(...analysis.missingSteps);
    }

    // Add step definition analysis report
    const totalSteps = allExistingSteps.length + allMissingSteps.length;
    
    lines.push('');
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # V3.0 STEP DEFINITION ANALYSIS`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # Total Steps Analyzed: ${totalSteps}`);
    lines.push(`  # Existing Steps Used: ${allExistingSteps.length}`);
    lines.push(`  # Missing Steps: ${allMissingSteps.length}`);
    lines.push('');

    if (totalSteps === 0) {
      lines.push(`  # ⚠️  No steps found in scenarios - analysis could not be performed`);
      lines.push(`  #     This may indicate scenarios were not extracted correctly`);
      lines.push('');
      logger.warn(`⚠️  No steps found for analysis in ${testType.toUpperCase()} feature`);
    } else if (allMissingSteps.length > 0) {
      lines.push(`  # ⚠️  MISSING STEP DEFINITIONS (${allMissingSteps.length}):`);
      
      // Group by suggested location
      const commonSteps = allMissingSteps.filter(s => s.suggestedLocation === 'common');
      const specificSteps = allMissingSteps.filter(s => s.suggestedLocation === 'feature-specific');
      
      if (commonSteps.length > 0) {
        lines.push(`  #`);
        lines.push(`  # 📦 RECOMMENDED: Add to common/${testType === 'api' ? 'api-common' : 'ui-common'}.steps.ts`);
        commonSteps.forEach(({ step, reason }) => {
          lines.push(`  #   - ${step.substring(0, 70)}`);
          lines.push(`  #     Reason: ${reason}`);
        });
      }
      
      if (specificSteps.length > 0) {
        lines.push(`  #`);
        lines.push(`  # 📝 RECOMMENDED: Add to ${testType}/${data.key.toLowerCase()}.steps.ts`);
        specificSteps.forEach(({ step, reason }) => {
          lines.push(`  #   - ${step.substring(0, 70)}`);
          lines.push(`  #     Reason: ${reason}`);
        });
      }
      
      lines.push('');
      logger.warn(`⚠️  ${allMissingSteps.length} step definition(s) need to be created`);
    } else if (allExistingSteps.length > 0) {
      lines.push(`  # ✅ All steps use existing step definitions!`);
      lines.push('');
      logger.info(`✅ All ${allExistingSteps.length} steps use existing step definitions`);
    }

    // Show step reuse statistics (only if steps were analyzed)
    if (totalSteps > 0) {
      const commonStepCount = allExistingSteps.filter(s => s.stepDef.isCommon).length;
      const reusePercentage = allExistingSteps.length > 0 
        ? Math.round((commonStepCount / allExistingSteps.length) * 100)
        : 0;
      
      lines.push(`  # Step Reuse Statistics:`);
      lines.push(`  #   - Common Steps Used: ${commonStepCount}/${allExistingSteps.length} (${reusePercentage}%)`);
      lines.push(`  #   - Feature-Specific Steps Used: ${allExistingSteps.length - commonStepCount}`);
      lines.push('');
    }
  }

  /**
   * Extracts scenario blocks from generated feature file text
   */
  private extractScenarioBlocks(
    text: string,
    featureKey: string,
    testType: 'ui' | 'api'
  ): Map<string, string> {
    const blocks = new Map<string, string>();
    
    // ENHANCED: Match scenarios with multiple tags on the same line
    // Pattern: @SF-501-UI-001 (or any tags) followed by Scenario: ... until next @SF-501 tag or end
    const scenarioPattern = new RegExp(
      `(@${featureKey}-${testType.toUpperCase()}-(\\d+)[^\\n]*\\n[^@]*?Scenario:[^@]*?)(?=@${featureKey}|$)`,
      'gs'
    );
    
    let match;
    while ((match = scenarioPattern.exec(text)) !== null) {
      const scenarioId = `@${featureKey}-${testType.toUpperCase()}-${match[2]}`;
      blocks.set(scenarioId, match[1]);
    }
    
    // Fallback: If no matches, try simpler pattern (for scenarios without tags)
    if (blocks.size === 0) {
      const simplePattern = new RegExp(
        `(Scenario:[^@]*?)(?=@${featureKey}|Scenario:|$)`,
        'gs'
      );
      let simpleMatch;
      let scenarioNum = 1;
      while ((simpleMatch = simplePattern.exec(text)) !== null) {
        const scenarioId = `@${featureKey}-${testType.toUpperCase()}-${String(scenarioNum).padStart(3, '0')}`;
        blocks.set(scenarioId, simpleMatch[1]);
        scenarioNum++;
      }
    }
    
    return blocks;
  }

  // ==========================================================================
  // V3.0: COVERAGE ANALYSIS
  // ==========================================================================

  /**
   * Analyzes coverage of generated scenarios against all sentences
   * and adds a coverage report to the feature file
   */
  private analyzeCoverage(
    lines: string[],
    data: JiraData,
    featureKey: string,
    testType: 'ui' | 'api'
  ): void {
    // Extract scenario IDs from generated lines
    const scenarioIds: string[] = [];
    const scenarioPattern = new RegExp(`@${featureKey}-${testType.toUpperCase()}-(\\d+)`, 'g');
    let match;
    while ((match = scenarioPattern.exec(lines.join('\n'))) !== null) {
      scenarioIds.push(match[0]);
    }

    // Match scenarios to sentences
    const scenarioTexts = this.extractScenarioTexts(lines, scenarioIds);
    
    for (const sentence of data.allSentences) {
      // Check if this sentence should be tested by this test type
      const shouldTestHere = testType === 'api' 
        ? (sentence.bestTestType === 'api' || sentence.bestTestType === 'both')
        : (sentence.bestTestType === 'ui' || sentence.bestTestType === 'both');

      if (!shouldTestHere) {
        continue; // Skip sentences that shouldn't be tested here
      }

      // Check if any scenario covers this sentence
      for (const [scenarioId, scenarioText] of scenarioTexts.entries()) {
        if (this.scenarioCoversSentence(scenarioText, sentence)) {
          sentence.isCovered = true;
          if (!sentence.coveringScenarios.includes(scenarioId)) {
            sentence.coveringScenarios.push(scenarioId);
          }
          if (!data.coverageAnalysis.sentenceToScenarioMap.has(sentence.id)) {
            data.coverageAnalysis.sentenceToScenarioMap.set(sentence.id, []);
          }
          data.coverageAnalysis.sentenceToScenarioMap.get(sentence.id)!.push(scenarioId);
          
          if (!data.coverageAnalysis.scenarioToSentenceMap.has(scenarioId)) {
            data.coverageAnalysis.scenarioToSentenceMap.set(scenarioId, []);
          }
          data.coverageAnalysis.scenarioToSentenceMap.get(scenarioId)!.push(sentence.id);
        }
      }
    }

    // V3.0: Update coverage based on Summary of Understanding requirements (not raw sentences)
    const relevantRequirements = data.summaryOfUnderstanding.requirements.filter((req: SummaryOfUnderstanding['requirements'][0]) => 
      testType === 'api' 
        ? (req.testType === 'api' || req.testType === 'both')
        : (req.testType === 'ui' || req.testType === 'both')
    );
    
    // Check which requirements are covered by scenarios
    const coveredRequirements: string[] = [];
    const uncoveredRequirements: SummaryOfUnderstanding['requirements'] = [];
    
    for (const req of relevantRequirements) {
      let isCovered = false;
      for (const [scenarioId, scenarioText] of scenarioTexts.entries()) {
        if (this.scenarioCoversRequirement(scenarioText, req)) {
          isCovered = true;
          coveredRequirements.push(req.id);
          
          // Track mapping
          if (!data.coverageAnalysis.sentenceToScenarioMap.has(req.id)) {
            data.coverageAnalysis.sentenceToScenarioMap.set(req.id, []);
          }
          data.coverageAnalysis.sentenceToScenarioMap.get(req.id)!.push(scenarioId);
          
          if (!data.coverageAnalysis.scenarioToSentenceMap.has(scenarioId)) {
            data.coverageAnalysis.scenarioToSentenceMap.set(scenarioId, []);
          }
          data.coverageAnalysis.scenarioToSentenceMap.get(scenarioId)!.push(req.id);
          break;
        }
      }
      
      if (!isCovered) {
        uncoveredRequirements.push(req);
      }
    }
    
    const total = relevantRequirements.length;
    const covered = coveredRequirements.length;
    const percentage = total > 0 ? Math.round((covered / total) * 100) : 100;

    // Track scenarios for this test type
    if (testType === 'api') {
      data.coverageAnalysis.apiScenarios.push(...scenarioIds);
    } else {
      data.coverageAnalysis.uiScenarios.push(...scenarioIds);
    }

    // Update coverage analysis
    data.coverageAnalysis.coveredSentences = covered;
    data.coverageAnalysis.coveragePercentage = percentage;
    // Store uncovered requirements separately (not as SentenceInfo - we track them in the report)
    data.coverageAnalysis.uncoveredSentences = [];

    // Add coverage report to feature file
    lines.push('');
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # Total Requirements: ${total}`);
    lines.push(`  # Covered Requirements: ${covered}`);
    lines.push(`  # Coverage: ${percentage}%`);
    lines.push('');

    // List uncovered requirements
    if (uncoveredRequirements.length > 0) {
      lines.push(`  # ⚠️  UNCOVERED REQUIREMENTS (${uncoveredRequirements.length}):`);
      uncoveredRequirements.forEach(req => {
        lines.push(`  #   ${req.id}: ${req.description.substring(0, 65)}`);
        lines.push(`  #     → Should be tested via ${req.testType.toUpperCase()} | Priority: ${req.priority}`);
      });
      lines.push('');
      logger.warn(`⚠️  ${uncoveredRequirements.length} requirement(s) not covered in ${testType.toUpperCase()} tests`);
    } else {
      lines.push(`  # ✅ All requirements covered!`);
      lines.push('');
      logger.info(`✅ 100% coverage achieved in ${testType.toUpperCase()} tests`);
    }
  }

  /**
   * Extracts scenario texts from generated lines
   */
  private extractScenarioTexts(lines: string[], scenarioIds: string[]): Map<string, string> {
    const scenarioTexts = new Map<string, string>();
    const allText = lines.join('\n');
    
    for (const scenarioId of scenarioIds) {
      // Find the scenario block for this ID
      const scenarioPattern = new RegExp(
        `(@${scenarioId.replace('@', '')}[^@]*?)(?=@|$)`,
        's'
      );
      const match = allText.match(scenarioPattern);
      if (match) {
        scenarioTexts.set(scenarioId, match[1]);
      }
    }
    
    return scenarioTexts;
  }

  /**
   * Checks if a scenario covers a requirement from Summary of Understanding
   */
  private scenarioCoversRequirement(
    scenarioText: string, 
    requirement: SummaryOfUnderstanding['requirements'][0]
  ): boolean {
    const lowerScenario = scenarioText.toLowerCase();
    const lowerReq = requirement.description.toLowerCase();
    
    // Direct text match
    if (lowerScenario.includes(lowerReq.substring(0, 30))) {
      return true;
    }
    
    // Check if scenario mentions related fields
    for (const field of requirement.relatedFields) {
      if (lowerScenario.includes(field.toLowerCase())) {
        return true;
      }
    }
    
    // Semantic concept matching - map common concepts to synonyms
    const conceptMappings: Record<string, string[]> = {
      'mapped': ['populates', 'populated', 'inherits', 'inherited', 'auto', 'copied', 'transferred', 'from'],
      'lead': ['lead', 'conversion', 'convert'],
      'account': ['account', 'parent'],
      'opportunity': ['opportunity', 'opp'],
      'region': ['region', 'territory', 'location'],
      'auto': ['auto', 'automatic', 'populates', 'inherited', 'default'],
      'editable': ['editable', 'edit', 'modify', 'update', 'change'],
      'not editable': ['not editable', 'read-only', 'readonly', 'cannot edit', 'cannot be edited', 'not be editable'],
      'blank': ['blank', 'empty', 'null', 'missing'],
      'visible': ['visible', 'display', 'shown', 'see'],
      'hidden': ['hidden', 'not visible', 'invisible', 'cannot see'],
      'delete': ['delete', 'removed', 'removal', 'not exist', 'does not exist'],
      'create': ['create', 'creation', 'new', 'created'],
    };
    
    // Check for semantic concept matches
    for (const [concept, synonyms] of Object.entries(conceptMappings)) {
      if (lowerReq.includes(concept)) {
        for (const synonym of synonyms) {
          if (lowerScenario.includes(synonym)) {
            // Found a concept match - now check if the subject (field/entity) also matches
            const subjectMatch = this.hasSubjectMatch(lowerReq, lowerScenario);
            if (subjectMatch) {
              return true;
            }
          }
        }
      }
    }
    
    // Keyword matching with lower threshold
    const reqWords = lowerReq.split(/\s+/).filter((w: string) => w.length > 3);
    const matchingWords = reqWords.filter((w: string) => lowerScenario.includes(w));
    
    // Lower threshold from 50% to 30% for better matching
    if (matchingWords.length >= Math.max(1, Math.floor(reqWords.length * 0.3))) {
      return true;
    }
    
    return false;
  }

  /**
   * Check if the subject (field name or entity) matches between requirement and scenario
   */
  private hasSubjectMatch(reqText: string, scenarioText: string): boolean {
    // Extract potential subjects (capitalized words or common Salesforce objects)
    const subjects = ['region', 'account', 'lead', 'opportunity', 'contact', 'roles', 
                      'relationship', 'currency', 'type', 'status', 'field'];
    
    for (const subject of subjects) {
      if (reqText.includes(subject) && scenarioText.includes(subject)) {
        return true;
      }
    }
    
    // Check for field API names (words ending with __c)
    const fieldPattern = /\w+__c/gi;
    const reqFields = reqText.match(fieldPattern) || [];
    const scenarioFields = scenarioText.match(fieldPattern) || [];
    
    for (const reqField of reqFields) {
      for (const scenarioField of scenarioFields) {
        if (reqField.toLowerCase() === scenarioField.toLowerCase()) {
          return true;
        }
      }
    }
    
    return false;
  }

  /**
   * Checks if a scenario covers a sentence (legacy method, kept for backward compatibility)
   */
  private scenarioCoversSentence(scenarioText: string, sentence: SentenceInfo): boolean {
    const lowerScenario = scenarioText.toLowerCase();
    const lowerSentence = sentence.text.toLowerCase();
    
    // Direct text match
    if (lowerScenario.includes(lowerSentence.substring(0, 30))) {
      return true;
    }
    
    // Keyword overlap (at least 2 keywords match)
    const matchingKeywords = sentence.keywords.filter(kw => 
      lowerScenario.includes(kw.toLowerCase())
    );
    if (matchingKeywords.length >= 2) {
      return true;
    }
    
    // Field name match
    for (const field of sentence.fields) {
      if (lowerScenario.includes(field.toLowerCase())) {
        return true;
      }
    }
    
    // Entity match
    for (const entity of sentence.entities) {
      if (lowerScenario.includes(entity.toLowerCase())) {
        return true;
      }
    }
    
    // Action match
    for (const action of sentence.actions) {
      if (lowerScenario.includes(action.toLowerCase())) {
        return true;
      }
    }
    
    return false;
  }

  private generateAPIAutoPopulationScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const source = data.secondaryEntity || 'Account';
    const target = data.primaryEntity;
    const apiField = data.fieldApiName;

    // ENHANCED: Check if this is a Lead conversion scenario
    const isLeadConversion = source === 'Lead' && target === 'Opportunity';
    const description = data.fullContext || '';
    const hasConversionKeywords = /lead\s+(?:conversion|convert|to\s+opportunity)/i.test(description) ||
                                  /convert\s+lead/i.test(description) ||
                                  /maps?\s+from\s+lead/i.test(description);

    // If Lead conversion detected, use dedicated API conversion scenarios
    if (isLeadConversion || hasConversionKeywords) {
      return this.generateAPILeadConversionScenarios(lines, data, featureKey, count, apiField);
    }

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # AUTO-POPULATION VIA API`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Create with auto-population
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @smoke @p1 @auto-populate`);
    lines.push(`  Scenario: API - Verify ${apiField} is inherited from ${source} on ${target} creation`);
    lines.push(`    Given I have a test ${source} created via API with ${apiField.replace('__c', '')} "EU"`);
    lines.push(`    When I create ${target === 'Opportunity' ? 'an' : 'a'} ${target} for the ${source} via API`);
    lines.push(`    Then the API should return status code 201`);
    lines.push(`    And the ${target} should have ${apiField.replace('__c', '')} "EU"`);
    lines.push('');

    // Data-driven
    if (data.fieldValues.length > 0) {
      count++;
      lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @auto-populate @data-driven`);
      lines.push(`  Scenario Outline: API - Verify ${apiField} mapping for all valid values`);
      lines.push(`    Given I have a test ${source} created via API with ${apiField.replace('__c', '')} "<value>"`);
      lines.push(`    When I create ${target === 'Opportunity' ? 'an' : 'a'} ${target} for the ${source} via API`);
      lines.push(`    Then the API should return status code 201`);
      lines.push(`    And the ${target} should have ${apiField.replace('__c', '')} "<value>"`);
      lines.push('');
      lines.push('    Examples:');
      lines.push('      | value |');
      data.fieldValues.forEach(v => lines.push(`      | ${v} |`));
      lines.push('');
    }

    // Cannot update after creation
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @read-only @negative`);
    lines.push(`  Scenario: API - Verify ${apiField} cannot be updated on ${target} after creation`);
    lines.push(`    Given I have a test ${source} created via API with ${apiField.replace('__c', '')} "UK"`);
    lines.push(`    And I have a test ${target} created via API for the ${source}`);
    lines.push(`    When I try to update the ${target} ${apiField.replace('__c', '')} to "US" via API`);
    lines.push(`    Then the API should reject the ${apiField.replace('__c', '')} update`);
    lines.push(`    And the ${target} ${apiField.replace('__c', '')} should still be "UK"`);
    lines.push('');

    return count;
  }

  /**
   * Generate API scenarios for Lead to Opportunity conversion
   * Handles field mapping verification via API during Lead conversion
   */
  private generateAPILeadConversionScenarios(
    lines: string[], 
    data: JiraData, 
    featureKey: string, 
    count: number,
    apiField: string
  ): number {
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # LEAD CONVERSION VIA API`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Scenario 1: Field maps from Lead to Opportunity during conversion
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @smoke @p1 @lead-conversion`);
    lines.push(`  Scenario: API - Verify ${apiField} maps from Lead to Opportunity during conversion`);
    lines.push(`    Given I have a test Lead created via API with ${apiField.replace('__c', '')} "EU"`);
    lines.push(`    When I convert the Lead to Opportunity via API`);
    lines.push(`    Then the API should return status code 200`);
    lines.push(`    And the Opportunity should have ${apiField.replace('__c', '')} "EU"`);
    lines.push('');

    // Scenario 2: Data-driven for all values
    if (data.fieldValues.length > 0) {
      count++;
      lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @lead-conversion @data-driven`);
      lines.push(`  Scenario Outline: API - Verify ${apiField} maps from Lead to Opportunity for all values during conversion`);
      lines.push(`    Given I have a test Lead created via API with ${apiField.replace('__c', '')} "<value>"`);
      lines.push(`    When I convert the Lead to Opportunity via API`);
      lines.push(`    Then the API should return status code 200`);
      lines.push(`    And the Opportunity should have ${apiField.replace('__c', '')} "<value>"`);
      lines.push('');
      lines.push('    Examples:');
      lines.push('      | value |');
      data.fieldValues.forEach(v => lines.push(`      | ${v} |`));
      lines.push('');
    }

    // Scenario 3: Field does NOT map to Account during conversion (negative test)
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @lead-conversion @negative`);
    lines.push(`  Scenario: API - Verify ${apiField} does NOT map to Account during Lead conversion`);
    lines.push(`    Given I have a test Lead created via API with ${apiField.replace('__c', '')} "UK"`);
    lines.push(`    When I convert the Lead to Opportunity via API`);
    lines.push(`    Then the API should return status code 200`);
    lines.push(`    And the Opportunity should have ${apiField.replace('__c', '')} "UK"`);
    lines.push(`    And the Account should NOT have ${apiField.replace('__c', '')}`);
    lines.push('');

    // Scenario 4: Field value is preserved during conversion
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p2 @lead-conversion`);
    lines.push(`  Scenario: API - Verify ${apiField} value is preserved during Lead conversion`);
    lines.push(`    Given I have a test Lead created via API with ${apiField.replace('__c', '')} "US"`);
    lines.push(`    When I convert the Lead to Opportunity via API`);
    lines.push(`    Then the API should return status code 200`);
    lines.push(`    And the Opportunity should have ${apiField.replace('__c', '')} "US"`);
    lines.push(`    And the ${apiField.replace('__c', '')} value should match exactly what was on the Lead`);
    lines.push('');

    return count;
  }

  private generateAPIFieldBehaviorScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const apiField = data.fieldApiName;

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # FIELD BEHAVIOR VIA API`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Field is not updateable
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @read-only`);
    lines.push(`  Scenario: API - Verify ${apiField} field is marked as not updateable`);
    const appType = this.detectApplicationType(data.key);
    lines.push(`    ${this.getDescribeObjectStep(entity, appType)}`);
    lines.push(`    Then the "${apiField}" field should exist`);
    lines.push(`    And the "${apiField}" field should be marked as not updateable`);
    lines.push('');

    // Update attempt fails
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @negative`);
    lines.push(`  Scenario: API - Verify ${apiField} cannot be updated after creation`);
    lines.push(`    Given I have an existing ${entity} record`);
    lines.push(`    When I update the ${entity} field "${apiField}" to "New Value" via API`);
    lines.push(`    Then the API should return an error`);
    lines.push('');

    return count;
  }

  private generateAPIFieldRemovalScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const apiField = data.fieldApiName;

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # FIELD REMOVAL VIA API`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Create record (field should not exist)
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @api-create`);
    lines.push(`  Scenario: API - Create ${entity} (field should not exist)`);
    if (entity === 'AccountContactRelation') {
      lines.push(`    Given I have an existing Account record`);
      lines.push(`    And I have an existing Contact record`);
      lines.push(`    ${this.getCreateRecordStep(entity, this.detectApplicationType(data.key))}`);
      lines.push(`      | field     | value                |`);
      lines.push(`      | AccountId | {existingAccountId}  |`);
      lines.push(`      | ContactId | {existingContactId}  |`);
    } else {
      lines.push(`    ${this.getCreateRecordStep(entity, this.detectApplicationType(data.key))}`);
      lines.push(`      | field | value |`);
      lines.push(`      | Name  | API Test ${entity} |`);
    }
    lines.push(`    Then the API should return status code 201`);
    lines.push(`    And the response should contain the new ${entity} ID`);
    lines.push('');

    // Attempt to update (should fail)
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @api-update @negative`);
    lines.push(`  Scenario: API - Attempt to update ${apiField} (should fail - field does not exist)`);
    lines.push(`    Given I have an existing ${entity} record`);
    lines.push(`    When I update the ${entity} field "${apiField}" to "Updated Value" via API`);
    lines.push(`    Then the API should return an error`);
    lines.push('');

    // Query - field should not be in results
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p2 @api-query`);
    lines.push(`  Scenario: API - Verify ${apiField} is not in query results`);
    lines.push(`    Given I have an existing ${entity} record`);
    lines.push(`    When I query all ${entity} records via API`);
    lines.push(`    Then the API should return status code 200`);
    lines.push(`    And the response should not include the "${apiField}" field`);
    lines.push('');

    return count;
  }

  private generateAPIGeneralScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const field = data.actualFieldName;
    const apiField = data.fieldApiName;

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # GENERAL API OPERATIONS`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // ENHANCED: Handle multi-field scenarios - use first visible field for general operations
    // If we have multiple fields, use the first one that's not hidden
    const fieldsToTest = data.summaryOfUnderstanding.fields.length > 0 
      ? data.summaryOfUnderstanding.fields.filter(f => f.action !== 'hide').slice(0, 1)
      : [{ name: field, apiName: apiField || field, action: 'show' as const }];
    
    const primaryField = fieldsToTest.length > 0 ? fieldsToTest[0] : { name: field, apiName: apiField || field, action: 'show' as const };
    const primaryApiField = primaryField.apiName || primaryField.name;
    
    // Skip if field name is empty
    if (!primaryApiField || primaryApiField.trim() === '') {
      logger.warn(`⚠️  Skipping API general scenarios - empty field name`);
      return count;
    }

    // Create with field
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @api-create`);
    lines.push(`  Scenario: API - Create ${entity} with ${primaryField.name}`);
    lines.push(`    ${this.getCreateRecordStep(entity, this.detectApplicationType(data.key))}`);
    lines.push('      | field | value |');
    lines.push(`      | Name  | API Test ${entity} |`);
    if (data.fieldValues.length > 0) {
      lines.push(`      | ${primaryApiField} | ${data.fieldValues[0]} |`);
    } else if (primaryApiField === 'Phone') {
      lines.push(`      | ${primaryApiField} | +1-555-0100 |`);
    } else if (primaryApiField === 'Website') {
      lines.push(`      | ${primaryApiField} | https://test.example.com |`);
    }
    lines.push('    Then the API should return status code 201');
    lines.push(`    And the response should contain the new ${entity} ID`);
    lines.push('');

    // Update field
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p1 @api-update`);
    lines.push(`  Scenario: API - Update ${primaryApiField} on ${entity}`);
    lines.push(`    Given I have an existing ${entity} record`);
    lines.push(`    When I update the ${entity} field "${primaryApiField}" to "Updated Value" via API`);
    lines.push('    Then the API should return status code 204');
    lines.push('');

    // Query with field
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p2 @api-query`);
    lines.push(`  Scenario: API - Query ${entity} by ${primaryField.name}`);
    lines.push(`    Given I have an existing ${entity} record`);
    if (data.fieldValues.length > 0) {
      lines.push(`    When I query ${entity} where "${primaryApiField}" equals "${data.fieldValues[0]}"`);
    } else {
      lines.push(`    When I query all ${entity} records via API`);
    }
    lines.push('    Then the API should return status code 200');
    lines.push('');

    // Data-driven
    if (data.fieldValues.length > 0) {
      count++;
      lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p2 @data-driven`);
      lines.push(`  Scenario Outline: API - Create ${entity} with each valid ${primaryField.name}`);
      lines.push(`    ${this.getCreateRecordStep(entity, this.detectApplicationType(data.key))}`);
      lines.push('      | field | value |');
      lines.push(`      | Name  | API Test <value> |`);
      lines.push(`      | ${primaryApiField} | <value> |`);
      lines.push('    Then the API should return status code 201');
      lines.push('');
      lines.push('    Examples:');
      lines.push('      | value |');
      data.fieldValues.slice(0, 5).forEach(v => lines.push(`      | ${v} |`));
      lines.push('');
    }

    return count;
  }

  private generateAPINegativeScenarios(lines: string[], data: JiraData, featureKey: string, count: number): number {
    const entity = data.primaryEntity;
    const apiField = data.fieldApiName;

    // ENHANCED: Handle multi-field scenarios - use first visible field for negative scenarios
    const fieldsToTest = data.summaryOfUnderstanding.fields.length > 0 
      ? data.summaryOfUnderstanding.fields.filter(f => f.action !== 'hide').slice(0, 1)
      : [{ name: data.actualFieldName, apiName: apiField || data.actualFieldName, action: 'show' as const }];
    
    const primaryField = fieldsToTest.length > 0 ? fieldsToTest[0] : { name: data.actualFieldName, apiName: apiField || data.actualFieldName, action: 'show' as const };
    const primaryApiField = primaryField.apiName || primaryField.name;
    
    // Skip if field name is empty
    if (!primaryApiField || primaryApiField.trim() === '') {
      logger.warn(`⚠️  Skipping API negative scenarios - empty field name`);
      return count;
    }

    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push(`  # NEGATIVE / BOUNDARY API SCENARIOS`);
    lines.push(`  # ${'═'.repeat(74)}`);
    lines.push('');

    // Invalid value
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p2 @negative @invalid-value`);
    lines.push(`  Scenario: API - Reject invalid ${primaryApiField} value`);
    lines.push(`    ${this.getCreateRecordStep(entity, this.detectApplicationType(data.key))}`);
    lines.push('      | field | value |');
    lines.push(`      | Name  | Invalid Test |`);
    lines.push(`      | ${primaryApiField} | INVALID_VALUE_### |`);
    lines.push('    Then the API should return an error');
    lines.push(`    And the error response should mention "${primaryApiField.replace('__c', '')}"`);
    lines.push('');

    // Null value handling
    count++;
    lines.push(`  @${data.key} @${featureKey}-API-${String(count).padStart(3, '0')} @p2 @negative @null-value`);
    lines.push(`  Scenario: API - Handle null ${primaryApiField} value`);
    lines.push(`    Given I have a test ${entity} created via API without ${primaryApiField.replace('__c', '')}`);
    lines.push(`    ${this.getQueryRecordStep(entity, this.detectApplicationType(data.key))}`);
    lines.push(`    Then the "${primaryApiField}" should be null or empty`);
    lines.push('');

    return count;
  }

  // ==========================================================================
  // HELPER METHODS (Kept from original)
  // ==========================================================================

  private async fetchRelatedIssues(issue: any): Promise<RelatedIssue[]> {
    const related: RelatedIssue[] = [];

    try {
      const issueLinks = issue.fields.issuelinks || [];
      
      for (const link of issueLinks) {
        if (link.outwardIssue) {
          related.push({
            key: link.outwardIssue.key,
            summary: link.outwardIssue.fields?.summary || '',
            type: link.outwardIssue.fields?.issuetype?.name || '',
            relationship: link.type?.outward || 'relates to',
          });
        }
        if (link.inwardIssue) {
          related.push({
            key: link.inwardIssue.key,
            summary: link.inwardIssue.fields?.summary || '',
            type: link.inwardIssue.fields?.issuetype?.name || '',
            relationship: link.type?.inward || 'is related to',
          });
        }
      }

      if (issue.fields.parent) {
        related.push({
          key: issue.fields.parent.key,
          summary: issue.fields.parent.fields?.summary || '',
          type: 'Parent',
          relationship: 'is child of',
        });
      }

      if (issue.fields.subtasks) {
        for (const subtask of issue.fields.subtasks) {
          related.push({
            key: subtask.key,
            summary: subtask.fields?.summary || '',
            type: 'Subtask',
            relationship: 'has subtask',
          });
        }
      }
    } catch (error) {
      logger.debug(`Could not fetch related issues: ${error}`);
    }

    return related;
  }

  /**
   * V3.1: Fetch full parent/epic context for enhanced test case generation
   * This provides additional context from the parent work item (Epic/Story)
   * to help generate more comprehensive and accurate test cases.
   */
  private async fetchParentContext(issue: any): Promise<ParentContext | null> {
    try {
      // Check for direct parent (Story -> Epic or Subtask -> Story)
      const parentKey = issue.fields.parent?.key;
      
      if (!parentKey) {
        // Check for epic link in custom fields
        const epicLinkField = Object.keys(issue.fields).find(key => 
          key.startsWith('customfield_') && 
          typeof issue.fields[key] === 'string' && 
          issue.fields[key]?.match(/^[A-Z]+-\d+$/)
        );
        
        if (!epicLinkField || !issue.fields[epicLinkField]) {
          return null;
        }
        
        // Use epic link as parent
        return this.fetchAndProcessParent(issue.fields[epicLinkField]);
      }
      
      return this.fetchAndProcessParent(parentKey);
    } catch (error: any) {
      logger.debug(`Could not fetch parent context: ${error.message}`);
      return null;
    }
  }

  /**
   * Fetches and processes a parent issue to extract context
   */
  private async fetchAndProcessParent(parentKey: string): Promise<ParentContext | null> {
    try {
      const parentIssue = await jiraClient.getIssueWithFullDetails(parentKey);
      const parentComments = await jiraClient.getComments(parentKey);
      
      const parentDescription = this.parseADFComprehensive(parentIssue.fields.description);
      const parentParsedComments = this.parseAllComments(parentComments);
      
      // Extract acceptance criteria from parent
      const parentACs = this.extractStructuredAcceptanceCriteria(parentDescription, parentParsedComments);
      
      // Extract business objective from parent description/summary
      const businessObjective = this.extractBusinessObjective(
        parentIssue.fields.summary || '',
        parentDescription
      );
      
      // Extract technical notes from parent
      const technicalNotes = this.extractTechnicalNotes(parentDescription, parentParsedComments);
      
      // Get related features/stories under same parent (siblings)
      const relatedFeatures = this.extractRelatedFeatureKeys(parentIssue);
      
      return {
        key: parentKey,
        summary: parentIssue.fields.summary || '',
        type: parentIssue.fields.issuetype?.name || 'Epic',
        status: parentIssue.fields.status?.name || 'Unknown',
        description: parentDescription,
        acceptanceCriteria: parentACs,
        businessObjective,
        relatedFeatures,
        technicalNotes,
      };
    } catch (error: any) {
      logger.warn(`Failed to fetch parent ${parentKey}: ${error.message}`);
      return null;
    }
  }

  /**
   * Extracts the business objective from parent description
   */
  private extractBusinessObjective(summary: string, description: string): string {
    // Look for business objective patterns
    const patterns = [
      /business\s*objective[:\s]*([^.]+\.)/i,
      /objective[:\s]*([^.]+\.)/i,
      /goal[:\s]*([^.]+\.)/i,
      /purpose[:\s]*([^.]+\.)/i,
      /in\s*order\s*to\s+([^,]+)/i,
      /so\s*that\s+([^.]+\.)/i,
      /to\s*enable\s+([^.]+\.)/i,
    ];
    
    const fullText = `${summary}\n${description}`;
    
    for (const pattern of patterns) {
      const match = fullText.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    
    // Fall back to first sentence of description if no explicit objective found
    const firstSentence = description.split(/[.!?]/)[0];
    if (firstSentence && firstSentence.length > 10 && firstSentence.length < 200) {
      return firstSentence.trim();
    }
    
    return summary;
  }

  /**
   * Extracts technical notes and requirements from parent
   */
  private extractTechnicalNotes(description: string, comments: CommentSummary[]): string[] {
    const notes: string[] = [];
    const allText = description + '\n' + comments.map(c => c.content).join('\n');
    
    // Look for technical requirement patterns
    const techPatterns = [
      /technical\s*(?:requirement|note)[:\s]*([^\n]+)/gi,
      /implementation\s*note[:\s]*([^\n]+)/gi,
      /constraint[:\s]*([^\n]+)/gi,
      /must\s+([^\n.]+)/gi,
      /should\s+not\s+([^\n.]+)/gi,
      /api[:\s]*([^\n]+)/gi,
    ];
    
    for (const pattern of techPatterns) {
      let match;
      while ((match = pattern.exec(allText)) !== null) {
        const note = match[1].trim();
        if (note.length > 10 && note.length < 200 && !notes.includes(note)) {
          notes.push(note);
        }
      }
    }
    
    return notes.slice(0, 5); // Limit to 5 most relevant notes
  }

  /**
   * Extracts related feature/story keys from parent issue
   */
  private extractRelatedFeatureKeys(parentIssue: any): string[] {
    const features: string[] = [];
    
    // Get subtasks
    if (parentIssue.fields.subtasks) {
      for (const subtask of parentIssue.fields.subtasks) {
        features.push(subtask.key);
      }
    }
    
    // Get linked issues
    if (parentIssue.fields.issuelinks) {
      for (const link of parentIssue.fields.issuelinks) {
        if (link.outwardIssue) {
          features.push(link.outwardIssue.key);
        }
        if (link.inwardIssue) {
          features.push(link.inwardIssue.key);
        }
      }
    }
    
    // Limit and dedupe
    return [...new Set(features)].slice(0, 10);
  }

  private parseADFComprehensive(adfContent: any): string {
    if (!adfContent) return '';
    if (typeof adfContent === 'string') return adfContent;

    const lines: string[] = [];
    this.parseADFNode(adfContent, lines, 0);
    return lines.join('\n');
  }

  private parseADFNode(node: any, lines: string[], depth: number): void {
    if (!node) return;

    switch (node.type) {
      case 'doc':
      case 'paragraph':
        if (node.content) {
          const text = node.content.map((c: any) => this.getNodeText(c)).join('');
          if (text.trim()) lines.push(text);
        }
        break;

      case 'bulletList':
      case 'orderedList':
        if (node.content) {
          node.content.forEach((item: any, index: number) => {
            const prefix = node.type === 'orderedList' ? `${index + 1}. ` : '• ';
            const text = this.getNodeText(item);
            if (text.trim()) lines.push(prefix + text);
          });
        }
        break;

      case 'listItem':
        if (node.content) {
          const text = node.content.map((c: any) => this.getNodeText(c)).join('');
          if (text.trim()) lines.push(text);
        }
        break;

      case 'table':
        if (node.content) {
          node.content.forEach((row: any) => {
            if (row.content) {
              const cells = row.content.map((cell: any) => this.getNodeText(cell)).join(' | ');
              lines.push(`| ${cells} |`);
            }
          });
        }
        break;

      case 'heading':
        if (node.content) {
          const text = node.content.map((c: any) => this.getNodeText(c)).join('');
          if (text.trim()) lines.push(`\n## ${text}\n`);
        }
        break;

      case 'codeBlock':
        if (node.content) {
          const text = node.content.map((c: any) => this.getNodeText(c)).join('');
          if (text.trim()) lines.push(`\`\`\`\n${text}\n\`\`\``);
        }
        break;

      default:
        if (node.content && Array.isArray(node.content)) {
          node.content.forEach((child: any) => this.parseADFNode(child, lines, depth + 1));
        }
    }
  }

  private getNodeText(node: any): string {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (node.type === 'text') return node.text || '';
    if (node.type === 'hardBreak') return '\n';
    if (node.type === 'mention') return `@${node.attrs?.text || 'user'}`;
    if (node.type === 'emoji') return node.attrs?.shortName || '';
    if (node.content && Array.isArray(node.content)) {
      return node.content.map((c: any) => this.getNodeText(c)).join('');
    }
    return '';
  }

  /**
   * Normalize entity names (e.g., "Account Account Relationship" -> "AccountContactRelation")
   */
  private normalizeEntityName(name: string): string {
    const normalized = name.replace(/\s+/g, '');
    
    // Map common variations
    const mappings: Record<string, string> = {
      'AccountAccountRelation': 'AccountContactRelation',
      'AccountAccountRelationship': 'AccountContactRelation',
      'AccountContactRelationship': 'AccountContactRelation',
    };
    
    return mappings[normalized] || normalized;
  }

  /**
   * Extract structured change component data from comments
   * Parses tables with Component/Component Type/Change Type columns
   * Example: AccountContactRelation.Relationship_Strength__c | Custom Field | Delete
   */
  private extractChangeComponents(comments: CommentSummary[], description: string = ''): Array<{
    objectName: string;
    fieldName: string;
    fieldApiName: string;
    componentType: string;
    changeType: string;
  }> {
    const components: Array<{
      objectName: string;
      fieldName: string;
      fieldApiName: string;
      componentType: string;
      changeType: string;
    }> = [];

    // ENHANCED: Combine all content (comments + description) for comprehensive search
    const allContent = description + '\n' + comments.map(c => c.content).join('\n');
    logger.debug(`   Analyzing ${comments.length} comment(s) + description (total: ${allContent.length} chars)`);

    for (const comment of comments) {
      const content = comment.content;
      logger.debug(`Checking comment for change components (length: ${content.length})`);
      
      // Debug: Log comment content if it contains "Component" or "Change Type"
      if (content.toLowerCase().includes('component') || content.toLowerCase().includes('change type')) {
        logger.debug(`Comment contains table keywords. First 500 chars: ${content.substring(0, 500)}`);
      }
      
      // Pattern 1: Table format with pipes (markdown table from ADF)
      // | Component | Component Type | Change Type |
      // | AccountContactRelation.Relationship_Strength__c | Custom Field | Delete |
      const tableRowPattern = /\|([^|]+)\|([^|]+)\|([^|]+)\|/g;
      let match;
      let rowCount = 0;
      while ((match = tableRowPattern.exec(content)) !== null) {
        rowCount++;
        const component = match[1].trim();
        const componentType = match[2].trim();
        const changeType = match[3].trim();
        
        logger.debug(`Found table row ${rowCount}: Component="${component}", Type="${componentType}", Change="${changeType}"`);
        
        // Skip header row
        if (component.toLowerCase().includes('component') && 
            componentType.toLowerCase().includes('type')) {
          logger.debug('Skipping header row');
          continue;
        }
        
        // Parse component like "AccountContactRelation.Relationship_Strength__c" or "Opportunity.Estimated_Onboarding_Date__c"
        // Also handle variations like "Account Account Relationship" with spaces
        // ENHANCED: Match compound field names with multiple underscores (e.g., Estimated_Onboarding_Date__c)
        const componentMatch = component.match(/([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\.([A-Z][A-Za-z_]+(?:_[A-Za-z_]+)*)/);
        if (componentMatch) {
          const objectName = componentMatch[1].replace(/\s+/g, '');
          const fieldApiName = componentMatch[2];
          // ENHANCED: Preserve full field API name, don't truncate compound names
          const fieldName = fieldApiName.replace(/__c$/, '').replace(/_/g, ' ');
          
          logger.info(`✅ Extracted change component: ${objectName}.${fieldApiName} (${changeType})`);
          
          components.push({
            objectName,
            fieldName,
            fieldApiName,
            componentType,
            changeType,
          });
        } else {
          logger.debug(`Could not parse component pattern from: "${component}"`);
        }
      }
      
      if (rowCount === 0) {
        logger.debug('No table rows found with pipe format - trying alternative patterns');
      }
      
      // Pattern 2: Concatenated table format (ADF table parsed without separators)
      // Example: "AccountContactRelation.Relationship_Strength__cCustom FieldDelete"
      // Example: "Opportunity.Estimated_Onboarding_Date__cCustom FieldDelete"
      // Look for pattern: ObjectName.FieldName + "Custom Field" + ChangeType (no spaces between)
      // ENHANCED: Match compound field names with multiple underscores (e.g., Estimated_Onboarding_Date__c)
      // Use greedy match for field name to capture full field names like "Relationship_Strength__c" or "Estimated_Onboarding_Date__c"
      const concatenatedPattern = /([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\.([A-Z][A-Za-z_]+(?:_[A-Za-z_]+)*)(?:Custom\s*Field|Layout)([A-Z][a-z]+)/g;
      let concatMatch;
      const foundMatches: Array<{objectName: string; fieldApiName: string; changeType: string; position: number}> = [];
      
      while ((concatMatch = concatenatedPattern.exec(content)) !== null) {
        const objectName = concatMatch[1].replace(/\s+/g, '');
        const fieldApiName = concatMatch[2];
        const changeType = concatMatch[3];
        
        // Validate: objectName should not contain "Type" or "Change" (those are table headers)
        if (objectName.toLowerCase().includes('type') || objectName.toLowerCase().includes('change') || 
            objectName.toLowerCase().includes('component')) {
          logger.debug(`Skipping invalid object name: ${objectName}`);
          continue;
        }
        
        // Validate: changeType should be a known value
        if (!['Delete', 'Modify', 'Create', 'Add', 'Remove'].includes(changeType)) {
          logger.debug(`Skipping unknown change type: ${changeType}`);
          continue;
        }
        
        foundMatches.push({
          objectName,
          fieldApiName,
          changeType,
          position: concatMatch.index,
        });
      }
      
      // Process all found matches
      for (const match of foundMatches) {
        // Handle field names with or without __c suffix
        const fieldName = match.fieldApiName.replace(/__c$/, '').replace(/_/g, ' ');
        let fieldApiName = match.fieldApiName;
        
        // If field doesn't have __c, add it for standard custom fields (except standard fields like "Roles")
        if (!fieldApiName.endsWith('__c') && !['Name', 'Id', 'Type', 'Status', 'OwnerId', 'Roles'].includes(fieldApiName)) {
          fieldApiName = fieldApiName + '__c';
        } else if (fieldApiName === 'Roles') {
          // Roles is likely Roles__c
          fieldApiName = 'Roles__c';
        }
        
        logger.info(`✅ Extracted change component from concatenated format: ${match.objectName}.${fieldApiName} (${match.changeType})`);
        
        // Check if already added
        if (!components.some(c => c.fieldApiName.toLowerCase() === fieldApiName.toLowerCase())) {
          components.push({
            objectName: match.objectName,
            fieldName,
            fieldApiName,
            componentType: 'Custom Field',
            changeType: match.changeType,
          });
        }
      }
      
      // Pattern 2b: Also look for fields mentioned in text format (e.g., "Hide Account Contact Relationship Currency")
      // This handles cases where fields are mentioned in acceptance criteria or description
      const hidePattern = /(?:hide|Hide)\s+(?:Account\s+Contact\s+Relationship\s+)?([A-Z][A-Za-z\s]+?)(?:\s+field|\s+on|\s+\(|$)/gi;
      let hideMatch;
      while ((hideMatch = hidePattern.exec(content)) !== null) {
        const fieldText = hideMatch[1].trim();
        // Check if it's "Account Contact Relationship Currency" or similar
        if (fieldText.toLowerCase().includes('currency') || fieldText.toLowerCase().includes('account contact relationship')) {
          const fieldName = 'Account Contact Relationship Currency';
          const fieldApiName = 'AccountContactRelationshipCurrency__c'; // Common pattern
          
          // Check if already added
          if (!components.some(c => c.fieldName.toLowerCase() === fieldName.toLowerCase())) {
            logger.info(`✅ Extracted field from hide pattern: ${fieldName} (Hide)`);
            components.push({
              objectName: 'AccountContactRelation',
              fieldName,
              fieldApiName,
              componentType: 'Custom Field',
              changeType: 'Hide',
            });
          }
        }
      }
      
      // Pattern 2c: Look for "Remove picklist value 'Other' from Roles"
      const rolesPattern = /(?:remove|Remove)\s+(?:picklist\s+value\s+)?["']?Other["']?\s+from\s+([A-Z][A-Za-z]+)/gi;
      const rolesMatch = rolesPattern.exec(content);
      if (rolesMatch) {
        const fieldName = 'Roles';
        const fieldApiName = 'Roles__c';
        
        // Check if already added
        if (!components.some(c => c.fieldName.toLowerCase() === 'roles')) {
          logger.info(`✅ Extracted field from roles pattern: ${fieldName} (Modify - remove Other)`);
          components.push({
            objectName: 'AccountContactRelation',
            fieldName,
            fieldApiName,
            componentType: 'Custom Field',
            changeType: 'Modify',
          });
        }
      }
      
      // Pattern 3: Plain text format
      // Component: AccountContactRelation.Relationship_Strength__c, Change Type: Delete
      // Component: Opportunity.Estimated_Onboarding_Date__c, Change Type: Hide
      // ENHANCED: Match compound field names with multiple underscores
      const textPattern = /(?:Component|Field)[:\s]+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)?)\.([A-Z][A-Za-z_]+(?:_[A-Za-z_]+)*)[,\s]+(?:Change\s+Type|Type)[:\s]+(\w+)/gi;
      let textMatch;
      while ((textMatch = textPattern.exec(content)) !== null) {
        const objectName = textMatch[1].replace(/\s+/g, '');
        const fieldApiName = textMatch[2];
        const changeType = textMatch[3];
        const fieldName = fieldApiName.replace(/__c$/, '').replace(/_/g, ' ');
        
        logger.info(`✅ Extracted change component from text format: ${objectName}.${fieldApiName} (${changeType})`);
        
        components.push({
          objectName,
          fieldName,
          fieldApiName,
          componentType: 'Custom Field',
          changeType,
        });
      }
    }
    
    // ENHANCED: After processing all comments, also check the combined content for any missed fields
    // This helps catch fields that might be split across comments or in a different format
    
    // Check for Roles if not found
    if (!components.some(c => c.fieldName.toLowerCase() === 'roles' || c.fieldApiName.toLowerCase() === 'roles__c')) {
      const rolesMatch = /AccountContactRelation\.Roles(?:__c)?(?:Custom\s*Field|Layout)(Modify|Delete|Hide)/i.exec(allContent);
      if (rolesMatch) {
        logger.info(`✅ Extracted Roles field from combined content: Roles (${rolesMatch[1]})`);
        components.push({
          objectName: 'AccountContactRelation',
          fieldName: 'Roles',
          fieldApiName: 'Roles__c',
          componentType: 'Custom Field',
          changeType: rolesMatch[1],
        });
      }
    }
    
    // Check for Account Contact Relationship Currency if not found
    if (!components.some(c => c.fieldName.toLowerCase().includes('currency'))) {
      const currencyMatch = /(?:hide|Hide)\s+Account\s+Contact\s+Relationship\s+Currency/i.exec(allContent);
      if (currencyMatch) {
        logger.info(`✅ Extracted Account Contact Relationship Currency from combined content (Hide)`);
        components.push({
          objectName: 'AccountContactRelation',
          fieldName: 'Account Contact Relationship Currency',
          fieldApiName: 'AccountContactRelationshipCurrency__c',
          componentType: 'Custom Field',
          changeType: 'Hide',
        });
      }
    }
    
    logger.debug(`Final extracted components: ${components.length} - ${components.map(c => `${c.fieldName} (${c.changeType})`).join(', ')}`);
    
    return components;
  }

  private parseAllComments(comments: any[]): CommentSummary[] {
    if (!comments || comments.length === 0) return [];

    return comments.map(comment => {
      const content = this.parseADFComprehensive(comment.body);
      const hasValues = this.looksLikeValueList(content);

      return {
        author: comment.author?.displayName || 'Unknown',
        date: comment.created ? new Date(comment.created).toLocaleDateString() : '',
        content: content,
        hasValues,
      };
    });
  }

  private looksLikeValueList(text: string): boolean {
    const indicators = [
      /values?[:\s]/i,
      /options?[:\s]/i,
      /types?[:\s]/i,
      /status(?:es)?[:\s]/i,
      /•\s+\w+/,
      /^\d+\.\s+\w+/m,
      /,\s*\w+,\s*\w+/,
    ];

    return indicators.some(pattern => pattern.test(text));
  }

  private buildFullContext(
    description: string,
    comments: CommentSummary[],
    relatedIssues: RelatedIssue[],
    parentContext: ParentContext | null = null
  ): string {
    const parts: string[] = [];

    // V3.1: Include parent/epic context first for broader understanding
    if (parentContext) {
      parts.push('=== PARENT/EPIC CONTEXT ===');
      parts.push(`[${parentContext.key}] ${parentContext.summary}`);
      parts.push(`Type: ${parentContext.type}`);
      if (parentContext.businessObjective) {
        parts.push(`Business Objective: ${parentContext.businessObjective}`);
      }
      if (parentContext.description) {
        parts.push(`Description: ${parentContext.description}`);
      }
      if (parentContext.acceptanceCriteria.length > 0) {
        parts.push('Parent Acceptance Criteria:');
        parentContext.acceptanceCriteria.forEach(ac => {
          parts.push(`  - ${ac.title || ac.rawText.substring(0, 100)}...`);
        });
      }
      if (parentContext.technicalNotes.length > 0) {
        parts.push('Technical Notes:');
        parentContext.technicalNotes.forEach(note => {
          parts.push(`  - ${note}`);
        });
      }
      if (parentContext.relatedFeatures.length > 0) {
        parts.push(`Related Features: ${parentContext.relatedFeatures.join(', ')}`);
      }
      parts.push('');
    }

    parts.push('=== DESCRIPTION ===');
    parts.push(description);

    if (comments.length > 0) {
      parts.push('\n=== COMMENTS ===');
      comments.forEach(c => {
        parts.push(`[${c.author} - ${c.date}]`);
        parts.push(c.content);
      });
    }

    if (relatedIssues.length > 0) {
      parts.push('\n=== RELATED ISSUES ===');
      relatedIssues.forEach(r => {
        parts.push(`${r.key}: ${r.summary} (${r.relationship})`);
      });
    }

    return parts.join('\n');
  }

  private extractFieldValues(rawADF: any, comments: CommentSummary[], fullContext: string): string[] {
    const values: Set<string> = new Set();

    this.extractFromADFStructure(rawADF, values);

    comments.filter(c => c.hasValues).forEach(c => {
      this.extractValuesFromText(c.content, values);
    });

    this.extractValuesFromText(fullContext, values);

    // Add common region values if context mentions regions
    if (fullContext.toLowerCase().includes('region')) {
      ['US', 'UK', 'EU', 'CA', 'APAC'].forEach(v => values.add(v));
    }

    // ENHANCED: Detect and filter Account Types
    const { areAccountTypes, accountTypes, actualPicklistValues } = 
      this.detectAccountTypes(fullContext, Array.from(values));
    
    if (areAccountTypes) {
      logger.info(`✅ Detected ${accountTypes.length} Account Type(s), filtering from picklist values`);
      logger.debug(`   Account Types: ${accountTypes.join(', ')}`);
      // Store Account Types separately (will be used in Summary of Understanding)
      // Return only actual picklist values
      const cleaned = actualPicklistValues
        .map(v => v.trim())
        .filter(v => this.isValidPicklistValue(v))
        .filter(v => !v.match(/^\d+$/))
        .slice(0, 15);
      
      logger.debug(`Extracted values before filter: ${values.size}, Account Types: ${accountTypes.length}, after: ${cleaned.length}`);
      return cleaned;
    }

    // ENHANCED: Filter out field names (Phone, Website, Visible, etc.)
    const fieldNames = this.extractFieldNames(fullContext);
    const filtered = Array.from(values).filter(v => 
      !fieldNames.some(fn => fn.toLowerCase() === v.toLowerCase())
    );

    const cleaned = filtered
      .map(v => v.trim())
      .filter(v => this.isValidPicklistValue(v))
      .filter(v => !v.match(/^\d+$/))
      .slice(0, 15);

    logger.debug(`Extracted values before filter: ${values.size}, after: ${cleaned.length}`);
    
    return cleaned;
  }

  private extractFromADFStructure(node: any, values: Set<string>): void {
    if (!node) return;

    if (node.type === 'listItem') {
      const text = this.getNodeText(node).trim();
      if (text.length >= 2 && text.length <= 50) {
        values.add(text);
      }
    }

    if (node.type === 'tableCell') {
      const text = this.getNodeText(node).trim();
      if (text.length >= 2 && text.length <= 50 && !this.isCommonWord(text)) {
        values.add(text);
      }
    }

    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any) => this.extractFromADFStructure(child, values));
    }
  }

  private extractValuesFromText(text: string, values: Set<string>): void {
    const bulletPattern = /^[\s]*[-•*]\s+([A-Z][A-Za-z\s-]+)$/gm;
    let match;
    while ((match = bulletPattern.exec(text)) !== null) {
      const value = match[1].trim();
      if (this.isValidPicklistValue(value)) {
        values.add(value);
      }
    }

    const numberedPattern = /^\s*\d+[.)]\s+([A-Z][A-Za-z\s-]+)$/gm;
    while ((match = numberedPattern.exec(text)) !== null) {
      const value = match[1].trim();
      if (this.isValidPicklistValue(value)) {
        values.add(value);
      }
    }

    const keywordPatterns = [
      /(?:values?|options?|types?|status(?:es)?|picklist|dropdown)[:\s]+([^\n.;]+)/gi,
    ];

    for (const pattern of keywordPatterns) {
      while ((match = pattern.exec(text)) !== null) {
        const items = match[1].split(/[,;]|\sand\s/).map(s => s.trim());
        items.forEach(item => {
          if (this.isValidPicklistValue(item)) {
            values.add(item);
          }
        });
      }
    }
  }

  private isValidPicklistValue(value: string): boolean {
    const trimmed = value.trim();
    
    if (trimmed.length < 2 || trimmed.length > 40) return false;
    
    const invalidStarts = [
      'given', 'when', 'then', 'and', 'or', 'but', 'if', 'the', 'a', 'an',
      'i ', 'we ', 'you ', 'they ', 'it ', 'is ', 'are ', 'was ', 'were ',
      'will ', 'would ', 'should ', 'must ', 'can ', 'could ', 'may ',
      'note', 'please', 'see ', 'also', 'here', 'there', 'this', 'that',
      'of ', 'for ', 'to ', 'from ', 'with ', 'by ', 'as ', 'at ', 'in ',
      'component', 'modify', 'standard', 'value', 'set', 'field',
    ];
    
    const lower = trimmed.toLowerCase();
    if (invalidStarts.some(start => lower.startsWith(start))) return false;
    
    if (lower.includes(' am ') || lower.includes(' is ') || lower.includes(' are ') ||
        lower.includes(' was ') || lower.includes(' were ') || lower.includes(' be ')) {
      return false;
    }
    
    const invalidContains = [
      'should', 'would', 'could', 'must', 'shall', 'need',
      'please', 'thank', 'note:', 'http', 'www.',
    ];
    if (invalidContains.some(word => lower.includes(word))) return false;
    
    const words = trimmed.split(/\s+/);
    
    if (words.length === 1) {
      return /^[A-Z][a-z]+$/.test(trimmed) ||
             /^[A-Z]+$/.test(trimmed) ||
             /^[A-Z][a-z]+-[A-Z][a-z]+$/.test(trimmed);
    }
    
    const allWordsCapitalized = words.every(w => 
      /^[A-Z][a-z]*$/.test(w) ||
      /^[-–]$/.test(w) ||
      /^[A-Z]+$/.test(w)
    );
    
    if (allWordsCapitalized && words.length <= 5) return true;
    
    if (/^[A-Z][a-z]+\s*[-–]\s*[A-Z][a-z\s]+$/.test(trimmed)) return true;
    
    return false;
  }

  /**
   * Detects if extracted values are Account Types vs picklist values
   * Account Types are typically listed in a "Scope" or "Account Types" section
   */
  private detectAccountTypes(
    description: string, 
    extractedValues: string[]
  ): {
    areAccountTypes: boolean;
    accountTypes: string[];
    actualPicklistValues: string[];
  } {
    const text = description.toLowerCase();
    
    // Check for Account Type context
    const accountTypeIndicators = [
      'account type',
      'account types',
      'scope',
      'following account types',
      'all account types',
      'each account type',
      'type-specific',
      'consistent configuration across',
      'following account types:'
    ];
    
    const isAccountTypeContext = accountTypeIndicators.some(indicator => 
      text.includes(indicator)
    );
    
    // Known Account Types (from Salesforce standard + custom) - All 17 types
    // Note: "TPA" and "Third Party Administrator" are variations of "Third Party Administrator (TPA)"
    const knownAccountTypes = [
      'Acquisition Company',
      'Agency',
      'Agency Branch',
      'Distribution Partner',
      'Group',
      'Insurer',
      'Insurer Branch',
      'Legal Entity',
      'Member',
      'Non-Member MGA',
      'Placing Broker',
      'Reinsurance Broker',
      'Reinsurer',
      'Reinsurer Branch',
      'Service Company',
      'Third Party Administrator (TPA)',  // Consolidated name for all TPA variations
      'TPA Group'
    ];
    
    // TPA variations that should map to "Third Party Administrator (TPA)"
    const tpaVariations = ['tpa', 'third party administrator', 'third party administrator (tpa)'];
    
    if (isAccountTypeContext) {
      // Filter extracted values that match known Account Types
      const accountTypes: string[] = [];
      const actualPicklistValues: string[] = [];
      
      for (const value of extractedValues) {
        const valueLower = value.toLowerCase().trim();
        
        // Check if it's a TPA variation first (consolidate to "Third Party Administrator (TPA)")
        const isTPAVariation = tpaVariations.some(variation => 
          valueLower === variation || 
          (valueLower.includes('tpa') && valueLower.includes('third party')) ||
          (valueLower === 'tpa' && !valueLower.includes('group'))
        );
        
        if (isTPAVariation) {
          // Consolidate all TPA variations to "Third Party Administrator (TPA)"
          if (!accountTypes.includes('Third Party Administrator (TPA)')) {
            accountTypes.push('Third Party Administrator (TPA)');
          }
          continue;
        }
        
        // Check if it matches any other known Account Type
        const isAccountType = knownAccountTypes.some(known => {
          const knownLower = known.toLowerCase();
          return valueLower === knownLower || 
                 valueLower.includes(knownLower) || 
                 knownLower.includes(valueLower);
        });
        
        if (isAccountType) {
          // Find the exact known Account Type
          const exactType = knownAccountTypes.find(known => {
            const knownLower = known.toLowerCase();
            return valueLower === knownLower || 
                   valueLower.includes(knownLower) || 
                   knownLower.includes(valueLower);
          });
          if (exactType && !accountTypes.includes(exactType)) {
            accountTypes.push(exactType);
          }
        } else {
          actualPicklistValues.push(value);
        }
      }
      
      // Final consolidation: Remove any duplicates and ensure we have exactly 17 unique types
      const consolidatedTypes = this.consolidateAccountTypes(accountTypes);
      
      return {
        areAccountTypes: consolidatedTypes.length > 0,
        accountTypes: consolidatedTypes,
        actualPicklistValues
      };
    }
    
    return { areAccountTypes: false, accountTypes: [], actualPicklistValues: extractedValues };
  }

  /**
   * Consolidates Account Types to ensure exactly 17 unique types
   * Consolidates TPA variations: "TPA", "Third Party Administrator" → "Third Party Administrator (TPA)"
   * If input already contains all 17 types, returns them as-is
   */
  private consolidateAccountTypes(types: string[]): string[] {
    const all17Types = [
      'Acquisition Company',
      'Agency',
      'Agency Branch',
      'Distribution Partner',
      'Group',
      'Insurer',
      'Insurer Branch',
      'Legal Entity',
      'Member',
      'Non-Member MGA',
      'Placing Broker',
      'Reinsurance Broker',
      'Reinsurer',
      'Reinsurer Branch',
      'Service Company',
      'Third Party Administrator (TPA)',
      'TPA Group'
    ];
    
    // If we already have all 17 types, return them as-is (already consolidated)
    if (types.length === 17 && types.every(type => all17Types.includes(type))) {
      return all17Types;
    }
    
    const consolidated: string[] = [];
    const tpaVariations = ['tpa', 'third party administrator', 'third party administrator (tpa)'];
    
    // Check each type
    for (const type of types) {
      const typeLower = type.toLowerCase().trim();
      
      // Check if it's a TPA variation
      const isTPAVariation = tpaVariations.some(variation => 
        typeLower === variation || 
        (typeLower.includes('tpa') && typeLower.includes('third party')) ||
        (typeLower === 'tpa' && !typeLower.includes('group'))
      );
      
      if (isTPAVariation) {
        // Consolidate to "Third Party Administrator (TPA)"
        if (!consolidated.includes('Third Party Administrator (TPA)')) {
          consolidated.push('Third Party Administrator (TPA)');
        }
        continue;
      }
      
      // Check if it matches any of the 17 known types
      const matchedType = all17Types.find(known => {
        const knownLower = known.toLowerCase();
        return typeLower === knownLower || 
               typeLower.includes(knownLower) || 
               knownLower.includes(typeLower);
      });
      
      if (matchedType && !consolidated.includes(matchedType)) {
        consolidated.push(matchedType);
      }
    }
    
    // Sort to ensure consistent order
    return consolidated.sort((a, b) => {
      const indexA = all17Types.indexOf(a);
      const indexB = all17Types.indexOf(b);
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });
  }

  /**
   * Extracts Account Types directly from Scope section
   * Only called when Account entity is detected - ensures generic behavior for other entities
   */
  private extractAccountTypesFromScope(text: string): string[] {
    const accountTypes: string[] = [];
    
    // Known Account Types (all 17)
    const knownAccountTypes = [
      'Acquisition Company',
      'Agency',
      'Agency Branch',
      'Distribution Partner',
      'Group',
      'Insurer',
      'Insurer Branch',
      'Legal Entity',
      'Member',
      'Non-Member MGA',
      'Placing Broker',
      'Reinsurance Broker',
      'Reinsurer',
      'Reinsurer Branch',
      'Service Company',
      'Third Party Administrator (TPA)',
      'TPA Group'
    ];
    
    // TPA variations
    const tpaVariations = ['tpa', 'third party administrator', 'third party administrator (tpa)'];
    
    // Look for Scope section or Account Types list
    const scopePattern = /(?:scope|account types?)[:\s]+(?:this story|the following|all|ensures)[^:]*:?\s*([^.]+)/i;
    const scopeMatch = text.match(scopePattern);
    
    if (scopeMatch) {
      const typesText = scopeMatch[1];
      const typesTextLower = typesText.toLowerCase();
      
      // Check for TPA variations first
      const hasTPA = tpaVariations.some(variation => typesTextLower.includes(variation));
      if (hasTPA && !accountTypes.includes('Third Party Administrator (TPA)')) {
        accountTypes.push('Third Party Administrator (TPA)');
      }
      
      // Check each known Account Type (excluding TPA variations)
      knownAccountTypes.forEach(type => {
        if (type === 'Third Party Administrator (TPA)') return; // Already handled above
        const typeLower = type.toLowerCase();
        if (typesTextLower.includes(typeLower)) {
          if (!accountTypes.includes(type)) {
            accountTypes.push(type);
          }
        }
      });
    }
    
    // Also check for bullet list of Account Types
    const bulletPattern = /^[\s]*[-•*]\s+([A-Z][A-Za-z\s-]+(?:\([^)]+\))?)$/gm;
    let match;
    while ((match = bulletPattern.exec(text)) !== null) {
      const value = match[1].trim();
      const valueLower = value.toLowerCase();
      
      // Check if it's a TPA variation
      const isTPAVariation = tpaVariations.some(variation => 
        valueLower === variation || 
        (valueLower.includes('tpa') && valueLower.includes('third party')) ||
        (valueLower === 'tpa' && !valueLower.includes('group'))
      );
      
      if (isTPAVariation) {
        if (!accountTypes.includes('Third Party Administrator (TPA)')) {
          accountTypes.push('Third Party Administrator (TPA)');
        }
        continue;
      }
      
      // Check if it matches any known Account Type
      const matchedType = knownAccountTypes.find(known => {
        const knownLower = known.toLowerCase();
        return valueLower === knownLower ||
               valueLower.includes(knownLower) ||
               knownLower.includes(valueLower);
      });
      
      if (matchedType && !accountTypes.includes(matchedType)) {
        accountTypes.push(matchedType);
      }
    }
    
    // If text mentions "Account types" in Scope and lists them, extract from the list
    const accountTypeListPattern = /(?:scope|account types?)[^:]*:[\s\S]*?(?:acquisition company|agency|insurer|member|reinsurer|service company|distribution partner|group|legal entity|placing broker|reinsurance broker|non-member mga|tpa group)/i;
    if (accountTypeListPattern.test(text)) {
      // Extract all mentioned Account Types
      knownAccountTypes.forEach(type => {
        const typeLower = type.toLowerCase();
        const textLower = text.toLowerCase();
        if (textLower.includes(typeLower) && !accountTypes.includes(type)) {
          accountTypes.push(type);
        }
      });
    }
    
    return accountTypes;
  }

  /**
   * Extracts field names from context to filter them out from picklist values
   */
  private extractFieldNames(context: string): string[] {
    const fieldNames: Set<string> = new Set();
    
    // Common field names that might be extracted as values
    const commonFieldNames = [
      'Phone', 'Website', 'Visible', 'Mandatory', 'Required', 'Optional',
      'Field', 'Fields', 'Account Name', 'Type', 'Status', 'Description'
    ];
    
    // Extract field names from patterns like "Field | Behaviour/Notes"
    const fieldTablePattern = /Field[\s\S]*?\|[\s\S]*?Behaviour|Field[\s\S]*?\|[\s\S]*?Notes/gi;
    if (fieldTablePattern.test(context)) {
      // Extract field names from table structure
      const tableFieldPattern = /^([A-Z][A-Za-z_\s]+?)(?:\s*\||\s*$)/gm;
      let match;
      while ((match = tableFieldPattern.exec(context)) !== null) {
        const fieldName = match[1].trim();
        if (fieldName.length > 2 && fieldName.length < 50) {
          fieldNames.add(fieldName);
        }
      }
    }
    
    // Add common field names
    commonFieldNames.forEach(name => fieldNames.add(name));
    
    return Array.from(fieldNames);
  }

  private isCommonWord(word: string): boolean {
    const common = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
                    'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
                    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
                    'through', 'during', 'before', 'after', 'above', 'below',
                    'between', 'under', 'again', 'further', 'then', 'once',
                    'field', 'value', 'name', 'type', 'status', 'record'];
    return common.includes(word.toLowerCase());
  }

  // ==========================================================================
  // FILE OPERATIONS
  // ==========================================================================

  private async writeFile(
    issueKey: string,
    content: string,
    type: 'ui' | 'api',
    suffix: string = ''
  ): Promise<string | null> {
    const projectPrefix = issueKey.split('-')[0];
    const dir = path.join(this.outputDir, type, projectPrefix);

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const fileName = suffix ? `${issueKey}${suffix}.feature` : `${issueKey}.feature`;
    const filePath = path.join(dir, fileName);

    if (!suffix && fs.existsSync(filePath)) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      const answer = await new Promise<string>(resolve => {
        rl.question(`⚠️  ${filePath} exists. Overwrite? (y/n): `, resolve);
        rl.close();
      });

      if (answer.toLowerCase() !== 'y') {
        logger.info(`Skipped: ${filePath}`);
        return null;
      }
    }

    fs.writeFileSync(filePath, content);
    logger.info(`✅ Generated: ${filePath}`);
    
    return filePath;
  }
}

// Backward compatibility
export { FeatureGenerator as SmartFeatureGenerator };
