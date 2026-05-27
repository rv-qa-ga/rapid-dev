# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-574 - Delete Member Qualification Action Plan field on the lead
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-removal
# Updated: 2026-01-26 - Regenerated with proper field deletion test scenarios
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
# API TESTS - Comprehensive Coverage
#
# NEGATIVE/BOUNDARY:
#   - Field should not exist in metadata
#   - API should reject attempts to use the field
#   - Lead operations should work without the field
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-574 @medium @lead @field-removal
Feature: API - SF-574 - Delete Member Qualification Action Plan field on the lead

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD DELETION VERIFICATION - Field Should NOT Exist
  # ══════════════════════════════════════════════════════════════════════════

  @SF-574 @SF-574-API-001 @smoke @p1 @field-removal
  Scenario: API - Verify Member_Qualification_Action_Plan__c field does NOT exist on Lead
    When I describe the Lead object fields
    Then the "Member_Qualification_Action_Plan__c" field should not exist

  @SF-574 @SF-574-API-002 @p1 @field-removal
  Scenario: API - Verify Member_Qualification_Action_Plan__c is not in Lead metadata
    When I describe the Lead object fields
    And I inspect all field metadata
    Then the field list should not contain "Member_Qualification_Action_Plan__c"

  # ══════════════════════════════════════════════════════════════════════════
  # API OPERATIONS - Field Should Be Rejected
  # ══════════════════════════════════════════════════════════════════════════

  @SF-574 @SF-574-API-003 @p1 @negative @api-create
  Scenario: API - Reject attempt to create Lead with Member_Qualification_Action_Plan__c
    When I create a new Lead via POST with:
      | field | value |
      | LastName | API Test Lead |
      | Company | Test Company |
      | Member_Qualification_Action_Plan__c | true |
    Then the API should return an error
    And the error response should mention "Member_Qualification_Action_Plan__c" or "field does not exist"

  @SF-574 @SF-574-API-004 @p1 @negative @api-update
  Scenario: API - Reject attempt to update Member_Qualification_Action_Plan__c on Lead
    Given I have an existing Lead record
    When I update the Lead field "Member_Qualification_Action_Plan__c" to "true" via API
    Then the API should return an error
    And the error response should mention "Member_Qualification_Action_Plan__c" or "field does not exist"

  @SF-574 @SF-574-API-005 @p2 @negative @api-query
  Scenario: API - Reject attempt to query Lead by Member_Qualification_Action_Plan__c
    When I query Lead where "Member_Qualification_Action_Plan__c" equals "true"
    Then the API should return an error
    And the error response should mention "Member_Qualification_Action_Plan__c" or "field does not exist"

  # ══════════════════════════════════════════════════════════════════════════
  # API OPERATIONS - Lead Operations Should Work Without Field
  # ══════════════════════════════════════════════════════════════════════════

  @SF-574 @SF-574-API-006 @p1 @api-create
  Scenario: API - Create Lead without Member_Qualification_Action_Plan__c
    When I create a new Lead via POST with:
      | field | value |
      | LastName | API Test Lead |
      | Company | Test Company |
      | Status | New |
    Then the API should return status code 201
    And the response should contain the new Lead ID
    And the response should not contain "Member_Qualification_Action_Plan__c"

  @SF-574 @SF-574-API-007 @p1 @api-update @data-driven
  Scenario Outline: API - Update Lead status without Member_Qualification_Action_Plan__c
    Given I have an existing Lead record with status "<fromStatus>"
    When I update the Lead field "Status" to "<toStatus>" via API
    Then the API should return status code 204

    Examples:
      | fromStatus | toStatus     |
      | New        | Funnel       |
      | Funnel     | Qualified    |
      | Funnel     | Converted    |
      | New        | Unqualified  |

  @SF-574 @SF-574-API-008 @p2 @api-query
  Scenario: API - Query Lead without Member_Qualification_Action_Plan__c
    Given I have an existing Lead record
    When I query the Lead record via API
    Then the API should return status code 200
    And the response should not contain "Member_Qualification_Action_Plan__c"

  # ══════════════════════════════════════════════════════════════════════════
  # LEAD STATUS PROGRESSION - All Statuses Should Work
  # ══════════════════════════════════════════════════════════════════════════

  @SF-574 @SF-574-API-009 @p2 @status-progression
  Scenario: API - Lead status progression works without the field - New to Funnel
    Given I have an existing Lead record with status "New"
    When I update the Lead field "Status" to "Funnel" via API
    Then the API should return status code 204
    And the Lead status should be "Funnel"
    And no validation errors should occur

  @SF-574 @SF-574-API-010 @p2 @status-progression
  Scenario: API - Lead status progression works without the field - Funnel to Qualified
    Given I have an existing Lead record with status "Funnel"
    When I update the Lead field "Status" to "Qualified" via API
    Then the API should return status code 204
    And the Lead status should be "Qualified"
    And no validation errors should occur

  @SF-574 @SF-574-API-011 @p2 @status-progression
  Scenario: API - Lead status progression works without the field - Funnel to Converted
    Given I have an existing Lead record with status "Funnel"
    When I update the Lead field "Status" to "Converted" via API
    Then the API should return status code 204
    And the Lead status should be "Converted"
    And no validation errors should occur

  @SF-574 @SF-574-API-012 @p2 @status-progression
  Scenario: API - Lead status progression works without the field - Any Status to Unqualified
    Given I have an existing Lead record with status "Funnel"
    When I update the Lead field "Status" to "Unqualified" via API
    Then the API should return status code 204
    And the Lead status should be "Unqualified"
    And no validation errors should occur

  # ══════════════════════════════════════════════════════════════════════════
  # LEAD CONVERSION - Should Work Without Field
  # ══════════════════════════════════════════════════════════════════════════

  @SF-574 @SF-574-API-013 @p2 @lead-conversion
  Scenario: API - Lead conversion works without Member_Qualification_Action_Plan__c
    Given I have an existing Lead record with status "Funnel"
    When I convert the Lead to Opportunity via API
    Then the API should return status code 200
    And the Lead should be converted successfully
    And no validation errors should reference "Member_Qualification_Action_Plan__c"

  # ══════════════════════════════════════════════════════════════════════════
  # VALIDATION RULE VERIFICATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-574 @SF-574-API-014 @p2 @validation-removal
  Scenario: API - Verify no validation rules reference Member_Qualification_Action_Plan__c
    When I describe the Lead object validation rules
    Then no validation rules should reference "Member_Qualification_Action_Plan__c"
    And no validation rules should mention "Member Qualification Action Plan"
