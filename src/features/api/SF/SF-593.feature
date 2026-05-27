# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-593 — Make Dataverse field identifiers available in Salesforce for integration (Account → Party)
# Parent: SF-309
#
# Deliverable: Custom Metadata table `Dataverse_Mapping__mdt` populated with rows that translate
# Salesforce Account field values (e.g. Account_Status__c) into Dataverse Party
# field+value pairs (e.g. accelins_party.statecode / 0). MuleSoft queries SF as the
# integration user to resolve IDs at runtime — no hard-coded mappings in MuleSoft.
#
# Mapping artefact: SharePoint "Picklist Value Mappings.xlsx", tab "Party Integration" (gold / BA).
# Local copy (optional, only required for @party-excel): data/excel/Picklist Value Mappings.xlsx
#   Override path: SF593_PARTY_INTEGRATION_EXCEL
#
# Salesforce actuals (Workbench / qamerge): Dataverse_Mapping__mdt as CSV under data/excel/
#   Preferred file: qamerge-dataversemapping-metadata.csv (metadata export from qamerge). Legacy: bulkQuery_result_*.csv
#   Override: SF593_BULKQUERY_EXPORT_CSV (see .env.qamerge)
#   SF-593-API-012: BA Excel (Party Integration) must be subset of that CSV (field names normalized for __c).
#   SF-593-API-013: validates the CSV alone (row count, non-blank columns, explicit Jira/core mapping rows).
#   Optional: SF593_BULK_EXPORT_MIN_ROWS overrides the minimum row count in API-013.
#
# CMDT shape per Jira: Object__c, Field__c, Value__c, Dataverse_Field__c, Dataverse_Value__c
#
# Reuses:
#   - sf-575 Custom Metadata steps (validator + filtered query + describe Custom Metadata)
#   - api-common steps (the {string} field should exist, describe field definitions)
#   - data-factory ("I have an Account with status <status>")
#   - authentication ("...as MuleSoft integration user", "...with Custom Metadata access")
#
# New steps: sf-593-1081-integration.steps.ts
#   - non-empty mapping fields, audit fields, controlled-failure, new/update Account flows,
#     picklist completeness, Excel parity, combined MuleSoft+CMDT auth.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-593 @account @party-integration @custom-metadata
Feature: API - SF-593 - Account → Party Dataverse mappings (Dataverse_Mapping__mdt)

  Background:
    Given I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access

  # ─────────────────────────────────────────────────────────────────────────────
  # CMDT shape — confirms the Jira-documented schema fields exist.
  # Note: qamerge denies REST describe on Dataverse_Mapping__mdt for QA MRD User and
  # MuleSoft integration user (404), but SOQL FIELDS(ALL) is allowed → we use SOQL to
  # introspect the schema (the returned row exposes the same field keys).
  # ─────────────────────────────────────────────────────────────────────────────
  @SF-593 @SF-593-API-001 @p1 @smoke @cmdt-shape
  Scenario: API - Dataverse_Mapping__mdt exposes the documented mapping fields
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c"
    Then the queried Dataverse_Mapping rows should expose mapping field keys

  # ─────────────────────────────────────────────────────────────────────────────
  # AC1: Salesforce holds Dataverse IDs (so MuleSoft does not hard-code mappings)
  # ─────────────────────────────────────────────────────────────────────────────
  @SF-593 @SF-593-API-002 @p1 @smoke @custom-metadata
  Scenario: API - Account_Status mappings exist in Dataverse_Mapping__mdt
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c"
    Then the query should return at least 1 record
    And the response should contain Custom Metadata records

  # Jira-documented sample (description body): Offboarded → statecode=0, statuscode=376140002
  @SF-593 @SF-593-API-003 @p1 @smoke @mapping-sample
  Scenario: API - Account_Status Offboarded maps to Party statecode and statuscode (Jira sample)
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c"
    Then the queried Dataverse_Mapping records for Account_Status value "Offboarded" should include Dataverse pairs
      | Dataverse_Field__c        | Dataverse_Value__c |
      | accelins_party.statecode  | 0                  |
      | accelins_party.statuscode | 376140002          |

  # AC1 — query as the MuleSoft integration identity (Jira "I have API access to query Salesforce as the MuleSoft integration user")
  # @wip-qamerge: in qamerge the MuleSoft integration user receives INVALID_TYPE on SOQL against
  # Dataverse_Mapping__mdt — needs a Permission Set granting read access to that CMDT object.
  # See Jira comment on SF-1081 (Naveen, 10/May): "Once external client app is setup ... we can validate".
  @SF-593 @SF-593-API-004 @p1 @mulesoft-can-query @wip-qamerge
  Scenario: API - MuleSoft integration user can query Dataverse_Mapping__mdt
    Given I have a valid Salesforce API token as MuleSoft integration user with Custom Metadata access
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c"
    Then the query should return at least 1 record

  # ─────────────────────────────────────────────────────────────────────────────
  # AC2: Only current/valid Dataverse IDs are returned (no rows with blank pieces)
  # ─────────────────────────────────────────────────────────────────────────────
  @SF-593 @SF-593-API-005 @p1 @valid-only
  Scenario: API - all returned mapping rows have non-empty mapping fields
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c"
    Then every Dataverse_Mapping row should have non-empty Object__c, Field__c, Value__c, Dataverse_Field__c, Dataverse_Value__c

  # ─────────────────────────────────────────────────────────────────────────────
  # AC3: Retrieve Dataverse IDs for a new Account being sent to Dataverse
  # ─────────────────────────────────────────────────────────────────────────────
  @SF-593 @SF-593-API-006 @p1 @new-account-flow
  Scenario: API - new Account with Account_Status "Active" resolves Dataverse IDs from CMDT
    Given I have an Account with status "Active"
    When I resolve Dataverse IDs for the created Account's Account_Status__c via CMDT
    Then the resolved Dataverse IDs should include
      | Dataverse_Field__c        |
      | accelins_party.statecode  |
      | accelins_party.statuscode |

  # ─────────────────────────────────────────────────────────────────────────────
  # AC4: Retrieve Dataverse IDs for an Account update being sent to Dataverse.
  # On qamerge, direct REST update is blocked by governance; automation treats that as
  # expected and still resolves CMDT for the target status (Onboarding).
  # ─────────────────────────────────────────────────────────────────────────────
  @SF-593 @SF-593-API-007 @p1 @account-update-flow
  Scenario: API - Account_Status update Active → Onboarding resolves Dataverse IDs from CMDT
    Given I have an Account with status "Active"
    When I update the created Account's Account_Status__c to "Onboarding"
    And I resolve Dataverse IDs for the created Account's Account_Status__c via CMDT
    Then the resolved Dataverse IDs should include
      | Dataverse_Field__c        |
      | accelins_party.statecode  |
      | accelins_party.statuscode |

  # ─────────────────────────────────────────────────────────────────────────────
  # AC5: Controlled failure when Salesforce does not hold a Dataverse ID
  # ─────────────────────────────────────────────────────────────────────────────
  @SF-593 @SF-593-API-008 @p1 @controlled-failure
  Scenario: API - query for an unmapped Account_Status value returns no records
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c"
    Then the Dataverse_Mapping query for Account_Status value "__UnmappedSentinelForControlledFailure__" should return no records

  # ─────────────────────────────────────────────────────────────────────────────
  # AC6: Changes to Dataverse IDs reflected in SF without MuleSoft code changes
  #      (Read-after-deploy: returned Dataverse_Value__c is the currently-deployed CMDT value.)
  # ─────────────────────────────────────────────────────────────────────────────
  @SF-593 @SF-593-API-009 @p1 @no-code-change
  Scenario: API - Dataverse_Value__c for Offboarded is the currently-deployed CMDT value (read-after-deploy)
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c"
    Then the queried Dataverse_Mapping records for Account_Status value "Offboarded" should include Dataverse pairs
      | Dataverse_Field__c        | Dataverse_Value__c |
      | accelins_party.statuscode | 376140002          |

  # ── AC7 + AC6 (SF-1222): DVMapping_463 — SOQL read-after-deploy + Setup audit trail ─
  @SF-593 @SF-593-API-010 @p1 @audit @sf-1222
  Scenario: API - DVMapping_463 CMDT change readable via SOQL and auditable in Setup (SF-1222)
    When I query Custom Metadata "Dataverse_Mapping__mdt" record with DeveloperName "DVMapping_463"
    Then Dataverse_Mapping DVMapping_463 should match SF-1222 baseline mapping
    When I deploy SF-1222 test Dataverse_Value__c to DVMapping_463
    Then runtime SOQL for DVMapping_463 should return Dataverse_Value__c "CCY-TEST-000170"
    Then DVMapping_463 metadata audit should reflect the CMDT update in SetupAuditTrail
    When I restore SF-1222 baseline Dataverse_Value__c on DVMapping_463
    Then runtime SOQL for DVMapping_463 should return Dataverse_Value__c "CCY-000170"

  # ─────────────────────────────────────────────────────────────────────────────
  # Completeness — integration-mapped Account_Status__c values have CMDT rows ("New" excluded).
  # ─────────────────────────────────────────────────────────────────────────────
  @SF-593 @SF-593-API-011 @p2 @completeness
  Scenario: API - every active Account_Status__c picklist value has at least one Dataverse_Mapping row
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Account_Status__c"
    Then every active Account_Status__c picklist value should have at least one Dataverse_Mapping row

  # ─────────────────────────────────────────────────────────────────────────────
  # Gold (BA) vs actual (Salesforce bulk export of Dataverse_Mapping__mdt)
  # Requires: Picklist Value Mappings.xlsx (Party Integration) + qamerge/metadata CSV under data/excel/
  #   Override bulk path: SF593_BULKQUERY_EXPORT_CSV (default: qamerge-dataversemapping-metadata.csv via .env.qamerge)
  # No live CMDT SOQL — validates offline that every BA mapping row exists in the export (~667 rows).
  # ─────────────────────────────────────────────────────────────────────────────
  @SF-593 @SF-593-API-012 @p2 @party-excel @picklist-parity
  Scenario: API - Party Integration gold mappings exist in Salesforce Dataverse_Mapping bulk export
    Then every Party Integration gold mapping row from Picklist Value Mappings Excel should exist in the Salesforce bulk query Dataverse_Mapping export

  # Workbench export is the qamerge "actual" — no BA Excel required. Extend the table when Jira adds new canonical samples.
  @SF-593 @SF-593-API-013 @p2 @party-bulk-export
  Scenario: API - Workbench bulk export validates shape and core Party mappings
    Then the Salesforce bulk query Dataverse_Mapping export should have at least 200 data rows
    And every row in the Salesforce bulk query Dataverse_Mapping export should have populated mapping columns
    And the Salesforce bulk query Dataverse_Mapping export should contain these expected mapping rows
      | Object__c | Field__c           | Value__c   | Dataverse_Field__c           | Dataverse_Value__c |
      | account   | Account_Status__c  | Offboarded | accelins_party.statecode     | 0                  |
      | account   | Account_Status__c  | Offboarded | accelins_party.statuscode    | 376140002          |
      | account   | Account_Status__c  | Active     | accelins_party.statecode     | 0                  |
      | account   | Account_Status__c  | Active     | accelins_party.statuscode    | 1                  |
      | account   | Account_Status__c  | Prospect   | accelins_party.statuscode    | 376140003          |
      | account   | Data_Source_Written__c | VIPR   | accelins_party.accelins_datasource | 376140001    |
