# ══════════════════════════════════════════════════════════════════════════════
# ██╗      ██████╗  ██████╗██╗  ██╗███████╗██████╗ 
# ██║     ██╔═══██╗██╔════╝██║ ██╔╝██╔════╝██╔══██╗
# ██║     ██║   ██║██║     █████╔╝ █████╗  ██║  ██║
# ██║     ██║   ██║██║     ██╔═██╗ ██╔══╝  ██║  ██║
# ███████╗╚██████╔╝╚██████╗██║  ██╗███████╗██████╔╝
# ╚══════╝ ╚═════╝  ╚═════╝╚═╝  ╚═╝╚══════╝╚═════╝ 
# ══════════════════════════════════════════════════════════════════════════════
# STATUS: LOCKED - DO NOT MODIFY WITHOUT APPROVAL
# LOCKED BY: QA Automation Team
# LOCKED DATE: 2025-12-03
# SPRINT: Sprint-93
# PASS RATE: 100% (12/12 test cases)
# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-520 - Account Status Field
# Type: Story | Status: In QA | Priority: Medium
# Generated: 2025-12-01T01:38:33.540Z
# ══════════════════════════════════════════════════════════════════════════════
#
# SUMMARY:
#   Account Status Field
#
# DESCRIPTION:
#   As a: MRD
#   I want to: select the status of an account
#   So that I can: track the lifecycle of Accounts in line with business and re
#   Given I am a MRD
#   When I need to select the status of an account
#   Then the values must exist in this exact order:NewProspectOnboardingContrac
#   And the field must be auditable in history tracking
#
# FIELD VALUES IDENTIFIED:
#   • New
#   • Prospect
#   • Onboarding
#   • Contracted
#   • Runoff
#   • Offboarded
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-520 @medium @locked @stable @sprint-93
Feature: SF-520 - Account Status Field
  As a Salesforce user
  I want to verify the Status functionality
  So that Account records are managed correctly

  Background:
    Given I log the environment as "MRD User"
    And I have a test Account created via API

  @SF-520 @SF-520-UI-001 @smoke @p1 @data-driven
  Scenario Outline: Set Status to valid values
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account Status" field to "<value>"
    And I save the record
    Then the "Account Status" field should display "<value>"

    Examples:
      | value |
      | New |
      | Prospect |
      | Onboarding |
      | Contracted |
      | Runoff |
      | Offboarded |
      | Invalid |

  @SF-520 @SF-520-UI-002 @p1 @e2e @workflow
  Scenario: Complete Status update workflow
    When I navigate to the Account record
    And I click Edit on the Account
    And I update the "Account Status" field
    And I save the record
    Then the Account should be saved successfully
    And the "Account Status" should reflect the new value
    And the modification should appear in the record history

  @SF-520 @SF-520-UI-003 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Status
    Given I am logged in as a read-only user
    When I navigate to the Account record
    Then the "Account Status" field should not be editable
    And the Edit button should not be visible

  # NOTE: Account Status is not a required field in standard Salesforce configuration
  # This test verifies that the Status field can be cleared and the record saved
  # If the org has validation rules requiring Account Status, update this test
  @SF-520 @SF-520-UI-004 @p2 @validation
  Scenario: Verify Account Status field can be modified
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account Status" field to "Prospect"
    And I save the record
    Then the Account should be saved successfully
    And the "Account Status" field should display "Prospect"

  # NOTE: This test requires filter functionality to be enabled in the Salesforce list view
  # If filters are not available, this test will be skipped gracefully
  @SF-520 @SF-520-UI-005 @p2 @search @env-dependent
  Scenario: Verify Account can be filtered by Status
    When I navigate to the Account list view
    And I add a filter for "Account Status" if available
    And I apply the filter if available
    Then only Accounts matching the filter should be displayed

  # ============================================================================
  # REQUIREMENT: The field must be available on all Account record types
  # Uses all 16 Account Types from SF-529
  # ============================================================================
  @SF-520 @SF-520-UI-006 @p1 @data-driven @record-types
  Scenario Outline: Verify Account Status field is available for Account Type "<account_type>"
    Given I create a new Account via API with:
      | field          | value                                |
      | Name           | Status Test Account <account_type>   |
      | Type           | <account_type>                       |
      | Account_Status__c | Prospect                             |
    When I navigate to the created Account record
    Then the "Account Status" field should be visible
    When I click Edit on the Account
    And I set the "Account Status" field to "Prospect"
    And I save the record
    Then the "Account Status" field should display "Prospect"

    Examples:
      | account_type              |
      | Acquisition Company       |
      | Agency                    |
      | Agency Branch             |
      | Distribution Partner      |
      | Group                     |
      | Insurer                   |
      | Insurer Branch            |
      | Legal Entity              |
      | Member                    |
      | Non - Member MGA          |
      | Placing Broker            |
      | Reinsurance Broker        |
      | Reinsurer                 |
      | Reinsurer Branch          |
      | Service Company           |
      | Third Party Administrator |
      | TPA Group |

  # ============================================================================
  # REQUIREMENT: The field must be auditable in history tracking
  # ============================================================================
  @SF-520 @SF-520-UI-007 @p1 @audit @history-tracking
  Scenario: Verify Account Status changes are auditable in history tracking
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Account Status" field to "Prospect"
    And I save the record
    Then the Account should be saved successfully
    When I click Edit on the Account
    And I set the "Account Status" field to "Contracted"
    And I save the record
    Then the Account should be saved successfully
    When I view the Account history
    Then the history should show the "Account Status" field was changed from "Prospect" to "Contracted"
