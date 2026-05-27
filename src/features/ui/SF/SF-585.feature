# JIRA: SF-585 - TPA Maps
# Regenerated from Jira description (Mode 4 RBT) - no generator
# Mode: 4 - Risk-Based Testing (RBT)
# RBT: UI test cases from acceptance criteria; API minimal 1-2 smoke tests.
#
# Story: As a Data Steward I want only valid relationships between account types
# to be created and maintained so that our organisational hierarchy remains
# accurate and consistent.
# Key scenarios: TPA may relate to TPA Group with Valid From/To; Master ID
# system-controlled and read-only.

@ui @salesforce @SF-585 @medium @salesforce @SF-585-RBT @account @tpa-maps
Feature: SF-585 - TPA Maps
  As a Data Steward
  I want only valid relationships between account types (e.g. TPA to TPA Group) to be created and maintained
  So that our organisational hierarchy remains accurate and consistent

  Background:
    Given I am an authenticated Salesforce user

  # RBT: Scenario 1 - TPA to TPA Group relationship with validity dates
  @SF-585 @SF-585-UI-001 @p1 @smoke @rbt @tpa-relationship
  Scenario: TPA can be related to TPA Group with Valid From and Valid To dates
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an Account with Type "Third Party Administrator (TPA)" created via API
    And I have an Account with Type "TPA Group" created via API
    When I navigate to the Account record
    And I open or navigate to the Account relationship section
    Then the "Valid From" field should be visible
    And the "Valid To" field should be visible
    And I take a screenshot as evidence

  # RBT: Scenario 2 - Master ID is system-controlled and read-only
  @SF-585 @SF-585-UI-002 @p1 @rbt @master-id @read-only
  Scenario: Master ID is auto-populated and not editable by users
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a relationship record between two Accounts
    When I navigate to the relationship record
    Then the "Master_ID__c" field should be visible
    And the "Master_ID__c" field should not be editable
    And I take a screenshot as evidence

  # RBT: Field visibility for relationship object
  @SF-585 @SF-585-UI-003 @p2 @rbt @field-visibility
  Scenario: Valid From, Valid To and Master ID fields are visible to admin on relationship
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I set the "Type" field to "Third Party Administrator (TPA)"
    Then the "Valid_From__c" field should be visible
    And the "Valid_To__c" field should be visible
    And I take a screenshot as evidence

  # RBT: Invalid relationship prevented (boundary)
  @SF-585 @SF-585-UI-004 @p2 @rbt @negative
  Scenario: Only valid account type relationships are allowed
    Given I am logged in as a "Accelerant - System administrator" user
    When I attempt to create an invalid account type relationship
    Then the system must prevent the invalid relationship
    And I take a screenshot as evidence
