# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-486 - Make Affiliate Status and Party Code mandatory when Account Type = Reinsurer and Ownership = Owned
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:06:28.341Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Make Affiliate Status and Party Code mandatory when Account Type = Reinsurer and Ownership = Owned
# Primary Entity: Account
#
# Fields Involved (2):
#   • Affiliate Status (Affiliate_Status__c) - validate
#   • Party Code (Party_Code__c) - validate
#
# Test Requirements (3):
#   REQ-1: / WHEN / THEN):Mandatory on Create (UI) → Account Type = Reinsure
#     → Test Type: BOTH | Priority: p1
#   REQ-2: an existing Account where Account Type = Reinsurer → a user attem
#     → Test Type: BOTH | Priority: p2
#   REQ-3: an API call, integration or automated job attempts to create or u
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-486 @medium @field-visibility @account
Feature: SF-486 - Make Affiliate Status and Party Code mandatory when Account Type = Reinsurer and Ownership = Owned
  As a Salesforce user
  I want to verify the Affiliate_Non_Affiliate__c functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-486 @SF-486-UI-001 @negative @given-a
  Scenario: Scenario 1
    Given I am logged in as a "Given A" user
    Given Mandatory on Create (UI)
    Given A user creates a new Account
    When Account Type = Reinsurer
    When Ownership = Owned
    When Affiliate/Non-Affiliate or Party Code is blank
    Then The save is blocked
    Then The user sees the error: "Affiliate/Non-Affiliate Status
    Then Party Code are required for Owned Reinsurer accounts."Mandatory on Edit (UI)
    And I take a screenshot as evidence

  @SF-486 @SF-486-UI-002 @negative @owned-a
  Scenario: Scenario 2
    Given I am logged in as a "Owned A" user
    Given An existing Account where Account Type = Reinsurer
    Given Ownership = Owned
    When I save the record
    Then The save is blocked
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-486 @SF-486-UI-003 @negative @data-driven
  Scenario: Scenario 3
    Given I am logged in as a standard user
    Given I have a test Account created via API
    Given Ownership = Owned
    Given Affiliate/Non-Affiliate or Party Code is blank
    When The operation runs
    Then I should see a validation error
    Then The event is logged; integrations must provide both fields or run under a controlled bypass
    Then I’ve queried Sue to find out if this is mandatory at the active or onboarding stage
    Then The majority of this requirement is covered by
    Then Is in QA [SF-480] Delete Account fields Mission_Series_MGA_c
    Then Owned_MGA_c - Jira, as you are all working in different Sandboxes you won’t have seen this change - lets raise this in the st
    Then Up later
    Then Discuss the best way to address this
    Then :check_mark: Successfully merged PR #8 from gs-pipeline/SF-486/Make-Affiliate-Status-and-Party-Code-mandatory-when-Account-Type-Reinsurer-and-Ownership-Owned_-_UAT into UAT
    Then Confirm if the changes are deployed to QA  env? I dont see the Ownership field nor the AFF/Non-AFF field is mandatory
    Then WRT to party id not generating automatically, I am unsure how it gets generated
    Then :check_mark: Successfully merged PR #70 from gs-pipeline/SF-486/Make-Affiliate-Status-and-Party-Code-mandatory-when-Account-Type-Reinsurer-and-Ownership-Owned_-_QA into QA
    Then Party id mixed up
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Affiliate_Non_Affiliate__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-486 @SF-486-UI-004 @smoke @p1
  Scenario: Verify Affiliate_Non_Affiliate__c field is visible on Account
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Affiliate_Non_Affiliate__c" field should be visible
    And I take a screenshot as evidence

  @SF-486 @SF-486-UI-005 @p1 @edit
  Scenario: Verify Affiliate_Non_Affiliate__c field can be edited on Account
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Affiliate_Non_Affiliate__c" field to "Test Value"
    And I save the record
    Then the Account should be saved successfully
    And the "Affiliate_Non_Affiliate__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Affiliate_Non_Affiliate__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-486 @SF-486-UI-006 @smoke @p1
  Scenario: Verify Affiliate_Non_Affiliate__c field is visible on Account
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Affiliate_Non_Affiliate__c" field should be visible
    And I take a screenshot as evidence

  @SF-486 @SF-486-UI-007 @p1 @edit
  Scenario: Verify Affiliate_Non_Affiliate__c field can be edited on Account
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Affiliate_Non_Affiliate__c" field to "Test Value"
    And I save the record
    Then the Account should be saved successfully
    And the "Affiliate_Non_Affiliate__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Affiliate_Status__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-486 @SF-486-UI-008 @smoke @p1 @admin
  Scenario: Verify Affiliate_Status__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Affiliate_Status__c" field should be visible
    And I take a screenshot as evidence

  @SF-486 @SF-486-UI-009 @p1 @standard-user @negative
  Scenario: Verify Affiliate_Status__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Affiliate_Status__c" field should not be visible
    And I take a screenshot as evidence

  @SF-486 @SF-486-UI-010 @p2 @detail-view
  Scenario: Verify Affiliate_Status__c visibility on Account detail page
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Affiliate_Status__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-486 @SF-486-UI-011 @p2 @negative @blank-value
  Scenario: Verify behavior when Affiliate_Non_Affiliate__c is blank
    Given I am logged in as a standard user
    And I have a test Account created via API without "Affiliate_Non_Affiliate__c"
    When I navigate to the Account record
    Then the "Affiliate_Non_Affiliate__c" field should be visible
    And the "Affiliate_Non_Affiliate__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-486 @SF-486-UI-012 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Affiliate_Non_Affiliate__c
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-486 @SF-486-UI-013 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Affiliate_Non_Affiliate__c
    Given I am logged in as a standard user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the "Affiliate_Non_Affiliate__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-486 @SF-486-UI-014 @p2 @ui-data-creation
  Scenario: Create Account record via UI
    Given I am logged in as a standard user
    When I navigate to the Account object list
    And I click New to create a Account
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 3
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (3):
  #   REQ-1: / WHEN / THEN):Mandatory on Create (UI) → Account Type = Reinsure
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: an existing Account where Account Type = Reinsurer → a user attem
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-3: an API call, integration or automated job attempts to create or u
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 102
  # Existing Steps Used: 102
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 102/102 (100%)
  #   - Feature-Specific Steps Used: 0
