# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-563 - Derive Region fields from Country reference data
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-02-24T17:08:23.117Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - UI test cases generated; API optional (minimal 1-2 or skip)
# RBT: UI test cases generated; API optional (minimal 1-2 or skip).
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Derive Region fields from Country reference data
# Primary Entity: Lead
#
# Fields Involved (1):
#   • from Country reference data (from_Country_reference_data__c) - modify
#
# Test Requirements (2):
#   REQ-1: Verify "from Country reference data" behavior on Lead
#     → Test Type: BOTH | Priority: p2
#   REQ-2: Auto-populate Distribution Region and Region when Billing Country
#     → Test Type: API | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Country Name
#   • Distribution Region Name
#   • UNSD Region
#   • Distribution Region
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-563 @medium @salesforce @auto-populate @field-mapping @lead
Feature: SF-563 - Derive Region fields from Country reference data
  As a Salesforce user
  I want to verify the Country__c functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-563 @SF-563-UI-001 @p1 @smoke @positive @data-driven @auto-population @field-exists @update @read-only
  Scenario: Auto-populate Distribution Region and Region when Billing Country is setGiven a Lead or Account record contains a Billing Country fieldAnd a matching record exists in Country__c for that Billing Country (Alpha 2 Code for match)When the Billing Country field is populated or updatedThen the Distribution Region field on the Lead/Account must be automatically populated withCountry__c.Distribution_Region_Name__cAnd the UNSD Region field on the Lead/Account must be automatically populated withCountry__c.UNSD_Region__cScenario 2: Prevent manual population of Distribution Region and UNSD RegionGiven the Distribution Region and UNSD Region fields exist on Lead and AccountWhen a user attempts to manually enter or edit either fieldThen the user must not be able to save a manually entered valueAnd the fields must only be populated or updated by system automation derived from Billing Country and Country__cAnd the fields must be read-only in the UI for all user profilesScenario 3: Update derived fields when Billing Country changesGiven a Lead or Account already has a Billing Country populatedAnd Distribution Region and Region have been auto-derivedWhen the Billing Country value is changedThen the Distribution Region and UNSD Region fields must be recalculatedAnd the new values must reflect the updated Billing Country mapping from Country__cScenario 4: Handle missing country-to-region mappingGiven a Billing Country is populated on a Lead or AccountAnd no matching Country__c record exists for that Billing CountryWhen the system attempts to derive Distribution Region and RegionThen Distribution Region and Region must remain blankAnd the user must see a clear error message indicating that the selected Billing Country is not mapped in Country reference dataAnd the record must not be saved until the mapping issue is resolved (or Billing Country is corrected)NotesThis story should not change the functionality developed by . It re-implements the mapping described in that story so that the Distribution Region is derived from the Country__c reference data.
    Given I am logged in as a "Accelerant - System administrator" user
    Then This will be ready for Ken’s review
    Then QA is unable to test
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: Country__c from Account to Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-563 @SF-563-UI-002 @smoke @p1 @auto-populate
  Scenario: Verify Country__c auto-populates from Account to Lead
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with:
      | field   | value    |
      | Country__c | EU       |
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Country__c" field should display "EU"
    And I take a screenshot as evidence

  @SF-563 @SF-563-UI-003 @p1 @auto-populate @data-driven
  Scenario Outline: Verify Country__c mapping for all valid values
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Country__c "<value>"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Country__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Country Name |
      | Distribution Region Name |
      | UNSD Region |
      | Distribution Region |
      | US |
      | UK |
      | EU |
      | CA |

  @SF-563 @SF-563-UI-004 @p1 @read-only
  Scenario: Verify Country__c is NOT editable on Lead after creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Country__c "UK"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Country__c" field should not be editable
    And I take a screenshot as evidence

  @SF-563 @SF-563-UI-005 @p1 @visibility
  Scenario: Verify Country__c field is visible on Lead
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Country__c "US"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Country__c" field should be visible
    And the "Country__c" field should display "US"
    And I take a screenshot as evidence

  @SF-563 @SF-563-UI-006 @p2 @exact-match
  Scenario: Verify Country__c value matches exactly from Account
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API with Country__c "APAC"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Country__c" field should display "APAC"
    And the Country__c value should match exactly what was on the Account
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: from_Country_reference_data__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-563 @SF-563-UI-007 @smoke @p1 @read-only
  Scenario: Verify from_Country_reference_data__c is read-only on Lead
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "from_Country_reference_data__c" field should not be editable
    And I take a screenshot as evidence

  @SF-563 @SF-563-UI-008 @p1 @negative
  Scenario: Verify user cannot modify from_Country_reference_data__c after Lead creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "from_Country_reference_data__c" field should be read-only
    And attempting to edit the from_Country_reference_data__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-563 @SF-563-UI-009 @p2 @negative @blank-value
  Scenario: Verify behavior when Country__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Lead created via API without "Country__c"
    When I navigate to the Lead record
    Then the "Country__c" field should be visible
    And the "Country__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-563 @SF-563-UI-010 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Country__c
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Country__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-563 @SF-563-UI-011 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Country__c
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-563 @SF-563-UI-012 @p2 @ui-data-creation
  Scenario: Create Lead record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: Verify "from Country reference data" behavior on Lead
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 68
  # Existing Steps Used: 68
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 68/68 (100%)
  #   - Feature-Specific Steps Used: 0
