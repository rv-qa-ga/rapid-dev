# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-915 - Account Field Updates - Replaces Bug 851
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-915 @rbt @medium
Feature: UI - SF-915 - Account Field Updates - Replaces Bug 851
  As MRD
  I want to be able to see the right fields on Member and Non-Member MGA accounts
  So that the correct data is captured for the business

  Background:
    Given I am logged in as a "QA MRD User" user
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-915 @SF-915-UI-001 @p1 @rbt
  Scenario: Fields are visible only for the statuses they are mapped to
    Given the Account Status is set to a specific value
    When a user views the Account record
    Then only the fields mapped to that Account Status must be visible (see attachment)
    And fields not mapped to that Account Status must be hidden
    And I take a screenshot as evidence

  @SF-915 @SF-915-UI-002 @p1 @rbt
  Scenario: When Account Status changes, field visibility updates accordingly
    Given An Account exists with an initial Status
    And a set of fields is visible for that initial Status
    When the Account Status is changed to a new Status
    Then the fields visible on the Account must update to match the mapping for the new Status
    And any fields not mapped to the new Status must no longer be visible
    And any fields mapped to the new Status must become visible
    And I take a screenshot as evidence

  @SF-915 @SF-915-UI-003 @p1 @rbt
  Scenario: Deleting fields
    Given an Account exists
    When there is a field marked as ‘Delete’
    Then this field should be deleted from the view
    And should not be visible for any status for Member/Non-Member MGA accounts
    And I take a screenshot as evidence

  @SF-915 @SF-915-UI-004 @p1 @rbt
  Scenario: Status-driven field visibility does not apply to other Account Types
    Given An Account exists
    When a user views or edits the Account record
    Then the status-driven field visibility rules must not be applied
    And no fields should be hidden or shown due to the status-to-field mapping logic
    And I take a screenshot as evidence

