# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-875 - Opportunity Readiness Approval Process Change
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2026-02-28T11:03:38.194Z (FeatureGenerator v3.1)
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
# Overview: Opportunity Readiness Approval Process Change
# Primary Entity: Opportunity
#
# Test Requirements (2):
#   REQ-1: GIVEN a US-based opportunity readiness record is submitted for ap
#     → Test Type: BOTH | Priority: p1
#   REQ-2: GIVEN a Opportunity readiness approval request has been submitted
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
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-875 @medium @salesforce @opportunity
Feature: SF-875 - Opportunity Readiness Approval Process Change
  As a Salesforce user
  I want to verify the Pending functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-875 @SF-875-UI-001 @p1 @smoke @positive @validation-rule
  Scenario: GIVEN a US-based opportunity readiness record is submitted for approvalI WANT the record to be submitted to a group of approversSO THAT when any 1 person (not both) in that group provides approval, the whole opportunity readiness record is approvedMembers Operating RegionApproversUSRich Koehler - Head of Distribution
    Given I am logged in as a "Accelerant - System administrator" user
    Then Steve Strauss - CUO
    And I take a screenshot as evidence

  @SF-875 @SF-875-UI-002 @p1 @positive @validation-rule @update @read-only
  Scenario: GIVEN a Opportunity readiness approval request has been submittedAND the approval status is "Pending"AND the approval has been pending for 5 working days (Monday - Friday(ignore holidays))WHEN the approval has not been approved, returned for update or rejectedTHEN a reminder notification must be sent to both of the approvers in the above defined groupAnd the reminder must include:Opportunity nameLink to the Opportunity recordLink to the approval requestNumber of days the approval has been pendingAnd the approval must remain in status "Pending".TECHNICAL NOTESThis story intends only to simplify the logic of approval (going from sequential to a singular, group based approval)All other validations and automation should remain unchanged, on the opportunity readiness record and on the related US-based opportunity recordOnly one out of the two people defined above need to approve the record, not both
    Given I am logged in as a "Accelerant - System administrator" user
    And I save the record
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Pending on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-875 @SF-875-UI-003 @smoke @p1
  Scenario: Verify Pending field is visible on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Pending" field should be visible
    And I take a screenshot as evidence

  @SF-875 @SF-875-UI-004 @p1 @edit
  Scenario: Verify Pending field can be edited on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Pending" field to "Test Value"
    And I save the record
    Then the Opportunity should be saved successfully
    And the "Pending" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-875 @SF-875-UI-005 @p1 @data-driven
  Scenario Outline: Set Pending to valid values
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Pending" field to "<value>"
    And I save the record
    Then the "Pending" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Pending on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-875 @SF-875-UI-006 @smoke @p1
  Scenario: Verify Pending field is visible on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Pending" field should be visible
    And I take a screenshot as evidence

  @SF-875 @SF-875-UI-007 @p1 @edit
  Scenario: Verify Pending field can be edited on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Pending" field to "Test Value"
    And I save the record
    Then the Opportunity should be saved successfully
    And the "Pending" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-875 @SF-875-UI-008 @p1 @data-driven
  Scenario Outline: Set Pending to valid values
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    And I set the "Pending" field to "<value>"
    And I save the record
    Then the "Pending" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-875 @SF-875-UI-009 @p2 @negative @blank-value
  Scenario: Verify behavior when Pending is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Opportunity created via API without "Pending"
    When I navigate to the Opportunity record
    Then the "Pending" field should be visible
    And the "Pending" field should be blank or empty
    And I take a screenshot as evidence

  @SF-875 @SF-875-UI-010 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Pending
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Pending" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-875 @SF-875-UI-011 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Pending
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-875 @SF-875-UI-012 @p2 @ui-data-creation
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
  #   REQ-1: GIVEN a US-based opportunity readiness record is submitted for ap
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: GIVEN a Opportunity readiness approval request has been submitted
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 58
  # Existing Steps Used: 58
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 58/58 (100%)
  #   - Feature-Specific Steps Used: 0
