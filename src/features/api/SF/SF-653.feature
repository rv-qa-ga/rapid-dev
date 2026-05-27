# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-653 - Member Onboarding Questionnaire – Role Assignment Validation
# Type: Story | Priority: Medium
# Feature Type: validation | onboarding | opportunity
# Generated: RBT (Risk-Based Testing) - API minimal
# ══════════════════════════════════════════════════════════════════════════════
#
# As an MRD the system validates required role assignments when confirming
# completion of the Member Onboarding Questionnaire for New Business Due Diligence.
# Required roles: Operations Manager, Claims Manager, Lead Actuary, Lead Underwriter.
# API tests: minimal smoke – confirmation blocked when roles missing; succeeds when assigned.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-653 @rbt @medium @onboarding @opportunity @validation
Feature: API - SF-653 - Member Onboarding Questionnaire role assignment validation
  Platform/API must enforce that questionnaire completion confirmation is blocked when
  required role assignments are missing, and allowed when all are assigned (New Business, Due Diligence).

  Background:
    Given I have a valid Salesforce API token
    And an Opportunity exists with Type "New Business" and Stage "Due Diligence"

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-653 @SF-653-API-001 @p1 @smoke @rbt
  Scenario: API - Confirmation of questionnaire completion is rejected when required roles are missing
    Given an Opportunity has Opportunity Type "New Business" and Stage "Due Diligence"
    And one or more required role assignments are missing (Operations Manager, Claims Manager, Lead Actuary, Lead Underwriter)
    When the system receives a request to confirm completion of the Member Onboarding Questionnaire for the Opportunity
    Then the API must reject the confirmation
    And the response must indicate which roles must be assigned

  @SF-653 @SF-653-API-002 @p1 @rbt
  Scenario: API - Confirmation of questionnaire completion succeeds when all required roles are assigned
    Given an Opportunity has Opportunity Type "New Business" and Stage "Due Diligence"
    And all required role assignments are assigned (Operations Manager, Claims Manager, Lead Actuary, Lead Underwriter)
    When the system receives a request to confirm completion of the Member Onboarding Questionnaire for the Opportunity
    Then the API must accept the confirmation
    And the confirmation must be persisted as the official completion event
