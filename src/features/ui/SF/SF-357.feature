# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-357 - Opportunity Summary questionnaire and Executive approval
# Type: Story | Mode 4 RBT
# ══════════════════════════════════════════════════════════════════════════════
#
# BUSINESS FLOW CONTEXT (not all steps in scope for this feature):
#   Lead (New) → Funnel → Qualified/Disqualified. When Qualified: Convert Lead
#   → Contact (Active), Account (Prospect), Opportunity (Pipeline). Opportunity
#   moves to Pipeline. If Type = New Business, the Opportunity has an
#   "Opportunity Readiness" link; clicking it opens the Opportunity Summary
#   questionnaire (Opportunity Readiness record). MRD answers all questions,
#   submits for approval. Approval routing is by Account Distribution Region
#   (SF-656 defines approver hierarchy by region). For US, MOU data fields are required after summary
#   approval. Once all approvers approve, Opportunity can move to Due Diligence.
#
# SCOPE: This feature verifies only the Opportunity Summary questionnaire
# (Opportunity Readiness record: completion, guidance message, Submit for
# Approval, and MRD-only permissions). Lead creation and approval routing
# details are out of scope or covered in other stories.
#
# As an MRD I want to complete the Opportunity Summary fields on an Opportunity
# for New Business and obtain Executive approval, so that the Opportunity
# cannot progress to Due Diligence until the prospect has been qualified and
# signed off.
#
# Field list and validations: data/excel/Opportunity Summary Fields (1).xlsx
# Reference data: data/excel/EU Countries and US States and CA Provinces.xlsx
# Permissions: Opportunity_Readiness__c / Accelerant_Opportunity_Readiness_Permission_Set
#
# Test cases: UI-001 to UI-021 (UI), API-001 to API-002 (API)
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-357 @opportunity-summary @opportunity-readiness @executive-approval @mrd @rbt @medium
Feature: SF-357 - Opportunity Summary questionnaire and Executive approval for New Business
  As an MRD
  I want to complete the Opportunity Summary fields on an Opportunity for New Business and obtain Executive approval
  So that the Opportunity for New Business cannot progress to Due Diligence until the prospect has been qualified and signed off

  Background:
    Given I am logged in as a "QA MRD User" user
    # Precondition: An Opportunity in Pipeline with Type New Business exists, with its Opportunity Readiness record (questionnaire) available via the link on the Opportunity layout

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: Opportunity Summary fields must be completed before approval
  # The questionnaire is the Opportunity Readiness record (link from Opportunity).
  # Guidance message shown until all required fields are populated.
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-UI-001 @p1 @opportunity-summary @validation @guidance
  Scenario: Verify guidance message is shown when required Opportunity Summary fields are incomplete
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And one or more required Opportunity Summary fields on the questionnaire are not populated
    Then the system displays the guidance message "Please fill in all the Summary fields before submitting for approval."
    And the guidance message remains visible while required Opportunity Summary fields are incomplete
    And the "Submit for Approval" button is not available or the Opportunity Summary is not eligible for submission

  @SF-357 @SF-357-UI-002 @p1 @opportunity-summary @validation @guidance
  Scenario: Verify guidance message is removed and submission is eligible when all required fields are complete
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And all required Opportunity Summary fields on the questionnaire are populated
    Then the system does not display the guidance message "Please fill in all the Summary fields before submitting for approval."
    And the "Submit for Approval" button is available and the Opportunity Summary is eligible to be submitted for approval

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: Submitting the questionnaire sends approval to Executive Team
  # Approval routing (who approves) is per SF-656 approver hierarchy by Account Distribution Region.
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-UI-003 @p1 @opportunity-summary @executive-approval
  Scenario: Verify submitting Opportunity Summary sends approval to Executive Team
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    And all required Opportunity Summary fields on the questionnaire are populated
    When I open the Opportunity Readiness record from the Opportunity
    And I click "Submit for Approval" on the Opportunity Readiness record
    Then the Opportunity Summary is submitted for approval
    And the approval process starts and the approval request is visible in Approval History
    And the approval is routed according to the approver hierarchy defined in SF-656 (Account Distribution Region)

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 3: Only MRDs can complete and submit Opportunity Summary fields
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-UI-004 @p1 @opportunity-summary @permissions @mrd-only
  Scenario: Verify non-MRD user cannot populate or submit Opportunity Summary fields
    Given I am logged in as a "Standard User" user
    And an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And the user attempts to populate or edit the Opportunity Summary fields on the questionnaire
    Then the action is prevented and the user cannot save or submit the Opportunity Summary
    And the user can read the Opportunity Summary fields but not edit them

  @SF-357 @SF-357-UI-005 @p2 @opportunity-summary @permissions
  Scenario: Verify non-MRD user cannot submit Opportunity Summary for approval
    Given I am logged in as a "Standard User" user
    And an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record with all required Opportunity Summary fields already populated by an MRD
    When I open the Opportunity Readiness record from the Opportunity
    And the user attempts to click "Submit for Approval"
    Then the submit for approval action is prevented or the button is not available

  # ══════════════════════════════════════════════════════════════════════════
  # Conditional validations from Excel (Opportunity Summary section on
  # Opportunity Readiness record): Business Plan, Reinsurance, Distribution clash
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-UI-006 @p2 @opportunity-summary @conditional-validation
  Scenario: Verify Business Plan Details is required when Business Plan Provided is Yes
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I set "Business Plan Provided" to "Yes" on the Opportunity Summary section
    Then the "Business Plan Details" field is visible and mandatory
    And I cannot submit for approval until "Business Plan Details" is populated

  @SF-357 @SF-357-UI-007 @p2 @opportunity-summary @conditional-validation
  Scenario: Verify Reinsurance restriction details is required when Reinsurance restrictions is Yes
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I set "Reinsurance restrictions" to "Yes" on the Opportunity Summary section
    Then the "Reinsurance restriction details" field is visible and mandatory
    And I cannot submit for approval until "Reinsurance restriction details" is populated

  @SF-357 @SF-357-UI-008 @p2 @opportunity-summary @conditional-validation
  Scenario: Verify Distribution clash details is required when Distribution clash is Yes
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I set "Distribution clash" to "Yes" on the Opportunity Summary section
    Then the "Distribution clash details" field is visible and mandatory
    And I cannot submit for approval until "Distribution clash details" is populated

  # ══════════════════════════════════════════════════════════════════════════
  # Smoke: Opportunity Readiness questionnaire can be opened from Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-UI-009 @p2 @opportunity-readiness @smoke
  Scenario: Verify MRD can open Opportunity Readiness questionnaire from Opportunity
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    Then I am on the Opportunity Readiness record page
    And the "Opportunity Summary" section is visible
    And the "Submit for Approval" button is visible on the page

  # ══════════════════════════════════════════════════════════════════════════
  # Opportunity Summary Fields - validation per Excel (Opportunity Summary Fields)
  # Source: data/excel/Opportunity Summary Fields (1).xlsx
  # Each field: label, data type, picklist values, mandatory, help text, validation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-UI-014 @p2 @opportunity-summary @field-validation
  Scenario Outline: Verify Opportunity Summary field <Field Label> is visible per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    Then the "<Field Label>" field should be visible in the Opportunity Summary section
    # Data Type per Excel: <Data Type> | Mandatory: <Mandatory>
    # Conditional fields (Business Plan Details, Reinsurance restriction details,
    # TPA Names, State/Provinces, Distribution clash details) are tested in
    # separate conditional-validation scenarios (UI-006 to UI-008, UI-010 to UI-013)
    Examples:
      | Field Label                  | Data Type        | Mandatory |
      | Name of Prospect             | Lookup (Account) | Yes       |
      | Summary of deal              | Long Text Area   | Yes       |
      | Proposed Effective Date      | Date             | Yes       |
      | Business Plan Provided       | Picklist         | Yes       |
      | Brief history of MGA         | Long Text Area   | Yes       |
      | Key people involved          | Long Text Area   | Yes       |
      | Historic GWP & GLR           | Long Text Area   | Yes       |
      | Proposed Member Commission   | Percentage       | Yes       |
      | Previous Capacity            | Long Text Area   | Yes       |
      | Reason for change            | Long Text Area   | No        |
      | Product Description          | Long Text Area   | Yes       |
      | Limits                       | Long Text Area   | Yes       |
      | Portfolio mix                | Long Text Area   | Yes       |
      | Currency                     | CurrencyISO      | Yes       |
      | Est. Year 1 GWP              | Currency(18, 0)  | Yes       |
      | Est. Year 2 GWP              | Currency(18, 0)  | Yes       |
      | Reinsurance restrictions     | Picklist         | Yes       |
      | Claims Solution              | Picklist         | Yes       |
      | Member Operating Region      | Picklist         | Yes       |
      | Geographies                  | Multi-Select     | Yes       |
      | Distribution clash           | Picklist         | Yes       |
      | Technical result             | Long Text Area   | Yes       |
      | Reason for support           | Long Text Area   | Yes       |
      | Summary Fields Completed By  | Name             | No        |

  @SF-357 @SF-357-UI-015 @p2 @opportunity-summary @mandatory-validation
  Scenario Outline: Verify Opportunity Summary field <Field Label> is mandatory per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    Then the "<Field Label>" field should be visible in the Opportunity Summary section
    And the "<Field Label>" field is visible and mandatory
    Examples:
      | Field Label                |
      | Name of Prospect           |
      | Summary of deal            |
      | Proposed Effective Date    |
      | Business Plan Provided    |
      | Brief history of MGA       |
      | Key people involved        |
      | Historic GWP & GLR         |
      | Proposed Member Commission |
      | Previous Capacity          |
      | Product Description        |
      | Limits                     |
      | Portfolio mix              |
      | Currency                   |
      | Est. Year 1 GWP            |
      | Est. Year 2 GWP            |
      | Reinsurance restrictions  |
      | Claims Solution            |
      | Member Operating Region    |
      | Geographies                |
      | Distribution clash        |
      | Technical result           |
      | Reason for support         |

  @SF-357 @SF-357-UI-016 @p2 @opportunity-summary @picklist-validation
  Scenario: Verify Business Plan Provided picklist has only Yes and No per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I click on the "Business Plan Provided" picklist
    Then I should see the following valid picklist values:
      | Yes |
      | No  |

  @SF-357 @SF-357-UI-017 @p2 @opportunity-summary @picklist-validation
  Scenario: Verify Reinsurance restrictions picklist has only Yes and No per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I click on the "Reinsurance restrictions" picklist
    Then I should see the following valid picklist values:
      | Yes |
      | No  |

  @SF-357 @SF-357-UI-018 @p2 @opportunity-summary @picklist-validation
  Scenario: Verify Claims Solution picklist has In-House, TPA, To be defined per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I click on the "Claims Solution" picklist
    Then I should see the following valid picklist values:
      | In-House    |
      | TPA         |
      | To be defined |

  @SF-357 @SF-357-UI-019 @p2 @opportunity-summary @picklist-validation
  Scenario: Verify Member Operating Region picklist has US, CA, UK, EU, UK and EU per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I click on the "Member Operating Region" picklist
    Then I should see the following valid picklist values:
      | US       |
      | CA       |
      | UK       |
      | EU       |
      | UK and EU |

  @SF-357 @SF-357-UI-020 @p2 @opportunity-summary @picklist-validation
  Scenario: Verify Distribution clash picklist has only Yes and No per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I click on the "Distribution clash" picklist
    Then I should see the following valid picklist values:
      | Yes |
      | No  |

  @SF-357 @SF-357-UI-021 @p2 @opportunity-summary @help-text
  Scenario Outline: Verify Opportunity Summary field <Field Label> has help text per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    Then the "<Field Label>" field should have help text
    Examples:
      | Field Label             |
      | Summary of deal          |
      | Proposed Effective Date  |
      | Business Plan Provided   |
      | Brief history of MGA      |
      | Key people involved      |
      | Historic GWP & GLR        |
      | Proposed Member Commission |
      | Previous Capacity        |
      | Product Description      |
      | Limits                   |
      | Portfolio mix            |
      | Currency                 |
      | Reinsurance restrictions |
      | Claims Solution          |
      | Member Operating Region  |
      | Geographies             |
      | Distribution clash       |
      | Technical result         |
      | Reason for support       |

  @SF-357 @SF-357-UI-022 @p2 @opportunity-summary @conditional-validation
  Scenario: Verify TPA Names is required and visible when Claims Solution is TPA per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I set "Claims Solution" to "TPA" on the Opportunity Summary section
    Then the "TPA Names" field is visible and mandatory
    And I cannot submit for approval until "TPA Names" is populated

  @SF-357 @SF-357-UI-023 @p2 @opportunity-summary @conditional-validation
  Scenario: Verify Business Plan Details is not visible when Business Plan Provided is No per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I set "Business Plan Provided" to "No" on the Opportunity Summary section
    Then the "Business Plan Details" field should not be visible in the Opportunity Summary section

  @SF-357 @SF-357-UI-024 @p2 @opportunity-summary @conditional-validation
  Scenario: Verify Reinsurance restriction details is not visible when Reinsurance restrictions is No per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I set "Reinsurance restrictions" to "No" on the Opportunity Summary section
    Then the "Reinsurance restriction details" field should not be visible in the Opportunity Summary section

  @SF-357 @SF-357-UI-025 @p2 @opportunity-summary @conditional-validation
  Scenario: Verify Distribution clash details is not visible when Distribution clash is No per Excel
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    And the Opportunity has an Opportunity Readiness record
    When I open the Opportunity Readiness record from the Opportunity
    And I click Edit on the Opportunity Readiness record
    And I set "Distribution clash" to "No" on the Opportunity Summary section
    Then the "Distribution clash details" field should not be visible in the Opportunity Summary section
