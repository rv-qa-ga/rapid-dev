# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1044 - Member and Non-Member MGA Account lifecycle and governance (API)
#       Scenarios 4–9 — stacked lifecycle validations
# Related: SF-1045 - Field-level validation rules (see src/features/api/SF/SF-1045.feature)
# Type: Story | Priority: Medium
# Feature Type: Account lifecycle (API / RBT)
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-1044 @rbt @medium @account @lifecycle
Feature: API - SF-1044 - Member and Non-Member MGA lifecycle (stacked validations)
  REST API must enforce prior-stage validation rules when creating or advancing Accounts

  Background:
    # QA MRD user — FLS/access for Opportunity contract fields (Has_Approved_Contract__c, Executed_Contract_Confirmed__c)
    Given I have a valid Salesforce API token as QA MRD user

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1044 — Scenarios 4–9 (stacked lifecycle validations)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1044 @SF-1044-API-001 @p2 @rbt @lifecycle
  Scenario: API — POST Onboarding enforces Prospect validations for Member / Non-Member MGA
    Given I prepare a new Account via API with Type "Member" or "Non-Member MGA" and Account_Status__c "Onboarding"
    And all Prospect validation rules are satisfied
    When I save the Account via API
    Then the API must return success
    And Account_Status__c must be "Onboarding"

  @SF-1044 @SF-1044-API-002 @p2 @rbt @lifecycle
  Scenario: API — POST Contracted enforces Prospect and Onboarding validations
    Given I prepare a new Account via API with Type "Member" or "Non-Member MGA" and Account_Status__c "Contracted"
    And all Prospect and Onboarding validation rules are satisfied
    When I save the Account via API
    Then the API must return success
    And Account_Status__c must be "Contracted"

  @SF-1044 @SF-1044-API-003 @p2 @rbt @lifecycle
  Scenario: API — POST Active enforces Prospect, Onboarding, and Contracted validations
    Given I prepare a new Account via API with Type "Member" or "Non-Member MGA" and Account_Status__c "Active"
    And all Prospect, Onboarding, and Contracted validation rules are satisfied
    When I save the Account via API
    Then the API must return success
    And Account_Status__c must be "Active"

  @SF-1044 @SF-1044-API-004 @p2 @rbt @lifecycle
  Scenario: API — Prospect to Contracted enforces Onboarding validations
    Given an Account exists via API with Account_Status__c "Prospect"
    And all Onboarding validation requirements are met
    When I PATCH the Account via API to set Account_Status__c "Contracted"
    Then the API must return success

  @SF-1044 @SF-1044-API-005 @p2 @rbt @lifecycle
  Scenario: API — Prospect to Active enforces Onboarding and Contracted validations
    Given an Account exists via API with Account_Status__c "Prospect"
    And all Onboarding and Contracted validation requirements are met
    When I PATCH the Account via API to set Account_Status__c "Active"
    Then the API must return success

  @SF-1044 @SF-1044-API-006 @p2 @rbt @lifecycle
  Scenario: API — Onboarding to Active enforces Contracted validations
    Given an Account exists via API with Account_Status__c "Onboarding"
    And all Contracted validation requirements are met
    When I PATCH the Account via API to set Account_Status__c "Active"
    Then the API must return success
