# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-660 - Member Onboarding Questionnaire – Required Reviews by Roles and Control Teams
# Type: Story | Priority: Medium
# Feature Type: onboarding | opportunity | tasks | validation
# Generated: RBT (Risk-Based Testing) - API minimal
# ══════════════════════════════════════════════════════════════════════════════
#
# Required reviews: onboarding roles (Actuary, Underwriter, Claims Manager, Operations Manager)
# and control teams (Compliance, IT Security, Finance). Questionnaire cannot be marked complete
# until all reviews are complete. API tests: minimal – completion blocked vs allowed.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-660 @rbt @medium @onboarding @opportunity @review
Feature: API - SF-660 - Member Onboarding Questionnaire required reviews
  API must enforce that questionnaire completion is blocked when required reviews are
  incomplete, and allowed when all required review tasks are marked Complete (New Business).

  Background:
    Given I have a valid Salesforce API token
    And an Opportunity exists with Type "New Business"
    And the Member Onboarding Questionnaire has been received and made available for review

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-660 @SF-660-API-001 @p1 @smoke @rbt
  Scenario: API - Marking questionnaire complete is rejected when not all required reviews are complete
    Given an Opportunity has Opportunity Type "New Business"
    And one or more required review tasks are not marked as Complete
    When the system receives a request to mark the Member Onboarding Questionnaire as complete for the Opportunity
    Then the API must reject the request
    And the response must indicate that not all required reviews have been completed

  @SF-660 @SF-660-API-002 @p1 @rbt
  Scenario: API - Marking questionnaire complete succeeds when all required reviews are complete
    Given an Opportunity has Opportunity Type "New Business"
    And all required review tasks have been marked as Complete
    When the system receives a request to mark the Member Onboarding Questionnaire as complete for the Opportunity
    Then the API must accept the request
    And the questionnaire must be marked as complete
    And the completion date and user must be recorded
