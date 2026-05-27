# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-83 - Repository File Pre-Operation Plugin | Name, Accounting Period & Field Generation
# Type: Story | Status: In UAT | Priority: Highest
# Feature Type: pre-operation-plugin, autonumber, accounting-period, field-generation
# Updated: 2026-02-16 (From JIRA description - accelins_repositoryfile, Portal, plugin logic)
# Confluence: https://accelins.atlassian.net/wiki/x/SoCyqg
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Pre-operation plugin on Create for accelins_repositoryfile. When
#           submission_source = "Portal" and submission_region + worktype
#           present, plugin runs and sets accelins_name, accounting period,
#           and other derived fields.
# Primary Entity: accelins_repositoryfile (Repository File - Dataverse)
# Entity Set: accelins_repositoryfiles (or as per solution)
#
# Plugin RUNS: Create + accelins_submission_source = "Portal" +
#              accelins_submission_region present + accelins_worktype present.
# Plugin DOES NOT RUN: not new record, or submission_source ≠ "Portal", or
#                      submission_region missing, or worktype missing.
#
# Generated fields: accelins_name (region-autonumber), accelins_accountingperiod,
#   accelins_assigned_to (D365ServiceAccount), accelins_first_receipt (true),
#   accelins_right_first_time (true), accelins_accounting_platform (100000000),
#   accelins_first_review_date (= accelins_original_created_date).
# Accounting period: current vs next per MEC/VIPR date rules.
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-83 @highest @dynamics @d365 @repositoryfile @pre-operation-plugin @snowflake-integration
Feature: API - PP-83 - Repository File Pre-Operation Plugin | Name, Accounting Period & Field Generation

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-API-001 @p1 @smoke @field-exists
  Scenario: API - Verify accelins_repositoryfile entity and plugin-related fields exist
    When I call the Dynamics API to describe accelins_repositoryfiles entity
    Then the following fields should exist:
      | Field API Name                |
      | accelins_name                |
      | accelins_submission_source   |
      | accelins_submission_region   |
      | accelins_worktype            |
      | accelins_accountingperiod    |
      | accelins_assigned_to         |
      | accelins_first_receipt       |
      | accelins_right_first_time    |
      | accelins_accounting_platform |
      | accelins_first_review_date   |

  # ══════════════════════════════════════════════════════════════════════════
  # PREREQUISITE: Plugin runs on Create when Portal + region + worktype
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-API-002 @p1 @positive @plugin-trigger @api-create
  Scenario: API - Create accelins_repositoryfile with Portal, region, worktype triggers plugin
    When I create a Dynamics record in entity set "accelins_repositoryfiles" with data:
      | field                      | value   |
      | accelins_submission_source | Portal  |
      | accelins_submission_region | EU      |
      | accelins_worktype          | <worktype-id-or-value> |
    Then the API should return status code 201
    And the response should contain the new record ID
    And the pre-operation plugin should have run synchronously on Create
    And the response should contain accelins_name in format "EU-<number>"
    And the response should contain accelins_assigned_to
    And the response should contain accelins_first_receipt equal to true
    And the response should contain accelins_right_first_time equal to true
    And the response should contain accelins_accounting_platform equal to 100000000

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE: Plugin does not run – no modification to record
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-API-003 @p1 @negative @plugin-skip
  Scenario: API - Create with submission_source not Portal does not run plugin
    When I create a Dynamics record in entity set "accelins_repositoryfiles" with data:
      | field                      | value   |
      | accelins_submission_source | NonPortal |
      | accelins_submission_region | EU      |
      | accelins_worktype          | <worktype-id-or-value> |
    Then the API should return status code 201
    And the plugin should not have set accelins_name from autonumber
    And accelins_assigned_to should not be D365ServiceAccount (or plugin-set fields unchanged)

  @PP-83 @PP-83-API-004 @p1 @negative @plugin-skip
  Scenario: API - Create with missing submission_region does not run plugin
    When I create a Dynamics record in entity set "accelins_repositoryfiles" with data:
      | field                      | value   |
      | accelins_submission_source | Portal  |
      | accelins_worktype          | <worktype-id-or-value> |
    Then the API may return 201 or 400 depending on required field rules
    And if record is created, the plugin should not have populated plugin-generated fields from autonumber/MEC logic

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: accelins_name format
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-API-005 @p1 @positive @autonumber @accelins_name
  Scenario: API - Query repository file and verify accelins_name is region-autonumber format
    Given a repository file was created via API with accelins_submission_source "Portal" and accelins_submission_region "EU"
    When I query the accelins_repositoryfile record by ID via API
    Then the API should return status code 200
    And the response accelins_name should match pattern "EU-<digits>" (e.g. EU-000123)
    And accelins_name should be set before record was persisted

  @PP-83 @PP-83-API-006 @p2 @positive @autonumber @uniqueness
  Scenario: API - Consecutive creates with same region produce unique accelins_name
    Given I create a first accelins_repositoryfile with Portal and region "US"
    And I create a second accelins_repositoryfile with Portal and region "US"
    When I query both records via API
    Then the first record accelins_name should match "US-<N>"
    And the second record accelins_name should match "US-<N+1>" or next autonumber
    And the two accelins_name values should be different

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Accounting period
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-API-007 @p1 @positive @accounting-period
  Scenario: API - Query repository file and verify accelins_accountingperiod set per MEC rules
    Given a repository file was created via valid plugin execution
    When I query the accelins_repositoryfile record by ID via API
    Then the API should return status code 200
    And the response should contain accelins_accountingperiod
    And accelins_accountingperiod should be current or next period per MEC/VIPR date rules

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Other plugin-set fields
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-API-008 @p1 @positive @plugin-fields
  Scenario: API - Query repository file and verify plugin-set field values
    Given a repository file was created via valid plugin execution
    When I query the accelins_repositoryfile record by ID via API
    Then the API should return status code 200
    And the response accelins_assigned_to should reference D365ServiceAccount
    And the response accelins_first_receipt should be true
    And the response accelins_right_first_time should be true
    And the response accelins_accounting_platform should be 100000000 (Dynamics)
    And the response accelins_first_review_date should equal accelins_original_created_date (or created date)

  @PP-83 @PP-83-API-009 @p2 @api-query @filtering
  Scenario: API - Query repository files by accelins_submission_source Portal
    Given multiple accelins_repositoryfile records exist with accelins_submission_source "Portal"
    When I query accelins_repositoryfiles where accelins_submission_source equals "Portal"
    Then the API should return status code 200
    And each returned record should have accelins_name in format "<region>-<number>"
    And each should have plugin-set fields populated where plugin ran

  # ══════════════════════════════════════════════════════════════════════════
  # COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Plugin trigger (API-002), Plugin skip (API-003, API-004), accelins_name (API-005, API-006),
  # Accounting period (API-007), Other fields (API-008)
  # ══════════════════════════════════════════════════════════════════════════
  # STEP DEFINITION NOTES: Replace accelins_repositoryfiles / worktype-id-or-value
  # with actual entity set and lookup values. Steps for plugin run verification
  # may require test harness or observation of field values post-create.
  #
