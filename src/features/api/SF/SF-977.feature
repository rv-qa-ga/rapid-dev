# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-977 — Product Map lifecycle — Opportunity Type Expansion
# Parent: SF-980 — Core Product Map lifecycle (status model, transitions, audit).
#
# SF-980 context (relevant to SF-977 only):
#   Product_Map__c status values include Draft, Draft - Product Expansion,
#   Active - Pending Go-Live, Active, Inactive.
#   Product Maps relate to Account and/or Opportunity; field history on Product_Map__c.
#   Expansion opportunities: new Product Maps use "Draft - Product Expansion";
#   when Opportunity (Expansion) becomes Live, maps in "Active - Pending Go-Live" become "Active"
#   (IDs unchanged; history recorded).
#
# Authentication (required):
#   - SF_QAACTUARYUSER_JWT_USERNAME — Actuary JWT for creates (Account, Opportunity, Product_Map__c, updates).
#   - QA automation JWT (default: SF_JWT_USERNAME / SF_API_JWT_USERNAME) — Opportunity describe + Tooling for Sub Type discovery only.
#   Background: "I have Salesforce API clients for product map lifecycle (QA automation describe, Actuary create)".
#
# Org-specific labels (optional overrides — see env.sample):
#   SF977_* (Opportunity type/stage, Product Map statuses, lookup field, async wait, Sub Type field/value).
# Product_Map__c → Opportunity lookup defaults to Opportunity__c (override if renamed).
#
# Test Account: Type must be Member or Non Member MGA (asserted in every scenario). Default: Member. Override: SF977_ACCOUNT_TYPE.
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-977 @rbt @product-map @opportunity @expansion @lifecycle @actuary
Feature: API - SF-977 - Product Map lifecycle for Expansion opportunities (SF-980 aligned)

  Background:
    # Describe/Tooling = QA automation; POST/PATCH + TestDataFactory = Actuary (SF_QAACTUARYUSER_JWT_USERNAME).
    Given I have Salesforce API clients for product map lifecycle (QA automation describe, Actuary create)

  @SF-977 @SF-977-API-001 @p1 @rbt @product-map @actuary
  Scenario: Create Draft - Product Expansion — Opportunity Type Expansion (SF-977) with SF-980 linkage
    Given the Product Map lifecycle behaviour is defined in the parent story SF-980 for SF-977
    And the Account related to the Opportunity is already Active for SF-977
    And the SF-977 Account Type should be Member or Non Member MGA
    And an Opportunity exists with Type Expansion for SF-977
    When an Actuary creates a Product_Map__c record related to the Expansion Opportunity for SF-977
    Then the Product Map Status for SF-977 should be the Expansion draft status
    And the SF-977 Product Map should reference the Expansion Opportunity and Account per SF-980

  @SF-977 @SF-977-API-002 @p1 @rbt @product-map @integration @actuary
  Scenario: Opportunity (Type Expansion) goes Live — Active Pending Go-Live Product Maps become Active (SF-977)
    # Pre-Live stage defaults to Go-Live (override: SF977_PRE_LIVE_STAGE). Live stage defaults to Live (SF977_OPPORTUNITY_STAGE_LIVE).
    # When Stage becomes Live, automation waits for async automation (SF977_ASYNC_WAIT_MS) to set Pending maps to Active without manual PM edits.
    Given the Product Map lifecycle behaviour is defined in the parent story SF-980 for SF-977
    And the Account related to the Opportunity is already Active for SF-977
    And the SF-977 Account Type should be Member or Non Member MGA
    And an Opportunity exists with Type Expansion and pre-Live stage for SF-977
    And one or more Product_Map__c records related to the Opportunity have Status Active Pending Go-Live for SF-977
    And another Product_Map__c related to the same Opportunity has Status Inactive for SF-977
    When the Opportunity Stage is changed to Live for SF-977
    Then no error should be thrown for the SF-977 Opportunity Live transition
    And the SF-977 Opportunity Stage should be Live
    And all SF-977 Product Maps that were Active Pending Go-Live should have been automatically updated to Active by the system
    And the inactive SF-977 Product Map should still have Inactive status
    And the unique Id of each transitioned SF-977 Product Map should remain unchanged
    And each transitioned SF-977 Product Map should have Status change recorded in Product_Map__History

  @SF-977 @SF-977-API-003 @p2 @rbt @negative @actuary
  Scenario: Opportunity (Type Expansion) goes Live — no related Product Maps — no errors (SF-977)
    # Validates that Type = Expansion does not force Product_Map__c: transition to Live must succeed with zero related maps;
    # the org must not create or update Product Maps as a side effect, and no validation error should block the stage change.
    Given the Product Map lifecycle behaviour is defined in the parent story SF-980 for SF-977
    And the Account related to the Opportunity is already Active for SF-977
    And the SF-977 Account Type should be Member or Non Member MGA
    And an Opportunity exists with Type Expansion and pre-Live stage for SF-977
    And there are no Product_Map__c records related to the SF-977 Opportunity
    When the Opportunity Stage is changed to Live for SF-977
    Then no error should be thrown for the SF-977 Opportunity Live transition
    And the SF-977 Opportunity Stage should be Live
    And no Product_Map__c records should exist for the SF-977 Opportunity
    And no Product_Map__c should be created or updated as part of the SF-977 Live transition
