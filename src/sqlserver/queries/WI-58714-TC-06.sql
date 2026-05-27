-- ============================================================================
-- Test Script: WI-58714-TC-06
-- Title: Validate dbo.D365 procedure exists
-- Purpose: Verify procedure dbo.D365 exists and can be executed
-- Category: Stored Procedure / Function
-- Priority: High | Type: Unit | Complexity: Simple
-- ============================================================================
-- Generated for comprehensive test case analysis
-- Work Item: 58714
-- ============================================================================

-- PRECONDITIONS
-- Database connection available

-- SETUP
-- Setup: Configure test environment as needed

-- TEST EXECUTION
SELECT OBJECT_SCHEMA_NAME(OBJECT_ID('dbo.D365')) AS SchemaName,

       OBJECT_NAME(OBJECT_ID('dbo.D365')) AS ObjectName

IF OBJECT_ID('dbo.D365', 'P') IS NULL

  THROW 50000, 'procedure dbo.D365 does not exist', 1

-- EXPECTED RESULT
-- procedure exists and is accessible

-- VERIFICATION
-- Add assertions here based on expected result
-- Example:
-- IF NOT EXISTS (SELECT 1 FROM ... WHERE ...)
--     THROW 50000, 'Test failed: Expected condition not met', 1

-- CLEANUP
-- No cleanup required for this test

-- ============================================================================
-- Automation Notes: Can be automated with OBJECT_ID checks. For execution tests, use tSQLt or parameterized test data
-- ============================================================================
