# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ST-234 - Salesforce Mastered Country
# Type: Story | Status: QA | Priority: Medium
# Purpose: Validate Salesforce Mastered Country changes (create/update/status change) 
#         are published one-way into Dynamics RDM in near-real time via MuleSoft
# Flow: Create/Update Country__c → Platform Event → MuleSoft → Dynamics Country
# Dependency: Country platform event publishing must be enabled for integration
# Reference: Excel "Integration Country" tab (Picklist Value Mappings.xlsx)
# Integration Document: Country mapping (see functional reference)
# ══════════════════════════════════════════════════════════════════════════════

@integration @mulesoft @salesforce @dynamics @ST-234 @entity_country @sf_to_d365 @salesforce_mastered
Feature: ST-234 - Salesforce Mastered Country Integration
  As a Product Owner
  I want Salesforce Mastered Country changes (create/update/status change) to be published one-way into Dynamics RDM in near-real time
  So that mastered country changes in Dynamics RDM are always consistent

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce
    # Note: Field mappings are configured as per "Integration Country" Excel tab (Picklist Value Mappings.xlsx)
    # Note: Country platform event publishing is enabled for integration
    # Note: Country object is "Country__c" in Salesforce → "Country" in Dynamics RDM
    # Note: Country__c records cannot be deleted (lifecycle managed via Active/Inactive status)

  # ═══════════════════════════════════════════════════════════════════════════
  # CREATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-UI-001 @smoke @positive @integration @sf_to_d365 @country @create
  Scenario: Create Country in Salesforce and publish to Dynamics with identical mapped values
    Given I subscribe to Country Platform Events
    When I create a Country in Salesforce with valid required fields populated:
      | Name | Test Country ST-234-001 |
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
  # UPDATE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-UI-002 @positive @integration @sf_to_d365 @country @update
  Scenario: Update Country in Salesforce and publish updates to Dynamics with identical mapped values
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the corresponding Country record exists in Dynamics RDM
    And I have captured the Country SalesforceID
    And I subscribe to Country Platform Events
    When I update the Country in Salesforce with:
      | Name | Updated Test Country ST-234 |
      | Description__c | Updated description for ST-234 |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the corresponding Country record in Dynamics RDM is updated
    And I retrieve the Country from Dynamics using Dataverse ID
    And all mapped fields should match Salesforce values for the Country mapping
    Given I unsubscribe from Country Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # STATUS CHANGE SYNC (SF → D365)
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-UI-003 @positive @integration @sf_to_d365 @country @status_change
  Scenario: Change Country status in Salesforce and publish status change to Dynamics with identical mapped values
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the corresponding Country record exists in Dynamics RDM
    And I have captured the Country SalesforceID
    And I subscribe to Country Platform Events
    When I update the Country status in Salesforce:
      | Active__c | false |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the corresponding Country record in Dynamics RDM reflects the status change
    And I retrieve the Country from Dynamics using Dataverse ID
    And all mapped status-related fields match Salesforce values for the Country mapping
    Given I unsubscribe from Country Platform Events

  @ST-234 @ST-234-UI-004 @positive @integration @sf_to_d365 @country @status_change @deactivation
  Scenario: Set Country to an inactive/retired status in Salesforce and reflect in Dynamics (status-level delete handling)
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the corresponding Country record exists in Dynamics RDM
    And I have captured the Country SalesforceID
    And I subscribe to Country Platform Events
    When I update the Country status to "Inactive" in Salesforce:
      | Active__c | false |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the corresponding Country record in Dynamics RDM is not physically deleted
    And the Dynamics record is marked inactive/retired according to the Country mapping
    And the record is excluded from active selection lists where applicable
    Given I unsubscribe from Country Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # TIMELINESS SCENARIOS
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-UI-005 @positive @integration @sf_to_d365 @country @timeliness
  Scenario Outline: Country changes reach Dynamics within 3 minutes
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And I have captured the Country SalesforceID and Dataverse ID
    When the Country record is <changeType> in Salesforce
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
  # FIELD MAPPING & DATA INTEGRITY
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-UI-006 @positive @integration @sf_to_d365 @country @field_mapping @data_integrity
  Scenario: Verify field-level mapping for Country matches exactly between Salesforce and Dynamics
    Given I subscribe to Country Platform Events
    When I create a Country in Salesforce with values populated for all mapped fields:
      | Name | Full Field Mapping Country ST-234 |
      | Active__c | true |
      | Description__c | Test description for field mapping validation |
    Then the Country should be created with a SalesforceID
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the Country should have Dataverse_ID__c populated
    Then the corresponding Country record exists in Dynamics RDM
    And I retrieve the Country from Dynamics using Dataverse ID
    And each mapped field value matches exactly between Salesforce and Dynamics
    # Note: Each field mapped in "Integration Country" Excel tab should match exactly
    Given I unsubscribe from Country Platform Events

  @ST-234 @ST-234-UI-007 @positive @integration @sf_to_d365 @country @picklist_mapping
  Scenario: Validate picklist value mapping is correctly translated into Dynamics
    Given I subscribe to Country Platform Events
    When I create a Country in Salesforce with picklist fields set to valid values:
      | Name | Picklist Mapping Country ST-234 |
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
  # NULL HANDLING & DATA INTEGRITY
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-UI-008 @positive @integration @sf_to_d365 @country @required_fields @null_handling
  Scenario: Empty optional Salesforce fields are handled safely in the integration payload
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And one or more optional mapped fields are blank in Salesforce
    And I subscribe to Country Platform Events
    When I update the Country in Salesforce with optional fields left empty:
      | Description__c |  |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the integration payload does not violate Dynamics required-field rules
    And I retrieve the Country from Dynamics using Dataverse ID
    And Dynamics RDM stores the expected null/empty representation per mapping rules
    # Note: Optional fields left empty in Salesforce should be sent as NULL (not blank) to Dynamics
    Given I unsubscribe from Country Platform Events

  # ═══════════════════════════════════════════════════════════════════════════
  # IDEMPOTENCY & ERROR HANDLING
  # ═══════════════════════════════════════════════════════════════════════════

  @ST-234 @ST-234-UI-009 @positive @integration @sf_to_d365 @country @idempotency
  Scenario: Re-committing the same Country change does not create duplicates in Dynamics
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the corresponding Country record exists in Dynamics RDM
    And I have captured the Country SalesforceID
    And I subscribe to Country Platform Events
    When I update the Country in Salesforce with:
      | Name | Idempotency Test Country ST-234 |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    When I update the Country in Salesforce again with the same values:
      | Name | Idempotency Test Country ST-234 |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then only one corresponding Country record exists in Dynamics RDM
    And I retrieve the Country from Dynamics using Dataverse ID
    And the latest mapped field values are correct
    Given I unsubscribe from Country Platform Events

  @ST-234 @ST-234-UI-010 @negative @integration @sf_to_d365 @country @error_handling
  Scenario: Integration failure is logged and the Country record is not partially updated in Dynamics
    Given I have an existing Country in Salesforce with Dataverse_ID__c populated
    And the integration endpoint is unavailable or returns an error
    And I subscribe to Country Platform Events
    When I update the Country in Salesforce with:
      | Name | Error Handling Test Country ST-234 |
    Then a Country Platform Event is published
    And I wait 3 seconds for MuleSoft processing
    Then the failure is logged with enough detail to troubleshoot
    And the Dynamics RDM Country record is not created/updated in a partial/invalid state
    # Note: Error handling should prevent partial updates that could cause data inconsistency
    Given I unsubscribe from Country Platform Events
