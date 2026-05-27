# ══════════════════════════════════════════════════════════════════════════════
# MRD Field-Level Security (FLS) Testing - Account Object
# ══════════════════════════════════════════════════════════════════════════════
# 
# Purpose: Comprehensive FLS testing for MRD role on Account object
# Source: RVLOCAL-Mapping and Governance of Data Attributes for CLM Design.xlsx
# Confluence: https://accelins.atlassian.net/wiki/spaces/SA/pages/2773942425/Sharing+Visibility+and+Access+Model
# 
# Test Coverage:
#   - All Account fields from Excel (columns M and N = MRD View/Edit permissions)
#   - Positive cases: Fields MRD can view/edit
#   - Negative cases: Fields MRD cannot view/edit
#   - API validation: Both describe API and actual record access
# 
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @mrd @fls @account @role-based @MRD-FLS-Account
Feature: API - MRD Field-Level Security on Account Object

  Background:
    Given I have a valid Salesforce API token
    And the test context object type is "Account"
    # Note: API tests authenticate per-step using role credentials, not via UI login

  # ============================================================================
  # DESCRIBE API VALIDATION - Field Metadata
  # ============================================================================
  # Validates field visibility via Salesforce describe API
  # This checks what fields are accessible in the API metadata

  @MRD-FLS-API-001 @describe-api @positive
  Scenario Outline: API - MRD can view field "<field_name>" via describe API
    When I describe the Account object via API as "mrd" user
    Then the describe response should include field "<field_name>"
    And field "<field_name>" should be accessible in the describe response

  Examples:
    | field_name |
    | Name |
    | Phone |
    | Website |
    | TickerSymbol |
    | Type |
    | Account_Status__c |
    | Ownership |
    | NumberOfEmployees |
    | BillingStreet |
    | BillingCountry |
    | BillingLatitude |
    | BillingLongitude |
    | BillingGeocodeAccuracy |
    | Upsell_Opportunity__c |
    | Current_Program_Expiration_Date__c |
    | Primary_Contact__c |
    | Onboarded_Date__c |
    | Affiliate_Non_Affiliate__c |
    | Functional_Currency__c |
    | Member_Previously_Known_As_Name__c |
    | Binding_Authority_Limited__c |
    | Binding_Authority_Limitation_Reason__c |
    | Runoff__c |
    | Runoff_Effective_Date__c |
    | Closeout_Date__c |
    | Runoff_TPA_Date__c |
    | AnnualRevenue |
    | Broker_Sourced__c |
    | Broker_Sourced_Name_c |
    | Description__c |
    | Incumbent_Carrier__c |
    | Initiate_Offboarding__c |
    | Initiate_Runoff__c |
    | Proposed_Effective_Date__c |
    | Target_Insured_Industry_Size__c |
    | Discontinued_Date_c |
    | Data_Source_Written__c |
    | Data_Source_Claims__c |
    | OwnerId |
    | PTY_Code__c |
    | Party_Code__c |
    | Distribution_Region__c |
    | Admission_Status__c |
    | CreatedById |
    | LastModifiedById |
    | Region__c |
    | Written_Accounting_Period_Effective_From_c |
    | Claims_Production_Period_Effective_From_c |

  @MRD-FLS-API-002 @describe-api @negative
  Scenario Outline: API - MRD cannot view restricted field "<field_name>" via describe API
    When I describe the Account object via API as "mrd" user
    Then the describe response should NOT include field "<field_name>"
    # Note: If field appears but is not accessible, that's also a failure

  Examples:
    | field_name |
    | Rating |
    | Email |
    | ParentId |
    | Fax |
    | Site |
    | Industry |
    | Sic |
    | BillingAddress |
    | BillingCity |
    | BillingState |
    | BillingPostalCode |
    | ShippingAddress |
    | Number_of_Locations__c |
    | RecordTypeId |
    | Investment_Status__c |
    | First_Written_Premium_Date__c |
    | Reinsurance_Arrangements__c |
    | FOS_FSCS_Exposure__c |
    | Account_Team_Roles__c |
    | Country__c |
    | Annual_GWP__c |
    | Total_Active_Members__c |
    | CurrencyIsoCode |
    | AccountSource |
    | Annual_GWP_Estimate_Year_1__c |

  # ============================================================================
  # RECORD ACCESS VALIDATION - Actual Field Access
  # ============================================================================
  # Validates field access when querying/creating/updating actual records

  @MRD-FLS-API-003 @record-access @positive @view
  Scenario Outline: API - MRD can view field "<field_name>" on Account record
    Given I have a test Account created via API with:
      | Name | MRD FLS Test Account |
      | <field_name> | <test_value> |
    When I query the Account record via API as "mrd" user
    Then the response should include field "<field_name>"
    And field "<field_name>" should have value "<test_value>"

  Examples:
    | field_name | test_value |
    | Name | MRD FLS Test Account |
    | Phone | +1-555-0100 |
    | Website | https://test.example.com |
    | Type | Member |
    | Account_Status__c | Prospect |
    | Ownership | Private |
    | NumberOfEmployees | 100 |
    | BillingStreet | 123 Test Street |
    | BillingCountry | United States |
    | Functional_Currency__c | USD |
    | AnnualRevenue | 1000000 |
    | Data_Source_Written__c | Platform |
    | Data_Source_Claims__c | Platform |
    | OwnerId | 005000000000000AAA |

  @MRD-FLS-API-004 @record-access @positive @edit
  Scenario Outline: API - MRD can edit field "<field_name>" on Account record
    Given I have a test Account created via API with:
      | Name | MRD FLS Edit Test Account |
    When I update the Account record via API as "mrd" user with:
      | <field_name> | <new_value> |
    Then the API should return status code 200
    And I query the Account record via API as "mrd" user
    And field "<field_name>" should have value "<new_value>"

  Examples:
    | field_name | new_value |
    | Name | Updated Account Name |
    | Phone | +1-555-9999 |
    | Website | https://updated.example.com |
    | Type | Member |
    | Account_Status__c | Active |
    | Ownership | Public |
    | NumberOfEmployees | 200 |
    | BillingStreet | 456 Updated Street |
    | BillingCountry | Canada |
    | Functional_Currency__c | CAD |
    | AnnualRevenue | 2000000 |
    | Data_Source_Written__c | VIPR |
    | Data_Source_Claims__c | VIPR |
    | Broker_Sourced__c | No |
    | Description__c | Updated Description |

  @MRD-FLS-API-005 @record-access @negative @view
  Scenario Outline: API - MRD cannot view restricted field "<field_name>" on Account record
    Given I have a test Account created via API with:
      | Name | MRD FLS Restricted Test Account |
      | <field_name> | <test_value> |
    When I query the Account record via API as "mrd" user
    Then the response should NOT include field "<field_name>"
    # Alternative: Field may appear but be null/empty if not accessible

  Examples:
    | field_name | test_value |
    | Rating | Hot |
    | Email | test@example.com |
    | ParentId | 001000000000000AAA |
    | Fax | +1-555-0101 |
    | Site | Test Site |
    | Industry | Technology |
    | Sic | 1234 |
    | BillingCity | New York |
    | BillingState | NY |
    | BillingPostalCode | 10001 |
    | Number_of_Locations__c | 5 |
    | Investment_Status__c | Active |
    | Annual_GWP__c | 5000000 |
    | Total_Active_Members__c | 1000 |

  @MRD-FLS-API-006 @record-access @negative @edit
  Scenario Outline: API - MRD cannot edit restricted field "<field_name>" on Account record
    Given I have a test Account created via API with:
      | Name | MRD FLS Edit Restricted Test Account |
    When I attempt to update the Account record via API as "mrd" user with:
      | <field_name> | <new_value> |
    Then the API should return an error
    And the error should indicate insufficient permissions for field "<field_name>"

  Examples:
    | field_name | new_value |
    | Rating | Warm |
    | Email | updated@example.com |
    | ParentId | 001000000000000BBB |
    | Fax | +1-555-9999 |
    | Industry | Finance |
    | BillingCity | Los Angeles |
    | BillingState | CA |
    | BillingPostalCode | 90001 |
    | Number_of_Locations__c | 10 |
    | Investment_Status__c | Inactive |
    | Annual_GWP__c | 10000000 |
    | Total_Active_Members__c | 2000 |

  # ============================================================================
  # CREATE RECORD VALIDATION - Field Access During Creation
  # ============================================================================
  # Validates which fields MRD can set when creating new Account records

  @MRD-FLS-API-007 @create-record @positive
  Scenario Outline: API - MRD can create Account with editable field "<field_name>"
    When I create a new Account via POST as "mrd" user with:
      | Name | MRD Created Account |
      | <field_name> | <test_value> |
    Then the API should return status code 201
    And the response should include the Account ID
    And I query the Account record via API as "mrd" user
    And field "<field_name>" should have value "<test_value>"

  Examples:
    | field_name | test_value |
    | Name | MRD Created Account |
    | Phone | +1-555-0100 |
    | Website | https://created.example.com |
    | Type | Member |
    | Account_Status__c | Prospect |
    | Ownership | Private |
    | NumberOfEmployees | 50 |
    | BillingStreet | 789 Created Street |
    | BillingCountry | United States |
    | Functional_Currency__c | USD |
    | AnnualRevenue | 500000 |
    | Data_Source_Written__c | Platform |
    | Data_Source_Claims__c | Platform |
    | Broker_Sourced__c | Yes |
    | Description__c | Created Description |

  @MRD-FLS-API-008 @create-record @negative
  Scenario Outline: API - MRD cannot create Account with restricted field "<field_name>"
    When I attempt to create a new Account via POST as "mrd" user with:
      | Name | MRD Restricted Create Test |
      | <field_name> | <test_value> |
    Then the API should return an error
    And the error should indicate insufficient permissions for field "<field_name>"

  Examples:
    | field_name | test_value |
    | Rating | Hot |
    | Email | test@example.com |
    | ParentId | 001000000000000AAA |
    | Fax | +1-555-0101 |
    | Industry | Technology |
    | BillingCity | New York |
    | BillingState | NY |
    | BillingPostalCode | 10001 |
    | Number_of_Locations__c | 5 |
    | Investment_Status__c | Active |
    | Annual_GWP__c | 5000000 |
    | Total_Active_Members__c | 1000 |
    | CurrencyIsoCode | GBP |
    | AccountSource | Web |

  # ============================================================================
  # ACCOUNT TYPE-SPECIFIC FLS VALIDATION
  # ============================================================================
  # Priority 1: Member Account Type
  # Priority 2: Insurer and Agency Account Types
  # Priority 3: All other Account Types (grouped)

  @MRD-FLS-API-009 @account-type @member @priority-1
  Scenario: API - MRD FLS validation for Member Account Type
    Given I have a test Account created via API with:
      | Name | MRD FLS Member Account |
      | Type | Member |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I describe the Account object via API as "mrd" user
    And I query the Account record via API as "mrd" user
    Then validate all Account fields against MRD FLS matrix
    # Validates that MRD can view/edit appropriate fields for Member Account Type

  @MRD-FLS-API-010 @account-type @member @priority-1 @create
  Scenario: API - MRD can create Member Account with editable fields
    When I create a new Account via POST as "mrd" user with:
      | Name | MRD Created Member Account |
      | Type | Member |
      | Phone | +1-555-0100 |
      | Website | https://member.example.com |
      | Account_Status__c | Prospect |
      | Ownership | Private |
      | NumberOfEmployees | 100 |
      | BillingStreet | 123 Member Street |
      | BillingCountry | United States |
      | Functional_Currency__c | USD |
      | AnnualRevenue | 1000000 |
      | Affiliate_Non_Affiliate__c | Affiliate |
    Then the API should return status code 201
    And the response should include the Account ID
    And I query the Account record via API as "mrd" user
    And field "Type" should have value "Member"
    And field "Name" should have value "MRD Created Member Account"
    And field "Phone" should have value "+1-555-0100"

  @MRD-FLS-API-011 @account-type @member @priority-1 @update
  Scenario: API - MRD can update Member Account editable fields
    Given I have a test Account created via API with:
      | Name | MRD Member Update Test |
      | Type | Member |
      | Account_Status__c | Prospect |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I update the Account record via API as "mrd" user with:
      | Phone | +1-555-9999 |
      | Website | https://updated-member.example.com |
      | Account_Status__c | Active |
      | NumberOfEmployees | 200 |
      | AnnualRevenue | 2000000 |
    Then the API should return status code 200
    And I query the Account record via API as "mrd" user
    And field "Phone" should have value "+1-555-9999"
    And field "Account_Status__c" should have value "Active"

  @MRD-FLS-API-012 @account-type @insurer @priority-2
  Scenario: API - MRD FLS validation for Insurer Account Type
    Given I have a test Account created via API with:
      | Name | MRD FLS Insurer Account |
      | Type | Insurer |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I describe the Account object via API as "mrd" user
    And I query the Account record via API as "mrd" user
    Then validate all Account fields against MRD FLS matrix
    # Validates that MRD can view/edit appropriate fields for Insurer Account Type

  @MRD-FLS-API-013 @account-type @insurer @priority-2 @create
  Scenario: API - MRD can create Insurer Account with editable fields
    When I create a new Account via POST as "mrd" user with:
      | Name | MRD Created Insurer Account |
      | Type | Insurer |
      | Phone | +1-555-0200 |
      | Website | https://insurer.example.com |
      | Account_Status__c | Prospect |
      | Ownership | Public |
      | NumberOfEmployees | 500 |
      | BillingStreet | 456 Insurer Avenue |
      | BillingCountry | United States |
      | Functional_Currency__c | USD |
      | AnnualRevenue | 5000000 |
      | TickerSymbol | INS |
    Then the API should return status code 201
    And the response should include the Account ID
    And I query the Account record via API as "mrd" user
    And field "Type" should have value "Insurer"
    And field "Name" should have value "MRD Created Insurer Account"

  @MRD-FLS-API-014 @account-type @agency @priority-2
  Scenario: API - MRD FLS validation for Agency Account Type
    Given I have a test Account created via API with:
      | Name | MRD FLS Agency Account |
      | Type | Agency |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I describe the Account object via API as "mrd" user
    And I query the Account record via API as "mrd" user
    Then validate all Account fields against MRD FLS matrix
    # Validates that MRD can view/edit appropriate fields for Agency Account Type

  @MRD-FLS-API-015 @account-type @agency @priority-2 @create
  Scenario: API - MRD can create Agency Account with editable fields
    When I create a new Account via POST as "mrd" user with:
      | Name | MRD Created Agency Account |
      | Type | Agency |
      | Phone | +1-555-0300 |
      | Website | https://agency.example.com |
      | Account_Status__c | Prospect |
      | Ownership | Private |
      | NumberOfEmployees | 50 |
      | BillingStreet | 789 Agency Boulevard |
      | BillingCountry | United States |
      | Functional_Currency__c | USD |
      | AnnualRevenue | 500000 |
      | Broker_Sourced__c | Yes |
    Then the API should return status code 201
    And the response should include the Account ID
    And I query the Account record via API as "mrd" user
    And field "Type" should have value "Agency"
    And field "Name" should have value "MRD Created Agency Account"

  @MRD-FLS-API-016 @account-type @other-types @priority-3
  Scenario Outline: API - MRD FLS validation for other Account Types
    Given I have a test Account created via API with:
      | Name | MRD FLS <account_type> Account |
      | Type | <account_type> |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I describe the Account object via API as "mrd" user
    And I query the Account record via API as "mrd" user
    Then validate all Account fields against MRD FLS matrix
    # Validates that MRD can view/edit appropriate fields for <account_type> Account Type
    # Focus: Non-Member MGA is the priority for other account types

  Examples:
    | account_type |
    | Non - Member MGA |

  @MRD-FLS-API-017 @account-type @other-types @priority-3 @create
  Scenario Outline: API - MRD can create other Account Types with editable fields
    When I create a new Account via POST as "mrd" user with:
      | Name | MRD Created <account_type> Account |
      | Type | <account_type> |
      | Phone | +1-555-0400 |
      | Account_Status__c | Prospect |
      | Functional_Currency__c | USD |
      | Region__c | US |
      | BillingCountry | United States |
    Then the API should return status code 201
    And the response should include the Account ID
    And I query the Account record via API as "mrd" user
    And field "Type" should have value "<account_type>"
    And field "Name" should have value "MRD Created <account_type> Account"
    # Focus: Non-Member MGA is the priority for other account types

  Examples:
    | account_type |
    | Non - Member MGA |

  # ============================================================================
  # COMPREHENSIVE FIELD VALIDATION - All Fields from Excel
  # ============================================================================
  # This scenario will be dynamically generated based on the extracted FLS matrix
  # It validates all fields from the Excel file

  @MRD-FLS-API-018 @comprehensive @all-fields
  Scenario: API - MRD FLS validation for all Account fields from Excel
    Given I have a test Account created via API with all required fields
    When I describe the Account object via API as "mrd" user
    And I query the Account record via API as "mrd" user
    Then validate all Account fields against MRD FLS matrix
    # This step will iterate through all fields from fls-matrix.json
    # and validate view/edit permissions for each field

