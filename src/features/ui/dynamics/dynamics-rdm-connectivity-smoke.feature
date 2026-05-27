# Connectivity smoke: browser + Dynamics + Reference Data Management direct URL.
#
# The URL assertion uses ${D365_HOST} so the scenario works under any ENV:
#   ENV=qa  → src/config/env/.env.qa  → asserts accelinsqatest.crm11.dynamics.com
#   ENV=qa2 → src/config/env/.env.qa2 → asserts accelinsqatest2.crm11.dynamics.com
#
# If Entra sign-in works but the env user is missing, Dataverse may redirect to /appportal/.../notification.aspx
# (notMemberOfOrg) — URL can still contain ${D365_HOST}; steps now detect that and FAIL with a provisioning hint.
# Run (Lloyd's / qa):
#   $env:ENV='qa'; node scripts/run-tests-with-env.js src/features/ui/dynamics/dynamics-rdm-connectivity-smoke.feature
# Run (Salesforce / qa2):
#   $env:ENV='qa2'; node scripts/run-tests-with-env.js src/features/ui/dynamics/dynamics-rdm-connectivity-smoke.feature
# Headed:
#   $env:ENV='qa'; $env:HEADLESS='false'; node scripts/run-tests-with-env.js src/features/ui/dynamics/dynamics-rdm-connectivity-smoke.feature
#
# Requires: D365_BASE_URL for ${D365_HOST}. SPN mode also needs D365_TENANT_ID, D365_CLIENT_ID, D365_CLIENT_SECRET, D365_SCOPE.
# Interactive: DYNAMICS_UI_AUTH_MODE=interactive + D365_UI_USERNAME + D365_UI_PASSWORD (Entra MFA not scripted).

@ui @dynamics @smoke @dynamics-rdm-connectivity
Feature: Dynamics RDM connectivity smoke
  As an automation engineer
  I want to open a browser, reach Dynamics, and load Reference Data Management via the direct app URL
  So that we can confirm SPN / Application User connectivity without navigating to Parties

  @dynamics-rdm-connectivity
  Scenario: Verify Reference Data Management opens via direct app URL
    Given I am logged in to Dynamics 365
    When I navigate to the Reference Data Management app
    # Some orgs redirect to appportal/notification.aspx (e.g. notMemberOfOrg) — assertions now fail with a clear error if Entra succeeds but env access is denied.
    Then the Dynamics browser URL should contain "${D365_HOST}"
    And the Dynamics browser URL should not contain "login.microsoftonline.com"
    And I take a screenshot as evidence

  @dynamics-rdm-connectivity @dynamics-rdm-strict-rdm-url
  Scenario: Verify browser URL shows RDM uniquename (strict)
    Given I am logged in to Dynamics 365
    When I navigate to the Reference Data Management app
    Then the Dynamics browser URL should contain "accelins_ReferenceData"
    And I take a screenshot as evidence
