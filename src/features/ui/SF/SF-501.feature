# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-501 - Account, Opportunity, Role consolidation
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-removal, field-modification, field-hide
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Account, Opportunity, Role consolidation
# Primary Entity: AccountContactRelation
#
# Fields Involved (3):
#   • Relationship_Strength__c - DELETE (field should not exist)
#   • Roles (standard field) - MODIFY (remove "Other" value, add help text)
#   • Account Contact Relationship Currency - HIDE (field should not be visible)
#
# Test Strategy:
#   - Verify Relationship_Strength__c does NOT exist on AccountContactRelation
#   - Verify Roles picklist does NOT contain "Other"
#   - Verify Account Contact Relationship Currency is NOT visible
#
# ═══════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-501 @medium @accountcontactrelation
Feature: SF-501 - Account, Opportunity, Role consolidation
  As a Salesforce user
  I want to verify the field changes on AccountContactRelation
  So that deleted fields are removed, modified fields have correct values, and hidden fields are not visible

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # REQUIREMENT 1: Relationship_Strength__c - DELETE (field should NOT exist)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-501 @SF-501-UI-001 @smoke @p1 @field-removal
  Scenario: Verify Relationship_Strength__c field does NOT exist on AccountContactRelation detail page
    Given I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Relationship_Strength__c" field should not be visible
    And I take a screenshot as evidence

  @SF-501 @SF-501-UI-002 @p1 @field-removal
  Scenario: Verify Relationship_Strength__c field is not available in edit mode
    Given I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    Then the "Relationship_Strength__c" field should not be visible
    And I take a screenshot as evidence

  @SF-501 @SF-501-UI-003 @p2 @field-removal @admin
  Scenario: Verify Relationship_Strength__c is NOT visible even for admin users
    Given I am logged in as an admin user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Relationship_Strength__c" field should not be visible
    And I take a screenshot as evidence

  @SF-501 @SF-501-UI-004 @p2 @field-removal @standard-user
  Scenario: Verify Relationship_Strength__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Relationship_Strength__c" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # REQUIREMENT 2: Roles picklist - MODIFY (remove "Other" value)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-501 @SF-501-UI-005 @smoke @p1 @picklist
  Scenario: Verify Roles picklist does NOT contain "Other" value
    Given I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    Then the "Roles" picklist should not contain "Other"
    And I take a screenshot as evidence

  @SF-501 @SF-501-UI-006 @p2 @help-text @skip-until-implemented
  Scenario: Verify Roles field has help text explaining how to request new roles
    # NOTE: This test is skipped until help text is implemented in Salesforce
    # Acceptance Criteria 3: "field help text explains how to request a new role"
    Given I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    Then the "Roles" field should have help text
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # REQUIREMENT 3: Account Contact Relationship Currency - HIDE
  # ══════════════════════════════════════════════════════════════════════════

  @SF-501 @SF-501-UI-007 @smoke @p1 @field-hide
  Scenario: Verify Account Contact Relationship Currency is NOT visible on detail page
    Given I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the "Account Contact Relationship Currency" field should not be visible
    And I take a screenshot as evidence

  @SF-501 @SF-501-UI-008 @p1 @field-hide
  Scenario: Verify Account Contact Relationship Currency is NOT visible in edit mode
    Given I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    And I click Edit on the AccountContactRelation
    Then the "Account Contact Relationship Currency" field should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE SCENARIOS - Permission Verification
  # ══════════════════════════════════════════════════════════════════════════

  @SF-501 @SF-501-UI-009 @p2 @negative @permissions
  Scenario: Verify restricted user cannot edit AccountContactRelation
    Given I am logged in as a read-only user
    And I have an existing AccountContactRelation record
    When I navigate to the AccountContactRelation record
    Then the Edit button should not be visible
    And I take a screenshot as evidence
