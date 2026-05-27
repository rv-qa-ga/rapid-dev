# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-2 -  Update to TPA Mapping
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population, conditional-validation
# Generated: 2026-01-21T17:54:25.584Z (FeatureGenerator v3.1)
# Updated: 2026-01-21 (Based on QA Validation Screenshots)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Update to TPA Mapping
# Primary Entity: TPA Maps
# Related Entity: Parties (for TPA Group lookup)
#
# Test Requirements (3):
#   REQ-1: TPA Group Pulled from Parties Table
#     → Test Type: BOTH | Priority: p1
#   REQ-2: TPA Group Field Is Not Mandatory
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Inclusion of All Third Party Administrators
#     → Test Type: BOTH | Priority: p2
#
# Key Business Rules:
#   - TPA Group field is optional (not mandatory)
#   - Valid From field becomes mandatory when TPA Group is selected
#   - Valid From field is optional when TPA Group is not selected
#   - TPA Group values are sourced from Parties table where Party Type = TPA Group
#   - Only Parties with Status Reason = Active are available
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-2 @medium @dynamics @d365 @auto-populate @field-mapping @tpa-maps @conditional-validation
Feature: PP-2 -  Update to TPA Mapping
  As a Dynamics 365 user
  I want to manage TPA Maps data in Reference Data Management
  So that TPA Mapping records are managed correctly with conditional validation

  Background:
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-2 @PP-2-UI-001 @p1 @smoke @positive @data-driven @auto-population
  Scenario: TPA Group Pulled from Parties Table
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    When I select "Parties" under "Party" category in the left navigation pane
    Then I should see "Parties" entity view
    And I should see "Active TPA Group" table with records where Party Type = TPA Group
    And I select "TPA Maps" under "Party" category in the left navigation pane
    Then I should see "TPA Maps" entity view
    And TPA Group values should be available from Parties table where Status Reason = Active
    And I take a screenshot as evidence

  @PP-2 @PP-2-UI-002 @p2 @negative @data-driven @conditional-validation
  Scenario: TPA Group Field Is Not Mandatory
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    And I select "TPA Maps" under "Party" category in the left navigation pane
    When I click New to create a TPA Maps record
    Then the "TPA Group" field should not be mandatory
    And I can leave "TPA Group" field empty
    And I select "A C S Solutions" in the "TPA" field
    And I save the TPA Maps record
    Then the TPA Maps record should be saved successfully
    And I take a screenshot as evidence

  @PP-2 @PP-2-UI-003 @p1 @positive @data-driven @conditional-validation
  Scenario: Valid From is mandatory when TPA Group is selected
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    And I select "TPA Maps" under "Party" category in the left navigation pane
    When I click New to create a TPA Maps record
    And I select "A C S Solutions" in the "TPA" field
    And I select "DWF Group" in the "TPA Group" field
    Then the "Valid From" field should be mandatory
    And I should see error message "Valid From: Required fields must be filled in"
    And I take a screenshot as evidence

  @PP-2 @PP-2-UI-004 @p1 @positive @data-driven @conditional-validation
  Scenario: Valid From is not mandatory when TPA Group is not selected
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    And I select "TPA Maps" under "Party" category in the left navigation pane
    When I click New to create a TPA Maps record
    And I select "BEAH" in the "TPA" field
    And I leave "TPA Group" field empty
    Then the "Valid From" field should not be mandatory
    And I can leave "Valid From" field empty
    And I save the TPA Maps record
    Then the TPA Maps record should be saved successfully
    And I take a screenshot as evidence

  @PP-2 @PP-2-UI-005 @p2 @positive @data-driven @auto-population
  Scenario: Inclusion of All Third Party Administrators
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    When I select "Parties" under "Party" category in the left navigation pane
    Then I should see Parties with Party Type = Third Party Administrator
    And I select "TPA Maps" under "Party" category in the left navigation pane
    When The TPA Mapping Table is populated or refreshed
    Then All Parties with Party Type = Third Party Administrator should be included in the TPA Mapping Table
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-2 @PP-2-UI-006 @p2 @ui-data-creation
  Scenario: Create TPA Maps record via UI
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    And I select "TPA Maps" under "Party" category in the left navigation pane
    When I click New to create a TPA Maps record
    And I select "A C S Solutions" in the "TPA" field
    And I select "DWF Group" in the "TPA Group" field
    And I enter "11/26/2024" in the "Valid From" field
    And I save the TPA Maps record
    Then the TPA Maps record should be saved successfully
    And I take a screenshot as evidence
