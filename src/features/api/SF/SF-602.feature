# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-602 - Add missing Contact statecode mappings
#
# Story summary:
# Two Dataverse statecode mappings required for the Salesforce Contact → Dataverse
# Contact integration are missing from the Salesforce mapping table. This task adds
# the two missing mappings only, using the same behaviour, rules, and governance
# already defined and approved in SF-594.
#
# Mappings to add (Picklist Value Mappings.xlsx, tab "Integration External Contact"):
#   | SF Field (contact.Status__c) | SF Value | Mapping Type    | DV Field (contact.statecode) | DV Label | DV Value |
#   | contact.Status__c            | Active   | Dataverse Value | contact.statecode            | Active   | 0        |
#   | contact.Status__c            | Inactive | Dataverse Value | contact.statecode            | Inactive | 1        |
#
# Reference: SF-594 (same acceptance criteria, validation rules, governance controls)
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-602 @medium @mapping @contact @statecode
Feature: API - SF-602 - Contact statecode mappings for Dataverse integration
  As an integrator
  I need Contact Status__c to map correctly to Dataverse statecode
  So that MuleSoft can resolve statecode values at runtime for Active and Inactive statuses

  Background:
    Given I have a valid Salesforce API token

  # ─── Mapping table validation ─────────────────────────────────────────────

  @SF-602 @SF-602-API-001 @p1 @smoke
  Scenario: Contact Status__c Active maps to statecode 0 in mapping table
    Given the Picklist Value Mappings Excel is available
    When I load the Integration External Contact mapping tab
    Then the mapping table contains Status__c Active to statecode 0
    And the mapping is marked valid and available for integration use

  @SF-602 @SF-602-API-002 @p1
  Scenario: Contact Status__c Inactive maps to statecode 1 in mapping table
    Given the Picklist Value Mappings Excel is available
    When I load the Integration External Contact mapping tab
    Then the mapping table contains Status__c Inactive to statecode 1
    And the mapping is marked valid and available for integration use

  @SF-602 @SF-602-API-003 @p1 @smoke
  Scenario: Both Contact statecode mappings are present and follow SF-594 governance
    Given the Picklist Value Mappings Excel is available
    When I load the Integration External Contact mapping tab
    Then the mapping table contains both Contact statecode mappings
    And the mappings follow SF-594 acceptance criteria and governance controls
    And MuleSoft can resolve statecode values for Active and Inactive at runtime

  @SF-602 @SF-602-API-004 @p2
  Scenario: Contact Status__c mappings have correct Dataverse field and value types
    Given the Picklist Value Mappings Excel is available
    When I load the Integration External Contact mapping tab
    Then Status__c Active maps to contact.statecode with Dataverse Value 0
    And Status__c Inactive maps to contact.statecode with Dataverse Value 1
    And the Mapping Type is Dataverse Value for both entries
