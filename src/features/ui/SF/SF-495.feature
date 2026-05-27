# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-495 - Contacts field consolidation
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-495 @rbt @medium
Feature: UI - SF-495 - Contacts field consolidation
  As Product Owner / Data Owner
  I want the Contact fields Relationship_Owner__c, Role__c, Estimated_Onboarding_Date__c and Contact_Type__c removed from the Contact object; the standard HomePhone hidden from non-admin users; the Contact_Not
  So that the Contact object is simplified, UI and API access is correct for users, notes length aligns with business needs, active/inactive status is captured, and downstream systems remain consistent and corr

  Background:
    Given I am logged in as a "QA MRD User" user
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-495 @SF-495-UI-001 @p1 @rbt
  Scenario: Main scenario
    and add Contact_Status__c (Active / Inactive)
    Given a complete org metadata check,
    When the change is deployed,
    Then Relationship_Owner__c, Role__c, Estimated_Onboarding_Date__c, Contact_Type__c are removed from Contact only; any same-named fields on other objects remain unchanged.
    Given production data prior to deletion,
    When a backup is captured,
    Then a verified export (Contact Id + deleted field values + timestamp) is securely stored.
    Given a non-admin user,
    When they view a Contact record in Lightning or mobile,
    Then HomePhone is not visible anywhere; System Admin and approved support roles can still view it.
    Given non-admin API/integration requests,
    When they read Contact records,
    Then HomePhone is not returned; integrations that require it use approved system/integration credentials.
    Given automations that reference HomePhone,
    When the field is hidden via FLS,
    Then automations continue to work in system/admin context and do not fail for non-admin users.
    Given the Product Owner selects a new max length for Contact_Notes__c,
    When analysis runs,
    Then all notes exceeding the new length are identified and a PO-approved migration plan (archive/truncate/move) exists.
    Given creation of a new Contact,
    When Contact is saved,
    Then Contact_Status__c defaults to Active.
    Given a contact no longer exists at the company,
    When business/user marks the Contact as Inactive,
    Then Contact_Status__c is set to Inactive, the change is recorded (who/when), and downstream integrations receive the update.
    Given integrations, reports and automations,
    When Contact_Status__c is used,
    Then they respect the values and no downstream processes break.
    And I take a screenshot as evidence

