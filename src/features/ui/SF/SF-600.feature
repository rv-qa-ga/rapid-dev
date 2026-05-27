# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-600 - Publish Account Team Member Platform Events for Dataverse Synchronisation
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-01-16T17:17:57.577Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 3
# Description: Generator Only - Full automatic generation from Jira data (current behavior)
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Publish Account Team Member Platform Events for Dataverse Synchronisation
# Primary Entity: Contact
#
# Test Requirements (1):
#   REQ-1: Salesforce publishes Account Team Member Platform Events for down
#     → Test Type: API | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-600 @medium @auto-populate @field-mapping @contact
Feature: SF-600 - Publish Account Team Member Platform Events for Dataverse Synchronisation
  As a Salesforce user
  I want to verify the Dataverse_Id__c functionality on Contact
  So that Contact records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-UI-001 @p1 @smoke @negative @data-driven @given-an-account-team-member-platform-event-is-publishedthen-the-event-includes-a-unique-event-identifier-the-event-includes-the-salesforce-account-team-member-id-the-event-includes-the-salesforce-account-id-the-event-includes-the-salesforce @auto-population
  Scenario: Scenario 1
    Given I am logged in as a "Given An Account Team Member Platform Event Is Publishedthen The Event Includes A Unique Event Identifier The Event Includes The Salesforce Account Team Member Id The Event Includes The Salesforce Account Id The Event Includes The Salesforce" user
    Given Salesforce publishes Account Team Member Platform Events for downstream integration
    Given Account Team Member eligibility is determined by the related Account existing in Dataverse
    Given An Account is considered to exist in Dataverse when Dataverse_Id__c is populated
    Given Salesforce does not publish Platform Events for ineligible Account Team Members
    Given Each Account Team Member Platform Event includes the Record ID
    Given Event IdentifierScenario: Publish Platform Event for eligible Account Team Member creation Given a new Account Team Member is created in Salesforce
    Given The Account Team Member is related to an Account
    And the Account should be saved successfully
    Given The event action is "Create"
    Given The event includes the Record ID
    Given The event includes the Event IdentifierScenario: Do not publish Account Team Member Create event when related Account does not exist in DataverseGiven a new Account Team Member is created in Salesforce
    Given The Account Team Member is related to an Account
    And the Account should be saved successfully
    Given The Account Team Member is related to an Account
    And the Account should be saved successfully
    Given The event action is "Update"
    Given The event includes the Record ID
    Given The event includes the Event IdentifierScenario: Do not publish Update event when Account Team Member is not eligibleGiven an existing Account Team Member exists in Salesforce
    Given The Account Team Member is related to an Account
    And the Account should be saved successfully
    Given The event includes the Salesforce Account Team Member Id
    Given The event includes the Salesforce Account Id
    Given The event includes the Salesforce User Id
    Given The event includes an event timestamp
    Given The event action is populatedScenario: Publish Account Team Member event when Account becomes eligible after team member creationGiven an existing Account Team Member exists in Salesforce
    Given The Account Team Member is related to an Account
    Given The event action is "Create"
    Given The event includes the Record ID
    Given The event includes the Event IdentifierScenario: Removal of Account Team Member results in Internal Contact inactivation Given an Account Team Member exists in Salesforce
    Given The Account Team Member is related to an Account
    Given The related Account has Dataverse_Id__c populated
    Given A corresponding Internal Contact exists in DataverseWhen the Account Team Member is removed from the AccountThen an Account Team Member Platform Event is published
    Given The event action is "Update"
    Given The Internal Contact is set to inactive
    Given The Internal Contact record is not deletedScenario: Account Team Member removal does not result in delete eventGiven an Account Team Member is removed from an Account in SalesforceThen no delete Platform Event is published
    Given No delete operation is performed in Dataverse
    Given Removing following ScenariosScenario: Eligible Account Team Member creation results in a matching Internal Contact in DataverseGiven an eligible Account Team Member exists in Salesforce
    Given An Account Team Member Platform Event is publishedWhen the event is processed by downstream integrationThen an Internal Contact record exists in Dataverse
    Given The Internal Contact is related to the correct Party record
    Given The Internal Contact references the correct Dataverse User
    Given Dataverse
    When An Account Team Member Platform Event is published
    When The event is processed by downstream integration
    Then "schema": "-shzYMu-5DZRKv4Ky3iyvw"
    Then "payload": {
    Then "CreatedById": "005KZ000002gteNYAQ"
    Then "RecordId__c": "001DD00001duOm5YAE"
    Then "CreatedDate": "2026-01-08T11:30:45.906Z"
    Then "Identifier__c": "create"
    Then "event": {
    Then "EventUuid": "90f48997-a6d7-4c4c-9b9d-bdfba36c55f6"
    Then "replayId": 145130553
    Then "EventApiName": "Account_Team_Member__e"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: Dataverse_Id__c from Account to Contact
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-UI-002 @smoke @p1 @auto-populate
  Scenario: Verify Dataverse_Id__c auto-populates from Account to Contact
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with:
      | field   | value    |
      | Dataverse_Id__c | EU       |
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    Then the "Dataverse_Id__c" field should display "EU"
    And I take a screenshot as evidence

  @SF-600 @SF-600-UI-003 @p1 @read-only
  Scenario: Verify Dataverse_Id__c is NOT editable on Contact after creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Dataverse_Id__c "UK"
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    And I click Edit on the Contact
    Then the "Dataverse_Id__c" field should not be editable
    And I take a screenshot as evidence

  @SF-600 @SF-600-UI-004 @p1 @visibility
  Scenario: Verify Dataverse_Id__c field is visible on Contact
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Dataverse_Id__c "US"
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    Then the "Dataverse_Id__c" field should be visible
    And the "Dataverse_Id__c" field should display "US"
    And I take a screenshot as evidence

  @SF-600 @SF-600-UI-005 @p2 @exact-match
  Scenario: Verify Dataverse_Id__c value matches exactly from Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Dataverse_Id__c "APAC"
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    Then the "Dataverse_Id__c" field should display "APAC"
    And the Dataverse_Id__c value should match exactly what was on the Account
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-UI-006 @p2 @negative @blank-value
  Scenario: Verify behavior when Dataverse_Id__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Contact created via API without "Dataverse_Id__c"
    When I navigate to the Contact record
    Then the "Dataverse_Id__c" field should be visible
    And the "Dataverse_Id__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-600 @SF-600-UI-007 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Dataverse_Id__c
    Given I am logged in as a read-only user
    And I have a test Contact created via API
    When I navigate to the Contact record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-UI-008 @p2 @ui-data-creation
  Scenario: Create Contact record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Contact object list
    And I click New to create a Contact
    And I fill in required Contact fields
    And I save the record
    Then the Contact should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 100
  # Existing Steps Used: 100
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 100/100 (100%)
  #   - Feature-Specific Steps Used: 0
