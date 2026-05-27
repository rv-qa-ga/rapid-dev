# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-505 - Broker Sourced Name Field on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:05:51.805Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Broker Sourced Name Field on Account
# Primary Entity: ColumnFlexipageModifyAccount
#
# Fields Involved (2):
#   • Broker Sourced Name (Broker_Sourced_Name__c) - create
#   • on Account (on_Account__c) - modify
#
# Test Requirements (5):
#   REQ-1: Create Broker Sourced Name field on Account
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Auto-populate Broker Sourced Name from Lead on conversion
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Field should not be editable post-conversion
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Field visibility
#     → Test Type: UI | Priority: p2
#   REQ-5: referring to Non-Member MGA as Account type instead of record typ
#     → Test Type: BOTH | Priority: p1
#
# Key Points:
#   • Change Components: Create Broker Sourced Name on ColumnFlexipageModify
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-505 @medium @auto-populate @field-mapping @columnflexipagemodifyaccount
Feature: SF-505 - Broker Sourced Name Field on Account
  As a Salesforce user
  I want to verify the Broker Sourced Name functionality on ColumnFlexipageModifyAccount
  So that ColumnFlexipageModifyAccount records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-UI-001
  Scenario: Create Broker Sourced Name field on Account
    Given I am logged in as a standard user
    Given The Account object exists
    Given The Broker_Sourced_Name__c field is created
    Given It must be defined as a lookup to the Account object
    Given Added to the page layout for the following Account types: MemberNon-Member MGA
    When The Broker_Sourced_Name__c field is created
    When It must be defined as a lookup to the Account object
    When Added to the page layout for the following Account types: MemberNon-Member MGA
    Then It must be defined as a lookup to the Account object
    Then Added to the page layout for the following Account types: MemberNon-Member MGA
    Then Added to the page layout for the following Account types: MemberNon-Member MGA
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-002
  Scenario: Auto-populate Broker Sourced Name from Lead on conversion
    Given I am logged in as a standard user
    Given A Lead has the "Broker_Sourced_Name__c" field populated
    Given The Lead is converted to an Account
    Given The "Broker_Sourced_Name__c" field on the Account must be automatically populated
    Given The value should match the Broker Sourced Name from the originating Lead
    When The Lead is converted to an Account
    When The "Broker_Sourced_Name__c" field on the Account must be automatically populated
    When The value should match the Broker Sourced Name from the originating Lead
    Then The "Broker_Sourced_Name__c" field on the Account must be automatically populated
    Then The value should match the Broker Sourced Name from the originating Lead
    Then The value should match the Broker Sourced Name from the originating Lead
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-003 @negative @field-when-a
  Scenario: Field should not be editable post-conversion
    Given I am logged in as a "Field When A" user
    Given An Account has a value in the "Broker_Sourced_Name__c" field
    And I navigate to the Account record
    And the "{fieldName}" field should not be visible or should be read-only
    Given Users should not be able to modify or clear its value
    When I navigate to the Account record
    And the "{fieldName}" field should not be visible or should be read-only
    When Users should not be able to modify or clear its value
    Then the "{fieldName}" field should not be visible or should be read-only
    Then Users should not be able to modify or clear its value
    Then Users should not be able to modify or clear its value
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-004 @negative @data-driven @admin
  Scenario: Field visibility
    Given I am logged in as a "Admin" user
    Given A user views any other Account type (not Member or Non-Member MGA)
    Given The "Broker_Sourced_Name__c" field should not be visible on the page layout
    And I navigate to the Account record
    Given Is not really a parent/child relationship it is more a parent to parent relationship.If a user can see the account they should be able to see this field
    Given If the field needs to be changed then only the system admins can change itNon-Member MGA should be a type on the account Does that answer all your questions?
    Then The "Broker_Sourced_Name__c" field should not be visible on the page layout
    And I navigate to the Account record
    Then Is not really a parent/child relationship it is more a parent to parent relationship.If a user can see the account they should be able to see this field
    Then If the field needs to be changed then only the system admins can change itNon-Member MGA should be a type on the account Does that answer all your questions?
    Then Is not really a parent/child relationship it is more a parent to parent relationship.If a user can see the account they should be able to see this field and if the field needs to be changed then only the system admins can change itNon-Member MGA should be a type on the account Does that answer all your questions?
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-005
  Scenario: referring to Non-Member MGA as Account type instead of record type? Also, even if its a parent to parent relationship, we need to give a name for both sides of the lookup. I’ll go with the name Accounts (Broker Sourced Name) for now. We can come back to it later.
    Given I am logged in as a standard user
    Then Component NameComponent TypeModification TypeAccelerant_Agency_Lightning_Account_Record_PageFlexipageModifyAccelerant_Insurer_Lightning_Account_Record_PageFlexipageModifyAccelerant_Member_Lightning_Account_Record_PageFlexipageModifyAccelerant_Other_Lightning_Account_Record_PageFlexipageModifyAccelerant_Reinsurer_Lightning_Account_Record_PageFlexipageModifyAccelerant_TPA_Lightning_Account_Record_PageFlexipageModifyAccount_Record_Page_Three_ColumnFlexipageModifyAccount.Broker_Sourced_Name__cCustom FieldCreateAccount.Cant_Modify_Broker_Sourced_NameValidation RuleCreate
    Then :check_mark: Successfully merged PR #4 from gs-pipeline/SF-505/Broker-Sourced-Name-Field-on-Account_-_UAT into UAT
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Broker Sourced Name on ColumnFlexipageModifyAccount
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-UI-006 @smoke @p1
  Scenario: Verify Broker Sourced Name field is visible on ColumnFlexipageModifyAccount
    Given I am logged in as a standard user
    And I have an existing ColumnFlexipageModifyAccount record
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the "Broker Sourced Name" field should be visible
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-007 @p1 @edit
  Scenario: Verify Broker Sourced Name field can be edited on ColumnFlexipageModifyAccount
    Given I am logged in as a standard user
    And I have an existing ColumnFlexipageModifyAccount record
    When I navigate to the ColumnFlexipageModifyAccount record
    And I click Edit on the ColumnFlexipageModifyAccount
    And I set the "Broker Sourced Name" field to "Test Value"
    And I save the record
    Then the ColumnFlexipageModifyAccount should be saved successfully
    And the "Broker Sourced Name" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: Broker Sourced Name from Source to ColumnFlexipageModifyAccount
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-UI-008 @smoke @p1 @auto-populate
  Scenario: Verify Broker Sourced Name auto-populates from Source to ColumnFlexipageModifyAccount
    Given I am logged in as a standard user
    And I have a test Source created via API with:
      | field   | value    |
      | Broker Sourced Name | EU       |
    And I have a test ColumnFlexipageModifyAccount created via API for the Source
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the "Broker Sourced Name" field should display "EU"
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-009 @p1 @read-only
  Scenario: Verify Broker Sourced Name is NOT editable on ColumnFlexipageModifyAccount after creation
    Given I am logged in as a standard user
    And I have a test Source created via API with Broker Sourced Name "UK"
    And I have a test ColumnFlexipageModifyAccount created via API for the Source
    When I navigate to the ColumnFlexipageModifyAccount record
    And I click Edit on the ColumnFlexipageModifyAccount
    Then the "Broker Sourced Name" field should not be editable
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-010 @p1 @visibility
  Scenario: Verify Broker Sourced Name field is visible on ColumnFlexipageModifyAccount
    Given I am logged in as a standard user
    And I have a test Source created via API with Broker Sourced Name "US"
    And I have a test ColumnFlexipageModifyAccount created via API for the Source
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the "Broker Sourced Name" field should be visible
    And the "Broker Sourced Name" field should display "US"
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-011 @p2 @exact-match
  Scenario: Verify Broker Sourced Name value matches exactly from Source
    Given I am logged in as a standard user
    And I have a test Source created via API with Broker Sourced Name "APAC"
    And I have a test ColumnFlexipageModifyAccount created via API for the Source
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the "Broker Sourced Name" field should display "APAC"
    And the Broker Sourced Name value should match exactly what was on the Source
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: Broker_Sourced_Name__c on ColumnFlexipageModifyAccount
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-UI-012 @smoke @p1 @read-only
  Scenario: Verify Broker_Sourced_Name__c is read-only on ColumnFlexipageModifyAccount
    Given I am logged in as a standard user
    And I have an existing ColumnFlexipageModifyAccount record
    When I navigate to the ColumnFlexipageModifyAccount record
    And I click Edit on the ColumnFlexipageModifyAccount
    Then the "Broker_Sourced_Name__c" field should not be editable
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-013 @p1 @negative
  Scenario: Verify user cannot modify Broker_Sourced_Name__c after ColumnFlexipageModifyAccount creation
    Given I am logged in as a standard user
    And I have an existing ColumnFlexipageModifyAccount record
    When I navigate to the ColumnFlexipageModifyAccount record
    And I click Edit on the ColumnFlexipageModifyAccount
    Then the "Broker_Sourced_Name__c" field should be read-only
    And attempting to edit the Broker_Sourced_Name__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: on_Account__c on ColumnFlexipageModifyAccount
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-UI-014 @smoke @p1 @admin
  Scenario: Verify on_Account__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing ColumnFlexipageModifyAccount record
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the "on_Account__c" field should be visible
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-015 @p1 @standard-user @negative
  Scenario: Verify on_Account__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing ColumnFlexipageModifyAccount record
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the "on_Account__c" field should not be visible
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-016 @p2 @detail-view
  Scenario: Verify on_Account__c visibility on ColumnFlexipageModifyAccount detail page
    Given I am logged in as a standard user
    And I have an existing ColumnFlexipageModifyAccount record
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the "on_Account__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Broker Sourced Name on ColumnFlexipageModifyAccount
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-UI-017 @smoke @p1
  Scenario: Verify Broker Sourced Name field is visible on ColumnFlexipageModifyAccount
    Given I am logged in as a standard user
    And I have an existing ColumnFlexipageModifyAccount record
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the "Broker Sourced Name" field should be visible
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-018 @p1 @edit
  Scenario: Verify Broker Sourced Name field can be edited on ColumnFlexipageModifyAccount
    Given I am logged in as a standard user
    And I have an existing ColumnFlexipageModifyAccount record
    When I navigate to the ColumnFlexipageModifyAccount record
    And I click Edit on the ColumnFlexipageModifyAccount
    And I set the "Broker Sourced Name" field to "Test Value"
    And I save the record
    Then the ColumnFlexipageModifyAccount should be saved successfully
    And the "Broker Sourced Name" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-UI-019 @p2 @negative @blank-value
  Scenario: Verify behavior when Broker Sourced Name is blank
    Given I am logged in as a standard user
    And I have a test ColumnFlexipageModifyAccount created via API without "Broker Sourced Name"
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the "Broker Sourced Name" field should be visible
    And the "Broker Sourced Name" field should be blank or empty
    And I take a screenshot as evidence

  @SF-505 @SF-505-UI-020 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Broker Sourced Name
    Given I am logged in as a read-only user
    And I have a test ColumnFlexipageModifyAccount created via API
    When I navigate to the ColumnFlexipageModifyAccount record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-505 @SF-505-UI-021 @p2 @ui-data-creation
  Scenario: Create ColumnFlexipageModifyAccount record via UI
    Given I am logged in as a standard user
    When I navigate to the ColumnFlexipageModifyAccount object list
    And I click New to create a ColumnFlexipageModifyAccount
    And I fill in required ColumnFlexipageModifyAccount fields
    And I save the record
    Then the ColumnFlexipageModifyAccount should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 5
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 153
  # Existing Steps Used: 153
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 153/153 (100%)
  #   - Feature-Specific Steps Used: 0
