@api @salesforce @regression
Feature: Salesforce Account API
  As an API user
  I want to manage accounts via API
  So that I can automate account operations

  Background:
    Given I have a valid Salesforce API token

  @positive @smoke
  Scenario: Create a new account via API
    When I create an account with name "API Test Account"
    Then the account should be created successfully
    And the response should contain account ID
    And I should be able to retrieve the account by ID

  @negative
  Scenario: Create account with invalid data
    When I create an account with name ""
    Then the API should return error status 400
    And the error message should contain "required field"

  @positive
  Scenario: Create account using test data from Excel
    Given I load test data for test case "SF-201-001"
    When I create an account using the loaded test data
    Then the account should be created successfully
