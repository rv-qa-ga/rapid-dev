# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-653 - Member Onboarding Questionnaire – Role Assignment Validation
# Type: Story | Priority: Medium
# Feature Type: validation | onboarding | opportunity
# Generated: RBT (Risk-Based Testing) - UI
# ══════════════════════════════════════════════════════════════════════════════
#
# As an MRD I want the system to validate required role assignments when I confirm
# completion of the Member Onboarding Questionnaire for New Business Opportunities
# so that onboarding information is only accepted once accountability is in place.
#
# Required roles for confirmation: Operations Manager, Claims Manager, Lead Actuary, Lead Underwriter.
# Role requirements indicated at Due Diligence: Operations Manager, Claims Manager (visible to MRD).
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-653 @rbt @medium @onboarding @opportunity @validation
Feature: UI - SF-653 - Member Onboarding Questionnaire role assignment validation
  As an MRD
  I want the system to validate required role assignments when I confirm completion of the Member Onboarding Questionnaire for New Business Opportunities
  So that onboarding information is only accepted once accountability is in place

  Background:
    Given I am logged in as a "QA MRD User" user
    And an Opportunity exists with Opportunity Type "New Business"
    And the Opportunity has a Stage and an Opportunity Type
    And the Member Onboarding Questionnaire is completed outside the system
    And the Opportunity supports onboarding role assignments
    And the Opportunity supports a way for the MRD to confirm questionnaire completion

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - UI SCENARIOS (Member Onboarding Questionnaire + role validation)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-653 @SF-653-UI-001 @p1 @smoke @rbt @due-diligence
  Scenario: Role assignment requirements are identified at Due Diligence
    Given an Opportunity has Opportunity Type "New Business"
    And the Opportunity Stage becomes "Due Diligence"
    When the stage change occurs
    Then the system must indicate that the following role assignments are required for onboarding:
      | Role               |
      | Operations Manager |
      | Claims Manager     |
    And this requirement must be visible to the MRD during Due Diligence
    And I take a screenshot as evidence

  @SF-653 @SF-653-UI-002 @p1 @rbt @confirmation
  Scenario: Questionnaire completion is explicitly confirmed by the MRD
    Given an Opportunity has Opportunity Type "New Business"
    And the Opportunity Stage is "Due Diligence"
    When the MRD confirms that the Member Onboarding Questionnaire is complete
    Then the system must treat this confirmation as the official completion event
    And I take a screenshot as evidence

  @SF-653 @SF-653-UI-003 @p1 @rbt @validation @blocked
  Scenario: Completion confirmation is blocked if required roles are missing
    Given an Opportunity has Opportunity Type "New Business"
    And the Opportunity Stage is "Due Diligence"
    And one or more required role assignments are missing (Claims Manager, Operations Manager, Lead Actuary, Lead Underwriter)
    When the MRD attempts to confirm completion of the Member Onboarding Questionnaire
    Then the system must prevent confirmation
    And the system must display what roles must be assigned to confirm completion
    And I take a screenshot as evidence

  @SF-653 @SF-653-UI-004 @p1 @smoke @rbt @confirmation
  Scenario: Completion confirmation succeeds once required roles are assigned
    Given an Opportunity has Opportunity Type "New Business"
    And the Opportunity Stage is "Due Diligence"
    And all required role assignments are assigned (Operations Manager, Claims Manager, Lead Actuary, Lead Underwriter)
    When the MRD confirms completion of the Member Onboarding Questionnaire
    Then the confirmation must succeed
    And I take a screenshot as evidence

  @SF-653 @SF-653-UI-005 @p2 @rbt @negative
  Scenario: Requirements are not enforced when Stage is not Due Diligence
    Given an Opportunity exists in stage "Pipeline" with Type "New Business"
    Then the system must not enforce these role assignment requirements
    And I take a screenshot as evidence

  @SF-653 @SF-653-UI-006 @p2 @rbt @negative
  Scenario: Requirements are not enforced when Opportunity Type is not New Business
    Given an Opportunity exists in stage "Due Diligence" with Type "Existing Business"
    Then the system must not enforce these role assignment requirements
    And I take a screenshot as evidence
