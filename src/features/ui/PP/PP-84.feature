# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-84 - Snowflake Integration Field Population
# Type: Story | Status: In QA | Priority: High
# Feature Type: snowflake-integration, field-population, data-consistency
# Updated: 2026-02-16 (From JIRA description - Operations User, field population on creation)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: All specified fields are populated when Snowflake integration runs,
#           so that the record is complete and consistent on creation.
# Primary Entity: Record created by Snowflake integration (Dynamics/Dataverse)
#
# From API payload (or bound references):
#   accelins_submission_source, accelins_submission_region, accelins_worktype,
#   accelins_sender, accelins_production_period, accelins_original_currency,
#   accelins_contract, accelins_mga_name, statuscode, accelins_gwp_amount,
#   accelins_brokerage_amount_decimal, accelins_tax_amount_payable_decimal,
#   accelins_commission_amount_decimal
#
# Derived / generated (see PP-83, PP-86, PP-87 for details):
#   accelins_name (PP-86), accelins_accountingperiod (PP-83),
#   accelins_bordereau_name (PP-87), accelins_insurer (PP-87),
#   accelins_fronting_company (PP-87), accelins_assigned_to (PP-83),
#   accelins_first_receipt (PP-83), accelins_right_first_time (PP-83),
#   accelins_first_review_date (PP-83), accelins_accounting_platform (PP-83),
#   accelins_insurer_organisation_name (PP-87)
#
# Key Business Rules:
#   - Record is created as part of the same synchronous transaction that executes the plugin.
#   - If any mandatory derived value cannot be set (according to business rules), field is left blank.
#
# Test Requirements (4):
#   REQ-1: Fields from API payload are populated on record creation
#     → Test Type: UI / API | Priority: p1
#   REQ-2: Derived fields are populated when business rules allow
#     → Test Type: UI / API | Priority: p1
#   REQ-3: Derived fields are left blank when value cannot be set
#     → Test Type: UI / API | Priority: p2
#   REQ-4: Record is complete and consistent on creation (same transaction as plugin)
#     → Test Type: BOTH | Priority: p1
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-84 @high @dynamics @d365 @snowflake-integration @field-population
Feature: PP-84 - Snowflake Integration Field Population
  As an Operations User
  I want all specified fields to be populated when Snowflake integration runs
  So that the record is complete and consistent on creation

  Background:
    Given I am logged in to Dynamics 365

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Fields from API payload populated
  # ══════════════════════════════════════════════════════════════════════════

  @PP-84 @PP-84-UI-001 @p1 @smoke @positive @snowflake-integration @payload-fields
  Scenario: Verify record created by Snowflake integration has payload fields populated
    Given I am logged in to Dynamics 365
    And a successful Snowflake integration execution has created a record
    When I navigate to the record created by the Snowflake integration
    Then the following fields from API payload should be populated:
      | Field Name                            |
      | Submission Source                     |
      | Submission Region                     |
      | Work Type                             |
      | Sender                                |
      | Production Period                     |
      | Original Currency                     |
      | Contract                              |
      | MGA Name                              |
      | Status                                |
      | GWP Amount                            |
      | Brokerage Amount                      |
      | Tax Amount Payable                    |
      | Commission Amount                     |
    And I take a screenshot as evidence

  @PP-84 @PP-84-UI-002 @p1 @positive @snowflake-integration @payload-fields @data-driven
  Scenario Outline: Verify specific payload field is populated on integration record
    Given I am logged in to Dynamics 365
    And a successful Snowflake integration execution has created a record with "<field>" populated
    When I navigate to the record created by the Snowflake integration
    Then the "<field>" field should be populated
    And the "<field>" value should match the API payload or bound reference
    And I take a screenshot as evidence

    Examples:
      | field                    |
      | Submission Source        |
      | Submission Region        |
      | Work Type                |
      | Production Period        |
      | Original Currency        |
      | Contract                |
      | MGA Name                 |
      | GWP Amount              |
      | Brokerage Amount         |
      | Tax Amount Payable       |
      | Commission Amount        |

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Derived / generated fields
  # ══════════════════════════════════════════════════════════════════════════

  @PP-84 @PP-84-UI-003 @p1 @positive @snowflake-integration @derived-fields
  Scenario: Verify derived fields are populated when business rules allow
    Given I am logged in to Dynamics 365
    And a successful Snowflake integration execution has created a record
    And business rules allow all derived values to be set
    When I navigate to the record created by the Snowflake integration
    Then the following derived fields should be populated where applicable:
      | Field Name                      | Related Story |
      | Name                            | PP-86         |
      | Accounting Period               | PP-83         |
      | Bordereau Name                  | PP-87         |
      | Insurer                         | PP-87         |
      | Fronting Company                | PP-87         |
      | Assigned To                     | PP-83         |
      | First Receipt                   | PP-83         |
      | Right First Time                | PP-83         |
      | First Review Date               | PP-83         |
      | Accounting Platform            | PP-83         |
      | Insurer Organisation Name       | PP-87         |
    And I take a screenshot as evidence

  @PP-84 @PP-84-UI-004 @p2 @positive @snowflake-integration @derived-blank
  Scenario: Verify derived field is left blank when value cannot be set
    Given I am logged in to Dynamics 365
    And a successful Snowflake integration execution has created a record
    And a mandatory derived value cannot be set according to business rules
    When I navigate to the record created by the Snowflake integration
    Then the corresponding derived field should be left blank
    And the record should still be created successfully
    And I take a screenshot as evidence

  @PP-84 @PP-84-UI-005 @p1 @positive @snowflake-integration @consistency
  Scenario: Verify record is complete and consistent on creation
    Given I am logged in to Dynamics 365
    And a successful Snowflake integration execution runs
    When the plugin executes in the same synchronous transaction
    Then a record should be created
    And the record should have all applicable payload fields populated
    And the record should have derived fields populated or blank per business rules
    And the record should be complete and consistent for the Operations User
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY
  # ══════════════════════════════════════════════════════════════════════════

  @PP-84 @PP-84-UI-006 @p2 @negative @missing-payload
  Scenario: Verify behavior when payload is missing optional data
    Given I am logged in to Dynamics 365
    And a Snowflake integration execution runs with some optional payload fields missing
    When the record is created by the integration
    Then mandatory fields should be populated where possible
    And optional or missing fields may be blank
    And the record should still be created successfully
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 4
  # Coverage: 100%
  #
  # REQ-1: Payload fields populated - PP-84-UI-001, PP-84-UI-002
  # REQ-2: Derived fields populated - PP-84-UI-003
  # REQ-3: Derived blank when cannot set - PP-84-UI-004
  # REQ-4: Record complete, same transaction - PP-84-UI-005
  #
  # ══════════════════════════════════════════════════════════════════════════
  # STEP DEFINITION NOTES
  # ══════════════════════════════════════════════════════════════════════════
  # May require steps for:
  #   - "a successful Snowflake integration execution has created a record"
  #   - "navigate to the record created by the Snowflake integration"
  #   - Verifying list of fields populated / blank
  #
