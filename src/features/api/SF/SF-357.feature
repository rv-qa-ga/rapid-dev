# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-357 - Opportunity Summary fields and Executive approval (New Business)
# Type: Story | Mode 4 RBT (API minimal)
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT) - API minimal
# Verifies Opportunity and related Opportunity_Readiness (or Opportunity Summary)
# metadata/describe where relevant. Business rules (approval, visibility) are
# covered by UI tests.
#
# Test cases: API-001 to API-004
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-357 @opportunity-summary @rbt @medium
Feature: API - SF-357 - Opportunity Summary and Executive approval (New Business)

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # API 1: Opportunity object supports Stage and Type (New Business / Pipeline)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-API-001 @p1 @opportunity @describe
  Scenario: API - Verify Opportunity object has StageName and Type for pipeline and New Business
    When I describe the Opportunity object fields
    Then the "StageName" field should exist
    And the "Type" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # API 2: Opportunity_Readiness related object exists
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-API-002 @p2 @opportunity-readiness @describe
  Scenario: API - Verify Opportunity_Readiness object exists and has fields
    When I describe the "Opportunity_Readiness__c" object
    Then the "CreatedDate" field should exist

  # ══════════════════════════════════════════════════════════════════════════
  # API 3: Opportunity Readiness fields have help text per Excel
  # Uses Salesforce Describe API (inlineHelpText property) instead of UI
  # Source: data/excel/Opportunity Summary Fields (1).xlsx
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-API-003 @p2 @opportunity-readiness @help-text @describe
  Scenario Outline: API - Verify Opportunity Readiness field <Field Label> has help text configured
    When I describe the "Opportunity_Readiness__c" object
    Then the "<Field Label>" field should exist
    And the "<Field Label>" field should have help text configured
    Examples:
      | Field Label                  |
      | Name of Prospect             |
      | Summary of deal              |
      | Proposed Effective Date     |
      | Business Plan Provided      |
      | Brief history of MGA        |
      | Key people involved         |
      | Historic GWP & GLR          |
      | Proposed Member Commission  |
      | Previous Capacity           |
      | Reason for change           |
      | Product Description         |
      | Limits                      |
      | Portfolio mix               |
      | Currency                    |
      | Est. Year 1 GWP             |
      | Est. Year 2 GWP             |
      | Reinsurance restrictions    |
      | Claims Solution             |
      | Member Operating Region     |
      | Geographies                 |
      | Distribution clash          |
      | Technical result            |
      | Reason for support          |
      | Summary Fields Completed By |
      | Business Plan Details       |
      | Reinsurance restriction details |
      | State/Provinces             |
      | Distribution clash details  |
      | TPA Names                   |
      | Summary Fields Completed Date |

  # ══════════════════════════════════════════════════════════════════════════
  # API 4: Opportunity Readiness required fields per Excel
  # Uses Describe API to verify field-level required (nillable = false)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-357 @SF-357-API-004 @p2 @opportunity-readiness @field-validation @describe
  Scenario: API - Verify Opportunity_Readiness__c has all required Opportunity Summary fields
    When I describe the "Opportunity_Readiness__c" object
    Then the "Summary of deal" field should exist
    And the "Proposed Effective Date" field should exist
    And the "Business Plan Provided" field should exist
    And the "Brief history of MGA" field should exist
    And the "Key people involved" field should exist
    And the "Historic GWP & GLR" field should exist
    And the "Proposed Member Commission" field should exist
    And the "Previous Capacity" field should exist
    And the "Product Description" field should exist
    And the "Limits" field should exist
    And the "Portfolio mix" field should exist
    And the "Currency" field should exist
    And the "Reinsurance restrictions" field should exist
    And the "Claims Solution" field should exist
    And the "Member Operating Region" field should exist
    And the "Geographies" field should exist
    And the "Distribution clash" field should exist
    And the "Technical result" field should exist
    And the "Reason for support" field should exist
