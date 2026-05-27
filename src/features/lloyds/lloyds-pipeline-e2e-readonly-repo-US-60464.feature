# Lloyd's E2E read-only — **US-60464 only** (single-repo matrix for targeted runs / reports).
#
# For **any** repository id + HTML, prefer: `npm run lloyds:e2e-single-repo-then-html -- --repo US-60464`
# (see docs/lloyds/LLOYDS_E2E_SINGLE_REPO_AND_HTML.md). Keep this file in sync with
# `lloyds-pipeline-e2e-readonly.feature` and `scripts/lloyds/templates/lloyds-pipeline-e2e-readonly-single-repo.feature.template`.
#
# npm run lloyds:e2e-repo-report

@api @lloyds @lloyds-e2e-readonly @lloyds-e2e-single-repo @e2e-readonly @post-manual-load @PP-391 @lloyds-repo-US-60464
Feature: Lloyd's E2E read-only — repository US-60464 only

  As QA validating a full borderaux load for one repository
  I want read-only checks across ADP, Dataverse, blob XML, FOWD, Tagetik, PROCESS_TRACKER, TDS SQL, and optional F&O OData
  So that we produce a focused report for US-60464

  Background:
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's E2E read-only readiness gate is satisfied

  @phase-2 @module @snowflake @adp @dataverse @PP-391-SNOW-ODS-001
  Scenario Outline: Latest ADP summary totals align with Dataverse workflow (Power Apps XML File) for repository "<repo>"
    Given a Snowflake connection to "FINANCIAL_OPERATIONS" via the framework Snowflake client
    And I have loaded the latest ADP summary row for repository "<repo>"
    When I fetch the latest Lloyd's XML File record for repository "<repo>" in Dataverse
    Then the Dataverse workflow totals should match the ADP summary within ABS tolerance 5

    Examples:
      | repo     |
      | US-60464 |

  @phase-2 @cross-system @read-only-chain @snowflake @adp @dataverse @tagetik @PP-391-CROSS-READ-001
  Scenario Outline: Cross-system read-only — ADP, Dataverse, blob XML, FOWD detail, Tagetik for "<repo>"
    Given a Snowflake connection to "FINANCIAL_OPERATIONS" via the framework Snowflake client
    And I have loaded the latest ADP summary row for repository "<repo>"
    When I fetch the latest Lloyd's XML File record for repository "<repo>" in Dataverse
    Then the Dataverse workflow totals should match the ADP summary within ABS tolerance 5
    And the Dataverse XML totals should match the ADP summary within ABS tolerance 5
    And the Dataverse XML totals should match the Dataverse workflow totals within ABS tolerance 5
    When I download the Mule XML blob for the loaded Dataverse XML File record
    Then totals parsed from the downloaded journal XML should match the ADP summary within ABS tolerance 5
    When I load FOWD detail rows for repository "<repo>" and the loaded ADP summary run id
    Then ADP Snowflake FOWD detail rows should match the downloaded journal XML per the programme field mapping
    When I query Tagetik rows for repository "<repo>" and the loaded ADP run id
    Then Tagetik slice rows for this run should exist or the scenario is skipped when not yet posted
    And the Snowflake Tagetik slice first matching row should expose journal line amount fields
    And the Snowflake Tagetik slice first matching row currency should match ADP summary when both are set
    And the Snowflake Tagetik slice first matching row shared totals with ADP summary should match within ABS tolerance 5
    Given Lloyd's TDS SQL is configured for TagetikWrittenforDataLoaderADP reads
    When I query TDS TagetikWrittenforDataLoaderADP for repository "<repo>"
    Then TDS TagetikWrittenforDataLoaderADP should have at least one row for this repository
    And the first TDS TagetikWritten row should align with ADP repository and run when key columns are populated

    Examples:
      | repo     |
      | US-60464 |

  @stage-3 @phase-2 @mule-tracker @PP-391-TRACKER-001
  Scenario Outline: Mule PROCESS_TRACKER has a row for cloned repository "<repo>"
    Given SQL Server is configured for Lloyd's Mule PROCESS_TRACKER reads
    When I fetch the latest PROCESS_TRACKER row for repository "<repo>"
    Then the PROCESS_TRACKER row should exist with a non-empty PROCESS_ID

    Examples:
      | repo     |
      | US-60464 |

  @stage-4 @phase-2 @readiness @dataverse @PP-391-POST-READ-001
  Scenario Outline: Dataverse XML File exists for cloned repository "<repo>" (posting prerequisite)
    When I fetch the latest Lloyd's XML File record for repository "<repo>" in Dataverse
    Then the Dataverse XML File record from the last fetch should exist

    Examples:
      | repo     |
      | US-60464 |

  @stage-5 @phase-2 @tagetik-readiness @snowflake @PP-391-TGT-READ-001
  Scenario Outline: Tagetik slice FOWT__TAGETIK_V1 for cloned repository "<repo>" (skipped until posted)
    Given a Snowflake connection to "FINANCIAL_OPERATIONS" via the framework Snowflake client
    When I query Tagetik slice "FOWT__TAGETIK_V1" for repository "<repo>"
    Then Tagetik slice rows exist for this repository or the scenario is skipped when not yet posted

    Examples:
      | repo     |
      | US-60464 |

  @lloyds @lloyds-e2e-readonly @lloyds-fno-odata @PP-391-FNO-001
  Scenario Outline: Dynamics F&O OData read for repository "<repo>"
    Given Lloyd's F&O OData per-repository read is configured
    When I request F&O OData for repository "<repo>"
    Then the F&O OData HTTP status should be 200

    Examples:
      | repo     |
      | US-60464 |
