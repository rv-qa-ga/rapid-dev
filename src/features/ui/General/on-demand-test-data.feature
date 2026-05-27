


# ══════════════════════════════════════════════════════════════════════════════
# ON-DEMAND TEST DATA CREATION
# These scenarios create sample records WITHOUT cleanup - run manually as needed
# ══════════════════════════════════════════════════════════════════════════════
#
# Usage:
#   npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@onDemand"
#   npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@createAccounts"
#   npm run test:feature src/features/ui/General/on-demand-test-data.feature -- --tags "@createLeads"
#
# ══════════════════════════════════════════════════════════════════════════════

@onDemand @manual @no-cleanup
Feature: On-Demand Test Data Creation
  As a QA engineer
  I want to create sample test data on-demand
  So that I have a good mix of test records for manual testing

  Background:
    Given I have a valid Salesforce API token

  # ============================================================================
  # ACCOUNT CREATION - Various Types & Regions
  # ============================================================================

  @onDemand @createAccounts @allTypes
  Scenario Outline: Create sample Account for each Account Type - <account_type> in <country>
    When I create a persistent Account with:
      | field          | value              |
      | Name           | Test<account_type>Account_<timestamp> |
      | Type           | <account_type>     |
      | BillingCountry | <country>          |
    Then the Account should be created successfully
    And I log the created Account ID for reference

    Examples:
      | account_type              | country         |
      | Acquisition Company       | Germany         |
      | Agency                    | United Kingdom  |
      | Agency Branch             | France          |
      | Distribution Partner      | Netherlands     |
      | Group                     | Belgium         |
      | Insurer                   | United States   |
      | Insurer Branch            | United States   |
      | Legal Entity              | United States   |
      | Member                    | Canada          |
      | Non - Member MGA          | Canada          |
      | Placing Broker            | United Kingdom  |
      | Reinsurance Broker        | United Kingdom  |
      | Reinsurer                 | Australia       |

  # ============================================================================
  # REAL-WORLD DATA CREATION FROM EXCEL
  # ============================================================================

  @onDemand @createRealWorld @excelData @createAccounts
  Scenario: Create 15 real-world Accounts from Excel data
    When I create 10 real-world Accounts from Excel data
    Then I should have 15 Accounts created (one per Type)
    And I log all created records for reference

  @onDemand @createRealWorld @excelData @createLeads
  Scenario: Create 10 real-world Leads from Excel data
    When I create 10 real-world Leads from Excel data
    Then I should have 10 Leads created (one per Type)
    And I log all created records for reference

  @onDemand @createRealWorld @excelData @createContacts
  Scenario: Create 10 real-world Contacts from Excel data
    When I create 10 real-world Contacts from Excel data
    Then I should have 10 Contacts created (one per Type)
    And I log all created records for reference

  @onDemand @createRealWorld @excelData @createOpportunities
  Scenario: Create 10 real-world Opportunities from Excel data
    When I create 10 real-world Opportunities from Excel data
    Then I should have 10 Opportunities created (one per Type)
    And I log all created records for reference

  @onDemand @createRealWorld @excelData @completeSet
  Scenario: Create complete real-world dataset from Excel (Accounts + Leads + Contacts + Opportunities)
    When I create 10 real-world Accounts from Excel data
    And I create 10 real-world Leads from Excel data
    And I create 10 real-world Contacts from Excel data
    And I create 10 real-world Opportunities from Excel data
    Then I should have 45 total records created
    And I log all created records for reference
      | Reinsurer Branch          | Singapore       |
      | Service Company           | Japan           |
      | Third Party Administrator | Switzerland     |

  @onDemand @createAccounts @allStatuses
  Scenario Outline: Create sample Account with Status - <status>
    When I create a persistent Account with:
      | field             | value                           |
      | Name              | TestStatusAccount_<status>_<timestamp> |
      | Type              | Agency                          |
      | Account_Status__c | <status>                        |
    Then the Account should be created successfully
    And I log the created Account ID for reference

    Examples:
      | status      |
      | New         |
      | Prospect    |
      | Onboarding  |
      | Contracted  |
      | Active      |
      | Runoff      |
      | Offboarded  |

  @onDemand @createAccounts @allRegions
  Scenario Outline: Create sample Account in Region - <region>
    When I create a persistent Account with:
      | field          | value                              |
      | Name           | TestRegionAccount_<region>_<timestamp> |
      | Type           | Agency                             |
      | Region__c      | <region>                           |
      | BillingCountry | <country>                          |
    Then the Account should be created successfully
    And I log the created Account ID for reference

    Examples:
      | region | country         |
      | US     | United States   |
      | UK     | United Kingdom  |
      | EU     | Germany         |
      | CA     | Canada          |
      | ROW    | Australia       |

  @onDemand @createAccounts @allCountries
  Scenario Outline: Create sample Account in Country - <country>
    When I create a persistent Account with:
      | field          | value                                  |
      | Name           | TestCountryAccount_<country>_<timestamp> |
      | Type           | Agency                                 |
      | BillingCountry | <country>                              |
    Then the Account should be created successfully
    And I log the created Account ID for reference

    Examples:
      | country              |
      | Germany              |
      | France               |
      | Netherlands          |
      | Belgium              |
      | Switzerland          |
      | Spain                |
      | Italy                |
      | United Kingdom       |
      | United States        |
      | Canada               |
      | Australia            |
      | Singapore            |
      | Japan                |
      | Hong Kong            |
      | United Arab Emirates |

  # ============================================================================
  # LEAD CREATION - Various Regions
  # ============================================================================

  @onDemand @createLeads @allRegions
  Scenario Outline: Create sample Lead in Region - <region>
    When I create a persistent Lead with:
      | field     | value                              |
      | FirstName | Test                               |
      | LastName  | Lead_<region>_<timestamp>          |
      | Company   | Test Company <region>              |
      | Region__c | <region>                           |
      | Country   | <country>                          |
    Then the Lead should be created successfully
    And I log the created Lead ID for reference

    Examples:
      | region | country         |
      | US     | United States   |
      | UK     | United Kingdom  |
      | EU     | Germany         |
      | CA     | Canada          |
      | ROW    | Australia       |

  # ============================================================================
  # CONTACT CREATION
  # ============================================================================

  @onDemand @createContacts
  Scenario Outline: Create sample Contact in Country - <country>
    Given I have an existing Account in "<country>"
    When I create a persistent Contact linked to the Account with:
      | field         | value                             |
      | FirstName     | Test                              |
      | LastName      | Contact_<country>_<timestamp>     |
      | Email         | test.contact.<country>@test.com   |
      | MailingCountry| <country>                         |
    Then the Contact should be created successfully
    And I log the created Contact ID for reference

    Examples:
      | country         |
      | Germany         |
      | United Kingdom  |
      | United States   |
      | Canada          |
      | Australia       |

  # ============================================================================
  # OPPORTUNITY CREATION
  # ============================================================================

  @onDemand @createOpportunities
  Scenario Outline: Create sample Opportunity with Stage - <stage>
    Given I have an existing Account
    When I create a persistent Opportunity linked to the Account with:
      | field      | value                              |
      | Name       | TestOpp_<stage>_<timestamp>        |
      | StageName  | <stage>                            |
      | CloseDate  | +90days                            |
    Then the Opportunity should be created successfully
    And I log the created Opportunity ID for reference

    Examples:
      | stage              |
      | Pipeline           |
      | Qualification      |
      | Needs Analysis     |
      | Value Proposition  |
      | Negotiation/Review |
      | Closed Won         |
      | Closed Lost        |

  # ============================================================================
  # COMPREHENSIVE TEST DATA SET
  # ============================================================================

  @onDemand @createAll @comprehensive
  Scenario: Create comprehensive test data set with all Account Types
    When I create a complete test data set with all Account Types
    Then I should have 16 Accounts created (one per Type)
    And each Account should be in a different country
    And I log all created record IDs for reference

  @onDemand @createAll @sample
  Scenario: Create minimal sample test data set
    When I create a sample test data set with:
      | count | entity     |
      | 3     | Account    |
      | 2     | Lead       |
      | 2     | Contact    |
      | 1     | Opportunity|
    Then all records should be created successfully
    And I log all created record IDs for reference

