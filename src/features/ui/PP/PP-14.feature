# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-14 - CMT | Configure Agency Commission for Insurer/Syndicate Participants
# Type: Story | Status: In Development | Priority: Medium
# Feature Type: field-addition, agency-commission, configuration, mutually-exclusive
# Generated: 2026-01-28 (Based on JIRA PP-14 requirements and screenshots)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Configure how Agency Commission is determined for each insurer/syndicate participant
# Primary Entity: Participation Rule (in CMT - Contract Management Tool app)
# Related Entity: Counterparty Relationship, Financial Element (Agency Commission Expense)
# Entity Set: Likely `accelins_participationrules` or similar
#
# Participation Rule Fields (NEW for PP-14):
#   - Agency Commission rate interpretation (Picklist/Radio - mutually exclusive, required)
#     Field API name: Likely `accelins_agencycommissionrateinterpretation` or similar
#     Options: "Agency Commission Gross of Member Commission" or "Agency Commission Net of Member Commission"
#   - Agency Commission Method (Picklist/Radio - mutually exclusive, required)
#     Field API name: Likely `accelins_agencycommissionmethod` or similar
#     Options: "Read Agency Commission from BDX" or "Calculate Agency Commission in System"
#   - Expected Agency Commission Rate (Percentage/Decimal - optional, may be required by data rules)
#     Field API name: Likely `accelins_expectedagencycommissionrate` or similar
#   - Located in General tab of Participation Rule form (for Financial Element = "Agency Commission Expense")
#   - Participation Rules are related to Counterparty Relationships
#
# Navigation Paths:
#   - Via Counterparty Relationship: CMT app → Counter Parties → Counterparty Relationships → Open record → Participation Rules subgrid → Open Agency Commission Expense rule
#   - Via Contract: CMT app → Contracts → Open Contract → Counterparty Relationships subgrid → Open relationship → Participation Rules subgrid → Open Agency Commission Expense rule
#   - Direct: CMT app → Rule Definition → Participation Rules → Filter by Financial Element = "Agency Commission Expense"
#
# Test Requirements (6):
#   REQ-1: Agency Commission Method is visible and mutually exclusive (radio buttons or dropdown)
#     → Test Type: UI | Priority: p1
#   REQ-2: Agency Commission rate interpretation is visible and mutually exclusive
#     → Test Type: UI | Priority: p1
#   REQ-3: Both method and interpretation are required (cannot save without selecting)
#     → Test Type: UI | Priority: p1
#   REQ-4: Expected Agency Commission Rate can be entered and stored as percentage
#     → Test Type: UI | Priority: p1
#   REQ-5: Rate interpretation applies consistently regardless of method
#     → Test Type: UI | Priority: p1
#   REQ-6: No implicit defaults for new participants
#     → Test Type: UI | Priority: p1
#
# Key Business Rules:
#   - Agency Commission Method is required (mutually exclusive: Read from BDX OR Calculate in System)
#   - Agency Commission rate interpretation is required (mutually exclusive: Gross OR Net of Member Commission)
#   - Expected Agency Commission Rate is stored as percentage
#   - Rate interpretation applies regardless of method selected
#   - When method = "Read from BDX": rate used for validation of BDX values
#   - When method = "Calculate in System": rate used for calculation of Agency Commission
#   - No implicit defaults - both method and interpretation must be explicitly selected
#   - Configuration is on Participation Rules where Financial Element = "Agency Commission Expense"
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-14 @medium @dynamics @d365 @cmt @participation-rule @agency-commission @configuration
Feature: PP-14 - CMT | Configure Agency Commission for Insurer/Syndicate Participants
  As a Contract Admin in CMT
  I want to configure how Agency Commission is determined for each insurer/syndicate participant
  So that CMT clearly indicates whether agency commission should be read from bordereaux or calculated in system, and how the configured rate should be interpreted

  Background:
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-14 @PP-14-UI-001 @p1 @smoke @positive @mutually-exclusive
  Scenario: Verify Agency Commission Method is mutually exclusive and required
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    Then the "Agency Commission Method" field should be visible in the General tab
    And I click Edit on the Participation Rule
    Then the "Agency Commission Method" field should be editable
    And the field should be displayed as radio buttons or a dropdown
    And I should be able to select "Read Agency Commission from BDX"
    And I should be able to select "Calculate Agency Commission in System"
    And I should NOT be able to select both options at the same time
    And I take a screenshot as evidence

  @PP-14 @PP-14-UI-002 @p1 @smoke @positive @mutually-exclusive
  Scenario: Verify Agency Commission rate interpretation is mutually exclusive and required
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    Then the "Agency Commission rate interpretation" field should be visible in the General tab
    And I click Edit on the Participation Rule
    Then the "Agency Commission rate interpretation" field should be editable
    And the field should be displayed as radio buttons or a dropdown
    And I should be able to select "Agency Commission Gross of Member Commission"
    And I should be able to select "Agency Commission Net of Member Commission"
    And I should NOT be able to select both options at the same time
    And I take a screenshot as evidence

  @PP-14 @PP-14-UI-003 @p1 @smoke @positive @required-fields
  Scenario: Verify both Agency Commission Method and rate interpretation are required
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I click Edit on the Participation Rule
    And I do NOT select an Agency Commission Method
    And I do NOT select an Agency Commission rate interpretation
    When I attempt to save the Participation Rule record
    Then the system should prevent saving
    And an error message should indicate that Agency Commission Method is required
    And an error message should indicate that Agency Commission rate interpretation is required
    And I take a screenshot as evidence

  @PP-14 @PP-14-UI-004 @p1 @positive @required-fields @data-driven
  Scenario Outline: Verify cannot save without selecting Agency Commission Method
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I click Edit on the Participation Rule
    And I select "<rate_interpretation>" in the "Agency Commission rate interpretation" field
    And I do NOT select an Agency Commission Method
    When I attempt to save the Participation Rule record
    Then the system should prevent saving
    And an error message should indicate that Agency Commission Method is required
    And I take a screenshot as evidence

    Examples:
      | rate_interpretation                                    |
      | Agency Commission Gross of Member Commission          |
      | Agency Commission Net of Member Commission            |

  @PP-14 @PP-14-UI-005 @p1 @positive @required-fields @data-driven
  Scenario Outline: Verify cannot save without selecting Agency Commission rate interpretation
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I click Edit on the Participation Rule
    And I select "<method>" in the "Agency Commission Method" field
    And I do NOT select an Agency Commission rate interpretation
    When I attempt to save the Participation Rule record
    Then the system should prevent saving
    And an error message should indicate that Agency Commission rate interpretation is required
    And I take a screenshot as evidence

    Examples:
      | method                                    |
      | Read Agency Commission from BDX          |
      | Calculate Agency Commission in System    |

  @PP-14 @PP-14-UI-006 @p1 @positive @rate-field
  Scenario: Verify Expected Agency Commission Rate can be entered and stored
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I click Edit on the Participation Rule
    And I select "Read Agency Commission from BDX" in the "Agency Commission Method" field
    And I select "Agency Commission Gross of Member Commission" in the "Agency Commission rate interpretation" field
    And I enter "5.5" in the "Expected Agency Commission Rate" field
    And I save the Participation Rule record
    Then the Participation Rule should be saved successfully
    And the "Expected Agency Commission Rate" field should display "5.5"
    And I take a screenshot as evidence

  @PP-14 @PP-14-UI-007 @p1 @positive @rate-interpretation
  Scenario: Verify Rate Interpretation applies consistently regardless of method
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I click Edit on the Participation Rule
    And I select "Read Agency Commission from BDX" in the "Agency Commission Method" field
    And I select "Agency Commission Net of Member Commission" in the "Agency Commission rate interpretation" field
    And I enter "3.25" in the "Expected Agency Commission Rate" field
    And I save the Participation Rule record
    Then the Participation Rule should be saved successfully
    And I click Edit on the Participation Rule again
    And I change the "Agency Commission Method" to "Calculate Agency Commission in System"
    And I save the Participation Rule record
    Then the Participation Rule should be saved successfully
    And the "Agency Commission rate interpretation" should still be "Agency Commission Net of Member Commission"
    And the "Expected Agency Commission Rate" should still be "3.25"
    And the rate interpretation should apply consistently regardless of method
    And I take a screenshot as evidence

  @PP-14 @PP-14-UI-008 @p1 @positive @method-combinations @data-driven
  Scenario Outline: Verify all combinations of Method and Rate Interpretation can be saved
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I click Edit on the Participation Rule
    And I select "<method>" in the "Agency Commission Method" field
    And I select "<rate_interpretation>" in the "Agency Commission rate interpretation" field
    And I enter "<rate>" in the "Expected Agency Commission Rate" field
    And I save the Participation Rule record
    Then the Participation Rule should be saved successfully
    And the "Agency Commission Method" should display "<method>"
    And the "Agency Commission rate interpretation" should display "<rate_interpretation>"
    And the "Expected Agency Commission Rate" should display "<rate>"
    And I take a screenshot as evidence

    Examples:
      | method                                    | rate_interpretation                                    | rate |
      | Read Agency Commission from BDX          | Agency Commission Gross of Member Commission          | 5.0  |
      | Read Agency Commission from BDX          | Agency Commission Net of Member Commission            | 4.5  |
      | Calculate Agency Commission in System    | Agency Commission Gross of Member Commission          | 6.0  |
      | Calculate Agency Commission in System    | Agency Commission Net of Member Commission            | 3.75 |

  @PP-14 @PP-14-UI-009 @p1 @positive @no-defaults
  Scenario: Verify no implicit defaults for new Participation Rules
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I click New to create a Participation Rule record
    And I select "Agency Commission Expense" in the "Financial Element" field
    And I fill in other required Participation Rule fields
    Then the "Agency Commission Method" field should NOT have a default value selected
    And the "Agency Commission rate interpretation" field should NOT have a default value selected
    And both fields should be empty/blank
    And I take a screenshot as evidence

  @PP-14 @PP-14-UI-010 @p2 @positive @update-existing
  Scenario: Verify Agency Commission configuration can be updated on existing Participation Rule
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the record has "Agency Commission Method" set to "Read Agency Commission from BDX"
    And the record has "Agency Commission rate interpretation" set to "Agency Commission Gross of Member Commission"
    And I click Edit on the Participation Rule
    And I change the "Agency Commission Method" to "Calculate Agency Commission in System"
    And I change the "Agency Commission rate interpretation" to "Agency Commission Net of Member Commission"
    And I update the "Expected Agency Commission Rate" to "7.5"
    And I save the Participation Rule record
    Then the Participation Rule should be saved successfully
    And the "Agency Commission Method" should display "Calculate Agency Commission in System"
    And the "Agency Commission rate interpretation" should display "Agency Commission Net of Member Commission"
    And the "Expected Agency Commission Rate" should display "7.5"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-14 @PP-14-UI-011 @p2 @positive @contract-level
  Scenario: Verify Agency Commission configuration accessible from Contract subgrid
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I open an existing Contract record
    And I navigate to the "Counterparty Relationships" subgrid section
    And I open a Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    Then the "Agency Commission Method" field should be visible
    And the "Agency Commission rate interpretation" field should be visible
    And the "Expected Agency Commission Rate" field should be visible
    And I take a screenshot as evidence

  @PP-14 @PP-14-UI-012 @p2 @negative @invalid-rate
  Scenario: Verify Expected Agency Commission Rate validation
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I click Edit on the Participation Rule
    And I select "Read Agency Commission from BDX" in the "Agency Commission Method" field
    And I select "Agency Commission Gross of Member Commission" in the "Agency Commission rate interpretation" field
    And I enter an invalid value "ABC" in the "Expected Agency Commission Rate" field
    When I attempt to save the Participation Rule record
    Then the system should prevent saving
    And an error message should indicate that the rate must be a valid number
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 6
  # Covered Requirements: 6
  # Coverage: 100%
  #
  # ✅ COVERED REQUIREMENTS:
  #   REQ-1: Method mutually exclusive - Scenario PP-14-UI-001
  #   REQ-2: Rate interpretation mutually exclusive - Scenario PP-14-UI-002
  #   REQ-3: Both required - Scenarios PP-14-UI-003, PP-14-UI-004, PP-14-UI-005
  #   REQ-4: Rate can be entered - Scenario PP-14-UI-006
  #   REQ-5: Rate interpretation applies consistently - Scenario PP-14-UI-007
  #   REQ-6: No implicit defaults - Scenario PP-14-UI-009
  #
  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Note: Some steps may need to be created for:
  #   - Navigating to Participation Rules subgrid from Counterparty Relationship
  #   - Opening Participation Rule with specific Financial Element (Agency Commission Expense)
  #   - Selecting mutually exclusive options (radio buttons or dropdown)
  #   - Verifying mutually exclusive behavior
  #   - Validating required fields for Agency Commission configuration
  #
  # These steps should follow the existing Dynamics UI step definition patterns
  # and may require feature-specific step definitions if not already available.
