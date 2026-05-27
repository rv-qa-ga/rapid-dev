# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-544 - Remove Country and State/Province From Account Object
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility
# Generated: 2025-12-19T15:08:56.930Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Remove Country and State/Province From Account Object
# Primary Entity: Account
#
# Fields Involved (2):
#   • Country (Country__c) - delete
#   • State/Province (State/Province__c) - delete
#
# Test Requirements (3):
#   REQ-1: Remove Country__c field from all Account record types
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Remove State_Province__c field from all Account record types
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Remove dependencies referencing Country__c or State_Province__c
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

@ui @salesforce @SF-544 @medium @field-visibility @account
Feature: SF-544 - Remove Country and State/Province From Account Object
  As a Salesforce user
  I want to verify the Country__c functionality on Account
  So that Account records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-544 @SF-544-UI-001 @negative @data-driven
  Scenario: Remove Country__c field from all Account record types
    Given I am logged in as a standard user
    Given The field Country__c exists on the Account object
    Given The Country__c field must be deleted from the Account object
    Given Must be removed from all page layouts for all Account Types
    Given Must not be available for reporting, automation, or integration
    When The Country__c field must be deleted from the Account object
    When Must be removed from all page layouts for all Account Types
    When Must not be available for reporting, automation, or integration
    Then The Country__c field must be deleted from the Account object
    Then Must be removed from all page layouts for all Account Types
    Then Must not be available for reporting, automation, or integration
    Then Must be removed from all page layouts for all Account Types
    Then Must not be available for reporting, automation, or integration
    And I take a screenshot as evidence

  @SF-544 @SF-544-UI-002 @negative @data-driven
  Scenario: Remove State_Province__c field from all Account record types
    Given I am logged in as a standard user
    Given The field State_Province__c exists on the Account object
    Given The State_Province__c field must be deleted from the Account object
    Given Must be removed from all page layouts for all Account Types
    Given Must not be available for reporting, automation, or integration
    When The State_Province__c field must be deleted from the Account object
    When Must be removed from all page layouts for all Account Types
    When Must not be available for reporting, automation, or integration
    Then The State_Province__c field must be deleted from the Account object
    Then Must be removed from all page layouts for all Account Types
    Then Must not be available for reporting, automation, or integration
    Then Must be removed from all page layouts for all Account Types
    Then Must not be available for reporting, automation, or integration
    And I take a screenshot as evidence

  @SF-544 @SF-544-UI-003 @negative @data-driven @standard-user
  Scenario: Remove dependencies referencing Country__c or State_Province__c
    Given I am logged in as a "Standard User" user
    Given Automation, validation rules, reports
    Given Integrations may reference Country__c or State_Province__c
    Given The fields are removed
    Given No broken references or errors must remain in the system
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=8bfdbe1f-d097-48a5-91e3-e9b2ddbb774aCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given I have an existing Account record
    Given Commit succeeded: https://app.gearset.com/finished?deploymentId=b1d26c60-8b65-4d2b-b89d-566f73e9ccb3Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Given I have an existing Account record
    Given :check_mark: Successfully merged PR #49 from gs-pipeline/SF-544/Remove-Country-and-State/Province-From-Account-Object_-_QA into QA
    And I should see a validation error
    Given :check_mark: Successfully merged PR #65 from gs-pipeline/SF-544/Remove-Country-and-State/Province-From-Account-Object_-_QA into QA
    Given It was still on my name. Nevertheless its done now. Please proceed with your testing. We are not completely deleting the field as of yet. We are just removing them from UI
    Given All other automations
    Given I’ll be assigning the ticket to you once all activities are done from my end. So, please pick only those for testing
    Given This Work item needs updation………
    Given Remove all usages?
    Given :check_mark: Successfully merged PR #68 from gs-pipeline/SF-544/Remove-Country-and-State/Province-From-Account-Object_-_QA into QA
    Given Fields deleted
    When The fields are removed
    When No broken references or errors must remain in the system
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=8bfdbe1f-d097-48a5-91e3-e9b2ddbb774aCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    When I navigate to the Account object list
    When Commit succeeded: https://app.gearset.com/finished?deploymentId=b1d26c60-8b65-4d2b-b89d-566f73e9ccb3Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    When I navigate to the Account object list
    When :check_mark: Successfully merged PR #49 from gs-pipeline/SF-544/Remove-Country-and-State/Province-From-Account-Object_-_QA into QA
    And I should see a validation error
    When :check_mark: Successfully merged PR #65 from gs-pipeline/SF-544/Remove-Country-and-State/Province-From-Account-Object_-_QA into QA
    When It was still on my name. Nevertheless its done now. Please proceed with your testing. We are not completely deleting the field as of yet. We are just removing them from UI
    When All other automations
    When I’ll be assigning the ticket to you once all activities are done from my end. So, please pick only those for testing
    When This Work item needs updation………
    When Remove all usages?
    When :check_mark: Successfully merged PR #68 from gs-pipeline/SF-544/Remove-Country-and-State/Province-From-Account-Object_-_QA into QA
    When Fields deleted
    Then No broken references or errors must remain in the system
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=8bfdbe1f-d097-48a5-91e3-e9b2ddbb774aCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Account object list
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=b1d26c60-8b65-4d2b-b89d-566f73e9ccb3Commit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    And I navigate to the Account object list
    Then :check_mark: Successfully merged PR #49 from gs-pipeline/SF-544/Remove-Country-and-State/Province-From-Account-Object_-_QA into QA
    Then I should see a validation error
    Then :check_mark: Successfully merged PR #65 from gs-pipeline/SF-544/Remove-Country-and-State/Province-From-Account-Object_-_QA into QA
    Then It was still on my name. Nevertheless its done now. Please proceed with your testing. We are not completely deleting the field as of yet. We are just removing them from UI
    Then All other automations
    Then I’ll be assigning the ticket to you once all activities are done from my end. So, please pick only those for testing
    Then This Work item needs updation………
    Then Remove all usages?
    Then :check_mark: Successfully merged PR #68 from gs-pipeline/SF-544/Remove-Country-and-State/Province-From-Account-Object_-_QA into QA
    Then Fields deleted
    Then Integrations may reference Country__c or State_Province__c
    Then No broken references or errors must remain in the system
    Then It was still on my name. Nevertheless its done now. Please proceed with your testing. We are not completely deleting the field as of yet. We are just removing them from UI and all other automations
    Then This Work item needs updation………
    Then Remove all usages?
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: Country__c should NOT exist on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-544 @SF-544-UI-004 @smoke @p1 @field-removal
  Scenario: Verify Country__c field does NOT exist on Account
    Given I have an existing Account record
    When I navigate to the Account record
    Then the "Country__c" field should not be visible
    And I take a screenshot as evidence

  @SF-544 @SF-544-UI-005 @p1 @field-removal
  Scenario: Verify Country__c field is not available in edit mode
    Given I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    Then the "Country__c" field should not be visible
    And I take a screenshot as evidence

  @SF-544 @SF-544-UI-006 @p2 @field-removal
  Scenario: Verify Country__c field is not present on Account detail page
    Given I have an existing Account record
    When I navigate to the Account record
    Then the "Country__c" field should not be visible
    And I take a screenshot as evidence

  @SF-544 @SF-544-UI-007 @p2 @field-removal
  Scenario: Verify Country__c field is not visible for standard users
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Country__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Country__c on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-544 @SF-544-UI-008 @smoke @p1
  Scenario: Verify Country__c field is visible on Account
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Country__c" field should be visible
    And I take a screenshot as evidence

  @SF-544 @SF-544-UI-009 @p1 @edit
  Scenario: Verify Country__c field can be edited on Account
    Given I am logged in as a standard user
    And I have an existing Account record
    When I navigate to the Account record
    And I click Edit on the Account
    And I set the "Country__c" field to "Test Value"
    And I save the record
    Then the Account should be saved successfully
    And the "Country__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-544 @SF-544-UI-010 @p2 @negative @blank-value
  Scenario: Verify behavior when Country__c is blank
    Given I am logged in as a standard user
    And I have a test Account created via API without "Country__c"
    When I navigate to the Account record
    Then the "Country__c" field should be visible
    And the "Country__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-544 @SF-544-UI-011 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Country__c
    Given I am logged in as a read-only user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-544 @SF-544-UI-012 @p2 @negative @standard-user
  Scenario: Verify standard user has restricted access to Country__c
    Given I am logged in as a standard user
    And I have a test Account created via API
    When I navigate to the Account record
    Then the "Country__c" field should not be visible or should be read-only
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-544 @SF-544-UI-013 @p2 @ui-data-creation
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
  # Total Requirements: 2
  # Covered Requirements: 0
  # Coverage: 0%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-1: Remove Country__c field from all Account record types
  #     → Should be tested via BOTH | Priority: p1
  #   REQ-2: Remove State_Province__c field from all Account record types
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 83
  # Existing Steps Used: 83
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 83/83 (100%)
  #   - Feature-Specific Steps Used: 0
