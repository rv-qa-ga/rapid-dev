# Lloyd's — post-manual-load end-to-end read-only validation (seventeen programme repos)
#
# Run AFTER operator cleanup (Service Bus queues/DLQ, blob containers, Mule PROCESS_TRACKER,
# stray XML, etc.) and reload of borderaux data into ADP / Dataverse / downstream systems.
#
# Readiness gate (first Background step):
#   - Interactive: prompts on a TTY unless LLOYDS_E2E_READINESS_ACK is already set.
#   - CI / piped: set LLOYDS_E2E_READINESS_ACK=1 (see src/config/env/env.sample).
#
# No Service Bus sends in this file — read-only assertions only.
#
# Dataverse / Operational Workflow: `statuscode` may stay "Ready to Ship to Dynamics" after F&O
# delivery until the programme status-sync fix (target ~Tuesday) — do not treat that as a
# reason to skip Snowflake, blob, FOWD, Tagetik, PROCESS_TRACKER, or F&O OData checks in this file.
#
# Snowflake: Entra OAuth (SPN) when CLIENT_ID+SECRET + OAUTH scope/resource are set; else EXTERNALBROWSER
# reuses one connection per process (snowflake-fetch.ts). For CI: ENV=qa, LLOYDS_E2E_READINESS_ACK=1.
#
# npm run test:lloyds:e2e-readonly
#
# Step defs: lloyds-readiness-gate.steps.ts, lloyds-snowflake-adp.steps.ts (incl. Tagetik FOWT field-level),
#   lloyds-pipeline-stages.steps.ts, lloyds-tagetik-tds-sql.steps.ts (TDS.tagetik SQL when SQL_LLOYDS_SERVER is set),
#   xml-generation.steps.ts (blob download / Dataverse only), lloyds-fno-odata.steps.ts (opt-in F&O OData).

@api @lloyds @lloyds-e2e-readonly @e2e-readonly @post-manual-load @PP-391
Feature: Lloyd's E2E read-only — seventeen repos after cleanup and data load

  As QA validating a full borderaux load across systems
  I want read-only checks across ADP, Dataverse, blob XML, FOWD, Tagetik, and PROCESS_TRACKER
  So that we confirm data reached all integrated systems without publishing test traffic

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

  @stage-3 @phase-2 @mule-tracker @PP-391-TRACKER-001
  Scenario Outline: Mule PROCESS_TRACKER has a row for cloned repository "<repo>"
    Given SQL Server is configured for Lloyd's Mule PROCESS_TRACKER reads
    When I fetch the latest PROCESS_TRACKER row for repository "<repo>"
    Then the PROCESS_TRACKER row should exist with a non-empty PROCESS_ID

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

  @stage-4 @phase-2 @readiness @dataverse @PP-391-POST-READ-001
  Scenario Outline: Dataverse XML File exists for cloned repository "<repo>" (posting prerequisite)
    When I fetch the latest Lloyd's XML File record for repository "<repo>" in Dataverse
    Then the Dataverse XML File record from the last fetch should exist

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

  @stage-5 @phase-2 @tagetik-readiness @snowflake @PP-391-TGT-READ-001
  Scenario Outline: Tagetik slice FOWT__TAGETIK_V1 for cloned repository "<repo>" (skipped until posted)
    Given a Snowflake connection to "FINANCIAL_OPERATIONS" via the framework Snowflake client
    When I query Tagetik slice "FOWT__TAGETIK_V1" for repository "<repo>"
    Then Tagetik slice rows exist for this repository or the scenario is skipped when not yet posted

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

  # Phase B — Service Bus queue runtime metrics (management API). Skips unless LLOYDS_SB_READ_ENABLED=1.
  # Requires SPN rights beyond Data Sender (see docs/lloyds/LLOYDS_TEST_STRATEGY.md). Optional: LLOYDS_SB_READ_QUEUES=comma,list.
  @lloyds-e2e-readonly @lloyds-sb-read @PP-391-E2E-QUEUE-002
  Scenario Outline: Service Bus queue "<queue>" exposes runtime metrics (active + dead-letter counts)
    Given Lloyd's Service Bus runtime admin read is enabled
    When I fetch Lloyd's Service Bus runtime properties for queue "<queue>"
    Then Lloyd's Service Bus queue "<queue>" should report non-negative active and dead-letter counts

    Examples:
      | queue                  |
      | mule-xml-generation    |
      | dv-xml-approval        |
      | mule-d365-import       |
      | dv-d365-journalposting |
      | mule-dependantproduct  |

  # Dynamics F&O OData — **per cloned repo** (opt-in). Set LLOYDS_FNO_ODATA_REPO_PATH_TEMPLATE with `{repo}` (OData under /data).
  # Lloyd's F&O legal entity is **always AEUM** — template should fix `dataAreaId eq 'AEUM'` (and any `AEUM ` prefix in Description); only `{repo}` changes across Examples.
  @lloyds @lloyds-e2e-readonly @lloyds-fno-odata @PP-391-FNO-001
  Scenario Outline: Dynamics F&O OData read for repository "<repo>"
    Given Lloyd's F&O OData per-repository read is configured
    When I request F&O OData for repository "<repo>"
    Then the F&O OData HTTP status should be 200

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

  # Phase C — Fabric warehouse SQL (opt-in: LLOYDS_FABRIC_DIMENSION_SQL_ENABLED=1 + LLOYDS_FNOFABRIC_SQLSERVER_*).
  @lloyds @lloyds-e2e-readonly @lloyds-fabric-dimension-sql @PP-391-E2E-FABRIC-001
  Scenario: Fabric mirrored warehouse — offset main accounts exist in dimensionattributevaluecombination
    Given Lloyd's Fabric dimension SQL read is enabled
    And the committed Lloyd's sample XML at "docs/lloyds/XMLs/AEUM US-58338 202604091630.xml"
    When I validate distinct offset main account tokens from the committed sample XML against dbo dimensionattributevaluecombination
