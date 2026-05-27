# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-4 - Add Descriptive Fields to NAICS Codes in RDM
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-01-21T17:54:59.516Z (FeatureGenerator v3.1)
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
# Overview: Add Descriptive Fields to NAICS Codes in RDM
# Primary Entity: Record
#
# Fields Involved (1):
#   • to NAICS Codes in RDM (to_NAICS_Codes_in_RDM__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "to NAICS Codes in RDM" behavior on Record
#     → Test Type: BOTH | Priority: p2
#   REQ-2: I am managing business classification data within Reference Data 
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

@ui @dynamics @PP-4 @medium @dynamics @d365 @auto-populate @field-mapping
Feature: PP-4 - Add Descriptive Fields to NAICS Codes in RDM
  As a Dynamics 365 user
  I want to manage Record data in Reference Data Management
  So that Record records are managed correctly

  Background:
    Given I am logged in to Dynamics 365

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-4 @PP-4-UI-001 @p1 @smoke @positive @data-driven @provide-the-nest-ai-team-other-internal @auto-population
  Scenario: Scenario 1
    Given I am logged in to Dynamics 365
    Given I am managing business classification data within Reference Data Management (RDM)
    When I view records in the Two-Six NAICS Codes table under Product Classification
    Then I want to see two new fields:Description (multi-line text) for detailed explanation of the NAICS categoryKey Words (single line of text) for AI model parsing
    Then Search indexingSo that we can provide the Nest AI team
    Then Other internal users with enriched context to support risk classification, operational reporting
    Then Compliance efforts.AndDescription
    Then Key Words are not mandatory
    Then Confluence page link
    Then Key Words mappingDefinitions mapping
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: Descriptive from Source to Record
  # ══════════════════════════════════════════════════════════════════════════

  @PP-4 @PP-4-UI-002 @smoke @p1 @auto-populate
  Scenario: Verify Descriptive auto-populates from Source to Record
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with:
      | field   | value    |
      | Descriptive | EU       |
    And I have a test Record created via API for the Source
    When I navigate to the Record record
    Then the "Descriptive" field should display "EU"
    And I take a screenshot as evidence

  @PP-4 @PP-4-UI-003 @p1 @read-only
  Scenario: Verify Descriptive is NOT editable on Record after creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with Descriptive "UK"
    And I have a test Record created via API for the Source
    When I navigate to the Record record
    And I click Edit on the Record
    Then the "Descriptive" field should not be editable
    And I take a screenshot as evidence

  @PP-4 @PP-4-UI-004 @p1 @visibility
  Scenario: Verify Descriptive field is visible on Record
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with Descriptive "US"
    And I have a test Record created via API for the Source
    When I navigate to the Record record
    Then the "Descriptive" field should be visible
    And the "Descriptive" field should display "US"
    And I take a screenshot as evidence

  @PP-4 @PP-4-UI-005 @p2 @exact-match
  Scenario: Verify Descriptive value matches exactly from Source
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with Descriptive "APAC"
    And I have a test Record created via API for the Source
    When I navigate to the Record record
    Then the "Descriptive" field should display "APAC"
    And the Descriptive value should match exactly what was on the Source
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: to_NAICS_Codes_in_RDM__c on Record
  # ══════════════════════════════════════════════════════════════════════════

  @PP-4 @PP-4-UI-006 @smoke @p1 @read-only
  Scenario: Verify to_NAICS_Codes_in_RDM__c is read-only on Record
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Record record
    When I navigate to the Record record
    And I click Edit on the Record
    Then the "to_NAICS_Codes_in_RDM__c" field should not be editable
    And I take a screenshot as evidence

  @PP-4 @PP-4-UI-007 @p1 @negative
  Scenario: Verify user cannot modify to_NAICS_Codes_in_RDM__c after Record creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Record record
    When I navigate to the Record record
    And I click Edit on the Record
    Then the "to_NAICS_Codes_in_RDM__c" field should be read-only
    And attempting to edit the to_NAICS_Codes_in_RDM__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-4 @PP-4-UI-008 @p2 @negative @blank-value
  Scenario: Verify behavior when Descriptive is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Record created via API without "Descriptive"
    When I navigate to the Record record
    Then the "Descriptive" field should be visible
    And the "Descriptive" field should be blank or empty
    And I take a screenshot as evidence

  @PP-4 @PP-4-UI-009 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Descriptive
    Given I am logged in as a read-only user
    And I have a test Record created via API
    When I navigate to the Record record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-4 @PP-4-UI-010 @p2 @ui-data-creation
  Scenario: Create Record record via UI
    Given I am logged in to Dynamics 365
    When I navigate to the Reference Data Management app
    And I select "Records" from the left navigation pane
    And I click New to create a Record
    And I fill in required Record fields
    And I save the record
    Then the Record should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Verify "to NAICS Codes in RDM" behavior on Record
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: I am managing business classification data within Reference Data 
  #     → Should be tested via BOTH | Priority: p1


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
