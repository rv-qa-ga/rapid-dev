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
# Overview: Validate Country__c custom object configuration via UI
# The Country object stores country reference data matching Dataverse.
# Primary Entity: Country__c
#
# ═══════════════════════════════════════════════════════════════════════════
#
# UI TESTS - Country Object Validation
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-575 @medium @data-model @country
Feature: UI - SF-575 - Custom Country object in Salesforce matches Dataverse country reference model

  As a Data Steward
  I want a Salesforce custom object that stores the same country reference data and keys as Dataverse
  So that Salesforce can hold authoritative country reference records and use relationships to auto-populate related regions

  Background:
    Given I am logged into Salesforce
    And the Salesforce org is available for metadata validation
    And the custom object "Country__c" exists

  # ---------------------------------------------------------------------------
  # Scenario 1: Core identifier fields
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-UI-001 @metadata @fields @core-identifiers @p1
  Scenario: UI - Configure core identifier fields for Country__c
    When I navigate to the Country__c object setup page
    And I inspect the fields for "Country__c"
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
      And the "Dataverse_ID__c" field should be hidden from page layouts

  # ---------------------------------------------------------------------------
  # Scenario 2: ISO country code fields
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-UI-002 @metadata @fields @iso @p1
  Scenario: UI - Configure ISO code fields for Country__c
    When I navigate to the Country__c object setup page
    And I inspect the fields for "Country__c"
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

  @SF-575 @SF-575-UI-003 @data @iso @uniqueness @p2
  Scenario Outline: UI - ISO Alpha code uniqueness is enforced
    Given I navigate to the Country__c object
    And a Country__c record exists with <field> = <value>
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

  @SF-575 @SF-575-UI-004 @metadata @fields @classification @p1
  Scenario: UI - Configure classification picklists for Country__c
    When I navigate to the Country__c object setup page
    And I inspect the fields for "Country__c"
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

  @SF-575 @SF-575-UI-005 @metadata @fields @currency @p1
  Scenario: UI - Configure currency code field for Country__c
    When I navigate to the Country__c object setup page
    And I inspect the fields for "Country__c"
    Then a field labeled "Currency Code" with API name "Accelins_CurrencyCode__c" should exist
      And the "Accelins_CurrencyCode__c" field type should be "Text" with length 3
      And the "Accelins_CurrencyCode__c" field should not be required

  # ---------------------------------------------------------------------------
  # Scenario 5: Status field
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-UI-006 @metadata @fields @status @p1
  Scenario: UI - Configure required Status picklist for Country__c
    When I navigate to the Country__c object setup page
    And I inspect the fields for "Country__c"
    Then a field labeled "Status" with API name "Status__c" should exist
      And the "Status__c" field type should be "Picklist"
      And the "Status__c" field should be required
      And the picklist values for "Status__c" should include:
        | Active  |
        | Invalid |

  @SF-575 @SF-575-UI-007 @data @status @required @p2
  Scenario: UI - Status is required when creating a Country__c record
    Given I navigate to the Country__c object
    And I am creating a new Country__c record
      And I provide Name = "United States"
      And I provide Alpha2_Code__c = "US"
      And I do not provide a value for Status__c
    When I save the record
    Then the save should fail
      And the validation message should indicate "Status" is required

  # ---------------------------------------------------------------------------
  # Scenario 6: Remove duplicated fields
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-UI-008 @metadata @cleanup @duplicates @p2
  Scenario: UI - Duplicated legacy fields are removed from Country__c
    Given the required canonical fields exist on "Country__c":
      | Name                    |
      | Dataverse_ID__c         |
      | ISO_Number__c           |
      | Business_Area_Name__c   |
      | Accelins_CurrencyCode__c|
    When I navigate to the Country__c object setup page
    And I inspect the fields for "Country__c"
    Then the following legacy duplicated fields should not exist:
      | Country_Name__c         |
      | External_ID__c          |
      | Country_ISO_Code__c     |
      | Area_Of_Business__c     |
      | CurrencyISOCode         |

  # ---------------------------------------------------------------------------
  # Scenario 7: Update data types for existing fields
  # ---------------------------------------------------------------------------

  @SF-575 @SF-575-UI-009 @metadata @migration @datatype @p2
  Scenario: UI - Alpha-2 and Alpha-3 code fields have correct lengths
    Given the field "Alpha2_Code__c" exists on "Country__c"
      And the field "Alpha3_Code__c" exists on "Country__c"
    When I navigate to the Country__c object setup page
    And I inspect field definitions for "Country__c"
    Then "Alpha2_Code__c" should be type "Text" with length 2
      And "Alpha3_Code__c" should be type "Text" with length 3

  @SF-575 @SF-575-UI-010 @metadata @migration @autonumber @p2
  Scenario: UI - Country_Master_ID__c is converted to an Auto Number with required format
    Given the field "Country_Master_ID__c" exists on "Country__c"
    When I navigate to the Country__c object setup page
    And I inspect field definitions for "Country__c"
    Then "Country_Master_ID__c" should be type "Auto Number"
      And the Auto Number display format should start with prefix "CRY-"
      And the Auto Number should use a 6-digit counter pattern like "CRY-000000"
      And the field "Country_Master_ID__c" should be required
      And the field "Country_Master_ID__c" should be unique

  @SF-575 @SF-575-UI-011 @data @autonumber @p2
  Scenario: UI - Country_Master_ID__c auto-increments for new Country__c records
    Given I navigate to the Country__c object
    And there are no Country__c records with Country_Master_ID__c starting with "CRY-" in the test context
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

  @SF-575 @SF-575-UI-012 @security @permissions @p2
  Scenario: UI - Country permission set exists for access management
    When I navigate to Permission Sets in Setup
    And I inspect metadata for permission sets
    Then the permission set "PS_Country" should exist

  # ══════════════════════════════════════════════════════════════════════════
  # DATAVERSE VALUE VALIDATION AGAINST DYNAMICS (UI)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-575 @SF-575-UI-013 @p2 @dataverse-validation @dynamics-integration
  Scenario: UI - Validate Dataverse values exist in Dynamics for Account Type mappings
    Given I am logged into Salesforce
    And I have a valid Dynamics API connection
    When I navigate to Custom Metadata Types in Setup
    And I query Custom Metadata "Dataverse_Mapping__mdt" records filtered by Object "Account" and Field "Type"
    And I validate each Dataverse value exists in Dynamics
    Then all Dataverse values should exist in Dynamics
    And the validation should report no missing values

  @SF-575 @SF-575-UI-014 @p2 @dataverse-validation @dynamics-integration
  Scenario: UI - Validate Country Dataverse values exist in Dynamics accelins_country table
    Given I am logged into Salesforce
    And I have a valid Dynamics API connection
    When I navigate to Custom Metadata Types in Setup
    And I query Custom Metadata "Dataverse_Mapping__mdt" records where Dataverse_Field__c contains "accelins_country"
    And I validate each Country Dataverse value exists in Dynamics accelins_country entity
    Then all Country Dataverse values should exist in Dynamics
    And the validation should report no missing country values
