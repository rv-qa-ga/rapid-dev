# ══════════════════════════════════════════════════════════════════════════════
# Salesforce Account ↔ Dynamics Party Migration via MuleSoft
# Purpose: Validate Account/Party entity migration (Dynamics Party → Salesforce Account)
# Source: Party Migration tab from Picklist Value Mappings.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@integration @migration @mulesoft @salesforce @dynamics @entity_account @entity_party @d365_to_sf
Feature: Account/Party Migration via MuleSoft
  As a QA engineer
  I want to validate Account/Party entity migration from Dynamics Party to Salesforce Account via MuleSoft
  So that I can ensure data integrity during migration

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: account.type ↔ accelins_party.accelins_partytype mapping is ignored
    # See IGNORED_FIELDS.md for details (rows 12, 20)

  # ═══════════════════════════════════════════════════════════════════════════
  # HAPPY PATH - CREATE SYNC
  # ═══════════════════════════════════════════════════════════════════════════

  @smoke @positive @migration
  Scenario: Migrate Party from Dynamics to Salesforce Account via MuleSoft
    Given I have a Party MasterId "PARTY-MIGRATION-001"
    And the Party exists in Dynamics CRM with MasterId "PARTY-MIGRATION-001"
    When I trigger MuleSoft migration flow for Party "PARTY-MIGRATION-001"
    And I wait for MuleSoft processing to complete
    Then the Account should be created in Salesforce with Party_MasterId__c "PARTY-MIGRATION-001"
    And I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    And the Party should have a corresponding Account in Salesforce
    And all mapped fields should match between Dynamics Party and Salesforce Account

  @positive @migration
  Scenario Outline: Migrate Party with different status values
    Given I have a Party MasterId "<masterId>"
    And the Party exists in Dynamics CRM with MasterId "<masterId>"
    And the Party has status code "<dynamicsStatus>" in Dynamics
    When I trigger MuleSoft migration flow for Party "<masterId>"
    And I wait for MuleSoft processing to complete
    Then the Account should be created in Salesforce with Party_MasterId__c "<masterId>"
    And the Account should have Account_Status__c "<salesforceStatus>"
    And I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    And the status mapping should be correct: Dynamics "<dynamicsStatus>" → Salesforce "<salesforceStatus>"

    Examples:
      | masterId | dynamicsStatus | salesforceStatus |
      | PARTY-STATUS-001 | 0 (Active) | Active |
      | PARTY-STATUS-002 | 0 (Active) | Onboarding |
      | PARTY-STATUS-003 | 0 (Active) | Contracted |
      | PARTY-STATUS-004 | 0 (Active) | Runoff |
      | PARTY-STATUS-005 | 0 (Active) | Offboarded |
      | PARTY-STATUS-006 | 1 (Inactive) | (empty) |

  # ═══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUE VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @migration
  Scenario Outline: Validate picklist value mapping during migration
    Given I have a Party MasterId "<masterId>"
    And the Party exists in Dynamics CRM with MasterId "<masterId>"
    And the Party has field "<dynamicsField>" with value "<dynamicsValue>" in Dynamics
    When I trigger MuleSoft migration flow for Party "<masterId>"
    And I wait for MuleSoft processing to complete
    Then the Account should be created in Salesforce with Party_MasterId__c "<masterId>"
    And I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    And the picklist value should be mapped correctly:
      | Dynamics Field | Dynamics Value | Salesforce Field | Salesforce Value |
      | <dynamicsField> | <dynamicsValue> | <salesforceField> | <salesforceValue> |

    Examples:
      | masterId | dynamicsField | dynamicsValue | salesforceField | salesforceValue |
      | PARTY-PL-001 | accelins_party.accelins_admittednonadmitted | Admitted | account.Admission_Status_c | Admitted |
      | PARTY-PL-002 | accelins_party.accelins_admittednonadmitted | Non-Admitted | account.Admission_Status_c | Non-Admitted |
      | PARTY-PL-003 | accelins_party.accelins_affiliate_nonaffiliate | Affiliate | account.Affiliate_Non_Affiliate_c | Affiliate |
      | PARTY-PL-004 | accelins_party.accelins_affiliate_nonaffiliate | Non-Affiliate | account.Affiliate_Non_Affiliate_c | Non-Affiliate |
      | PARTY-PL-005 | accelins_party.accelins_functional_currency | USD | account.Functional_Currency_c | USD |
      | PARTY-PL-006 | accelins_party.accelins_functional_currency | GBP | account.Functional_Currency_c | GBP |
      | PARTY-PL-007 | accelins_party.accelins_functional_currency | EUR | account.Functional_Currency_c | EUR |
      | PARTY-PL-008 | accelins_party.accelins_functional_currency | CAD | account.Functional_Currency_c | CAD |

  # ═══════════════════════════════════════════════════════════════════════════
  # FIELD MAPPING VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @migration
  Scenario: Validate critical field mappings during migration
    Given I have a Party MasterId "PARTY-FIELDS-001"
    And the Party exists in Dynamics CRM with MasterId "PARTY-FIELDS-001"
    And the Party has the following data in Dynamics:
      | Field | Value |
      | accelins_partyid | PARTY-FIELDS-001 |
      | accelins_name | Test Party Name |
      | accelins_accountnumber | ACC-001 |
      | accelins_email | test@example.com |
      | accelins_phone | 555-123-4567 |
    When I trigger MuleSoft migration flow for Party "PARTY-FIELDS-001"
    And I wait for MuleSoft processing to complete
    Then the Account should be created in Salesforce with Party_MasterId__c "PARTY-FIELDS-001"
    And I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    And the following critical fields should match:
      | Dynamics Field | Salesforce Field | Expected Value |
      | accelins_partyid | Party_MasterId__c | PARTY-FIELDS-001 |
      | accelins_name | Name | Test Party Name |
      | accelins_accountnumber | AccountNumber | ACC-001 |
      | accelins_email | Email__c | test@example.com |
      | accelins_phone | Phone | 555-123-4567 |

  # ═══════════════════════════════════════════════════════════════════════════
  # DATA TRANSFORMATION VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @migration
  Scenario: Validate data type transformations during migration
    Given I have a Party MasterId "PARTY-TRANSFORM-001"
    And the Party exists in Dynamics CRM with MasterId "PARTY-TRANSFORM-001"
    And the Party has date field "accelins_createdon" with value "2024-01-15T10:30:00Z" in Dynamics
    When I trigger MuleSoft migration flow for Party "PARTY-TRANSFORM-001"
    And I wait for MuleSoft processing to complete
    Then the Account should be created in Salesforce with Party_MasterId__c "PARTY-TRANSFORM-001"
    And I retrieve the Party details from Dynamics CRM by MasterId
    And I retrieve the corresponding Account details from Salesforce by MasterId
    And date fields should be converted correctly
    And number fields should be converted correctly
    And text fields should be trimmed and normalized

  # ═══════════════════════════════════════════════════════════════════════════
  # ERROR HANDLING
  # ═══════════════════════════════════════════════════════════════════════════

  @negative @migration
  Scenario: Migration should fail for Party with missing required fields
    Given I have a Party MasterId "PARTY-ERROR-001"
    And the Party exists in Dynamics CRM with MasterId "PARTY-ERROR-001"
    And the Party is missing required field "accelins_name" in Dynamics
    When I trigger MuleSoft migration flow for Party "PARTY-ERROR-001"
    And I wait for MuleSoft processing to complete
    Then the migration should fail with appropriate error
    And the Account should not be created in Salesforce with Party_MasterId__c "PARTY-ERROR-001"
    And the error should indicate missing required field

  @negative @migration
  Scenario: Migration should handle invalid picklist values gracefully
    Given I have a Party MasterId "PARTY-ERROR-002"
    And the Party exists in Dynamics CRM with MasterId "PARTY-ERROR-002"
    And the Party has invalid picklist value "INVALID_VALUE" for field "accelins_party.accelins_admittednonadmitted"
    When I trigger MuleSoft migration flow for Party "PARTY-ERROR-002"
    And I wait for MuleSoft processing to complete
    Then the migration should handle the invalid value appropriately
    And either the Account should be created with default value or migration should fail with clear error

  # ═══════════════════════════════════════════════════════════════════════════
  # BATCH MIGRATION
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @migration
  Scenario: Migrate multiple Parties in batch
    Given I have a list of Party MasterIds:
      | masterId |
      | PARTY-BATCH-001 |
      | PARTY-BATCH-002 |
      | PARTY-BATCH-003 |
    When I trigger MuleSoft batch migration flow for the Party MasterIds
    And I wait for MuleSoft batch processing to complete
    Then all Parties should have corresponding Accounts in Salesforce
    And I validate each Party migration
    And a migration validation report should be generated

  # ═══════════════════════════════════════════════════════════════════════════
  # IDEMPOTENCY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @migration
  Scenario: Migration should be idempotent (re-run should not create duplicates)
    Given I have a Party MasterId "PARTY-IDEMPOTENT-001"
    And the Party exists in Dynamics CRM with MasterId "PARTY-IDEMPOTENT-001"
    When I trigger MuleSoft migration flow for Party "PARTY-IDEMPOTENT-001"
    And I wait for MuleSoft processing to complete
    And the Account is created in Salesforce with Party_MasterId__c "PARTY-IDEMPOTENT-001"
    When I trigger MuleSoft migration flow for Party "PARTY-IDEMPOTENT-001" again
    And I wait for MuleSoft processing to complete
    Then only one Account should exist in Salesforce with Party_MasterId__c "PARTY-IDEMPOTENT-001"
    And the Account should be updated (not duplicated)

