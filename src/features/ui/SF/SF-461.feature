# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-461 - Validation check updates to Accounts page
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2025-12-19T15:09:21.406Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Validation check updates to Accounts page
# Primary Entity: Lead
#
# Test Requirements (3):
#   REQ-1: 'Affiliate_Non_Affiliate_c' field is mandatory for specific accou
#     → Test Type: UI | Priority: p1
#   REQ-2: 'Member Previously Known As Name' field limited to 100 characters
#     → Test Type: UI | Priority: p2
#   REQ-3: Update field label for 'member_previously_known_as_name__c' acros
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
#   • Effective From Fields – Visibility
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-461 @medium @lead
Feature: SF-461 - Validation check updates to Accounts page
  As a Salesforce user
  I want to verify the Affiliate_Non_Affiliate__c functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-461 @SF-461-UI-001 @validation-message-explaining-that-this-field-is-required-for-the-specified-account-types-statuses-the
  Scenario: 'Affiliate_Non_Affiliate_c' field is mandatory for specific account types
    Given I am logged in as a "Validation Message Explaining That This Field Is Required For The Specified Account Types Statuses The" user
    Given The Account Type is one of the following:MemberInsurerInsurer BranchGroup
    Given The Status is either "Active" or "Onboarding"
    And I save the record
    Given The system must require the "Affiliate_Non_Affiliate__c" field to be completed
    Given If the field is blank
    And the record should be saved successfully
    Given Display a validation message explaining that this field is required for the specified Account Types
    Given Statuses
    When I save the record
    When The system must require the "Affiliate_Non_Affiliate__c" field to be completed
    When If the field is blank
    And the record should be saved successfully
    When Display a validation message explaining that this field is required for the specified Account Types
    When Statuses
    Then The system must require the "Affiliate_Non_Affiliate__c" field to be completed
    Then If the field is blank
    Then the record should be saved successfully
    Then Display a validation message explaining that this field is required for the specified Account Types
    Then Statuses
    Then The Status is either "Active" or "Onboarding"
    Then If the field is blank
    Then Display a validation message explaining that this field is required for the specified Account Types and Statuses
    And I take a screenshot as evidence

  @SF-461 @SF-461-UI-002 @negative @error-message-indicating-the-character-limit-has-been-exceeded-the
  Scenario: 'Member Previously Known As Name' field limited to 100 characters
    Given I am logged in as a "Error Message Indicating The Character Limit Has Been Exceeded The" user
    Given The user enters more than 100 characters
    Given The system prevents additional characters from being entered
    And I should see a validation error
    When The user enters more than 100 characters
    When The system prevents additional characters from being entered
    And I should see a validation error
    Then The system prevents additional characters from being entered
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-461 @SF-461-UI-003 @data-driven @lead-is-converted-to-an-account-the-status-is-prospect-on-the-account---this
  Scenario: Update field label for 'member_previously_known_as_name__c' across all Account types
    Given I am logged in as a "Lead Is Converted To An Account The Status Is Prospect On The Account - This" user
    Given Any Account record is displayed
    Given The Account Type can be any of the configured record types
    Given The system renders the field currently labelled "Member Previously Known as Name"
    Given The field label must be displayed as "Party Previously Known as Name"
    Given Effective Date field is required when the data source is changed to Platform - further analysis needed to finalize AC
    Given [SF-510] Build Effective-From Fields on Account
    Given Enforce Validation - Jira
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=75f37703-4fb8-4a90-a466-eed9dca22813Commit notes: Validation rule + Custom field changes
    Given MetadataSource: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given Target: accelins / Salesforce_Devops / /Validation-check-updates-to-Accounts-pageDifference TypeMetadata TypeNameNewValidation ruleAccount.Account_AffiliateNonAffiliateRuleNewCustom fieldAccount.Member_Previously_Known_As_NameNo differenceCustom objectAccount
    Given :check_mark: Successfully merged PR #63 from gs-pipeline/SF-461/Validation-check-updates-to-Accounts-page_-_QA into QA
    When The system renders the field currently labelled "Member Previously Known as Name"
    When The field label must be displayed as "Party Previously Known as Name"
    When Effective Date field is required when the data source is changed to Platform - further analysis needed to finalize AC
    When [SF-510] Build Effective-From Fields on Account
    When Enforce Validation - Jira
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=75f37703-4fb8-4a90-a466-eed9dca22813Commit notes: Validation rule + Custom field changes
    When MetadataSource: Dev (gearsetintegration@accelins.com.sbxcmn)
    When Target: accelins / Salesforce_Devops / /Validation-check-updates-to-Accounts-pageDifference TypeMetadata TypeNameNewValidation ruleAccount.Account_AffiliateNonAffiliateRuleNewCustom fieldAccount.Member_Previously_Known_As_NameNo differenceCustom objectAccount
    When :check_mark: Successfully merged PR #63 from gs-pipeline/SF-461/Validation-check-updates-to-Accounts-page_-_QA into QA
    Then The field label must be displayed as "Party Previously Known as Name"
    Then Effective Date field is required when the data source is changed to Platform - further analysis needed to finalize AC
    Then [SF-510] Build Effective-From Fields on Account
    Then Enforce Validation - Jira
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=75f37703-4fb8-4a90-a466-eed9dca22813Commit notes: Validation rule + Custom field changes
    Then MetadataSource: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /Validation-check-updates-to-Accounts-pageDifference TypeMetadata TypeNameNewValidation ruleAccount.Account_AffiliateNonAffiliateRuleNewCustom fieldAccount.Member_Previously_Known_As_NameNo differenceCustom objectAccount
    Then :check_mark: Successfully merged PR #63 from gs-pipeline/SF-461/Validation-check-updates-to-Accounts-page_-_QA into QA
    Then The Account Type can be any of the configured record types
    Then Enforce Validation - Jira
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Affiliate_Non_Affiliate__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-461 @SF-461-UI-004 @smoke @p1
  Scenario: Verify Affiliate_Non_Affiliate__c field is visible on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Affiliate_Non_Affiliate__c" field should be visible
    And I take a screenshot as evidence

  @SF-461 @SF-461-UI-005 @p1 @edit
  Scenario: Verify Affiliate_Non_Affiliate__c field can be edited on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Affiliate_Non_Affiliate__c" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "Affiliate_Non_Affiliate__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-461 @SF-461-UI-006 @p1 @data-driven
  Scenario Outline: Set Affiliate_Non_Affiliate__c to valid values
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Affiliate_Non_Affiliate__c" field to "<value>"
    And I save the record
    Then the "Affiliate_Non_Affiliate__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Effective From Fields – Visibility |

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Affiliate_Non_Affiliate__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-461 @SF-461-UI-007 @smoke @p1
  Scenario: Verify Affiliate_Non_Affiliate__c field is visible on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Affiliate_Non_Affiliate__c" field should be visible
    And I take a screenshot as evidence

  @SF-461 @SF-461-UI-008 @p1 @edit
  Scenario: Verify Affiliate_Non_Affiliate__c field can be edited on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Affiliate_Non_Affiliate__c" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "Affiliate_Non_Affiliate__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-461 @SF-461-UI-009 @p1 @data-driven
  Scenario Outline: Set Affiliate_Non_Affiliate__c to valid values
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Affiliate_Non_Affiliate__c" field to "<value>"
    And I save the record
    Then the "Affiliate_Non_Affiliate__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Effective From Fields – Visibility |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-461 @SF-461-UI-010 @p2 @negative @blank-value
  Scenario: Verify behavior when Affiliate_Non_Affiliate__c is blank
    Given I am logged in as a standard user
    And I have a test Lead created via API without "Affiliate_Non_Affiliate__c"
    When I navigate to the Lead record
    Then the "Affiliate_Non_Affiliate__c" field should be visible
    And the "Affiliate_Non_Affiliate__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-461 @SF-461-UI-011 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Affiliate_Non_Affiliate__c
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Affiliate_Non_Affiliate__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-461 @SF-461-UI-012 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Affiliate_Non_Affiliate__c
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-461 @SF-461-UI-013 @p2 @ui-data-creation
  Scenario: Create Lead record via UI
    Given I am logged in as a standard user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: 'Affiliate_Non_Affiliate_c' field is mandatory for specific accou
  #     → Should be tested via UI | Priority: p1
  #   REQ-2: 'Member Previously Known As Name' field limited to 100 characters
  #     → Should be tested via UI | Priority: p2
  #   REQ-3: Update field label for 'member_previously_known_as_name__c' acros
  #     → Should be tested via UI | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 86
  # Existing Steps Used: 86
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 86/86 (100%)
  #   - Feature-Specific Steps Used: 0
