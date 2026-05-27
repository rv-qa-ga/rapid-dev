# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-394 - Lloyd's D365 Journal Integration | 4 Import Monitoring & Error Handling
# https://accelins.atlassian.net/browse/PP-394
#
# Source doc: C:\Users\RavindranathVazhenkh\Downloads\PP-394.doc (exported Jira AC)
# AC highlights:
#   - mule-xml-submission-failed -> "Failed to Ship to Dynamics"
#   - mule-dmf-import-failed OR mule-dmf-processing-failed -> "Failed to Import to Dynamics"
#   - error details should be visible to Operations
#
# Status-label mapping is env-driven:
#   LLOYDS_STATUSCODE_SHIPPED_TO_DYNAMICS
#   LLOYDS_STATUSCODE_FAILED_TO_SHIP_TO_DYNAMICS
#   LLOYDS_STATUSCODE_FAILED_TO_IMPORT_TO_DYNAMICS
# ══════════════════════════════════════════════════════════════════════════════

@api @pp @PP-394 @lloyds @d365 @dmf @dataverse @mulesoft @servicebus
Feature: API - PP-394 - Import monitoring and error handling (Lloyd's)

  Background:
    Given the PP-394 test configuration is loaded
    And the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003

  @PP-394 @PP-394-API-001 @p1 @negative @submission-failed
  Scenario: Verify mule-xml-submission-failed updates status to Failed to Ship to Dynamics
    When I publish Lloyd's mule-d365-import message "mule-xml-submission-failed" for the current correlation and file name
    Then within 240 seconds the record should reach Dataverse statuscode for Lloyd's label "Failed to Ship to Dynamics"
    And within 240 seconds the record should not reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"

  @PP-394 @PP-394-API-002 @p1 @negative @dmf-import-failed
  Scenario Outline: Verify DMF failure messages update status to Failed to Import to Dynamics
    When I publish Lloyd's mule-d365-import message "<messageType>" for the current correlation and file name
    Then within 240 seconds the record should reach Dataverse statuscode for Lloyd's label "Failed to Import to Dynamics"
    And within 240 seconds the record should not reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"

    Examples:
      | messageType                |
      | mule-dmf-import-failed     |
      | mule-dmf-processing-failed |
