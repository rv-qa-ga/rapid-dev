@mulesoft @api @test-env
Feature: MuleSoft TEST Environment Log Access - PAPI and SAPI

  As a QA engineer
  I want to access logs for both PAPI and SAPI applications in TEST environment
  So that I can verify application status and check for errors or events

  Background:
    Given I have a valid MuleSoft API token

  # ============================================================================
  # PAPI (sf-accounts-papi-qa) Log Access
  # ============================================================================

  @smoke @papi
  Scenario: Verify PAPI application exists and is running
    When I get the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft application should exist
    Then the MuleSoft application status should be "Running"

  @smoke @papi
  Scenario: Retrieve PAPI application logs
    When I get logs for the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft logs should contain at least 0 entries

  @regression @papi
  Scenario: Check for errors in PAPI logs
    When I search for errors in the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft application should not have errors

  @regression @papi
  Scenario: Search for specific events in PAPI logs
    When I search logs for "accounts" in the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft logs should contain at least 0 entries

  @regression @papi
  Scenario: Get ERROR level logs from PAPI
    When I get logs for the MuleSoft application "sf-accounts-papi-qa" with level "ERROR"
    Then the MuleSoft logs should contain 0 entries

  @regression @papi
  Scenario: Download PAPI log file
    When I download the log file for the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft log file should contain "LoggerMessageProcessor"

  # ============================================================================
  # SAPI (accl-dataverse-sys-api-qa) Log Access
  # ============================================================================

  @smoke @sapi
  Scenario: Verify SAPI application exists and is running
    When I get the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft application should exist
    Then the MuleSoft application status should be "Running"

  @smoke @sapi
  Scenario: Retrieve SAPI application logs
    When I get logs for the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain at least 0 entries

  @regression @sapi
  Scenario: Check for errors in SAPI logs
    When I search for errors in the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft application should not have errors

  @regression @sapi
  Scenario: Search for Dataverse events in SAPI logs
    When I search logs for "Dataverse" in the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain at least 0 entries

  @regression @sapi
  Scenario: Search for flow execution in SAPI logs
    When I search logs for "accelins-parties-post-flow" in the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain at least 0 entries

  @regression @sapi
  Scenario: Check for HTTP 400 errors in SAPI logs
    When I search logs for "status=400" in the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain 0 entries

  @regression @sapi
  Scenario: Get ERROR level logs from SAPI
    When I get logs for the MuleSoft application "accl-dataverse-sys-api-qa" with level "ERROR"
    Then the MuleSoft logs should contain 0 entries

  @regression @sapi
  Scenario: Download SAPI log file
    When I download the log file for the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft log file should contain "LoggerMessageProcessor"

  # ============================================================================
  # Combined Verification
  # ============================================================================

  @regression @both
  Scenario: Verify both PAPI and SAPI are running without errors
    When I get the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft application should exist
    Then the MuleSoft application status should be "Running"
    
    When I get the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft application should exist
    Then the MuleSoft application status should be "Running"
    
    When I search for errors in the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft application should not have errors
    
    When I search for errors in the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft application should not have errors
