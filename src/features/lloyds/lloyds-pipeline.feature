# ══════════════════════════════════════════════════════════════════════════════
# Lloyd's pipeline — umbrella feature (Snowflake modules + downstream scaffold)
#
# Scope: ADP → MuleSoft → D365 F&O agency journal pipeline — Snowflake contract tests and
#   scaffold scenarios for stages not yet fully automated here.
#
# Split companion files (preferred entry points):
#   • lloyds-pipeline-hops.feature     — per-hop SB inject + assert (Stage 1 + hop scaffolds); npm run test:lloyds:hops
#   • lloyds-pipeline-e2e-readonly.feature — seventeen-repo read-only after manual cleanup + load; npm run test:lloyds:e2e-readonly
#
# Sections in this file (each gated by tags so you can run narrow slices):
#
#   §A  (moved) Stage 1 hop tests live in lloyds-pipeline-hops.feature
#   §B  Phase 2 — Snowflake module tests only .... @phase-2 @module
#         SNOW-001..004 + schema;
#         Ten-repo ODS / cross-read / PROCESS_TRACKER / Tagetik → lloyds-pipeline-e2e-readonly.feature
#   §C  Stage 2.2 — Dimension validation            .... @stage-2 @phase-2 (PP-429 HTTP + Dataverse; opt-in env)
#   §D  Stage 3 — DMF submission to D365 F&O        .... @stage-3 (narrative steps skip until LLOYDS_LIVE_DMF_*)
#   §E  Stage 4 — Journal posting                   .... @stage-4 (skip until LLOYDS_LIVE_POSTING_*)
#   §F  Tagetik/TDS + ADP downstream                .... @stage-4|@stage-5 @tagetik (TGT-001 Snowflake; rest opt-in)
#   §G  Regression — Lloyd's exclusion (ENG-44)     .... @regression (SQL probes via LLOYDS_ENG44_*)
#   §H  End-to-end — real Mule run trace            .... @e2e @phase-3 (skip until LLOYDS_E2E_TRACE_*)
#   §I  Unit-level helper assertions                .... @unit (+ Vitest `tests/unit/lloyds-*.test.ts`)
#
# How to select (Lloyd's ONLY — do not use bare `npm run test:all` or `npm run test:api`):
#   • `npm run test:all` with no paths loads **all** of `src/features` (unrelated programmes — avoid for Lloyd's-only runs).
#   • `npm run test:api` always includes `src/features/kb/sf/**/*-api.feature` — not Lloyd's-only.
#   Prefer dedicated scripts:
#     npm run test:lloyds:hops             # Stage 1 per-hop file (not @wip)
#     npm run test:lloyds:phase2           # this file — Snowflake modules only (not @wip)
#     npm run test:lloyds:e2e-readonly     # seventeen-repo read-only (requires readiness gate or LLOYDS_E2E_READINESS_ACK)
#     npm run test:lloyds:phase1-and-2     # hops Stage 1 + this file Phase 2
#   Equivalent manual form for hops:
#     npm run test:all -- src/features/lloyds/lloyds-pipeline-hops.feature --tags "@lloyds and @stage-1 and not @wip"
#
# Background / canonical references:
#
#   ADP source (Snowflake, per `docs/lloyds/SKILL.md` §3 + `docs/lloyds/ADP.sql`):
#     FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1            -- core detail
#     FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1            -- D365 detail
#     FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1    -- D365 summary
#     FINANCIAL_OPERATIONS.FINOPS_WRITTEN_TAGETIK_PUBLIC.FOWT__TAGETIK_V1                         -- Tagetik slice
#
#   Confirmed Mule upstream selection (2026-04-23):
#     Mule picks the latest `_ACCEL_UNIQUE_RUN_ID` for a repo by
#     `MAX(_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP)` across the detail table(s), then
#     reads the matching row on the summary. Since 2026-04-23 the summary carries
#     `_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP` itself, so triage can use the summary
#     alone.  Full context: `docs/lloyds/LLOYDS_TEST_STRATEGY.md` §2.
#
#   Agency branch (ledger) for Lloyd's is **AEUM** — all programme examples and BDD rows use
#   AEUM-led file names unless a scenario intentionally uses a blocked / synthetic ledger.
#
#   Mule-style field mapping (summary → `mule-xml-generation-success.financial_values`):
#     Programme reference: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2906161167/D365+MuleSoft+Integration+Field+Mappings
#     Repo-local mirror: `docs/lloyds/SKILL.md` §3 + `LLOYDS_TEST_STRATEGY.md` §2.
#     message          → "mule-xml-generation-success"
#     correlation_id   → process id  (framework: `0000-0000-0000-NNNNN`)
#     file_name        → classic `<LEDGER> <REPO_ID> <YYYYMMDDHHMM>.xml` or WBX `WBX_<REPO>_<run-uuid>_…xml` (latest **runnable** from `sanity-plan.json` per repo)
#     blob_id          → `https://…/mulesoft-xml/<file_name>`
#     financial_values.adp_prm       ← TOTAL_PREMIUM_AMOUNT
#     financial_values.adp_com       ← TOTAL_AGENCY_COMMISSION_AMOUNT (preferred) or TOTAL_MEMBER_COMMISSION_AMOUNT (legacy)
#     financial_values.adp_coi       ← TOTAL_COMMISSION_AMOUNT (preferred) or TOTAL_INSURER_COMMISSION_AMOUNT (legacy)
#     financial_values.adp_tax       ← TOTAL_TAX_AMOUNT
#     financial_values.adp_oth       ← TOTAL_OTHER_CONTRIBUTIONS_AMOUNT
#     financial_values.adp_currency  ← POLICY_CURRENCY_CODE
#
#   Stage 1 hop automation lives in **lloyds-pipeline-hops.feature** (Service Bus → Dataverse).
#     Post-load ten-repo read-only chain lives in **lloyds-pipeline-e2e-readonly.feature**.
#
#   UCI: API tests do not open Power Apps — after a green run, manually confirm Accounting Approvals.
#
#   Test data (plan-driven):  `src/features/lloyds/test-data/sanity-plan.json` + `sanity-counter.json`
#   Refresh:                   npm run lloyds:sanity:plan
#
#   JIRA anchors:
#     PP-391 — Stage 1 capture + totals persistence        https://accelins.atlassian.net/browse/PP-391
#     PP-428 — Mule → Dataverse XML ingestion              https://accelins.atlassian.net/browse/PP-428
#     PP-429 — Dimension validation function               https://accelins.atlassian.net/browse/PP-429
#     PP-392 / PP-393 — downstream Stage 2+                (see src/features/api/PP/)
#     ENG-44  — Lloyd's exclusion regression               https://accelins.atlassian.net/browse/ENG-44
#
#   Step definitions:
#     Hops / Stage 1:   src/step-definitions/lloyds/xml-generation.steps.ts
#     Phase 2 read-side:  src/step-definitions/lloyds/lloyds-snowflake-adp.steps.ts
#     E2E gate:         src/step-definitions/lloyds/lloyds-readiness-gate.steps.ts
#     §C + partial §F (TGT-001) implemented; §D–§E, §F (TGT-002 / 002b+), §G–§H use skip stubs until programme opt-in envs.
# ══════════════════════════════════════════════════════════════════════════════

@api @lloyds @mule-xml-generation @PP-391
Feature: Lloyd's pipeline — Snowflake modules and stage scaffold (hops + E2E read-only are split out)
  As the Lloyd's ADP → MuleSoft → D365 F&O pipeline
  I want Snowflake contract tests and scaffolded scenarios for later stages in one umbrella file
  So that QA runs hops (`lloyds-pipeline-hops.feature`) and post-load read-only (`lloyds-pipeline-e2e-readonly.feature`) separately from ADP module checks here

  Background:
    Given the Lloyd's sanity plan is loaded

  # ══════════════════════════════════════════════════════════════════════════
  # §B  Phase 2 — Snowflake summary module tests (this file only)
  # Tags: @phase-2 @module @snowflake
  #
  # Validates Mule's upstream contract directly against ADP Snowflake using
  # `src/integrations/lloyds/snowflakeSummaryClient.ts` + `snowflake-fetch.ts`.
  # Probe: `npm run lloyds:snowflake:probe` | ADP→Dataverse→optional SQL: `npm run lloyds:trace:adp-ledger`.
  # Seventeen-repo order matches `LLOYDS_CLONED_REPOSITORY_IDS` (US-60464 first — default `LLOYDS_TEST_REPO_ID` when unset).
  # ══════════════════════════════════════════════════════════════════════════

  @phase-2 @module @snowflake @adp @PP-391-SNOW-001
  Scenario Outline: Latest summary row per cloned repo "<repo>" (UUID + ISDE mapping columns)
    Given a Snowflake connection to "FINANCIAL_OPERATIONS" via the framework Snowflake client
    When I query "FOWD__AGENCY_POLICY_FO_SUMMARY_V1" for repo "<repo>" ordered by "_ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP" descending
    Then the first row's "_ACCEL_UNIQUE_RUN_ID" should be a non-empty UUID
    And the first row's "_ACCEL_REPOSITORY_ID" should equal "<repo>"
    And the first row's "POLICY_CURRENCY_CODE" should be a valid ISO 4217 code
    And the numeric totals "TOTAL_PREMIUM_AMOUNT,TOTAL_MEMBER_COMMISSION_AMOUNT,TOTAL_INSURER_COMMISSION_AMOUNT,TOTAL_TAX_AMOUNT,TOTAL_OTHER_CONTRIBUTIONS_AMOUNT" should all be numeric or null

    Examples:
      | repo     |
      | US-60464 |
      | US-59665 |
      | US-57534 |
      | US-57241 |
      | US-60465 |
      | US-60597 |
      | US-61055 |
      | US-61070 |
      | US-61775 |
      | US-61822 |
      | US-57230 |
      | US-58257 |
      | US-61780 |
      | US-61781 |
      | US-61790 |
      | US-61848 |
      | US-61899 |

  @phase-2 @module @snowflake @adp @PP-391-SNOW-002
  Scenario Outline: Summary run id exists in at least one detail table (cloned repo "<repo>")
    Given a Snowflake connection to "FINANCIAL_OPERATIONS" via the framework Snowflake client
    And the latest summary row for repo "<repo>" from "FOWD__AGENCY_POLICY_FO_SUMMARY_V1"
    When I look up the same "_ACCEL_UNIQUE_RUN_ID" in "FOWD__AGENCY_POLICY_FO_V1" and "FOWC__POLICY_CORE_V1"
    Then at least one detail table should return a non-zero row count for that run id
    And the detail rows' "_ACCEL_REPOSITORY_ID" should all equal the summary row's value

    Examples:
      | repo     |
      | US-60464 |
      | US-59665 |
      | US-57534 |
      | US-57241 |
      | US-60465 |
      | US-60597 |
      | US-61055 |
      | US-61070 |
      | US-61775 |
      | US-61822 |
      | US-57230 |
      | US-58257 |
      | US-61780 |
      | US-61781 |
      | US-61790 |
      | US-61848 |
      | US-61899 |

  @phase-2 @module @snowflake @adp @contract @PP-391-SNOW-003
  Scenario: Summary schema carries the columns Mule's DataWeave mapping expects
    Given a Snowflake connection to "FINANCIAL_OPERATIONS" via the framework Snowflake client
    And the column metadata for "FOWD__AGENCY_POLICY_FO_SUMMARY_V1"
    Then the following columns should be present with the expected data types:
      | column                                                                 | type          |
      | _ACCEL_REPOSITORY_ID                                                   | TEXT          |
      | _ACCEL_UNIQUE_RUN_ID                                                   | TEXT          |
      | _ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP                                 | TIMESTAMP_NTZ |
      | POLICY_CURRENCY_CODE                                                   | TEXT          |
      | TOTAL_PREMIUM_AMOUNT                                                   | NUMBER        |
      | TOTAL_MEMBER_COMMISSION_AMOUNT / TOTAL_AGENCY_COMMISSION_AMOUNT      | NUMBER        |
      | TOTAL_INSURER_COMMISSION_AMOUNT / TOTAL_COMMISSION_AMOUNT            | NUMBER        |
      | TOTAL_TAX_AMOUNT                                                       | NUMBER        |
      | TOTAL_OTHER_CONTRIBUTIONS_AMOUNT                                       | NUMBER        |

  @phase-2 @module @snowflake @PP-391-SNOW-004
  Scenario Outline: Message financial_values match summary columns for the same run id (cross-system contract)
    Given a Snowflake connection to "FINANCIAL_OPERATIONS" via the framework Snowflake client
    And a mule-xml-generation-success financial_values block derived from the latest Snowflake summary for repo "<repo>"
    When I fetch the summary row from "FOWD__AGENCY_POLICY_FO_SUMMARY_V1" for the loaded run id
    Then the message financial_values "adp_prm" should equal the summary "TOTAL_PREMIUM_AMOUNT"
    And the message financial_values "adp_com" should equal the summary "TOTAL_AGENCY_COMMISSION_AMOUNT / TOTAL_MEMBER_COMMISSION_AMOUNT"
    And the message financial_values "adp_coi" should equal the summary "TOTAL_COMMISSION_AMOUNT / TOTAL_INSURER_COMMISSION_AMOUNT"
    And the message financial_values "adp_tax" should equal the summary "TOTAL_TAX_AMOUNT"
    And the message financial_values "adp_oth" should equal the summary "TOTAL_OTHER_CONTRIBUTIONS_AMOUNT"
    And the message financial_values "adp_currency" should equal the summary "POLICY_CURRENCY_CODE"

    Examples:
      | repo     |
      | US-60464 |
      | US-59665 |
      | US-57534 |
      | US-57241 |
      | US-60465 |
      | US-60597 |
      | US-61055 |
      | US-61070 |
      | US-61775 |
      | US-61822 |
      | US-57230 |
      | US-58257 |
      | US-61780 |
      | US-61781 |
      | US-61790 |
      | US-61848 |
      | US-61899 |

  # ══════════════════════════════════════════════════════════════════════════
  # §C  Stage 2.2 — Dimension validation  (@wip, cross-ref PP-429)
  # Tags: @stage-2 @dimension-validation
  #
  # Canonical spec: src/features/api/PP/PP-429.feature (@PP-429-API-*, @PP-429-UI-*).
  # This section is an overview anchor so the Lloyd's pipeline view is complete;
  # PP-429 stays the detailed source of truth until step defs land.
  # ══════════════════════════════════════════════════════════════════════════

  @stage-2 @dimension-validation @PP-429-ANCHOR-001
  Scenario Outline: Dimension validation HTTP returns pass and Dataverse columns align (after Stage 1)
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And the fa-dimensionvalidation base URL and authentication are configured for the test environment
    When a dimension validation POST is sent for the current correlation id and record blob URI
    Then the last dimension validation HTTP status should be successful
    And the last dimension validation response should have boolean pass
    And the record's dimension validation fields should be consistent with the last HTTP response where present

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @stage-2 @dimension-validation @lloyds-hop-post-stage1 @PP-429-ANCHOR-002
  Scenario Outline: After dimension validation — dv-xml-approval-success publish and optional queue metrics
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And the fa-dimensionvalidation base URL and authentication are configured for the test environment
    When a dimension validation POST is sent for the current correlation id and record blob URI
    Then the last dimension validation HTTP status should be successful
    When I publish dv-xml-approval-success to Lloyd's Service Bus queue "dv-xml-approval" for the current correlation and file name
    Given Lloyd's Service Bus runtime admin read is enabled
    When I fetch Lloyd's Service Bus runtime properties for queue "dv-xml-approval"
    Then Lloyd's Service Bus queue "dv-xml-approval" should report non-negative active and dead-letter counts

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  # ══════════════════════════════════════════════════════════════════════════
  # §D  Stage 3 — DMF submission → D365 F&O  (@wip, cross-ref PP-391 upper scenarios)
  # Tags: @stage-3 @dmf
  # ══════════════════════════════════════════════════════════════════════════

  @stage-3 @dmf @PP-391-DMF-001
  Scenario: mule-xml-submission-success flips XML File to "Shipped to Dynamics"
    Given `dv-xml-approval-success` was published for correlation id "<correlation_id>"
    When Mule runs the 5-phase DMF handshake and publishes `mule-xml-submission-success` on `mule-d365-import`
    Then the Dataverse XML record's status should flip to "Shipped to Dynamics"
    And Mule's Azure SQL `PROCESS_TRACKER` should advance to `DMF_SUBMITTING / RUNNING`

  @stage-3 @dmf @PP-391-DMF-002
  Scenario: mule-dmf-import-failed flips the record to "Failed to Import to Dynamics"
    When Mule publishes `mule-dmf-import-failed` on `mule-d365-import` for correlation id "<correlation_id>"
    Then the Dataverse record status should reflect "Failed to Import to Dynamics"
    And an `ERROR_LOG` entry should exist with the same correlation id

  @stage-3 @dmf @PP-391-DMF-003
  Scenario: mule-dmf-processing-success flips the record to "Ready to Post to Dynamics"
    When Mule publishes `mule-dmf-processing-success` on `mule-d365-import`
    Then the Dataverse record status should reflect "Ready to Post to Dynamics"

  # ══════════════════════════════════════════════════════════════════════════
  # §E  Stage 4 — Journal posting  (@wip)
  # Tags: @stage-4 @posting
  # ══════════════════════════════════════════════════════════════════════════

  @stage-4 @posting @PP-391-POST-001
  Scenario: dv-journal-posting-success drives Mule to POSTED + ODS WORK_ITEM_COMPLETE
    Given Ops have posted the journal in D365 F&O
    When the Journal Posting Confirmation Service publishes `dv-journal-posting-success` on `dv-d365-journalposting`
    Then Mule's Azure SQL state for the correlation id should become `POSTED`
    And the ADP repo file should reach status `WORK_ITEM_COMPLETE`

  @stage-4 @posting @PP-391-POST-002
  Scenario: dv-journal-posting-failed escalates via ServiceNow
    When `dv-journal-posting-failed` is published on `dv-d365-journalposting`
    Then Mule should set the state to `POSTING_FAILED`
    And a ServiceNow incident should be raised keyed by `PROCESS_ID` + `ERROR_ID`

  # ══════════════════════════════════════════════════════════════════════════
  # §F  Tagetik / TDS + Stage 5 ADP  (@wip @tagetik)
  # Tags: @stage-5 @tagetik @dependent-product
  #
  # Programme model (see docs/lloyds/SKILL.md): TDS / Tagetik tables update on the
  # journal posting path (Stage 4 → Mule consumes dv-journal-posting-*). The
  # mule-dependantproduct → ADP flow is a separate downstream leg — do not chain
  # Tagetik asserts after mule-dependentproduct-success as if one caused the other.
  #
  # Backed by SQL from `docs/lloyds/ADP.sql` (lines 70–85).
  # Canonical table: FINANCIAL_OPERATIONS.FINOPS_WRITTEN_TAGETIK_PUBLIC.FOWT__TAGETIK_V1
  # Note column naming: the Tagetik table uses REPOSITORY_ID (no `_ACCEL_` prefix),
  # while FOWC / FOWD use _ACCEL_REPOSITORY_ID.
  # ══════════════════════════════════════════════════════════════════════════

  @stage-5 @tagetik @PP-391-TGT-001
  Scenario Outline: Tagetik row exists for the latest run of each Lloyd's repo
    Given a Snowflake connection to "FINANCIAL_OPERATIONS" via the framework Snowflake client
    And the latest summary row for repo "<repo>" from "FOWD__AGENCY_POLICY_FO_SUMMARY_V1"
    When I query "FOWT__TAGETIK_V1" for "REPOSITORY_ID" equal to "<repo>"
    Then at least one row should be returned
    And the distinct "_ACCEL_UNIQUE_RUN_ID" set should include the summary's latest run id for that repo

    Examples:
      # Full programme cohort (`LLOYDS_CLONED_REPOSITORY_IDS`); US-60464 first for smoke alignment.
      | repo     |
      | US-60464 |
      | US-59665 |
      | US-57534 |
      | US-57241 |
      | US-60465 |
      | US-60597 |
      | US-61055 |
      | US-61070 |
      | US-61775 |
      | US-61822 |
      | US-57230 |
      | US-58257 |
      | US-61780 |
      | US-61781 |
      | US-61790 |
      | US-61848 |
      | US-61899 |

  @stage-4 @tagetik @PP-391-TGT-002
  Scenario: After posting, Tagetik row is visible for the run (Mule posting path — not gated on mule-dependantproduct)
    Given Stage 4 reached `POSTED` for correlation id "<correlation_id>"
    Then a Tagetik row with the same `_ACCEL_UNIQUE_RUN_ID` should be visible in `FOWT__TAGETIK_V1`

  @stage-5 @tagetik @PP-391-TGT-002b
  Scenario: After posting, Mule may publish mule-dependentproduct-success for ADP downstream (correlation preserved)
    Given Stage 4 reached `POSTED` for correlation id "<correlation_id>"
    When Mule publishes `mule-dependentproduct-success` on `mule-dependantproduct`
    Then the `correlation_id` should match the Stage 1 correlation

  @stage-5 @tagetik @PP-391-TGT-003
  Scenario: Tagetik totals reconcile to Snowflake summary totals within tolerance
    Given the latest Tagetik row set for repo "<repo>"
    When I aggregate DEBIT_AMOUNT / CREDIT_AMOUNT by category (PRM / COM / COI / TAX / OTH)
    Then each aggregate should match `FOWD__AGENCY_POLICY_FO_SUMMARY_V1`'s `TOTAL_*_AMOUNT` within ABS tolerance 5

  @stage-5 @tagetik @negative @PP-391-TGT-004
  Scenario: Tagetik does NOT receive rows for a Lloyd's repo that failed posting
    Given a correlation id that hit `POSTING_FAILED` in Stage 4
    Then `FOWT__TAGETIK_V1` should have no new rows tagged with that run id

  @stage-5 @tagetik @negative @PP-391-TGT-004b
  Scenario: ADP downstream may see mule-dependentproduct-failed when posting failed (separate leg from TDS)
    Given a correlation id that hit `POSTING_FAILED` in Stage 4
    Then `mule-dependentproduct-failed` should have been published on `mule-dependantproduct`

  # ══════════════════════════════════════════════════════════════════════════
  # §G  Regression — Lloyd's data exclusion  (ENG-44)  (@wip)
  # Tags: @regression @lloyds-exclusion
  # ══════════════════════════════════════════════════════════════════════════

  @regression @lloyds-exclusion @ENG-44-REG-001
  Scenario: Lloyd's-tagged rows must not appear in Non-Lloyd's ODS / TDS destinations
    Given ADP-side filters are in place to prevent Lloyd's data from flowing into VIPR / Non-Lloyd's tables
    When I query Non-Lloyd's ODS / TDS destinations for any `REPOSITORY_ID` in the Lloyd's Agency cohort
    Then no rows should be returned

  @regression @lloyds-exclusion @ENG-44-REG-002
  Scenario: Lloyd's data must not appear in ResQ or DCR destinations
    When I query ResQ / DCR destinations for any Lloyd's cohort repository id
    Then no matching rows should be returned

  # ══════════════════════════════════════════════════════════════════════════
  # §H  End-to-end — real Mule run trace  (@wip @e2e @phase-3)
  # Tags: @e2e @phase-3
  #
  # Does NOT publish a Service Bus message. Observes a real Mule-produced message
  # already on the queue (peek-lock on a dedicated subscription) and traces it
  # across Snowflake → blob → Dataverse → DMF → posting → Tagetik/TDS (posting path);
  # Stage 5 ADP (mule-dependantproduct) is optional / separate in the same correlation.
  # ══════════════════════════════════════════════════════════════════════════

  @e2e @phase-3 @PP-391-E2E-001
  Scenario: Trace one real Mule run end-to-end (Stage 1 → Stage 5)
    Given a real `mule-xml-generation-success` message observed on `mule-xml-generation`
    When I pin its "correlation_id", "file_name", "blob_id" and "_ACCEL_UNIQUE_RUN_ID" (derivable from Mule's upstream read)
    Then the following end-to-end checks should all pass
      | check                                                                                            |
      | Summary row exists in FOWD__AGENCY_POLICY_FO_SUMMARY_V1 for the same run id                      |
      | XML at blob_id parses and its DEBIT−CREDIT totals match the summary within ABS tolerance 5      |
      | A matching accelins_workflow row exists in Dataverse with overall_match = true                   |
      | statuscode advances through: 100000003 → Shipped to Dynamics → Ready to Post → (after posting)  |
      | Mule's Azure SQL PROCESS_TRACKER ends on COMPLETED / SUCCESS for the same correlation id        |
      | A Tagetik row appears in FOWT__TAGETIK_V1 tagged with the same run id                            |

  @e2e @phase-3 @PP-391-E2E-002
  Scenario: A single Mule failure anywhere in the chain surfaces on every observability channel
    Given a real Mule run that failed at any stage
    Then the same correlation id should appear on at least one of: DLQ, `ERROR_LOG`, ServiceNow ticket, Dataverse status label

  # ══════════════════════════════════════════════════════════════════════════
  # §I  Unit-level helper assertions  (@unit)
  # Tags: @unit
  #
  # Canonical numeric checks live in Vitest (`npm run test:lloyds:unit` → `tests/unit/lloyds-*.test.ts`).
  # These scenarios mirror the same contracts for programme-facing BDD traceability.
  # ══════════════════════════════════════════════════════════════════════════

  @unit @PP-391-UNIT-001 @xmlFileName
  Scenario: parseFileName splits ledger / repo id / stamp
    When Lloyd's unit helper parseFileName is applied to "AEUM US-61273 202604161200.xml"
    Then Lloyd's parse result ledger should be "AEUM"
    And Lloyd's parse result repoId should be "US-61273"
    And Lloyd's parse result stamp should be "202604161200"

  @unit @PP-391-UNIT-002 @xmlFileName
  Scenario: buildBlobId always produces the canonical mulesoft-xml URL
    When Lloyd's unit helper buildBlobId is applied to file name "AEUM US-61273 202604161200.xml"
    Then Lloyd's buildBlobId result should end with "/mulesoft-xml/AEUM US-61273 202604161200.xml"

  @unit @PP-391-UNIT-003 @correlationIdCounter
  Scenario: bumpCounter atomically increments + writes the counter file
    Given Lloyd's unit test counter file is initialised with lastCorrelationId "0000-0000-0000-03041"
    When Lloyd's bumpCounter is invoked for that file with xmlName "x.xml" and row 0
    Then Lloyd's counter file should record lastCorrelationId "0000-0000-0000-03042"
    And Lloyd's bumpCounter should have returned correlationId "0000-0000-0000-03042"

  @unit @PP-391-UNIT-004 @xmlTotals
  Scenario: computeAdpTotalsFromFile derives DEBIT−CREDIT totals by TEXT category
    Given Lloyd's unit test XML path is "docs/lloyds/XMLs/AEUM US-58338 202604091630.xml"
    When Lloyd's computeAdpTotalsFromFile runs on that path
    Then Lloyd's service-bus financial_values keys should be populated from those totals

  @unit @PP-391-UNIT-005 @serviceBusSender
  Scenario: buildMuleXmlGenerationSuccessPayload produces the canonical message shape
    When Lloyd's buildMuleXmlGenerationSuccessPayload is invoked with sample inputs
    Then Lloyd's built payload should be a canonical mule-xml-generation-success shape
