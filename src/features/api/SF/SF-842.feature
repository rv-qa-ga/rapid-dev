# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-842 - Derive and maintain Is_Active__c on Account Relationship records (TPA Relationships)
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-842 @rbt @medium
Feature: API - SF-842 - Derive and maintain Is_Active__c on Account Relationship records (TPA Relationships)
  API must support the behaviour described in the story (SF-842).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-842 @SF-842-API-001 @p1 @smoke @rbt
  Scenario: API - Is_Active__c field exists on Account Relationship (TPA Maps) Relationship
    Given the Account Relationship (TPA Maps) object exists
    When the API is invoked for SF-842
    Then a new field named "Is_Active__c" should be created

  @SF-842 @SF-842-API-002 @p2 @rbt
  Scenario: API - Alternative or negative path
    Given the system is configured for SF-842
    When an alternative or invalid request is made
    Then the API must respond appropriately
