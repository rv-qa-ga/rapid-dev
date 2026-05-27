# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1081 — Additional Mapping for Prospect Account Status in Custom Metadata
# Parent: SF-309 | Depends on: SF-593 (same Dataverse_Mapping__mdt model)
#
# Requirements documentation: SharePoint "Picklist Value Mappings.xlsx" (Party Integration tab).
# Runtime validation: live qamerge org only — CMDT SOQL as MuleSoft integration user
# (SF_MULESOFT_INTEGRATION_JWT_USERNAME), same pattern as SF-1159 / SF-593 API flows.
# No Workbench CSV / gold-export parity in this feature (see SF-593 @party-excel / @party-bulk-export).
#
# qamerge rows: DVMapping_395 = Prospect → accelins_party.statecode 0;
#               DVMapping_396 = Prospect → accelins_party.statuscode 376140003
#
# Reuses: sf-575 CMDT steps + sf-593-1081-integration.steps.ts
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-1081 @account @party-integration @custom-metadata @prospect-status
Feature: API - SF-1081 - Prospect Account_Status mappings in Dataverse_Mapping__mdt

  Background:
    Given I have a valid Salesforce API token as MuleSoft integration user with Custom Metadata access

  # AC — Prospect → statecode=0 + statuscode=376140003 (per Jira / Picklist Value Mappings)
  @SF-1081 @SF-1081-API-001 @p1 @smoke @mapping-sample
  Scenario: API - Account_Status Prospect maps to Party statecode and statuscode in live CMDT
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c"
    Then the queried Dataverse_Mapping records for Account_Status value "Prospect" should include Dataverse pairs
      | Dataverse_Field__c        | Dataverse_Value__c |
      | accelins_party.statecode  | 0                  |
      | accelins_party.statuscode | 376140003          |

  # Smoke — MuleSoft can query Prospect-filtered CMDT rows (integration runtime identity)
  @SF-1081 @SF-1081-API-002 @p1 @mulesoft-can-query @smoke
  Scenario: API - MuleSoft integration user can query Prospect Account_Status mappings in CMDT
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c" and Value "Prospect"
    Then the query should return at least 1 record
    And the response should contain Custom Metadata records

  # AC3 — new Account with status=Prospect resolves deployed DV IDs (live CMDT)
  @SF-1081 @SF-1081-API-003 @p1 @new-account-flow
  Scenario: API - new Account with Account_Status "Prospect" resolves Dataverse IDs from CMDT
    Given I have a valid Salesforce API token
    And I have an Account with status "Prospect"
    When I resolve Dataverse IDs for the created Account's Account_Status__c via CMDT
    Then the resolved Dataverse IDs should include
      | Dataverse_Field__c        |
      | accelins_party.statecode  |
      | accelins_party.statuscode |

  # AC4 — update to Prospect; governance may block persist — resolve uses target Prospect (SF-593-API-007 pattern)
  @SF-1081 @SF-1081-API-004 @p1 @account-update-flow
  Scenario: API - Account_Status update to Prospect resolves Dataverse IDs from CMDT
    Given I have a valid Salesforce API token
    And I have an Account with status "Active"
    When I update the created Account's Account_Status__c to "Prospect"
    And I resolve Dataverse IDs for the created Account's Account_Status__c via CMDT
    Then the resolved Dataverse IDs should include
      | Dataverse_Field__c        |
      | accelins_party.statecode  |
      | accelins_party.statuscode |
