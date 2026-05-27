# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-16 - CMT | Maintain Agency Commission Configuration Over Time
# Type: Story | Status: In Development | Priority: Medium
# Feature Type: configuration-maintenance, agency-commission, audit-trail, permissions
# Generated: 2026-01-28 (Based on JIRA PP-16 requirements)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Maintain Agency Commission Configuration Over Time
# Primary Entity: Participation Rule (in CMT - Contract Management Tool)
# Related Entity: Counterparty Relationship, Financial Element (Agency Commission Expense)
# Entity Set: Likely `accelins_participationrules` or similar (same as PP-14)
#
# This story builds on PP-14, which established Agency Commission configuration on Participation Rules.
# PP-16 focuses on viewing, editing, permissions, and audit trail for that configuration.
#
# Participation Rule Fields (from PP-14):
#   - Agency Commission rate interpretation (Picklist - mutually exclusive, required)
#   - Agency Commission Method (Picklist - mutually exclusive, required)
#   - Expected Agency Commission Rate (Decimal/Percentage - optional)
#   - Validation Tolerances (may be new fields for PP-16)
#
# Test Requirements (4):
#   REQ-1: View configuration - retrieve all agency commission settings via API
#     → Test Type: API | Priority: p1
#   REQ-2: Edit configuration - update agency commission settings via API
#     → Test Type: API | Priority: p1
#   REQ-3: Restrict editing to authorized roles - permissions enforcement via API
#     → Test Type: API | Priority: p1
#   REQ-4: Configuration change audit - retrieve audit trail/history via API
#     → Test Type: API | Priority: p2
#
# Key Business Rules:
#   - Users can view agency commission configuration for participants via API
#   - Only authorized roles can edit agency commission configuration via API
#   - All configuration changes must be audited (who, when, what changed)
#   - Updated values are used going forward for calculation/validation
#   - Configuration includes: Method, Rate Interpretation, Expected Rate, Validation Tolerances
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-16 @medium @dynamics @d365 @cmt @participation-rule @agency-commission @maintenance @audit
Feature: API - PP-16 - CMT | Maintain Agency Commission Configuration Over Time

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-16 @PP-16-API-001 @p1 @smoke @positive @view-configuration
  Scenario: API - Retrieve Agency Commission configuration for participant
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has Agency Commission configuration set
    When I retrieve the Participation Rule record by ID
    Then the API should return status code 200
    And the response should contain "accelins_agencycommissionmethod" field
    And the response should contain "accelins_agencycommissionrateinterpretation" field
    And the response should contain "accelins_expectedagencycommissionrate" field
    And I should be able to see whether "Read Agency Commission from BDX" is enabled
    And I should be able to see whether "Calculate Agency Commission in System" is enabled
    And I should be able to see the rate interpretation (Gross or Net of Member Commission)
    And I should be able to see the expected agency commission rate value
    And I should be able to see any configured validation tolerances

  @PP-16 @PP-16-API-002 @p1 @positive @view-configuration @data-driven
  Scenario Outline: API - Retrieve Agency Commission Method value for each option
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "accelins_agencycommissionmethod" set to <method_value>
    When I retrieve the Participation Rule record by ID
    Then the API should return status code 200
    And the response should contain "accelins_agencycommissionmethod" field
    And the "accelins_agencycommissionmethod" value should be <method_value>
    And I should be able to determine whether "Read Agency Commission from BDX" is enabled: <read_from_bdx>
    And I should be able to determine whether "Calculate Agency Commission in System" is enabled: <calculate_in_system>

    Examples:
      | method_value                             | read_from_bdx | calculate_in_system |
      | <read-from-bdx-option-value>            | true          | false               |
      | <calculate-in-system-option-value>     | false         | true                |

  @PP-16 @PP-16-API-003 @p1 @positive @view-configuration @data-driven
  Scenario Outline: API - Retrieve Agency Commission rate interpretation value for each option
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "accelins_agencycommissionrateinterpretation" set to <interpretation_value>
    When I retrieve the Participation Rule record by ID
    Then the API should return status code 200
    And the response should contain "accelins_agencycommissionrateinterpretation" field
    And the "accelins_agencycommissionrateinterpretation" value should be <interpretation_value>
    And I should be able to determine whether the rate is interpreted as total inclusive: <is_total_inclusive>
    And I should be able to determine whether the rate is interpreted as margin: <is_margin>

    Examples:
      | interpretation_value                    | is_total_inclusive | is_margin |
      | <gross-of-member-commission-option-value> | true               | false     |
      | <net-of-member-commission-option-value> | false              | true      |

  @PP-16 @PP-16-API-004 @p1 @positive @view-configuration
  Scenario: API - Retrieve Expected Agency Commission Rate value
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "accelins_expectedagencycommissionrate" set to 5.5
    When I retrieve the Participation Rule record by ID
    Then the API should return status code 200
    And the response should contain "accelins_expectedagencycommissionrate" field
    And the "accelins_expectedagencycommissionrate" value should be 5.5

  @PP-16 @PP-16-API-005 @p1 @positive @view-configuration
  Scenario: API - Retrieve validation tolerances when configured
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has validation tolerances configured
    When I retrieve the Participation Rule record by ID
    Then the API should return status code 200
    And the response should contain validation tolerance fields
    And I should be able to see the tolerance values

  @PP-16 @PP-16-API-006 @p1 @positive @edit-configuration
  Scenario: API - Update Agency Commission Method via API
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "accelins_agencycommissionmethod" set to <read-from-bdx-option-value>
    When I update the Participation Rule field "accelins_agencycommissionmethod" to <calculate-in-system-option-value> via API
    Then the API should return status code 204
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have "accelins_agencycommissionmethod" equal to <calculate-in-system-option-value>
    And the updated value should be used going forward

  @PP-16 @PP-16-API-007 @p1 @positive @edit-configuration
  Scenario: API - Update Agency Commission rate interpretation via API
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "accelins_agencycommissionrateinterpretation" set to <gross-of-member-commission-option-value>
    When I update the Participation Rule field "accelins_agencycommissionrateinterpretation" to <net-of-member-commission-option-value> via API
    Then the API should return status code 204
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have "accelins_agencycommissionrateinterpretation" equal to <net-of-member-commission-option-value>
    And the updated value should be used going forward

  @PP-16 @PP-16-API-008 @p1 @positive @edit-configuration
  Scenario: API - Update Expected Agency Commission Rate via API
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has "accelins_expectedagencycommissionrate" set to 5.0
    When I update the Participation Rule field "accelins_expectedagencycommissionrate" to 6.25 via API
    Then the API should return status code 204
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have "accelins_expectedagencycommissionrate" equal to 6.25
    And the updated value should be used going forward

  @PP-16 @PP-16-API-009 @p1 @positive @edit-configuration
  Scenario: API - Update multiple Agency Commission configuration fields together
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    When I update the Participation Rule with multiple fields via API:
      | field                                    | value                      |
      | accelins_agencycommissionmethod          | <calculate-in-system-option-value> |
      | accelins_agencycommissionrateinterpretation | <net-of-member-commission-option-value> |
      | accelins_expectedagencycommissionrate    | 7.5                        |
    Then the API should return status code 204
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have all updated configuration values
    And all updated values should be used going forward

  @PP-16 @PP-16-API-010 @p1 @negative @permissions
  Scenario: API - Verify unauthorized user cannot update Agency Commission configuration
    Given I have a valid Dynamics 365 API token for a user without required permissions
    And I have a Participation Rule record with Financial Element "Agency Commission Expense"
    When I attempt to update the Participation Rule field "accelins_agencycommissionmethod" via API
    Then the API should return an error status code 403 or 401
    And the error response should indicate insufficient permissions
    And the error message should mention that the user does not have permission to edit Agency Commission configuration

  @PP-16 @PP-16-API-011 @p2 @positive @audit-trail
  Scenario: API - Retrieve audit trail for Participation Rule
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had Agency Commission configuration changes
    When I retrieve the audit trail or history for the Participation Rule via API
    Then the API should return status code 200
    And the response should contain audit trail entries
    And I should be able to see configuration change history

  @PP-16 @PP-16-API-012 @p2 @positive @audit-trail
  Scenario: API - Verify audit trail shows who made configuration changes
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had Agency Commission configuration changes made by a specific user
    When I retrieve the audit trail for the Participation Rule via API
    Then the API should return status code 200
    And the audit trail should show who made each configuration change
    And each audit entry should contain the user who made the change

  @PP-16 @PP-16-API-013 @p2 @positive @audit-trail
  Scenario: API - Verify audit trail shows when configuration changes were made
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had Agency Commission configuration changes
    When I retrieve the audit trail for the Participation Rule via API
    Then the API should return status code 200
    And the audit trail should show when each configuration change was made
    And each audit entry should contain a timestamp or date/time

  @PP-16 @PP-16-API-014 @p2 @positive @audit-trail
  Scenario: API - Verify audit trail shows old and new values for configuration changes
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had "accelins_agencycommissionmethod" changed from <read-from-bdx-option-value> to <calculate-in-system-option-value>
    When I retrieve the audit trail for the Participation Rule via API
    Then the API should return status code 200
    And the audit trail should show the configuration change
    And the audit entry should show the old value: <read-from-bdx-option-value>
    And the audit entry should show the new value: <calculate-in-system-option-value>
    And the audit entry should indicate which field was changed: "accelins_agencycommissionmethod"

  @PP-16 @PP-16-API-015 @p2 @positive @audit-trail @data-driven
  Scenario Outline: API - Verify audit trail shows old and new values for each configuration field
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had "<field_name>" changed from "<old_value>" to "<new_value>"
    When I retrieve the audit trail for the Participation Rule via API
    Then the API should return status code 200
    And the audit trail should show the configuration change
    And the audit entry should show the old value: "<old_value>"
    And the audit entry should show the new value: "<new_value>"
    And the audit entry should indicate which field was changed: "<field_name>"

    Examples:
      | field_name                                    | old_value                                    | new_value                                    |
      | accelins_agencycommissionmethod              | <read-from-bdx-option-value>                 | <calculate-in-system-option-value>           |
      | accelins_agencycommissionrateinterpretation  | <gross-of-member-commission-option-value>   | <net-of-member-commission-option-value>     |
      | accelins_expectedagencycommissionrate        | 5.0                                         | 6.5                                         |

  @PP-16 @PP-16-API-016 @p2 @positive @audit-trail
  Scenario: API - Verify audit trail shows complete change history for multiple updates
    Given I have a Participation Rule record with Financial Element "Agency Commission Expense"
    And the Participation Rule has had multiple Agency Commission configuration changes over time
    When I retrieve the audit trail for the Participation Rule via API
    Then the API should return status code 200
    And the audit trail should contain all configuration changes in chronological order
    And each change should show who made it, when it was made, and what changed
    And I should be able to see the complete history of configuration changes

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VALIDATION SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-16 @PP-16-API-017 @p2 @api-query @filtering
  Scenario: API - Query Participation Rules filtered by Agency Commission Method
    Given I have created multiple Participation Rule records with different Agency Commission Method values
    When I query Participation Rules where "accelins_agencycommissionmethod" equals <read-from-bdx-option-value>
    And I filter by Financial Element equals "Agency Commission Expense"
    Then the API should return status code 200
    And the response should contain Participation Rule records
    And all returned records should have "accelins_agencycommissionmethod" equal to <read-from-bdx-option-value>
    And all returned records should have Financial Element "Agency Commission Expense"

  @PP-16 @PP-16-API-018 @p2 @api-query @filtering
  Scenario: API - Query Participation Rules filtered by Rate Interpretation
    Given I have created multiple Participation Rule records with different Rate Interpretation values
    When I query Participation Rules where "accelins_agencycommissionrateinterpretation" equals <gross-of-member-commission-option-value>
    And I filter by Financial Element equals "Agency Commission Expense"
    Then the API should return status code 200
    And the response should contain Participation Rule records
    And all returned records should have "accelins_agencycommissionrateinterpretation" equal to <gross-of-member-commission-option-value>
    And all returned records should have Financial Element "Agency Commission Expense"

  @PP-16 @PP-16-API-019 @p2 @api-query @filtering
  Scenario: API - Query Participation Rules filtered by Expected Agency Commission Rate range
    Given I have created multiple Participation Rule records with different Expected Agency Commission Rate values
    When I query Participation Rules where "accelins_expectedagencycommissionrate" is greater than 5.0
    And I filter by Financial Element equals "Agency Commission Expense"
    Then the API should return status code 200
    And the response should contain Participation Rule records
    And all returned records should have "accelins_expectedagencycommissionrate" greater than 5.0
    And all returned records should have Financial Element "Agency Commission Expense"

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 4
  # Covered Requirements: 4
  # Coverage: 100%
  #
  # ✅ COVERED REQUIREMENTS:
  #   REQ-1: View configuration - Scenarios PP-16-API-001 through PP-16-API-005
  #   REQ-2: Edit configuration - Scenarios PP-16-API-006 through PP-16-API-009
  #   REQ-3: Restrict editing to authorized roles - Scenario PP-16-API-010
  #   REQ-4: Configuration change audit - Scenarios PP-16-API-011 through PP-16-API-016
  #
  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Note: Some steps may need to be created for:
  #   - Retrieving audit trail or history via API
  #   - Verifying audit trail entries (who, when, what changed)
  #   - Checking user permissions/roles for Agency Commission configuration via API
  #   - Querying Participation Rules filtered by Agency Commission fields
  #
  # These steps should follow the existing Dynamics API step definition patterns
  # and may require feature-specific step definitions if not already available.
  #
  # Entity Set Name: `accelins_participationrules` (to be confirmed via API discovery)
  # Field API Names (from PP-14, to be confirmed when fields are created):
  #   - Agency Commission Method: `accelins_agencycommissionmethod`
  #   - Agency Commission rate interpretation: `accelins_agencycommissionrateinterpretation`
  #   - Expected Agency Commission Rate: `accelins_expectedagencycommissionrate`
  # Audit Trail: Dynamics 365 provides audit trail via Audit entity or Change Tracking
  # Note: Fields apply to Participation Rules where Financial Element = "Agency Commission Expense"
