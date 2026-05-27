# ══════════════════════════════════════════════════════════════════════════════
# Dynamics 365 CRM API Discovery
# Purpose: Discover and document all available APIs, entities, and capabilities
# Environment: https://accelinsqatest.crm11.dynamics.com
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @d365 @discovery @smoke
Feature: Dynamics 365 API Discovery
  As an API developer
  I want to discover all available APIs and entities in Dynamics 365
  So that I can understand what operations are available

  Background:
    Given I have a valid Dynamics 365 API token

  # ═══════════════════════════════════════════════════════════════════════════
  # SERVICE DOCUMENT & METADATA DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive @smoke
  Scenario: Discover service document (root endpoint)
    When I call the Dynamics service document endpoint
    Then the response status should be 200
    And the Dynamics response should contain service metadata
    And the response should list available entity sets
    And the response should contain API version information

  @positive
  Scenario: Retrieve OData service metadata document
    When I call the Dynamics metadata endpoint
    Then the response status should be 200
    And the metadata should contain EntityType definitions
    And the metadata should contain EntitySet definitions
    And the metadata should contain Function definitions
    And the metadata should contain Action definitions

  # ═══════════════════════════════════════════════════════════════════════════
  # ENTITY SETS DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: List all available entity sets
    When I retrieve the list of available entity sets
    Then the response should contain a list of entity sets
    And each entity set should have a name
    And each entity set should have an entity type
    And the list should include common entities like accounts and contacts

  @positive
  Scenario: Discover entity sets count
    When I retrieve the list of available entity sets
    Then the response should contain at least 10 entity sets
    And I should save the entity sets list for reference

  # ═══════════════════════════════════════════════════════════════════════════
  # ENTITY METADATA DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Get Account entity metadata
    When I retrieve metadata for the Account entity
    Then the response status should be 200
    And the metadata should contain entity properties
    And the metadata should contain entity relationships
    And the metadata should contain primary key information

  @positive
  Scenario: Get Contact entity metadata
    When I retrieve metadata for the Contact entity
    Then the response status should be 200
    And the metadata should contain entity properties
    And the metadata should contain entity relationships

  @positive
  Scenario: Get Lead entity metadata
    When I retrieve metadata for the Lead entity
    Then the response status should be 200
    And the metadata should contain entity properties

  # ═══════════════════════════════════════════════════════════════════════════
  # FUNCTIONS & ACTIONS DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Discover available OData functions
    When I retrieve the list of available functions
    Then the response should contain function definitions
    And each function should have a name
    And each function should have parameters

  @positive
  Scenario: Discover available OData actions
    When I retrieve the list of available actions
    Then the response should contain action definitions
    And each action should have a name
    And each action should have parameters

  # ═══════════════════════════════════════════════════════════════════════════
  # API CAPABILITIES DISCOVERY
  # ═══════════════════════════════════════════════════════════════════════════

  @positive
  Scenario: Verify API version and capabilities
    When I retrieve the API service document
    Then the response should indicate the OData version
    And the response should indicate supported query options
    And the response should indicate supported formats

  @positive
  Scenario: Test OData query capabilities
    When I test OData select query option
    Then the query should execute successfully
    When I test OData filter query option
    Then the query should execute successfully
    When I test OData orderby query option
    Then the query should execute successfully
    When I test OData top query option
    Then the query should execute successfully

