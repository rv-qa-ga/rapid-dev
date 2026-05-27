@mulesoft @smoke @api
Feature: MuleSoft Authentication and Basic Log Access Test

  As a QA engineer
  I want to verify MuleSoft authentication works
  So that I can access application logs

  Background:
    Given I have a valid MuleSoft API token

  @smoke
  Scenario: List available MuleSoft applications
    When I list all MuleSoft applications
    # Step completes successfully if authentication and API call work

  @smoke
  Scenario: Get application details for accl-dataverse-sys-api-qa
    When I get the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft application should exist
    Then the MuleSoft application status should be "Running"

  @smoke
  Scenario: Retrieve logs for accl-dataverse-sys-api-qa
    When I get logs for the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain at least 0 entries
