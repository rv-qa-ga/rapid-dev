# ══════════════════════════════════════════════════════════════════════════════
# CLM Go-Live — Phase B: Lifecycle CHANGE validation — Salesforce → Dynamics (read verify)
# Run AFTER Phase A migration sign-off AND MuleSoft–Dynamics preprod connectivity is ready.
# Blocked: MuleSoft team + Dynamics preprod connectivity (not ready as of May 2026).
#
# Post-migration: Salesforce is MASTER; Dynamics preprod is READ-ONLY for mastered entities.
# Phase B must cover BOTH paths (see docs/clm/CLM_GO_LIVE_MIGRATION_INTEGRATION_TEST_PLAN.md):
#   B-L1  NEW record created in Salesforce → new correlated Dynamics row
#   B-L2  MIGRATED record updated in Salesforce → SAME Dynamics row updated (NOT implemented yet)
#   B-L3  Confirm no mastered lifecycle writes in Dynamics (manual / policy)
#
# GAP: B-L2 (update migrated rows) is NOT automated — @pending-step-def on CLM-GL-INT-020/021/022.
# Per-Jira packs (SF-736, …) partially cover B-L1 only.
# ══════════════════════════════════════════════════════════════════════════════

@clm-go-live @integration @salesforce_mastered @sf_to_d365 @int
Feature: CLM Go-Live - Salesforce mastered object lifecycle integration
  As a programme QA lead
  I want Create and Update lifecycle events for every mastered object to sync to Dynamics preprod
  So that PROD go-live does not regress near-real-time integration

  Background:
    Given I have valid API access to both Dynamics CRM and Salesforce

  @CLM-GL-INT-001 @p0 @smoke @e2e-smoke-sf-mulesoft-d365
  Scenario: Integration gate - cross-system API smoke on INT
    Given I have a valid Salesforce API token as QA MRD user
    Given I subscribe to Account Platform Events using the active Salesforce API session
    And I have a test Account created via API with Type "Member"
    Then the API account should be created successfully
    Then I should be able to retrieve the account by ID
    When I wait 15 seconds for Platform Event to be published
    When I log a summary of platform events from the Salesforce streaming subscription
    When I fetch and log MuleSoft log summaries for applications "sf-accounts-papi-qa" and "accl-dataverse-sys-api-qa"
    Given I unsubscribe from Account Platform Events
    Given I have a valid Dynamics 365 API token
    When I call the Dynamics WhoAmI endpoint
    Then the response status should be 200
    And the response should contain a valid UserId (GUID)
    When I log the cross-system trace summary for documentation

  # ── Per-object lifecycle — run linked feature files with ENV=int ───────────

  @CLM-GL-INT-010 @p0 @SF-736 @manual-checklist
  Scenario: Lifecycle - Account Create and Update sync (execute SF-736 API pack on INT)
    Given programme INT credentials are loaded from env file int
    When I run the automated feature pack tagged SF-736 against Salesforce INT
    Then all SF-736 API Create and Update scenarios should pass
    And Dynamics Party rows should reflect Salesforce Account changes for test records

  @CLM-GL-INT-011 @p0 @SF-769 @manual-checklist
  Scenario: Lifecycle - Member Legal Entity Group relationship sync (execute SF-769 on INT)
    Given programme INT credentials are loaded from env file int
    When I run the automated feature pack tagged SF-769 against Salesforce INT
    Then SF-769 platform event and optional Dataverse Member Maps assertions should pass

  @CLM-GL-INT-012 @p0 @SF-788 @manual-checklist
  Scenario: Lifecycle - TPA Maps Create and Update platform events (execute SF-788 on INT)
    Given programme INT credentials are loaded from env file int
    When I run the automated feature pack tagged SF-788 against Salesforce INT
    Then eligible TPA Map Create and Update events should publish per SF-788 acceptance criteria

  @CLM-GL-INT-013 @p1 @SF-796 @manual-checklist
  Scenario: Lifecycle - Product Map CMDT resolves Dataverse IDs for create and update payloads
    Given programme INT credentials are loaded from env file int
    When I run the automated feature pack tagged SF-796 against Salesforce INT
    Then Dataverse_Mapping__mdt should resolve Product Map picklist values for MuleSoft

  @CLM-GL-INT-014 @p1 @SF-872 @manual-checklist
  Scenario: Lifecycle - Product reference RDM CRU sync (execute SF-872 on INT)
    Given programme INT credentials are loaded from env file int
    When I run the automated feature pack tagged SF-872 against Salesforce INT
    Then product reference data create and update flows should meet SF-872 governance rules

  # B-L1 — net-new record after migration (create path). Not implemented — see test plan Phase B.
  @CLM-GL-INT-020 @p0 @pending-step-def @lifecycle-new-record
  Scenario Outline: Lifecycle B-L1 — New record created in Salesforce syncs to Dynamics
    Given CLM lifecycle test is configured for Jira "<jira>" object "<salesforceObject>"
    When I create a "<salesforceObject>" record in Salesforce INT with minimum required fields
    And I activate or qualify the record per integration eligibility rules
    Then the record should receive Dataverse_ID__c or equivalent correlation within the integration SLA
    And Dynamics preprod should contain a new correlated row for that Salesforce record

    Examples:
      | jira   | salesforceObject                  |
      | SF-736 | Account                           |
      | SF-737 | Contact                           |
      | SF-738 | Contact                           |
      | SF-739 | Country__c                        |
      | SF-769 | Member_Legal_Entity_Relationship__c |
      | SF-775 | TPA_Maps__c                       |

  # B-L2 — update on MIGRATED record (Dataverse_ID__c from Phase A). NOT DONE — programme gap.
  @CLM-GL-INT-021 @p0 @pending-step-def @lifecycle-migrated-update
  Scenario Outline: Lifecycle B-L2 — Update migrated Salesforce record syncs to existing Dynamics row
    Given CLM lifecycle test is configured for Jira "<jira>" object "<salesforceObject>"
    And a migrated "<salesforceObject>" record exists in Salesforce INT with Dataverse_ID__c populated
    When I update that migrated "<salesforceObject>" record with a traceable field change
    Then Dynamics preprod should reflect the update on the same correlated row without creating a duplicate

    Examples:
      | jira   | salesforceObject                  |
      | SF-737 | Contact                           |
      | SF-738 | Contact                           |
      | SF-739 | Country__c                        |
      | SF-766 | Sub_Product__c                    |
      | SF-767 | Product_Map__c                    |
      | SF-779 | Member_Product_and_Program__c     |
      | SF-780 | ASLOB__c                          |
      | SF-781 | Classes_of_Business__c            |
      | SF-782 | Line_of_Business__c               |
      | SF-783 | BEGAAP_COB__c                     |
      | SF-784 | Solvency_II__c                    |
      | SF-786 | Currency__c                       |
      | SF-798 | OSFI__c                           |

  @CLM-GL-INT-030 @p1 @negative
  Scenario: Lifecycle - Ineligible Account status must not sync to Dynamics
    Given I have a test Account name "CLM-GL Ineligible Lifecycle Gate"
    When I create an Account in Salesforce with:
      | Name              | CLM-GL Ineligible Lifecycle Gate |
      | Type              | Customer                         |
      | Account_Status__c | Ineligible                       |
    Then the Account should be created with a SalesforceID
    And the Account should have Dataverse_ID__c as null
    When I wait 5 seconds for MuleSoft processing
    Then the Party should not exist in Dynamics for this Party MasterId
