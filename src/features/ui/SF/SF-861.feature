# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-861 — Opportunity Sub-Type (UI)
# See SF-861 API feature for full story context and env vars.
#
# Persona: MRD (Member Relationship Director) — maps to QA MRD User.
# Reuses FieldRegistry labels: "Opportunity Type" (Type), "Sub Type".
#
# Lightning notes:
#  - On qamerge the deep link /lightning/o/Opportunity/new?defaultFieldValues=...
#    does not render lightning-record-edit-form (used by FieldRegistry.setTextField),
#    so AC1/AC2 use the Edit-existing-Opportunity pattern instead. The
#    validation rule (Sub_Type_Required_if_Type_is_Expansion) fires on update too.
#  - FR2/AC4 keep the new-form path because they only touch the combobox.
#  - AC3 was REMOVED from the story (see API feature notes); UI scenario removed
#    to match.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-861 @opportunity @sub-type @expansion @clm
Feature: UI - SF-861 - Opportunity Sub-Type (Expansion conditional)

  Background:
    Given I log the environment as "MRD"
    And I have a test Account created via API with Type Member

  # ─── AC1 — Cannot save Expansion Opp with empty Sub-Type ───────────────────

  @SF-861 @SF-861-UI-001 @p1 @negative
  Scenario: UI - AC1 — cannot save Expansion Opportunity once Sub-Type is cleared
    Given an Opportunity exists for SF861 with Type Expansion and Sub-Type "Book-roll"
    And I open the SF861 Opportunity record page for editing
    When I clear SF861 Sub Type on the open form
    And I save the SF861 Opportunity form
    Then I should see an SF861 validation error about Sub Type or required field

  # ─── AC2 — Sub-Type read-only / disabled on non-Expansion Opp ──────────────

  @SF-861 @SF-861-UI-002 @p1 @positive
  Scenario: UI - AC2 — Sub-Type is disabled on existing non-Expansion Opportunity
    Given an Opportunity exists for SF861 with Type non-Expansion and blank Sub-Type
    And I open the SF861 Opportunity record page for editing
    Then the Sub Type control for SF861 should be disabled or read-only

  # ─── AC3 — REMOVED FROM STORY (see API feature notes) ─────────────────────

  # ─── FR2 — No Default Selection (UI; new-form path is OK for combobox-only) ─

  @SF-861 @SF-861-UI-004 @p2 @positive @field-config
  Scenario: UI - FR2 — Sub-Type is empty (no auto-populate) when Type is Expansion on a new form
    Given I open the new Opportunity form for SF861 from the test Account
    When I select SF861 Opportunity Type Expansion only on the open form
    Then the Sub Type control for SF861 should be empty with no auto-populated value

  # ─── AC4 — Picklist values (UI dropdown) ──────────────────────────────────

  @SF-861 @SF-861-UI-005 @p1 @positive
  Scenario: UI - AC4 — Sub-Type dropdown shows the canonical 6 values and none of the struck-out ones
    Given I open the new Opportunity form for SF861 from the test Account
    When I select SF861 Opportunity Type Expansion only on the open form
    And I open the SF861 Sub Type dropdown on the open form
    Then the SF861 Sub Type dropdown options should match the canonical story list
    And the SF861 Sub Type dropdown should not contain any struck-out values

  # ─── Field Configuration — Editable post-create on Expansion (UI) ────────

  @SF-861 @SF-861-UI-006 @p1 @positive @field-config
  Scenario: UI - Editable post-create — change Sub-Type on existing Expansion Opportunity
    Given an Opportunity exists for SF861 with Type Expansion and Sub-Type "Book-roll"
    And I open the SF861 Opportunity record page for editing
    When I change SF861 Sub Type on the open form to "New Product"
    And I save the SF861 Opportunity form
    Then the SF861 Opportunity should have Sub-Type "New Product"
