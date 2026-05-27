/**
 * Generate RBT feature files from "Jira Sprint 101.xlsx".
 * Excludes: Cancelled/Done list; stories that already have feature files.
 * Output: src/features/ui/SF/SF-XXX.feature and src/features/api/SF/SF-XXX.feature
 */
import * as fs from 'fs';
import * as path from 'path';
import ExcelJS from 'exceljs';

const EXCEL_PATH = path.join(process.cwd(), 'data', 'excel', 'Jira Sprint 101.xlsx');
const UI_DIR = path.join(process.cwd(), 'src', 'features', 'ui', 'SF');
const API_DIR = path.join(process.cwd(), 'src', 'features', 'api', 'SF');

const CANCELLED_OR_DONE = new Set(['SF-669', 'SF-41', 'SF-894', 'SF-893', 'SF-860', 'SF-618', 'SF-527', 'SF-488']);

interface ParsedStory {
  key: string;
  summary: string;
  description: string;
  asA: string;
  iWant: string;
  soThat: string;
  background: string[];
  scenarios: { title: string; steps: string[] }[];
}

function existingFeatureKeys(): Set<string> {
  const keys = new Set<string>();
  for (const dir of [UI_DIR, API_DIR]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      const m = f.match(/^SF-(\d+)\.feature$/);
      if (m) keys.add(`SF-${m[1]}`);
    }
  }
  return keys;
}

function parseDescription(key: string, summary: string, desc: string): ParsedStory {
  const text = (desc || '').replace(/\r\n/g, '\n').trim();
  let asA = 'user';
  let iWant = summary;
  let soThat = 'acceptance criteria are met';

  const asMatch = text.match(/As (?:an?|a)\s+(.+?)(?=\s+I want|\n\n|$)/is);
  if (asMatch) asA = asMatch[1].replace(/\*+/g, '').trim();

  const wantMatch = text.match(/I want\s+(.+?)(?=\s+So that|\n\n|$)/is);
  if (wantMatch) iWant = wantMatch[1].replace(/\*+/g, '').trim();

  const soMatch = text.match(/So that\s+(.+?)(?=\s*\n\s*\n\s*\*|h2\.|\n\n\n|$)/is);
  if (soMatch) soThat = soMatch[1].replace(/\*+/g, '').trim();

  const background: string[] = [];
  const scenarios: { title: string; steps: string[] }[] = [];

  const scenarioBlockRegex = /(?:\*Scenario\s*(\d+)\s*:\s*([^*\n]+)\*|h2\.\s*Scenario\s*(\d+)\s*:\s*([^\n]+)|Scenario\s*(\d+)\s*:\s*([^\n]+))[\s\S]*?(?=(?:\*Scenario\s*\d+|h2\.\s*Scenario\s*\d+|Scenario\s*\d+:|$))/gi;
  let bgMatch = text.match(/(?:\*Background\*|h2\.\s*Background:?)\s*([\s\S]*?)(?=\*Scenario|h2\.\s*Scenario|Scenario\s*\d+:|$)/i);
  if (bgMatch) {
    const bgText = bgMatch[1].trim();
    bgText.split(/\n/).forEach((line) => {
      const t = line.replace(/^\s*[-*]\s*/, '').trim();
      if (t && (t.startsWith('Given') || t.startsWith('And') || t.startsWith('When') || t.startsWith('Then'))) {
        background.push(t);
      } else if (t && /^(Given|And|When|Then)\s+/i.test(t)) {
        background.push(t);
      }
    });
  }

  let scenarioMatch;
  const scenarioRegex = /(?:\*Scenario\s*(\d+)\s*:\s*([^*\n]+)\*|h2\.\s*Scenario\s*(\d+)\s*:\s*([^\n]+)|Scenario\s*(\d+)\s*:\s*([^\n]+))\s*([\s\S]*?)(?=(?:\*Scenario\s*\d+|h2\.\s*Scenario\s*\d+|Scenario\s*\d+:|$))/gi;
  while ((scenarioMatch = scenarioRegex.exec(text)) !== null) {
    const n = scenarioMatch[1] || scenarioMatch[3] || scenarioMatch[5];
    const title = (scenarioMatch[2] || scenarioMatch[4] || scenarioMatch[6] || '').trim();
    const body = (scenarioMatch[7] || '').trim();
    const steps: string[] = [];
    body.split(/\n/).forEach((line) => {
      const t = line.replace(/^\s*[-*]\s*/, '').trim();
      if (/^(Given|When|Then|And|But)\s+/i.test(t)) steps.push(t);
    });
    if (title || steps.length) scenarios.push({ title: title || `Scenario ${n}`, steps });
  }

  if (scenarios.length === 0 && text.includes('Given')) {
    const gwt = text.match(/((?:Given|When|Then|And)[\s\S]*?)(?=\n\n\n|$)/i);
    if (gwt) {
      const steps = gwt[1].split(/\n/).map((s) => s.trim()).filter((s) => /^(Given|When|Then|And)\s+/i.test(s));
      if (steps.length) scenarios.push({ title: 'Main scenario', steps });
    }
  }

  if (scenarios.length === 0) {
    scenarios.push({
      title: 'Story acceptance criteria',
      steps: [
        'Given the system is set up for ' + key,
        'When the user performs the required actions',
        'Then the expected outcome per story description is verified',
      ],
    });
  }

  return { key, summary, description: desc, asA, iWant, soThat, background, scenarios };
}

function escapeFeature(s: string): string {
  return (s || '').replace(/\n/g, ' ').slice(0, 200).trim();
}

function toGherkinStep(line: string): string {
  const t = line.trim();
  if (/^(Given|When|Then|And|But)\s+/i.test(t)) return t;
  if (t.toLowerCase().startsWith('given')) return t;
  if (t.toLowerCase().startsWith('when')) return t;
  if (t.toLowerCase().startsWith('then')) return t;
  if (t.toLowerCase().startsWith('and')) return t;
  return `And ${t}`;
}

function generateUIFeature(story: ParsedStory): string {
  const key = story.key;
  const safeSummary = escapeFeature(story.summary);
  const commentSummary = safeSummary.replace(/\s+/g, ' ').slice(0, 120);
  let out = `# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ${key} - ${commentSummary}
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @${key} @rbt @medium
Feature: UI - ${key} - ${safeSummary}
  As ${story.asA}
  I want ${escapeFeature(story.iWant)}
  So that ${escapeFeature(story.soThat)}

  Background:
    Given I am logged in as a "QA MRD User" user
`;
  if (story.background.length) {
    story.background.slice(0, 6).forEach((b) => {
      out += `    ${toGherkinStep(b)}\n`;
    });
  }

  out += `  # ══════════════════════════════════════════════════════════════════════════\n  # RBT - UI SCENARIOS\n  # ══════════════════════════════════════════════════════════════════════════\n\n`;

  story.scenarios.forEach((sc, i) => {
    const scenarioNum = i + 1;
    const tag = `@${key} @${key}-UI-${String(scenarioNum).padStart(3, '0')} @p1 @rbt`;
    const title = escapeFeature(sc.title) || `Scenario ${scenarioNum}`;
    out += `  ${tag}\n  Scenario: ${title}\n`;
    (sc.steps.length ? sc.steps : ['Given the story context is set', 'When the user performs the action', 'Then the expected outcome is verified']).forEach((step) => {
      out += `    ${toGherkinStep(step)}\n`;
    });
    out += `    And I take a screenshot as evidence\n\n`;
  });

  return out;
}

function generateAPIFeature(story: ParsedStory): string {
  const key = story.key;
  const safeSummary = escapeFeature(story.summary);
  const commentSummary = safeSummary.replace(/\s+/g, ' ').slice(0, 120);
  let out = `# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ${key} - ${commentSummary}
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @${key} @rbt @medium
Feature: API - ${key} - ${safeSummary}
  API must support the behaviour described in the story (${key}).

  Background:
    Given I have a valid Salesforce API token
`;

  out += `  # ══════════════════════════════════════════════════════════════════════════\n  # RBT - API SMOKE (minimal)\n  # ══════════════════════════════════════════════════════════════════════════\n\n`;

  const firstScenario = story.scenarios[0];
  const steps = firstScenario?.steps || [];
  const givenSteps = steps.filter((s) => /^Given\s+/i.test(s));
  const whenStep = steps.find((s) => /^When\s+/i.test(s));
  const thenSteps = steps.filter((s) => /^Then\s+/i.test(s));

  out += `  @${key} @${key}-API-001 @p1 @smoke @rbt\n  Scenario: API - ${escapeFeature(firstScenario?.title || 'Main flow')}\n`;
  if (givenSteps.length) givenSteps.slice(0, 3).forEach((s) => { out += `    ${s}\n`; });
  else out += `    Given the system is configured for ${key}\n`;
  if (whenStep) out += `    ${whenStep}\n`;
  else out += `    When the API is invoked for ${key}\n`;
  if (thenSteps.length) thenSteps.slice(0, 3).forEach((s) => { out += `    ${s}\n`; });
  else out += `    Then the API must return success or the expected outcome\n`;

  if (story.scenarios.length > 1) {
    out += `\n  @${key} @${key}-API-002 @p2 @rbt\n  Scenario: API - Alternative or negative path\n`;
    out += `    Given the system is configured for ${key}\n`;
    out += `    When an alternative or invalid request is made\n`;
    out += `    Then the API must respond appropriately\n`;
  }

  return out;
}

function parseWorkItemsArg(): Set<string> {
  const argv = process.argv.slice(2);
  const set = new Set<string>();
  let i = argv.indexOf('--work-items');
  if (i === -1) i = argv.indexOf('--work-item');
  if (i >= 0) {
    for (i = i + 1; i < argv.length; i++) {
      const val = argv[i];
      if (val.startsWith('--')) break;
      if (val.includes(',')) val.split(',').map((k) => k.trim()).filter(Boolean).forEach((k) => set.add(k));
      else if (/^[A-Z]+-\d+$/.test(val.trim())) set.add(val.trim());
    }
  }
  for (const arg of argv) {
    if (arg.startsWith('--work-items=')) arg.split('=')[1].split(',').map((k) => k.trim()).filter(Boolean).forEach((k) => set.add(k));
    if (arg.startsWith('--work-item=')) set.add(arg.split('=')[1].trim());
  }
  return set;
}

async function main() {
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error('Excel not found:', EXCEL_PATH);
    process.exit(1);
  }

  const onlyKeys = parseWorkItemsArg();
  const regenerateMode = onlyKeys.size > 0;

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(EXCEL_PATH);
  const sheet = workbook.getWorksheet('Jira') || workbook.worksheets[0];
  if (!sheet) {
    console.error('No sheet found');
    process.exit(1);
  }

  const existing = existingFeatureKeys();
  const rows: { key: string; summary: string; description: string }[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const cells: unknown[] = [];
    row.eachCell({ includeEmpty: true }, (c) => cells.push(c.value));
    const key = String(cells[1] || '').trim();
    const summary = String(cells[2] || '').trim();
    const description = String(cells[3] || '').trim();
    if (!key || !/^SF-\d+$/.test(key)) return;
    if (CANCELLED_OR_DONE.has(key)) return;
    if (regenerateMode) {
      if (!onlyKeys.has(key)) return;
    } else {
      if (existing.has(key)) return;
    }
    rows.push({ key, summary, description });
  });

  if (regenerateMode) {
    console.log(`Regenerating RBT for ${rows.length} work item(s) from Excel (overwrite): ${[...onlyKeys].join(', ')}.\n`);
  } else {
    console.log(`Generating RBT for ${rows.length} stories (excluded: 8 Cancelled/Done, ${existing.size} existing feature files).\n`);
  }

  for (const row of rows) {
    const story = parseDescription(row.key, row.summary, row.description);
    const uiPath = path.join(UI_DIR, `${story.key}.feature`);
    const apiPath = path.join(API_DIR, `${story.key}.feature`);
    fs.mkdirSync(UI_DIR, { recursive: true });
    fs.mkdirSync(API_DIR, { recursive: true });
    fs.writeFileSync(uiPath, generateUIFeature(story), 'utf8');
    fs.writeFileSync(apiPath, generateAPIFeature(story), 'utf8');
    console.log(`  ${story.key}: ${story.summary.slice(0, 50)}... (${story.scenarios.length} scenarios)`);
  }

  console.log(`\nDone. ${regenerateMode ? 'Regenerated' : 'Created'} ${rows.length * 2} feature files (UI + API).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
