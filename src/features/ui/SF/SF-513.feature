# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-513 - Remove Lead LOB Object and Redundant Location Fields
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-removal, field-visibility
# Generated: 2026-03-01 (FeatureGenerator v3.1) | Mode 4 RBT | Lead object
# ══════════════════════════════════════════════════════════════════════════════
#
# User story (Data Steward):
#   As a Data Steward I want to remove the obsolete Line of Business custom
#   object and related country/state/province picklist fields from the Lead,
#   so that the Lead object contains only fields that are actively used and
#   maintained, reducing duplication and data inconsistency.
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - UI test cases; Lead object only.
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Remove Lead LOB Object and Redundant Location Fields
# Primary Entity: Lead
#
# Components to remove:
#   • Lead LOB custom object – REMOVE from Salesforce
#   • Country__c, State_Province__c – REMOVE from Lead; must not appear on layouts/forms
#   • All dependency logic linking Region to Country/State-Province – REMOVE
#
# Components to maintain:
#   • Line_of_Business_Created__c – MUST remain functional (reference new custom object)
#   • Number_of_LOB_Created__c – MUST remain functional (reference new custom object)
#   • Region__c – MUST function independently
#
# Scenarios (5): Deprecate LOB object; Remove country/state-province from Lead;
#   Remove Region dependencies; Update dependencies referencing removed components;
#   Maintain Line_of_Business_Created__c and Number_of_LOB_Created__c.
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-513 @medium @salesforce @field-removal @field-visibility @lead
Feature: SF-513 - Remove Lead LOB Object and Redundant Location Fields
  As a Data Steward
  I want to remove the obsolete Line of Business custom object and related country/state/province picklist fields from the Lead
  So that the Lead object contains only fields that are actively used and maintained, reducing duplication and data inconsistency

  Background:
    Given I am logged in as a "Accelerant - System administrator" user

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: Lead LOB custom object is deprecated
  # ══════════════════════════════════════════════════════════════════════════

  @SF-513 @SF-513-UI-001 @p1 @smoke @field-removal @lob-deprecated
  Scenario: Lead LOB custom object is deprecated
    Given the Lead LOB custom object is no longer required
    When the system is updated
    Then the Lead LOB custom object must be removed from Salesforce
    And any references to it in page layouts, automation, or reports must be deleted or replaced
    And I take a screenshot as evidence

  @SF-513 @SF-513-UI-002 @p1 @field-removal @lob-object-gone
  Scenario: Verify Lead LOB custom object reference is not present on Lead setup
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Lead object setup page
    Then the "Lead_LOB_Object__c" field should not exist on the setup page
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: Remove country and state/province picklists from Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-513 @SF-513-UI-003 @p1 @smoke @field-removal @country-state-removed
  Scenario: Remove country and state/province picklists from Lead
    Given the Lead object contains fields for Country and State/Province
    When the system is updated
    Then they must be removed from the Lead object
    And the fields must no longer appear on any page layouts or forms
    And I take a screenshot as evidence

  @SF-513 @SF-513-UI-004 @p1 @field-removal
  Scenario: Country and State/Province not visible on Lead create form
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    Then the "Country__c" field should not be visible
    And the "State_Province__c" field should not be visible
    And I take a screenshot as evidence

  @SF-513 @SF-513-UI-005 @p1 @field-removal @edit-form
  Scenario: Country and State/Province not visible on Lead edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "Country__c" field should not be visible
    And the "State_Province__c" field should not be visible
    And I take a screenshot as evidence

  @SF-513 @SF-513-UI-006 @p1 @field-removal @detail-view
  Scenario: Country and State/Province not visible on Lead detail page
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Country__c" field should not be visible
    And the "State_Province__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 3: Remove dependencies between Region and Country/State/Province
  # ══════════════════════════════════════════════════════════════════════════

  @SF-513 @SF-513-UI-007 @p1 @field-visibility @region-independent
  Scenario: Remove dependencies between Region and Country / State and Province fields
    Given the Region field currently drives the Country or State/Province picklists
    When the Country and State/Province fields are removed
    Then all dependency logic, filters, or automation linking Region to these fields must also be removed
    And the Region field must continue to function independently
    And I take a screenshot as evidence

  @SF-513 @SF-513-UI-008 @p1 @field-visibility
  Scenario: Region field functions independently on Lead without Country/State-Province
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Region__c" field to "EU"
    And I save the record
    Then the Lead should be saved successfully
    And the "Region__c" field should display "EU"
    And the "Country__c" field should not be visible
    And the "State_Province__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 4: Dependencies referencing removed components are updated
  # ══════════════════════════════════════════════════════════════════════════

  @SF-513 @SF-513-UI-009 @p2 @field-removal @dependencies-updated
  Scenario: Dependencies referencing removed components are updated
    Given the Lead LOB object and Country, State, and Province fields are removed
    When automation, validation rules, and integrations are reviewed
    Then any dependencies or references to these components must be deleted or updated to prevent errors
    And I take a screenshot as evidence

  @SF-513 @SF-513-UI-010 @p2 @validation
  Scenario: No validation errors reference removed Lead LOB or Country/State-Province
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then no validation errors should reference "Country__c"
    And no validation errors should reference "State_Province__c"
    And no validation errors should reference "Lead_LOB_Object__c"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 5: Maintain functionality of Line_of_Business_Created__c and Number_of_LOB_Created__c
  # ══════════════════════════════════════════════════════════════════════════

  @SF-513 @SF-513-UI-011 @p1 @smoke @field-visibility @lob-fields-maintained
  Scenario: Maintain functionality of Line_of_Business_Created__c and Number_of_LOB_Created__c
    Given the Lead LOB custom object is being removed
    When the new Line of Business custom object is introduced
    Then the fields "Line_of_Business_Created__c" and "Number_of_LOB_Created__c" must continue to provide the same functionality as they do today
    And these fields must now reference and be linked to the new custom object instead of the deprecated Lead LOB object
    And no loss of existing functionality or reporting capability must occur as a result of this change
    And I take a screenshot as evidence

  @SF-513 @SF-513-UI-012 @p1 @field-visibility
  Scenario: Line_of_Business_Created__c and Number_of_LOB_Created__c visible on Lead
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Line_of_Business_Created__c" field should be visible
    And the "Number_of_LOB_Created__c" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD REMOVAL: Country__c and State_Province__c should NOT exist on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-513 @SF-513-UI-013 @p1 @field-removal
  Scenario: Verify Country__c field does NOT exist on Lead
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Country__c" field should not be visible
    And I take a screenshot as evidence

  @SF-513 @SF-513-UI-014 @p1 @field-removal
  Scenario: Verify State_Province__c field does NOT exist on Lead
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "State_Province__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (Mode 4 RBT)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-513 @SF-513-UI-015 @p2 @ui-data-creation
  Scenario: Create Lead record via UI without Country and State_Province
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And the "Country__c" field should not be visible
    And the "State_Province__c" field should not be visible
    And I take a screenshot as evidence
