# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-87 - Repository File Pre-Operation | Insurer, Fronting Company, Bordereau Name Derivation
# Type: Story | Status: In QA | Priority: Highest
# Feature Type: pre-operation-plugin, auto-association, snowflake-integration
# Updated: 2026-02-16 (From JIRA description - Insurer, Fronting, Bordereau Name from Snowflake API)
# Bordereau Name: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2863824970/Integration+Snowflake+Non-Email+Submission#Bordereau-Name-Derivation-Logic
# Contract/Insurer/Fronting: https://accelins.atlassian.net/wiki/x/DIBWrQ
# Insurer Organisation: https://accelins.atlassian.net/wiki/spaces/ISDE/pages/2863824970/Integration+Snowflake+Non-Email+Submission#Insurer-Organisation-Logic
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Pre-operation plugin on Create for accelins_repositoryfile. When
#           plugin runs (Portal + region + worktype present), Insurer,
#           Fronting company, Insurer Organisation name and Bordereau name
#           are auto-associated from Snowflake API data.
# Primary Entity: accelins_repositoryfile (Repository File - Dataverse)
# Entity Set: accelins_repositoryfiles (or as per solution)
#
# Prerequisite: Same as PP-83 – plugin runs when Create + Portal + region +
#   worktype; plugin exits otherwise.
# AC1: API payload contains accelins_contract, accelins_mga_name,
#   accelins_bordereau_name.accelins_bordereau_map_id, accelins_original_currency,
#   accelins_worktype → correct Bordereau Name associated (Bordereau Name
#   Derivation Logic).
# AC2: Contract reference available → system extracts Insurer and Fronting
#   Company from contract.
# AC3: Once Insurer known → system derives Insurer Organisation Name and
#   updates repository file.
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-87 @highest @dynamics @d365 @repositoryfile @pre-operation-plugin @snowflake-integration @auto-association
Feature: API - PP-87 - Repository File Pre-Operation | Insurer, Fronting Company, Bordereau Name Derivation

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-API-001 @p1 @smoke @field-exists
  Scenario: API - Verify accelins_repositoryfile has Insurer, Fronting Company, Bordereau Name, Insurer Organisation Name fields
    When I call the Dynamics API to describe accelins_repositoryfiles entity
    Then the following fields should exist:
      | Field API Name / Logical Name     |
      | accelins_contract                |
      | accelins_mga_name                |
      | accelins_bordereau_name          |
      | accelins_original_currency       |
      | accelins_worktype                |
      | accelins_insurer                 |
      | accelins_fronting_company        |
      | accelins_insurer_organisation_name |

  # ══════════════════════════════════════════════════════════════════════════
  # PREREQUISITE: Plugin runs on Create when Portal + region + worktype
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-API-002 @p1 @positive @plugin-trigger @api-create
  Scenario: API - Create accelins_repositoryfile with Portal, region, worktype triggers plugin and derives Insurer, Fronting, Bordereau Name, Insurer Organisation Name
    When I create a Dynamics record in entity set "accelins_repositoryfiles" with data:
      | field                      | value   |
      | accelins_submission_source | Portal  |
      | accelins_submission_region | <region> |
      | accelins_worktype          | <worktype-ref> |
      | accelins_contract          | <contract-ref> |
      | accelins_mga_name          | <mga-name-ref> |
      | accelins_original_currency| <currency-ref> |
    And the payload or bound reference includes accelins_bordereau_map_id (Member Mapping ID) for bordereau name derivation
    Then the API should return status code 201
    And the pre-operation plugin should have run synchronously on Create
    And the response should contain accelins_bordereau_name populated per Bordereau Name Derivation Logic
    And the response should contain accelins_insurer when contract reference is available
    And the response should contain accelins_fronting_company when contract reference is available
    And the response should contain accelins_insurer_organisation_name when Insurer is known

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Bordereau Name from API payload
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-API-003 @p1 @positive @bordereau-name
  Scenario: API - Query repository file and verify Bordereau Name associated when payload had contract, MGA name, bordereau map ID, currency, worktype
    Given a repository file was created via API with accelins_submission_source "Portal" and payload containing accelins_contract, accelins_mga_name, accelins_bordereau_map_id, accelins_original_currency, accelins_worktype
    When I query the accelins_repositoryfile record by ID via API
    Then the API should return status code 200
    And the response accelins_bordereau_name should be populated
    And the Bordereau Name should be correct per Bordereau Name Derivation Logic

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Insurer and Fronting Company from contract
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-API-004 @p1 @positive @insurer-fronting
  Scenario: API - Query repository file and verify Insurer and Fronting Company extracted from contract
    Given a repository file was created via API with contract reference available in payload or bound reference
    When I query the accelins_repositoryfile record by ID via API
    Then the API should return status code 200
    And the response accelins_insurer should be populated with the value extracted from the contract
    And the response accelins_fronting_company should be populated with the value extracted from the contract
    And the values should match the contract's Insurer and Fronting Company

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Insurer Organisation Name derivation
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-API-005 @p1 @positive @insurer-organisation
  Scenario: API - Query repository file and verify Insurer Organisation Name derived when Insurer is known
    Given a repository file was created via API with Insurer determined (from contract or payload)
    When I query the accelins_repositoryfile record by ID via API
    Then the API should return status code 200
    And the response accelins_insurer_organisation_name should be populated
    And the value should be derived from the Insurer per Insurer Organisation Logic

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE: Plugin does not run
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-API-006 @p1 @negative @plugin-skip
  Scenario: API - Create with submission_source not Portal does not run plugin derivation
    When I create a Dynamics record in entity set "accelins_repositoryfiles" with data:
      | field                      | value      |
      | accelins_submission_source | NonPortal  |
      | accelins_submission_region | EU         |
      | accelins_worktype          | <worktype-ref> |
    Then the API may return 201
    And the plugin should not have run derivation for Bordereau Name, Insurer, Fronting Company, Insurer Organisation Name
    And accelins_bordereau_name, accelins_insurer, accelins_fronting_company, accelins_insurer_organisation_name may be blank or not plugin-derived

  # ══════════════════════════════════════════════════════════════════════════
  # QUERY AND FILTER
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-API-007 @p2 @api-query
  Scenario: API - Query repository files by Bordereau Name
    Given multiple accelins_repositoryfile records exist with accelins_bordereau_name populated
    When I query accelins_repositoryfiles where accelins_bordereau_name equals a known value
    Then the API should return status code 200
    And the response should contain records with the matching Bordereau Name

  @PP-87 @PP-87-API-008 @p2 @api-query
  Scenario: API - Query repository files by Insurer
    Given multiple accelins_repositoryfile records exist with accelins_insurer populated
    When I query accelins_repositoryfiles where accelins_insurer equals a known Insurer reference
    Then the API should return status code 200
    And the response should contain records with the matching Insurer
    And each record should have accelins_insurer_organisation_name derived for that Insurer

  # ══════════════════════════════════════════════════════════════════════════
  # COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Field existence (API-001), Plugin trigger and derivation (API-002),
  # Bordereau Name (API-003), Insurer/Fronting from contract (API-004),
  # Insurer Organisation (API-005), Plugin skip (API-006), Query (API-007, API-008)
  # ══════════════════════════════════════════════════════════════════════════
  # STEP DEFINITION NOTES: Replace entity set and reference placeholders
  # (<contract-ref>, <mga-name-ref>, <worktype-ref>, etc.) with actual lookup
  # or value. Bordereau Name Derivation Logic and Insurer Organisation Logic
  # are documented in Confluence links in header.
  #
