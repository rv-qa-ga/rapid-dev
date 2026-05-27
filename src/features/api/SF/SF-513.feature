# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-513 - Remove Lead LOB Object and Redundant Location Fields
# Type: Story | Status: Ready for QA | Priority: Medium
# Feature Type: field-removal, field-visibility
# Generated: 2026-03-01 (FeatureGenerator v3.1) | Mode 4 RBT | Lead object
# ══════════════════════════════════════════════════════════════════════════════
#
# User story (Data Steward):
#   As a Data Steward I want to remove the obsolete Line of Business custom
#   object and related country/state/province picklist fields from the Lead,
#   so that the Lead object contains only fields that are actively used and
#   maintained, reducing duplication and data inconsistency.
#
# API Test Strategy (Lead object only):
#   • Removed fields must NOT exist in Lead metadata: Country__c, State_Province__c, Lead_LOB_Object__c
#   • Retained fields MUST exist: Line_of_Business_Created__c, Number_of_LOB_Created__c, Region__c
#
# ═══════════════════════════════════════════════════════════════════════════
# GENERATION MODE
# ═══════════════════════════════════════════════════════════════════════════
# Mode: 4
# Description: Risk-Based Testing (RBT) - API minimal smoke; Lead object only.
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-513 @medium @salesforce @field-removal @field-visibility @lead
Feature: API - SF-513 - Remove Lead LOB Object and Redundant Location Fields

  Background:
    Given I have a valid Salesforce API token

  # ══════════════════════════════════════════════════════════════════════════
  # REMOVED FIELDS - Must NOT exist on Lead
  # ══════════════════════════════════════════════════════════════════════════

  @SF-513 @SF-513-API-001 @smoke @p1 @field-removal
  Scenario: API - Verify Country__c field does NOT exist on Lead
    When I describe the Lead object fields
    Then the "Country__c" field should not exist

  @SF-513 @SF-513-API-002 @smoke @p1 @field-removal
  Scenario: API - Verify State_Province__c field does NOT exist on Lead
    When I describe the Lead object fields
    Then the "State_Province__c" field should not exist

  @SF-513 @SF-513-API-003 @p1 @field-removal @lob-deprecated
  Scenario: API - Verify Lead LOB object reference field does NOT exist on Lead
    When I describe the Lead object fields
    Then the "Lead_LOB_Object__c" field should not exist

  # ══════════════════════════════════════════════════════════════════════════
  # RETAINED FIELDS - Must exist on Lead (Scenario 5 + Region independence)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-513 @SF-513-API-004 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify Line_of_Business_Created__c exists on Lead
    When I describe the Lead object fields
    Then the "Line_of_Business_Created__c" field should exist

  @SF-513 @SF-513-API-005 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify Number_of_LOB_Created__c exists on Lead
    When I describe the Lead object fields
    Then the "Number_of_LOB_Created__c" field should exist

  @SF-513 @SF-513-API-006 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify Region__c exists on Lead and functions independently
    When I describe the Lead object fields
    Then the "Region__c" field should exist
