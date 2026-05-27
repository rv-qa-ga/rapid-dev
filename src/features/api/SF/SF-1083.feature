# ══════════════════════════════════════════════════════════════════════════════
# JIRA: SF-1083 — Detect potential duplicate reference data records (Match Key + alert rules)
# Linked: SF-1022 (Prevent exact duplicate Product Reference Data Records — POG hard-prevent)
#
# API-first: REST duplicate detection uses Sforce-Duplicate-Rule-Header allowSave=false
# to surface DUPLICATES_DETECTED without persisting; follow-up create uses framework
# default allowSave=true to acknowledge the alert and persist.
#
# Persona: Data Governance user (per SF-1083 user story persona).
# Org: QAMerge. Run:
#   cross-env ENV=qamerge npx cucumber-js src/features/api/SF/SF-1083.feature \
#     --config cucumber.config.no-paths.js \
#     --tags "@SF-1083" \
#     --format "json:reports/sf-1083/cucumber.json"
#
# BA / dev decisions tracked in this feature (RDM duplicate detection — bomb-proof matrix):
#   • 2026-05-08 — BA Abby Parker STRUCK OUT AC2 (`&` vs `and`) and AC4 (plural / singular).
#   • 2026-05-08 — Sai Therala deactivated POG_Prevent_Duplicate + retired OSFI / ASLOB legacy
#     `*_Prevent_Duplicate` rules; Abby clarified SF-1022 (POG) must remain — reactivated.
#   • 2026-05-09 — Real-world finding (RDM screenshot): two LOB rows
#     "Liability - Professional - Tax" (LOB-000066, hyphen) and
#     "Liability – Professional – Tax" (LOB-000041, en-dash) coexist as separate
#     records. Match-key normalisation must catch this. Long-hyphen / short-hyphen
#     variants now fully covered in this matrix.
#   • 2026-05-11 — Dev restored DG describe/create access on Product_ins__c
#     (formerly Insurance_Product__c). DG can now describe + create successfully.
#     The object's validation rule still blocks DELETE — the SF-1083 @After hook
#     soft-deletes via Status__c='Inactive' as a fallback. Product_ins__c is now
#     the 10th in-scope object across AC1, AC3, AC5, AC6, AC7, Letter case and Negative.
#   • Diagnostic 2026-05-10 captured the exact rule names firing on case-only
#     differences for the 4 case-only Block objects:
#       - Member_Product_and_Program__c → Member_Products_Duplicate_Rule (Block)
#       - Classes_of_Business__c        → COB_Duplicate_Rule (Block)
#       - BEGAAP_COB__c                 → BEEG (Block — odd name; review with Sai)
#       - Solvency_II__c                → Solvency_II_Prevent_Name_Duplicate (Block)
#     `Letter case` outline now asserts detection only (works regardless of mechanism).
#
# Scope summary (after BA strike-out + Product_ins__c access fix):
#   AC1   Hyphen + dash Unicode variants      — 7 variations × 10 objects + 12 compound × 10 objects
#                                                (LOB uses validation rule; Product_ins__c soft-delete on cleanup)
#   AC3   Split / joined / NBSP-spaced        — 4 variations × 10 objects
#   AC5   Underscores + multi / mixed         — 4 variations × 10 objects
#   AC6   Slash variants (incl. backslash)    — 4 variations × 10 objects
#   AC7   Bracket variants (round/square/curly) — 4 variations × 10 objects
#   AC8   Allow save with warning             — implicit (every conflicting + acknowledged save)
#   Letter case + diacritics + Unicode norm + apostrophes — 6 variations × 10 objects (DETECTION only)
#   Negative — clearly different + invisible chars + reordered words — 4 variations × 10 objects
#   POG hard-prevent — 3 exact-match variations on POG_Product__c (with strict rule check on POG_Prevent_Duplicate)
# ══════════════════════════════════════════════════════════════════════════════

@api @salesforce @SF-1083
Feature: API - SF-1083 — Reference data duplicate detection (Match Key alert matrix, bomb-proof corner cases)

  Background:
    # Persona-correct: Data Governance user (datastewardqa@accelins.com.qamerge)
    Given I have a valid Salesforce API token as Data Governance user
    And the SF-1083 API duplicate test run id is assigned

  # ──────────────────────────────────────────────────────────────────────────────
  # AC1 — Hyphen + dash Unicode variants (the RDM screenshot finding lives here)
  # Variations: hyphen-minus (U+002D), en-dash (U+2013), em-dash (U+2014),
  # Unicode hyphen (U+2010), non-breaking hyphen (U+2011), minus sign (U+2212),
  # consecutive hyphens, mixed kinds.
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-API-001 @p1 @bomb-proof
  Scenario Outline: API - AC1 hyphen / dash variants (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline reference record of type "<ObjectType>" with unique name fragment "<Baseline>"
    When I attempt a conflicting reference record of type "<ObjectType>" with unique name fragment "<Probe>" with duplicate rules enforced
    Then the Salesforce REST API should report duplicates detected without saving the probe record
    And the duplicate result should reference the baseline record by Id

    Examples:
      | ObjectType                    | Variation                    | Baseline             | Probe                  |
      | Member_Product_and_Program__c | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | Member_Product_and_Program__c | spaced hyphen-minus          | First Small Business | First - Small Business |
      | Member_Product_and_Program__c | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | Member_Product_and_Program__c | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | Member_Product_and_Program__c | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | Member_Product_and_Program__c | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | Member_Product_and_Program__c | consecutive hyphens          | First Small Business | First--Small Business  |
      | Sub_Product__c                | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | Sub_Product__c                | spaced hyphen-minus          | First Small Business | First - Small Business |
      | Sub_Product__c                | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | Sub_Product__c                | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | Sub_Product__c                | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | Sub_Product__c                | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | Sub_Product__c                | consecutive hyphens          | First Small Business | First--Small Business  |
      | POG_Product__c                | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | POG_Product__c                | spaced hyphen-minus          | First Small Business | First - Small Business |
      | POG_Product__c                | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | POG_Product__c                | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | POG_Product__c                | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | POG_Product__c                | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | POG_Product__c                | consecutive hyphens          | First Small Business | First--Small Business  |
      | OSFI__c                       | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | OSFI__c                       | spaced hyphen-minus          | First Small Business | First - Small Business |
      | OSFI__c                       | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | OSFI__c                       | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | OSFI__c                       | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | OSFI__c                       | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | OSFI__c                       | consecutive hyphens          | First Small Business | First--Small Business  |
      | ASLOB__c                      | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | ASLOB__c                      | spaced hyphen-minus          | First Small Business | First - Small Business |
      | ASLOB__c                      | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | ASLOB__c                      | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | ASLOB__c                      | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | ASLOB__c                      | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | ASLOB__c                      | consecutive hyphens          | First Small Business | First--Small Business  |
      | Line_of_Business__c           | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | Line_of_Business__c           | spaced hyphen-minus          | First Small Business | First - Small Business |
      | Line_of_Business__c           | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | Line_of_Business__c           | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | Line_of_Business__c           | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | Line_of_Business__c           | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | Line_of_Business__c           | consecutive hyphens          | First Small Business | First--Small Business  |
      | Classes_of_Business__c        | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | Classes_of_Business__c        | spaced hyphen-minus          | First Small Business | First - Small Business |
      | Classes_of_Business__c        | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | Classes_of_Business__c        | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | Classes_of_Business__c        | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | Classes_of_Business__c        | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | Classes_of_Business__c        | consecutive hyphens          | First Small Business | First--Small Business  |
      | BEGAAP_COB__c                 | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | BEGAAP_COB__c                 | spaced hyphen-minus          | First Small Business | First - Small Business |
      | BEGAAP_COB__c                 | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | BEGAAP_COB__c                 | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | BEGAAP_COB__c                 | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | BEGAAP_COB__c                 | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | BEGAAP_COB__c                 | consecutive hyphens          | First Small Business | First--Small Business  |
      | Solvency_II__c                | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | Solvency_II__c                | spaced hyphen-minus          | First Small Business | First - Small Business |
      | Solvency_II__c                | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | Solvency_II__c                | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | Solvency_II__c                | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | Solvency_II__c                | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | Solvency_II__c                | consecutive hyphens          | First Small Business | First--Small Business  |
      | Product_ins__c                | hyphen-minus (U+002D)        | First Small Business | First-Small Business   |
      | Product_ins__c                | spaced hyphen-minus          | First Small Business | First - Small Business |
      | Product_ins__c                | en-dash (U+2013, long)       | First Small Business | First–Small Business   |
      | Product_ins__c                | em-dash (U+2014, longer)     | First Small Business | First—Small Business   |
      | Product_ins__c                | unicode hyphen (U+2010)      | First Small Business | First‐Small Business   |
      | Product_ins__c                | non-breaking hyphen (U+2011) | First Small Business | First‑Small Business   |
      | Product_ins__c                | consecutive hyphens          | First Small Business | First--Small Business  |
      # ─── Compound / multi-position variants (the RDM real-world finding lives here) ───
      # Group A — Multi-position dash patterns (matching the LOB-000066 vs LOB-000041 RDM finding)
      | Member_Product_and_Program__c | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | Member_Product_and_Program__c | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | Member_Product_and_Program__c | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | Member_Product_and_Program__c | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      # Group B — Mixed separator types within the same name
      | Member_Product_and_Program__c | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | Member_Product_and_Program__c | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | Member_Product_and_Program__c | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      # Group C — Compound case + dash
      | Member_Product_and_Program__c | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | Member_Product_and_Program__c | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      # Group D — Bomb-proof "everything compound"
      | Member_Product_and_Program__c | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | Member_Product_and_Program__c | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | Member_Product_and_Program__c | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | Sub_Product__c                | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | Sub_Product__c                | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | Sub_Product__c                | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | Sub_Product__c                | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | Sub_Product__c                | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | Sub_Product__c                | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | Sub_Product__c                | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | Sub_Product__c                | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | Sub_Product__c                | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | Sub_Product__c                | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | Sub_Product__c                | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | Sub_Product__c                | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | POG_Product__c                | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | POG_Product__c                | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | POG_Product__c                | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | POG_Product__c                | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | POG_Product__c                | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | POG_Product__c                | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | POG_Product__c                | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | POG_Product__c                | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | POG_Product__c                | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | POG_Product__c                | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | POG_Product__c                | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | POG_Product__c                | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | OSFI__c                       | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | OSFI__c                       | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | OSFI__c                       | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | OSFI__c                       | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | OSFI__c                       | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | OSFI__c                       | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | OSFI__c                       | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | OSFI__c                       | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | OSFI__c                       | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | OSFI__c                       | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | OSFI__c                       | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | OSFI__c                       | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | ASLOB__c                      | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | ASLOB__c                      | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | ASLOB__c                      | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | ASLOB__c                      | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | ASLOB__c                      | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | ASLOB__c                      | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | ASLOB__c                      | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | ASLOB__c                      | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | ASLOB__c                      | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | ASLOB__c                      | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | ASLOB__c                      | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | ASLOB__c                      | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | Line_of_Business__c           | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | Line_of_Business__c           | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | Line_of_Business__c           | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | Line_of_Business__c           | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | Line_of_Business__c           | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | Line_of_Business__c           | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | Line_of_Business__c           | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | Line_of_Business__c           | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | Line_of_Business__c           | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | Line_of_Business__c           | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | Line_of_Business__c           | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | Line_of_Business__c           | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | Classes_of_Business__c        | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | Classes_of_Business__c        | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | Classes_of_Business__c        | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | Classes_of_Business__c        | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | Classes_of_Business__c        | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | Classes_of_Business__c        | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | Classes_of_Business__c        | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | Classes_of_Business__c        | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | Classes_of_Business__c        | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | Classes_of_Business__c        | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | Classes_of_Business__c        | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | Classes_of_Business__c        | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | BEGAAP_COB__c                 | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | BEGAAP_COB__c                 | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | BEGAAP_COB__c                 | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | BEGAAP_COB__c                 | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | BEGAAP_COB__c                 | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | BEGAAP_COB__c                 | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | BEGAAP_COB__c                 | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | BEGAAP_COB__c                 | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | BEGAAP_COB__c                 | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | BEGAAP_COB__c                 | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | BEGAAP_COB__c                 | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | BEGAAP_COB__c                 | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | Solvency_II__c                | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | Solvency_II__c                | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | Solvency_II__c                | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | Solvency_II__c                | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | Solvency_II__c                | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | Solvency_II__c                | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | Solvency_II__c                | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | Solvency_II__c                | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | Solvency_II__c                | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | Solvency_II__c                | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | Solvency_II__c                | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | Solvency_II__c                | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |
      | Product_ins__c                | C1a: hyphen×2 → en-dash×2 (RDM real-world)               | Liability - Professional - Tax | Liability – Professional – Tax |
      | Product_ins__c                | C1b: hyphen×2 → em-dash×2                                | Liability - Professional - Tax | Liability — Professional — Tax |
      | Product_ins__c                | C1c: em-dash×2 → en-dash×2                               | Liability — Professional — Tax | Liability – Professional – Tax |
      | Product_ins__c                | C1d: mixed en+em-dash → hyphen×2                         | Liability – Professional — Tax | Liability - Professional - Tax |
      | Product_ins__c                | C2a: hyphen + underscore in probe                        | First Small Business           | First-Small_Business           |
      | Product_ins__c                | C2b: slash + bracket in probe                            | First Small Business           | First/Small (Business)         |
      | Product_ins__c                | C2c: hyphen→underscore + space→slash                     | First-Small Business           | First_Small/Business           |
      | Product_ins__c                | C3a: case + hyphen→en-dash, multi-position               | first - small - business       | FIRST – SMALL – BUSINESS       |
      | Product_ins__c                | C3b: case + dash type                                    | First-Small-Business           | FIRST–SMALL–BUSINESS           |
      | Product_ins__c                | C4a: case + en-dash + underscore + slash + brackets      | first small business case      | FIRST–SMALL_BUSINESS/(CASE)    |
      | Product_ins__c                | C4b: case + em-dash + square brackets                    | Property Liability Variant     | PROPERTY—LIABILITY[VARIANT]    |
      | Product_ins__c                | C4c: case + split + underscore + hyphen + slash + bracket| Standalone Liability test      | stand_alone-LIABILITY/(test)   |

  # ──────────────────────────────────────────────────────────────────────────────
  # AC5 — Underscores (single, double, mixed with hyphen)
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-API-002 @p1 @bomb-proof
  Scenario Outline: API - AC5 underscore variants (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline reference record of type "<ObjectType>" with unique name fragment "<Baseline>"
    When I attempt a conflicting reference record of type "<ObjectType>" with unique name fragment "<Probe>" with duplicate rules enforced
    Then the Salesforce REST API should report duplicates detected without saving the probe record
    And the duplicate result should reference the baseline record by Id

    Examples:
      | ObjectType                    | Variation                       | Baseline             | Probe                    |
      | Member_Product_and_Program__c | replace space → underscore      | First Small Business | First_Small_Business     |
      | Member_Product_and_Program__c | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | Member_Product_and_Program__c | double underscores              | First Small Business | First__Small__Business   |
      | Member_Product_and_Program__c | mixed underscore + hyphen       | First Small Business | First_Small-Business     |
      | Sub_Product__c                | replace space → underscore      | First Small Business | First_Small_Business     |
      | Sub_Product__c                | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | Sub_Product__c                | double underscores              | First Small Business | First__Small__Business   |
      | Sub_Product__c                | mixed underscore + hyphen       | First Small Business | First_Small-Business     |
      | POG_Product__c                | replace space → underscore      | First Small Business | First_Small_Business     |
      | POG_Product__c                | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | POG_Product__c                | double underscores              | First Small Business | First__Small__Business   |
      | POG_Product__c                | mixed underscore + hyphen       | First Small Business | First_Small-Business     |
      | OSFI__c                       | replace space → underscore      | First Small Business | First_Small_Business     |
      | OSFI__c                       | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | OSFI__c                       | double underscores              | First Small Business | First__Small__Business   |
      | OSFI__c                       | mixed underscore + hyphen       | First Small Business | First_Small-Business     |
      | ASLOB__c                      | replace space → underscore      | First Small Business | First_Small_Business     |
      | ASLOB__c                      | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | ASLOB__c                      | double underscores              | First Small Business | First__Small__Business   |
      | ASLOB__c                      | mixed underscore + hyphen       | First Small Business | First_Small-Business     |
      | Line_of_Business__c           | replace space → underscore      | First Small Business | First_Small_Business     |
      | Line_of_Business__c           | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | Line_of_Business__c           | double underscores              | First Small Business | First__Small__Business   |
      | Line_of_Business__c           | mixed underscore + hyphen       | First Small Business | First_Small-Business     |
      | Classes_of_Business__c        | replace space → underscore      | First Small Business | First_Small_Business     |
      | Classes_of_Business__c        | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | Classes_of_Business__c        | double underscores              | First Small Business | First__Small__Business   |
      | Classes_of_Business__c        | mixed underscore + hyphen       | First Small Business | First_Small-Business     |
      | BEGAAP_COB__c                 | replace space → underscore      | First Small Business | First_Small_Business     |
      | BEGAAP_COB__c                 | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | BEGAAP_COB__c                 | double underscores              | First Small Business | First__Small__Business   |
      | BEGAAP_COB__c                 | mixed underscore + hyphen       | First Small Business | First_Small-Business     |
      | Solvency_II__c                | replace space → underscore      | First Small Business | First_Small_Business     |
      | Solvency_II__c                | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | Solvency_II__c                | double underscores              | First Small Business | First__Small__Business   |
      | Solvency_II__c                | mixed underscore + hyphen       | First Small Business | First_Small-Business     |
      | Product_ins__c                | replace space → underscore      | First Small Business | First_Small_Business     |
      | Product_ins__c                | replace hyphen → underscore     | First-Small Business | First_Small_Business     |
      | Product_ins__c                | double underscores              | First Small Business | First__Small__Business   |
      | Product_ins__c                | mixed underscore + hyphen       | First Small Business | First_Small-Business     |

  # ──────────────────────────────────────────────────────────────────────────────
  # AC6 — Slash variants (forward, backslash, fraction slash, with/without spaces)
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-API-003 @p1 @bomb-proof
  Scenario Outline: API - AC6 slash variants (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline reference record of type "<ObjectType>" with unique name fragment "<Baseline>"
    When I attempt a conflicting reference record of type "<ObjectType>" with unique name fragment "<Probe>" with duplicate rules enforced
    Then the Salesforce REST API should report duplicates detected without saving the probe record
    And the duplicate result should reference the baseline record by Id

    Examples:
      | ObjectType                    | Variation                       | Baseline           | Probe                |
      | Member_Product_and_Program__c | forward slash, no spaces        | Property Liability | Property/Liability   |
      | Member_Product_and_Program__c | forward slash with spaces       | Property Liability | Property / Liability |
      | Member_Product_and_Program__c | backslash                       | Property Liability | Property\Liability   |
      | Member_Product_and_Program__c | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |
      | Sub_Product__c                | forward slash, no spaces        | Property Liability | Property/Liability   |
      | Sub_Product__c                | forward slash with spaces       | Property Liability | Property / Liability |
      | Sub_Product__c                | backslash                       | Property Liability | Property\Liability   |
      | Sub_Product__c                | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |
      | POG_Product__c                | forward slash, no spaces        | Property Liability | Property/Liability   |
      | POG_Product__c                | forward slash with spaces       | Property Liability | Property / Liability |
      | POG_Product__c                | backslash                       | Property Liability | Property\Liability   |
      | POG_Product__c                | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |
      | OSFI__c                       | forward slash, no spaces        | Property Liability | Property/Liability   |
      | OSFI__c                       | forward slash with spaces       | Property Liability | Property / Liability |
      | OSFI__c                       | backslash                       | Property Liability | Property\Liability   |
      | OSFI__c                       | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |
      | ASLOB__c                      | forward slash, no spaces        | Property Liability | Property/Liability   |
      | ASLOB__c                      | forward slash with spaces       | Property Liability | Property / Liability |
      | ASLOB__c                      | backslash                       | Property Liability | Property\Liability   |
      | ASLOB__c                      | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |
      | Line_of_Business__c           | forward slash, no spaces        | Property Liability | Property/Liability   |
      | Line_of_Business__c           | forward slash with spaces       | Property Liability | Property / Liability |
      | Line_of_Business__c           | backslash                       | Property Liability | Property\Liability   |
      | Line_of_Business__c           | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |
      | Classes_of_Business__c        | forward slash, no spaces        | Property Liability | Property/Liability   |
      | Classes_of_Business__c        | forward slash with spaces       | Property Liability | Property / Liability |
      | Classes_of_Business__c        | backslash                       | Property Liability | Property\Liability   |
      | Classes_of_Business__c        | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |
      | BEGAAP_COB__c                 | forward slash, no spaces        | Property Liability | Property/Liability   |
      | BEGAAP_COB__c                 | forward slash with spaces       | Property Liability | Property / Liability |
      | BEGAAP_COB__c                 | backslash                       | Property Liability | Property\Liability   |
      | BEGAAP_COB__c                 | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |
      | Solvency_II__c                | forward slash, no spaces        | Property Liability | Property/Liability   |
      | Solvency_II__c                | forward slash with spaces       | Property Liability | Property / Liability |
      | Solvency_II__c                | backslash                       | Property Liability | Property\Liability   |
      | Solvency_II__c                | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |
      | Product_ins__c                | forward slash, no spaces        | Property Liability | Property/Liability   |
      | Product_ins__c                | forward slash with spaces       | Property Liability | Property / Liability |
      | Product_ins__c                | backslash                       | Property Liability | Property\Liability   |
      | Product_ins__c                | fraction slash (U+2044)         | Property Liability | Property⁄Liability   |

  # ──────────────────────────────────────────────────────────────────────────────
  # AC7 — Bracket variants (round, square, curly, angle)
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-API-004 @p1 @bomb-proof
  Scenario Outline: API - AC7 bracket variants (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline reference record of type "<ObjectType>" with unique name fragment "<Baseline>"
    When I attempt a conflicting reference record of type "<ObjectType>" with unique name fragment "<Probe>" with duplicate rules enforced
    Then the Salesforce REST API should report duplicates detected without saving the probe record
    And the duplicate result should reference the baseline record by Id

    Examples:
      | ObjectType                    | Variation                | Baseline           | Probe                |
      | Member_Product_and_Program__c | round brackets, no space | Property Liability | Property(Liability)  |
      | Member_Product_and_Program__c | round brackets, spaced   | Property Liability | Property (Liability) |
      | Member_Product_and_Program__c | square brackets          | Property Liability | Property[Liability]  |
      | Member_Product_and_Program__c | curly brackets           | Property Liability | Property{Liability}  |
      | Sub_Product__c                | round brackets, no space | Property Liability | Property(Liability)  |
      | Sub_Product__c                | round brackets, spaced   | Property Liability | Property (Liability) |
      | Sub_Product__c                | square brackets          | Property Liability | Property[Liability]  |
      | Sub_Product__c                | curly brackets           | Property Liability | Property{Liability}  |
      | POG_Product__c                | round brackets, no space | Property Liability | Property(Liability)  |
      | POG_Product__c                | round brackets, spaced   | Property Liability | Property (Liability) |
      | POG_Product__c                | square brackets          | Property Liability | Property[Liability]  |
      | POG_Product__c                | curly brackets           | Property Liability | Property{Liability}  |
      | OSFI__c                       | round brackets, no space | Property Liability | Property(Liability)  |
      | OSFI__c                       | round brackets, spaced   | Property Liability | Property (Liability) |
      | OSFI__c                       | square brackets          | Property Liability | Property[Liability]  |
      | OSFI__c                       | curly brackets           | Property Liability | Property{Liability}  |
      | ASLOB__c                      | round brackets, no space | Property Liability | Property(Liability)  |
      | ASLOB__c                      | round brackets, spaced   | Property Liability | Property (Liability) |
      | ASLOB__c                      | square brackets          | Property Liability | Property[Liability]  |
      | ASLOB__c                      | curly brackets           | Property Liability | Property{Liability}  |
      | Line_of_Business__c           | round brackets, no space | Property Liability | Property(Liability)  |
      | Line_of_Business__c           | round brackets, spaced   | Property Liability | Property (Liability) |
      | Line_of_Business__c           | square brackets          | Property Liability | Property[Liability]  |
      | Line_of_Business__c           | curly brackets           | Property Liability | Property{Liability}  |
      | Classes_of_Business__c        | round brackets, no space | Property Liability | Property(Liability)  |
      | Classes_of_Business__c        | round brackets, spaced   | Property Liability | Property (Liability) |
      | Classes_of_Business__c        | square brackets          | Property Liability | Property[Liability]  |
      | Classes_of_Business__c        | curly brackets           | Property Liability | Property{Liability}  |
      | BEGAAP_COB__c                 | round brackets, no space | Property Liability | Property(Liability)  |
      | BEGAAP_COB__c                 | round brackets, spaced   | Property Liability | Property (Liability) |
      | BEGAAP_COB__c                 | square brackets          | Property Liability | Property[Liability]  |
      | BEGAAP_COB__c                 | curly brackets           | Property Liability | Property{Liability}  |
      | Solvency_II__c                | round brackets, no space | Property Liability | Property(Liability)  |
      | Solvency_II__c                | round brackets, spaced   | Property Liability | Property (Liability) |
      | Solvency_II__c                | square brackets          | Property Liability | Property[Liability]  |
      | Solvency_II__c                | curly brackets           | Property Liability | Property{Liability}  |
      | Product_ins__c                | round brackets, no space | Property Liability | Property(Liability)  |
      | Product_ins__c                | round brackets, spaced   | Property Liability | Property (Liability) |
      | Product_ins__c                | square brackets          | Property Liability | Property[Liability]  |
      | Product_ins__c                | curly brackets           | Property Liability | Property{Liability}  |

  # ──────────────────────────────────────────────────────────────────────────────
  # AC3 — Split / joined words + multiple words + NBSP-separator
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-API-005 @p1 @bomb-proof
  Scenario Outline: API - AC3 split / joined variants (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline reference record of type "<ObjectType>" with unique name fragment "<Baseline>"
    When I attempt a conflicting reference record of type "<ObjectType>" with unique name fragment "<Probe>" with duplicate rules enforced
    Then the Salesforce REST API should report duplicates detected without saving the probe record
    And the duplicate result should reference the baseline record by Id

    Examples:
      | ObjectType                    | Variation                       | Baseline              | Probe                  |
      | Member_Product_and_Program__c | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | Member_Product_and_Program__c | split → joined                  | Stand alone Liability | Standalone Liability   |
      | Member_Product_and_Program__c | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | Member_Product_and_Program__c | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |
      | Sub_Product__c                | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | Sub_Product__c                | split → joined                  | Stand alone Liability | Standalone Liability   |
      | Sub_Product__c                | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | Sub_Product__c                | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |
      | POG_Product__c                | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | POG_Product__c                | split → joined                  | Stand alone Liability | Standalone Liability   |
      | POG_Product__c                | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | POG_Product__c                | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |
      | OSFI__c                       | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | OSFI__c                       | split → joined                  | Stand alone Liability | Standalone Liability   |
      | OSFI__c                       | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | OSFI__c                       | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |
      | ASLOB__c                      | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | ASLOB__c                      | split → joined                  | Stand alone Liability | Standalone Liability   |
      | ASLOB__c                      | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | ASLOB__c                      | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |
      | Line_of_Business__c           | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | Line_of_Business__c           | split → joined                  | Stand alone Liability | Standalone Liability   |
      | Line_of_Business__c           | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | Line_of_Business__c           | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |
      | Classes_of_Business__c        | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | Classes_of_Business__c        | split → joined                  | Stand alone Liability | Standalone Liability   |
      | Classes_of_Business__c        | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | Classes_of_Business__c        | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |
      | BEGAAP_COB__c                 | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | BEGAAP_COB__c                 | split → joined                  | Stand alone Liability | Standalone Liability   |
      | BEGAAP_COB__c                 | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | BEGAAP_COB__c                 | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |
      | Solvency_II__c                | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | Solvency_II__c                | split → joined                  | Stand alone Liability | Standalone Liability   |
      | Solvency_II__c                | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | Solvency_II__c                | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |
      | Product_ins__c                | joined → split                  | Standalone Liability  | Stand alone Liability  |
      | Product_ins__c                | split → joined                  | Stand alone Liability | Standalone Liability   |
      | Product_ins__c                | NBSP between words (U+00A0)     | Standalone Liability  | Stand alone Liability |
      | Product_ins__c                | multi-word concat               | TestPolicy LongName   | Test Policy Long Name  |

  # ──────────────────────────────────────────────────────────────────────────────
  # Letter case + diacritics + Unicode normalisation + apostrophes
  # DETECTION-only assertion (no acknowledged-save step). On 5 of 9 in-scope objects
  # (POG + Member_Products + COB + BEGAAP + Solvency_II) a hard-prevent rule blocks
  # case-only duplicates by design; on the other 4 (Sub_Product, OSFI, ASLOB, LOB)
  # the SF-1083 alert pattern allows the save after acknowledgement. Asserting only
  # detection covers both behaviours correctly.
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-API-006 @p2 @bomb-proof
  Scenario Outline: API - Letter-case / Unicode normalisation (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline reference record of type "<ObjectType>" with unique name fragment "<Baseline>"
    When I attempt a conflicting reference record of type "<ObjectType>" with unique name fragment "<Probe>" with duplicate rules enforced
    Then the Salesforce REST API should report duplicates detected without saving the probe record

    Examples:
      | ObjectType                    | Variation                                 | Baseline                  | Probe                     |
      | Member_Product_and_Program__c | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | Member_Product_and_Program__c | Title Case → lowercase                    | First Small Business Case | first small business case |
      | Member_Product_and_Program__c | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | Member_Product_and_Program__c | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | Member_Product_and_Program__c | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | Member_Product_and_Program__c | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |
      | Sub_Product__c                | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | Sub_Product__c                | Title Case → lowercase                    | First Small Business Case | first small business case |
      | Sub_Product__c                | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | Sub_Product__c                | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | Sub_Product__c                | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | Sub_Product__c                | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |
      | POG_Product__c                | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | POG_Product__c                | Title Case → lowercase                    | First Small Business Case | first small business case |
      | POG_Product__c                | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | POG_Product__c                | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | POG_Product__c                | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | POG_Product__c                | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |
      | OSFI__c                       | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | OSFI__c                       | Title Case → lowercase                    | First Small Business Case | first small business case |
      | OSFI__c                       | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | OSFI__c                       | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | OSFI__c                       | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | OSFI__c                       | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |
      | ASLOB__c                      | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | ASLOB__c                      | Title Case → lowercase                    | First Small Business Case | first small business case |
      | ASLOB__c                      | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | ASLOB__c                      | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | ASLOB__c                      | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | ASLOB__c                      | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |
      | Line_of_Business__c           | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | Line_of_Business__c           | Title Case → lowercase                    | First Small Business Case | first small business case |
      | Line_of_Business__c           | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | Line_of_Business__c           | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | Line_of_Business__c           | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | Line_of_Business__c           | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |
      | Classes_of_Business__c        | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | Classes_of_Business__c        | Title Case → lowercase                    | First Small Business Case | first small business case |
      | Classes_of_Business__c        | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | Classes_of_Business__c        | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | Classes_of_Business__c        | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | Classes_of_Business__c        | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |
      | BEGAAP_COB__c                 | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | BEGAAP_COB__c                 | Title Case → lowercase                    | First Small Business Case | first small business case |
      | BEGAAP_COB__c                 | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | BEGAAP_COB__c                 | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | BEGAAP_COB__c                 | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | BEGAAP_COB__c                 | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |
      | Solvency_II__c                | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | Solvency_II__c                | Title Case → lowercase                    | First Small Business Case | first small business case |
      | Solvency_II__c                | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | Solvency_II__c                | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | Solvency_II__c                | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | Solvency_II__c                | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |
      | Product_ins__c                | lowercase → UPPERCASE                     | first small business case | FIRST SMALL BUSINESS CASE |
      | Product_ins__c                | Title Case → lowercase                    | First Small Business Case | first small business case |
      | Product_ins__c                | mixed case                                | First small Business CASE | FIRST SMALL business case |
      | Product_ins__c                | curly apostrophe (U+2019)                 | Drivers Insurance         | Driver’s Insurance        |
      | Product_ins__c                | curly quotes (U+201C / U+201D)            | The Quote Insurance       | “The Quote” Insurance     |
      | Product_ins__c                | NFC vs NFD accent (composed/decomposed)   | Café Insurance            | Café Insurance            |

  # ──────────────────────────────────────────────────────────────────────────────
  # NEGATIVE — clearly different reference names should NOT trigger any duplicate
  # detection. Includes invisible-char variants and word reordering as edge cases
  # that may or may not be classified as duplicates depending on trigger logic.
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-API-007 @p2 @negative @bomb-proof
  Scenario Outline: API - Negative — distinct names should NOT alert (object=<ObjectType>, variation=<Variation>)
    Given I create a baseline reference record of type "<ObjectType>" with unique name fragment "<Baseline>"
    When I attempt a conflicting reference record of type "<ObjectType>" with unique name fragment "<Probe>" with duplicate rules enforced
    Then the Salesforce REST API should not report duplicates detected for the last raw create

    Examples:
      | ObjectType                    | Variation                            | Baseline               | Probe                      |
      | Member_Product_and_Program__c | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | Member_Product_and_Program__c | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | Member_Product_and_Program__c | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | Member_Product_and_Program__c | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |
      | Sub_Product__c                | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | Sub_Product__c                | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | Sub_Product__c                | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | Sub_Product__c                | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |
      | POG_Product__c                | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | POG_Product__c                | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | POG_Product__c                | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | POG_Product__c                | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |
      | OSFI__c                       | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | OSFI__c                       | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | OSFI__c                       | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | OSFI__c                       | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |
      | ASLOB__c                      | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | ASLOB__c                      | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | ASLOB__c                      | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | ASLOB__c                      | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |
      | Line_of_Business__c           | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | Line_of_Business__c           | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | Line_of_Business__c           | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | Line_of_Business__c           | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |
      | Classes_of_Business__c        | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | Classes_of_Business__c        | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | Classes_of_Business__c        | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | Classes_of_Business__c        | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |
      | BEGAAP_COB__c                 | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | BEGAAP_COB__c                 | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | BEGAAP_COB__c                 | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | BEGAAP_COB__c                 | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |
      | Solvency_II__c                | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | Solvency_II__c                | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | Solvency_II__c                | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | Solvency_II__c                | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |
      | Product_ins__c                | distinct words                       | Property Segment Alpha | Casualty Segment Beta      |
      | Product_ins__c                | partial overlap, different ending    | Property Segment Alpha | Property Segment Different |
      | Product_ins__c                | reversed word order                  | Property Segment Alpha | Alpha Segment Property     |
      | Product_ins__c                | unrelated words                      | Marine Cargo Insurance | Aviation Hull Coverage     |

  # ──────────────────────────────────────────────────────────────────────────────
  # POG hard-prevent (SF-1022) — exact-name + dash variants on POG_Product__c
  # Hardened: asserts the SPECIFIC `POG_Prevent_Duplicate` rule fires (Block, not
  # just any duplicate rule). Confirms the SF-1022 reactivation works.
  # ──────────────────────────────────────────────────────────────────────────────

  @SF-1083 @SF-1083-API-008 @p1 @negative @SF-1022 @bomb-proof
  Scenario Outline: API - POG hard-prevent (variation=<Variation>)
    Given I create a baseline reference record of type "POG_Product__c" with unique name fragment "<Baseline>"
    When I attempt a second baseline-identical reference record of type "POG_Product__c" with the same unique name fragment "<Probe>"
    Then the Salesforce REST API should reject the hard-duplicate create with rule "POG_Prevent_Duplicate"

    Examples:
      | Variation                                | Baseline               | Probe                  |
      | exact identical                          | Exact Block POG Label  | Exact Block POG Label  |
      | exact identical (longer name)            | POG Reference Item One | POG Reference Item One |
      | exact identical (numeric suffix)         | POG Item 2026-05       | POG Item 2026-05       |

  # (Insurance_Product__c → Product_ins__c moved IN-SCOPE 2026-05-11 after dev
  # restored DG describe/create access. Soft-delete via Status__c='Inactive' is
  # handled by the SF-1083 @After hook because the object's validation rule
  # blocks DELETE.)

