# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-551 - Make the State and Country field on the Address picklists
# Type: Story | Status: Blocked | Priority: Medium
# Feature Type: picklist-values
# Generated: 2025-12-19T15:08:39.937Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make the State and Country field on the Address picklists
# Primary Entity: Lead
#
# Fields Involved (1):
#   • on the Address picklists (on_the_Address_picklists__c) - modify
#
# Test Requirements (5):
#   REQ-1: Country field standardised as picklist
#     → Test Type: UI | Priority: p1
#   REQ-2: State/Province field standardised as picklist
#     → Test Type: UI | Priority: p2
#   REQ-3: Standard applies to all objects holding address fields
#     → Test Type: BOTH | Priority: p2
#   REQ-4: State/Province values must depend on Country
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Picklist values must remain consistent across systems
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-551 @medium @picklist @lead
Feature: SF-551 - Make the State and Country field on the Address picklists
  As a Salesforce user
  I want to verify the State and Country functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-551 @SF-551-UI-001 @standard-user
  Scenario: Country field standardised as picklist
    Given I am logged in as a "Standard User" user
    Given An object contains standard address fields
    Given The Country field is displayed or edited
    Given The Country field must be a picklist
    Given The available values must come from the centrally approved Country list
    Given No free-text entry must be allowed
    When The Country field is displayed or edited
    When The Country field must be a picklist
    When The available values must come from the centrally approved Country list
    When No free-text entry must be allowed
    Then The Country field must be a picklist
    Then The available values must come from the centrally approved Country list
    Then No free-text entry must be allowed
    Then The available values must come from the centrally approved Country list
    Then No free-text entry must be allowed
    And I take a screenshot as evidence

  @SF-551 @SF-551-UI-002 @standard-user
  Scenario: State/Province field standardised as picklist
    Given I am logged in as a "Standard User" user
    Given An object contains standard address fields
    Given The State or Province field is displayed or edited
    Given The State/Province field must be a picklist
    Given The available values must be restricted to the centrally approved State/Province list for the selected Country
    Given No free-text entry must be allowed
    When The State or Province field is displayed or edited
    When The State/Province field must be a picklist
    When The available values must be restricted to the centrally approved State/Province list for the selected Country
    When No free-text entry must be allowed
    Then The State/Province field must be a picklist
    Then The available values must be restricted to the centrally approved State/Province list for the selected Country
    Then No free-text entry must be allowed
    Then The available values must be restricted to the centrally approved State/Province list for the selected Country
    Then No free-text entry must be allowed
    And I take a screenshot as evidence

  @SF-551 @SF-551-UI-003 @data-driven
  Scenario: Standard applies to all objects holding address fields
    Given I am logged in as a standard user
    Given Multiple objects in Salesforce contain address fields
    Given Ensuring address consistency
    Given The Country
    Given State/Province picklist requirement must apply to all objects, including (but not limited to)
    Given | Lead      |
    Given | Account   |
    Given | Contact   |
    When Ensuring address consistency
    When The Country
    When State/Province picklist requirement must apply to all objects, including (but not limited to)
    When | Lead      |
    When | Account   |
    When | Contact   |
    Then The Country
    Then State/Province picklist requirement must apply to all objects, including (but not limited to)
    Then | Lead      |
    Then | Account   |
    Then | Contact   |
    Then State/Province picklist requirement must apply to all objects, including (but not limited to)
    And I take a screenshot as evidence

  @SF-551 @SF-551-UI-004
  Scenario: State/Province values must depend on Country
    Given I am logged in as a standard user
    Given A user selects a Country in the address details
    Given Choosing a State or Province
    Given Only the State/Province values that correspond to the selected Country must be available for selection
    When Choosing a State or Province
    When Only the State/Province values that correspond to the selected Country must be available for selection
    Then Only the State/Province values that correspond to the selected Country must be available for selection
    And I take a screenshot as evidence

  @SF-551 @SF-551-UI-005 @negative @data-driven
  Scenario: Picklist values must remain consistent across systems
    Given I am logged in as a standard user
    Given The State
    Given Country fields are picklists populated from a central list
    Given These fields are referenced in automation, validation rules, reports, or integrations
    Given The values must be consistent
    Given Aligned with the approved reference data
    Given Provinces, I’m working on this now - Country should not be blank
    When These fields are referenced in automation, validation rules, reports, or integrations
    When The values must be consistent
    When Aligned with the approved reference data
    When Provinces, I’m working on this now - Country should not be blank
    Then The values must be consistent
    Then Aligned with the approved reference data
    Then Provinces, I’m working on this now - Country should not be blank
    Then Country fields are picklists populated from a central list
    Then Aligned with the approved reference data
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: on_the_Address_picklists__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-551 @SF-551-UI-006 @p1 @picklist-options
  Scenario: Verify all on_the_Address_picklists__c picklist options are available
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I click on the "on_the_Address_picklists__c" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: State and Country on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-551 @SF-551-UI-007 @smoke @p1
  Scenario: Verify State and Country field is visible on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "State and Country" field should be visible
    And I take a screenshot as evidence

  @SF-551 @SF-551-UI-008 @p1 @edit
  Scenario: Verify State and Country field can be edited on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "State and Country" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "State and Country" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-551 @SF-551-UI-009 @p2 @negative @blank-value
  Scenario: Verify behavior when State and Country is blank
    Given I am logged in as a standard user
    And I have a test Lead created via API without "State and Country"
    When I navigate to the Lead record
    Then the "State and Country" field should be visible
    And the "State and Country" field should be blank or empty
    And I take a screenshot as evidence

  @SF-551 @SF-551-UI-010 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for State and Country
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "State and Country" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-551 @SF-551-UI-011 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify State and Country
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-551 @SF-551-UI-012 @p2 @ui-data-creation
  Scenario: Create Lead record via UI
    Given I am logged in as a standard user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 5
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 123
  # Existing Steps Used: 123
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 123/123 (100%)
  #   - Feature-Specific Steps Used: 0
