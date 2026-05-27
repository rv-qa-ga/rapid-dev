# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-874 - Opportunity Readiness - Summary and MOU Fields Change
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-02-28T11:03:36.576Z (FeatureGenerator v3.1)
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
# Overview: BACKGROUNDThe opportunity summary fields AND the MOU detail fields need to be surfaced, completed and submitted for approval at the same time.
# Primary Entity: Task
#
# Fields Involved (1):
#   • Change (Change__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "Change" behavior on Task
#     → Test Type: BOTH | Priority: p2
#   REQ-2: GIVEN a US based Opportunity Record is created AND type is update
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

@ui @salesforce @SF-874 @medium @salesforce @field-visibility @task
Feature: SF-874 - Opportunity Readiness - Summary and MOU Fields Change
  As a Salesforce user
  I want to verify the Opportunity_Readiness__c functionality on Task
  So that Task records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-874 @SF-874-UI-001 @p1 @smoke @positive @field-visibility @update @visibility @read-only
  Scenario: GIVEN a US based Opportunity Record is created AND type is updated to New BusinessWHEN the subsequent Opportunity Readiness record is created THEN I want to be able to see and complete all of the Opportunity Summary fields AND the MOU Detail fields at the same timeAC2:GIVEN an MRD User has completed all required Opportunity Summary fieldsWHEN the user submits the opportunity readiness record for approvalTHEN the entire opportunity readiness record (opportunity summary fields and MOU detai fields) is submitted for approvalAC3:GIVEN an MRD User has submitted the entire opportunity readiness record for approvalWHEN it has not yet been approved or rejectedTHEN the MRD user should be able to edit any of the fields on that opportunity readiness recordAND the readiness record should always remain editable, even after approvalAC4:GIVEN the opportunity readiness record has been submittedWHEN the record is approvedTHEN the user should be able to progress the related US-based Opportunity record to Due Diligence stageAC5:GIVEN the opportunity readiness record has been submittedWHEN the record is rejectedTHEN the user should not be able to progress the US-based Opportunity record to Due Diligence stageAND the user must re-submit the opportunity readiness record if they wish to progress the US-based Opportunity record to Due Diligence stage and beyondAC6:GIVEN An opportunity readiness record has been approvedWHEN A user decides to edit that record THEN the record should be editableAND no other approvals or validations should be triggeredAND the parent opportunity record stage should not be impactedAND the document can be generated with updated field valuesTECHNICAL NOTESThis is for US-based Opportunity records onlyThe page layout and fields of the Opportunity Readiness record remains unchanged, except for the fact that both the opportunity summary fields page section and the MOU Details page section should always be visible at the same timeThe simplification of the approval process is covered in another storyMOU document generation and all other validation rules regarding mandatory fields and stage progression should remain unchangedOnce a readiness record has been approved, the summary fields and MOU fields should remain editable and any subsequent approvals after the first system approval will be done off-systemNo validations, automations and triggers should fire after the second/subsequent round of edits
    Given I am logged in as a "Accelerant - System administrator" user
    Then DEV: 3QA: 1
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=da03216e-046e-49d1-9e61-4c5b8109980bCommit notes: Opportunity Summary Approval UpdatesSource: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I click Edit on the Opportunity
    Then :check_mark: Successfully merged PR #303 from gs-pipeline/SF-874/Opportunity-Readiness-Summary-and-MOU-Fields-Change_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 1 field(s) on Task
  # ══════════════════════════════════════════════════════════════════════════

  @SF-874 @SF-874-UI-002 @smoke @p1 @admin
  Scenario: Verify "Change__c" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Task object list
    And I click New to create a Task
    Then the "Change__c" field should be visible
    And I take a screenshot as evidence

  @SF-874 @SF-874-UI-003 @p2 @edit-form
  Scenario: Verify "Change__c" is visible on Task edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Task record
    When I navigate to the Task record
    And I click Edit on the Task
    Then the "Change__c" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: Opportunity_Readiness__c on Task
  # ══════════════════════════════════════════════════════════════════════════

  @SF-874 @SF-874-UI-004 @smoke @p1 @read-only
  Scenario: Verify Opportunity_Readiness__c is read-only on Task
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Task record
    When I navigate to the Task record
    And I click Edit on the Task
    Then the "Opportunity_Readiness__c" field should not be editable
    And I take a screenshot as evidence

  @SF-874 @SF-874-UI-005 @p1 @negative
  Scenario: Verify user cannot modify Opportunity_Readiness__c after Task creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Task record
    When I navigate to the Task record
    And I click Edit on the Task
    Then the "Opportunity_Readiness__c" field should be read-only
    And attempting to edit the Opportunity_Readiness__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-874 @SF-874-UI-006 @p2 @negative @blank-value
  Scenario: Verify behavior when Opportunity_Readiness__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Task created via API without "Opportunity_Readiness__c"
    When I navigate to the Task record
    Then the "Opportunity_Readiness__c" field should be visible
    And the "Opportunity_Readiness__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-874 @SF-874-UI-007 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Opportunity_Readiness__c
    Given I am logged in as a read-only user
    And I have a test Task created via API
    When I navigate to the Task record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-874 @SF-874-UI-008 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Opportunity_Readiness__c
    Given I am logged in as a standard user
    And I have a test Task created via API
    When I navigate to the Task record
    Then the "Opportunity_Readiness__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-874 @SF-874-UI-009 @p2 @ui-data-creation
  Scenario: Create Task record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Task object list
    And I click New to create a Task
    And I fill in required Task fields
    And I save the record
    Then the Task should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: Verify "Change" behavior on Task
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 47
  # Existing Steps Used: 47
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 47/47 (100%)
  #   - Feature-Specific Steps Used: 0
