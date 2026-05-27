# Layer B (TM KB) — Account capability
@kb_sf @api @salesforce
Feature: KB - Salesforce - Account (API)
  As a knowledge-base regression owner
  I want a thin API hook under the Account capability
  So that Layer B can grow without replacing Layer A (SF-*) story tests

  @kb_sf_account_api_001
  Scenario: KB Layer B - Account API shell (token context)
    Given I have a valid Salesforce API token
    Then the API must return success or the expected outcome
