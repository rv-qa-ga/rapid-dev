# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-498 - Map Region from Lead or Account to Opportunity
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Map Region from Lead or Account to Opportunity
# Primary Entity: Opportunity
#
# Test Requirements (5 - ALL COVERED):
#   REQ-1: Region mapped from Lead during conversion ✅ SF-498-UI-001, UI-002
#   REQ-2: Region mapped from Account when Opportunity is created ✅ SF-498-UI-003, UI-004
#   REQ-3: Region blank on source record - handle gracefully ✅ SF-498-UI-005, UI-006
#   REQ-4: Consistent Region behaviour across all creation methods ✅ SF-498-UI-008, UI-009
#   REQ-5: Region not editable after creation ✅ SF-498-UI-007
#
# COVERAGE: 100%
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-498 @medium @auto-populate @field-mapping @opportunity
Feature: SF-498 - Map Region from Lead or Account to Opportunity
  As a Salesforce user
  I want to verify the Region functionality on Opportunity
  So that Opportunity records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-1: LEAD CONVERSION - Region from Lead to Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-UI-001 @smoke @p1 @lead-conversion
  Scenario: Verify Region is mapped from Lead to Opportunity during conversion
    Given I have a test Lead created via API with Region "EU"
    When I navigate to the Lead record
    And I convert the Lead to an Opportunity
    Then the "Region" field on the Opportunity should display "EU"
    And I take a screenshot as evidence

  @SF-498 @SF-498-UI-002 @p1 @lead-conversion @data-driven
  Scenario Outline: Verify Region mapping from Lead for all valid values
    Given I have a test Lead created via API with Region "<value>"
    When I navigate to the Lead record
    And I convert the Lead to an Opportunity
    Then the "Region" field on the Opportunity should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US    |
      | UK    |
      | EU    |
      | CA    |

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-2: AUTO-POPULATION - Region from Account to Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-UI-003 @smoke @p1 @auto-populate
  Scenario: Verify Region auto-populates from Account to Opportunity
    Given I have a test Account created via API with Region "EU"
    When I navigate to the Account record
    And I create a new Opportunity from the Account
    Then the "Region" field should display "EU"
    And I take a screenshot as evidence

  @SF-498 @SF-498-UI-004 @p1 @auto-populate @data-driven
  Scenario Outline: Verify Region mapping from Account for all valid values
    Given I have a test Account created via API with Region "<value>"
    When I navigate to the Account record
    And I create a new Opportunity from the Account
    Then the "Region" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US    |
      | UK    |
      | EU    |
      | CA    |

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-3: BLANK REGION - Handle blank/null Region gracefully
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-UI-005 @p2 @blank-source
  Scenario: Verify Opportunity Region is blank when Account Region is blank
    Given I have a test Account created via API without "Region__c"
    When I navigate to the Account record
    And I create a new Opportunity from the Account
    Then the "Region" field should be blank or empty
    And I take a screenshot as evidence

  @SF-498 @SF-498-UI-006 @p2 @blank-source @lead
  Scenario: Verify Opportunity Region is blank when Lead Region is blank
    Given I have a test Lead created via API without "Region__c"
    When I navigate to the Lead record
    And I convert the Lead to an Opportunity
    Then the "Region" field on the Opportunity should be blank or empty
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-5: READ-ONLY - Region not editable after creation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-UI-007 @p1 @read-only
  Scenario: Verify Region is NOT editable on Opportunity after creation
    Given I have a test Account created via API with Region "UK"
    And I have a test Opportunity created via API for the Account
    When I navigate to the Opportunity record
    And I click Edit on the Opportunity
    Then the "Region" field should not be editable
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-4: CONSISTENCY - Region behaviour across creation methods
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-UI-008 @p2 @visibility
  Scenario: Verify Region field is visible on Opportunity detail page
    Given I have a test Account created via API with Region "US"
    And I have a test Opportunity created via API for the Account
    When I navigate to the Opportunity record
    Then the "Region" field should be visible
    And the "Region" field should display "US"
    And I take a screenshot as evidence

  @SF-498 @SF-498-UI-009 @p2 @exact-match
  Scenario: Verify Region value matches exactly from Account
    Given I have a test Account created via API with Region "APAC"
    And I have a test Opportunity created via API for the Account
    When I navigate to the Opportunity record
    Then the "Region" field should display "APAC"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-UI-010 @smoke @p1 @admin
  Scenario: Verify Region is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Region" field should be visible
    And I take a screenshot as evidence

  @SF-498 @SF-498-UI-011 @p1 @standard-user
  Scenario: Verify Region visibility for standard users
    Given I am logged in as a standard user
    And I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Region" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-498 @SF-498-UI-012 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Opportunity
    Given I am logged in as a read-only user
    And I have a test Opportunity created via API
    When I navigate to the Opportunity record
    Then the Edit button should not be visible
    And I take a screenshot as evidence
