/**
 * Lean Cucumber config for SF-1081 only (API + UI).
 * Avoids loading the full step-definition tree before the first scenario.
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
      path.join(root, 'src/step-definitions/common/api-common.steps.ts'),
      path.join(root, 'src/step-definitions/common/data-factory.steps.ts'),
      path.join(root, 'src/step-definitions/common/ui-common.steps.ts'),
      path.join(root, 'src/step-definitions/api/salesforce/sf-575.steps.ts'),
      path.join(root, 'src/step-definitions/api/salesforce/sf-593-1081-integration.steps.ts'),
      path.join(root, 'src/step-definitions/ui/salesforce/sf-467.steps.ts'),
      path.join(root, 'src/step-definitions/ui/salesforce/sf-529.steps.ts'),
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
