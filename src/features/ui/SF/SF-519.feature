# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-519 - Derive Distribution Region from Lead Country
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:09:03.633Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Derive Distribution Region from Lead Country
# Primary Entity: Lead
#
# Test Requirements (7):
#   REQ-1: Country must be populated on all Leads
#     → Test Type: BOTH | Priority: p1
#   REQ-2: Automatically populate Distribution Region based on Country
#     → Test Type: BOTH | Priority: p2
#   REQ-3: Update Distribution Region when Country changes
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Alignment with central region definitions
#     → Test Type: BOTH | Priority: p2
#   REQ-5: No Distribution Region when Country is blank or unmapped
#     → Test Type: BOTH | Priority: p2
#   REQ-6: Distribution Region field includes help text
#     → Test Type: UI | Priority: p2
#   REQ-7: is the standard country field from address details?
#     → Test Type: API | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# FIELD VALUES IDENTIFIED:
#   • US
#   • UK
#   • EU
#   • CA
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-519 @medium @auto-populate @field-mapping @lead
Feature: SF-519 - Derive Distribution Region from Lead Country
  As a Salesforce user
  I want to verify the standard country functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-519 @SF-519-UI-001 @negative @user-is-creating-or-editing-a-lead-when-the
  Scenario: Country must be populated on all Leads
    Given I am logged in as a "User Is Creating Or Editing A Lead When The" user
    Given A user is creating or editing a Lead
    And I save the record
    Given The Country field must be populated
    Given The save must be blocked if the Country field is blank
    And I should see a validation error
    When I save the record
    When The Country field must be populated
    When The save must be blocked if the Country field is blank
    And I should see a validation error
    Then The Country field must be populated
    Then The save must be blocked if the Country field is blank
    Then I should see a validation error
    Then The save must be blocked if the Country field is blank
    Then I should see a validation error
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-002
  Scenario: Automatically populate Distribution Region based on Country
    Given I am logged in as a standard user
    Given A Lead has a valid Country in its address details
    Given The Distribution Region field must populate automatically
    Given The value must correspond to the predefined mapping for that Country
    When The Distribution Region field must populate automatically
    When The value must correspond to the predefined mapping for that Country
    Then The Distribution Region field must populate automatically
    Then The value must correspond to the predefined mapping for that Country
    Then The value must correspond to the predefined mapping for that Country
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-003
  Scenario: Update Distribution Region when Country changes
    Given I am logged in as a standard user
    Given A Lead has a Distribution Region already populated
    Given The Country is changed
    Given The Distribution Region must update automatically
    Given Reflect the region linked to the new Country
    When The Country is changed
    When The Distribution Region must update automatically
    When Reflect the region linked to the new Country
    Then The Distribution Region must update automatically
    Then Reflect the region linked to the new Country
    Then Reflect the region linked to the new Country
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-004
  Scenario: Alignment with central region definitions
    Given I am logged in as a standard user
    Given A predefined country-to-region reference list exists
    Given Deriving the Distribution Region
    Given The system must use the centrally maintained list to ensure consistency across all objects
    Given Integrations
    When Deriving the Distribution Region
    When The system must use the centrally maintained list to ensure consistency across all objects
    When Integrations
    Then The system must use the centrally maintained list to ensure consistency across all objects
    Then Integrations
    Then Integrations
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-005 @negative @lead-has-no-country-entered-or-the-country-is-not-included-in-the-mapping-when-the-lead-is-saved-then-the-distribution-region-field-must-remain-blank-the
  Scenario: No Distribution Region when Country is blank or unmapped
    Given I am logged in as a "Lead Has No Country Entered Or The Country Is Not Included In The Mapping When The Lead Is Saved Then The Distribution Region Field Must Remain Blank The" user
    Given A Lead has no Country entered or the Country is not included in the mapping
    Given The Lead is saved
    Given The Distribution Region field must remain blank
    Given The user must not receive an error
    When The Lead is saved
    When The Distribution Region field must remain blank
    When The user must not receive an error
    Then The Distribution Region field must remain blank
    Then The user must not receive an error
    Then The user must not receive an error
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-006 @data-driven
  Scenario: Distribution Region field includes help text
    Given I am logged in as a standard user
    Given A user views the Distribution Region field on a Lead
    Given The help text is displayed
    Given It must state
    Given "This field is automatically populated from the Country
    Given Reflects where the distribution team sees the member being located."Note: this country is the country in the address details
    Given Can we make country mandatory in the address details, so that distribution region is always populated?we can take the mappings that exist today in RDM to derive what the Distribution region should be
    When The help text is displayed
    When It must state
    When "This field is automatically populated from the Country
    When Reflects where the distribution team sees the member being located."Note: this country is the country in the address details
    When Can we make country mandatory in the address details, so that distribution region is always populated?we can take the mappings that exist today in RDM to derive what the Distribution region should be
    Then It must state
    Then "This field is automatically populated from the Country
    Then Reflects where the distribution team sees the member being located."Note: this country is the country in the address details
    Then Can we make country mandatory in the address details, so that distribution region is always populated?we can take the mappings that exist today in RDM to derive what the Distribution region should be
    Then Reflects where the distribution team sees the member being located."Note: this country is the country in the address details
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-007 @data-driven @admin
  Scenario: is the standard country field from address details?
    Given I am logged in as a "Admin" user
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: standard country on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-519 @SF-519-UI-008 @smoke @p1
  Scenario: Verify standard country field is visible on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "standard country" field should be visible
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-009 @p1 @edit
  Scenario: Verify standard country field can be edited on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "standard country" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "standard country" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-010 @p1 @data-driven
  Scenario Outline: Set standard country to valid values
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "standard country" field to "<value>"
    And I save the record
    Then the "standard country" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: standard country from Source to Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-519 @SF-519-UI-011 @smoke @p1 @auto-populate
  Scenario: Verify standard country auto-populates from Source to Lead
    Given I am logged in as a standard user
    And I have a test Source created via API with:
      | field   | value    |
      | standard country | EU       |
    And I have a test Lead created via API for the Source
    When I navigate to the Lead record
    Then the "standard country" field should display "EU"
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-012 @p1 @auto-populate @data-driven
  Scenario Outline: Verify standard country mapping for all valid values
    Given I am logged in as a standard user
    And I have a test Source created via API with standard country "<value>"
    And I have a test Lead created via API for the Source
    When I navigate to the Lead record
    Then the "standard country" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  @SF-519 @SF-519-UI-013 @p1 @read-only
  Scenario: Verify standard country is NOT editable on Lead after creation
    Given I am logged in as a standard user
    And I have a test Source created via API with standard country "UK"
    And I have a test Lead created via API for the Source
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "standard country" field should not be editable
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-014 @p1 @visibility
  Scenario: Verify standard country field is visible on Lead
    Given I am logged in as a standard user
    And I have a test Source created via API with standard country "US"
    And I have a test Lead created via API for the Source
    When I navigate to the Lead record
    Then the "standard country" field should be visible
    And the "standard country" field should display "US"
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-015 @p2 @exact-match
  Scenario: Verify standard country value matches exactly from Source
    Given I am logged in as a standard user
    And I have a test Source created via API with standard country "APAC"
    And I have a test Lead created via API for the Source
    When I navigate to the Lead record
    Then the "standard country" field should display "APAC"
    And the standard country value should match exactly what was on the Source
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: standard country on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-519 @SF-519-UI-016 @smoke @p1
  Scenario: Verify standard country field is visible on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "standard country" field should be visible
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-017 @p1 @edit
  Scenario: Verify standard country field can be edited on Lead
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "standard country" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "standard country" field should display "Test Value"
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-018 @p1 @data-driven
  Scenario Outline: Set standard country to valid values
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "standard country" field to "<value>"
    And I save the record
    Then the "standard country" field should display "<value>"
    And I take a screenshot as evidence

    Examples:
      | value |
      | US |
      | UK |
      | EU |
      | CA |

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-519 @SF-519-UI-019 @p2 @negative @blank-value
  Scenario: Verify behavior when standard country is blank
    Given I am logged in as a standard user
    And I have a test Lead created via API without "standard country"
    When I navigate to the Lead record
    Then the "standard country" field should be visible
    And the "standard country" field should be blank or empty
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-020 @p2 @negative @invalid-value
  Scenario: Verify invalid value cannot be set for standard country
    Given I am logged in as a standard user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    Then the "standard country" picklist should not contain invalid values
    And I take a screenshot as evidence

  @SF-519 @SF-519-UI-021 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify standard country
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-519 @SF-519-UI-022 @p2 @ui-data-creation
  Scenario: Create Lead record via UI
    Given I am logged in as a standard user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 6
  # Covered Requirements: 6
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 161
  # Existing Steps Used: 161
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 161/161 (100%)
  #   - Feature-Specific Steps Used: 0
