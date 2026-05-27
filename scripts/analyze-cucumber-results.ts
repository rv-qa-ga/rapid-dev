#!/usr/bin/env ts-node
/**
 * Analyze Cucumber test results from HTML or JSON report.
 * Prints summary: passed/failed/skipped counts and failed scenario details.
 *
 * Usage:
 *   ts-node scripts/analyze-cucumber-results.ts
 *   ts-node scripts/analyze-cucumber-results.ts reports/html/cucumber-report.html
 */

import * as fs from 'fs';
import * as path from 'path';

const htmlPath = path.resolve(process.cwd(), process.argv[2] || 'reports/html/cucumber-report.html');
const jsonPath = path.resolve(process.cwd(), 'reports/json/cucumber-report.json');

interface CucumberMessage {
  pickle?: { id: string; name: string; uri: string };
  testCaseStarted?: { id: string; pickleId: string };
  testCaseFinished?: { testCaseStartedId: string; result: { status: string; duration?: { seconds: number; nanos: number }; message?: string }; willBeRetried: boolean };
  testStepFinished?: { testCaseStartedId: string; result: { status: string; message?: string } };
}

function parseHtmlReport(filePath: string): CucumberMessage[] {
  const html = fs.readFileSync(filePath, 'utf-8');
  const match = html.match(/window\.CUCUMBER_MESSAGES\s*=\s*(\[[\s\S]*?\]);/);
  if (!match) {
    throw new Error('Could not find CUCUMBER_MESSAGES in HTML');
  }
  return JSON.parse(match[1]) as CucumberMessage[];
}

function analyzeMessages(messages: CucumberMessage[]): void {
  const pickles = new Map<string, { name: string; uri: string }>();
  const testCaseToPickle = new Map<string, string>();
  const results: { name: string; uri: string; status: string; durationNs?: number; message?: string }[] = [];

  for (const msg of messages) {
    if (msg.pickle) {
      pickles.set(msg.pickle.id, { name: msg.pickle.name, uri: msg.pickle.uri });
    }
    if (msg.testCaseStarted) {
      testCaseToPickle.set(msg.testCaseStarted.id, msg.testCaseStarted.pickleId);
    }
    if (msg.testCaseFinished && msg.testCaseFinished.result) {
      const pickleId = testCaseToPickle.get(msg.testCaseFinished.testCaseStartedId);
      const info = pickleId ? pickles.get(pickleId) : null;
      const name = info?.name ?? 'Unknown';
      const uri = info?.uri ?? '';
      const result = msg.testCaseFinished.result;
      const durationNs = result.duration
        ? result.duration.seconds * 1e9 + result.duration.nanos
        : undefined;
      results.push({
        name,
        uri,
        status: result.status,
        durationNs,
        message: result.message,
      });
    }
  }

  const passed = results.filter((r) => r.status === 'PASSED');
  const failed = results.filter((r) => r.status === 'FAILED');
  const skipped = results.filter((r) => r.status === 'SKIPPED' || r.status === 'SKIPPED_BY_DEFINITION');
  const other = results.filter((r) => !['PASSED', 'FAILED', 'SKIPPED', 'SKIPPED_BY_DEFINITION'].includes(r.status));

  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  CUCUMBER TEST RESULTS SUMMARY');
  console.log('═══════════════════════════════════════════════════════════\n');
  console.log(`  Total scenarios: ${results.length}`);
  console.log(`  Passed:          ${passed.length}`);
  console.log(`  Failed:          ${failed.length}`);
  console.log(`  Skipped:         ${skipped.length}`);
  if (other.length) console.log(`  Other:           ${other.length}`);
  console.log('');

  if (failed.length > 0) {
    console.log('  FAILED SCENARIOS:');
    console.log('  ─────────────────────────────────────────────────────');
    failed.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name}`);
      if (r.message) {
        const firstLine = r.message.split('\n')[0].trim();
        console.log(`     ${firstLine.substring(0, 100)}${firstLine.length > 100 ? '...' : ''}`);
      }
    });
    console.log('');
  }

  const totalSec = results.reduce((s, r) => s + (r.durationNs ?? 0) / 1e9, 0);
  console.log(`  Total duration: ${totalSec.toFixed(1)}s`);
  console.log('═══════════════════════════════════════════════════════════\n');
}

function main() {
  if (fs.existsSync(htmlPath)) {
    console.log(`Reading: ${htmlPath}`);
    const messages = parseHtmlReport(htmlPath);
    analyzeMessages(messages);
    return;
  }
  if (fs.existsSync(jsonPath)) {
    console.log(`Reading: ${jsonPath}`);
    const raw = fs.readFileSync(jsonPath, 'utf-8').trim();
    if (raw.length === 0) {
      console.error('Cucumber JSON report is empty. Run tests first.');
      process.exit(1);
    }
    const data = JSON.parse(raw);
    if (Array.isArray(data)) {
      analyzeMessages(data as CucumberMessage[]);
      return;
    }
    if (data && Array.isArray(data.features)) {
      let total = 0;
      let passed = 0;
      let failed = 0;
      const failedScenarios: { name: string; error?: string }[] = [];
      for (const f of data.features) {
        for (const el of f.elements || []) {
          if (el.type !== 'scenario') continue;
          total++;
          const scenarioFailed = (el.steps || []).some((s: any) => s.result?.status === 'failed');
          if (scenarioFailed) {
            failed++;
            const failedStep = (el.steps || []).find((s: any) => s.result?.status === 'failed');
            failedScenarios.push({
              name: el.name,
              error: failedStep?.result?.error_message,
            });
          } else {
            passed++;
          }
        }
      }
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('  CUCUMBER TEST RESULTS SUMMARY (JSON format)');
      console.log('═══════════════════════════════════════════════════════════\n');
      console.log(`  Total scenarios: ${total}`);
      console.log(`  Passed:          ${passed}`);
      console.log(`  Failed:          ${failed}`);
      console.log('');
      if (failedScenarios.length > 0) {
        console.log('  FAILED SCENARIOS:');
        failedScenarios.forEach((s, i) => {
          console.log(`  ${i + 1}. ${s.name}`);
          if (s.error) console.log(`     ${(s.error as string).split('\n')[0].substring(0, 120)}...`);
        });
      }
      console.log('═══════════════════════════════════════════════════════════\n');
      return;
    }
  }
  console.error(`No report found at ${htmlPath} or ${jsonPath}`);
  console.error('Run tests first, e.g.: npm run test:feature -- src/features/ui/SF/SF-467-mode1.feature --tags "@SF-467"');
  process.exit(1);
}

main();
