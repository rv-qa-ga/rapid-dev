# JIRA: SF-709 - Restrict Account Status values by Account Type
# Mode: 4 RBT placeholder. Expand from Jira or: npm run jira:generate -- SF-709 --mode=4 --overwrite-all

@ui @salesforce @SF-709 @medium @rbt @account
Feature: SF-709 - Restrict Account Status values by Account Type
  As a Salesforce user
  I want Account Status values to be restricted by Account Type
  So that only valid status values are available per type

  Background:
    Given I am an authenticated Salesforce user

  @SF-709 @SF-709-UI-001 @p1 @smoke @rbt
  Scenario: Placeholder - Account Status restricted by Account Type (expand from Jira)
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Account object list
    And I take a screenshot as evidence
