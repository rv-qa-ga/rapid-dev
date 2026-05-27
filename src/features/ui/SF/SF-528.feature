# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-528 - Type on the lead to include only member or Non-Member MGA
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: picklist-values
# Updated: 2026-01-26 - Regenerated with proper test scenarios
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Type on the lead to include only member or Non-Member MGA
# Primary Entity: Lead
#
# Field Configuration:
#   • Field Label: "Type"
#   • API Name: Type__c
#   • Field Type: Picklist (Required)
#   • Valid Selectable Values: Member, Non-Member MGA
#   • Note: --None-- is standard Salesforce behavior (appears in all picklists)
#     but the field is required, so --None-- cannot be saved
#   • Invalid Values: Any other account types (should not be available)
#
# Test Requirements (3):
#   REQ-1: Lead Type field only displays Member and Non-Member MGA
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Lead creation requires a valid Lead Type
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Phase 1 scope enforcement
#     → Test Type: BOTH | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Blank/null value handling (should block save)
#   - Permission-based access control
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-528 @medium @picklist @lead @required-field
Feature: SF-528 - Type on the lead to include only member or Non-Member MGA
  As an MRD
  I want the Lead Type to only allow selection of Member or Non-Member MGA
  So that Leads created in Phase 1 are limited to the account types included in the Member onboarding scope

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-528 @SF-528-UI-001 @p1 @smoke @positive @picklist-values @scope-enforcement
  Scenario: Verify Type__c picklist contains only Member and Non-Member MGA as valid values
    Given I am logged in as a "MRD" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I click on the "Type__c" picklist
    Then I should see the following valid picklist values:
      | Member          |
      | Non-Member MGA  |
    And the "--None--" option may be present (standard Salesforce behavior)
    But the field should be required so "--None--" cannot be saved
    And no other account types should be available
    And the field should be required to enforce Phase 1 scope
    And I take a screenshot as evidence

  @SF-528 @SF-528-UI-002 @p1 @positive @picklist-values @edit-form
  Scenario: Verify Type__c picklist shows only Member and Non-Member MGA in edit mode
    Given I am logged in as a "MRD" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I click on the "Type__c" picklist
    Then I should see the following valid picklist values:
      | Member          |
      | Non-Member MGA  |
    And the "--None--" option may be present (standard Salesforce behavior)
    But the field should be required so "--None--" cannot be saved
    And I should not see any other account type values
    And I take a screenshot as evidence

  @SF-528 @SF-528-UI-003 @p1 @positive @data-driven @required-field @ui-data-creation
  Scenario Outline: Create Lead record via UI with valid Type__c values
    Given I am logged in as a "MRD" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in all available Lead fields
    And I set the "Type__c" field to "<type>"
    And I save the record
    Then the Lead should be created successfully
    And the "Type__c" field should display "<type>"
    And I take a screenshot as evidence

    Examples:
      | type            |
      | Member          |
      | Non-Member MGA  |

  @SF-528 @SF-528-UI-004 @p2 @negative @required-field @validation
  Scenario: Verify behavior when Type__c is blank - save should be blocked
    Given I am logged in as a "MRD" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields except "Type__c"
    And I attempt to save the record
    Then the save should be blocked
    And a validation error should indicate that "Type__c" is required
    And I take a screenshot as evidence

  @SF-528 @SF-528-UI-005 @p2 @negative @validation @scope-enforcement
  Scenario: Verify invalid value cannot be set for Type__c - picklist only contains valid values
    Given I am logged in as a "MRD" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I click on the "Type__c" picklist
    Then the picklist should only contain "Member" and "Non-Member MGA"
    And no invalid values should be available
    And no other account types should be available
    And the field should be required to enforce Phase 1 scope
    And I take a screenshot as evidence

  @SF-528 @SF-528-UI-008 @p1 @data-driven
  Scenario Outline: Set Type__c to valid picklist values
    Given I am logged in as a "MRD" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Type__c" field to "<value>"
    And I save the record
    Then the Lead should be saved successfully
    And the "Type__c" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value           |
      | Member          |
      | Non-Member MGA  |

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Type__c on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-528 @SF-528-UI-009 @smoke @p1
  Scenario: Verify Type__c field is visible on Lead
    Given I am logged in as a "MRD" user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Type__c" field should be visible
    And I take a screenshot as evidence

  @SF-528 @SF-528-UI-010 @p1 @edit
  Scenario: Verify Type__c field can be edited on Lead
    Given I am logged in as a "MRD" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Type__c" field should be visible and editable
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════


  @SF-528 @SF-528-UI-013 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Type__c
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  @SF-528 @SF-528-UI-014 @p2 @negative @standard-user
  Scenario: Verify standard user has appropriate access to Type__c
    Given I am logged in as a standard user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the "Type__c" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION
  # ══════════════════════════════════════════════════════════════════════════

