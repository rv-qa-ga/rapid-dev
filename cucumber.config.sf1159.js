/**
 * Lean Cucumber config for SF-1159 only.
 *
 * The default config requires all step-definitions (~100+ files), which forces ts-node
 * to compile every step file before the first scenario — often minutes on Windows.
 *
 * This config loads only hooks + step files referenced by SF-1159 API/UI features.
 */
const path = require('path');

const root = __dirname;

module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      path.join(root, 'src/hooks/world.ts'),
      path.join(root, 'src/hooks/before.ts'),
      path.join(root, 'src/hooks/after.ts'),
      path.join(root, 'src/step-definitions/common/authentication.steps.ts'),
      path.join(root, 'src/step-definitions/common/data-factory.steps.ts'),
      path.join(root, 'src/step-definitions/common/ui-common.steps.ts'),
      path.join(root, 'src/step-definitions/api/salesforce/sf-575.steps.ts'),
      path.join(root, 'src/step-definitions/api/salesforce/sf-593-1081-integration.steps.ts'),
      path.join(root, 'src/step-definitions/ui/salesforce/sf-467.steps.ts'),
      path.join(root, 'src/step-definitions/ui/salesforce/sf-529.steps.ts'),
      path.join(root, 'src/step-definitions/ui/salesforce/sf-1159-ui.steps.ts'),
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
  },
};
