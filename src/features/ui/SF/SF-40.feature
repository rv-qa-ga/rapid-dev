# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-40 - 8105: Standard Account List Views - Member
# Type: Story | Status: In development | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:28.897Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: 8105: Standard Account List Views - Member
# Primary Entity: Contract
#
# Test Requirements (2):
#   REQ-1: I am a Salesforce User with access to Accounts → I navigate to th
#     → Test Type: UI | Priority: p1
#   REQ-2: standard Account list views are configured → Salesforce Users acc
#     → Test Type: BOTH | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • My Active Accounts
#   • My Onboarding Members
#   • Recently Updated
#   • PTY Code
#   • Owner
#   • Type
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-40 @medium @field-visibility @contract
Feature: SF-40 - 8105: Standard Account List Views - Member
  As a Salesforce user
  I want to verify the Active functionality on Contract
  So that Contract records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-40 @SF-40-UI-001 @data-driven @i-am-a-salesforce
  Scenario: Scenario 1
    Given I am logged in as a "I Am A Salesforce" user
    Given The fields Account Status, Account Type
    And I navigate to the Account object list
    When I navigate to the Account record
    And I navigate to the Account object list
    Then Account_Status = "Active"My Onboarding MembersMy Account Team
    Then Last Modified Date = Last 7 DaysNeeds ReviewAll Accounts
    Then Account_Status = "Prospect" OR “Onboarding” OR “Contracted” OR “Runoff”
    Then Each view must display the columns: Account Name, Type, Account Status, PTY Code, Owner
    Then All list views must be sorted by Last Modified Date (most recent first)
    And I navigate to the Account object list
    Then Each view must be sorted by Last Modified Date (most recent first)Scenario: Governance of standard list views
    And I take a screenshot as evidence

  @SF-40 @SF-40-UI-002 @negative @data-driven @standard-account-list-views-are-configured-salesforce
  Scenario: Scenario 2
    Given I am logged in as a "Standard Account List Views Are Configured Salesforce" user
    And I navigate to the Account object list
    When Salesforce Users access Accounts
    Then Users must be able to view
    Then Use these standard list views
    Then Users must not be able to edit, rename, or delete standard list views
    Then Users must still be able to create
    Then Manage their own personal list views without restriction✅ Business Value:Ensures consistency
    Then Accuracy in how Accounts are filtered
    Then Reported across the org.Prevents accidental changes to critical, standard list views that all teams rely on.Still allows flexibility for users to build personalized views to support their workflow
    Then Changed TPA Group to “TPA”
    Then Actually - removing TPAs since this is just for Member Ops
    Then Members
    Then Why does this show All Active TPAs
    Then Not All Active Risk Capital partners, for example? I think this needs to be 3 stories with distinct views for
    Then Member Account views - MRDs, Member Ops, Actuarial, UWInsurer Account views - IRDs, IDMsTPA Account views - Claims, Claims Ops[In future] Reinsurer Account views - Reinsurance Placement, Reinsurance Finance Ops
    Then The acceptance criteria was not met
    Then Also no 'Funnel’ status)
    Then He can confirm how we want to proceed with this. I’m thinking we will likely update the AC as the statuses are correct
    Then Update
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Active on Contract
  # ══════════════════════════════════════════════════════════════════════════

  @SF-40 @SF-40-UI-003 @smoke @p1
  Scenario: Verify Active field is visible on Contract
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "Active" field should be visible
    And I take a screenshot as evidence

  @SF-40 @SF-40-UI-004 @p1 @edit
  Scenario: Verify Active field can be edited on Contract
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    And I set the "Active" field to "Test Value"
    And I save the record
    Then the Contract should be saved successfully
    And the "Active" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-40 @SF-40-UI-005 @p1 @data-driven
  Scenario Outline: Set Active to valid values
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    And I set the "Active" field to "<value>"
    And I save the record
    Then the "Active" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | My Active Accounts |
      | My Onboarding Members |
      | Recently Updated |
      | PTY Code |
      | Owner |
      | Type |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Active on Contract
  # ══════════════════════════════════════════════════════════════════════════

  @SF-40 @SF-40-UI-006 @smoke @p1 @admin
  Scenario: Verify Active is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "Active" field should be visible
    And I take a screenshot as evidence

  @SF-40 @SF-40-UI-007 @p1 @standard-user @negative
  Scenario: Verify Active is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "Active" field should not be visible
    And I take a screenshot as evidence

  @SF-40 @SF-40-UI-008 @p2 @detail-view
  Scenario: Verify Active visibility on Contract detail page
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "Active" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-40 @SF-40-UI-009 @p2 @negative @blank-value
  Scenario: Verify behavior when Active is blank
    Given I am logged in as a standard user
    And I have a test Contract created via API without "Active"
    When I navigate to the Contract record
    Then the "Active" field should be visible
    And the "Active" field should be blank or empty
    And I take a screenshot as evidence

  @SF-40 @SF-40-UI-010 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Active
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    Then the "Active" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-40 @SF-40-UI-011 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Active
    Given I am logged in as a read-only user
    And I have a test Contract created via API
    When I navigate to the Contract record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-40 @SF-40-UI-012 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Active
    Given I am logged in as a standard user
    And I have a test Contract created via API
    When I navigate to the Contract record
    Then the "Active" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-40 @SF-40-UI-013 @p2 @ui-data-creation
  Scenario: Create Contract record via UI
    Given I am logged in as a standard user
    When I navigate to the Contract object list
    And I click New to create a Contract
    And I fill in required Contract fields
    And I save the record
    Then the Contract should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: I am a Salesforce User with access to Accounts → I navigate to th
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: standard Account list views are configured → Salesforce Users acc
  #     → Should be tested via BOTH | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 92
  # Existing Steps Used: 92
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 92/92 (100%)
  #   - Feature-Specific Steps Used: 0
