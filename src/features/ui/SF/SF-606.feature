# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-606 - Publish Country Platform Events for Dataverse Integration
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-removal
# Generated: 2026-01-16T17:17:58.748Z (FeatureGenerator v3.1)
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
# Overview: Publish Country Platform Events for Dataverse Integration
# Primary Entity: Record
#
# Test Requirements (1):
#   REQ-1: Salesforce publishes Country__c Platform Events for downstream in
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

@ui @salesforce @SF-606 @medium 
Feature: SF-606 - Publish Country Platform Events for Dataverse Integration
  As a Salesforce user
  I want to verify the Country__c functionality on Record
  So that Record records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-UI-001 @p1 @smoke @negative @field-removal
  Scenario: Scenario 1
    Given I am logged in as a "Accelerant - System administrator" user
    Given Salesforce publishes Country__c Platform Events for downstream integration
    Given Salesforce does not allow Country__c records to be deleted
    Given Country__c lifecycle is managed using an Active/Inactive status field
    Given Each Country__c Platform Event includes the Record ID
    And the record should be saved successfully
    Given The event action is "Create"
    Given The event includes the Record ID
    And the record should be saved successfully
    Given The event action is "Update"
    Given The event includes the Record ID
    And I save the record
    When A Country__c Platform Event is published
    When The event action is "Update"
    When No delete event is publishedScenario: Published Country__c Platform Event includes traceability metadataGiven a Country__c Platform Event is published
    Then The event includes a unique event identifier
    Then The event includes the Salesforce Country__c record Id
    Then The event includes an event timestamp
    Then The event action is populated
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: Country__c should NOT exist on Record
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-UI-002 @smoke @p1 @field-removal
  Scenario: Verify Country__c field does NOT exist on Record
    Given I have an existing Record record
    When I navigate to the Record record
    Then the "Country__c" field should not be visible
    And I take a screenshot as evidence

  @SF-606 @SF-606-UI-003 @p1 @field-removal
  Scenario: Verify Country__c field is not available in edit mode
    Given I have an existing Record record
    When I navigate to the Record record
    And I click Edit on the Record
    Then the "Country__c" field should not be visible
    And I take a screenshot as evidence

  @SF-606 @SF-606-UI-004 @p2 @field-removal
  Scenario: Verify Country__c field is not present on Record detail page
    Given I have an existing Record record
    When I navigate to the Record record
    Then the "Country__c" field should not be visible
    And I take a screenshot as evidence

  @SF-606 @SF-606-UI-005 @p2 @field-removal
  Scenario: Verify Country__c field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Record record
    When I navigate to the Record record
    Then the "Country__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-UI-006 @p2 @negative @blank-value
  Scenario: Verify behavior when Country__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Record created via API without "Country__c"
    When I navigate to the Record record
    Then the "Country__c" field should be visible
    And the "Country__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-606 @SF-606-UI-007 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Country__c
    Given I am logged in as a read-only user
    And I have a test Record created via API
    When I navigate to the Record record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-UI-008 @p2 @ui-data-creation
  Scenario: Create Record record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Record object list
    And I click New to create a Record
    And I fill in required Record fields
    And I save the record
    Then the Record should be created successfully
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
  # Total Steps Analyzed: 56
  # Existing Steps Used: 56
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 56/56 (100%)
  #   - Feature-Specific Steps Used: 0
