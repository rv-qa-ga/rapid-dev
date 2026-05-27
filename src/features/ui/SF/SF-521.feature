# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-521 - Allow Users to Merge Potential Duplicate Records
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: permission-based
# Generated: 2025-12-19T15:09:01.270Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Allow Users to Merge Potential Duplicate Records
# Primary Entity: Opportunity
#
# Test Requirements (1):
#   REQ-1: I encounter potential duplicates of a particular record → I confi
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

@ui @salesforce @SF-521 @medium @permissions @roles @opportunity
Feature: SF-521 - Allow Users to Merge Potential Duplicate Records
  As a Salesforce user
  I want to verify the Allow Users to Merge Potential Duplicate Records functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-521 @SF-521-UI-001 @data-driven @for-now-as-we-only-have-accelerant---standard
  Scenario: Scenario 1
    Given I am logged in as a "For Now As We Only Have Accelerant - Standard" user
    Given I encounter potential duplicates of a particular record
    When I confirm that they are in fact duplicates
    When I do not want to create a new duplicate record
    Then I should have the option of merging the information between two records to make them oneThis should apply to all records within all objectsDuplication rules can remain as-is
    Then Any other related child objects.For now as we only have Accelerant - Standard User
    Then I can create matching rules for below object, please suggest which one to create for
    Then For opportunity, I can not create since it is not available in the list
    Then There are manual steps in this Jira that needs to be perform as a part of post deployment step
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: Allow Users to Merge Potential Duplicate Records on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-521 @SF-521-UI-002 @smoke @p1 @admin
  Scenario: Verify admin user can access Allow Users to Merge Potential Duplicate Records
    Given I am logged in as an admin user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Allow Users to Merge Potential Duplicate Records" field should be visible
    And I take a screenshot as evidence

  @SF-521 @SF-521-UI-003 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access Allow Users to Merge Potential Duplicate Records
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Allow Users to Merge Potential Duplicate Records" field should not be visible
    And I take a screenshot as evidence

  @SF-521 @SF-521-UI-004 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit Allow Users to Merge Potential Duplicate Records
    Given I am logged in as a read-only user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-521 @SF-521-UI-005 @p2 @negative @blank-value
  Scenario: Verify behavior when Allow Users to Merge Potential Duplicate Records is blank
    Given I am logged in as a standard user
    And I have a test Opportunity created via API without "Allow Users to Merge Potential Duplicate Records"
    When I navigate to the Opportunity record
    Then the "Allow Users to Merge Potential Duplicate Records" field should be visible
    And the "Allow Users to Merge Potential Duplicate Records" field should be blank or empty
    And I take a screenshot as evidence

  @SF-521 @SF-521-UI-006 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Allow Users to Merge Potential Duplicate Records
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-521 @SF-521-UI-007 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Allow Users to Merge Potential Duplicate Records
    Given I am logged in as a standard user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the "Allow Users to Merge Potential Duplicate Records" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-521 @SF-521-UI-008 @p2 @ui-data-creation
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
  #   REQ-1: I encounter potential duplicates of a particular record → I confi
  #     → Should be tested via BOTH | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 48
  # Existing Steps Used: 48
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 48/48 (100%)
  #   - Feature-Specific Steps Used: 0
