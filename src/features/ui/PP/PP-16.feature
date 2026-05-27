# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-16 - CMT | Maintain Agency Commission Configuration Over Time
# Type: Story | Status: In Development | Priority: Medium
# Feature Type: configuration-maintenance, agency-commission, audit-trail, permissions
# Generated: 2026-01-28 (Based on JIRA PP-16 requirements)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Maintain Agency Commission Configuration Over Time
# Primary Entity: Participation Rule (in CMT - Contract Management Tool app)
# Related Entity: Counterparty Relationship, Financial Element (Agency Commission Expense)
# Entity Set: Likely `accelins_participationrules` or similar (same as PP-14)
#
# This story builds on PP-14, which established Agency Commission configuration on Participation Rules.
# PP-16 focuses on viewing, editing, permissions, and audit trail for that configuration.
#
# Participation Rule Fields (from PP-14):
#   - Agency Commission rate interpretation (Picklist - mutually exclusive, required)
#   - Agency Commission Method (Picklist - mutually exclusive, required)
#   - Expected Agency Commission Rate (Decimal/Percentage - optional)
#   - Validation Tolerances (may be new fields for PP-16)
#   - Located in General tab of Participation Rule form (for Financial Element = "Agency Commission Expense")
#
# Navigation Paths:
#   - Via Counterparty Relationship: CMT app → Counter Parties → Counterparty Relationships → Open record → Participation Rules subgrid → Open Agency Commission Expense rule
#   - Via Contract: CMT app → Contracts → Open Contract → Counterparty Relationships subgrid → Open relationship → Participation Rules subgrid → Open Agency Commission Expense rule
#   - Direct: CMT app → Rule Definition → Participation Rules → Filter by Financial Element = "Agency Commission Expense"
#
# Test Requirements (4):
#   REQ-1: View configuration - see all agency commission settings
#     → Test Type: UI | Priority: p1
#   REQ-2: Edit configuration - update agency commission settings
#     → Test Type: UI | Priority: p1
#   REQ-3: Restrict editing to authorized roles - permissions enforcement
#     → Test Type: UI | Priority: p1
#   REQ-4: Configuration change audit - view audit trail/history
#     → Test Type: UI | Priority: p2
#
# Key Business Rules:
#   - Users can view agency commission configuration for participants
#   - Only authorized roles can edit agency commission configuration
#   - All configuration changes must be audited (who, when, what changed)
#   - Updated values are used going forward for calculation/validation
#   - Configuration includes: Method (Read from BDX/Calculate in System), Rate Interpretation (Gross/Net), Expected Rate, Validation Tolerances
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-16 @medium @dynamics @d365 @cmt @participation-rule @agency-commission @maintenance @audit
Feature: PP-16 - CMT | Maintain Agency Commission Configuration Over Time
  As a Contract Admin in CMT
  I want to be able to view and update the agency commission configuration for a participant
  So that commission behavior can be adjusted if contract terms change, with appropriate control

  Background:
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-16 @PP-16-UI-001 @p1 @smoke @positive @view-configuration
  Scenario: Verify Agency Commission configuration is visible for participant
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has Agency Commission configuration set
    Then I should be able to see the "Agency Commission Method" field value
    And I should be able to see whether "Read Agency Commission from BDX" is enabled
    And I should be able to see whether "Calculate Agency Commission in System" is enabled
    And I should be able to see the "Agency Commission rate interpretation" field value
    And I should be able to see whether the rate is interpreted as "Agency Commission Gross of Member Commission" or "Agency Commission Net of Member Commission"
    And I should be able to see the "Expected Agency Commission Rate" field value
    And I should be able to see any configured validation tolerances
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-002 @p1 @positive @view-configuration @data-driven
  Scenario Outline: Verify Agency Commission Method visibility for each option
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "Agency Commission Method" set to "<method>"
    Then I should be able to see that "Agency Commission Method" is "<method>"
    And I should be able to see whether "Read Agency Commission from BDX" is enabled: <read_from_bdx>
    And I should be able to see whether "Calculate Agency Commission in System" is enabled: <calculate_in_system>
    And I take a screenshot as evidence

    Examples:
      | method                                    | read_from_bdx | calculate_in_system |
      | Read Agency Commission from BDX          | true          | false               |
      | Calculate Agency Commission in System    | false         | true                |

  @PP-16 @PP-16-UI-003 @p1 @positive @view-configuration @data-driven
  Scenario Outline: Verify Agency Commission rate interpretation visibility for each option
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "Agency Commission rate interpretation" set to "<interpretation>"
    Then I should be able to see that "Agency Commission rate interpretation" is "<interpretation>"
    And I should be able to see whether the rate is interpreted as total inclusive: <is_total_inclusive>
    And I should be able to see whether the rate is interpreted as margin: <is_margin>
    And I take a screenshot as evidence

    Examples:
      | interpretation                                    | is_total_inclusive | is_margin |
      | Agency Commission Gross of Member Commission     | true               | false     |
      | Agency Commission Net of Member Commission       | false              | true      |

  @PP-16 @PP-16-UI-004 @p1 @positive @view-configuration
  Scenario: Verify Expected Agency Commission Rate is visible
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "Expected Agency Commission Rate" set to "5.5"
    Then I should be able to see the "Expected Agency Commission Rate" field
    And the "Expected Agency Commission Rate" should display "5.5"
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-005 @p1 @positive @view-configuration
  Scenario: Verify validation tolerances are visible when configured
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has validation tolerances configured
    Then I should be able to see the validation tolerances fields
    And I should be able to see the tolerance values
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-006 @p1 @positive @edit-configuration
  Scenario: Verify Agency Commission configuration can be updated
    Given I am logged in to Dynamics 365
    And I have appropriate permissions to edit Agency Commission configuration
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "Agency Commission Method" set to "Read Agency Commission from BDX"
    And I click Edit on the Participation Rule
    And I change the "Agency Commission Method" to "Calculate Agency Commission in System"
    And I change the "Expected Agency Commission Rate" to "6.25"
    And I save the Participation Rule record
    Then the Participation Rule should be saved successfully
    And the "Agency Commission Method" should display "Calculate Agency Commission in System"
    And the "Expected Agency Commission Rate" should display "6.25"
    And the updated values should be used going forward
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-007 @p1 @positive @edit-configuration @data-driven
  Scenario Outline: Verify Agency Commission Method can be updated between options
    Given I am logged in to Dynamics 365
    And I have appropriate permissions to edit Agency Commission configuration
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "Agency Commission Method" set to "<current_method>"
    And I click Edit on the Participation Rule
    And I change the "Agency Commission Method" to "<new_method>"
    And I save the Participation Rule record
    Then the Participation Rule should be saved successfully
    And the "Agency Commission Method" should display "<new_method>"
    And the updated method should be used going forward
    And I take a screenshot as evidence

    Examples:
      | current_method                            | new_method                                 |
      | Read Agency Commission from BDX          | Calculate Agency Commission in System    |
      | Calculate Agency Commission in System    | Read Agency Commission from BDX          |

  @PP-16 @PP-16-UI-008 @p1 @positive @edit-configuration @data-driven
  Scenario Outline: Verify Agency Commission rate interpretation can be updated between options
    Given I am logged in to Dynamics 365
    And I have appropriate permissions to edit Agency Commission configuration
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "Agency Commission rate interpretation" set to "<current_interpretation>"
    And I click Edit on the Participation Rule
    And I change the "Agency Commission rate interpretation" to "<new_interpretation>"
    And I save the Participation Rule record
    Then the Participation Rule should be saved successfully
    And the "Agency Commission rate interpretation" should display "<new_interpretation>"
    And the updated interpretation should be used going forward
    And I take a screenshot as evidence

    Examples:
      | current_interpretation                                    | new_interpretation                                    |
      | Agency Commission Gross of Member Commission            | Agency Commission Net of Member Commission            |
      | Agency Commission Net of Member Commission              | Agency Commission Gross of Member Commission          |

  @PP-16 @PP-16-UI-009 @p1 @positive @edit-configuration
  Scenario: Verify multiple Agency Commission configuration fields can be updated together
    Given I am logged in to Dynamics 365
    And I have appropriate permissions to edit Agency Commission configuration
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I click Edit on the Participation Rule
    And I change the "Agency Commission Method" to "Calculate Agency Commission in System"
    And I change the "Agency Commission rate interpretation" to "Agency Commission Net of Member Commission"
    And I change the "Expected Agency Commission Rate" to "7.5"
    And I update validation tolerances if applicable
    And I save the Participation Rule record
    Then the Participation Rule should be saved successfully
    And all updated configuration values should be saved
    And all updated values should be used going forward
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-010 @p1 @negative @permissions
  Scenario: Verify editing is restricted to authorized roles
    Given I am logged in to Dynamics 365
    And I do NOT have the required role to administer contract commission settings
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    Then the "Agency Commission Method" field should be read-only or not editable
    And the "Agency Commission rate interpretation" field should be read-only or not editable
    And the "Expected Agency Commission Rate" field should be read-only or not editable
    And I should NOT be able to click Edit on the Participation Rule
    And if I attempt to edit, I should see an appropriate message indicating I do not have permission
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-011 @p1 @negative @permissions
  Scenario: Verify unauthorized user sees permission error message when attempting to edit
    Given I am logged in to Dynamics 365
    And I do NOT have the required role to administer contract commission settings
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I attempt to edit the "Agency Commission Method" field
    Then the system should prevent editing
    And I should see an appropriate error message indicating I do not have permission to edit Agency Commission configuration
    And the message should indicate the required role or permission
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-012 @p2 @positive @audit-trail
  Scenario: Verify configuration change audit trail is accessible
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And I navigate to the audit trail or history section
    Then I should be able to see the audit trail or history for this Participation Rule
    And I should be able to see configuration change history
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-013 @p2 @positive @audit-trail
  Scenario: Verify audit trail shows who made configuration changes
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had Agency Commission configuration changes
    And I navigate to the audit trail or history section
    Then I should be able to see who made each configuration change
    And the audit trail should show the user who made the change
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-014 @p2 @positive @audit-trail
  Scenario: Verify audit trail shows when configuration changes were made
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had Agency Commission configuration changes
    And I navigate to the audit trail or history section
    Then I should be able to see when each configuration change was made
    And the audit trail should show the timestamp or date/time of each change
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-015 @p2 @positive @audit-trail
  Scenario: Verify audit trail shows old and new values for configuration changes
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had "Agency Commission Method" changed from "Read Agency Commission from BDX" to "Calculate Agency Commission in System"
    And I navigate to the audit trail or history section
    Then I should be able to see the configuration change in the audit trail
    And the audit trail should show the old value: "Read Agency Commission from BDX"
    And the audit trail should show the new value: "Calculate Agency Commission in System"
    And the audit trail should indicate which field was changed: "Agency Commission Method"
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-016 @p2 @positive @audit-trail @data-driven
  Scenario Outline: Verify audit trail shows old and new values for each configuration field
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had "<field_name>" changed from "<old_value>" to "<new_value>"
    And I navigate to the audit trail or history section
    Then I should be able to see the configuration change in the audit trail
    And the audit trail should show the old value: "<old_value>"
    And the audit trail should show the new value: "<new_value>"
    And the audit trail should indicate which field was changed: "<field_name>"
    And I take a screenshot as evidence

    Examples:
      | field_name                                    | old_value                                    | new_value                                    |
      | Agency Commission Method                     | Read Agency Commission from BDX             | Calculate Agency Commission in System       |
      | Agency Commission rate interpretation        | Agency Commission Gross of Member Commission | Agency Commission Net of Member Commission   |
      | Expected Agency Commission Rate              | 5.0                                         | 6.5                                         |

  @PP-16 @PP-16-UI-017 @p2 @positive @audit-trail
  Scenario: Verify audit trail shows complete change history for multiple updates
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had multiple Agency Commission configuration changes over time
    And I navigate to the audit trail or history section
    Then I should be able to see all configuration changes in chronological order
    And each change should show who made it, when it was made, and what changed
    And I should be able to see the complete history of configuration changes
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-16 @PP-16-UI-018 @p2 @positive @contract-level
  Scenario: Verify Agency Commission configuration viewable from Contract subgrid
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I open an existing Contract record
    And I navigate to the "Counterparty Relationships" subgrid section
    And I open a Counterparty Relationship record
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has Agency Commission configuration set
    Then I should be able to see all Agency Commission configuration fields
    And I should be able to see the current configuration values
    And I take a screenshot as evidence

  @PP-16 @PP-16-UI-019 @p2 @positive @read-only-view
  Scenario: Verify Agency Commission configuration is viewable in read-only mode
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record that is read-only
    And I navigate to the "Participation Rules" subgrid section
    And I open a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has Agency Commission configuration set
    Then I should be able to see all Agency Commission configuration fields
    And all fields should be displayed in read-only mode
    And I should be able to view the configuration values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 4
  # Coverage: 100%
  #
  # ✅ COVERED REQUIREMENTS:
  #   REQ-1: View configuration - Scenarios PP-16-UI-001 through PP-16-UI-005
  #   REQ-2: Edit configuration - Scenarios PP-16-UI-006 through PP-16-UI-009
  #   REQ-3: Restrict editing to authorized roles - Scenarios PP-16-UI-010, PP-16-UI-011
  #   REQ-4: Configuration change audit - Scenarios PP-16-UI-012 through PP-16-UI-017
  #
  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Note: Some steps may need to be created for:
  #   - Navigating to audit trail or history section
  #   - Verifying audit trail entries (who, when, what changed)
  #   - Checking user permissions/roles for Agency Commission configuration
  #   - Verifying read-only vs editable state of fields
  #
  # These steps should follow the existing Dynamics UI step definition patterns
  # and may require feature-specific step definitions if not already available.
