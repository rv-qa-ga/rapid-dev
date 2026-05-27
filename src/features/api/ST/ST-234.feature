# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ST-234 - Salesforce Mastered Country - API Tests
# Type: Story | Status: QA | Priority: Medium
# Purpose: Validate Salesforce Mastered Country API operations (create/update/status change) 
#         are published one-way into Dynamics RDM in near-real time via MuleSoft
# Flow: API Create/Update Country__c → Platform Event → MuleSoft → Dynamics Country
# Dependency: Country platform event publishing must be enabled for integration
# Reference: Excel "Integration Country" tab (Picklist Value Mappings.xlsx)
# Integration Document: Country mapping (see functional reference)
# ══════════════════════════════════════════════════════════════════════════════

@api @integration @mulesoft @salesforce @dynamics @ST-234 @entity_country @sf_to_d365 @salesforce_mastered
Feature: API - ST-234 - Salesforce Mastered Country Integration
  As a Product Owner
  I want to validate Salesforce Mastered Country API operations (create/update/status change) 
  and verify they are published one-way into Dynamics RDM in near-real time via MuleSoft
  So that mastered country changes in Dynamics RDM are always consistent

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: Field mappings are configured as per "Integration Country" Excel tab (Picklist Value Mappings.xlsx)
    # Note: Country platform event publishing is enabled for integration
    # Note: Country object is "Country__c" in Salesforce → "Country" in Dynamics RDM

  # ═══════════════════════════════════════════════════════════════════════════
  # API CREATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-API-001 @smoke @positive @integration @sf_to_d365 @api @country @create
  Scenario: API - Create Country in Salesforce via API and publish to Dynamics with identical mapped values
    Given I subscribe to Country Platform Events
    When I create a Country in Salesforce via API with valid required fields populated:
      | Name | API Test Country ST-234-001 |
      | Active__c | true |
    Then the Country should be created with a SalesforceID
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Country should have Dataverse_ID__c populated
    And I retrieve the Country from Dynamics using Dataverse ID
    And the Country should exist in Dynamics with matching Dataverse ID
    And all mapped fields should match Salesforce values for the Country mapping
    Given I unsubscribe from Country Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API UPDATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-API-002 @positive @integration @sf_to_d365 @api @country @update
  Scenario: API - Update Country in Salesforce via API and publish updates to Dynamics with identical mapped values
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the corresponding Country record exists in Dynamics RDM
    And I have captured the Country SalesforceID
    And I subscribe to Country Platform Events
    When I update the Country in Salesforce via API with:
      | Name | API Updated Test Country ST-234 |
      | Description__c | API updated description for ST-234 |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the corresponding Country record in Dynamics RDM is updated
    And I retrieve the Country from Dynamics using Dataverse ID
    And all mapped fields should match Salesforce values for the Country mapping
    Given I unsubscribe from Country Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API STATUS CHANGE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-API-003 @positive @integration @sf_to_d365 @api @country @status_change
  Scenario: API - Change Country status in Salesforce via API and publish status change to Dynamics
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the corresponding Country record exists in Dynamics RDM
    And I have captured the Country SalesforceID
    And I subscribe to Country Platform Events
    When I update the Country status in Salesforce via API:
      | Active__c | false |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the corresponding Country record in Dynamics RDM reflects the status change
    And I retrieve the Country from Dynamics using Dataverse ID
    And all mapped status-related fields match Salesforce values for the Country mapping
    Given I unsubscribe from Country Platform Events

  @ST-234 @ST-234-API-004 @positive @integration @sf_to_d365 @api @country @status_change @deactivation
  Scenario: API - Set Country to inactive/retired status via API and reflect in Dynamics (status-level delete handling)
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the corresponding Country record exists in Dynamics RDM
    And I have captured the Country SalesforceID
    And I subscribe to Country Platform Events
    When I update the Country status to "Inactive" in Salesforce via API:
      | Active__c | false |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the corresponding Country record in Dynamics RDM is not physically deleted
    And the Dynamics record is marked inactive/retired according to the Country mapping
    And the record is excluded from active selection lists where applicable
    Given I unsubscribe from Country Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API TIMELINESS SCENARIOS
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-API-005 @positive @integration @sf_to_d365 @api @country @timeliness
  Scenario Outline: API - Country changes reach Dynamics within 3 minutes
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And I have captured the Country SalesforceID and Dataverse ID
    When the Country record is <changeType> in Salesforce via API
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Dynamics RDM Country record reflects the change within 3 minutes
    And all mapped fields should match Salesforce values for the Country mapping

    Examples:
      | changeType     |
      | created        |
      | updated        |
      | status changed |

  # ═══════════════════════════════════════════════════════════════════════════
  # API FIELD MAPPING & DATA INTEGRITY
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-API-006 @positive @integration @sf_to_d365 @api @country @field_mapping @data_integrity
  Scenario: API - Verify field-level mapping for Country matches exactly between Salesforce and Dynamics
    Given I subscribe to Country Platform Events
    When I create a Country in Salesforce via API with values populated for all mapped fields:
      | Name | API Full Field Mapping Country ST-234 |
      | Active__c | true |
      | Description__c | API test description for field mapping validation |
    Then the Country should be created with a SalesforceID
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Country should have Dataverse_ID__c populated
    Then the corresponding Country record exists in Dynamics RDM
    And I retrieve the Country from Dynamics using Dataverse ID
    And each mapped field value matches exactly between Salesforce and Dynamics
    # Note: Each field mapped in "Integration Country" Excel tab should match exactly
    Given I unsubscribe from Country Platform Events

  @ST-234 @ST-234-API-007 @positive @integration @sf_to_d365 @api @country @picklist_mapping
  Scenario: API - Validate picklist value mapping is correctly translated into Dynamics
    Given I subscribe to Country Platform Events
    When I create a Country in Salesforce via API with picklist fields set to valid values:
      | Name | API Picklist Mapping Country ST-234 |
      | Active__c | true |
    Then the Country should be created with a SalesforceID
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Country should have Dataverse_ID__c populated
    And I retrieve the Country from Dynamics using Dataverse ID
    Then the corresponding Dynamics RDM Country record contains the expected mapped values for those picklists
    # Note: Picklist values should be mapped according to "Integration Country" Excel tab
    Given I unsubscribe from Country Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API NULL HANDLING & DATA INTEGRITY
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-API-008 @positive @integration @sf_to_d365 @api @country @required_fields @null_handling
  Scenario: API - Empty optional Salesforce fields are handled safely in the integration payload
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And one or more optional mapped fields are blank in Salesforce
    And I subscribe to Country Platform Events
    When I update the Country in Salesforce via API with optional fields left empty:
      | Description__c |  |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the integration payload does not violate Dynamics required-field rules
    And I retrieve the Country from Dynamics using Dataverse ID
    And Dynamics RDM stores the expected null/empty representation per mapping rules
    # Note: Optional fields left empty in Salesforce should be sent as NULL (not blank) to Dynamics
    Given I unsubscribe from Country Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API IDEMPOTENCY & ERROR HANDLING
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-API-009 @positive @integration @sf_to_d365 @api @country @idempotency
  Scenario: API - Re-committing the same Country change does not create duplicates in Dynamics
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the corresponding Country record exists in Dynamics RDM
    And I have captured the Country SalesforceID
    And I subscribe to Country Platform Events
    When I update the Country in Salesforce via API with:
      | Name | API Idempotency Test Country ST-234 |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    When I update the Country in Salesforce via API again with the same values:
      | Name | API Idempotency Test Country ST-234 |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then only one corresponding Country record exists in Dynamics RDM
    And I retrieve the Country from Dynamics using Dataverse ID
    And the latest mapped field values are correct
    Given I unsubscribe from Country Platform Events

  @ST-234 @ST-234-API-010 @negative @integration @sf_to_d365 @api @country @error_handling
  Scenario: API - Integration failure is logged and the Country record is not partially updated in Dynamics
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the integration endpoint is unavailable or returns an error
    And I subscribe to Country Platform Events
    When I update the Country in Salesforce via API with:
      | Name | API Error Handling Test Country ST-234 |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the failure is logged with enough detail to troubleshoot
    And the Dynamics RDM Country record is not created/updated in a partial/invalid state
    # Note: Error handling should prevent partial updates that could cause data inconsistency
    Given I unsubscribe from Country Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # API QUERY VERIFICATION
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-API-011 @positive @integration @sf_to_d365 @api @country
  Scenario: API - Query Country via API and verify Dataverse_ID__c is populated after sync
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And I have captured the Country SalesforceID
    When I query the Country record via API
    Then the API should return status code 200
    And the Country should have Dataverse_ID__c populated
    And the Dataverse_ID__c should be a valid GUID format

  @ST-234 @ST-234-API-012 @positive @integration @sf_to_d365 @api @country
  Scenario: API - Query Country by Dataverse ID via API
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And I have captured the Country SalesforceID and Dataverse ID
    When I query the Country record via API using Dataverse_ID__c filter
    Then the API should return status code 200
    And the Country should be found with matching Dataverse_ID__c
