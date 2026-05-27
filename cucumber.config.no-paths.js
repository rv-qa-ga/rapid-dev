const path = require('path');

// Config file without paths - used when specific feature files are provided
// This prevents the config from overriding command-line feature file paths
module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      path.resolve(__dirname, 'src/hooks/world.ts'),
      path.resolve(__dirname, 'src/hooks/before.ts'),
      path.resolve(__dirname, 'src/hooks/after.ts'),
      path.resolve(__dirname, 'src/hooks/sf-org-parity.after.ts'),
      path.resolve(__dirname, 'src/step-definitions/**/*.ts'),
    ],
    format: [
      'progress-bar',
      'json:reports/json/cucumber-report.json',
      'html:reports/html/cucumber-report.html',
    ],
    formatOptions: {
      snippetInterface: 'async-await',
    },
    publishQuiet: true,
    strict: true,
    // NOTE: No paths here - command-line paths will be used exclusively
  },
};

