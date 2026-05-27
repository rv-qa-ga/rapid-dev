# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-467 - Account Page Layout/Fields Updates
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-01-14T02:07:06.957Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 1
# Description: User Scenarios Only - Only user-provided scenarios are used, no generator scenarios
# User Scenarios Provided: 20
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Account Page Layout/Fields Updates
# Primary Entity: Account
#
# Fields Involved (24):
#   • Account Name (Account_Name) - validate
#   • Phone (Phone) - show
#   • Website (Website) - show
#   • Ticker Symbol (Ticker_Symbol__c) - show
#   • Type (Type) - validate
#   • Account_Status__c (Account_Status__c) - show
#   • Ownership (Ownership) - validate
#   • NumberOfEmployees (NumberOfEmployees__c) - show
#   • Billing Address (Billing_Address__c) - validate
#   • PTY_Code__c (PTY_Code__c) - show
#   • Party_Code__c (Party_Code__c) - show
#   • Primary_Contact__c (Primary_Contact__c) - show
#   • Member_Previously_Known_As_Name__c (Member_Previously_Known_As_Name__c) - show
#   • Description__c (Description__c) - show
#   • Region__c (Region__c) - show
#   • Distribution_Region__c (Distribution_Region__c) - show
#   • Data_Source_Written__c (Data_Source_Written__c) - show
#   • Data_Source_Claims__c (Data_Source_Claims__c) - show
#   • Written_Accounting_Period_Effective_From__c (Written_Accounting_Period_Effective_From__c) - show
#   • Claims_Production_Period_Effective_From__c (Claims_Production_Period_Effective_From__c) - show
#   • Admission_Status__c (Admission_Status__c) - hide
#   • Functional_Currency__c (Functional_Currency__c) - show
#   • Affiliate_Non_Affiliate__c (Affiliate_Non_Affiliate__c) - show
#   • Dataverse_ID__c (Dataverse_ID__c) - hide
#
# Account Types Involved (17):
#   • Acquisition Company
#   • Agency
#   • Agency Branch
#   • Distribution Partner
#   • Group
#   • Insurer
#   • Insurer Branch
#   • Legal Entity
#   • Member
#   • Non-Member MGA
#   • Placing Broker
#   • Reinsurance Broker
#   • Reinsurer
#   • Reinsurer Branch
#   • Service Company
#   • Third Party Administrator (TPA)
#   • TPA Group
#
# Test Requirements (25):
#   REQ-1: Verify Account Type field dropdown shows all 17 Account Types: Ac
#     → Test Type: UI | Priority: p1
#   REQ-2: Verify "Account Name" is mandatory on Account creation (for all 1
#     → Test Type: UI | Priority: p1
#   REQ-3: Verify "Phone" is visible on Account page layout for all Account 
#     → Test Type: UI | Priority: p1
#   REQ-4: Verify "Website" is visible on Account page layout for all Accoun
#     → Test Type: UI | Priority: p1
#   REQ-5: Verify "Ticker Symbol" is visible on Account page layout for all 
#     → Test Type: UI | Priority: p1
#   REQ-6: Verify "Type" is mandatory on Account creation (for all 17 Accoun
#     → Test Type: UI | Priority: p1
#   REQ-7: Verify "Account_Status__c" is visible on Account page layout for 
#     → Test Type: UI | Priority: p1
#   REQ-8: Verify "Ownership" is mandatory on Account creation (for all 17 A
#     → Test Type: UI | Priority: p1
#   REQ-9: Verify "NumberOfEmployees" is visible on Account page layout for 
#     → Test Type: UI | Priority: p1
#   REQ-10: Verify "Billing Address" is mandatory on Account creation (for al
#     → Test Type: UI | Priority: p1
#   REQ-11: Verify "PTY_Code__c" is visible on Account page layout for all Ac
#     → Test Type: UI | Priority: p1
#   REQ-12: Verify "Party_Code__c" is visible on Account page layout for all 
#     → Test Type: UI | Priority: p1
#   REQ-13: Verify "Primary_Contact__c" is visible on Account page layout for
#     → Test Type: UI | Priority: p1
#   REQ-14: Verify "Member_Previously_Known_As_Name__c" is visible on Account
#     → Test Type: UI | Priority: p1
#   REQ-15: Verify "Description__c" is visible on Account page layout for all
#     → Test Type: UI | Priority: p1
#   REQ-16: Verify "Region__c" is visible on Account page layout for all Acco
#     → Test Type: UI | Priority: p1
#   REQ-17: Verify "Distribution_Region__c" is visible on Account page layout
#     → Test Type: UI | Priority: p1
#   REQ-18: Verify "Data_Source_Written__c" is visible on Account page layout
#     → Test Type: UI | Priority: p1
#   REQ-19: Verify "Data_Source_Claims__c" is visible on Account page layout 
#     → Test Type: UI | Priority: p1
#   REQ-20: Verify "Written_Accounting_Period_Effective_From__c" is visible o
#     → Test Type: UI | Priority: p1
#   REQ-21: Verify "Claims_Production_Period_Effective_From__c" is visible on
#     → Test Type: UI | Priority: p1
#   REQ-22: Verify "Admission_Status__c" is hidden on Account page layout (fo
#     → Test Type: UI | Priority: p2
#   REQ-23: Verify "Functional_Currency__c" is visible on Account page layout
#     → Test Type: UI | Priority: p1
#   REQ-24: Verify "Affiliate_Non_Affiliate__c" is visible on Account page la
#     → Test Type: UI | Priority: p1
#   REQ-25: Verify "Dataverse_ID__c" is hidden on Account page layout (for al
#     → Test Type: UI | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# API TESTS - Comprehensive Coverage
#
# VALID VALUES FOR API TESTING:
#   • Phone
#   • Visible
#   • Website
#   • Ticker Symbol
#   • Ownership
#   • Billing Address
#   • Rating
#   • Email Address
#   • Fax
#   • Site
#   • Industry
#   • SIC
#   • Shipping Address
#   • Mandatory
#   • Hidden
#
# NEGATIVE/BOUNDARY:
#   - Invalid values rejected
#   - Null/blank handling
#   - Field-level security
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-467 @medium @field-visibility @account
Feature: API - SF-467 - Account Page Layout/Fields Updates

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # USER-PROVIDED SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-001 @universal @positive @p2
  Scenario Outline: API - Universal fields are visible for any Account Type
    Given I am creating an Account with Type "<AccountType>"
    When The Account page layout renders
    Then The following fields are visible:
      | Field                                      |
      | Account Name                               |
      | Phone                                      |
      | Website                                    |
      | Ticker Symbol                              |
      | Type                                       |
      | Account_Status__c                          |
      | Ownership                                  |
      | NumberOfEmployees                          |
      | Billing Address                            |
      | PTY_Code__c                                |
      | Party_Code__c                              |
      | Primary_Contact__c                         |
      | Member_Previously_Known_As_Name__c         |
      | Description__c                             |
      | Region__c                                  |
      | Distribution_Region__c                     |
      | Data_Source_Written__c                     |
      | Data_Source_Claims__c                      |
      | Written_Accounting_Period_Effective_From__c|
      | Claims_Production_Period_Effective_From__c |
      | Admission_Status__c                        |
      | Functional_Currency__c                     |
      | Affiliate_Non_Affiliate__c                 |
    And "Account Name" is marked mandatory
    And "Type" is marked mandatory
    And "Ownership" is marked mandatory
    And "Billing Address" is visible

    Examples:
      | AccountType              |
      | Acquisition Company      |
      | Agency                   |
      | Agency Branch            |
      | Distribution Partner     |
      | Group                    |
      | Insurer                  |
      | Insurer Branch           |
      | Legal Entity             |
      | Member                   |
      | Non-Member MGA           |
      | Placing Broker           |
      | Reinsurance Broker       |
      | Reinsurer                |
      | Reinsurer Branch         |
      | Service Company          |
      | Third Party Administrator (TPA) |
      | TPA Group                |

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-002 @universal @negative @p2
  Scenario Outline: API - Universal mandatory fields block save when missing
    Given I am creating an Account with Type "<AccountType>"
    And I leave "Account Name" blank
    And I leave "Type" blank
    And I leave "Ownership" blank
    When I attempt to save the Account
    Then The save is blocked
    And I see validation messages indicating the missing mandatory fields:
      | Field        |
      | Account Name |
      | Type         |
      | Ownership    |

    Examples:
      | AccountType |
      | Member      |
      | Insurer     |
      | Third Party Administrator (TPA) |

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-003 @p2
  Scenario: API - Billing Country is mandatory as part of Billing Address
    Given I am creating an Account with Type "Agency"
    Given I populate Billing Street, Billing City, and Billing Postal Code
    Given I leave Billing Country blank
    When I attempt to save the Account
    Then The save is blocked
    Then I see a validation message that Billing Country is mandatory

  

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario can be tested via API or UI; defaulting to API for efficiency. Consider adding 1-2 P0 UI smoke tests.
  # Status: READY

  @SF-467 @SF-467-API-004 @p2
  Scenario: API - Region__c and Distribution_Region__c are auto-populated
    Given I am creating an Account with Type "Distribution Partner"
    Given I populate the Billing Address including Billing Country
    When The record is saved successfully
    Then "Region__c" is populated automatically
    Then "Distribution_Region__c" is populated automatically

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario can be tested via API or UI; defaulting to API for efficiency. Consider adding 1-2 P0 UI smoke tests.
  # Status: READY

  @SF-467 @SF-467-API-005 @p2
  Scenario: API - Users cannot manually override auto-populated Region fields if configured read-only
    Given I am editing an existing Account of Type "Distribution Partner"
    When I attempt to manually change "Region__c" or "Distribution_Region__c"
    Then The system prevents the edit or reverts the values to the auto-populated values

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-006 @p2
  Scenario: API - Globally hidden fields are not populated by user interaction
    Given I am editing an existing Account of Type "Member"
    When I save the record after editing visible fields only
    Then The globally hidden fields remain blank or unchanged
    Then No validation rule requires or references any globally hidden field during save

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-007 @p2
  Scenario: API - Dataverse_ID__c is not enforced by SF-467 validation rules
    Given I am creating an Account with Type "Insurer"
    When The Account page layout renders
    Then "Dataverse_ID__c" is not required by any SF-467 validation rule
    Then Any absence of "Dataverse_ID__c" does not block save for this story scope

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario can be tested via API or UI; defaulting to API for efficiency. Consider adding 1-2 P0 UI smoke tests.
  # Status: READY

  @SF-467 @SF-467-API-008 @p2
  Scenario: API - Lead-sourced fields are auto-populated for Member / Non-Member MGA
    Given I create a Member Account from a converted Lead that has values for:
    When The Account is created
    Then Those fields are populated on the Account
    Then The user is not required to manually enter them

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-009 @p2
  Scenario: API - Onboarded_Date__c is mandatory to exit Contracting stage for Member accounts
    Given I am editing an existing Account of Type "Member"
    Given The Account is in the "Contracting" stage transition flow
    Given "Onboarded_Date__c" is blank
    When I attempt to move the Account out of the Contracting stage
    Then The transition is blocked
    Then I see a validation message that "Onboarded_Date__c" is required to exit Contracting

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario can be tested via API or UI; defaulting to API for efficiency. Consider adding 1-2 P0 UI smoke tests.
  # Status: READY

  @SF-467 @SF-467-API-010 @admission-status @negative @p2
  Scenario Outline: API - Users cannot modify Admission_Status__c for non-Insurer accounts if it is hidden/system-managed
    Given I have an existing Account of Type "<AccountType>" with Admission_Status__c = "Not Applicable"
    When I attempt to update Admission_Status__c via UI or inline edit
    Then The UI does not allow the field to be edited or it remains unchanged after save

    Examples:
      | AccountType              |
      | Member                   |
      | Agency                   |
      | Group                    |
      | Third Party Administrator (TPA) |

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-011 @p2
  Scenario: API - Save is blocked when Data_Source_Written__c is missing for Member Onboarding
    Given I am creating an Account with Type "Member"
    Given I set "Account_Status__c" to "Onboarding"
    Given I provide all other mandatory fields
    Given I leave "Data_Source_Written__c" blank
    When I attempt to save the Account
    Then The save is blocked
    Then I see a validation message that "Data_Source_Written__c" is required

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-012 @p2
  Scenario: API - Save is blocked when Data_Source_Claims__c is missing for TPA Onboarding
    Given I am creating an Account with Type "Third Party Administrator (TPA)"
    Given I set "Account_Status__c" to "Onboarding"
    Given I provide all other mandatory fields
    Given I leave "Data_Source_Claims__c" blank
    When I attempt to save the Account
    Then The save is blocked
    Then I see a validation message that "Data_Source_Claims__c" is required

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-013 @layout @regression @p2
  Scenario Outline: API - Changing Account Type updates field visibility and requirements dynamically
    Given I am creating an Account with Type "<InitialType>"
    When I change the Account Type to "<NewType>"
    Then The page layout updates to the dedicated layout for "<NewType>"
    And Fields specific to "<InitialType>" are hidden if not applicable to "<NewType>"
    And Fields specific to "<NewType>" become visible and required as per rules

    Examples:
      | InitialType | NewType                |
      | Member      | Agency                 |
      | Agency      | Insurer                |
      | Insurer     | Member                 |
      | Third Party Administrator (TPA) | TPA Group              |

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario can be tested via API or UI; defaulting to API for efficiency. Consider adding 1-2 P0 UI smoke tests.
  # Status: READY

  @SF-467 @SF-467-API-014 @p2
  Scenario: API - Account Type cannot be set to an unapproved value
    Given I am creating an Account
    When I attempt to set "Type" to a value not in the approved picklist
    Then The system prevents selection or blocks save
    Then I see an error indicating the value is not allowed

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario tests business rules, validations, or data integrity via API
  # Status: READY

  @SF-467 @SF-467-API-015 @p2
  Scenario: API - Switching to Insurer enforces Admission Status and Functional Currency immediately
    Given I am creating an Account with Type "Agency"
    Given I have filled only the universal required fields
    When I change the Account Type to "Insurer"
    When I attempt to save without populating those fields
    Then "Admission_Status__c" becomes visible and mandatory
    Then "Functional_Currency__c" becomes mandatory
    Then The save is blocked with messages for both missing fields

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: API
  # Classification Rationale: Scenario can be tested via API or UI; defaulting to API for efficiency. Consider adding 1-2 P0 UI smoke tests.
  # Status: READY

  @SF-467 @SF-467-API-016 @corner @negative @p2
  Scenario: API - Switching from Insurer to non-Insurer hides Admission Status and sets default
    Given I am editing an existing Account with Type "Insurer"
    And "Admission_Status__c" is populated
    When I change the Account Type to "Agency"
    Then "Admission_Status__c" is hidden
    And Upon save "Admission_Status__c" is set to "Not Applicable" (per defaulting rules) if system-managed

  # ══════════════════════════════════════════════════════════════════════════
  # HIDDEN FIELDS - Comprehensive List
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-API-017 @hidden @layout @p2
  Scenario Outline: API - Globally hidden fields do not appear on any Account page layout
    Given I am creating or editing an Account with Type "<AccountType>"
    When The Account page layout renders
    Then None of the following fields are visible anywhere on the page:
      | Field                          |
      | Rating                         |
      | Email Address                  |
      | Fax                            |
      | AccountNumber                  |
      | Site                           |
      | Industry                       |
      | SIC                            |
      | Shipping Address               |
      | Number_of_Locations__c         |
      | Investment_Status__c           |
      | Account_Team_Roles__c          |
      | AccountSource                  |
      | Annual_GWP_Estimate_Year_1__c  |
      | Referring_Contact__c           |
      | POS_FSCS_Exposure__c           |
      | SicDesc                        |
      | Estimated_Onboarding_Date_c   |
      | First_Written_Premium_Date_c   |
      | Reinsurance_Arrangements_c    |
      | FOS_FSCS_Exposure_c            |
      | CurrencyIsoCode                |
      | ParentID                       |

    Examples:
      | AccountType        |
      | Member             |
      | Insurer            |
      | Third Party Administrator (TPA) |

  @SF-467 @SF-467-API-018 @layout @negative @p2
  Scenario: API - Hidden fields are not used by validation logic
    Given I am creating an Account with Type "Member"
    And I provide values for all required visible fields
    When I attempt to save the Account
    Then The save is not blocked by any validation referencing a globally hidden field
    And No error message mentions any globally hidden field name

  # ══════════════════════════════════════════════════════════════════════════
  # MEMBER-ONLY FIELDS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-API-019 @member-only @visibility @positive @p2
  Scenario Outline: API - Member-only fields are visible for Member and Non-Member MGA account types
    Given I am creating an Account with Type "<AccountType>"
    When The Account page layout renders
    Then The following fields are visible:
      | Field                                |
      | AnnualRevenue                        |
      | Upsell_Opportunity__c                |
      | Current_Program_Expiration_Date__c   |
      | Onboarded_Date__c                    |
      | Binding_Authority_Limited__c         |
      | Binding_Authority_Limitation_Reason__c |
      | Runoff__c                            |
      | Runoff_Effective_Date__c             |
      | Closeout_Date__c                     |
      | Runoff_TPA_Date__c                   |
      | Broker_Sourced__c                    |
      | Broker_Sourced_Name__c               |
      | Incumbent_Carrier__c                 |
      | Initiate_Offboarding__c              |
      | Initiate_Runoff__c                   |
      | Proposed_Effective_Date__c           |
      | Target_Insured_Industry_Size__c      |
      | Discontinued_Date__c                 |

    Examples:
      | AccountType    |
      | Member         |
      | Non-Member MGA |

  @SF-467 @SF-467-API-020 @member-only @visibility @negative @p2
  Scenario Outline: API - Member-only fields are hidden for non-Member account types
    Given I am creating an Account with Type "<AccountType>"
    When The Account page layout renders
    Then None of the Member-only fields are visible on the page

    Examples:
      | AccountType              |
      | Insurer                  |
      | Agency                   |
      | Group                    |
      | Third Party Administrator (TPA) |

  @SF-467 @SF-467-API-021 @corner @negative @p2
  Scenario: API - Member-only fields are cleared or ignored when switching away from Member types
    Given I am editing an existing Account of Type "Member"
    And The Account has values in Member-only fields
    When I change the Account Type to "Agency"
    Then Member-only fields are no longer visible
    And They are not required for save
    And Any downstream validation does not reference Member-only fields for the new type

  # ══════════════════════════════════════════════════════════════════════════
  # FUNCTIONAL CURRENCY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-API-022 @functional-currency @positive @p2
  Scenario Outline: API - Functional_Currency__c is mandatory for specific account types
    Given I am creating an Account with Type "<AccountType>"
    When The Account page layout renders
    Then "Functional_Currency__c" is visible
    And "Functional_Currency__c" is marked mandatory

    Examples:
      | AccountType      |
      | Insurer          |
      | Insurer Branch   |
      | Reinsurer        |

  @SF-467 @SF-467-API-023 @functional-currency @negative @p2
  Scenario Outline: API - Save is blocked when Functional_Currency__c is missing for mandatory types
    Given I am creating an Account with Type "<AccountType>"
    And I provide all other mandatory fields
    And I leave "Functional_Currency__c" blank
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message that "Functional_Currency__c" is required

    Examples:
      | AccountType      |
      | Insurer          |
      | Insurer Branch   |
      | Reinsurer        |

  @SF-467 @SF-467-API-024 @functional-currency @positive @p2
  Scenario Outline: API - Functional_Currency__c is optional but visible for other account types
    Given I am creating an Account with Type "<AccountType>"
    When The Account page layout renders
    Then "Functional_Currency__c" is visible
    And "Functional_Currency__c" is not marked mandatory

    Examples:
      | AccountType          |
      | Member               |
      | Agency               |
      | Reinsurer Branch     |
      | Third Party Administrator (TPA) |

  # ══════════════════════════════════════════════════════════════════════════
  # ADMISSION STATUS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-API-025 @admission-status @positive @p2
  Scenario: API - Admission_Status__c is visible and mandatory for Insurer accounts
    Given I am creating an Account with Type "Insurer"
    When The Account page layout renders
    Then "Admission_Status__c" is visible
    And "Admission_Status__c" is marked mandatory

  @SF-467 @SF-467-API-026 @admission-status @negative @p2
  Scenario: API - Save is blocked when Admission_Status__c is missing for Insurer accounts
    Given I am creating an Account with Type "Insurer"
    And I provide all other mandatory fields
    And I leave "Admission_Status__c" blank
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message that "Admission_Status__c" is required

  @SF-467 @SF-467-API-027 @admission-status @positive @p2
  Scenario Outline: API - Admission_Status__c is hidden but populated as "Not Applicable" for non-Insurer accounts
    Given I am creating an Account with Type "<AccountType>"
    When The Account page layout renders
    Then "Admission_Status__c" is not visible on the page
    When I save the Account successfully
    Then "Admission_Status__c" is populated with the default value "Not Applicable"

    Examples:
      | AccountType              |
      | Member                   |
      | Agency                   |
      | Reinsurer                |
      | Third Party Administrator (TPA) |

  # ══════════════════════════════════════════════════════════════════════════
  # AFFILIATE NON-AFFILIATE
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-API-028 @affiliate @positive @p2
  Scenario Outline: API - Affiliate_Non_Affiliate__c is mandatory for selected account types
    Given I am creating an Account with Type "<AccountType>"
    When The Account page layout renders
    Then "Affiliate_Non_Affiliate__c" is visible
    And "Affiliate_Non_Affiliate__c" is marked mandatory

    Examples:
      | AccountType      |
      | Member           |
      | Insurer          |
      | Insurer Branch   |
      | Group            |
      | Reinsurer        |

  @SF-467 @SF-467-API-029 @affiliate @negative @p2
  Scenario Outline: API - Save is blocked when Affiliate_Non_Affiliate__c is missing for mandatory types
    Given I am creating an Account with Type "<AccountType>"
    And I provide all other mandatory fields
    And I leave "Affiliate_Non_Affiliate__c" blank
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message that "Affiliate_Non_Affiliate__c" is required

    Examples:
      | AccountType      |
      | Member           |
      | Insurer          |
      | Group            |

  @SF-467 @SF-467-API-030 @affiliate @positive @p2
  Scenario Outline: API - Affiliate_Non_Affiliate__c is optional for other account types
    Given I am creating an Account with Type "<AccountType>"
    When The Account page layout renders
    Then "Affiliate_Non_Affiliate__c" is visible
    And "Affiliate_Non_Affiliate__c" is not marked mandatory

    Examples:
      | AccountType          |
      | Agency               |
      | Placing Broker       |
      | Legal Entity         |
      | Reinsurer Branch     |
      | Service Company      |
      | Third Party Administrator (TPA) |

  # ══════════════════════════════════════════════════════════════════════════
  # DATA SOURCE AND EFFECTIVE-FROM FIELDS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-API-031 @data-source @positive @p2
  Scenario: API - Data_Source_Written__c is required when Account Type is Member and Status is Onboarding
    Given I am creating an Account with Type "Member"
    And I set "Account_Status__c" to "Onboarding"
    When The Account page layout renders
    Then "Data_Source_Written__c" is visible
    And "Data_Source_Written__c" is marked mandatory

  @SF-467 @SF-467-API-032 @data-source @positive @p2
  Scenario: API - Data_Source_Claims__c is required when Account Type is TPA and Status is Onboarding
    Given I am creating an Account with Type "Third Party Administrator (TPA)"
    And I set "Account_Status__c" to "Onboarding"
    When The Account page layout renders
    Then "Data_Source_Claims__c" is visible
    And "Data_Source_Claims__c" is marked mandatory

  @SF-467 @SF-467-API-033 @effective-from @positive @p2
  Scenario Outline: API - Effective-From fields are required when Data Source is Platform
    Given I am creating an Account with Type "<AccountType>"
    And I set "<DataSourceField>" to "Platform"
    When The Account page layout renders
    Then "<EffectiveFromField>" is visible
    And "<EffectiveFromField>" is marked mandatory

    Examples:
      | AccountType              | DataSourceField         | EffectiveFromField                          |
      | Member                   | Data_Source_Written__c  | Written_Accounting_Period_Effective_From__c |
      | Third Party Administrator (TPA) | Data_Source_Claims__c   | Claims_Production_Period_Effective_From__c  |

  @SF-467 @SF-467-API-034 @effective-from @negative @p2
  Scenario Outline: API - Save is blocked when Platform is selected and Effective-From date is missing
    Given I am creating an Account with Type "<AccountType>"
    And I set "<DataSourceField>" to "Platform"
    And I provide all other mandatory fields
    And I leave "<EffectiveFromField>" blank
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message that "<EffectiveFromField>" is required when "<DataSourceField>" is Platform

    Examples:
      | AccountType              | DataSourceField         | EffectiveFromField                          |
      | Member                   | Data_Source_Written__c  | Written_Accounting_Period_Effective_From__c |
      | Third Party Administrator (TPA) | Data_Source_Claims__c   | Claims_Production_Period_Effective_From__c  |

  @SF-467 @SF-467-API-035 @effective-from @corner @p2
  Scenario Outline: API - Effective-From date must be a valid date and not an invalid format
    Given I am creating an Account with Type "<AccountType>"
    And I set "<DataSourceField>" to "Platform"
    And I enter "<InvalidDate>" into "<EffectiveFromField>"
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message indicating the date is invalid

    Examples:
      | AccountType | DataSourceField        | EffectiveFromField                          | InvalidDate |
      | Member      | Data_Source_Written__c | Written_Accounting_Period_Effective_From__c | 99/99/9999  |
      | Third Party Administrator (TPA)         | Data_Source_Claims__c  | Claims_Production_Period_Effective_From__c  | abc         |

  @SF-467 @SF-467-API-036 @effective-from @corner @p2
  Scenario Outline: API - Changing Data Source away from Platform removes Effective-From requirement
    Given I am editing an existing Account with Type "<AccountType>"
    And "<DataSourceField>" is currently "Platform"
    And "<EffectiveFromField>" is required
    When I change "<DataSourceField>" to "<NonPlatformSource>"
    Then "<EffectiveFromField>" is no longer mandatory
    And I can save without "<EffectiveFromField>" populated (if no other rule requires it)

    Examples:
      | AccountType | DataSourceField         | EffectiveFromField                          | NonPlatformSource |
      | Member      | Data_Source_Written__c  | Written_Accounting_Period_Effective_From__c | Carrier           |
      | Third Party Administrator (TPA)         | Data_Source_Claims__c   | Claims_Production_Period_Effective_From__c  | TPA System        |

  # ══════════════════════════════════════════════════════════════════════════
  # PAGE LAYOUT
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-API-037 @layout @positive @p2
  Scenario Outline: API - Each Account Type has a dedicated page layout and only shows allowed fields
    Given I am creating an Account with Type "<AccountType>"
    When The Account page layout renders
    Then The layout displayed is the dedicated layout for "<AccountType>"
    And It shows only fields that are defined as visible for "<AccountType>"
    And It hides all globally hidden fields
    And It applies conditional visibility rules (Member-only, Insurer-only, etc.)

    Examples:
      | AccountType              |
      | Member                   |
      | Non-Member MGA           |
      | Insurer                  |
      | Reinsurer Branch         |
      | Third Party Administrator (TPA) |
      | TPA Group                |

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST INTEGRITY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-API-038 @picklist @positive @p2
  Scenario: API - Account Type approved values include all required account types
    Given I am creating an Account
    When I open the "Type" picklist
    Then It contains the following values:
      | Value                          |
      | Acquisition Company            |
      | Agency                         |
      | Agency Branch                  |
      | Distribution Partner           |
      | Group                          |
      | Insurer                        |
      | Insurer Branch                 |
      | Legal Entity                   |
      | Member                         |
      | Non-Member MGA                 |
      | Placing Broker                 |
      | Reinsurance Broker             |
      | Reinsurer                      |
      | Reinsurer Branch               |
      | Service Company                |
      | Third Party Administrator (TPA)|
      | TPA Group                      |

  # ══════════════════════════════════════════════════════════════════════════
  # PARENTID
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-API-039 @parentid @regression @p2
  Scenario: API - ParentID remains hidden and does not influence validation in SF-467
    Given I am creating an Account with Type "Third Party Administrator (TPA)"
    When The Account page layout renders
    Then "ParentID" is not visible
    And I can save without any validation mentioning "ParentID"


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 84
  # Existing Steps Used: 84
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 84/84 (100%)
  #   - Feature-Specific Steps Used: 0
