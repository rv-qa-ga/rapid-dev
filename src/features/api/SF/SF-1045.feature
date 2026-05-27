# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1045 - Update validation rules to address SF-1044 requirements (API)
# Related: SF-1044 (governance) | Implement with POST/PATCH Account, FIELD_CUSTOM_VALIDATION_EXCEPTION
# Type: Story | Priority: Medium
# Feature Type: Account validation rules (API / RBT)
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-1045 @rbt @medium @account @validation
Feature: API - SF-1045 - Account validation rules (REST create/update)
  REST API must enforce the same Account validation rules as SF-1045 UI scenarios

  Background:
    # QA MRD user — FLS/access for Opportunity contract fields (Has_Approved_Contract__c, Executed_Contract_Confirmed__c)
    Given I have a valid Salesforce API token as QA MRD user

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Contract & New Business Opportunity (Member / Non-Member MGA)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-API-001 @p1 @contract @new-business
  Scenario Outline: API — POST Account as Active blocked without approved & executed contract on linked New Business Opportunity
    Given a New Business Opportunity exists linked to the Account payload
    And Has_Approved_Contract__c and Executed_Contract_Confirmed__c are not both true on the Opportunity
    And Account Type is "<accountType>"
    When I POST a new Account via API with Account_Status__c "Active"
    Then the API must return a validation error
    And the error message must contain "A signed contract must be uploaded and approved before the Account can be set to Contracted or Active."

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-API-002 @p1 @contract @new-business
  Scenario Outline: API — PATCH Onboarding to Active blocked without approved & executed contract
    Given an Account exists via API with Type "<accountType>" and Account_Status__c "Onboarding"
    And the linked New Business Opportunity does not have approved and executed contract flags
    When I PATCH the Account via API to set Account_Status__c "Active"
    Then the API must return a validation error
    And the error message must contain "A signed contract must be uploaded and approved before the Account can be set to Contracted or Active."

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-API-003 @p1 @contract @new-business
  Scenario Outline: API — PATCH Prospect to Contracted blocked without approved & executed contract
    Given an Account exists via API with Type "<accountType>" and Account_Status__c "Prospect"
    And the linked New Business Opportunity does not have approved and executed contract flags
    When I PATCH the Account via API to set Account_Status__c "Contracted"
    Then the API must return a validation error
    And the error message must contain "A signed contract must be uploaded and approved before the Account can be set to Contracted or Active."

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-API-004 @p1 @contract @new-business
  Scenario Outline: API — PATCH Onboarding to Contracted blocked without approved & executed contract
    Given an Account exists via API with Type "<accountType>" and Account_Status__c "Onboarding"
    And the linked New Business Opportunity does not have approved and executed contract flags
    When I PATCH the Account via API to set Account_Status__c "Contracted"
    Then the API must return a validation error
    And the error message must contain "A signed contract must be uploaded and approved before the Account can be set to Contracted or Active."

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-API-005 @p1 @contract @positive @new-business
  Scenario Outline: API — Contract validation passes when Opportunity has approved and executed contract
    Given an Account exists or is created via API with Type "<accountType>"
    And the linked New Business Opportunity has Has_Approved_Contract__c true and Executed_Contract_Confirmed__c true
    When I PATCH the Account via API to set Account_Status__c "<status>"
    Then the API must return success
    And Account_Status__c in the response must be "<status>"

    Examples:
      | accountType      | status      |
      | Member           | Contracted  |
      | Member           | Active      |
      | Non-Member MGA   | Contracted  |
      | Non-Member MGA   | Active      |

  @SF-1045 @SF-1045-API-006 @p2 @contract @negative @new-business
  Scenario: API — Contract validation does not apply when linked Opportunity is not New Business
    Given an Account exists via API with Type "Member"
    And the linked Opportunity Type is not "New Business"
    When I PATCH the Account via API to set Account_Status__c "Active"
    Then the contract rule for New Business Opportunity must not reject the save solely based on contract flags

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Cannot create Account in Runoff / Offboarded / Invalid (Member / Non-Member MGA)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-API-007 @p1 @account-creation @runoff
  Scenario Outline: API — POST Account with Status Runoff blocked for Member / Non-Member MGA
    When I POST a new Account via API with Type "<accountType>" and Account_Status__c "Runoff"
    Then the API must return a validation error
    And the error message must indicate Accounts cannot be created as Runoff, Offboarded or Invalid

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Billing Country
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-API-008 @p1 @billing-country
  Scenario: API — POST Account without BillingCountry blocked when required
    Given a minimal valid Account create payload without BillingCountry
    When I POST the Account via API
    Then the API must return a validation error
    And the error message must contain "Billing Country Is Required"

  @SF-1045 @SF-1045-API-009 @p2 @billing-country @positive
  Scenario: API — POST Account succeeds when BillingCountry is set
    Given a valid Account create payload with BillingCountry set
    When I POST the Account via API
    Then the API must return success

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Party_Code__c
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-API-010 @p1 @party-code
  Scenario Outline: API — Party Code required on POST for Onboarding for applicable types
    When I POST a new Account via API with Type "<accountType>" and Account_Status__c "Onboarding" and no Party_Code__c
    Then the API must return a validation error
    And the response must indicate Party Code is required

    Examples:
      | accountType    |
      | Member         |
      | Non-Member MGA |
      | Insurer        |
      | Insurer Branch |
      | Group          |

  @SF-1045 @SF-1045-API-011 @p1 @party-code
  Scenario Outline: API — Party Code required on POST for Contracted (Member / Non-Member MGA)
    When I POST a new Account via API with Type "<accountType>" and Account_Status__c "Contracted" and no Party_Code__c
    Then the API must return a validation error

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-API-012 @p1 @party-code
  Scenario Outline: API — PATCH to Active without Party Code blocked for applicable types
    Given an Account exists via API with Type "<accountType>" and without Party_Code__c
    When I PATCH the Account via API to set Account_Status__c "Active"
    Then the API must return a validation error

    Examples:
      | accountType    |
      | Member         |
      | Insurer Branch |

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Member — Legal Entity count
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-API-013 @p1 @legal-entity @member
  Scenario: API — Member POST as Contracted blocked when Count_of_MLER__c is 0
    When I POST a new Account via API with Type "Member" and Account_Status__c "Contracted" and Count_of_MLER__c 0
    Then the API must return a validation error
    And the error must reference Legal Entity requirement for Contracted or Active Member

  @SF-1045 @SF-1045-API-014 @p1 @legal-entity @member
  Scenario: API — Member PATCH to Active blocked when Count_of_MLER__c is 0
    Given an Account exists via API with Type "Member" and Count_of_MLER__c 0
    When I PATCH the Account via API to set Account_Status__c "Active"
    Then the API must return a validation error

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — TPA — Data_Source_Claims__c
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-API-015 @p1 @tpa @data-source-claims
  Scenario: API — TPA POST Onboarding blocked without Data_Source_Claims__c
    When I POST a new Account via API with Type "TPA" and Account_Status__c "Onboarding" and no Data_Source_Claims__c
    Then the API must return a validation error
    And the error must reference Data Source (Claims) for TPA with Onboarding or Active

  @SF-1045 @SF-1045-API-016 @p1 @tpa @data-source-claims
  Scenario: API — TPA PATCH to Active blocked without Data_Source_Claims__c
    Given an Account exists via API with Type "TPA" and no Data_Source_Claims__c
    When I PATCH the Account via API to set Account_Status__c "Active"
    Then the API must return a validation error

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Affiliate / Non-Affiliate
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-API-017 @p1 @affiliate
  Scenario Outline: API — POST Prospect with blank Affiliate_Non_Affiliate__c allowed
    When I POST a new Account via API with Type "<accountType>" and Account_Status__c "Prospect" and no Affiliate_Non_Affiliate__c
    Then the API must return success

    Examples:
      | accountType    |
      | Member         |
      | Insurer        |

  @SF-1045 @SF-1045-API-018 @p1 @affiliate
  Scenario: API — PATCH Prospect to Onboarding with blank Affiliate_Non_Affiliate__c blocked
    Given an Account exists via API with Type "Member" and Account_Status__c "Prospect" and no Affiliate_Non_Affiliate__c
    When I PATCH the Account via API to set Account_Status__c "Onboarding"
    Then the API must return a validation error
    And the error message must contain "Affiliate / Non-Affiliate is required when Account Type is Member, Insurer, Insurer Branch, Group or Reinsurer."
