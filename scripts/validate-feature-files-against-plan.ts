/**
 * Validate feature files against test plan scenarios
 * Ensures all scenarios from test plan are correctly implemented in feature files
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestScenario {
  testId: string;
  title: string;
  tags: string[];
  steps: string[];
  prerequisites?: string[];
}

interface FeatureFile {
  path: string;
  scenarios: TestScenario[];
}

function parseTestPlan(testPlanPath: string): Map<string, TestScenario[]> {
  const content = fs.readFileSync(testPlanPath, 'utf-8');
  const scenarios = new Map<string, TestScenario[]>();
  
  let currentWorkItem: string | null = null;
  let currentScenario: TestScenario | null = null;
  let inSteps = false;
  let inPrerequisites = false;
  
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect work item
    if (line.startsWith('### ST-')) {
      const match = line.match(/### (ST-\d+):/);
      if (match) {
        currentWorkItem = match[1];
        scenarios.set(currentWorkItem, []);
      }
      continue;
    }
    
    // Detect scenario
    if (line.startsWith('#### Scenario')) {
      if (currentScenario && currentWorkItem) {
        scenarios.get(currentWorkItem)!.push(currentScenario);
      }
      
      const testIdMatch = line.match(/Test ID:.*`(@[\w-]+)`/);
      const titleMatch = line.match(/Scenario \d+: (.+)/);
      
      currentScenario = {
        testId: testIdMatch ? testIdMatch[1] : '',
        title: titleMatch ? titleMatch[1] : '',
        tags: [],
        steps: [],
        prerequisites: []
      };
      inSteps = false;
      inPrerequisites = false;
      continue;
    }
    
    // Detect tags
    if (line.startsWith('**Tags:**') && currentScenario) {
      const tagsMatch = line.match(/`([^`]+)`/);
      if (tagsMatch) {
        currentScenario.tags = tagsMatch[1].split(/\s+/).filter(t => t);
      }
      continue;
    }
    
    // Detect prerequisites
    if (line.startsWith('**Prerequisites:**') && currentScenario) {
      inPrerequisites = true;
      inSteps = false;
      continue;
    }
    
    // Detect steps
    if (line.startsWith('**Steps:**') && currentScenario) {
      inSteps = true;
      inPrerequisites = false;
      continue;
    }
    
    // Collect prerequisites
    if (inPrerequisites && line.startsWith('-') && currentScenario) {
      currentScenario.prerequisites!.push(line.substring(1).trim());
      continue;
    }
    
    // Collect steps
    if (inSteps && /^\d+\./.test(line) && currentScenario) {
      currentScenario.steps.push(line.replace(/^\d+\.\s*/, '').trim());
      continue;
    }
    
    // Stop collecting if we hit a new section
    if (line.startsWith('**Expected Result:**') || line.startsWith('---')) {
      inSteps = false;
      inPrerequisites = false;
    }
  }
  
  // Add last scenario
  if (currentScenario && currentWorkItem) {
    scenarios.get(currentWorkItem)!.push(currentScenario);
  }
  
  return scenarios;
}

function parseFeatureFile(featurePath: string): TestScenario[] {
  const content = fs.readFileSync(featurePath, 'utf-8');
  const scenarios: TestScenario[] = [];
  
  const lines = content.split('\n');
  let currentScenario: TestScenario | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect scenario
    if (line.trim().startsWith('Scenario:')) {
      if (currentScenario) {
        scenarios.push(currentScenario);
      }
      
      const titleMatch = line.match(/Scenario:\s*(.+)/);
      currentScenario = {
        testId: '',
        title: titleMatch ? titleMatch[1].trim() : '',
        tags: [],
        steps: []
      };
      continue;
    }
    
    // Detect tags (on line before Scenario)
    if (line.includes('@') && currentScenario === null) {
      const tagMatch = line.match(/(@[\w-]+)/g);
      if (tagMatch) {
        // Store tags for next scenario
        const lastScenario = scenarios[scenarios.length - 1];
        if (lastScenario) {
          lastScenario.tags.push(...tagMatch);
        }
      }
    }
    
    // Detect tags in scenario line
    if (line.includes('@') && currentScenario) {
      const tagMatch = line.match(/(@[\w-]+)/g);
      if (tagMatch) {
        currentScenario.tags.push(...tagMatch);
      }
    }
    
    // Collect steps
    if (currentScenario && (line.trim().startsWith('Given') || 
                           line.trim().startsWith('When') || 
                           line.trim().startsWith('Then') ||
                           line.trim().startsWith('And'))) {
      currentScenario.steps.push(line.trim());
    }
  }
  
  // Add last scenario
  if (currentScenario) {
    scenarios.push(currentScenario);
  }
  
  return scenarios;
}

function compareScenarios(planScenario: TestScenario, featureScenario: TestScenario): {
  match: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  // Check test ID
  if (planScenario.testId && !featureScenario.tags.includes(planScenario.testId)) {
    issues.push(`Missing test ID tag: ${planScenario.testId}`);
  }
  
  // Check title similarity
  const planTitleLower = planScenario.title.toLowerCase();
  const featureTitleLower = featureScenario.title.toLowerCase();
  if (!featureTitleLower.includes(planTitleLower.substring(0, 20))) {
    issues.push(`Title mismatch: "${planScenario.title}" vs "${featureScenario.title}"`);
  }
  
  // Check tags
  for (const tag of planScenario.tags) {
    if (!featureScenario.tags.includes(tag)) {
      issues.push(`Missing tag: ${tag}`);
    }
  }
  
  // Check step count (approximate)
  if (planScenario.steps.length > featureScenario.steps.length) {
    issues.push(`Feature file has fewer steps (${featureScenario.steps.length}) than test plan (${planScenario.steps.length})`);
  }
  
  return {
    match: issues.length === 0,
    issues
  };
}

async function main() {
  const testPlanPath = path.join(process.cwd(), 'docs/test-plans/ST-191-ST-241-ST-242-TEST-PLAN.md');
  const featureFiles = [
    { workItem: 'ST-191', path: 'src/features/ui/ST/ST-191.feature' },
    { workItem: 'ST-241', path: 'src/features/ui/ST/ST-241.feature' },
    { workItem: 'ST-242', path: 'src/features/ui/ST/ST-242.feature' }
  ];
  
  console.log('\n╔══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   VALIDATING FEATURE FILES AGAINST TEST PLAN                                 ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════╝\n');
  
  const planScenarios = parseTestPlan(testPlanPath);
  
  let totalIssues = 0;
  
  for (const featureFile of featureFiles) {
    const fullPath = path.join(process.cwd(), featureFile.path);
    
    if (!fs.existsSync(fullPath)) {
      console.log(`❌ Feature file not found: ${featureFile.path}`);
      continue;
    }
    
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📋 Validating: ${featureFile.workItem}`);
    console.log(`   File: ${featureFile.path}`);
    console.log(`${'='.repeat(80)}\n`);
    
    const planScenariosForWorkItem = planScenarios.get(featureFile.workItem) || [];
    const featureScenarios = parseFeatureFile(fullPath);
    
    console.log(`📊 Test Plan Scenarios: ${planScenariosForWorkItem.length}`);
    console.log(`📊 Feature File Scenarios: ${featureScenarios.length}\n`);
    
    if (planScenariosForWorkItem.length !== featureScenarios.length) {
      console.log(`⚠️  Scenario count mismatch!\n`);
      totalIssues++;
    }
    
    // Match scenarios by test ID or order
    for (let i = 0; i < planScenariosForWorkItem.length; i++) {
      const planScenario = planScenariosForWorkItem[i];
      const featureScenario = featureScenarios[i] || { testId: '', title: 'NOT FOUND', tags: [], steps: [] };
      
      console.log(`\n🔍 Scenario ${i + 1}: ${planScenario.title}`);
      console.log(`   Test ID: ${planScenario.testId}`);
      
      const comparison = compareScenarios(planScenario, featureScenario);
      
      if (comparison.match) {
        console.log(`   ✅ Matches test plan`);
      } else {
        console.log(`   ❌ Issues found:`);
        comparison.issues.forEach(issue => {
          console.log(`      - ${issue}`);
          totalIssues++;
        });
      }
      
      console.log(`   Steps in plan: ${planScenario.steps.length}`);
      console.log(`   Steps in feature: ${featureScenario.steps.length}`);
    }
  }
  
  console.log(`\n\n╔══════════════════════════════════════════════════════════════════════════════╗`);
  console.log(`║   SUMMARY                                                                      ║`);
  console.log(`╚══════════════════════════════════════════════════════════════════════════════╝\n`);
  
  if (totalIssues === 0) {
    console.log(`✅ All feature files match the test plan!`);
  } else {
    console.log(`⚠️  Found ${totalIssues} issue(s) that need attention.`);
  }
  
  console.log();
}

main().catch(console.error);
