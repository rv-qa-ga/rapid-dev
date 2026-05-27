# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-796 — Dataverse field identifiers for Salesforce Product Map → Dataverse Product Map
# Parent: SF-309 | Blocks: SF-767
#
# Deliverable: Dataverse_Mapping__mdt rows for product_map__c (status__c, non_renewable__c)
# deployed as DVMapping_466–475 (qamerge). MuleSoft queries CMDT at runtime — no hard-coded IDs.
#
# Mapping artefact: Picklist Value Mappings.xlsx — Integration Product Maps tab.
# QAMerge actuals: data/excel/qamerge-dataversemapping-metadata.csv
#
# Reuses:
#   - sf-575 Custom Metadata query steps + CustomMetadataValidator
#   - sf-593-1081-integration.steps.ts (pairs, resolve, completeness, MuleSoft CMDT auth)
#   - sf-796.steps.ts (Product_Map__c create/update for AC3/AC4)
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-796 @product-map @product-mapping @custom-metadata @integration
Feature: API - SF-796 - Product Map → Dataverse Product Map Dataverse mappings (Dataverse_Mapping__mdt)

  Background:
    Given I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access

  # ── AC1: Salesforce holds Dataverse IDs (MuleSoft does not hard-code mappings) ──
  @SF-796 @SF-796-API-001 @p1 @smoke @cmdt-shape
  Scenario: API - Dataverse_Mapping__mdt rows for product_map__c.status__c expose mapping field keys
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "status__c"
    Then the queried Dataverse_Mapping rows should expose mapping field keys

  @SF-796 @SF-796-API-002 @p1 @smoke @custom-metadata
  Scenario: API - Product Map status__c mappings exist in Dataverse_Mapping__mdt
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "status__c"
    Then the query should return at least 1 record
    And the response should contain Custom Metadata records

  @SF-796 @SF-796-API-003 @p1 @mapping-sample
  Scenario: API - Product Map Status Active maps to productmapping statuscode and statecode (CMDT rows)
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "status__c"
    Then the queried Dataverse_Mapping records for picklist value "Active" should include Dataverse pairs
      | Dataverse_Field__c                  | Dataverse_Value__c |
      | accelins_productmapping.statuscode  | 1                  |
      | accelins_productmapping.statecode   | 0                  |

  @SF-796 @SF-796-API-004 @p1 @mapping-sample
  Scenario: API - Product Map Status Inactive maps to productmapping statuscode and statecode
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "status__c"
    Then the queried Dataverse_Mapping records for picklist value "Inactive" should include Dataverse pairs
      | Dataverse_Field__c                  | Dataverse_Value__c |
      | accelins_productmapping.statuscode  | 2                  |
      | accelins_productmapping.statecode   | 1                  |

  # ── AC2: Only current/valid Dataverse IDs (non-empty mapping rows) ───────────
  @SF-796 @SF-796-API-005 @p1 @valid-only
  Scenario: API - all returned Product Map status__c mapping rows have non-empty mapping fields
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "status__c"
    Then every Dataverse_Mapping row should have non-empty Object__c, Field__c, Value__c, Dataverse_Field__c, Dataverse_Value__c

  @SF-796 @SF-796-API-006 @p1 @valid-only
  Scenario: API - all returned Product Map non_renewable__c mapping rows have non-empty mapping fields
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "non_renewable__c"
    Then every Dataverse_Mapping row should have non-empty Object__c, Field__c, Value__c, Dataverse_Field__c, Dataverse_Value__c

  # ── AC3: Retrieve Dataverse IDs for a new Product Map sent to Dataverse ─────
  @SF-796 @SF-796-API-007 @p1 @new-product-map-flow
  Scenario: API - Product Map Status Active resolves Dataverse IDs from CMDT (new payload)
    When I resolve Dataverse IDs for Product Map Status "Active" via CMDT
    Then the resolved Dataverse IDs should include
      | Dataverse_Field__c                  |
      | accelins_productmapping.statecode   |
      | accelins_productmapping.statuscode  |

  @SF-796 @SF-796-API-008 @p1 @new-product-map-flow
  Scenario: API - Product Map Non_Renewable true resolves Dataverse ID from CMDT
    When I resolve Dataverse IDs for Product Map Non_Renewable "true" via CMDT
    Then the resolved Dataverse IDs should include a field whose name contains "nonrenewable"

  # ── AC4: Retrieve Dataverse IDs for a Product Map update ────────────────────
  @SF-796 @SF-796-API-009 @p1 @update-product-map-flow
  Scenario: API - Product Map Status after update resolves Dataverse IDs from CMDT
    When I resolve Dataverse IDs for Product Map Status "Draft" via CMDT
    And I resolve Dataverse IDs for Product Map Status "Active" via CMDT
    Then the resolved Dataverse IDs should include
      | Dataverse_Field__c                  |
      | accelins_productmapping.statecode   |
      | accelins_productmapping.statuscode  |

  # ── Controlled failure / MuleSoft identity ───────────────────────────────────
  @SF-796 @SF-796-API-010 @p1 @controlled-failure
  Scenario: API - query for an unmapped Product Map Status value returns no records
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "status__c"
    Then the Dataverse_Mapping query for picklist value "__UnmappedProductMapStatus796__" should return no records

  @SF-796 @SF-796-API-011 @p1 @mulesoft-can-query
  Scenario: API - MuleSoft integration user can query Product Map status__c mappings in Dataverse_Mapping__mdt
    Given I have a valid Salesforce API token as MuleSoft integration user with Custom Metadata access
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "status__c"
    Then the query should return at least 1 record

  # ── non_renewable__c CMDT slice ─────────────────────────────────────────────
  @SF-796 @SF-796-API-012 @p1 @mapping-sample
  Scenario: API - Product Map Non_Renewable false maps to accelins_nonrenewable 0
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "non_renewable__c" and Value "FALSE"
    Then the query should return at least 1 record
    And the queried Dataverse_Mapping records for picklist value "FALSE" should include Dataverse field "accelins_productmapping.accelins_nonrenewable" with any non-empty Dataverse_Value__c

  @SF-796 @SF-796-API-013 @p1 @mapping-sample
  Scenario: API - Product Map Non_Renewable true maps to accelins_nonrenewable 1
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "non_renewable__c"
    Then the queried Dataverse_Mapping records for picklist value "TRUE" should include Dataverse pairs
      | Dataverse_Field__c                               | Dataverse_Value__c |
      | accelins_productmapping.accelins_nonrenewable    | 1                  |

  # ── Completeness ────────────────────────────────────────────────────────────
  @SF-796 @SF-796-API-014 @p2 @completeness
  Scenario: API - every active Product_Map Status__c picklist value has at least one Dataverse_Mapping row
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "status__c"
    Then every active Product_Map Status__c picklist value should have at least one Dataverse_Mapping row

  @SF-796 @SF-796-API-015 @p2 @completeness
  Scenario: API - Product Map non_renewable__c CMDT covers FALSE and TRUE values
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "product_map__c" and Field "non_renewable__c"
    Then the query should return at least 2 record
    And the queried Dataverse_Mapping records for picklist value "FALSE" should include Dataverse field "accelins_productmapping.accelins_nonrenewable" with any non-empty Dataverse_Value__c
    And the queried Dataverse_Mapping records for picklist value "TRUE" should include Dataverse field "accelins_productmapping.accelins_nonrenewable" with any non-empty Dataverse_Value__c

  # ── Bulk export parity (qamerge metadata CSV) ───────────────────────────────
  @SF-796 @SF-796-API-016 @p2 @bulk-export
  Scenario: API - Workbench bulk export contains core Product Map status__c mappings
    Then the Salesforce bulk query Dataverse_Mapping export should contain these expected mapping rows
      | Object__c       | Field__c     | Value__c | Dataverse_Field__c                 | Dataverse_Value__c |
      | product_map__c  | status__c    | Active   | accelins_productmapping.statuscode | 1                  |
      | product_map__c  | status__c    | Active   | accelins_productmapping.statecode  | 0                  |
      | product_map__c  | status__c    | Inactive | accelins_productmapping.statuscode | 2                  |
      | product_map__c  | status__c    | Inactive | accelins_productmapping.statecode  | 1                  |
