# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-721 - Initial Load of Countries into dev sandbox with UNSD Region and Distribution Region
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: data-import, picklist-validation, field-mapping
# Generated: 2026-02-18 (FeatureGenerator v3.1) | Mode 4 RBT
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT)
# Primary Entity: Country__c
# Data loaded via: Workbench (CSV import)
# Source: CountryDataImport_Second.csv (enriched with UNSD Region/Sub-region)
# Related Stories: SF-561 (picklist values), SF-606 (Country platform events)
#
# Salesforce Country__c Fields (from import CSV):
#   Name, Alpha2_Code__c, Alpha3_Code__c, Accelins_CurrencyCode__c,
#   Country_Master_ID__c, ISO_Number__c, Status__c, Dataverse_ID__c,
#   Business_Area_Name__c (picklist), Distribution_Region_Name__c (picklist),
#   UNSD_Region__c (picklist), UNSD_Sub_region__c (picklist)
#
# Key Risks Targeted:
#   1. Record count mismatch (data lost/duplicated during import)
#   2. Field mapping incorrect (data loaded into wrong columns)
#   3. Picklist values rejected or mismatched — especially known
#      "Caribean" typo in source extract (must be corrected to "Caribbean")
#   4. Country_Master_ID__c missing (required key field)
#
# Evidence Script:
#   npx ts-node scripts/verify-sf721-country-import.ts
#   → Compares ALL 252 CSV rows × 12 fields against Salesforce Country__c
#   → Generates detailed Excel evidence: data/reports/SF-721-Country-Import-Evidence-*.xlsx
#     Tabs: Summary | All Records - Detail | Mismatches Only | Record Summary
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-721 @medium @data-import @country @rbt
Feature: SF-721 - Initial Load of Countries into Salesforce with UNSD Region and Distribution Region
  As a Salesforce Administrator / Developer
  I want to import the approved Country reference data into the Custom Country object
  So that Salesforce contains a complete and consistent country dataset, including UNSD Region and UNSD Sub-region classifications, for auto-population of region fields on the Lead and Account object

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # RBT 1: Record count — all 252 CSV rows loaded
  # ══════════════════════════════════════════════════════════════════════════

  @SF-721 @SF-721-UI-001 @p1 @smoke @record-count
  Scenario: All 252 Country records from the approved CSV are loaded
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Country__c object list
    Then the total number of Country__c records should be 252
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # RBT 2: Spot-check field mapping across representative regions
  # One country per distinct Business Area to maximise coverage
  # ══════════════════════════════════════════════════════════════════════════

  @SF-721 @SF-721-UI-002 @p1 @field-mapping @spot-check
  Scenario Outline: Country "<country>" has correct field values after import
    Given I am logged in as a "Accelerant - System administrator" user
    When I search for Country__c record with Name "<country>"
    And I open the Country__c record
    Then the "Alpha2_Code__c" field should display "<alpha2>"
    And the "Alpha3_Code__c" field should display "<alpha3>"
    And the "Country_Master_ID__c" field should display "<masterID>"
    And the "Accelins_CurrencyCode__c" field should display "<currency>"
    And the "Business_Area_Name__c" field should display "<businessArea>"
    And the "Distribution_Region_Name__c" field should display "<distRegion>"
    And the "UNSD_Region__c" field should display "<unsdRegion>"
    And the "UNSD_Sub_region__c" field should display "<unsdSubRegion>"
    And the "Status__c" field should display "Active"
    And I take a screenshot as evidence

    Examples:
      | country                      | alpha2 | alpha3 | masterID    | currency | businessArea   | distRegion | unsdRegion | unsdSubRegion                      |
      | United Kingdom               | GB     | GBR    | CRY-000485  | GBP      | Europe         | UK         | Europe     | Northern Europe                    |
      | United States of America     | US     | USA    | CRY-000486  | USD      | North America  | US         | Americas   | Northern America                   |
      | Japan                        | JP     | JPN    | CRY-000363  | JPY      | Asia           | Asia       | Asia       | Eastern Asia                       |
      | Nigeria                      | NG     | NGA    | CRY-000413  | NGN      | Africa         | Africa     | Africa     | Sub-Saharan Africa                 |
      | Barbados                     | BB     | BRB    | CRY-000273  | BBD      | The Caribbean  | Caribbean  | Americas   | Latin America and the Caribbean    |
      | Kuwait                       | KW     | KWT    | CRY-000370  | KWD      | Middle East    | Asia       | Asia       | Western Asia                       |
      | Australia                    | AU     | AUS    | CRY-000267  | AUD      | Oceania        | Oceania    | Oceania    | Australia and New Zealand          |
      | Brazil                       | BR     | BRA    | CRY-000284  | BRL      | South America  | Americas   | Americas   | Latin America and the Caribbean    |

  # ══════════════════════════════════════════════════════════════════════════
  # RBT 3: Known data quality risk — "Caribean" typo corrected
  # The source Dataverse extract contained "Caribean" (misspelt) for
  # Distribution_Region_Name__c on Caribbean countries.
  # Must be corrected to "Caribbean" before/during import.
  # ══════════════════════════════════════════════════════════════════════════

  @SF-721 @SF-721-UI-003 @p1 @data-quality @picklist @caribean-typo
  Scenario: "Caribean" misspelling is corrected to "Caribbean" in loaded data
    Given I am logged in as a "Accelerant - System administrator" user
    When I search for Country__c record with Name "Barbados"
    And I open the Country__c record
    Then the "Distribution_Region_Name__c" field should display "Caribbean"
    And the "Distribution_Region_Name__c" field should not display "Caribean"
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # RBT 4: Automated full-dataset comparison — Import CSV vs Salesforce
  # Script: scripts/verify-sf721-country-import.ts
  # Compares all 252 CSV rows × 11 fields against Country__c records
  # (Dataverse_ID__c excluded — GUIDs are environment-specific)
  # Evidence: data/reports/SF-721-Country-Import-Evidence-*.xlsx
  # ══════════════════════════════════════════════════════════════════════════

  @SF-721 @SF-721-UI-004 @p1 @automated @full-comparison @import-csv
  Scenario: Automated comparison — all CountryDataImport_Second.csv fields match Salesforce Country__c
    Given I have a valid Salesforce API token
    When I run the CSV-to-Salesforce comparison script for Country__c
    Then all 252 CSV records should be found in Salesforce
    And all 11 compared fields should match for every record
    And the generated Excel evidence should show 100% match rate
    And the evidence file is saved to data/reports

  # ══════════════════════════════════════════════════════════════════════════
  # RBT 5: Automated full-dataset comparison — Source XLSX vs Salesforce
  # Script: scripts/verify-sf721-country-unsd-source.ts
  # Compares approved enriched source (accelins_country_UNSD region.xlsx)
  # against Country__c records, matched by country name.
  # Country_Master_ID__c excluded (new IDs generated during import).
  # Evidence: data/reports/SF-721-UNSD-Source-vs-SF-Evidence-*.xlsx
  # ══════════════════════════════════════════════════════════════════════════

  @SF-721 @SF-721-UI-005 @p1 @automated @full-comparison @unsd-source
  Scenario: Automated comparison — source XLSX UNSD data matches Salesforce Country__c
    Given I have a valid Salesforce API token
    When I run the source XLSX-to-Salesforce comparison script for Country__c
    Then 251 of 254 source records should match in Salesforce
    And all 9 compared fields should match for every matched record
    And the 3 unmatched records should be name variants only:
      | xlsxName                       | reason                     |
      | Belgique                       | French name vs English     |
      | United Kingdom (Great Britain) | Name variant               |
      | Curaçao                        | Special character encoding |
    And the generated Excel evidence should show 0 field-level mismatches
    And the evidence file is saved to data/reports


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # RBT Scenarios: 5 (12 test executions via Outline examples)
  # Risk Coverage:
  #   Record count mismatch        → SF-721-UI-001
  #   Field mapping incorrect      → SF-721-UI-002 (8 countries × 9 fields)
  #                                → SF-721-UI-004 (252 countries × 11 fields)
  #   Picklist value mismatch      → SF-721-UI-002, SF-721-UI-004, SF-721-UI-005
  #   Country_Master_ID__c missing → SF-721-UI-002 (verified per country)
  #   Known Caribean typo          → SF-721-UI-003
  #   UNSD Region/Sub-region match → SF-721-UI-005 (251 countries × 9 fields)
  #   Source-to-SF data integrity  → SF-721-UI-004 + SF-721-UI-005
