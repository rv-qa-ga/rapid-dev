# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1159 — Functional Currency mappings (CMDT) + UI smoke
#
# UI-001: Setup → Custom Metadata Types → Dataverse Mapping manage records.
# UI-002: Create Agency Account via UI, then edit Functional Currency to USD and save.
#
# Reuses: authentication, ui-common (Account create / edit / save), sf-467 (field set), sf-529 (display).
# Steps: src/step-definitions/ui/salesforce/sf-1159-ui.steps.ts
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-1159 @account @party-integration @functional-currency
Feature: UI - SF-1159 - Functional Currency mappings (Setup CMDT + Account field)

  Background:
    Given I am logged in as a "Accelerant - System administrator" user

  @SF-1159 @SF-1159-UI-001 @p2 @smoke @custom-metadata-setup
  Scenario: UI - Dataverse Mapping CMDT lists functional_currency__c mappings for Account
    When I navigate to Salesforce Setup Custom Metadata Types page
    Then I should see the Salesforce Custom Metadata setup experience
    When I open Dataverse Mapping manage records from Custom Metadata Types
    Then I should see functional_currency__c mappings on the Dataverse Mapping records page
    And I take a screenshot as evidence

  @SF-1159 @SF-1159-UI-002 @p2 @functional-currency @ui-field-change
  Scenario: UI - Admin creates Agency Account and changes Functional Currency to USD
    When I navigate to the Account object list
    And I click New to create an Account
    And I select Account Type "Agency"
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    When I navigate to the Account record
    And I click Edit on the Account
    And I set "Functional_Currency__c" to "USD"
    And I save the record
    Then the "Functional Currency" field should display "USD"
    And I take a screenshot as evidence
