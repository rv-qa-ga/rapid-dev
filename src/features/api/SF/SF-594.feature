# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-594 — Dataverse field identifiers in Salesforce — Contact → Contact
# Scope: API / integration (CMDT + MuleSoft resolve + governance). No UI scenarios.
# Parent / pattern: SF-427 / SF-593 / SF-1159 (Dataverse_Mapping__mdt).
#
# Mapping artefact: Picklist Value Mappings.xlsx — Integration External Contact tab.
# CMDT: Object__c = contact, Field__c = Status_c (maps SF Contact_Status__c).
#
# Reuses: sf-575, sf-593-1081-integration, mulesoft-integration (E2E).
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-594 @contact @party-integration @custom-metadata @integration
Feature: API - SF-594 - Contact → Contact Dataverse mappings (integration)

  Background:
    Given I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access

  # ── AC1: CMDT shape and mappings exist ─────────────────────────────────────
  @SF-594 @SF-594-API-001 @p1 @smoke @cmdt-shape
  Scenario: API - Dataverse_Mapping__mdt rows for contact.Status_c expose mapping field keys
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "contact" and Field "Status_c"
    Then the queried Dataverse_Mapping rows should expose mapping field keys

  @SF-594 @SF-594-API-002 @p1 @smoke @custom-metadata
  Scenario: API - Contact Status_c mappings exist in Dataverse_Mapping__mdt
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "contact" and Field "Status_c"
    Then the query should return at least 1 record
    And the response should contain Custom Metadata records

  @SF-594 @SF-594-API-003 @p1 @mapping-sample
  Scenario: API - Contact Status Active maps to contact statecode and statuscode (CMDT rows)
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "contact" and Field "Status_c"
    Then the queried Dataverse_Mapping records for picklist value "Active" should include Dataverse pairs
      | Dataverse_Field__c | Dataverse_Value__c |
      | contact.statecode  | 0                  |
      | contact.statuscode | 1                  |

  # ── AC2: Only valid / non-empty mapping rows ───────────────────────────────
  @SF-594 @SF-594-API-004 @p1 @valid-only
  Scenario: API - all returned Contact Status_c mapping rows have non-empty mapping fields
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "contact" and Field "Status_c"
    Then every Dataverse_Mapping row should have non-empty Object__c, Field__c, Value__c, Dataverse_Field__c, Dataverse_Value__c

  @SF-594 @SF-594-API-005 @p1 @mapping-sample
  Scenario: API - Contact Status Active maps to Dataverse contact.statuscode (single-field sample)
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "contact" and Field "Status_c" and Value "Active"
    Then the query should return at least 1 record
    And the queried Dataverse_Mapping records for picklist value "Active" should include Dataverse field "contact.statuscode" with any non-empty Dataverse_Value__c

  # ── AC3: MuleSoft can resolve IDs at runtime for a new Contact ─────────────
  @SF-594 @SF-594-API-006 @p1 @new-contact-flow
  Scenario: API - new Contact with Contact_Status Active resolves Dataverse IDs from CMDT
    Given I have an Account with status "Active"
    And I have captured the Account SalesforceID and Dataverse_ID__c
    When I create an External Contact in Salesforce with:
      | FirstName | SF594 |
      | LastName | CMDT Resolve Test |
      | Email | sf594.resolve.cmdt@test.com |
      | Contact_Status__c | Active |
      | AccountId | <parentAccountId> |
    And I resolve Dataverse IDs for the created Contact's Contact_Status__c via CMDT
    Then the resolved Dataverse IDs should include a field whose name contains "statuscode"
    And the resolved Dataverse IDs should include a field whose name contains "statecode"

  # ── AC5: Controlled failure when no mapping exists ───────────────────────
  @SF-594 @SF-594-API-007 @p1 @controlled-failure
  Scenario: API - query for an unmapped Contact Status value returns no records
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "contact" and Field "Status_c"
    Then the Dataverse_Mapping query for picklist value "__UnmappedContactStatus594__" should return no records

  # ── AC6: Read-after-deploy — deployed CMDT value for Inactive ──────────────
  @SF-594 @SF-594-API-008 @p1 @no-code-change
  Scenario: API - Dataverse_Value__c for Contact Status Inactive is the currently-deployed CMDT value
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "contact" and Field "Status_c"
    Then the queried Dataverse_Mapping records for picklist value "Inactive" should include Dataverse pairs
      | Dataverse_Field__c | Dataverse_Value__c |
      | contact.statuscode | 2                  |

  # ── MuleSoft integration user CMDT read ────────────────────────────────────
  @SF-594 @SF-594-API-009 @p1 @mulesoft-can-query
  Scenario: API - MuleSoft integration user can query Contact Status_c mappings in Dataverse_Mapping__mdt
    Given I have a valid Salesforce API token as MuleSoft integration user with Custom Metadata access
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "contact" and Field "Status_c"
    Then the query should return at least 1 record

  # ── E2E sync (separate bug SF-1220 on qamerge → D365) ────────────────────
  @SF-594 @SF-594-API-010 @p1 @integration @e2e @sf_to_d365 @external_contact @rdm-qatest2
  Scenario: E2E - External Contact synced from Salesforce is queryable in Dataverse contacts (RDM)
    Given I have valid API access to both Dynamics CRM and Salesforce
    Given I have a parent Account in Salesforce with Status "Active" and Dataverse_ID__c populated
    And I have captured the Account SalesforceID and Dataverse_ID__c
    When I create an External Contact in Salesforce with:
      | FirstName | SF594 |
      | LastName | E2E External Contact |
      | Email | sf594.e2e.external@test.com |
      | Phone | 555-594-0010 |
      | Contact_Status__c | Active |
      | AccountId | <parentAccountId> |
    Then the Contact should be created with a SalesforceID
    And I wait 60 seconds for MuleSoft processing
    And I retrieve the Contact from Dynamics using Party MasterId
    And the Contact should exist in Dynamics with matching Party MasterId
    And each field mapped in "I Contacts -> External Contacts" matches exactly between Salesforce and Dynamics

  # ── AC6 / AC7 (SF-1222): platform CMDT validation via golden record DVMapping_463 ─
  @SF-594 @SF-594-API-011 @p1 @audit @sf-1222 @no-code-change
  Scenario: API - DVMapping_463 Dataverse ID change readable via SOQL without MuleSoft code change (SF-1222 AC6)
    When I query Custom Metadata "Dataverse_Mapping__mdt" record with DeveloperName "DVMapping_463"
    Then Dataverse_Mapping DVMapping_463 should match SF-1222 baseline mapping
    When I deploy SF-1222 test Dataverse_Value__c to DVMapping_463
    Then runtime SOQL for DVMapping_463 should return Dataverse_Value__c "CCY-TEST-000170"
    When I restore SF-1222 baseline Dataverse_Value__c on DVMapping_463
    Then runtime SOQL for DVMapping_463 should return Dataverse_Value__c "CCY-000170"

  @SF-594 @SF-594-API-012 @p1 @audit @sf-1222
  Scenario: API - DVMapping_463 standard metadata audit after CMDT update (SF-1222 AC7)
    When I query Custom Metadata "Dataverse_Mapping__mdt" record with DeveloperName "DVMapping_463"
    When I deploy SF-1222 test Dataverse_Value__c to DVMapping_463
    Then DVMapping_463 metadata audit should reflect the CMDT update in SetupAuditTrail
    When I restore SF-1222 baseline Dataverse_Value__c on DVMapping_463

  # ── Completeness: every active picklist value has CMDT coverage ──────────────
  @SF-594 @SF-594-API-013 @p2 @completeness
  Scenario: API - every active Contact_Status__c picklist value has at least one Dataverse_Mapping row
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "contact" and Field "Status_c"
    Then every active Contact_Status__c picklist value should have at least one Dataverse_Mapping row

  # ── Bulk export parity (qamerge metadata CSV) ──────────────────────────────
  @SF-594 @SF-594-API-014 @p2 @bulk-export
  Scenario: API - Workbench bulk export contains core Contact Status_c mappings
    Then the Salesforce bulk query Dataverse_Mapping export should contain these expected mapping rows
      | Object__c | Field__c  | Value__c | Dataverse_Field__c | Dataverse_Value__c |
      | contact   | Status_c  | Active   | contact.statuscode | 1                  |
      | contact   | Status_c  | Active   | contact.statecode  | 0                  |
      | contact   | Status_c  | Inactive | contact.statuscode | 2                  |
      | contact   | Status_c  | Inactive | contact.statecode  | 1                  |
