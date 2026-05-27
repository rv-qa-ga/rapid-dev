# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-593 — UI smoke for Account → Party Dataverse mappings
#
# SF-593 itself is an integration story (Dataverse_Mapping__mdt + MuleSoft query). The UI smoke
# here exercises the *trigger event* that the integration consumes: an admin editing
# Account_Status__c on an Account record. The full API coverage (Jira ACs 1–7) lives in
# src/features/api/SF/SF-593.feature.
#
# Reuses common UI steps: navigate to Account record, click Edit, I set {field} to {value},
# I save the record, the {field} field should display {value}, take a screenshot.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-593 @account @party-integration
Feature: UI - SF-593 - Account_Status drives Party integration (smoke)

  Background:
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Type Member

  # AC trigger — admin changes Account_Status to a CMDT-mapped value and the save succeeds.
  # This proves the Salesforce-side UI path that produces the value MuleSoft will translate via CMDT.
  @SF-593 @SF-593-UI-001 @p2 @smoke @ui-status-change
  Scenario: UI - Admin changes Account_Status to Offboarded and Save succeeds
    When I navigate to the Account record
    And I click Edit on the Account
    And I set "Account_Status__c" to "Offboarded"
    And I save the record
    Then the "Account Status" field should display "Offboarded"
    And I take a screenshot as evidence

  # Round-trip — UI sets value → CMDT resolve uses the UI target status (same as API-007 when
  # qamerge governance blocks persisting Account_Status__c after save).
  @SF-593 @SF-593-UI-002 @p2 @ui-api-roundtrip
  Scenario: UI - Account_Status Offboarded set via UI is resolvable via Dataverse_Mapping__mdt
    When I navigate to the Account record
    And I click Edit on the Account
    And I set "Account_Status__c" to "Offboarded"
    And I save the record
    Then the "Account Status" field should display "Offboarded"
    And I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access
    When I resolve Dataverse IDs for the created Account's Account_Status__c via CMDT
    Then the resolved Dataverse IDs should include
      | Dataverse_Field__c        |
      | accelins_party.statecode  |
      | accelins_party.statuscode |
