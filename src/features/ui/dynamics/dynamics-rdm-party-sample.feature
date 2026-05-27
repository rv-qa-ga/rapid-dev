# Sample Dynamics UI smoke
# Prerequisites (SPN — default): D365_TENANT_ID, D365_CLIENT_ID, D365_CLIENT_SECRET, D365_SCOPE, D365_BASE_URL (optional)
# Interactive UI: set DYNAMICS_UI_AUTH_MODE=interactive and D365_UI_USERNAME / D365_UI_PASSWORD (omit SPN Bearer; user must bypass MFA via CA policy)
# Admin must link the app registration as Application User with security role including RDM + Party/Parties.
# Confirmed UI: Reference Data Management → left pane "Party" section → "Parties" → main area shows "All Parties*" view.
#
# Run (QA):
#   cross-env ENV=qa node scripts/run-tests-with-env.js src/features/ui/dynamics/dynamics-rdm-party-sample.feature
# Headed browser (override .env HEADLESS=true):
#   cross-env ENV=qa HEADLESS=false node scripts/run-tests-with-env.js src/features/ui/dynamics/dynamics-rdm-party-sample.feature
# First scenario only:
#   cross-env ENV=qa node scripts/run-tests-with-env.js --tags @dynamics-rdm-spn-direct
# RDM opens via <D365_BASE_URL>/Apps/uniquename/accelins_ReferenceData (override with DYNAMICS_RDM_APP_URL).
# Tile navigation: set DYNAMICS_RDM_USE_PUBLISHED_APPS_TILE=true in .env.qa or shell

@ui @dynamics @dynamics-rdm-party-sample @smoke
Feature: Dynamics RDM – open Party (Parties) entity (sample)
  As an automation user with SPN access to Dynamics UI
  I want to open Reference Data Management and the Party area (Parties list)
  So that we can confirm Application User permissions work end-to-end

  @dynamics-rdm-party-sample @dynamics-rdm-spn-direct
  Scenario: Open Dynamics, RDM, and Parties entity (RDM app URL → Parties)
    Given I am logged in to Dynamics 365
    When I open Dynamics RDM Parties page
    Then I should see "Parties" entity view
    And I should see the text "All Parties" in the page title
    And I take a screenshot as evidence

  @dynamics-rdm-party-sample @dynamics-rdm-via-apps
  Scenario: Open RDM and Parties via app tile (alternative if your landing page shows Apps)
    Given I am logged in to Dynamics 365
    And I navigate to the Reference Data Management app
    When I select "Parties" under "Party" category in the left navigation pane
    Then I should see "Parties" entity view
    And I should see the text "All Parties" in the page title
    And I take a screenshot as evidence
