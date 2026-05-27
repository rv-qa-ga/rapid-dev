# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-722 - Clean Up Opportunity Fields
# Type: Story | Priority: Medium
# User story: As an MRD and Salesforce Admin – redundant Opportunity fields
#   removed or hidden from the Opportunity page layout.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-722 @medium @field-visibility @field-removal @opportunity
Feature: SF-722 - Clean Up Opportunity Fields
  As an MRD and Salesforce Admin
  I want redundant Opportunity fields removed or hidden from the Opportunity page layout
  So that the page is simplified for users while retaining data required for reporting

  Background:
    Given an Opportunity page layout exists with sections including:
      | section               |
      | Due Diligence Fields  |
      | Contract Detail Fields|
      | Pipeline Fields       |
      | Stage Duration Tracking |
    And the Opportunity contains the fields listed in this story

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 1: Delete obsolete fields from Due Diligence Fields section
  # ══════════════════════════════════════════════════════════════════════════

  @SF-722 @SF-722-UI-001 @p1 @smoke @positive
  Scenario: Delete obsolete fields from Due Diligence Fields section
    Given I am logged in as a "QA MRD User" user
    And any user views or edits an Opportunity
    When the Opportunity page layout is updated
    Then the following fields must be removed from the Opportunity page layout
    And the fields must be deleted from the Opportunity Object
    And the following fields are not present on the layout:
      | Compliance_Approval_Date__c     |
      | UnderwritingConsiderations__c  |
      | InsuranceCarrierOption__c      |
      | Proposed_Claims_TPA__c         |
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 2: Delete obsolete fields from Contract Detail Fields section
  # ══════════════════════════════════════════════════════════════════════════

  @SF-722 @SF-722-UI-002 @p1 @positive
  Scenario: Delete obsolete fields from Contract Detail Fields section
    Given I am logged in as a "QA Automation User" user
    And any user views or edits an Opportunity
    When the Opportunity page layout is updated
    Then the following fields must be removed from the Opportunity page layout
    And the fields must be deleted from the Opportunity Object
    And the following fields are not present on the layout:
      | First_Year_Estimated_Gross_Written_Premi__c |
      | Provisional_Commission__c                    |
      | Contingent_Profit_Commission_Schedule__c     |
      | UltimateLossRatioTarget__c                  |
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 3: Delete obsolete fields from Pipeline Fields section
  # ══════════════════════════════════════════════════════════════════════════

  @SF-722 @SF-722-UI-003 @p1 @positive
  Scenario: Delete obsolete fields from Pipeline Fields section
    Given I am logged in as a "QA MRD User" user
    And any user views or edits an Opportunity
    When the Opportunity page layout is updated
    Then the following fields must be removed from the Opportunity page layout
    And the fields must be deleted from the Opportunity Object
    And the following fields are not present on the layout:
      | Expected_Go_Live_Date__c        |
      | Expected_Start_Date__c          |
      | Expected_End_Date__c            |
      | MOU_Issued_Date__c              |
      | Declined_GWP__c                 |
      | Expected_First_Bordereau_Date__c|
      | Expressed_Interest__c           |
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 4: Rename field label in Pipeline Fields section
  # ══════════════════════════════════════════════════════════════════════════

  @SF-722 @SF-722-UI-004 @p1 @positive
  Scenario: Rename field label in Pipeline Fields section to Current Incumbent Expiration Date
    Given I am logged in as a "QA Automation User" user
    And any user views or edits an Opportunity
    And the Opportunity contains a field currently labelled Current Program Expiration Date (Current_Program_Expiration_Date__c)
    When the Opportunity page layout is updated
    Then the field label and API name must be changed to Current Incumbent Expiration Date
    And the same label update must also be applied to the corresponding Lead field on the Lead Object
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 5: Delete TerritoriesCovered__c from Opportunity
  # ══════════════════════════════════════════════════════════════════════════

  @SF-722 @SF-722-UI-005 @p1 @smoke @positive
  Scenario: Delete TerritoriesCovered__c from Opportunity
    Given I am logged in as a "QA MRD User" user
    And a user views or edits an Opportunity
    When the Opportunity page layout is updated
    Then the field TerritoriesCovered__c must be removed from the Opportunity page layout
    And the field must be deleted from the Opportunity Object
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # SCENARIO 6: Hide Stage Duration Tracking fields from UI but retain for reporting
  # ══════════════════════════════════════════════════════════════════════════

  @SF-722 @SF-722-UI-006 @p1 @positive
  Scenario: Hide Stage Duration Tracking section from UI but retain fields for reporting
    Given I am logged in as a "QA Automation User" user
    And an Opportunity page layout contains a section named Stage Duration Tracking
    When the Opportunity page layout is updated
    Then all fields within the Stage Duration Tracking section must be removed from the Opportunity page layout
    And the section header must be removed so it is no longer visible to users
    And the underlying fields must remain active in Salesforce
    And the fields must remain available for Reports, Dashboards, and Historical analysis
    And the fields must not be editable or visible to users via the Opportunity UI
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION
  # ══════════════════════════════════════════════════════════════════════════

  @SF-722 @SF-722-UI-007 @p2 @ui-data-creation
  Scenario: Create Opportunity record via UI
    Given I am logged in as a "QA Automation User" user
    When I navigate to the Opportunity object list
    And I click New to create an Opportunity
    And I fill in required Opportunity fields
    And I save the record
    Then the Opportunity should be created successfully
    And I take a screenshot as evidence
