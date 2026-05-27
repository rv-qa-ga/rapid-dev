# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-787 - Product Map Platform Events — Dataverse / RDM E2E (phase 2)
# Tag @dataverse @wip until Dynamics entity and correlation confirmed on qamerge.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-787 @product-map @platform-events @dataverse @integration @wip @rbt
Feature: E2E - SF-787 - Product Map platform events to Dataverse Product Map rows
  As an integrator
  I want Product Map platform events to land correctly in RDM
  So that Salesforce-managed product maps match Dataverse state

  Background:
    Given I have a valid Salesforce API token
    And I have a valid Dynamics API connection

  @SF-787 @SF-787-E2E-001 @p2 @dataverse @e2e
  Scenario: API - E2E Create event results in Dataverse Product Map row correlated by Master ID
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given a Product_Map__c exists with Status "Draft" and no Dataverse ID for SF-787
    When the SF-787 Product Map is approved
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And a Dataverse Product Map row should exist for the SF-787 Product Map within 300 seconds
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-E2E-002 @p2 @dataverse @e2e
  Scenario: API - E2E Update event sets Dataverse Product Map status to match Salesforce Active or Inactive
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given an approved SF-787 Product_Map__c exists in RDM with a populated Dataverse ID
    When I update the SF-787 Product Map Status to "Active"
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the Dataverse Product Map status should match Salesforce Status for SF-787 within 300 seconds
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-E2E-003 @p2 @dataverse @e2e
  Scenario: API - E2E Inactive Update reuses same Dataverse Product Map row without duplicate create
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given a Product_Map__c exists with Status "Active" and a populated Dataverse ID for SF-787
    When I update the SF-787 Product Map Status to "Inactive"
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the same Dataverse Product Map row should be updated to Inactive for SF-787 within 300 seconds
    Given I unsubscribe from Product Map Platform Events
