# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-872 / SF-1015 — Product reference objects in Lightning (creation scope)
#
# SF-872 validates that each custom object is usable in the UI (list + new record).
# Excel migration payloads are not read or asserted here — data load is a separate concern.
#
# After each scenario: HTML Expected vs Actual report under reports/sf872/.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-872 @SF-1015 @rbt @medium @product-reference-data @governance
Feature: UI - SF-872 - Product reference object creation (Lightning reachability)

  As a Data Governance user or System Administrator
  I want each SF-872 reference object to open in Lightning list and new-record flows
  So that object creation is smoke-tested without migration data verification

  @SF-872 @SF-872-UI-001 @p1 @smoke
  Scenario: UI - Sub_Product__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "Sub_Product__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-872 @SF-872-UI-002 @p1 @smoke
  Scenario: UI - POG_Product__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "POG_Product__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-872 @SF-872-UI-003 @p1 @smoke
  Scenario: UI - OSFI__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "OSFI__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-872 @SF-872-UI-004 @p1 @smoke
  Scenario: UI - Member_Product_and_Program__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "Member_Product_and_Program__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-872 @SF-872-UI-005 @p1 @smoke
  Scenario: UI - Line_of_Business__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "Line_of_Business__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-872 @SF-872-UI-006 @p1 @smoke
  Scenario: UI - Classes_of_Business__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "Classes_of_Business__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-872 @SF-872-UI-007 @p1 @smoke
  Scenario: UI - BEGAAP_COB__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "BEGAAP_COB__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-872 @SF-872-UI-008 @p1 @smoke
  Scenario: UI - ASLOB__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "ASLOB__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-872 @SF-872-UI-009 @p1 @smoke
  Scenario: UI - Solvency_II__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "Solvency_II__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence

  @SF-1015 @SF-872-UI-010 @p1 @smoke
  Scenario: UI - Insurance_Product__c Lightning list and new form reachable
    Given I am logged in as a "System Administrator" user
    When I verify Lightning list and new form for SF-872 custom object "Insurance_Product__c"
    Then I write the SF-872 UI object creation verification report
    And the SF-872 Lightning object creation checks should pass
    And I take a screenshot as evidence
