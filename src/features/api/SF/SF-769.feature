# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-769 - Salesforce Member Legal Entity Group Relationship → Dataverse Member Maps
#
# Scope: Member + Legal Entity + Group on Member_Legal_Entity_Relationship__c (Group__c)
# syncs to Dataverse Member Maps per mapping / integration design / picklist governance.
# SF-789 validates Custom Metadata (Integration Member Maps); SF-612 covers MLER platform events
# without Group. This feature adds Group, CometD trace, and optional Dataverse polling.
#
# Platform Event channel: defaults to SF769_PLATFORM_EVENT_CHANNEL, else SF612_MLER_PLATFORM_EVENT_CHANNEL,
# else /event/Member_Legal_Entity_Group_Relationship_Event__e (set env to match your org).
# Streaming: SALESFORCE_STREAMING_HANDSHAKE_TIMEOUT_MS, SF769_PLATFORM_EVENT_TIMEOUT_MS
#
# Dataverse (optional @dataverse): SF769_DYNAMICS_MEMBER_MAPS_ENTITY_SET, SF769_DYNAMICS_CORRELATION_FIELD
#
# Debugging / data retention: SF769_SKIP_CLEANUP=true marks @SF-769 scenario data persistent (no AfterAll delete).
# npm run test:sf769:keep-data — same tests with cleanup skipped (compare API-created Group vs UI-created Group in org).
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-769 @rbt @medium @integration @member-maps @member-legal-entity-group
Feature: API - SF-769 - Member Legal Entity Group Relationship → Dataverse Member Maps
  As an integrator
  I want MLER records with Group__c to publish platform events and land in Dataverse Member Maps
  So that member–legal entity–group relationships stay aligned across Salesforce and Dynamics 365

  Background:
    Given I have a valid Salesforce API token

  @SF-769 @SF-769-API-001 @p1 @smoke @rbt
  Scenario: API - Describe MLER and require createable Group__c for Member Maps path
    Given the system is configured for SF-769

  @SF-769 @SF-769-API-002 @p1 @rbt
  Scenario: API - Create MLER with Member, Legal Entity, and Group when all accounts have Dataverse_ID__c
    Given SF-769 test accounts exist: Member, Legal Entity, and Group with Dataverse_ID__c on all three
    When I create a Member Legal Entity Relationship with Group via API for SF-769
    Then the SF-769 MLER should link Member, Legal Entity, and Group accounts
    And Member, Legal Entity, and Group accounts should still have Dataverse_ID__c populated

  @SF-769 @SF-769-API-003 @p1 @rbt @custom-metadata
  Scenario: API - Custom Metadata for Member Maps still governs SF-769 field mappings
    Given I have a valid Salesforce API token with Custom Metadata access
    And the Integration Member Maps expected mappings are loaded from Picklist Value Mappings Excel
    When I query Custom Metadata "Dataverse_Mapping__mdt" records for Object "Member_Legal_Entity_Relationship__c"
    Then the Custom Metadata records for Member_Legal_Entity_Relationship__c should match the Integration Member Maps Excel spec
    And Custom Metadata should contain mappings for Member__c, Legal_Entity__c, and Group__c fields

  @SF-769 @SF-769-API-004 @p1 @platform-events @smoke @rbt
  Scenario: API - CometD receives Create when eligible MLER with Group__c is inserted
    Given Salesforce publishes Member Legal Entity Group Relationship Platform Events for Member Maps integration
    And relationship eligibility requires all related Accounts to have Dataverse_Id__c populated
    And each relationship Platform Event includes the Record ID and Event Identifier
    And I subscribe to Member Legal Entity Group Relationship Platform Events
    And SF-769 test accounts exist: Member, Legal Entity, and Group with Dataverse_ID__c on all three
    When I create a Member Legal Entity Relationship with Group via API for SF-769
    And the SF-769 relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Member Legal Entity Group Relationship Platform Event within 120 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes the Event Identifier
    And the event includes Is_Active__c
    Given I unsubscribe from Member Legal Entity Group Relationship Platform Events

  @SF-769 @SF-769-API-005 @p2 @platform-events @rbt
  Scenario: API - CometD receives Update when eligible MLER with Group__c is updated
    Given Salesforce publishes Member Legal Entity Group Relationship Platform Events for Member Maps integration
    And each relationship Platform Event includes the Record ID and Event Identifier
    And I subscribe to Member Legal Entity Group Relationship Platform Events
    And SF-769 test accounts exist: Member, Legal Entity, and Group with Dataverse_ID__c on all three
    When I create a Member Legal Entity Relationship with Group via API for SF-769
    And the SF-769 relationship record is saved successfully
    And I update the SF-769 Member Legal Entity Relationship for a benign field change
    And the SF-769 relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Member Legal Entity Group Relationship Platform Event within 120 seconds with Identifier__c = "update"
    And the event includes the Record ID
    And the event includes Is_Active__c
    Given I unsubscribe from Member Legal Entity Group Relationship Platform Events

  @SF-769 @SF-769-API-006 @p1 @platform-events @rbt
  Scenario: API - No Create platform event when Group account is missing Dataverse_ID__c
    Given Salesforce publishes Member Legal Entity Group Relationship Platform Events for Member Maps integration
    And Salesforce does not publish Platform Events for ineligible relationship records
    And I subscribe to Member Legal Entity Group Relationship Platform Events
    And SF-769 test accounts exist: Member and Legal Entity with Dataverse_ID__c but Group has no Dataverse_ID__c
    When I create a Member Legal Entity Relationship with Group via API for SF-769
    And the SF-769 relationship record is saved successfully
    Then no Member Legal Entity Group Relationship Platform Event is received for the SF-769 relationship within 60 seconds
    Given I unsubscribe from Member Legal Entity Group Relationship Platform Events

  @SF-769 @SF-769-API-007 @p2 @platform-events @rbt
  Scenario: API - Failed MLER save does not emit Member Legal Entity Group Relationship platform event
    Given Salesforce publishes Member Legal Entity Group Relationship Platform Events for Member Maps integration
    And I subscribe to Member Legal Entity Group Relationship Platform Events
    And SF-769 test accounts exist: Member, Legal Entity, and Group with Dataverse_ID__c on all three
    When I attempt to create a Member Legal Entity Relationship with Group via API for SF-769 with invalid Member__c
    Then the SF-769 relationship create must have failed
    And no Member Legal Entity Group Relationship Platform Event is received within 60 seconds after failed transaction
    Given I unsubscribe from Member Legal Entity Group Relationship Platform Events

  @SF-769 @SF-769-API-008 @p2 @dataverse @e2e @rbt
  Scenario: API - Journey Salesforce MLER with Group to Dataverse Member Maps row
    Given I have a valid Dynamics API connection
    And Salesforce publishes Member Legal Entity Group Relationship Platform Events for Member Maps integration
    And relationship eligibility requires all related Accounts to have Dataverse_Id__c populated
    And I subscribe to Member Legal Entity Group Relationship Platform Events
    And SF-769 test accounts exist: Member, Legal Entity, and Group with Dataverse_ID__c on all three
    When I create a Member Legal Entity Relationship with Group via API for SF-769
    And the SF-769 relationship record is saved successfully
    And I wait 20 seconds for Platform Event to be published
    Then I should receive a Member Legal Entity Group Relationship Platform Event within 120 seconds
    And the event includes the Record ID
    And a Dataverse Member Maps row should exist for the SF-769 Salesforce relationship within 300 seconds
    Given I unsubscribe from Member Legal Entity Group Relationship Platform Events
