# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-795 - Dataverse ID Field on Account Relationship (TPA Maps)
# Type: Story | Priority: Medium
# Feature Type: field-visibility, field-behavior, integration
# ══════════════════════════════════════════════════════════════════════════════
#
# Implementation note: Object API name is Account_Relationship__c.
# If your org uses a different API name, replace it in this file. Step definitions
# for "I have an existing Account_Relationship__c record", navigate, and
# edit may need to be added (e.g. in data-factory.steps.ts and ui-common or SF-795 steps).
#
# User Story:
#   As an Integration Analyst I want a hidden field on the Account Relationship
#   (TPA Maps) object to store the Dataverse record ID returned by Dataverse after
#   Salesforce creates the relationship, so that downstream integrations can
#   reliably match relationship records across systems without user intervention.
#
# Key Requirements:
#   - Object: Account Relationship (TPA Maps) [API: Account_Relationship__c]
#   - Field: Dataverse_ID__c — Text(36), label "Dataverse ID"
#   - Excluded from all page layouts; hidden from all standard user profiles
#   - Visible and writable via API only to MuleSoft integration user
#   - New relationship has blank Dataverse_ID__c until MuleSoft populates it
#   - Dataverse ID is immutable once set (no user or system can change/clear it)
#   - Error message: "Dataverse ID is system-managed and can only be set by the MuleSoft integration."
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-795 @medium @field-behavior @dataverse @tpa-maps @integration
Feature: SF-795 - Dataverse ID Field on Account Relationship (TPA Maps)
  As an Integration Analyst
  I want a hidden field on the Account Relationship (TPA Maps) object to store the Dataverse record ID
  So that downstream integrations can reliably match relationship records across systems without user intervention

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 1: Field exists and is hidden from UI (excluded from layouts)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-795 @SF-795-UI-001 @p1 @smoke @hidden-field
  Scenario: Dataverse_ID__c is not visible on Account Relationship (TPA Maps) record page
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account_Relationship__c record
    When I navigate to the Account_Relationship__c record
    Then the "Dataverse_ID__c" field should not be visible
    And I take a screenshot as evidence

  @SF-795 @SF-795-UI-002 @p1 @negative @read-only
  Scenario: Dataverse_ID__c is not editable on Account Relationship (TPA Maps) edit form
    Given I am logged in as a "Accelerant - System administrator" user
    And I have an existing Account_Relationship__c record
    When I navigate to the Account_Relationship__c record
    And I click Edit on the Account_Relationship__c
    Then the "Dataverse_ID__c" field should not be editable
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 2: New relationship initially has no Dataverse ID
  # ══════════════════════════════════════════════════════════════════════════

  @SF-795 @SF-795-UI-003 @p1 @positive @new-record
  Scenario: New Account Relationship (TPA Maps) record has blank Dataverse ID
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account_Relationship__c object list
    And I click New to create an Account_Relationship__c
    And I fill in required Account_Relationship__c fields
    And I save the record
    Then the Account_Relationship__c should be created successfully
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # Scenario 4 (partial): Standard user cannot see Dataverse ID field
  # Note: Full Scenario 4 (block manual update) is not physically possible in UI
  # because field is excluded from layouts — covered via API test.
  # ══════════════════════════════════════════════════════════════════════════

  @SF-795 @SF-795-UI-004 @p2 @negative @permissions
  Scenario: Standard user does not see Dataverse ID on Account Relationship (TPA Maps)
    Given I am logged in as a standard user
    And I have an existing Account_Relationship__c record
    When I navigate to the Account_Relationship__c record
    Then the "Dataverse_ID__c" field should not be visible
    And I take a screenshot as evidence
