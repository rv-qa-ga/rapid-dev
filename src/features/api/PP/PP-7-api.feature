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
# Primary Entity: Master Agreement (accelins_masteragreements entity set)
# Related Entity: Contracts (CMT UMRs - contracts entity set in CMT)
#
# This story builds on PP-6, which creates Master Agreements and associates CMT UMRs.
# PP-7 focuses on viewing the hierarchy relationship via API (read-only).
#
# Master Agreement Fields:
#   - accelins_masteragreementumr (Master Agreement UMR - user-entered text)
#   - accelins_masteragreementmasterid (Master Agreement Master ID - system-generated)
#   - accelins_description (Description - text field)
#   - accelins_masteragreementstartdate (Master Agreement Start Date)
#   - accelins_masteragreementenddate (Master Agreement End Date)
#   - statecode (Status - mirrors Member status)
#   - statuscode (Status Reason - mirrors Member)
#
# CMT UMRs:
#   - CMT UMRs are Contracts in the CMT application
#   - Contract Reference field (accelins_contractreference) is the CMT UMR identifier
#   - Relationship field to Master Agreement (likely accelins_masteragreement or similar)
#
# Test Requirements (2):
#   REQ-1: Query Master Agreement and retrieve associated CMT UMRs with key fields
#     → Test Type: API | Priority: p1
#   REQ-2: Query CMT UMR and verify association to Master Agreement (or lack thereof)
#     → Test Type: API | Priority: p2
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-7 @highest @dynamics @d365 @view-hierarchy @master-agreement @cmt @read-only
Feature: API - PP-7 - (2) View Master–Underlying UMR Hierarchy

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-7 @PP-7-API-001 @p1 @smoke @positive @api-query @view-from-master
  Scenario: API - Verify Query Master Agreement and retrieve associated CMT UMRs
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-001"
    And the Master Agreement has one or more underlying CMT UMRs associated
    When I query Dynamics records via API:
      | entitySet        | filter                                    | expand                    |
      | accelins_masteragreements | accelins_masteragreementumr eq 'MAM-API-001' | accelins_underlyingagreements |
    Then the API should return status code 200
    And the response should contain the Master Agreement record
    And the response should contain associated CMT UMRs in the expanded relationship
    And each associated CMT UMR should contain key fields:
      | Field Name                    |
      | accelins_contractreference    |
      | accelins_member                |
      | accelins_coveragesummary       |
      | statecode                      |

  @PP-7 @PP-7-API-002 @p1 @positive @api-query @multiple-umrs
  Scenario: API - Verify Query Master Agreement with multiple associated CMT UMRs
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-002"
    And the Master Agreement has multiple underlying CMT UMRs associated:
      | CMT UMR      |
      | IRV03LN2022  |
      | IRV01AN2021  |
    When I query Dynamics records via API:
      | entitySet        | filter                                    | expand                    |
      | accelins_masteragreements | accelins_masteragreementumr eq 'MAM-API-002' | accelins_underlyingagreements |
    Then the API should return status code 200
    And the response should contain the Master Agreement record
    And the response should contain multiple associated CMT UMRs
    And the count of associated CMT UMRs should be 2
    And the response should contain CMT UMR with Contract Reference "IRV03LN2022"
    And the response should contain CMT UMR with Contract Reference "IRV01AN2021"

  @PP-7 @PP-7-API-003 @p2 @positive @api-query @view-from-cmt-umr @associated
  Scenario: API - Verify Query CMT UMR associated to Master Agreement
    Given I have an existing CMT UMR (Contract) with Contract Reference "IRV03LN2022"
    And the CMT UMR is associated to a master Lloyd's agreement "MAM-API-001"
    When I query Dynamics records via API:
      | entitySet | filter                                    | expand                    |
      | contracts | accelins_contractreference eq 'IRV03LN2022' | accelins_masteragreement |
    Then the API should return status code 200
    And the response should contain the CMT UMR record
    And the response should contain the associated Master Agreement in the expanded relationship
    And the Master Agreement should have Master Agreement UMR "MAM-API-001" or Master Agreement Master ID matching the association

  @PP-7 @PP-7-API-004 @p2 @positive @api-query @view-from-cmt-umr @not-associated
  Scenario: API - Verify Query CMT UMR not associated to any Master Agreement
    Given I have an existing CMT UMR (Contract) with Contract Reference "IRV01AN2021"
    And the CMT UMR is not associated to any master Lloyd's agreement
    When I query Dynamics records via API:
      | entitySet | filter                                    | expand                    |
      | contracts | accelins_contractreference eq 'IRV01AN2021' | accelins_masteragreement |
    Then the API should return status code 200
    And the response should contain the CMT UMR record
    And the expanded Master Agreement relationship should be null or empty
    And the Master Agreement field (accelins_masteragreement) should be null

  # ══════════════════════════════════════════════════════════════════════════
  # ADDITIONAL API QUERY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-7 @PP-7-API-005 @p2 @positive @api-query @empty-list
  Scenario: API - Verify Query Master Agreement with no associated CMT UMRs
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-003"
    And the Master Agreement has no underlying CMT UMRs associated
    When I query Dynamics records via API:
      | entitySet        | filter                                    | expand                    |
      | accelins_masteragreements | accelins_masteragreementumr eq 'MAM-API-003' | accelins_underlyingagreements |
    Then the API should return status code 200
    And the response should contain the Master Agreement record
    And the expanded Underlying Agreements relationship should be empty or null
    And the count of associated CMT UMRs should be 0

  @PP-7 @PP-7-API-006 @p2 @positive @api-query @hierarchy-consistency
  Scenario: API - Verify Hierarchy consistency between Master Agreement and CMT UMR queries
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-004"
    And the Master Agreement has CMT UMR "IRV03LN2022" associated
    When I query the Master Agreement "MAM-API-004" and retrieve associated CMT UMRs
    And I query the CMT UMR "IRV03LN2022" and retrieve its Master Agreement association
    Then the relationship is consistent in both queries
    And the Master Agreement UMR from the CMT UMR query matches "MAM-API-004"
    And the CMT UMR Contract Reference from the Master Agreement query matches "IRV03LN2022"

  @PP-7 @PP-7-API-007 @p2 @positive @api-query @filter-by-master
  Scenario: API - Verify Query all CMT UMRs associated to a specific Master Agreement
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-005"
    And the Master Agreement has multiple underlying CMT UMRs associated
    When I query Dynamics records via API:
      | entitySet | filter                                                      |
      | contracts | accelins_masteragreement/accelins_masteragreementumr eq 'MAM-API-005' |
    Then the API should return status code 200
    And the response should contain only CMT UMRs associated to Master Agreement "MAM-API-005"
    And all returned CMT UMRs should have the Master Agreement relationship populated
