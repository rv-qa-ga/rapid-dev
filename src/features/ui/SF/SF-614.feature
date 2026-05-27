# JIRA: SF-614 - Derive and maintain Is_Active__c on Member Legal Entity Relationship records
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - Risk-Based Testing (RBT)
# RBT: UI test cases from acceptance criteria; API minimal 1-2 smoke tests.
#
# Story: The relationship's active/inactive state must be derived from Start and
# End dates and stored on the record (Is_Active__c) for integrations and
# reporting. Field is system-derived, hidden from UI, available to integration
# users and system administrators.

@ui @salesforce @SF-614 @medium @salesforce @SF-614-RBT @member-legal-entity-relationship @is-active
Feature: SF-614 - Derive and maintain Is_Active__c on Member Legal Entity Relationship records
  As an Integration User
  I want the active/inactive state of a Member Legal Entity Relationship to be explicitly derived and stored
  So that downstream systems can reliably determine the lifecycle state without re-deriving business logic

  Background:
    Given I am an authenticated Salesforce user

  # RBT: Field exists and is derived from Start/End dates; hidden from UI
  @SF-614 @SF-614-UI-001 @p1 @smoke @rbt @field-exists
  Scenario: Is_Active__c field exists on Member Legal Entity Relationship and is populated from Start/End dates
    Given the Member Legal Entity Relationship object exists
    When the object is configured per the story
    Then the field "Is_Active__c" must exist
    And it must be populated based on Start and End Dates
    And it must be hidden from the UI page layout for all users
    And it must be available to integration users and system administrators
    And I take a screenshot as evidence

  # RBT: Is_Active__c = true when Start Date reached and End Date blank
  @SF-614 @SF-614-UI-002 @p1 @rbt @active-no-end
  Scenario: Is_Active__c is set to Active when Start Date is reached and End Date is blank
    Given a Member Legal Entity Relationship record exists
    And Start Date is on or before today
    And End Date is blank
    When the record is created or updated
    Then Is_Active__c must be set to true
    And I take a screenshot as evidence

  # RBT: Is_Active__c = true when Start Date reached and End Date in future
  @SF-614 @SF-614-UI-003 @p1 @rbt @active-end-future
  Scenario: Is_Active__c is set to Active when Start Date is reached and End Date is in the future
    Given a Member Legal Entity Relationship record exists
    And Start Date is on or before today
    And End Date is on or after today
    When the record is created or updated
    Then Is_Active__c must be set to true
    And I take a screenshot as evidence

  # RBT: Is_Active__c = false when Start Date in future
  @SF-614 @SF-614-UI-004 @p1 @rbt @inactive-future-start
  Scenario: Is_Active__c is set to Inactive when Start Date is in the future
    Given a Member Legal Entity Relationship record exists
    And Start Date is after today
    When the record is created or updated
    Then Is_Active__c must be set to false
    And I take a screenshot as evidence

  # RBT: Is_Active__c = false when End Date in past
  @SF-614 @SF-614-UI-005 @p1 @rbt @inactive-past-end
  Scenario: Is_Active__c is set to Inactive when End Date is in the past
    Given a Member Legal Entity Relationship record exists
    And End Date is before today
    When the record is created or updated
    Then Is_Active__c must be set to false
    And I take a screenshot as evidence

  # RBT: Recalculation when Start or End Date changes
  @SF-614 @SF-614-UI-006 @p1 @rbt @recalculate
  Scenario: Is_Active__c is recalculated when Start Date or End Date changes
    Given a Member Legal Entity Relationship record exists
    When Start Date or End Date is updated
    Then Is_Active__c must be recalculated based on the updated dates
    And I take a screenshot as evidence

  # RBT: End Date changed from past to future sets Active
  @SF-614 @SF-614-UI-007 @p1 @rbt @end-date-past-to-future
  Scenario: Is_Active__c is set to Active when End Date is changed from past to future
    Given a Member Legal Entity Relationship record exists
    And Start Date is on or before today
    And End Date is before today
    And Is_Active__c is false
    When the End Date is updated to a date on or after today
    Then Is_Active__c must be recalculated
    And Is_Active__c must be set to true
    And I take a screenshot as evidence

  # RBT: No change when derived status unchanged
  @SF-614 @SF-614-UI-008 @p2 @rbt @no-transition
  Scenario: Is_Active__c remains unchanged when dates do not cause a status change
    Given a Member Legal Entity Relationship record exists
    When the relationship dates are updated but do not change the derived active/inactive status
    Then Is_Active__c must remain unchanged
    And I take a screenshot as evidence

  # RBT: Permissions - field hidden from UI
  @SF-614 @SF-614-UI-009 @p2 @rbt @permissions
  Scenario: Is_Active__c is hidden from user interfaces for standard users
    Given I am logged in as a standard user
    And I have an existing Member Legal Entity Relationship record
    When I navigate to the Member Legal Entity Relationship record
    Then the "Is_Active__c" field should not be visible on the page layout
    And I take a screenshot as evidence

  # RBT: System admin / integration can access via API or limited UI
  @SF-614 @SF-614-UI-010 @p2 @rbt @admin-access
  Scenario: Is_Active__c is available to system administrators for integration and reporting
    Given I am logged in as a "Accelerant - System administrator" user
    When I query or access Member Legal Entity Relationship records via supported means
    Then Is_Active__c must be available (e.g. via API or report)
    And I take a screenshot as evidence
