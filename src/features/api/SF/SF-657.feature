# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-657 - Handle Opportunity Summary approval outcomes
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: approval-outcomes
# Primary Entity: Opportunity, Opportunity Readiness (Opportunity Summary)
# Regenerated: 2026-03-01 | Mode 4 RBT | 1 API scenario
# ══════════════════════════════════════════════════════════════════════════════
#
# User story (MRD):
#   As an MRD I want clear outcomes when the Opportunity Summary fields are
#   approved or rejected, so that I know what actions are required and whether
#   the prospect may continue.
#
# API: Minimal 1 scenario – verify Opportunity Readiness has approval/outcome field.
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-657 @medium @salesforce @approval-outcomes @opportunity-readiness
Feature: API - SF-657 - Handle Opportunity Summary approval outcomes

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API minimal (1 scenario)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-657 @SF-657-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Opportunity Readiness has approval status for outcomes
    When I describe the Opportunity_Readiness__c object fields
    Then the "Approval_Status__c" or equivalent approval status field should exist
