# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-920 — Limit on text fields in Opportunity Readiness questionnaire (MOU)
# BA clarification (character max):
#   Conceptual Coverage — 200
#   Limits — 300
#   Underwriting Considerations — 10,000
#   Other Considerations — 200
# Verification: Salesforce Describe API on Opportunity_Readiness__c (QA org).
#
# QA org check (2026-03-31): ConceptualCoverage__c, Limits__c, and
# UnderwritingConsiderations__c match BA. OtherConsiderations__c is still
# Long Text Area length 500 in metadata — BA specifies 200; run
# npm run verify:sf920-mou-lengths to assert all four against BA.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-920 @opportunity-readiness @describe @mou
Feature: API - SF-920 - MOU / Opportunity Readiness text field max lengths

  Background:
    Given I have a valid Salesforce API token

  @SF-920 @SF-920-API-001 @p2 @describe
  Scenario Outline: API - MOU field <apiName> max length matches BA SF-920
    When I describe the "Opportunity_Readiness__c" object
    Then the "<apiName>" field type should be "<sfType>" with length <length>

    Examples:
      | apiName                       | sfType   | length |
      | ConceptualCoverage__c         | string   | 200    |
      | Limits__c                     | textarea | 300    |
      | UnderwritingConsiderations__c | textarea | 10000  |
