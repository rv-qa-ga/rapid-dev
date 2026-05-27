@api @dynamics @d365 @regression
Feature: Dynamics 365 Account CRUD API
  As an API user
  I want to manage accounts via Dynamics 365 API
  So that I can automate account operations

  Background:
    Given I have a valid Dynamics 365 API token

  @positive @smoke
  Scenario: Create a new account via Dynamics API
    When I create a Dynamics account with name "Dynamics API Test Account"
    Then the account should be created successfully
    And the response should contain account ID
    And I should be able to retrieve the Dynamics account by ID

  @positive
  Scenario: Update an existing Dynamics account
    Given I have created a Dynamics account with name "Dynamics Update Test Account"
    When I update the Dynamics account name to "Dynamics Updated Account Name"
    Then the account should be updated successfully
    And I should be able to retrieve the Dynamics account by ID
    And the account name should be "Dynamics Updated Account Name"

  @positive
  Scenario: Delete a Dynamics account
    Given I have created a Dynamics account with name "Dynamics Delete Test Account"
    When I delete the Dynamics account
    Then the account should be deleted successfully
    And the account should no longer exist

  @negative
  Scenario: Create Dynamics account with invalid data
    When I create a Dynamics account with name ""
    Then the API should return error status 400

