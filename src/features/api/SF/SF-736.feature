# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-736 — Salesforce Mastered Account (same coverage as legacy ST-191)
# Type: Story | Priority: Medium
# Purpose: Validate Salesforce Mastered Account API operations and integration sync
#         are published one-way into Dynamics in near-real time via MuleSoft
# Flow: API Create/Update Account → Update Status → Platform Event → MuleSoft → Dynamics
#
# MRD Member/TPA–focused API pack: src/features/api/SF/SF-736-mrd-member-tpa.feature
# ══════════════════════════════════════════════════════════════════════════════

@api @integration @mulesoft @salesforce @dynamics @SF-736 @entity_account @entity_party @sf_to_d365 @salesforce_mastered
Feature: API - SF-736 - Salesforce Mastered Account Integration
  As a Product Owner
  I want to validate Salesforce Mastered Account API operations (create/update/status change/delete)
  and verify they are published one-way into Dynamics in near-real time via MuleSoft
  So that mastered account user in Dynamics is always consistent

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: Field mappings are configured as per "I Accounts -> Party" Excel tab requirements
    # Reference: Mapping and Governance of Data Attributes for CLM Design-19-Jan-2025.xlsx

  # ═══════════════════════════════════════════════════════════════════════════
  # API CREATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-736 @SF-736-API-001 @smoke @positive @integration @sf_to_d365 @api
  Scenario: API - Create Salesforce Mastered Account via API and sync to Dynamics Party
    Given I have a test Account name "API Test Account SF-736-001"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Test Account SF-736-001 |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account should have PTY_Code__c auto-generated
    And the Account should have Dataverse_ID__c as null
    When I update the Account Status to "Active" to trigger integration
    Then an Account Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    And the Party should have PTY Code matching Salesforce Account
    Given I unsubscribe from Account Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API UPDATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-736 @SF-736-API-002 @positive @integration @sf_to_d365 @api
  Scenario: API - Update Salesforce Mastered Account via API and sync to Dynamics Party
    Given I have a synced Customer Account in Salesforce for integration tests
    And I have captured the Account SalesforceID
    And I subscribe to Account Platform Events
    When I update the Account in Salesforce with:
      | Name | API Updated Account SF-736 |
      | BillingStreet | 456 Updated Street SF-736 |
    Then an Account Platform Event is published
    And I wait 10 seconds for MuleSoft processing
    Then I retrieve the Party from Dynamics using Party MasterId
    And the Party billing street should be "456 Updated Street SF-736"
    Given I unsubscribe from Account Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API STATUS CHANGE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-736 @SF-736-API-003 @positive @integration @sf_to_d365 @api
  Scenario: API - Change Salesforce Mastered Account status via API and sync to Dynamics
    Given I have a test Account name "API Status Change SF-736"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Status Change SF-736 |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account has Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    When I update the Account Status to "Active" to trigger integration
    Then an Account Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    Given I unsubscribe from Account Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API QUERY VERIFICATION
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-736 @SF-736-API-004 @positive @integration @sf_to_d365 @api
  Scenario: API - Query Account via API and verify Dataverse_ID__c is populated after sync
    Given I have a synced Customer Account in Salesforce for integration tests
    And I have captured the Account SalesforceID
    When I query the Account record via API
    Then the API should return status code 200
    And the Account should have Dataverse_ID__c populated
    And the Dataverse_ID__c should be a valid GUID format
    And the Account should have Party_MasterId__c populated

  @SF-736 @SF-736-API-005 @positive @integration @sf_to_d365 @api
  Scenario: API - Query Account by Party MasterId via API
    Given I have a synced Customer Account in Salesforce for integration tests
    And I have captured the Account SalesforceID and Party MasterId
    When I query Account records by Party_MasterId__c via API
    Then the API should return status code 200
    And the query should return at least one Account record
    And the Account should have matching Party_MasterId__c

  # ═══════════════════════════════════════════════════════════════════════════
  # API FIELD VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-736 @SF-736-API-006 @positive @integration @sf_to_d365 @api
  Scenario: API - Verify Account has required fields for integration
    When I describe the Account object fields
    And the "PTY_Code__c" field should exist
    And the "Dataverse_ID__c" field should exist
    And the "Account_Status__c" field should exist

  # ═══════════════════════════════════════════════════════════════════════════
  # API NEGATIVE SCENARIOS
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-736 @SF-736-API-007 @negative @integration @api
  Scenario: API - Create Account with Status New should not sync to Dynamics
    Given I have a test Account name "API Test Account No Sync SF-736"
    When I create an Account in Salesforce with:
      | Name | API Test Account No Sync SF-736 |
      | Type | Customer |
      | Account_Status__c | Draft |
    Then the Account should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Account should still have Dataverse_ID__c as null
    # Note: Account with Status "Draft" should not trigger integration

  @SF-736 @SF-736-API-008 @negative @integration @api
  Scenario: API - Query Account without Dataverse_ID__c should return null
    Given I have a test Account name "API Prospect Query SF-736"
    When I create an Account in Salesforce with:
      | Name | API Prospect Query SF-736 |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account should have PTY_Code__c auto-generated
    And the Account has Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    When I query the Account record via API
    Then the API should return status code 200
    And the Account should have Dataverse_ID__c as null
    # Note: Prospect accounts are not synced to Dynamics; PTY_Code__c is auto-generated on create

  @SF-736 @SF-736-API-009 @positive @integration @sf_to_d365 @api @onboarding
  Scenario: API - Create Member Account with Onboarding status and sync to Dynamics
    Given I have a test Account name "API Member Account Onboarding SF-736"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Member Account Onboarding SF-736 |
      | Type | Member |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account should have PTY_Code__c auto-generated
    And the Account should have Dataverse_ID__c as null
    When I update the Account Status to "Onboarding" to trigger integration
    Then an Account Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    Given I unsubscribe from Account Platform Events

  @SF-736 @SF-736-API-010 @negative @integration @api
  Scenario: API - Create Account with Draft status should not sync to Dynamics
    Given I have a test Account name "API Account Draft Status SF-736"
    When I create an Account in Salesforce with:
      | Name | API Account Draft Status SF-736 |
      | Type | Customer |
      | Account_Status__c | Draft |
    Then the Account should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Account should still have Dataverse_ID__c as null
    # Note: Account with Status "Draft" should not trigger integration

  @SF-736 @SF-736-API-011 @positive @integration @sf_to_d365 @api @timeliness
  Scenario: API - Account changes reach Dynamics within 3 minutes - Create
    Given I have a test Account name "API Account Timeliness Create SF-736"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Account Timeliness Create SF-736 |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    Then an Account Platform Event is published
    Then the Dynamics RDM record reflects the change within 3 minutes
    And all mapped fields should match between Salesforce Account and Dynamics Party
    Given I unsubscribe from Account Platform Events

  @SF-736 @SF-736-API-014 @positive @integration @sf_to_d365 @api @timeliness
  Scenario: API - Account changes reach Dynamics within 3 minutes - Update
    Given I have a synced Customer Account in Salesforce for integration tests
    And I have captured the Account SalesforceID and Party MasterId
    And I subscribe to Account Platform Events
    When I update the Account in Salesforce with:
      | Name | API Account Timeliness Update SF-736 |
      | Phone | 555-888-9999 |
    Then an Account Platform Event is published
    Then the Dynamics RDM record reflects the change within 3 minutes
    And all mapped fields should match between Salesforce Account and Dynamics Party
    Given I unsubscribe from Account Platform Events

  @SF-736 @SF-736-API-015 @positive @integration @sf_to_d365 @api @timeliness
  Scenario: API - Account changes reach Dynamics within 3 minutes - Status Change
    Given I have a test Account name "API Timeliness Status SF-736"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Timeliness Status SF-736 |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And the Account has Dataverse_ID__c as null
    And I have captured the Account SalesforceID and Party MasterId
    When I update the Account Status to "Active" to trigger integration
    Then an Account Platform Event is published
    Then the Dynamics RDM record reflects the change within 3 minutes
    And all mapped fields should match between Salesforce Account and Dynamics Party
    Given I unsubscribe from Account Platform Events

  @SF-736 @SF-736-API-012 @positive @integration @sf_to_d365 @api @null_handling @required_fields
  Scenario: API - Optional Salesforce fields left empty must be sent as NULL
    Given I have a test Account name "API Account Null Fields SF-736"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Account Null Fields SF-736 |
      | Type | Customer |
      | Account_Status__c | Prospect |
      | Phone |  |
      | Email |  |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    Then an Account Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    Given I unsubscribe from Account Platform Events
    # Note: Optional fields left empty in Salesforce should be sent as NULL (not blank) to Dynamics

  @SF-736 @SF-736-API-013 @positive @integration @sf_to_d365 @api @field_mapping @data_integrity
  Scenario: API - Verify all Account to Party field level requirements match exactly
    Given I have a test Account name "API Account Full Field Mapping SF-736"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Account Full Field Mapping SF-736 |
      | Type | Customer |
      | Account_Status__c | Prospect |
      | Phone | 555-111-2222 |
      | Email | test.account@example.com |
      | BillingStreet | 123 Test Street |
      | BillingCity | Test City |
      | BillingState | New York |
      | BillingPostalCode | 12345 |
      | BillingCountry | United States |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    Then an Account Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    And all mapped fields should match between Salesforce Account and Dynamics Party
    Given I unsubscribe from Account Platform Events
    # Note: Each field mapped in "I Accounts -> Party" Excel tab should match exactly

  # ═══════════════════════════════════════════════════════════════════════════
  # PARTY TYPE COVERAGE — ALL 17 ACCOUNT TYPES (SF-467 picklist)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-736 @SF-736-API-016 @positive @integration @sf_to_d365 @api @party_types @regression
  Scenario Outline: API - Account Type "<account_type>" syncs to Dynamics Party with correct party type mapping
    Given I have a test Account name for Account Type "<account_type>"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with integration mapped fields for type:
      | Type              | <account_type> |
      | Account_Status__c | Prospect       |
    Then the Account should be created with a SalesforceID
    And the Account should have PTY_Code__c auto-generated
    And the Account should have Dataverse_ID__c as null
    When I trigger integration for the Account Type using the standard sync status
    Then an Account Platform Event is published
    And I wait 10 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I refresh the Salesforce Account from API
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    And the Party should have PTY Code matching Salesforce Account
    And all Account to Party integration fields should match per Dataverse mapping
    Given I unsubscribe from Account Platform Events
    # Validates Type→accelins_partytype (label e.g. Member, or PTP-*), Data_Source_Written/Claims, Name, Affiliate per CMDT

    Examples:
      | account_type              |
      | Acquisition Company       |
      | Agency                    |
      | Agency Branch             |
      | Distribution Partner      |
      | Group                     |
      | Insurer                   |
      | Insurer Branch            |
      | Legal Entity              |
      | Member                    |
      | Non - Member MGA          |
      | Placing Broker            |
      | Reinsurance Broker        |
      | Reinsurer                 |
      | Reinsurer Branch          |
      | Service Company           |
      | Third Party Administrator |
      | TPA Group                 |

  @SF-736 @SF-736-API-017 @positive @integration @sf_to_d365 @api @account_status @regression
  Scenario Outline: API - Account Status "<account_status>" for Type "<account_type>" syncs statecode and statuscode to Dynamics Party
    Given I have a test Account name for Account Type "<account_type>" and status sync "<account_status>"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with integration mapped fields for type:
      | Type              | <account_type> |
      | Account_Status__c | Prospect       |
    Then the Account should be created with a SalesforceID
    And the Account should have PTY_Code__c auto-generated
    And the Account should have Dataverse_ID__c as null
    When I update the Account Status to "<account_status>" to trigger integration
    Then an Account Platform Event is published
    And I wait 10 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I refresh the Salesforce Account from API
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    And the Party should have PTY Code matching Salesforce Account
    And all Account to Party integration fields should match per Dataverse mapping
    Given I unsubscribe from Account Platform Events
    # Validates composite Account_Status__c → statecode + statuscode (Status Reason) plus full CMDT field mapping

    Examples:
      | account_type | account_status |
      | Member       | Onboarding     |
      | Customer     | Active         |
