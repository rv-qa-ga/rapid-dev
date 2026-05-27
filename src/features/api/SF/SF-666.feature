# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-666 - POG Initiation and Manager Review (UK/EU)
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: general
# Generated: 2026-02-19 (Mode 4 RBT placeholder - API optional)
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - RBT: API optional - 1-2 minimal smoke scenarios only
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-666 @medium @rbt
Feature: API - SF-666 - POG Initiation and Manager Review (UK/EU)

  Background:
    Given I have a valid Salesforce API token

  @SF-666 @SF-666-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify Case object is available
    When I describe the Case object fields
    Then the "Subject" field should exist
