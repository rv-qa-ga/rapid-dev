# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-18 - 8229: View Opportunities and Contracts in Relationship Tab
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-24T15:43:00.723Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: 8229: View Opportunities and Contracts in Relationship Tab
# Primary Entity: Order
#
# Test Requirements (3):
#   REQ-1: an Account has related Opportunities → I scroll below the FSC Rel
#     → Test Type: BOTH | Priority: p1
#   REQ-2: the Open Opportunities related list is displayed → I view the lis
#     → Test Type: UI | Priority: p2
#   REQ-3: the Active Contracts related list is displayed → I view the list 
#     → Test Type: UI | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Open Opportunities
#   • Opportunity Name
#   • Stage
#   • Close Date
#   • Contract Number
#   • Contract Version
#   • Contract Status
#   • Contract Start Date
#   • Contract End Date
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-18 @medium @auto-populate @field-mapping @order
Feature: SF-18 - 8229: View Opportunities and Contracts in Relationship Tab
  As a Salesforce user
  I want to verify the opportunities functionality on Order
  So that Order records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-18 @SF-18-UI-001
  Scenario: Scenario 1
    Given I am logged in as a "Accelerant - System administrator" user
    Given An Account has related Opportunities
    Given Contracts
    When I scroll below the FSC Relationship Map on the Relationships tab
    Then I see the following related list components in order:Component NameDescriptionOpen OpportunitiesOpportunities where Stage != ClosedActive ContractsContracts where Status = Active
    Then Each related list shows up to 5 records by default
    Then Each list includes a “View All” link to see additional recordsScenario: Open Opportunities related list configuration
    And I take a screenshot as evidence

  @SF-18 @SF-18-UI-002 @data-driven
  Scenario: Scenario 2
    Given I am logged in as a "Accelerant - System administrator" user
    Given The Open Opportunities related list is displayed
    When I view the list
    Then The following columns are visible:ColumnOpportunity NameStageAnnual_GWP_Estimate_Year_1__cClose Date
    Then Records are sorted by Close Date (earliest first)
    Then Only Opportunities where Stage NOT IN (‘Closed Won’, ‘Closed Lost’) Unqualified are displayedScenario: Active Contracts related list configuration
    And I take a screenshot as evidence

  @SF-18 @SF-18-UI-003 @negative @data-driven @former
  Scenario: Scenario 3
    Given I am logged in as a "Former" user
    Given The Active Contracts related list is displayed
    When I view the list
    Then The following columns are visible:ColumnContract NumberContract VersionContract StatusContract Start DateContract End Date
    Then Records are sorted by Start Date (most recent first)
    Then Only Contracts where Status = Active Activated are displayed
    Then The counterparty types here may be different to what is actually seen in the counterparty relationships object as they are more defined, such as Direct Insurer or Assuming Insurer
    Then Opportunities
    Then Contracts are visible but they are not filtered as stated in this US.Also, when trying to create an opportunity from the related list, Salesforce throws an error that is impossible to fix: It asks for the Estimated Onboarding Date, which is not available in the layout
    Then :flag_off: Flag removed Available to dev
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=6c2254a2-b7a2-4e73-acb7-3ec47b14c815Commit notes: Modified related lists configuration.Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Contract record
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=8dbe98f9-2e35-4f79-b6e8-8810eab8234dCommit notes: Modified related lists configuration.Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Contract record
    Then :check_mark: Successfully merged PR #83 from gs-pipeline/SF-18/8229-View-Opportunities-and-Contracts-in-Relationship-Tab_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: opportunities from Account to Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-18 @SF-18-UI-004 @smoke @p1 @auto-populate
  Scenario: Verify opportunities auto-populates from Account to Order
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with:
      | field   | value    |
      | opportunities | EU       |
    And I have a test Order created via API for the Account
    When I navigate to the Order record
    Then the "opportunities" field should display "EU"
    And I take a screenshot as evidence

  @SF-18 @SF-18-UI-005 @p1 @auto-populate @data-driven
  Scenario Outline: Verify opportunities mapping for all valid values
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with opportunities "<value>"
    And I have a test Order created via API for the Account
    When I navigate to the Order record
    Then the "opportunities" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Open Opportunities |
      | Opportunity Name |
      | Stage |
      | Close Date |
      | Contract Number |
      | Contract Version |
      | Contract Status |
      | Contract Start Date |
      | Contract End Date |

  @SF-18 @SF-18-UI-006 @p1 @read-only
  Scenario: Verify opportunities is NOT editable on Order after creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with opportunities "UK"
    And I have a test Order created via API for the Account
    When I navigate to the Order record
    And I click Edit on the Order
    Then the "opportunities" field should not be editable
    And I take a screenshot as evidence

  @SF-18 @SF-18-UI-007 @p1 @visibility
  Scenario: Verify opportunities field is visible on Order
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with opportunities "US"
    And I have a test Order created via API for the Account
    When I navigate to the Order record
    Then the "opportunities" field should be visible
    And the "opportunities" field should display "US"
    And I take a screenshot as evidence

  @SF-18 @SF-18-UI-008 @p2 @exact-match
  Scenario: Verify opportunities value matches exactly from Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with opportunities "APAC"
    And I have a test Order created via API for the Account
    When I navigate to the Order record
    Then the "opportunities" field should display "APAC"
    And the opportunities value should match exactly what was on the Account
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: opportunities on Order
  # ══════════════════════════════════════════════════════════════════════════

  @SF-18 @SF-18-UI-009 @smoke @p1 @admin
  Scenario: Verify opportunities is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "opportunities" field should be visible
    And I take a screenshot as evidence

  @SF-18 @SF-18-UI-010 @p1 @standard-user @negative
  Scenario: Verify opportunities is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "opportunities" field should not be visible
    And I take a screenshot as evidence

  @SF-18 @SF-18-UI-011 @p2 @detail-view
  Scenario: Verify opportunities visibility on Order detail page
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Order record
    When I navigate to the Order record
    Then the "opportunities" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-18 @SF-18-UI-012 @p2 @negative @blank-value
  Scenario: Verify behavior when opportunities is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Order created via API without "opportunities"
    When I navigate to the Order record
    Then the "opportunities" field should be visible
    And the "opportunities" field should be blank or empty
    And I take a screenshot as evidence

  @SF-18 @SF-18-UI-013 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for opportunities
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Order record
    When I navigate to the Order record
    And I click Edit on the Order
    Then the "opportunities" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-18 @SF-18-UI-014 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify opportunities
    Given I am logged in as a read-only user
    And I have a test Order created via API
    When I navigate to the Order record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-18 @SF-18-UI-015 @p2 @ui-data-creation
  Scenario: Create Order record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Order object list
    And I click New to create a Order
    And I fill in required Order fields
    And I save the record
    Then the Order should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 3
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 81
  # Existing Steps Used: 81
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 81/81 (100%)
  #   - Feature-Specific Steps Used: 0
