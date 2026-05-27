# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-574 - Delete Member Qualification Action Plan field on the lead
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-removal
# Updated: 2026-01-26 - Consolidated scenarios for MRD User, removed duplicates
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Delete Member Qualification Action Plan field on the lead
# Primary Entity: Lead
#
# Field to Delete:
#   • Member Qualification Action Plan (Member_Qualification_Action_Plan__c) - DELETE
#
# Test Requirements (4):
#   REQ-1: Member Qualification Action Plan field is deleted from Lead
#     → Test Type: API | Priority: p1
#   REQ-2: Field no longer appears on any Lead layout
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Remove validations tied to Member Qualification Action Plan
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Lead status progression works without the field
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Field should not be visible anywhere
#   - No validation errors should reference the field
#   - Lead status transitions should work without the field
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-574 @medium @lead @field-removal
Feature: SF-574 - Delete Member Qualification Action Plan field on the lead
  As an MRD
  I want the Member Qualification Action Plan field to be deleted from the Lead
  So that obsolete data capture and unnecessary validation logic are fully retired from the Lead process

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS - MRD USER
  # ══════════════════════════════════════════════════════════════════════════

  @SF-574 @SF-574-UI-001 @p1 @smoke @positive @field-removal
  Scenario: Verify Member Qualification Action Plan field is deleted from Lead
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object setup page
    And I inspect the fields for "Lead"
    Then the "Member_Qualification_Action_Plan__c" field should not exist on the setup page
    And I take a screenshot as evidence

  @SF-574 @SF-574-UI-002 @p1 @positive @field-removal
  Scenario: Verify Member_Qualification_Action_Plan__c field is not visible on Lead detail page
    Given I am logged in as a "QA MRD User" user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Member_Qualification_Action_Plan__c" field should not be visible
    And I take a screenshot as evidence

  @SF-574 @SF-574-UI-003 @p1 @positive @field-removal @edit-form
  Scenario: Verify Member_Qualification_Action_Plan__c field is not visible in edit mode
    Given I am logged in as a "QA MRD User" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Member_Qualification_Action_Plan__c" field should not be visible
    And I take a screenshot as evidence

  @SF-574 @SF-574-UI-004 @p2 @positive @field-removal @ui-data-creation
  Scenario: Verify Member_Qualification_Action_Plan__c field is not visible on Lead creation form
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    Then the "Member_Qualification_Action_Plan__c" field should not be visible
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And the "Member_Qualification_Action_Plan__c" field should not be visible
    And I take a screenshot as evidence

  @SF-574 @SF-574-UI-005 @p2 @positive @validation-removal
  Scenario: Verify no validation errors reference Member_Qualification_Action_Plan__c
    Given I am logged in as a "QA MRD User" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Status" field to "Funnel"
    And I save the record
    Then the Lead should be saved successfully
    And no validation errors should be displayed
    And no validation errors should reference "Member_Qualification_Action_Plan__c"
    And no validation errors should mention "Member Qualification Action Plan"
    And I take a screenshot as evidence

  @SF-574 @SF-574-UI-006 @p2 @positive @status-progression @data-driven
  Scenario Outline: Verify Lead status progression works without the field
    Given I am logged in as a "QA MRD User" user
    And I have an existing Lead record with status "<fromStatus>"
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Status" field to "<toStatus>"
    And I save the record
    Then the Lead should be saved successfully
    And the "Status" field should display "<toStatus>"
    And no validation errors should reference "Member_Qualification_Action_Plan__c"
    And I take a screenshot as evidence

    Examples:
      | fromStatus | toStatus     |
      | New        | Funnel       |
      | Funnel     | Qualified    |
      | Funnel     | Converted    |
      | New        | Unqualified  |
      | Funnel     | Unqualified  |
