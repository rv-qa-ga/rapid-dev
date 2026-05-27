# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-480 - Delete Account fields Mission_Series_MGA_c and Owned_MGA_c
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:08:15.424Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Delete Account fields Mission_Series_MGA_c and Owned_MGA_c
# Primary Entity: Lead
#
# Fields Involved (2):
#   • Account fields Mission_Series_MGA_c (Account_fields_Mission_Series_MGA_c__c) - delete
#   • Owned_MGA_c (Owned_MGA_c__c) - delete
#
# Test Requirements (6):
#   REQ-1: the change is deployed → object schemas across the org are inspec
#     → Test Type: BOTH | Priority: p1
#   REQ-2: the Account object → the Ownership field is reviewed → it exists 
#     → Test Type: API | Priority: p2
#   REQ-3: a full metadata → searching for references to Account.Mission_Ser
#     → Test Type: API | Priority: p2
#   REQ-4: integration owners → each owner confirms dependency status → no e
#     → Test Type: BOTH | Priority: p2
#   REQ-5: reports, dashboards, → owners update or remove those references →
#     → Test Type: BOTH | Priority: p2
#   REQ-6: lead deduplication rules → the fields are removed → deduplication
#     → Test Type: BOTH | Priority: p2
#
# Key Points:
#   • the field “Ownership” is not available in the UI - please check.
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • Independent
#   • Mission
#   • Owned
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-480 @medium @auto-populate @field-mapping @lead
Feature: SF-480 - Delete Account fields Mission_Series_MGA_c and Owned_MGA_c
  As a Salesforce user
  I want to verify the Ownership functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-UI-001 @data-driven
  Scenario: Scenario 1
    Given I am logged in as a standard user
    Given The change is deployed
    When Object schemas across the org are inspected
    Then Mission_Series_MGA_c
    Then Owned_MGA_c are removed from the Account object only
    Then Any fields with the same API names on other objects remain unchanged.Ownership field configuration
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-002 @data-driven
  Scenario: Scenario 2
    Given I am logged in as a standard user
    Given The Account object
    When The Ownership field is reviewed
    Then It exists as a picklist with the values Independent, Mission
    Then Owned only
    Then The field is used in place of Mission_Series_MGA_c
    Then Owned_MGA_c for all business logic, layouts, automations
    Then Integrations.Org-wide metadata
    Then Cross-object reference check
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-003 @negative
  Scenario: Scenario 3
    Given I am logged in as a standard user
    Given A full metadata
    Given Cross-object scan
    When Searching for references to Account.Mission_Series_MGA_c
    When Account.Owned_MGA_c
    Then There are no unresolved references; any found references are remediated
    Then Tested so that no runtime errors occur
    Then Any replaced logic now references the Ownership field instead.Integration
    Then External systems validation
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-004 @negative @data-driven
  Scenario: Scenario 4
    Given I am logged in as a standard user
    Given Integration owners
    Given Middleware mappings are engaged
    When Each owner confirms dependency status
    When Tests their flows
    Then No external ETL, job, API client, scheduled export, or downstream system fails due to the Account field deletions
    Then Integrations now correctly reference the Ownership field.Reports, dashboards
    Then BI validation
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-005 @negative @data-driven
  Scenario: Scenario 5
    Given I am logged in as a standard user
    Given Reports, dashboards
    Given BI jobs that referenced the removed fields are identified
    When Owners update or remove those references
    When Run tests
    Then Scheduled
    Then Ad-hoc reports
    Then BI jobs run without errors after deletion
    Then All reporting logic uses the Ownership field moving forward.Deduplication preserved
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-006 @data-driven @standard-user
  Scenario: Scenario 6
    Given I am logged in as a "Standard User" user
    Given Lead deduplication rules
    Given Any custom dedupe code or processes
    When The fields are removed
    When Replaced by Ownership
    Then Deduplication continues to behave as expected for existing
    Then New Accounts
    Then We also need to state here to remove these fields
    Then Use the standard ownership field to assign ownership with the Picklist values of ‘Owned’, ‘Independent'
    Then 'Mission’
    Then Fields removed from all page layouts
    Then Marked as IsDeleted.Ready to validate
    Then Promote
    Then The field “Ownership” is not available in the UI  - please check. I can see it in the Account object, but not during Account creation
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=f1f3f10b-6443-437a-9140-1eb2ab0b6089Commit notes: Pushing the Ownership field updates
    Then Also the missing metadada.Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /Delete-Account-fields-Mission_Series_MGA_c-and-Owned_MGA_c
    Then :check_mark: Successfully merged PR #72 from gs-pipeline/SF-480/Delete-Account-fields-Mission_Series_MGA_c-and-Owned_MGA_c_-_QA into QA
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=e7329f5b-418a-45ce-8fbc-05ce1ca974b3Commit notes: Ownership picklist valuesSource: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then Target: accelins / Salesforce_Devops / /Delete-Account-fields-Mission_Series_MGA_c-and-Owned_MGA_c
    Then :check_mark: Successfully merged PR #74 from gs-pipeline/SF-480/Delete-Account-fields-Mission_Series_MGA_c-and-Owned_MGA_c_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: Account_fields_Mission_Series_MGA_c__c should NOT exist on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-UI-007 @smoke @p1 @field-removal
  Scenario: Verify Account_fields_Mission_Series_MGA_c__c field does NOT exist on Lead
    Given I have an existing Lead record
    When I navigate to the Lead record
    Then the "Account_fields_Mission_Series_MGA_c__c" field should not be visible
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-008 @p1 @field-removal
  Scenario: Verify Account_fields_Mission_Series_MGA_c__c field is not available in edit mode
    Given I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Account_fields_Mission_Series_MGA_c__c" field should not be visible
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-009 @p2 @field-removal
  Scenario: Verify Account_fields_Mission_Series_MGA_c__c field is not present on Lead detail page
    Given I have an existing Lead record
    When I navigate to the Lead record
    Then the "Account_fields_Mission_Series_MGA_c__c" field should not be visible
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-010 @p2 @field-removal
  Scenario: Verify Account_fields_Mission_Series_MGA_c__c field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Account_fields_Mission_Series_MGA_c__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # PICKLIST VALUES: Owned_MGA_c__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-UI-011 @smoke @p1 @data-driven
  Scenario Outline: Set Owned_MGA_c__c to valid picklist values
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Owned_MGA_c__c" field to "<value>"
    And I save the record
    Then the Lead should be saved successfully
    And the "Owned_MGA_c__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Independent |
      | Mission |
      | Owned |

  @SF-480 @SF-480-UI-012 @p1 @picklist-options
  Scenario: Verify all Owned_MGA_c__c picklist options are available
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I click on the "Owned_MGA_c__c" picklist
    Then I should see all expected picklist values
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Ownership on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-UI-013 @smoke @p1
  Scenario: Verify Ownership field is visible on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Ownership" field should be visible
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-014 @p1 @edit
  Scenario: Verify Ownership field can be edited on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Ownership" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "Ownership" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-015 @p1 @data-driven
  Scenario Outline: Set Ownership to valid values
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Ownership" field to "<value>"
    And I save the record
    Then the "Ownership" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Independent |
      | Mission |
      | Owned |

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: Ownership from Account to Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-UI-016 @smoke @p1 @auto-populate
  Scenario: Verify Ownership auto-populates from Account to Lead
    Given I am logged in as a standard user
    And I have a test Account created via API with:
      | field   | value    |
      | Ownership | EU       |
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Ownership" field should display "EU"
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-017 @p1 @auto-populate @data-driven
  Scenario Outline: Verify Ownership mapping for all valid values
    Given I am logged in as a standard user
    And I have a test Account created via API with Ownership "<value>"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Ownership" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | Independent |
      | Mission |
      | Owned |

  @SF-480 @SF-480-UI-018 @p1 @read-only
  Scenario: Verify Ownership is NOT editable on Lead after creation
    Given I am logged in as a standard user
    And I have a test Account created via API with Ownership "UK"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Ownership" field should not be editable
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-019 @p1 @visibility
  Scenario: Verify Ownership field is visible on Lead
    Given I am logged in as a standard user
    And I have a test Account created via API with Ownership "US"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Ownership" field should be visible
    And the "Ownership" field should display "US"
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-020 @p2 @exact-match
  Scenario: Verify Ownership value matches exactly from Account
    Given I am logged in as a standard user
    And I have a test Account created via API with Ownership "APAC"
    And I have a test Lead created via API for the Account
    When I navigate to the Lead record
    Then the "Ownership" field should display "APAC"
    And the Ownership value should match exactly what was on the Account
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-UI-021 @p2 @negative @blank-value
  Scenario: Verify behavior when Ownership is blank
    Given I am logged in as a standard user
    And I have a test Lead created via API without "Ownership"
    When I navigate to the Lead record
    Then the "Ownership" field should be visible
    And the "Ownership" field should be blank or empty
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-022 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Ownership
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Ownership" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-480 @SF-480-UI-023 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Ownership
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-480 @SF-480-UI-024 @p2 @ui-data-creation
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
  # Total Requirements: 4
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (4):
  #   REQ-1: the change is deployed → object schemas across the org are inspec
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-4: integration owners → each owner confirms dependency status → no e
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: reports, dashboards, → owners update or remove those references →
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-6: lead deduplication rules → the fields are removed → deduplication
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 136
  # Existing Steps Used: 136
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 136/136 (100%)
  #   - Feature-Specific Steps Used: 0
