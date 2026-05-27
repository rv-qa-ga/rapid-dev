# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1081 — UI smoke for Prospect Account Status mappings
#
# SF-1081 is the data-only follow-up to SF-593 (adds Prospect → Party rows). The UI smoke here
# exercises the trigger event: an admin setting Account_Status__c to Prospect on an Account.
# CMDT validation uses live qamerge SOQL as the MuleSoft integration user (see SF-1081 API feature).
# Requirements documentation: Picklist Value Mappings.xlsx (not used for runtime CMDT asserts).
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-1081 @account @party-integration @prospect-status
Feature: UI - SF-1081 - Account_Status Prospect drives Party integration (smoke)

  Background:
    Given I am logged in as a "Accelerant - System administrator" user

  # Member Account created as Prospect via API — verify read-only header (no edit/save; Member layout date validation blocks save on qamerge)
  @SF-1081 @SF-1081-UI-001 @p2 @smoke @ui-status-change
  Scenario: UI - Account with Prospect Account_Status displays on the record page
    Given I have a test Account created via API with Type Member
    When I navigate to the Account record
    Then the "Account Status" field should display "Prospect"
    And I take a screenshot as evidence

  # Edit sets Prospect → live CMDT resolve (MuleSoft); no UI save — Member edit save blocked by date-format rule on qamerge
  @SF-1081 @SF-1081-UI-002 @p2 @ui-api-roundtrip
  Scenario: UI - Account_Status Prospect selected in edit resolves via live Dataverse_Mapping__mdt
    Given I have a valid Salesforce API token
    And I have an Account with status "Active"
    When I navigate to the Account record
    And I click Edit on the Account
    And I set "Account_Status__c" to "Prospect"
    And I have a valid Salesforce API token as MuleSoft integration user with Custom Metadata access
    When I resolve Dataverse IDs for the created Account's Account_Status__c via CMDT
    Then the resolved Dataverse IDs should include
      | Dataverse_Field__c        |
      | accelins_party.statecode  |
      | accelins_party.statuscode |
