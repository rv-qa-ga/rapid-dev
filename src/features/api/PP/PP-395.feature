# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-395 - Lloyd's D365 Journal Integration | 5 Monitor Journal Posting
# https://accelins.atlassian.net/browse/PP-395
#
# Source doc: C:\Users\RavindranathVazhenkh\Downloads\PP-395.doc (exported Jira AC)
# Parent epic: PP-390 — Lloyd's | D365 Journal Integration Feedback & 3-Way Reconciliation Loop
#
# AC summary (from Jira):
#   - Preconditions: DMF execution succeeded; XML File status **Ready to Post to Dynamics**
#   - Run agreed **F&O Silver** query (Fabric financial summary — programme Confluence)
#   - After journals posted: aggregate financials → populate Dataverse XML File **D365_*** summary fields
#     (D365_Currency, D365_TotalPremium, D365_TotalTax, D365_TotalOtherContributions,
#      D365_TotalAgencyCommission, D365_TotalCommissionAmount)
#   - Update **match toggles** when ADP, XML, and D365 values align within **ABS tolerance 5**
#   - Post outcome messages on **`dv-d365-journalposting`** (dv-journal-posting-* contract)
#   - **SLA:** if no posting confirmation within **5 days**, set status to **Not posted to Dynamics**
#     and send posting-failed style message on the same queue family
#
# Service Bus samples: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/3118760006/Service+Bus+Messages#dv-journal-posting
# F&O financial retrieval (programme): https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2967666691/Feedback+Loop+Fabric+F+O+Financial+Summary#Retrieving-Financial-Values
#
# Runnable glue: Stage-4 umbrella steps (`lloyds-umbrella-narrative.steps.ts`) are gated on
#   `LLOYDS_LIVE_POSTING_AUTOMATION_ENABLED=1` until posting + SQL asserts are implemented.
# Fabric / Dataverse D365_* field scenarios use `the PP-395 scenario … is not yet automated` until
#   F&O Silver query + Dataverse field mapping tests land (reuse `lloydsFnOFabricSqlClient` / `XmlFileRecordClient` extensions).
#
# Zephyr (when used): mirror PP-391 pattern — `ZEPHYR_PROJECT_KEY=PP`, work item PP-395.
# ══════════════════════════════════════════════════════════════════════════════

@api @pp @PP-395 @lloyds @d365 @posting @journal-posting @dataverse @servicebus @fabric
Feature: API - PP-395 - Monitor journal posting (Lloyd's)

  Background:
    Given the PP-395 test configuration is loaded

  # ─── Programme Stage 4 — reuses umbrella narrative (opt-in env) ─────────────

  @wip @PP-395 @PP-395-API-001 @stage-4 @posting @positive
  Scenario: Verify dv-journal-posting-success advances Mule control to POSTED and ADP repo completes
    Given Ops have posted the journal in D365 F&O
    When the Journal Posting Confirmation Service publishes `dv-journal-posting-success` on `dv-d365-journalposting`
    Then Mule's Azure SQL state for the correlation id should become `POSTED`
    And the ADP repo file should reach status `WORK_ITEM_COMPLETE`

  @wip @PP-395 @PP-395-API-002 @stage-4 @posting @negative
  Scenario: Verify dv-journal-posting-failed records posting failure and escalates per programme
    When `dv-journal-posting-failed` is published on `dv-d365-journalposting`
    Then Mule should set the state to `POSTING_FAILED`
    And a ServiceNow incident should be raised keyed by `PROCESS_ID` + `ERROR_ID`

  # ─── Jira AC — Dataverse + F&O Silver (explicit placeholders until automated) ─

  @wip @PP-395 @PP-395-API-003 @fabric @fno
  Scenario: Verify F&O Silver financial aggregate populates D365 summary columns on the XML File
    Given the PP-395 scenario "FNO-Silver-aggregate-to-Dataverse-D365-fields" is not yet automated

  @wip @PP-395 @PP-395-API-004 @reconciliation
  Scenario: Verify ADP XML and D365 triple match updates toggles within ABS tolerance five
    Given the PP-395 scenario "ADP-XML-D365-match-toggles-ABS-5" is not yet automated

  @wip @PP-395 @PP-395-API-005 @servicebus
  Scenario: Verify journal posting lifecycle posts expected dv-journal-posting queue messages
    Given the PP-395 scenario "dv-journal-posting-queue-contract" is not yet automated

  @wip @PP-395 @PP-395-API-006 @sla @negative
  Scenario: Verify five day SLA without posting confirmation sets Not posted to Dynamics and posts failure message
    Given the PP-395 scenario "SLA-5d-not-posted-to-dynamics-plus-failed-message" is not yet automated
