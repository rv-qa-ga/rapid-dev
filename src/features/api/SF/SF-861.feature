# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-861 — 1.1a Add Mandatory "Sub-Type" Picklist Field to Opportunity Object
# Parent: SF-870 — Opportunity Workflow & Approval Process (Product Expansions)
# Depends on: SF-899 (Opportunity Type values — Expansion vs non-Expansion) — Done
#
# Field (dev comment / Gearset): Opportunity.Sub_Type__c (label Sub Type)
# Validation rule: Sub_Type_Required_if_Type_is_Expansion (Active)
# Layouts updated: HipTen - Opportunity Layout, HipTen_Opportunity_Lightning_Page_Layout
#
# Coverage notes:
#  - AC2 is parametrised across New Business + Member (per BA confirmation).
#  - AC3 (auto-clear Sub-Type when Type changes from Expansion) was REMOVED
#    from the story — superseded by the existing "Type Cant be changed"
#    validation rule, which prevents the Type-change scenario entirely.
#  - AC4 also asserts the struck-out values are NOT in the active picklist
#    (Territorial Limits, Misc. UW Guideline Changes, Risk Exchange Transfers).
#  - FR2 / Field Configuration "Default Value: None" is asserted via describe.
#  - FR5 lead-conversion asserts only blank Sub-Type + non-Expansion Type
#    (story wording "Sub-Type from Lead Conversion must be New Business" is
#    treated as a typo — pending BA clarification).
#
# Env overrides (optional):
#   SF861_EXPANSION_TYPE — picklist label for Expansion (default: Expansion / SF883_OPPORTUNITY_TYPE)
#   SF861_NON_EXPANSION_TYPE — non-Expansion label (default: New Business)
#   SF883_SUB_TYPE_API_FIELD / SF977_EXPANSION_SUB_TYPE_FIELD — Sub Type API name override
#
# Reuses: SF-883 / SF-977 Sub Type field discovery (buildSubTypeFieldCandidates,
# createOpportunityWithSubTypeApi, apiJwtUsernameForFactory).
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-861 @opportunity @sub-type @expansion @clm
Feature: API - SF-861 - Opportunity Sub-Type (conditional mandatory, Expansion only)

  Background:
    Given I have a valid Salesforce API token
    And I have a test Account created via API with Type Member

  # ─── AC1 — Mandatory when Type = Expansion ─────────────────────────────────

  @SF-861 @SF-861-API-001 @p1 @negative
  Scenario: API - AC1 — cannot create Opportunity with Type Expansion and blank Sub-Type
    When I attempt to create an Opportunity via API for SF861 with Type Expansion and blank Sub-Type
    Then the SF861 Opportunity create should be rejected
    And the SF861 rejection should mention Sub Type or Sub_Type or Expansion validation

  # ─── AC2 — Read-only / blank when Type ≠ Expansion (parametrised) ──────────
  # Description: "If Type is set to anything other than Expansion (e.g., New Member or any other value)"
  # Confirmed: org actually uses New Business / Existing Business / Member.
  # Parametrised over New Business + Member per BA decision.

  @SF-861 @SF-861-API-002 @p1 @positive
  Scenario Outline: API - AC2 — non-Expansion Type "<OppType>" — blank Sub-Type creates OK
    When I create an Opportunity via API for SF861 with Type "<OppType>" and blank Sub-Type
    Then the SF861 Opportunity should have blank Sub-Type
    And the SF861 Opportunity Type should be "<OppType>"

    Examples:
      | OppType      |
      | New Business |
      | Member       |

  # ─── AC3 — REMOVED FROM STORY ─────────────────────────────────────────────
  # Auto-clear on Type change is no longer required: the existing
  # "Type Cant be changed" validation rule prevents the Type mutation outright,
  # so AC3 is unimplementable as originally written. Test scenario removed.

  # ─── AC4 — Picklist values: exact match + struck-out values absent ─────────

  @SF-861 @SF-861-API-004 @p1 @positive
  Scenario: API - AC4 — Sub-Type active picklist values match canonical list exactly
    Then the Sub-Type picklist active values for SF861 should match the canonical story list
    And the Sub-Type picklist for SF861 should not contain the SF-861 struck-out values

  # ─── AC5 — Existing Account + Expansion + Sub-Type happy path ──────────────

  @SF-861 @SF-861-API-005 @p2 @positive
  Scenario: API - AC5 — Expansion Opportunity on existing Account can include Sub-Type
    When I create an Opportunity via API for SF861 with Type Expansion and Sub-Type "New Product"
    Then the SF861 Opportunity should have Sub-Type "New Product"
    And the SF861 Opportunity Type should match the configured Expansion value

  # ─── FR5 — Lead conversion (blank Sub-Type, non-Expansion Type) ─────────────

  @SF-861 @SF-861-API-006 @p2 @positive @lead-conversion @wip-qamerge
  Scenario: API - FR5 — Lead convert Opportunity has non-Expansion Type and blank Sub-Type
    Given I have a test Lead created via API
    When I convert the SF861 test Lead to Account and Opportunity
    Then the converted SF861 Opportunity Type should match the configured non-Expansion value
    And the converted SF861 Opportunity should have blank Sub-Type

  # ─── FR2 — No Default Selection (Field Configuration: Default Value None) ──

  @SF-861 @SF-861-API-007 @p2 @positive @field-config
  Scenario: API - FR2 — Sub-Type field default is None (no auto-populate)
    Then the Sub-Type field for SF861 should have no default value via describe
    And the Sub-Type field for SF861 should not be defaulted on create via describe

  # ─── Field Configuration — "Editable after creation only if Type remains Expansion" ─

  @SF-861 @SF-861-API-008 @p1 @positive @field-config
  Scenario: API - Editable post-create on Expansion — change Sub-Type while Type stays Expansion
    Given an Opportunity exists for SF861 with Type Expansion and Sub-Type "Book-roll"
    When I update the Sub-Type for SF861 to "Rate & Commission Changes" while Type stays Expansion
    Then the SF861 Opportunity should have Sub-Type "Rate & Commission Changes"
    And the SF861 Opportunity Type should match the configured Expansion value

  @SF-861 @SF-861-API-009 @p1 @negative @field-config
  Scenario: API - Sub-Type cannot be set when Type is non-Expansion
    Given an Opportunity exists for SF861 with Type non-Expansion and blank Sub-Type
    When I attempt to set Sub-Type for SF861 to "New Product" while Type is non-Expansion
    Then the SF861 Sub-Type set on non-Expansion should be either rejected or cleared

  # ─── Validation rule presence (dev/Gearset comment) ─────────────────────────

  @SF-861 @SF-861-API-010 @p2 @positive @validation-rule
  Scenario: API - Validation rule Sub_Type_Required_if_Type_is_Expansion exists and is Active
    Then the validation rule "Sub_Type_Required_if_Type_is_Expansion" on Opportunity should be Active for SF861
