# ══════════════════════════════════════════════════════════════════════════════
# JIRA: PP-272 - Launchpad | TPA Reassessment | Update Security Role for Stage Transition
# Type: Story | Status: In QA | Priority: Low
# Feature Type: launchpad, security-role, stage-transition, tpa-reassessment
# Updated: 2026-02-23 (Launchpad app context: D365 → Launchpad → Reassessment/Review → TPA Reassessments)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Launchpad is a separate application (like CMT), built on Dynamics
#           365. User logs in to Dynamics 365, then navigates to the Launchpad
#           application. From Launchpad, user goes to Reassessment/Review →
#           TPA Reassessments and works with the "Active TPA Reassessments"
#           view. Security role is updated for stage transition so that
#           TPA Reassessment functionality behaves correctly.
# Primary Entity: TPA Reassessment (in Launchpad app)
# Related: Contract (e.g. Contract Owner); Launchpad app; Reassessment/Review.
#
# User journey:
#   1. Log in to Dynamics 365
#   2. Navigate to Launchpad application (via Apps / Power Apps – LaunchPad tile)
#   3. In Launchpad: Reassessment/Review section → TPA Reassessments
#   4. View "Active TPA Reassessments"
#   5. Perform actions per requirement (stage transition, visibility, security role)
#
# Key Business Rules:
#   - Security role (e.g. Head of Domain Field Security Profile: Launchpad) is
#     updated for stage transition in TPA Reassessment context.
#   - Users with the appropriate role can view and transition TPA Reassessments
#     as per the requirement.
#   - Contract Owner and related fields may be shown on Active TPA Reassessments.
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @dynamics @PP-272 @low @dynamics @d365 @launchpad @security-role @tpa-reassessment
Feature: PP-272 - Launchpad | TPA Reassessment | Update Security Role for Stage Transition
  As a Dynamics 365 user with Launchpad or TPA Reassessment responsibilities
  I want to open the Launchpad application, navigate to TPA Reassessments, and have the correct security role for stage transition
  So that I can work with Active TPA Reassessments and transitions behave correctly per the updated role

  Background:
    Given I am logged in to Dynamics 365

  # ══════════════════════════════════════════════════════════════════════════
  # NAVIGATION: Launchpad application and TPA Reassessments
  # ══════════════════════════════════════════════════════════════════════════

  @PP-272 @PP-272-UI-001 @smoke @p1 @launchpad @navigation
  Scenario: User can navigate to the Launchpad application from Dynamics 365
    Given I am logged in to Dynamics 365
    When I open the Apps menu or Power Apps
    Then I should see the LaunchPad application in the list of published apps
    And I select the "LaunchPad" application
    Then I should be in the Launchpad application
    And I take a screenshot as evidence

  @PP-272 @PP-272-UI-002 @p1 @smoke @launchpad @navigation
  Scenario: User can navigate to Reassessment/Review and view Active TPA Reassessments
    Given I am logged in to Dynamics 365
    And I navigate to the Launchpad application
    When I expand or select "Reassessment/Review" in the left navigation pane
    And I select "TPA Reassessments" under Reassessment/Review
    Then I should see the "Active TPA Reassessments" view
    And the view should display the list of active TPA reassessments (e.g. Service Code, Provider, Segment, Contract Owner, Reassessment ID, Status Reason, SharePoint Path)
    And I take a screenshot as evidence

  @PP-272 @PP-272-UI-003 @p1 @launchpad @navigation @background
  Scenario: Background navigation to Active TPA Reassessments for subsequent steps
    Given I am logged in to Dynamics 365
    And I navigate to the Launchpad application
    And I navigate to "Reassessment/Review" section
    And I select "TPA Reassessments"
    And I am on the "Active TPA Reassessments" view
    When I proceed with the required functionality
    Then I am in the correct context to perform TPA Reassessment actions
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SECURITY ROLE AND STAGE TRANSITION (per requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @PP-272 @PP-272-UI-004 @p1 @launchpad @security-role @visibility
  Scenario: User with updated Launchpad security role can access Active TPA Reassessments view
    Given I am logged in as a user with the updated security role for Launchpad (e.g. Head of Domain Field Security Profile: Launchpad or Contract Owner)
    When I navigate to the Launchpad application
    And I navigate to "Reassessment/Review" → "TPA Reassessments"
    Then I should see the "Active TPA Reassessments" view
    And I should have access to the view and data appropriate to my role
    And I take a screenshot as evidence

  @PP-272 @PP-272-UI-005 @p1 @launchpad @stage-transition
  Scenario: Stage transition for TPA Reassessment respects updated security role
    Given I am logged in as a user with the updated security role for Launchpad / TPA Reassessment
    And I navigate to the Launchpad application
    And I navigate to "Reassessment/Review" → "TPA Reassessments"
    And I am on the "Active TPA Reassessments" view
    And I have a TPA Reassessment record that is eligible for stage transition
    When I perform the stage transition (e.g. change status or complete the required approval) on the TPA Reassessment
    Then the transition should complete successfully according to the updated security role
    And the record should reflect the new stage or status
    And I take a screenshot as evidence

  @PP-272 @PP-272-UI-006 @p2 @launchpad @stage-transition
  Scenario: User without updated role cannot perform stage transition or has restricted access
    Given I am logged in as a user without the updated Launchpad / TPA Reassessment security role
    And I navigate to the Launchpad application
    And I navigate to "Reassessment/Review" → "TPA Reassessments"
    When I attempt to perform a stage transition on a TPA Reassessment record
    Then the system should prevent the transition or show access consistent with my role
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # ACTIVE TPA REASSESSMENTS VIEW – key columns and actions
  # ══════════════════════════════════════════════════════════════════════════

  @PP-272 @PP-272-UI-007 @p2 @launchpad @view
  Scenario: Active TPA Reassessments view shows expected columns
    Given I am logged in to Dynamics 365
    And I navigate to the Launchpad application
    And I navigate to "Reassessment/Review" → "TPA Reassessments"
    When I am on the "Active TPA Reassessments" view
    Then I should see columns such as Service Code (Service), Provider Short Name (Provider), Segment, Contract Owner, Reassessment ID, Status Reason, SharePoint Path Reassessment
    And I take a screenshot as evidence

  @PP-272 @PP-272-UI-008 @p2 @launchpad @actions
  Scenario: User can use view actions on Active TPA Reassessments (e.g. Schedule New Reassessment, Refresh, Export)
    Given I am logged in to Dynamics 365
    And I navigate to the Launchpad application
    And I navigate to "Reassessment/Review" → "TPA Reassessments"
    And I am on the "Active TPA Reassessments" view
    When I use the action bar (e.g. "Schedule New Reassessment", "Refresh", "Export to Excel", "Edit columns", "Edit filters")
    Then the actions should be available and behave according to my security role
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # COVERAGE ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Navigation to Launchpad and TPA Reassessments (UI-001–003). Security role
  # and stage transition (UI-004–006). View columns and actions (UI-007–008).
  # ══════════════════════════════════════════════════════════════════════════
  # STEP DEFINITION NOTES:
  #   - "Navigate to the Launchpad application" = open Apps / Power Apps and
  #     select the LaunchPad tile (separate app like CMT).
  #   - "Reassessment/Review" → "TPA Reassessments" = left nav in Launchpad.
  #   - "Active TPA Reassessments" = view name in Launchpad.
  #   - Stage transition = workflow/approval or status change on TPA Reassessment.
  #
