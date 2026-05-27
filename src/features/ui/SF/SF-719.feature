# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-719 - UNSD Region and Sub-region on Country object
# Type: Story | Data Steward | Country object
# Reference: data/excel/Allowed Combinations of Region and Sub region.xlsx
# ══════════════════════════════════════════════════════════════════════════════
#
# As a Data Steward I want to capture UNSD Region and UNSD Sub-region against
# each Country so that countries can be classified consistently using the United
# Nations standard regional structure.
#
# UNSD Regions: Africa, Americas, Asia, Europe, Oceania
# UNSD Sub-regions: Australia and New Zealand, Central Asia, Eastern Asia, etc.
# Valid combinations: per attached Excel "Allowed Combinations of Region and Sub region.xlsx"
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-719 @country @unsd @data-steward @medium
Feature: SF-719 - UNSD Region and Sub-region on Country object
  As a Data Steward
  I want to capture UNSD Region and UNSD Sub-region against each Country
  So that countries can be classified consistently using the United Nations standard regional structure

  Background:
    Given I am logged in as a "Data Steward" user

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: UNSD Region field is available on the Country object
  # ══════════════════════════════════════════════════════════════════════════

  @SF-719 @SF-719-UI-001 @p1 @country @unsd-region
  Scenario: UNSD Region field is available on Country record
    Given a Data Steward is viewing or editing a Country record
    When the Country record is displayed
    Then a field called "UNSD Region" must be available
    And the field type must be a picklist
    And the picklist values must be "Africa", "Americas", "Asia", "Europe", "Oceania"
    And the field must not be mandatory

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: UNSD Sub-region field is available on the Country object
  # ══════════════════════════════════════════════════════════════════════════

  @SF-719 @SF-719-UI-002 @p1 @country @unsd-subregion
  Scenario: UNSD Sub-region field is available on Country record
    Given a Data Steward is viewing or editing a Country record
    When the Country record is displayed
    Then a field called "UNSD Sub-region" must be available
    And the field type must be a picklist
    And the picklist must include "Australia and New Zealand", "Central Asia", "Eastern Asia", "Eastern Europe", "Latin America and the Caribbean", "Melanesia", "Micronesia", "Northern Africa", "Northern America", "Northern Europe", "Polynesia", "South-eastern Asia", "Southern Asia", "Southern Europe", "Sub-Saharan Africa", "Western Asia", "Western Europe"
    And the field must not be mandatory

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 3: UNSD fields are read-only for non-Data Stewards
  # ══════════════════════════════════════════════════════════════════════════

  @SF-719 @SF-719-UI-003 @p1 @permissions @data-steward-only
  Scenario: UNSD Region and Sub-region are read-only for non-Data Stewards
    Given a user is not assigned a Data Steward role or profile
    When the user views a Country record
    Then the "UNSD Region" and "UNSD Sub-region" fields must be read-only
    And only Data Stewards can create or update values in these fields

  @SF-719 @SF-719-UI-004 @p2 @permissions
  Scenario: Data Steward can edit UNSD Region and Sub-region on Country
    Given I am logged in as a "Data Steward" user
    And I have an existing Country record
    When I navigate to the Country record
    And I click Edit on the Country
    Then the "UNSD Region" and "UNSD Sub-region" fields must be editable

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 4: Valid UNSD Region and Sub-region combinations enforced
  # Reference: data/excel/Allowed Combinations of Region and Sub region.xlsx
  # ══════════════════════════════════════════════════════════════════════════

  @SF-719 @SF-719-UI-005 @p1 @validation @valid-combinations
  Scenario: Valid UNSD Region and Sub-region combination can be saved
    Given a Data Steward is creating or editing a Country record
    And an approved list of valid UNSD Region and Sub-region combinations exists (as defined in data/excel/Allowed Combinations of Region and Sub region.xlsx)
    When the Data Steward selects a valid combination of UNSD Region and UNSD Sub-region from the approved list
    And the Data Steward saves the record
    Then the record must save successfully

  @SF-719 @SF-719-UI-006 @p1 @validation @invalid-combination
  Scenario: Invalid UNSD Region and Sub-region combination must not save
    Given a Data Steward is creating or editing a Country record
    And an approved list of valid UNSD Region and Sub-region combinations exists (as defined in data/excel/Allowed Combinations of Region and Sub region.xlsx)
    When the Data Steward selects a combination of UNSD Region and UNSD Sub-region that is not in the approved list
    And the Data Steward attempts to save the record
    Then the record must not save
    And the user must be shown a clear validation error indicating that the UNSD Region and Sub-region combination is not valid

  @SF-719 @SF-719-UI-007 @p2 @validation
  Scenario: Clear validation message for invalid UNSD combination
    Given a Data Steward is editing a Country record
    When the Data Steward sets "UNSD Region" and "UNSD Sub-region" to an invalid combination
    And the Data Steward saves the record
    Then the record must not save
    And the error message must indicate that the UNSD Region and Sub-region combination is not valid
