# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-599 - Publish Contact Platform Events from Salesforce
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: platform-events
# Updated: 2026-01-18T16:00:00Z
# ══════════════════════════════════════════════════════════════════════════════
#
# REQUIREMENTS:
# - Platform Events must be published when Contacts are created or updated
# - Each Contact Platform Event includes the Salesforce Record ID and a unique event identifier
# - Platform Events are not published when transactions fail
#
# BUSINESS RULES (To be confirmed with BA):
# - Contact Platform Events may depend on parent Account Type/Status eligibility rules
# - OR Contacts may have their own eligibility criteria
# - NOTE: Need BA clarification on Contact event publishing rules
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-599 @platform-events @contact
Feature: Publish Contact Platform Events from Salesforce
  Platform Events must be published when Contacts are created or updated.
  Each Contact Platform Event includes the Salesforce Record ID and a unique event identifier.

  Background:
    Given I have a valid Salesforce API token
    And Salesforce publishes Contact Platform Events
    And each Contact Platform Event includes the Record ID and Event Identifier

  # ══════════════════════════════════════════════════════════════════════════
  # CREATE EVENTS - Basic Scenarios
  # ══════════════════════════════════════════════════════════════════════════
  # NOTE: These scenarios test basic event publishing. Additional scenarios
  # should be added once BA clarifies Contact eligibility rules (if any)

  @SF-599 @SF-599-API-001 @create @p1
  Scenario: Publish Create Platform Event when Contact is created
    Given I have a valid Salesforce API token
    And I subscribe to Contact Platform Events
    And an Account exists in Salesforce
    And a new Contact is created in Salesforce for the Account
    When the Contact is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Contact Platform Event within 10 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes a unique event identifier
    Given I unsubscribe from Contact Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # CREATE EVENTS - With Parent Account Eligibility Rules (If Applicable)
  # ══════════════════════════════════════════════════════════════════════════
  # These scenarios test Contact events when parent Account has eligible status
  # NOTE: To be updated based on BA clarification

  @SF-599 @SF-599-API-001a @create @p1 @parent-account-eligible
  Scenario: Publish Create Platform Event when Contact is created for Member Account with eligible status
    # If Contact events depend on parent Account eligibility:
    # Member Account with Status "Active" should allow Contact events
    Given I have a valid Salesforce API token
    And I subscribe to Contact Platform Events
    And an existing Member Account exists in Salesforce with Status "Active"
    And a new Contact is created in Salesforce for the Account
    When the Contact is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Contact Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Contact Platform Events

  @SF-599 @SF-599-API-001b @create @p1 @parent-account-eligible
  Scenario: Publish Create Platform Event when Contact is created for Agency Account with eligible status
    # If Contact events depend on parent Account eligibility:
    # Agency Account with Status "Active" should allow Contact events
    Given I have a valid Salesforce API token
    And I subscribe to Contact Platform Events
    And an existing Agency Account exists in Salesforce with Status "Active"
    And a new Contact is created in Salesforce for the Account
    When the Contact is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Contact Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Contact Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # CREATE EVENTS - Negative Tests (If Parent Account Rules Apply)
  # ══════════════════════════════════════════════════════════════════════════
  # NOTE: These scenarios should be added if Contact events depend on
  # parent Account eligibility. Currently commented out pending BA clarification.

  # @SF-599 @SF-599-API-001n @create @p2 @ineligible @negative
  # Scenario: Do not publish Create Platform Event when Contact is created for Member Account with Status "Prospect"
  #   Given I have a valid Salesforce API token
  #   And I subscribe to Contact Platform Events
  #   And an existing Member Account exists in Salesforce with Status "Prospect"
  #   And a new Contact is created in Salesforce for the Account
  #   When the Contact is saved successfully
  #   And I wait 3 seconds for Platform Event to be published
  #   And I query Contact Platform Events for the Contact
  #   Then no Contact Platform Event is published

  # ══════════════════════════════════════════════════════════════════════════
  # UPDATE EVENTS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-599 @SF-599-API-003 @update @p1
  Scenario: Publish Update Platform Event when Contact is updated
    Given I have a valid Salesforce API token
    And I subscribe to Contact Platform Events
    And an existing Contact exists in Salesforce
    When the Contact is updated
    And the Contact is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Contact Platform Event within 10 seconds
    And the event action is "Update"
    And the event includes the Record ID
    And the event includes a unique event identifier
    Given I unsubscribe from Contact Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE SCENARIOS - Transaction Failures
  # ══════════════════════════════════════════════════════════════════════════

  @SF-599 @SF-599-API-005 @negative @transaction @p2
  Scenario Outline: Do not publish Platform Event if the Contact transaction fails
    Given a Contact is <Operation>
    When the save operation fails
    And I wait 3 seconds for Platform Event to be published
    And I query Contact Platform Events for the Contact
    Then no Contact Platform Event is published

    Examples:
      | Operation |
      | created   |
      | updated   |

  # ══════════════════════════════════════════════════════════════════════════
  # METADATA / TRACEABILITY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-599 @SF-599-API-006 @metadata @traceability @p1
  Scenario: Published Platform Event includes traceability metadata
    Given I have a valid Salesforce API token
    And I subscribe to Contact Platform Events
    And an existing Contact exists in Salesforce
    When the Contact is updated
    And the Contact is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Contact Platform Event within 10 seconds
    And the event includes a unique event identifier
    And the event includes the Salesforce Contact Id
    And the event includes an event timestamp
    And the event action is populated
    Given I unsubscribe from Contact Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # STREAMING API VERIFICATION (Real-time)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-599 @SF-599-API-008 @p1 @platform-event @streaming @real-time @positive
  Scenario: API - Verify Platform Event received in real-time via Streaming API
    Given I have a valid Salesforce API token
    And I subscribe to Contact Platform Events
    When a new Contact is created in Salesforce
    And the Contact is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive a Contact Platform Event within 10 seconds
    And the event RecordId__c should match the Contact Id
    And the event should include a unique EventUuid
    And the event should include a CreatedDate timestamp
    And the event should include ReplayId
    Given I unsubscribe from Contact Platform Events

  @SF-599 @SF-599-API-009 @p2 @platform-event @streaming @real-time @positive
  Scenario: API - Verify Platform Event received in real-time on Contact update
    Given I have a valid Salesforce API token
    And an existing Contact exists in Salesforce
    And I subscribe to Contact Platform Events
    When I update the Contact via PATCH request with:
      | field | value |
      | FirstName | Updated Contact Name |
    Then I should receive a Contact Platform Event within 5 seconds
    And a Contact Platform Event should be published with Identifier__c = "update"
    And the event RecordId__c should match the Contact Id
    Given I unsubscribe from Contact Platform Events
