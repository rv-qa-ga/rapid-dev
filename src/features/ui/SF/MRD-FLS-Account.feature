# ══════════════════════════════════════════════════════════════════════════════
# MRD Field-Level Security (FLS) Testing - Account Object (UI)
# ══════════════════════════════════════════════════════════════════════════════
# 
# Purpose: Comprehensive FLS testing for MRD role on Account object via UI
# Source: RVLOCAL-Mapping and Governance of Data Attributes for CLM Design.xlsx
# Confluence: https://accelins.atlassian.net/wiki/spaces/SA/pages/2773942425/Sharing+Visibility+and+Access+Model
# 
# Test Coverage:
#   - All Account fields from Excel (columns M and N = MRD View/Edit permissions)
#   - Positive cases: Fields MRD can view/edit
#   - Negative cases: Fields MRD cannot view/edit
#   - UI validation: Record detail pages AND create/edit forms
# 
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @mrd @fls @account @role-based @MRD-FLS-Account
Feature: UI - MRD Field-Level Security on Account Object

  Background:
    Given I am logged in as a "mrd" user
    And the test context object type is "Account"

  # ============================================================================
  # RECORD DETAIL PAGE VALIDATION - Field Visibility
  # ============================================================================
  # Validates field visibility on Account record detail pages

  @MRD-FLS-UI-001 @detail-page @positive @view
  Scenario Outline: UI - MRD can view field "<field_name>" on Account detail page
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Detail Test Account |
      | <field_name> | <test_value> |
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And the "<field_name>" field should be visible

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
    | OwnerId |
    | PTY_Code__c |
    | Party_Code__c |
    | Distribution_Region__c |
    | Data_Source_Written__c |
    | Data_Source_Claims__c |
    | Admission_Status__c |
    | Region__c |

  @MRD-FLS-UI-002 @detail-page @negative @view
  Scenario Outline: UI - MRD cannot view restricted field "<field_name>" on Account detail page
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Restricted Detail Test |
      | <field_name> | <test_value> |
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And the "<field_name>" field should not be visible or should be read-only

  Examples:
    | field_name |
    | Rating |
    | Email |
    | ParentId |
    | Fax |
    | AccountNumber |
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
  # EDIT FORM VALIDATION - Field Editability
  # ============================================================================
  # Validates field editability on Account edit forms

  @MRD-FLS-UI-003 @edit-form @positive @edit
  Scenario Outline: UI - MRD can edit field "<field_name>" on Account edit form
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Edit Test Account |
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "<field_name>" field should be visible
    And the "<field_name>" field should be editable
    When I set the "<field_name>" field to "<new_value>"
    And I save the Account record
    Then the Account record should be saved successfully
    And the "<field_name>" field should display "<new_value>"

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

  @MRD-FLS-UI-004 @edit-form @negative @edit
  Scenario Outline: UI - MRD cannot edit restricted field "<field_name>" on Account edit form
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Edit Restricted Test |
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "<field_name>" field should not be visible or should be read-only
    # If field is visible but read-only, that's acceptable (restricted)

  Examples:
    | field_name |
    | Rating |
    | Email |
    | ParentId |
    | Fax |
    | AccountNumber |
    | Industry |
    | BillingCity |
    | BillingState |
    | BillingPostalCode |
    | Number_of_Locations__c |
    | Investment_Status__c |
    | Annual_GWP__c |
    | Total_Active_Members__c |
    | CurrencyIsoCode |
    | AccountSource |
    | OwnerId |
    | PTY_Code__c |
    | Party_Code__c |
    | Distribution_Region__c |
    | Data_Source_Written__c |
    | Data_Source_Claims__c |
    | Admission_Status__c |
    | Region__c |

  # ============================================================================
  # CREATE FORM VALIDATION - Field Access During Creation
  # ============================================================================
  # Validates which fields MRD can set when creating new Account records

  @MRD-FLS-UI-005 @create-form @positive
  Scenario Outline: UI - MRD can create Account with editable field "<field_name>"
    When I navigate to the Account object
    And I click New to create an Account
    Then the "<field_name>" field should be visible
    And the "<field_name>" field should be editable
    When I set the "<field_name>" field to "<test_value>"
    And I set the "Name" field to "MRD Created Account"
    And I save the Account record
    Then the Account record should be saved successfully
    When I navigate to the created Account record
    And the "<field_name>" field should display "<test_value>"

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

  @MRD-FLS-UI-006 @create-form @negative
  Scenario Outline: UI - MRD cannot create Account with restricted field "<field_name>"
    When I navigate to the Account object
    And I click New to create an Account
    Then the "<field_name>" field should not be visible
    # If field is visible but read-only, that's also acceptable (restricted)

  Examples:
    | field_name |
    | Rating |
    | Email |
    | ParentId |
    | Fax |
    | AccountNumber |
    | Industry |
    | BillingCity |
    | BillingState |
    | BillingPostalCode |
    | Number_of_Locations__c |
    | Investment_Status__c |
    | Annual_GWP__c |
    | Total_Active_Members__c |
    | CurrencyIsoCode |
    | AccountSource |
    | OwnerId |
    | PTY_Code__c |
    | Party_Code__c |
    | Distribution_Region__c |
    | Data_Source_Written__c |
    | Data_Source_Claims__c |
    | Admission_Status__c |
    | Region__c |

  # ============================================================================
  # ACCOUNT TYPE-SPECIFIC FLS VALIDATION
  # ============================================================================
  # Priority 1: Member Account Type
  # Priority 2: Insurer and Agency Account Types
  # Priority 3: All other Account Types (grouped)

  @MRD-FLS-UI-007 @account-type @member @priority-1 @detail-page
  Scenario: UI - MRD FLS validation for Member Account Type on detail page
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Member Account |
      | Type | Member |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And validate all Account fields visibility against MRD FLS matrix on detail page
    # Validates that MRD can view appropriate fields for Member Account Type

  @MRD-FLS-UI-008 @account-type @member @priority-1 @edit-form
  Scenario: UI - MRD FLS validation for Member Account Type on edit form
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Member Account |
      | Type | Member |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I navigate to the Account record
    And I click Edit on the Account
    Then validate all Account fields editability against MRD FLS matrix on edit form
    # Validates that MRD can edit appropriate fields for Member Account Type

  @MRD-FLS-UI-009 @account-type @member @priority-1 @create-form
  Scenario: UI - MRD can create Member Account with editable fields
    When I navigate to the Account object
    And I click New to create an Account
    Then the "Type" field should be visible
    And the "Type" field should be editable
    When I set the "Type" field to "Member"
    And I set the "Name" field to "MRD Created Member Account"
    And I set the "Phone" field to "+1-555-0100"
    And I set the "Website" field to "https://member.example.com"
    And I set the "Account_Status__c" field to "Prospect"
    And I set the "Functional_Currency__c" field to "USD"
    And I set the "Region__c" field to "US"
    And I save the Account record
    Then the Account record should be saved successfully
    When I navigate to the created Account record
    And the "Type" field should display "Member"
    And the "Name" field should display "MRD Created Member Account"

  @MRD-FLS-UI-010 @account-type @insurer @priority-2 @detail-page
  Scenario: UI - MRD FLS validation for Insurer Account Type on detail page
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Insurer Account |
      | Type | Insurer |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And validate all Account fields visibility against MRD FLS matrix on detail page
    # Validates that MRD can view appropriate fields for Insurer Account Type

  @MRD-FLS-UI-011 @account-type @insurer @priority-2 @edit-form
  Scenario: UI - MRD FLS validation for Insurer Account Type on edit form
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Insurer Account |
      | Type | Insurer |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I navigate to the Account record
    And I click Edit on the Account
    Then validate all Account fields editability against MRD FLS matrix on edit form
    # Validates that MRD can edit appropriate fields for Insurer Account Type

  @MRD-FLS-UI-012 @account-type @insurer @priority-2 @create-form
  Scenario: UI - MRD can create Insurer Account with editable fields
    When I navigate to the Account object
    And I click New to create an Account
    Then the "Type" field should be visible
    And the "Type" field should be editable
    When I set the "Type" field to "Insurer"
    And I set the "Name" field to "MRD Created Insurer Account"
    And I set the "Phone" field to "+1-555-0200"
    And I set the "Account_Status__c" field to "Prospect"
    And I set the "Functional_Currency__c" field to "USD"
    And I set the "Region__c" field to "US"
    And I save the Account record
    Then the Account record should be saved successfully
    When I navigate to the created Account record
    And the "Type" field should display "Insurer"

  @MRD-FLS-UI-013 @account-type @agency @priority-2 @detail-page
  Scenario: UI - MRD FLS validation for Agency Account Type on detail page
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Agency Account |
      | Type | Agency |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And validate all Account fields visibility against MRD FLS matrix on detail page
    # Validates that MRD can view appropriate fields for Agency Account Type

  @MRD-FLS-UI-014 @account-type @agency @priority-2 @edit-form
  Scenario: UI - MRD FLS validation for Agency Account Type on edit form
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS Agency Account |
      | Type | Agency |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I navigate to the Account record
    And I click Edit on the Account
    Then validate all Account fields editability against MRD FLS matrix on edit form
    # Validates that MRD can edit appropriate fields for Agency Account Type

  @MRD-FLS-UI-015 @account-type @agency @priority-2 @create-form
  Scenario: UI - MRD can create Agency Account with editable fields
    When I navigate to the Account object
    And I click New to create an Account
    Then the "Type" field should be visible
    And the "Type" field should be editable
    When I set the "Type" field to "Agency"
    And I set the "Name" field to "MRD Created Agency Account"
    And I set the "Phone" field to "+1-555-0300"
    And I set the "Account_Status__c" field to "Prospect"
    And I set the "Functional_Currency__c" field to "USD"
    And I set the "Region__c" field to "US"
    And I save the Account record
    Then the Account record should be saved successfully
    When I navigate to the created Account record
    And the "Type" field should display "Agency"

  @MRD-FLS-UI-016 @account-type @other-types @priority-3 @detail-page
  Scenario Outline: UI - MRD FLS validation for other Account Types on detail page
    Given I have an Account created as "mrd" user with:
      | Name | MRD FLS <account_type> Account |
      | Type | <account_type> |
      | Account_Status__c | Active |
      | Functional_Currency__c | USD |
      | Region__c | US |
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And validate all Account fields visibility against MRD FLS matrix on detail page
    # Validates that MRD can view appropriate fields for <account_type> Account Type

  Examples:
    | account_type |
    | Non - Member MGA |

  @MRD-FLS-UI-017 @account-type @other-types @priority-3 @create-form
  Scenario Outline: UI - MRD can create other Account Types with editable fields
    When I navigate to the Account object
    And I click New to create an Account
    Then the "Type" field should be visible
    And the "Type" field should be editable
    When I set the "Type" field to "<account_type>"
    And I set the "Name" field to "MRD Created <account_type> Account"
    And I set the "Account_Status__c" field to "Prospect"
    And I set the "Functional_Currency__c" field to "USD"
    And I set the "Region__c" field to "US"
    And I save the Account record
    Then the Account record should be saved successfully
    When I navigate to the created Account record
    And the "Type" field should display "<account_type>"

  Examples:
    | account_type |
    | Non - Member MGA |

  # ============================================================================
  # COMPREHENSIVE FIELD VALIDATION - All Fields from Excel
  # ============================================================================
  # This scenario validates all fields from the Excel file on both detail and edit forms

  @MRD-FLS-UI-018 @comprehensive @all-fields @detail-page
  Scenario: UI - MRD FLS validation for all Account fields on detail page
    Given I have an Account created as "mrd" user
    When I navigate to the Account record
    Then Verify that Test Account is displayed
    And validate all Account fields visibility against MRD FLS matrix on detail page
    # This step will iterate through all fields from fls-matrix.json
    # and validate visibility for each field on the detail page

  @MRD-FLS-UI-019 @comprehensive @all-fields @edit-form
  Scenario: UI - MRD FLS validation for all Account fields on edit form
    Given I have an Account created as "mrd" user
    When I navigate to the Account record
    And I click Edit on the Account
    Then validate all Account fields editability against MRD FLS matrix on edit form
    # This step will iterate through all fields from fls-matrix.json
    # and validate editability for each field on the edit form

  @MRD-FLS-UI-020 @comprehensive @all-fields @create-form
  Scenario: UI - MRD FLS validation for all Account fields on create form
    When I navigate to the Account object
    And I click New to create an Account
    Then validate all Account fields visibility against MRD FLS matrix on create form
    # This step will iterate through all fields from fls-matrix.json
    # and validate visibility/editability for each field on the create form

