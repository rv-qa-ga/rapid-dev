# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-606 - Publish Country Platform Events from Salesforce
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: platform-events
# Updated: 2026-01-17T20:00:00Z
# ══════════════════════════════════════════════════════════════════════════════
#
# REQUIREMENTS:
# - Platform Events must be published when Country__c records are created or updated
# - Country__c records cannot be deleted (lifecycle managed via Active/Inactive status)
# - Each Country__c Platform Event includes the Salesforce Record ID and a unique event identifier
# - Platform Events are not published when transactions fail
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-606 @platform-events @country
Feature: Publish Country Platform Events from Salesforce
  Platform Events must be published when Country__c records are created or updated for downstream synchronisation with Dataverse.
  Country__c records cannot be deleted, and lifecycle is managed using an Active/Inactive status field.
  Each Country__c Platform Event includes the Salesforce Record ID and a unique event identifier.

  Background:
    Given I have a valid Salesforce API token
    And Salesforce publishes Country Platform Events
    And Salesforce does not allow Country__c records to be deleted
    And Country__c lifecycle is managed using an Active/Inactive status field
    And each Country Platform Event includes the Record ID and Event Identifier

  # ══════════════════════════════════════════════════════════════════════════
  # CREATE EVENTS - Country__c Records
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-API-001 @create @p1
  Scenario: Publish Create Platform Event for Country__c record creation
    Given I have a valid Salesforce API token
    And I subscribe to Country Platform Events
    And a new Country__c record is created in Salesforce
    When the Country__c record is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Country Platform Event within 10 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes a unique event identifier
    Given I unsubscribe from Country Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # UPDATE EVENTS - Country__c Records
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-API-002 @update @p1
  Scenario: Publish Update Platform Event for any update to a Country__c record
    Given I have a valid Salesforce API token
    And I subscribe to Country Platform Events
    And an existing Country__c record exists in Salesforce
    When the Country__c record is updated
    And the Country__c record is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Country Platform Event within 10 seconds
    And the event action is "Update"
    And the event includes the Record ID
    And the event includes a unique event identifier
    Given I unsubscribe from Country Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE SCENARIOS - Transaction Failures
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-API-003 @negative @transaction @p2
  Scenario Outline: Do not publish Platform Event if the Country__c transaction fails
    Given a Country__c record is <Operation>
    When the save operation fails
    And I wait 3 seconds for Platform Event to be published
    And I query Country Platform Events for the Country__c record
    Then no Country Platform Event is published

    Examples:
      | Operation |
      | created   |
      | updated   |

  # ══════════════════════════════════════════════════════════════════════════
  # METADATA / TRACEABILITY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-API-004 @metadata @traceability @p1
  Scenario: Published Platform Event includes traceability metadata
    Given I have a valid Salesforce API token
    And I subscribe to Country Platform Events
    And an existing Country__c record exists in Salesforce
    When the Country__c record is updated
    And the Country__c record is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Country Platform Event within 10 seconds
    And the event includes a unique event identifier
    And the event includes the Salesforce Country Id
    And the event includes an event timestamp
    And the event action is populated
    Given I unsubscribe from Country Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # LIFECYCLE SCENARIOS - No Delete Events
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-API-005 @lifecycle @no-delete @p2
  Scenario: Country__c record deactivation is handled by status update rather than deletion
    Given I have a valid Salesforce API token
    And I subscribe to Country Platform Events
    And a Country__c record exists in Salesforce
    And I wait 2 seconds for Platform Event to be published
    When the Country__c record status is updated to "Inactive"
    And the Country__c record is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Country Platform Event within 10 seconds
    And the event action is "Update"
    And no delete event is published
    Given I unsubscribe from Country Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # STREAMING API VERIFICATION (Real-time)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-606 @SF-606-API-006 @p1 @platform-event @streaming @real-time @positive
  Scenario: API - Verify Platform Event received in real-time via Streaming API
    Given I have a valid Salesforce API token
    And I subscribe to Country Platform Events
    When a new Country__c record is created in Salesforce
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Country Platform Event within 10 seconds
    And the event RecordId__c should match the Country Id
    And the event should include a unique EventUuid
    And the event should include a CreatedDate timestamp
    And the event should include ReplayId
    Given I unsubscribe from Country Platform Events

  @SF-606 @SF-606-API-007 @p2 @platform-event @streaming @real-time @positive
  Scenario: API - Verify Platform Event received in real-time on Country__c update
    Given I have a valid Salesforce API token
    And an existing Country__c record exists in Salesforce
    And I subscribe to Country Platform Events
    When I update the Country__c record via PATCH request with:
      | field | value |
      | Name  | Updated Country Name |
    Then I should receive a Country Platform Event within 5 seconds
    And a Country Platform Event should be published with Identifier__c = "update"
    And the event RecordId__c should match the Country Id
    Given I unsubscribe from Country Platform Events
