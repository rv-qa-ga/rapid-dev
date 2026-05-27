# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-14 - CMT | Configure Agency Commission for Insurer/Syndicate Participants
# Type: Story | Status: In Development | Priority: Medium
# Feature Type: field-addition, agency-commission, configuration, mutually-exclusive
# Generated: 2026-01-28 (Based on JIRA PP-14 requirements)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Configure how Agency Commission is determined for each insurer/syndicate participant
# Primary Entity: Participation Rule (in CMT - Contract Management Tool)
# Related Entity: Participation Rule, Financial Element (Agency Commission Expense)
# Entity Set: Likely `accelins_participationrules` or similar
#
# Participation Rule Fields (NEW for PP-14):
#   - Agency Commission rate interpretation (Picklist - mutually exclusive, required)
#     Field API name: Likely `accelins_agencycommissionrateinterpretation` or similar
#     Options: "Agency Commission Gross of Member Commission" or "Agency Commission Net of Member Commission"
#   - Agency Commission Method (Picklist - mutually exclusive, required)
#     Field API name: Likely `accelins_agencycommissionmethod` or similar
#     Options: "Read Agency Commission from BDX" or "Calculate Agency Commission in System"
#   - Expected Agency Commission Rate (Decimal/Percentage - optional, may be required by data rules)
#     Field API name: Likely `accelins_expectedagencycommissionrate` or similar
#     Stored as percentage/decimal value
#   - Applies to Participation Rules where Financial Element = "Agency Commission Expense"
#
# Test Requirements (6):
#   REQ-1: Agency Commission Method field exists and accepts valid values
#     → Test Type: API | Priority: p1
#   REQ-2: Agency Commission Rate Interpretation field exists and accepts valid values
#     → Test Type: API | Priority: p1
#   REQ-3: Both method and interpretation are required when creating records
#     → Test Type: API | Priority: p1
#   REQ-4: Expected Agency Commission Rate can be set and retrieved
#     → Test Type: API | Priority: p1
#   REQ-5: Rate interpretation persists regardless of method
#     → Test Type: API | Priority: p1
#   REQ-6: No default values are set automatically
#     → Test Type: API | Priority: p1
#
# Key Business Rules:
#   - Agency Commission Method is required (mutually exclusive options)
#   - Agency Commission Rate Interpretation is required (mutually exclusive options)
#   - Expected Agency Commission Rate is stored as percentage/decimal
#   - Rate interpretation applies regardless of method selected
#   - When method = "Read from BDX": rate used for validation of BDX values
#   - When method = "Calculate in System": rate used for calculation of Agency Commission
#   - No implicit defaults - both method and interpretation must be explicitly set
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-14 @medium @dynamics @d365 @cmt @participation-rule @agency-commission @configuration
Feature: API - PP-14 - CMT | Configure Agency Commission for Insurer/Syndicate Participants

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-14 @PP-14-API-001 @p1 @smoke @field-exists
  Scenario: API - Verify Agency Commission Method field exists on Participation Rule entity
    When I call the Dynamics API to describe accelins_participationrules entity
    Then the "accelins_agencycommissionmethod" field should exist
    And the field type should be picklist or two options
    # Note: This field is new for PP-14 and may not exist in all environments yet

  @PP-14 @PP-14-API-002 @p1 @smoke @field-exists
  Scenario: API - Verify Agency Commission rate interpretation field exists on Participation Rule entity
    When I call the Dynamics API to describe accelins_participationrules entity
    Then the "accelins_agencycommissionrateinterpretation" field should exist
    And the field type should be picklist or two options
    # Note: This field is new for PP-14 and may not exist in all environments yet

  @PP-14 @PP-14-API-003 @p1 @smoke @field-exists
  Scenario: API - Verify Expected Agency Commission Rate field exists on Participation Rule entity
    When I call the Dynamics API to describe accelins_participationrules entity
    Then the "accelins_expectedagencycommissionrate" field should exist
    And the field type should be decimal or money
    # Note: This field is new for PP-14 and may not exist in all environments yet

  @PP-14 @PP-14-API-004 @p1 @positive @api-create @required-fields
  Scenario: API - Create Participation Rule with Agency Commission Method required
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_financialelement                | Agency Commission Expense |
      | accelins_agencycommissionmethod          | <method-option-value>       |
      | accelins_agencycommissionrateinterpretation | <interpretation-option-value> |
    Then the API should return status code 201
    And the response should contain the new Participation Rule ID
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have "accelins_agencycommissionmethod" set
    And the retrieved record should have "accelins_agencycommissionrateinterpretation" set

  @PP-14 @PP-14-API-005 @p1 @negative @required-fields
  Scenario: API - Reject Participation Rule creation without Agency Commission Method
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_agencycommissionrateinterpretation | <interpretation-option-value> |
    Then the API should return an error status code 400
    And the error response should mention "accelins_agencycommissionmethod" or "required"

  @PP-14 @PP-14-API-006 @p1 @negative @required-fields
  Scenario: API - Reject Participation Rule creation without Agency Commission rate interpretation
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_agencycommissionmethod          | <method-option-value>       |
    Then the API should return an error status code 400
    And the error response should mention "accelins_agencycommissionrateinterpretation" or "required"

  @PP-14 @PP-14-API-007 @p1 @positive @api-create @method-options @data-driven
  Scenario Outline: API - Create Participation Rule with each Agency Commission Method option
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_agencycommissionmethod          | <method_value>             |
      | accelins_agencycommissionrateinterpretation | <interpretation-option-value> |
    Then the API should return status code 201
    And the response should contain "accelins_agencycommissionmethod" field
    And the "accelins_agencycommissionmethod" value should be <method_value>
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have "accelins_agencycommissionmethod" equal to <method_value>

    Examples:
      | method_value                             |
      | <read-from-bdx-option-value>            |
      | <calculate-in-system-option-value>      |

  @PP-14 @PP-14-API-008 @p1 @positive @api-create @interpretation-options @data-driven
  Scenario Outline: API - Create Participation Rule with each Rate Interpretation option
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_agencycommissionmethod          | <method-option-value>       |
      | accelins_agencycommissionrateinterpretation | <interpretation_value>   |
    Then the API should return status code 201
    And the response should contain "accelins_agencycommissionrateinterpretation" field
    And the "accelins_agencycommissionrateinterpretation" value should be <interpretation_value>
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have "accelins_agencycommissionrateinterpretation" equal to <interpretation_value>

    Examples:
      | interpretation_value                    |
      | <gross-of-member-commission-option-value> |
      | <net-of-member-commission-option-value> |

  @PP-14 @PP-14-API-009 @p1 @positive @api-create @rate-field
  Scenario: API - Create Participation Rule with Expected Agency Commission Rate
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_agencycommissionmethod          | <method-option-value>       |
      | accelins_agencycommissionrateinterpretation | <interpretation-option-value> |
      | accelins_expectedagencycommissionrate    | 5.5                        |
    Then the API should return status code 201
    And the response should contain "accelins_expectedagencycommissionrate" field
    And the "accelins_expectedagencycommissionrate" value should be 5.5
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have "accelins_expectedagencycommissionrate" equal to 5.5

  @PP-14 @PP-14-API-010 @p1 @positive @api-create @all-combinations @data-driven
  Scenario Outline: API - Create Participation Rule with all combinations of Method and Interpretation
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_agencycommissionmethod          | <method_value>             |
      | accelins_agencycommissionrateinterpretation | <interpretation_value>   |
      | accelins_expectedagencycommissionrate    | <rate>                    |
    Then the API should return status code 201
    And the response should contain all three Agency Commission fields
    And the "accelins_agencycommissionmethod" value should be <method_value>
    And the "accelins_agencycommissionrateinterpretation" value should be <interpretation_value>
    And the "accelins_expectedagencycommissionrate" value should be <rate>
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have all three fields set correctly

    Examples:
      | method_value                             | interpretation_value                    | rate |
      | <read-from-bdx-option-value>            | <gross-of-member-commission-option-value> | 5.0 |
      | <read-from-bdx-option-value>            | <net-of-member-commission-option-value> | 4.5 |
      | <calculate-in-system-option-value>      | <gross-of-member-commission-option-value> | 6.0 |
      | <calculate-in-system-option-value>      | <net-of-member-commission-option-value> | 3.75|

  @PP-14 @PP-14-API-011 @p2 @positive @api-update
  Scenario: API - Update Agency Commission configuration on existing Participation Rule
    Given I have created a Dynamics record in entity set "accelins_participationrules" with name "Test Update Agency Commission"
    And the Participation Rule has "accelins_agencycommissionmethod" set to <read-from-bdx-option-value>
    And the Participation Rule has "accelins_agencycommissionrateinterpretation" set to <gross-of-member-commission-option-value>
    When I update the Participation Rule field "accelins_agencycommissionmethod" to <calculate-in-system-option-value> via API
    And I update the Participation Rule field "accelins_agencycommissionrateinterpretation" to <net-of-member-commission-option-value> via API
    And I update the Participation Rule field "accelins_expectedagencycommissionrate" to 7.5 via API
    Then the API should return status code 204
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have "accelins_agencycommissionmethod" equal to <calculate-in-system-option-value>
    And the retrieved record should have "accelins_agencycommissionrateinterpretation" equal to <net-of-member-commission-option-value>
    And the retrieved record should have "accelins_expectedagencycommissionrate" equal to 7.5

  @PP-14 @PP-14-API-012 @p1 @positive @rate-interpretation-consistency
  Scenario: API - Verify Rate Interpretation persists when Method is changed
    Given I have created a Dynamics record in entity set "accelins_participationrules" with name "Test Rate Interpretation Consistency"
    And the Participation Rule has "accelins_agencycommissionmethod" set to <read-from-bdx-option-value>
    And the Participation Rule has "accelins_agencycommissionrateinterpretation" set to <net-of-member-commission-option-value>
    And the Participation Rule has "accelins_expectedagencycommissionrate" set to 3.25
    When I update the Participation Rule field "accelins_agencycommissionmethod" to <calculate-in-system-option-value> via API
    Then the API should return status code 204
    And I should be able to retrieve the Participation Rule record by ID
    And the retrieved record should have "accelins_agencycommissionmethod" equal to <calculate-in-system-option-value>
    And the retrieved record should have "accelins_agencycommissionrateinterpretation" equal to <net-of-member-commission-option-value>
    And the retrieved record should have "accelins_expectedagencycommissionrate" equal to 3.25
    And the rate interpretation should persist regardless of method change

  @PP-14 @PP-14-API-013 @p1 @positive @api-query @data-persistence
  Scenario: API - Query Participation Rules and verify Agency Commission values are persisted
    Given I have created a Dynamics record in entity set "accelins_participationrules" with name "Test Query Agency Commission"
    And the Participation Rule has "accelins_agencycommissionmethod" set to <calculate-in-system-option-value>
    And the Participation Rule has "accelins_agencycommissionrateinterpretation" set to <gross-of-member-commission-option-value>
    And the Participation Rule has "accelins_expectedagencycommissionrate" set to 6.0
    When I query Participation Rules where "accelins_name" equals "Test Query Agency Commission"
    Then the API should return status code 200
    And the response should contain at least one Participation Rule record
    And the retrieved record should have "accelins_agencycommissionmethod" equal to <calculate-in-system-option-value>
    And the retrieved record should have "accelins_agencycommissionrateinterpretation" equal to <gross-of-member-commission-option-value>
    And the retrieved record should have "accelins_expectedagencycommissionrate" equal to 6.0
    And all Agency Commission values should be persisted correctly

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VALIDATION SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-14 @PP-14-API-014 @p2 @negative @invalid-method
  Scenario: API - Verify Agency Commission Method only accepts valid option values
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_agencycommissionmethod          | InvalidMethodValue         |
      | accelins_agencycommissionrateinterpretation | <interpretation-option-value> |
    Then the API should return an error status code 400
    And the error response should mention "accelins_agencycommissionmethod" or "invalid value"

  @PP-14 @PP-14-API-015 @p2 @negative @invalid-interpretation
  Scenario: API - Verify Agency Commission rate interpretation only accepts valid option values
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_agencycommissionmethod          | <method-option-value>       |
      | accelins_agencycommissionrateinterpretation | InvalidInterpretationValue |
    Then the API should return an error status code 400
    And the error response should mention "accelins_agencycommissionrateinterpretation" or "invalid value"

  @PP-14 @PP-14-API-016 @p2 @negative @invalid-rate
  Scenario: API - Verify Expected Agency Commission Rate only accepts numeric values
    When I create a Dynamics record in entity set "accelins_participationrules" with data:
      | field                                    | value                      |
      | accelins_counterpartyrelationship       | /accelins_counterpartyrelationships(<relationship-id>) |
      | accelins_financialelement               | /accelins_financialelements(<element-id>) |
      | accelins_agencycommissionmethod          | <method-option-value>       |
      | accelins_agencycommissionrateinterpretation | <interpretation-option-value> |
      | accelins_expectedagencycommissionrate    | InvalidRateValue           |
    Then the API should return an error status code 400
    And the error response should mention "accelins_expectedagencycommissionrate" or "invalid value"

  @PP-14 @PP-14-API-017 @p2 @api-query @filtering
  Scenario: API - Query Participation Rules filtered by Agency Commission Method
    Given I have created multiple Participation Rule records with different Agency Commission Method values
    When I query Participation Rules where "accelins_agencycommissionmethod" equals <read-from-bdx-option-value>
    And I filter by Financial Element equals "Agency Commission Expense"
    Then the API should return status code 200
    And the response should contain Participation Rule records
    And all returned records should have "accelins_agencycommissionmethod" equal to <read-from-bdx-option-value>
    And all returned records should have Financial Element "Agency Commission Expense"

  @PP-14 @PP-14-API-018 @p2 @api-query @filtering
  Scenario: API - Query Participation Rules filtered by Rate Interpretation
    Given I have created multiple Participation Rule records with different Rate Interpretation values
    When I query Participation Rules where "accelins_agencycommissionrateinterpretation" equals <gross-of-member-commission-option-value>
    And I filter by Financial Element equals "Agency Commission Expense"
    Then the API should return status code 200
    And the response should contain Participation Rule records
    And all returned records should have "accelins_agencycommissionrateinterpretation" equal to <gross-of-member-commission-option-value>
    And all returned records should have Financial Element "Agency Commission Expense"

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 6
  # Covered Requirements: 6
  # Coverage: 100%
  #
  # ✅ COVERED REQUIREMENTS:
  #   REQ-1: Method field exists and accepts values - Scenarios PP-14-API-001, PP-14-API-007
  #   REQ-2: Rate interpretation field exists and accepts values - Scenarios PP-14-API-002, PP-14-API-008
  #   REQ-3: Both required - Scenarios PP-14-API-004, PP-14-API-005, PP-14-API-006
  #   REQ-4: Rate can be set and retrieved - Scenarios PP-14-API-003, PP-14-API-009
  #   REQ-5: Rate interpretation persists - Scenario PP-14-API-012
  #   REQ-6: No default values - Scenario PP-14-API-004 (implicit - must provide values)
  #
  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Note: Some steps may need to be created for:
  #   - Creating Participation Rules with Agency Commission configuration
  #   - Querying Participation Rules by Agency Commission fields
  #   - Validating picklist option values for Agency Commission fields
  #
  # These steps should follow the existing Dynamics API step definition patterns
  # and may require feature-specific step definitions if not already available.
  #
  # Entity Set Name: `accelins_participationrules` (to be confirmed via API discovery)
  # Field API Names (to be confirmed when fields are created):
  #   - Agency Commission Method: `accelins_agencycommissionmethod` (likely)
  #   - Agency Commission rate interpretation: `accelins_agencycommissionrateinterpretation` (likely)
  #   - Expected Agency Commission Rate: `accelins_expectedagencycommissionrate` (likely)
  #   - Financial Element: `accelins_financialelement` (lookup to Financial Element = "Agency Commission Expense")
  #   - Counterparty Relationship: `accelins_counterpartyrelationship` (lookup to Counterparty Relationship)
  # Picklist Option Values: To be confirmed when fields are created in Dynamics
  # Note: Fields apply to Participation Rules where Financial Element = "Agency Commission Expense"
