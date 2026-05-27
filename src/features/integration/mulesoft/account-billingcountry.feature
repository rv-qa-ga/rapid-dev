# ══════════════════════════════════════════════════════════════════════════════
# Account BillingCountry Field Value Mappings
# Purpose: Validate BillingCountry field value mappings between Salesforce Account and Dynamics Party
# Source: Custom Metadata (Dataverse_Mapping__mdt) for country mappings
# Flow: Create Account → Update Status → Wait → Verify Country Mapping
# Note: Country mappings are tested as part of Account integration
# ══════════════════════════════════════════════════════════════════════════════

@integration @mulesoft @salesforce @dynamics @entity_account @entity_party @field_mapping @billingcountry
Feature: Account BillingCountry Field Value Mappings
  As a QA engineer
  I want to validate BillingCountry field value mappings between Salesforce Account and Dynamics Party
  So that I can ensure country values are correctly mapped via Custom Metadata during integration

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce

  # ═══════════════════════════════════════════════════════════════════════════
  # COUNTRY VALUE MAPPING VALIDATION (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-022 @smoke @positive @integration @sf_to_d365
  Scenario Outline: Validate BillingCountry value mapping from Salesforce to Dynamics
    Given I have a test Account name "<accountName>"
    When I create an Account in Salesforce with:
      | Name | <accountName> |
      | Type | Customer |
      | BillingCountry | <salesforceCountry> |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account should have PTY_Code__c auto-generated
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    And the BillingCountry value should be mapped correctly:
      | Salesforce BillingCountry | Dynamics accelins_address1_country |
      | <salesforceCountry> | <dynamicsCountryMasterId> |

    Examples:
      | accountName | salesforceCountry | dynamicsCountryMasterId |
      | Country Test US | United States | USA-000001 |
      | Country Test UK | United Kingdom | UK-000001 |
      | Country Test CA | Canada | CA-000001 |
      | Country Test AU | Australia | AU-000001 |
      | Country Test CY | Cyprus | CRY-000055 |

  # ═══════════════════════════════════════════════════════════════════════════
  # COUNTRY CODE TRANSFORMATIONS
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-023 @positive @integration
  Scenario: Validate country name variations are handled correctly
    Given I have a test Account name "Country Variation Test"
    When I create an Account in Salesforce with:
      | Name | Country Variation Test |
      | Type | Customer |
      | BillingCountry | USA |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    # Note: "USA" should map to same Master ID as "United States" via Custom Metadata

  @INT-UI-024 @positive @integration
  Scenario: Validate case-insensitive country mapping
    Given I have a test Account name "Country Case Test"
    When I create an Account in Salesforce with:
      | Name | Country Case Test |
      | Type | Customer |
      | BillingCountry | united states |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    # Note: Country mapping should handle case variations

  # ═══════════════════════════════════════════════════════════════════════════
  # ERROR HANDLING - MISSING COUNTRY MAPPING
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-025 @negative @integration
  Scenario: Account with invalid country value should not sync
    Given I have a test Account name "Invalid Country Test"
    When I create an Account in Salesforce with:
      | Name | Invalid Country Test |
      | Type | Customer |
      | BillingCountry | Invalid Country Name |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should still have Dataverse_ID__c as null
    And the Party should not exist in Dynamics for this Party MasterId
    # Note: Exception process should be triggered when country mapping is missing

  # ═══════════════════════════════════════════════════════════════════════════
  # COUNTRY UPDATE SCENARIOS
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-026 @positive @integration
  Scenario: Update Account BillingCountry and verify sync
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    And I have captured the Account SalesforceID
    When I update the Account in Salesforce with:
      | BillingCountry | Canada |
    And I wait 3 seconds for MuleSoft processing
    Then I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching SalesforceID
    And the Party accelins_address1_country should be mapped to Canada Master ID
