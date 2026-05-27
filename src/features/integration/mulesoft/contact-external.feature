# ══════════════════════════════════════════════════════════════════════════════
# Salesforce Contact → Dynamics Contact Integration via MuleSoft (External)
# Purpose: Validate External Contact entity integration (SF → D365 only)
# Source: "I contacts -> externalcontact" tab from Mapping and Governance of Data Attributes for CLM Design.xlsx
# Flow: Create Account (with Dataverse_ID__c) → Create Contact → Platform Event → MuleSoft → Dynamics
# Dependency: Parent Account must have Dataverse_ID__c populated
# ══════════════════════════════════════════════════════════════════════════════

@integration @mulesoft @salesforce @dynamics @entity_contact @external_contact @sf_to_d365
Feature: External Contact Integration via MuleSoft
  As a QA engineer
  I want to validate External Contact entity integration from Salesforce Contact to Dynamics Contact via MuleSoft
  So that I can ensure data integrity during ongoing integration for external contacts

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: Contact can only sync if parent Account has Dataverse_ID__c populated

  # ═══════════════════════════════════════════════════════════════════════════
  # HAPPY PATH - CREATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-015 @smoke @positive @integration @sf_to_d365 @external_contact
  Scenario: Create External Contact with parent Account having Dataverse_ID__c
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And I have a test External Contact name "External Contact SF-001"
    When I create an External Contact in Salesforce with:
      | FirstName | External |
      | LastName | Contact SF-001 |
      | Email | external.sf001@test.com |
      | Phone | 555-111-2222 |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should have Dataverse_ID__c populated
    And I retrieve the Contact from Dynamics using Party MasterId
    And the Contact should exist in Dynamics with matching Party MasterId
    And the Contact should have parent Party lookup matching Account Dataverse_ID__c
    And all mapped fields should match between Salesforce Contact and Dynamics Contact

  @INT-UI-016 @positive @integration @sf_to_d365 @external_contact
  Scenario: Create External Contact with parent Account missing Dataverse_ID__c should not sync
    Given I have a parent Account in Salesforce with Status "Prospect" and Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    And I have a test External Contact name "External Contact No Sync"
    When I create an External Contact in Salesforce with:
      | FirstName | External |
      | LastName | Contact No Sync |
      | Email | external.nosync@test.com |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should still have Dataverse_ID__c as null
    And the Contact should not exist in Dynamics for this Party MasterId

  # ═══════════════════════════════════════════════════════════════════════════
  # UPDATE SYNC
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-017 @positive @integration @sf_to_d365 @external_contact
  Scenario: Update External Contact fields and sync to Dynamics
    Given I have an existing External Contact in Salesforce with Dataverse_ID__c populated
    And I have captured the Contact SalesforceID
    When I update the External Contact in Salesforce with:
      | Email | updated.external@test.com |
      | Phone | 555-999-8888 |
    And I wait 3 seconds for MuleSoft processing
    Then I retrieve the Contact from Dynamics using Party MasterId
    And the Contact email should be "updated.external@test.com" in Dynamics
    And the Contact phone should be "555-999-8888" in Dynamics

  # ═══════════════════════════════════════════════════════════════════════════
  # DATA TRANSFORMATION VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-018 @positive @integration @external_contact
  Scenario: Validate email lowercase transformation for External Contact
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    When I create an External Contact in Salesforce with:
      | FirstName | Email |
      | LastName | Test |
      | Email | TestEmail@EXAMPLE.COM |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should have Dataverse_ID__c populated
    And I retrieve the Contact from Dynamics using SalesforceID
    And the Contact email should be "testemail@example.com" in Dynamics

  @INT-UI-019 @positive @integration @external_contact
  Scenario: Validate name transformation (trim, collapse spaces) for External Contact
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    When I create an External Contact in Salesforce with:
      | FirstName |  John   |
      | LastName |  Doe  Smith  |
      | Email | name.test@example.com |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should have Dataverse_ID__c populated
    And I retrieve the Contact from Dynamics using SalesforceID
    And the Contact firstname should be "John" in Dynamics
    And the Contact lastname should be "Doe Smith" in Dynamics

  # ═══════════════════════════════════════════════════════════════════════════
  # ERROR HANDLING
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-020 @negative @integration @external_contact
  Scenario: Contact with invalid email format should not sync
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    When I create an External Contact in Salesforce with:
      | FirstName | Invalid |
      | LastName | Email |
      | Email | invalid-email-format |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should still have Dataverse_ID__c as null
    And the Contact should not exist in Dynamics for this Party MasterId
    # Note: Exception process should be triggered (to be defined)

  @INT-UI-021 @negative @integration @external_contact
  Scenario: Contact with missing FirstName should not sync
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    When I create an External Contact in Salesforce with:
      | LastName | Missing FirstName |
      | Email | missing.firstname@test.com |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should still have Dataverse_ID__c as null
    And the Contact should not exist in Dynamics for this Party MasterId
    # Note: FirstName is mandatory - exception should be triggered
