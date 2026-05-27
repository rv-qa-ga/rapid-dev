# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-769 - Member Legal Entity Group Relationship → Dataverse Member Maps
# UI: Validates Salesforce-side governance (Custom Metadata) that SF-769 integration relies on.
# Same assertions as SF-789; tagged for SF-769 traceability / Zephyr. No Dataverse UI (IDs hidden).
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-769 @rbt @medium @member-maps @custom-metadata
Feature: UI - SF-769 - Member Maps governance for Member Legal Entity Group path
  As MuleSoft Integration User
  I want Custom Metadata in Salesforce to match Integration Member Maps
  So that SF-769 field and picklist mappings remain approved and auditable in the UI org

  Background:
    Given I am logged in as a "QA MRD User" user
    And I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access
    And the Integration Member Maps expected mappings are loaded from Picklist Value Mappings Excel

  @SF-769 @SF-769-UI-001 @p1 @rbt @smoke @custom-metadata
  Scenario: UI - Custom Metadata for Member Maps supports SF-769 Member + Legal Entity + Group mappings
    When I query Custom Metadata "Dataverse_Mapping__mdt" records for Object "Member_Legal_Entity_Relationship__c"
    Then the Custom Metadata records for Member_Legal_Entity_Relationship__c should match the Integration Member Maps Excel spec
    And Custom Metadata should contain mappings for Member__c, Legal_Entity__c, and Group__c fields
    And I take a screenshot as evidence

  @SF-769 @SF-769-UI-002 @p2 @rbt @custom-metadata
  Scenario: UI - Every Integration Member Maps Excel row exists in QA for SF-769 scope
    When I compare Integration Member Maps Excel to QA Custom Metadata for Member_Legal_Entity_Relationship__c
    Then every Excel row should have a matching Custom Metadata record in the QA org
    And I take a screenshot as evidence
