# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-789 - Make Dataverse field identifiers available in Salesforce for integration - Member, Legal Entity, Group -> Member Maps
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Mapping: Picklist Value Mappings.xlsx, tab "Integration Member Maps"
# Note: Dataverse IDs are hidden from UI for all users. UI tests validate Custom Metadata only (no account/relationship creation).
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-789 @rbt @medium
Feature: UI - SF-789 - Dataverse field identifiers for Member Maps integration (Custom Metadata validation)
  As MuleSoft Integration User
  I want Salesforce Custom Metadata to match the Integration Member Maps mapping artefact
  So that Member Legal Entity Group → Member Maps integration has correct Dataverse field mappings

  Background:
    Given I am logged in as a "QA MRD User" user
    And I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access
    And the Integration Member Maps expected mappings are loaded from Picklist Value Mappings Excel

  # ══════════════════════════════════════════════════════════════════════════
  # Custom Metadata validation (no account/MLER creation)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-789 @SF-789-UI-001 @p1 @rbt @smoke @custom-metadata
  Scenario: Custom Metadata for Member Maps matches Integration Member Maps Excel
    When I query Custom Metadata "Dataverse_Mapping__mdt" records for Object "Member_Legal_Entity_Relationship__c"
    Then the Custom Metadata records for Member_Legal_Entity_Relationship__c should match the Integration Member Maps Excel spec
    And Custom Metadata should contain mappings for Member__c, Legal_Entity__c, and Group__c fields
    And I take a screenshot as evidence

  @SF-789 @SF-789-UI-002 @p2 @rbt @custom-metadata
  Scenario: All Integration Member Maps Excel rows exist in QA Custom Metadata
    When I compare Integration Member Maps Excel to QA Custom Metadata for Member_Legal_Entity_Relationship__c
    Then every Excel row should have a matching Custom Metadata record in the QA org
    And I take a screenshot as evidence
