# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-504 - AccountTeamMember object consolidation
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) - UI
# Generated from: Jira Sprint 101.xlsx
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-504 @rbt @medium
Feature: UI - SF-504 - AccountTeamMember object consolidation
  As Product Owner / Data Owner
  I want AccountTeamMember to include a Geography picklist (EU/UK, US, CA), to store a hidden Dataverse unique ID for integration, and to add “Processing Lead” to the TeamMemberRole picklist
  So that we can record the region each team member operates in, reliably exchange the AccountTeamMember record with Dataverse, and allow “Processing Lead” as a valid team role  ----

  Background:
    Given I am logged in as a "QA MRD User" user
  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-504 @SF-504-UI-001 @p1 @rbt
  Scenario: Story acceptance criteria
    Given the system is set up for SF-504
    When the user performs the required actions
    Then the expected outcome per story description is verified
    And I take a screenshot as evidence

