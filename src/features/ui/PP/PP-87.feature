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
# Overview: Pre-operation plugin on Create for accelins_repositoryfile (same
#           prerequisite as PP-83). When plugin runs, Insurer, Fronting
#           company, Insurer Organisation name and Bordereau name are
#           automatically associated from Snowflake integration API data so
#           no manual intervention is required.
# Primary Entity: accelins_repositoryfile (Repository File - Dataverse)
#
# Prerequisite – Plugin RUNS when:
#   - Create request to Dataverse for accelins_repositoryfile
#   - accelins_submission_source = "Portal", accelins_submission_region present,
#     accelins_worktype present → pre-operation plugin runs synchronously.
# Plugin DOES NOT RUN when: not new record, or submission_source ≠ "Portal",
#   or submission_region missing, or worktype missing → plugin exits without
#   modifying the record.
#
# Acceptance Criteria:
#   1. Given API payload contains (or references): accelins_contract,
#      accelins_mga_name, accelins_bordereau_name.accelins_bordereau_map_id
#      (Member Mapping ID), accelins_original_currency, accelins_worktype
#      → a correct Bordereau Name is associated to the repository file
#      (Bordereau Name Derivation Logic).
#   2. Given contract reference is available → system extracts Insurer and
#      Fronting Company from the contract.
#   3. Once Insurer is known → system derives Insurer Organisation Name and
#      updates the repository file (Insurer Organisation Logic).
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-87 @highest @dynamics @d365 @repositoryfile @pre-operation-plugin @snowflake-integration @auto-association
Feature: PP-87 - Repository File Pre-Operation | Insurer, Fronting Company, Bordereau Name Derivation
  As an operations user
  I want the correct Insurer, Fronting company, Insurer Organisation name and Bordereau name to be automatically associated to the repository file based on data provided by Snowflake integration API call
  So that no manual intervention is required

  Background:
    Given I am logged in to Dynamics 365

  # ══════════════════════════════════════════════════════════════════════════
  # PREREQUISITE: Plugin runs when Create + Portal + region + worktype
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-UI-001 @p1 @smoke @positive @plugin-trigger
  Scenario: Pre-operation plugin runs when Create request has Portal, region and worktype
    Given a create request to Dataverse for accelins_repositoryfile
    And accelins_submission_source equals "Portal" (case as per implementation)
    And accelins_submission_region is present
    And accelins_worktype is present
    When the request is received
    Then the pre-operation plugin runs synchronously on the Create event
    And the record is created with plugin-derived Insurer, Fronting company, Bordereau name and Insurer Organisation name where applicable
    And I take a screenshot as evidence

  @PP-87 @PP-87-UI-002 @p1 @negative @plugin-skip
  Scenario: Plugin exits without processing when submission_source is not Portal
    Given a create request to Dataverse for accelins_repositoryfile
    And accelins_submission_source is not "Portal"
    When the request is received
    Then the plugin exits without processing
    And the plugin does not modify the record
    And I take a screenshot as evidence

  @PP-87 @PP-87-UI-003 @p1 @negative @plugin-skip
  Scenario: Plugin exits without processing when submission_region or worktype is missing
    Given a create request to Dataverse for accelins_repositoryfile
    And accelins_submission_source equals "Portal"
    And accelins_submission_region is missing or accelins_worktype is missing
    When the request is received
    Then the plugin exits without processing
    And the plugin does not modify the record
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Bordereau Name derivation
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-UI-004 @p1 @positive @bordereau-name @snowflake-api
  Scenario: Correct Bordereau Name associated when API payload contains contract, MGA name, bordereau map ID, currency and worktype
    Given the API payload contains or references:
      | Payload Field / Reference                          |
      | accelins_contract                                  |
      | accelins_mga_name                                  |
      | accelins_bordereau_name.accelins_bordereau_map_id (Member Mapping ID) |
      | accelins_original_currency                         |
      | accelins_worktype                                  |
    When a create request to Dataverse for accelins_repositoryfile is received and the plugin runs
    Then a correct Bordereau Name is associated to the repository file
    And the Bordereau Name is derived per Bordereau Name Derivation Logic
    And I take a screenshot as evidence

  @PP-87 @PP-87-UI-005 @p1 @positive @bordereau-name @ui-verify
  Scenario: Repository file displays correct Bordereau Name after plugin execution
    Given a repository file was created via valid plugin execution with Snowflake API payload containing contract, MGA name, bordereau map ID, currency and worktype
    When I navigate to the Repository File record
    Then the "Bordereau Name" field should be populated
    And the Bordereau Name value should match the derived value from the API payload
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Insurer and Fronting Company from contract
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-UI-006 @p1 @positive @insurer-fronting @contract
  Scenario: Insurer and Fronting Company extracted from contract when contract reference is available
    Given a create request to Dataverse for accelins_repositoryfile
    And the API payload or bound reference provides a contract reference
    And the contract reference is available and valid
    When the pre-operation plugin runs
    Then the system extracts the Insurer from the contract
    And the system extracts the Fronting Company from the contract
    And the repository file is updated with the correct Insurer and Fronting Company
    And I take a screenshot as evidence

  @PP-87 @PP-87-UI-007 @p1 @positive @insurer-fronting @ui-verify
  Scenario: Repository file displays correct Insurer and Fronting Company after plugin execution
    Given a repository file was created via valid plugin execution with contract reference available
    When I navigate to the Repository File record
    Then the "Insurer" field should be populated with the value extracted from the contract
    And the "Fronting Company" field should be populated with the value extracted from the contract
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Insurer Organisation Name derivation
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-UI-008 @p1 @positive @insurer-organisation
  Scenario: Insurer Organisation Name derived and repository file updated when Insurer is known
    Given a create request to Dataverse for accelins_repositoryfile
    And the Insurer has been determined (from contract or payload)
    When the pre-operation plugin runs
    Then the system derives the Insurer Organisation Name from the Insurer
    And the repository file is updated with the correct Insurer Organisation Name
    And the derivation follows Insurer Organisation Logic
    And I take a screenshot as evidence

  @PP-87 @PP-87-UI-009 @p1 @positive @insurer-organisation @ui-verify
  Scenario: Repository file displays correct Insurer Organisation Name after plugin execution
    Given a repository file was created via valid plugin execution with Insurer available
    When I navigate to the Repository File record
    Then the "Insurer Organisation Name" field should be populated
    And the value should match the derived Insurer Organisation Name for the Insurer
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # END-TO-END: All four fields auto-associated without manual intervention
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-UI-010 @p1 @positive @e2e @no-manual-intervention
  Scenario: Insurer, Fronting company, Insurer Organisation name and Bordereau name all auto-associated from Snowflake API
    Given a create request to Dataverse for accelins_repositoryfile with accelins_submission_source "Portal" and required fields present
    And the Snowflake integration API call provides contract, MGA name, bordereau map ID, currency and worktype
    And contract reference is available so Insurer and Fronting Company can be extracted
    When the request is received and the pre-operation plugin runs
    Then the repository file is created with Bordereau Name correctly associated
    And the repository file has Insurer and Fronting Company correctly associated from the contract
    And the repository file has Insurer Organisation Name correctly derived and set
    And no manual intervention is required for these four associations
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE: Missing payload or contract
  # ══════════════════════════════════════════════════════════════════════════

  @PP-87 @PP-87-UI-011 @p2 @negative @missing-payload
  Scenario: When API payload missing required references for Bordereau Name derivation
    Given a create request to Dataverse for accelins_repositoryfile with Portal and region and worktype
    And the API payload does not contain or reference one or more of: contract, MGA name, bordereau map ID, original currency, worktype
    When the plugin runs
    Then Bordereau Name may be blank or derived to the extent possible per business rules
    And the record may still be created with other derived fields where data is available
    And I take a screenshot as evidence

  @PP-87 @PP-87-UI-012 @p2 @negative @missing-contract
  Scenario: When contract reference is not available Insurer and Fronting Company not extracted
    Given a create request to Dataverse for accelins_repositoryfile with Portal and region and worktype
    And the contract reference is not available or not provided
    When the plugin runs
    Then Insurer and Fronting Company may remain blank or unset
    And Insurer Organisation Name may remain blank (since Insurer is unknown)
    And the record is still created with other derived values where applicable
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Prerequisite (UI-001–003), Bordereau Name (UI-004, UI-005), Insurer/Fronting
  # from contract (UI-006, UI-007), Insurer Organisation (UI-008, UI-009),
  # E2E no manual intervention (UI-010), Negative (UI-011, UI-012)
  # ══════════════════════════════════════════════════════════════════════════
  # STEP DEFINITION NOTES: Create request to Dataverse, plugin run/exit,
  # navigate to Repository File, verify Bordereau Name / Insurer / Fronting
  # Company / Insurer Organisation Name. Links to Confluence for derivation logic.
  #
