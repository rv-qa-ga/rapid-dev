# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-993 - Lead / Contact / Account field layout & defaulting cleanup
# Type: Story | API coverage for metadata, deletes, and Account defaults
# Reference: https://accelins.atlassian.net/browse/SF-993
# ══════════════════════════════════════════════════════════════════════════════
#
# Per SF-993: "Remove (Hidden…)" = layout only (field remains in describe).
# Only steps that say DELETE assert "field should not exist" on the object.
# Target_Insured_Revenue_Size__c is deleted; Target_Insured_Industry_Size__c stays.
#
# Validation: Tooling API rules + successful creates without removed/hidden fields
# prove fields are not required by VRs or schema (see sf-993.steps.ts).
#
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-993 @medium @lead @account
Feature: API - SF-993 - Metadata, deletes, and Account defaults

  Background:
    # REST creates / queries use QA MRD User (same FLS as UI scenarios; SF-942 Reporting Region rules)
    Given I have a valid Salesforce API token as QA MRD user

  # ───────────────────────────────────────────────────────────────────────────
  # LEAD — deleted fields absent from describe; create without legacy columns
  # ───────────────────────────────────────────────────────────────────────────

  @SF-993 @SF-993-API-001 @p1 @smoke @lead @field-removal
  Scenario: API — Proposed_Effective_Date__c removed from Lead object
    When I fetch describe metadata for the Lead object
    Then the "Proposed_Effective_Date__c" field should not exist

  @SF-993 @SF-993-API-002 @p1 @lead @api-create
  Scenario: API — Create Lead without removed fields succeeds
    When I create a new Lead via POST with:
      | field    | value              |
      | LastName | SF993 API Lead     |
      | Company  | SF993 API Company  |
      | Status   | New |
    Then the API should return status code 201
    And the response should contain the new Lead ID

  @SF-993 @SF-993-API-003 @p2 @lead @negative @api-create
  Scenario: API — Reject create Lead with deleted Proposed_Effective_Date__c
    When I create a new Lead via POST with:
      | field                    | value      |
      | LastName                 | SF993 Neg  |
      | Company                  | SF993 Co   |
      | Status                   | New |
      | Proposed_Effective_Date__c | 2099-12-31 |
    Then the API should return an error
    And the error response should mention "Proposed_Effective_Date__c" or "field does not exist" or "No such column"

  # ───────────────────────────────────────────────────────────────────────────
  # ACCOUNT — target / incumbent fields removed; defaults when omitted on create
  # ───────────────────────────────────────────────────────────────────────────

  @SF-993 @SF-993-API-004 @p1 @account @field-removal
  Scenario: API — Target_Insured_Revenue_Size__c deleted from Account object
    When I fetch describe metadata for the Account object
    Then the "Target_Insured_Revenue_Size__c" field should not exist

  @SF-993 @SF-993-API-005 @p2 @smoke @account @field-exists
  Scenario: API — Target_Insured_Industry_Size__c remains on Account (separate from Revenue removal)
    When I fetch describe metadata for the Account object
    Then the "Target_Insured_Industry_Size__c" field should exist

  @SF-993 @SF-993-API-006 @p1 @account @defaults @api-create
  Scenario: API — New Member Account omits data sources; persisted values default to Platform
    When I create a new Account via POST with:
      | field      | value                |
      | Name       | SF993 Defaults Member |
      | Type       | Member               |
      | Region__c  | US                   |
    Then the API should return status code 201
    When I query the Account with fields "Id,Data_Source_Claims__c,Data_Source_Written__c"
    Then the "Data_Source_Claims__c" should equal "Platform"
    And the "Data_Source_Written__c" should equal "Platform"

  @SF-993 @SF-993-API-007 @p2 @account @defaults @api-create
  Scenario: API — Written Accounting and Claims Production period effective dates default when omitted
    When I create a new Account via POST with:
      | field      | value                |
      | Name       | SF993 Defaults Dates |
      | Type       | Member               |
      | Region__c  | US                   |
    Then the API should return status code 201
    When I query the Account with fields "Id,Written_Accounting_Period_Effective_From__c,Claims_Production_Period_Effective_From__c"
    Then the "Written_Accounting_Period_Effective_From__c" field on the queried record should be populated
    And the "Claims_Production_Period_Effective_From__c" field on the queried record should be populated

  # ───────────────────────────────────────────────────────────────────────────
  # RECORD CREATION — no FIELD_CUSTOM_VALIDATION_EXCEPTION when omitted fields
  # ───────────────────────────────────────────────────────────────────────────

  @SF-993 @SF-993-API-008 @p1 @lead @api-create @validation
  Scenario: API — Lead REST create succeeds without removed layout fields (no validation failure)
    When I create a new Lead via POST with:
      | field    | value                    |
      | LastName | SF993_Validation_Lead    |
      | Company  | SF993_Validation_Co      |
      | Status   | New                      |
      | Type__c  | Member                   |
    Then the API should return status code 201
    And the response should contain the new Lead ID
    And no validation errors should occur

  @SF-993 @SF-993-API-009 @p1 @account @api-create @validation
  Scenario: API — Member Account REST create succeeds without Revenue and without layout-only data-source fields in payload
    When I create a new Account via POST with:
      | field      | value                         |
      | Name       | SF993_Validation_Account      |
      | Type       | Member                        |
      | Region__c  | US                            |
    Then the API should return status code 201
    And no validation errors should occur
    When I query the Account with fields "Id,Name,Type,Target_Insured_Industry_Size__c"
    Then the "Name" field on the queried record should be populated

  # ───────────────────────────────────────────────────────────────────────────
  # TOOLING — validation rules must not reference deleted / hidden SF-993 fields
  # (Uses steps from sf-574.steps.ts + sf-993.steps.ts Tooling loader.)
  # ───────────────────────────────────────────────────────────────────────────

  @SF-993 @SF-993-API-010 @p2 @lead @validation @tooling
  Scenario: API — Lead validation rules do not reference SF-993 Lead layout or delete targets
    When I describe the Lead object validation rules via Tooling API
    Then no validation rules should reference "Line_of_Business_Created__c"
    And no validation rules should reference "Number_of_LOB_Created__c"
    And no validation rules should reference "Proposed_Effective_Date__c"

  @SF-993 @SF-993-API-011 @p2 @account @validation @tooling
  Scenario: API — Account validation rules do not reference deleted Target Insured Revenue
    When I describe the Account object validation rules via Tooling API
    Then no validation rules should reference "Target_Insured_Revenue_Size__c"

  @SF-993 @SF-993-API-012 @p2 @accountcontactrelation @validation @tooling
  Scenario: API — Account Contact Relationship validation rules do not reference hidden SF-993 fields
    When I describe the AccountContactRelation object validation rules via Tooling API
    Then no validation rules should reference "Compliance_Certification_Date__c"
    And no validation rules should reference "Compliance_Certification_Type__c"
    And no validation rules should reference "Compliance_Certification_Status__c"
    And no validation rules should reference "Regulatory_License_Expiration_Date__c"
    And no validation rules should reference "Regulatory_License_Type__c"
    And no validation rules should reference "Regulatory_License_Number__c"
    And no validation rules should reference "Authority_Level__c"

  # ───────────────────────────────────────────────────────────────────────────
  # DESCRIBE — layout-only Lead fields remain nillable / defaultable (not schema-required)
  # ───────────────────────────────────────────────────────────────────────────

  @SF-993 @SF-993-API-013 @p2 @lead @metadata @validation
  Scenario: API — Lead Line_of_Business_Created__c and Number_of_LOB_Created__c are not schema-required on create
    When I fetch describe metadata for the Lead object
    And I inspect the "Line_of_Business_Created__c" field metadata
    Then the inspected field allows null or defaulted values on create
    When I fetch describe metadata for the Lead object
    And I inspect the "Number_of_LOB_Created__c" field metadata
    Then the inspected field allows null or defaulted values on create
