# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-977 — Product Map lifecycle — Opportunity Type Expansion
# Parent: SF-980 — Core Product Map lifecycle (statuses, Opportunity/Account linkage).
#
# UI-001: Accelerant Console reachability + mandatory fields (QA Product "test").
# UI-002: Actuary creates Product Map linked to a seeded Expansion Opportunity; asserts Draft - Product Expansion on save
#         (combined SF-977 + SF-980 linkage — API seeds Account/Opportunity; UI performs Actuary create).
#
# Flow: Accelerant Console → Product Maps tab → "All" list view → header "New" (top-right) → "New Product Map" form.
# Requires: SF_QAACTUARYUSER_JWT_USERNAME (same user as API Actuary, for JWT UI login + API seed steps in UI-002).
# Optional: SF977_UI_PRODUCT_MAPS_NAV_LABEL if the tab label differs from "Product Maps".
#
# Persona: QA Actuary only. (Some fields e.g. SubProduct may appear for Admin/MRD layouts but not Actuary — out of scope here until Dev/FLS aligns.)
#
# QA: Product__c lookup; org allows only Product "test" for now — see SF977_UI_ALLOWED_PRODUCT_LABEL.
# Layout API names (QA): Product__c, Account__c, Opportunity__c, Status__c, Product_Map_Id__c — see env.sample.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-977 @rbt @product-map @accelerant-console @lifecycle @actuary
Feature: UI - SF-977 - Product Maps — Expansion lifecycle (Actuary, SF-980 aligned)

  @SF-977 @SF-977-UI-001 @p2 @rbt @actuary
  Scenario: Actuary can complete New Product Map mandatory fields with QA-allowed Product
    Given I am logged in as a "QA Actuary User" user
    When the Actuary opens Product Maps from Accelerant Console and starts a new Product Map for SF-977
    Then the New Product Map form should be visible for SF-977
    When the Actuary completes mandatory Product Map fields with QA-allowed Product
    Then the SF-977 new Product Map form should show the QA-allowed Product in the Product field
    And I take a screenshot as evidence

  @SF-977 @SF-977-UI-002 @p1 @rbt @actuary @expansion
  Scenario: Actuary creates Product Map for Expansion Opportunity — Status Draft - Product Expansion (SF-977 + SF-980)
    Given I have Salesforce API clients for product map lifecycle (QA automation describe, Actuary create)
    And the Product Map lifecycle behaviour is defined in the parent story SF-980 for SF-977
    And the Account related to the Opportunity is already Active for SF-977
    And the SF-977 Account Type should be Member or Non Member MGA
    And an Opportunity exists with Type Expansion for SF-977
    And I am logged in as a "QA Actuary User" user
    When the Actuary opens Product Maps from Accelerant Console and starts a new Product Map for SF-977
    Then the New Product Map form should be visible for SF-977
    When the Actuary completes mandatory Product Map fields and links the SF-977 Expansion Opportunity for UI
    And the Actuary saves the new SF-977 Product Map from the modal
    Then the SF-977 Product Map record should show Status Draft - Product Expansion
    And I take a screenshot as evidence
