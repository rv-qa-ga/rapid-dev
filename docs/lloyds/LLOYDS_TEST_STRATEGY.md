# Lloyd's — automation strategy (simplified)

> **Programme references (ISDE):**  
> [ADP + D365 F&O (revised)](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3081535490/ADP-+D365+F+O+revised) · [D365 + MuleSoft Integration Field Mappings](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2906161167/D365+MuleSoft+Integration+Field+Mappings) · [Service Bus messages](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3118760006/Service+Bus+Messages)  
> **Repo knowledge:** [`SKILL.md`](./SKILL.md) · **R/Y/G status:** [`LLOYDS_QA_PROGRESS.md`](./LLOYDS_QA_PROGRESS.md)

---

## 0. Lloyd's testing — no Salesforce references

Lloyd's **feature files** (`src/features/lloyds/*.feature`), **Lloyd's programme docs** in this folder (`SKILL`, strategy, QA progress, stage guides), and **Confluence pages** generated from them describe **ADP, Snowflake, Azure Service Bus, Dataverse / D365, Mule, SQL (`PROCESS_TRACKER`), Tagetik, and Fabric** only.

Do **not** name **Salesforce**, Salesforce orgs, or **Salesforce object / field API names** in those artefacts. The wider automation repo may load shared framework config at runtime; that does not change this editorial rule for Lloyd's specs and Lloyd's-facing documentation.

---

## 1. Two execution modes (primary split)

| Mode | Feature file | Sends Service Bus? | When to run |
|------|----------------|-------------------|-------------|
| **Per-hop integration** | [`src/features/lloyds/lloyds-pipeline-hops.feature`](../../src/features/lloyds/lloyds-pipeline-hops.feature) | **Yes** — `sb-dev-uks-lyd` (same contracts as today) | Anytime you need to **inject** a hop and assert the outcome. Correlation ids use the **sanity counter** (`sanity-counter.json`). Stage 1 fully implemented; **post–Stage 1** publishes (`dv-xml-approval-success`, `mule-xml-submission-success`) are opt-in via `LLOYDS_HOP_POST_STAGE1_ENABLED=1`. |
| **E2E read-only (ten repos)** | [`src/features/lloyds/lloyds-pipeline-e2e-readonly.feature`](../../src/features/lloyds/lloyds-pipeline-e2e-readonly.feature) | **No** | After **manual** cleanup (queues, DLQ, containers, `PROCESS_TRACKER` / control tables, stray XML per programme runbook) **and** reload of borderaux into ADP / Dataverse / downstream. **Readiness gate:** on a TTY you are prompted once per run; for CI or piped output set **`LLOYDS_E2E_READINESS_ACK=1`** (see [`src/config/env/env.sample`](../../src/config/env/env.sample)). |

**Umbrella file** [`lloyds-pipeline.feature`](../../src/features/lloyds/lloyds-pipeline.feature): Snowflake **module** tests (**SNOW-001–004** — SNOW-004 is runnable) plus **§C** dimension HTTP (opt-in `LLOYDS_DIMENSION_VALIDATION_BASE_URL`; **§C is `@stage-2` only** — not part of `npm run test:lloyds:phase2`, which stays Snowflake-only) and **§D–§H** narrative steps (skipped until programme opt-in envs in `env.sample`). No Stage 1 sends in §A (moved to hops); ten-repo cross-read is in the E2E file.

---

## 2. What we automate (one table)

| Layer | What runs | Where |
|-------|-----------|--------|
| **ADP (Snowflake)** | Latest-row checks, schema, FOWT peek, cohort CLI | `snowflakeSummaryClient.ts`, `npm run lloyds:snowflake:probe` (default **thirteen** Agency repos in `LLOYDS_AGENCY_COHORT_12`; `--cloned-only` → **ten** in Dynamics today), `npm run lloyds:check:cloned-cohort` |
| **Stage 1 (SB → func-xml-totals → Dataverse)** | Publish `mule-xml-generation-*`, assert `accelins_workflow` | **`lloyds-pipeline-hops.feature`**, `xml-generation.steps.ts` — **ten** cloned repos via `sanity-plan.json` + Snowflake `financial_values` |
| **Snowflake modules only** | Summary row shape, detail join, INFORMATION_SCHEMA | **`lloyds-pipeline.feature` §B**, `lloyds-snowflake-adp.steps.ts` |
| **Stages 2–5 observability (read-only)** | `PROCESS_TRACKER` (Mule **Azure SQL**), Dataverse XML row, Tagetik slice (skip if empty) | **`lloyds-pipeline-e2e-readonly.feature`**, `lloyds-pipeline-stages.steps.ts` — gated on env (`SQLSERVER_*` / **`AZURE_SQL_DB_DEV_*`**, Snowflake). **TDS** SQL uses **`SQL_LLOYDS_*`** on **`sql-dev-uks-01.accelins.com`** — see §“SQL connectivity” at end of doc. |
| **Cross-system read-only (10 cloned repos)** | ADP summary ↔ Dataverse workflow (`accelins_workflow`) + XML ↔ blob XML ↔ FOWD line-level ↔ Tagetik by `_ACCEL_UNIQUE_RUN_ID` | **`lloyds-pipeline-e2e-readonly.feature`** `@PP-391-CROSS-READ-001`, `defaultAdpXmlMapping.ts` (optional `LLOYDS_ADP_XML_MAPPING_XLSX`). Matrix: **`LLOYDS_CLONED_REPOSITORY_IDS`** in `lloydsClonedRepoCohort.ts`. **Amounts (PRM/COM/COI/TAX/OTH):** compare **magnitudes** with **±ABS** tolerance — opposite sign between ADP and XML is OK (`lloydsAmountCompare.ts`). |
| **Service Bus queue runtime (Phase B)** | `getQueueRuntimeProperties` per programme queue (active + DLQ counts) | **`npm run test:lloyds:e2e-sb-read`** (`@lloyds-sb-read`). Requires `LLOYDS_SB_READ_ENABLED=1` and SPN with **management/read** on the namespace (Data Sender alone is insufficient). Optional `LLOYDS_SB_READ_QUEUES`. CLI: **`npm run lloyds:sb:probe-queues`**. |
| **Fabric / warehouse SQL (Phase C)** | Dimension / warehouse parity | Runnable when `LLOYDS_FABRIC_DIMENSION_SQL_ENABLED=1` and **`LLOYDS_FNOFABRIC_SQLSERVER_*`** are set — see `lloyds-fabric-dimension-sql` steps + E2E/PP-392-FABRIC outlines |

**Thirteen Agency repos (blob + ADP):** `LLOYDS_AGENCY_COHORT_12` in `lloydsClonedRepoCohort.ts` — all have XML in **`mulesoft-xml`**. **Dynamics-cloned cohort (ten repo ids):** `LLOYDS_CLONED_REPOSITORY_IDS` — use for Cucumber matrices and sanity **`runnable`** until the remaining three Power Apps clones land.

**XML line fields:** default pairs in `defaultAdpXmlMapping.ts`; convention merge in `compareFowdAgencyPolicyToXml` adds Snowflake↔XML pairs when XML attributes match stripped underscore names. Extend via workbook or extra pairs per ISDE mapping.

### 2.1 Programme items marked **red** on the R/Y/G swimlane (2026-04-24)

Authoritative **Mermaid** (Kroki → Confluence) lives in [`LLOYDS_QA_PROGRESS.md`](./LLOYDS_QA_PROGRESS.md) §1 / §1.1 — [QA progress on Confluence](https://accelins.atlassian.net/wiki/spaces/TM/pages/3220078705/QA+progress+R+Y+G). Summary table (same ETAs as programme comms):

| Item | Jira / story | ETA |
|------|----------------|-----|
| Duplicate XMLs — Mule not selecting **unique** summary row | [ENG-269](https://accelins.atlassian.net/browse/ENG-269) under [ENG-179](https://accelins.atlassian.net/browse/ENG-179) | Mon **27** Apr |
| F&O path — **error handling** | Programme delivery | Mon **27** Apr |
| Service Bus stage messages + **process tracker** updates | Programme delivery | Tue **28** Apr |
| Tagetik / TDS — **error handling** (posting / Mule path; not `mule-dependantproduct`) | Ready to test with QA | — |
| **ServiceNow** fix | Separate backlog story | No ETA |

**Green (same refresh):** journal **posted in Dynamics F&O** (AEUM), including a **manual journal** posted by QA for sign-off — see QA progress §1 Stage 4.

### 2.2 Dataverse workflow vs downstream (until status-sync fix)

The **Operational Workflow** `statuscode` may stay **Ready to Ship to Dynamics** after F&O / Tagetik succeed until engineering ships the workflow status update (target **Tuesday**). **E2E read-only** still runs **Snowflake, blob, FOWD, Tagetik, PROCESS_TRACKER, F&O OData** — it does **not** skip those because the Dataverse grid is stale (see `xmlFileRecordClient.ts` header and `lloyds-pipeline-e2e-readonly.feature` banner).

### 2.3 Snowflake — Entra SPN (headless) or EXTERNALBROWSER (local)

With **`SNOWFLAKE_CLIENT_ID`** + **`SNOWFLAKE_CLIENT_SECRET`**, the driver uses **OAuth client credentials** against Entra (`snowflake-fetch.ts`); you must also set **`SNOWFLAKE_OAUTH_SCOPE`** or **`SNOWFLAKE_OAUTH_RESOURCE`** (Application ID URI + `/.default` — see `env.sample`). Use **`npm run lloyds:snowflake:entra-diagnose`** if the token endpoint returns `invalid_scope` / `invalid_resource`.

With **`SNOWFLAKE_AUTHENTICATOR=EXTERNALBROWSER`** and **no** Snowflake client id/secret, the driver opens **localhost** for SSO. The framework **reuses one shared Snowflake connection** per process so a full Lloyd's Cucumber run does not open **one tab per scenario**. Set `SNOWFLAKE_REUSE_SHARED_CONNECTION=0` to opt out.

---

## 3. Commands

```bash
npm run lloyds:sanity:plan
npm run lloyds:check:cloned-cohort
npm run lloyds:snowflake:probe
npm run lloyds:snowflake:entra-diagnose   # Entra token POST (scope / consent errors)
npm run lloyds:snowflake:probe -- --cloned-only   # ten Dynamics-cloned repos only
npm run lloyds:trace:adp-ledger -- --repo US-61273

# Cucumber (from repo root; uses ENV=qa via run-tests-with-env.js)
npm run test:lloyds:hops              # per-hop file (@lloyds-hop, not @wip)
npm run test:lloyds:phase1            # alias — same Stage-1 slice on hops file
npm run test:lloyds:phase2            # Snowflake modules — umbrella file only
npm run test:lloyds:stage2-dimension  # umbrella §C — PP-429 HTTP + Stage-1 send (opt-in LLOYDS_DIMENSION_VALIDATION_BASE_URL)
npm run test:lloyds:phase1-and-2     # hops Stage 1 + umbrella Phase 2
npm run test:lloyds:e2e-readonly     # ten-repo read-only (excludes @lloyds-sb-read; gate: TTY or LLOYDS_E2E_READINESS_ACK=1)
npm run test:lloyds:e2e-sb-read       # same file + Service Bus runtime metrics (needs LLOYDS_SB_READ_ENABLED=1)
cross-env ENV=qa LLOYDS_E2E_READINESS_ACK=1 npm run test:lloyds:e2e-readonly
npm run lloyds:sb:probe-queues       # JSON dump of queue active/DLQ counts (set LLOYDS_SB_READ_ENABLED=1 or --force)
node scripts/run-tests-with-env.js src/features/lloyds/lloyds-pipeline-e2e-readonly.feature --tags "@lloyds-e2e-readonly and @PP-391-CROSS-READ-001 and not @wip"

npm run docs:upload:lloyds-qa-progress
npm run docs:upload:lloyds-test-strategy
```

---

## 4. Gates still owned by engineering

- Snowflake **EXTERNALBROWSER** sessions: `connectFinOpsSnowflake()` now runs a **`SELECT 1` ping** after `connectAsync()` so a step does not show **passed** while SAML auth is still failing in the background (avoids the next step hitting “connection was never established”).
- Composite key (repo + run id) on messages / `PROCESS_TRACKER` (MoM).
- Dev-env cleanup (duplicate summary rows per repo) — tests order by `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP DESC` to stay stable.
- **ENG-270** (DMF `ImportFromPackage` HTTP 400) — see `LLOYDS_QA_PROGRESS.md` §1.2; reconcile with QA if ten-repo F&O import is now consistently green.
- **Programme R items** (dup XML / SB+tracker / F&O + Tagetik error handling / ServiceNow) — **§2.1** above and Confluence [QA progress R/Y/G](https://accelins.atlassian.net/wiki/spaces/TM/pages/3220078705/QA+progress+R+Y+G).

## SQL connectivity — two hosts (Mule Azure SQL vs TDS)

**Do not use one connection string for both.**

| Use case | Server | Database(s) | Env / client |
|----------|--------|-------------|--------------|
| **Mule control tables** (`PROCESS_TRACKER`, `ERROR_LOG`, `FINANCIAL_AUDIT`, `mule_test`, …) | `sql-dev-uks-lyd.database.windows.net` | `sqldb-dev-uks-lyd` | `SQLSERVER_*` and/or **`AZURE_SQL_DB_DEV_SERVER`** / **`AZURE_SQL_DB_DEV_DATABASE`** → `SqlServerClient` (`config.ts`). |
| **TDS Tagetik loader and other UKS databases** | `sql-dev-uks-01.accelins.com` | e.g. **`TDS`**, **`TDS_TEST_SCRIPTS`**, plus other project DBs on that instance | **`SQL_LLOYDS_*`** → `lloydsTagetikTdsClient.ts` (not the Azure SQL host above). |

**Authentication:** The **same Entra application (service principal)** should have access to **both** where QA automation needs them. **`SqlServerClient`** accepts **`SQLSERVER_*`** secrets or reuses **`D365_*`** for Azure SQL when SQL SPN vars are omitted. **`DefaultAzureCredential`** (`az login` / VS Code / MI) remains the **interactive SSO backup** for local runs when appropriate.

**Confluence / docs:** Mirror this split on any integration page that mentions “SQL” for Lloyd’s — Azure SQL is **only** the Mule control DB; **TDS tables stay on `sql-dev-uks-01`**.

---

*Last updated: 2026-04-24 — two SQL endpoints (Azure Mule control vs UKS TDS); §2.1 programme R table + Confluence swimlane sync; SNOW-004 + §C dimension slice, Fabric SQL env, `test:lloyds:stage2-dimension`.*
