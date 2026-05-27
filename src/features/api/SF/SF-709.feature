# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-709 - Restrict Account Status values by Account Type
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-behavior, validation
# Generated: 2026-02-19 (Mode 4 RBT placeholder - API optional)
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - RBT: API optional - 1-2 minimal smoke scenarios only
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-709 @medium @rbt @account
Feature: API - SF-709 - Restrict Account Status values by Account Type

  Background:
    Given I have a valid Salesforce API token

  @SF-709 @SF-709-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify Account and Account_Status__c exist
    When I describe the Account object fields
    Then the "Account_Status__c" field should exist
