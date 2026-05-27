# ══════════════════════════════════════════════════════════════════════════════
# Cross-system API smoke — canonical path: src/features/api/e2e/ (API + integration tags)
# Salesforce Account (API) → CometD subscription (Account__e) → REST read-back →
# MuleSoft log snapshots (PAPI + SAPI; org/env from MULESOFT_ORG_ID + MULESOFT_ENV_ID) → Dynamics WhoAmI
# EventLogFile: requires Event Monitoring (often unavailable on qamerge for the JWT user).
#
# Not under qa-smoke-test.feature: that file's UI Background would run before every scenario.
#
# Prereqs: SF JWT (e.g. SF_QAMRDUSER_JWT_USERNAME), MULESOFT_* (client, org, env, AMC base),
#   Dynamics app registration — see env.sample / .env.<ENV>
# Optional: E2E_ACCOUNT_PLATFORM_EVENT_CHANNEL if Account__e is not the channel name in your org.
# Trace: EventUuid from `Account__e`, correlation hints from Mule log lines, Dataverse x-ms-* from WhoAmI — see final step attachment.
# Run: npm run test:e2e:sf-mule-d365:qamerge
# ══════════════════════════════════════════════════════════════════════════════

@api @integration @e2e-smoke-sf-mulesoft-d365 @salesforce @mulesoft @dynamics @qa @smoke
Feature: QA smoke — cross-system API chain (Salesforce, MuleSoft, Dynamics)

  As a QA engineer
  I want one API-only scenario that touches Salesforce, MuleSoft, and Dynamics
  So that we have a repeatable post-deploy signal across the integration path

  @smoke @e2e-smoke-sf-mulesoft-d365
  Scenario: Create Account in Salesforce, verify Account via API, stream events, MuleSoft logs, Dynamics WhoAmI
    Given I have a valid Salesforce API token as QA MRD user
    Given I subscribe to Account Platform Events using the active Salesforce API session
    And I have a test Account created via API with Type "Member"
    Then the API account should be created successfully
    Then I should be able to retrieve the account by ID
    When I wait 15 seconds for Platform Event to be published
    When I log a summary of platform events from the Salesforce streaming subscription
    When I fetch and log MuleSoft log summaries for applications "sf-accounts-papi-qa" and "accl-dataverse-sys-api-qa"
    Given I unsubscribe from Account Platform Events
    Given I have a valid Dynamics 365 API token
    When I call the Dynamics WhoAmI endpoint
    Then the response status should be 200
    And the response should contain a valid UserId (GUID)
    When I log the cross-system trace summary for documentation
