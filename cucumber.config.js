const path = require('path');

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
    // Support new folder structure: features/{type}/{project}/
    // Note: paths are set here as defaults, but command-line arguments will override
    // If you want to run a specific feature file, pass it as an argument:
    //   npm run test:ui -- src/features/ui/General/login.feature
    paths: [
      'src/features/**/*.feature',
    ],
  },
};

