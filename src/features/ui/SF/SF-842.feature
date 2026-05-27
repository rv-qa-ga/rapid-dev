# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-842 - Derive and maintain Is_Active__c on Account Relationship records (TPA Relationships)
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-842 @rbt @medium
Feature: UI - SF-842 - Derive and maintain Is_Active__c on Account Relationship records (TPA Relationships)
  As Integration User
  I want the active/inactive state of a Account Relationship (TPA Maps) to be explicitly derived and stored
  So that downstream systems can reliably determine the lifecycle state without re-deriving business logic.

  Background:
    Given I am logged in as a "QA MRD User" user
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-842 @SF-842-UI-001 @p1 @rbt
  Scenario: Is_Active__c field exists on Account Relationship (TPA Maps) Relationship
    Given the Account Relationship (TPA Maps) object exists
    Then a new field named "Is_Active__c" should be created
    And it must be populated based on Valid From and Valid To Dates
    And it must be hidden from the UI page layout for all users
    And it must be available to integration users and system administrators
    And I take a screenshot as evidence

  @SF-842 @SF-842-UI-002 @p1 @rbt
  Scenario: Is_Active__c is set to Active when Valid From Date is reached and the Valid To Date is blank
    Given an Account Relationship (TPA Maps) record exists
    And Valid from Date is on or before today
    And Valid to Date is blank
    When the record is created or updated
    Then Is_Active__c is set to true
    And I take a screenshot as evidence

  @SF-842 @SF-842-UI-003 @p1 @rbt
  Scenario: Is_Active__c is set to Active when the Valid From  Date is reached and the Valid To Date is in the future
    Given an Account Relationship (TPA Maps) record exists
    And Valid From Date is on or before today
    And Valid To Date is on or after today
    When the record is created or updated
    Then Is_Active__c is set to true
    And I take a screenshot as evidence

  @SF-842 @SF-842-UI-004 @p1 @rbt
  Scenario: Is_Active__c is set to Inactive when Valid From Date is in the future
    Given an Account Relationship (TPA Maps) record exists
    And Valid From Date is after today
    When the record is created or updated
    Then Is_Active__c is set to false
    And I take a screenshot as evidence

  @SF-842 @SF-842-UI-005 @p1 @rbt
  Scenario: Is_Active__c is set to Inactive when Valid To Date is in the past
    Given an Account Relationship (TPA Maps) record exists
    And Valid To Date is before today
    When the record is created or updated
    Then Is_Active__c is set to false
    And I take a screenshot as evidence

  @SF-842 @SF-842-UI-006 @p1 @rbt
  Scenario: Is_Active__c is recalculated when Valid From Date or Valid To Date changes
    Given an Account Relationship (TPA Maps) record exists
    When Valid From Date or Valid To Date is updated
    Then Is_Active__c is recalculated based on the updated dates
    And I take a screenshot as evidence

  @SF-842 @SF-842-UI-007 @p1 @rbt
  Scenario: Is_Active__c is set to Active when End Date is changed from past to future
    Given a Account Relationship (TPA Maps) record exists
    And Start Date is on or before today
    And End Date is before today
    And Is_Active__c is false
    When the End Date is updated to a date on or after today
    Then Is_Active__c is recalculated
    And Is_Active__c is set to true
    And I take a screenshot as evidence

  @SF-842 @SF-842-UI-008 @p1 @rbt
  Scenario: Is_Active__c is recalculated when the date changes and causes a status transition
    Given an Account Relationship (TPA Maps) record exists
    And Is_Active__c is true
    And Valid To Date is tomorrow
    When the current date becomes the day after tomorrow
    Then Is_Active__c is set to false
    And I take a screenshot as evidence

  @SF-842 @SF-842-UI-009 @p1 @rbt
  Scenario: Is_Active__c transitions occur only when the derived status changes
    Given an Account Relationship (TPA Maps) record exists
    When the relationship dates do not cause a change in derived status
    Then Is_Active__c remains unchanged
    And I take a screenshot as evidence

  @SF-842 @SF-842-UI-010 @p1 @rbt
  Scenario: To date is prevented from being before From date
    Given an Account Relationship (TPA Maps) record exists
    And the From date contains a value
    When the To date is attempted to be saved prior to the from date
    Then action is prevented
    And the user sees the error message Active to date must be equal to or later than Valid from date”
    And I take a screenshot as evidence

