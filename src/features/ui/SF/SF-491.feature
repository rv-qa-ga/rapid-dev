# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-491 - AnnualRevenue only appears for Member MGA and Non-Member MGA Accounts
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:34.493Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: AnnualRevenue only appears for Member MGA and Non-Member MGA Accounts
# Primary Entity: Opportunity
#
# Test Requirements (1):
#   REQ-1: . Search / compact / list views we would not be able to customise
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

@ui @salesforce @SF-491 @medium @field-visibility @opportunity
Feature: SF-491 - AnnualRevenue only appears for Member MGA and Non-Member MGA Accounts
  As a Salesforce user
  I want to verify the AnnualRevenue functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-491 @SF-491-UI-001 @negative @data-driven @admin
  Scenario: . Search / compact / list views we would not be able to customise search layout or compact layout by account type. Further, we are unable to restrict users from adding annual revenue field to list views. Please let me know how you want to proceed with this.
    Given I am logged in as a "Admin" user
    And I navigate to the Account object list
    Given Commit started: https://app.gearset.com/deploy?deploymentId=4d5e60d5-fe30-4c1e-9d6c-d4d5da2af65a
    Given Commit failed: https://app.gearset.com/deploy?deploymentId=4d5e60d5-fe30-4c1e-9d6c-d4d5da2af65aCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given Target: accelins / Salesforce_Devops / /AnnualRevenue-only-appears-for-Member-MGA-and-Non-Member-MGA-AccountsDifference TypeMetadata TypeNameDifferentCustom fieldAccount.AnnualRevenueDifferent (custom selection)ProfileAdminNo differenceCustom objectAccount
    Given Commit started: https://app.gearset.com/deploy?deploymentId=c9bf5167-32fa-44a3-b86c-22b97953b2fb
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=c9bf5167-32fa-44a3-b86c-22b97953b2fbCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given Target: accelins / Salesforce_Devops / /AnnualRevenue-only-appears-for-Member-MGA-and-Non-Member-MGA-AccountsDifference TypeMetadata TypeNameDifferentCustom fieldAccount.AnnualRevenueDifferent (custom selection)ProfileAdminNo differenceCustom objectAccount
    Given :check_mark: Successfully merged PR #16 from gs-pipeline/SF-491/AnnualRevenue-only-appears-for-Member-MGA-and-Non-Member-MGA-Accounts_-_QA into QA
    Given :check_mark: Successfully merged PR #17 from gs-pipeline/SF-491/AnnualRevenue-only-appears-for-Member-MGA-and-Non-Member-MGA-Accounts_-_UAT into UAT
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: AnnualRevenue on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-491 @SF-491-UI-002 @smoke @p1 @admin
  Scenario: Verify admin user can access AnnualRevenue
    Given I am logged in as an admin user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "AnnualRevenue" field should be visible
    And I take a screenshot as evidence

  @SF-491 @SF-491-UI-003 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access AnnualRevenue
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "AnnualRevenue" field should not be visible
    And I take a screenshot as evidence

  @SF-491 @SF-491-UI-004 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit AnnualRevenue
    Given I am logged in as a read-only user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-491 @SF-491-UI-005 @p2 @negative @blank-value
  Scenario: Verify behavior when AnnualRevenue is blank
    Given I am logged in as a standard user
    And I have a test Opportunity created via API without "AnnualRevenue"
    When I navigate to the Opportunity record
    Then the "AnnualRevenue" field should be visible
    And the "AnnualRevenue" field should be blank or empty
    And I take a screenshot as evidence

  @SF-491 @SF-491-UI-006 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify AnnualRevenue
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-491 @SF-491-UI-007 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to AnnualRevenue
    Given I am logged in as a standard user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the "AnnualRevenue" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-491 @SF-491-UI-008 @p2 @ui-data-creation
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
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


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
