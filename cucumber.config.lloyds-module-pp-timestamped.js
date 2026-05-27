/**
 * Used by scripts/run-lloyds-module-xmlflow-by-pp.js.
 * When LLOYDS_MODULE_CUCUMBER_JSON_REL and LLOYDS_MODULE_CUCUMBER_HTML_REL are set (repo-relative),
 * Cucumber writes JSON + HTML there (timestamped per work item). Otherwise falls back
 * to cucumber.config.no-paths.js defaults.
 */
const base = require('./cucumber.config.no-paths.js');

// Repo-relative paths only (e.g. reports/json/foo.json) — avoids ambiguous ":" in
// Windows absolute paths (C:\...) with cucumber-js format strings.
const jsonRel = process.env.LLOYDS_MODULE_CUCUMBER_JSON_REL;
const htmlRel = process.env.LLOYDS_MODULE_CUCUMBER_HTML_REL;

const format =
  jsonRel && htmlRel
    ? [
        'progress',
        `json:${jsonRel.replace(/\\/g, '/')}`,
        `html:${htmlRel.replace(/\\/g, '/')}`,
      ]
    : base.default.format;

module.exports = {
  default: {
    ...base.default,
    format,
  },
};
