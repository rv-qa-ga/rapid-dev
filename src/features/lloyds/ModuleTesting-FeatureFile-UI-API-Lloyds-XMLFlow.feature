# ══════════════════════════════════════════════════════════════════════════════
# ModuleTesting-FeatureFile-UI-API-Lloyds-XMLFlow — WBX + chained correlation_id
#
# **What “3 times” meant before:** the same *message type* was published **N times** with
# **N different** `correlation_id` values (queue stress / idempotency smoke). That is **not**
# the same as your **manual E2E**, where **one** `correlation_id` walks every hop.
#
# **This file’s model:** each scenario uses **one** `correlation_id` (UUID) for every Service
# Bus send in that scenario — the **chained** pattern you ran manually. Steps are numbered
# **1–6** = Service Bus publishes; **step 7** = Dataverse assertions on that same id.
#
# Default blob key: `LLOYDS_MODULE_XMLFLOW_FILE_NAME` or a stable **WBX** dev name that must
# exist under `mulesoft-xml`. Totals: `LLOYDS_MODULE_XMLFLOW_TOTALS_XML` or WBX defaults.
#
# Status labels that use option-set codes: set `LLOYDS_STATUSCODE_SHIPPED_TO_DYNAMICS`,
# `LLOYDS_STATUSCODE_READY_TO_POST_TO_DYNAMICS`, `LLOYDS_STATUSCODE_POSTED_TO_DYNAMICS`, etc.
# (see `src/step-definitions/lloyds/xml-generation.steps.ts`).
#
# Run: npm run test:lloyds:module-xmlflow:qa
# Per work item (PP-391 … PP-395) + timestamped JSON/HTML: npm run test:lloyds:module-xmlflow:qa:by-pp
# Field-level negative matrix: npm run test:lloyds:module-xmlflow:qa:violations
# PP-391…395 are on each Scenario (not on Feature) so `…:by-pp` matches the right scenarios per work item.
# ══════════════════════════════════════════════════════════════════════════════

@api @lloyds @lloyds-module-xmlflow @servicebus
Feature: ModuleTesting-FeatureFile-UI-API-Lloyds-XMLFlow — WBX chained XML flow

  Background:
    Given Lloyd's module XML flow queue test uses WBX programme identity
    Given Lloyd's module XML flow chained trace starts with a fresh correlation id

  # ─── Positive chain (one correlation_id, same order as manual walkthrough) ─

  @smoke @lloyds-module-chained @lloyds-module-dataverse @PP-391 @PP-392 @PP-393 @PP-394 @PP-395
  Scenario: WBX chained positive — steps 1–6 (Service Bus) + step 7 (Dataverse)
    # Step 1 — Stage 1 / PP-391
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-generation-success" to queue "mule-xml-generation"
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    And the record's correlation id should match the sent correlation id
    And the record's blob id should include the sanity row file name
    And the record's workflow totals should match the payload within ABS tolerance 5
    And the record should have a Repository File lookup resolved
    # Step 2 — Stage 2 / PP-392 (straight-through may skip "Approved" and land on Ready to Ship)
    When I publish the chained Lloyd's module XML flow message of type "dv-xml-approval-success" to queue "dv-xml-approval"
    Then within 300 seconds the record should reach any Lloyd's Dataverse status labels "Approved, Ready to Ship to Dynamics"
    # Step 3 — DMF hand-off / PP-393–394
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-submission-success" to queue "mule-d365-import"
    Then within 400 seconds the record should reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"
    # Step 4
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-import-success" to queue "mule-d365-import"
    # Step 5
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-processing-success" to queue "mule-d365-import"
    Then within 400 seconds the record should reach Dataverse statuscode for Lloyd's label "Ready to Post to Dynamics"
    # Step 6 — Stage 4 / PP-395
    When I publish the chained Lloyd's module XML flow message of type "dv-journal-posting-success" to queue "dv-d365-journalposting"
    # Step 7 — Dataverse assertions above through Ready to Post; CRM "Posted" often depends on Mule PROCESS_TRACKER + env `LLOYDS_STATUSCODE_POSTED_TO_DYNAMICS` — add a separate scenario when your org maps that label.
    And Lloyd's module XML flow batch completed

  @lloyds-module-chained @lloyds-module-dataverse @PP-391 @PP-392 @PP-393 @PP-394
  Scenario: WBX chained positive — through Ready to Post (no journal posting assert)
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-generation-success" to queue "mule-xml-generation"
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I publish the chained Lloyd's module XML flow message of type "dv-xml-approval-success" to queue "dv-xml-approval"
    Then within 300 seconds the record should reach any Lloyd's Dataverse status labels "Approved, Ready to Ship to Dynamics"
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-submission-success" to queue "mule-d365-import"
    Then within 400 seconds the record should reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-import-success" to queue "mule-d365-import"
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-processing-success" to queue "mule-d365-import"
    Then within 400 seconds the record should reach Dataverse statuscode for Lloyd's label "Ready to Post to Dynamics"
    And Lloyd's module XML flow batch completed

  # ─── Negative chains (same correlation_id until the failing hop) ────────────

  @lloyds-module-chained @lloyds-module-dataverse @PP-391 @negative
  Scenario: WBX chained negative — step 1 only mule-xml-generation-failed (no Dataverse row)
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-generation-failed" to queue "mule-xml-generation"
    Then within 120 seconds no Lloyd's XML File record should exist for that correlation id
    And Lloyd's module XML flow batch completed

  @lloyds-module-chained @lloyds-module-dataverse @PP-392 @negative
  Scenario: WBX chained negative — step 2 dv-xml-approval-failed after successful Stage 1
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-generation-success" to queue "mule-xml-generation"
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I publish the chained Lloyd's module XML flow message of type "dv-xml-approval-failed" to queue "dv-xml-approval"
    Then within 180 seconds the record should not reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"
    And Lloyd's module XML flow batch completed

  @lloyds-module-chained @lloyds-module-dataverse @PP-393 @negative
  Scenario: WBX chained negative — step 3 mule-xml-submission-failed after Stage 1–2
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-generation-success" to queue "mule-xml-generation"
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I publish the chained Lloyd's module XML flow message of type "dv-xml-approval-success" to queue "dv-xml-approval"
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-submission-failed" to queue "mule-d365-import"
    Then within 240 seconds the record should not reach Dataverse statuscode for Lloyd's label "Shipped to Dynamics"
    And Lloyd's module XML flow batch completed

  @lloyds-module-chained @lloyds-module-dataverse @PP-394 @negative
  Scenario: WBX chained negative — step 4 mule-dmf-import-failed after submission success
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-generation-success" to queue "mule-xml-generation"
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I publish the chained Lloyd's module XML flow message of type "dv-xml-approval-success" to queue "dv-xml-approval"
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-submission-success" to queue "mule-d365-import"
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-import-failed" to queue "mule-d365-import"
    Then within 240 seconds the record should not reach Dataverse statuscode for Lloyd's label "Ready to Post to Dynamics"
    And Lloyd's module XML flow batch completed

  @lloyds-module-chained @lloyds-module-dataverse @PP-394 @negative
  Scenario: WBX chained negative — step 5 mule-dmf-processing-failed after import success
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-generation-success" to queue "mule-xml-generation"
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I publish the chained Lloyd's module XML flow message of type "dv-xml-approval-success" to queue "dv-xml-approval"
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-submission-success" to queue "mule-d365-import"
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-import-success" to queue "mule-d365-import"
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-processing-failed" to queue "mule-d365-import"
    Then within 240 seconds the record should not reach Dataverse statuscode for Lloyd's label "Ready to Post to Dynamics"
    And Lloyd's module XML flow batch completed

  @lloyds-module-chained @lloyds-module-dataverse @PP-395 @negative
  Scenario: WBX chained negative — step 6 dv-journal-posting-failed after processing success
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-generation-success" to queue "mule-xml-generation"
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I publish the chained Lloyd's module XML flow message of type "dv-xml-approval-success" to queue "dv-xml-approval"
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-submission-success" to queue "mule-d365-import"
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-import-success" to queue "mule-d365-import"
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-processing-success" to queue "mule-d365-import"
    Then within 400 seconds the record should reach Dataverse statuscode for Lloyd's label "Ready to Post to Dynamics"
    When I publish the chained Lloyd's module XML flow message of type "dv-journal-posting-failed" to queue "dv-d365-journalposting"
    And Lloyd's module XML flow batch completed

  # Optional: assert CRM reached Posted / journal-complete when `LLOYDS_STATUSCODE_POSTED_TO_DYNAMICS` is configured.
  @lloyds-module-chained @lloyds-module-dataverse @lloyds-module-posted @PP-395
  Scenario: WBX chained positive — step 7 only Posted to Dynamics (after full SB chain)
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-generation-success" to queue "mule-xml-generation"
    Then within 180 seconds the Lloyd's XML File record should exist for that correlation id
    When I publish the chained Lloyd's module XML flow message of type "dv-xml-approval-success" to queue "dv-xml-approval"
    When I publish the chained Lloyd's module XML flow message of type "mule-xml-submission-success" to queue "mule-d365-import"
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-import-success" to queue "mule-d365-import"
    When I publish the chained Lloyd's module XML flow message of type "mule-dmf-processing-success" to queue "mule-d365-import"
    When I publish the chained Lloyd's module XML flow message of type "dv-journal-posting-success" to queue "dv-d365-journalposting"
    Then within 600 seconds the record should reach Dataverse statuscode for Lloyd's label "Posted to dynamics"
    And Lloyd's module XML flow batch completed

  # ─── Field-level payload violations (single chained send per scenario) ─────
  # `message_type` + `field_slug` map to `moduleMessageViolations.ts`. Outcomes:
  #   no_xml_file_record | xml_file_record_exists | xml_file_overall_match_false
  # Programme behaviour may differ by env; tune Examples if a row becomes flaky.

  @lloyds-module-field-violations @lloyds-module-dataverse @PP-391 @negative
  Scenario Outline: WBX field violations — mule-xml-generation-success (Dataverse outcome)
    When I publish the chained Lloyd's module XML flow field violation for message type "<message_type>" with field slug "<field_slug>" to queue "mule-xml-generation"
    Then within 180 seconds Lloyd's module field violation outcome "<outcome>"
    And Lloyd's module XML flow batch completed

    Examples:
      | message_type                | field_slug                    | outcome                    |
      | mule-xml-generation-success | omit_correlation_id           | no_xml_file_record         |
      | mule-xml-generation-success | null_correlation_id           | no_xml_file_record         |
      | mule-xml-generation-success | empty_correlation_id          | no_xml_file_record         |
      | mule-xml-generation-success | omit_file_name                | no_xml_file_record         |
      | mule-xml-generation-success | empty_file_name               | no_xml_file_record         |
      | mule-xml-generation-success | omit_message                  | no_xml_file_record         |
      | mule-xml-generation-success | wrong_message_value           | no_xml_file_record         |
      | mule-xml-generation-success | omit_blob_id                  | no_xml_file_record         |
      | mule-xml-generation-success | null_blob_id                  | no_xml_file_record         |
      | mule-xml-generation-success | blob_id_file_mismatch         | no_xml_file_record         |
      | mule-xml-generation-success | omit_financial_values         | no_xml_file_record         |
      | mule-xml-generation-success | null_financial_values         | no_xml_file_record         |
      | mule-xml-generation-success | omit_adp_currency             | no_xml_file_record         |
      | mule-xml-generation-success | empty_adp_currency            | no_xml_file_record         |
      | mule-xml-generation-success | adp_prm_wrong_type_string     | no_xml_file_record         |
      | mule-xml-generation-success | adp_prm_null                  | no_xml_file_record         |
      | mule-xml-generation-success | top_level_extra_unknown_field | xml_file_record_exists     |
      | mule-xml-generation-success | financial_extra_unknown_field | xml_file_record_exists     |
      | mule-xml-generation-success | adp_prm_extreme_mismatch      | xml_file_overall_match_false |

  @lloyds-module-field-violations @lloyds-module-dataverse @PP-391 @negative
  Scenario Outline: WBX field violations — mule-xml-generation-failed (expect no XML File row)
    When I publish the chained Lloyd's module XML flow field violation for message type "<message_type>" with field slug "<field_slug>" to queue "mule-xml-generation"
    Then within 120 seconds Lloyd's module field violation outcome "no_xml_file_record"
    And Lloyd's module XML flow batch completed

    Examples:
      | message_type               | field_slug                 |
      | mule-xml-generation-failed | omit_correlation_id        |
      | mule-xml-generation-failed | omit_file_name             |
      | mule-xml-generation-failed | omit_message               |
      | mule-xml-generation-failed | wrong_message_value        |
      | mule-xml-generation-failed | omit_error_object          |
      | mule-xml-generation-failed | null_error_object          |
      | mule-xml-generation-failed | error_omit_error_message   |
      | mule-xml-generation-failed | error_omit_error_timestamp |
      | mule-xml-generation-failed | error_omit_failed_stage    |
      | mule-xml-generation-failed | error_omit_process_name    |
      | mule-xml-generation-failed | error_omit_error_source    |

  @lloyds-module-field-violations @lloyds-module-dataverse @PP-392 @negative
  Scenario Outline: WBX field violations — dv-xml-approval (no Stage 1; expect no XML File row)
    When I publish the chained Lloyd's module XML flow field violation for message type "<message_type>" with field slug "<field_slug>" to queue "dv-xml-approval"
    Then within 120 seconds Lloyd's module field violation outcome "no_xml_file_record"
    And Lloyd's module XML flow batch completed

    Examples:
      | message_type          | field_slug          |
      | dv-xml-approval-success | omit_correlation_id |
      | dv-xml-approval-success | omit_file_name      |
      | dv-xml-approval-success | empty_file_name     |
      | dv-xml-approval-success | omit_message        |
      | dv-xml-approval-success | wrong_message_value |
      | dv-xml-approval-failed | omit_correlation_id |
      | dv-xml-approval-failed | omit_file_name      |
      | dv-xml-approval-failed | omit_error_object   |
      | dv-xml-approval-failed | error_omit_error_message |
      | dv-xml-approval-failed | error_omit_error_timestamp |

  @lloyds-module-field-violations @lloyds-module-dataverse @PP-393 @PP-394 @negative
  Scenario Outline: WBX field violations — mule-d365-import (no upstream row; expect no XML File row)
    When I publish the chained Lloyd's module XML flow field violation for message type "<message_type>" with field slug "<field_slug>" to queue "mule-d365-import"
    Then within 120 seconds Lloyd's module field violation outcome "no_xml_file_record"
    And Lloyd's module XML flow batch completed

    Examples:
      | message_type               | field_slug              |
      | mule-xml-submission-success | omit_correlation_id   |
      | mule-xml-submission-success | omit_file_name        |
      | mule-xml-submission-success | omit_blob_id          |
      | mule-xml-submission-success | null_blob_id          |
      | mule-xml-submission-success | omit_message          |
      | mule-xml-submission-success | wrong_message_value   |
      | mule-xml-submission-failed | omit_correlation_id   |
      | mule-xml-submission-failed | omit_error            |
      | mule-xml-submission-failed | error_omit_error_message |
      | mule-xml-submission-failed | error_omit_error_timestamp |
      | mule-dmf-import-success    | omit_blob_id          |
      | mule-dmf-import-success    | omit_file_name        |
      | mule-dmf-import-success    | wrong_message_value   |
      | mule-dmf-import-failed     | omit_error            |
      | mule-dmf-import-failed     | error_omit_error_message |
      | mule-dmf-processing-success | omit_correlation_id |
      | mule-dmf-processing-success | omit_blob_id        |
      | mule-dmf-processing-failed | omit_error          |
      | mule-dmf-processing-failed | null_error_message  |

  @lloyds-module-field-violations @lloyds-module-dataverse @PP-395 @negative
  Scenario Outline: WBX field violations — dv-d365-journalposting (no upstream; expect no XML File row)
    When I publish the chained Lloyd's module XML flow field violation for message type "<message_type>" with field slug "<field_slug>" to queue "dv-d365-journalposting"
    Then within 120 seconds Lloyd's module field violation outcome "no_xml_file_record"
    And Lloyd's module XML flow batch completed

    Examples:
      | message_type               | field_slug           |
      | dv-journal-posting-success | omit_blob_id         |
      | dv-journal-posting-success | null_blob_id         |
      | dv-journal-posting-success | omit_file_name       |
      | dv-journal-posting-success | wrong_message_value  |
      | dv-journal-posting-failed  | omit_error           |
      | dv-journal-posting-failed  | error_omit_error_message |
