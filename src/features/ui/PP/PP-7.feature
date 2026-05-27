# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-7 - (2) View Master–Underlying UMR Hierarchy
# Type: Story | Status: In QA | Priority: Highest
# Feature Type: view-hierarchy, master-agreement, cmt-umr, read-only
# Generated: 2026-01-29 (Based on JIRA PP-7 requirements and PP-6 context)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: View Master–Underlying UMR Hierarchy
# Primary Entity: Master Agreement (in Reference Data Management app)
# Related Entity: Contracts (CMT UMRs in CMT app)
#
# This story builds on PP-6, which creates Master Agreements and associates CMT UMRs.
# PP-7 focuses on viewing the hierarchy relationship (read-only).
#
# Master Agreement:
#   - Located in Reference Data Management app
#   - Has "Underlying Agreements" subgrid showing associated CMT UMRs
#   - Key fields to display: CMT UMR (Contract Reference), member, coverage summary, status
#
# CMT UMRs:
#   - CMT UMRs are Contracts in the CMT Power Apps application
#   - Contract Reference field in CMT is the CMT UMR identifier
#   - Can be associated to a Master Agreement (or not)
#   - When viewing a CMT UMR, should show if it's linked to a Master Agreement
#
# Test Requirements (2):
#   REQ-1: View from Master Agreement - see associated CMT UMRs with key fields
#     → Test Type: UI | Priority: p1
#   REQ-2: View from CMT UMR - see if associated to Master Agreement (or not)
#     → Test Type: UI | Priority: p2
#
# Key Business Rules:
#   - One Master Agreement can be linked to many underlying CMT UMRs
#   - CMT UMRs can exist without being associated to any Master Agreement
#   - Viewing is read-only (no editing in PP-7)
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-7 @highest @dynamics @d365 @view-hierarchy @master-agreement @cmt @read-only
Feature: PP-7 - (2) View Master–Underlying UMR Hierarchy
  As a Contract Administrator
  I want to view the master–underlying UMR hierarchy
  So that I can see which CMT UMRs are associated to a master Lloyd's agreement and understand the relationship structure

  Background:
    Given I am logged in to Dynamics 365

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-7 @PP-7-UI-001 @p1 @smoke @positive @view-from-master
  Scenario: Verify View Master Agreement with associated CMT UMRs
    Given I am logged in to Dynamics 365
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    And the Master Agreement has one or more underlying CMT UMRs associated
    When I navigate to the Reference Data Management app
    And I select "Master Agreements" from the left navigation pane
    And I open the Master Agreement record with Master Agreement UMR "MAM-000001"
    And I navigate to the "Underlying Agreements" subgrid or related records section
    Then I can see a list of all associated CMT UMRs
    And the list displays key fields for each CMT UMR:
      | Field Name        |
      | CMT UMR           |
      | Member            |
      | Coverage Summary  |
      | Status            |
    And I take a screenshot as evidence

  @PP-7 @PP-7-UI-002 @p1 @positive @view-from-master @multiple-umrs
  Scenario: Verify View Master Agreement with multiple associated CMT UMRs
    Given I am logged in to Dynamics 365
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    And the Master Agreement has multiple underlying CMT UMRs associated:
      | CMT UMR      |
      | IRV03LN2022  |
      | IRV01AN2021  |
    When I navigate to the Reference Data Management app
    And I select "Master Agreements" from the left navigation pane
    And I open the Master Agreement record with Master Agreement UMR "MAM-000001"
    And I navigate to the "Underlying Agreements" subgrid or related records section
    Then I can see all associated CMT UMRs in the list
    And I should see "IRV03LN2022" in the Underlying Agreements list
    And I should see "IRV01AN2021" in the Underlying Agreements list
    And the count of associated CMT UMRs should be 2
    And each CMT UMR displays its key fields (CMT UMR, member, coverage summary, status)
    And I take a screenshot as evidence

  @PP-7 @PP-7-UI-003 @p2 @positive @view-from-cmt-umr @associated
  Scenario: Verify View CMT UMR associated to Master Agreement
    Given I am logged in to Dynamics 365
    And I have an existing CMT UMR (Contract) with Contract Reference "IRV03LN2022"
    And the CMT UMR is associated to a master Lloyd's agreement "MAM-000001"
    When I navigate to the CMT app
    And I select "Contracts" from the left navigation pane
    And I open the Contract record with Contract Reference "IRV03LN2022"
    Then I can see that the CMT UMR is linked to a master Lloyd's agreement
    And the Master Agreement information is displayed (e.g., Master Agreement UMR or Master Agreement Master ID)
    And I take a screenshot as evidence

  @PP-7 @PP-7-UI-004 @p2 @positive @view-from-cmt-umr @not-associated
  Scenario: Verify View CMT UMR not associated to any Master Agreement
    Given I am logged in to Dynamics 365
    And I have an existing CMT UMR (Contract) with Contract Reference "IRV01AN2021"
    And the CMT UMR is not associated to any master Lloyd's agreement
    When I navigate to the CMT app
    And I select "Contracts" from the left navigation pane
    And I open the Contract record with Contract Reference "IRV01AN2021"
    Then I can see that no master Lloyd's agreement is linked
    And the Master Agreement field or section shows no association (blank or "None")
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ADDITIONAL VIEW SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-7 @PP-7-UI-005 @p2 @positive @view-from-master @empty-list
  Scenario: Verify View Master Agreement with no associated CMT UMRs
    Given I am logged in to Dynamics 365
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000002"
    And the Master Agreement has no underlying CMT UMRs associated
    When I navigate to the Reference Data Management app
    And I select "Master Agreements" from the left navigation pane
    And I open the Master Agreement record with Master Agreement UMR "MAM-000002"
    And I navigate to the "Underlying Agreements" subgrid or related records section
    Then the Underlying Agreements list should be empty or show "No records"
    And I take a screenshot as evidence

  @PP-7 @PP-7-UI-006 @p2 @positive @view-hierarchy-consistency
  Scenario: Verify Hierarchy consistency between Master Agreement and CMT UMR views
    Given I am logged in to Dynamics 365
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    And the Master Agreement has CMT UMR "IRV03LN2022" associated
    When I view the Master Agreement "MAM-000001" and see CMT UMR "IRV03LN2022" in the Underlying Agreements list
    And I view the CMT UMR "IRV03LN2022" and see it is linked to Master Agreement "MAM-000001"
    Then the relationship is consistent in both views
    And the Master Agreement UMR or Master Agreement Master ID displayed on the CMT UMR matches the Master Agreement viewed
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-7 @PP-7-UI-007 @p2 @negative @permissions
  Scenario: Verify Read-only user can view Master–Underlying UMR hierarchy
    Given I am logged in as a read-only user
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    And the Master Agreement has underlying CMT UMRs associated
    When I navigate to the Reference Data Management app
    And I select "Master Agreements" from the left navigation pane
    And I open the Master Agreement record with Master Agreement UMR "MAM-000001"
    And I navigate to the "Underlying Agreements" subgrid or related records section
    Then I can see the list of associated CMT UMRs
    And the Edit button should not be visible (view-only mode)
    And I take a screenshot as evidence
