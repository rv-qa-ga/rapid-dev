# ══════════════════════════════════════════════════════════════════════════════
# Anypoint Platform application logs — sample automation
# References:
#   - docs/How to get application logs using the Anypoint Platform APIs 1.docx
#   - docs/Anypoint_Platform_Logs.postman_collection 1.json (OAuth → env →
#     deployments → spec → GET .../specs/{specId}/logs with length/startTime/endTime/logLevel)
# Credentials: MULESOFT_CLIENT_ID, MULESOFT_CLIENT_SECRET (e.g. .env.qamerge), plus
#   MULESOFT_BASE_URL (region), MULESOFT_ORGANIZATION_ID, MULESOFT_ENVIRONMENT_ID.
# Application highlights (from your inventory):
#   - Salesforce-related (green): use Accounts PAPI below as the sample target.
#   - Lloyds / Dataverse (yellow): use Dataverse SAPI below.
# ══════════════════════════════════════════════════════════════════════════════

@mulesoft @api @anypoint-logs-sample
Feature: MuleSoft Anypoint — sample log read (confirms log API access)

  As a QA engineer
  I want to call the same log surfaces as the Anypoint Postman collection
  So that we can confirm client credentials and log retrieval work end-to-end for our apps

  Background:
    Given I have a valid MuleSoft API token

  @smoke @anypoint @salesforce-track @papi
  Scenario: Sample — Salesforce track — read logs for sf-accounts-papi-qa
    When I get the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft application should exist
    Then the MuleSoft application status should be "Running"
    When I get logs for the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft logs should contain at least 0 entries

  @smoke @anypoint @lloyds-track @sapi
  Scenario: Sample — Lloyds / Dataverse track — read logs for accl-dataverse-sys-api-qa
    When I get the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft application should exist
    Then the MuleSoft application status should be "Running"
    When I get logs for the MuleSoft application "accl-dataverse-sys-api-qa"
    Then the MuleSoft logs should contain at least 0 entries

  @regression @anypoint
  Scenario: Sample — optional raw log file download (Salesforce PAPI)
    When I download the log file for the MuleSoft application "sf-accounts-papi-qa"
    Then the MuleSoft log file should contain "LoggerMessageProcessor"
