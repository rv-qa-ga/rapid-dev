# JIRA: SF-676 - POG Committee Review and Approval (EU/UK)
# Mode: 4 RBT - API optional

@api @salesforce @SF-676 @medium @rbt
Feature: API - SF-676 - POG Committee Review and Approval (EU/UK)

  Background:
    Given I have a valid Salesforce API token

  @SF-676 @SF-676-API-001 @smoke @p1 @rbt @field-exists
  Scenario: API (RBT) - Verify Case object is available
    When I describe the Case object fields
    Then the "Subject" field should exist
