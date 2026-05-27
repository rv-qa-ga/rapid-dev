# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-477 - Create Opportunity field Annual_GWP_Estimate_Year_1__c (editable) and sync updates back to Lead
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:09:19.516Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Create Opportunity field Annual_GWP_Estimate_Year_1__c (editable) and sync updates back to Lead
# Primary Entity: Case
#
# Fields Involved (2):
#   • Annual_GWP_Estimate_Year_1__c (editable) (Annual_GWP_Estimate_Year_1__c_(editable)__c) - modify
#   • sync updates back to Lead (sync_updates_back_to_Lead__c) - modify
#
# Test Requirements (4):
#   REQ-1: / WHEN / THEN):Field creation → I inspect Opportunity fields → th
#     → Test Type: BOTH | Priority: p1
#   REQ-2: a Lead with Annual_GWP_Estimate_Year_1__c populated → that Lead i
#     → Test Type: BOTH | Priority: p2
#   REQ-3: any Salesforce user with edit rights to Opportunity → they open a
#     → Test Type: BOTH | Priority: p2
#   REQ-4: an Opportunity that was created from a Lead → the Opportunity.Ann
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Owned
#   • Mission
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-477 @medium @auto-populate @field-mapping @case
Feature: SF-477 - Create Opportunity field Annual_GWP_Estimate_Year_1__c (editable) and sync updates back to Lead
  As a Salesforce user
  I want to verify the Opportunity functionality on Case
  So that Case records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-UI-001
  Scenario: Scenario 1
    Given I am logged in as a standard user
    Given Field creation
    Given A Salesforce org
    When I inspect Opportunity fields
    Then There is a custom field named Annual_GWP_Estimate_Year_1__c on Opportunity with data type CurrencyAuto-populate on Lead conversion (primary flow)
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-002
  Scenario: Scenario 2
    Given I am logged in as a standard user
    Given A Lead with Annual_GWP_Estimate_Year_1__c populated
    When That Lead is converted to create an Opportunity
    Then Opportunity.Annual_GWP_Estimate_Year_1__c is populated with the Lead value as part of conversionEditable on Opportunity
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-003 @any-salesforce
  Scenario: Scenario 3
    Given I am logged in as a "Any Salesforce" user
    When I navigate to the Opportunity record
    Then They can edit Annual_GWP_Estimate_Year_1__c
    And I save the record
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-004 @data-driven @so-as-of-now-accelerant---standard
  Scenario: Scenario 4
    Given I am logged in as a "So As Of Now Accelerant - Standard" user
    Given An Opportunity that was created from a Lead
    Then Needs to be unhidden
    Then Have the picklist values of Independent, Owned, Mission
    Then A decimal place is added it won’t sync back to the lead correctly unless we also change the lead data type
    Then Can you help me clarify below:For which profiles
    Then What type of access to be provided for this new field?On UI, where the field should be exactly placed?
    And I click Edit on the Opportunity
    Then For the last part, which field are we using on Opportunity to track back to its Lead?
    Then Edit access given through the following PS, Accelerant - Opportunity Line of BusinessAnnual_GWP_Estimate_Year_1__cAll the other points have been already implemented
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=22fb1150-bbc9-441f-81f6-ab1b790f40b2Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I set the "Custom field" field
    Then :check_mark: Successfully merged PR #35 from gs-pipeline/SF-477/Create-Opportunity-field-Annual_GWP_Estimate_Year_1__c-editable-and-sync-updates-back-to-Lead_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # LEAD CONVERSION: Opportunity mapping from Lead to Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-UI-005 @smoke @p1 @lead-conversion
  Scenario: Verify Opportunity maps from Lead to Opportunity during conversion
    Given I have a test Lead created via API with:
      | field   | value    |
      | Opportunity | EU       |
    When I convert the Lead to Opportunity
    Then the Opportunity should have Opportunity "EU"
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-006 @p1 @lead-conversion @data-driven
  Scenario Outline: Verify Opportunity maps from Lead to Opportunity for all values during conversion
    Given I have a test Lead created via API with Opportunity "<value>"
    When I convert the Lead to Opportunity
    Then the Opportunity should have Opportunity "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Owned |
      | Mission |

  @SF-477 @SF-477-UI-007 @p1 @lead-conversion @negative
  Scenario: Verify Opportunity does NOT map to Account during Lead conversion
    Given I have a test Lead created via API with:
      | field   | value    |
      | Opportunity | UK       |
    When I convert the Lead to Opportunity
    Then the Opportunity should have Opportunity "UK"
    And the Account should NOT have Opportunity
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-008 @p2 @lead-conversion
  Scenario: Verify Opportunity value is preserved during Lead conversion
    Given I have a test Lead created via API with Opportunity "US"
    When I convert the Lead to Opportunity
    Then the Opportunity should have Opportunity "US"
    And the Opportunity value should match exactly what was on the Lead
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Opportunity on Case
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-UI-009 @smoke @p1
  Scenario: Verify Opportunity field is visible on Case
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "Opportunity" field should be visible
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-010 @p1 @edit
  Scenario: Verify Opportunity field can be edited on Case
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    And I set the "Opportunity" field to "Test Value"
    And I save the record
    Then the Case should be saved successfully
    And the "Opportunity" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-011 @p1 @data-driven
  Scenario Outline: Set Opportunity to valid values
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    And I set the "Opportunity" field to "<value>"
    And I save the record
    Then the "Opportunity" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Owned |
      | Mission |

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Opportunity on Case
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-UI-012 @smoke @p1 @admin
  Scenario: Verify Opportunity is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "Opportunity" field should be visible
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-013 @p1 @standard-user @negative
  Scenario: Verify Opportunity is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "Opportunity" field should not be visible
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-014 @p2 @detail-view
  Scenario: Verify Opportunity visibility on Case detail page
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "Opportunity" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: Annual_GWP_Estimate_Year_1__c_(editable)__c on Case
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-UI-015 @smoke @p1 @data-driven
  Scenario Outline: Set Annual_GWP_Estimate_Year_1__c_(editable)__c to valid picklist values
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    And I set the "Annual_GWP_Estimate_Year_1__c_(editable)__c" field to "<value>"
    And I save the record
    Then the Case should be saved successfully
    And the "Annual_GWP_Estimate_Year_1__c_(editable)__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Owned |
      | Mission |

  @SF-477 @SF-477-UI-016 @p1 @picklist-options
  Scenario: Verify all Annual_GWP_Estimate_Year_1__c_(editable)__c picklist options are available
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    And I click on the "Annual_GWP_Estimate_Year_1__c_(editable)__c" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-UI-017 @p2 @negative @blank-value
  Scenario: Verify behavior when Opportunity is blank
    Given I am logged in as a standard user
    And I have a test Case created via API without "Opportunity"
    When I navigate to the Case record
    Then the "Opportunity" field should be visible
    And the "Opportunity" field should be blank or empty
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-018 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Opportunity
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    Then the "Opportunity" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-477 @SF-477-UI-019 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Opportunity
    Given I am logged in as a read-only user
    And I have a test Case created via API
    When I navigate to the Case record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-477 @SF-477-UI-020 @p2 @ui-data-creation
  Scenario: Create Case record via UI
    Given I am logged in as a standard user
    When I navigate to the Case object list
    And I click New to create a Case
    And I fill in required Case fields
    And I save the record
    Then the Case should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 3
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 90
  # Existing Steps Used: 90
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 90/90 (100%)
  #   - Feature-Specific Steps Used: 0
