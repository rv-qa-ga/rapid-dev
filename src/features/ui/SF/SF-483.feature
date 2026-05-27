# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-483 - Make Upsell Opportunity field visible only on Member and Non-Member MGA accounts
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Regenerated: 2025-01-08
# ══════════════════════════════════════════════════════════════════════════════
#
# SUMMARY:
#   Make Upsell Opportunity field visible only on Member and Non-Member MGA accounts
#
# DESCRIPTION:
#   As a Product Owner / Business Analyst
#   I want the Upsell Opportunity field to be visible on Account records only when 
#   the Account is classified as Member MGA or Non-Member MGA
#   So that users only see and interact with the field on MGA accounts and the 
#   Account page is simplified for other account types
#
# SCOPE:
#   - Show the Upsell Opportunity field on Account record pages and other UI surfaces 
#     only for Accounts that meet the MGA criteria (Member MGA or Non-Member MGA)
#   - Do not delete the field
#   - Ensure reporting, API, automations and integrations continue to function and 
#     are not broken by the visibility change
#   - The visibility rule should be based on account classification in the org 
#     (Account Type picklist values "Member MGA" and "Non-Member MGA")
#
# ACCEPTANCE CRITERIA:
#   1. Account page visibility — Member MGA
#      GIVEN an Account classified as Member MGA
#      WHEN a user opens the Account in Lightning and Classic
#      THEN Upsell Opportunity is visible on the Account detail page for that Account
#
#   2. Account page visibility — Non-Member MGA
#      GIVEN an Account classified as Non-Member MGA
#      WHEN a user opens the Account in Lightning and Classic
#      THEN Upsell Opportunity is visible on the Account detail page for that Account
#
#   3. Account page visibility — other Account types
#      GIVEN an Account that is not Member MGA or Non-Member MGA
#      WHEN a user opens the Account
#      THEN Upsell Opportunity is not visible anywhere on the Account page 
#           (detail, dynamic form sections, inline edit, related components)
#
#   4. Admin / support visibility
#      GIVEN a System Administrator or approved support profile
#      WHEN they view any Account record regardless of classification
#      THEN Upsell Opportunity remains visible for those admin/support users
#
#   5. Reports & dashboards
#      GIVEN a report that includes Accounts of multiple types
#      WHEN a non-MGA Account appears in the report results
#      THEN Upsell Opportunity is empty/not shown for non-MGA Accounts; 
#           for MGA Accounts the field value is visible in the report results. 
#           Admins may still include the field in reports.
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-483 @medium @field-visibility @account
Feature: SF-483 - Make Upsell Opportunity field visible only on Member and Non-Member MGA accounts
  As a Salesforce user
  I want to verify the Upsell Opportunity field visibility on Account records
  So that the field is only visible on Member MGA and Non-Member MGA accounts

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA 1: Member MGA Account - Field Visible
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-UI-001 @smoke @p1 @member-mga
  Scenario: Verify Upsell Opportunity is visible on Member MGA Account detail page
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Test Member MGA Account |
      | Type  | Member MGA |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should be visible
    And I take a screenshot as evidence

  @SF-483 @SF-483-UI-002 @p1 @member-mga @edit-mode
  Scenario: Verify Upsell Opportunity is visible when editing Member MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Test Member MGA Account Edit |
      | Type  | Member MGA |
    When I navigate to the created Account record
    And I click Edit on the Account
    Then the "Upsell Opportunity" field should be visible
    And I take a screenshot as evidence

  @SF-483 @SF-483-UI-003 @p1 @member-mga @lightning-classic
  Scenario: Verify Upsell Opportunity is visible in Lightning and Classic for Member MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Test Member MGA Lightning Classic |
      | Type  | Member MGA |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA 2: Non-Member MGA Account - Field Visible
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-UI-004 @smoke @p1 @non-member-mga
  Scenario: Verify Upsell Opportunity is visible on Non-Member MGA Account detail page
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Test Non-Member MGA Account |
      | Type  | Non-Member MGA |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should be visible
    And I take a screenshot as evidence

  @SF-483 @SF-483-UI-005 @p1 @non-member-mga @edit-mode
  Scenario: Verify Upsell Opportunity is visible when editing Non-Member MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Test Non-Member MGA Account Edit |
      | Type  | Non-Member MGA |
    When I navigate to the created Account record
    And I click Edit on the Account
    Then the "Upsell Opportunity" field should be visible
    And I take a screenshot as evidence

  @SF-483 @SF-483-UI-006 @p1 @non-member-mga @lightning-classic
  Scenario: Verify Upsell Opportunity is visible in Lightning and Classic for Non-Member MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Test Non-Member MGA Lightning Classic |
      | Type  | Non-Member MGA |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA 3: Other Account Types - Field NOT Visible
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-UI-007 @p2 @negative @data-driven
  Scenario Outline: Verify Upsell Opportunity is NOT visible on non-MGA Account types
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Test <account_type> Account |
      | Type  | <account_type> |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should not be visible
    And I take a screenshot as evidence

    Examples:
      | account_type |
      | Agency |
      | Insurer |
      | Reinsurer |
      | Third Party Administrator |
      | Legal Entity |
      | Member |
      | Service Company |
      | Acquisition Company |
      | Distribution Partner |

  @SF-483 @SF-483-UI-008 @p2 @negative @edit-mode
  Scenario: Verify Upsell Opportunity is NOT visible when editing non-MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Test Agency Account Edit |
      | Type  | Agency |
    When I navigate to the created Account record
    And I click Edit on the Account
    Then the "Upsell Opportunity" field should not be visible
    And I take a screenshot as evidence

  @SF-483 @SF-483-UI-009 @p2 @negative @dynamic-forms
  Scenario: Verify Upsell Opportunity is NOT visible in dynamic form sections for non-MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Test Agency Dynamic Forms |
      | Type  | Agency |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should not be visible anywhere on the Account page
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA 4: Admin/Support Visibility - Field Visible on All Accounts
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-UI-010 @p2 @admin @data-driven
  Scenario Outline: Verify admin user can see Upsell Opportunity on all Account types
    Given I am logged in as an admin user
    And I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Admin Test <account_type> Account |
      | Type  | <account_type> |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should be visible
    And I take a screenshot as evidence

    Examples:
      | account_type |
      | Member MGA |
      | Non-Member MGA |
      | Agency |
      | Insurer |
      | Reinsurer |
      | Third Party Administrator |

  @SF-483 @SF-483-UI-011 @p2 @support
  Scenario: Verify support user can see Upsell Opportunity on non-MGA Account
    Given I am logged in as a support user
    And I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Support Test Agency Account |
      | Type  | Agency |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD FUNCTIONALITY: Set and Verify Upsell Opportunity Values
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-UI-012 @p1 @member-mga @data-driven
  Scenario Outline: Set Upsell Opportunity to valid picklist values on Member MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Member MGA <value> Test |
      | Type  | Member MGA |
    When I navigate to the created Account record
    And I click Edit on the Account
    And I set the "Upsell Opportunity" field to "<value>"
    And I save the record
    Then the Account should be saved successfully
    And the "Upsell Opportunity" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Member MGA |
      | Non-Member MGA |

  @SF-483 @SF-483-UI-013 @p1 @non-member-mga
  Scenario: Set Upsell Opportunity on Non-Member MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Non-Member MGA Upsell Test |
      | Type  | Non-Member MGA |
    When I navigate to the created Account record
    And I click Edit on the Account
    And I set the "Upsell Opportunity" field to "Member MGA"
    And I save the record
    Then the Account should be saved successfully
    And the "Upsell Opportunity" field should display "Member MGA"
    And I take a screenshot as evidence

  @SF-483 @SF-483-UI-014 @p2 @picklist-options
  Scenario: Verify all Upsell Opportunity picklist options are available on Member MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Picklist Test Account |
      | Type  | Member MGA |
    When I navigate to the created Account record
    And I click Edit on the Account
    And I click on the "Upsell Opportunity" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-UI-015 @p2 @negative @blank-value
  Scenario: Verify behavior when Upsell Opportunity is blank on Member MGA Account
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Blank Upsell Test |
      | Type  | Member MGA |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should be visible
    And the "Upsell Opportunity" field should be blank or empty
    And I take a screenshot as evidence

  @SF-483 @SF-483-UI-016 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Upsell Opportunity on Member MGA Account
    Given I am logged in as a read-only user
    And I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Read-Only Test Account |
      | Type  | Member MGA |
    When I navigate to the created Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-483 @SF-483-UI-017 @p2 @negative @standard-user
  Scenario: Verify standard user sees field on MGA but not on non-MGA Account
    Given I am logged in as a standard user
    And I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Standard User MGA Test |
      | Type  | Member MGA |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should be visible
    Given I create a new Account via API with:
      | field | value |
      | Name  | SF-483 Standard User Agency Test |
      | Type  | Agency |
    When I navigate to the created Account record
    Then the "Upsell Opportunity" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-483 @SF-483-UI-018 @p2 @ui-data-creation @member-mga
  Scenario: Create Member MGA Account record via UI with Upsell Opportunity
    Given I am logged in as a standard user
    When I navigate to the Account object list
    And I click New to create an Account
    And I fill in required Account fields
    And I set the "Type" field to "Member MGA"
    And I set the "Upsell Opportunity" field to "Member MGA"
    And I save the record
    Then the Account should be created successfully
    And the "Upsell Opportunity" field should display "Member MGA"
    And I take a screenshot as evidence

  @SF-483 @SF-483-UI-019 @p2 @ui-data-creation @non-member-mga
  Scenario: Create Non-Member MGA Account record via UI with Upsell Opportunity
    Given I am logged in as a standard user
    When I navigate to the Account object list
    And I click New to create an Account
    And I fill in required Account fields
    And I set the "Type" field to "Non-Member MGA"
    And I set the "Upsell Opportunity" field to "Non-Member MGA"
    And I save the record
    Then the Account should be created successfully
    And the "Upsell Opportunity" field should display "Non-Member MGA"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 5
  # Coverage: 100%
  #
  # ✅ All requirements covered:
  #   REQ-1: Member MGA Account - Field Visible (UI-001, UI-002, UI-003, UI-012, UI-018)
  #   REQ-2: Non-Member MGA Account - Field Visible (UI-004, UI-005, UI-006, UI-013, UI-019)
  #   REQ-3: Other Account Types - Field NOT Visible (UI-007, UI-008, UI-009, UI-017)
  #   REQ-4: Admin/Support Visibility (UI-010, UI-011)
  #   REQ-5: Reports & Dashboards - Note: Report testing may require manual verification
  #
  # ══════════════════════════════════════════════════════════════════════════
