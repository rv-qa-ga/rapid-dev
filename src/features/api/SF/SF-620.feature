# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-620 - Add Dataverse_Id__c field on the Member Legal Entity Relationship object
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-620 @rbt @medium
Feature: API - SF-620 - Add Dataverse_Id__c field on the Member Legal Entity Relationship object
  API must support the behaviour described in the story (SF-620).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-620 @SF-620-API-001 @p1 @smoke @rbt
  Scenario: API - Create hidden Dataverse ID field on Member Legal Entity Relationship
    Given the Member_Legal_Entity_Relationship__c object
    When the field Dataverse_ID__c is created
    Then Source_Relationship_Id__c must be deleted from the object

  @SF-620 @SF-620-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-620
    When an alternative or invalid request is made
    Then the API must respond appropriately
