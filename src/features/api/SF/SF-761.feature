# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-761 - New Business Opportunity lifecycle and controlled disqualification
# Type: Story | Priority: Medium
# Feature Type: lifecycle | opportunity | validation
# Generated: RBT (Risk-Based Testing) - API minimal
# ══════════════════════════════════════════════════════════════════════════════
#
# New Business Opportunities follow sequential lifecycle: Pipeline → Due Diligence
# → Contracting → Go-Live → Live. Unqualified allowed only from Pipeline, Due Diligence, Contracting.
# API tests: minimal smoke – reject Unqualified from Go-Live/Live; allow from earlier stages.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-761 @rbt @medium @opportunity @lifecycle
Feature: API - SF-761 - New Business Opportunity sequential lifecycle and Unqualified
  API must enforce sequential stage progression and prevent moving to Unqualified
  from Go-Live or Live; Unqualified is allowed from Pipeline, Due Diligence, or Contracting.

  Background:
    Given I have a valid Salesforce API token
    And an Opportunity exists with Type "New Business"

  # ══════════════════════════════════════════════════════════════════════════
  # RBT - API SMOKE (minimal)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-761 @SF-761-API-001 @p1 @smoke @rbt
  Scenario: API - Stage change to Unqualified is rejected when Opportunity is in Go-Live or Live
    Given an Opportunity exists with Type "New Business" and Stage "Go-Live" or "Live"
    When a request is made via API to update the Opportunity stage to "Unqualified"
    Then the API must reject the update
    And the response must indicate that Opportunities in Go-Live or Live cannot be moved to Unqualified

  @SF-761 @SF-761-API-002 @p1 @rbt
  Scenario: API - Stage change to Unqualified is accepted when Opportunity is in Pipeline, Due Diligence, or Contracting
    Given an Opportunity exists with Type "New Business" and Stage "Pipeline" or "Due Diligence" or "Contracting"
    When a request is made via API to update the Opportunity stage to "Unqualified"
    Then the API must accept the update
    And the Opportunity stage must be persisted as "Unqualified"
