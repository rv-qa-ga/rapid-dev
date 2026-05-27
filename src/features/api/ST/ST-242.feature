# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ST-242 - Salesforce Mastered Contact (External) - API Tests
# Type: Story | Status: QA | Priority: Medium
# Purpose: Validate Salesforce Mastered External Contact API operations (create/update) 
#         are published one-way into Dynamics Dataverse in near-real time via MuleSoft
# Flow: API Create/Update Contact → Platform Event → MuleSoft → Dynamics
# Dependency: Parent Account must have Dataverse_ID__c populated
# Reference: Excel "I contacts -> externalcontact" tab
# Integration Document: Contact & Account section
# ══════════════════════════════════════════════════════════════════════════════

@api @integration @mulesoft @salesforce @dynamics @ST-242 @entity_contact @external_contact @sf_to_d365 @salesforce_mastered
Feature: API - ST-242 - Salesforce Mastered Contact (External) Integration
  As a Product Owner
  I want to validate Salesforce Mastered Contact (External) API operations (create/update) 
  and verify they are published one-way into Dynamics Dataverse in near-real time via MuleSoft
  So that mastered external contact changes in Dynamics Dataverse are always consistent

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: Field mappings are configured as per "I contacts -> externalcontact" Excel tab
    # Note: Contact can only sync if parent Account has Dataverse_ID__c populated
    # Note: MuleSoft uses Account.Dataverse_ID__c to link Contact to Party in Dataverse

  # ═══════════════════════════════════════════════════════════════════════════
  # API CREATE SYNC (SF → D365) - DATAVERSE ID GATE
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-242 @ST-242-API-001 @smoke @positive @integration @sf_to_d365 @api @external_contact @create
  Scenario: API - Create external contact when parent Account has Dataverse ID
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And the Account has all available fields populated for Dataverse sync:
      | Data_Source_Claims__c | Platform |
      | Data_Source_Written__c | Platform |
      | Claims_Production_Period_Effective_From__c | 2026-01-21 |
      | Written_Accounting_Period_Effective_From__c | 2026-01-21 |
      | Phone | 555-123-4567 |
      | Email__c | account.st242.api@test.com |
      | Website | https://www.testaccount-st242-api.com |
      | BillingStreet | 123 Test Street |
      | BillingCity | Test City |
      | BillingState | Test State |
      | BillingPostalCode | 12345 |
      | BillingCountry | United States |
      | Functional_Currency__c | USD |
      | Affiliate_Non_Affiliate__c | AFL |
      | Region__c | EU |
    And I subscribe to Contact Platform Events
    When I create an External Contact in Salesforce via API with:
      | FirstName | API Test |
      | LastName | External Contact ST-242-001 |
      | Email | api.external.st242001@test.com |
      | Phone | 555-111-2222 |
      | MobilePhone | 555-111-2223 |
      | HomePhone | 555-111-2224 |
      | Title | API Test Contact Title |
      | Department | API Test Department |
      | MailingStreet | 789 Contact Street |
      | MailingCity | Contact City |
      | MailingState | Contact State |
      | MailingPostalCode | 67890 |
      | MailingCountry | United States |
      | Contact_Status__c | Active |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    Then a Contact Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should have Dataverse_ID__c populated
    And I retrieve the Contact from Dynamics using Party MasterId
    And the Contact should exist in Dynamics with matching Party MasterId
    And all mapped fields should match Salesforce values for "I Contacts -> External Contacts"
    Given I unsubscribe from Contact Platform Events

  @ST-242 @ST-242-API-002 @negative @integration @api @external_contact @dataverse_id_gate
  Scenario: API - Do not create external contact when parent Account has no Dataverse ID
    Given I have a parent Account in Salesforce with Status "Prospect" and Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    When I create an External Contact in Salesforce via API with:
      | FirstName | API Test |
      | LastName | External Contact No Sync ST-242 |
      | Email | api.external.nosync.st242@test.com |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should still have Dataverse_ID__c as null
    Then the Contact should not exist in Dynamics for this Party MasterId

  # ═══════════════════════════════════════════════════════════════════════════
  # API UPDATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-242 @ST-242-API-003 @positive @integration @sf_to_d365 @api @external_contact @update
  Scenario: API - Update external contact in Salesforce and publish updates to Dynamics
    Given I have an existing External Contact in Salesforce with Dataverse_ID__c populated
    And the corresponding External Contact record exists in Dynamics RDM
    And I have captured the Contact SalesforceID
    And I subscribe to Contact Platform Events
    When I update the External Contact in Salesforce via API with:
      | Email | api.updated.external.st242@test.com |
      | Phone | 555-999-8888 |
      | MobilePhone | 555-999-8889 |
      | Title | API Updated Contact Title |
      | Department | API Updated Department |
      | MailingStreet | 999 Updated Street |
      | MailingCity | Updated City |
      | MailingState | Updated State |
      | MailingPostalCode | 99999 |
    Then a Contact Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the corresponding External Contact record in Dynamics RDM is updated
    And I retrieve the Contact from Dynamics using Party MasterId
    And all mapped fields should match Salesforce values for "I Contacts -> External Contacts"
    Given I unsubscribe from Contact Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API FIELD MAPPING & DATA INTEGRITY
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-242 @ST-242-API-004 @positive @integration @sf_to_d365 @api @external_contact @field_mapping @data_integrity
  Scenario: API - Verify all required external contact fields are mapped correctly
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And the Account has all available fields populated for Dataverse sync:
      | Data_Source_Claims__c | Platform |
      | Data_Source_Written__c | Platform |
      | Claims_Production_Period_Effective_From__c | 2026-01-21 |
      | Written_Accounting_Period_Effective_From__c | 2026-01-21 |
      | Phone | 555-123-4567 |
      | Email__c | account.st242.api.fieldmapping@test.com |
      | Website | https://www.testaccount-st242-api-fm.com |
      | BillingStreet | 456 Field Mapping Street |
      | BillingCity | Field Mapping City |
      | BillingState | FM State |
      | BillingPostalCode | 54321 |
      | BillingCountry | United States |
      | Functional_Currency__c | USD |
      | Affiliate_Non_Affiliate__c | AFL |
      | Region__c | EU |
    And I subscribe to Contact Platform Events
    When I create the External Contact in Salesforce via API with:
      | FirstName | API Test |
      | LastName | External Contact Full Field Mapping ST-242 |
      | Email | api.external.fullmapping@test.com |
      | Phone | 555-111-2222 |
      | MobilePhone | 555-111-2223 |
      | HomePhone | 555-111-2224 |
      | Title | API Full Mapping Contact Title |
      | Department | API Full Mapping Department |
      | MailingStreet | 123 Test Street |
      | MailingCity | Test City |
      | MailingState | Test State |
      | MailingPostalCode | 12345 |
      | MailingCountry | United States |
      | Contact_Status__c | Active |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    Then a Contact Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should have Dataverse_ID__c populated
    Then the corresponding External Contact record exists in Dynamics RDM
    And I retrieve the Contact from Dynamics using Party MasterId
    And each required field mapped in "I contacts -> externalcontact" matches exactly between Salesforce and Dynamics
    Given I unsubscribe from Contact Platform Events
