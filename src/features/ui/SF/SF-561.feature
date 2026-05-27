# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-561 - Verify Picklist Values of OOTB Address Fields
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: picklist-values, field-behavior, validation-rule
# Generated: 2026-02-17 (FeatureGenerator v3.1) | Updated manually from Jira doc
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - UI comprehensive, API minimal 1-2 tests
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Verify Picklist Values of OOTB Address Fields
# Primary Entities: Account, Lead
# Related Story: SF-732 (BillingCountry read-only for statuses beyond Onboarding)
#
# Validation Rules Deployed:
#   Account: Billing_Country_Required, Billing_Country_becomes_readonly,
#            Account_Enforce_Billing_State_By_Country
#   Lead:    Blank_BillingCountry, Lead_Enforce_Billing_State_By_Country
#
# Scenarios (from AC):
#   Scenario 1: BillingCountry is mandatory on Account and Lead
#   Scenario 2: BillingCountry read-only when Account_Status__c = "Onboarding"
#   Scenario 3: REMOVED (help text not editable on compound fields)
#   Scenario 4: BillingCountry uses approved country picklist (249 countries)
#   Scenario 5: BillingState shows US states when BillingCountry = "United States"
#   Scenario 6: BillingState shows Canadian provinces when BillingCountry = "Canada"
#   Scenario 7: BillingState restricted by Country (US/Canada only)
#   Scenario 8: Consistent config across Account and Lead
#
# Notes from Comments:
#   - Quote removed from scope (not yet available)
#   - Onboarding-only restriction for Scenario 2; SF-732 covers higher statuses
#   - Character/encoding issues in country names fixed by Abby
#   - Naming differences deferred to separate story
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-561 @medium @picklist-values @field-behavior @account @lead
Feature: SF-561 - Verify Picklist Values of OOTB Address Fields
  As an MRD and Data Steward
  I want the Billing Country and Billing State/Province fields to use controlled picklists across all objects that hold billing address details
  So that address data is consistent, validated, and aligned with integration and reporting needs

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 1: BillingCountry is mandatory on all objects (Account & Lead)
  # Validation Rules: Billing_Country_Required (Account), Blank_BillingCountry (Lead)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-UI-001 @p1 @smoke @positive @account @mandatory
  Scenario: BillingCountry is mandatory on Account - save with country populated
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I fill in required Account fields
    And I set the "BillingCountry" field to "United States"
    And I set the "BillingState" field to "New York"
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-002 @p1 @smoke @negative @account @mandatory
  Scenario: BillingCountry is mandatory on Account - save blocked when blank
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I fill in required Account fields
    And I clear the "BillingCountry" field
    And I save the record
    Then the record should not be saved
    And I should see a validation error
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-003 @p1 @smoke @positive @lead @mandatory
  Scenario: BillingCountry is mandatory on Lead - save with country populated
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I set the "Country" field to "United Kingdom"
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-004 @p1 @smoke @negative @lead @mandatory
  Scenario: BillingCountry is mandatory on Lead - save blocked when blank
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I clear the "Country" field
    And I save the record
    Then the record should not be saved
    And I should see a validation error
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 2: BillingCountry read-only when Account_Status__c = "Onboarding"
  # Validation Rule: Billing_Country_becomes_readonly (Account)
  # Note: SF-732 covers higher statuses (Contracted, Active, etc.)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-UI-005 @p1 @positive @account @read-only @onboarding
  Scenario: BillingCountry is read-only when Account is in Onboarding status
    Given I am logged in as a "QA MRD User" user
    And I have a test Account created via API with:
      | field              | value         |
      | Account_Status__c  | Onboarding    |
      | BillingCountry     | United States |
      | BillingState       | New York      |
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "BillingCountry" field should not be editable
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-006 @p1 @negative @account @read-only @onboarding
  Scenario: Error displayed when attempting to change BillingCountry on Onboarding Account via API
    Given I am logged in as a "QA MRD User" user
    And I have a test Account created via API with:
      | field              | value         |
      | Account_Status__c  | Onboarding    |
      | BillingCountry     | United States |
      | BillingState       | New York      |
    When I navigate to the Account record
    And I click Edit on the Account
    And I attempt to change the "BillingCountry" field to "Canada"
    And I save the record
    Then the record should not be saved
    And the error message should mention "Billing Country" or "Onboarding"
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-007 @p2 @positive @account @read-only @pre-onboarding
  Scenario: BillingCountry is editable when Account is NOT in Onboarding status
    Given I am logged in as a "QA MRD User" user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "BillingCountry" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 3: REMOVED
  # Help text cannot be edited on standard compound address fields
  # ══════════════════════════════════════════════════════════════════════════

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 4: BillingCountry uses approved country picklist
  # 249 countries from centrally governed list; free-text entry not allowed
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-UI-008 @p1 @smoke @positive @account @picklist @country
  Scenario: BillingCountry field is a controlled picklist on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I click on the "BillingCountry" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-009 @p1 @positive @account @picklist @country @data-driven
  Scenario Outline: BillingCountry picklist contains approved countries on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I click on the "BillingCountry" picklist
    Then the picklist should contain the value "<country>"
    And I take a screenshot as evidence

    Examples:
      | country                |
      | United States          |
      | United Kingdom         |
      | Canada                 |
      | Germany                |
      | France                 |
      | Australia              |
      | India                  |
      | Japan                  |
      | Brazil                 |
      | South Africa           |
      | United Arab Emirates   |
      | China                  |
      | Mexico                 |
      | Ireland                |
      | Singapore              |

  @SF-561 @SF-561-UI-010 @p1 @positive @lead @picklist @country
  Scenario: BillingCountry field is a controlled picklist on Lead
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I click on the "Country" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-011 @p2 @positive @lead @picklist @country @data-driven
  Scenario Outline: BillingCountry picklist contains approved countries on Lead
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I click on the "Country" picklist
    Then the picklist should contain the value "<country>"
    And I take a screenshot as evidence

    Examples:
      | country                |
      | United States          |
      | United Kingdom         |
      | Canada                 |
      | Germany                |
      | France                 |
      | Australia              |
      | India                  |
      | Japan                  |

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 5: BillingState contains approved US state values
  # When BillingCountry = "United States", BillingState shows 50 states + DC
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-UI-012 @p1 @smoke @positive @account @picklist @us-states
  Scenario: BillingState shows US states when BillingCountry is United States on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I set the "BillingCountry" field to "United States"
    And I click on the "BillingState" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-013 @p1 @positive @account @picklist @us-states @data-driven
  Scenario Outline: BillingState picklist contains approved US states on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I set the "BillingCountry" field to "United States"
    And I click on the "BillingState" picklist
    Then the picklist should contain the value "<state>"
    And I take a screenshot as evidence

    Examples:
      | state              |
      | Alaska             |
      | California         |
      | Connecticut        |
      | District of Columbia |
      | Florida            |
      | Georgia            |
      | Illinois           |
      | Massachusetts      |
      | New York           |
      | Ohio               |
      | Pennsylvania       |
      | Texas              |
      | Virginia           |
      | Washington         |
      | Wyoming            |

  @SF-561 @SF-561-UI-014 @p2 @positive @lead @picklist @us-states
  Scenario: BillingState shows US states when Country is United States on Lead
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I set the "Country" field to "United States"
    And I click on the "State/Province" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 6: BillingState contains approved Canadian province values
  # When BillingCountry = "Canada", BillingState shows 13 provinces/territories
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-UI-015 @p1 @positive @account @picklist @ca-provinces
  Scenario: BillingState shows Canadian provinces when BillingCountry is Canada on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I set the "BillingCountry" field to "Canada"
    And I click on the "BillingState" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-016 @p1 @positive @account @picklist @ca-provinces @data-driven
  Scenario Outline: BillingState picklist contains approved Canadian provinces on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I set the "BillingCountry" field to "Canada"
    And I click on the "BillingState" picklist
    Then the picklist should contain the value "<province>"
    And I take a screenshot as evidence

    Examples:
      | province               |
      | Yukon                  |
      | Northwest Territories  |
      | Nunavut                |
      | British Columbia       |
      | Alberta                |
      | Saskatchewan           |
      | Manitoba               |
      | Ontario                |
      | Quebec                 |
      | New Brunswick          |
      | Nova Scotia            |
      | Prince Edward Island   |
      | Newfoundland & Labrador |

  @SF-561 @SF-561-UI-017 @p2 @positive @lead @picklist @ca-provinces
  Scenario: BillingState shows Canadian provinces when Country is Canada on Lead
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I set the "Country" field to "Canada"
    And I click on the "State/Province" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 7: BillingState/Province restricted by Country
  # US/Canada = state picklist available; other countries = blank/unavailable
  # Validation Rules: Account_Enforce_Billing_State_By_Country,
  #                   Lead_Enforce_Billing_State_By_Country
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-UI-018 @p1 @smoke @positive @account @state-dependency
  Scenario: BillingState picklist available when BillingCountry is United States on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I set the "BillingCountry" field to "United States"
    And I click on the "BillingState" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-019 @p1 @positive @account @state-dependency
  Scenario: BillingState picklist available when BillingCountry is Canada on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I set the "BillingCountry" field to "Canada"
    And I click on the "BillingState" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-020 @p1 @negative @account @state-dependency
  Scenario: BillingState not available when BillingCountry is not US or Canada on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I set the "BillingCountry" field to "Germany"
    Then the "BillingState" picklist should have no selectable values
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-021 @p2 @negative @account @state-dependency @data-driven
  Scenario Outline: BillingState blocked for non-US/Canada countries on Account
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I set the "BillingCountry" field to "<country>"
    Then the "BillingState" picklist should have no selectable values
    And I take a screenshot as evidence

    Examples:
      | country          |
      | United Kingdom   |
      | France           |
      | Australia        |
      | Japan            |
      | India            |

  @SF-561 @SF-561-UI-022 @p1 @positive @lead @state-dependency
  Scenario: State/Province picklist available when Country is United States on Lead
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I set the "Country" field to "United States"
    And I click on the "State/Province" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-023 @p1 @negative @lead @state-dependency
  Scenario: State/Province not available when Country is not US or Canada on Lead
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I set the "Country" field to "Germany"
    Then the "State/Province" picklist should have no selectable values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 8: Consistent configuration across Account and Lead
  # Same picklist values and dependency rules on both objects
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-UI-024 @p2 @positive @consistency @account @lead
  Scenario: Same country picklist values available on Account and Lead
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I click on the "BillingCountry" picklist
    Then the picklist should contain the value "United States"
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-025 @p2 @positive @consistency @lead
  Scenario: Same country picklist values available on Lead
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I click on the "Country" picklist
    Then the picklist should contain the value "United States"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-561 @SF-561-UI-026 @p2 @ui-data-creation
  Scenario: Create Account record via UI with BillingCountry and BillingState
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    And I fill in required Account fields
    And I set the "BillingCountry" field to "United States"
    And I set the "BillingState" field to "New York"
    And I save the record
    Then the Account should be created successfully
    And the "BillingCountry" field should display "United States"
    And the "BillingState" field should display "New York"
    And I take a screenshot as evidence

  @SF-561 @SF-561-UI-027 @p2 @ui-data-creation
  Scenario: Create Lead record via UI with Country and State
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I set the "Country" field to "Canada"
    And I set the "State/Province" field to "Ontario"
    And I save the record
    Then the Lead should be created successfully
    And the "Country" field should display "Canada"
    And I take a screenshot as evidence
