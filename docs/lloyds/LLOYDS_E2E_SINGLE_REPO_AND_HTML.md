# Lloyd's — single-repository E2E read-only + HTML reports

Run the **same** read-only scenarios as the full cohort file (`lloyds-pipeline-e2e-readonly.feature`), but for **one** `REPOSITORY_ID`, then generate **timestamped** Cucumber HTML under `reports/html/lloyds-e2e-runs/`.

## Prerequisites

- `src/config/env/.env.qa` (or your `ENV`) with Snowflake, Dataverse, optional TDS / F&O OData, and `PROCESS_TRACKER` SQL as required by the scenarios.
- **Non-interactive runs:** set `LLOYDS_E2E_READINESS_ACK=1` (see `env.sample`).
- **Repository id format:** `US-<digits>` (e.g. `US-60464`, `US-61822`). The repo should exist in ADP/Snowflake; for full green paths, Dynamics should have `accelins_repositoryfile` for that id when scenarios need Dataverse (see `lloydsClonedRepoCohort.ts` for the programme cohort).

## Command (any repo)

From the repo root:

```bash
npm run lloyds:e2e-single-repo-then-html -- --repo US-57244
```

PowerShell:

```powershell
$env:ENV='qa'; $env:LLOYDS_E2E_READINESS_ACK='1'
npm run lloyds:e2e-single-repo-then-html -- --repo US-57244
```

### Help

```bash
npm run lloyds:e2e-single-repo-then-html -- --help
```

## What it does

1. **Generates** `reports/tmp/lloyds-e2e-readonly-repo-<REPO>.feature` from  
   `scripts/lloyds/templates/lloyds-pipeline-e2e-readonly-single-repo.feature.template`  
   (`reports/` is gitignored; the template in `scripts/` stays in source control.)

2. **Runs** `node scripts/run-tests-with-env.js <that-feature> --tags "@lloyds-e2e-readonly and not @wip"`  
   (same tag slice as the committed `lloyds-pipeline-e2e-readonly-repo-US-60464.feature` flow).

3. **Archives HTML** in the **same Node process** (calls `generateLloydsE2eHtmlArchiveFromJson` from `lloyds-e2e-html-archive-run.ts` — no second `npx`/`ts-node` subprocess, which avoids Windows issues where the HTML step never appeared after Cucumber):
   - `reports/html/lloyds-e2e-runs/<ISO-stamp>-full/index.html` — full `reports/json/cucumber-report.json`
   - `reports/html/lloyds-e2e-runs/<ISO-stamp>-<REPO>/index.html` — scenarios filtered to that repo

### Where reports live on disk

From the repo root (example on Windows: `C:\Automation`):

| Artifact | Path |
| -------- | ---- |
| Cucumber machine JSON (input to HTML) | `reports/json/cucumber-report.json` |
| Timestamped HTML (this run) | `reports/html/lloyds-e2e-runs/<ISO-stamp>-full/index.html` |
| Repo-only HTML slice | `reports/html/lloyds-e2e-runs/<ISO-stamp>-<REPO>/index.html` |

Each run creates **new** folders named with an ISO-like stamp (colons replaced by hyphens), e.g. `2026-04-26T13-15-15-500Z-full`. Open the newest folder under `reports/html/lloyds-e2e-runs/`.

### Pipeline flow panel (overview page)

After the Multiple Cucumber HTML report is generated, the runner **injects** a **Lloyd's Agency journal pipeline** section at the bottom of the main **`index.html`** (before `</body>`). It shows one card per E2E scenario group (ADP↔Dataverse totals, cross-system chain incl. blob/FOWD/Tagetik/TDS, `PROCESS_TRACKER`, Dataverse XML File, Tagetik readiness, F&O OData) with **PASS / FAIL / SKIP** colours for the selected repository. Labels follow **`docs/lloyds/SKILL.md`**. Re-run the HTML step to refresh the panel after a new Cucumber JSON is produced.

**After Cucumber finishes**, the script still runs HTML even when scenarios failed (you should see `📊 Generating Lloyd's HTML` and then `✅ Full report:` / `✅ Repo slice:`). If the log stops at the Cucumber summary, wait a few seconds for `npx ts-node`, or scroll for errors (e.g. missing `reports/json/cucumber-report.json`). Do not stop the process with Ctrl+C before those lines appear.

Pass `--repo` to the HTML script if you already have a JSON and only want to re-render:

```bash
npx ts-node scripts/lloyds/lloyds-e2e-html-archive-run.ts --repo US-57244
```

## Backwards compatibility

- **`npm run lloyds:e2e-us60464-then-html`** — alias for  
  `npm run lloyds:e2e-single-repo-then-html -- --repo US-60464`
- **`npm run test:lloyds:e2e-readonly:us60464`** — runs the committed  
  `src/features/lloyds/lloyds-pipeline-e2e-readonly-repo-US-60464.feature` directly (no generator).

## Full seventeen-repo run + HTML

```bash
npm run lloyds:e2e-readonly-then-html
```

Optional slice for one repo from that JSON (default repo filter is `US-60464` unless you pass `--repo`):

```bash
npx ts-node scripts/lloyds/lloyds-e2e-html-archive-run.ts --repo US-60507
```

## Keeping the template in sync

When you add or reorder steps in **`lloyds-pipeline-e2e-readonly.feature`** for the cloned-repo matrix, update:

- `scripts/lloyds/templates/lloyds-pipeline-e2e-readonly-single-repo.feature.template`  
  (replace `{{REPO_ID}}` in the template — do not hand-edit generated files under `reports/tmp/`.)

Optionally mirror the same changes in **`lloyds-pipeline-e2e-readonly-repo-US-60464.feature`** if you still want a fixed US-60464 file in `src/features` for diffs and legacy scripts.

## Confluence / matrix

After a green run, refresh the repo matrix and Confluence as before:

```bash
npm run docs:upload:lloyds-qa-progress:matrix
```

Generated single-repo features under `reports/tmp/` are included in the Cucumber JSON URI filter used by `lloyds:repo-matrix` (paths containing `lloyds-e2e-readonly-repo`).
