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
# PASS RATE: 89% (8/9 test cases) - 1 intermittent timeout
# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-529 - Types on the Account Object
# Type: Story | Status: In QA | Priority: Medium
# ══════════════════════════════════════════════════════════════════════════════
#
# SUMMARY:
#   Types on the Account Object
#
# ACCEPTANCE CRITERIA:
#   - Account Type cannot be changed once set
#   - The Type field must contain standardized picklist values
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-529 @medium @locked @stable @sprint-93
Feature: SF-529 - Types on the Account Object
  As a Salesforce user
  I want to verify the Types on the Account Object functionality
  So that Account records are classified consistently

  Background:
    Given I am an authenticated Salesforce user

  # ============================================================================
  # SMOKE TEST - Verify Type field is displayed
  # ============================================================================
  @SF-529 @SF-529-UI-001 @smoke @p1
  Scenario: Verify Type field is displayed on Account
    Given I have a test Account created via API
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And the "Type" field should be visible

  # ============================================================================
  # KEY ACCEPTANCE CRITERIA: Account Type cannot be changed once set
  # NOTE: This validation depends on org-specific rules. The test verifies:
  # 1. Either the Type change is blocked with a validation error
  # 2. Or the Type field is read-only after initial creation
  # ============================================================================
  @SF-529 @SF-529-UI-002 @p1 @e2e @validation
  Scenario: Verify Account Type field behavior after creation
    Given I have a test Account created via API with Type "Agency"
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And the "Type" field should display "Agency"
    When I click Edit on the Account
    Then the "Type" field should not be editable or should show validation on change

  # ============================================================================
  # DATA-DRIVEN: Create NEW Accounts with each valid Type value via API
  # Then verify the Type is correctly displayed in UI
  # ============================================================================
  @SF-529 @SF-529-UI-003 @p1 @e2e @workflow @data-driven
  Scenario Outline: Create Account with Type "<account_type>" and verify in UI
    Given I create a new Account via API with:
      | field   | value                            |
      | Name    | Test <account_type> Account      |
      | Type    | <account_type>                   |
    When I navigate to the created Account record
    Then Verify that Test Account is displayed
    And the "Type" field should display "<account_type>"

    Examples:
      | account_type                |
      | Acquisition Company         |
      | Agency                      |
      | Agency Branch               |
      | Distribution Partner        |
      | Group                       |
      | Insurer                     |
      | Insurer Branch              |
      | Legal Entity                |
      | Member                      |
      | Non - Member MGA            |
      | Placing Broker              |
      | Reinsurance Broker          |
      | Reinsurer                   |
      | Reinsurer Branch            |
      | Service Company             |
      | Third Party Administrator   |

  # ============================================================================
  # PERMISSIONS TEST
  # ============================================================================
  @SF-529 @SF-529-UI-004 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Type field
    Given I have a test Account created via API
    Given I am logged in as a read-only user
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And the "Type" field should not be editable

  # ============================================================================
  # SEARCH/FILTER TEST
  # NOTE: This test requires filter functionality to be enabled in the Salesforce list view
  # If filters are not available, this test will be skipped gracefully
  # ============================================================================
  @SF-529 @SF-529-UI-005 @p2 @search @data-driven @env-dependent
  Scenario Outline: Verify Account can be filtered by Type
    Given I create a new Account via API with:
      | field   | value                            |
      | Name    | Filter Test <account_type>       |
      | Type    | <account_type>                   |
    When I navigate to the Account list view
    And I add a filter for "Type" if available
    And I set the filter value to "<account_type>" if available
    And I apply the filter if available
    Then only Accounts matching the filter should be displayed

    Examples:
      | account_type        |
      | Agency              |
      | Insurer             |
      | Member              |

  # ============================================================================
  # NEGATIVE TEST - Account creation without Type should fail
  # ============================================================================
  @SF-529 @SF-529-UI-006 @p1 @negative @validation
  Scenario: Verify Account cannot be created without Type via API
    When I try to create an Account via API without Type
    Then the API should return an error
    And the error message should contain "Account Type is required. Please select a value before saving"
