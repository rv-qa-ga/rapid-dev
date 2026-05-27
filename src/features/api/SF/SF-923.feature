# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-923 — Hidden Dataverse_ID__c on Product_Map__c (MuleSoft / Dataverse)
# Type: Story | RBT (Risk-Based Testing) — API
#
# Background (story):
#   Product_Map__c exists, carries product reference data; relationships sync to Dataverse via MuleSoft.
#
# Scenario 3 (MuleSoft user): set env SF_MULESOFT_INTEGRATION_JWT_USERNAME to the integration JWT
# username (same connected app as other JWT users unless your org differs).
#
# FLS note (Setup → Field Accessibility): If "Dataverse ID" is Hidden for every profile,
# including "Salesforce API Only System Integrations" / "Minimum Access - API Only Integrations",
# the MuleSoft integration user still needs Read+Edit on Dataverse_ID__c via a Permission Set
# (Field Accessibility is profile-based; API access follows FLS on the running user).
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-923 @rbt @product-map @dataverse @mulesoft
Feature: API - SF-923 - Product_Map__c Dataverse_ID__c (RBT)

  Background:
    Given I have a valid Salesforce API token

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 1 — Field definition, label, length; layouts/FLS documented for manual QA
  # ────────────────────────────────────────────────────────────────────────────

  @SF-923 @SF-923-API-001 @p1 @smoke @rbt @describe
  Scenario: RBT API-001 - Dataverse_ID__c metadata on Product_Map__c
    When I describe the "Product_Map__c" object
    Then the "Dataverse_ID__c" field should exist
    And a field labeled "Dataverse ID" with API name "Dataverse_ID__c" should exist
    And the "Dataverse_ID__c" field type should be "string" with length 36
    And RBT SF-923 checklist - Dataverse_ID__c excluded from all Product_Map__c page layouts
    And RBT SF-923 checklist - Dataverse_ID__c hidden from standard user profiles in the UI
    And RBT SF-923 checklist - only the MuleSoft integration identity can set the field via API

  # ────────────────────────────────────────────────────────────────────────────
  # MuleSoft JWT user: describe + SOQL + successful PATCH while Dataverse_ID__c is still blank
  # (Immutability rules apply after a value is set — see API-005 / Dataverse_ID_is_immutable_once_set.)
  # Requires SF_MULESOFT_INTEGRATION_JWT_USERNAME
  # ────────────────────────────────────────────────────────────────────────────

  @SF-923 @SF-923-API-006 @p1 @rbt @mulesoft @fls @describe
  Scenario: RBT API-006 - MuleSoft user can read Dataverse_ID__c via describe and SOQL and persist via API when blank
    Given I have a valid Salesforce API token as MuleSoft integration user
    And a Product_Map__c record exists for SF-923 with blank Dataverse_ID__c
    When I describe the "Product_Map__c" object
    Then the "Dataverse_ID__c" field should exist
    And the Product_Map__c field "Dataverse_ID__c" should be readable and updateable for the integration user via describe
    When I query Product_Map__c with Dataverse_ID__c column via API for SF-923
    Then the Product_Map__c SOQL query for SF-923 should succeed with Dataverse_ID__c in the select list
    When the MuleSoft integration user sets Dataverse_ID__c on the SF-923 Product_Map__c via API
    Then the SF-923 Product_Map__c Dataverse_ID__c should match the value set by integration

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 2 — New relationship has no Dataverse ID until MuleSoft succeeds
  # ────────────────────────────────────────────────────────────────────────────

  @SF-923 @SF-923-API-002 @p1 @rbt
  Scenario: RBT API-002 - New Product_Map__c keeps Dataverse_ID__c blank after save
    Given a Product_Map__c record exists for SF-923 with blank Dataverse_ID__c
    When I query the SF-923 Product_Map__c record including Dataverse_ID__c
    Then the SF-923 Product_Map__c Dataverse_ID__c should be blank

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 3 — Integration user can populate via API
  # ────────────────────────────────────────────────────────────────────────────

  @SF-923 @SF-923-API-003 @p1 @rbt @integration
  Scenario: RBT API-003 - MuleSoft integration user can populate Dataverse_ID__c via API
    Given a Product_Map__c record exists for SF-923 with blank Dataverse_ID__c
    When the MuleSoft integration user sets Dataverse_ID__c on the SF-923 Product_Map__c via API
    Then the SF-923 Product_Map__c Dataverse_ID__c should match the value set by integration

  # ────────────────────────────────────────────────────────────────────────────
  # MuleSoft: first PATCH succeeds; second PATCH blocked (immutability / validation)
  # ────────────────────────────────────────────────────────────────────────────

  @SF-923 @SF-923-API-007 @p1 @rbt @mulesoft @negative @integration
  Scenario: RBT API-007 - MuleSoft user can patch Dataverse_ID__c only once; second patch fails
    Given I have a valid Salesforce API token as MuleSoft integration user
    And a Product_Map__c record exists for SF-923 with blank Dataverse_ID__c
    When the MuleSoft integration user sets Dataverse_ID__c on the SF-923 Product_Map__c via API
    Then the SF-923 Product_Map__c Dataverse_ID__c should match the value set by integration
    When the MuleSoft integration user attempts to patch Dataverse_ID__c again on the SF-923 Product_Map__c via API
    Then the SF-923 MuleSoft second Dataverse_ID__c patch should fail with the system-managed error

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 4 — Non-integration API cannot set the field
  # ────────────────────────────────────────────────────────────────────────────

  @SF-923 @SF-923-API-004 @p1 @rbt @negative
  Scenario: RBT API-004 - Default API user cannot set Dataverse_ID__c on Product_Map__c
    Given a Product_Map__c record exists for SF-923 with blank Dataverse_ID__c
    When the default API user attempts to set Dataverse_ID__c on the SF-923 Product_Map__c
    Then the SF-923 API response should indicate Dataverse ID is system-managed

  # ────────────────────────────────────────────────────────────────────────────
  # Scenario 5 — Value cannot be changed or cleared once set
  # ────────────────────────────────────────────────────────────────────────────

  @SF-923 @SF-923-API-005 @p1 @rbt @negative
  Scenario: RBT API-005 - Dataverse_ID__c cannot be changed or cleared after populated
    Given a Product_Map__c record exists for SF-923 with populated Dataverse_ID__c
    When the default API user attempts to clear Dataverse_ID__c on the SF-923 Product_Map__c
    Then the SF-923 API response should indicate Dataverse ID is system-managed
