# ══════════════════════════════════════════════════════════════════════════════
# ON-DEMAND TEST DATA CREATION - DEV ENVIRONMENT
# Creates sample records with MULE- prefix for DEV sandbox
# ══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   ENV=dev npm run test:feature src/features/ui/General/on-demand-test-data-dev.feature -- --tags "@onDemandDev"
#   ENV=dev npm run test:feature src/features/ui/General/on-demand-test-data-dev.feature -- --tags "@createAccountsDev"
#
# ══════════════════════════════════════════════════════════════════════════════

@onDemandDev @manual @no-cleanup
Feature: On-Demand Test Data Creation - DEV Environment
  As a QA engineer
  I want to create sample test data on-demand in DEV
  So that I have a good mix of test records with MULE- prefix for DEV testing

  Background:
    Given I have a valid Salesforce API token

  # ============================================================================
  # REAL-WORLD DATA CREATION FROM EXCEL - DEV (MULE- prefix)
  # ============================================================================

  @onDemandDev @createRealWorldDev @excelData @createAccountsDev
  Scenario: Create 15 real-world Accounts from Excel data (DEV - MULE prefix)
    When I create 10 real-world Accounts from Excel data
    Then I should have 15 Accounts created (one per Type)
    And I log all created records for reference

  @onDemandDev @createRealWorldDev @excelData @createLeadsDev
  Scenario: Create 10 real-world Leads from Excel data (DEV - MULE prefix)
    When I create 10 real-world Leads from Excel data
    Then I should have 10 Leads created (one per Type)
    And I log all created records for reference

  @onDemandDev @createRealWorldDev @excelData @createContactsDev
  Scenario: Create 10 real-world Contacts from Excel data (DEV - MULE prefix)
    When I create 10 real-world Contacts from Excel data
    Then I should have 10 Contacts created (one per Type)
    And I log all created records for reference

  @onDemandDev @createRealWorldDev @excelData @createOpportunitiesDev
  Scenario: Create 10 real-world Opportunities from Excel data (DEV - MULE prefix)
    When I create 10 real-world Opportunities from Excel data
    Then I should have 10 Opportunities created (one per Type)
    And I log all created records for reference

  @onDemandDev @createRealWorldDev @excelData @completeSetDev
  Scenario: Create complete real-world dataset from Excel (DEV - MULE prefix)
    When I create 10 real-world Accounts from Excel data
    And I create 10 real-world Leads from Excel data
    And I create 10 real-world Contacts from Excel data
    And I create 10 real-world Opportunities from Excel data
    Then I should have 45 total records created
    And I log all created records for reference

