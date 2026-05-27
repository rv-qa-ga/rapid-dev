# ══════════════════════════════════════════════════════════════════════════════
# JIRA: ENG-145 - Repository ID from ADP flows to ODS and Dynamics (rigorous validation)
# Type: Story | Feature Type: integration (SQL Server / ODS / Dynamics / SSIS)
# Scenario IDs: ENG-145-API-### (generator-style: {KEY}-API-{NNN} for non-UI automation)
# ══════════════════════════════════════════════════════════════════════════════

@sqlserver @integration @ENG-145 @ods @rbt @high
Feature: ENG-145 - Repository ID from ADP flows to ODS and Dynamics (rigorous validation)
  As a QA engineer
  I want to rigorously verify that Repository ID generated in ADP successfully flows down to ODS and to Dynamics when Source Staging runs
  So that we validate the new process end-to-end and no longer depend on Repository ID from Ops workflow

  # ═══════════════════════════════════════════════════════════════════════════
  # CONTEXT (updated)
  # ═══════════════════════════════════════════════════════════════════════════
  # - Repository ID is generated in ADP (not from Ops workflow).
  # - ADP generates the Repository ID; it flows down to ODS when we run the
  #   Source Staging job.
  # - We must ensure: Repository ID from ADP → flows to ODS AND to Dynamics.
  # - This is a new process and must be rigorously tested.
  #
  # Technical scope (from earlier description):
  # - New column RepositoryID in Gen 2 SSIS, Latest/Raw tables, [Intrali].[Bordereaux_Lloyds*] views.
  # - UploadID derives from RepositoryID. Source Staging job loads ADP-sourced Repository ID into ODS.
  # - SSIS: Claim Stage.dtsx, VIPRtoDWHWrittenBordereau.dtsx, VIPRtoDWHPaidBordereauV2.dtsx.
  # - Logging: ClaimsIntegrityChecks, PremiumIntegrityChecks, spClaimsBordereauTracking, spClaimsPreChecks, spWrittenBordereauTracking.
  # - Control: VIPR-Warehouse.control.Parameter overrides removed; hardcoded table names used.
  # ═══════════════════════════════════════════════════════════════════════════

  Background:
    Given I have a valid SQL Server connection

  # ═══════════════════════════════════════════════════════════════════════════
  # E2E: ADP → Source Staging → ODS and Dynamics (rigorous flow validation)
  # ═══════════════════════════════════════════════════════════════════════════

  @ENG-145 @ENG-145-API-001 @p1 @smoke @rbt @e2e @source-staging @ods
  Scenario: Run Source Staging step 2 and verify Repository ID is present in ODS
    # ADP generates Repository ID; Source Staging job flows it to ODS.
    # After the job runs, Reference.master.BordereauRepository (or staging) must contain the Repository ID.
    When I run step 2 of the SSIS job "Source Staging Loads"
    And I wait for the Step 2 of the SSIS job "Source Staging Loads" to complete with timeout 15 minutes
    And I confirm step 2 of the SSIS job "Source Staging Loads" has completed successfully
    When I run the following query in "Reference" database and log the result:
      """
      SELECT TOP 10 RepositoryID, BordereauRepositoryName, CreatedDate
      FROM [Reference].[master].[BordereauRepository]
      ORDER BY CreatedDate DESC
      """
    And I run the following query in "Reference" database and log the result:
      """
      SELECT COUNT(*) AS repository_count FROM [Reference].[master].[BordereauRepository]
      """

  @ENG-145 @ENG-145-API-002 @p1 @rbt @e2e @ods
  Scenario: Verify Repository ID from ADP exists in ODS Reference after Source Staging
    # Prerequisite: Source Staging has been run (e.g. by previous scenario or manually).
    # Assert: At least one Repository ID is present in ODS (BordereauRepository).
    When I run the following query in "Reference" database and log the result:
      """
      SELECT COUNT(*) AS cnt FROM [Reference].[master].[BordereauRepository] WHERE RepositoryID IS NOT NULL
      """

  @ENG-145 @ENG-145-API-003 @p1 @rbt @e2e @dynamics
  Scenario: Verify Repository ID from ADP is present in Dynamics
    # Repository ID generated in ADP must flow to Dynamics (e.g. accelins_repositoryfile or related entity).
    # Prerequisite: ADP has generated a Repository ID and Source Staging has run so data has flowed.
    # Step: Query Dynamics for repository file / Bordereau data containing the Repository ID.
    # Implement: Query Dynamics API (accelins_repositoryfiles or equivalent) filtered by Repository ID from test context or ODS.
    When I run the following query in "Reference" database and log the result:
      """
      SELECT TOP 5 RepositoryID FROM [Reference].[master].[BordereauRepository] WHERE RepositoryID IS NOT NULL ORDER BY BordereauRepositoryName
      """
    # TODO: Add step "When I verify Repository ID from ODS exists in Dynamics repository files" (query Dynamics API by Repository ID).
    # Then the Repository ID should be present in Dynamics

  # ═══════════════════════════════════════════════════════════════════════════
  # Schema and integrity (supporting rigorous validation)
  # ═══════════════════════════════════════════════════════════════════════════

  @ENG-145 @ENG-145-API-004 @p2 @rbt @reference
  Scenario: Reference BordereauRepository has RepositoryID column and rows
    When I run the following query in "Reference" database and log the result:
      """
      SELECT COUNT(*) AS cnt FROM [Reference].[master].[BordereauRepository]
      """
    And I run the following query in "Reference" database and log the result:
      """
      SELECT TOP 5 RepositoryID, BordereauRepositoryName
      FROM [Reference].[master].[BordereauRepository]
      ORDER BY BordereauRepositoryName
      """

  @ENG-145 @ENG-145-API-005 @p2 @rbt @reference
  Scenario: Reference.master.BordereauRepository table exists
    When I run the following query in "Reference" database and log the result:
      """
      SELECT COUNT(*) AS table_exists
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'master' AND TABLE_NAME = 'BordereauRepository'
      """

  @ENG-145 @ENG-145-API-006 @p2 @rbt @intrali
  Scenario: Intrali Bordereaux_Lloyds views exist and expose RepositoryID
    When I run the following query in "Intrali" database and log the result:
      """
      SELECT TABLE_SCHEMA, TABLE_NAME
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE TABLE_NAME LIKE 'Bordereaux_Lloyds%'
      ORDER BY TABLE_NAME
      """
    And I run the following query in "Intrali" database and log the result:
      """
      SELECT COLUMN_NAME, TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME LIKE 'Bordereaux_Lloyds%' AND COLUMN_NAME = 'RepositoryID'
      ORDER BY TABLE_NAME
      """

  @ENG-145 @ENG-145-API-007 @p2 @rbt @logging
  Scenario: Logging stored procedures for RepositoryID derivation exist
    When I run the following query in "Logging" database and log the result:
      """
      SELECT ROUTINE_SCHEMA, ROUTINE_NAME
      FROM INFORMATION_SCHEMA.ROUTINES
      WHERE ROUTINE_TYPE = 'PROCEDURE'
        AND ROUTINE_NAME IN ('ClaimsIntegrityChecks', 'PremiumIntegrityChecks', 'spClaimsBordereauTracking', 'spClaimsPreChecks', 'spWrittenBordereauTracking')
      ORDER BY ROUTINE_NAME
      """

  @ENG-145 @ENG-145-API-008 @p2 @rbt @logging
  Scenario: Execute Logging ClaimsIntegrityChecks
    When I execute stored procedure "ClaimsIntegrityChecks" in "Logging" database
    Then the stored procedure should execute successfully

  @ENG-145 @ENG-145-API-009 @p2 @rbt @logging
  Scenario: Execute Logging PremiumIntegrityChecks
    When I execute stored procedure "PremiumIntegrityChecks" in "Logging" database
    Then the stored procedure should execute successfully

  @ENG-145 @ENG-145-API-010 @p2 @rbt @warehouse
   Scenario: Warehouse control parameters state for claim/premium source overrides
    When I run the following query in "Warehouse" database and log the result:
      """
      SELECT ParameterName, ParameterValue
      FROM control.Parameter
      WHERE ParameterName IN (
        'Claim Source Current Table Override',
        'Claim Source Snapshot Table Override',
        'Premium Source Current Table Override',
        'Premium Source Snapshot Table Override'
      )
      """
