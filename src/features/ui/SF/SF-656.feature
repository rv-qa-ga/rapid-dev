# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-656 - Region-based Executive approval for Opportunity Summary
# Type: Story | Opportunity Readiness | Approval routing by Member Operating Region
# ══════════════════════════════════════════════════════════════════════════════
#
# As an MRD I want the Opportunity Summary field approvals to be routed to the
# correct Executive Team based on the Members Operating Region so that the
# appropriate regional leadership provides formal approval.
#
# REQUIREMENT NOTE: See docs/REQUIREMENT_ISSUE_SF656_SF719.md for the conflict
# between "Member Operating Region" (US, UK, EU, CA, UK and EU) and UNSD-based
# routing from Account billing address (SF-719). "UK and EU" has no UNSD equivalent.
#
# Approvers (per story):
#   US:       Aaron DiCaprio - MRD, Rich Koehler - Head of Distribution, Steve Strauss - CUO, Hugh Burgess - CUO
#   UK:       Matthew Wood - Head of Distribution, Nick Brown - CUO
#   EU:       Gabriella Engstrand - Head of Distribution, Raquel Reneses - CUO
#   CA:       Esaïe Djossou - Head of Distribution, Joy Parkes - CUO
#   UK and EU: Matthew Wood - Head of Distribution, Nick Brown - CUO
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-656 @opportunity-summary @approval-routing @mrd @medium
Feature: SF-656 - Region-based Executive approval for Opportunity Summary
  As an MRD
  I want the Opportunity Summary field approvals to be routed to the correct Executive Team based on the Members Operating Region
  So that the appropriate regional leadership provides formal approval

  Background:
    Given I am logged in as a "QA MRD User" user

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: Executive approver routing is region-specific
  # ══════════════════════════════════════════════════════════════════════════

  @SF-656 @SF-656-UI-001 @p1 @approval-routing @executive-approval
  Scenario: Approval request is routed based on Members Operating Region
    Given the Opportunity Summary Fields require Executive approval
    When the approval request is submitted
    Then the approver must be determined based on the Members Operating Region which is captured in the Opportunity Summary Fields
    And the request must be routed to the corresponding Executive Team approver group
    And each Approver in that Team must approve the Opportunity Summary fields individually

  @SF-656 @SF-656-UI-002 @p1 @approval-routing @us
  Scenario: US Member Operating Region routes to US Executive approvers
    Given an Opportunity Summary approval request is submitted with Members Operating Region "US"
    Then the approval must be routed to US Executive Team approvers (Aaron DiCaprio - MRD, Rich Koehler - Head of Distribution, Steve Strauss - CUO, Hugh Burgess - CUO)

  @SF-656 @SF-656-UI-003 @p1 @approval-routing @uk
  Scenario: UK Member Operating Region routes to UK Executive approvers
    Given an Opportunity Summary approval request is submitted with Members Operating Region "UK"
    Then the approval must be routed to UK Executive Team approvers (Matthew Wood - Head of Distribution, Nick Brown - CUO)

  @SF-656 @SF-656-UI-004 @p1 @approval-routing @eu
  Scenario: EU Member Operating Region routes to EU Executive approvers
    Given an Opportunity Summary approval request is submitted with Members Operating Region "EU"
    Then the approval must be routed to EU Executive Team approvers (Gabriella Engstrand - Head of Distribution, Raquel Reneses - CUO)

  @SF-656 @SF-656-UI-005 @p1 @approval-routing @ca
  Scenario: CA Member Operating Region routes to CA Executive approvers
    Given an Opportunity Summary approval request is submitted with Members Operating Region "CA"
    Then the approval must be routed to CA Executive Team approvers (Esaïe Djossou - Head of Distribution, Joy Parkes - CUO)

  @SF-656 @SF-656-UI-006 @p1 @approval-routing @uk-and-eu
  Scenario: UK and EU Member Operating Region routes to UK/EU Executive approvers
    Given an Opportunity Summary approval request is submitted with Members Operating Region "UK and EU"
    Then the approval must be routed to UK and EU Executive Team approvers (Matthew Wood - Head of Distribution, Nick Brown - CUO)

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: Reminder if approval not completed within 5 working days
  # ══════════════════════════════════════════════════════════════════════════

  @SF-656 @SF-656-UI-007 @p2 @reminder @notifications
  Scenario: Reminder sent when approval pending for 5 working days
    Given an Opportunity Summary approval request has been submitted
    And the approval status is "Pending"
    And the approval has been pending for 5 working days (Monday - Friday, ignore holidays)
    When the approval has not been approved, returned for update or rejected
    Then a reminder notification must be sent to the assigned Executive approver(s)
    And the reminder must include:
      | Content                    |
      | Opportunity name           |
      | Link to the Opportunity record |
      | Link to the approval request   |
      | Number of days the approval has been pending |
    And the approval must remain in status "Pending"

  @SF-656 @SF-656-UI-008 @p2 @reminder
  Scenario: No reminder before 5 working days
    Given an Opportunity Summary approval request has been submitted
    And the approval status is "Pending"
    And the approval has been pending for fewer than 5 working days
    When the approval has not been approved
    Then a reminder notification must not yet be sent to the assigned Executive approver(s)
