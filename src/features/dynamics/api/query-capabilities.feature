# ══════════════════════════════════════════════════════════════════════════════
# Dynamics 365 Query Capabilities Discovery
# Purpose: Test and document OData query capabilities
# Environment: https://accelinsqatest.crm11.dynamics.com
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @d365 @discovery
Feature: Dynamics 365 Query Capabilities Discovery
  As an API developer
  I want to understand what query operations are supported
  So that I can build effective queries

  Background:
    Given I have a valid Dynamics 365 API token

  # ═══════════════════════════════════════════════════════════════════════════
  # BASIC QUERY OPERATIONS
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @smoke
  Scenario: Test basic entity query
    When I query the accounts entity set
    Then the response status should be 200
    And the response should contain a value array
    And the Dynamics response should contain account records

  @positive
  Scenario: Test select query option
    When I query accounts with select for specific fields
    Then the response should only contain selected fields
    And the response should not contain other fields

  @positive
  Scenario: Test filter query option
    When I query accounts with filter condition
    Then the response should only contain matching records
    And the filter should be applied correctly

  @positive
  Scenario: Test orderby query option
    When I query accounts with orderby
    Then the response should be sorted correctly
    And records should be in the specified order

  @positive
  Scenario: Test top query option
    When I query accounts with top limit
    Then the response should contain at most the specified number of records
    And the response should respect the limit

  @positive
  Scenario: Test skip query option
    When I query accounts with skip
    Then the response should skip the specified number of records
    And the response should start from the correct position

  # ═══════════════════════════════════════════════════════════════════════════
  # ADVANCED QUERY OPERATIONS
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Test expand query option for relationships
    When I query accounts with expand for related entities
    Then the response should include expanded related entities
    And the expanded data should be nested correctly

  @positive
  Scenario: Test count query option
    When I query accounts with count
    Then the response should include the total count
    And the count should match the number of records

  @positive
  Scenario: Test combined query options
    When I query accounts with multiple query options
    Then all query options should be applied correctly
    And the response should reflect all filters and sorting

  # ═══════════════════════════════════════════════════════════════════════════
  # FILTER OPERATORS DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Test filter with eq operator
    When I query accounts with filter using eq operator
    Then the filter should work correctly

  @positive
  Scenario: Test filter with ne operator
    When I query accounts with filter using ne operator
    Then the filter should work correctly

  @positive
  Scenario: Test filter with gt operator
    When I query accounts with filter using gt operator
    Then the filter should work correctly

  @positive
  Scenario: Test filter with lt operator
    When I query accounts with filter using lt operator
    Then the filter should work correctly

  @positive
  Scenario: Test filter with contains operator
    When I query accounts with filter using contains operator
    Then the filter should work correctly

  @positive
  Scenario: Test filter with and/or logical operators
    When I query accounts with filter using and/or operators
    Then the filter should work correctly

  # ═══════════════════════════════════════════════════════════════════════════
  # QUERY LIMITATIONS DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Discover maximum top value
    When I query accounts with increasing top values
    Then I should identify the maximum allowed value
    And I should document the limit

  @positive
  Scenario: Test query timeout behavior
    When I execute a complex query that may timeout
    Then the API should handle the timeout appropriately
    And I should understand the timeout limits

