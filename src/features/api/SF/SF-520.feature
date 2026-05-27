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
# PASS RATE: 100% (5/5 API test cases)
# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-520 - Account Status Field
# Type: Story | Status: In QA | Priority: Medium
# ══════════════════════════════════════════════════════════════════════════════
#
# API TESTS for this feature
#
# VALID VALUES FOR API TESTING:
#   • New
#   • Prospect
#   • Onboarding
#   • Contracted
#   • Runoff
#   • Offboarded
#   • Invalid
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-520 @medium @locked @stable @sprint-93
Feature: API - SF-520 - Account Status Field

  Background:
    Given I have a valid Salesforce API token

  @SF-520 @SF-520-API-001 @smoke @p1 @api-query
  Scenario Outline: API - Query Account by Status
    Given I have an Account with Status "<value>"
    When I query Account where Status equals "<value>"
    Then the API should return status code 200
    And the response should contain Account records

    Examples:
      | value |
      | New |
      | Prospect |
      | Onboarding |
      | Contracted |
      | Runoff |
      | Offboarded |
      | Invalid |

  @SF-520 @SF-520-API-002 @p1 @api-update
  Scenario Outline: API - Update Status with valid values
    Given I have an existing Account record
    When I update the Status to "<value>" via PATCH request
    Then the API should return status code 204
    And querying the Account should show Status as "<value>"

    Examples:
      | value |
      | New |
      | Prospect |
      | Onboarding |
      | Contracted |
      | Runoff |
      | Offboarded |
      | Invalid |

  @SF-520 @SF-520-API-003 @p1 @api-create
  Scenario: API - Create Account with Status
    When I create a new Account via POST with:
      | field | value |
      | Name | Test Account via API |
      | Status | New |
    Then the API should return status code 201
    And the response should contain the new Account ID

  @SF-520 @SF-520-API-004 @p2 @negative @api-validation
  Scenario: API - Reject invalid Status value
    Given I have an existing Account record
    When I update the Status to "INVALID_VALUE_###" via PATCH request
    Then the API should return status code 400
    And the error response should contain a validation message

  @SF-520 @SF-520-API-005 @p2 @api-bulk
  Scenario: API - Bulk update Status
    Given I have 3 Account records
    When I bulk update the Status via composite API
    Then all records should be updated successfully
    And the API should return status code 200
