# ══════════════════════════════════════════════════════════════════════════════
# SF-736 MRD subset — Member / TPA mastered Account → Dynamics (QA MRD JWT).
# Filename avoids `SF-736-*.feature` so Zephyr `upload-and-link --work-item SF-736`
# only picks up `SF-736.feature` (API + UI mastered flows), not this MRD pack.
#
# Run:
#   cross-env ENV=qamerge node scripts/run-tests-with-env.js src/features/api/SF/mrd-sf736-member-tpa.feature --tags "@SF-736-MRD"
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-736-MRD @dynamics @integration @mastered-account @mulesoft
Feature: API - SF-736 MRD — Member & TPA mastered Accounts sync to Dynamics

  As a Product Owner
  I want Salesforce mastered Account changes to flow one-way into Dynamics with low latency
  So that Dynamics party / account data stays aligned with Salesforce

  Background:
    Given I have a valid Salesforce API token as QA MRD user

  @SF-736-MRD @SF-736-MRD-API-001 @p1 @smoke @member
  Scenario: MRD API-001 — Member Account created in Salesforce is represented in Dynamics
    Given I have an Account with Type "Member" created via API
    And SF-736 integration assertions use the active Salesforce API client and current Account
    Then the API account should be created successfully
    And I should be able to retrieve the account by ID
    When I wait 25 seconds for MuleSoft processing
    Given I have a valid Dynamics 365 API token
    When I check Dynamics Party record exists for the current account via API
    Then I confirm the party details are correct in the Dynamics API

  @SF-736-MRD @SF-736-MRD-API-002 @p1 @smoke @tpa
  Scenario: MRD API-002 — TPA Account created in Salesforce is represented in Dynamics
    Given I have an Account with Type "TPA" created via API
    And SF-736 integration assertions use the active Salesforce API client and current Account
    Then the API account should be created successfully
    And I should be able to retrieve the account by ID
    When I wait 25 seconds for MuleSoft processing
    Given I have a valid Dynamics 365 API token
    When I check Dynamics Party record exists for the current account via API
    Then I confirm the party details are correct in the Dynamics API

  @SF-736-MRD @SF-736-MRD-API-003 @p2 @regression
  Scenario Outline: MRD API-003 — Additional mastered Account Types reach Dynamics after create
    Given I have an Account with Type "<accountType>" created via API
    And SF-736 integration assertions use the active Salesforce API client and current Account
    Then the API account should be created successfully
    When I wait 25 seconds for MuleSoft processing
    Given I have a valid Dynamics 365 API token
    When I check Dynamics Party record exists for the current account via API
    Then I confirm the party details are correct in the Dynamics API

    Examples:
      | accountType      |
      | Agency           |
      | Member MGA       |
      | Non-Member MGA   |

  @SF-736-MRD @SF-736-MRD-API-010 @p1 @member @lifecycle
  Scenario: MRD API-010 — Member Account field update in Salesforce remains consistent in Dynamics after sync
    Given I have an Account with Type "Member" created via API
    And SF-736 integration assertions use the active Salesforce API client and current Account
    Given I have a valid Dynamics 365 API token
    When I wait 20 seconds for MuleSoft processing
    When I check Dynamics Party record exists for the current account via API
    When I update the Account via PATCH request with:
      | Name | SF736-MRD-sync-field-update-7f3a9c2e1d4b8a6f0e2c4d8b1a9f7e6d5c4b3a2918 |
    When I wait 25 seconds for MuleSoft processing
    When I check Dynamics Party record exists for the current account via API
    Then I confirm the party details are correct in the Dynamics API

  @SF-736-MRD @SF-736-MRD-API-011 @p1 @member @lifecycle
  Scenario: MRD API-011 — Member Account status change from Salesforce is reflected downstream (integration trigger)
    Given I have an Account with Type "Member" created via API
    And SF-736 integration assertions use the active Salesforce API client and current Account
    When I update the Account Status to "Onboarding" to trigger integration
    Given I have a valid Dynamics 365 API token
    When I wait 30 seconds for MuleSoft processing
    When I check Dynamics Party record exists for the current account via API
    Then I confirm the party details are correct in the Dynamics API

  @SF-736-MRD @SF-736-MRD-API-012 @p2 @tpa @lifecycle
  Scenario: MRD API-012 — TPA Account status change from Salesforce is reflected downstream (integration trigger)
    Given I have an Account with Type "TPA" created via API
    And SF-736 integration assertions use the active Salesforce API client and current Account
    When I update the Account Status to "Onboarding" to trigger integration
    Given I have a valid Dynamics 365 API token
    When I wait 30 seconds for MuleSoft processing
    When I check Dynamics Party record exists for the current account via API
    Then I confirm the party details are correct in the Dynamics API

  @SF-736-MRD @SF-736-MRD-API-020 @p2 @member @destructive
  Scenario: MRD API-020 — Member Account deleted in Salesforce (downstream tombstone rules vary by org)
    Given I have an Account with Type "Member" created via API
    And SF-736 integration assertions use the active Salesforce API client and current Account
    When the Account is deleted in Salesforce via API
    When I wait 15 seconds for MuleSoft processing

  @SF-736-MRD @SF-736-MRD-API-030 @p2 @SF-736-MRD-events @diagnostics
  Scenario: MRD API-030 — Optional Account platform events + Mule log correlation after Member create
    Given I subscribe to Account Platform Events using the active Salesforce API session
    And I have an Account with Type "Member" created via API
    Then the API account should be created successfully
    When I wait 20 seconds for Platform Event to be published
    When I log a summary of platform events from the Salesforce streaming subscription
    When I fetch and log MuleSoft log summaries for applications "sf-accounts-papi-qa" and "accl-dataverse-sys-api-qa"
    Given I unsubscribe from Account Platform Events
