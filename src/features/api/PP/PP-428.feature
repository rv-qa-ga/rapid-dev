# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-428 - Implement ServiceBus-triggered XML Totals Function (fa-xmltotals)
# https://accelins.atlassian.net/browse/PP-428
# Type: Story | Integration: MuleSoft → Azure Service Bus → Azure Function → Blob → Dataverse
# Architecture: docs/lloyds/LLOYDS_DATA_FLOW_ARCHITECTURE.md (fa-xmltotals, mule-xml-generation)
# Confluence (ISDE, fetched): docs/lloyds/confluence-lloyds-mulesoft-d365-agency-journals.md
#   Wiki: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2848423969
#   Regenerate: npx ts-node scripts/fetch-lloyds-mulesoft-d365-confluence.ts
#
# Sample XML: docs/lloyds/US-51304_470210_2025-12-23 11-56-06.947.xml
#
# Zephyr Scale (PP project) + Jira link:
#   npm run zephyr:UploadAndLink:PP428
#   Uses framework upload-and-link utility; project key PP from work item (not SF).
#
# Step definitions: pending. Run with: --tags "not @wip" until implemented.
# ══════════════════════════════════════════════════════════════════════════════

@api @pp @PP-428 @lloyds @azure-function @servicebus @dataverse @mule-xml-generation @wip
Feature: API - PP-428 - Service Bus triggered XML totals function (fa-xmltotals)

  As a Dataverse user
  I want the XML totals function to consume mule-xml-generation messages, read XML from Blob, compute or validate totals, and enrich Dataverse
  So that XML records are automatically enriched without duplicate or inconsistent updates when messages retry

  Background:
    Given the PP-428 integration test configuration is loaded
    # When steps are implemented: Given I have a valid Dynamics 365 API token

  # ─── Acceptance: ServiceBusTrigger on mule-xml-generation ─────────────────

  @PP-428 @PP-428-API-001 @p1 @smoke @servicebus-trigger
  Scenario: API - Service Bus queue mule-xml-generation triggers fa-xmltotals
    Given the XML totals function is deployed and bound to Service Bus queue "mule-xml-generation"
    When a minimal valid Service Bus test message is sent to queue "mule-xml-generation"
    Then the function host should process the message without binding or configuration errors

  # ─── mule-xml-generation-success: deserialize, blob, totals, Dataverse ───

  @PP-428 @PP-428-API-002 @p1 @positive @mule-xml-generation-success
  Scenario: API - Success path deserializes message, loads blob XML, computes totals, upserts Dataverse
    Given a correlation ID "pp428-success-001" and repo ID "pp428-repo-001" for PP-428
    And blob storage contains XML equivalent to sample file "docs/lloyds/US-51304_470210_2025-12-23 11-56-06.947.xml"
    When a "mule-xml-generation-success" message is sent to "mule-xml-generation" with:
      | field           | value |
      | processId       | <PROCESS_ID GUID aligned with PROCESS_TRACKER> |
      | correlationId   | pp428-success-001 |
      | repoId          | pp428-repo-001 |
      | messageType     | mule-xml-generation-success |
      | blobUri         | <blob URI matching uploaded fixture — see header notes> |
    Then the XML totals function should complete processing successfully
    And the Dataverse XML record for correlation ID "pp428-success-001" should be created or updated
    And the record should reflect totals derived from the XML including line count "6" and currency "USD"

  @PP-428 @PP-428-API-003 @p2 @positive @precomputed-totals
  Scenario: API - Success message with precomputed totals validates without corrupting Dataverse
    Given a correlation ID "pp428-success-002" with a "mule-xml-generation-success" message whose payload includes precomputed totals matching the blob XML
    When the message is sent to "mule-xml-generation"
    Then the Dataverse XML record for correlation ID "pp428-success-002" should match the validated totals
    And no duplicate XML records should exist for the same correlation ID and message type

  # ─── mule-xml-generation-failed: no Dataverse update ───────────────────────

  @PP-428 @PP-428-API-004 @p1 @negative @mule-xml-generation-failed
  Scenario: API - Failed generation message does not create or update Dataverse XML records
    Given a correlation ID "pp428-failed-001" has no existing XML totals enrichment
    When a "mule-xml-generation-failed" message is sent to "mule-xml-generation" for correlation ID "pp428-failed-001"
    Then the XML totals function should complete without throwing unhandled errors
    And the Dataverse XML record for correlation ID "pp428-failed-001" should not be created or enriched by this function

  # ─── Idempotency ───────────────────────────────────────────────────────────

  @PP-428 @PP-428-API-005 @p1 @idempotency @mule-xml-generation-success
  Scenario: API - Duplicate success message does not create duplicate Dataverse records
    Given a correlation ID "pp428-idem-001" has already been processed successfully for "mule-xml-generation-success"
    When the same "mule-xml-generation-success" message is sent again to "mule-xml-generation"
    Then the Dataverse XML record for correlation ID "pp428-idem-001" should remain in the intended final state
    And exactly one logical record should exist for natural key correlation ID "pp428-idem-001" and message type "mule-xml-generation-success"

  @PP-428 @PP-428-API-006 @p2 @idempotency @ordering
  Scenario: API - Success after prior failure handled without duplicate records
    Given a correlation ID "pp428-order-001" previously received "mule-xml-generation-failed"
    When a "mule-xml-generation-success" message is sent for correlation ID "pp428-order-001" with valid blobUri
    Then the Dataverse state for correlation ID "pp428-order-001" should match documented success behaviour
    And duplicate records must not exist for the same natural key

  @PP-428 @PP-428-API-007 @p2 @idempotency @ordering
  Scenario: API - Failure after prior success does not corrupt finalised success state
    Given a correlation ID "pp428-order-002" is already in final success state with totals from XML
    When a "mule-xml-generation-failed" message is sent for correlation ID "pp428-order-002"
    Then the Dataverse XML record for correlation ID "pp428-order-002" should match documented behaviour for failure-after-success

  # ─── Component (XML parsing / totals math — no Service Bus) ──────────────

  @PP-428 @PP-428-API-008 @p1 @component
  Scenario: API - Fixture XML deserialises to expected line count and currency
    Given the PP-428 sample ledger journal XML at "docs/lloyds/US-51304_470210_2025-12-23 11-56-06.947.xml"
    When fa-xmltotals parsing logic runs against that XML content
    Then computed line count should be "6"
    And primary currency code should be "USD"

  @PP-428 @PP-428-API-009 @p2 @component
  Scenario: API - Balanced journal fixture has matching debit and credit sums
    Given the PP-428 sample ledger journal XML at "docs/lloyds/US-51304_470210_2025-12-23 11-56-06.947.xml"
    When debit and credit totals are aggregated from all LEDGERJOURNALENTITY elements
    Then total debits should equal total credits within tolerance "0.01"
