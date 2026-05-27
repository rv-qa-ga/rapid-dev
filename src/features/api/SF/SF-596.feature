# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-596 - Publish Account Platform Events from Salesforce
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: platform-events
# Updated: 2026-01-18T16:00:00Z
# ══════════════════════════════════════════════════════════════════════════════
#
# REQUIREMENTS:
# - Platform Events must be published when Accounts are created or updated
# - Each Account Platform Event includes the Salesforce Record ID and a unique event identifier
# - Platform Events are not published when transactions fail
#
# BUSINESS RULES (Based on SF-496 BA Clarification - ASSUMPTIONS):
# 1. Member, Non-Member MGA, TPA Account Types:
#    - Events published for: Onboarding, Contracted, Active, Runoff, Offboarded, Invalid
#    - Events NOT published for: New, Prospect
#
# 2. Other Account Types (Agency, Insurer, Legal Entity, etc.):
#    - Events published for: Active, Runoff, Offboarded, Invalid
#    - Events NOT published for: New, Prospect, Onboarding, Contracted
#
# STATUS TRANSITION ASSUMPTIONS (To be confirmed with BA):
# - Eligible → Ineligible: SHOULD publish (for Dynamics sync)
# - Ineligible → Eligible: SHOULD publish
# - Eligible → Eligible: SHOULD publish
# - Ineligible → Ineligible: SHOULD NOT publish
#
# 3. Status Transition Edge Case:
#    - When status changes from higher to lower (e.g., Onboarding → New), 
#      event should still be published to keep Dynamics in sync
#    - NOTE: This needs further BA clarification
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-596 @platform-events @account
Feature: Publish Account Platform Events from Salesforce
  Platform Events must be published when Accounts are created or updated.
  Each Account Platform Event includes the Salesforce Record ID and a unique event identifier.

  Background:
    Given I have a valid Salesforce API token
    And Salesforce publishes Account Platform Events
    And each Account Platform Event includes the Record ID and Event Identifier

  # ══════════════════════════════════════════════════════════════════════════
  # CREATE EVENTS - ELIGIBLE COMBINATIONS
  # ══════════════════════════════════════════════════════════════════════════
  # Member, Non-Member MGA, TPA: Onboarding, Contracted, Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001a @create @p1 @eligible @member
  Scenario: Publish Create Platform Event when Member Account is created with Status "Onboarding"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Member Account is created in Salesforce with Status "Onboarding"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    And the event includes the Record ID
    And the event includes a unique event identifier
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001b @create @p1 @eligible @member
  Scenario: Publish Create Platform Event when Member Account is created with Status "Contracted"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Member Account is created in Salesforce with Status "Contracted"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001c @create @p1 @eligible @member
  Scenario: Publish Create Platform Event when Member Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Member Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001d @create @p1 @eligible @member
  Scenario: Publish Create Platform Event when Member Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Member Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001e @create @p1 @eligible @member
  Scenario: Publish Create Platform Event when Member Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Member Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001f @create @p1 @eligible @member
  Scenario: Publish Create Platform Event when Member Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Member Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Other Account Types: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001g @create @p1 @eligible @agency
  Scenario: Publish Create Platform Event when Agency Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Agency Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001h @create @p1 @eligible @agency
  Scenario: Publish Create Platform Event when Agency Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Agency Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001i @create @p1 @eligible @agency
  Scenario: Publish Create Platform Event when Agency Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Agency Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001j @create @p1 @eligible @agency
  Scenario: Publish Create Platform Event when Agency Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Agency Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Non-Member MGA: Onboarding, Contracted, Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001k @create @p1 @eligible @non-member-mga
  Scenario: Publish Create Platform Event when Non-Member MGA Account is created with Status "Onboarding"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Non-Member MGA Account is created in Salesforce with Status "Onboarding"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001l @create @p1 @eligible @non-member-mga
  Scenario: Publish Create Platform Event when Non-Member MGA Account is created with Status "Contracted"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Non-Member MGA Account is created in Salesforce with Status "Contracted"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001m @create @p1 @eligible @non-member-mga
  Scenario: Publish Create Platform Event when Non-Member MGA Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Non-Member MGA Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001n @create @p1 @eligible @non-member-mga
  Scenario: Publish Create Platform Event when Non-Member MGA Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Non-Member MGA Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001o @create @p1 @eligible @non-member-mga
  Scenario: Publish Create Platform Event when Non-Member MGA Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Non-Member MGA Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001p @create @p1 @eligible @non-member-mga
  Scenario: Publish Create Platform Event when Non-Member MGA Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Non-Member MGA Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # TPA: Onboarding, Contracted, Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001q @create @p1 @eligible @tpa
  Scenario: Publish Create Platform Event when TPA Account is created with Status "Onboarding"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Account is created in Salesforce with Status "Onboarding"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001r @create @p1 @eligible @tpa
  Scenario: Publish Create Platform Event when TPA Account is created with Status "Contracted"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Account is created in Salesforce with Status "Contracted"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001s @create @p1 @eligible @tpa
  Scenario: Publish Create Platform Event when TPA Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001t @create @p1 @eligible @tpa
  Scenario: Publish Create Platform Event when TPA Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001u @create @p1 @eligible @tpa
  Scenario: Publish Create Platform Event when TPA Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001v @create @p1 @eligible @tpa
  Scenario: Publish Create Platform Event when TPA Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Insurer: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001w @create @p1 @eligible @insurer
  Scenario: Publish Create Platform Event when Insurer Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Insurer Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001x @create @p1 @eligible @insurer
  Scenario: Publish Create Platform Event when Insurer Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Insurer Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001y @create @p1 @eligible @insurer
  Scenario: Publish Create Platform Event when Insurer Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Insurer Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001z @create @p1 @eligible @insurer
  Scenario: Publish Create Platform Event when Insurer Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Insurer Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Legal Entity: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001aa @create @p1 @eligible @legal-entity
  Scenario: Publish Create Platform Event when Legal Entity Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Legal Entity Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001ab @create @p1 @eligible @legal-entity
  Scenario: Publish Create Platform Event when Legal Entity Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Legal Entity Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001ac @create @p1 @eligible @legal-entity
  Scenario: Publish Create Platform Event when Legal Entity Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Legal Entity Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001ad @create @p1 @eligible @legal-entity
  Scenario: Publish Create Platform Event when Legal Entity Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Legal Entity Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # CREATE EVENTS - INELIGIBLE COMBINATIONS (Negative Tests)
  # ══════════════════════════════════════════════════════════════════════════
  # Member, Non-Member MGA, TPA: New, Prospect should NOT publish events

  @SF-596 @SF-596-API-001n @create @p2 @ineligible @member @negative
  Scenario: Do not publish Create Platform Event when Member Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Member Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001o @create @p2 @ineligible @member @negative
  Scenario: Do not publish Create Platform Event when Member Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Member Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  # Other Account Types: New, Prospect, Onboarding, Contracted should NOT publish events

  @SF-596 @SF-596-API-001p @create @p2 @ineligible @agency @negative
  Scenario: Do not publish Create Platform Event when Agency Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Agency Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001q @create @p2 @ineligible @agency @negative
  Scenario: Do not publish Create Platform Event when Agency Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Agency Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001r @create @p2 @ineligible @agency @negative
  Scenario: Do not publish Create Platform Event when Agency Account is created with Status "Onboarding"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Agency Account is created in Salesforce with Status "Onboarding"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001s @create @p2 @ineligible @agency @negative
  Scenario: Do not publish Create Platform Event when Agency Account is created with Status "Contracted"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Agency Account is created in Salesforce with Status "Contracted"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  # Non-Member MGA: New, Prospect should NOT publish events

  @SF-596 @SF-596-API-001ae @create @p2 @ineligible @non-member-mga @negative
  Scenario: Do not publish Create Platform Event when Non-Member MGA Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Non-Member MGA Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001af @create @p2 @ineligible @non-member-mga @negative
  Scenario: Do not publish Create Platform Event when Non-Member MGA Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Non-Member MGA Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  # TPA: New, Prospect should NOT publish events

  @SF-596 @SF-596-API-001ag @create @p2 @ineligible @tpa @negative
  Scenario: Do not publish Create Platform Event when TPA Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001ah @create @p2 @ineligible @tpa @negative
  Scenario: Do not publish Create Platform Event when TPA Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  # Insurer: New, Prospect, Onboarding, Contracted should NOT publish events

  @SF-596 @SF-596-API-001ai @create @p2 @ineligible @insurer @negative
  Scenario: Do not publish Create Platform Event when Insurer Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Insurer Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001aj @create @p2 @ineligible @insurer @negative
  Scenario: Do not publish Create Platform Event when Insurer Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Insurer Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001ak @create @p2 @ineligible @insurer @negative
  Scenario: Do not publish Create Platform Event when Insurer Account is created with Status "Onboarding"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Insurer Account is created in Salesforce with Status "Onboarding"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001al @create @p2 @ineligible @insurer @negative
  Scenario: Do not publish Create Platform Event when Insurer Account is created with Status "Contracted"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Insurer Account is created in Salesforce with Status "Contracted"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  # Legal Entity: New, Prospect, Onboarding, Contracted should NOT publish events

  @SF-596 @SF-596-API-001am @create @p2 @ineligible @legal-entity @negative
  Scenario: Do not publish Create Platform Event when Legal Entity Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Legal Entity Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001an @create @p2 @ineligible @legal-entity @negative
  Scenario: Do not publish Create Platform Event when Legal Entity Account is created with Status "Prospect"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Legal Entity Account is created in Salesforce with Status "Prospect"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001ao @create @p2 @ineligible @legal-entity @negative
  Scenario: Do not publish Create Platform Event when Legal Entity Account is created with Status "Onboarding"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Legal Entity Account is created in Salesforce with Status "Onboarding"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-001ap @create @p2 @ineligible @legal-entity @negative
  Scenario: Do not publish Create Platform Event when Legal Entity Account is created with Status "Contracted"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Legal Entity Account is created in Salesforce with Status "Contracted"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  # Other Account Types (Acquisition Company, Distribution Partner, Group, Placing Broker, Reinsurance Broker, Reinsurer, Service Company, TPA Group)
  # Ineligible: New, Prospect, Onboarding, Contracted
  # Eligible: Active, Runoff, Offboarded, Invalid
  # Ineligible: New, Prospect, Onboarding, Contracted

  # Acquisition Company: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001aq @create @p1 @eligible @acquisition-company
  Scenario: Publish Create Platform Event when Acquisition Company Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Acquisition Company Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001ar @create @p1 @eligible @acquisition-company
  Scenario: Publish Create Platform Event when Acquisition Company Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Acquisition Company Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001as @create @p1 @eligible @acquisition-company
  Scenario: Publish Create Platform Event when Acquisition Company Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Acquisition Company Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001at @create @p1 @eligible @acquisition-company
  Scenario: Publish Create Platform Event when Acquisition Company Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Acquisition Company Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Distribution Partner: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001au @create @p1 @eligible @distribution-partner
  Scenario: Publish Create Platform Event when Distribution Partner Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Distribution Partner Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001av @create @p1 @eligible @distribution-partner
  Scenario: Publish Create Platform Event when Distribution Partner Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Distribution Partner Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001aw @create @p1 @eligible @distribution-partner
  Scenario: Publish Create Platform Event when Distribution Partner Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Distribution Partner Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001ax @create @p1 @eligible @distribution-partner
  Scenario: Publish Create Platform Event when Distribution Partner Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Distribution Partner Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Group: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001ay @create @p1 @eligible @group
  Scenario: Publish Create Platform Event when Group Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Group Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001az @create @p1 @eligible @group
  Scenario: Publish Create Platform Event when Group Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Group Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001ba @create @p1 @eligible @group
  Scenario: Publish Create Platform Event when Group Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Group Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bb @create @p1 @eligible @group
  Scenario: Publish Create Platform Event when Group Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Group Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Placing Broker: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001bc @create @p1 @eligible @placing-broker
  Scenario: Publish Create Platform Event when Placing Broker Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Placing Broker Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bd @create @p1 @eligible @placing-broker
  Scenario: Publish Create Platform Event when Placing Broker Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Placing Broker Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001be @create @p1 @eligible @placing-broker
  Scenario: Publish Create Platform Event when Placing Broker Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Placing Broker Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bf @create @p1 @eligible @placing-broker
  Scenario: Publish Create Platform Event when Placing Broker Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Placing Broker Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Reinsurance Broker: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001bg @create @p1 @eligible @reinsurance-broker
  Scenario: Publish Create Platform Event when Reinsurance Broker Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Reinsurance Broker Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bh @create @p1 @eligible @reinsurance-broker
  Scenario: Publish Create Platform Event when Reinsurance Broker Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Reinsurance Broker Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bi @create @p1 @eligible @reinsurance-broker
  Scenario: Publish Create Platform Event when Reinsurance Broker Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Reinsurance Broker Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bj @create @p1 @eligible @reinsurance-broker
  Scenario: Publish Create Platform Event when Reinsurance Broker Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Reinsurance Broker Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Reinsurer: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001bk @create @p1 @eligible @reinsurer
  Scenario: Publish Create Platform Event when Reinsurer Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Reinsurer Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bl @create @p1 @eligible @reinsurer
  Scenario: Publish Create Platform Event when Reinsurer Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Reinsurer Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bm @create @p1 @eligible @reinsurer
  Scenario: Publish Create Platform Event when Reinsurer Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Reinsurer Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bn @create @p1 @eligible @reinsurer
  Scenario: Publish Create Platform Event when Reinsurer Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Reinsurer Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # Service Company: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001bo @create @p1 @eligible @service-company
  Scenario: Publish Create Platform Event when Service Company Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Service Company Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bp @create @p1 @eligible @service-company
  Scenario: Publish Create Platform Event when Service Company Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Service Company Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bq @create @p1 @eligible @service-company
  Scenario: Publish Create Platform Event when Service Company Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Service Company Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001br @create @p1 @eligible @service-company
  Scenario: Publish Create Platform Event when Service Company Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Service Company Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # TPA Group: Active, Runoff, Offboarded, Invalid

  @SF-596 @SF-596-API-001bs @create @p1 @eligible @tpa-group
  Scenario: Publish Create Platform Event when TPA Group Account is created with Status "Active"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Group Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bt @create @p1 @eligible @tpa-group
  Scenario: Publish Create Platform Event when TPA Group Account is created with Status "Runoff"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Group Account is created in Salesforce with Status "Runoff"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bu @create @p1 @eligible @tpa-group
  Scenario: Publish Create Platform Event when TPA Group Account is created with Status "Offboarded"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Group Account is created in Salesforce with Status "Offboarded"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-001bv @create @p1 @eligible @tpa-group
  Scenario: Publish Create Platform Event when TPA Group Account is created with Status "Invalid"
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new TPA Group Account is created in Salesforce with Status "Invalid"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Create"
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # UPDATE EVENTS - ELIGIBLE COMBINATIONS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-002a @update @p1 @eligible @member
  Scenario: Publish Update Platform Event when Member Account with eligible status is updated
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Active"
    When the Account is updated
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    And the event includes the Record ID
    And the event includes a unique event identifier
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002b @update @p1 @eligible @agency
  Scenario: Publish Update Platform Event when Agency Account with eligible status is updated
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Active"
    When the Account is updated
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # UPDATE EVENTS - STATUS TRANSITION EDGE CASES (CORNER CASES)
  # ══════════════════════════════════════════════════════════════════════════
  # ASSUMPTIONS based on BA screenshot:
  # 1. Status changes from eligible → ineligible: SHOULD publish (for Dynamics sync)
  # 2. Status changes from ineligible → eligible: SHOULD publish
  # 3. Status changes from eligible → eligible: SHOULD publish
  # 4. Status changes from ineligible → ineligible: SHOULD NOT publish

  # ══════════════════════════════════════════════════════════════════════════
  # CORNER CASE 1: Eligible → Ineligible (Status Downgrade)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-002t @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Member Account status changes from Onboarding to New
    # Corner Case: Eligible → Ineligible (should publish for Dynamics sync)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Onboarding"
    When the Account Status is updated to "Prospect"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002u @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Agency Account status changes from Active to Onboarding
    # Corner Case: Eligible → Ineligible (should publish for Dynamics sync)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Active"
    When the Account Status is updated to "Onboarding"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002v @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Member Account status changes from Active to Prospect
    # Corner Case: Eligible → Ineligible (should publish for Dynamics sync)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Active"
    When the Account Status is updated to "Prospect"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002w @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Agency Account status changes from Active to New
    # Corner Case: Eligible → Ineligible (should publish for Dynamics sync)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Active"
    When the Account Status is updated to "Prospect"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # CORNER CASE 2: Ineligible → Eligible (Status Upgrade)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-002x @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Member Account status changes from New to Onboarding
    # Corner Case: Ineligible → Eligible (should publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Prospect"
    When the Account Status is updated to "Onboarding"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002y @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Member Account status changes from Prospect to Contracted
    # Corner Case: Ineligible → Eligible (should publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Prospect"
    When the Account Status is updated to "Contracted"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002z @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Agency Account status changes from New to Active
    # Corner Case: Ineligible → Eligible (should publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Prospect"
    When the Account Status is updated to "Active"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002aa @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Agency Account status changes from Onboarding to Active
    # Corner Case: Ineligible → Eligible (should publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Onboarding"
    When the Account Status is updated to "Active"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # CORNER CASE 3: Eligible → Eligible (Status Change Within Eligible Range)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-002ab @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Member Account status changes from Onboarding to Active
    # Corner Case: Eligible → Eligible (should publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Onboarding"
    When the Account Status is updated to "Active"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002ac @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Member Account status changes from Active to Runoff
    # Corner Case: Eligible → Eligible (should publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Active"
    When the Account Status is updated to "Runoff"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002ad @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Agency Account status changes from Active to Offboarded
    # Corner Case: Eligible → Eligible (should publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Active"
    When the Account Status is updated to "Offboarded"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # CORNER CASE 4: Ineligible → Ineligible (Status Change Within Ineligible Range)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-002ae @update @p2 @edge-case @status-transition @corner-case @negative
  Scenario: Do not publish Update Platform Event when Member Account status changes from New to Prospect
    # Corner Case: Ineligible → Ineligible (should NOT publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Prospect"
    When the Account Status is updated to "Prospect"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-002af @update @p2 @edge-case @status-transition @corner-case @negative
  Scenario: Do not publish Update Platform Event when Agency Account status changes from New to Prospect
    # Corner Case: Ineligible → Ineligible (should NOT publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Prospect"
    When the Account Status is updated to "Prospect"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  @SF-596 @SF-596-API-002ag @update @p2 @edge-case @status-transition @corner-case @negative
  Scenario: Do not publish Update Platform Event when Agency Account status changes from Onboarding to Contracted
    # Corner Case: Ineligible → Ineligible (should NOT publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Onboarding"
    When the Account Status is updated to "Contracted"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

  # ══════════════════════════════════════════════════════════════════════════
  # CORNER CASE 5: Multiple Status Transitions (Sequential Changes)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-002ah @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event for sequential status changes - Member Account progression
    # Corner Case: Multiple transitions - New → Onboarding → Active (should publish for each eligible transition)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Prospect"
    When the Account Status is updated to "Onboarding"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    When the Account Status is updated to "Active"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002ai @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event for sequential status changes - Agency Account progression
    # Corner Case: Multiple transitions - New → Onboarding → Active (should publish only for eligible transition)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Prospect"
    When the Account Status is updated to "Onboarding"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published
    When the Account Status is updated to "Active"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # CORNER CASE 6: Status Changes to/from Invalid Status
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-002aj @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Member Account status changes from Active to Invalid
    # Corner Case: Eligible → Invalid (should publish - Invalid is eligible)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Active"
    When the Account Status is updated to "Invalid"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002ak @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Agency Account status changes from New to Invalid
    # Corner Case: Ineligible → Invalid (should publish - Invalid is eligible)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Agency Account exists in Salesforce with Status "Prospect"
    When the Account Status is updated to "Invalid"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # CORNER CASE 7: Other Account Types Status Transitions
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-002al @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Insurer Account status changes from New to Active
    # Corner Case: Other Account Type - Ineligible → Eligible (should publish)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Insurer Account exists in Salesforce with Status "Prospect"
    When the Account Status is updated to "Active"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-002am @update @p2 @edge-case @status-transition @corner-case
  Scenario: Publish Update Platform Event when Legal Entity Account status changes from Active to New
    # Corner Case: Other Account Type - Eligible → Ineligible (should publish for sync)
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Legal Entity Account exists in Salesforce with Status "Active"
    When the Account Status is updated to "Prospect"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE SCENARIOS - Transaction Failures
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-003 @negative @transaction @p2
  Scenario Outline: Do not publish Platform Event if the Account transaction fails
    Given an Account is <Operation>
    When the save operation fails
    And I wait 3 seconds for Platform Event to be published
    And I query Account Platform Events for the Account
    Then no Account Platform Event is published

    Examples:
      | Operation |
      | created   |
      | updated   |

  # ══════════════════════════════════════════════════════════════════════════
  # LIFECYCLE SCENARIOS - Account Deactivation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-004 @lifecycle @deactivation @p2 @eligible
  Scenario: Account deactivation is handled by lifecycle status rather than deletion
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Account exists in Salesforce with Status "Active"
    And I wait 2 seconds for Platform Event to be published
    When the Account is no longer operational
    And the Account Status is updated to "Offboarded"
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event action is "Update"
    And no delete event is published
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # METADATA / TRACEABILITY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-005 @metadata @traceability @p1 @eligible
  Scenario: Published Platform Event includes traceability metadata
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And an existing Member Account exists in Salesforce with Status "Active"
    When the Account is updated
    And the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event includes a unique event identifier
    And the event includes the Salesforce Account Id
    And the event includes an event timestamp
    And the event action is populated
    Given I unsubscribe from Account Platform Events

  # ══════════════════════════════════════════════════════════════════════════
  # STREAMING API VERIFICATION (Real-time)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-596 @SF-596-API-006 @p1 @platform-event @streaming @real-time @positive @eligible
  Scenario: API - Verify Platform Event received in real-time via Streaming API
    Given I have a valid Salesforce API token
    And I subscribe to Account Platform Events
    And a new Member Account is created in Salesforce with Status "Active"
    When the Account is saved successfully
    And I wait 3 seconds for Platform Event to be published
    Then I should receive an Account Platform Event within 10 seconds
    And the event RecordId__c should match the Account Id
    And the event should include a unique EventUuid
    And the event should include a CreatedDate timestamp
    And the event should include ReplayId
    Given I unsubscribe from Account Platform Events

  @SF-596 @SF-596-API-007 @p2 @platform-event @streaming @real-time @positive @eligible
  Scenario: API - Verify Platform Event received in real-time on Account update
    Given I have a valid Salesforce API token
    And an existing Member Account exists in Salesforce with Status "Active"
    And I subscribe to Account Platform Events
    When I update the Account via PATCH request with:
      | field | value |
      | Name  | Updated Account Name |
    Then I should receive an Account Platform Event within 5 seconds
    And an Account Platform Event should be published with Identifier__c = "update"
    And the event RecordId__c should match the Account Id
    Given I unsubscribe from Account Platform Events
