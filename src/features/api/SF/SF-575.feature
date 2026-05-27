# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-575 - Create a custom Country Object
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: validation
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Validate Dataverse values in Custom Metadata (Dataverse_Mapping__mdt)
# The Custom Metadata stores mappings between Salesforce values and Dataverse values
# for integration purposes. This test validates that Dataverse_Value__c fields
# contain valid reference data codes (e.g., PTP-000001, CRY-000009 format).
# Primary Entity: Custom Metadata (Dataverse_Mapping__mdt)
#
# Test Requirements:
#   REQ-1: Verify Custom Metadata records can be queried
#     → Test Type: API | Priority: p1
#   REQ-2: Validate Dataverse values are non-empty
#     → Test Type: API | Priority: p1
#   REQ-3: Validate Dataverse values match expected format
#     → Test Type: API | Priority: p2
#   REQ-4: Validate Dataverse values against allowed values list
#     → Test Type: API | Priority: p2
#   REQ-5: Validate specific Custom Metadata record by DeveloperName
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Custom Metadata Validation
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-575 @medium @validation @custom-metadata
Feature: API - SF-575 - Validate Dataverse values in Custom Metadata

  Background:
    Given I have a valid Salesforce API token
    And I have a valid Salesforce API token with Custom Metadata access

  # ══════════════════════════════════════════════════════════════════════════
  # CUSTOM METADATA QUERY VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-575 @SF-575-API-001 @smoke @p1 @custom-metadata-query
  Scenario: API - Query Custom Metadata records
    When I query Custom Metadata "Dataverse_Mapping__mdt" records
    Then the query should return at least 1 record
    And the response should contain Custom Metadata records

  @SF-575 @SF-575-API-002 @p1 @custom-metadata-query
  Scenario: API - Query Custom Metadata record by DeveloperName
    When I query Custom Metadata "Dataverse_Mapping__mdt" record with DeveloperName "DVMapping_1"
    Then the query should return exactly 1 record
    And the record should have DeveloperName "DVMapping_1"

  # ══════════════════════════════════════════════════════════════════════════
  # DATAVERSE VALUE VALIDATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-575 @SF-575-API-003 @p1 @dataverse-validation @non-empty
  Scenario: API - Validate Dataverse values are non-empty
    When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values
    Then all Dataverse values should be non-empty
    And the validation should report no errors

  @SF-575 @SF-575-API-004 @p2 @dataverse-validation @format
  Scenario: API - Validate Dataverse value format
    When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values with format validation
    Then all Dataverse values should match the required format
    And the validation should report no format errors

  @SF-575 @SF-575-API-005 @p2 @dataverse-validation @allowed-values
  Scenario: API - Validate Dataverse values against allowed values
    When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values against allowed values
    Then all Dataverse values should be in the allowed values list
    And the validation should report no invalid values

  @SF-575 @SF-575-API-006 @p2 @dataverse-validation @specific-record
  Scenario: API - Validate specific Custom Metadata record
    When I validate Custom Metadata "Dataverse_Mapping__mdt" record "DVMapping_1" Dataverse value
    Then the Dataverse value should be valid
    And the validation should report no errors

  @SF-575 @SF-575-API-007 @p2 @dataverse-validation @filtered
  Scenario: API - Validate Custom Metadata records filtered by Object
    When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values for Object "Account"
    Then all Dataverse values should be valid
    And the validation should report no errors

  @SF-575 @SF-575-API-008 @p2 @dataverse-validation @filtered
  Scenario: API - Validate Custom Metadata records filtered by Field
    When I validate Custom Metadata "Dataverse_Mapping__mdt" Dataverse values for Object "Account" and Field "Type"
    Then all Dataverse values should be valid
    And the validation should report no errors

  # ══════════════════════════════════════════════════════════════════════════
  # VALIDATION SUMMARY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-575 @SF-575-API-009 @p1 @validation-summary
  Scenario: API - Get validation summary for all Custom Metadata records
    When I validate all Custom Metadata "Dataverse_Mapping__mdt" Dataverse values
    Then the validation summary should show total records
    And the validation summary should show valid and invalid record counts
    And the validation summary should show error and warning counts

  # ══════════════════════════════════════════════════════════════════════════
  # DATAVERSE VALUE VALIDATION AGAINST DYNAMICS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-575 @SF-575-API-022 @p1 @dataverse-validation @dynamics-integration
  Scenario: API - Validate Dataverse values exist in Dynamics for Account Type mappings
    Given I have a valid Salesforce API token
    And I have a valid Dynamics API connection
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Type"
    And I validate each Dataverse value exists in Dynamics
    Then all Dataverse values should exist in Dynamics
    And the validation should report no missing values

  @SF-575 @SF-575-API-023 @p1 @dataverse-validation @dynamics-integration
  Scenario: API - Validate Dataverse values exist in Dynamics for Country mappings
    Given I have a valid Salesforce API token
    And I have a valid Dynamics API connection
    When I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "BillingCountry"
    And I validate each Dataverse value exists in Dynamics
    Then all Dataverse values should exist in Dynamics
    And the validation should report no missing values

  @SF-575 @SF-575-API-024 @p2 @dataverse-validation @dynamics-integration
  Scenario: API - Validate specific Dataverse value exists in Dynamics
    Given I have a valid Salesforce API token
    And I have a valid Dynamics API connection
    When I query Custom Metadata "Dataverse_Mapping__mdt" record with DeveloperName "DVMapping_1"
    And I validate the Dataverse value "PTP-000001" exists in Dynamics entity "accelins_parties" for field "accelins_partytype"
    Then the Dataverse value should exist in Dynamics
    And the Dataverse value should match the expected format

  @SF-575 @SF-575-API-025 @p2 @dataverse-validation @dynamics-integration
  Scenario: API - Validate Country Dataverse values exist in Dynamics accelins_country table
    Given I have a valid Salesforce API token
    And I have a valid Dynamics API connection
    When I query Custom Metadata "Dataverse_Mapping__mdt" records where Dataverse_Field__c contains "accelins_country"
    And I validate each Country Dataverse value exists in Dynamics accelins_country entity
    Then all Country Dataverse values should exist in Dynamics
    And the validation should report no missing country values

  @SF-575 @SF-575-API-026 @p2 @dataverse-validation @dynamics-integration
  Scenario: API - Compare Custom Metadata Dataverse values with actual Dynamics data
    Given I have a valid Salesforce API token
    And I have a valid Dynamics API connection
    When I query Custom Metadata "Dataverse_Mapping__mdt" records
    And I compare each Dataverse value with Dynamics entity data
    Then all Dataverse values should match Dynamics data
    And the comparison should report no mismatches

  # ══════════════════════════════════════════════════════════════════════════
  # COUNTRY OBJECT METADATA VALIDATION
  # ══════════════════════════════════════════════════════════════════════════

  Rule: Country object metadata validation
    Background:
      Given the Salesforce org is available for metadata validation
      And the custom object "Country__c" exists

  # ---------------------------------------------------------------------------
  # Scenario 1: Core identifier fields
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-API-010 @metadata @fields @core-identifiers @p1
  Scenario: API - Configure core identifier fields for Country__c
    When I describe the Country__c object fields
    Then a field labeled "CountryName" with API name "Name" should exist
      And the "Name" field type should be "Text" with length 200
      And the "Name" field should be required
      And the "Name" field should not be unique
    And a field labeled "Country Master ID" with API name "Country_Master_ID__c" should exist
      And the "Country_Master_ID__c" field type should be "Auto Number"
      And the "Country_Master_ID__c" field should be required
      And the "Country_Master_ID__c" field should be unique
    And a field labeled "Country GUID" with API name "Dataverse_ID__c" should exist
      And the "Dataverse_ID__c" field type should be "Text" with length 36
      And the "Dataverse_ID__c" field should not be required
      And the "Dataverse_ID__c" field should be unique
      And the "Dataverse_ID__c" field should be read-only

  # ---------------------------------------------------------------------------
  # Scenario 2: ISO country code fields
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-API-011 @metadata @fields @iso @p1
  Scenario: API - Configure ISO code fields for Country__c
    When I describe the Country__c object fields
    Then a field labeled "Alpha-2 Code" with API name "Alpha2_Code__c" should exist
      And the "Alpha2_Code__c" field type should be "Text" with length 2
      And the "Alpha2_Code__c" field should be required
      And the "Alpha2_Code__c" field should be unique
    And a field labeled "Alpha-3 Code" with API name "Alpha3_Code__c" should exist
      And the "Alpha3_Code__c" field type should be "Text" with length 3
      And the "Alpha3_Code__c" field should not be required
      And the "Alpha3_Code__c" field should be unique
    And a field labeled "ISO Numeric Code" with API name "ISO_Number__c" should exist
      And the "ISO_Number__c" field type should be "Number" with precision 4 and scale 0
      And the "ISO_Number__c" field should not be required
      And the "ISO_Number__c" field should not be unique

  @SF-575 @SF-575-API-012 @data @iso @uniqueness @p2
  Scenario Outline: API - ISO Alpha code uniqueness is enforced
    Given a Country__c record exists with <field> = <value>
    When I attempt to create another Country__c record with <field> = <value>
    Then the save should fail
      And the validation message should indicate <field> must be unique

    Examples:
      | field            | value |
      | Alpha2_Code__c   | US    |
      | Alpha3_Code__c   | USA   |

  # ---------------------------------------------------------------------------
  # Scenario 3: Region and business classification fields
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-API-013 @metadata @fields @classification @p1
  Scenario: API - Configure classification picklists for Country__c
    When I describe the Country__c object fields
    Then a field labeled "Business Area Name" with API name "Business_Area_Name__c" should exist
      And the "Business_Area_Name__c" field type should be "Picklist"
      And the "Business_Area_Name__c" field should not be required
      And the picklist values for "Business_Area_Name__c" should include:
        | Africa           |
        | Antarctica       |
        | Asia             |
        | Central America  |
        | Europe           |
        | Middle East      |
        | North America    |
        | Oceania          |
        | South America    |
        | The Caribbean    |
    And a field labeled "Distribution Region Name" with API name "Distribution_Region_Name__c" should exist
      And the "Distribution_Region_Name__c" field type should be "Picklist"
      And the "Distribution_Region_Name__c" field should not be required
      And the picklist values for "Distribution_Region_Name__c" should include:
        | Africa         |
        | Americas       |
        | Asia           |
        | CA             |
        | Caribbean      |
        | EEA            |
        | EU             |
        | Global         |
        | Latin America  |
        | Oceania        |
        | UK             |
        | US             |

  # ---------------------------------------------------------------------------
  # Scenario 4: Currency field
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-API-014 @metadata @fields @currency @p1
  Scenario: API - Configure currency code field for Country__c
    When I describe the Country__c object fields
    Then a field labeled "Currency Code" with API name "Accelins_CurrencyCode__c" should exist
      And the "Accelins_CurrencyCode__c" field type should be "Text" with length 3
      And the "Accelins_CurrencyCode__c" field should not be required

  # ---------------------------------------------------------------------------
  # Scenario 5: Status field
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-API-015 @metadata @fields @status @p1
  Scenario: API - Configure required Status picklist for Country__c
    When I describe the Country__c object fields
    Then a field labeled "Status" with API name "Status__c" should exist
      And the "Status__c" field type should be "Picklist"
      And the "Status__c" field should be required
      And the picklist values for "Status__c" should include:
        | Active  |
        | Invalid |

  @SF-575 @SF-575-API-016 @data @status @required @p2
  Scenario: API - Status is required when creating a Country__c record
    Given I am creating a new Country__c record
      And I provide Name = "United States"
      And I provide Alpha2_Code__c = "US"
      And I do not provide a value for Status__c
    When I save the record
    Then the save should fail
      And the validation message should indicate "Status" is required

  # ---------------------------------------------------------------------------
  # Scenario 6: Remove duplicated fields
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-API-017 @metadata @cleanup @duplicates @p2
  Scenario: API - Duplicated legacy fields are removed from Country__c
    Given the required canonical fields exist on "Country__c":
      | Name                    |
      | Dataverse_ID__c         |
      | ISO_Number__c           |
      | Business_Area_Name__c   |
      | Accelins_CurrencyCode__c|
    When I describe the Country__c object fields
    Then the following legacy duplicated fields should not exist:
      | Country_Name__c         |
      | External_ID__c          |
      | Country_ISO_Code__c     |
      | Area_Of_Business__c     |
      | CurrencyISOCode         |

  # ---------------------------------------------------------------------------
  # Scenario 7: Update data types for existing fields
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-API-018 @metadata @migration @datatype @p2
  Scenario: API - Alpha-2 and Alpha-3 code fields have correct lengths
    Given the field "Alpha2_Code__c" exists on "Country__c"
      And the field "Alpha3_Code__c" exists on "Country__c"
    When I describe the Country__c object fields
    Then "Alpha2_Code__c" should be type "Text" with length 2
      And "Alpha3_Code__c" should be type "Text" with length 3

  @SF-575 @SF-575-API-019 @metadata @migration @autonumber @p2
  Scenario: API - Country_Master_ID__c is converted to an Auto Number with required format
    Given the field "Country_Master_ID__c" exists on "Country__c"
    When I describe the Country__c object fields
    Then "Country_Master_ID__c" should be type "Auto Number"
      And the Auto Number display format should start with prefix "CRY-"
      And the Auto Number should use a 6-digit counter pattern like "CRY-000000"
      And the field "Country_Master_ID__c" should be required
      And the field "Country_Master_ID__c" should be unique

  @SF-575 @SF-575-API-020 @data @autonumber @p2
  Scenario: API - Country_Master_ID__c auto-increments for new Country__c records
    Given there are no Country__c records with Country_Master_ID__c starting with "CRY-" in the test context
    When I create a new Country__c record with:
      | Name          | Testland        |
      | Alpha2_Code__c| TL              |
      | Status__c     | Active          |
    Then the record should be saved successfully
      And "Country_Master_ID__c" should be populated
      And "Country_Master_ID__c" should match the pattern "^CRY-[0-9]{6}$"

  # ---------------------------------------------------------------------------
  # Permission set
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-API-021 @security @permissions @p2
  Scenario: API - Country permission set exists for access management
    When I inspect metadata for permission sets
    Then the permission set "PS_Country" should exist
