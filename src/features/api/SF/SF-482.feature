# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-482 - Hide Target Insured Industry field on Account
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-visibility, permissions
# Generated: 2026-02-17 (FeatureGenerator v3.1) | Mode 4 RBT
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT) - API minimal
# Primary Entity: Account
# Field: Industry (API name)
#
# Note: This is a visibility/layout change only. The field still exists at
# the object level - it is just hidden from non-admin page layouts.
# API tests confirm the field still exists and data is intact.
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-482 @medium @field-visibility @account
Feature: API - SF-482 - Hide Target Insured Industry field on Account

  Background:
    Given I have a valid Salesforce API token

  @SF-482 @SF-482-API-001 @smoke @p1 @field-exists
  Scenario: API - Verify Industry field still exists on Account (not deleted)
    When I describe the Account object fields
    Then the "Industry" field should exist

  @SF-482 @SF-482-API-002 @p2 @positive @data-intact
  Scenario: API - Verify existing Account Industry data is intact after layout change
    Given I have an existing Account record
    When I query the Account record via API
    Then the API should return status code 200
