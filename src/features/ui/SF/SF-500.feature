# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-500 - More Opportunity consolidation
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:09:08.404Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: More Opportunity consolidation
# Primary Entity: AccountContactRelation
#
# Test Requirements (1):
#   REQ-1: / WHEN / THEN)A — Field label changeGIVEN the Opportunity object 
#     → Test Type: UI | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-500 @medium @auto-populate @field-mapping @accountcontactrelation
Feature: SF-500 - More Opportunity consolidation
  As a Salesforce user
  I want to verify the Current Program Expiration Date functionality on AccountContactRelation
  So that AccountContactRelation records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-500 @SF-500-UI-001 @data-driven @admin
  Scenario: Scenario 1
    Given I am logged in as a "Admin" user
    Given A — Field label changeGIVEN the Opportunity object
    When I navigate to the Opportunity record
    Then The label displays as "Current Program Expiration Date"
    Then The API name/data type remain unchangedB — Submission_folder_link_c behaviorGIVEN a Lead with Submission_folder_link_c populated WHEN that Lead is converted to an Opportunity (standard conversion)
    Then Opportunity.Submission_folder_link_c is populated with the Lead value immediately as part of conversion
    Then Expressed_Interest_c from non-admin users - Jira
    Then In regards to submission folder link field AC#4. Could you please clarify below:What is the non-standard path of opportunity creation from the converted lead?
    Then ComponentComponent TypeCurrent_Program_Expiration_DateFieldHipTen_Opportunity_Lightning_Page_LayoutLightning Record PageOpportunity_Record_Page_Three_ColumnLightning Record PageOpportunity Page LayoutPage Layout
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=50da5d48-d0ca-469a-9c42-a6a60d1bdb2eCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Opportunity record
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=44801043-2b86-4343-8b17-be493247306cCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Opportunity record
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Current Program Expiration Date on AccountContactRelation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-500 @SF-500-UI-002 @smoke @p1 @admin
  Scenario: Verify Current Program Expiration Date is visible for admin users
    Given I am logged in as an admin user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Current Program Expiration Date" field should be visible
    And I take a screenshot as evidence

  @SF-500 @SF-500-UI-003 @p1 @standard-user @negative
  Scenario: Verify Current Program Expiration Date is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Current Program Expiration Date" field should not be visible
    And I take a screenshot as evidence

  @SF-500 @SF-500-UI-004 @p2 @detail-view
  Scenario: Verify Current Program Expiration Date visibility on AccountContactRelation detail page
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Current Program Expiration Date" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-500 @SF-500-UI-005 @p2 @negative @blank-value
  Scenario: Verify behavior when Current Program Expiration Date is blank
    Given I am logged in as a standard user
    And I have a test AccountContactRelation created via API without "Current Program Expiration Date"
    When I navigate to the AccountContactRelation record
    Then the "Current Program Expiration Date" field should be visible
    And the "Current Program Expiration Date" field should be blank or empty
    And I take a screenshot as evidence

  @SF-500 @SF-500-UI-006 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Current Program Expiration Date
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    Then the "Current Program Expiration Date" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-500 @SF-500-UI-007 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Current Program Expiration Date
    Given I am logged in as a read-only user
    And I have a test AccountContactRelation created via API
    When I navigate to the AccountContactRelation record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-500 @SF-500-UI-008 @p2 @ui-data-creation
  Scenario: Create AccountContactRelation record via UI
    Given I am logged in as a standard user
    When I navigate to the AccountContactRelation object list
    And I click New to create a AccountContactRelation
    And I fill in required AccountContactRelation fields
    And I save the record
    Then the AccountContactRelation should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 1
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (1):
  #   REQ-1: / WHEN / THEN)A — Field label changeGIVEN the Opportunity object 
  #     → Should be tested via UI | Priority: p1


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 39
  # Existing Steps Used: 39
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 39/39 (100%)
  #   - Feature-Specific Steps Used: 0
