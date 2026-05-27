-- ============================================================================
-- Test Script: WI-58714-TC-16
-- Title: Validate index exists and is used: SPCreatetFXAmount
-- Purpose: Verify index SPCreatetFXAmount exists and improves query performance
-- Category: Index & Performance
-- Priority: Medium | Type: Performance | Complexity: Moderate
-- ============================================================================
-- Generated for comprehensive test case analysis
-- Work Item: 58714
-- ============================================================================

-- PRECONDITIONS
-- Table exists. Index should be created.

-- SETUP
-- Setup: Configure test environment as needed

-- TEST EXECUTION
SELECT i.name AS IndexName, i.type_desc AS IndexType

FROM sys.indexes i

INNER JOIN sys.tables t ON i.object_id = t.object_id

WHERE t.name = 'TableName' AND i.name = 'SPCreatetFXAmount'

IF @@ROWCOUNT = 0 THROW 50000, 'Index SPCreatetFXAmount does not exist', 1

-- Check index usage in execution plan for related queries

-- EXPECTED RESULT
-- Index exists and is used in query execution plans

-- VERIFICATION
-- Add assertions here based on expected result
-- Example:
-- IF NOT EXISTS (SELECT 1 FROM ... WHERE ...)
--     THROW 50000, 'Test failed: Expected condition not met', 1

-- CLEANUP
-- No cleanup required for this test

-- ============================================================================
-- Automation Notes: Can check index existence with sys.indexes. Performance validation requires execution plan analysis
-- ============================================================================
