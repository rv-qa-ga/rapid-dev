#!/usr/bin/env ts-node
/**
 * Split combined Cucumber JSON (e.g. reports/json/cucumber-report.json) by Jira-style tag
 * (@SF-593, @SF-1081) and generate test-results.json + test-report.html per work item.
 *
 * Usage:
 *   npx ts-node scripts/generate-per-work-item-reports-from-cucumber.ts
 *   npx ts-node scripts/generate-per-work-item-reports-from-cucumber.ts --input path/to.json --out reports/work-item-runs
 */
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { convertCucumberToTestResults } from './convert-cucumber-to-test-results';

type CucumberFeature = {
  uri?: string;
  name?: string;
  tags?: { name: string }[];
  elements?: Array<{ type?: string; keyword?: string; tags?: { name: string }[]; [k: string]: unknown }>;
};

function normTag(t: string): string {
  return t.startsWith('@') ? t : `@${t}`;
}

function collectTags(
  feat: CucumberFeature,
  el: NonNullable<CucumberFeature['elements']>[number]
): Set<string> {
  const names = new Set<string>();
  for (const x of feat.tags ?? []) names.add(x.name);
  for (const x of (el as { tags?: { name: string }[] }).tags ?? []) names.add(x.name);
  return names;
}

function filterFeaturesByWorkItemTag(cucumber: CucumberFeature[], workItem: string): CucumberFeature[] {
  const want = normTag(workItem);
  const out: CucumberFeature[] = [];
  for (const feat of cucumber) {
    const elements = feat.elements ?? [];
    const kept = elements.filter((el) => {
      const t = (el.type || '').toLowerCase();
      const kw = (el.keyword || '').toLowerCase();
      if (t === 'background' || kw === 'background') return false;
      if (t !== 'scenario' && kw !== 'scenario') return false;
      return collectTags(feat, el).has(want);
    });
    if (kept.length === 0) continue;
    const backgrounds = elements.filter((el) => {
      const t = (el.type || '').toLowerCase();
      const kw = (el.keyword || '').toLowerCase();
      return t === 'background' || kw === 'background';
    });
    out.push({
      ...feat,
      elements: [...backgrounds, ...kept],
    });
  }
  return out;
}

function main(): void {
  const root = path.join(__dirname, '..');
  let input = path.join(root, 'reports', 'json', 'cucumber-report.json');
  let outBase = path.join(root, 'reports', 'work-item-runs');

  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--input' && argv[i + 1]) {
      input = path.isAbsolute(argv[i + 1]) ? argv[i + 1] : path.join(root, argv[i + 1]);
      i++;
    }
    if (argv[i] === '--out' && argv[i + 1]) {
      outBase = path.isAbsolute(argv[i + 1]) ? argv[i + 1] : path.join(root, argv[i + 1]);
      i++;
    }
  }

  if (!fs.existsSync(input)) {
    console.error(`Missing Cucumber JSON: ${input}`);
    process.exit(1);
  }

  const raw = JSON.parse(fs.readFileSync(input, 'utf8')) as CucumberFeature[];
  if (!Array.isArray(raw)) {
    console.error('Expected Cucumber JSON to be an array of features');
    process.exit(1);
  }

  const workItems = ['SF-593', 'SF-1081'];
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  console.log(`\n📊 Per–work item reports from: ${input}\n`);

  for (const wi of workItems) {
    const wiDir = path.join(outBase, wi);
    fs.mkdirSync(wiDir, { recursive: true });
    const filtered = filterFeaturesByWorkItemTag(raw, wi);
    const cucumberOut = path.join(wiDir, `cucumber-report-${stamp}.json`);
    fs.writeFileSync(cucumberOut, JSON.stringify(filtered, null, 2));
    fs.writeFileSync(path.join(wiDir, 'cucumber-report-latest.json'), JSON.stringify(filtered, null, 2));

    const testResults = convertCucumberToTestResults(filtered as never);
    const testResultsPath = path.join(wiDir, `test-results-${stamp}.json`);
    fs.writeFileSync(testResultsPath, JSON.stringify(testResults, null, 2));
    fs.writeFileSync(path.join(wiDir, 'test-results-latest.json'), JSON.stringify(testResults, null, 2));

    const htmlStamped = path.join(wiDir, `test-report-${stamp}.html`);
    const htmlLatest = path.join(wiDir, 'test-report.html');
    execSync(`npx ts-node "${path.join(root, 'scripts', 'generate-test-report.ts')}" "${testResultsPath}" "${htmlStamped}"`, {
      cwd: root,
      stdio: 'inherit',
    });
    fs.copyFileSync(htmlStamped, htmlLatest);

    const passed = testResults.tests.filter((t) => t.status === 'PASSED').length;
    const failed = testResults.tests.filter((t) => t.status === 'FAILED').length;
    const skipped = testResults.tests.filter((t) => t.status === 'SKIPPED').length;
    console.log(`✅ ${wi}: ${testResults.tests.length} tests — Pass ${passed}, Fail ${failed}, Skip ${skipped}`);
    console.log(`   HTML: ${htmlLatest}`);
    console.log(`   JSON: ${testResultsPath}\n`);
  }

  console.log('Done.\n');
}

main();
