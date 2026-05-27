# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ST-241 - Salesforce Mastered Contact (Internal) - API Tests
# Type: Story | Status: QA | Priority: Medium
# Purpose: Validate Salesforce Mastered Internal Contact API operations (create/update) 
#         are published one-way into Dynamics Dataverse in near-real time via MuleSoft
# Flow: API Create/Update AccountTeamMember → Platform Event → MuleSoft → Dynamics
# Dependency: Parent Account must have Dataverse_ID__c populated
# Reference: Excel "I TeamMember -> internal_contact" tab
# Integration Document: Contact & Account section
# ══════════════════════════════════════════════════════════════════════════════

@api @integration @mulesoft @salesforce @dynamics @ST-241 @entity_accountteammember @entity_internal_contact @sf_to_d365 @salesforce_mastered
Feature: API - ST-241 - Salesforce Mastered Contact (Internal) Integration
  As a Product Owner
  I want to validate Salesforce Mastered Contact (Internal) API operations (create/update) 
  and verify they are published one-way into Dynamics Dataverse in near-real time via MuleSoft
  So that mastered internal contact changes in Dynamics Dataverse are always consistent

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: Field mappings are configured as per "I TeamMember -> internal_contact" Excel tab
    # Note: AccountTeamMember can only sync if parent Account has Dataverse_ID__c populated
    # Note: User must have Azure_AD_Object_ID__c populated for user mapping

  # ═══════════════════════════════════════════════════════════════════════════
  # API CREATE SYNC (SF → D365) - DATAVERSE ID GATE
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-241 @ST-241-API-001 @smoke @positive @integration @sf_to_d365 @api @internal_contact @create
  Scenario: API - Create internal contact when parent Account has Dataverse ID
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And the Account has all available fields populated for Dataverse sync:
      | Data_Source_Claims__c | Platform |
      | Data_Source_Written__c | Platform |
      | Claims_Production_Period_Effective_From__c | 2026-01-21 |
      | Written_Accounting_Period_Effective_From__c | 2026-01-21 |
      | Phone | 555-123-4567 |
      | Email__c | account.st241.api@test.com |
      | Website | https://www.testaccount-st241-api.com |
      | BillingStreet | 123 Test Street |
      | BillingCity | Test City |
      | BillingState | Test State |
      | BillingPostalCode | 12345 |
      | BillingCountry | United States |
      | Functional_Currency__c | USD |
      | Affiliate_Non_Affiliate__c | AFL |
      | Region__c | EU |
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    And I subscribe to Account Team Member Platform Events
    When I add an AccountTeamMember to the Account via API with:
      | UserId | <userId> |
      | TeamMemberRole | Member Relationship Director |
    Then the AccountTeamMember should be created with a SalesforceID
    Then a Account Team Member Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should have Dataverse_ID__c populated
    And I retrieve the Internal Contact from Dynamics using AccountTeamMember Party MasterId
    And the Internal Contact should exist in Dynamics with matching Party MasterId
    And all mapped fields should match Salesforce values for "I team member -> Internal_Contact"
    Given I unsubscribe from Account Team Member Platform Events

  @ST-241 @ST-241-API-002 @negative @integration @api @internal_contact @dataverse_id_gate
  Scenario: API - Do not create internal contact when parent Account has no Dataverse ID
    Given I have a parent Account in Salesforce with Status "Prospect" and Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    When I add an AccountTeamMember to the Account via API with:
      | UserId | <userId> |
      | TeamMemberRole | Member Relationship Director |
    Then the AccountTeamMember should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should still have Dataverse_ID__c as null
    Then no Internal_Contact record is created/updated in Dynamics RDM for that contact

  # ═══════════════════════════════════════════════════════════════════════════
  # API UPDATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-241 @ST-241-API-003 @positive @integration @sf_to_d365 @api @internal_contact @update
  Scenario: API - Update internal contact in Salesforce and publish updates to Dynamics
    Given I have an existing AccountTeamMember in Salesforce with Internal Contact in Dynamics
    And the parent Account has Dataverse_ID__c populated
    And the corresponding Internal_Contact record exists in Dynamics RDM
    And I have captured the AccountTeamMember SalesforceID
    And I subscribe to Account Team Member Platform Events
    When I update the AccountTeamMember in Salesforce via API with:
      | TeamMemberRole | Updated Role API |
      | Geography__c | US |
      | Region__c | US |
    Then a Account Team Member Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the corresponding Internal_Contact record in Dynamics RDM is updated
    And I retrieve the Internal Contact from Dynamics using AccountTeamMember Party MasterId
    And all mapped fields should match Salesforce values for "I team member -> Internal_Contact"
    Given I unsubscribe from Account Team Member Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API FIELD MAPPING & DATA INTEGRITY
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-241 @ST-241-API-004 @positive @integration @sf_to_d365 @api @internal_contact @field_mapping @data_integrity
  Scenario: API - Verify all required internal contact fields are mapped correctly
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And the Account has all available fields populated for Dataverse sync:
      | Data_Source_Claims__c | Platform |
      | Data_Source_Written__c | Platform |
      | Claims_Production_Period_Effective_From__c | 2026-01-21 |
      | Written_Accounting_Period_Effective_From__c | 2026-01-21 |
      | Phone | 555-123-4567 |
      | Email__c | account.st241.api.fieldmapping@test.com |
      | Website | https://www.testaccount-st241-api-fm.com |
      | BillingStreet | 456 Field Mapping Street |
      | BillingCity | Field Mapping City |
      | BillingState | FM State |
      | BillingPostalCode | 54321 |
      | BillingCountry | United States |
      | Functional_Currency__c | USD |
      | Affiliate_Non_Affiliate__c | AFL |
      | Region__c | EU |
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    And I have an AccountTeamMember with values populated for all required mapped fields
    And I subscribe to Account Team Member Platform Events
    When I add the AccountTeamMember to the Account via API with:
      | UserId | <userId> |
      | TeamMemberRole | Member Relationship Director |
      | Geography__c | EU/UK |
      | Region__c | EU |
    Then the AccountTeamMember should be created with a SalesforceID
    Then a Account Team Member Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Contact should have Dataverse_ID__c populated
    Then the corresponding Internal_Contact record exists in Dynamics RDM
    And I retrieve the Internal Contact from Dynamics using AccountTeamMember Party MasterId
    And each required field mapped in "I team member -> Internal_Contact" matches exactly between Salesforce and Dynamics
    Given I unsubscribe from Account Team Member Platform Events
