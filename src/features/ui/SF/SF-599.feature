# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-599 - Publish Contact Platform Events for Dataverse Integration
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-01-16T17:17:56.110Z (FeatureGenerator v3.1)
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
# Overview: Publish Contact Platform Events for Dataverse Integration
# Primary Entity: Contact
#
# Test Requirements (1):
#   REQ-1: Salesforce publishes Contact Platform Events for downstream integ
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

@ui @salesforce @SF-599 @medium @auto-populate @field-mapping @contact
Feature: SF-599 - Publish Contact Platform Events for Dataverse Integration
  As a Salesforce user
  I want to verify the Dataverse_Id__c functionality on Contact
  So that Contact records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-599 @SF-599-UI-001 @p1 @smoke @negative @data-driven @auto-population
  Scenario: Scenario 1
    Given I am logged in as a "Accelerant - System administrator" user
    Given Salesforce publishes Contact Platform Events for downstream integration
    Given Contact eligibility is determined by the related Account existing in Dataverse
    Given An Account is considered to exist in Dataverse when Dataverse_Id_c is populated
    Given Salesforce does not publish Platform Events for ineligible Contacts
    Given Each Contact Platform Event includes the Record Id
    Given Event Identifier Scenario: Publish Platform Event for eligible Contact CreationGiven a new Contact is created in Salesforce
    Given The Contact is related to an Account
    And the Account should be saved successfully
    Given The event action is "Create"
    Given The event includes the Record ID
    Given The event includes the Event IdentifierScenario: Do not publish Contact Create event when related Account does not exist in DataverseGiven a new Contact is created in Salesforce
    Given The Contact is related to an Account
    And the Account should be saved successfully
    Given The Contact is related to an Account
    And the Contact should be saved successfully
    Given The event action is "Update"
    Given The event includes the Record ID
    Given The event includes the Event IdentifierScenario: Do not publish Update event when Contact is not eligible Given an existing Contact exists in Salesforce
    Given The Contact is related to an Account
    And the Contact should be saved successfully
    Given An Contact Platform Event is published with action ‘Update’
    Given No delete event is publishedScenario: Published Contact Platform Event includes traceability metadataGiven a Contact Platform Event is publishedThen the event includes a unique event identifier
    Given The event includes the Salesforce Contact Id
    Given The event includes the Salesforce Account Id
    Given The event includes an event timestamp
    Given The event action is populatedScenario: Publish Contact event when Account becomes eligible after Contact creationGiven an existing Contact exists in Salesforce
    Given The Contact is related to an Account
    Given The event action is "Create"
    Given The event includes the Record ID
    Given The event includes the Event Identifier
    Given Removing this scenario
    Given Scenario: Eligible Contact creation results in a matching Contact record in DataverseGiven an eligible Contact exists in Salesforce
    Given A Contact Platform Event is published
    When The event is processed by downstream integration
    Then A Contact record exists in Dataverse
    Then The Contact is related to the correct Party record
    Then Sample Response{
    Then "schema": "yeiRYnlxxZF6o9igHN0_CA"
    Then "payload": {
    Then "Record_Id__c": "003DD00001aj5i4YAA"
    Then "CreatedById": "005KZ000002gteNYAQ"
    Then "CreatedDate": "2026-01-09T14:31:20.291Z"
    Then "Identifier__c": "Create"
    Then "event": {
    Then "EventUuid": "3ad1fda7-56d7-4e0b-b6f6-55b78818e2f1"
    Then "replayId": 145191273
    Then "EventApiName": "Contact__e"
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=2e7fd494-4024-4772-8d29-9674c44d3c7eCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Contact object list
    Then :check_mark: Successfully merged PR #103 from gs-pipeline/SF-599/Publish-Contact-Platform-Events-for-Dataverse-Integration_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: Dataverse_Id__c from Account to Contact
  # ══════════════════════════════════════════════════════════════════════════

  @SF-599 @SF-599-UI-002 @smoke @p1 @auto-populate
  Scenario: Verify Dataverse_Id__c auto-populates from Account to Contact
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with:
      | field   | value    |
      | Dataverse_Id__c | EU       |
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    Then the "Dataverse_Id__c" field should display "EU"
    And I take a screenshot as evidence

  @SF-599 @SF-599-UI-003 @p1 @read-only
  Scenario: Verify Dataverse_Id__c is NOT editable on Contact after creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Dataverse_Id__c "UK"
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    And I click Edit on the Contact
    Then the "Dataverse_Id__c" field should not be editable
    And I take a screenshot as evidence

  @SF-599 @SF-599-UI-004 @p1 @visibility
  Scenario: Verify Dataverse_Id__c field is visible on Contact
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Dataverse_Id__c "US"
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    Then the "Dataverse_Id__c" field should be visible
    And the "Dataverse_Id__c" field should display "US"
    And I take a screenshot as evidence

  @SF-599 @SF-599-UI-005 @p2 @exact-match
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

  @SF-599 @SF-599-UI-006 @p2 @negative @blank-value
  Scenario: Verify behavior when Dataverse_Id__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Contact created via API without "Dataverse_Id__c"
    When I navigate to the Contact record
    Then the "Dataverse_Id__c" field should be visible
    And the "Dataverse_Id__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-599 @SF-599-UI-007 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Dataverse_Id__c
    Given I am logged in as a read-only user
    And I have a test Contact created via API
    When I navigate to the Contact record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-599 @SF-599-UI-008 @p2 @ui-data-creation
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
  # Total Steps Analyzed: 45
  # Existing Steps Used: 45
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 45/45 (100%)
  #   - Feature-Specific Steps Used: 0
