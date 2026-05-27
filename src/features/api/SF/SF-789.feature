# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-789 - Make Dataverse field identifiers available in Salesforce for integration
# Member, Legal Entity, Group -> Member Maps
#
# As a MuleSoft Integration User I want Salesforce to provide the Dataverse identifiers
# required for Member Legal Entity Group relationship to Member Maps integration, so that
# I can query Salesforce at runtime to resolve the correct Dataverse IDs when sending
# Member relationship information to Dataverse (Member Maps).
#
# Validation: Custom Metadata (Dataverse_Mapping__mdt) in QA org must match the spec
# defined in Picklist Value Mappings.xlsx, tab "Integration Member Maps".
# Setup page: https://arx--qa.sandbox.my.salesforce-setup.com/lightning/setup/CustomMetadata/page
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-789 @rbt @medium @integration @member-maps @custom-metadata
Feature: API - SF-789 - Dataverse field identifiers for Member Legal Entity Group → Member Maps integration
  As a MuleSoft Integration User
  I want Salesforce Custom Metadata to match the Integration Member Maps mapping artefact
  So that Member Legal Entity Group → Member Maps integration has correct Dataverse field mappings

  Background:
    Given I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access
    And the Integration Member Maps expected mappings are loaded from Picklist Value Mappings Excel

  # ─── Scenario 1: Custom Metadata contains all required Member Maps mappings ──

  @SF-789 @SF-789-API-001 @p1 @smoke @rbt
  Scenario: Custom Metadata for Member Legal Entity Relationship matches Integration Member Maps Excel
    When I query Custom Metadata "Dataverse_Mapping__mdt" records for Object "Member_Legal_Entity_Relationship__c"
    Then the Custom Metadata records for Member_Legal_Entity_Relationship__c should match the Integration Member Maps Excel spec

  # ─── Scenario 2: Member, Legal Entity, and Group lookup mappings exist ───────

  @SF-789 @SF-789-API-002 @p1 @rbt
  Scenario: Member Maps Custom Metadata includes Member, Legal Entity, and Group lookup mappings
    When I query Custom Metadata "Dataverse_Mapping__mdt" records for Object "Member_Legal_Entity_Relationship__c"
    Then Custom Metadata should contain mappings for Member__c, Legal_Entity__c, and Group__c fields
    And each mapping should have valid Dataverse_Field__c and Dataverse_Value__c or lookup target

  # ─── Scenario 3: Is_Active__c state/status mappings exist ──────────────────────

  @SF-789 @SF-789-API-003 @p1 @rbt
  Scenario: Is_Active__c statecode and statuscode mappings exist in Custom Metadata
    When I query Custom Metadata "Dataverse_Mapping__mdt" records for Object "Member_Legal_Entity_Relationship__c" and Field "Is_Active__c"
    Then Custom Metadata should contain Is_Active__c TRUE to statecode 0 and statuscode 1
    And Custom Metadata should contain Is_Active__c FALSE to statecode 1 and statuscode 2

  # ─── Scenario 4: No Excel rows missing from Custom Metadata ──────────────────

  @SF-789 @SF-789-API-004 @p2 @rbt
  Scenario: All Integration Member Maps Excel rows exist in QA Custom Metadata
    When I compare Integration Member Maps Excel to QA Custom Metadata for Member_Legal_Entity_Relationship__c
    Then every Excel row should have a matching Custom Metadata record in the QA org
