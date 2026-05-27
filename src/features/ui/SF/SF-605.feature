# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-605 - Make Dataverse field identifier available in Salesforce for integration Country_c -> Country
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2026-01-16T17:18:04.943Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 3
# Description: Generator Only - Full automatic generation from Jira data (current behavior)
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make Dataverse field identifier available in Salesforce for integration Country_c -> Country
# Primary Entity: Record
#
# Fields Involved (1):
#   • identifier available in Salesforce (identifier_available_in_Salesforce__c) - modify
#
# Test Requirements (5):
#   REQ-1: Verify "identifier available in Salesforce" behavior on Record
#     → Test Type: BOTH | Priority: p2
#   REQ-2: the Country to Country field → I query Salesforce to resolve the 
#     → Test Type: BOTH | Priority: p1
#   REQ-3: I am processing a Salesforce Country record that is eligible to b
#     → Test Type: BOTH | Priority: p2
#   REQ-4: I am processing an Country record with an integrated field value 
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Salesforce-held Dataverse IDs can change over time → an integrati
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-605 @medium @auto-populate @field-mapping
Feature: SF-605 - Make Dataverse field identifier available in Salesforce for integration Country_c -> Country
  As a Salesforce user
  I want to verify the Country record contains one or more integrated functionality on Record
  So that Record records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-605 @SF-605-UI-001 @p1 @smoke @positive @the-country-to-country-field-value-mappings-are-defined-in-the-referenced-mapping-artefact-salesforce-holds-the-dataverse-identifiers-needed-to-satisfy-those-mappings-i-have-api-access-to-query-salesforce-as-the-mulesoft-integration @auto-population
  Scenario: Scenario 1
    Given I am logged in as a "The Country To Country Field Value Mappings Are Defined In The Referenced Mapping Artefact Salesforce Holds The Dataverse Identifiers Needed To Satisfy Those Mappings I Have Api Access To Query Salesforce As The Mulesoft Integration" user
    Given The Country to Country field
    Given Value mappings are defined in the referenced mapping artefact
    Given Salesforce holds the Dataverse identifiers needed to satisfy those mappings
    When I query Salesforce to resolve the Dataverse ID for that value
    Then Salesforce returns the Dataverse ID needed for the Dataverse Country payload
    Then No Dataverse IDs or value-to-ID mappings are hard-coded in MuleSoftScenario: Only current/valid Dataverse IDs are returned for integration useGiven Salesforce holds Dataverse IDs for both current
    Then Historical mappings
    And I take a screenshot as evidence

  @SF-605 @SF-605-UI-002 @p1 @positive @auto-population
  Scenario: Scenario 2
    Given I am logged in as a "Accelerant - System administrator" user
    Given I am processing a Salesforce Country record that is eligible to be sent to Dataverse
    Given The Country record contains one or more integrated fields that require Dataverse IDs in the Country payload
    When I query Salesforce for the Dataverse IDs corresponding to the Country’s mapped field values
    Then Salesforce returns the Dataverse IDs for those values
    Then I can populate the Dataverse Country create request using the returned IDsScenario: Retrieve Dataverse IDs for a Country update being sent to DataverseGiven I am processing an update to a Salesforce Country record that is eligible to be sent to Dataverse
    Then One or more integrated fields on the Country record have changed
    And I take a screenshot as evidence

  @SF-605 @SF-605-UI-003 @p1 @positive @auto-population
  Scenario: Scenario 3
    Given I am logged in as a "Accelerant - System administrator" user
    Given I am processing an Country record with an integrated field value that requires a Dataverse ID
    Given Salesforce does not hold a valid Dataverse ID for that value
    When I query Salesforce to resolve the Dataverse ID
    Then Salesforce indicates that no valid Dataverse ID is available
    Then I can raise a controlled integration exception that includes the field name
    Then Field valueScenario: Changes to Dataverse IDs are reflected in Salesforce without MuleSoft code changesGiven a Dataverse ID for an integrated field value changes
    And I take a screenshot as evidence

  @SF-605 @SF-605-UI-004 @p2 @positive @auto-population
  Scenario: Scenario 4
    Given I am logged in as a "Accelerant - System administrator" user
    Given Salesforce-held Dataverse IDs can change over time
    When An integration issue is investigated
    Then Who performed the change
    Then What value
    Then Mapping domain the change related toPlease see below spreadsheet which includes the mapping for the Country_c to Country fields. Tab ‘Integration Country’Picklist Value Mappings.xlsx
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: Country record contains one or more integrated from Source to Record
  # ══════════════════════════════════════════════════════════════════════════

  @SF-605 @SF-605-UI-005 @smoke @p1 @auto-populate
  Scenario: Verify Country record contains one or more integrated auto-populates from Source to Record
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with:
      | field   | value    |
      | Country record contains one or more integrated | EU       |
    And I have a test Record created via API for the Source
    When I navigate to the Record record
    Then the "Country record contains one or more integrated" field should display "EU"
    And I take a screenshot as evidence

  @SF-605 @SF-605-UI-006 @p1 @read-only
  Scenario: Verify Country record contains one or more integrated is NOT editable on Record after creation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with Country record contains one or more integrated "UK"
    And I have a test Record created via API for the Source
    When I navigate to the Record record
    And I click Edit on the Record
    Then the "Country record contains one or more integrated" field should not be editable
    And I take a screenshot as evidence

  @SF-605 @SF-605-UI-007 @p1 @visibility
  Scenario: Verify Country record contains one or more integrated field is visible on Record
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with Country record contains one or more integrated "US"
    And I have a test Record created via API for the Source
    When I navigate to the Record record
    Then the "Country record contains one or more integrated" field should be visible
    And the "Country record contains one or more integrated" field should display "US"
    And I take a screenshot as evidence

  @SF-605 @SF-605-UI-008 @p2 @exact-match
  Scenario: Verify Country record contains one or more integrated value matches exactly from Source
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Source created via API with Country record contains one or more integrated "APAC"
    And I have a test Record created via API for the Source
    When I navigate to the Record record
    Then the "Country record contains one or more integrated" field should display "APAC"
    And the Country record contains one or more integrated value should match exactly what was on the Source
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Country record contains one or more integrated on Record
  # ══════════════════════════════════════════════════════════════════════════

  @SF-605 @SF-605-UI-009 @smoke @p1
  Scenario: Verify Country record contains one or more integrated field is visible on Record
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Record record
    When I navigate to the Record record
    Then the "Country record contains one or more integrated" field should be visible
    And I take a screenshot as evidence

  @SF-605 @SF-605-UI-010 @p1 @edit
  Scenario: Verify Country record contains one or more integrated field can be edited on Record
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Record record
    When I navigate to the Record record
    And I click Edit on the Record
    And I set the "Country record contains one or more integrated" field to "Test Value"
    And I save the record
    Then the Record should be saved successfully
    And the "Country record contains one or more integrated" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: identifier_available_in_Salesforce__c on Record
  # ══════════════════════════════════════════════════════════════════════════

  @SF-605 @SF-605-UI-011 @p1 @picklist-options
  Scenario: Verify all identifier_available_in_Salesforce__c picklist options are available
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Record record
    When I navigate to the Record record
    And I click Edit on the Record
    And I click on the "identifier_available_in_Salesforce__c" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-605 @SF-605-UI-012 @p2 @negative @blank-value
  Scenario: Verify behavior when Country record contains one or more integrated is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Record created via API without "Country record contains one or more integrated"
    When I navigate to the Record record
    Then the "Country record contains one or more integrated" field should be visible
    And the "Country record contains one or more integrated" field should be blank or empty
    And I take a screenshot as evidence

  @SF-605 @SF-605-UI-013 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Country record contains one or more integrated
    Given I am logged in as a read-only user
    And I have a test Record created via API
    When I navigate to the Record record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-605 @SF-605-UI-014 @p2 @ui-data-creation
  Scenario: Create Record record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Record object list
    And I click New to create a Record
    And I fill in required Record fields
    And I save the record
    Then the Record should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (5):
  #   REQ-1: Verify "identifier available in Salesforce" behavior on Record
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-2: the Country to Country field → I query Salesforce to resolve the 
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-3: I am processing a Salesforce Country record that is eligible to b
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: I am processing an Country record with an integrated field value 
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Salesforce-held Dataverse IDs can change over time → an integrati
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 98
  # Existing Steps Used: 98
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 98/98 (100%)
  #   - Feature-Specific Steps Used: 0
