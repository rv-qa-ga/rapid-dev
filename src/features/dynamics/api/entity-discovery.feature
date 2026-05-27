# ══════════════════════════════════════════════════════════════════════════════
# Dynamics 365 Entity Discovery
# Purpose: Discover all available entities and their properties
# Environment: https://accelinsqatest.crm11.dynamics.com
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @d365 @discovery
Feature: Dynamics 365 Entity Discovery
  As an API developer
  I want to discover all available entities and their properties
  So that I can understand the data model

  Background:
    Given I have a valid Dynamics 365 API token

  # ═══════════════════════════════════════════════════════════════════════════
  # COMMON ENTITIES DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @smoke
  Scenario: Discover Account entity structure
    When I retrieve the Account entity definition
    Then the response should contain Account entity metadata
    And the metadata should list all Account properties
    And the metadata should list all Account relationships
    And the metadata should indicate the primary key field

  @positive
  Scenario: Discover Contact entity structure
    When I retrieve the Contact entity definition
    Then the response should contain Contact entity metadata
    And the metadata should list all Contact properties
    And the metadata should list all Contact relationships

  @positive
  Scenario: Discover Lead entity structure
    When I retrieve the Lead entity definition
    Then the response should contain Lead entity metadata
    And the metadata should list all Lead properties

  @positive
  Scenario: Discover Opportunity entity structure
    When I retrieve the Opportunity entity definition
    Then the response should contain Opportunity entity metadata
    And the metadata should list all Opportunity properties
    And the metadata should list relationships to Account and Contact

  # ═══════════════════════════════════════════════════════════════════════════
  # ENTITY PROPERTIES DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Get Account entity properties with field types
    When I retrieve Account entity properties
    Then the response should list all property names
    And each property should have a data type
    And each property should indicate if it is required
    And each property should indicate if it is read-only

  @positive
  Scenario: Get Account entity required fields
    When I retrieve Account entity properties
    Then the response should identify required fields
    And the required fields list should include name field

  @positive
  Scenario: Get Account entity relationships
    When I retrieve Account entity relationships
    Then the response should list all relationships
    And each relationship should have a name
    And each relationship should have a target entity
    And each relationship should indicate the relationship type

  # ═══════════════════════════════════════════════════════════════════════════
  # CUSTOM ENTITIES DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Discover all custom entities
    When I retrieve all entity definitions
    Then the response should include custom entities
    And custom entities should be identifiable by their naming pattern
    And I should save the list of custom entities

  @positive
  Scenario: Get custom entity metadata
    When I retrieve a custom entity definition
    Then the response should contain custom entity metadata
    And the metadata should list all custom properties

  # ═══════════════════════════════════════════════════════════════════════════
  # ENTITY SET NAMES DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Map entity logical names to entity set names
    When I retrieve the service document
    Then I should be able to map Account entity to its entity set name
    And I should be able to map Contact entity to its entity set name
    And I should be able to map Lead entity to its entity set name

  @positive
  Scenario: Discover entity set naming patterns
    When I retrieve all entity sets
    Then I should identify the naming convention used
    And I should document the entity set names for common entities

