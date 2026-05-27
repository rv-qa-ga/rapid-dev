#!/usr/bin/env ts-node
/**
 * Step Definition Generator
 * 
 * Analyzes feature files and generates missing step definitions.
 * 
 * Usage:
 *   npm run generate:steps                    # All feature files
 *   npm run generate:steps -- --work-item SF-503  # Specific work item (UI + API)
 *   npm run generate:steps -- SF-520           # Specific feature file
 *   npm run generate:steps -- --ui             # Only UI features
 *   npm run generate:steps -- --api            # Only API features
 */

import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { logger } from '../src/utils/logger';

// ============================================================================
// TYPES
// ============================================================================

interface Step {
  keyword: 'Given' | 'When' | 'Then' | 'And' | 'But';
  text: string;
  rawText: string;
  hasDataTable: boolean;
  hasDocString: boolean;
  isOutline: boolean;
}

interface FeatureFile {
  path: string;
  name: string;
  type: 'ui' | 'api' | 'common';
  steps: Step[];
  scenarios: string[];
}

interface ExistingStep {
  pattern: string;
  file: string;
  line: number;
}

// ============================================================================
// STEP PATTERNS & TEMPLATES
// ============================================================================

const STEP_TEMPLATES: Record<string, string> = {
  // Authentication
  'authenticated.*user': `Given('{string}', async function (this: AutomationWorld) {
  await this.initBrowser();
  // TODO: Implement authentication
  logger.info('User authenticated');
});`,

  // Navigation
  'navigate.*record': `When('I navigate to the {word} record', async function (this: AutomationWorld, entityType: string) {
  await this.initBrowser();
  const recordId = this.testContext.recordId || this.testContext.accountId;
  if (!recordId) {
    throw new Error('No record ID found in test context');
  }
  // TODO: Navigate to record
  logger.info(\`Navigated to \${entityType} record: \${recordId}\`);
});`,

  // Field operations
  'set.*field.*to': `When('I set the "{string}" field to "{string}"', async function (this: AutomationWorld, fieldName: string, value: string) {
  // TODO: Set field value
  logger.info(\`Set \${fieldName} to \${value}\`);
});`,

  'update.*field': `When('I update the {string}', async function (this: AutomationWorld, fieldName: string) {
  // TODO: Update field
  logger.info(\`Updated \${fieldName}\`);
});`,

  'clear.*field': `When('I clear the "{string}" field', async function (this: AutomationWorld, fieldName: string) {
  // TODO: Clear field
  logger.info(\`Cleared \${fieldName}\`);
});`,

  // Save operations
  'save.*record': `When('I save the record', async function (this: AutomationWorld) {
  // TODO: Save record
  logger.info('Record saved');
});`,

  'attempt.*save': `When('I attempt to save the record', async function (this: AutomationWorld) {
  // TODO: Attempt save
  logger.info('Attempting to save record');
});`,

  // Verification
  'field.*should.*be.*visible': `Then('the "{string}" field should be visible', async function (this: AutomationWorld, fieldName: string) {
  // TODO: Verify field visibility
  logger.info(\`Verified \${fieldName} is visible\`);
});`,

  'field.*should.*display': `Then('the "{string}" field should display "{string}"', async function (this: AutomationWorld, fieldName: string, expectedValue: string) {
  // TODO: Verify field value
  logger.info(\`Verified \${fieldName} displays \${expectedValue}\`);
});`,

  'field.*should.*not.*be.*editable': `Then('the "{string}" field should not be editable', async function (this: AutomationWorld, fieldName: string) {
  // TODO: Verify field is read-only
  logger.info(\`Verified \${fieldName} is not editable\`);
});`,

  'should.*see.*validation.*error': `Then('I should see a validation error', async function (this: AutomationWorld) {
  // TODO: Verify validation error
  logger.info('Validation error displayed');
});`,

  'should.*see.*validation.*error.*message': `Then('I should see a validation error message', async function (this: AutomationWorld) {
  // TODO: Verify validation error message
  logger.info('Validation error message displayed');
});`,

  // API steps
  'query.*via.*api': `When('I query {word} records via API', async function (this: AutomationWorld, entityType: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  // TODO: Query records
  logger.info(\`Queried \${entityType} records\`);
});`,

  'update.*via.*api': `When('I update the {string} to "{string}" via API', async function (this: AutomationWorld, fieldName: string, value: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  // TODO: Update via API
  logger.info(\`Updated \${fieldName} to \${value} via API\`);
});`,

  'create.*via.*post': `When('I create a new {word} via POST with:', async function (this: AutomationWorld, entityType: string, dataTable: DataTable) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  // TODO: Create record with data table
  logger.info(\`Created \${entityType} via API\`);
});`,

  'api.*should.*return.*status': `Then('the API should return status code {int}', async function (this: AutomationWorld, expectedStatus: number) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  const actualStatus = response.status();
  if (actualStatus !== expectedStatus) {
    throw new Error(\`Expected status \${expectedStatus} but got \${actualStatus}\`);
  }
  logger.info(\`API returned status \${expectedStatus}\`);
});`,

  // List/Filter operations
  'navigate.*list.*view': `When('I navigate to the {word} list view', async function (this: AutomationWorld, entityType: string) {
  await this.initBrowser();
  // TODO: Navigate to list view
  logger.info(\`Navigated to \${entityType} list view\`);
});`,

  'add.*filter': `When('I add a filter for "{string}"', async function (this: AutomationWorld, fieldName: string) {
  // TODO: Add filter
  logger.info(\`Added filter for \${fieldName}\`);
});`,

  'apply.*filter': `When('I apply the filter', async function (this: AutomationWorld) {
  // TODO: Apply filter
  logger.info('Filter applied');
});`,

  // History/Changes
  'change.*should.*be.*recorded': `Then('the change should be recorded in the history', async function (this: AutomationWorld) {
  // TODO: Verify history entry
  logger.info('Change recorded in history');
});`,

  'modification.*should.*appear': `Then('the modification should appear in the record history', async function (this: AutomationWorld) {
  // TODO: Verify history
  logger.info('Modification in history');
});`,

  // Edit operations
  'click.*edit': `When('I click Edit on the {word}', async function (this: AutomationWorld, entityType: string) {
  // TODO: Click edit button
  logger.info(\`Clicked Edit on \${entityType}\`);
});`,

  'edit.*button.*should.*not.*be.*visible': `Then('the Edit button should not be visible', async function (this: AutomationWorld) {
  // TODO: Verify edit button not visible
  logger.info('Edit button not visible');
});`,

  // Record operations
  'record.*should.*not.*be.*saved': `Then('the record should not be saved', async function (this: AutomationWorld) {
  // TODO: Verify record not saved
  logger.info('Record not saved');
});`,

  'should.*show.*updated': `Then('the {word} should show the updated {string}', async function (this: AutomationWorld, entityType: string, fieldName: string) {
  // TODO: Verify updated value
  logger.info(\`\${entityType} shows updated \${fieldName}\`);
});`,

  'should.*reflect.*new.*value': `Then('the "{string}" should reflect the new value', async function (this: AutomationWorld, fieldName: string) {
  // TODO: Verify new value
  logger.info(\`\${fieldName} reflects new value\`);
});`,

  // Bulk operations
  'bulk.*update': `When('I bulk update the {string} via API', async function (this: AutomationWorld, fieldName: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  // TODO: Bulk update
  logger.info(\`Bulk updated \${fieldName}\`);
});`,

  'all.*records.*should.*be.*updated': `Then('all records should be updated successfully', async function (this: AutomationWorld) {
  // TODO: Verify bulk update
  logger.info('All records updated');
});`,

  // Query verification
  'querying.*should.*show': `Then('querying the {word} should show {string} as "{string}"', async function (this: AutomationWorld, entityType: string, fieldName: string, expectedValue: string) {
  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  // TODO: Query and verify
  logger.info(\`Verified \${fieldName} is \${expectedValue}\`);
});`,

  // Response verification
  'response.*should.*contain': `Then('the response should contain the new {word} ID', async function (this: AutomationWorld, entityType: string) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  const body = await response.json();
  if (!body.id) {
    throw new Error('Response does not contain ID');
  }
  this.testContext.recordId = body.id;
  logger.info(\`Response contains \${entityType} ID: \${body.id}\`);
});`,

  'response.*should.*include': `Then('the response should include the {string} field', async function (this: AutomationWorld, fieldName: string) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  const body = await response.json();
  if (!body[fieldName]) {
    throw new Error(\`Response does not include \${fieldName}\`);
  }
  logger.info(\`Response includes \${fieldName}\`);
});`,

  'response.*should.*contain.*records': `Then('the response should contain {word} records', async function (this: AutomationWorld, entityType: string) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  const body = await response.json();
  if (!body.records || body.records.length === 0) {
    throw new Error('Response does not contain records');
  }
  logger.info(\`Response contains \${body.records.length} records\`);
});`,

  // Error handling
  'error.*response.*should.*contain': `Then('the error response should contain a validation message', async function (this: AutomationWorld) {
  const response = this.testContext.lastResponse;
  if (!response) {
    throw new Error('No API response found');
  }
  const body = await response.json();
  if (!body.message && !body.errorMessage) {
    throw new Error('Error response does not contain message');
  }
  logger.info('Error response contains validation message');
});`,

  // Filter results
  'only.*should.*be.*displayed': `Then('only {word}s matching the filter should be displayed', async function (this: AutomationWorld, entityType: string) {
  // TODO: Verify filtered results
  logger.info(\`Only matching \${entityType}s displayed\`);
});`,

  // Save success
  'should.*be.*saved.*successfully': `Then('the {word} should be saved successfully', async function (this: AutomationWorld, entityType: string) {
  // TODO: Verify save success
  logger.info(\`\${entityType} saved successfully\`);
});`,
};

// ============================================================================
// PARSING
// ============================================================================

function parseFeatureFile(filePath: string): FeatureFile {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const steps: Step[] = [];
  const scenarios: string[] = [];
  let currentScenario = '';
  let inScenario = false;
  let inExamples = false;
  
  // Determine type from path
  let type: 'ui' | 'api' | 'common' = 'common';
  if (filePath.includes('/ui/')) type = 'ui';
  else if (filePath.includes('/api/')) type = 'api';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip comments and empty lines
    if (!line || line.startsWith('#')) continue;
    
    // Detect scenario
    if (line.startsWith('Scenario') || line.startsWith('Scenario Outline')) {
      inScenario = true;
      inExamples = false;
      currentScenario = line.replace(/^Scenario( Outline)?:\s*/, '');
      scenarios.push(currentScenario);
      continue;
    }
    
    // Detect Examples
    if (line.startsWith('Examples:')) {
      inExamples = true;
      continue;
    }
    
    // Skip Examples table
    if (inExamples && line.startsWith('|')) continue;
    if (inExamples && !line.startsWith('|')) inExamples = false;
    
    // Parse steps
    if (inScenario && !inExamples) {
      const stepMatch = line.match(/^(Given|When|Then|And|But)\s+(.+)$/);
      if (stepMatch) {
        const keyword = stepMatch[1] as Step['keyword'];
        const text = stepMatch[2];
        
        steps.push({
          keyword,
          text: normalizeStepText(text),
          rawText: text,
          hasDataTable: false, // Simplified - would need full parsing
          hasDocString: false,
          isOutline: currentScenario.includes('Outline'),
        });
      }
    }
  }

  return {
    path: filePath,
    name: path.basename(filePath, '.feature'),
    type,
    steps,
    scenarios,
  };
}

function normalizeStepText(text: string): string {
  // Remove quotes, convert to pattern
  return text
    .replace(/"[^"]*"/g, '{string}')
    .replace(/\d+/g, '{int}')
    .replace(/\b\w+\b/g, (word) => {
      // Keep common words, parameterize others
      if (['I', 'the', 'a', 'an', 'to', 'should', 'be', 'is', 'are', 'have', 'has', 'with', 'via', 'on', 'in', 'at', 'for', 'and', 'or', 'but'].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.toLowerCase();
    })
    .trim();
}

// ============================================================================
// EXISTING STEP DETECTION
// ============================================================================

function findExistingSteps(): ExistingStep[] {
  const existing: ExistingStep[] = [];
  
  // PRIORITY 1: Scan common step definitions first (highest priority)
  const commonStepFiles = glob.sync('src/step-definitions/common/*.ts');
  console.log(`   📁 Scanning ${commonStepFiles.length} common step definition file(s)...`);
  
  for (const file of commonStepFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      // Match step definition patterns
      const stepMatch = lines[i].match(/(Given|When|Then|And|But)\s*\(['"](.+?)['"]/);
      if (stepMatch) {
        // Store the ORIGINAL pattern (don't normalize it - keep {word}, {string}, etc.)
        existing.push({
          pattern: stepMatch[2], // Keep original pattern with placeholders
          file,
          line: i + 1,
        });
      }
    }
  }
  
  // PRIORITY 2: Scan other step definitions (ui, api, etc.)
  const otherStepFiles = glob.sync('src/step-definitions/**/*.ts').filter(
    file => !file.includes('/common/')
  );
  console.log(`   📁 Scanning ${otherStepFiles.length} other step definition file(s)...`);
  
  for (const file of otherStepFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      // Match step definition patterns
      const stepMatch = lines[i].match(/(Given|When|Then|And|But)\s*\(['"](.+?)['"]/);
      if (stepMatch) {
        // Store the ORIGINAL pattern (don't normalize it - keep {word}, {string}, etc.)
        existing.push({
          pattern: stepMatch[2], // Keep original pattern with placeholders
          file,
          line: i + 1,
        });
      }
    }
  }
  
  return existing;
}

function stepExists(step: Step, existing: ExistingStep[]): boolean {
  // PRIORITY: Check common steps first
  const commonSteps = existing.filter(e => e.file.includes('common'));
  const otherSteps = existing.filter(e => !e.file.includes('common'));
  
  // Normalize step text (like validator does: remove quotes, lowercase)
  const stepText = step.rawText.toLowerCase().trim();
  const normalizedStep = stepText
    .replace(/["']/g, '') // Remove quotes
    .trim();
  
  // Check all steps (common first, then others)
  const allSteps = [...commonSteps, ...otherSteps];
  
  for (const existingStep of allSteps) {
    const pattern = existingStep.pattern.toLowerCase();
    
    // Normalize pattern (remove quotes, keep placeholders)
    const normalizedPattern = pattern
      .replace(/["']/g, '')
      .trim();
    
    // First, try exact match after normalization
    if (normalizedStep === normalizedPattern) {
      return true;
    }
    
    // Convert pattern to regex: {word} -> \w+, {string} -> .*, {int} -> \d+
    const regexPattern = normalizedPattern
      .replace(/\{word\}/g, '\\w+')
      .replace(/\{string\}/g, '.*')
      .replace(/\{int\}/g, '\\d+')
      .replace(/\{float\}/g, '\\d+\\.\\d+')
      .replace(/\s+/g, '\\s+');
    
    try {
      const regex = new RegExp(`^${regexPattern}$`, 'i');
      if (regex.test(normalizedStep)) {
        return true;
      }
    } catch (e) {
      // Invalid regex, skip
    }
    
    // Also try matching original step text (with quotes) against pattern regex
    const regexPattern2 = pattern
      .replace(/\{word\}/g, '\\w+')
      .replace(/\{string\}/g, '["\'].*?["\']|.*') // Match quoted or unquoted strings
      .replace(/\{int\}/g, '\\d+')
      .replace(/\{float\}/g, '\\d+\\.\\d+')
      .replace(/\s+/g, '\\s+');
    
    try {
      const regex2 = new RegExp(`^${regexPattern2}$`, 'i');
      if (regex2.test(stepText)) {
        return true;
      }
    } catch (e) {
      // Invalid regex, skip
    }
  }
  
  return false;
}

// ============================================================================
// CODE GENERATION
// ============================================================================

function generateStepCode(step: Step, featureType: 'ui' | 'api' | 'common'): string {
  const normalized = step.text.toLowerCase();
  
  // Find matching template
  for (const [pattern, template] of Object.entries(STEP_TEMPLATES)) {
    const regex = new RegExp(pattern.replace(/\{string\}/g, '.*').replace(/\{int\}/g, '\\d+').replace(/\{word\}/g, '\\w+'));
    if (regex.test(normalized)) {
      return template.replace('{string}', step.rawText);
    }
  }
  
  // Default template
  return generateDefaultStep(step, featureType);
}

/**
 * Escape special characters in Cucumber expressions
 * Special characters that need escaping: / ( ) [ ] { } * + ? . ^ $ | \
 */
function escapeCucumberExpression(text: string): string {
  // Escape special characters that have meaning in Cucumber expressions
  // But preserve {string}, {int}, etc. parameter placeholders
  return text
    .replace(/\\/g, '\\\\')  // Escape backslashes first
    .replace(/\//g, '\\/')   // Escape forward slashes (alternation operator)
    .replace(/\(/g, '\\(')  // Escape opening parentheses
    .replace(/\)/g, '\\)')  // Escape closing parentheses
    .replace(/\[/g, '\\[')  // Escape opening brackets
    .replace(/\]/g, '\\]')  // Escape closing brackets
    .replace(/\{/g, '\\{')  // Escape opening braces (but we'll handle {string} specially)
    .replace(/\}/g, '\\}')  // Escape closing braces (but we'll handle {string} specially)
    .replace(/\*/g, '\\*')  // Escape asterisks
    .replace(/\+/g, '\\+')  // Escape plus signs
    .replace(/\?/g, '\\?')  // Escape question marks
    .replace(/\./g, '\\.')  // Escape dots
    .replace(/\^/g, '\\^')  // Escape caret
    .replace(/\$/g, '\\$')  // Escape dollar sign
    .replace(/\|/g, '\\|')  // Escape pipe
    // Restore parameter placeholders (they should not be escaped)
    .replace(/\\\{string\\\}/g, '{string}')
    .replace(/\\\{int\\\}/g, '{int}')
    .replace(/\\\{float\\\}/g, '{float}')
    .replace(/\\\{word\\\}/g, '{word}');
}

/**
 * Clean and normalize step text for use in step definition patterns
 */
function cleanStepText(text: string): string {
  // Remove duplicate words/phrases that might occur from parsing errors
  // This handles cases like "I update the I update the..." 
  const words = text.split(/\s+/);
  const cleaned: string[] = [];
  let lastWord = '';
  
  for (const word of words) {
    // Skip if this word is the same as the last word (simple deduplication)
    if (word !== lastWord || cleaned.length === 0) {
      cleaned.push(word);
      lastWord = word;
    }
  }
  
  return cleaned.join(' ');
}

function generateDefaultStep(step: Step, featureType: 'ui' | 'api' | 'common'): string {
  const keyword = step.keyword === 'And' || step.keyword === 'But' ? 'When' : step.keyword;
  const params = extractParameters(step.rawText);
  const paramList = params.length > 0 ? params.map((p, i) => `${p.type} ${p.name}`).join(', ') : '';
  const paramUsage = params.map(p => p.name).join(', ');
  
  // Clean the step text to remove duplicates and normalize
  const cleanedText = cleanStepText(step.rawText);
  
  // For step patterns, we need to escape special characters but preserve parameters
  // If the text contains quoted strings, replace them with {string} parameters
  let pattern = cleanedText;
  
  // Replace quoted strings with {string} parameters
  let paramIndex = 0;
  pattern = pattern.replace(/"([^"]*)"/g, (match, content) => {
    // If content contains special characters, we need to escape them in the pattern
    // But since we're using {string}, we just need to escape the quotes and special chars in the literal parts
    return '"{string}"';
  });
  
  // Escape special characters in the pattern (but preserve {string} placeholders)
  pattern = escapeCucumberExpression(pattern);
  
  // Escape single quotes in the logger message
  const escapedLogText = cleanedText.replace(/'/g, "\\'");
  
  let body = '';
  if (featureType === 'ui') {
    body = `  await this.initBrowser();
  // TODO: Implement ${cleanedText}
  logger.info('${escapedLogText}');`;
  } else if (featureType === 'api') {
    body = `  const apiClient = this.testContext.apiClient as SalesforceAPIClient;
  if (!apiClient) {
    throw new Error('API client not initialized');
  }
  // TODO: Implement ${cleanedText}
  logger.info('${escapedLogText}');`;
  } else {
    body = `  // TODO: Implement ${cleanedText}
  logger.info('${escapedLogText}');`;
  }
  
  return `${keyword}('${pattern}', async function (this: AutomationWorld${paramList ? `, ${paramList}` : ''}) {
${body}
});`;
}

function extractParameters(text: string): Array<{ name: string; type: string }> {
  const params: Array<{ name: string; type: string }> = [];
  
  // Extract quoted strings
  const stringMatches = text.matchAll(/"([^"]*)"/g);
  for (const match of stringMatches) {
    params.push({ name: `value${params.length + 1}`, type: 'string' });
  }
  
  // Extract numbers
  const intMatches = text.match(/\d+/);
  if (intMatches) {
    params.push({ name: `number${params.length + 1}`, type: 'number' });
  }
  
  return params;
}

// ============================================================================
// FILE GENERATION
// ============================================================================

function generateStepDefinitionFile(
  feature: FeatureFile,
  missingSteps: Step[],
  outputDir: string
): string {
  const imports = getImports(feature.type, outputDir);
  const steps = missingSteps.map(step => generateStepCode(step, feature.type)).join('\n\n');
  
  const content = `${imports}

// ============================================================================
// STEP DEFINITIONS FOR: ${feature.name}
// ============================================================================
// Generated: ${new Date().toISOString()}
// Feature: ${feature.path}
// ============================================================================

${steps}
`;

  return content;
}

function getImports(type: 'ui' | 'api' | 'common', outputDir: string): string {
  // Determine correct import path based on output directory
  // Files in src/step-definitions/ need ../hooks/world
  // Files in src/step-definitions/ui/ or src/step-definitions/api/ need ../../hooks/world
  const isSubDir = outputDir.includes('/ui/') || outputDir.includes('/api/');
  const hooksPath = isSubDir ? '../../hooks/world' : '../hooks/world';
  const utilsPath = isSubDir ? '../../utils/logger' : '../utils/logger';
  
  // Note: And and But are not exported from @cucumber/cucumber
  // Cucumber automatically matches And/But to Given/When/Then patterns
  const baseImports = `import { Given, When, Then, DataTable } from '@cucumber/cucumber';
import { AutomationWorld } from '${hooksPath}';
import { logger } from '${utilsPath}';`;

  if (type === 'api') {
    const apiClientPath = isSubDir ? '../../api-clients/salesforce/SalesforceAPIClient' : '../api-clients/salesforce/SalesforceAPIClient';
    return `${baseImports}
import { SalesforceAPIClient } from '${apiClientPath}';`;
  }
  
  return baseImports;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const filter = args.find(arg => arg === '--ui' || arg === '--api');
  const workItemIndex = args.indexOf('--work-item');
  const workItem = workItemIndex !== -1 && args[workItemIndex + 1] ? args[workItemIndex + 1].trim() : null;
  const specificFeature = args.find(arg => !arg.startsWith('--') && arg !== workItem);

  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║         🔧 STEP DEFINITION GENERATOR                           ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  // Find feature files
  let featureFiles: string[] = [];
  if (workItem) {
    // Support --work-item parameter to find both UI and API feature files
    console.log(`📋 Generating step definitions for work item: ${workItem}\n`);
    const uiFeature = `src/features/ui/SF/${workItem}.feature`;
    const apiFeature = `src/features/api/SF/${workItem}.feature`;
    
    if (fs.existsSync(uiFeature)) {
      featureFiles.push(uiFeature);
      console.log(`   ✓ Found UI feature: ${uiFeature}`);
    } else {
      console.log(`   ⚠️  UI feature not found: ${uiFeature}`);
    }
    
    if (fs.existsSync(apiFeature)) {
      featureFiles.push(apiFeature);
      console.log(`   ✓ Found API feature: ${apiFeature}`);
    } else {
      console.log(`   ⚠️  API feature not found: ${apiFeature}`);
    }
    
    if (featureFiles.length === 0) {
      console.log(`\n❌ No feature files found for work item: ${workItem}`);
      process.exit(1);
    }
    console.log('');
  } else if (specificFeature) {
    featureFiles = glob.sync(`src/features/**/${specificFeature}.feature`);
  } else {
    if (filter === '--ui') {
      featureFiles = glob.sync('src/features/ui/**/*.feature');
    } else if (filter === '--api') {
      featureFiles = glob.sync('src/features/api/**/*.feature');
    } else {
      featureFiles = glob.sync('src/features/**/*.feature');
    }
  }

  if (featureFiles.length === 0) {
    console.log('❌ No feature files found');
    process.exit(1);
  }

  console.log(`📋 Found ${featureFiles.length} feature file(s)\n`);

  // Parse features
  const features = featureFiles.map(parseFeatureFile);
  
  // Find existing steps (prioritizing common steps)
  console.log('🔍 Scanning existing step definitions...');
  const existingSteps = findExistingSteps();
  const commonStepCount = existingSteps.filter(e => e.file.includes('common')).length;
  const otherStepCount = existingSteps.length - commonStepCount;
  console.log(`   Found ${existingSteps.length} existing step definitions:`);
  console.log(`      ✓ ${commonStepCount} in common step files (highest priority)`);
  console.log(`      ✓ ${otherStepCount} in other step files\n`);

  // Find missing steps
  const results: Array<{ feature: FeatureFile; missing: Step[] }> = [];
  
  for (const feature of features) {
    const missing = feature.steps.filter(step => !stepExists(step, existingSteps));
    if (missing.length > 0) {
      results.push({ feature, missing });
    }
  }

  if (results.length === 0) {
    console.log('✅ All steps have definitions!\n');
    process.exit(0);
  }

  // Generate code
  console.log('📝 Generating step definitions...\n');
  
  for (const { feature, missing } of results) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Feature: ${feature.name}`);
    console.log(`Missing steps: ${missing.length}`);
    console.log(`${'─'.repeat(60)}`);
    
    // Determine output directory
    let outputDir = 'src/step-definitions';
    if (feature.type === 'ui') {
      outputDir = 'src/step-definitions/ui';
    } else if (feature.type === 'api') {
      outputDir = 'src/step-definitions/api';
    }
    
    // Generate file content
    const filePath = path.join(outputDir, `${feature.name}.steps.ts`);
    const fileContent = generateStepDefinitionFile(feature, missing, outputDir);
    
    // Check if file exists
    if (fs.existsSync(filePath)) {
      console.log(`⚠️  File exists: ${filePath}`);
      console.log(`   Append missing steps manually or delete to regenerate`);
    } else {
      // Ensure directory exists
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      fs.writeFileSync(filePath, fileContent);
      console.log(`✅ Generated: ${filePath}`);
    }
    
    // List missing steps
    missing.forEach(step => {
      console.log(`   - ${step.keyword} ${step.rawText}`);
    });
  }

  console.log('\n✅ Step definition generation complete!\n');
}

main().catch((error) => {
  console.error(`\n❌ Error: ${error.message}`);
  process.exit(1);
});

