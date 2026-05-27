# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-872 — Access and Governance Model (Lightning smoke by persona)
#
# Configure SF_DATAGOVERNANCEUSER_* and SF_READONLYUSER_* in src/config/env/.env.<ENV>.
# If credentials are missing, UI login may fall back to admin — fix env before relying on results.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-872 @rbt @medium @product-reference-data @governance
Feature: UI - SF-872 - Access and governance model (Lightning)

  @SF-872 @SF-872-UI-011 @p2
  Scenario: UI - Data Governance user can open Lightning list and new for representative SF-872 object
    Given I am logged in as a "Data Governance" user
    When I verify Lightning list and new form for SF-872 custom object "Sub_Product__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-872 @SF-872-UI-012 @p2
  Scenario: UI - Read-only user can open list but must not get a usable new-record flow
    Given I am logged in as a "read-only" user
    When I verify Lightning list for SF-872 custom object "Sub_Product__c" as read-only user without new record access
    Then I write the SF-872 UI governance verification report
    And the SF-872 UI governance checks should pass
    And I take a screenshot as evidence
