// Merge multiple cucumber JSON reports into one.
// Usage: node scripts/merge-cucumber-reports.js <out> <in1> <in2> [...]

const fs = require('fs');
const path = require('path');

const [, , outPath, ...inputs] = process.argv;

if (!outPath || inputs.length === 0) {
  console.error('Usage: node scripts/merge-cucumber-reports.js <out.json> <in1.json> <in2.json> [...]');
  process.exit(1);
}

const merged = [];
let totalScenarios = 0;
for (const file of inputs) {
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(data)) {
    console.error(`Expected array in ${file}`);
    process.exit(1);
  }
  const scenarios = data.reduce((acc, feat) => acc + (feat.elements ? feat.elements.length : 0), 0);
  console.log(`+ ${path.basename(file)}: ${data.length} feature(s), ${scenarios} scenario(s)`);
  totalScenarios += scenarios;
  merged.push(...data);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(merged, null, 2));

console.log(`\n✅ Merged ${inputs.length} reports -> ${outPath}`);
console.log(`   Features: ${merged.length}`);
console.log(`   Scenarios: ${totalScenarios}`);
