# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ST-242 - Salesforce Mastered Contact (External)
# Type: Story | Status: QA | Priority: Medium
# Purpose: Validate Salesforce Mastered External Contact changes (create/update) 
#         are published one-way into Dynamics Dataverse in near-real time via MuleSoft
# Flow: Create Account (with Dataverse_ID__c) → Create Contact → Platform Event → MuleSoft → Dynamics
# Dependency: Parent Account must have Dataverse_ID__c populated
# Reference: Excel "I contacts -> externalcontact" tab
# Integration Document: Contact & Account section
# ══════════════════════════════════════════════════════════════════════════════

@integration @mulesoft @salesforce @dynamics @ST-242 @entity_contact @external_contact @sf_to_d365 @salesforce_mastered
Feature: ST-242 - Salesforce Mastered Contact (External) Integration
  As a Product Owner
  I want Salesforce Mastered Contact (External) changes (create/update) to be published one-way into Dynamics Dataverse in near-real time
  So that mastered external contact changes in Dynamics Dataverse are always consistent

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: Field mappings are configured as per "I contacts -> externalcontact" Excel tab
    # Note: Contact can only sync if parent Account has Dataverse_ID__c populated
    # Note: External contact object is "Contact" in Salesforce → "contact" in Dynamics Dataverse
    # Note: MuleSoft uses Account.Dataverse_ID__c to link Contact to Party in Dataverse

  # ═══════════════════════════════════════════════════════════════════════════
  # CREATE SYNC (SF → D365) - DATAVERSE ID GATE
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-242 @ST-242-UI-001 @smoke @positive @integration @sf_to_d365 @external_contact @create
  Scenario: Create external contact when parent Account has Dataverse ID
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And the Account has all available fields populated for Dataverse sync:
      | Data_Source_Claims__c | Platform |
      | Data_Source_Written__c | Platform |
      | Claims_Production_Period_Effective_From__c | 2026-01-21 |
      | Written_Accounting_Period_Effective_From__c | 2026-01-21 |
    And I subscribe to Contact Platform Events
    When I create an External Contact in Salesforce with:
      | FirstName | Test |
      | LastName | External Contact ST-242-001 |
      | Email | external.st242001@test.com |
      | Phone | 555-111-2222 |
      | MobilePhone | 555-111-2223 |
      | HomePhone | 555-111-2224 |
      | Title | Test Contact Title |
      | Department | Test Department |
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
    And the Contact should have parent Party lookup matching Account Dataverse_ID__c
    And all mapped fields should match Salesforce values for "I Contacts -> External Contacts"
    Given I unsubscribe from Contact Platform Events

  @ST-242 @ST-242-UI-002 @negative @integration @external_contact @dataverse_id_gate
  Scenario: Do not create external contact when parent Account has no Dataverse ID
    Given I have a parent Account in Salesforce with Status "Prospect" and Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    When I create an External Contact in Salesforce with:
      | FirstName | Test |
      | LastName | External Contact No Sync ST-242 |
      | Email | external.nosync.st242@test.com |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should still have Dataverse_ID__c as null
    Then the Contact should not exist in Dynamics for this Party MasterId
    # Note: Contact should not sync until parent Account has Dataverse_ID__c

  # ═══════════════════════════════════════════════════════════════════════════
  # UPDATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-242 @ST-242-UI-003 @positive @integration @sf_to_d365 @external_contact @update
  Scenario: Update external contact in Salesforce and publish updates to Dynamics
    Given I have an existing External Contact in Salesforce with Dataverse_ID__c populated
    And the corresponding External Contact record exists in Dynamics RDM
    And I have captured the Contact SalesforceID
    And I subscribe to Contact Platform Events
    When I update the External Contact in Salesforce with:
      | Email | updated.external.st242@test.com |
      | Phone | 555-999-8888 |
      | MobilePhone | 555-999-8889 |
      | Title | Updated Contact Title |
      | Department | Updated Department |
      | MailingStreet | 999 Updated Street |
      | MailingCity | Updated City |
      | MailingState | Updated State |
      | MailingPostalCode | 99999 |
    Then a Contact Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the corresponding External Contact record in Dynamics RDM is updated
    And I retrieve the Contact from Dynamics using Party MasterId
    And the Contact email should be "updated.external.st242@test.com" in Dynamics
    And the Contact phone should be "555-999-8888" in Dynamics
    And all mapped fields should match Salesforce values for "I Contacts -> External Contacts"
    Given I unsubscribe from Contact Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # FIELD MAPPING & DATA INTEGRITY
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-242 @ST-242-UI-004 @positive @integration @sf_to_d365 @external_contact @field_mapping @data_integrity
  Scenario: Verify all required external contact fields are mapped correctly
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And the Account has all available fields populated for Dataverse sync:
      | Data_Source_Claims__c | Platform |
      | Data_Source_Written__c | Platform |
      | Claims_Production_Period_Effective_From__c | 2026-01-21 |
      | Written_Accounting_Period_Effective_From__c | 2026-01-21 |
    And I subscribe to Contact Platform Events
    When I create an External Contact in Salesforce with:
      | FirstName | Test |
      | LastName | External Contact Full Field Mapping ST-242 |
      | Email | external.fullmapping@test.com |
      | Phone | 555-111-2222 |
      | MobilePhone | 555-111-2223 |
      | HomePhone | 555-111-2224 |
      | Title | Full Mapping Contact Title |
      | Department | Full Mapping Department |
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
    # Required fields per Excel: emailaddress1, firstname, lastname, accelins_party, contactid, statecode, statuscode
    Given I unsubscribe from Contact Platform Events
