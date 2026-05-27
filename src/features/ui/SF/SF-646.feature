# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-646 - MOU Data fields- Generate Export
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-22T16:46:21.234Z (FeatureGenerator v3.1)
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
# Overview: MOU Data fields- Generate Export
# Primary Entity: Opportunity
#
# Test Requirements (1):
#   REQ-1: The MOU Data fields have been completedGiven an Opportunity is in
#     → Test Type: UI | Priority: p1
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

@ui @salesforce @SF-646 @medium @salesforce @field-visibility @opportunity
Feature: SF-646 - MOU Data fields- Generate Export
  As an MRD
  I want to export the MOU Data fields to a Word document when mandatory fields are complete (US, New Business)
  So that the exported document is available for download and the MOU item can later be marked complete (SF-647)

  Background:
    Given I am logged in as a "QA MRD User" user

  # ══════════════════════════════════════════════════════════════════════════
  # MOU Generate Export (RBT - links to SF-645, SF-647)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-646 @SF-646-UI-001 @p1 @smoke @mou @export
  Scenario: MRD can export MOU Data fields when all mandatory fields are complete
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity is associated with a US member (Region__c = US)
    And all mandatory MOU Data fields have been completed
    When the MRD exports the MOU Data fields from the Opportunity
    Then the system generates a Word document with the exported MOU Data fields
    And the document is available for the MRD to download
    And I take a screenshot as evidence

  @SF-646 @SF-646-UI-002 @p1 @mou @export @validation
  Scenario: Export is blocked when mandatory MOU Data fields are not complete
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity is associated with a US member (Region__c = US)
    And one or more mandatory MOU Data fields are not completed
    When the MRD attempts to export the MOU Data fields
    Then the system must prevent the export
    And the system must display a message listing the missing fields
    And I take a screenshot as evidence

  @SF-646 @SF-646-UI-003 @p1 @mou @export @item-in-progress
  Scenario: Exporting MOU Data does not complete the MOU Data fields item
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity is associated with a US member (Region__c = US)
    And all mandatory MOU Data fields have been completed
    When the MRD exports the MOU Data fields
    Then the "MOU Data fields" item must remain In Progress
    And the Opportunity must be blocked from moving to stage "Due Diligence" until the item is marked complete
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 1 field(s) on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-646 @SF-646-UI-004 @smoke @p1 @admin
  Scenario: Verify "Region__c" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    Then the "Region__c" field should be visible
    And I take a screenshot as evidence

  @SF-646 @SF-646-UI-005 @p2 @edit-form
  Scenario: Verify "Region__c" is visible on Opportunity edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Region__c" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-646 @SF-646-UI-006 @p2 @negative @blank-value
  Scenario: Verify behavior when Region__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Opportunity created via API without "Region__c"
    When I navigate to the Opportunity record
    Then the "Region__c" field should be visible
    And the "Region__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-646 @SF-646-UI-007 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Region__c
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Region__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-646 @SF-646-UI-008 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Region__c
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-646 @SF-646-UI-009 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Region__c
    Given I am logged in as a standard user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the "Region__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-646 @SF-646-UI-010 @p2 @ui-data-creation
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
  #   REQ-1: The MOU Data fields have been completedGiven an Opportunity is in
  #     → Should be tested via UI | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 55
  # Existing Steps Used: 55
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 55/55 (100%)
  #   - Feature-Specific Steps Used: 0
