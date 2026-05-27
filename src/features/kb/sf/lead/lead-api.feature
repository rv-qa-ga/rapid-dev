# Layer B (TM KB) — functional journey shell; Zephyr: TM KB / Salesforce, cycles e.g. KB-SF-QA
@kb_sf @api @salesforce
Feature: KB - Salesforce - Leads (API)
  As a knowledge-base regression owner
  I want a thin API hook under the Leads capability
  So that Layer B runs can be tagged and extended without replacing Layer A (SF-*) story tests

  @kb_sf_lead_api_001
  Scenario: KB Layer B - Leads API shell (token context)
    Given I have a valid Salesforce API token
    Then the API must return success or the expected outcome
