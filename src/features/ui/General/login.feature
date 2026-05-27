# ═══════════════════════════════════════════════════════════════════════════
# ⚠️  STABLE - DO NOT MODIFY without team approval
# Last verified: 2025-11-29
# Related: src/step-definitions/ui/login.steps.ts
#          src/page-objects/salesforce/HomePage.ts
# ═══════════════════════════════════════════════════════════════════════════

@ui @salesforce @smoke 
Feature: Salesforce Login
  As a user
  I want to log into Salesforce using JWT authentication
  So that I can access the application without email/phone verification

  @LoginCheck @smoke @LoginCheck
  Scenario: Successful login to Salesforce using JWT
    Given I log the environment context
    And I am an authenticated Salesforce user
    When I open the App Launcher
    And I navigate to the Accelerant Console
    Then the Accelerant Console should be loaded
    And I log out successfully

 @LoginCheckmrduser @LoginCheck
  Scenario: Successful login to Salesforce using JWT
    Given I log the environment as "MRD User"
    When I open the App Launcher
    And I navigate to the Accelerant Console
    Then the Accelerant Console should be loaded
    And I log out successfully


   @LoginCheckstandarduser @LoginCheck 
  Scenario: Successful login to Salesforce using JWT
    Given I log the environment as "Standard User"
    When I open the App Launcher
    And I navigate to the Accelerant Console
    Then the Accelerant Console should be loaded
    And I log out successfully

   @LoginChecknonadminuser @LoginCheck 
  Scenario: Successful login to Salesforce using JWT
    Given I log the environment as "Non-Admin User"
    When I open the App Launcher
    And I navigate to the Accelerant Console
    Then the Accelerant Console should be loaded
    And I log out successfully