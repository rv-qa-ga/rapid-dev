# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-872 / SF-1015 — Product reference *objects* (metadata / creation scope)
#
# SF-872 is about creating the Salesforce custom objects and related metadata — not
# loading or verifying migration *data*. Excel workbooks that accompany the program
# carry values to be migrated later; those are out of scope for these tests.
#
# API tests: REST describe + full field matrix from data/sf872/expected-fields/<Object__c>.json
# (apiName, label, dataType). Regenerate JSON after metadata changes:
#   npm run sf872:bootstrap-fields
# After each scenario: HTML Expected vs Actual report under reports/sf872/.
#
# Reference test data (@SF-872-DATA, SF-872-API-014–023): REST create one row per object;
# optional SF_SF872_PRODUCT2_ID in env. Line_of_Business__c creates Solvency_II__c first.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-872 @SF-1015 @rbt @medium @product-reference-data @governance
Feature: API - SF-872 - Product reference object creation (metadata only)

  As a Data Steward or System Administrator
  I want each SF-872 reference custom object to exist in the org as deployable metadata
  So that object creation is verified without treating migration Excel as the source of truth

  Background:
    Given I have a valid Salesforce API token

  @SF-872 @SF-872-API-001 @p1 @smoke
  Scenario: API - Sub_Product__c object creation verified via describe
    When I verify Salesforce object "Sub_Product__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-872 @SF-872-API-002 @p1 @smoke
  Scenario: API - POG_Product__c object creation verified via describe
    When I verify Salesforce object "POG_Product__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-872 @SF-872-API-003 @p1 @smoke
  Scenario: API - OSFI__c object creation verified via describe
    When I verify Salesforce object "OSFI__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-872 @SF-872-API-004 @p1 @smoke
  Scenario: API - Member_Product_and_Program__c object creation verified via describe
    When I verify Salesforce object "Member_Product_and_Program__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-872 @SF-872-API-005 @p1 @smoke
  Scenario: API - Line_of_Business__c object creation verified via describe
    When I verify Salesforce object "Line_of_Business__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-872 @SF-872-API-006 @p1 @smoke
  Scenario: API - Classes_of_Business__c object creation verified via describe
    When I verify Salesforce object "Classes_of_Business__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-872 @SF-872-API-007 @p1 @smoke
  Scenario: API - BEGAAP_COB__c object creation verified via describe
    When I verify Salesforce object "BEGAAP_COB__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-872 @SF-872-API-008 @p1 @smoke
  Scenario: API - ASLOB__c object creation verified via describe
    When I verify Salesforce object "ASLOB__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-872 @SF-872-API-009 @p1 @smoke
  Scenario: API - Solvency_II__c object creation verified via describe
    When I verify Salesforce object "Solvency_II__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-1015 @SF-872-API-010 @p1 @smoke
  Scenario: API - Insurance_Product__c object creation verified via describe
    When I verify Salesforce object "Insurance_Product__c" for SF-872 object creation
    Then I write the SF-872 API object creation verification report
    And the SF-872 object creation API checks should pass

  @SF-872 @SF-872-DATA @SF-872-API-014 @p2
  Scenario: API - Create SF-872 test record Sub_Product__c
    When I create an SF-872 reference test record for Salesforce object "Sub_Product__c"
    Then the SF-872 reference test record should be created successfully

  @SF-872 @SF-872-DATA @SF-872-API-015 @p2
  Scenario: API - Create SF-872 test record POG_Product__c
    When I create an SF-872 reference test record for Salesforce object "POG_Product__c"
    Then the SF-872 reference test record should be created successfully

  @SF-872 @SF-872-DATA @SF-872-API-016 @p2
  Scenario: API - Create SF-872 test record OSFI__c
    When I create an SF-872 reference test record for Salesforce object "OSFI__c"
    Then the SF-872 reference test record should be created successfully

  @SF-872 @SF-872-DATA @SF-872-API-017 @p2
  Scenario: API - Create SF-872 test record Member_Product_and_Program__c
    When I create an SF-872 reference test record for Salesforce object "Member_Product_and_Program__c"
    Then the SF-872 reference test record should be created successfully

  @SF-872 @SF-872-DATA @SF-872-API-018 @p2
  Scenario: API - Create SF-872 test record Line_of_Business__c
    When I create an SF-872 reference test record for Salesforce object "Line_of_Business__c"
    Then the SF-872 reference test record should be created successfully

  @SF-872 @SF-872-DATA @SF-872-API-019 @p2
  Scenario: API - Create SF-872 test record Classes_of_Business__c
    When I create an SF-872 reference test record for Salesforce object "Classes_of_Business__c"
    Then the SF-872 reference test record should be created successfully

  @SF-872 @SF-872-DATA @SF-872-API-020 @p2
  Scenario: API - Create SF-872 test record BEGAAP_COB__c
    When I create an SF-872 reference test record for Salesforce object "BEGAAP_COB__c"
    Then the SF-872 reference test record should be created successfully

  @SF-872 @SF-872-DATA @SF-872-API-021 @p2
  Scenario: API - Create SF-872 test record ASLOB__c
    When I create an SF-872 reference test record for Salesforce object "ASLOB__c"
    Then the SF-872 reference test record should be created successfully

  @SF-872 @SF-872-DATA @SF-872-API-022 @p2
  Scenario: API - Create SF-872 test record Solvency_II__c
    When I create an SF-872 reference test record for Salesforce object "Solvency_II__c"
    Then the SF-872 reference test record should be created successfully

  @SF-872 @SF-872-DATA @SF-872-API-023 @p2 @SF-1015
  Scenario: API - Create SF-872 test record Insurance_Product__c
    When I create an SF-872 reference test record for Salesforce object "Insurance_Product__c"
    Then the SF-872 reference test record should be created successfully
