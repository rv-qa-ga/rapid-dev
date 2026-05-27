Feature: Salesforce Account Type Field Visibility, Mandatory Rules, and Validations

  # =========================================================
  # Universal Mandatory Fields
  # =========================================================

  Scenario: Account Name is mandatory for all Account Types
    Given I am creating a new Account
    And I select any Account Type
    When I leave "Account Name" blank
    And I attempt to save the Account
    Then the system should prevent saving
    And I should see a validation message indicating "Account Name" is required

  Scenario: Ownership is mandatory for all Account Types
    Given I am creating a new Account
    And I select any Account Type
    When I leave "Ownership" blank
    And I attempt to save the Account
    Then the system should prevent saving
    And I should see a validation message indicating "Ownership" is required

  Scenario: Billing Country is mandatory for all Account Types
    Given I am creating a new Account
    And I select any Account Type
    When I enter a Billing Address without a Billing Country
    And I attempt to save the Account
    Then the system should prevent saving
    And I should see a validation message indicating "Billing Country" is required

  Scenario: Account Type picklist contains only approved values
    Given I am creating or editing an Account
    When I view the "Type" picklist
    Then only approved Account Type values should be available
    And deprecated or abbreviated values should not be shown

  # =========================================================
  # Universal Visible Fields
  # =========================================================

  Scenario: Universal fields are visible for all Account Types
    Given I am viewing an Account of any Account Type
    Then the following fields should be visible:
      | Account Name |
      | Phone |
      | Website |
      | Ticker Symbol |
      | Type |
      | Account_Status__c |
      | Ownership |
      | NumberOfEmployees |
      | Billing Address |
      | PTY_Code__c |
      | Party_Code__c |
      | Primary_Contact__c |
      | Member_Previously_Known_As_Name__c |
      | Description__c |
      | Region__c |
      | Distribution_Region__c |
      | Data_Source_Written__c |
      | Data_Source_Claims__c |
      | Written_Accounting_Period_Effective_From__c |
      | Claims_Production_Period_Effective_From__c |
      | Functional_Currency__c |
      | Affiliate_Non_Affiliate__c |

  # =========================================================
  # Hidden Fields
  # =========================================================

  Scenario: Globally hidden fields are not visible on any Account Type
    Given I am viewing an Account of any Account Type
    Then the following fields should not be visible:
      | Rating |
      | Email Address |
      | Fax |
      | AccountNumber |
      | Site |
      | Industry |
      | SIC |
      | Shipping Address |
      | Number_of_Locations__c |
      | Investment_Status__c |
      | Account_Team_Roles__c |
      | AccountSource |
      | Annual_GWP_Estimate_Year_1__c |
      | Referring_Contact__c |
      | POS_FSCS_Exposure__c |
      | SicDesc |
      | Estimated_Onboarding_Date_c |
      | First_Written_Premium_Date_c |
      | Reinsurance_Arrangements_c |
      | FOS_FSCS_Exposure_c |
      | CurrencyIsoCode |
      | ParentID |

  Scenario: Hidden fields cannot be populated or validated
    Given I am creating or editing an Account
    When I attempt to populate a hidden field
    Then the field should not be available for input
    And no validation rules should reference hidden fields

  Scenario: Dataverse ID is hidden and integration populated only
    Given I am viewing an Account record
    Then "Dataverse_ID__c" should not be visible to users
    And the field should only be populated via integration

  # =========================================================
  # Admission Status Rules
  # =========================================================

  Scenario: Admission Status is visible and mandatory for Insurer Accounts
    Given I am creating or editing an Account
    And the Account Type is "Insurer"
    Then "Admission_Status__c" should be visible
    And the field should be mandatory

  Scenario: Admission Status is hidden and defaulted for non-Insurer Accounts
    Given I am creating or editing an Account
    And the Account Type is not "Insurer"
    Then "Admission_Status__c" should be hidden
    And the field value should default to "Not Applicable"

  # =========================================================
  # Functional Currency Rules
  # =========================================================

  Scenario Outline: Functional Currency requiredness by Account Type
    Given I am creating or editing an Account
    And the Account Type is "<AccountType>"
    When I attempt to save the Account without "Functional_Currency__c"
    Then the save should be "<Result>"

    Examples:
      | AccountType        | Result              |
      | Insurer            | blocked with error  |
      | Insurer Branch     | blocked with error  |
      | Reinsurer          | blocked with error  |
      | Member             | allowed             |
      | Agency             | allowed             |
      | Service Company    | allowed             |

  # =========================================================
  # Affiliate / Non-Affiliate Rules
  # =========================================================

  Scenario Outline: Affiliate Non-Affiliate requiredness by Account Type
    Given I am creating or editing an Account
    And the Account Type is "<AccountType>"
    When I leave "Affiliate_Non_Affiliate__c" blank
    And I attempt to save the Account
    Then the save should be "<Result>"

    Examples:
      | AccountType        | Result              |
      | Member             | blocked with error  |
      | Insurer            | blocked with error  |
      | Insurer Branch     | blocked with error  |
      | Group              | blocked with error  |
      | Reinsurer          | blocked with error  |
      | Agency             | allowed             |
      | TPA                | allowed             |

  # =========================================================
  # Member and Non-Member MGA Conditional Fields
  # =========================================================

  Scenario: Member and Non-Member MGA fields are visible for Member Accounts
    Given I am creating or editing an Account
    And the Account Type is "Member"
    Then the following fields should be visible:
      | AnnualRevenue |
      | Upsell_Opportunity__c |
      | Current_Program_Expiration_Date__c |
      | Onboarded_Date__c |
      | Binding_Authority_Limited__c |
      | Binding_Authority_Limitation_Reason__c |
      | Runoff__c |
      | Runoff_Effective_Date__c |
      | Closeout_Date__c |
      | Runoff_TPA_Date__c |
      | Broker_Sourced__c |
      | Broker_Sourced_Name__c |
      | Incumbent_Carrier__c |
      | Initiate_Offboarding__c |
      | Initiate_Runoff__c |
      | Proposed_Effective_Date__c |
      | Target_Insured_Industry_Size__c |
      | Discontinued_Date__c |

  Scenario: Member-only fields are hidden for non Member and non Non-Member MGA Accounts
    Given I am creating or editing an Account
    And the Account Type is not "Member" or "Non-Member MGA"
    Then Member-specific fields should not be visible

  Scenario: Onboarded Date is mandatory to exit Contracting stage
    Given I am editing a Member or Non-Member MGA Account
    And the Account Status is "Contracting"
    When I attempt to move to the next stage without "Onboarded_Date__c"
    Then the system should prevent the status change

  # =========================================================
  # Data Source Dependency Rules
  # =========================================================

  Scenario: Data Source Written is required for Member during Onboarding
    Given I am editing an Account
    And the Account Type is "Member"
    And the Account Status is "Onboarding"
    When "Data_Source_Written__c" is empty
    And I attempt to save the Account
    Then the system should prevent saving

  Scenario: Data Source Claims is required for TPA during Onboarding
    Given I am editing an Account
    And the Account Type is "Third Party Administrator (TPA)"
    And the Account Status is "Onboarding"
    When "Data_Source_Claims__c" is empty
    And I attempt to save the Account
    Then the system should prevent saving

  Scenario: Written Accounting Period is required when Written Data Source is Platform
    Given I am editing an Account
    And "Data_Source_Written__c" is "Platform"
    When "Written_Accounting_Period_Effective_From__c" is empty
    And I attempt to save the Account
    Then the system should prevent saving

  Scenario: Claims Production Period is required when Claims Data Source is Platform
    Given I am editing an Account
    And "Data_Source_Claims__c" is "Platform"
    When "Claims_Production_Period_Effective_From__c" is empty
    And I attempt to save the Account
    Then the system should prevent saving

  # =========================================================
  # Page Layout Integrity
  # =========================================================

  Scenario Outline: Each Account Type uses a dedicated layout with correct rules applied
    Given I am viewing an Account
    And the Account Type is "<AccountType>"
    Then the dedicated page layout for "<AccountType>" should be applied
    And only fields allowed for "<AccountType>" should be visible
    And all hidden fields should remain hidden
    And all mandatory and conditional rules should be enforced

    Examples:
      | AccountType |
      | Member |
      | Non-Member MGA |
      | Insurer |
      | Insurer Branch |
      | Reinsurer |
      | Reinsurer Branch |
      | Agency |
      | Agency Branch |
      | Distribution Partner |
      | Group |
      | Legal Entity |
      | Service Company |
      | Third Party Administrator (TPA) |
      | TPA Group |
      | Placing Broker |
      | Reinsurance Broker |
      | Acquisition Company |
