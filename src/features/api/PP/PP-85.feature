# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-85 - Portal Written Records in OW Repository File | Tabs, Fields & Automated Processes
# Type: Story | Status: In QA | Priority: High
# Feature Type: portal-written, repository-file, tabs, mandatory-fields, automated-processes
# Updated: 2026-02-16 (From JIRA description - Operations User, Portal Written record type)
# Confluence: https://accelins.atlassian.net/wiki/x/T4DKrw
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: For record type "Portal Written" in the OW Repository File, tabs,
#           field rules, and automated processes behave consistently.
# Primary Entity: OW Repository File (record type = "Portal Written")
# Entity Set: Use the appropriate entity set for OW Repository File (e.g.
#             accelins_repositoryfiles or as per solution).
#
# Tabs: Visible = General, Submission Approval, Accounting, Internal Contacts,
#       Related Work Items, Related. Hidden = Processing Metrics, Timeline,
#       Bordereau Sheets.
# General – Processing: Item Assigned to, Original Created Date, First
#   Receipt?, Right First Time? mandatory; Work Item Status, First Review Date,
#   Clone for exposure optional.
# General – Submission: MGA Name, Insurer, Insurer Organisation Name,
#   Production Period, Accounting Period mandatory; Contract, Bordereau Name,
#   Accounting Platform mandatory when status "VIPR Complete".
# General – Financial: GWP Amount, Commission Amount, Original Currency
#   mandatory; EU-only visibility/mandatory for EUR and Tax/Brokerage fields.
# Original Submission: Sharepoint URL, File Name, Sender optional, read-only.
# Submission Approval: Sign-off editable when Awaiting Submission Approval;
#   Signed-off by/on locked; Rollback? optional; Rolled back By, Fresh service
#   link mandatory when Rollback? = Yes.
# Automated: SharePoint sync skipped; Approval, Rollback, Clone for Exposure,
#   Accounting, Month end close, Ownership run; Tagging/Bordereau Sheets
#   Process not available; Bordereau validation not run when VIPR Complete.
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-85 @high @dynamics @d365 @portal-written @repository-file @ow-repository
Feature: API - PP-85 - Portal Written Records in OW Repository File | Tabs, Fields & Automated Processes

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # ENTITY AND RECORD TYPE
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-API-001 @p1 @smoke @field-exists
  Scenario: API - Verify OW Repository File entity has record type and Portal Written value
    When I call the Dynamics API to describe the OW Repository File entity
    Then the entity should support record type or type classification
    And "Portal Written" should be a valid record type value for the entity

  @PP-85 @PP-85-API-002 @p1 @positive @api-query
  Scenario: API - Query Repository File records filtered by type Portal Written
    When I query the OW Repository File entity where record type equals "Portal Written"
    Then the API should return status code 200
    And the response should contain records with type "Portal Written"
    And each record should have the expected entity structure for Portal Written

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL TAB FIELDS – Processing Details (mandatory)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-API-003 @p1 @field-exists
  Scenario: API - Verify Processing Details mandatory fields exist on entity
    When I call the Dynamics API to describe the OW Repository File entity
    Then the following fields should exist for Processing Details:
      | Field API Name / Logical Name     |
      | accelins_assigned_to             |
      | accelins_original_created_date   |
      | accelins_first_receipt           |
      | accelins_right_first_time        |

  @PP-85 @PP-85-API-004 @p2 @api-create @negative
  Scenario: API - Create Portal Written record without mandatory Processing Details fails or validates
    When I create a Portal Written Repository File record via API without Item Assigned to, Original Created Date, First Receipt, Right First Time
    Then the API should return an error status code 400 or the record should enforce mandatory validation
    And the error or validation should mention the required Processing Details fields

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL TAB FIELDS – Submission Details (mandatory, conditional)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-API-005 @p1 @field-exists
  Scenario: API - Verify Submission Details fields exist (MGA Name, Insurer, etc.)
    When I call the Dynamics API to describe the OW Repository File entity
    Then the following fields should exist:
      | Field API Name / Logical Name        |
      | accelins_mga_name                    |
      | accelins_insurer                     |
      | accelins_insurer_organisation_name   |
      | accelins_production_period          |
      | accelins_accountingperiod           |
      | accelins_contract                   |
      | accelins_bordereau_name             |
      | accelins_accounting_platform        |

  @PP-85 @PP-85-API-006 @p2 @api-query
  Scenario: API - Query Portal Written record and verify Submission Details fields present
    Given I have a Repository File record with type "Portal Written"
    When I query the record by ID via API
    Then the response should contain accelins_mga_name, accelins_insurer, accelins_insurer_organisation_name
    And the response should contain accelins_production_period, accelins_accountingperiod
    And when status is VIPR Complete, accelins_contract, accelins_bordereau_name, accelins_accounting_platform should be populated or required

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL TAB FIELDS – Financial Details
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-API-007 @p1 @field-exists
  Scenario: API - Verify Financial Details fields exist (GWP Amount, Commission Amount, Original Currency, EUR and Tax/Brokerage for EU)
    When I call the Dynamics API to describe the OW Repository File entity
    Then the following fields should exist:
      | Field API Name / Logical Name           |
      | accelins_gwp_amount                      |
      | accelins_commission_amount_decimal       |
      | accelins_original_currency               |
      | accelins_gwp_eur                         |
      | accelins_brokerage_eur                   |
      | accelins_commission_eur                  |
      | accelins_tax_eur                         |
      | accelins_tax_amount_payable_decimal      |
      | accelins_brokerage_amount_decimal        |

  # ══════════════════════════════════════════════════════════════════════════
  # SUBMISSION APPROVAL TAB FIELDS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-API-008 @p1 @field-exists
  Scenario: API - Verify Submission Approval fields exist (Sign-off status, Signed-off by/on, Rollback?, Rolled back By, Fresh service link)
    When I call the Dynamics API to describe the OW Repository File entity
    Then the following fields should exist:
      | Field API Name / Logical Name   |
      | accelins_signoff_status         |
      | accelins_signedoff_by           |
      | accelins_signedoff_on           |
      | accelins_rollback               |
      | accelins_rolled_back_by         |
      | accelins_fresh_service_link     |

  @PP-85 @PP-85-API-009 @p2 @positive @api-update
  Scenario: API - Sign-off status can be updated when Work Item Status is Awaiting Submission Approval
    Given I have a Repository File record with type "Portal Written"
    And the record Work Item Status is "Awaiting Submission Approval"
    When I update the Sign-off status field via API
    Then the API should return status code 204
    And the Sign-off status should be updated

  @PP-85 @PP-85-API-010 @p2 @positive @rollback
  Scenario: API - When Rollback? = Yes, Rolled back By and Fresh service link are required
    Given I have a Repository File record with type "Portal Written"
    When I update the record to set Rollback? to Yes via API without setting Rolled back By and Fresh service link
    Then the API should return an error or validation should require Rolled back By and Fresh service link
    When I set Rolled back By and Fresh service link and set Rollback? to Yes
    Then the API should return status code 204

  # ══════════════════════════════════════════════════════════════════════════
  # AUTOMATED PROCESSES (API-observable behaviour)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-85 @PP-85-API-011 @p2 @positive @automated
  Scenario: API - Portal Written record has correct state after Approval workflow
    Given I have a Repository File record with type "Portal Written"
    When the Approval workflow has executed successfully for the record
    And I query the record by ID via API
    Then the response should reflect the post-approval state (e.g. Sign-off status, Signed-off by, Signed-off on)
    And Signed-off by and Signed-off on should be system-controlled (populated by workflow)

  @PP-85 @PP-85-API-012 @p2 @positive @automated
  Scenario: API - Portal Written record has correct state after Rollback process
    Given I have a Repository File record with type "Portal Written"
    When the Rollback process has executed successfully for the record
    And I query the record by ID via API
    Then the response should contain updated Rollback-related fields (Rolled back By, Fresh service link when Rollback? = Yes)

  @PP-85 @PP-85-API-013 @p2 @positive @automated
  Scenario: API - Portal Written record can be queried after Month end close and Ownership assignment
    Given I have a Repository File record with type "Portal Written"
    When the Month end close process and Ownership assignment have run successfully
    And I query the record by ID via API
    Then the API should return status code 200
    And the record should exist with expected ownership and accounting-related fields

  # ══════════════════════════════════════════════════════════════════════════
  # COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Entity/record type (API-001, API-002), Processing/Submission/Financial/Approval
  # fields (API-003–010), Automated process outcomes (API-011–013)
  # ══════════════════════════════════════════════════════════════════════════
  # STEP DEFINITION NOTES: Replace "OW Repository File entity" with actual
  # entity set name. Field API names may differ; align with Dataverse schema.
  #
