# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-993 - Lead / Contact / Account field layout & defaulting cleanup
# Type: Story | Priority: per backlog
# Feature Type: field-visibility, defaults, layout
# Reference: https://accelins.atlassian.net/browse/SF-993
# ══════════════════════════════════════════════════════════════════════════════
#
# SF-993: Target_Insured_Revenue_Size__c is removed from UI; Target_Insured_Industry_Size__c
# remains a separate active field (see API feature for describe checks).
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-993 @medium @field-visibility @lead @account @contact
Feature: UI - SF-993 - Lead, Contact relationship, and Account layout cleanup

  Background:
    Given I am an authenticated Salesforce user
    # Test data (Lead / ACR) created via API uses QA MRD JWT when prerequisites run
    And I have a valid Salesforce API token as QA MRD user

  # ───────────────────────────────────────────────────────────────────────────
  # LEADS — mandatory indicator, default type, removed / redundant UI
  # ───────────────────────────────────────────────────────────────────────────

  @SF-993 @SF-993-UI-001 @p1 @smoke @lead @defaults
  Scenario: Lead creation — Type is marked mandatory and defaults to Member
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    Then "Type" is marked mandatory
    And the "Type__c" field should display "Member"
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-002 @p1 @lead @field-removal
  Scenario: Lead creation — removed Lead fields are not on the form
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    Then the "Proposed_Effective_Date__c" field should not be visible
    And the "Line_of_Business_Created__c" field should not be visible
    And the "Number_of_LOB_Created__c" field should not be visible
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-003 @p2 @lead @field-removal
  Scenario: Lead detail — removed Lead fields are not visible
    Given I am logged in as a "QA MRD User" user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Proposed_Effective_Date__c" field should not be visible
    And the "Line_of_Business_Created__c" field should not be visible
    And the "Number_of_LOB_Created__c" field should not be visible
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-004 @p1 @lead @validation @ui-create
  Scenario: Lead can be created from New with only required fields — removed fields not required by validation
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And no validation errors should be displayed
    And no validation errors should reference "Proposed_Effective_Date__c"
    And no validation errors should reference "Line_of_Business_Created__c"
    And no validation errors should reference "Number_of_LOB_Created__c"
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-005 @p2 @account @validation @ui-create
  Scenario: Member Account can be created from New with required fields only — layout-hidden fields not required on save
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    When I select Account Type "Member"
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And no validation errors should be displayed
    And no validation errors should reference "Target_Insured_Revenue_Size__c"
    And no validation errors should reference "Data_Source_Claims__c"
    And no validation errors should reference "Data_Source_Written__c"
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-006 @p2 @lead @redundant-components
  Scenario: Lead record — redundant standard components are not shown as sections
    Given I am logged in as a "QA MRD User" user
    And I have an existing Lead record
    When I navigate to the Lead record
    Then the "Action Plans" section should not be visible
    And the "Einstein Predictions" section should not be visible
    And I take a screenshot as evidence

  # ───────────────────────────────────────────────────────────────────────────
  # CONTACTS — Account Contact Relationship (relationship record UI)
  # ───────────────────────────────────────────────────────────────────────────

  @SF-993 @SF-993-UI-007 @p1 @accountcontactrelation @field-removal
  Scenario: Contact relationship record — compliance and license fields removed from UI
    Given I am logged in as a "QA MRD User" user
    And I have a test AccountContactRelation created via API
    When I navigate to the AccountContactRelation record
    Then the "Compliance_Certification_Date__c" field should not be visible
    And the "Compliance_Certification_Type__c" field should not be visible
    And the "Compliance_Certification_Status__c" field should not be visible
    And the "Regulatory_License_Expiration_Date__c" field should not be visible
    And the "Regulatory_License_Type__c" field should not be visible
    And the "Regulatory_License_Number__c" field should not be visible
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-008 @p2 @accountcontactrelation @field-removal
  Scenario: Contact relationship record — Authority Level removed from UI
    Given I am logged in as a "QA MRD User" user
    And I have a test AccountContactRelation created via API
    When I navigate to the AccountContactRelation record
    Then the "Authority_Level__c" field should not be visible
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-009 @p2 @accountcontactrelation @redundant-components
  Scenario: Contact relationship — Einstein Predictions not shown as a section
    Given I am logged in as a "QA MRD User" user
    And I have a test AccountContactRelation created via API
    When I navigate to the AccountContactRelation record
    Then the "Einstein Predictions" section should not be visible
    And I take a screenshot as evidence

  # ───────────────────────────────────────────────────────────────────────────
  # ACCOUNTS — defaults apply when fields are off layout; TPA section; Member Details
  # ───────────────────────────────────────────────────────────────────────────

  @SF-993 @SF-993-UI-010 @p1 @account @field-removal
  Scenario: Member Account creation — data source and period fields removed from layout
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    When I select Account Type "Member"
    Then the "Data_Source_Claims__c" field should not be visible
    And the "Data_Source_Written__c" field should not be visible
    And the "Written_Accounting_Period_Effective_From__c" field should not be visible
    And the "Claims_Production_Period_Effective_From__c" field should not be visible
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-011 @p1 @account @field-removal
  Scenario: Member Account creation — Target Insured Revenue removed from form; Industry remains visible
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    When I select Account Type "Member"
    Then the "Target_Insured_Revenue_Size__c" field should not be visible
    And the "Target_Insured_Industry_Size__c" field should be visible
    And the "Current_Program_Expiration_Date__c" field should not be visible
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-012 @p2 @account @field-removal
  Scenario: Member Account — TPA Details section is not on the page
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    When I select Account Type "Member"
    Then the "TPA Details" section should not be visible
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-013 @p2 @account @layout
  Scenario: Member Account creation — Member Previously Known As appears under Member Details
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create an Account
    When I select Account Type "Member"
    Then the "Member Details" section is visible
    And the "Member_Previously_Known_As_Name__c" field should be visible
    And I take a screenshot as evidence

  @SF-993 @SF-993-UI-014 @p2 @account @redundant-components
  Scenario: Member Account record — Einstein Predictions and Approval Work Items sections removed
    Given I am logged in as a "QA MRD User" user
    And I have an existing Account record
    When I navigate to the Account record
    Then the "Einstein Predictions" section should not be visible
    And the "Approval Work Items" section should not be visible
    And I take a screenshot as evidence

  # ───────────────────────────────────────────────────────────────────────────
  # NOTES (story) — stage gate copy on Lead; automate once exact heading/text is stable
  # ───────────────────────────────────────────────────────────────────────────

  @SF-993 @SF-993-UI-015 @p3 @manual @lead
  Scenario: Lead — stage progression notes list required fields per stage (manual until UI text is final)
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I take a screenshot as evidence
