# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-6 - Create a Master Lloyd's Agreement and Link Underlying UMRs
# Type: Story | Status: In QA | Priority: Highest
# Feature Type: master-agreement, cmt-association, relationship-management
# Generated: 2026-01-27T18:53:25.466Z (FeatureGenerator v3.1)
# Updated: 2026-01-27 (Based on BA/Dev conversation and CMT structure)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Create a Master Lloyd's Agreement and Link Underlying UMRs
# Primary Entity: Master Agreement (accelins_masteragreements entity set)
# Related Entity: Contracts (CMT UMRs - contracts entity set in CMT)
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
#
# Test Requirements (5):
#   REQ-1: Creation of master agreement via API
#     → Test Type: API | Priority: p1
#   REQ-2: Association of underlying UMRs via API
#     → Test Type: API | Priority: p1
#   REQ-3: Cardinality - one master to many underlying UMRs
#     → Test Type: API | Priority: p1
#   REQ-4: Validation of duplicates - system prevents duplicate associations
#     → Test Type: API | Priority: p1
#   REQ-5: Optional association - CMT UMRs can exist without association
#     → Test Type: API | Priority: p2
#
# ══════════════════════════════════════════════════════════════════════════════

@api @dynamics @PP-6 @highest @dynamics @d365 @master-agreement @cmt @relationship-management
Feature: API - PP-6 - Create a Master Lloyd's Agreement and Link Underlying UMRs

  Background:
    Given I have a valid Dynamics 365 API token

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-6 @PP-6-API-001 @p1 @smoke @positive @api-create @master-agreement-creation
  Scenario: API - Create a new master Lloyd's agreement with minimum required fields
    When I create a Dynamics record in entity set "accelins_masteragreements" with data:
      | field                                    | value                      |
      | accelins_masteragreementumr              | LLOYD-UMR-API-001          |
      | accelins_description                      | API Test Master Agreement |
      | accelins_masteragreementstartdate         | 2024-01-01                |
      | accelins_masteragreementenddate           | 2024-12-31                |
      | statecode                                 | 0                         |
    Then the API should return status code 201
    And the response should contain the new Master Agreement ID
    And the response should contain "accelins_masteragreementmasterid" with system-generated value
    And I should be able to retrieve the Master Agreement record by ID

  @PP-6 @PP-6-API-002 @p1 @positive @api-create @status-reason
  Scenario: API - Create master Lloyd's agreement with Status Reason
    When I create a Dynamics record in entity set "accelins_masteragreements" with data:
      | field                                    | value                      |
      | accelins_masteragreementumr              | LLOYD-UMR-API-002          |
      | accelins_description                      | API Test with Status Reason|
      | accelins_masteragreementstartdate         | 2024-01-01                |
      | accelins_masteragreementenddate           | 2024-12-31                |
      | statecode                                 | 0                         |
      | statuscode                                | 1                         |
    Then the API should return status code 201
    And the response should contain statuscode field
    And I should be able to retrieve the Master Agreement record by ID
    And the retrieved record should have statuscode matching the created value

  @PP-6 @PP-6-API-003 @p1 @positive @api-update @cmt-association
  Scenario: API - Associate existing CMT UMR to master agreement
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with name "MAM-API-001"
    And I have an existing Contract record in CMT with Contract Reference "IRV03LN2022"
    When I update the Master Agreement to associate CMT UMR via relationship
    Then the association should be created successfully
    And I should be able to query the Master Agreement and retrieve associated CMT UMRs

  @PP-6 @PP-6-API-004 @p1 @positive @cardinality @multiple-associations
  Scenario: API - Associate multiple CMT UMRs to one master agreement
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with name "MAM-API-002"
    And I have an existing Contract record in CMT with Contract Reference "IRV03LN2022"
    And I have an existing Contract record in CMT with Contract Reference "IRV01AN2021"
    When I associate CMT UMR "IRV03LN2022" to the Master Agreement via API
    And I associate CMT UMR "IRV01AN2021" to the Master Agreement via API
    Then the Master Agreement should have multiple CMT UMRs associated
    And I should be able to query and retrieve all associated CMT UMRs for the Master Agreement
    And the count of associated CMT UMRs should be 2

  @PP-6 @PP-6-API-005 @p1 @positive @duplicate-prevention @system-validation
  Scenario: API - System prevents duplicate CMT UMR association
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with name "MAM-API-003"
    And I have an existing Contract record in CMT with Contract Reference "IRV03LN2022"
    And the Master Agreement already has CMT UMR "IRV03LN2022" associated
    When I attempt to associate CMT UMR "IRV03LN2022" again to the same Master Agreement via API
    Then the API should return an error or prevent the duplicate association
    And the Master Agreement should have only one association to "IRV03LN2022"

  @PP-6 @PP-6-API-006 @p2 @positive @optional-association
  Scenario: API - CMT UMR can exist without being associated to master agreement
    Given I have an existing Contract record in CMT with Contract Reference "IRV99XX2023"
    When I query the Contract record via API
    Then the Contract should exist independently
    And the Contract should not have a Master Agreement association
    And the Master Agreement lookup field should be null or empty

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VALIDATION SCENARIOS - API
  # ══════════════════════════════════════════════════════════════════════════

  @PP-6 @PP-6-API-007 @p1 @negative @required-fields
  Scenario: API - Reject master agreement creation without required fields
    When I create a Dynamics record in entity set "accelins_masteragreements" with data:
      | field | value |
      | accelins_description | Test without required fields |
    Then the API should return an error status code 400
    And the error response should mention required fields

  @PP-6 @PP-6-API-008 @p2 @negative @date-validation
  Scenario: API - Reject master agreement with invalid date range
    When I create a Dynamics record in entity set "accelins_masteragreements" with data:
      | field                                    | value                      |
      | accelins_masteragreementumr              | LLOYD-UMR-API-INVALID     |
      | accelins_description                      | Invalid Date Range Test   |
      | accelins_masteragreementstartdate         | 2024-12-31                |
      | accelins_masteragreementenddate           | 2024-01-01                |
      | statecode                                 | 0                         |
    Then the API should return an error status code 400
    And the error response should mention date validation

  @PP-6 @PP-6-API-009 @p2 @negative @invalid-value
  Scenario: API - Reject invalid Status Reason value
    When I create a Dynamics record in entity set "accelins_masteragreements" with data:
      | field                                    | value                      |
      | accelins_masteragreementumr              | LLOYD-UMR-API-INVALID-STATUS|
      | accelins_description                      | Invalid Status Test       |
      | accelins_masteragreementstartdate         | 2024-01-01                |
      | accelins_masteragreementenddate           | 2024-12-31                |
      | statecode                                 | 0                         |
      | statuscode                                | 99999                     |
    Then the API should return an error status code 400
    And the error response should mention invalid statuscode

  # ══════════════════════════════════════════════════════════════════════════
  # API QUERY AND RETRIEVAL SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-6 @PP-6-API-010 @p2 @api-query
  Scenario: API - Query master agreement by Master Agreement UMR
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with name "MAM-API-QUERY"
    When I query Master Agreements where "accelins_masteragreementumr" equals "LLOYD-UMR-API-001"
    Then the API should return status code 200
    And the response should contain at least one Master Agreement record
    And the retrieved record should have accelins_masteragreementumr matching "LLOYD-UMR-API-001"

  @PP-6 @PP-6-API-011 @p2 @api-query @relationship
  Scenario: API - Query master agreement with associated CMT UMRs
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with name "MAM-API-REL"
    And the Master Agreement has associated CMT UMRs
    When I query the Master Agreement with expanded relationship to CMT UMRs
    Then the API should return status code 200
    And the response should include associated CMT UMR records
    And the associated CMT UMRs should be accessible via the relationship

  @PP-6 @PP-6-API-012 @p2 @api-update
  Scenario: API - Update master agreement fields
    Given I have created a Dynamics record in entity set "accelins_masteragreements" with name "MAM-API-UPDATE"
    When I update the Master Agreement field "accelins_description" to "Updated Description" via API
    Then the API should return status code 204
    And I should be able to retrieve the Master Agreement record by ID
    And the retrieved record should have accelins_description matching "Updated Description"

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 5
  # Coverage: 100%
  #
  # ✅ COVERED REQUIREMENTS:
  #   REQ-1: Creation of master agreement - Scenario PP-6-API-001, PP-6-API-002
  #   REQ-2: Association of underlying UMRs - Scenario PP-6-API-003
  #   REQ-3: Cardinality - Scenario PP-6-API-004
  #   REQ-4: Validation of duplicates - Scenario PP-6-API-005
  #   REQ-5: Optional association - Scenario PP-6-API-006
  #
  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Note: Some steps may need to be created for:
  #   - Associating CMT UMRs to Master Agreements via API
  #   - Querying relationships between Master Agreements and CMT UMRs
  #   - Creating Contract records in CMT application
  #
  # These steps should follow the existing Dynamics API step definition patterns
  # and may require feature-specific step definitions if not already available.
