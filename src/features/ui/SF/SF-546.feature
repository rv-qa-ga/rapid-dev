# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-546 - Remove other record type layouts
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-removal
# Generated: 2026-01-05T21:57:23.412Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Remove other record type layouts
# Primary Entity: Account
#
# Fields Involved (1):
#   • other record type layouts (other_record_type_layouts__c) - delete
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-546 @medium @account
Feature: SF-546 - Remove other record type layouts
  As a Salesforce user
  I want to verify the master record type and Account type functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: other_record_type_layouts__c should NOT exist on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-546 @SF-546-UI-001 @smoke @p1 @field-removal
  Scenario: Verify other_record_type_layouts__c field does NOT exist on Account
    Given I have an existing Account record
    When I navigate to the Account record
    Then the "other_record_type_layouts__c" field should not be visible
    And I take a screenshot as evidence

  @SF-546 @SF-546-UI-002 @p1 @field-removal
  Scenario: Verify other_record_type_layouts__c field is not available in edit mode
    Given I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "other_record_type_layouts__c" field should not be visible
    And I take a screenshot as evidence

  @SF-546 @SF-546-UI-003 @p2 @field-removal
  Scenario: Verify other_record_type_layouts__c field is not present on Account detail page
    Given I have an existing Account record
    When I navigate to the Account record
    Then the "other_record_type_layouts__c" field should not be visible
    And I take a screenshot as evidence

  @SF-546 @SF-546-UI-004 @p2 @field-removal
  Scenario: Verify other_record_type_layouts__c field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "other_record_type_layouts__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-546 @SF-546-UI-005 @p2 @negative @blank-value
  Scenario: Verify behavior when master record type and Account type is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Account created via API without "master record type and Account type"
    When I navigate to the Account record
    Then the "master record type and Account type" field should be visible
    And the "master record type and Account type" field should be blank or empty
    And I take a screenshot as evidence

  @SF-546 @SF-546-UI-006 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify master record type and Account type
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # OBJECT MANAGER - RECORD TYPES VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-546 @SF-546-UI-011 @p1 @smoke @object-manager @record-types
  Scenario: Verify no record types are listed in Object Manager for Account
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to Object Manager for Account
    And I navigate to Record Types section
    Then the Record Types list should show "0 Items"
    And the "No items to display" message should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # RECORD TYPE SELECTION PAGE REMOVAL
  # ══════════════════════════════════════════════════════════════════════════

  @SF-546 @SF-546-UI-007 @p1 @smoke @record-type-selection
  Scenario: Verify record type selection page is NOT displayed when creating Account
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    Then the record type selection page should not be displayed
    And I should be taken directly to the Account creation form
    And I take a screenshot as evidence

  @SF-546 @SF-546-UI-008 @p1 @record-type-selection @data-driven
  Scenario: Verify record type radio buttons are NOT visible when creating Account
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    Then the "Agency" record type radio button should not be visible
    And the "Insurer" record type radio button should not be visible
    And the "Member" record type radio button should not be visible
    And the "Other" record type radio button should not be visible
    And the "Reinsurer" record type radio button should not be visible
    And the "TPA" record type radio button should not be visible
    And I take a screenshot as evidence

  @SF-546 @SF-546-UI-009 @p2 @record-type-selection
  Scenario: Verify direct navigation to Account creation form after clicking New
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    Then the Account creation form should be visible
    And the form should contain the "Account Name" field
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-546 @SF-546-UI-010 @p2 @ui-data-creation
  Scenario: Create Account record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 36
  # Existing Steps Used: 36
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 36/36 (100%)
  #   - Feature-Specific Steps Used: 0
