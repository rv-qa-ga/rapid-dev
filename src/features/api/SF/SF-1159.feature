# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1159 — Add Functional Currency Mappings to custom metadata (Dataverse_Mapping__mdt)
# Parent: SF-427 | Same CMDT + integration pattern as SF-593 / SF-1081.
#
# Artefact: SharePoint "Picklist Value Mappings.xlsx" (Integration Party tab) — Functional Currency rows.
# Setup (Custom Metadata Types): https://arx--qamerge.sandbox.my.salesforce-setup.com/lightning/setup/CustomMetadata/page
#
# CMDT SOQL runs as the MuleSoft integration user (SF_MULESOFT_INTEGRATION_JWT_USERNAME) via
# CustomMetadataValidator — live org is the source of truth (no Workbench golden CSV).
#
# Reuses:
#   - sf-575 Custom Metadata query steps + CustomMetadataValidator
#   - sf-593-1081-integration.steps.ts (resolve, picklist completeness, pair assertions)
#   - data-factory ("I have an Account with Functional_Currency …")
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-1159 @account @party-integration @custom-metadata @functional-currency
Feature: API - SF-1159 - Functional Currency → Dataverse mappings (Dataverse_Mapping__mdt)

  Background:
    Given I have a valid Salesforce API token as MuleSoft integration user with Custom Metadata access

  @SF-1159 @SF-1159-API-001 @p1 @smoke @cmdt-shape
  Scenario: API - Dataverse_Mapping__mdt rows for Account.Functional_Currency__c expose mapping field keys
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Functional_Currency__c"
    Then the queried Dataverse_Mapping rows should expose mapping field keys

  @SF-1159 @SF-1159-API-002 @p1 @smoke @custom-metadata
  Scenario: API - Functional_Currency__c mappings exist in Dataverse_Mapping__mdt
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Functional_Currency__c"
    Then the query should return at least 1 record
    And the response should contain Custom Metadata records

  @SF-1159 @SF-1159-API-004 @p1 @valid-only
  Scenario: API - all returned Functional_Currency mapping rows have non-empty mapping fields
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Functional_Currency__c"
    Then every Dataverse_Mapping row should have non-empty Object__c, Field__c, Value__c, Dataverse_Field__c, Dataverse_Value__c

  @SF-1159 @SF-1159-API-005 @p1 @mapping-sample
  Scenario: API - Functional Currency USD maps to Party accelins_functional_currency (CMDT row)
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Functional_Currency__c" and Value "USD"
    Then the query should return at least 1 record
    And the queried Dataverse_Mapping records for picklist value "USD" should include Dataverse field "accelins_party.accelins_functional_currency" with any non-empty Dataverse_Value__c

  @SF-1159 @SF-1159-API-006 @p1 @new-account-flow
  Scenario: API - new Account with Functional_Currency Euro resolves Dataverse IDs from CMDT
    Given I have a valid Salesforce API token
    And I have an Account with Functional_Currency "Euro"
    When I resolve Dataverse IDs for the created Account's Functional_Currency__c via CMDT
    Then the resolved Dataverse IDs should include a field whose name contains "functional_currency"

  @SF-1159 @SF-1159-API-007 @p1 @controlled-failure
  Scenario: API - query for an unmapped Functional_Currency value returns no records
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Functional_Currency__c"
    Then the Dataverse_Mapping query for picklist value "__UnmappedFunctionalCurrencySentinel__" should return no records

  @SF-1159 @SF-1159-API-008 @p2 @completeness
  Scenario: API - every active Functional_Currency__c picklist value has at least one Dataverse_Mapping row
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Functional_Currency__c"
    Then every active Functional_Currency__c picklist value should have at least one Dataverse_Mapping row
