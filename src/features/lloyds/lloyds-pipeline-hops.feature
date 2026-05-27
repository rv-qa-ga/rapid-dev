# Lloyd's — per-hop integration (Service Bus inject + assert)
#
# Service Bus: **sb-dev-uks-lyd** only (programme dev namespace). Each scenario triggers a hop
# and validates the outcome (Stage 1 today: mule-xml-generation → func-xml-totals → Dataverse).
#
# Correlation IDs: sanity counter (`sanity-counter.json`) — same as Stage 1 in the umbrella file.
#
# npm run test:lloyds:hops
#
# Single-repo scenarios use `LLOYDS_TEST_REPO_ID` (or `LLOYDS_E2E_REPO_ID`), else **US-60464** — see `env.sample`.
#
# Later milestones (@wip): dv-xml-approval, mule-d365-import, journal posting, dependant product —
# implement steps as contracts land; see lloyds-pipeline.feature §C–§F anchors and PP-392.feature.

@api @lloyds @lloyds-hop @mule-xml-generation @PP-391
Feature: Lloyd's pipeline — per-hop Service Bus tests (Stage 1 runnable)

  As QA exercising each integration hop in isolation
  I want to publish the programme message for a hop and assert the consumer outcome
  So that we can trace failures to a single step without a full manual load

  Background:
    Given the Lloyd's sanity plan is loaded

  @stage-1 @phase-1 @smoke @PP-391-API-001 @positive @p1 @adp-summary-alignment
  Scenario Outline: Hop — repository "<repo>" — mule-xml-generation-success with ADP totals from Snowflake
    Given the Lloyd's latest runnable blob for repository "<repo>" from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals from Snowflake summary per ISDE mapping
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's overall_match should be true
    And the record should have a Repository File lookup resolved
    And the record's workflow totals should match the payload within ABS tolerance 5

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

  @stage-1 @phase-1 @PP-391-API-006 @positive @p2 @idempotency
  Scenario: Hop — resend same correlation id updates the existing XML File record (no duplicate)
    Given the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals from Snowflake summary per ISDE mapping
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I send the same "mule-xml-generation-success" payload again with the same correlation id
    Then exactly 1 Lloyd's XML File record should exist for that correlation id

  @stage-1 @phase-1 @PP-391-API-002 @negative @p2 @repo-not-in-master
  Scenario: Hop — REPO_NOT_IN_MASTER yields no Dataverse record
    Given a Lloyd's blocked row with reason "REPO_NOT_IN_MASTER"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" for that blocked row with stub totals
    Then within 60 seconds no Lloyd's XML File record should exist for that correlation id

  @stage-1 @phase-1 @PP-391-API-003 @negative @p2 @ledger-not-in-master
  Scenario: Hop — LEDGER_NOT_IN_MASTER yields no Dataverse record
    Given a Lloyd's blocked row with reason "LEDGER_NOT_IN_MASTER"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" for that blocked row with stub totals
    Then within 60 seconds no Lloyd's XML File record should exist for that correlation id

  @stage-1 @phase-1 @PP-391-API-004 @negative @p2 @blob-missing
  Scenario: Hop — BLOB_MISSING yields no Dataverse record
    Given the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with a blob_id pointing at the wrong container
    Then within 60 seconds no Lloyd's XML File record should exist for that correlation id

  @stage-1 @phase-1 @PP-391-API-005 @negative @p2 @bad-file-name
  Scenario: Hop — BAD_FILE_NAME yields no Dataverse record
    Given a synthesised bad file name "ZZZZ XX-00000 202604091600.xml"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with that bad file name
    Then within 60 seconds no Lloyd's XML File record should exist for that correlation id

  @stage-1 @phase-1 @PP-391-API-008 @negative @p2 @adp-vs-xml-mismatch
  Scenario: Hop — ADP totals disagree with blob XML — overall_match is false
    Given the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with deliberately mismatched ADP totals versus the blob XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 120 seconds the record's overall_match should become false

  @stage-1 @phase-1 @PP-391-API-007 @negative @p2 @mule-xml-generation-failed @synthetic-mule-failure
  Scenario: Hop — synthetic mule-xml-generation-failed — no XML File record
    Given the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-failed" for the current row
    Then within 60 seconds no Lloyd's XML File record should exist for that correlation id

  # Milestone 2–3 — opt-in Service Bus publishes (set LLOYDS_HOP_POST_STAGE1_ENABLED=1). Consumers may no-op in dev.
  @stage-2 @lloyds-hop @lloyds-hop-post-stage1 @PP-391-HOP-DV-APPROVAL-001
  Scenario: Hop — dv-xml-approval-success after Stage 1 record exists (configured test repository)
    Given the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals from Snowflake summary per ISDE mapping
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I publish dv-xml-approval-success to Lloyd's Service Bus queue "dv-xml-approval" for the current correlation and file name
    Then within 60 seconds the Lloyd's XML File record should exist for that correlation id

  @stage-3 @lloyds-hop @lloyds-hop-post-stage1 @PP-391-HOP-DMF-001
  Scenario: Hop — mule-xml-submission-success on mule-d365-import (configured test repository)
    Given the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals from Snowflake summary per ISDE mapping
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I publish mule-xml-submission-success to Lloyd's Service Bus queue "mule-d365-import" for the current correlation and file name
    Then within 60 seconds the Lloyd's XML File record should exist for that correlation id
