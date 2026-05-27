# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-800 - Publish Platform Events for Reference Data Integration
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-800 @rbt @medium
Feature: UI - SF-800 - Publish Platform Events for Reference Data Integration
  As user
  I want Publish Platform Events for Reference Data Integration
  So that is becomes eligible  And the reference data update is saved successfully  Then areference data Platform Event is published  And the event action is ‘Create’  And the event includes Record ID  And the

  Background:
    Given I am logged in as a "QA MRD User" user
    Given Salesforce publishes reference data Platform Events for downstream integration
    And reference data eligibility is determined by an addition to the reference data
    And Salesforce does not publish Platform Events for ineligible reference data
    And each reference data Platform Event includes the Record ID and Event Identifier
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-800 @SF-800-UI-001 @p1 @rbt
  Scenario: Publish Platform Event for eligible reference data value addition
    Given a new reference data value is created in Salesforce
    When the addition to the reference data is saved successfully
    Then a Platform Event is published
    And the event action is ‘Create’
    And the event includes the Record ID
    And the event includes an Identifier
    And the event indicates which ref data table has been updated
    And I take a screenshot as evidence

  @SF-800 @SF-800-UI-002 @p1 @rbt
  Scenario: Do not publish Create event when reference data value is not eligible
    Given a new reference data is created in Salesforce
    And the reference data does not meet the eligibility criteria for Dataverse synchronisation
    When the reference data is saved successfully
    Then no reference data Platform Event is published
    And I take a screenshot as evidence

  @SF-800 @SF-800-UI-003 @p1 @rbt
  Scenario: Publish Update event for any update to an eligible reference data value
    Given an existing eligible reference data exists in Salesforce
    And the reference data meets the eligibility criteria for Dataverse synchronisation
    When any field within in the reference data is updated
    And the reference data is saved successfully
    Then a reference data Update Platform Event is published
    And the event includes the Record ID
    And the event includes an Identifier
    And the event indicates which ref data table has been updated
    And I take a screenshot as evidence

  @SF-800 @SF-800-UI-004 @p1 @rbt
  Scenario: Do not publish Update event when reference data is not eligible
    Given an existing reference data exists in Salesforce
    And the reference data does not meet the eligibility criteria for Dataverse synchronisation
    When the reference data is updated
    And the reference data is saved successfully
    Then no reference data Platform Event is published
    And I take a screenshot as evidence

  @SF-800 @SF-800-UI-005 @p1 @rbt
  Scenario: Do not publish event if the reference data transaction fails
    Given an reference data is created or updated
    When the save operation fails
    Then no reference data Platform Event is published
    And I take a screenshot as evidence

  @SF-800 @SF-800-UI-006 @p1 @rbt
  Scenario: reference data deactivation is handled by lifecycle status rather than deletion
    Given an reference data exists in Salesforce
    When the reference data is no longer operational
    Then the reference data Status is updated to an ‘Inactive’ value
    And an reference data Platform Event is published with action ‘Update’
    And no delete event is published
    And I take a screenshot as evidence

  @SF-800 @SF-800-UI-007 @p1 @rbt
  Scenario: Published Platform Event includes traceability metadata
    Given a reference data Platform Event is published
    Then the event includes a unique event identifier
    And the event includes the Salesforce Account Id
    And the event includes an event timestamp
    And the event action is populated
    And I take a screenshot as evidence

  @SF-800 @SF-800-UI-008 @p1 @rbt
  Scenario: Publish event when a reference data becomes eligible due to a status change
    Given an existing reference data exists in Salesforce
    And the reference data is not eligible for Dataverse synchronisation
    When the reference data is updated so that is becomes eligible
    And the reference data update is saved successfully
    Then areference data Platform Event is published
    And the event action is ‘Create’
    And the event includes Record ID
    And the event includes an Identifier
    And the event indicates which ref data table has been updated
    And I take a screenshot as evidence

