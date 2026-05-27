#!/usr/bin/env ts-node

/**
 * Convert Cucumber JSON Report to Test Results JSON Format
 * 
 * Converts Cucumber's JSON output to the format required by test-report.html
 * 
 * Usage:
 *   ts-node scripts/convert-cucumber-to-test-results.ts [cucumber-report.json] [output.json]
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load config module to get proper values
let config: any = null;
try {
  // Try to load config - it will load the appropriate .env file
  config = require('../src/config/config');
} catch (error) {
  console.warn('Could not load config module, will use environment variables directly');
}

interface CucumberFeature {
  uri: string;
  id: string;
  line: number;
  keyword: string;
  name: string;
  description?: string;
  elements?: CucumberElement[];
  tags?: Array<{ name: string; line?: number }>;
}

interface CucumberElement {
  id: string;
  type: 'background' | 'scenario';
  keyword: string;
  name: string;
  description?: string;
  line: number;
  steps: CucumberStep[];
  tags?: Array<{ name: string; line?: number }>;
}

interface CucumberStep {
  keyword: string;
  name: string;
  line: number;
  match?: {
    location?: string;
    arguments?: Array<{ value: string }>;
  };
  result?: {
    status: 'passed' | 'failed' | 'skipped' | 'undefined' | 'pending';
    duration?: number;
    error_message?: string;
  };
  embeddings?: Array<{
    mime_type: string;
    data?: string;
    file_name?: string;
  }>;
}

interface TestResult {
  id: string;
  type: 'API' | 'UI';
  feature?: string;
  jiraId?: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  priority?: string;
  testData?: string;
  scenarioDescription: string;
  errorDetails?: string;
  screenshotPath?: string;
  screenshotUrl?: string;
  timestamp?: string;
  duration?: number;
}

interface TestResults {
  runDateTime: string;
  environmentName: string;
  environmentBaseUrl: string;
  executedByUser: string;
  userProfile?: string;
  tests: TestResult[];
}

/**
 * Extract Jira ID from tags
 */
function extractJiraId(tags: Array<{ name: string }> | undefined): string | undefined {
  if (!tags) return undefined;
  
  for (const tag of tags) {
    const match = tag.name.match(/^@?([A-Z]+-\d+)$/);
    if (match) {
      return match[1];
    }
  }
  return undefined;
}

/**
 * Extract test case ID from tags (e.g., @SF-520-UI-001, @SF-520-API-001, or legacy @SF-520-001)
 */
function extractTestCaseId(tags: Array<{ name: string }> | undefined): string | undefined {
  if (!tags) return undefined;
  
  for (const tag of tags) {
    // Match new format: SF-520-UI-001 or SF-520-API-001
    const newMatch = tag.name.match(/^@?([A-Z]+-\d+-(UI|API)-\d+)$/);
    if (newMatch) {
      return newMatch[1];
    }
    // Match legacy format: SF-520-001
    const legacyMatch = tag.name.match(/^@?([A-Z]+-\d+-\d+)$/);
    if (legacyMatch) {
      return legacyMatch[1];
    }
  }
  return undefined;
}

/**
 * Extract priority from tags (e.g., @p1, @p2)
 */
function extractPriority(tags: Array<{ name: string }> | undefined): string | undefined {
  if (!tags) return undefined;
  
  for (const tag of tags) {
    const match = tag.name.match(/^@p([1-4])$/i);
    if (match) {
      return `P${match[1]}`;
    }
  }
  return undefined;
}

/**
 * Determine test type from tags or feature path
 */
function determineTestType(tags: Array<{ name: string }> | undefined, uri: string): 'API' | 'UI' {
  if (tags) {
    if (tags.some(t => t.name === '@api')) return 'API';
    if (tags.some(t => t.name === '@ui')) return 'UI';
  }
  
  // Fallback to path
  if (uri.includes('/api/')) return 'API';
  if (uri.includes('/ui/')) return 'UI';
  
  return 'UI'; // Default
}

/**
 * Find screenshot by test case ID (e.g., SF-520-001)
 */
function findScreenshotByTestCaseId(testCaseId: string, screenshotDir: string): string | undefined {
  if (!fs.existsSync(screenshotDir)) {
    return undefined;
  }
  
  const files = fs.readdirSync(screenshotDir);
  
  // Look for files starting with test case ID
  const matchingFiles = files
    .filter(file => {
      if (!file.endsWith('.png')) return false;
      return file.startsWith(testCaseId + '-');
    })
    .map(file => ({
      name: file,
      path: path.join(screenshotDir, file),
      time: fs.statSync(path.join(screenshotDir, file)).mtime
    }))
    .sort((a, b) => b.time.getTime() - a.time.getTime());
  
  if (matchingFiles.length > 0) {
    return matchingFiles[0].name;
  }
  
  return undefined;
}

/**
 * Find screenshot path from step embeddings or scenario name
 */
function findScreenshot(
  steps: CucumberStep[],
  scenarioName: string,
  screenshotDir: string
): string | undefined {
  // Check step embeddings first (from Cucumber attach)
  for (const step of steps) {
    if (step.embeddings) {
      for (const embedding of step.embeddings) {
        if (embedding.mime_type === 'image/png') {
          // Try file_name first
          if (embedding.file_name) {
            return embedding.file_name;
          }
          // If no file_name, try to extract from data (base64)
          if (embedding.data) {
            // Screenshot might be embedded as base64, but we need the file path
            // Continue to file system search
          }
        }
      }
    }
  }
  
  // Try to find screenshot file by scenario name (multiple patterns)
  if (fs.existsSync(screenshotDir)) {
    const sanitizedName = scenarioName.replace(/[^a-z0-9]/gi, '_');
    const files = fs.readdirSync(screenshotDir);
    
    // Try multiple matching patterns:
    // 1. Exact match: scenarioName-STATUS-timestamp.png
    // 2. Starts with: scenarioName-*.png
    // 3. Contains: *scenarioName*.png
    const matchingFiles = files
      .filter(file => {
        if (!file.endsWith('.png')) return false;
        const fileLower = file.toLowerCase();
        const nameLower = sanitizedName.toLowerCase();
        // Match if file starts with scenario name or contains it
        return fileLower.startsWith(nameLower) || 
               fileLower.includes(nameLower) ||
               nameLower.includes(fileLower.split('-')[0]);
      })
      .map(file => ({
        name: file,
        path: path.join(screenshotDir, file),
        time: fs.statSync(path.join(screenshotDir, file)).mtime
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime());
    
    if (matchingFiles.length > 0) {
      // Return the most recent matching screenshot
      return matchingFiles[0].name;
    }
    
    // Fallback: Get the most recent screenshot file (might be from this scenario)
    const allScreenshots = files
      .filter(file => file.endsWith('.png'))
      .map(file => ({
        name: file,
        path: path.join(screenshotDir, file),
        time: fs.statSync(path.join(screenshotDir, file)).mtime
      }))
      .sort((a, b) => b.time.getTime() - a.time.getTime());
    
    // If we have screenshots but none match, log a warning but return the most recent
    if (allScreenshots.length > 0) {
      console.warn(`⚠️  No exact screenshot match for "${scenarioName}", using most recent: ${allScreenshots[0].name}`);
      return allScreenshots[0].name;
    }
  }
  
  return undefined;
}

/**
 * Convert Cucumber JSON to Test Results format
 */
function convertCucumberToTestResults(cucumberJson: CucumberFeature[]): TestResults {
  const env = process.env.ENV || 'qa';
  
  // Load environment-specific .env file to get proper values
  const envConfigPath = path.resolve(__dirname, '../src/config/env', `.env.${env}`);
  const configEnvPath = path.resolve(__dirname, '../src/config', `.env.${env}`);
  const rootEnvPath = path.resolve(process.cwd(), `.env.${env}`);
  const baseEnvPath = path.resolve(process.cwd(), '.env');
  
  // Try to load environment file
  const envPaths = [envConfigPath, configEnvPath, rootEnvPath, baseEnvPath];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
      break;
    }
  }
  
  // Get base URL - try env vars first, then JSON config
  let baseUrl = process.env.SF_BASE_URL;
  if (!baseUrl || baseUrl === 'Not configured') {
    try {
      const configJsonPath = path.resolve(__dirname, `../src/config/env/${env}.json`);
      if (fs.existsSync(configJsonPath)) {
        const configJson = JSON.parse(fs.readFileSync(configJsonPath, 'utf-8'));
        baseUrl = configJson.salesforce?.baseUrl;
      }
    } catch (error) {
      // Ignore
    }
  }
  if (!baseUrl) {
    baseUrl = 'Not configured';
  }
  
  // Get username - try env vars first
  const username = process.env.SF_USERNAME || process.env.SF_JWT_USERNAME || 'Not configured';
  const userProfile = process.env.SF_USER_PROFILE || undefined;
  
  const screenshotDir = path.join(process.cwd(), 'reports', 'screenshots');
  
  const tests: TestResult[] = [];
  const runDateTime = new Date().toISOString();
  
  for (const feature of cucumberJson) {
    if (!feature.elements) continue;
    
    // Skip "Salesforce Login" feature - it's a setup/authentication feature, not a test feature
    if (feature.name && (feature.name.toLowerCase().includes('salesforce login') || 
                         feature.name.toLowerCase().includes('login'))) {
      continue;
    }
    
    const featureTags = feature.tags || [];
    const featureJiraId = extractJiraId(featureTags);
    
    for (const element of feature.elements) {
      if (element.type !== 'scenario') continue;
      
      const scenarioTags = element.tags || featureTags;
      const jiraId = extractJiraId(scenarioTags) || featureJiraId;
      
      // Extract test case ID - prefer format SF-529-001, fallback to SF-529-001 format
      let testCaseId = extractTestCaseId(scenarioTags);
      if (!testCaseId && jiraId) {
        // Generate test case ID in format SF-529-001 from scenario ID
        const scenarioIdPart = element.id.split(';').pop() || '001';
        // Ensure it's 3 digits
        const paddedId = scenarioIdPart.padStart(3, '0');
        testCaseId = `${jiraId}-${paddedId}`;
      }
      if (!testCaseId) {
        // Last resort: use element ID
        testCaseId = element.id;
      }
      const priority = extractPriority(scenarioTags);
      const testType = determineTestType(scenarioTags, feature.uri);
      
      // Determine status
      let status: 'PASSED' | 'FAILED' | 'SKIPPED' = 'PASSED';
      let errorDetails: string | undefined;
      let duration = 0;
      
      for (const step of element.steps) {
        if (step.result) {
          duration += step.result.duration || 0;
          
          if (step.result.status === 'failed') {
            status = 'FAILED';
            errorDetails = step.result.error_message || 'Test step failed';
          } else if (step.result.status === 'skipped' && status === 'PASSED') {
            status = 'SKIPPED';
          }
        }
      }
      
      // Find screenshot for ALL tests (required for evidence/documentation)
      // Screenshots are essential for test evidence, so we capture them for all scenarios
      // Try to find screenshot by test case ID first, then fallback to scenario name
      let screenshotFileName: string | undefined;
      if (testCaseId) {
        // Look for screenshot with test case ID in filename
        screenshotFileName = findScreenshotByTestCaseId(testCaseId, screenshotDir);
      }
      // Fallback to scenario name if test case ID search didn't find anything
      if (!screenshotFileName) {
        screenshotFileName = findScreenshot(element.steps, element.name, screenshotDir);
      }
      // Convert to relative path from report location
      const screenshotPath = screenshotFileName 
        ? `reports/screenshots/${screenshotFileName}`
        : undefined;
      
      // Extract test data from multiple sources:
      // 1. From scenario outline examples (values substituted in scenario name)
      // 2. From step embeddings (Cucumber attachments)
      // 3. From step arguments
      // 4. From step text/name patterns
      let testData: string | undefined;
      
      // Extract test data values from steps - look for key values like Status, Type, etc.
      const testDataValues: string[] = [];
      
      for (const step of element.steps) {
        const stepName = step.name || '';
        if (!stepName) continue;
        
        // Look for "Account with Status "X"" or "Account with Type "X"" patterns
        const withValueMatch = stepName.match(/(?:with|has)\s+(?:Status|Type|Account\s+Type)\s+"([^"]+)"/i);
        if (withValueMatch && !testDataValues.includes(withValueMatch[1])) {
          testDataValues.push(withValueMatch[1]);
        }
        
        // Look for "Status equals "X"" patterns
        const equalsMatch = stepName.match(/(?:Status|Type)\s+equals\s+"([^"]+)"/i);
        if (equalsMatch && !testDataValues.includes(equalsMatch[1])) {
          testDataValues.push(equalsMatch[1]);
        }
        
        // Look for "I set the X field to Y" or "update the Status to Y" patterns
        const setMatch = stepName.match(/(?:set|update|change)\s+(?:the\s+)?(?:"([^"]+)"|Status|Type|Account\s+Status)\s+(?:field\s+)?to\s+"([^"]+)"/i);
        if (setMatch) {
          const value = setMatch[2];
          if (!testDataValues.includes(value)) {
            testDataValues.push(value);
          }
        }
        
        // Look for "display "X"" patterns (expected value)
        const displayMatch = stepName.match(/(?:display|show|contain)\s+"([^"]+)"/i);
        if (displayMatch && !testDataValues.includes(displayMatch[1])) {
          testDataValues.push(displayMatch[1]);
        }
      }
      
      if (testDataValues.length > 0) {
        testData = testDataValues.slice(0, 3).join(', '); // Limit to first 3 values
      }
      
      // Fallback: try to extract from scenario name
      if (!testData) {
        const scenarioName = element.name || '';
        const scenarioNameParts = scenarioName.split(' - ');
        if (scenarioNameParts.length > 1) {
          // Take all parts after the first as test data
          testData = scenarioNameParts.slice(1).join(' - ').trim();
        } else if (scenarioName) {
          // Try to extract quoted values from scenario name
          const quotedValues: string[] = [];
          const quoteMatches = scenarioName.matchAll(/"([^"]+)"/g);
          for (const match of quoteMatches) {
            quotedValues.push(match[1]);
          }
          if (quotedValues.length > 0) {
            testData = quotedValues.join(', ');
          }
        }
      }
      
      // Try to extract from step embeddings (where reporter.setTestDataId stores it)
      if (!testData) {
        for (const step of element.steps) {
          if (step.embeddings) {
            for (const embedding of step.embeddings) {
              if (embedding.mime_type === 'text/plain' && embedding.data) {
                try {
                  const data = JSON.parse(Buffer.from(embedding.data, 'base64').toString());
                  if (data.testDataId || data.TestCaseID) {
                    testData = data.testDataId || data.TestCaseID;
                    break;
                  }
                } catch {
                  // Not JSON, continue
                }
              }
            }
          }
        }
      }
      
      tests.push({
        id: testCaseId,
        type: testType,
        feature: feature.name,
        jiraId: jiraId,
        status: status,
        priority: priority,
        testData: testData,
        scenarioDescription: element.name,
        errorDetails: errorDetails,
        screenshotPath: screenshotPath,
        timestamp: runDateTime,
        duration: Math.round(duration / 1000000), // Convert nanoseconds to milliseconds
      });
    }
  }
  
  return {
    runDateTime,
    environmentName: env.toUpperCase(),
    environmentBaseUrl: baseUrl,
    executedByUser: username,
    userProfile: userProfile,
    tests,
  };
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const cucumberJsonFile = args[0] || path.join(__dirname, '../reports/json/cucumber-report.json');
  const outputFile = args[1] || path.join(__dirname, '../reports/test-results.json');
  
  // Load environment variables - try multiple locations
  const env = process.env.ENV || 'qa';
  const envConfigPath = path.resolve(__dirname, '../src/config/env', `.env.${env}`);
  const configEnvPath = path.resolve(__dirname, '../src/config', `.env.${env}`);
  const rootEnvPath = path.resolve(process.cwd(), `.env.${env}`);
  const baseEnvPath = path.resolve(process.cwd(), '.env');
  
  const envPaths = [envConfigPath, configEnvPath, rootEnvPath, baseEnvPath];
  let envLoaded = false;
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: true });
      console.log(`📁 Loaded environment from: ${path.relative(process.cwd(), envPath)}`);
      envLoaded = true;
      break;
    }
  }
  if (!envLoaded) {
    console.log(`⚠️  No environment file found for ${env}, using process.env only`);
  }
  
  console.log(`📊 Converting Cucumber JSON to Test Results format`);
  console.log(`📁 Reading: ${cucumberJsonFile}`);
  
  if (!fs.existsSync(cucumberJsonFile)) {
    console.error(`❌ Error: Cucumber JSON file not found: ${cucumberJsonFile}`);
    console.log(`💡 Tip: Run tests first to generate cucumber-report.json`);
    process.exit(1);
  }
  
  try {
    const jsonContent = fs.readFileSync(cucumberJsonFile, 'utf-8');
    const cucumberJson: CucumberFeature[] = JSON.parse(jsonContent);
    
    const testResults = convertCucumberToTestResults(cucumberJson);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputFile);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write test results JSON
    fs.writeFileSync(outputFile, JSON.stringify(testResults, null, 2));
    
    console.log(`\n✅ Conversion complete!`);
    console.log(`📄 Test results written to: ${outputFile}`);
    console.log(`📊 Total tests: ${testResults.tests.length}`);
    console.log(`   - Passed: ${testResults.tests.filter(t => t.status === 'PASSED').length}`);
    console.log(`   - Failed: ${testResults.tests.filter(t => t.status === 'FAILED').length}`);
    console.log(`   - Skipped: ${testResults.tests.filter(t => t.status === 'SKIPPED').length}`);
    console.log(`\n💡 Next step: Run 'npm run report:test' to generate test-report.html`);
    
  } catch (error: any) {
    console.error(`❌ Error converting report: ${error.message}`);
    if (error instanceof SyntaxError) {
      console.error(`   Invalid JSON format in ${cucumberJsonFile}`);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { convertCucumberToTestResults };

