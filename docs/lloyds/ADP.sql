-- =============================================================================
-- FOWC__POLICY_CORE_V1 (Core)
-- =============================================================================

SELECT COUNT(*) FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1;
-- 14-Apr: 6780491 | 16-Apr: 852 | 22-Apr: 852

SELECT * FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1;

SELECT DISTINCT _ACCEL_REPOSITORY_ID
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1;

SELECT *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1
WHERE _ACCEL_REPOSITORY_ID = 'US-61273';

-- =============================================================================
-- FOWD__AGENCY_POLICY_FO_V1 (Dynamics 365)
-- =============================================================================

SELECT COUNT(*) FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1;
-- 14-Apr: 11635389 | 22-Apr: 426

SELECT _ACCEL_UNIQUE_RUN_ID, _ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP, *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
WHERE _ACCEL_REPOSITORY_ID = 'US-61273';

SELECT _ACCEL_UNIQUE_RUN_ID, *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
WHERE _ACCEL_UNIQUE_RUN_ID = '4aad55c3-7f9f-4ac6-9a7c-2858c9546c2e';
-- debit_amount = 6550

SELECT DISTINCT _ACCEL_UNIQUE_RUN_ID
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
WHERE _ACCEL_REPOSITORY_ID = 'US-61273';

SELECT _ACCEL_UNIQUE_RUN_ID, _ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP, *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
WHERE _ACCEL_UNIQUE_RUN_ID = 'eeeae3ab-b4ff-4e5b-9c01-014e7074bda5';

SELECT DISTINCT _ACCEL_STD_TABLE_ROW_CREATED_TIMESTAMP
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
WHERE _ACCEL_REPOSITORY_ID = 'US-61273';
-- 2026-04-17 13:23:48.683 -0700 (Summary table)
-- 2026-04-16 23:22:52.997
-- 2026-04-16 15:09:27.550

SELECT CREDIT_AMOUNT, DEBIT_AMOUNT
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
WHERE _ACCEL_REPOSITORY_ID = 'US-61273';

SELECT *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
WHERE _ACCEL_REPOSITORY_ID = 'US-61273'
  AND TEXT ILIKE '%COI%';

-- =============================================================================
-- FOWD__AGENCY_POLICY_FO_SUMMARY_V1 (Dynamics 365 Summary)
-- =============================================================================

SELECT COUNT(*) FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1;
-- 22-Apr: 18

SELECT *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_SUMMARY_V1
WHERE _ACCEL_UNIQUE_RUN_ID = 'eeeae3ab-b4ff-4e5b-9c01-014e7074bda5'
  AND _ACCEL_REPOSITORY_ID = 'US-61273';

-- =============================================================================
-- FOWT__TAGETIK_V1 (Tagetik)
-- =============================================================================

SELECT DISTINCT REPOSITORY_ID, _ACCEL_UNIQUE_RUN_ID
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_TAGETIK_PUBLIC.FOWT__TAGETIK_V1
WHERE REPOSITORY_ID = 'US-57524';

SELECT *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_TAGETIK_PUBLIC.FOWT__TAGETIK_V1
WHERE REPOSITORY_ID = 'US-57524'
  AND _ACCEL_UNIQUE_RUN_ID = 'bd1bbea2-fbeb-4490-9eb2-09bef1648d8b';
-- AND TEXT LIKE '%LL0392PL000693%'

SELECT *
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_TAGETIK_PUBLIC.FOWT__TAGETIK_V1
WHERE REPOSITORY_ID = 'US-61273';


select * from FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
select distinct(_accel_repository_id) from  FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1
select count(distinct(_accel_repository_id)) from  FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1
select distinct(_accel_repository_id) from  FINANCIAL_OPERATIONS.FINOPS_WRITTEN_CORE_PUBLIC.FOWC__POLICY_CORE_V1
SELECT
  JOURNAL_NAME,
  DESCRIPTION,
  JOURNAL_BATCH_NUMBER,
  LINE_NUMBER,
  TEXT,
  ACCOUNT_TYPE,
  ACCOUNT_DISPLAY_VALUE,
  DEBIT_AMOUNT,
  CREDIT_AMOUNT,
  CURRENCY_CODE,
  OFFSET_ACCOUNT_TYPE,
  OFFSET_ACCOUNT_DISPLAY_VALUE,
  DOCUMENT,
  DOCUMENT_DATE,
  DUE_DATE,
  INVOICE,
  TRANS_DATE,
  VOUCHER,
  DEFAULT_DIMENSION_DISPLAY_VALUE,
  OFFSET_DEFAULT_DIMENSION_DISPLAY_VALUE,
  EXCHANGE_RATE,
  POSTING_PROFILE
FROM FINANCIAL_OPERATIONS.FINOPS_WRITTEN_DYNAMICS_365_PUBLIC.FOWD__AGENCY_POLICY_FO_V1
WHERE DESCRIPTION = :p_description      -- one repo / file
ORDER BY LINE_NUMBER;

-- =============================================================================
-- Lloyd's Agency cohort — twelve _ACCEL_REPOSITORY_ID values (same as ADP QA data set)
-- Dynamics Dataverse clone status (accelins_repositoryfile): see LLOYDS_QA_PROGRESS.md §4.0.1
--   Cloned (9): US-60507, US-61066, US-56464, US-57244, US-57524, US-61273, US-60465, US-61070, US-60464
--   Pending (3): US-58237, US-58338, US-57250   (as of 2026-04-24)
-- Example filter:
-- WHERE _ACCEL_REPOSITORY_ID IN (
--   'US-60507', 'US-57250', 'US-61066', 'US-60464',
--   'US-56464', 'US-61070', 'US-58237', 'US-57244',
--   'US-60465', 'US-57524', 'US-58338', 'US-61273'
-- );
-- =============================================================================

-- =============================================================================
-- Fabric warehouse — F&O / Dataverse mirror (Accelerant QA example, 2026-04-24)
-- Automation: same queries via `npm run lloyds:fabric-fno-mirror-health` + `lloydsFabricFnoMirrorHealthQueries.ts`.
-- Set `LLOYDS_FNOFABRIC_SQLSERVER_*` to the warehouse TDS host + database (often `dataverse_*_workspace_*`).
-- =============================================================================

-- General journal entry (AEUM sub-ledger voucher data area). Example three-part name when DB != default connection:
-- SELECT COUNT(*) AS cnt
-- FROM [dataverse_accelerantqa_cds2_workspace_unq0017eb65aae14c7ca8ec393b8b4e9].[dbo].[generaljournalentry]
-- WHERE subledgervoucherdataareaid LIKE 'AEUM';
-- When connected to that warehouse as default database:
-- SELECT COUNT(*) AS cnt FROM [dbo].[generaljournalentry] WHERE subledgervoucherdataareaid LIKE 'AEUM';

-- Staging mirror under `ods` (company AEUM; programme-specific filters):
-- SELECT COUNT(*) AS cnt FROM [ods].[vendvendorv2staging] WHERE dataareaid = 'AEUM';
-- SELECT COUNT(*) AS cnt FROM [ods].[acccusttransstaging] WHERE voucher LIKE 'AEUM';
-- SELECT COUNT(*) AS cnt FROM [ods].[acccustsettlestaging] WHERE dataareaid = 'AEUM';
-- SELECT COUNT(*) AS cnt FROM [ods].[accvendtransstaging] WHERE dataareaid = 'AEUM';
-- SELECT COUNT(*) AS cnt FROM [ods].[accvendsettlestaging] WHERE dataareaid = 'AEUM';
-- SELECT COUNT(*) AS cnt FROM [ods].[custcustomerv3staging] WHERE dataareaid = 'AEUM';

-- =============================================================================
