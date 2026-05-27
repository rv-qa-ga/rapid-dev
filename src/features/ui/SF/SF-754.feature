# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-754 - Restrict Lookups on Member, Legal Entity and Group relationships
# Type: Story | Priority: Medium
# User story: As an MRD – Account lookups on the Member–Legal Entity–Group
#   Relationship object restricted by Account Type so only valid accounts can be selected.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-754 @medium @lookup @member @legal-entity @group @account-type
Feature: SF-754 - Restrict Lookups on Member, Legal Entity and Group relationships
  As an MRD
  I want the Account lookups on the Member–Legal Entity–Group Relationship object to be restricted by Account Type
  So that only valid account records can be selected for each role in the relationship and incorrect associations are prevented

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 1: Restrict Member lookup to Member accounts
  # ══════════════════════════════════════════════════════════════════════════

  @SF-754 @SF-754-UI-001 @p1 @smoke @positive
  Scenario: Restrict Member lookup to Member accounts
    Given I am logged in as a "QA MRD User" user
    And a user is creating or editing a Member–Legal Entity–Group Relationship record
    When the user searches for an Account in the Member lookup field
    Then only Account records with Account Type = "Member" or "Non-Member MGA" must be available for selection
    And Accounts with any other Account Type must not be selectable
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 2: Restrict Legal Entity lookup to Legal Entity accounts
  # ══════════════════════════════════════════════════════════════════════════

  @SF-754 @SF-754-UI-002 @p1 @positive
  Scenario: Restrict Legal Entity lookup to Legal Entity accounts
    Given I am logged in as a "QA MRD User" user
    And a user is creating or editing a Member–Legal Entity–Group Relationship record
    When the user searches for an Account in the Legal Entity lookup field
    Then only Account records with Account Type = "Legal Entity" must be available for selection
    And Accounts with any other Account Type must not be selectable
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 3: Restrict Group lookup to Group accounts
  # ══════════════════════════════════════════════════════════════════════════

  @SF-754 @SF-754-UI-003 @p1 @positive
  Scenario: Restrict Group lookup to Group accounts
    Given I am logged in as a "QA MRD User" user
    And a user is creating or editing a Member–Legal Entity–Group Relationship record
    When the user searches for an Account in the Group lookup field
    Then only Account records with Account Type = "Group" must be available for selection
    And Accounts with any other Account Type must not be selectable
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-754 @SF-754-UI-004 @p2 @ui-data-creation
  Scenario: Create Member–Legal Entity–Group Relationship record via UI
    Given I am logged in as a "QA MRD User" user
    And I have Account records of Type Member, Legal Entity, and Group
    When I create a new Member–Legal Entity–Group Relationship record
    And I select a Member account in the Member lookup
    And I select a Legal Entity account in the Legal Entity lookup
    And I select a Group account in the Group lookup
    And I save the record
    Then the record should be created successfully
    And I take a screenshot as evidence
