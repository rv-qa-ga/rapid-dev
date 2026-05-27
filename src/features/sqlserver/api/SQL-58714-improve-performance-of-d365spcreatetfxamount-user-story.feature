@sqlserver @ado @ado-58714
Feature: Improve performance of D365SPCreatetFXAmount - User Story
  As a QA engineer
  I want to validate SQL Server changes for Azure DevOps work item 58714
  So that I can ensure database changes are working correctly

  # SQL Validation Scripts
  # The following SQL scripts are available in src/features/sqlserver/sql-scripts/
  # These scripts are generated from comprehensive test case analysis:

  # - WI-58714-TC-01.sql
  # - WI-58714-TC-02.sql
  # - WI-58714-TC-03.sql
  # - WI-58714-TC-04.sql
  # - WI-58714-TC-05.sql
  # - WI-58714-TC-06.sql
  # - WI-58714-TC-07.sql
  # - WI-58714-TC-08.sql
  # - WI-58714-TC-09.sql
  # - WI-58714-TC-10.sql
  # - WI-58714-TC-11.sql
  # - WI-58714-TC-12.sql
  # - WI-58714-TC-13.sql
  # - WI-58714-TC-14.sql
  # - WI-58714-TC-15.sql
  # - WI-58714-TC-16.sql
  # - WI-58714-TC-17.sql
  # - WI-58714-TC-18.sql
  # - WI-58714-TC-19.sql
  # - WI-58714-TC-20.sql
  # - WI-58714-TC-21.sql
  # - WI-58714-TC-22.sql

  Background:
    Given I have a valid SQL Server connection

  # Stored Procedure / Function Tests

  @sqlserver @ado-58714 @priority-high @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.SPCreatetFXAmount procedure exists
    # Test Case ID: WI-58714-TC-01
    # Purpose: Verify procedure dbo.SPCreatetFXAmount exists and can be executed
    # Priority: High | Type: Unit | Complexity: Simple
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-01.sql
    When SELECT OBJECT_SCHEMA_NAME(OBJECT_ID('dbo.SPCreatetFXAmount')) AS SchemaName,
    And OBJECT_NAME(OBJECT_ID('dbo.SPCreatetFXAmount')) AS ObjectName
    And IF OBJECT_ID('dbo.SPCreatetFXAmount', 'P') IS NULL
    Then the object should not exist
    Then procedure exists and is accessible

  @sqlserver @ado-58714 @priority-high @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.SPCreatetFXAmount executes successfully with valid input
    # Test Case ID: WI-58714-TC-02
    # Purpose: Verify procedure dbo.SPCreatetFXAmount executes without errors when provided valid parameters
    # Priority: High | Type: Unit | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-02.sql
    Given procedure dbo.SPCreatetFXAmount exists. Valid test data available.
    Then procedure executes successfully and returns expected results

  @sqlserver @ado-58714 @priority-medium @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.SPCreatetFXAmount handles NULL parameters correctly
    # Test Case ID: WI-58714-TC-03
    # Purpose: Verify procedure dbo.SPCreatetFXAmount handles NULL input parameters appropriately
    # Priority: Medium | Type: Unit | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-03.sql
    Given procedure dbo.SPCreatetFXAmount exists
    Then Procedure either handles NULL gracefully or returns clear error message

  @sqlserver @ado-58714 @priority-medium @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.SPCreatetFXAmount rejects invalid input parameters
    # Test Case ID: WI-58714-TC-04
    # Purpose: Verify procedure dbo.SPCreatetFXAmount validates input and rejects invalid data
    # Priority: Medium | Type: Unit | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-04.sql
    Given procedure dbo.SPCreatetFXAmount exists
    Then Invalid parameters are rejected with clear error message

  @sqlserver @ado-58714 @priority-high @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.D365 procedure exists
    # Test Case ID: WI-58714-TC-06
    # Purpose: Verify procedure dbo.D365 exists and can be executed
    # Priority: High | Type: Unit | Complexity: Simple
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-06.sql
    When SELECT OBJECT_SCHEMA_NAME(OBJECT_ID('dbo.D365')) AS SchemaName,
    And OBJECT_NAME(OBJECT_ID('dbo.D365')) AS ObjectName
    And IF OBJECT_ID('dbo.D365', 'P') IS NULL
    Then the object should not exist
    Then procedure exists and is accessible

  @sqlserver @ado-58714 @priority-high @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.D365 executes successfully with valid input
    # Test Case ID: WI-58714-TC-07
    # Purpose: Verify procedure dbo.D365 executes without errors when provided valid parameters
    # Priority: High | Type: Unit | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-07.sql
    Given procedure dbo.D365 exists. Valid test data available.
    Then procedure executes successfully and returns expected results

  @sqlserver @ado-58714 @priority-medium @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.D365 handles NULL parameters correctly
    # Test Case ID: WI-58714-TC-08
    # Purpose: Verify procedure dbo.D365 handles NULL input parameters appropriately
    # Priority: Medium | Type: Unit | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-08.sql
    Given procedure dbo.D365 exists
    Then Procedure either handles NULL gracefully or returns clear error message

  @sqlserver @ado-58714 @priority-medium @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.D365 rejects invalid input parameters
    # Test Case ID: WI-58714-TC-09
    # Purpose: Verify procedure dbo.D365 validates input and rejects invalid data
    # Priority: Medium | Type: Unit | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-09.sql
    Given procedure dbo.D365 exists
    Then Invalid parameters are rejected with clear error message

  @sqlserver @ado-58714 @priority-high @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.createtfxamount procedure exists
    # Test Case ID: WI-58714-TC-11
    # Purpose: Verify procedure dbo.createtfxamount exists and can be executed
    # Priority: High | Type: Unit | Complexity: Simple
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-11.sql
    When SELECT OBJECT_SCHEMA_NAME(OBJECT_ID('dbo.createtfxamount')) AS SchemaName,
    And OBJECT_NAME(OBJECT_ID('dbo.createtfxamount')) AS ObjectName
    And IF OBJECT_ID('dbo.createtfxamount', 'P') IS NULL
    Then the object should not exist
    Then procedure exists and is accessible

  @sqlserver @ado-58714 @priority-high @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.createtfxamount executes successfully with valid input
    # Test Case ID: WI-58714-TC-12
    # Purpose: Verify procedure dbo.createtfxamount executes without errors when provided valid parameters
    # Priority: High | Type: Unit | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-12.sql
    Given procedure dbo.createtfxamount exists. Valid test data available.
    Then procedure executes successfully and returns expected results

  @sqlserver @ado-58714 @priority-medium @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.createtfxamount handles NULL parameters correctly
    # Test Case ID: WI-58714-TC-13
    # Purpose: Verify procedure dbo.createtfxamount handles NULL input parameters appropriately
    # Priority: Medium | Type: Unit | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-13.sql
    Given procedure dbo.createtfxamount exists
    Then Procedure either handles NULL gracefully or returns clear error message

  @sqlserver @ado-58714 @priority-medium @type-unit @category-stored-procedure-function
  Scenario: Validate dbo.createtfxamount rejects invalid input parameters
    # Test Case ID: WI-58714-TC-14
    # Purpose: Verify procedure dbo.createtfxamount validates input and rejects invalid data
    # Priority: Medium | Type: Unit | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-14.sql
    Given procedure dbo.createtfxamount exists
    Then Invalid parameters are rejected with clear error message

  # Index & Performance Tests

  @sqlserver @ado-58714 @priority-high @type-performance @category-index-performance
  Scenario: Validate dbo.SPCreatetFXAmount performance improvement
    # Test Case ID: WI-58714-TC-05
    # Purpose: Verify procedure dbo.SPCreatetFXAmount executes within acceptable performance thresholds
    # Priority: High | Type: Performance | Complexity: Complex
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-05.sql
    Given procedure dbo.SPCreatetFXAmount exists. Performance baseline established.
    Then Procedure execution time is within acceptable limits

  @sqlserver @ado-58714 @priority-high @type-performance @category-index-performance
  Scenario: Validate dbo.D365 performance improvement
    # Test Case ID: WI-58714-TC-10
    # Purpose: Verify procedure dbo.D365 executes within acceptable performance thresholds
    # Priority: High | Type: Performance | Complexity: Complex
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-10.sql
    Given procedure dbo.D365 exists. Performance baseline established.
    Then Procedure execution time is within acceptable limits

  @sqlserver @ado-58714 @priority-high @type-performance @category-index-performance
  Scenario: Validate dbo.createtfxamount performance improvement
    # Test Case ID: WI-58714-TC-15
    # Purpose: Verify procedure dbo.createtfxamount executes within acceptable performance thresholds
    # Priority: High | Type: Performance | Complexity: Complex
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-15.sql
    Given procedure dbo.createtfxamount exists. Performance baseline established.
    Then Procedure execution time is within acceptable limits

  @sqlserver @ado-58714 @priority-medium @type-performance @category-index-performance
  Scenario: Validate index exists and is used: SPCreatetFXAmount
    # Test Case ID: WI-58714-TC-16
    # Purpose: Verify index SPCreatetFXAmount exists and improves query performance
    # Priority: Medium | Type: Performance | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-16.sql
    Given Table exists. Index should be created.
    When SELECT i.name AS IndexName, i.type_desc AS IndexType
    And FROM sys.indexes i
    And INNER JOIN sys.tables t ON i.object_id = t.object_id
    And WHERE t.name = 'TableName' AND i.name = 'SPCreatetFXAmount'
    Then the object should not exist
    Then Index exists and is used in query execution plans

  @sqlserver @ado-58714 @priority-medium @type-performance @category-index-performance
  Scenario: Validate index exists and is used: D365
    # Test Case ID: WI-58714-TC-17
    # Purpose: Verify index D365 exists and improves query performance
    # Priority: Medium | Type: Performance | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-17.sql
    Given Table exists. Index should be created.
    When SELECT i.name AS IndexName, i.type_desc AS IndexType
    And FROM sys.indexes i
    And INNER JOIN sys.tables t ON i.object_id = t.object_id
    And WHERE t.name = 'TableName' AND i.name = 'D365'
    Then the object should not exist
    Then Index exists and is used in query execution plans

  @sqlserver @ado-58714 @priority-medium @type-performance @category-index-performance
  Scenario: Validate index exists and is used: createtfxamount
    # Test Case ID: WI-58714-TC-18
    # Purpose: Verify index createtfxamount exists and improves query performance
    # Priority: Medium | Type: Performance | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-18.sql
    Given Table exists. Index should be created.
    When SELECT i.name AS IndexName, i.type_desc AS IndexType
    And FROM sys.indexes i
    And INNER JOIN sys.tables t ON i.object_id = t.object_id
    And WHERE t.name = 'TableName' AND i.name = 'createtfxamount'
    Then the object should not exist
    Then Index exists and is used in query execution plans

  # Security & Permissions Tests

  @sqlserver @ado-58714 @priority-medium @type-security @category-security-permissions
  Scenario: Validate permissions on dbo.SPCreatetFXAmount
    # Test Case ID: WI-58714-TC-19
    # Purpose: Verify only authorized roles can access dbo.SPCreatetFXAmount
    # Priority: Medium | Type: Security | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-19.sql
    Given Object dbo.SPCreatetFXAmount exists. Test user with limited permissions available.
    When I execute stored procedure "AS" using SQL script WI-58714-TC-19.sql
    And REVERT
    Then Only authorized roles can perform allowed operations

  @sqlserver @ado-58714 @priority-medium @type-security @category-security-permissions
  Scenario: Validate permissions on dbo.D365
    # Test Case ID: WI-58714-TC-20
    # Purpose: Verify only authorized roles can access dbo.D365
    # Priority: Medium | Type: Security | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-20.sql
    Given Object dbo.D365 exists. Test user with limited permissions available.
    When I execute stored procedure "AS" using SQL script WI-58714-TC-20.sql
    And REVERT
    Then Only authorized roles can perform allowed operations

  @sqlserver @ado-58714 @priority-medium @type-security @category-security-permissions
  Scenario: Validate permissions on dbo.createtfxamount
    # Test Case ID: WI-58714-TC-21
    # Purpose: Verify only authorized roles can access dbo.createtfxamount
    # Priority: Medium | Type: Security | Complexity: Moderate
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-21.sql
    Given Object dbo.createtfxamount exists. Test user with limited permissions available.
    When I execute stored procedure "AS" using SQL script WI-58714-TC-21.sql
    And REVERT
    Then Only authorized roles can perform allowed operations

  # Rollback & Upgrade safety Tests

  @sqlserver @ado-58714 @priority-high @type-rollback @category-rollback-upgrade-safety
  Scenario: Validate rollback script exists and is tested
    # Test Case ID: WI-58714-TC-22
    # Purpose: Verify that changes can be safely rolled back if needed
    # Priority: High | Type: Rollback | Complexity: Complex
    # SQL Script: src/features/sqlserver/sql-scripts/WI-58714-TC-22.sql
    Given Rollback script available
    Then Rollback script successfully reverts all changes
