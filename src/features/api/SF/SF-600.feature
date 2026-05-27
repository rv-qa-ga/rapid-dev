# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-600 - Publish Account Team Member Platform Events from Salesforce
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: platform-events
# Updated: 2026-01-17T20:00:00Z
# ══════════════════════════════════════════════════════════════════════════════
#
# REQUIREMENTS:
# - Platform Events must be published when Account Team Members are created or updated
# - Each Account Team Member Platform Event includes the Salesforce Record ID and a unique event identifier
# - Platform Events are not published when transactions fail
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-600 @platform-events @account-team-member
Feature: Publish Account Team Member Platform Events from Salesforce
  Platform Events must be published when Account Team Members become eligible for downstream synchronisation with Dataverse.
  Only eligible Account Team Members must generate events, and any update must trigger update events.
  Each Account Team Member Platform Event includes the Salesforce Record ID and a unique event identifier.

  Background:
    Given I have a valid Salesforce API token
    And Salesforce publishes Account Team Member Platform Events
    And each Account Team Member Platform Event includes the Record ID and Event Identifier

  # ══════════════════════════════════════════════════════════════════════════
  # CREATE EVENTS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-API-001 @create @p1
  Scenario: Publish Create Platform Event when Account Team Member is created
    Given I have a valid Salesforce API token
    And I subscribe to Account Team Member Platform Events
    And an Account exists in Salesforce
    And a new Account Team Member is created in Salesforce for the Account
    When the Account Team Member is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Team Member Platform Event within 10 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes a unique event identifier
    Given I unsubscribe from Account Team Member Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # UPDATE EVENTS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-API-003 @update @p1
  Scenario: Publish Update Platform Event when Account Team Member is updated
    Given I have a valid Salesforce API token
    And I subscribe to Account Team Member Platform Events
    And an existing Account Team Member exists in Salesforce
    When the Account Team Member is updated
    And the Account Team Member is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Team Member Platform Event within 10 seconds
    And the event action is "Update"
    And the event includes the Record ID
    And the event includes a unique event identifier
    Given I unsubscribe from Account Team Member Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE SCENARIOS - Transaction Failures
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-API-005 @negative @transaction @p2
  Scenario Outline: Do not publish Platform Event if the Account Team Member transaction fails
    Given an Account Team Member is <Operation>
    When the save operation fails
    And I wait 3 seconds for Platform Event to be published
    And I query Account Team Member Platform Events for the Account Team Member
    Then no Account Team Member Platform Event is published

    Examples:
      | Operation |
      | created   |
      | updated   |

  # ══════════════════════════════════════════════════════════════════════════
  # METADATA / TRACEABILITY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-API-006 @metadata @traceability @p1
  Scenario: Published Platform Event includes traceability metadata
    Given I have a valid Salesforce API token
    And I subscribe to Account Team Member Platform Events
    And an existing Account Team Member exists in Salesforce
    When the Account Team Member is updated
    And the Account Team Member is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Team Member Platform Event within 10 seconds
    And the event includes a unique event identifier
    And the event includes the Salesforce Account Team Member Id
    And the event includes the Salesforce Account Id
    And the event includes an event timestamp
    And the event action is populated
    Given I unsubscribe from Account Team Member Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # STREAMING API VERIFICATION (Real-time)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-API-008 @p1 @platform-event @streaming @real-time @positive
  Scenario: API - Verify Platform Event received in real-time via Streaming API
    Given I have a valid Salesforce API token
    And I subscribe to Account Team Member Platform Events
    When a new Account Team Member is created in Salesforce
    And the Account Team Member is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Team Member Platform Event within 10 seconds
    And the event RecordId__c should match the Account Team Member Id
    And the event should include a unique EventUuid
    And the event should include a CreatedDate timestamp
    And the event should include ReplayId
    Given I unsubscribe from Account Team Member Platform Events

  @SF-600 @SF-600-API-009 @p2 @platform-event @streaming @real-time @positive
  Scenario: API - Verify Platform Event received in real-time on Account Team Member update
    Given I have a valid Salesforce API token
    And an existing Account Team Member exists in Salesforce
    And I subscribe to Account Team Member Platform Events
    When I update the Account Team Member via PATCH request with:
      | field | value |
      | TeamMemberRole | Updated Role |
    Then I should receive an Account Team Member Platform Event within 5 seconds
    And an Account Team Member Platform Event should be published with Identifier__c = "update"
    And the event RecordId__c should match the Account Team Member Id
    Given I unsubscribe from Account Team Member Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # LIFECYCLE SCENARIOS - Account Team Member Removal
  # ══════════════════════════════════════════════════════════════════════════

  @SF-600 @SF-600-API-011 @lifecycle @removal @p2
  Scenario: Account Team Member removal is handled by update event rather than deletion
    Given I have a valid Salesforce API token
    And I subscribe to Account Team Member Platform Events
    And an Account Team Member exists in Salesforce
    And I wait 2 seconds for Platform Event to be published
    When the Account Team Member is removed from the Account
    And the Account Team Member is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Team Member Platform Event within 10 seconds
    And the event action is "Update"
    And no delete event is published
    Given I unsubscribe from Account Team Member Platform Events
