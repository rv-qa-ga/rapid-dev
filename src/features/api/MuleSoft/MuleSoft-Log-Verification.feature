@mulesoft @api
Feature: MuleSoft Application Log Verification

  As a QA engineer
  I want to verify MuleSoft application logs
  So that I can ensure applications are running correctly and capture events

  Background:
    Given I have a valid MuleSoft API token

  @smoke
  Scenario: Verify application exists and is running
    When I get the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft application should exist
    Then the MuleSoft application status should be "Running"

  @smoke
  Scenario: Verify application logs are accessible
    When I get logs for the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain at least 1 entries

  @regression
  Scenario: Verify no errors in application logs
    When I search for errors in the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft application should not have errors

  @regression
  Scenario: Verify specific event capture in logs
    When I search logs for "accelins-parties-post-flow" in the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain at least 1 entries
    Then the MuleSoft logs should contain the text "accelins-parties-post-flow"

  @regression
  Scenario: Verify no HTTP 400 errors in logs
    When I search logs for "status=400" in the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain 0 entries

  @regression
  Scenario: Verify log file download and content
    When I download the log file for the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft log file should contain "LoggerMessageProcessor"
    Then the MuleSoft log file should not contain "FATAL"

  @regression
  Scenario: Verify logs by correlation ID
    # Example correlation ID from logs
    When I get logs by correlation ID "53ced740-f53d-11f0-91fb-9aaf90f8584b" for the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain at least 1 entries
    Then the MuleSoft logs should contain the text "Dataverse create"

  @regression
  Scenario: Verify error level logs
    When I get logs for the MuleSoft application "accl-dataverse-sys-api-qa" with level "ERROR"
    Then the MuleSoft logs should contain 0 entries

  @regression
  Scenario: List all applications
    When I list all MuleSoft applications
    # Note: Verification steps would need to be added based on expected applications
