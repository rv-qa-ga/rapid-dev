# Layer B (TM KB) — functional journey shell; Zephyr: TM KB / Salesforce, cycles e.g. KB-SF-QA
# Tags: @kb_sf_<capability>_<ui|api>_<NNN> (unique per scenario)
@kb_sf @ui @salesforce
Feature: KB - Salesforce - Leads (UI)
  As a knowledge-base regression owner
  I want a thin UI hook under the Leads capability
  So that Layer B runs can be tagged and extended without replacing Layer A (SF-*) story tests

  @kb_sf_lead_ui_001
  Scenario: KB Layer B - Leads UI shell (authenticated session)
    Given I am an authenticated Salesforce user
    When I open the App Launcher
    And I navigate to the Accelerant Console
    Then the Accelerant Console should be loaded
