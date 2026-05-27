# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-603 - Make fields on the country object mandatory 
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2026-02-19T21:01:21.272Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - UI test cases generated; API optional (minimal 1-2 or skip)
# RBT: UI test cases generated; API optional (minimal 1-2 or skip).
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make fields on the country object mandatory 
# Primary Entity: Record
#
# Fields Involved (1):
#   • on the country object mandatory (on_the_country_object_mandatory__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "on the country object mandatory" behavior on Record
#     → Test Type: BOTH | Priority: p2
#   REQ-2: a Country record exists → I attempt to delete the Country recordT
#     → Test Type: API | Priority: p1
#
# Key Points:
#   • :check_mark: Successfully merged PR #142 from gs-pipeline/SF-603/Make-
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-603 @medium @salesforce
Feature: SF-603 - Make fields on the country object mandatory 
  As a Salesforce user
  I want to verify the should be marked as requiredScenario functionality on Record
  So that Record records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-603 @SF-603-UI-001 @p1 @smoke @negative @standard-user @validation-rule
  Scenario: Scenario 1
    Given I am logged in as a "Standard User" user
    Given A Country record exists
    When I attempt to delete the Country recordThen the delete action should be blocked
    When I should see a message "Country records cannot be deleted; use Active/Inactive status"
    When Also shall I convert the Country Master Id field to an auto number? Or do we need to do this through customisation?
    Then As its duplication of requirement?
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=d8a38189-a718-4839-be22-5ee8efff1d1bCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /Make-fields-on-the-country-object-mandatoryDifference TypeMetadata TypeNameNewFlowAccelerant_Record_Triggered_Flow_ATM_On_Delete_Block_DeletionNewCustom objectCountry
    Then :check_mark: Successfully merged PR #142 from gs-pipeline/SF-603/Make-fields-on-the-country-object-mandatory_-_QA into QA
    Then Blocked due to open questions in SF-575
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: should be marked as requiredScenario should NOT exist on Record
  # ══════════════════════════════════════════════════════════════════════════

  @SF-603 @SF-603-UI-002 @smoke @p1 @field-removal
  Scenario: Verify should be marked as requiredScenario field does NOT exist on Record
    Given I have an existing Record record
    When I navigate to the Record record
    Then the "should be marked as requiredScenario" field should not be visible
    And I take a screenshot as evidence

  @SF-603 @SF-603-UI-003 @p1 @field-removal
  Scenario: Verify should be marked as requiredScenario field is not available in edit mode
    Given I have an existing Record record
    When I navigate to the Record record
    And I click Edit on the Record
    Then the "should be marked as requiredScenario" field should not be visible
    And I take a screenshot as evidence

  @SF-603 @SF-603-UI-004 @p2 @field-removal
  Scenario: Verify should be marked as requiredScenario field is not present on Record detail page
    Given I have an existing Record record
    When I navigate to the Record record
    Then the "should be marked as requiredScenario" field should not be visible
    And I take a screenshot as evidence

  @SF-603 @SF-603-UI-005 @p2 @field-removal
  Scenario: Verify should be marked as requiredScenario field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Record record
    When I navigate to the Record record
    Then the "should be marked as requiredScenario" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: on_the_country_object_mandatory__c on Record
  # ══════════════════════════════════════════════════════════════════════════

  @SF-603 @SF-603-UI-006 @smoke @p1 @read-only
  Scenario: Verify on_the_country_object_mandatory__c is read-only on Record
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Record record
    When I navigate to the Record record
    And I click Edit on the Record
    Then the "on_the_country_object_mandatory__c" field should not be editable
    And I take a screenshot as evidence

  @SF-603 @SF-603-UI-007 @p1 @negative
  Scenario: Verify user cannot modify on_the_country_object_mandatory__c after Record creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Record record
    When I navigate to the Record record
    And I click Edit on the Record
    Then the "on_the_country_object_mandatory__c" field should be read-only
    And attempting to edit the on_the_country_object_mandatory__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-603 @SF-603-UI-008 @p2 @negative @blank-value
  Scenario: Verify behavior when should be marked as requiredScenario is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Record created via API without "should be marked as requiredScenario"
    When I navigate to the Record record
    Then the "should be marked as requiredScenario" field should be visible
    And the "should be marked as requiredScenario" field should be blank or empty
    And I take a screenshot as evidence

  @SF-603 @SF-603-UI-009 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify should be marked as requiredScenario
    Given I am logged in as a read-only user
    And I have a test Record created via API
    When I navigate to the Record record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-603 @SF-603-UI-010 @p2 @ui-data-creation
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
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: Verify "on the country object mandatory" behavior on Record
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 49
  # Existing Steps Used: 49
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 49/49 (100%)
  #   - Feature-Specific Steps Used: 0
