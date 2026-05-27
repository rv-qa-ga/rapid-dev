# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-883 - Rate & Commission Changes Opportunity Sub Type
# Type: Story | Priority: Medium
# Feature Type: RBT (Risk-Based Testing) — API coverage for story scenarios
#
# Org behaviour (UI): Sub Type is only meaningful when Opportunity Type = Expansion.
# Updated Commission Rate and Additional Comments appear when Sub Type = Rate & Commission Changes;
# otherwise those fields are hidden on the layout. API tests set Type via SF883_OPPORTUNITY_TYPE
# (default Expansion) before Sub Type on create — see sf-883.steps.ts ensureSf883Opportunity.
# API Background uses QA MRD JWT (SF_QAMRDUSER_JWT_USERNAME) for MRD-visible fields on REST.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-883 @rbt @medium
Feature: API - SF-883 - Rate & Commission Changes Opportunity Sub Type
  As a MRD I need API behaviour aligned with Rate & Commission Changes so data and validation
  match the story (read-only current rate, required updated rate, comments, stage rules).

  Background:
    Given I have a valid Salesforce API token as QA MRD user

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 1 — Allow entry of updated rate (metadata + write access)
  # ────────────────────────────────────────────────────────────────────────────

  @SF-883 @SF-883-API-001 @p1 @smoke @rbt @field-exists
  Scenario: API - Allow entry of updated rate
    Given the system is configured for SF-883
    Then the SF-883 Current Commission Rate field is read-only when visible in Opportunity describe
    And the "Updated Commission Rate" field should exist
    And the "Updated Commission Rate" field should be updateable on Opportunity
    And the "Updated Commission Rate" field should support two decimal places via API
    And the SF-883 additional comments field should exist as long text up to 500 characters via API

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 2 — Updated Commission Rate required before save (API validation)
  # ────────────────────────────────────────────────────────────────────────────

  @SF-883 @SF-883-API-002 @p1 @rbt @negative
  Scenario: API - Updated Commission Rate is required before saving
    Given I have a test Account created via API
    And an SF-883 API test Opportunity exists with Sub Type "Rate & Commission Changes" and blank Updated Commission Rate
    When I attempt to update the SF-883 test Opportunity via API with:
      | field | value |
      | Name  | SF-883 API validation probe |
    Then the SF-883 Opportunity API update must have failed
    And the SF-883 Opportunity API error must indicate Updated Commission Rate is required

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 3 — Save succeeds when Updated Commission Rate and comments are set
  # ────────────────────────────────────────────────────────────────────────────

  @SF-883 @SF-883-API-003 @p1 @rbt @positive
  Scenario: API - Opportunity can be saved once Updated Commission Rate is entered
    Given I have a test Account created via API
    And an SF-883 API test Opportunity exists with Sub Type "Rate & Commission Changes"
    When I update the SF-883 test Opportunity via API with:
      | field | value |
      | Updated_Commission_Rate__c | 12.34 |
      | UpdatedCommissionRateAdditionalCmts__c | SF-883 API save comments |
    Then the SF-883 test Opportunity should have Updated_Commission_Rate__c approximately "12.34"
    And the SF-883 test Opportunity should have additional comments containing "SF-883 API save comments"

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 4 — Other sub types: no Updated Commission Rate validation via API
  # ────────────────────────────────────────────────────────────────────────────

  @SF-883 @SF-883-API-004 @p1 @rbt @negative
  Scenario: API - Rate and Commission validation does not apply to other Opportunity sub types
    Given I have a test Account created via API
    And an SF-883 API test Opportunity exists with the non-Rate-and-Commission sub type for SF-883
    When I attempt to update the SF-883 test Opportunity via API with:
      | field | value |
      | Name  | SF-883 non-RAC rename without commission |
    Then the SF-883 Opportunity API update must have succeeded

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 5 — Move to Contracting once Updated Commission Rate is entered
  # ────────────────────────────────────────────────────────────────────────────

  @SF-883 @SF-883-API-005 @p1 @rbt @positive
  Scenario: API - Opportunity can move to Contracting once Updated Commission Rate is entered
    Given I have a test Account created via API
    And an SF-883 API test Opportunity exists with Sub Type "Rate & Commission Changes"
    When I update the SF-883 test Opportunity via API with:
      | field | value |
      | Updated_Commission_Rate__c | 15.5 |
    And I update the SF-883 test Opportunity via API with StageName for SF-883 contracting stage
    Then the SF-883 test Opportunity StageName via API should match the configured contracting stage

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 6 — Cannot move to Contracting until Updated Commission Rate is entered
  # ────────────────────────────────────────────────────────────────────────────

  @SF-883 @SF-883-API-006 @p1 @rbt @negative
  Scenario: API - Opportunity cannot move to Contracting until Updated Commission Rate is entered
    Given I have a test Account created via API
    And an SF-883 API test Opportunity exists with Sub Type "Rate & Commission Changes" and blank Updated Commission Rate
    When I attempt to update the SF-883 test Opportunity via API with StageName for SF-883 contracting stage
    Then the SF-883 Opportunity API update must have failed
    And the SF-883 Opportunity API error must mention blocking progression to contracting or commission rate

  # ────────────────────────────────────────────────────────────────────────────
  # Smoke — invalid SOQL (shared pattern with SF-620)
  # ────────────────────────────────────────────────────────────────────────────

  @SF-883 @SF-883-API-007 @p2 @rbt
  Scenario: API - Invalid request rejected
    Given the system is configured for SF-883
    When an alternative or invalid request is made
    Then the API must respond appropriately
