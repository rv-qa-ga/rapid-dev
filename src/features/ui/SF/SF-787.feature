# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-787 - Publish Platform Events for Product Maps (UI approval paths)
# Use when API cannot drive approval / reapproval on qamerge.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-787 @product-map @platform-events @integration @rbt @medium
Feature: UI - SF-787 - Product Map approval and platform event eligibility
  As a product map approver
  I want approval actions to respect RDM visibility rules for Product Maps
  So that only eligible records sync to downstream systems

  @SF-787 @SF-787-UI-001 @p1 @approval
  Scenario: UI - Submit and approve Draft Product Map for RDM Create path
    Given I am logged into Salesforce as a Product Map approver for SF-787
    When I submit a Draft Product_Map__c for approval in the UI
    And I approve the SF-787 Product Map in the UI
    Then the Product Map should be approved in Salesforce
    And a Product Map platform Create event should be published for RDM integration

  @SF-787 @SF-787-UI-002 @p1 @negative @pending-step-def
  Scenario: UI - Edit approved Draft Product Map without reapproval does not sync to RDM
    Given I am logged into Salesforce as a Product Map editor for SF-787
    Given an approved Draft Product_Map__c exists in RDM for SF-787
    When I edit the Product Map in the UI without reapproval
    And I save the SF-787 Product Map in the UI
    Then no Product Map platform Update event should be published for RDM integration

  @SF-787 @SF-787-UI-003 @p1 @approval @negative
  Scenario: UI - Approve Active - Pending Go-Live Product Map does not create or update RDM
    Given I am logged into Salesforce as a Product Map approver for SF-787
    Given a Product_Map__c exists with Status "Active - Pending Go-Live" in the UI
    When I approve the SF-787 Product Map in the UI
    Then the Product Map should remain not visible in RDM
    And no Product Map platform event should be published for RDM integration
