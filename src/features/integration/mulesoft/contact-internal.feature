# ══════════════════════════════════════════════════════════════════════════════
# Salesforce AccountTeamMember → Dynamics Internal Contact Integration via MuleSoft
# Purpose: Validate Internal Contact entity integration (SF → D365 only)
# Source: "I TeamMember ->internal_contact" tab from Mapping and Governance of Data Attributes for CLM Design.xlsx
# Flow: Create Account (with Dataverse_ID__c) → Add AccountTeamMember → Platform Event → MuleSoft → Dynamics
# Dependency: Parent Account must have Dataverse_ID__c populated
# Status Mapping: Create = Active, Delete = Inactive
# ══════════════════════════════════════════════════════════════════════════════

@integration @mulesoft @salesforce @dynamics @entity_accountteammember @entity_internal_contact @sf_to_d365
Feature: Internal Contact Integration via MuleSoft
  As a QA engineer
  I want to validate Internal Contact entity integration from Salesforce AccountTeamMember to Dynamics Internal Contact via MuleSoft
  So that I can ensure data integrity during ongoing integration for internal contacts

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: AccountTeamMember can only sync if parent Account has Dataverse_ID__c populated
    # Note: User must have Azure_AD_Object_ID__c populated for user mapping

  # ═══════════════════════════════════════════════════════════════════════════
  # HAPPY PATH - CREATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-027 @smoke @positive @integration @sf_to_d365 @internal_contact
  Scenario: Add AccountTeamMember with parent Account having Dataverse_ID__c
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    When I add an AccountTeamMember to the Account with:
      | UserId | <userId> |
      | TeamMemberRole | Member Relationship Director |
    Then the AccountTeamMember should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Internal Contact should be created in Dynamics
    And I retrieve the Internal Contact from Dynamics using AccountTeamMember Party MasterId
    And the Internal Contact should exist in Dynamics with matching Party MasterId
    And the Internal Contact should have status "Active"
    And the Internal Contact should have parent Party lookup matching Account Dataverse_ID__c
    And the Internal Contact should have user lookup matching Azure AD Object ID

  @INT-UI-028 @positive @integration @sf_to_d365 @internal_contact
  Scenario: Add AccountTeamMember with parent Account missing Dataverse_ID__c should not sync
    Given I have a parent Account in Salesforce with Status "Prospect" and Dataverse_ID__c as null
    And I have captured the Account SalesforceID
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    When I add an AccountTeamMember to the Account with:
      | UserId | <userId> |
      | TeamMemberRole | Member Relationship Director |
    Then the AccountTeamMember should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Internal Contact should not exist in Dynamics for this AccountTeamMember
    # Note: Contact should not sync until parent Account has Dataverse_ID__c

  # ═══════════════════════════════════════════════════════════════════════════
  # DELETE/DEACTIVATE SYNC
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-029 @positive @integration @sf_to_d365 @internal_contact
  Scenario: Remove AccountTeamMember should deactivate Internal Contact in Dynamics
    Given I have an existing AccountTeamMember in Salesforce with Internal Contact in Dynamics
    And the Internal Contact has status "Active" in Dynamics
    And I have captured the AccountTeamMember SalesforceID
    When I delete the AccountTeamMember from Salesforce
    And I wait 3 seconds for MuleSoft processing
    Then I retrieve the Internal Contact from Dynamics using AccountTeamMember Party MasterId
    And the Internal Contact should have status "Inactive" in Dynamics
    And the Internal Contact statuscode should be "Inactive"

  # ═══════════════════════════════════════════════════════════════════════════
  # USER MAPPING VALIDATION
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-030 @positive @integration @internal_contact
  Scenario: Validate Azure AD Object ID mapping for Internal Contact
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And I have a Salesforce User with Azure_AD_Object_ID__c "<azureObjectId>"
    When I add an AccountTeamMember to the Account with:
      | UserId | <userId> |
      | TeamMemberRole | Member Relationship Director |
    Then the AccountTeamMember should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Internal Contact should be created in Dynamics
    And I retrieve the Internal Contact from Dynamics using AccountTeamMember SalesforceID
    And the Internal Contact should have user lookup matching Azure AD Object ID "<azureObjectId>"

  # ═══════════════════════════════════════════════════════════════════════════
  # ERROR HANDLING
  # ═══════════════════════════════════════════════════════════════════════════

  @INT-UI-031 @negative @integration @internal_contact
  Scenario: AccountTeamMember with User missing Azure AD Object ID should not sync
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And I have a Salesforce User without Azure_AD_Object_ID__c populated
    When I add an AccountTeamMember to the Account with:
      | UserId | <userId> |
      | TeamMemberRole | Member Relationship Director |
    Then the AccountTeamMember should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Internal Contact should not exist in Dynamics for this AccountTeamMember
    # Note: Exception process should be triggered when Azure AD Object ID is missing
