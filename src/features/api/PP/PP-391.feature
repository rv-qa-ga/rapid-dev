# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-391 - Lloyd's D365 Journal Integration | 1 Capture Source & XML Financial Summaries
# https://accelins.atlassian.net/browse/PP-391
#
# Design / field reference: https://accelins.atlassian.net/wiki/x/GIALsg
# Design Revision (straight-through): XML vs ADP totals + dimension checks run automatically
#   after generation — see programme flow vs Baseline (manual Ops XML approval removed for that gate).
# Service Bus contracts & sample JSON: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3118760006/Service+Bus+Messages#Sample-messages
# Architecture / feedback loop: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3015376910
# Draft scenarios source: data/draft-user-feature-files/PP-391-FF.docx
# Programme context: docs/lloyds/LLOYDS_DATA_FLOW_ARCHITECTURE.md, docs/lloyds/confluence-*.md
#
# Dev environment (current automation target): Service Bus namespace sb-dev-uks-lyd — queues include
#   mule-xml-generation, dv-xml-approval, mule-d365-import, dv-d365-journalposting, mule-dependantproduct,
#   servicebuslyddev-queue (use Sample messages in Confluence for golden payloads).
#
# Assertions: where a Mule Azure SQL control row exists for the correlation, scenarios expect both
#   Dataverse (Operational Workflow / Integration File) and Mule control DB to align per design.
#
# Zephyr (PP project) + Jira link: npm run zephyr:UploadAndLink:PP391
# Step definitions: Lloyd's Stage-1 Dataverse rows use `src/step-definitions/lloyds/xml-generation.steps.ts`.
# Top "API-###" rows below map to the same runnable glue as PP-391-UI-00x outlines (Zephyr IDs preserved).
# ══════════════════════════════════════════════════════════════════════════════

# Do not put @ui on the Feature: it is inherited by all @api @lloyds outlines and forces Salesforce JWT + browser.
# Keep @ui only on WIP / future Playwright scenarios that truly need Salesforce UI.
@api @pp @PP-391 @lloyds @d365 @dataverse @adp @xml-reconciliation @straight-through @servicebus
Feature: API / UI - PP-391 - Capture source and XML financial summaries (Lloyd's D365 journal integration)

  As the Lloyd's journal integration
  I want source and XML financial summaries captured and comparable with ABS tolerance
  So that straight-through validation (Design Revision) has a reliable basis before D365 submission

  Background:
    Given the PP-391 test configuration is loaded
    # Golden message bodies: Confluence ISDE → Service Bus | Messages → Sample messages (mule-xml-generation-*)
    # API scenarios: Given I have a valid Dynamics 365 API token; optional read access to Mule Azure SQL control data
    # UI scenarios: operational workflow / Ops visibility as agreed with Power Platform team

  # ─── Acceptance criteria (Dataverse / integration) ───────────────────────

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-API-001 @p1 @smoke @xml-generated-event @positive
  Scenario Outline: PP-391-API-001 — mule-xml-generation-success persists payload identity + ADP totals (Dataverse)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And the record's correlation id should match the sent correlation id
    And the record's blob id should include the sanity row file name
    And the record should have a Repository File lookup resolved
    And the record's workflow totals should match the payload within ABS tolerance 5

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-API-002 @p1 @positive @blob-xml-scan
  Scenario Outline: PP-391-API-002 — blob XML scan persists XML financial summary + Process Path ADP
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's XML financial summary fields should be populated
    And the record's process path should indicate ADP
    And the record's XML totals should match ADP totals computed from the local XML within ABS tolerance 5

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-API-003 @p1 @status @positive
  Scenario Outline: PP-391-API-003 — populated values reach happy-path status (automatic validation ready)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's statuscode should be a happy-path value

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-API-004 @p1 @reconciliation @toggle @positive
  Scenario Outline: PP-391-API-004 — ADP vs XML exact match updates toggles and overall_match
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's overall_match should be true
    And all per-metric match toggles on the record should be true

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-API-005 @p1 @reconciliation @tolerance @positive
  Scenario Outline: PP-391-API-005 — ABS tolerance 5 on each metric still yields matching toggles
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals offset from the local XML by 3 on each metric
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's overall_match should be true
    And all per-metric match toggles on the record should be true

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-API-006 @p2 @correlation @dual-system
  Scenario Outline: PP-391-API-006 — CorrelationId ties Dataverse XML File to latest Mule PROCESS_TRACKER row (when SQL configured)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And the record's blob id should include the sanity row file name
    Given SQL Server is configured for Lloyd's Mule PROCESS_TRACKER reads
    When I fetch the latest PROCESS_TRACKER row for repository "<repo>"
    Then the PROCESS_TRACKER row should exist with a non-empty PROCESS_ID

    Examples:
      | row                               | repo     |
      | AEUM US-58338 202604091630.xml   | US-58338 |

  # ─── UI visibility (evidence; primary gate is automatic per Design Revision) ─

  @wip @PP-391 @PP-391-UI-001 @p2 @ui @evidence @servicebus
  Scenario: UI - Verify XmlGenerated or mule-xml-generation success path against blob and queue context
    Given new ADP data is prepared for Lloyd's journal integration in dev
    When the tester reviews Service Bus Explorer or monitoring for queue "mule-xml-generation" on sb-dev-uks-lyd
    Then a success path artefact should be observable for the test correlation per Sample messages in Confluence
    And capture screenshot evidence for the test pack

  @wip @PP-391 @PP-391-UI-002 @p1 @ui @payload
  Scenario: UI - Verify payload exposes File ID RepositoryID LegalEntity and ADP totals on the record
    Given new ADP data is prepared and XML generation processing has occurred
    When the tester reviews the Integration File or Operational Workflow in Dataverse or Ops app
    Then the record should expose File ID RepositoryID LegalEntity FileName CorrelationId BlobId
    And ADP_Currency ADP_TotalPremium ADP_TotalTax ADP_TotalOtherContributions ADP_TotalAgencyCommission ADP_TotalCommissionAmount should be visible or traceable
    And capture screenshot evidence for the test pack

  @wip @PP-391 @PP-391-UI-003 @p1 @ui @xml-summary
  Scenario: UI - Verify XML financial summary fields on record after blob content scan
    Given a new XML file exists in Azure Blob Storage for the scenario
    When Dataverse or Ops UI shows the Integration File after content processing
    Then XML_Currency XML_TotalPremium XML_TotalTax XML_TotalOtherContributions XML_TotalAgencyCommission XML_TotalCommissionAmount should be present
    And Process Path should show ADP where applicable
    And capture screenshot evidence for the test pack

  @wip @PP-391 @PP-391-UI-004 @p1 @ui @status
  Scenario: UI - Verify pre-automatic-validation status when all summary values populated
    Given all required source and XML summary values are populated on the record
    When an operations user opens the record in Ops workflow for visibility
    Then the status reason should match the solution label before straight-through validation completes (e.g. Awaiting Approval if still used)
    And capture screenshot evidence for the test pack

  @wip @PP-391 @PP-391-UI-005 @p1 @ui @toggle
  Scenario: UI - Verify per-field and overall toggles when ADP and XML values match
    Given all values are populated and ADP matches XML for each financial pair
    When the user views the reconciliation area in Ops workflow
    Then each value toggle should indicate match
    And the overall reconciliation toggle should indicate match
    And capture screenshot evidence for the test pack

  @wip @PP-391 @PP-391-UI-006 @p2 @ui @toggle @tolerance
  Scenario: UI - Verify toggles when pairs differ within ABS tolerance of five currency units
    Given all values are populated and ADP versus XML pairs differ within allowed ABS tolerance
    When the user views the reconciliation toggles in Ops workflow
    Then toggles should reflect match according to the five-unit tolerance rule
    And capture screenshot evidence for the test pack

  # ═══════════════════════════════════════════════════════════════════════════
  # QA workbook — docs/lloyds/PP-391-Feature File.docx (field-level parity)
  # Runnable: Service Bus → func-xml-totals → Dataverse `accelins_workflow` (same glue as
  #   src/features/lloyds/lloyds-pipeline-hops.feature @stage-1). UI-only / audit / DLQ rows stay @wip.
  # ═══════════════════════════════════════════════════════════════════════════

  @wip @lloyds @PP-391 @PP-391-UI-001 @ui @blob
  Scenario: PP-391-UI-001 — XmlGenerated / blob folder evidence (manual UI)
    Given the PP-391 UI-only scenario "PP-391-UI-001" is not yet automated

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-002 @positive
  Scenario Outline: PP-391-UI-002 — payload identity + ADP financial fields on XML File record
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And the record's correlation id should match the sent correlation id
    And the record's blob id should include the sanity row file name
    And the record should have a Repository File lookup resolved
    And the record's workflow totals should match the payload within ABS tolerance 5

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-003 @positive
  Scenario Outline: PP-391-UI-003 — blob XML scanned; XML financial summary persisted (Process Path ADP)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's XML financial summary fields should be populated
    And the record's process path should indicate ADP
    And the record's XML totals should match ADP totals computed from the local XML within ABS tolerance 5

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-004 @positive
  Scenario Outline: PP-391-UI-004 — populated values reach approved / ready-to-ship status reason
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's statuscode should be a happy-path value

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-005 @positive
  Scenario Outline: PP-391-UI-005 — ADP vs XML match updates each toggle and overall_match
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's overall_match should be true
    And all per-metric match toggles on the record should be true

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-006 @positive @tolerance
  Scenario Outline: PP-391-UI-006 — ABS tolerance of 5 units per metric still yields matching toggles
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals offset from the local XML by 3 on each metric
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's overall_match should be true
    And all per-metric match toggles on the record should be true

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @wip @lloyds @PP-391 @PP-391-UI-007 @ui @mule
  Scenario: PP-391-UI-007 — Mule XML generation UI (manual)
    Given the PP-391 UI-only scenario "PP-391-UI-007" is not yet automated

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-008 @positive
  Scenario Outline: PP-391-UI-008 — XML debit/credit roll-ups align with persisted XML totals on record
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's XML totals should match ADP totals computed from the local XML within ABS tolerance 5
    And the record's XML totals should match workflow totals on the record within ABS tolerance 5

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-009 @positive @idempotency
  Scenario: PP-391-UI-009 — same correlation id updates the same XML File record
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "AEUM US-58338 202604091630.xml"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I send the same "mule-xml-generation-success" payload again with the same correlation id
    Then exactly 1 Lloyd's XML File record should exist for that correlation id

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-010 @positive
  Scenario Outline: PP-391-UI-010 — match path reaches Approved / Ready to Ship (Dataverse statuscode)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003
    And the record's overall_match should be true
    And the record's statuscode should be a happy-path value

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-011 @negative @adp-vs-xml-mismatch
  Scenario Outline: PP-391-UI-011 — ADP vs XML mismatch (awaiting-approval style outcome on toggles)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with deliberately mismatched ADP totals versus the blob XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 120 seconds the record's overall_match should become false

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @wip @lloyds @PP-391 @PP-391-UI-011-audit @ui
  Scenario: PP-391-UI-010/011 — audit timeline / Ops approve-decline (manual evidence)
    Given the PP-391 UI-only scenario "PP-391-UI-010-011-audit" is not yet automated

  @api @lloyds @mule-xml-generation @stage-1 @phase-1 @PP-391 @PP-391-UI-012 @negative @blob-missing
  Scenario Outline: PP-391-UI-012 — incorrect blob id → no Dataverse record (DLQ evidence manual)
    Given the Lloyd's sanity plan is loaded
    And the Lloyd's sanity row "<row>"
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with a blob_id pointing at the wrong container
    Then within 60 seconds no Lloyd's XML File record should exist for that correlation id

    Examples:
      | row                               |
      | AEUM US-58338 202604091630.xml   |

  @wip @lloyds @PP-391 @PP-391-UI-012-dlq @ui
  Scenario: PP-391-UI-012 — dead-letter queue message (manual Service Bus Explorer)
    Given the PP-391 UI-only scenario "PP-391-UI-012-dlq" is not yet automated

  @wip @lloyds @PP-391 @PP-391-UI-013 @ui @blob
  Scenario: PP-391-UI-013 — changed-dimensions XML re-upload with mismatch (manual blob swap)
    Given the PP-391 UI-only scenario "PP-391-UI-013" is not yet automated
