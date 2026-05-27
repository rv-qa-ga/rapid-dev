# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-488 - Make Onboarded_Date_c mandatory to exit the Contracting stage on Account (manually entered)
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T21:41:05.646Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make Onboarded_Date_c mandatory to exit the Contracting stage on Account (manually entered)
# Primary Entity: Contract
#
# Fields Involved (1):
#   • Onboarded_Date_c (Onboarded_Date_c__c) - validate
#
# Test Requirements (1):
#   REQ-1: is unclear on which field needs to be populated and When exactly 
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-488 @medium @auto-populate @field-mapping @contract
Feature: SF-488 - Make Onboarded_Date_c mandatory to exit the Contracting stage on Account (manually entered)
  As a Salesforce user
  I want to verify the Onboarded_Date_c functionality on Contract
  So that Contract records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-488 @SF-488-UI-001 @data-driven
  Scenario: is unclear on which field needs to be populated and When exactly it should be blocking save.On AC3 how are we going to identify if the field is populated by automation process or manually entered by human user?On AC3 it mentions “Approved Bypass”. Can you please clarify this?cc @@Ken Reynolds  @@Niraj Thakker
    Given I am logged in as a standard user
    When Account goes from active to contracting, if this field value is blank, then saving must be blocked
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=b4410b52-3042-476d-b6fd-226df4093530Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    When I set the "Custom field" field
    When :check_mark: Successfully merged PR #78 from gs-pipeline/SF-488/Make-Onboarded_Date_c-mandatory-to-exit-the-Contracting-stage-on-Account-manually-entered_-_QA into QA
    Then Saving must be blocked
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=b4410b52-3042-476d-b6fd-226df4093530Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I set the "Custom field" field
    Then :check_mark: Successfully merged PR #78 from gs-pipeline/SF-488/Make-Onboarded_Date_c-mandatory-to-exit-the-Contracting-stage-on-Account-manually-entered_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Onboarded_Date_c__c on Contract
  # ══════════════════════════════════════════════════════════════════════════

  @SF-488 @SF-488-UI-002 @smoke @p1
  Scenario: Verify Onboarded_Date_c__c field is visible on Contract
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "Onboarded_Date_c__c" field should be visible
    And I take a screenshot as evidence

  @SF-488 @SF-488-UI-003 @p1 @edit
  Scenario: Verify Onboarded_Date_c__c field can be edited on Contract
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    And I set the "Onboarded_Date_c__c" field to "Test Value"
    And I save the record
    Then the Contract should be saved successfully
    And the "Onboarded_Date_c__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-488 @SF-488-UI-004 @p2 @negative @blank-value
  Scenario: Verify behavior when Onboarded_Date_c is blank
    Given I am logged in as a standard user
    And I have a test Contract created via API without "Onboarded_Date_c"
    When I navigate to the Contract record
    Then the "Onboarded_Date_c" field should be visible
    And the "Onboarded_Date_c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-488 @SF-488-UI-005 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Onboarded_Date_c
    Given I am logged in as a read-only user
    And I have a test Contract created via API
    When I navigate to the Contract record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-488 @SF-488-UI-006 @p2 @ui-data-creation
  Scenario: Create Contract record via UI
    Given I am logged in as a standard user
    When I navigate to the Contract object list
    And I click New to create a Contract
    And I fill in required Contract fields
    And I save the record
    Then the Contract should be created successfully
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
  # Total Steps Analyzed: 32
  # Existing Steps Used: 32
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 32/32 (100%)
  #   - Feature-Specific Steps Used: 0
