# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-648 - Opportunity Summary Fields Executive Approval
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-behavior
# Generated: 2026-02-22T16:37:47.825Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# OPPORTUNITY SUMMARY CONTEXT (related stories):
#   SF-357: Opportunity Summary questionnaire (Opportunity Readiness); MRD completes fields, Submit for Approval.
#   SF-656: Approval routing by Member Operating Region; Executive Team approvers.
#   SF-648: Executive Approval on Opportunity; submission triggers approval; fields read-only until approved/returned.
#   SF-657: Approval outcomes (Approved / Rejected / Returned); stage progression to Due Diligence.
#   SF-658: Member Onboarding Questionnaire; questionnaire receipt task.
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
# Overview: Opportunity Summary Fields Executive Approval
# Primary Entity: Opportunity
#
# Fields Involved (1):
#   • Executive Approval (Executive_Approval__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "Executive Approval" behavior on Opportunity
#     → Test Type: BOTH | Priority: p2
#   REQ-2: Submitting the Opportunity Summary Fields for Executive ApprovalG
#     → Test Type: BOTH | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Opportunity Name
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-648 @medium @salesforce @field-behavior @read-only @opportunity
Feature: SF-648 - Opportunity Summary Fields Executive Approval
  As a Salesforce user
  I want to verify the Opportunity Summary functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am logged in as a "QA MRD User" user

  # ══════════════════════════════════════════════════════════════════════════
  # Submit for approval and approval request (links to SF-357, SF-656)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-648 @SF-648-UI-001 @p1 @smoke @opportunity-summary @executive-approval
  Scenario: Submitting Opportunity Summary Fields triggers Executive approval request
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    And all required Opportunity Summary fields on the questionnaire are populated
    When I open the Opportunity Readiness record from the Opportunity
    And I click "Submit for Approval" on the Opportunity Readiness record
    Then an approval request must be submitted
    And the approver must be the Executive Team for the Opportunity
    And the approval request must include the Opportunity name and link to the Opportunity
    And the Opportunity Summary fields become read-only until the approval is approved or returned for updates

  @SF-648 @SF-648-UI-002 @p1 @read-only @opportunity-summary
  Scenario: Opportunity Summary fields are read-only when approval is Pending
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity Summary fields approval has been submitted and is in status "Pending"
    When I open the Opportunity Readiness record from the Opportunity
    Then the Opportunity Summary fields must be read-only

  @SF-648 @SF-648-UI-003 @p1 @stage-validation @opportunity-summary
  Scenario: Opportunity cannot move to Due Diligence until Opportunity Summary is approved
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity Summary Fields are not Approved
    When a user attempts to change the Opportunity stage to "Due Diligence"
    Then the system must prevent the stage change
    And the system must display a message that Opportunity Summary Fields must be approved before moving to Due Diligence

  @SF-648 @SF-648-UI-004 @p1 @stage-progression @opportunity-summary
  Scenario: Once approved, Opportunity can progress to Due Diligence
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity Summary Fields are Approved
    When a user changes the Opportunity stage to "Due Diligence"
    Then the stage change must be allowed

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: Executive_Approval__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-648 @SF-648-UI-005 @smoke @p1 @read-only
  Scenario: Verify Executive_Approval__c is read-only on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Executive_Approval__c" field should not be editable
    And I take a screenshot as evidence

  @SF-648 @SF-648-UI-006 @p1 @negative
  Scenario: Verify user cannot modify Executive_Approval__c after Opportunity creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Executive_Approval__c" field should be read-only
    And attempting to edit the Executive_Approval__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-648 @SF-648-UI-007 @p2 @negative @blank-value
  Scenario: Verify behavior when Opportunity Summary is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Opportunity created via API without "Opportunity Summary"
    When I navigate to the Opportunity record
    Then the "Opportunity Summary" field should be visible
    And the "Opportunity Summary" field should be blank or empty
    And I take a screenshot as evidence

  @SF-648 @SF-648-UI-008 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Opportunity Summary
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Opportunity Summary" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-648 @SF-648-UI-009 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Opportunity Summary
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-648 @SF-648-UI-010 @p2 @ui-data-creation
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
  #   REQ-1: Verify "Executive Approval" behavior on Opportunity
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: Submitting the Opportunity Summary Fields for Executive ApprovalG
  #     → Should be tested via BOTH | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 41
  # Existing Steps Used: 41
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 41/41 (100%)
  #   - Feature-Specific Steps Used: 0
