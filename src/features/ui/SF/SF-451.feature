# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-451 - Validate Sharing, Security & Access Requirements
# Type: Story | Analysis-only | Priority: Medium
# ══════════════════════════════════════════════════════════════════════════════
#
# STORY CONTEXT:
#   Analysis-only story to validate existing access and sharing requirements.
#   We are only checking that the MRD user is set up correctly, which verifies
#   the sharing, security & access solution that Gabriel created.
#   We are NOT testing all personas in this story (separate story covers that).
#
# ACCEPTANCE CRITERIA (scope for this story):
#   - Validate user matrix and ensure system actors/users and visibility are correct.
#   - Object level, Record level, Reporting & Dashboards, User Roles.
#   - This feature: simple test cases to verify the solution works for MRD User only.
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-451 @medium @sharing @security @access @mrd @analysis-only
Feature: SF-451 - Validate Sharing, Security & Access Requirements (MRD User)
  As an MRD
  I need my user to be set up with the correct sharing, security and access
  So that I can perform my role and the solution created by Gabriel is validated

  Background:
    Given I am logged in as a "QA MRD User" user

  # ══════════════════════════════════════════════════════════════════════════
  # OBJECT LEVEL: MRD can access required objects
  # ══════════════════════════════════════════════════════════════════════════

  @SF-451 @SF-451-UI-001 @p1 @smoke @object-level @mrd
  Scenario: MRD user can access Opportunity object list
    When I navigate to the Opportunity object list
    Then the "Name" field should be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # RECORD LEVEL: MRD can access records they should see
  # ══════════════════════════════════════════════════════════════════════════

  @SF-451 @SF-451-UI-002 @p1 @smoke @record-level @mrd
  Scenario: MRD user can open an Opportunity record and see required content
    Given I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Name" field should be visible
    And the "StageName" field should be visible
    And I take a screenshot as evidence

  @SF-451 @SF-451-UI-003 @p1 @record-level @mrd
  Scenario: MRD user can view Opportunity Summary / Readiness section when present
    Given I have an existing Opportunity record
    When I navigate to the Opportunity record
    Then the "Opportunity Readiness" section is visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # OBJECT LEVEL: MRD can access Account (second key object)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-451 @SF-451-UI-004 @p1 @object-level @mrd
  Scenario: MRD user can access Account object list
    When I navigate to the Account object list
    Then the "Name" field should be visible
    And I take a screenshot as evidence
