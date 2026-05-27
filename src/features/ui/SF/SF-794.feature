# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-794 - Make Dataverse field identifiers available in Salesforce for integration - Account relationship (TPA Maps) -> TPA Maps
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-794 @rbt @medium
Feature: UI - SF-794 - Make Dataverse field identifiers available in Salesforce for integration - Account relationship (TPA Maps) -> TPA Maps
  As MuleSoft Integration User
  I want Salesforce to provide the Dataverse identifiers required for TPA Account to Member Maps integration
  So that I can query Salesforce at runtime to resolve the correct Dataverse IDs when sending TPA relationship information to Dataverse (TPA Maps)

  Background:
    Given I am logged in as a "QA MRD User" user
    Given the Account Relationship (TPA Maps) to TPA Maps field and value mappings are defined in the referenced mapping artefact
    And Salesforce holds the Dataverse identifiers needed to satisfy those mappings
    And I have API access to query Salesforce as the MuleSoft integration user
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-794 @SF-794-UI-001 @p1 @rbt
  Scenario: Salesforce holds Dataverse IDs so MuleSoft does not hard-code mappings
    Given an integrated Salesforce field includes a value that must be translated to a Dataverse ID
    When I query Salesforce to resolve the Dataverse ID for that value
    Then Salesforce returns the Dataverse ID needed for the Dataverse TPA maps payload
    And no Dataverse IDs or value-to-ID mappings are hard-coded in MuleSoft
    And I take a screenshot as evidence

  @SF-794 @SF-794-UI-002 @p1 @rbt
  Scenario: Only current/valid Dataverse IDs are returned for integration use
    Given Salesforce holds Dataverse IDs for both current and historical mappings
    When I query Salesforce for Dataverse IDs for integration processing
    Then Salesforce returns only Dataverse IDs that are currently valid for use
    And invalid, inactive, or deprecated mappings are not returned by default
    And I take a screenshot as evidence

  @SF-794 @SF-794-UI-003 @p1 @rbt
  Scenario: Retrieve Dataverse IDs for a new TPA Relationship being sent to Dataverse
    Given I am processing a Salesforce Account Relationship (TPA Maps) record that is eligible to be sent to Dataverse
    And the Account Relationship (TPA Maps) record contains one or more integrated fields that require Dataverse IDs in the payload
    When I query Salesforce for the Dataverse IDs corresponding to the Account Relationship (TPA Maps) record mapped field values
    Then Salesforce returns the Dataverse IDs for those values
    And I can populate the Dataverse TPA Maps create request using the returned IDs
    And I take a screenshot as evidence

  @SF-794 @SF-794-UI-004 @p1 @rbt
  Scenario: Retrieve Dataverse IDs for a TPA Relationship update being sent to Dataverse
    Given I am processing an update to a Salesforce Account Relationship (TPA Maps) record that is eligible to be sent to Dataverse
    And one or more integrated fields on the Account Relationship (TPA Maps) record have changed
    When I query Salesforce for the Dataverse IDs corresponding to the updated mapped field values
    Then Salesforce returns the Dataverse IDs for those updated values
    And I can populate the Dataverse TPA Maps update request using the returned IDs
    And I take a screenshot as evidence

