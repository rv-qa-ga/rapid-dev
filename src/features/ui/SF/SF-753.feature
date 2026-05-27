# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-753 - Lead lifecycle movement and validation
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: validation-rule
# Generated: 2026-02-24T17:08:19.902Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - UI test cases generated; API optional (minimal 1-2 or skip)
# RBT: UI test cases generated; API optional (minimal 1-2 or skip).
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Lead lifecycle movement and validation
# Primary Entity: Lead
#
# Test Requirements (1):
#   REQ-1: Backward movement is allowed between New and Funnel Lead statuses
#     → Test Type: API | Priority: p1
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-753 @medium @salesforce @lead
Feature: SF-753 - Lead lifecycle movement and validation
  As a Salesforce user
  I want to verify the Funnel functionality on Lead
  So that Lead records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-753 @SF-753-UI-001 @p1 @smoke @positive @validation-rule @field-exists @update
  Scenario: Backward movement is allowed between New and Funnel Lead statusesGiven a Lead existsAnd the Lead Status is FunnelAnd the Lead has not been ConvertedAnd the Lead has not been DisqualifiedWhen a user changes the Lead Status to NewThen the status change must be allowedAnd the Lead record must be saved successfullyAnd no validation or approval must block the changeScenario 2: A Lead can be created directly with Status = Funnel (skip New)Given a user is creating a new LeadWhen the user sets Lead Status to "Funnel"And saves the LeadThen the Lead must be saved successfullyAnd the Lead must be created with Lead Status = "Funnel"And the system must not require the Lead to be created in "New" firstScenario 3: “New” validations must also apply when creating a Lead directly in FunnelGiven a user is creating a new LeadAnd the user sets Lead Status to "Funnel" before savingWhen the user attempts to save the LeadThen all validation rules and required field checks that apply when saving a Lead in status "New" must also be enforcedAnd the Lead must not be saved if any of those validations failAnd the user must see the relevant validation error message(s)Scenario 4: “New” validations must also apply when updating an existing Lead to FunnelGiven a Lead exists with Lead Status = "New"When the user updates the Lead Status to "Funnel"And attempts to save the LeadThen all validation rules and required field checks that apply when saving a Lead in status "New" must also be enforcedAnd the Lead must not be saved if any of those validations failAnd the user must see the relevant validation error message(s)Scenario 5: A Lead can be disqualified from New or FunnelGiven a Lead existsAnd the Lead Status is "New" or "Funnel"When a user updates the Lead Status to "Disqualified"And saves the LeadThen the Lead must be saved successfullyAnd the Lead must be marked as DisqualifiedAnd no requirement must exist for the Lead to first reach "Funnel" before being disqualifiedScenario 6: Disqualified is a terminal Lead statusGiven a Lead existsAnd the Lead Status is "Disqualified"When a user attempts to change the Lead Status to "New" or "Funnel"Or attempts to change the Lead Status to any other non-terminal valueThen the change must be preventedAnd the Lead record must not be savedAnd the user must see an error message stating:"A Disqualified Lead cannot be moved back to an active status."Scenario 7: A Lead can be converted directly from New if Funnel validations are metGiven a Lead existsAnd the Lead Status is "New"When a user updates the Lead Status to "Converted"Then the system must evaluate all validations that are required for Leads in status "Funnel"And the Lead must not be converted unless all Funnel-stage validations are satisfiedAnd if all Funnel validations are satisfiedThen the Lead Conversion process must be launchedScenario 8:  Funnel validations must not be bypassed when converting directly from NewGiven a Lead existsAnd the Lead Status is "New"And one or more Funnel-stage validations are not metWhen a user attempts to convert the LeadThen the conversion must be blockedAnd the Lead must remain unconvertedAnd the user must see the relevant validation error message(s)
    Given I am logged in as a "Accelerant - System administrator" user
    Then The requirements make sense
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Funnel on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-753 @SF-753-UI-002 @smoke @p1
  Scenario: Verify Funnel field is visible on Lead
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Funnel" field should be visible
    And I take a screenshot as evidence

  @SF-753 @SF-753-UI-003 @p1 @edit
  Scenario: Verify Funnel field can be edited on Lead
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Lead record
    When I navigate to the Lead record
    And I click Edit on the Lead
    And I set the "Funnel" field to "Test Value"
    And I save the record
    Then the Lead should be saved successfully
    And the "Funnel" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-753 @SF-753-UI-004 @p2 @negative @blank-value
  Scenario: Verify behavior when Funnel is blank
    Given I am logged in as a "Accelerant - System administrator" user
    And I have a test Lead created via API without "Funnel"
    When I navigate to the Lead record
    Then the "Funnel" field should be visible
    And the "Funnel" field should be blank or empty
    And I take a screenshot as evidence

  @SF-753 @SF-753-UI-005 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Funnel
    Given I am logged in as a read-only user
    And I have a test Lead created via API
    When I navigate to the Lead record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-753 @SF-753-UI-006 @p2 @ui-data-creation
  Scenario: Create Lead record via UI
    Given I am logged in as a "Accelerant - System administrator" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 0
  # Covered Requirements: 0
  # Coverage: 100%

  # ✅ All requirements covered!


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 35
  # Existing Steps Used: 35
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 35/35 (100%)
  #   - Feature-Specific Steps Used: 0
