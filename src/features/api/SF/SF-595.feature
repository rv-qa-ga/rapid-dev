# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-595 — Dataverse field identifiers in Salesforce — AccountTeamMember → Internal Contact
# Scope: API / integration (CMDT + MuleSoft resolve + governance). No UI scenarios.
# Parent / pattern: SF-427 / SF-593 / SF-1159 (Dataverse_Mapping__mdt).
#
# Mapping artefact: Picklist Value Mappings.xlsx — Integration Internal Contact tab.
# CMDT: Object__c = AccountTeamMember, Field__c = TeamMemberRole | Region_c.
#
# Reuses: sf-575, sf-593-1081-integration, mulesoft-integration (E2E).
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-595 @account-team-member @party-integration @custom-metadata @integration
Feature: API - SF-595 - AccountTeamMember → Internal Contact Dataverse mappings (integration)

  Background:
    Given I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access

  @SF-595 @SF-595-API-001 @p1 @smoke @cmdt-shape
  Scenario: API - Dataverse_Mapping__mdt rows for AccountTeamMember.TeamMemberRole expose mapping field keys
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "TeamMemberRole"
    Then the queried Dataverse_Mapping rows should expose mapping field keys

  @SF-595 @SF-595-API-002 @p1 @smoke @custom-metadata
  Scenario: API - AccountTeamMember TeamMemberRole mappings exist in Dataverse_Mapping__mdt
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "TeamMemberRole"
    Then the query should return at least 1 record
    And the response should contain Custom Metadata records

  @SF-595 @SF-595-API-003 @p1 @valid-only
  Scenario: API - all returned TeamMemberRole mapping rows have non-empty mapping fields
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "TeamMemberRole"
    Then every Dataverse_Mapping row should have non-empty Object__c, Field__c, Value__c, Dataverse_Field__c, Dataverse_Value__c

  @SF-595 @SF-595-API-004 @p1 @controlled-failure
  Scenario: API - query for an unmapped AccountTeamMember TeamMemberRole returns no records
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "TeamMemberRole"
    Then the Dataverse_Mapping query for picklist value "__UnmappedATMRole595__" should return no records

  @SF-595 @SF-595-API-005 @p1 @mapping-sample
  Scenario: API - TeamMemberRole Lead Actuary maps to internal contact title (CMDT row)
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "TeamMemberRole" and Value "Lead Actuary"
    Then the query should return at least 1 record
    And the queried Dataverse_Mapping records for picklist value "Lead Actuary" should include a Dataverse_Field__c containing "accelins_contact_title" with any non-empty Dataverse_Value__c

  @SF-595 @SF-595-API-006 @p1 @mapping-sample @region
  Scenario: API - AccountTeamMember Region CA maps to internal contact geography (CMDT row)
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "Region_c" and Value "CA"
    Then the query should return at least 1 record
    And the queried Dataverse_Mapping records for picklist value "CA" should include a Dataverse_Field__c containing "accelins_contact_geography" with any non-empty Dataverse_Value__c

  # ── AC3: MuleSoft resolves TeamMemberRole at runtime ───────────────────────
  @SF-595 @SF-595-API-007 @p1 @new-atm-flow
  Scenario: API - new AccountTeamMember with Lead Actuary resolves Dataverse IDs from CMDT
    Given I have an Account with status "Active"
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    When I add an AccountTeamMember to the Account via API with:
      | UserId | <userId> |
      | TeamMemberRole | Lead Actuary |
    And I resolve Dataverse IDs for the created AccountTeamMember's TeamMemberRole via CMDT
    Then the resolved Dataverse IDs should include a field whose name contains "accelins_contact_title"

  # ── AC6: Read-after-deploy CMDT value ────────────────────────────────────
  @SF-595 @SF-595-API-008 @p1 @no-code-change
  Scenario: API - Dataverse_Value__c for Lead Actuary is the currently-deployed CMDT value
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "TeamMemberRole" and Value "Lead Actuary"
    Then the query should return at least 1 record
    And the queried Dataverse_Mapping records for picklist value "Lead Actuary" should include a Dataverse_Field__c containing "accelins_contact_title" with any non-empty Dataverse_Value__c

  @SF-595 @SF-595-API-009 @p1 @mulesoft-can-query
  Scenario: API - MuleSoft integration user can query AccountTeamMember TeamMemberRole mappings in Dataverse_Mapping__mdt
    Given I have a valid Salesforce API token as MuleSoft integration user with Custom Metadata access
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "TeamMemberRole"
    Then the query should return at least 1 record

  @SF-595 @SF-595-API-010 @p1 @integration @e2e @sf_to_d365 @internal_contact @rdm-qatest2
  Scenario: E2E - AccountTeamMember synced from Salesforce is queryable in Dataverse accelins_internal_contacts (RDM)
    Given I have valid API access to both Dynamics CRM and Salesforce
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    When I add an AccountTeamMember to the Account via API with:
      | UserId | <userId> |
      | TeamMemberRole | Lead Actuary |
    Then the AccountTeamMember should be created with a SalesforceID
    And I wait 60 seconds for MuleSoft processing
    And I retrieve the Internal Contact from Dynamics using AccountTeamMember Party MasterId
    And the Internal Contact should exist in Dynamics with matching Party MasterId
    And the Internal Contact should have parent Party lookup matching Account Dataverse_ID__c
    And each field mapped in "I team member -> Internal_Contact" matches exactly between Salesforce and Dynamics

  # ── AC6 / AC7 (SF-1222): platform CMDT validation via golden record DVMapping_463 ─
  @SF-595 @SF-595-API-011 @p1 @audit @sf-1222 @no-code-change
  Scenario: API - DVMapping_463 Dataverse ID change readable via SOQL without MuleSoft code change (SF-1222 AC6)
    When I query Custom Metadata "Dataverse_Mapping__mdt" record with DeveloperName "DVMapping_463"
    Then Dataverse_Mapping DVMapping_463 should match SF-1222 baseline mapping
    When I deploy SF-1222 test Dataverse_Value__c to DVMapping_463
    Then runtime SOQL for DVMapping_463 should return Dataverse_Value__c "CCY-TEST-000170"
    When I restore SF-1222 baseline Dataverse_Value__c on DVMapping_463
    Then runtime SOQL for DVMapping_463 should return Dataverse_Value__c "CCY-000170"

  @SF-595 @SF-595-API-012 @p1 @audit @sf-1222
  Scenario: API - DVMapping_463 standard metadata audit after CMDT update (SF-1222 AC7)
    When I query Custom Metadata "Dataverse_Mapping__mdt" record with DeveloperName "DVMapping_463"
    When I deploy SF-1222 test Dataverse_Value__c to DVMapping_463
    Then DVMapping_463 metadata audit should reflect the CMDT update in SetupAuditTrail
    When I restore SF-1222 baseline Dataverse_Value__c on DVMapping_463

  @SF-595 @SF-595-API-013 @p2 @completeness
  Scenario: API - every active TeamMemberRole picklist value has at least one Dataverse_Mapping row
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "TeamMemberRole"
    Then every active AccountTeamMember TeamMemberRole picklist value should have at least one Dataverse_Mapping row

  @SF-595 @SF-595-API-014 @p2 @completeness @region
  Scenario: API - every active Region__c picklist value has at least one Dataverse_Mapping row
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "Region_c"
    Then every active AccountTeamMember Region__c picklist value should have at least one Dataverse_Mapping row

  @SF-595 @SF-595-API-015 @p2 @bulk-export
  Scenario: API - Workbench bulk export contains core AccountTeamMember mappings
    Then the Salesforce bulk query Dataverse_Mapping export should contain these expected mapping rows
      | Object__c         | Field__c       | Value__c      | Dataverse_Field__c                          | Dataverse_Value__c |
      | AccountTeamMember | TeamMemberRole | Lead Actuary  | accelins_internal_contact.accelins_contact_title | 100000000          |
      | AccountTeamMember | Region_c       | CA            | accelins_internal_contact.accelins_contact_geography | 100000002          |
