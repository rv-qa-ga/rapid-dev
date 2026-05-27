# Lloyd's Agency Journal Pipeline — Data Flow Knowledge (SKILL.md)

> Use this doc when you're asked to extend, debug, or test the Lloyd's ADP → MuleSoft → D365 F&O bordereaux journal pipeline. It is the single-page map from business flow → Service Bus messages → Dataverse state → framework code locations.
> Source: authoritative stage-by-stage breakdown shared by the programme team (April 2026). For deeper architecture reference see [`LLOYDS_DATA_FLOW_ARCHITECTURE.md`](./LLOYDS_DATA_FLOW_ARCHITECTURE.md) and the Confluence export [`confluence-lloyds-mulesoft-d365-agency-journals.md`](./confluence-lloyds-mulesoft-d365-agency-journals.md).

## 0. Programme sources of truth (ISDE) + automation cohort

| Document | Purpose |
|----------|---------|
| [**ADP + D365 F&O (revised)**](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3081535490/ADP-+D365+F+O+revised) | End-to-end ADP ↔ D365 F&O behaviour, cases, and programme updates — **mirror automation assertions here when Confluence changes.** |
| [**D365 + MuleSoft Integration Field Mappings**](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2906161167/D365+MuleSoft+Integration+Field+Mappings) | Field-level mapping (including Snowflake summary → `mule-xml-generation-success.financial_values`). Code mirror: `adpSummaryToMuleFinancialValues.ts` + §3 table below. |
| [**Service Bus Messages**](https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3118760006/Service+Bus+Messages) | Queue names and payload shapes. |

**Agency cohort (thirteen repository ids)** — ADP / Snowflake / **`mulesoft-xml`** XML coverage uses **`LLOYDS_AGENCY_COHORT_12`** in `lloydsClonedRepoCohort.ts` (name retained; array length is **13**, including **`US-61822`** from **2026-04-29**). **All** ids in that list have XML in the blob container for programme testing.

**Dynamics-cloned repository ids (ten)** — the **full** Lloyd's Cucumber matrix, **`sanity-plan.json` `runnable`**, and `LLOYDS_TEST_REPO_ID` validation use only repos that already have **`accelins_repositoryfile`** in Power Apps (**`LLOYDS_CLONED_REPOSITORY_IDS`**):

`US-56464`, `US-60507`, `US-61066`, `US-57244`, `US-57524`, `US-61273`, `US-60465`, `US-61070`, `US-60464`, `US-61822`

The remaining cohort ids **`US-58237`, `US-58338`, `US-57250`** have blob + ADP data but **Dynamics master clone is pending** (expected **within a few days**) — Stage 1 positive automation must not depend on them until those rows exist. See `LLOYDS_QA_PROGRESS.md` §4.0.1.

---

## 1. The Big Picture (one-paragraph mental model)

Bordereaux financial data starts in **ADP (Snowflake)**, gets picked up and carried by **MuleSoft**, passes through several checkpoints (blob storage, two Azure Functions, Dataverse review, D365 DMF import), and eventually lands in **D365 F&O** as a posted journal. **Tagetik / TDS (UKS SQL)** is updated on the **journal posting path**: once D365 has posted and **`dv-journal-posting-*`** is consumed by Mule, the programme’s Tagetik-facing loader tables in **TDS** are driven from that integration leg — **not** from the separate **`mule-dependantproduct` → ADP** “dependent products” queue (that ADP downstream flow is **independent** in timing and purpose). **ResQ** (underwriting) and other fan-out are programme-specific; do not assume they share the same Service Bus hop as Tagetik/TDS. Throughout, MuleSoft maintains a **`PROCESS_TRACKER`** row with a single `CURRENT_STAGE` / `PROCESS_STATUS` pair, and writes an **`ERROR_LOG`** row + a **ServiceNow ticket** on every failure.

## 2. Systems and roles

| System | Role |
|---|---|
| **ADP / Snowflake** | Source. Produces finance data products from ingested bordereaux files. |
| **MuleSoft** | Orchestrator. Moves data, transforms it, and owns `PROCESS_TRACKER` / `ERROR_LOG`. Only writer to both tables. Polls ADP on a 15-min cycle. |
| **Azure Blob Storage** | File store. Holds the generated XML files. Canonical payload container: `mulesoft-xml` (what the message contract references). |
| **Dataverse / Power Apps (Operational Workflow)** | Ops review surface. Holds `accelins_workflow` ("XML File") records visible under **Accounting Approvals**. Power Automate flows publish/consume Service Bus messages on Dataverse's behalf. |
| **MS Service Bus** (namespace `sb-dev-uks-lyd`) | Event backbone. Queues: `mule-xml-generation`, `dv-xml-approval`, `mule-d365-import`, `dv-d365-journalposting`, `mule-dependantproduct` (note programme spelling — "dependant"). |
| **Azure Functions** | `func-xml-totals`, `func-dimension-validation`, `func-sb-monitoring` (see §8). |
| **D365 F&O** | Destination. Receives XML via the Data Management Framework (DMF); Ops post the journal; Fabric Link reports posting back. |
| **ServiceNow** | Incident management. Tickets auto-raised from `ERROR_LOG` on failures or DLQ drops. |

## 3. Stage-by-stage happy path

> **Shared correlation key.** Every message through all stages carries the same `correlation_id` so downstream systems can tie events to the originating run.

### Stage 1 — XML Generation

- **What happens:** MuleSoft polls Snowflake for new `(repoId, watermark)` combinations every 15 min, claims the work, reads detail + summary data products, transforms to the D365 agency journal XML, writes it to Azure Blob Storage, then publishes. **Programme intent:** process **only the latest entry per repo** for XML generation, using **`_accel_std_table_row_created_timestamp`** (standard-detail row created time propagated onto the summary product — see §5 schema notes) so incremental jobs and “latest row” selection stay aligned.
- **Confirmed upstream selection logic (Mule, 2026-04-23):** Mule takes **`MAX(_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP)`** across the detail source(s) — **`FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1`** and / or **`FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1`** — to resolve the **latest `_ACCEL_UNIQUE_RUN_ID`**, then reads the matching row from **`FOWD__AGENCY_POLICY_FO_SUMMARY_V1`** to populate `financial_values`. This is the canonical grain for “latest run per repo” and the contract Phase 2 module tests will assert on (see [`LLOYDS_TEST_STRATEGY.md`](./LLOYDS_TEST_STRATEGY.md) §2).
- **Summary-side `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP` — LIVE (2026-04-23):** this column (the standard-detail table row-created timestamp, propagated onto the summary) is now present on `FOWD__AGENCY_POLICY_FO_SUMMARY_V1` itself (verified via `npm run lloyds:snowflake:probe`). Callers asserting on “latest summary row per repo” no longer need to join out to the detail tables — `MAX(_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP)` **on the summary** now gives the same winning `_ACCEL_UNIQUE_RUN_ID` Mule would pick. Phase 2 automation in [`LLOYDS_TEST_STRATEGY.md`](./LLOYDS_TEST_STRATEGY.md) is now partially unblocked on this front (composite-key work still pending).
- **Service Bus queue:** `mule-xml-generation`
- **Publisher:** MuleSoft
- **Consumer:** `func-xml-totals` (`ServiceBusTrigger` on the queue above)
- **Messages:** `mule-xml-generation-success` | `mule-xml-generation-failed` *(failure path: confirm final payload with Engineering — Row-1 automation still uses a **synthetic** `-failed` message until Mule ships the contract.)*
- **ADP summary → `mule-xml-generation-success.financial_values` (Snowflake):** programme mapping reads the **agency policy FO summary** view  
  `FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1`  
  and maps columns to JSON as follows (names match Mule/DataWeave vars, not always OData logical names). **Column names verified 2026-04-23** against the live schema via `npm run lloyds:snowflake:probe` — ADP renamed the two commission columns earlier in the month, so historical programme docs referring to `TOTAL_AGENCY_COMMISSION_AMOUNT` / `TOTAL_COMMISSION_AMOUNT` are stale; treat this table as canonical:

| Snowflake column (summary row) | JSON field under `financial_values` | Notes |
|---|---|---|
| `TOTAL_PREMIUM_AMOUNT` | `adp_prm` | |
| `TOTAL_MEMBER_COMMISSION_AMOUNT` | `adp_com` | Renamed from `TOTAL_AGENCY_COMMISSION_AMOUNT`. Business meaning unchanged (Member / Agency Commission, aka **COM**). |
| `TOTAL_INSURER_COMMISSION_AMOUNT` | `adp_coi` | Renamed from `TOTAL_COMMISSION_AMOUNT`. Business meaning unchanged (Insurer Commission / Contribution, aka **COI**). |
| `TOTAL_TAX_AMOUNT` | `adp_tax` | |
| `TOTAL_OTHER_CONTRIBUTIONS_AMOUNT` | `adp_oth` | |
| `POLICY_CURRENCY_CODE` | `adp_currency` | |

> Dataverse target columns on `accelins_workflow` (`accelins_ods_total_agency_commission_amount` / `accelins_ods_total_commission_amount`) **did not rename** — the §7 mapping table is still correct. The Snowflake→Dataverse hop keeps its pre-existing naming convention.

  Top-level message fields: `message` = `mule-xml-generation-success`, `correlation_id` = process id, `file_name` = generated XML name, `blob_id` = blob path/URL for that file.
- **PROCESS_TRACKER:** `XML_GENERATING → XML_REVIEW_PENDING`, `PROCESS_STATUS = WAITING`
- **Idempotency on `func-xml-totals`:** keyed by `(correlation_id, messageType)` — resending the same pair *updates* the existing Dataverse record rather than creating a duplicate. This is why the framework bumps the correlation counter for every run (see §6).

### Stage 2 — Validation (totals + dimensions)

Two sub-steps:

**2.1 XML totals validation**
- **Function App:** `func-xml-totals`
- **Trigger:** `ServiceBusTrigger` on `mule-xml-generation`
- **Logic:** fetches XML from blob → computes totals → compares against ADP summary totals in the message → creates/updates the Dataverse record with both sets of totals + match toggles
- **Automation rule (ADP vs XML / ODS for PRM, COM, COI, TAX, OTH):** compare **magnitudes** (absolute values). The same economic amount may appear with **opposite sign** between ADP and journal XML (e.g. `20512.8` vs `-20512.8`); that is **not** a failure. The **±5** (or configured) **ABS** tolerance applies to `||a|-|b||`. **Currency** is still an exact string match when both sides are present. (See `lloydsAmountCompare.ts` and FOWD line compare in `fowd-agency-xml-compare/normalize.ts`.)
- **E2E Tagetik (`FOWT__TAGETIK_V1`) field-level:** after slice rows exist for repo+run, `lloyds-pipeline-e2e-readonly*.feature` asserts **DEBIT_AMOUNT** / **CREDIT_AMOUNT** (case-insensitive), **currency** vs ADP `POLICY_CURRENCY_CODE` when both set, and **optional** same-name totals vs ADP summary (magnitude ±ABS) when the slice exposes those columns — `lloydsTagetikFieldAssertions.ts` + `lloyds-snowflake-adp.steps.ts`. **TDS** `TagetikWrittenforDataLoaderADP`: first row repository / run columns (`SQL_LLOYDS_TAGETIK_*`) vs ADP when populated — `lloyds-tagetik-tds-sql.steps.ts`.
- **E2E Tagetik (`FOWT__TAGETIK_V1`) field-level:** after slice rows exist for repo+run, `lloyds-pipeline-e2e-readonly*.feature` asserts **DEBIT_AMOUNT** / **CREDIT_AMOUNT** (case-insensitive), **currency** vs ADP `POLICY_CURRENCY_CODE` when both set, and **optional** same-name totals vs ADP summary (magnitude ±ABS) when the slice row exposes those columns — see `lloydsTagetikFieldAssertions.ts` + `lloyds-snowflake-adp.steps.ts`. **TDS** `TagetikWrittenforDataLoaderADP`: first row **repository** / **run** columns (from `SQL_LLOYDS_TAGETIK_*`) vs ADP when populated (`lloyds-tagetik-tds-sql.steps.ts`).

**2.2 Dimension validation**
- **Function App:** `func-dimension-validation`
- **Trigger:** **HTTP** (called from Dataverse UI / plugin — *not* Service-Bus-triggered)
- **Logic:** reads XML from blob → extracts distinct financial dimension combinations → queries D365 master data via Fabric → returns `{ pass, invalidCombinations[] }`

- **Service Bus queue (approval outcome):** `dv-xml-approval`
- **Publisher:** **Dataverse (via Power Automate with Service Bus connector)** — *not* the dimension function directly
- **Consumer:** MuleSoft
- **Messages:** `dv-xml-approval-success` | `dv-xml-approval-failed`
- **PROCESS_TRACKER:** on success → `DMF_SUBMITTING / RUNNING`; on failure → `XML_VALIDATING / RECONCILE_REQUIRED`

### Stage 3 — DMF Submission to D365 F&O

- **What happens:** MuleSoft takes the approved XML, authenticates to D365 via OAuth 2.0 (Microsoft Entra ID service principal), and follows the 5-phase DMF handshake:
  1. Get JWT from Entra ID — SPN: `svc-d365-integration`
     - Non-prod client id: `12490846-ef78-48b3-af32-7a057e5d5526`
     - Prod client id: `61f1ed20-f513-4e57-9c8c-489539e3d154`
  2. `GetAzureWriteUrl` — time-bound SAS URI from D365
  3. `PUT` the XML package to that SAS URI (stages into D365's blob)
  4. `ImportFromPackage` — triggers DMF engine. **DMF project:** `ADP Written BDX XML`. **Data entity:** `General journal`.
  5. Poll `GetExecutionSummaryStatus` until `Succeeded`, `PartiallySucceeded`, or `Failed`.
- **Service Bus queue:** `mule-d365-import`
- **Publisher:** MuleSoft
- **Consumer:** **Dataverse (via Power Automate flow with `ServiceBusTrigger`)** — *not* a Logic App

Messages published through the lifecycle (all on the same queue, discriminated by `message` field):

| Message | Meaning | Dataverse status update |
|---|---|---|
| `mule-xml-submission-success` | XML package accepted by DMF | "Shipped to Dynamics" |
| `mule-xml-submission-failed` | Submission API failed | "Failed to Ship to Dynamics" |
| `mule-dmf-import-success` | DMF staging succeeded | "Shipped to Dynamics" |
| `mule-dmf-import-failed` | DMF staging failed | "Failed to Import to Dynamics" |
| `mule-dmf-processing-success` | DMF processing completed | "Ready to Post to Dynamics" |
| `mule-dmf-processing-failed` | DMF processing failed | "Failed to Import to Dynamics" |

### Stage 4 — Journal Posting in D365 F&O

- **What happens:** After DMF processing completes, the journal is in D365. Ops post it manually. A Journal Posting Confirmation Service (Power Automate + Fabric Link) detects the posting and emits.
- **Service Bus queue:** `dv-d365-journalposting`
- **Publisher:** Dataverse / Journal Posting Confirmation Service
- **Consumer:** MuleSoft
- **Messages:**
  - `dv-journal-posting-success` → Mule sets Azure SQL state `POSTED`; ADP repo file → `WORK_ITEM_COMPLETE`
  - `dv-journal-posting-failed` → Mule sets `POSTING_FAILED`; ServiceNow ticket raised
- **Tagetik / TDS (same posting leg, not Stage 5):** Programme alignment: **TDS tables used for Tagetik** are updated when the journal is **posted in D365** and Mule processes the **`dv-journal-posting-success`** path — i.e. **together with** the posting confirmation integration, **not** as a consequence of the **`mule-dependantproduct`** message reaching ADP. Automation that reads **`TagetikWrittenforDataLoaderADP`**, **`FOWT__TAGETIK_V1`**, etc. should treat **posting** as the business trigger for “data should exist”, and treat **`mule-dependentproduct-*`** as a **separate ADP downstream** track.

### Stage 5 — Dependent products (ADP downstream)

- **What happens:** After posting, Mule may publish to **`mule-dependantproduct`** so **ADP** can run **downstream dependent product builds**. This is **not** the integration leg that materialises **Tagetik / TDS** rows for the journal run (see Stage 4).
- **Service Bus queue:** `mule-dependantproduct` (programme spelling; see §4)
- **Publisher:** MuleSoft
- **Consumer:** ADP
- **Messages:** `mule-dependentproduct-success` | `mule-dependentproduct-failed`

## 4. Complete Service Bus queue reference

| Queue | Publisher | Consumer | Messages |
|---|---|---|---|
| `mule-xml-generation` | MuleSoft | `func-xml-totals` | `mule-xml-generation-success` / `-failed` |
| `dv-xml-approval` | Dataverse (Power Automate) | MuleSoft | `dv-xml-approval-success` / `-failed` |
| `mule-d365-import` | MuleSoft | Dataverse (Power Automate) | `mule-xml-submission-*`, `mule-dmf-import-*`, `mule-dmf-processing-*` |
| `dv-d365-journalposting` | Dataverse | MuleSoft | `dv-journal-posting-success` / `-failed` |
| `mule-dependantproduct` | MuleSoft | ADP | `mule-dependentproduct-success` / `-failed` |

> **Tagetik / TDS vs this queue:** **`mule-dependantproduct`** feeds **ADP** downstream jobs only. **Tagetik-facing TDS** updates are tied to **Stage 4 posting + Mule’s handling of `dv-d365-journalposting`**, not to whether ADP has consumed **`mule-dependentproduct-*`** yet.

> **Spelling gotcha:** the queue name is **`mule-dependantproduct`** (British "dependant" + no hyphen before "product"). The message names are **`mule-dependentproduct-*`** (American "dependent"). This is intentional in the programme — do not "fix" either.

**DLQ policy:** every queue has a `$DeadLetterQueue`. `MaxDeliveryCount = 5`. Drops are picked up by `func-sb-monitoring` (§8) and raise ServiceNow incidents.

## 4.5 Two SQL endpoints — Mule **Azure SQL** vs UKS **TDS** (do not conflate)

The programme uses **two different SQL Server surfaces**. Automation and env vars must target the correct one.

| Surface | Server / resource | Typical databases / objects | Framework entry |
|--------|-------------------|----------------------------|-----------------|
| **Mule integration / control (Azure SQL Database)** | **`sql-dev-uks-lyd.database.windows.net`** → database **`sqldb-dev-uks-lyd`** | Mule-owned tables including **`dbo.PROCESS_TRACKER`**, **`dbo.ERROR_LOG`**, **`dbo.FINANCIAL_AUDIT`**, **`dbo.mule_test`** (and backups such as `PROCESS_TRACKER_bak`). | Lloyd's E2E **`SqlServerClient`** when **`SQLSERVER_*`** or **`AZURE_SQL_DB_DEV_*`** map to this host/db (`src/config/config.ts`, `muleProcessTrackerClient.ts`, `lloyds-pipeline-stages.steps.ts`). Sample: `SELECT * FROM dbo.PROCESS_TRACKER WHERE REPO_ID = 'US-56464';` |
| **TDS & wider UKS data estate (SQL Server instance)** | **`sql-dev-uks-01.accelins.com`** | Many databases on one instance (e.g. **`TDS`**, **`TDS_TEST_SCRIPTS`**, Claims, Reporting, FinancialDatamart, …). **Tagetik loader / written tables** for Lloyd's live here — **not** in the Azure SQL DB above. | **`SQL_LLOYDS_*`** (and optional reuse of the SQL SPN via `SQL_LLOYDS_REUSE_SQLSERVER_SPN`) — `lloydsTagetikTdsClient.ts` / Tagetik TDS Cucumber steps. |

**Entra (SPN) and interactive backup**

- **Same service principal** should be granted access to **both** endpoints where automation needs them (Azure SQL: database user / AAD auth; UKS SQL: login mapped to the same app registration as appropriate).
- **SSO / developer backup:** `DefaultAzureCredential` (`az login`, VS Code, managed identity) remains supported where the client already falls back to it (e.g. interactive engineer runs when SPN secrets are not loaded).

## 5. `PROCESS_TRACKER` state machine (what MuleSoft writes)

```
CLAIMED / RUNNING
  → XML_GENERATING / RUNNING
  → XML_REVIEW_PENDING / WAITING            ← Stage 1 complete; func-xml-totals has run
  → DMF_SUBMITTING / RUNNING                ← Stage 2 approval succeeded
  → DMF_SUBMITTED / WAITING
  → DMF_IMPORTING / WAITING
  → DMF_PROCESSING / WAITING
  → JOURNAL_APPROVAL_PENDING / WAITING
  → JOURNAL_POSTED / RUNNING                ← Stage 4 posting confirmed
  → DEPENDENT_PROCESS_TRIGGERING / RUNNING
  → COMPLETED / SUCCESS
```

**Failure status semantics:**
- `RETRY_PENDING` — retryable technical issue (network, timeout). Retries happen; stage unchanged.
- `RECONCILE_REQUIRED` — business / control issue (totals mismatch, rejected review). Needs Ops intervention.
- `FAILED` — terminal technical failure (retries exhausted).
- `CANCELLED` — intentional stop.

Every non-happy transition: **write `ERROR_LOG` first**, then update `PROCESS_TRACKER`, then raise/update a ServiceNow incident keyed by `PROCESS_ID` + `ERROR_ID`.

**Schema & ownership notes (team alignment — does not change §5 states):**

- **Composite key (agreed — MoM Tom / Sucharan / Peter / Ravindranath / Emily):** Programme tracking across **messages and tables** should use a **composite key: `repo ID` + Excel unique run ID** (same conceptual grain as unique-run discussions and `_ACCEL_UNIQUE_RUN_ID` where that appears in ADP). This gives uniqueness and simpler queries than repo-only keys. **E2E read-only** already asserts **`dbo.PROCESS_TRACKER`** per repo when SQL is configured (latest row by `REPO_ID`); finer grain (repo + Excel run id in SQL) remains **TBD** until the published ERD / columns are stable in automation.
- **Summary data product — `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP` (LIVE — 2026-04-23):** ADP landed this column on `FOWD__AGENCY_POLICY_FO_SUMMARY_V1`. It carries the **standard-detail table row-created timestamp** onto the summary so **incremental** Mule/ADP logic and “**latest row per repo**” identification are correct. Verified via `npm run lloyds:snowflake:probe` against the live schema; column metadata returned `TIMESTAMP_NTZ` and values are populated on every summary row. “Latest summary row” logic is now **first-class** rather than best-effort — `ORDER BY _ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP DESC` on the summary is the supported ordering. **Dev-env caveat:** environment cleanup is still pending (see [`LLOYDS_QA_PROGRESS.md`](./LLOYDS_QA_PROGRESS.md) **§4.3.1**), so expect junk / duplicated summary rows per repo until that lands — filter on `_ACCEL_REPOSITORY_ID` and order by `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP` when validating.
- **`PROCESS_TRACKER` — day zero vs steady state:** Sucharan and Peter reviewed **populate/query** logic so **repo IDs and unique IDs** line up and **duplicate processing** is avoided while preserving integrity. Implementation stays in Mule/SQL; automation does not encode insert-vs-update rules until schema/ERD is published.
- **Resubmissions and reversals:** **No resubmission** of the same financial run **after posting**. Any **replacement or reversal** must use **new repo IDs** so finance data products stay controlled and auditable.
- **Where to fix “duplicate” processing (historical narrative):** Prefer analysing **Mule extraction, watermark, and composite key** when the symptom is “same repo processed too many times” without a distinguishing run key. **Per-repo triage** (e.g. Snowflake summary vs detail, 2× ratios) remains valid and may point to **upstream ADP data** — see Snowflake ADP validation later in this doc.
- **One row updated vs new rows per stage:** The state machine above describes **logical** stage transitions. Whether production **`PROCESS_TRACKER`** is strictly **one physical row updated per process** or uses **multiple rows** over time is **TBD with business**; do not assume in automation until the schema/ERD is confirmed.

## 6. Correlation-ID policy (framework)

- **Range:** `0000-0000-0000-03000` → `0000-0000-0000-99999`. Numbers below `03000` are reserved for manual tests (hand-typed in Service Bus Explorer).
- **Counter:** committed at [`src/features/lloyds/test-data/sanity-counter.json`](../../src/features/lloyds/test-data/sanity-counter.json), bumped atomically by `bumpCounter()` in [`correlationIdCounter.ts`](../../src/integrations/lloyds/correlationIdCounter.ts).
- **Uniqueness matters:** `func-xml-totals` is idempotent on `(correlationId, messageType)`. Same id + same messageType = updates the existing record. Fresh id = new record. The framework therefore bumps on every real send.
- **Reuse across stages:** a single end-to-end run reuses the *same* correlation id from Stage 1 through Stage 5. When Row-2+ scenarios land, they will pass the correlation id forward rather than minting a new one.

## 7. Dataverse — `accelins_workflow` ("XML File") key fields

Entity set: `accelins_workflows`. Record primary key: `accelins_workflowid`. Correlation key: `accelins_correlation_id`.

| Concept | Logical name | Source |
|---|---|---|
| Name (auto-number) | `accelins_name` (mirrored in `accelins_xml_autonumber`) | Generated on record create |
| Correlation id | `accelins_correlation_id` | `mule-xml-generation-success` payload |
| Blob URL | `accelins_blob_id` | Payload (canonical: `https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml/<FileName>`) |
| File Type label | `accelins_file_type` | Derived (e.g. "Written Agency") |
| Process Path | `accelins_process_path` (boolean — ADP / non-ADP) | `func-xml-totals` |
| Repository File lookup | `_accelins_repositoryfile_value` | `func-xml-totals` resolves from `file_name` prefix |
| Destination Ledger / Legal Entity lookup | `_accelins_legal_entity_value` | `func-xml-totals` resolves from `file_name` prefix |
| ADP totals | `accelins_ods_total_{premium,agency_commission,commission,tax,other_contributions}_amount`, `accelins_ods_currency` | Payload `financial_values.*` |
| XML totals (`func-xml-totals` output) | `accelins_xml_total_{premium,agency_commission,commission,tax,other_contributions}_amount`, `accelins_xml_currency` | `func-xml-totals` reads blob; dev falls back to payload totals if blob missing |
| Match toggles | `accelins_overall_match`, `accelins_currency_match`, `accelins_total_*_match` | `func-xml-totals` comparison (ABS tolerance 5 currency units) |
| Status Reason | `statuscode` | `func-xml-totals` + Power Automate flow progression |

**Known `statuscode` values** (Status Reason labels on the form):

| Integer | Label | Reached after |
|---:|---|---|
| 100000003 | Ready to Ship to Dynamics | `func-xml-totals` happy path + dimension validation pass |
| — | Shipped to Dynamics | `mule-xml-submission-success` or `mule-dmf-import-success` |
| — | Failed to Ship to Dynamics | `mule-xml-submission-failed` |
| — | Failed to Import to Dynamics | `mule-dmf-import-failed` or `mule-dmf-processing-failed` |
| — | Ready to Post to Dynamics | `mule-dmf-processing-success` |

> Category naming gotcha: business category **COM** (Commission) maps to `accelins_ods_total_agency_commission_amount` and **COI** (Insurer Contribution) maps to `accelins_ods_total_commission_amount`. The inverse-ish naming is intentional — it matches the programme's field mapping sheet.

## 8. Azure Function Apps

| Function App | Trigger | Purpose |
|---|---|---|
| `func-xml-totals` | `ServiceBusTrigger` on `mule-xml-generation` | Fetch XML from blob → compute totals → create/update Dataverse record. Idempotent on `(correlationId, messageType)`. |
| `func-dimension-validation` | HTTP (invoked from Dataverse UI / plugin) | Read XML from blob → extract distinct dimension combinations → validate against D365 master data via Fabric → return `{ pass, invalidCombinations[] }` |
| `func-sb-monitoring` *(optional)* | `ServiceBusTrigger` on DLQs | DLQ drain, ServiceNow ticket creation, monitoring |

All functions emit **Application Insights** events carrying `messageType`, `correlationId`, `queueName`, `processingOutcome` for end-to-end trace.

## 9. Cross-cutting — observability

- Every message carries `correlation_id` → enables end-to-end tracing across Mule logs, Service Bus dead letters, Function App telemetry, Dataverse records, D365 DMF execution summaries.
- **Application Insights** on every Function App; dashboards track `messageType`, `correlationId`, `queueName`, `processingOutcome`.
- **Azure Monitor / Workbooks** dashboards for queue depth, DLQ count, function failure rate.
- DLQ drops after `MaxDeliveryCount = 5` — `func-sb-monitoring` picks them up and raises ServiceNow incidents.

## 10. Sample payloads

### Stage 1 — `mule-xml-generation-success`

```json
{
  "message": "mule-xml-generation-success",
  "correlation_id": "0000-0000-0000-03001",
  "file_name": "AEUM US-58338 202604091630.xml",
  "blob_id": "https://saaccdevukslyd.blob.core.windows.net/mulesoft-xml/AEUM US-58338 202604091630.xml",
  "financial_values": {
    "adp_currency": "USD",
    "adp_prm": 1550.00,
    "adp_com": -387.50,
    "adp_coi": 527.00,
    "adp_tax": 0,
    "adp_oth": 0
  }
}
```

> **Shape note:** programme samples sometimes abbreviate `blob_id` to a bare file name. The framework always sends the full `https://…/mulesoft-xml/<FileName>` URL so the field is unambiguous for future consumers and for log correlation.

### Stage 2 — `dv-xml-approval-failed` (shape)

```json
{
  "message": "dv-xml-approval-failed",
  "correlation_id": "0000-0000-0000-03001",
  "error": {
    "process_name": "",
    "failed_stage": "",
    "error_message": "",
    "error_source": "",
    "error_timestamp": "yyyy-MM-ddThh:mm:ssZ"
  }
}
```

### Stage 3 — `mule-xml-submission-success`

```json
{
  "message": "mule-xml-submission-success",
  "correlation_id": "0000-0000-0000-03001",
  "file_name": "AEUM US-58338 202604091630.xml",
  "blob_id": "AEUM US-58338 202604091630.xml"
}
```

### Stage 3 — `mule-xml-submission-failed`

```json
{
  "message": "mule-xml-submission-failed",
  "correlation_id": "0000-0000-0000-03001",
  "error": {
    "process_name": "RETRY_PENDING",
    "failed_stage": "DMF_SUBMITTING",
    "error_message": "DMF_SUBMISSION_FAILED | Approved XML could not be submitted to D365 DMF | file={XML_FILE_NAME}",
    "error_source": "D365_DMF",
    "error_timestamp": "yyyy-MM-ddThh:mm:ssZ"
  }
}
```

## 11. File-name contract (non-negotiable)

**`mulesoft-xml` accepts two shapes** (both parsed by `parseFileName` in `xmlFileName.ts`):

**Classic (space-separated):**

```
<LEDGER> <REPO_ID> <YYYYMMDDHHMM>.xml
AEUM   US-58338  202604091630        .xml
```

**WBX (underscore-separated — Snowflake run id embedded):**

```
WBX_<REPO_ID>_<_ACCEL_UNIQUE_RUN_ID>_<YYYY-MM-DD> <HH-mm-ss.SSS>.xml
WBX_US-56464_04a80873-3ba1-4caa-9316-d1a0f6ab1b9c_2026-04-27 15-52-00.773.xml
```

The UUID segment is the same **`_ACCEL_UNIQUE_RUN_ID`** Mule / ADP use (and often the Service Bus `correlation_id`). For WBX names the framework treats **`ledger` as `AEUM`** for Dataverse `accelins_legalentity` lookup; only `<REPO_ID>` is read from the file name for repository resolution.

- `<LEDGER>` (classic only; 3–4 upper-case letters): resolves to an `accelins_legal_entity` master record. **Lloyd's agency branch code is AEUM** — use AEUM in all programme documentation and examples; ignore other ledger tokens called out in older drafts or historical planner output.
- `<REPO_ID>` (e.g. `US-58338`): resolves to an `accelins_repositoryfile` master. If either lookup fails, the record is created but the lookup stays null — a silent "false OK" that the sanity assertion catches explicitly.
- **Stamp:** classic uses `<YYYYMMDDHHMM>`; WBX uses the trailing wall-clock timestamp normalised to **`YYYYMMDDHHMM`** (minute resolution) for sorting in the planner.

Framework helpers (validate and build): [`src/integrations/lloyds/xmlFileName.ts`](../../src/integrations/lloyds/xmlFileName.ts).

## 12. What the framework can test *today* vs *later*

| Stage | Can test now? | Where / how |
|---|---|---|
| **1** — publish `mule-xml-generation-success` | ✅ Yes — Row-1 sanity | CLI `npm run lloyds:sanity:send-xml` or feature `@lloyds @smoke @PP-391-API-001` |
| **2.1** — `func-xml-totals` creates Dataverse record + ADP totals | ✅ Yes | Same as above (asserts record + workflow totals ABS±5 on `accelins_workflow`) |
| **2.1** — `func-xml-totals` actually reads the blob | ✅ Yes — **proved by observation on 2026-04-18**: the function *requires* the blob at the exact `blob_id` URL and dead-letters with "Blob not found" if missing. Not tolerant. | Row-1 sanity (any runnable row) |
| **2.2** — `func-dimension-validation` runs after creation | ✅ Partial — observed auto-advance to `Approved` when ledger + repo both resolve. Explicit HTTP-invocation scenario still `@wip`. | Drafted in [`src/features/api/PP/PP-429.feature`](../../src/features/api/PP/PP-429.feature) |
| **3** — DMF submit / import / processing (`mule-xml-submission-*` / `mule-dmf-*`) | ❌ Relies on approval flow + DMF side. Can be partially simulated by pushing canned messages to `mule-d365-import`. | Drafted as `@wip` in [`src/features/api/PP/PP-391.feature`](../../src/features/api/PP/PP-391.feature) and siblings |
| **4** — Journal posting (`dv-journal-posting-*`) + **Tagetik / TDS** on the Mule posting leg | ❌ Manual Ops step + Fabric Link monitor; TDS/Tagetik read-only when env set | Stage 4 (TDS **not** triggered by `mule-dependantproduct` alone) |
| **5** — ADP downstream (`mule-dependentproduct-*` on `mule-dependantproduct`) | ❌ | Stage 5 — **independent** of Tagetik/TDS materialisation timing |

**Empirical proof we collected while building Row-1 sanity:**

| Observation | Implication |
|---|---|
| Wrong container name or stale blob URL → DLQ `"Blob not found"` | `func-xml-totals` is strict about the `blob_id` URL. Not tolerant of missing blobs. |
| Valid blob + unknown `<REPO_ID>` (not in `accelins_repositoryfile` master) → DLQ `"Guid.Empty for relationship=accelins_RepositoryFile_..."` | File name is a contract: ledger + repo must pre-exist in Dataverse master, or the create fails with the lookup set to `Guid.Empty`. |
| Valid blob + known ledger + known repo → record `01712` / `01725` created, Status Reason = `Approved` → `Ready to Ship to Dynamics`, `Process Path = ADP`, all match toggles `Yes` | `func-xml-totals` and `func-dimension-validation` both ran automatically and end-to-end in < 1 min. |
| `accelins_workflow` primary name columns on `accelins_legalentity` and `accelins_repositoryfile` hold the business code (e.g. `"AEUM"`, `"US-58338"`) — no separate `accelins_code` field | Discovery queries select `accelins_name` as the code; planner indexes on that. |

**Negative scenarios the framework can drive today** (paste-and-verify without SPN Sender, or fully auto once SPN Sender + Application User lands). Every row below was proven end-to-end on 2026-04-18 with correlation ids `03006`–`03009`:

| Scenario | Driver | Actual DLQ `failed_stage` + error signature | Dataverse |
|---|---|---|---|
| `REPO_NOT_IN_MASTER` | `--blocked-reason REPO_NOT_IN_MASTER` | `Error while creating/updating XML Record` — `"ReferencingEntity=accelins_workflow has attribute accelins_repositoryfile value=Guid.Empty for relationship=accelins_RepositoryFile_accelins_Reposito"` | no record |
| `LEDGER_NOT_IN_MASTER` | `--blocked-reason LEDGER_NOT_IN_MASTER` | **Same shape as REPO_NOT_IN_MASTER** (see below) — `func-xml-totals` resolves the repo lookup first, so the Guid.Empty fails on `accelins_repositoryfile` even when the *ledger* is the actual gap | no record |
| `BLOB_MISSING` | `--blob-missing` (runnable row + wrong container URL) | `Error while retreiving blob details` — `"Blob not found: https://…/mulesoft-xml/<file>"` *(note: programme typo `retreiving`)* | no record |
| `BAD_FILE_NAME` | `--bad-file-name "ZZZZ XX-00000 ….xml"` | `Error while retreiving blob details` — the blob-read step runs **before** filename parsing, so a bogus name manifests as `"Blob not found: https://…/mulesoft-xml/<bogus>"` | no record |
| **Idempotency** (positive) | Same `--correlation-id` sent twice | n/a (no DLQ — second send updates in place) | exactly 1 record |

**`func-xml-totals` observed ordering (derived from DLQ shapes):**

1. Read blob from `blob_id` URL → `Error while retreiving blob details` / `Blob not found` on failure.
2. Parse file name + resolve `accelins_legalentity` **and** `accelins_repositoryfile` lookups → `Error while creating/updating XML Record` / `Guid.Empty` on failure (error always names `accelins_repositoryfile` even when the ledger is the actual gap).
3. Create/update the `accelins_workflow` record with ADP + XML totals + resolved lookups.
4. `func-dimension-validation` runs as a post-create step (evidenced by `accelins_dimensionvalidationstatus` fields on the record and the auto-advance from *Approved* to *Ready to Ship to Dynamics*).

This ordering means:
- **Bad-file-name + valid-blob-url would take a different DLQ path** than our synthesised case (we used a bogus name AND bogus blob, so the blob-not-found check fired first).
- To distinguish LEDGER_NOT_IN_MASTER from REPO_NOT_IN_MASTER purely by DLQ text, you need a *positive* evidence (e.g. a separate `accelins_legal_entity` Guid.Empty error) — the current function doesn't emit one.

*Proven DLQ fixtures for regression use* (copy from session run of 2026-04-18; file names normalised to **AEUM** for programme docs):
- `03006` — https://…/mulesoft-xml/AEUM US-56464 202604171931.xml — `accelins_repositoryfile=Guid.Empty` *(repo / resolution as observed in session)*
- `03007` — https://…/mulesoft-xml/AEUM US-58338 202604091630.xml — same signature (ledger gap manifests here)
- `03008` — https://…/mulesoft-xml/AEUM US-58338 202604091630.xml — `Blob not found` (wrong container / missing blob)
- `03009` — https://…/mulesoft-xml/ZZZZ XX-00000 202604181800.xml — `Blob not found`

> **Canonical end state (confirmed 2026-04-18 on records `01712` and `01725`):** happy-path lands on **`statuscode 100000003` / "Ready to Ship to Dynamics"** (displayed as a yellow badge top-right of the XML File form, with the Operational Workflow progress track stopped on the **Ship To Dynamics** stage). The automation's sanity assertion pins this integer. Any other value ⇒ sanity warning, non-zero exit.

### Snowflake ADP validation (FOWD / FOWC)

Mule reads **ADP summary (and detail) products in Snowflake** before building the Service Bus payload’s `financial_values` and the journal XML. Since **2026-04-23** the summary product exposes **`_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP`** (the standard-detail table row-created timestamp, propagated onto the summary) — prefer `ORDER BY` / filters on `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP` over implicit ordering. For validation **outside** this repo (Snowflake worksheet or ADP SQL console), use these objects under **`FINANCIAL_OPERATIONS`**:

| Purpose | Object / query |
|---|---|
| **Per-repository ADP summary** (same lineage as the totals Mule compares in Stage 2.1) | `FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1` — filter on `_accel_repository_id`. |
| **Clone / volume smoke — core written policy** | `SELECT COUNT(*) FROM FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1` |
| **Clone / volume smoke — Agency FO slice feeding D365 path** | `SELECT COUNT(*) FROM FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1` |

**Single repo (example — replace with any Lloyd’s Agency repo id):**

```sql
SELECT *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1
WHERE _accel_repository_id = 'US-61273';
```

**Latest run per repo (matches Mule’s upstream selection — confirmed 2026-04-23):** Mule resolves the **latest `_ACCEL_UNIQUE_RUN_ID`** by `MAX(_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP)`. Since 2026-04-23 that column is also populated **on the summary itself**, so triage queries no longer need to join out to the detail tables. Preferred form:

```sql
-- Latest summary row for a repo (_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP now carried on the summary)
SELECT *
FROM   FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1
WHERE  _accel_repository_id = 'US-61273'
ORDER  BY _accel_std_table_row_created_timestamp DESC
LIMIT  1;
```

If you need to verify Mule’s selection against the **upstream** grain directly (e.g. confirming the summary was built from the run id Mule saw), keep the detail-join form:

```sql
WITH latest AS (
  SELECT _accel_unique_run_id,
         MAX(_accel_std_table_row_created_timestamp) AS latest_ts
  FROM   FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
  WHERE  _accel_repository_id = 'US-61273'
  GROUP  BY _accel_unique_run_id
  ORDER  BY latest_ts DESC
  LIMIT  1
)
SELECT s.*
FROM   FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1 s
JOIN   latest l ON s._accel_unique_run_id = l._accel_unique_run_id;
```

Swap the `FROM` table to `FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1` when the detail lineage flows through Core. A `SELECT COUNT(*)` variant of the join confirms the summary has exactly one row for the winning run id. Dev-env note: until environment cleanup lands, some repos (e.g. `US-57244`, `US-57524`) currently carry multiple summary rows at different `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP` values — the preferred form correctly returns the most recent one.

**All twelve Lloyd’s Agency repo ids in one result set** (adjust column list to what you need for diffing against Dataverse `accelins_ods_*` or the SB message):

```sql
SELECT *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1
WHERE _accel_repository_id IN (
  'US-60507', 'US-57250', 'US-61066', 'US-60464',
  'US-56464', 'US-61070', 'US-58237', 'US-57244',
  'US-60465', 'US-57524', 'US-58338', 'US-61273'
);
```

**How to use this in validation**

- **Totals mismatch triage:** Compare Snowflake summary columns for a repo to Dataverse `accelins_ods_total_*` and `accelins_xml_total_*` on the same `accelins_workflow` row. If Snowflake ↔ ODS agree but XML differs, compare **grain**: Mule may be building XML from **detail** row sets while the Service Bus message’s `financial_values` (ODS) comes from a **summary** product — a **2× ratio** can mean duplicate rows or double-counted business keys **on the ADP / Snowflake side** (not only a Mule transform bug). If Snowflake ↔ ODS disagree, the issue is earlier in the ADP → message path. **US-61273:** programme analysis (spreadsheet review of ADP extracts) indicates the apparent duplication **presents in ADP data**; treat Mule/XML as downstream of that until ADP dedupes or redefines summary vs detail.
- **Clone completeness:** After “ADP data cloned”, both `COUNT(*)` queries should return **non-zero**; large unexpected deltas between environments or between `FOWC__POLICY_CORE_V1` and `FOWD__AGENCY_POLICY_FO_V1` volumes warrant a data-engineering check before blaming Mule or `func-xml-totals`.

> **Scope reminder:** Agency XML and these FOWD views are in scope for Lloyd’s Written BDX. Insurer-only paths are out of scope per programme Decision 2; the thirteen `US-*` repos in `LLOYDS_AGENCY_COHORT_12` are the Agency blob/ADP cohort under test.

### Dynamics Dataverse — `accelins_repositoryfile` manual clone programme (Agency cohort)

ADP / Snowflake and **`mulesoft-xml`** cover **thirteen** Agency `_ACCEL_REPOSITORY_ID` values in **`LLOYDS_AGENCY_COHORT_12`** (see `lloydsClonedRepoCohort.ts`). **Snowflake / ADP data alone does not create** Dataverse `accelins_repositoryfile` rows; QA **manually clones** each repository into Dynamics so **`accelins_name`** equals the repository id (e.g. `US-60507`) and the record is linked to legal entity **AEUM** (programme agency branch).

**Authoritative clone status (2026-04-29)** — **ten** repos cloned in Dynamics after data clear + reload; **three** cohort ids still pending manual clone. (QA **Repository ID** filter view: green/yellow = cloned; purple = not cloned yet.)

| Status | Repository IDs |
|--------|------------------|
| **Cloned in Dynamics (10)** | `US-60507`, `US-61066`, `US-56464`, `US-57244`, `US-57524`, `US-61273`, `US-60465`, `US-61070`, `US-60464`, `US-61822` |
| **Pending manual clone (3)** | `US-58237`, `US-58338`, `US-57250` |

After each clone batch, run `npm run lloyds:diagnose:12-repos -- --json-out reports/lloyds-diagnose-12-repos.json` and confirm `dvExists: true` for each repo in `summaries`. Refresh the sanity planner when master data changes: `npm run lloyds:sanity:plan`. Living programme copy: [`LLOYDS_QA_PROGRESS.md`](./LLOYDS_QA_PROGRESS.md) §4.0.1.

### Twelve-repo diagnostic (empirical — 2026-04-21 snapshot; master-data row superseded 2026-04-24)

Run: `npm run lloyds:diagnose:12-repos` (uses `D365_USE_SPN=true` or `az login` per `credential.ts`). Script: [`scripts/lloyds/diagnose-lloyds-repos.ts`](../../scripts/lloyds/diagnose-lloyds-repos.ts).

| Finding | Evidence |
|---|---|
| **Mule is processing all 12** | `PROCESS_TRACKER` shows **196–229 runs per repo**; latest row for every repo is **`AWAITING_APPROVAL_TO_POST`**. |
| **SQL stage ≠ Dataverse approval state** | **`AWAITING_APPROVAL_TO_POST` in Azure SQL does not mean** the XML File is still waiting for manual review. **`func-xml-totals` + `func-dimension-validation` can auto-approve**; Dataverse then shows **Review XML File** complete, **SOP “Ready to Ship to Dynamics”**, workflow on **Ship To Dynamics** (`statuscode` **100000002** / **100000003**). Trust **`accelins_workflow.statuscode`** and the Operational Workflow strip — **not** the Mule tracker label alone. |
| **Healthy Lloyd’s repos auto-approved** | **`US-56464`** and **`US-61070`** reach **`overall_match = true`**, **Approved / Ready to Ship** in Dataverse while the tracker may still read **`AWAITING_APPROVAL_TO_POST`**. Remaining work is **DMF ship / post**, not Accounting Approvals totals review. |
| **Dataverse `accelins_repositoryfile` (clone programme)** | **Current (2026-04-29):** **10 / 13** Agency cohort repos manually cloned in Dynamics — see **§ Dynamics clone programme** above. **Still to clone:** `US-58237`, `US-58338`, `US-57250`. *(Older 2026-04-21 diagnostic JSON showed only **3 / 12** with `accelins_repositoryfile` rows — that snapshot is **superseded** by QA clone work; always re-run `lloyds:diagnose:12-repos` for live counts.)* |
| **Totals mismatch is not one global 2× bug** | On a **2026-04-21** snapshot when only three repos had master + latest `accelins_workflow`, **`US-56464`** and **`US-61070`** showed **XML/ODS ratio 1.00** on PRM/COI (COM −1.00 from sign convention); **`US-61273`** showed **2.00 / −2.00** and `overall_match = false`. The “systematic 2× on every Lloyd’s repo” hypothesis was **rejected** for that snapshot — **61273 was an outlier**. Re-run diagnose after more repos have master rows to refresh ratios. |
| **XML shape varies by repo** | Blob parse counts (`LEDGERJOURNALENTITY` tags / distinct DOCUMENT / distinct TEXT) differ widely (e.g. `6/2/3` vs `198/66/9`). Only some runs sit in the **~2 tags per TEXT** band — do not assume identical journal shape across all twelve watermarks. |

**Recommended next checks**

1. **Master data:** Complete Dynamics clone for **`US-58237`, `US-58338`, `US-57250`** (`accelins_repositoryfile` + **AEUM** legal entity link) when scheduled (**within a few days**). Then re-run `lloyds:diagnose:12-repos` until all twelve show `dvExists`.
2. **Snowflake:** For any repo still blocked on master, run `FOWD__AGENCY_POLICY_FO_SUMMARY_V1` filtered by `_accel_repository_id` — confirms ADP is populated while Dataverse awaits the clone.
3. **61273 only:** If `overall_match` or ODS/XML ratio regressions reappear, prioritise **ADP / Snowflake** checks (row-level duplicates in `FOWC` / `FOWD` lineage vs summary grain) before blaming Mule or `func-xml-totals`.

**Reference repos (healthy totals — 2026-04-21):** **`US-56464`** and **`US-61070`** each show **5 consecutive Mule runs** with **`SRC_ROW_COUNT = 6`**, **6 `LEDGERJOURNALENTITY` lines**, **2 distinct DOCUMENT values**, **`overall_match = true`**, ODS = XML = automation re-parse on PRM/COM/COI, **stddev 0** across watermarks, and **`maxDupCountOn(doc+text) = 1`** (no duplicated document+TEXT pairs). Blob objects in **`mulesoft-xml`** often use the **`WBX_<REPO_ID>_<run-uuid>_…xml`** naming convention (see §11); the planner still resolves legal entity **AEUM** for those. They are **auto-approved** on the XML File (no totals mismatch blocking approval). Use them as **controls** when contrasting **`US-61273`** (higher line count + 2× ODS vs XML).

> **ID gotcha:** **`US-60464`** and **`US-56464`** are different repository files — compare digit-for-digit to **`accelins_repositoryfile.accelins_name`**. **US-61070** Ops UI (Ready to Ship, Ship To Dynamics) matches automation for that repo. **File Name** on the form is **not** a reliable identifier (free text; may contain any historical or template substring) — **discard it** for repo correlation; use **Repository File ID** and the **journal / blob XML file name** (classic `AEUM US-58338 …xml` or WBX `WBX_US-58338_<uuid>_…xml`) instead.

## 13. Framework code map (where to extend)

```
src/integrations/lloyds/
  ├── credential.ts                 # DefaultAzureCredential / SPN chain for discovery
  ├── xmlFileName.ts                # parse/build/validate file names + blob URL rewriting
  ├── xmlTotals.ts                  # DEBIT−CREDIT totals by TEXT pipe-category
  ├── correlationIdCounter.ts       # read/bump the committed counter
  ├── dataverseMasterDataClient.ts  # list accelins_legalentity / accelins_repositoryfile masters
  ├── blobContainerClient.ts        # list + download blobs from mulesoft-xml
  ├── sanityPlanner.ts              # blob × Dataverse → {runnable, blocked}, writes sanity-plan.json
  ├── sanityTestDataLoader.ts       # legacy xlsx path (used as fallback when no plan exists)
  ├── serviceBusSender.ts           # mule-xml-generation-{success,failed} + SPN auth
  └── xmlFileRecordClient.ts        # Dataverse query + poll for accelins_workflow records
scripts/lloyds/
  ├── refresh-sanity-plan.ts        # `npm run lloyds:sanity:plan` — rebuild the snapshot
  └── send-mule-xml-generation-test-message.ts   # CLI (legacy smoke + plan-driven sanity + xlsx fallback)
src/features/lloyds/
  ├── lloyds-pipeline-hops.feature               # Per-hop SB → Dataverse (Stage 1 runnable; later-hop @wip)
  ├── lloyds-pipeline-e2e-readonly.feature      # Ten-repo read-only after cleanup + load (readiness gate)
  ├── lloyds-pipeline.feature                  # Snowflake modules §B + §C–§I scaffold (@wip)
  ├── test-data/
  │    ├── sanity-counter.json                   # committed correlation-id counter (seed 03000)
  │    └── sanity-plan.json                       # committed discovery snapshot (run plan refresh to seed)
  └── README.md                                   # run book
src/step-definitions/lloyds/
  └── xml-generation.steps.ts                    # Cucumber steps composing the helpers above
docs/lloyds/XMLs/
  ├── *.xml                                       # committed sample XMLs (totals computation)
  └── XML-URL.xlsx                                # advisory curated list (superseded by sanity-plan.json)
```

## 17. Sanity test-data discovery (the planner)

Live discovery feeds a committed snapshot. Refresh on demand.

```
┌─────────────────┐    ┌─────────────────────────────┐    ┌────────────────┐
│ mulesoft-xml    │    │ accelins_legalentity /      │    │ sanity-plan.   │
│ blob container  │    │ accelins_repositoryfile     │ ⇒  │ json (committed)│
│  *.xml list     │ ⇒  │ master (Dataverse)          │    │ runnable [],   │
└─────────────────┘    │ via D365 Web API v9.2       │    │ blocked [],    │
                       └─────────────────────────────┘    │ masterData …   │
                                                          └────────────────┘
                                                                  ↓
                                            ┌────────────────────────────────┐
                                            │ CLI --from-plan (default)      │
                                            │ Cucumber "sanity plan loaded"  │
                                            └────────────────────────────────┘
```

### Decisions baked in

- **Blob-first with Dataverse filter.** The spreadsheet `docs/lloyds/XMLs/XML-URL.xlsx` is now advisory. Runnable rows come from the blob container intersected with live master data.
- **Interactive auth today, SPN-ready.** Discovery uses `DefaultAzureCredential` (`az login` once). Flip `LLOYDS_USE_SPN=true` after the SPN permissions land and the same code path uses the governed SPN — no call-site changes.
- **Snapshot on demand.** `npm run lloyds:sanity:plan` refreshes. Sanity runs read the snapshot only; no live calls during test execution. Staleness warning kicks in after 14 days (configurable via `--plan-max-age-days`).

### Runbook

```bash
# 1) One-time: authenticate
az login

# 2) Refresh the plan (writes src/features/lloyds/test-data/sanity-plan.json)
npm run lloyds:sanity:plan

# 3) Inspect without touching the network
npm run lloyds:sanity:plan:status

# 4) Run sanity using the plan (auto-detected)
npm run lloyds:sanity:send-xml -- --row-index 0
npm run lloyds:sanity:send-xml -- --row-name "AEUM US-58338 202604091630.xml"
```

### When to refresh

- A repository file or legal entity was loaded into master data → refresh.
- Someone uploaded new XMLs to `mulesoft-xml` → refresh.
- CI staleness warning fires → refresh and commit.

### Fallback

If you can't refresh (no az login), the send CLI falls back to the xlsx loader when you pass `--from-xlsx`. This is the old code path — retained for emergencies only.

### Reuse-first rules

- **Do not** create new Service Bus or Dataverse clients — extend `serviceBusSender.ts` / `xmlFileRecordClient.ts`.
- **Do not** parse file names inline — call `parseFileName` / `buildFileName`.
- **Do not** mint ad-hoc correlation ids — call `bumpCounter({ xmlName, row })`.
- **Do not** hardcode `mulesoft-xml` — use `buildBlobId(name, base?)` so the container is env-configurable.
- **Do not** duplicate xlsx readers — call `loadSanityRows()`.
- **When adding Stage 3–5 scenarios:** reuse the same `correlation_id` the Stage 1 send produced — don't bump the counter again within a single run.

## 14. Running the Row-1 sanity test

### CLI (interactive)

```bash
# Dry-run — prints the payload, does not send, does not bump the counter
npm run lloyds:sanity:send-xml:dry -- --row-index 0

# Real send — bumps counter, sends to Service Bus, polls Dataverse for the record
npm run lloyds:sanity:send-xml -- --row-index 0 --timeout-ms 180000
npm run lloyds:sanity:send-xml -- --row-name "AEUM US-58338 202604091630.xml"
```

### Cucumber

```bash
npm run test:api -- --tags "@lloyds and @smoke"
```

Both paths go through the same helpers — no behavioural divergence between "from my laptop" and "from CI".

### Env requirements

- `LLOYDS_SERVICE_BUS_TENANT_ID/CLIENT_ID/CLIENT_SECRET` — SPN with **Azure Service Bus Data Sender** on `sb-dev-uks-lyd`.
- `D365_TENANT_ID/CLIENT_ID/CLIENT_SECRET/SCOPE/BASE_URL` — SPN with Dataverse read access on `accelinsqatest.crm11.dynamics.com` (**not** `accelinsqatest2`).
- Optional: `LLOYDS_BLOB_CONTAINER_BASE_URL` — override the default `mulesoft-xml` container.

See [`src/config/env/env.sample`](../../src/config/env/env.sample) → LLOYD'S section.

## 15. Common failure modes and how to spot them

| Symptom | Most likely cause | Where to look |
|---|---|---|
| CLI send succeeds but no record appears after 3 min | `file_name` doesn't resolve to a known `accelins_repositoryfile` — `func-xml-totals` silently drops | Check the `<REPO_ID>` part of the file name against Dataverse "Repository Files" master. |
| Record appears but Repository File lookup is null | Same as above, but `func-xml-totals` chose to create the shell record anyway | Assertion `the record should have a Repository File lookup resolved` catches this. |
| Same correlation id used twice with same messageType returned the same record | Expected — `func-xml-totals` is idempotent on `(correlationId, messageType)` | Bump the counter / pass a fresh `--correlation-id`. |
| `statuscode` stuck at an earlier value (not 100000003) | `func-xml-totals` hit an error or `func-dimension-validation` didn't run | Inspect `accelins_process_error`, `accelins_dimensionvalidationerror` on the record + App Insights for the function. |
| CLI 401 / 403 on Dataverse poll | `D365_BASE_URL` still points at `accelinsqatest2`, or the SPN lacks an Application User in the Lloyd's env | [`src/config/env/.env.qa`](../../src/config/env/.env.qa); grep `accelinsqatest2`. |
| Service Bus `Unauthorized` | SPN in wrong tenant or missing `Azure Service Bus Data Sender` role on `sb-dev-uks-lyd` | Azure Portal → Service Bus → IAM. |
| Message shows up in DLQ after ~5 retries | Consumer (function / Power Automate) is throwing repeatedly | Function App App Insights + `func-sb-monitoring` output. |
| `Counter exhausted at 0000-0000-0000-99999` | Sanity ran 97k times (unlikely in practice) | Extend `MAX_COUNTER` in [`correlationIdCounter.ts`](../../src/integrations/lloyds/correlationIdCounter.ts). |

## 16. Source documents (authoritative)

- Programme architecture summary: [`LLOYDS_DATA_FLOW_ARCHITECTURE.md`](./LLOYDS_DATA_FLOW_ARCHITECTURE.md)
- Confluence export (Mule ↔ D365, Service Bus events, function roles): [`confluence-lloyds-mulesoft-d365-agency-journals.md`](./confluence-lloyds-mulesoft-d365-agency-journals.md)
- Service Bus message contracts (shape + samples): [`confluence-service-bus-messages.md`](./confluence-service-bus-messages.md)
- Test strategy overview: [`LLOYDS_TEST_STRATEGY.md`](./LLOYDS_TEST_STRATEGY.md) and [`LLOYDS_AUTOMATION_FIRST_APPROACH.md`](./LLOYDS_AUTOMATION_FIRST_APPROACH.md)
- DMF API: `DMF API Integration 1 1.docx` (same folder)
- Lloyd's Testing Helper Confluence page: <https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3159359512>

---

*Last updated with programme team stage-by-stage inputs (April 2026). When you change pipeline semantics, update this file in the same PR so the next engineer gets the current map.*
