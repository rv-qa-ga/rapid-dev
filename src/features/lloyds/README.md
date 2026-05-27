# Lloyd's – Feature Files and Automation

This folder contains **Lloyd's (Lloyds Syndicate Finance)** feature files and related automation within the E2E framework.

## Scope

- **Lloyds Syndicate Finance – D365 F&O WBX Journals:** WBX → ADP → MuleSoft TAGETIK IAE (Actuals) → TDS.TAGETIK Written → TAGETIK App → D365 F&O.
- **OW Lloyds XML Workflow:** D365/ADP → MuleSoft (validation, XML, blob, Kafka) → D365 journal posting → ODS ReportID status = Work Item Complete.

**Agency branch (ledger):** Lloyd's agency branch code is **AEUM**. Use AEUM-led XML file names in documentation, examples, and BDD tables unless you are intentionally testing a planner `LEDGER_NOT_IN_MASTER` blocked row.

### Dynamics master data — Agency repository ids (ADP cohort)

ADP / **`LLOYDS_PROGRAMME_REPOSITORY_IDS`** (also exported as **`LLOYDS_AGENCY_COHORT_12`** / **`LLOYDS_CLONED_REPOSITORY_IDS`**) defines **seventeen** repository ids for Lloyd's Agency testing — **“Lloyds 17 repos\*”** programme view (**2026-05-06** reload). **Dynamics:** each id should exist as **`accelins_repositoryfile`** (`accelins_name` = repo id, linked to **AEUM**). Source of truth: [`lloydsClonedRepoCohort.ts`](../../integrations/lloyds/lloydsClonedRepoCohort.ts), [`docs/lloyds/LLOYDS_QA_PROGRESS.md`](../../docs/lloyds/LLOYDS_QA_PROGRESS.md) §4.0.1, [`docs/lloyds/SKILL.md`](../../docs/lloyds/SKILL.md).

## Duplicate prevention & `PROCESS_TRACKER` (consolidated team notes)

Use this when reconciling **meeting notes or AI summaries** with what this repo automates. **`docs/lloyds/SKILL.md`** stays the deep reference; this section is the **automation-facing** summary.

| Topic | Position for this framework |
|--------|-----------------------------|
| **What we test** | **Per-hop:** `lloyds-pipeline-hops.feature` — Service Bus → `func-xml-totals` → Dataverse `accelins_workflow` with test **`correlation_id`s`. **Post-load E2E read-only:** `lloyds-pipeline-e2e-readonly.feature` — ten repos across ADP, Dataverse, blob, FOWD vs XML, Tagetik, **`PROCESS_TRACKER`** (when **`SQLSERVER_*`** or **`AZURE_SQL_DB_DEV_*`** points at the Mule **Azure SQL** DB — not the UKS TDS server). **Service Bus queue metrics (opt-in):** when `LLOYDS_SB_READ_ENABLED=1` and the SPN has management/read access, `@lloyds-sb-read` scenarios assert non-negative active and dead-letter counts on the Lloyd's queues (`npm run test:lloyds:e2e-sb-read` or `npm run lloyds:sb:probe-queues`). |
| **Composite key (repo + unique run ID)** | **MoM agreed:** track with **`repo ID` + Excel unique run ID** across messages/tables. Engineering still has to land this consistently in SQL/products; Cucumber stays **neutral** on `PROCESS_TRACKER` until we can assert the same grain. |
| **Summary vs latest row** | **MoM (Tom):** add **`_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP`** (standard-detail table row-created timestamp) to the **summary** data product for incremental logic and **latest per repo**; Sucharan gets **notification + query** when live. **Landed 2026-04-23** — column present on `FOWD__AGENCY_POLICY_FO_SUMMARY_V1`; see `docs/lloyds/SKILL.md` §3. |
| **“Duplicates” (integration vs source)** | Prefer **composite key + watermark/timestamp** analysis when repo-only grain is insufficient; per-repo triage may still implicate **ADP/Snowflake** — see **`docs/lloyds/SKILL.md`**. |
| **`PROCESS_TRACKER` (SQL)** | Sucharan / Peter reviewed **day-zero vs subsequent** populate/query logic for duplicate avoidance. Samples historically showed `PROCESS_ID`, `REPO_ID` / `REPO_GUID`, stage/status, `WATERMARK`, `XML_FILE_NAME`, etc.; align automation to published ERD when available. |
| **Resubmission / reversal** | **MoM:** no resubmission **after posting**; replacements/reversals → **new repo IDs**. |
| **One row vs many rows per stage** | **TBD with BA/business** — do not encode insert-vs-update rules in tests until confirmed. |

### Two SQL servers (Mule Azure SQL vs UKS TDS)

- **Mule control (Azure SQL Database):** `sql-dev-uks-lyd.database.windows.net` / `sqldb-dev-uks-lyd` — **`PROCESS_TRACKER`**, **`ERROR_LOG`**, **`FINANCIAL_AUDIT`**, **`mule_test`**, etc. Wired through **`SqlServerClient`** via **`SQLSERVER_*`** or **`AZURE_SQL_DB_DEV_*`** (`src/config/config.ts`).
- **TDS and other UKS databases:** `sql-dev-uks-01.accelins.com` — e.g. **`TDS`**, **`TDS_TEST_SCRIPTS`**, plus many other DBs on that instance. **TagetikWrittenforDataLoaderADP** and similar use **`SQL_LLOYDS_*`** — **not** the Azure SQL host above.
- **Auth:** Programme expectation is the **same Entra SPN** can reach **both** where automation needs them; **`DefaultAzureCredential`** remains the **SSO / interactive backup** for local runs (`env.sample`, `SqlServerClient`, TDS client).

### BA “Ready to Ship” repos vs `mulesoft-xml` + this repo

Dataverse / Ops may show **Ready to Ship to Dynamics** for some **AEUM** repository runs while others remain **Awaiting Approval** (UI varies by run).

**Known gap (programme fix ~Tuesday):** after a file is sent to **Dynamics F&O**, the **Operational Workflow** grid may **not advance** `statuscode` / Status Reason away from **Ready to Ship to Dynamics** until engineering ships the status-sync change. **Automation still validates** ADP Snowflake, Dataverse row + blob XML, FOWD, Tagetik (`FOWT__TAGETIK_V1`), `PROCESS_TRACKER` (when SQL is pointed at Mule DB), and optional F&O OData — we **do not** skip those checks because the workflow column is stale. Example: **US-56464** — manual journal post in F&O, rows in Tagetik/TDS and `PROCESS_TRACKER` (`MULE_FNO_JOURNAL_E2E` / `MULE_TAGETIK_DELIVERY`) can be **SUCCESS** while the workflow UI still shows **Ready to Ship to Dynamics**.

### Snowflake auth — SPN (headless) or browser SSO

With **`SNOWFLAKE_CLIENT_ID`** and **`SNOWFLAKE_CLIENT_SECRET`** set (Entra app used for External OAuth), the driver uses **OAuth client credentials** — no browser (`snowflake-fetch.ts`). For local interactive login instead, **unset** those two vars and set **`SNOWFLAKE_AUTHENTICATOR=EXTERNALBROWSER`**; the framework **reuses one shared connection** per process so Cucumber does not open a tab per scenario (`SNOWFLAKE_REUSE_SHARED_CONNECTION=0` to opt out). See **`env.sample`** (LLOYD'S / FINOPS — SNOWFLAKE).

**Row-1 automation** only exercises files that appear in **`mulesoft-xml`**, resolve in Dataverse **master data** for ledger **AEUM** (and the repository id in the file name), and have a committed XML under **`docs/lloyds/XMLs/`** when `localXmlPath` is set (see `src/features/lloyds/test-data/sanity-plan.json` → `runnable`). Those constraints are **not** the same as “green in the XML File grid.” After `npm run lloyds:sanity:plan`, add blobs + committed XML and re-plan before expanding the Stage 1 `Examples` block in **`lloyds-pipeline-hops.feature`**.

## Tags

- **`@lloyds`** – All Lloyd's scenarios.
- Optional: `@lloyds-wbx`, `@lloyds-xml`, `@lloyds-ods` for filtering by flow/area.
- **`@lloyds-sb-read`** – Service Bus queue runtime property checks (skipped unless `LLOYDS_SB_READ_ENABLED=1`; excluded from default `test:lloyds:e2e-readonly`).

## Framework reuse

- **MuleSoft:** `src/step-definitions/api/mulesoft/mulesoft.steps.ts`, `src/api-clients/mulesoft/`, `docs/setup/MULESOFT_ACCESS_REQUIREMENTS.md`.
- **SQL Server / ODS:** `src/step-definitions/api/sqlserver/`, `src/features/integration/sqlserver/` (e.g. ENG-145 pattern).
- **JIRA:** Lloyd's ENG keys are in `engineering/fetch-mulesoft-jira-stories.ts`; scenarios should be tagged with the relevant ENG/PP key.

## Test strategy

Two companion documents — read together:

- **[`docs/lloyds/LLOYDS_TEST_STRATEGY.md`](../../docs/lloyds/LLOYDS_TEST_STRATEGY.md)** — **phased automation plan** (Phase 1 today / Phase 2 when `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP` + composite key land / Phase 3 E2E), plus the confirmed Mule upstream selection contract (`MAX(_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP)` across `FOWD__AGENCY_POLICY_FO_V1` / `FOWC__POLICY_CORE_V1` → latest `_ACCEL_UNIQUE_RUN_ID` → `FOWD__AGENCY_POLICY_FO_SUMMARY_V1`).
- **[`docs/lloyds/LLOYDS_TEST_STRATEGY.html`](../../docs/lloyds/LLOYDS_TEST_STRATEGY.html)** — **programme-wide QA strategy** (data flows: Tagetik, Dynamics F&O, ResQ, Non-Lloyds; MuleSoft test approach; env and next steps). This is the file the Confluence upload uses.

**Upload Test Strategy to Confluence:** From repo root, ensure `ATLASSIAN_EMAIL` and `ATLASSIAN_API_TOKEN` are set (e.g. in `.env` or `.env.qa`), then run:

```bash
npm run docs:upload:lloyds-test-strategy
```

This uses the **framework Confluence client** (`src/integrations/confluence/client.ts`) to create or update a **Test Strategy** sub-page under the configured Confluence parent page (default parent ID: 3020062774). Use `--parent-page-id <id>` to override.

**Automation-first testing (API + integration, minimal E2E):** See **`docs/lloyds/LLOYDS_AUTOMATION_FIRST_APPROACH.md`** for how to test at API level, validate integration points, and reuse the framework without full end-to-end flows.

## Running Lloyd's tests

**Salesforce:** Lloyd's scenarios are tagged `@api` for the framework, and **`@lloyds` without `@ui` must not open Salesforce** — `AutomationWorld.initAPI()` uses an isolated Playwright `APIRequestContext` only (see `src/hooks/world.ts`). Dataverse calls use **Microsoft Entra** (`DefaultAzureCredential` / SPN) per `src/integrations/lloyds/credential.ts`. **Do not put `@ui` on a whole Lloyd's `Feature` line** in `src/features/api/PP/*.feature`: Cucumber merges Feature tags onto every scenario, so inherited `@ui` forces JWT + navigation to `arx--qa…` even for pure Dataverse/API outlines. Put **`@ui` only on scenarios** that truly need Playwright + Salesforce.

**Do not** use bare `npm run test:all` (no paths) — that loads **every** feature under `src/features` (other programmes, SQL Server, etc.). **Do not** use `npm run test:api` for Lloyd's-only work: that script **always** passes extra glob paths (including KB API features under `src/features/kb/sf/`), so unrelated API features are always part of the run.

Use the **split feature files** plus tags, or the npm shortcuts:

```bash
# Stage 1 per-hop — Service Bus → Dataverse (lloyds-pipeline-hops.feature, not @wip)
npm run test:lloyds:phase1
npm run test:lloyds:hops

# Snowflake module tests only (lloyds-pipeline.feature §B)
npm run test:lloyds:phase2

# Hops Stage 1 + Snowflake modules in one Cucumber invocation
npm run test:lloyds:phase1-and-2

# Pure helper checks — Vitest (`tests/unit/lloyds-*.test.ts`) + umbrella §I Cucumber (`@unit`)
npm run test:lloyds:unit

# Post-manual-load ten-repo read-only (readiness gate: TTY prompt or LLOYDS_E2E_READINESS_ACK=1)
npm run test:lloyds:e2e-readonly

# After E2E: build per-repo matrix from Cucumber JSON, then upload QA progress + table to Confluence
npm run lloyds:repo-matrix
npm run docs:upload:lloyds-qa-progress:matrix

# Same feature file — Service Bus queue depth/DLQ metrics only (requires LLOYDS_SB_READ_ENABLED=1 + management RBAC)
npm run test:lloyds:e2e-sb-read

# One-shot JSON dump of queue runtime properties (same gate / --force)
npm run lloyds:sb:probe-queues

# Explicit hops path:
npm run test:all -- src/features/lloyds/lloyds-pipeline-hops.feature --tags "@lloyds and @stage-1 and not @wip"
```

## Row-1 Sanity Test — `mule-xml-generation-success` → func-xml-totals → XML File record

The **Row-1 sanity test** is the smallest end-to-end check for the first hop of the ADP → MuleSoft → D365 pipeline (Stage 1 + the `func-xml-totals` half of Stage 2.1 in [`docs/lloyds/SKILL.md`](../../docs/lloyds/SKILL.md)). It plays MuleSoft by publishing a canonical `mule-xml-generation-success` message and then polls Dataverse for the created `accelins_workflow` record.

### What it proves (and doesn't)

| Proves | Does not prove |
|---|---|
| Service Bus connectivity + SPN auth on `sb-dev-uks-lyd` | `func-xml-totals` actually reads the blob (dev falls back to payload totals) |
| `func-xml-totals` consumes the message and creates an XML File record | `func-dimension-validation` / `dv-xml-approval-*` (Stage 2.2, still under dev) |
| `file_name` prefix resolves to a real Repository File lookup | DMF submit, import, or posting (Stages 3–4) |
| Record reaches **`statuscode = 100000003`** (**Ready to Ship to Dynamics**) within the poll window — use this as the automated proxy for “XML approved / ready for ship” | The **Operational Workflow** UI strip (browser not used — tests use **Dataverse / Entra** credentials from env; no other CRM named in Lloyd's specs) |
| `overall_match` and workflow totals vs payload within ABS ±5 | Tagetik/TDS (journal **posting** path), ADP **`mule-dependantproduct`** (Stage 5), ResQ — **not** exercised here |
| **ADP Snowflake summary** used by Mule for `financial_values` is `FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1` (column→JSON mapping in [`docs/lloyds/SKILL.md`](../../docs/lloyds/SKILL.md) §3). Cucumber uses **XML-derived totals** as a proxy when the committed file matches Mule output; cross-check Snowflake manually for BA sign-off. | Manual UCI check: after a green run, open the same record in **Accounting Approvals** and confirm the workflow matches (Review complete, Ship To Dynamics) |
| **`mule-xml-generation-failed`** (`@PP-391-API-007`): synthetic payload — no `accelins_workflow` row for that correlation id today; *when Mule ships the real failure contract, revisit the scenario* | |
| **`@PP-391-API-008`**: message `financial_values` deliberately disagree with blob XML → record exists with `overall_match = false` (totals mismatch path) | |

### Prerequisites

1. `.env.qa` has `LLOYDS_SERVICE_BUS_*` (or `AZURE_*` / `D365_*` fallback) pointing at an SPN with **Azure Service Bus Data Sender** on `sb-dev-uks-lyd`. Queue **runtime metrics** (`@lloyds-sb-read`, `lloyds:sb:probe-queues`) need **management/read** rights on the namespace (stronger than Sender alone); set `LLOYDS_SB_READ_ENABLED=1` when that RBAC is granted.
2. `D365_BASE_URL` / `D365_SCOPE` / `D365_WEB_API_BASE_URL` point at the Lloyd's env (`accelinsqatest.crm11.dynamics.com`) — **not** the RDM env (`accelinsqatest2`).
3. **One-time:** `az login` with your user account (needed for the sanity-plan discovery until the QA SPN has Dataverse Read + Storage Blob Data Reader; see [`docs/servicenow-ticket-lloyds-spn-permissions.md`](../../docs/servicenow-ticket-lloyds-spn-permissions.md)).
4. A committed sanity plan at `src/features/lloyds/test-data/sanity-plan.json` — generate it once with `npm run lloyds:sanity:plan`.
5. The XML you pick must have a local copy committed under [`docs/lloyds/XMLs/`](../../docs/lloyds/XMLs/) so the framework can compute ADP totals from it.

### Test data — plan-driven (primary)

Driven by `src/features/lloyds/test-data/sanity-plan.json`, a committed snapshot produced by the **sanity planner**. The planner lists every `*.xml` in the `mulesoft-xml` Azure blob container, parses each file name (**classic** `AEUM US-58338 202604091630.xml` or **WBX** `WBX_US-56464_<Snowflake-_ACCEL_UNIQUE_RUN_ID>_<date> <time>.xml`), and checks ledger + repo against live Dataverse master data (`accelins_legalentity` and `accelins_repositoryfile`). Rows where both lookups resolve → `runnable`. Everything else → `blocked` with an explicit reason. See [`docs/lloyds/SKILL.md`](../../docs/lloyds/SKILL.md) §11 and §17.

Refresh commands:

```bash
npm run lloyds:sanity:plan          # refresh + write snapshot
npm run lloyds:sanity:plan:status   # read current snapshot (no live calls)
npm run lloyds:sanity:plan:dry      # refresh but do not write — preview only
```

### Test data — xlsx (legacy fallback)

The advisory spreadsheet [`docs/lloyds/XMLs/XML-URL.xlsx`](../../docs/lloyds/XMLs/XML-URL.xlsx) remains as a human-curated list and fallback for environments where live discovery can't run. Activate by passing `--from-xlsx`. The planner supersedes it for normal use.

### Correlation IDs

Format `0000-0000-0000-NNNNN`, counter committed at [`test-data/sanity-counter.json`](./test-data/sanity-counter.json). Seed `03000`; first send uses `03001`. The counter file bumps on every real send (not on `--dry-run`). Numbers below `03000` are reserved for manual tests.

### Run commands

```bash
# Refresh the plan (first-time + whenever master data / blob changes)
npm run lloyds:sanity:plan

# Dry-run — prints payload + expected correlation id; does NOT send or bump
npm run lloyds:sanity:send-xml:dry -- --row-index 0

# Real run — bumps counter, sends, polls Dataverse for up to 180s
npm run lloyds:sanity:send-xml -- --row-index 0

# Pick by file name
npm run lloyds:sanity:send-xml -- --row-name "AEUM US-58338 202604091630.xml"

# Two-phase "paste it yourself" flow (used while SPN lacks SB Sender)
npm run lloyds:sanity:prepare -- --row-index 0             # prints JSON to paste; BUMPS counter
npm run lloyds:sanity:paste-and-verify -- --row-index 0    # verifies after manual paste (--no-bump; reuses id)

# Negative scenarios (expect NO Dataverse record after paste)
npm run lloyds:sanity:negative:prepare -- --blocked-reason REPO_NOT_IN_MASTER
npm run lloyds:sanity:negative:prepare -- --blocked-reason LEDGER_NOT_IN_MASTER
npm run lloyds:sanity:negative:prepare -- --blob-missing --row-index 0
npm run lloyds:sanity:negative:prepare -- --bad-file-name "ZZZZ XX-00000 202604091600.xml"
npm run lloyds:sanity:negative:paste-and-verify -- --blocked-reason REPO_NOT_IN_MASTER    # pair it with the prepare you just ran

# Replay a specific correlation id (counter is NOT bumped)
npm run lloyds:sanity:send-xml -- --row-index 0 --correlation-id "0000-0000-0000-03042"

# Cucumber — Lloyd's only (avoid test:api; it bundles SF kb API features)
npm run test:lloyds:phase1
```

See `--help` on the CLI for the full flag list (`npx ts-node scripts/lloyds/send-mule-xml-generation-test-message.ts --help`).

### Framework entry points (reuse first)

| Responsibility | File |
|---|---|
| Discovery credential (SPN / interactive) | `src/integrations/lloyds/credential.ts` |
| File-name parse/build + blob URL rewrite | `src/integrations/lloyds/xmlFileName.ts` |
| ADP totals from XML | `src/integrations/lloyds/xmlTotals.ts` |
| Counter read/bump | `src/integrations/lloyds/correlationIdCounter.ts` |
| Dataverse master-data list | `src/integrations/lloyds/dataverseMasterDataClient.ts` |
| Blob container list + download | `src/integrations/lloyds/blobContainerClient.ts` |
| Sanity planner (blob × master → snapshot) | `src/integrations/lloyds/sanityPlanner.ts` |
| Spreadsheet → row structs (fallback) | `src/integrations/lloyds/sanityTestDataLoader.ts` |
| Service Bus send | `src/integrations/lloyds/serviceBusSender.ts` |
| Service Bus queue runtime (read-only) | `src/integrations/lloyds/serviceBusQueueAdmin.ts`, `src/step-definitions/lloyds/lloyds-service-bus-runtime.steps.ts` |
| F&O Fabric warehouse SQL (separate from `SQLSERVER_*`) | `src/integrations/lloyds/lloydsFnOFabricSqlEnv.ts`, `lloydsFnOFabricSqlClient.ts` — env: `LLOYDS_FNOFABRIC_SQLSERVER_HOST`, `LLOYDS_FNOFABRIC_SQLSERVER_DATABASE` |
| Fabric F&O mirror health (GJE + `ods` staging counts) | `lloydsFabricFnoMirrorHealthQueries.ts`, `npm run lloyds:fabric-fno-mirror-health` — optional `LLOYDS_FNOFABRIC_ODS_SCHEMA`, `LLOYDS_FNOFABRIC_GJE_QUALIFIED_NAME`; Fabric SQL uses SPN then **DefaultAzureCredential** SSO (`lloydsFnOFabricSqlClient.ts`) |
| F&O OData per repo (`@PP-391-FNO-001`) | `lloydsFnOOdataEnv.ts`, `lloydsFnOOdataClient.ts`, `lloyds-fno-odata.steps.ts` — env: `LLOYDS_FNO_ODATA_*` + **`LLOYDS_FNO_ODATA_REPO_PATH_TEMPLATE`** with `{repo}`; **company always AEUM** (only repo id changes) |
| Dataverse poll + record projection | `src/integrations/lloyds/xmlFileRecordClient.ts` |
| Cucumber glue | `src/step-definitions/lloyds/xml-generation.steps.ts` |

## Confluence / JIRA

- [Lloyds Syndicate Finance Requirements – D365 F&O WBX Journals](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2837676033/Lloyds+Syndicate+Finance+Requirements+-+D365+F+O+WBX+Journals)
- [OW Lloyds XML Workflow](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2987425842/OW+Lloyds+XML+Workflow)
- ENG-47, ENG-166, and related features (see test strategy).
