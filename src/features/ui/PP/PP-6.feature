# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-6 - Create a Master Lloyd's Agreement and Link Underlying UMRs
# Type: Story | Status: In QA | Priority: Highest
# Feature Type: master-agreement, cmt-association, relationship-management
# Generated: 2026-01-27T18:53:25.341Z (FeatureGenerator v3.1)
# Updated: 2026-01-27 (Based on BA/Dev conversation and CMT structure)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Create a Master Lloyd's Agreement and Link Underlying UMRs
# Primary Entity: Master Agreement (in Reference Data Management app)
# Related Entity: Contracts (CMT UMRs in CMT app)
#
# Master Agreement Fields:
#   - Master Agreement UMR (user-entered, single line of text)
#   - Master Agreement Master ID (system-generated autonumber, e.g., MAM-000001)
#   - Description (text field)
#   - Master Agreement Start Date (maps to "Inception Date" in AC)
#   - Master Agreement End Date (maps to "Expiry Date" in AC)
#   - Status (mirrors Member status)
#   - Status Reason (mirrors Member - includes Offboarded, Onboarding)
#
# CMT UMRs:
#   - CMT UMRs are Contracts in the CMT Power Apps application
#   - Contract Reference field in CMT is the CMT UMR identifier
#   - CMT is a separate Power Apps application (like Reference Data Management)
#
# Test Requirements (5):
#   REQ-1: Creation of master agreement - enter minimum fields
#     → Test Type: UI | Priority: p1
#   REQ-2: Association of underlying UMRs - search and associate CMT UMRs
#     → Test Type: UI | Priority: p1
#   REQ-3: Cardinality - one master to many underlying UMRs
#     → Test Type: UI | Priority: p1
#   REQ-4: Validation of duplicates - system prevents duplicate associations
#     → Test Type: UI | Priority: p1 (Note: System default behavior handles this)
#   REQ-5: Optional association - CMT UMRs can exist without association
#     → Test Type: UI | Priority: p2
#
# Key Business Rules:
#   - One Master Agreement can be linked to many underlying CMT UMRs
#   - System prevents duplicate CMT UMR associations to the same Master Agreement
#   - CMT UMRs can exist without being associated to any Master Agreement
#   - Master Agreement UMR is user-entered (not autonumber)
#   - Master Agreement Master ID is system-generated (e.g., MAM-000001)
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-6 @highest @dynamics @d365 @master-agreement @cmt @relationship-management
Feature: PP-6 - Create a Master Lloyd's Agreement and Link Underlying UMRs
  As a Contract Administrator
  I want to create a master Lloyd's agreement record and associate multiple underlying CMT UMRs to it
  So that I can represent a single Lloyd's contract and its member/split structure consistently across systems

  Background:
    Given I am logged in to Dynamics 365

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-6 @PP-6-UI-001 @p1 @smoke @positive @master-agreement-creation
  Scenario: Create a new master Lloyd's agreement with minimum required fields
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    When I select "Master Agreements" from the left navigation pane
    And I click New to create a Master Agreement record
    And I enter "LLOYD-UMR-001" in the "Master Agreement UMR" field
    And I enter "Test Master Lloyd's Agreement" in the "Description" field
    And I enter "01/01/2024" in the "Master Agreement Start Date" field
    And I enter "12/31/2024" in the "Master Agreement End Date" field
    And I select "Active" in the "Status" field
    And I save the Master Agreement record
    Then the Master Agreement should be created successfully
    And the "Master Agreement Master ID" field should display a system-generated value like "MAM-000001"
    And I take a screenshot as evidence

  @PP-6 @PP-6-UI-002 @p1 @positive @master-agreement-creation @status-reason
  Scenario: Create master Lloyd's agreement with Status Reason options
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    When I select "Master Agreements" from the left navigation pane
    And I click New to create a Master Agreement record
    And I enter "LLOYD-UMR-002" in the "Master Agreement UMR" field
    And I enter "Test Agreement with Status Reason" in the "Description" field
    And I enter "01/01/2024" in the "Master Agreement Start Date" field
    And I enter "12/31/2024" in the "Master Agreement End Date" field
    And I select "Active" in the "Status" field
    And I select "Onboarding" in the "Status Reason" field
    And I save the Master Agreement record
    Then the Master Agreement should be created successfully
    And the "Status Reason" field should display "Onboarding"
    And I take a screenshot as evidence

  @PP-6 @PP-6-UI-003 @p1 @positive @cmt-association
  Scenario: Search for and associate existing CMT UMRs to master agreement
    Given I am logged in to Dynamics 365
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    And I navigate to the Reference Data Management app
    And I select "Master Agreements" from the left navigation pane
    And I open the Master Agreement record with Master Agreement UMR "MAM-000001"
    When I navigate to the "Underlying Agreements" subgrid or related records section
    And I click "Add Existing" or "Associate" to link CMT UMRs
    And I search for CMT UMR with Contract Reference "IRV03LN2022"
    And I select the CMT UMR "IRV03LN2022" from search results
    And I confirm the association
    Then the CMT UMR "IRV03LN2022" should be associated to the Master Agreement
    And I should see "IRV03LN2022" in the Underlying Agreements list
    And I take a screenshot as evidence

  @PP-6 @PP-6-UI-004 @p1 @positive @cardinality @multiple-associations
  Scenario: Associate multiple underlying CMT UMRs to one master agreement
    Given I am logged in to Dynamics 365
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    And I navigate to the Reference Data Management app
    And I select "Master Agreements" from the left navigation pane
    And I open the Master Agreement record with Master Agreement UMR "MAM-000001"
    When I navigate to the "Underlying Agreements" subgrid or related records section
    And I associate CMT UMR "IRV03LN2022" to the Master Agreement
    And I associate CMT UMR "IRV01AN2021" to the Master Agreement
    Then the Master Agreement should have multiple underlying CMT UMRs associated
    And I should see "IRV03LN2022" in the Underlying Agreements list
    And I should see "IRV01AN2021" in the Underlying Agreements list
    And the count of associated CMT UMRs should be 2
    And I take a screenshot as evidence

  @PP-6 @PP-6-UI-005 @p1 @positive @duplicate-prevention @system-validation
  Scenario: System prevents duplicate CMT UMR association to same master agreement
    Given I am logged in to Dynamics 365
    And I have an existing Master Agreement record with Master Agreement UMR "MAM-000001"
    And the Master Agreement already has CMT UMR "IRV03LN2022" associated
    And I navigate to the Reference Data Management app
    And I select "Master Agreements" from the left navigation pane
    And I open the Master Agreement record with Master Agreement UMR "MAM-000001"
    When I navigate to the "Underlying Agreements" subgrid or related records section
    And I attempt to associate CMT UMR "IRV03LN2022" again to the same Master Agreement
    Then the system should prevent the duplicate association
    And I should see that "IRV03LN2022" appears only once in the Underlying Agreements list
    And I take a screenshot as evidence

  @PP-6 @PP-6-UI-006 @p2 @positive @optional-association
  Scenario: CMT UMR can exist without being associated to master agreement
    Given I am logged in to Dynamics 365
    And I navigate to the CMT app
    When I select "Contracts" from the left navigation pane
    And I view an existing Contract record with Contract Reference "IRV99XX2023"
    Then the Contract should exist independently
    And the "Master Agreement" lookup field should be empty or not required
    And the Contract should not be associated to any Master Agreement
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VALIDATION SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @PP-6 @PP-6-UI-007 @p1 @negative @required-fields
  Scenario: Verify required fields for master agreement creation
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    When I select "Master Agreements" from the left navigation pane
    And I click New to create a Master Agreement record
    And I attempt to save the Master Agreement record without filling required fields
    Then I should see validation errors for required fields
    And the "Master Agreement UMR" field should be marked as required
    And the "Master Agreement Start Date" field should be marked as required
    And the "Master Agreement End Date" field should be marked as required
    And I take a screenshot as evidence

  @PP-6 @PP-6-UI-008 @p2 @negative @date-validation
  Scenario: Verify date validation for master agreement
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    When I select "Master Agreements" from the left navigation pane
    And I click New to create a Master Agreement record
    And I enter "LLOYD-UMR-003" in the "Master Agreement UMR" field
    And I enter "12/31/2024" in the "Master Agreement Start Date" field
    And I enter "01/01/2024" in the "Master Agreement End Date" field
    And I attempt to save the Master Agreement record
    Then I should see a validation error indicating that End Date must be after Start Date
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-6 @PP-6-UI-009 @p2 @ui-data-creation
  Scenario: Create Master Agreement record via UI with all fields
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    When I select "Master Agreements" from the left navigation pane
    And I click New to create a Master Agreement record
    And I enter "LLOYD-UMR-TEST-001" in the "Master Agreement UMR" field
    And I enter "Complete Test Master Agreement" in the "Description" field
    And I enter "01/01/2024" in the "Master Agreement Start Date" field
    And I enter "12/31/2024" in the "Master Agreement End Date" field
    And I select "Active" in the "Status" field
    And I select "Onboarding" in the "Status Reason" field
    And I save the Master Agreement record
    Then the Master Agreement should be created successfully
    And all entered field values should be saved correctly
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 5
  # Coverage: 100%
  #
  # ✅ COVERED REQUIREMENTS:
  #   REQ-1: Creation of master agreement - Scenario PP-6-UI-001, PP-6-UI-002
  #   REQ-2: Association of underlying UMRs - Scenario PP-6-UI-003
  #   REQ-3: Cardinality - Scenario PP-6-UI-004
  #   REQ-4: Validation of duplicates - Scenario PP-6-UI-005
  #   REQ-5: Optional association - Scenario PP-6-UI-006
  #
  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Note: Some steps may need to be created for:
  #   - Navigating to CMT app
  #   - Associating CMT UMRs to Master Agreements
  #   - Viewing Underlying Agreements subgrid
  #   - Searching for CMT UMRs by Contract Reference
  #
  # These steps should follow the existing Dynamics UI step definition patterns
  # and may require feature-specific step definitions if not already available.
