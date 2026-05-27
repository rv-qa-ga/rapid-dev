# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-719 - UNSD Region and Sub-region on Country object (API)
# Type: Story | Country__c | Field metadata and valid combinations
# Reference: data/excel/Allowed Combinations of Region and Sub region.xlsx
# ══════════════════════════════════════════════════════════════════════════════
#
# API tests: Country__c object has UNSD Region and UNSD Sub-region fields with
# correct type and picklist values; valid combinations enforced per Excel.
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-719 @country @unsd @medium
Feature: API - SF-719 - UNSD Region and Sub-region on Country object

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: UNSD Region field exists on Country with correct type/values
  # ══════════════════════════════════════════════════════════════════════════

  @SF-719 @SF-719-API-001 @p1 @field-exists
  Scenario: UNSD Region field exists on Country object
    When I describe the Country__c object fields
    Then the "UNSD Region" field should exist
    And the field should be a picklist
    And the picklist should contain values "Africa", "Americas", "Asia", "Europe", "Oceania"

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: UNSD Sub-region field exists with correct type/values
  # ══════════════════════════════════════════════════════════════════════════

  @SF-719 @SF-719-API-002 @p1 @field-exists
  Scenario: UNSD Sub-region field exists on Country object
    When I describe the Country__c object fields
    Then the "UNSD Sub-region" field should exist
    And the field should be a picklist
    And the picklist should include sub-region values per SF-719 (e.g. Northern Europe, Western Europe, Northern America)

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 3: Valid combination can be saved via API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-719 @SF-719-API-003 @p2 @validation
  Scenario: API allows valid UNSD Region and Sub-region combination on Country
    Given an approved list of valid UNSD Region and Sub-region combinations exists (data/excel/Allowed Combinations of Region and Sub region.xlsx)
    When I create or update a Country__c record with a valid UNSD Region and UNSD Sub-region combination from that list
    Then the record must be saved successfully via API

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 4: Invalid combination rejected via API
  # ══════════════════════════════════════════════════════════════════════════

  @SF-719 @SF-719-API-004 @p2 @validation @negative
  Scenario: API rejects invalid UNSD Region and Sub-region combination on Country
    Given an approved list of valid UNSD Region and Sub-region combinations exists (data/excel/Allowed Combinations of Region and Sub region.xlsx)
    When I attempt to create or update a Country__c record with an invalid UNSD Region and UNSD Sub-region combination
    Then the API must return a validation error
    And the error must indicate that the UNSD Region and Sub-region combination is not valid
