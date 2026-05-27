# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-392 - Lloyd's D365 Journal Integration | 2 File Approval Workflow (Source vs XML)
# https://accelins.atlassian.net/browse/PP-392
#
# Design Revision: XML versus ADP totals and financial-dimension checks against F&O master data run
#   automatically (straight-through). Manual Ops "Approve XML" for that gate is superseded by system validation;
#   Ops may still need visibility for exceptions and downstream journal approval in D365 remains separate.
# Design: https://accelins.atlassian.net/wiki/x/KQARsw
# Service Bus: dv-xml-approval (dv-xml-approval-success to Mule after Dataverse marks approved path per architecture)
# Sample messages: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3118760006/Service+Bus+Messages#Sample-messages
# Architecture: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3015376910
# Related: PP-429 dimension validation function; Fabric / D365 master data validation
# Draft scenarios source: data/draft-user-feature-files/PP-392-FF.docx (wording updated for STP)
#
# Dev: sb-dev-uks-lyd — queues include mule-xml-generation, dv-xml-approval, mule-d365-import, dv-d365-journalposting,
#   mule-dependantproduct, servicebuslyddev-queue
#
# Assertions: validate outcomes on Dataverse and on Mule Azure SQL control row (e.g. XML_GENERATED → READY_TO_SHIP)
#   when dv-xml-approval-success is consumed, per programme architecture.
#
# Zephyr: npm run zephyr:UploadAndLink:PP392
#
# Environment (**required for PP-392**): `ENV=qa` → `scripts/run-tests-with-env.js` loads **`src/config/env/.env.qa`**
# (Lloyd's Service Bus + Dataverse **accelinsqatest**). Do **not** use `ENV=qa2` / `.env.qa2` for this feature unless
# programme has explicitly wired Lloyd's integration, Service Bus, and blob endpoints to the qa2 tenant (different PP).
# Command: **`npm run test:pp392:qa`**
#
# Runnable rows: `Given the Lloyd's latest runnable blob for the configured test repository from the sanity plan`
# uses `LLOYDS_TEST_REPO_ID` / `LLOYDS_E2E_REPO_ID`, else **US-60464** (must be in `LLOYDS_CLONED_REPOSITORY_IDS`).
# Refresh plan: `npm run lloyds:sanity:plan`.
#
# Snowflake E2E pin: set `LLOYDS_PP392_E2E_CORRELATION_ID` + `LLOYDS_PP392_E2E_FILE_NAME`, then
# `npm run test:pp392:qa:e2e-snowflake` (tag `@PP-392-E2E-SNOWFLAKE`). See `env.sample` and `pp392SnowflakeE2ePin.ts`.
#
# PP-611 / orchestrator boundary (Dev, ~2026): Dataverse integration does **not** validate that `correlation_id`
# or `file_name` in the triggering Service Bus message are “correct” vs Snowflake/Mule — correlation is treated as
# the orchestrator-supplied run key; processing relies on **retrievable `blob_id`** and **XML contents** (+ ADP in
# message) for financial/dimension validation. **Wrong `blob_id`** → blob/XML cannot be loaded → failure. Scenario
# `@PP-611` exercises misleading `file_name` with a valid `blob_id`. UI-004 covers wrong blob_id; UI-005 probes
# malformed **name** shape (may depend on intake rules — align with PO if product behaviour changes).
# ══════════════════════════════════════════════════════════════════════════════

# @ui only on scenarios that use Playwright + Salesforce — do not tag the whole Feature @ui or every
# @api @lloyds outline inherits @ui and the framework opens Salesforce (JWT + arx--qa) unnecessarily.
@api @pp @PP-392 @lloyds @d365 @dataverse @automatic-validation @dimension-validation @straight-through @servicebus
Feature: API / UI - PP-392 - Automatic file validation source versus XML and dimensions (Lloyd's D365 journal integration)

  As the Lloyd's journal integration
  I want XML totals versus ADP and financial dimensions validated automatically against Dynamics master data
  So that eligible files move to Ready to Ship without a manual XML approval click (Design Revision)

  Background:
    Given the PP-392 test configuration is loaded

  # ─── Jira acceptance criteria reinterpreted for Design Revision (automatic path) ─

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-392 @PP-392-API-001 @p1 @smoke @dimensions @positive
  Scenario: PP-392-API-001 — automatic dimension path records validation outcome on Dataverse (happy path)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's dimension validation error should be null or empty

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-392 @PP-392-API-002 @p1 @positive @ready-to-ship @dual-system
  Scenario: PP-392-API-002 — Ready to Ship on Dataverse after straight-through validation (PROCESS_TRACKER when SQL configured)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's dimension validation error should be null or empty
    Given SQL Server is configured for Lloyd's Mule PROCESS_TRACKER reads
    When I fetch the latest PROCESS_TRACKER row for the current Lloyd's sanity repository
    Then the PROCESS_TRACKER row should exist with a non-empty PROCESS_ID

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-392 @PP-392-API-003 @p1 @negative @dimension-error
  Scenario: PP-392-API-003 — dimension validation error path when ADP totals mismatch XML (blocked advance)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with deliberately mismatched ADP totals versus the blob XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 120 seconds the record's overall_match should become false

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-392 @PP-392-API-004 @p1 @negative @totals-mismatch
  Scenario: PP-392-API-004 — same as API-003 (totals mismatch blocks straight-through match)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with deliberately mismatched ADP totals versus the blob XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 120 seconds the record's overall_match should become false

  # PP-611: mirrors Dev position — valid blob_id + consistent ADP/XML wins; message file_name string not authoritative.
  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-392 @PP-611 @PP-392-API-CONTRACT @p2 @contract @positive
  Scenario: PP-392-API-CONTRACT — happy path when message file_name disagrees with blob but blob_id resolves (PP-611)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML but a deliberately wrong message file_name
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's dimension validation error should be null or empty

  # ─── Snowflake `_ACCEL_UNIQUE_RUN_ID` + WBX/WRX file name (env pin — no sanity-counter bump) ───

  @api @lloyds @PP-392 @PP-392-E2E-SNOWFLAKE @PP-392-E2E-SNOWFLAKE-OBSERVE @p1 @smoke
  Scenario: PP-392-E2E-SNOWFLAKE-OBSERVE — assert Dataverse XML File row for pinned correlation (read path)
    Given the Lloyd's PP-392 Snowflake E2E correlation and file name are pinned from the environment
    Then within 300 seconds the Lloyd's XML File record should exist for that correlation id
    And the record's correlation id should match the sent correlation id

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-392 @PP-392-E2E-SNOWFLAKE @PP-392-E2E-SNOWFLAKE-FULL @p1 @smoke @dimensions @positive
  Scenario: PP-392-E2E-SNOWFLAKE-FULL — mule-xml-generation-success using pinned Snowflake correlation and file name
    Given the Lloyd's PP-392 Snowflake E2E correlation and file name are pinned from the environment
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's dimension validation error should be null or empty
    And the record's correlation id should match the sent correlation id

  # ─── Dataverse observability (XML File columns / Ops parity — API + Dataverse only; no @ui / no Salesforce) ───

  @api @lloyds @PP-392 @PP-392-UI-001 @p1 @dimensions @negative
  Scenario: PP-392-UI-001 — blocked validation when ADP totals disagree with XML (Dataverse reconciliation)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with deliberately mismatched ADP totals versus the blob XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 120 seconds the record's overall_match should become false
    And within 240 seconds the record should not reach Dataverse statuscode 100000003
    And at least one per-metric match toggle on the record should be false
    And the PP-392 observability evidence step is satisfied

  @api @lloyds @PP-392 @PP-392-UI-002 @p1 @dimensions @positive
  Scenario: PP-392-UI-002 — Ready to Ship after straight-through validation (Dataverse XML File)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's dimension validation error should be null or empty
    And the record's statuscode should be a happy-path value
    And the PP-392 observability evidence step is satisfied

  @api @lloyds @PP-392 @PP-392-UI-003 @p1 @dimensions @error-message
  Scenario: PP-392-UI-003 — totals mismatch leaves dimension validation error unset while blocking advance
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with deliberately mismatched ADP totals versus the blob XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 120 seconds the record's overall_match should become false
    And the record's dimension validation error should be null or empty
    And within 240 seconds the record should not reach Dataverse statuscode 100000003
    And the PP-392 observability evidence step is satisfied

  @api @lloyds @PP-392 @PP-392-UI-004 @p1 @negative @blob
  Scenario: PP-392-UI-004 — blob not found / wrong container yields no XML File record
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with a blob_id pointing at the wrong container
    Then within 60 seconds no Lloyd's XML File record should exist for that correlation id
    And the PP-392 observability evidence step is satisfied

  # Intake/gateway behaviour — not the same as PP-611 “no file_name validation for totals” (see header).
  @api @lloyds @PP-392 @PP-392-UI-005 @p2 @negative @malformed-xml
  Scenario: PP-392-UI-005 — unparsable file name gate yields no XML File record (intake failure proxy)
    Given the Lloyd's sanity plan is loaded
    And a synthesised bad file name "AEUM US-58338 20260000000000.xml"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with that bad file name
    Then within 60 seconds no Lloyd's XML File record should exist for that correlation id
    And the PP-392 observability evidence step is satisfied

  @api @lloyds @PP-392 @PP-392-UI-006 @p2 @negative @connectivity
  Scenario: PP-392-UI-006 — happy path proves dimension path completed without blocking error (reachability)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's dimension validation error should be null or empty
    And the PP-392 observability evidence step is satisfied

  @api @lloyds @PP-392 @PP-392-UI-007 @p1 @negative @validation-blocked
  Scenario: PP-392-UI-007 — all per-metric toggles false when stub ADP disagrees with blob XML
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with deliberately mismatched ADP totals versus the blob XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 120 seconds the record's overall_match should become false
    And all monetary per-metric match toggles on the record should be false
    And within 240 seconds the record should not reach Dataverse statuscode 100000003
    And the PP-392 observability evidence step is satisfied

  @api @lloyds @PP-392 @PP-392-UI-008-legacy @p2 @baseline-legacy @optional
  Scenario: PP-392-UI-008-legacy — Design Revision happy path without manual XML Approve (Dataverse status)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's dimension validation error should be null or empty
    And the record's process path should indicate ADP
    And the PP-392 observability evidence step is satisfied

  # ═══════════════════════════════════════════════════════════════════════════
  # QA workbook — docs/lloyds/PP-392-Feature File.docx + Fabric
  #   dbo.dimensionattributevaluecombination (see docs/lloyds/SKILL.md §2.2).
  # Runnable without Fabric: local XML shape (PP-392-UI-008). Fabric SQL: opt-in env on outline below.
  # ═══════════════════════════════════════════════════════════════════════════

  @lloyds @PP-392 @fabric @lloyds-fabric-dimension-sql @PP-392-FABRIC @PP-392-UI-011
  Scenario Outline: PP-392 Fabric — offset main accounts exist in dimensionattributevaluecombination (sample XML)
    Given Lloyd's Fabric dimension SQL read is enabled
    And the committed Lloyd's sample XML at "<xmlPath>"
    When I validate distinct offset main account tokens from the committed sample XML against dbo dimensionattributevaluecombination

    Examples:
      | xmlPath                                          |
      | docs/lloyds/XMLs/AEUM US-58338 202604091630.xml |

  @unit @lloyds @PP-392 @PP-392-UI-008
  Scenario: PP-392-UI-008 — OFFSETACCOUNTDISPLAYVALUE / DEFAULTDIMENSIONDISPLAYVALUE / OFFSETDEFAULTDIMENSIONDISPLAYVALUE (local XML)
    Given the committed Lloyd's sample XML at "docs/lloyds/XMLs/AEUM US-58338 202604091630.xml"
    Then each ledger line dimension display fields should satisfy PP-392 tilde-segment rules

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-392 @PP-392-UI-011-DV @positive
  Scenario: PP-392-UI-011 (partial) — Dataverse dimension validation columns without blocking error on happy path
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's dimension validation error should be null or empty
