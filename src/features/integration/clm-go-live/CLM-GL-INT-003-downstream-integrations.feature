# ══════════════════════════════════════════════════════════════════════════════
# CLM Go-Live — Phase D: Downstream integrations (ODS/TDS, Tagetik, Duck Creek, D365 F&O)
# Mostly manual until INT service accounts and endpoints are in .env.int
# Reuse Lloyd's SQL patterns where entity overlap exists (Tagetik, ODS)
# ══════════════════════════════════════════════════════════════════════════════

@clm-go-live @downstream @ods @tagetik @duck-creek @fno @int
Feature: CLM Go-Live - Downstream integration smoke
  As an integration QA engineer
  I want downstream systems to keep receiving expected data after Salesforce mastering go-live
  So that finance and operations interfaces are not disrupted

  @CLM-GL-INT-200 @p1 @manual @ods-tds
  Scenario: ODS/TDS - staging tables accept post-migration test markers
    Given ODS/TDS INT or read-only validation SQL access is configured
    When I query staging tables for programme test repository or batch markers
    Then expected test rows should be present or the scenario is skipped with documented reason
    And no blocking schema errors should exist for in-scope CLM entities

  @CLM-GL-INT-201 @p1 @manual @tagetik
  Scenario: Tagetik - loader table reflects controlled test run
    Given Tagetik TDS SQL access is configured per env.sample Lloyd's block
    When I query TagetikWrittenforDataLoaderADP for programme test repository id
    Then at least one row should exist for the test run or scenario is skipped until posting completes

  @CLM-GL-INT-202 @p1 @manual @duck-creek
  Scenario: Duck Creek - smoke interface completes for programme test policy
    Given Duck Creek INT endpoint and credentials are configured
    When I submit the programme-approved Duck Creek smoke request
    Then the interface should return success without regression error codes

  @CLM-GL-INT-203 @p1 @manual @d365-fo
  Scenario: D365 F&O - legal entity and journal path reachable after CRM changes
    Given D365 F&O UI or OData INT credentials are configured
    When I sign in to F&O and list legal entities
    Then authentication should succeed
    And programme test legal entity should be selectable

  @CLM-GL-INT-204 @p2 @manual
  Scenario: Dynamics CRM - non-mastered consumers still read RDM from preprod
    Given I have a valid Dynamics 365 API token
    When I query a sample RDM entity in Dynamics preprod used by downstream jobs
    Then records required for ODS/F&O extracts should remain available
