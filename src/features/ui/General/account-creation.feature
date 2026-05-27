@ui @salesforce @regression
Feature: Salesforce Account Creation
  As a Salesforce user
  I want to create accounts
  So that I can manage customer data

  Background:
    Given I am an authenticated Salesforce user

  @positive @smoke
  Scenario: Create a new account successfully
    Given I am on the Accounts page
    When I create a new account with name "Test Account"
    Then the account should be created successfully
    And I should see the account name "Test Account"

  @negative
  Scenario: Create account with empty name should fail
    Given I am on the Accounts page
    When I click the New button
    And I enter account name ""
    And I click the Save button
    Then I should see an error message

  @boundary
  Scenario Outline: Create account with boundary values
    Given I am on the Accounts page
    When I create a new account with name "<AccountName>"
    Then the account should be created successfully

    Examples:
      | AccountName                    |
      | A                              |
      | Test Account with very long name that exceeds normal limits and should still work |
      | Account with special chars !@# |
