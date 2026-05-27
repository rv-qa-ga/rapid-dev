#!/usr/bin/env node
/**
 * Run a single SF-467-mode1 scenario by number (1-29).
 * Usage: node scripts/run-sf467-scenario.js <number>
 *        npm run test:sf467:one -- 1
 * Sets ENV=qa to avoid interactive prompt.
 */
const num = process.argv[2];
if (!num || isNaN(parseInt(num, 10))) {
  console.error('Usage: node scripts/run-sf467-scenario.js <1-29>');
  console.error('Example: node scripts/run-sf467-scenario.js 1');
  process.exit(1);
}
const n = parseInt(num, 10);
if (n < 1 || n > 29) {
  console.error('Scenario number must be between 1 and 29.');
  process.exit(1);
}
const tag = `@SF-467-UI-${String(n).padStart(3, '0')}`;
process.env.ENV = process.env.ENV || 'qa';
// Make run-tests-with-env see: feature path + --tags + tag
process.argv[2] = 'src/features/ui/SF/SF-467-mode1.feature';
process.argv[3] = '--tags';
process.argv[4] = tag;
process.argv.length = 5;

require('./run-tests-with-env.js').runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
