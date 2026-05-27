# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-41 - 8234: Configure Account Contact Relationships
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2026-01-05T21:55:06.039Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: 8234: Configure Account Contact Relationships
# Primary Entity: AccountContactRelation
#
# Test Requirements (8):
#   REQ-1: Hide Compliance Certification fields
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Hide unused system or rollup fields
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Remove Other Role field
#     → Test Type: API | Priority: p2
#   REQ-4: Hide regulatory license fields
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Account displays related Account Contact Relationships
#     → Test Type: BOTH | Priority: p2
#   REQ-6: Roles picklist contains only approved values
#     → Test Type: BOTH | Priority: p2
#   REQ-7: Start Date is required when creating a relationship
#     → Test Type: UI | Priority: p2
#   REQ-8: Start Date remains populated and cannot be cleared
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

@ui @salesforce @SF-41 @medium @field-visibility @accountcontactrelation
Feature: SF-41 - 8234: Configure Account Contact Relationships
  As a Salesforce user
  I want to verify the Compliance_Certification_Date__c functionality on AccountContactRelation
  So that AccountContactRelation records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-41 @SF-41-UI-001 @p1 @smoke @negative @data-driven @relationship-then-all-three-fields-must-be-hidden-from-page-layouts-must-not-be-editable-or-used-until-requirements-are-confirmed @field-visibility
  Scenario: Hide Compliance Certification fields
    Given I am logged in as a "Relationship Then All Three Fields Must Be Hidden From Page Layouts Must Not Be Editable Or Used Until Requirements Are Confirmed" user
    Given The fields Compliance_Certification_Date__c, Compliance_Certification_Status__c
    Given Compliance_Certification_Type__c exist
    Given Users view or edit a relationship
    Given All three fields must be hidden from page layouts
    Given Must not be editable or used until requirements are confirmed
    When Users view or edit a relationship
    When All three fields must be hidden from page layouts
    When Must not be editable or used until requirements are confirmed
    Then All three fields must be hidden from page layouts
    Then Must not be editable or used until requirements are confirmed
    Then Compliance_Certification_Type__c exist
    Then Must not be editable or used until requirements are confirmed
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-002 @p1 @positive @relationship-then-this-field-must-be-hidden-on-all-layouts-not-available-for-population @field-visibility
  Scenario: Hide unused system or rollup fields
    Given I am logged in as a "Relationship Then This Field Must Be Hidden On All Layouts Not Available For Population" user
    Given The field DataRollupCategories exists
    Given Users view or edit a relationship
    Given This field must be hidden on all layouts
    Given Not available for population
    When Users view or edit a relationship
    When This field must be hidden on all layouts
    When Not available for population
    Then This field must be hidden on all layouts
    Then Not available for population
    Then Not available for population
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-003 @p1 @positive @data-driven @field-visibility @permissions
  Scenario: Remove Other Role field
    Given I am logged in as a "Accelerant - System administrator" user
    Given The field Other_Role__c is no longer required
    Given Reviewing the object
    Given The field must be deleted from AccountContactRelation
    Given Removed from any automation, reports
    Given Metadata references
    When Reviewing the object
    When The field must be deleted from AccountContactRelation
    When Removed from any automation, reports
    When Metadata references
    Then The field must be deleted from AccountContactRelation
    Then Removed from any automation, reports
    Then Metadata references
    Then Removed from any automation, reports, and metadata references
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-004 @p2 @negative @data-driven @relationship-then-these-fields-must-be-hidden-must-not-be-used-until-requirements-are-confirmed @field-visibility
  Scenario: Hide regulatory license fields
    Given I am logged in as a "Relationship Then These Fields Must Be Hidden Must Not Be Used Until Requirements Are Confirmed" user
    Given The fields Regulatory_License_Expiration_Date__c, Regulatory_License_Number__c
    Given Regulatory_License_Type__c exist
    Given Users view or edit a relationship
    Given These fields must be hidden
    Given Must not be used until requirements are confirmed
    When Users view or edit a relationship
    When These fields must be hidden
    When Must not be used until requirements are confirmed
    Then These fields must be hidden
    Then Must not be used until requirements are confirmed
    Then Regulatory_License_Type__c exist
    Then Must not be used until requirements are confirmed
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-005 @p2 @positive @data-driven @user-is-viewing-an-account-record-when-navigating-the-account-page-then-the @field-visibility @visibility
  Scenario: Account displays related Account Contact Relationships
    Given I am logged in as a "User Is Viewing An Account Record When Navigating The Account Page Then The" user
    And I navigate to the Account record
    Given Navigating the Account page
    Given The list must clearly show key fields such as Contact, Roles, Start Date, End Date
    Given Active status
    When Navigating the Account page
    When I navigate to the Account record
    When The list must clearly show key fields such as Contact, Roles, Start Date, End Date
    When Active status
    And I navigate to the Account record
    Then The list must clearly show key fields such as Contact, Roles, Start Date, End Date
    Then Active status
    Then The list must clearly show key fields such as Contact, Roles, Start Date, End Date, and Active status
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-006 @p2 @positive @picklist-exists-on-accountcontactrelation-when @field-visibility @permissions
  Scenario: Roles picklist contains only approved values
    Given I am logged in as a "Picklist Exists On Accountcontactrelation When" user
    Given The "Roles" picklist exists on AccountContactRelation
    Given Users create or edit an Account–Contact relationship
    Given The picklist must contain only the approved roles
    Given | Claims Representative        |
    Given | Underwriting Representative  |
    Given | Compliance Contact           |
    Given | Actuary                      |
    Given | Data Processing Contact      |
    Given | Distribution Contact         |
    Given | Deposition Contact           |
    Given | Executive Sponsor            |
    Given | Marketing Contact            |
    When Users create or edit an Account–Contact relationship
    When The picklist must contain only the approved roles
    When | Claims Representative        |
    When | Underwriting Representative  |
    When | Compliance Contact           |
    When | Actuary                      |
    When | Data Processing Contact      |
    When | Distribution Contact         |
    When | Deposition Contact           |
    When | Executive Sponsor            |
    When | Marketing Contact            |
    Then The picklist must contain only the approved roles
    Then | Claims Representative        |
    Then | Underwriting Representative  |
    Then | Compliance Contact           |
    Then | Actuary                      |
    Then | Data Processing Contact      |
    Then | Distribution Contact         |
    Then | Deposition Contact           |
    Then | Executive Sponsor            |
    Then | Marketing Contact            |
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-007 @p2 @negative @field-visibility
  Scenario: Start Date is required when creating a relationship
    Given I am logged in as a "Accelerant - System administrator" user
    Given A user is creating a new Account–Contact relationship
    And I save the record
    Given The "StartDate" field must be populated
    Given The save must be blocked if StartDate is blank
    And I should see a validation error
    When I save the record
    When The "StartDate" field must be populated
    When The save must be blocked if StartDate is blank
    And I should see a validation error
    Then The "StartDate" field must be populated
    Then The save must be blocked if StartDate is blank
    Then I should see a validation error
    Then The save must be blocked if StartDate is blank
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-008 @p2 @positive @data-driven @start-date-when-a @field-visibility
  Scenario: Start Date remains populated and cannot be cleared
    Given I am logged in as a "Start Date When A" user
    Given An existing Account–Contact relationship already has a Start Date
    And I click Edit on the Account
    Given Start Date must remain populated
    Given The system must prevent Start Date from being cleared or removed
    Given In the role picklist there is a role missing, ‘Processing Lead’
    Given Approved from a data governance standpoint
    Given Acceptance criteria not met, this US needs rework
    When I click Edit on the Account
    When Start Date must remain populated
    When The system must prevent Start Date from being cleared or removed
    When In the role picklist there is a role missing, ‘Processing Lead’
    When Approved from a data governance standpoint
    When Acceptance criteria not met, this US needs rework
    Then Start Date must remain populated
    Then The system must prevent Start Date from being cleared or removed
    Then In the role picklist there is a role missing, ‘Processing Lead’
    Then Approved from a data governance standpoint
    Then Acceptance criteria not met, this US needs rework
    Then The system must prevent Start Date from being cleared or removed
    Then Approved from a data governance standpoint
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Compliance_Certification_Date__c on AccountContactRelation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-41 @SF-41-UI-009 @smoke @p1 @admin
  Scenario: Verify Compliance_Certification_Date__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Compliance_Certification_Date__c" field should be visible
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-010 @p1 @standard-user @negative
  Scenario: Verify Compliance_Certification_Date__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Compliance_Certification_Date__c" field should not be visible
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-011 @p2 @detail-view
  Scenario: Verify Compliance_Certification_Date__c visibility on AccountContactRelation detail page
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Compliance_Certification_Date__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Compliance_Certification_Date__c on AccountContactRelation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-41 @SF-41-UI-012 @smoke @p1
  Scenario: Verify Compliance_Certification_Date__c field is visible on AccountContactRelation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Compliance_Certification_Date__c" field should be visible
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-013 @p1 @edit
  Scenario: Verify Compliance_Certification_Date__c field can be edited on AccountContactRelation
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    And I set the "Compliance_Certification_Date__c" field to "Test Value"
    And I save the record
    Then the AccountContactRelation should be saved successfully
    And the "Compliance_Certification_Date__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: Compliance_Certification_Date__c on AccountContactRelation
  # ══════════════════════════════════════════════════════════════════════════

  @SF-41 @SF-41-UI-014 @p1 @picklist-options
  Scenario: Verify all Compliance_Certification_Date__c picklist options are available
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    And I click on the "Compliance_Certification_Date__c" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-41 @SF-41-UI-015 @p2 @negative @blank-value
  Scenario: Verify behavior when Compliance_Certification_Date__c is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test AccountContactRelation created via API without "Compliance_Certification_Date__c"
    When I navigate to the AccountContactRelation record
    Then the "Compliance_Certification_Date__c" field should be visible
    And the "Compliance_Certification_Date__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-016 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Compliance_Certification_Date__c
    Given I am logged in as a read-only user
    And I have a test AccountContactRelation created via API
    When I navigate to the AccountContactRelation record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-41 @SF-41-UI-017 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Compliance_Certification_Date__c
    Given I am logged in as a standard user
    And I have a test AccountContactRelation created via API
    When I navigate to the AccountContactRelation record
    Then the "Compliance_Certification_Date__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-41 @SF-41-UI-018 @p2 @ui-data-creation
  Scenario: Create AccountContactRelation record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the AccountContactRelation object list
    And I click New to create a AccountContactRelation
    And I fill in required AccountContactRelation fields
    And I save the record
    Then the AccountContactRelation should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 7
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (7):
  #   REQ-1: Hide Compliance Certification fields
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Hide unused system or rollup fields
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-4: Hide regulatory license fields
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Account displays related Account Contact Relationships
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-6: Roles picklist contains only approved values
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-7: Start Date is required when creating a relationship
  #     → Should be tested via UI | Priority: p2
  #   REQ-8: Start Date remains populated and cannot be cleared
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 201
  # Existing Steps Used: 201
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 201/201 (100%)
  #   - Feature-Specific Steps Used: 0
