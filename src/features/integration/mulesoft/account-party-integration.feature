# ══════════════════════════════════════════════════════════════════════════════
# Salesforce Account → Dynamics Party Integration via MuleSoft
# Purpose: Validate Account/Party entity integration (SF → D365 only)
# Source: "I accounts -> party" tab from Mapping and Governance of Data Attributes for CLM Design.xlsx
# Flow: Create Account → Update Status to Active/Onboarding → Platform Event → MuleSoft → Dynamics
# ══════════════════════════════════════════════════════════════════════════════

@integration @mulesoft @salesforce @dynamics @entity_account @entity_party @sf_to_d365
Feature: Account/Party Integration via MuleSoft
  As a QA engineer
  I want to validate Account/Party entity integration from Salesforce Account to Dynamics Party via MuleSoft
  So that I can ensure data integrity during ongoing integration

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: account.type ↔ accelins_party.accelins_partytype mapping is ignored
    # See IGNORED_FIELDS.md for details (rows 12, 20)

  # ═══════════════════════════════════════════════════════════════════════════
  # HAPPY PATH - CREATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-001 @smoke @positive @integration @sf_to_d365
  Scenario: Create Account with Active status and sync to Dynamics Party
    Given I have a test Account name "Integration Test Account SF-001"
    When I create an Account in Salesforce with:
      | Name | Integration Test Account SF-001 |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account should have PTY_Code__c auto-generated
    And the Account should have Dataverse_ID__c as null
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    And the Party should have PTY Code matching Salesforce Account
    And all mapped fields should match between Salesforce Account and Dynamics Party

  @INT-UI-002 @positive @integration @sf_to_d365
  Scenario: Create Member Account with Onboarding status and sync to Dynamics Party
    Given I have a test Account name "Member Integration Test Account"
    When I create an Account in Salesforce with:
      | Name | Member Integration Test Account |
      | Type | Member |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account should have PTY_Code__c auto-generated
    And the Account should have Dataverse_ID__c as null
    When I update the Account Status to "Onboarding" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    And the Party should have accelins_partytype matching "Member"

  @INT-UI-003 @positive @integration @sf_to_d365
  Scenario: Create Account with Ineligible status should not sync
    Given I have a test Account name "Ineligible Status Test Account"
    When I create an Account in Salesforce with:
      | Name | Ineligible Status Test Account |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account should have PTY_Code__c auto-generated
    And the Account should have Dataverse_ID__c as null
    When I wait 5 seconds for MuleSoft processing
    Then the Account should still have Dataverse_ID__c as null
    And the Party should not exist in Dynamics for this Party MasterId

  # ═══════════════════════════════════════════════════════════════════════════
  # UPDATE SYNC
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-004 @positive @integration @sf_to_d365
  Scenario: Update Account fields and sync to Dynamics Party
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    And I have captured the Account SalesforceID
    When I update the Account in Salesforce with:
      | Name | Updated Account Name |
      | Phone | 555-999-8888 |
    And I wait 3 seconds for MuleSoft processing
    Then I retrieve the Party from Dynamics using Party MasterId
    And the Party name should be "Updated Account Name"
    And the Party phone should be "555-999-8888"

  @INT-UI-005 @positive @integration @sf_to_d365
  Scenario: Update Account status from New to Active triggers sync
    Given I have an existing Account in Salesforce with Status "Prospect"
    And the Account has Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId

  # ═══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUE VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-006 @positive @integration
  Scenario Outline: Validate picklist value mapping during integration
    Given I have a test Account name "<accountName>"
    When I create an Account in Salesforce with:
      | Name | <accountName> |
      | Type | <accountType> |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "<status>" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using SalesforceID
    And the picklist value should be mapped correctly:
      | Salesforce Field | Salesforce Value | Dynamics Field | Dynamics Value |
      | <salesforceField> | <salesforceValue> | <dataverseField> | <dataverseValue> |

    Examples:
      | accountName | accountType | status | salesforceField | salesforceValue | dataverseField | dataverseValue |
      | Test Account 1 | Customer | Active | Account_Status__c | Active | accelins_party.statuscode | 1 |
      | Test Account 2 | Member | Onboarding | Account_Status__c | Onboarding | accelins_party.statuscode | 376140001 |
      | Test Account 3 | Customer | Contracted | Account_Status__c | Contracted | accelins_party.statuscode | 376140001 |
      | Test Account 4 | Customer | Runoff | Account_Status__c | Runoff | accelins_party.statuscode | 376140002 |
      | Test Account 5 | Customer | Offboarded | Account_Status__c | Offboarded | accelins_party.statuscode | 376140002 |

  # ═══════════════════════════════════════════════════════════════════════════
  # STATUS CODE MAPPINGS (from Status Mapping tab)
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-007 @positive @integration
  Scenario Outline: Validate status code mappings for Account/Party
    Given I have a test Account name "<accountName>"
    When I create an Account in Salesforce with:
      | Name | <accountName> |
      | Type | <accountType> |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "<sfStatus>" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using SalesforceID
    And the status code mapping should be correct:
      | Salesforce Field | Salesforce Value | Dynamics statecode | Dynamics statuscode |
      | Account_Status__c | <sfStatus> | <dvStatecode> | <dvStatuscode> |

    Examples:
      | accountName | accountType | sfStatus | dvStatecode | dvStatuscode |
      | Status Test 1 | Customer | Active | 0 | 1 |
      | Status Test 2 | Customer | Inactive | 1 | 2 |
      | Status Test 3 | Member | Onboarding | 0 | 376140001 |
      | Status Test 4 | Customer | Contracted | 0 | 376140001 |
      | Status Test 5 | Customer | Runoff | 0 | 376140002 |
      | Status Test 6 | Customer | Offboarded | 0 | 376140002 |

  # ═══════════════════════════════════════════════════════════════════════════
  # FIELD MAPPING VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-008 @positive @integration
  Scenario: Validate critical field mappings during integration
    Given I have a test Account name "Field Mapping Test Account"
    When I create an Account in Salesforce with:
      | Name | Field Mapping Test Account |
      | Type | Customer |
      | AccountNumber | ACC-FIELDS-001 |
      | Phone | 555-123-4567 |
      | Email__c | fields@test.com |
      | BillingStreet | 123 Test St |
      | BillingCity | Test City |
      | BillingState | Test State |
      | BillingPostalCode | 12345 |
      | BillingCountry | United States |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using SalesforceID
    And the following critical fields should match:
      | Salesforce Field | Dynamics Field | Expected Value |
      | Name | accelins_name | Field Mapping Test Account |
      | AccountNumber | accelins_accountnumber | ACC-FIELDS-001 |
      | Phone | accelins_phone | 555-123-4567 |
      | Email__c | accelins_email | fields@test.com |
      | BillingStreet | accelins_address1_line1 | 123 Test St |
      | BillingCity | accelins_address1_city | Test City |
      | BillingState | accelins_address1_stateorprovince | Test State |
      | BillingPostalCode | accelins_address1_postalcode | 12345 |

  # ═══════════════════════════════════════════════════════════════════════════
  # DATA TRANSFORMATION VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-009 @positive @integration
  Scenario: Validate address transformation (single field to address line 1)
    Given I have a test Account name "Address Transformation Test"
    When I create an Account in Salesforce with:
      | Name | Address Transformation Test |
      | Type | Customer |
      | BillingStreet | 123 Main Street, Suite 100, Building A |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using SalesforceID
    And the Party address1_line1 should be "123 Main Street, Suite 100, Building A"
    And the Party address1_line2 should be null

  @INT-UI-010 @positive @integration
  Scenario: Validate email lowercase transformation
    Given I have a test Account name "Email Transformation Test"
    When I create an Account in Salesforce with:
      | Name | Email Transformation Test |
      | Type | Customer |
      | Email__c | TestEmail@EXAMPLE.COM |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using SalesforceID
    And the Party email should be "testemail@example.com"

  # ═══════════════════════════════════════════════════════════════════════════
  # ERROR HANDLING
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-011 @negative @integration
  Scenario: Account with missing required mapping should not sync
    Given I have a test Account name "Missing Mapping Test"
    When I create an Account in Salesforce with:
      | Name | Missing Mapping Test |
      | Type | Customer |
      | BillingCountry | Invalid Country |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should still have Dataverse_ID__c as null
    And the Party should not exist in Dynamics for this Party MasterId
    # Note: Exception process should be triggered (to be defined)

  @INT-UI-012 @negative @integration
  Scenario: Account update with invalid Dataverse_ID__c should fail gracefully
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated with invalid GUID "00000000-0000-0000-0000-000000000000"
    When I update the Account in Salesforce with:
      | Name | Invalid GUID Test |
    And I wait 3 seconds for MuleSoft processing
    Then the Account update should be logged as exception
    # Note: Exception handling process to be defined

  # ═══════════════════════════════════════════════════════════════════════════
  # UPSERT BEHAVIOR
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-013 @positive @integration @upsert
  Scenario: Upsert Account using SalesforceID as alternate key
    Given I have a test Account name "Upsert Test Account"
    When I create an Account in Salesforce with:
      | Name | Upsert Test Account |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using SalesforceID
    And the Party should exist in Dynamics
    When I update the Account in Salesforce with:
      | Name | Upsert Updated Account |
    And I wait 3 seconds for MuleSoft processing
    Then I retrieve the Party from Dynamics using Party MasterId
    And the Party name should be "Upsert Updated Account"
    And the same Party record should be updated (not duplicated)

  # ═══════════════════════════════════════════════════════════════════════════
  # OBSERVABILITY
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-014 @positive @integration
  Scenario: Verify Dataverse_ID__c is populated after successful sync
    Given I have a test Account name "Observability Test Account"
    When I create an Account in Salesforce with:
      | Name | Observability Test Account |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account should have Dataverse_ID__c as null
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And the Dataverse_ID__c should be a valid GUID format
    And I retrieve the Party from Dynamics using Dataverse_ID__c
    And the Party should exist in Dynamics
