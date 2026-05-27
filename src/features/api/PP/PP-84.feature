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
# Entity Set: Use the appropriate entity set for the Snowflake integration
#             record (e.g. accelins_bordereaux or as per solution).
#
# From API payload (or bound references):
#   accelins_submission_source, accelins_submission_region, accelins_worktype,
#   accelins_sender, accelins_production_period, accelins_original_currency,
#   accelins_contract, accelins_mga_name, statuscode, accelins_gwp_amount,
#   accelins_brokerage_amount_decimal, accelins_tax_amount_payable_decimal,
#   accelins_commission_amount_decimal
#
# Derived / generated (see PP-83, PP-86, PP-87):
#   accelins_name, accelins_accountingperiod, accelins_bordereau_name,
#   accelins_insurer, accelins_fronting_company, accelins_assigned_to,
#   accelins_first_receipt, accelins_right_first_time, accelins_first_review_date,
#   accelins_accounting_platform, accelins_insurer_organisation_name
#
# Key Business Rules:
#   - Record is created in the same synchronous transaction that executes the plugin.
#   - If any mandatory derived value cannot be set, field is left blank.
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-84 @high @dynamics @d365 @snowflake-integration @field-population
Feature: API - PP-84 - Snowflake Integration Field Population

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD EXISTENCE - Payload fields
  # ══════════════════════════════════════════════════════════════════════════

  @PP-84 @PP-84-API-001 @p1 @smoke @field-exists
  Scenario: API - Verify payload fields exist on Snowflake integration entity
    When I call the Dynamics API to describe the Snowflake integration entity
    Then the following fields should exist:
      | Field API Name                         |
      | accelins_submission_source             |
      | accelins_submission_region             |
      | accelins_worktype                      |
      | accelins_sender                        |
      | accelins_production_period             |
      | accelins_original_currency            |
      | accelins_contract                      |
      | accelins_mga_name                      |
      | statuscode                             |
      | accelins_gwp_amount                    |
      | accelins_brokerage_amount_decimal      |
      | accelins_tax_amount_payable_decimal   |
      | accelins_commission_amount_decimal    |

  @PP-84 @PP-84-API-002 @p1 @field-exists
  Scenario: API - Verify derived fields exist on Snowflake integration entity
    When I call the Dynamics API to describe the Snowflake integration entity
    Then the following derived fields should exist:
      | Field API Name                         |
      | accelins_name                          |
      | accelins_accountingperiod              |
      | accelins_bordereau_name                |
      | accelins_insurer                       |
      | accelins_fronting_company              |
      | accelins_assigned_to                   |
      | accelins_first_receipt                 |
      | accelins_right_first_time              |
      | accelins_first_review_date             |
      | accelins_accounting_platform            |
      | accelins_insurer_organisation_name     |

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Record created with fields populated
  # ══════════════════════════════════════════════════════════════════════════

  @PP-84 @PP-84-API-003 @p1 @positive @snowflake-integration @payload-populated
  Scenario: API - Query record created by Snowflake integration and verify payload fields populated
    Given a record was created by a successful Snowflake integration execution
    When I query the record via API by its ID
    Then the API should return status code 200
    And the response should contain accelins_submission_source
    And the response should contain accelins_submission_region
    And the response should contain accelins_worktype
    And the response should contain accelins_sender
    And the response should contain accelins_production_period
    And the response should contain accelins_original_currency
    And the response should contain accelins_contract
    And the response should contain accelins_mga_name
    And the response should contain statuscode
    And the response should contain accelins_gwp_amount
    And the response should contain accelins_brokerage_amount_decimal
    And the response should contain accelins_tax_amount_payable_decimal
    And the response should contain accelins_commission_amount_decimal
    And populated payload fields should match API payload or bound references

  @PP-84 @PP-84-API-004 @p1 @positive @snowflake-integration @derived-populated
  Scenario: API - Query record and verify derived fields populated when business rules allow
    Given a record was created by a successful Snowflake integration execution
    And business rules allowed derived values to be set
    When I query the record via API by its ID
    Then the API should return status code 200
    And the response should contain accelins_name
    And the response should contain accelins_accountingperiod
    And the response should contain accelins_bordereau_name
    And the response should contain accelins_insurer
    And the response should contain accelins_fronting_company
    And the response should contain accelins_assigned_to
    And the response should contain accelins_first_receipt
    And the response should contain accelins_right_first_time
    And the response should contain accelins_first_review_date
    And the response should contain accelins_accounting_platform
    And the response should contain accelins_insurer_organisation_name
    And derived fields should have values where business rules applied

  @PP-84 @PP-84-API-005 @p2 @positive @snowflake-integration @derived-blank
  Scenario: API - Query record and verify derived field blank when value cannot be set
    Given a record was created by a successful Snowflake integration execution
    And a mandatory derived value could not be set according to business rules
    When I query the record via API by its ID
    Then the API should return status code 200
    And the corresponding derived field in the response should be null or empty
    And the record should exist and be retrievable

  @PP-84 @PP-84-API-006 @p1 @positive @snowflake-integration @transaction
  Scenario: API - Verify record created in same transaction as plugin execution
    Given a successful Snowflake integration execution runs
    And the plugin executes synchronously
    When I query for the newly created record via API
    Then the API should return status code 200
    And the record should exist
    And the record creation time should be consistent with the plugin execution transaction
    And the record should have all applicable fields populated per business rules

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY
  # ══════════════════════════════════════════════════════════════════════════

  @PP-84 @PP-84-API-007 @p2 @api-query @filtering
  Scenario: API - Query records created by Snowflake integration filtered by payload field
    Given multiple records exist that were created by Snowflake integration
    When I query the Snowflake integration entity where accelins_submission_source equals a known value
    Then the API should return status code 200
    And the response should contain records with accelins_submission_source populated
    And each record should have the expected payload and derived field structure

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # REQ-1: Payload fields populated - PP-84-API-003
  # REQ-2: Derived fields populated - PP-84-API-004
  # REQ-3: Derived blank when cannot set - PP-84-API-005
  # REQ-4: Record complete, same transaction - PP-84-API-006
  #
  # ══════════════════════════════════════════════════════════════════════════
  # STEP DEFINITION NOTES
  # ══════════════════════════════════════════════════════════════════════════
  # Replace "the Snowflake integration entity" with actual entity set name
  # (e.g. accelins_bordereaux) in step definitions when known.
  #
