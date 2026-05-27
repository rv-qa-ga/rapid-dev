# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-393 - Lloyd's D365 Journal Integration | 3 Dynamics Import Submission & Tracking
# https://accelins.atlassian.net/browse/PP-393
#
# Source doc: C:\Users\RavindranathVazhenkh\Downloads\PP-393.doc (exported Jira AC)
# AC highlights:
#   - mule-xml-submission-success OR mule-dmf-import-success -> "Shipped to Dynamics"
#   - mule-dmf-processing-success -> "Ready to Post to Dynamics"
#
# Status-label mapping is env-driven for non-Stage1 labels:
#   LLOYDS_STATUSCODE_SHIPPED_TO_DYNAMICS
#   LLOYDS_STATUSCODE_READY_TO_POST_TO_DYNAMICS
#   LLOYDS_STATUSCODE_FAILED_TO_SHIP_TO_DYNAMICS
#   LLOYDS_STATUSCODE_FAILED_TO_IMPORT_TO_DYNAMICS
# ══════════════════════════════════════════════════════════════════════════════

@api @pp @PP-393 @lloyds @d365 @dmf @dataverse @mulesoft @servicebus
Feature: API - PP-393 - Dynamics import submission and tracking (Lloyd's)

  Background:
    Given the PP-393 test configuration is loaded
    And the Lloyd's sanity plan is loaded
    And the Lloyd's latest runnable blob for the configured test repository from the sanity plan
    And a fresh correlation id from the sanity counter
    When I send "mule-xml-generation-success" with ADP totals computed from the local XML
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And within 300 seconds the record should reach Dataverse statuscode 100000003

  @PP-393 @PP-393-API-001 @p1 @smoke @positive
  Scenario: Verify mule-xml-submission-success sets Shipped to Dynamics
    When I publish Lloyd's mule-d365-import message "mule-xml-submission-success" for the current correlation and file name
    Then within 240 seconds the record should reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"

  @PP-393 @PP-393-API-002 @p1 @positive
  Scenario: Verify mule-dmf-import-success sets Shipped to Dynamics
    When I publish Lloyd's mule-d365-import message "mule-dmf-import-success" for the current correlation and file name
    Then within 240 seconds the record should reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"

  @PP-393 @PP-393-API-003 @p1 @positive
  Scenario: Verify mule-dmf-processing-success sets Ready to Post to Dynamics
    When I publish Lloyd's mule-d365-import message "mule-dmf-processing-success" for the current correlation and file name
    Then within 240 seconds the record should reach Dataverse statuscode for Lloyd's label "Ready to Post to Dynamics"

  @PP-393 @PP-393-API-004 @p1 @negative
  Scenario: Verify mule-xml-submission-failed does not leave record in Shipped to Dynamics
    When I publish Lloyd's mule-d365-import message "mule-xml-submission-failed" for the current correlation and file name
    Then within 240 seconds the record should reach Dataverse statuscode for Lloyd's label "Failed to Ship to Dynamics"
    And within 240 seconds the record should not reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"

  @PP-393 @PP-393-API-005 @p1 @negative
  Scenario: Verify mule-dmf-import-failed sets Failed to Import to Dynamics
    When I publish Lloyd's mule-d365-import message "mule-dmf-import-failed" for the current correlation and file name
    Then within 240 seconds the record should reach Dataverse statuscode for Lloyd's label "Failed to Import to Dynamics"
    And within 240 seconds the record should not reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"
