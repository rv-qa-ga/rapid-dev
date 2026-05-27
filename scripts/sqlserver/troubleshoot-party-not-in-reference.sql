-- =============================================================================
-- Troubleshoot: Party exists in Dataverse/accelins_party but not in Reference.master.Party
-- =============================================================================
-- Use case: Record created in SF -> Dynamics/Dataverse -> ran Source Staging
-- step 2 (Reference Data Load) but SELECT * FROM [Reference].master.[Party]
-- WHERE PartyName = 'e2e party member' returns no rows.
--
-- Run these in SSMS against the appropriate server/database. Adjust @PartyName
-- and database names (Reference, d365lake, DataImport) to match your environment.
-- =============================================================================

DECLARE @PartyName NVARCHAR(255) = N'e2e party member';

-- -----------------------------------------------------------------------------
-- 1. Confirm the party is NOT in Reference.master.Party
-- -----------------------------------------------------------------------------
PRINT '1. Reference.master.Party (expected: 0 rows if issue persists)';
SELECT PartyName, PartyAlias, PartyTypeName, *
FROM [Reference].[master].[Party]
WHERE PartyName = @PartyName;
-- If no rows: issue confirmed. If rows exist: load has since run or different name.

-- -----------------------------------------------------------------------------
-- 2. Check Reference.master.Party structure (columns available for mapping)
-- -----------------------------------------------------------------------------
PRINT '2. Reference.master.Party columns (for mapping reference)';
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM [Reference].INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'master' AND TABLE_NAME = 'Party'
ORDER BY ORDINAL_POSITION;

-- -----------------------------------------------------------------------------
-- 3. ODS / staging: find where Party data lives before Reference load
--    (Common: d365lake.ods or DataImport; table may be Party, accelins_party, or similar)
-- -----------------------------------------------------------------------------
PRINT '3. Check D365Lake for Party staging (if exists on this instance)';
IF EXISTS (SELECT 1 FROM sys.databases WHERE name = 'd365lake')
BEGIN
  IF OBJECT_ID('d365lake.dbo.accelins_party', 'U') IS NOT NULL
    SELECT * FROM d365lake.dbo.accelins_party WHERE accelins_name = @PartyName;
  ELSE IF OBJECT_ID('d365lake.ods.PartyStaging', 'U') IS NOT NULL
    SELECT * FROM d365lake.ods.PartyStaging WHERE PartyName = @PartyName;
  -- Add other known staging table names your team uses
END
ELSE
  PRINT '   Database d365lake not present on this instance (may be linked server or different server).';

-- -----------------------------------------------------------------------------
-- 4. Status filter hypothesis: Reference Data Load often only loads Active parties
--    In Dataverse the record has Status = "Onboarding". Check source status.
-- -----------------------------------------------------------------------------
PRINT '4. If source has status: check for statuscode/status (Onboarding vs Active)';
-- Example if your staging table has status: uncomment and adjust table/column names
-- SELECT accelins_name, accelins_partymasterid, statuscode
-- FROM d365lake.dbo.accelins_party
-- WHERE accelins_name = @PartyName;
-- statuscode: 376140001 = Onboarding, 1 = Active (example - verify in your org)

-- -----------------------------------------------------------------------------
-- 5. Job name: ensure automation uses the exact job name
--    Log showed "Source Staging Loads" with Step 2 = "Reference Data Load".
-- -----------------------------------------------------------------------------
PRINT '5. List SQL Agent jobs containing "Source Staging" (exact name for automation)';
SELECT name, enabled
FROM msdb.dbo.sysjobs
WHERE name LIKE '%Source Staging%'
ORDER BY name;

PRINT '6. Step 2 of Source Staging job (step name and command hint)';
SELECT j.name AS JobName, s.step_id, s.step_name, LEFT(s.command, 200) AS CommandPreview
FROM msdb.dbo.sysjobs j
JOIN msdb.dbo.sysjobsteps s ON j.job_id = s.job_id
WHERE j.name LIKE '%Source Staging%' AND s.step_id = 2;

-- -----------------------------------------------------------------------------
-- 6. Recent Reference.master.Party loads (if LastModified or similar column exists)
-- -----------------------------------------------------------------------------
PRINT '7. Recent rows in Reference.master.Party (last 10 by name)';
SELECT TOP 10 *
FROM [Reference].[master].[Party]
ORDER BY PartyName DESC;

-- =============================================================================
-- RECOMMENDATIONS
-- =============================================================================
-- A. Party Status: If the Reference Data Load step only loads parties with
--    Status = Active, set the Party to "Active" in Dataverse/Dynamics and
--    re-run Source Staging step 2 (Reference Data Load).
-- B. Job name: If the job is "Source Staging Loads" (not "Source Staging"),
--    update the test/automation to use the exact job name.
-- C. Source table: Confirm with your pipeline owner which table/database step 2
--    reads from (e.g. d365lake.ods.PartyStaging) and that your record exists
--    there with the expected status/criteria before the load runs.
-- =============================================================================
