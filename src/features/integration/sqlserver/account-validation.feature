@sqlserver @integration
Feature: Validate Account Data in SQL Server
  As a QA engineer
  I want to validate that Account data from Salesforce/Dynamics is correctly stored in SQL Server
  So that I can ensure data integrity across systems

  Background:
    Given I have a valid SQL Server connection
    And I have a valid Salesforce API token

  @smoke
  Scenario: Validate SQL Server connectivity
    When I test the SQL Server connection
    Then the connection should be successful

  Scenario: Validate Salesforce Account appears in SQL Server Reporting database
    Given I have created a Salesforce Account with:
      | Name           | Type    | Industry |
      | Test Account 1 | Customer | Technology |
    When I query the SQL Server "Reporting" database for the account
    Then the account should exist in the "Accounts" table
    And the account fields should match the Salesforce record

  Scenario: Validate Dynamics Account appears in SQL Server ODS database
    Given I have a valid Dynamics 365 API token
    And I have created a Dynamics Account with:
      | name           | accountnumber | telephone1    |
      | Test Account 2 | ACC-001       | 555-123-4567 |
    When I query the SQL Server "ODS" database for the account
    Then the account should exist in the "DynamicsAccounts" table
    And the account fields should match the Dynamics record

  Scenario: Wait for account to appear in SQL Server (eventual consistency)
    Given I have created a Salesforce Account with:
      | Name           | Type    |
      | Test Account 3 | Customer |
    When I wait for the account to appear in SQL Server "Reporting" database
    Then the account should exist in the "Accounts" table

  Scenario: Compare account counts between Salesforce and SQL Server
    Given I have queried Salesforce for all Accounts
    When I compare the count with SQL Server "Reporting" database "Accounts" table
    Then the counts should match within tolerance of 0

