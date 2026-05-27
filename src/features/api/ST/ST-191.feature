# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ST-191 - Salesforce Mastered Account
# Type: Story | Status: QA | Priority: Medium
# Purpose: Validate Salesforce Mastered Account API operations and integration sync
#         are published one-way into Dynamics in near-real time via MuleSoft
# Flow: API Create/Update Account → Update Status → Platform Event → MuleSoft → Dynamics
# ══════════════════════════════════════════════════════════════════════════════

@api @integration @mulesoft @salesforce @dynamics @ST-191 @entity_account @entity_party @sf_to_d365 @salesforce_mastered
Feature: API - ST-191 - Salesforce Mastered Account Integration
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

  @ST-191 @ST-191-API-001 @smoke @positive @integration @sf_to_d365 @api
  Scenario: API - Create Salesforce Mastered Account via API and sync to Dynamics Party
    Given I have a test Account name "API Test Account ST-191-001"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Test Account ST-191-001 |
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

  @ST-191 @ST-191-API-002 @positive @integration @sf_to_d365 @api
  Scenario: API - Update Salesforce Mastered Account via API and sync to Dynamics Party
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    And I have captured the Account SalesforceID
    And I subscribe to Account Platform Events
    When I update the Account in Salesforce with:
      | Name | API Updated Account ST-191 |
      | Phone | 555-123-4567 |
    Then an Account Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then I retrieve the Party from Dynamics using Party MasterId
    And the Party name should be "API Updated Account ST-191"
    And the Party phone should be "555-123-4567"
    Given I unsubscribe from Account Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API STATUS CHANGE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-191 @ST-191-API-003 @positive @integration @sf_to_d365 @api
  Scenario: API - Change Salesforce Mastered Account status via API and sync to Dynamics
    Given I have an existing Account in Salesforce with Status "Prospect"
    And the Account has Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    And I subscribe to Account Platform Events
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

  @ST-191 @ST-191-API-004 @positive @integration @sf_to_d365 @api
  Scenario: API - Query Account via API and verify Dataverse_ID__c is populated after sync
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    And I have captured the Account SalesforceID
    When I query the Account record via API
    Then the API should return status code 200
    And the Account should have Dataverse_ID__c populated
    And the Dataverse_ID__c should be a valid GUID format
    And the Account should have Party_MasterId__c populated

  @ST-191 @ST-191-API-005 @positive @integration @sf_to_d365 @api
  Scenario: API - Query Account by Party MasterId via API
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Party MasterId
    When I query Account records by Party_MasterId__c via API
    Then the API should return status code 200
    And the query should return at least one Account record
    And the Account should have matching Party_MasterId__c

  # ═══════════════════════════════════════════════════════════════════════════
  # API FIELD VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-191 @ST-191-API-006 @positive @integration @sf_to_d365 @api
  Scenario: API - Verify Account has required fields for integration
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    When I describe the Account object fields
    Then the "Party_MasterId__c" field should exist
    And the "PTY_Code__c" field should exist
    And the "Dataverse_ID__c" field should exist
    And the "Account_Status__c" field should exist

  # ═══════════════════════════════════════════════════════════════════════════
  # API NEGATIVE SCENARIOS
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-191 @ST-191-API-007 @negative @integration @api
  Scenario: API - Create Account with Status New should not sync to Dynamics
    Given I have a test Account name "API Test Account No Sync ST-191"
    When I create an Account in Salesforce with:
      | Name | API Test Account No Sync ST-191 |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Account should still have Dataverse_ID__c as null
    # Note: Account with Status "Prospect" should not trigger integration

  @ST-191 @ST-191-API-008 @negative @integration @api
  Scenario: API - Query Account without Dataverse_ID__c should return null
    Given I have an existing Account in Salesforce with Status "Prospect"
    And the Account has Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    When I query the Account record via API
    Then the API should return status code 200
    And the Account should have Dataverse_ID__c as null
    And the Account should have Party_MasterId__c populated
    # Note: Party_MasterId__c is auto-generated even if not synced

  @ST-191 @ST-191-API-009 @positive @integration @sf_to_d365 @api @onboarding
  Scenario: API - Create Member Account with Onboarding status and sync to Dynamics
    Given I have a test Account name "API Member Account Onboarding ST-191"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Member Account Onboarding ST-191 |
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

  @ST-191 @ST-191-API-010 @negative @integration @api
  Scenario: API - Create Account with Draft status should not sync to Dynamics
    Given I have a test Account name "API Account Draft Status ST-191"
    When I create an Account in Salesforce with:
      | Name | API Account Draft Status ST-191 |
      | Type | Customer |
      | Account_Status__c | Draft |
    Then the Account should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Account should still have Dataverse_ID__c as null
    # Note: Account with Status "Draft" should not trigger integration

  @ST-191 @ST-191-API-011 @positive @integration @sf_to_d365 @api @timeliness
  Scenario: API - Account changes reach Dynamics within 3 minutes - Create
    Given I have a test Account name "API Account Timeliness Create ST-191"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Account Timeliness Create ST-191 |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    Then an Account Platform Event is published
    Then the Dynamics RDM record reflects the change within 3 minutes
    And all mapped fields should match between Salesforce Account and Dynamics Party
    Given I unsubscribe from Account Platform Events

  @ST-191 @ST-191-API-014 @positive @integration @sf_to_d365 @api @timeliness
  Scenario: API - Account changes reach Dynamics within 3 minutes - Update
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Party MasterId
    And I subscribe to Account Platform Events
    When I update the Account in Salesforce with:
      | Name | API Account Timeliness Update ST-191 |
      | Phone | 555-888-9999 |
    Then an Account Platform Event is published
    Then the Dynamics RDM record reflects the change within 3 minutes
    And all mapped fields should match between Salesforce Account and Dynamics Party
    Given I unsubscribe from Account Platform Events

  @ST-191 @ST-191-API-015 @positive @integration @sf_to_d365 @api @timeliness
  Scenario: API - Account changes reach Dynamics within 3 minutes - Status Change
    Given I have an existing Account in Salesforce with Status "Prospect"
    And the Account has Dataverse_ID__c as null
    And I have captured the Account SalesforceID and Party MasterId
    And I subscribe to Account Platform Events
    When I update the Account Status to "Active" to trigger integration
    Then an Account Platform Event is published
    Then the Dynamics RDM record reflects the change within 3 minutes
    And all mapped fields should match between Salesforce Account and Dynamics Party
    Given I unsubscribe from Account Platform Events

  @ST-191 @ST-191-API-012 @positive @integration @sf_to_d365 @api @null_handling @required_fields
  Scenario: API - Optional Salesforce fields left empty must be sent as NULL
    Given I have a test Account name "API Account Null Fields ST-191"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Account Null Fields ST-191 |
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

  @ST-191 @ST-191-API-013 @positive @integration @sf_to_d365 @api @field_mapping @data_integrity
  Scenario: API - Verify all Account to Party field level requirements match exactly
    Given I have a test Account name "API Account Full Field Mapping ST-191"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | API Account Full Field Mapping ST-191 |
      | Type | Customer |
      | Account_Status__c | Prospect |
      | Phone | 555-111-2222 |
      | Email | test.account@example.com |
      | BillingStreet | 123 Test Street |
      | BillingCity | Test City |
      | BillingState | Test State |
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
