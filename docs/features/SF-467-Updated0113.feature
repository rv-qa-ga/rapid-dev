@sf @accounts @sf-467 @page-layout @field-rules
Feature: Account Page Layout and Field Rules by Account Type
  As an MRD
  I want all Account types to have clearly defined required fields, visibility rules, and validations
  So that users enter complete, consistent, and valid data aligned to the business meaning of each Account type.
  # Source: SF-467 "Account Page Layout/Fields Updates" :contentReference[oaicite:0]{index=0}

  Background:
    Given I am a logged-in Salesforce user with permission to create and edit Accounts
    And I navigate to the Account create or edit page

  # ---------------------------------------------------------------------------
  # Universal configuration: Visible on ALL account types
  # ---------------------------------------------------------------------------

  @universal @positive
  Scenario Outline: Universal fields are visible for any Account Type
    Given I am creating an Account with Type "<AccountType>"
    When the Account page layout renders
    Then the following fields are visible:
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

  @universal @negative
  Scenario Outline: Universal mandatory fields block save when missing
    Given I am creating an Account with Type "<AccountType>"
    And I leave "Account Name" blank
    And I leave "Type" blank
    And I leave "Ownership" blank
    When I attempt to save the Account
    Then the save is blocked
    And I see validation messages indicating the missing mandatory fields:
      | Field        |
      | Account Name |
      | Type         |
      | Ownership    |

    Examples:
      | AccountType |
      | Member      |
      | Insurer     |
      | TPA         |

  @universal @negative
  Scenario: Billing Country is mandatory as part of Billing Address
    Given I am creating an Account with Type "Agency"
    And I populate Billing Street, Billing City, and Billing Postal Code
    And I leave Billing Country blank
    When I attempt to save the Account
    Then the save is blocked
    And I see a validation message that Billing Country is mandatory

  @universal @positive
  Scenario: PTY_Code__c is auto-generated and visible
    Given I am creating an Account with Type "Legal Entity"
    When the record is saved successfully
    Then "PTY_Code__c" is populated with an auto-generated number
    And "PTY_Code__c" remains visible on the page

  @universal @positive
  Scenario: Region__c and Distribution_Region__c are auto-populated
    Given I am creating an Account with Type "Distribution Partner"
    And I populate the Billing Address including Billing Country
    When the record is saved successfully
    Then "Region__c" is populated automatically
    And "Distribution_Region__c" is populated automatically

  @universal @negative
  Scenario: Users cannot manually override auto-populated Region fields if configured read-only
    Given I am editing an existing Account of Type "Distribution Partner"
    When I attempt to manually change "Region__c" or "Distribution_Region__c"
    Then the system prevents the edit or reverts the values to the auto-populated values

  # ---------------------------------------------------------------------------
  # Hidden for ALL account types
  # "must not appear on any page layout, must not be populated, and must not be used in validation logic"
  # Plus: Account Currency (CurrencyIsoCode) is hidden for all account types per comments
  # ---------------------------------------------------------------------------

  @hidden @layout
  Scenario Outline: Globally hidden fields do not appear on any Account page layout
    Given I am creating or editing an Account with Type "<AccountType>"
    When the Account page layout renders
    Then none of the following fields are visible anywhere on the page:
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

    Examples:
      | AccountType        |
      | Member             |
      | Insurer            |
      | Third Party Administrator (TPA) |

  @hidden @data-integrity @negative
  Scenario: Globally hidden fields are not populated by user interaction
    Given I am editing an existing Account of Type "Member"
    When I save the record after editing visible fields only
    Then the globally hidden fields remain blank or unchanged
    And no validation rule requires or references any globally hidden field during save

  @hidden @regression
  Scenario: Country and State/Province fields are not present as standalone fields
    Given I am creating an Account with Type "Agency"
    When the Account page layout renders
    Then there is no standalone "Country" field outside the Billing Address component
    And there is no standalone "State/Province" field outside the Billing Address component

  # Note: Dataverse_ID__c is explicitly handled by another ticket (SF-517), and is out-of-scope here.
  @out-of-scope
  Scenario: Dataverse_ID__c is not enforced by SF-467 validation rules
    Given I am creating an Account with Type "Insurer"
    When the Account page layout renders
    Then "Dataverse_ID__c" is not required by any SF-467 validation rule
    And any absence of "Dataverse_ID__c" does not block save for this story scope

  # ---------------------------------------------------------------------------
  # Conditional visibility: Member and Non-Member MGA only fields
  # ---------------------------------------------------------------------------

  @member-only @visibility @positive
  Scenario Outline: Member-only fields are visible for Member and Non-Member MGA account types
    Given I am creating an Account with Type "<AccountType>"
    When the Account page layout renders
    Then the following fields are visible:
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

  @member-only @visibility @negative
  Scenario Outline: Member-only fields are hidden for non-Member account types
    Given I am creating an Account with Type "<AccountType>"
    When the Account page layout renders
    Then none of the Member-only fields are visible on the page

    Examples:
      | AccountType              |
      | Insurer                  |
      | Agency                   |
      | Group                    |
      | Third Party Administrator (TPA) |

  @member-only @automation
  Scenario: Lead-sourced fields are auto-populated for Member / Non-Member MGA
    Given I create a Member Account from a converted Lead that has values for:
      | Field                           |
      | Broker_Sourced__c               |
      | Broker_Sourced_Name__c          |
      | Incumbent_Carrier__c            |
      | Proposed_Effective_Date__c      |
      | Target_Insured_Industry_Size__c |
    When the Account is created
    Then those fields are populated on the Account
    And the user is not required to manually enter them

  @member-only @stage-gate @negative
  Scenario: Onboarded_Date__c is mandatory to exit Contracting stage for Member accounts
    Given I am editing an existing Account of Type "Member"
    And the Account is in the "Contracting" stage transition flow
    And "Onboarded_Date__c" is blank
    When I attempt to move the Account out of the Contracting stage
    Then the transition is blocked
    And I see a validation message that "Onboarded_Date__c" is required to exit Contracting

  # ---------------------------------------------------------------------------
  # Conditional requirements: Functional Currency
  # ---------------------------------------------------------------------------

  @functional-currency @positive
  Scenario Outline: Functional_Currency__c is mandatory for specific account types
    Given I am creating an Account with Type "<AccountType>"
    When the Account page layout renders
    Then "Functional_Currency__c" is visible
    And "Functional_Currency__c" is marked mandatory

    Examples:
      | AccountType      |
      | Insurer          |
      | Insurer Branch   |
      | Reinsurer        |

  @functional-currency @negative
  Scenario Outline: Save is blocked when Functional_Currency__c is missing for mandatory types
    Given I am creating an Account with Type "<AccountType>"
    And I provide all other mandatory fields
    And I leave "Functional_Currency__c" blank
    When I attempt to save the Account
    Then the save is blocked
    And I see a validation message that "Functional_Currency__c" is required

    Examples:
      | AccountType      |
      | Insurer          |
      | Insurer Branch   |
      | Reinsurer        |

  @functional-currency @positive
  Scenario Outline: Functional_Currency__c is optional but visible for other account types
    Given I am creating an Account with Type "<AccountType>"
    When the Account page layout renders
    Then "Functional_Currency__c" is visible
    And "Functional_Currency__c" is not marked mandatory

    Examples:
      | AccountType          |
      | Member               |
      | Agency               |
      | Reinsurer Branch     |
      | Third Party Administrator (TPA) |

  # ---------------------------------------------------------------------------
  # Conditional visibility & defaulting: Admission Status
  # ---------------------------------------------------------------------------

  @admission-status @positive
  Scenario: Admission_Status__c is visible and mandatory for Insurer accounts
    Given I am creating an Account with Type "Insurer"
    When the Account page layout renders
    Then "Admission_Status__c" is visible
    And "Admission_Status__c" is marked mandatory

  @admission-status @negative
  Scenario: Save is blocked when Admission_Status__c is missing for Insurer accounts
    Given I am creating an Account with Type "Insurer"
    And I provide all other mandatory fields
    And I leave "Admission_Status__c" blank
    When I attempt to save the Account
    Then the save is blocked
    And I see a validation message that "Admission_Status__c" is required

  @admission-status @positive
  Scenario Outline: Admission_Status__c is hidden but populated as "Not Applicable" for non-Insurer accounts
    Given I am creating an Account with Type "<AccountType>"
    When the Account page layout renders
    Then "Admission_Status__c" is not visible on the page
    When I save the Account successfully
    Then "Admission_Status__c" is populated with the default value "Not Applicable"

    Examples:
      | AccountType              |
      | Member                   |
      | Agency                   |
      | Reinsurer                |
      | Third Party Administrator (TPA) |

  @admission-status @negative
  Scenario Outline: Users cannot modify Admission_Status__c for non-Insurer accounts if it is hidden/system-managed
    Given I have an existing Account of Type "<AccountType>" with Admission_Status__c = "Not Applicable"
    When I attempt to update Admission_Status__c via UI or inline edit
    Then the UI does not allow the field to be edited or it remains unchanged after save

    Examples:
      | AccountType              |
      | Member                   |
      | Agency                   |
      | Group                    |
      | Third Party Administrator (TPA) |

  # ---------------------------------------------------------------------------
  # Conditional requirements: Affiliate Non-Affiliate
  # ---------------------------------------------------------------------------

  @affiliate @positive
  Scenario Outline: Affiliate_Non_Affiliate__c is mandatory for selected account types
    Given I am creating an Account with Type "<AccountType>"
    When the Account page layout renders
    Then "Affiliate_Non_Affiliate__c" is visible
    And "Affiliate_Non_Affiliate__c" is marked mandatory

    Examples:
      | AccountType      |
      | Member           |
      | Insurer          |
      | Insurer Branch   |
      | Group            |
      | Reinsurer        |

  @affiliate @negative
  Scenario Outline: Save is blocked when Affiliate_Non_Affiliate__c is missing for mandatory types
    Given I am creating an Account with Type "<AccountType>"
    And I provide all other mandatory fields
    And I leave "Affiliate_Non_Affiliate__c" blank
    When I attempt to save the Account
    Then the save is blocked
    And I see a validation message that "Affiliate_Non_Affiliate__c" is required

    Examples:
      | AccountType      |
      | Member           |
      | Insurer          |
      | Group            |

  @affiliate @positive
  Scenario Outline: Affiliate_Non_Affiliate__c is optional for other account types
    Given I am creating an Account with Type "<AccountType>"
    When the Account page layout renders
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

  # ---------------------------------------------------------------------------
  # Conditional requirements: Data Source fields and Effective-From fields
  # ---------------------------------------------------------------------------

  @data-source @positive
  Scenario: Data_Source_Written__c is required when Account Type is Member and Status is Onboarding
    Given I am creating an Account with Type "Member"
    And I set "Account_Status__c" to "Onboarding"
    When the Account page layout renders
    Then "Data_Source_Written__c" is visible
    And "Data_Source_Written__c" is marked mandatory

  @data-source @negative
  Scenario: Save is blocked when Data_Source_Written__c is missing for Member Onboarding
    Given I am creating an Account with Type "Member"
    And I set "Account_Status__c" to "Onboarding"
    And I provide all other mandatory fields
    And I leave "Data_Source_Written__c" blank
    When I attempt to save the Account
    Then the save is blocked
    And I see a validation message that "Data_Source_Written__c" is required

  @data-source @positive
  Scenario: Data_Source_Claims__c is required when Account Type is TPA and Status is Onboarding
    Given I am creating an Account with Type "Third Party Administrator (TPA)"
    And I set "Account_Status__c" to "Onboarding"
    When the Account page layout renders
    Then "Data_Source_Claims__c" is visible
    And "Data_Source_Claims__c" is marked mandatory

  @data-source @negative
  Scenario: Save is blocked when Data_Source_Claims__c is missing for TPA Onboarding
    Given I am creating an Account with Type "Third Party Administrator (TPA)"
    And I set "Account_Status__c" to "Onboarding"
    And I provide all other mandatory fields
    And I leave "Data_Source_Claims__c" blank
    When I attempt to save the Account
    Then the save is blocked
    And I see a validation message that "Data_Source_Claims__c" is required

  @effective-from @positive
  Scenario Outline: Effective-From fields are required when Data Source is Platform
    Given I am creating an Account with Type "<AccountType>"
    And I set "<DataSourceField>" to "Platform"
    When the Account page layout renders
    Then "<EffectiveFromField>" is visible
    And "<EffectiveFromField>" is marked mandatory

    Examples:
      | AccountType              | DataSourceField         | EffectiveFromField                          |
      | Member                   | Data_Source_Written__c  | Written_Accounting_Period_Effective_From__c |
      | Third Party Administrator (TPA) | Data_Source_Claims__c   | Claims_Production_Period_Effective_From__c  |

  @effective-from @negative
  Scenario Outline: Save is blocked when Platform is selected and Effective-From date is missing
    Given I am creating an Account with Type "<AccountType>"
    And I set "<DataSourceField>" to "Platform"
    And I provide all other mandatory fields
    And I leave "<EffectiveFromField>" blank
    When I attempt to save the Account
    Then the save is blocked
    And I see a validation message that "<EffectiveFromField>" is required when "<DataSourceField>" is Platform

    Examples:
      | AccountType              | DataSourceField         | EffectiveFromField                          |
      | Member                   | Data_Source_Written__c  | Written_Accounting_Period_Effective_From__c |
      | Third Party Administrator (TPA) | Data_Source_Claims__c   | Claims_Production_Period_Effective_From__c  |

  @effective-from @corner
  Scenario Outline: Effective-From date must be a valid date and not an invalid format
    Given I am creating an Account with Type "<AccountType>"
    And I set "<DataSourceField>" to "Platform"
    And I enter "<InvalidDate>" into "<EffectiveFromField>"
    When I attempt to save the Account
    Then the save is blocked
    And I see a validation message indicating the date is invalid

    Examples:
      | AccountType | DataSourceField        | EffectiveFromField                          | InvalidDate |
      | Member      | Data_Source_Written__c | Written_Accounting_Period_Effective_From__c | 99/99/9999  |
      | TPA         | Data_Source_Claims__c  | Claims_Production_Period_Effective_From__c  | abc         |

  @effective-from @corner
  Scenario Outline: Changing Data Source away from Platform removes Effective-From requirement
    Given I am editing an existing Account with Type "<AccountType>"
    And "<DataSourceField>" is currently "Platform"
    And "<EffectiveFromField>" is required
    When I change "<DataSourceField>" to "<NonPlatformSource>"
    Then "<EffectiveFromField>" is no longer mandatory
    And I can save without "<EffectiveFromField>" populated (if no other rule requires it)

    Examples:
      | AccountType | DataSourceField         | EffectiveFromField                          | NonPlatformSource |
      | Member      | Data_Source_Written__c  | Written_Accounting_Period_Effective_From__c | Carrier           |
      | TPA         | Data_Source_Claims__c   | Claims_Production_Period_Effective_From__c  | TPA System        |

  # ---------------------------------------------------------------------------
  # Page layout per Account Type: dedicated layouts and field inclusion/exclusion
  # ---------------------------------------------------------------------------

  @layout @positive
  Scenario Outline: Each Account Type has a dedicated page layout and only shows allowed fields
    Given I am creating an Account with Type "<AccountType>"
    When the Account page layout renders
    Then the layout displayed is the dedicated layout for "<AccountType>"
    And it shows only fields that are defined as visible for "<AccountType>"
    And it hides all globally hidden fields
    And it applies conditional visibility rules (Member-only, Insurer-only, etc.)

    Examples:
      | AccountType              |
      | Member                   |
      | Non-Member MGA           |
      | Insurer                  |
      | Reinsurer Branch         |
      | Third Party Administrator (TPA) |
      | TPA Group                |

  @layout @regression
  Scenario Outline: Changing Account Type updates field visibility and requirements dynamically
    Given I am creating an Account with Type "<InitialType>"
    When I change the Account Type to "<NewType>"
    Then the page layout updates to the dedicated layout for "<NewType>"
    And fields specific to "<InitialType>" are hidden if not applicable to "<NewType>"
    And fields specific to "<NewType>" become visible and required as per rules

    Examples:
      | InitialType | NewType                |
      | Member      | Agency                 |
      | Agency      | Insurer                |
      | Insurer     | Member                 |
      | TPA         | TPA Group              |

  @layout @negative
  Scenario: Hidden fields are not used by validation logic
    Given I am creating an Account with Type "Member"
    And I provide values for all required visible fields
    When I attempt to save the Account
    Then the save is not blocked by any validation referencing a globally hidden field
    And no error message mentions any globally hidden field name

  # ---------------------------------------------------------------------------
  # Picklist integrity (Type must contain full approved picklist values)
  # ---------------------------------------------------------------------------

  @picklist @negative
  Scenario: Account Type cannot be set to an unapproved value
    Given I am creating an Account
    When I attempt to set "Type" to a value not in the approved picklist
    Then the system prevents selection or blocks save
    And I see an error indicating the value is not allowed

  @picklist @positive
  Scenario: Account Type approved values include all required account types
    Given I am creating an Account
    When I open the "Type" picklist
    Then it contains the following values:
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

  # ---------------------------------------------------------------------------
  # Edge / corner cases
  # ---------------------------------------------------------------------------

  @corner @negative
  Scenario: Switching to Insurer enforces Admission Status and Functional Currency immediately
    Given I am creating an Account with Type "Agency"
    And I have filled only the universal required fields
    When I change the Account Type to "Insurer"
    Then "Admission_Status__c" becomes visible and mandatory
    And "Functional_Currency__c" becomes mandatory
    When I attempt to save without populating those fields
    Then the save is blocked with messages for both missing fields

  @corner @negative
  Scenario: Switching from Insurer to non-Insurer hides Admission Status and sets default
    Given I am editing an existing Account with Type "Insurer"
    And "Admission_Status__c" is populated
    When I change the Account Type to "Agency"
    Then "Admission_Status__c" is hidden
    And upon save "Admission_Status__c" is set to "Not Applicable" (per defaulting rules) if system-managed

  @corner @negative
  Scenario: Member-only fields are cleared or ignored when switching away from Member types
    Given I am editing an existing Account of Type "Member"
    And the Account has values in Member-only fields
    When I change the Account Type to "Agency"
    Then Member-only fields are no longer visible
    And they are not required for save
    And any downstream validation does not reference Member-only fields for the new type

  # ---------------------------------------------------------------------------
  # ParentID clarification note (field is globally hidden; story comment indicates it was pending clarification)
  # Keep scenarios flexible in case future stories reintroduce it.
  # ---------------------------------------------------------------------------

  @parentid @regression
  Scenario: ParentID remains hidden and does not influence validation in SF-467
    Given I am creating an Account with Type "Third Party Administrator (TPA)"
    When the Account page layout renders
    Then "ParentID" is not visible
    And I can save without any validation mentioning "ParentID"
