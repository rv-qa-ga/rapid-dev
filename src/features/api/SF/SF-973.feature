# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-973 — Field history tracking on key Product Map fields
# This feature validates only the acceptance line:
#   "And history is accessible to integration users via API"
#
# Scope: REST/SOQL read access to Product_Map__History for the JWT API identity.
# Configure the integration (or API) user via SF_API_JWT_USERNAME, or rely on the
# default JWT user for the environment (see SalesforceAPIClient.authenticate).
# Does not require history rows; optional scenario filters by a tracked field API name.
#
# QA org (Object Manager) — story label vs API name (use API name in History.Field / SOQL):
#   Status → Status__c
#   Product → Product__c
#   Sub Product → SubProduct__c
#   Country → Country__c
#   Line of Business → Line_of_Business__c
#   Class of Business → Classes_of_Business__c
#   Member Products & Programs → Member_Product__c
#   ASLOB → ASLOB__c
#   OSFI → OSFI_OSFII__c
#   POG Product → POG_Product__c
#   Effective Start / End Date → Effective_Start_Date__c / Effective_End_Date__c
#   Non-renewable → Non_renewable__c
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-973 @product-map @field-history @integration-api
Feature: API - SF-973 - Product Map field history readable via REST for API user

  Background:
    Given I have a valid Salesforce API token

  @SF-973 @SF-973-API-001 @p2 @describe @soql
  Scenario: API user can describe and query Product_Map__History
    When I describe the "Product_Map__History" object
    Then the "ParentId" field should exist
    And the "Field" field should exist
    And the "OldValue" field should exist
    And the "NewValue" field should exist
    And the "CreatedById" field should exist
    And the "CreatedDate" field should exist
    When I query Product Map field history via REST API with audit columns
    Then the Product Map field history query response should be successful

  @SF-973 @SF-973-API-002 @p3 @soql @status
  Scenario: API user can query Product_Map__History filtered by Status__c
    When I query Product Map field history via REST API with audit columns for field "Status__c"
    Then the Product Map field history query response should be successful
