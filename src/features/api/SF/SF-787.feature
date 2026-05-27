# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-787 - Publish Platform Events for Product Maps
#
# Scope: Product_Map__c platform events to RDM only when status/approval rules allow.
# Platform Event: Product_Map_Event__e (Record_Id__c, Identifier__c, Master_ID__c)
# Flows: RT_Product_Map_On_Create_Update_Publish_Event, RT_Product_Map_On_Update_Reset_Draft_Approval
# Correlation: Dataverse_ID__c on Product_Map__c; Master_ID__c on event
# Blocks: SF-767 | Related: SF-796, SF-945, SF-1180
#
# Env: qamerge (primary). Steps to be implemented — upload to Zephyr first.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-787 @product-map @platform-events @integration @rbt @medium
Feature: API - SF-787 - Product Map Platform Events for RDM alignment
  As an integrator
  I want Product Map platform events published only when RDM should reflect Salesforce state
  So that draft, pending go-live, and active product maps stay aligned with downstream systems

  Background:
    Given I have a valid Salesforce API token

  @SF-787 @SF-787-API-001 @p1 @smoke
  Scenario: API - Describe Product_Map__c and required fields for SF-787 automation
    Given the system is configured for SF-787

  @SF-787 @SF-787-API-002 @p1 @smoke @platform-events
  Scenario: API - Describe Product_Map_Event__e and required event payload fields
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And each Product Map Platform Event includes the Record ID and Master ID

  @SF-787 @SF-787-API-003 @p1 @smoke
  Scenario: API - Product Map publish and draft-approval flows are configured for SF-787
    Given the SF-787 Product Map publish event flow is active on the org

  @SF-787 @SF-787-API-004 @p1 @platform-events @negative
  Scenario: API - Draft Product Map create does not publish platform event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And Salesforce does not publish Platform Events for ineligible Product Map records
    And I subscribe to Product Map Platform Events
    When I create a Product_Map__c with Status "Draft" for SF-787
    And the SF-787 Product Map record is saved successfully
    Then no Product Map Platform Event is received for the SF-787 Product Map within 60 seconds
    And the SF-787 Product Map Dataverse ID field is blank
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-005 @p1 @platform-events @negative
  Scenario: API - Draft - Product Expansion create does not publish platform event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And Salesforce does not publish Platform Events for ineligible Product Map records
    And I subscribe to Product Map Platform Events
    When I create a Product_Map__c with Status "Draft - Product Expansion" for SF-787
    And the SF-787 Product Map record is saved successfully
    Then no Product Map Platform Event is received for the SF-787 Product Map within 60 seconds
    And the SF-787 Product Map Dataverse ID field is blank
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-006 @p1 @platform-events @approval
  Scenario: API - Draft Product Map approved publishes Create event with Master ID
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And each Product Map Platform Event includes the Record ID and Master ID
    And I subscribe to Product Map Platform Events
    Given a Product_Map__c exists with Status "Draft" and no Dataverse ID for SF-787
    When the SF-787 Product Map is approved
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes the Master ID
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-007 @p1 @platform-events @approval
  Scenario: API - Draft - Product Expansion approved publishes Create event with Master ID
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And each Product Map Platform Event includes the Record ID and Master ID
    And I subscribe to Product Map Platform Events
    Given a Product_Map__c exists with Status "Draft - Product Expansion" and no Dataverse ID for SF-787
    When the SF-787 Product Map is approved
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes the Master ID
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-008 @p1 @platform-events @negative @pending-step-def
  Scenario: API - Approved Draft in RDM edited without reapproval does not publish Update event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given an approved SF-787 Product_Map__c exists in RDM with Status "Draft"
    When I edit the SF-787 Product Map without reapproval
    And the SF-787 Product Map record is saved successfully
    Then no Product Map Platform Event is received for the SF-787 Product Map within 60 seconds
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-009 @p2 @platform-events @negative @pending-step-def
  Scenario: API - Approved Draft - Product Expansion in RDM edited without reapproval does not publish Update event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given an approved SF-787 Product_Map__c exists in RDM with Status "Draft - Product Expansion"
    When I edit the SF-787 Product Map without reapproval
    And the SF-787 Product Map record is saved successfully
    Then no Product Map Platform Event is received for the SF-787 Product Map within 60 seconds
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-010 @p1 @platform-events
  Scenario: API - Approved Draft Product Map changed to Inactive publishes Update event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given an approved SF-787 Product_Map__c exists in RDM with Status "Draft"
    When I update the SF-787 Product Map Status to "Inactive"
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the event action is "Update"
    And the event includes the Record ID
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-011 @p2 @platform-events
  Scenario: API - Approved Draft - Product Expansion changed to Inactive publishes Update event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given an approved SF-787 Product_Map__c exists in RDM with Status "Draft - Product Expansion"
    When I update the SF-787 Product Map Status to "Inactive"
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the event action is "Update"
    And the event includes the Record ID
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-012 @p1 @platform-events @negative
  Scenario: API - Active - Pending Go-Live create does not publish platform event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And Salesforce does not publish Platform Events for ineligible Product Map records
    And I subscribe to Product Map Platform Events
    When I create a Product_Map__c with Status "Active - Pending Go-Live" for SF-787
    And the SF-787 Product Map record is saved successfully
    Then no Product Map Platform Event is received for the SF-787 Product Map within 60 seconds
    And the SF-787 Product Map Dataverse ID field is blank
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-013 @p1 @platform-events @negative @approval
  Scenario: API - Active - Pending Go-Live approved does not publish platform event or update RDM
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given a Product_Map__c exists with Status "Active - Pending Go-Live" for SF-787
    When the SF-787 Product Map is approved
    And the SF-787 Product Map record is saved successfully
    Then no Product Map Platform Event is received for the SF-787 Product Map within 60 seconds
    And the SF-787 Product Map Dataverse ID field is blank
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-014 @p2 @platform-events @negative
  Scenario: API - Active - Pending Go-Live to Inactive with no RDM row does not publish platform event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given a Product_Map__c exists with Status "Active - Pending Go-Live" and no Dataverse ID for SF-787
    When I update the SF-787 Product Map Status to "Inactive"
    And the SF-787 Product Map record is saved successfully
    Then no Product Map Platform Event is received for the SF-787 Product Map within 60 seconds
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-015 @p1 @platform-events
  Scenario: API - Active - Pending Go-Live to Inactive updates existing RDM row via Update event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given an SF-787 Product_Map__c exists in RDM from approved Draft with Status "Active - Pending Go-Live"
    When I update the SF-787 Product Map Status to "Inactive"
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the event action is "Update"
    And the event includes the Record ID
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-016 @p1 @platform-events
  Scenario: API - Product Map Status Active with existing RDM row publishes Update event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given an approved SF-787 Product_Map__c exists in RDM with a populated Dataverse ID
    When I update the SF-787 Product Map Status to "Active"
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the event action is "Update"
    And the event includes the Record ID
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-017 @p1 @platform-events
  Scenario: API - Product Map Status Active with no RDM row publishes Create event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And each Product Map Platform Event includes the Record ID and Master ID
    And I subscribe to Product Map Platform Events
    Given an approved SF-787 Product_Map__c exists with no Dataverse ID
    When I update the SF-787 Product Map Status to "Active"
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes the Master ID
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-018 @p1 @platform-events
  Scenario: API - Active Product Map changed to Inactive publishes Update event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given a Product_Map__c exists with Status "Active" and a populated Dataverse ID for SF-787
    When I update the SF-787 Product Map Status to "Inactive"
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the event action is "Update"
    And the event includes the Record ID
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-019 @p2 @platform-events @negative
  Scenario: API - Failed Product Map save does not publish platform event
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    When I attempt to save an invalid SF-787 Product_Map__c record
    Then the SF-787 Product Map save must have failed
    And no Product Map Platform Event is received within 60 seconds after failed transaction
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-020 @p1 @platform-events @smoke
  Scenario: API - Subscribe and unsubscribe to Product Map Platform Events
    Given Salesforce publishes Product Map Platform Events for RDM integration
    When I subscribe to Product Map Platform Events
    Then the Product Map Platform Event subscription is active
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-021 @p1 @platform-events
  Scenario: API - Create Product Map platform event includes Record ID and Master ID
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And each Product Map Platform Event includes the Record ID and Master ID
    And I subscribe to Product Map Platform Events
    Given a Product_Map__c exists with Status "Draft" and no Dataverse ID for SF-787
    When the SF-787 Product Map is approved
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes the Master ID
    Given I unsubscribe from Product Map Platform Events

  @SF-787 @SF-787-API-022 @p2 @platform-events
  Scenario: API - Update Product Map platform event uses Update identifier
    Given Salesforce publishes Product Map Platform Events for RDM integration
    And I subscribe to Product Map Platform Events
    Given a Product_Map__c exists with Status "Active" and a populated Dataverse ID for SF-787
    When I update the SF-787 Product Map Status to "Inactive"
    And the SF-787 Product Map record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Product Map Platform Event within 120 seconds with Identifier__c = "update"
    Given I unsubscribe from Product Map Platform Events
