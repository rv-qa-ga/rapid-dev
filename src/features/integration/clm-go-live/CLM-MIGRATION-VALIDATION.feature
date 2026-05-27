# ══════════════════════════════════════════════════════════════════════════════
# CLM Go-Live — Migration validation (single feature)
# JIRA: SF-1235 — Migration & integration regression (umbrella)
# Dynamics preprod (SOURCE) → Salesforce INT (TARGET)
#
# Plan: docs/clm/CLM_GO_LIVE_MIGRATION_INTEGRATION_TEST_PLAN.md
# Env: ENV=int (.env.int) — Dynamics accelinspreprod, SF arx--int
#
# Zephyr: npm run zephyr:UploadAndLink:SF1235
# ══════════════════════════════════════════════════════════════════════════════

@clm-go-live @migration @migration-readonly @migration-intg-regression @SF-1235 @validation @integration @int
Feature: CLM Migration Validation — Dynamics preprod to Salesforce INT
  As a QA engineer validating CLM go-live data migration
  I want every in-scope Dynamics record verified in Salesforce across all mapped fields
  So that integration and lifecycle testing builds on complete and accurate migrated data

  Background:
    Given migration validation is in read-only mode with no record creation
    And I have valid API access to both Dynamics CRM and Salesforce for CLM migration

  @CLM-MIG-000 @SF-1235 @SF-1235-MIG-001 @migration-intg-regression @int-migration-ready @smoke @p0
  Scenario: Migration gate — Dynamics WhoAmI and Salesforce API on INT
    Given I have a valid Dynamics 365 API token
    When I call the Dynamics WhoAmI endpoint
    Then the response status should be 200
    And the response should contain a valid UserId (GUID)

  @CLM-MIG-COUNTS @SF-1235 @SF-1235-MIG-002 @migration-intg-regression @p0 @smoke
  Scenario: Migration record counts — Dynamics SOURCE vs Salesforce TARGET per entity
    When I collect migration record counts for all CLM migration entities
    Then Dynamics and Salesforce record counts should match for each CLM migration entity
    And a CLM migration record count Excel report should be generated

  @CLM-MIG-PARTY @SF-1235 @SF-736 @SF-1235-MIG-003 @migration-intg-regression @int-migration-ready @p0 @entity_account @entity_party
  Scenario: Account Party — full migration validation with Excel SOURCE vs TARGET report
    Given CLM migration entity "party" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "party"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "party"
    And all mapped fields should match for CLM migration entity "party" or be reported in the migration Excel report
    And Salesforce audit fields should match Dynamics for CLM migration entity "party"
    And a CLM migration Excel report should be generated for entity "party"

  @CLM-MIG-PARTY-SMOKE @SF-1235 @SF-736 @SF-1235-MIG-004 @migration-intg-regression @int-migration-ready @smoke @p1
  Scenario: Account Party — smoke validation (limited record count)
    Given CLM migration entity "party" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "party"
    Then a CLM migration Excel report should be generated for entity "party"

  @CLM-MIG-ENTITY @SF-1235 @SF-738 @SF-1235-MIG-005 @migration-intg-regression @int-migration-ready @p0 @entity_contact-external
  Scenario: Migration validation — SF-738 External Contact
    Given CLM migration entity "contact-external" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "contact-external"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "contact-external"
    And all mapped fields should match for CLM migration entity "contact-external" or be reported in the migration Excel report
    And Salesforce audit fields should match Dynamics for CLM migration entity "contact-external"
    And a CLM migration Excel report should be generated for entity "contact-external"

  @CLM-MIG-ENTITY @SF-1235 @SF-737 @SF-1235-MIG-006 @migration-intg-regression @int-migration-ready @p0 @entity_contact-internal
  Scenario: Migration validation — SF-737 Internal Contact
    Given CLM migration entity "contact-internal" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "contact-internal"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "contact-internal"
    And all mapped fields should match for CLM migration entity "contact-internal" or be reported in the migration Excel report
    And Salesforce audit fields should match Dynamics for CLM migration entity "contact-internal"
    And a CLM migration Excel report should be generated for entity "contact-internal"

  @CLM-MIG-ENTITY @SF-1235 @SF-769 @SF-1235-MIG-007 @migration-intg-regression @int-migration-ready @p0 @entity_member-map
  Scenario: Migration validation — SF-769 Member Legal Entity Relationship
    Given CLM migration entity "member-map" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "member-map"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "member-map"
    And all mapped fields should match for CLM migration entity "member-map" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "member-map"

  @CLM-MIG-ENTITY @SF-1235 @SF-775 @SF-1235-MIG-008 @migration-intg-regression @int-migration-ready @p0 @entity_tpa-map
  Scenario: Migration validation — SF-775 TPA Map
    Given CLM migration entity "tpa-map" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "tpa-map"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "tpa-map"
    And all mapped fields should match for CLM migration entity "tpa-map" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "tpa-map"

  @CLM-MIG-ENTITY @SF-1235 @SF-739 @SF-1235-MIG-009 @migration-intg-regression @int-migration-ready @p0 @entity_country
  Scenario: Migration validation — SF-739 Country
    Given CLM migration entity "country" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "country"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "country"
    And all mapped fields should match for CLM migration entity "country" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "country"

  @CLM-MIG-ENTITY @SF-1235 @SF-767 @SF-1235-MIG-010 @migration-intg-regression @int-migration-ready @p0 @entity_product-map
  Scenario: Migration validation — SF-767 Product Map
    Given CLM migration entity "product-map" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "product-map"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "product-map"
    And all mapped fields should match for CLM migration entity "product-map" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "product-map"

  @CLM-MIG-ENTITY @SF-1235 @SF-766 @SF-1235-MIG-011 @migration-intg-regression @int-migration-ready @p0 @entity_sub-product
  Scenario: Migration validation — SF-766 Sub Product
    Given CLM migration entity "sub-product" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "sub-product"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "sub-product"
    And all mapped fields should match for CLM migration entity "sub-product" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "sub-product"

  @CLM-MIG-ENTITY @SF-1235 @SF-780 @SF-1235-MIG-012 @migration-intg-regression @int-migration-ready @p0 @entity_aslob
  Scenario: Migration validation — SF-780 ASLOB
    Given CLM migration entity "aslob" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "aslob"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "aslob"
    And all mapped fields should match for CLM migration entity "aslob" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "aslob"

  @CLM-MIG-ENTITY @SF-1235 @SF-798 @SF-1235-MIG-013 @migration-intg-regression @int-migration-ready @p0 @entity_osfi
  Scenario: Migration validation — SF-798 OSFI
    Given CLM migration entity "osfi" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "osfi"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "osfi"
    And all mapped fields should match for CLM migration entity "osfi" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "osfi"

  @CLM-MIG-ENTITY @SF-1235 @SF-781 @SF-1235-MIG-014 @migration-intg-regression @int-migration-ready @p0 @entity_class-of-business
  Scenario: Migration validation — SF-781 Class of Business
    Given CLM migration entity "class-of-business" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "class-of-business"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "class-of-business"
    And all mapped fields should match for CLM migration entity "class-of-business" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "class-of-business"

  @CLM-MIG-ENTITY @SF-1235 @SF-782 @SF-1235-MIG-015 @migration-intg-regression @int-migration-ready @p0 @entity_line-of-business
  Scenario: Migration validation — SF-782 Line of Business
    Given CLM migration entity "line-of-business" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "line-of-business"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "line-of-business"
    And all mapped fields should match for CLM migration entity "line-of-business" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "line-of-business"

  @CLM-MIG-ENTITY @SF-1235 @SF-783 @SF-1235-MIG-016 @migration-intg-regression @int-migration-ready @p0 @entity_begaap-cob
  Scenario: Migration validation — SF-783 BEGAAP COB
    Given CLM migration entity "begaap-cob" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "begaap-cob"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "begaap-cob"
    And all mapped fields should match for CLM migration entity "begaap-cob" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "begaap-cob"

  @CLM-MIG-ENTITY @SF-1235 @SF-784 @SF-1235-MIG-017 @migration-intg-regression @int-migration-ready @p0 @entity_solvency-ii
  Scenario: Migration validation — SF-784 Solvency II
    Given CLM migration entity "solvency-ii" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "solvency-ii"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "solvency-ii"
    And all mapped fields should match for CLM migration entity "solvency-ii" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "solvency-ii"

  @CLM-MIG-ENTITY @SF-1235 @SF-779 @SF-1235-MIG-018 @migration-intg-regression @int-migration-ready @p0 @entity_member-product-program
  Scenario: Migration validation — SF-779 Member Product Program
    Given CLM migration entity "member-product-program" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "member-product-program"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "member-product-program"
    And all mapped fields should match for CLM migration entity "member-product-program" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "member-product-program"

  @CLM-MIG-ENTITY @SF-1235 @SF-872 @SF-1235-MIG-019 @migration-intg-regression @int-migration-ready @p0 @entity_pog-product
  Scenario: Migration validation — SF-872 POG Product
    Given CLM migration entity "pog-product" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "pog-product"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "pog-product"
    And all mapped fields should match for CLM migration entity "pog-product" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "pog-product"

  @CLM-MIG-ENTITY @SF-1235 @SF-785 @SF-1235-MIG-020 @migration-intg-regression @int-migration-ready @p0 @entity_product
  Scenario: Migration validation — SF-785 Product (Insurance)
    Given CLM migration entity "product" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "product"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "product"
    And all mapped fields should match for CLM migration entity "product" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "product"

  @CLM-MIG-ENTITY @SF-1235 @SF-786 @SF-1235-MIG-021 @migration-intg-regression @int-migration-ready @p1 @entity_currency
  Scenario: Migration validation — SF-786 Currency (ISO codes + metadata)
    Given CLM migration entity "currency" field mappings are loaded from the migration mapping document
    When I run full CLM migration validation for entity "currency"
    Then every Dynamics record should exist in Salesforce for CLM migration entity "currency"
    And all mapped fields should match for CLM migration entity "currency" or be reported in the migration Excel report
    And a CLM migration Excel report should be generated for entity "currency"
