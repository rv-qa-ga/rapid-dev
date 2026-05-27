# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-923 — Hidden Dataverse_ID__c on Product_Map__c
# Type: Story | RBT (Risk-Based Testing) — UI
#
# Layout visibility: standard and MRD users should not see Dataverse ID on the record.
# Validation copy ("Dataverse ID is system-managed…") is asserted in API feature SF-923 (API-004, API-005).
# Requires a Product_Map__c the acting user can open (seed in org).
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-923 @rbt @product-map @dataverse
Feature: UI - SF-923 - Product Map Dataverse ID layout visibility (RBT)

  @SF-923 @SF-923-UI-001 @p1 @rbt @standard-user
  Scenario: RBT UI-001 - Dataverse ID is not visible on Product Map (standard user)
    Given I have a valid Salesforce API token
    And a Product_Map__c record Id is resolved for SF-923 UI
    Given I am logged in as a "Standard User" user
    When I open the Product_Map__c record in Lightning for SF-923
    Then the Dataverse ID field must not be visible on the Product Map record page for SF-923
    And I take a screenshot as evidence

  @SF-923 @SF-923-UI-002 @p2 @rbt @mrd
  Scenario: RBT UI-002 - Dataverse ID is not visible on Product Map (QA MRD user)
    Given I have a valid Salesforce API token
    And a Product_Map__c record Id is resolved for SF-923 UI
    Given I am logged in as a "QA MRD User" user
    When I open the Product_Map__c record in Lightning for SF-923
    Then the Dataverse ID field must not be visible on the Product Map record page for SF-923
    And I take a screenshot as evidence

  @SF-923 @SF-923-UI-003 @p3 @rbt @manual
  Scenario: RBT UI-003 - Manual checklist - Scenario 1 layout and profile exclusions
    Given RBT SF-923 UI documentation is recorded
    Then Dataverse_ID__c must be excluded from all Product_Map__c page layouts per SF-923
    And Dataverse_ID__c must be hidden from standard profiles per SF-923
    And RBT SF-923 manual UI checklist evidence is attached
