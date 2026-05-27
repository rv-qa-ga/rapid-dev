# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-9 - (4) Governance and Mandatory Linkage for Lloyd's Deals
# Type: Story | Status: To Do | Priority: Highest
# Feature Type: governance, mandatory-linkage, validation-rule, audit-trail, data-quality
# Generated: 2026-01-29 (Based on JIRA PP-9 requirements and PP-6/PP-7 context)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Governance and Mandatory Linkage for Lloyd's Deals
# Primary Entity: Contract (CMT UMR in CMT app)
# Related Entity: Master Agreement (in Reference Data Management app)
#
# This story builds on PP-6 (create Master Agreements) and PP-7 (view hierarchy).
# PP-9 focuses on governance rules and mandatory linkage validation.
#
# Key Business Rules:
#   - CMT UMRs identified as Lloyd's business MUST be linked to a Master Agreement
#   - Non-Lloyd's CMT UMRs can exist without Master Agreement linkage
#   - All linkage changes must be audited (who, when, old vs new values)
#   - Data quality check to identify unlinked Lloyd's UMRs
#
# Test Requirements (4):
#   REQ-1: Mandatory linkage for designated Lloyd's contracts
#     → Test Type: UI | Priority: p1
#   REQ-2: Exceptions allowed for non-Lloyd's business
#     → Test Type: UI | Priority: p1
#   REQ-3: Audit of linkage changes
#     → Test Type: UI | Priority: p2
#   REQ-4: Identification of unlinked Lloyd's UMRs
#     → Test Type: UI | Priority: p2
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-9 @highest @dynamics @d365 @governance @mandatory-linkage @validation-rule @audit-trail @data-quality
Feature: PP-9 - (4) Governance and Mandatory Linkage for Lloyd's Deals
  As a Product / Data Owner
  I want clear rules around when a CMT UMR must be linked to a master Lloyd's agreement
  So that Lloyd's and binder structures are represented consistently

  Background:
    Given I am logged in to Dynamics 365

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-1: Mandatory linkage for designated Lloyd's contracts
  # ══════════════════════════════════════════════════════════════════════════

  @PP-9 @PP-9-UI-001 @p1 @smoke @positive @mandatory-linkage @lloyds-contract
  Scenario: Verify CMT UMR for Lloyd's contract must be linked to existing Master Agreement
    Given I am logged in to Dynamics 365
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I click New to create a CMT UMR (Contract)
    And I fill in required Contract fields
    And I set the Contract as part of a Lloyd's arrangement (flag/field indicating Lloyd's business)
    And I attempt to save the Contract without linking to a Master Agreement
    Then the system must prevent saving and display a validation error
    And the error message must indicate that a Master Agreement link is required
    When I link the CMT UMR to the existing Master Agreement "MAM-000001"
    And I save the Contract
    Then the Contract should be saved successfully
    And the CMT UMR should be linked to Master Agreement "MAM-000001"
    And I take a screenshot as evidence

  @PP-9 @PP-9-UI-002 @p1 @positive @mandatory-linkage @create-master-agreement
  Scenario: Verify CMT UMR for Lloyd's contract requires creation of new Master Agreement if none exists
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I click New to create a CMT UMR (Contract)
    And I fill in required Contract fields
    And I set the Contract as part of a Lloyd's arrangement (flag/field indicating Lloyd's business)
    And I attempt to save the Contract without linking to a Master Agreement
    Then the system must prevent saving and display a validation error
    And the error message must indicate that a Master Agreement link is required
    And the system must provide an option to create a new Master Agreement
    When I choose to create a new Master Agreement
    And I create a new Master Agreement with required fields
    And I link the CMT UMR to the newly created Master Agreement
    And I save the Contract
    Then the Contract should be saved successfully
    And the CMT UMR should be linked to the newly created Master Agreement
    And I take a screenshot as evidence

  @PP-9 @PP-9-UI-003 @p1 @positive @mandatory-linkage @validation-enforcement
  Scenario: Verify system enforces mandatory linkage before allowing save for Lloyd's contracts
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I click New to create a CMT UMR (Contract)
    And I fill in all required Contract fields
    And I set the Contract as part of a Lloyd's arrangement
    And I leave the Master Agreement link field empty
    And I click Save
    Then the system must prevent saving
    And I must see a validation error message
    And the error message must clearly state that Master Agreement linkage is required for Lloyd's contracts
    And the Master Agreement link field should be highlighted or marked as required
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-2: Exceptions allowed for non-Lloyd's business
  # ══════════════════════════════════════════════════════════════════════════

  @PP-9 @PP-9-UI-004 @p1 @smoke @positive @non-lloyds @optional-linkage
  Scenario: Verify non-Lloyd's CMT UMR can exist without Master Agreement link
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I click New to create a CMT UMR (Contract)
    And I fill in required Contract fields
    And I set the Contract as non-Lloyd's / non-grouped business (flag/field indicating non-Lloyd's)
    And I leave the Master Agreement link field empty
    And I save the Contract
    Then the Contract should be saved successfully
    And the CMT UMR should exist without a Master Agreement link
    And no validation error should be displayed
    And I take a screenshot as evidence

  @PP-9 @PP-9-UI-005 @p1 @positive @non-lloyds @optional-linkage
  Scenario: Verify non-Lloyd's CMT UMR can optionally be linked to Master Agreement
    Given I am logged in to Dynamics 365
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I click New to create a CMT UMR (Contract)
    And I fill in required Contract fields
    And I set the Contract as non-Lloyd's / non-grouped business
    And I optionally link the CMT UMR to Master Agreement "MAM-000001"
    And I save the Contract
    Then the Contract should be saved successfully
    And the CMT UMR should be linked to Master Agreement "MAM-000001" (optional link)
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-3: Audit of linkage changes
  # ══════════════════════════════════════════════════════════════════════════

  @PP-9 @PP-9-UI-006 @p2 @positive @audit-trail @linkage-change
  Scenario: Verify audit trail captures Master Agreement link addition
    Given I am logged in to Dynamics 365
    And I have an existing CMT UMR (Contract) with Contract Reference "IRV01AN2021"
    And the CMT UMR is not linked to any Master Agreement
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    When I navigate to the CMT app
    And I open the CMT UMR "IRV01AN2021"
    And I link the CMT UMR to Master Agreement "MAM-000001"
    And I save the Contract
    Then the Contract should be saved successfully
    When I view the audit trail or change history for the CMT UMR
    Then the audit trail must show:
      | Field              | Value                                    |
      | Changed By         | Current user who made the change         |
      | Changed On         | Timestamp when the change was made       |
      | Field Changed      | Master Agreement link field              |
      | Old Value          | None or empty                            |
      | New Value          | Master Agreement "MAM-000001" reference |
    And I take a screenshot as evidence

  @PP-9 @PP-9-UI-007 @p2 @positive @audit-trail @linkage-removal
  Scenario: Verify audit trail captures Master Agreement link removal
    Given I am logged in to Dynamics 365
    And I have an existing CMT UMR (Contract) with Contract Reference "IRV03LN2022"
    And the CMT UMR is linked to Master Agreement "MAM-000001"
    When I navigate to the CMT app
    And I open the CMT UMR "IRV03LN2022"
    And I remove the link to Master Agreement "MAM-000001"
    And I save the Contract
    Then the Contract should be saved successfully
    When I view the audit trail or change history for the CMT UMR
    Then the audit trail must show:
      | Field              | Value                                    |
      | Changed By         | Current user who made the change         |
      | Changed On         | Timestamp when the change was made       |
      | Field Changed      | Master Agreement link field              |
      | Old Value          | Master Agreement "MAM-000001" reference   |
      | New Value          | None or empty                            |
    And I take a screenshot as evidence

  @PP-9 @PP-9-UI-008 @p2 @positive @audit-trail @linkage-change
  Scenario: Verify audit trail captures Master Agreement link change
    Given I am logged in to Dynamics 365
    And I have an existing CMT UMR (Contract) with Contract Reference "IRV03LN2022"
    And the CMT UMR is linked to Master Agreement "MAM-000001"
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000002"
    When I navigate to the CMT app
    And I open the CMT UMR "IRV03LN2022"
    And I change the Master Agreement link from "MAM-000001" to "MAM-000002"
    And I save the Contract
    Then the Contract should be saved successfully
    When I view the audit trail or change history for the CMT UMR
    Then the audit trail must show:
      | Field              | Value                                    |
      | Changed By         | Current user who made the change         |
      | Changed On         | Timestamp when the change was made       |
      | Field Changed      | Master Agreement link field              |
      | Old Value          | Master Agreement "MAM-000001" reference  |
      | New Value          | Master Agreement "MAM-000002" reference  |
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-4: Identification of unlinked Lloyd's UMRs
  # ══════════════════════════════════════════════════════════════════════════

  @PP-9 @PP-9-UI-009 @p2 @positive @data-quality @unlinked-umrs
  Scenario: Verify data quality check shows list of unlinked Lloyd's CMT UMRs
    Given I am logged in to Dynamics 365
    And I have multiple CMT UMRs (Contracts) flagged as Lloyd's business:
      | Contract Reference | Master Agreement Link |
      | IRV03LN2022        | MAM-000001            |
      | IRV01AN2021        | None                  |
      | IRV04LN2023        | None                  |
      | IRV02AN2022        | MAM-000002            |
    When I navigate to the data quality check or report for Master Agreement linkage
    And I run the data quality check for Lloyd's CMT UMRs
    Then I must be able to see a list of Lloyd's CMT UMRs that are not associated to any master agreement
    And the list should include:
      | Contract Reference |
      | IRV01AN2021         |
      | IRV04LN2023         |
    And the list should NOT include CMT UMRs that are linked (IRV03LN2022, IRV02AN2022)
    And I take a screenshot as evidence

  @PP-9 @PP-9-UI-010 @p2 @positive @data-quality @bulk-edit
  Scenario: Verify data quality check allows bulk edit of unlinked Lloyd's UMRs
    Given I am logged in to Dynamics 365
    And I have multiple CMT UMRs (Contracts) flagged as Lloyd's business that are not linked
    When I navigate to the data quality check for Master Agreement linkage
    And I run the data quality check for Lloyd's CMT UMRs
    And I see a list of unlinked Lloyd's CMT UMRs
    Then I should be able to select multiple unlinked CMT UMRs from the list
    And I should be able to bulk edit the Master Agreement link for selected CMT UMRs
    And I take a screenshot as evidence

  @PP-9 @PP-9-UI-011 @p2 @positive @data-quality @filtering
  Scenario: Verify data quality check filters only Lloyd's business CMT UMRs
    Given I am logged in to Dynamics 365
    And I have CMT UMRs with different business types:
      | Contract Reference | Business Type    | Master Agreement Link |
      | IRV03LN2022        | Lloyd's          | None                  |
      | IRV01AN2021        | Lloyd's          | MAM-000001            |
      | IRV05LN2024        | Non-Lloyd's      | None                  |
      | IRV06AN2023        | Non-Lloyd's      | None                  |
    When I navigate to the data quality check for Master Agreement linkage
    And I run the data quality check for Lloyd's CMT UMRs
    Then the list should only show Lloyd's CMT UMRs that are not linked
    And the list should include "IRV03LN2022" (Lloyd's, unlinked)
    And the list should NOT include:
      | Contract Reference | Reason                                    |
      | IRV01AN2021        | Already linked to Master Agreement         |
      | IRV05LN2024        | Not Lloyd's business                       |
      | IRV06AN2023        | Not Lloyd's business                       |
    And I take a screenshot as evidence
