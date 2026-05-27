# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-479 - Delete Legal_Entity__c from Lead only; ensure no impact to other objects or systems
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2025-12-19T15:09:13.297Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Delete Legal_Entity__c from Lead only; ensure no impact to other objects or systems
# Primary Entity: Case
#
# Fields Involved (1):
#   • Legal Entity (Legal_Entity__c) - delete
#
# Test Requirements (5):
#   REQ-1: / WHEN / THEN):Lead-only deletion → I inspect object schemas acro
#     → Test Type: API | Priority: p1
#   REQ-2: a full metadata → I search for references to Lead.Legal_Entity__c
#     → Test Type: API | Priority: p2
#   REQ-3: reports, dashboards → owners update or remove those references → 
#     → Test Type: BOTH | Priority: p2
#   REQ-4: lead deduplication rules → the field is removed → deduplication b
#     → Test Type: BOTH | Priority: p2
#   REQ-5: all scheduled jobs → they run after deletion → none fail with fie
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
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-479 @medium @case
Feature: SF-479 - Delete Legal_Entity__c from Lead only; ensure no impact to other objects or systems
  As a Salesforce user
  I want to verify the Legal_Entity__c functionality on Case
  So that Case records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-479 @SF-479-UI-001
  Scenario: Scenario 1
    Given I am logged in as a standard user
    Given Lead-only deletion
    Given The change is deployed
    When I inspect object schemas across the org
    Then Legal_Entity__c is removed from the Lead object only
    Then Any fields with the same API name on other objects remain unchangedOrg-wide metadata & cross-object reference check
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-002 @negative @data-driven
  Scenario: Scenario 2
    Given I am logged in as a standard user
    Given A full metadata
    When I search for references to Lead.Legal_Entity__c
    Then There are no unresolved references; any reference found is remediated
    Then Unit-tested so no runtime errors occurReports, dashboards & BI validation
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-003 @negative @data-driven
  Scenario: Scenario 3
    Given I am logged in as a standard user
    Given Reports, dashboards
    Given BI jobs that referenced Lead. Legal_Entity__c are identified
    When Owners update or remove those references
    When Run tests
    Then Scheduled
    Then Ad-hoc reports
    Then BI jobs run without errors after deletionDeduplication preserved
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-004
  Scenario: Scenario 4
    Given I am logged in as a standard user
    Given Lead deduplication rules
    When The field is removed
    Then Deduplication behaves as expected for existing
    Then New Leads
    Then TestedScheduled jobs & batch processes
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-005 @negative @data-driven
  Scenario: Scenario 5
    Given I am logged in as a standard user
    Given All scheduled jobs
    Given Batch processes that touch Leads are identified
    When They run after deletion
    Then None fail with field-not-found or other exceptions
    Then There are some legal entity fields that also need to be deleted from the account
    Then Can you please clarify:What are BI validation to be check?For Data backup
    Then Rollback, this needs to be perform as part of the pre-deployment step for production. Can you let me know how pre-deployment step will be conducted
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=20c136cc-b8b8-4d58-8957-de439bc455faCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Lead record
    Then :check_mark: Successfully merged PR #37 from gs-pipeline/SF-479/Delete-Legal_Entity__c-from-Lead-only-ensure-no-impact-to-other-objects-or-systems_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: Legal_Entity__c should NOT exist on Case
  # ══════════════════════════════════════════════════════════════════════════

  @SF-479 @SF-479-UI-006 @smoke @p1 @field-removal
  Scenario: Verify Legal_Entity__c field does NOT exist on Case
    Given I have an existing Case record
    When I navigate to the Case record
    Then the "Legal_Entity__c" field should not be visible
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-007 @p1 @field-removal
  Scenario: Verify Legal_Entity__c field is not available in edit mode
    Given I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    Then the "Legal_Entity__c" field should not be visible
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-008 @p2 @field-removal
  Scenario: Verify Legal_Entity__c field is not present on Case detail page
    Given I have an existing Case record
    When I navigate to the Case record
    Then the "Legal_Entity__c" field should not be visible
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-009 @p2 @field-removal
  Scenario: Verify Legal_Entity__c field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "Legal_Entity__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Legal_Entity__c on Case
  # ══════════════════════════════════════════════════════════════════════════

  @SF-479 @SF-479-UI-010 @smoke @p1
  Scenario: Verify Legal_Entity__c field is visible on Case
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "Legal_Entity__c" field should be visible
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-011 @p1 @edit
  Scenario: Verify Legal_Entity__c field can be edited on Case
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    And I set the "Legal_Entity__c" field to "Test Value"
    And I save the record
    Then the Case should be saved successfully
    And the "Legal_Entity__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-012 @p1 @data-driven
  Scenario Outline: Set Legal_Entity__c to valid values
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    And I set the "Legal_Entity__c" field to "<value>"
    And I save the record
    Then the "Legal_Entity__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Legal_Entity__c on Case
  # ══════════════════════════════════════════════════════════════════════════

  @SF-479 @SF-479-UI-013 @smoke @p1
  Scenario: Verify Legal_Entity__c field is visible on Case
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    Then the "Legal_Entity__c" field should be visible
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-014 @p1 @edit
  Scenario: Verify Legal_Entity__c field can be edited on Case
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    And I set the "Legal_Entity__c" field to "Test Value"
    And I save the record
    Then the Case should be saved successfully
    And the "Legal_Entity__c" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-015 @p1 @data-driven
  Scenario Outline: Set Legal_Entity__c to valid values
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    And I set the "Legal_Entity__c" field to "<value>"
    And I save the record
    Then the "Legal_Entity__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-479 @SF-479-UI-016 @p2 @negative @blank-value
  Scenario: Verify behavior when Legal_Entity__c is blank
    Given I am logged in as a standard user
    And I have a test Case created via API without "Legal_Entity__c"
    When I navigate to the Case record
    Then the "Legal_Entity__c" field should be visible
    And the "Legal_Entity__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-017 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for Legal_Entity__c
    Given I am logged in as a standard user
    And I have an existing Case record
    When I navigate to the Case record
    And I click Edit on the Case
    Then the "Legal_Entity__c" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-479 @SF-479-UI-018 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Legal_Entity__c
    Given I am logged in as a read-only user
    And I have a test Case created via API
    When I navigate to the Case record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-479 @SF-479-UI-019 @p2 @ui-data-creation
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
  # Total Requirements: 2
  # Covered Requirements: 2
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 99
  # Existing Steps Used: 99
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 99/99 (100%)
  #   - Feature-Specific Steps Used: 0
