# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ST-191 - Salesforce Mastered Account
# Type: Story | Status: QA | Priority: Medium
# Purpose: Validate Salesforce Mastered Account changes (create/update/status change/delete) 
#         are published one-way into Dynamics in near-real time via MuleSoft
# Flow: Create/Update Account → Update Status → Platform Event → MuleSoft → Dynamics
# ══════════════════════════════════════════════════════════════════════════════

@integration @mulesoft @salesforce @dynamics @ST-191 @entity_account @entity_party @sf_to_d365 @salesforce_mastered
Feature: ST-191 - Salesforce Mastered Account Integration
  As a Product Owner
  I want Salesforce Mastered Account changes (create/update/status change/delete) to be published one-way into Dynamics in near-real time
  So that mastered account user in Dynamics is always consistent

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: Field mappings are configured as per "I Accounts -> Party" Excel tab requirements
    # Reference: Mapping and Governance of Data Attributes for CLM Design-19-Jan-2025.xlsx

  # ═══════════════════════════════════════════════════════════════════════════
  # CREATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-191 @ST-191-UI-001 @smoke @positive @integration @sf_to_d365
  Scenario: Create Salesforce Mastered Account and sync to Dynamics Party
    Given I have a test Account name "Salesforce Mastered Account ST-191-001"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | Salesforce Mastered Account ST-191-001 |
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
    And all mapped fields should match between Salesforce Account and Dynamics Party
    Given I unsubscribe from Account Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # UPDATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-191 @ST-191-UI-002 @positive @integration @sf_to_d365
  Scenario: Update Salesforce Mastered Account and sync to Dynamics Party
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    And I have captured the Account SalesforceID
    And I subscribe to Account Platform Events
    When I update the Account in Salesforce with:
      | Name | Updated Salesforce Mastered Account ST-191 |
      | Phone | 555-999-8888 |
    Then an Account Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then I retrieve the Party from Dynamics using Party MasterId
    And the Party name should be "Updated Salesforce Mastered Account ST-191"
    And the Party phone should be "555-999-8888"
    Given I unsubscribe from Account Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # STATUS CHANGE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-191 @ST-191-UI-003 @positive @integration @sf_to_d365
  Scenario: Change Salesforce Mastered Account status and sync to Dynamics
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

  @ST-191 @ST-191-UI-005 @positive @integration @sf_to_d365 @onboarding
  Scenario: Create Member Account with Onboarding status and sync to Dynamics Party
    Given I have a test Account name "Member Account Onboarding ST-191"
    And I subscribe to Account Platform Events
    When I create an Account in Salesforce with:
      | Name | Member Account Onboarding ST-191 |
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
    And all mapped fields should match between Salesforce Account and Dynamics Party
    Given I unsubscribe from Account Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # DELETE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════
  # Note: Delete behavior to be confirmed with MuleSoft architect
  # Current assumption: Account delete may deactivate Party in Dynamics

  @ST-191 @ST-191-UI-004 @positive @integration @sf_to_d365 @delete
  Scenario: Delete Salesforce Mastered Account and verify Dynamics Party handling
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Party MasterId
    And I subscribe to Account Platform Events
    When I delete the Account from Salesforce
    Then an Account Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then I retrieve the Party from Dynamics using Party MasterId
    # Note: Verify Party deactivation or deletion based on business rules
    # This step may need adjustment based on actual delete behavior
    Given I unsubscribe from Account Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # NEGATIVE SCENARIOS
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-191 @ST-191-UI-006 @negative @integration @sf_to_d365
  Scenario: Create Account with Draft status should not sync to Dynamics
    Given I have a test Account name "Account Draft Status ST-191"
    When I create an Account in Salesforce with:
      | Name | Account Draft Status ST-191 |
      | Type | Customer |
      | Account_Status__c | Draft |
    Then the Account should be created with a SalesforceID
    And I wait 3 seconds for MuleSoft processing
    Then the Account should still have Dataverse_ID__c as null
    And the Party should not exist in Dynamics for this Party MasterId
    # Note: Account with Status "Draft" should not trigger integration

  # ═══════════════════════════════════════════════════════════════════════════
  # TIMELINESS SCENARIOS
  # ═══════════════════════════════════════════════════════════════════════════  @ST-191 @ST-191-UI-007 @positive @integration @sf_to_d365 @timeliness
  Scenario: Account changes reach Dynamics within 3 minutes - Create
    Given I have a test Account name "Account Timeliness Create ST-191"
    When I create an Account in Salesforce with:
      | Name | Account Timeliness Create ST-191 |
      | Type | Customer |
      | Account_Status__c | Prospect |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    Then the Dynamics RDM record reflects the change within 3 minutes
    And all mapped fields should match between Salesforce Account and Dynamics Party

  @ST-191 @ST-191-UI-010 @positive @integration @sf_to_d365 @timeliness
  Scenario: Account changes reach Dynamics within 3 minutes - Update
    Given I have an existing Account in Salesforce with Status "Active"
    And the Account has Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Party MasterId
    When I update the Account in Salesforce with:
      | Name | Account Timeliness Update ST-191 |
      | Phone | 555-888-9999 |
    Then the Dynamics RDM record reflects the change within 3 minutes
    And all mapped fields should match between Salesforce Account and Dynamics Party

  @ST-191 @ST-191-UI-011 @positive @integration @sf_to_d365 @timeliness
  Scenario: Account changes reach Dynamics within 3 minutes - Status Change
    Given I have an existing Account in Salesforce with Status "Prospect"
    And the Account has Dataverse_ID__c as null
    And I have captured the Account SalesforceID and Party MasterId
    When I update the Account Status to "Active" to trigger integration
    Then the Dynamics RDM record reflects the change within 3 minutes
    And all mapped fields should match between Salesforce Account and Dynamics Party

  # ═══════════════════════════════════════════════════════════════════════════
  # NULL HANDLING & DATA INTEGRITY
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-191 @ST-191-UI-008 @positive @integration @sf_to_d365 @null_handling @required_fields
  Scenario: Optional Salesforce fields left empty must be sent as NULL to avoid required-field failures
    Given I have a test Account name "Account Null Fields ST-191"
    When I create an Account in Salesforce with:
      | Name | Account Null Fields ST-191 |
      | Type | Customer |
      | Account_Status__c | Prospect |
      | Phone |  |
      | Email |  |
    Then the Account should be created with a SalesforceID
    When I update the Account Status to "Active" to trigger integration
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    # Note: Optional fields left empty in Salesforce should be sent as NULL (not blank) to Dynamics
    # This ensures Dynamics required field validation doesn't fail

  @ST-191 @ST-191-UI-009 @positive @integration @sf_to_d365 @field_mapping @data_integrity
  Scenario: Verify all Account to Party field level requirements match exactly per Excel mapping
    Given I have a test Account name "Account Full Field Mapping ST-191"
    When I create an Account in Salesforce with:
      | Name | Account Full Field Mapping ST-191 |
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
    And I wait 3 seconds for MuleSoft processing
    Then the Account should have Dataverse_ID__c populated
    And I retrieve the Party from Dynamics using Party MasterId
    And the Party should exist in Dynamics with matching Party MasterId
    And all mapped fields should match between Salesforce Account and Dynamics Party
    # Note: Each field mapped in "I Accounts -> Party" Excel tab should match exactly
