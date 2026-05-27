# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-596 - Publish Account Platform Events from Salesforce
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-01-16T17:17:54.256Z (FeatureGenerator v3.1)
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
# Overview: Publish Account Platform Events from Salesforce
# Primary Entity: Account
#
# Account Types Involved (17):
#   • Acquisition Company
#   • Agency
#   • Agency Branch
#   • Distribution Partner
#   • Group
#   • Insurer
#   • Insurer Branch
#   • Legal Entity
#   • Member
#   • Non-Member MGA
#   • Placing Broker
#   • Reinsurance Broker
#   • Reinsurer
#   • Reinsurer Branch
#   • Service Company
#   • Third Party Administrator (TPA)
#   • TPA Group
#
# Test Requirements (2):
#   REQ-1: Verify Account Type field dropdown shows all 17 Account Types: Ac
#     → Test Type: UI | Priority: p1
#   REQ-2: an eligible Account is created in Salesforce → the event is proce
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-596 @medium @auto-populate @field-mapping @account
Feature: SF-596 - Publish Account Platform Events from Salesforce
  As a Salesforce user
  I want to verify the RecordId__c functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-UI-001 @p1 @smoke @negative @data-driven @auto-population
  Scenario: f",
    Given I am logged in as a "Accelerant - System administrator" user
    Given An eligible Account is created in Salesforce
    Given I have an existing Account record
    Given The Party record corresponds to the Salesforce Account
    Given An Account Platform Event is published with Event Action ‘Update’
    And I set the "Salesforce Account field" field
    When The event is processed by downstream integrationThen a new Party record exists in Dataverse
    When The Party record corresponds to the Salesforce Account
    When An Account Platform Event is published with Event Action ‘Update’
    When I set the "Salesforce Account field" field
    Then A new Party record exists in Dataverse
    Then The Party record corresponds to the Salesforce Account
    Then An Account Platform Event is published with Event Action ‘Update’
    And I set the "Salesforce Account field" field
    Then Place them in this comment for reference
    And I navigate to the Account object list
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: RecordId__c from Source to Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-UI-002 @smoke @p1 @auto-populate
  Scenario: Verify RecordId__c auto-populates from Source to Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with:
      | field   | value    |
      | RecordId__c | EU       |
    And I have a test Account created via API for the Source
    When I navigate to the Account record
    Then the "RecordId__c" field should display "EU"
    And I take a screenshot as evidence

  @SF-596 @SF-596-UI-003 @p1 @read-only
  Scenario: Verify RecordId__c is NOT editable on Account after creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with RecordId__c "UK"
    And I have a test Account created via API for the Source
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "RecordId__c" field should not be editable
    And I take a screenshot as evidence

  @SF-596 @SF-596-UI-004 @p1 @visibility
  Scenario: Verify RecordId__c field is visible on Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with RecordId__c "US"
    And I have a test Account created via API for the Source
    When I navigate to the Account record
    Then the "RecordId__c" field should be visible
    And the "RecordId__c" field should display "US"
    And I take a screenshot as evidence

  @SF-596 @SF-596-UI-005 @p2 @exact-match
  Scenario: Verify RecordId__c value matches exactly from Source
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with RecordId__c "APAC"
    And I have a test Account created via API for the Source
    When I navigate to the Account record
    Then the "RecordId__c" field should display "APAC"
    And the RecordId__c value should match exactly what was on the Source
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-UI-006 @p2 @negative @blank-value
  Scenario: Verify behavior when RecordId__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API without "RecordId__c"
    When I navigate to the Account record
    Then the "RecordId__c" field should be visible
    And the "RecordId__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-596 @SF-596-UI-007 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify RecordId__c
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCOUNT TYPE FIELD: Verify all 17 Account Types are available
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-UI-008 @smoke @p1 @account-type-validation
  Scenario: Verify Account Type field dropdown shows all 17 Account Types
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I click on the "Type" picklist
    Then I should see "Acquisition Company" in the "Type" field picklist
    Then I should see "Agency" in the "Type" field picklist
    Then I should see "Agency Branch" in the "Type" field picklist
    Then I should see "Distribution Partner" in the "Type" field picklist
    Then I should see "Group" in the "Type" field picklist
    Then I should see "Insurer" in the "Type" field picklist
    Then I should see "Insurer Branch" in the "Type" field picklist
    Then I should see "Legal Entity" in the "Type" field picklist
    Then I should see "Member" in the "Type" field picklist
    Then I should see "Non-Member MGA" in the "Type" field picklist
    Then I should see "Placing Broker" in the "Type" field picklist
    Then I should see "Reinsurance Broker" in the "Type" field picklist
    Then I should see "Reinsurer" in the "Type" field picklist
    Then I should see "Reinsurer Branch" in the "Type" field picklist
    Then I should see "Service Company" in the "Type" field picklist
    Then I should see "Third Party Administrator (TPA)" in the "Type" field picklist
    Then I should see "TPA Group" in the "Type" field picklist
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-UI-009 @p2 @ui-data-creation
  Scenario: Create Account record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify Account Type field dropdown shows all 17 Account Types: Ac
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: an eligible Account is created in Salesforce → the event is proce
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 84
  # Existing Steps Used: 84
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 84/84 (100%)
  #   - Feature-Specific Steps Used: 0
