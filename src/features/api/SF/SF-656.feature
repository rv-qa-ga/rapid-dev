# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-656 - Region-based Executive approval (API)
# Type: Story | Opportunity Readiness | Member Operating Region
# See docs/REQUIREMENT_ISSUE_SF656_SF719.md for UK and EU vs UNSD alignment.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-656 @opportunity-readiness @approval @medium
Feature: API - SF-656 - Region-based Executive approval for Opportunity Summary

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # Member Operating Region field on Opportunity_Readiness__c
  # ══════════════════════════════════════════════════════════════════════════

  @SF-656 @SF-656-API-001 @p1 @field-exists
  Scenario: Member Operating Region field exists on Opportunity Readiness
    When I describe the Opportunity_Readiness__c object fields
    Then the "Member Operating Region" field should exist
    And the field should be a picklist
    And the picklist should contain values "US", "UK", "EU", "CA", "UK and EU"

  @SF-656 @SF-656-API-002 @p2 @approval-status
  Scenario: Opportunity Readiness has approval-related fields for routing
    When I describe the Opportunity_Readiness__c object fields
    Then the "Approval_Status__c" or equivalent approval status field should exist
    And the object should support submission for approval and routing by region
