# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-110 - Enable Field History Tracking for Opportunity fields
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-01-08T19:36:02.139Z (FeatureGenerator v3.1)
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
# Overview: Enable Field History Tracking for Opportunity fields
# Primary Entity: Contract
#
# Fields Involved (1):
#   • History Tracking (History_Tracking__c) - modify
#
# Test Requirements (4):
#   REQ-1: Verify "History Tracking" behavior on Contract
#     → Test Type: BOTH | Priority: p2
#   REQ-2: Enable field history tracking for critical fields
#     → Test Type: BOTH | Priority: p1
#   REQ-3: Verify field history visibility on Opportunity records
#     → Test Type: UI | Priority: p2
#   REQ-4: Validate history retention and reporting
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
#   • Stage
#   • Expressed Interest
#   • Territories Covered
#   • Declined GWP
#   • MOU Sent Date
#   • Provisional Commission
#   • Substage
#   • Unqualified Reason
#   • Unqualified Reason Details
#   • Win Reason
#   • Win Reason Details
#   • Date
#   • User
#   • New Value
#   • Date Range
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-110 @medium @field-visibility @contract
Feature: SF-110 - Enable Field History Tracking for Opportunity fields
  As a Salesforce user
  I want to verify the audit history of sensitive Opportunity functionality on Contract
  So that Contract records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-110 @SF-110-UI-001 @p1 @smoke @positive @admin @field-visibility
  Scenario: Enable field history tracking for critical fields
    Given I am logged in as a "Admin" user
    When I navigate to the Opportunity record
    Then “Track both Old
    Then New Values” must be selected for all tracked fields
    Then “Track both Old and New Values” must be selected for all tracked fields
    And I take a screenshot as evidence

  @SF-110 @SF-110-UI-002 @p1 @positive @field-visibility @visibility
  Scenario: Verify field history visibility on Opportunity records
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Opportunity record
    Then It must display the following columns:DateUserFieldOriginal ValueNew ValueAnd all changes must be logged within 1 minute of modification
    And I navigate to the Opportunity object list
    And I take a screenshot as evidence

  @SF-110 @SF-110-UI-003 @p1 @positive @data-driven @standard-user @field-visibility
  Scenario: Validate history retention and reporting
    Given I am logged in as a "Standard User" user
    When I access historical data
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PERMISSION-BASED: audit history of sensitive Opportunity on Contract
  # ══════════════════════════════════════════════════════════════════════════

  @SF-110 @SF-110-UI-004 @smoke @p1 @admin
  Scenario: Verify admin user can access audit history of sensitive Opportunity
    Given I am logged in as an admin user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "audit history of sensitive Opportunity" field should be visible
    And I take a screenshot as evidence

  @SF-110 @SF-110-UI-005 @p1 @standard-user @negative
  Scenario: Verify standard user cannot access audit history of sensitive Opportunity
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "audit history of sensitive Opportunity" field should not be visible
    And I take a screenshot as evidence

  @SF-110 @SF-110-UI-006 @p2 @read-only-user @negative
  Scenario: Verify read-only user cannot edit audit history of sensitive Opportunity
    Given I am logged in as a read-only user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: 1 field(s) on Contract
  # ══════════════════════════════════════════════════════════════════════════

  @SF-110 @SF-110-UI-007 @smoke @p1 @admin
  Scenario: Verify "History_Tracking__c" is visible for admin users
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Contract object list
    And I click New to create a Contract
    Then the "History_Tracking__c" field should be visible
    And I take a screenshot as evidence

  @SF-110 @SF-110-UI-008 @p2 @edit-form
  Scenario: Verify "History_Tracking__c" is visible on Contract edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    Then the "History_Tracking__c" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: audit history of sensitive Opportunity on Contract
  # ══════════════════════════════════════════════════════════════════════════

  @SF-110 @SF-110-UI-009 @smoke @p1 @read-only
  Scenario: Verify audit history of sensitive Opportunity is read-only on Contract
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    Then the "audit history of sensitive Opportunity" field should not be editable
    And I take a screenshot as evidence

  @SF-110 @SF-110-UI-010 @p1 @negative
  Scenario: Verify user cannot modify audit history of sensitive Opportunity after Contract creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    Then the "audit history of sensitive Opportunity" field should be read-only
    And attempting to edit the audit history of sensitive Opportunity should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-110 @SF-110-UI-011 @p2 @negative @blank-value
  Scenario: Verify behavior when audit history of sensitive Opportunity is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Contract created via API without "audit history of sensitive Opportunity"
    When I navigate to the Contract record
    Then the "audit history of sensitive Opportunity" field should be visible
    And the "audit history of sensitive Opportunity" field should be blank or empty
    And I take a screenshot as evidence

  @SF-110 @SF-110-UI-012 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for audit history of sensitive Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    Then the "audit history of sensitive Opportunity" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-110 @SF-110-UI-013 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify audit history of sensitive Opportunity
    Given I am logged in as a read-only user
    And I have a test Contract created via API
    When I navigate to the Contract record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-110 @SF-110-UI-014 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to audit history of sensitive Opportunity
    Given I am logged in as a standard user
    And I have a test Contract created via API
    When I navigate to the Contract record
    Then the "audit history of sensitive Opportunity" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-110 @SF-110-UI-015 @p2 @ui-data-creation
  Scenario: Create Contract record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Contract object list
    And I click New to create a Contract
    And I fill in required Contract fields
    And I save the record
    Then the Contract should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: Verify "History Tracking" behavior on Contract
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: Enable field history tracking for critical fields
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-3: Verify field history visibility on Opportunity records
  #     → Should be tested via UI | Priority: p2
  #   REQ-4: Validate history retention and reporting
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 82
  # Existing Steps Used: 82
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 82/82 (100%)
  #   - Feature-Specific Steps Used: 0
