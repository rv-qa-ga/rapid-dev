# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-588 - Assign Actuary, Underwriter and Exposure team member to the opportunity
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: picklist-values
# Generated: 2026-01-13T21:44:37.081Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 3
# Description: Generator Only - Full automatic generation from Jira data (current behavior)
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Assign Actuary, Underwriter and Exposure team member to the opportunity
# Primary Entity: Opportunity
#
# Test Requirements (2):
#   REQ-1: an Opportunity is in the Due Diligence stage → the MRD prepares t
#     → Test Type: BOTH | Priority: p1
#   REQ-2: an Opportunity is in the Due Diligence stage → a user attempts to
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Underwriter
#   • Actuary
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-588 @medium @picklist @opportunity
Feature: SF-588 - Assign Actuary, Underwriter and Exposure team member to the opportunity
  As a Salesforce user
  I want to verify the Exposure Manager functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-588 @SF-588-UI-001 @p1 @smoke @positive @data-driven @qa-mrd-user @picklist-values
  Scenario: Scenario 1
    Given I am logged in as a "QA MRD User" user
    Given An Opportunity is in the Due Diligence stage
    Given The Prospect Coding Questionnaire has not begun
    When The MRD prepares the Opportunity for Prospect Coding
    Then The MRD must assign
    Then - Underwriter
    Then - Actuary
    Then - ExposureScenario: Role assignments determine who is notified to complete Prospect CodingGiven an Opportunity is in the Due Diligence stage
    Then The MRD has assigned an Underwriter, Actuary
    Then Exposure representative
    And I take a screenshot as evidence

  @SF-588 @SF-588-UI-002 @p1 @positive @qa-mrd-user @picklist-values
  Scenario: Scenario 2
    Given I am logged in as a "QA MRD User" user
    Given An Opportunity is in the Due Diligence stage
    Given The Opportunity is owned by an MRD
    Given Role assignments exist or are required
    When A user attempts to assign or change any of the following roles
    When - Underwriter
    When - Actuary
    When - Exposure
    Then The user must be the MRD who owns the Account associated with the Opportunity
    And I navigate to the Opportunity object list
    Then the Opportunity should be saved successfully
    Then These are the available Team Roles for opportunity:I'm assuming that:Actuary = Lead ActuaryUnderwriter = Lead Underwriteris that correct?Which one should I use for Exposure?
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: Exposure Manager on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-588 @SF-588-UI-003 @smoke @p1 @admin
  Scenario: Verify admin user can access Exposure Manager
    Given I am logged in as an admin user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Exposure Manager" field should be visible
    And I take a screenshot as evidence

  @SF-588 @SF-588-UI-004 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access Exposure Manager
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Exposure Manager" field should not be visible
    And I take a screenshot as evidence

  @SF-588 @SF-588-UI-005 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit Exposure Manager
    Given I am logged in as a read-only user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: Exposure Manager on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-588 @SF-588-UI-006 @smoke @p1 @data-driven
  Scenario Outline: Set Exposure Manager to valid picklist values
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Exposure Manager" field to "<value>"
    And I save the record
    Then the Opportunity should be saved successfully
    And the "Exposure Manager" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Underwriter |
      | Actuary |

  @SF-588 @SF-588-UI-007 @p1 @picklist-options
  Scenario: Verify all Exposure Manager picklist options are available
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I click on the "Exposure Manager" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-588 @SF-588-UI-008 @p2 @negative @blank-value
  Scenario: Verify behavior when Exposure Manager is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Opportunity created via API without "Exposure Manager"
    When I navigate to the Opportunity record
    Then the "Exposure Manager" field should be visible
    And the "Exposure Manager" field should be blank or empty
    And I take a screenshot as evidence

  @SF-588 @SF-588-UI-009 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Exposure Manager
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Exposure Manager" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-588 @SF-588-UI-010 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Exposure Manager
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-588 @SF-588-UI-011 @p2 @ui-data-creation
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
  #   REQ-1: an Opportunity is in the Due Diligence stage → the MRD prepares t
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: an Opportunity is in the Due Diligence stage → a user attempts to
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 70
  # Existing Steps Used: 70
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 70/70 (100%)
  #   - Feature-Specific Steps Used: 0
