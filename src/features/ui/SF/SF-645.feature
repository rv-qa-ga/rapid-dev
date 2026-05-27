# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-645 - MOU Data fields - Complete Fields
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-22T16:46:19.274Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# OPPORTUNITY SUMMARY / MOU CONTEXT (related work items):
#   SF-357: Opportunity Summary questionnaire; SF-656: Executive approval routing; SF-648: Executive Approval.
#   SF-657: Approval outcomes; SF-645: MOU Complete Fields; SF-646: MOU Generate Export; SF-647: MOU Item Completion.
#   Field list: data/excel/Opportunity Summary Fields (1).xlsx
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
# Overview: MOU Data fields - Complete Fields
# Primary Entity: Opportunity
#
# Fields Involved (1):
#   • - Complete Fields (-_Complete_Fields__c) - modify
#
# Test Requirements (3):
#   REQ-1: Verify "- Complete Fields" behavior on Opportunity
#     → Test Type: BOTH | Priority: p2
#   REQ-2: MOU Data fields only become available after Opportunity Summary F
#     → Test Type: BOTH | Priority: p1
#   REQ-3: f92-bc94-b9b92f602310Commit notes: MOU Data fields and related au
#     → Test Type: API | Priority: p2
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

@ui @salesforce @SF-645 @medium @salesforce @field-visibility @opportunity
Feature: SF-645 - MOU Data fields - Complete Fields
  As an MRD
  I want the MOU Data fields item to be available only after Opportunity Summary is submitted (US) and hidden for non-US / non-New-Business
  So that MOU completion is required only where applicable

  Background:
    Given I am logged in as a "QA MRD User" user

  # ══════════════════════════════════════════════════════════════════════════
  # MOU Complete Fields - visibility after Opportunity Summary approval (RBT)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-645 @SF-645-UI-001 @p1 @smoke @mou @visibility @us-only
  Scenario: MOU Data fields item is available after Opportunity Summary submitted (US)
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity is associated with a US member (Distribution_Region__c = US)
    And the Opportunity Summary Fields approval status is "Pending"
    When the MRD opens the Opportunity Readiness record from the Opportunity
    Then the "MOU Data fields" item must be available to be completed
    And I take a screenshot as evidence

  @SF-645 @SF-645-UI-002 @p1 @mou @visibility @non-us
  Scenario: MOU Data fields item is hidden for non-US members
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity is NOT associated with a US member
    When the MRD opens the Opportunity Readiness record from the Opportunity
    Then the "MOU Data fields" item must be hidden
    And must not block progression to Due Diligence
    And I take a screenshot as evidence

  @SF-645 @SF-645-UI-003 @p1 @mou @visibility @new-business-only
  Scenario: MOU Data fields item is hidden for non-New-Business Opportunities
    Given an Opportunity exists in stage "Pipeline" and Type is NOT "New Business"
    When the MRD opens the Opportunity Readiness record from the Opportunity
    Then the "MOU Data fields" item must be hidden
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 1 field(s) on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-645 @SF-645-UI-004 @smoke @p1 @admin
  Scenario: Verify "Distribution_Region__c" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    Then the "Distribution_Region__c" field should be visible
    And I take a screenshot as evidence

  @SF-645 @SF-645-UI-005 @p2 @edit-form
  Scenario: Verify "Distribution_Region__c" is visible on Opportunity edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Distribution_Region__c" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: -_Complete_Fields__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-645 @SF-645-UI-006 @smoke @p1 @read-only
  Scenario: Verify -_Complete_Fields__c is read-only on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "-_Complete_Fields__c" field should not be editable
    And I take a screenshot as evidence

  @SF-645 @SF-645-UI-007 @p1 @negative
  Scenario: Verify user cannot modify -_Complete_Fields__c after Opportunity creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "-_Complete_Fields__c" field should be read-only
    And attempting to edit the -_Complete_Fields__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-645 @SF-645-UI-008 @p2 @negative @blank-value
  Scenario: Verify behavior when Distribution_Region__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Opportunity created via API without "Distribution_Region__c"
    When I navigate to the Opportunity record
    Then the "Distribution_Region__c" field should be visible
    And the "Distribution_Region__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-645 @SF-645-UI-009 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Distribution_Region__c
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Distribution_Region__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-645 @SF-645-UI-010 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Distribution_Region__c
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-645 @SF-645-UI-011 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Distribution_Region__c
    Given I am logged in as a standard user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the "Distribution_Region__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-645 @SF-645-UI-012 @p2 @ui-data-creation
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
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify "- Complete Fields" behavior on Opportunity
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: MOU Data fields only become available after Opportunity Summary F
  #     → Should be tested via BOTH | Priority: p1


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
