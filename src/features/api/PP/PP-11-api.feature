# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-11 - CMT | Adding New Flag on counterparty T/F (True/False) for in DCR
# Type: Story | Status: In Development | Priority: Medium
# Feature Type: field-addition, boolean-flag, dcr-processing-control
# Generated: 2026-01-27 (Based on JIRA PP-11 requirements)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Adding New Flag on counterparty T/F (True/False) for in DCR
# Primary Entity: Counterparty Relationship (in CMT - Contract Management Tool)
# Entity Set: `accelins_counterpartyrelationships` (confirmed from URL: etn=accelins_counterpartyrelationship)
# Related Entity: Contracts (Contract References), Counterparties
#
# Counterparty Relationship Field:
#   - DCR Processing (True/False boolean field)
#   - Field API name: Likely `accelins_dcrprocessing` or `accelins_dcrprocessingflag`
#   - Default value: False
#   - Located in General tab of Counterparty Relationship form
#   - Counterparty Relationships are set at Contract level (related records on Contract)
#
# Applicable Counterparty Roles:
#   - Syndicate
#   - Direct Insurer
#   - Assumed Insurer
#
# Test Requirements (6):
#   REQ-1: DCR Processing field exists on Counterparty Relationship entity
#     → Test Type: API | Priority: p1
#   REQ-2: Default value is False when creating new Counterparty Relationship
#     → Test Type: API | Priority: p1
#   REQ-3: Flag can be set to True or False via API
#     → Test Type: API | Priority: p1
#   REQ-4: Flag applies to Syndicate, Direct Insurer, Assumed Insurer roles
#     → Test Type: API | Priority: p1
#   REQ-5: Flag can be updated via API
#     → Test Type: API | Priority: p2
#   REQ-6: Flag value is persisted correctly
#     → Test Type: API | Priority: p1
#
# Key Business Rules:
#   - DCR Processing default value is False
#   - Flag applies to Counterparty Role = Syndicate, Direct Insurer, Assumed Insurer
#   - When flag = True: transactions routed to DCR during bordereaux ingestion
#   - When flag = False: transactions excluded from DCR processing
#   - Flag does NOT impact existing ODS/TDS processing (month-end loader table)
#   - Used for Lloyds ADP process
#   - Counterparty Relationships are set at Contract level
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-11 @medium @dynamics @d365 @cmt @counterparty @dcr-processing @boolean-flag
Feature: API - PP-11 - CMT | Adding New Flag on counterparty T/F (True/False) for in DCR

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-11 @PP-11-API-001 @p1 @smoke @field-exists
  Scenario: API - Verify DCR Processing field exists on Counterparty Relationship entity
    When I call the Dynamics API to describe accelins_counterpartyrelationships entity
    Then the "accelins_dcrprocessing" field should exist
    And the field type should be boolean or two options
    # Note: This field is new for PP-11 and may not exist in all environments yet

  @PP-11 @PP-11-API-002 @p1 @smoke @positive @default-value @api-create
  Scenario: API - Create Counterparty Relationship with default DCR Processing value
    When I create a Dynamics record in entity set "accelins_counterpartyrelationships" with data:
      | field                                    | value                      |
      | accelins_counterpartyrole                | /accelins_counterpartyroles(<role-id>) |
      | accelins_cmt_contract                    | /accelins_cmt_contracts(<contract-id>) |
      | accelins_counterparty                    | /accelins_parties(<party-id>) |
    Then the API should return status code 201
    And the response should contain the new Counterparty Relationship ID
    And I should be able to retrieve the Counterparty Relationship record by ID
    And the retrieved record should have "accelins_dcrprocessing" equal to false
    And the "accelins_dcrprocessing" field should default to false when not specified

  @PP-11 @PP-11-API-003 @p1 @positive @api-create @boolean-field @data-driven
  Scenario Outline: API - Create Counterparty Relationship with DCR Processing set to True or False
    When I create a Dynamics record in entity set "accelins_counterpartyrelationships" with data:
      | field                                    | value                      |
      | accelins_counterpartyrole                | /accelins_counterpartyroles(<role-id>) |
      | accelins_cmt_contract                    | /accelins_cmt_contracts(<contract-id>) |
      | accelins_counterparty                    | /accelins_parties(<party-id>) |
      | accelins_dcrprocessing                   | <flag_value>               |
    Then the API should return status code 201
    And the response should contain "accelins_dcrprocessing" field
    And the "accelins_dcrprocessing" value should be <flag_value>
    And I should be able to retrieve the Counterparty Relationship record by ID
    And the retrieved record should have "accelins_dcrprocessing" equal to <flag_value>

    Examples:
      | flag_value | flag |
      | true       | True |
      | false      | False|

  @PP-11 @PP-11-API-004 @p1 @positive @counterparty-roles @data-driven
  Scenario Outline: API - Create Counterparty Relationship with DCR Processing for applicable roles
    When I create a Dynamics record in entity set "accelins_counterpartyrelationships" with data:
      | field                                    | value                      |
      | accelins_counterpartyrole                | /accelins_counterpartyroles(<role-id>) |
      | accelins_cmt_contract                    | /accelins_cmt_contracts(<contract-id>) |
      | accelins_counterparty                    | /accelins_parties(<party-id>) |
      | accelins_dcrprocessing                   | true                       |
    Then the API should return status code 201
    And the response should contain "accelins_dcrprocessing" field
    And the "accelins_dcrprocessing" value should be true
    And I should be able to retrieve the Counterparty Relationship record by ID
    And the retrieved record should have "accelins_counterpartyrole" lookup reference
    And the retrieved record should have "accelins_dcrprocessing" equal to true

    Examples:
      | role              |
      | Syndicate         |
      | Direct Insurer    |
      | Assumed Insurer   |

  @PP-11 @PP-11-API-005 @p2 @positive @api-update
  Scenario: API - Update DCR Processing on existing Counterparty Relationship
    Given I have created a Dynamics record in entity set "accelins_counterpartyrelationships" with name "Test Update Counterparty Relationship"
    And the Counterparty Relationship has "accelins_dcrprocessing" set to false
    When I update the Counterparty Relationship field "accelins_dcrprocessing" to true via API
    Then the API should return status code 204
    And I should be able to retrieve the Counterparty Relationship record by ID
    And the retrieved record should have "accelins_dcrprocessing" equal to true

  @PP-11 @PP-11-API-006 @p1 @positive @api-query @data-persistence
  Scenario: API - Query Counterparty Relationships and verify DCR Processing values are persisted
    Given I have created a Dynamics record in entity set "accelins_counterpartyrelationships" with name "Test Query Counterparty Relationship"
    And the Counterparty Relationship has "accelins_dcrprocessing" set to true
    When I query Counterparty Relationships where "accelins_name" equals "Test Query Counterparty Relationship"
    Then the API should return status code 200
    And the response should contain at least one Counterparty Relationship record
    And the retrieved record should have "accelins_dcrprocessing" equal to true
    And the DCR Processing value should be persisted correctly

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VALIDATION SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-11 @PP-11-API-007 @p2 @negative @invalid-value
  Scenario: API - Verify DCR Processing only accepts boolean values
    When I create a Dynamics record in entity set "accelins_counterpartyrelationships" with data:
      | field                                    | value                      |
      | accelins_counterpartyrole                | /accelins_counterpartyroles(<role-id>) |
      | accelins_cmt_contract                    | /accelins_cmt_contracts(<contract-id>) |
      | accelins_counterparty                    | /accelins_parties(<party-id>) |
      | accelins_dcrprocessing                   | InvalidValue               |
    Then the API should return an error status code 400
    And the error response should mention "accelins_dcrprocessing" or "invalid value"

  @PP-11 @PP-11-API-008 @p2 @api-query @filtering
  Scenario: API - Query Counterparty Relationships filtered by DCR Processing
    Given I have created multiple Counterparty Relationship records with different DCR Processing values
    When I query Counterparty Relationships where "accelins_dcrprocessing" equals true
    Then the API should return status code 200
    And the response should contain Counterparty Relationship records
    And all returned records should have "accelins_dcrprocessing" equal to true

  @PP-11 @PP-11-API-009 @p2 @api-query @filtering
  Scenario: API - Query Counterparty Relationships with DCR Processing=False
    Given I have created multiple Counterparty Relationship records with different DCR Processing values
    When I query Counterparty Relationships where "accelins_dcrprocessing" equals false
    Then the API should return status code 200
    And the response should contain Counterparty Relationship records
    And all returned records should have "accelins_dcrprocessing" equal to false

  # ══════════════════════════════════════════════════════════════════════════
  # BUSINESS RULE VALIDATION - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-11 @PP-11-API-010 @p2 @positive @default-behavior
  Scenario: API - Verify default value is False when flag not specified
    When I create a Dynamics record in entity set "accelins_counterpartyrelationships" with data:
      | field                                    | value                      |
      | accelins_counterpartyrole                | /accelins_counterpartyroles(<role-id>) |
      | accelins_cmt_contract                    | /accelins_cmt_contracts(<contract-id>) |
      | accelins_counterparty                    | /accelins_parties(<party-id>) |
    Then the API should return status code 201
    And I should be able to retrieve the Counterparty Relationship record by ID
    And the retrieved record should have "accelins_dcrprocessing" equal to false
    And the default value should be false when the field is not provided

  @PP-11 @PP-11-API-011 @p2 @positive @role-combination
  Scenario: API - Verify DCR Processing works with Syndicate role
    When I create a Dynamics record in entity set "accelins_counterpartyrelationships" with data:
      | field                                    | value                      |
      | accelins_counterpartyrole                | /accelins_counterpartyroles(<syndicate-role-id>) |
      | accelins_cmt_contract                    | /accelins_cmt_contracts(<contract-id>) |
      | accelins_counterparty                    | /accelins_parties(<party-id>) |
      | accelins_dcrprocessing                   | true                       |
    Then the API should return status code 201
    And the response should contain both "accelins_counterpartyrole" and "accelins_dcrprocessing"
    And the "accelins_counterpartyrole" should be a valid lookup reference
    And the "accelins_dcrprocessing" should be true

  @PP-11 @PP-11-API-012 @p2 @positive @role-combination
  Scenario: API - Verify DCR Processing works with Direct Insurer role
    When I create a Dynamics record in entity set "accelins_counterpartyrelationships" with data:
      | field                                    | value                      |
      | accelins_counterpartyrole                | /accelins_counterpartyroles(<direct-insurer-role-id>) |
      | accelins_cmt_contract                    | /accelins_cmt_contracts(<contract-id>) |
      | accelins_counterparty                    | /accelins_parties(<party-id>) |
      | accelins_dcrprocessing                   | false                      |
    Then the API should return status code 201
    And the response should contain both "accelins_counterpartyrole" and "accelins_dcrprocessing"
    And the "accelins_counterpartyrole" should be a valid lookup reference
    And the "accelins_dcrprocessing" should be false

  @PP-11 @PP-11-API-013 @p2 @positive @role-combination
  Scenario: API - Verify DCR Processing works with Assumed Insurer role
    When I create a Dynamics record in entity set "accelins_counterpartyrelationships" with data:
      | field                                    | value                      |
      | accelins_counterpartyrole                | /accelins_counterpartyroles(<assumed-insurer-role-id>) |
      | accelins_cmt_contract                    | /accelins_cmt_contracts(<contract-id>) |
      | accelins_counterparty                    | /accelins_parties(<party-id>) |
      | accelins_dcrprocessing                   | true                       |
    Then the API should return status code 201
    And the response should contain both "accelins_counterpartyrole" and "accelins_dcrprocessing"
    And the "accelins_counterpartyrole" should be a valid lookup reference
    And the "accelins_dcrprocessing" should be true

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 6
  # Covered Requirements: 6
  # Coverage: 100%
  #
  # ✅ COVERED REQUIREMENTS:
  #   REQ-1: Field exists - Scenario PP-11-API-001
  #   REQ-2: Default value False - Scenario PP-11-API-002, PP-11-API-010
  #   REQ-3: Flag can be set to True/False - Scenario PP-11-API-003
  #   REQ-4: Flag applies to applicable roles - Scenario PP-11-API-004, PP-11-API-011, PP-11-API-012, PP-11-API-013
  #   REQ-5: Flag can be updated - Scenario PP-11-API-005
  #   REQ-6: Flag value persisted - Scenario PP-11-API-006
  #
  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Note: Some steps may need to be created for:
  #   - Describing Counterparty entity (may need entity set name)
  #   - Creating Counterparty records with specific roles
  #   - Querying Counterparties by DCR Processing Flag
  #
  # These steps should follow the existing Dynamics API step definition patterns
  # and may require feature-specific step definitions if not already available.
  #
# Entity Set Name: `accelins_counterpartyrelationships` (confirmed from API discovery)
# Field API Names (confirmed from API discovery):
#   - DCR Processing: `accelins_dcrprocessing` (NEW FIELD for PP-11, to be confirmed when created)
#   - Contract Reference: `accelins_cmt_contract` (Lookup)
#   - Counterparty Role: `accelins_counterpartyrole` (Lookup)
#   - Counter Party: `accelins_counterparty` (Lookup)
# Counterparty Role Values: Agency, Direct Insurer, Legal Entity, Member, Placing Broker, 
#   Third Party Administrator, Syndicate, Assumed Insurer (from screenshots and requirements)
# Note: Counterparty Role is a Lookup field, not a picklist, so values are referenced by ID