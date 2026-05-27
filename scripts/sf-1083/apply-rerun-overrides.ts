/**
 * SF-1083 — patch a primary cucumber.json with results from a rerun cucumber.json.
 *
 * Use case: the long API run had 2 scenarios fail with transient JWT/network
 * errors. Re-running just those 2 scenarios produced a small JSON; this script
 * replaces those scenarios in the original JSON so the report shows the final
 * state without double-counting.
 *
 * Match key: feature.uri + element.line (scenario outlines: line of the
 * Examples row, which is unique per scenario instance in cucumber-js output).
 *
 * Usage:
 *   npx ts-node scripts/sf-1083/apply-rerun-overrides.ts \
 *     --primary reports/sf-1083/cucumber-api-2026-05-11.json \
 *     --override reports/sf-1083/cucumber-api-rerun-2026-05-11.json \
 *     --output reports/sf-1083/cucumber-api-2026-05-11-final.json
 */
import * as fs from 'fs';
import * as path from 'path';

interface Element {
  line?: number;
  name?: string;
  type?: string;
  steps?: unknown[];
}
interface Feature {
  uri?: string;
  name?: string;
  elements?: Element[];
}

interface Args {
  primary: string;
  override: string;
  output: string;
}

function parseArgs(argv: string[]): Args {
  const args: Args = { primary: '', override: '', output: '' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--primary') args.primary = argv[++i];
    else if (a === '--override') args.override = argv[++i];
    else if (a === '--output') args.output = argv[++i];
  }
  if (!args.primary || !args.override || !args.output) {
    console.error('Usage: --primary <p.json> --override <r.json> --output <out.json>');
    process.exit(2);
  }
  return args;
}

function loadJson(p: string): Feature[] {
  const raw = fs.readFileSync(path.resolve(p), 'utf-8');
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error(`${p} is not a cucumber-json array`);
  return parsed as Feature[];
}

function elementKey(uri: string, e: Element): string {
  return `${uri}::${e.line ?? -1}::${e.name ?? ''}`;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const primary = loadJson(args.primary);
  const overrides = loadJson(args.override);

  const overrideByKey = new Map<string, Element>();
  for (const f of overrides) {
    const uri = f.uri || '';
    for (const e of f.elements || []) {
      // Only override actual scenarios (not Background / etc).
      if (e.type === 'scenario' || !e.type) {
        overrideByKey.set(elementKey(uri, e), e);
      }
    }
  }
  console.log(`[override] indexed ${overrideByKey.size} scenarios from ${args.override}`);

  let replaced = 0;
  for (const f of primary) {
    const uri = f.uri || '';
    const newElements: Element[] = [];
    for (const e of f.elements || []) {
      const key = elementKey(uri, e);
      const repl = overrideByKey.get(key);
      if (repl && (e.type === 'scenario' || !e.type)) {
        newElements.push(repl);
        replaced++;
      } else {
        newElements.push(e);
      }
    }
    f.elements = newElements;
  }
  console.log(`[override] replaced ${replaced} scenario(s) in primary`);

  fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
  fs.writeFileSync(path.resolve(args.output), JSON.stringify(primary, null, 2), 'utf-8');
  console.log(`[override] wrote ${args.output}`);
}

main();
