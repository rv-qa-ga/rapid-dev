# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-647 - MOU Data fields - Item Completion
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2026-02-22T16:46:17.325Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# OPPORTUNITY SUMMARY / MOU CONTEXT (related work items):
#   SF-357: Opportunity Summary questionnaire (Opportunity Readiness); MRD completes fields, Submit for Approval.
#   SF-656: Region-based Executive approval routing and notifications.
#   SF-648: Opportunity Summary Fields Executive Approval; fields read-only until approved/returned.
#   SF-657: Handle Opportunity Summary approval outcomes; stage progression to Due Diligence.
#   SF-645: MOU Data fields - Complete Fields (visibility after Summary approval; US only).
#   SF-646: MOU Data fields - Generate Export (Word export when mandatory fields complete).
#   SF-647: MOU Data fields - Item Completion (mark MOU complete after SharePoint upload; US).
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
# Overview: MOU Data fields - Item Completion
# Primary Entity: Opportunity
#
# Fields Involved (1):
#   • - Item Completion (-_Item_Completion__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "- Item Completion" behavior on Opportunity
#     → Test Type: BOTH | Priority: p2
#   REQ-2: The MOU Data fields has been uploaded to sharepont  (this scenari
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
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-647 @medium @salesforce @opportunity
Feature: SF-647 - MOU Data fields - Item Completion
  As an MRD
  I want to mark the MOU Data fields item as complete after uploading the MOU document to SharePoint (US members)
  So that the Opportunity can progress to Due Diligence when the MOU item is complete

  Background:
    Given I am logged in as a "QA MRD User" user

  # ══════════════════════════════════════════════════════════════════════════
  # MOU Item Completion (RBT - links to SF-357, SF-648, SF-646)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-647 @SF-647-UI-001 @p1 @smoke @mou @item-completion
  Scenario: MRD can mark MOU Data fields item complete after upload (US; SharePoint deferred)
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity is associated with a US member (Distribution_Region__c = US)
    And the Opportunity Summary Fields have been Approved
    And the MRD has exported the MOU Data fields to a Word document and uploaded it to SharePoint
    When the MRD marks the "MOU Data Fields" item as complete on the Opportunity
    Then the MOU Data fields item is marked complete
    And I take a screenshot as evidence

  @SF-647 @SF-647-UI-002 @p1 @mou @stage-progression
  Scenario: Opportunity can move to Due Diligence when MOU Data fields item is complete
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity is associated with a US member (Distribution_Region__c = US)
    And the Opportunity Summary Fields have been Approved
    And the MOU Data fields item has been completed
    When a user changes the Opportunity stage to "Due Diligence"
    Then the stage change must be allowed
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: Region__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-647 @SF-647-UI-003 @smoke @p1 @admin
  Scenario: Verify admin user can access Region__c
    Given I am logged in as an admin user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Region__c" field should be visible
    And I take a screenshot as evidence

  @SF-647 @SF-647-UI-004 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access Region__c
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Region__c" field should not be visible
    And I take a screenshot as evidence

  @SF-647 @SF-647-UI-005 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit Region__c
    Given I am logged in as a read-only user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: -_Item_Completion__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-647 @SF-647-UI-006 @smoke @p1 @read-only
  Scenario: Verify -_Item_Completion__c is read-only on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "-_Item_Completion__c" field should not be editable
    And I take a screenshot as evidence

  @SF-647 @SF-647-UI-007 @p1 @negative
  Scenario: Verify user cannot modify -_Item_Completion__c after Opportunity creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "-_Item_Completion__c" field should be read-only
    And attempting to edit the -_Item_Completion__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-647 @SF-647-UI-008 @p2 @negative @blank-value
  Scenario: Verify behavior when Region__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Opportunity created via API without "Region__c"
    When I navigate to the Opportunity record
    Then the "Region__c" field should be visible
    And the "Region__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-647 @SF-647-UI-009 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Region__c
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Region__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-647 @SF-647-UI-010 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Region__c
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-647 @SF-647-UI-011 @p2 @ui-data-creation
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
  #   REQ-1: Verify "- Item Completion" behavior on Opportunity
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: The MOU Data fields has been uploaded to sharepont  (this scenari
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
