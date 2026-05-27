# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1039 — Updates to existing Integration build
# Parent: SF-765 | Salesforce ↔ Dynamics (RDM) Objects Integration
#
# Scope (Contact + AccountTeamMember only — per SF-1039):
#   1. Remove Geography__c mapping from AccountTeamMember → Internal Contact (Region_c unchanged).
#   2. Party parent lookups use Account PTY_Code__c as alternate key (NOT Dataverse_ID__c):
#        - PTY_Code__c — auto-generated in Salesforce; used for @odata.bind Party lookup.
#        - Dataverse_ID__c — GUID returned from Dynamics after sync; separate identifier.
#        - AccountTeamMember → Internal Contacts | Contact → Contact
#   3. Updates keyed by stable Master IDs (Internal_Contact_Master_ID__c for ATM).
#
# Design reference: Integration Design Document — Contact and Account Relationship Mapping;
#   Internal Contact and Account Team Member Relationship Mapping (PTY_Code__c alternate key,
#   bind format: "accelins_fieldname@odata.bind": "/accelins_tablename(accelins_fieldname='')").
#
# Environment: qamerge (Salesforce) → qatest2 RDM (Dynamics) — same as SF-594 / SF-595 E2E.
# E2E sync scenarios tagged @blocked-sf-1220 (known integration bug; CMDT/mapping path is green).
# SF-594 / SF-595 E2E assertions for Dataverse_ID__c parent lookup are unchanged (separate concern).
#
# Reuses: sf-575 CMDT query, sf-593-1081-integration, mulesoft-integration (E2E / PTY Code / master ID).
# Steps: src/step-definitions/api/salesforce/sf-1039-integration.steps.ts
#        src/step-definitions/integration/mulesoft-integration.steps.ts (PTY Code + master ID E2E)
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-1039 @party-integration @integration @mulesoft
Feature: API - SF-1039 - Integration build updates (PTY Code lookups + Master ID updates)

  Background:
    Given I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access

  # ── AC1: Geography__c mapping removed from AccountTeamMember → Internal Contact ─
  @SF-1039 @SF-1039-API-001 @p1 @cmdt @geography-removed @smoke
  Scenario: API - AccountTeamMember Geography__c is not mapped in Dataverse_Mapping__mdt
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "AccountTeamMember" and Field "Geography_c"
    Then the Custom Metadata query should return no records

  # ── AC2: Parent Account exposes PTY_Code__c (SF) distinct from Dataverse_ID__c (D365) ─
  @SF-1039 @SF-1039-API-002 @p1 @pty-code @smoke
  Scenario: API - integration parent Account has PTY_Code__c populated
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and PTY_Code__c
    Then the Account should have PTY_Code__c auto-generated
    And PTY_Code__c and Dataverse_ID__c on the Account should be different identifiers

  # ── AC3: External Contact E2E — parent Party resolved via PTY_Code__c ───────────
  @SF-1039 @SF-1039-API-003 @p1 @integration @e2e @sf_to_d365 @external_contact @rdm-qatest2 @blocked-sf-1220
  Scenario: E2E - External Contact parent Party in Dataverse links via Account PTY_Code__c
    Given I have valid API access to both Dynamics CRM and Salesforce
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and PTY_Code__c
    When I create an External Contact in Salesforce with:
      | FirstName | SF1039 |
      | LastName | E2E External PTY Lookup |
      | Email | sf1039.e2e.external.pty@test.com |
      | Phone | 555-1039-0003 |
      | Contact_Status__c | Active |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 60 seconds for MuleSoft processing
    When I retrieve the Contact from Dynamics using Account PTY_Code__c
    And the Contact should exist in Dynamics with matching Party MasterId
    And the Contact should have parent Party linked by Account PTY_Code__c

  # ── AC4: Internal Contact E2E — parent Party resolved via PTY_Code__c ─────────
  @SF-1039 @SF-1039-API-004 @p1 @integration @e2e @sf_to_d365 @internal_contact @rdm-qatest2 @blocked-sf-1220
  Scenario: E2E - Internal Contact parent Party in Dataverse links via Account PTY_Code__c
    Given I have valid API access to both Dynamics CRM and Salesforce
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and PTY_Code__c
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    When I add an AccountTeamMember to the Account via API with:
      | UserId | <userId> |
      | TeamMemberRole | Lead Actuary |
    Then the AccountTeamMember should be created with a SalesforceID
    And I wait 60 seconds for MuleSoft processing
    When I retrieve the Internal Contact from Dynamics using Account PTY_Code__c
    And the Internal Contact should exist in Dynamics with matching Party MasterId
    And the Internal Contact should have parent Party linked by Account PTY_Code__c

  # ── AC5: Internal Contact update keyed by master ID (no duplicate) ───────────
  @SF-1039 @SF-1039-API-005 @p1 @integration @e2e @update @master-id @internal_contact @rdm-qatest2 @blocked-sf-1220
  Scenario: E2E - AccountTeamMember update upserts Internal Contact by master ID not duplicate
    Given I have valid API access to both Dynamics CRM and Salesforce
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and PTY_Code__c
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    When I add an AccountTeamMember to the Account via API with:
      | UserId | <userId> |
      | TeamMemberRole | Lead Actuary |
    Then the AccountTeamMember should be created with a SalesforceID
    And I wait 60 seconds for MuleSoft processing
    When I retrieve the Internal Contact from Dynamics using Account PTY_Code__c
    And I store the current Dynamics Internal Contact record id for master-id comparison
    When I update the AccountTeamMember in Salesforce via API with:
      | TeamMemberRole | Member Relationship Director |
    And I wait 60 seconds for MuleSoft processing
    When I retrieve the Internal Contact from Dynamics using Internal_Contact_Master_ID__c
    Then the same Dynamics Contact record should be updated not duplicated

  # ── AC6: External Contact update keyed by master ID (no duplicate) ─────────────
  @SF-1039 @SF-1039-API-006 @p1 @integration @e2e @update @master-id @external_contact @rdm-qatest2 @blocked-sf-1220
  Scenario: E2E - External Contact update upserts Dataverse contact by master ID not duplicate
    Given I have valid API access to both Dynamics CRM and Salesforce
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and PTY_Code__c
    When I create an External Contact in Salesforce with:
      | FirstName | SF1039 |
      | LastName | E2E External Master Update |
      | Email | sf1039.e2e.external.update@test.com |
      | Phone | 555-1039-0006 |
      | Contact_Status__c | Active |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 60 seconds for MuleSoft processing
    When I retrieve the Contact from Dynamics using Account PTY_Code__c
    And I store the current Dynamics Contact record id for master-id comparison
    When I update the External Contact in Salesforce via API with:
      | Phone | 555-1039-9999 |
    And I wait 60 seconds for MuleSoft processing
    When I retrieve the Contact from Dynamics using Account PTY_Code__c
    Then the same Dynamics Contact record should be updated not duplicated
    And the Contact phone should be "555-1039-9999" in Dynamics

  # ── AC7: Internal Contact sync succeeds without Geography__c on AccountTeamMember
  @SF-1039 @SF-1039-API-007 @p1 @integration @e2e @internal_contact @no-geography @rdm-qatest2 @blocked-sf-1220
  Scenario: E2E - AccountTeamMember syncs to Internal Contact without Geography__c populated
    Given I have valid API access to both Dynamics CRM and Salesforce
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and PTY_Code__c
    And I have a Salesforce User with Azure_AD_Object_ID__c populated
    When I add an AccountTeamMember to the Account via API with:
      | UserId | <userId> |
      | TeamMemberRole | Member Relationship Director |
    Then the AccountTeamMember should be created with a SalesforceID
    And I wait 60 seconds for MuleSoft processing
    When I retrieve the Internal Contact from Dynamics using Account PTY_Code__c
    And the Internal Contact should exist in Dynamics with matching Party MasterId
    And the Internal Contact should have status "Active"
