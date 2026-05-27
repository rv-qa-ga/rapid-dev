# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-899 - Opportunity type values
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-899 @rbt @medium
Feature: UI - SF-899 - Opportunity type values
  As MRD
  I want to select the correct Opportunity Type when creating a new Opportunity
  So that Opportunities are categorised correctly and legacy values are no longer used

  Background:
    Given I am logged in as a "QA MRD User" user
    Given an MRD has permission to create a new Opportunity
    And the Opportunity Type field is required on Opportunity creation (Opportuntiy.Type)
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-899 @SF-899-UI-001 @p1 @rbt
  Scenario: Opportunity Type must be selected when creating a new Opportunity
    Given an MRD creates a new Opportunity
    When the Opportunity creation screen is displayed
    Then the Opportunity Type field must be visible
    And there must be no default value selected
    And the MRD must be required to select an Opportunity Type before saving
    And the save must be prevented if no Opportunity Type is selected
    And I take a screenshot as evidence

  @SF-899 @SF-899-UI-002 @p1 @rbt
  Scenario: Existing Business and Member options are removed
    Given an MRD creates a new Opportunity
    When the MRD views the Opportunity Type dropdown
    Then the options “Existing Business” and “Member” must not be available for selection
    And I take a screenshot as evidence

  @SF-899 @SF-899-UI-003 @p1 @rbt
  Scenario: New Business label is changed to New Member
    Given an MRD creates a new Opportunity
    When the MRD views the Opportunity Type dropdown
    Then the label “New Business” must be displayed as “New Member”
    And the underlying API value must remain unchanged
    And I take a screenshot as evidence

  @SF-899 @SF-899-UI-004 @p1 @rbt
  Scenario: Expansions option is available
    Given an MRD creates a new Opportunity
    When the MRD views the Opportunity Type dropdown
    Then an additional option “Expansions” must be available for selection
    And I take a screenshot as evidence

  @SF-899 @SF-899-UI-005 @p1 @rbt
  Scenario: The Opportunity Type CANNOT be changed once an Opportunity is created
    Given an MRD creates a new Opportunity
    And they have selected an option form the Opportunity Type dropdown
    When the MRD creates the Opportunity
    And the field should *NOT* be editable
    And I take a screenshot as evidence

  @SF-899 @SF-899-UI-006 @p1 @rbt
  Scenario: When an Opportunity is created from a Lead Conversion the Opportunity Type should default to “New Member”
    Given a Lead has been converted to an Opportunity
    When the Opportunity is created by the system
    Then the Opportunity Type should default to ‘New Member’
    And the the field should *NOT* be editable
    And I take a screenshot as evidence

  @SF-899 @SF-899-UI-007 @p1 @rbt
  Scenario: When an Opportunity is created it must have a Status of Pipeline
    Given an MRD creates a New Opportunity
    And they have selected an option form the Opportunity Type dropdown
    When the MRD creates the Opportunity
    And I take a screenshot as evidence

