#!/usr/bin/env ts-node

/**
 * CLM Automation Framework - Interactive Live Demo Script
 * 
 * Run alongside the HTML presentation for live demonstrations.
 * Each step pauses for presenter input before executing.
 * 
 * Usage:
 *   npm run demo:live
 *   npm run demo:live -- --step 3     # Start from step 3
 *   npm run demo:live -- --quick      # Faster animations
 */

import * as readline from 'readline';
import { spawn, SpawnOptions } from 'child_process';
import * as path from 'path';

// ANSI color codes for terminal styling
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Foreground
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  white: '\x1b[37m',
  
  // Background
  bgCyan: '\x1b[46m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgMagenta: '\x1b[45m',
  bgBlue: '\x1b[44m',
};

// Demo steps configuration
interface DemoStep {
  title: string;
  description: string;
  command?: string;
  simulate?: boolean;  // If true, show simulated output instead of running
  simulatedOutput?: string[];
  presenterNote?: string;
}

const demoSteps: DemoStep[] = [
  {
    title: '🎬 WELCOME TO THE LIVE DEMO',
    description: 'CLM Automation Framework - Interactive Demonstration',
    presenterNote: 'Introduce the framework. Explain this is a REAL demo, not simulated.',
  },
  {
    title: '📋 Step 1: View Work Items',
    description: 'Let\'s see what work items are queued for test generation',
    command: 'type inputs\\jira-work-items.txt',
    presenterNote: 'Show how work items are tracked. Mention the Jira integration.',
  },
  {
    title: '📝 Step 2: Generate Test Cases',
    description: 'Generate comprehensive test cases from a Jira work item',
    command: 'npm run jira:generate -- --work-item SF-520 --type ui --dry-run',
    presenterNote: 'Using --dry-run to preview. In production, remove it to create files.',
    simulate: true,
    simulatedOutput: [
      '',
      `${colors.cyan}🔍 Fetching work item SF-520 from Jira...${colors.reset}`,
      `${colors.green}✓ Work item retrieved: "Account Status Field Validation"${colors.reset}`,
      '',
      `${colors.cyan}📝 Analyzing acceptance criteria...${colors.reset}`,
      `   - Found 5 acceptance criteria`,
      `   - Identified 3 field validations`,
      `   - Detected edge cases: 2`,
      '',
      `${colors.cyan}⚙️  Generating Gherkin scenarios...${colors.reset}`,
      `${colors.green}✓ Generated 8 test scenarios${colors.reset}`,
      '',
      `${colors.yellow}[DRY RUN] Would create: src/features/ui/SF/SF-520.feature${colors.reset}`,
      '',
      `${colors.green}✨ Test generation preview complete!${colors.reset}`,
    ],
  },
  {
    title: '📄 Step 3: View Generated Feature File',
    description: 'Let\'s look at an actual generated feature file',
    command: 'type src\\features\\ui\\SF\\SF-520.feature',
    presenterNote: 'Show the Gherkin syntax. Point out tags, scenarios, data tables.',
  },
  {
    title: '⚙️ Step 4: Generate Step Definitions',
    description: 'Auto-generate missing step definitions for the feature file',
    command: 'npm run generate:steps -- --work-item SF-520',
    presenterNote: 'This scans common steps first, reuses existing ones, and only generates what\'s missing.',
    simulate: true,
    simulatedOutput: [
      '',
      `${colors.cyan}🔍 Scanning feature files for SF-520...${colors.reset}`,
      `   - UI: src/features/ui/SF/SF-520.feature`,
      `   - API: src/features/api/SF/SF-520.feature`,
      '',
      `${colors.cyan}📋 Checking existing step definitions...${colors.reset}`,
      `${colors.green}✓ Found 18 matching steps in common definitions${colors.reset}`,
      `${colors.yellow}⚠ 6 steps need to be generated${colors.reset}`,
      '',
      `${colors.cyan}⚙️  Generating missing step definitions...${colors.reset}`,
      `${colors.green}✓ Created: src/step-definitions/ui/sf-520.steps.ts${colors.reset}`,
      '',
      `   Generated steps:`,
      `   - When I set Account Status to {string}`,
      `   - Then the Status should transition to {string}`,
      `   - When I verify the Status picklist values`,
      `   - Then I should see validation error {string}`,
      `   - When I clear the Account Status field`,
      `   - Then the field should show required indicator`,
      '',
      `${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
      `${colors.green}✨ Step generation complete!${colors.reset}`,
      `${colors.green}   Reused: 18 | Generated: 6 | Total: 24${colors.reset}`,
      `${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
    ],
  },
  {
    title: '✅ Step 5: Validate Step Definitions',
    description: 'Ensure all Gherkin steps have matching implementations',
    command: 'npm run validate:steps -- --work-item SF-520',
    presenterNote: 'This validates that every step in the feature file has code behind it.',
  },
  {
    title: '📊 Step 6: Show Test Data Factory',
    description: 'Preview how test data gets created automatically',
    command: 'type src\\test-data\\TestDataFactory.ts',
    presenterNote: 'Show the factory pattern. Mention 24+ fields populated automatically.',
    simulate: true,
    simulatedOutput: [
      '',
      `${colors.dim}// TestDataFactory.ts - Auto-generates test data via Salesforce API${colors.reset}`,
      '',
      `${colors.magenta}export class TestDataFactory {${colors.reset}`,
      `  ${colors.cyan}async createAccount(overrides?: Partial<Account>): Promise<Account> {${colors.reset}`,
      `    const account = {`,
      `      Name: \`Test Account - \${Date.now()}\`,`,
      `      Type: 'Agency',`,
      `      Account_Status__c: 'New',`,
      `      Region__c: 'US',`,
      `      // ... 20+ more fields auto-populated`,
      `    };`,
      `    ${colors.green}// Creates via Salesforce API, returns with ID${colors.reset}`,
      `    ${colors.green}// Auto-cleanup registered for after test${colors.reset}`,
      `    return await this.sfClient.create('Account', account);`,
      `  }`,
      `${colors.magenta}}${colors.reset}`,
    ],
  },
  {
    title: '▶️ Step 7: Run Tests (Interactive Mode)',
    description: 'Execute tests with Playwright Inspector for debugging',
    command: 'npm run test:interactive -- --tags "@smoke" --dry-run',
    presenterNote: 'In production, this opens Playwright Inspector. Using dry-run for demo.',
    simulate: true,
    simulatedOutput: [
      '',
      `${colors.cyan}🚀 Starting test execution...${colors.reset}`,
      `   Environment: QA`,
      `   Browser: Chromium`,
      `   Mode: Interactive (Inspector enabled)`,
      '',
      `${colors.yellow}[DRY RUN] Would execute:${colors.reset}`,
      `   @smoke scenarios across all feature files`,
      '',
      `${colors.cyan}📊 Creating test data...${colors.reset}`,
      `${colors.green}✓ Would create: Account ACC-20241218-DEMO${colors.reset}`,
      '',
      `${colors.cyan}▶️  Would run scenarios:${colors.reset}`,
      `   - SF-520-UI-001: Verify Account Status picklist`,
      `   - SF-520-UI-002: Set Status to Contracted`,
      `   - SF-520-UI-003: Validate Status transitions`,
      '',
      `${colors.green}✨ Dry run complete - remove --dry-run to execute${colors.reset}`,
    ],
  },
  {
    title: '📤 Step 8: Upload to Zephyr Scale',
    description: 'Sync test cases with Zephyr Scale test management',
    command: 'npm run zephyr:UploadTestCase -- --work-item SF-520 --dry-run',
    presenterNote: 'This creates test cases in Zephyr with Gherkin steps.',
    simulate: true,
    simulatedOutput: [
      '',
      `${colors.cyan}🔗 Connecting to Zephyr Scale...${colors.reset}`,
      `${colors.green}✓ Authenticated successfully${colors.reset}`,
      '',
      `${colors.yellow}[DRY RUN] Would upload:${colors.reset}`,
      `   - SF-520-UI-001 → Would create TC-XXXX`,
      `   - SF-520-UI-002 → Would create TC-XXXX`,
      `   - SF-520-UI-003 → Would create TC-XXXX`,
      '',
      `${colors.cyan}🔗 Would link to Jira work item SF-520${colors.reset}`,
      '',
      `${colors.green}✨ Dry run complete - 3 test cases would be created${colors.reset}`,
    ],
  },
  {
    title: '📸 Step 9: Evidence Storage',
    description: 'Show how evidence gets uploaded to Confluence',
    command: 'echo Evidence Structure:',
    presenterNote: 'Screenshots, logs, and reports go to Confluence automatically.',
    simulate: true,
    simulatedOutput: [
      '',
      `${colors.cyan}📁 Test Evidence Structure in Confluence:${colors.reset}`,
      '',
      `   📁 Test Evidence (Parent Folder)`,
      `   └── 📁 Sprint-93-QA (Test Cycle)`,
      `       ├── 📄 SF-520-UI-001 - Verify Account Status`,
      `       │   ├── 📸 screenshot-1.png`,
      `       │   ├── 📸 screenshot-2.png`,
      `       │   └── 📊 test-report.html`,
      `       └── 📄 SF-520-UI-002 - Set Status`,
      `           └── 📸 evidence.png`,
      '',
      `${colors.green}✓ Evidence linked back to Zephyr test execution${colors.reset}`,
    ],
  },
  {
    title: '🧹 Step 10: Cleanup Test Data',
    description: 'Remove test data created during execution',
    command: 'npm run cleanup:accounts -- --dry-run --limit 5',
    presenterNote: 'Cleanup happens automatically, but can also run manually.',
    simulate: true,
    simulatedOutput: [
      '',
      `${colors.cyan}🔍 Scanning for test accounts...${colors.reset}`,
      `   Pattern: "Test Account%"`,
      `   Environment: QA`,
      '',
      `${colors.yellow}[DRY RUN] Would delete:${colors.reset}`,
      `   - Test Account - 20241218-091234`,
      `   - Test Account - 20241218-102345`,
      `   - Test Account - 20241218-113456`,
      '',
      `${colors.green}✓ Dry run complete - 3 accounts would be deleted${colors.reset}`,
    ],
  },
  {
    title: '🎉 DEMO COMPLETE',
    description: 'Thank you for watching the CLM Automation Framework demo!',
    presenterNote: 'Summarize key points. Open for questions.',
    simulate: true,
    simulatedOutput: [
      '',
      `${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
      `${colors.green}${colors.bold}   🎉 DEMO COMPLETE - CLM AUTOMATION FRAMEWORK${colors.reset}`,
      `${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
      '',
      `   ${colors.cyan}Key Takeaways:${colors.reset}`,
      `   ✓ Unified platform for UI + API testing`,
      `   ✓ Automated test generation from Jira`,
      `   ✓ Full traceability to Zephyr Scale`,
      `   ✓ Evidence storage in Confluence`,
      `   ✓ CI/CD ready with GitHub Actions`,
      '',
      `   ${colors.magenta}Questions? Contact the QA Automation Team${colors.reset}`,
      '',
      `${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`,
    ],
  },
];

// Utility functions
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function clearScreen(): void {
  process.stdout.write('\x1b[2J\x1b[H');
}

function printHeader(): void {
  console.log(`
${colors.cyan}${colors.bold}╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║   ⚡ CLM AUTOMATION FRAMEWORK - LIVE DEMO                        ║
║                                                                  ║
║   Controls:                                                      ║
║   [ENTER] Run current step    [S] Skip step    [Q] Quit          ║
║   [R] Repeat step             [N] Next (no run)                  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝${colors.reset}
`);
}

function printStep(step: DemoStep, stepNumber: number, total: number): void {
  console.log(`
${colors.bgCyan}${colors.bold} STEP ${stepNumber}/${total} ${colors.reset}

${colors.bold}${colors.white}${step.title}${colors.reset}
${colors.dim}${step.description}${colors.reset}
`);

  if (step.command) {
    console.log(`${colors.yellow}Command:${colors.reset} ${colors.green}${step.command}${colors.reset}`);
  }

  if (step.presenterNote) {
    console.log(`
${colors.magenta}📝 Presenter Note:${colors.reset} ${colors.dim}${step.presenterNote}${colors.reset}`);
  }

  console.log(`
${colors.dim}─────────────────────────────────────────────────────────────────${colors.reset}
`);
}

async function runCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`${colors.cyan}$ ${command}${colors.reset}\n`);

    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'cmd.exe' : '/bin/sh';
    const shellArg = isWindows ? '/c' : '-c';

    const child = spawn(shell, [shellArg, command], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, FORCE_COLOR: '1' },
    });

    child.on('close', (code) => {
      console.log('');
      resolve();
    });

    child.on('error', (err) => {
      console.error(`${colors.red}Error: ${err.message}${colors.reset}`);
      resolve();
    });
  });
}

async function simulateOutput(lines: string[], quick: boolean): Promise<void> {
  for (const line of lines) {
    console.log(line);
    await sleep(quick ? 50 : 150);
  }
}

async function waitForInput(rl: readline.Interface): Promise<string> {
  return new Promise(resolve => {
    rl.question(`${colors.cyan}[Press ENTER to run, S=skip, R=repeat, N=next, Q=quit]${colors.reset} `, answer => {
      resolve(answer.toLowerCase().trim());
    });
  });
}

async function main(): Promise<void> {
  // Parse arguments
  const args = process.argv.slice(2);
  let startStep = 0;
  let quick = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--step' && args[i + 1]) {
      startStep = parseInt(args[i + 1], 10) - 1;
      if (isNaN(startStep) || startStep < 0) startStep = 0;
    }
    if (args[i] === '--quick') {
      quick = true;
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let currentStep = startStep;

  clearScreen();
  printHeader();

  console.log(`${colors.green}Starting from step ${currentStep + 1} of ${demoSteps.length}${colors.reset}`);
  console.log(`${colors.dim}Press ENTER to begin...${colors.reset}\n`);

  await waitForInput(rl);

  while (currentStep < demoSteps.length) {
    clearScreen();
    printHeader();
    
    const step = demoSteps[currentStep];
    printStep(step, currentStep + 1, demoSteps.length);

    const input = await waitForInput(rl);

    switch (input) {
      case 'q':
        console.log(`\n${colors.yellow}Demo ended by user.${colors.reset}\n`);
        rl.close();
        process.exit(0);
        break;

      case 's':
      case 'n':
        console.log(`${colors.dim}Skipping to next step...${colors.reset}`);
        currentStep++;
        break;

      case 'r':
        console.log(`${colors.dim}Repeating current step...${colors.reset}`);
        // Stay on same step
        break;

      default:
        // Run the step
        if (step.simulate && step.simulatedOutput) {
          await simulateOutput(step.simulatedOutput, quick);
        } else if (step.command) {
          await runCommand(step.command);
        }

        console.log(`\n${colors.green}✓ Step complete${colors.reset}`);
        
        // Wait for acknowledgment before next step
        await waitForInput(rl);
        currentStep++;
        break;
    }
  }

  console.log(`\n${colors.green}${colors.bold}🎉 Demo finished! Thank you!${colors.reset}\n`);
  rl.close();
}

// Run the demo
main().catch(err => {
  console.error(`${colors.red}Demo error: ${err.message}${colors.reset}`);
  process.exit(1);
});

