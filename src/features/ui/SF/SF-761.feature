# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-761 - New Business Opportunity lifecycle and controlled disqualification
# Type: Story | Priority: Medium
# Feature Type: lifecycle | opportunity | validation
# Generated: RBT (Risk-Based Testing) - UI
# ══════════════════════════════════════════════════════════════════════════════
#
# As an MRD I want New Business Opportunities to follow a sequential lifecycle with
# controlled disqualification so that required approval steps are completed in order
# and Opportunities can be marked Unqualified at the appropriate stages.
#
# Lifecycle: Pipeline → Due Diligence → Contracting → Go-Live → Live
# Unqualified allowed from: Pipeline, Due Diligence, Contracting only.
# Account alignment: Pipeline⇒Prospect; Due Diligence/Contracting⇒Onboarding; Go-Live⇒Contracted; Live⇒Active.
# Note: Stage/Account sync only at contracted checkpoint (SF-762).
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-761 @rbt @medium @opportunity @lifecycle
Feature: UI - SF-761 - New Business Opportunity sequential lifecycle and Unqualified
  As an MRD
  I want New Business Opportunities to follow a sequential lifecycle with controlled disqualification
  So that required approval steps are completed in order and Opportunities can be marked Unqualified at the appropriate stages

  Background:
    Given I am logged in as a "QA MRD User" user
    And an Opportunity exists with Opportunity Type "New Business"
    And the Opportunity lifecycle stages are in order: Pipeline → Due Diligence → Contracting → Go-Live → Live
    And "Unqualified" is an allowed outcome from Pipeline, Due Diligence, or Contracting
    And stage progression requires completion of approval steps and required task confirmations
    And the Account lifecycle remains broadly aligned: Pipeline⇒Prospect; Due Diligence/Contracting⇒Onboarding; Go-Live⇒Contracted; Live⇒Active

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS (stage names, sequential progression, Unqualified)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-761 @SF-761-UI-001 @p1 @smoke @rbt @stage-names
  Scenario: Update Opportunity stage names to reflect agreed lifecycle terminology
    Given the Opportunity Stage picklist contains the values "Contract" and "Active"
    When the Opportunity stage configuration is updated
    Then the stage value "Contract" must be renamed to "Contracting"
    And the stage value "Active" must be renamed to "Live"
    And the stage order must remain sequential as: Pipeline → Due Diligence → Contracting → Go-Live → Live
    And any validation rules referencing the previous stage names must be updated to reference the new stage names
    And I take a screenshot as evidence

  @SF-761 @SF-761-UI-002 @p1 @rbt @sequential
  Scenario: Only sequential forward stage progression is allowed for New Business Opportunities
    Given an Opportunity exists with Type "New Business"
    When a user attempts to change the Opportunity stage
    Then the following forward stage transitions must be allowed:
      | From         | To            |
      | Pipeline     | Due Diligence |
      | Due Diligence| Contracting   |
      | Contracting  | Go-Live       |
      | Go-Live      | Live          |
    And any attempt to skip a stage must be prevented
    And any attempt to move backwards must be prevented
    And I take a screenshot as evidence

  @SF-761 @SF-761-UI-003 @p1 @rbt @unqualified
  Scenario: Opportunity may be set to Unqualified from Pipeline, Due Diligence, or Contracting
    Given an Opportunity exists with Type "New Business"
    And the Opportunity stage is "Pipeline" or "Due Diligence" or "Contracting"
    When a user changes the Opportunity stage to "Unqualified" and saves
    Then the Opportunity must be saved successfully
    And the Opportunity stage must be "Unqualified"
    And I take a screenshot as evidence

  @SF-761 @SF-761-UI-004 @p1 @smoke @rbt @unqualified @negative
  Scenario: Opportunity cannot be set to Unqualified from Go-Live or Live
    Given an Opportunity exists with Type "New Business"
    And the Opportunity stage is "Go-Live" or "Live"
    When a user attempts to change the Opportunity stage to "Unqualified"
    Then the change must be prevented
    And the user must see an error message stating: "Opportunities in Go-Live or Live cannot be moved to Unqualified."
    And I take a screenshot as evidence
