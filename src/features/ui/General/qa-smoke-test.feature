# ══════════════════════════════════════════════════════════════════════════════
# QA Smoke Test - Basic Functionality Verification
# Purpose: Verify basic system functionality and object access for QA MRD User
# Type: Smoke Test | Priority: P1
# Related Jira: SF-699
# Updated: 2026-03-11
# ══════════════════════════════════════════════════════════════════════════════
#
# BUILD VALIDATION (post-deploy / Gearset):
#   Use tag @build-validation for minimal, robust checks after each deployment.
#   Runs: Login + navigate to key object lists only (no UI record creation).
#   Command: npm run test:uat:build-validation  (or --tags "@build-validation")
#   Goal: Confirm deployment did not break auth or object access (~1–2 min).
#
# FULL SMOKE (@smoke):
#   All scenarios below, including UI record creation (Lead, Opportunity, etc.).
#   Use for manual QA or when you need higher confidence. Record names use
#   "UAT Smoke - {date} - {objectType} {timestamp}"; records are NOT deleted.
#
# CROSS-SYSTEM API SMOKE (Salesforce Account + API read-back + MuleSoft + Dynamics):
#   src/features/api/e2e/qa-smoke-cross-system-api.feature
#   (Not in this file: UI Background would break an API-only chain.)
#   Run: npm run test:e2e:sf-mule-d365:<ENV>  (script uses qamerge; override ENV as needed)
#
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @smoke @qa @mrd-user
Feature: QA Smoke Test - Basic Functionality Verification
  As a QA MRD User
  I want to verify basic system functionality and object access
  So that I can confirm the system is operational and accessible

  Background:
    Given I am an authenticated Salesforce user

  # ══════════════════════════════════════════════════════════════════════════
  # LOGIN VERIFICATION (included in build-validation)
  # ══════════════════════════════════════════════════════════════════════════

  @smoke @p1 @login @build-validation @SF-699 @SMOKE-001
  Scenario: Verify QA MRD User can successfully log into Salesforce
    Given I am logged in as a "QA MRD User" user
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # OBJECT ACCESS VERIFICATION (included in build-validation – no record create)
  # ══════════════════════════════════════════════════════════════════════════

  @smoke @p1 @object-access @build-validation @SF-699 @SMOKE-002
  Scenario: Verify QA MRD User has access to Leads object
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    Then I take a screenshot as evidence

  @smoke @p1 @object-access @build-validation @SF-699 @SMOKE-003
  Scenario: Verify QA MRD User has access to Opportunities object
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Opportunity object list
    Then I take a screenshot as evidence

  @smoke @p1 @object-access @build-validation @SF-699 @SMOKE-004
  Scenario: Verify QA MRD User has access to Accounts object
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    Then I take a screenshot as evidence

  @smoke @p1 @object-access @build-validation @SF-699 @SMOKE-005
  Scenario: Verify QA MRD User has access to Contacts object
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Contact object list
    Then I take a screenshot as evidence

  @smoke @p1 @object-access @build-validation @SF-699 @SMOKE-006
  Scenario: Verify QA MRD User has access to Country__c object
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Country__c object list
    Then I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # RECORD CREATION VERIFICATION (full smoke only – not in build-validation)
  # ══════════════════════════════════════════════════════════════════════════

  @smoke @p1 @ui-data-creation @SF-699 @SMOKE-007 @skip
  # Skipped: UI Lead create is flaky in UAT (Lead Type/Status required fields).
  # Use API equivalent (SMOKE-API-001) or run manually.
  Scenario: Verify QA MRD User can create a Lead record via UI
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I set the "Company" field to a smoke test name for Lead
    And I set the "Last Name" field to a smoke test name for Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence

  @smoke @p1 @ui-data-creation @SF-699 @SMOKE-008 @skip
  # Skipped: UI Opportunity create is flaky in UAT (Stage/Close Date fields).
  # Use API equivalent (SMOKE-API-005) or run manually.
  Scenario: Verify QA MRD User can create an Opportunity record via UI
    Given I am logged in as a "QA MRD User" user
    And an Account exists via API for smoke test
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    And I select the smoke test Account in the Account lookup
    And I set the "Opportunity Name" field to a smoke test name for Opportunity
    And I fill in required Opportunity fields
    And I save the record
    Then the Opportunity should be created successfully
    And I take a screenshot as evidence

  @smoke @p1 @ui-data-creation @SF-699 @SMOKE-009
  Scenario: Verify QA MRD User can create an Account record via UI
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I set the "Account Name" field to a smoke test name for Account
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence

  @smoke @p1 @ui-data-creation @SF-699 @SMOKE-010
  Scenario: Verify QA MRD User can create a Contact record via UI
    Given I am logged in as a "QA MRD User" user
    And an Account exists via API for smoke test
    When I navigate to the Contact object list
    And I click New to create a Contact
    And I select the smoke test Account in the Account lookup
    And I set the "Last Name" field to a smoke test name for Contact
    And I fill in required Contact fields
    And I save the record
    Then the Contact should be created successfully
    And I take a screenshot as evidence

  # ══════════════════════════════════════════════════════════════════════════
  # UAT DATA SEED - extended smoke (full record creation, persisted)
  # Tag: @uat-smoke-data   Command: npm run test:uat:smoke-data
  # Not included in @build-validation (Gearset webhook) or default @smoke.
  #
  # Two sections below:
  #   A) UI CREATION  (19 scenarios) - create via Salesforce UI as QA MRD /
  #                                    Data Governance user, record persists.
  #   B) API CREATION (19 scenarios) - create via REST API (JWT), record persists.
  #
  # MGA focus: Account scenarios cover Type = Member MGA and Non-Member MGA.
  # Prereq Accounts (for Contact, Opp, Teams, MLER) default to Type = Member.
  # Product reference objects (SF-872) use the Data Governance user.
  # ══════════════════════════════════════════════════════════════════════════

  # ──────────────────────────────────────────────────────────────────────────
  # A) UI CREATION - @uat-smoke-data @uat-smoke-ui
  # ──────────────────────────────────────────────────────────────────────────

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-001 @skip
  # Skipped: UI Lead create is flaky in UAT (Lead Type/Status required fields).
  # Use API equivalent (SMOKE-API-001) or run manually.
  Scenario: UAT Data UI - Create Lead record
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Lead object list
    And I click New to create a Lead
    And I set the "Company" field to a smoke test name for Lead
    And I set the "Last Name" field to a smoke test name for Lead
    And I fill in required Lead fields
    And I save the record
    Then the Lead should be created successfully
    And I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-002
  Scenario: UAT Data UI - Create Contact record (prereq Account via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have a test Account created via API with Type "Member"
    And I am logged in as a "QA MRD User" user
    When I navigate to the Contact object list
    And I click New to create a Contact
    And I select the smoke test Account in the Account lookup
    And I set the "Last Name" field to a smoke test name for Contact
    And I fill in required Contact fields
    And I save the record
    Then the Contact should be created successfully
    And I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-003
  Scenario: UAT Data UI - Create Account record (Type = Member MGA)
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I set the "Account Name" field to a smoke test name for Account
    And I set the "Type" field to "Member MGA"
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-004
  Scenario: UAT Data UI - Create Account record (Type = Non-Member MGA)
    Given I am logged in as a "QA MRD User" user
    When I navigate to the Account object list
    And I click New to create a Account
    And I set the "Account Name" field to a smoke test name for Account
    And I set the "Type" field to "Non - Member MGA"
    And I fill in required Account fields
    And I save the record
    Then the Account should be created successfully
    And I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-005 @skip
  # Skipped: UI Opportunity create is flaky in UAT (Stage/Close Date fields).
  # Use API equivalent (SMOKE-API-005) or run manually.
  Scenario: UAT Data UI - Create Opportunity record (prereq Account via API)
    Given I have a valid Salesforce API token as QA MRD user
    And an Account exists via API for smoke test
    And I am logged in as a "QA MRD User" user
    When I navigate to the Opportunity object list
    And I click New to create a Opportunity
    And I select the smoke test Account in the Account lookup
    And I set the "Opportunity Name" field to a smoke test name for Opportunity
    And I fill in required Opportunity fields
    And I save the record
    Then the Opportunity should be created successfully
    And I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-006
  Scenario: UAT Data UI - Create Opportunity Readiness record (prereq Opp via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have a test Account created via API with Type "Member"
    And I have a test Opportunity created via API for the Account
    And I am logged in as a "QA MRD User" user
    When I navigate to the Opportunity_Readiness__c object list
    And I click New to create a Opportunity_Readiness__c
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-007
  Scenario: UAT Data UI - Create Member Legal Entity Relationship record (prereq 2 Accounts via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have two test Accounts created via API for UAT smoke MLER
    And I am logged in as a "QA MRD User" user
    When I navigate to the Member_Legal_Entity_Relationship__c object list
    And I click New to create a Member_Legal_Entity_Relationship__c
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-008
  Scenario: UAT Data UI - Create Account Team Member (prereq Account via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have a test Account created via API with Type "Member"
    And I am logged in as a "QA MRD User" user
    When I navigate to the AccountTeamMember object list
    And I click New to create a AccountTeamMember
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-009
  Scenario: UAT Data UI - Create Opportunity Team Member (prereq Opp via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have a test Account created via API with Type "Member"
    And I have a test Opportunity created via API for the Account
    And I am logged in as a "QA MRD User" user
    When I navigate to the OpportunityTeamMember object list
    And I click New to create a OpportunityTeamMember
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SMOKE-UI-010
  Scenario: UAT Data UI - Create Country record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the Country__c object list
    And I click New to create a Country__c
    And I set the "Name" field to a smoke test name for Country
    And I save the record
    Then I take a screenshot as evidence

  # Product reference objects (SF-872) - use Data Governance user
  # NOTE: UI scenarios below are @skip - page layouts / required fields for these
  # custom objects differ per org and are covered more reliably via API
  # (SMOKE-API-011..019). Remove @skip once FieldRegistry entries exist.

  @uat-smoke-data @uat-smoke-ui @SF-699 @SF-872 @SMOKE-UI-011 @skip
  Scenario: UAT Data UI - Create ASLOB record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the ASLOB__c object list
    And I click New to create a ASLOB__c
    And I set the "Name" field to a smoke test name for ASLOB
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SF-872 @SMOKE-UI-012 @skip
  Scenario: UAT Data UI - Create Sub Product record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the Sub_Product__c object list
    And I click New to create a Sub_Product__c
    And I set the "Name" field to a smoke test name for SubProduct
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SF-872 @SMOKE-UI-013 @skip
  Scenario: UAT Data UI - Create BEGAAP COB record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the BEGAAP_COB__c object list
    And I click New to create a BEGAAP_COB__c
    And I set the "Name" field to a smoke test name for BEGAAPCOB
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SF-872 @SMOKE-UI-014 @skip
  Scenario: UAT Data UI - Create Classes of Business record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the Classes_of_Business__c object list
    And I click New to create a Classes_of_Business__c
    And I set the "Name" field to a smoke test name for ClassesOfBusiness
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SF-872 @SMOKE-UI-015 @skip
  Scenario: UAT Data UI - Create Insurance Product record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the Insurance_Product__c object list
    And I click New to create a Insurance_Product__c
    And I set the "Name" field to a smoke test name for InsuranceProduct
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SF-872 @SMOKE-UI-016 @skip
  Scenario: UAT Data UI - Create OSFI record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the OSFI__c object list
    And I click New to create a OSFI__c
    And I set the "Name" field to a smoke test name for OSFI
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SF-872 @SMOKE-UI-017 @skip
  Scenario: UAT Data UI - Create POG Product record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the POG_Product__c object list
    And I click New to create a POG_Product__c
    And I set the "Name" field to a smoke test name for POGProduct
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SF-872 @SMOKE-UI-018 @skip
  Scenario: UAT Data UI - Create Line of Business record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the Line_of_Business__c object list
    And I click New to create a Line_of_Business__c
    And I set the "Name" field to a smoke test name for LineOfBusiness
    And I save the record
    Then I take a screenshot as evidence

  @uat-smoke-data @uat-smoke-ui @SF-699 @SF-872 @SMOKE-UI-019 @skip
  Scenario: UAT Data UI - Create Solvency II record (Data Governance user)
    Given I am logged in as a "Data Governance" user
    When I navigate to the Solvency_II__c object list
    And I click New to create a Solvency_II__c
    And I set the "Name" field to a smoke test name for SolvencyII
    And I save the record
    Then I take a screenshot as evidence

  # ──────────────────────────────────────────────────────────────────────────
  # B) API CREATION - @uat-smoke-data @uat-smoke-api
  # ──────────────────────────────────────────────────────────────────────────

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-001
  Scenario: UAT Data API - Create Lead record
    Given I have a valid Salesforce API token as QA MRD user
    When I have a test Lead created via API
    Then the Lead should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-002
  Scenario: UAT Data API - Create Contact record (prereq Account via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have a test Account created via API with Type "Member"
    When I have a test Contact created via API
    Then the Contact should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-003
  Scenario: UAT Data API - Create Account record (Type = Member MGA)
    Given I have a valid Salesforce API token as QA MRD user
    When I have a test Account created via API with Type "Member MGA"
    Then the Account should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-004
  Scenario: UAT Data API - Create Account record (Type = Non-Member MGA)
    Given I have a valid Salesforce API token as QA MRD user
    When I have a test Account created via API with Type "Non-Member MGA"
    Then the Account should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-005
  Scenario: UAT Data API - Create Opportunity record (prereq Account via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have a test Account created via API with Type "Member"
    When I have a test Opportunity created via API for the Account
    Then the Opportunity should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-006
  Scenario: UAT Data API - Create Opportunity Readiness record (prereq Opp via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have a test Account created via API with Type "Member"
    And I have a test Opportunity created via API for the Account
    When the Opportunity has an Opportunity Readiness record
    Then the Opportunity should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-007
  Scenario: UAT Data API - Create Member Legal Entity Relationship (prereq 2 Accounts via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have two test Accounts created via API for UAT smoke MLER
    When I create a Member Legal Entity Relationship record via API for UAT smoke
    Then the UAT smoke record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-008
  Scenario: UAT Data API - Create Account Team Member (prereq Account via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have a test Account created via API with Type "Member"
    When a new Account Team Member is created in Salesforce for the Account
    Then the Account should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-009
  Scenario: UAT Data API - Create Opportunity Team Member (prereq Opp via API)
    Given I have a valid Salesforce API token as QA MRD user
    And I have a test Account created via API with Type "Member"
    And I have a test Opportunity created via API for the Account
    When I create an Opportunity Team Member record via API for UAT smoke
    Then the UAT smoke record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SMOKE-API-010
  Scenario: UAT Data API - Create Country record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create a Country__c record via API for UAT smoke
    Then the UAT smoke record should be created successfully

  # Product reference objects (SF-872) - use Data Governance user via JWT

  @uat-smoke-data @uat-smoke-api @SF-699 @SF-872 @SMOKE-API-011
  Scenario: UAT Data API - Create ASLOB record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create an SF-872 reference test record for Salesforce object "ASLOB__c"
    Then the SF-872 reference test record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SF-872 @SMOKE-API-012
  Scenario: UAT Data API - Create Sub Product record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create an SF-872 reference test record for Salesforce object "Sub_Product__c"
    Then the SF-872 reference test record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SF-872 @SMOKE-API-013
  Scenario: UAT Data API - Create BEGAAP COB record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create an SF-872 reference test record for Salesforce object "BEGAAP_COB__c"
    Then the SF-872 reference test record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SF-872 @SMOKE-API-014
  Scenario: UAT Data API - Create Classes of Business record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create an SF-872 reference test record for Salesforce object "Classes_of_Business__c"
    Then the SF-872 reference test record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SF-872 @SMOKE-API-015
  Scenario: UAT Data API - Create Insurance Product record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create an SF-872 reference test record for Salesforce object "Insurance_Product__c"
    Then the SF-872 reference test record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SF-872 @SMOKE-API-016
  Scenario: UAT Data API - Create OSFI record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create an SF-872 reference test record for Salesforce object "OSFI__c"
    Then the SF-872 reference test record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SF-872 @SMOKE-API-017
  Scenario: UAT Data API - Create POG Product record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create an SF-872 reference test record for Salesforce object "POG_Product__c"
    Then the SF-872 reference test record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SF-872 @SMOKE-API-018
  Scenario: UAT Data API - Create Line of Business record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create an SF-872 reference test record for Salesforce object "Line_of_Business__c"
    Then the SF-872 reference test record should be created successfully

  @uat-smoke-data @uat-smoke-api @SF-699 @SF-872 @SMOKE-API-019
  Scenario: UAT Data API - Create Solvency II record (Data Governance user)
    Given I have a valid Salesforce API token as Data Governance user
    When I create an SF-872 reference test record for Salesforce object "Solvency_II__c"
    Then the SF-872 reference test record should be created successfully
