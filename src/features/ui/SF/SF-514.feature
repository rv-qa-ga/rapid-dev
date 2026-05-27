# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-514 - Capture Line of Business Information on Lead
# Type: Story | Priority: Medium
# User story: As an MRD – capture one or more Lines of Business on a Lead so we
#   can understand what types of business are being offered early in the sales lifecycle.
# Roles: Read only for all users, Read/Edit access for MRD
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-514 @medium @field-visibility @lead @line-of-business
Feature: SF-514 - Capture Line of Business Information on Lead
  As an MRD
  I want to capture one or more Lines of Business on a Lead
  So that we can understand what types of business are being offered early in the sales lifecycle

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 1: Select multiple Lines of Business for a Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-514 @SF-514-UI-001 @p1 @smoke @positive
  Scenario: Select multiple Lines of Business for a Lead
    Given I am logged in as a "QA MRD User" user
    And I am creating or editing a Lead
    When I select one or more Lines of Business
    Then the Lead should allow multiple Lines of Business to be recorded
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 2: Capture non-standard Lines of Business
  # ══════════════════════════════════════════════════════════════════════════

  @SF-514 @SF-514-UI-002 @p1 @positive
  Scenario: Capture non-standard Lines of Business
    Given I am logged in as a "QA MRD User" user
    And I am creating or editing a Lead
    When the Line of Business offered is not in the standard list
    Then I should be able to select "Other (not included)" as a Line of Business
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 3: Prevent qualification or disqualification without a Line of Business
  # ══════════════════════════════════════════════════════════════════════════

  @SF-514 @SF-514-UI-003 @p1 @positive @negative
  Scenario: Prevent qualification or disqualification without a Line of Business
    Given I am logged in as a "QA MRD User" user
    And I am attempting to qualify or disqualify a Lead
    And no Line of Business has been selected
    When I attempt to qualify or disqualify the Lead
    Then the Lead should not be eligible for qualification or disqualification
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 4: Allow qualification or disqualification when at least one Line of Business is selected
  # ══════════════════════════════════════════════════════════════════════════

  @SF-514 @SF-514-UI-004 @p1 @positive
  Scenario: Allow qualification or disqualification when at least one Line of Business is selected
    Given I am logged in as a "QA MRD User" user
    And I am attempting to qualify or disqualify a Lead
    And at least one Line of Business has been selected
    When I qualify or disqualify the Lead
    Then the Lead should be eligible for qualification or disqualification
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 5: Support reporting on non-standard Lines of Business
  # ══════════════════════════════════════════════════════════════════════════

  @SF-514 @SF-514-UI-005 @p1 @positive
  Scenario: Support reporting on non-standard Lines of Business
    Given I am logged in as a "QA MRD User" user
    And Leads have been captured with Lines of Business
    When a Line of Business of "Other (not included)" is selected
    Then the Lead data should support reporting on the use of non-standard Lines of Business
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ROLES AND PERMISSIONS: Read-only for non-MRD users
  # ══════════════════════════════════════════════════════════════════════════

  @SF-514 @SF-514-UI-006 @p2 @read-only @permissions
  Scenario: Line of Business field is read-only for non-MRD users
    Given I am logged in as a "Standard User" user
    And I have an existing Lead record with Line of Business populated
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "TypeLines_of_Business__c" field should not be editable
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-514 @SF-514-UI-007 @p2 @ui-data-creation
  Scenario: Create Lead record via UI with Line of Business
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I select one or more Lines of Business
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence
