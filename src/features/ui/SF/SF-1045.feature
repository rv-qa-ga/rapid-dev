# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1045 - Update validation rules to address SF-1044 requirements
# Related: SF-1044 (governance story) | SF-726 (parent lifecycle; scenarios 1–3, 10–14)
# Type: Story | Priority: Medium
# Feature Type: Account validation rules (UI)
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-1045 @rbt @medium @account @validation
Feature: UI - SF-1045 - Account validation rules (contract, Runoff creation, Billing Country, Party Code, Legal Entity, TPA, Affiliate)
  As an MRD
  I want Salesforce validation rules to enforce contracts, required fields, and lifecycle data quality on Account
  So that Accounts cannot reach Contracted or Active without required controls and complete data

  Background:
    Given I am logged in as a "QA MRD User" user

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Contract & New Business Opportunity (Member / Non-Member MGA)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-UI-001 @p1 @contract @new-business
  Scenario Outline: Contract required — cannot create Account as Active without approved & executed contract
    Given a New Business Opportunity exists linked to the Account being created
    And the Opportunity does not have Has_Approved_Contract__c and Executed_Contract_Confirmed__c both true
    And the Account Type is "<accountType>"
    When the user creates the Account with Account Status "Active"
    Then the save is blocked
    And the user sees the message "A signed contract must be uploaded and approved before the Account can be set to Contracted or Active."
    And I take a screenshot as evidence

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-UI-002 @p1 @contract @new-business
  Scenario Outline: Contract required — Onboarding to Active blocked without approved & executed contract
    Given an Account exists with Account Type "<accountType>" and Account Status "Onboarding"
    And the linked New Business Opportunity does not have an approved and executed contract
    When the user changes Account Status to "Active" and saves
    Then the save is blocked
    And the user sees the message "A signed contract must be uploaded and approved before the Account can be set to Contracted or Active."
    And I take a screenshot as evidence

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-UI-003 @p1 @contract @new-business
  Scenario Outline: Contract required — Prospect to Contracted blocked without approved & executed contract
    Given an Account exists with Account Type "<accountType>" and Account Status "Prospect"
    And the linked New Business Opportunity does not have an approved and executed contract
    When the user changes Account Status to "Contracted" and saves
    Then the save is blocked
    And the user sees the message "A signed contract must be uploaded and approved before the Account can be set to Contracted or Active."
    And I take a screenshot as evidence

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-UI-004 @p1 @contract @new-business
  Scenario Outline: Contract required — Onboarding to Contracted blocked without approved & executed contract
    Given an Account exists with Account Type "<accountType>" and Account Status "Onboarding"
    And the linked New Business Opportunity does not have an approved and executed contract
    When the user changes Account Status to "Contracted" and saves
    Then the save is blocked
    And the user sees the message "A signed contract must be uploaded and approved before the Account can be set to Contracted or Active."
    And I take a screenshot as evidence

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-UI-005 @p1 @contract @positive @new-business
  Scenario Outline: Contract validation passes when Opportunity has approved and executed contract
    Given an Account exists or is being created with Account Type "<accountType>"
    And the linked New Business Opportunity has Has_Approved_Contract__c true
    And the linked New Business Opportunity has Executed_Contract_Confirmed__c true
    When the user sets Account Status to "<status>" and saves
    Then the save is allowed
    And I take a screenshot as evidence

    Examples:
      | accountType      | status      |
      | Member           | Contracted  |
      | Member           | Active      |
      | Non-Member MGA   | Contracted  |
      | Non-Member MGA   | Active      |

  @SF-1045 @SF-1045-UI-006 @p2 @contract @negative @new-business
  Scenario: Contract validation does not apply when linked Opportunity is not New Business
    Given an Account exists with Type "Member" or "Non-Member MGA"
    And the linked Opportunity Type is not "New Business"
    When the user creates or updates the Account into "Contracted" or "Active"
    Then this contract validation rule does not fire for Opportunity type alone
    And I take a screenshot as evidence

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Cannot create Account in Runoff (extends Offboarded / Invalid rule)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-UI-007 @p1 @account-creation @runoff
  Scenario Outline: Account cannot be created with Status Runoff (Member / Non-Member MGA)
    Given a new Account is being created
    And the Account Type is "<accountType>"
    When the user sets Account Status to "Runoff" and attempts to save
    Then the save is blocked
    And the user sees an error message stating that Accounts cannot be created as Runoff, Offboarded or Invalid
    And I take a screenshot as evidence

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Billing Country (no US default; required on save)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-UI-008 @p1 @billing-country
  Scenario: New Account — Billing Country is blank and not defaulted to United States
    Given a user opens the new Account creation form
    When the form loads
    Then Billing Country should be blank
    And Billing Country should not display "United States" as a defaulted value
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-009 @p1 @billing-country
  Scenario: Billing Country is required when saving new Account
    Given a user creates a new Account
    And Billing Country is blank
    When the user saves the Account without selecting a Billing Country
    Then the save is blocked
    And the user sees the validation message "Billing Country Is Required"
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-010 @p1 @billing-country @positive
  Scenario: Billing Country can be set and Account saves successfully
    Given a user creates a new Account
    When the user selects a valid Billing Country
    And saves the record
    Then the Account is saved successfully
    And I take a screenshot as evidence

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Party_Code__c by Account Type and Status
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-UI-011 @p1 @party-code
  Scenario Outline: Party Code required — create Account in Onboarding for applicable types
    Given a user is creating a new Account
    And Account Type is "<accountType>"
    When the user sets Account Status to "Onboarding"
    And Party Code is blank
    Then the save is blocked
    And the user sees an error indicating Party Code is required
    And I take a screenshot as evidence

    Examples:
      | accountType    |
      | Member         |
      | Non-Member MGA |
      | Insurer        |
      | Insurer Branch |
      | Group          |

  @SF-1045 @SF-1045-UI-012 @p1 @party-code
  Scenario Outline: Party Code required — create Account as Contracted for Member / Non-Member MGA
    Given a user is creating a new Account
    And Account Type is "<accountType>"
    When the user sets Account Status to "Contracted"
    And Party Code is blank
    Then the save is blocked
    And the user sees an error indicating Party Code is required
    And I take a screenshot as evidence

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-UI-013 @p1 @party-code
  Scenario Outline: Party Code required — create Account in Active for applicable types
    Given a user is creating a new Account
    And Account Type is "<accountType>"
    When the user sets Account Status to "Active"
    And Party Code is blank
    Then the save is blocked
    And the user sees an error indicating Party Code is required
    And I take a screenshot as evidence

    Examples:
      | accountType    |
      | Member         |
      | Non-Member MGA |
      | Insurer        |
      | Insurer Branch |
      | Group          |

  @SF-1045 @SF-1045-UI-014 @p1 @party-code
  Scenario Outline: Party Code required — update Account to Onboarding without Party Code
    Given an Account exists with Account Type "<accountType>"
    When the user updates Account Status to "Onboarding"
    And Party Code is blank
    Then the save is blocked
    And I take a screenshot as evidence

    Examples:
      | accountType    |
      | Member         |
      | Non-Member MGA |
      | Insurer        |
      | Insurer Branch |
      | Group          |

  @SF-1045 @SF-1045-UI-015 @p1 @party-code
  Scenario Outline: Party Code required — update Member or Non-Member MGA to Contracted without Party Code
    Given an Account exists with Account Type "<accountType>"
    When the user updates Account Status to "Contracted"
    And Party Code is blank
    Then the save is blocked
    And I take a screenshot as evidence

    Examples:
      | accountType      |
      | Member           |
      | Non-Member MGA   |

  @SF-1045 @SF-1045-UI-016 @p1 @party-code
  Scenario Outline: Party Code required — update Account to Active without Party Code
    Given an Account exists with Account Type "<accountType>"
    When the user updates Account Status to "Active"
    And Party Code is blank
    Then the save is blocked
    And I take a screenshot as evidence

    Examples:
      | accountType    |
      | Member         |
      | Non-Member MGA |
      | Insurer        |
      | Insurer Branch |
      | Group          |

  @SF-1045 @SF-1045-UI-017 @p2 @party-code @positive
  Scenario Outline: Party Code populated — save allowed for Onboarding, Contracted, or Active
    Given an Account exists or is being created
    And Account Type is "<accountType>"
    And Account Status is "<status>"
    And Party Code is populated
    When the user saves the record
    Then the save is successful
    And I take a screenshot as evidence

    Examples:
      | accountType | status      |
      | Member      | Onboarding  |
      | Member      | Contracted  |
      | Member      | Active      |

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Member — Legal Entity (Count_of_MLER__c) for Contracted / Active
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-UI-018 @p1 @legal-entity @member
  Scenario: Member cannot be created as Contracted without a related Legal Entity
    Given a user is creating a new Account
    And the Account Type is "Member"
    And Account Status is "Contracted"
    And Count_of_MLER__c is 0
    When the user saves the record
    Then the save is blocked
    And the user sees an error that Active or Contracted Members must be related to at least one Legal Entity
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-019 @p1 @legal-entity @member
  Scenario: Member cannot be created as Active without a related Legal Entity
    Given a user is creating a new Account
    And the Account Type is "Member"
    And Account Status is "Active"
    And Count_of_MLER__c is 0
    When the user saves the record
    Then the save is blocked
    And the user sees an error that Active or Contracted Members must be related to at least one Legal Entity
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-020 @p1 @legal-entity @member
  Scenario: Member cannot move to Contracted without a Legal Entity
    Given an existing Account with Type "Member" and Status not "Contracted"
    And Count_of_MLER__c is 0
    When the user changes Account Status to "Contracted"
    Then the save is blocked
    And the user sees an error that Members cannot be set to Active or Contracted until related to at least one Legal Entity
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-021 @p1 @legal-entity @member
  Scenario: Member cannot move to Active without a Legal Entity
    Given an existing Account with Type "Member" and Status not "Active"
    And Count_of_MLER__c is 0
    When the user changes Account Status to "Active"
    Then the save is blocked
    And the user sees an error that Members cannot be set to Active or Contracted until related to at least one Legal Entity
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-022 @p2 @legal-entity @member @positive
  Scenario: Member can be Contracted or Active when at least one Legal Entity exists
    Given an Account exists with Type "Member"
    And Count_of_MLER__c is greater than 0
    When the user creates or updates the Account to "Contracted" or "Active"
    Then the save is allowed
    And I take a screenshot as evidence

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — TPA — Data_Source_Claims__c for Onboarding and Active
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-UI-023 @p1 @tpa @data-source-claims
  Scenario: TPA — Data Source (Claims) required when creating Account in Onboarding
    Given a user is creating a new Account with Type "TPA"
    And Account Status is "Onboarding"
    And Data Source (Claims) is blank
    When the user saves the record
    Then the save is blocked
    And the user sees an error that Data Source (Claims) is required when Account Type is TPA and Status is Onboarding or Active
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-024 @p1 @tpa @data-source-claims
  Scenario: TPA — Data Source (Claims) required when creating Account in Active
    Given a user is creating a new Account with Type "TPA"
    And Account Status is "Active"
    And Data Source (Claims) is blank
    When the user saves the record
    Then the save is blocked
    And the user sees an error that Data Source (Claims) is required when Account Type is TPA and Status is Onboarding or Active
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-025 @p1 @tpa @data-source-claims
  Scenario: TPA — Data Source (Claims) required when updating to Active
    Given an existing TPA Account
    When the user updates Account Status to "Active"
    And Data Source (Claims) is blank
    Then the save is blocked
    And the user sees an error that Data Source (Claims) is required when Account Type is TPA and Status is Onboarding or Active
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-026 @p1 @tpa @data-source-claims
  Scenario: TPA — Data Source (Claims) required when editing Active Account
    Given an existing TPA Account with Account Status "Active"
    And Data Source (Claims) is blank
    When the user edits and saves the record
    Then the save is blocked
    And the user sees an error that Data Source (Claims) is required when Account Type is TPA and Status is Onboarding or Active
    And I take a screenshot as evidence

  @SF-1045 @SF-1045-UI-027 @p2 @tpa @data-source-claims @positive
  Scenario: TPA — save allowed when Data Source (Claims) is populated
    Given an Account exists or is being created with Type "TPA"
    And Account Status is "Onboarding" or "Active"
    And Data Source (Claims) is populated
    When the user saves the record
    Then the save is successful
    And I take a screenshot as evidence

  # ═══════════════════════════════════════════════════════════════════════════
  # SF-1045 — Affiliate_Non_Affiliate__c (Account_AffiliateNonAffiliateRule)
  # ═══════════════════════════════════════════════════════════════════════════

  @SF-1045 @SF-1045-UI-028 @p1 @affiliate
  Scenario Outline: Affiliate / Non-Affiliate optional when creating Prospect Account
    Given a user is creating a new Account
    And Account Type is "<accountType>"
    And Account Status is "Prospect"
    And Affiliate / Non-Affiliate is blank
    When the user saves the record
    Then the save is allowed
    And I take a screenshot as evidence

    Examples:
      | accountType    |
      | Member         |
      | Insurer        |
      | Insurer Branch |
      | Group          |
      | Reinsurer      |

  @SF-1045 @SF-1045-UI-029 @p1 @affiliate
  Scenario Outline: Affiliate / Non-Affiliate optional when updating Prospect Account
    Given an Account exists with Account Type "<accountType>" and Status "Prospect"
    And Affiliate / Non-Affiliate is blank
    When the user updates and saves the record
    Then the save is allowed
    And I take a screenshot as evidence

    Examples:
      | accountType    |
      | Member         |
      | Insurer        |
      | Insurer Branch |
      | Group          |
      | Reinsurer      |

  @SF-1045 @SF-1045-UI-030 @p1 @affiliate
  Scenario Outline: Affiliate / Non-Affiliate required when moving from Prospect to later status
    Given an Account exists with Account Type "<accountType>" and Status "Prospect"
    And Affiliate / Non-Affiliate is blank
    When the user changes Account Status to "<newStatus>"
    Then the save is blocked
    And the user sees "Affiliate / Non-Affiliate is required when Account Type is Member, Insurer, Insurer Branch, Group or Reinsurer."
    And I take a screenshot as evidence

    Examples:
      | accountType | newStatus   |
      | Member      | Onboarding  |
      | Insurer     | Contracted  |
      | Group       | Active      |
