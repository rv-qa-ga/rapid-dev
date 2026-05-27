# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-730 - Govern regional fields on Opportunity during Lead conversion
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-24T17:08:21.491Z (FeatureGenerator v3.1)
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
# Overview: Govern regional fields on Opportunity during Lead conversion
# Primary Entity: Opportunity
#
# Fields Involved (1):
#   • on Opportunity during Lead conversion (on_Opportunity_during_Lead_conversion__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "on Opportunity during Lead conversion" behavior on Opport
#     → Test Type: BOTH | Priority: p2
#   REQ-2: UNSD Region on Lead is not mapped to OpportunityGiven a Lead cont
#     → Test Type: API | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-730 @medium @salesforce @field-visibility @opportunity
Feature: SF-730 - Govern regional fields on Opportunity during Lead conversion
  As a Salesforce user
  I want to verify the Country__c functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-730 @SF-730-UI-001 @p1 @smoke @positive @data-driven @field-visibility @update @read-only
  Scenario: UNSD Region on Lead is not mapped to OpportunityGiven a Lead contains a populated UNSD Region valueAnd that Lead is converted and an Opportunity is createdWhen the Lead is convertedThen the UNSD Region value from the Lead must not be mapped to any field on the OpportunityAnd no Opportunity field must store the Lead’s UNSD Region value as part of the conversionScenario 2: Distribution Region on Opportunity is derived from the related AccountGiven a Lead is converted and an Opportunity is createdAnd the Opportunity is related to an AccountAnd the Account has a populated Distribution Region field value derived from Country__cWhen the Opportunity record is created or updatedThen the Opportunity Distribution Region must be populated from the related Account’s Distribution RegionAnd the Opportunity must not derive Distribution Region directly from the LeadScenario 3: Distribution Region is not mapped directly from Lead to OpportunityGiven a Lead contains a populated Distribution Region valueWhen the Lead is convertedThen that Distribution Region value must not be directly mapped to the OpportunityAnd the Opportunity Distribution Region must instead reflect the value derived from the related AccountScenario 4: Update Opportunity Region field label to Distribution RegionGiven the Opportunity object contains a field currently labelled RegionWhen the field label is updatedThen the field label must be changed to Distribution RegionAnd the underlying API name must remain unchanged (Please check the effort to change API name)And help text on this field should state:“This field is automatically derived from the related Account’s Distribution Region and cannot be edited manually.”
    Given I am logged in as a "Accelerant - System administrator" user
    Then Dependencies to achieve logic for Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 1 field(s) on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-730 @SF-730-UI-002 @smoke @p1 @admin
  Scenario: Verify "Country__c" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    Then the "Country__c" field should be visible
    And I take a screenshot as evidence

  @SF-730 @SF-730-UI-003 @p2 @edit-form
  Scenario: Verify "Country__c" is visible on Opportunity edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Country__c" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: on_Opportunity_during_Lead_conversion__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-730 @SF-730-UI-004 @smoke @p1 @read-only
  Scenario: Verify on_Opportunity_during_Lead_conversion__c is read-only on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "on_Opportunity_during_Lead_conversion__c" field should not be editable
    And I take a screenshot as evidence

  @SF-730 @SF-730-UI-005 @p1 @negative
  Scenario: Verify user cannot modify on_Opportunity_during_Lead_conversion__c after Opportunity creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "on_Opportunity_during_Lead_conversion__c" field should be read-only
    And attempting to edit the on_Opportunity_during_Lead_conversion__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-730 @SF-730-UI-006 @p2 @negative @blank-value
  Scenario: Verify behavior when Country__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Opportunity created via API without "Country__c"
    When I navigate to the Opportunity record
    Then the "Country__c" field should be visible
    And the "Country__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-730 @SF-730-UI-007 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Country__c
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Country__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-730 @SF-730-UI-008 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Country__c
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-730 @SF-730-UI-009 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Country__c
    Given I am logged in as a standard user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the "Country__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-730 @SF-730-UI-010 @p2 @ui-data-creation
  Scenario: Create Opportunity record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    And I fill in required Opportunity fields
    And I save the record
    Then the Opportunity should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: Verify "on Opportunity during Lead conversion" behavior on Opport
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 53
  # Existing Steps Used: 53
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 53/53 (100%)
  #   - Feature-Specific Steps Used: 0
