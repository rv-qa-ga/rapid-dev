# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-516 - Autonumber for Account Team Members
# Type: Story | Status: In QA | Priority: Medium
# Feature Type: auto-population
# Generated: 2025-12-19T15:09:05.978Z (FeatureGenerator v3.1)
# ══════════════════════════════════════════════════════════════════════════════
#
# ═══════════════════════════════════════════════════════════════════════════
# SUMMARY OF UNDERSTANDING
# ═══════════════════════════════════════════════════════════════════════════
#
# Overview: Autonumber for Account Team Members
# Primary Entity: Contact
#
# Test Requirements (6):
#   REQ-1: Create hidden auto-number field on Account Team Member
#     → Test Type: UI | Priority: p1
#   REQ-2: Field visibility
#     → Test Type: UI | Priority: p2
#   REQ-3: Integration availability
#     → Test Type: BOTH | Priority: p2
#   REQ-4: Continuation from Dataverse numbering
#     → Test Type: BOTH | Priority: p2
#   REQ-5: Uniqueness and immutability
#     → Test Type: BOTH | Priority: p2
#   REQ-6: to be removed from this story and tested with corresponding mappi
#     → Test Type: API | Priority: p2
#
# ═══════════════════════════════════════════════════════════════════════════
#
# NEGATIVE/BOUNDARY SCENARIOS:
#   - Invalid values rejected
#   - Permission-based access control
#   - Blank/null value handling
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-516 @medium @auto-populate @field-mapping @contact
Feature: SF-516 - Autonumber for Account Team Members
  As a Salesforce user
  I want to verify the Internal_Contact_Master_ID__c functionality on Contact
  So that Contact records are managed correctly

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # ACCEPTANCE CRITERIA SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-516 @SF-516-UI-001
  Scenario: Create hidden auto-number field on Account Team Member
    Given I am logged in as a standard user
    Given The Account Team Member object exists
    Given A new field with API name "Internal_Contact_Master_ID__c"
    Given Label Name “Internal Contact Master ID” is created
    Given It must use the Auto Number data type
    Given Follow the display format "IC- {000000}"
    Given Auto-increment sequentially for each new record created
    When A new field with API name "Internal_Contact_Master_ID__c"
    When Label Name “Internal Contact Master ID” is created
    When It must use the Auto Number data type
    When Follow the display format "IC- {000000}"
    When Auto-increment sequentially for each new record created
    Then It must use the Auto Number data type
    Then Follow the display format "IC- {000000}"
    Then Auto-increment sequentially for each new record created
    Then Label Name “Internal Contact Master ID” is created
    Then Follow the display format "IC- {000000}"
    Then Auto-increment sequentially for each new record created
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-002 @negative
  Scenario: Field visibility
    Given I am logged in as a standard user
    And I navigate to the Account record
    Given The "Internal_Contact_Master_ID__c" field must not be visible on any page layout
    Given The field must not be editable by users
    Then The "Internal_Contact_Master_ID__c" field must not be visible on any page layout
    Then The field must not be editable by users
    Then The field must not be editable by users
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-003 @data-driven @integration-or-reporting
  Scenario: Integration availability
    Given I am logged in as a "Integration Or Reporting" user
    Given Integration or reporting users query the Account Team Member object (API, MuleSoft, etc.)
    Given The "Internal_Contact_Master_ID__c" field must be available in the API
    Given Exportable downstream
    Then The "Internal_Contact_Master_ID__c" field must be available in the API
    Then Exportable downstream
    Then Exportable downstream
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-004
  Scenario: Continuation from Dataverse numbering
    Given I am logged in as a standard user
    Given The last number generated in Dataverse was known
    Given The Salesforce auto-number field is configured
    Given The starting number in Salesforce must continue from that sequence
    Given Subsequent records must increment sequentially from that point
    Given Example
    Given | Last Dataverse Value | Next Salesforce Value |
    Given | IC-000257             | IC-000258            |
    When The Salesforce auto-number field is configured
    When The starting number in Salesforce must continue from that sequence
    When Subsequent records must increment sequentially from that point
    When Example
    When | Last Dataverse Value | Next Salesforce Value |
    When | IC-000257             | IC-000258            |
    Then The starting number in Salesforce must continue from that sequence
    Then Subsequent records must increment sequentially from that point
    Then Example
    Then | Last Dataverse Value | Next Salesforce Value |
    Then | IC-000257             | IC-000258            |
    Then Subsequent records must increment sequentially from that point
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-005 @record-already-has-an-internal-contact-master-id-value-when-any
  Scenario: Uniqueness and immutability
    Given I am logged in as a "Record Already Has An Internal Contact Master Id Value When Any" user
    Given A record already has an Internal Contact Master ID value
    Given Any user or system attempts to update it
    And the "{fieldName}" field should not be visible or should be read-only
    Given Unchangeable after creation
    When Any user or system attempts to update it
    And the "{fieldName}" field should not be visible or should be read-only
    When Unchangeable after creation
    Then the "{fieldName}" field should not be visible or should be read-only
    Then Unchangeable after creation
    Then Unchangeable after creation
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-006 @data-driven @verify-field-access-to-integration
  Scenario: to be removed from this story and tested with corresponding mapping story. @@Abby Parker
    Given I am logged in as a "Verify Field Access To Integration" user
    Then Components : Custom Field : Internal_Contact_Master_ID__cPSG : Accelerant - Distribution Team MemberOnce deployed, verify Field access to Integration profile
    Then Commit succeeded: https://app.gearset.com/finished?deploymentId=4e37cdc8-83dd-42a3-97d2-df3994e2450fCommit notes: Source: Dev (gearsetintegration@accelins.com.sbxcmn)
    Then :check_mark: Successfully merged PR #41 from gs-pipeline/SF-516/Autonumber-for-Account-Team-Members_-_QA into QA
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD VISIBILITY: Internal_Contact_Master_ID__c on Contact
  # ══════════════════════════════════════════════════════════════════════════

  @SF-516 @SF-516-UI-007 @smoke @p1 @admin
  Scenario: Verify Internal_Contact_Master_ID__c is visible for admin users
    Given I am logged in as an admin user
    And I have an existing Contact record
    When I navigate to the Contact record
    Then the "Internal_Contact_Master_ID__c" field should be visible
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-008 @p1 @standard-user @negative
  Scenario: Verify Internal_Contact_Master_ID__c is NOT visible for standard users
    Given I am logged in as a standard user
    And I have an existing Contact record
    When I navigate to the Contact record
    Then the "Internal_Contact_Master_ID__c" field should not be visible
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-009 @p2 @detail-view
  Scenario: Verify Internal_Contact_Master_ID__c visibility on Contact detail page
    Given I am logged in as a standard user
    And I have an existing Contact record
    When I navigate to the Contact record
    Then the "Internal_Contact_Master_ID__c" field should be visible in the details section
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # GENERAL SCENARIOS: Internal_Contact_Master_ID__c on Contact
  # ══════════════════════════════════════════════════════════════════════════

  @SF-516 @SF-516-UI-010 @smoke @p1
  Scenario: Verify Internal_Contact_Master_ID__c field is visible on Contact
    Given I am logged in as a standard user
    And I have an existing Contact record
    When I navigate to the Contact record
    Then the "Internal_Contact_Master_ID__c" field should be visible
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-011 @p1 @edit
  Scenario: Verify Internal_Contact_Master_ID__c field can be edited on Contact
    Given I am logged in as a standard user
    And I have an existing Contact record
    When I navigate to the Contact record
    And I click Edit on the Contact
    And I set the "Internal_Contact_Master_ID__c" field to "Test Value"
    And I save the record
    Then the Contact should be saved successfully
    And the "Internal_Contact_Master_ID__c" field should display "Test Value"
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # FIELD BEHAVIOR: Internal_Contact_Master_ID__c on Contact
  # ══════════════════════════════════════════════════════════════════════════

  @SF-516 @SF-516-UI-012 @smoke @p1 @read-only
  Scenario: Verify Internal_Contact_Master_ID__c is read-only on Contact
    Given I am logged in as a standard user
    And I have an existing Contact record
    When I navigate to the Contact record
    And I click Edit on the Contact
    Then the "Internal_Contact_Master_ID__c" field should not be editable
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-013 @p1 @negative
  Scenario: Verify user cannot modify Internal_Contact_Master_ID__c after Contact creation
    Given I am logged in as a standard user
    And I have an existing Contact record
    When I navigate to the Contact record
    And I click Edit on the Contact
    Then the "Internal_Contact_Master_ID__c" field should be read-only
    And attempting to edit the Internal_Contact_Master_ID__c should not be possible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # AUTO-POPULATION: Internal_Contact_Master_ID__c from Account to Contact
  # ══════════════════════════════════════════════════════════════════════════

  @SF-516 @SF-516-UI-014 @smoke @p1 @auto-populate
  Scenario: Verify Internal_Contact_Master_ID__c auto-populates from Account to Contact
    Given I am logged in as a standard user
    And I have a test Account created via API with:
      | field   | value    |
      | Internal_Contact_Master_ID__c | EU       |
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    Then the "Internal_Contact_Master_ID__c" field should display "EU"
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-015 @p1 @read-only
  Scenario: Verify Internal_Contact_Master_ID__c is NOT editable on Contact after creation
    Given I am logged in as a standard user
    And I have a test Account created via API with Internal_Contact_Master_ID__c "UK"
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    And I click Edit on the Contact
    Then the "Internal_Contact_Master_ID__c" field should not be editable
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-016 @p1 @visibility
  Scenario: Verify Internal_Contact_Master_ID__c field is visible on Contact
    Given I am logged in as a standard user
    And I have a test Account created via API with Internal_Contact_Master_ID__c "US"
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    Then the "Internal_Contact_Master_ID__c" field should be visible
    And the "Internal_Contact_Master_ID__c" field should display "US"
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-017 @p2 @exact-match
  Scenario: Verify Internal_Contact_Master_ID__c value matches exactly from Account
    Given I am logged in as a standard user
    And I have a test Account created via API with Internal_Contact_Master_ID__c "APAC"
    And I have a test Contact created via API for the Account
    When I navigate to the Contact record
    Then the "Internal_Contact_Master_ID__c" field should display "APAC"
    And the Internal_Contact_Master_ID__c value should match exactly what was on the Account
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # NEGATIVE / BOUNDARY SCENARIOS
  # ══════════════════════════════════════════════════════════════════════════

  @SF-516 @SF-516-UI-018 @p2 @negative @blank-value
  Scenario: Verify behavior when Internal_Contact_Master_ID__c is blank
    Given I am logged in as a standard user
    And I have a test Contact created via API without "Internal_Contact_Master_ID__c"
    When I navigate to the Contact record
    Then the "Internal_Contact_Master_ID__c" field should be visible
    And the "Internal_Contact_Master_ID__c" field should be blank or empty
    And I take a screenshot as evidence

  @SF-516 @SF-516-UI-019 @p2 @negative @permissions
  Scenario: Verify restricted user cannot modify Internal_Contact_Master_ID__c
    Given I am logged in as a read-only user
    And I have a test Contact created via API
    When I navigate to the Contact record
    Then the Edit button should not be visible
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UI DATA CREATION (V3.0 Requirement)
  # ══════════════════════════════════════════════════════════════════════════

  @SF-516 @SF-516-UI-020 @p2 @ui-data-creation
  Scenario: Create Contact record via UI
    Given I am logged in as a standard user
    When I navigate to the Contact object list
    And I click New to create a Contact
    And I fill in required Contact fields
    And I save the record
    Then the Contact should be created successfully
    And I take a screenshot as evidence


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 COVERAGE ANALYSIS (Based on Summary of Understanding)
  # ══════════════════════════════════════════════════════════════════════════
  # Total Requirements: 5
  # Covered Requirements: 3
  # Coverage: 60%

  # ⚠️  UNCOVERED REQUIREMENTS (2):
  #   REQ-3: Integration availability
  #     → Should be tested via BOTH | Priority: p2
  #   REQ-5: Uniqueness and immutability
  #     → Should be tested via BOTH | Priority: p2


  # ══════════════════════════════════════════════════════════════════════════
  # V3.0 STEP DEFINITION ANALYSIS
  # ══════════════════════════════════════════════════════════════════════════
  # Total Steps Analyzed: 155
  # Existing Steps Used: 155
  # Missing Steps: 0

  # ✅ All steps use existing step definitions!

  # Step Reuse Statistics:
  #   - Common Steps Used: 155/155 (100%)
  #   - Feature-Specific Steps Used: 0
