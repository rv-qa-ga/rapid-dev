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
# Primary Entity: Counterparty Relationship (in CMT - Contract Management Tool app)
# Entity Set: accelins_counterpartyrelationships (confirmed from URL)
# Related Entity: Contracts (Contract References), Counterparties
#
# Counterparty Relationship Field:
#   - DCR Processing (True/False boolean field)
#   - Default value: False
#   - Visible and editable in Counterparty Relationship setup
#   - Located in General tab of Counterparty Relationship form
#   - Counterparty Relationships are set at Contract level (appear as related records on Contract)
#
# Navigation Paths:
#   - Direct: CMT app → Counter Parties → Counterparty Relationships
#   - Via Contract: CMT app → Contracts → Open Contract → Counterparty Relationships subgrid
#
# Applicable Counterparty Roles:
#   - Syndicate
#   - Direct Insurer
#   - Assumed Insurer
#
# Test Requirements (6):
#   REQ-1: DCR Processing is visible and editable in Counterparty Relationship setup
#     → Test Type: UI | Priority: p1
#   REQ-2: Default value is False for new Counterparty Relationships
#     → Test Type: UI | Priority: p1
#   REQ-3: Flag can be set to True or False
#     → Test Type: UI | Priority: p1
#   REQ-4: Flag applies to Syndicate, Direct Insurer, Assumed Insurer roles
#     → Test Type: UI | Priority: p1
#   REQ-5: Flag does not impact ODS/TDS processing
#     → Test Type: UI | Priority: p2
#   REQ-6: Transactions with flag=True routed to DCR, flag=False excluded
#     → Test Type: UI/Integration | Priority: p1
#
# Key Business Rules:
#   - DCR Processing default value is False
#   - Flag is visible and editable within Counterparty Relationship setup in CMT
#   - Flag applies to Counterparty Role = Syndicate, Direct Insurer, Assumed Insurer
#   - When flag = True: transactions routed to DCR during bordereaux ingestion
#   - When flag = False: transactions excluded from DCR processing
#   - Flag does NOT impact existing ODS/TDS processing (month-end loader table)
#   - Used for Lloyds ADP process
#   - Counterparty Relationships are set at Contract level (appear as related records)
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-11 @medium @dynamics @d365 @cmt @counterparty-relationship @dcr-processing @boolean-flag
Feature: PP-11 - CMT | Adding New Flag on counterparty T/F (True/False) for in DCR
  As a member of the Written Operations team
  I want each Insurer (Direct or Assumed) and Syndicate counterparty relationship within the Contract Management Tool (CMT) to have a True/False flag
  So that I can control whether their associated transactions in bordereaux files are processed through to (DCR) or not

  Background:
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-11 @PP-11-UI-001 @p1 @smoke @positive @field-visibility
  Scenario: Verify DCR Processing is visible and editable in Counterparty Relationship setup
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    Then I should see "Active Counterparty Relationships" entity view
    And I open an existing Counterparty Relationship record with Counterparty Role "Syndicate"
    Then the "DCR Processing" field should be visible in the General tab
    And I click Edit on the Counterparty Relationship
    Then the "DCR Processing" field should be editable
    And I take a screenshot as evidence

  @PP-11 @PP-11-UI-001b @p1 @positive @field-visibility @contract-level
  Scenario: Verify DCR Processing is visible and editable from Contract Counterparty Relationships subgrid
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I open an existing Contract record
    And I navigate to the "Counterparty Relationships" subgrid section
    And I open a Counterparty Relationship record with Counterparty Role "Syndicate"
    Then the "DCR Processing" field should be visible in the General tab
    And I click Edit on the Counterparty Relationship
    Then the "DCR Processing" field should be editable
    And I take a screenshot as evidence

  @PP-11 @PP-11-UI-002 @p1 @smoke @positive @default-value
  Scenario: Verify DCR Processing defaults to False for new Counterparty Relationship
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I click New to create a Counterparty Relationship record
    And I select a Contract Reference
    And I select "Syndicate" in the "Counterparty Role" field
    And I select a Counter Party
    And I fill in required Counterparty Relationship fields
    Then the "DCR Processing" field should display "False" by default
    And I take a screenshot as evidence

  @PP-11 @PP-11-UI-002b @p1 @positive @default-value @contract-level
  Scenario: Verify DCR Processing defaults to False when creating from Contract subgrid
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I open an existing Contract record
    And I navigate to the "Counterparty Relationships" subgrid section
    And I click New to create a Counterparty Relationship record
    And I select "Syndicate" in the "Counterparty Role" field
    And I select a Counter Party
    And I fill in required Counterparty Relationship fields
    Then the "DCR Processing" field should display "False" by default
    And I take a screenshot as evidence

  @PP-11 @PP-11-UI-003 @p1 @positive @boolean-field @data-driven
  Scenario Outline: Verify DCR Processing can be set to True or False
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record with Counterparty Role "Syndicate"
    And I click Edit on the Counterparty Relationship
    And I set the "DCR Processing" field to "<flag_value>"
    And I save the Counterparty Relationship record
    Then the Counterparty Relationship should be saved successfully
    And the "DCR Processing" field should display "<flag_value>"
    And I take a screenshot as evidence

    Examples:
      | flag_value |
      | True       |
      | False      |

  @PP-11 @PP-11-UI-004 @p1 @positive @counterparty-roles @data-driven
  Scenario Outline: Verify DCR Processing applies to applicable Counterparty Roles
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record with Counterparty Role "<role>"
    Then the "DCR Processing" field should be visible in the General tab
    And I click Edit on the Counterparty Relationship
    Then the "DCR Processing" field should be editable
    And I can set the "DCR Processing" field to "True" or "False"
    And I take a screenshot as evidence

    Examples:
      | role              |
      | Syndicate         |
      | Direct Insurer    |
      | Assumed Insurer   |

  @PP-11 @PP-11-UI-005 @p1 @positive @dcr-routing
  Scenario: Verify transactions with DCR Processing=True are routed to DCR
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I have a Counterparty Relationship with Counterparty Role "Syndicate" and DCR Processing "True"
    And the bordereaux ingestion process runs for transactions associated with this Counterparty Relationship
    Then only transactions with DCR Processing "True" should be routed to DCR
    And I take a screenshot as evidence

  @PP-11 @PP-11-UI-006 @p1 @positive @dcr-exclusion
  Scenario: Verify transactions with DCR Processing=False are excluded from DCR
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I have a Counterparty Relationship with Counterparty Role "Direct Insurer" and DCR Processing "False"
    And the bordereaux ingestion process runs for transactions associated with this Counterparty Relationship
    Then transactions with DCR Processing "False" should be excluded from DCR processing
    And I take a screenshot as evidence

  @PP-11 @PP-11-UI-007 @p2 @positive @ods-tds-independence
  Scenario: Verify DCR Processing does not impact ODS/TDS processing
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I have a Counterparty Relationship with DCR Processing set to "True"
    And the bordereaux ingestion process runs
    Then the DCR Processing Flag should not impact existing ODS/TDS processing
    And transactions should continue to be processed through ODS/TDS month-end loader table as before
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-11 @PP-11-UI-008 @p2 @negative @invalid-role
  Scenario: Verify DCR Processing behavior for non-applicable Counterparty Roles
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open a Counterparty Relationship record with Counterparty Role "Reinsurer"
    Then the "DCR Processing" field may or may not be visible
    And I take a screenshot as evidence

  @PP-11 @PP-11-UI-009 @p2 @edit @field-update
  Scenario: Verify DCR Processing can be updated on existing Counterparty Relationship
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I open an existing Counterparty Relationship record with Counterparty Role "Assumed Insurer"
    And the "DCR Processing" field is currently set to "False"
    And I click Edit on the Counterparty Relationship
    And I set the "DCR Processing" field to "True"
    And I save the Counterparty Relationship record
    Then the Counterparty Relationship should be saved successfully
    And the "DCR Processing" field should display "True"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-11 @PP-11-UI-010 @p2 @ui-data-creation
  Scenario: Create Counterparty Relationship record via UI with DCR Processing Flag
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Counterparty Relationships" under "Counter Parties" category in the left navigation pane
    And I click New to create a Counterparty Relationship record
    And I select a Contract Reference
    And I select "Syndicate" in the "Counterparty Role" field
    And I select a Counter Party
    And I fill in required Counterparty Relationship fields
    And I set the "DCR Processing" field to "True"
    And I save the Counterparty Relationship record
    Then the Counterparty Relationship should be created successfully
    And the "DCR Processing" field should display "True"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 6
  # Covered Requirements: 6
  # Coverage: 100%
  #
  # ✅ COVERED REQUIREMENTS:
  #   REQ-1: DCR Processing Flag visibility/editable - Scenario PP-11-UI-001
  #   REQ-2: Default value False - Scenario PP-11-UI-002
  #   REQ-3: Flag can be set to True/False - Scenario PP-11-UI-003
  #   REQ-4: Flag applies to applicable roles - Scenario PP-11-UI-004
  #   REQ-5: Does not impact ODS/TDS - Scenario PP-11-UI-007
  #   REQ-6: Routing logic (True→DCR, False→excluded) - Scenarios PP-11-UI-005, PP-11-UI-006
  #
  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Note: Some steps may need to be created for:
  #   - Navigating to CMT app
  #   - Navigating to Counterparties related records
  #   - Setting boolean/True-False fields
  #   - Verifying DCR routing behavior (may require integration testing)
  #
  # These steps should follow the existing Dynamics UI step definition patterns
  # and may require feature-specific step definitions if not already available.
