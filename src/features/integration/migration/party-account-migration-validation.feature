# ══════════════════════════════════════════════════════════════════════════════
# Dynamics CRM to Salesforce Migration Validation Tests
# Purpose: Validate that Party data migrated from Dynamics CRM to Salesforce is correct
# ══════════════════════════════════════════════════════════════════════════════

@integration @migration @validation @party @account
Feature: Party to Account Migration Validation
  As a QA engineer
  I want to validate migrated Party data from Dynamics CRM to Salesforce
  So that I can ensure data integrity after migration

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce

  # ═══════════════════════════════════════════════════════════════════════════
  # SINGLE PARTY VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @smoke @positive
  Scenario Outline: Validate migrated Party data by MasterId
    Given I have a Party MasterId "<masterId>"
    When I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    Then the Party should have a corresponding Account in Salesforce
    And all mapped fields should match between Dynamics Party and Salesforce Account
    And all fields from the mapping document should be verified
    And any field differences should be reported

    Examples:
      | masterId |
      | PARTY-001 |
      | PARTY-002 |

  @positive
  Scenario: Validate Party migration with specific MasterId
    Given I have a Party MasterId "PARTY-12345"
    When I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    Then the Party should have a corresponding Account in Salesforce
    And all mapped fields should match between Dynamics Party and Salesforce Account
    And all fields from the mapping document should be verified
    And any field differences should be reported

  # ═══════════════════════════════════════════════════════════════════════════
  # BATCH VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Validate multiple Parties migration
    Given I have a list of Party MasterIds:
      | masterId |
      | PARTY-001 |
      | PARTY-002 |
      | PARTY-003 |
    When I validate each Party migration
    Then all Parties should have corresponding Accounts in Salesforce
    And a migration validation report should be generated

  # ═══════════════════════════════════════════════════════════════════════════
  # NEGATIVE TEST CASES
  # ═══════════════════════════════════════════════════════════════════════════

  @negative
  Scenario: Validate Party that was not migrated
    Given I have a Party MasterId "PARTY-NOT-MIGRATED"
    When I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    Then the Party should exist in Dynamics CRM
    And the Party should not have a corresponding Account in Salesforce
    And the migration validation should report missing Account

  @negative
  Scenario: Validate Party with missing MasterId in Salesforce
    Given I have a Party MasterId "PARTY-MISSING-ID"
    When I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    Then the Party should exist in Dynamics CRM
    And the Account in Salesforce should have the MasterId field populated
    And if MasterId is missing, the migration validation should report the issue

  # ═══════════════════════════════════════════════════════════════════════════
  # FIELD-LEVEL VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Validate critical fields match exactly
    Given I have a Party MasterId "PARTY-CRITICAL"
    When I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    Then the following critical fields must match exactly:
      | Dynamics Field | Salesforce Field | Field Type |
      | accelins_name  | Name             | Text       |
      | accelins_partyid | Party_MasterId__c | External ID |
    And any mismatches in critical fields should fail the validation

  @positive
  Scenario: Validate optional fields with tolerance
    Given I have a Party MasterId "PARTY-OPTIONAL"
    When I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    Then the following optional fields should match with tolerance:
      | Dynamics Field | Salesforce Field | Tolerance Type |
      | accelins_phone | Phone            | Exact          |
      | accelins_email | Email__c         | Exact          |
    And differences in optional fields should be reported as warnings

  # ═══════════════════════════════════════════════════════════════════════════
  # DATA TYPE VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Validate data type conversions
    Given I have a Party MasterId "PARTY-DATATYPE"
    When I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    Then date fields should be converted correctly
    And number fields should be converted correctly
    And text fields should be trimmed and normalized
    And any data type conversion issues should be reported

  # ═══════════════════════════════════════════════════════════════════════════
  # REPORTING
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Generate detailed migration validation report
    Given I have a Party MasterId "PARTY-REPORT"
    When I validate the Party migration
    Then a detailed validation report should be generated with:
      | Report Section        | Description                          |
      | Summary               | Overall validation status            |
      | Field Comparisons     | Side-by-side field value comparison  |
      | Differences           | List of all field differences        |
      | Missing Fields        | Fields present in one system only    |
      | Recommendations       | Suggested fixes for issues           |
    And the report should be saved to the reports directory

