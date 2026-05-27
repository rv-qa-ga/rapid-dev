# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-467 - Account Page Layout/Fields Updates
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-01-14T02:07:06.902Z (FeatureGenerator v3.1)
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
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
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
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-467 @medium @field-visibility @account
Feature: SF-467 - Account Page Layout/Fields Updates
  As a Salesforce user
  I want to verify the  functionality on Account
  So that Account records are managed correctly

  Background:
    Given I log the environment as "MRD User"

  # ══════════════════════════════════════════════════════════════════════════
  # USER-PROVIDED SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: UI
  # Classification Rationale: Scenario requires user interaction, navigation, or UI-specific behavior
  # Status: READY

  @SF-467 @SF-467-UI-001 @p2
  Scenario: PTY_Code__c is auto-generated and visible
    Given I am creating an Account with Type "Legal Entity"
    When The record is saved successfully
    Then "PTY_Code__c" is populated with an auto-generated number
    Then "PTY_Code__c" remains visible on the page
    And I take a screenshot as evidence

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: UI
  # Classification Rationale: Scenario requires user interaction, navigation, or UI-specific behavior
  # Status: READY

  @SF-467 @SF-467-UI-002 @p2
  Scenario: Country and State/Province fields are not present as standalone fields
    Given I am creating an Account with Type "Agency"
    When The Account page layout renders
    Then There is no standalone "Country" field outside the Billing Address component
    Then There is no standalone "State/Province" field outside the Billing Address component
    And I take a screenshot as evidence

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: UI
  # Classification Rationale: Scenario requires user interaction, navigation, or UI-specific behavior
  # Status: READY

  @SF-467 @SF-467-UI-003 @p2
  Scenario: Admission_Status__c is visible and mandatory for Insurer accounts
    Given I am creating an Account with Type "Insurer"
    When The Account page layout renders
    Then "Admission_Status__c" is visible
    Then "Admission_Status__c" is marked mandatory
    And I take a screenshot as evidence

  # Scenario Source: user
  # Generation Mode: 1
  # Classification: UI
  # Classification Rationale: Scenario requires user interaction, navigation, or UI-specific behavior
  # Status: READY

  @SF-467 @SF-467-UI-004 @p2
  Scenario: Data_Source_Claims__c is required when Account Type is TPA and Status is Onboarding
    Given I am creating an Account with Type "Third Party Administrator (TPA)"
    Given I set "Account_Status__c" to "Onboarding"
    When The Account page layout renders
    Then "Data_Source_Claims__c" is visible
    Then "Data_Source_Claims__c" is marked mandatory
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCOUNT TYPE FIELD: Verify all 17 Account Types are available
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-005 @smoke @p1 @account-type-validation
  Scenario: Verify Account Type field dropdown shows all 17 Account Types
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I click on the "Type" picklist
    Then I should see "Acquisition Company" in the "Type" field picklist
    Then I should see "Agency" in the "Type" field picklist
    Then I should see "Agency Branch" in the "Type" field picklist
    Then I should see "Distribution Partner" in the "Type" field picklist
    Then I should see "Group" in the "Type" field picklist
    Then I should see "Insurer" in the "Type" field picklist
    Then I should see "Insurer Branch" in the "Type" field picklist
    Then I should see "Legal Entity" in the "Type" field picklist
    Then I should see "Member" in the "Type" field picklist
    Then I should see "Non-Member MGA" in the "Type" field picklist
    Then I should see "Placing Broker" in the "Type" field picklist
    Then I should see "Reinsurance Broker" in the "Type" field picklist
    Then I should see "Reinsurer" in the "Type" field picklist
    Then I should see "Reinsurer Branch" in the "Type" field picklist
    Then I should see "Service Company" in the "Type" field picklist
    Then I should see "Third Party Administrator (TPA)" in the "Type" field picklist
    Then I should see "TPA Group" in the "Type" field picklist
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-006 @p2 @ui-data-creation
  Scenario: Create Account record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UNIVERSAL FIELDS VISIBILITY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-007 @universal @positive @p1
  Scenario Outline: Universal fields are visible for any Account Type
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
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
    And I take a screenshot as evidence

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
      | Third Party Administrator |
      | TPA Group                |

  @SF-467 @SF-467-UI-008 @universal @negative @p1
  Scenario Outline: Universal mandatory fields block save when missing
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
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
    And I take a screenshot as evidence

    Examples:
      | AccountType |
      | Member      |
      | Insurer     |
      | Third Party Administrator (TPA) |

  # ══════════════════════════════════════════════════════════════════════════
  # HIDDEN FIELDS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-009 @hidden @layout @p2
  Scenario Outline: Globally hidden fields do not appear on any Account page layout
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
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
      | Estimated_Onboarding_Date_c    |
      | First_Written_Premium_Date_c   |
      | Reinsurance_Arrangements_c     |
      | FOS_FSCS_Exposure_c            |
      | CurrencyIsoCode                |
      | ParentID                       |
    And I take a screenshot as evidence

    Examples:
      | AccountType        |
      | Member             |
      | Insurer            |
      | Third Party Administrator (TPA) |

  # ══════════════════════════════════════════════════════════════════════════
  # MEMBER-ONLY FIELDS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-010 @member-only @visibility @positive @p2
  Scenario Outline: Member-only fields are visible for Member and Non-Member MGA account types
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
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
    And I take a screenshot as evidence

    Examples:
      | AccountType    |
      | Member         |
      | Non-Member MGA |

  @SF-467 @SF-467-UI-011 @member-only @visibility @negative @p2
  Scenario Outline: Member-only fields are hidden for non-Member account types
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    When The Account page layout renders
    Then None of the Member-only fields are visible on the page
    And I take a screenshot as evidence

    Examples:
      | AccountType              |
      | Insurer                  |
      | Agency                   |
      | Group                    |
      | Third Party Administrator (TPA) |

  # ══════════════════════════════════════════════════════════════════════════
  # FUNCTIONAL CURRENCY
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-012 @functional-currency @positive @p1
  Scenario Outline: Functional_Currency__c is mandatory for specific account types
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    When The Account page layout renders
    Then "Functional_Currency__c" is visible
    And "Functional_Currency__c" is marked mandatory
    And I take a screenshot as evidence

    Examples:
      | AccountType      |
      | Insurer          |
      | Insurer Branch   |
      | Reinsurer        |

  @SF-467 @SF-467-UI-013 @functional-currency @negative @p1
  Scenario Outline: Save is blocked when Functional_Currency__c is missing for mandatory types
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    And I provide all other mandatory fields
    And I leave "Functional_Currency__c" blank
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message that "Functional_Currency__c" is required
    And I take a screenshot as evidence

    Examples:
      | AccountType      |
      | Insurer          |
      | Insurer Branch   |
      | Reinsurer        |

  @SF-467 @SF-467-UI-014 @functional-currency @positive @p2
  Scenario Outline: Functional_Currency__c is optional but visible for other account types
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    When The Account page layout renders
    Then "Functional_Currency__c" is visible
    And "Functional_Currency__c" is not marked mandatory
    And I take a screenshot as evidence

    Examples:
      | AccountType          |
      | Member               |
      | Agency               |
      | Reinsurer Branch     |
      | Third Party Administrator (TPA) |

  # ══════════════════════════════════════════════════════════════════════════
  # ADMISSION STATUS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-015 @admission-status @negative @p2
  Scenario: Save is blocked when Admission_Status__c is missing for Insurer accounts
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "Insurer"
    And I provide all other mandatory fields
    And I leave "Admission_Status__c" blank
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message that "Admission_Status__c" is required
    And I take a screenshot as evidence

  @SF-467 @SF-467-UI-016 @admission-status @positive @p2
  Scenario Outline: Admission_Status__c is hidden but populated as "Not Applicable" for non-Insurer accounts
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    When The Account page layout renders
    Then "Admission_Status__c" is not visible on the page
    When I save the Account successfully
    Then "Admission_Status__c" is populated with the default value "Not Applicable"
    And I take a screenshot as evidence

    Examples:
      | AccountType              |
      | Member                   |
      | Agency                   |
      | Reinsurer                |
      | Third Party Administrator (TPA) |

  # ══════════════════════════════════════════════════════════════════════════
  # AFFILIATE NON-AFFILIATE
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-017 @affiliate @positive @p1
  Scenario Outline: Affiliate_Non_Affiliate__c is mandatory for selected account types
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    When The Account page layout renders
    Then "Affiliate_Non_Affiliate__c" is visible
    And "Affiliate_Non_Affiliate__c" is marked mandatory
    And I take a screenshot as evidence

    Examples:
      | AccountType      |
      | Member           |
      | Insurer          |
      | Insurer Branch   |
      | Group            |
      | Reinsurer        |

  @SF-467 @SF-467-UI-018 @affiliate @negative @p1
  Scenario Outline: Save is blocked when Affiliate_Non_Affiliate__c is missing for mandatory types
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    And I provide all other mandatory fields
    And I leave "Affiliate_Non_Affiliate__c" blank
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message that "Affiliate_Non_Affiliate__c" is required
    And I take a screenshot as evidence

    Examples:
      | AccountType      |
      | Member           |
      | Insurer          |
      | Group            |

  @SF-467 @SF-467-UI-019 @affiliate @positive @p2
  Scenario Outline: Affiliate_Non_Affiliate__c is optional for other account types
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    When The Account page layout renders
    Then "Affiliate_Non_Affiliate__c" is visible
    And "Affiliate_Non_Affiliate__c" is not marked mandatory
    And I take a screenshot as evidence

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

  @SF-467 @SF-467-UI-020 @data-source @positive @p1
  Scenario: Data_Source_Written__c is required when Account Type is Member and Status is Onboarding
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "Member"
    And I set "Account_Status__c" to "Onboarding"
    When The Account page layout renders
    Then "Data_Source_Written__c" is visible
    And "Data_Source_Written__c" is marked mandatory
    And I take a screenshot as evidence

  @SF-467 @SF-467-UI-021 @effective-from @positive @p2
  Scenario Outline: Effective-From fields are required when Data Source is Platform
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    And I set "<DataSourceField>" to "Platform"
    When The Account page layout renders
    Then "<EffectiveFromField>" is visible
    And "<EffectiveFromField>" is marked mandatory
    And I take a screenshot as evidence

    Examples:
      | AccountType              | DataSourceField         | EffectiveFromField                          |
      | Member                   | Data_Source_Written__c  | Written_Accounting_Period_Effective_From__c |
      | Third Party Administrator (TPA) | Data_Source_Claims__c   | Claims_Production_Period_Effective_From__c  |

  @SF-467 @SF-467-UI-023 @data-source @positive @p2
  Scenario: Data_Source_Claims__c is required when Account Type is TPA and Status is Onboarding
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "Third Party Administrator (TPA)"
    And I set "Account_Status__c" to "Onboarding"
    When The Account page layout renders
    Then "Data_Source_Claims__c" is visible
    And "Data_Source_Claims__c" is marked mandatory
    And I take a screenshot as evidence

  @SF-467 @SF-467-UI-024 @admission-status @positive @p2
  Scenario: Admission_Status__c is visible and mandatory for Insurer accounts
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "Insurer"
    When The Account page layout renders
    Then "Admission_Status__c" is visible
    And "Admission_Status__c" is marked mandatory
    And I take a screenshot as evidence

  @SF-467 @SF-467-UI-025 @effective-from @negative @p2
  Scenario Outline: Save is blocked when Platform is selected and Effective-From date is missing
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    And I set "<DataSourceField>" to "Platform"
    And I provide all other mandatory fields
    And I leave "<EffectiveFromField>" blank
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message that "<EffectiveFromField>" is required when "<DataSourceField>" is Platform
    And I take a screenshot as evidence

    Examples:
      | AccountType              | DataSourceField         | EffectiveFromField                          |
      | Member                   | Data_Source_Written__c  | Written_Accounting_Period_Effective_From__c |
      | Third Party Administrator (TPA) | Data_Source_Claims__c   | Claims_Production_Period_Effective_From__c  |

  @SF-467 @SF-467-UI-026 @effective-from @corner @p2
  Scenario Outline: Effective-From date must be a valid date and not an invalid format
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    And I set "<DataSourceField>" to "Platform"
    And I enter "<InvalidDate>" into "<EffectiveFromField>"
    When I attempt to save the Account
    Then The save is blocked
    And I see a validation message indicating the date is invalid
    And I take a screenshot as evidence

    Examples:
      | AccountType | DataSourceField        | EffectiveFromField                          | InvalidDate |
      | Member      | Data_Source_Written__c | Written_Accounting_Period_Effective_From__c | 99/99/9999  |
      | Third Party Administrator (TPA)         | Data_Source_Claims__c  | Claims_Production_Period_Effective_From__c  | abc         |

  @SF-467 @SF-467-UI-027 @effective-from @corner @p2
  Scenario Outline: Changing Data Source away from Platform removes Effective-From requirement
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to an existing Account with Type "<AccountType>"
    And "<DataSourceField>" is currently "Platform"
    And "<EffectiveFromField>" is required
    When I change "<DataSourceField>" to "<NonPlatformSource>"
    Then "<EffectiveFromField>" is no longer mandatory
    And I can save without "<EffectiveFromField>" populated (if no other rule requires it)
    And I take a screenshot as evidence

    Examples:
      | AccountType | DataSourceField         | EffectiveFromField                          | NonPlatformSource |
      | Member      | Data_Source_Written__c  | Written_Accounting_Period_Effective_From__c | Carrier           |
      | Third Party Administrator (TPA)         | Data_Source_Claims__c   | Claims_Production_Period_Effective_From__c  | TPA System        |

  # ══════════════════════════════════════════════════════════════════════════
  # PAGE LAYOUT
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-022 @layout @positive @p2
  Scenario Outline: Each Account Type has a dedicated page layout and only shows allowed fields
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "<AccountType>"
    When The Account page layout renders
    Then The layout displayed is the dedicated layout for "<AccountType>"
    And It shows only fields that are defined as visible for "<AccountType>"
    And It hides all globally hidden fields
    And It applies conditional visibility rules (Member-only, Insurer-only, etc.)
    And I take a screenshot as evidence

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

  @SF-467 @SF-467-UI-028 @picklist @positive @p2
  Scenario: Account Type approved values include all required account types
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
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
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PARENTID
  # ══════════════════════════════════════════════════════════════════════════

  @SF-467 @SF-467-UI-029 @parentid @regression @p2
  Scenario: ParentID remains hidden and does not influence validation in SF-467
    Given I am logged in as a "Accelerant - System administrator" user
    And I navigate to the Account object list
    And I click New to create a Account
    And I select Account Type "Third Party Administrator (TPA)"
    When The Account page layout renders
    Then "ParentID" is not visible
    And I can save without any validation mentioning "ParentID"
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 25
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (25):
  #   REQ-1: Verify Account Type field dropdown shows all 17 Account Types: Ac
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: Verify "Account Name" is mandatory on Account creation (for all 1
  #     → Should be tested via UI | Priority: p1
  #   REQ-3: Verify "Phone" is visible on Account page layout for all Account 
  #     → Should be tested via UI | Priority: p1
  #   REQ-4: Verify "Website" is visible on Account page layout for all Accoun
  #     → Should be tested via UI | Priority: p1
  #   REQ-5: Verify "Ticker Symbol" is visible on Account page layout for all 
  #     → Should be tested via UI | Priority: p1
  #   REQ-6: Verify "Type" is mandatory on Account creation (for all 17 Accoun
  #     → Should be tested via UI | Priority: p1
  #   REQ-7: Verify "Account_Status__c" is visible on Account page layout for 
  #     → Should be tested via UI | Priority: p1
  #   REQ-8: Verify "Ownership" is mandatory on Account creation (for all 17 A
  #     → Should be tested via UI | Priority: p1
  #   REQ-9: Verify "NumberOfEmployees" is visible on Account page layout for 
  #     → Should be tested via UI | Priority: p1
  #   REQ-10: Verify "Billing Address" is mandatory on Account creation (for al
  #     → Should be tested via UI | Priority: p1
  #   REQ-11: Verify "PTY_Code__c" is visible on Account page layout for all Ac
  #     → Should be tested via UI | Priority: p1
  #   REQ-12: Verify "Party_Code__c" is visible on Account page layout for all 
  #     → Should be tested via UI | Priority: p1
  #   REQ-13: Verify "Primary_Contact__c" is visible on Account page layout for
  #     → Should be tested via UI | Priority: p1
  #   REQ-14: Verify "Member_Previously_Known_As_Name__c" is visible on Account
  #     → Should be tested via UI | Priority: p1
  #   REQ-15: Verify "Description__c" is visible on Account page layout for all
  #     → Should be tested via UI | Priority: p1
  #   REQ-16: Verify "Region__c" is visible on Account page layout for all Acco
  #     → Should be tested via UI | Priority: p1
  #   REQ-17: Verify "Distribution_Region__c" is visible on Account page layout
  #     → Should be tested via UI | Priority: p1
  #   REQ-18: Verify "Data_Source_Written__c" is visible on Account page layout
  #     → Should be tested via UI | Priority: p1
  #   REQ-19: Verify "Data_Source_Claims__c" is visible on Account page layout 
  #     → Should be tested via UI | Priority: p1
  #   REQ-20: Verify "Written_Accounting_Period_Effective_From__c" is visible o
  #     → Should be tested via UI | Priority: p1
  #   REQ-21: Verify "Claims_Production_Period_Effective_From__c" is visible on
  #     → Should be tested via UI | Priority: p1
  #   REQ-22: Verify "Admission_Status__c" is hidden on Account page layout (fo
  #     → Should be tested via UI | Priority: p2
  #   REQ-23: Verify "Functional_Currency__c" is visible on Account page layout
  #     → Should be tested via UI | Priority: p1
  #   REQ-24: Verify "Affiliate_Non_Affiliate__c" is visible on Account page la
  #     → Should be tested via UI | Priority: p1
  #   REQ-25: Verify "Dataverse_ID__c" is hidden on Account page layout (for al
  #     → Should be tested via UI | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 50
  # Existing Steps Used: 50
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 50/50 (100%)
  #   - Feature-Specific Steps Used: 0
