# Layer B (TM KB) — Opportunity capability; Zephyr: TM KB / Salesforce, cycles e.g. KB-SF-QA
@kb_sf @ui @salesforce
Feature: KB - Salesforce - Opportunity (UI)
  As a knowledge-base regression owner
  I want a thin UI hook under the Opportunity capability
  So that Layer B can grow without replacing Layer A (SF-*) story tests

  @kb_sf_opportunity_ui_001
  Scenario: KB Layer B - Opportunity UI shell (authenticated session)
    Given I am an authenticated Salesforce user
    When I open the App Launcher
    And I navigate to the Accelerant Console
    Then the Accelerant Console should be loaded
