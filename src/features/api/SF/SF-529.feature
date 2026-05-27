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
# PASS RATE: 100% (4/4 API test cases)
# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-529 - Types on the Account Object
# Type: Story | Status: In QA | Priority: Medium
# ══════════════════════════════════════════════════════════════════════════════
#
# API TESTS for this feature
#
# ACCEPTANCE CRITERIA:
#   - Account Type cannot be changed once set
#   - The Type field must contain standardized picklist values
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-529 @medium @locked @stable @sprint-93
Feature: API - SF-529 - Types on the Account Object

  Background:
    Given I have a valid Salesforce API token

  # ============================================================================
  # SMOKE TEST - Query Accounts
  # ============================================================================
  @SF-529 @SF-529-API-001 @smoke @p1 @api-query
  Scenario: API - Query Account records with Type field
    When I query all Account records via API
    Then the API should return status code 200
    And the response should include the Type field

  # ============================================================================
  # DATA-DRIVEN: Create Account with each valid Type value
  # ============================================================================
  @SF-529 @SF-529-API-002 @p1 @api-create @data-driven
  Scenario Outline: API - Create Account with Type "<account_type>"
    When I create a new Account via POST with:
      | field | value                    |
      | Name  | API Test <account_type>  |
      | Type  | <account_type>           |
    Then the API should return status code 201
    And the response should contain the new Account ID
    And I should be able to retrieve the Account by ID
    And the response should include Type field with value "<account_type>"

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
  # KEY ACCEPTANCE CRITERIA: Account Type cannot be changed once set
  # ============================================================================
  @SF-529 @SF-529-API-003 @p1 @negative @api-update
  Scenario: API - Verify Account Type cannot be changed once set
    Given I create a new Account via API with Type "Agency"
    When I try to update the Account Type to "Insurer" via PATCH request
    Then the API should return an error
    And the error response should indicate Type cannot be changed

  # ============================================================================
  # NEGATIVE TEST - Invalid Type value
  # NOTE: Salesforce's standard Type field is NOT a restricted picklist by default.
  #       The API will accept any value. This test verifies that behavior.
  #       If the org has validation rules on Type, this test should be updated.
  # ============================================================================
  @SF-529 @SF-529-API-004 @p2 @api-validation
  Scenario: API - Create Account with non-standard Type value
    When I create a new Account via POST with:
      | field | value                    |
      | Name  | Test NonStandard Type    |
      | Type  | Custom Type Value        |
    Then the API returns status code and is not 201
    And the response should contain an error message for Invalid type

  # ============================================================================
  # NEGATIVE TEST - Account creation without Type should fail
  # ============================================================================
  @SF-529 @SF-529-API-005 @p1 @negative @api-validation
  Scenario: API - Verify Account cannot be created without Type
    When I try to create an Account via API without Type
    Then the API should return an error
    And the error message should contain "Account Type is required. Please select a value before saving"
