# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-495 - Contacts field consolidation
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - API minimal
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-495 @rbt @medium
Feature: API - SF-495 - Contacts field consolidation
  API must support the behaviour described in the story (SF-495).

  Background:
    Given I have a valid Salesforce API token
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-495 @SF-495-API-001 @p1 @smoke @rbt
  Scenario: API - Main scenario
    Given a complete org metadata check,
    Given production data prior to deletion,
    Given a non-admin user,
    When the change is deployed,
    Then Relationship_Owner__c, Role__c, Estimated_Onboarding_Date__c, Contact_Type__c are removed from Contact only; any same-named fields on other objects remain unchanged.
    Then a verified export (Contact Id + deleted field values + timestamp) is securely stored.
    Then HomePhone is not visible anywhere; System Admin and approved support roles can still view it.
