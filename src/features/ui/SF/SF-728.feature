# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-728 - Retire Region/Distribution Region and replace with formula fields
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-retirement, formula-fields, field-visibility
# Generated: 2026-02-18 (FeatureGenerator v3.1) | Mode 4 RBT
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT)
# Primary Entities: Account, Lead
# Summary: Retire existing Region__c and Distribution_Region__c on Account and Lead;
#          replace with formula fields (UNSD Region, Distribution Region) derived from Country.
#
# Fields:
#   Account: Region__c (retire), UNSD Region formula (new), Distribution_Region__c (retire), Distribution Region formula (new)
#   Lead:    Region__c (retire), UNSD Region formula (new), Distribution_Region__c (retire), Distribution Region formula (new)
#
# Roles and Permissions: Any user who can read or edit Lead or Account should see the new formula fields.
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-728 @medium @field-retirement @formula-fields @region @rbt
Feature: SF-728 - Retire Region and Distribution Region and replace with formula fields
  As an MRD
  I want the existing Distribution Region field and Region field on Leads and Accounts to be retired and replaced with formula fields
  So that Distribution field and Region field are always automatically derived from Country reference data and cannot be manually edited or incorrectly populated

  Background:
    Given I am logged in as a "QA MRD User" user

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: Retire existing Region field on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-UI-001 @p1 @account @region @retire
  Scenario: Retire existing Region field on Account
    Given the Account object contains a field currently labelled Region and API name "Region__c"
    When the new formula based UNSD Region field is introduced
    Then the existing Region field must be removed from Account page layouts
    And the existing Region field must be removed from Lightning record pages
    And the existing Region field must be removed from reports and list views
    And the field "Region__c" must no longer be editable or populated on Account
    And the field "Region__c" must be fully deleted from the Account object
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: Add new UNSD Region formula field on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-UI-002 @p1 @account @region @formula
  Scenario: Add new UNSD Region formula field on Account
    Given the Account object exists
    When the new UNSD Region formula field is created on Account
    Then a new formula field must be added to Account with label "UNSD Region"
    And the field must be read-only by design (formula)
    And the field must be added to the Account page layout
    And help text on the UNSD Region field should state:
      """
      This field reflects the UNSD (United Nations Statistics Division) region classification for the selected Country. It is automatically derived and cannot be edited manually.
      """
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 3: Retire existing Region field on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-UI-003 @p1 @lead @region @retire
  Scenario: Retire existing Region field on Lead
    Given the Lead object contains a field currently labelled Region and API name "Region__c"
    When the new formula based UNSD Region field is introduced
    Then the existing Region field must be removed from Lead page layouts
    And the existing Region field must be removed from Lightning record pages
    And the existing Region field must be removed from reports and list views
    And the field "Region__c" must no longer be editable or populated on Lead
    And the field "Region__c" must be fully deleted from the Lead object
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 4: Add new UNSD Region formula field on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-UI-004 @p1 @lead @region @formula
  Scenario: Add new UNSD Region formula field on Lead
    Given the Lead object exists
    When the new UNSD Region formula field is created on Lead
    Then a new formula field must be added to Lead with label "UNSD Region"
    And the field must be read-only by design (formula)
    And the field must be added to the Lead page layout
    And help text on the UNSD Region field should state:
      """
      This field reflects the UNSD (United Nations Statistics Division) region classification for the selected Country. It is automatically derived and cannot be edited manually.
      """
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 5: Retire existing Distribution Region field on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-UI-005 @p1 @account @distribution-region @retire
  Scenario: Retire existing Distribution Region field on Account
    Given the Account object contains a field currently labelled Distribution Region and API name "Distribution_Region__c"
    When the new formula based Distribution Region field is introduced
    Then the existing Distribution Region field must be removed from Account page layouts
    And the existing Distribution Region field must be removed from Lightning record pages
    And the existing Distribution Region field must be removed from reports and list views
    And the field "Distribution_Region__c" must no longer be editable or populated on Account
    And the field "Distribution_Region__c" must be fully deleted from the Account object
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 6: Add new Distribution Region formula field on Account
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-UI-006 @p1 @account @distribution-region @formula
  Scenario: Add new Distribution Region formula field on Account
    Given the Account object exists
    When the new Distribution Region formula field is created on Account
    Then a new formula field must be added to Account with label "Distribution Region"
    And the field must be read-only by design (formula)
    And the field must be added to the Account page layout
    And help text on the Distribution Region field should state:
      """
      This field reflects where the distribution team see the Account being located. It is automatically derived and cannot be edited manually
      """
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 7: Retire existing Distribution Region field on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-UI-007 @p1 @lead @distribution-region @retire
  Scenario: Retire existing Distribution Region field on Lead
    Given the Lead object contains a field currently labelled Distribution Region and API name "Distribution_Region__c"
    When the new formula based Distribution Region field is introduced
    Then the existing Distribution Region field must be removed from Lead page layouts
    And the existing Distribution Region field must be removed from Lightning record pages
    And the existing Distribution Region field must be removed from reports and list views
    And the field "Distribution_Region__c" must no longer be editable or populated on Lead
    And the field "Distribution_Region__c" must be fully deleted from the Lead object
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 8: Add new Distribution Region formula field on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-UI-008 @p1 @lead @distribution-region @formula
  Scenario: Add new Distribution Region formula field on Lead
    Given the Lead object exists
    When the new Distribution Region formula field is created on Lead
    Then a new formula field must be added to Lead with label "Distribution Region"
    And the field must be read-only by design (formula)
    And the field must be added to the Lead page layout
    And help text on the Distribution Region field should state:
      """
      This field reflects where the distribution team see the lead being located. It is automatically derived and cannot be edited manually
      """
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Roles and Permissions: Any user who can read or edit Lead or Account
  # should see the new formula driven fields
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-UI-009 @p2 @permissions
  Scenario: Users with read or edit on Account see new formula fields
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create a Account
    Then the "UNSD Region" field is visible on the Account page layout
    And the "Distribution Region" field is visible on the Account page layout
    And both formula fields are read-only
    And I take a screenshot as evidence

  @SF-728 @SF-728-UI-010 @p2 @permissions
  Scenario: Users with read or edit on Lead see new formula fields
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    Then the "UNSD Region" field is visible on the Lead page layout
    And the "Distribution Region" field is visible on the Lead page layout
    And both formula fields are read-only
    And I take a screenshot as evidence
