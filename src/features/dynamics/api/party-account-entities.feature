# ══════════════════════════════════════════════════════════════════════════════
# Dynamics 365 Party and Account Entities API Tests
# Purpose: Test CRUD operations for Party and Account related entities
# Environment: https://accelinsqatest.crm11.dynamics.com
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @d365 @party @account @regression
Feature: Dynamics 365 Party and Account Entities API
  As an API user
  I want to manage Party and Account entities via Dynamics 365 API
  So that I can automate party and account operations

  Background:
    Given I have a valid Dynamics 365 API token

  # ═══════════════════════════════════════════════════════════════════════════
  # ACCOUNT ENTITIES - Standard Accounts
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @smoke
  Scenario: Create a standard Account entity
    When I create a Dynamics record in entity set "accounts" with data:
      | name                    | accountnumber |
      | Test Account API Create | ACC-001       |
    Then the record should be created successfully
    And the response should contain a valid record ID
    And I should be able to retrieve the record by ID from entity set "accounts"

  @positive
  Scenario: Query standard Account entities
    When I query the entity set "accounts" with top limit 5
    Then the response status should be 200
    And the response should contain a value array
    And the response should contain at least one account record

  @positive
  Scenario: Update a standard Account entity
    Given I have created a Dynamics record in entity set "accounts" with name "Test Account Update"
    When I update the Dynamics record in entity set "accounts" with data:
      | name                    | accountnumber |
      | Updated Account Name    | ACC-002       |
    Then the record should be updated successfully
    And I should be able to retrieve the updated record by ID
    And the record name should be "Updated Account Name"

  @positive
  Scenario: Delete a standard Account entity
    Given I have created a Dynamics record in entity set "accounts" with name "Test Account Delete"
    When I delete the Dynamics record from entity set "accounts"
    Then the record should be deleted successfully
    And the record should no longer exist in entity set "accounts"

  # ═══════════════════════════════════════════════════════════════════════════
  # ACCOUNT ENTITIES - Accelins Accounts
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @smoke
  Scenario: Create an Accelins Account entity
    When I create a Dynamics record in entity set "accelins_accounts" with data:
      | accelins_name | accelins_accountnumber |
      | Accelins Test | ACCEL-001               |
    Then the record should be created successfully
    And the response should contain a valid record ID
    And I should be able to retrieve the record by ID from entity set "accelins_accounts"

  @positive
  Scenario: Query Accelins Account entities
    When I query the entity set "accelins_accounts" with top limit 5
    Then the response status should be 200
    And the response should contain a value array
    And the response should contain at least one accelins account record

  @positive
  Scenario: Update an Accelins Account entity
    Given I have created a Dynamics record in entity set "accelins_accounts" with name "Accelins Test Update"
    When I update the Dynamics record in entity set "accelins_accounts" with data:
      | accelins_name        | accelins_accountnumber |
      | Updated Accelins Acct | ACCEL-002               |
    Then the record should be updated successfully
    And I should be able to retrieve the updated record by ID

  @positive
  Scenario: Delete an Accelins Account entity
    Given I have created a Dynamics record in entity set "accelins_accounts" with name "Accelins Test Delete"
    When I delete the Dynamics record from entity set "accelins_accounts"
    Then the record should be deleted successfully

  # ═══════════════════════════════════════════════════════════════════════════
  # ACCOUNT GROUPS
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Create an Account Group entity
    When I create a Dynamics record in entity set "accelins_accountgroups" with data:
      | accelins_name |
      | Test Group 1  |
    Then the record should be created successfully
    And the response should contain a valid record ID

  @positive
  Scenario: Query Account Group entities
    When I query the entity set "accelins_accountgroups" with top limit 10
    Then the response status should be 200
    And the response should contain a value array

  # ═══════════════════════════════════════════════════════════════════════════
  # BANK ACCOUNTS
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Create a Bank Account entity
    When I create a Dynamics record in entity set "accelins_bankaccounts" with data:
      | accelins_name     | accelins_accountnumber |
      | Test Bank Account | BANK-001                |
    Then the record should be created successfully
    And the response should contain a valid record ID

  @positive
  Scenario: Query Bank Account entities
    When I query the entity set "accelins_bankaccounts" with top limit 10
    Then the response status should be 200
    And the response should contain a value array

  @positive
  Scenario: Update a Bank Account entity
    Given I have created a Dynamics record in entity set "accelins_bankaccounts" with name "Test Bank Update"
    When I update the Dynamics record in entity set "accelins_bankaccounts" with data:
      | accelins_name        | accelins_accountnumber |
      | Updated Bank Account | BANK-002                |
    Then the record should be updated successfully

  # ═══════════════════════════════════════════════════════════════════════════
  # PARTY ENTITIES
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @smoke
  Scenario: Query Party entities (main party list)
    When I query the entity set "accelins_parties" with top limit 50
    Then the response status should be 200
    And the response should contain a value array
    And the response should contain at least one party record

  @positive
  Scenario: Query Party entities using saved view
    When I query the entity set "accelins_parties" with saved query "30fbd496-a88e-4511-a566-b9e01d29244f"
    Then the response status should be 200
    And the response should contain a value array

  @positive @smoke
  Scenario: Create a Party Type entity
    When I create a Dynamics record in entity set "accelins_partytypes" with data:
      | accelins_name |
      | Test Party Type |
    Then the record should be created successfully
    And the response should contain a valid record ID
    And I should be able to retrieve the record by ID from entity set "accelins_partytypes"

  @positive
  Scenario: Query Party Type entities
    When I query the entity set "accelins_partytypes" with top limit 10
    Then the response status should be 200
    And the response should contain a value array
    And the response should contain at least one party type record

  @positive
  Scenario: Update a Party Type entity
    Given I have created a Dynamics record in entity set "accelins_partytypes" with name "Test Party Type Update"
    When I update the Dynamics record in entity set "accelins_partytypes" with data:
      | accelins_name        |
      | Updated Party Type   |
    Then the record should be updated successfully
    And I should be able to retrieve the updated record by ID
    And the record name should be "Updated Party Type"

  @positive
  Scenario: Delete a Party Type entity
    Given I have created a Dynamics record in entity set "accelins_partytypes" with name "Test Party Type Delete"
    When I delete the Dynamics record from entity set "accelins_partytypes"
    Then the record should be deleted successfully

  @positive
  Scenario: Create and Deactivate a Party Type entity
    Given I have a valid Dynamics 365 API token
    When I create a Dynamics record in entity set "accelins_partytypes" with data:
      | accelins_name |
      | Sample Party Type Deactivate |
    Then the Dynamics record should be created successfully
    And the response should contain a valid record ID
    When I update the Dynamics record in entity set "accelins_partytypes" with data:
      | statecode |
      | 1 |
    Then the record should be updated successfully
    And I should be able to retrieve the record by ID from entity set "accelins_partytypes"
    And the record statecode should be 1

  @positive
  Scenario: Create a Party Class entity
    When I create a Dynamics record in entity set "accelins_party_classes" with data:
      | accelins_name |
      | Test Party Class |
    Then the record should be created successfully
    And the response should contain a valid record ID

  @positive
  Scenario: Query Party Class entities
    When I query the entity set "accelins_party_classes" with top limit 10
    Then the response status should be 200
    And the response should contain a value array

  @positive
  Scenario: Create a Party Branch entity
    When I create a Dynamics record in entity set "accelins_partybranchs" with data:
      | accelins_name |
      | Test Party Branch |
    Then the record should be created successfully
    And the response should contain a valid record ID

  @positive
  Scenario: Query Party Branch entities
    When I query the entity set "accelins_partybranchs" with top limit 10
    Then the response status should be 200
    And the response should contain a value array

  # ═══════════════════════════════════════════════════════════════════════════
  # PARTY-ACCOUNT RELATIONSHIPS
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Query Party-Account relationship entities
    When I query the entity set "accelins_partybranchmappings" with top limit 10
    Then the response status should be 200
    And the response should contain a value array

  @positive
  Scenario: Query Contract-Party relationship entities
    When I query the entity set "accelins_accelins_contract_accelins_partyset" with top limit 10
    Then the response status should be 200
    And the response should contain a value array

  # ═══════════════════════════════════════════════════════════════════════════
  # COUNTERPARTY ENTITIES (Related to Parties)
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Query Counterparty Role entities
    When I query the entity set "accelins_counterpartyroles" with top limit 10
    Then the response status should be 200
    And the response should contain a value array

  @positive
  Scenario: Query Counterparty Relationship entities
    When I query the entity set "accelins_counterpartyrelationships" with top limit 10
    Then the response status should be 200
    And the response should contain a value array

  # ═══════════════════════════════════════════════════════════════════════════
  # NEGATIVE TEST CASES
  # ═══════════════════════════════════════════════════════════════════════════

  @negative
  Scenario: Create Account with missing required fields
    When I create a Dynamics record in entity set "accounts" with empty data
    Then the API should return error status 400

  @negative
  Scenario: Query non-existent entity set
    When I query the entity set "nonexistent_entity" with top limit 5
    Then the API should return error status 404

  @negative
  Scenario: Retrieve record with invalid ID
    When I retrieve a Dynamics record with ID "00000000-0000-0000-0000-000000000000" from entity set "accounts"
    Then the API should return error status 404

  # ═══════════════════════════════════════════════════════════════════════════
  # FIELD VALIDATION TEST CASES
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Query Account with field selection
    When I query the entity set "accounts" with fields "accountid,name,accountnumber" and top limit 5
    Then the response status should be 200
    And the response should only contain selected fields

  @positive
  Scenario: Query Account with filter
    When I query the entity set "accounts" with filter "name ne null" and top limit 5
    Then the response status should be 200
    And the response should only contain matching records

  @positive
  Scenario: Query Account with orderby
    When I query the entity set "accounts" with orderby "name" and top limit 5
    Then the response status should be 200
    And the response should be sorted by name

