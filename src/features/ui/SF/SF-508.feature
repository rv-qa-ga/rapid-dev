# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-508 - Opportunity 'Win Reason' Validation Rules Update
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: picklist-values
# Generated: 2025-12-19T15:05:43.104Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Opportunity 'Win Reason' Validation Rules Update
# Primary Entity: Opportunity
#
# Test Requirements (1):
#   REQ-1: I am an MRD who wants to define a win reason for an opportunity t
#     → Test Type: BOTH | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-508 @medium @picklist @opportunity
Feature: SF-508 - Opportunity 'Win Reason' Validation Rules Update
  As a Salesforce user
  I want to verify the Win reason details functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-508 @SF-508-UI-001 @qa-mrd-user
  Scenario: Scenario 1
    Given I am logged in as a "QA MRD User" user
    Given I am an MRD who wants to define a win reason for an opportunity that is not listed in the picklist values
    When I specify that the win reason is ‘Other’
    And I save the record
    Then Components for deployment: Validation on Opportunity: Mandatory_Win_Reason_Details
    Then I have tested it
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: Win reason details on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-508 @SF-508-UI-002 @p1 @picklist-options
  Scenario: Verify all Win reason details picklist options are available
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I click on the "Win reason details" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-508 @SF-508-UI-003 @p2 @negative @blank-value
  Scenario: Verify behavior when Win reason details is blank
    Given I am logged in as a standard user
    And I have a test Opportunity created via API without "Win reason details"
    When I navigate to the Opportunity record
    Then the "Win reason details" field should be visible
    And the "Win reason details" field should be blank or empty
    And I take a screenshot as evidence

  @SF-508 @SF-508-UI-004 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Win reason details
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Win reason details" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-508 @SF-508-UI-005 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Win reason details
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-508 @SF-508-UI-006 @p2 @ui-data-creation
  Scenario: Create Opportunity record via UI
    Given I am logged in as a standard user
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
  #   REQ-1: I am an MRD who wants to define a win reason for an opportunity t
  #     → Should be tested via BOTH | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 38
  # Existing Steps Used: 38
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 38/38 (100%)
  #   - Feature-Specific Steps Used: 0
