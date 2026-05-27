# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1083 — Detect potential duplicate reference data records (UI coverage)
# Linked: SF-1022 (POG hard-prevent rule reactivation)
#
# Persona: Data Governance user (per SF-1083 user story acceptance criteria).
# Org: QAMerge. Run:
#   cross-env ENV=qamerge HEADLESS=true npm run test:feature -- src/features/ui/SF/SF-1083.feature
#
# Coverage parity with the API matrix, scoped to OSFI__c + ASLOB__c (the two
# objects whose API path is currently blocked by a legacy `*_Prevent_Duplicate`
# rule with `MatchBlanks=TRUE` on the Code field) plus POG_Product__c for the
# hard-prevent (SF-1022) variants. Each AC has 1–2 corner-case variations × the
# in-scope objects to keep total UI runtime bounded (~3 min per scenario).
#
# Coverage:
#   AC1   Hyphen formatting   — 2 variations × OSFI/ASLOB
#   AC3   Split / joined      — 1 variation  × OSFI/ASLOB
#   AC5   Underscores         — 1 variation  × OSFI/ASLOB
#   AC6   Slashes             — 1 variation  × OSFI/ASLOB
#   AC7   Brackets            — 1 variation  × OSFI/ASLOB
#   AC8   Allow save warning  — implicit in every "save anyway" step
#   Letter case               — 1 variation  × OSFI/ASLOB
#   Negative                  — 1 variation  × OSFI/ASLOB
#   POG hard-prevent (SF-1022)— 2 variations × POG_Product__c
#
# BA / dev decisions:
#   • 2026-05-08 — BA Abby Parker STRUCK OUT AC2 (`&` vs `and`) and AC4 (plural).
#   • 2026-05-08 — Sai Therala deactivated the legacy `*_Prevent_Duplicate` rules
#     due to org rule-limit; SF-1022 / SF-1083-relevant rules will be reactivated.
#   • DG-user DELETE access on reference-data objects is OUT OF SCOPE per Sai
#     (separate access-model ticket).
#
# Defect #2 workaround: every create populates the Code field with a unique
# value so the legacy `*_Prevent_Duplicate` rule (MatchBlanks=TRUE on a single
# Code identifier) does NOT match blank-vs-blank, freeing the new SF-1083
# `*_Match_Key_Alert` rule to fire as designed.
# ══════════════════════════════════════════════════════════════════════════════

@ui @salesforce @SF-1083 @SF-1083-UI @reference-data @duplicates
Feature: UI - SF-1083 — Reference data duplicate alert (Lightning new-record form)

  Background:
    # Reuses the existing common auth step that JWT-auths and verifies profile
    # for the Data Governance steward (datastewardqa@accelins.com.qamerge).
    Given I log the environment as "Data Governance"
    And the SF-1083 UI duplicate test run id is assigned

  # ──────────────────────────────────────────────────────────────────────────────
  # AC1 — Hyphen formatting
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-UI-001 @p1 @bomb-proof
  Scenario Outline: UI - AC1 hyphen / dash variants (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline SF-1083 reference record via UI on "<ObjectType>" with name fragment "<Baseline>"
    When I attempt to create a SF-1083 conflicting reference record via UI on "<ObjectType>" with name fragment "<Probe>"
    Then the SF-1083 Lightning duplicate alert should appear with the SF-1083 alert text
    When I acknowledge the SF-1083 duplicate alert and save anyway
    Then the SF-1083 reference record should be saved on its detail page

    Examples:
      | ObjectType | Variation                                                | Baseline                       | Probe                          |
      | OSFI__c    | hyphen-minus (U+002D)                                    | First Small Business           | First-Small Business           |
      | OSFI__c    | spaced hyphen-minus                                      | First Small Business           | First - Small Business         |
      | OSFI__c    | en-dash (U+2013, long)                                   | First Small Business           | First–Small Business           |
      | OSFI__c    | em-dash (U+2014, longer)                                 | First Small Business           | First—Small Business           |
      | OSFI__c    | non-breaking hyphen (U+2011)                             | First Small Business           | First‑Small Business           |
      | OSFI__c    | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | OSFI__c    | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | OSFI__c    | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | OSFI__c    | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | OSFI__c    | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | OSFI__c    | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | OSFI__c    | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | OSFI__c    | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | OSFI__c    | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | OSFI__c    | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | OSFI__c    | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | OSFI__c    | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | ASLOB__c   | hyphen-minus (U+002D)                                    | First Small Business           | First-Small Business           |
      | ASLOB__c   | spaced hyphen-minus                                      | First Small Business           | First - Small Business         |
      | ASLOB__c   | en-dash (U+2013, long)                                   | First Small Business           | First–Small Business           |
      | ASLOB__c   | em-dash (U+2014, longer)                                 | First Small Business           | First—Small Business           |
      | ASLOB__c   | non-breaking hyphen (U+2011)                             | First Small Business           | First‑Small Business           |
      | ASLOB__c   | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | ASLOB__c   | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | ASLOB__c   | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | ASLOB__c   | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | ASLOB__c   | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | ASLOB__c   | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | ASLOB__c   | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | ASLOB__c   | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | ASLOB__c   | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | ASLOB__c   | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | ASLOB__c   | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | ASLOB__c   | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |

  # ──────────────────────────────────────────────────────────────────────────────
  # AC3 — Split / joined words
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-UI-002 @p1
  Scenario Outline: UI - AC3 split/joined (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline SF-1083 reference record via UI on "<ObjectType>" with name fragment "<Baseline>"
    When I attempt to create a SF-1083 conflicting reference record via UI on "<ObjectType>" with name fragment "<Probe>"
    Then the SF-1083 Lightning duplicate alert should appear with the SF-1083 alert text
    When I acknowledge the SF-1083 duplicate alert and save anyway
    Then the SF-1083 reference record should be saved on its detail page

    Examples:
      | ObjectType | Variation       | Baseline             | Probe                 |
      | OSFI__c    | joined → split  | Standalone Liability | Stand alone Liability |
      | ASLOB__c   | joined → split  | Standalone Liability | Stand alone Liability |

  # ──────────────────────────────────────────────────────────────────────────────
  # AC5 — Underscores
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-UI-003 @p1
  Scenario Outline: UI - AC5 underscore (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline SF-1083 reference record via UI on "<ObjectType>" with name fragment "<Baseline>"
    When I attempt to create a SF-1083 conflicting reference record via UI on "<ObjectType>" with name fragment "<Probe>"
    Then the SF-1083 Lightning duplicate alert should appear with the SF-1083 alert text
    When I acknowledge the SF-1083 duplicate alert and save anyway
    Then the SF-1083 reference record should be saved on its detail page

    Examples:
      | ObjectType | Variation     | Baseline             | Probe                |
      | OSFI__c    | replace space | First Small Business | First_Small_Business |
      | ASLOB__c   | replace space | First Small Business | First_Small_Business |

  # ──────────────────────────────────────────────────────────────────────────────
  # AC6 — Slashes
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-UI-004 @p1
  Scenario Outline: UI - AC6 slash (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline SF-1083 reference record via UI on "<ObjectType>" with name fragment "<Baseline>"
    When I attempt to create a SF-1083 conflicting reference record via UI on "<ObjectType>" with name fragment "<Probe>"
    Then the SF-1083 Lightning duplicate alert should appear with the SF-1083 alert text
    When I acknowledge the SF-1083 duplicate alert and save anyway
    Then the SF-1083 reference record should be saved on its detail page

    Examples:
      | ObjectType | Variation       | Baseline           | Probe              |
      | OSFI__c    | slash no spaces | Property Liability | Property/Liability |
      | ASLOB__c   | slash no spaces | Property Liability | Property/Liability |

  # ──────────────────────────────────────────────────────────────────────────────
  # AC7 — Brackets
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-UI-005 @p1
  Scenario Outline: UI - AC7 bracket (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline SF-1083 reference record via UI on "<ObjectType>" with name fragment "<Baseline>"
    When I attempt to create a SF-1083 conflicting reference record via UI on "<ObjectType>" with name fragment "<Probe>"
    Then the SF-1083 Lightning duplicate alert should appear with the SF-1083 alert text
    When I acknowledge the SF-1083 duplicate alert and save anyway
    Then the SF-1083 reference record should be saved on its detail page

    Examples:
      | ObjectType | Variation             | Baseline           | Probe                |
      | OSFI__c    | round bracket spaced  | Property Liability | Property (Liability) |
      | ASLOB__c   | round bracket spaced  | Property Liability | Property (Liability) |

  # ──────────────────────────────────────────────────────────────────────────────
  # Letter-case (extra) — Match Key trigger lower-cases names so case-only differences should alert
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-UI-006 @p2
  Scenario Outline: UI - Letter-case (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline SF-1083 reference record via UI on "<ObjectType>" with name fragment "<Baseline>"
    When I attempt to create a SF-1083 conflicting reference record via UI on "<ObjectType>" with name fragment "<Probe>"
    Then the SF-1083 Lightning duplicate alert should appear with the SF-1083 alert text
    When I acknowledge the SF-1083 duplicate alert and save anyway
    Then the SF-1083 reference record should be saved on its detail page

    Examples:
      | ObjectType | Variation     | Baseline                  | Probe                     |
      | OSFI__c    | lower → UPPER | first small business case | FIRST SMALL BUSINESS CASE |
      | ASLOB__c   | lower → UPPER | first small business case | FIRST SMALL BUSINESS CASE |

  # ──────────────────────────────────────────────────────────────────────────────
  # Negative — clearly different reference names should NOT trigger the alert
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-UI-007 @p2 @negative
  Scenario Outline: UI - Negative — distinct names do NOT alert (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline SF-1083 reference record via UI on "<ObjectType>" with name fragment "<Baseline>"
    When I attempt to create a SF-1083 distinct reference record via UI on "<ObjectType>" with name fragment "<Probe>"
    Then the SF-1083 Lightning duplicate alert should NOT appear and the record should be saved

    Examples:
      | ObjectType | Variation       | Baseline               | Probe                  |
      | OSFI__c    | distinct words  | Property Segment Alpha | Casualty Segment Beta  |
      | ASLOB__c   | distinct words  | Property Segment Alpha | Casualty Segment Beta  |

  # ──────────────────────────────────────────────────────────────────────────────
  # POG hard-prevent (SF-1022) — exact-duplicate variants on POG_Product__c
  # Currently INACTIVE in qamerge (Defect #1) — fails until SF-1022 reactivation lands.
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-UI-008 @p1 @negative @SF-1022
  Scenario Outline: UI - POG hard-prevent (variation=<Variation>)
    Given I create a baseline SF-1083 reference record via UI on "POG_Product__c" with name fragment "<Baseline>"
    When I attempt to create a SF-1083 exact-duplicate reference record via UI on "POG_Product__c" with name fragment "<Probe>"
    Then the SF-1083 reference record save should be blocked by the hard-prevent rule

    Examples:
      | Variation                        | Baseline               | Probe                  |
      | exact identical                  | Exact Block POG Label  | Exact Block POG Label  |
      | exact identical (longer name)    | POG Reference Item One | POG Reference Item One |
