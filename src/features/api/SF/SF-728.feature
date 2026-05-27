# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-728 - Retire Region/Distribution Region and replace with formula fields
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: field-retirement, formula-fields
# Generated: 2026-02-18 (FeatureGenerator v3.1) | Mode 4 RBT (API minimal)
# ══════════════════════════════════════════════════════════════════════════════
#
# Mode: 4 - Risk-Based Testing (RBT) - API minimal 1-2 tests
# Verifies via Metadata/Describe: retired fields removed; new formula fields exist and are read-only.
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-728 @medium @field-retirement @formula-fields @region @rbt
Feature: API - SF-728 - Retire Region and Distribution Region and replace with formula fields

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # API 1: Retired fields must not exist on Account and Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-API-001 @p1 @retire @account @lead
  Scenario: API - Retired Region field (Region__c) does not exist after migration
    When I describe the Account object fields
    Then the "Region__c" field should not exist
    When I describe the Lead object fields
    Then the "Region__c" field should not exist

  # ══════════════════════════════════════════════════════════════════════════
  # API 2: New formula fields exist and are read-only on Account and Lead
  # (API names for new formula fields: UNSD_Region__c, Distribution_Region__c)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-728 @SF-728-API-002 @p1 @formula @account @lead
  Scenario: API - New UNSD Region and Distribution Region formula fields exist and are read-only
    When I describe the Account object fields
    Then the "UNSD_Region__c" field should exist
    And the "UNSD_Region__c" field should be read-only
    And the "Distribution_Region__c" field should exist
    And the "Distribution_Region__c" field should be read-only
    When I describe the Lead object fields
    Then the "UNSD_Region__c" field should exist
    And the "UNSD_Region__c" field should be read-only
    And the "Distribution_Region__c" field should exist
    And the "Distribution_Region__c" field should be read-only
