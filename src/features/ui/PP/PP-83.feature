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
#           submission_source = "Portal" and submission_region + worktype are
#           present, plugin runs and sets accelins_name (region + autonumber),
#           accounting period (MEC/VIPR logic), and other derived fields.
# Primary Entity: accelins_repositoryfile (Repository File - Dataverse)
#
# Plugin RUNS when (all true):
#   - Create request to Dataverse for accelins_repositoryfile
#   - accelins_submission_source = "Portal" (case as per implementation)
#   - accelins_submission_region is present
#   - accelins_worktype is present
#   → Pre-operation plugin runs synchronously on Create event.
#
# Plugin DOES NOT RUN (exits without modifying record) when any of:
#   - Not a new record, OR
#   - accelins_submission_source ≠ "Portal", OR
#   - accelins_submission_region is missing, OR
#   - accelins_worktype is missing
#
# Generated fields (valid plugin execution):
#   - accelins_name = <accelins_submission_region>-<next autonumber> (e.g. EU-000123)
#   - accelins_accountingperiod = current or next period per MEC/VIPR rules
#   - accelins_assigned_to → D365ServiceAccount
#   - accelins_first_receipt → true
#   - accelins_right_first_time → true
#   - accelins_accounting_platform = 100000000 (Dynamics)
#   - accelins_first_review_date = accelins_original_created_date
#
# Accounting period rules:
#   - First day of current created date matched to MEC period reporting date.
#   - If Current Date < VIPR Date of MEC period → current accounting period.
#   - If Accounting Base Date ≥ VIPR Date of MEC period → next accounting period.
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-83 @highest @dynamics @d365 @repositoryfile @pre-operation-plugin @snowflake-integration
Feature: PP-83 - Repository File Pre-Operation Plugin | Name, Accounting Period & Field Generation
  As an Operations User
  I want accelins_name, accelins_accounting_platform and other fields to be automatically generated from the submission region and next auto-number, and accounting period derivation logic
  So that repository files have consistent, unique identifiers and are assigned to a correct accounting period based on a predictable monthly cutoff date

  Background:
    Given I am logged in to Dynamics 365

  # ══════════════════════════════════════════════════════════════════════════
  # PREREQUISITE: Plugin runs when Create + Portal + region + worktype
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-UI-001 @p1 @smoke @positive @plugin-trigger
  Scenario: Pre-operation plugin runs when Create request has Portal, region and worktype
    Given a create request to Dataverse for accelins_repositoryfile
    And accelins_submission_source equals "Portal" (case as per implementation)
    And accelins_submission_region is present
    And accelins_worktype is present
    When the request is received
    Then the pre-operation plugin runs synchronously on the Create event
    And the record is created with plugin-generated fields
    And I take a screenshot as evidence

  @PP-83 @PP-83-UI-002 @p1 @positive @plugin-trigger @data-driven
  Scenario Outline: Plugin runs for valid Create with submission_region and worktype
    Given a create request to Dataverse for accelins_repositoryfile
    And accelins_submission_source equals "Portal"
    And accelins_submission_region is "<region>"
    And accelins_worktype is present
    When the request is received
    Then the pre-operation plugin runs synchronously on the Create event
    And accelins_name is set in format "<region>-<autonumber>" (e.g. EU-000123)
    And I take a screenshot as evidence

    Examples:
      | region |
      | EU     |
      | US     |
      | UK     |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE: Plugin does not run when conditions not met
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-UI-003 @p1 @negative @plugin-skip
  Scenario: Plugin exits without processing when submission_source is not Portal
    Given a create request to Dataverse for accelins_repositoryfile
    And accelins_submission_source is not "Portal"
    When the request is received
    Then the plugin exits without processing
    And the plugin does not modify the record
    And I take a screenshot as evidence

  @PP-83 @PP-83-UI-004 @p1 @negative @plugin-skip
  Scenario: Plugin exits without processing when submission_region is missing
    Given a create request to Dataverse for accelins_repositoryfile
    And accelins_submission_source equals "Portal"
    And accelins_submission_region is missing
    When the request is received
    Then the plugin exits without processing
    And the plugin does not modify the record
    And I take a screenshot as evidence

  @PP-83 @PP-83-UI-005 @p1 @negative @plugin-skip
  Scenario: Plugin exits without processing when worktype is missing
    Given a create request to Dataverse for accelins_repositoryfile
    And accelins_submission_source equals "Portal"
    And accelins_submission_region is present
    And accelins_worktype is missing
    When the request is received
    Then the plugin exits without processing
    And the plugin does not modify the record
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: accelins_name generation
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-UI-006 @p1 @positive @autonumber @accelins_name
  Scenario: Plugin retrieves next autonumber and sets accelins_name before record create
    Given a valid plugin execution for accelins_repositoryfile Create
    When the plugin runs
    Then it retrieves the next available auto-number from accelins_repository_autonumber
    And the plugin constructs accelins_name in the format "<accelins_submission_region>-<accelins_repository_autonumber>" (e.g. EU-000123)
    And accelins_name is set to this generated value before the record is created
    And I take a screenshot as evidence

  @PP-83 @PP-83-UI-007 @p1 @positive @autonumber @accelins_name
  Scenario: Repository file created has accelins_name in region-autonumber format
    Given a repository file was created via a valid plugin execution with submission_region "EU"
    When I navigate to the Repository File record
    Then the "Name" (accelins_name) field should display a value in format "EU-<number>" (e.g. EU-000123)
    And the value should be unique and consistent with autonumber sequence
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Accounting period derivation
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-UI-008 @p1 @positive @accounting-period @mec-vipr
  Scenario: File assigned to current accounting period when Current Date < VIPR Date of MEC period
    Given the first day of the current created date can be matched to reporting date of the Month end close period
    And Current Date is less than VIPR Date of the MEC period
    When a repository file is created via valid plugin execution
    Then the file is assigned to the current accounting period
    And accelins_accountingperiod reflects the current period
    And I take a screenshot as evidence

  @PP-83 @PP-83-UI-009 @p1 @positive @accounting-period @mec-vipr
  Scenario: File assigned to next accounting period when Accounting Base Date ≥ VIPR Date of MEC period
    Given the first day of the current created date can be matched to reporting date of the Month end close period
    And Accounting Base Date is greater than or equal to VIPR Date of the MEC period
    When a repository file is created via valid plugin execution
    Then the file is assigned to the next accounting period
    And accelins_accountingperiod reflects the next period
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA: Other plugin-set fields
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-UI-010 @p1 @positive @plugin-fields
  Scenario: Valid plugin execution sets assigned_to, first_receipt, right_first_time, accounting_platform, first_review_date
    Given a valid plugin execution for accelins_repositoryfile Create
    When the plugin runs
    Then it sets accelins_assigned_to to D365ServiceAccount
    And it sets accelins_first_receipt to true
    And it sets accelins_right_first_time to true
    And it sets accelins_accounting_platform to 100000000 (Dynamics)
    And it sets accelins_first_review_date to accelins_original_created_date
    And I take a screenshot as evidence

  @PP-83 @PP-83-UI-011 @p1 @positive @plugin-fields @ui-verify
  Scenario: Repository file created by plugin displays correct generated field values
    Given a repository file was created via a valid plugin execution
    When I navigate to the Repository File record
    Then the "Assigned To" field should display D365ServiceAccount
    And the "First Receipt" field should display true
    And the "Right First Time" field should display true
    And the "Accounting Platform" field should display Dynamics (100000000)
    And the "First Review Date" field should equal the original created date
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (optional – for environments where Repository File is editable)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-83 @PP-83-UI-012 @p2 @ui-data-creation
  Scenario: View Repository File record created by plugin
    Given I am logged in to Dynamics 365
    And a repository file was created by Snowflake integration with Portal submission
    When I navigate to the Repository File entity
    And I open the created Repository File record
    Then I should see the record with accelins_name, accelins_accountingperiod and other plugin-set fields populated
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Prerequisite: Plugin runs (UI-001, UI-002) / Plugin does not run (UI-003–005)
  # accelins_name: UI-006, UI-007
  # Accounting period: UI-008, UI-009
  # Other fields: UI-010, UI-011
  # ══════════════════════════════════════════════════════════════════════════
  # STEP DEFINITION NOTES
  # ══════════════════════════════════════════════════════════════════════════
  # May require steps for: create request to Dataverse, plugin runs / exits,
  # accelins_repository_autonumber retrieval, MEC/VIPR date comparison,
  # navigate to Repository File record.
  #
