# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-493 - Unhide and delete fields in opportunity - consolidation
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:09:10.876Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: This requires changes to Field-Level Security (FLS), page layouts, Lightning record pages / Dynamic Forms, compact layouts, search layouts, list views, reports, and API access.
# Primary Entity: Contract
#
# Fields Involved (1):
#   • and delete fields in opportunity - consolidation (and_delete_fields_in_opportunity_-_consolidation__c) - delete
#
# Test Requirements (5):
#   REQ-1: / WHEN / THEN):A — Unhide Acceptance CriteriaField visibility (UI
#     → Test Type: BOTH | Priority: p1
#   REQ-2: org profiles → FLS is updated → the two fields are readable (
#     → Test Type: UI | Priority: p2
#   REQ-3: dynamic forms or page layouts exist → standard users view or sear
#     → Test Type: BOTH | Priority: p2
#   REQ-4: standard users with reporting/API access → they build reports or 
#     → Test Type: BOTH | Priority: p2
#   REQ-5: the change is deployed → I inspect object schemas across the org 
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-493 @medium @field-visibility @contract
Feature: SF-493 - Unhide and delete fields in opportunity - consolidation
  As a Salesforce user
  I want to verify the two functionality on Contract
  So that Contract records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-493 @SF-493-UI-001 @non-admin-user
  Scenario: Scenario 1
    Given I am logged in as a "Non-Admin User" user
    Given A — Unhide Acceptance CriteriaField visibility (UI)
    When I navigate to the Opportunity record
    Then Annual_GWP_Estimate_Year_1_c
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-002 @data-driven @org
  Scenario: Scenario 2
    Given I am logged in as a "Org" user
    Then The two fields are readable (
    Then Editable where appropriate) for approved non-admin profiles
    Then Remain visible to System Administrators
    Then Support rolesLightning pages, compact layouts & search
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-003 @negative @data-driven @dynamic-forms-or-page-layouts-exist-standard
  Scenario: Scenario 3
    Given I am logged in as a "Dynamic Forms Or Page Layouts Exist Standard" user
    When Standard users view or search records
    Then The two fields appear in the configured record pages, compact highlights
    Then Search results for eligible accounts; no component errors occurReports & API access
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-004 @standard-user
  Scenario: Scenario 4
    Given I am logged in as a "Standard User" user
    When They build reports or run API queries (with credentials that have FLS)
    Then The two fields are available in report field pickers
    Then Returned in API responses per FLSB — Delete Acceptance CriteriaOpportunity-only deletion
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-005 @data-driven @ahemaiti-subate-the-access-should-be-for-accelerant---standard
  Scenario: Scenario 5
    Given I am logged in as a "Ahemaiti Subate The Access Should Be For Accelerant - Standard" user
    Given The change is deployed
    When I inspect object schemas across the org
    Then Probability_Confidence_c, Target_ULR_Ultimate_Loss_Ratio_c, Actuary_assigned_c, Underwriter_assigned_c, ProgramClass_c
    Then ProgramName_c are removed from the Opportunity object only; fields with the same API names on other objects remain unchanged
    Then Can you please clarify for the unhide action.For which all profiles access needs to be provided?What access to be provided? read only or read/edit ?Does these fields need to be add to the report type
    Then ComponentComponent TypeHipTen_Opportunity_Lightning_Page_LayoutLightning Record PageOpportunity_Record_Page_Three_ColumnLightning Record PageOpportunity Page LayoutPage LayoutAccelerant Std UserProfileAdminProfileAccelerant System AdminProfileHipten_Opportunity_Compact_LayoutCompact Layout
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=a46f9f39-e251-4e0e-98c0-60c77c6d1895Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /Unhide-and-delete-fields-in-opportunity-consolidationDifference TypeMetadata TypeNameDifferentLightning pageOpportunity_Record_Page_Three_ColumnNewCustom objectContractNewLightning pageHipTen_Opportunity_Lightning_Page_LayoutNewLayoutOpportunity-HipTen - Opportunity LayoutNewCompact layoutOpportunity.Hipten_Opportunity_Compact_LayoutDifferent (included by problem analyzer)ProfileAdminDifferent (included by problem analyzer)ProfileAnalytics Cloud Integration UserDifferent (included by problem analyzer)ProfileAnalytics Cloud Security UserDifferent (included by problem analyzer)ProfileContractManagerDifferent (included by problem analyzer)ProfileCPQ Integration UserDifferent (included by problem analyzer)ProfileEnd UserDifferent (included by problem analyzer)ProfileExecutive SponsorDifferent (included by problem analyzer)ProfileMarketingProfileDifferent (included by problem analyzer)ProfileMinimum Access - API Only IntegrationsDifferent (included by problem analyzer)ProfileMinimum Access - SalesforceDifferent (included by problem analyzer)ProfileRead OnlyDifferent (included by problem analyzer)ProfileSales Insights Integration UserDifferent (included by problem analyzer)ProfileSalesforce API Only System IntegrationsDifferent (included by problem analyzer)ProfileSolutionManagerDifferent (included by problem analyzer)ProfileStandardNo differenceCustom objectOpportunity
    Then :check_mark: Successfully merged PR #33 from gs-pipeline/SF-493/Unhide-and-delete-fields-in-opportunity-consolidation_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: two on Contract
  # ══════════════════════════════════════════════════════════════════════════

  @SF-493 @SF-493-UI-006 @smoke @p1 @admin
  Scenario: Verify two is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "two" field should be visible
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-007 @p1 @standard-user @negative
  Scenario: Verify two is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "two" field should not be visible
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-008 @p2 @detail-view
  Scenario: Verify two visibility on Contract detail page
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "two" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: two on Contract
  # ══════════════════════════════════════════════════════════════════════════

  @SF-493 @SF-493-UI-009 @smoke @p1
  Scenario: Verify two field is visible on Contract
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "two" field should be visible
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-010 @p1 @edit
  Scenario: Verify two field can be edited on Contract
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    And I set the "two" field to "Test Value"
    And I save the record
    Then the Contract should be saved successfully
    And the "two" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: and_delete_fields_in_opportunity_-_consolidation__c should NOT exist on Contract
  # ══════════════════════════════════════════════════════════════════════════

  @SF-493 @SF-493-UI-011 @smoke @p1 @field-removal
  Scenario: Verify and_delete_fields_in_opportunity_-_consolidation__c field does NOT exist on Contract
    Given I have an existing Contract record
    When I navigate to the Contract record
    Then the "and_delete_fields_in_opportunity_-_consolidation__c" field should not be visible
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-012 @p1 @field-removal
  Scenario: Verify and_delete_fields_in_opportunity_-_consolidation__c field is not available in edit mode
    Given I have an existing Contract record
    When I navigate to the Contract record
    And I click Edit on the Contract
    Then the "and_delete_fields_in_opportunity_-_consolidation__c" field should not be visible
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-013 @p2 @field-removal
  Scenario: Verify and_delete_fields_in_opportunity_-_consolidation__c field is not present on Contract detail page
    Given I have an existing Contract record
    When I navigate to the Contract record
    Then the "and_delete_fields_in_opportunity_-_consolidation__c" field should not be visible
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-014 @p2 @field-removal
  Scenario: Verify and_delete_fields_in_opportunity_-_consolidation__c field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Contract record
    When I navigate to the Contract record
    Then the "and_delete_fields_in_opportunity_-_consolidation__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-493 @SF-493-UI-015 @p2 @negative @blank-value
  Scenario: Verify behavior when two is blank
    Given I am logged in as a standard user
    And I have a test Contract created via API without "two"
    When I navigate to the Contract record
    Then the "two" field should be visible
    And the "two" field should be blank or empty
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-016 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify two
    Given I am logged in as a read-only user
    And I have a test Contract created via API
    When I navigate to the Contract record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-493 @SF-493-UI-017 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to two
    Given I am logged in as a standard user
    And I have a test Contract created via API
    When I navigate to the Contract record
    Then the "two" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-493 @SF-493-UI-018 @p2 @ui-data-creation
  Scenario: Create Contract record via UI
    Given I am logged in as a standard user
    When I navigate to the Contract object list
    And I click New to create a Contract
    And I fill in required Contract fields
    And I save the record
    Then the Contract should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: / WHEN / THEN):A — Unhide Acceptance CriteriaField visibility (UI
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: org profiles → FLS is updated → the two fields are readable (
  #     → Should be tested via UI | Priority: p2
  #   REQ-3: dynamic forms or page layouts exist → standard users view or sear
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: standard users with reporting/API access → they build reports or 
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 91
  # Existing Steps Used: 91
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 91/91 (100%)
  #   - Feature-Specific Steps Used: 0
