# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-763 - Opportunity Summary Fields Updates
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-02-28T11:03:33.242Z (FeatureGenerator v3.1)
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
# Overview: Opportunity Summary Fields Updates
# Primary Entity: Opportunity
#
# Fields Involved (1):
#   • Updates (Updates__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "Updates" behavior on Opportunity
#     → Test Type: BOTH | Priority: p2
#   REQ-2: Auto-populate Name of Prospect from related AccountGiven the fiel
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

@ui @salesforce @SF-763 @medium @salesforce @auto-populate @field-mapping @opportunity
Feature: SF-763 - Opportunity Summary Fields Updates
  As a Salesforce user
  I want to verify the type is PercentWhen a user enters a value in functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-763 @SF-763-UI-001 @p1 @smoke @positive @data-driven @auto-population @field-exists @create @query @visibility @read-only
  Scenario: Auto-populate Name of Prospect from related AccountGiven the field “Name of Prospect” exists on the Opportunity Readiness recordAnd an Opportunity Readiness record is created for an OpportunityAnd the Opportunity has a related AccountWhen the Opportunity Readiness record is createdThen “Name of Prospect” must be automatically populated with the Account Name of the Account related to the OpportunityAnd the MRD must not be required to manually populate this fieldScenario 2: Business Plan Details must contain a valid linkGiven the field “Business Plan Details” exists on the Opportunity Readiness recordWhen a user enters a value in “Business Plan Details” and attempts to saveThen the value must be validated as a valid URLAnd if the value is not in a valid URL formatThen the system must prevent the record from being savedAnd display the message:“Business Plan Details must contain a valid link.”And when a valid link is providedThen the record must be allowed to saveScenario 3: Proposed Member Commission must not exceed 100%Given the field “Proposed Member Commission” existsAnd the field type is PercentWhen a user enters a value in “Proposed Member Commission” and attempts to saveThen the value must be less than or equal to 100%And if the value is greater than 100%Then the system must prevent the record from being savedAnd display the message:“Proposed Member Commission cannot exceed 100%.”Scenario 4: TPA Names lookup must only show Third Party Administrator accountsGiven the field “TPA Names” existsAnd is requiredAnd it is a lookup to AccountWhen a user searches in the “TPA Names” lookupThen the lookup results must only return Accounts where Account Type = “Third party administrator”And Accounts with any other Account Type must not be selectable
    Given I am logged in as a "Accelerant - System administrator" user
    Then 8 from QA feedback on
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: type is PercentWhen a user enters a value in from Account to Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-763 @SF-763-UI-002 @smoke @p1 @auto-populate
  Scenario: Verify type is PercentWhen a user enters a value in auto-populates from Account to Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with:
      | field   | value    |
      | type is PercentWhen a user enters a value in | EU       |
    When I navigate to the Account record
    And I create a new Opportunity from the Account
    Then the "type is PercentWhen a user enters a value in" field should display "EU"
    And I take a screenshot as evidence

  @SF-763 @SF-763-UI-003 @p1 @read-only
  Scenario: Verify type is PercentWhen a user enters a value in is NOT editable on Opportunity after creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with type is PercentWhen a user enters a value in "UK"
    And I have a test Opportunity created via API for the Account
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "type is PercentWhen a user enters a value in" field should not be editable
    And I take a screenshot as evidence

  @SF-763 @SF-763-UI-004 @p1 @visibility
  Scenario: Verify type is PercentWhen a user enters a value in field is visible on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with type is PercentWhen a user enters a value in "US"
    And I have a test Opportunity created via API for the Account
    When I navigate to the Opportunity record
    Then the "type is PercentWhen a user enters a value in" field should be visible
    And the "type is PercentWhen a user enters a value in" field should display "US"
    And I take a screenshot as evidence

  @SF-763 @SF-763-UI-005 @p2 @exact-match
  Scenario: Verify type is PercentWhen a user enters a value in value matches exactly from Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with type is PercentWhen a user enters a value in "APAC"
    And I have a test Opportunity created via API for the Account
    When I navigate to the Opportunity record
    Then the "type is PercentWhen a user enters a value in" field should display "APAC"
    And the type is PercentWhen a user enters a value in value should match exactly what was on the Account
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: Updates__c on Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-763 @SF-763-UI-006 @smoke @p1 @read-only
  Scenario: Verify Updates__c is read-only on Opportunity
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Updates__c" field should not be editable
    And I take a screenshot as evidence

  @SF-763 @SF-763-UI-007 @p1 @negative
  Scenario: Verify user cannot modify Updates__c after Opportunity creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Updates__c" field should be read-only
    And attempting to edit the Updates__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-763 @SF-763-UI-008 @p2 @negative @blank-value
  Scenario: Verify behavior when type is PercentWhen a user enters a value in is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Opportunity created via API without "type is PercentWhen a user enters a value in"
    When I navigate to the Opportunity record
    Then the "type is PercentWhen a user enters a value in" field should be visible
    And the "type is PercentWhen a user enters a value in" field should be blank or empty
    And I take a screenshot as evidence

  @SF-763 @SF-763-UI-009 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify type is PercentWhen a user enters a value in
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify "Updates" behavior on Opportunity
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: Auto-populate Name of Prospect from related AccountGiven the fiel
  #     → Should be tested via BOTH | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 54
  # Existing Steps Used: 54
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 54/54 (100%)
  #   - Feature-Specific Steps Used: 0
