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
# Primary Entity: Contract (CMT UMR - accelins_contracts entity set)
# Related Entity: Master Agreement (accelins_masteragreements entity set)
#
# This story builds on PP-6 (create Master Agreements) and PP-7 (view hierarchy).
# PP-9 focuses on governance rules and mandatory linkage validation via API.
#
# Key Business Rules:
#   - CMT UMRs identified as Lloyd's business MUST be linked to a Master Agreement
#   - Non-Lloyd's CMT UMRs can exist without Master Agreement linkage
#   - All linkage changes must be audited (who, when, old vs new values)
#   - Data quality check to identify unlinked Lloyd's UMRs
#
# Test Requirements (4):
#   REQ-1: Mandatory linkage for designated Lloyd's contracts via API
#     → Test Type: API | Priority: p1
#   REQ-2: Exceptions allowed for non-Lloyd's business via API
#     → Test Type: API | Priority: p1
#   REQ-3: Audit of linkage changes via API
#     → Test Type: API | Priority: p2
#   REQ-4: Identification of unlinked Lloyd's UMRs via API query
#     → Test Type: API | Priority: p2
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-9 @highest @dynamics @d365 @governance @mandatory-linkage @validation-rule @audit-trail @data-quality
Feature: API - PP-9 - (4) Governance and Mandatory Linkage for Lloyd's Deals

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-1: Mandatory linkage for designated Lloyd's contracts
  # ══════════════════════════════════════════════════════════════════════════

  @PP-9 @PP-9-API-001 @p1 @smoke @positive @api-create @mandatory-linkage @validation-error
  Scenario: API - Verify creating Lloyd's CMT UMR without Master Agreement link returns validation error
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-001"
    When I attempt to create a Dynamics record in entity set "accelins_contracts" with data:
      | field                                    | value                      |
      | accelins_contractreference                | IRV-API-LLOYDS-001        |
      | accelins_lloydsbusiness                   | true                      |
      | accelins_masteragreement                  | (empty/null)               |
    Then the API should return status code 400 or 422
    And the error response should indicate that Master Agreement link is required for Lloyd's contracts
    And the error message should clearly state the validation requirement

  @PP-9 @PP-9-API-002 @p1 @positive @api-create @mandatory-linkage @linked-to-existing
  Scenario: API - Verify creating Lloyd's CMT UMR with existing Master Agreement link succeeds
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-002"
    And I have the Master Agreement ID from the created record
    When I create a Dynamics record in entity set "accelins_contracts" with data:
      | field                                    | value                      |
      | accelins_contractreference                | IRV-API-LLOYDS-002        |
      | accelins_lloydsbusiness                   | true                      |
      | accelins_masteragreement                  | <Master Agreement ID>      |
    Then the API should return status code 201
    And the response should contain the new Contract ID
    And the created Contract should have accelins_masteragreement populated with the Master Agreement ID
    And I should be able to query the Contract and verify the Master Agreement link

  @PP-9 @PP-9-API-003 @p1 @positive @api-create @mandatory-linkage @validation-enforcement
  Scenario: API - Verify system enforces mandatory linkage for Lloyd's contracts
    When I attempt to create a Dynamics record in entity set "accelins_contracts" with data:
      | field                                    | value                      |
      | accelins_contractreference                | IRV-API-LLOYDS-003        |
      | accelins_lloydsbusiness                   | true                      |
      | accelins_masteragreement                  | (omitted)                  |
    Then the API should return status code 400 or 422
    And the error response should contain validation error details
    And the error should specify that Master Agreement link is required when accelins_lloydsbusiness is true

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-2: Exceptions allowed for non-Lloyd's business
  # ══════════════════════════════════════════════════════════════════════════

  @PP-9 @PP-9-API-004 @p1 @smoke @positive @api-create @non-lloyds @optional-linkage
  Scenario: API - Verify creating non-Lloyd's CMT UMR without Master Agreement link succeeds
    When I create a Dynamics record in entity set "accelins_contracts" with data:
      | field                                    | value                      |
      | accelins_contractreference                | IRV-API-NONLLOYDS-001     |
      | accelins_lloydsbusiness                   | false                     |
      | accelins_masteragreement                  | (empty/null)               |
    Then the API should return status code 201
    And the response should contain the new Contract ID
    And the created Contract should have accelins_masteragreement as null or empty
    And I should be able to query the Contract and verify no Master Agreement link exists

  @PP-9 @PP-9-API-005 @p1 @positive @api-create @non-lloyds @optional-linkage
  Scenario: API - Verify non-Lloyd's CMT UMR can optionally be linked to Master Agreement
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-003"
    And I have the Master Agreement ID from the created record
    When I create a Dynamics record in entity set "accelins_contracts" with data:
      | field                                    | value                      |
      | accelins_contractreference                | IRV-API-NONLLOYDS-002     |
      | accelins_lloydsbusiness                   | false                     |
      | accelins_masteragreement                  | <Master Agreement ID>      |
    Then the API should return status code 201
    And the response should contain the new Contract ID
    And the created Contract should have accelins_masteragreement populated (optional link)
    And I should be able to query the Contract and verify the Master Agreement link exists

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-3: Audit of linkage changes
  # ══════════════════════════════════════════════════════════════════════════

  @PP-9 @PP-9-API-006 @p2 @positive @api-update @audit-trail @linkage-addition
  Scenario: API - Verify audit trail captures Master Agreement link addition
    Given I have created a Dynamics record in entity set "accelins_contracts" with Contract Reference "IRV-API-AUDIT-001"
    And the Contract has accelins_lloydsbusiness set to true
    And the Contract has accelins_masteragreement set to null
    And I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-004"
    And I have the Master Agreement ID from the created record
    When I update the Contract to set accelins_masteragreement to the Master Agreement ID via API
    Then the API should return status code 204 or 200
    When I query the audit trail or change history for the Contract via API
    Then the audit trail response should contain:
      | Field              | Value                                    |
      | ChangedBy          | User who made the change                 |
      | ChangedOn          | Timestamp when the change was made       |
      | FieldChanged       | accelins_masteragreement                 |
      | OldValue           | null or empty                            |
      | NewValue           | Master Agreement ID reference            |

  @PP-9 @PP-9-API-007 @p2 @positive @api-update @audit-trail @linkage-removal
  Scenario: API - Verify audit trail captures Master Agreement link removal
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with Master Agreement UMR "MAM-API-005"
    And I have the Master Agreement ID from the created record
    And I have created a Dynamics record in entity set "accelins_contracts" with Contract Reference "IRV-API-AUDIT-002"
    And the Contract has accelins_masteragreement set to the Master Agreement ID
    When I update the Contract to set accelins_masteragreement to null via API
    Then the API should return status code 204 or 200
    When I query the audit trail or change history for the Contract via API
    Then the audit trail response should contain:
      | Field              | Value                                    |
      | ChangedBy          | User who made the change                 |
      | ChangedOn          | Timestamp when the change was made       |
      | FieldChanged       | accelins_masteragreement                 |
      | OldValue           | Master Agreement ID reference            |
      | NewValue           | null or empty                            |

  @PP-9 @PP-9-API-008 @p2 @positive @api-update @audit-trail @linkage-change
  Scenario: API - Verify audit trail captures Master Agreement link change
    Given I have created Dynamics records in entity set "accelins_masteragreements":
      | Master Agreement UMR |
      | MAM-API-006           |
      | MAM-API-007           |
    And I have the Master Agreement IDs from the created records
    And I have created a Dynamics record in entity set "accelins_contracts" with Contract Reference "IRV-API-AUDIT-003"
    And the Contract has accelins_masteragreement set to the first Master Agreement ID
    When I update the Contract to change accelins_masteragreement from first Master Agreement ID to second Master Agreement ID via API
    Then the API should return status code 204 or 200
    When I query the audit trail or change history for the Contract via API
    Then the audit trail response should contain:
      | Field              | Value                                    |
      | ChangedBy          | User who made the change                 |
      | ChangedOn          | Timestamp when the change was made       |
      | FieldChanged       | accelins_masteragreement                 |
      | OldValue           | First Master Agreement ID reference      |
      | NewValue           | Second Master Agreement ID reference    |

  # ══════════════════════════════════════════════════════════════════════════
  # REQ-4: Identification of unlinked Lloyd's UMRs
  # ══════════════════════════════════════════════════════════════════════════

  @PP-9 @PP-9-API-009 @p2 @positive @api-query @data-quality @unlinked-umrs
  Scenario: API - Verify query returns list of unlinked Lloyd's CMT UMRs
    Given I have created Dynamics records in entity set "accelins_contracts":
      | Contract Reference      | accelins_lloydsbusiness | accelins_masteragreement |
      | IRV-API-QUERY-001       | true                    | <Master Agreement ID>   |
      | IRV-API-QUERY-002       | true                    | null                     |
      | IRV-API-QUERY-003       | true                    | null                     |
      | IRV-API-QUERY-004       | false                   | null                     |
    When I query Dynamics records via API:
      | entitySet        | filter                                                                              |
      | accelins_contracts | accelins_lloydsbusiness eq true and accelins_masteragreement eq null |
    Then the API should return status code 200
    And the response should contain only CMT UMRs where accelins_lloydsbusiness is true and accelins_masteragreement is null
    And the response should include Contract Reference "IRV-API-QUERY-002"
    And the response should include Contract Reference "IRV-API-QUERY-003"
    And the response should NOT include Contract Reference "IRV-API-QUERY-001" (linked)
    And the response should NOT include Contract Reference "IRV-API-QUERY-004" (non-Lloyd's)

  @PP-9 @PP-9-API-010 @p2 @positive @api-query @data-quality @filtering
  Scenario: API - Verify data quality query filters only Lloyd's business CMT UMRs
    Given I have created Dynamics records in entity set "accelins_contracts":
      | Contract Reference      | accelins_lloydsbusiness | accelins_masteragreement |
      | IRV-API-FILTER-001      | true                    | null                     |
      | IRV-API-FILTER-002      | true                    | <Master Agreement ID>   |
      | IRV-API-FILTER-003      | false                   | null                     |
      | IRV-API-FILTER-004      | false                   | null                     |
    When I query Dynamics records via API:
      | entitySet        | filter                                                                              |
      | accelins_contracts | accelins_lloydsbusiness eq true and accelins_masteragreement eq null |
    Then the API should return status code 200
    And the response should only include CMT UMRs where accelins_lloydsbusiness is true
    And the response should include Contract Reference "IRV-API-FILTER-001" (Lloyd's, unlinked)
    And the response should NOT include Contract Reference "IRV-API-FILTER-002" (Lloyd's, linked)
    And the response should NOT include Contract Reference "IRV-API-FILTER-003" (non-Lloyd's)
    And the response should NOT include Contract Reference "IRV-API-FILTER-004" (non-Lloyd's)

  @PP-9 @PP-9-API-011 @p2 @positive @api-query @data-quality @count
  Scenario: API - Verify data quality query returns count of unlinked Lloyd's CMT UMRs
    Given I have created multiple Dynamics records in entity set "accelins_contracts" with accelins_lloydsbusiness = true and accelins_masteragreement = null
    When I query Dynamics records via API with $count:
      | entitySet        | filter                                                                              | count |
      | accelins_contracts | accelins_lloydsbusiness eq true and accelins_masteragreement eq null | true  |
    Then the API should return status code 200
    And the response should contain the count of unlinked Lloyd's CMT UMRs
    And the count should match the number of records created with accelins_lloydsbusiness = true and accelins_masteragreement = null
