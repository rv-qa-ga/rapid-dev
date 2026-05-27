/**
 * SF-1083 — merge multiple cucumber.json files into a single combined file.
 *
 * Cucumber JSON is an array of features at the top level, so merging is just
 * concatenation. Used by the SF-1083 workflow to combine the API and UI runs
 * into one source for the HTML report.
 *
 * Usage:
 *   npx ts-node scripts/sf-1083/merge-cucumber-jsons.ts \
 *     --inputs reports/sf-1083/cucumber.api.json reports/sf-1083/cucumber.ui.json \
 *     --output reports/sf-1083/cucumber.json
 */
import * as fs from 'fs';
import * as path from 'path';

interface Args {
  inputs: string[];
  output: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { inputs: [], output: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--inputs') {
      while (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args.inputs.push(argv[++i]);
      }
    } else if (a === '--output') {
      args.output = argv[++i];
    }
  }
  if (!args.output || args.inputs.length === 0) {
    console.error(
      'Usage: --inputs <file1.json> <file2.json> ... --output <combined.json>'
    );
    process.exit(2);
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const merged: unknown[] = [];
  for (const input of args.inputs) {
    const abs = path.resolve(input);
    if (!fs.existsSync(abs)) {
      console.warn(`[merge] skipping (not found): ${abs}`);
      continue;
    }
    const raw = fs.readFileSync(abs, 'utf-8');
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e: any) {
      console.error(`[merge] failed to parse ${abs}: ${e?.message || e}`);
      process.exit(3);
    }
    if (!Array.isArray(parsed)) {
      console.error(`[merge] ${abs} is not a cucumber-json array; got ${typeof parsed}`);
      process.exit(4);
    }
    console.log(`[merge] ${abs}: ${parsed.length} feature(s)`);
    merged.push(...(parsed as unknown[]));
  }

  const outAbs = path.resolve(args.output);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, JSON.stringify(merged, null, 2), 'utf-8');
  console.log(`[merge] wrote ${outAbs} (${merged.length} feature(s))`);
}

main();
